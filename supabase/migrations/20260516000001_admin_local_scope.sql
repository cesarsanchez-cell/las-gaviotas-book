-- =============================================================================
-- Mis Escapadas — Marca paraguas / jerarquía de admins (Bloque A)
-- =============================================================================
-- Contexto:
--   La migración 20260516000000 agregó `perfiles.destino_id` nullable pero
--   no cambió ninguna policy. Esta migración cierra el círculo: introduce
--   helpers SECURITY DEFINER para distinguir super admin (destino_id=NULL,
--   ve toda la red) de admin local (destino_id=<uuid>, ve solo su destino),
--   y reescribe las policies de admin para filtrar por scope.
--
-- Compatibilidad:
--   Todos los admins existentes hoy tienen destino_id=NULL → super admin →
--   comportamiento idéntico al actual. Esta migración NO modifica datos.
--
-- Bucket storage:
--   Las policies de storage.objects siguen siendo `is_admin() or is_responsable()`
--   sin scope. La defensa real está en hospedaje_fotos (esta migración filtra
--   por destino vía admin_owns_hospedaje), así que aunque un admin local
--   pudiera subir un blob al bucket, no podría enlazarlo a una foto fuera
--   de su scope. Mejorable después si hace falta.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Helpers SECURITY DEFINER
-- ----------------------------------------------------------------------------

create or replace function public.is_super_admin()
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
      and rol = 'admin'
      and destino_id is null
  );
$$;

create or replace function public.admin_owns_destino(p_destino_id uuid)
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
      and rol = 'admin'
      and (destino_id is null or destino_id = p_destino_id)
  );
$$;

create or replace function public.admin_owns_hospedaje(p_hospedaje_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.hospedajes h
    join public.perfiles p on p.id = auth.uid()
    where h.id = p_hospedaje_id
      and p.rol = 'admin'
      and (p.destino_id is null or p.destino_id = h.destino_id)
  );
$$;

revoke all on function public.is_super_admin() from public;
revoke all on function public.admin_owns_destino(uuid) from public;
revoke all on function public.admin_owns_hospedaje(uuid) from public;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.admin_owns_destino(uuid) to authenticated;
grant execute on function public.admin_owns_hospedaje(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- destinos
-- ----------------------------------------------------------------------------
-- SELECT abierto a cualquier admin (necesario para dropdowns en el form de
-- hospedajes, joins de listados, etc.). Escritura solo super admin.

drop policy if exists "Destinos: admin lectura total" on public.destinos;
drop policy if exists "Destinos: admin escritura" on public.destinos;

create policy "Destinos: admin lectura total"
  on public.destinos for select
  to authenticated
  using (is_admin());

create policy "Destinos: super admin escritura"
  on public.destinos for all
  to authenticated
  using (is_super_admin())
  with check (is_super_admin());

-- ----------------------------------------------------------------------------
-- localidades
-- ----------------------------------------------------------------------------
-- SELECT ya es público (sin cambio). Escritura: admin scoped por destino.

drop policy if exists "Localidades: admin escritura" on public.localidades;

create policy "Localidades: admin escritura scoped"
  on public.localidades for all
  to authenticated
  using (admin_owns_destino(destino_id))
  with check (admin_owns_destino(destino_id));

-- ----------------------------------------------------------------------------
-- hospedajes
-- ----------------------------------------------------------------------------

drop policy if exists "Hospedajes: admin lectura total" on public.hospedajes;
drop policy if exists "Hospedajes: admin escritura" on public.hospedajes;

create policy "Hospedajes: admin lectura scoped"
  on public.hospedajes for select
  to authenticated
  using (admin_owns_destino(destino_id));

create policy "Hospedajes: admin escritura scoped"
  on public.hospedajes for all
  to authenticated
  using (admin_owns_destino(destino_id))
  with check (admin_owns_destino(destino_id));

-- ----------------------------------------------------------------------------
-- hospedaje_fotos
-- ----------------------------------------------------------------------------

drop policy if exists "Fotos: admin lectura total" on public.hospedaje_fotos;
drop policy if exists "Fotos: admin escritura" on public.hospedaje_fotos;

create policy "Fotos: admin lectura scoped"
  on public.hospedaje_fotos for select
  to authenticated
  using (admin_owns_hospedaje(hospedaje_id));

create policy "Fotos: admin escritura scoped"
  on public.hospedaje_fotos for all
  to authenticated
  using (admin_owns_hospedaje(hospedaje_id))
  with check (admin_owns_hospedaje(hospedaje_id));

-- ----------------------------------------------------------------------------
-- perfiles
-- ----------------------------------------------------------------------------
-- "Perfiles: usuario lee y edita el propio" se mantiene sin cambio.
-- Gestión de perfiles ajenos: solo super admin (crea/borra admins locales y
-- super admins, ve a todos los responsables).
-- Admin local puede LEER perfiles de responsables cuyos hospedajes son de su
-- destino, para mostrar nombres en listados de validaciones.

drop policy if exists "Perfiles: admin lectura total" on public.perfiles;
drop policy if exists "Perfiles: admin escritura total" on public.perfiles;
drop policy if exists "Perfiles: admin local lee responsables de su destino" on public.perfiles;

create policy "Perfiles: super admin lectura total"
  on public.perfiles for select
  to authenticated
  using (is_super_admin());

create policy "Perfiles: super admin escritura total"
  on public.perfiles for all
  to authenticated
  using (is_super_admin())
  with check (is_super_admin());

create policy "Perfiles: admin local lee responsables de su destino"
  on public.perfiles for select
  to authenticated
  using (
    rol = 'responsable'
    and hospedajes_ids is not null
    and exists (
      select 1
      from unnest(hospedajes_ids) as hid
      where admin_owns_hospedaje(hid)
    )
  );

-- ----------------------------------------------------------------------------
-- validacion_eventos
-- ----------------------------------------------------------------------------

drop policy if exists "Validacion eventos: admin lectura" on public.validacion_eventos;

create policy "Validacion eventos: admin lectura scoped"
  on public.validacion_eventos for select
  to authenticated
  using (admin_owns_hospedaje(hospedaje_id));
