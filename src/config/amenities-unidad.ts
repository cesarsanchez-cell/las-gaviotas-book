import type { LucideIcon } from "lucide-react";
import {
  Wifi,
  Car,
  Snowflake,
  Flame,
  Tv,
  Utensils,
  Refrigerator,
  Baby,
  Milk,
  Bath,
  WashingMachine,
  ParkingCircle,
  TreePine,
  Sun,
} from "lucide-react";

/**
 * Amenities de UNIDAD — específicas de lo que se ofrece DENTRO del depto/casa.
 *
 * NO confundir con `AMENITY_KEYS` (catálogo de hospedaje), que cubre cosas
 * compartidas del complejo (playa cerca, pet friendly, etc.). Estos son los
 * servicios y comodidades que el huésped tiene en su unidad puntual.
 *
 * Si el hospedaje tiene una pileta común del complejo, NO va acá — va en la
 * descripción del hospedaje.
 *
 * Listado consensuado con el operador 2026-05-18.
 */
export type UnidadAmenityKey =
  | "wifi"
  | "estacionamiento"
  | "aire_living"
  | "aire_dormitorio"
  | "calefaccion"
  | "tv_living"
  | "tv_dormitorio"
  | "cocina_equipada"
  | "parrilla"
  | "heladera"
  | "heladera_freezer"
  | "apto_ninos"
  | "kit_bebes"
  | "banera"
  | "lavarropas"
  | "cochera_techada"
  | "patio_parrilla"
  | "deck_terraza";

export interface UnidadAmenity {
  key: UnidadAmenityKey;
  label: string;
  icon: LucideIcon;
  /** Agrupación visual para el form. */
  group: "conectividad" | "climatizacion" | "cocina" | "familia" | "exterior" | "servicios";
}

export const UNIDAD_AMENITIES: Record<UnidadAmenityKey, UnidadAmenity> = {
  wifi:               { key: "wifi",              label: "WiFi",                    icon: Wifi,           group: "conectividad" },
  tv_living:          { key: "tv_living",         label: "Smart TV en living",      icon: Tv,             group: "conectividad" },
  tv_dormitorio:      { key: "tv_dormitorio",     label: "Smart TV en dormitorio",  icon: Tv,             group: "conectividad" },

  aire_living:        { key: "aire_living",       label: "Aire acond. en living",   icon: Snowflake,      group: "climatizacion" },
  aire_dormitorio:    { key: "aire_dormitorio",   label: "Aire acond. en dormitorio", icon: Snowflake,    group: "climatizacion" },
  calefaccion:        { key: "calefaccion",       label: "Calefacción",             icon: Flame,          group: "climatizacion" },

  cocina_equipada:    { key: "cocina_equipada",   label: "Cocina equipada",         icon: Utensils,       group: "cocina" },
  heladera:           { key: "heladera",          label: "Heladera",                icon: Refrigerator,   group: "cocina" },
  heladera_freezer:   { key: "heladera_freezer",  label: "Heladera con freezer",    icon: Refrigerator,   group: "cocina" },

  apto_ninos:         { key: "apto_ninos",        label: "Apto niños",              icon: Baby,           group: "familia" },
  kit_bebes:          { key: "kit_bebes",         label: "Kit bebés",               icon: Milk,           group: "familia" },

  banera:             { key: "banera",            label: "Bañera",                  icon: Bath,           group: "servicios" },
  lavarropas:         { key: "lavarropas",        label: "Lavarropas",              icon: WashingMachine, group: "servicios" },

  estacionamiento:    { key: "estacionamiento",   label: "Estacionamiento",         icon: Car,            group: "exterior" },
  cochera_techada:    { key: "cochera_techada",   label: "Cochera techada",         icon: ParkingCircle,  group: "exterior" },
  parrilla:           { key: "parrilla",          label: "Parrilla",                icon: Flame,          group: "exterior" },
  patio_parrilla:     { key: "patio_parrilla",    label: "Patio con parrilla",      icon: TreePine,       group: "exterior" },
  deck_terraza:       { key: "deck_terraza",      label: "Deck / Terraza",          icon: Sun,            group: "exterior" },
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
  { key: "familia",        label: "Familia" },
  { key: "servicios",      label: "Servicios" },
  { key: "exterior",       label: "Exterior" },
];

export function getUnidadAmenity(key: string): UnidadAmenity | undefined {
  return UNIDAD_AMENITIES[key as UnidadAmenityKey];
}
