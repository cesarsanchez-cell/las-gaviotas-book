import type { LucideIcon } from "lucide-react";
import {
  Utensils,
  Flame,
  Pizza,
  Coffee,
  Beer,
  IceCream,
  Croissant,
  Sandwich,
  Soup,
  Wine,
  Waves,
  Trees,
  Mountain,
  Camera,
  Landmark,
  ShoppingBag,
  Music,
  Bike,
  Sparkles,
  Building,
  MapPin,
} from "lucide-react";

// =============================================================================
// Categorías de Gastronomía
// =============================================================================
// Conservador a propósito. Si aparece una categoría nueva (ej: vegano), se
// suma sin migración SQL (es text libre en BD, validamos en aplicación).

export type CategoriaGastronomico =
  | "restaurant"
  | "parrilla"
  | "pizzeria"
  | "cafe"
  | "bar"
  | "cerveceria"
  | "heladeria"
  | "panaderia"
  | "rotiseria"
  | "comida_rapida"
  | "wine_bar";

export interface CategoriaGastroDef {
  key: CategoriaGastronomico;
  label: string;
  icon: LucideIcon;
}

export const CATEGORIAS_GASTRONOMICO: Record<
  CategoriaGastronomico,
  CategoriaGastroDef
> = {
  restaurant:     { key: "restaurant",     label: "Restaurant",     icon: Utensils    },
  parrilla:       { key: "parrilla",       label: "Parrilla",       icon: Flame       },
  pizzeria:       { key: "pizzeria",       label: "Pizzería",       icon: Pizza       },
  cafe:           { key: "cafe",           label: "Café",           icon: Coffee      },
  bar:            { key: "bar",            label: "Bar",            icon: Beer        },
  cerveceria:     { key: "cerveceria",     label: "Cervecería",     icon: Beer        },
  heladeria:      { key: "heladeria",      label: "Heladería",      icon: IceCream    },
  panaderia:      { key: "panaderia",      label: "Panadería",      icon: Croissant   },
  rotiseria:      { key: "rotiseria",      label: "Rotisería",      icon: Soup        },
  comida_rapida:  { key: "comida_rapida",  label: "Comida rápida",  icon: Sandwich    },
  wine_bar:       { key: "wine_bar",       label: "Wine bar",       icon: Wine        },
};

export const CATEGORIAS_GASTRONOMICO_KEYS = Object.keys(
  CATEGORIAS_GASTRONOMICO
) as CategoriaGastronomico[];

// =============================================================================
// Categorías de Atractivos
// =============================================================================
// Cerradas con el operador 2026-05-19. Naturaleza es paraguas; las específicas
// (playas, bosques, etc.) son más SEO-friendly y permiten filtros directos.

export type CategoriaAtractivo =
  | "playas"
  | "bosques"
  | "mirador"
  | "sendero"
  | "naturaleza"
  | "cultural"
  | "urbano"
  | "deportivo"
  | "centros_comerciales"
  | "espectaculos_a_la_gorra"
  | "gastronomico_callejero";

export interface CategoriaAtractivoDef {
  key: CategoriaAtractivo;
  label: string;
  icon: LucideIcon;
}

export const CATEGORIAS_ATRACTIVO: Record<
  CategoriaAtractivo,
  CategoriaAtractivoDef
> = {
  playas:                   { key: "playas",                   label: "Playas",                   icon: Waves      },
  bosques:                  { key: "bosques",                  label: "Bosques",                  icon: Trees      },
  mirador:                  { key: "mirador",                  label: "Miradores",                icon: Camera     },
  sendero:                  { key: "sendero",                  label: "Senderos",                 icon: Bike       },
  naturaleza:               { key: "naturaleza",               label: "Naturaleza",               icon: Mountain   },
  cultural:                 { key: "cultural",                 label: "Cultural",                 icon: Landmark   },
  urbano:                   { key: "urbano",                   label: "Urbano",                   icon: Building   },
  deportivo:                { key: "deportivo",                label: "Deportivo",                icon: Sparkles   },
  centros_comerciales:      { key: "centros_comerciales",      label: "Centros comerciales",      icon: ShoppingBag},
  espectaculos_a_la_gorra:  { key: "espectaculos_a_la_gorra",  label: "Espectáculos a la gorra",  icon: Music      },
  gastronomico_callejero:   { key: "gastronomico_callejero",   label: "Gastronomía callejera",    icon: MapPin     },
};

export const CATEGORIAS_ATRACTIVO_KEYS = Object.keys(
  CATEGORIAS_ATRACTIVO
) as CategoriaAtractivo[];

// =============================================================================
// Helpers
// =============================================================================

export function isCategoriaGastronomico(
  key: string
): key is CategoriaGastronomico {
  return key in CATEGORIAS_GASTRONOMICO;
}

export function isCategoriaAtractivo(key: string): key is CategoriaAtractivo {
  return key in CATEGORIAS_ATRACTIVO;
}

export function getCategoriaLabel(
  tipo: "gastronomico" | "atractivo",
  key: string
): string | null {
  if (tipo === "gastronomico") {
    return CATEGORIAS_GASTRONOMICO[key as CategoriaGastronomico]?.label ?? null;
  }
  return CATEGORIAS_ATRACTIVO[key as CategoriaAtractivo]?.label ?? null;
}
