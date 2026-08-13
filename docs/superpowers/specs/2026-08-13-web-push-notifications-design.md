# Web Push Notifications — Design Spec

Date: 2026-08-13
Status: approved, not yet planned/implemented

## Problem

Two existing "reminder" features never actually notify the driver:
- "Nudge if today's shift isn't logged"
- "Remind me before break ends" (N min before, configurable)

Root cause: both rely on a plain browser `Notification` call driven by React state / `setInterval` — [src/screens/HomeScreen.jsx:238-279](../../../src/screens/HomeScreen.jsx) (`setInterval(check, 60000)` for the break reminder). This only runs while the app is open in the foreground. Mobile browsers suspend JS timers within seconds of backgrounding/locking the phone — exactly when a driver has the app closed. [public/sw.js](../../../public/sw.js) has no `push` event listener, so nothing can fire while the app is closed. Not a permissions bug — Android's app-level notification permission is already confirmed granted.

## Scope

Both broken notification types get fixed by the same infrastructure:
1. Shift-not-logged nudge
2. Break-end reminder

## Architecture

Raw Web Push + VAPID, entirely inside the existing Supabase stack (no new vendor account — Firebase Cloud Messaging and OneSignal considered and rejected: both add a vendor account for Phil to manage, which the existing stack doesn't need).

Flow: browser subscribes via `sw.js`'s push API using the VAPID public key → subscription POSTed to a new `push_subscriptions` Supabase table → pg_cron invokes a Supabase Edge Function every 1-5 min → Edge Function reads today's shifts + due subscriptions, computes which drivers are due a reminder right now, sends push via a Deno-compatible web-push library → `sw.js`'s `push` handler calls `self.registration.showNotification(...)`, even with the app fully closed.

## Components

### Human-only steps (no sequence dependency between them; can happen any time relative to the build below)
- **VAPID keypair generation** — one-time, one command, paste output into Supabase project secrets. Copy-paste-exact instructions provided when this point is reached.
- **UptimeRobot monitor** — new monitor pointed at the Edge Function's status endpoint. Depends on the endpoint existing, so this one specifically waits on the build reaching that point.
- **Live phone confirmation** — final end-to-end check during a real upcoming break window. Can't happen in a dev session; the last milestone, potentially days after "built and reviewed."

### Build steps (no human input needed)
1. **Migration**: `push_subscriptions` table (id, user_id, endpoint, keys_p256dh, keys_auth, created_at) + RLS policy. Follows the migration style of `supabase/migrations/0012_custom_rest_days.sql`.
2. **Migration**: `push_notification_log` table (driver_id, shift_date, reminder_type, sent_at), unique constraint on (driver_id, shift_date, reminder_type) — server-side dedup so a driver's multiple devices don't double-fire. Replaces the current per-device localStorage `notifyOnce` keys for this purpose.
3. **Frontend subscribe flow**: request push permission, subscribe via service worker + VAPID public key, POST subscription to Supabase. Extends the existing Settings notification-toggle UX (`src/screens/SettingsPanel.jsx` notifications section) rather than introducing a new pattern.
4. **`sw.js` push handler**: `push` event listener → `showNotification`, plus a `notificationclick` handler.
5. **Edge Function scheduler** (the hard part): reads every driver's `push_subscriptions` + `app_data.periods[].shifts[]` for today, computes today's break-end time and shift-logged status. This requires porting `shiftBreakEnd`/duty-lookup logic from `src/lib/dutyMath.js` / `src/lib/roster.js` into the Deno Edge Function runtime — a genuine re-implementation (different runtime, needs bundled roster/duty data available server-side), not a copy-paste. Checks `push_notification_log` before sending, writes to it after.
6. **Cron trigger**: pg_cron invoking the Edge Function every 1-5 minutes.
7. **Health checker**: Edge Function stamps a "last successful run" timestamp (own table or existing log table); UptimeRobot monitor (human step above) pings a small status endpoint that surfaces it, alerts if stale. Same pattern as the IHP UptimeRobot monitors — small addition, not skipped.

## Data flow

```
Driver's browser --(subscribe)--> push_subscriptions table
pg_cron --(every 1-5 min)--> Edge Function
Edge Function --(reads)--> push_subscriptions + app_data.periods[].shifts[] + push_notification_log
Edge Function --(computes)--> ported dutyMath/roster logic (Deno)
Edge Function --(sends, if due & not in log)--> web-push library --> browser push service
Edge Function --(writes)--> push_notification_log (dedup)
Edge Function --(stamps)--> last-run timestamp
sw.js --(push event, app closed or open)--> showNotification
UptimeRobot --(polls)--> status endpoint --> alerts Phil if stale
```

## Error handling

- Dedup: unique constraint on `push_notification_log` (driver_id, shift_date, reminder_type) prevents double-send across a driver's multiple devices.
- Silent failure prevention: UptimeRobot catches a stale last-run timestamp rather than relying on fire-and-forget.
- Expired/invalid push subscriptions (driver revoked permission, uninstalled): Edge Function should catch send failures per-subscription and remove dead subscriptions from `push_subscriptions`, not fail the whole batch.

## Testing

Standard SDD pipeline: superpowers:brainstorming (this doc) → superpowers:writing-plans → superpowers:subagent-driven-development, worktree-isolated, task-by-task with review, final whole-branch review — same pipeline used for the two 2026-08-13 features (custom rest days, automatic period rollover), both of which caught genuine bugs only at the final-review stage.

Unit tests required for the ported duty-time logic (item 5) — highest-risk piece since it's a different runtime with no existing test coverage to lean on.

Live push delivery cannot be verified in a dev session — requires real deploy + an actual upcoming break window on Phil's phone. "Built and reviewed" and "confirmed working on a real shift" are two separate milestones.

## Relevant existing patterns to reuse

- Migration style/naming: `supabase/migrations/0012_custom_rest_days.sql`
- Settings notification UX reference: `src/screens/SettingsPanel.jsx`
- Reconnect/retry pattern (reference only, not required for scheduler side which is server-driven): `src/App.jsx:101-120` (`syncAll`/`handleReconnect`/`visibilitychange`)
- IHP UptimeRobot pattern for health-checking a background job

## Out of scope

- `db_5wk_tracker_profile_fetch_no_retry` — unrelated bug, separate backlog item.
- Set-roster / part-time repeat-schedule feature — deprioritized separately, not part of this build.
