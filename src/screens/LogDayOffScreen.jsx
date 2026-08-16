import { useState, useMemo } from "react";
import { LOGGABLE_DAY_OFF_TYPES, addDays, fmtDate, today, uid } from "../lib/dutyMath.js";
import { BG, CARD, BORDER, TEXT, MUTED, ACCENT, DANGER, btnStyle } from "../lib/theme.js";
import { PageHeader, FieldLabel, DateInput, SettingsButton, ConfirmDialog } from "../components/shared.jsx";

// ─── LOG DAY OFF SCREEN ───────────────────────────────────────────────────────
export function LogDayOffScreen({periods, editDayOff, onSave, onCancel, onOpenSettings}) {
  const [type, setType] = useState(editDayOff?.type || LOGGABLE_DAY_OFF_TYPES[0]);
  const typeOptions = LOGGABLE_DAY_OFF_TYPES;
  const [date, setDate] = useState(editDayOff?.date || today());
  // Range mode for Annual Leave
  const [rangeTo, setRangeTo] = useState(editDayOff?.date || today());
  const isRange = !editDayOff;

  // Generate all calendar days between from and to inclusive
  function getDaysInRange(from, to) {
    const days = [];
    let cur = from;
    while (cur <= to) {
      days.push(cur);
      cur = addDays(cur, 1);
    }
    return days;
  }

  const rangeDays = isRange ? getDaysInRange(date, rangeTo < date ? date : rangeTo) : [];
  const rangeCount = rangeDays.length;
  const [pendingAction, setPendingAction] = useState(null);
  // Guards against a duplicate entry from a double-tap or a mobile browser's
  // touchend+click double-fire on one tap — onSave mutates App.jsx state
  // synchronously, but two rapid clicks can both fire before React re-renders
  // and disables this button, so track it locally too.
  const [saving, setSaving] = useState(false);

  const allShifts = useMemo(()=>periods.flatMap(p=>p.shifts||[]), [periods]);
  // A day off replaces a shift already logged that date (a driver can't work
  // and be on leave the same day) — one shift per conflicting date, in order.
  // Bank Holiday In Lieu is the one exception: it's always logged alongside a
  // real worked shift on purpose (the shift IS the bank holiday worked), so it
  // must never be treated as conflicting with — and replacing — that shift.
  const conflictShifts = type === "Bank Holiday In Lieu" ? [] : (isRange ? rangeDays : [date])
    .map(d => allShifts.find(s => s.date === d))
    .filter(Boolean);

  // A driver can only be on one kind of day off per date, so a second one
  // (any type) replaces the first — same confirm-and-replace pattern as a
  // shift above, not a dead-end block.
  const allDaysOff = useMemo(()=>periods.flatMap(p=>p.daysOff||[]), [periods]);
  const conflictDayOffs = (isRange ? rangeDays : [date])
    .map(d => allDaysOff.find(o => o.date === d && o.id !== editDayOff?.id))
    .filter(Boolean);

  function performSave() {
    if (saving) return;
    setSaving(true);
    const shiftIds = conflictShifts.map(s=>s.id);
    const dayOffIds = conflictDayOffs.map(o=>o.id);
    if (isRange && rangeCount > 0) {
      onSave(rangeDays.map(d => ({id:uid(), date:d, type})), shiftIds, dayOffIds);
    } else {
      onSave({id:editDayOff?.id||uid(), date, type}, shiftIds, dayOffIds);
    }
  }

  function handleSave() {
    if (saving) return;
    if (conflictShifts.length > 0 || conflictDayOffs.length > 0) {
      const parts = [];
      if (conflictShifts.length > 0) parts.push(conflictShifts.length===1
        ? `the shift already logged for ${fmtDate(conflictShifts[0].date)} (${conflictShifts[0].roster})`
        : `${conflictShifts.length} shifts already logged (${conflictShifts.map(s=>`${fmtDate(s.date)}: ${s.roster}`).join(", ")})`);
      if (conflictDayOffs.length > 0) parts.push(conflictDayOffs.length===1
        ? `the ${conflictDayOffs[0].type} already logged for ${fmtDate(conflictDayOffs[0].date)}`
        : `${conflictDayOffs.length} day offs already logged (${conflictDayOffs.map(o=>`${fmtDate(o.date)}: ${o.type}`).join(", ")})`);
      setPendingAction({ msg: `This will replace ${parts.join(" and ")} with ${type} — continue?`, run: performSave });
      return;
    }
    performSave();
  }

  const canSave = date && (isRange ? rangeCount > 0 : true) && !saving;

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      <PageHeader eyebrow={editDayOff?"Editing":"New entry"} title={editDayOff?"Edit Day Off":"Log Day Off"} onBack={onCancel} right={<SettingsButton onClick={onOpenSettings}/>}/>

      <div style={{padding:"4px 16px 0"}}>

        {/* Type selector */}
        <div style={{marginBottom:20}}>
          <FieldLabel>Type</FieldLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {typeOptions.map(t=>{
              const sel = type===t;
              return (
                <button key={t} onClick={()=>setType(t)} style={{
                  background: sel?`${ACCENT}18`:CARD,
                  border:`1px solid ${sel?ACCENT:BORDER}`,
                  borderRadius:12, padding:"14px 12px", cursor:"pointer",
                  textAlign:"left", display:"flex",alignItems:"center",gap:10
                }}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:sel?ACCENT:BORDER,flexShrink:0}}/>
                  <span style={{color:sel?TEXT:MUTED,fontSize:"0.875rem",fontWeight:sel?700:500}}>{t}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date — single or range */}
        {isRange ? (
          <div style={{marginBottom:20}}>
            <FieldLabel>Date range</FieldLabel>
            <p style={{color:MUTED,fontSize:"0.75rem",margin:"0 0 10px"}}>Select the first and last day — all days in between will be logged. Logging just one day? Leave From and To the same.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              {/* minWidth:0 lets each column shrink below its native
                  <input type="date"> — which has its own irreducible
                  minimum rendering width — instead of the grid track
                  expanding past the screen once text scale makes the
                  squeeze worse than it already is at 100%. */}
              <div style={{minWidth:0}}>
                <p style={{color:MUTED,fontSize:"0.6875rem",textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 6px"}}>From</p>
                <DateInput value={date} onChange={e=>setDate(e.target.value)}/>
              </div>
              <div style={{minWidth:0}}>
                <p style={{color:MUTED,fontSize:"0.6875rem",textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 6px"}}>To</p>
                <DateInput value={rangeTo < date ? date : rangeTo} onChange={e=>setRangeTo(e.target.value)} min={date}/>
              </div>
            </div>
            {rangeCount > 0 && (
              <div style={{background:`${ACCENT}14`,border:`1px solid ${ACCENT}33`,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{color:ACCENT,fontSize:"1.125rem"}}>📅</span>
                <p style={{color:ACCENT,fontSize:"0.8125rem",fontWeight:700,margin:0}}>
                  {rangeCount} day{rangeCount!==1?"s":""} of {type}
                  {rangeCount > 1 ? ` · ${fmtDate(date)} to ${fmtDate(rangeTo < date ? date : rangeTo)}` : ""}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{marginBottom:20}}>
            <FieldLabel>Date</FieldLabel>
            <DateInput value={date} onChange={e=>setDate(e.target.value)}/>
          </div>
        )}

        {conflictDayOffs.length > 0 && (
          <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:16,padding:"10px 12px",background:`${DANGER}14`,border:`1px solid ${DANGER}44`,borderRadius:10}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:DANGER,flexShrink:0,marginTop:6}}/>
            <p style={{color:DANGER,fontSize:"0.8125rem",margin:0}}>
              {conflictDayOffs.length===1
                ? `${conflictDayOffs[0].type} is already logged on ${fmtDate(conflictDayOffs[0].date)}.`
                : `${conflictDayOffs.length} of these days already have a day off logged.`} Saving will replace it.
            </p>
          </div>
        )}

        {conflictShifts.length > 0 && (
          <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:16,padding:"10px 12px",background:"#F59E0B14",border:"1px solid #F59E0B44",borderRadius:10}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#F59E0B",flexShrink:0,marginTop:6}}/>
            <p style={{color:"#F59E0B",fontSize:"0.8125rem",margin:0}}>
              {conflictShifts.length===1
                ? `A shift (${conflictShifts[0].roster}) is already logged on ${fmtDate(conflictShifts[0].date)}.`
                : `${conflictShifts.length} of these days already have a shift logged.`} Saving will replace it.
            </p>
          </div>
        )}

        <button style={{...btnStyle,opacity:canSave?1:0.4}} disabled={!canSave} onClick={handleSave}>
          {editDayOff ? "Save Changes" : isRange && rangeCount > 1 ? `Log ${rangeCount} Days` : "Log Day Off"}
        </button>
      </div>
      {pendingAction && (
        <ConfirmDialog msg={pendingAction.msg} yesLabel="Replace" danger
          onYes={()=>{ const run = pendingAction.run; setPendingAction(null); run(); }}
          onNo={()=>setPendingAction(null)}/>
      )}
    </div>
  );
}
