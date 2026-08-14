-- Retention for the two tables that grow forever.
--
-- audit_log (0004) writes a row per write to app_data/leave_settings/settings,
-- storing BOTH the pre- and post-image as jsonb. app_data holds a driver's
-- entire 5-week dataset in one document, so logging a single shift writes two
-- full copies of everything that driver has ever recorded. With real drivers
-- on a free-tier Postgres this is the fastest-growing thing in the database,
-- and a full disk does not degrade gracefully: writes start failing, which
-- means logging a shift starts failing.
--
-- push_scheduler_runs (0014) is a heartbeat, inserted every 2 minutes by the
-- send-reminders cron regardless of whether anything was sent — roughly
-- 262,000 rows a year. Only the newest row is ever read.
--
-- Neither table needs long history. The audit trail exists so a bad sync can
-- be diffed and recovered shortly after it happens; the heartbeat exists so a
-- staleness check can see the last run.

-- ── Retention windows ───────────────────────────────────────────────────────
-- 90 days of audit history comfortably covers "a driver noticed their hours
-- look wrong and we need to see what changed", which is measured in days, not
-- months. 7 days of heartbeats is far more than the staleness check reads.
create or replace function public.prune_operational_tables()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.audit_log where changed_at < now() - interval '90 days';
  delete from public.push_scheduler_runs where ran_at < now() - interval '7 days';
end;
$$;

-- Same hardening as every other security-definer function here (see 0005):
-- functions are created with EXECUTE granted to PUBLIC by default, which makes
-- them callable over PostgREST by anon/authenticated. Only pg_cron should run
-- this.
revoke execute on function public.prune_operational_tables() from public, anon, authenticated;

-- ── Index supporting the deletes ────────────────────────────────────────────
-- Without these each prune is a full scan of the table it is trying to trim,
-- which is exactly backwards once the table is large.
create index if not exists audit_log_changed_at_idx on public.audit_log (changed_at);
create index if not exists push_scheduler_runs_ran_at_idx on public.push_scheduler_runs (ran_at);

-- ── Schedule ────────────────────────────────────────────────────────────────
-- 03:15 daily, off-peak for Dublin drivers. pg_cron is already installed by
-- migration 0015.
select cron.schedule(
  'prune-operational-tables-daily',
  '15 3 * * *',
  $$ select public.prune_operational_tables(); $$
);

-- ── One-off catch-up ────────────────────────────────────────────────────────
-- The scheduled job only trims going forward. This clears whatever has already
-- accumulated. Safe to run repeatedly.
select public.prune_operational_tables();
