import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Bioma, RegionRow } from "@/types/database";

export interface RegionWithCount extends RegionRow {
  destinos_count: number;
}

/**
 * Lista regiones VISIBLES para superficies públicas: activas y con al menos un
 * destino publicado (activo + ≥1 hospedaje publicado). Las regiones sin destinos
 * publicados NO se devuelven (regla de publicación del árbol). `destinos_count`
 * cuenta destinos publicados, no solo activos.
 */
export async function listRegionesPublicas(): Promise<RegionWithCount[]> {
  const sb = await createClient();
  const { data: regiones } = await sb
    .from("regiones")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true })
    .returns<RegionRow[]>();
  if (!regiones || regiones.length === 0) return [];

  // Destinos activos con su región.
  const { data: destinos } = (await sb
    .from("destinos")
    .select("id, region_id")
    .eq("activo", true)
    .not("region_id", "is", null)) as {
    data: Array<{ id: string; region_id: string | null }> | null;
  };

  // Hospedajes publicados → set de destinos "publicados".
  const { data: hosps } = (await sb
    .from("hospedajes")
    .select("destino_id")
    .eq("estado", "publicado")) as {
    data: Array<{ destino_id: string }> | null;
  };
  const destinosPublicados = new Set((hosps ?? []).map((h) => h.destino_id));

  // Contamos solo destinos publicados por región.
  const counts = new Map<string, number>();
  for (const d of destinos ?? []) {
    if (!d.region_id || !destinosPublicados.has(d.id)) continue;
    counts.set(d.region_id, (counts.get(d.region_id) ?? 0) + 1);
  }

  return regiones
    .filter((r) => (counts.get(r.id) ?? 0) > 0)
    .map((r) => ({
      ...r,
      destinos_count: counts.get(r.id) ?? 0,
    }));
}

/**
 * Lista TODAS las regiones (incluso inactivas) para el panel admin. Solo
 * llamar desde server actions que ya verificaron permisos de super admin.
 */
export async function listRegionesAdmin(): Promise<RegionWithCount[]> {
  const sb = createAdminClient();
  const { data: regiones } = await sb
    .from("regiones")
    .select("*")
    .order("orden", { ascending: true })
    .returns<RegionRow[]>();
  if (!regiones) return [];

  const { data: destinos } = (await sb
    .from("destinos")
    .select("region_id")
    .not("region_id", "is", null)) as {
    data: Array<{ region_id: string | null }> | null;
  };
  const counts = new Map<string, number>();
  for (const d of destinos ?? []) {
    if (!d.region_id) continue;
    counts.set(d.region_id, (counts.get(d.region_id) ?? 0) + 1);
  }
  return regiones.map((r) => ({
    ...r,
    destinos_count: counts.get(r.id) ?? 0,
  }));
}

export async function getRegionBySlug(
  slug: string
): Promise<RegionRow | null> {
  const sb = await createClient();
  const { data } = await sb
    .from("regiones")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<RegionRow>();
  return data ?? null;
}

export async function getRegionById(id: string): Promise<RegionRow | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("regiones")
    .select("*")
    .eq("id", id)
    .maybeSingle<RegionRow>();
  return data ?? null;
}

/**
 * Lista destinos de una región (activos), ordenados, con metadata
 * enriquecida para renderizar `DestinoCard`:
 *  - `biomas`: heredados de la región (los destinos no tienen biomas
 *    propios todavía).
 *  - `hospedajes_count`: cuántos publicados tiene cada destino.
 *  - `foto_path`: URL externo cargado por el Super Admin (puede ser null).
 */
export interface DestinoDeRegionRow {
  id: string;
  slug: string;
  nombre: string;
  region: string | null;
  provincia: string | null;
  pais: string | null;
  descripcion_corta: string | null;
  lat: number | null;
  lng: number | null;
  foto_path: string | null;
  biomas: Bioma[];
  hospedajes_count: number;
}

export async function listDestinosDeRegion(
  regionId: string
): Promise<DestinoDeRegionRow[]> {
  const sb = await createClient();
  const { data: destinos } = (await sb
    .from("destinos")
    .select(
      "id, slug, nombre, region, provincia, pais, descripcion_corta, lat, lng, foto_path"
    )
    .eq("region_id", regionId)
    .eq("activo", true)
    .order("orden", { ascending: true })) as {
    data: Array<{
      id: string;
      slug: string;
      nombre: string;
      region: string | null;
      provincia: string | null;
      pais: string | null;
      descripcion_corta: string | null;
      lat: number | null;
      lng: number | null;
      foto_path: string | null;
    }> | null;
  };
  if (!destinos || destinos.length === 0) return [];

  // Biomas de la región — todos los destinos los heredan.
  const { data: region } = await sb
    .from("regiones")
    .select("biomas")
    .eq("id", regionId)
    .maybeSingle<{ biomas: string[] }>();
  const biomas = sanitizeBiomas(region?.biomas ?? []);

  // Count de hospedajes publicados por destino.
  const ids = destinos.map((d) => d.id);
  const { data: hosps } = (await sb
    .from("hospedajes")
    .select("destino_id")
    .eq("estado", "publicado")
    .in("destino_id", ids)) as {
    data: Array<{ destino_id: string }> | null;
  };
  const countByDestino = new Map<string, number>();
  for (const h of hosps ?? []) {
    countByDestino.set(
      h.destino_id,
      (countByDestino.get(h.destino_id) ?? 0) + 1
    );
  }

  // Regla de publicación: solo destinos publicados (activo + ≥1 hospedaje
  // publicado). Los activos sin hospedajes no se muestran en la página de región.
  return destinos
    .filter((d) => (countByDestino.get(d.id) ?? 0) > 0)
    .map((d) => ({
      ...d,
      biomas,
      hospedajes_count: countByDestino.get(d.id) ?? 0,
    }));
}

/**
 * Helper de tipo: convierte el array `biomas` de Postgres (string[]) al tipo
 * `Bioma[]` tras filtrar valores inválidos. Defensivo por si la BD recibe un
 * valor fuera del set canónico.
 */
const BIOMAS_VALIDOS: ReadonlySet<Bioma> = new Set([
  "playa",
  "bosque",
  "montana",
  "sierra",
  "lago",
  "desierto",
]);

export function sanitizeBiomas(raw: unknown): Bioma[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (b): b is Bioma => typeof b === "string" && BIOMAS_VALIDOS.has(b as Bioma)
  );
}

/**
 * Devuelve destinos activos con metadata enriquecida para mostrar en cards
 * mini de la home (carousels de tendencia + recientes + nearby). Hereda los
 * biomas de la región a la que pertenece cada destino. Si el destino no
 * tiene región, queda con biomas vacíos (la mini-card cae en gris).
 */
export interface DestinoMiniRow {
  slug: string;
  nombre: string;
  region_label: string | null;
  biomas: Bioma[];
  hospedajes_count: number;
  lat: number | null;
  lng: number | null;
  foto_path: string | null;
  created_at: string;
}

export async function listDestinosMini(): Promise<DestinoMiniRow[]> {
  const sb = await createClient();
  const { data: destinos } = await sb
    .from("destinos")
    .select("slug, nombre, region, region_id, lat, lng, foto_path, created_at, activo")
    .eq("activo", true)
    .order("orden", { ascending: true })
    .returns<
      Array<{
        slug: string;
        nombre: string;
        region: string | null;
        region_id: string | null;
        lat: number | null;
        lng: number | null;
        foto_path: string | null;
        created_at: string;
        activo: boolean;
      }>
    >();
  if (!destinos || destinos.length === 0) return [];

  // Cargar biomas de las regiones de los destinos.
  const regionIds = Array.from(
    new Set(destinos.map((d) => d.region_id).filter((x): x is string => !!x))
  );
  const biomasByRegion = new Map<string, Bioma[]>();
  // Regiones inactivas: sus destinos no se muestran (la desactivación de una
  // región apaga toda su zona, igual que en el buscador / listDestinosPublicados).
  const inactiveRegions = new Set<string>();
  if (regionIds.length > 0) {
    const { data: regs } = await sb
      .from("regiones")
      .select("id, biomas, activo")
      .in("id", regionIds)
      .returns<Array<{ id: string; biomas: string[]; activo: boolean }>>();
    for (const r of regs ?? []) {
      biomasByRegion.set(r.id, sanitizeBiomas(r.biomas));
      if (!r.activo) inactiveRegions.add(r.id);
    }
  }

  // Counts de hospedajes publicados por destino.
  const { data: hosps } = (await sb
    .from("hospedajes")
    .select("destino_id")
    .eq("estado", "publicado")) as {
    data: Array<{ destino_id: string }> | null;
  };
  // El SELECT de destinos no trae id — refetcheo por separado para mapear.
  const { data: destinosFull } = (await sb
    .from("destinos")
    .select("id, slug")
    .eq("activo", true)) as {
    data: Array<{ id: string; slug: string }> | null;
  };
  const idBySlug = new Map<string, string>();
  for (const d of destinosFull ?? []) idBySlug.set(d.slug, d.id);
  const countByDestino = new Map<string, number>();
  for (const h of hosps ?? []) {
    countByDestino.set(
      h.destino_id,
      (countByDestino.get(h.destino_id) ?? 0) + 1
    );
  }

  // Regla de publicación: solo destinos publicados (activo + ≥1 hospedaje
  // publicado) y cuya región (si tiene) esté activa aparecen en mapa / carousels.
  return destinos
    .filter((d) => !(d.region_id && inactiveRegions.has(d.region_id)))
    .map((d) => ({
      slug: d.slug,
      nombre: d.nombre,
      region_label: d.region,
      biomas: d.region_id ? biomasByRegion.get(d.region_id) ?? [] : [],
      hospedajes_count: countByDestino.get(idBySlug.get(d.slug) ?? "") ?? 0,
      lat: d.lat,
      lng: d.lng,
      foto_path: d.foto_path,
      created_at: d.created_at,
    }))
    .filter((d) => d.hospedajes_count > 0);
}
