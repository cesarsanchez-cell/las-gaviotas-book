import type { AmenityKey } from "@/config/amenities";

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

export interface Destino {
  id: string;
  slug: string;
  nombre: string;
  region: string;
  pais: string;
  descripcion_corta?: string;
}

export interface Localidad {
  id: string;
  destino_id: string;
  slug: string;
  nombre: string;
}

export interface HospedajeFoto {
  id: string;
  hospedaje_id: string;
  storage_path: string;
  url: string;
  alt?: string;
  orden: number;
  es_principal: boolean;
  width?: number;
  height?: number;
}

export interface Hospedaje {
  id: string;
  slug: string;
  nombre: string;
  tipo: TipoHospedaje;
  descripcion_corta: string;
  descripcion_larga?: string;

  destino_id: string;
  localidad_id?: string;

  capacidad_min?: number;
  capacidad_max?: number;
  cantidad_unidades?: number;

  direccion: string;
  lat?: number;
  lng?: number;
  google_maps_url?: string;

  whatsapp: string;
  email?: string;
  telefono?: string;
  instagram?: string;
  website?: string;

  amenities: AmenityKey[];

  meta_title?: string;
  meta_description?: string;

  estado: EstadoHospedaje;
  validado_at?: string;
  responsable_validado: boolean;

  destacado: boolean;
  orden_listado: number;

  fotos: HospedajeFoto[];

  created_at: string;
  updated_at: string;
}

export interface HospedajeListItem {
  id: string;
  slug: string;
  nombre: string;
  tipo: TipoHospedaje;
  descripcion_corta: string;
  direccion: string;
  capacidad_max?: number;
  amenities: AmenityKey[];
  destacado: boolean;
  foto_principal_url?: string;
}
