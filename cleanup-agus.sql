-- 1. Encontrar el usuario por email
SELECT id, email FROM auth.users WHERE email = 'agusmasotta@hotmail.es';

-- 2. Encontrar hospedajes asociados (guarda los IDs)
SELECT id, hospedaje_ids FROM perfiles WHERE email = 'agusmasotta@hotmail.es';

-- 3. Eliminar hospedajes (CASCADE borra fotos en storage rules)
DELETE FROM hospedajes 
WHERE id IN (
  SELECT unnest(hospedaje_ids) 
  FROM perfiles 
  WHERE email = 'agusmasotta@hotmail.es'
);

-- 4. Eliminar perfil
DELETE FROM perfiles WHERE email = 'agusmasotta@hotmail.es';

-- 5. Verificar que se limpió
SELECT COUNT(*) FROM perfiles WHERE email = 'agusmasotta@hotmail.es';
SELECT COUNT(*) FROM hospedajes WHERE responsable_email = 'agusmasotta@hotmail.es';
