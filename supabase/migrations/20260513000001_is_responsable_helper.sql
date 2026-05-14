-- =============================================================================
-- Las Gaviotas BOOK — Helper is_responsable() + policy refactor
-- =============================================================================
-- La policy original usaba un EXISTS sobre perfiles que puede sufrir problemas
-- de evaluación cuando perfiles tiene RLS. Refactorizamos con una función
-- SECURITY DEFINER (mismo patrón que is_admin) que bypasea RLS al chequear.
-- =============================================================================

create or replace function is_responsable()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles where id = auth.uid() and rol = 'responsable'
  );
$$;

drop policy if exists "Hospedajes: responsable insert" on hospedajes;

create policy "Hospedajes: responsable insert"
  on hospedajes for insert
  to authenticated
  with check (
    is_responsable()
    and estado = 'borrador'
    and destacado = false
    and responsable_validado = false
  );
