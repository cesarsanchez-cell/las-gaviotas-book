# Etapa 5 — Secrets / abuso de auth / notificaciones

> Auditoría con **agente independiente** (contexto en frío, brief adversarial) + verificación
> propia del código. Rúbrica No-Go / Major / Minor.

**Veredicto: GO. 0 No-Go, 1 Major (F-E1), 2 Minor (F-E2, F-E3) — los tres remediados.**

---

## ✅ Secrets / configuración — LIMPIO (sin acción)
- `SUPABASE_SERVICE_ROLE_KEY` y `RESEND_API_KEY` se leen solo en `lib/supabase/admin.ts` y
  `lib/email/resend.ts` (server-only). El agente rastreó los **52 importadores transitivos**
  de esos módulos → **ninguno es `"use client"`**: el service role nunca entra al bundle.
- `NEXT_PUBLIC_` solo expone URL + anon key (pública por diseño, RLS la respalda) + site URL.
  `next.config` no usa `env:`/`publicRuntimeConfig`. `.env*` no trackeados (solo `.example`).

## ✅ Notificaciones / Resend — sin leakage cross-tenant
Destinatarios resueltos por FK directa; el fan-out de consultas scopea
`rol='admin' AND (destino_id IS NULL OR destino_id=<destino del hospedaje>)` → solo super
admins + admins del destino correcto. Reply-To = email del huésped validado con `z.email()`.
Transporte por API JSON de Resend (no SMTP crudo) → sin inyección de headers CRLF.

---

## 🟠 F-E1 (Major) — Flujos de auth sin rate-limit propio → REMEDIADO
- **Archivos:** `src/features/panel/lib/session-actions.ts` (`forgotPasswordAction`,
  `resendConfirmationAction`, `signUpResponsableAction`) + `src/features/consultas/lib/rate-limit.ts`.
- **Problema:** los 3 flujos que MANDAN MAIL eran invocables sin sesión y **no** aplicaban el
  rate-limit persistido que sí protege el form de consultas → un atacante podía automatizar
  POSTs y bombardear una casilla / consumir cuota de Resend+Supabase (acotado solo por el
  throttle nativo de Supabase, ~1/min per-email).
- **Fix:** se generalizó `checkRateLimit(ip, { key, max, windowSeconds })` (clave namespaceada,
  sin migración nueva — reutiliza `check_consulta_rate_limit`). Los 3 flujos ahora llaman
  `authEmailRateLimited()` → **5 req / 10 min por IP**, clave `auth:<ip>` (no colisiona con el
  contador de consultas). `getClientIp()` prefiere `x-real-ip` (Vercel).
- **Verificación:** `tsc --noEmit` ✅.

## 🟡 F-E2 (Minor) — Inyección de HTML en mails → REMEDIADO
- **Archivo:** `src/lib/email/templates.ts`.
- **Problema:** `mensaje` se escapaba, pero `huespedNombre`/`huespedEmail`/`huespedWhatsapp`
  (controlados por un form público anónimo) se interpolaban crudos en el HTML → un nombre como
  `<a href="phish">` se renderizaba en el inbox del responsable (phishing/spoofing, sin
  ejecución de JS).
- **Fix:** helper `esc()` (escapa `& < > " '`) aplicado a los 3 campos del huésped en las dos
  variantes de template de consulta. El `href` del WhatsApp ya usaba la versión solo-dígitos.

## 🟡 F-E3 (Minor) — Enumeración de cuentas en signup → REMEDIADO
- **Archivo:** `src/features/panel/lib/session-actions.ts` (`signUpResponsableAction`).
- **Problema:** ante un email ya existente, devolvía *"Ya existe una cuenta con ese email"* →
  confirmaba existencia de usuarios.
- **Fix:** ahora devuelve la **misma** respuesta que un alta exitosa pendiente de confirmación
  (`{ ok: true, pendingConfirmation: true }`), sin revelar. Si la cuenta ya existía, Supabase
  no manda mail de alta, así que el dueño real no recibe ruido. (forgot-password ya estaba bien
  mitigado.)

---

## Lo que aguanta (verificado)
- **Auto-elevación a admin: no existe.** signup hardcodea `rol:'responsable'`, nunca toca
  `responsabilidades`/`destino_id`, y aborta si ya hay perfil admin para el uuid.
- **Barrera de email confirmado:** la impone Supabase (`signInWithPassword` → `email_not_confirmed`),
  manejada correctamente; ningún flujo la saltea.
- **auth/callback:** sin open-redirect (`next.startsWith("/")` + prefijo origin).

## Cobertura
Revisado: `lib/supabase/admin.ts`, `lib/email/{resend,templates}.ts`, ambos `session-actions.ts`,
las 4 `lib/notifications.ts`, `consulta-actions.ts`+`rate-limit.ts`+`validation.ts`,
`middleware.ts`, `auth/callback/route.ts`, `next.config`, `.gitignore`, `.env.local.example`, y
el rastreo de los 52 importadores de módulos con secretos. No se leyeron valores reales de `.env.local`.

## Pendiente (no bloqueante)
- Mejora opcional: rate-limit también por **email** (no solo IP) en forgot/resend, para cortar
  bombardeo distribuido desde múltiples IPs contra una misma casilla.
