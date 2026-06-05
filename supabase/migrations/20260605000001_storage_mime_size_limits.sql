-- =============================================================================
-- F-S3 — Validación server-side de MIME / tamaño en upload de fotos
-- =============================================================================
-- Hasta ahora la única validación era `file.type.startsWith("image/")` en el
-- cliente, que se saltea trivialmente (un POST directo al endpoint de Storage
-- subía cualquier cosa: SVG con script, HTML, ejecutables, archivos enormes).
--
-- La fortaleza correcta es a nivel BUCKET: Storage rechaza el upload server-side
-- según `allowed_mime_types` y `file_size_limit`, sin importar el cliente. Cubre
-- de una TODOS los paths de subida (hospedajes, unidad-types, lugares, destinos).
--
-- Notas:
--   - Se permiten solo formatos ráster web + HEIC/HEIF (fotos de iPhone). Se
--     EXCLUYE SVG a propósito (puede transportar <script>).
--   - Límite de 10 MB: holgado para "alta resolución" sin habilitar abuso.
-- =============================================================================

update storage.buckets
set
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/heic',
    'image/heif'
  ]
where id in ('hospedajes', 'destinos');

-- Verificación (correr junto con el UPDATE):
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('hospedajes', 'destinos');
