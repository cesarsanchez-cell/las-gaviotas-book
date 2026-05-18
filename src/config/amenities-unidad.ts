import type { LucideIcon } from "lucide-react";
import {
  Wifi,
  Utensils,
  Refrigerator,
  Microwave,
  Snowflake,
  Tv,
  Lock,
  Sun,
  Flame,
  KeyRound,
  Bug,
  Sofa,
  Bed,
  WashingMachine,
} from "lucide-react";

/**
 * Amenities de UNIDAD — específicas de lo que se ofrece DENTRO del depto/casa.
 *
 * Coexiste con `AMENITY_KEYS` (property — complejo) y `OPERATIONAL_AMENITY_KEYS`
 * (políticas/modos a nivel hospedaje).
 *
 * IMPORTANTE: `vista` y `calefaccion_tipo` NO son amenities — son columnas
 * propias de `unidad_types` con shape estructurado (texto libre y enum
 * respectivamente). Ver `unidadTypeSchema` y memoria
 * `project-amenities-3-scopes`.
 */
export type UnidadAmenityKey =
  | "wifi"
  | "cocina_completa"
  | "heladera_freezer"
  | "microondas"
  | "aire_acondicionado_living"
  | "aire_acondicionado_dormitorio"
  | "smart_tv"
  | "caja_seguridad"
  | "balcon_terraza"
  | "parrilla_privada"
  | "cerradura_digital"
  | "mosquiteros"
  | "sofa_cama"
  | "cama_catre"
  | "vajilla_completa"
  | "lavarropas";

export interface UnidadAmenity {
  key: UnidadAmenityKey;
  label: string;
  icon: LucideIcon;
  group: "conectividad" | "climatizacion" | "cocina" | "comodidad" | "seguridad" | "exterior" | "servicios";
}

export const UNIDAD_AMENITIES: Record<UnidadAmenityKey, UnidadAmenity> = {
  wifi:                          { key: "wifi",                          label: "WiFi",                  icon: Wifi,           group: "conectividad" },
  smart_tv:                      { key: "smart_tv",                      label: "Smart TV",              icon: Tv,             group: "conectividad" },

  aire_acondicionado_living:     { key: "aire_acondicionado_living",     label: "Aire acond. en living",     icon: Snowflake,  group: "climatizacion" },
  aire_acondicionado_dormitorio: { key: "aire_acondicionado_dormitorio", label: "Aire acond. en dormitorio", icon: Snowflake,  group: "climatizacion" },

  cocina_completa:               { key: "cocina_completa",               label: "Cocina completa",       icon: Utensils,       group: "cocina" },
  heladera_freezer:              { key: "heladera_freezer",              label: "Heladera con freezer",  icon: Refrigerator,   group: "cocina" },
  microondas:                    { key: "microondas",                    label: "Microondas",            icon: Microwave,      group: "cocina" },
  vajilla_completa:              { key: "vajilla_completa",              label: "Vajilla completa",      icon: Utensils,       group: "cocina" },

  sofa_cama:                     { key: "sofa_cama",                     label: "Sofá cama",             icon: Sofa,           group: "comodidad" },
  cama_catre:                    { key: "cama_catre",                    label: "Cama catre disponible", icon: Bed,            group: "comodidad" },
  mosquiteros:                   { key: "mosquiteros",                   label: "Mosquiteros",           icon: Bug,            group: "comodidad" },

  caja_seguridad:                { key: "caja_seguridad",                label: "Caja de seguridad",     icon: Lock,           group: "seguridad" },
  cerradura_digital:             { key: "cerradura_digital",             label: "Cerradura digital",     icon: KeyRound,       group: "seguridad" },

  balcon_terraza:                { key: "balcon_terraza",                label: "Balcón / terraza",      icon: Sun,            group: "exterior" },
  parrilla_privada:              { key: "parrilla_privada",              label: "Parrilla privada",      icon: Flame,          group: "exterior" },

  lavarropas:                    { key: "lavarropas",                    label: "Lavarropas",            icon: WashingMachine, group: "servicios" },
};

export const UNIDAD_AMENITY_KEYS = Object.keys(
  UNIDAD_AMENITIES
) as UnidadAmenityKey[];

export const UNIDAD_AMENITY_GROUPS: Array<{
  key: UnidadAmenity["group"];
  label: string;
}> = [
  { key: "conectividad",   label: "Conectividad y entretenimiento" },
  { key: "climatizacion",  label: "Climatización" },
  { key: "cocina",         label: "Cocina" },
  { key: "comodidad",      label: "Comodidad" },
  { key: "seguridad",      label: "Seguridad" },
  { key: "exterior",       label: "Exterior privado" },
  { key: "servicios",      label: "Servicios" },
];

export function getUnidadAmenity(key: string): UnidadAmenity | undefined {
  return UNIDAD_AMENITIES[key as UnidadAmenityKey];
}

// =============================================================================
// Enum estructurado: tipo de calefacción
// =============================================================================
// No es flag — son opciones excluyentes. Vive en columna propia
// `unidad_types.calefaccion_tipo` con CHECK constraint en BD.

export type CalefaccionTipo =
  | "salamandra"
  | "hogar_lena"
  | "tiro_balanceado"
  | "radiadores"
  | "aire_frio_calor"
  | "losa_radiante"
  | "multiple"
  | "ninguna";

export const CALEFACCION_TIPO_LABEL: Record<CalefaccionTipo, string> = {
  salamandra:        "Salamandra",
  hogar_lena:        "Hogar a leña",
  tiro_balanceado:   "Tiro balanceado",
  radiadores:        "Radiadores",
  aire_frio_calor:   "Aire frío/calor",
  losa_radiante:     "Losa radiante",
  multiple:          "Varios (combinados)",
  ninguna:           "Sin calefacción",
};

export const CALEFACCION_TIPO_KEYS = Object.keys(
  CALEFACCION_TIPO_LABEL
) as CalefaccionTipo[];
