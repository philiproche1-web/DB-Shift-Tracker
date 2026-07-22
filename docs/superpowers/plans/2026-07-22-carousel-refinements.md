# Carousel Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a depart-location line to logged-shift carousel cards, and make Rest Day cards tappable (with a "+" affordance badge shared with "Not logged" cards) to log overtime worked on a rest day, pre-setting the existing "Working on a rest day" toggle and showing a confirmation banner on the Log Shift screen.

**Architecture:** Two independent additions to the existing single-file `src/App.jsx`, on top of the already-shipped Upcoming Carousel (commits `858cf88`..`8c56573`). Task 1 is a pure display addition (new `shiftDepartLocation(shift)` helper + one new line in `UpcomingDayCard`'s "shift" branch) with no interaction changes. Task 2 threads a small new piece of state (`logInitRestDay`) through the same call chain `logInitDate` already uses (`UpcomingCarousel` → root `App` → `LogScreen`), plus a `LogScreen`-local banner.

**Tech Stack:** Same as the rest of this file — React, inline style objects, no CSS modules, no new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-22-carousel-refinements-design.md` — read this first.
- Single file only: `src/App.jsx`. No new component files, no new dependencies.
- No test framework exists in this project. Verification: `npm run build` clean, `npm run lint` clean (no new warnings beyond the current 10 pre-existing ones), then live-check in the Browser pane against the `db-tracker` dev server (port 5180).
- Reuse existing design tokens only: `ACCENT`, `DANGER`, `MUTED`, `TEXT`, `BORDER`, `CARD` (module-scope, `App.jsx:248-250`). No new colors.
- Depart-location data comes from the existing `DUTIES` array's `rl` field — despite its name, this field holds the *depart* location (established during the running-board fix earlier this session), not report location. Do not rename the field on `DUTIES` — only read it correctly at the one new display site, with a comment explaining why.
- Don't touch the already-shipped tap-to-log logic for "Not logged" cards beyond what's specified — it must keep working exactly as it does today.

---

### Task 1: Depart location on logged-shift cards

**Files:**
- Modify: `src/App.jsx` — add a new helper function right after `getDuties` (currently `App.jsx:46`).
- Modify: `src/App.jsx:887-917` — `UpcomingDayCard`'s "shift" status branch.

**Interfaces:**
- Consumes: existing `DUTIES` array (module-scope), a shift object's existing fields `zone`, `dayType`, `roster`, `isSpare`, `fixedType` (all already stored on every saved shift — confirmed at `App.jsx:1258-1273`'s `handleSave`).
- Produces: `shiftDepartLocation(shift)` → returns a location string (e.g. `"Garage"`, `"Abbey St"`) or `null` if the shift has no fixed depart location (Spare/Fixed duty types) or no matching `DUTIES` entry is found. Not consumed by Task 2.

- [ ] **Step 1: Add `shiftDepartLocation` right after `getDuties`**

Find (currently `App.jsx:46`):
```js
function getDuties(zone, dayType) { return DUTIES.filter(d => d.z === zone && d.t === dayType); }
```
Add immediately after it:
```js
// DUTIES' `rl` field holds each duty's DEPART location (not "report location"
// despite the name — established during the running-board Report/Depart fix).
// Returns null for Spare/Fixed-type shifts (no fixed depart location) or if
// no matching roster duty is found.
function shiftDepartLocation(shift) {
  if (shift.isSpare || shift.fixedType) return null;
  const duty = DUTIES.find(d => d.z === shift.zone && d.t === shift.dayType && d.r === shift.roster);
  return duty ? duty.rl : null;
}
```

- [ ] **Step 2: Add the location line to `UpcomingDayCard`'s "shift" branch**

Find (currently `App.jsx:891-897`):
```jsx
  if (info.status === "shift") {
    body = (
      <>
        <p style={{color:TEXT,fontSize:13,fontWeight:700,margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{info.shift.roster}</p>
        <p style={{color:MUTED,fontSize:11,margin:0}}>{info.shift.reportTime}–{info.shift.signOffTime}</p>
      </>
    );
  }
```
Change to:
```jsx
  if (info.status === "shift") {
    const departLocation = shiftDepartLocation(info.shift);
    body = (
      <>
        <p style={{color:TEXT,fontSize:13,fontWeight:700,margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{info.shift.roster}</p>
        <p style={{color:MUTED,fontSize:11,margin:0}}>{info.shift.reportTime}–{info.shift.signOffTime}</p>
        {departLocation && <p style={{color:MUTED,fontSize:11,margin:"1px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{departLocation}</p>}
      </>
    );
  }
```

- [ ] **Step 3: Build, lint, live-verify**

Run: `cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App" && npm run build`
Expected: `✓ built in` with no errors.

Run: `npm run lint`
Expected: exactly 10 warnings (same baseline — `shiftDepartLocation` is used, no new unused vars).

Live-verify in the Browser pane (dev server at `http://localhost:5180`, `preview_start {name:"db-tracker"}` if nothing responds there):
1. If the dev environment has no logged shifts yet, log one via "+ Log a Shift" for a real numbered duty (not Spare, not a Fixed type) so there's a "shift" status card to inspect.
2. On Home, find that day's carousel card. Confirm it now shows a third line with a depart location matching that duty's actual depart location (cross-check against Duty Lookup for the same duty/date — the location should match what the running board's first non-Report entry shows).
3. Log a Spare shift (or a Fixed type like CPC/Training) for a different date. Confirm that day's card shows duty + times only, no third line, no blank gap, no crash.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App"
git add src/App.jsx
git commit -m "$(cat <<'EOF'
Show depart location on Upcoming Carousel shift cards

Adds a third line to logged-shift cards showing where the driver
needs to be (Garage/Abbey St/Townsend St/etc), read from the existing
DUTIES roster data via a new shiftDepartLocation() helper. Spare and
Fixed-type shifts have no fixed depart location, so the line is
omitted for those - card shows duty + times only, same as before.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: "+" affordance badge + Rest Day tap-to-log overtime

**Files:**
- Modify: `src/App.jsx:887-917` — `UpcomingDayCard` (clickability logic, badge, `onLogDate` call signature).
- Modify: `src/App.jsx:2707` area — root `App` component, add `logInitRestDay` state.
- Modify: `src/App.jsx:1138` and `1177` — `LogScreen`'s prop signature and `isRestDay` init.
- Modify: `src/App.jsx:1276` area — `LogScreen`'s render, add the confirmation banner.
- Modify: `src/App.jsx:2879-2880` — the `screen==="log"` render, pass the new prop + reset on cancel.
- Modify: `src/App.jsx:2792` (`saveShift`) and `2899`/bottom-nav/Home's `onLog` — reset `logInitRestDay` everywhere `logInitDate` is already reset.

**Interfaces:**
- Consumes: Task 1's changes are unrelated and independent — this task can be done before or after Task 1 with no conflict (different branches of the same `if/else` in `UpcomingDayCard`, and Task 1 doesn't touch `onLogDate`/clickability).
- Produces: `onLogDate(date, opts)` — `opts` is now `{isRestDay: true}` for a rest-day tap, `undefined` for a "Not logged" tap. Nothing after this task consumes this signature further (last task in this plan).

- [ ] **Step 1: Update `UpcomingDayCard`'s clickability, badge, and tap signature**

Find (currently `App.jsx:887-917`, after Task 1's edit this will be slightly longer — locate by the `const clickable = info.status === "unlogged";` line and the surrounding return block):
```jsx
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
```
Change to:
```jsx
  const isRestDayCard = info.status === "dayoff" && info.dayOff.type === "Rest Day";
  const clickable = info.status === "unlogged" || isRestDayCard;
  return (
    <div
      onClick={clickable ? () => onLogDate(date, isRestDayCard ? {isRestDay:true} : undefined) : undefined}
      style={{
        background:CARD, border:`1px solid ${isToday?ACCENT:BORDER}`, borderRadius:14,
        padding:"10px 10px", flex:"0 0 calc(33.333% - 6px)",
        scrollSnapAlign:"start", cursor:clickable?"pointer":"default", position:"relative"
      }}>
      <p style={{color:isToday?ACCENT:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:0.5,fontWeight:700,margin:"0 0 2px"}}>{dayLabel} {dateLabel}</p>
      {body}
      {clickable && (
        <div aria-hidden="true" style={{position:"absolute",top:6,right:6,width:16,height:16,borderRadius:"50%",background:ACCENT,color:"#07090F",fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>+</div>
      )}
    </div>
  );
```

- [ ] **Step 2: Add `logInitRestDay` state in the root `App` component**

Find (currently `App.jsx:2707`):
```js
  const [logInitDate, setLogInitDate] = useState(null);
```
Add immediately after it:
```js
  const [logInitRestDay, setLogInitRestDay] = useState(false);
```

- [ ] **Step 3: Thread the new prop into `LogScreen`, use it in the `isRestDay` init**

Find `LogScreen`'s signature (currently `App.jsx:1138`):
```js
function LogScreen({period, editShift, lookupDuty, initialDate, onSave, onCancel}) {
```
Change to:
```js
function LogScreen({period, editShift, lookupDuty, initialDate, initialRestDay, onSave, onCancel}) {
```

Find the `isRestDay` init (currently `App.jsx:1177`):
```js
  const [isRestDay, setIsRestDay] = useState(editShift?.isRestDay || false);
```
Change to:
```js
  const [isRestDay, setIsRestDay] = useState(editShift?.isRestDay || initialRestDay || false);
```

- [ ] **Step 4: Add the confirmation banner to `LogScreen`'s render**

Find the top of `LogScreen`'s return block (currently starts around `App.jsx:1276`):
```jsx
  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
```
Change to:
```jsx
  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      {initialRestDay && isRestDay && (
        <div style={{margin:"12px 16px 0",background:`${DANGER}18`,border:`1px solid ${DANGER}44`,borderRadius:12,padding:"10px 14px"}}>
          <p style={{color:DANGER,fontSize:13,fontWeight:600,margin:0}}>Logging this as overtime — you're on a scheduled rest day.</p>
        </div>
      )}
```
(This banner only shows for the rest-day-tap entry point, and only while the toggle stays on — if the driver flips "Working on a rest day" off themselves, the banner disappears since `isRestDay` becomes false. Note: check the exact indentation/structure of what currently follows the opening `<div>` here — insert the banner as the first child, don't disturb whatever's already rendered right after it.)

- [ ] **Step 5: Pass `initialRestDay` at the `screen==="log"` render, reset it everywhere `logInitDate` already resets**

Find (currently `App.jsx:2879-2880`):
```jsx
  if(screen==="log") return <LogScreen period={activePeriod} editShift={editShift} lookupDuty={lookupDuty} initialDate={logInitDate}
    onSave={saveShift} onCancel={()=>{setEditShift(null);setLookupDuty(null);setLogInitDate(null);setScreen(editShift?"period":lookupDuty?"lookup":"home");}}/>;
```
Change to:
```jsx
  if(screen==="log") return <LogScreen period={activePeriod} editShift={editShift} lookupDuty={lookupDuty} initialDate={logInitDate} initialRestDay={logInitRestDay}
    onSave={saveShift} onCancel={()=>{setEditShift(null);setLookupDuty(null);setLogInitDate(null);setLogInitRestDay(false);setScreen(editShift?"period":lookupDuty?"lookup":"home");}}/>;
```

Find `saveShift`'s last line (currently inside `App.jsx:2792`'s function, search for `setLogInitDate(null); setScreen("home");`):
```js
    persist(updated,activePeriodId); setEditShift(null); setLookupDuty(null); setLogInitDate(null); setScreen("home");
```
Change to:
```js
    persist(updated,activePeriodId); setEditShift(null); setLookupDuty(null); setLogInitDate(null); setLogInitRestDay(false); setScreen("home");
```

Find the real `onLogDate` handler on `HomeScreen` (currently `App.jsx:2899`, search for `onLogDate={date=>`):
```jsx
        onLogDate={date=>{setEditShift(null);setLookupDuty(null);setLogInitDate(date);setScreen("log");}}
```
Change to:
```jsx
        onLogDate={(date,opts)=>{setEditShift(null);setLookupDuty(null);setLogInitDate(date);setLogInitRestDay(!!opts?.isRestDay);setScreen("log");}}
```

Find the `BottomNav`'s `onChange` handler (search for `setLogInitDate(null);setScreen("log")` inside the bottom-nav block):
```jsx
        if(tab==="log"){setEditShift(null);setLookupDuty(null);setLogInitDate(null);setScreen("log");}
```
Change to:
```jsx
        if(tab==="log"){setEditShift(null);setLookupDuty(null);setLogInitDate(null);setLogInitRestDay(false);setScreen("log");}
```

Find `HomeScreen`'s plain `onLog` prop (search for `onLog={()=>{setEditShift(null);setLogInitDate(null);setScreen("log");}}`):
```jsx
        onLog={()=>{setEditShift(null);setLogInitDate(null);setScreen("log");}}
```
Change to:
```jsx
        onLog={()=>{setEditShift(null);setLogInitDate(null);setLogInitRestDay(false);setScreen("log");}}
```

- [ ] **Step 6: Build, lint, live-verify the full flow**

Run: `cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App" && npm run build`
Expected: `✓ built in` with no errors.

Run: `npm run lint`
Expected: exactly 10 warnings (no new ones).

Live-verify in the Browser pane (dev server at `http://localhost:5180`):
1. On Home, find a Rest Day carousel card. Confirm it now shows the small "+" badge (same as "Not logged" cards).
2. Tap the Rest Day card. Confirm: Log a Shift opens, date matches the tapped card, the "Working on a rest day" toggle is already ON, and the red confirmation banner is visible at the top of the screen.
3. Manually toggle "Working on a rest day" OFF. Confirm the banner disappears (proves it's derived from live `isRestDay` state, not stuck on from the entry point).
4. Cancel out. Tap a "Not logged" card (not a rest day). Confirm: date pre-fills as before, "Working on a rest day" is OFF by default (proves the rest-day pre-set doesn't leak into the ordinary unlogged-day path), no banner shown.
5. Use the plain "+ Log a Shift" button and the bottom-nav "Log" tab, each after having tapped a Rest Day card earlier in the session. Confirm both open with the toggle OFF and no banner (proves the reset logic covers this new state the same way it already covers `logInitDate`).

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App"
git add src/App.jsx
git commit -m "$(cat <<'EOF'
Make Rest Day carousel cards tappable to log overtime

Adds a shared "+" affordance badge to both "Not logged" and Rest Day
cards. Tapping a Rest Day card opens Log a Shift with the date and
the existing "Working on a rest day" toggle both pre-set, plus an
on-screen banner confirming it'll be logged as overtime - removes the
"forgot to flag it" failure mode for overtime worked on a scheduled
rest day. Threaded via a new logInitRestDay root-level state, reset
everywhere logInitDate already resets. "Not logged" tap behavior is
unchanged.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

**Spec coverage:**
- "+" badge on both Not-logged and Rest Day cards — Task 2, Step 1. ✅
- Rest Day cards become tappable — Task 2, Step 1 (`isRestDayCard` added to `clickable`). ✅
- Rest-day tap pre-sets date + rest-day toggle — Task 2, Steps 3, 5. ✅
- On-screen banner, local to LogScreen, disappears if toggle flipped off — Task 2, Step 4. ✅
- "Not logged" tap behavior unchanged — Task 2, Step 1 (`opts` is `undefined` for that branch, same `onLogDate(date)` effective call the existing root handler already handles via `opts?.isRestDay` optional chaining). ✅
- Depart location from existing `DUTIES.rl`, omitted gracefully for Spare/Fixed — Task 1. ✅
- No new colors — confirmed, badge uses `ACCENT`/`#07090F` (existing dark-bg token used elsewhere for on-accent text, e.g. button text), banner uses `DANGER` (already used for rest-day styling elsewhere). ✅
- No global toast system change — banner is local JSX in `LogScreen`, not the shared `toast` state used elsewhere. ✅

**Type/naming consistency:** `logInitRestDay`/`setLogInitRestDay` spelled identically everywhere (Task 2, Steps 2, 5). `initialRestDay` prop name consistent between `LogScreen`'s signature (Step 3) and both render sites that pass it (Step 5). `onLogDate(date, opts)` signature consistent between `UpcomingDayCard` (calls it) and the root `App` handler (defines it, Step 5) — `opts` is optional/possibly-undefined at both ends, guarded with `opts?.isRestDay`.
