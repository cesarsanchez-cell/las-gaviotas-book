import type { VerticalKey } from "./queries";

/** Estado del buscador de la home, compartido entre AirbnbTop y SearchPanel. */
export interface SearchState {
  /** Texto del lugar (nombre de destino o región). */
  donde: string;
  /** Etiqueta legible del "cuándo" (chip rápido o rango de fechas). */
  cuando: string;
  /** Tipo/categoría seleccionada (solo gastronomía / qué hacer). */
  tipo: string;
  /** Etiqueta legible de "quién" (solo hospedajes). */
  quien: string;
  pax: { adultos: number; menores: number; bebes: number };
  fechas: { in: string; out: string };
}

export const EMPTY_SEARCH: SearchState = {
  donde: "",
  cuando: "",
  tipo: "",
  quien: "",
  pax: { adultos: 2, menores: 0, bebes: 0 },
  fechas: { in: "", out: "" },
};

export const VERTICAL_TITLE: Record<VerticalKey, string> = {
  hospedajes: "Hospedajes verificados",
  gastronomia: "Mesa local",
  atractivos: "Qué hacer",
};

export const VERTICAL_NOUN: Record<VerticalKey, string> = {
  hospedajes: "hospedajes",
  gastronomia: "lugares para comer",
  atractivos: "actividades",
};
