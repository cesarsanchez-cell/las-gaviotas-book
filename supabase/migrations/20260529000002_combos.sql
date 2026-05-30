-- =============================================================================
-- Mis Escapadas — Combos / Sinergias (paquetes que cruzan 2-3 comercios)
-- =============================================================================
-- Contexto:
--   Un combo es una propuesta curada que cruza 2-3 comercios de UN destino
--   (ej: cabaña + parrilla + caminata) con beneficios cruzados, precio desde,
--   % de ahorro y validez. Lo ARMA el responsable y lo APRUEBA el admin local
--   (mismo flujo de validación que `lugares`: estado borrador →
--   pendiente_validacion → publicado / rechazado).
--
--   `combo_items.comercio_id` es polimórfico SIN FK (patrón de `promos` /
--   `responsabilidades`): apunta a hospedajes o lugares según `comercio_tipo`.
--   La foto se HEREDA de los comercios. El WhatsApp de "Consultar" se resuelve
--   en la app al hospedaje ancla.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tablas
-- -----------------------------------------------------------------------------

create table if not exists public.combos (
  id           uuid primary key default gen_random_uuid(),
  destino_id   uuid not null references public.destinos(id) on delete cascade,
  slug         text not null,
  titulo       text not null,
  bajada       text,
  noches       int not null default 1,
  precio_desde int,                                    -- pesos AR, entero
  ahorro_pct   int check (ahorro_pct between 1 and 100),
  beneficios   text[] not null default '{}',           -- beneficios cruzados
  validez      text,
  estado       text not null default 'borrador'
    check (estado in ('borrador','pendiente_validacion','publicado','pausado','rechazado')),
  creado_por   uuid references public.perfiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (destino_id, slug)
);

comment on table public.combos is
  'Sinergias: paquetes curados que cruzan 2-3 comercios de un destino. Los arma el responsable y los aprueba el admin local (flujo de validación de lugares).';

create table if not exists public.combo_items (
  id            uuid primary key default gen_random_uuid(),
  combo_id      uuid not null references public.combos(id) on delete cascade,
  comercio_tipo text not null check (comercio_tipo in ('hospedaje','gastronomico','atractivo')),
  comercio_id   uuid not null,
  beneficio     text not null,
  orden         int not null default 0
);

create index if not exists combos_destino_estado_idx on public.combos (destino_id, estado);
create index if not exists combos_estado_idx          on public.combos (estado);
create index if not exists combo_items_combo_idx      on public.combo_items (combo_id);
create index if not exists combo_items_comercio_idx   on public.combo_items (comercio_tipo, comercio_id);

drop trigger if exists trg_combos_updated_at on public.combos;
create trigger trg_combos_updated_at
  before update on public.combos
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- 2) RLS
-- -----------------------------------------------------------------------------

alter table public.combos enable row level security;
alter table public.combo_items enable row level security;

-- Lectura pública: solo combos publicados.
drop policy if exists "Combos: lectura pública publicados" on public.combos;
create policy "Combos: lectura pública publicados"
  on public.combos for select
  to anon, authenticated
  using (estado = 'publicado');

drop policy if exists "Combos: admin lectura completa" on public.combos;
create policy "Combos: admin lectura completa"
  on public.combos for select
  to authenticated
  using (is_admin());

drop policy if exists "Combos: admin escribe" on public.combos;
create policy "Combos: admin escribe"
  on public.combos for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- Items: visibles si su combo es público; admin ve/escribe todo. Los writes de
-- responsable van por service role validando ownership en código.
drop policy if exists "ComboItems: lectura pública de combos publicados" on public.combo_items;
create policy "ComboItems: lectura pública de combos publicados"
  on public.combo_items for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.combos c
       where c.id = combo_items.combo_id and c.estado = 'publicado'
    )
  );

drop policy if exists "ComboItems: admin lectura completa" on public.combo_items;
create policy "ComboItems: admin lectura completa"
  on public.combo_items for select
  to authenticated
  using (is_admin());

drop policy if exists "ComboItems: admin escribe" on public.combo_items;
create policy "ComboItems: admin escribe"
  on public.combo_items for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- 3) Verificación
-- -----------------------------------------------------------------------------

select
  (select count(*) from public.combos)       as combos_count,
  (select count(*) from public.combo_items)   as combo_items_count,
  (select count(*) from pg_policies where tablename = 'combos')      as combos_policies,
  (select count(*) from pg_policies where tablename = 'combo_items') as combo_items_policies;
