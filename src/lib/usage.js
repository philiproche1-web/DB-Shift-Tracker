// App-usage counters for the "Using the app" badges. Stored inside the
// driver's settings (settings.achievements.usage) so they ride the existing
// `settings` sync — no new table. Fires a window "rb-usage" event so App
// can re-check badges straight away.
import { loadSettings, saveSettings } from "./persistence.js";

export const USAGE_EVENT = "rb-usage";
const OPEN_DAYS_KEPT = 60;

export function emptyAchievementState() {
  return { v: 1, earned: {}, usage: { lookups: 0, shares: 0, alertsViewed: 0, pdfExports: 0, tabs: [], openDays: [] } };
}

// Pure: returns the next usage object.
export function applyUsage(usage, kind, value) {
  const u = { ...emptyAchievementState().usage, ...(usage || {}) };
  switch (kind) {
    case "lookup": return { ...u, lookups: u.lookups + 1 };
    case "share": return { ...u, shares: u.shares + 1 };
    case "alerts": return { ...u, alertsViewed: u.alertsViewed + 1 };
    case "pdf": return { ...u, pdfExports: u.pdfExports + 1 };
    case "tab": return u.tabs.includes(value) ? u : { ...u, tabs: [...u.tabs, value] };
    case "open": {
      if (u.openDays.includes(value)) return u;
      return { ...u, openDays: [...u.openDays, value].sort().slice(-OPEN_DAYS_KEPT) };
    }
    default: return u;
  }
}

export function recordUsage(kind, value) {
  try {
    const s = loadSettings();
    // Counting can start before the first badge check; first-run is decided
    // by the `welcomed` flag, not by whether this object exists.
    const base = s.achievements || emptyAchievementState();
    const next = applyUsage(base.usage, kind, value);
    if (next === base.usage) return;
    saveSettings({ ...s, achievements: { ...base, usage: next } });
    window.dispatchEvent(new Event(USAGE_EVENT));
  } catch { /* usage is best effort */ }
}
