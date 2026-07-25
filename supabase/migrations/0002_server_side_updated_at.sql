-- Force updated_at to the server's clock on every write to the sync tables,
-- ignoring whatever value the client sends. Conflict resolution
-- (src/lib/sync.js pickWinner) compares updated_at across devices; if each
-- device's own clock were trusted, a device with a fast/drifted clock could
-- always "win" regardless of which edit actually happened last. Applying
-- this migration keeps that comparison correct as more drivers and devices
-- are added.
create function public.set_updated_at_to_now()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger app_data_set_updated_at
  before insert or update on public.app_data
  for each row execute procedure public.set_updated_at_to_now();

create trigger leave_settings_set_updated_at
  before insert or update on public.leave_settings
  for each row execute procedure public.set_updated_at_to_now();

create trigger settings_set_updated_at
  before insert or update on public.settings
  for each row execute procedure public.set_updated_at_to_now();
