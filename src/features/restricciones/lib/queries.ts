import { createAdminClient } from "@/lib/supabase/admin";
import type { RestriccionRow } from "@/types/database";
import type { RestriccionMin } from "./logic";

/**
 * ¿El destino tiene el feature-flag de restricciones encendido?
 * Service role: lo llaman pages/queries que ya resolvieron el destino.
 */
export async function isRestriccionesHabilitadas(
  destinoId: string
): Promise<boolean> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("destinos")
    .select("restricciones_habilitadas")
    .eq("id", destinoId)
    .maybeSingle<{ restricciones_habilitadas: boolean }>();
  return data?.restricciones_habilitadas ?? false;
}

/**
 * Lista las restricciones de un unidad_type, ordenadas por desde asc.
 * Usa service role: el caller (action/page) ya validó scope.
 */
export async function listRestriccionesByUnidadType(
  unidadTypeId: string
): Promise<RestriccionRow[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("restricciones")
    .select("*")
    .eq("unidad_type_id", unidadTypeId)
    .order("desde", { ascending: true });
  if (error) {
    console.error("[listRestriccionesByUnidadType] error:", error);
    return [];
  }
  return (data ?? []) as RestriccionRow[];
}

/**
 * Trae las restricciones de varios unidad_types en una sola query y las
 * agrupa por `unidad_type_id`. Usado por la búsqueda para evitar N+1.
 * Devuelve solo los campos necesarios para evaluar (RestriccionMin).
 */
export async function listRestriccionesByUnidadTypes(
  unidadTypeIds: string[]
): Promise<Map<string, RestriccionMin[]>> {
  const result = new Map<string, RestriccionMin[]>();
  if (unidadTypeIds.length === 0) return result;

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("restricciones")
    .select(
      "unidad_type_id, desde, hasta, estadia_minima_noches, dia_ingreso, dia_egreso"
    )
    .in("unidad_type_id", unidadTypeIds)
    .returns<
      Array<{ unidad_type_id: string } & RestriccionMin>
    >();
  if (error) {
    console.error("[listRestriccionesByUnidadTypes] error:", error);
    return result;
  }

  for (const r of data ?? []) {
    const arr = result.get(r.unidad_type_id) ?? [];
    arr.push({
      desde: r.desde,
      hasta: r.hasta,
      estadia_minima_noches: r.estadia_minima_noches,
      dia_ingreso: r.dia_ingreso,
      dia_egreso: r.dia_egreso,
    });
    result.set(r.unidad_type_id, arr);
  }
  return result;
}
