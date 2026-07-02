import { createClient } from "@/lib/supabase/server";
import { getFotoUrl, getAtraccionFotoUrl } from "@/lib/storage";
import { sanitizeBiomas } from "@/features/regiones/lib/queries";
import { getCategoriaLabel } from "@/config/categorias-lugar";
import type { Bioma, TipoHospedaje, AtraccionRow } from "@/types/database";

// =============================================================================
// Capa de datos de la home v2 (hub estilo Airbnb).
//
// La home v1 giraba alrededor del destino; v2 gira alrededor de VERTICALES y
// COMERCIOS de toda la red. Estas queries listan cross-destino (todos los
// destinos activos), a diferencia de las queries por-destino de
// `features/hospedajes` y `features/lugares`.
//
// Nota de escala: la red es chica hoy, así que la home hace fetch de las 3
// verticales por adelantado y el cliente alterna sin refetch.
// TODO: paginar/virtualizar cuando crezca a cientos de comercios por vertical.
// =============================================================================

export type VerticalKey = "hospedajes" | "gastronomia" | "atractivos";

export interface VerticalItem {
  kind: VerticalKey;
  slug: string;
  nombre: string;
  /** Clave cruda de categoría/tipo (para filtros). */
  categoria: string | null;
  /** Etiqueta legible del tipo/categoría. */
  tipoLabel: string;
  /** Bajada corta del comercio (para slides del hero). */
  descripcionCorta: string | null;
  fotoUrl: string | null;
  destacado: boolean;
  destino: { slug: string; nombre: string };
  biomas: Bioma[];
}

export interface DestinoPublicadoLite {
  id: string;
  slug: string;
  nombre: string;
  region_label: string | null;
  region_slug: string | null;
  /** Ciudad que agrupa el destino (ej. Villa Gesell), si tiene. Para orientar
   *  y permitir buscar por zona. Null si no tiene ciudad o está inactiva. */
  ciudad_label: string | null;
  pais: string | null;
  biomas: Bioma[];
  lat: number | null;
  lng: number | null;
  hospedajes_count: number;
}

export interface RegionVisible {
  slug: string;
  nombre: string;
  biomas: Bioma[];
  destinos_slugs: string[];
}

/** Atracción curada para el hero emocional (sin precio, sin lead). */
export interface AtraccionHero {
  slug: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  fotoUrl: string | null;
  destacada: boolean;
  /** Slug de la zona a la que pertenece (la card linkea a su landing pública). */
  zonaSlug: string | null;
  /** Nombre de la zona (marcador "está en la zona X" en la card del hero). */
  zonaNombre: string | null;
  /** Destino al que está anclada, si tiene (metadato; el link va a la zona). */
  anclaSlug: string | null;
}

/**
 * Atracciones para el hero. Sin `destinoId`: toda la red. Con `destinoId`: las de
 * las zonas que lo contienen + las ancladas a él. La RLS ya restringe a
 * publicadas y vigentes (vigencia_hasta >= hoy); acá solo damos forma y orden
 * (destacadas primero, luego `orden`).
 */
export async function listAtraccionesHero(
  destinoId?: string
): Promise<AtraccionHero[]> {
  const sb = await createClient();

  let zonaIds: string[] = [];
  if (destinoId) {
    const { data: links } = await sb
      .from("zona_destinos")
      .select("zona_id")
      .eq("destino_id", destinoId)
      .returns<Array<{ zona_id: string }>>();
    zonaIds = (links ?? []).map((l) => l.zona_id);
  }

  let q = sb
    .from("atracciones")
    .select(
      "slug, nombre, categoria, descripcion, foto_path, destacada, orden, zona_id, destino_ancla_id"
    )
    .eq("publicada", true)
    .order("destacada", { ascending: false })
    .order("orden", { ascending: true });

  if (destinoId) {
    // Zona que contiene el destino O atracción anclada a él. Sin zonas, solo ancladas.
    const ors = [`destino_ancla_id.eq.${destinoId}`];
    if (zonaIds.length) ors.push(`zona_id.in.(${zonaIds.join(",")})`);
    q = q.or(ors.join(","));
  }

  type Row = Pick<
    AtraccionRow,
    | "slug"
    | "nombre"
    | "categoria"
    | "descripcion"
    | "foto_path"
    | "destacada"
    | "orden"
    | "zona_id"
    | "destino_ancla_id"
  >;
  const { data } = await q.returns<Row[]>();
  if (!data || data.length === 0) return [];

  // Resolvemos el slug del destino ancla (metadato) y de la zona (link de la card).
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

  const zonaSlugMap = new Map<string, string>();
  const zonaNombreMap = new Map<string, string>();
  const zonaIdsAll = [...new Set(data.map((a) => a.zona_id))];
  if (zonaIdsAll.length) {
    const { data: zs } = await sb
      .from("zonas")
      .select("id, slug, nombre")
      .in("id", zonaIdsAll)
      .returns<Array<{ id: string; slug: string; nombre: string }>>();
    for (const z of zs ?? []) {
      zonaSlugMap.set(z.id, z.slug);
      zonaNombreMap.set(z.id, z.nombre);
    }
  }

  return data.map((a) => ({
    slug: a.slug,
    nombre: a.nombre,
    categoria: a.categoria,
    descripcion: a.descripcion,
    fotoUrl: a.foto_path ? getAtraccionFotoUrl(a.foto_path) : null,
    destacada: a.destacada,
    zonaSlug: zonaSlugMap.get(a.zona_id) ?? null,
    zonaNombre: zonaNombreMap.get(a.zona_id) ?? null,
    anclaSlug: a.destino_ancla_id
      ? anclaSlug.get(a.destino_ancla_id) ?? null
      : null,
  }));
}

const TIPO_HOSPEDAJE_LABEL: Record<TipoHospedaje, string> = {
  hotel: "Hotel",
  apart: "Apart",
  cabana: "Cabaña",
  hosteria: "Hostería",
  camping: "Camping",
  casa: "Casa",
  departamento: "Departamento",
};

// -----------------------------------------------------------------------------
// Helpers de forma de los joins anidados de Supabase.
// -----------------------------------------------------------------------------

interface DestinoJoin {
  slug: string;
  nombre: string;
  activo: boolean;
  region_id: string | null;
  regiones: { biomas: string[] | null } | null;
}

/**
 * ¿El destino es mostrable según su región? Si tiene región vinculada, esta
 * debe estar activa (desactivar una región apaga su zona). Los destinos sin
 * región no se ven afectados. OJO: no se puede mirar `regiones.activo` del JOIN
 * — la RLS de `regiones` oculta las inactivas al anónimo, devolviendo null, no
 * `activo:false`. Por eso comparamos region_id contra el set de regiones que el
 * visitante SÍ puede ver (solo activas).
 */
function regionActiva(d: DestinoJoin | null, activeRegionIds: Set<string>): boolean {
  return !d?.region_id || activeRegionIds.has(d.region_id);
}

interface FotoJoin {
  storage_path: string;
  es_principal: boolean;
  orden: number;
}

function pickFotoUrl(fotos: FotoJoin[] | null | undefined): string | null {
  if (!fotos || fotos.length === 0) return null;
  const principal =
    fotos.find((f) => f.es_principal) ??
    [...fotos].sort((a, b) => a.orden - b.orden)[0];
  return principal ? getFotoUrl(principal.storage_path) : null;
}

function biomasFromDestino(d: DestinoJoin | null): Bioma[] {
  return sanitizeBiomas(d?.regiones?.biomas ?? []);
}

// -----------------------------------------------------------------------------
// Vertical: items cross-destino
// -----------------------------------------------------------------------------

/**
 * Lista los comercios publicados de una vertical, con su destino y los biomas
 * heredados de la región. Sin `destinoSlug` lista toda la red (grilla de la home
 * v2); con `destinoSlug` acota a ese destino (hub scopeado de la página de
 * destino).
 */
export async function listVerticalItemsRed(
  vertical: VerticalKey,
  destinoSlug?: string
): Promise<VerticalItem[]> {
  const sb = await createClient();

  // Set de regiones visibles (RLS: solo activas). Un item cuyo destino apunte a
  // una región fuera de este set tiene la región desactivada -> se oculta.
  const { data: regionesActivas } = (await sb
    .from("regiones")
    .select("id")) as { data: Array<{ id: string }> | null };
  const activeRegionIds = new Set((regionesActivas ?? []).map((r) => r.id));

  if (vertical === "hospedajes") {
    let q = sb
      .from("hospedajes")
      .select(
        `slug, nombre, tipo, destacado, descripcion_corta,
         hospedaje_fotos(storage_path, es_principal, orden),
         destinos!inner(slug, nombre, activo, region_id, regiones(biomas))`
      )
      .eq("estado", "publicado")
      .eq("destinos.activo", true);
    if (destinoSlug) q = q.eq("destinos.slug", destinoSlug);
    const { data } = (await q
      .order("destacado", { ascending: false })
      .order("nombre", { ascending: true })) as {
      data:
        | Array<{
            slug: string;
            nombre: string;
            tipo: TipoHospedaje;
            destacado: boolean;
            descripcion_corta: string | null;
            hospedaje_fotos: FotoJoin[] | null;
            destinos: DestinoJoin | null;
          }>
        | null;
    };
    return (data ?? [])
      .filter((h) => regionActiva(h.destinos, activeRegionIds))
      .map((h) => ({
      kind: "hospedajes" as const,
      slug: h.slug,
      nombre: h.nombre,
      categoria: h.tipo,
      tipoLabel: TIPO_HOSPEDAJE_LABEL[h.tipo] ?? "Hospedaje",
      descripcionCorta: h.descripcion_corta,
      fotoUrl: pickFotoUrl(h.hospedaje_fotos),
      destacado: h.destacado,
      destino: {
        slug: h.destinos?.slug ?? "",
        nombre: h.destinos?.nombre ?? "",
      },
      biomas: biomasFromDestino(h.destinos),
    }));
  }

  // gastronomia | atractivos → tabla `lugares`
  const tipoLugar = vertical === "gastronomia" ? "gastronomico" : "atractivo";
  let q = sb
    .from("lugares")
    .select(
      `slug, nombre, categoria, destacado, descripcion_corta,
       lugar_fotos(storage_path, es_principal, orden),
       destinos!inner(slug, nombre, activo, regiones(biomas))`
    )
    .eq("estado", "publicado")
    .eq("tipo", tipoLugar)
    .eq("destinos.activo", true);
  if (destinoSlug) q = q.eq("destinos.slug", destinoSlug);
  const { data } = (await q
    .order("destacado", { ascending: false })
    .order("nombre", { ascending: true })) as {
    data:
      | Array<{
          slug: string;
          nombre: string;
          categoria: string;
          destacado: boolean;
          descripcion_corta: string | null;
          lugar_fotos: FotoJoin[] | null;
          destinos: DestinoJoin | null;
        }>
      | null;
  };
  return (data ?? [])
    .filter((l) => regionActiva(l.destinos, activeRegionIds))
    .map((l) => ({
    kind: vertical,
    slug: l.slug,
    nombre: l.nombre,
    categoria: l.categoria,
    tipoLabel:
      getCategoriaLabel(tipoLugar, l.categoria) ??
      (vertical === "gastronomia" ? "Gastronomía" : "Atractivo"),
    descripcionCorta: l.descripcion_corta,
    fotoUrl: pickFotoUrl(l.lugar_fotos),
    destacado: l.destacado,
    destino: {
      slug: l.destinos?.slug ?? "",
      nombre: l.destinos?.nombre ?? "",
    },
    biomas: biomasFromDestino(l.destinos),
  }));
}

// -----------------------------------------------------------------------------
// Destinos publicados (regla: activo + ≥1 hospedaje publicado)
// -----------------------------------------------------------------------------

/**
 * Destinos visibles en el hub: activos y con al menos un hospedaje publicado.
 * Alimenta el autocomplete del buscador, la banda "Cerca tuyo" y el mapeo
 * región → destinos.
 */
export async function listDestinosPublicados(): Promise<DestinoPublicadoLite[]> {
  const sb = await createClient();

  const { data: destinos } = (await sb
    .from("destinos")
    .select(
      "id, slug, nombre, region, region_id, pais, lat, lng, regiones(slug, nombre, biomas), ciudades(nombre)"
    )
    .eq("activo", true)
    .order("orden", { ascending: true })) as {
    data:
      | Array<{
          id: string;
          slug: string;
          nombre: string;
          region: string | null;
          region_id: string | null;
          pais: string | null;
          lat: number | null;
          lng: number | null;
          regiones: { slug: string; nombre: string; biomas: string[] | null } | null;
          ciudades: { nombre: string } | null;
        }>
      | null;
  };
  if (!destinos || destinos.length === 0) return [];

  // Conteo de hospedajes publicados por destino (para aplicar la regla).
  const { data: hosps } = (await sb
    .from("hospedajes")
    .select("destino_id")
    .eq("estado", "publicado")) as {
    data: Array<{ destino_id: string }> | null;
  };
  const countByDestino = new Map<string, number>();
  for (const h of hosps ?? []) {
    countByDestino.set(h.destino_id, (countByDestino.get(h.destino_id) ?? 0) + 1);
  }

  // Regiones que el visitante PUEDE ver: la RLS de `regiones` solo deja leer las
  // activas, así que este set contiene únicamente activas. Un destino cuya
  // region_id NO esté acá tiene la región desactivada (el JOIN devolvería null,
  // no `activo:false`, justo por esa RLS) -> se oculta. Sin región -> se muestra.
  const { data: regionesActivas } = (await sb
    .from("regiones")
    .select("id")) as { data: Array<{ id: string }> | null };
  const activeRegionIds = new Set((regionesActivas ?? []).map((r) => r.id));

  return destinos
    // Regla de publicación: ≥1 hospedaje publicado Y la región (si tiene una)
    // debe estar activa. Desactivar una región apaga toda su zona.
    .filter(
      (d) =>
        (countByDestino.get(d.id) ?? 0) > 0 &&
        (!d.region_id || activeRegionIds.has(d.region_id))
    )
    .map((d) => ({
      id: d.id,
      slug: d.slug,
      nombre: d.nombre,
      // Label de orientación: el nombre REAL de la región vinculada (vía
      // region_id), no el texto legacy `region` (inconsistente/a mano).
      region_label: d.regiones?.nombre ?? null,
      region_slug: d.regiones?.slug ?? null,
      ciudad_label: d.ciudades?.nombre ?? null,
      pais: d.pais,
      biomas: sanitizeBiomas(d.regiones?.biomas ?? []),
      lat: d.lat,
      lng: d.lng,
      hospedajes_count: countByDestino.get(d.id) ?? 0,
    }));
}

// -----------------------------------------------------------------------------
// Regiones visibles (regla: activa + ≥1 destino publicado)
// -----------------------------------------------------------------------------

/**
 * Regiones con al menos un destino publicado. Cada una trae los slugs de sus
 * destinos publicados para que el filtro por chips de la home pueda acotar la
 * grilla. Recibe la lista de destinos publicados para no re-consultar.
 */
export async function listRegionesVisibles(
  destinosPublicados: DestinoPublicadoLite[]
): Promise<RegionVisible[]> {
  const sb = await createClient();

  const { data: regiones } = (await sb
    .from("regiones")
    .select("slug, nombre, biomas")
    .eq("activo", true)
    .order("orden", { ascending: true })) as {
    data: Array<{ slug: string; nombre: string; biomas: string[] | null }> | null;
  };
  if (!regiones || regiones.length === 0) return [];

  const slugsByRegion = new Map<string, string[]>();
  for (const d of destinosPublicados) {
    if (!d.region_slug) continue;
    const arr = slugsByRegion.get(d.region_slug) ?? [];
    arr.push(d.slug);
    slugsByRegion.set(d.region_slug, arr);
  }

  return regiones
    .filter((r) => (slugsByRegion.get(r.slug)?.length ?? 0) > 0)
    .map((r) => ({
      slug: r.slug,
      nombre: r.nombre,
      biomas: sanitizeBiomas(r.biomas ?? []),
      destinos_slugs: slugsByRegion.get(r.slug) ?? [],
    }));
}
