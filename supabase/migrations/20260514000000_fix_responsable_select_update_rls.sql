-- =============================================================================
-- Las Gaviotas BOOK — Fix RLS: SELECT/UPDATE responsable sobre hospedajes + fotos
-- =============================================================================
-- Síntoma:
--   Responsable autenticado editando un hospedaje propio en estado 'borrador':
--   "new row violates row-level security policy for table 'hospedajes'".
--
-- Causa:
--   Las policies originales usan `exists(select 1 from perfiles where ...)`
--   dentro del USING/WITH CHECK. Como `perfiles` tiene RLS, ese subselect
--   se evalúa bajo el contexto del responsable y bajo ciertos planes de
--   ejecución devuelve `false`, haciendo fallar el WITH CHECK.
--   La migración 20260513000001 ya documentó este patrón y lo arregló para
--   INSERT (helper `is_responsable()` SECURITY DEFINER), pero SELECT/UPDATE
--   quedaron con el patrón viejo.
--
-- Fix:
--   1. Helper `responsable_owns_hospedaje(uuid)` SECURITY DEFINER que bypasea
--      la RLS de `perfiles` al chequear ownership.
--   2. Drop + recreate de las 3 policies afectadas usando ese helper.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper
-- -----------------------------------------------------------------------------
create or replace function responsable_owns_hospedaje(p_hospedaje_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.perfiles
    where id = auth.uid()
      and rol = 'responsable'
      and p_hospedaje_id = any(hospedajes_ids)
  );
$$;

-- -----------------------------------------------------------------------------
-- 2. hospedajes: SELECT responsable
-- -----------------------------------------------------------------------------
drop policy if exists "Hospedajes: responsable lectura propios" on hospedajes;

create policy "Hospedajes: responsable lectura propios"
  on hospedajes for select
  to authenticated
  using ( responsable_owns_hospedaje(id) );

-- -----------------------------------------------------------------------------
-- 3. hospedajes: UPDATE responsable
-- -----------------------------------------------------------------------------
drop policy if exists "Hospedajes: responsable update propios" on hospedajes;

create policy "Hospedajes: responsable update propios"
  on hospedajes for update
  to authenticated
  using ( responsable_owns_hospedaje(id) )
  with check (
    responsable_owns_hospedaje(id)
    -- Responsable NO puede cambiar estado directamente — solo admin valida.
    -- Las transiciones legítimas van por server actions con service role
    -- (submitForReviewAction, withdrawFromReviewAction).
    and estado in ('borrador', 'pendiente_validacion', 'pausado')
  );

-- -----------------------------------------------------------------------------
-- 4. hospedaje_fotos: ALL responsable
-- -----------------------------------------------------------------------------
-- La 20260513000002 ya refactorizó a `is_responsable() and exists(...)`. El
-- `exists(...)` sobre perfiles sigue siendo vulnerable al mismo problema,
-- así que también la migramos al helper unificado.
drop policy if exists "Fotos: responsable gestiona propias" on hospedaje_fotos;

create policy "Fotos: responsable gestiona propias"
  on hospedaje_fotos for all
  to authenticated
  using ( responsable_owns_hospedaje(hospedaje_id) )
  with check ( responsable_owns_hospedaje(hospedaje_id) );
