import type { LucideIcon } from "lucide-react";
import {
  Wifi,
  Waves,
  Car,
  Dog,
  TreePine,
  Trees,
  Flame,
  Utensils,
  PartyPopper,
  ToyBrick,
  Sailboat,
  Snowflake,
  Bell,
  Antenna,
  Zap,
} from "lucide-react";

/**
 * Amenities de PROPERTY — comodidades del complejo / hospedaje compartido.
 *
 * Coexiste con `UNIDAD_AMENITY_KEYS` (cosas dentro de la unidad) y
 * `OPERATIONAL_AMENITY_KEYS` (políticas/modos de operación a nivel hospedaje).
 *
 * Cerrado con el operador 2026-05-18. Ver memoria
 * `project-amenities-3-scopes`.
 */
export type AmenityKey =
  | "piscina"
  | "piscina_climatizada"
  | "parque"
  | "jardin"
  | "parrillas_compartidas"
  | "quincho"
  | "wifi_areas_comunes"
  | "estacionamiento"
  | "cerca_del_mar"
  | "servicio_de_playa"
  | "juegos_para_ninos"
  | "sum"
  | "pet_friendly"
  | "recepcion"
  | "grupo_electrogeno"
  | "starlink";

export interface Amenity {
  key: AmenityKey;
  label: string;
  icon: LucideIcon;
  group: "exterior" | "servicios" | "conectividad" | "familia";
}

export const AMENITIES: Record<AmenityKey, Amenity> = {
  piscina:              { key: "piscina",              label: "Piscina",              icon: Waves,        group: "exterior" },
  piscina_climatizada:  { key: "piscina_climatizada",  label: "Piscina climatizada",  icon: Snowflake,    group: "exterior" },
  parque:               { key: "parque",               label: "Parque",               icon: Trees,        group: "exterior" },
  jardin:               { key: "jardin",               label: "Jardín",               icon: TreePine,     group: "exterior" },
  parrillas_compartidas:{ key: "parrillas_compartidas",label: "Parrillas compartidas",icon: Flame,        group: "exterior" },
  quincho:              { key: "quincho",              label: "Quincho",              icon: Utensils,     group: "exterior" },
  cerca_del_mar:        { key: "cerca_del_mar",        label: "Cerca del mar",        icon: Sailboat,     group: "exterior" },
  servicio_de_playa:    { key: "servicio_de_playa",    label: "Servicio de playa",    icon: Sailboat,     group: "exterior" },

  estacionamiento:      { key: "estacionamiento",      label: "Estacionamiento",      icon: Car,          group: "servicios" },
  recepcion:            { key: "recepcion",            label: "Recepción",            icon: Bell,         group: "servicios" },
  grupo_electrogeno:    { key: "grupo_electrogeno",    label: "Grupo electrógeno",    icon: Zap,          group: "servicios" },

  wifi_areas_comunes:   { key: "wifi_areas_comunes",   label: "WiFi en áreas comunes",icon: Wifi,         group: "conectividad" },
  starlink:             { key: "starlink",             label: "Starlink",             icon: Antenna,      group: "conectividad" },

  juegos_para_ninos:    { key: "juegos_para_ninos",    label: "Juegos para niños",    icon: ToyBrick,     group: "familia" },
  sum:                  { key: "sum",                  label: "SUM",                  icon: PartyPopper,  group: "familia" },
  pet_friendly:         { key: "pet_friendly",         label: "Pet friendly",         icon: Dog,          group: "familia" },
};

export const AMENITY_KEYS = Object.keys(AMENITIES) as AmenityKey[];

export const AMENITY_GROUPS: Array<{
  key: Amenity["group"];
  label: string;
}> = [
  { key: "exterior",      label: "Exterior y áreas comunes" },
  { key: "servicios",     label: "Servicios del complejo" },
  { key: "conectividad",  label: "Conectividad" },
  { key: "familia",       label: "Familia" },
];

export function getAmenity(key: string): Amenity | undefined {
  return AMENITIES[key as AmenityKey];
}
