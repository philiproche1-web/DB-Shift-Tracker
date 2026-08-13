# Leave Page Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three inaccuracies/gaps on the Leave page — a wrong Force Majeure limit (needs to be a real rolling-window rule, not calendar-year), missing context on Sick Leave (ACP threshold) and Self Cert (consecutive-days rule), and a new Bank Holiday In Lieu feature that prompts at shift-logging time and automatically bumps the Annual Leave entitlement.

**Architecture:** Tasks 1-2 are pure `LeaveScreen.jsx` display/computation changes (no other files touched). Tasks 3-5 build Bank Holiday In Lieu: a small `roster.js` fix so the new day-off type doesn't leak into unrelated Home-screen highlights, a new mandatory-choice modal in the shift-logging flow (`LogScreen.jsx`) that produces day-off entries alongside the shift, `App.jsx`'s `saveShift` extended to persist both atomically, and a new Leave page card + computed (not stored) Annual Leave total.

**Tech Stack:** React (Vite), Vitest.

## Global Constraints

- Force Majeure counters are **rolling windows** computed live off today's date (`date >= today − 365 days` / `date >= today − 1095 days`), never calendar-year. Sick Leave and Bank Holiday In Lieu **are** calendar-year scoped (reuse the existing year-filtered `allDaysOff`), matching real entitlement rules — don't conflate the two counting models.
- The Bank Holiday In Lieu prompt is mandatory (no skip) and only fires when logging a brand-new shift, never when editing an existing one.
- Choosing "Bank Holiday Pay" leaves no record anywhere. Only "Day in Lieu" creates a day-off entry.
- The Annual Leave total is **computed** (`entitlement + bankHolidaysInLieu.length × 1.25`), never written back into the stored `annualTotal` setting — deleting a wrongly-logged entry must self-correct the total with no separate cleanup step.
- `"Bank Holiday In Lieu"` is a day-off `type` string used only internally by this feature — it must NOT be added to `DAY_OFF_TYPES`/`LOGGABLE_DAY_OFF_TYPES` in `dutyMath.js` (those drive the general manual "Log Day Off" picker).
- No component/UI test framework exists in this repo — React changes are verified with `npm run build` plus manual checks. Only `roster.js`'s pure functions get automated tests.
- ACP is used unexpanded in all copy (bare acronym) — the stakeholder wasn't certain of the full name, don't invent one.

---

### Task 1: Force Majeure card — rolling 12/36-month counters

**Files:**
- Modify: `src/screens/LeaveScreen.jsx:1-2` (imports), `:132` (remove old year-scoped `fm` line), `:174-177` (replace the card), plus a new `ForceMajeureCard` component in the same file.

**Interfaces:**
- Produces: `ForceMajeureCard` component, local to this file (not exported, matching `SelfCertCard`'s pattern — it's rendered only from within `LeaveScreen` itself).

- [ ] **Step 1: Add the needed imports**

Change line 2 from:

```js
import { fmtDate } from "../lib/dutyMath.js";
```

to:

```js
import { fmtDate, addDays, today } from "../lib/dutyMath.js";
```

- [ ] **Step 2: Replace the year-scoped `fm` computation**

Delete line 132 (`const fm = allDaysOff.filter(d=>d.type==="Force Majeure")...`). In its place, after the existing `allDaysOff` memo (the block ending at line 127), add a new, separately-scoped computation (Force Majeure needs ALL periods regardless of calendar year, since its windows can span year boundaries — `allDaysOff` is year-filtered and wrong for this):

```js
  const allDaysOffEver = useMemo(() => periods.flatMap(p => p.daysOff || []), [periods]);
  const fmAll = useMemo(
    () => allDaysOffEver.filter(d => d.type === "Force Majeure").sort((a,b) => a.date.localeCompare(b.date)),
    [allDaysOffEver]
  );
  const todayDate = today();
  const fm12 = fmAll.filter(d => d.date >= addDays(todayDate, -365));
  const fm36 = fmAll.filter(d => d.date >= addDays(todayDate, -1095));
```

- [ ] **Step 3: Add a color helper for the two windows**

Near the existing `scColor` helper (around line 141), add:

```js
  const fmColor = (n, cap) => n===0?SUCCESS:n<cap?"#F59E0B":DANGER;
```

- [ ] **Step 4: Add the `ForceMajeureCard` component**

Add this new component in the same file, alongside `SelfCertCard` (same file, not exported — matches `SelfCertCard`'s own scoping):

```jsx
function ForceMajeureCard({fm12, fm36, onEdit, onDelete}) {
  const [open, setOpen] = useState(false);
  const cardColor = fm12.length>=3 || fm36.length>=5 ? DANGER : (fm12.length>0 || fm36.length>0) ? "#F59E0B" : SUCCESS;
  return (
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,marginBottom:10,overflow:"hidden"}}>
      <div style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <TrafficDot color={cardColor}/>
            <div>
              <p style={{color:TEXT,fontSize:15,fontWeight:700,margin:0}}>Force Majeure</p>
              <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>Unforeseen family emergencies — capped at 3 days per rolling 12 months, 5 days per rolling 36 months.</p>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{color:TEXT,fontSize:18,fontWeight:800,margin:0}}>{fm36.length} <span style={{color:MUTED,fontSize:12,fontWeight:400}}>used (36mo)</span></p>
            <span style={{color:MUTED,fontSize:11,display:"block",marginTop:3}}>{open?"▲ hide":"▼ dates"}</span>
          </div>
        </div>
      </div>
      {open && (
        <div style={{padding:"0 16px 14px",borderTop:`1px solid ${BORDER}`}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
            {[{label:"Last 12 months",items:fm12,cap:3},{label:"Last 36 months",items:fm36,cap:5}].map(({label,items,cap})=>(
              <div key={label} style={{background:CARD2,borderRadius:12,padding:"12px 14px",border:`1px solid ${fmColor(items.length,cap)}44`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <TrafficDot color={fmColor(items.length,cap)}/>
                  <p style={{color:TEXT,fontSize:13,fontWeight:700,margin:0}}>{label}</p>
                </div>
                <p style={{color:fmColor(items.length,cap),fontSize:22,fontWeight:800,margin:"0 0 1px"}}>{cap-items.length} <span style={{color:MUTED,fontSize:12,fontWeight:400}}>left</span></p>
                <p style={{color:MUTED,fontSize:11,margin:0}}>{items.length} of {cap} used</p>
                {items.length>0&&<div style={{marginTop:8,borderTop:`1px solid ${BORDER}`,paddingTop:6}}>
                  {items.map((d,i)=>(
                    <div key={d.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,padding:"3px 0"}}>
                      <p style={{color:MUTED,fontSize:12,margin:0}}>{fmtDate(d.date)}</p>
                      {onEdit && onDelete && (
                        <div style={{display:"flex",gap:4,flexShrink:0}}>
                          <button onClick={()=>onEdit(d)} style={{background:"none",border:`1px solid ${ACCENT}`,color:ACCENT,borderRadius:6,padding:"3px 7px",fontSize:11,fontWeight:600,cursor:"pointer"}}>Edit</button>
                          <button onClick={()=>onDelete(d.id)} style={{background:"none",border:`1px solid ${DANGER}`,color:DANGER,borderRadius:6,padding:"3px 7px",fontSize:11,fontWeight:600,cursor:"pointer"}}>Del</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>}
                {items.length===0&&<p style={{color:MUTED,fontSize:12,margin:"8px 0 0"}}>No force majeure logged</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Replace the old card render**

Change lines 174-177 from:

```jsx
        <LeaveCard title="Force Majeure" subtitle="No fixed limit · Jan–Dec"
          color={fm.length===0?MUTED:fm.length<=2?SUCCESS:"#F59E0B"} used={fm.length}>
          <DayList items={fm} emptyMsg="No force majeure logged this year" onEdit={onEditDayOff} onDelete={onDeleteDayOff}/>
        </LeaveCard>
```

to:

```jsx
        <ForceMajeureCard fm12={fm12} fm36={fm36} onEdit={onEditDayOff} onDelete={onDeleteDayOff}/>
```

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: builds cleanly, no errors.

- [ ] **Step 7: Commit**

```bash
git add src/screens/LeaveScreen.jsx
git commit -m "feat: replace Force Majeure card with real rolling 12/36-month limits"
```

---

### Task 2: Sick Leave ACP threshold + Self Cert explainer

**Files:**
- Modify: `src/screens/LeaveScreen.jsx:140` (sick color threshold), `:167-170` (Sick Leave card), `:77` (Self Cert subtitle, inside `SelfCertCard`)

**Interfaces:** None new — pure copy/threshold edits within the same file as Task 1. Independent of Task 1's changes (different lines), can be implemented in either order, but this plan runs it second.

- [ ] **Step 1: Update the sick-leave color threshold**

Change line 140 from:

```js
  const sickColor = sick.length<=3?SUCCESS:sick.length<=7?"#F59E0B":DANGER;
```

to:

```js
  const sickColor = sick.length<=7?SUCCESS:sick.length<=9?"#F59E0B":DANGER;
```

- [ ] **Step 2: Update the Sick Leave card**

Change lines 167-170 from:

```jsx
        <LeaveCard title="Sick Leave" subtitle="Certified by doctor · Jan–Dec"
          color={sickColor} used={sick.length}>
          <DayList items={sick} emptyMsg="No sick days logged this year" onEdit={onEditDayOff} onDelete={onDeleteDayOff}/>
        </LeaveCard>
```

to:

```jsx
        <LeaveCard title="Sick Leave" subtitle="Certified by doctor · Jan–Dec" color={sickColor} used={sick.length}>
          <p style={{color:MUTED,fontSize:12,margin:"0 0 8px"}}>13+ certified sick days in a calendar year triggers ACP.</p>
          {sick.length>=13 && (
            <div style={{background:`${DANGER}18`,border:`1px solid ${DANGER}44`,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
              <p style={{color:DANGER,fontSize:13,fontWeight:700,margin:0}}>You've hit the ACP threshold — 13+ certified sick days in a calendar year.</p>
            </div>
          )}
          <DayList items={sick} emptyMsg="No sick days logged this year" onEdit={onEditDayOff} onDelete={onDeleteDayOff}/>
        </LeaveCard>
```

`color`/`used` stay on `LeaveCard` exactly as before — only the card's children changed (the two new lines added above the existing `DayList`).

- [ ] **Step 3: Add the Self Cert explainer line**

In `SelfCertCard`, after the existing subtitle line (currently line 77: `<p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>2 days per half-year · resets 1 Jan & 1 Jul</p>`), add one more line directly beneath it, inside the same `<div>`:

```jsx
              <p style={{color:MUTED,fontSize:11,margin:"2px 0 0"}}>Can't be combined with rest days to create more than 2 consecutive days off (e.g. not the day before or after a weekend).</p>
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: builds cleanly, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/LeaveScreen.jsx
git commit -m "feat: add ACP threshold context to Sick Leave, consecutive-days rule to Self Cert"
```

---

### Task 3: `roster.js` — exclude Bank Holiday In Lieu from week highlights

**Files:**
- Modify: `src/lib/roster.js:154` (the `special` filter inside `weekHighlights`)
- Test: `src/lib/roster.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: no new exports — this is a one-line correctness fix to existing `weekHighlights` behavior, done ahead of Tasks 4-5 so the `"Bank Holiday In Lieu"` type (which those tasks start creating) never incorrectly surfaces as a "day off starts this week" highlight.

- [ ] **Step 1: Write the failing test**

Add this test case to `src/lib/roster.test.js`'s existing `describe("weekHighlights", ...)` block (find it — there's already substantial coverage there for other day-off types; add this alongside, don't modify existing tests):

```js
  it("does not surface a Bank Holiday In Lieu entry as a day-off-starts-this-week highlight", () => {
    const period = {
      id: "bhil1", startDate: "2026-07-19",
      shifts: [{ id: "s1", date: "2026-07-20", roster: "SZ1/01" }],
      daysOff: [{ id: "d1", date: "2026-07-20", type: "Bank Holiday In Lieu" }],
    };
    const lines = weekHighlights([period], "bhil1", "2026-07-19");
    expect(lines.some(l => l.includes("Bank Holiday In Lieu"))).toBe(false);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- roster.test.js`
Expected: FAIL — the current filter (`d.type !== "Rest Day"`) treats `"Bank Holiday In Lieu"` as a "special" day-off type and produces a highlight line for it.

- [ ] **Step 3: Fix the filter**

In `src/lib/roster.js`, change line 154 from:

```js
    .filter(d => d.type !== "Rest Day")
```

to:

```js
    .filter(d => d.type !== "Rest Day" && d.type !== "Bank Holiday In Lieu")
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- roster.test.js`
Expected: PASS — this test, and every pre-existing test in the file (confirms no regression to the other day-off-type highlight behavior).

- [ ] **Step 5: Commit**

```bash
git add src/lib/roster.js src/lib/roster.test.js
git commit -m "fix: exclude Bank Holiday In Lieu from week-highlights special-run detection"
```

---

### Task 4: Bank holiday choice prompt in shift logging

**Files:**
- Modify: `src/screens/LogScreen.jsx:47-48` (new state), `:162-197` (restructure save flow), plus a new `BankHolidayChoiceDialog` component in the same file; `src/screens/LogScreen.jsx:460` area (new render block)
- Modify: `src/App.jsx:296-314` (`saveShift`)

**Interfaces:**
- Produces: `onSave(shiftOrArray, bankHolidayInLieuEntries)` — the existing `onSave` prop's call signature gains a second argument, an array of `{id, date, type: "Bank Holiday In Lieu"}` objects (empty array when no in-lieu choices were made). `saveShift` in `App.jsx` is the sole consumer.

- [ ] **Step 1: Add the new local state in `LogScreen`**

After line 48 (`const [extraDays, setExtraDays] = useState([]);`), add:

```js
  const [bhQueue, setBhQueue] = useState(null); // null = not prompting; array of pending bank-holiday dates still needing a choice
  const [bhChoices, setBhChoices] = useState({}); // date -> "pay" | "lieu", accumulated across the queue
  const [pendingOverwriteId, setPendingOverwriteId] = useState(undefined);
```

- [ ] **Step 2: Add the `BankHolidayChoiceDialog` component**

Add this new component in the same file, right before `export function LogScreen`:

```jsx
function BankHolidayChoiceDialog({date, onChoose}) {
  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{...cardStyle,width:"100%",maxWidth:420,padding:24}}>
        <p style={{color:TEXT,textAlign:"center",margin:"0 0 4px",fontSize:16,fontWeight:700}}>You worked a bank holiday</p>
        <p style={{color:MUTED,textAlign:"center",margin:"0 0 20px",fontSize:14}}>{fmtDate(date)} — how's it being paid?</p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={()=>onChoose("pay")} style={{background:"none",border:`1px solid ${BORDER}`,color:TEXT,borderRadius:10,padding:"13px 0",fontSize:15,fontWeight:600,cursor:"pointer"}}>Bank Holiday Pay</button>
          <button onClick={()=>onChoose("lieu")} style={{background:ACCENT,border:"none",color:"#07090F",borderRadius:10,padding:"13px 0",fontSize:15,fontWeight:700,cursor:"pointer"}}>Day in Lieu (+1¼ annual leave)</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Restructure `performSave` to accept and use bank-holiday choices**

Change `performSave` (currently lines 162-173):

```js
  function performSave(overwriteId) {
    if (extraDays.length > 0) {
      const fields = shiftFields();
      const allDates = [date, ...extraDays];
      onSave(allDates.map(d => ({
        id: d === date ? (overwriteId || editShift?.id || uid()) : uid(),
        date: d, dayType: getDayType(d), ...fields
      })));
      return;
    }
    onSave({ id: overwriteId || editShift?.id || uid(), date, dayType: getDayType(date), ...shiftFields() });
  }
```

to:

```js
  function performSave(overwriteId, bhChoicesMap) {
    const bhilEntries = Object.entries(bhChoicesMap || {})
      .filter(([, choice]) => choice === "lieu")
      .map(([d]) => ({ id: uid(), date: d, type: "Bank Holiday In Lieu" }));
    if (extraDays.length > 0) {
      const fields = shiftFields();
      const allDates = [date, ...extraDays];
      onSave(allDates.map(d => ({
        id: d === date ? (overwriteId || editShift?.id || uid()) : uid(),
        date: d, dayType: getDayType(d), ...fields
      })), bhilEntries);
      return;
    }
    onSave({ id: overwriteId || editShift?.id || uid(), date, dayType: getDayType(date), ...shiftFields() }, bhilEntries);
  }

  // Only fires for a brand-new shift (never when editing one already logged —
  // the real-world payroll choice was already made once, via the depot form,
  // and shouldn't be disturbed by an unrelated later edit). Checks every date
  // in this save (the primary date plus any `extraDays`) for a worked bank
  // holiday and, if any, queues a mandatory choice prompt per date before the
  // actual save proceeds. See
  // docs/superpowers/specs/2026-08-13-bank-holiday-in-lieu-design.md.
  function maybeStartBankHolidaySave(overwriteId) {
    if (editShift) { performSave(overwriteId); return; }
    const allDates = extraDays.length > 0 ? [date, ...extraDays] : [date];
    const bhDates = allDates.filter(d => isBankHoliday(d) && !isRestDay);
    if (bhDates.length === 0) { performSave(overwriteId); return; }
    setBhQueue(bhDates);
    setBhChoices({});
    setPendingOverwriteId(overwriteId);
  }

  function handleBankHolidayChoice(choice) {
    const [current, ...rest] = bhQueue;
    const nextChoices = { ...bhChoices, [current]: choice };
    if (rest.length > 0) { setBhQueue(rest); setBhChoices(nextChoices); return; }
    setBhQueue(null);
    performSave(pendingOverwriteId, nextChoices);
  }
```

- [ ] **Step 4: Route `handleSave`'s three call sites through the new wrapper**

In `handleSave` (currently lines 175-197), replace each of the three `performSave(...)` calls with `maybeStartBankHolidaySave(...)`, same arguments:

- `run: () => performSave(conflictShift.id)` → `run: () => maybeStartBankHolidaySave(conflictShift.id)`
- `run: () => performSave()` (inside the `extraDays.length > 0` branch) → `run: () => maybeStartBankHolidaySave()`
- the final bare `performSave();` → `maybeStartBankHolidaySave();`

Do not change anything else in `handleSave` — the conflict-detection and extra-days confirm-dialog logic above these calls is unrelated and stays exactly as-is.

- [ ] **Step 5: Render the dialog when a bank-holiday choice is pending**

Find the existing `{pendingAction && (<ConfirmDialog .../>)}` render block near the end of the JSX (around line 460). Add a sibling block right after it:

```jsx
        {bhQueue && bhQueue.length > 0 && (
          <BankHolidayChoiceDialog date={bhQueue[0]} onChoose={handleBankHolidayChoice}/>
        )}
```

- [ ] **Step 6: Extend `saveShift` in `App.jsx` to persist Bank Holiday In Lieu entries atomically**

Change `saveShift` (currently lines 296-314):

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

to:

```js
  function saveShift(shiftOrArray, bankHolidayInLieuEntries) {
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
      // Merged in the same update as the shift(s) above so a Bank Holiday In
      // Lieu choice and its shift always save atomically — see
      // docs/superpowers/specs/2026-08-13-bank-holiday-in-lieu-design.md.
      const daysOff = (bankHolidayInLieuEntries && bankHolidayInLieuEntries.length > 0)
        ? [...(p.daysOff || []), ...bankHolidayInLieuEntries]
        : p.daysOff;
      return{...p,shifts,daysOff};
    });
    persist(updated,activePeriodId); setEditShift(null); setLookupDuty(null); setLogInitDate(null); setLogInitRestDay(false); setScreen("home");
  }
```

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: builds cleanly, no errors.

- [ ] **Step 8: Manual verification**

Run `npm run dev`, sign in, log a brand-new shift on a known bank holiday date (check `BANK_HOLIDAYS_IE` in `src/lib/dutyMath.js` for a valid date). Confirm the choice prompt appears before the shift saves, confirm "Bank Holiday Pay" saves the shift with no extra record, confirm "Day in Lieu" saves the shift and creates the extra entry (verify via Period screen showing both the shift and the italic "Bank Holiday In Lieu" row for that date). Confirm editing that same shift afterward does not re-prompt.

- [ ] **Step 9: Commit**

```bash
git add src/screens/LogScreen.jsx src/App.jsx
git commit -m "feat: prompt for bank holiday pay vs day in lieu when logging a worked bank holiday shift"
```

---

### Task 5: Leave page — Bank Holiday In Lieu card + computed Annual Leave total

**Files:**
- Modify: `src/screens/LeaveScreen.jsx` (new computation, Annual Leave card, new card)

**Interfaces:**
- Consumes: `"Bank Holiday In Lieu"`-typed day-off entries produced by Task 4.

- [ ] **Step 1: Add the Bank Holiday In Lieu computation**

Near the existing `annual`/`sick`/`scAll`/`fm12`/`fm36` computations (all derived from `allDaysOff`, the calendar-year-scoped memo — Bank Holiday In Lieu **is** calendar-year scoped, same as Annual Leave, unlike Force Majeure's rolling windows), add:

```js
  const bhil = allDaysOff.filter(d=>d.type==="Bank Holiday In Lieu").sort((a,b)=>a.date.localeCompare(b.date));
```

- [ ] **Step 2: Make the Annual Leave total computed, with a transparent breakdown**

Change the existing lines:

```js
  const annualUsed = annual.length;
  const annualTotal = leaveSettings.annualTotal;
  const annualRem = annualTotal - annualUsed;
```

to:

```js
  const annualUsed = annual.length;
  const annualBase = leaveSettings.annualTotal;
  const annualTotal = annualBase + bhil.length * 1.25;
  const annualRem = annualTotal - annualUsed;
  const annualSubtitle = bhil.length > 0
    ? `${annualBase} + ${bhil.length}×1¼ in lieu = ${annualTotal} days entitlement · Jan–Dec`
    : `${annualBase} days entitlement · Jan–Dec`;
```

Then update the `LeaveCard` for Annual Leave (find `<LeaveCard title="Annual Leave" subtitle={...`) to use the new subtitle variable:

```jsx
        <LeaveCard title="Annual Leave" subtitle={annualSubtitle}
          color={annualColor} used={annualUsed} total={annualTotal} remaining={annualRem}>
```

- [ ] **Step 3: Add the new Bank Holiday In Lieu card**

Add a new `LeaveCard` (reusing the existing generic component — no new bespoke component needed, unlike Force Majeure, since this card has no cap/limit to track, just a running list) right after the Force Majeure card added in Task 1:

```jsx
        <LeaveCard title="Bank Holiday In Lieu" subtitle="Added automatically when you log a bank holiday shift as day in lieu"
          color={bhil.length>0?SUCCESS:MUTED} used={bhil.length}>
          <DayList items={bhil} emptyMsg="No bank holiday in lieu days logged this year" onEdit={onEditDayOff} onDelete={onDeleteDayOff}/>
        </LeaveCard>
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: builds cleanly, no errors.

- [ ] **Step 5: Manual verification**

Following on from Task 4's manual verification (a Bank Holiday In Lieu entry should already exist from that step): open the Leave page, confirm the new card lists the entry with edit/delete, confirm the Annual Leave card's subtitle shows the `base + 1×1¼ = total` breakdown and the total/remaining numbers reflect it. Delete the entry from the new card and confirm the Annual Leave total drops back to the base entitlement automatically.

- [ ] **Step 6: Commit**

```bash
git add src/screens/LeaveScreen.jsx
git commit -m "feat: add Bank Holiday In Lieu card, compute Annual Leave total from it"
```
