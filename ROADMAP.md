# Las Gaviotas BOOK — Roadmap

Estado consolidado del proyecto. Visión y reglas detalladas en [CLAUDE.md](CLAUDE.md).

> Actualizar este archivo cada vez que se cierra una etapa, se detecta un bug
> bloqueante o se toma una decisión que afecta el rumbo.

---

## Estado actual

| Item              | Valor                                                          |
|-------------------|----------------------------------------------------------------|
| Etapa vigente     | **1.5 cerrada** — siguiente: testing end-to-end + Etapa 2 prep |
| Último commit     | `3726bfe` — Etapa 1.5 — multi-rol responsable + validación     |
| Fecha             | 2026-05-14                                                     |
| Entorno local     | PM2 → `las-gaviotas-book` en `http://localhost:3005`           |
| Deploy producción | — (pendiente Vercel)                                           |
| Repo remoto       | — (solo local)                                                 |

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

### Próximo: testing + carga real + deploy
- [x] Suite E2E Playwright (7 tests, ~32s): golden path completo + edge cases
- [ ] Cargar 2 hospedajes reales con fotos verdaderas (vía panel responsable)
- [ ] Deploy a Vercel + dominio
- [ ] Configurar variables de entorno en Vercel (Supabase URL, anon key, service role)
- [ ] Revisar edge runtime / middleware compatibility en Vercel
- [ ] Reactivar "Confirm sign up" en Supabase antes del deploy a producción

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

---

## Infra

- **Frontend:** Next.js 15 (App Router, RSC) + TypeScript + TailwindCSS + shadcn-style primitives
- **Backend:** Supabase (Postgres + Auth + Storage + RLS)
- **Local dev:** PM2 `ecosystem.config.js` corre `next start -p 3005` en modo producción con autostart al login del usuario Windows (`HKCU\...\Run\PM2`)
- **Build:** `npm run build` → `next build`; SSL workaround `NODE_OPTIONS=--use-system-ca`
- **Testing E2E:** Playwright (chromium) con `tests/e2e/` — golden path + edge cases. Correr con `$env:NODE_OPTIONS='--use-system-ca'; npx playwright test`. Seed de usuarios de testing en `scripts/seed-test-{responsable,admin}.mjs`.

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
