/**
 * Tipo sugerido al usuario tras enviar la consulta: cumple capacidad pedida
 * y tiene al menos una unidad física activa libre en el rango de fechas.
 */
export interface UnidadSugerida {
  unidad_type_id: string;
  nombre: string;
  capacidad_total: number;
  capacidad_adultos: number;
  capacidad_ninos: number;
  camas_descripcion: string | null;
  amenities: string[];
  foto_storage_path: string | null;
  foto_alt: string | null;
  unidades_libres: number;
  unidades_totales: number;
}

export interface CreateConsultaResult {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  unidadesSugeridas?: UnidadSugerida[];
}
