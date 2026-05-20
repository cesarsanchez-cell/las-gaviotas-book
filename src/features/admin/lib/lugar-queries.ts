import { createAdminClient } from "@/lib/supabase/admin";
import type {
  EstadoLugar,
  LugarFotoRow,
  LugarRow,
  TipoLugar,
} from "@/types/database";

/**
 * Fila plana para tabla admin de lugares. Inluye nombre del destino y del
 * responsable (si existe), para no hacer joins en el render.
 */
export interface AdminLugarRow {
  id: string;
  slug: string;
  nombre: string;
  tipo: TipoLugar;
  categoria: string;
  estado: EstadoLugar;
  destacado: boolean;
  imperdible: boolean;
  destino_nombre: string;
  responsable_nombre: string | null;
  updated_at: string;
}

/**
 * Listado admin de lugares scoped al destino del admin (super admin ve todo).
 * Filtra por tipo (gastro vs atractivo) y opcionalmente por estado.
 *
 * Para el responsable, leemos via `responsabilidades` con join lateral en el
 * client (Supabase no permite joins anidados con cláusulas complejas; lo
 * hacemos en dos queries y mergeamos).
 */
export async function listLugaresAdminConDestino(
  tipo: TipoLugar,
  destinoId?: string | null,
  estado?: EstadoLugar
): Promise<AdminLugarRow[]> {
  const sb = createAdminClient();
  let q = sb
    .from("lugares")
    .select(
      "id, slug, nombre, tipo, categoria, estado, destacado, imperdible, destino_id, updated_at, destinos!inner(nombre)"
    )
    .eq("tipo", tipo)
    .order("updated_at", { ascending: false });

  if (destinoId) q = q.eq("destino_id", destinoId);
  if (estado) q = q.eq("estado", estado);

  const { data, error } = await q;
  if (error) {
    console.error("[listLugaresAdmin] error:", error);
    return [];
  }

  type Raw = {
    id: string;
    slug: string;
    nombre: string;
    tipo: TipoLugar;
    categoria: string;
    estado: EstadoLugar;
    destacado: boolean;
    imperdible: boolean;
    destino_id: string;
    updated_at: string;
    destinos: { nombre: string };
  };

  const rows = (data ?? []) as Raw[];
  if (rows.length === 0) return [];

  // Pull responsables for gastronómicos vía responsabilidades.
  let responsableMap = new Map<string, string | null>();
  if (tipo === "gastronomico") {
    const ids = rows.map((r) => r.id);
    const { data: resp } = await sb
      .from("responsabilidades")
      .select("entidad_id, perfil_id")
      .eq("entidad_tipo", "lugar")
      .in("entidad_id", ids);
    const respRows = (resp ?? []) as {
      entidad_id: string;
      perfil_id: string;
    }[];

    if (respRows.length > 0) {
      const perfilIds = [...new Set(respRows.map((r) => r.perfil_id))];
      const { data: perfiles } = await sb
        .from("perfiles")
        .select("id, nombre")
        .in("id", perfilIds);
      const perfilMap = new Map(
        (perfiles ?? []).map((p) => [
          (p as { id: string }).id,
          (p as { nombre: string | null }).nombre,
        ])
      );
      responsableMap = new Map(
        respRows.map((r) => [r.entidad_id, perfilMap.get(r.perfil_id) ?? null])
      );
    }
  }

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    tipo: r.tipo,
    categoria: r.categoria,
    estado: r.estado,
    destacado: r.destacado,
    imperdible: r.imperdible,
    destino_nombre: r.destinos.nombre,
    responsable_nombre: responsableMap.get(r.id) ?? null,
    updated_at: r.updated_at,
  }));
}

export interface LugaresStatsByTipo {
  publicados: number;
  pendientes: number;
  borradores: number;
  pausados: number;
  rechazados: number;
}

/**
 * Stats agregados de la vertical `tipo` para el dashboard admin.
 * Scoped por destino del admin (null = super admin = toda la red).
 */
export async function getLugaresStats(
  tipo: TipoLugar,
  destinoId: string | null
): Promise<LugaresStatsByTipo> {
  const sb = createAdminClient();
  const baseCount = (estado: string) => {
    let q = sb
      .from("lugares")
      .select("id", { count: "exact", head: true })
      .eq("tipo", tipo)
      .eq("estado", estado);
    if (destinoId) q = q.eq("destino_id", destinoId);
    return q;
  };

  const [pub, pend, borr, paus, rech] = await Promise.all([
    baseCount("publicado"),
    baseCount("pendiente_validacion"),
    baseCount("borrador"),
    baseCount("pausado"),
    baseCount("rechazado"),
  ]);

  return {
    publicados: pub.count ?? 0,
    pendientes: pend.count ?? 0,
    borradores: borr.count ?? 0,
    pausados: paus.count ?? 0,
    rechazados: rech.count ?? 0,
  };
}

/**
 * Lista mínima de destinos para los selects de creación de lugar.
 * Admin local solo ve el suyo, super admin ve todos.
 */
export async function listDestinosParaSelect(
  adminDestinoId: string | null
): Promise<{ id: string; nombre: string; slug: string }[]> {
  const sb = createAdminClient();
  let q = sb
    .from("destinos")
    .select("id, nombre, slug")
    .eq("activo", true)
    .order("nombre", { ascending: true });
  if (adminDestinoId) q = q.eq("id", adminDestinoId);
  const { data } = await q;
  return (data ?? []) as { id: string; nombre: string; slug: string }[];
}

/**
 * Lugares en estado `pendiente_validacion` para la cola unificada de /admin/validaciones.
 * Solo gastronómicos (los atractivos no pasan por validación). Scoped al destino del admin.
 */
export async function listLugaresPendientesValidacion(
  destinoId: string | null
): Promise<
  Array<
    LugarRow & {
      lugar_fotos: LugarFotoRow[];
      destinos: { slug: string; nombre: string };
      responsable_nombre: string | null;
    }
  >
> {
  const sb = createAdminClient();
  let q = sb
    .from("lugares")
    .select("*, lugar_fotos(*), destinos!inner(slug, nombre)")
    .eq("tipo", "gastronomico")
    .eq("estado", "pendiente_validacion")
    .order("updated_at", { ascending: true });
  if (destinoId) q = q.eq("destino_id", destinoId);

  const { data } = await q;
  type Raw = LugarRow & {
    lugar_fotos: LugarFotoRow[];
    destinos: { slug: string; nombre: string };
  };
  const rows = (data ?? []) as Raw[];
  if (rows.length === 0) return [];

  // Resolver nombre del responsable de cada lugar.
  const ids = rows.map((r) => r.id);
  const { data: resp } = await sb
    .from("responsabilidades")
    .select("entidad_id, perfil_id")
    .eq("entidad_tipo", "lugar")
    .in("entidad_id", ids);
  const respRows = (resp ?? []) as {
    entidad_id: string;
    perfil_id: string;
  }[];

  const perfilIds = [...new Set(respRows.map((r) => r.perfil_id))];
  let nombrePorPerfilId = new Map<string, string | null>();
  if (perfilIds.length > 0) {
    const { data: perfiles } = await sb
      .from("perfiles")
      .select("id, nombre")
      .in("id", perfilIds);
    nombrePorPerfilId = new Map(
      (perfiles ?? []).map((p) => [
        (p as { id: string }).id,
        (p as { nombre: string | null }).nombre,
      ])
    );
  }
  const nombrePorLugarId = new Map<string, string | null>();
  for (const r of respRows) {
    nombrePorLugarId.set(r.entidad_id, nombrePorPerfilId.get(r.perfil_id) ?? null);
  }

  return rows.map((r) => ({
    ...r,
    responsable_nombre: nombrePorLugarId.get(r.id) ?? null,
  }));
}

export interface ResponsableOpt {
  id: string;
  nombre: string;
  email: string;
}

/**
 * Lista TODOS los responsables del sistema para el selector de asignación.
 * No filtra por destino — un mismo responsable puede gestionar entidades en
 * distintos destinos. Si el caso aparece (lo razonable es que sea raro), el
 * admin sabe a quién está eligiendo.
 *
 * Devuelve id + nombre + email (este último vía auth.admin.listUsers).
 */
export async function listResponsablesParaSelector(): Promise<ResponsableOpt[]> {
  const sb = createAdminClient();
  const { data: perfiles } = await sb
    .from("perfiles")
    .select("id, nombre")
    .eq("rol", "responsable")
    .order("nombre", { ascending: true });

  const list = (perfiles ?? []) as { id: string; nombre: string | null }[];
  if (list.length === 0) return [];

  // Resolver emails desde auth.users. listUsers pagina; con pocos usuarios
  // alcanza una llamada.
  const { data: usersData } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const emailById = new Map<string, string>();
  for (const u of usersData?.users ?? []) {
    if (u.id && u.email) emailById.set(u.id, u.email);
  }

  return list.map((p) => ({
    id: p.id,
    nombre: p.nombre ?? "Sin nombre",
    email: emailById.get(p.id) ?? "(sin email)",
  }));
}

/**
 * Devuelve los responsables actualmente asignados a un lugar (entidad_tipo=lugar).
 * En la práctica suele ser 0 o 1, pero el modelo permite varios.
 */
export async function listResponsablesDeLugar(
  lugarId: string
): Promise<ResponsableOpt[]> {
  const sb = createAdminClient();
  const { data: rels } = await sb
    .from("responsabilidades")
    .select("perfil_id")
    .eq("entidad_tipo", "lugar")
    .eq("entidad_id", lugarId)
    .returns<{ perfil_id: string }[]>();

  const ids = (rels ?? []).map((r) => r.perfil_id);
  if (ids.length === 0) return [];

  const { data: perfiles } = await sb
    .from("perfiles")
    .select("id, nombre")
    .in("id", ids);

  const { data: usersData } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const emailById = new Map<string, string>();
  for (const u of usersData?.users ?? []) {
    if (u.id && u.email) emailById.set(u.id, u.email);
  }

  return ((perfiles ?? []) as { id: string; nombre: string | null }[]).map(
    (p) => ({
      id: p.id,
      nombre: p.nombre ?? "Sin nombre",
      email: emailById.get(p.id) ?? "(sin email)",
    })
  );
}
