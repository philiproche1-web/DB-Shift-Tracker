import { useState, useRef } from "react";
import { fmtHrs } from "../lib/dutyMath.js";
import { dutyLabel } from "../lib/roster.js";
import { compColor, BG, CARD, CARD2, BORDER, TEXT, MUTED, ACCENT, DANGER, cardStyle, inputStyle } from "../lib/theme.js";
import { runExportBackup, daysSinceLastBackup, snoozeBackupNudge } from "../lib/persistence.js";

// ─── SHARED UI ────────────────────────────────────────────────────────────────
// Bus logo mark — clean SVG, replaces emoji
export function BusLogo({size=40}) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="8" y="10" width="32" height="26" rx="5" fill={ACCENT}/>
      <rect x="11" y="15" width="11" height="8" rx="1.5" fill="#07090F"/>
      <rect x="26" y="15" width="11" height="8" rx="1.5" fill="#07090F"/>
      <circle cx="16" cy="38" r="3.5" fill={ACCENT}/>
      <circle cx="32" cy="38" r="3.5" fill={ACCENT}/>
      <circle cx="16" cy="38" r="1.5" fill="#07090F"/>
      <circle cx="32" cy="38" r="1.5" fill="#07090F"/>
      <rect x="13" y="28" width="22" height="3" rx="1.5" fill="#07090F" opacity="0.5"/>
    </svg>
  );
}

// Page header with gradient — used on every screen for consistency
export function PageHeader({eyebrow, title, subtitle, right, onBack}) {
  return (
    <div style={{padding:"calc(24px + env(safe-area-inset-top,0px)) 20px 18px",background:`linear-gradient(180deg,${CARD2} 0%,${BG} 100%)`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:12,minWidth:0}}>
          {onBack && (
            <button onClick={onBack} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0,marginTop:2}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}
          <div style={{minWidth:0}}>
            {eyebrow && <p style={{color:MUTED,fontSize:11,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:2,fontWeight:600}}>{eyebrow}</p>}
            <h1 style={{color:TEXT,fontSize:24,fontWeight:800,margin:0,letterSpacing:"-0.5px",lineHeight:1.1}}>{title}</h1>
            {subtitle && <p style={{color:MUTED,fontSize:13,margin:"6px 0 0"}}>{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
    </div>
  );
}

// Field label — consistent across all forms. Renders as a real <label> so
// screen readers announce it; pass htmlFor + a matching input id to link them.
export function FieldLabel({children, hint, htmlFor}) {
  return (
    <label htmlFor={htmlFor} style={{display:"block",color:TEXT,fontSize:12.5,textTransform:"uppercase",letterSpacing:1.2,fontWeight:700,margin:"0 0 8px"}}>
      {children}{hint && <span style={{color:MUTED,fontWeight:400,textTransform:"none",letterSpacing:0}}> — {hint}</span>}
    </label>
  );
}

export function DateInput({value, onChange, min, id, invalid}) {
  return (
    <div style={{position:"relative"}}>
      <input id={id} type="date" value={value} onChange={onChange} min={min} style={{...inputStyle, paddingRight:40, ...(invalid?{borderColor:DANGER}:{})}}/>
      <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="17" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
        </svg>
      </div>
      <style>{`input[type="date"]::-webkit-calendar-picker-indicator{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;}`}</style>
    </div>
  );
}

// Segmented button group — replaces dropdowns where options are few
export function SegGroup({options, value, onChange, cols}) {
  return (
    <div style={{display:"grid",gridTemplateColumns:`repeat(${cols||options.length},1fr)`,gap:8}}>
      {options.map(o=>{
        const v = o.v!==undefined ? o.v : o;
        const l = o.l!==undefined ? o.l : o;
        const sel = value===v;
        return (
          <button key={v} onClick={()=>onChange(v)} style={{
            background: sel?ACCENT:CARD, color: sel?"#07090F":MUTED,
            border: sel?"none":`1px solid ${BORDER}`, borderRadius:10,
            padding:"11px 4px", fontSize:13, fontWeight: sel?800:500,
            cursor:"pointer", transition:"all 0.15s"
          }}>{l}</button>
        );
      })}
    </div>
  );
}

// Searchable duty picker — replaces a plain <select> with 90+ options.
// Collapsed by default (shows the current pick as one row) so long zone
// lists (e.g. Zone 1's 20+ duties) don't push the rest of the screen
// (Spare / CPC-Training) down — tap the row to expand and search.
export function DutyPicker({duties, value, onChange}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const q = query.trim().toLowerCase();
  const filtered = q ? duties.filter(d => d.r.toLowerCase().includes(q)) : duties;
  const selected = value >= 0 ? duties[value] : null;

  if (!open) {
    return (
      <button type="button" onClick={()=>{setOpen(true); setTimeout(()=>inputRef.current?.focus(),0);}} style={{
        display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,
        width:"100%",textAlign:"left",padding:"12px 14px",
        background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,cursor:"pointer"
      }}>
        <span style={{fontSize:14,fontWeight:selected?700:500,color:selected?TEXT:MUTED}}>
          {selected ? dutyLabel(selected) : `Tap to choose a duty (${duties.length})`}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    );
  }

  return (
    <div>
      <input ref={inputRef} type="text" inputMode="search" value={query} onChange={e=>setQuery(e.target.value)}
        placeholder="Type a duty number to search…"
        onKeyDown={e=>{if(e.key==="Escape"){setOpen(false);setQuery("");}}}
        style={{...inputStyle, marginBottom:8}}/>
      <div style={{maxHeight:280,overflowY:"auto",border:`1px solid ${BORDER}`,borderRadius:10,background:CARD}}>
        {filtered.length===0 ? (
          <p style={{color:MUTED,fontSize:13,textAlign:"center",padding:"18px 12px",margin:0}}>No duties match "{query}"</p>
        ) : filtered.map(d=>{
          const i = duties.indexOf(d);
          const sel = i===value;
          return (
            <button key={d.r} onClick={()=>{onChange(i); setQuery(""); setOpen(false);}} style={{
              display:"block",width:"100%",textAlign:"left",padding:"12px 14px",
              background:sel?`${ACCENT}18`:"transparent",border:"none",
              borderBottom:`1px solid ${BORDER}`,
              color:sel?ACCENT:TEXT,fontSize:14,fontWeight:sel?700:500,cursor:"pointer"
            }}>{dutyLabel(d)}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─── COMPLIANCE BAR ──────────────────────────────────────────────────────────
export function ComplianceBar({label, current, max, limitLabel}) {
  const pct = Math.min((current / max) * 100, 100);
  const color = compColor(current, max);
  const over = current > max;
  return (
    <div style={{...cardStyle, padding:"12px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{color:MUTED,fontSize:12,textTransform:"uppercase",letterSpacing:0.5}}>{label}</span>
        <span style={{color,fontWeight:700,fontSize:15}}>{fmtHrs(current)} <span style={{color:MUTED,fontWeight:400,fontSize:12}}>/ {limitLabel}</span></span>
      </div>
      <div style={{background:BORDER,borderRadius:4,height:7}}>
        <div style={{width:"100%",transform:`scaleX(${pct/100})`,transformOrigin:"left",background:color,height:7,borderRadius:4,transition:"transform 0.3s"}} />
      </div>
      {over && <p style={{color:DANGER,fontSize:12,margin:"6px 0 0",fontWeight:600}}>Limit exceeded</p>}
    </div>
  );
}

// ─── BACKUP NUDGE BANNER ────────────────────────────────────────────────────────
// Shown on Home when there's real data on the device and no recent export —
// a lost phone or a cleared cache today means a lost shift history, and the
// only way off this device is a backup the driver has to remember to make.
export function BackupNudgeBanner({onDismiss}) {
  const [busy, setBusy] = useState(false);
  const daysSince = daysSinceLastBackup();
  const message = daysSince === null
    ? "You've never backed up your data. A lost phone or cleared cache would lose your shift history."
    : `Last backup: ${daysSince} day${daysSince===1?"":"s"} ago. Worth a fresh one.`;
  return (
    <div style={{...cardStyle,marginBottom:12,padding:"14px 16px",border:`1px solid ${ACCENT}44`,display:"flex",gap:12,alignItems:"flex-start"}}>
      <div style={{width:36,height:36,borderRadius:10,background:`${ACCENT}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18a4.5 4.5 0 0 1-1-8.9 5 5 0 0 1 9.7-1.7A4 4 0 0 1 17 15.9"/><polyline points="12 12 12 21"/><polyline points="9 18 12 21 15 18"/></svg>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <p style={{color:TEXT,fontSize:13.5,fontWeight:700,margin:"0 0 3px"}}>Back up your data</p>
        <p style={{color:MUTED,fontSize:12.5,margin:"0 0 10px"}}>{message}</p>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{
            setBusy(true);
            const res = runExportBackup();
            setBusy(false);
            if(res.ok) onDismiss();
          }} style={{background:ACCENT,color:"#07090F",border:"none",borderRadius:9,padding:"9px 14px",fontSize:12.5,fontWeight:800,cursor:"pointer"}}>
            {busy?"Backing up…":"Back up now"}
          </button>
          <button onClick={()=>{ snoozeBackupNudge(7); onDismiss(); }} style={{background:"transparent",color:MUTED,border:`1px solid ${BORDER}`,borderRadius:9,padding:"9px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ROUTE ALERTS (diversions, roadworks, other notices) ───────────────────────
export const ALERT_COLOR = "#F59E0B"; // same amber already used for warning-tier banners elsewhere
export const ALERT_TYPE_LABEL = { diversion: "Diversion", roadworks: "Roadworks", other: "Notice" };

export function RouteAlertCard({alert}) {
  return (
    <div style={{background:`${ALERT_COLOR}14`,border:`1px solid ${ALERT_COLOR}44`,borderRadius:12,padding:"12px 14px",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,color:ALERT_COLOR,background:`${ALERT_COLOR}22`,padding:"2px 8px",borderRadius:999}}>
          {ALERT_TYPE_LABEL[alert.type] || "Notice"}
        </span>
        {alert.zone && <span style={{fontSize:11,color:MUTED,fontWeight:600}}>{alert.zone}</span>}
      </div>
      <p style={{color:TEXT,fontSize:13,margin:"0 0 8px",lineHeight:1.5}}>{alert.description}</p>
      {alert.map_url && (
        <a href={alert.map_url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,fontWeight:700,color:ALERT_COLOR,textDecoration:"none"}}>
          View on map →
        </a>
      )}
    </div>
  );
}

// Passive Home summary — same "banner you tap through" pattern as BackupNudgeBanner.
export function RouteAlertBanner({alerts, onView}) {
  if (!alerts.length) return null;
  return (
    <button onClick={onView} style={{width:"100%",textAlign:"left",background:"none",border:"none",padding:0,cursor:"pointer",marginBottom:12}}>
      <div style={{...cardStyle,padding:"14px 16px",border:`1px solid ${ALERT_COLOR}44`,display:"flex",gap:12,alignItems:"center"}}>
        <div style={{width:36,height:36,borderRadius:10,background:`${ALERT_COLOR}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ALERT_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{color:TEXT,fontSize:13.5,fontWeight:700,margin:"0 0 2px"}}>{alerts.length} active alert{alerts.length!==1?"s":""} for your garage</p>
          <p style={{color:MUTED,fontSize:12,margin:0}}>Tap to see diversions and roadworks</p>
        </div>
      </div>
    </button>
  );
}

export function EmptyState({icon, title, body}) {
  return (
    <div style={{...cardStyle,textAlign:"center",padding:"28px 20px"}}>
      {icon && <div style={{opacity:0.4,marginBottom:10,display:"flex",justifyContent:"center"}}>{icon}</div>}
      <p style={{color:TEXT,margin:"0 0 4px",fontSize:14,fontWeight:600}}>{title}</p>
      {body && <p style={{color:MUTED,fontSize:12,margin:0,lineHeight:1.5}}>{body}</p>}
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
export function NavIcon({id, active}) {
  const c = active ? ACCENT : MUTED;
  const s = {width:22,height:22,fill:"none",stroke:c,strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round"};
  if(id==="home") return <svg viewBox="0 0 24 24" style={s}><path d="M3 12L12 4l9 8"/><path d="M5 10v10h5v-5h4v5h5V10"/></svg>;
  if(id==="lookup") return <svg viewBox="0 0 24 24" style={s}><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>;
  if(id==="log") return <svg viewBox="0 0 24 24" style={{...s,stroke:active?"#07090F":MUTED,fill:active?ACCENT:"none"}}><circle cx="12" cy="12" r="10" strokeWidth={active?0:1.8}/><line x1="12" y1="7" x2="12" y2="17"/><line x1="7" y1="12" x2="17" y2="12"/></svg>;
  if(id==="period") return <svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>;
  if(id==="leave") return <svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><path d="M8 14h4m-4 4h8"/></svg>;
  if(id==="archive") return <svg viewBox="0 0 24 24" style={s}><path d="M3 7l1.5-4h15L21 7"/><rect x="3" y="7" width="18" height="14" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/></svg>;
  return null;
}

export function BottomNav({active, onChange}) {
  const tabs=[
    {id:"home",label:"Home"},
    {id:"log",label:"Log"},
    {id:"lookup",label:"Lookup"},
    {id:"period",label:"Period"},
    {id:"leave",label:"Leave"},
  ];
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0A0E1A",borderTop:`1px solid ${BORDER}`,display:"grid",gridTemplateColumns:"repeat(5,1fr)",zIndex:100,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
      {tabs.map((t,i)=>{
        const isLookup = t.id==="lookup";
        const isActive = active===t.id;
        return (
          <button key={t.id} onClick={()=>onChange(t.id)} style={{
            background:"none",border:"none",cursor:"pointer",
            padding: isLookup ? "6px 0 14px" : "10px 0 14px",
            display:"flex",flexDirection:"column",alignItems:"center",gap:4,
            position:"relative"
          }}>
            {isLookup ? (
              <div style={{
                background: isActive ? ACCENT : "#1A2438",
                borderRadius:14,padding:"10px 18px",
                display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                marginTop:-18,
                boxShadow: isActive ? `0 4px 20px ${ACCENT}44` : "none",
                border: isActive ? "none" : `1px solid ${BORDER}`,
                transition:"all 0.2s"
              }}>
                <NavIcon id="lookup" active={isActive}/>
                <span style={{fontSize:10,color:isActive?"#07090F":MUTED,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase"}}>Lookup</span>
              </div>
            ) : (
              <>
                {isActive && <div style={{position:"absolute",top:0,left:"20%",right:"20%",height:2,background:ACCENT,borderRadius:"0 0 2px 2px"}}/>}
                <NavIcon id={t.id} active={isActive}/>
                <span style={{fontSize:10,color:isActive?ACCENT:MUTED,fontWeight:isActive?700:400,letterSpacing:"0.3px"}}>{t.label}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ConfirmDialog({msg,onYes,onNo,yesLabel,danger=true}) {
  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{...cardStyle,width:"100%",maxWidth:420,padding:24}}>
        <p style={{color:TEXT,textAlign:"center",margin:"0 0 20px",fontSize:16}}>{msg}</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <button onClick={onNo} style={{background:"none",border:`1px solid ${BORDER}`,color:TEXT,borderRadius:10,padding:"13px 0",fontSize:15,cursor:"pointer"}}>Cancel</button>
          <button onClick={onYes} style={{background:danger?DANGER:ACCENT,border:"none",color:danger?"#fff":"#07090F",borderRadius:10,padding:"13px 0",fontSize:15,fontWeight:700,cursor:"pointer"}}>{yesLabel||"Confirm"}</button>
        </div>
      </div>
    </div>
  );
}
