# feature: destinos

Multi-tenant suave. Etapa 1 = 1 destino (Las Gaviotas).
Etapa futura = Mar Azul, Mar de las Pampas, Pinamar, etc.

- `lib/destinos.ts` — fetch destino + localidades.
- URLs preparadas: `/[destino]/hospedajes/[slug]`.

## Reglas

- Toda query a hospedajes filtra por `destino_id`. Nunca queries globales.
- Default destino: ver `siteConfig.defaultDestino`.
