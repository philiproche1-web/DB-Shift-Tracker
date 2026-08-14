// Parity between the two rest-day implementations.
//
// src/lib/roster.js holds the client's copy (rest pattern + custom-rest
// override live in module-level state, set once per signed-in driver).
// src/lib/pushDuty.js holds a deliberately independent port for the
// send-reminders Edge Function, which processes many drivers in one pass and
// so must take its config as arguments instead. That split is intentional —
// see pushDuty.js's own header — but it means the same rules are written
// twice, and pushDuty.js carries its own hardcoded copy of
// FIXED_REST_PATTERN annotated "Mirrors roster.js's FIXED_REST_PATTERN
// exactly".
//
// Nothing enforced that claim until this file. If the two ever drift, the
// server decides a driver is resting while the app says they're working (or
// the reverse), which surfaces only as push reminders that fire on rest days
// or go missing on working days — silent, and very hard to trace back.
//
// These tests fail loudly on any divergence.
import { describe, it, expect, beforeEach } from "vitest";
import * as roster from "./roster.js";
import * as push from "./pushDuty.js";
import * as dutyMath from "./dutyMath.js";

// A Sunday, matching the app's rule that periods start on a calendar Sunday.
const START = "2026-07-19";
const ALL_35_DAYS = Array.from({ length: 35 }, (_, i) => push.addDays(START, i));

// roster.js reads its custom-rest override from module state; pushDuty.js
// takes it as an argument. These build the same config in both shapes so the
// two can be compared on equal terms.
function applyClientConfig({ enabled = false, weekdays = [], since = null } = {}) {
  roster.setCustomRestConfig({
    custom_rest_days_enabled: enabled,
    custom_rest_weekdays: weekdays,
    custom_rest_days_since: since,
  });
}
function serverConfig({ enabled = false, weekdays = [], since = null } = {}) {
  return { enabled, weekdays: new Set(weekdays), since };
}

// Every meaningful shape of the custom-rest feature, since that is the newest
// and least-exercised branch on both sides.
const CONFIGS = [
  { name: "standard pattern (custom rest off)", cfg: {} },
  { name: "custom rest, no since date", cfg: { enabled: true, weekdays: [2, 4] } },
  { name: "custom rest, since mid-period", cfg: { enabled: true, weekdays: [1], since: "2026-08-05" } },
  { name: "custom rest, since before period", cfg: { enabled: true, weekdays: [0, 6], since: "2026-01-01" } },
  { name: "custom rest, since after period", cfg: { enabled: true, weekdays: [3], since: "2027-01-01" } },
  { name: "custom rest enabled but no weekdays picked", cfg: { enabled: true, weekdays: [] } },
];

beforeEach(() => {
  applyClientConfig(); // reset module state between tests
});

describe("roster.js and pushDuty.js agree on rest days", () => {
  it("uses an identical 5-week rest pattern on both sides", () => {
    // pushDuty's FIXED_REST_PATTERN is module-private, so compare it through
    // the behaviour it drives: with custom rest off, both must generate the
    // same rest dates from the same period start.
    applyClientConfig();
    const client = [...roster.fixedRestDates(START)].sort();
    const server = [...push.fixedRestDates(serverConfig(), START)].sort();
    expect(server).toEqual(client);
    expect(client).toHaveLength(10); // 5 weeks x 2 rest days
  });

  it.each(CONFIGS)("fixedRestDates matches: $name", ({ cfg }) => {
    applyClientConfig(cfg);
    const client = [...roster.fixedRestDates(START)].sort();
    const server = [...push.fixedRestDates(serverConfig(cfg), START)].sort();
    expect(server).toEqual(client);
  });

  it.each(CONFIGS)("dayInfo status matches on all 35 days: $name", ({ cfg }) => {
    applyClientConfig(cfg);
    const period = {
      id: "p1",
      startDate: START,
      shifts: [
        { id: "s1", date: push.addDays(START, 2), zone: "Zone 1", roster: "SZ1/01" },
        { id: "s2", date: push.addDays(START, 9), zone: "Zone 1", roster: "SZ1/02" },
      ],
      daysOff: [{ id: "d1", date: push.addDays(START, 4), type: "Annual Leave" }],
      removedFixedRestDates: [],
    };

    const clientStatuses = ALL_35_DAYS.map((d) => roster.dayInfo(period, d).status);
    const serverStatuses = ALL_35_DAYS.map((d) => push.dayInfo(period, d, serverConfig(cfg)).status);
    expect(serverStatuses).toEqual(clientStatuses);
  });

  it("agrees when a driver has removed an automatic rest day", () => {
    applyClientConfig();
    const restDate = roster.fixedRestDates(START)[0];
    const period = {
      id: "p1", startDate: START, shifts: [], daysOff: [],
      removedFixedRestDates: [restDate],
    };
    expect(push.dayInfo(period, restDate, serverConfig()).status)
      .toBe(roster.dayInfo(period, restDate).status);
    // And specifically: a removed automatic rest day is no longer a day off.
    expect(roster.dayInfo(period, restDate).status).toBe("unlogged");
  });

  it("agrees that a real entry overrides the automatic rest day on that date", () => {
    applyClientConfig();
    const restDate = roster.fixedRestDates(START)[0];
    const period = {
      id: "p1", startDate: START,
      shifts: [{ id: "s1", date: restDate, zone: "Zone 1", roster: "SZ1/01" }],
      daysOff: [], removedFixedRestDates: [],
    };
    expect(push.dayInfo(period, restDate, serverConfig()).status)
      .toBe(roster.dayInfo(period, restDate).status);
    expect(roster.dayInfo(period, restDate).status).toBe("shift");
  });
});

describe("roster.js and pushDuty.js agree on period resolution", () => {
  const periods = [
    { id: "old", startDate: "2026-06-14", shifts: [], daysOff: [] },
    { id: "active", startDate: START, shifts: [], daysOff: [] },
  ];

  it("resolves the same period for every day of the active period", () => {
    ALL_35_DAYS.forEach((d) => {
      expect(push.periodForDate(periods, d, "active")?.id)
        .toBe(roster.periodForDate(periods, d, "active")?.id);
    });
  });

  it("resolves the same period for a date in an older period", () => {
    const d = "2026-06-20";
    expect(push.periodForDate(periods, d, "active")?.id)
      .toBe(roster.periodForDate(periods, d, "active")?.id);
  });

  it("both return null for a date in no period", () => {
    const d = "2025-01-01";
    expect(push.periodForDate(periods, d, "active")).toBeNull();
    expect(roster.periodForDate(periods, d, "active")).toBeNull();
  });

  it("agrees on addDays and inPeriod across the period boundary", () => {
    // Compare against dutyMath directly — roster.js doesn't re-export addDays,
    // it imports it from there, so dutyMath is the client-side source of truth.
    expect(push.addDays(START, 34)).toBe(dutyMath.addDays(START, 34));
    expect(push.addDays(START, -1)).toBe(dutyMath.addDays(START, -1));
    const period = { startDate: START };
    expect(push.inPeriod(push.addDays(START, 34), period)).toBe(dutyMath.inPeriod(push.addDays(START, 34), period));
    expect(push.inPeriod(push.addDays(START, 35), period)).toBe(dutyMath.inPeriod(push.addDays(START, 35), period));
    expect(push.inPeriod(push.addDays(START, 34), period)).toBe(true);
    expect(push.inPeriod(push.addDays(START, 35), period)).toBe(false);
  });
});
