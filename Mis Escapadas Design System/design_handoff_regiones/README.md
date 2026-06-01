# Handoff: Regiones — agrupamiento geográfico-cultural para Mis Escapadas

## Overview

Este paquete entrega los diseños HTML del **hub paraguas Mis Escapadas a escala** — la home pública que aparece cuando la red tiene cientos o miles de destinos, organizados en un nivel intermedio llamado **Región**.

El entity **Región** es nuevo: es un agrupamiento geográfico-cultural curado por el **Super Admin** del proyecto (ej: "Costa Atlántica Bonaerense", "Sierras de Córdoba", "Patagonia Lacustre"). Cada **Destino** existente pertenece a una Región.

El handoff cubre:

1. El **modelo de datos** de Región (tabla SQL + relación a destinos + RLS).
2. El **CRUD del Super Admin** para administrar regiones (`/admin/regiones`).
3. La **home pública refactorizada** (`/`) — buscador + 4 pills + grilla de regiones + carousels de tendencia/recientes + bioma strip + CTA + vista mapa.
4. La **vista mapa** (`/mapa`) — Leaflet con tiles Carto Positron + pins por bioma + filtros.
5. La **página de región** (`/regiones/{slug}`) — pendiente de diseño pero descripta a nivel funcional.

---

## About the design files

Los archivos en `prototype/` son **diseños HTML de referencia** — prototipos clickeables hechos con React via `@babel/standalone` que muestran el look y feel deseado. **No son código de producción** — la implementación real debe hacerse en el codebase existente (Next.js 15 + TypeScript + TailwindCSS + shadcn/ui + Supabase), reutilizando los componentes y patrones ya establecidos en `cesarsanchez-cell/las-gaviotas-book`.

## Fidelity

**Alta fidelidad** — colores, tipografía, spacing, radios, sombras y micro-interacciones están definidos al pixel. Tomá los valores exactos de `colors_and_type.css` (tokens) y de los componentes JSX bajo `prototype/ui_kits/sitio-publico/components/`.

---

## 1. Modelo de datos — entity `region`

### Tabla SQL (PostgreSQL / Supabase)

```sql
-- Migración: 20260521000001_create_regiones.sql
create table public.regiones (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  nombre          text not null,
  descripcion     text,
  -- biomas dominantes ordenados (primer elemento = bioma principal)
  -- valores válidos: 'playa' | 'bosque' | 'montana' | 'sierra' | 'lago' | 'desierto'
  biomas          text[] not null default '{}',
  -- opcional, para futura geofence (display order, agrupación por país)
  pais            text not null default 'Argentina',
  activo          boolean not null default true,
  destacado       boolean not null default false,
  orden           int    not null default 0,
  -- foto opcional para uso en cards (path en bucket storage)
  foto_path       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index regiones_activo_orden_idx on public.regiones (activo, orden);
create index regiones_slug_idx on public.regiones (slug);

-- Trigger para mantener updated_at
create or replace function tg_touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger regiones_touch_updated_at
  before update on public.regiones
  for each row execute function tg_touch_updated_at();
```

### Relación con `destinos`

```sql
-- Migración: 20260521000002_destinos_region_fk.sql
alter table public.destinos
  add column region_id uuid references public.regiones(id) on delete restrict;
create index destinos_region_id_idx on public.destinos (region_id);

-- Mientras se asigna manualmente cada destino a su región, region_id puede
-- ser null. Una vez asignados todos, considerar:
-- alter table public.destinos alter column region_id set not null;
```

### RLS

```sql
-- Lectura pública de regiones activas
alter table public.regiones enable row level security;

create policy "regiones_public_select"
  on public.regiones for select
  using (activo = true);

-- Sólo super admin escribe (asume helper is_super_admin() definido — ver
-- src/features/admin/lib/scope.ts del codebase actual).
create policy "regiones_super_admin_all"
  on public.regiones for all
  using (public.is_super_admin())
  with check (public.is_super_admin());
```

### TypeScript types

```ts
// src/types/domain.ts (extender)
export type Bioma =
  | "playa" | "bosque" | "montana" | "sierra" | "lago" | "desierto";

export interface Region {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  biomas: Bioma[];
  pais: string;
  activo: boolean;
  destacado: boolean;
  orden: number;
  foto_path: string | null;
  created_at: string;
  updated_at: string;
}

// Extender Destino existente:
export interface Destino {
  // ... campos existentes
  region_id: string | null;
  region?: Region;  // join opcional
}
```

### Data seed inicial — 8 regiones de arranque

Ver `prototype/ui_kits/sitio-publico/data.js` (objeto `MOCK.regiones`). Los slugs y descripciones canónicos son:

| slug | nombre | biomas |
| --- | --- | --- |
| `costa-atlantica-bonaerense` | Costa Atlántica Bonaerense | `[playa, bosque]` |
| `sierras-de-cordoba` | Sierras de Córdoba | `[sierra, bosque]` |
| `patagonia-lacustre` | Patagonia Lacustre | `[lago, montana]` |
| `cuyo-vitivinicola` | Cuyo Vitivinícola | `[montana, desierto]` |
| `norte-andino` | Norte Andino | `[montana, desierto]` |
| `termas-argentinas` | Termas | `[sierra]` |
| `litoral-iguazu` | Litoral e Iguazú | `[bosque, lago]` |
| `patagonia-atlantica` | Patagonia Atlántica | `[playa, montana]` |

Migrar los 4 destinos existentes (Las Gaviotas, Mar Azul, Mar de las Pampas, Colonia Marina) → asignar `region_id` apuntando a `costa-atlantica-bonaerense`.

---

## 2. Super Admin — CRUD de regiones

Nueva ruta `/admin/regiones` con la misma estructura que `/admin/destinos` ya existente. Reutilizar:

- `AdminSidebar` (agregar item: `{ href: "/admin/regiones", label: "Regiones", icon: MapPinned, superOnly: true }`)
- `DestinoForm` como referencia de form pattern (validación, mode admin)
- Tabla con paginación

**Pantallas:**

1. `/admin/regiones` — lista. Columnas: nombre · slug · count destinos · activo (toggle) · acciones.
2. `/admin/regiones/nueva` — form (nombre, slug auto-derivado, descripción, biomas multi-select, foto opcional, activo, destacado, orden).
3. `/admin/regiones/[id]` — edición.

**Validación (Zod):**

```ts
export const regionSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug debe ser kebab-case"),
  nombre: z.string().min(3).max(80),
  descripcion: z.string().max(300).nullable(),
  biomas: z.array(z.enum(["playa","bosque","montana","sierra","lago","desierto"]))
            .min(1, "al menos un bioma").max(3),
  pais: z.string().default("Argentina"),
  activo: z.boolean().default(true),
  destacado: z.boolean().default(false),
  orden: z.number().int().default(0),
  foto_path: z.string().nullable(),
});
```

**Acciones server-side:** crear, actualizar, soft-delete (set `activo = false`), reordenar (drag handle en la lista para cambiar `orden`).

**Tip:** cuando el super admin elige biomas en el form, mostrar un preview de cómo va a quedar la card de la región (igual visual que el preview `RegionCard` del prototipo).

---

## 3. Home pública refactorizada — `/`

Reemplaza el hub paraguas actual (`src/app/page.tsx`). Estructura nueva:

### 3.1 `<SearchHero>` — buscador céntrico
- **Eyebrow** con pin lucide tintado terracota (`var(--me-wm-mis)`) + "Mis Escapadas — Red de portales locales".
- **H1** display Fraunces "¿A dónde te querés escapar?".
- **Subtítulo** corto.
- **Buscador rounded-full** con autocomplete sobre lista de destinos (filtra por `nombre.includes(query)`). Al elegir → navega a `/{destino-slug}`.
- **4-5 pills rápidas**: "Cerca mío" (geolocation), "Playa", "Bosque", "Sierras", "Lago".
- Botón **"Vista mapa"** en top-right → navega a `/mapa`.

Ver: `prototype/ui_kits/sitio-publico/components/SearchHero.jsx`

### 3.2 Sección "Por región" — grilla de regiones
- Eyebrow `Por región` + título "Buscá por la zona del país".
- Grid responsive: 1 col mobile → 2 sm → 3 md → 4 lg.
- Cada card: aspect 4:3, painted gradient con colores de los biomas dominantes + glyph lucide del bioma de fondo, chips inferiores con biomas, nombre, descripción 2 líneas clamp, count de destinos, flecha.
- Click → navega a `/regiones/{region-slug}`.

Ver: `prototype/ui_kits/sitio-publico/components/RegionCard.jsx`

### 3.3 `<NearbyBlock>` — Cerca tuyo
- Prompt centrado pidiendo permiso de geolocation (`navigator.geolocation.getCurrentPosition`).
- Si user permite → carousel de destinos cercanos (calcular por distancia lat/lng, primeros 6).
- Si user niega → mensaje breve.

Ver: `prototype/ui_kits/sitio-publico/components/NearbyBlock.jsx`

### 3.4 "Tendencia esta semana" — carousel horizontal
- Source: query de destinos ordenada por `count(consultas en últimos 7 días)` desc.
- Cards `DestinoMiniCard` con scroll-snap horizontal.

### 3.5 "Recién sumados" — carousel
- Source: destinos con `created_at > now() - interval '30 days'`, ordenados desc.
- Badge "Nuevo · hace X" en cada card (usar formatRelative).

Ver: `prototype/ui_kits/sitio-publico/components/DestinoMiniCard.jsx`

### 3.6 `<BiomaStrip>` — explorá por bioma
- 6 chips grandes coloreados (uno por bioma), strip horizontal.
- Click → `/buscar?bioma=playa` (filtro transversal — independiente de región).

### 3.7 CTA comerciante
- Bloque dark gradient (slate-900 → slate-800).
- "¿Sos comerciante o referente de un destino?" + botón "Sumar mi propuesta" → `/registro`.

---

## 4. Vista mapa — `/mapa`

Pantalla full-screen.

### Stack
- **Leaflet 1.9.4** (gratis, MIT). Cargar desde npm: `npm i leaflet @types/leaflet`.
- **Tiles**: Carto Positron (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`) — gratis, atribuir OpenStreetMap + CARTO.
- Center inicial: `[-38.5, -63.6]`, zoom 4 (toda Argentina). minZoom 3, maxZoom 14.

### Pin custom
HTML divIcon con dot 14px de color del bioma + halo pulsante (animation CSS).

```css
.me-mappin__dot {
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--c);     /* color del bioma primario del destino */
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.25);
}
.me-mappin__ring {
  position: absolute; inset: 0; border-radius: 50%;
  background: var(--c);
  opacity: 0.3;
  animation: mappin-pulse 2.4s cubic-bezier(.22,1,.36,1) infinite;
}
@keyframes mappin-pulse {
  0% { transform: scale(0.6); opacity: 0.4; }
  100% { transform: scale(2.4); opacity: 0; }
}
```

### Datos
Query: todos los destinos activos con `lat` + `lng` no nulos. Necesario agregar columnas a `destinos`:

```sql
alter table public.destinos
  add column lat numeric(9,6),
  add column lng numeric(9,6);
```

### UI sobre el mapa
- **Top bar** con botón "Volver al hub" + título "{N} destinos en Argentina" + filtros (pill "Todos" + 6 pills de bioma).
- **Click en pin** → abre sidebar derecho con tarjeta de preview del destino: foto (gradient bioma + glyph), región, nombre, count hospedajes, botón "Entrar al destino" → `/{destino-slug}`.

### Performance
Con muchos destinos (cientos+), usar **leaflet.markercluster** para clustering. Mientras tanto, layerGroup simple es suficiente.

Ver: `prototype/ui_kits/sitio-publico/components/MapView.jsx`

---

## 5. Página de región — `/regiones/{slug}` (pendiente de diseño)

No fue diseñada en este handoff, pero la estructura es directa — análoga a `/{destino}` ya existente:

- **Header** con marca paraguas + breadcrumb (Mis Escapadas › {Región}).
- **Hero** con descripción + foto (campo `foto_path`).
- **Buscador** filtrado a esa región.
- **Listado de destinos** de la región (mismas `DestinoCard` del paraguas existente).
- **Strip de biomas presentes** (chips clickeables que filtran).
- **Mapa de la región** (mismo MapView con `center` y `zoom` calculados desde bbox de los destinos).

Cuando vayan a implementar, generar un mock primero acá y volver con un nuevo handoff.

---

## 6. Design tokens

### Paleta principal (operator-supplied 2026-05-21)

Ver `prototype/colors_and_type.css` para todos los tokens.

| Token | Hex | Uso |
| --- | --- | --- |
| `--me-bg` | `#F7F1EB` | Background base |
| `--me-fg` | `#00233C` | Texto |
| `--me-color-primary` | `#28566B` | Botones primarios, links |
| `--me-cyan-pop` | `#33CCFF` | Accent muy puntual |
| `--me-pastel-mint` | `#CCFFFB` | Surface pastel |
| `--me-pastel-sea` | `#67AFBF` | — |
| `--me-pastel-green` | `#99CC99` | — |
| `--me-pastel-taupe` | `#A18C78` | — |
| `--me-wm-mis` | `#B5876A` | "Mis" + pin del wordmark |
| `--me-wm-esc` | `#6C9BAE` | "Escapadas" del wordmark |
| `--me-brand-cyan` | `#1AB6E0` | Nombre del destino en header |

### Biomas

| Bioma | Hex | Icon (lucide) |
| --- | --- | --- |
| `playa` | `#3bafda` | `waves` |
| `bosque` | `#3f8159` | `trees` |
| `montana` | `#6b7a8f` | `mountain` |
| `sierra` | `#b97455` | `mountain-snow` |
| `desierto` | `#d9b26a` | `sun` |
| `lago` | `#3678b0` | `sailboat` |

### Tipografía

- Display: **Fraunces** (variable, Google Fonts). h1 / h2 / h3, marca, hero. `tracking-tight` (-0.02em).
- Sans: **Inter** (Google Fonts). Body, UI, eyebrows. Eyebrow = uppercase tracking-widest (0.18em) 14px.

### Spacing, radii, shadows, motion

Idénticos al codebase actual (ver `src/design-system/tokens.ts` y `tailwind.config.ts`).

### Wordmark

- Marca paraguas: **Mis Escapadas** con dos tonos: "Mis" en `var(--me-wm-mis)` (terracota), "Escapadas" en `var(--me-wm-esc)` (sea pastel). Acompañado de un pin map-pin-heart (SVG inline, paths copiados de Lucide) tintado del color de "Mis".
- En el header del destino: marca paraguas + `|` separator + nombre del destino en `var(--me-brand-cyan)`.

---

## 7. Iconography

**Lucide** (`lucide-react` en el codebase). Iconos usados nuevos en este diseño:

`map`, `map-pinned`, `locate-fixed`, `compass`, `layers`, `arrow-left`, `arrow-right`, `flame`, `sparkles`, `building-2`, `utensils`, `camera`, `users`, `wifi`, `dog`, `car`, `flame`, `trees`, `waves`, `mountain`, `mountain-snow`, `sailboat`, `sun`, `bus`, `train-front`, `plane-takeoff`, `external-link`, `shield-check`, `message-circle`, `search`, `x`, `menu`, `image-up`.

El icono `map-pin-heart` no está en el UMD bundle — está inlineado como SVG en `PinHeart.jsx`.

---

## 8. Files en este paquete

```
design_handoff_regiones/
├── README.md                                  ← este archivo
└── prototype/
    ├── Mis Escapadas.html                     ← entry point del prototype
    ├── colors_and_type.css                    ← tokens CSS (paleta, type, motion)
    ├── image-slot.js                          ← web component user-fillable photo
    ├── assets/
    │   ├── logo-pin.jpg                       ← favicon
    │   ├── logo-light.jpg, logo-dark.jpg, logo-double.jpg
    │   ├── logo-misescapadas.svg, logo-double-mark.svg
    │   └── README.md
    └── ui_kits/sitio-publico/
        ├── app.jsx                            ← composición + routing por hash
        ├── data.js                            ← MOCK con regiones, destinos, biomas
        ├── styles.css                         ← estilos del prototype
        └── components/
            ├── Icon.jsx, PinHeart.jsx
            ├── Header.jsx, Footer.jsx
            ├── Hero.jsx                       ← hero del destino
            ├── SearchHero.jsx                 ← hero del hub (buscador céntrico)
            ├── BuscadorBar.jsx                ← buscador check-in/out (en el destino)
            ├── RegionCard.jsx
            ├── DestinoCard.jsx                ← card grande (sin uso actual)
            ├── DestinoMiniCard.jsx            ← card chica para carousels
            ├── NearbyBlock.jsx                ← prompt geolocation
            ├── BiomaStrip.jsx                 ← strip de biomas grandes
            ├── HubView.jsx                    ← composición del hub
            ├── MapView.jsx                    ← vista mapa con Leaflet
            ├── DestinoStrip.jsx               ← weather + bioma + map + transport
            ├── WeatherModule.jsx
            ├── BiomaChips.jsx
            ├── TransportModule.jsx
            ├── MapModule.jsx                  ← mini-map dentro de un destino
            ├── Section.jsx
            ├── HospedajeCard.jsx
            └── LugarCard.jsx
```

---

## 9. Cómo abrir el prototype

Doble click en `prototype/Mis Escapadas.html` (servir con cualquier static server). Rutas del prototype:

- `#` (vacío) → Hub paraguas.
- `#mapa` → Vista mapa.
- `#destino:las-gaviotas` → vista del destino Las Gaviotas.
- Click en "Vista mapa", click en una región (alert — pendiente), click en un pin del mapa, etc.

---

## 10. Orden sugerido de implementación

1. **Schema SQL + migraciones** (`regiones` + `region_id` en `destinos` + lat/lng en `destinos`).
2. **Backfill** — asignar `region_id` y `lat/lng` a los 4 destinos existentes (Las Gaviotas y vecinos → `costa-atlantica-bonaerense`).
3. **Super Admin CRUD** (`/admin/regiones`) — copiar pattern de `/admin/destinos`.
4. **Refactor `/page.tsx` (home pública)** — reemplazar el hub actual por la nueva estructura.
5. **Vista mapa** (`/mapa`) — nueva ruta con Leaflet.
6. **Página de región** (`/regiones/[slug]`) — pendiente de diseño, generar mock acá primero.

---

## 11. Para Claude Code

Cuando tomes este handoff:

1. Leé primero `src/app/page.tsx` y `src/app/[destino]/page.tsx` del codebase para entender los patterns existentes.
2. Leé `src/features/admin/lib/scope.ts` para entender cómo se chequea `is_super_admin` en RLS.
3. Leé `src/components/layout/Header.tsx` y `Footer.tsx` — los componentes nuevos deben encajar con ese estilo.
4. **No copies pixel-perfecto el HTML** — implementá los componentes con Tailwind + shadcn/ui del codebase, usando los hex values del prototype para inicializar los tokens necesarios en `tailwind.config.ts` y `globals.css`.
5. La sección "Cerca tuyo" requiere `navigator.geolocation` — funciona en browser, recordá hacerlo client component (`"use client"`).
6. Para el mapa, Leaflet es client-only — wrap en `dynamic(() => import("./MapView"), { ssr: false })`.
