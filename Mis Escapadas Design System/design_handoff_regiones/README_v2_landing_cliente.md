# Handoff v2 — Landing del cliente (Mis Escapadas)

> Complementa `README.md` (este mismo folder, v1) que cubre el entity Región,
> el CRUD del Super Admin, y la vista mapa. Esta v2 documenta el rediseño de
> la **experiencia del cliente** sobre la home y el destino, hecho 2026-05-29.

## Qué cambió desde v1

El prototipo (`prototype/Mis Escapadas.html` + `prototype/ui_kits/sitio-publico/`)
ahora trae:

1. **Home estilo Airbnb** (`HubV2.jsx` + `AirbnbTop.jsx` + `SearchPanel.jsx`).
2. **Buscador consciente de la vertical**.
3. **Promos** (individuales + sinergias) en home y dentro del destino.
4. **Reglas de publicación** aplicadas en todo el árbol.
5. **Destino landing emocional** (`HeroCarousel.jsx`), **Armador** (`ArmadorView.jsx`), **Combos** (`ComboCard`/`CombosSection`/`ComboDetailModal`), **DestinoPromos**.

---

## 1. Verticales

Tres verticales en el top bar: **Hospedajes · Gastronomía · Qué hacer**.
("Qué hacer" agrupa Atractivos + Actividades + Eventos.)

`Promos` NO es vertical — es un resultado contextual (ver §3).

## 2. Buscador (SearchPanel.jsx) — selectores independientes + vertical-aware

- Cada campo es **opcional**: se puede aplicar con solo "Dónde".
- **Dónde**: autocomplete de ciudad / región / país (respeta reglas de
  publicación). Botón **"Mi ubicación"** inline (geolocalización
  `navigator.geolocation`) en la misma línea del input.
- **2º/3º selector cambian según vertical**:
  - **Hospedajes** → `Cuándo` (chips rápidos + **calendario manual** check-in/check-out con `<input type="date">`) + `Quién` (contadores **adultos / menores / bebés**).
  - **Gastronomía** → `Tipo` (Restaurante, Parrilla, Bar, Cervecería, Café, Parador, Heladería, Pizzería) + `Cuándo`.
  - **Qué hacer** → `Qué` (Atractivos, Actividades, Eventos) + `Cuándo`.
- El pill superior refleja las etiquetas de la vertical activa.

`onApply` devuelve `{ donde, cuando, tipo, quien, pax:{adultos,menores,bebes}, fechas:{in,out} }`.

## 3. Lógica de resultados en la home

- **Con "Dónde"** → banda **"Promos en {lugar}"** arriba + grilla del vertical filtrada al lugar.
- **Sin "Dónde"** → banda **"Promos destacadas — Lo mejor de cada lugar"** (scroll horizontal; hasta 2 promos por destino, ordenadas por descuento).
- **Geolocalización activada** → banda **"Cerca tuyo"** con destinos cercanos.
- **"Sumar mi propuesta"** = banner compacto → redirige al **login de responsables existente** (`onSumarPropuesta`; en el prototipo setea `#responsables-login`). Es la puerta para que hospedajes/gastros pidan ingreso.

## 4. Promos — modelo de datos

Dos tipos, ambos cargados por el admin local:

- **Individuales** (`promosIndividualesPorDestino` en `data.js`): descuento/beneficio sobre **un** comercio. Campos: `slug, ref (slug del comercio), tipo (hospedaje|gastronomia|atractivo), titulo, bajada, beneficio, pct?, validez, photo`.
- **Sinergias** = los combos curados (`combosPorDestino`), que cruzan 2-3 comercios. Ver v1/handoff de combos.

Sugerencia de schema:

```sql
create table public.promos (
  id uuid primary key default gen_random_uuid(),
  destino_id uuid not null references destinos(id) on delete cascade,
  comercio_tipo text not null check (comercio_tipo in ('hospedaje','gastronomia','atractivo')),
  comercio_id uuid not null,           -- FK polimórfica a hospedaje/lugar
  titulo text not null,
  bajada text,
  beneficio text not null,
  pct int,                             -- descuento %, opcional
  vigencia_desde date,
  vigencia_hasta date,
  activo boolean not null default true,
  created_at timestamptz default now()
);
```

## 5. Promos dentro del destino (DestinoPromos.jsx)

Al entrar a un destino, banda **"Promos en {destino}"** con un toggle de
vertical (Hospedajes/Gastronomía/Qué hacer). Por defecto abre en la vertical
que el viajero venía mirando en el hub (`window.__meVertical`). Muestra:
- promos **individuales** de esa vertical, +
- **sinergias** (combos) que **contienen** esa vertical (alguno de sus chips es del tipo).

## 6. Reglas de publicación (aplicadas en todo el árbol)

Implementadas como helpers en `data.js` (`isDestinoPublicado`,
`isRegionPublicada`, `getPublishedRegiones`, `getPublishedDestinos`,
`getDestinosDeRegion`). En producción son `WHERE activo = true AND EXISTS(...)`:

- **Destino** publicado ⇔ `activo` y ≥1 hospedaje publicado.
- **Región** visible ⇔ `activo` y ≥1 destino publicado. (Regiones sin destinos o despublicadas NO aparecen ni en grilla ni en filtros ni en mapa.)
- **Hub**: 0 destinos → pantalla "Estamos preparando los primeros destinos"; 1 destino → redirige directo; 2+ → home normal.
- **Región** con 1 solo destino → al tocarla salta directo al destino (sin página de región intermedia).
- **Destino** con las 3 listas vacías → "Todavía estamos cargando contenido…".
- Secciones del destino se ocultan si su lista está vacía.

## 7. Paleta (sin cambios respecto a la cargada)

Definida en `prototype/colors_and_type.css`. Background `#F7F1EB`, foreground
`#00233C`, primary petrol `#28566B`, accent cyan `#33CCFF`, pastels mint/sea/
green/taupe, wordmark "Mis" `#B5876A` / "Escapadas" `#6C9BAE`. **El logo
(pin map-pin-heart relleno) no se altera.**

## 8. Mobile-first

Diseñado para 85% mobile / 10% desktop / 5% tablet. Todo arranca en 1-2
columnas, escala a más en breakpoints. Cards de hub al ~50% (grids de 5-6 col
en desktop). Iconografía **lucide**, similar pero no igual a Airbnb
(`bed-double`, `utensils-crossed`, `compass`, `tag`, `link-2`, `locate-fixed`,
`heart`, `store`, `user`, `menu`).

## 9. Archivos nuevos en el prototipo (vs v1)

```
ui_kits/sitio-publico/components/
  AirbnbTop.jsx        — top bar + pill + verticales
  UserMenu.jsx         — avatar + login/registro
  SearchPanel.jsx      — buscador vertical-aware + geo + calendario
  HubV2.jsx            — home (reemplaza HubView v1)
  DestinoPromos.jsx    — promos dentro del destino
  HeroCarousel.jsx     — hero emocional del destino
  ComboCard.jsx / CombosSection.jsx / ComboDetailModal.jsx
  ArmadorView.jsx      — armador interactivo de escapadas
  (HubView.jsx, Hero.jsx, SearchHero.jsx, RegionCard.jsx quedan como legacy/no usados)
```

## 10. Pendientes para definir con el equipo (no diseñados)

- **Página de región** (`/regiones/[slug]`) cuando hay 2+ destinos.
- **Armador**: precio (total vs breakdown), WhatsApp (¿1 responsable coordina o 3 chats?), y **UI admin para que el local cargue cross-promos**.
- **Login de responsables**: el prototipo solo redirige; usar la ruta real existente.
- Conectar clima/mareas/sol a API real (open-meteo); tours/eventos como entities.
