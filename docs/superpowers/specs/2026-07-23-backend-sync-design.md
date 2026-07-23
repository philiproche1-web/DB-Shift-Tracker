# Backend & Cross-Device Sync — Design

## Purpose

The DB 5-Week Tracker App is currently frontend-only (React/Vite PWA), with all
driver data (duty logs, settings) stored locally on-device. Drivers who switch
phones or reinstall the app lose their history, and nothing is shared across a
driver's own devices. This adds a backend so a driver's duty logs and settings
follow them across devices, tied to a personal account.

The static duty/roster schedule data (currently baked into the app from the
source xlsx) is explicitly out of scope — that stays local/static for now and
is not part of this sync layer.

## Architecture

The frontend talks directly to Supabase via its JS SDK — no custom server to
build or host. Supabase provides:

- Postgres database
- Built-in email/password authentication (with email verification)
- Row-level security (RLS), so each driver can only read/write their own rows

The app is local-first: on-device storage (localStorage/IndexedDB) remains
the source of truth for the UI at all times, so the app works fully offline.
A background sync process pushes local changes to Supabase and pulls remote
changes down whenever connectivity is available. The existing service worker
continues to handle offline app-shell caching; this adds a data sync queue on
top of it.

## Data Model

The existing app already stores each driver's data as whole JSON documents,
loaded/saved atomically (`loadData()`/`saveData(data)` in `src/App.jsx:197-206`
for `{periods, activePeriodId}`; `loadLeaveSettings()`/`saveLeaveSettings(s)`
at `src/App.jsx:2108-2111` for leave settings; `loadSettings()`/`saveSettings(s)`
at `src/App.jsx:2175-2180` for app settings). None of these have stable
per-entry ids (shifts are keyed only by `date` within a period). Rather than
retrofitting granular per-row ids across the whole file, the sync layer
mirrors this existing whole-document pattern: each table holds one JSON blob
per driver, not one row per duty/entry.

All tables use RLS policies scoping every row to `user_id = auth.uid()`.

**`profiles`**
- `id` (uuid, = the Supabase auth user id)
- `driver_number` (text)
- `garage` (text)
- `created_at` (timestamptz)

**`app_data`** — mirrors the `dbus_v3` local key
- `user_id` (uuid, primary key, references auth.users)
- `data` (jsonb) — the whole `{periods, activePeriodId}` document
- `updated_at` (timestamptz) — used for conflict resolution

**`leave_settings`** — mirrors the `dbus_leave` local key
- `user_id` (uuid, primary key, references auth.users)
- `data` (jsonb) — the whole `{annualTotal, ...}` document
- `updated_at` (timestamptz)

**`settings`** — mirrors the `dbus_settings` local key
- `user_id` (uuid, primary key, references auth.users)
- `data` (jsonb) — the whole settings document. A single blob rather than
  one column per toggle: this app's history shows frequent new
  settings/toggles being added (break-end reminder, long-week reminder,
  etc.), and jsonb avoids a schema migration each time a new one ships.

There is no soft-delete column — a whole-document overwrite already
represents any deletion within that document (e.g. a removed shift is simply
absent from the new `periods` array). Conflict resolution and sync apply per
table (per document), not per entry.

## Auth & Signup

Standard Supabase email/password auth. Signup additionally collects
`driver_number` and `garage`, written to the `profiles` table via a Postgres
trigger on `auth.users` insert (more robust than a follow-up client-side
insert — it can't be skipped by a partial/failed signup flow).

Email verification is required: signup sends a confirmation email, and login
is blocked until the address is confirmed. Sessions use Supabase's JWT with
automatic refresh.

## Sync Strategy

Each device maintains a local outbox queue of pending writes — one queue
entry per table (`app_data`, `leave_settings`, `settings`) whenever its local
copy changes. The queue flushes to Supabase whenever connectivity is
restored or the app is foregrounded: for each table, compare local
`updated_at` against the remote row's `updated_at` and push whichever is
newer, then overwrite the other side with the winner.

Conflict resolution is last-write-wins by `updated_at`, applied per whole
document (not per entry within it). This is sufficient because rows are
only ever written by their owning driver — there's no multi-user collision
to resolve, only the same driver's multiple devices.

**First-login migration:** on first successful login, whatever already
exists locally under `dbus_v3`, `dbus_leave`, and `dbus_settings` is pushed
up as the initial `app_data`/`leave_settings`/`settings` rows (insert if the
row doesn't exist yet), so pre-existing history isn't lost.

## Error Handling

- A write that fails to sync stays in the outbox and retries on the next
  connectivity event — it is never silently dropped.
- Auth errors (expired session, invalid login) surface as an in-app message;
  they do not crash the app.
- Signup/login network failures show a clear retry prompt. Nothing is
  written to the backend until a request is confirmed, so a failed attempt
  cannot cause partial/lost data.

## Testing

- Unit tests for the sync-queue logic specifically: per-table last-write-wins
  conflict resolution and retry-on-failure — this is the riskiest new logic
  in the app.
- Manual test pass covering: signup + email verification, login on a second
  device, logging a shift fully offline then reconnecting, and first-login
  migration of pre-existing local data.
