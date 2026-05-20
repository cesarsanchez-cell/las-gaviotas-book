import { createAdminClient } from "@/lib/supabase/admin";
import type { ResponsableUser } from "@/features/panel/lib/auth";

/**
 * Verifica que el responsable actual sea dueño del lugar dado. Lee
 * `responsabilidades` con entidad_tipo='lugar' y entidad_id=p_lugar_id.
 *
 * Devuelve el destino_id del lugar para reuso del caller.
 *
 * Uso desde server actions que mutan vía service role — RLS bypaseada,
 * scope se valida en código.
 */
export async function assertResponsableOwnsLugar(
  responsable: ResponsableUser,
  lugarId: string
): Promise<{ destinoId: string; hospedajeOlugar: "lugar" }> {
  const sb = createAdminClient();

  const { data: resp } = await sb
    .from("responsabilidades")
    .select("id")
    .eq("perfil_id", responsable.id)
    .eq("entidad_tipo", "lugar")
    .eq("entidad_id", lugarId)
    .maybeSingle<{ id: string }>();

  if (!resp) throw new Error("No tenés permiso para gestionar este lugar.");

  const { data: l } = await sb
    .from("lugares")
    .select("destino_id, tipo")
    .eq("id", lugarId)
    .maybeSingle<{ destino_id: string; tipo: string }>();

  if (!l) throw new Error("Lugar no encontrado.");
  if (l.tipo !== "gastronomico") {
    throw new Error("Los responsables solo gestionan gastronómicos.");
  }

  return { destinoId: l.destino_id, hospedajeOlugar: "lugar" };
}

/**
 * Lista los ids de lugares que el responsable gestiona. Sirve para hidratar
 * el panel responsable y para chequeos rápidos sin RLS.
 */
export async function getResponsableLugarIds(
  perfilId: string
): Promise<string[]> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("responsabilidades")
    .select("entidad_id")
    .eq("perfil_id", perfilId)
    .eq("entidad_tipo", "lugar")
    .returns<{ entidad_id: string }[]>();
  return (data ?? []).map((r) => r.entidad_id);
}

/**
 * Lista los ids de hospedajes que el responsable gestiona (vía responsabilidades).
 * Reemplaza la lectura directa de `perfiles.hospedajes_ids[]` que queda como
 * fuente histórica pero ya no es la SoT.
 */
export async function getResponsableHospedajeIds(
  perfilId: string
): Promise<string[]> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("responsabilidades")
    .select("entidad_id")
    .eq("perfil_id", perfilId)
    .eq("entidad_tipo", "hospedaje")
    .returns<{ entidad_id: string }[]>();
  return (data ?? []).map((r) => r.entidad_id);
}
