-- Audit trail: every write to the whole-document sync tables gets a row
-- here with the pre- and post-image, so a bad sync (bug, conflict, or
-- fat-fingered edit) can be diffed and manually recovered after the fact.
-- Drivers can read their own history but cannot insert/update/delete it —
-- only the trigger (running as the table owner via security definer)
-- writes to this table, so a compromised or malicious client can't erase
-- or forge its own trail.
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  operation text not null,
  user_id uuid not null,
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "Drivers can view their own audit history"
  on public.audit_log for select
  to authenticated
  using (auth.uid() = user_id);

create function public.record_audit_entry()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.audit_log (table_name, operation, user_id, old_data, new_data)
  values (
    TG_TABLE_NAME,
    TG_OP,
    coalesce(new.user_id, old.user_id),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('UPDATE', 'INSERT') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

create trigger app_data_audit
  after insert or update or delete on public.app_data
  for each row execute procedure public.record_audit_entry();

create trigger leave_settings_audit
  after insert or update or delete on public.leave_settings
  for each row execute procedure public.record_audit_entry();

create trigger settings_audit
  after insert or update or delete on public.settings
  for each row execute procedure public.record_audit_entry();

-- Defense-in-depth: force user_id to the caller's real auth identity on
-- every write, independent of RLS's WITH CHECK. sync.js passes user_id
-- explicitly (sourced from client-side session state) in its .eq()/.upsert()
-- calls; RLS already rejects a mismatched value, but this trigger means
-- ownership is enforced by the table itself even if a future policy change
-- ever weakens the RLS check.
create function public.force_user_id_to_auth_uid()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

create trigger app_data_force_user_id
  before insert or update on public.app_data
  for each row execute procedure public.force_user_id_to_auth_uid();

create trigger leave_settings_force_user_id
  before insert or update on public.leave_settings
  for each row execute procedure public.force_user_id_to_auth_uid();

create trigger settings_force_user_id
  before insert or update on public.settings
  for each row execute procedure public.force_user_id_to_auth_uid();
