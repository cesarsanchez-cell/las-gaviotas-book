# Las Gaviotas BOOK — Roadmap

Estado consolidado del proyecto. Visión y reglas detalladas en [CLAUDE.md](CLAUDE.md).

> Actualizar este archivo cada vez que se cierra una etapa, se detecta un bug
> bloqueante o se toma una decisión que afecta el rumbo.

---

## Estado actual

| Item              | Valor                                                                            |
|-------------------|----------------------------------------------------------------------------------|
| Etapa vigente     | **Rediseño multi-unidad: Etapas 1, 2, 3 cerradas y en prod** — siguiente: Etapa 4 (página pública con sección Unidades) |
| Último commit     | `ec37d88` — Etapa 3.B calendario por unidad con tabs (panel + admin)             |
| Fecha             | 2026-05-18                                                                       |
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
- [ ] **Autogestión de password para admins de destino**: hoy el super admin tiene que pasarle una clave compleja y rezar para que no la pierda. Debe ser autónomo: flow de "olvidé mi password" funcionando + opción de cambiar password desde el perfil del admin. Aplica también a responsables. Sin esto, cada admin caído genera ticket al super admin.
- [ ] **UI para gestionar localidades (zonas)** desde `/admin/localidades`: alta de zonas por destino ("Frente al mar", "Centro", "Bosque", etc.) la debe hacer el admin local del destino — conoce las zonas mejor que el super admin. Hoy se cargan por SQL directo. RLS ya existe (admin scoped por destino), solo falta el page + form + listado. ~2-3 hs, calcado del CRUD de destinos.

### Pendientes de diseño (requieren pensar antes de codear)
- [ ] **Disponibilidad multi-dimensional por capacidad de unidad**: el modelo actual bloquea el hospedaje entero por día, pero un hospedaje real tiene varias unidades de distintos tamaños (cabaña 2 pax / depto 4 pax / casa 6 pax). No es lo mismo tener libre una unidad para 2 que recibir una consulta de familia de 6. Requiere: (1) tabla `unidades` por hospedaje con capacidad declarada, (2) disponibilidad atada a `unidad_id` no a `hospedaje_id`, (3) form de consulta sugiriendo unidades que entren para la cantidad de pasajeros pedida, (4) badge en consultas que diga "Disponible para 4 pax (unidad X libre)" en vez de solo "Disponible". Diseñar antes de Etapa 4 — afecta el schema de reservas. Memoria: [[project-disponibilidad-multi-unidad]].

### Etapa 2 — Leads y consultas ✅ cerrada (2026-05-16)

Form público de consulta + bandejas de admin y responsable + notificaciones por mail con fallback a admin del destino.

Bloque B2.1 — Schema + RLS + tipos (`8640871`):
- [x] Tabla `consultas` con fechas estructuradas (check_in/check_out DATE, no texto — patrón Progressive OTA)
- [x] Constraints en BD: check_out > check_in, cantidad_huespedes 1-20, consentimiento_datos=true, longitudes de nombre/mensaje
- [x] 6 RLS policies: INSERT público sobre hospedaje publicado, SELECT/UPDATE responsable dueño + admin scoped, DELETE admin scoped
- [x] Tipos TS (`EstadoConsulta`, `ConsultaRow`) + entry en `Database['consultas']`

Bloque B2.2 — Form público + mail (`2020d6f` + `0a82e4b` + `b5e9aed`):
- [x] `ConsultaForm` integrado en `/[destino]/hospedajes/[slug]` sección "Consultar disponibilidad"
- [x] Anti-spam: honeypot + rate limit 5/10min por IP en memoria
- [x] Mail al responsable vía Resend con datos completos + botón al `/panel/leads`
- [x] Fallback: si hospedaje no tiene responsable → mail a admins del destino con template `[Sin responsable]` amber-tone
- [x] UX: onSubmit+preventDefault (no reset en error), focus al primer campo con error, normalizeWhatsApp (`1155555555` → `+5491155555555`)

Bloque B2.4 — Bandeja `/admin/consultas` (`ade6fec` + `1503537`):
- [x] Listado scope-aware: super admin ve toda la red, admin local solo su destino
- [x] Tabs por estado con contadores (getConsultasStats), filtro vía URL params
- [x] ConsultaCard con datos + acciones de contacto rápido (mailto, WhatsApp click-to-chat)
- [x] Acciones: marcar leída/respondida/descartada/volver a nueva + borrar definitivo (solo admin, para spam)
- [x] Verificación de scope via assertAdminCanAccessHospedaje antes de mutar

Bloque B2.3 — Bandeja `/panel/leads` (`40968c9` + `62e09d1`):
- [x] Listado del responsable autenticado (RLS filtra automáticamente via responsable_owns_hospedaje)
- [x] `updateConsultaEstadoResponsableAction` verifica scope leyendo `perfil.hospedajes_ids`
- [x] Reutiliza ConsultaCard con prop `mode="responsable"` — sin botón borrar
- [x] Item "Consultas" en PanelSidebar
- [x] Validado end-to-end con responsable real (`administracion@postacangrejoapart.com.ar` vinculado a Posta Cangrejo Apart)

### UI admin operativa (cerrada 2026-05-16)

Cerró los últimos gaps operativos antes de Etapa 3.

- [x] `/admin/responsables` (`b10d45d` + `3b054c5`): listado scope-aware, alta con multi-select de hospedajes + password temporal, edición de nombre + reasignación de hospedajes, borrado. Antes era 100% SQL manual.
- [x] `/admin/destinos` (`8489498` + `79aa974` fix Link): listado con conteo de hospedajes, alta/edición con DestinoForm (slug kebab-case validado, lat/lng, orden), toggle activo, borrado bloqueado si tiene hospedajes. Solo super admin escribe.

### Etapa 3 — Disponibilidad simple ✅ cerrada (2026-05-16)

Calendario manual del responsable, cruce automático con consultas, vista admin read-only.

Bloque E3.1 — Schema + RLS + tipos (`1b78958`):
- [x] Tabla `disponibilidad` con (hospedaje_id, fecha) unique. Semántica: presencia de fila = bloqueado. Sin fila = disponible.
- [x] Enum `tipo_disponibilidad` ('manual' | 'reserva') + columna `reserva_id` preparada para Etapa 4 sin FK todavía (Progressive OTA).
- [x] Tipo `DisponibilidadRow` + entry en `Database['disponibilidad']`.

Bloque E3.2 — Calendario interactivo (`1b78958`):
- [x] Server actions `bloquearRangoAction` (upsert idempotente, max 366 días/op), `desbloquearRangoAction` (solo tipo manual), `toggleFechaAction` (click por día).
- [x] `DisponibilidadCalendar` con grilla de 6 meses, paginación, bulk de rango con notas, click por día, legenda visual.
- [x] Pages `/panel/hospedajes/[id]/disponibilidad` (responsable edita) y `/admin/hospedajes/[id]/disponibilidad` (admin vista read-only).
- [x] Botón "Disponibilidad" en header de cada hospedaje en panel y admin.

Bloque E3.3 — Mini-calendario público (`8dc8484`):
- [x] `DisponibilidadPublica` server component read-only, 3 meses en la página `/[destino]/hospedajes/[slug]` sección "Disponibilidad".
- [x] Días bloqueados en rojo con tachado, disponibles en verde claro.

Bloque E3.4 — Badge en consultas (`8dc8484`):
- [x] `getDisponibilidadStatusForConsulta`: "disponible" / "ocupado" / "parcial" según count de días bloqueados vs total del rango.
- [x] `enrichConsultasConDisponibilidad` Promise.all paralelo para enriquecer las listas antes del render.
- [x] Badge inline al lado de las fechas en ConsultaCard.

Bloque E3.5 — Banner en el mail (`8dc8484`):
- [x] `disponibilidadBanner()` color-coded (emerald/rose/amber).
- [x] Tanto `consultaNuevaTemplate` como `consultaNuevaSinResponsableTemplate` aceptan `disponibilidad` opcional.
- [x] `notifyConsultaNueva` calcula la flag y la pasa a ambos templates.

Ajustes finales (`457cc4f` + `802c023`):
- [x] **Admin read-only** sobre disponibilidad. Decisión del usuario: "la disponibilidad solo en manos del responsable, cualquier error sale caro". Policy de admin escritura removida de RLS; `requireResponsableOwnsHospedaje` rechaza cualquier admin en código; prop `readOnly` en el calendar oculta controles y deshabilita clicks.
- [x] Fix cache: `revalidatePath` de `/admin/consultas` + `/panel/leads` en cada action de disponibilidad. `router.refresh()` en el calendar para que el UI se actualice sin reload.
- [x] Copy del rango aclara explícitamente "desde y hasta inclusive" (ambos extremos quedan bloqueados).

### Rediseño multi-unidad (2026-05-18) — Etapas 1, 2, 3 cerradas y en prod

Reescritura mayor del modelo: la disponibilidad pasa de estar atada al `hospedaje` a la `unidad` física. Contexto y decisiones de diseño en memoria `project-rediseno-unidades`.

**Etapa 1 Foundation** ✅ (`468b2e5`)
- [x] Migración `20260518000000_unidades_arquitectura.sql`: 6 tablas (`unidad_types`, `unidad_type_fotos`, `unidades`, `disponibilidad` refactorizada, `tarifas`, `restricciones`) + RLS + triggers de consistencia + wipe de datos test
- [x] Bug detectado y documentado: `TRUNCATE destinos CASCADE` arrastró `perfiles` (memoria `feedback-truncate-cascade`). Recovery manual aplicado

**Etapa 2 Unidades** ✅ (`7bb321a` + `8716098` + `7b22e7b` + `0ac3acc`)
- [x] **2.A** Backend: queries + actions + Zod en `src/features/unidades/lib/`
- [x] **2.B** UI panel responsable: pages `/panel/hospedajes/[id]/unidades/{listado,nuevo,[id]}`, `UnidadTypeForm`, `UnidadInstancesManager` (alta single + batch + acciones inline), atajo "crear primera unidad ahora" en alta. Vista admin read-only
- [x] **2.C** Fotos del unidad_type: upload + galería + principal + alt editable
- [x] Catálogo separado `amenities-unidad.ts` (18 items de unidad vs catálogo global de hospedaje)

**Etapa 3 Disponibilidad por unidad** ✅ (`00f04db` + `ec37d88`)
- [x] **3.A** Backend: actions usan `unidadId`, `DiaBloqueado` extendido, helper `requireResponsableOwnsUnidad`
- [x] **3.B** UI: `DisponibilidadCalendar` con tabs por unidad (cada tab con contador de días ocupados), pages panel + admin sin el guard "Calendario en migración"

**Limitación conocida**: el badge en consultas (`disponible/parcial/ocupado`) sigue siendo "tonto" — no diferencia por capacidad ni por unidad puntual. Se arregla en Etapa 5 de este rediseño.

### Etapa 4 rediseño — Página pública con unidades (planeada, siguiente)
- [ ] Refactor `DisponibilidadPublica` para mini-cal por unidad
- [ ] Sección "Unidades" en `/[destino]/hospedajes/[slug]` con cards por tipo (foto principal, capacidad, amenities, camas, mini-cal)
- [ ] Capacidad agregada en cards del listado de hospedajes (`getCapacidadTotalHospedaje` ya existe)

### Etapa 5 rediseño — Consultas integradas (planeada)
- [ ] Badge fino "Disponible para N pax (X unidades libres)" que mira capacidad
- [ ] Form de consulta sugiere unidades compatibles con cantidad de pax pedidos

### Etapa 6 rediseño — Motor de tarifas (planeada)
- [ ] UI alta de tarifa por unidad_type + temporada
- [ ] Display de precio en página pública

### Etapa 7 rediseño — Restricciones (planeada)
- [ ] UI alta de restricciones opt-in por temporada (estadía mínima, días fijos de ingreso/egreso)
- [ ] Validación en form de consulta

### Etapa post-rediseño — Reservas online (planeada)
- [ ] Motor de reservas con bloqueo de fechas
- [ ] Confirmación por email al huésped + responsable
- [ ] Estados: solicitada / confirmada / cancelada / completada
- [ ] Panel responsable para gestionar reservas

### Etapa post-reservas — Pagos y comisiones (planeada)
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
