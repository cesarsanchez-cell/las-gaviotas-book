-- =============================================================================
-- Mis Escapadas — Etapa 2 (B2.1): tabla consultas + RLS
-- =============================================================================
-- Form público de consulta por hospedaje, sin login del huésped.
--
-- Diseño de fechas:
--   check_in + check_out son DATE (no texto libre) desde el día 1 porque
--   Etapa 3 (Disponibilidad) y Etapa 4 (Reservas) van a cruzar esas fechas
--   con el calendario del hospedaje. Patrón "Progressive OTA": schema
--   preparado para etapas futuras sin reescribir.
--
-- Anti-spam y auditoría:
--   ip + user_agent se guardan para rate limit por IP (en memoria del
--   server action) y para auditoría posterior. NO se exponen al
--   responsable (solo admin con scope).
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Enum estado_consulta
-- ----------------------------------------------------------------------------
create type estado_consulta as enum (
  'nueva',
  'leida',
  'respondida',
  'descartada'
);

-- ----------------------------------------------------------------------------
-- Tabla consultas
-- ----------------------------------------------------------------------------
create table consultas (
  id                      uuid primary key default gen_random_uuid(),
  hospedaje_id            uuid not null references hospedajes(id) on delete cascade,

  nombre                  text not null,
  email                   text not null,
  whatsapp                text,
  mensaje                 text not null,

  check_in                date not null,
  check_out               date not null,
  cantidad_huespedes      int not null,

  consentimiento_datos    boolean not null default false,

  estado                  estado_consulta not null default 'nueva',
  origen                  text not null default 'form_publico',

  ip                      text,
  user_agent              text,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint chk_consultas_fechas_orden check (check_out > check_in),
  constraint chk_consultas_huespedes check (cantidad_huespedes between 1 and 20),
  constraint chk_consultas_consentimiento check (consentimiento_datos = true),
  constraint chk_consultas_nombre check (length(nombre) between 2 and 120),
  constraint chk_consultas_mensaje check (length(mensaje) between 10 and 1000)
);

create index idx_consultas_hospedaje on consultas(hospedaje_id);
create index idx_consultas_estado on consultas(estado);
create index idx_consultas_created on consultas(created_at desc);
create index idx_consultas_checkin on consultas(check_in);

create trigger trg_consultas_updated_at
  before update on consultas
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table consultas enable row level security;

-- INSERT: cualquiera (público anónimo y autenticado). Sin filtro de scope.
-- La validación de datos va en el server action; acá solo verificamos que
-- el hospedaje exista y esté publicado (para no aceptar consultas sobre
-- borradores).
create policy "Consultas: insert público sobre hospedaje publicado"
  on consultas for insert
  to anon, authenticated
  with check (
    consentimiento_datos = true
    and exists (
      select 1 from hospedajes
      where hospedajes.id = consultas.hospedaje_id
        and hospedajes.estado = 'publicado'
    )
  );

-- SELECT responsable: solo consultas de hospedajes que el responsable tiene
-- asignados en su perfil (mismo patrón que hospedajes/fotos).
create policy "Consultas: responsable lee las propias"
  on consultas for select
  to authenticated
  using (
    is_responsable()
    and responsable_owns_hospedaje(hospedaje_id)
  );

-- UPDATE responsable: puede cambiar estado (marcar leída/respondida/descartada)
-- pero NO debería poder editar otros campos (datos del huésped, fechas, etc.).
-- Postgres RLS no permite restringir columnas en WITH CHECK fácilmente —
-- la defensa real va en el server action que solo updateará `estado`.
create policy "Consultas: responsable update propias"
  on consultas for update
  to authenticated
  using (
    is_responsable()
    and responsable_owns_hospedaje(hospedaje_id)
  )
  with check (
    is_responsable()
    and responsable_owns_hospedaje(hospedaje_id)
  );

-- SELECT admin: scope por destino (mismo patrón que hospedajes).
create policy "Consultas: admin lectura scoped"
  on consultas for select
  to authenticated
  using (admin_owns_hospedaje(hospedaje_id));

-- UPDATE admin: scoped (puede cambiar estado, eventualmente moderar).
create policy "Consultas: admin update scoped"
  on consultas for update
  to authenticated
  using (admin_owns_hospedaje(hospedaje_id))
  with check (admin_owns_hospedaje(hospedaje_id));

-- DELETE admin: scoped (super admin o admin local del destino).
-- Responsable NO puede borrar — descartar via estado='descartada'.
create policy "Consultas: admin delete scoped"
  on consultas for delete
  to authenticated
  using (admin_owns_hospedaje(hospedaje_id));
