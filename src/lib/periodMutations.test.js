// Integration tests for the save/delete paths that feed the compliance
// arithmetic. dutyMath is already well covered; what was untested is what
// gets handed TO it — and that is where the bugs that reached real drivers
// actually lived (duplicate Self Cert entries, a day off written into a stale
// archived period, an edit affordance deleting real shifts).
//
// Several tests below are regression locks on specific past incidents; those
// are called out individually.
import { describe, it, expect, beforeEach } from "vitest";
import {
  applyShiftSave, applyDayOffSave, applyShiftDelete,
  applyDayOffDelete, applyFixedRestDayRemoval,
} from "./periodMutations.js";
import { setCustomRestConfig } from "./roster.js";
import { addDays, wkStats, dayOffTally } from "./dutyMath.js";

const START = "2026-07-19";          // a Sunday
const OLD_START = "2026-06-14";      // the previous period, also a Sunday

const shift = (id, date, over = {}) => ({
  id, date, zone: "Zone 1", roster: "SZ1/01", duty: "101", fixedType: null,
  reportTime: "05:40", signOffTime: "13:55", workHours: 7.5, reliefHours: 0.5,
  isSpare: false, isRestDay: false, overtimeHours: 0, overtimeNote: "", notes: "",
  ...over,
});
const dayOff = (id, date, type = "Annual Leave") => ({ id, date, type });

function fixtures() {
  return [
    { id: "old", startDate: OLD_START, shifts: [], daysOff: [], removedFixedRestDates: [] },
    { id: "active", startDate: START, shifts: [], daysOff: [], removedFixedRestDates: [] },
  ];
}
const active = (ps) => ps.find(p => p.id === "active");
const old = (ps) => ps.find(p => p.id === "old");

beforeEach(() => setCustomRestConfig(null));

describe("applyShiftSave", () => {
  it("adds a new shift to the active period only", () => {
    const out = applyShiftSave(fixtures(), "active", shift("s1", addDays(START, 2)));
    expect(active(out).shifts).toHaveLength(1);
    expect(old(out).shifts).toHaveLength(0);
  });

  it("updates an existing shift in place rather than duplicating it", () => {
    let ps = applyShiftSave(fixtures(), "active", shift("s1", addDays(START, 2)));
    ps = applyShiftSave(ps, "active", shift("s1", addDays(START, 2), { workHours: 9 }));
    expect(active(ps).shifts).toHaveLength(1);
    expect(active(ps).shifts[0].workHours).toBe(9);
  });

  it("does not let a second shift claim a date another shift already owns", () => {
    // Guards the double-submit / second-device race.
    let ps = applyShiftSave(fixtures(), "active", shift("s1", addDays(START, 2)));
    ps = applyShiftSave(ps, "active", shift("s2", addDays(START, 2)));
    expect(active(ps).shifts).toHaveLength(1);
    expect(active(ps).shifts[0].id).toBe("s1");
  });

  it("saves a multi-day batch, skipping dates already taken", () => {
    let ps = applyShiftSave(fixtures(), "active", shift("s0", addDays(START, 3)));
    ps = applyShiftSave(ps, "active", [
      shift("s1", addDays(START, 2)),
      shift("s2", addDays(START, 3)), // already taken by s0
      shift("s3", addDays(START, 4)),
    ]);
    expect(active(ps).shifts.map(s => s.id).sort()).toEqual(["s0", "s1", "s3"]);
  });

  it("saves Bank Holiday In Lieu entries atomically with their shift", () => {
    const bhDate = addDays(START, 5);
    const ps = applyShiftSave(fixtures(), "active", shift("s1", bhDate),
      [{ id: "b1", date: bhDate, type: "Bank Holiday In Lieu" }]);
    expect(active(ps).shifts).toHaveLength(1);
    expect(active(ps).daysOff).toHaveLength(1);
    expect(active(ps).daysOff[0].type).toBe("Bank Holiday In Lieu");
  });

  it("does not duplicate a Bank Holiday In Lieu entry on re-save", () => {
    // Regression lock: duplicated in-lieu entries inflated the annual-leave
    // total, fixed in 053a132.
    const bhDate = addDays(START, 5);
    const bhil = [{ id: "b1", date: bhDate, type: "Bank Holiday In Lieu" }];
    let ps = applyShiftSave(fixtures(), "active", shift("s1", bhDate), bhil);
    ps = applyShiftSave(ps, "active", shift("s1", bhDate), [{ id: "b2", date: bhDate, type: "Bank Holiday In Lieu" }]);
    expect(active(ps).daysOff.filter(d => d.type === "Bank Holiday In Lieu")).toHaveLength(1);
  });

  it("drops a Bank Holiday In Lieu entry with no shift on that date", () => {
    // The in-lieu entry is only meaningful alongside a worked bank holiday.
    // An entry for a date with no shift at all must not be orphaned into the
    // period, where it would silently inflate the annual-leave total.
    const ps = applyShiftSave(fixtures(), "active", shift("s1", addDays(START, 2)),
      [{ id: "b1", date: addDays(START, 9), type: "Bank Holiday In Lieu" }]);
    expect(active(ps).daysOff.filter(d => d.type === "Bank Holiday In Lieu")).toHaveLength(0);
  });

  it("keeps the in-lieu entry when another shift already owns that date", () => {
    // Documents actual behaviour: the entry attaches to the DATE, so if the
    // incoming shift is skipped because an existing shift already covers that
    // bank holiday, the in-lieu choice still applies to the day worked.
    const bhDate = addDays(START, 5);
    let ps = applyShiftSave(fixtures(), "active", shift("existing", bhDate));
    ps = applyShiftSave(ps, "active", shift("s2", bhDate),
      [{ id: "b1", date: bhDate, type: "Bank Holiday In Lieu" }]);
    expect(active(ps).shifts).toHaveLength(1);
    expect(active(ps).shifts[0].id).toBe("existing");
    expect(active(ps).daysOff.filter(d => d.type === "Bank Holiday In Lieu")).toHaveLength(1);
  });

  it("does not mutate the input periods array", () => {
    const before = fixtures();
    const snapshot = JSON.stringify(before);
    applyShiftSave(before, "active", shift("s1", addDays(START, 2)));
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe("applyDayOffSave", () => {
  it("routes a day off to the period that actually contains its date", () => {
    // Regression lock: a plain periods.find() could resolve into a stale
    // archived period whose range overlapped, saving the entry somewhere it
    // was never visible or editable.
    const d = addDays(OLD_START, 3);
    const ps = applyDayOffSave(fixtures(), "active", dayOff("d1", d));
    expect(old(ps).daysOff).toHaveLength(1);
    expect(active(ps).daysOff).toHaveLength(0);
  });

  it("prefers the active period for a date both periods could claim", () => {
    const d = addDays(START, 1);
    const ps = applyDayOffSave(fixtures(), "active", dayOff("d1", d));
    expect(active(ps).daysOff).toHaveLength(1);
  });

  it("blocks a duplicate day off on a date already taken", () => {
    // Regression lock: duplicate Self Cert entries, root cause a missing
    // double-submit guard.
    let ps = applyDayOffSave(fixtures(), "active", dayOff("d1", addDays(START, 2), "Self Cert"));
    ps = applyDayOffSave(ps, "active", dayOff("d2", addDays(START, 2), "Self Cert"));
    expect(active(ps).daysOff).toHaveLength(1);
    expect(dayOffTally(active(ps).daysOff)["Self Cert"]).toBe(1);
  });

  it("blocks a duplicate even when the existing entry sits in another period", () => {
    const d = addDays(OLD_START, 3);
    let ps = applyDayOffSave(fixtures(), "active", dayOff("d1", d));
    // Same date, but this call would otherwise target a different period.
    ps = applyDayOffSave(ps, "active", dayOff("d2", d));
    const total = ps.reduce((n, p) => n + (p.daysOff || []).length, 0);
    expect(total).toBe(1);
  });

  it("edits an existing entry in its own period, not the active one", () => {
    const d = addDays(OLD_START, 3);
    let ps = applyDayOffSave(fixtures(), "active", dayOff("d1", d, "Annual Leave"));
    ps = applyDayOffSave(ps, "active", dayOff("d1", d, "Sick Day"));
    expect(old(ps).daysOff).toHaveLength(1);
    expect(old(ps).daysOff[0].type).toBe("Sick Day");
    expect(active(ps).daysOff).toHaveLength(0);
  });

  it("replaces a same-date shift when asked", () => {
    let ps = applyShiftSave(fixtures(), "active", shift("s1", addDays(START, 2)));
    ps = applyDayOffSave(ps, "active", dayOff("d1", addDays(START, 2)), ["s1"]);
    expect(active(ps).shifts).toHaveLength(0);
    expect(active(ps).daysOff).toHaveLength(1);
  });

  it("replaces an earlier day off on the same date when asked", () => {
    let ps = applyDayOffSave(fixtures(), "active", dayOff("d1", addDays(START, 2), "Annual Leave"));
    ps = applyDayOffSave(ps, "active", dayOff("d2", addDays(START, 2), "Sick Day"), null, ["d1"]);
    expect(active(ps).daysOff).toHaveLength(1);
    expect(active(ps).daysOff[0].type).toBe("Sick Day");
  });

  it("saves a multi-day leave block", () => {
    const ps = applyDayOffSave(fixtures(), "active", [
      dayOff("d1", addDays(START, 1)),
      dayOff("d2", addDays(START, 2)),
      dayOff("d3", addDays(START, 3)),
    ]);
    expect(active(ps).daysOff).toHaveLength(3);
    expect(dayOffTally(active(ps).daysOff)["Annual Leave"]).toBe(3);
  });
});

describe("deletion", () => {
  it("deletes a shift from the active period", () => {
    let ps = applyShiftSave(fixtures(), "active", shift("s1", addDays(START, 2)));
    ps = applyShiftDelete(ps, "active", "s1");
    expect(active(ps).shifts).toHaveLength(0);
  });

  it("deletes a day off from whichever period owns it", () => {
    const d = addDays(OLD_START, 3);
    let ps = applyDayOffSave(fixtures(), "active", dayOff("d1", d));
    ps = applyDayOffDelete(ps, "d1");
    expect(old(ps).daysOff).toHaveLength(0);
  });

  it("records a removed automatic rest day without touching real entries", () => {
    let ps = applyDayOffSave(fixtures(), "active", dayOff("d1", addDays(START, 2)));
    ps = applyFixedRestDayRemoval(ps, "active", addDays(START, 6));
    expect(active(ps).removedFixedRestDates).toEqual([addDays(START, 6)]);
    expect(active(ps).daysOff).toHaveLength(1);
  });
});

describe("what the compliance figures actually see", () => {
  it("counts only paid Work hours toward the weekly total, not spreadover", () => {
    const ps = applyShiftSave(fixtures(), "active", [
      shift("s1", addDays(START, 1), { workHours: 7.5 }),
      shift("s2", addDays(START, 2), { workHours: 8 }),
    ]);
    const w = wkStats(active(ps).shifts, active(ps).daysOff, START);
    expect(w.total).toBe(15.5);
  });

  it("routes rest-day working to overtime, keeping it out of the compliance total", () => {
    // Rest-day hours are overtime, not compliance hours — mixing these up was
    // the bank-holiday/Sunday-cap bug class.
    const ps = applyShiftSave(fixtures(), "active", [
      shift("s1", addDays(START, 1), { workHours: 7.5 }),
      shift("s2", addDays(START, 2), { workHours: 6, isRestDay: true }),
    ]);
    const w = wkStats(active(ps).shifts, active(ps).daysOff, START);
    expect(w.total).toBe(7.5);
    expect(w.overtime).toBe(6);
  });

  it("counts Sunday hours against the Sunday figure by real calendar Sunday", () => {
    const ps = applyShiftSave(fixtures(), "active", shift("s1", START, { workHours: 7.5 }));
    const w = wkStats(active(ps).shifts, active(ps).daysOff, START);
    expect(w.sunday).toBe(7.5);
  });

  it("a day off replacing a shift removes those hours from the total", () => {
    let ps = applyShiftSave(fixtures(), "active", shift("s1", addDays(START, 2), { workHours: 8 }));
    expect(wkStats(active(ps).shifts, active(ps).daysOff, START).total).toBe(8);
    ps = applyDayOffSave(ps, "active", dayOff("d1", addDays(START, 2), "Sick Day"), ["s1"]);
    expect(wkStats(active(ps).shifts, active(ps).daysOff, START).total).toBe(0);
  });

  it("a blocked duplicate does not inflate the leave tally", () => {
    let ps = applyDayOffSave(fixtures(), "active", dayOff("d1", addDays(START, 2), "Annual Leave"));
    ps = applyDayOffSave(ps, "active", dayOff("d2", addDays(START, 2), "Annual Leave"));
    const allDaysOff = ps.flatMap(p => p.daysOff || []);
    expect(dayOffTally(allDaysOff)["Annual Leave"]).toBe(1);
  });
});
