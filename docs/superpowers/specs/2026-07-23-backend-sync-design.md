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

All tables use RLS policies scoping every row to `user_id = auth.uid()`.

**`profiles`**
- `id` (uuid, = the Supabase auth user id)
- `driver_number` (text)
- `garage` (text)
- `created_at` (timestamptz)

**`duty_logs`**
- `id` (uuid) — generated client-side (not a DB serial), so an entry created
  offline already has a stable, globally-unique id before it ever reaches the
  server. This is what lets the sync queue dedupe safely across devices.
- `user_id` (uuid, references auth.users)
- `date`, `duty_code`, `report_time`, `finish_time`, `break_start`, `break_end`, `notes`
- `updated_at` (timestamptz) — used for conflict resolution
- `deleted_at` (timestamptz, nullable) — soft delete, so deletions propagate
  through sync instead of just disappearing on one device

**`settings`**
- `user_id` (uuid, primary key, references auth.users)
- `settings` (jsonb) — a single blob rather than one column per toggle. This
  app's history shows frequent new settings/toggles being added (break-end
  reminder, long-week reminder, etc.); jsonb avoids a schema migration each
  time a new one ships.

## Auth & Signup

Standard Supabase email/password auth. Signup additionally collects
`driver_number` and `garage`, written to the `profiles` table via a Postgres
trigger on `auth.users` insert (more robust than a follow-up client-side
insert — it can't be skipped by a partial/failed signup flow).

Email verification is required: signup sends a confirmation email, and login
is blocked until the address is confirmed. Sessions use Supabase's JWT with
automatic refresh.

## Sync Strategy

Each device maintains a local outbox queue of pending writes (create/update/
delete on `duty_logs`, and updates to `settings`). The queue flushes to
Supabase whenever connectivity is restored or the app is foregrounded, then
pulls down any remote rows with a newer `updated_at` than what's stored
locally.

Conflict resolution is last-write-wins by `updated_at`. This is sufficient
because rows are only ever written by their owning driver — there's no
multi-user collision to resolve, only the same driver's multiple devices.

**First-login migration:** existing local-only data predating this backend
(already on a driver's device) is pushed up as an initial batch on first
successful login, using the same client-generated ids as ordinary sync
writes, so it can't be duplicated by a later sync pass.

## Error Handling

- A write that fails to sync stays in the outbox and retries on the next
  connectivity event — it is never silently dropped.
- Auth errors (expired session, invalid login) surface as an in-app message;
  they do not crash the app.
- Signup/login network failures show a clear retry prompt. Nothing is
  written to the backend until a request is confirmed, so a failed attempt
  cannot cause partial/lost data.

## Testing

- Unit tests for the sync-queue logic specifically: dedupe of client-generated
  ids, last-write-wins conflict resolution, and retry-on-failure — this is the
  riskiest new logic in the app.
- Manual test pass covering: signup + email verification, login on a second
  device, logging a shift fully offline then reconnecting, and first-login
  migration of pre-existing local data.
