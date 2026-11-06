// Achievements / badges — pure rules. No React, no storage.
// Spec: docs/superpowers/specs/2026-11-06-achievements-design.md
//
// Three badge shapes:
//   levels  — one badge, several thresholds on a number ("10 Duties"); key `${id}:${level}`
//   flag    — earned once when test() is true; key `${id}`
//   yearly  — can be re-earned each calendar year; years() lists qualifying
//             years; key `${id}:${year}`; the page shows the count
import { addDays, getDayType } from "./dutyMath.js";
import { dayInfo } from "./roster.js";

export const CATEGORIES = [
  { id: "duties", label: "Duties" },
  { id: "leave", label: "Leave" },
  { id: "covered", label: "Covered days" },
  { id: "app", label: "Using the app" },
];

export const LEAVE_TYPES = ["Annual Leave", "Rest Day", "Sick Day", "Force Majeure", "Self Cert"];
const TRACKED_TABS = ["home", "log", "lookup", "period", "leave"];

const year = (iso) => iso.slice(0, 4);
const month = (iso) => parseInt(iso.slice(5, 7), 10);
const countBy = (items, keyFn) => items.reduce((m, x) => { const k = keyFn(x); m[k] = (m[k] || 0) + 1; return m; }, {});
const yearsWhere = (byYear, min) => Object.keys(byYear).filter((y) => byYear[y] >= min).sort();
const ofType = (c, type) => c.daysOff.filter((d) => d.type === type);

// ─── Covered-days maths ──────────────────────────────────────────────────
// A date is "covered" when dayInfo resolves it to a shift or a day off
// (auto fixed rest days included — they are real rest days). Only dates
// strictly before today count, so a week/month/period is judged once over.
function coveredDates(periods, today) {
  const set = new Set();
  for (const p of periods) {
    if (!p?.startDate) continue;
    for (let i = 0; i < 35; i++) {
      const d = addDays(p.startDate, i);
      if (d >= today) break;
      const info = dayInfo(p, d);
      if (info.status === "shift" || info.status === "dayoff") set.add(d);
    }
  }
  return set;
}

export function coverageCounts(periods, today) {
  const covered = coveredDates(periods, today);
  const allCovered = (start, n) => { for (let i = 0; i < n; i++) if (!covered.has(addDays(start, i))) return false; return true; };
  const weekStarts = new Set(), monthKeys = new Set();
  let fullPeriods = 0;
  for (const p of periods) {
    if (!p?.startDate) continue;
    if (addDays(p.startDate, 34) < today && allCovered(p.startDate, 35)) fullPeriods++;
    for (let w = 0; w < 5; w++) {
      const ws = addDays(p.startDate, w * 7);
      if (addDays(ws, 6) < today && allCovered(ws, 7)) weekStarts.add(ws);
    }
  }
  // Calendar months touched by any covered date, fully in the past.
  for (const d of covered) {
    const first = d.slice(0, 8) + "01";
    const y = +d.slice(0, 4), m = +d.slice(5, 7);
    const days = new Date(y, m, 0).getDate();
    if (addDays(first, days - 1) < today && allCovered(first, days)) monthKeys.add(first);
  }
  return { weeks: weekStarts.size, months: monthKeys.size, periods: fullPeriods };
}

// Best run of consecutive dates in a list of "YYYY-MM-DD".
export function bestStreak(dates) {
  const s = [...new Set(dates)].sort();
  let best = 0, run = 0, prev = null;
  for (const d of s) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

function maxInRolling365(dates) {
  const s = [...dates].sort();
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    const end = addDays(s[i], 364);
    let n = 0;
    for (let j = i; j < s.length && s[j] <= end; j++) n++;
    best = Math.max(best, n);
  }
  return best;
}

function spentUpYears(c) {
  const al = countBy(ofType(c, "Annual Leave"), (d) => year(d.date));
  const bhil = countBy(ofType(c, "Bank Holiday In Lieu"), (d) => year(d.date));
  const base = c.leaveSettings?.annualTotal ?? 20;
  return Object.keys(al).filter((y) => al[y] >= base + (bhil[y] || 0) * 1.25).sort();
}

const yearCount = (c, type) => countBy(ofType(c, type), (d) => year(d.date));
const halfCount = (c, type, half) => countBy(ofType(c, type).filter((d) => (half === 1 ? month(d.date) <= 6 : month(d.date) >= 7)), (d) => year(d.date));

// ─── Catalogue ───────────────────────────────────────────────────────────
// color = category tint; joke = pop-up line. Kept short for small screens.
export const BADGES = [
  // Duties
  { id: "duties", cat: "duties", emoji: "🚌", color: "#FFCD00", levels: [1, 10, 50, 100, 250],
    names: ["First Duty", "10 Duties", "50 Duties", "100 Duties", "250 Duties"],
    rule: (n) => `Log ${n} dut${n === 1 ? "y" : "ies"}`, joke: "Another one for the books.",
    value: (c) => c.shifts.length },
  { id: "first_ot", cat: "duties", emoji: "💶", color: "#FFCD00", name: "First Overtime", rule: "Log overtime on a duty", joke: "Cha-ching.",
    test: (c) => c.shifts.some((s) => (s.overtimeHours || 0) > 0) },
  { id: "rest_day_grafter", cat: "duties", emoji: "💪", color: "#FFCD00", name: "Rest Day Grafter", rule: "Work a rest day", joke: "Rest days are for other people.",
    test: (c) => c.shifts.some((s) => s.isRestDay) },
  { id: "sunday_service", cat: "duties", emoji: "⛪", color: "#FFCD00", name: "Sunday Service", rule: "Work a Sunday duty", joke: "The Lord's day. And yours.",
    test: (c) => c.shifts.some((s) => getDayType(s.date) === "sunday") },
  { id: "early_bird", cat: "duties", emoji: "🐦", color: "#FFCD00", name: "Early Bird", rule: "Report before 05:30", joke: "Up before the birds.",
    test: (c) => c.shifts.some((s) => s.reportTime && s.reportTime < "05:30") },
  { id: "night_owl", cat: "duties", emoji: "🦉", color: "#FFCD00", name: "Night Owl", rule: "Sign off at 21:00 or later", joke: "The depot cat salutes you.",
    test: (c) => c.shifts.some((s) => s.signOffTime && (s.signOffTime >= "21:00" || (s.reportTime && s.signOffTime < s.reportTime))) },
  { id: "all_zones", cat: "duties", emoji: "🗺️", color: "#FFCD00", name: "All Zones", rule: "Work a duty in every zone",
    joke: "Seen the lot.",
    value: (c) => c.zones.filter((z) => c.shifts.some((s) => s.zone === z)).length,
    target: (c) => c.zones.length,
    test: (c) => c.zones.length > 0 && c.zones.every((z) => c.shifts.some((s) => s.zone === z)) },

  // Leave
  { id: "first_rest_day", cat: "leave", emoji: "🛋️", color: "#00C896", name: "First Rest Day", rule: "Log a rest day", joke: "Feet up.",
    test: (c) => ofType(c, "Rest Day").length > 0 },
  { id: "holiday_mode", cat: "leave", emoji: "🏖️", color: "#00C896", name: "Holiday Mode", rule: "Log a day of annual leave", joke: "Out of office.",
    test: (c) => ofType(c, "Annual Leave").length > 0 },
  { id: "spent_up", cat: "leave", emoji: "🧳", color: "#00C896", name: "Spent Up", yearly: true, rule: "Use all your annual leave in a year",
    joke: "Not a day left on the table.", years: spentUpYears },
  { id: "first_sick", cat: "leave", emoji: "🤒", color: "#00C896", name: "First Sick Day", rule: "Log a sick day", joke: "Get well soon. Or don't, it's paid.",
    test: (c) => ofType(c, "Sick Day").length > 0 },
  { id: "full_five", cat: "leave", emoji: "🖐️", color: "#00C896", name: "Full Five", yearly: true, rule: "Use all 5 paid sick days in a year",
    joke: "Every paid one, accounted for.", years: (c) => yearsWhere(yearCount(c, "Sick Day"), 5) },
  { id: "acp", cat: "leave", emoji: "📋", color: "#FF4455", name: "Welcome to the Program", secret: true, yearly: true,
    rule: "13 sick days in a year", joke: "Your file has been… noticed.", years: (c) => yearsWhere(yearCount(c, "Sick Day"), 13) },
  { id: "first_self_cert", cat: "leave", emoji: "✍️", color: "#00C896", name: "First Self Cert", rule: "Log a self cert", joke: "Doctor's orders. Your own.",
    test: (c) => ofType(c, "Self Cert").length > 0 },
  { id: "sc_h1_first", cat: "leave", emoji: "🌱", color: "#00C896", name: "Self Cert: Jan–Jun", yearly: true, rule: "Use a self cert between January and June",
    joke: "First half, first cert.", years: (c) => yearsWhere(halfCount(c, "Self Cert", 1), 1) },
  { id: "sc_h1_both", cat: "leave", emoji: "🌿", color: "#00C896", name: "Both Certs: Jan–Jun", yearly: true, rule: "Use both self certs between January and June",
    joke: "First half: sorted.", years: (c) => yearsWhere(halfCount(c, "Self Cert", 1), 2) },
  { id: "sc_h2_first", cat: "leave", emoji: "🍂", color: "#00C896", name: "Self Cert: Jul–Dec", yearly: true, rule: "Use a self cert between July and December",
    joke: "Second half, first cert.", years: (c) => yearsWhere(halfCount(c, "Self Cert", 2), 1) },
  { id: "sc_h2_both", cat: "leave", emoji: "🍁", color: "#00C896", name: "Both Certs: Jul–Dec", yearly: true, rule: "Use both self certs between July and December",
    joke: "Second half: sorted.", years: (c) => yearsWhere(halfCount(c, "Self Cert", 2), 2) },
  { id: "sc_full_house", cat: "leave", emoji: "🏠", color: "#00C896", name: "Full House", yearly: true, rule: "Use all 4 self certs in a year",
    joke: "Four from four.", years: (c) => yearsWhere(yearCount(c, "Self Cert"), 4) },
  { id: "family_first", cat: "leave", emoji: "👨‍👩‍👧", color: "#00C896", name: "Family First", rule: "Log a force majeure day", joke: "Family comes first.",
    test: (c) => ofType(c, "Force Majeure").length > 0 },
  { id: "maxed_out", cat: "leave", emoji: "🚨", color: "#00C896", name: "Maxed Out", rule: "Use all 3 force majeure days in 12 months",
    joke: "That's the lot for now.",
    value: (c) => Math.min(3, maxInRolling365(ofType(c, "Force Majeure").map((d) => d.date))), target: () => 3,
    test: (c) => maxInRolling365(ofType(c, "Force Majeure").map((d) => d.date)) >= 3 },
  { id: "full_record", cat: "leave", emoji: "📚", color: "#00C896", name: "Full Record", rule: "Log every type of leave at least once",
    joke: "Collected the whole set.",
    value: (c) => LEAVE_TYPES.filter((t) => ofType(c, t).length > 0).length, target: () => LEAVE_TYPES.length,
    test: (c) => LEAVE_TYPES.every((t) => ofType(c, t).length > 0) },
  { id: "joker", cat: "leave", emoji: "🃏", color: "#C084FC", name: "The Joker", secret: true, yearly: true,
    rule: "In one year: all annual leave, 5 sick days, 4 self certs and 3 force majeure",
    joke: "Every last day. Legend.",
    years: (c) => {
      const spent = new Set(spentUpYears(c));
      const sick = yearCount(c, "Sick Day"), sc = yearCount(c, "Self Cert"), fm = yearCount(c, "Force Majeure");
      return [...spent].filter((y) => (sick[y] || 0) >= 5 && (sc[y] || 0) >= 4 && (fm[y] || 0) >= 3).sort();
    } },

  // Covered days
  { id: "full_week", cat: "covered", emoji: "📅", color: "#60a5fa", levels: [1, 4], names: ["Full Week", "4 Full Weeks"],
    rule: (n) => n === 1 ? "Every day of a week (Sun–Sat) logged" : `${n} weeks with every day logged`, joke: "Seven for seven.",
    value: (c) => c.coverage.weeks },
  { id: "full_month", cat: "covered", emoji: "🗓️", color: "#60a5fa", levels: [1], names: ["Full Month"],
    rule: () => "Every day of a calendar month logged", joke: "A whole month, no gaps.", value: (c) => c.coverage.months, showCount: true },
  { id: "full_period", cat: "covered", emoji: "🏁", color: "#60a5fa", levels: [1, 3], names: ["Full Period", "3 Full Periods"],
    rule: (n) => n === 1 ? "Every day of a 5-week period logged" : `${n} periods with every day logged`, joke: "Thirty-five out of thirty-five.",
    value: (c) => c.coverage.periods },

  // Using the app
  { id: "regular", cat: "app", emoji: "🔥", color: "#F59E0B", levels: [3, 7, 30], names: ["Regular", "Weekly Regular", "Part of the Furniture"],
    rule: (n) => `Open the app ${n} days in a row`, joke: "Can't stay away.", value: (c) => bestStreak(c.usage.openDays || []) },
  { id: "duty_detective", cat: "app", emoji: "🕵️", color: "#F59E0B", levels: [1, 25], names: ["Duty Detective", "Chief Inspector"],
    rule: (n) => n === 1 ? "Look up a duty" : `Look up ${n} duties`, joke: "Case closed.", value: (c) => c.usage.lookups || 0 },
  { id: "swap_shop", cat: "app", emoji: "🔁", color: "#F59E0B", name: "Swap Shop", rule: "Share a duty", joke: "Open for business.",
    test: (c) => (c.usage.shares || 0) > 0 },
  { id: "explorer", cat: "app", emoji: "🧭", color: "#F59E0B", name: "Explorer", rule: "Visit Home, Log, Lookup, Period and Leave",
    joke: "Every corner checked.",
    value: (c) => TRACKED_TABS.filter((t) => (c.usage.tabs || []).includes(t)).length, target: () => TRACKED_TABS.length,
    test: (c) => TRACKED_TABS.every((t) => (c.usage.tabs || []).includes(t)) },
  { id: "heads_up", cat: "app", emoji: "⚠️", color: "#F59E0B", name: "Heads Up", rule: "Check a diversion", joke: "Forewarned.",
    test: (c) => (c.usage.alertsViewed || 0) > 0 },
  { id: "paper_trail", cat: "app", emoji: "🧾", color: "#F59E0B", name: "Paper Trail", rule: "Export a period PDF", joke: "Receipts kept.",
    test: (c) => (c.usage.pdfExports || 0) > 0 },
];

export function buildContext({ periods = [], leaveSettings, usage = {}, zones = [], today }) {
  return {
    shifts: periods.flatMap((p) => p.shifts || []),
    daysOff: periods.flatMap((p) => p.daysOff || []),
    leaveSettings, usage, zones, today,
    coverage: coverageCounts(periods, today),
  };
}

// Every earned key right now.
export function earnedKeys(ctx) {
  const keys = [];
  for (const b of BADGES) {
    if (b.levels) { const v = b.value(ctx); b.levels.forEach((l) => { if (v >= l) keys.push(`${b.id}:${l}`); }); }
    else if (b.yearly) b.years(ctx).forEach((y) => keys.push(`${b.id}:${y}`));
    else if (b.test(ctx)) keys.push(b.id);
  }
  return keys;
}

// Display info for one stored key.
export function describeKey(key) {
  const [id, suffix] = key.split(":");
  const b = BADGES.find((x) => x.id === id);
  if (!b) return null;
  if (b.levels) {
    const i = b.levels.indexOf(Number(suffix));
    return { badge: b, name: b.names[Math.max(0, i)], rule: b.rule(b.levels[Math.max(0, i)]), level: i, levelCount: b.levels.length };
  }
  return { badge: b, name: b.name, rule: b.rule, year: b.yearly ? suffix : null, level: 0, levelCount: 1 };
}

// Keys in `now` not already stored.
export function newKeys(storedEarned, now) {
  return now.filter((k) => !storedEarned?.[k]);
}

// One row per badge for the Achievements page: earned levels/years, progress.
export function badgeRows(ctx, storedEarned = {}) {
  return BADGES.map((b) => {
    const keys = Object.keys(storedEarned).filter((k) => k === b.id || k.startsWith(b.id + ":"));
    const earned = keys.length > 0;
    let progress = null, name = b.name, rule = b.rule, level = 0;
    if (b.levels) {
      const v = b.value(ctx);
      const got = b.levels.filter((l) => storedEarned[`${b.id}:${l}`]);
      level = got.length;
      const next = b.levels.find((l) => !storedEarned[`${b.id}:${l}`]);
      const shown = next ?? b.levels[b.levels.length - 1];
      name = b.names[got.length ? got.length - 1 : 0];
      rule = b.rule(shown);
      if (next) progress = { value: Math.min(v, next), target: next };
      if (b.showCount && v > 0) progress = { ...(progress || {}), count: v };
    } else if (!b.yearly && b.target) {
      progress = earned ? null : { value: b.value(ctx), target: b.target(ctx) };
    }
    const at = keys.map((k) => storedEarned[k].at).sort().pop() || null;
    return { badge: b, earned, name, rule, level, count: b.yearly ? keys.length : null, at, progress, hidden: b.secret && !earned };
  });
}

export const FLOOD_LIMIT = 5;

// Merge freshly computed keys into stored state.
// Returns { state, popups: [key], summary: {count, firstRun} | null }:
//  - first run (not yet welcomed): everything already earned is stored as
//    retro and one summary pop-up announces the total (if any);
//  - afterwards: each new key gets its own pop-up, unless more than
//    FLOOD_LIMIT arrive at once (e.g. a sync just landed), which becomes
//    one summary pop-up instead.
export function reconcile(state, nowKeys, today) {
  const base = { v: 1, earned: {}, usage: {}, ...(state || {}) };
  const fresh = newKeys(base.earned, nowKeys);
  const firstRun = !base.welcomed;
  const asSummary = firstRun || fresh.length > FLOOD_LIMIT;
  if (!fresh.length && !firstRun) return { state: base, popups: [], summary: null };
  const earned = { ...base.earned };
  fresh.forEach((k) => { earned[k] = asSummary ? { at: today, retro: true } : { at: today }; });
  return {
    state: { ...base, earned, welcomed: true },
    popups: asSummary ? [] : fresh,
    summary: asSummary && fresh.length ? { count: fresh.length, firstRun } : null,
  };
}

// Non-retro badges earned on `today`.
export function earnedToday(stored, today) {
  return Object.entries(stored || {}).filter(([, v]) => v.at === today && !v.retro).map(([k]) => k);
}
