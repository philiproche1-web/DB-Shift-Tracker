# Web Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two broken foreground-only "reminder" features (shift-not-logged nudge, break-end reminder) with real Web Push notifications that fire even when the app is closed.

**Architecture:** Browser subscribes to push via `sw.js` + VAPID public key, subscription stored in a new `push_subscriptions` Supabase table. A Supabase Edge Function, invoked by pg_cron every 1-5 min, reads every driver's subscriptions + shift/settings data, computes who's due a reminder right now (porting the relevant pure logic from `src/lib/roster.js` into a runtime-agnostic module shared by both the app and the Edge Function), sends via `web-push`, and dedupes via a `push_notification_log` table. `sw.js` gets a `push` handler that shows the notification regardless of app state.

**Tech Stack:** Supabase (Postgres + Edge Functions + pg_cron), Deno (Edge Function runtime), `web-push` npm package (via Deno npm specifier), existing React/Vite frontend, vitest.

## Global Constraints

- Follow existing migration style: numbered `NNNN_description.sql` in `supabase/migrations/`, RLS enabled on every new table, `force_user_id_to_auth_uid`-style trigger pattern for any table a driver writes to directly (see `0004_audit_trail_and_server_enforced_ownership.sql`).
- No new vendor accounts (no Firebase, no OneSignal) — decided during brainstorming, see `docs/superpowers/specs/2026-08-13-web-push-notifications-design.md`.
- Shared duty-time logic must be pure JS with no Deno-specific or browser-specific APIs, so the same file can be imported by both the Vite app and the Deno Edge Function, and unit-tested with the existing vitest setup (no new test runner).
- "Today" is computed the same way the client already does it — `new Date().toISOString().slice(0,10)` (UTC-based) — for behavioral parity with the existing (imperfect near-midnight) client logic. Not a bug to fix here; out of scope.
- The shift-not-logged nudge fires once per day at **19:00 UTC** if nothing's logged yet for today by then (new server-side decision — the old client version just checked on every render, which doesn't translate to a single scheduled push; 19:00 gives a driver most of the day before nagging them). This time is a single constant, easy to change later if Phil wants a different hour.

---

### Task 1: Migration — `push_subscriptions` table

**Files:**
- Create: `supabase/migrations/0013_push_subscriptions.sql`

**Interfaces:**
- Produces: table `public.push_subscriptions(id bigint identity pk, user_id uuid, endpoint text unique, keys_p256dh text, keys_auth text, created_at timestamptz)`. Later tasks read/write this by `user_id` and delete by `endpoint`.

- [ ] **Step 1: Write the migration**

```sql
-- One row per subscribed browser/device per driver. A driver can have
-- multiple rows (phone + tablet, etc) — the Edge Function fans out to all
-- of a driver's rows when sending. `endpoint` is unique because the same
-- push endpoint re-subscribing (e.g. after a permission re-prompt) should
-- update the existing row, not create a duplicate that'd double-fire.
-- See docs/superpowers/specs/2026-08-13-web-push-notifications-design.md.
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  keys_p256dh text not null,
  keys_auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Drivers manage their own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Same defense-in-depth as app_data/leave_settings/settings: force user_id
-- to the caller's real identity regardless of what the client sends.
create trigger push_subscriptions_force_user_id
  before insert or update on public.push_subscriptions
  for each row execute procedure public.force_user_id_to_auth_uid();

-- The Edge Function runs as service_role (bypasses RLS) to read every
-- driver's subscriptions and delete dead ones on send failure — no
-- separate policy needed for that.
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0013_push_subscriptions.sql
git commit -m "feat: add push_subscriptions table for web push"
```

---

### Task 2: Migration — `push_notification_log` and `push_scheduler_runs` tables

**Files:**
- Create: `supabase/migrations/0014_push_notification_log_and_health.sql`

**Interfaces:**
- Produces: table `public.push_notification_log(id bigint identity pk, user_id uuid, shift_date date, reminder_type text, sent_at timestamptz)` with unique constraint on `(user_id, shift_date, reminder_type)`. Edge Function (Task 8) inserts here before/after sending, checks before re-sending.
- Produces: table `public.push_scheduler_runs(id bigint identity pk, ran_at timestamptz)`. Edge Function (Task 9) inserts one row per invocation regardless of outcome; health-check endpoint reads the latest row.

- [ ] **Step 1: Write the migration**

```sql
-- Server-side dedup for push reminders — replaces the client's per-device
-- localStorage notifyOnce keys, which can't dedupe across a driver's
-- multiple devices. One row per (driver, date, reminder type) sent;
-- the Edge Function checks for an existing row before sending and inserts
-- one right after a successful send. Only the Edge Function (service_role)
-- writes here — no driver-facing insert/update policy needed, drivers can
-- read their own history same as audit_log.
create table public.push_notification_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  shift_date date not null,
  reminder_type text not null check (reminder_type in ('shift_not_logged', 'break_end')),
  sent_at timestamptz not null default now(),
  unique (user_id, shift_date, reminder_type)
);

alter table public.push_notification_log enable row level security;

create policy "Drivers can view their own push notification history"
  on public.push_notification_log for select
  to authenticated
  using (auth.uid() = user_id);

-- One row per Edge Function invocation, whether or not any reminder was
-- due — this is a heartbeat, not an activity log. UptimeRobot (human step,
-- see runbook) polls a status endpoint that reads the latest row here and
-- alerts Phil if it's gone stale, so a broken cron job doesn't fail
-- silently the way the IHP Etsy-poll outage did.
create table public.push_scheduler_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now()
);

alter table public.push_scheduler_runs enable row level security;
-- No select/insert policy for authenticated users — this table is
-- operational, not driver-facing. Only service_role (Edge Function) and
-- the status endpoint (also service_role, server-side) touch it.
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0014_push_notification_log_and_health.sql
git commit -m "feat: add push_notification_log and push_scheduler_runs tables"
```

---

### Task 3: Shared duty-time logic — `src/lib/pushDuty.js`

This is the pure-logic port referenced in the spec as the hardest piece. Written once, imported by both the frontend (not required there today, but keeps one source of truth) and the Edge Function (Task 8). No Deno APIs, no browser APIs — just dates and arrays, so vitest covers it exactly like every other `src/lib` module.

**Files:**
- Create: `src/lib/pushDuty.js`
- Test: `src/lib/pushDuty.test.js`

**Interfaces:**
- Produces:
  - `today()` → `string` (YYYY-MM-DD, UTC-based, matches `dutyMath.js`'s `today()`)
  - `addDays(dateStr, n)` → `string`
  - `inPeriod(date, period)` → `boolean`
  - `periodForDate(periods, date, activePeriodId)` → `period | null`
  - `fixedRestDates(restConfig, periodStartDate)` → `string[]` where `restConfig = {enabled, weekdays: Set<number>, since: string|null}`
  - `dayInfo(period, date, restConfig)` → `{status: "unlogged"|"shift"|"dayoff", ...}`
  - `shiftBreakEnd(shift, duties)` → `Date | null` where `duties` is the array from `roster-data.json`'s `duties` field
- Consumes: nothing — self-contained.

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/pushDuty.test.js
import { describe, it, expect } from "vitest";
import { today, addDays, inPeriod, periodForDate, fixedRestDates, dayInfo, shiftBreakEnd } from "./pushDuty.js";

describe("today", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("addDays / inPeriod", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-08-30", 3)).toBe("2026-09-02");
  });
  it("inPeriod covers exactly a 35-day span", () => {
    const p = { startDate: "2026-07-19" };
    expect(inPeriod("2026-07-19", p)).toBe(true);
    expect(inPeriod("2026-08-22", p)).toBe(true);
    expect(inPeriod("2026-08-23", p)).toBe(false);
  });
});

describe("periodForDate", () => {
  it("picks the active period first when ranges overlap (matches roster.js behavior)", () => {
    const archived = { id: "old", startDate: "2026-06-20" };
    const active = { id: "p1", startDate: "2026-07-19" };
    expect(periodForDate([archived, active], "2026-07-20", "p1").id).toBe("p1");
  });
});

describe("fixedRestDates", () => {
  const NO_CUSTOM = { enabled: false, weekdays: new Set(), since: null };
  it("returns the standard 5-week pattern when custom rest is off", () => {
    const dates = fixedRestDates(NO_CUSTOM, "2026-07-19");
    // Week 1 pattern is [0,1] (Sunday, Monday) per FIXED_REST_PATTERN
    expect(dates).toContain(addDays("2026-07-19", 0)); // Sunday of week 1
    expect(dates).toContain(addDays("2026-07-19", 1)); // Monday of week 1
  });
  it("switches to custom weekdays only on/after `since`", () => {
    const custom = { enabled: true, weekdays: new Set([3]), since: "2026-07-26" }; // Wednesday
    const dates = fixedRestDates(custom, "2026-07-19");
    // Before `since`, standard pattern still applies for week 1
    expect(dates).toContain(addDays("2026-07-19", 0));
    // On/after `since`, every Wednesday shows up
    expect(dates).toContain("2026-07-29"); // a Wednesday on/after since
  });
});

describe("dayInfo", () => {
  const restConfig = { enabled: false, weekdays: new Set(), since: null };
  it("returns unlogged when nothing's logged and it's not an auto rest day", () => {
    const period = { id: "p1", startDate: "2026-07-19", shifts: [], daysOff: [] };
    // 2026-07-20 (Monday) is not in the week-1 [Sun,Mon] rest pattern... wait it is (Mon).
    // Use a Tuesday instead, which week 1's pattern doesn't cover.
    expect(dayInfo(period, "2026-07-21", restConfig).status).toBe("unlogged");
  });
  it("returns shift when a shift is logged for the date", () => {
    const period = { id: "p1", startDate: "2026-07-19", shifts: [{ id: "s1", date: "2026-07-21", zone: "Zone 1", dayType: "weekday", roster: "SZ1/01" }], daysOff: [] };
    expect(dayInfo(period, "2026-07-21", restConfig).status).toBe("shift");
  });
  it("returns dayoff on an auto-generated fixed rest day, even with nothing explicitly logged", () => {
    const period = { id: "p1", startDate: "2026-07-19", shifts: [], daysOff: [] };
    // Sunday of week 1 (day 0) is in the standard FIXED_REST_PATTERN.
    expect(dayInfo(period, "2026-07-19", restConfig).status).toBe("dayoff");
  });
});

describe("shiftBreakEnd", () => {
  const duties = [{ z: "Zone 1", t: "weekday", r: "SZ1/01", be: "07:15" }];
  it("computes the break-end Date from the matching duty", () => {
    const shift = { date: "2026-07-21", zone: "Zone 1", dayType: "weekday", roster: "SZ1/01" };
    const be = shiftBreakEnd(shift, duties);
    expect(be.getHours()).toBe(7);
    expect(be.getMinutes()).toBe(15);
  });
  it("returns null when the shift is a spare or has no break", () => {
    expect(shiftBreakEnd({ date: "2026-07-21", isSpare: true }, duties)).toBeNull();
    expect(shiftBreakEnd({ date: "2026-07-21", zone: "Zone 1", dayType: "weekday", roster: "NOPE" }, duties)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/pushDuty.test.js`
Expected: FAIL — `Failed to resolve import "./pushDuty.js"` (file doesn't exist yet)

- [ ] **Step 3: Write the implementation**

```js
// src/lib/pushDuty.js
//
// Runtime-agnostic port of the duty-time logic needed to decide whether a
// driver is due a push reminder right now. Deliberately independent of
// src/lib/roster.js (which holds this logic behind a mutable module-level
// CUSTOM_REST_CONFIG global set via setCustomRestConfig() — fine for a
// single-driver browser tab, wrong for a server processing many drivers'
// data in one pass). Every function here takes its config as a plain
// argument instead. No Deno or browser APIs, so this file is imported
// unmodified by both the Vite app and the send-reminders Edge Function
// (via a relative import — Deno resolves plain ESM .js files natively).
// See docs/superpowers/specs/2026-08-13-web-push-notifications-design.md.

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function inPeriod(date, period) {
  return date >= period.startDate && date <= addDays(period.startDate, 34);
}

export function periodForDate(periods, date, activePeriodId) {
  const active = activePeriodId && periods.find((p) => p.id === activePeriodId);
  if (active && inPeriod(date, active)) return active;
  return periods.find((p) => inPeriod(date, p)) || null;
}

// Mirrors roster.js's FIXED_REST_PATTERN exactly — Week N: [weekday, weekday].
const FIXED_REST_PATTERN = [
  [0, 1], // Week 1: Sunday, Monday
  [4, 0], // Week 2: Thursday, Sunday
  [2, 6], // Week 3: Tuesday, Saturday
  [5, 0], // Week 4: Friday, Sunday
  [3, 6], // Week 5: Wednesday, Saturday
];

export function fixedRestDates(restConfig, periodStartDate) {
  const standard = [];
  FIXED_REST_PATTERN.forEach((weekdays, wIdx) => {
    const weekStart = addDays(periodStartDate, wIdx * 7);
    weekdays.forEach((wd) => standard.push(addDays(weekStart, wd)));
  });
  if (!restConfig.enabled) return standard;

  const since = restConfig.since;
  const kept = since ? standard.filter((d) => d < since) : [];
  const custom = [];
  for (let i = 0; i < 35; i++) {
    const d = addDays(periodStartDate, i);
    if (since && d < since) continue;
    const weekday = new Date(d + "T12:00:00").getDay();
    if (restConfig.weekdays.has(weekday)) custom.push(d);
  }
  return [...kept, ...custom];
}

function withFixedRestDays(startDate, daysOff, shifts, removedFixed, restConfig) {
  const removed = new Set(removedFixed || []);
  const taken = new Set([
    ...(daysOff || []).map((d) => d.date),
    ...(shifts || []).map((s) => s.date),
  ]);
  const virtual = fixedRestDates(restConfig, startDate)
    .filter((d) => !taken.has(d) && !removed.has(d))
    .map((d) => ({ id: `fixed-${d}`, date: d, type: "Rest Day", fixed: true }));
  return [...(daysOff || []), ...virtual];
}

export function dayInfo(period, date, restConfig) {
  if (!period || !inPeriod(date, period)) return { status: "unlogged", date };
  const shift = (period.shifts || []).find((s) => s.date === date);
  if (shift) return { status: "shift", date, shift };
  const mergedDaysOff = withFixedRestDays(
    period.startDate,
    period.daysOff || [],
    period.shifts || [],
    period.removedFixedRestDates,
    restConfig
  );
  const dayOff = mergedDaysOff.find((d) => d.date === date);
  if (dayOff) return { status: "dayoff", date, dayOff };
  return { status: "unlogged", date };
}

export function shiftBreakEnd(shift, duties) {
  if (!shift || shift.isSpare || shift.fixedType) return null;
  const duty = duties.find((d) => d.z === shift.zone && d.t === shift.dayType && d.r === shift.roster);
  if (!duty || !duty.be) return null;
  const [h, m] = duty.be.split(":").map(Number);
  const dt = new Date(shift.date + "T00:00:00");
  dt.setMinutes(h * 60 + m);
  return dt;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/pushDuty.test.js`
Expected: PASS, all cases green

- [ ] **Step 5: Commit**

```bash
git add src/lib/pushDuty.js src/lib/pushDuty.test.js
git commit -m "feat: add runtime-agnostic duty-time logic for push reminders"
```

---

### Task 4: `sw.js` — push and notificationclick handlers

**Files:**
- Modify: `public/sw.js`

**Interfaces:**
- Consumes: push events whose `data` payload is JSON `{title: string, body: string, url?: string}`, sent by the Edge Function (Task 8).

- [ ] **Step 1: Add the handlers**

Append to the end of `public/sw.js`:

```js
// Web push — fires even when the app is fully closed, unlike the old
// setInterval-based in-app reminders. Payload is JSON set by the
// send-reminders Edge Function: {title, body, url}. See
// docs/superpowers/specs/2026-08-13-web-push-notifications-design.md.
self.addEventListener("push", (event) => {
  let payload = { title: "Shift Tracker", body: "" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add public/sw.js
git commit -m "feat: add push and notificationclick handlers to service worker"
```

*(No automated test — service worker push events aren't reachable from vitest/jsdom. Verified manually in Task 10's runbook once a real subscription + Edge Function exist.)*

---

### Task 5: Client subscribe helper — `src/lib/push.js`

**Files:**
- Create: `src/lib/push.js`
- Test: `src/lib/push.test.js`

**Interfaces:**
- Consumes: `supabase` from `./supabaseClient.js`; `import.meta.env.VITE_VAPID_PUBLIC_KEY` (set in Task 10's runbook).
- Produces: `subscribeToPush(userId)` → `Promise<{ok: boolean, error?: string}>`; `unsubscribeFromPush(userId)` → `Promise<{ok: boolean}>`; `isPushSubscribed()` → `Promise<boolean>`. Consumed by `SettingsPanel.jsx` (Task 6).

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/push.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

const upsertMock = vi.fn(() => ({ error: null }));
const deleteMock = { eq: vi.fn(() => ({ error: null })) };
vi.mock("./supabaseClient.js", () => ({
  supabase: {
    from: () => ({
      upsert: upsertMock,
      delete: () => deleteMock,
    }),
  },
}));

describe("subscribeToPush", () => {
  beforeEach(() => {
    upsertMock.mockClear();
    vi.stubGlobal("navigator", {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            subscribe: vi.fn(() =>
              Promise.resolve({
                endpoint: "https://push.example/abc",
                toJSON: () => ({ keys: { p256dh: "p256dh-key", auth: "auth-key" } }),
              })
            ),
          },
        }),
      },
    });
  });

  it("subscribes and upserts the subscription row keyed by endpoint", async () => {
    const { subscribeToPush } = await import("./push.js");
    const result = await subscribeToPush("user-1");
    expect(result.ok).toBe(true);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        endpoint: "https://push.example/abc",
        keys_p256dh: "p256dh-key",
        keys_auth: "auth-key",
      }),
      { onConflict: "endpoint" }
    );
  });

  it("returns ok:false when service workers aren't supported", async () => {
    vi.stubGlobal("navigator", {});
    const { subscribeToPush } = await import("./push.js");
    const result = await subscribeToPush("user-1");
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/push.test.js`
Expected: FAIL — `Failed to resolve import "./push.js"`

- [ ] **Step 3: Write the implementation**

```js
// src/lib/push.js
//
// Client-side subscribe/unsubscribe flow for real Web Push. Doesn't go
// through the generic whole-document sync in sync.js (markDirty/syncTable)
// because push_subscriptions is a multi-row-per-driver table (one row per
// device), not the single-JSON-blob-per-driver shape that pattern assumes
// — writes go straight to Supabase instead.
import { supabase } from "./supabaseClient.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function subscribeToPush(userId) {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) {
    return { ok: false, error: "Push isn't supported in this browser." };
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    const { keys } = sub.toJSON();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        keys_p256dh: keys.p256dh,
        keys_auth: keys.auth,
      },
      { onConflict: "endpoint" }
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || "Push subscription failed." };
  }
}

export async function unsubscribeFromPush(userId) {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return { ok: false };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function isPushSubscribed() {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/push.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/push.js src/lib/push.test.js
git commit -m "feat: add client-side push subscribe/unsubscribe helper"
```

---

### Task 6: Wire subscribe flow into Settings notification toggle

**Files:**
- Modify: `src/screens/SettingsPanel.jsx` (notification toggle section, around lines 56-69 and 306-324 per current file)

**Interfaces:**
- Consumes: `subscribeToPush`, `unsubscribeFromPush` from `../lib/push.js`; needs the current driver's `userId` — check how `SettingsPanel.jsx` currently receives driver identity (it's a prop drilled from `App.jsx`'s session; match whatever prop name the file already uses for the signed-in user's id, do not invent a new prop path — read the top of `SettingsPanel.jsx`'s prop list before writing this task's code).

- [ ] **Step 1: Read current toggle implementation**

Read `src/screens/SettingsPanel.jsx` lines 1-90 and 290-330 to confirm the exact prop name used for the current user's id (likely `userId` or `session.user.id` passed down) before editing — this file wasn't fully quoted in the plan because the exact prop name must be confirmed against the live file, not guessed.

- [ ] **Step 2: Extend `toggleNotifications` to also subscribe/unsubscribe push**

In the existing `toggleNotifications` function, after the existing `Notification.requestPermission()` success branch (where it currently does `saveSettings({...settings, notificationsEnabled:true})`), add a call to `subscribeToPush(userId)` and surface `result.error` via the existing `setToast(...)` pattern already used two lines below for the "blocked" case. On the turn-off branch (where it currently just sets `notificationsEnabled:false`), add `unsubscribeFromPush(userId)`.

```js
import { subscribeToPush, unsubscribeFromPush } from "../lib/push.js";

// ...inside toggleNotifications, turn-off branch:
if (settings.notificationsEnabled) {
  const next = {...settings, notificationsEnabled:false};
  unsubscribeFromPush(userId);
  saveSettings(next);
  setSettings(next);
  return;
}
// ...turn-on branch, after Notification.requestPermission() resolves "granted":
subscribeToPush(userId).then((result) => {
  if (!result.ok) setToast(result.error || "Couldn't enable push notifications.");
});
```

- [ ] **Step 3: Manual verification (no automated test — depends on real service worker + push permission, not available in jsdom)**

Run `npm run dev`, open Settings, toggle notifications on, confirm no console error and (once Task 4/5 are both in place) a row appears in `push_subscriptions` in the Supabase table editor.

- [ ] **Step 4: Commit**

```bash
git add src/screens/SettingsPanel.jsx
git commit -m "feat: subscribe/unsubscribe push when toggling notifications in Settings"
```

---

### Task 7: Remove the dead foreground-only reminder code

The `push` handler (Task 4) supersedes both `useEffect`s in `HomeScreen.jsx` — leaving them in place would double-notify (once from the old `setInterval`/foreground `Notification` call while the app happens to be open, once from the new push). Also remove the now-unused `notifyOnce` from `persistence.js` once nothing calls it.

**Files:**
- Modify: `src/screens/HomeScreen.jsx:238-279` (both `useEffect` blocks — the shift-not-logged/limit checks and the break-end 60s-tick reminder)
- Modify: `src/lib/persistence.js:23-37` (`notifyOnce` and its comment block)

**Interfaces:**
- None — pure removal. Confirm nothing else imports `notifyOnce` before deleting it (`grep -rn "notifyOnce" src/`).

- [ ] **Step 1: Remove the two `useEffect` blocks in `HomeScreen.jsx`**

Delete the block at lines 238-258 (shift-not-logged + hours-limit notifications) and 260-279 (break-end 60s-tick reminder) in full, along with the now-unused `shiftBreakEnd` import from `./roster.js` in this file if nothing else in `HomeScreen.jsx` uses it — check with `grep -n "shiftBreakEnd" src/screens/HomeScreen.jsx` first.

- [ ] **Step 2: Remove `notifyOnce` from `persistence.js`**

Confirm no other callers first:

Run: `grep -rn "notifyOnce" src/`
Expected: only `persistence.js`'s own definition and the two now-deleted `HomeScreen.jsx` call sites.

Delete lines 23-37 (the `SHIFT REMINDERS` comment block and `notifyOnce` function) from `src/lib/persistence.js`.

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — no test references the removed code (confirm with `grep -rn "notifyOnce\|shiftBreakEnd" src/**/*.test.js` returning nothing relevant before this step, so a red result here means a real regression, not a stale test).

- [ ] **Step 4: Commit**

```bash
git add src/screens/HomeScreen.jsx src/lib/persistence.js
git commit -m "refactor: remove dead foreground-only reminder code, superseded by web push"
```

---

### Task 8: Edge Function — `send-reminders`

The scheduler. Reads every driver's data, decides who's due a reminder, sends it, dedupes, cleans up dead subscriptions, stamps a heartbeat.

**Files:**
- Create: `supabase/functions/send-reminders/index.ts`
- Create: `supabase/functions/send-reminders/deno.json` (import map so `duty.js` resolves cleanly)

**Interfaces:**
- Consumes: `src/lib/pushDuty.js` (Task 3) via relative import; env vars `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (set as Supabase secrets — see Task 10's runbook).
- Produces: an HTTP endpoint. `POST /functions/v1/send-reminders` (invoked by pg_cron, Task 9) runs the scheduler pass. `GET /functions/v1/send-reminders?status=1` returns `{lastRunAgoSeconds: number}` for the health check (Task 10's UptimeRobot monitor).

- [ ] **Step 1: Write the Edge Function**

```ts
// supabase/functions/send-reminders/index.ts
//
// Runs on a pg_cron schedule (see supabase/migrations/0015_push_scheduler_cron.sql).
// For every driver with at least one push subscription: figures out if
// they're due the shift-not-logged nudge (19:00 UTC, nothing logged for
// today) or the break-end reminder (N minutes before today's shift's
// break ends, N = their own breakReminderMinutes setting), sends via
// web-push, dedupes against push_notification_log, and removes dead
// subscriptions (410/404 from the push service) as it goes. Always stamps
// push_scheduler_runs so a stale heartbeat is externally detectable even
// if zero reminders were due this pass.
// See docs/superpowers/specs/2026-08-13-web-push-notifications-design.md.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { today, periodForDate, dayInfo, shiftBreakEnd } from "../../../src/lib/pushDuty.js";

const ROSTER_REMOTE_URL = "https://raw.githubusercontent.com/philiproche1-web/DB-Shift-Tracker/main/public/roster-data.json";
const SHIFT_NOT_LOGGED_HOUR_UTC = 19;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

async function fetchDuties() {
  const res = await fetch(ROSTER_REMOTE_URL);
  const json = await res.json();
  return json.duties;
}

async function sendToDriver(userId, title, body) {
  const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
  for (const sub of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
        JSON.stringify({ title, body })
      );
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
}

async function alreadySent(userId, shiftDate, reminderType) {
  const { data } = await supabase
    .from("push_notification_log")
    .select("id")
    .eq("user_id", userId)
    .eq("shift_date", shiftDate)
    .eq("reminder_type", reminderType)
    .maybeSingle();
  return !!data;
}

async function markSent(userId, shiftDate, reminderType) {
  await supabase.from("push_notification_log").insert({ user_id: userId, shift_date: shiftDate, reminder_type: reminderType });
}

async function runScheduler() {
  const duties = await fetchDuties();
  const now = new Date();
  const todayDate = today();
  const hourUtc = now.getUTCHours();

  const { data: driverIds } = await supabase.from("push_subscriptions").select("user_id");
  const uniqueDrivers = [...new Set((driverIds || []).map((r) => r.user_id))];

  for (const userId of uniqueDrivers) {
    const [{ data: appDataRow }, { data: settingsRow }, { data: profileRow }] = await Promise.all([
      supabase.from("app_data").select("data").eq("user_id", userId).maybeSingle(),
      supabase.from("settings").select("data").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);
    if (!appDataRow?.data || !settingsRow?.data) continue;
    const settings = settingsRow.data;
    if (settings.notificationsEnabled === false) continue;

    const { periods = [], activePeriodId = null } = appDataRow.data;
    const period = periodForDate(periods, todayDate, activePeriodId);
    if (!period) continue;

    const restConfig = {
      enabled: !!profileRow?.custom_rest_days_enabled,
      weekdays: new Set(profileRow?.custom_rest_weekdays || []),
      since: profileRow?.custom_rest_days_since || null,
    };
    const info = dayInfo(period, todayDate, restConfig);

    // Shift-not-logged nudge — once, at SHIFT_NOT_LOGGED_HOUR_UTC, only if
    // still unlogged (not a shift, not a real or auto rest day).
    if (hourUtc >= SHIFT_NOT_LOGGED_HOUR_UTC && info.status === "unlogged") {
      if (!(await alreadySent(userId, todayDate, "shift_not_logged"))) {
        await sendToDriver(userId, "Log today's shift", "Nothing logged yet for today in Shift Tracker.");
        await markSent(userId, todayDate, "shift_not_logged");
      }
    }

    // Break-end reminder — fires in the lead-time window before today's
    // shift's break ends.
    if (settings.breakReminderEnabled !== false && info.status === "shift") {
      const breakEnd = shiftBreakEnd(info.shift, duties);
      if (breakEnd) {
        const leadMins = settings.breakReminderMinutes || 10;
        const fireAt = new Date(breakEnd.getTime() - leadMins * 60000);
        if (now >= fireAt && now < breakEnd) {
          if (!(await alreadySent(userId, todayDate, "break_end"))) {
            await sendToDriver(userId, "Break ending soon", `Your break ends in about ${leadMins} minutes.`);
            await markSent(userId, todayDate, "break_end");
          }
        }
      }
    }
  }

  await supabase.from("push_scheduler_runs").insert({});
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get("status") === "1") {
    const { data } = await supabase
      .from("push_scheduler_runs")
      .select("ran_at")
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastRunAgoSeconds = data ? (Date.now() - new Date(data.ran_at).getTime()) / 1000 : null;
    return new Response(JSON.stringify({ lastRunAgoSeconds }), { headers: { "Content-Type": "application/json" } });
  }
  await runScheduler();
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
```

```json
// supabase/functions/send-reminders/deno.json
{
  "imports": {}
}
```

- [ ] **Step 2: No automated test for this file** — Deno Edge Functions aren't reachable from vitest, and the logic-heavy parts already live in and are tested via `src/lib/pushDuty.js` (Task 3). Verified by manual invocation in Task 10's runbook after deployment (`curl -X POST` the function URL and check `push_scheduler_runs` gets a new row).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-reminders/
git commit -m "feat: add send-reminders Edge Function scheduler"
```

---

### Task 9: Migration — pg_cron schedule

**Files:**
- Create: `supabase/migrations/0015_push_scheduler_cron.sql`

**Interfaces:**
- Consumes: the deployed Edge Function's URL (`https://<project-ref>.supabase.co/functions/v1/send-reminders`) and a service-role bearer token, both supplied via Vault secrets referenced by name — filled in by Phil per Task 10's runbook, not hardcoded in the migration.

- [ ] **Step 1: Write the migration**

```sql
-- Invokes the send-reminders Edge Function every 2 minutes via pg_cron +
-- pg_net. project_url and service_role_key are read from Vault secrets
-- (set once via the Supabase dashboard, see Task 10's runbook in
-- docs/superpowers/specs/2026-08-13-web-push-notifications-design.md) —
-- never hardcoded here, so this file is safe to commit.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-reminders-every-2-min',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'push_scheduler_function_url') || '/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_scheduler_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0015_push_scheduler_cron.sql
git commit -m "feat: schedule send-reminders Edge Function via pg_cron"
```

---

### Task 10: Runbook — human-only steps (VAPID, secrets, deploy, UptimeRobot, live check)

Not a code task — a doc so every step only Phil can do is in one place, in order, explained plainly. Written last so it can reference the exact table/function/secret names the code above actually created.

**Files:**
- Create: `docs/superpowers/plans/2026-08-13-web-push-runbook.md`

- [ ] **Step 1: Write the runbook**

```markdown
# Web Push — Steps Only You Can Do

Do these in order, whenever suits — steps 1-2 can happen any time; steps 3+ need the code from this plan merged first.

## 1. Generate the VAPID keypair (5 min)

This is a pair of keys that proves push messages come from this app.

1. On your machine, run: `npx web-push generate-vapid-keys`
2. You'll see a Public Key and a Private Key printed. Keep this terminal open.
3. In the Supabase dashboard → your project → Edge Functions → Secrets, add three secrets:
   - `VAPID_PUBLIC_KEY` = the Public Key from step 2
   - `VAPID_PRIVATE_KEY` = the Private Key from step 2
   - `VAPID_SUBJECT` = `mailto:philip.roche1@gmail.com`
4. Also add the Public Key to the app's build config: in the project's `.env` (or wherever `VITE_SUPABASE_URL` currently lives), add a line `VITE_VAPID_PUBLIC_KEY=<the Public Key>`.

## 2. Deploy the Edge Function (10 min)

1. Install the Supabase CLI if you don't have it: `npm install -g supabase`
2. From the project folder, run: `supabase login` (opens a browser to sign in)
3. Run: `supabase link --project-ref <your-project-ref>` (find the project ref in the dashboard URL, `https://supabase.com/dashboard/project/<project-ref>`)
4. Run: `supabase functions deploy send-reminders`
5. Note the URL it prints (`https://<project-ref>.supabase.co/functions/v1/send-reminders`) — you need it for step 3.

## 3. Set the cron secrets and run the migration (5 min)

1. In the Supabase dashboard → SQL Editor, run:
   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1', 'push_scheduler_function_url');
   select vault.create_secret('<your service_role key, from dashboard Settings > API>', 'push_scheduler_service_role_key');
   ```
2. Then run migrations `0013`, `0014`, `0015` in order (paste each file's contents into the SQL Editor and run — same as every migration so far).

## 4. Set up the UptimeRobot health check (10 min)

1. New UptimeRobot monitor, type "HTTP(s)".
2. URL: `https://<project-ref>.supabase.co/functions/v1/send-reminders?status=1`
3. Add header `Authorization: Bearer <anon key, from dashboard Settings > API>`.
4. Check interval: 15 minutes. Alert if the response doesn't contain `"lastRunAgoSeconds"` with a value under 600 (10 min) — UptimeRobot's "Keyword" monitor type with an assertion on the JSON is the simplest way to do this; if that's fiddly in the UI, a plain "up/down" HTTP check that just confirms the endpoint responds 200 is an acceptable first cut, you can tighten it later.

## 5. Confirm on a real shift (whenever your next break is)

Turn on notifications in Settings, lock your phone, wait for your actual break-end reminder time. This is the only step that proves push delivery genuinely works — everything before it can be verified in code review, this can't.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-08-13-web-push-runbook.md
git commit -m "docs: add web push human-steps runbook"
```

---

## Self-Review Notes

- **Spec coverage:** all 7 spec items covered — Task 1 (subscriptions table, item 2), Task 3+8 (duty-time port, item 5), Task 4 (sw.js handler, item 4), Task 5-6 (subscribe flow, item 3), Task 9 (cron, item 6), Task 2+8 (health checker, item 7), Task 10 (VAPID, item 1). Task 7 (dead-code removal) wasn't in the original 7-piece list but is required to avoid double-notifying — added during planning.
- **New scope found during planning, not in the original spec:** the Edge Function needs deploying (Supabase CLI) and the cron job needs Vault secrets set up — neither is a `git push`-and-done step like the rest of this repo's features. Folded into Task 10's runbook alongside VAPID and UptimeRobot rather than treated as a separate surprise later.
- **Type consistency:** `pushDuty.js`'s exports (Task 3) are consumed with matching names/signatures in Task 8's Edge Function import. `push.js`'s `subscribeToPush`/`unsubscribeFromPush` (Task 5) match the calls added in Task 6.
