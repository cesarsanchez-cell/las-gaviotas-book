-- =============================================================================
-- Mis Escapadas — Verticales Gastronomía + Atractivos + permisos generalizados
-- =============================================================================
-- Contexto:
--   El proyecto pivota de "directorio de hospedajes" a "plataforma de destinos
--   con múltiples verticales". Esta migración suma:
--
--     1. Tabla `lugares` (gastronomía + atractivos, entidad unificada con `tipo`
--        discriminador + campos comunes + categoría + horarios JSON).
--     2. Tabla `lugar_fotos` (galería por lugar).
--     3. Tabla `responsabilidades` (many-to-many entre perfil y entidad —
--        reemplaza el viejo `perfiles.hospedajes_ids[]` rígido a hospedajes).
--     4. Migra `perfiles.hospedajes_ids` → `responsabilidades`.
--     5. RLS scoped: lectura pública si publicado; responsable gestiona si
--        owns (vía responsabilidades); admin local cura su destino.
--
-- Hospedajes queda INTACTO en su tabla y modelo. No mezclamos.
--
-- Compatibilidad:
--   `perfiles.hospedajes_ids` se mantiene por compat (lo siguen llenando los
--   actions actuales hasta que limpiemos backend en fase 2). La fuente de
--   verdad nueva es `responsabilidades`. Esta migración POBLA la nueva tabla
--   con los datos viejos pero NO borra la columna.
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tabla `lugares`
-- -----------------------------------------------------------------------------

create table public.lugares (
  id                   uuid primary key default gen_random_uuid(),
  destino_id           uuid not null references public.destinos(id) on delete cascade,
  localidad_id         uuid references public.localidades(id) on delete set null,

  -- discriminador
  tipo                 text not null check (tipo in ('gastronomico', 'atractivo')),

  -- identidad
  slug                 text not null,
  nombre               text not null,
  descripcion_corta    text not null,
  descripcion_larga    text,

  -- ubicación
  direccion            text,
  lat                  numeric(10,7),
  lng                  numeric(10,7),
  google_maps_url      text,

  -- contacto (relevante para gastronómico; opcional para atractivo)
  whatsapp             text,
  telefono             text,
  email                text,
  instagram            text,
  website              text,

  -- taxonomía libre: para gastronómico (restaurant/parrilla/pizzeria/cafe/…)
  -- o para atractivo (playa/bosque/mirador/sendero/…). La validación del set
  -- por tipo vive en la aplicación (no en CHECK SQL para poder agregar
  -- categorías sin migración).
  categoria            text not null,

  -- horarios solo aplican a gastronómico. JSONB para mantener flexible el
  -- shape (rangos por día, cerrado, varios turnos). Lo formaliza el form.
  -- Ejemplo: {"lun":"12:00-15:00, 20:00-00:00","mar":null,"mie":"…"}
  horarios             jsonb,

  -- curaduría visual del admin local: aparece en sección "Imperdibles" de la
  -- home del destino. Máximo controlado por la app, no por SQL.
  imperdible           boolean not null default false,
  destacado            boolean not null default false,

  -- estado de publicación (mismo enum que hospedajes para consistencia mental)
  estado               text not null default 'borrador'
                       check (estado in ('borrador','pendiente_validacion','publicado','pausado','rechazado')),
  validado_at          timestamptz,
  validado_por         uuid references auth.users(id),

  -- SEO
  meta_title           text,
  meta_description     text,

  orden_listado        int not null default 0,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- slug único dentro del destino, no globalmente
  constraint lugares_slug_destino_unique unique (destino_id, slug)
);

comment on table public.lugares is
  'Entidad unificada para gastronomía y atractivos. Hospedajes vive en su propia tabla. Discriminado por `tipo`.';
comment on column public.lugares.categoria is
  'Taxonomía libre. Set válido depende de `tipo`. Validación en aplicación.';
comment on column public.lugares.horarios is
  'JSONB. Solo aplica a tipo=gastronomico. Shape definido por el form, sin CHECK SQL.';
comment on column public.lugares.imperdible is
  'Marcado por admin local para aparecer en sección Imperdibles de la home.';

create index lugares_destino_idx           on public.lugares(destino_id);
create index lugares_tipo_idx              on public.lugares(tipo);
create index lugares_estado_idx            on public.lugares(estado);
create index lugares_destino_tipo_estado_idx on public.lugares(destino_id, tipo, estado);
create index lugares_categoria_idx         on public.lugares(categoria);
create index lugares_imperdible_idx        on public.lugares(destino_id)
  where imperdible = true and estado = 'publicado';
create index lugares_destacado_idx         on public.lugares(destino_id)
  where destacado = true and estado = 'publicado';

create trigger trg_lugares_updated_at
  before update on public.lugares
  for each row execute function set_updated_at();


-- -----------------------------------------------------------------------------
-- 2) Tabla `lugar_fotos`
-- -----------------------------------------------------------------------------

create table public.lugar_fotos (
  id              uuid primary key default gen_random_uuid(),
  lugar_id        uuid not null references public.lugares(id) on delete cascade,
  storage_path    text not null,
  alt             text,
  orden           int not null default 0,
  es_principal    boolean not null default false,
  width           int not null,
  height          int not null,
  created_at      timestamptz not null default now()
);

comment on table public.lugar_fotos is
  'Galería de fotos para `lugares` (gastronomía y atractivos).';

create index lugar_fotos_lugar_idx on public.lugar_fotos(lugar_id);

-- Solo una foto principal por lugar (unique index parcial, igual que hospedaje_fotos)
create unique index lugar_fotos_principal_unique
  on public.lugar_fotos(lugar_id)
  where es_principal = true;


-- -----------------------------------------------------------------------------
-- 3) Tabla `responsabilidades` (many-to-many genérico perfil↔entidad)
-- -----------------------------------------------------------------------------

create table public.responsabilidades (
  id            uuid primary key default gen_random_uuid(),
  perfil_id     uuid not null references public.perfiles(id) on delete cascade,
  entidad_tipo  text not null check (entidad_tipo in ('hospedaje','lugar')),
  entidad_id    uuid not null,
  created_at    timestamptz not null default now(),
  constraint responsabilidades_unique unique (perfil_id, entidad_tipo, entidad_id)
);

comment on table public.responsabilidades is
  'Many-to-many entre perfiles (rol=responsable) y entidades que gestionan. Reemplaza el viejo perfiles.hospedajes_ids[] y permite responsables de cualquier vertical (hospedaje, lugar gastronómico, etc.) sin tocar el schema.';

create index responsabilidades_perfil_idx on public.responsabilidades(perfil_id);
create index responsabilidades_entidad_idx on public.responsabilidades(entidad_tipo, entidad_id);


-- -----------------------------------------------------------------------------
-- 4) Migrar perfiles.hospedajes_ids[] → responsabilidades
-- -----------------------------------------------------------------------------
-- Pobla la nueva tabla con los datos viejos. Idempotente vía ON CONFLICT.

insert into public.responsabilidades (perfil_id, entidad_tipo, entidad_id)
select p.id,
       'hospedaje',
       h_id::uuid
from public.perfiles p,
     unnest(coalesce(p.hospedajes_ids, array[]::uuid[])) as h_id
where p.rol = 'responsable'
  and h_id is not null
on conflict on constraint responsabilidades_unique do nothing;


-- -----------------------------------------------------------------------------
-- 5) Helpers SECURITY DEFINER para RLS
-- -----------------------------------------------------------------------------

-- ¿El usuario actual es responsable del lugar `p_lugar_id`?
create or replace function public.responsable_owns_lugar(p_lugar_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.responsabilidades r
    where r.perfil_id = auth.uid()
      and r.entidad_tipo = 'lugar'
      and r.entidad_id = p_lugar_id
  );
$$;

-- ¿El admin actual tiene scope sobre el destino al que pertenece `p_lugar_id`?
create or replace function public.admin_owns_lugar(p_lugar_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.lugares l
    join public.perfiles p on p.id = auth.uid()
    where l.id = p_lugar_id
      and p.rol = 'admin'
      and (p.destino_id is null or p.destino_id = l.destino_id)
  );
$$;

revoke all on function public.responsable_owns_lugar(uuid) from public;
revoke all on function public.admin_owns_lugar(uuid)       from public;
grant execute on function public.responsable_owns_lugar(uuid) to authenticated;
grant execute on function public.admin_owns_lugar(uuid)       to authenticated;


-- -----------------------------------------------------------------------------
-- 6) RLS — `lugares`
-- -----------------------------------------------------------------------------

alter table public.lugares enable row level security;

-- SELECT público: solo publicados.
create policy "Lugares: lectura pública publicados"
  on public.lugares for select
  to anon, authenticated
  using (estado = 'publicado');

-- SELECT responsable: ve sus lugares en cualquier estado.
create policy "Lugares: responsable ve los suyos"
  on public.lugares for select
  to authenticated
  using (responsable_owns_lugar(id));

-- SELECT admin: super admin todo, admin local solo su destino.
create policy "Lugares: admin lectura scoped"
  on public.lugares for select
  to authenticated
  using (is_admin() and (is_super_admin() or admin_owns_destino(destino_id)));

-- INSERT responsable: SOLO para tipo=gastronomico (atractivos los carga
-- el admin). El responsable se asigna la responsabilidad por aparte (vía
-- server action que valida invitación). Acá solo permitimos el insert si ya
-- es responsable del lugar — pero como el INSERT crea la fila nueva,
-- responsable_owns_lugar(NEW.id) sería false. Solución: limitamos INSERT
-- responsable a través de una validación distinta — el responsable inserta
-- en su NOMBRE y la server action graba inmediatamente la responsabilidad
-- usando service role. Mientras tanto, esta policy permite INSERT a cualquier
-- responsable con tipo=gastronomico (la lógica de scope vive en server actions).
create policy "Lugares: responsable inserta gastronomico"
  on public.lugares for insert
  to authenticated
  with check (
    is_responsable()
    and tipo = 'gastronomico'
    and estado in ('borrador','pendiente_validacion')
  );

-- UPDATE responsable: solo los suyos, solo tipo=gastronomico.
create policy "Lugares: responsable actualiza los suyos"
  on public.lugares for update
  to authenticated
  using (responsable_owns_lugar(id) and tipo = 'gastronomico')
  with check (responsable_owns_lugar(id) and tipo = 'gastronomico');

-- INSERT admin: cualquier tipo, cualquier estado (escoped por with check).
create policy "Lugares: admin inserta scoped"
  on public.lugares for insert
  to authenticated
  with check (is_admin() and (is_super_admin() or admin_owns_destino(destino_id)));

-- UPDATE admin: scoped por destino.
create policy "Lugares: admin actualiza scoped"
  on public.lugares for update
  to authenticated
  using (is_admin() and (is_super_admin() or admin_owns_destino(destino_id)))
  with check (is_admin() and (is_super_admin() or admin_owns_destino(destino_id)));

-- DELETE admin: scoped por destino. Responsables no borran.
create policy "Lugares: admin elimina scoped"
  on public.lugares for delete
  to authenticated
  using (is_admin() and (is_super_admin() or admin_owns_destino(destino_id)));


-- -----------------------------------------------------------------------------
-- 7) RLS — `lugar_fotos`
-- -----------------------------------------------------------------------------

alter table public.lugar_fotos enable row level security;

-- SELECT público: solo si el lugar padre está publicado.
create policy "LugarFotos: lectura pública si lugar publicado"
  on public.lugar_fotos for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.lugares l
      where l.id = lugar_fotos.lugar_id and l.estado = 'publicado'
    )
  );

-- SELECT responsable: si owns el lugar.
create policy "LugarFotos: responsable ve las suyas"
  on public.lugar_fotos for select
  to authenticated
  using (responsable_owns_lugar(lugar_id));

-- SELECT admin: scoped.
create policy "LugarFotos: admin lectura scoped"
  on public.lugar_fotos for select
  to authenticated
  using (is_admin() and admin_owns_lugar(lugar_id));

-- INSERT/UPDATE/DELETE responsable: si owns el lugar.
create policy "LugarFotos: responsable gestiona las suyas"
  on public.lugar_fotos for all
  to authenticated
  using (responsable_owns_lugar(lugar_id))
  with check (responsable_owns_lugar(lugar_id));

-- INSERT/UPDATE/DELETE admin: scoped.
create policy "LugarFotos: admin gestiona scoped"
  on public.lugar_fotos for all
  to authenticated
  using (is_admin() and admin_owns_lugar(lugar_id))
  with check (is_admin() and admin_owns_lugar(lugar_id));


-- -----------------------------------------------------------------------------
-- 8) RLS — `responsabilidades`
-- -----------------------------------------------------------------------------

alter table public.responsabilidades enable row level security;

-- SELECT propio: el usuario ve SUS responsabilidades (necesario para el panel
-- responsable, que enumera entidades del usuario logueado).
create policy "Responsabilidades: lectura propia"
  on public.responsabilidades for select
  to authenticated
  using (perfil_id = auth.uid());

-- SELECT admin: super admin todo, admin local restringido al destino de la
-- entidad (sea hospedaje o lugar).
create policy "Responsabilidades: admin lectura scoped"
  on public.responsabilidades for select
  to authenticated
  using (
    is_admin() and (
      is_super_admin()
      or (entidad_tipo = 'hospedaje' and admin_owns_hospedaje(entidad_id))
      or (entidad_tipo = 'lugar'     and admin_owns_lugar(entidad_id))
    )
  );

-- INSERT/UPDATE/DELETE: solo admin (la asignación de responsable es
-- decisión administrativa). Super admin global, admin local scoped por
-- entidad. Implementado vía with check.
create policy "Responsabilidades: admin escribe scoped"
  on public.responsabilidades for all
  to authenticated
  using (
    is_admin() and (
      is_super_admin()
      or (entidad_tipo = 'hospedaje' and admin_owns_hospedaje(entidad_id))
      or (entidad_tipo = 'lugar'     and admin_owns_lugar(entidad_id))
    )
  )
  with check (
    is_admin() and (
      is_super_admin()
      or (entidad_tipo = 'hospedaje' and admin_owns_hospedaje(entidad_id))
      or (entidad_tipo = 'lugar'     and admin_owns_lugar(entidad_id))
    )
  );


-- -----------------------------------------------------------------------------
-- 9) Verificación
-- -----------------------------------------------------------------------------
-- Si esto devuelve filas, la migración aplicó bien.

select
  (select count(*) from public.lugares)             as lugares_count,
  (select count(*) from public.lugar_fotos)         as lugar_fotos_count,
  (select count(*) from public.responsabilidades)   as responsabilidades_count,
  (select count(*) from public.perfiles where rol = 'responsable') as responsables_perfiles,
  (select count(*) from public.perfiles p, unnest(coalesce(p.hospedajes_ids, array[]::uuid[])) as h
   where p.rol = 'responsable') as filas_a_migrar_vs_responsabilidades_count;

-- Validación cruzada: si `filas_a_migrar_vs_responsabilidades_count` matchea
-- con `responsabilidades_count`, la migración pobló correctamente.
