# UI Kit · Sitio Público

Click-thru prototype del **sitio público** de Mis Escapadas — lo que ve el viajero cuando entra a `/{destino}`.

## Lo que recrea

Tomado del codebase `cesarsanchez-cell/las-gaviotas-book`, surface `/{destino}`:

- **Header** con doble marca (Mis Escapadas · {Destino}) — `src/components/layout/Header.tsx`.
- **Hero** full-bleed con foto + dark overlay lateral + eyebrow + display title + buscador embebido — `src/app/[destino]/page.tsx`.
- **Strip de destino** (NUEVO — no estaba en el codebase) con: **clima**, **bioma**, **mapa mini** y **transporte**. Estos cuatro módulos fueron pedidos explícitamente por el operador.
- **Listado** de hospedajes y atractivos con cards que coinciden con `HospedajeCard.tsx` y `LugarCard.tsx`.
- **Imperdibles** sección dark.
- **CTA WhatsApp** sin intermediarios.
- **Footer** mínimo.

Lo que **no** está acá (lo dejamos para iteraciones): página de detalle de hospedaje completa, filtros de `/buscar`, galería fullscreen.

## Files

| File | Qué hace |
| --- | --- |
| `index.html` | Host. Carga React + Babel + lucide + todos los `.jsx`. |
| `app.jsx` | Compone la página. Estado de tweaks (bioma, color de destino, animaciones on/off). |
| `components/Header.jsx` | Sticky header con doble marca + nav. |
| `components/Hero.jsx` | Photo background, gradient overlay, eyebrow + h1 + lead + buscador + pills de nav rápida. |
| `components/BuscadorBar.jsx` | Card crema con check-in / check-out / huéspedes + botón buscar. |
| `components/DestinoStrip.jsx` | Strip con los 4 módulos nuevos · grid 2×2 en desktop. |
| `components/WeatherModule.jsx` | Temperatura, condición, máx/mín/UV. Animación de fade-up. |
| `components/BiomaChips.jsx` | Chips de bioma con pop-in stagger. |
| `components/TransportModule.jsx` | Lista de opciones (auto, bus, tren, avión) con tiempo. |
| `components/MapModule.jsx` | Mini-mapa estilizado con pin pulsante. |
| `components/Section.jsx` | Pattern de section con eyebrow + título display + subtitle. |
| `components/HospedajeCard.jsx` | Card con foto, badges, amenities, WhatsApp. |
| `components/LugarCard.jsx` | Card de gastro/atractivo. |
| `components/Footer.jsx` | Footer mínimo con marca + tagline + © year. |
| `components/Icon.jsx` | Wrapper que hidrata `lucide` después de cada render. |
| `data.js` | Datos mock realistas — un destino + 3 hospedajes + 3 lugares + imperdibles. |

## Cómo abrirlo

Doble click en `index.html` (o `show_html` desde la herramienta).

Toggle Tweaks (toolbar) para cambiar bioma, animaciones, dark hero.
