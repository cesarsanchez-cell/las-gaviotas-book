-- =============================================================================
-- Mis Escapadas — "Qué hacer" (atractivo) pasa a comercial con responsable
-- =============================================================================
-- Contexto (2da mitad de Fase 3):
--   Decisión 2026-06-20: "Qué hacer" (lugares tipo=atractivo) es COMERCIAL y
--   tiene responsable, igual que Gastronomía. Hasta ahora las policies de
--   responsable sobre `lugares` estaban limitadas a tipo='gastronomico'. Las
--   abrimos a cualquier tipo de lugar (gastronomico o atractivo).
--
--   Recordar: las server actions mutan vía service role (bypass RLS) y validan
--   scope en código; esto es defensa en profundidad + permite el cliente RLS.
--
--   No se toca la estructura de `lugares` ni el tipo. Atracciones (curadas) son
--   otra tabla, no se ven afectadas.
-- =============================================================================

-- INSERT responsable: cualquier tipo de lugar (antes solo gastronomico).
drop policy if exists "Lugares: responsable inserta gastronomico" on public.lugares;
drop policy if exists "Lugares: responsable inserta" on public.lugares;
create policy "Lugares: responsable inserta"
  on public.lugares for insert
  to authenticated
  with check (
    is_responsable()
    and estado in ('borrador','pendiente_validacion')
  );

-- UPDATE responsable: sus lugares, cualquier tipo (antes solo gastronomico).
drop policy if exists "Lugares: responsable actualiza los suyos" on public.lugares;
create policy "Lugares: responsable actualiza los suyos"
  on public.lugares for update
  to authenticated
  using (responsable_owns_lugar(id))
  with check (responsable_owns_lugar(id));

-- Verificación
select
  (select count(*) from pg_policies
     where tablename = 'lugares'
       and policyname = 'Lugares: responsable inserta')             as insert_policy,
  (select count(*) from pg_policies
     where tablename = 'lugares'
       and policyname = 'Lugares: responsable actualiza los suyos') as update_policy,
  -- Debe dar 0: ya no debe quedar ninguna policy de lugares atada a 'gastronomico'.
  (select count(*) from pg_policies
     where tablename = 'lugares'
       and qual like '%gastronomico%')                              as policies_con_gastro_qual;
