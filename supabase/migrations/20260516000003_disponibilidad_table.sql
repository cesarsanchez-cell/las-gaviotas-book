-- =============================================================================
-- Mis Escapadas — Etapa 3 (E3.1): tabla disponibilidad + RLS
-- =============================================================================
-- Calendario manual de bloqueo de fechas por hospedaje.
--
-- Semántica:
--   - Si existe una fila para (hospedaje_id, fecha) → fecha BLOQUEADA.
--   - Si NO existe fila → fecha DISPONIBLE.
--   El responsable solo marca explícitamente lo que está ocupado, no lo libre.
--
-- Tipo:
--   'manual': bloqueado por el responsable o admin desde el calendario.
--   'reserva': bloqueado automáticamente por una reserva confirmada (Etapa 4).
--             reserva_id apunta a la reserva (FK que se sumará cuando exista la tabla).
--
-- Progressive OTA: el campo `reserva_id` ya está declarado pero sin FK
-- referencial todavía (la tabla reservas no existe). En Etapa 4 sumamos
-- el constraint sin migrar datos.
-- =============================================================================

create type tipo_disponibilidad as enum ('manual', 'reserva');

create table disponibilidad (
  id              uuid primary key default gen_random_uuid(),
  hospedaje_id    uuid not null references hospedajes(id) on delete cascade,
  fecha           date not null,
  tipo            tipo_disponibilidad not null default 'manual',
  reserva_id      uuid,
  notas           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),

  unique (hospedaje_id, fecha)
);

create index idx_disponibilidad_hospedaje on disponibilidad(hospedaje_id);
create index idx_disponibilidad_fecha on disponibilidad(fecha);
create index idx_disponibilidad_hospedaje_fecha
  on disponibilidad(hospedaje_id, fecha);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table disponibilidad enable row level security;

-- SELECT público: cualquier visitante anónimo puede ver el calendario de
-- hospedajes publicados (para mostrarlo en la página pública del hospedaje).
create policy "Disponibilidad: read público sobre hospedaje publicado"
  on disponibilidad for select
  using (
    exists (
      select 1 from hospedajes
      where hospedajes.id = disponibilidad.hospedaje_id
        and hospedajes.estado = 'publicado'
    )
  );

-- Responsable: gestiona disponibilidad de sus hospedajes (manual).
-- No se puede tocar manualmente filas tipo='reserva' (esas las maneja Etapa 4).
create policy "Disponibilidad: responsable lee propias"
  on disponibilidad for select
  to authenticated
  using (
    is_responsable() and responsable_owns_hospedaje(hospedaje_id)
  );

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

-- Admin: scope por destino del hospedaje (super admin ve todo).
create policy "Disponibilidad: admin lectura scoped"
  on disponibilidad for select
  to authenticated
  using (admin_owns_hospedaje(hospedaje_id));

create policy "Disponibilidad: admin escritura scoped"
  on disponibilidad for all
  to authenticated
  using (admin_owns_hospedaje(hospedaje_id))
  with check (admin_owns_hospedaje(hospedaje_id));

-- Nota: el conteo de días bloqueados en un rango se hace desde TypeScript
-- con createAdminClient + count('exact') en vez de una función SQL helper.
-- Más simple, evita pelearse con el tipado de RPC en Supabase v2.
