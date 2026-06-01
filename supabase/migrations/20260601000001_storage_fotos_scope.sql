-- =============================================================================
-- F-01 (capa Storage) — Scope de propiedad en el bucket `hospedajes`.
--
-- Hallazgo del dump de auditoría: las policies de escritura del bucket
-- `hospedajes` permitían INSERT/UPDATE/DELETE a cualquier `is_admin() OR
-- is_responsable()` SIN chequear pertenencia sobre el path → un responsable
-- podía borrar/sobrescribir blobs de otro hospedaje/unidad/lugar llamando
-- directo a la Storage API, salteándose las server actions (el fix de código
-- de F-01 no cubre este vector). Es escritura cross-tenant.
--
-- Convención de paths dentro del bucket `hospedajes`:
--   <hospedajeId>/archivo              → foto de hospedaje
--   unidad-types/<unidadTypeId>/archivo → foto de tipo de unidad
--   lugares/<lugarId>/archivo          → foto de lugar gastronómico
--
-- Esta migración:
--   1) crea un helper que resuelve el dueño del objeto desde su path y valida
--      que el usuario actual lo posea (responsable) o lo tenga en scope (admin),
--   2) reemplaza las 3 policies de escritura por versiones scopeadas.
-- La policy de READ pública del bucket queda intacta (es un bucket público).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: ¿el usuario actual puede gestionar este objeto del bucket hospedajes?
-- security definer para poder leer unidad_types/lugares sin depender de la RLS
-- del que llama. search_path fijo. Cualquier path mal formado → false.
-- -----------------------------------------------------------------------------
create or replace function public.can_manage_hospedajes_object(obj_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  parts          text[] := storage.foldername(obj_name);  -- solo carpetas
  f1             text   := parts[1];
  f2             text   := parts[2];
  v_hospedaje_id uuid;
  v_lugar_id     uuid;
begin
  if f1 = 'unidad-types' then
    select ut.hospedaje_id into v_hospedaje_id
    from unidad_types ut
    where ut.id = f2::uuid;
  elsif f1 = 'lugares' then
    v_lugar_id := f2::uuid;
  else
    v_hospedaje_id := f1::uuid;  -- foto de hospedaje: primer folder = id
  end if;

  if v_lugar_id is not null then
    return (is_responsable() and responsable_owns_lugar(v_lugar_id))
        or (is_admin() and (is_super_admin() or admin_owns_lugar(v_lugar_id)));
  end if;

  if v_hospedaje_id is not null then
    return (is_responsable() and responsable_owns_hospedaje(v_hospedaje_id))
        or (is_admin() and (is_super_admin() or admin_owns_hospedaje(v_hospedaje_id)));
  end if;

  return false;
exception
  when others then
    -- path inesperado / cast de uuid inválido → denegar por defecto.
    return false;
end;
$$;

revoke all on function public.can_manage_hospedajes_object(text) from public;
grant execute on function public.can_manage_hospedajes_object(text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Reemplazo de las 3 policies de escritura del bucket `hospedajes`.
-- (Los nombres viejos vienen del dump; si en tu prod difieren, ajustá el DROP.)
-- -----------------------------------------------------------------------------
drop policy if exists "Hospedajes bucket: insert admin/responsable" on storage.objects;
drop policy if exists "Hospedajes bucket: update admin/responsable" on storage.objects;
drop policy if exists "Hospedajes bucket: delete admin/responsable" on storage.objects;

create policy "Hospedajes bucket: insert scoped"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'hospedajes'
    and public.can_manage_hospedajes_object(name)
  );

create policy "Hospedajes bucket: update scoped"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'hospedajes'
    and public.can_manage_hospedajes_object(name)
  )
  with check (
    bucket_id = 'hospedajes'
    and public.can_manage_hospedajes_object(name)
  );

create policy "Hospedajes bucket: delete scoped"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'hospedajes'
    and public.can_manage_hospedajes_object(name)
  );

-- -----------------------------------------------------------------------------
-- Verificación (cerramos con SELECTs, según convención del proyecto).
-- 1) Las nuevas policies de escritura deben existir y usar el helper.
-- 2) El helper debe estar presente.
-- -----------------------------------------------------------------------------
select policyname, cmd, qual as using_expr, with_check as check_expr
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'Hospedajes bucket:%'
order by cmd;

select to_regprocedure('public.can_manage_hospedajes_object(text)') as helper;  -- no NULL
