-- =============================================================================
-- Mis Escapadas — Curador de zona (delegación de curaduría de atracciones)
-- =============================================================================
-- Contexto (Fase 2):
--   Para no recargar al Super Admin con toda la curaduría, cada zona puede tener
--   UN curador: un admin (local) responsable de gestionar las atracciones de esa
--   zona. El Super Admin arma la zona (estructura + destinos) y le asigna el
--   curador; el curador gestiona las atracciones de su zona.
--
--   La ESTRUCTURA de la zona (qué destinos agrupa, su foto, su curador) sigue
--   siendo Super Admin. Lo que se delega es la escritura de `atracciones`.
-- =============================================================================

-- 1) Columna curador en zonas (un perfil admin responsable de la zona)
alter table public.zonas
  add column if not exists curador_id uuid references public.perfiles(id) on delete set null;

create index if not exists zonas_curador_idx on public.zonas (curador_id);

comment on column public.zonas.curador_id is
  'Admin (local) que cura las atracciones de esta zona. NULL = solo Super Admin. La estructura de la zona sigue siendo Super Admin.';

-- 2) Helper: ¿el usuario puede curar las atracciones de esta zona?
--    Super Admin siempre; o el curador asignado (que debe ser admin).
create or replace function public.zona_curable(p_zona_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.zonas z
      join public.perfiles p on p.id = auth.uid()
      where z.id = p_zona_id
        and z.curador_id = auth.uid()
        and p.rol = 'admin'
    );
$$;

revoke all on function public.zona_curable(uuid) from public;
grant execute on function public.zona_curable(uuid) to authenticated;

-- 3) Atracciones: la escritura pasa de "solo Super Admin" a "curador o Super".
drop policy if exists "Atracciones: super admin escribe" on public.atracciones;
drop policy if exists "Atracciones: curador o super escribe" on public.atracciones;
create policy "Atracciones: curador o super escribe"
  on public.atracciones for all
  to authenticated
  using (public.zona_curable(zona_id))
  with check (public.zona_curable(zona_id));

-- 4) Verificación
select
  exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'zonas'
       and column_name = 'curador_id'
  )                                                                as tiene_curador_col,
  (select count(*) from pg_proc where proname = 'zona_curable')    as helper_count,
  (select count(*) from pg_policies
     where tablename = 'atracciones' and policyname = 'Atracciones: curador o super escribe')
                                                                   as policy_curador;
