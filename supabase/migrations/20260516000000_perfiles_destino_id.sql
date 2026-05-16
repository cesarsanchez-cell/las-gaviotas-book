-- =============================================================================
-- Mis Escapadas — Habilitar admin scoped por destino (futuro)
-- =============================================================================
-- Contexto:
--   El proyecto evoluciona de "portal de Las Gaviotas" a "red de portales
--   turísticos locales bajo el paraguas Mis Escapadas". Cada destino es una
--   comunidad propia. En algún momento vamos a delegar la validación a un
--   admin local por destino (admin de Las Gaviotas, admin de Tandil, etc.).
--
-- Decisión:
--   No agregamos un rol nuevo. Mantenemos `rol in ('admin', 'responsable')`.
--   Sumamos `destino_id` nullable a `perfiles`:
--     - rol='admin' + destino_id=NULL → super admin (ve toda la red).
--     - rol='admin' + destino_id=<uuid> → admin de ESE destino (en el futuro
--       las RLS van a filtrar por este campo, hoy no se usa todavía).
--     - rol='responsable' → destino_id se ignora (su destino se infiere del
--       hospedaje que tienen asignado).
--
-- Esta migración SOLO agrega la columna y el índice. NO cambia el
-- comportamiento de las policies existentes. Cuando llegue el momento de
-- delegar validación, sumamos las policies que filtran por destino_id sin
-- migrar datos (todos los admin actuales quedan con destino_id=NULL = super
-- admin, exactamente como vienen comportándose).
-- =============================================================================

alter table public.perfiles
  add column if not exists destino_id uuid
    references public.destinos(id) on delete restrict;

comment on column public.perfiles.destino_id is
  'Solo aplica a perfiles con rol=admin. NULL=super admin (ve toda la red). UUID=admin de ese destino, solo valida hospedajes de ese destino. Ignorado para rol=responsable.';

create index if not exists perfiles_destino_id_idx
  on public.perfiles(destino_id)
  where destino_id is not null;
