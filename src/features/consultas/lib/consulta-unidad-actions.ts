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
 * Hasta que la tabla `consultas` tenga columnas dedicadas para `unidad_type_id`,
 * `canal_preferido` y desglose de pax (adultos/niños/bebés), guardamos esa
 * info prependida al `mensaje` para que el responsable la vea inline en el
 * mail. La migración para columnas dedicadas viene en la próxima vuelta.
 */
async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

function diffNoches(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + "T00:00:00Z");
  const b = new Date(checkOut + "T00:00:00Z");
  return Math.max(
    1,
    Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
  );
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
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return {
      error: `Demasiadas consultas seguidas. Probá de nuevo en ${rl.retryAfter ?? 60} segundos.`,
    };
  }

  const sb = createAdminClient();

  // Traemos nombre del unidad_type para enriquecer el mensaje. Validamos
  // también que pertenezca al hospedaje (defensa contra tampering).
  const { data: tipo } = await sb
    .from("unidad_types")
    .select("nombre, hospedaje_id")
    .eq("id", input.unidadTypeId)
    .maybeSingle<{ nombre: string; hospedaje_id: string }>();
  if (!tipo || tipo.hospedaje_id !== input.hospedajeId) {
    return { error: "La unidad seleccionada ya no está disponible." };
  }

  // Construimos un encabezado estructurado que el responsable ve primero.
  const noches = diffNoches(input.checkIn, input.checkOut);
  const paxParts: string[] = [
    `${input.adultos} ${input.adultos === 1 ? "adulto" : "adultos"}`,
  ];
  if (input.ninos > 0)
    paxParts.push(`${input.ninos} ${input.ninos === 1 ? "niño" : "niños"}`);
  if (input.bebes > 0)
    paxParts.push(`${input.bebes} ${input.bebes === 1 ? "bebé" : "bebés"}`);

  const canalLabel =
    input.canalPreferido === "whatsapp" ? "WhatsApp" : "email";

  const header = [
    `Unidad: ${tipo.nombre}`,
    `Fechas: ${input.checkIn} → ${input.checkOut} (${noches} ${noches === 1 ? "noche" : "noches"})`,
    `Huéspedes: ${paxParts.join(", ")}`,
    `Prefiere respuesta por: ${canalLabel}`,
  ].join("\n");

  const mensajeFinal = `${header}\n\n---\n${input.mensaje}`;

  const { data, error } = await sb
    .from("consultas")
    .insert({
      hospedaje_id: input.hospedajeId,
      nombre: input.nombre,
      email: input.email,
      whatsapp: input.whatsapp ?? null,
      mensaje: mensajeFinal,
      check_in: input.checkIn,
      check_out: input.checkOut,
      cantidad_huespedes: input.adultos + input.ninos + input.bebes,
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

  await notifyConsultaNueva(data.id);

  return { ok: true };
}
