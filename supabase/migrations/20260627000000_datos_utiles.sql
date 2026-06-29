-- =============================================================================
-- Datos útiles: rubros y servicios por destino
-- =============================================================================

-- 1) Tabla de rubros globales (Medicina, Emergencias, etc.)
create table public.rubros (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  icono_default text not null, -- ej: "hospital", "police", "ambulance"
  descripcion text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table public.rubros is 'Categorías globales de servicios útiles para destinos';
comment on column public.rubros.slug is 'Identificador único (ej: medicina, emergencias, transporte)';
comment on column public.rubros.icono_default is 'Ícono predefinido si no hay imagen';

-- 2) Tabla de items por destino y rubro
create table public.datos_utiles (
  id uuid primary key default gen_random_uuid(),
  destino_id uuid not null references public.destinos on delete cascade,
  rubro_id uuid not null references public.rubros on delete restrict,
  nombre text not null,
  direccion text,
  contacto text,
  foto_path text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(destino_id, rubro_id, nombre)
);

comment on table public.datos_utiles is 'Items (servicios) por destino y rubro';
comment on column public.datos_utiles.foto_path is 'Ruta en Storage (destinos/<destino_id>/datos-utiles/...). Si es NULL, usar icono_default del rubro';

-- 3) Índices
create index idx_datos_utiles_destino on public.datos_utiles(destino_id);
create index idx_datos_utiles_rubro on public.datos_utiles(rubro_id);

-- 4) RLS para rubros (solo lectura pública)
alter table public.rubros enable row level security;

create policy "Rubros lectura pública"
  on public.rubros for select
  using (true);

-- 5) RLS para datos_utiles
alter table public.datos_utiles enable row level security;

-- Lectura pública
create policy "Datos útiles lectura pública"
  on public.datos_utiles for select
  using (true);

-- Escritura: solo admin local del destino
create policy "Datos útiles admin local"
  on public.datos_utiles for insert
  with check (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid()
        and p.destino_id = destino_id
        and p.rol = 'admin'
    )
  );

create policy "Datos útiles admin local actualizar"
  on public.datos_utiles for update
  with check (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid()
        and p.destino_id = destino_id
        and p.rol = 'admin'
    )
  );

create policy "Datos útiles admin local eliminar"
  on public.datos_utiles for delete
  using (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid()
        and p.destino_id = destino_id
        and p.rol = 'admin'
    )
  );

-- 6) Seed de rubros iniciales
insert into public.rubros (slug, nombre, icono_default, descripcion) values
  ('medicina', 'Salud', 'plus', 'Hospitales, clínicas, farmacias'),
  ('emergencias', 'Emergencias', 'alert-triangle', 'Policía, bomberos, ambulancias'),
  ('transporte', 'Transporte', 'car', 'Taxis, remises, transporte público'),
  ('entretenimiento', 'Entretenimiento', 'music', 'Cines, teatros, discotecas'),
  ('informacion', 'Información', 'map-pin', 'Turismo, oficinas de información');

-- 7) Verificación
select
  (select count(*) from public.rubros) as rubros_count;
