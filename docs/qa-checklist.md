# QA — Checklist de prueba del sistema

Dos capas: **automática** (Playwright E2E) para los flujos de datos, y **manual**
para lo que no conviene automatizar (mails reales, deep-links de WhatsApp, ojo
humano sobre el diseño).

---

## 1. Automático (Playwright)

Requisitos: dev server en `localhost:3005` y `.env.local` con las vars de Supabase
de **prueba** (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) + los
usuarios de test seedeados (`responsable1@test.com`, `admin.test@test.com` — ver
`tests/helpers/auth.ts`).

```bash
npm run dev            # en una terminal
npm run test:e2e       # en otra (o test:e2e:ui para modo interactivo)
```

Cobertura actual:

| Spec | Qué valida |
|------|-----------|
| `golden-path.spec.ts` | Hospedaje: responsable crea → fotos → envía → admin aprueba → público. |
| `edge-cases.spec.ts` | Email duplicado, aislamiento entre responsables, checklist, editar publicado, reglas de fotos. |
| `lugares-flow.spec.ts` | **Gastronómico y "Qué hacer"**: responsable crea → envía a validación → admin aprueba en la cola → ficha pública visible. |
| `consulta.spec.ts` | Ficha de hospedaje muestra/permite la consulta (lead); ficha de "qué hacer" ofrece WhatsApp. |

> Nota: la **entrega real de mails** y el **deep-link de WhatsApp** se chequean a
> mano (abajo). Los tests verifican que el flujo de datos no rompa.

---

## 2. Manual

### A. Alta del comercio
- [ ] `/registro`: alta de un responsable nuevo → llega el **mail de confirmación**.
- [ ] Sin confirmar el email, **no** se puede ingresar.
- [ ] Confirmado, entra a `/panel`.
- [ ] Admin invita responsable por email (`/admin/responsables`) → llega invitación; el invitado define contraseña y entra.

### B. Carga y validación
- [ ] Responsable carga hospedaje / gastronómico / qué hacer (borrador) y sube fotos.
- [ ] "Enviar a validación" → pasa a pendiente.
- [ ] Aparece en `/admin/validaciones` en la sección correcta (Hospedajes / Gastronomía / **Qué hacer**).
- [ ] Admin **aprueba** → llega **mail al responsable** + se ve público.
- [ ] Admin **rechaza** con motivo → llega mail + el responsable ve el motivo.
- [ ] Editar algo publicado lo vuelve a "pendiente" (re-validación).

### C. Responsables y alcance
- [ ] Admin local puede vincular un responsable a hospedaje, gastronómico **y qué hacer** (sección "Qué hacer" en crear/editar responsable).
- [ ] Admin local solo ve/gestiona entidades de **su** destino.
- [ ] Borrar un "qué hacer" vuelve a `/admin/atractivos` (no 404).

### D. Atracciones / Zonas (curaduría)
- [ ] Super admin (o curador) crea zona en `/admin/zonas` con foto.
- [ ] Crea atracción en `/admin/atracciones`, le sube foto y la publica.
- [ ] La atracción aparece en el **hero** con chip ⭐ "Recomendado" + 📍 zona.
- [ ] La card del hero linkea a `/zona/[slug]` (landing con atracciones + destinos).

### E. Descubrimiento del cliente
- [ ] Home `/` y `/[destino]`: hero (atracciones), banda **Imperdibles** (promos+combos), verticales.
- [ ] Buscador: **calendario de rango** — elegir desde y hasta en el mismo calendario, sin que se cierre al primer clic.
- [ ] Búsqueda de disponibilidad `/[destino]/buscar`: el rango también funciona; resultados por unidad.

### F. Consulta del cliente (el cierre)
- [ ] Hospedaje: enviar consulta desde la ficha → **llega el mail al responsable** con **Reply-To** al cliente; aparece en `/panel/leads` y `/admin/consultas`.
- [ ] Gastronómico / Qué hacer: el botón **WhatsApp** abre el chat con el mensaje pre-cargado.

### G. Seguridad / cuentas
- [ ] Reset de contraseña (`/forgot-password`) → mail con link funcional.
- [ ] Un responsable no puede abrir entidades de otro (404).
- [ ] Admin logueado no entra al panel de operador (redirect).
