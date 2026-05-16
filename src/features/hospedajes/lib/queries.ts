import { createClient } from "@/lib/supabase/server";
import type {
  DestinoRow,
  HospedajeRow,
  HospedajeFotoRow,
  LocalidadRow,
} from "@/types/database";
import type { AmenityKey } from "@/config/amenities";

// -----------------------------------------------------------------------------
// Filtros
// -----------------------------------------------------------------------------
export interface HospedajeFilters {
  tipo?: string;
  amenities?: AmenityKey[];
  capacidad?: number;
  destacado?: boolean;
  localidad?: string;
}

// -----------------------------------------------------------------------------
// Tipos compuestos para el front
// -----------------------------------------------------------------------------
export type HospedajeWithFotos = HospedajeRow & {
  hospedaje_fotos: HospedajeFotoRow[];
};

export interface HospedajeCard {
  id: string;
  slug: string;
  nombre: string;
  tipo: HospedajeRow["tipo"];
  descripcion_corta: string;
  direccion: string;
  capacidad_max: number | null;
  amenities: string[];
  destacado: boolean;
  foto_principal_path?: string;
  foto_alt?: string;
  whatsapp: string;
}

function toCard(h: HospedajeWithFotos): HospedajeCard {
  const principal =
    h.hospedaje_fotos.find((f) => f.es_principal) ??
    h.hospedaje_fotos[0];
  return {
    id: h.id,
    slug: h.slug,
    nombre: h.nombre,
    tipo: h.tipo,
    descripcion_corta: h.descripcion_corta,
    direccion: h.direccion,
    capacidad_max: h.capacidad_max,
    amenities: h.amenities,
    destacado: h.destacado,
    foto_principal_path: principal?.storage_path,
    foto_alt: principal?.alt ?? h.nombre,
    whatsapp: h.whatsapp,
  };
}

// -----------------------------------------------------------------------------
// Queries
// -----------------------------------------------------------------------------

export async function getDestinoBySlug(slug: string): Promise<DestinoRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("destinos")
    .select("*")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();
  return data;
}

export async function listLocalidades(
  destinoId: string
): Promise<LocalidadRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("localidades")
    .select("*")
    .eq("destino_id", destinoId)
    .order("orden", { ascending: true });
  return data ?? [];
}

export async function listHospedajesByDestino(
  destinoId: string,
  filters?: HospedajeFilters,
  limit?: number
): Promise<HospedajeCard[]> {
  const supabase = await createClient();

  let q = supabase
    .from("hospedajes")
    .select("*, hospedaje_fotos(*)")
    .eq("destino_id", destinoId)
    .eq("estado", "publicado")
    .order("destacado", { ascending: false })
    .order("orden_listado", { ascending: false });

  if (filters?.tipo) q = q.eq("tipo", filters.tipo);
  if (filters?.capacidad) q = q.gte("capacidad_max", filters.capacidad);
  if (filters?.destacado) q = q.eq("destacado", true);
  if (filters?.amenities && filters.amenities.length > 0) {
    q = q.contains("amenities", filters.amenities);
  }
  if (filters?.localidad) {
    const { data: loc } = await supabase
      .from("localidades")
      .select("id")
      .eq("destino_id", destinoId)
      .eq("slug", filters.localidad)
      .maybeSingle<{ id: string }>();
    if (loc) q = q.eq("localidad_id", loc.id);
  }

  if (limit) q = q.limit(limit);

  const { data } = await q;
  return (data ?? []).map((h) => toCard(h as HospedajeWithFotos));
}

export async function getDestacadosByDestino(
  destinoId: string,
  limit = 3
): Promise<HospedajeCard[]> {
  return listHospedajesByDestino(destinoId, { destacado: true }, limit);
}

export async function getHospedajeBySlug(
  destinoId: string,
  slug: string
): Promise<HospedajeWithFotos | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hospedajes")
    .select("*, hospedaje_fotos(*)")
    .eq("destino_id", destinoId)
    .eq("slug", slug)
    .eq("estado", "publicado")
    .maybeSingle();
  if (!data) return null;
  const result = data as HospedajeWithFotos;
  result.hospedaje_fotos.sort((a, b) => {
    if (a.es_principal && !b.es_principal) return -1;
    if (!a.es_principal && b.es_principal) return 1;
    return a.orden - b.orden;
  });
  return result;
}

export async function listAllHospedajesForSitemap(): Promise<
  { slug: string; destino_slug: string; updated_at: string }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hospedajes")
    .select("slug, updated_at, destinos!inner(slug)")
    .eq("estado", "publicado");
  return (
    (data as unknown as Array<{
      slug: string;
      updated_at: string;
      destinos: { slug: string };
    }>) ?? []
  ).map((h) => ({
    slug: h.slug,
    destino_slug: h.destinos.slug,
    updated_at: h.updated_at,
  }));
}

export async function listAllDestinosForSitemap(): Promise<
  { slug: string; updated_at: string }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("destinos")
    .select("slug, updated_at")
    .eq("activo", true);
  return data ?? [];
}

/**
 * Destinos activos con conteo de hospedajes publicados — para el hub `/`.
 * Devuelve nombre, slug, descripción corta y la cantidad de alojamientos
 * verificados disponibles en cada destino.
 */
export async function listActiveDestinosWithCounts(): Promise<
  Array<DestinoRow & { hospedajes_publicados: number }>
> {
  const supabase = await createClient();

  const { data: destinos } = await supabase
    .from("destinos")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true })
    .returns<DestinoRow[]>();

  if (!destinos?.length) return [];

  // Counts en paralelo (un destino = una query). Para 2-3 destinos es
  // suficientemente liviano; si crece a 20+ pasaríamos a una VIEW agregada.
  const counts = await Promise.all(
    destinos.map(async (d) => {
      const { count } = await supabase
        .from("hospedajes")
        .select("id", { count: "exact", head: true })
        .eq("destino_id", d.id)
        .eq("estado", "publicado");
      return count ?? 0;
    })
  );

  return destinos.map((d, i) => ({
    ...d,
    hospedajes_publicados: counts[i],
  }));
}
