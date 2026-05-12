import type { HospedajeFilters } from "@/features/hospedajes/lib/queries";
import { AMENITY_KEYS, type AmenityKey } from "@/config/amenities";

export const TIPOS_VALIDOS = [
  "hotel",
  "apart",
  "cabana",
  "hosteria",
  "camping",
  "casa",
  "departamento",
] as const;

export type SearchParams = Record<string, string | string[] | undefined>;

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export function parseFiltersFromSearchParams(
  params: SearchParams
): HospedajeFilters {
  const filters: HospedajeFilters = {};

  const tipo = pickString(params.tipo);
  if (tipo && (TIPOS_VALIDOS as readonly string[]).includes(tipo)) {
    filters.tipo = tipo;
  }

  const amenitiesRaw = pickString(params.amenities);
  if (amenitiesRaw) {
    const valid = amenitiesRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is AmenityKey =>
        (AMENITY_KEYS as readonly string[]).includes(s)
      );
    if (valid.length > 0) filters.amenities = valid;
  }

  const cap = pickString(params.capacidad);
  if (cap) {
    const n = Number(cap);
    if (Number.isFinite(n) && n > 0 && n <= 20) filters.capacidad = n;
  }

  const localidad = pickString(params.localidad);
  if (localidad) filters.localidad = localidad;

  return filters;
}

export function serializeFilters(filters: HospedajeFilters): string {
  const params = new URLSearchParams();
  if (filters.tipo) params.set("tipo", filters.tipo);
  if (filters.amenities && filters.amenities.length > 0) {
    params.set("amenities", filters.amenities.join(","));
  }
  if (filters.capacidad) params.set("capacidad", String(filters.capacidad));
  if (filters.localidad) params.set("localidad", filters.localidad);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function hasActiveFilters(filters: HospedajeFilters): boolean {
  return Boolean(
    filters.tipo ||
      filters.localidad ||
      filters.capacidad ||
      (filters.amenities && filters.amenities.length > 0)
  );
}
