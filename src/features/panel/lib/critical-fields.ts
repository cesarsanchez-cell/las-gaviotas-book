// Campos cuya edición por parte del responsable, sobre un hospedaje ya
// publicado o pausado, dispara una nueva revisión por parte del admin
// (el hospedaje vuelve a estado `pendiente_validacion` hasta re-aprobarse).
//
// Criterio:
// - Datos identificatorios / verificables (dirección, capacidad, contacto).
// - Datos que afectan la URL pública (slug) o la ubicación lógica (destino/localidad).
// - Identidad del responsable.
//
// NO críticos (cambian sin re-validación): descripciones, amenities, fotos
// adicionales, redes sociales secundarias, meta SEO, cantidad de unidades.

import type { HospedajeRow } from "@/types/database";

export const CRITICAL_FIELDS = [
  "nombre",
  "tipo",
  "slug",
  "destino_id",
  "localidad_id",
  "direccion",
  "lat",
  "lng",
  "capacidad_min",
  "capacidad_max",
  "whatsapp",
  "responsable_nombre",
  "responsable_documento",
] as const satisfies readonly (keyof HospedajeRow)[];

export type CriticalField = (typeof CRITICAL_FIELDS)[number];

/**
 * Devuelve el subconjunto de campos críticos que cambiaron entre `current` y
 * `next`. Se hace comparación laxa: null/undefined/"" se tratan como iguales,
 * los números se comparan numéricamente (no por tipo).
 */
export function diffCriticalFields(
  current: Partial<HospedajeRow>,
  next: Partial<HospedajeRow>
): CriticalField[] {
  const changed: CriticalField[] = [];
  for (const key of CRITICAL_FIELDS) {
    const a = normalize(current[key]);
    const b = normalize(next[key]);
    if (a !== b) changed.push(key);
  }
  return changed;
}

function normalize(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return String(v);
  return String(v).trim();
}
