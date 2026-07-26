# Log Shift Screen IA Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shrink and simplify `LogScreen.jsx` by merging the duty-type controls (Duty/Spare/CPC-Training/etc.) into one unified selector, and collapsing the rarely-used Rest day + Overtime sections behind a single "More options" disclosure.

**Architecture:** Pure UI/state reorg inside one file, `src/screens/LogScreen.jsx`. No changes to `dutyMath.js`, `roster.js`, or any save/sync logic — `shiftFields()`, `performSave()`, and the shape of a saved shift are untouched.

**Tech Stack:** React (function components, `useState`), no new dependencies. This codebase has no component-level test harness for JSX screens (only pure functions in `src/lib/*.js` have `vitest` tests — confirmed via `src/lib/*.test.js`) — verification for this plan is `npm run build` + `npm run lint` (clean) plus live browser interaction checks, matching how every prior `LogScreen` change in this repo has been verified.

## Global Constraints

- No changes to `dutyMath.js`, `roster.js`, or any pure function — this is presentation-only (per spec's Non-goals).
- No changes to `shiftFields()`, `performSave()`, or the saved-shift data shape.
- Every duty-type transition (Duty ↔ Spare ↔ any fixed type) must go through the existing `guardedRun` wipe-confirmation — today `selectFixedType()` skips it; this plan fixes that as part of unifying the control (per spec Approach A).
- "More options" must auto-expand when editing a shift (`editShift` truthy) with `isRestDay` true or `overtimeHours > 0` — never hide already-set data behind a closed collapse (per spec Approach B).
- Collapsing "More options" must never clear `isRestDay`/`overtimeH`/`overtimeM`/`overtimeNote` state.

---

### Task 1: Unified duty-type control

**Files:**
- Modify: `src/screens/LogScreen.jsx:118-124` (the `selectFixedType` function)
- Modify: `src/screens/LogScreen.jsx:277-309` (the Spare toggle card + "Other duty types" grid)

**Interfaces:**
- Consumes: existing state setters already in scope — `isSpare`/`setIsSpare`, `fixedType`/`setFixedType`, `rIdx`/`setRIdx`, `reportTime`/`setReportTime`, `signOffVal`/`setSignOffVal`, `nextDay`/`setNextDay`, `workH`/`setWorkH`, `workM`/`setWorkM`, `reliefH`/`setReliefH`, `reliefM`/`setReliefM`, `extraDays`/`setExtraDays`, `guardedRun(msg, run)`. `FIXED_DUTY_TYPES` already imported from `../lib/roster.js` (array of `{key, label, full?, roster, hours, breakHours}` — confirmed 3 entries: `cpc`, `stdSpare`, `workSpare`).
- Produces: a new function `selectDutyType(choice)` where `choice` is `"duty"`, `"spare"`, or a `FIXED_DUTY_TYPES[].key` string. Replaces the old `selectFixedType(key)` — no other code in this file calls `selectFixedType`, so removing it is safe (verify with a grep in Step 1 before deleting).

- [ ] **Step 1: Confirm `selectFixedType` has no other callers**

Run: `grep -n "selectFixedType" "src/screens/LogScreen.jsx"`
Expected: only the function definition (line ~118) and nothing else — the only call site today is inside the JSX being replaced in this same task (the "Other duty types" grid's `onClick={()=>selectFixedType(f.key)}`), which Step 3 removes in the same change.

- [ ] **Step 2: Replace `selectFixedType` with unified `selectDutyType`**

Find this in `src/screens/LogScreen.jsx` (lines 118-124):

```jsx
  function selectFixedType(key) {
    const active = fixedType === key;
    setFixedType(active ? null : key);
    setIsSpare(false); setRIdx(-1);
    setReportTime(""); setSignOffVal("00:00"); setNextDay(false);
    setExtraDays([]);
  }
```

Replace with:

```jsx
  // Unified handler for the Duty/Spare/CPC-Training/etc. selector — every
  // transition goes through guardedRun so switching type after entering
  // times always warns, unlike the old selectFixedType() which wiped silently.
  function selectDutyType(choice) {
    const current = isSpare ? "spare" : fixedType ? fixedType : "duty";
    if (choice === current) return;
    guardedRun("Changing duty type will clear the times you've already entered. Continue?", () => {
      if (choice === "duty") {
        setIsSpare(false); setFixedType(null);
      } else if (choice === "spare") {
        setIsSpare(true); setFixedType(null); setRIdx(-1);
      } else {
        setIsSpare(false); setFixedType(choice); setRIdx(-1);
      }
      setReportTime(""); setSignOffVal("00:00"); setNextDay(false);
      setWorkH(0); setWorkM(0); setReliefH(0); setReliefM(0);
      setExtraDays([]);
    });
  }
```

- [ ] **Step 3: Replace the Spare toggle card + "Other duty types" grid with one unified selector**

Find this block in `src/screens/LogScreen.jsx` (lines 277-309, right after the "Also log this duty on" section and before "Shift details"):

```jsx
        {/* Spare driver toggle — compact, sits between duty and shift details */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,padding:"10px 14px",background:CARD,border:`1px solid ${isSpare?ACCENT:BORDER}`,borderRadius:12,cursor:"pointer"}} onClick={()=>{
          guardedRun("Toggling Spare will clear the times you've already entered. Continue?", ()=>{
            const ns=!isSpare;setIsSpare(ns);if(ns)setFixedType(null);setRIdx(-1);setReportTime("");setSignOffVal("00:00");setNextDay(false);setWorkH(0);setWorkM(0);setExtraDays([]);
          });
        }}>
          <span style={{color:isSpare?ACCENT:MUTED,fontSize:13,fontWeight:600}}>Spare driver shift</span>
          <div style={{width:40,height:24,borderRadius:12,background:isSpare?ACCENT:BORDER,position:"relative",transition:"background 0.2s",flexShrink:0}}>
            <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:isSpare?19:3,transition:"left 0.2s"}}/>
          </div>
        </div>

        {/* Other duty types — CPC/Training & fixed-duration spares */}
        <div style={{marginBottom:16}}>
          <FieldLabel>Other duty types</FieldLabel>
          <p style={{color:MUTED,fontSize:11,margin:"-6px 0 10px"}}>CPC/Training = Certificate of Professional Competence</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {FIXED_DUTY_TYPES.map(f => {
              const active = fixedType === f.key;
              return (
                <button key={f.key} onClick={()=>selectFixedType(f.key)} style={{
                  background:active?ACCENT:CARD, color:active?"#07090F":MUTED,
                  border:`1px solid ${active?ACCENT:BORDER}`, borderRadius:10,
                  padding:"10px 6px", fontSize:12, fontWeight:600, cursor:"pointer",
                  textAlign:"center", lineHeight:1.3
                }}>
                  {f.label}
                  <div style={{fontSize:10,fontWeight:400,opacity:0.85,marginTop:2}}>{fmtHrs(f.hours)}</div>
                </button>
              );
            })}
          </div>
        </div>
```

Replace with:

```jsx
        {/* Duty type — Duty/Spare/CPC-Training/etc. as one selector, replacing
            the old separate Spare toggle + "Other duty types" grid */}
        <div style={{marginBottom:16}}>
          <FieldLabel>Duty type</FieldLabel>
          <p style={{color:MUTED,fontSize:11,margin:"-6px 0 10px"}}>CPC/Training = Certificate of Professional Competence</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[
              {key:"duty", label:"Duty", hours:null},
              {key:"spare", label:"Spare", hours:null},
              ...FIXED_DUTY_TYPES.map(f=>({key:f.key, label:f.label, hours:f.hours})),
            ].map(opt => {
              const active = opt.key==="duty" ? (!isSpare && !fixedType)
                : opt.key==="spare" ? isSpare
                : fixedType===opt.key;
              return (
                <button key={opt.key} onClick={()=>selectDutyType(opt.key)} style={{
                  background:active?ACCENT:CARD, color:active?"#07090F":MUTED,
                  border:`1px solid ${active?ACCENT:BORDER}`, borderRadius:10,
                  padding:"10px 6px", fontSize:12, fontWeight:600, cursor:"pointer",
                  textAlign:"center", lineHeight:1.3
                }}>
                  {opt.label}
                  {opt.hours!=null && <div style={{fontSize:10,fontWeight:400,opacity:0.85,marginTop:2}}>{fmtHrs(opt.hours)}</div>}
                </button>
              );
            })}
          </div>
        </div>
```

Note: the "Duty" section above this block (the `DutyPicker`, gated on `!isSpare && !fixedType`) and the "Also log this duty on" section (same gating) are unchanged — they already key off `isSpare`/`fixedType`, which this task still sets correctly via `selectDutyType`.

- [ ] **Step 4: Build and lint clean**

Run: `npm run build`
Expected: `vite build` completes with no errors, same 86-module count as before this change (no new modules added).

Run: `npm run lint`
Expected: no new warnings/errors beyond the pre-existing baseline (check `git stash` + re-run if unsure which warnings are pre-existing).

- [ ] **Step 5: Live-verify in browser**

Start the dev server (`db-tracker` launch config) and open Log a Shift:
1. Confirm the new "Duty type" grid shows 5 buttons: Duty, Spare, CPC/Training, Standard Spare, Workout Spare — "Duty" active by default.
2. Pick a normal duty from the picker, enter/confirm times, save — confirm the saved shift has `isSpare:false`, `fixedType:null`, and the right `roster`.
3. Tap "Spare" — confirm the guard prompt appears if times were entered, `DutyPicker` disappears, times clear on confirm. Save a spare shift, confirm it saves with `isSpare:true`.
4. Tap "CPC/Training" — confirm the guard prompt behavior (this is the new behavior — previously silent), start-time auto-calculates finish time, save works.
5. Switch from one fixed type directly to another (e.g. CPC/Training → Workout Spare) — confirm the guard fires and the auto-calculated finish updates for the newly selected type's duration.

- [ ] **Step 6: Commit**

```bash
git add src/screens/LogScreen.jsx
git commit -m "$(cat <<'EOF'
Merge Spare toggle and Other-duty-types grid into one Duty-type selector

Replaces two separate UI patterns (a switch, a button grid) doing the
same job with one unified control (Duty/Spare/CPC-Training/etc.), and
routes every transition through the existing guardedRun wipe-confirm
- previously only the Spare toggle had it, fixed-type switches wiped
entered times silently.
EOF
)"
```

---

### Task 2: Collapsible "More options" (Rest day + Overtime)

**Files:**
- Modify: `src/screens/LogScreen.jsx` — add one new `useState` near the other state declarations (after line 48, `const [extraDays, ...] = useState([]);`)
- Modify: `src/screens/LogScreen.jsx:379-413` (the Rest day toggle card + Overtime card)

**Interfaces:**
- Consumes: `isRestDay`, `overtimeH`, `overtimeM`, `overtimeNote` (all already in scope from Task 1's unaffected state), `editShift` (prop, already in scope).
- Produces: new state `moreOptionsOpen`/`setMoreOptionsOpen` (boolean), initialized so editing a shift with rest-day or overtime already set starts expanded.

- [ ] **Step 1: Add `moreOptionsOpen` state**

Find this line in `src/screens/LogScreen.jsx` (line 48):

```jsx
  const [extraDays, setExtraDays] = useState([]); // additional dates (same week as `date`) to also log this duty on
```

Add immediately after it:

```jsx
  // "More options" (Rest day + Overtime) — closed by default on a new entry,
  // auto-expanded when editing a shift that already has either set, so
  // nothing already-saved is ever hidden behind an extra tap.
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(
    !!editShift && (editShift.isRestDay || (editShift.overtimeHours || 0) > 0)
  );
```

- [ ] **Step 2: Replace the Rest day + Overtime cards with a collapsible section**

Find this block in `src/screens/LogScreen.jsx` (lines 379-413, right after the "Shift details" card and before "Notes"):

```jsx
        {/* Rest day working toggle */}
        {(rIdx>=0 || isSpare || fixedType) && (
          <div style={{...cardStyle,marginBottom:16,padding:"14px 16px",border:isRestDay?`1px solid ${DANGER}44`:`1px solid ${BORDER}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setIsRestDay(!isRestDay)}>
              <div>
                <p style={{color:isRestDay?DANGER:TEXT,fontSize:14,fontWeight:600,margin:0}}>Working on a rest day</p>
                <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>All hours count as overtime — excluded from 190h limit</p>
              </div>
              <div style={{width:44,height:26,borderRadius:13,background:isRestDay?DANGER:BORDER,position:"relative",transition:"background 0.2s",flexShrink:0}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:isRestDay?21:3,transition:"left 0.2s"}}/>
              </div>
            </div>
          </div>
        )}

        {/* Overtime section */}
        {(rIdx>=0 || isSpare || fixedType) && !isRestDay && (
          <div style={{...cardStyle,marginBottom:16}}>
            <FieldLabel htmlFor="log-ot-h" hint="optional">Overtime hours</FieldLabel>
            <p style={{color:MUTED,fontSize:12,margin:"0 0 10px"}}>Extra time worked on top of this duty — tracked separately, doesn't count toward 190h</p>
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:12}}>
              <input id="log-ot-h" type="number" min="0" max="12" value={overtimeH} onChange={e=>setOvertimeH(Math.min(12,Math.max(0,parseInt(e.target.value)||0)))} style={{...inputStyle,padding:"12px 8px",textAlign:"center",minWidth:58}} />
              <span style={{color:MUTED,fontSize:13}}>h</span>
              <input type="number" min="0" max="59" value={overtimeM} onChange={e=>setOvertimeM(Math.min(59,Math.max(0,parseInt(e.target.value)||0)))} style={{...inputStyle,padding:"12px 8px",textAlign:"center",minWidth:58}} />
              <span style={{color:MUTED,fontSize:13}}>m</span>
            </div>
            {(overtimeH > 0 || overtimeM > 0) && (
              <div>
                <FieldLabel htmlFor="log-ot-note" hint="optional">What was this overtime for?</FieldLabel>
                <textarea id="log-ot-note" value={overtimeNote} onChange={e=>setOvertimeNote(e.target.value)}
                  placeholder="e.g. covered part of duty, late relief, traffic delay"
                  style={{...inputStyle,minHeight:64,resize:"vertical",fontFamily:"inherit",lineHeight:1.5}} />
              </div>
            )}
          </div>
        )}
```

Replace with:

```jsx
        {/* More options — Rest day + Overtime, collapsed by default */}
        {(rIdx>=0 || isSpare || fixedType) && (() => {
          const summaryParts = [];
          if (isRestDay) summaryParts.push("Rest day");
          if (!isRestDay && (overtimeH > 0 || overtimeM > 0)) summaryParts.push(`+${fmtHrs(overtimeH + overtimeM/60)} overtime`);
          const summary = summaryParts.join(" · ");
          return (
            <div style={{...cardStyle,marginBottom:16,padding:0,overflow:"hidden"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",cursor:"pointer"}} onClick={()=>setMoreOptionsOpen(!moreOptionsOpen)}>
                <div>
                  <p style={{color:TEXT,fontSize:14,fontWeight:600,margin:0}}>More options</p>
                  {summary && <p style={{color:isRestDay?DANGER:ACCENT,fontSize:12,margin:"2px 0 0",fontWeight:600}}>{summary}</p>}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,transform:moreOptionsOpen?"rotate(180deg)":"none",transition:"transform 0.2s"}}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {moreOptionsOpen && (
                <div style={{padding:"0 16px 16px"}}>
                  {/* Rest day working toggle */}
                  <div style={{...cardStyle,marginBottom:14,padding:"14px 16px",border:isRestDay?`1px solid ${DANGER}44`:`1px solid ${BORDER}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setIsRestDay(!isRestDay)}>
                      <div>
                        <p style={{color:isRestDay?DANGER:TEXT,fontSize:14,fontWeight:600,margin:0}}>Working on a rest day</p>
                        <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>All hours count as overtime — excluded from 190h limit</p>
                      </div>
                      <div style={{width:44,height:26,borderRadius:13,background:isRestDay?DANGER:BORDER,position:"relative",transition:"background 0.2s",flexShrink:0}}>
                        <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:isRestDay?21:3,transition:"left 0.2s"}}/>
                      </div>
                    </div>
                  </div>

                  {/* Overtime section */}
                  {!isRestDay && (
                    <div style={{...cardStyle}}>
                      <FieldLabel htmlFor="log-ot-h" hint="optional">Overtime hours</FieldLabel>
                      <p style={{color:MUTED,fontSize:12,margin:"0 0 10px"}}>Extra time worked on top of this duty — tracked separately, doesn't count toward 190h</p>
                      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:12}}>
                        <input id="log-ot-h" type="number" min="0" max="12" value={overtimeH} onChange={e=>setOvertimeH(Math.min(12,Math.max(0,parseInt(e.target.value)||0)))} style={{...inputStyle,padding:"12px 8px",textAlign:"center",minWidth:58}} />
                        <span style={{color:MUTED,fontSize:13}}>h</span>
                        <input type="number" min="0" max="59" value={overtimeM} onChange={e=>setOvertimeM(Math.min(59,Math.max(0,parseInt(e.target.value)||0)))} style={{...inputStyle,padding:"12px 8px",textAlign:"center",minWidth:58}} />
                        <span style={{color:MUTED,fontSize:13}}>m</span>
                      </div>
                      {(overtimeH > 0 || overtimeM > 0) && (
                        <div>
                          <FieldLabel htmlFor="log-ot-note" hint="optional">What was this overtime for?</FieldLabel>
                          <textarea id="log-ot-note" value={overtimeNote} onChange={e=>setOvertimeNote(e.target.value)}
                            placeholder="e.g. covered part of duty, late relief, traffic delay"
                            style={{...inputStyle,minHeight:64,resize:"vertical",fontFamily:"inherit",lineHeight:1.5}} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
```

Note: `cardStyle` is spread with `padding:0` on the outer wrapper (so the header's own padding controls its look when collapsed) and the inner content re-applies its own padding — check `cardStyle`'s definition in `src/lib/theme.js` if the collapsed header looks visually off (e.g. if `cardStyle` sets a `background`/`border` that conflicts with `padding:0`); adjust only the outer wrapper's inline overrides if so, not `cardStyle` itself (shared by every other card in the app).

- [ ] **Step 3: Build and lint clean**

Run: `npm run build`
Expected: clean, same module count.

Run: `npm run lint`
Expected: no new warnings.

- [ ] **Step 4: Live-verify in browser**

1. Open Log a Shift as a new entry, pick a duty — confirm "More options" renders collapsed with no summary line (just "More options" + chevron).
2. Expand it, toggle "Working on a rest day" on — confirm the header (while still open) doesn't need to show the summary yet, but collapse it and confirm the summary now reads "Rest day", and the Overtime card is hidden while it's on (unchanged existing behavior).
3. Turn rest day back off, enter overtime (e.g. 0h 45m) — collapse "More options" — confirm the summary reads "+0h 45m overtime" (check `fmtHrs`'s exact output format in `src/lib/dutyMath.js` and adjust the expected string in this check accordingly, not the code).
4. Save the shift, then re-open it via Edit — confirm "More options" is already expanded (auto-expand on edit) and the overtime value is still there.
5. With "More options" expanded and overtime entered, collapse it, then expand it again without navigating away — confirm the overtime value is still present (state wasn't cleared by collapsing).

- [ ] **Step 5: Commit**

```bash
git add src/screens/LogScreen.jsx
git commit -m "$(cat <<'EOF'
Collapse Rest day + Overtime into one More-options section on Log Shift

Closed by default so the common save path doesn't scroll past two
cards almost nobody touches per shift; auto-expands when editing a
shift that already has either set, so nothing already-saved is ever
hidden behind an extra tap. Collapsing never clears the underlying
state - only the DOM visibility changes.
EOF
)"
```

---

## Post-implementation

After both tasks: re-read the full `LogScreen.jsx` once to confirm the page reads correctly top-to-bottom (Date → Zone → route alerts → Duty type selector → conditionally DutyPicker → Also-log-on → Shift details → More options → Notes → Save), then do one full live click-through covering a normal duty, a spare, and a fixed type, each through to a successful save, before considering this done. This mirrors how every other `LogScreen` change in this repo's history has been closed out (see project memory) — no separate task needed, just the closing check.
