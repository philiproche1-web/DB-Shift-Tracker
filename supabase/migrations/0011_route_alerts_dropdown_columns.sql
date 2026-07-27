-- Converts route_alerts.garage and .type to Postgres enums so the Supabase
-- Table Editor renders them as a dropdown picker instead of free text —
-- garage previously had no validation at all (a typo would silently never
-- match any driver's profile.garage), and type's plain check constraint
-- still let a typo (e.g. wrong case) through the Table Editor UI.
create type public.garage_name as enum (
  'Summerhill', 'Donnybrook', 'Clontarf', 'Phibsborough',
  'Ringsend', 'Conyngham Road', 'Harristown', 'Jamestown'
);
create type public.alert_type as enum ('diversion', 'roadworks', 'other');

-- The existing RLS policy reads route_alerts.garage, so it has to be dropped
-- before that column's type can change, then recreated below with an
-- explicit cast — profiles.garage stays plain text (it's driven by the
-- app's own signup/settings dropdown, out of scope here), so the comparison
-- needs to cast one side to match the other.
drop policy "Drivers can view alerts for their own garage" on public.route_alerts;

alter table public.route_alerts
  alter column garage type public.garage_name using garage::public.garage_name;

alter table public.route_alerts
  drop constraint route_alerts_type_check;

alter table public.route_alerts
  alter column type type public.alert_type using type::public.alert_type;

create policy "Drivers can view alerts for their own garage"
  on public.route_alerts for select
  to authenticated
  using (garage = (select garage from public.profiles where id = auth.uid())::public.garage_name);

-- To add a garage later (e.g. when a new depot goes live), run separately:
--   alter type public.garage_name add value 'NewGarageName';
