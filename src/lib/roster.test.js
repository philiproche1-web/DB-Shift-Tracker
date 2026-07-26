import { describe, it, expect } from "vitest";
import { greetingDutyContext, computeShiftStreak } from "./roster.js";

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
});
