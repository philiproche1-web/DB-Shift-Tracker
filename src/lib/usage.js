// App-usage counters for the "Using the app" badges. Stored inside the
// driver's settings (settings.achievements.usage) so they ride the existing
// `settings` sync — no new table. Fires a window "rb-usage" event so App
// can re-check badges straight away.
import { loadSettings, saveSettings } from "./persistence.js";

export const USAGE_EVENT = "rb-usage";
const OPEN_DAYS_KEPT = 60;

const COUNTERS = {
  lookup: "lookups", share: "shares", alerts: "alertsViewed", pdf: "pdfExports",
  tour: "toursCompleted", tourReplay: "tourReplays", faq: "faqViews", feedback: "feedbackSent",
};

export function emptyAchievementState() {
  const usage = { tabs: [], openDays: [] };
  Object.values(COUNTERS).forEach((k) => { usage[k] = 0; });
  return { v: 1, earned: {}, usage };
}

// Pure: returns the next usage object (the same object when nothing changed).
export function applyUsage(usage, kind, value) {
  const u = { ...emptyAchievementState().usage, ...(usage || {}) };
  if (COUNTERS[kind]) return { ...u, [COUNTERS[kind]]: (u[COUNTERS[kind]] || 0) + 1 };
  if (kind === "tab") return u.tabs.includes(value) ? usage : { ...u, tabs: [...u.tabs, value] };
  if (kind === "open") return u.openDays.includes(value) ? usage : { ...u, openDays: [...u.openDays, value].sort().slice(-OPEN_DAYS_KEPT) };
  return usage;
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
