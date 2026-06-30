-- =============================================================================
-- Integridad Geográfica — 2026-06-30
-- =============================================================================
-- Decisiones:
-- 1. Destinos: ciudad_id obligatorio (NOT NULL)
-- 2. Zonas: agregar region_id (NOT NULL), mantener ciudad_id para referencia
-- 3. Validación: filtro de destinos en UI zonas por región
--
-- Modelo resultante:
--   región → ciudad → destino (obligatorio)
--            ↓
--           zona (región obligatoria, ciudad opcional)
--            ↓
--       zona_destinos (M2M)
-- =============================================================================

-- 1) Destinos: hacer ciudad_id obligatorio
-- ----------
-- Primero, si hay destinos sin ciudad, asignarles una ciudad por defecto
-- (la primera que exista). En un caso real, revisar y asignar manualmente.

update public.destinos
  set ciudad_id = (
    select id from public.ciudades
     order by created_at asc
     limit 1
  )
 where ciudad_id is null;

-- Ahora hacer la columna NOT NULL
alter table public.destinos
  alter column ciudad_id set not null;

comment on column public.destinos.ciudad_id is
  'Ciudad a la que pertenece el destino (obligatorio). Nivel intermedio entre región y destino.';

-- 2) Zonas: agregar region_id (obligatorio)
-- ----------
-- region_id debe ser NOT NULL porque una zona siempre pertenece a una región.
-- ciudad_id sigue siendo nullable: es referencia visual/principal, pero la zona
-- puede tener destinos de varias ciudades dentro de la misma región.

alter table public.zonas
  add column if not exists region_id uuid references public.regiones(id) on delete restrict;

comment on column public.zonas.region_id is
  'Región a la que pertenece la zona (obligatorio). Una zona siempre está en UNA región, pero puede tener destinos de múltiples ciudades de esa región.';

-- Backfill: asignar region_id via ciudad_id
-- Si una zona tiene ciudad_id, traer su region_id; si no, usar la región de sus destinos.
-- Prioridad: ciudad_id > destinos (M2M).

update public.zonas z
  set region_id = coalesce(
    -- Opción 1: ciudad_id → ciudades.region_id
    (select c.region_id from public.ciudades c where c.id = z.ciudad_id),
    -- Opción 2: destinos de la zona
    (select c.region_id
       from public.zona_destinos zd
       join public.destinos d on d.id = zd.destino_id
       join public.ciudades c on c.id = d.ciudad_id
      where zd.zona_id = z.id
      limit 1)
  );

-- Verificar que no hay NULLs antes de hacer NOT NULL
-- (Si quedan NULLs, hay un problema de datos que requiere inspección manual)
select 'Zonas sin region_id (debería ser 0):' as check_result, count(*)
  from public.zonas
 where region_id is null;

-- Hacer region_id obligatorio
alter table public.zonas
  alter column region_id set not null;

-- Crear índice para búsquedas frecuentes (zonas por región)
create index if not exists zonas_region_id_idx on public.zonas (region_id);

-- 3) Verificación final
-- ----------
select
  (select count(*) from public.destinos where ciudad_id is null) as destinos_sin_ciudad,
  (select count(*) from public.zonas where region_id is null) as zonas_sin_region,
  (select count(*) from public.ciudades) as total_ciudades,
  (select count(*) from public.regiones) as total_regiones,
  (select count(*) from public.zonas) as total_zonas;
