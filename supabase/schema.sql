-- Profiles: one row per driver, populated from signup metadata
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  driver_number text,
  garage text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Drivers can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Drivers can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row when a driver signs up, reading driver_number
-- and garage out of the signup call's user metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, driver_number, garage)
  values (
    new.id,
    new.raw_user_meta_data ->> 'driver_number',
    new.raw_user_meta_data ->> 'garage'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Whole-document sync tables: one JSON blob per driver per table, mirroring
-- the app's existing local storage keys (dbus_v3, dbus_leave, dbus_settings).
create table public.app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.leave_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;
alter table public.leave_settings enable row level security;
alter table public.settings enable row level security;

create policy "Drivers manage their own app_data"
  on public.app_data for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Drivers manage their own leave_settings"
  on public.leave_settings for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Drivers manage their own settings"
  on public.settings for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
