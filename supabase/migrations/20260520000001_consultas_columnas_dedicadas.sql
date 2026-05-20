-- =============================================================================
-- Consultas: columnas dedicadas para contexto del flow por unidad
-- =============================================================================
-- Contexto:
--   La consulta contextualizada por unidad (flow Booking-style cerrado en Etapa
--   5, 2026-05-19) hoy guarda unidad_type / canal_preferido / desglose pax
--   prependidos al campo `mensaje` como texto plano. Funciona pero limita:
--     - No se puede filtrar/ordenar consultas por unidad en la bandeja
--     - El mail al responsable mezcla contexto + mensaje libre del usuario
--     - No hay foreign key a unidad_types (no podemos limpiar consultas
--       cuando el tipo se elimina)
--
-- Esta migración suma columnas dedicadas. Nullable para no romper las
-- consultas genéricas (form viejo del hospedaje completo) ni las cargadas
-- antes de esta migración.
--
-- Idempotente: usa IF NOT EXISTS para poder re-correr sin error.
-- =============================================================================

-- 1) Columnas nuevas
alter table public.consultas
  add column if not exists unidad_type_id  uuid references public.unidad_types(id) on delete set null,
  add column if not exists canal_preferido text check (canal_preferido in ('mail','whatsapp')),
  add column if not exists adultos         int,
  add column if not exists ninos           int,
  add column if not exists bebes           int;

comment on column public.consultas.unidad_type_id is
  'Tipo de unidad sobre la que se consulta. NULL para consultas genéricas al hospedaje (form viejo). Set null si el tipo se elimina (preservamos la consulta histórica).';
comment on column public.consultas.canal_preferido is
  'Canal preferido de respuesta indicado por el usuario. NULL para consultas viejas o si no se eligió.';
comment on column public.consultas.adultos is
  'Desglose de huéspedes. Suma de adultos+ninos+bebes ≈ cantidad_huespedes (legacy). NULL para consultas viejas sin desglose.';

-- 2) Índices útiles para la bandeja
create index if not exists consultas_unidad_type_idx
  on public.consultas(unidad_type_id)
  where unidad_type_id is not null;


-- 3) Verificación
select
  count(*) filter (where unidad_type_id is not null)  as con_unidad,
  count(*) filter (where canal_preferido is not null) as con_canal,
  count(*) filter (where adultos is not null)         as con_desglose,
  count(*)                                            as total
from public.consultas;
