# Custom (Fixed) Rest Days Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a driver with a fixed weekly schedule turn on a personal weekly-repeating rest-day pattern in Settings, which fully replaces the global 5-week `FIXED_REST_PATTERN` for them going forward.

**Architecture:** A new `CUSTOM_REST_CONFIG` module-level variable in `src/lib/roster.js` (set once per session via `setCustomRestConfig(profile)`, mirroring the existing `FIXED_REST_PATTERN` mutable-module-state pattern) is checked inside `fixedRestDates()`. When enabled, dates from the driver's `since` cutoff onward are generated from their chosen weekdays instead of the standard pattern; dates before `since` keep whatever the standard pattern already produced. Every existing caller of `fixedRestDates`/`withFixedRestDays` (dayInfo, pStats, weekHighlights, PDF export) needs zero changes since the function's contract is unchanged. Settings persists the toggle + weekday list to a new `profiles` columns, following the exact pattern already used for `garage`/`first_name`.

**Tech Stack:** React (Vite), Supabase (Postgres + JS client), Vitest.

## Global Constraints

- Weekday indices are `0=Sunday ... 6=Saturday` (matches JS `Date.getDay()` and the existing `FIXED_REST_PATTERN`/`WEEKDAY_NAMES` convention in `roster.js` — do not invent a different indexing).
- Replace, not additive: when a driver's custom config is enabled, the global 5-week pattern must not also apply to them.
- Forward-only: dates before `custom_rest_days_since` must keep resolving via the standard 5-week pattern, unchanged. Only dates on/after `since` use the custom weekday list.
- Custom rest days always win over the bank-holiday-forces-Sunday-duty rule (this falls out naturally from `dayInfo()`'s existing check order — see Task 2, no special-casing required).
- ISO date strings (`YYYY-MM-DD`) compare correctly with `<`/`>=` directly — no `Date` object needed for the `since` cutoff check.
- Persist via the `profiles` Supabase table, same table/pattern as `garage` and `first_name`.
- No component/UI test framework exists in this repo (checked) — React changes are verified with `npm run build` (catches syntax/import errors) plus manual verification, not new automated UI tests.

---

### Task 1: Supabase migration — add custom rest-day columns

**Files:**
- Create: `supabase/migrations/0012_custom_rest_days.sql`

**Interfaces:**
- Produces: three new nullable/defaulted columns on `public.profiles` — `custom_rest_days_enabled boolean`, `custom_rest_weekdays int[]`, `custom_rest_days_since date` — that Task 2/3 read and write by exact name.

- [ ] **Step 1: Write the migration**

```sql
-- Per-driver override for the global 5-week FIXED_REST_PATTERN. A driver on
-- a fixed weekly schedule (full-time drivers with set rest days, or
-- part-time drivers who work the same days every week) can turn this on and
-- pick which weekday(s) they're always off, repeating every week instead of
-- the standard 5-week rotation. See
-- docs/superpowers/specs/2026-08-13-custom-rest-days-design.md.
--
-- custom_rest_weekdays uses 0=Sunday .. 6=Saturday, matching JS Date.getDay()
-- and the existing FIXED_REST_PATTERN convention in src/lib/roster.js.
--
-- custom_rest_days_since is stamped to today only on the OFF -> ON
-- transition (handled client-side in App.jsx) so the switch applies going
-- forward only — dates before it keep resolving via the standard pattern.
alter table public.profiles
  add column custom_rest_days_enabled boolean not null default false,
  add column custom_rest_weekdays int[] not null default '{}',
  add column custom_rest_days_since date;
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push` (or however this repo's existing migrations get applied — check `supabase/schema.sql` for the same tooling used by `0011_route_alerts_dropdown_columns.sql`, use the same method here).

Expected: no errors; `profiles` table has the three new columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0012_custom_rest_days.sql
git commit -m "feat: add custom rest-day columns to profiles table"
```

---

### Task 2: Core logic — `CUSTOM_REST_CONFIG` and custom-aware `fixedRestDates`

**Files:**
- Modify: `src/lib/roster.js:44-58` (the `FIXED_REST_PATTERN` declaration and `fixedRestDates` function)
- Test: `src/lib/roster.test.js`

**Interfaces:**
- Consumes: nothing new — reuses `addDays` (already imported from `./dutyMath.js` in `roster.js`).
- Produces:
  - `export function setCustomRestConfig(profile)` — `profile` is `null` or an object with `custom_rest_days_enabled` (boolean), `custom_rest_weekdays` (int array), `custom_rest_days_since` (ISO date string or null) keys, i.e. exactly the shape returned by a Supabase `profiles` select. Sets module state; no return value.
  - `fixedRestDates(periodStartDate)` — same signature as today, but now custom-aware. Used unchanged by `withFixedRestDays`, and by the direct call at `roster.js:110` inside `weekHighlights`' next-period lookahead, so both automatically respect a driver's custom config with no further changes.

- [ ] **Step 1: Write the failing tests**

Open `src/lib/roster.test.js`. Update the import line and add a `CUSTOM_PERIOD` fixture plus a new `describe` block. Full new top-of-file state:

```js
import { describe, it, expect, afterEach } from "vitest";
import { greetingDutyContext, computeShiftStreak, dayInfo, periodForDate, weekHighlights, getSeq, DUTIES, setCustomRestConfig } from "./roster.js";
import { addDays, isBankHoliday } from "./dutyMath.js";

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

// A clean period (no logged shifts/days off) for exercising the custom
// rest-day generator in isolation, without PERIOD's own fixture data
// colliding with the dates under test.
const CUSTOM_PERIOD = { id: "cp1", startDate: "2026-07-19", shifts: [], daysOff: [] };
```

Then add this new `describe` block anywhere after the existing ones (e.g. right after the `dayInfo after a same-date shift is deleted...` block):

```js
// Per-driver override for the global 5-week pattern (see
// docs/superpowers/specs/2026-08-13-custom-rest-days-design.md). Period
// starts 2026-07-19 (Sunday). Standard FIXED_REST_PATTERN week 1 is
// [Sunday, Monday] -> 2026-07-19 and 2026-07-20; week 2 is [Thursday,
// Sunday] with week-2 starting 2026-07-26 -> 2026-07-26 and 2026-07-30.
describe("custom rest-day config (per-driver weekly override)", () => {
  afterEach(() => { setCustomRestConfig(null); }); // reset to disabled so later tests aren't affected

  it("keeps the standard pattern before `since`, and replaces it with the weekly custom weekday from `since` onward", () => {
    setCustomRestConfig({ custom_rest_days_enabled: true, custom_rest_weekdays: [2], custom_rest_days_since: "2026-07-24" }); // Tuesday, from 2026-07-24
    // Before `since`: standard week-1 pattern days are preserved unchanged.
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-19")).toMatchObject({ status: "dayoff", dayOff: { type: "Rest Day" } });
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-20")).toMatchObject({ status: "dayoff", dayOff: { type: "Rest Day" } });
    // On/after `since`: the standard pattern's week-2 Sunday (2026-07-26) no
    // longer applies — replaced, not additive.
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-26")).toMatchObject({ status: "unlogged" });
    // Instead, every Tuesday on/after `since` is a rest day.
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-28")).toMatchObject({ status: "dayoff", dayOff: { type: "Rest Day" } });
  });

  it("skips generating a custom rest day where a real shift is already logged (a swap)", () => {
    setCustomRestConfig({ custom_rest_days_enabled: true, custom_rest_weekdays: [2], custom_rest_days_since: "2026-07-19" });
    const swapped = { ...CUSTOM_PERIOD, shifts: [{ id: "sw1", date: "2026-07-21", roster: "SZ1/09" }] }; // a Tuesday
    expect(dayInfo(swapped, "2026-07-21")).toMatchObject({ status: "shift" });
  });

  it("leaves the standard 5-week pattern unchanged when the config is disabled", () => {
    setCustomRestConfig({ custom_rest_days_enabled: false, custom_rest_weekdays: [2], custom_rest_days_since: "2026-07-19" });
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-19")).toMatchObject({ status: "dayoff", dayOff: { type: "Rest Day" } });
    expect(dayInfo(CUSTOM_PERIOD, "2026-07-21")).toMatchObject({ status: "unlogged" }); // Tuesday isn't a pattern day, and custom is off
  });

  it("a custom rest day on a bank holiday still resolves as a day off, not a forced Sunday duty", () => {
    expect(isBankHoliday("2026-08-03")).toBe(true); // sanity: August bank holiday, a Monday
    setCustomRestConfig({ custom_rest_days_enabled: true, custom_rest_weekdays: [1], custom_rest_days_since: "2026-07-19" }); // Monday
    expect(dayInfo(CUSTOM_PERIOD, "2026-08-03")).toMatchObject({ status: "dayoff", dayOff: { type: "Rest Day" } });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- roster.test.js`
Expected: FAIL — `setCustomRestConfig is not a function` (or a Vitest import error), since it doesn't exist in `roster.js` yet.

- [ ] **Step 3: Implement `CUSTOM_REST_CONFIG` and the custom-aware `fixedRestDates`**

In `src/lib/roster.js`, replace lines 44-58 (the `FIXED_REST_PATTERN` declaration through the end of the current `fixedRestDates` function):

```js
export let FIXED_REST_PATTERN = [
  [0, 1], // Week 1: Sunday, Monday
  [4, 0], // Week 2: Thursday, Sunday
  [2, 6], // Week 3: Tuesday, Saturday
  [5, 0], // Week 4: Friday, Sunday
  [3, 6], // Week 5: Wednesday, Saturday
];
// Per-driver override for the global 5-week FIXED_REST_PATTERN above — a
// driver on a fixed weekly schedule can set the same weekday(s) off every
// week instead. Set once via setCustomRestConfig() after the driver's
// profile loads (see App.jsx); fixedRestDates() below checks it. Default
// (enabled: false) leaves every driver on the standard pattern, unchanged.
// See docs/superpowers/specs/2026-08-13-custom-rest-days-design.md.
let CUSTOM_REST_CONFIG = { enabled: false, weekdays: new Set(), since: null };
export function setCustomRestConfig(profile) {
  CUSTOM_REST_CONFIG = {
    enabled: !!profile?.custom_rest_days_enabled,
    weekdays: new Set(profile?.custom_rest_weekdays || []),
    since: profile?.custom_rest_days_since || null,
  };
}
export function fixedRestDates(periodStartDate) {
  const standard = [];
  FIXED_REST_PATTERN.forEach((weekdays, wIdx) => {
    const weekStart = addDays(periodStartDate, wIdx * 7);
    weekdays.forEach(wd => standard.push(addDays(weekStart, wd)));
  });
  if (!CUSTOM_REST_CONFIG.enabled) return standard;

  // Forward-only: dates before `since` keep whatever the standard pattern
  // already gave them; only dates on/after `since` switch to the driver's
  // custom weekly weekday(s), replacing (not adding to) the standard
  // pattern for those dates.
  const since = CUSTOM_REST_CONFIG.since;
  const kept = since ? standard.filter(d => d < since) : [];
  const custom = [];
  for (let i = 0; i < 35; i++) {
    const d = addDays(periodStartDate, i);
    if (since && d < since) continue;
    const weekday = new Date(d + "T12:00:00").getDay();
    if (CUSTOM_REST_CONFIG.weekdays.has(weekday)) custom.push(d);
  }
  return [...kept, ...custom];
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- roster.test.js`
Expected: PASS — all tests in the file, including the pre-existing `weekHighlights`/`dayInfo`/`getSeq` blocks (confirms the disabled-by-default path hasn't regressed anything).

- [ ] **Step 5: Commit**

```bash
git add src/lib/roster.js src/lib/roster.test.js
git commit -m "feat: add per-driver custom rest-day config to roster.js"
```

---

### Task 3: Wire profile fetch/save through App.jsx

**Files:**
- Modify: `src/App.jsx:7-8` (imports), `src/App.jsx:64-66` (state), `src/App.jsx:120-130` (profile-fetch effect), `src/App.jsx:185-189` (new handler, after `handleChangeFirstName`), `src/App.jsx:449-450` (prop passing to `SettingsPanel`)

**Interfaces:**
- Consumes: `setCustomRestConfig` from Task 2 (`./lib/roster.js`), `today()` from `./lib/dutyMath.js` (already exists, exported, just not currently imported in `App.jsx`).
- Produces: `driverCustomRestDays` state — `{ enabled: boolean, weekdays: number[], since: string|null }` — and `handleChangeCustomRestDays(enabled, weekdays): Promise<boolean>`, both passed to `SettingsPanel` as props of the same name for Task 4 to consume.

- [ ] **Step 1: Add the new imports**

In `src/App.jsx`, change line 7:

```js
import { isCalendarSunday, addDays, fmtShort, uid, today } from "./lib/dutyMath.js";
```

And change line 8:

```js
import { loadRosterData, applyRosterData, periodForDate, setCustomRestConfig } from "./lib/roster.js";
```

- [ ] **Step 2: Add the new state**

After line 65 (`const [driverFirstName, setDriverFirstName] = useState(null);`), add:

```js
  const [driverCustomRestDays, setDriverCustomRestDays] = useState({ enabled: false, weekdays: [], since: null });
```

- [ ] **Step 3: Extend the profile-fetch effect**

Replace the existing effect at lines 120-130:

```js
  useEffect(() => {
    if (!session) { setDriverGarage(undefined); setDriverFirstName(null); setCustomRestConfig(null); return; }
    let cancelled = false;
    supabase.from("profiles")
      .select("garage, first_name, custom_rest_days_enabled, custom_rest_weekdays, custom_rest_days_since")
      .eq("id", session.user.id).single()
      .then(({ data, error }) => {
        if (cancelled) return;
        setDriverGarage(error ? null : data?.garage ?? null);
        setDriverFirstName(error ? null : data?.first_name ?? null);
        setCustomRestConfig(error ? null : data);
        setDriverCustomRestDays({
          enabled: !!data?.custom_rest_days_enabled,
          weekdays: data?.custom_rest_weekdays || [],
          since: data?.custom_rest_days_since || null,
        });
      });
    return () => { cancelled = true; };
  }, [session?.user?.id]);
```

- [ ] **Step 4: Add the change handler**

After `handleChangeFirstName` (the function ending at line 189), add:

```js
  // Stamps `since` to today only on the OFF -> ON transition — editing the
  // weekday selection while already enabled must not reset it. See
  // docs/superpowers/specs/2026-08-13-custom-rest-days-design.md.
  async function handleChangeCustomRestDays(enabled, weekdays) {
    const since = (enabled && !driverCustomRestDays.enabled) ? today() : driverCustomRestDays.since;
    const { error } = await supabase.from("profiles").update({
      custom_rest_days_enabled: enabled,
      custom_rest_weekdays: weekdays,
      custom_rest_days_since: since,
    }).eq("id", session.user.id);
    if (!error) {
      const next = { enabled, weekdays, since };
      setDriverCustomRestDays(next);
      setCustomRestConfig({
        custom_rest_days_enabled: enabled,
        custom_rest_weekdays: weekdays,
        custom_rest_days_since: since,
      });
    }
    return !error;
  }
```

- [ ] **Step 5: Pass the new props to `SettingsPanel`**

Change line 449-450 from:

```js
          driverGarage={driverGarage} onChangeGarage={handleChangeGarage}
          driverFirstName={driverFirstName} onChangeFirstName={handleChangeFirstName}
```

to:

```js
          driverGarage={driverGarage} onChangeGarage={handleChangeGarage}
          driverFirstName={driverFirstName} onChangeFirstName={handleChangeFirstName}
          driverCustomRestDays={driverCustomRestDays} onChangeCustomRestDays={handleChangeCustomRestDays}
```

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: builds cleanly, no import/reference errors. (`SettingsPanel` doesn't destructure the two new props yet until Task 4 — that's fine, unused props passed to a component are not a build error.)

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "feat: fetch/save custom rest-day profile fields in App.jsx"
```

---

### Task 4: Settings UI — "Fixed rest days" section

**Files:**
- Modify: `src/screens/SettingsPanel.jsx:5` (theme import), `src/screens/SettingsPanel.jsx:10` (prop destructuring), plus new state/handler/JSX inside the component.

**Interfaces:**
- Consumes: `driverCustomRestDays` (`{ enabled, weekdays, since }`) and `onChangeCustomRestDays(enabled, weekdays)` props from Task 3.

- [ ] **Step 1: Add `ACCENT` to the theme import**

Change line 5:

```js
import { CARD, CARD2, BORDER, TEXT, MUTED, SUCCESS, DANGER, ACCENT, cardStyle, inputStyle, btnStyle } from "../lib/theme.js";
```

- [ ] **Step 2: Add a module-level weekday label constant**

After the imports (after line 7, before the `SettingsPanel` export on line 10), add:

```js
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // index = Date.getDay(), matches roster.js's convention
```

- [ ] **Step 3: Destructure the new props and add local state**

Change line 10 from:

```js
export function SettingsPanel({period, onClose, onThemeChange, leaveSettings, onLeaveSettingsChange, onReplayTour, onViewTerms, onViewFAQ, onEditStartDate, driverGarage, onChangeGarage, driverFirstName, onChangeFirstName, onSendFeedback}) {
```

to:

```js
export function SettingsPanel({period, onClose, onThemeChange, leaveSettings, onLeaveSettingsChange, onReplayTour, onViewTerms, onViewFAQ, onEditStartDate, driverGarage, onChangeGarage, driverFirstName, onChangeFirstName, driverCustomRestDays, onChangeCustomRestDays, onSendFeedback}) {
```

After line 27 (`const [nameSaving, setNameSaving] = useState(false);`), add:

```js
  const [customRestEnabled, setCustomRestEnabled] = useState(driverCustomRestDays?.enabled || false);
  const [customRestWeekdays, setCustomRestWeekdays] = useState(driverCustomRestDays?.weekdays || []);
  const [customRestSaving, setCustomRestSaving] = useState(false);
```

- [ ] **Step 4: Add the toggle/save handlers**

After the `saveGarage` function (after line 96), add:

```js
  function toggleCustomWeekday(idx) {
    setCustomRestWeekdays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx].sort());
  }
  async function saveCustomRestDays() {
    if (customRestEnabled && customRestWeekdays.length === 0) { setToast("Pick at least one day before saving."); return; }
    setCustomRestSaving(true);
    const ok = await onChangeCustomRestDays(customRestEnabled, customRestWeekdays);
    setCustomRestSaving(false);
    setToast(ok ? "Fixed rest days saved." : "Couldn't save — try again.");
  }
```

- [ ] **Step 5: Add the JSX section**

After the Garage section's closing `)}` (line 186), and before the `{/* Default Zone */}` comment (line 188), add:

```jsx

        {/* Fixed Rest Days */}
        <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 10px"}}>Fixed rest days</p>
        <p style={{color:MUTED,fontSize:12,margin:"0 0 10px"}}>On a set weekly schedule? Turn this on and pick your days off — they'll repeat every week instead of the standard 5-week pattern.</p>
        <div style={{...cardStyle,marginBottom:20,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setCustomRestEnabled(e=>!e)}>
            <p style={{color:TEXT,fontSize:14,fontWeight:600,margin:0}}>Use fixed rest days</p>
            <div style={{width:44,height:26,borderRadius:13,background:customRestEnabled?SUCCESS:BORDER,position:"relative",transition:"background 0.2s",flexShrink:0}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:customRestEnabled?21:3,transition:"left 0.2s"}}/>
            </div>
          </div>
          {customRestEnabled && (
            <>
              <div style={{borderTop:`1px solid ${BORDER}`,margin:"14px 0"}}/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:12}}>
                {WEEKDAY_LABELS.map((label,idx)=>{
                  const sel = customRestWeekdays.includes(idx);
                  return (
                    <button key={idx} onClick={()=>toggleCustomWeekday(idx)} style={{
                      background: sel?ACCENT:CARD2, color: sel?"#07090F":MUTED,
                      border: sel?"none":`1px solid ${BORDER}`, borderRadius:8,
                      padding:"9px 2px", fontSize:12, fontWeight: sel?800:500, cursor:"pointer"
                    }}>{label}</button>
                  );
                })}
              </div>
            </>
          )}
          <button onClick={saveCustomRestDays} disabled={customRestSaving} style={{...btnStyle,padding:"10px 8px",fontSize:13,borderRadius:10,opacity:customRestSaving?0.6:1,marginTop:customRestEnabled?0:12}}>
            {customRestSaving?"Saving…":"Save"}
          </button>
        </div>
```

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: builds cleanly, no errors.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`, sign in, open Settings, scroll to "Fixed rest days". Turn it on, select two weekdays (e.g. Mon + Thu), Save — confirm the toast reads "Fixed rest days saved." and reloading the app keeps the toggle on with those two days still selected. Then open the Home/Period screen and confirm the next occurrence of one of those weekdays shows as a Rest Day.

- [ ] **Step 8: Commit**

```bash
git add src/screens/SettingsPanel.jsx
git commit -m "feat: add Fixed Rest Days section to Settings"
```
