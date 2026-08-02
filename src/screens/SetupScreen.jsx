import { useState } from "react";
import { isCalendarSunday, addDays, fmtShort, thisSunday } from "../lib/dutyMath.js";
import { BG, CARD2, TEXT, MUTED, ACCENT, SUCCESS, DANGER, cardStyle, btnStyle } from "../lib/theme.js";
import { BusLogo, FieldLabel, DateInput } from "../components/shared.jsx";

// ─── SETUP SCREEN ─────────────────────────────────────────────────────────────
export function SetupScreen({onCreate}) {
  const [date, setDate] = useState(thisSunday());
  const isSun = isCalendarSunday(date);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:`radial-gradient(circle at 50% 0%,${CARD2} 0%,${BG} 60%)`,padding:24}}>
      <div style={{marginBottom:20}}><BusLogo size={64}/></div>
      <p style={{color:MUTED,fontSize:11,margin:"0 0 6px",textTransform:"uppercase",letterSpacing:3,fontWeight:600}}>Dublin Bus</p>
      <h1 style={{color:TEXT,fontSize:28,fontWeight:800,textAlign:"center",margin:"0 0 12px",letterSpacing:"-0.5px"}}>Shift Tracker</h1>
      <p style={{color:MUTED,textAlign:"center",marginBottom:36,fontSize:15,maxWidth:300,lineHeight:1.5}}>
        Track your hours and look up any duty. To start, pick the <strong style={{color:ACCENT}}>Sunday</strong> your 5-week period begins.
      </p>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{...cardStyle,marginBottom:14}}>
          <FieldLabel>Period start date</FieldLabel>
          <div style={{display:"flex",alignItems:"flex-start",gap:8,background:"#F59E0B14",border:"1px solid #F59E0B44",borderRadius:10,padding:"10px 12px",margin:"0 0 12px"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#F59E0B",flexShrink:0,marginTop:6}}/>
            <p style={{color:"#F59E0B",fontSize:13,margin:0,lineHeight:1.4}}>The Sunday of your long week is your start date.</p>
          </div>
          <DateInput value={date} onChange={e => setDate(e.target.value)}/>
          {!isSun && (
            <div style={{display:"flex",alignItems:"center",gap:8,margin:"12px 0 0"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:DANGER,flexShrink:0}}/>
              <p style={{color:DANGER,fontSize:13,margin:0}}>That's not a Sunday — periods must start on a Sunday</p>
            </div>
          )}
          {isSun && date && (
            <div style={{display:"flex",alignItems:"center",gap:8,margin:"12px 0 0"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:SUCCESS,flexShrink:0}}/>
              <p style={{color:SUCCESS,fontSize:13,margin:0}}>{fmtShort(date)} – {fmtShort(addDays(date,34))} · 5 weeks</p>
            </div>
          )}
        </div>
        <button style={{...btnStyle,opacity:isSun?1:0.4}} disabled={!isSun} onClick={() => isSun && onCreate(date)}>
          Start Period →
        </button>
      </div>
    </div>
  );
}
