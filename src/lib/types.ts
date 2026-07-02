export type Rubro = {
  id: string;
  slug: string;
  nombre: string;
  icono_default: string;
  descripcion?: string | null;
};

export type DatoUtil = {
  id: string;
  destino_id?: string | null;
  rubro_id: string;
  nombre: string;
  direccion?: string | null;
  contacto?: string | null;
  foto_path?: string | null;
  scope_type: 'ciudad' | 'zona' | 'destino';
  scope_id: string;
  created_at: string;
};
