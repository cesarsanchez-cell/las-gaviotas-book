# feature: admin

Panel de administración. Tratado como **CMS-lite**, no como CRUD.

- `components/` — editor de hospedajes (bloques), tabla, cola de validaciones.
- `lib/actions.ts` — Server Actions con auth gate (rol admin/responsable).
- `lib/validation.ts` — checklist de validación de hospedajes.

## Reglas

- Acceso solo con sesión Supabase + rol válido. Middleware bloquea `/admin/*` sin auth.
- Todo cambio de estado de hospedaje queda registrado en `validacion_eventos`.
