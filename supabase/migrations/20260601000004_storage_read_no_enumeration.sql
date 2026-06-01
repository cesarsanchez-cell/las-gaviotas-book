-- =============================================================================
-- F-S1 (NO-GO) — Cerrar la enumeración anónima del bucket `hospedajes`.
--
-- Hallazgo (auditoría Etapa 4, VERIFICADO en prod con la anon key): la policy de
-- SELECT sobre storage.objects era `for select using (bucket_id = 'hospedajes')`
-- SIN cláusula `to` (aplicaba a `anon`) y sin filtro de path/estado. Permitía a
-- cualquier ANÓNIMO hacer `storage.from('hospedajes').list('')` y enumerar TODOS
-- los paths de todos los tenants y estados (borrador/rechazado/pausado incluidos)
-- y luego descargar cada blob. Disclosure cross-tenant de contenido no publicado.
-- (En la prueba: list('') devolvió las 9 carpetas de hospedajes + lugares/ +
-- unidad-types/, y list('<id>') los nombres reales de los archivos.)
--
-- El bucket es PÚBLICO (storage.buckets.public = true): la DESCARGA por path
-- exacto vía /storage/v1/object/public/... funciona por ese flag, NO por esta
-- policy. Verificado: el GET público por path sigue dando HTTP 200 sin la policy,
-- y el render (getFotoUrl usa /object/public/) no se afecta. La app NO usa
-- list() en ningún lado (grep: 0 usos), así que quitar la policy no rompe nada.
--
-- Fix: quitar la policy de SELECT → `anon`/`authenticated` ya no pueden
-- list()/search() sobre el bucket. Las policies de insert/update/delete scopeadas
-- por can_manage_hospedajes_object(name) (F-05) se mantienen intactas.
--
-- Si en el futuro hace falta listar server-side, agregar una policy SELECT
-- scopeada: `using (bucket_id='hospedajes' and can_manage_hospedajes_object(name))`.
--
-- PENDIENTE (no cubierto acá → F-S1b, mejora aparte): un path que se filtró
-- mientras la entidad estuvo publicada sigue descargable por GET directo aunque
-- después se despublique (el flag `public` no revoca). Cerrarlo requiere bucket
-- privado + signed URLs (afecta OG/SEO y todo render de imagen).
-- =============================================================================

drop policy if exists "Hospedajes bucket: read público" on storage.objects;

-- -----------------------------------------------------------------------------
-- Verificación (cerramos con un SELECT, según convención del proyecto).
-- NO debe quedar NINGUNA policy de SELECT sobre storage.objects que aplique a
-- anon/authenticated sin scope. Solo deben verse las de insert/update/delete
-- "Hospedajes bucket: ... scoped". Si todavía ves una SELECT para el bucket,
-- el nombre difería en prod → ajustá el DROP con el policyname real de abajo.
-- -----------------------------------------------------------------------------
select policyname, cmd, roles, qual as using_expr
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by cmd, policyname;
