import { createClient } from "@/lib/supabase/server";
import { getZonaFotoUrl, getAtraccionFotoUrl } from "@/lib/storage";
import type { AtraccionRow, ZonaRow } from "@/types/database";

// =============================================================================
// Capa de datos PÚBLICA de zonas (Fase 5: landing /zona/[slug] + banda
// "Conocé la zona"). Usa el cliente anónimo: la RLS ya limita zonas a activas y
// atracciones a publicadas + vigentes (vigencia_hasta >= hoy). Acá solo damos
// forma. La gestión (curaduría) vive en features/admin/lib/*-management.ts.
// =============================================================================

export interface ZonaPublica {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  fotoUrl: string | null;
}

export interface AtraccionDeZona {
  slug: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  ubicacionTexto: string | null;
  fotoUrl: string | null;
  /** Destino ancla (link al home del destino), si tiene. */
  anclaSlug: string | null;
}

export interface DestinoDeZona {
  slug: string;
  nombre: string;
  hospedajesCount: number;
}

/** Card de zona para la banda "Conocé la zona". */
export interface ZonaCard {
  slug: string;
  nombre: string;
  descripcion: string | null;
  fotoUrl: string | null;
  atraccionesCount: number;
}

export async function getZonaPublicaBySlug(
  slug: string
): Promise<ZonaPublica | null> {
  const sb = await createClient();
  const { data } = await sb
    .from("zonas")
    .select("id, slug, nombre, descripcion, foto_path, activo")
    .eq("slug", slug)
    .maybeSingle<Pick<ZonaRow, "id" | "slug" | "nombre" | "descripcion" | "foto_path" | "activo">>();
  // La RLS pública ya oculta inactivas; el check es defensa en profundidad.
  if (!data || !data.activo) return null;
  return {
    id: data.id,
    slug: data.slug,
    nombre: data.nombre,
    descripcion: data.descripcion,
    fotoUrl: data.foto_path ? getZonaFotoUrl(data.foto_path) : null,
  };
}

/** Atracciones publicadas + vigentes de una zona (destacadas → orden). */
export async function listAtraccionesDeZona(
  zonaId: string
): Promise<AtraccionDeZona[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("atracciones")
    .select(
      "slug, nombre, categoria, descripcion, ubicacion_texto, foto_path, destino_ancla_id, destacada, orden"
    )
    .eq("zona_id", zonaId)
    .eq("publicada", true)
    .order("destacada", { ascending: false })
    .order("orden", { ascending: true })
    .returns<
      Array<
        Pick<
          AtraccionRow,
          | "slug"
          | "nombre"
          | "categoria"
          | "descripcion"
          | "ubicacion_texto"
          | "foto_path"
          | "destino_ancla_id"
          | "destacada"
          | "orden"
        >
      >
    >();
  if (!data || data.length === 0) return [];

  const anclaIds = [
    ...new Set(data.map((a) => a.destino_ancla_id).filter(Boolean)),
  ] as string[];
  const anclaSlug = new Map<string, string>();
  if (anclaIds.length) {
    const { data: ds } = await sb
      .from("destinos")
      .select("id, slug")
      .in("id", anclaIds)
      .returns<Array<{ id: string; slug: string }>>();
    for (const d of ds ?? []) anclaSlug.set(d.id, d.slug);
  }

  return data.map((a) => ({
    slug: a.slug,
    nombre: a.nombre,
    categoria: a.categoria,
    descripcion: a.descripcion,
    ubicacionTexto: a.ubicacion_texto,
    fotoUrl: a.foto_path ? getAtraccionFotoUrl(a.foto_path) : null,
    anclaSlug: a.destino_ancla_id ? anclaSlug.get(a.destino_ancla_id) ?? null : null,
  }));
}

/** Destinos publicados (activo + ≥1 hospedaje publicado) de una zona. */
export async function listDestinosDeZona(
  zonaId: string
): Promise<DestinoDeZona[]> {
  const sb = await createClient();
  const { data: links } = await sb
    .from("zona_destinos")
    .select("destino_id")
    .eq("zona_id", zonaId)
    .returns<Array<{ destino_id: string }>>();
  const ids = (links ?? []).map((l) => l.destino_id);
  if (ids.length === 0) return [];

  const { data: destinos } = await sb
    .from("destinos")
    .select("id, slug, nombre, orden, activo")
    .in("id", ids)
    .eq("activo", true)
    .order("orden", { ascending: true })
    .returns<Array<{ id: string; slug: string; nombre: string; orden: number; activo: boolean }>>();
  if (!destinos || destinos.length === 0) return [];

  const { data: hosps } = await sb
    .from("hospedajes")
    .select("destino_id")
    .eq("estado", "publicado")
    .in("destino_id", destinos.map((d) => d.id))
    .returns<Array<{ destino_id: string }>>();
  const count = new Map<string, number>();
  for (const h of hosps ?? []) {
    count.set(h.destino_id, (count.get(h.destino_id) ?? 0) + 1);
  }

  return destinos
    .filter((d) => (count.get(d.id) ?? 0) > 0)
    .map((d) => ({
      slug: d.slug,
      nombre: d.nombre,
      hospedajesCount: count.get(d.id) ?? 0,
    }));
}

/**
 * Zonas VISIBLES para la banda "Conocé la zona": activas y con ≥1 atracción
 * publicada y vigente (esa es la razón pública de existir de la zona). Con
 * `destinoId` se acota a las zonas que contienen ese destino.
 */
export async function listZonasVisibles(destinoId?: string): Promise<ZonaCard[]> {
  const sb = await createClient();

  let zonaScope: Set<string> | null = null;
  if (destinoId) {
    const { data: links } = await sb
      .from("zona_destinos")
      .select("zona_id")
      .eq("destino_id", destinoId)
      .returns<Array<{ zona_id: string }>>();
    zonaScope = new Set((links ?? []).map((l) => l.zona_id));
    if (zonaScope.size === 0) return [];
  }

  const { data: zonas } = await sb
    .from("zonas")
    .select("id, slug, nombre, descripcion, foto_path")
    .eq("activo", true)
    .order("orden", { ascending: true })
    .returns<Array<Pick<ZonaRow, "id" | "slug" | "nombre" | "descripcion" | "foto_path">>>();
  if (!zonas || zonas.length === 0) return [];

  // La RLS pública ya restringe a publicadas + vigentes: contamos por zona.
  const { data: atracs } = await sb
    .from("atracciones")
    .select("zona_id")
    .eq("publicada", true)
    .returns<Array<{ zona_id: string }>>();
  const count = new Map<string, number>();
  for (const a of atracs ?? []) {
    count.set(a.zona_id, (count.get(a.zona_id) ?? 0) + 1);
  }

  return zonas
    .filter((z) => (!zonaScope || zonaScope.has(z.id)) && (count.get(z.id) ?? 0) > 0)
    .map((z) => ({
      slug: z.slug,
      nombre: z.nombre,
      descripcion: z.descripcion,
      fotoUrl: z.foto_path ? getZonaFotoUrl(z.foto_path) : null,
      atraccionesCount: count.get(z.id) ?? 0,
    }));
}
