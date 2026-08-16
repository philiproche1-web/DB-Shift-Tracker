import { addDays, fmtShort, fmtHrs } from "../lib/dutyMath.js";
import { pStats } from "../lib/roster.js";
import { BG, BORDER, TEXT, MUTED, ACCENT, SUCCESS, cardStyle } from "../lib/theme.js";
import { PageHeader, EmptyState, SettingsButton } from "../components/shared.jsx";
import { exportPDF } from "../lib/pdfExport.js";

// ─── ARCHIVE SCREEN ────────────────────────────────────────────────────────────
export function ArchiveScreen({periods, activePeriodId, onView, onOpenSettings}) {
  const archived = [...periods].filter(p=>p.id!==activePeriodId).reverse();
  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      <PageHeader eyebrow="Past periods" title="Archive" subtitle={archived.length>0?`${archived.length} archived period${archived.length!==1?"s":""}`:undefined} right={<SettingsButton onClick={onOpenSettings}/>}/>
      <div style={{padding:"4px 16px 0"}}>
      {archived.length===0?(
        <EmptyState
          icon={<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l1.5-4h15L21 7"/><rect x="3" y="7" width="18" height="14" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/></svg>}
          title="No archived periods yet"
          body="Once your 5-week period ends, the previous one moves here automatically."
        />
      ):archived.map(p=>{
        const st=pStats(p);
        return (
          <div key={p.id} style={{...cardStyle,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <p style={{color:TEXT,fontWeight:700,margin:"0 0 3px",fontSize:"0.9375rem"}}>{fmtShort(p.startDate)} – {fmtShort(addDays(p.startDate,34))}</p>
                <p style={{color:MUTED,fontSize:"0.8125rem",margin:0}}>{p.shifts?.length||0} shifts · {p.daysOff?.length||0} days off</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{color:ACCENT,fontWeight:800,margin:"0 0 2px",fontSize:"1rem"}}>{fmtHrs(st.total)}</p>
                <p style={{color:SUCCESS,fontSize:"0.75rem",margin:0}}>Sun: {fmtHrs(st.sunday)}</p>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={()=>onView(p.id)} style={{background:"none",border:`1px solid ${BORDER}`,color:TEXT,borderRadius:10,padding:"11px 0",fontSize:"0.875rem",fontWeight:600,cursor:"pointer"}}>View</button>
              <button onClick={()=>exportPDF(p,st)} style={{background:ACCENT,color:"#07090F",border:"none",borderRadius:10,padding:"11px 0",fontSize:"0.875rem",fontWeight:800,cursor:"pointer"}}>Export PDF</button>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
