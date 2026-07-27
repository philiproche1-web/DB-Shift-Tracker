-- Optional time-of-day window on top of the existing date range, so a
-- rush-hour diversion can be scoped to e.g. 06:00-10:00 on its start/end day
-- instead of showing as active for the whole day. Null means no time
-- restriction on that boundary — existing all-day alerts are unaffected.
alter table public.route_alerts
  add column starts_time time,
  add column ends_time time;
