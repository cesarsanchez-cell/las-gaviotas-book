-- =============================================================================
-- Las Gaviotas BOOK — Row Level Security
-- =============================================================================
-- Principio: lectura pública para entidades publicadas; escritura solo admin
-- o responsable dueño. Service role bypassea RLS (usar con cuidado).
-- =============================================================================

alter table destinos              enable row level security;
alter table localidades           enable row level security;
alter table hospedajes            enable row level security;
alter table hospedaje_fotos       enable row level security;
alter table perfiles              enable row level security;
alter table validacion_eventos    enable row level security;

-- -----------------------------------------------------------------------------
-- destinos
-- -----------------------------------------------------------------------------
create policy "Destinos: read activos público"
  on destinos for select
  using (activo = true);

create policy "Destinos: admin lectura total"
  on destinos for select
  to authenticated
  using (is_admin());

create policy "Destinos: admin escritura"
  on destinos for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- localidades
-- -----------------------------------------------------------------------------
create policy "Localidades: read público"
  on localidades for select
  using (true);

create policy "Localidades: admin escritura"
  on localidades for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- hospedajes
-- -----------------------------------------------------------------------------
create policy "Hospedajes: read publicados público"
  on hospedajes for select
  using (estado = 'publicado');

create policy "Hospedajes: admin lectura total"
  on hospedajes for select
  to authenticated
  using (is_admin());

create policy "Hospedajes: responsable lectura propios"
  on hospedajes for select
  to authenticated
  using (
    exists (
      select 1 from perfiles
      where id = auth.uid()
        and rol = 'responsable'
        and hospedajes.id = any(hospedajes_ids)
    )
  );

create policy "Hospedajes: admin escritura"
  on hospedajes for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "Hospedajes: responsable update propios"
  on hospedajes for update
  to authenticated
  using (
    exists (
      select 1 from perfiles
      where id = auth.uid()
        and rol = 'responsable'
        and hospedajes.id = any(hospedajes_ids)
    )
  )
  with check (
    exists (
      select 1 from perfiles
      where id = auth.uid()
        and rol = 'responsable'
        and hospedajes.id = any(hospedajes_ids)
    )
    -- Responsable NO puede cambiar estado directamente — solo admin valida
    and estado in ('borrador', 'pendiente_validacion', 'pausado')
  );

-- -----------------------------------------------------------------------------
-- hospedaje_fotos
-- -----------------------------------------------------------------------------
create policy "Fotos: read si hospedaje publicado"
  on hospedaje_fotos for select
  using (
    exists (
      select 1 from hospedajes
      where hospedajes.id = hospedaje_fotos.hospedaje_id
        and hospedajes.estado = 'publicado'
    )
  );

create policy "Fotos: admin lectura total"
  on hospedaje_fotos for select
  to authenticated
  using (is_admin());

create policy "Fotos: admin escritura"
  on hospedaje_fotos for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "Fotos: responsable gestiona propias"
  on hospedaje_fotos for all
  to authenticated
  using (
    exists (
      select 1 from perfiles p
      where p.id = auth.uid()
        and p.rol = 'responsable'
        and hospedaje_fotos.hospedaje_id = any(p.hospedajes_ids)
    )
  )
  with check (
    exists (
      select 1 from perfiles p
      where p.id = auth.uid()
        and p.rol = 'responsable'
        and hospedaje_fotos.hospedaje_id = any(p.hospedajes_ids)
    )
  );

-- -----------------------------------------------------------------------------
-- perfiles
-- -----------------------------------------------------------------------------
create policy "Perfiles: usuario lee y edita el propio"
  on perfiles for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Perfiles: admin lectura total"
  on perfiles for select
  to authenticated
  using (is_admin());

create policy "Perfiles: admin escritura total"
  on perfiles for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- validacion_eventos
-- -----------------------------------------------------------------------------
create policy "Validacion eventos: admin lectura"
  on validacion_eventos for select
  to authenticated
  using (is_admin());

-- INSERT solo vía trigger (security definer), no necesita policy explícita
-- pero la dejamos por claridad
create policy "Validacion eventos: bloqueado insert directo"
  on validacion_eventos for insert
  to authenticated
  with check (false);
