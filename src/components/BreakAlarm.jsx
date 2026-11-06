import { useEffect, useRef, useState } from "react";
import { TEXT, MUTED, btnStyle } from "../lib/theme.js";
import { startAlarm, stopAlarm } from "../lib/breakAlarm.js";
import { useModalA11y } from "./shared.jsx";

export const ALARM_MAX_MS = 60000; // stops ringing by itself after a minute

// Full-screen ringing alarm. Rings until Stop, or ALARM_MAX_MS.
export function BreakAlarm({alarm, sound, vibrate, onStop}) {
  const ref = useModalA11y(onStop);
  const stopRef = useRef(onStop);
  stopRef.current = onStop;
  const [vibrationBlocked, setVibrationBlocked] = useState(false);
  useEffect(() => {
    const r = startAlarm({ sound, vibrate });
    setVibrationBlocked(!!r?.vibrationBlocked);
    const t = setTimeout(() => { stopAlarm(); }, ALARM_MAX_MS);
    return () => { clearTimeout(t); stopAlarm(); };
  }, [alarm, sound, vibrate]);

  const ends = alarm.breakEnd.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });
  const mins = Math.max(0, Math.round((alarm.breakEnd.getTime() - Date.now()) / 60000));
  return (
    <div ref={ref} role="alertdialog" aria-modal="true" aria-label={`Break ends at ${ends}`} tabIndex={-1}
      style={{position:"fixed",inset:0,zIndex:400,background:"#07090Ff2",display:"flex",alignItems:"center",justifyContent:"center",padding:24,outline:"none"}}>
      <style>{`@keyframes rb-ring{0%,100%{transform:rotate(0)}20%{transform:rotate(-14deg)}40%{transform:rotate(14deg)}60%{transform:rotate(-8deg)}80%{transform:rotate(8deg)}}
        @media (prefers-reduced-motion: reduce){.rb-ring{animation:none!important}}`}</style>
      <div style={{textAlign:"center",maxWidth:320,width:"100%"}}>
        <div className="rb-ring" aria-hidden="true" style={{fontSize:"4.5rem",animation:"rb-ring 1s ease-in-out infinite"}}>⏰</div>
        <p style={{color:"#F59E0B",fontSize:"0.75rem",fontWeight:800,letterSpacing:2,textTransform:"uppercase",margin:"16px 0 6px"}}>Break ending</p>
        <h2 style={{color:TEXT,fontSize:"2rem",fontWeight:800,margin:"0 0 6px"}}>{ends}</h2>
        <p style={{color:MUTED,fontSize:"1rem",margin:"0 0 6px"}}>{mins > 0 ? `In ${mins} minute${mins === 1 ? "" : "s"}` : "Now"} · {alarm.shift.roster}</p>
        {vibrationBlocked && <p style={{color:MUTED,fontSize:"0.75rem",margin:"10px 0 0"}}>This phone didn't allow vibration from the app.</p>}
        <button type="button" onClick={() => { stopAlarm(); stopRef.current(); }} style={{...btnStyle,marginTop:22,fontSize:"1.125rem",padding:"18px 0"}}>Stop</button>
      </div>
    </div>
  );
}
