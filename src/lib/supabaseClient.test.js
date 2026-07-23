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
