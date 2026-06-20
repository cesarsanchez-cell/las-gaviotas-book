-- =============================================================================
-- Storage — el curador puede subir/gestionar las fotos de SUS atracciones
-- =============================================================================
-- Bug: el bucket `destinos` solo dejaba ESCRIBIR al Super Admin
-- (20260521000003). Pero las atracciones (Fase 2) las cura un admin local
-- (curador de la zona): podía crear/editar la atracción pero NO subirle la foto
-- → "new row violates row-level security policy" al hacer upload.
--
-- Convención de path dentro del bucket `destinos`:
--   atracciones/<atraccionId>/<archivo>   → foto de atracción (curador o super)
--   zonas/<zonaId>/<archivo>              → foto de zona (solo super, ya cubierto)
--   <destinoId>/… , regiones/…           → destino/región (solo super, ya cubierto)
--
-- Esta migración es ADITIVA: agrega policies permisivas para el path
-- `atracciones/`. Las policies de Super Admin del bucket quedan intactas (las
-- policies RLS se combinan con OR), así que el Super Admin sigue pudiendo todo.
-- =============================================================================

-- Helper: ¿el usuario actual puede gestionar este objeto de atracción?
-- security definer para resolver la zona de la atracción sin depender de la RLS
-- del que llama. search_path fijo. Path mal formado / id inexistente → false.
create or replace function public.can_manage_atraccion_storage(obj_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  parts     text[] := storage.foldername(obj_name);  -- solo carpetas
  v_zona_id uuid;
begin
  if parts[1] <> 'atracciones' then
    return false;
  end if;
  select a.zona_id into v_zona_id
    from public.atracciones a
   where a.id = parts[2]::uuid;
  if v_zona_id is null then
    return false;
  end if;
  return public.zona_curable(v_zona_id);
exception
  when others then
    -- path inesperado / cast de uuid inválido → denegar por defecto.
    return false;
end;
$$;

revoke all on function public.can_manage_atraccion_storage(text) from public;
grant execute on function public.can_manage_atraccion_storage(text) to authenticated, service_role;

drop policy if exists "Atracciones bucket: insert curador" on storage.objects;
create policy "Atracciones bucket: insert curador"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'destinos'
    and public.can_manage_atraccion_storage(name)
  );

drop policy if exists "Atracciones bucket: update curador" on storage.objects;
create policy "Atracciones bucket: update curador"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'destinos'
    and public.can_manage_atraccion_storage(name)
  )
  with check (
    bucket_id = 'destinos'
    and public.can_manage_atraccion_storage(name)
  );

drop policy if exists "Atracciones bucket: delete curador" on storage.objects;
create policy "Atracciones bucket: delete curador"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'destinos'
    and public.can_manage_atraccion_storage(name)
  );

-- -----------------------------------------------------------------------------
-- Verificación (cerrar SIEMPRE con SELECT — el "Success" puede engañar)
-- -----------------------------------------------------------------------------
select
  to_regprocedure('public.can_manage_atraccion_storage(text)') is not null as helper_ok,
  (select count(*) from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname like 'Atracciones bucket:%')                          as policies_count;  -- esperado 3
