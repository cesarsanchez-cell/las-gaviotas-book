"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireResponsable } from "@/features/panel/lib/auth";
import { parseFormDataToHospedaje } from "@/features/admin/lib/validation";
import {
  evaluateChecklist,
  checklistPasses,
} from "@/features/panel/lib/checklist";
import { diffCriticalFields } from "@/features/panel/lib/critical-fields";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";
import type {
  EstadoHospedaje,
  HospedajeFotoRow,
  HospedajeRow,
} from "@/types/database";

function formatZodError(err: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  return { error: "Hay errores en el formulario.", fieldErrors };
}

/**
 * Crear hospedaje como responsable. Fuerza estado=borrador
 * y vincula el hospedaje al perfil del responsable.
 */
export async function createHospedajeAsResponsableAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await requireResponsable();

  let input;
  try {
    input = parseFormDataToHospedaje(formData);
  } catch (err) {
    if (err instanceof z.ZodError) return formatZodError(err);
    return { error: "Error inesperado al parsear el formulario." };
  }

  // Responsable NO puede setear estado avanzado. Siempre arranca borrador.
  input.estado = "borrador";
  input.destacado = false;
  input.responsable_validado = false;

  // INSERT vía service role: ya validamos la sesión + forzamos valores seguros server-side.
  // Permite que la auditoría en validacion_eventos quede asociada al user via trigger.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hospedajes")
    .insert(input as never)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe un hospedaje con ese slug en este destino.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  // Vincular el hospedaje al perfil del responsable (mismo service role)
  const nuevosIds = Array.from(
    new Set([...(user.perfil.hospedajes_ids ?? []), data.id])
  );
  await admin
    .from("perfiles")
    .update({ hospedajes_ids: nuevosIds } as never)
    .eq("id", user.id);

  revalidatePath("/panel", "layout");
  redirect(`/panel/hospedajes/${data.id}`);
}

/**
 * Update de hospedaje propio. RLS bloquea cambios a estado publicado/rechazado.
 */
export async function updateHospedajeAsResponsableAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireResponsable();

  if (!user.perfil.hospedajes_ids?.includes(id)) {
    return { error: "No tenés permiso para editar este hospedaje." };
  }

  let input;
  try {
    input = parseFormDataToHospedaje(formData);
  } catch (err) {
    if (err instanceof z.ZodError) return formatZodError(err);
    return { error: "Error inesperado al parsear el formulario." };
  }

  // Responsable nunca puede modificar estos campos.
  input.destacado = false;
  input.responsable_validado = false;

  // Preservar estado actual — las transiciones van por acciones dedicadas
  // (submitForReview, withdrawFromReview, etc.). Save edits no debe revertir
  // un pendiente a borrador silenciosamente.
  //
  // Excepción: si el hospedaje está `publicado` o `pausado` y el responsable
  // cambia un campo crítico (ver critical-fields.ts), volvemos a
  // `pendiente_validacion` para que el admin re-apruebe. El hospedaje sale
  // del listado público hasta que se reapruebe.
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("hospedajes")
    .select("*")
    .eq("id", id)
    .maybeSingle<HospedajeRow>();

  const estadoActual: EstadoHospedaje = current?.estado ?? "borrador";
  const necesitaRevalidacion =
    (estadoActual === "publicado" || estadoActual === "pausado") &&
    !!current &&
    diffCriticalFields(current, input).length > 0;

  input.estado = necesitaRevalidacion ? "pendiente_validacion" : estadoActual;

  const { error } = await supabase
    .from("hospedajes")
    .update(input as never)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe un hospedaje con ese slug en este destino.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  revalidatePath("/panel", "layout");
  revalidatePath(`/panel/hospedajes/${id}`);
  return { ok: true };
}

/**
 * Mueve el hospedaje de borrador → pendiente_validacion.
 * Server-side reevaluación del checklist como defensa.
 */
export async function submitForReviewAction(
  id: string
): Promise<ActionResult> {
  const user = await requireResponsable();
  if (!user.perfil.hospedajes_ids?.includes(id)) {
    return { error: "No tenés permiso sobre este hospedaje." };
  }

  const supabase = await createClient();
  const { data: hospedaje } = await supabase
    .from("hospedajes")
    .select("*, hospedaje_fotos(*)")
    .eq("id", id)
    .maybeSingle<HospedajeRow & { hospedaje_fotos: HospedajeFotoRow[] }>();

  if (!hospedaje) return { error: "Hospedaje no encontrado." };

  if (hospedaje.estado !== "borrador" && hospedaje.estado !== "rechazado") {
    return {
      error: `No se puede enviar a revisión desde el estado "${hospedaje.estado}".`,
    };
  }

  const items = evaluateChecklist(hospedaje, hospedaje.hospedaje_fotos ?? []);
  if (!checklistPasses(items)) {
    const missing = items.filter((i) => !i.ok).map((i) => i.label);
    return {
      error: `Faltan ${missing.length} ítems del checklist.`,
      fieldErrors: Object.fromEntries(
        items
          .filter((i) => !i.ok)
          .map((i) => [i.key, i.label])
      ),
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("hospedajes")
    .update({ estado: "pendiente_validacion" } as never)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/panel", "layout");
  revalidatePath(`/panel/hospedajes/${id}`);
  revalidatePath("/admin/hospedajes");
  return { ok: true };
}

/**
 * Retira un hospedaje de revisión y vuelve a borrador.
 * Útil cuando el responsable quiere editar más antes de que el admin valide.
 */
export async function withdrawFromReviewAction(
  id: string
): Promise<ActionResult> {
  const user = await requireResponsable();
  if (!user.perfil.hospedajes_ids?.includes(id)) {
    return { error: "No tenés permiso sobre este hospedaje." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("hospedajes")
    .update({ estado: "borrador" } as never)
    .eq("id", id)
    .eq("estado", "pendiente_validacion");

  if (error) return { error: error.message };

  revalidatePath("/panel", "layout");
  revalidatePath(`/panel/hospedajes/${id}`);
  revalidatePath("/admin/hospedajes");
  return { ok: true };
}
