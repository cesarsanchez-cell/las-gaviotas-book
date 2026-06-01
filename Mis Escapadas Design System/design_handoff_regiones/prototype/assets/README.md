# assets/

Visual assets de Mis Escapadas. Estos están pensados para ser **copiados** a nuevas pantallas, no referenciados cruzados (el design system es read-only desde otros proyectos).

## Files

| File | Uso |
| --- | --- |
| `logo-misescapadas.svg` | Wordmark único (Fraunces, slate-blue). Marca paraguas para footers, OG images, headers del hub. |
| `logo-double-mark.svg` | Marca compuesta `Mis Escapadas · {Destino}` lista para header del destino. La variante `Las Gaviotas` es referencia — duplicar y reemplazar el segundo wordmark para nuevos destinos. |
| `README.md` | Este archivo. |

## Iconografía

No hay sprites SVG de íconos aquí — el sistema usa [**lucide**](https://lucide.dev/) vía CDN (`https://unpkg.com/lucide@0.474.0/dist/umd/lucide.min.js`) con la sintaxis `<i data-lucide="..."></i>` + `lucide.createIcons()`. Ver `README.md` (sección ICONOGRAPHY) en la raíz.

## Hero / placeholder images

El proyecto **no embebe fotos** — son responsabilidad del operador del destino (cargadas via Supabase Storage en producción). Para mocks y prototipos podés tomar fotos costeras de calidad de Unsplash:

- `https://images.unsplash.com/photo-1507525428034-b723cf961d3e` — playa cálida (default hero Las Gaviotas)
- `https://images.unsplash.com/photo-1444090542259-0af8fa96557e` — cabaña en bosque
- `https://images.unsplash.com/photo-1464822759023-fed622ff2c3b` — montaña

Cuando trabajes para producción, **siempre usá fotos reales del destino**. Stock genérico arruina la propuesta de "directorio premium verificado".
