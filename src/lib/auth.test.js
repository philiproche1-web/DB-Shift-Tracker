import { describe, it, expect, vi } from "vitest";
import { signUp, signIn, signOut, getSession, onAuthStateChange, isDriverNumberTaken } from "./auth.js";

function makeFakeSupabase() {
  return {
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(),
    },
    rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
  };
}

describe("signUp", () => {
  it("passes driver_number, garage, and first_name as signup metadata, with an email redirect", async () => {
    const supabase = makeFakeSupabase();
    await signUp(supabase, { email: "a@b.com", password: "secret123", driverNumber: "D123", garage: "Summerhill", firstName: "Phil" });

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "secret123",
      options: {
        data: { driver_number: "D123", garage: "Summerhill", first_name: "Phil" },
        emailRedirectTo: window.location.origin,
      },
    });
  });
});

describe("isDriverNumberTaken", () => {
  it("trims the number and returns the RPC result", async () => {
    const supabase = makeFakeSupabase();
    supabase.rpc.mockResolvedValue({ data: true, error: null });

    const result = await isDriverNumberTaken(supabase, " D123 ");

    expect(supabase.rpc).toHaveBeenCalledWith("is_driver_number_taken", { p_driver_number: "D123" });
    expect(result).toBe(true);
  });

  it("is false when the number is free", async () => {
    const supabase = makeFakeSupabase();
    supabase.rpc.mockResolvedValue({ data: false, error: null });

    expect(await isDriverNumberTaken(supabase, "D999")).toBe(false);
  });

  it("fails open (false) if the RPC call errors, since the DB constraint is the real backstop", async () => {
    const supabase = makeFakeSupabase();
    supabase.rpc.mockResolvedValue({ data: null, error: new Error("offline") });

    expect(await isDriverNumberTaken(supabase, "D123")).toBe(false);
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
