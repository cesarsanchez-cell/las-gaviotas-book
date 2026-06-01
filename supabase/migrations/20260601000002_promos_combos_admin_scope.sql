-- =============================================================================
-- F-06 (NO-GO) — Scope de destino en RLS de promos / combos / combo_items.
--
-- Hallazgo del dump de prod: las policies de admin sobre `promos`, `combos` y
-- `combo_items` usaban `is_admin()` SIN scope de destino, aunque las tablas
-- tienen `destino_id`. Un Admin Local autenticado podía leer/escribir promos y
-- combos de CUALQUIER destino pegándole directo a Supabase con su JWT (REST/JS,
-- fuera de la UI). Las server actions sí validan scope, pero la RLS es la última
-- línea y estaba abierta → cross-tenant read/write.
--
-- Fix: reemplazar las policies de admin por versiones scopeadas con
-- `admin_owns_destino(destino_id)` (que ya cubre al super admin: su perfil tiene
-- destino_id NULL y la función matchea cualquier destino). `combo_items` no tiene
-- destino_id propio → se scopea por el combo padre.
--
-- Las policies de lectura PÚBLICA (vigentes / publicados) quedan intactas.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- PROMOS
-- ----------------------------------------------------------------------------
drop policy if exists "Promos: admin lectura completa" on public.promos;
drop policy if exists "Promos: admin escribe" on public.promos;

create policy "Promos: admin lectura scoped"
  on public.promos for select to authenticated
  using (admin_owns_destino(destino_id));

create policy "Promos: admin escribe scoped"
  on public.promos for all to authenticated
  using (admin_owns_destino(destino_id))
  with check (admin_owns_destino(destino_id));

-- ----------------------------------------------------------------------------
-- COMBOS
-- ----------------------------------------------------------------------------
drop policy if exists "Combos: admin lectura completa" on public.combos;
drop policy if exists "Combos: admin escribe" on public.combos;

create policy "Combos: admin lectura scoped"
  on public.combos for select to authenticated
  using (admin_owns_destino(destino_id));

create policy "Combos: admin escribe scoped"
  on public.combos for all to authenticated
  using (admin_owns_destino(destino_id))
  with check (admin_owns_destino(destino_id));

-- ----------------------------------------------------------------------------
-- COMBO_ITEMS — scope por el combo padre (no tiene destino_id propio)
-- ----------------------------------------------------------------------------
drop policy if exists "ComboItems: admin lectura completa" on public.combo_items;
drop policy if exists "ComboItems: admin escribe" on public.combo_items;

create policy "ComboItems: admin lectura scoped"
  on public.combo_items for select to authenticated
  using (
    exists (
      select 1 from public.combos c
      where c.id = combo_items.combo_id
        and admin_owns_destino(c.destino_id)
    )
  );

create policy "ComboItems: admin escribe scoped"
  on public.combo_items for all to authenticated
  using (
    exists (
      select 1 from public.combos c
      where c.id = combo_items.combo_id
        and admin_owns_destino(c.destino_id)
    )
  )
  with check (
    exists (
      select 1 from public.combos c
      where c.id = combo_items.combo_id
        and admin_owns_destino(c.destino_id)
    )
  );

-- ----------------------------------------------------------------------------
-- Verificación (cerramos con un SELECT, según convención del proyecto).
-- Las policies de admin de las 3 tablas deben mostrar admin_owns_destino y
-- NINGUNA debe quedar con `is_admin()` pelado.
-- ----------------------------------------------------------------------------
select tablename, policyname, cmd, coalesce(qual, with_check) as expr
from pg_policies
where schemaname = 'public'
  and tablename in ('promos', 'combos', 'combo_items')
  and policyname ilike '%admin%'
order by tablename, cmd, policyname;
