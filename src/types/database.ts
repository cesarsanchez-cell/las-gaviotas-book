// =============================================================================
// Tipos del schema Supabase
// =============================================================================
// Reemplazar por la salida real de:
//   npx supabase gen types typescript --project-id <ID> > src/types/database.ts
// una vez conectado el proyecto. Esto es un mirror manual del SQL.
// =============================================================================

export type TipoHospedaje =
  | "hotel"
  | "apart"
  | "cabana"
  | "hosteria"
  | "camping"
  | "casa"
  | "departamento";

export type EstadoHospedaje =
  | "borrador"
  | "pendiente_validacion"
  | "publicado"
  | "pausado"
  | "rechazado";

export interface DestinoRow {
  id: string;
  slug: string;
  nombre: string;
  region: string | null;
  provincia: string | null;
  pais: string | null;
  descripcion_corta: string | null;
  descripcion_larga: string | null;
  lat: number | null;
  lng: number | null;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface LocalidadRow {
  id: string;
  destino_id: string;
  slug: string;
  nombre: string;
  orden: number;
  created_at: string;
}

export interface PerfilRow {
  id: string;
  nombre: string | null;
  rol: "admin" | "responsable";
  hospedajes_ids: string[];
  /**
   * Solo aplica a perfiles con rol=admin.
   * NULL = super admin (toda la red).
   * UUID = admin de ese destino, valida solo hospedajes de ese destino.
   * Ignorado para rol=responsable.
   */
  destino_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HospedajeRow {
  id: string;
  destino_id: string;
  localidad_id: string | null;
  slug: string;
  nombre: string;
  tipo: TipoHospedaje;
  descripcion_corta: string;
  descripcion_larga: string | null;
  capacidad_min: number | null;
  capacidad_max: number | null;
  cantidad_unidades: number | null;
  direccion: string;
  lat: number | null;
  lng: number | null;
  google_maps_url: string | null;
  whatsapp: string;
  email: string | null;
  telefono: string | null;
  instagram: string | null;
  website: string | null;
  amenities: string[];
  meta_title: string | null;
  meta_description: string | null;
  estado: EstadoHospedaje;
  validado_at: string | null;
  validado_por: string | null;
  responsable_nombre: string;
  responsable_documento: string | null;
  responsable_email: string | null;
  responsable_whatsapp: string | null;
  responsable_validado: boolean;
  destacado: boolean;
  orden_listado: number;
  created_at: string;
  updated_at: string;
}

export interface HospedajeFotoRow {
  id: string;
  hospedaje_id: string;
  storage_path: string;
  alt: string | null;
  orden: number;
  es_principal: boolean;
  width: number;
  height: number;
  created_at: string;
}

export interface ValidacionEventoRow {
  id: number;
  hospedaje_id: string;
  estado_anterior: EstadoHospedaje | null;
  estado_nuevo: EstadoHospedaje;
  realizado_por: string | null;
  notas: string | null;
  created_at: string;
}

export type TipoDisponibilidad = "manual" | "reserva";

export interface DisponibilidadRow {
  id: string;
  unidad_id: string;
  /** Denormalizado para queries rápidas y RLS — coincide con unidades.hospedaje_id. */
  hospedaje_id: string;
  /** Fecha ISO YYYY-MM-DD. Si existe la fila → fecha bloqueada. */
  fecha: string;
  tipo: TipoDisponibilidad;
  /** Apunta a reserva (Etapa 4) cuando tipo='reserva'. NULL para manual. */
  reserva_id: string | null;
  notas: string | null;
  created_by: string | null;
  created_at: string;
}

// =============================================================================
// Arquitectura de Unidades (Etapa 1 Foundation — refactor 2026-05-18)
// =============================================================================

export interface UnidadTypeRow {
  id: string;
  hospedaje_id: string;
  nombre: string;
  descripcion: string | null;
  capacidad_adultos: number;
  capacidad_ninos: number;
  camas_descripcion: string | null;
  amenities: string[];
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface UnidadTypeFotoRow {
  id: string;
  unidad_type_id: string;
  storage_path: string;
  alt: string | null;
  orden: number;
  es_principal: boolean;
  width: number;
  height: number;
  created_at: string;
}

export interface UnidadRow {
  id: string;
  unidad_type_id: string;
  /** Denormalizado — coincide con unidad_types.hospedaje_id, enforced por trigger. */
  hospedaje_id: string;
  nombre: string;
  activa: boolean;
  notas_internas: string | null;
  orden: number;
  created_at: string;
  updated_at: string;
}

export type Moneda = "ARS" | "USD";

export interface TarifaRow {
  id: string;
  unidad_type_id: string;
  hospedaje_id: string;
  nombre: string;
  /** Fecha ISO YYYY-MM-DD. */
  desde: string;
  /** Fecha ISO YYYY-MM-DD. */
  hasta: string;
  /** Precio por noche de la unidad ENTERA (no por pax). */
  precio_noche: number;
  moneda: Moneda;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface RestriccionRow {
  id: string;
  unidad_type_id: string;
  hospedaje_id: string;
  nombre: string;
  /** Fecha ISO YYYY-MM-DD. */
  desde: string;
  /** Fecha ISO YYYY-MM-DD. */
  hasta: string;
  /** Mínimo de noches. NULL = sin mínimo. */
  estadia_minima_noches: number | null;
  /** ISO weekday (1=lunes, 7=domingo). NULL = cualquier día. */
  dia_ingreso: number | null;
  /** ISO weekday (1=lunes, 7=domingo). NULL = cualquier día. */
  dia_egreso: number | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export type EstadoConsulta = "nueva" | "leida" | "respondida" | "descartada";

export interface ConsultaRow {
  id: string;
  hospedaje_id: string;
  nombre: string;
  email: string;
  whatsapp: string | null;
  mensaje: string;
  /** Fecha ISO (YYYY-MM-DD). */
  check_in: string;
  /** Fecha ISO (YYYY-MM-DD). */
  check_out: string;
  cantidad_huespedes: number;
  consentimiento_datos: boolean;
  estado: EstadoConsulta;
  origen: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

type Insert<T extends { id: string }> = Omit<T, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
type Update<T> = Partial<T>;

export type Database = {
  public: {
    Tables: {
      destinos: {
        Row: DestinoRow;
        Insert: Insert<DestinoRow>;
        Update: Update<DestinoRow>;
        Relationships: [];
      };
      localidades: {
        Row: LocalidadRow;
        Insert: Insert<LocalidadRow>;
        Update: Update<LocalidadRow>;
        Relationships: [];
      };
      perfiles: {
        Row: PerfilRow;
        Insert: Insert<PerfilRow>;
        Update: Update<PerfilRow>;
        Relationships: [];
      };
      hospedajes: {
        Row: HospedajeRow;
        Insert: Insert<HospedajeRow>;
        Update: Update<HospedajeRow>;
        Relationships: [];
      };
      hospedaje_fotos: {
        Row: HospedajeFotoRow;
        Insert: Insert<HospedajeFotoRow>;
        Update: Update<HospedajeFotoRow>;
        Relationships: [];
      };
      validacion_eventos: {
        Row: ValidacionEventoRow;
        Insert: Omit<ValidacionEventoRow, "id" | "created_at">;
        Update: Update<ValidacionEventoRow>;
        Relationships: [];
      };
      consultas: {
        Row: ConsultaRow;
        Insert: Insert<ConsultaRow>;
        Update: Update<ConsultaRow>;
        Relationships: [];
      };
      disponibilidad: {
        Row: DisponibilidadRow;
        Insert: Omit<DisponibilidadRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Update<DisponibilidadRow>;
        Relationships: [];
      };
      unidad_types: {
        Row: UnidadTypeRow;
        Insert: Insert<UnidadTypeRow>;
        Update: Update<UnidadTypeRow>;
        Relationships: [];
      };
      unidad_type_fotos: {
        Row: UnidadTypeFotoRow;
        Insert: Omit<UnidadTypeFotoRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Update<UnidadTypeFotoRow>;
        Relationships: [];
      };
      unidades: {
        Row: UnidadRow;
        Insert: Insert<UnidadRow>;
        Update: Update<UnidadRow>;
        Relationships: [];
      };
      tarifas: {
        Row: TarifaRow;
        Insert: Insert<TarifaRow>;
        Update: Update<TarifaRow>;
        Relationships: [];
      };
      restricciones: {
        Row: RestriccionRow;
        Insert: Insert<RestriccionRow>;
        Update: Update<RestriccionRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      tipo_hospedaje: TipoHospedaje;
      estado_hospedaje: EstadoHospedaje;
      estado_consulta: EstadoConsulta;
      tipo_disponibilidad: TipoDisponibilidad;
      moneda: Moneda;
    };
    CompositeTypes: Record<string, never>;
  };
};
