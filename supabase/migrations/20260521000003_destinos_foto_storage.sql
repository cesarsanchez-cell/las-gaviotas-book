-- Migra `destinos.foto_url` a `destinos.foto_path` y crea un bucket público
-- dedicado para las fotos de destino. La columna guarda el path relativo al
-- bucket (ej. "<destino-id>/1716...-portada.jpg"), no la URL absoluta, para
-- evitar dependencias frágiles a URLs externas que pueden romperse o
-- desaparecer sin aviso.

-- 1. Renombrar columna (no hay datos cargados todavía, así que es seguro).
alter table public.destinos rename column foto_url to foto_path;

-- 2. Crear bucket público "destinos" si no existe.
insert into storage.buckets (id, name, public)
values ('destinos', 'destinos', true)
on conflict (id) do update set public = true;

-- 3. Policies del bucket.
-- Lectura pública (cualquiera puede ver la foto del destino — son públicas).
drop policy if exists "destinos_storage_public_read" on storage.objects;
create policy "destinos_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'destinos');

-- Solo Super Admin puede subir/actualizar/borrar.
drop policy if exists "destinos_storage_super_admin_insert" on storage.objects;
create policy "destinos_storage_super_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'destinos' and public.is_super_admin());

drop policy if exists "destinos_storage_super_admin_update" on storage.objects;
create policy "destinos_storage_super_admin_update"
  on storage.objects for update
  using (bucket_id = 'destinos' and public.is_super_admin())
  with check (bucket_id = 'destinos' and public.is_super_admin());

drop policy if exists "destinos_storage_super_admin_delete" on storage.objects;
create policy "destinos_storage_super_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'destinos' and public.is_super_admin());

-- Verificación
select
  (select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'destinos'
      and column_name in ('foto_url','foto_path')) as columna_destinos,
  (select id from storage.buckets where id = 'destinos') as bucket;
