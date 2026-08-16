import { useState } from "react";
import { ACCENT, CARD, BORDER, TEXT, MUTED, btnStyle } from "../lib/theme.js";
import { BusLogo } from "../components/shared.jsx";

// ─── ONBOARDING TOUR ──────────────────────────────────────────────────────────
export function TourIcon({type}) {
  const wrap = {width:64,height:64,borderRadius:18,background:`${ACCENT}18`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"};
  const s = {width:30,height:30,fill:"none",stroke:ACCENT,strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round"};
  if(type==="welcome") return <div style={wrap}><BusLogo size={36}/></div>;
  if(type==="log") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>;
  if(type==="lookup") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg></div>;
  if(type==="period") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg></div>;
  if(type==="limits") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 7v5l3 2"/></svg></div>;
  if(type==="pdf") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg></div>;
  if(type==="rest") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg></div>;
  if(type==="tally") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><line x1="5" y1="20" x2="5" y2="9"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="19" y1="20" x2="19" y2="13"/></svg></div>;
  if(type==="home") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10v10h14V10"/></svg></div>;
  if(type==="alert") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M12 3l10 18H2z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.01"/></svg></div>;
  return null;
}

export const TOUR_SLIDES = [
  {
    icon: "welcome",
    title: "Welcome to\nShift Tracker",
    body: "Built for Dublin Bus drivers at Summerhill. Log shifts, track your 5-week hours, look up any duty — all on your phone. Your account works on any device, everything you log stays in sync."
  },
  {
    icon: "home",
    title: "Your Home Screen",
    body: "A quick greeting, your logging streak, and today's weather at a glance. Swipe the upcoming-days strip to see what's next, and tap any day to log it straight away."
  },
  {
    icon: "lookup",
    title: "Look Up Any Duty",
    body: "Tap Lookup, pick your zone, day and duty. You'll see the full running board — every trip, terminus, break and finish. Tap 'Log this Shift' to pre-fill the log screen in one tap."
  },
  {
    icon: "log",
    title: "Logging a Shift",
    body: "Tap Log a Shift, pick your zone and duty — report time, sign off, work and relief fill in automatically. Adjust anything that changed on the day. A partial shift? Just change the sign off time."
  },
  {
    icon: "rest",
    title: "Spare & Rest Day",
    body: "Covering a duty as a spare? Pick 'Standard Spare' or 'Workout Spare' from the Duty type buttons — just enter your start time and the finish is worked out for you. Working on a rest day? Open 'More options' and toggle 'Working on a rest day' — those hours won't count toward your 190h limit."
  },
  {
    icon: "limits",
    title: "Overtime Tracking",
    body: "Under 'More options', log extra hours worked on top of any shift — add the time and a free text note. Overtime is tracked separately and won't affect your compliance total."
  },
  {
    icon: "period",
    title: "Your 5-Week Period",
    body: "Everything is tracked across a 5-week period starting on a Sunday. The home screen shows your remaining hours at a glance. Tap Period for a full week-by-week breakdown."
  },
  {
    icon: "tally",
    title: "Three Limits Tracked",
    body: "Total hours (190h 4m), Sunday hours (14h 30m), and Overtime are all tracked separately. Bars turn amber as you approach a limit, red if you exceed it."
  },
  {
    icon: "alert",
    title: "Stay in the Loop",
    body: "Diversions, roadworks and other notices show up right where you need them — a banner on Home, and inline cards on Log a Shift and Lookup, matched to your zone."
  },
  {
    icon: "pdf",
    title: "Export a Record",
    body: "Tap Export PDF on the Period screen for a full professional record — every shift, compliance figures, and overtime notes — ready to share with a union rep or manager."
  }
];

export function TourOverlay({onDone}) {
  const [slide, setSlide] = useState(0);
  const s = TOUR_SLIDES[slide];
  const isLast = slide === TOUR_SLIDES.length - 1;

  return (
    <div style={{position:"fixed",inset:0,background:"#000000dd",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",zIndex:300,padding:"0 16px 32px"}}>
      <div style={{width:"100%",maxWidth:420,background:CARD,borderRadius:24,padding:28,border:`1px solid ${BORDER}`}}>

        {/* Slide counter dots + step number */}
        <p style={{color:MUTED,fontSize:"0.75rem",textAlign:"center",margin:"0 0 10px",fontWeight:600}}>Step {slide+1} of {TOUR_SLIDES.length}</p>
        <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:28}}>
          {TOUR_SLIDES.map((_,i) => (
            <div key={i} style={{
              width:22, height:6, borderRadius:3, transformOrigin:"left center",
              transform: i===slide ? "scaleX(1)" : "scaleX(0.27)",
              background: i===slide ? ACCENT : BORDER,
              transition:"transform 0.3s, background 0.3s"
            }}/>
          ))}
        </div>

        {/* Content */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{marginBottom:20}}><TourIcon type={s.icon}/></div>
          <h2 style={{color:TEXT,fontSize:"1.4375rem",fontWeight:800,margin:"0 0 12px",lineHeight:1.2,whiteSpace:"pre-line",letterSpacing:"-0.5px"}}>{s.title}</h2>
          <p style={{color:MUTED,fontSize:"0.9375rem",lineHeight:1.6,margin:0}}>{s.body}</p>
        </div>

        {/* Buttons */}
        <div style={{display:"grid",gridTemplateColumns: slide===0 ? "1fr" : "auto 1fr",gap:12}}>
          {slide > 0 && (
            <button onClick={()=>setSlide(slide-1)} style={{background:"none",border:`1px solid ${BORDER}`,color:TEXT,borderRadius:12,padding:"15px 20px",fontSize:"1.125rem",cursor:"pointer",lineHeight:1}}>←</button>
          )}
          <button onClick={()=> isLast ? onDone() : setSlide(slide+1)} style={btnStyle}>
            {isLast ? "Get Started" : "Next"}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button onClick={onDone} style={{background:"none",border:"none",color:MUTED,fontSize:"0.8125rem",cursor:"pointer",width:"100%",marginTop:16,padding:"4px 0"}}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
