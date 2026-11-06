import { useEffect, useRef } from "react";
import { CARD, TEXT, MUTED, ACCENT, btnStyle } from "../lib/theme.js";
import { describeKey } from "../lib/achievements.js";
import { Badge } from "./Badge.jsx";
import { useModalA11y } from "./shared.jsx";
import { playBadgeSound } from "../lib/badgeSound.js";

export const POPUP_MS = 3200;
const CONFETTI = ["#FFCD00", "#00C896", "#60a5fa", "#FF4455", "#C084FC", "#F59E0B"];

// Full-screen celebration for one queue item:
//   { kind: "badge", key }            — auto-closes after POPUP_MS, or on tap
//   { kind: "summary", count, firstRun } — stays until tapped (has a button)
export function AchievementPopup({item, onClose, onOpenPage}) {
  const ref = useModalA11y(onClose);
  // Latest onClose in a ref: App passes a fresh arrow every render, which
  // would otherwise restart the auto-close timer on every App re-render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => { playBadgeSound(); }, [item]);
  useEffect(() => {
    if (item.kind !== "badge") return;
    const t = setTimeout(() => closeRef.current(), POPUP_MS);
    return () => clearTimeout(t);
  }, [item]);

  const info = item.kind === "badge" ? describeKey(item.key) : null;
  if (item.kind === "badge" && !info) return null;
  const title = info
    ? info.name + (info.year ? ` ${info.year}` : "")
    : item.firstRun ? `You've already earned ${item.count} badge${item.count === 1 ? "" : "s"}` : `${item.count} new badges`;
  const line = info ? info.badge.joke : "From what you've logged so far. Have a look at them all.";

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={info ? `New badge: ${title}` : title} tabIndex={-1}
      onClick={item.kind === "badge" ? onClose : undefined}
      style={{position:"fixed",inset:0,zIndex:300,background:"#07090Fee",display:"flex",alignItems:"center",justifyContent:"center",padding:24,overflow:"hidden",outline:"none",cursor:item.kind==="badge"?"pointer":"default"}}>
      <style>{`
        @keyframes rb-pop{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}
        @keyframes rb-fall{0%{transform:translateY(-10vh) rotate(0)}100%{transform:translateY(110vh) rotate(720deg)}}
        @media (prefers-reduced-motion: reduce){.rb-pop,.rb-confetti{animation:none!important}.rb-confetti{display:none}}
      `}</style>
      {Array.from({length: 28}, (_, i) => (
        <span key={i} className="rb-confetti" aria-hidden="true" style={{position:"absolute",top:0,left:`${(i * 37) % 100}%`,width:8,height:14,borderRadius:2,
          background:CONFETTI[i % CONFETTI.length],animation:`rb-fall ${1.8 + (i % 5) * 0.35}s ${(i % 7) * 0.12}s ease-in forwards`,transform:"translateY(-10vh)"}}/>
      ))}
      <div style={{position:"relative",textAlign:"center",maxWidth:320,width:"100%"}}>
        <p style={{color:ACCENT,fontSize:"0.75rem",fontWeight:800,letterSpacing:2,textTransform:"uppercase",margin:"0 0 18px"}}>
          {info ? "New badge" : "Achievements"}
        </p>
        <div className="rb-pop" style={{display:"flex",justifyContent:"center",animation:"rb-pop .7s cubic-bezier(.2,.9,.3,1.3) both"}}>
          {info ? <Badge badge={info.badge} level={info.level} size={132}/>
            : <div aria-hidden="true" style={{width:132,height:132,borderRadius:"50%",background:`${ACCENT}22`,border:`6px solid ${ACCENT}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"3.75rem"}}>🏆</div>}
        </div>
        <h2 style={{color:TEXT,fontSize:"1.5rem",fontWeight:800,margin:"20px 0 8px"}}>{title}</h2>
        <p style={{color:MUTED,fontSize:"0.9375rem",lineHeight:1.5,margin:0}}>{line}</p>
        {info
          ? <p style={{color:MUTED,fontSize:"0.75rem",margin:"22px 0 0"}}>Tap to close</p>
          : (
            <div style={{display:"grid",gap:10,marginTop:24}}>
              <button type="button" onClick={() => { onClose(); onOpenPage?.(); }} style={btnStyle}>See your badges</button>
              <button type="button" onClick={onClose} style={{background:CARD,color:TEXT,border:"none",borderRadius:12,padding:"13px 0",fontSize:"0.9375rem",cursor:"pointer"}}>Later</button>
            </div>
          )}
      </div>
    </div>
  );
}
