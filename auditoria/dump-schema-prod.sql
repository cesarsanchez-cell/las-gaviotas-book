-- =============================================================================
-- DUMP DE ESQUEMA — Supabase PRODUCCIÓN (Etapa 2, Frente B: drift estructural)
--
-- Complementa a `dump-rls-prod.sql` (que cubre RLS/policies/grants/funciones).
-- Este se enfoca en la ESTRUCTURA: columnas, tipos, defaults, nullabilidad,
-- constraints (PK/FK/UNIQUE/CHECK), enums, índices y triggers.
--
-- TODO es READ-ONLY. Corré cada bloque en el SQL Editor del proyecto de
-- PRODUCCIÓN y pasá los resultados. El objetivo es comparar lo que vive en prod
-- contra las 26 migraciones del repo y detectar DRIFT (columnas agregadas a mano,
-- defaults cambiados, constraints faltantes, enums divergentes, etc.).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) Inventario de tablas en `public`
--    Comparar la lista contra las tablas que las migraciones crean.
--    Red flag: tabla que no aparece en ninguna migración (creada a mano).
-- -----------------------------------------------------------------------------
select c.relname as tabla,
       c.relkind  as tipo   -- r=tabla, v=vista, m=vista materializada
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relkind in ('r', 'v', 'm')
order by c.relkind, c.relname;


-- -----------------------------------------------------------------------------
-- 2) Todas las columnas de public (tipo, nullabilidad, default)
--    Es el bloque central del cotejo de drift. El auditor lo compara columna
--    por columna contra el CREATE/ALTER TABLE de las migraciones.
--    Red flags: columna nullable que las reglas asumen NOT NULL; default
--    distinto al de la migración; columna extra no versionada.
-- -----------------------------------------------------------------------------
select
  table_name,
  ordinal_position             as pos,
  column_name,
  data_type,
  udt_name,                    -- tipo real (p. ej. el nombre del enum)
  is_nullable,
  column_default,
  character_maximum_length     as max_len
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;


-- -----------------------------------------------------------------------------
-- 3) Tipos ENUM y sus valores (en orden)
--    estado de hospedajes/lugares/consultas/promos/combos, roles, scopes de
--    amenities, etc. Red flag: valor presente en prod que el código no maneja
--    (o que el código usa y falta en prod) → drift de dominio.
-- -----------------------------------------------------------------------------
select
  t.typname                                              as enum,
  string_agg(e.enumlabel, ', ' order by e.enumsortorder) as valores
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typnamespace = 'public'::regnamespace
group by t.typname
order by t.typname;


-- -----------------------------------------------------------------------------
-- 4) Constraints PK / UNIQUE / CHECK por tabla
--    Red flags: falta una UNIQUE que el código asume (p. ej. slug por destino);
--    un CHECK de estado/fechas presente en la migración pero ausente en prod.
-- -----------------------------------------------------------------------------
select
  con.conrelid::regclass::text                 as tabla,
  con.conname                                  as constraint_name,
  case con.contype
    when 'p' then 'PRIMARY KEY'
    when 'u' then 'UNIQUE'
    when 'c' then 'CHECK'
    when 'x' then 'EXCLUDE'
  end                                          as tipo,
  pg_get_constraintdef(con.oid)                as definicion
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
where rel.relnamespace = 'public'::regnamespace
  and con.contype in ('p', 'u', 'c', 'x')
order by tabla, tipo, constraint_name;


-- -----------------------------------------------------------------------------
-- 5) Foreign keys (con ON DELETE / ON UPDATE)
--    Integridad referencial y comportamiento de borrado en cascada.
--    Red flags: FK que el modelo multi-tenant necesita y falta; un ON DELETE
--    CASCADE inesperado (o un RESTRICT donde se esperaba CASCADE, p. ej. fotos
--    al borrar la entidad padre).
-- -----------------------------------------------------------------------------
select
  con.conrelid::regclass::text   as tabla,
  con.conname                    as fk_name,
  pg_get_constraintdef(con.oid)  as definicion
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
where rel.relnamespace = 'public'::regnamespace
  and con.contype = 'f'
order by tabla, fk_name;


-- -----------------------------------------------------------------------------
-- 6) Índices por tabla
--    Performance + soporte de las UNIQUE. Red flag: falta índice en columnas FK
--    muy consultadas (destino_id, hospedaje_id, lugar_id) → no es seguridad pero
--    sí drift/rendimiento; también detecta índices únicos creados a mano.
-- -----------------------------------------------------------------------------
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;


-- -----------------------------------------------------------------------------
-- 7) Triggers en tablas public
--    updated_at, sincronización de perfiles, etc. Red flag: trigger en prod que
--    no está en ninguna migración (lógica oculta) o uno esperado que falta.
-- -----------------------------------------------------------------------------
select
  event_object_table             as tabla,
  trigger_name,
  action_timing                  as cuando,   -- BEFORE / AFTER
  event_manipulation             as evento,   -- INSERT / UPDATE / DELETE
  action_statement               as accion
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name, event_manipulation;


-- -----------------------------------------------------------------------------
-- 8) Columnas NOT NULL sin default (alta de filas exige el valor)
--    Útil para cruzar con los INSERT de las server actions: si una action no
--    setea una de estas columnas, el insert revienta en runtime.
-- -----------------------------------------------------------------------------
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and is_nullable = 'NO'
  and column_default is null
order by table_name, ordinal_position;


-- -----------------------------------------------------------------------------
-- 9) Conteo de filas por tabla (aproximado, vía estadísticas del planner)
--    Da contexto de volumen (no es exacto). Sirve para saber qué tablas tienen
--    datos reales antes de cualquier prueba con cuentas.
-- -----------------------------------------------------------------------------
select
  c.relname            as tabla,
  c.reltuples::bigint  as filas_estimadas
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
order by c.reltuples desc, c.relname;


-- -----------------------------------------------------------------------------
-- 10) Migraciones registradas en prod (si Supabase lleva el historial)
--     Compara la lista contra los 26 archivos del repo. Si esta tabla no existe
--     o está vacía, el drift se evalúa solo por estructura (bloques 1-9).
-- -----------------------------------------------------------------------------
select version, name
from supabase_migrations.schema_migrations
order by version;
