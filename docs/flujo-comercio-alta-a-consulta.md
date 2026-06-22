# Mis Escapadas — Flujo: del alta del comercio a la consulta del cliente

Documento funcional de punta a punta. Cubre quién hace qué, en qué orden, y por
qué rutas, desde que un comercio se da de alta hasta que un cliente consulta.

> Alcance: hospedajes, gastronómicos y "qué hacer" (los tres comerciales, con
> responsable). Las **atracciones** (curaduría del hero) van aparte — ver §6.

---

## 1. Roles

| Rol | Quién es | Alcance |
|-----|----------|---------|
| **Super Administrador** | Dueño de la red | Todo. Estructura geográfica (regiones, ciudades, zonas, destinos), atracciones, y todo lo de los admins locales en cualquier destino. |
| **Administrador Local** | Encargado de un destino | Su **destino**: hospedajes, gastronómicos y "qué hacer" — validar, editar, asignar responsables. Puede ser **curador** de una zona (gestiona sus atracciones) si el super admin lo designa. |
| **Responsable** | Dueño/operador de un comercio | Sus propias entidades (hospedaje / gastronómico / qué hacer): cargar, editar, fotos, enviar a validación. NO publica solo. |
| **Cliente / huésped** | Visitante público | Sin login. Descubre, busca y consulta. |

---

## 2. Estados de una entidad comercial

```
borrador ──(responsable envía a validación)──▶ pendiente_validación
   ▲                                                   │
   │                                       (admin local aprueba)
   │                                                   ▼
rechazado ◀──(admin rechaza)──┐                    publicado
                              │                        │
                              └────────────────────────┤ (admin pausa/reactiva)
                                                        ▼
                                                     pausado
```

- **borrador**: lo está armando el responsable (o el admin todavía no lo publicó). No se ve en el sitio.
- **pendiente_validación**: el responsable lo mandó a revisión. Aparece en la **Cola de validación** del admin local.
- **publicado**: visible al público.
- **pausado**: lo despublica el admin/responsable temporalmente (no se ve, no se pierde).
- **rechazado**: el admin lo devolvió; el responsable corrige y reenvía.

> Cuando el **admin** carga la entidad él mismo, puede publicarla directo (no
> necesita pasar por validación). El circuito de validación es para lo que carga
> un **responsable**.

---

## 3. Alta del comercio (cómo entra al sistema)

Hay dos caminos, no excluyentes:

### 3.A — Auto-alta del dueño (self-service)
1. El dueño entra a **`/registro`** ("Sumar mi propuesta" desde la home).
2. Crea su cuenta como **responsable** (nombre, email, contraseña).
3. **Confirma el email** (link). Sin confirmar, no puede ingresar — la validación
   de email es la primera barrera de identidad.
4. Ingresa en **`/login`** y entra a su panel **`/panel`**.

### 3.B — Alta gestionada por el admin
- El admin **invita al responsable por email** desde la gestión de responsables
  (`/admin/responsables`), opcionalmente ya vinculándolo a entidades; **o**
- El admin **carga la entidad** él mismo y luego le **asigna un responsable**
  (desde la ficha de la entidad o desde la gestión de responsables).

---

## 4. Carga y publicación (responsable → admin local)

1. **Cargar** — En `/panel` el responsable crea su entidad:
   - **Hospedaje**: `/panel/hospedajes/nuevo` (+ tipos de unidad, disponibilidad, tarifas).
   - **Gastronómico / Qué hacer**: `/panel/lugares/nuevo` → elige el tipo (gastronómico o "qué hacer").
   - Carga datos, fotos, ubicación, WhatsApp. Arranca en **borrador**.
2. **Enviar a validación** — El responsable lo manda a revisión → **pendiente_validación**.
3. **Confirmar** — El **admin local** lo ve en **`/admin/validaciones`** (Cola de
   validación, con secciones Hospedajes / Gastronomía / Qué hacer / Combos) y:
   - **Aprueba** → **publicado** (se notifica al responsable por mail), o
   - **Rechaza** → **rechazado** (vuelve al responsable para corregir).
4. **Publicado** — Ya aparece en el sitio público del destino.

Notificaciones: toda transición de estado dispara un mail (al responsable, con
fallback a los admins del destino). Las aprobaciones/rechazos salen con el From
por defecto; las consultas llevan Reply-To al originador.

---

## 5. Descubrimiento del cliente (sitio público)

- **Hub / Home (`/`)** y **Home de destino (`/[destino]`)**:
  - **Hero emocional**: atracciones curadas (chip ⭐ "Recomendado") con su zona.
  - **Banda "Imperdibles"**: promos + combos (ofertas comerciales) en un carrusel.
  - **Verticales**: Hospedajes · Gastronomía · Qué hacer.
  - **Buscador** (calendario de rango): "dónde", fechas, huéspedes.
- **Búsqueda de disponibilidad** (hospedajes): `/[destino]/buscar` →
  resultados por **unidad** según fechas y huéspedes (con precio si hay tarifa).
- **Ficha pública**:
  - Hospedaje: `/[destino]/hospedajes/[slug]` (galería, amenities, ubicación,
    disponibilidad informativa, unidades).
  - Gastronómico / Qué hacer: `/[destino]/gastronomia/[slug]` y
    `/[destino]/atractivos/[slug]` (datos, fotos, contacto).
- **Zona**: `/zona/[slug]` (atracciones + destinos de la zona).

---

## 6. Caso aparte: Atracciones (curaduría)

Las **atracciones** (playas, bosque, eventos: lo que "tracciona" gente) **no**
siguen el flujo comercial:

- **Sin alta pública, sin responsable, sin validación, sin precio.**
- Las carga el **admin** (super admin, o el **curador** de la zona) en
  `/admin/atracciones`; la estructura de zonas en `/admin/zonas` (super admin).
- Se publican directo y componen el **hero**. Landing pública: `/zona/[slug]`.

---

## 7. Consulta del cliente (el cierre del circuito)

El canal depende del tipo:

### 7.A — Hospedajes → consulta formal (lead)
1. El cliente, desde la ficha/unidad, completa el **formulario de consulta**
   (fechas, huéspedes, mensaje).
2. Se registra como **consulta/lead** en el sistema y se **notifica por mail al
   responsable** (con **Reply-To** al cliente, así responde directo).
3. El responsable la gestiona en **`/panel/leads`** (y el admin tiene visibilidad
   en `/admin/consultas`).

### 7.B — Gastronómico / Qué hacer → contacto directo
- No usan la tabla de consultas. El cliente contacta por **WhatsApp / teléfono**
  directamente desde la ficha (botón de WhatsApp). Es contacto inmediato, sin lead.

> Regla: la tabla `consultas` es **solo de hospedajes**. Gastronómicos y "qué
> hacer" resuelven por WhatsApp directo.

---

## 8. Resumen en una línea por actor

- **Cliente**: descubre en el hub → busca/elige → consulta (hospedaje: formulario+mail; gastro/qué hacer: WhatsApp).
- **Responsable**: se registra → carga → envía a validación → recibe consultas.
- **Admin local**: valida/publica lo de su destino → asigna responsables → ve consultas.
- **Super admin**: arma la estructura geográfica + atracciones → todo lo anterior en cualquier destino.

---

## 9. Mapa rápido de rutas

| Qué | Ruta |
|-----|------|
| Registro de dueño | `/registro` |
| Login responsable | `/login` |
| Login admin | `/admin/login` |
| Panel del responsable | `/panel` (hospedajes, lugares, leads) |
| Cola de validación (admin) | `/admin/validaciones` |
| Admin por vertical | `/admin/hospedajes` · `/admin/gastronomia` · `/admin/atractivos` (Qué hacer) |
| Curaduría | `/admin/atracciones` · `/admin/zonas` |
| Home red / destino | `/` · `/[destino]` |
| Buscar disponibilidad | `/[destino]/buscar` |
| Fichas públicas | `/[destino]/hospedajes/[slug]` · `/[destino]/gastronomia/[slug]` · `/[destino]/atractivos/[slug]` |
| Landing de zona | `/zona/[slug]` |
