-- =============================================================================
-- Mis Escapadas — Unificar is_responsable() con responsabilidades
-- =============================================================================
-- Contexto:
--   Hasta acá, las funciones SQL `is_responsable()` y `responsable_owns_hospedaje()`
--   solo devolvían true para perfiles con `rol = 'responsable'` y leían de la
--   columna legacy `perfiles.hospedajes_ids[]`. Eso bloqueaba a los Admins
--   Locales con doble función (admin + responsable) en las RLS policies que
--   chequean rol responsable.
--
--   En el frontend ya consolidamos en la tabla `responsabilidades` como fuente
--   de verdad (commit 8597ca8). Esta migración hace lo mismo en SQL:
--
--     - is_responsable() devuelve true si el user tiene rol=responsable O si
--       tiene al menos una fila en responsabilidades. Así un Admin Local con
--       entidades propias pasa también este check.
--
--     - responsable_owns_hospedaje(uuid) chequea contra responsabilidades en
--       lugar de hospedajes_ids[]. Esto desacopla la lógica de ownership del
--       campo legacy.
--
-- Sin riesgo: las policies que combinan estas funciones siempre incluyen el
-- check de ownership específico, así que esto solo amplía a quién consideramos
-- "responsable" — no agrega permisos sin verificación.
--
-- =============================================================================

create or replace function is_responsable()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'responsable'
  )
  or exists (
    select 1 from public.responsabilidades
    where perfil_id = auth.uid()
  );
$$;

create or replace function responsable_owns_hospedaje(p_hospedaje_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.responsabilidades
    where perfil_id = auth.uid()
      and entidad_tipo = 'hospedaje'
      and entidad_id = p_hospedaje_id
  );
$$;

-- Verificación
select
  is_responsable() as soy_responsable,
  (select count(*) from public.responsabilidades) as total_responsabilidades;
