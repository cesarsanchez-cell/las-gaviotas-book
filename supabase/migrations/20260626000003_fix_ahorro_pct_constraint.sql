-- Fix: permitir ahorro_pct = 0 (descuento opcional)
ALTER TABLE combos
DROP CONSTRAINT IF EXISTS combos_ahorro_pct_check,
ADD CONSTRAINT combos_ahorro_pct_check CHECK (ahorro_pct IS NULL OR (ahorro_pct >= 0 AND ahorro_pct <= 100));

-- Verificación
SELECT COUNT(*) as combos_count FROM combos;
