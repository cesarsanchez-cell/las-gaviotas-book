import { createAdminClient } from "@/lib/supabase/admin";
import type {
  UnidadTypeRow,
  UnidadTypeFotoRow,
  UnidadRow,
} from "@/types/database";

/**
 * Shape habitual del listado de tipos en `/panel/hospedajes/[id]/unidades`:
 * el tipo + su foto principal + las unidades físicas asociadas. Esto evita
 * tener que hacer N queries adicionales por cada card del listado.
 */
export interface UnidadTypeConDetalle extends UnidadTypeRow {
  foto_principal: UnidadTypeFotoRow | null;
  unidades: Pick<UnidadRow, "id" | "nombre" | "activa" | "orden">[];
}

/**
 * Detalle completo de un tipo (para la página de edición): incluye todas las
 * fotos ordenadas + todas las unidades físicas con sus campos completos.
 */
export interface UnidadTypeConFotos extends UnidadTypeRow {
  fotos: UnidadTypeFotoRow[];
  unidades: UnidadRow[];
}

/**
 * Devuelve todos los tipos de unidad de un hospedaje, ordenados por
 * `orden` ascendente y por `created_at` como desempate.
 *
 * Usa service role: el caller (page) ya validó que el responsable es dueño
 * del hospedaje o que el admin tiene scope. RLS sigue siendo defensa en
 * profundidad, pero el page no debería llegar acá sin haber chequeado.
 */
export async function listUnidadTypesPorHospedaje(
  hospedajeId: string
): Promise<UnidadTypeConDetalle[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("unidad_types")
    .select(
      `
      *,
      unidades:unidades ( id, nombre, activa, orden ),
      fotos:unidad_type_fotos ( * )
    `
    )
    .eq("hospedaje_id", hospedajeId)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("listUnidadTypesPorHospedaje error", error);
    return [];
  }

  type Raw = UnidadTypeRow & {
    unidades: Pick<UnidadRow, "id" | "nombre" | "activa" | "orden">[];
    fotos: UnidadTypeFotoRow[];
  };

  return ((data ?? []) as Raw[]).map((row) => {
    const foto_principal =
      row.fotos.find((f) => f.es_principal) ??
      row.fotos.sort((a, b) => a.orden - b.orden)[0] ??
      null;
    // Orden estable de unidades físicas para que la UI no salte.
    const unidades = [...row.unidades].sort(
      (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)
    );
    return {
      ...(row as UnidadTypeRow),
      foto_principal,
      unidades,
    };
  });
}

/**
 * Detalle completo de un unidad_type con todas sus fotos y unidades físicas.
 * Devuelve null si no existe.
 */
export async function getUnidadType(
  id: string
): Promise<UnidadTypeConFotos | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("unidad_types")
    .select(
      `
      *,
      fotos:unidad_type_fotos ( * ),
      unidades:unidades ( * )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as UnidadTypeRow & {
    fotos: UnidadTypeFotoRow[];
    unidades: UnidadRow[];
  };

  return {
    ...(row as UnidadTypeRow),
    fotos: [...row.fotos].sort((a, b) => a.orden - b.orden),
    unidades: [...row.unidades].sort(
      (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)
    ),
  };
}

/**
 * Devuelve una unidad física puntual con su tipo asociado.
 * Útil para forms de edición de unidades.
 */
export async function getUnidad(
  id: string
): Promise<(UnidadRow & { unidad_type: UnidadTypeRow }) | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("unidades")
    .select(
      `
      *,
      unidad_type:unidad_types ( * )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as UnidadRow & { unidad_type: UnidadTypeRow };
}

/**
 * Listado plano de unidades físicas activas de un hospedaje, con su tipo
 * embebido (capacidad, nombre del tipo). Útil para selectores en el
 * calendario de disponibilidad y en las tarifas.
 */
export async function listUnidadesPorHospedaje(
  hospedajeId: string,
  options?: { incluirInactivas?: boolean }
): Promise<(UnidadRow & { unidad_type: UnidadTypeRow })[]> {
  const sb = createAdminClient();
  let q = sb
    .from("unidades")
    .select(
      `
      *,
      unidad_type:unidad_types ( * )
    `
    )
    .eq("hospedaje_id", hospedajeId)
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });

  if (!options?.incluirInactivas) {
    q = q.eq("activa", true);
  }

  const { data, error } = await q;
  if (error) {
    console.error("listUnidadesPorHospedaje error", error);
    return [];
  }
  return (data ?? []) as (UnidadRow & { unidad_type: UnidadTypeRow })[];
}

/**
 * Capacidad total acumulada del hospedaje sumando todas las unidades activas
 * (adultos + niños del tipo de cada unidad). Para mostrar "Hasta N pax"
 * en la página pública.
 */
export async function getCapacidadTotalHospedaje(
  hospedajeId: string
): Promise<{ capacidad_max: number; cantidad_unidades: number }> {
  const unidades = await listUnidadesPorHospedaje(hospedajeId);
  let capacidad_max = 0;
  for (const u of unidades) {
    capacidad_max +=
      (u.unidad_type.capacidad_adultos ?? 0) +
      (u.unidad_type.capacidad_ninos ?? 0);
  }
  return { capacidad_max, cantidad_unidades: unidades.length };
}
