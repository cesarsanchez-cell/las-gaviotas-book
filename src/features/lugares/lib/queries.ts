import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  LugarRow,
  LugarFotoRow,
  TipoLugar,
  EstadoLugar,
} from "@/types/database";

// -----------------------------------------------------------------------------
// Tipos compuestos
// -----------------------------------------------------------------------------

export type LugarWithFotos = LugarRow & {
  lugar_fotos: LugarFotoRow[];
};

export interface LugarCard {
  id: string;
  slug: string;
  nombre: string;
  tipo: TipoLugar;
  categoria: string;
  descripcion_corta: string;
  direccion: string | null;
  whatsapp: string | null;
  imperdible: boolean;
  destacado: boolean;
  foto_principal_path?: string;
  foto_alt?: string;
}

export interface LugarFilters {
  tipo?: TipoLugar;
  categoria?: string;
  imperdible?: boolean;
  destacado?: boolean;
  localidad?: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function toCard(l: LugarWithFotos): LugarCard {
  const principal =
    l.lugar_fotos.find((f) => f.es_principal) ?? l.lugar_fotos[0];
  return {
    id: l.id,
    slug: l.slug,
    nombre: l.nombre,
    tipo: l.tipo,
    categoria: l.categoria,
    descripcion_corta: l.descripcion_corta,
    direccion: l.direccion,
    whatsapp: l.whatsapp,
    imperdible: l.imperdible,
    destacado: l.destacado,
    foto_principal_path: principal?.storage_path,
    foto_alt: principal?.alt ?? l.nombre,
  };
}

// =============================================================================
// Queries públicas (RLS via cliente regular: solo lugares publicados visibles)
// =============================================================================

/**
 * Listado público de lugares de un destino, opcionalmente filtrado por tipo,
 * categoría, imperdible/destacado. Solo devuelve `estado='publicado'` (RLS).
 */
export async function listLugaresByDestino(
  destinoId: string,
  filters?: LugarFilters,
  limit?: number
): Promise<LugarCard[]> {
  const sb = await createClient();

  let q = sb
    .from("lugares")
    .select("*, lugar_fotos(*)")
    .eq("destino_id", destinoId)
    .eq("estado", "publicado")
    .order("destacado", { ascending: false })
    .order("imperdible", { ascending: false })
    .order("orden_listado", { ascending: false })
    .order("nombre", { ascending: true });

  if (filters?.tipo) q = q.eq("tipo", filters.tipo);
  if (filters?.categoria) q = q.eq("categoria", filters.categoria);
  if (filters?.imperdible) q = q.eq("imperdible", true);
  if (filters?.destacado) q = q.eq("destacado", true);

  if (filters?.localidad) {
    const { data: loc } = await sb
      .from("localidades")
      .select("id")
      .eq("destino_id", destinoId)
      .eq("slug", filters.localidad)
      .maybeSingle<{ id: string }>();
    if (loc) q = q.eq("localidad_id", loc.id);
  }

  if (limit) q = q.limit(limit);

  const { data } = await q;
  return (data ?? []).map((l) => toCard(l as LugarWithFotos));
}

/**
 * Detalle público de un lugar por slug. Solo si está publicado.
 * Fotos ordenadas con principal primero.
 */
export async function getLugarBySlug(
  destinoId: string,
  slug: string
): Promise<LugarWithFotos | null> {
  const sb = await createClient();
  const { data } = await sb
    .from("lugares")
    .select("*, lugar_fotos(*)")
    .eq("destino_id", destinoId)
    .eq("slug", slug)
    .eq("estado", "publicado")
    .maybeSingle();
  if (!data) return null;
  const row = data as LugarWithFotos;
  row.lugar_fotos.sort((a, b) => {
    if (a.es_principal && !b.es_principal) return -1;
    if (!a.es_principal && b.es_principal) return 1;
    return a.orden - b.orden;
  });
  return row;
}

/**
 * Imperdibles del destino para la home emocional. Limita N y ordena por
 * `orden_listado` desc + nombre. Solo publicados.
 */
export async function listImperdiblesByDestino(
  destinoId: string,
  limit = 3
): Promise<LugarCard[]> {
  return listLugaresByDestino(
    destinoId,
    { imperdible: true },
    limit
  );
}

/**
 * Listado para sitemap.xml — slugs + updated_at + destino_slug. Solo publicados.
 */
export async function listAllLugaresForSitemap(): Promise<
  { slug: string; tipo: TipoLugar; destino_slug: string; updated_at: string }[]
> {
  const sb = await createClient();
  const { data } = await sb
    .from("lugares")
    .select("slug, tipo, updated_at, destinos!inner(slug)")
    .eq("estado", "publicado");
  return (
    (data as unknown as Array<{
      slug: string;
      tipo: TipoLugar;
      updated_at: string;
      destinos: { slug: string };
    }>) ?? []
  ).map((l) => ({
    slug: l.slug,
    tipo: l.tipo,
    destino_slug: l.destinos.slug,
    updated_at: l.updated_at,
  }));
}

// =============================================================================
// Queries privadas (admin / responsable) — usan service role
// =============================================================================

/**
 * Listado admin: todos los lugares de un destino en cualquier estado.
 * El caller (page) ya validó scope (super admin o admin del destino).
 * Filtros opcionales por tipo, categoría y estado.
 */
export async function listLugaresAdmin(
  destinoId: string,
  options?: {
    tipo?: TipoLugar;
    estado?: EstadoLugar;
    categoria?: string;
  }
): Promise<LugarWithFotos[]> {
  const sb = createAdminClient();
  let q = sb
    .from("lugares")
    .select("*, lugar_fotos(*)")
    .eq("destino_id", destinoId)
    .order("created_at", { ascending: false });

  if (options?.tipo) q = q.eq("tipo", options.tipo);
  if (options?.estado) q = q.eq("estado", options.estado);
  if (options?.categoria) q = q.eq("categoria", options.categoria);

  const { data, error } = await q;
  if (error) {
    console.error("[listLugaresAdmin] error:", error);
    return [];
  }
  return (data ?? []) as LugarWithFotos[];
}

/**
 * Cuenta lugares pendientes de validación en un destino. Para el badge
 * "tenés N gastronómicos por validar" en el panel admin.
 */
export async function countLugaresPendientes(
  destinoId: string
): Promise<number> {
  const sb = createAdminClient();
  const { count } = await sb
    .from("lugares")
    .select("id", { count: "exact", head: true })
    .eq("destino_id", destinoId)
    .eq("estado", "pendiente_validacion");
  return count ?? 0;
}

/**
 * Detalle por id para forms admin/responsable. Sin filtro de estado.
 * RLS sigue aplicando si se usa con cliente regular; acá vamos vía service
 * role porque el caller (action/page) validó scope.
 */
export async function getLugarById(
  id: string
): Promise<LugarWithFotos | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("lugares")
    .select("*, lugar_fotos(*)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as LugarWithFotos;
  row.lugar_fotos.sort((a, b) => {
    if (a.es_principal && !b.es_principal) return -1;
    if (!a.es_principal && b.es_principal) return 1;
    return a.orden - b.orden;
  });
  return row;
}

/**
 * Listado de lugares de los que un responsable es dueño. Lee `responsabilidades`
 * con `entidad_tipo='lugar'`. Solo aplica a perfiles con rol=responsable.
 */
export async function listLugaresDelResponsable(
  perfilId: string
): Promise<LugarWithFotos[]> {
  const sb = createAdminClient();
  const { data: resp } = await sb
    .from("responsabilidades")
    .select("entidad_id")
    .eq("perfil_id", perfilId)
    .eq("entidad_tipo", "lugar")
    .returns<{ entidad_id: string }[]>();
  const ids = (resp ?? []).map((r) => r.entidad_id);
  if (ids.length === 0) return [];

  const { data, error } = await sb
    .from("lugares")
    .select("*, lugar_fotos(*)")
    .in("id", ids)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[listLugaresDelResponsable] error:", error);
    return [];
  }
  return (data ?? []) as LugarWithFotos[];
}

/**
 * Verifica si un slug está libre dentro de un destino. Para validación
 * lado servidor antes de insert/update.
 */
export async function isLugarSlugDisponible(
  destinoId: string,
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const sb = createAdminClient();
  let q = sb
    .from("lugares")
    .select("id", { head: true, count: "exact" })
    .eq("destino_id", destinoId)
    .eq("slug", slug);
  if (excludeId) q = q.neq("id", excludeId);
  const { count, error } = await q;
  if (error) return false;
  return (count ?? 0) === 0;
}
