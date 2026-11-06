import { useEffect } from "react";
import { CARD, BORDER, TEXT, MUTED, btnStyle } from "../lib/theme.js";
import { describeKey } from "../lib/achievements.js";
import { Badge } from "./Badge.jsx";
import { useModalA11y } from "./shared.jsx";
import { playBadgeSound } from "../lib/badgeSound.js";

const CONFETTI = ["#FFCD00", "#00C896", "#60a5fa", "#FF4455", "#C084FC", "#F59E0B"];
export const SETTINGS_HINT = "See all your badges any time in Settings › Achievements.";

// One big card over the Home screen showing the newest badge only
// (Phil 2026-11-06: never a stack to click through). It stays until closed;
// closing clears every waiting badge and the Home banner.
//   item: { key, extra, firstRun } from popupFor()
export function AchievementPopup({item, onClose, onOpenPage}) {
  const ref = useModalA11y(onClose);
  useEffect(() => { playBadgeSound(); }, [item.key]);

  const info = describeKey(item.key);
  if (!info) return null;
  const title = info.name + (info.year ? ` ${info.year}` : "");
  const accent = info.badge.color;
  const more = item.extra > 0
    ? (item.firstRun ? `+${item.extra} more badges already earned` : `+${item.extra} more new badge${item.extra === 1 ? "" : "s"}`)
    : null;

  return (
    <div style={{position:"fixed",inset:0,zIndex:300,background:"#07090Fcc",display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflow:"hidden"}}>
      <style>{`
        @keyframes rb-pop{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}
        @keyframes rb-fall{0%{transform:translateY(-10vh) rotate(0)}100%{transform:translateY(110vh) rotate(720deg)}}
        @media (prefers-reduced-motion: reduce){.rb-pop,.rb-confetti{animation:none!important}.rb-confetti{display:none}}
      `}</style>
      {Array.from({length: 28}, (_, i) => (
        <span key={i} className="rb-confetti" aria-hidden="true" style={{position:"absolute",top:0,left:`${(i * 37) % 100}%`,width:8,height:14,borderRadius:2,
          background:CONFETTI[i % CONFETTI.length],animation:`rb-fall ${1.8 + (i % 5) * 0.35}s ${(i % 7) * 0.12}s ease-in forwards`,transform:"translateY(-10vh)"}}/>
      ))}
      <div ref={ref} role="dialog" aria-modal="true" aria-label={`New badge: ${title}`} tabIndex={-1}
        style={{position:"relative",width:"100%",maxWidth:380,minHeight:"min(78vh,420px)",background:CARD,border:`2px solid ${accent}66`,borderRadius:24,
          padding:"28px 20px 20px",boxSizing:"border-box",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",outline:"none"}}>
        <button type="button" onClick={onClose} aria-label="Close"
          style={{position:"absolute",top:10,right:10,width:44,height:44,borderRadius:12,background:"none",border:`1px solid ${BORDER}`,color:TEXT,fontSize:"1.375rem",lineHeight:1,cursor:"pointer"}}>×</button>
        <p style={{color:accent,fontSize:"0.75rem",fontWeight:800,letterSpacing:2,textTransform:"uppercase",margin:"0 0 18px"}}>New badge</p>
        <div className="rb-pop" style={{display:"flex",justifyContent:"center",animation:"rb-pop .7s cubic-bezier(.2,.9,.3,1.3) both"}}>
          <Badge badge={info.badge} level={info.level} size={132}/>
        </div>
        <h2 style={{color:TEXT,fontSize:"1.5rem",fontWeight:800,margin:"20px 0 8px"}}>{title}</h2>
        <p style={{color:MUTED,fontSize:"0.9375rem",lineHeight:1.5,margin:0}}>{info.badge.joke}</p>
        {more && (
          <button type="button" onClick={() => { onClose(); onOpenPage?.(); }}
            style={{...btnStyle,marginTop:22,background:"none",border:`1px solid ${accent}`,color:accent}}>{more}</button>
        )}
        <p style={{color:MUTED,fontSize:"0.75rem",lineHeight:1.4,margin:"20px 0 0"}}>{SETTINGS_HINT}</p>
      </div>
    </div>
  );
}
