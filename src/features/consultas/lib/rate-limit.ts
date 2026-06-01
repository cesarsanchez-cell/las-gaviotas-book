/**
 * Rate limit PERSISTENTE por IP para el form público de consultas.
 *
 * Límite: 5 consultas por IP en 10 minutos. La cuenta vive en la base
 * (`public.consulta_rate_limit` + función `check_consulta_rate_limit`), no en
 * memoria del serverless — así es efectivo entre cold starts e instancias de
 * Vercel. Ver migración `20260601000000_consulta_rate_limit.sql`.
 */

import { createAdminClient } from "@/lib/supabase/admin";

const WINDOW_SECONDS = 10 * 60;
const MAX_PER_WINDOW = 5;

export interface RateLimitResult {
  ok: boolean;
  /** Segundos hasta que se resetea la ventana — solo si !ok. */
  retryAfter?: number;
}

export async function checkRateLimit(
  ip: string | null
): Promise<RateLimitResult> {
  // Sin IP usamos una clave compartida "unknown" en vez de dejar pasar libre:
  // así el caso sin IP no es un bypass per-atacante (es raro en Vercel, pero
  // no queremos un agujero de fail-open).
  const key = ip ?? "unknown";

  const sb = createAdminClient();
  // La función RPC aún no está en los tipos generados de Database; tipamos la
  // llamada localmente para no perder seguridad de tipos en el resto.
  const rpc = sb.rpc.bind(sb) as unknown as (
    fn: string,
    args: Record<string, string | number>
  ) => Promise<{
    data: Array<{ allowed: boolean; retry_after: number }> | null;
    error: { message: string } | null;
  }>;

  const { data, error } = await rpc("check_consulta_rate_limit", {
    p_ip: key,
    p_max: MAX_PER_WINDOW,
    p_window_seconds: WINDOW_SECONDS,
  });

  // Fail-open ante error de infra: no bloqueamos leads legítimos si la función
  // o la base fallan. Se loguea para visibilidad.
  if (error) {
    console.error("[rate-limit] rpc error:", error.message);
    return { ok: true };
  }

  const row = data?.[0];
  if (!row) return { ok: true };
  return row.allowed ? { ok: true } : { ok: false, retryAfter: row.retry_after };
}
