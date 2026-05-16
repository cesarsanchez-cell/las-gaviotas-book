"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/features/admin/lib/auth";
import { parseFormDataToHospedaje } from "@/features/admin/lib/validation";
import { notifyHospedajePublicado } from "@/features/admin/lib/notifications";
import {
  assertAdminCanAccessDestino,
  assertAdminCanAccessHospedaje,
} from "@/features/admin/lib/scope";
import type { EstadoHospedaje } from "@/types/database";

export interface ActionResult {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
}

function formatZodError(err: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  return { error: "Hay errores en el formulario.", fieldErrors };
}

export async function createHospedajeAction(
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();

  let input;
  try {
    input = parseFormDataToHospedaje(formData);
  } catch (err) {
    if (err instanceof z.ZodError) return formatZodError(err);
    return { error: "Error inesperado al parsear el formulario." };
  }

  // Admin local: forzar destino_id al suyo, sin importar lo que vino del form.
  // Super admin: puede elegir cualquier destino.
  if (!admin.isSuperAdmin) {
    input = { ...input, destino_id: admin.destinoId! };
  }
  try {
    assertAdminCanAccessDestino(admin, input.destino_id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Service role: ya validamos rol admin server-side, RLS es redundante.
  const supabase = createAdminClient();
  const { data, error } = await supabase
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

  revalidatePath("/admin/hospedajes");
  redirect(`/admin/hospedajes/${data.id}`);
}

export async function updateHospedajeAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    await assertAdminCanAccessHospedaje(admin, id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  let input;
  try {
    input = parseFormDataToHospedaje(formData);
  } catch (err) {
    if (err instanceof z.ZodError) return formatZodError(err);
    return { error: "Error inesperado al parsear el formulario." };
  }

  // Admin local no puede mover el hospedaje a otro destino.
  if (!admin.isSuperAdmin && input.destino_id !== admin.destinoId) {
    return { error: "No podés mover el hospedaje a otro destino." };
  }

  // Service role: ya validamos rol admin server-side, RLS es redundante.
  const supabase = createAdminClient();

  // Leemos el estado previo para detectar transiciones que disparan
  // notificación (ej. publicado desde el editor sin pasar por validaciones).
  const { data: previo } = await supabase
    .from("hospedajes")
    .select("estado")
    .eq("id", id)
    .maybeSingle<{ estado: EstadoHospedaje }>();
  const estadoAnterior = previo?.estado ?? null;

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

  if (input.estado === "publicado" && estadoAnterior !== "publicado") {
    await notifyHospedajePublicado(id);
  }

  revalidatePath("/admin/hospedajes");
  revalidatePath(`/admin/hospedajes/${id}`);
  return { ok: true };
}

const changeEstadoSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum([
    "borrador",
    "pendiente_validacion",
    "publicado",
    "pausado",
    "rechazado",
  ]),
  notas: z.string().max(500).optional(),
});

export async function changeEstadoAction(input: {
  id: string;
  estado: EstadoHospedaje;
  notas?: string;
}): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = changeEstadoSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  try {
    await assertAdminCanAccessHospedaje(admin, parsed.data.id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("hospedajes")
    .update({ estado: parsed.data.estado } as never)
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/hospedajes");
  revalidatePath(`/admin/hospedajes/${input.id}`);
  return { ok: true };
}

export async function deleteHospedajeAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    await assertAdminCanAccessHospedaje(admin, id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("hospedajes").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/hospedajes");
  redirect("/admin/hospedajes");
}
