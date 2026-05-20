import type { TipoHospedaje } from "@/types/database";

/**
 * Input del buscador de disponibilidad. Adultos + niños cuentan para
 * capacidad (cobran igual). Bebés son informativos (no pagan, no cuentan
 * para validar capacidad). Cerrado con el operador 2026-05-18.
 */
export interface BusquedaInput {
  destinoId: string;
  checkIn: string; // ISO YYYY-MM-DD
  checkOut: string; // ISO YYYY-MM-DD
  adultos: number;
  ninos: number;
  bebes: number;
}

/**
 * Unidad que matchea una búsqueda: cumple capacidad y tiene al menos una
 * unidad física activa libre en TODO el rango. Incluye datos del hospedaje
 * al que pertenece para poder renderizar la card sin hacer joins extra.
 *
 * Restricciones y tarifas vienen después (Etapas 6 y 7).
 */
export interface UnidadResultado {
  unidad_type_id: string;
  nombre: string;
  capacidad_total: number;
  capacidad_adultos: number;
  capacidad_ninos: number;
  camas_descripcion: string | null;
  amenities: string[];
  vista: string | null;
  calefaccion_tipo: string | null;
  fotos: Array<{
    storage_path: string;
    alt: string | null;
    es_principal: boolean;
  }>;
  unidades_libres: number;
  unidades_totales: number;
  hospedaje: {
    id: string;
    slug: string;
    nombre: string;
    tipo: TipoHospedaje;
    direccion: string;
    whatsapp: string;
  };
}
