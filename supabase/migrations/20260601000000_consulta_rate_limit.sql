-- =============================================================================
-- F-04 — Rate limit persistente para el form público de consultas/leads.
--
-- El rate limit anterior vivía en un Map en memoria del serverless: cold starts
-- y múltiples instancias lo reseteaban, así que no era efectivo en Vercel.
-- Lo movemos a la base (que ya tenemos) con una función atómica que serializa
-- el read-modify-write por IP vía `for update`.
--
-- Acceso: la tabla tiene RLS habilitada SIN policies → solo el service role
-- (que la app usa server-side) puede tocarla; anon/authenticated quedan fuera.
-- =============================================================================

create table if not exists public.consulta_rate_limit (
  ip           text primary key,
  count        integer not null default 0,
  window_start timestamptz not null default now()
);

alter table public.consulta_rate_limit enable row level security;
-- Sin policies a propósito: nadie con JWT (anon/authenticated) accede; solo
-- service role (bypassa RLS) desde el server.

-- -----------------------------------------------------------------------------
-- Función atómica: incrementa y decide en una sola transacción serializada.
-- Devuelve (allowed, retry_after_segundos).
-- -----------------------------------------------------------------------------
create or replace function public.check_consulta_rate_limit(
  p_ip             text,
  p_max            integer,
  p_window_seconds integer
)
returns table(allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now    timestamptz := now();
  v_window interval := make_interval(secs => p_window_seconds);
  v_entry  public.consulta_rate_limit%rowtype;
begin
  -- Limpieza oportunista de ventanas vencidas (1% de las llamadas) para no
  -- acumular filas indefinidamente.
  if random() < 0.01 then
    delete from public.consulta_rate_limit
    where window_start < v_now - v_window;
  end if;

  -- Aseguramos la fila y la bloqueamos para serializar requests concurrentes.
  insert into public.consulta_rate_limit(ip, count, window_start)
  values (p_ip, 0, v_now)
  on conflict (ip) do nothing;

  select * into v_entry
  from public.consulta_rate_limit
  where ip = p_ip
  for update;

  -- Ventana vencida → reiniciar contador.
  if v_now - v_entry.window_start > v_window then
    update public.consulta_rate_limit
    set count = 1, window_start = v_now
    where ip = p_ip;
    return query select true, 0;
    return;
  end if;

  -- Límite alcanzado → bloquear y reportar cuánto falta.
  if v_entry.count >= p_max then
    return query select
      false,
      ceil(extract(epoch from (v_entry.window_start + v_window - v_now)))::int;
    return;
  end if;

  -- Dentro de la ventana y bajo el límite → contar y permitir.
  update public.consulta_rate_limit
  set count = count + 1
  where ip = p_ip;
  return query select true, 0;
end;
$$;

-- Solo el server (service role) ejecuta la función. Cerramos a anon/authenticated.
revoke all on function public.check_consulta_rate_limit(text, integer, integer) from public;
revoke all on function public.check_consulta_rate_limit(text, integer, integer) from anon, authenticated;
grant execute on function public.check_consulta_rate_limit(text, integer, integer) to service_role;

-- -----------------------------------------------------------------------------
-- Verificación (cerramos el bloque con un SELECT, según convención del proyecto)
-- -----------------------------------------------------------------------------
-- Debe permitir las primeras 5 y bloquear la 6ª:
select * from public.check_consulta_rate_limit('verif-test-ip', 5, 600); -- allowed=t
select * from public.check_consulta_rate_limit('verif-test-ip', 5, 600); -- t
select * from public.check_consulta_rate_limit('verif-test-ip', 5, 600); -- t
select * from public.check_consulta_rate_limit('verif-test-ip', 5, 600); -- t
select * from public.check_consulta_rate_limit('verif-test-ip', 5, 600); -- t
select * from public.check_consulta_rate_limit('verif-test-ip', 5, 600); -- allowed=f, retry_after>0
-- Limpieza del dato de prueba:
delete from public.consulta_rate_limit where ip = 'verif-test-ip';
