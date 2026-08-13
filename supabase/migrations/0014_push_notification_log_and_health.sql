-- Server-side dedup for push reminders — replaces the client's per-device
-- localStorage notifyOnce keys, which can't dedupe across a driver's
-- multiple devices. One row per (driver, date, reminder type) sent;
-- the Edge Function checks for an existing row before sending and inserts
-- one right after a successful send. Only the Edge Function (service_role)
-- writes here — no driver-facing insert/update policy needed, drivers can
-- read their own history same as audit_log.
create table public.push_notification_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  shift_date date not null,
  reminder_type text not null check (reminder_type in ('shift_not_logged', 'break_end')),
  sent_at timestamptz not null default now(),
  unique (user_id, shift_date, reminder_type)
);

alter table public.push_notification_log enable row level security;

create policy "Drivers can view their own push notification history"
  on public.push_notification_log for select
  to authenticated
  using (auth.uid() = user_id);

-- One row per Edge Function invocation, whether or not any reminder was
-- due — this is a heartbeat, not an activity log. UptimeRobot (human step,
-- see runbook) polls a status endpoint that reads the latest row here and
-- alerts Phil if it's gone stale, so a broken cron job doesn't fail
-- silently the way the IHP Etsy-poll outage did.
create table public.push_scheduler_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now()
);

alter table public.push_scheduler_runs enable row level security;
-- No select/insert policy for authenticated users — this table is
-- operational, not driver-facing. Only service_role (Edge Function) and
-- the status endpoint (also service_role, server-side) touch it.
