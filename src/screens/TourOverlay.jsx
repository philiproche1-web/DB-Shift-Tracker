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
  if(type==="swap") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg></div>;
  if(type==="home") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10v10h14V10"/></svg></div>;
  if(type==="alert") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M12 3l10 18H2z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.01"/></svg></div>;
  return null;
}

export const TOUR_SLIDES = [
  {
    icon: "welcome",
    title: "Welcome to\nRoster Buddy",
    body: "Built for Dublin Bus drivers at Summerhill. Log shifts, track your 5-week hours, look up any duty — all on your phone. Your account works on any device, and everything you log stays in sync."
  },
  {
    icon: "home",
    title: "Your Week at a Glance",
    body: "Under the date on Home is your week. Green = logged, red = a day that's passed with nothing logged, yellow = coming up and not logged yet. Swipe left or right for other weeks."
  },
  {
    icon: "log",
    title: "Tap a Day",
    body: "Tap a red or yellow day to log it — the date's filled in for you. Tap a green day to open it: the full running board, plus rest day, overtime and notes right there. Change them and tap Save."
  },
  {
    icon: "lookup",
    title: "Look Up Any Duty",
    body: "Tap Lookup, pick your zone, day and duty to see the full running board — every trip, terminus, break and finish."
  },
  {
    icon: "swap",
    title: "Swap in Seconds",
    body: "Want to swap a duty? Tap the camera on any duty card. You get a picture of the full duty and a ready-made message — change the last line to what you're after, tap Share and pick your WhatsApp group."
  },
  {
    icon: "log",
    title: "Logging a Shift",
    body: "Pick the zone, then the duty — report, sign off, work and relief fill in automatically — then Log Shift. Got your text a few days early? You can log into the next 5-week period too."
  },
  {
    icon: "rest",
    title: "Spares, Rest Days & Overtime",
    body: "Covering as a spare? Pick Standard or Workout Spare under Duty type and enter your start time. Worked a rest day or did overtime? Open the day from your week and set it on the card."
  },
  {
    icon: "period",
    title: "Your 5-Week Period",
    body: "Tap Period: this week is at the top, open, with Edit and Delete on every entry. The other weeks are below, then your totals."
  },
  {
    icon: "limits",
    title: "Three Limits Tracked",
    body: "Total hours (190h 4m), Sunday hours (14h 30m), and Overtime are tracked separately. Bars turn amber as you approach a limit, red if you exceed it."
  },
  {
    icon: "alert",
    title: "Diversions & Break Alarm",
    body: "If a diversion affects the duty you're on today, it shows on Home. Turn on the break reminder in Settings and the app rings before your break ends."
  },
  {
    icon: "tally",
    title: "Badges",
    body: "Earn badges as you go — your first duty, a full week logged, and a few the depot will enjoy. See them all any time in Settings › Achievements."
  },
  {
    icon: "pdf",
    title: "Export a Record",
    body: "Tap Export PDF on the Period screen for a full record — every shift, compliance figures and overtime notes — ready to share with a union rep or manager."
  },
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
          <button onClick={()=> isLast ? onDone(true) : setSlide(slide+1)} style={btnStyle}>
            {isLast ? "Get Started" : "Next"}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button onClick={()=>onDone(false)} style={{background:"none",border:"none",color:MUTED,fontSize:"0.8125rem",cursor:"pointer",width:"100%",marginTop:16,padding:"4px 0"}}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
