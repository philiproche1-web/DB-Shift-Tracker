import { describe, it, expect } from "vitest";
import { today, addDays, inPeriod, periodForDate, fixedRestDates, dayInfo, shiftBreakEnd } from "./pushDuty.js";

describe("today", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("addDays / inPeriod", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-08-30", 3)).toBe("2026-09-02");
  });
  it("inPeriod covers exactly a 35-day span", () => {
    const p = { startDate: "2026-07-19" };
    expect(inPeriod("2026-07-19", p)).toBe(true);
    expect(inPeriod("2026-08-22", p)).toBe(true);
    expect(inPeriod("2026-08-23", p)).toBe(false);
  });
});

describe("periodForDate", () => {
  it("picks the active period first when ranges overlap (matches roster.js behavior)", () => {
    const archived = { id: "old", startDate: "2026-06-20" };
    const active = { id: "p1", startDate: "2026-07-19" };
    expect(periodForDate([archived, active], "2026-07-20", "p1").id).toBe("p1");
  });
});

describe("fixedRestDates", () => {
  const NO_CUSTOM = { enabled: false, weekdays: new Set(), since: null };
  it("returns the standard 5-week pattern when custom rest is off", () => {
    const dates = fixedRestDates(NO_CUSTOM, "2026-07-19");
    // Week 1 pattern is [0,1] (Sunday, Monday) per FIXED_REST_PATTERN
    expect(dates).toContain(addDays("2026-07-19", 0)); // Sunday of week 1
    expect(dates).toContain(addDays("2026-07-19", 1)); // Monday of week 1
  });
  it("switches to custom weekdays only on/after `since`", () => {
    const custom = { enabled: true, weekdays: new Set([3]), since: "2026-07-26" }; // Wednesday
    const dates = fixedRestDates(custom, "2026-07-19");
    // Before `since`, standard pattern still applies for week 1
    expect(dates).toContain(addDays("2026-07-19", 0));
    // On/after `since`, every Wednesday shows up
    expect(dates).toContain("2026-07-29"); // a Wednesday on/after since
  });
  it("respects a custom restPattern parameter when provided", () => {
    // Custom pattern: Tuesday (2) and Wednesday (3) every week
    const customPattern = [[2, 3], [2, 3], [2, 3], [2, 3], [2, 3]];
    const defaultDates = fixedRestDates(NO_CUSTOM, "2026-07-19");
    const customDates = fixedRestDates(NO_CUSTOM, "2026-07-19", customPattern);
    // The two sets should be different (default has Sun/Mon in week 1, custom has Tue/Wed)
    expect(customDates).not.toEqual(defaultDates);
    // Verify the custom pattern includes Tuesday (2) of week 1: 2026-07-19 + 2 days = 2026-07-21
    expect(customDates).toContain("2026-07-21"); // Tuesday of week 1
    expect(customDates).toContain("2026-07-22"); // Wednesday of week 1
    // Verify default pattern doesn't have these
    expect(defaultDates).not.toContain("2026-07-21");
    expect(defaultDates).not.toContain("2026-07-22");
  });
});

describe("dayInfo", () => {
  const restConfig = { enabled: false, weekdays: new Set(), since: null };
  it("returns unlogged when nothing's logged and it's not an auto rest day", () => {
    const period = { id: "p1", startDate: "2026-07-19", shifts: [], daysOff: [] };
    // 2026-07-20 (Monday) is not in the week-1 [Sun,Mon] rest pattern... wait it is (Mon).
    // Use a Tuesday instead, which week 1's pattern doesn't cover.
    expect(dayInfo(period, "2026-07-21", restConfig).status).toBe("unlogged");
  });
  it("returns shift when a shift is logged for the date", () => {
    const period = { id: "p1", startDate: "2026-07-19", shifts: [{ id: "s1", date: "2026-07-21", zone: "Zone 1", dayType: "weekday", roster: "SZ1/01" }], daysOff: [] };
    expect(dayInfo(period, "2026-07-21", restConfig).status).toBe("shift");
  });
  it("returns dayoff on an auto-generated fixed rest day, even with nothing explicitly logged", () => {
    const period = { id: "p1", startDate: "2026-07-19", shifts: [], daysOff: [] };
    // Sunday of week 1 (day 0) is in the standard FIXED_REST_PATTERN.
    expect(dayInfo(period, "2026-07-19", restConfig).status).toBe("dayoff");
  });
});

describe("shiftBreakEnd", () => {
  const duties = [{ z: "Zone 1", t: "weekday", r: "SZ1/01", be: "07:15" }];
  it("computes the break-end Date from the matching duty", () => {
    const shift = { date: "2026-07-21", zone: "Zone 1", dayType: "weekday", roster: "SZ1/01" };
    const be = shiftBreakEnd(shift, duties);
    // Asserted as an absolute instant, not getHours()/getMinutes() — those
    // read back in the *runtime's* timezone and so pass everywhere, which is
    // exactly why the Dublin-wall-clock-vs-UTC bug went unnoticed. 07:15
    // Dublin on 2026-07-21 (IST, UTC+1) is 06:15 UTC.
    expect(be.getTime()).toBe(new Date("2026-07-21T06:15:00.000Z").getTime());
  });
  it("returns null when the shift is a spare or has no break", () => {
    expect(shiftBreakEnd({ date: "2026-07-21", isSpare: true }, duties)).toBeNull();
    expect(shiftBreakEnd({ date: "2026-07-21", zone: "Zone 1", dayType: "weekday", roster: "NOPE" }, duties)).toBeNull();
  });
});

describe("dublinWallClockToUTC / shiftBreakEnd timezone correctness", () => {
  it("converts a summer (IST, UTC+1) Dublin wall-clock time to the correct UTC instant", () => {
    const duties = [{ z: "Zone 1", t: "weekday", r: "SZ1/01", be: "13:00" }];
    const shift = { date: "2026-07-21", zone: "Zone 1", dayType: "weekday", roster: "SZ1/01" };
    const result = shiftBreakEnd(shift, duties);
    expect(result.getTime()).toBe(new Date("2026-07-21T12:00:00.000Z").getTime());
  });
  it("converts a winter (GMT, UTC+0) Dublin wall-clock time to the correct UTC instant", () => {
    const duties = [{ z: "Zone 1", t: "weekday", r: "SZ1/01", be: "13:00" }];
    const shift = { date: "2026-01-21", zone: "Zone 1", dayType: "weekday", roster: "SZ1/01" };
    const result = shiftBreakEnd(shift, duties);
    expect(result.getTime()).toBe(new Date("2026-01-21T13:00:00.000Z").getTime());
  });
});
