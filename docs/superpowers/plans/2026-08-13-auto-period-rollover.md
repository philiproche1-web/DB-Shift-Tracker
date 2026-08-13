# Automatic Period Rollover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a driver opens the app and their active 5-week period has ended, silently archive it and start the next one — no confirmation needed — and show a one-time dismissible banner telling them it happened. Remove the manual "end period" mechanism entirely, since it's now both redundant and a footgun (it has no guard against firing before the period has actually ended).

**Architecture:** A pure function `rollPeriodsForward(periods, activePeriodId)` in `src/lib/roster.js` decides whether a rollover is needed and produces the rolled-forward state; it's called once from `App.jsx`'s existing mount-time `loadData().then(...)` callback. A `rolled: true` result both persists the change (same `saveData` path every other period mutation already uses) and sets banner state passed down to `HomeScreen`. The old manual path (`startNewPeriod()` in App.jsx, and its two trigger buttons on `PeriodScreen`/`ArchiveScreen`) is deleted.

**Tech Stack:** React (Vite), Supabase (Postgres + JS client, via existing `saveData`/sync), Vitest.

## Global Constraints

- Periods are fixed 35-day blocks of the real Dublin Bus roster cycle — never a personal choice. There is no "end early" concept.
- No advance heads-up before rollover — only a one-time FYI banner after it happens, shown once (the first app-open where the rollover actually occurred), never repeated.
- Catch-up is silent and full: if a driver is several periods behind, jump straight to the grid-aligned block containing today. Never manufacture empty periods for skipped gap weeks.
- The rollover check runs exactly once, in the initial mount load path — never in the background reconnect/sync handler — so it can never double-fire across tabs or reconnects.
- The manual rollover mechanism (`startNewPeriod()`, and both buttons that trigger it) is removed, not just hidden.
- No component/UI test framework exists in this repo — React changes are verified with `npm run build` plus manual checks, not new automated UI tests.

---

### Task 1: Core logic — `rollPeriodsForward` in roster.js

**Files:**
- Modify: `src/lib/roster.js:1` (dutyMath import), `src/lib/roster.js:211-215` (insert new function after `periodForDate`)
- Test: `src/lib/roster.test.js`

**Interfaces:**
- Consumes: `addDays`, `today`, `uid` from `./dutyMath.js` (`today`/`uid` are not currently imported in `roster.js` — `addDays` already is).
- Produces: `export function rollPeriodsForward(periods, activePeriodId)` → `{ periods, activePeriodId, rolled: boolean }`. Task 2 (App.jsx) calls this with the exact shape `loadData()` already returns (`data.periods || []`, `data.activePeriodId || null`).

- [ ] **Step 1: Write the failing tests**

Open `src/lib/roster.test.js`. Add `rollPeriodsForward` to the import from `./roster.js` (it already imports several named exports — add this one to that same line). Then add this new `describe` block anywhere after the existing ones:

```js
describe("rollPeriodsForward (automatic period rollover)", () => {
  const ACTIVE = { id: "a1", startDate: "2026-07-19", shifts: [], daysOff: [] }; // ends 2026-08-22

  it("no-ops when there is no active period", () => {
    const result = rollPeriodsForward([], null);
    expect(result).toEqual({ periods: [], activePeriodId: null, rolled: false });
  });

  it("no-ops when the active period has not ended yet", () => {
    setToday("2026-08-22"); // the period's last day
    const result = rollPeriodsForward([ACTIVE], "a1");
    expect(result.rolled).toBe(false);
    expect(result.periods).toEqual([ACTIVE]);
    expect(result.activePeriodId).toBe("a1");
  });

  it("archives the old period and starts the next one the day after it ends", () => {
    setToday("2026-08-23"); // one day past the period's end
    const result = rollPeriodsForward([ACTIVE], "a1");
    expect(result.rolled).toBe(true);
    expect(result.periods).toHaveLength(2);
    expect(result.periods[0]).toMatchObject({ id: "a1", archived: true });
    const next = result.periods[1];
    expect(next.startDate).toBe("2026-08-23");
    expect(next.id).toBe(result.activePeriodId);
    expect(next.shifts).toEqual([]);
    expect(next.daysOff).toEqual([]);
  });

  it("catches up across multiple skipped periods, staying grid-aligned, with no periods manufactured in between", () => {
    setToday("2026-10-15"); // several periods past 2026-07-19
    const result = rollPeriodsForward([ACTIVE], "a1");
    expect(result.rolled).toBe(true);
    expect(result.periods).toHaveLength(2); // still just the old (archived) + the new one — no intermediate periods
    const next = result.periods[1];
    // Grid-aligned 35-day steps from 2026-07-19: 07-19 -> 08-23 -> 09-27 (..10-31) -> 11-01.
    // 2026-10-15 falls inside the 09-27..10-31 block, so that's the one that becomes active.
    expect(next.startDate).toBe("2026-09-27");
  });
});
```

This test uses a `setToday` helper that doesn't exist yet — `today()` in `dutyMath.js` is `new Date().toISOString().slice(0,10)` with no override hook, and this codebase's other date-dependent tests avoid calling `today()` at all rather than mocking it. Do NOT invent a mocking mechanism. Instead, replace every `setToday("...")` call above with Vitest's built-in fake timers, added as a `beforeEach`/`afterEach` pair at the top of this `describe` block:

```js
import { vi } from "vitest"; // add to the existing `import { describe, it, expect, afterEach } from "vitest";` line

// ... inside the describe block, before the it()s:
afterEach(() => { vi.useRealTimers(); });
function setToday(dateStr) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(dateStr + "T12:00:00"));
}
```

Replace each `setToday("YYYY-MM-DD")` call in the tests above with this real implementation (they're written as calls to it already — just make sure this helper and its imports are added once at the top of the describe block, not per-test).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- roster.test.js`
Expected: FAIL — `rollPeriodsForward is not a function` (or a Vitest import error).

- [ ] **Step 3: Implement `rollPeriodsForward`**

In `src/lib/roster.js`, change line 1's import to add `today` and `uid`:

```js
import { addDays, fmtHrs, maxConsec, dayOffTally, inPeriod, wkStats, today, uid } from "./dutyMath.js";
```

Then insert this new function right after `periodForDate` (after line 215, before the `dayInfo` comment block that currently starts at line 216):

```js
// Auto-advances the active period once it's ended, so drivers don't have to
// remember to manually end one (see
// docs/superpowers/specs/2026-08-13-auto-period-rollover-design.md). Called
// once from App.jsx right after periods load. Silently catches up to
// whichever grid-aligned 35-day block contains today if the driver's been
// away more than one period — no empty periods are manufactured for the
// gap, since nothing was ever logged there. `rolled: true` only on the
// exact call where the boundary was actually crossed, which doubles as the
// one-shot signal for showing the "new period started" banner.
export function rollPeriodsForward(periods, activePeriodId) {
  const active = periods.find(p => p.id === activePeriodId);
  if (!active) return { periods, activePeriodId, rolled: false };
  const now = today();
  if (now <= addDays(active.startDate, 34)) return { periods, activePeriodId, rolled: false };
  let start = active.startDate;
  while (now > addDays(start, 34)) start = addDays(start, 35);
  const archived = periods.map(p => p.id === activePeriodId ? { ...p, archived: true } : p);
  const next = { id: uid(), startDate: start, shifts: [], daysOff: [], createdAt: new Date().toISOString() };
  return { periods: [...archived, next], activePeriodId: next.id, rolled: true };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- roster.test.js`
Expected: PASS — all tests in the file, including every pre-existing block (confirms `vi.useFakeTimers()` in the new tests doesn't leak into or break unrelated tests — the `afterEach(() => vi.useRealTimers())` above is what prevents that).

- [ ] **Step 5: Commit**

```bash
git add src/lib/roster.js src/lib/roster.test.js
git commit -m "feat: add rollPeriodsForward for automatic period rollover"
```

---

### Task 2: Wire the rollover check + banner state into App.jsx, remove manual rollover

**Files:**
- Modify: `src/App.jsx:8` (roster.js import), `src/App.jsx:68-69` (new state), `src/App.jsx:166-177` (mount effect), `src/App.jsx:364-376` (delete `startNewPeriod`), `src/App.jsx:438-462` (HomeScreen/PeriodScreen/ArchiveScreen prop changes)

**Interfaces:**
- Consumes: `rollPeriodsForward` from Task 1 (`./lib/roster.js`).
- Produces: `justRolledPeriod` state (`{id, startDate, shifts, daysOff, createdAt} | null`) and a dismiss handler, passed to `HomeScreen` as `justRolledPeriod={justRolledPeriod} onDismissRolloverBanner={...}` for Task 3 to consume.

- [ ] **Step 1: Add `rollPeriodsForward` to the roster.js import**

Change line 8:

```js
import { loadRosterData, applyRosterData, periodForDate, setCustomRestConfig, rollPeriodsForward } from "./lib/roster.js";
```

- [ ] **Step 2: Add banner state**

After line 69 (`const [confirmFeedback, setConfirmFeedback] = useState(false);`), add:

```js
  const [justRolledPeriod, setJustRolledPeriod] = useState(null);
```

- [ ] **Step 3: Call the rollover check in the mount effect**

Replace lines 166-177:

```js
    loadData().then(({data,corrupted})=>{
      if(corrupted) { setLoadCorrupted(true); setLoading(false); return; }
      if(data){
        const rolled = rollPeriodsForward(data.periods||[], data.activePeriodId||null);
        setPeriods(rolled.periods); setActivePeriodId(rolled.activePeriodId);
        if (rolled.rolled) {
          saveData({periods: rolled.periods, activePeriodId: rolled.activePeriodId});
          setJustRolledPeriod(rolled.periods.find(p => p.id === rolled.activePeriodId));
        }
      }
      const terms = localStorage.getItem("dbus_terms");
      if(!terms) { setTermsAccepted(false); setLoading(false); return; }
      const seenVersion = localStorage.getItem("dbus_version");
      const isNewInstall = !seenVersion;
      if(seenVersion !== APP_VERSION && (isNewInstall || WHATS_NEW.showToExisting)) setShowWhatsNew(true);
      const toured = localStorage.getItem("dbus_toured");
      if(!toured) setShowTour(true);
      setLoading(false);
    });
```

- [ ] **Step 4: Delete `startNewPeriod`**

Delete the entire function at lines 364-376 (from `function startNewPeriod() {` through its closing `}`):

```js
  function startNewPeriod() {
    const currentEnd = addDays(activePeriod.startDate,34);
    const nextStart = addDays(activePeriod.startDate,35);
    setConfirm({
      msg:`Start a new 5-week period beginning ${fmtShort(nextStart)}? The period ending ${fmtShort(currentEnd)} will be archived.`,
      yesLabel:"Start New Period", danger:false,
      onYes:()=>{
        const np={id:uid(),startDate:nextStart,shifts:[],daysOff:[],createdAt:new Date().toISOString()};
        const updated=periods.map(p=>p.id===activePeriodId?{...p,archived:true}:p);
        persist([...updated,np],np.id); setConfirm(null); setArchiveViewId(null); setScreen("home");
      }
    });
  }
```

- [ ] **Step 5: Update the `HomeScreen` render to pass banner props**

Change (lines 438-445):

```js
      {screen==="home"&&<HomeScreen period={activePeriod} periods={periods}
        alerts={routeAlerts}
        onViewAlerts={()=>setScreen("alerts")}
        driverFirstName={driverFirstName}
        onLog={()=>{setEditShift(null);setLogInitDate(null);setLogInitRestDay(false);setScreen("log");}}
        onLogDate={(date,opts)=>{setEditShift(null);setLookupDuty(null);setLogInitDate(date);setLogInitRestDay(!!opts?.isRestDay);setScreen("log");}}
        onGoWeek={i=>{setOpenWeek(i);setScreen("period");}}
        onOpenSettings={()=>setShowSettings(true)}/>}
```

to:

```js
      {screen==="home"&&<HomeScreen period={activePeriod} periods={periods}
        alerts={routeAlerts}
        onViewAlerts={()=>setScreen("alerts")}
        driverFirstName={driverFirstName}
        onLog={()=>{setEditShift(null);setLogInitDate(null);setLogInitRestDay(false);setScreen("log");}}
        onLogDate={(date,opts)=>{setEditShift(null);setLookupDuty(null);setLogInitDate(date);setLogInitRestDay(!!opts?.isRestDay);setScreen("log");}}
        onGoWeek={i=>{setOpenWeek(i);setScreen("period");}}
        justRolledPeriod={justRolledPeriod} onDismissRolloverBanner={()=>setJustRolledPeriod(null)}
        onOpenSettings={()=>setShowSettings(true)}/>}
```

- [ ] **Step 6: Remove the manual-rollover prop from `PeriodScreen`**

Change (lines 446-454):

```js
      {screen==="period"&&<PeriodScreen period={activePeriod} initWeek={openWeek}
        onEdit={s=>{setEditShift(s);setScreen("log");}}
        onDelete={deleteShift}
        onEditDayOff={d=>{setEditDayOff(d);setDayOffFrom("period");setScreen("dayoff");}}
        onDeleteDayOff={deleteDayOff}
        onViewArchive={()=>setScreen("archive")}
        onEndPeriod={startNewPeriod}
        onViewFAQ={cat=>setViewingFAQ(cat)}
        onOpenSettings={()=>setShowSettings(true)}/>}
```

to:

```js
      {screen==="period"&&<PeriodScreen period={activePeriod} initWeek={openWeek}
        onEdit={s=>{setEditShift(s);setScreen("log");}}
        onDelete={deleteShift}
        onEditDayOff={d=>{setEditDayOff(d);setDayOffFrom("period");setScreen("dayoff");}}
        onDeleteDayOff={deleteDayOff}
        onViewArchive={()=>setScreen("archive")}
        onViewFAQ={cat=>setViewingFAQ(cat)}
        onOpenSettings={()=>setShowSettings(true)}/>}
```

- [ ] **Step 7: Remove the manual-rollover prop from `ArchiveScreen`**

Change (lines 460-462):

```js
      {screen==="archive"&&<ArchiveScreen periods={periods} activePeriodId={activePeriodId}
        onStartNew={startNewPeriod} onView={id=>setArchiveViewId(id)}
        onOpenSettings={()=>setShowSettings(true)}/>}
```

to:

```js
      {screen==="archive"&&<ArchiveScreen periods={periods} activePeriodId={activePeriodId}
        onView={id=>setArchiveViewId(id)}
        onOpenSettings={()=>setShowSettings(true)}/>}
```

- [ ] **Step 8: Verify the build**

Run: `npm run build`
Expected: builds cleanly, no import/reference errors. (`HomeScreen` doesn't destructure the two new props yet, and `PeriodScreen`/`ArchiveScreen` still destructure `onEndPeriod`/`onStartNew` as unused props until Task 3 — neither is a build error.)

- [ ] **Step 9: Commit**

```bash
git add src/App.jsx
git commit -m "feat: auto-roll periods on load, remove manual rollover trigger"
```

---

### Task 3: Banner component + Home/Period/Archive screen updates

**Files:**
- Modify: `src/components/shared.jsx:2` (dutyMath import), plus new export; `src/screens/HomeScreen.jsx:8` (shared.jsx import), `:205` (prop destructuring), `:312-318` (JSX); `src/screens/PeriodScreen.jsx:9` (prop destructuring), `:179-183` (delete button); `src/screens/ArchiveScreen.jsx:8` (prop destructuring), `:14` (delete button), `:19` (copy update)

**Interfaces:**
- Consumes: `justRolledPeriod`/`onDismissRolloverBanner` props from Task 2.

- [ ] **Step 1: Add the `NewPeriodBanner` component**

In `src/components/shared.jsx`, change line 2:

```js
import { fmtHrs, addDays, fmtShort } from "../lib/dutyMath.js";
```

Then add this new export anywhere after the imports (e.g. right before `RouteAlertBanner`):

```jsx
export function NewPeriodBanner({period, onDismiss}) {
  return (
    <div style={{...cardStyle,padding:"14px 16px",marginBottom:12,display:"flex",gap:10,alignItems:"center"}}>
      <div style={{flex:1,minWidth:0}}>
        <p style={{color:TEXT,fontSize:13.5,fontWeight:700,margin:"0 0 2px"}}>New 5-week period started</p>
        <p style={{color:MUTED,fontSize:12,margin:0}}>{fmtShort(period.startDate)} – {fmtShort(addDays(period.startDate,34))} · your last one's been archived</p>
      </div>
      <button onClick={onDismiss} style={{background:"none",border:"none",color:MUTED,fontSize:18,cursor:"pointer",padding:"0 4px",flexShrink:0}}>×</button>
    </div>
  );
}
```

- [ ] **Step 2: Render it on `HomeScreen`**

In `src/screens/HomeScreen.jsx`, change line 8:

```js
import { RouteAlertBanner, NewPeriodBanner, WeatherChip, SettingsButton } from "../components/shared.jsx";
```

Change line 205's prop destructuring from:

```js
export function HomeScreen({period, periods, alerts, onViewAlerts, driverFirstName, onLog, onLogDate, onGoWeek, onOpenSettings}) {
```

to:

```js
export function HomeScreen({period, periods, alerts, onViewAlerts, driverFirstName, onLog, onLogDate, onGoWeek, justRolledPeriod, onDismissRolloverBanner, onOpenSettings}) {
```

Then in the JSX, change (lines 312-318):

```jsx
      <div style={{padding:"0 16px"}}>

        <WeekHighlightsCard highlights={thisWeekHighlights}/>

        <UpcomingCarousel periods={periods} activePeriodId={period.id} todayDate={todayDate} onLogDate={onLogDate}/>

        <RouteAlertBanner alerts={activeAlerts} onView={onViewAlerts}/>
```

to:

```jsx
      <div style={{padding:"0 16px"}}>

        {justRolledPeriod && <NewPeriodBanner period={justRolledPeriod} onDismiss={onDismissRolloverBanner}/>}

        <WeekHighlightsCard highlights={thisWeekHighlights}/>

        <UpcomingCarousel periods={periods} activePeriodId={period.id} todayDate={todayDate} onLogDate={onLogDate}/>

        <RouteAlertBanner alerts={activeAlerts} onView={onViewAlerts}/>
```

- [ ] **Step 3: Remove the manual-rollover button from `PeriodScreen`**

Change line 9's prop destructuring from:

```js
export function PeriodScreen({period, onEdit, onDelete, onEditDayOff, onDeleteDayOff, onViewArchive, onEndPeriod, onViewFAQ, onOpenSettings, initWeek=null, readOnly=false}) {
```

to:

```js
export function PeriodScreen({period, onEdit, onDelete, onEditDayOff, onDeleteDayOff, onViewArchive, onViewFAQ, onOpenSettings, initWeek=null, readOnly=false}) {
```

Delete lines 179-183:

```jsx
      {!readOnly && (
        <button onClick={onEndPeriod} style={{...btnStyle,marginTop:4,marginBottom:12}}>
          {today() > addDays(period.startDate,34) ? "This period has ended — start a new one" : "End period & start new"}
        </button>
      )}
```

- [ ] **Step 4: Remove the manual-rollover button from `ArchiveScreen`, update empty-state copy**

Change line 8's prop destructuring from:

```js
export function ArchiveScreen({periods, activePeriodId, onStartNew, onView, onOpenSettings}) {
```

to:

```js
export function ArchiveScreen({periods, activePeriodId, onView, onOpenSettings}) {
```

Delete line 14:

```jsx
      <button style={{...btnStyle,marginBottom:20}} onClick={onStartNew}>Start New Period</button>
```

Change line 19's empty-state body copy from:

```jsx
          body="When you start a new period, the current one moves here for safe keeping."
```

to:

```jsx
          body="Once your 5-week period ends, the previous one moves here automatically."
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: builds cleanly, no unused-import errors (check whether `btnStyle` is still used elsewhere in `ArchiveScreen.jsx` and `PeriodScreen.jsx` after the button removal — if either file's only use of `btnStyle` was the deleted button, remove `btnStyle` from that file's import too; if it's still used elsewhere in the file, leave the import as-is).

- [ ] **Step 6: Manual verification**

Run `npm run dev`, sign in, and confirm: Period screen no longer shows an "End period" button; Archive screen no longer shows a "Start New Period" button and its empty state reads the updated copy; Home screen renders normally (no banner, since no rollover has occurred in this session).

- [ ] **Step 7: Commit**

```bash
git add src/components/shared.jsx src/screens/HomeScreen.jsx src/screens/PeriodScreen.jsx src/screens/ArchiveScreen.jsx
git commit -m "feat: add new-period banner, remove manual rollover buttons"
```
