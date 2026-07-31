# Home Screen Week Highlights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small "This Week" widget on the Home screen, between the header and the Upcoming carousel, summarizing the current week's rest-day pattern (named "Short weekend"/"Long weekend" when it matches), any CPC/Training days, and the start of any Annual Leave/Sick Day/Force Majeure/Self Cert block.

**Architecture:** One new pure function `weekHighlights(period, weekStart)` in `src/lib/roster.js` returns an array of highlight strings, computed from `period.shifts`/`period.daysOff` plus the existing `withFixedRestDays` merge. One new presentational component `WeekHighlightsCard` in `src/screens/HomeScreen.jsx` renders that array (or nothing, if empty) as a small card.

**Tech Stack:** React (no new libraries), Vitest for the pure-function tests. No Supabase/schema changes — this is 100% derived from data that already exists.

## Global Constraints

- Weeks are always Sunday-start (periods enforce this in Settings) — "this week" is the same `stats.weeks[wi]` / `cw` concept `HomeScreen.jsx` already computes, passed in as `weekStart` (a `"YYYY-MM-DD"` string, e.g. `cw.start`).
- Weekday names are full words ("Tuesday", not "Tue"), matching the spec's phrasing examples.
- Short weekend = rest days this week are exactly `{Saturday, Sunday}`. Long weekend = exactly `{Saturday, Sunday, Monday}`. Any other rest-day combination falls back to a plain `"Off {Weekday}"` / `"Off {Weekday} & {Weekday}"` list, chronological order.
- This weekend-naming applies ONLY to `type === "Rest Day"` entries — Annual Leave/Sick Day/Force Majeure/Self Cert never get renamed "weekend" even if they happen to land on Sat+Sun (confirmed with Phil).
- A special day-off (Annual Leave/Sick Day/Force Majeure/Self Cert) run only produces a line if its **start date** falls within this week. A run already in progress before this week is silent (no line) — confirmed with Phil, the carousel below still shows it day by day.
- All highlight lines are shown together, stacked — no de-duplication, no "pick the most important one" logic (confirmed with Phil).
- Known accepted limitation (do not attempt to fix in this plan): a special-day-off run's start date is only checked within the active period's own `daysOff` — a run that actually started in a previous archived period and rolls over the boundary may be misreported as "starts this week."

---

### Task 1: `weekHighlights` pure function + unit tests

**Files:**
- Modify: `src/lib/roster.js` (add the new exported function; it already exports `withFixedRestDays`, `dayInfo`, etc. from this file, so add `weekHighlights` alongside them)
- Test: `src/lib/roster.test.js` (already has a `PERIOD` fixture and imports from `./roster.js` — add new tests using that same file)

**Interfaces:**
- Consumes: `withFixedRestDays(startDate, daysOff, shifts, removedFixed)` (already exported from `roster.js`, returns real `daysOff` plus virtual `{id, date, type:"Rest Day", fixed:true}` entries for the period) and `addDays(dateStr, n)` (already exported from `src/lib/dutyMath.js`, returns a `"YYYY-MM-DD"` string).
- Produces: `export function weekHighlights(period, weekStart)` — `period` is `{startDate, shifts, daysOff, removedFixedRestDates}` (same shape used everywhere else in `roster.js`), `weekStart` is a `"YYYY-MM-DD"` string. Returns `string[]`, e.g. `["Short weekend", "2 weeks Annual Leave starts this week"]`. Later tasks (Task 2) call this directly — no other shape or return type.

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `src/lib/roster.test.js` (after the existing `describe` blocks — the file already imports `describe, it, expect` from `"vitest"` and `addDays` from `"./dutyMath.js"` at the top, so just add `weekHighlights` to the existing `roster.js` import on line 2):

```javascript
describe("weekHighlights", () => {
  const base = { id: "wh1", startDate: "2026-07-19", shifts: [], daysOff: [] };

  it("names an exact Saturday+Sunday rest pattern a short weekend", () => {
    // Week of 2026-07-19 (Sun) to 2026-07-25 (Sat): FIXED_REST_PATTERN week 1 is
    // [Sunday, Monday] by default in roster.js, so override via removedFixedRestDates
    // and a real Rest Day pair to get exactly Sat+Sun for this test.
    const p = {
      ...base,
      removedFixedRestDates: ["2026-07-19", "2026-07-20"], // remove the auto Sun+Mon
      daysOff: [
        { id: "r1", date: "2026-07-25", type: "Rest Day" }, // Saturday
        { id: "r2", date: "2026-07-19", type: "Rest Day" }, // Sunday (re-added as real)
      ],
    };
    expect(weekHighlights(p, "2026-07-19")).toEqual(["Short weekend"]);
  });

  it("names an exact Saturday+Sunday+Monday rest pattern a long weekend", () => {
    const p = {
      ...base,
      daysOff: [{ id: "r1", date: "2026-07-25", type: "Rest Day" }], // Saturday, real
      // Week 1's FIXED_REST_PATTERN default is [Sunday, Monday] - combined with
      // the real Saturday above, this week's merged rest days are exactly Sat+Sun+Mon.
    };
    expect(weekHighlights(p, "2026-07-19")).toEqual(["Long weekend"]);
  });

  it("lists non-weekend rest-day combinations plainly, in date order", () => {
    const p = {
      ...base,
      removedFixedRestDates: ["2026-07-19", "2026-07-20"], // remove the auto Sun+Mon
      daysOff: [
        { id: "r1", date: "2026-07-25", type: "Rest Day" }, // Saturday
        { id: "r2", date: "2026-07-21", type: "Rest Day" }, // Tuesday
      ],
    };
    expect(weekHighlights(p, "2026-07-19")).toEqual(["Off Tuesday & Saturday"]);
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
    expect(weekHighlights(p, "2026-07-19")).toContain("2 weeks Annual Leave starts this week");
  });

  it("uses singular '1 week' for an exact 7-day run (the week/day boundary)", () => {
    const p = {
      ...base,
      daysOff: Array.from({ length: 7 }, (_, i) => ({
        id: `s${i}`, date: addDays("2026-07-20", i), type: "Sick Day",
      })),
    };
    // 2026-07-20 through 2026-07-26 inclusive = exactly 7 days.
    expect(weekHighlights(p, "2026-07-19")).toContain("1 week Sick Day starts this week");
  });

  it("uses day-count phrasing for an 8-day run (just over the week boundary, not a multiple of 7)", () => {
    const p = {
      ...base,
      daysOff: Array.from({ length: 8 }, (_, i) => ({
        id: `s${i}`, date: addDays("2026-07-20", i), type: "Sick Day",
      })),
    };
    expect(weekHighlights(p, "2026-07-19")).toContain("8 days Sick Day starts this week");
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
    expect(weekHighlights(p, "2026-07-19")).toContain("3 days Sick Day starts this week");
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
    const result = weekHighlights(p, "2026-07-19");
    expect(result.some(l => l.includes("Sick Day"))).toBe(false);
  });

  it("adds a CPC line alongside a rest-day line in the same week", () => {
    const p = {
      ...base,
      shifts: [{ id: "c1", date: "2026-07-23", roster: "CPC/Training", fixedType: "cpc" }], // Thursday
      // Week 1's default FIXED_REST_PATTERN [Sunday, Monday] applies unchanged.
    };
    expect(weekHighlights(p, "2026-07-19")).toEqual(["Off Sunday & Monday", "CPC · Thursday"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/roster.test.js`
Expected: FAIL — `weekHighlights is not a function` (or similar import error), since it doesn't exist in `roster.js` yet.

- [ ] **Step 3: Implement `weekHighlights` in `src/lib/roster.js`**

Add this near the other `daysOff`-related helpers (e.g. right after `withFixedRestDays`, which it depends on):

```javascript
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function weekdayName(dateStr) {
  return WEEKDAY_NAMES[new Date(dateStr + "T12:00:00").getDay()];
}
function joinWeekdayNames(names) {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

// Summarizes the current week for the Home screen's "This Week" widget:
// the rest-day pattern (named "Short weekend"/"Long weekend" when it matches
// those exact shapes), any CPC/Training days, and the start of any special
// day-off run (Annual Leave/Sick Day/Force Majeure/Self Cert). A run already
// in progress before this week is silent - see the design spec
// (docs/superpowers/specs/2026-07-30-home-week-highlights-design.md) for why.
export function weekHighlights(period, weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const mergedDaysOff = withFixedRestDays(period.startDate, period.daysOff || [], period.shifts || [], period.removedFixedRestDates);
  const lines = [];

  // 1. Rest days this week
  const restDates = mergedDaysOff
    .filter(d => d.type === "Rest Day" && d.date >= weekStart && d.date <= weekEnd)
    .map(d => d.date)
    .sort();
  if (restDates.length > 0) {
    const weekdaySet = new Set(restDates.map(d => new Date(d + "T12:00:00").getDay()));
    if (weekdaySet.size === 2 && weekdaySet.has(0) && weekdaySet.has(6)) {
      lines.push("Short weekend");
    } else if (weekdaySet.size === 3 && weekdaySet.has(0) && weekdaySet.has(6) && weekdaySet.has(1)) {
      lines.push("Long weekend");
    } else {
      lines.push(`Off ${joinWeekdayNames(restDates.map(weekdayName))}`);
    }
  }

  // 2. Special day-off runs (contiguous same-type dates) starting this week
  const special = mergedDaysOff
    .filter(d => d.type !== "Rest Day")
    .sort((a, b) => a.date.localeCompare(b.date));
  special.forEach((d, i) => {
    const prev = special[i - 1];
    const isRunStart = !prev || prev.type !== d.type || addDays(prev.date, 1) !== d.date;
    if (!isRunStart) return;
    if (d.date < weekStart || d.date > weekEnd) return;
    let runEnd = d.date;
    let j = i + 1;
    while (j < special.length && special[j].type === d.type && special[j].date === addDays(runEnd, 1)) {
      runEnd = special[j].date;
      j++;
    }
    const dayCount = Math.round((new Date(runEnd + "T12:00:00") - new Date(d.date + "T12:00:00")) / 86400000) + 1;
    const label = dayCount >= 7 && dayCount % 7 === 0
      ? `${dayCount / 7} week${dayCount / 7 > 1 ? "s" : ""}`
      : `${dayCount} day${dayCount > 1 ? "s" : ""}`;
    lines.push(`${label} ${d.type} starts this week`);
  });

  // 3. CPC/Training days this week
  const cpcDates = (period.shifts || [])
    .filter(s => s.fixedType === "cpc" && s.date >= weekStart && s.date <= weekEnd)
    .map(s => s.date)
    .sort();
  if (cpcDates.length > 0) {
    lines.push(`CPC · ${joinWeekdayNames(cpcDates.map(weekdayName))}`);
  }

  return lines;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/roster.test.js`
Expected: PASS, all `weekHighlights` tests green alongside the existing ones in this file.

- [ ] **Step 5: Run the full suite to check nothing else broke**

Run: `npx vitest run`
Expected: PASS, all test files green (133+ tests, exact count grows by the number added in Step 1).

- [ ] **Step 6: Commit**

```bash
git add src/lib/roster.js src/lib/roster.test.js
git commit -m "Add weekHighlights: rest-day/CPC/leave summary for Home's This Week widget"
```

---

### Task 2: `WeekHighlightsCard` component wired into Home

**Files:**
- Modify: `src/screens/HomeScreen.jsx` (add the import, a new component, and one render line)

**Interfaces:**
- Consumes: `weekHighlights(period, weekStart)` from Task 1 (`src/lib/roster.js`), returns `string[]`. Also consumes the existing `cw` variable already computed in `HomeScreen` (`src/screens/HomeScreen.jsx:202`, `const cw = stats.weeks[wi];` — has a `.start` field, a `"YYYY-MM-DD"` string) and the existing `CARD`, `BORDER`, `TEXT`, `MUTED` theme constants already imported at the top of this file (`src/screens/HomeScreen.jsx:5`).
- Produces: `WeekHighlightsCard({highlights})` — a presentational component, not exported (matches how `TodayDutyCard`/`UpcomingCarousel` are defined and used only within this same file). No other file needs to import it.

- [ ] **Step 1: Add the component**

In `src/screens/HomeScreen.jsx`, add this new component directly above the existing `// ─── UPCOMING CAROUSEL ───` comment block (around line 100, right after `TodayDutyCard` ends):

```javascript
// ─── WEEK HIGHLIGHTS ──────────────────────────────────────────────────────────
function WeekHighlightsCard({highlights}) {
  if (!highlights || highlights.length === 0) return null;
  return (
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"14px 16px",marginBottom:12}}>
      <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 8px"}}>This Week</p>
      {highlights.map((h,i) => (
        <p key={i} style={{color:TEXT,fontSize:14,fontWeight:600,margin:i<highlights.length-1?"0 0 4px":0}}>{h}</p>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Import `weekHighlights` and compute it in `HomeScreen`**

In `src/screens/HomeScreen.jsx:4`, change:

```javascript
import { DUTIES, shiftDepartLocation, shiftBreakEnd, pStats, periodForDate, dayInfo, getSeq, greetingDutyContext, computeShiftStreak } from "../lib/roster.js";
```

to:

```javascript
import { DUTIES, shiftDepartLocation, shiftBreakEnd, pStats, periodForDate, dayInfo, getSeq, greetingDutyContext, computeShiftStreak, weekHighlights } from "../lib/roster.js";
```

Then, right after `const cw = stats.weeks[wi];` (`src/screens/HomeScreen.jsx:202`), add:

```javascript
  const thisWeekHighlights = useMemo(() => weekHighlights(period, cw.start), [period, cw.start]);
```

(`useMemo` is already imported at the top of this file from `"react"`.)

- [ ] **Step 3: Render the card between the header and the carousel**

Find this line in `src/screens/HomeScreen.jsx` (inside the `<div style={{padding:"0 16px"}}>` block, immediately before `<UpcomingCarousel .../>`):

```javascript
        <UpcomingCarousel periods={periods} activePeriodId={period.id} todayDate={todayDate} onLogDate={onLogDate}/>
```

Change it to:

```javascript
        <WeekHighlightsCard highlights={thisWeekHighlights}/>

        <UpcomingCarousel periods={periods} activePeriodId={period.id} todayDate={todayDate} onLogDate={onLogDate}/>
```

- [ ] **Step 4: Build to verify no errors**

Run: `npx vite build`
Expected: builds clean, no import/reference errors (e.g. `weekHighlights is not exported` or `CARD is not defined` would show here).

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, same count as Task 1 Step 5 (this task doesn't add or change any tests, it's pure UI wiring).

- [ ] **Step 6: Manual verification note**

This app requires a real Supabase login — there is no test account available in this environment. After building, start the dev server (`npm run dev` or the project's existing `db-tracker` launch config) and manually check on a real account: the "This Week" card appears above the Upcoming carousel on Home, shows the expected line(s) for the logged-in driver's actual current week, and disappears entirely if `weekHighlights` ever returns an empty array (shouldn't happen under the standard roster, but don't assume the login-gated path was clicked through in this same session unless it actually was).

- [ ] **Step 7: Commit**

```bash
git add src/screens/HomeScreen.jsx
git commit -m "Add This Week highlights card to Home, above the Upcoming carousel"
```
