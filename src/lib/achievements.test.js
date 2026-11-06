import { describe, it, expect } from "vitest";
import { buildContext, earnedKeys, reconcile, coverageCounts, bestStreak, badgeRows, describeKey, earnedToday, earnedTodaySummary, popupFor, dismissAll, BADGES } from "./achievements.js";
import { applyUsage } from "./usage.js";
import { routesWorked, ROUTES } from "./achievements.js";
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
    expect(coverageCounts([period("2026-08-02", fill("2026-08-02", 35))], TODAY)).toMatchObject({ weeks: 5, months: 0, periods: 1 });
  });
  it("one gap breaks that week and the period", () => {
    const shifts = fill("2026-08-02", 35).filter((s) => s.date !== "2026-08-10");
    expect(coverageCounts([period("2026-08-02", shifts)], TODAY)).toMatchObject({ weeks: 4, months: 0, periods: 0 });
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

describe("reconcile + single badge card", () => {
  it("first run: one card with the newest badge, the rest counted, kept until closed", () => {
    const r = reconcile(undefined, ["duties:1", "duties:10", "first_sick"], TODAY);
    expect(r.state.earned["duties:1"]).toEqual({ at: TODAY, retro: true });
    expect(r.state.welcomed).toBe(true);
    const card = popupFor(r.state);
    expect(card.extra).toBe(2);
    expect(card.firstRun).toBe(true);
    expect(["duties:10", "first_sick"]).toContain(card.key);
    // a reload re-reads the same state: card still there
    expect(popupFor(reconcile(r.state, ["duties:1", "duties:10", "first_sick"], TODAY).state)).toEqual(card);
    // closing it clears everything, banner included
    const closed = dismissAll(r.state);
    expect(popupFor(closed)).toBeNull();
    expect(earnedTodaySummary(closed.earned, TODAY)).toEqual({ keys: [], retroCount: 0 });
  });
  it("shows the higher level, not the first, when both are new", () => {
    const r = reconcile(undefined, ["duties:1", "duties:10"], TODAY);
    expect(popupFor(r.state).key).toBe("duties:10");
  });
  it("first run with nothing earned shows nothing but still welcomes", () => {
    const r = reconcile(undefined, [], TODAY);
    expect(popupFor(r.state)).toBeNull();
    expect(r.state.welcomed).toBe(true);
  });
  it("afterwards, a new badge gets the card and the Home banner until closed", () => {
    const first = dismissAll(reconcile(undefined, ["duties:1"], "2026-11-01").state);
    const r = reconcile(first, ["duties:1", "night_owl"], TODAY);
    expect(popupFor(r.state)).toEqual({ key: "night_owl", extra: 0, firstRun: false });
    expect(earnedToday(r.state.earned, TODAY)).toEqual(["night_owl"]);
    const closed = dismissAll(r.state);
    expect(popupFor(closed)).toBeNull();
    expect(earnedToday(closed.earned, TODAY)).toEqual([]);
    expect(closed.earned.night_owl.at).toBe(TODAY);
  });
  it("older dismissed badges never come back as a card", () => {
    const first = dismissAll(reconcile(undefined, ["duties:1", "first_sick"], "2026-11-01").state);
    expect(popupFor(reconcile(first, ["duties:1", "first_sick", "night_owl"], TODAY).state).extra).toBe(0);
  });
  it("state from the earlier version (summary already closed) shows no card", () => {
    const old = { welcomed: true, earned: { "duties:1": { at: TODAY, retro: true }, first_sick: { at: TODAY, retro: true } } };
    expect(popupFor(old)).toBeNull();
  });
  it("never revokes a badge that's no longer computed", () => {
    const first = reconcile(undefined, ["duties:1"], "2026-11-01").state;
    expect(reconcile(first, [], TODAY).state.earned["duties:1"]).toBeTruthy();
  });
  it("more than 5 at once is still one card", () => {
    const first = dismissAll(reconcile(undefined, [], "2026-11-01").state);
    const r = reconcile(first, ["duties:1", "first_sick", "night_owl", "early_bird", "first_ot", "faq"], TODAY);
    expect(popupFor(r.state).extra).toBe(5);
  });
});

describe("new badges", () => {
  it("first duty in each zone (Route 33 = Skerries)", () => {
    const k = keysFor({ periods: one([sh("2026-08-03", { zone: "Skerries" }), sh("2026-08-04", { zone: "150" })]) });
    expect(k).toEqual(expect.arrayContaining(["zone_33", "zone_150"]));
    expect(k).not.toContain("zone_1");
  });
  it("winter week: 5 AL + 2 rest days in a row; summer: 10 AL + 4 rest days", () => {
    const al = (start, n) => Array.from({ length: n }, (_, i) => off(addDays(start, i), "Annual Leave"));
    const rd = (...ds) => ds.map((d) => off(d, "Rest Day"));
    // Mon 3 - Fri 7 Aug AL, Sat 8 + Sun 9 rest => 7 in a row
    const winter = [...al("2026-08-03", 5), ...rd("2026-08-08", "2026-08-09")];
    const p = (dOff) => [{ id: "p", startDate: "2026-08-02", shifts: [], daysOff: dOff, removedFixedRestDates: Array.from({ length: 35 }, (_, i) => addDays("2026-08-02", i)) }];
    const kw = keysFor({ periods: p(winter) });
    expect(kw).toContain("winter_week:2026");
    expect(kw).not.toContain("summer_weeks:2026");
    // break the run with a shift in the middle
    expect(keysFor({ periods: [{ ...p(winter)[0], shifts: [sh("2026-08-05")], daysOff: winter.filter((d) => d.date !== "2026-08-05") }] })).not.toContain("winter_week:2026");
    const summer = [...al("2026-08-03", 5), ...rd("2026-08-08", "2026-08-09"), ...al("2026-08-10", 5), ...rd("2026-08-15", "2026-08-16")];
    const ks = keysFor({ periods: p(summer) });
    expect(ks).toContain("summer_weeks:2026");
    expect(ks).not.toContain("winter_week:2026");
  });
  it("winter week needs 7 in a row: 5 AL alone, or 5 AL + rest days elsewhere, don't count", () => {
    const al = (start, count) => Array.from({ length: count }, (_, i) => off(addDays(start, i), "Annual Leave"));
    const noAuto = { removedFixedRestDates: Array.from({ length: 35 }, (_, i) => addDays("2026-08-02", i)) };
    const p = (dOff, shifts = []) => [{ id: "p", startDate: "2026-08-02", shifts, daysOff: dOff, ...noAuto }];
    expect(keysFor({ periods: p(al("2026-08-03", 5), [sh("2026-08-08")]) })).not.toContain("winter_week:2026");
    expect(keysFor({ periods: p([...al("2026-08-03", 5), off("2026-08-15", "Rest Day"), off("2026-08-16", "Rest Day")]) })).not.toContain("winter_week:2026");
  });
  it("your five ignores annual leave that's part of a winter week", () => {
    const noAuto = { removedFixedRestDates: Array.from({ length: 35 }, (_, i) => addDays("2026-08-02", i)) };
    const winter = [...Array.from({ length: 5 }, (_, i) => off(addDays("2026-08-03", i), "Annual Leave")), off("2026-08-08", "Rest Day"), off("2026-08-09", "Rest Day")];
    const loose4 = ["2026-08-18", "2026-08-25", "2026-09-01", "2026-09-03"].map((d) => off(d, "Annual Leave"));
    const k = keysFor({ periods: [{ id: "p", startDate: "2026-08-02", shifts: [], daysOff: [...winter, ...loose4], ...noAuto }] });
    expect(k).toContain("winter_week:2026");
    expect(k).not.toContain("your_five:2026");
  });
  it("your five: 5 annual leave days outside the winter/summer blocks", () => {
    const loose = ["2026-08-04", "2026-08-11", "2026-08-18", "2026-08-25", "2026-09-01"].map((d) => off(d, "Annual Leave"));
    const p = [{ id: "p", startDate: "2026-08-02", shifts: [], daysOff: loose, removedFixedRestDates: Array.from({ length: 35 }, (_, i) => addDays("2026-08-02", i)) }];
    expect(keysFor({ periods: p })).toContain("your_five:2026");
    expect(keysFor({ periods: [{ ...p[0], daysOff: loose.slice(1) }] })).not.toContain("your_five:2026");
  });
  it("welcome, tour, replay, FAQ and feedback", () => {
    const k = keysFor({ periods: one(), usage: { toursCompleted: 1, tourReplays: 1, faqViews: 2, feedbackSent: 1 } });
    expect(k).toEqual(expect.arrayContaining(["welcome", "tour_done", "tour_replay", "faq", "feedback"]));
    expect(keysFor({ periods: [] })).not.toContain("welcome");
  });
  it("longer streak levels", () => {
    const days = Array.from({ length: 14 }, (_, i) => addDays("2026-10-24", i));
    const k = keysFor({ periods: [], usage: { openDays: days } });
    expect(k).toEqual(expect.arrayContaining(["regular:3", "regular:7", "regular:14"]));
    expect(k).not.toContain("regular:30");
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

describe("Sick Note and the Michael badges", () => {
  const noAuto = (start) => ({ removedFixedRestDates: Array.from({ length: 35 }, (_, i) => addDays(start, i)) });
  const sickRun = (start, n) => Array.from({ length: n }, (_, i) => off(addDays(start, i), "Sick Day"));
  it("Sick Note: 5 sick + 2 rest days in a row counts; 4 sick + 3 rest, or a broken run, doesn't", () => {
    const P = (dOff) => [{ id: "p", startDate: "2026-08-02", shifts: [], daysOff: dOff, ...noAuto("2026-08-02") }];
    const week = [...sickRun("2026-08-03", 5), off("2026-08-08", "Rest Day"), off("2026-08-09", "Rest Day")];
    expect(keysFor({ periods: P(week) })).toContain("sick_note");
    const fourSick = [...sickRun("2026-08-03", 4), off("2026-08-07", "Rest Day"), off("2026-08-08", "Rest Day"), off("2026-08-09", "Rest Day")];
    expect(keysFor({ periods: P(fourSick) })).not.toContain("sick_note");
    expect(keysFor({ periods: P(week.filter((d) => d.date !== "2026-08-05")) })).not.toContain("sick_note");
  });
  it("swap badges count different duty days: 3 / 5 in one Sun-Sat week, 10 in one period", () => {
    const period = [{ id: "p", startDate: "2026-08-02", shifts: [], daysOff: [] }];
    const wk = (n, start = "2026-08-03") => Array.from({ length: n }, (_, i) => addDays(start, i));
    expect(keysFor({ periods: period, usage: { sharedDates: wk(2) } })).not.toContain("taking_the_michael");
    const k3 = keysFor({ periods: period, usage: { sharedDates: wk(3) } });
    expect(k3).toContain("taking_the_michael");
    expect(k3).not.toContain("taking_the_psss");
    // 3 on Fri/Sat + 2 on Sun/Mon straddle two weeks: not 5 in one week
    expect(keysFor({ periods: period, usage: { sharedDates: wk(5, "2026-08-06") } })).not.toContain("taking_the_psss");
    expect(keysFor({ periods: period, usage: { sharedDates: wk(5) } })).toContain("taking_the_psss");
    const ten = [...wk(5), ...wk(5, "2026-08-10")];
    expect(keysFor({ periods: period, usage: { sharedDates: ten } })).toContain("legendary_michael");
    expect(keysFor({ periods: period, usage: { sharedDates: ten.slice(1) } })).not.toContain("legendary_michael");
  });
  it("Sick Note needs the 7 days together, not 5 sick one week and rest days another", () => {
    const P = [{ id: "p", startDate: "2026-08-02", shifts: [], daysOff: [...sickRun("2026-08-03", 5), off("2026-08-15", "Rest Day"), off("2026-08-16", "Rest Day")], ...noAuto("2026-08-02") }];
    expect(keysFor({ periods: P })).not.toContain("sick_note");
  });
  it("the Legendary Michael Award needs 10 inside ONE period", () => {
    const two = [{ id: "a", startDate: "2026-08-02", shifts: [], daysOff: [] }, { id: "b", startDate: "2026-09-06", shifts: [], daysOff: [] }];
    const dates = [...Array.from({ length: 5 }, (_, i) => addDays("2026-08-03", i)), ...Array.from({ length: 5 }, (_, i) => addDays("2026-09-07", i))];
    expect(keysFor({ periods: two, usage: { sharedDates: dates } })).not.toContain("legendary_michael");
  });
  it("sharing the same duty day twice only counts once", () => {
    let u = {};
    u = applyUsage(u, "share", "2026-08-03"); u = applyUsage(u, "share", "2026-08-03"); u = applyUsage(u, "share", "2026-08-04");
    expect(u.sharedDates).toEqual(["2026-08-03", "2026-08-04"]);
  });
});

describe("route badges and calendar blocks", () => {
  it("routes come from the duty's real running board (SZ1/15X weekday: 15A + 41)", () => {
    const r = routesWorked([{ date: "2026-11-06", zone: "Zone 1", roster: "SZ1/15X" }]);
    expect([...r].sort()).toEqual(["15A", "41"]);
    expect(routesWorked([{ date: "2026-11-06", zone: null, roster: "Standard Spare", fixedType: "stdSpare" }]).size).toBe(0);
  });
  it("route badges and Route Master progress", () => {
    const k = keysFor({ periods: one([sh("2026-08-04", { roster: "SZ1/15X" })]) });
    expect(k).toEqual(expect.arrayContaining(["route_15A", "route_41"]));
    expect(k).not.toContain("route_122");
    expect(k).not.toContain("route_master");
    expect(ROUTES).toHaveLength(11);
  });
  it("Full Quarter / Half Year / Three Quarters / Full Year use calendar blocks", () => {
    const base = { periods: [], usage: {}, zones: [], today: TODAY, leaveSettings: { annualTotal: 20 } };
    const withMonths = (months) => {
      const ctx = buildContext(base);
      ctx.coverage = { ...ctx.coverage, monthSet: months };
      return earnedKeys(ctx);
    };
    const m = (ys, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${ys}-${String(from + i).padStart(2, "0")}`);
    expect(withMonths(m(2026, 4, 6))).toContain("full_quarter:2026");
    expect(withMonths(m(2026, 5, 7))).not.toContain("full_quarter:2026"); // May-Jul isn't a calendar quarter
    const h = withMonths(m(2026, 1, 9));
    expect(h).toEqual(expect.arrayContaining(["half_year:2026", "three_quarters:2026"]));
    expect(h).not.toContain("full_year:2026");
    expect(withMonths(m(2026, 1, 12))).toContain("full_year:2026");
  });
});
