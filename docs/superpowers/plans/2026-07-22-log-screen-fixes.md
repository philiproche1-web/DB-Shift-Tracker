# Log Shift Screen Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a duplicated dead button on Log a Shift, replace the same-date hard-block with a confirm-to-overwrite flow, and merge the standalone "Repeat a Duty" screen into Log a Shift as a day-circle multi-select.

**Architecture:** Three sequential changes to `src/App.jsx`'s `LogScreen` (and, for Task 3, the root `App` component and `PeriodScreen`). Sequential because Task 2 refactors `handleSave` into a `performSave`/confirm-gated shape that Task 3 extends further for the bulk-day case — Task 3 must be done after Task 2, not independently.

**Tech Stack:** Same as the rest of this file — React, inline style objects, no CSS modules, no new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-22-log-screen-fixes-design.md` — read this first.
- Single file only: `src/App.jsx`. No new dependencies, no new component files (Task 3 deletes a component, `RepeatDutyPanel` — it does not add one).
- No test framework exists in this project. Verification: `npm run build` clean, `npm run lint` clean (no new warnings beyond the current 10 pre-existing ones — Task 3 will actually *reduce* the warning-relevant surface by deleting `RepeatDutyPanel`, so watch for the count changing there specifically), then live-check in the Browser pane against the `db-tracker` dev server (port 5180).
- Reuse existing design tokens only: `ACCENT`, `DANGER`, `MUTED`, `TEXT`, `BORDER`, `CARD`, `CARD2`. No new colors.
- Reuse the screen's existing `pendingAction`/`ConfirmDialog` pattern (`App.jsx` inside `LogScreen`, already used for the zone-change and Spare-toggle "this will clear your times" confirmations) for both new confirmations in this plan — do not introduce a second confirm-dialog mechanism.
- **Verification discipline, carried over from the last plan's lesson:** a prior task's implementer subagent once claimed DONE while its own report admitted live browser verification wasn't actually completed. If Browser pane tools are genuinely unresponsive, report DONE_WITH_CONCERNS or BLOCKED and say exactly what couldn't be checked — do not substitute static code-reading and call it done. Every task in this plan has explicit live-verify steps; they must actually be performed, not reasoned about.

---

### Task 1: Remove the dead duplicate "Log Shift" button

**Files:**
- Modify: `src/App.jsx` — inside `LogScreen`'s render, currently around lines 1505-1509 (search for the second, always-disabled button with no `onClick`).

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — purely a deletion. Task 2 and Task 3 both touch the *real* button (the one just above this dead one) but not this dead block itself.

- [ ] **Step 1: Delete the dead second button block**

Find (search for `{!canSave && (rIdx>=0 || isSpare || fixedType) && (` followed by a disabled button with no `onClick`):
```jsx
        {!canSave && (rIdx>=0 || isSpare || fixedType) && (
          <button style={{...btnStyle,opacity:0.4}} disabled>
            {editShift?"Save Changes":"Log Shift"}
          </button>
        )}
```
Delete this entire block. Leave everything above and below it (the real button, the `saveBlockReason` paragraph, the `pendingAction`/`ConfirmDialog` block) untouched.

- [ ] **Step 2: Build, lint, live-verify**

Run: `cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App" && npm run build`
Expected: `✓ built in` with no errors.

Run: `npm run lint`
Expected: exactly 10 warnings (same baseline — this is a pure deletion of dead JSX, nothing newly unused).

Live-verify in the Browser pane (dev server at `http://localhost:5180`, `preview_start {name:"db-tracker"}` if nothing responds there):
1. Open Log a Shift, pick a date/duty combination that leaves Save disabled (e.g. don't pick a duty yet, or pick a date outside the period). Confirm only ONE "Log Shift" button is visible, greyed out, with the plain-language reason text below it — no second stacked button.
2. Fill in a valid new shift (duty, date not already logged, etc.) so Save becomes enabled. Confirm still only one button, now clickable.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App"
git add src/App.jsx
git commit -m "$(cat <<'EOF'
Remove dead duplicate Log Shift button

LogScreen rendered two Save buttons when disabled - the real one (with
the plain-language disabled reason beneath it) and a second, always-
disabled, no-op decorative one left over from an earlier version.
Deleted the dead one.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Same-date conflict — confirm-to-overwrite instead of hard block

**Files:**
- Modify: `src/App.jsx` — `LogScreen`'s `canSave`/`saveBlockReason` (currently ~lines 1247-1253), `handleSave` (currently ~lines 1273-1289).

**Interfaces:**
- Consumes: the existing `conflictShift` lookup (unchanged — `App.jsx` ~line 1244: `(period.shifts||[]).find(s => s.date === date && s.id !== editShift?.id)`), the existing `pendingAction`/`setPendingAction` state and `ConfirmDialog` render (unchanged, already present in the file).
- Produces: a new `performSave(overwriteId)` function, replacing the body that used to live directly in `handleSave`. **Task 3 extends `performSave` further** (adds the multi-day branch) — its brief will show the post-Task-2 version of this function, so get the exact shape right here.

- [ ] **Step 1: Remove `conflictShift` from `canSave`, update `saveBlockReason`**

Find (currently `App.jsx` ~line 1247-1253):
```js
  const canSave = (rIdx >= 0 || isSpare || fixedType) && date && reportTime && signOffVal && inRange && !conflictShift;
  const saveBlockReason = !date ? "Pick a date."
    : !inRange ? "This date falls outside the current 5-week period."
    : conflictShift ? "A shift is already logged on this date — edit or delete it first."
    : !(rIdx >= 0 || isSpare || fixedType) ? "Pick a duty, or choose Spare / another duty type."
    : (!reportTime || !signOffVal) ? "Enter a start and finish time."
    : null;
```
Change to:
```js
  const canSave = (rIdx >= 0 || isSpare || fixedType) && date && reportTime && signOffVal && inRange;
  const saveBlockReason = !date ? "Pick a date."
    : !inRange ? "This date falls outside the current 5-week period."
    : !(rIdx >= 0 || isSpare || fixedType) ? "Pick a duty, or choose Spare / another duty type."
    : (!reportTime || !signOffVal) ? "Enter a start and finish time."
    : null;
```
(The `conflictShift` warning banner further up the screen, ~line 1317-1322, stays exactly as-is — still shown, still red. Only its effect on `canSave`/`saveBlockReason` is removed here.)

- [ ] **Step 2: Split `handleSave` into `performSave` + a confirm-gated `handleSave`**

Find (currently `App.jsx` ~lines 1273-1289):
```js
  function handleSave() {
    if (!canSave) return;
    const duty = (isSpare || fixedType) ? null : duties[rIdx];
    onSave({
      id: editShift?.id || uid(), date, zone, dayType: getDayType(date),
      roster: fixedDef ? fixedDef.roster : (isSpare ? "Spare" : duty.r),
      duty: fixedType ? fixedType : (isSpare ? "spare" : duty.d2),
      fixedType: fixedType || null,
      reportTime, signOffTime: signOffStr,
      workHours: fixedDef ? fixedDef.hours : isSpare ? calcSpreadover(reportTime, signOffStr) : workH + workM/60,
      reliefHours: (isSpare || fixedType) ? 0 : reliefH + reliefM/60,
      isSpare, isRestDay,
      overtimeHours: overtimeH + overtimeM/60,
      overtimeNote: overtimeNote.trim(),
      notes: notes.trim()
    });
  }
```
Change to:
```js
  function performSave(overwriteId) {
    const duty = (isSpare || fixedType) ? null : duties[rIdx];
    onSave({
      id: overwriteId || editShift?.id || uid(), date, zone, dayType: getDayType(date),
      roster: fixedDef ? fixedDef.roster : (isSpare ? "Spare" : duty.r),
      duty: fixedType ? fixedType : (isSpare ? "spare" : duty.d2),
      fixedType: fixedType || null,
      reportTime, signOffTime: signOffStr,
      workHours: fixedDef ? fixedDef.hours : isSpare ? calcSpreadover(reportTime, signOffStr) : workH + workM/60,
      reliefHours: (isSpare || fixedType) ? 0 : reliefH + reliefM/60,
      isSpare, isRestDay,
      overtimeHours: overtimeH + overtimeM/60,
      overtimeNote: overtimeNote.trim(),
      notes: notes.trim()
    });
  }

  function handleSave() {
    if (!canSave) return;
    if (!editShift && conflictShift) {
      setPendingAction({
        msg: `This will replace the shift already logged for ${fmtDate(date)} (${conflictShift.roster}) — continue?`,
        run: () => performSave(conflictShift.id)
      });
      return;
    }
    performSave();
  }
```
(`fmtDate` is an existing module-scope helper already used elsewhere in the file — no import needed.)

- [ ] **Step 3: Build, lint, live-verify**

Run: `cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App" && npm run build`
Expected: `✓ built in` with no errors.

Run: `npm run lint`
Expected: exactly 10 warnings (no new ones — `performSave` is called from `handleSave`, not unused).

Live-verify in the Browser pane:
1. Log a real shift for some date (call it the "original"). Go back to Log a Shift, pick the SAME date again, pick a DIFFERENT duty. Confirm: the red "already logged" warning shows, but Save is now clickable (not greyed out).
2. Tap Save. Confirm a dialog appears with wording naming the date and the original conflicting duty, asking to confirm the replacement.
3. Confirm the dialog. Go to Period screen (or Duty Lookup) and confirm there is now exactly ONE shift for that date — the new one — not two.
4. Repeat steps 1-2 but this time cancel the dialog. Confirm nothing changed — the original shift is still there, no new one was added.
5. Confirm editing an EXISTING shift (via Period → Edit) for its own date does NOT trigger this new confirm dialog (since `!editShift` gates it off) — Save should work exactly as it did before this task.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App"
git add src/App.jsx
git commit -m "$(cat <<'EOF'
Replace same-date hard block with confirm-to-overwrite on Log a Shift

Logging a shift on a date that already has one used to disable Save
entirely, with no way forward except leaving the screen to edit or
delete the existing shift first. Now Save stays enabled; confirming
replaces the existing shift in place (same identity, not a duplicate
entry for that date) rather than blocking. Matches how day-off
conflicts on the same screen already behave (warn, don't block), and
reuses the screen's existing confirm-dialog pattern.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Repeat Duty merges into Log a Shift

**Files:**
- Modify: `src/App.jsx` — `LogScreen` (new state, new day-circle UI section, `performSave` extended for the multi-day case).
- Modify: `src/App.jsx` — root `App` component's `saveShift` (accept an array, matching the existing `saveDayOff` convention), and its `<LogScreen>`/`<PeriodScreen>` call sites.
- Modify: `src/App.jsx` — `PeriodScreen` (remove the `repeatWeekIdx` state, the `↻ Repeat` button, the `RepeatDutyPanel` render, and the now-unused `onRepeat` prop).
- Delete: `src/App.jsx` — the `RepeatDutyPanel` function entirely.

**Interfaces:**
- Consumes: `performSave(overwriteId)` from Task 2 (this task extends it, not replaces the confirm-overwrite logic Task 2 added — the two branches are mutually exclusive: overwrite-confirm only fires for a single date with no extra days ticked, multi-day only fires when at least one extra day is ticked).
- Produces: nothing further consumed by other tasks — this is the last task in the plan.

- [ ] **Step 1: Add a `sundayOf` date helper**

Find (search for `function thisSunday()`):
```js
function thisSunday() {
  const d = new Date(), day = d.getDay(); d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
```
Add immediately after it:
```js
// Sunday of the week containing an arbitrary date string (not just today's week)
function sundayOf(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}
```

- [ ] **Step 2: Add `extraDays` state to `LogScreen`, clear it alongside existing field-clearing actions**

Find (inside `LogScreen`, search for `const [pendingAction, setPendingAction] = useState(null);`):
```js
  const [pendingAction, setPendingAction] = useState(null); // {msg, run} — confirm before wiping entered times
```
Add immediately after it:
```js
  const [extraDays, setExtraDays] = useState([]); // additional dates (same week as `date`) to also log this duty on
```

Find the Date field's `onChange` (search for `<DateInput id="log-date" value={date} onChange={e => setDate(e.target.value)}`):
```jsx
          <DateInput id="log-date" value={date} onChange={e => setDate(e.target.value)} invalid={!inRange && !!date}/>
```
Change to:
```jsx
          <DateInput id="log-date" value={date} onChange={e => {setDate(e.target.value); setExtraDays([]);}} invalid={!inRange && !!date}/>
```

Find the zone-change guarded reset (search for `"Changing zone will clear the times you've already entered. Continue?"`):
```jsx
              guardedRun("Changing zone will clear the times you've already entered. Continue?", ()=>{
                setZone(z);setRIdx(-1);setReportTime("");setSignOffVal("00:00");setNextDay(false);setWorkH(0);setWorkM(0);setReliefH(0);setReliefM(0);
              });
```
Change to:
```jsx
              guardedRun("Changing zone will clear the times you've already entered. Continue?", ()=>{
                setZone(z);setRIdx(-1);setReportTime("");setSignOffVal("00:00");setNextDay(false);setWorkH(0);setWorkM(0);setReliefH(0);setReliefM(0);setExtraDays([]);
              });
```

Find the Spare-toggle guarded reset (search for `"Toggling Spare will clear the times you've already entered. Continue?"`):
```jsx
          guardedRun("Toggling Spare will clear the times you've already entered. Continue?", ()=>{
            const ns=!isSpare;setIsSpare(ns);if(ns)setFixedType(null);setRIdx(-1);setReportTime("");setSignOffVal("00:00");setNextDay(false);setWorkH(0);setWorkM(0);
          });
```
Change to:
```jsx
          guardedRun("Toggling Spare will clear the times you've already entered. Continue?", ()=>{
            const ns=!isSpare;setIsSpare(ns);if(ns)setFixedType(null);setRIdx(-1);setReportTime("");setSignOffVal("00:00");setNextDay(false);setWorkH(0);setWorkM(0);setExtraDays([]);
          });
```

- [ ] **Step 3: Compute the week's days and add the day-circle picker UI**

Find the closing of the Duty picker block (search for the exact block below, which ends right before the "Spare driver toggle" comment):
```jsx
        {/* Duty */}
        {!isSpare && !fixedType && (
          <div style={{marginBottom:16}}>
            <FieldLabel hint={`${duties.length} for ${dayLabel}`}>Duty</FieldLabel>
            <DutyPicker key={zone+dutyDayType} duties={duties} value={rIdx} onChange={pick}/>
          </div>
        )}

        {/* Spare driver toggle — compact, sits between duty and shift details */}
```
Change to (inserting the new section between the two, leaving both the Duty block and the Spare toggle comment/block that follows otherwise untouched):
```jsx
        {/* Duty */}
        {!isSpare && !fixedType && (
          <div style={{marginBottom:16}}>
            <FieldLabel hint={`${duties.length} for ${dayLabel}`}>Duty</FieldLabel>
            <DutyPicker key={zone+dutyDayType} duties={duties} value={rIdx} onChange={pick}/>
          </div>
        )}

        {/* Also log this duty on other days this week — replaces the old standalone Repeat Duty screen */}
        {!editShift && !isSpare && !fixedType && date && (
          <div style={{marginBottom:16}}>
            <FieldLabel hint="optional">Also log this duty on</FieldLabel>
            <div style={{display:"flex",gap:6,justifyContent:"space-between"}}>
              {(() => {
                const weekStart = sundayOf(date);
                const letters = ["S","M","T","W","T","F","S"];
                const taken = new Set((period.shifts||[]).map(s=>s.date));
                return Array.from({length:7},(_,i)=>{
                  const d = addDays(weekStart, i);
                  const isPrimary = d === date;
                  const isTaken = taken.has(d) && !isPrimary;
                  const sel = extraDays.includes(d);
                  return (
                    <button key={d} type="button" disabled={isPrimary || isTaken}
                      onClick={()=>setExtraDays(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev, d])}
                      style={{
                        width:36, height:36, borderRadius:"50%",
                        background: (isPrimary || sel) ? ACCENT : isTaken ? CARD : CARD2,
                        color: (isPrimary || sel) ? "#07090F" : isTaken ? MUTED : TEXT,
                        border: (isPrimary || sel) ? "none" : `1px solid ${BORDER}`,
                        fontSize:12, fontWeight:700, cursor: (isPrimary || isTaken) ? "not-allowed" : "pointer",
                        opacity: isTaken ? 0.5 : 1
                      }}>{letters[i]}</button>
                  );
                });
              })()}
            </div>
            {extraDays.length>0 && (
              <p style={{color:MUTED,fontSize:12,margin:"8px 0 0"}}>Will log on {1+extraDays.length} days total{rIdx>=0 && duties[rIdx] ? ` (${duties[rIdx].r})` : ""}</p>
            )}
          </div>
        )}

        {/* Spare driver toggle — compact, sits between duty and shift details */}
```

- [ ] **Step 4: Extend `performSave` for the multi-day case, extend `handleSave`'s confirm wording, update the Save button label**

Find `performSave` and `handleSave` (as left by Task 2):
```js
  function performSave(overwriteId) {
    const duty = (isSpare || fixedType) ? null : duties[rIdx];
    onSave({
      id: overwriteId || editShift?.id || uid(), date, zone, dayType: getDayType(date),
      roster: fixedDef ? fixedDef.roster : (isSpare ? "Spare" : duty.r),
      duty: fixedType ? fixedType : (isSpare ? "spare" : duty.d2),
      fixedType: fixedType || null,
      reportTime, signOffTime: signOffStr,
      workHours: fixedDef ? fixedDef.hours : isSpare ? calcSpreadover(reportTime, signOffStr) : workH + workM/60,
      reliefHours: (isSpare || fixedType) ? 0 : reliefH + reliefM/60,
      isSpare, isRestDay,
      overtimeHours: overtimeH + overtimeM/60,
      overtimeNote: overtimeNote.trim(),
      notes: notes.trim()
    });
  }

  function handleSave() {
    if (!canSave) return;
    if (!editShift && conflictShift) {
      setPendingAction({
        msg: `This will replace the shift already logged for ${fmtDate(date)} (${conflictShift.roster}) — continue?`,
        run: () => performSave(conflictShift.id)
      });
      return;
    }
    performSave();
  }
```
Change to:
```js
  function shiftFields() {
    const duty = (isSpare || fixedType) ? null : duties[rIdx];
    return {
      zone,
      roster: fixedDef ? fixedDef.roster : (isSpare ? "Spare" : duty.r),
      duty: fixedType ? fixedType : (isSpare ? "spare" : duty.d2),
      fixedType: fixedType || null,
      reportTime, signOffTime: signOffStr,
      workHours: fixedDef ? fixedDef.hours : isSpare ? calcSpreadover(reportTime, signOffStr) : workH + workM/60,
      reliefHours: (isSpare || fixedType) ? 0 : reliefH + reliefM/60,
      isSpare, isRestDay,
      overtimeHours: overtimeH + overtimeM/60,
      overtimeNote: overtimeNote.trim(),
      notes: notes.trim()
    };
  }

  function performSave(overwriteId) {
    if (extraDays.length > 0) {
      const fields = shiftFields();
      const allDates = [date, ...extraDays];
      onSave(allDates.map(d => ({ id: uid(), date: d, dayType: getDayType(d), ...fields })));
      return;
    }
    onSave({ id: overwriteId || editShift?.id || uid(), date, dayType: getDayType(date), ...shiftFields() });
  }

  function handleSave() {
    if (!canSave) return;
    if (!editShift && extraDays.length===0 && conflictShift) {
      setPendingAction({
        msg: `This will replace the shift already logged for ${fmtDate(date)} (${conflictShift.roster}) — continue?`,
        run: () => performSave(conflictShift.id)
      });
      return;
    }
    if (extraDays.length > 0) {
      setPendingAction({
        msg: `Log ${(rIdx>=0 && duties[rIdx]) ? duties[rIdx].r : ""} on ${1+extraDays.length} days: ${[date, ...extraDays].map(fmtDate).join(", ")}?`,
        run: () => performSave()
      });
      return;
    }
    performSave();
  }
```

Find the Save button label (search for `{editShift?"Save Changes":"Log Shift"}` — after Task 1's edit there is exactly one occurrence left):
```jsx
        <button style={{...btnStyle,opacity:canSave?1:0.4,cursor:canSave?"pointer":"not-allowed"}} onClick={handleSave} disabled={!canSave}>
          {editShift?"Save Changes":"Log Shift"}
        </button>
```
Change to:
```jsx
        <button style={{...btnStyle,opacity:canSave?1:0.4,cursor:canSave?"pointer":"not-allowed"}} onClick={handleSave} disabled={!canSave}>
          {editShift ? "Save Changes" : extraDays.length>0 ? `Log ${1+extraDays.length} days` : "Log Shift"}
        </button>
```

- [ ] **Step 5: Make root `App`'s `saveShift` accept an array (matching `saveDayOff`'s existing convention), silently skipping any date that already has a shift not part of this save**

Find (search for `function saveShift(shift)`):
```js
  function saveShift(shift) {
    const updated=periods.map(p=>{
      if(p.id!==activePeriodId)return p;
      const ei=p.shifts.findIndex(s=>s.id===shift.id);
      const shifts=ei>=0?p.shifts.map(s=>s.id===shift.id?shift:s):[...p.shifts,shift];
      return{...p,shifts};
    });
    persist(updated,activePeriodId); setEditShift(null); setLookupDuty(null); setLogInitDate(null); setLogInitRestDay(false); setScreen("home");
  }
```
Change to:
```js
  function saveShift(shiftOrArray) {
    const items = Array.isArray(shiftOrArray) ? shiftOrArray : [shiftOrArray];
    const updated=periods.map(p=>{
      if(p.id!==activePeriodId)return p;
      let shifts = p.shifts;
      items.forEach(shift=>{
        const ei=shifts.findIndex(s=>s.id===shift.id);
        if (ei>=0) { shifts = shifts.map(s=>s.id===shift.id?shift:s); return; }
        // New shift (multi-day path): skip if some other shift already owns this date -
        // the day-circle picker greys out already-logged days, but this guards a race
        // (e.g. another device/tab logged something in between) the same way the old
        // standalone Repeat screen's own dedup used to.
        if (shifts.some(s=>s.date===shift.date)) return;
        shifts = [...shifts, shift];
      });
      return{...p,shifts};
    });
    persist(updated,activePeriodId); setEditShift(null); setLookupDuty(null); setLogInitDate(null); setLogInitRestDay(false); setScreen("home");
  }
```

- [ ] **Step 6: Remove the `RepeatDutyPanel` component entirely**

Find the function (search for `function RepeatDutyPanel({weekStart, existingDates, onConfirm, onClose}) {`) and delete the entire function, from that line through its closing `}` (the blank line after it, before the next `function PeriodScreen` or whatever comment/section follows, can stay or go — just remove the function body itself, don't touch neighboring code).

- [ ] **Step 7: Remove `repeatWeekIdx`, the `RepeatDutyPanel` render, the `↻ Repeat` button, and the unused `onRepeat` prop from `PeriodScreen`**

Find `PeriodScreen`'s signature (search for `function PeriodScreen({period, onEdit, onDelete, onEditDayOff, onDeleteDayOff, onRepeat, onViewArchive, onEndPeriod, initWeek=null, readOnly=false}) {`):
```js
function PeriodScreen({period, onEdit, onDelete, onEditDayOff, onDeleteDayOff, onRepeat, onViewArchive, onEndPeriod, initWeek=null, readOnly=false}) {
```
Change to:
```js
function PeriodScreen({period, onEdit, onDelete, onEditDayOff, onDeleteDayOff, onViewArchive, onEndPeriod, initWeek=null, readOnly=false}) {
```

Find (search for `const [repeatWeekIdx, setRepeatWeekIdx] = useState(-1);`) and delete that line entirely.

Find the `RepeatDutyPanel` render block (search for `{repeatWeekIdx>=0 && (`):
```jsx
      {repeatWeekIdx>=0 && (
        <RepeatDutyPanel
          weekStart={stats.weeks[repeatWeekIdx].start}
          existingDates={new Set((period.shifts||[]).map(s=>s.date))}
          onClose={()=>setRepeatWeekIdx(-1)}
          onConfirm={shifts=>{onRepeat(shifts);setRepeatWeekIdx(-1);}}
        />
      )}

```
Delete this entire block (including the trailing blank line shown).

Find the `↻ Repeat` button (search for `↻ Repeat`):
```jsx
                {!readOnly && (
                  <button onClick={e=>{e.stopPropagation();setRepeatWeekIdx(i);}} style={{
                    background:"none",border:`1px solid ${BORDER}`,color:MUTED,
                    borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer"
                  }}>↻ Repeat</button>
                )}
```
Delete this entire block (the `▾` expand-arrow `<span>` right after it, and everything else in that surrounding `<div>`, stays untouched).

- [ ] **Step 8: Remove `onRepeat` from the root `App`'s `<PeriodScreen>` call site**

Find (search for `onEndPeriod={startNewPeriod}` followed by `onRepeat={shifts=>{`):
```jsx
        onEndPeriod={startNewPeriod}
        onRepeat={shifts=>{
          const updated=periods.map(p=>{
            if(p.id!==activePeriodId)return p;
            const existingDates=new Set((p.shifts||[]).map(s=>s.date));
            const newShifts=shifts.filter(s=>!existingDates.has(s.date));
            return{...p,shifts:[...(p.shifts||[]),...newShifts]};
          });
          persist(updated,activePeriodId);
        }}/>}
```
Change to:
```jsx
        onEndPeriod={startNewPeriod}/>}
```

- [ ] **Step 9: Build, lint, live-verify**

Run: `cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App" && npm run build`
Expected: `✓ built in` with no errors.

Run: `npm run lint`
Expected: 10 or fewer warnings — deleting `RepeatDutyPanel` may remove some lint surface entirely; it must not be MORE than 10, and should not introduce any new unused-variable warnings for the code this task actually adds (`sundayOf`, `extraDays`, `shiftFields`, etc. — all of these are used).

Live-verify in the Browser pane (dev server at `http://localhost:5180`):
1. Go to Period screen. Confirm the "↻ Repeat" button is gone from every week row, and nothing crashes/renders blank where it used to be.
2. Open Log a Shift for a new entry (not editing). Pick a zone and a real numbered duty (not Spare/Fixed). Confirm a row of 7 small circles appears between the Duty picker and the Spare toggle, one letter each (S M T W T F S), with the day matching the current Date field shown as already selected/pinned (can't be un-toggled).
3. Tick 2-3 more circles for other days that don't already have a shift logged. Confirm the Save button text changes to "Log N days" (N = 1 + number ticked).
4. Tap Save. Confirm a dialog appears listing the duty and all the dates. Confirm it. Confirm (via Period screen) that shifts now exist for all of those dates with the same duty/times.
5. Repeat opening Log a Shift for a date whose week has some already-logged days (e.g. from the batch just created). Confirm those specific days show as gray/disabled circles and can't be selected.
6. Change the Date field to a date in a different week. Confirm the circle row updates to that week's days, and any previously-ticked extra days are cleared.
7. Toggle "Spare driver shift" on. Confirm the day-circle row disappears entirely (Spare shifts don't support multi-day). Toggle it back off — confirm the row reappears (with extra days cleared, per the reset added in Step 2).
8. Open an EXISTING shift via Period → Edit. Confirm the day-circle row does NOT appear at all (this section is new-entry-only).
9. Re-run Task 2's 5 live-verify checks (same-date overwrite-confirm) to confirm this task's changes to `performSave`/`handleSave` didn't regress that flow — the single-date overwrite-confirm path (no extra days ticked) must still work exactly as Task 2 left it.

- [ ] **Step 10: Commit**

```bash
cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App"
git add src/App.jsx
git commit -m "$(cat <<'EOF'
Merge Repeat Duty into Log a Shift as a day-circle picker

Replaces the standalone "Repeat a Duty" screen (opened from Period,
scoped to one specific week) with an inline day-circle row directly
on Log a Shift, between the Duty picker and the Spare toggle - pick a
duty once, tick which other days this week to also log it on, one
save. Already-logged days are greyed out and can't be multi-selected
(use the single-date overwrite-confirm flow for those instead). Root
App's saveShift now accepts a single shift or an array, matching the
existing saveDayOff convention, with the same date-collision guard
the old Repeat screen's dedup logic used to provide.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

**Spec coverage:**
- Duplicate button removed — Task 1. ✅
- Same-date hard block → confirm-to-overwrite, replaces in place not duplicates — Task 2. ✅
- Day-circle row between Duty and Spare toggle, new-entry-only, real-duty-only — Task 3, Step 3. ✅
- Circles = 7 days of the Date field's week, primary date pinned, taken days greyed out — Task 3, Step 3. ✅
- Ticking days → "Log N days" button + one confirm listing all dates — Task 3, Step 4. ✅
- Zone/Spare/date changes clear extra days — Task 3, Step 2. ✅
- Standalone Repeat screen/button fully retired — Task 3, Steps 6-8. ✅
- No per-day overwrite inside multi-day picker (conflicting days excluded from selection, not offered for overwrite) — Task 3, Step 3 (`isTaken` disables selection; Step 5's root-level guard is a defensive backstop, not a UI path). ✅
- Reuses existing confirm-dialog pattern for both new confirmations — Task 2 and Task 3 both use `pendingAction`/`ConfirmDialog`, no new dialog component. ✅

**Type/naming consistency:** `performSave(overwriteId)` signature defined in Task 2, extended (not redefined incompatibly) in Task 3 — Task 3's version still accepts `overwriteId` for the single-date path and ignores it for the multi-day path, since those two branches are mutually exclusive by construction (`extraDays.length===0` gates the overwrite-confirm branch in `handleSave`). `shiftFields()` (Task 3) factors out exactly what Task 2's `performSave` inlined, with identical field names/values — confirmed by inspection, not just intent. `saveShift`'s new array-handling shape in Task 3, Step 5 mirrors `saveDayOff`'s existing `Array.isArray` convention already used elsewhere in the same root component.
