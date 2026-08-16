import { useState, useEffect, useMemo } from "react";
import { getDayType, isBankHoliday, addDays, fmtDate, fmtShort, fmtHrs, today, uid, sundayOf, calcSpreadover, addDuration, inPeriod } from "../lib/dutyMath.js";
import { alertsForZone } from "../lib/routeAlerts.js";
import { ZONES, FIXED_DUTY_TYPES, getDuties } from "../lib/roster.js";
import { BG, CARD, BORDER, CARD2, TEXT, MUTED, ACCENT, SUCCESS, DANGER, cardStyle, inputStyle, btnStyle, tag } from "../lib/theme.js";
import { PageHeader, FieldLabel, DateInput, SegGroup, DutyPicker, RouteAlertCard, ConfirmDialog, SettingsButton } from "../components/shared.jsx";

function BankHolidayChoiceDialog({date, onChoose}) {
  const [chosen, setChosen] = useState(false);
  function choose(value) {
    if (chosen) return;
    setChosen(true);
    onChoose(value);
  }
  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{...cardStyle,width:"100%",maxWidth:420,padding:24}}>
        <p style={{color:TEXT,textAlign:"center",margin:"0 0 4px",fontSize:"1rem",fontWeight:700}}>You worked a bank holiday</p>
        <p style={{color:MUTED,textAlign:"center",margin:"0 0 20px",fontSize:"0.875rem"}}>{fmtDate(date)} — how's it being paid?</p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={()=>choose("pay")} style={{background:"none",border:`1px solid ${BORDER}`,color:TEXT,borderRadius:10,padding:"13px 0",fontSize:"0.9375rem",fontWeight:600,cursor:"pointer"}}>Bank Holiday Pay</button>
          <button onClick={()=>choose("lieu")} style={{background:ACCENT,border:"none",color:"#07090F",borderRadius:10,padding:"13px 0",fontSize:"0.9375rem",fontWeight:700,cursor:"pointer"}}>Day in Lieu (+1¼ annual leave)</button>
        </div>
      </div>
    </div>
  );
}

// ─── LOG SHIFT SCREEN ─────────────────────────────────────────────────────────
export function LogScreen({period, editShift, lookupDuty, initialDate, initialRestDay, alerts, onSave, onCancel, onEditConflict, onOpenSettings}) {
  // lookupDuty = {d: dutyObj, dt: dayType} from the Lookup screen
  const initZone = lookupDuty?.d.z || editShift?.zone || "Zone 1";
  const [date, setDate] = useState(lookupDuty?.date || editShift?.date || initialDate || today());
  const [zone, setZone] = useState(initZone);
  const [rIdx, setRIdx] = useState(-1);

  function decToHM(dec) {
    const h = Math.floor(dec || 0), m = Math.round(((dec||0) - h) * 60);
    return {h, m};
  }
  // Convert sign-off string (may be "24:15") to time input value + nextDay flag
  function splitSignOff(t) {
    if (!t) return {val:"00:00", nd:false};
    const [h, m] = t.split(":").map(Number);
    if (h >= 24) return {val:`${String(h-24).padStart(2,"0")}:${String(m||0).padStart(2,"0")}`, nd:true};
    return {val:`${String(h).padStart(2,"0")}:${String(m||0).padStart(2,"0")}`, nd:false};
  }

  const initReport = lookupDuty?.d.s || editShift?.reportTime || "";
  const initSO = splitSignOff(lookupDuty?.d.e || editShift?.signOffTime);
  const wi = lookupDuty ? decToHM(lookupDuty.d.w) : decToHM(editShift?.workHours);
  const ri = lookupDuty ? decToHM(lookupDuty.d.l) : decToHM(editShift?.reliefHours);

  const [reportTime, setReportTime] = useState(initReport);
  const [signOffVal, setSignOffVal] = useState(initSO.val);   // "HH:MM" 00-23
  const [nextDay, setNextDay] = useState(initSO.nd);           // adds 24h
  const [workH, setWorkH] = useState(wi.h);
  const [workM, setWorkM] = useState(wi.m);
  const [reliefH, setReliefH] = useState(ri.h);
  const [reliefM, setReliefM] = useState(ri.m);
  const [notes, setNotes] = useState(editShift?.notes || "");
  const [isSpare, setIsSpare] = useState(editShift?.isSpare || false);
  const [fixedType, setFixedType] = useState(editShift?.fixedType || null);
  const [isRestDay, setIsRestDay] = useState(editShift?.isRestDay || initialRestDay || false);
  const [overtimeH, setOvertimeH] = useState(Math.floor(editShift?.overtimeHours||0));
  const [overtimeM, setOvertimeM] = useState(Math.round(((editShift?.overtimeHours||0)%1)*60));
  const [overtimeNote, setOvertimeNote] = useState(editShift?.overtimeNote || "");
  const [pendingAction, setPendingAction] = useState(null); // {msg, run} — confirm before wiping entered times
  const [extraDays, setExtraDays] = useState([]); // additional dates (same week as `date`) to also log this duty on
  const [bhQueue, setBhQueue] = useState(null); // null = not prompting; array of pending bank-holiday dates still needing a choice
  const [bhChoices, setBhChoices] = useState({}); // date -> "pay" | "lieu", accumulated across the queue
  const [pendingOverwriteId, setPendingOverwriteId] = useState(undefined);
  // "More options" (Rest day + Overtime) — closed by default on a new entry,
  // auto-expanded when editing a shift that already has either set, or when
  // a rest-day carousel card launch pre-sets isRestDay, so nothing already-saved
  // or pre-set is ever hidden behind an extra tap.
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(
    isRestDay || overtimeH > 0 || overtimeM > 0
  );

  function hasEnteredTimes() {
    return !!reportTime || signOffVal!=="00:00" || workH>0 || workM>0 || reliefH>0 || reliefM>0;
  }
  function guardedRun(msg, run) {
    if (hasEnteredTimes()) setPendingAction({msg, run}); else run();
  }

  // Use lookupDuty's dayType for duty filtering when coming from Lookup
  // so the right duties show regardless of today's day — except on a bank
  // holiday, where Sunday duties are mandatory and override any lookup pick.
  const dateDayType = getDayType(date);
  const dutyDayType = (lookupDuty && !isBankHoliday(date)) ? lookupDuty.dt : dateDayType;
  const duties = useMemo(() => getDuties(zone, dutyDayType), [zone, dutyDayType]);
  const zoneAlerts = useMemo(() => alertsForZone(alerts||[], zone, date), [alerts, zone, date]);
  const dayLabel = dateDayType==="sunday"?"Sunday":dateDayType==="saturday"?"Saturday":"Mon–Fri";
  const dayColor = dateDayType==="sunday"?SUCCESS:dateDayType==="saturday"?"#60a5fa":MUTED;

  useEffect(() => {
    const roster = lookupDuty?.d.r || editShift?.roster;
    if (roster && duties.length > 0) {
      const i = duties.findIndex(d => d.r === roster);
      if (i >= 0) { setRIdx(i); return; }
    }
    if (!lookupDuty && !editShift) setRIdx(-1);
  }, [zone, dutyDayType]);

  function pick(i) {
    setRIdx(i);
    if (i >= 0 && duties[i]) {
      const d = duties[i];
      setReportTime(d.s);
      const so = splitSignOff(d.e); setSignOffVal(so.val); setNextDay(so.nd);
      const wh = decToHM(d.w); setWorkH(wh.h); setWorkM(wh.m);
      const rh = decToHM(d.l); setReliefH(rh.h); setReliefM(rh.m);
    }
  }

  // Build sign-off string — add 24h if next day
  function buildSignOff() {
    if (!signOffVal) return "00:00";
    const [h, m] = signOffVal.split(":").map(Number);
    const fh = nextDay ? h + 24 : h;
    return `${String(fh).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  }

  const signOffStr = buildSignOff();
  const inRange = inPeriod(date, period);
  // Same date already has another shift logged (never valid — one driver, one duty a day)
  const conflictShift = (period.shifts||[]).find(s => s.date === date && s.id !== editShift?.id);
  // Same date already has a day off logged (Annual Leave, Sick Day, etc.) — flag, don't block
  const conflictDayOff = (period.daysOff||[]).find(d => d.date === date);
  const canSave = (rIdx >= 0 || isSpare || fixedType) && date && reportTime && signOffVal && inRange;
  const saveBlockReason = !date ? "Pick a date."
    : !inRange ? "This date falls outside the current 5-week period."
    : !(rIdx >= 0 || isSpare || fixedType) ? "Pick a duty, or choose another duty type."
    : (!reportTime || !signOffVal) ? "Enter a start and finish time."
    : null;
  const spreadover = reportTime && signOffVal ? calcSpreadover(reportTime, signOffStr) : null;
  const fixedDef = fixedType ? FIXED_DUTY_TYPES.find(f => f.key === fixedType) : null;

  // For fixed-duration duty types (CPC/Training, spares), auto-calc finish from start + fixed duration
  function handleFixedReportChange(v) {
    setReportTime(v);
    if (fixedDef && v) {
      const so = splitSignOff(addDuration(v, fixedDef.hours + (fixedDef.breakHours||0)));
      setSignOffVal(so.val); setNextDay(so.nd);
    }
  }

  // Unified handler for the CPC-Training/Spare selector — every transition
  // goes through guardedRun so switching type after entering times always
  // warns, unlike the old selectFixedType() which wiped silently. There's no
  // explicit "Duty" button any more — it's the implicit default, so tapping
  // the already-active fixed type deselects it and falls back to Duty rather
  // than being a no-op.
  function selectDutyType(choice) {
    const current = isSpare ? "spare" : fixedType ? fixedType : "duty";
    const next = choice === current ? "duty" : choice;
    guardedRun("Changing duty type will clear the times you've already entered. Continue?", () => {
      setIsSpare(next === "spare");
      setFixedType(next === "duty" || next === "spare" ? null : next);
      setRIdx(-1);
      setReportTime(""); setSignOffVal("00:00"); setNextDay(false);
      setWorkH(0); setWorkM(0); setReliefH(0); setReliefM(0);
      setExtraDays([]);
    });
  }

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

  function handleSave() {
    if (!canSave) return;
    // Overwrite-confirm intentionally also covers the extra-days case (not just a plain
    // single date) - the primary date is never greyed out in the day-circle picker and can
    // still conflict, so this branch has to fire regardless of extraDays.length or the
    // primary date's own save silently gets dropped by saveShift's collision guard.
    if (!editShift && conflictShift) {
      const dutyName = (rIdx>=0 && duties[rIdx]) ? duties[rIdx].r : "";
      const msg = extraDays.length>0
        ? `This will replace the shift already logged for ${fmtDate(date)} (${conflictShift.roster}), and log ${dutyName} on ${extraDays.length} more day${extraDays.length!==1?"s":""}: ${extraDays.map(fmtDate).join(", ")} — continue?`
        : `This will replace the shift already logged for ${fmtDate(date)} (${conflictShift.roster}) — continue?`;
      setPendingAction({ msg, run: () => maybeStartBankHolidaySave(conflictShift.id) });
      return;
    }
    if (extraDays.length > 0) {
      setPendingAction({
        msg: `Log ${(rIdx>=0 && duties[rIdx]) ? duties[rIdx].r : ""} on ${1+extraDays.length} days: ${[date, ...extraDays].map(fmtDate).join(", ")}?`,
        run: () => maybeStartBankHolidaySave()
      });
      return;
    }
    maybeStartBankHolidaySave();
  }

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      {initialRestDay && isRestDay && (
        <div style={{margin:"12px 16px 0",background:`${DANGER}18`,border:`1px solid ${DANGER}44`,borderRadius:12,padding:"10px 14px"}}>
          <p style={{color:DANGER,fontSize:"0.8125rem",fontWeight:600,margin:0}}>Logging this as overtime — you're on a scheduled rest day.</p>
        </div>
      )}
      <PageHeader eyebrow={editShift?"Editing":lookupDuty?"From Lookup":"New entry"} title={editShift?"Edit Shift":"Log a Shift"} onBack={onCancel} right={<SettingsButton onClick={onOpenSettings}/>}/>

      <div style={{padding:"4px 16px 0"}}>
        {lookupDuty && (
          <div style={{background:`${ACCENT}14`,border:`1px solid ${ACCENT}44`,borderRadius:12,padding:"12px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p style={{color:ACCENT,fontSize:"0.8125rem",margin:0,fontWeight:600}}>Pre-filled from Lookup — check the date and save</p>
          </div>
        )}
        {/* Date */}
        <div style={{marginBottom:16}}>
          <FieldLabel htmlFor="log-date">Date</FieldLabel>
          <DateInput id="log-date" value={date} onChange={e => {setDate(e.target.value); setExtraDays([]);}} invalid={!inRange && !!date}/>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
            <span style={tag(dayColor)}>{dayLabel}</span>
          </div>
          {!inRange && date && (
            <p style={{color:DANGER,fontSize:"0.75rem",margin:"8px 0 0",fontWeight:600}}>This date falls outside the current 5-week period ({fmtShort(period.startDate)} – {fmtShort(addDays(period.startDate,34))}).</p>
          )}
          {conflictShift && (
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,padding:"10px 12px",background:`${DANGER}14`,border:`1px solid ${DANGER}44`,borderRadius:10}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:DANGER,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <p style={{color:DANGER,fontSize:"0.8125rem",margin:0}}>A shift ({conflictShift.roster}) is already logged for this date.{!onEditConflict&&" Edit or delete it first, or pick a different date."}</p>
                {/* Jumps straight into editing the conflicting shift, right
                    here, instead of only naming the Period screen where the
                    edit/delete controls actually live. */}
                {onEditConflict && (
                  <button type="button" onClick={()=>onEditConflict(conflictShift)}
                    style={{background:"none",border:"none",color:DANGER,fontSize:"0.8125rem",fontWeight:700,textDecoration:"underline",cursor:"pointer",padding:"4px 0 0",textAlign:"left"}}>
                    Edit that shift instead
                  </button>
                )}
              </div>
            </div>
          )}
          {!conflictShift && conflictDayOff && (
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,padding:"10px 12px",background:"#F59E0B14",border:"1px solid #F59E0B44",borderRadius:10}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#F59E0B",flexShrink:0}}/>
              <p style={{color:"#F59E0B",fontSize:"0.8125rem",margin:0}}>{conflictDayOff.type} is already logged for this date. Saving a shift will keep both records — check that's right.</p>
            </div>
          )}
        </div>

        {/* Zone */}
        <div style={{marginBottom:16}}>
          <FieldLabel>Zone</FieldLabel>
          <SegGroup options={ZONES} value={zone} cols={4}
            onChange={z=>{
              if (z===zone) return;
              guardedRun("Changing zone will clear the times you've already entered. Continue?", ()=>{
                setZone(z);setRIdx(-1);setReportTime("");setSignOffVal("00:00");setNextDay(false);setWorkH(0);setWorkM(0);setReliefH(0);setReliefM(0);setExtraDays([]);
              });
            }}/>
        </div>

        {zoneAlerts.map(a => <RouteAlertCard key={a.id} alert={a}/>)}

        {/* Duty type — a normal roster Duty is the implicit default (no button
            needed for it), so this row is just the 3 exceptions. Tap one to
            switch to it, tap again to go back to a normal Duty. */}
        <div style={{marginBottom:16}}>
          <FieldLabel>Duty type</FieldLabel>
          <p style={{color:MUTED,fontSize:"0.6875rem",margin:"-6px 0 10px"}}>Logging a normal duty? Leave these unselected and pick it below. CPC/Training = Certificate of Professional Competence.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {FIXED_DUTY_TYPES.map(opt => {
              const active = fixedType===opt.key;
              return (
                <button key={opt.key} onClick={()=>selectDutyType(opt.key)} style={{
                  background:active?ACCENT:CARD, color:active?"#07090F":MUTED,
                  border:`1px solid ${active?ACCENT:BORDER}`, borderRadius:10,
                  padding:"10px 6px", fontSize:"0.75rem", fontWeight:600, cursor:"pointer",
                  textAlign:"center", lineHeight:1.3, minWidth:0
                  // minWidth:0 lets a 1fr column shrink below its label's
                  // intrinsic width — without it, "CPC/Training" etc. push
                  // this 3-column grid past the screen at large text sizes
                  // instead of wrapping onto a second line.
                }}>
                  {opt.label}
                  {opt.hours!=null && <div style={{fontSize:"0.625rem",fontWeight:400,opacity:0.85,marginTop:2}}>{fmtHrs(opt.hours)}</div>}
                </button>
              );
            })}
          </div>
        </div>

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
                        fontSize:"0.75rem", fontWeight:700, cursor: (isPrimary || isTaken) ? "not-allowed" : "pointer",
                        opacity: isTaken ? 0.5 : 1
                      }}>{letters[i]}</button>
                  );
                });
              })()}
            </div>
            {extraDays.length>0 && (
              <p style={{color:MUTED,fontSize:"0.75rem",margin:"8px 0 0"}}>Will log on {1+extraDays.length} days total{rIdx>=0 && duties[rIdx] ? ` (${duties[rIdx].r})` : ""}</p>
            )}
          </div>
        )}

        {/* Save moved up here (was after Notes/More options) for a normal
            duty pick specifically: picking a real duty above already
            auto-fills report/finish/work/relief straight from the roster
            (see pick()), so everything Save needs already exists and the
            driver shouldn't have to scroll past review-only fields to
            reach it. Does NOT render for isSpare/fixedType (CPC, Standard
            Spare, Workout Spare) — those hide the duty picker and this
            whole section, and still need a start time typed into Shift
            details below, so Save renders AFTER that instead (see the
            second copy of this exact block, right after Shift details
            closes) rather than sitting above a field it isn't ready for
            yet. Phil caught this split on first look at the moved button. */}
        {!isSpare && !fixedType && (
          <>
            <button style={{...btnStyle,opacity:canSave?1:0.4,cursor:canSave?"pointer":"not-allowed",marginBottom:20}} onClick={handleSave} disabled={!canSave}>
              {editShift ? "Save Changes" : extraDays.length>0 ? `Log ${1+extraDays.length} days` : "Log Shift"}
            </button>
            {!canSave && saveBlockReason && (
              <p style={{color:MUTED,fontSize:"0.75rem",margin:"-12px 0 20px",textAlign:"center"}}>{saveBlockReason}</p>
            )}
          </>
        )}

        {/* Shift details */}
        {(rIdx>=0 || isSpare || fixedType) && (
          <div style={{...cardStyle,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <FieldLabel>{fixedDef ? (fixedDef.full||fixedDef.label) : isSpare?"Spare shift times":"Shift details"}</FieldLabel>
              {!isSpare && !fixedType && <span style={{color:MUTED,fontSize:"0.6875rem",marginTop:-8}}>adjust if needed</span>}
            </div>

            {fixedType ? (
              /* Fixed-duration duty: just a start time, finish is auto-calculated */
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <FieldLabel>Start time</FieldLabel>
                  <input type="time" value={reportTime} onChange={e=>handleFixedReportChange(e.target.value)} style={inputStyle}/>
                </div>
                <div>
                  <FieldLabel>Finish (auto)</FieldLabel>
                  <div style={{...inputStyle,color:TEXT,fontWeight:600}}>
                    {reportTime ? `${signOffVal}${nextDay?" +1":""}` : "—"}
                  </div>
                </div>
              </div>
            ) : (
              /* Report + Sign off — two time pickers side by side */
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:!isSpare?14:0}}>
                <div>
                  <FieldLabel htmlFor="log-report">Report</FieldLabel>
                  <input id="log-report" type="time" value={reportTime} onChange={e=>setReportTime(e.target.value)} style={inputStyle}/>
                </div>
                <div>
                  <FieldLabel htmlFor="log-signoff">Sign off</FieldLabel>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input id="log-signoff" type="time" value={signOffVal} onChange={e=>setSignOffVal(e.target.value)} style={{...inputStyle,flex:1,minWidth:0}}/>
                    <button onClick={()=>setNextDay(!nextDay)} style={{
                      background:nextDay?ACCENT:CARD2,color:nextDay?"#07090F":MUTED,
                      border:`1px solid ${nextDay?ACCENT:BORDER}`,borderRadius:8,
                      padding:"10px 7px",fontSize:"0.625rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0
                    }}>+1</button>
                  </div>
                  {nextDay&&<p style={{color:ACCENT,fontSize:"0.6875rem",margin:"3px 0 0"}}>Next day</p>}
                </div>
              </div>
            )}

            {/* Work + Relief — display tiles, not editable number boxes */}
            {!isSpare && !fixedType && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <FieldLabel>Work</FieldLabel>
                  <div style={{...inputStyle,color:TEXT,fontWeight:600}}>{workH>0||workM>0?fmtHrs(workH+workM/60):"—"}</div>
                </div>
                <div>
                  <FieldLabel>Relief</FieldLabel>
                  <div style={{...inputStyle,color:reliefH>0||reliefM>0?TEXT:MUTED,fontWeight:reliefH>0||reliefM>0?600:400}}>{reliefH>0||reliefM>0?fmtHrs(reliefH+reliefM/60):"—"}</div>
                </div>
              </div>
            )}
            {spreadover !== null && (
              <div style={{display:"flex",alignItems:"center",gap:8,margin:"16px 0 0",paddingTop:14,borderTop:`1px solid ${BORDER}`}}>
                <span style={{color:MUTED,fontSize:"0.8125rem"}}>Spreadover</span>
                <span style={{color:ACCENT,fontSize:"0.9375rem",fontWeight:700}}>{fmtHrs(spreadover)}</span>
                {!isSpare&&!fixedType&&duties[rIdx]?.b&&duties[rIdx]?.bs&&<span style={{color:MUTED,fontSize:"0.75rem",marginLeft:"auto"}}>Break at {duties[rIdx].bs}</span>}
              </div>
            )}
          </div>
        )}

        {/* Second copy of the exact same Save block — see the first copy's
            comment above the Duty section for why this one exists.
            Spare/CPC/Workout Spare still need the start time just entered
            in Shift details above, so Save goes here instead of before it. */}
        {(isSpare || fixedType) && (
          <>
            <button style={{...btnStyle,opacity:canSave?1:0.4,cursor:canSave?"pointer":"not-allowed",marginBottom:20}} onClick={handleSave} disabled={!canSave}>
              {editShift ? "Save Changes" : extraDays.length>0 ? `Log ${1+extraDays.length} days` : "Log Shift"}
            </button>
            {!canSave && saveBlockReason && (
              <p style={{color:MUTED,fontSize:"0.75rem",margin:"-12px 0 20px",textAlign:"center"}}>{saveBlockReason}</p>
            )}
          </>
        )}

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
                  <p style={{color:TEXT,fontSize:"0.875rem",fontWeight:600,margin:0}}>More options</p>
                  {summary && <p style={{color:isRestDay?DANGER:ACCENT,fontSize:"0.75rem",margin:"2px 0 0",fontWeight:600}}>{summary}</p>}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,transform:moreOptionsOpen?"rotate(180deg)":"none",transition:"transform 0.2s"}}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {moreOptionsOpen && (
                <div style={{padding:"0 16px 16px"}}>
                  {/* Rest day working toggle */}
                  <div style={{...cardStyle,marginBottom:14,padding:"14px 16px",border:isRestDay?`1px solid ${DANGER}44`:`1px solid ${BORDER}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setIsRestDay(!isRestDay)}>
                      <div>
                        <p style={{color:isRestDay?DANGER:TEXT,fontSize:"0.875rem",fontWeight:600,margin:0}}>Working on a rest day</p>
                        <p style={{color:MUTED,fontSize:"0.75rem",margin:"2px 0 0"}}>All hours count as overtime — excluded from 190h limit</p>
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
                      <p style={{color:MUTED,fontSize:"0.75rem",margin:"0 0 10px"}}>Extra time worked on top of this duty — tracked separately, doesn't count toward 190h</p>
                      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:12}}>
                        <input id="log-ot-h" type="number" min="0" max="12" value={overtimeH} onChange={e=>setOvertimeH(Math.min(12,Math.max(0,parseInt(e.target.value)||0)))} style={{...inputStyle,padding:"12px 8px",textAlign:"center",minWidth:58}} />
                        <span style={{color:MUTED,fontSize:"0.8125rem"}}>h</span>
                        <input type="number" min="0" max="59" value={overtimeM} onChange={e=>setOvertimeM(Math.min(59,Math.max(0,parseInt(e.target.value)||0)))} style={{...inputStyle,padding:"12px 8px",textAlign:"center",minWidth:58}} />
                        <span style={{color:MUTED,fontSize:"0.8125rem"}}>m</span>
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

        {/* Notes — only show once a duty is selected */}
        {(rIdx>=0 || isSpare || fixedType) && (
          <div style={{marginBottom:20}}>
            <FieldLabel htmlFor="log-notes" hint="optional">Notes</FieldLabel>
            <textarea id="log-notes" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. duty changed at short notice, covered for a colleague"
              style={{...inputStyle,minHeight:72,resize:"vertical",fontFamily:"inherit",lineHeight:1.5}} />
          </div>
        )}

        {pendingAction && (
          <ConfirmDialog msg={pendingAction.msg} yesLabel="Continue" danger={false}
            onYes={()=>{pendingAction.run();setPendingAction(null);}}
            onNo={()=>setPendingAction(null)}/>
        )}
        {bhQueue && bhQueue.length > 0 && (
          <BankHolidayChoiceDialog key={bhQueue[0]} date={bhQueue[0]} onChoose={handleBankHolidayChoice}/>
        )}
      </div>
    </div>
  );
}
