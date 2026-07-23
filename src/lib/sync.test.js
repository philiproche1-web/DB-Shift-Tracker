import { describe, it, expect, beforeEach, vi } from "vitest";
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
