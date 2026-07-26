import { today, addDays } from "./dutyMath.js";
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

// ─── BACKUP NUDGE ───────────────────────────────────────────────────────────────
// A lost phone or a cleared cache is the single most damaging thing that can
// happen to a localStorage-only app — this tracks when the driver last
// exported a backup so Home can nudge them before that happens, not after.
export const BACKUP_DATE_KEY = "dbus_last_backup";
export const BACKUP_SNOOZE_KEY = "dbus_backup_snooze_until";
export function runExportBackup() {
  try {
    const data = localStorage.getItem("dbus_v3");
    if (!data) return {ok:false, reason:"No data to export yet."};
    const blob = new Blob([data], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ShiftTracker-backup-${today()}.json`; a.click();
    URL.revokeObjectURL(url);
    localStorage.setItem(BACKUP_DATE_KEY, today());
    return {ok:true};
  } catch { return {ok:false, reason:"Export failed — try again."}; }
}
export function daysSinceLastBackup() {
  const last = localStorage.getItem(BACKUP_DATE_KEY);
  if (!last) return null;
  return Math.round((new Date(today()+"T12:00:00") - new Date(last+"T12:00:00")) / 86400000);
}
export function isBackupNudgeSnoozed() {
  const until = localStorage.getItem(BACKUP_SNOOZE_KEY);
  return !!until && today() < until;
}
export function snoozeBackupNudge(days) {
  try { localStorage.setItem(BACKUP_SNOOZE_KEY, addDays(today(), days)); } catch {}
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

export const APP_VERSION = "1.6";
export const WHATS_NEW = {
  version: "1.6",
  title: "What's new in v1.6",
  showToExisting: true,
  features: [
    { icon: "carousel", heading: "Upcoming days on Home", body: "A new strip at the top of Home shows your next few days at a glance — swipe to see more, tap any day to log it straight away." },
    { icon: "repeat", heading: "Repeat a duty while logging", body: "Log a Shift now lets you tick off extra days in the same week when you're logging the same duty — no more separate Repeat screen." },
    { icon: "overwrite", heading: "Fix a mistake without being blocked", body: "Logging a shift on a date that already has one no longer hard-blocks you — you can now confirm to overwrite it." },
    { icon: "board", heading: "Running board corrections", body: "Corrected report/depart times and stops across a large number of duties — running boards should now match your real routes more closely." },
    { icon: "period", heading: "Period screen opens on your week", body: "Opening the Period tab now takes you straight to your current week — the other four stay collapsed until you tap them." },
    { icon: "install", heading: "Install to your home screen", body: "Add the app to your home screen like a real app, and it'll still open with no signal (garage, underground stop, etc)." },
    { icon: "backup", heading: "Backup reminder", body: "If it's been a while since you last backed up your data, Home will now nudge you — protects against losing everything if you clear your cache or change phones." },
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
