-- =============================================================================
-- Las Gaviotas BOOK — Storage bucket público para fotos de hospedajes
-- =============================================================================
-- Bucket 'hospedajes' público — fotos accesibles vía CDN sin auth.
-- Decisión documentada: fotos públicas optimizan SEO, OG y performance.
-- Para documentos privados del responsable (DNI, CUIT) se creará bucket
-- separado en etapas posteriores.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('hospedajes', 'hospedajes', true)
on conflict (id) do nothing;

-- Lectura pública total del bucket
create policy "Hospedajes bucket: read público"
  on storage.objects for select
  using (bucket_id = 'hospedajes');

-- Solo admins y responsables autenticados pueden subir
create policy "Hospedajes bucket: insert admin/responsable"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'hospedajes'
    and (
      is_admin()
      or exists (
        select 1 from perfiles
        where id = auth.uid() and rol = 'responsable'
      )
    )
  );

create policy "Hospedajes bucket: update admin/responsable"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'hospedajes'
    and (
      is_admin()
      or exists (
        select 1 from perfiles
        where id = auth.uid() and rol = 'responsable'
      )
    )
  );

create policy "Hospedajes bucket: delete admin/responsable"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'hospedajes'
    and (
      is_admin()
      or exists (
        select 1 from perfiles
        where id = auth.uid() and rol = 'responsable'
      )
    )
  );
