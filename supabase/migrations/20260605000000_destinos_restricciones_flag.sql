-- =============================================================================
-- Etapa 7 — Feature-flag de restricciones por destino
-- =============================================================================
-- Las restricciones (estadía mínima, día fijo de ingreso/egreso) son una
-- capacidad opt-in. Cada destino decide si las usa. Nace DESACTIVADA: ningún
-- destino existente cambia de comportamiento al aplicar esta migración.
--
-- Quién la prende/apaga: super admin (cualquier destino) o admin local del
-- destino. Esa autorización se resuelve en código (server action con service
-- role + chequeo de scope), no por RLS — por eso esta migración no toca
-- policies.
-- =============================================================================

alter table destinos
  add column if not exists restricciones_habilitadas boolean not null default false;

-- Verificación (correr junto con el ALTER en el SQL Editor):
select slug, nombre, restricciones_habilitadas
from destinos
order by orden, nombre;
