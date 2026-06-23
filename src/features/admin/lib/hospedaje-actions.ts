"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/features/admin/lib/auth";
import { notifyHospedajePublicado } from "@/features/admin/lib/notifications";
import { assertAdminCanAccessHospedaje } from "@/features/admin/lib/scope";
import { parseFormDataToHospedaje } from "@/features/admin/lib/validation";
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
  await requireAdmin();
  return {
    error: "Los hospedajes se crean desde /panel. Solo el responsable tiene los datos completos (fotos, detalles exactos, etc.).",
  };
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
    .select("estado, responsable_email, responsable_whatsapp")
    .eq("id", id)
    .maybeSingle<{
      estado: EstadoHospedaje;
      responsable_email: string | null;
      responsable_whatsapp: string | null;
    }>();
  const estadoAnterior = previo?.estado ?? null;

  // Si se intenta publicar, validar que tenga datos de contacto del responsable.
  if (input.estado === "publicado") {
    const email = input.responsable_email ?? previo?.responsable_email;
    const whatsapp = input.responsable_whatsapp ?? previo?.responsable_whatsapp;

    if (!email) {
      return {
        error: "No se puede publicar sin email del responsable.",
      };
    }

    if (!whatsapp) {
      return {
        error: "No se puede publicar sin WhatsApp del responsable.",
      };
    }
  }

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

  // Si se intenta publicar, validar que tenga datos de contacto del responsable.
  if (parsed.data.estado === "publicado") {
    const { data: h } = await supabase
      .from("hospedajes")
      .select("responsable_email, responsable_whatsapp")
      .eq("id", parsed.data.id)
      .maybeSingle<{
        responsable_email: string | null;
        responsable_whatsapp: string | null;
      }>();

    if (!h?.responsable_email) {
      return {
        error: "No se puede publicar sin email del responsable.",
      };
    }

    if (!h?.responsable_whatsapp) {
      return {
        error: "No se puede publicar sin WhatsApp del responsable.",
      };
    }
  }

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
