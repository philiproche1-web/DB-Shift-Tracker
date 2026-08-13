-- One row per subscribed browser/device per driver. A driver can have
-- multiple rows (phone + tablet, etc) — the Edge Function fans out to all
-- of a driver's rows when sending. `endpoint` is unique because the same
-- push endpoint re-subscribing (e.g. after a permission re-prompt) should
-- update the existing row, not create a duplicate that'd double-fire.
-- See docs/superpowers/specs/2026-08-13-web-push-notifications-design.md.
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  keys_p256dh text not null,
  keys_auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Drivers manage their own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Same defense-in-depth as app_data/leave_settings/settings: force user_id
-- to the caller's real identity regardless of what the client sends.
create trigger push_subscriptions_force_user_id
  before insert or update on public.push_subscriptions
  for each row execute procedure public.force_user_id_to_auth_uid();

-- The Edge Function runs as service_role (bypasses RLS) to read every
-- driver's subscriptions and delete dead ones on send failure — no
-- separate policy needed for that.
