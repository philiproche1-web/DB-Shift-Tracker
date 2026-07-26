// Pure date, hour, and compliance-limit math — no UI, no roster data, no
// module-level mutable state. Extracted out of App.jsx so the numbers a
// driver actually relies on (190h/14h30m limits, spreadover) have their own
// test file instead of living untested inside a 3000+ line component file.
export const MAX_HOURS = 190 + 4 / 60;
export const MAX_SUNDAY = 14.5;
export const DAY_OFF_TYPES = ["Annual Leave", "Sick Day", "Rest Day", "Force Majeure", "Self Cert"];

export function getDayType(s) {
  const day = new Date(s + "T12:00:00").getDay();
  return day === 0 ? "sunday" : day === 6 ? "saturday" : "weekday";
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
export function today() { return new Date().toISOString().slice(0, 10); }
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
    sunday: +compliance.filter(s => getDayType(s.date)==="sunday").reduce((a,x) => a + (x.workHours||0), 0).toFixed(2),
    overtime
  };
}
