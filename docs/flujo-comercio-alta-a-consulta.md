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
     Arranca en **borrador** y el responsable lo manda a revisión con **"Enviar a
     validación"** → **pendiente_validación**.
   - **Gastronómico / Qué hacer**: `/panel/lugares/nuevo` → elige el tipo. Cuando
     lo crea un **responsable** va **directo a `pendiente_validación`** (no hay paso
     intermedio de "Enviar a validación"; como no puede autopublicar, crearlo ya
     equivale a mandarlo a revisión). Si lo carga el **admin**, queda en borrador y
     lo publica él.
   - En ambos casos: datos, fotos, ubicación, WhatsApp.
2. **Confirmar** — El **admin local** lo ve en **`/admin/validaciones`** (Cola de
   validación, con secciones Hospedajes / Gastronomía / Qué hacer / Combos) y:
   - **Aprueba** → **publicado** (se notifica al responsable por mail), o
   - **Rechaza** → **rechazado** (vuelve al responsable para corregir).
3. **Publicado** — Ya aparece en el sitio público del destino.

Notificaciones: toda transición de estado dispara un mail (al responsable, con
fallback a los admins del destino). Las aprobaciones/rechazos salen con el From
por defecto; las consultas llevan Reply-To al originador.

---

## 5. Descubrimiento e interacción del cliente (sitio público)

### 5.1 — Home / Landing (punto de entrada)

El cliente llega a **`/`** y ve una página unificada (Hub) que muestra:

- **Hero emocional** (banner superior):
  - Atracciones curadas (playas, bosque, eventos) con chip ⭐ "Recomendado".
  - **Buscador principal** (SearchPanel modal):
    - Paso 1: **"¿Dónde?"** — input con autocomplete a destinos publicados.
    - Paso 2: **"¿Tipo?"** — chips de categorías (solo para gastro/atractivos: Bar, Restaurante, Playa, Cultura, etc.).
    - Paso 3: **"¿Cuándo?"** — calendario single/range. Para hospedajes: rango (check-in / check-out). Para gastro/atractivos: fecha única u omitida.
    - Paso 4: **"¿Quién?"** — contadores de adultos, menores, bebés (solo para hospedajes).

- **Bandas horizontales** (carruseles) por vertical:
  - **Hospedajes**: 8-10 items destacados.
  - **Gastronomía**: 8-10 items destacados.
  - **Qué hacer** (atractivos): 8-10 items destacados.

- **Banda "Imperdibles"**: promos + combos (ofertas comerciales especiales).

- **Chips de región**: al clickear, filtran las bandas en vivo sin navegar (solo aplica el filtro).

### 5.2 — Búsqueda y flujo del buscador

Cuando el cliente presiona **"Buscar"** en el SearchPanel:

1. **Si tiene destino + fechas + huéspedes (hospedajes)**:
   - Navega a **`/[destino]/buscar?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&adultos=N&ninos=N&bebes=N`**
   - Se abre la página de **disponibilidad** (paso 5.3).

2. **Si no tiene destino claro o le faltan criterios**:
   - La búsqueda **filtra las bandas en vivo** en el hub sin navegar.
   - El cliente sigue viendo el listado, ahora filtrado.

3. **Reutilización del buscador**:
   - En cualquier página (hub, ficha de hospedaje, etc.) aparece un **BuscadorBar** compacto.
   - El cliente puede editar sus criterios sin perder la página (si solo cambia región, se refiltra en vivo; si cambia fechas, navega a disponibilidad).

### 5.3 — Búsqueda de disponibilidad (hospedajes)

Ruta: **`/[destino]/buscar?check_in=...&check_out=...&adultos=...`**

1. **Sin criterios en la URL**: pantalla vacía pidiendo que el cliente complete la búsqueda (buscador destacado).

2. **Con criterios**:
   - Muestra lista de **UnidadCards** (cabañas, apartamentos, etc.) que cumplen la capacidad y están disponibles en el rango.
   - Cada card incluye:
     - Fotos destacadas (carrusel).
     - Nombre del hospedaje y la unidad.
     - Capacidad máxima.
     - **Precio para el rango buscado** (si la tarifa está cargada).
     - Botón **"Ver detalles"** → navega a ficha de la unidad (paso 5.5).

3. **Contexto preservado**:
   - La URL pasea el contexto (check-in, check-out, pax) a lo largo de toda la jornada.
   - Si el cliente cliquea en una unidad, ese contexto va a la URL: **`/[destino]/hospedajes/[slug]/unidades/[unidadTypeId]?check_in=...&check_out=...`**

### 5.4 — Ficha de hospedaje (detalle del alojamiento)

Ruta: **`/[destino]/hospedajes/[slug]`**

1. **Galería de fotos**: carrusel con fotos principales del hospedaje (orden de presentación controlado por el responsable).

2. **Información general**:
   - Nombre, descripción, ubicación en mapa.
   - Amenities del hospedaje (pileta, WiFi, estacionamiento, etc.).
   - Calificación (si está implementada).

3. **Listado de unidades**:
   - Cada tipo de unidad (ej: "Cabaña de 2 dorm.", "Apart de 1 dorm.") tiene su propia card.
   - Si el cliente viene del buscador, las cards heredan el contexto de fechas/pax.
   - Botón **"Consultar disponibilidad"** → navega a ficha de la unidad.

4. **Contacto directo**:
   - Botón de **WhatsApp** (abre chat del hospedaje).
   - Botón de **Formulario de consulta** (genérico, sin unidad específica).

### 5.5 — Ficha de unidad (detalle específico)

Ruta: **`/[destino]/hospedajes/[slug]/unidades/[unidadTypeId]`**

1. **Fotos específicas** de la unidad (orden controlado por el responsable).

2. **Información de la unidad**:
   - Nombre (ej: "Cabaña Luna – 2 dormitorios").
   - Descripción (distribución, servicios).
   - Capacidad máxima (adultos, menores, bebés).
   - Amenities específicos de la unidad (TV, aire, calefacción, etc.).
   - Ubicación en el mapa.

3. **Precio y disponibilidad**:
   - **Precio resuelto** para el rango de fechas buscado (si viene del buscador).
   - Indicador visual de disponibilidad (verde: disponible, rojo: ocupada).

4. **Consulta/Reserva**:
   - **Formulario de consulta a unidad** (pre-llenado con fechas + pax del search, cliente escribe mensaje).
   - **Opción de canal**: email o WhatsApp.
   - Botón de **WhatsApp directo** (abre chat del hospedaje).

5. **Navegación hacia atrás**:
   - Link a la ficha del hospedaje.
   - Link a la búsqueda (preservando criterios).

### 5.6 — Fichas de comercios (gastronómicos y "qué hacer")

Rutas: **`/[destino]/gastronomia/[slug]`** y **`/[destino]/atractivos/[slug]`**

1. **Galería de fotos** (orden controlado por el responsable).

2. **Información**:
   - Nombre, descripción, tipo de comercio.
   - Ubicación en mapa.
   - Horarios de atención (si están cargados).
   - Contacto: teléfono, email, WhatsApp.

3. **Sin formulario de consulta**:
   - No hay tabla de `consultas` para estos comercios.
   - El cliente contacta **directo por WhatsApp** desde el botón destacado.

### 5.7 — Landing de zona (agrupación geográfica)

Ruta: **`/zona/[slug]`**

1. Muestra todas las **atracciones** de la zona (definidas por el admin/curador).
2. Agrupa **destinos** de la zona (hospedajes, gastro, qué hacer de cada destino).
3. Hero emocional con imágenes de la zona.

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

El canal y el flujo dependen del tipo de entidad:

### 7.A — Hospedajes → consulta formal (lead)

Hay dos variantes, ambas generan un **lead** en la tabla `consultas`:

#### 7.A.1 — Consulta genérica (desde ficha del hospedaje)
1. El cliente, desde **`/[destino]/hospedajes/[slug]`**, completa el **formulario de
   consulta** (nombre, email, WhatsApp, fechas, cantidad de huéspedes, mensaje libre).
2. Se registra como **consulta/lead** con `origen: "form_publico"` y se **notifica por
   mail al responsable** (con **Reply-To** al cliente, así responde directo).
3. El responsable la gestiona en **`/panel/leads`** (y el admin tiene visibilidad
   en `/admin/consultas`).

#### 7.A.2 — Consulta a unidad específica (desde ficha de la unidad)
1. El cliente, desde **`/[destino]/hospedajes/[slug]/unidades/[unidadTypeId]`**,
   viene con **contexto pre-llenado** del search:
   - Fechas (check-in / check-out) ya completadas.
   - Capacidad de huéspedes (adultos, niños, bebés).
   - Unidad específica (ej: "Cabaña Luna – 2 dormitorios").
2. El cliente solo escribe: nombre, email, WhatsApp, mensaje libre (dudas sobre la
   unidad o servicios específicos).
3. Se registra como **consulta/lead** con `origen: "form_unidad"` y se **notifica al
   responsable** igual que 7.A.1.
4. El responsable ve toda la información contextualizada en **`/panel/leads`**.

> **Defensa anti-spam en ambas variantes**: honeypot (campo invisible), rate limit por
> IP (5 consultas / 10 min), validación Zod, y verificación de que el hospedaje
> esté publicado. Auditoría: se registran IP y user-agent.

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
