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
