# Etapa 3 — Exposición de datos + Frontera de auth

> Auditoría interna (Claude como auditor, 2026-06-01). Rúbrica No-Go / Major / Minor.

**Veredicto Etapa 3: GO. 0 No-Go, 0 Major. 1 Minor (F-C1) — remediado.**

---

## Frente C — Exposición de datos en superficie pública

Revisión de todas las queries que corren para usuarios anónimos (home, destino,
verticales, búsqueda, fichas, sitemap).

**Fortalezas confirmadas:**
- Toda query pública filtra `estado='publicado'` **explícito en código**, no solo vía RLS
  (defensa en profundidad).
- Los listados proyectan campos vía `toCard()` (whitelist) — sin over-fetch.
- Ningún client component recibe filas crudas con PII: las fichas pasan solo
  `id/nombre/whatsapp/fotos/capacidad/fechas` a `ConsultaForm`, `WhatsAppButton`,
  `Gallery`, `BuscadorBar`.
- El JSON-LD whitelistea campos (`buildHospedajeJsonLd` emite name/address/telephone/
  email-del-negocio, **no** la PII del responsable).
- `consultas`/`perfiles` (PII de huésped/usuario) nunca se consultan en rutas públicas.

### 🟡 F-C1 (Minor) — Over-fetch de columnas sensibles en queries públicas → REMEDIADO
- **Archivos:**
  - `src/features/hospedajes/lib/queries.ts` (`getHospedajeBySlug`) — `select("*")` traía
    `responsable_documento/email/whatsapp` (PII) + `validado_por`/`validado_at`/
    `responsable_validado`/`pausado_por` (internos de moderación).
  - `src/features/unidades/lib/queries.ts` (`getUnidadType`, usada en la ficha pública de
    unidad) — trae `unidades.notas_internas`.
- **Severidad:** Minor. **No hay exposición real hoy** — Next RSC no serializa variables
  server no usadas; los client props están whitelisteados; el JSON-LD filtra. Es deuda de
  minimización de datos: frágil ante un futuro `{...hospedaje}` pasado a un client component.
- **Fix:** `getHospedajeBySlug` ahora proyecta columnas explícitas, **excluyendo** la PII del
  responsable y los campos internos de moderación (mantiene `responsable_nombre`, que se
  muestra como nombre de contacto).
- **`getUnidadType` se deja como está**: la comparten las páginas de edición admin/panel que
  **sí** necesitan `notas_internas`, y la ficha pública no lo manda al cliente (solo lee
  `u.activa`/`u.id` server-side). Cambiarla rompería la edición; el riesgo neto es nulo.
- **Verificación:** `tsc --noEmit` ✅.

---

## Frente D — Frontera de auth (middleware + layouts + scope)

**Sin hallazgos.**

- **Middleware** solo autentica (`/admin/*`, `/panel/*` → redirect a login si no hay sesión);
  rol+scope se chequean server-side. Diseño sólido y consistente.
- **Admin: 30/30 páginas** llaman `requireAdmin()` (redirige no-admin a `/panel`). Un
  responsable logueado que toque `/admin/*` es rebotado por el guard de la página; el
  `redirect()` de la página gana aunque el layout haya renderizado los children.
- **Panel:** layout + todas las páginas con datos llaman `requireResponsable()`. Las 2
  páginas sin guard propio (`/panel/hospedajes`, `/panel/lugares`) son stubs que solo
  `redirect("/panel")`.
- **Scope intra-panel:** `getMyHospedaje` corta con `if (!hospedajesIds.includes(id)) return
  null` → id ajeno = `notFound()`. `hospedajeIds` se deriva de `responsabilidades` (SoT,
  consistente con F-B1).
- **auth/callback:** sin open-redirect — valida `next.startsWith("/")` y siempre prefija el
  `origin` (mismo-origen garantizado). Único route handler de la app.

### Observación (defensa en profundidad, no finding)
El admin layout hace `getCurrentAdmin() → return <>{children}</>` si es null (no es un
guard). La cobertura está completa por los guards por-página (30/30). **No se puede agregar
`requireAdmin()` al layout** porque `/admin/login` vive bajo ese layout → loop de redirect.
El guard por-página es el patrón correcto en Next; queda como convención a respetar al crear
páginas admin nuevas.

---

## Pendientes tras Etapa 3
- Commitear F-C1 (1 archivo de código + este anexo).
- Continuar con Etapa 4.
