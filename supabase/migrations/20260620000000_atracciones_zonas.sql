-- =============================================================================
-- Mis Escapadas — Atracciones (curaduría) + Zonas  ·  Fase 1: fundaciones de datos
-- =============================================================================
-- Contexto (decidido 2026-06-20, ver Notion "Visión de Producto"):
--   Separamos dos conceptos que hoy viven juntos en el vertical `atractivos`:
--     • ATRACCIONES: lo que *tracciona* gente (naturaleza, cultura, hitos). No
--       pertenecen a ningún comercio, benefician a todos. 100% curaduría admin:
--       SIN precio, SIN responsable, SIN consulta/lead. Componen el hero.
--     • "Qué hacer": actividades comerciales (cabalgatas, cuatri, excursiones).
--       Es el rename de los `atractivos` actuales — NO se toca acá (va en Fase 3).
--
--   Geografía: una atracción es de un CONGLOMERADO de destinos (Las Gaviotas +
--   Mar Azul + Mar de las Pampas), no de un destino solo ni de toda la ciudad.
--   Nuevo nivel `zona`: conjunto nombrado y reutilizable de destinos, dentro de
--   una ciudad. Muchos-a-muchos vía `zona_destinos` (un destino en varias zonas).
--   Jerarquía: region → ciudad → [zona] → destino → localidad → hospedaje.
--   OJO: la `zona` NO es la `región` (que está POR ENCIMA de la ciudad).
--
--   Vigencia opcional en la atracción: sin fecha = permanente (playa, bosque);
--   con fecha = evento (filarmónica, zumba) que se cae solo al vencer.
--
--   Fase 1: tablas + índices + triggers + RLS + seed mínimo. Escritura SOLO
--   Super Admin (curaduría nacional, igual que regiones/ciudades). El admin de
--   curaduría (Fase 2) y el hero (Fase 4) van en migraciones/PRs posteriores.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tabla `zonas` — conglomerado nombrado de destinos, dentro de una ciudad
-- -----------------------------------------------------------------------------

create table if not exists public.zonas (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  nombre       text not null,
  descripcion  text,
  -- Ciudad "madre" del conglomerado. Opcional/aditivo (como todo nivel
  -- intermedio): una zona sin ciudad igual agrupa sus destinos vía zona_destinos.
  ciudad_id    uuid references public.ciudades(id) on delete set null,
  -- Imagen para hero/landing de zona (Fase 5). Path en Storage, no URL externa.
  foto_path    text,
  activo       boolean not null default true,
  orden        int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.zonas is
  'Conglomerado nombrado y reutilizable de destinos, dentro de una ciudad. Nivel intermedio entre ciudad y destino (M2M vía zona_destinos). NO es region (que está por encima de la ciudad). Las atracciones cuelgan de una zona.';

create index if not exists zonas_activo_orden_idx on public.zonas (activo, orden);
create index if not exists zonas_ciudad_id_idx    on public.zonas (ciudad_id);
create index if not exists zonas_slug_idx          on public.zonas (slug);

drop trigger if exists trg_zonas_updated_at on public.zonas;
create trigger trg_zonas_updated_at
  before update on public.zonas
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- 2) Tabla `zona_destinos` — M2M: un destino puede estar en varias zonas
-- -----------------------------------------------------------------------------

create table if not exists public.zona_destinos (
  zona_id    uuid not null references public.zonas(id)    on delete cascade,
  destino_id uuid not null references public.destinos(id) on delete cascade,
  primary key (zona_id, destino_id)
);

comment on table public.zona_destinos is
  'Vínculo muchos-a-muchos zona↔destino. Un destino puede pertenecer a varias zonas (ej. zona de playa + zona de bosque).';

create index if not exists zona_destinos_destino_idx on public.zona_destinos (destino_id);

-- -----------------------------------------------------------------------------
-- 3) Tabla `atracciones` — contenido curado, no comercial
-- -----------------------------------------------------------------------------

create table if not exists public.atracciones (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  nombre           text not null,
  descripcion      text,
  -- Etiqueta libre para el chip del hero (ej. "Naturaleza", "Cultura",
  -- "Evento"). Validación de valores en la app, no en CHECK SQL.
  categoria        text,
  -- Pertenece a una zona (obligatorio): tracciona a todo el conglomerado.
  zona_id          uuid not null references public.zonas(id) on delete cascade,
  -- Ancla opcional: cuando se concentra en un destino (la filarmónica en el
  -- anfiteatro de Mar de las Pampas). La app valida que el destino sea de la zona.
  destino_ancla_id uuid references public.destinos(id) on delete set null,
  -- Ubicación/venue como texto libre (curaduría): "Anfiteatro de Mar de las
  -- Pampas", "Balneario de Las Gaviotas". No se modela el venue como entidad.
  ubicacion_texto  text,
  -- Vigencia opcional: ambas null = permanente (playa, bosque); con fecha =
  -- evento que el hero baja solo al vencer (ver RLS de lectura pública).
  vigencia_desde   date,
  vigencia_hasta   date,
  -- Imagen principal. Path en Storage (nunca URL externa).
  foto_path        text,
  -- Borrador → publicada. Arranca en borrador hasta que el admin la publica.
  publicada        boolean not null default false,
  destacada        boolean not null default false,
  orden            int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.atracciones is
  'Atracción curada (naturaleza/cultura/evento). NO comercial: sin precio, sin responsable, sin consulta. Cuelga de una zona (zona_id), con destino ancla opcional y vigencia opcional (permanente vs evento). Compone el hero.';

create index if not exists atracciones_zona_pub_idx    on public.atracciones (zona_id, publicada);
create index if not exists atracciones_ancla_idx       on public.atracciones (destino_ancla_id);
create index if not exists atracciones_vigencia_idx    on public.atracciones (vigencia_hasta);
create index if not exists atracciones_slug_idx        on public.atracciones (slug);

drop trigger if exists trg_atracciones_updated_at on public.atracciones;
create trigger trg_atracciones_updated_at
  before update on public.atracciones
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- 4) RLS
-- -----------------------------------------------------------------------------

alter table public.zonas         enable row level security;
alter table public.zona_destinos enable row level security;
alter table public.atracciones   enable row level security;

-- --- zonas ---
drop policy if exists "Zonas: lectura pública activas" on public.zonas;
create policy "Zonas: lectura pública activas"
  on public.zonas for select
  to anon, authenticated
  using (activo = true);

drop policy if exists "Zonas: admin lectura completa" on public.zonas;
create policy "Zonas: admin lectura completa"
  on public.zonas for select
  to authenticated
  using (is_admin());

drop policy if exists "Zonas: super admin escribe" on public.zonas;
create policy "Zonas: super admin escribe"
  on public.zonas for all
  to authenticated
  using (is_super_admin())
  with check (is_super_admin());

-- --- zona_destinos ---
-- Lectura pública solo de vínculos de zonas activas (no exponer zonas ocultas);
-- el admin ve todo para gestionar.
drop policy if exists "ZonaDestinos: lectura pública de zonas activas" on public.zona_destinos;
create policy "ZonaDestinos: lectura pública de zonas activas"
  on public.zona_destinos for select
  to anon, authenticated
  using (
    is_admin()
    or exists (
      select 1 from public.zonas z
       where z.id = zona_id and z.activo = true
    )
  );

drop policy if exists "ZonaDestinos: super admin escribe" on public.zona_destinos;
create policy "ZonaDestinos: super admin escribe"
  on public.zona_destinos for all
  to authenticated
  using (is_super_admin())
  with check (is_super_admin());

-- --- atracciones ---
-- Lectura pública: publicadas y vigentes (sin fecha de fin, o fin >= hoy).
-- vigencia_desde NO bloquea (una atracción futura publicada puede pre-mostrarse;
-- el filtro fino vive en las queries), mismo criterio que promos.
drop policy if exists "Atracciones: lectura pública vigentes" on public.atracciones;
create policy "Atracciones: lectura pública vigentes"
  on public.atracciones for select
  to anon, authenticated
  using (
    publicada = true
    and (vigencia_hasta is null or vigencia_hasta >= current_date)
  );

drop policy if exists "Atracciones: admin lectura completa" on public.atracciones;
create policy "Atracciones: admin lectura completa"
  on public.atracciones for select
  to authenticated
  using (is_admin());

drop policy if exists "Atracciones: super admin escribe" on public.atracciones;
create policy "Atracciones: super admin escribe"
  on public.atracciones for all
  to authenticated
  using (is_super_admin())
  with check (is_super_admin());

-- -----------------------------------------------------------------------------
-- 5) Seed mínimo (idempotente): zona "Pueblos del bosque" + 2 atracciones
--    Solo para probar la capa de datos. Sin fotos (foto_path null).
-- -----------------------------------------------------------------------------

-- Zona, colgada de la ciudad de Las Gaviotas si existe (sino, ciudad_id null).
insert into public.zonas (slug, nombre, descripcion, ciudad_id, orden)
select
  'pueblos-del-bosque',
  'Pueblos del bosque',
  'El cordón de pinares al sur de Gesell: Las Gaviotas, Mar Azul y Mar de las Pampas. Playas amplias, bosque y vida tranquila.',
  (select ciudad_id from public.destinos where slug = 'las-gaviotas' limit 1),
  1
on conflict (slug) do nothing;

-- Vínculos zona↔destinos (los que existan).
insert into public.zona_destinos (zona_id, destino_id)
select z.id, d.id
  from public.zonas z
  join public.destinos d
    on d.slug in ('las-gaviotas', 'mar-azul', 'mar-de-las-pampas')
 where z.slug = 'pueblos-del-bosque'
on conflict (zona_id, destino_id) do nothing;

-- Atracción permanente (toda la zona, sin ancla).
insert into public.atracciones (slug, nombre, descripcion, categoria, zona_id, publicada, orden)
select
  'playas-amplias-pueblos-del-bosque',
  'Playas amplias y médanos',
  'Kilómetros de playa abierta y médanos vivos entre el pinar y el mar, sin las multitudes del centro.',
  'Naturaleza',
  z.id, true, 1
  from public.zonas z
 where z.slug = 'pueblos-del-bosque'
on conflict (slug) do nothing;

-- Atracción anclada a un destino (la filarmónica en el anfiteatro). Sin vigencia
-- en el seed (se le pone fecha cuando haya una función real).
insert into public.atracciones
  (slug, nombre, descripcion, categoria, zona_id, destino_ancla_id, ubicacion_texto, publicada, orden)
select
  'anfiteatro-mar-de-las-pampas',
  'Anfiteatro del bosque',
  'Espectáculos al aire libre entre los pinos. Conciertos y eventos culturales que convocan a toda la zona.',
  'Cultura',
  z.id,
  (select id from public.destinos where slug = 'mar-de-las-pampas' limit 1),
  'Anfiteatro de Mar de las Pampas',
  true, 2
  from public.zonas z
 where z.slug = 'pueblos-del-bosque'
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- 6) Verificación (cerrar SIEMPRE con un SELECT — el "Success" puede engañar)
-- -----------------------------------------------------------------------------

select
  (select count(*) from public.zonas)                              as zonas_count,
  (select count(*) from public.zona_destinos)                      as vinculos_count,
  (select count(*) from public.atracciones)                        as atracciones_count,
  (select count(*) from pg_policies where tablename = 'zonas')        as zonas_policies,
  (select count(*) from pg_policies where tablename = 'zona_destinos') as zonadest_policies,
  (select count(*) from pg_policies where tablename = 'atracciones')   as atracciones_policies;
