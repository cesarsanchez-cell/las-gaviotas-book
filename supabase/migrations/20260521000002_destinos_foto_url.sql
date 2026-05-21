-- Agregar campo opcional `foto_url` a destinos. Lo carga el Super Admin
-- desde /admin/destinos/[id] pegando un URL externo (CDN propio, Unsplash,
-- etc.). Cuando está vacío, las DestinoCard del listado de región caen al
-- gradient pintado con los biomas heredados.

alter table public.destinos
  add column if not exists foto_url text;

-- Verificación
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'destinos'
  and column_name = 'foto_url';
