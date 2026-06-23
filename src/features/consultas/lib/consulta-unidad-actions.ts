"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { consultaUnidadInputSchema } from "@/features/consultas/lib/consulta-unidad-schema";
import { checkRateLimit } from "@/features/consultas/lib/rate-limit";
import { notifyConsultaNueva } from "@/features/consultas/lib/notifications";
import type { CreateConsultaResult } from "@/features/consultas/lib/types";

/**
 * Consulta contextualizada a una unidad específica. A diferencia del form
 * "genérico al hospedaje", acá las fechas y la cantidad de pax no las define
 * el usuario en el form — vienen del flow de búsqueda (URL). El usuario solo
 * pone sus datos, un mensaje libre y el canal preferido de respuesta.
 *
 * Persistencia (post-migración 20260520000001):
 *   unidad_type_id, canal_preferido y desglose pax (adultos/ninos/bebes) van
 *   en columnas dedicadas. El campo `mensaje` queda con el texto libre del
 *   usuario, sin contexto prependido — el contexto lo formatea el mail al
 *   responsable a partir de las columnas estructuradas.
 */
async function getClientIp(): Promise<string | null> {
  const h = await headers();
  // En Vercel `x-real-ip` es la IP del cliente seteada por la plataforma (un
  // único valor confiable). Preferimos eso antes que el primer token de
  // `x-forwarded-for`, que el cliente puede prependear (spoofing).
  const realIp = h.get("x-real-ip");
  if (realIp) return realIp.trim();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return null;
}

export async function createConsultaUnidadAction(
  rawInput: unknown
): Promise<CreateConsultaResult> {
  const parsed = consultaUnidadInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Hay errores en el formulario.", fieldErrors };
  }
  const input = parsed.data;

  if (input.company) return { ok: true };

  const h = await headers();
  const ip = await getClientIp();
  const userAgent = h.get("user-agent");
  const rl = await checkRateLimit(ip);
  if (!rl.ok) {
    return {
      error: `Demasiadas consultas seguidas. Probá de nuevo en ${rl.retryAfter ?? 60} segundos.`,
    };
  }

  const sb = createAdminClient();

  // Defensa anti-tampering: la unidad tiene que pertenecer al hospedaje y
  // estar activa.
  const { data: tipo } = await sb
    .from("unidad_types")
    .select("hospedaje_id, activo")
    .eq("id", input.unidadTypeId)
    .maybeSingle<{ hospedaje_id: string; activo: boolean }>();
  if (!tipo || tipo.hospedaje_id !== input.hospedajeId || !tipo.activo) {
    return { error: "La unidad seleccionada ya no está disponible." };
  }

  // El hospedaje tiene que estar PUBLICADO. La policy RLS lo exige, pero el
  // service role la saltea — revalidamos en código (mismo motivo que el form
  // genérico): evita leads sobre hospedajes borrador/pausados/rechazados.
  const { data: hosp } = await sb
    .from("hospedajes")
    .select("estado")
    .eq("id", input.hospedajeId)
    .maybeSingle<{ estado: string }>();
  if (hosp?.estado !== "publicado") {
    return { error: "Este hospedaje no está disponible para consultas." };
  }

  const { data, error } = await sb
    .from("consultas")
    .insert({
      hospedaje_id: input.hospedajeId,
      unidad_type_id: input.unidadTypeId,
      nombre: input.nombre,
      email: input.email,
      whatsapp: input.whatsapp ?? null,
      mensaje: input.mensaje,
      check_in: input.checkIn,
      check_out: input.checkOut,
      cantidad_huespedes: input.adultos + input.ninos + input.bebes,
      adultos: input.adultos,
      ninos: input.ninos,
      bebes: input.bebes,
      canal_preferido: input.canalPreferido,
      consentimiento_datos: true,
      estado: "nueva",
      origen: "form_unidad",
      ip,
      user_agent: userAgent,
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    if (error.code === "23514") {
      return {
        error: "Las fechas o los datos no son válidos.",
      };
    }
    if (error.code === "23503") {
      return { error: "El hospedaje ya no está disponible." };
    }
    return { error: "No pudimos guardar la consulta. Probá más tarde." };
  }

  // Canal WhatsApp: el huésped contacta directo por el chat del alojamiento
  // (el cliente abre wa.me con la consulta lista). El lead igual queda en
  // /panel/leads, pero NO mandamos el mail de notificación — la vía es el chat.
  // Canal email: notificamos al responsable como siempre.
  if (input.canalPreferido !== "whatsapp") {
    await notifyConsultaNueva(data.id);
  }

  return { ok: true };
}
