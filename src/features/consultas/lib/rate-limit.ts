/**
 * Rate limit en memoria por IP para el form público de consultas.
 *
 * Límite: 5 consultas por IP en 10 minutos. Suficiente para usuarios reales
 * y bloquea bots que prueben en serie. En Vercel cada cold start del
 * serverless resetea el Map, así que un atacante persistente puede
 * exceder el límite haciendo requests espaciados — para esos casos sumar
 * Turnstile o un store persistente (Redis/Supabase) en una iteración futura.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

interface Entry {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Entry>();

function cleanup(now: number) {
  // Limpieza pasiva: borrar ventanas vencidas para no acumular memoria.
  for (const [ip, entry] of buckets) {
    if (now - entry.windowStart > WINDOW_MS) buckets.delete(ip);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Segundos hasta que se resetea la ventana — solo si !ok. */
  retryAfter?: number;
}

export function checkRateLimit(ip: string | null): RateLimitResult {
  if (!ip) return { ok: true }; // Sin IP no podemos limitar; dejamos pasar.

  const now = Date.now();
  if (Math.random() < 0.05) cleanup(now); // GC ocasional sin overhead constante.

  const entry = buckets.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    return { ok: true };
  }

  if (entry.count >= MAX_PER_WINDOW) {
    const retryAfter = Math.ceil(
      (entry.windowStart + WINDOW_MS - now) / 1000
    );
    return { ok: false, retryAfter };
  }

  entry.count += 1;
  return { ok: true };
}
