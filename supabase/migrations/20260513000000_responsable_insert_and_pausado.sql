-- =============================================================================
-- Las Gaviotas BOOK — Patch: responsable INSERT policy + pausado_por
-- =============================================================================
-- 1. Permite que un responsable autenticado pueda INSERTAR hospedajes
--    (siempre en estado 'borrador' — defensa en profundidad).
-- 2. Agrega columna `pausado_por` para distinguir pausa de responsable vs admin
--    (Fase D del roadmap).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. INSERT policy para responsables
-- -----------------------------------------------------------------------------
create policy "Hospedajes: responsable insert"
  on hospedajes for insert
  to authenticated
  with check (
    exists (
      select 1 from perfiles
      where id = auth.uid()
        and rol = 'responsable'
    )
    and estado = 'borrador'
    and destacado = false
    and responsable_validado = false
  );

-- -----------------------------------------------------------------------------
-- 2. Columna pausado_por
-- -----------------------------------------------------------------------------
alter table hospedajes
  add column if not exists pausado_por uuid references auth.users(id) on delete set null;

comment on column hospedajes.pausado_por is
  'uuid del usuario que pausó. Si fue admin, responsable no puede despausar (Fase D).';
