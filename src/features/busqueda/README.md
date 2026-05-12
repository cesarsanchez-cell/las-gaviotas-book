# feature: busqueda

Filtros y búsqueda sobre el listado de hospedajes.

- `components/FiltrosBar.tsx` — barra de filtros con estado en URL (nuqs en Etapa 1.5).
- `lib/filters.ts` — parsing y serialización de filtros.

## Reglas

- Estado de filtros vive en la URL, no en context global.
- Mantener filtros como funciones puras → fácil testear y mover a server side.
