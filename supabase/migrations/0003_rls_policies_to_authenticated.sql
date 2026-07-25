-- Defense-in-depth: scope every RLS policy to the `authenticated` role
-- explicitly instead of relying on auth.uid() evaluating to NULL for
-- anon requests. Behavior is unchanged (anon access was already denied)
-- but this makes the intent explicit and removes the dependency on
-- Postgres NULL-comparison semantics.
alter policy "Drivers can view their own profile" on public.profiles
  to authenticated;

alter policy "Drivers can update their own profile" on public.profiles
  to authenticated;

alter policy "Drivers manage their own app_data" on public.app_data
  to authenticated;

alter policy "Drivers manage their own leave_settings" on public.leave_settings
  to authenticated;

alter policy "Drivers manage their own settings" on public.settings
  to authenticated;
