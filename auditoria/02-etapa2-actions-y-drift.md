# Etapa 2 — Server actions + Drift de esquema

> Auditoría interna (Claude como auditor, 2026-06-01). Misma rúbrica que la externa:
> **No-Go** (bloqueante: cross-tenant / bypass de auth), **Major** (serio, no bloqueante),
> **Minor** (hardening / deuda). Se reporta todo, se prioriza No-Go+Major.

**Veredicto Etapa 2: GO. 0 No-Go, 0 Major. 2 Minor (F-A1, F-B1) — ambos remediados.**

---

## Frente A — Revisión de server actions (solo código)

Se revisaron las **23 server actions** que mutan datos, una por una, contra el invariante
del proyecto:

> Como `createAdminClient()` (service role) **bypassea RLS**, toda mutación debe
> (a) chequear rol+scope en código antes de mutar, y (b) scopear la query por la
> FK del padre, nunca por el id del hijo solo.

**Resultado:** el patrón `requireAdmin/requireResponsable → Zod → assertScope → mutate`
está aplicado de forma consistente en toda la superficie. Cobertura: promos, combos,
disponibilidad, tarifas, unidades, lugares, hospedajes (admin + panel), admins, destinos,
regiones, consultas (admin + responsable), fotos (3 features), y sesión (admin + panel:
login/signup/forgot/reset/change-pass con anti-enumeration y reauth para cambio de pass).

**Dato cruzado:** en promos/combos las actions **sí** estaban scopeadas
(`assertAdminCanAccessDestino`) — por eso F-06 (Etapa 1) solo era explotable por REST
directo, no por la UI. Confirma que la capa de actions es la fuerte; el agujero fue de RLS.

### 🟡 F-A1 (Minor) — Debug log con contenido de formulario → **REMEDIADO**
- **Archivo:** `src/features/unidades/lib/actions.ts` (`formatZodError`).
- **Problema:** `console.error("[unidades] zod error:", JSON.stringify(err.issues …))`
  volcaba el contenido del form a los logs del server en cada error de validación
  (leftover marcado "sacar después" del bloque 2.B). Sin impacto de seguridad real; ruido.
- **Fix:** se eliminó la línea de log. La función devuelve los fieldErrors igual.

---

## Frente B — Drift de esquema (repo vs producción)

Se generó `auditoria/dump-schema-prod.sql` (10 bloques read-only) y se corrió en prod.
Se cotejó **bloque por bloque** contra las 26 migraciones del repo (no a ojo).

| Bloque | Qué | Resultado |
|---|---|---|
| 1 | Inventario de tablas | 21 tablas, 0 vistas, **todas** de migración. Sin tablas a mano. |
| 2 | Columnas (tipo/null/default) | Sin drift. Cada columna mapea a su CREATE/ALTER. |
| 3 | Enums + valores | 4 enums, todos matchean. `lugares`/`combos`.estado = text+CHECK por diseño. |
| 4 | PK/UNIQUE/CHECK | Sin drift. CHECKs de `consultas` replican la validación Zod en DB (defensa en profundidad). `perfiles_rol_check` = modelo binario admin/responsable. |
| 5 | FKs + ON DELETE | Cadenas de cascada sanas. 3 FK polimórficas ausentes a propósito (promos/combo_items/responsabilidades). |
| 6 | Índices | (no levantó hallazgos) |
| 7 | Triggers | 22 triggers, todos de funciones versionadas. Sin lógica oculta. |
| 8 | NOT NULL sin default | Derivado del bloque 2; nada inesperado. |
| 9 | Conteo de filas | Contexto de volumen. |
| 10 | Historial de migraciones | N/A — las migraciones se aplican a mano en SQL Editor (no hay `supabase_migrations.schema_migrations`). El cotejo se hizo por estructura. |

**Conclusión:** el esquema de producción es **idéntico** a lo que declaran las 26
migraciones del repo. No hay columnas, constraints, enums ni triggers fuera de control de
versión.

### 🟡 F-B1 (Minor) — Doble fuente de verdad para autorización de responsable → **REMEDIADO**
- **Origen:** el drift destapó que la columna legacy `perfiles.hospedajes_ids[]` sigue en
  prod ("por compat" según la migración de `responsabilidades`). El grep mostró **2 rutas
  de código** que autorizaban leyendo el array legacy, mientras la RLS y el resto del
  código ya usan la tabla `responsabilidades` (SoT):
  - `src/features/tarifas/lib/actions.ts` (`authorizeUnidadType`)
  - `src/features/admin/lib/foto-actions.ts` (`requireAccessToHospedaje`)
- **Severidad — por qué Minor y no Major:** se verificaron los 3 write-paths
  (alta admin / reasignación, alta self-service, borrado de responsable) y **todos escriben
  ambas fuentes sincronizadas** (el array nunca queda más permisivo que la tabla). Además
  el check legacy solo corría para `rol === 'responsable'` puro. → **No explotable
  cross-tenant hoy.** Es deuda de defensa en profundidad: dos fuentes de verdad para authz
  son frágiles ante un futuro path que toque solo `responsabilidades`.
- **Fix:** los 2 checks ahora consultan `responsabilidades`
  (`perfil_id = user.id AND entidad_tipo='hospedaje' AND entidad_id=<hospedaje>`),
  igual que `lugares/lib/auth.ts`. `foto-actions` usa el cliente RLS (la policy
  "lectura propia" lo permite); `tarifas` usa service role como ya hacía.
  La baja de la columna `hospedajes_ids` queda para una limpieza posterior coordinada
  (todavía la escriben los write-paths por compat).
- **Verificación:** `tsc --noEmit` ✅. Pendiente `npm run build` antes de pushear.

---

## Pendientes tras Etapa 2
- Commitear F-A1 + F-B1 (cambios de código, sin migración).
- Limpieza futura: dropear `perfiles.hospedajes_ids[]` una vez que ningún write-path la
  toque (sacarla de los 4-5 lugares que la rellenan, luego `ALTER TABLE ... DROP COLUMN`).
- Continuar con Etapas 3-5 del plan de auditoría.
