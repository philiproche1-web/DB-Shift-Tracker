import { useState, useMemo } from "react";
import { fmtDate, addDays, today } from "../lib/dutyMath.js";
import { BG, CARD, CARD2, BORDER, TEXT, MUTED, ACCENT, SUCCESS, DANGER, btnStyle } from "../lib/theme.js";
import { SettingsButton } from "../components/shared.jsx";

// ─── LEAVE SCREEN HELPERS ─────────────────────────────────────────────────────
export function DayList({items, emptyMsg, onEdit, onDelete}) {
  if(items.length===0) return <p style={{color:MUTED,fontSize:13,margin:"8px 0 0",lineHeight:1.5}}>{emptyMsg}</p>;
  return (
    <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:4}}>
      {items.map((d,i)=>(
        <div key={d.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<items.length-1?`1px solid ${BORDER}`:undefined}}>
          <div>
            <span style={{color:TEXT,fontSize:13}}>{fmtDate(d.date)}</span>
            <span style={{color:MUTED,fontSize:12,marginLeft:8}}>{new Date(d.date+"T00:00:00").toLocaleDateString("en-IE",{weekday:"short"})}</span>
          </div>
          {onEdit && onDelete && (
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>onEdit(d)} style={{background:"none",border:`1px solid ${ACCENT}`,color:ACCENT,borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Edit</button>
              <button onClick={()=>onDelete(d.id)} style={{background:"none",border:`1px solid ${DANGER}`,color:DANGER,borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Del</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function TrafficDot({color}) {
  return <div style={{width:12,height:12,borderRadius:"50%",background:color,boxShadow:`0 0 6px ${color}88`,flexShrink:0}}/>;
}

export function LeaveCard({title, subtitle, color, used, total, remaining, children}) {
  const [open,setOpen] = useState(false);
  return (
    <div style={{background:CARD,border:`1px solid ${color}44`,borderRadius:16,marginBottom:10,overflow:"hidden"}}>
      <div style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <TrafficDot color={color}/>
            <div>
              <p style={{color:TEXT,fontSize:15,fontWeight:700,margin:0}}>{title}</p>
              {subtitle&&<p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>{subtitle}</p>}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            {total!==undefined ? (
              <>
                <p style={{color:color,fontSize:18,fontWeight:800,margin:0}}>{remaining} <span style={{color:MUTED,fontSize:12,fontWeight:400}}>left</span></p>
                <p style={{color:MUTED,fontSize:11,margin:"1px 0 0"}}>{used} of {total} used</p>
              </>
            ) : (
              <p style={{color:color,fontSize:18,fontWeight:800,margin:0}}>{used} <span style={{color:MUTED,fontSize:12,fontWeight:400}}>used</span></p>
            )}
            <span style={{color:MUTED,fontSize:11,display:"block",marginTop:3}}>{open?"▲ hide":"▼ dates"}</span>
          </div>
        </div>
      </div>
      {open&&<div style={{padding:"0 16px 14px",borderTop:`1px solid ${BORDER}`}}>{children}</div>}
    </div>
  );
}

// Self Cert — same collapsible header/tap pattern as LeaveCard, but keeps its
// own two-half-year body since it tracks two independent 2-day allowances.
export function SelfCertCard({scH1, scH2, scColor, onEdit, onDelete}) {
  const [open, setOpen] = useState(false);
  const totalUsed = scH1.length + scH2.length;
  return (
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,marginBottom:10,overflow:"hidden"}}>
      <div style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <TrafficDot color={scColor(Math.max(scH1.length,scH2.length))}/>
            <div>
              <p style={{color:TEXT,fontSize:15,fontWeight:700,margin:0}}>Self Cert</p>
              <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>2 days per half-year · resets 1 Jan &amp; 1 Jul</p>
              <p style={{color:MUTED,fontSize:11,margin:"2px 0 0"}}>Can't be combined with rest days to create more than 2 consecutive days off (e.g. not the day before or after a weekend).</p>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{color:TEXT,fontSize:18,fontWeight:800,margin:0}}>{totalUsed} <span style={{color:MUTED,fontSize:12,fontWeight:400}}>used</span></p>
            <span style={{color:MUTED,fontSize:11,display:"block",marginTop:3}}>{open?"▲ hide":"▼ dates"}</span>
          </div>
        </div>
      </div>
      {open && (
        <div style={{padding:"0 16px 14px",borderTop:`1px solid ${BORDER}`}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
            {[{label:"Jan – Jun",items:scH1},{label:"Jul – Dec",items:scH2}].map(({label,items})=>(
              <div key={label} style={{background:CARD2,borderRadius:12,padding:"12px 14px",border:`1px solid ${scColor(items.length)}44`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <TrafficDot color={scColor(items.length)}/>
                  <p style={{color:TEXT,fontSize:13,fontWeight:700,margin:0}}>{label}</p>
                </div>
                <p style={{color:scColor(items.length),fontSize:22,fontWeight:800,margin:"0 0 1px"}}>{2-items.length} <span style={{color:MUTED,fontSize:12,fontWeight:400}}>left</span></p>
                <p style={{color:MUTED,fontSize:11,margin:0}}>{items.length} of 2 used</p>
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ForceMajeureCard({fm12, fm36, fmColor, onEdit, onDelete}) {
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

// ─── LEAVE SCREEN ─────────────────────────────────────────────────────────────
export function LeaveScreen({periods, leaveSettings, onLogDayOff, onEditDayOff, onDeleteDayOff, onViewFAQ, onOpenSettings}) {
  const year = new Date().getFullYear();
  const [editTotal, setEditTotal] = useState(false);
  const [totalInput, setTotalInput] = useState(String(leaveSettings?.annualTotal||20));

  const allDaysOff = useMemo(() => {
    return periods.flatMap(p => (p.daysOff||[]).filter(d => d.date.startsWith(String(year))));
  }, [periods, year]);

  const allDaysOffEver = useMemo(() => periods.flatMap(p => p.daysOff || []), [periods]);
  const fmAll = useMemo(
    () => allDaysOffEver.filter(d => d.type === "Force Majeure").sort((a,b) => a.date.localeCompare(b.date)),
    [allDaysOffEver]
  );
  const todayDate = today();
  const fm12 = fmAll.filter(d => d.date >= addDays(todayDate, -365));
  const fm36 = fmAll.filter(d => d.date >= addDays(todayDate, -1095));

  const annual = allDaysOff.filter(d=>d.type==="Annual Leave").sort((a,b)=>a.date.localeCompare(b.date));
  const sick   = allDaysOff.filter(d=>d.type==="Sick Day").sort((a,b)=>a.date.localeCompare(b.date));
  const scAll  = allDaysOff.filter(d=>d.type==="Self Cert").sort((a,b)=>a.date.localeCompare(b.date));
  const scH1   = scAll.filter(d=>{ const m=parseInt(d.date.slice(5,7)); return m>=1&&m<=6; });
  const scH2   = scAll.filter(d=>{ const m=parseInt(d.date.slice(5,7)); return m>=7&&m<=12; });
  const bhil   = allDaysOff.filter(d=>d.type==="Bank Holiday In Lieu").sort((a,b)=>a.date.localeCompare(b.date));

  const annualUsed = annual.length;
  const annualBase = leaveSettings.annualTotal;
  const annualTotal = annualBase + bhil.length * 1.25;
  const annualRem = annualTotal - annualUsed;
  const annualSubtitle = bhil.length > 0
    ? `${annualBase} + ${bhil.length}×1¼ in lieu = ${annualTotal} days entitlement · Jan–Dec`
    : `${annualBase} days entitlement · Jan–Dec`;
  const annualColor = annualRem>=8?SUCCESS:annualRem>=4?"#F59E0B":DANGER;
  const sickColor = sick.length<=7?SUCCESS:sick.length<=9?"#F59E0B":DANGER;
  const scColor = n => n===0?SUCCESS:n===1?"#F59E0B":DANGER;
  const fmColor = (n, cap) => n===0?SUCCESS:n<cap?"#F59E0B":DANGER;

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      <div style={{padding:"28px 20px 16px",background:`linear-gradient(180deg,${CARD2} 0%,${BG} 100%)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
          <div style={{flex:1,minWidth:0}}>
            <p style={{color:ACCENT,fontSize:11,textTransform:"uppercase",letterSpacing:2,fontWeight:700,margin:"0 0 4px"}}>Calendar year {year}</p>
            <h1 style={{color:TEXT,fontSize:24,fontWeight:800,margin:"0 0 4px",letterSpacing:"-0.5px"}}>Leave Tracker</h1>
            <p style={{color:MUTED,fontSize:13,margin:0}}>Based on day-off entries logged in the app</p>
          </div>
          <SettingsButton onClick={onOpenSettings}/>
        </div>
      </div>
      <div style={{padding:"4px 16px 0"}}>

        <button onClick={onLogDayOff} style={{...btnStyle,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#07090F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Log Day Off
        </button>

        <LeaveCard title="Annual Leave" subtitle={annualSubtitle}
          color={annualColor} used={annualUsed} total={annualTotal} remaining={annualRem}>
          <DayList items={annual} emptyMsg="No annual leave logged this year" onEdit={onEditDayOff} onDelete={onDeleteDayOff}/>
        </LeaveCard>

        <LeaveCard title="Sick Leave" subtitle="Certified by doctor · Jan–Dec" color={sickColor} used={sick.length}>
          <p style={{color:MUTED,fontSize:12,margin:"0 0 8px"}}>13+ certified sick days in a calendar year triggers ACP.</p>
          {sick.length>=13 && (
            <div style={{background:`${DANGER}18`,border:`1px solid ${DANGER}44`,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
              <p style={{color:DANGER,fontSize:13,fontWeight:700,margin:0}}>You've hit the ACP threshold — 13+ certified sick days in a calendar year.</p>
            </div>
          )}
          <DayList items={sick} emptyMsg="No sick days logged this year" onEdit={onEditDayOff} onDelete={onDeleteDayOff}/>
        </LeaveCard>

        <SelfCertCard scH1={scH1} scH2={scH2} scColor={scColor} onEdit={onEditDayOff} onDelete={onDeleteDayOff}/>

        <ForceMajeureCard fm12={fm12} fm36={fm36} fmColor={fmColor} onEdit={onEditDayOff} onDelete={onDeleteDayOff}/>

        <LeaveCard title="Bank Holiday In Lieu" subtitle="Added automatically when you log a bank holiday shift as day in lieu"
          color={bhil.length>0?SUCCESS:MUTED} used={bhil.length}>
          <DayList items={bhil} emptyMsg="No bank holiday in lieu days logged this year" onEdit={onEditDayOff} onDelete={onDeleteDayOff}/>
        </LeaveCard>

        {onViewFAQ && (
          <button onClick={()=>onViewFAQ("leave")} style={{background:"none",border:"none",color:ACCENT,fontSize:13,fontWeight:600,cursor:"pointer",padding:"8px 0",width:"100%",textAlign:"center"}}>
            Questions about leave? See FAQ →
          </button>
        )}

      </div>
    </div>
  );
}
