-- Lets Phil switch an alert off without deleting it (e.g. to keep a test row,
-- or re-use a real one for a diversion that recurs) — independent of the
-- date range, which stays purely about when an active alert is relevant.
alter table public.route_alerts
  add column active boolean not null default true;
