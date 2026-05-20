import { createAdminClient } from "@/lib/supabase/admin";
import type {
  UnidadTypeRow,
  UnidadTypeFotoRow,
  UnidadRow,
  HospedajeRow,
} from "@/types/database";
import type { UnidadResultado } from "./types";

/**
 * Busca tipos de unidad disponibles en TODOS los hospedajes publicados de un
 * destino que matchean:
 *  - capacidad (adultos + niños) <= capacidad declarada del tipo
 *  - al menos UNA unidad física activa libre en TODO el rango [checkIn, checkOut)
 *
 * checkOut es exclusivo (la noche del checkOut ya no se cuenta).
 *
 * Restricciones (estadía mínima, día de ingreso/egreso) y tarifas se aplican
 * en Etapas 6 y 7. Hoy todos los tipos que pasen capacidad+disponibilidad
 * se devuelven.
 *
 * Devuelve tipos ordenados por: hospedaje destacado primero, después por
 * capacidad ascendente (primero el match más ajustado), después por nombre.
 *
 * Usa service role: la búsqueda pública pasa por server action / page server.
 */
export async function searchUnidadesPorDestino(
  destinoId: string,
  checkIn: string,
  checkOut: string,
  capacidadMin: number
): Promise<UnidadResultado[]> {
  const sb = createAdminClient();

  // 1) Hospedajes publicados del destino.
  const { data: hospedajesRaw } = await sb
    .from("hospedajes")
    .select("id, slug, nombre, tipo, direccion, whatsapp, destacado")
    .eq("destino_id", destinoId)
    .eq("estado", "publicado");

  type HospedajeMin = Pick<
    HospedajeRow,
    "id" | "slug" | "nombre" | "tipo" | "direccion" | "whatsapp" | "destacado"
  >;
  const hospedajes = (hospedajesRaw ?? []) as HospedajeMin[];
  if (hospedajes.length === 0) return [];

  const hospedajesById = new Map<string, HospedajeMin>();
  for (const h of hospedajes) hospedajesById.set(h.id, h);

  // 2) Tipos activos de esos hospedajes con capacidad suficiente.
  const { data: tiposRaw } = await sb
    .from("unidad_types")
    .select(
      `
      id, hospedaje_id, nombre, capacidad_adultos, capacidad_ninos,
      camas_descripcion, amenities, vista, calefaccion_tipo,
      unidades:unidades ( id, activa ),
      fotos:unidad_type_fotos ( storage_path, alt, es_principal, orden )
    `
    )
    .in(
      "hospedaje_id",
      hospedajes.map((h) => h.id)
    )
    .eq("activo", true);

  type RawTipo = Pick<
    UnidadTypeRow,
    | "id"
    | "hospedaje_id"
    | "nombre"
    | "capacidad_adultos"
    | "capacidad_ninos"
    | "camas_descripcion"
    | "amenities"
    | "vista"
    | "calefaccion_tipo"
  > & {
    unidades: Pick<UnidadRow, "id" | "activa">[];
    fotos: Pick<
      UnidadTypeFotoRow,
      "storage_path" | "alt" | "es_principal" | "orden"
    >[];
  };

  const tipos = (tiposRaw ?? []) as RawTipo[];
  const tiposConCapacidad = tipos.filter(
    (t) =>
      (t.capacidad_adultos ?? 0) + (t.capacidad_ninos ?? 0) >= capacidadMin
  );
  if (tiposConCapacidad.length === 0) return [];

  // 3) Unidades físicas activas de esos tipos.
  const unidadesActivas: { id: string; tipoId: string }[] = [];
  for (const t of tiposConCapacidad) {
    for (const u of t.unidades) {
      if (u.activa) unidadesActivas.push({ id: u.id, tipoId: t.id });
    }
  }
  if (unidadesActivas.length === 0) return [];

  // 4) Filas de disponibilidad en [checkIn, checkOut) para esas unidades.
  const { data: bloqueosRaw } = await sb
    .from("disponibilidad")
    .select("unidad_id")
    .in(
      "unidad_id",
      unidadesActivas.map((u) => u.id)
    )
    .gte("fecha", checkIn)
    .lt("fecha", checkOut);

  const unidadesBloqueadas = new Set(
    (bloqueosRaw ?? []).map((b) => (b as { unidad_id: string }).unidad_id)
  );

  // 5) Por tipo: contar unidades libres vs totales. Si libres === 0, descartar.
  const out: UnidadResultado[] = [];
  for (const t of tiposConCapacidad) {
    const h = hospedajesById.get(t.hospedaje_id);
    if (!h) continue;
    const activas = t.unidades.filter((u) => u.activa);
    const libres = activas.filter((u) => !unidadesBloqueadas.has(u.id));
    if (libres.length === 0) continue;
    const fotosOrdenadas = [...t.fotos]
      .sort((a, b) => {
        if (a.es_principal && !b.es_principal) return -1;
        if (!a.es_principal && b.es_principal) return 1;
        return a.orden - b.orden;
      })
      .map((f) => ({
        storage_path: f.storage_path,
        alt: f.alt,
        es_principal: f.es_principal,
      }));
    out.push({
      unidad_type_id: t.id,
      nombre: t.nombre,
      capacidad_total:
        (t.capacidad_adultos ?? 0) + (t.capacidad_ninos ?? 0),
      capacidad_adultos: t.capacidad_adultos ?? 0,
      capacidad_ninos: t.capacidad_ninos ?? 0,
      camas_descripcion: t.camas_descripcion,
      amenities: t.amenities ?? [],
      vista: t.vista,
      calefaccion_tipo: t.calefaccion_tipo,
      fotos: fotosOrdenadas,
      unidades_libres: libres.length,
      unidades_totales: activas.length,
      hospedaje: {
        id: h.id,
        slug: h.slug,
        nombre: h.nombre,
        tipo: h.tipo,
        direccion: h.direccion,
        whatsapp: h.whatsapp,
      },
    });
  }

  // Orden: destacados primero, después capacidad asc, después nombre.
  const destacadoBoost = new Map<string, number>();
  for (const h of hospedajes) destacadoBoost.set(h.id, h.destacado ? 1 : 0);

  out.sort((a, b) => {
    const ad = destacadoBoost.get(a.hospedaje.id) ?? 0;
    const bd = destacadoBoost.get(b.hospedaje.id) ?? 0;
    if (ad !== bd) return bd - ad;
    if (a.capacidad_total !== b.capacidad_total)
      return a.capacidad_total - b.capacidad_total;
    return a.nombre.localeCompare(b.nombre);
  });

  return out;
}
