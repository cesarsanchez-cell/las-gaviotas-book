"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/features/admin/lib/auth";
import { notifyHospedajePublicado } from "@/features/admin/lib/notifications";
import { assertAdminCanAccessHospedaje } from "@/features/admin/lib/scope";
import { parseFormDataToHospedaje, parseFormDataToHospedajeInvitacion, hospedajeSchema } from "@/features/admin/lib/validation";
import { sendEmail } from "@/lib/email/resend";
import { hospedajeInvitacionTemplate } from "@/lib/email/templates";
import { siteConfig } from "@/config/site";
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

// Campos que solo super admin puede editar. Admin local solo puede cambiar estado.
const COMMERCIAL_FIELDS = new Set([
  "nombre",
  "slug",
  "tipo",
  "destino_id",
  "localidad_id",
  "descripcion_corta",
  "descripcion_larga",
  "capacidad_min",
  "capacidad_max",
  "cantidad_unidades",
  "direccion",
  "lat",
  "lng",
  "google_maps_url",
  "whatsapp",
  "email",
  "telefono",
  "instagram",
  "website",
  "amenities",
  "amenities_operational",
  "responsable_nombre",
  "responsable_documento",
  "responsable_email",
  "responsable_whatsapp",
  "meta_title",
  "meta_description",
  "responsable_validado",
  "destacado",
  "orden_listado",
]);

export async function createHospedajeAction(
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();

  let input;
  try {
    input = parseFormDataToHospedajeInvitacion(formData);
  } catch (err) {
    if (err instanceof z.ZodError) return formatZodError(err);
    return { error: "Error inesperado al parsear el formulario." };
  }

  // Admin local no puede invitar responsables en otros destinos.
  if (!admin.isSuperAdmin && input.destino_id !== admin.destinoId) {
    return { error: "No podés invitar responsables de otro destino." };
  }

  const supabase = createAdminClient();

  // Crear hospedaje en estado "borrador" con datos mínimos.
  const tempSlug = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const { data: hospedaje, error: insertError } = await supabase
    .from("hospedajes")
    .insert({
      destino_id: input.destino_id,
      nombre: input.nombre,
      responsable_email: input.responsable_email,
      responsable_whatsapp: input.responsable_whatsapp,
      whatsapp: input.responsable_whatsapp, // El whatsapp principal es el del responsable
      responsable_nombre: "", // Será completado por el responsable al registrarse
      tipo: "cabana", // tipo por defecto, el responsable puede cambiar
      slug: tempSlug, // temporal, será reemplazado por el responsable
      direccion: "", // será completado por el responsable
      descripcion_corta: "", // será completado por el responsable
      estado: "borrador",
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (insertError || !hospedaje) {
    if (insertError?.code === "23505") {
      return {
        error: "Ya existe un hospedaje con ese slug. Contacta al admin si es un error.",
      };
    }
    return { error: insertError?.message ?? "Error al crear invitación." };
  }

  // Obtener destino para armar el link
  const { data: destino } = await supabase
    .from("destinos")
    .select("slug")
    .eq("id", input.destino_id)
    .maybeSingle<{ slug: string }>();

  // TODO: Este endpoint debe eliminarse. El flujo de invitación fue reemplazado por registro directo en /registro.
  const urlPanel = `${siteConfig.url}/registro`;
  const tpl = hospedajeInvitacionTemplate({
    hospedajeNombre: input.nombre,
    destinoNombre: destino?.slug ?? "Mis Escapadas",
    urlPanel,
  });

  const emailResult = await sendEmail({
    to: input.responsable_email,
    ...tpl,
  });

  if (!emailResult.ok) {
    console.error("[createHospedaje invitación] sendEmail falló:", emailResult.error);
    // No bloqueamos la creación si falla el email, pero avisamos
    return {
      ok: true,
      error: "Hospedaje creado pero hubo un problema al enviar la invitación por email. Podés intentar nuevamente desde la lista.",
    };
  }

  revalidatePath("/admin/hospedajes");
  return { ok: true };
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

  // Admin local: lee el hospedaje previo para restaurar campos comerciales deshabilitados.
  let previousHospedaje: Record<string, unknown> | null = null;
  if (!admin.isSuperAdmin) {
    const { data } = await createAdminClient()
      .from("hospedajes")
      .select("*")
      .eq("id", id)
      .maybeSingle<Record<string, unknown>>();
    previousHospedaje = data;
  }

  // Parsear FormData a raw sin validar (para admin local pueda restaurar después).
  const raw: Record<string, unknown> = {};
  const fieldsFromForm = new Set<string>(); // Trackear qué campos realmente vinieron en FormData

  // DEBUG: log campos que vienen en FormData
  if (!admin.isSuperAdmin) {
    const allFields = Array.from(formData.keys());
    console.log("[DEBUG] Admin local - FormData fields:", allFields);
  }

  for (const [k, v] of formData.entries()) {
    fieldsFromForm.add(k);
    if (k === "amenities") {
      raw.amenities ??= [];
      (raw.amenities as string[]).push(String(v));
    } else if (k === "amenities_operational") {
      raw.amenities_operational ??= [];
      (raw.amenities_operational as string[]).push(String(v));
    } else if (k === "destacado" || k === "responsable_validado") {
      raw[k] = v === "on" || v === "true";
    } else if (typeof v === "string" && v.trim() === "") {
      // Empty string → key absent
    } else {
      raw[k] = v;
    }
  }
  raw.amenities ??= [];
  raw.amenities_operational ??= [];
  if (raw.destacado === undefined) raw.destacado = false;
  if (raw.responsable_validado === undefined) raw.responsable_validado = false;

  // Admin local: solo puede cambiar estado. Rechazar cualquier otro campo.
  if (!admin.isSuperAdmin) {
    // Campos que vinieron en FormData, excluir "estado"
    const nonEstadoFields = Array.from(fieldsFromForm).filter((k) => k !== "estado");
    if (nonEstadoFields.length > 0) {
      return { error: "No podés editar datos comerciales del hospedaje. Solo podés cambiar el estado." };
    }
  }

  // Admin local: restaurar campos comerciales desde previousHospedaje si no vinieron en FormData.
  if (!admin.isSuperAdmin && previousHospedaje) {
    // Campos que DEBEN estar presentes (required en schema).
    const REQUIRED_FIELDS = new Set([
      "nombre",
      "slug",
      "tipo",
      "destino_id",
      "descripcion_corta",
      "direccion",
      "whatsapp",
      "responsable_nombre",
      "responsable_email",
      "responsable_whatsapp",
    ]);
    // Todos los campos comerciales que no se editaron en el form.
    const COMMERCIAL_FIELDS_ARRAY = [
      "nombre",
      "slug",
      "tipo",
      "destino_id",
      "localidad_id",
      "descripcion_corta",
      "descripcion_larga",
      "capacidad_min",
      "capacidad_max",
      "cantidad_unidades",
      "direccion",
      "lat",
      "lng",
      "google_maps_url",
      "whatsapp",
      "email",
      "telefono",
      "instagram",
      "website",
      "amenities",
      "amenities_operational",
      "responsable_nombre",
      "responsable_documento",
      "responsable_email",
      "responsable_whatsapp",
      "meta_title",
      "meta_description",
      "destacado",
      "orden_listado",
    ];
    for (const field of COMMERCIAL_FIELDS_ARRAY) {
      const current = raw[field];
      // Si el campo no vino en FormData (undefined/empty array), restaurar desde previousHospedaje.
      if (current === undefined || (Array.isArray(current) && current.length === 0)) {
        const prevValue = previousHospedaje[field];
        const isRequired = REQUIRED_FIELDS.has(field);
        // Required: restaurar siempre (incluso null, para que Zod lance error si es necesario).
        // Optional: restaurar solo si no es null (evita "Invalid input" en campos opcionales).
        if (isRequired || (prevValue !== null && prevValue !== undefined)) {
          raw[field] = prevValue;
        }
      }
    }
  }

  // Ahora validar el raw con Zod.
  let input;
  try {
    input = hospedajeSchema.parse(raw);
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
