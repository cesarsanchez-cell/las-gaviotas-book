-- =============================================================================
-- Foto flexible de combos + visibilidad interzona
-- =============================================================================

-- 1) Agregar campos para elegir foto del combo (de cuál comercio)
alter table public.combos
  add column comercio_principal_tipo text,
  add column comercio_principal_id uuid;

comment on column public.combos.comercio_principal_tipo is
  'Tipo del comercio que proporciona la foto hero del combo (hospedaje, gastronomico, atractivo)';
comment on column public.combos.comercio_principal_id is
  'ID del comercio que proporciona la foto hero del combo';

-- 2) Verificación
select
  (select count(*) from public.combos)       as combos_count,
  (select count(*) from public.combo_items)   as combo_items_count;
