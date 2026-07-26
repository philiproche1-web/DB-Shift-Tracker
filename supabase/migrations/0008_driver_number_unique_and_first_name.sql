-- First name, captured at signup to personalize the app (e.g. "Welcome
-- back, Phil" instead of a generic header).
alter table public.profiles add column first_name text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, driver_number, garage, first_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'driver_number',
    new.raw_user_meta_data ->> 'garage',
    new.raw_user_meta_data ->> 'first_name'
  );
  return new;
end;
$$;

-- Driver numbers are real, company-wide employee identifiers — never
-- meant to repeat, at Summerhill or any garage added later.
alter table public.profiles
  add constraint profiles_driver_number_unique unique (driver_number);

-- Lets the signup form check "is this number already taken" before
-- creating the account. RLS otherwise blocks a driver from seeing any
-- other driver's row (correctly — this function reveals only a yes/no,
-- never whose number it is), so without this the only feedback on a
-- collision would be a raw database error from the unique constraint above.
create function public.is_driver_number_taken(p_driver_number text)
returns boolean
language sql
security definer set search_path = public
as $$
  select exists(select 1 from public.profiles where driver_number = p_driver_number);
$$;

grant execute on function public.is_driver_number_taken(text) to anon, authenticated;
