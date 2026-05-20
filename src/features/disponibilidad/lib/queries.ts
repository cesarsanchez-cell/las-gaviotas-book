import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  TipoDisponibilidad,
  UnidadTypeRow,
  UnidadTypeFotoRow,
  UnidadRow,
} from "@/types/database";
import type { UnidadSugerida } from "@/features/consultas/lib/types";

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
 * Para cada unidad_type del hospedaje, devuelve el set de fechas en las que
 * TODAS sus unidades activas están bloqueadas (full-block, "ocupado" desde
 * la óptica del huésped — no se puede reservar ese tipo ese día).
 *
 * Días donde solo algunas unidades están bloqueadas se consideran disponibles
 * para el tipo (queda al menos una libre). El badge fino "quedan X de Y"
 * llega en Etapa 5 — Consultas integradas.
 *
 * Requiere que el caller le pase la lista de unidades activas por tipo, así
 * podemos comparar "bloqueadas en la fecha" vs "activas totales del tipo".
 */
export function aggregateFullBlockPorTipo(
  diasBloqueados: DiaBloqueado[],
  unidadesActivasPorTipo: Map<string, string[]>
): Map<string, Set<string>> {
  const unidadToTipo = new Map<string, string>();
  for (const [tipoId, unidadIds] of unidadesActivasPorTipo) {
    for (const uid of unidadIds) unidadToTipo.set(uid, tipoId);
  }

  const bloqueosPorTipoFecha = new Map<string, Map<string, Set<string>>>();
  for (const b of diasBloqueados) {
    const tipoId = unidadToTipo.get(b.unidad_id);
    if (!tipoId) continue;
    let porFecha = bloqueosPorTipoFecha.get(tipoId);
    if (!porFecha) {
      porFecha = new Map();
      bloqueosPorTipoFecha.set(tipoId, porFecha);
    }
    let unidades = porFecha.get(b.fecha);
    if (!unidades) {
      unidades = new Set();
      porFecha.set(b.fecha, unidades);
    }
    unidades.add(b.unidad_id);
  }

  const out = new Map<string, Set<string>>();
  for (const [tipoId, unidadIds] of unidadesActivasPorTipo) {
    const total = unidadIds.length;
    const fullBlock = new Set<string>();
    if (total === 0) {
      out.set(tipoId, fullBlock);
      continue;
    }
    const porFecha = bloqueosPorTipoFecha.get(tipoId);
    if (porFecha) {
      for (const [fecha, unidades] of porFecha) {
        if (unidades.size >= total) fullBlock.add(fecha);
      }
    }
    out.set(tipoId, fullBlock);
  }
  return out;
}

/**
 * Para una consulta dada (hospedaje + fechas + cantidad de pax) devuelve los
 * tipos de unidad que cumplen capacidad y tienen AL MENOS UNA unidad física
 * activa libre en TODO el rango [checkIn, checkOut).
 *
 * "Libre" = sin ninguna fila en `disponibilidad` para ese unidad_id en el
 * rango. Si una sola fecha del rango está bloqueada, la unidad NO entra.
 *
 * Devuelve los tipos ordenados por capacidad ascendente (primero el match
 * más ajustado: si pediste 4 pax, te mostramos primero los de capacidad 4,
 * después los de 6, después los de 8…) y dentro de cada cota por nombre.
 *
 * Usa service role: lo llama un server action ya validado (createConsulta).
 */
export async function getUnidadesSugeridasParaConsulta(
  hospedajeId: string,
  checkIn: string,
  checkOut: string,
  cantidadHuespedes: number
): Promise<UnidadSugerida[]> {
  const sb = createAdminClient();

  // 1) Tipos del hospedaje que cumplen capacidad (con foto principal).
  const { data: tiposRaw } = await sb
    .from("unidad_types")
    .select(
      `
      id, nombre, capacidad_adultos, capacidad_ninos, camas_descripcion, amenities,
      unidades:unidades ( id, activa ),
      fotos:unidad_type_fotos ( storage_path, alt, es_principal, orden )
    `
    )
    .eq("hospedaje_id", hospedajeId)
    .eq("activo", true);

  type RawTipo = Pick<
    UnidadTypeRow,
    | "id"
    | "nombre"
    | "capacidad_adultos"
    | "capacidad_ninos"
    | "camas_descripcion"
    | "amenities"
  > & {
    unidades: Pick<UnidadRow, "id" | "activa">[];
    fotos: Pick<
      UnidadTypeFotoRow,
      "storage_path" | "alt" | "es_principal" | "orden"
    >[];
  };

  const tipos = (tiposRaw ?? []) as RawTipo[];
  const tiposConCapacidad = tipos.filter(
    (t) =>
      (t.capacidad_adultos ?? 0) + (t.capacidad_ninos ?? 0) >=
      cantidadHuespedes
  );
  if (tiposConCapacidad.length === 0) return [];

  // 2) Unidades activas de esos tipos.
  const unidadesActivas: { id: string; tipoId: string }[] = [];
  for (const t of tiposConCapacidad) {
    for (const u of t.unidades) {
      if (u.activa) unidadesActivas.push({ id: u.id, tipoId: t.id });
    }
  }
  if (unidadesActivas.length === 0) return [];

  // 3) Filas de disponibilidad en [checkIn, checkOut) para esas unidades.
  // checkOut es exclusivo (la noche del checkOut ya no se cuenta).
  const { data: bloqueosRaw } = await sb
    .from("disponibilidad")
    .select("unidad_id, fecha")
    .in(
      "unidad_id",
      unidadesActivas.map((u) => u.id)
    )
    .gte("fecha", checkIn)
    .lt("fecha", checkOut);

  const unidadesBloqueadas = new Set(
    (bloqueosRaw ?? []).map((b) => (b as { unidad_id: string }).unidad_id)
  );

  // 4) Por tipo: contar unidades libres vs totales.
  const out: UnidadSugerida[] = [];
  for (const t of tiposConCapacidad) {
    const activas = t.unidades.filter((u) => u.activa);
    const libres = activas.filter((u) => !unidadesBloqueadas.has(u.id));
    if (libres.length === 0) continue;
    const principal =
      t.fotos.find((f) => f.es_principal) ??
      t.fotos.sort((a, b) => a.orden - b.orden)[0];
    out.push({
      unidad_type_id: t.id,
      nombre: t.nombre,
      capacidad_total:
        (t.capacidad_adultos ?? 0) + (t.capacidad_ninos ?? 0),
      capacidad_adultos: t.capacidad_adultos ?? 0,
      capacidad_ninos: t.capacidad_ninos ?? 0,
      camas_descripcion: t.camas_descripcion,
      amenities: t.amenities ?? [],
      foto_storage_path: principal?.storage_path ?? null,
      foto_alt: principal?.alt ?? null,
      unidades_libres: libres.length,
      unidades_totales: activas.length,
    });
  }

  out.sort(
    (a, b) =>
      a.capacidad_total - b.capacidad_total ||
      a.nombre.localeCompare(b.nombre)
  );
  return out;
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
