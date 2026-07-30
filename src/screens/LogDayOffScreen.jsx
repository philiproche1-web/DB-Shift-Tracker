import { useState, useMemo } from "react";
import { DAY_OFF_TYPES, LOGGABLE_DAY_OFF_TYPES, addDays, fmtDate, today, uid } from "../lib/dutyMath.js";
import { BG, CARD, BORDER, TEXT, MUTED, ACCENT, DANGER, btnStyle } from "../lib/theme.js";
import { PageHeader, FieldLabel, DateInput, SettingsButton, ConfirmDialog } from "../components/shared.jsx";

// ─── LOG DAY OFF SCREEN ───────────────────────────────────────────────────────
export function LogDayOffScreen({periods, editDayOff, onSave, onCancel, onOpenSettings}) {
  const [type, setType] = useState(editDayOff?.type || LOGGABLE_DAY_OFF_TYPES[0]);
  // Rest days are auto-generated from the fixed roster pattern and no longer
  // manually logged — but an old manually-logged Rest Day entry being edited
  // must still show its own type as a selectable option.
  const typeOptions = editDayOff?.type === "Rest Day" ? DAY_OFF_TYPES : LOGGABLE_DAY_OFF_TYPES;
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

  const allShifts = useMemo(()=>periods.flatMap(p=>p.shifts||[]), [periods]);
  // A day off replaces a shift already logged that date (a driver can't work
  // and be on leave the same day) — one shift per conflicting date, in order.
  const conflictShifts = (isRange ? rangeDays : [date])
    .map(d => allShifts.find(s => s.date === d))
    .filter(Boolean);

  // A driver can only be on one kind of day off per date — unlike a shift
  // overlapping a day off (replaced, see above), two day-off records on the
  // same date is never valid, so this blocks Save entirely rather than warning.
  const allDaysOff = useMemo(()=>periods.flatMap(p=>p.daysOff||[]), [periods]);
  const duplicateDates = (isRange ? rangeDays : [date]).filter(d => allDaysOff.some(o=>o.date===d && o.id!==editDayOff?.id));

  function performSave() {
    if (isRange && rangeCount > 0) {
      onSave(rangeDays.map(d => ({id:uid(), date:d, type})), conflictShifts.map(s=>s.id));
    } else {
      onSave({id:editDayOff?.id||uid(), date, type}, conflictShifts.map(s=>s.id));
    }
  }

  function handleSave() {
    if (conflictShifts.length > 0) {
      const msg = conflictShifts.length === 1
        ? `This will replace the shift already logged for ${fmtDate(conflictShifts[0].date)} (${conflictShifts[0].roster}) with ${type} — continue?`
        : `This will replace ${conflictShifts.length} shifts already logged (${conflictShifts.map(s=>`${fmtDate(s.date)}: ${s.roster}`).join(", ")}) with ${type} — continue?`;
      setPendingAction({ msg, run: performSave });
      return;
    }
    performSave();
  }

  const canSave = date && (isRange ? rangeCount > 0 : true) && duplicateDates.length === 0;

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
                  <span style={{color:sel?TEXT:MUTED,fontSize:14,fontWeight:sel?700:500}}>{t}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date — single or range */}
        {isRange ? (
          <div style={{marginBottom:20}}>
            <FieldLabel>Date range</FieldLabel>
            <p style={{color:MUTED,fontSize:12,margin:"0 0 10px"}}>Select the first and last day — all days in between will be logged. Logging just one day? Leave From and To the same.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 6px"}}>From</p>
                <DateInput value={date} onChange={e=>setDate(e.target.value)}/>
              </div>
              <div>
                <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 6px"}}>To</p>
                <DateInput value={rangeTo < date ? date : rangeTo} onChange={e=>setRangeTo(e.target.value)} min={date}/>
              </div>
            </div>
            {rangeCount > 0 && (
              <div style={{background:`${ACCENT}14`,border:`1px solid ${ACCENT}33`,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{color:ACCENT,fontSize:18}}>📅</span>
                <p style={{color:ACCENT,fontSize:13,fontWeight:700,margin:0}}>
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

        {duplicateDates.length > 0 && (
          <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:16,padding:"10px 12px",background:`${DANGER}14`,border:`1px solid ${DANGER}44`,borderRadius:10}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:DANGER,flexShrink:0,marginTop:6}}/>
            <p style={{color:DANGER,fontSize:13,margin:0}}>
              {duplicateDates.length===1 ? `A day off is already logged on ${fmtDate(duplicateDates[0])}.` : `${duplicateDates.length} of these days already have a day off logged.`} Edit or remove it first.
            </p>
          </div>
        )}

        {conflictShifts.length > 0 && (
          <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:16,padding:"10px 12px",background:"#F59E0B14",border:"1px solid #F59E0B44",borderRadius:10}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#F59E0B",flexShrink:0,marginTop:6}}/>
            <p style={{color:"#F59E0B",fontSize:13,margin:0}}>
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
