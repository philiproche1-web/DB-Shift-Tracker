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
      const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      if (error) return { ok: false, error: error.message };
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
