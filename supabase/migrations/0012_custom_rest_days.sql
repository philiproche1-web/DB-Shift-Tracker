-- Per-driver override for the global 5-week FIXED_REST_PATTERN. A driver on
-- a fixed weekly schedule (full-time drivers with set rest days, or
-- part-time drivers who work the same days every week) can turn this on and
-- pick which weekday(s) they're always off, repeating every week instead of
-- the standard 5-week rotation. See
-- docs/superpowers/specs/2026-08-13-custom-rest-days-design.md.
--
-- custom_rest_weekdays uses 0=Sunday .. 6=Saturday, matching JS Date.getDay()
-- and the existing FIXED_REST_PATTERN convention in src/lib/roster.js.
--
-- custom_rest_days_since is stamped to today only on the OFF -> ON
-- transition (handled client-side in App.jsx) so the switch applies going
-- forward only — dates before it keep resolving via the standard pattern.
alter table public.profiles
  add column custom_rest_days_enabled boolean not null default false,
  add column custom_rest_weekdays int[] not null default '{}',
  add column custom_rest_days_since date;
