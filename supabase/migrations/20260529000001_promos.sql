-- =============================================================================
-- Mis Escapadas — Tabla `promos` (promos individuales sobre un comercio)
-- =============================================================================
-- Contexto:
--   La home v2 (hub estilo Airbnb) muestra bandas de promos ("Promos en {lugar}"
--   y "Promos destacadas"). Una promo individual es un descuento/beneficio que
--   un admin local o el responsable cargan sobre UN comercio (hospedaje, lugar
--   gastronómico o atractivo) de un destino.
--
--   La foto de la promo se HEREDA del comercio referenciado (no hay upload
--   propio), así que la tabla no guarda foto.
--
--   `comercio_id` es una FK polimórfica SIN constraint (mismo patrón que
--   `responsabilidades.entidad_id`): apunta a hospedajes(id) o lugares(id)
--   según `comercio_tipo`. El borrado del comercio NO cascadea automáticamente;
--   se limpia desde la aplicación / queda inactiva.
--
--   Esta migración: tabla + trigger updated_at + índices + RLS. Sin seed.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tabla
-- -----------------------------------------------------------------------------

create table if not exists public.promos (
  id             uuid primary key default gen_random_uuid(),
  destino_id     uuid not null references public.destinos(id) on delete cascade,
  comercio_tipo  text not null check (comercio_tipo in ('hospedaje','gastronomico','atractivo')),
  comercio_id    uuid not null,
  titulo         text not null,
  bajada         text,
  beneficio      text not null,
  pct            int check (pct between 1 and 100),
  vigencia_desde date,
  vigencia_hasta date,
  activo         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.promos is
  'Promos individuales (un comercio). Cargadas por admin local o responsable. La foto se hereda del comercio (comercio_tipo + comercio_id, FK polimórfica sin constraint).';

create index if not exists promos_destino_activo_idx on public.promos (destino_id, activo);
create index if not exists promos_comercio_idx        on public.promos (comercio_tipo, comercio_id);

-- Reutilizamos set_updated_at() (definido en la migración inicial).
drop trigger if exists trg_promos_updated_at on public.promos;
create trigger trg_promos_updated_at
  before update on public.promos
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- 2) RLS
-- -----------------------------------------------------------------------------

alter table public.promos enable row level security;

-- Lectura pública: cualquiera ve promos activas y vigentes (sin fecha de fin, o
-- con fecha de fin >= hoy). vigencia_desde no bloquea la lectura: una promo
-- futura activa puede pre-mostrarse; el filtro fino vive en las queries.
drop policy if exists "Promos: lectura pública vigentes" on public.promos;
create policy "Promos: lectura pública vigentes"
  on public.promos for select
  to anon, authenticated
  using (
    activo = true
    and (vigencia_hasta is null or vigencia_hasta >= current_date)
  );

-- Admins (super o local) leen todas para gestionarlas.
drop policy if exists "Promos: admin lectura completa" on public.promos;
create policy "Promos: admin lectura completa"
  on public.promos for select
  to authenticated
  using (is_admin());

-- Escritura: is_admin() vía policy. Los writes de responsables van por service
-- role (createAdminClient) desde server actions que validan ownership en código
-- (patrón de lugares/hospedajes), por eso no necesitan policy propia.
drop policy if exists "Promos: admin escribe" on public.promos;
create policy "Promos: admin escribe"
  on public.promos for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- 3) Verificación
-- -----------------------------------------------------------------------------

select
  (select count(*) from public.promos)                              as promos_count,
  (select count(*) from pg_policies where tablename = 'promos')     as promos_policies,
  exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'promos'
       and column_name = 'comercio_tipo'
  )                                                                  as tiene_comercio_tipo;
