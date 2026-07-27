import { useState, useMemo } from "react";
import { MAX_HOURS, MAX_SUNDAY, DAY_OFF_TYPES, getDayType, addDays, fmtDate, fmtShort, fmtHrs, today, calcSpreadover } from "../lib/dutyMath.js";
import { pStats } from "../lib/roster.js";
import { BG, BORDER, TEXT, MUTED, ACCENT, SUCCESS, DANGER, cardStyle, btnStyle, tag } from "../lib/theme.js";
import { PageHeader, ComplianceBar, EmptyState } from "../components/shared.jsx";
import { exportPDF } from "../lib/pdfExport.js";

// ─── PERIOD SCREEN ────────────────────────────────────────────────────────────
export function PeriodScreen({period, onEdit, onDelete, onEditDayOff, onDeleteDayOff, onViewArchive, onEndPeriod, onViewFAQ, initWeek=null, readOnly=false}) {
  const stats = useMemo(() => pStats(period), [period]);
  // Default to current week, fallback to week 0
  const defaultWeek = useMemo(() => {
    const td = today();
    const i = stats.weeks.findIndex(w => td >= w.start && td <= w.end);
    return i >= 0 ? i : 0;
  }, [stats]);
  const [open, setOpen] = useState(initWeek !== null ? initWeek : defaultWeek);
  const tallyEntries = DAY_OFF_TYPES.map(t=>({type:t,count:stats.tally[t]||0})).filter(x=>x.count>0);

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      <PageHeader
        eyebrow={readOnly?"Archived period":"Current period"}
        title="Period Detail"
        subtitle={`${fmtDate(period.startDate)} – ${fmtDate(addDays(period.startDate,34))}`}
        right={!readOnly && (
          <button onClick={()=>exportPDF(period,stats)} style={{background:ACCENT,color:"#07090F",border:"none",borderRadius:10,padding:"10px 16px",fontSize:13,fontWeight:800,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
            Export PDF
          </button>
        )}
      />

      <div style={{padding:"4px 16px 0"}}>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
        <ComplianceBar label="Total Hours" current={stats.total} max={MAX_HOURS} limitLabel="190h 4m" />
        <ComplianceBar label="Sunday Hours" current={stats.sunday} max={MAX_SUNDAY} limitLabel="14h 30m" />
        {stats.overtime>0 && (
          <div style={{...cardStyle,padding:"12px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:MUTED,fontSize:13,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>Overtime</span>
              <span style={{color:"#F59E0B",fontWeight:800,fontSize:16}}>{fmtHrs(stats.overtime)}</span>
            </div>
            <p style={{color:MUTED,fontSize:11,margin:"3px 0 0"}}>Not counted toward 190h limit</p>
          </div>
        )}
      </div>

      <div style={{...cardStyle,marginBottom:12}}>
        <p style={{color:TEXT,fontWeight:600,margin:"0 0 8px",fontSize:14}}>Period Summary</p>
        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
          <span style={{color:MUTED,fontSize:13}}>Max consecutive days</span>
          <span style={{color:TEXT,fontWeight:600}}>{stats.consec}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
          <span style={{color:MUTED,fontSize:13}}>Total shifts</span>
          <span style={{color:TEXT,fontWeight:600}}>{period.shifts?.length||0}</span>
        </div>
        {tallyEntries.length > 0 && (
          <div style={{borderTop:`1px solid ${BORDER}`,marginTop:8,paddingTop:8}}>
            <p style={{color:MUTED,fontSize:12,margin:"0 0 6px",textTransform:"uppercase",letterSpacing:0.5}}>Days Off</p>
            {tallyEntries.map(({type,count})=>(
              <div key={type} style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
                <span style={{color:MUTED,fontSize:13}}>{type}</span>
                <span style={{color:TEXT,fontWeight:600}}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!readOnly && (
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
          <button onClick={onViewArchive} style={{...btnStyle,padding:"12px 16px",fontSize:13}}>
            View Period Archive
          </button>
          {onViewFAQ && (
            <button onClick={()=>onViewFAQ("compliance")} style={{background:"none",border:"none",color:ACCENT,fontSize:13,fontWeight:600,cursor:"pointer",padding:"4px 0",textAlign:"center"}}>
              Questions about your hours? See FAQ →
            </button>
          )}
        </div>
      )}

      {stats.weeks.map((w,i)=>{
        const allItems = [
          ...w.shifts.map(s=>({...s,_type:"shift"})),
          ...(w.daysOff||[]).map(d=>({...d,_type:"dayoff"}))
        ].sort((a,b)=>a.date.localeCompare(b.date));
        const isCurrentWeek = !readOnly && i===defaultWeek;
        return (
          <div key={i} style={{...cardStyle,marginBottom:10,...(isCurrentWeek?{border:`1px solid ${ACCENT}`,boxShadow:`0 0 0 2px ${ACCENT}40`}:{})}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setOpen(open===i?-1:i)}>
              <div>
                <p style={{color:MUTED,fontSize:11,margin:0,textTransform:"uppercase"}}>Week {i+1}</p>
                <p style={{color:TEXT,fontWeight:600,margin:"3px 0 0"}}>{fmtShort(w.start)} – {fmtShort(w.end)}</p>
                <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>{w.shifts.length} shift{w.shifts.length!==1?"s":""}{(w.daysOff?.length||0)>0?` · ${w.daysOff.length} day off`:""}</p>
              </div>
              <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                <p style={{color:w.total>0?ACCENT:MUTED,fontWeight:700,fontSize:16,margin:0}}>{fmtHrs(w.total)}</p>
                {w.sunday>0&&<p style={{color:SUCCESS,fontSize:12,margin:0}}>Sun: {fmtHrs(w.sunday)}</p>}
                {w.overtime>0&&<p style={{color:"#F59E0B",fontSize:12,margin:0}}>OT: {fmtHrs(w.overtime)}</p>}
                <span style={{color:MUTED,fontSize:13,transform:open===i?"rotate(180deg)":"none",transition:"transform 0.2s",display:"inline-block"}}>▾</span>
              </div>
            </div>
            {open===i&&(
              <div style={{marginTop:12,borderTop:`1px solid ${BORDER}`,paddingTop:12}}>
                {allItems.length===0?(
                  <EmptyState
                    icon={<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>}
                    title="No entries this week"
                    body="Log a shift or a day off to see it here."
                  />
                ):allItems.map(item=>item._type==="shift"?(
                  <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${BORDER}`}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{color:item.isRestDay?DANGER:TEXT,fontSize:15,fontWeight:700}}>{item.roster}</span>
                        <span style={tag(getDayType(item.date)==="sunday"?SUCCESS:getDayType(item.date)==="saturday"?"#60a5fa":MUTED)}>
                          {getDayType(item.date)==="sunday"?"Sun":getDayType(item.date)==="saturday"?"Sat":"M-F"}
                        </span>
                        {item.isSpare&&<span style={tag(ACCENT)}>Spare</span>}
                        {item.isRestDay&&<span style={tag(DANGER)}>Rest day</span>}
                        {item.overtimeHours>0&&!item.isRestDay&&<span style={tag("#F59E0B")}>OT {fmtHrs(item.overtimeHours)}</span>}
                      </div>
                      <p style={{color:MUTED,fontSize:12,margin:"0 0 1px"}}>{fmtDate(item.date)} · {item.zone}</p>
                      <p style={{color:MUTED,fontSize:12,margin:0}}>{item.reportTime} – {item.signOffTime} · Spread: {fmtHrs(calcSpreadover(item.reportTime,item.signOffTime))}</p>
                      {item.overtimeNote&&<p style={{color:"#F59E0B",fontSize:12,margin:"3px 0 0",fontStyle:"italic"}}>OT: {item.overtimeNote}</p>}
                      {item.notes && <p style={{color:"#60a5fa",fontSize:12,margin:"3px 0 0",fontStyle:"italic"}}>{item.notes}</p>}
                    </div>
                    <div style={{textAlign:"right",marginLeft:10,flexShrink:0}}>
                      <p style={{color:item.isRestDay?DANGER:ACCENT,fontWeight:700,margin:"0 0 6px"}}>{fmtHrs(item.workHours||0)}</p>
                      {!readOnly&&(
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          <button onClick={()=>onEdit(item)} style={{background:"none",border:`1px solid ${ACCENT}`,color:ACCENT,borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Edit</button>
                          <button onClick={()=>onDelete(item.id)} style={{background:"none",border:`1px solid ${DANGER}`,color:DANGER,borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Del</button>
                        </div>
                      )}
                    </div>
                  </div>
):(
                  <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${BORDER}`}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <p style={{color:MUTED,fontSize:13,fontStyle:"italic",margin:0}}>{item.type}</p>
                        {item.fixed && <span style={tag(MUTED)}>Fixed</span>}
                      </div>
                      <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>{fmtDate(item.date)}</p>
                    </div>
                    {!readOnly&&(
                      item.fixed ? (
                        <button onClick={()=>onDeleteDayOff(item.id)} style={{background:"none",border:`1px solid ${BORDER}`,color:MUTED,borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Remove</button>
                      ) : (
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          <button onClick={()=>onEditDayOff(item)} style={{background:"none",border:`1px solid ${ACCENT}`,color:ACCENT,borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Edit</button>
                          <button onClick={()=>onDeleteDayOff(item.id)} style={{background:"none",border:`1px solid ${DANGER}`,color:DANGER,borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Del</button>
                        </div>
                      )
                    )}
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",marginTop:4}}>
                  <span style={{color:MUTED,fontSize:13,fontWeight:600}}>Week {i+1} Total</span>
                  <span style={{color:ACCENT,fontWeight:700}}>{fmtHrs(w.total)}
                    {w.sunday>0&&<span style={{color:SUCCESS,fontWeight:400}}> / Sun: {fmtHrs(w.sunday)}</span>}
                    {w.overtime>0&&<span style={{color:"#F59E0B",fontWeight:400}}> / OT: {fmtHrs(w.overtime)}</span>}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {!readOnly && (
        <button onClick={onEndPeriod} style={{...btnStyle,marginTop:4,marginBottom:12}}>
          {today() > addDays(period.startDate,34) ? "This period has ended — start a new one" : "End period & start new"}
        </button>
      )}
      </div>
    </div>
  );
}
