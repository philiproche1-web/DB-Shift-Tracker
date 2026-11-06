// Pure period-mutation logic, extracted verbatim from App.jsx's save/delete
// handlers so it can be tested without rendering React or mocking Supabase.
//
// Every function here takes the current periods array and returns a NEW one —
// no state, no side effects. App.jsx keeps ownership of persistence and
// screen navigation and simply feeds the result to persist().
//
// This is the code path behind the numbers a driver relies on: which period a
// day off lands in, whether a shift replaces another, and whether Bank Holiday
// In Lieu entries save atomically with their shift. The compliance arithmetic
// downstream (dutyMath.wkStats) is well covered; historically the bugs that
// reached real drivers were here instead — a duplicate Self Cert, a day off
// written into a stale archived period, an edit deleting a real shift.
import { periodForDate } from "./roster.js";
import { addDays, uid, inPeriod } from "./dutyMath.js";

// Drivers get their duty by text a few days ahead, so a date in the NEXT
// 5-week period can be logged before that period starts (Phil 2026-11-06).
// The next period is the 35 days straight after the active one. If any of
// `dates` falls in it and no period covers it yet, create it now (not
// active); rollPeriodsForward() later switches to this same period instead
// of making a fresh empty one, so nothing logged early is lost.
export function nextPeriodStart(periods, activePeriodId) {
  const active = periods.find(p => p.id === activePeriodId);
  return active ? addDays(active.startDate, 35) : null;
}
export function isInNextPeriod(periods, activePeriodId, date) {
  const ns = nextPeriodStart(periods, activePeriodId);
  return !!ns && date >= ns && date <= addDays(ns, 34);
}
export function ensureNextPeriodFor(periods, activePeriodId, dates) {
  const ns = nextPeriodStart(periods, activePeriodId);
  if (!ns) return periods;
  if (!dates.some(d => isInNextPeriod(periods, activePeriodId, d))) return periods;
  if (periods.some(p => p.startDate === ns)) return periods;
  return [...periods, { id: uid(), startDate: ns, shifts: [], daysOff: [], createdAt: new Date().toISOString(), earlyCreated: true }];
}

// Adds or updates one or more shifts, each in the period that covers its
// date (active first, then the pre-created next period), together with any
// Bank Holiday In Lieu day-off entries chosen for those dates.
//
// Bank Holiday In Lieu entries are merged in the SAME update as the shifts
// rather than a follow-up call, so a choice and its shift can never half-save.
export function applyShiftSave(periods, activePeriodId, shiftOrArray, bankHolidayInLieuEntries) {
  const items = Array.isArray(shiftOrArray) ? shiftOrArray : [shiftOrArray];
  let updated = periods.map(p => ({ ...p, shifts: p.shifts || [] }));
  const targetFor = (date) => (periodForDate(updated, date, activePeriodId)?.id ?? activePeriodId);
  items.forEach(shift => {
    const owner = updated.find(p => p.shifts.some(s => s.id === shift.id));
    const target = targetFor(shift.date);
    if (owner && owner.id === target) {
      updated = updated.map(p => p.id !== owner.id ? p : { ...p, shifts: p.shifts.map(s => s.id === shift.id ? shift : s) });
      return;
    }
    // An edit that moved the date into another period: take it out of the old one.
    if (owner) updated = updated.map(p => p.id !== owner.id ? p : { ...p, shifts: p.shifts.filter(s => s.id !== shift.id) });
    updated = updated.map(p => {
      if (p.id !== target) return p;
      // New shift: skip if some other shift already owns this date — the
      // day-circle picker greys out already-logged days, but this guards a
      // race (another device/tab logging in between).
      if (p.shifts.some(s => s.date === shift.date)) return p;
      return { ...p, shifts: [...p.shifts, shift] };
    });
  });
  (bankHolidayInLieuEntries || []).forEach(entry => {
    const target = targetFor(entry.date);
    updated = updated.map(p => {
      if (p.id !== target) return p;
      const daysOff = p.daysOff || [];
      if (daysOff.some(d => d.type === "Bank Holiday In Lieu" && d.date === entry.date)) return p;
      if (!p.shifts.some(s => s.date === entry.date)) return p;
      return { ...p, daysOff: [...daysOff, entry] };
    });
  });
  return updated;
}

// Adds or updates one or more day-off entries, optionally replacing same-date
// shifts and/or earlier day-off entries.
//
// Target period is resolved via periodForDate (which checks the active period
// first) rather than a plain periods.find() — a bare find() could resolve into
// a stale archived period whose date range still overlaps the active one,
// saving the entry somewhere it would never be seen or be editable.
export function applyDayOffSave(periods, activePeriodId, dayOffOrArray, replaceShiftIds, replaceDayOffIds) {
  const items = Array.isArray(dayOffOrArray) ? dayOffOrArray : [dayOffOrArray];
  let updated = [...periods];
  items.forEach(dayOff => {
    const targetId = dayOff.id && periods.some(p => (p.daysOff || []).some(d => d.id === dayOff.id))
      ? periods.find(p => (p.daysOff || []).some(d => d.id === dayOff.id))?.id
      : (periodForDate(periods, dayOff.date, activePeriodId)?.id ?? activePeriodId);
    updated = updated.map(p => {
      if (p.id !== targetId) return p;
      let daysOff = p.daysOff || [];
      if (replaceDayOffIds?.length) daysOff = daysOff.filter(d => !replaceDayOffIds.includes(d.id));
      const ei = daysOff.findIndex(d => d.id === dayOff.id);
      if (ei >= 0) return { ...p, daysOff: daysOff.map(d => d.id === dayOff.id ? dayOff : d) };
      // Checked across ALL periods, not just this one — a date belongs to
      // exactly one period, but a stale conflict-check on the caller's side
      // (e.g. a double-submit) could otherwise let a second entry land in a
      // different period than the first, invisible to a same-period-only check
      // while still counting toward Leave's cross-period tally.
      const dateTakenElsewhere = updated.some(op => op.id !== p.id
        && (op.daysOff || []).some(d => d.date === dayOff.date && !replaceDayOffIds?.includes(d.id)));
      if (daysOff.some(d => d.date === dayOff.date) || dateTakenElsewhere) return p;
      return { ...p, daysOff: [...daysOff, dayOff] };
    });
  });
  // A day off replaces any shift(s) already logged on the same date(s).
  if (replaceShiftIds?.length) {
    updated = updated.map(p => ({ ...p, shifts: (p.shifts || []).filter(s => !replaceShiftIds.includes(s.id)) }));
  }
  return updated;
}

// Removes the shift from whichever period holds it (the active one, or a
// pre-created next period).
export function applyShiftDelete(periods, activePeriodId, shiftId) {
  return periods.map(p => !(p.shifts || []).some(s => s.id === shiftId) ? p : { ...p, shifts: p.shifts.filter(s => s.id !== shiftId) });
}

// Suppresses an automatic (pattern-generated) rest day for one date by
// recording it in the period's removedFixedRestDates.
export function applyFixedRestDayRemoval(periods, activePeriodId, date) {
  return periods.map(p => p.id !== activePeriodId ? p : { ...p, removedFixedRestDates: [...(p.removedFixedRestDates || []), date] });
}

// Deletes a real day-off entry. Finds the entry's actual owning period rather
// than assuming activePeriodId — the Leave screen lists entries from every
// period, not just the active one.
export function applyDayOffDelete(periods, dayOffId) {
  const owner = periods.find(p => (p.daysOff || []).some(d => d.id === dayOffId));
  return periods.map(p => p.id !== owner?.id ? p : { ...p, daysOff: (p.daysOff || []).filter(d => d.id !== dayOffId) });
}
