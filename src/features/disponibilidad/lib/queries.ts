import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TipoDisponibilidad } from "@/types/database";

export interface DiaBloqueado {
  fecha: string;
  tipo: TipoDisponibilidad;
  notas: string | null;
}

/**
 * Devuelve los días bloqueados de un hospedaje en un rango [desde, hasta].
 * Ambos extremos inclusivos.
 *
 * Usa el cliente regular (cookies del user) — RLS aplica:
 *   - Anon: solo si el hospedaje está publicado.
 *   - Responsable: solo si owns el hospedaje.
 *   - Admin: solo si scope incluye el destino del hospedaje.
 */
export async function listDiasBloqueados(
  hospedajeId: string,
  desde: string,
  hasta: string
): Promise<DiaBloqueado[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("disponibilidad")
    .select("fecha, tipo, notas")
    .eq("hospedaje_id", hospedajeId)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: true })
    .returns<DiaBloqueado[]>();
  return data ?? [];
}

/**
 * Cuenta días bloqueados en un rango [check_in, check_out). check_out
 * exclusivo, igual que en hospitalería.
 *
 * Usa service role para bypasear RLS — pensada para chequear disponibilidad
 * en flujos server-side (badge en consultas, mail al responsable) sin
 * importar el rol del invocante. No exponer al cliente.
 */
export async function countDiasBloqueadosEnRango(
  hospedajeId: string,
  checkIn: string,
  checkOut: string
): Promise<number> {
  const sb = createAdminClient();
  const { count, error } = await sb
    .from("disponibilidad")
    .select("id", { count: "exact", head: true })
    .eq("hospedaje_id", hospedajeId)
    .gte("fecha", checkIn)
    .lt("fecha", checkOut);
  if (error) {
    console.error("[countDiasBloqueados] error:", error);
    return 0;
  }
  return count ?? 0;
}
