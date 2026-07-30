import { describe, it, expect } from "vitest";
import { greetingDutyContext, computeShiftStreak, dayInfo, periodForDate } from "./roster.js";
import { addDays } from "./dutyMath.js";

const PERIOD = {
  id: "p1",
  startDate: "2026-07-19",
  shifts: [
    { id: "s1", date: "2026-07-20", roster: "SZ1/01" },
    { id: "s2", date: "2026-07-21", roster: "SZ1/02" },
    { id: "s3", date: "2026-07-23", roster: "SZ1/03" },
  ],
  daysOff: [
    { id: "d1", date: "2026-07-22", type: "Rest Day" },
    { id: "d2", date: "2026-07-24", type: "Annual Leave" },
  ],
};

// Root cause of the "Self Cert never shows in Period or the carousel" report:
// App.jsx's saveDayOff() resolved which period to write into with its own
// plain `periods.find(p => inPeriod(date, p))` — the exact unsafe pattern
// periodForDate's own comment warns against, since an old archived period's
// range can still overlap the active one (see the 2026-07-16 startNewPeriod
// history). A day off logged for "today" could silently land in the wrong,
// stale period's daysOff array — never appearing anywhere the driver looks,
// and not editable/deletable from Period either. saveDayOff must resolve
// through periodForDate (which checks the active period first) instead.
describe("periodForDate resolves the active period first when ranges overlap", () => {
  it("picks the active period, not an earlier archived one whose range still covers the date", () => {
    const archived = { id: "old", startDate: "2026-06-20", shifts: [], daysOff: [] }; // covers up to 2026-07-24
    const active = { id: "p1", startDate: "2026-07-19", shifts: [], daysOff: [] }; // covers 2026-07-19 to 2026-08-22
    // periods array is chronological (oldest first) - a naive .find() would
    // hit `archived` first for 2026-07-20, which both ranges cover.
    expect(periodForDate([archived, active], "2026-07-20", "p1").id).toBe("p1");
  });
});

// Reproduces the reported bug: a shift is logged for a date, a Self Cert day
// off is then also logged for that same date (App.jsx's saveShift/saveDayOff
// deliberately allow both records to coexist, with just a warning), then the
// shift is deleted from Period. The remaining Self Cert should surface on
// dayInfo (what the Home carousel calls) instead of "unlogged".
describe("dayInfo after a same-date shift is deleted out from under a day off", () => {
  it("falls through to the day off once the conflicting shift is gone", () => {
    const withBoth = {
      ...PERIOD,
      shifts: [...PERIOD.shifts, { id: "s4", date: "2026-07-25", roster: "SZ1/04" }],
      daysOff: [...PERIOD.daysOff, { id: "d4", date: "2026-07-25", type: "Self Cert" }],
    };
    // Sanity: with both present, shift wins (matches LogScreen's own conflict warning).
    expect(dayInfo(withBoth, "2026-07-25")).toMatchObject({ status: "shift" });

    // deleteShift(sid) in App.jsx only ever filters p.shifts — daysOff is untouched.
    const afterShiftDeleted = { ...withBoth, shifts: withBoth.shifts.filter(s => s.id !== "s4") };
    expect(dayInfo(afterShiftDeleted, "2026-07-25")).toMatchObject({ status: "dayoff", dayOff: { type: "Self Cert" } });
  });
});

describe("greetingDutyContext", () => {
  it("returns the roster when a real shift is logged", () => {
    expect(greetingDutyContext(PERIOD, "2026-07-20")).toBe("you're on SZ1/01 today");
  });
  it("returns the rest-day phrasing for a Rest Day", () => {
    expect(greetingDutyContext(PERIOD, "2026-07-22")).toBe("enjoy your rest day");
  });
  it("returns the day-off type for a non-rest-day day-off", () => {
    expect(greetingDutyContext(PERIOD, "2026-07-24")).toBe("you're on Annual Leave today");
  });
  it("returns natural phrasing for a Sick Day", () => {
    const sickPeriod = { ...PERIOD, daysOff: [{ id: "d3", date: "2026-07-24", type: "Sick Day" }] };
    expect(greetingDutyContext(sickPeriod, "2026-07-24")).toBe("you're off sick today");
  });
  it("returns natural phrasing for a Force Majeure day", () => {
    const fmPeriod = { ...PERIOD, daysOff: [{ id: "d3", date: "2026-07-24", type: "Force Majeure" }] };
    expect(greetingDutyContext(fmPeriod, "2026-07-24")).toBe("you're on Force Majeure leave today");
  });
  it("returns natural phrasing for a Self Cert day", () => {
    const scPeriod = { ...PERIOD, daysOff: [{ id: "d3", date: "2026-07-24", type: "Self Cert" }] };
    expect(greetingDutyContext(scPeriod, "2026-07-24")).toBe("you're on a self-certified sick day today");
  });
  it("returns the unlogged phrasing when nothing is logged", () => {
    expect(greetingDutyContext(PERIOD, "2026-07-25")).toBe("nothing logged for today yet");
  });
  it("returns the unlogged phrasing for a date outside the period", () => {
    expect(greetingDutyContext(PERIOD, "2026-09-01")).toBe("nothing logged for today yet");
  });
});

describe("computeShiftStreak", () => {
  it("counts consecutive shifts backward from yesterday, skipping over day-offs", () => {
    // today=2026-07-25 (unlogged) -> streak looks at 24 (Annual Leave, skip),
    // 23 (shift, +1), 22 (Rest Day, skip), 21 (shift, +1), 20 (shift, +1), 19 (virtual Rest Day, skip), 18 (outside period, unlogged -> stop)
    expect(computeShiftStreak([PERIOD], "p1", "2026-07-25")).toBe(3);
  });
  it("today's own status never affects the count", () => {
    // Same today date (2026-07-25, unlogged) in both cases - the only difference
    // is whether today itself also has a shift. The walk starts at yesterday and
    // never inspects today, so both must produce the same count (3).
    const withTodayLogged = {
      ...PERIOD,
      shifts: [...PERIOD.shifts, { id: "s4", date: "2026-07-25", roster: "SZ1/04" }],
    };
    expect(computeShiftStreak([PERIOD], "p1", "2026-07-25")).toBe(computeShiftStreak([withTodayLogged], "p1", "2026-07-25"));
  });
  it("stops at the first unlogged day and returns 0 if yesterday itself is unlogged", () => {
    expect(computeShiftStreak([PERIOD], "p1", "2026-07-21")).toBe(1); // yesterday=20 (shift,+1), 19 (virtual Rest Day, skip), 18 (outside period, unlogged -> stop)
    expect(computeShiftStreak([PERIOD], "p1", "2026-07-20")).toBe(0); // yesterday=19 (virtual Rest Day, skip), 18 (outside period, unlogged -> stop)
  });
  it("returns 0 when periods is empty or the date is far outside any period", () => {
    expect(computeShiftStreak([], "p1", "2026-07-25")).toBe(0);
    expect(computeShiftStreak([PERIOD], "p1", "2099-01-01")).toBe(0);
  });
  it("resolves the walk across a period boundary into an earlier, non-active period", () => {
    // Earlier period ends the day right before PERIOD (the active period)
    // begins - a real shift is logged on its very last day. periodForDate
    // must be re-resolved per-iteration for the walk to ever see it, since
    // activePeriodId stays "p1" (PERIOD) throughout.
    const earlierPeriod = {
      id: "p0",
      startDate: "2026-06-14",
      shifts: [{ id: "e1", date: "2026-07-18", roster: "SZ1/99" }],
      daysOff: [],
    };
    // today=2026-07-19 (PERIOD's own start date, unlogged) -> walk starts at
    // yesterday=2026-07-18, which falls outside PERIOD's range and must
    // resolve into earlierPeriod to find the shift.
    expect(computeShiftStreak([earlierPeriod, PERIOD], "p1", "2026-07-19")).toBe(1);
  });
  it("caps the walk at 60 iterations and returns 0 rather than looping forever", () => {
    // Two contiguous periods spanning 70+ days. Days 1-60 walking backward from
    // todayDate are all logged as day-offs (Rest Days, skipped through). Day 61
    // has a real shift buried beyond the cap. With the 60-iteration cap in place,
    // the walk exits before ever reaching day 61, so the shift is never seen and
    // count stays 0. Without the cap, the loop would continue past iteration 60,
    // find the shift at day 61, increment count to at least 1 — proving the cap
    // is load-bearing, not an artifact of the data running out naturally.
    const startA = "2026-05-01";
    const periodA = { id: "capA", startDate: startA, shifts: [], daysOff: [] };
    const startB = addDays(startA, 35);
    const periodB = { id: "capB", startDate: startB, shifts: [], daysOff: [] };
    const todayDate = addDays(startB, 30);

    // Days 1-60: all logged as day-offs (skipped through, don't break streak)
    for (let i = 1; i <= 60; i++) {
      const d = addDays(todayDate, -i);
      const off = { id: `off-${i}`, date: d, type: "Rest Day" };
      if (d >= periodB.startDate) periodB.daysOff.push(off);
      else periodA.daysOff.push(off);
    }

    // Day 61: a real shift (beyond the 60-iteration cap)
    const shiftDate = addDays(todayDate, -61);
    const shift = { id: "buried-shift-61", date: shiftDate, roster: "BURIED/61" };
    if (shiftDate >= periodB.startDate) periodB.shifts.push(shift);
    else periodA.shifts.push(shift);

    expect(computeShiftStreak([periodA, periodB], "capB", todayDate)).toBe(0);
  });
});
