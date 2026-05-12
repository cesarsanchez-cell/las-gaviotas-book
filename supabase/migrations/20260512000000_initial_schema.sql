-- =============================================================================
-- Las Gaviotas BOOK — Initial schema (Etapa 1)
-- =============================================================================
-- Crea: extensiones, enums, tablas, índices, triggers y funciones helper.
-- RLS y bucket de storage van en migraciones separadas.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type tipo_hospedaje as enum (
  'hotel',
  'apart',
  'cabana',
  'hosteria',
  'camping',
  'casa',
  'departamento'
);

create type estado_hospedaje as enum (
  'borrador',
  'pendiente_validacion',
  'publicado',
  'pausado',
  'rechazado'
);

-- -----------------------------------------------------------------------------
-- Helper: trigger genérico para updated_at
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tabla: destinos (multi-tenant suave)
-- -----------------------------------------------------------------------------
create table destinos (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  nombre              text not null,
  region              text,
  provincia           text,
  pais                text default 'Argentina',
  descripcion_corta   text,
  descripcion_larga   text,
  lat                 numeric(10,7),
  lng                 numeric(10,7),
  activo              boolean default true,
  orden               int default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index idx_destinos_activos on destinos(activo) where activo = true;

create trigger trg_destinos_updated_at
  before update on destinos
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Tabla: localidades (barrios/zonas dentro de un destino)
-- -----------------------------------------------------------------------------
create table localidades (
  id            uuid primary key default gen_random_uuid(),
  destino_id    uuid not null references destinos(id) on delete cascade,
  slug          text not null,
  nombre        text not null,
  orden         int default 0,
  created_at    timestamptz default now(),
  unique (destino_id, slug)
);

create index idx_localidades_destino on localidades(destino_id);

-- -----------------------------------------------------------------------------
-- Tabla: perfiles (extensión de auth.users con rol)
-- -----------------------------------------------------------------------------
create table perfiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nombre          text,
  rol             text not null default 'responsable'
                    check (rol in ('admin', 'responsable')),
  hospedajes_ids  uuid[] default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger trg_perfiles_updated_at
  before update on perfiles
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Helper: chequeo rol admin (usado por RLS)
-- Definido después de crear `perfiles` porque language sql valida el cuerpo
-- en tiempo de creación.
-- -----------------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles where id = auth.uid() and rol = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- Tabla: hospedajes (entidad principal)
-- -----------------------------------------------------------------------------
create table hospedajes (
  id                      uuid primary key default gen_random_uuid(),
  destino_id              uuid not null references destinos(id),
  localidad_id            uuid references localidades(id) on delete set null,

  slug                    text not null,
  nombre                  text not null,
  tipo                    tipo_hospedaje not null,
  descripcion_corta       text not null,
  descripcion_larga       text,

  capacidad_min           int,
  capacidad_max           int,
  cantidad_unidades       int default 1,

  direccion               text not null,
  lat                     numeric(10,7),
  lng                     numeric(10,7),
  google_maps_url         text,

  whatsapp                text not null,
  email                   text,
  telefono                text,
  instagram               text,
  website                 text,

  amenities               text[] default '{}'::text[],

  meta_title              text,
  meta_description        text,

  estado                  estado_hospedaje not null default 'borrador',
  validado_at             timestamptz,
  validado_por            uuid references auth.users(id) on delete set null,

  responsable_nombre      text not null,
  responsable_documento   text,
  responsable_email       text,
  responsable_whatsapp    text,
  responsable_validado    boolean default false,

  destacado               boolean default false,
  orden_listado           int default 0,

  created_at              timestamptz default now(),
  updated_at              timestamptz default now(),

  unique (destino_id, slug)
);

create index idx_hospedajes_publicados
  on hospedajes(destino_id, estado)
  where estado = 'publicado';

create index idx_hospedajes_slug      on hospedajes(destino_id, slug);
create index idx_hospedajes_tipo      on hospedajes(tipo);
create index idx_hospedajes_localidad on hospedajes(localidad_id);
create index idx_hospedajes_destacado on hospedajes(destacado) where destacado = true;
create index idx_hospedajes_amenities on hospedajes using gin (amenities);

create trigger trg_hospedajes_updated_at
  before update on hospedajes
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Tabla: hospedaje_fotos (media first-class)
-- -----------------------------------------------------------------------------
create table hospedaje_fotos (
  id              uuid primary key default gen_random_uuid(),
  hospedaje_id    uuid not null references hospedajes(id) on delete cascade,
  storage_path    text not null,
  alt             text,
  orden           int default 0,
  es_principal    boolean default false,
  width           int not null,
  height          int not null,
  created_at      timestamptz default now()
);

create index idx_fotos_hospedaje_orden on hospedaje_fotos(hospedaje_id, orden);

-- Solo una foto principal por hospedaje
create unique index idx_fotos_una_principal
  on hospedaje_fotos(hospedaje_id)
  where es_principal = true;

-- -----------------------------------------------------------------------------
-- Tabla: validacion_eventos (auditoría)
-- -----------------------------------------------------------------------------
create table validacion_eventos (
  id                bigserial primary key,
  hospedaje_id      uuid not null references hospedajes(id) on delete cascade,
  estado_anterior   estado_hospedaje,
  estado_nuevo      estado_hospedaje not null,
  realizado_por     uuid references auth.users(id) on delete set null,
  notas             text,
  created_at        timestamptz default now()
);

create index idx_validacion_hospedaje on validacion_eventos(hospedaje_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Trigger: auto-log de cambios de estado de hospedaje
-- -----------------------------------------------------------------------------
create or replace function log_hospedaje_estado_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into validacion_eventos (
      hospedaje_id, estado_anterior, estado_nuevo, realizado_por
    ) values (
      new.id, null, new.estado, auth.uid()
    );
  elsif (tg_op = 'UPDATE' and old.estado is distinct from new.estado) then
    insert into validacion_eventos (
      hospedaje_id, estado_anterior, estado_nuevo, realizado_por
    ) values (
      new.id, old.estado, new.estado, auth.uid()
    );
    -- Marcar validado_at cuando pasa a publicado
    if (new.estado = 'publicado' and old.estado <> 'publicado') then
      new.validado_at = now();
      new.validado_por = auth.uid();
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_hospedajes_log_estado
  after insert on hospedajes
  for each row execute function log_hospedaje_estado_change();

create trigger trg_hospedajes_log_estado_update
  before update on hospedajes
  for each row execute function log_hospedaje_estado_change();
