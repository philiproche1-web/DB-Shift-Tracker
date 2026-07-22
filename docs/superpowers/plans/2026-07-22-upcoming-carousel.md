# Home Screen Upcoming Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a swipeable 3-day-visible carousel to the top of the Home screen showing what's logged (shift / rest day / leave / nothing) for a rolling window of days around today, with tap-to-log on unlogged days.

**Architecture:** Two new React components (`UpcomingCarousel`, `UpcomingDayCard`) and one new pure helper (`dayInfo`) added to the existing single-file `src/App.jsx`, following the codebase's established one-file convention — no new files. The carousel renders a fixed 29-day range (7 days back, today, 21 days forward) in a native `overflow-x:auto` + `scroll-snap` strip, defaulting scrolled to today. Tapping an unlogged day threads a new `initialDate` down to `LogScreen` via one new piece of state in the root `App` component, reusing the exact same `date`-priority-chain pattern `LogScreen` already uses for `lookupDuty`/`editShift`.

**Tech Stack:** React (existing `useState`/`useEffect`/`useMemo`, plus newly-imported `useRef`), inline style objects (existing convention throughout `App.jsx` — no CSS modules, no new dependencies).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-22-upcoming-carousel-design.md` — read this first, it's the source of truth for behavior.
- Single file only: all changes go in `src/App.jsx`. Do not create new component files — this codebase deliberately keeps everything in one file.
- No new npm dependencies. No carousel library — native scroll + CSS scroll-snap only.
- No test framework exists in this project (`package.json` has no `test` script). Verification for every task is: `npm run build` clean, `npm run lint` clean (no new warnings beyond the existing pre-existing ones), then live-check in the Browser pane against the `db-tracker` dev server (`.claude/launch.json`, port 5180) — this is the project's actual established verification method, used for every prior feature in this codebase.
- Reuse existing design tokens only: `ACCENT`, `DANGER`, `MUTED`, `TEXT`, `BORDER`, `CARD` (all module-scope `let`/`const` around `src/App.jsx:248-250`). Do not introduce new colors.
- Existing pre-existing lint warnings (unused vars in unrelated code, the `react-hooks/exhaustive-deps` one at `App.jsx:1099`) are not yours to fix — don't touch them, don't let new work add to the count.

---

### Task 1: `dayInfo()` helper + `useRef` import

**Files:**
- Modify: `src/App.jsx:1` (import line)
- Modify: `src/App.jsx:144` (right after the existing `inPeriod` function)

**Interfaces:**
- Consumes: existing `inPeriod(date, p)` (`App.jsx:144`), `withFixedRestDays(startDate, daysOff, shifts, removedFixed)` (`App.jsx:121`) — both already defined above this insertion point, no changes needed to either.
- Produces: `dayInfo(period, date)` — returns one of:
  - `{status: "shift", date, shift}` where `shift` is the matching entry from `period.shifts`
  - `{status: "dayoff", date, dayOff}` where `dayOff` is the matching entry from the fixed-rest-merged days-off list (shape `{id, date, type, fixed?}`)
  - `{status: "unlogged", date}` — covers both "nothing logged for an in-range date" and "date falls outside this period" (per spec, both get identical treatment)
  Task 2 and Task 3 both call this function; its return shape is final as written here.

- [ ] **Step 1: Add `useRef` to the React import**

Current line 1:
```js
import { useState, useEffect, useMemo } from "react";
```
Change to:
```js
import { useState, useEffect, useMemo, useRef } from "react";
```

- [ ] **Step 2: Add `dayInfo()` right after `inPeriod` (currently `App.jsx:144`)**

Find:
```js
function inPeriod(date, p) { return date >= p.startDate && date <= addDays(p.startDate, 34); }
```
Add immediately after it:
```js
// Resolves what (if anything) is logged for a single date within a period —
// a shift, a day off (including auto-merged fixed rest days), or nothing.
// Dates outside the period's range are treated identically to "nothing
// logged" per the Home screen carousel spec — no separate error state.
function dayInfo(period, date) {
  if (!period || !inPeriod(date, period)) return { status: "unlogged", date };
  const shift = (period.shifts || []).find(s => s.date === date);
  if (shift) return { status: "shift", date, shift };
  const mergedDaysOff = withFixedRestDays(period.startDate, period.daysOff || [], period.shifts || [], period.removedFixedRestDates);
  const dayOff = mergedDaysOff.find(d => d.date === date);
  if (dayOff) return { status: "dayoff", date, dayOff };
  return { status: "unlogged", date };
}
```

- [ ] **Step 3: Verify it evaluates correctly**

Run: `cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App" && npm run build`
Expected: `✓ built in` with no errors (this is a pure addition, nothing calls `dayInfo` yet, so this only proves it parses).

Run: `npm run lint`
Expected: same warning count as before this change (no new warnings — `dayInfo` and its params are all used within the function body).

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App"
git add src/App.jsx
git commit -m "$(cat <<'EOF'
Add dayInfo() helper for per-date shift/dayoff/unlogged lookup

Pure function backing the upcoming-days carousel (next task) - resolves
what's logged for any single date within a period, reusing the existing
inPeriod/withFixedRestDays helpers rather than duplicating their logic.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `UpcomingCarousel` + `UpcomingDayCard` components, rendered on Home

**Files:**
- Modify: `src/App.jsx` — insert two new component functions immediately before `function HomeScreen` (currently `App.jsx:865`), matching where `TodayDutyCard` (`App.jsx:776`) already sits right before its consumer.
- Modify: `src/App.jsx:902-903` area — render `<UpcomingCarousel>` as the first thing inside `HomeScreen`'s content div, above the backup-nudge banner and the Today's Duty card.
- Modify: `src/App.jsx:865` — `HomeScreen`'s prop signature (add `onLogDate`, wired for real in Task 3; this task can pass a temporary no-op so the component renders standalone).
- Modify: `src/App.jsx:2796` area — the `<HomeScreen ...>` call site in the root `App` component, add a temporary `onLogDate={()=>{}}` (Task 3 replaces this with the real handler).

**Interfaces:**
- Consumes: `dayInfo(period, date)` from Task 1, `addDays(s,n)` (`App.jsx:22`), `fmtShort(s)` (`App.jsx:29`), `today()` (`App.jsx:40`), design tokens `ACCENT/DANGER/MUTED/TEXT/BORDER/CARD` (`App.jsx:248-250`).
- Produces: `<UpcomingCarousel period={period} todayDate={todayDate} onLogDate={fn}/>` — `onLogDate` is called with a single `date` string (`YYYY-MM-DD`) when the user taps an unlogged day's card. Task 3 is the only consumer of this callback; this task can pass `()=>{}` and everything still renders/scrolls correctly (tapping just won't do anything yet).

- [ ] **Step 1: Add the two new components, right before `function HomeScreen` (`App.jsx:865`)**

Insert immediately before line 865:
```jsx
// ─── UPCOMING CAROUSEL ──────────────────────────────────────────────────────
// Fixed 29-day window (7 back, today, 21 forward) in a native scroll-snap
// strip, defaulted scrolled so today is the first of 3 visible cards. No
// infinite loading — if a driver ever wants to swipe further than 3 weeks
// out, that's a follow-up, not needed for the initial ask.
const CAROUSEL_DAYS_BACK = 7;
const CAROUSEL_DAYS_FORWARD = 21;
const carouselArrowStyle = {background:CARD,border:`1px solid ${BORDER}`,color:MUTED,borderRadius:10,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0};

function UpcomingDayCard({date, isToday, info, onLogDate}) {
  const dayLabel = new Date(date+"T12:00:00").toLocaleDateString("en-IE", {weekday:"short"});
  const dateLabel = fmtShort(date);
  let body;
  if (info.status === "shift") {
    body = (
      <>
        <p style={{color:TEXT,fontSize:13,fontWeight:700,margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{info.shift.roster}</p>
        <p style={{color:MUTED,fontSize:11,margin:0}}>{info.shift.reportTime}–{info.shift.signOffTime}</p>
      </>
    );
  } else if (info.status === "dayoff") {
    const isRest = info.dayOff.type === "Rest Day";
    body = <p style={{color:isRest?DANGER:ACCENT,fontSize:12,fontWeight:700,margin:0}}>{info.dayOff.type}</p>;
  } else {
    body = <p style={{color:MUTED,fontSize:12,margin:0}}>Not logged</p>;
  }
  const clickable = info.status === "unlogged";
  return (
    <div
      onClick={clickable ? () => onLogDate(date) : undefined}
      style={{
        background:CARD, border:`1px solid ${isToday?ACCENT:BORDER}`, borderRadius:14,
        padding:"10px 10px", flex:"0 0 calc(33.333% - 6px)",
        scrollSnapAlign:"start", cursor:clickable?"pointer":"default"
      }}>
      <p style={{color:isToday?ACCENT:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:0.5,fontWeight:700,margin:"0 0 2px"}}>{dayLabel} {dateLabel}</p>
      {body}
    </div>
  );
}

function UpcomingCarousel({period, todayDate, onLogDate}) {
  const containerRef = useRef(null);
  const dates = useMemo(() => {
    const arr = [];
    for (let i = -CAROUSEL_DAYS_BACK; i <= CAROUSEL_DAYS_FORWARD; i++) arr.push(addDays(todayDate, i));
    return arr;
  }, [todayDate]);
  const todayIndex = CAROUSEL_DAYS_BACK;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !el.children[todayIndex]) return;
    el.scrollLeft = el.children[todayIndex].offsetLeft;
  }, [todayIndex]);

  function scrollByCard(dir) {
    const el = containerRef.current;
    if (!el || !el.children[0]) return;
    const cardEl = el.children[0];
    const gap = parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap || "0");
    el.scrollBy({ left: dir * (cardEl.offsetWidth + gap), behavior: "smooth" });
  }

  return (
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <button aria-label="Earlier days" onClick={()=>scrollByCard(-1)} style={carouselArrowStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div ref={containerRef} className="upcoming-carousel-track" style={{display:"flex",gap:8,overflowX:"auto",scrollSnapType:"x mandatory",flex:1}}>
          {dates.map((date, i) => (
            <UpcomingDayCard key={date} date={date} isToday={i===todayIndex} info={dayInfo(period, date)} onLogDate={onLogDate}/>
          ))}
        </div>
        <button aria-label="Later days" onClick={()=>scrollByCard(1)} style={carouselArrowStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <style>{`.upcoming-carousel-track{-webkit-overflow-scrolling:touch;scrollbar-width:none}.upcoming-carousel-track::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}

```

- [ ] **Step 2: Render it at the top of `HomeScreen`, add the `onLogDate` prop**

In `HomeScreen`'s signature (currently `App.jsx:865`):
```js
function HomeScreen({period, onLog, onGoWeek, onHelp, onThemeChange, leaveSettings, onLeaveSettingsChange, onViewTerms}) {
```
Change to:
```js
function HomeScreen({period, onLog, onLogDate, onGoWeek, onHelp, onThemeChange, leaveSettings, onLeaveSettingsChange, onViewTerms}) {
```

Then find (currently `App.jsx:929-931`):
```jsx
      <div style={{padding:"0 16px"}}>

        {showBackupNudge && <BackupNudgeBanner onDismiss={()=>setBackupBannerDismissed(true)} />}
```
Change to:
```jsx
      <div style={{padding:"0 16px"}}>

        <UpcomingCarousel period={period} todayDate={todayDate} onLogDate={onLogDate}/>

        {showBackupNudge && <BackupNudgeBanner onDismiss={()=>setBackupBannerDismissed(true)} />}
```

- [ ] **Step 3: Pass a temporary no-op `onLogDate` from the root `App` component**

Find the `<HomeScreen` call site (currently `App.jsx:2796-2803`):
```jsx
      {screen==="home"&&<HomeScreen period={activePeriod}
        onLog={()=>{setEditShift(null);setScreen("log");}}
        onGoWeek={i=>{setOpenWeek(i);setScreen("period");}}
```
Change to:
```jsx
      {screen==="home"&&<HomeScreen period={activePeriod}
        onLog={()=>{setEditShift(null);setScreen("log");}}
        onLogDate={()=>{}}
        onGoWeek={i=>{setOpenWeek(i);setScreen("period");}}
```
(Task 3 replaces this `()=>{}` with the real handler — this task just needs the prop present so `HomeScreen` doesn't crash calling `onLogDate` on tap.)

- [ ] **Step 4: Build and lint**

Run: `cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App" && npm run build`
Expected: `✓ built in` with no errors.

Run: `npm run lint`
Expected: same pre-existing warning count as Task 1 (no new ones — every new variable/prop here is used).

- [ ] **Step 5: Live-verify in the Browser pane**

1. Ensure the dev server is running: `preview_start` with `{name: "db-tracker"}` (per `.claude/launch.json`, port 5180) — if another session already has it up, `navigate` to `http://localhost:5180` directly instead.
2. `read_page` (filter `all`) on the Home screen. Confirm a new row of day-cards appears above the "Today's Duty" / "No duty logged for today" card, with 3 cards visible, today's card showing an accent-colored border and today's actual date.
3. `computer` click the right chevron arrow (or simulate a swipe). Confirm the visible cards shift forward by one day (re-`read_page` and compare the leftmost card's date before/after).
4. Click the left chevron. Confirm it shifts back correctly, including scrolling to a day *before* today (should show whatever's logged for yesterday, or "Not logged").
5. If test/dev data has no logged shifts yet, confirm every card reads "Not logged" (not a crash, not blank) — this exercises the `dayInfo` "unlogged" path end-to-end.
6. `resize_window` to `mobile` preset (375×812) and re-check: confirm no horizontal overflow of the whole page (only the carousel strip itself should scroll, not the page), 3 cards fit without visually overlapping or getting cut off.

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App"
git add src/App.jsx
git commit -m "$(cat <<'EOF'
Add UpcomingCarousel to Home screen

Swipeable 3-day-visible strip above Today's Duty showing what's logged
(shift/rest/leave/unlogged) for a rolling window of days, native
scroll-snap + chevron buttons, defaults centered on today.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Tap-to-log wiring for unlogged days

**Files:**
- Modify: `src/App.jsx:2606` area — add `logInitDate` state in the root `App` component.
- Modify: `src/App.jsx:1038-1041` — `LogScreen`'s prop signature and initial `date` state.
- Modify: `src/App.jsx:2698` — `saveShift`, reset the new state.
- Modify: `src/App.jsx:2778-2779` — the `screen==="log"` render, pass `initialDate` and reset on cancel.
- Modify: `src/App.jsx:2796-2804` area — `HomeScreen`'s real `onLogDate` handler (replacing Task 2's `()=>{}`).

**Interfaces:**
- Consumes: `UpcomingCarousel`'s `onLogDate(date)` callback (Task 2) — called with a `YYYY-MM-DD` string.
- Produces: nothing new consumed by later tasks (this is the last task).

- [ ] **Step 1: Add `logInitDate` state**

Find (currently `App.jsx:2606`):
```js
  const [rosterVersion, setRosterVersion] = useState(0);
```
Add immediately after it:
```js
  const [logInitDate, setLogInitDate] = useState(null);
```

- [ ] **Step 2: Thread it into `LogScreen`**

Find `LogScreen`'s signature (currently `App.jsx:1038`):
```js
function LogScreen({period, editShift, lookupDuty, onSave, onCancel}) {
```
Change to:
```js
function LogScreen({period, editShift, lookupDuty, initialDate, onSave, onCancel}) {
```

Find the date init (currently `App.jsx:1041`):
```js
  const [date, setDate] = useState(lookupDuty?.date || editShift?.date || today());
```
Change to:
```js
  const [date, setDate] = useState(lookupDuty?.date || editShift?.date || initialDate || today());
```

- [ ] **Step 3: Pass `initialDate` at the `screen==="log"` render, reset on cancel**

Find (currently `App.jsx:2778-2779`):
```jsx
  if(screen==="log") return <LogScreen period={activePeriod} editShift={editShift} lookupDuty={lookupDuty}
    onSave={saveShift} onCancel={()=>{setEditShift(null);setLookupDuty(null);setScreen(editShift?"period":lookupDuty?"lookup":"home");}}/>;
```
Change to:
```jsx
  if(screen==="log") return <LogScreen period={activePeriod} editShift={editShift} lookupDuty={lookupDuty} initialDate={logInitDate}
    onSave={saveShift} onCancel={()=>{setEditShift(null);setLookupDuty(null);setLogInitDate(null);setScreen(editShift?"period":lookupDuty?"lookup":"home");}}/>;
```

- [ ] **Step 4: Reset `logInitDate` on save too**

Find `saveShift` (currently `App.jsx:2691-2699`):
```js
  function saveShift(shift) {
    const updated=periods.map(p=>{
      if(p.id!==activePeriodId)return p;
      const ei=p.shifts.findIndex(s=>s.id===shift.id);
      const shifts=ei>=0?p.shifts.map(s=>s.id===shift.id?shift:s):[...p.shifts,shift];
      return{...p,shifts};
    });
    persist(updated,activePeriodId); setEditShift(null); setLookupDuty(null); setScreen("home");
  }
```
Change the last line to:
```js
    persist(updated,activePeriodId); setEditShift(null); setLookupDuty(null); setLogInitDate(null); setScreen("home");
```

- [ ] **Step 5: Wire the real `onLogDate` handler on `HomeScreen`**

Find (from Task 2, currently `App.jsx:2796-2799` after that task's edit):
```jsx
      {screen==="home"&&<HomeScreen period={activePeriod}
        onLog={()=>{setEditShift(null);setScreen("log");}}
        onLogDate={()=>{}}
        onGoWeek={i=>{setOpenWeek(i);setScreen("period");}}
```
Change to:
```jsx
      {screen==="home"&&<HomeScreen period={activePeriod}
        onLog={()=>{setEditShift(null);setScreen("log");}}
        onLogDate={date=>{setEditShift(null);setLookupDuty(null);setLogInitDate(date);setScreen("log");}}
        onGoWeek={i=>{setOpenWeek(i);setScreen("period");}}
```

- [ ] **Step 6: Also clear `logInitDate` wherever `editShift`/`lookupDuty` already get cleared elsewhere**

Find the `BottomNav`'s `onChange` handler (currently `App.jsx:2823-2826`):
```jsx
      <BottomNav active={screen==="log"?"log":["archive"].includes(screen)?"leave":screen} onChange={tab=>{
        if(tab==="log"){setEditShift(null);setLookupDuty(null);setScreen("log");}
        else setScreen(tab);
      }}/>
```
Change to:
```jsx
      <BottomNav active={screen==="log"?"log":["archive"].includes(screen)?"leave":screen} onChange={tab=>{
        if(tab==="log"){setEditShift(null);setLookupDuty(null);setLogInitDate(null);setScreen("log");}
        else setScreen(tab);
      }}/>
```
(This prevents a stale `logInitDate` from a previous carousel tap leaking into the plain "+Log a Shift" / bottom-nav "Log" entry point, which should always default to today.)

Also find the `onLog` prop passed to `HomeScreen` on the same block Task 2/Step 3 touched:
```jsx
        onLog={()=>{setEditShift(null);setScreen("log");}}
```
Change to:
```jsx
        onLog={()=>{setEditShift(null);setLogInitDate(null);setScreen("log");}}
```
(Same reason — the plain "+ Log a Shift" button on Home must not inherit a leftover carousel-tap date.)

- [ ] **Step 7: Build and lint**

Run: `cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App" && npm run build`
Expected: `✓ built in` with no errors.

Run: `npm run lint`
Expected: same pre-existing warning count (no new ones).

- [ ] **Step 8: Live-verify the full flow in the Browser pane**

1. Navigate to `http://localhost:5180` (dev server from Task 2, restart via `preview_start {name:"db-tracker"}` if it's not still running).
2. On Home, find a carousel card a few days out showing "Not logged" (`read_page`/`find` for its text, or `computer` click at its coordinates from a screenshot/`read_page`).
3. `computer` click that card.
4. `read_page`/`get_page_text` on the resulting screen: confirm it's the Log a Shift screen, and confirm the date field's value matches the date that was on the tapped card (not today's date).
5. Click Cancel. Confirm it returns to Home (not stuck, no error).
6. Repeat: tap a *different* unlogged card, confirm the date field updates to match — proves `logInitDate` isn't stuck from the first tap.
7. Now use the plain "+ Log a Shift" button on Home (not a carousel card). Confirm its date field defaults to **today**, not whatever date was last tapped in the carousel — proves the Step 6 reset actually works.
8. Also check the bottom-nav "Log" tab the same way — confirm it also defaults to today after having tapped a carousel card earlier in the session.

- [ ] **Step 9: Commit**

```bash
cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App"
git add src/App.jsx
git commit -m "$(cat <<'EOF'
Wire tap-to-log on UpcomingCarousel's unlogged-day cards

Tapping a "Not logged" card on the Home carousel now opens Log a Shift
pre-filled with that date, via a new logInitDate root-level state
threaded into LogScreen the same way lookupDuty/editShift already are.
Reset alongside them everywhere they're already reset, plus the two
other Log-a-Shift entry points (Home button, bottom nav) so a stale
carousel-tapped date can never leak into a normal today-dated log.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

**Spec coverage:**
- Top-of-Home placement, above Today's Duty — Task 2, Step 2. ✅
- 3 visible cards, swipe/scroll-snap + chevrons — Task 2, Step 1. ✅
- Default today + next 2 days — Task 2, Step 1 (`CAROUSEL_DAYS_BACK`/scroll-to-today logic). ✅
- Card content: duty+times / Rest Day / leave type / Not logged — Task 2, `UpcomingDayCard`. ✅
- Today's card highlighted — Task 2, `UpcomingDayCard` (`isToday` border). ✅
- Tap unlogged → Log a Shift pre-filled — Task 3. ✅
- Out-of-period dates treated as unlogged, no error — Task 1, `dayInfo`. ✅
- No new storage/schema — confirmed, `dayInfo` only reads existing `period.shifts`/`daysOff`. ✅
- Reuse existing design tokens only — confirmed throughout, no new colors introduced. ✅
- No persistence of swipe position across Home re-mounts — confirmed, `UpcomingCarousel` always resets to today-centered on mount (no state lifted to `App`, no localStorage key). ✅

**Type/naming consistency:** `dayInfo` return shape (`status`/`shift`/`dayOff`) used identically in Task 2's `UpcomingDayCard`. `onLogDate(date)` signature consistent between Task 2 (calls it) and Task 3 (defines it). `logInitDate`/`setLogInitDate` spelled identically everywhere it's touched (Tasks 3 Steps 1, 3, 4, 5, 6).
