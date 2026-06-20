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
  /** Región natural/textual (label libre, ej. "Partido de la Costa"). */
  region: string | null;
  /** FK opcional a la tabla `regiones` (agrupamiento geográfico-cultural curado). */
  region_id: string | null;
  ciudad_id: string | null;
  provincia: string | null;
  pais: string | null;
  descripcion_corta: string | null;
  descripcion_larga: string | null;
  lat: number | null;
  lng: number | null;
  /** Storage path (bucket `destinos`) de la foto del destino subida por Super Admin. Si es null, las cards caen al gradient pintado con los biomas heredados de la región. */
  foto_path: string | null;
  activo: boolean;
  /** Feature-flag opt-in: si true, las restricciones de unidad (estadía mínima, día fijo de ingreso/egreso) se aplican en la búsqueda y se muestran en la ficha pública. Nace en false. */
  restricciones_habilitadas: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

/** Biomas dominantes de una región o destino. */
export type Bioma =
  | "playa"
  | "bosque"
  | "montana"
  | "sierra"
  | "lago"
  | "desierto";

/**
 * Región: agrupamiento geográfico-cultural de destinos curado por el Super
 * Admin. Es el primer nivel que ve el viajero en el hub paraguas cuando la
 * red escala a cientos/miles de destinos.
 */
export interface RegionRow {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  biomas: Bioma[];
  pais: string;
  activo: boolean;
  destacado: boolean;
  orden: number;
  foto_path: string | null;
  created_at: string;
  updated_at: string;
}

/** Comercio al que apunta una promo (FK polimórfica, sin constraint en BD). */
export type ComercioTipo = "hospedaje" | "gastronomico" | "atractivo";

export interface PromoRow {
  id: string;
  destino_id: string;
  comercio_tipo: ComercioTipo;
  comercio_id: string;
  titulo: string;
  bajada: string | null;
  beneficio: string;
  /** Descuento porcentual opcional (1-100). */
  pct: number | null;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export type EstadoCombo =
  | "borrador"
  | "pendiente_validacion"
  | "publicado"
  | "pausado"
  | "rechazado";

/** Sinergia: paquete curado que cruza 2-3 comercios de un destino. */
export interface ComboRow {
  id: string;
  destino_id: string;
  slug: string;
  titulo: string;
  bajada: string | null;
  noches: number;
  precio_desde: number | null;
  ahorro_pct: number | null;
  /** Beneficios cruzados (lista de textos). */
  beneficios: string[];
  validez: string | null;
  estado: EstadoCombo;
  /** Perfil (responsable o admin) que armó el combo. */
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComboItemRow {
  id: string;
  combo_id: string;
  comercio_tipo: ComercioTipo;
  comercio_id: string;
  beneficio: string;
  orden: number;
}

export interface LocalidadRow {
  id: string;
  destino_id: string;
  slug: string;
  nombre: string;
  orden: number;
  created_at: string;
}

/**
 * Ciudad: nivel intermedio opcional entre región y destino (ej. Villa Gesell
 * agrupa Las Gaviotas, Mar Azul, Mar de las Pampas). NO confundir con
 * LocalidadRow (zonas DENTRO de un destino).
 */
export interface CiudadRow {
  id: string;
  slug: string;
  nombre: string;
  region_id: string | null;
  codigo_postal: string | null;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

/** Zona: conglomerado nombrado de destinos dentro de una ciudad (M2M vía zona_destinos). */
export interface ZonaRow {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  ciudad_id: string | null;
  /** Admin (local) que cura las atracciones de la zona. NULL = solo super admin. */
  curador_id: string | null;
  foto_path: string | null;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

/** Atracción curada (no comercial). Cuelga de una zona; ancla y vigencia opcionales. */
export interface AtraccionRow {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  zona_id: string;
  destino_ancla_id: string | null;
  ubicacion_texto: string | null;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  foto_path: string | null;
  publicada: boolean;
  destacada: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
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
  /** Políticas / modos a nivel hospedaje (self_check_in, atencion_24hs, etc). */
  amenities_operational: string[];
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
  /** Texto libre. Ej: "Vista al mar desde balcón". NULL = sin info. */
  vista: string | null;
  /** Enum con CHECK constraint en BD. NULL = sin info. */
  calefaccion_tipo: string | null;
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

// =============================================================================
// Verticales: lugares (gastronomía + atractivos) — migración 2026-05-20
// =============================================================================

export type TipoLugar = "gastronomico" | "atractivo";

export type EstadoLugar =
  | "borrador"
  | "pendiente_validacion"
  | "publicado"
  | "pausado"
  | "rechazado";

/**
 * Mapa libre de horarios por día de la semana. Solo aplica a tipo=gastronomico.
 * Clave = código corto del día (lun/mar/mie/jue/vie/sab/dom). Valor = string
 * de rangos o null para cerrado. Ej: { "lun": "12:00-15:00, 20:00-00:00" }.
 */
export interface HorariosLugar {
  lun?: string | null;
  mar?: string | null;
  mie?: string | null;
  jue?: string | null;
  vie?: string | null;
  sab?: string | null;
  dom?: string | null;
}

export interface LugarRow {
  id: string;
  destino_id: string;
  localidad_id: string | null;
  tipo: TipoLugar;
  slug: string;
  nombre: string;
  descripcion_corta: string;
  descripcion_larga: string | null;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  google_maps_url: string | null;
  whatsapp: string | null;
  telefono: string | null;
  email: string | null;
  instagram: string | null;
  website: string | null;
  /** Taxonomía libre. Set válido depende de `tipo` (validado en aplicación). */
  categoria: string;
  /** Solo aplica a tipo=gastronomico. NULL si no se cargaron. */
  horarios: HorariosLugar | null;
  imperdible: boolean;
  destacado: boolean;
  estado: EstadoLugar;
  validado_at: string | null;
  validado_por: string | null;
  meta_title: string | null;
  meta_description: string | null;
  orden_listado: number;
  created_at: string;
  updated_at: string;
}

export interface LugarFotoRow {
  id: string;
  lugar_id: string;
  storage_path: string;
  alt: string | null;
  orden: number;
  es_principal: boolean;
  width: number;
  height: number;
  created_at: string;
}

/**
 * Many-to-many entre perfiles (rol=responsable) y entidades que gestionan.
 * Reemplaza el viejo `perfiles.hospedajes_ids[]` y permite responsables de
 * cualquier vertical sin tocar el schema.
 */
export interface ResponsabilidadRow {
  id: string;
  perfil_id: string;
  entidad_tipo: "hospedaje" | "lugar";
  entidad_id: string;
  created_at: string;
}

// =============================================================================

export type EstadoConsulta = "nueva" | "leida" | "respondida" | "descartada";

export type CanalPreferido = "mail" | "whatsapp";

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
  /** Tipo de unidad consultada. NULL para consultas genéricas al hospedaje. */
  unidad_type_id: string | null;
  /** Canal preferido elegido por el usuario. NULL si vino del form genérico. */
  canal_preferido: CanalPreferido | null;
  /** Desglose de pax (suma ≈ cantidad_huespedes legacy). NULL para consultas viejas. */
  adultos: number | null;
  ninos: number | null;
  bebes: number | null;
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
      ciudades: {
        Row: CiudadRow;
        Insert: Insert<CiudadRow>;
        Update: Update<CiudadRow>;
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
      lugares: {
        Row: LugarRow;
        Insert: Insert<LugarRow>;
        Update: Update<LugarRow>;
        Relationships: [];
      };
      lugar_fotos: {
        Row: LugarFotoRow;
        Insert: Omit<LugarFotoRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Update<LugarFotoRow>;
        Relationships: [];
      };
      responsabilidades: {
        Row: ResponsabilidadRow;
        Insert: Omit<ResponsabilidadRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Update<ResponsabilidadRow>;
        Relationships: [];
      };
      promos: {
        Row: PromoRow;
        Insert: Insert<PromoRow>;
        Update: Update<PromoRow>;
        Relationships: [];
      };
      combos: {
        Row: ComboRow;
        Insert: Insert<ComboRow>;
        Update: Update<ComboRow>;
        Relationships: [];
      };
      combo_items: {
        Row: ComboItemRow;
        Insert: Insert<ComboItemRow>;
        Update: Update<ComboItemRow>;
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
      tipo_lugar: TipoLugar;
      estado_lugar: EstadoLugar;
    };
    CompositeTypes: Record<string, never>;
  };
};
