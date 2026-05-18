import type { LucideIcon } from "lucide-react";
import {
  KeyRound,
  Briefcase,
  Globe,
  MessageCircle,
  Clock,
  Sparkles,
  Video,
} from "lucide-react";

/**
 * Amenities OPERATIONAL — políticas / modos de operación a nivel HOSPEDAJE.
 *
 * No son cosas que el hospedaje "tiene", son cosas que el hospedaje "hace".
 * Aplica a todo el hospedaje, no a una unidad puntual (un dúplex no puede
 * tener "atención 24hs" mientras el otro no — la política es del conjunto).
 *
 * Cerrado con el operador 2026-05-18. Ver memoria
 * `project-amenities-3-scopes`.
 *
 * Atención: cosas que parecen "operational" pero NO entran acá porque tienen
 * shape distinto:
 *   - Cancellation policy (flexible/moderada/estricta) → enum single-choice
 *     en columna propia cuando llegue Etapa de reservas online.
 *   - Tipo de facturación (A/B/C) → enum single-choice en columna propia.
 */
export type OperationalAmenityKey =
  | "self_check_in"
  | "administracion_centralizada"
  | "administracion_remota"
  | "atencion_whatsapp"
  | "atencion_24hs"
  | "limpieza_diaria"
  | "recepcion_virtual";

export interface OperationalAmenity {
  key: OperationalAmenityKey;
  label: string;
  icon: LucideIcon;
  group: "check_in" | "administracion" | "atencion" | "servicios";
}

export const OPERATIONAL_AMENITIES: Record<
  OperationalAmenityKey,
  OperationalAmenity
> = {
  self_check_in:                { key: "self_check_in",                label: "Self check-in",               icon: KeyRound,      group: "check_in" },
  recepcion_virtual:            { key: "recepcion_virtual",            label: "Recepción virtual",           icon: Video,         group: "check_in" },

  administracion_centralizada:  { key: "administracion_centralizada",  label: "Administración centralizada", icon: Briefcase,     group: "administracion" },
  administracion_remota:        { key: "administracion_remota",        label: "Administración remota",       icon: Globe,         group: "administracion" },

  atencion_whatsapp:            { key: "atencion_whatsapp",            label: "Atención por WhatsApp",       icon: MessageCircle, group: "atencion" },
  atencion_24hs:                { key: "atencion_24hs",                label: "Atención 24 hs",              icon: Clock,         group: "atencion" },

  limpieza_diaria:              { key: "limpieza_diaria",              label: "Limpieza diaria",             icon: Sparkles,      group: "servicios" },
};

export const OPERATIONAL_AMENITY_KEYS = Object.keys(
  OPERATIONAL_AMENITIES
) as OperationalAmenityKey[];

export const OPERATIONAL_AMENITY_GROUPS: Array<{
  key: OperationalAmenity["group"];
  label: string;
}> = [
  { key: "check_in",       label: "Check-in" },
  { key: "administracion", label: "Administración" },
  { key: "atencion",       label: "Atención" },
  { key: "servicios",      label: "Servicios" },
];

export function getOperationalAmenity(
  key: string
): OperationalAmenity | undefined {
  return OPERATIONAL_AMENITIES[key as OperationalAmenityKey];
}
