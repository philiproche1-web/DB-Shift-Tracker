-- Rate-limits is_driver_number_taken (0008), which is granted to anon so the
-- signup form can check "is this number already taken" before a driver
-- submits. That grant makes it an unauthenticated enumeration oracle over
-- real Dublin Bus employee numbers: anyone can call it directly over
-- PostgREST and learn, one call at a time, whether any given number exists.
-- Numbers are short and sequential, so an unthrottled caller could sweep the
-- whole range quickly.
--
-- A single global counter, not per-caller: the function is reached via
-- PostgREST with no stable caller identity available (anon has no session,
-- and trusting a client-supplied identifier would be trivial to spoof). A
-- global throttle still does the job — it caps how fast ANYONE can sweep the
-- range, and real usage is one call per driver per signup attempt, nowhere
-- near the limit below.
--
-- 20 calls/minute chosen as generous headroom over real usage (a handful of
-- signups a day, each retrying a few numbers at most if one's taken) while
-- still turning a sweep of the whole number range into hours instead of
-- minutes. Adjust the limit or window here if real usage patterns say
-- otherwise — this is a judgment call, not a precise threshold.
create table public.driver_number_check_rate_limit (
  id boolean primary key default true,
  window_start timestamptz not null default now(),
  count int not null default 0,
  constraint single_row check (id)
);
insert into public.driver_number_check_rate_limit (id) values (true) on conflict (id) do nothing;

alter table public.driver_number_check_rate_limit enable row level security;
-- No policy for authenticated/anon at all: only the function below (security
-- definer) touches this table. Nothing driver-facing needs to read it.

create or replace function public.is_driver_number_taken(p_driver_number text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  -- Reset the window if it's aged out, then claim a slot. Single-row table +
  -- single UPDATE keeps this correct under concurrent calls without needing
  -- a separate lock: Postgres serializes concurrent UPDATEs to the same row.
  update public.driver_number_check_rate_limit
  set window_start = case when now() - window_start > interval '1 minute' then now() else window_start end,
      count = case when now() - window_start > interval '1 minute' then 1 else count + 1 end
  where id = true
  returning window_start, count into v_window_start, v_count;

  -- Rate-limited: fail closed on the ANSWER (report "not taken") rather than
  -- erroring, so the signup form itself never breaks — a driver who hits
  -- this (vanishingly unlikely in real use) just doesn't get the early
  -- warning and finds out from the real unique constraint at signup instead,
  -- same fallback path this function's own comment already documents for a
  -- fetch failure.
  if v_count > 20 then
    return false;
  end if;

  return exists(select 1 from public.profiles where driver_number = p_driver_number.trim());
end;
$$;

-- Same hardening as every other security-definer function here (see 0005,
-- 0016): revoke the default PUBLIC execute grant, then explicitly grant back
-- only what's needed — anon/authenticated still need to CALL this (that's
-- its whole purpose, checked from the signup form before a session exists),
-- just not any function this migration didn't intend to expose.
revoke execute on function public.is_driver_number_taken(text) from public;
grant execute on function public.is_driver_number_taken(text) to anon, authenticated;
