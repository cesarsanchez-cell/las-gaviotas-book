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
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      tipo_hospedaje: TipoHospedaje;
      estado_hospedaje: EstadoHospedaje;
    };
    CompositeTypes: Record<string, never>;
  };
};
