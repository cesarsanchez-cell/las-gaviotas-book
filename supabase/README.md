# Supabase — Las Gaviotas BOOK 8mPoG3hHe35XmGE2

## Estructura

```
supabase/
├── migrations/
│   ├── 20260512000000_initial_schema.sql   ← tablas, enums, índices, triggers
│   ├── 20260512000001_rls_policies.sql     ← row level security
│   └── 20260512000002_storage_bucket.sql   ← bucket público 'hospedajes'
└── seed.sql                                 ← 1 destino + 3 localidades + 2 hospedajes
```

## Setup paso a paso

### 1. Crear proyecto en Supabase

1. Ir a https://supabase.com/dashboard → New project.
2. Nombre: `las-gaviotas-book`. Región: **South America (São Paulo)** — la más cercana a Argentina.
3. Anotar URL del proyecto y `anon key` + `service_role key` (Settings → API).

### 2. Configurar variables de entorno

Copiar `.env.local.example` a `.env.local` en la raíz del proyecto y completar:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<TU-PROJECT-ID>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Aplicar migraciones

**Opción A — Supabase CLI (recomendado):**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <TU-PROJECT-ID>
supabase db push
```

**Opción B — Dashboard SQL Editor (más rápido para arrancar):**

1. Dashboard → SQL Editor → New query.
2. Pegar contenido de `20260512000000_initial_schema.sql` → Run.
3. Repetir con `20260512000001_rls_policies.sql`.
4. Repetir con `20260512000002_storage_bucket.sql`.

### 4. Cargar seed

Dashboard → SQL Editor → pegar `seed.sql` → Run.

Esto crea:
- 1 destino: Las Gaviotas (uuid `11111111-...`)
- 3 localidades: Centro, Médano, Sur
- 2 hospedajes publicados con fotos placeholder

### 5. Crear admin user

1. Dashboard → Authentication → Users → Add user → escribir tu email + password.
2. Copiar el `id` del usuario creado.
3. SQL Editor → ejecutar:

```sql
insert into perfiles (id, nombre, rol)
values ('<UUID-DE-TU-USER>', 'César Sánchez', 'admin');
```

### 6. (Opcional) Regenerar tipos TypeScript

Para reemplazar `src/types/database.ts` por tipos generados automáticamente:

```bash
npx supabase gen types typescript --project-id <TU-PROJECT-ID> > src/types/database.ts
```

Esto solo cambia el archivo si el schema se modifica más adelante.

## Verificar que todo funcionó

```sql
-- Debe devolver "Las Gaviotas"
select nombre from destinos where slug = 'las-gaviotas';

-- Debe devolver 2 hospedajes
select nombre, tipo, estado from hospedajes;

-- Debe devolver 5 fotos placeholder
select count(*) from hospedaje_fotos;

-- Bucket 'hospedajes' debe estar como público
select id, public from storage.buckets where id = 'hospedajes';
```

## Próximos pasos del proyecto

- Etapa 2 — agregar tabla `consultas` para leads.
- Etapa 3 — agregar `disponibilidad`.
- Etapa 4 — agregar `reservas` + flujo de hold/confirm.
- Etapa 5 — agregar `pagos` + integración MercadoPago.

Cada etapa será una migración nueva con timestamp posterior.
