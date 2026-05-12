import type { LucideIcon } from "lucide-react";
import {
  Wifi,
  Waves,
  Car,
  Tv,
  Utensils,
  Wind,
  Snowflake,
  Flame,
  Dog,
  Baby,
  Bath,
  Coffee,
  WashingMachine,
  ParkingCircle,
  TreePine,
  Sun,
} from "lucide-react";

export type AmenityKey =
  | "wifi"
  | "playa_cerca"
  | "estacionamiento"
  | "aire_acondicionado"
  | "calefaccion"
  | "tv"
  | "cocina"
  | "parrilla"
  | "ventilador"
  | "pet_friendly"
  | "apto_ninos"
  | "banera"
  | "desayuno"
  | "lavarropas"
  | "cochera_techada"
  | "patio"
  | "deck_solarium";

export interface Amenity {
  key: AmenityKey;
  label: string;
  icon: LucideIcon;
  group: "esenciales" | "comodidad" | "familia" | "exterior";
}

export const AMENITIES: Record<AmenityKey, Amenity> = {
  wifi:                { key: "wifi",                label: "WiFi",              icon: Wifi,            group: "esenciales" },
  playa_cerca:         { key: "playa_cerca",         label: "Playa cerca",       icon: Waves,           group: "esenciales" },
  estacionamiento:     { key: "estacionamiento",     label: "Estacionamiento",   icon: Car,             group: "esenciales" },
  aire_acondicionado:  { key: "aire_acondicionado",  label: "Aire acondicionado",icon: Snowflake,       group: "comodidad"  },
  calefaccion:         { key: "calefaccion",         label: "Calefacción",       icon: Flame,           group: "comodidad"  },
  tv:                  { key: "tv",                  label: "TV",                icon: Tv,              group: "comodidad"  },
  cocina:              { key: "cocina",              label: "Cocina equipada",   icon: Utensils,        group: "comodidad"  },
  parrilla:            { key: "parrilla",            label: "Parrilla",          icon: Flame,           group: "exterior"   },
  ventilador:          { key: "ventilador",          label: "Ventilador",        icon: Wind,            group: "comodidad"  },
  pet_friendly:        { key: "pet_friendly",        label: "Pet friendly",      icon: Dog,             group: "familia"    },
  apto_ninos:          { key: "apto_ninos",          label: "Apto niños",        icon: Baby,            group: "familia"    },
  banera:              { key: "banera",              label: "Bañera",            icon: Bath,            group: "comodidad"  },
  desayuno:            { key: "desayuno",            label: "Desayuno",          icon: Coffee,          group: "comodidad"  },
  lavarropas:          { key: "lavarropas",          label: "Lavarropas",        icon: WashingMachine,  group: "comodidad"  },
  cochera_techada:     { key: "cochera_techada",     label: "Cochera techada",   icon: ParkingCircle,   group: "esenciales" },
  patio:               { key: "patio",               label: "Patio",             icon: TreePine,        group: "exterior"   },
  deck_solarium:       { key: "deck_solarium",       label: "Deck / Solarium",   icon: Sun,             group: "exterior"   },
};

export const AMENITY_KEYS = Object.keys(AMENITIES) as AmenityKey[];

export function getAmenity(key: string): Amenity | undefined {
  return AMENITIES[key as AmenityKey];
}
