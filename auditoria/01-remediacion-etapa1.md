# Remediación — Etapa 1 (respuesta al veredicto NO-GO)

> Anexo para el auditor externo. Mapea cada hallazgo de la Etapa 1 a su fix, commit y archivos, con pasos de verificación. Pensado para una **re-revisión acotada** (solo lo que cambió), no un barrido nuevo.

**Estado:** F-01..F-04 remediados, mergeados a `master` y **deployados a producción** (2026-06-01).
**F-05** (capa Storage de F-01, surgido del dump de prod): policy aplicada y verificada en la
base de prod; la migración queda por commitear.
**Commits:** PR #15 `Seguridad: remediar auditoria Etapa 1 (F-01..F-04)` (`2494d32`) + migración
`20260601000001_storage_fotos_scope.sql`.
**Verificación previa:** `tsc --noEmit` ✅ · `npm run build` ✅ · migración aplicada y verificada en Supabase.

---

## Mapeo hallazgo → fix

### F-01 — NO-GO · Mutaciones de fotos sin scope de entidad padre → **CERRADO**
- **Archivos:** `src/features/admin/lib/foto-actions.ts`, `src/features/lugares/lib/foto-actions.ts`, `src/features/unidades/lib/foto-actions.ts`.
- **Fix:** cada `delete`/`update` ahora filtra por la FK del padre además del `id`
  (`.eq("id", fotoId).eq("hospedaje_id"/"lugar_id"/"unidad_type_id", …)`). En los
  `delete`, el `storage_path` del blob se **lee de la BD** tras confirmar pertenencia,
  ya no se confía en el `storagePath` enviado por el cliente.
- **Verificación sugerida (con cuentas de prueba):** como Responsable/Admin con acceso
  a la entidad A, invocar la action de borrado/edición de foto pasando un `fotoId` que
  pertenezca a la entidad B. Esperado: error *"La foto no pertenece a este/esta …"* y
  **cero** efecto sobre la entidad B (ni fila ni blob).

### F-02 — NO-GO · Admin local recibía datos cross-tenant → **CERRADO**
- **Archivo:** `src/features/admin/lib/responsable-management.ts` (`listResponsablesAction`).
- **Fix:** para admin local, las entidades del row se **recortan a su `destinoId`** antes
  de devolverse. Ya no se exponen IDs/nombres/destinos de entidades que el responsable
  tenga en otros destinos.
- **Verificación:** login como Admin Local del destino A → `/admin/responsables`. Para un
  responsable que opere en A **y** en B, el listado debe mostrar **solo** sus entidades de
  A. No deben aparecer entidades de B (revisar también el payload de red, no solo la UI).

### F-03 — MAJOR · Consultas públicas sin revalidar hospedaje publicado → **CERRADO**
- **Archivos:** `src/features/consultas/lib/consulta-actions.ts`,
  `src/features/consultas/lib/consulta-unidad-actions.ts`.
- **Fix:** antes del insert (que va por service role y saltea RLS) se revalida
  `hospedajes.estado = 'publicado'`; el form de unidad además exige `unidad_types.activo`.
- **Verificación:** POST al action de consulta con un `hospedajeId` de un hospedaje en
  estado borrador/pausado/rechazado. Esperado: *"Este hospedaje no está disponible para
  consultas."* y **ningún** registro nuevo en `consultas`.

### F-04 — MAJOR · Rate limit en memoria → **CERRADO**
- **Archivos:** `src/features/consultas/lib/rate-limit.ts` +
  migración `supabase/migrations/20260601000000_consulta_rate_limit.sql`.
- **Fix:** rate limit **persistido en Postgres** (tabla `consulta_rate_limit` con RLS sin
  policies + función atómica `check_consulta_rate_limit`). `rate-limit.ts` ahora async vía
  RPC con service role (fail-open ante error de infra, clave compartida `"unknown"` si no
  hay IP). `getClientIp` prefiere `x-real-ip` (seteada por Vercel).
- **Verificación:** 6 consultas rápidas desde la misma IP. Esperado: las primeras 5 OK,
  la 6ª bloqueada con mensaje de *"Demasiadas consultas seguidas…"*. La persistencia se
  confirma además con la query 8 del `dump-rls-prod.sql`.

### F-05 — NO-GO · Storage del bucket `hospedajes` sin scope de propiedad → **CERRADO**
*(Hallazgo surgido del dump de RLS de prod — la capa de Storage de F-01, que el
review de solo-código no podía ver.)*
- **Problema:** las policies de escritura del bucket `hospedajes` permitían
  `INSERT/UPDATE/DELETE` a cualquier `is_admin() OR is_responsable()` **sin** chequear
  pertenencia sobre el path → un responsable podía borrar/sobrescribir los blobs de
  cualquier hospedaje/unidad/lugar llamando directo a la Storage API, salteándose las
  server actions. Escritura cross-tenant.
- **Archivo:** `supabase/migrations/20260601000001_storage_fotos_scope.sql`.
- **Fix:** helper `can_manage_hospedajes_object(name)` que resuelve el dueño desde el path
  (`<hospedajeId>/…`, `unidad-types/<id>/…`, `lugares/<id>/…`) y valida responsable-dueño
  o admin-scoped. Las 3 policies de escritura se reemplazaron por versiones que lo usan;
  la lectura pública del bucket queda igual.
- **Verificación (hecha en prod):** las policies de escritura del bucket muestran
  `can_manage_hospedajes_object(name)` y no quedó ninguna `is_admin() OR is_responsable()`.
  Prueba con cuentas: como Responsable del hospedaje A, `storage.from('hospedajes')
  .remove(['<hospedajeB_id>/foto.jpg'])` debe **fallar** (RLS), y el blob de B seguir intacto.

---

## Artefactos que el auditor pidió y que faltan (para cerrar drift + explotación real)

El auditor declaró que trabajó **solo sobre código del repo**. Para cerrar la Etapa 1 con
verificación real sobre producción, entregar:

1. **Dump de RLS/esquema de PROD** → correr `auditoria/dump-rls-prod.sql` en el SQL Editor
   de producción y adjuntar los resultados (10 bloques, todos read-only).
2. **Cuentas de prueba por rol** (en un entorno seguro, no sobre datos reales de clientes):
   - Super Administrador
   - Administrador Local — destino A
   - Administrador Local — destino B
   - Responsable (con entidad en A y, si se puede, también en B, para probar F-02)
   - Hay seeds en `scripts/seed-test-admin.mjs` y `scripts/seed-test-responsable.mjs`.
3. **Env de prod redactado** → confirmar que `SUPABASE_SERVICE_ROLE_KEY` es server-only y
   que no existe ningún secreto con prefijo `NEXT_PUBLIC_`.

## Pendiente de scope (no es Etapa 1, pero quedó anotado)
- Confirmar que la migración del rate-limit corrió contra el proyecto **de producción**
  (no el de dev). Query 8 del dump lo verifica.
