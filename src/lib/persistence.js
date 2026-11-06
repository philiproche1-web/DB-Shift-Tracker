import { today } from "./dutyMath.js";
import { markDirty } from "./sync.js";

export const LEAVE_KEY = "dbus_leave";
export const SETTINGS_KEY = "dbus_settings";

export async function loadData() {
  const r = localStorage.getItem("dbus_v3");
  if (!r) return {data:null, corrupted:false};
  try { return {data:JSON.parse(r), corrupted:false}; }
  catch { return {data:null, corrupted:true}; }
}
export function writeDataLocally(data) {
  try { localStorage.setItem("dbus_v3", JSON.stringify(data)); return true; }
  catch(e) { console.error(e); return false; }
}
export async function saveData(data) {
  const ok = writeDataLocally(data);
  if (ok) markDirty("app_data");
  return ok;
}

// ─── HOURS-LIMIT WARNINGS (opt-in, foreground-only) ────────────────────────────
// Shift-not-logged and break-end reminders now go out as real web push, so
// they reach a driver who doesn't have the app open. These two hours-limit
// warnings stay foreground-only by design — they're not time-sensitive like
// a break ending, they just fire when period stats recompute while a driver
// is already looking at Home, deduped per period so they don't repeat every
// time the app is reopened.
export function notifyOnce(dedupeKey, title, body) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (localStorage.getItem(dedupeKey)) return;
    new Notification(title, {body, icon:"/icon-192.png"});
    localStorage.setItem(dedupeKey, "1");
  } catch {}
}

export const APP_VERSION = "1.8";
export const WHATS_NEW = {
  version: "1.8",
  title: "What's new in v1.8",
  showToExisting: true,
  features: [
    { icon: "home", heading: "Your week at a glance", body: "A week strip on Home: green is logged, red is a day you missed, yellow is coming up. Swipe for other weeks, tap a day to log or open it." },
    { icon: "duty", heading: "Overtime right on the card", body: "Open any logged day and set rest day, overtime and notes right there — no more digging through Edit." },
    { icon: "board", heading: "Share a duty to WhatsApp", body: "The camera button on a duty card makes a picture of the full duty with a ready-made swap message." },
    { icon: "period", heading: "Log ahead, and this week first", body: "Got your text early? Log into the next 5-week period. The Period page now opens on this week." },
    { icon: "datepicker", heading: "A calendar that fits", body: "The date picker no longer cuts off Sunday or the OK button on bigger text sizes." },
    { icon: "alert", heading: "Diversions that matter", body: "A diversion only shows on Home when it affects the duty you're on today." },
    { icon: "help", heading: "Badges and a break alarm", body: "Earn badges as you go (Settings › Achievements), and the break reminder can now ring while the app's open." },
  ]
};

export function loadLeaveSettings() {
  try { const s=localStorage.getItem(LEAVE_KEY); return s?JSON.parse(s):{annualTotal:20}; } catch{return{annualTotal:20};}
}
export function writeLeaveSettingsLocally(s) { try{localStorage.setItem(LEAVE_KEY,JSON.stringify(s));}catch{} }
export function saveLeaveSettings(s) { writeLeaveSettingsLocally(s); markDirty("leave_settings"); }

export function loadSettings() {
  const defaults = {appearance:"system",defaultZone:"Zone 1",notificationsEnabled:true,breakReminderEnabled:true,breakReminderMinutes:10};
  try { const s=localStorage.getItem(SETTINGS_KEY); return s?{...defaults,...JSON.parse(s)}:defaults; }
  catch { return defaults; }
}
export function writeSettingsLocally(s) { try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));}catch{} }
export function saveSettings(s) { writeSettingsLocally(s); markDirty("settings"); }
