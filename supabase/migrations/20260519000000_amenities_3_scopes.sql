-- =============================================================================
-- Mis Escapadas — Modelo de amenities con 3 scopes (property/unit/operational)
-- =============================================================================
-- Decisión cerrada con el operador 2026-05-18. Detalle completo en memoria
-- `project-amenities-3-scopes`.
--
-- Cambios:
--   1. unidad_types: agregar `vista` (texto libre) y `calefaccion_tipo` (enum).
--      Estos campos salen del array `amenities[]` porque tienen valores
--      excluyentes/ricos que no encajan en booleanos.
--   2. hospedajes: agregar `amenities_operational text[]` para guardar las
--      políticas/modos de operación (self_check_in, atencion_24hs, etc).
--   3. WIPE de keys viejas en `unidad_types.amenities` y `hospedajes.amenities`
--      porque los catálogos se reemplazan completamente (las keys cambian).
--      El operador prefirió wipe a migración por mapeo en pasos anteriores
--      (igual que con TRUNCATE en Etapa 1).
--
-- IMPORTANTE: este wipe NO toca perfiles, auth.users, ni el resto de tablas.
-- Solo limpia las columnas de amenities y agrega 3 columnas nuevas.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Columnas nuevas en unidad_types
-- ----------------------------------------------------------------------------

alter table unidad_types
  add column if not exists vista text;

alter table unidad_types
  add column if not exists calefaccion_tipo text;

-- CHECK constraint para calefaccion_tipo. Lo agregamos por separado para que
-- la columna pueda existir sin valor (nullable) en filas viejas.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'unidad_types_calefaccion_tipo_check'
  ) then
    alter table unidad_types
      add constraint unidad_types_calefaccion_tipo_check
      check (calefaccion_tipo is null or calefaccion_tipo in (
        'salamandra',
        'hogar_lena',
        'tiro_balanceado',
        'radiadores',
        'aire_frio_calor',
        'losa_radiante',
        'multiple',
        'ninguna'
      ));
  end if;
end $$;

comment on column unidad_types.vista is
  'Texto libre sobre la vista que tiene la unidad (ej: "Vista al mar desde balcón"). NULL = sin info.';

comment on column unidad_types.calefaccion_tipo is
  'Tipo único de calefacción. Salió del array amenities porque es enum, no flag. NULL = sin info.';

-- ----------------------------------------------------------------------------
-- 2. Columna nueva en hospedajes
-- ----------------------------------------------------------------------------

alter table hospedajes
  add column if not exists amenities_operational text[] not null default '{}';

comment on column hospedajes.amenities_operational is
  'Políticas / modos de operación del hospedaje (self_check_in, atencion_24hs, etc). A nivel hospedaje, no a nivel unidad — decisión 2026-05-18.';

-- ----------------------------------------------------------------------------
-- 3. WIPE de keys viejas en amenities[]
-- ----------------------------------------------------------------------------
-- Las keys del catálogo viejo (wifi, aire_living, cocina, etc) no aplican
-- en el catálogo nuevo. En vez de mapearlas (complicado y error-prone),
-- vaciamos las columnas. El operador va a re-tildar las amenities desde la
-- UI con el catálogo nuevo cuando esté desplegado.

update unidad_types set amenities = '{}';
update hospedajes set amenities = '{}';

-- ----------------------------------------------------------------------------
-- 4. Verificación
-- ----------------------------------------------------------------------------

select
  'unidad_types' as tabla,
  count(*) filter (where vista is not null) as con_vista,
  count(*) filter (where calefaccion_tipo is not null) as con_calefaccion,
  count(*) filter (where amenities <> '{}') as con_amenities
from unidad_types

union all

select
  'hospedajes' as tabla,
  null as con_vista,
  null as con_calefaccion,
  count(*) filter (where amenities <> '{}') as con_amenities
from hospedajes;

-- Esperado: 0 en todas las cuentas porque acabamos de wipe-ar.
-- Verificar que las columnas existen:
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('unidad_types', 'hospedajes')
  and column_name in ('vista', 'calefaccion_tipo', 'amenities_operational')
order by table_name, column_name;
