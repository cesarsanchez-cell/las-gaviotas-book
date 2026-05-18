-- =============================================================================
-- Mis Escapadas — Etapa 1 Foundation: Arquitectura de Unidades
-- =============================================================================
-- Refactor mayor: la disponibilidad pasa de estar atada al `hospedaje` a estar
-- atada a la `unidad` física. Introduce las 6 nuevas tablas que sostienen el
-- modelo profesional (unidad_types, unidad_type_fotos, unidades, disponibilidad
-- refactorizada, tarifas, restricciones).
--
-- IMPORTANTE: esta migración hace WIPE de todos los datos de hospedajes /
-- destinos / consultas / disponibilidad. NO toca usuarios (auth.users) ni
-- perfiles (rol + destino_id de admins se preservan). Los responsables quedan
-- con hospedajes_ids = '{}' y hay que reasignarlos manualmente al recargar.
--
-- Después de aplicar esta migración hay que:
--   1. Recargar el destino "Las Gaviotas"
--   2. Recargar el hospedaje "Posta Cangrejo Apart"
--   3. Reasignar responsable_id en perfiles.hospedajes_ids
--   4. Cargar unidad_types + unidades desde la UI (Etapa 2)
--
-- Estructura conceptual:
--   hospedajes (existente, sin cambios estructurales)
--    └── unidad_types       "Dúplex 6 pax", "Apart 2 amb"
--         ├── unidad_type_fotos
--         ├── unidades       "Dúplex 1", "Dúplex 2" — instancias físicas
--         │    └── disponibilidad
--         ├── tarifas        por temporada
--         └── restricciones  por temporada (estadía mínima, días fijos)
-- =============================================================================

-- =============================================================================
-- 1. WIPE de datos test (preserva auth.users + perfiles)
-- =============================================================================
-- ⚠️ BUG ENCONTRADO 2026-05-18: este wipe truncó `perfiles` por arrastre porque
-- `perfiles.destino_id` tiene FK a `destinos(id)`, y `TRUNCATE destinos CASCADE`
-- trunca toda tabla con FK hacia destinos sin importar la cláusula ON DELETE.
-- Resultado: los users de auth.users quedaron sin perfil → nadie podía
-- loguearse. Recovery manual con INSERT directo en perfiles tomando id de
-- auth.users.
--
-- Si esta migración se re-corre en otro environment, hay que:
--   (a) hacer DELETE en vez de TRUNCATE sobre destinos/hospedajes (DELETE
--       respeta ON DELETE SET NULL/RESTRICT), O
--   (b) re-poblar perfiles inmediatamente después del wipe leyendo auth.users.
-- =============================================================================

truncate table consultas restart identity cascade;
truncate table disponibilidad restart identity cascade;
truncate table validacion_eventos restart identity cascade;
truncate table hospedaje_fotos restart identity cascade;
truncate table hospedajes restart identity cascade;
truncate table localidades restart identity cascade;
truncate table destinos restart identity cascade;

-- Responsables quedan con hospedajes vacíos hasta que el super admin los reasigne.
-- Admins locales pierden destino_id (porque el destino ya no existe) → quedan
-- como super admin temporal. Al recargar Las Gaviotas, reasignar destino_id
-- desde la UI /admin/admins.
update perfiles
   set hospedajes_ids = '{}'
 where rol = 'responsable';

update perfiles
   set destino_id = null
 where rol = 'admin'
   and destino_id is not null;

-- =============================================================================
-- 2. DROP de la tabla disponibilidad actual (cambia FK hospedaje_id → unidad_id)
-- =============================================================================

drop table if exists disponibilidad cascade;
-- El enum tipo_disponibilidad lo conservamos: lo reutilizamos abajo.

-- =============================================================================
-- 3. CREATE TABLE unidad_types
-- =============================================================================
-- "Categoría comercial" de unidad. Lleva la descripción, capacidad, amenities,
-- fotos. Pueden existir N unidades físicas (instancias) de un mismo tipo.
-- =============================================================================

create table unidad_types (
  id                    uuid primary key default gen_random_uuid(),
  hospedaje_id          uuid not null references hospedajes(id) on delete cascade,
  nombre                text not null check (length(nombre) between 2 and 80),
  descripcion           text,
  capacidad_adultos     int not null check (capacidad_adultos between 1 and 30),
  capacidad_ninos       int not null default 0 check (capacidad_ninos between 0 and 30),
  camas_descripcion     text,
  amenities             text[] not null default '{}',
  activo                boolean not null default true,
  orden                 int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_unidad_types_hospedaje on unidad_types(hospedaje_id);
create index idx_unidad_types_activo on unidad_types(activo) where activo = true;

create trigger trg_unidad_types_updated_at
before update on unidad_types
for each row execute function set_updated_at();

-- =============================================================================
-- 4. CREATE TABLE unidad_type_fotos
-- =============================================================================
-- Mismo patrón que hospedaje_fotos. Las fotos viven a nivel "tipo de unidad",
-- todas las unidades físicas del tipo las heredan visualmente.
-- =============================================================================

create table unidad_type_fotos (
  id                  uuid primary key default gen_random_uuid(),
  unidad_type_id      uuid not null references unidad_types(id) on delete cascade,
  storage_path        text not null,
  alt                 text,
  orden               int not null default 0,
  es_principal        boolean not null default false,
  width               int not null,
  height              int not null,
  created_at          timestamptz not null default now()
);

create index idx_unidad_type_fotos_unidad_type on unidad_type_fotos(unidad_type_id);
create unique index uq_unidad_type_fotos_principal
  on unidad_type_fotos(unidad_type_id)
  where es_principal = true;

-- =============================================================================
-- 5. CREATE TABLE unidades
-- =============================================================================
-- Instancia física. "Dúplex 1", "Dúplex 2", etc. Hereda capacidad/fotos/amenities
-- del unidad_type. Lo único propio es: nombre, calendario, activa.
--
-- `hospedaje_id` está denormalizado para que las queries y RLS sean simples
-- (evita un join extra en cada policy). Se mantiene consistente vía trigger.
-- =============================================================================

create table unidades (
  id                uuid primary key default gen_random_uuid(),
  unidad_type_id    uuid not null references unidad_types(id) on delete cascade,
  hospedaje_id      uuid not null references hospedajes(id) on delete cascade,
  nombre            text not null check (length(nombre) between 1 and 60),
  activa            boolean not null default true,
  notas_internas    text,
  orden             int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_unidades_hospedaje on unidades(hospedaje_id);
create index idx_unidades_unidad_type on unidades(unidad_type_id);
create index idx_unidades_activa on unidades(activa) where activa = true;

create trigger trg_unidades_updated_at
before update on unidades
for each row execute function set_updated_at();

-- Trigger: hospedaje_id de unidades debe coincidir con el del unidad_type.
-- Defensa-en-profundidad para evitar inconsistencias por bugs en server actions.
create or replace function check_unidad_hospedaje_consistencia()
returns trigger
language plpgsql
as $$
declare
  v_hospedaje_id uuid;
begin
  select hospedaje_id into v_hospedaje_id
    from unidad_types
   where id = new.unidad_type_id;

  if v_hospedaje_id is null then
    raise exception 'unidad_type % no existe', new.unidad_type_id;
  end if;

  if new.hospedaje_id != v_hospedaje_id then
    raise exception 'hospedaje_id de unidad (%) no coincide con el del unidad_type (%)',
      new.hospedaje_id, v_hospedaje_id;
  end if;

  return new;
end;
$$;

create trigger trg_unidades_check_consistencia
before insert or update of unidad_type_id, hospedaje_id on unidades
for each row execute function check_unidad_hospedaje_consistencia();

-- =============================================================================
-- 6. CREATE TABLE disponibilidad (refactor: por unidad)
-- =============================================================================
-- Semántica idéntica a antes: si existe fila para (unidad_id, fecha) → bloqueada.
-- Cambio: FK ahora es a `unidades`, no a `hospedajes`. `hospedaje_id` queda
-- denormalizado para queries rápidas (badge en consultas necesita filtrar por
-- hospedaje + capacidad sin tener que joinear).
-- =============================================================================

create table disponibilidad (
  id              uuid primary key default gen_random_uuid(),
  unidad_id       uuid not null references unidades(id) on delete cascade,
  hospedaje_id    uuid not null references hospedajes(id) on delete cascade,
  fecha           date not null,
  tipo            tipo_disponibilidad not null default 'manual',
  reserva_id      uuid,
  notas           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),

  unique (unidad_id, fecha)
);

create index idx_disponibilidad_unidad on disponibilidad(unidad_id);
create index idx_disponibilidad_hospedaje on disponibilidad(hospedaje_id);
create index idx_disponibilidad_fecha on disponibilidad(fecha);
create index idx_disponibilidad_hospedaje_fecha on disponibilidad(hospedaje_id, fecha);

-- Trigger: hospedaje_id debe coincidir con el de la unidad
create or replace function check_disponibilidad_consistencia()
returns trigger
language plpgsql
as $$
declare
  v_hospedaje_id uuid;
begin
  select hospedaje_id into v_hospedaje_id
    from unidades
   where id = new.unidad_id;

  if v_hospedaje_id is null then
    raise exception 'unidad % no existe', new.unidad_id;
  end if;

  if new.hospedaje_id != v_hospedaje_id then
    raise exception 'hospedaje_id de disponibilidad (%) no coincide con el de la unidad (%)',
      new.hospedaje_id, v_hospedaje_id;
  end if;

  return new;
end;
$$;

create trigger trg_disponibilidad_check_consistencia
before insert or update of unidad_id, hospedaje_id on disponibilidad
for each row execute function check_disponibilidad_consistencia();

-- =============================================================================
-- 7. CREATE TABLE tarifas
-- =============================================================================
-- Precio de la unidad ENTERA por noche, por rango de fechas. NO modela
-- recargo por pax (el modelo es alquiler temporario AR, no hotelero).
-- Si la unidad de 6 se ocupa con 4, el responsable negocia por WhatsApp.
--
-- Tarifa a nivel `unidad_type` porque dos Dúplex idénticos valen lo mismo.
-- Si en el futuro hace falta override por unidad física, se agrega
-- `tarifa_unidad_override` sin romper nada.
-- =============================================================================

create table tarifas (
  id                uuid primary key default gen_random_uuid(),
  unidad_type_id    uuid not null references unidad_types(id) on delete cascade,
  hospedaje_id      uuid not null references hospedajes(id) on delete cascade,
  nombre            text not null check (length(nombre) between 2 and 80),
  desde             date not null,
  hasta             date not null,
  precio_noche      numeric(12, 2) not null check (precio_noche >= 0),
  moneda            text not null default 'ARS' check (moneda in ('ARS', 'USD')),
  notas             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  check (hasta >= desde)
);

create index idx_tarifas_unidad_type on tarifas(unidad_type_id);
create index idx_tarifas_hospedaje on tarifas(hospedaje_id);
create index idx_tarifas_rango on tarifas(desde, hasta);

create trigger trg_tarifas_updated_at
before update on tarifas
for each row execute function set_updated_at();

-- Trigger: hospedaje_id de tarifas debe coincidir con el del unidad_type
create or replace function check_tarifa_consistencia()
returns trigger
language plpgsql
as $$
declare
  v_hospedaje_id uuid;
begin
  select hospedaje_id into v_hospedaje_id
    from unidad_types
   where id = new.unidad_type_id;

  if new.hospedaje_id != v_hospedaje_id then
    raise exception 'hospedaje_id de tarifa (%) no coincide con el del unidad_type (%)',
      new.hospedaje_id, v_hospedaje_id;
  end if;

  return new;
end;
$$;

create trigger trg_tarifas_check_consistencia
before insert or update of unidad_type_id, hospedaje_id on tarifas
for each row execute function check_tarifa_consistencia();

-- =============================================================================
-- 8. CREATE TABLE restricciones
-- =============================================================================
-- Restricciones opt-in por rango de fechas. El responsable decide cuándo aplicar
-- estadía mínima, ingreso/egreso fijo (típicamente alta temporada).
--
-- dia_ingreso / dia_egreso usan ISO weekday: 1=lunes ... 7=domingo. NULL =
-- cualquier día. Al menos una de las 3 restricciones debe estar definida.
-- =============================================================================

create table restricciones (
  id                        uuid primary key default gen_random_uuid(),
  unidad_type_id            uuid not null references unidad_types(id) on delete cascade,
  hospedaje_id              uuid not null references hospedajes(id) on delete cascade,
  nombre                    text not null check (length(nombre) between 2 and 80),
  desde                     date not null,
  hasta                     date not null,
  estadia_minima_noches     int check (estadia_minima_noches between 1 and 365),
  dia_ingreso               smallint check (dia_ingreso between 1 and 7),
  dia_egreso                smallint check (dia_egreso between 1 and 7),
  notas                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  check (hasta >= desde),
  check (
    estadia_minima_noches is not null
    or dia_ingreso is not null
    or dia_egreso is not null
  )
);

create index idx_restricciones_unidad_type on restricciones(unidad_type_id);
create index idx_restricciones_hospedaje on restricciones(hospedaje_id);
create index idx_restricciones_rango on restricciones(desde, hasta);

create trigger trg_restricciones_updated_at
before update on restricciones
for each row execute function set_updated_at();

create or replace function check_restriccion_consistencia()
returns trigger
language plpgsql
as $$
declare
  v_hospedaje_id uuid;
begin
  select hospedaje_id into v_hospedaje_id
    from unidad_types
   where id = new.unidad_type_id;

  if new.hospedaje_id != v_hospedaje_id then
    raise exception 'hospedaje_id de restriccion (%) no coincide con el del unidad_type (%)',
      new.hospedaje_id, v_hospedaje_id;
  end if;

  return new;
end;
$$;

create trigger trg_restricciones_check_consistencia
before insert or update of unidad_type_id, hospedaje_id on restricciones
for each row execute function check_restriccion_consistencia();

-- =============================================================================
-- 9. Helpers SECURITY DEFINER para RLS
-- =============================================================================
-- Reutilizan `responsable_owns_hospedaje` y `admin_owns_hospedaje` existentes:
-- como todas las tablas nuevas tienen hospedaje_id denormalizado, el chequeo
-- es directo (sin joins extra en cada policy).
-- =============================================================================

-- No necesitamos helpers nuevos: pasamos hospedaje_id directo a los helpers
-- existentes (responsable_owns_hospedaje, admin_owns_hospedaje, is_admin,
-- is_responsable, is_super_admin).

-- =============================================================================
-- 10. RLS — unidad_types
-- =============================================================================

alter table unidad_types enable row level security;

create policy "Unidad types: lectura pública sobre hospedaje publicado"
  on unidad_types for select
  using (
    activo = true
    and exists (
      select 1 from hospedajes
       where hospedajes.id = unidad_types.hospedaje_id
         and hospedajes.estado = 'publicado'
    )
  );

create policy "Unidad types: responsable gestiona los suyos"
  on unidad_types for all
  to authenticated
  using (is_responsable() and responsable_owns_hospedaje(hospedaje_id))
  with check (is_responsable() and responsable_owns_hospedaje(hospedaje_id));

create policy "Unidad types: admin lectura scoped"
  on unidad_types for select
  to authenticated
  using (admin_owns_hospedaje(hospedaje_id));

-- =============================================================================
-- 11. RLS — unidad_type_fotos
-- =============================================================================

alter table unidad_type_fotos enable row level security;

create policy "Unidad type fotos: lectura pública sobre hospedaje publicado"
  on unidad_type_fotos for select
  using (
    exists (
      select 1
        from unidad_types ut
        join hospedajes h on h.id = ut.hospedaje_id
       where ut.id = unidad_type_fotos.unidad_type_id
         and ut.activo = true
         and h.estado = 'publicado'
    )
  );

create policy "Unidad type fotos: responsable gestiona las suyas"
  on unidad_type_fotos for all
  to authenticated
  using (
    is_responsable()
    and exists (
      select 1 from unidad_types ut
       where ut.id = unidad_type_fotos.unidad_type_id
         and responsable_owns_hospedaje(ut.hospedaje_id)
    )
  )
  with check (
    is_responsable()
    and exists (
      select 1 from unidad_types ut
       where ut.id = unidad_type_fotos.unidad_type_id
         and responsable_owns_hospedaje(ut.hospedaje_id)
    )
  );

create policy "Unidad type fotos: admin lectura scoped"
  on unidad_type_fotos for select
  to authenticated
  using (
    exists (
      select 1 from unidad_types ut
       where ut.id = unidad_type_fotos.unidad_type_id
         and admin_owns_hospedaje(ut.hospedaje_id)
    )
  );

-- =============================================================================
-- 12. RLS — unidades
-- =============================================================================

alter table unidades enable row level security;

create policy "Unidades: lectura pública sobre hospedaje publicado"
  on unidades for select
  using (
    activa = true
    and exists (
      select 1 from hospedajes
       where hospedajes.id = unidades.hospedaje_id
         and hospedajes.estado = 'publicado'
    )
  );

create policy "Unidades: responsable gestiona las suyas"
  on unidades for all
  to authenticated
  using (is_responsable() and responsable_owns_hospedaje(hospedaje_id))
  with check (is_responsable() and responsable_owns_hospedaje(hospedaje_id));

create policy "Unidades: admin lectura scoped"
  on unidades for select
  to authenticated
  using (admin_owns_hospedaje(hospedaje_id));

-- =============================================================================
-- 13. RLS — disponibilidad
-- =============================================================================

alter table disponibilidad enable row level security;

create policy "Disponibilidad: lectura pública sobre hospedaje publicado"
  on disponibilidad for select
  using (
    exists (
      select 1 from hospedajes
       where hospedajes.id = disponibilidad.hospedaje_id
         and hospedajes.estado = 'publicado'
    )
  );

create policy "Disponibilidad: responsable lee propias"
  on disponibilidad for select
  to authenticated
  using (is_responsable() and responsable_owns_hospedaje(hospedaje_id));

create policy "Disponibilidad: responsable gestiona manual"
  on disponibilidad for all
  to authenticated
  using (
    is_responsable()
    and responsable_owns_hospedaje(hospedaje_id)
    and tipo = 'manual'
  )
  with check (
    is_responsable()
    and responsable_owns_hospedaje(hospedaje_id)
    and tipo = 'manual'
  );

create policy "Disponibilidad: admin lectura scoped"
  on disponibilidad for select
  to authenticated
  using (admin_owns_hospedaje(hospedaje_id));

-- =============================================================================
-- 14. RLS — tarifas
-- =============================================================================

alter table tarifas enable row level security;

create policy "Tarifas: lectura pública sobre hospedaje publicado"
  on tarifas for select
  using (
    exists (
      select 1 from hospedajes
       where hospedajes.id = tarifas.hospedaje_id
         and hospedajes.estado = 'publicado'
    )
  );

create policy "Tarifas: responsable gestiona las suyas"
  on tarifas for all
  to authenticated
  using (is_responsable() and responsable_owns_hospedaje(hospedaje_id))
  with check (is_responsable() and responsable_owns_hospedaje(hospedaje_id));

create policy "Tarifas: admin lectura scoped"
  on tarifas for select
  to authenticated
  using (admin_owns_hospedaje(hospedaje_id));

-- =============================================================================
-- 15. RLS — restricciones
-- =============================================================================

alter table restricciones enable row level security;

create policy "Restricciones: lectura pública sobre hospedaje publicado"
  on restricciones for select
  using (
    exists (
      select 1 from hospedajes
       where hospedajes.id = restricciones.hospedaje_id
         and hospedajes.estado = 'publicado'
    )
  );

create policy "Restricciones: responsable gestiona las suyas"
  on restricciones for all
  to authenticated
  using (is_responsable() and responsable_owns_hospedaje(hospedaje_id))
  with check (is_responsable() and responsable_owns_hospedaje(hospedaje_id));

create policy "Restricciones: admin lectura scoped"
  on restricciones for select
  to authenticated
  using (admin_owns_hospedaje(hospedaje_id));

-- =============================================================================
-- 16. Verificación (debe devolver las 6 tablas con su cuenta de policies)
-- =============================================================================

select
  c.relname as tabla,
  count(p.polname) as policies
from pg_class c
left join pg_policy p on p.polrelid = c.oid
where c.relkind = 'r'
  and c.relname in (
    'unidad_types', 'unidad_type_fotos', 'unidades',
    'disponibilidad', 'tarifas', 'restricciones'
  )
group by c.relname
order by c.relname;

-- Esperado:
--   disponibilidad      | 4
--   restricciones       | 3
--   tarifas             | 3
--   unidad_type_fotos   | 3
--   unidad_types        | 3
--   unidades            | 3
