-- =============================================================================
-- Las Gaviotas BOOK — Fix: responsable puede editar hospedaje publicado
-- =============================================================================
-- Síntoma:
--   Responsable edita la descripción (u otro campo) de un hospedaje en estado
--   'publicado'. Al guardar: "new row violates row-level security policy
--   for table 'hospedajes'".
--
-- Causa:
--   La policy "Hospedajes: responsable update propios" tenía un guard en el
--   WITH CHECK:
--      and estado in ('borrador', 'pendiente_validacion', 'pausado')
--   Aunque el responsable NO esté cambiando el estado, RLS evalúa el WITH
--   CHECK sobre la NEW ROW completa. Si la fila ya está en 'publicado' o
--   'rechazado', falla aunque sólo se haya modificado la descripción.
--
-- Decisión:
--   Quitar el guard. La UI ya impide al responsable cambiar el estado (el
--   campo se renderiza sólo en mode="admin"). Las transiciones legítimas
--   (submitForReview, withdrawFromReview, approve/reject) pasan por server
--   actions que usan service role, no por esta policy.
--   Riesgo residual: un responsable con conocimiento técnico podría POSTear
--   directo al endpoint de Supabase con estado='publicado'. Para nuestro
--   stage actual (Etapa 1.5) es aceptable; si más adelante necesitamos
--   defensa en profundidad, agregamos un trigger BEFORE UPDATE que valide
--   transiciones de estado por rol.
-- =============================================================================

drop policy if exists "Hospedajes: responsable update propios" on hospedajes;

create policy "Hospedajes: responsable update propios"
  on hospedajes for update
  to authenticated
  using ( responsable_owns_hospedaje(id) )
  with check ( responsable_owns_hospedaje(id) );
