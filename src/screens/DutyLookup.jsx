import { useState, useMemo } from "react";
import { getDayType, isBankHoliday, addDays, fmtHrs, today, calcSpreadover } from "../lib/dutyMath.js";
import { alertsForZone } from "../lib/routeAlerts.js";
import { ZONES, getDuties, getSeq } from "../lib/roster.js";
import { BG, CARD, CARD2, BORDER, TEXT, MUTED, ACCENT, SUCCESS, btnStyle, tag } from "../lib/theme.js";
import { SegGroup, DutyPicker, RouteAlertCard, SettingsButton } from "../components/shared.jsx";

export function parseEntry(e) {
  const m=e.match(/^(\d{1,2}:\d{2})\s*-\s*(.+)$/);
  return m?{time:m[1],desc:m[2].trim()}:{time:"",desc:e};
}

// ─── DUTY LOOKUP SCREEN ───────────────────────────────────────────────────────
export function DutyLookup({alerts, onLogShift, onOpenSettings}) {
  // Remember last used zone across sessions
  const savedZone = localStorage.getItem("dbus_last_zone") || "Zone 1";
  const [zone, setZone] = useState(savedZone);
  const [dayType, setDayType] = useState(getDayType(today()));
  const [rIdx, setRIdx] = useState(-1);
  const duties = useMemo(()=>getDuties(zone,dayType),[zone,dayType]);
  const zoneAlerts = useMemo(() => alertsForZone(alerts||[], zone, today()), [alerts, zone]);
  const duty = rIdx>=0 ? duties[rIdx] : null;
  const sequence = useMemo(()=> duty ? getSeq(duty.z, duty.t, duty.d2) : [], [duty]);
  // Today's a bank holiday: Sunday duties run across every route/garage, so
  // Mon–Fri/Saturday aren't real options — lock the picker to Sunday only.
  const todayIsHoliday = isBankHoliday(today());
  const dayOpts = todayIsHoliday
    ? [{v:"sunday",l:"Sunday"}]
    : [{v:"weekday",l:"Mon–Fri"},{v:"saturday",l:"Saturday"},{v:"sunday",l:"Sunday"}];
  const spreadover = duty ? calcSpreadover(duty.s, duty.e) : 0;

  function handleZoneChange(z) {
    setZone(z); setRIdx(-1);
    localStorage.setItem("dbus_last_zone", z);
  }

  function dotColor(entry) {
    const e=entry.toLowerCase();
    if(e.includes("report")) return ACCENT;
    if(e.includes("(break)")||e.includes(" break)")||e.endsWith("break)")) return "#F59E0B";
    if(e.includes("finish")) return SUCCESS;
    if(e.includes("spl to")||e.includes("special to")||e.includes("refuel")) return MUTED;
    return "#60A5FA";
  }
  function routeBadge(desc) {
    const m = desc.match(/\((\d{1,3}[A-Z]?)\)/);
    return m ? m[1] : null;
  }
  function entryLabel(entry) {
    const e=entry.toLowerCase();
    if(e.includes("report")) return "REPORT";
    if(e.includes("(break)")||e.includes(" break)")||e.endsWith("break)")) return "BREAK";
    if(e.includes("finish")) return "FINISH";
    if(e.includes("spl to")||e.includes("special to")) return "SPECIAL";
    return null;
  }

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      {/* Header */}
      <div style={{padding:"24px 20px 20px",background:`linear-gradient(180deg,${CARD2} 0%,${BG} 100%)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
          <div style={{flex:1,minWidth:0}}>
            <p style={{color:MUTED,fontSize:11,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:2,fontWeight:600}}>Dublin Bus</p>
            <h1 style={{color:TEXT,fontSize:26,fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>Duty Lookup</h1>
            <p style={{color:MUTED,fontSize:13,margin:"6px 0 0"}}>Select zone, day and duty to see your running board</p>
          </div>
          <SettingsButton onClick={onOpenSettings}/>
        </div>
      </div>

      <div style={{padding:"0 16px"}}>
        {/* Zone selector */}
        <div style={{marginBottom:12}}>
          <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,margin:"0 0 8px"}}>Zone</p>
          <SegGroup options={ZONES} value={zone} cols={4} onChange={handleZoneChange}/>
        </div>

        {zoneAlerts.map(a => <RouteAlertCard key={a.id} alert={a}/>)}

        {/* Day selector */}
        <div style={{marginBottom:12}}>
          <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,margin:"0 0 8px"}}>Day
            {todayIsHoliday && <span style={{...tag(SUCCESS),marginLeft:8}}>Bank Holiday — Sunday duties</span>}
          </p>
          <SegGroup options={dayOpts.map(o=>({v:o.v,l:o.l}))} value={dayType} cols={dayOpts.length}
            onChange={v=>{setDayType(v);setRIdx(-1);}}/>
        </div>

        {/* Duty selector */}
        <div style={{marginBottom:duty?20:0}}>
          <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,margin:"0 0 8px"}}>Duty <span style={{color:MUTED,fontWeight:400,textTransform:"none",letterSpacing:0}}>— {duties.length} available</span></p>
          <DutyPicker key={zone+dayType} duties={duties} value={rIdx} onChange={setRIdx}/>
        </div>

        {/* Empty state — guides the first-time flow */}
        {!duty && (
          <div style={{textAlign:"center",padding:"48px 24px 0"}}>
            <div style={{width:72,height:72,borderRadius:20,background:`${ACCENT}14`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>
            </div>
            <p style={{color:TEXT,fontSize:16,fontWeight:700,margin:"0 0 6px"}}>Pick a duty to see the board</p>
            <p style={{color:MUTED,fontSize:14,lineHeight:1.6,margin:"0 auto",maxWidth:280}}>
              Got a duty from your BACMS text? Choose the zone and day above, then select the duty number — the full running board appears here.
            </p>
          </div>
        )}

        {/* Running board */}
        {duty && (
          <>
            {/* Duty summary strip */}
            <div style={{background:CARD2,border:`1px solid ${BORDER}`,borderRadius:14,padding:"16px 18px",marginBottom:4}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{color:ACCENT,fontSize:24,fontWeight:800,letterSpacing:"-0.5px"}}>{duty.r}</span>
                <span style={{background:ACCENT+"22",color:ACCENT,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>{dayOpts.find(o=>o.v===dayType)?.l}</span>
              </div>
              <p style={{color:MUTED,fontSize:13,margin:"0 0 12px"}}>{duty.z}</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                <div style={{background:`${BG}88`,borderRadius:10,padding:"10px 12px"}}>
                  <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 3px"}}>Work</p>
                  <p style={{color:TEXT,fontSize:16,fontWeight:800,margin:0}}>{fmtHrs(duty.w)}</p>
                </div>
                <div style={{background:`${BG}88`,borderRadius:10,padding:"10px 12px"}}>
                  <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 3px"}}>Spread</p>
                  <p style={{color:ACCENT,fontSize:16,fontWeight:800,margin:0}}>{fmtHrs(spreadover)}</p>
                </div>
                <div style={{background:`${BG}88`,borderRadius:10,padding:"10px 12px"}}>
                  <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 3px"}}>Relief</p>
                  <p style={{color:duty.l>0?TEXT:MUTED,fontSize:16,fontWeight:800,margin:0}}>{duty.l>0?fmtHrs(duty.l):"–"}</p>
                </div>
              </div>
            </div>

            {/* Running board timeline */}
            <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"20px 18px",marginBottom:16}}>
              <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:2,fontWeight:700,margin:"0 0 18px"}}>Running Board</p>
              {sequence.length > 0 ? sequence.map((entry,i) => {
                const {time, desc} = parseEntry(entry);
                const dc = dotColor(entry);
                const badge = routeBadge(desc);
                const label = entryLabel(entry);
                const isLast = i===sequence.length-1;
                return (
                  <div key={i} style={{display:"flex",gap:14,position:"relative"}}>
                    {/* Timeline line */}
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,width:16}}>
                      <div style={{
                        width:10, height:10, borderRadius:"50%",
                        background:dc, flexShrink:0, marginTop:4,
                        boxShadow: `0 0 8px ${dc}66`
                      }}/>
                      {!isLast && <div style={{width:1,flex:1,background:BORDER,margin:"4px 0"}}/>}
                    </div>
                    {/* Content */}
                    <div style={{flex:1,paddingBottom:isLast?0:16}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{color:dc,fontSize:17,fontWeight:800,fontVariantNumeric:"tabular-nums",letterSpacing:"-0.3px"}}>{time}</span>
                        {badge && <span style={{background:dc+"22",color:dc,borderRadius:5,padding:"1px 7px",fontSize:11,fontWeight:700}}>{badge}</span>}
                        {label && <span style={{color:MUTED,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>{label}</span>}
                      </div>
                      <p style={{color:label==="FINISH"?SUCCESS:label==="BREAK"?"#F59E0B":label==="REPORT"?TEXT:TEXT,
                        fontSize:13,margin:"2px 0 0",lineHeight:1.4,opacity:0.85}}>{desc.replace(/\(\d{1,3}[A-Z]?\)/g,"").trim()}</p>
                    </div>
                  </div>
                );
              }) : <p style={{color:MUTED,fontSize:14,textAlign:"center",padding:"12px 0",margin:0}}>No running board available for this duty</p>}
            </div>

            {onLogShift && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <button style={btnStyle} onClick={()=>onLogShift(duty, dayType, today())}>
                  Log for Today
                </button>
                <button style={{...btnStyle,background:"none",border:`1px solid ${ACCENT}`,color:ACCENT}} onClick={()=>onLogShift(duty, dayType, addDays(today(),1))}>
                  Log for Tomorrow
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
