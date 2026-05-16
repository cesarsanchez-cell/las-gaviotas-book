import { createClient } from "@/lib/supabase/server";
import type {
  EstadoHospedaje,
  HospedajeFotoRow,
  HospedajeRow,
} from "@/types/database";

export interface AdminDashboardStats {
  publicados: number;
  pendientes: number;
  borradores: number;
  pausados: number;
  rechazados: number;
  totalDestinos: number;
}

/**
 * Stats del dashboard admin.
 *
 * Si `destinoId` viene seteado (admin local), los counts se filtran a ese
 * destino. Si es `null` o no se pasa (super admin), cuenta toda la red.
 *
 * Las RLS ya filtran los SELECT, pero filtrar explícito hace los counts más
 * predecibles y evita depender del scope implícito en cada lectura.
 */
export async function getAdminStats(
  destinoId?: string | null
): Promise<AdminDashboardStats> {
  const supabase = await createClient();

  const baseCount = (estado: string) => {
    let q = supabase
      .from("hospedajes")
      .select("id", { count: "exact", head: true })
      .eq("estado", estado);
    if (destinoId) q = q.eq("destino_id", destinoId);
    return q;
  };

  const counts = await Promise.all([
    baseCount("publicado"),
    baseCount("pendiente_validacion"),
    baseCount("borrador"),
    baseCount("pausado"),
    baseCount("rechazado"),
    destinoId
      ? Promise.resolve({ count: 1 })
      : supabase.from("destinos").select("id", { count: "exact", head: true }),
  ]);

  return {
    publicados: counts[0].count ?? 0,
    pendientes: counts[1].count ?? 0,
    borradores: counts[2].count ?? 0,
    pausados: counts[3].count ?? 0,
    rechazados: counts[4].count ?? 0,
    totalDestinos: counts[5].count ?? 0,
  };
}

export interface AdminHospedajeRow {
  id: string;
  slug: string;
  nombre: string;
  tipo: HospedajeRow["tipo"];
  estado: EstadoHospedaje;
  destacado: boolean;
  responsable_nombre: string;
  destino_nombre: string;
  updated_at: string;
}

export async function listHospedajesAdmin(
  estado?: EstadoHospedaje,
  destinoId?: string | null
): Promise<AdminHospedajeRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("hospedajes")
    .select("id, slug, nombre, tipo, estado, destacado, responsable_nombre, updated_at, destinos!inner(nombre)")
    .order("updated_at", { ascending: false });

  if (estado) q = q.eq("estado", estado);
  if (destinoId) q = q.eq("destino_id", destinoId);

  const { data } = await q;
  return (
    (data as unknown as Array<Omit<AdminHospedajeRow, "destino_nombre"> & {
      destinos: { nombre: string };
    }>) ?? []
  ).map((h) => ({
    id: h.id,
    slug: h.slug,
    nombre: h.nombre,
    tipo: h.tipo,
    estado: h.estado,
    destacado: h.destacado,
    responsable_nombre: h.responsable_nombre,
    destino_nombre: h.destinos.nombre,
    updated_at: h.updated_at,
  }));
}

export async function getHospedajeForEdit(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hospedajes")
    .select("*, hospedaje_fotos(*)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export interface DestinoOption {
  id: string;
  slug: string;
  nombre: string;
}

export interface LocalidadOption {
  id: string;
  slug: string;
  nombre: string;
}

/**
 * Dropdown de destinos para el form de hospedaje.
 *
 * Si `destinoId` viene seteado (admin local), devuelve solo ese destino —
 * impide que el admin local cree/asigne un hospedaje a otro destino, además
 * de la defensa RLS.
 */
export async function listDestinosForSelect(
  destinoId?: string | null
): Promise<DestinoOption[]> {
  const supabase = await createClient();
  let q = supabase
    .from("destinos")
    .select("id, slug, nombre")
    .eq("activo", true)
    .order("orden");
  if (destinoId) q = q.eq("id", destinoId);
  const { data } = await q;
  return (data ?? []) as DestinoOption[];
}

export async function listLocalidadesForSelect(
  destinoId: string
): Promise<LocalidadOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("localidades")
    .select("id, slug, nombre")
    .eq("destino_id", destinoId)
    .order("orden");
  return (data ?? []) as LocalidadOption[];
}

export async function listPendientesValidacion(destinoId?: string | null) {
  const supabase = await createClient();
  let q = supabase
    .from("hospedajes")
    .select("*, hospedaje_fotos(*), destinos!inner(slug, nombre)")
    .eq("estado", "pendiente_validacion")
    .order("updated_at", { ascending: true });
  if (destinoId) q = q.eq("destino_id", destinoId);
  const { data } = await q;
  return (data ?? []) as unknown as Array<
    HospedajeRow & {
      hospedaje_fotos: HospedajeFotoRow[];
      destinos: { slug: string; nombre: string };
    }
  >;
}

export async function getLatestEventNote(
  hospedajeId: string
): Promise<{ notas: string | null; created_at: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("validacion_eventos")
    .select("notas, created_at")
    .eq("hospedaje_id", hospedajeId)
    .not("notas", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ notas: string | null; created_at: string }>();
  return data;
}
