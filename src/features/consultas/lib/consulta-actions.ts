"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { consultaInputSchema } from "@/features/consultas/lib/validation";
import { checkRateLimit } from "@/features/consultas/lib/rate-limit";
import { notifyConsultaNueva } from "@/features/consultas/lib/notifications";
import { getUnidadesSugeridasParaConsulta } from "@/features/disponibilidad/lib/queries";
import type { CreateConsultaResult } from "@/features/consultas/lib/types";

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

/**
 * Crea una consulta nueva desde el form público de la página del hospedaje.
 *
 * Capas de defensa, en orden:
 *  1. Honeypot — campo `company` debe venir vacío. Bots lo llenan automático.
 *  2. Rate limit por IP — 5 / 10 min, persistido en Postgres (RPC
 *     `check_consulta_rate_limit`), efectivo entre instancias/cold starts.
 *  3. Zod schema — formato, longitudes, fechas válidas, consentimiento=true.
 *  4. Revalidación en código de `hospedaje.estado='publicado'`. La policy RLS
 *     también lo exige, pero el INSERT va por service role (saltea RLS), así
 *     que la defensa efectiva acá es este chequeo, no la RLS.
 *  5. Notificación al responsable — vía Resend, falla silencioso si falla.
 *
 * Usamos service role para el INSERT porque queremos guardar ip + user_agent
 * (campos que el JWT anónimo no debería poder setear desde el cliente).
 * Toda la validación ocurre antes del insert.
 */
export async function createConsultaAction(
  rawInput: unknown
): Promise<CreateConsultaResult> {
  // 1) Validación Zod (incluye honeypot)
  const parsed = consultaInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Hay errores en el formulario.", fieldErrors };
  }
  const input = parsed.data;

  // 2) Honeypot — si llegó algo, devolvemos ok para no dar pistas al bot.
  if (input.company) {
    return { ok: true };
  }

  // 3) Rate limit por IP
  const h = await headers();
  const ip = await getClientIp();
  const userAgent = h.get("user-agent");
  const rl = await checkRateLimit(ip);
  if (!rl.ok) {
    return {
      error: `Demasiadas consultas seguidas. Probá de nuevo en ${rl.retryAfter ?? 60} segundos.`,
    };
  }

  // 4) Insert vía service role (auditoría completa)
  const sb = createAdminClient();

  // Solo se aceptan consultas sobre hospedajes PUBLICADOS. La policy RLS lo
  // exige, pero como insertamos con service role (para auditar ip/user_agent)
  // RLS no aplica y hay que revalidarlo en código — si no, un anónimo con un
  // UUID de hospedaje borrador/pausado/rechazado podría inyectar leads.
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
      nombre: input.nombre,
      email: input.email,
      whatsapp: input.whatsapp ?? null,
      mensaje: input.mensaje,
      check_in: input.checkIn,
      check_out: input.checkOut,
      cantidad_huespedes: input.cantidadHuespedes,
      consentimiento_datos: true,
      estado: "nueva",
      origen: "form_publico",
      ip,
      user_agent: userAgent,
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    // Errores de constraint son posibles si el hospedaje fue despublicado
    // entre que se cargó la página y se mandó el form, o si las fechas
    // pasaron a estar en el pasado.
    if (error.code === "23514") {
      return {
        error:
          "Las fechas o los datos no son válidos. Revisá el form y probá de nuevo.",
      };
    }
    if (error.code === "23503") {
      return { error: "El hospedaje ya no está disponible." };
    }
    return { error: "No pudimos guardar la consulta. Probá más tarde." };
  }

  // 5) Notificación al responsable (fire-and-await, max ~500ms)
  await notifyConsultaNueva(data.id);

  // 6) Unidades sugeridas: cumplen capacidad y están libres en el rango.
  // Si falla, devolvemos ok igual — la consulta ya quedó guardada y
  // notificada, las sugerencias son cosmético.
  let unidadesSugeridas: CreateConsultaResult["unidadesSugeridas"];
  try {
    unidadesSugeridas = await getUnidadesSugeridasParaConsulta(
      input.hospedajeId,
      input.checkIn,
      input.checkOut,
      input.cantidadHuespedes
    );
  } catch (err) {
    console.error("[createConsulta] sugeridas error:", err);
  }

  return { ok: true, unidadesSugeridas };
}
