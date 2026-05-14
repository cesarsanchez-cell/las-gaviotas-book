-- =============================================================================
-- Las Gaviotas BOOK — Fix RLS de fotos + storage para responsables
-- =============================================================================
-- Refactor de las policies de hospedaje_fotos y storage.objects usando
-- is_responsable() / is_admin() helpers (mismo patrón que evitó el problema
-- en hospedajes).
-- =============================================================================

-- ---- storage.objects -------------------------------------------------------
drop policy if exists "Hospedajes bucket: insert admin/responsable" on storage.objects;
drop policy if exists "Hospedajes bucket: update admin/responsable" on storage.objects;
drop policy if exists "Hospedajes bucket: delete admin/responsable" on storage.objects;

create policy "Hospedajes bucket: insert admin/responsable"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'hospedajes' and (is_admin() or is_responsable())
  );

create policy "Hospedajes bucket: update admin/responsable"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'hospedajes' and (is_admin() or is_responsable())
  );

create policy "Hospedajes bucket: delete admin/responsable"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'hospedajes' and (is_admin() or is_responsable())
  );

-- ---- hospedaje_fotos -------------------------------------------------------
drop policy if exists "Fotos: responsable gestiona propias" on hospedaje_fotos;

create policy "Fotos: responsable gestiona propias"
  on hospedaje_fotos for all
  to authenticated
  using (
    is_responsable()
    and exists (
      select 1 from perfiles p
      where p.id = auth.uid()
        and hospedaje_fotos.hospedaje_id = any(p.hospedajes_ids)
    )
  )
  with check (
    is_responsable()
    and exists (
      select 1 from perfiles p
      where p.id = auth.uid()
        and hospedaje_fotos.hospedaje_id = any(p.hospedajes_ids)
    )
  );
