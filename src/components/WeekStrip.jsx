import { useMemo, useRef, useState, useLayoutEffect } from "react";
import { addDays, sundayOf, fmtShort } from "../lib/dutyMath.js";
import { dayInfo, periodForDate } from "../lib/roster.js";
import { TEXT, MUTED, BORDER, SUCCESS, DANGER, ACCENT } from "../lib/theme.js";

// Home week strip (Phil 2026-11-06), replacing the 35-day "Upcoming"
// carousel and the Log a Shift button. One Sun–Sat week per swipe page,
// from WEEKS_BACK weeks ago to WEEKS_FORWARD ahead, opening on this week.
// Traffic light per day:
//   green  = something logged (duty, rest day, leave — the day is sorted)
//   red    = today or a past day with nothing logged (needs fixing)
//   yellow = a future day not logged yet (heads-up, not a problem)
// Today gets a white ring. Tapping a day calls onSelect(date, info).
export const WEEKS_BACK = 2;
export const WEEKS_FORWARD = 3; // minimum; extends to the end of the next period

// Weeks after this one, up to the week holding the next period's last day
// (logging ahead is allowed that far — Phil 2026-11-06).
export function weeksForward(periods, activePeriodId, todayDate) {
  const active = (periods || []).find((p) => p.id === activePeriodId);
  if (!active) return WEEKS_FORWARD;
  const lastLoggable = addDays(active.startDate, 69);
  const from = sundayOf(todayDate), to = sundayOf(lastLoggable);
  const weeks = Math.round((new Date(to + "T12:00:00") - new Date(from + "T12:00:00")) / (7 * 86400000));
  return Math.max(WEEKS_FORWARD, weeks);
}
const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
export const STATUS_COLOR = { logged: SUCCESS, missed: DANGER, upcoming: ACCENT };

export function dayStatus(info, date, today) {
  if (info.status === "shift" || info.status === "dayoff") return "logged";
  return date <= today ? "missed" : "upcoming";
}

export function WeekStrip({periods, activePeriodId, todayDate, onSelect}) {
  const trackRef = useRef(null);
  const weeks = useMemo(() => {
    const first = addDays(sundayOf(todayDate), -7 * WEEKS_BACK);
    return Array.from({ length: WEEKS_BACK + 1 + weeksForward(periods, activePeriodId, todayDate) }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
  }, [todayDate, periods, activePeriodId]);
  const [page, setPage] = useState(WEEKS_BACK);

  // Open on this week (no animation).
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollLeft = el.clientWidth * WEEKS_BACK;
  }, [weeks]);

  function onScroll(e) {
    const el = e.currentTarget;
    if (!el.clientWidth) return;
    const p = Math.round(el.scrollLeft / el.clientWidth);
    if (p !== page) setPage(p);
  }

  const shown = weeks[page] || weeks[WEEKS_BACK];
  const label = page === WEEKS_BACK ? "This week" : page === WEEKS_BACK + 1 ? "Next week" : page === WEEKS_BACK - 1 ? "Last week" : `${fmtShort(shown[0])} – ${fmtShort(shown[6])}`;

  return (
    <div style={{marginBottom:14}} aria-label="Your week" role="group">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",margin:"0 0 8px"}}>
        <p style={{color:MUTED,fontSize:"0.6875rem",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:0}}>{label}</p>
        <p style={{color:MUTED,fontSize:"0.6875rem",margin:0}}>{fmtShort(shown[0])} – {fmtShort(shown[6])}</p>
      </div>
      <div ref={trackRef} onScroll={onScroll} className="rb-week-track"
        style={{display:"flex",overflowX:"auto",scrollSnapType:"x mandatory",scrollbarWidth:"none"}}>
        {weeks.map((days) => (
          <div key={days[0]} data-week={days[0]} style={{flex:"0 0 100%",scrollSnapAlign:"start",display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:4}}>
            {days.map((date, i) => {
              const info = dayInfo(periodForDate(periods, date, activePeriodId), date);
              const status = dayStatus(info, date, todayDate);
              const color = STATUS_COLOR[status];
              const isToday = date === todayDate;
              const dayNum = Number(date.slice(8, 10));
              const what = status === "logged"
                ? (info.status === "shift" ? info.shift.roster : info.dayOff.type)
                : status === "missed" ? "nothing logged" : "not logged yet";
              return (
                <button key={date} type="button" data-date={date} data-status={status}
                  onClick={() => onSelect(date, info)}
                  aria-label={`${new Date(date + "T12:00:00").toLocaleDateString("en-IE", {weekday:"long",day:"numeric",month:"long"})}: ${what}`}
                  style={{minWidth:0,background:"none",border:"none",padding:"2px 0",cursor:"pointer",display:"flex",justifyContent:"center"}}>
                  <span style={{width:"min(44px,100%)",aspectRatio:"1",borderRadius:"50%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",lineHeight:1.05,
                    background:isToday?color:`${color}22`,border:`2px solid ${isToday?TEXT:color}`,color:isToday?"#07090F":color,
                    boxShadow:isToday?`0 0 0 2px ${color}`:"none"}}>
                    <span style={{fontSize:"0.6875rem",fontWeight:700}}>{LETTERS[i]}</span>
                    <span style={{fontSize:"0.9375rem",fontWeight:800}}>{dayNum}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div aria-hidden="true" style={{display:"flex",justifyContent:"center",gap:6,marginTop:8}}>
        {weeks.map((days, w) => (
          <span key={days[0]} style={{width:16,height:6,borderRadius:3,background:w===page?ACCENT:BORDER,transform:`scaleX(${w===page?1:0.375})`,transition:"transform .2s"}}/>
        ))}
      </div>
      <style>{`.rb-week-track::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}
