import { describe, it, expect, afterEach } from "vitest";
import { vi } from "vitest";
import { greetingDutyContext, computeShiftStreak, dayInfo, periodForDate, weekHighlights, getSeq, DUTIES, setCustomRestConfig, rollPeriodsForward } from "./roster.js";
import { addDays, isBankHoliday } from "./dutyMath.js";

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

// A clean period (no logged shifts/days off) for exercising the custom
// rest-day generator in isolation, without PERIOD's own fixture data
// colliding with the dates under test.
const CUSTOM_PERIOD = { id: "cp1", startDate: "2026-07-19", shifts: [], daysOff: [] };

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

// Per-driver override for the global 5-week pattern (see
// docs/superpowers/specs/2026-08-13-custom-rest-days-design.md). Period
// starts 2026-07-19 (Sunday). Standard FIXED_REST_PATTERN week 1 is
// [Sunday, Monday] -> 2026-07-19 and 2026-07-20; week 2 is [Thursday,
// Sunday] with week-2 starting 2026-07-26 -> 2026-07-26 and 2026-07-30.
describe("custom rest-day config (per-driver weekly override)", () => {
  afterEach(() => { setCustomRestConfig(null); }); // reset to disabled so later tests aren't affected

  it("keeps the standard pattern before `since`, and replaces it with the weekly custom weekday from `since` onward", () => {
    setCustomRestConfig({ custom_rest_days_enabled: true, custom_rest_weekdays: [2], custom_rest_days_since: "2026-07-24" }); // Tuesday, from 2026-07-24
    // Before `since`: standard week-1 pattern days are preserved unchanged.
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-19")).toMatchObject({ status: "dayoff", dayOff: { type: "Rest Day" } });
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-20")).toMatchObject({ status: "dayoff", dayOff: { type: "Rest Day" } });
    // On/after `since`: the standard pattern's week-2 Sunday (2026-07-26) no
    // longer applies — replaced, not additive.
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-26")).toMatchObject({ status: "unlogged" });
    // Instead, every Tuesday on/after `since` is a rest day.
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-28")).toMatchObject({ status: "dayoff", dayOff: { type: "Rest Day" } });
  });

  it("skips generating a custom rest day where a real shift is already logged (a swap)", () => {
    setCustomRestConfig({ custom_rest_days_enabled: true, custom_rest_weekdays: [2], custom_rest_days_since: "2026-07-19" });
    const swapped = { ...CUSTOM_PERIOD, shifts: [{ id: "sw1", date: "2026-07-21", roster: "SZ1/09" }] }; // a Tuesday
    expect(dayInfo(swapped, "2026-07-21")).toMatchObject({ status: "shift" });
  });

  it("leaves the standard 5-week pattern unchanged when the config is disabled", () => {
    setCustomRestConfig({ custom_rest_days_enabled: false, custom_rest_weekdays: [2], custom_rest_days_since: "2026-07-19" });
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-19")).toMatchObject({ status: "dayoff", dayOff: { type: "Rest Day" } });
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-21")).toMatchObject({ status: "unlogged" }); // Tuesday isn't a pattern day, and custom is off
  });

  it("a custom rest day on a bank holiday still resolves as a day off, not a forced Sunday duty", () => {
    expect(isBankHoliday("2026-08-03")).toBe(true); // sanity: August bank holiday, a Monday
    setCustomRestConfig({ custom_rest_days_enabled: true, custom_rest_weekdays: [1], custom_rest_days_since: "2026-07-19" }); // Monday
    expect(dayInfo(CUSTOM_PERIOD, "2026-08-03")).toMatchObject({ status: "dayoff", dayOff: { type: "Rest Day" } });
  });

  it("does not regenerate a custom rest day the driver explicitly removed", () => {
    setCustomRestConfig({ custom_rest_days_enabled: true, custom_rest_weekdays: [2], custom_rest_days_since: "2026-07-19" }); // Tuesday
    const withRemoval = { ...CUSTOM_PERIOD, removedFixedRestDates: ["2026-07-21"] }; // a Tuesday
    expect(dayInfo(withRemoval, "2026-07-21")).toMatchObject({ status: "unlogged" });
  });

  it("skips a custom rest day on/after `since` where a real shift is already logged", () => {
    setCustomRestConfig({ custom_rest_days_enabled: true, custom_rest_weekdays: [2], custom_rest_days_since: "2026-07-24" }); // Tuesday, from 2026-07-24
    const swapped = { ...CUSTOM_PERIOD, shifts: [{ id: "sw2", date: "2026-07-28", roster: "SZ1/10" }] }; // a Tuesday on/after `since`
    expect(dayInfo(swapped, "2026-07-28")).toMatchObject({ status: "shift" });
  });

  it("generates rest days for every selected weekday when multiple are chosen", () => {
    setCustomRestConfig({ custom_rest_days_enabled: true, custom_rest_weekdays: [1, 4], custom_rest_days_since: "2026-07-19" }); // Monday + Thursday
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-20")).toMatchObject({ status: "dayoff", dayOff: { type: "Rest Day" } }); // Monday
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-23")).toMatchObject({ status: "dayoff", dayOff: { type: "Rest Day" } }); // Thursday
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-21")).toMatchObject({ status: "unlogged" }); // Tuesday, not selected
  });

  it("applies the custom weekday across the whole period when `since` is null", () => {
    setCustomRestConfig({ custom_rest_days_enabled: true, custom_rest_weekdays: [2], custom_rest_days_since: null }); // Tuesday, no cutoff
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-21")).toMatchObject({ status: "dayoff", dayOff: { type: "Rest Day" } }); // Tuesday, week 1
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-19")).toMatchObject({ status: "unlogged" }); // Sunday — was a standard-pattern day, but since is null so custom applies from the start, replacing it
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

describe("weekHighlights", () => {
  const base = { id: "wh1", startDate: "2026-07-19", shifts: [], daysOff: [] };

  it("names an exact Saturday+Sunday rest pattern a short weekend", () => {
    // Week of 2026-07-19 (Sun) to 2026-07-25 (Sat): FIXED_REST_PATTERN week 1 is
    // [Sunday, Monday] by default in roster.js, so override via removedFixedRestDates
    // to isolate a real Saturday. Week 2's own default pattern [Thursday, Sunday]
    // supplies the forward half (2026-07-26 Sunday) that the new cross-week check
    // looks for - this is the "week 1 -> week 2" case of the general pattern verified
    // separately for week 3 -> week 4 below.
    const p = {
      ...base,
      removedFixedRestDates: ["2026-07-19", "2026-07-20"], // remove the auto Sun+Mon
      daysOff: [{ id: "r1", date: "2026-07-25", type: "Rest Day" }], // Saturday, real
    };
    expect(weekHighlights([p], "wh1", "2026-07-19")).toEqual(["Short weekend"]);
  });

  it("names an exact Saturday+Sunday+Monday rest pattern a long weekend", () => {
    // Week 2's own pattern only supplies the Sunday (2026-07-26), not the Monday, so
    // the Monday (2026-07-27) is added as a real override to complete a genuine
    // forward-looking Sat+Sun+Mon run (the cross-week check only looks at weekEnd+1
    // and weekEnd+2, i.e. forward from this week's Saturday - see the design doc's
    // "accepted asymmetry" note).
    const p = {
      ...base,
      removedFixedRestDates: ["2026-07-19", "2026-07-20"], // remove the auto Sun+Mon
      daysOff: [
        { id: "r1", date: "2026-07-25", type: "Rest Day" }, // Saturday, real
        { id: "r2", date: "2026-07-27", type: "Rest Day" }, // Monday of week 2, real
      ],
    };
    expect(weekHighlights([p], "wh1", "2026-07-19")).toEqual(["Long weekend"]);
  });

  it("lists non-weekend rest-day combinations plainly, in date order", () => {
    const p = {
      ...base,
      // remove the auto Sun+Mon this week, and week 2's auto Sunday too so the
      // Saturday below doesn't accidentally extend into a genuine cross-week weekend
      removedFixedRestDates: ["2026-07-19", "2026-07-20", "2026-07-26"],
      daysOff: [
        { id: "r1", date: "2026-07-25", type: "Rest Day" }, // Saturday
        { id: "r2", date: "2026-07-21", type: "Rest Day" }, // Tuesday
      ],
    };
    expect(weekHighlights([p], "wh1", "2026-07-19")).toEqual(["Off Tuesday & Saturday"]);
  });

  it("announces a special day-off run that starts this week, in weeks when a multiple of 7", () => {
    const p = {
      ...base,
      daysOff: [
        ...Array.from({ length: 14 }, (_, i) => ({
          id: `al${i}`, date: addDays("2026-07-20", i), type: "Annual Leave",
        })),
      ],
    };
    // Run starts 2026-07-20 (Monday, within the 07-19..07-25 week), 14 days = 2 weeks.
    expect(weekHighlights([p], "wh1", "2026-07-19")).toContain("2 weeks Annual Leave starts this week");
  });

  it("uses singular '1 week' for an exact 7-day run (the week/day boundary)", () => {
    const p = {
      ...base,
      daysOff: Array.from({ length: 7 }, (_, i) => ({
        id: `s${i}`, date: addDays("2026-07-20", i), type: "Sick Day",
      })),
    };
    // 2026-07-20 through 2026-07-26 inclusive = exactly 7 days.
    expect(weekHighlights([p], "wh1", "2026-07-19")).toContain("1 week Sick Day starts this week");
  });

  it("uses day-count phrasing for an 8-day run (just over the week boundary, not a multiple of 7)", () => {
    const p = {
      ...base,
      daysOff: Array.from({ length: 8 }, (_, i) => ({
        id: `s${i}`, date: addDays("2026-07-20", i), type: "Sick Day",
      })),
    };
    expect(weekHighlights([p], "wh1", "2026-07-19")).toContain("8 days Sick Day starts this week");
  });

  it("uses day-count phrasing when the run isn't a whole number of weeks", () => {
    const p = {
      ...base,
      daysOff: [
        { id: "s1", date: "2026-07-22", type: "Sick Day" },
        { id: "s2", date: "2026-07-23", type: "Sick Day" },
        { id: "s3", date: "2026-07-24", type: "Sick Day" },
      ],
    };
    expect(weekHighlights([p], "wh1", "2026-07-19")).toContain("3 days Sick Day starts this week");
  });

  it("stays silent about a run that started before this week", () => {
    const p = {
      ...base,
      removedFixedRestDates: ["2026-07-19", "2026-07-20"],
      daysOff: [
        { id: "s1", date: "2026-07-17", type: "Sick Day" }, // starts the PRIOR week
        { id: "s2", date: "2026-07-18", type: "Sick Day" },
        { id: "s3", date: "2026-07-19", type: "Sick Day" }, // continues into this week
      ],
    };
    const result = weekHighlights([p], "wh1", "2026-07-19");
    expect(result.some(l => l.includes("Sick Day"))).toBe(false);
  });

  it("adds a CPC line alongside a rest-day line in the same week", () => {
    const p = {
      ...base,
      shifts: [{ id: "c1", date: "2026-07-23", roster: "CPC/Training", fixedType: "cpc" }], // Thursday
      // Week 1's default FIXED_REST_PATTERN [Sunday, Monday] applies unchanged.
    };
    expect(weekHighlights([p], "wh1", "2026-07-19")).toEqual(["Off Sunday & Monday", "CPC · Thursday"]);
  });

  it("detects a real Sat+Sun weekend straddling week 3 into week 4 (standard roster pattern, within one period)", () => {
    const p = { id: "wh1", startDate: "2026-07-19", shifts: [], daysOff: [] };
    // Week 3 = 2026-08-02..2026-08-08 (Sun-Sat). Standard FIXED_REST_PATTERN week 3
    // is [Tuesday, Saturday]: Tue=2026-08-04, Sat=2026-08-08. Week 4 starts
    // 2026-08-09 (Sunday), whose own pattern [Friday, Sunday] makes that Sunday
    // a rest day too - Sat 08-08 + Sun 08-09 are contiguous -> Short weekend,
    // attributed to week 3 (the week containing the Saturday).
    expect(weekHighlights([p], "wh1", "2026-08-02")).toEqual(["Short weekend", "Off Tuesday"]);
  });

  it("detects the long weekend at period-end (week 5) via the synthesized next period, when no real next period exists yet", () => {
    const p = { id: "wh1", startDate: "2026-07-19", shifts: [], daysOff: [] };
    // Week 5 = 2026-08-16..2026-08-22 (the period's last day). Standard pattern
    // week 5 is [Wednesday, Saturday]: Wed=2026-08-19, Sat=2026-08-22 (periodEnd).
    // No next period exists in `periods` -> synthesized via fixedRestDates on
    // 2026-08-23 (the day after this period ends), whose own week-1 pattern
    // [Sunday, Monday] gives Sun=08-23 + Mon=08-24 - both contiguous with
    // Sat 08-22 -> Long weekend.
    expect(weekHighlights([p], "wh1", "2026-08-16")).toEqual(["Long weekend", "Off Wednesday"]);
  });

  it("uses the real next period's own data when it already exists, not just the synthesized pattern", () => {
    const p = { id: "wh1", startDate: "2026-07-19", shifts: [], daysOff: [] };
    // removedFixedRestDates removes 2026-08-24 (the next period's own Monday)
    // from its real data - a synthesized fallback (which has no way to know
    // about this override) would still include it, wrongly upgrading this to
    // "Long weekend". Only reading the REAL next period's data gets this right.
    const nextP = { id: "wh2", startDate: "2026-08-23", shifts: [], daysOff: [], removedFixedRestDates: ["2026-08-24"] };
    expect(weekHighlights([p, nextP], "wh1", "2026-08-16")).toEqual(["Short weekend", "Off Wednesday"]);
  });

  it("reports the true total length of a leave block that spans a period boundary", () => {
    const p = {
      id: "wh1", startDate: "2026-07-19", shifts: [],
      daysOff: Array.from({ length: 7 }, (_, i) => ({ id: `al${i}`, date: addDays("2026-08-16", i), type: "Annual Leave" })),
    };
    const nextP = {
      id: "wh2", startDate: "2026-08-23", shifts: [],
      daysOff: Array.from({ length: 11 }, (_, i) => ({ id: `al2-${i}`, date: addDays("2026-08-23", i), type: "Annual Leave" })),
    };
    // 7 days in period 1 (week 5) + 11 days in period 2 = 18 days total,
    // starting 2026-08-16 (within period 1's week 5). Must report the true
    // 18, not just the 7 that sit in the active period.
    expect(weekHighlights([p, nextP], "wh1", "2026-08-16")).toContain("18 days Annual Leave starts this week");
  });

  it("stays silent about a run that started in an earlier PERIOD (not just an earlier date in the same period), now that all periods are scanned", () => {
    const earlierP = {
      id: "wh0", startDate: "2026-06-14", shifts: [],
      daysOff: [
        { id: "s1", date: "2026-07-17", type: "Sick Day" },
        { id: "s2", date: "2026-07-18", type: "Sick Day" },
      ],
    };
    const p = {
      id: "wh1", startDate: "2026-07-19", shifts: [],
      daysOff: [{ id: "s3", date: "2026-07-19", type: "Sick Day" }], // continues into this period's week 1
      removedFixedRestDates: ["2026-07-19", "2026-07-20"],
    };
    const result = weekHighlights([earlierP, p], "wh1", "2026-07-19");
    expect(result.some(l => l.includes("Sick Day"))).toBe(false);
  });
});

// Helper: look up a duty's own record from the bundled DUTIES fallback.
function findDuty(zone, dayType, roster) {
  const d = DUTIES.find(d => d.z === zone && d.t === dayType && d.r === roster);
  if (!d) throw new Error(`Fixture duty not found: ${zone}/${dayType}/${roster}`);
  return d;
}

// getSeq's "finish" entries key off `ft` (finish time) when present, falling
// back to `e` (end time) for duties like the Skerries ones where `ft` is null.
//
// The first entry has two real shapes in the bundled data, verified across
// all of DUTIES (not just the 25 in scope here): when a duty reports at the
// Garage (`rl === "Garage"`), the board has an explicit "Report" line at the
// duty's own report time (`s`). When a duty reports away from the Garage
// (e.g. Abbey St, Pearse St, Townsend St), there is no separate "Report"
// line at all - the board starts straight into the first route leg at the
// duty's own departure time (`dp`). Both branches still pin the assertion to
// a time that's unique to this duty's own fixture, so a wrong-duty board
// (the bug this file guards against) still fails either way.
function expectSeqMatchesDuty(seq, duty) {
  expect(seq.length).toBeGreaterThan(0);
  const first = seq[0];
  const last = seq[seq.length - 1];
  if (duty.rl === "Garage") {
    expect(first.startsWith(duty.s)).toBe(true);
    expect(first.toLowerCase()).toContain("report");
  } else {
    expect(first.startsWith(duty.dp)).toBe(true);
  }
  const finishTime = duty.ft || duty.e;
  expect(last.startsWith(finishTime)).toBe(true);
  expect(last.toLowerCase()).toContain("finish");
}

// Regression guard for the "wrong/missing running board" Critical finding:
// getSeq() branches on whether its 3rd arg looks purely numeric. d2 became a
// real numeric duty number for 80 Zone 1 Saturday duties (previously it just
// duplicated the roster label, which is non-numeric), which flips getSeq into
// the wrong branch when a caller passes d2/shift.duty instead of the roster
// label. The fix (DutyLookup.jsx, HomeScreen.jsx) is to always call
// getSeq(duty.z, duty.t, duty.r) — the roster label — never d2/shift.duty.
// These tests lock in that usage pattern directly against getSeq, independent
// of the two call sites, using real bundled duty data (via findDuty) rather
// than hardcoded guesses.
describe("getSeq resolves the correct board when called with the roster label", () => {
  it("SZ1/1X weekday — already worked before and after the data fix (no regression)", () => {
    const duty = findDuty("Zone 1", "weekday", "SZ1/1X");
    const seq = getSeq(duty.z, duty.t, duty.r);
    expectSeqMatchesDuty(seq, duty);
  });

  it("SZ1/1X Saturday — one of the 17 that broke; must resolve to Duty 68's board, not 71's", () => {
    const duty = findDuty("Zone 1", "saturday", "SZ1/1X");
    const seq = getSeq(duty.z, duty.t, duty.r);
    expectSeqMatchesDuty(seq, duty);
  });

  it("SZ1/17X Saturday — one of the 3 that resolved to nothing at all; must return a real, matching sequence", () => {
    const duty = findDuty("Zone 1", "saturday", "SZ1/17X");
    const seq = getSeq(duty.z, duty.t, duty.r);
    expectSeqMatchesDuty(seq, duty);
  });

  it("SZ1/1X Sunday — pre-existing bug (numeric d2 predates the recent feature); must resolve correctly too", () => {
    const duty = findDuty("Zone 1", "sunday", "SZ1/1X");
    const seq = getSeq(duty.z, duty.t, duty.r);
    expectSeqMatchesDuty(seq, duty);
  });

  it("SZ2/01 weekday — an ordinary non-X duty in a different zone still resolves correctly", () => {
    const duty = findDuty("Zone 2", "weekday", "SZ2/01");
    const seq = getSeq(duty.z, duty.t, duty.r);
    expectSeqMatchesDuty(seq, duty);
  });
});

// Trap tests for the pre-fix bug: these call getSeq with d2/shift.duty — the
// exact WRONG argument DutyLookup.jsx/HomeScreen.jsx used to pass — and prove
// it produces a DIFFERENT (or empty) result than the roster-label path above.
// There is no component-test harness in this repo, so these tests can't
// exercise the JSX call sites directly. What they document instead is the
// divergence itself: if a future change reverts either call site back to
// passing d2/shift.duty, the bug it reintroduces is not silent or
// hypothetical — it is exactly the wrong/empty output asserted here. Anyone
// touching those call sites and running this file sees, in black and white,
// what "wrong" looks like for the two duties from the original bug report.
describe("getSeq called with d2 (the pre-fix bug) diverges from the label path", () => {
  it("SZ1/1X Saturday — d2 resolves to a different, non-matching board than the label", () => {
    const duty = findDuty("Zone 1", "saturday", "SZ1/1X");
    const correctSeq = getSeq(duty.z, duty.t, duty.r);
    const wrongSeq = getSeq(duty.z, duty.t, duty.d2);
    expect(correctSeq.length).toBeGreaterThan(0);
    expect(wrongSeq).not.toEqual(correctSeq);
    // Not just a different array - it doesn't even start with this duty's
    // own report time, so it's genuinely the wrong board, not a coincidence.
    expect(wrongSeq[0]?.startsWith(duty.s)).toBe(false);
  });

  it("SZ1/17X Saturday — d2 resolves to nothing at all, while the label resolves correctly", () => {
    const duty = findDuty("Zone 1", "saturday", "SZ1/17X");
    const correctSeq = getSeq(duty.z, duty.t, duty.r);
    const wrongSeq = getSeq(duty.z, duty.t, duty.d2);
    expect(correctSeq.length).toBeGreaterThan(0);
    expect(wrongSeq).toEqual([]);
  });
});

// Gap-2 coverage: a table-driven sweep of every duty actually affected by the
// bug (25 total: 17 Zone 1 Saturday "X" duties + 8 Zone 1 Sunday "X" duties),
// derived programmatically from the bundled DUTIES fixture rather than
// hardcoded by hand. The count assertion below is deliberate: if the roster
// data ever changes which/how-many duties match this shape, the test fails
// loudly instead of silently sweeping a different (and unverified) set.
describe("getSeq label lookup sweeps every Zone 1 Saturday/Sunday X duty affected by the bug", () => {
  const saturdayX = DUTIES.filter(d => d.z === "Zone 1" && d.t === "saturday" && /X$/.test(d.r));
  const sundayX = DUTIES.filter(d => d.z === "Zone 1" && d.t === "sunday" && /X$/.test(d.r));
  const allAffected = [...saturdayX, ...sundayX];

  it("finds exactly 17 Saturday + 8 Sunday = 25 affected duties", () => {
    expect(saturdayX.length).toBe(17);
    expect(sundayX.length).toBe(8);
    expect(allAffected.length).toBe(25);
  });

  for (const duty of allAffected) {
    it(`${duty.t} ${duty.r} resolves to its own report/finish board via the label`, () => {
      const seq = getSeq(duty.z, duty.t, duty.r);
      expectSeqMatchesDuty(seq, duty);
    });
  }
});

describe("rollPeriodsForward (automatic period rollover)", () => {
  const ACTIVE = { id: "a1", startDate: "2026-07-19", shifts: [], daysOff: [] }; // ends 2026-08-22

  afterEach(() => { vi.useRealTimers(); });
  function setToday(dateStr) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(dateStr + "T12:00:00"));
  }

  it("no-ops when there is no active period", () => {
    const result = rollPeriodsForward([], null);
    expect(result).toEqual({ periods: [], activePeriodId: null, rolled: false });
  });

  it("no-ops when the active period has not ended yet", () => {
    setToday("2026-08-22"); // the period's last day
    const result = rollPeriodsForward([ACTIVE], "a1");
    expect(result.rolled).toBe(false);
    expect(result.periods).toEqual([ACTIVE]);
    expect(result.activePeriodId).toBe("a1");
  });

  it("archives the old period and starts the next one the day after it ends", () => {
    setToday("2026-08-23"); // one day past the period's end
    const result = rollPeriodsForward([ACTIVE], "a1");
    expect(result.rolled).toBe(true);
    expect(result.periods).toHaveLength(2);
    expect(result.periods[0]).toMatchObject({ id: "a1", archived: true });
    const next = result.periods[1];
    expect(next.startDate).toBe("2026-08-23");
    expect(next.id).toBe(result.activePeriodId);
    expect(next.shifts).toEqual([]);
    expect(next.daysOff).toEqual([]);
  });

  it("catches up across multiple skipped periods, staying grid-aligned, with no periods manufactured in between", () => {
    setToday("2026-10-15"); // several periods past 2026-07-19
    const result = rollPeriodsForward([ACTIVE], "a1");
    expect(result.rolled).toBe(true);
    expect(result.periods).toHaveLength(2); // still just the old (archived) + the new one — no intermediate periods
    const next = result.periods[1];
    // Grid-aligned 35-day steps from 2026-07-19: 07-19 -> 08-23 -> 09-27 (..10-31) -> 11-01.
    // 2026-10-15 falls inside the 09-27..10-31 block, so that's the one that becomes active.
    expect(next.startDate).toBe("2026-09-27");
  });
});
