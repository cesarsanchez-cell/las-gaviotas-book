-- =============================================================================
-- Combos: Allow ahorro_pct to be 0 or NULL
-- =============================================================================
-- Cambio: El descuento % ahora puede ser 0 (sin descuento) o NULL (vacío).
-- Antes: CHECK (ahorro_pct BETWEEN 1 AND 100) rechazaba 0 y NULL.
-- Ahora: CHECK (ahorro_pct IS NULL OR (ahorro_pct >= 1 AND ahorro_pct <= 100))

alter table public.combos
  drop constraint if exists combos_ahorro_pct_check;

alter table public.combos
  add constraint combos_ahorro_pct_check
    check (ahorro_pct IS NULL OR (ahorro_pct >= 1 AND ahorro_pct <= 100));

-- Verificación
select 
  (select count(*) from public.combos where ahorro_pct is not null) as combos_with_discount,
  (select count(*) from public.combos where ahorro_pct is null) as combos_without_discount;
