# Las Gaviotas BOOK — Roadmap

Estado consolidado del proyecto. Visión y reglas detalladas en [CLAUDE.md](CLAUDE.md).

> Actualizar este archivo cada vez que se cierra una etapa, se detecta un bug
> bloqueante o se toma una decisión que afecta el rumbo.

---

## Estado actual

| Item              | Valor                                                                            |
|-------------------|----------------------------------------------------------------------------------|
| Etapa vigente     | **1.5 + marca paraguas + jerarquía de admins**  —  siguiente: Etapa 2 leads      |
| Último commit     | `336f99a` — Sidebar admin: destino debajo del wordmark cuando hay scope          |
| Fecha             | 2026-05-16                                                                       |
| Entorno local     | PM2 → `las-gaviotas-book` en `http://localhost:3005`                             |
| **Deploy producción** | ✅ https://www.misescapadas.com.ar (canónico) + redirects desde apex y vercel.app |
| Repo remoto       | https://github.com/cesarsanchez-cell/las-gaviotas-book (privado)                 |
| Dominio           | `misescapadas.com.ar` — NIC.ar → Cloudflare DNS → Vercel                         |
| Email entrante    | Google Workspace User Alias Domain (`hola@misescapadas.com.ar` cae en inbox primario) |
| Email saliente    | Resend SMTP (`noreply@misescapadas.com.ar`, region `sa-east-1`)                  |

---

## Etapas

### Etapa 1 — Directorio visual ✅ cerrada (`659b6c0`)
- [x] Schema Supabase (6 tablas + RLS + auditoría + bucket `hospedajes`)
- [x] Seed: 1 destino, 3 localidades, 2 hospedajes demo
- [x] Sitio público: `/[destino]`, listado con filtros URL, detalle, sitemap, robots
- [x] SEO: metadata dinámica, JSON-LD (LodgingBusiness, TouristDestination, BreadcrumbList), OG images
- [x] Admin: login, dashboard con counters, tabla por estado, editor con 8 secciones, foto manager con upload a Storage

### Etapa 1.5 — Multi-rol responsable + validación ✅ cerrada (`3726bfe`)
- [x] Panel `/panel` para responsables (dashboard, listado, alta, edición con checklist server-side)
- [x] Auth público: `/login`, `/registro` con redirect por rol
- [x] `HospedajeForm` con prop `mode` (admin | responsable)
- [x] `/admin/validaciones` con `ValidacionCard` para aprobar/rechazar pendientes
- [x] `foto-actions` soporta admin y responsable vía `requireAccessToHospedaje`
- [x] Middleware extendido para rutas `/panel`
- [x] 4 migraciones RLS: INSERT responsable, helpers `is_responsable()` y `responsable_owns_hospedaje()` SECURITY DEFINER, refactor SELECT/UPDATE/fotos para evitar `exists()` sobre `perfiles`

### Próximo: testing + carga real + deploy ✅ cerrado
- [x] Suite E2E Playwright (10 tests, ~58s): golden path completo + edge cases
- [x] Cargar 3 hospedajes reales con fotos verdaderas
- [x] Push del repo a GitHub privado (`cesarsanchez-cell/las-gaviotas-book`)
- [x] Deploy a Vercel (`https://las-gaviotas-book.vercel.app`, plan Hobby)
- [x] Bump Next.js 15.1.4 → 15.5.18 (CVE-2025-66478 + acumulado)
- [x] Variables de entorno en Vercel (Supabase URL, anon, service role, NEXT_PUBLIC_SITE_URL)
- [x] Site URL + Redirect URLs en Supabase apuntando al deploy

### Hardening UX (post-deploy)
- [x] Responsable puede editar hospedaje publicado sin error de RLS (bug #003)
- [x] Checklist: relajado a "al menos 5 fotos en alta resolución" (no exige que todas lo sean)
- [x] Revalidación automática: cambiar campos críticos (nombre/dirección/capacidad/whatsapp/etc.) en publicado vuelve a `pendiente_validacion`
- [x] Aviso UI amber al editar publicado/pausado explicando qué dispara revisión
- [x] Borrado de foto bloqueado server-side si dejaría publicado con <5 buenas

### Dominio + Email (cerrado 2026-05-15)
- [x] Compra de `misescapadas.com.ar` en NIC.ar
- [x] Delegación NIC.ar → Cloudflare nameservers (`ashton.ns.cloudflare.com` + `evangeline.ns.cloudflare.com`)
- [x] CNAME flattening en apex apuntando al per-project endpoint de Vercel (`d1a3de66a6c791c0.vercel-dns-017.com`)
- [x] Custom domain en Vercel: `www.misescapadas.com.ar` (Production) + apex y `las-gaviotas-book.vercel.app` redirigen al www
- [x] Google Workspace: `misescapadas.com.ar` agregado como User alias domain + MX/SPF/DKIM en Cloudflare
- [x] DKIM activo: registro `google._domainkey` con `v=DKIM1; k=rsa; p=...` en Cloudflare
- [x] Resend: dominio verificado, region `sa-east-1`, registros `send` MX + SPF + `resend._domainkey` DKIM + `_dmarc` cargados
- [x] Custom SMTP en Supabase (via Management API porque la UI tenía bug con `.com.ar`): host `smtp.resend.com`, port 465, user `resend`, sender `Mis Escapadas <noreply@misescapadas.com.ar>`
- [x] Site URL Supabase: `https://www.misescapadas.com.ar`
- [x] Redirect URLs Supabase: nuevos dominios + legacy vercel.app + localhost dev
- [x] `NEXT_PUBLIC_SITE_URL` en Vercel actualizado + redeploy
- [x] Test end-to-end: signup → mail desde Resend con FROM correcto → click link → confirmación → redirect funcionan

### Marca paraguas + jerarquía de admins (cerrado 2026-05-16)

Reframe del proyecto a "Mis Escapadas — red de portales turísticos locales" + implementación completa de super admin / admin local con scope por destino.

Bloque A — RLS Postgres (`fd30275`, migración `20260516000001`):
- [x] Helpers SECURITY DEFINER: `is_super_admin()`, `admin_owns_destino(uuid)`, `admin_owns_hospedaje(uuid)`
- [x] Policies reescritas sobre destinos, localidades, hospedajes, hospedaje_fotos, perfiles, validacion_eventos
- [x] Super admin (destino_id=NULL) ve toda la red, admin local (destino_id=UUID) solo su destino

Bloque B — Server actions con scope (`fd30275`):
- [x] `AdminUser` expone `destinoId` + `isSuperAdmin`
- [x] Nuevo módulo `scope.ts` con `assertAdminCanAccessHospedaje/Destino` (defensa en código porque service role bypasea RLS)
- [x] Queries `getAdminStats`, `listHospedajesAdmin`, `listPendientesValidacion`, `listDestinosForSelect` reciben `destinoId` opcional
- [x] Server actions verifican scope antes de mutar: create/update/delete/changeEstado/approve/reject/fotos
- [x] Admin local no puede mover un hospedaje a otro destino

Bloque C — UI (`2b824fd` + `336f99a`):
- [x] Sidebar muestra "Super admin" o "Admin · {destino}" (badge amber)
- [x] Wordmark del sidebar muestra el nombre del destino debajo cuando hay scope
- [x] Item "Administradores" visible solo para super admin
- [x] `/admin/admins`: listado + alta de admin local + borrado
- [x] `createAdminLocalAction` genera password temporal con randomBytes y lo muestra una sola vez
- [x] `deleteAdminAction` bloquea borrarse a uno mismo

Bloque D — Validación end-to-end:
- [x] Creado destino dummy "Mar Azul" + hospedaje borrador
- [x] Verificado que admin local de Las Gaviotas NO ve Mar Azul
- [x] Mar Azul marcado `activo=false` — queda como semilla de testing, hub público vuelve a redirigir a Las Gaviotas

### Pendientes (menores, NO bloqueantes)
- [ ] Mejorar copy del email de confirmación de signup (sigue siendo el default de Supabase)
- [ ] UX: link "¿No tenés cuenta? Registrate" más visible o redirect inteligente cuando email no existe
- [ ] Considerar trigger BEFORE UPDATE en hospedajes que valide transiciones de estado por rol (defensa en profundidad)

### Etapa 2 — Leads y consultas (planeada)
- [ ] Formulario de consulta por hospedaje (no requiere login del huésped)
- [ ] Almacenamiento de leads en Supabase + notificación al responsable por email
- [ ] Bandeja de leads en `/panel/leads`
- [ ] Métricas: cuántas consultas recibió cada hospedaje

### Etapa 3 — Disponibilidad simple (planeada)
- [ ] Calendario manual del responsable (días bloqueados / disponibles)
- [ ] Visualización pública del calendario en la página del hospedaje
- [ ] Sin reservas todavía — solo informativo

### Etapa 4 — Reservas online (planeada)
- [ ] Motor de reservas con bloqueo de fechas
- [ ] Confirmación por email al huésped + responsable
- [ ] Estados: solicitada / confirmada / cancelada / completada
- [ ] Panel responsable para gestionar reservas

### Etapa 5 — Pagos y comisiones (planeada)
- [ ] Integración MercadoPago (señas / pago total)
- [ ] Comisiones de la plataforma
- [ ] Reportes de facturación al responsable

---

## Bugs abiertos

Anotar acá los bugs que aparecen en testing. Cerrar con el commit que los fixea.

_(ninguno bloqueante en este momento — ver `errores.txt` para notas sueltas mientras se procesan)_

| #   | Descripción | Estado | Resuelto en |
|-----|-------------|--------|-------------|
| 001 | RLS bloqueaba UPDATE del responsable sobre hospedaje en borrador (`new row violates row-level security policy`). Causa: `exists()` sobre `perfiles` en WITH CHECK falla bajo RLS recursiva. | ✅ cerrado | migración `20260514000000`, commit `3726bfe` |
| 002 | Registro `/registro` con email ya existente devolvía FK violation cruda (`perfiles_id_fkey`). Causa: anti-enumeration de Supabase obfusca el user retornado en `signUp` cuando el email ya está, con `identities=[]` e id fake. | ✅ cerrado | `signUpResponsableAction` detecta `identities` vacío y muestra mensaje claro |
| 003 | Responsable no podía editar la descripción (u otro campo) de un hospedaje en estado `publicado` o `rechazado`. Causa: el WITH CHECK de la policy de UPDATE tenía `and estado in ('borrador','pendiente_validacion','pausado')`, y RLS evalúa la NEW ROW completa aunque el campo no se modifique. | ✅ cerrado | migración `20260514000001`, suite Playwright agrega test E10 de regresión |
| 004 | El mail de aprobación al responsable no se enviaba cuando el admin republicaba un hospedaje desde el editor `/admin/hospedajes/[id]` (publicado → pausado → publicado). Causa: solo `approveHospedajeAction` (usado en `/admin/validaciones`) disparaba el mail; el dropdown de estado del form pasa por `updateHospedajeAction`, que no notificaba. | ✅ cerrado | commit `9b89cda` — extracción a `notifications.ts` + transición detectada en `updateHospedajeAction` |

---

## Infra

- **Frontend:** Next.js 15 (App Router, RSC) + TypeScript + TailwindCSS + shadcn-style primitives
- **Backend:** Supabase (Postgres + Auth + Storage + RLS)
- **Local dev:** PM2 `ecosystem.config.js` corre `next start -p 3005` en modo producción con autostart al login del usuario Windows (`HKCU\...\Run\PM2`)
- **Build:** `npm run build` → `next build`; SSL workaround `NODE_OPTIONS=--use-system-ca`
- **Deploy producción:** Vercel Hobby plan, region iad1, auto-deploy desde push a `master`.
- **Testing E2E:** Playwright (chromium) con `tests/e2e/` — 10 tests (golden path + edge cases). Correr con `$env:NODE_OPTIONS='--use-system-ca'; npx playwright test`. Seed de usuarios de testing en `scripts/seed-test-{responsable,admin}.mjs`. Confirmación manual de users pendientes en `scripts/confirm-user.mjs`.

---

## Reglas y patrones no-negociables

Resumen — detalle completo en `CLAUDE.md` y en la memoria de patrones.

1. **Feature-based architecture** (`src/features/{hospedajes,busqueda,admin,panel,destinos}`)
2. **Design system temprano** (tokens + primitives antes de páginas)
3. **SEO-first** (metadata dinámica + JSON-LD en cada ruta indexable)
4. **CMS-lite admin** (editor por bloques, no CRUD genérico)
5. **Progressive OTA** (schema preparado para Etapas 2-5 sin reescribir)
6. **Soft multi-tenant** (destinos + localidades desde día 1)
7. **Entity + Media driven** (fotos first-class, no afterthought)

Filtro para cualquier decisión técnica: _"¿se rompe cuando agreguemos reservas en Etapa 4 o un segundo destino?"_. Si rompe, rediseñar ahora. No implementar features futuras todavía.
