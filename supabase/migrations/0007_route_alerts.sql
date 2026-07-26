-- Diversions, roadworks, and other route notices. One row per notice,
-- scoped to a garage and optionally narrowed to one zone/route within it
-- (null zone = applies garage-wide). Posted directly via the Supabase table
-- editor for now — there's a single admin (Phil), so no in-app write path
-- or admin role is needed yet.
create table public.route_alerts (
  id uuid primary key default gen_random_uuid(),
  garage text not null,
  zone text,
  type text not null check (type in ('diversion', 'roadworks', 'other')),
  description text not null,
  map_url text,
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now()
);

alter table public.route_alerts enable row level security;

-- Read-only for drivers, scoped to their own garage. No insert/update/delete
-- policy is defined, so only the table editor (which uses the service role
-- and bypasses RLS) can write — intentional until there's more than one admin.
create policy "Drivers can view alerts for their own garage"
  on public.route_alerts for select
  to authenticated
  using (garage = (select garage from public.profiles where id = auth.uid()));
