-- -----------------------------------------------------------------------------
-- Ciudades: nivel intermedio OPCIONAL entre región y destino.
--
--   Una ciudad (ej. Villa Gesell) agrupa destinos/balnearios cercanos
--   (Las Gaviotas, Mar Azul, Mar de las Pampas). Es orientación zonal para el
--   viajero, igual que la región — no una vidriera. Aditivo y opcional:
--   `destinos.ciudad_id` es nullable, un destino sin ciudad funciona igual.
--
--   OJO: NO confundir con la tabla `localidades` (zonas DENTRO de un destino:
--   Centro/Bosque/Frente al mar). Esa es un nivel POR DEBAJO del destino.
--   Jerarquía completa: region → ciudad → destino → localidad → hospedaje.
-- -----------------------------------------------------------------------------

-- 1) Tabla `ciudades`
create table if not exists public.ciudades (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  nombre          text not null,
  region_id       uuid references public.regiones(id) on delete restrict,
  -- Código postal de referencia (informativo). Una ciudad puede tener varios;
  -- guardamos el principal. No es identificador.
  codigo_postal   text,
  activo          boolean not null default true,
  orden           int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.ciudades is
  'Nivel intermedio opcional entre región y destino. Agrupa destinos/balnearios cercanos (ej. Villa Gesell). NO es la tabla localidades (zonas dentro de un destino).';

create index if not exists ciudades_activo_orden_idx on public.ciudades (activo, orden);
create index if not exists ciudades_region_id_idx    on public.ciudades (region_id);
create index if not exists ciudades_slug_idx         on public.ciudades (slug);

drop trigger if exists trg_ciudades_updated_at on public.ciudades;
create trigger trg_ciudades_updated_at
  before update on public.ciudades
  for each row execute function set_updated_at();

-- 2) Destinos: FK opcional a ciudad
alter table public.destinos
  add column if not exists ciudad_id uuid references public.ciudades(id) on delete set null;

create index if not exists destinos_ciudad_id_idx on public.destinos (ciudad_id);

-- 3) RLS (calcado de regiones)
alter table public.ciudades enable row level security;

-- Lectura pública: cualquiera ve ciudades activas.
drop policy if exists "Ciudades: lectura pública activas" on public.ciudades;
create policy "Ciudades: lectura pública activas"
  on public.ciudades for select
  to anon, authenticated
  using (activo = true);

-- Admins ven todas (incluso inactivas) para gestionarlas.
drop policy if exists "Ciudades: admin lectura completa" on public.ciudades;
create policy "Ciudades: admin lectura completa"
  on public.ciudades for select
  to authenticated
  using (is_admin());

-- Solo Super Admin escribe (curaduría, como las regiones).
drop policy if exists "Ciudades: super admin escribe" on public.ciudades;
create policy "Ciudades: super admin escribe"
  on public.ciudades for all
  to authenticated
  using (is_super_admin())
  with check (is_super_admin());

-- 4) Verificación
select
  (select count(*) from public.ciudades) as ciudades_count,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'destinos'
       and column_name = 'ciudad_id') as destinos_ciudad_id_col;
