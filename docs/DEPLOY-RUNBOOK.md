# Deploy runbook — the pre-deploy batch

Written 2026-08-14. Everything here needs Phil; none of it can be done from a coding session.

Work through it top to bottom. **Do not skip step 1** — it decides what the rest of the steps even mean.

---

## Step 1 — Find out which migrations are already applied (do this first)

This matters more than anything else on the page. Migrations `0006` and `0011` are **not** additive — running one that has already run, or running one at the wrong moment, does real damage to real driver data.

In the Supabase dashboard: **SQL Editor**, paste this, run it, and keep the result:

```sql
select
  (select count(*) from information_schema.columns
     where table_name='profiles' and column_name='custom_rest_days_enabled') as has_0012_custom_rest,
  (select count(*) from information_schema.tables
     where table_name='push_subscriptions') as has_0013_push,
  (select count(*) from information_schema.tables
     where table_name='push_scheduler_runs') as has_0014_heartbeat,
  (select count(*) from pg_type where typname='garage_name') as has_0011_enums,
  (select count(*) from information_schema.columns
     where table_name='route_alerts' and column_name='active') as has_0010_active_flag,
  (select count(*) from pg_constraint where conname='profiles_garage_check') as has_0006_garage_check,
  (select count(*) from pg_proc where proname='prune_operational_tables') as has_0016_retention;
```

Each column comes back `0` (not applied) or `1` (applied). Anything already `1`, **skip** — do not re-run it.

Then confirm the security hardening from `0005` is genuinely in place on the live database:

```sql
select proname,
       has_function_privilege('anon', oid, 'execute')          as anon_can_run,
       has_function_privilege('authenticated', oid, 'execute') as authed_can_run
from pg_proc
where proname in ('handle_new_user','record_audit_entry','force_user_id_to_auth_uid');
```

**Every `anon_can_run` and `authed_can_run` must be `false`.** If any is `true`, run `0005` before anything else — that is the gap the audit found.

---

## Step 2 — Run the outstanding migrations, in number order

> **Result on 2026-08-14:** everything came back `1` except `has_0016_retention`, which
> was `0`. **`0006` and `0011` — the two dangerous, non-additive migrations — are already
> applied and must NOT be re-run.** The only outstanding migration is `0016`, which is
> purely additive. The warnings below are kept for reference in case a future environment
> is rebuilt from scratch.

Only the ones step 1 showed as `0`. One at a time, checking each succeeds before the next.

**`0006_canonical_garages.sql` — ALREADY APPLIED, do not re-run.**
It force-updates **every** driver's garage to `'Summerhill'`, then locks the column to the canonical list. If any real driver has correctly set a different garage, this overwrites their choice. If ever running it on a fresh environment, check first:

```sql
select garage, count(*) from public.profiles group by garage;
```

**`0011_route_alerts_dropdown_columns.sql` — ALREADY APPLIED, do not re-run.**
It drops and recreates the route-alerts RLS policy as part of converting columns to enums. If it ever fails halfway, route alerts are left with no read policy — meaning drivers see no alerts. Confirm the policy exists with:

```sql
select policyname from pg_policies where tablename='route_alerts';
```

You should see `Drivers can view alerts for their own garage`.

**`0016_operational_table_retention.sql` — this is the one to run.** Before running it, see how much it will clear:

```sql
select
  (select count(*) from public.audit_log)            as audit_rows,
  (select count(*) from public.push_scheduler_runs)  as heartbeat_rows,
  pg_size_pretty(pg_total_relation_size('public.audit_log')) as audit_size;
```

Run the migration, then re-run the count. It should drop, and a `prune-operational-tables-daily` job should appear in `select jobname from cron.job;`.

---

## Step 3 — Deploy the app (client changes only)

This deploy carries: custom/fixed rest days, Bank Holiday In Lieu, automatic period rollover, the week-highlights weekend-naming fix, plus this batch's hardening (nav contrast, Home reorder, error boundary, corrected recovery copy).

It does **not** carry web push. That is deliberate — see step 5.

1. `npm run build`
2. Upload `dist/` to Netlify Drop, as usual.
3. Check the live bundle actually changed — the asset filename should differ from `index-BcANYVLy.js`, which is what was live before this batch.

---

## Step 4 — Check it on a real phone

Nothing in this batch has been tested on real hardware. All the measurements in `AUDIT-2026-08-14.md` were a desktop browser at phone sizes.

On your own phone, signed in as a real driver:

- Home shows **today's duty first**, above the week highlights and the upcoming carousel, and you can read the report/finish times without scrolling.
- Switch to **light** theme in Settings. The bottom bar should be **white**, not near-black, and the inactive labels readable.
- Log a shift, then log a day off on the **same date** — the day off should replace the shift, and the leave totals should be right.
- If you have custom rest days set up, check the rest days land on the weekdays you picked.
- Check the Period screen edit/delete buttons still work.

If anything is wrong, do not fix it live — tell me what you saw and we roll back by re-uploading the previous `dist/`.

---

## Step 5 — Web push, separately and later

Push is a whole server-side subsystem: an Edge Function, a pg_cron schedule, VAPID keys, and three tables. It has never run against a real driver, and its failure mode is invisible from the app — a driver simply never gets reminded, and nobody finds out.

Deploy it on its own, after step 4 is confirmed good, so that if reminders misbehave there is only one candidate cause. Its own runbook is at `docs/superpowers/plans/2026-08-13-web-push-runbook.md`.

Before it goes out, two things from the audit still want doing:
- the notification permission prompt currently fires cold on first Home render, and a reflex "Deny" silently disables reminders forever;
- the roster URL both the app and the Edge Function read is pinned to the `main` branch, so a roster edit goes live instantly with no review.

---

## Step 6 — The custom domain

`rosterbuddy.ie` currently resolves to nothing. It is registered and set as the primary domain in Netlify, but its nameservers (`ns0/ns1/ns2.reg365.net`, Register365) serve a zone with no A record and no CNAME — so both HTTP and HTTPS fail outright, and Netlify cannot issue an SSL certificate until that changes.

Fix it in Register365, not Netlify. Simplest route: change the domain's nameservers to the four Netlify shows under its domain settings, and let Netlify run DNS and SSL. Allow up to a few hours.

Until then the working address is `db-shift-tracker.netlify.app`.

---

## If something goes wrong

- **App broken after deploy** — re-upload the previous `dist/` to Netlify Drop. The database is unaffected by an app rollback.
- **A migration failed halfway** — stop. Do not run the next one. Send me the exact error text.
- **A driver reports wrong hours or leave** — get the date and what they expected. The new tests in `periodMutations.test.js` cover this logic, so a real failure there is information worth having.
