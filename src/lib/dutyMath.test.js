import { describe, it, expect } from "vitest";
import {
  MAX_HOURS, MAX_SUNDAY, DAY_OFF_TYPES, LOGGABLE_DAY_OFF_TYPES, getDayType, isBankHoliday, addDays, fmtHrs, calcSpreadover,
  parseTimeToMins, addDuration, maxConsec, dayOffTally, inPeriod, wkStats, greetingTimeBand,
} from "./dutyMath.js";

describe("MAX_HOURS / MAX_SUNDAY", () => {
  it("is 190h 4m and 14h 30m", () => {
    expect(MAX_HOURS).toBeCloseTo(190 + 4 / 60, 5);
    expect(MAX_SUNDAY).toBe(14.5);
  });
});

describe("LOGGABLE_DAY_OFF_TYPES", () => {
  it("excludes Rest Day (auto-generated) but keeps it in DAY_OFF_TYPES for tallies", () => {
    expect(LOGGABLE_DAY_OFF_TYPES).not.toContain("Rest Day");
    expect(DAY_OFF_TYPES).toContain("Rest Day");
    expect(LOGGABLE_DAY_OFF_TYPES).toEqual(["Annual Leave", "Sick Day", "Force Majeure", "Self Cert"]);
  });
});

describe("getDayType", () => {
  it("classifies Sunday, Saturday, and weekdays", () => {
    expect(getDayType("2026-07-26")).toBe("sunday");
    expect(getDayType("2026-07-25")).toBe("saturday");
    expect(getDayType("2026-07-27")).toBe("weekday");
  });

  it("forces Sunday duties on a bank holiday regardless of actual weekday", () => {
    expect(getDayType("2026-03-17")).toBe("sunday"); // St. Patrick's Day, a Tuesday
    expect(getDayType("2026-08-03")).toBe("sunday"); // August bank holiday, a Monday
    expect(getDayType("2026-12-26")).toBe("sunday"); // St. Stephen's Day, a Saturday
  });
});

describe("isBankHoliday", () => {
  it("flags known IE bank holidays and rejects ordinary dates", () => {
    expect(isBankHoliday("2026-01-01")).toBe(true);
    expect(isBankHoliday("2026-04-06")).toBe(true); // Easter Monday
    expect(isBankHoliday("2026-07-27")).toBe(false);
  });
});

describe("addDays", () => {
  it("adds days and rolls over month/year boundaries", () => {
    expect(addDays("2026-07-30", 3)).toBe("2026-08-02");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
});

describe("fmtHrs", () => {
  it("formats whole and fractional hours", () => {
    expect(fmtHrs(0)).toBe("0h");
    expect(fmtHrs(5)).toBe("5h");
    expect(fmtHrs(5.5)).toBe("5h 30m");
  });
});

describe("calcSpreadover", () => {
  it("computes hours between report and sign-off", () => {
    expect(calcSpreadover("04:42", "10:02")).toBeCloseTo(5.33, 2);
  });
  it("handles a sign-off past midnight (>=24:00)", () => {
    expect(calcSpreadover("22:00", "25:30")).toBeCloseTo(3.5, 2);
  });
});

describe("parseTimeToMins", () => {
  it("converts HH:MM to minutes, and blank to 0", () => {
    expect(parseTimeToMins("01:30")).toBe(90);
    expect(parseTimeToMins("")).toBe(0);
  });
});

describe("addDuration", () => {
  it("adds a hour duration to a start time", () => {
    expect(addDuration("04:50", 5.33)).toBe("10:10");
  });
  it("rolls into next-day hours (>=24) rather than wrapping to 00", () => {
    expect(addDuration("22:00", 3)).toBe("25:00");
  });
});

describe("maxConsec", () => {
  it("finds the longest run of consecutive logged dates", () => {
    const shifts = [{date:"2026-07-20"},{date:"2026-07-21"},{date:"2026-07-22"},{date:"2026-07-24"}];
    expect(maxConsec(shifts)).toBe(3);
  });
  it("returns 0 for no shifts", () => {
    expect(maxConsec([])).toBe(0);
  });
});

describe("dayOffTally", () => {
  it("counts each day-off type, defaulting unused types to 0", () => {
    const tally = dayOffTally([{type:"Annual Leave"},{type:"Annual Leave"},{type:"Sick Day"}]);
    expect(tally["Annual Leave"]).toBe(2);
    expect(tally["Sick Day"]).toBe(1);
    expect(tally["Rest Day"]).toBe(0);
  });
});

describe("inPeriod", () => {
  it("is true for dates within the 5-week (35-day) period window", () => {
    const p = {startDate:"2026-07-05"};
    expect(inPeriod("2026-07-05", p)).toBe(true);
    expect(inPeriod("2026-08-08", p)).toBe(true); // startDate + 34
    expect(inPeriod("2026-08-09", p)).toBe(false);
  });
});

describe("wkStats", () => {
  it("sums Work hours (not spreadover) for compliance, excluding rest days", () => {
    const shifts = [
      {date:"2026-07-20", workHours:5.5, isRestDay:false},
      {date:"2026-07-21", workHours:6, isRestDay:false},
      {date:"2026-07-24", workHours:99, isRestDay:true}, // rest day, same week — must not count toward total
    ];
    const stats = wkStats(shifts, [], "2026-07-19");
    expect(stats.total).toBeCloseTo(11.5, 2);
  });

  it("sums only Sunday work hours separately", () => {
    const shifts = [
      {date:"2026-07-19", workHours:5, isRestDay:false}, // Sunday — start of this week
      {date:"2026-07-21", workHours:6, isRestDay:false}, // Tuesday, same week
    ];
    const stats = wkStats(shifts, [], "2026-07-19");
    expect(stats.sunday).toBeCloseTo(5, 2);
  });

  it("counts a rest day's own workHours as overtime, and a normal day's overtimeHours as overtime", () => {
    const shifts = [
      {date:"2026-07-19", workHours:4, isRestDay:true},
      {date:"2026-07-21", workHours:6, isRestDay:false, overtimeHours:1.5},
    ];
    const stats = wkStats(shifts, [], "2026-07-19");
    expect(stats.overtime).toBeCloseTo(5.5, 2);
  });

  it("excludes shifts and days off outside the week window", () => {
    const shifts = [{date:"2026-07-19", workHours:5, isRestDay:false}, {date:"2026-07-27", workHours:5, isRestDay:false}];
    const stats = wkStats(shifts, [], "2026-07-19");
    expect(stats.shifts).toHaveLength(1);
  });
});

describe("greetingTimeBand", () => {
  it("returns Good morning for 05:00-11:59", () => {
    expect(greetingTimeBand(new Date(2026, 6, 26, 5, 0))).toBe("Good morning");
    expect(greetingTimeBand(new Date(2026, 6, 26, 11, 59))).toBe("Good morning");
  });
  it("returns Good afternoon for 12:00-16:59", () => {
    expect(greetingTimeBand(new Date(2026, 6, 26, 12, 0))).toBe("Good afternoon");
    expect(greetingTimeBand(new Date(2026, 6, 26, 16, 59))).toBe("Good afternoon");
  });
  it("returns Good evening for 17:00-23:59 and 00:00-04:59 (wraps past midnight)", () => {
    expect(greetingTimeBand(new Date(2026, 6, 26, 17, 0))).toBe("Good evening");
    expect(greetingTimeBand(new Date(2026, 6, 26, 23, 59))).toBe("Good evening");
    expect(greetingTimeBand(new Date(2026, 6, 26, 0, 0))).toBe("Good evening");
    expect(greetingTimeBand(new Date(2026, 6, 26, 4, 59))).toBe("Good evening");
  });
});
