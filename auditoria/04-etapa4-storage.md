# Etapa 4 — Storage / uploads

> Auditoría con apoyo de un **agente independiente** (contexto en frío, brief adversarial)
> + verificación propia. Rúbrica No-Go / Major / Minor.

**Veredicto: NO-GO → remediado.** 1 No-Go (F-S1), 1 Major (F-S2), 1 Minor (F-S3).

**Importante (lección de método):** la auditoría inline de Etapas 1-3 y el primer agente
independiente **NO** habían cubierto la capa de Storage en profundidad (el primer agente la
declaró como su punto ciego). Un pase independiente enfocado encontró un No-Go real. Esto
confirma que el review solo-de-código no ve las policies de `storage.objects` ni el
comportamiento real del bucket — hay que probar en prod.

---

## 🔴 F-S1 (No-Go) — Enumeración anónima del bucket `hospedajes` → CERRADO
- **Archivo:** `supabase/migrations/20260512000002_storage_bucket.sql:15-17` (policy
  `"Hospedajes bucket: read público"`).
- **Problema:** la policy de SELECT era `for select using (bucket_id = 'hospedajes')` SIN
  cláusula `to` (aplicaba a `anon`) y sin filtro de path/estado.
- **Verificado en prod** (con la anon key, read-only): un anónimo hizo
  `storage.from('hospedajes').list('')` y obtuvo las 9 carpetas de hospedajes + `lugares/`
  (5) + `unidad-types/`, y `list('<id>')` devolvió los nombres reales de los archivos. Es
  decir: enumeración cross-tenant total + descarga de cualquier blob, incluidos los de
  entidades en borrador/rechazado/pausado. La metadata (`*_fotos`) filtra por publicado,
  pero el blob no.
- **Fix:** `supabase/migrations/20260601000004_storage_read_no_enumeration.sql` quita la
  policy de SELECT. El bucket sigue público: la descarga por path exacto vía
  `/object/public/...` funciona por el flag `public=true` (verificado: GET sigue HTTP 200
  sin la policy), y la app no usa `list()` (grep: 0 usos) → no rompe render ni uploads.
- **Verificación post-fix:** re-correr `scripts/audit-storage-list.mjs` → `list('')` debe
  devolver 0 entradas o error, y una URL `/object/public/...` debe seguir cargando.

### F-S1b (pendiente, mejora aparte — no en este fix)
Un path que se filtró mientras la entidad estuvo publicada sigue descargable por GET directo
aunque después se despublique (el flag `public` no revoca). Cerrarlo del todo requiere
**bucket privado + signed URLs** (afecta OG/SEO y todo render de imagen). Decisión de diseño
separada; el No-Go (enumeración masiva) ya quedó cerrado.

## 🟠 F-S2 (Major) — register-actions no ataban el path a la entidad → CERRADO
- **Archivos:** `admin/lib/foto-actions.ts`, `unidades/lib/foto-actions.ts`,
  `lugares/lib/foto-actions.ts` (las 3 `register*FotoAction`).
- **Problema:** validaban el id de entidad pero guardaban el `storage_path` del cliente
  **verbatim**, sin verificar que empiece con la carpeta de esa entidad. Cadena de
  explotación: Responsable A registra una foto de SU hospedaje con `storage_path` apuntando
  al blob de B → al borrarla, `deleteFotoAction` borra el blob físico de B vía service role
  (que saltea la policy scopeada de Storage). Borrado/robo de blob ajeno. (Prerequisito:
  conocer el path de B — que F-S1 hacía trivial vía `list()`.)
- **Fix:** las 3 register-actions ahora exigen
  `storage_path.startsWith(<prefijo de la entidad>)` (`<hospedajeId>/`,
  `unidad-types/<id>/`, `lugares/<id>/`) tras el chequeo de pertenencia.
- **Verificación:** `tsc --noEmit` ✅.

## 🟡 F-S3 (Minor) — sin validación server-side de MIME/tamaño
Los uploaders solo filtran `file.type.startsWith("image/")` en el cliente. Por la Storage API
directa se puede subir cualquier blob (no-imagen / grande) a la propia carpeta. Bajo impacto
(bucket de assets, escritura ya scopeada). Mitigación futura: límite de tamaño + validación
de MIME server-side, o transform/validación en una action de upload.

---

## Lo que SÍ aguanta (verificado)
- Helper `can_manage_hospedajes_object` (F-05): resiste path traversal (`storage.foldername()`
  + cast `::uuid` + `exception → return false`). Escritura/borrado directo cross-tenant por
  la Storage API: cerrado.
- Borrado vía action con `fotoId` ajeno: el `storage_path` se relee de la BD scopeado por el
  padre. El único resquicio era F-S2 (poisoned row), ahora tapado.

## Cobertura
Revisado: 3 migraciones de storage + helper + policies; las 3 foto-actions completas
(register + delete); los 3 uploaders + `lib/storage.ts`; verificación empírica de `list()` y
GET público contra prod. No cubierto: bucket `destinos` (solo super-admin, fuera de foco).

## Pendientes
1. Aplicar `20260601000004_...sql` en prod (SQL Editor) y re-verificar con el script.
2. Commitear F-S2 (código) + la migración F-S1.
3. F-S1b (bucket privado + signed URLs) y F-S3: decisiones/mejoras aparte.
