import { BG, CARD, CARD2, BORDER, TEXT, MUTED, ACCENT, btnStyle } from "../lib/theme.js";
import { WHATS_NEW } from "../lib/persistence.js";

export function WhatsNewIcon({type}) {
  const wrap = {width:38,height:38,borderRadius:10,background:`${ACCENT}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1};
  const s = {width:19,height:19,fill:"none",stroke:ACCENT,strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};
  if(type==="theme") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.4 5.4 0 0 1-7.54-7.54A9 9 0 0 0 12 3z"/></svg></div>;
  if(type==="dayoff") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="12" y1="13" x2="12" y2="18"/><line x1="9.5" y1="15.5" x2="14.5" y2="15.5"/></svg></div>;
  if(type==="daterange") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="13" x2="10" y2="13"/><line x1="14" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg></div>;
  if(type==="anydate") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg></div>;
  if(type==="backup") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M7 18a4.5 4.5 0 0 1-1-8.9 5 5 0 0 1 9.7-1.7A4 4 0 0 1 17 15.9"/><polyline points="12 12 12 21"/><polyline points="9 18 12 21 15 18"/></svg></div>;
  if(type==="datepicker") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><circle cx="12" cy="14" r="2.5"/></svg></div>;
  if(type==="carousel") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="2" y="5" width="7" height="14" rx="1.5"/><rect x="14.5" y="5" width="7" height="14" rx="1.5" opacity="0.4"/></svg></div>;
  if(type==="repeat") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></div>;
  if(type==="overwrite") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M20 6L9 17l-5-5"/></svg></div>;
  if(type==="board") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg></div>;
  if(type==="period") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><rect x="6.5" y="12" width="4.5" height="4.5" rx="0.5" fill={ACCENT} stroke="none"/></svg></div>;
  if(type==="install") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg></div>;
  return null;
}

// ─── WHAT'S NEW SCREEN ────────────────────────────────────────────────────────
export function WhatsNewScreen({onDone, onSkipTour}) {
  return (
    <div style={{background:BG,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"32px 20px 16px",background:`linear-gradient(180deg,${CARD2} 0%,${BG} 100%)`}}>
        <p style={{color:ACCENT,fontSize:11,textTransform:"uppercase",letterSpacing:2,fontWeight:700,margin:"0 0 6px"}}>Just updated</p>
        <h1 style={{color:TEXT,fontSize:24,fontWeight:800,margin:"0 0 4px",letterSpacing:"-0.5px"}}>{WHATS_NEW.title}</h1>
        <p style={{color:MUTED,fontSize:13,margin:0}}>Here's what's changed since your last version</p>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"8px 16px 16px"}}>
        {WHATS_NEW.features.map((f,i)=>(
          <div key={i} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",gap:14,alignItems:"flex-start"}}>
            <WhatsNewIcon type={f.icon}/>
            <div>
              <p style={{color:TEXT,fontSize:14,fontWeight:700,margin:"0 0 4px"}}>{f.heading}</p>
              <p style={{color:MUTED,fontSize:13,margin:0,lineHeight:1.5}}>{f.body}</p>
            </div>
          </div>
        ))}
        <button onClick={onDone} style={{...btnStyle,marginTop:8}}>
          Got it — let's go
        </button>
        {onSkipTour && (
          <button onClick={onSkipTour} style={{background:"none",border:"none",color:MUTED,fontSize:13,fontWeight:600,cursor:"pointer",width:"100%",padding:"14px 0 0"}}>
            Skip the tour — I know the app
          </button>
        )}
      </div>
    </div>
  );
}
