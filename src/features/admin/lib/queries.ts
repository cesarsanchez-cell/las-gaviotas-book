import { createClient } from "@/lib/supabase/server";
import type { EstadoHospedaje, HospedajeRow } from "@/types/database";

export interface AdminDashboardStats {
  publicados: number;
  pendientes: number;
  borradores: number;
  pausados: number;
  rechazados: number;
  totalDestinos: number;
}

export async function getAdminStats(): Promise<AdminDashboardStats> {
  const supabase = await createClient();

  const counts = await Promise.all([
    supabase.from("hospedajes").select("id", { count: "exact", head: true }).eq("estado", "publicado"),
    supabase.from("hospedajes").select("id", { count: "exact", head: true }).eq("estado", "pendiente_validacion"),
    supabase.from("hospedajes").select("id", { count: "exact", head: true }).eq("estado", "borrador"),
    supabase.from("hospedajes").select("id", { count: "exact", head: true }).eq("estado", "pausado"),
    supabase.from("hospedajes").select("id", { count: "exact", head: true }).eq("estado", "rechazado"),
    supabase.from("destinos").select("id", { count: "exact", head: true }),
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
  estado?: EstadoHospedaje
): Promise<AdminHospedajeRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("hospedajes")
    .select("id, slug, nombre, tipo, estado, destacado, responsable_nombre, updated_at, destinos!inner(nombre)")
    .order("updated_at", { ascending: false });

  if (estado) q = q.eq("estado", estado);

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

export async function listDestinosForSelect(): Promise<DestinoOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("destinos")
    .select("id, slug, nombre")
    .eq("activo", true)
    .order("orden");
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
