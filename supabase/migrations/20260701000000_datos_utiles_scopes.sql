-- =============================================================================
-- Datos útiles: agregar soporte para scope city/zone/destination
-- =============================================================================

-- 1) Agregar columnas de scope a datos_utiles
alter table public.datos_utiles
  add column scope_type text not null default 'destino' check (scope_type in ('ciudad', 'zona', 'destino')),
  add column scope_id uuid;

-- 2) Migrar datos existentes: scope_id = destino_id
update public.datos_utiles
  set scope_id = destino_id
  where scope_id is null;

-- 3) Hacer scope_id NOT NULL
alter table public.datos_utiles
  alter column scope_id set not null;

-- 4) Remover constraint UNIQUE antiguo e insertar nuevo
alter table public.datos_utiles drop constraint "datos_utiles_destino_id_rubro_id_nombre_key";

-- El nuevo unique es por (scope_type, scope_id, rubro_id, nombre)
alter table public.datos_utiles
  add constraint "datos_utiles_scope_rubro_nombre_unique" unique(scope_type, scope_id, rubro_id, nombre);

-- 5) Mantener FK a destinos (solo para validación en scope_type='destino')
-- Nota: scope_id no puede ser FK porque puede referenciar ciudades, zonas o destinos

-- 6) Actualizar índices
drop index if exists idx_datos_utiles_destino;
drop index if exists idx_datos_utiles_rubro;

create index idx_datos_utiles_scope on public.datos_utiles(scope_type, scope_id);
create index idx_datos_utiles_rubro on public.datos_utiles(rubro_id);
create index idx_datos_utiles_scope_rubro on public.datos_utiles(scope_type, scope_id, rubro_id);

-- 7) Actualizar RLS

-- Remover políticas antiguas
drop policy if exists "Datos útiles admin local" on public.datos_utiles;
drop policy if exists "Datos útiles admin local actualizar" on public.datos_utiles;
drop policy if exists "Datos útiles admin local eliminar" on public.datos_utiles;

-- Nueva política: INSERT
-- - Super admin: cualquier scope
-- - Admin local: solo destino de su destino
create policy "Datos útiles insert"
  on public.datos_utiles for insert
  with check (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid()
        and (
          -- Super admin: sin restricciones
          p.rol = 'super_admin'
          or
          -- Admin local: solo scope='destino' de su destino
          (p.rol = 'admin' and scope_type = 'destino' and p.destino_id = scope_id)
        )
    )
  );

-- Nueva política: UPDATE
create policy "Datos útiles update"
  on public.datos_utiles for update
  with check (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid()
        and (
          -- Super admin: cualquier scope
          p.rol = 'super_admin'
          or
          -- Admin local: solo destino de su destino
          (p.rol = 'admin' and scope_type = 'destino' and p.destino_id = scope_id)
        )
    )
  );

-- Nueva política: DELETE
create policy "Datos útiles delete"
  on public.datos_utiles for delete
  using (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid()
        and (
          -- Super admin: cualquier scope
          p.rol = 'super_admin'
          or
          -- Admin local: solo destino de su destino
          (p.rol = 'admin' and scope_type = 'destino' and p.destino_id = scope_id)
        )
    )
  );

-- 8) Verificación
select
  count(*) as total_datos_utiles,
  (select count(*) from public.datos_utiles where scope_type = 'destino') as scope_destino,
  (select count(*) from public.datos_utiles where scope_type = 'zona') as scope_zona,
  (select count(*) from public.datos_utiles where scope_type = 'ciudad') as scope_ciudad;
