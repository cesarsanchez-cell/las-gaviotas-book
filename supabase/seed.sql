-- =============================================================================
-- Las Gaviotas BOOK — Seed Etapa 1
-- =============================================================================
-- 1 destino (Las Gaviotas), 3 localidades, 2 hospedajes publicados de ejemplo.
-- Las fotos referencian URLs de Unsplash hasta cargar reales desde admin.
--
-- IMPORTANTE: el admin user se crea desde el dashboard de Supabase Auth.
-- Después se inserta su perfil con rol='admin' usando su uuid de auth.users.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Destino: Las Gaviotas
-- -----------------------------------------------------------------------------
insert into destinos (id, slug, nombre, region, provincia, pais, descripcion_corta, lat, lng, activo, orden)
values (
  '11111111-1111-1111-1111-111111111111',
  'las-gaviotas',
  'Las Gaviotas',
  'Partido de la Costa',
  'Buenos Aires',
  'Argentina',
  'Balneario tranquilo de la costa atlántica argentina, ideal para descanso familiar entre médanos y pinos.',
  -36.7833,
  -56.6500,
  true,
  0
);

-- -----------------------------------------------------------------------------
-- Localidades de Las Gaviotas
-- -----------------------------------------------------------------------------
insert into localidades (destino_id, slug, nombre, orden) values
  ('11111111-1111-1111-1111-111111111111', 'centro',   'Centro',   0),
  ('11111111-1111-1111-1111-111111111111', 'medano',   'Médano',   1),
  ('11111111-1111-1111-1111-111111111111', 'sur',      'Sur',      2);

-- -----------------------------------------------------------------------------
-- Hospedajes de ejemplo (estado: publicado para que aparezcan en el front)
-- -----------------------------------------------------------------------------
insert into hospedajes (
  id, destino_id, localidad_id, slug, nombre, tipo,
  descripcion_corta, descripcion_larga,
  capacidad_min, capacidad_max, cantidad_unidades,
  direccion, lat, lng,
  whatsapp, email, instagram,
  amenities,
  estado,
  responsable_nombre, responsable_validado,
  destacado, orden_listado
)
values
(
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  (select id from localidades where destino_id = '11111111-1111-1111-1111-111111111111' and slug = 'centro'),
  'posta-cangrejo-apart',
  'Posta Cangrejo Apart',
  'apart',
  'Aparts modernos a metros del mar, con parrilla y deck propio.',
  'Departamentos completamente equipados, diseñados para familias y parejas que buscan descanso en Las Gaviotas. A 200m de la playa, con parrilla individual, deck con vista al médano y estacionamiento privado.',
  2, 6, 4,
  'Calle 33 entre Costanera y 1, Las Gaviotas',
  -36.7820, -56.6485,
  '+5491155555555',
  'reservas@postacangrejoapart.com.ar',
  'postacangrejoapart',
  array['wifi','playa_cerca','estacionamiento','parrilla','patio','aire_acondicionado','tv','cocina'],
  'publicado',
  'César Sánchez',
  true,
  true,
  10
),
(
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  (select id from localidades where destino_id = '11111111-1111-1111-1111-111111111111' and slug = 'medano'),
  'cabanas-del-medano',
  'Cabañas del Médano',
  'cabana',
  'Cabañas rodeadas de pinos, ideales para descanso familiar.',
  'Conjunto de cabañas de madera rodeadas de un bosque de pinos, a 5 minutos caminando del mar. Cada cabaña tiene parrilla, patio privado y capacidad para hasta 5 personas.',
  2, 5, 6,
  'Av. 1 y 32, Las Gaviotas',
  -36.7850, -56.6510,
  '+5491166666666',
  null,
  null,
  array['wifi','estacionamiento','parrilla','patio','apto_ninos','calefaccion'],
  'publicado',
  'Familia Pereyra',
  true,
  false,
  20
);

-- -----------------------------------------------------------------------------
-- Fotos de ejemplo (placeholders Unsplash hasta que se carguen las reales)
-- -----------------------------------------------------------------------------
insert into hospedaje_fotos (hospedaje_id, storage_path, alt, orden, es_principal, width, height) values
  ('22222222-2222-2222-2222-222222222222', 'placeholders/apart-1.jpg',  'Fachada de Posta Cangrejo Apart',   0, true,  1600, 1067),
  ('22222222-2222-2222-2222-222222222222', 'placeholders/apart-2.jpg',  'Living comedor del apart',          1, false, 1600, 1067),
  ('22222222-2222-2222-2222-222222222222', 'placeholders/apart-3.jpg',  'Deck con vista al médano',          2, false, 1600, 1067),
  ('33333333-3333-3333-3333-333333333333', 'placeholders/cabana-1.jpg', 'Cabaña entre los pinos',            0, true,  1600, 1067),
  ('33333333-3333-3333-3333-333333333333', 'placeholders/cabana-2.jpg', 'Interior de la cabaña',             1, false, 1600, 1067);
