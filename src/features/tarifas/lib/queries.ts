import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Moneda, TarifaRow } from "@/types/database";

// -----------------------------------------------------------------------------
// Tipos compuestos para la app
// -----------------------------------------------------------------------------

/**
 * Resultado de resolver tarifas para un rango (check_in inclusive,
 * check_out exclusive). Si alguna noche no tiene tarifa cargada,
 * `coberturaCompleta` es false y `total` es null — el front debe mostrar
 * "Precio a consultar" en ese caso.
 */
export interface PrecioPorRango {
  moneda: Moneda | null;
  /** Suma de precio_noche por noche. Null si hay gaps. */
  total: number | null;
  noches: number;
  /** Detalle noche por noche para mostrar tooltip o desglose. */
  desglose: Array<{
    fecha: string; // YYYY-MM-DD
    precio: number | null;
    tarifaNombre: string | null;
    moneda: Moneda | null;
  }>;
  coberturaCompleta: boolean;
  /** Si las tarifas que matchean usan distinta moneda, marcamos warning. */
  monedaMixta: boolean;
}

// -----------------------------------------------------------------------------
// Helpers de fechas
// -----------------------------------------------------------------------------

function iso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function* iterDays(checkIn: string, checkOut: string): Generator<string> {
  const start = new Date(checkIn + "T00:00:00Z");
  const end = new Date(checkOut + "T00:00:00Z");
  const cur = new Date(start);
  while (cur < end) {
    yield iso(cur);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Lista todas las tarifas de un unidad_type, ordenadas por desde asc.
 * Usa service role: el caller (action/page) ya validó scope.
 */
export async function listTarifasByUnidadType(
  unidadTypeId: string
): Promise<TarifaRow[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("tarifas")
    .select("*")
    .eq("unidad_type_id", unidadTypeId)
    .order("desde", { ascending: true });
  if (error) {
    console.error("[listTarifasByUnidadType] error:", error);
    return [];
  }
  return (data ?? []) as TarifaRow[];
}

/**
 * Trae UNA tarifa por id. Service role; validación de scope al caller.
 */
export async function getTarifaById(id: string): Promise<TarifaRow | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("tarifas")
    .select("*")
    .eq("id", id)
    .maybeSingle<TarifaRow>();
  return data ?? null;
}

/**
 * Resuelve el precio total para un rango sobre un unidad_type.
 *
 * Regla de resolución (si varias tarifas cubren la misma noche):
 *   gana la cargada **más recientemente** (created_at desc). Decisión simple
 *   y predecible para el responsable: si querés que una temporada nueva
 *   "pisé" a una vieja, simplemente cargala después.
 *
 * Lectura: usa el cliente regular (RLS público). Si el hospedaje no está
 * publicado, no devuelve tarifas — la página privada del responsable usa
 * `listTarifasByUnidadType` que es service role.
 */
export async function resolvePrecioPorRango(
  unidadTypeId: string,
  checkIn: string,
  checkOut: string
): Promise<PrecioPorRango> {
  const empty: PrecioPorRango = {
    moneda: null,
    total: null,
    noches: 0,
    desglose: [],
    coberturaCompleta: false,
    monedaMixta: false,
  };
  if (checkOut <= checkIn) return empty;

  const sb = await createClient();
  const { data, error } = await sb
    .from("tarifas")
    .select("id, nombre, desde, hasta, precio_noche, moneda, created_at")
    .eq("unidad_type_id", unidadTypeId)
    .lte("desde", checkOut)
    .gte("hasta", checkIn)
    .order("created_at", { ascending: false })
    .returns<
      Array<{
        id: string;
        nombre: string;
        desde: string;
        hasta: string;
        precio_noche: number;
        moneda: Moneda;
        created_at: string;
      }>
    >();
  if (error) {
    console.error("[resolvePrecioPorRango] error:", error);
    return empty;
  }

  const tarifas = data ?? [];
  const desglose: PrecioPorRango["desglose"] = [];
  let total = 0;
  let coberturaCompleta = true;
  const monedasUsadas = new Set<Moneda>();

  for (const fecha of iterDays(checkIn, checkOut)) {
    // Tarifas ya ordenadas por created_at desc → la primera que matchea gana.
    const match = tarifas.find((t) => t.desde <= fecha && fecha <= t.hasta);
    if (!match) {
      desglose.push({
        fecha,
        precio: null,
        tarifaNombre: null,
        moneda: null,
      });
      coberturaCompleta = false;
    } else {
      desglose.push({
        fecha,
        precio: Number(match.precio_noche),
        tarifaNombre: match.nombre,
        moneda: match.moneda,
      });
      total += Number(match.precio_noche);
      monedasUsadas.add(match.moneda);
    }
  }

  const noches = desglose.length;
  const monedaMixta = monedasUsadas.size > 1;
  const monedaResult =
    monedasUsadas.size === 1
      ? Array.from(monedasUsadas)[0]
      : monedasUsadas.size === 0
        ? null
        : "ARS"; // por consistencia si vino mixta — el flag avisa

  return {
    moneda: monedaResult,
    total: coberturaCompleta && !monedaMixta ? total : null,
    noches,
    desglose,
    coberturaCompleta,
    monedaMixta,
  };
}

/**
 * Versión batch: trae las tarifas de varios unidad_types en una sola query
 * y resuelve el precio por rango para cada uno. Usado por la página de
 * búsqueda para evitar N+1.
 */
export async function resolvePreciosBatch(
  unidadTypeIds: string[],
  checkIn: string,
  checkOut: string
): Promise<Map<string, PrecioPorRango>> {
  const result = new Map<string, PrecioPorRango>();
  if (unidadTypeIds.length === 0 || checkOut <= checkIn) return result;

  const sb = await createClient();
  const { data, error } = await sb
    .from("tarifas")
    .select("id, unidad_type_id, nombre, desde, hasta, precio_noche, moneda, created_at")
    .in("unidad_type_id", unidadTypeIds)
    .lte("desde", checkOut)
    .gte("hasta", checkIn)
    .order("created_at", { ascending: false })
    .returns<
      Array<{
        id: string;
        unidad_type_id: string;
        nombre: string;
        desde: string;
        hasta: string;
        precio_noche: number;
        moneda: Moneda;
        created_at: string;
      }>
    >();
  if (error) {
    console.error("[resolvePreciosBatch] error:", error);
    return result;
  }

  // Agrupar por unidad_type_id
  const byUnidadType = new Map<string, typeof data>();
  for (const t of data ?? []) {
    const arr = byUnidadType.get(t.unidad_type_id) ?? [];
    arr.push(t);
    byUnidadType.set(t.unidad_type_id, arr);
  }

  for (const unidadTypeId of unidadTypeIds) {
    const tarifas = byUnidadType.get(unidadTypeId) ?? [];
    const desglose: PrecioPorRango["desglose"] = [];
    let total = 0;
    let coberturaCompleta = true;
    const monedasUsadas = new Set<Moneda>();

    for (const fecha of iterDays(checkIn, checkOut)) {
      const match = tarifas.find((t) => t.desde <= fecha && fecha <= t.hasta);
      if (!match) {
        desglose.push({
          fecha,
          precio: null,
          tarifaNombre: null,
          moneda: null,
        });
        coberturaCompleta = false;
      } else {
        desglose.push({
          fecha,
          precio: Number(match.precio_noche),
          tarifaNombre: match.nombre,
          moneda: match.moneda,
        });
        total += Number(match.precio_noche);
        monedasUsadas.add(match.moneda);
      }
    }

    const monedaMixta = monedasUsadas.size > 1;
    const monedaResult =
      monedasUsadas.size === 1
        ? Array.from(monedasUsadas)[0]
        : monedasUsadas.size === 0
          ? null
          : "ARS";

    result.set(unidadTypeId, {
      moneda: monedaResult,
      total: coberturaCompleta && !monedaMixta ? total : null,
      noches: desglose.length,
      desglose,
      coberturaCompleta,
      monedaMixta,
    });
  }

  return result;
}
