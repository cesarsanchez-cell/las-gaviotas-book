-- Add notas_rechazo column to lugares table for storing rejection reasons
ALTER TABLE lugares ADD COLUMN notas_rechazo TEXT;

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'lugares' AND column_name = 'notas_rechazo';
