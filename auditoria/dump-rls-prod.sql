-- =============================================================================
-- DUMP DE INSPECCIÓN DE SEGURIDAD — Supabase PRODUCCIÓN
--
-- Para el auditor externo (artefacto §4.1 del brief). TODO es READ-ONLY: no
-- modifica nada. Corré cada bloque en el SQL Editor del proyecto de PRODUCCIÓN
-- y pasale los resultados al auditor.
--
-- Objetivo: que el auditor pueda detectar DRIFT entre las migraciones del repo
-- y lo que realmente vive en prod, y verificar que no hay tablas sensibles
-- expuestas ni funciones de privilegio mal configuradas.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) RLS habilitada/forzada por tabla (public)
--    Red flag: relrowsecurity=false en una tabla con datos privados
--    (consultas, perfiles, responsabilidades, hospedajes, lugares, etc.).
-- -----------------------------------------------------------------------------
select
  c.relname               as tabla,
  c.relrowsecurity        as rls_habilitada,
  c.relforcerowsecurity   as rls_forzada
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
order by c.relrowsecurity asc, c.relname;


-- -----------------------------------------------------------------------------
-- 2) Tablas public SIN RLS (debería estar VACÍO salvo tablas 100% públicas)
--    Cualquier tabla con PII o datos de tenant acá = NO-GO.
-- -----------------------------------------------------------------------------
select c.relname as tabla_sin_rls
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
  and c.relrowsecurity = false
order by c.relname;


-- -----------------------------------------------------------------------------
-- 3) Todas las policies de public
--    El auditor compara `qual` (USING) y `with_check` (WITH CHECK) contra el
--    modelo esperado. Red flags: qual = 'true' en SELECT de datos privados;
--    with_check laxo en INSERT/UPDATE; policy que no filtra por destino/owner.
-- -----------------------------------------------------------------------------
select
  tablename,
  policyname,
  cmd,                       -- SELECT / INSERT / UPDATE / DELETE / ALL
  roles,                     -- a qué roles aplica (anon, authenticated, …)
  permissive,
  qual        as using_expr,
  with_check  as check_expr
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;


-- -----------------------------------------------------------------------------
-- 4) Grants a anon / authenticated sobre tablas public
--    Muestra qué puede hacer un usuario sin loguear (anon) o logueado
--    (authenticated) a nivel privilegio de tabla, ANTES de RLS.
--    Red flag: anon con INSERT/UPDATE/DELETE en tablas que no sean el flujo
--    de consultas; authenticated con acceso amplio sin que RLS lo acote.
-- -----------------------------------------------------------------------------
select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privilegios
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;


-- -----------------------------------------------------------------------------
-- 5) Funciones SECURITY DEFINER en public
--    Corren con los privilegios del dueño (suelen saltear RLS) → superficie de
--    escalada. El auditor revisa que cada una valide scope internamente y tenga
--    search_path fijo. Acá deberían estar los helpers is_responsable / scope y
--    check_consulta_rate_limit.
-- -----------------------------------------------------------------------------
select
  p.proname                                   as funcion,
  pg_get_function_identity_arguments(p.oid)   as args,
  p.prosecdef                                 as security_definer,
  p.proconfig                                 as config_search_path,
  pg_get_userbyid(p.proowner)                 as owner
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.prosecdef = true
order by p.proname;


-- -----------------------------------------------------------------------------
-- 6) Quién puede EJECUTAR cada función de public
--    Red flag: anon/authenticated con execute sobre una función security
--    definer que muta datos sensibles.
-- -----------------------------------------------------------------------------
select
  r.routine_name                                          as funcion,
  string_agg(distinct pr.grantee, ', ' order by pr.grantee) as puede_ejecutar
from information_schema.routines r
join information_schema.role_routine_grants pr
  on pr.specific_name = r.specific_name
where r.specific_schema = 'public'
  and pr.privilege_type = 'EXECUTE'
group by r.routine_name
order by r.routine_name;


-- -----------------------------------------------------------------------------
-- 7) Policies de Storage (bucket de fotos)
--    F-01 fue sobre fotos. El auditor verifica que un responsable no pueda
--    subir/borrar objetos de un bucket/carpeta ajena.
-- -----------------------------------------------------------------------------
select
  policyname,
  cmd,
  roles,
  qual        as using_expr,
  with_check  as check_expr
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by cmd, policyname;

select id as bucket, public as es_publico
from storage.buckets
order by id;


-- -----------------------------------------------------------------------------
-- 8) Confirmar remediación F-04 presente en PROD
--    Debe devolver la firma de la función (no NULL) y la tabla con RLS on.
-- -----------------------------------------------------------------------------
select to_regprocedure('public.check_consulta_rate_limit(text,integer,integer)')
       as funcion_rate_limit;   -- esperado: no NULL

select relrowsecurity as rate_limit_tabla_con_rls
from pg_class
where relnamespace = 'public'::regnamespace
  and relname = 'consulta_rate_limit';   -- esperado: true


-- -----------------------------------------------------------------------------
-- 9) Columnas de la tabla `consultas` (PII) — para revisión de minimización
--    El auditor evalúa retención/minimización de nombre/email/whatsapp/ip/UA.
-- -----------------------------------------------------------------------------
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'consultas'
order by ordinal_position;


-- -----------------------------------------------------------------------------
-- 10) Config de Auth relevante (si el rol del editor lo permite)
--     Confirmar que el email confirm está ON (barrera de identidad).
--     Si esta query falla por permisos, exportar la config desde el panel:
--     Authentication → Providers / Settings.
-- -----------------------------------------------------------------------------
-- select * from auth.config;   -- (descomentar solo si tenés acceso al schema auth)
