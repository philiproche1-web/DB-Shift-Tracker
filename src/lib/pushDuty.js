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

export function fixedRestDates(restConfig, periodStartDate, restPattern = FIXED_REST_PATTERN) {
  const standard = [];
  restPattern.forEach((weekdays, wIdx) => {
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

function withFixedRestDays(startDate, daysOff, shifts, removedFixed, restConfig, restPattern = FIXED_REST_PATTERN) {
  const removed = new Set(removedFixed || []);
  const taken = new Set([
    ...(daysOff || []).map((d) => d.date),
    ...(shifts || []).map((s) => s.date),
  ]);
  const virtual = fixedRestDates(restConfig, startDate, restPattern)
    .filter((d) => !taken.has(d) && !removed.has(d))
    .map((d) => ({ id: `fixed-${d}`, date: d, type: "Rest Day", fixed: true }));
  return [...(daysOff || []), ...virtual];
}

export function dayInfo(period, date, restConfig, restPattern = FIXED_REST_PATTERN) {
  if (!period || !inPeriod(date, period)) return { status: "unlogged", date };
  const shift = (period.shifts || []).find((s) => s.date === date);
  if (shift) return { status: "shift", date, shift };
  const mergedDaysOff = withFixedRestDays(
    period.startDate,
    period.daysOff || [],
    period.shifts || [],
    period.removedFixedRestDates,
    restConfig,
    restPattern
  );
  const dayOff = mergedDaysOff.find((d) => d.date === date);
  if (dayOff) return { status: "dayoff", date, dayOff };
  return { status: "unlogged", date };
}

// Converts a Europe/Dublin wall-clock date+time (as used by duty break-end
// times in roster-data.json) into the true UTC instant, regardless of the
// runtime's own timezone. Needed because this function is called both from
// a driver's browser (implicitly Europe/Dublin) and from a Supabase Edge
// Function (UTC) — without this, a UTC runtime misreads Dublin wall-clock
// times as UTC and computes break-end ~1 hour late during IST (summer).
export function dublinWallClockToUTC(dateStr, hh, mm) {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Compute the naive instant first (Date.UTC correctly rolls hh >= 24 into
  // the next calendar day), then probe Dublin's offset using noon on THAT
  // day — not the original dateStr's day — so overnight rollover times
  // (roster convention: be up to "27:24") get the correct offset even when
  // the rollover crosses a DST transition. Probing at noon also avoids any
  // ambiguity right at a DST transition that happens near midnight.
  const naive = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const probeUTC = new Date(Date.UTC(naive.getUTCFullYear(), naive.getUTCMonth(), naive.getUTCDate(), 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Dublin",
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(probeUTC);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const dublinAtProbe = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  const offsetMs = dublinAtProbe - probeUTC.getTime();
  return new Date(naive.getTime() - offsetMs);
}

export function shiftBreakEnd(shift, duties) {
  if (!shift || shift.isSpare || shift.fixedType) return null;
  const duty = duties.find((d) => d.z === shift.zone && d.t === shift.dayType && d.r === shift.roster);
  if (!duty || !duty.be) return null;
  const [h, m] = duty.be.split(":").map(Number);
  return dublinWallClockToUTC(shift.date, h, m);
}
