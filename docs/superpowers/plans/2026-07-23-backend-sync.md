# Backend & Cross-Device Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Supabase-backed account system (email/password + email verification, driver_number + garage) so a driver's duty logs, leave settings, and app settings sync across their devices, with full offline support and a one-time migration of each driver's existing local data on first login.

**Architecture:** The React/Vite PWA talks directly to Supabase via `@supabase/supabase-js` — no custom server. The app already stores each driver's data as three whole-document JSON blobs in localStorage (`dbus_v3`, `dbus_leave`, `dbus_settings`), loaded/saved atomically with no per-entry ids. The sync layer mirrors this: three Postgres tables (`app_data`, `leave_settings`, `settings`), each one JSON blob per driver, synced whole-document with last-write-wins conflict resolution by `updated_at`. Login is mandatory to use the app; on first successful login, existing local data is pushed up as the initial synced copy.

**Tech Stack:** React 19, Vite, `@supabase/supabase-js`, Vitest + jsdom for unit tests (new to this project — it currently has no test runner).

## Global Constraints

- Conflict resolution is last-write-wins by `updated_at`, applied per whole document, not per entry (per the amended spec's Data Model section).
- No soft-delete columns — a whole-document overwrite already represents deletions within it.
- The static duty/roster schedule (`ROSTER_CACHE_KEY` / `loadRosterData()` in `src/App.jsx`) is out of scope — it already has its own remote-fetch mechanism and is not part of this sync layer.
- A failed sync write must stay flagged for retry, never be silently dropped.
- Nothing in the existing local storage keys' shapes (`dbus_v3`, `dbus_leave`, `dbus_settings`) may change — many existing call sites depend on their current shape.

---

### Task 1: Supabase client + test tooling

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create: `.env.example`
- Create: `src/lib/supabaseClient.js`
- Test: `src/lib/supabaseClient.test.js`

**Interfaces:**
- Produces: `supabase` (named export from `src/lib/supabaseClient.js`) — a `@supabase/supabase-js` client instance, used by every later task.

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install @supabase/supabase-js
npm install -D vitest jsdom
```

- [ ] **Step 2: Add the test script and jsdom environment**

Edit `package.json`, in `"scripts"`, add:
```json
    "test": "vitest run",
```
(so the `"scripts"` block reads `dev`, `build`, `lint`, `preview`, `test`).

Edit `vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
})
```

- [ ] **Step 3: Add the env template**

Create `.env.example`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Note: `.gitignore` already ignores `*.local`, which covers Vite's `.env.local` convention — no gitignore change needed. Actual values go in a local `.env.local` file, never committed.

- [ ] **Step 4: Write the failing test**

Create `src/lib/supabaseClient.test.js`:
```js
import { describe, it, expect, vi, beforeAll } from "vitest";

describe("supabaseClient", () => {
  beforeAll(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("creates a client exposing the auth and query interfaces", async () => {
    const { supabase } = await import("./supabaseClient.js");
    expect(typeof supabase.auth.signUp).toBe("function");
    expect(typeof supabase.auth.signInWithPassword).toBe("function");
    expect(typeof supabase.from).toBe("function");
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- supabaseClient`
Expected: FAIL — `src/lib/supabaseClient.js` does not exist yet.

- [ ] **Step 6: Write the implementation**

Create `src/lib/supabaseClient.js`:
```js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- supabaseClient`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.js .env.example src/lib/supabaseClient.js src/lib/supabaseClient.test.js
git commit -m "Add Supabase client and Vitest test tooling"
```

---

### Task 2: Supabase schema (tables, RLS, signup trigger)

**Files:**
- Create: `supabase/schema.sql`

**Interfaces:**
- Produces: Postgres tables `profiles`, `app_data`, `leave_settings`, `settings` in the Supabase project — consumed by every later task's queries (`.from("app_data")` etc.).

This task has no automated test — there's no local Postgres/Supabase emulator in this project, so schema correctness is verified manually in the Supabase dashboard. RLS behavior (a driver can't read another driver's row) gets its real functional check in Task 9's end-to-end pass, once real accounts exist to test with.

- [ ] **Step 1: Write the schema file**

Create `supabase/schema.sql`:
```sql
-- Profiles: one row per driver, populated from signup metadata
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  driver_number text,
  garage text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Drivers can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Drivers can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a driver signs up, reading driver_number
-- and garage out of the signup call's user metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, driver_number, garage)
  values (
    new.id,
    new.raw_user_meta_data ->> 'driver_number',
    new.raw_user_meta_data ->> 'garage'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Whole-document sync tables: one JSON blob per driver per table, mirroring
-- the app's existing local storage keys (dbus_v3, dbus_leave, dbus_settings).
create table public.app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.leave_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;
alter table public.leave_settings enable row level security;
alter table public.settings enable row level security;

create policy "Drivers manage their own app_data"
  on public.app_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Drivers manage their own leave_settings"
  on public.leave_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Drivers manage their own settings"
  on public.settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the schema**

In the Supabase dashboard: SQL Editor → New query → paste the full contents of `supabase/schema.sql` → Run.

Verify: Table Editor shows `profiles`, `app_data`, `leave_settings`, `settings`, each with the RLS badge showing "Enabled".

- [ ] **Step 3: Configure auth redirect URLs**

In the Supabase dashboard: Authentication → URL Configuration. Set Site URL to the app's production URL, and add `http://localhost:5173` (the Vite dev server default) to Redirect URLs, so email verification links work both in production and local development.

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "Add Supabase schema: profiles, app_data, leave_settings, settings"
```

---

### Task 3: Conflict resolution logic

**Files:**
- Create: `src/lib/sync.js`
- Test: `src/lib/sync.test.js`

**Interfaces:**
- Produces: `pickWinner(localUpdatedAt, remoteUpdatedAt)` → `"local" | "remote"` — used by `syncTable` in Task 4.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/sync.test.js`:
```js
import { describe, it, expect } from "vitest";
import { pickWinner } from "./sync.js";

describe("pickWinner", () => {
  it("picks remote when there is no local timestamp", () => {
    expect(pickWinner(null, "2026-07-23T10:00:00Z")).toBe("remote");
  });

  it("picks local when there is no remote timestamp", () => {
    expect(pickWinner("2026-07-23T10:00:00Z", null)).toBe("local");
  });

  it("picks whichever timestamp is newer", () => {
    expect(pickWinner("2026-07-23T10:00:00Z", "2026-07-23T09:00:00Z")).toBe("local");
    expect(pickWinner("2026-07-23T09:00:00Z", "2026-07-23T10:00:00Z")).toBe("remote");
  });

  it("picks local on an exact tie", () => {
    expect(pickWinner("2026-07-23T10:00:00Z", "2026-07-23T10:00:00Z")).toBe("local");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- sync.test`
Expected: FAIL — `src/lib/sync.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/lib/sync.js`:
```js
// Whole-document last-write-wins conflict resolution: given the local and
// remote updated_at timestamps for one synced table, decide which document
// should win. Ties favor local (a device mid-sync with a genuinely
// simultaneous remote write is rare, and favoring local avoids discarding
// a change the current device just made).
export function pickWinner(localUpdatedAt, remoteUpdatedAt) {
  if (!remoteUpdatedAt) return "local";
  if (!localUpdatedAt) return "remote";
  return new Date(localUpdatedAt).getTime() >= new Date(remoteUpdatedAt).getTime()
    ? "local"
    : "remote";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- sync.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/sync.js src/lib/sync.test.js
git commit -m "Add last-write-wins conflict resolution for whole-document sync"
```

---

### Task 4: Sync queue (dirty tracking + push/pull)

**Files:**
- Modify: `src/lib/sync.js`
- Modify: `src/lib/sync.test.js`

**Interfaces:**
- Consumes: `pickWinner(localUpdatedAt, remoteUpdatedAt)` from Task 3.
- Produces: `markDirty(table)`, `syncTable(supabase, table, { load, save }, userId)`, `syncAll(supabase, userId, tableConfigs)` — `tableConfigs` is `[{ table, load, save }]`; `load()` returns (or resolves to) the current local document, `save(remoteData)` writes a pulled document back to local storage. Both may be sync or async. Used by Task 5 (migration) and Task 8 (App.jsx wiring).

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/sync.test.js`:
```js
import { markDirty, syncTable, syncAll } from "./sync.js";

function makeFakeSupabase({ remoteRow = null, fetchError = null, pushError = null } = {}) {
  const calls = { upserts: [] };
  const supabase = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
          if (fetchError) return { data: null, error: fetchError };
          return { data: remoteRow, error: null };
        },
        async upsert(row) {
          calls.upserts.push(row);
          if (pushError) return { error: pushError };
          return { error: null };
        },
      };
    },
  };
  return { supabase, calls };
}

describe("markDirty + syncTable", () => {
  beforeEach(() => localStorage.clear());

  it("pushes local data when local is dirty and has no remote counterpart yet", async () => {
    markDirty("settings");
    const { supabase, calls } = makeFakeSupabase({ remoteRow: null });
    const save = vi.fn();
    const result = await syncTable(supabase, "settings", { load: () => ({ appearance: "dark" }), save }, "user-1");

    expect(result).toEqual({ ok: true, direction: "pushed" });
    expect(calls.upserts).toHaveLength(1);
    expect(calls.upserts[0].data).toEqual({ appearance: "dark" });
    expect(save).not.toHaveBeenCalled();
  });

  it("pulls remote data when remote is newer than local", async () => {
    const remoteRow = { data: { appearance: "light" }, updated_at: "2026-07-23T12:00:00Z" };
    const { supabase } = makeFakeSupabase({ remoteRow });
    const save = vi.fn();
    // No markDirty call — local has no pending change, so remote (with a
    // timestamp) always outranks an untouched local copy.
    const result = await syncTable(supabase, "settings", { load: () => ({ appearance: "dark" }), save }, "user-1");

    expect(result).toEqual({ ok: true, direction: "pulled" });
    expect(save).toHaveBeenCalledWith({ appearance: "light" });
  });

  it("does nothing when there is no local change and no remote row", async () => {
    const { supabase } = makeFakeSupabase({ remoteRow: null });
    const save = vi.fn();
    const result = await syncTable(supabase, "settings", { load: () => ({}), save }, "user-1");

    expect(result).toEqual({ ok: true, direction: "none" });
    expect(save).not.toHaveBeenCalled();
  });

  it("leaves the dirty flag set when the push fails, so it retries later", async () => {
    markDirty("settings");
    const { supabase } = makeFakeSupabase({ remoteRow: null, pushError: new Error("network down") });
    const result = await syncTable(supabase, "settings", { load: () => ({ appearance: "dark" }), save: vi.fn() }, "user-1");

    expect(result.ok).toBe(false);
    const meta = JSON.parse(localStorage.getItem("dbus_sync_meta"));
    expect(meta.settings.dirty).toBe(true);
  });
});

describe("syncAll", () => {
  beforeEach(() => localStorage.clear());

  it("runs syncTable for every configured table", async () => {
    const { supabase } = makeFakeSupabase({ remoteRow: null });
    const results = await syncAll(supabase, "user-1", [
      { table: "settings", load: () => ({}), save: vi.fn() },
      { table: "leave_settings", load: () => ({}), save: vi.fn() },
    ]);

    expect(Object.keys(results)).toEqual(["settings", "leave_settings"]);
  });
});
```

Add the needed imports at the top of `src/lib/sync.test.js` (alongside the existing `describe, it, expect` import):
```js
import { describe, it, expect, beforeEach, vi } from "vitest";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- sync.test`
Expected: FAIL — `markDirty`, `syncTable`, `syncAll` are not exported yet.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/sync.js`:
```js
const SYNC_META_KEY = "dbus_sync_meta";

function loadSyncMeta() {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSyncMeta(meta) {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  } catch {}
}

// Called whenever the app writes app_data/leave_settings/settings locally,
// so the next sync pass knows this table has a pending local change to push.
export function markDirty(table) {
  const meta = loadSyncMeta();
  meta[table] = { ...(meta[table] || {}), dirty: true, updatedAt: new Date().toISOString() };
  saveSyncMeta(meta);
}

// Reconciles one table's local copy against its remote row: pushes local if
// local is dirty and wins, pulls remote if remote wins, or does nothing if
// neither applies. A failed push/pull leaves the dirty flag untouched so the
// next sync attempt retries it — nothing is ever silently dropped.
export async function syncTable(supabase, table, { load, save }, userId) {
  const meta = loadSyncMeta();
  const local = meta[table] || {};

  const { data: remoteRow, error: fetchError } = await supabase
    .from(table)
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError };

  const winner = pickWinner(local.updatedAt, remoteRow?.updated_at);

  if (winner === "local" && local.dirty) {
    const localData = await load();
    const { error: pushError } = await supabase
      .from(table)
      .upsert({ user_id: userId, data: localData, updated_at: local.updatedAt });
    if (pushError) return { ok: false, error: pushError };
    saveSyncMeta({ ...loadSyncMeta(), [table]: { dirty: false, updatedAt: local.updatedAt } });
    return { ok: true, direction: "pushed" };
  }

  if (winner === "remote" && remoteRow) {
    await save(remoteRow.data);
    saveSyncMeta({ ...loadSyncMeta(), [table]: { dirty: false, updatedAt: remoteRow.updated_at } });
    return { ok: true, direction: "pulled" };
  }

  return { ok: true, direction: "none" };
}

// Runs syncTable for every configured table. Called on login, on first
// migration, on 'online', and when the app returns to the foreground.
export async function syncAll(supabase, userId, tableConfigs) {
  const results = {};
  for (const { table, load, save } of tableConfigs) {
    results[table] = await syncTable(supabase, table, { load, save }, userId);
  }
  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- sync.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/sync.js src/lib/sync.test.js
git commit -m "Add sync queue: dirty tracking, per-table push/pull, syncAll"
```

---

### Task 5: First-login migration

**Files:**
- Modify: `src/lib/sync.js`
- Modify: `src/lib/sync.test.js`

**Interfaces:**
- Consumes: same `tableConfigs` shape as `syncAll` (Task 4), but only needs `{ table, load }`.
- Produces: `migrateLocalDataIfNeeded(supabase, userId, tableConfigs)` — used by Task 8 immediately after a driver's first successful login.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/sync.test.js`:
```js
import { migrateLocalDataIfNeeded } from "./sync.js";

describe("migrateLocalDataIfNeeded", () => {
  beforeEach(() => localStorage.clear());

  it("pushes local data as the initial row when no remote row exists", async () => {
    const { supabase, calls } = makeFakeSupabase({ remoteRow: null });
    const results = await migrateLocalDataIfNeeded(supabase, "user-1", [
      { table: "app_data", load: () => ({ periods: [{ id: "p1" }], activePeriodId: "p1" }) },
    ]);

    expect(results.app_data).toEqual({ ok: true, migrated: true });
    expect(calls.upserts).toHaveLength(0); // migration inserts, it doesn't upsert
  });

  it("does not overwrite an existing remote row", async () => {
    const remoteRow = { data: { periods: [] }, updated_at: "2026-07-23T10:00:00Z" };
    const { supabase } = makeFakeSupabase({ remoteRow });
    const results = await migrateLocalDataIfNeeded(supabase, "user-1", [
      { table: "app_data", load: () => ({ periods: [{ id: "should-not-upload" }] }) },
    ]);

    expect(results.app_data).toEqual({ ok: true, migrated: false });
  });
});
```

The `makeFakeSupabase` helper needs an `insert` method for this task. Update it in `src/lib/sync.test.js`:
```js
function makeFakeSupabase({ remoteRow = null, fetchError = null, pushError = null, insertError = null } = {}) {
  const calls = { upserts: [], inserts: [] };
  const supabase = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
          if (fetchError) return { data: null, error: fetchError };
          return { data: remoteRow, error: null };
        },
        async upsert(row) {
          calls.upserts.push(row);
          if (pushError) return { error: pushError };
          return { error: null };
        },
        async insert(row) {
          calls.inserts.push(row);
          if (insertError) return { error: insertError };
          return { error: null };
        },
      };
    },
  };
  return { supabase, calls };
}
```
(This replaces the earlier version of `makeFakeSupabase` from Task 4 — same function, extended.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- sync.test`
Expected: FAIL — `migrateLocalDataIfNeeded` is not exported yet.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/sync.js`:
```js
// On a driver's first successful login, pushes whatever already exists in
// local storage up as each table's initial row — but only if that table has
// no remote row yet, so a second device logging in later never clobbers
// history the first device already migrated.
export async function migrateLocalDataIfNeeded(supabase, userId, tableConfigs) {
  const results = {};
  for (const { table, load } of tableConfigs) {
    const { data: remoteRow, error: fetchError } = await supabase
      .from(table)
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      results[table] = { ok: false, error: fetchError };
      continue;
    }
    if (remoteRow) {
      results[table] = { ok: true, migrated: false };
      continue;
    }

    const localData = await load();
    const updatedAt = new Date().toISOString();
    const { error: insertError } = await supabase
      .from(table)
      .insert({ user_id: userId, data: localData, updated_at: updatedAt });

    if (insertError) {
      results[table] = { ok: false, error: insertError };
      continue;
    }

    const meta = loadSyncMeta();
    meta[table] = { dirty: false, updatedAt };
    saveSyncMeta(meta);
    results[table] = { ok: true, migrated: true };
  }
  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- sync.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/sync.js src/lib/sync.test.js
git commit -m "Add first-login migration of pre-existing local data"
```

---

### Task 6: Auth wrappers

**Files:**
- Create: `src/lib/auth.js`
- Test: `src/lib/auth.test.js`

**Interfaces:**
- Produces: `signUp(supabase, { email, password, driverNumber, garage })`, `signIn(supabase, { email, password })`, `signOut(supabase)`, `getSession(supabase)`, `onAuthStateChange(supabase, callback)` — used by `AuthScreen.jsx` (Task 7) and `App.jsx` (Task 8).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/auth.test.js`:
```js
import { describe, it, expect, vi } from "vitest";
import { signUp, signIn, signOut, getSession, onAuthStateChange } from "./auth.js";

function makeFakeSupabase() {
  return {
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(),
    },
  };
}

describe("signUp", () => {
  it("passes driver_number and garage as signup metadata, with an email redirect", async () => {
    const supabase = makeFakeSupabase();
    await signUp(supabase, { email: "a@b.com", password: "secret123", driverNumber: "D123", garage: "Broadstone" });

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "secret123",
      options: {
        data: { driver_number: "D123", garage: "Broadstone" },
        emailRedirectTo: window.location.origin,
      },
    });
  });
});

describe("signIn", () => {
  it("calls signInWithPassword with email and password", async () => {
    const supabase = makeFakeSupabase();
    await signIn(supabase, { email: "a@b.com", password: "secret123" });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "secret123" });
  });
});

describe("signOut", () => {
  it("calls supabase signOut", async () => {
    const supabase = makeFakeSupabase();
    await signOut(supabase);

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});

describe("getSession", () => {
  it("calls supabase getSession", async () => {
    const supabase = makeFakeSupabase();
    await getSession(supabase);

    expect(supabase.auth.getSession).toHaveBeenCalled();
  });
});

describe("onAuthStateChange", () => {
  it("forwards the session to the callback", () => {
    const supabase = makeFakeSupabase();
    const callback = vi.fn();
    let capturedHandler;
    supabase.auth.onAuthStateChange.mockImplementation((handler) => { capturedHandler = handler; });

    onAuthStateChange(supabase, callback);
    capturedHandler("SIGNED_IN", { user: { id: "user-1" } });

    expect(callback).toHaveBeenCalledWith({ user: { id: "user-1" } });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- auth.test`
Expected: FAIL — `src/lib/auth.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/lib/auth.js`:
```js
export function signUp(supabase, { email, password, driverNumber, garage }) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { driver_number: driverNumber, garage },
      emailRedirectTo: window.location.origin,
    },
  });
}

export function signIn(supabase, { email, password }) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signOut(supabase) {
  return supabase.auth.signOut();
}

export function getSession(supabase) {
  return supabase.auth.getSession();
}

export function onAuthStateChange(supabase, callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- auth.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.js src/lib/auth.test.js
git commit -m "Add Supabase auth wrappers: signUp, signIn, signOut, session handling"
```

---

### Task 7: AuthScreen UI

**Files:**
- Create: `src/screens/AuthScreen.jsx`

**Interfaces:**
- Consumes: `signUp`, `signIn` from `src/lib/auth.js` (Task 6); `supabase` from `src/lib/supabaseClient.js` (Task 1).
- Produces: `<AuthScreen supabase={supabase} />` default export — rendered by `App.jsx` (Task 8) whenever there's no active session. Login success is detected by `App.jsx`'s own `onAuthStateChange` subscription (Task 8), not by a callback prop here.

No automated test for this task — per the approved spec's Testing section, UI flows (signup, email verification, login) get a manual pass, covered in Task 9.

- [ ] **Step 1: Write the component**

Create `src/screens/AuthScreen.jsx`:
```jsx
import { useState } from "react";
import { signUp, signIn } from "../lib/auth.js";

const BG = "#07090F";
const CARD = "#11141B";
const TEXT = "#F5F6F8";
const MUTED = "#8A90A0";
const ACCENT = "#F5C244";
const DANGER = "#EF4444";

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #262B36",
  background: "#0D1017",
  color: TEXT,
  fontSize: 15,
  marginBottom: 12,
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: 10,
  border: "none",
  background: ACCENT,
  color: "#07090F",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};

export default function AuthScreen({ supabase }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [driverNumber, setDriverNumber] = useState("");
  const [garage, setGarage] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await signUp(supabase, { email, password, driverNumber, garage });
        if (signUpError) { setError(signUpError.message); return; }
        setAwaitingVerification(true);
      } else {
        const { error: signInError } = await signIn(supabase, { email, password });
        if (signInError) { setError(signInError.message); return; }
        // On success, App.jsx's onAuthStateChange subscription picks up the
        // new session and swaps this screen out — nothing further to do here.
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (awaitingVerification) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: CARD, borderRadius: 16, padding: 28, maxWidth: 380, textAlign: "center" }}>
          <h1 style={{ color: TEXT, fontSize: 20, marginBottom: 12 }}>Check your email</h1>
          <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.5 }}>
            We sent a verification link to <strong style={{ color: TEXT }}>{email}</strong>. Confirm it, then come back and log in.
          </p>
          <button style={{ ...buttonStyle, marginTop: 20 }} onClick={() => { setAwaitingVerification(false); setMode("login"); }}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={handleSubmit} style={{ background: CARD, borderRadius: 16, padding: 28, width: "100%", maxWidth: 380 }}>
        <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          {mode === "signup" ? "Create account" : "Log in"}
        </h1>
        <p style={{ color: MUTED, fontSize: 13, marginBottom: 20 }}>
          {mode === "signup" ? "Sync your duty logs and settings across devices." : "Welcome back."}
        </p>

        <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

        {mode === "signup" && (
          <>
            <input style={inputStyle} type="text" placeholder="Driver number" value={driverNumber} onChange={(e) => setDriverNumber(e.target.value)} required />
            <input style={inputStyle} type="text" placeholder="Garage" value={garage} onChange={(e) => setGarage(e.target.value)} required />
          </>
        )}

        {error && <p style={{ color: DANGER, fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button style={buttonStyle} type="submit" disabled={submitting}>
          {submitting ? "Please wait…" : mode === "signup" ? "Sign up" : "Log in"}
        </button>

        <p style={{ color: MUTED, fontSize: 13, marginTop: 16, textAlign: "center" }}>
          {mode === "signup" ? "Already have an account?" : "New driver?"}{" "}
          <button
            type="button"
            onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(null); }}
            style={{ background: "none", border: "none", color: ACCENT, cursor: "pointer", fontSize: 13, fontWeight: 700, padding: 0 }}
          >
            {mode === "signup" ? "Log in" : "Sign up"}
          </button>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/AuthScreen.jsx
git commit -m "Add AuthScreen: email/password signup and login with driver_number/garage"
```

---

### Task 8: Wire auth gating and sync into App.jsx

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `supabase` (Task 1), `signOut`, `getSession`, `onAuthStateChange` (Task 6), `AuthScreen` (Task 7), `markDirty`, `syncAll`, `migrateLocalDataIfNeeded` (Tasks 4–5).

No automated test for this task — it's integration wiring into the existing 3000-line component; per the spec's Testing section this is covered by Task 9's manual end-to-end pass.

- [ ] **Step 1: Add imports**

At the top of `src/App.jsx` (after the existing `import { useState, ... } from "react";` at line 1), add:
```js
import { supabase } from "./lib/supabaseClient.js";
import { signOut, getSession, onAuthStateChange } from "./lib/auth.js";
import { markDirty, syncAll, migrateLocalDataIfNeeded } from "./lib/sync.js";
import AuthScreen from "./screens/AuthScreen.jsx";
```

- [ ] **Step 2: Mark each local save as dirty**

Modify `saveData` (`src/App.jsx:203-206`):
```js
async function saveData(data) {
  try { localStorage.setItem("dbus_v3", JSON.stringify(data)); markDirty("app_data"); return true; }
  catch(e) { console.error(e); return false; }
}
```

Modify `saveLeaveSettings` (`src/App.jsx:2111`):
```js
function saveLeaveSettings(s) { try{localStorage.setItem(LEAVE_KEY,JSON.stringify(s));markDirty("leave_settings");}catch{} }
```

Modify `saveSettings` (`src/App.jsx:2180`):
```js
function saveSettings(s) { try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));markDirty("settings");}catch{} }
```

- [ ] **Step 3: Add session state and the auth gate**

In `App()` (`src/App.jsx:2842` onward), add alongside the other `useState` calls near line 2865:
```js
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = signed out
```

Add a new `useEffect` (near the existing session-independent effect at line 2868) that checks the initial session and subscribes to changes:
```js
  useEffect(() => {
    getSession(supabase).then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } = onAuthStateChange(supabase, (newSession) => setSession(newSession));
    return () => subscription.unsubscribe();
  }, []);
```

Build the table configs used by both migration and ongoing sync, right after `activePeriod` is computed (`src/App.jsx:2866`):
```js
  const tableConfigs = [
    {
      table: "app_data",
      load: async () => { const { data } = await loadData(); return data || { periods: [], activePeriodId: null }; },
      save: async (remote) => { await saveData(remote); setPeriods(remote.periods || []); setActivePeriodId(remote.activePeriodId || null); },
    },
    {
      table: "leave_settings",
      load: () => loadLeaveSettings(),
      save: (remote) => { saveLeaveSettings(remote); setLeaveSettings(remote); },
    },
    {
      table: "settings",
      load: () => loadSettings(),
      save: (remote) => { saveSettings(remote); setThemeKey((k) => k + 1); },
    },
  ];
```

Add a `useEffect` that runs migration once per new login, then syncs, and re-syncs on reconnect/foreground:
```js
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    async function runInitialSync() {
      await migrateLocalDataIfNeeded(supabase, session.user.id, tableConfigs);
      if (!cancelled) await syncAll(supabase, session.user.id, tableConfigs);
    }
    runInitialSync();

    function handleReconnect() { syncAll(supabase, session.user.id, tableConfigs); }
    window.addEventListener("online", handleReconnect);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") handleReconnect(); });

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleReconnect);
    };
  }, [session?.user?.id]);
```

- [ ] **Step 4: Gate rendering on session**

Find the main render `return` in `App()` (the JSX returned after all the screen-routing logic, following the same pattern as the existing `if (loading) return ...` early-return already in the component). Add an early return, before the existing loading/screen checks:
```js
  if (session === undefined) {
    return <div style={{ background: "#07090F", minHeight: "100vh" }} />; // brief blank frame while session check resolves
  }
  if (session === null) {
    return <AuthScreen supabase={supabase} />;
  }
```

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "Gate app access on Supabase session; wire local saves into sync queue"
```

---

### Task 9: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run the automated suite**

Run: `npm test`
Expected: all Vitest suites from Tasks 1, 3, 4, 5, 6 pass.

- [ ] **Step 2: Signup + email verification**

Run: `npm run dev`

In the browser: sign up with a real test email, driver number, and garage. Confirm the "Check your email" screen appears. Open the verification email, click the link, confirm it lands back on the app's configured redirect URL without an error. Log in with the same credentials — confirm the app loads past `AuthScreen` into the normal home screen.

In the Supabase dashboard Table Editor: confirm a `profiles` row exists with the correct `driver_number` and `garage`, and that `app_data`, `leave_settings`, `settings` each have exactly one row for this user (the first-login migration).

- [ ] **Step 3: RLS check**

Sign up a second test account. In the Supabase SQL Editor, run `select * from app_data;` as the service role (or check via Table Editor) — confirm both rows exist, then confirm from the app that the second account never sees the first account's data (its Home screen shows its own empty state, not the first account's duties).

- [ ] **Step 4: Cross-device sync**

On the first test account: log a shift on one browser/device. Open the app as the same account in a second browser (or incognito window) and confirm the shift appears after a reconnect/foreground sync (may need a refresh, per the local-first design — data appears once `syncAll` runs, not necessarily instantly).

- [ ] **Step 5: Offline logging**

With devtools' Network tab set to "Offline" (or airplane mode on a phone), log a shift. Confirm it saves locally without error. Go back online, confirm the shift pushes up (check the Supabase Table Editor for the updated `app_data` row, or check the second device picks it up).

- [ ] **Step 6: Confirm no regressions in existing local storage shapes**

Confirm existing features that read `dbus_v3`/`dbus_leave`/`dbus_settings` directly (Leave screen totals, Settings panel toggles, Upcoming carousel) still work exactly as before — this task only added a `markDirty` side-effect to the three save functions, not a shape change.

- [ ] **Step 7: Commit any fixes found during manual testing**

If any step above surfaces a bug, fix it, re-run the relevant step, then:
```bash
git add -A
git commit -m "Fix issue found during backend sync manual verification"
```
