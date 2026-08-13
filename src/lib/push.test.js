import { describe, it, expect, vi, beforeEach } from "vitest";

vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "test-vapid-key");

const upsertMock = vi.fn(() => ({ error: null }));
let deleteErrorOverride = null;
const deleteMock = {
  eq: vi.fn(() => ({
    error: deleteErrorOverride
  }))
};
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

describe("unsubscribeFromPush", () => {
  beforeEach(() => {
    deleteErrorOverride = null;
    const unsubscribeMock = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn(() =>
              Promise.resolve({
                endpoint: "https://push.example/abc",
                unsubscribe: unsubscribeMock,
              })
            ),
          },
        }),
      },
    });
  });

  it("deletes the subscription row and calls unsubscribe on success", async () => {
    const { unsubscribeFromPush } = await import("./push.js");
    const result = await unsubscribeFromPush("user-1");
    expect(result.ok).toBe(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    expect(sub.unsubscribe).toHaveBeenCalled();
  });

  it("returns ok:false and does not call unsubscribe when delete fails", async () => {
    deleteErrorOverride = { message: "RLS policy violation" };
    const { unsubscribeFromPush } = await import("./push.js");
    const result = await unsubscribeFromPush("user-1");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("RLS policy violation");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    expect(sub.unsubscribe).not.toHaveBeenCalled();
  });
});
