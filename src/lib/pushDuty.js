//
// Runtime-agnostic port of the duty-time logic needed to decide whether a
// driver is due a push reminder right now. Deliberately independent of
// src/lib/roster.js (which holds this logic behind a mutable module-level
// CUSTOM_REST_CONFIG global set via setCustomRestConfig() — fine for a
// single-driver browser tab, wrong for a server processing many drivers'
// data in one pass). Every function here takes its config as a plain
// argument instead. No Deno or browser APIs, so this file is imported
// unmodified by both the Vite app and the send-reminders Edge Function
// (via a relative import — Deno resolves plain ESM .js files natively).
// See docs/superpowers/specs/2026-08-13-web-push-notifications-design.md.

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function inPeriod(date, period) {
  return date >= period.startDate && date <= addDays(period.startDate, 34);
}

export function periodForDate(periods, date, activePeriodId) {
  const active = activePeriodId && periods.find((p) => p.id === activePeriodId);
  if (active && inPeriod(date, active)) return active;
  return periods.find((p) => inPeriod(date, p)) || null;
}

// Mirrors roster.js's FIXED_REST_PATTERN exactly — Week N: [weekday, weekday].
const FIXED_REST_PATTERN = [
  [0, 1], // Week 1: Sunday, Monday
  [4, 0], // Week 2: Thursday, Sunday
  [2, 6], // Week 3: Tuesday, Saturday
  [5, 0], // Week 4: Friday, Sunday
  [3, 6], // Week 5: Wednesday, Saturday
];

export function fixedRestDates(restConfig, periodStartDate) {
  const standard = [];
  FIXED_REST_PATTERN.forEach((weekdays, wIdx) => {
    const weekStart = addDays(periodStartDate, wIdx * 7);
    weekdays.forEach((wd) => standard.push(addDays(weekStart, wd)));
  });
  if (!restConfig.enabled) return standard;

  const since = restConfig.since;
  const kept = since ? standard.filter((d) => d < since) : [];
  const custom = [];
  for (let i = 0; i < 35; i++) {
    const d = addDays(periodStartDate, i);
    if (since && d < since) continue;
    const weekday = new Date(d + "T12:00:00").getDay();
    if (restConfig.weekdays.has(weekday)) custom.push(d);
  }
  return [...kept, ...custom];
}

function withFixedRestDays(startDate, daysOff, shifts, removedFixed, restConfig) {
  const removed = new Set(removedFixed || []);
  const taken = new Set([
    ...(daysOff || []).map((d) => d.date),
    ...(shifts || []).map((s) => s.date),
  ]);
  const virtual = fixedRestDates(restConfig, startDate)
    .filter((d) => !taken.has(d) && !removed.has(d))
    .map((d) => ({ id: `fixed-${d}`, date: d, type: "Rest Day", fixed: true }));
  return [...(daysOff || []), ...virtual];
}

export function dayInfo(period, date, restConfig) {
  if (!period || !inPeriod(date, period)) return { status: "unlogged", date };
  const shift = (period.shifts || []).find((s) => s.date === date);
  if (shift) return { status: "shift", date, shift };
  const mergedDaysOff = withFixedRestDays(
    period.startDate,
    period.daysOff || [],
    period.shifts || [],
    period.removedFixedRestDates,
    restConfig
  );
  const dayOff = mergedDaysOff.find((d) => d.date === date);
  if (dayOff) return { status: "dayoff", date, dayOff };
  return { status: "unlogged", date };
}

export function shiftBreakEnd(shift, duties) {
  if (!shift || shift.isSpare || shift.fixedType) return null;
  const duty = duties.find((d) => d.z === shift.zone && d.t === shift.dayType && d.r === shift.roster);
  if (!duty || !duty.be) return null;
  const [h, m] = duty.be.split(":").map(Number);
  const dt = new Date(shift.date + "T00:00:00");
  dt.setMinutes(h * 60 + m);
  return dt;
}
