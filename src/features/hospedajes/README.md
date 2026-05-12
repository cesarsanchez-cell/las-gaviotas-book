# feature: hospedajes

Núcleo del dominio. Todo lo relacionado con la entidad Hospedaje vive acá.

## Estructura

- `components/` — UI específica de hospedajes (Card, Gallery, AmenitiesList, etc.)
- `lib/` — server actions, queries, mutations
- `types.ts` — tipos del feature (re-exporta desde @/types/domain cuando aplique)
- `data/` — mocks y fixtures para desarrollo

## Reglas

- No importar de `features/admin/` ni `features/busqueda/`. Si compartís código, va a `@/lib` o `@/components/ui`.
- Server Actions encapsuladas en `lib/actions.ts` — preparadas para Etapa 4 (volverse endpoints).
