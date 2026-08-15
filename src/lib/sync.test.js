import { describe, it, expect, beforeEach, vi } from "vitest";
import { pickWinner, markDirty, syncTable, syncAll, hasPendingSync } from "./sync.js";

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

function makeFakeSupabase({
  remoteRow = null,
  fetchError = null,
  pushError = null,
  insertError = null,
  serverUpdatedAt = "2026-07-23T13:00:00Z",
} = {}) {
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
        // Real supabase-js: .upsert(row).select('updated_at').single() —
        // the trigger-assigned server timestamp comes back via that chain,
        // not the value the client sent in `row`.
        upsert(row) {
          calls.upserts.push(row);
          return this;
        },
        insert(row) {
          calls.inserts.push(row);
          return this;
        },
        async single() {
          if (pushError) return { data: null, error: pushError };
          if (insertError) return { data: null, error: insertError };
          return { data: { updated_at: serverUpdatedAt }, error: null };
        },
      };
    },
  };
  return { supabase, calls };
}

describe("hasPendingSync", () => {
  beforeEach(() => localStorage.clear());

  it("is false with nothing synced yet", () => {
    expect(hasPendingSync()).toBe(false);
  });

  it("is true once something is marked dirty", () => {
    markDirty("app_data");
    expect(hasPendingSync()).toBe(true);
  });

  it("is true if ANY table is dirty, not just the first one checked", () => {
    markDirty("settings");
    expect(hasPendingSync()).toBe(true);
  });

  it("clears once a successful push resolves the dirty flag", async () => {
    markDirty("settings");
    const { supabase } = makeFakeSupabase();
    const result = await syncTable(supabase, "settings", { load: () => ({}), save: () => {} }, "user-1");
    expect(result.ok).toBe(true);
    expect(result.direction).toBe("pushed");
    expect(hasPendingSync()).toBe(false);
  });

  it("stays true if the push fails — this is the whole point: a failed", async () => {
    // sync (offline, weak signal, server error) must NOT look the same as a
    // successful one to a driver checking whether their change landed.
    markDirty("settings");
    const { supabase } = makeFakeSupabase({ pushError: { message: "network error" } });
    const result = await syncTable(supabase, "settings", { load: () => ({}), save: () => {} }, "user-1");
    expect(result.ok).toBe(false);
    expect(hasPendingSync()).toBe(true);
  });
});

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

  it("stores the server-assigned updated_at after a push, not the client's own clock value", async () => {
    // Simulates clock drift: this device's clock thinks it's 2026-07-23T09:00:00Z,
    // but the server (via its trigger) actually stamps the row at 13:00:00Z.
    // Future conflict checks must key off the server's clock, not this device's.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T09:00:00.000Z"));
    markDirty("settings");
    vi.useRealTimers();

    const { supabase } = makeFakeSupabase({ remoteRow: null, serverUpdatedAt: "2026-07-23T13:00:00Z" });
    await syncTable(supabase, "settings", { load: () => ({ appearance: "dark" }), save: vi.fn() }, "user-1");

    const meta = JSON.parse(localStorage.getItem("dbus_sync_meta"));
    expect(meta.settings.updatedAt).toBe("2026-07-23T13:00:00Z");
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

  it("does not clear the dirty flag if a newer edit lands mid-push (CAS race)", async () => {
    // Fake timers guarantee the two markDirty() timestamps are distinct
    // (real timers could collide within the same millisecond and make
    // this test flaky).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T10:00:00.000Z"));
    markDirty("settings");
    const { supabase } = makeFakeSupabase({ remoteRow: null });
    const load = () => {
      // Simulate a concurrent edit landing while this push is in flight,
      // after the network fetch but before the final meta write.
      vi.setSystemTime(new Date("2026-07-23T10:00:00.500Z"));
      markDirty("settings");
      return { appearance: "dark" };
    };
    const result = await syncTable(supabase, "settings", { load, save: vi.fn() }, "user-1");
    vi.useRealTimers();

    expect(result).toEqual({ ok: true, direction: "pushed" });
    const meta = JSON.parse(localStorage.getItem("dbus_sync_meta"));
    expect(meta.settings.dirty).toBe(true);
  });

  it("does not clear the dirty flag if a newer edit lands mid-pull (CAS race)", async () => {
    const remoteRow = { data: { appearance: "light" }, updated_at: "2026-07-23T12:00:00Z" };
    const { supabase } = makeFakeSupabase({ remoteRow });
    const save = () => {
      // Simulate a concurrent edit landing while this pull is in flight,
      // after the network fetch but before the final meta write.
      markDirty("settings");
    };
    const result = await syncTable(supabase, "settings", { load: () => ({ appearance: "dark" }), save }, "user-1");

    expect(result).toEqual({ ok: true, direction: "pulled" });
    const meta = JSON.parse(localStorage.getItem("dbus_sync_meta"));
    expect(meta.settings.dirty).toBe(true);
  });

  it("returns { ok: false, error } instead of throwing when load() fails during a push", async () => {
    markDirty("settings");
    const { supabase } = makeFakeSupabase({ remoteRow: null });
    const load = () => {
      throw new Error("disk read failed");
    };
    const result = await syncTable(supabase, "settings", { load, save: vi.fn() }, "user-1");

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("returns { ok: false, error } instead of throwing when save() fails during a pull", async () => {
    const remoteRow = { data: { appearance: "light" }, updated_at: "2026-07-23T12:00:00Z" };
    const { supabase } = makeFakeSupabase({ remoteRow });
    const save = () => {
      throw new Error("disk write failed");
    };
    const result = await syncTable(supabase, "settings", { load: () => ({ appearance: "dark" }), save }, "user-1");

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
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

describe("migrateLocalDataIfNeeded", () => {
  beforeEach(() => localStorage.clear());

  it("pushes local data as the initial row when no remote row exists", async () => {
    const { migrateLocalDataIfNeeded } = await import("./sync.js");
    const { supabase, calls } = makeFakeSupabase({ remoteRow: null });
    const results = await migrateLocalDataIfNeeded(supabase, "user-1", [
      { table: "app_data", load: () => ({ periods: [{ id: "p1" }], activePeriodId: "p1" }) },
    ]);

    expect(results.app_data).toEqual({ ok: true, migrated: true });
    expect(calls.upserts).toHaveLength(0); // migration inserts, it doesn't upsert
  });

  it("does not overwrite an existing remote row", async () => {
    const { migrateLocalDataIfNeeded } = await import("./sync.js");
    const remoteRow = { data: { periods: [] }, updated_at: "2026-07-23T10:00:00Z" };
    const { supabase } = makeFakeSupabase({ remoteRow });
    const results = await migrateLocalDataIfNeeded(supabase, "user-1", [
      { table: "app_data", load: () => ({ periods: [{ id: "should-not-upload" }] }) },
    ]);

    expect(results.app_data).toEqual({ ok: true, migrated: false });
    expect(localStorage.getItem("dbus_sync_meta")).toBeNull();
  });
});
