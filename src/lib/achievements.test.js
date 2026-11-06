import { describe, it, expect } from "vitest";
import { buildContext, earnedKeys, reconcile, coverageCounts, bestStreak, badgeRows, describeKey, earnedToday, BADGES } from "./achievements.js";
import { applyUsage } from "./usage.js";
import { addDays } from "./dutyMath.js";

const TODAY = "2026-11-06";
let n = 0;
const sh = (date, over = {}) => ({ id: `s${n++}`, date, zone: "Zone 1", roster: "SZ1/01", reportTime: "07:00", signOffTime: "15:00", overtimeHours: 0, isRestDay: false, ...over });
const off = (date, type) => ({ id: `d${n++}`, date, type });
const period = (startDate, shifts = [], daysOff = []) => ({ id: "p" + startDate, startDate, shifts, daysOff, removedFixedRestDates: [] });
const keysFor = (opts) => earnedKeys(buildContext({ today: TODAY, zones: ["Zone 1", "Zone 2"], leaveSettings: { annualTotal: 20 }, ...opts }));
const one = (shifts = [], daysOff = []) => [period("2026-08-02", shifts, daysOff)];

describe("duty badges", () => {
  it("levels unlock at 1 and 10 duties, not 50", () => {
    const shifts = Array.from({ length: 10 }, (_, i) => sh(addDays("2026-08-03", i)));
    const k = keysFor({ periods: one(shifts) });
    expect(k).toEqual(expect.arrayContaining(["duties:1", "duties:10"]));
    expect(k).not.toContain("duties:50");
  });
  it("night owl: 21:00 counts, 20:59 does not, past-midnight counts", () => {
    expect(keysFor({ periods: one([sh("2026-08-03", { signOffTime: "21:00" })]) })).toContain("night_owl");
    expect(keysFor({ periods: one([sh("2026-08-03", { signOffTime: "20:59" })]) })).not.toContain("night_owl");
    expect(keysFor({ periods: one([sh("2026-08-03", { reportTime: "16:00", signOffTime: "00:40" })]) })).toContain("night_owl");
  });
  it("early bird is strictly before 05:30", () => {
    expect(keysFor({ periods: one([sh("2026-08-03", { reportTime: "05:29" })]) })).toContain("early_bird");
    expect(keysFor({ periods: one([sh("2026-08-03", { reportTime: "05:30" })]) })).not.toContain("early_bird");
  });
  it("overtime, rest day, Sunday, all zones", () => {
    const k = keysFor({ periods: one([sh("2026-08-02"), sh("2026-08-04", { overtimeHours: 1, isRestDay: true, zone: "Zone 2" })]) });
    expect(k).toEqual(expect.arrayContaining(["first_ot", "rest_day_grafter", "sunday_service", "all_zones"]));
    expect(keysFor({ periods: one([sh("2026-08-04")]) })).not.toContain("all_zones");
    expect(keysFor({ periods: one([sh("2026-08-04")]) })).not.toContain("sunday_service");
  });
});

describe("leave badges", () => {
  const sick = (y, count) => Array.from({ length: count }, (_, i) => off(`${y}-02-${String(i + 1).padStart(2, "0")}`, "Sick Day"));
  it("full five and ACP are per calendar year", () => {
    const k = keysFor({ periods: one([], [...sick(2025, 5), ...sick(2026, 13)]) });
    expect(k).toEqual(expect.arrayContaining(["first_sick", "full_five:2025", "full_five:2026", "acp:2026"]));
    expect(k).not.toContain("acp:2025");
    expect(keysFor({ periods: one([], sick(2026, 4)) })).not.toContain("full_five:2026");
  });
  it("self certs split by half-year", () => {
    const k = keysFor({ periods: one([], [off("2026-02-01", "Self Cert"), off("2026-06-30", "Self Cert"), off("2026-07-01", "Self Cert")]) });
    expect(k).toEqual(expect.arrayContaining(["first_self_cert", "sc_h1_first:2026", "sc_h1_both:2026", "sc_h2_first:2026"]));
    expect(k).not.toContain("sc_h2_both:2026");
    expect(k).not.toContain("sc_full_house:2026");
  });
  it("full house is all four in one year", () => {
    const sc = ["2026-01-05", "2026-03-05", "2026-08-05", "2026-11-01"].map((d) => off(d, "Self Cert"));
    expect(keysFor({ periods: one([], sc) })).toEqual(expect.arrayContaining(["sc_full_house:2026", "sc_h2_both:2026"]));
  });
  it("maxed out needs 3 force majeure inside 365 days", () => {
    const fm = (d) => off(d, "Force Majeure");
    expect(keysFor({ periods: one([], [fm("2025-01-01"), fm("2025-06-01"), fm("2025-12-31")]) })).toContain("maxed_out");
    expect(keysFor({ periods: one([], [fm("2025-01-01"), fm("2025-06-01"), fm("2026-01-01")]) })).not.toContain("maxed_out");
  });
  it("spent up counts bank holiday in lieu at 1.25 days each", () => {
    const al = Array.from({ length: 21 }, (_, i) => off(addDays("2026-03-01", i), "Annual Leave"));
    expect(keysFor({ periods: one([], al) })).toContain("spent_up:2026");
    expect(keysFor({ periods: one([], [...al, off("2026-05-04", "Bank Holiday In Lieu")]) })).not.toContain("spent_up:2026");
  });
  it("the joker needs the whole set in one year", () => {
    const d = (count, type, m) => Array.from({ length: count }, (_, i) => off(`2026-${m}-${String(i + 1).padStart(2, "0")}`, type));
    const set = [...d(20, "Annual Leave", "03"), ...d(5, "Sick Day", "04"), ...d(2, "Self Cert", "05"), ...d(2, "Self Cert", "09"), ...d(3, "Force Majeure", "10")];
    expect(keysFor({ periods: one([], set) })).toContain("joker:2026");
    expect(keysFor({ periods: one([], set.slice(0, -1)) })).not.toContain("joker:2026");
  });
  it("full record needs all five loggable types", () => {
    const types = ["Annual Leave", "Rest Day", "Sick Day", "Force Majeure", "Self Cert"];
    expect(keysFor({ periods: one([], types.map((t, i) => off(`2026-0${i + 1}-10`, t))) })).toContain("full_record");
    expect(keysFor({ periods: one([], types.slice(1).map((t, i) => off(`2026-0${i + 1}-10`, t))) })).not.toContain("full_record");
  });
});

describe("covered days", () => {
  const fill = (start, count) => Array.from({ length: count }, (_, i) => sh(addDays(start, i)));
  it("a fully logged past period gives 1 period and 5 weeks", () => {
    expect(coverageCounts([period("2026-08-02", fill("2026-08-02", 35))], TODAY)).toEqual({ weeks: 5, months: 0, periods: 1 });
  });
  it("one gap breaks that week and the period", () => {
    const shifts = fill("2026-08-02", 35).filter((s) => s.date !== "2026-08-10");
    expect(coverageCounts([period("2026-08-02", shifts)], TODAY)).toEqual({ weeks: 4, months: 0, periods: 0 });
  });
  it("a calendar month across two periods counts", () => {
    const ps = [period("2026-07-26", fill("2026-07-26", 35)), period("2026-08-30", fill("2026-08-30", 35))];
    expect(coverageCounts(ps, TODAY).months).toBe(2); // August and September 2026
  });
  it("days from today on are never counted", () => {
    expect(coverageCounts([period("2026-11-01", fill("2026-11-01", 35))], TODAY).weeks).toBe(0);
  });
});

describe("app usage", () => {
  it("streak and counters", () => {
    expect(bestStreak(["2026-11-01", "2026-11-02", "2026-11-04", "2026-11-05", "2026-11-06"])).toBe(3);
    let u = {};
    u = applyUsage(u, "lookup"); u = applyUsage(u, "tab", "home"); u = applyUsage(u, "tab", "home");
    expect(u.lookups).toBe(1);
    expect(u.tabs).toEqual(["home"]);
    const k = keysFor({ periods: [], usage: { ...u, tabs: ["home", "log", "lookup", "period", "leave"], openDays: ["2026-11-04", "2026-11-05", "2026-11-06"], shares: 1 } });
    expect(k).toEqual(expect.arrayContaining(["duty_detective:1", "explorer", "regular:3", "swap_shop"]));
    expect(k).not.toContain("regular:7");
    expect(k).not.toContain("heads_up");
  });
});

describe("reconcile", () => {
  it("first run stores everything as retro with one summary", () => {
    const r = reconcile(undefined, ["duties:1", "first_sick"], TODAY);
    expect(r.popups).toEqual([]);
    expect(r.summary).toEqual({ count: 2, firstRun: true });
    expect(r.state.earned["duties:1"]).toEqual({ at: TODAY, retro: true });
    expect(r.state.welcomed).toBe(true);
  });
  it("first run with nothing earned shows nothing but still welcomes", () => {
    const r = reconcile(undefined, [], TODAY);
    expect(r.summary).toBeNull();
    expect(r.state.welcomed).toBe(true);
  });
  it("afterwards, a new badge pops up on its own and is kept", () => {
    const first = reconcile(undefined, ["duties:1"], "2026-11-01").state;
    const r = reconcile(first, ["duties:1", "night_owl"], TODAY);
    expect(r.popups).toEqual(["night_owl"]);
    expect(r.summary).toBeNull();
    expect(earnedToday(r.state.earned, TODAY)).toEqual(["night_owl"]);
  });
  it("never revokes a badge that's no longer computed", () => {
    const first = reconcile(undefined, ["duties:1"], "2026-11-01").state;
    expect(reconcile(first, [], TODAY).state.earned["duties:1"]).toBeTruthy();
  });
  it("more than 5 at once becomes one summary, not a flood", () => {
    const first = reconcile(undefined, [], "2026-11-01").state;
    const r = reconcile(first, ["a", "b", "c", "d", "e", "f"], TODAY);
    expect(r.popups).toEqual([]);
    expect(r.summary).toEqual({ count: 6, firstRun: false });
    expect(earnedToday(r.state.earned, TODAY)).toEqual([]);
  });
});

describe("display", () => {
  it("every badge describes and renders a row", () => {
    const ctx = buildContext({ periods: [], usage: {}, zones: ["Zone 1"], today: TODAY, leaveSettings: { annualTotal: 20 } });
    const rows = badgeRows(ctx, { "duties:1": { at: TODAY }, "full_five:2025": { at: TODAY }, "full_five:2026": { at: TODAY } });
    expect(rows).toHaveLength(BADGES.length);
    const duties = rows.find((r) => r.badge.id === "duties");
    expect(duties.name).toBe("First Duty");
    expect(duties.progress).toEqual({ value: 0, target: 10 });
    expect(rows.find((r) => r.badge.id === "full_five").count).toBe(2);
    expect(rows.find((r) => r.badge.id === "joker").hidden).toBe(true);
    expect(describeKey("duties:50").name).toBe("50 Duties");
    expect(describeKey("acp:2026").year).toBe("2026");
  });
});
