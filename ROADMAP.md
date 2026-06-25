# Las Gaviotas BOOK — Roadmap

Estado consolidado del proyecto. Visión y reglas detalladas en [CLAUDE.md](CLAUDE.md).

> Actualizar este archivo cada vez que se cierra una etapa, se detecta un bug
> bloqueante o se toma una decisión que afecta el rumbo.

---

## Estado actual

| Item              | Valor                                                                            |
|-------------------|----------------------------------------------------------------------------------|
| Etapa vigente     | **Core en prod**: Etapas 1-7 cerradas. En desarrollo: **Reorganización admin panel responsable-centric** (Fases 1-5 ✅: búsqueda dual, dashboard, agregaciones, permisos, consolidación de estados). Backlog: visión producto (home emocional + sinergia comercial) — ver sección final |
| Último commit     | `247f6b5` — FEAT: Fase 5 - Consolidar borrador vs pendiente_validacion |
| Fecha             | 2026-06-25                                                                       |
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
- [ ] Copy del email de confirmación de signup (verificar si sigue el default de Supabase o ya se ajustó en Resend)
- [ ] Considerar trigger BEFORE UPDATE en hospedajes que valide transiciones de estado por rol (defensa en profundidad, opcional — RLS + asserts TS ya cubren)
- [ ] Decisión de producto: el `ConsultaForm` genérico al hospedaje convive con el `ConsultaUnidadForm` del flow del buscador. Definir si se deja (consulta sin fechas decididas) o se fuerza el flow nuevo.
- [x] Etapa 7 restricciones — cerrada 2026-06-05 (ver sección del rediseño). Falta aplicar migración `20260605000000` en prod + deploy.

**Resueltos desde la versión anterior del roadmap:** autogestión password ✅, gestión de zonas (resuelto vía Regiones+destinos, no se hace `/admin/localidades`) ✅, disponibilidad multi-unidad por capacidad ✅ (rediseño Etapas 1-6), bug visual del form en incógnito ✅, mail de confirmación al hospedaje ✅ (Resend), landing de clientes ✅.

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

### Etapa 4 rediseño — Página pública con unidades ✅ cerrada (`e628c12` y sig.)
- [x] `DisponibilidadPublica` con prop `compact` (mini-cal 1 mes) + `aggregateFullBlockPorTipo`
- [x] Sección "Unidades" en `/[destino]/hospedajes/[slug]` con `UnidadCard` por tipo
- [x] Secciones "Servicios del complejo" + "Cómo opera el hospedaje" (operational amenities)
- [x] Capacidad real agregada desde unidades en el listado de hospedajes (fallback a `capacidad_max` legacy)

### Etapa 5 rediseño — Búsqueda + flow contextualizado ✅ cerrada (`e628c12` y sig.)
- [x] `BuscadorBar` (check-in/out + popover pax adultos/niños/bebés) + `DateField` con react-day-picker es-AR
- [x] `searchUnidadesPorDestino`: query cross-hospedaje, tipos que cumplen capacidad + libres en todo el rango
- [x] `/[destino]/buscar` con `UnidadResultCard` + detalle `/unidades/[unidadTypeId]` con galería embla + form contextualizado
- [x] `createConsultaUnidadAction` enriquece la consulta con unidad/fechas/pax/canal

### Etapa 6 rediseño — Motor de tarifas ✅ cerrada (`d2ea9ed` + `bb54d94`)
- [x] Migración `consultas`: columnas dedicadas `unidad_type_id`, `canal_preferido`, `adultos`/`ninos`/`bebes`
- [x] UI alta de tarifa por unidad_type + temporada en panel responsable
- [x] Display de precio en página pública (fallback "Precio a consultar" si no hay tarifa)
- [x] fieldErrors específicos en el form de tarifas

### Etapa 7 rediseño — Restricciones ✅ cerrada (2026-06-05)

Reglas opt-in por temporada (estadía mínima, día fijo de ingreso/egreso) sobre el tipo de unidad, con **feature-flag por destino**.

- [x] **Feature-flag por destino** (`destinos.restricciones_habilitadas`, migración `20260605000000`, nace en `false`). Lo prende/apaga el super admin (cualquier destino) o el admin local (su destino) vía toggle en `/admin/destinos` (`toggleRestriccionesHabilitadasAction`, scope en código). Apagado = no se aplica ni se muestra.
- [x] Módulo `src/features/restricciones/` (espejo de `tarifas`): `validation.ts` (Zod, al menos una regla), `logic.ts` (helpers puros compartidos), `queries.ts`, `actions.ts` (CRUD scopeado por responsable/admin), `RestriccionesManager.tsx`.
- [x] UI alta/edición/borrado en el panel del responsable (`/panel/hospedajes/[id]/unidades/[unidadTypeId]`), read-only en la vista admin. Solo aparece si el destino tiene el flag ON.
- [x] Aplicado en `searchUnidadesPorDestino`: si el flag está ON, descarta el tipo cuyo rango pedido viole una restricción aplicable (check-in dentro de `[desde, hasta]`; reglas en AND).
- [x] Sección "Condiciones de reserva" en el detalle público de unidad (estadía mínima / día fijo), informativa, solo con el flag ON.

### Verticales MisEscapadas — Gastronomía + Atractivos ✅ cerrada (`e628c12`)
- [x] Tabla `lugares` unificada (tipo discriminador) + `lugar_fotos` + `responsabilidades` (many-to-many) + RLS scoped
- [x] Admin: `/admin/gastronomia` + `/admin/atractivos` (listado, alta, edición, estados, fotos)
- [x] Públicas: `/[destino]/gastronomia` y `/[destino]/atractivos` (index + detalle con horarios/categorías)
- [x] Invitación de responsables gastronómicos + invite suelto (`ca39b88`, `7824c18`)

### Roles múltiples ✅ cerrada (`8597ca8` → `caa2847`)
- [x] Un perfil puede ser responsable de varias entidades vía `responsabilidades`
- [x] Admin local con responsabilidades accede a `/panel`; badge dual rol; notificaciones vía `responsabilidades`
- [x] Panel dashboard muestra siempre ambas secciones (hospedajes + gastronómicos)

### Autogestión de password ✅ cerrada (`5743391` + `1ae8ce6` + `0e1d288`)
- [x] Invite-by-email al alta + cambio desde perfil + "olvidé mi password" (resetPasswordForEmail, PKCE-compatible)
- [x] Redirect determinista al login correcto según rol

### Regiones — capa por encima de destinos ✅ cerrada (`914b300` → `d28d124`)
- [x] Schema + tipos + queries + paleta + biomas
- [x] CRUD admin `/admin/regiones`
- [x] Home pública refactorizada (SearchHero + grilla + carousels + bioma strip + CTA)
- [x] Página `/regiones/[slug]` + vista mapa `/mapa` con Leaflet (auto-fit + labels permanentes por pin)
- [x] Foto con upload a Storage en **destinos** (regiones todavía sin foto propia — ver propuestas)

### Header mobile + date pairs ✅ (`da05ff5` + `47ced13` + `e47d823`)
- [x] Menú hamburguesa con drawer slide-in
- [x] Binding desde/hasta en todo el sitio + fix de bug TZ en `addDays`

### Home v2 / Hub estilo Airbnb ✅ cerrada (en prod, 2026-05-29 → 2026-06-01)

Reescritura de la home y el hub a un formato emocional estilo Airbnb + capa comercial de promos/combos. Detalle en memorias `project-home-v2-airbnb` y `project-rediseno-hub-landing-busqueda`.

- [x] **Bloques 1-8** (en prod 2026-05-29): home Airbnb + promos + `DestinoPromos` + `HeroCarousel` + combos. Combos: el responsable arma → admin aprueba. El hub se muestra siempre con 1+ destinos; el hero del destino es un carrusel emocional.
- [x] **Bloques 9-11**: Armador de combos + reglas de publicación + página de región.
- [x] **Rediseño hub landing+hero+búsqueda** (`2d37774`, 2026-06-01): hub landing/vertical, hero de promos, filas por destino, búsqueda inteligente, herencia buscador→fichas cerrada.

### Auditoría de seguridad Etapas 1-5 ✅ COMPLETA — VEREDICTO GO (2026-06-01)

Auditoría externa por etapas (rúbrica No-Go/Major/Minor) + remediación. **0 No-Go / 0 Major abiertos.** Detalle exhaustivo en memoria `project-auditoria-seguridad-etapa1` y carpeta `auditoria/`. Lección transversal: los No-Go vivían en capas que el review de código NO ve (RLS, Storage policies) — sólo aparecieron con dump de prod + agentes independientes por superficie + prueba empírica en prod.

- [x] **Etapa 1** (F-01..F-06): mutaciones de fotos scopeadas por FK del padre, listado de responsables recortado a destino, leads revalidan estado publicado, rate-limit persistido en Supabase, Storage del bucket con scope de propiedad, RLS de promos/combos scopeada por destino. PRs #15-#18.
- [x] **Hardening grants**: `REVOKE TRUNCATE/TRIGGER/REFERENCES` a anon/authenticated. PR #19.
- [x] **Etapa 2** (F-A1/F-B1): authz del responsable unificada en `responsabilidades` (SoT) + limpieza de debug log. Sin drift de esquema (prod == repo). PR #20.
- [x] **Etapa 3** (F-C1): proyección explícita en `getHospedajeBySlug` (data minimization). Frontera de auth sin hallazgos (30/30 páginas admin con guard). PR #21.
- [x] **Etapa 4 Storage** (F-S1 No-Go + F-S2 Major): cerrada la enumeración anónima del bucket + path-binding en register de fotos. PR #22.
- [x] **Etapa 5** (F-E1 Major + F-E2/F-E3 Minor): rate-limit en flujos de auth + escape HTML en mails + anti-enumeration en signup. PR #23.

**Backlog de seguridad pendiente (decisiones de diseño, NO bloqueante):**
- [ ] F-S1b — bucket privado + signed URLs (contenido despublicado deja de ser descargable por path filtrado; afecta OG/SEO).
- [ ] F-S3 — validación MIME/tamaño server-side en upload de fotos.
- [ ] Rate-limit por email (además de por IP) en forgot/resend.

**Invariante de seguridad clave** (vale para toda mutación futura): como `createAdminClient()` (service role) bypassea RLS, toda mutación debe (a) chequear rol+scope en código antes y (b) scopear la query por la FK del padre, nunca por el id del hijo solo.

### Reorganización admin panel — Responsables centric (en prog, 2026-06-25)

Refactor de la arquitectura admin de comercio-centric a responsable-centric. El responsable es la entidad primaria; el admin local ve responsables y dentro de cada uno sus comercios (hospedajes, gastronómicos, atractivos). Búsqueda dual (por responsable o comercio) → responsable. Dashboards agregados por rubro (hospedajes, gastro, qué-hacer) con stats y filtros de pendientes.

**Fase 1 — Búsqueda dual + dashboard responsable** ✅ (`7454241` → en progreso)
- [x] `getResponsableWithComerciosAction`: obtiene individual responsable con todos sus comercios agrupados por tipo
- [x] `searchResponsablesByNameOrComercio`: búsqueda dual — por nombre de responsable O nombre de comercio (retorna el responsable)
- [x] `ResponsablesSearch.tsx`: componente cliente con dropdown, diferencia match type (responsable vs comercio)
- [x] `/admin/responsables/[id]` (nueva): dashboard individual mostrando datos responsable + summary cards por estado + comercios agrupados por tipo con links a editor
- [x] `ResponsableComerciosList.tsx`: agrupa comercios por rubro (hospedajes, gastronómicos, qué-hacer) con badge de estado

**Fase 2 — Search + breadcrumb + edición en listado** (planeada)
- [ ] Integración en `/admin/responsables`: búsqueda visible, breadcrumb responsable al navegar
- [ ] Links a comercios individuales para edición rápida

**Fase 3 — Agregaciones dashboard principal** ✅ (`994aac3`)
- [x] `getResponsablesStats`: obtiene stats de responsables (total comercios, conteos por estado)
- [x] `ResponsablesStatsCard`: componente que muestra top 5 responsables con pendientes. Total pendientes, total comercios, comercios publicados por responsable
- [x] `/admin/page.tsx`: nuevo bloque "Responsables con pendientes" insertado en el dashboard principal después de "Necesitan tu OK"

**Fase 4 — Permisos diferenciados** ✅ (`5fa6320`)
- [x] Admin local NO edita datos comerciales (nombre, descripción, ubicación, amenities, etc.) — solo super admin
- [x] Admin local SÍ puede cambiar estado: publicar, pausar, rechazar
- [x] UI: campos deshabilitados en `/admin/{hospedajes,gastronomia,atractivos}/[id]` para admin local. Props `isSuperAdmin` en `HospedajeForm` y `LugarForm`
- [x] Server-side: `updateHospedajeAction` rechaza cambios de campos comerciales si `!isSuperAdmin`
- [x] Resolver diferencia semántica: **borrador** (nunca se validó) vs **pendiente_validacion** (fue validado, cambios penden) — consolidar a uno solo (Fase 5 ✅ `247f6b5`: TODA edición de publicado → pendiente_validacion)

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

---

## Visión de producto — próximas propuestas (2026-05-27)

Backlog de mejoras pensadas con el operador para desarrollar cuando haya tokens. Detalle completo y razonamiento en la memoria `project-propuestas-experiencia-cliente`. El norte: **la home del destino debe vender la experiencia del lugar, no ser un buscador de hospedajes**. El diferencial es la sinergia entre comercios y la utilidad real para el prospecto.

1. **Mejoras de UI cliente** (transversal, se afina con Claude Design).
2. **Fotos en regiones** — replicar el upload a Storage que ya tienen destinos.
3. **Navegación con passthrough inteligente** — mostrar solo regiones/destinos con datos cargados (hospedajes y/o gastro y/o atractivos) y saltar directo al que tenga contenido (1 destino con datos → entro directo; varios en una región → entro a la región). La **desactivación manual siempre gana**: desactivado no se muestra aunque tenga datos.
4. **Bajar el protagonismo del buscador** en la home del destino. Reemplazar el hero-buscador por un **carrousel de imperdibles** (mezcla de paisajes, hospedajes y gastronómicos atractivos).
5. **Tours y sinergia comercial** — combos hospedaje + gastronomía + atractivo, promos cruzadas (hospedate en X, cená en Y con % de descuento, y viceversa). Diferencial exclusivo de la plataforma. **La infra ya está construida y auditada** (Home v2 bloques 1-11: promos, combos con flujo responsable-arma → admin-aprueba); falta terminar la capa de producto/UX.
6. **Guía útil del destino** — paseos, ferias, actividades culturales, y **servicios esenciales** (asistencia médica, farmacias, policía, bomberos). Que el visitante esté cómodo, entretenido y seguro. (Vertical nuevo, sin construir.)

> Nota: el bloque 2 (fotos en regiones) y el bloque 4 (bajar protagonismo del buscador) están **parcialmente cubiertos** por el hub redesign — falta el upload a Storage en regiones y afinar el carrousel de imperdibles.

Filosofía rectora: **experiencia útil para el prospecto → valora → recomienda**. Para el comerciante: herramienta para mostrarse y sentirla propia.
