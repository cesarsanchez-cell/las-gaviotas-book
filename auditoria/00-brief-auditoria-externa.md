# Brief de Auditoría Externa — Mis Escapadas (Las Gaviotas BOOK)

> Documento de encuadre para auditor externo. Define **qué** auditar, **en qué orden** (por etapas) y **cómo clasificar** los hallazgos. El objetivo del encargo es obtener señales claras de **No-Go** y **Major**; lo **Minor** se deja de lado (o como anexo opcional).

**Fecha de preparación:** 2026-06-01
**Estado del sistema:** en producción (`misescapadas.com.ar`)
**Preparado por:** equipo de desarrollo (para entrega al auditor)

---

## 1. Cómo usar este documento

1. Leé la **rúbrica de severidad** (§2) — es el criterio de clasificación obligatorio.
2. Leé el **contexto del sistema** (§3) para entender el modelo de auth y multi-tenant.
3. Pedí los **artefactos** de §4 antes de empezar (sin el dump de RLS de producción, la Etapa 1 queda a medias).
4. Auditá **por etapas** (§5), en orden de riesgo. No hace falta completar todas: cada etapa cierra con su propio veredicto.
5. Entregá el reporte con la **plantilla de §6**. **Reportá solo No-Go y Major.** Minor va en un anexo breve, sin detalle.

---

## 2. Rúbrica de severidad

El foco del encargo es **No-Go** y **Major**. Clasificá cada hallazgo en una sola categoría:

### 🔴 NO-GO (bloqueante)
Impide operar/seguir hasta corregir. Ejemplos:
- Fuga de datos **cross-tenant** (un Administrador Local lee/escribe datos de otro destino; un Responsable toca una entidad ajena).
- Bypass de autenticación o de autorización (acceso a `/admin` o `/panel` sin credenciales/rol correcto).
- **Service role key** u otro secreto expuesto al cliente / commiteado.
- Tabla sensible con **RLS deshabilitada** en producción o policy `USING (true)` en lectura/escritura de datos privados.
- Mutación vía service role **sin chequeo de scope** que permita escribir fuera del tenant.
- Pérdida o corrupción de datos en un path normal de uso.

### 🟠 MAJOR (serio, no bloqueante)
Riesgo real que hay que corregir pronto, pero no frena la operación. Ejemplos:
- Validación de input débil/ausente en una mutación (sin Zod, sin límites).
- Rate-limit/anti-spam inefectivo a escala (ej. estado en memoria en serverless multi-instancia).
- **Drift** entre las migraciones del repo y el esquema/policies de producción.
- Manejo de PII sin política de retención/minimización (consultas guardan nombre/email/WhatsApp/IP).
- N+1 o queries sin índice que degraden a volumen real.
- Falta de revalidación server-side de rol cuando el middleware solo autentica.

### ⚪ MINOR (se deja de lado)
Cosmético, estilo, naming, micro-optimizaciones, deuda menor. **No detallar** — solo conteo/lista en anexo si querés.

> Regla de desempate: si dudás entre No-Go y Major, pesá **explotabilidad** (¿se llega desde un usuario real con un rol legítimo o anónimo?) y **alcance** (¿afecta a otros tenants / a todos los usuarios?). Cross-tenant + explotable = No-Go.

---

## 3. Contexto del sistema

### Stack
- **Frontend/SSR:** Next.js 15 (App Router, React Server Components), TypeScript, TailwindCSS, shadcn/ui.
- **Backend:** Supabase (PostgreSQL + Auth + Storage + **RLS**).
- **Mail:** Resend (notificaciones transaccionales).
- **Hosting:** Vercel (serverless).

### Modelo de negocio (relevante para riesgo)
Portal turístico **multi-tenant blando**: una sola app sirve varios **destinos**. Directorio de hospedajes/gastronomía/atractivos + **consultas/leads** (no hay pagos ni reservas online todavía). El dato sensible es: **PII de huéspedes** (consultas) y **aislamiento entre destinos**.

### Roles (4)
| Rol | Alcance |
|-----|---------|
| Super Administrador | toda la red (todos los destinos) |
| Administrador Local | **un solo destino** (scope por `destino_id`) |
| Responsable Hospedaje | sus hospedajes asignados |
| Responsable Gastronómico | sus lugares asignados |

Un mismo usuario puede tener **múltiples roles** (ej. admin local que además es responsable).

### Arquitectura de autenticación — **leer con atención, es el corazón del riesgo**

Hay **tres** clientes Supabase, y cuál se usa define si RLS protege o no:

| Cliente | Archivo | Llave | RLS |
|---------|---------|-------|-----|
| Browser | `src/lib/supabase/client.ts` | anon | ✅ aplica |
| Server (SSR) | `src/lib/supabase/server.ts` | anon + cookies de sesión | ✅ aplica |
| **Admin** | `src/lib/supabase/admin.ts` | **service role** | ❌ **bypassea RLS** |

**Implicancia central:** todo lo que pase por `createAdminClient()` corre **sin RLS**. Por lo tanto la autorización (rol + scope de tenant) tiene que estar **en el código**, antes de la mutación. El helper que materializa ese chequeo es:

- `src/features/admin/lib/scope.ts`
  - `assertAdminCanAccessHospedaje(admin, hospedajeId)` — super admin pasa; admin local solo si el hospedaje es de su destino.
  - `assertAdminCanAccessDestino(admin, destinoId)` — ídem para payloads que traen `destino_id` directo.
- Identidad/rol del admin: `src/features/admin/lib/auth.ts` (`getCurrentAdmin`, `AdminUser`, `isSuperAdmin`, `destinoId`).
- Identidad/rol del responsable: `src/features/lugares/lib/auth.ts`.

**El middleware (`src/middleware.ts`) solo autentica**: redirige a login si no hay usuario en `/admin/*` (salvo `/admin/login`) y en `/panel/*`. **No** chequea rol ni scope — eso queda delegado a las pages/actions server-side. Usa `auth.getUser()` (valida contra Supabase, no confía solo en la cookie). 

> **La pregunta madre de toda la Etapa 1:** ¿existe **algún** call-site de `createAdminClient()` que mute datos sin haber pasado antes por el assert de scope correspondiente? Cada uno de esos es candidato a **No-Go**.

### Convenciones del repo (para navegar)
- **Feature-based:** `src/features/<feature>/{components,lib}`. La lógica de servidor vive en `lib/*-actions.ts` (`"use server"`) y `lib/queries.ts`.
- **RLS versionada:** `supabase/migrations/*.sql` (23 migraciones). Varias son específicas de RLS (ver Anexo B).
- **Migraciones aplicadas a mano** en producción (no hay pipeline automático) → de ahí el riesgo de drift.

---

## 4. Artefactos que el auditor necesita

Sin esto, varias etapas quedan incompletas. Pedirlos antes de arrancar:

1. **Dump de RLS y esquema de PRODUCCIÓN** (no solo las migraciones del repo). Para detectar drift:
   ```sql
   -- Policies vivas en prod
   select schemaname, tablename, policyname, cmd, qual, with_check
   from pg_policies where schemaname = 'public' order by tablename, policyname;
   -- Tablas con RLS habilitada/deshabilitada
   select relname, relrowsecurity, relforcerowsecurity
   from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r';
   ```
2. **Variables de entorno de prod (redactadas)** — confirmar que `SUPABASE_SERVICE_ROLE_KEY` existe solo server-side y no hay secretos con prefijo `NEXT_PUBLIC_`.
3. **Accesos de prueba**: una cuenta por rol (Super Admin, Admin Local de destino A, Admin Local de destino B, Responsable) para probar aislamiento real cross-tenant.
4. **Acceso de lectura al repo** en el commit/branch auditado (`master`).
5. **Config de Storage** (buckets, policies) — hay migración `20260512000002_storage_bucket.sql` y `..._fix_fotos_storage_rls.sql`.
6. **Config de Auth de Supabase** (email confirm on/off, plantillas, providers).

---

## 5. Etapas de auditoría

### Etapa 1 — Seguridad y aislamiento de datos *(máxima prioridad)*

**Objetivo:** garantizar que ningún tenant accede a datos de otro y que no hay bypass de auth/authz.

**Alcance / dónde mirar:**
- Los **tres clientes** Supabase (`src/lib/supabase/*`).
- **Todos los call-sites de `createAdminClient()`** (service role). Comando para enumerarlos:
  ```bash
  rg -n "createAdminClient\(" src/
  ```
  Para cada uno que **mute** (`insert`/`update`/`delete`/`upsert`/`rpc`), verificar que **antes** hubo `assertAdminCanAccessHospedaje`/`assertAdminCanAccessDestino` (o equivalente para responsables) con la identidad real del request.
- `src/middleware.ts` — ¿cubre todas las rutas privadas? ¿algún `/admin/*` o `/panel/*` queda fuera del matcher?
- `src/features/admin/lib/{auth.ts,scope.ts}` y `src/features/lugares/lib/auth.ts`.
- **RLS de prod** (artefacto §4.1) vs migraciones del repo.
- Storage policies (fotos): ¿un responsable puede subir/borrar fotos de entidad ajena?
- Server actions públicas: `consulta-actions.ts`, `consulta-unidad-actions.ts` usan service role para INSERT con auditoría (ip/user_agent) — confirmar que la validación ocurre **antes** del insert y que no se puede inyectar `hospedaje_id` de un hospedaje despublicado/ajeno para inflar leads.

**Checklist de riesgos (cada "sí" sospechoso es hallazgo):**
- [ ] ¿Hay una mutación vía service role sin chequeo de scope previo? → **No-Go**
- [ ] ¿Una page/action de `/admin` o `/panel` confía en el middleware y **no** revalida rol/scope server-side? → **No-Go/Major**
- [ ] ¿La RLS de prod difiere del repo en una tabla sensible (policy más laxa, RLS off)? → **No-Go** si expone datos
- [ ] ¿`SUPABASE_SERVICE_ROLE_KEY` se importa en algún módulo que llegue al bundle del cliente? → **No-Go**
- [ ] ¿Un Admin Local puede setear `destino_id` arbitrario en un create? → **No-Go**
- [ ] ¿Storage permite acceso cross-entidad? → **No-Go/Major**
- [ ] ¿`getCurrentAdmin`/auth helpers derivan rol y `destinoId` de fuente confiable (DB/sesión) y no de input del cliente? → si no, **No-Go**

**Veredicto de etapa:** No-Go si hay aislamiento roto o bypass; si no, listar Majors.

---

### Etapa 2 — Integridad de datos y server actions

**Objetivo:** que toda mutación valide input y que el esquema de prod sea consistente con lo que el código asume.

**Alcance / dónde mirar:**
- Todos los `src/features/**/lib/*actions*.ts` (`"use server"`): ¿cada uno valida con Zod (o equivalente) antes de tocar la DB? Patrón de referencia correcto: `consulta-actions.ts` + `consultas/lib/validation.ts`.
- Boundaries `"use server"`: ¿los archivos `"use server"` exportan **solo funciones async**? (los schemas Zod deben vivir en `*-schema.ts` aparte).
- **Drift de esquema:** comparar `supabase/migrations/*.sql` (Anexo B) contra el dump de prod. Las migraciones se aplican **a mano**, así que puede haber columnas/constraints/funciones presentes en una y no en la otra.
- Constraints e invariantes de negocio: capacidad, fechas (`check_out > check_in`, no pasado), estados de publicación.
- Transiciones de estado de hospedajes → deben pasar por las notificaciones (`src/features/admin/lib/notifications.ts`).

**Checklist:**
- [ ] ¿Alguna mutación sin validación de input? → **Major** (o No-Go si permite corromper/escalar)
- [ ] ¿El esquema de prod tiene drift que rompa un invariante (constraint faltante)? → **Major/No-Go**
- [ ] ¿Hay coerción de tipos peligrosa o `as never`/casteos que oculten errores de tipo en inserts? → **Major**
- [ ] ¿Race conditions en transiciones de estado (doble submit, idempotencia)? → **Major**

---

### Etapa 3 — Correctness del flujo nuevo (rediseño hub → búsqueda → consulta)

**Objetivo:** validar el flujo recién commiteado de cara al huésped.

**Alcance / dónde mirar:**
- `src/features/home/components/HubV2.tsx` (hub), `src/features/busqueda/` (motor `/[destino]/buscar`), fichas de hospedaje/unidad (`src/app/[destino]/hospedajes/...`), `ConsultaForm`/`ConsultaUnidadForm`.
- Herencia de fechas/pax por URL desde el buscador a las fichas y al mensaje al responsable.
- Filtro de **disponibilidad + capacidad** (`src/features/disponibilidad/lib/queries.ts`, `busqueda/lib/queries.ts`): **probar con datos reales** (tarifas/disponibilidad cargadas), no solo lectura de código.

**Mecanismo sugerido:** esta etapa es ideal para herramientas de revisión de diff/branch (el equipo puede correr `/code-review` sobre lo nuevo) **más** una prueba manual end-to-end con datos reales.

**Checklist:**
- [ ] ¿El filtro de disponibilidad puede mostrar como "libre" algo ocupado (o viceversa)? → **Major/No-Go**
- [ ] ¿Se filtra correctamente por capacidad? ¿edge cases (0 noches, fechas invertidas)?
- [ ] ¿La herencia de pax/fechas preserva la intención del usuario sin permitir inyección por querystring? → **Major**

---

### Etapa 4 — Performance y SEO

**Objetivo:** que escale a volumen real y que el SEO local (prioridad del negocio) esté sólido.

**Alcance:**
- Queries con sub-fetches en loop / `Promise.all` con N+1 (listados de hospedajes, home, búsqueda).
- Índices en columnas de filtro (`destino_id`, `estado`, fechas de disponibilidad).
- Imágenes (Supabase Storage + `next/image`), `sitemap.ts`, metadata dinámica, schema.org, `robots`.

**Checklist:** casi todo acá es **Major** o **Minor**. Marcá **Major** solo si degrada notablemente a volumen real o rompe indexación (ej. páginas públicas con `noindex` por error, sitemap incompleto).

---

### Etapa 5 — UX / accesibilidad / consistencia

**Objetivo:** consistencia de formularios y mobile-first.

**Alcance:** forms (estados de error/foco, doble submit), accesibilidad básica (labels, roles ARIA, contraste), responsive.

**Severidad:** mayormente **Minor** → **se deja de lado** salvo que un problema de UX implique pérdida de datos o bloqueo funcional (ahí sube a Major).

---

## 6. Plantilla de reporte esperado

Por cada hallazgo **No-Go** o **Major** (Minor solo se cuenta en anexo):

```
[ID]        F-01
[Severidad] NO-GO | MAJOR
[Etapa]     1–5
[Título]    (una línea)
[Ubicación] archivo:línea / tabla / policy
[Descripción] qué está mal
[Explotabilidad] ¿desde qué rol/anónimo se llega? ¿pasos?
[Impacto]   alcance (cross-tenant / todos los usuarios / un tenant)
[Evidencia] query, request, captura, fragmento
[Recomendación] fix concreto
```

**Resumen ejecutivo arriba de todo:**
- Veredicto global: **GO / NO-GO**.
- Conteo: N No-Go, M Major.
- Top 3 riesgos.
- Por etapa: estado (OK / con Majors / NO-GO) — si no se auditó una etapa, marcarla.

---

## Anexo A — Inventario de server actions (`"use server"`)

Superficie de mutación a revisar en Etapas 1 y 2:

```
admin/lib/session-actions.ts        consultas/lib/consulta-actions.ts (público + service role)
admin/lib/hospedaje-actions.ts      consultas/lib/consulta-unidad-actions.ts (público + service role)
admin/lib/validation-actions.ts     consultas/lib/admin-actions.ts
admin/lib/foto-actions.ts           consultas/lib/responsable-actions.ts
lugares/lib/actions.ts              tarifas/lib/actions.ts
lugares/lib/foto-actions.ts         disponibilidad/lib/actions.ts
unidades/lib/actions.ts             panel/lib/session-actions.ts
unidades/lib/foto-actions.ts        panel/lib/hospedaje-actions.ts
home/lib/actions.ts                 promos/lib/actions.ts
combos/lib/actions.ts
```
Helpers de gestión con service role adicionales: `admin/lib/{destino-management,region-management,responsable-management,admin-management}.ts`.

## Anexo B — Migraciones SQL (orden cronológico)

RLS y seguridad resaltadas:

```
20260512000000_initial_schema.sql
20260512000001_rls_policies.sql              ← RLS base
20260512000002_storage_bucket.sql            ← Storage
20260513000000_responsable_insert_and_pausado.sql
20260513000001_is_responsable_helper.sql     ← helper RLS
20260513000002_fix_fotos_storage_rls.sql     ← Storage RLS
20260514000000_fix_responsable_select_update_rls.sql
20260514000001_responsable_update_publicado.sql
20260516000000_perfiles_destino_id.sql       ← scope multi-tenant
20260516000001_admin_local_scope.sql         ← scope admin local
20260516000002_consultas_table.sql           ← PII
20260516000003_disponibilidad_table.sql
20260518000000_unidades_arquitectura.sql
20260519000000_amenities_3_scopes.sql
20260520000000_lugares_responsabilidades.sql
20260520000001_consultas_columnas_dedicadas.sql
20260521000000_unificar_is_responsable.sql   ← helper RLS unificado
20260521000001_regiones.sql
20260521000002_destinos_foto_url.sql
20260521000003_destinos_foto_storage.sql
20260529000001_promos.sql
20260529000002_combos.sql
```

> **Recordatorio de drift:** estas son las migraciones del **repo**. La verdad operativa es el dump de **producción** (artefacto §4.1). Comparar ambos es parte de la Etapa 2.
