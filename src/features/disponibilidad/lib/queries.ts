import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TipoDisponibilidad } from "@/types/database";

/**
 * Día bloqueado, con info de la unidad a la que pertenece. La info de unidad
 * permite a la UI mostrar tabs por unidad sobre los mismos datos.
 */
export interface DiaBloqueado {
  fecha: string;
  tipo: TipoDisponibilidad;
  notas: string | null;
  unidad_id: string;
}

/**
 * Días bloqueados de TODAS las unidades de un hospedaje en [desde, hasta].
 * Ambos extremos inclusivos. El caller agrupa por unidad si lo necesita.
 *
 * Usa cliente regular — RLS aplica:
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
    .select("fecha, tipo, notas, unidad_id")
    .eq("hospedaje_id", hospedajeId)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: true })
    .returns<DiaBloqueado[]>();
  return data ?? [];
}

/**
 * Días bloqueados de una unidad puntual. Igual que `listDiasBloqueados`
 * pero filtra adicionalmente por `unidad_id` — útil cuando la UI ya está
 * mostrando el calendario de una unidad sola y no necesita traer las demás.
 */
export async function listDiasBloqueadosPorUnidad(
  unidadId: string,
  desde: string,
  hasta: string
): Promise<DiaBloqueado[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("disponibilidad")
    .select("fecha, tipo, notas, unidad_id")
    .eq("unidad_id", unidadId)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: true })
    .returns<DiaBloqueado[]>();
  return data ?? [];
}

/**
 * Cuenta TOTAL de filas de disponibilidad bloqueando alguna unidad del
 * hospedaje en [check_in, check_out). check_out exclusivo.
 *
 * Atención: este número NO equivale a "noches no disponibles" — si un
 * hospedaje tiene 3 unidades y 1 está bloqueada un día, devuelve 1 aunque
 * 2 unidades estén libres ese día. Útil solo para distinguir "vacío total"
 * vs "algo bloqueado" en el badge actual. El badge fino por capacidad de
 * pax viene en Etapa 5 — Consultas integradas.
 *
 * Usa service role — server-side only.
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
