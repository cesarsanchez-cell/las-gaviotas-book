import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFotoUrl } from "@/lib/storage";
import type { ComercioTipo, PromoRow } from "@/types/database";

// =============================================================================
// Capa de datos de promos individuales (un comercio).
//
// `comercio_id` es polimórfico (sin FK): apunta a hospedajes o lugares según
// `comercio_tipo`. La foto se hereda del comercio. Estas queries resuelven el
// comercio batcheando por tabla para no hacer N+1.
// =============================================================================

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

// -----------------------------------------------------------------------------
// Resolución del comercio (nombre / slug / foto / destino / estado)
// -----------------------------------------------------------------------------

interface ComercioInfo {
  id: string;
  tipo: ComercioTipo;
  slug: string;
  nombre: string;
  fotoUrl: string | null;
  estado: string;
  destino: { id: string; slug: string; nombre: string };
}

/**
 * Resuelve un set de comercios (mezcla de hospedajes y lugares) a su metadata.
 * Devuelve un Map keyed por `${tipo}:${id}`. Usa service role para poder
 * resolver comercios en cualquier estado (los callers deciden si filtran por
 * publicado).
 */
async function resolveComercios(
  refs: Array<{ tipo: ComercioTipo; id: string }>
): Promise<Map<string, ComercioInfo>> {
  const out = new Map<string, ComercioInfo>();
  if (refs.length === 0) return out;
  const sb = createAdminClient();

  const hospedajeIds = refs.filter((r) => r.tipo === "hospedaje").map((r) => r.id);
  const lugarIds = refs.filter((r) => r.tipo !== "hospedaje").map((r) => r.id);

  if (hospedajeIds.length > 0) {
    const { data } = (await sb
      .from("hospedajes")
      .select(
        "id, slug, nombre, estado, destinos!inner(id, slug, nombre), hospedaje_fotos(storage_path, es_principal, orden)"
      )
      .in("id", hospedajeIds)) as {
      data:
        | Array<{
            id: string;
            slug: string;
            nombre: string;
            estado: string;
            destinos: { id: string; slug: string; nombre: string } | null;
            hospedaje_fotos: FotoJoin[] | null;
          }>
        | null;
    };
    for (const h of data ?? []) {
      if (!h.destinos) continue;
      out.set(`hospedaje:${h.id}`, {
        id: h.id,
        tipo: "hospedaje",
        slug: h.slug,
        nombre: h.nombre,
        fotoUrl: pickFotoUrl(h.hospedaje_fotos),
        estado: h.estado,
        destino: h.destinos,
      });
    }
  }

  if (lugarIds.length > 0) {
    const { data } = (await sb
      .from("lugares")
      .select(
        "id, slug, nombre, tipo, estado, destinos!inner(id, slug, nombre), lugar_fotos(storage_path, es_principal, orden)"
      )
      .in("id", lugarIds)) as {
      data:
        | Array<{
            id: string;
            slug: string;
            nombre: string;
            tipo: "gastronomico" | "atractivo";
            estado: string;
            destinos: { id: string; slug: string; nombre: string } | null;
            lugar_fotos: FotoJoin[] | null;
          }>
        | null;
    };
    for (const l of data ?? []) {
      if (!l.destinos) continue;
      out.set(`${l.tipo}:${l.id}`, {
        id: l.id,
        tipo: l.tipo,
        slug: l.slug,
        nombre: l.nombre,
        fotoUrl: pickFotoUrl(l.lugar_fotos),
        estado: l.estado,
        destino: l.destinos,
      });
    }
  }

  return out;
}

// -----------------------------------------------------------------------------
// Público — bandas de la home
// -----------------------------------------------------------------------------

export interface PromoPublic {
  id: string;
  titulo: string;
  bajada: string | null;
  beneficio: string;
  pct: number | null;
  comercio: { tipo: ComercioTipo; slug: string; nombre: string; fotoUrl: string | null };
  destino: { slug: string; nombre: string };
}

/**
 * Promos públicas para la home: activas, vigentes, con su comercio PUBLICADO y
 * su destino activo. Resuelve foto/nombre del comercio (foto heredada).
 */
export async function listPromosRed(): Promise<PromoPublic[]> {
  const sb = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data: promos } = (await sb
    .from("promos")
    .select("*")
    .eq("activo", true)
    .or(`vigencia_hasta.is.null,vigencia_hasta.gte.${hoy}`)
    .or(`vigencia_desde.is.null,vigencia_desde.lte.${hoy}`)) as {
    data: PromoRow[] | null;
  };
  if (!promos || promos.length === 0) return [];

  const comercios = await resolveComercios(
    promos.map((p) => ({ tipo: p.comercio_tipo, id: p.comercio_id }))
  );

  const result: PromoPublic[] = [];
  for (const p of promos) {
    const c = comercios.get(`${p.comercio_tipo}:${p.comercio_id}`);
    // Solo mostramos promos cuyo comercio existe y está publicado.
    if (!c || c.estado !== "publicado") continue;
    result.push({
      id: p.id,
      titulo: p.titulo,
      bajada: p.bajada,
      beneficio: p.beneficio,
      pct: p.pct,
      comercio: { tipo: c.tipo, slug: c.slug, nombre: c.nombre, fotoUrl: c.fotoUrl },
      destino: { slug: c.destino.slug, nombre: c.destino.nombre },
    });
  }
  // Orden por descuento desc (las sin pct al final).
  return result.sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
}

// -----------------------------------------------------------------------------
// Admin / responsable — listas de gestión
// -----------------------------------------------------------------------------

export interface PromoAdminRow extends PromoRow {
  comercioNombre: string;
  comercioSlug: string;
  destinoNombre: string;
}

async function hydratePromos(promos: PromoRow[]): Promise<PromoAdminRow[]> {
  if (promos.length === 0) return [];
  const comercios = await resolveComercios(
    promos.map((p) => ({ tipo: p.comercio_tipo, id: p.comercio_id }))
  );
  return promos.map((p) => {
    const c = comercios.get(`${p.comercio_tipo}:${p.comercio_id}`);
    return {
      ...p,
      comercioNombre: c?.nombre ?? "(comercio eliminado)",
      comercioSlug: c?.slug ?? "",
      destinoNombre: c?.destino.nombre ?? "",
    };
  });
}

/** Lista admin: todas las promos (super admin) o las del destino (admin local). */
export async function listPromosAdmin(
  destinoId: string | null
): Promise<PromoAdminRow[]> {
  const sb = createAdminClient();
  let q = sb.from("promos").select("*").order("created_at", { ascending: false });
  if (destinoId) q = q.eq("destino_id", destinoId);
  const { data } = (await q) as { data: PromoRow[] | null };
  return hydratePromos(data ?? []);
}

/** Lista de promos de los comercios que gestiona un responsable. */
export async function listPromosDelResponsable(
  hospedajeIds: string[],
  lugarIds: string[]
): Promise<PromoAdminRow[]> {
  const ids = [...hospedajeIds, ...lugarIds];
  if (ids.length === 0) return [];
  const sb = createAdminClient();
  const { data } = (await sb
    .from("promos")
    .select("*")
    .in("comercio_id", ids)
    .order("created_at", { ascending: false })) as { data: PromoRow[] | null };
  return hydratePromos(data ?? []);
}

/**
 * Destino y estado de un comercio (hospedaje/lugar). Las actions lo usan para
 * derivar `destino_id` de la promo (autoritativo, no se confía en el form) y
 * validar scope.
 */
export async function getComercioRef(
  tipo: ComercioTipo,
  id: string
): Promise<{ destinoId: string; estado: string } | null> {
  const sb = createAdminClient();
  const tabla = tipo === "hospedaje" ? "hospedajes" : "lugares";
  const { data } = await sb
    .from(tabla)
    .select("destino_id, estado, tipo")
    .eq("id", id)
    .maybeSingle<{ destino_id: string; estado: string; tipo?: string }>();
  if (!data) return null;
  // Si es lugar, validamos que el tipo coincida con el comercio_tipo pedido.
  if (tipo !== "hospedaje" && data.tipo !== tipo) return null;
  return { destinoId: data.destino_id, estado: data.estado };
}

export async function getPromoById(id: string): Promise<PromoRow | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("promos")
    .select("*")
    .eq("id", id)
    .maybeSingle<PromoRow>();
  return data ?? null;
}

// -----------------------------------------------------------------------------
// Opciones del select de comercio del form
// -----------------------------------------------------------------------------

export interface ComercioOption {
  tipo: ComercioTipo;
  id: string;
  nombre: string;
  destinoId: string;
  destinoNombre: string;
}

/**
 * Comercios disponibles para asociar a una promo. La promo deriva su destino del
 * comercio elegido, así que cada opción trae su destino.
 * - Admin local → comercios publicados de su destino. Super admin (destinoId
 *   null) → comercios publicados de todos los destinos.
 * - Responsable → sus comercios (por ids), en cualquier estado.
 */
export async function listComerciosParaPromo(params: {
  destinoId?: string | null;
  hospedajeIds?: string[];
  lugarIds?: string[];
  modo: "admin" | "responsable";
}): Promise<ComercioOption[]> {
  const sb = createAdminClient();
  const options: ComercioOption[] = [];

  if (params.modo === "admin") {
    let hq = sb
      .from("hospedajes")
      .select("id, nombre, destinos!inner(id, nombre)")
      .eq("estado", "publicado");
    let lq = sb
      .from("lugares")
      .select("id, nombre, tipo, destinos!inner(id, nombre)")
      .eq("estado", "publicado");
    if (params.destinoId) {
      hq = hq.eq("destino_id", params.destinoId);
      lq = lq.eq("destino_id", params.destinoId);
    }
    const [{ data: hs }, { data: ls }] = (await Promise.all([hq, lq])) as [
      { data: Array<{ id: string; nombre: string; destinos: { id: string; nombre: string } }> | null },
      { data: Array<{ id: string; nombre: string; tipo: "gastronomico" | "atractivo"; destinos: { id: string; nombre: string } }> | null }
    ];
    for (const h of hs ?? [])
      options.push({ tipo: "hospedaje", id: h.id, nombre: h.nombre, destinoId: h.destinos.id, destinoNombre: h.destinos.nombre });
    for (const l of ls ?? [])
      options.push({ tipo: l.tipo, id: l.id, nombre: l.nombre, destinoId: l.destinos.id, destinoNombre: l.destinos.nombre });
    return options;
  }

  // Responsable: sus comercios por id.
  const hIds = params.hospedajeIds ?? [];
  const lIds = params.lugarIds ?? [];
  if (hIds.length > 0) {
    const { data } = (await sb
      .from("hospedajes")
      .select("id, nombre, destinos!inner(id, nombre)")
      .in("id", hIds)) as {
      data: Array<{ id: string; nombre: string; destinos: { id: string; nombre: string } }> | null;
    };
    for (const h of data ?? [])
      options.push({ tipo: "hospedaje", id: h.id, nombre: h.nombre, destinoId: h.destinos.id, destinoNombre: h.destinos.nombre });
  }
  if (lIds.length > 0) {
    const { data } = (await sb
      .from("lugares")
      .select("id, nombre, tipo, destinos!inner(id, nombre)")
      .in("id", lIds)) as {
      data: Array<{ id: string; nombre: string; tipo: "gastronomico" | "atractivo"; destinos: { id: string; nombre: string } }> | null;
    };
    for (const l of data ?? [])
      options.push({ tipo: l.tipo, id: l.id, nombre: l.nombre, destinoId: l.destinos.id, destinoNombre: l.destinos.nombre });
  }
  return options;
}
