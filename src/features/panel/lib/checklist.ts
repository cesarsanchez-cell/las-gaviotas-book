// Checklist de validación para que un responsable pueda mandar un hospedaje a revisión.
// La misma función corre client-side (para mostrar visual) y server-side (defensa).

import type { HospedajeRow, HospedajeFotoRow } from "@/types/database";

export interface ChecklistItem {
  key: string;
  label: string;
  ok: boolean;
  hint?: string;
}

const WHATSAPP_RE = /^\+\d{10,15}$/;
const MIN_FOTOS = 5;
const MIN_FOTO_WIDTH = 1200;
const MIN_AMENITIES = 3;
const MIN_DESCRIPCION_LARGA = 200;

export function evaluateChecklist(
  h: Partial<HospedajeRow>,
  fotos: Pick<HospedajeFotoRow, "es_principal" | "width">[]
): ChecklistItem[] {
  const amenities = h.amenities ?? [];
  const fotosWithGoodWidth = fotos.filter((f) => (f.width ?? 0) >= MIN_FOTO_WIDTH);

  return [
    {
      key: "nombre",
      label: "Nombre del alojamiento",
      ok: !!h.nombre && h.nombre.length >= 3,
    },
    {
      key: "tipo",
      label: "Tipo de alojamiento seleccionado",
      ok: !!h.tipo,
    },
    {
      key: "descripcion_corta",
      label: "Descripción corta",
      ok: !!h.descripcion_corta && h.descripcion_corta.length >= 20,
      hint: h.descripcion_corta
        ? `${h.descripcion_corta.length} caracteres (mínimo 20)`
        : undefined,
    },
    {
      key: "descripcion_larga",
      label: `Descripción larga (mínimo ${MIN_DESCRIPCION_LARGA} caracteres)`,
      ok:
        !!h.descripcion_larga &&
        h.descripcion_larga.length >= MIN_DESCRIPCION_LARGA,
      hint: h.descripcion_larga
        ? `${h.descripcion_larga.length} caracteres`
        : "Sin completar",
    },
    {
      key: "direccion",
      label: "Dirección completa (calle y número)",
      ok: !!h.direccion && h.direccion.trim().length >= 5,
    },
    {
      key: "coords",
      label: "Coordenadas (latitud y longitud)",
      ok: h.lat != null && h.lng != null,
      hint: "Las podés obtener pegando el link de Google Maps",
    },
    {
      key: "whatsapp",
      label: "WhatsApp del alojamiento",
      ok: !!h.whatsapp && WHATSAPP_RE.test(h.whatsapp),
    },
    {
      key: "capacidad",
      label: "Capacidad mínima y máxima",
      ok: h.capacidad_min != null && h.capacidad_max != null,
    },
    {
      key: "fotos_min",
      label: `Mínimo ${MIN_FOTOS} fotos`,
      ok: fotos.length >= MIN_FOTOS,
      hint: `${fotos.length}/${MIN_FOTOS} cargadas`,
    },
    {
      key: "foto_principal",
      label: "Una foto marcada como principal",
      ok: fotos.some((f) => f.es_principal),
    },
    {
      key: "fotos_calidad",
      label: `Al menos ${MIN_FOTOS} fotos en alta resolución (${MIN_FOTO_WIDTH}px de ancho o más)`,
      ok: fotosWithGoodWidth.length >= MIN_FOTOS,
      hint:
        fotos.length > 0
          ? `${fotosWithGoodWidth.length}/${MIN_FOTOS} en alta resolución (tenés ${fotos.length} en total)`
          : undefined,
    },
    {
      key: "amenities",
      label: `Al menos ${MIN_AMENITIES} amenities seleccionadas`,
      ok: amenities.length >= MIN_AMENITIES,
      hint: `${amenities.length} seleccionadas`,
    },
    {
      key: "responsable",
      label: "Responsable: nombre + documento",
      ok:
        !!h.responsable_nombre &&
        !!h.responsable_documento &&
        h.responsable_documento.trim().length >= 6,
    },
  ];
}

export function checklistPasses(items: ChecklistItem[]): boolean {
  return items.every((i) => i.ok);
}

export function checklistSummary(items: ChecklistItem[]) {
  const ok = items.filter((i) => i.ok).length;
  return { ok, total: items.length, complete: ok === items.length };
}
