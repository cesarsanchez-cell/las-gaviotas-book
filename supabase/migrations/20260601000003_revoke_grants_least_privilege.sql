-- =============================================================================
-- Hardening (least-privilege) — quitar privilegios innecesarios a anon/authenticated.
--
-- El dump de auditoría mostró que `anon` y `authenticated` tenían GRANT ALL en
-- todas las tablas de public, incluyendo TRUNCATE/TRIGGER/REFERENCES. No es
-- explotable vía la API (RLS gatea SELECT/INSERT/UPDATE/DELETE y PostgREST no
-- expone TRUNCATE), pero viola mínimo privilegio:
--   - TRUNCATE: NO está sujeto a RLS y es destructivo.
--   - TRIGGER / REFERENCES: no los necesita ningún flujo de la API.
--
-- Mantenemos SELECT/INSERT/UPDATE/DELETE (la RLS los acota por fila). Quitar
-- estos tres es defensa en profundidad y no cambia el comportamiento de la app.
-- =============================================================================

revoke truncate, references, trigger
  on all tables in schema public
  from anon, authenticated;

-- Nota: si en el futuro se crean tablas nuevas, Supabase puede re-otorgar estos
-- privilegios por default. Re-correr este REVOKE (o ajustar ALTER DEFAULT
-- PRIVILEGES) tras agregar tablas.

-- ----------------------------------------------------------------------------
-- Verificación (cerramos con un SELECT, según convención del proyecto).
-- Debe devolver 0 filas: ya no quedan TRUNCATE/TRIGGER/REFERENCES para esos roles.
-- ----------------------------------------------------------------------------
select table_name, grantee,
       string_agg(privilege_type, ', ' order by privilege_type) as privilegios
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')
group by table_name, grantee
order by table_name, grantee;
