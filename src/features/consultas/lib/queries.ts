import { createClient } from "@/lib/supabase/server";
import { countDiasBloqueadosEnRango } from "@/features/disponibilidad/lib/queries";
import type { EstadoConsulta } from "@/types/database";

export type DisponibilidadStatus = "disponible" | "ocupado" | "parcial";

function diffDays(checkInISO: string, checkOutISO: string): number {
  const a = new Date(checkInISO + "T00:00:00Z");
  const b = new Date(checkOutISO + "T00:00:00Z");
  return Math.max(
    1,
    Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
  );
}

/**
 * Calcula el estado de disponibilidad de una consulta:
 * - "disponible": 0 días bloqueados en el rango
 * - "ocupado": todos los días del rango están bloqueados
 * - "parcial": al menos uno bloqueado pero no todos
 */
export async function getDisponibilidadStatusForConsulta(
  hospedajeId: string,
  checkIn: string,
  checkOut: string
): Promise<DisponibilidadStatus> {
  const bloqueados = await countDiasBloqueadosEnRango(
    hospedajeId,
    checkIn,
    checkOut
  );
  if (bloqueados === 0) return "disponible";
  const total = diffDays(checkIn, checkOut);
  if (bloqueados >= total) return "ocupado";
  return "parcial";
}

/**
 * Enriquece un array de filas de consulta con su DisponibilidadStatus
 * computado contra la tabla `disponibilidad`. Promise.all paralelo —
 * para volúmenes actuales (<100) es suficiente.
 */
export async function enrichConsultasConDisponibilidad<
  T extends { id: string; hospedaje_id: string; check_in: string; check_out: string }
>(rows: T[]): Promise<Array<T & { disponibilidad: DisponibilidadStatus }>> {
  return Promise.all(
    rows.map(async (r) => ({
      ...r,
      disponibilidad: await getDisponibilidadStatusForConsulta(
        r.hospedaje_id,
        r.check_in,
        r.check_out
      ),
    }))
  );
}

export interface ConsultaListRow {
  id: string;
  hospedaje_id: string;
  hospedaje_nombre: string;
  hospedaje_slug: string;
  destino_slug: string;
  nombre: string;
  email: string;
  whatsapp: string | null;
  mensaje: string;
  check_in: string;
  check_out: string;
  cantidad_huespedes: number;
  estado: EstadoConsulta;
  origen: string;
  created_at: string;
}

interface ConsultaJoined {
  id: string;
  hospedaje_id: string;
  nombre: string;
  email: string;
  whatsapp: string | null;
  mensaje: string;
  check_in: string;
  check_out: string;
  cantidad_huespedes: number;
  estado: EstadoConsulta;
  origen: string;
  created_at: string;
  hospedajes: {
    nombre: string;
    slug: string;
    destinos: { slug: string };
  } | null;
}

/**
 * Lista consultas visibles al admin actual.
 *
 * - Super admin (destinoId=null) ve todas.
 * - Admin local solo ve consultas de hospedajes de su destino (RLS lo
 *   garantiza por las policies de la migración 20260516000002 que usan
 *   admin_owns_hospedaje, pero filtramos también acá para no traer rows
 *   que luego RLS oculta — más eficiente).
 *
 * `estado` filtra por estado puntual. Si null, devuelve todos los estados.
 * Default: ordenar por created_at desc.
 */
export async function listConsultasAdmin(opts: {
  destinoId: string | null;
  estado?: EstadoConsulta | null;
}): Promise<ConsultaListRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("consultas")
    .select(
      "id, hospedaje_id, nombre, email, whatsapp, mensaje, check_in, check_out, cantidad_huespedes, estado, origen, created_at, hospedajes!inner(nombre, slug, destino_id, destinos!inner(slug))"
    )
    .order("created_at", { ascending: false });

  if (opts.estado) q = q.eq("estado", opts.estado);
  if (opts.destinoId) {
    // Filtro doble: el join inner.hospedajes ya respeta RLS, pero filtramos
    // también explícito para no escanear de más.
    q = q.eq("hospedajes.destino_id", opts.destinoId);
  }

  const { data } = await q.returns<
    Array<
      Omit<ConsultaJoined, "hospedajes"> & {
        hospedajes: {
          nombre: string;
          slug: string;
          destinos: { slug: string };
        };
      }
    >
  >();

  return (data ?? []).map((c) => ({
    id: c.id,
    hospedaje_id: c.hospedaje_id,
    hospedaje_nombre: c.hospedajes.nombre,
    hospedaje_slug: c.hospedajes.slug,
    destino_slug: c.hospedajes.destinos.slug,
    nombre: c.nombre,
    email: c.email,
    whatsapp: c.whatsapp,
    mensaje: c.mensaje,
    check_in: c.check_in,
    check_out: c.check_out,
    cantidad_huespedes: c.cantidad_huespedes,
    estado: c.estado,
    origen: c.origen,
    created_at: c.created_at,
  }));
}

/**
 * Lista consultas del responsable autenticado.
 *
 * RLS aplica el filtro automáticamente vía la policy
 * "Consultas: responsable lee las propias" usando responsable_owns_hospedaje
 * (la query usa cookies del user, no service role). No necesitamos pasar
 * perfilId ni hospedajes_ids al query — RLS lo hace.
 */
export async function listConsultasResponsable(opts: {
  estado?: EstadoConsulta | null;
}): Promise<ConsultaListRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("consultas")
    .select(
      "id, hospedaje_id, nombre, email, whatsapp, mensaje, check_in, check_out, cantidad_huespedes, estado, origen, created_at, hospedajes!inner(nombre, slug, destinos!inner(slug))"
    )
    .order("created_at", { ascending: false });

  if (opts.estado) q = q.eq("estado", opts.estado);

  const { data } = await q.returns<
    Array<
      Omit<ConsultaJoined, "hospedajes"> & {
        hospedajes: {
          nombre: string;
          slug: string;
          destinos: { slug: string };
        };
      }
    >
  >();

  return (data ?? []).map((c) => ({
    id: c.id,
    hospedaje_id: c.hospedaje_id,
    hospedaje_nombre: c.hospedajes.nombre,
    hospedaje_slug: c.hospedajes.slug,
    destino_slug: c.hospedajes.destinos.slug,
    nombre: c.nombre,
    email: c.email,
    whatsapp: c.whatsapp,
    mensaje: c.mensaje,
    check_in: c.check_in,
    check_out: c.check_out,
    cantidad_huespedes: c.cantidad_huespedes,
    estado: c.estado,
    origen: c.origen,
    created_at: c.created_at,
  }));
}

export interface ConsultasStats {
  total: number;
  nuevas: number;
  leidas: number;
  respondidas: number;
  descartadas: number;
}

/**
 * Counts por estado, scope-aware. Usa las mismas reglas que listConsultasAdmin.
 */
export async function getConsultasStats(
  destinoId: string | null
): Promise<ConsultasStats> {
  const supabase = await createClient();

  const buildCount = (estado?: EstadoConsulta) => {
    let q = supabase
      .from("consultas")
      .select(
        "id, hospedajes!inner(destino_id)",
        { count: "exact", head: true }
      );
    if (estado) q = q.eq("estado", estado);
    if (destinoId) q = q.eq("hospedajes.destino_id", destinoId);
    return q;
  };

  const counts = await Promise.all([
    buildCount(),
    buildCount("nueva"),
    buildCount("leida"),
    buildCount("respondida"),
    buildCount("descartada"),
  ]);

  return {
    total: counts[0].count ?? 0,
    nuevas: counts[1].count ?? 0,
    leidas: counts[2].count ?? 0,
    respondidas: counts[3].count ?? 0,
    descartadas: counts[4].count ?? 0,
  };
}

/**
 * Counts por estado para el responsable autenticado.
 * RLS filtra al perfil — no necesita perfilId.
 */
export async function getConsultasStatsResponsable(): Promise<ConsultasStats> {
  const supabase = await createClient();

  const buildCount = (estado?: EstadoConsulta) => {
    let q = supabase
      .from("consultas")
      .select("id", { count: "exact", head: true });
    if (estado) q = q.eq("estado", estado);
    return q;
  };

  const counts = await Promise.all([
    buildCount(),
    buildCount("nueva"),
    buildCount("leida"),
    buildCount("respondida"),
    buildCount("descartada"),
  ]);

  return {
    total: counts[0].count ?? 0,
    nuevas: counts[1].count ?? 0,
    leidas: counts[2].count ?? 0,
    respondidas: counts[3].count ?? 0,
    descartadas: counts[4].count ?? 0,
  };
}
