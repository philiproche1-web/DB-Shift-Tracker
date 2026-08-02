// Pure date, hour, and compliance-limit math — no UI, no roster data, no
// module-level mutable state. Extracted out of App.jsx so the numbers a
// driver actually relies on (190h/14h30m limits, spreadover) have their own
// test file instead of living untested inside a 3000+ line component file.
export const MAX_HOURS = 190 + 4 / 60;
export const MAX_SUNDAY = 14.5;
export const DAY_OFF_TYPES = ["Annual Leave", "Sick Day", "Rest Day", "Force Majeure", "Self Cert"];
// Rest Day is auto-generated from the fixed roster pattern (see
// withFixedRestDays in roster.js) for the normal case, but a driver can still
// manually log one to override a specific date (swapping which day they rest,
// covering a pattern exception) — withFixedRestDays already skips generating
// the automatic one wherever a real entry exists for that date, so the two
// never collide. Ordered (not DAY_OFF_TYPES' order) so the picker's 2-column
// grid groups Annual Leave with Rest Day on one row, Sick Day/Force Majeure/
// Self Cert on the next.
export const LOGGABLE_DAY_OFF_TYPES = ["Annual Leave", "Rest Day", "Sick Day", "Force Majeure", "Self Cert"];

// Republic of Ireland public holidays — Dublin Bus runs Sunday-service duties
// on every one of these regardless of actual weekday. Literal calendar dates
// (not the private-sector "nearest Monday" substitute day off). Add next
// year's set each December — moving dates (Easter Monday, St. Brigid's Day)
// must be looked up, not computed.
export const BANK_HOLIDAYS_IE = [
  // 2025
  "2025-01-01", "2025-02-03", "2025-03-17", "2025-04-21", "2025-05-05",
  "2025-06-02", "2025-08-04", "2025-10-27", "2025-12-25", "2025-12-26",
  // 2026
  "2026-01-01", "2026-02-02", "2026-03-17", "2026-04-06", "2026-05-04",
  "2026-06-01", "2026-08-03", "2026-10-26", "2026-12-25", "2026-12-26",
  // 2027
  "2027-01-01", "2027-02-01", "2027-03-17", "2027-03-29", "2027-05-03",
  "2027-06-07", "2027-08-02", "2027-10-25", "2027-12-25", "2027-12-26",
];

export function isBankHoliday(s) {
  return BANK_HOLIDAYS_IE.includes(s);
}

export function getDayType(s) {
  if (isBankHoliday(s)) return "sunday";
  const day = new Date(s + "T12:00:00").getDay();
  return day === 0 ? "sunday" : day === 6 ? "saturday" : "weekday";
}
// Real calendar Sunday, ignoring the bank-holiday Sunday-duty override above.
// Use this (not getDayType) anywhere "Sunday" means the actual weekday — the
// 14h30m Sunday-hours compliance cap, and period-start-date validation (weeks
// run calendar Sun-Sat) — as opposed to which duty roster runs that day.
export function isCalendarSunday(s) {
  return new Date(s + "T12:00:00").getDay() === 0;
}
export function addDays(s, n) {
  const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
export function fmtDate(s) {
  return new Date(s + "T12:00:00").toLocaleDateString("en-IE", {weekday:"short",day:"numeric",month:"short"});
}
export function fmtShort(s) {
  return new Date(s + "T12:00:00").toLocaleDateString("en-IE", {day:"numeric",month:"short"});
}
export function fmtLong(s) {
  return new Date(s + "T12:00:00").toLocaleDateString("en-IE", {day:"numeric",month:"long",year:"numeric"});
}
export function fmtHrs(h) {
  if (!h) return "0h";
  const hrs = Math.floor(h), mins = Math.round((h - hrs) * 60);
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
}
// Every DUTIES catalog entry's `d2` (and a saved shift's `duty`, copied from
// it at log time - see LogScreen.jsx's shiftFields()) already carries the
// real duty number a driver keys into the in-cab machine, but only as an
// internal SEQ-table lookup key. This extracts the driver-facing number:
// the last 3 characters, leading zeros stripped. Returns null for anything
// non-numeric (Spare, CPC/Training's fixedType key, or a data gap where d2
// duplicates the roster label) - callers render nothing in that case.
export function dutyNumber(code) {
  if (!code || !/^\d+$/.test(code)) return null;
  return String(parseInt(code.slice(-3), 10));
}
export function today() { return new Date().toISOString().slice(0, 10); }
export function greetingTimeBand(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  return "Good evening";
}
export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
export function thisSunday() {
  const d = new Date(), day = d.getDay(); d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
// Sunday of the week containing an arbitrary date string (not just today's week)
export function sundayOf(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}
export function parseTimeToMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
export function calcSpreadover(report, signOff) {
  return +((parseTimeToMins(signOff) - parseTimeToMins(report)) / 60).toFixed(2);
}
// Adds a fixed duration (in hours) to a start time, returning "HH:MM" (hour may be >=24 for next day)
export function addDuration(startTime, durationHours) {
  if (!startTime) return "00:00";
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = (h * 60 + m) + Math.round(durationHours * 60);
  const fh = Math.floor(totalMin / 60), fm = totalMin % 60;
  return `${String(fh).padStart(2,"0")}:${String(fm).padStart(2,"0")}`;
}
export function maxConsec(shifts) {
  if (!shifts?.length) return 0;
  const dates = [...new Set(shifts.map(s => s.date))].sort();
  if (!dates.length) return 0;
  let max = 1, cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i]+"T12:00:00") - new Date(dates[i-1]+"T12:00:00")) / 86400000;
    if (diff === 1) { cur++; if (cur > max) max = cur; } else cur = 1;
  }
  return max;
}
export function dayOffTally(daysOff) {
  const t = {}; DAY_OFF_TYPES.forEach(x => t[x] = 0);
  (daysOff || []).forEach(d => { if (t[d.type] !== undefined) t[d.type]++; });
  return t;
}
export function inPeriod(date, p) { return date >= p.startDate && date <= addDays(p.startDate, 34); }

export function wkStats(shifts, daysOff, wStart) {
  const wEnd = addDays(wStart, 6);
  const ws = (shifts||[]).filter(s => s.date >= wStart && s.date <= wEnd);
  const wd = (daysOff||[]).filter(d => d.date >= wStart && d.date <= wEnd);
  const compliance = ws.filter(s => !s.isRestDay);
  // Compliance figures use paid Work hours (walking/driving time), not full
  // spreadover — spreadover includes the unpaid break, which doesn't count
  // toward the 190h/14h30m limits. Work hours come from the xlsx roster source.
  const overtime = +ws.reduce((a,x) => {
    if (x.isRestDay) return a + (x.workHours||0);
    return a + (x.overtimeHours||0);
  }, 0).toFixed(2);
  return {
    shifts: ws, daysOff: wd, start: wStart, end: wEnd,
    total: +compliance.reduce((a,x) => a + (x.workHours||0), 0).toFixed(2),
    sunday: +compliance.filter(s => isCalendarSunday(s.date)).reduce((a,x) => a + (x.workHours||0), 0).toFixed(2),
    overtime
  };
}
