// Achievements / badges — pure rules. No React, no storage.
// Spec: docs/superpowers/specs/2026-11-06-achievements-design.md
//
// Three badge shapes:
//   levels  — one badge, several thresholds on a number ("10 Duties"); key `${id}:${level}`
//   flag    — earned once when test() is true; key `${id}`
//   yearly  — can be re-earned each calendar year; years() lists qualifying
//             years; key `${id}:${year}`; the page shows the count
import { addDays, getDayType, sundayOf } from "./dutyMath.js";
import { dayInfo, getSeq } from "./roster.js";

export const CATEGORIES = [
  { id: "duties", label: "Duties" },
  { id: "routes", label: "Routes" },
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
  return { weeks: weekStarts.size, months: monthKeys.size, periods: fullPeriods, monthSet: [...monthKeys].map((k) => k.slice(0, 7)) };
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

// ─── Holiday blocks ──────────────────────────────────────────────────────
// Dublin Bus gives annual leave partly as set blocks: a winter week (5 annual
// leave days + the week's 2 rest days = 7 days off in a row) and the summer
// weeks (10 annual leave + 4 rest days = 14 in a row). A block is a run of
// consecutive days off (annual leave, rest day — auto or logged — or bank
// holiday in lieu); it's credited to the year of its first annual leave day.
const BLOCK_TYPES = new Set(["Annual Leave", "Rest Day", "Bank Holiday In Lieu"]);
export function holidayBlocks(periods) {
  const offByDate = new Map();
  for (const p of periods) {
    if (!p?.startDate) continue;
    for (let i = 0; i < 35; i++) {
      const d = addDays(p.startDate, i);
      const info = dayInfo(p, d);
      if (info.status === "dayoff" && BLOCK_TYPES.has(info.dayOff.type)) offByDate.set(d, info.dayOff.type);
    }
  }
  const dates = [...offByDate.keys()].sort();
  const blocks = [];
  let run = [];
  const flush = () => {
    const al = run.filter((d) => offByDate.get(d) === "Annual Leave");
    if (al.length) blocks.push({ start: run[0], length: run.length, alDates: al, year: year(al[0]) });
    run = [];
  };
  for (const d of dates) {
    if (run.length && addDays(run[run.length - 1], 1) !== d) flush();
    run.push(d);
  }
  if (run.length) flush();
  return blocks.map((b) => ({
    ...b,
    kind: b.alDates.length >= 10 && b.length >= 14 ? "summer" : b.alDates.length >= 5 && b.length >= 7 ? "winter" : null,
  }));
}
const blockYears = (c, kind) => [...new Set(c.blocks.filter((b) => b.kind === kind).map((b) => b.year))].sort();
// Annual leave days outside any winter/summer block: "your own five".
function ownDaysByYear(c) {
  const inBlock = new Set(c.blocks.filter((b) => b.kind).flatMap((b) => b.alDates));
  return countBy(ofType(c, "Annual Leave").filter((d) => !inBlock.has(d.date)), (d) => year(d.date));
}

// Sick Note: a whole week off sick — 7 days in a row of sick days and rest
// days (auto or logged), at least 5 of them sick days.
function sickWeek(periods) {
  const offByDate = new Map();
  for (const p of periods) {
    if (!p?.startDate) continue;
    for (let i = 0; i < 35; i++) {
      const d = addDays(p.startDate, i);
      const info = dayInfo(p, d);
      if (info.status === "dayoff" && (info.dayOff.type === "Sick Day" || info.dayOff.type === "Rest Day")) offByDate.set(d, info.dayOff.type);
    }
  }
  const dates = [...offByDate.keys()].sort();
  let run = [];
  const ok = () => run.length >= 7 && run.filter((d) => offByDate.get(d) === "Sick Day").length >= 5;
  for (const d of dates) {
    if (run.length && addDays(run[run.length - 1], 1) !== d) { if (ok()) return true; run = []; }
    run.push(d);
  }
  return ok();
}

// Swap badges: distinct duty dates shared, most in one Sun–Sat week and
// most in one 5-week period.
function swapsPerWeek(c) {
  const byWeek = countBy(c.usage.sharedDates || [], (d) => sundayOf(d));
  return Math.max(0, ...Object.values(byWeek));
}
function swapsPerPeriod(c) {
  const dates = c.usage.sharedDates || [];
  return Math.max(0, ...c.periods.filter((p) => p?.startDate).map((p) => {
    const end = addDays(p.startDate, 34);
    return dates.filter((d) => d >= p.startDate && d <= end).length;
  }));
}

// Calendar blocks fully covered (every day logged): quarters, halves,
// Jan–Sep, whole year. Returns the years that qualify.
function calendarBlockYears(c, monthGroups) {
  const have = new Set(c.coverage.monthSet || []);
  const years = [...new Set([...have].map((m) => m.slice(0, 4)))];
  return years.filter((y) => monthGroups.some((g) => g.every((m) => have.has(`${y}-${String(m).padStart(2, "0")}`)))).sort();
}
const QUARTERS = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]];
const HALVES = [[1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12]];

// Summerhill routes (from the roster's running boards). A shift "works" a
// route when its running board has a trip on it.
export const ROUTES = ["15A", "15B", "15D", "33", "41", "41B", "41C", "41D", "120", "122", "150"];
export function routesWorked(shifts) {
  const seen = new Set();
  for (const s of shifts) {
    if (!s.zone || !s.roster || s.fixedType) continue;
    for (const entry of getSeq(s.zone, getDayType(s.date), s.roster)) {
      for (const m of entry.matchAll(/\((\d{1,3}[A-Z]?)\b[^)]*\)/g)) seen.add(m[1]);
    }
  }
  return seen;
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
  { id: "zone_1", cat: "duties", emoji: "1️⃣", color: "#FFCD00", name: "Zone 1 Debut", rule: "Work a Zone 1 duty", joke: "New patch unlocked.",
    test: (c) => c.shifts.some((s) => s.zone === "Zone 1") },
  { id: "zone_2", cat: "duties", emoji: "2️⃣", color: "#FFCD00", name: "Zone 2 Debut", rule: "Work a Zone 2 duty", joke: "New patch unlocked.",
    test: (c) => c.shifts.some((s) => s.zone === "Zone 2") },
  { id: "zone_150", cat: "duties", emoji: "🔵", color: "#FFCD00", name: "150 Debut", rule: "Work a 150 duty", joke: "New patch unlocked.",
    test: (c) => c.shifts.some((s) => s.zone === "150") },
  { id: "zone_33", cat: "duties", emoji: "🌊", color: "#FFCD00", name: "Route 33 Debut", rule: "Work a Route 33 (Skerries) duty", joke: "New patch unlocked.",
    test: (c) => c.shifts.some((s) => s.zone === "Skerries") },
  ...ROUTES.map((r) => ({ id: `route_${r}`, cat: "routes", emoji: "\u{1F68F}", color: "#C084FC", name: `Route ${r}`,
    rule: `Work a duty on the ${r}`, joke: "Another one for the collection.", test: (c) => c.routes.has(r) })),
  { id: "route_master", cat: "routes", emoji: "\u{1F5FA}\uFE0F", color: "#C084FC", name: "Route Master", rule: "Work every Summerhill route",
    joke: "You've seen it all. Twice.",
    value: (c) => ROUTES.filter((r) => c.routes.has(r)).length, target: () => ROUTES.length,
    test: (c) => ROUTES.every((r) => c.routes.has(r)) },
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
  { id: "winter_week", cat: "leave", emoji: "❄️", color: "#00C896", name: "Winter Week", yearly: true,
    rule: "Log your winter week: 5 days annual leave plus rest days, 7 off in a row", joke: "Hibernation mode.",
    years: (c) => blockYears(c, "winter") },
  { id: "summer_weeks", cat: "leave", emoji: "☀️", color: "#00C896", name: "Summer Weeks", yearly: true,
    rule: "Log your summer weeks: 10 days annual leave plus rest days, 14 off in a row", joke: "Factor 50 at the ready.",
    years: (c) => blockYears(c, "summer") },
  { id: "your_five", cat: "leave", emoji: "🎟️", color: "#00C896", name: "Your Five", yearly: true,
    rule: "Log the 5 annual leave days that are yours to pick", joke: "Spent wisely. Probably.",
    years: (c) => yearsWhere(ownDaysByYear(c), 5) },
  { id: "first_sick", cat: "leave", emoji: "🤒", color: "#00C896", name: "First Sick Day", rule: "Log a sick day", joke: "Get well soon. Or don't, it's paid.",
    test: (c) => ofType(c, "Sick Day").length > 0 },
  { id: "full_five", cat: "leave", emoji: "🖐️", color: "#00C896", name: "Full Five", yearly: true, rule: "Use all 5 paid sick days in a year",
    joke: "Every paid one, accounted for.", years: (c) => yearsWhere(yearCount(c, "Sick Day"), 5) },
  { id: "sick_note", cat: "leave", emoji: "🤒", color: "#00C896", name: "Sick Note", rule: "A whole week off sick (7 days, at least 5 sick days)",
    joke: "You've earned the nickname.", test: (c) => c.sickWeek },
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
  { id: "full_week", cat: "covered", emoji: "📅", color: "#60a5fa", levels: [1, 4, 8, 26, 52], names: ["Full Week", "4 Full Weeks", "8 Full Weeks", "26 Full Weeks", "52 Full Weeks"],
    rule: (n) => n === 1 ? "Every day of a week (Sun–Sat) logged" : `${n} weeks with every day logged`, joke: "Seven for seven.",
    value: (c) => c.coverage.weeks },
  { id: "full_month", cat: "covered", emoji: "🗓️", color: "#60a5fa", levels: [1, 3, 6, 12], names: ["Full Month", "3 Full Months", "6 Full Months", "12 Full Months"],
    rule: (n) => n === 1 ? "Every day of a calendar month logged" : `${n} calendar months with every day logged`, joke: "A whole month, no gaps.", value: (c) => c.coverage.months },
  { id: "full_quarter", cat: "covered", emoji: "\u{1F4C6}", color: "#60a5fa", name: "Full Quarter", yearly: true,
    rule: "Every day of a calendar quarter logged (e.g. Jan–Mar)", joke: "Three months, no gaps.", years: (c) => calendarBlockYears(c, QUARTERS) },
  { id: "half_year", cat: "covered", emoji: "\u{1F317}", color: "#60a5fa", name: "Half Year", yearly: true,
    rule: "Every day of Jan–Jun or Jul–Dec logged", joke: "Halfway there.", years: (c) => calendarBlockYears(c, HALVES) },
  { id: "three_quarters", cat: "covered", emoji: "\u{1F318}", color: "#60a5fa", name: "Three Quarters", yearly: true,
    rule: "Every day from January to September logged", joke: "The home straight.", years: (c) => calendarBlockYears(c, [[1, 2, 3, 4, 5, 6, 7, 8, 9]]) },
  { id: "full_year", cat: "covered", emoji: "\u{1F3C6}", color: "#60a5fa", name: "Full Year", yearly: true,
    rule: "Every day of a calendar year logged", joke: "365 out of 365. Respect.", years: (c) => calendarBlockYears(c, [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]]) },
  { id: "full_period", cat: "covered", emoji: "🏁", color: "#60a5fa", levels: [1, 3, 6, 10], names: ["Full Period", "3 Full Periods", "6 Full Periods", "10 Full Periods"],
    rule: (n) => n === 1 ? "Every day of a 5-week period logged" : `${n} periods with every day logged`, joke: "Thirty-five out of thirty-five.",
    value: (c) => c.coverage.periods },

  // Using the app
  { id: "welcome", cat: "app", emoji: "👋", color: "#F59E0B", name: "Welcome Aboard", rule: "Set up Roster Buddy", joke: "Tickets, please.",
    test: (c) => c.periodCount > 0 },
  { id: "tour_done", cat: "app", emoji: "🎓", color: "#F59E0B", name: "Shown the Ropes", rule: "Finish the app tour", joke: "Fully trained. Allegedly.",
    test: (c) => (c.usage.toursCompleted || 0) > 0 },
  { id: "tour_replay", cat: "app", emoji: "🔂", color: "#F59E0B", name: "Encore", rule: "Replay the tour from Settings", joke: "Once more, with feeling.",
    test: (c) => (c.usage.tourReplays || 0) > 0 },
  { id: "faq", cat: "app", emoji: "📖", color: "#F59E0B", name: "Read the Manual", rule: "Open the FAQ", joke: "Rarer than you'd think.",
    test: (c) => (c.usage.faqViews || 0) > 0 },
  { id: "feedback", cat: "app", emoji: "📮", color: "#F59E0B", name: "Suggestion Box", rule: "Send feedback", joke: "Noted. Officially.",
    test: (c) => (c.usage.feedbackSent || 0) > 0 },
  { id: "regular", cat: "app", emoji: "🔥", color: "#F59E0B", levels: [3, 7, 14, 30, 60, 100], names: ["Regular", "Weekly Regular", "Fortnight Fixture", "Part of the Furniture", "Two-Month Habit", "Century Club"],
    rule: (n) => `Open the app ${n} days in a row`, joke: "Can't stay away.", value: (c) => bestStreak(c.usage.openDays || []) },
  { id: "duty_detective", cat: "app", emoji: "🕵️", color: "#F59E0B", levels: [1, 25], names: ["Duty Detective", "Chief Inspector"],
    rule: (n) => n === 1 ? "Look up a duty" : `Look up ${n} duties`, joke: "Case closed.", value: (c) => c.usage.lookups || 0 },
  { id: "swap_shop", cat: "app", emoji: "🔁", color: "#F59E0B", name: "Swap Shop", rule: "Share a duty", joke: "Open for business.",
    test: (c) => (c.usage.shares || 0) > 0 },
  { id: "taking_the_michael", cat: "app", emoji: "😏", color: "#F59E0B", name: "Taking the Michael", rule: "Share 3 different duty days in one week",
    joke: "Everyone knows a Michael.",
    value: (c) => Math.min(3, swapsPerWeek(c)), target: () => 3, test: (c) => swapsPerWeek(c) >= 3 },
  { id: "taking_the_psss", cat: "app", emoji: "🙄", color: "#F59E0B", name: "Now You're Really Taking the Psss, Michael", rule: "Share all 5 duty days in one week",
    joke: "Do you actually work here?",
    value: (c) => Math.min(5, swapsPerWeek(c)), target: () => 5, test: (c) => swapsPerWeek(c) >= 5 },
  { id: "legendary_michael", cat: "app", emoji: "👑", color: "#F59E0B", name: "The Legendary Michael Award", rule: "Share 10 different duty days in one 5-week period",
    joke: "There can be only one.",
    value: (c) => Math.min(10, swapsPerPeriod(c)), target: () => 10, test: (c) => swapsPerPeriod(c) >= 10 },
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
    periods,
    routes: routesWorked(periods.flatMap((p) => p.shifts || [])),
    periodCount: periods.length,
    sickWeek: sickWeek(periods),
    coverage: coverageCounts(periods, today),
    blocks: holidayBlocks(periods),
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

// Merge freshly computed keys into stored state. Pop-ups are stored in the
// state itself (unseen badges, pendingSummary) and only cleared when the
// driver closes them, so a reload or the phone killing the app mid-pop-up
// can't lose them.
//  - first run (not yet welcomed): everything already earned is stored as
//    retro behind one summary;
//  - afterwards: each new key is its own pop-up (seen:false), unless more
//    than FLOOD_LIMIT arrive at once, which becomes one summary instead.
export function reconcile(state, nowKeys, today) {
  const base = { v: 1, earned: {}, usage: {}, ...(state || {}) };
  const fresh = newKeys(base.earned, nowKeys);
  const firstRun = !base.welcomed;
  if (!fresh.length && !firstRun) return { state: base, changed: false };
  const asSummary = firstRun || fresh.length > FLOOD_LIMIT;
  const earned = { ...base.earned };
  fresh.forEach((k) => { earned[k] = asSummary ? { at: today, retro: true } : { at: today, seen: false }; });
  const pendingSummary = asSummary && fresh.length
    ? { count: (base.pendingSummary?.count || 0) + fresh.length, firstRun: firstRun || !!base.pendingSummary?.firstRun }
    : base.pendingSummary;
  return { state: { ...base, earned, welcomed: true, ...(pendingSummary ? { pendingSummary } : {}) }, changed: true };
}

// Badges still waiting to be shown: individually earned ones not yet seen,
// plus (while a first-run / flood summary is pending) the retro batch.
function waitingKeys(state) {
  const earned = state?.earned || {};
  return Object.keys(earned).filter((k) => {
    const v = earned[k];
    if (v.seen === true || v.viewed === true) return false;
    return v.seen === false || (v.retro && !!state.pendingSummary);
  });
}

// Newest first: by date earned, then catalogue order, then level — so the
// card shows the most recent / highest badge, not the first one ever.
function rank(key, entry) {
  const id = key.split(":")[0];
  const info = describeKey(key);
  return [entry.at, BADGES.findIndex((b) => b.id === id), info ? info.level : 0];
}
function newer(a, b) {
  for (let i = 0; i < 3; i++) { if (a[i] > b[i]) return true; if (a[i] < b[i]) return false; }
  return false;
}

// ONE card at most (Phil 2026-11-06: never make people click through a
// stack). Returns { key, extra, firstRun } or null; extra = how many others
// are behind it (shown as "+N more").
export function popupFor(state) {
  const keys = waitingKeys(state);
  if (!keys.length) return null;
  let best = keys[0];
  for (const k of keys.slice(1)) if (newer(rank(k, state.earned[k]), rank(best, state.earned[best]))) best = k;
  return { key: best, extra: keys.length - 1, firstRun: !!state.pendingSummary?.firstRun };
}

// Closing the card (or opening the Achievements page) clears everything
// waiting, including the Home banner.
export function dismissAll(state) {
  if (!state) return state;
  const earned = { ...(state.earned || {}) };
  for (const [k, v] of Object.entries(earned)) {
    if (v.seen === false) earned[k] = { ...v, seen: true };
    else if (!v.viewed && v.seen !== true) earned[k] = { ...v, viewed: true };
  }
  const next = { ...state, earned };
  delete next.pendingSummary;
  return next;
}

// Home banner: badges earned today that haven't been looked at yet.
export function earnedTodaySummary(stored, today) {
  const entries = Object.entries(stored || {}).filter(([, v]) => v.at === today && v.seen !== true && !v.viewed);
  const keys = entries.filter(([, v]) => !v.retro).map(([k]) => k);
  return { keys, retroCount: entries.length - keys.length };
}

// Non-retro badges earned on `today`.
export function earnedToday(stored, today) {
  return earnedTodaySummary(stored, today).keys;
}
