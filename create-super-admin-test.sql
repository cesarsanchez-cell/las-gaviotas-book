-- Crear super admin de test
INSERT INTO perfiles (
  email,
  nombre,
  tipo_rol,
  destino_id,
  estado
) VALUES (
  'superadmin.test@test.com',
  'Super Admin Test',
  'super_administrador',
  NULL,
  'activo'
) ON CONFLICT(email) DO NOTHING;

-- Verificar que fue creado
SELECT id, email, tipo_rol, destino_id FROM perfiles WHERE email = 'superadmin.test@test.com';
