-- =============================================================================
-- Mis Escapadas — Entity Region (agrupamiento geográfico-cultural)
-- =============================================================================
-- Contexto:
--   La red MisEscapadas se proyecta a cientos/miles de destinos. Una grilla
--   plana de destinos en la home no escala. Introducimos un nivel intermedio
--   curado por el Super Admin: la Región (ej: "Costa Atlántica Bonaerense",
--   "Sierras de Córdoba"). Cada destino pertenece a una región opcional.
--
--   Esta migración:
--     1. Crea tabla `regiones` + trigger updated_at + índices.
--     2. Agrega `region_id` a destinos como FK opcional.
--     3. Habilita RLS pública sobre regiones activas + admin-only sobre write.
--     4. Seedea las 8 regiones canónicas del handoff (curadas por el Super Admin).
--     5. Backfill: vincula los destinos del eje pinar-playa (Las Gaviotas,
--        Mar Azul, Mar de las Pampas, Colonia Marina) a "costa-atlantica-bonaerense".
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tabla `regiones`
-- -----------------------------------------------------------------------------

create table if not exists public.regiones (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  nombre          text not null,
  descripcion     text,
  -- Biomas dominantes ordenados. Primer elemento = bioma principal (gradient
  -- color de la card). Validación de valores en la app, no en CHECK SQL.
  biomas          text[] not null default '{}',
  pais            text not null default 'Argentina',
  activo          boolean not null default true,
  destacado       boolean not null default false,
  orden           int not null default 0,
  foto_path       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.regiones is
  'Agrupamiento geográfico-cultural de destinos curado por el Super Admin. Es el primer nivel que ve el viajero en el hub paraguas.';

create index if not exists regiones_activo_orden_idx on public.regiones (activo, orden);
create index if not exists regiones_slug_idx         on public.regiones (slug);

-- Reutilizamos set_updated_at() existente (definido en migración inicial).
drop trigger if exists trg_regiones_updated_at on public.regiones;
create trigger trg_regiones_updated_at
  before update on public.regiones
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- 2) Destinos: FK opcional a region
-- -----------------------------------------------------------------------------

alter table public.destinos
  add column if not exists region_id uuid references public.regiones(id) on delete restrict;

create index if not exists destinos_region_id_idx on public.destinos (region_id);

-- -----------------------------------------------------------------------------
-- 3) RLS
-- -----------------------------------------------------------------------------

alter table public.regiones enable row level security;

-- Lectura pública: cualquiera (anon o autenticado) ve regiones activas.
drop policy if exists "Regiones: lectura pública activas" on public.regiones;
create policy "Regiones: lectura pública activas"
  on public.regiones for select
  to anon, authenticated
  using (activo = true);

-- Admins ven todas (incluso inactivas) para gestionarlas.
drop policy if exists "Regiones: admin lectura completa" on public.regiones;
create policy "Regiones: admin lectura completa"
  on public.regiones for select
  to authenticated
  using (is_admin());

-- Solo Super Admin escribe. Las regiones son curaduría nacional, no del scope
-- de un admin local de un destino específico.
drop policy if exists "Regiones: super admin escribe" on public.regiones;
create policy "Regiones: super admin escribe"
  on public.regiones for all
  to authenticated
  using (is_super_admin())
  with check (is_super_admin());

-- -----------------------------------------------------------------------------
-- 4) Seed: 8 regiones canónicas
-- -----------------------------------------------------------------------------

insert into public.regiones (slug, nombre, descripcion, biomas, orden) values
  ('costa-atlantica-bonaerense', 'Costa Atlántica Bonaerense',
   'Pinares al borde del Atlántico. Pueblos chicos, mar abierto, brasas y bici.',
   array['playa','bosque'], 1),
  ('sierras-de-cordoba', 'Sierras de Córdoba',
   'Pueblos serranos, ríos de montaña, aire seco y noches frescas.',
   array['sierra','bosque'], 2),
  ('patagonia-lacustre', 'Patagonia Lacustre',
   'Lagos profundos, bosques andinos, cerros con nieve y truchas.',
   array['lago','montana'], 3),
  ('cuyo-vitivinicola', 'Cuyo Vitivinícola',
   'Bodegas, oasis al pie de la cordillera y rutas de altura.',
   array['montana','desierto'], 4),
  ('norte-andino', 'Norte Andino',
   'Quebradas con color, pueblos de altura y vino de las nubes.',
   array['montana','desierto'], 5),
  ('termas-argentinas', 'Termas',
   'Aguas que curan en Federación, Río Hondo, Reyes y más.',
   array['sierra'], 6),
  ('litoral-iguazu', 'Litoral e Iguazú',
   'Ríos enormes, esteros, selva y la frontera tropical.',
   array['bosque','lago'], 7),
  ('patagonia-atlantica', 'Patagonia Atlántica',
   'Acantilados, fauna marina y los glaciares del sur.',
   array['playa','montana'], 8)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- 5) Backfill: destinos del eje pinar-playa → Costa Atlántica Bonaerense
-- -----------------------------------------------------------------------------

update public.destinos d
   set region_id = r.id
  from public.regiones r
 where r.slug = 'costa-atlantica-bonaerense'
   and d.slug in ('las-gaviotas', 'mar-azul', 'mar-de-las-pampas', 'colonia-marina')
   and d.region_id is null;

-- -----------------------------------------------------------------------------
-- 6) Verificación
-- -----------------------------------------------------------------------------

select
  (select count(*) from public.regiones)                       as regiones_count,
  (select count(*) from public.destinos where region_id is null) as destinos_sin_region,
  (select count(*) from public.destinos where region_id is not null) as destinos_con_region;
