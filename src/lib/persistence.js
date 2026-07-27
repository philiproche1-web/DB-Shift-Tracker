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

// ─── SHIFT REMINDERS (opt-in, foreground-only) ─────────────────────────────────
// There's no backend here, so there's no way to notify a driver who hasn't
// opened the app — these fire the moment a relevant condition is true on a
// screen they're already looking at, deduped per day/period so they don't
// repeat every time the app is reopened. Settings copy is upfront that this
// only works while the app is open; a real "notify while closed" feature
// would need a small push-capable backend, which doesn't exist yet.
export function notifyOnce(dedupeKey, title, body) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (localStorage.getItem(dedupeKey)) return;
    new Notification(title, {body, icon:"/icon-192.png"});
    localStorage.setItem(dedupeKey, "1");
  } catch {}
}

export const APP_VERSION = "1.7";
export const WHATS_NEW = {
  version: "1.7",
  title: "What's new in v1.7",
  showToExisting: true,
  features: [
    { icon: "account", heading: "Accounts & multi-device sync", body: "Sign up with your driver number and log in from any phone — your shifts, leave and settings follow your account, not just one device." },
    { icon: "garage", heading: "Garage groundwork", body: "Your garage is now part of your profile, editable in Settings if you move depot. Summerhill has the live roster — other garages are coming soon." },
    { icon: "alert", heading: "Route alerts", body: "Diversions, roadworks and other notices now show up on Home, and inline on Log a Shift and Lookup, matched to your zone." },
    { icon: "home", heading: "Personalized Home", body: "A greeting with your name, your logging streak, and today's weather chip — all at the top of Home." },
    { icon: "duty", heading: "Simpler duty type picker", body: "Duty, CPC/Training and both Spare types are now one set of buttons instead of a separate toggle — pick one, times adjust accordingly." },
    { icon: "help", heading: "FAQ added", body: "A new FAQ in Settings answers common questions on signing up, logging shifts, hours limits, leave and route alerts." },
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
