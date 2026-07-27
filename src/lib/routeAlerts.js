// Diversions, roadworks, and other route notices, scoped per garage (and
// optionally per zone). Fetched from Supabase and cached locally the same
// way the roster is, so an alert seen once still shows with no signal.
import { fmtShort } from "./dutyMath.js";

const ALERTS_CACHE_KEY = "dbus_route_alerts_cache";

// Day-granularity match — an alert counts as relevant for a whole day it
// covers, regardless of time. Used wherever alerts are matched to a specific
// date (Log a Shift, Lookup) rather than to the actual current moment, since
// that date may be in the future or the past and there's no "now" to check
// a time-of-day window against.
export function isActiveOn(alert, date) {
  if (alert.starts_on > date) return false;
  if (alert.ends_on && alert.ends_on < date) return false;
  return true;
}

// "HH:MM:SS" (or "HH:MM") -> "HH:MM", for comparing against and displaying
// a Postgres `time` value.
function trimTime(t) { return t ? t.slice(0, 5) : null; }

// Real-time match — is this alert live right now, including its optional
// starts_time/ends_time window on the boundary day(s)? Used for the Home
// banner, the one place that reflects the actual current moment rather than
// a date the driver is looking up or logging.
export function isLiveNow(alert, now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  if (!isActiveOn(alert, dateStr)) return false;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (alert.starts_time && dateStr === alert.starts_on && timeStr < trimTime(alert.starts_time)) return false;
  if (alert.ends_time && alert.ends_on && dateStr === alert.ends_on && timeStr > trimTime(alert.ends_time)) return false;
  return true;
}

// Human-readable date (+ optional time) range for a card — dates only shown
// once here since neither isActiveOn nor isLiveNow surface them to the driver.
export function alertWindowLabel(alert) {
  const dayPart = alert.ends_on && alert.ends_on !== alert.starts_on
    ? `${fmtShort(alert.starts_on)} – ${fmtShort(alert.ends_on)}`
    : fmtShort(alert.starts_on);
  const st = trimTime(alert.starts_time);
  const et = trimTime(alert.ends_time);
  const timePart = st && et ? `, ${st}–${et}` : st ? `, from ${st}` : et ? `, until ${et}` : "";
  return dayPart + timePart;
}

// zone-less alerts (garage-wide) match every zone; zone-scoped alerts only
// match that zone.
export function alertsForZone(alerts, zone, date) {
  return alerts.filter((a) => isActiveOn(a, date) && (!a.zone || a.zone === zone));
}

export async function fetchRouteAlerts(supabase, garage) {
  try {
    const { data, error } = await supabase
      .from("route_alerts")
      .select("*")
      .eq("garage", garage)
      .eq("active", true)
      .order("starts_on", { ascending: true });
    if (error || !data) throw error || new Error("no data");
    try { localStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(data)); } catch {}
    return data;
  } catch {
    try {
      const cached = JSON.parse(localStorage.getItem(ALERTS_CACHE_KEY) || "null");
      return Array.isArray(cached) ? cached : [];
    } catch { return []; }
  }
}
