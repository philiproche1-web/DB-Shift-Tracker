-- Every driver who signed up before the garage picker existed did so while
-- Summerhill was the only garage with duties in the app — normalize any
-- legacy/free-text garage value to Summerhill before locking the column to
-- the canonical list. Run this before (or immediately after) deploying the
-- app update that adds the garage dropdown, so no real driver picks a
-- correct new garage in the gap between deploy and this migration.
update public.profiles
set garage = 'Summerhill'
where garage is distinct from 'Summerhill';

alter table public.profiles
  add constraint profiles_garage_check
  check (garage in (
    'Summerhill', 'Donnybrook', 'Clontarf', 'Phibsborough',
    'Ringsend', 'Conyngham Road', 'Harristown', 'Jamestown'
  ));
