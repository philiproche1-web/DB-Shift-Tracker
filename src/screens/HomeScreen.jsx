import { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { MAX_HOURS, MAX_SUNDAY, getDayType, addDays, fmtShort, fmtHrs, today, calcSpreadover, greetingTimeBand } from "../lib/dutyMath.js";
import { isLiveNow } from "../lib/routeAlerts.js";
import { DUTIES, shiftDepartLocation, shiftBreakEnd, pStats, periodForDate, dayInfo, getSeq, greetingDutyContext, computeShiftStreak, weekHighlights } from "../lib/roster.js";
import { BG, CARD, BORDER, CARD2, TEXT, MUTED, ACCENT, SUCCESS, DANGER, btnStyle, tag } from "../lib/theme.js";
import { notifyOnce, loadSettings, saveSettings } from "../lib/persistence.js";
import { fetchWeather, weatherIconKind } from "../lib/weather.js";
import { RouteAlertBanner, WeatherChip, SettingsButton } from "../components/shared.jsx";

// ─── TODAY DUTY CARD ──────────────────────────────────────────────────────────
export function TodayDutyCard({shift, label, accentColor, defaultExpanded=true}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const seq = useMemo(()=>getSeq(shift.zone, getDayType(shift.date), shift.duty||shift.roster),[shift]);
  const duty = DUTIES.find(d=>d.r===shift.roster&&d.t===getDayType(shift.date)&&d.z===shift.zone);
  const spread = calcSpreadover(shift.reportTime, shift.signOffTime);
  const ac = accentColor;

  function entryStyle(entry) {
    const low = entry.toLowerCase();
    if (low.includes('report')) return {dot:ac, label:"REPORT", color:ac};
    if (low.includes('finish')) return {dot:SUCCESS, label:"FINISH", color:SUCCESS};
    if (low.includes('break') && !low.includes('return')) return {dot:"#F59E0B", label:"BREAK", color:"#F59E0B"};
    const rm = entry.match(/\((\w+)\)/);
    const route = rm ? rm[1] : null;
    const isRoute = route && /^\d/.test(route);
    return {dot:"#60a5fa", label:isRoute?route:null, color:TEXT, isRoute};
  }

  return (
    <div style={{background:`linear-gradient(135deg,${CARD2} 0%,#0D1B2A 100%)`,border:`1px solid ${ac}44`,borderRadius:18,marginBottom:12,overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"16px 18px 12px",cursor:"pointer"}} onClick={()=>setExpanded(!expanded)}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <p style={{color:ac,fontSize:11,textTransform:"uppercase",letterSpacing:2,fontWeight:700,margin:"0 0 4px"}}>{label}</p>
            <p style={{color:TEXT,fontSize:28,fontWeight:800,margin:0,letterSpacing:"-1px"}}>{shift.roster}</p>
            <p style={{color:MUTED,fontSize:13,margin:"3px 0 0"}}>{shift.zone}{shift.isSpare?" · Spare":""}{shift.isRestDay?" · Rest day":""}</p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{color:TEXT,fontSize:20,fontWeight:800,margin:0}}>{fmtHrs(spread)}</p>
            {getDayType(shift.date)==="sunday"&&<span style={{...tag(SUCCESS),marginTop:4,display:"block"}}>Sunday</span>}
            <span style={{color:ac,fontSize:12,marginTop:6,display:"block"}}>{expanded?"▲ less":"▼ running board"}</span>
          </div>
        </div>
        {/* Key times row */}
        <div style={{display:"grid",gridTemplateColumns:`1fr ${duty?.b?"1fr ":""}1fr`,gap:6}}>
          <div style={{background:"#07090F55",borderRadius:10,padding:"8px 10px"}}>
            <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 2px"}}>Report</p>
            <p style={{color:ac,fontSize:15,fontWeight:800,margin:0,fontVariantNumeric:"tabular-nums"}}>{shift.reportTime}</p>
          </div>
          {duty?.b&&<div style={{background:"#07090F55",borderRadius:10,padding:"8px 10px"}}>
            <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 2px"}}>Break</p>
            <p style={{color:"#F59E0B",fontSize:15,fontWeight:800,margin:0,fontVariantNumeric:"tabular-nums"}}>{duty.bs||"–"}</p>
          </div>}
          <div style={{background:"#07090F55",borderRadius:10,padding:"8px 10px"}}>
            <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 2px"}}>Finish</p>
            <p style={{color:SUCCESS,fontSize:15,fontWeight:800,margin:0,fontVariantNumeric:"tabular-nums"}}>{shift.signOffTime}</p>
          </div>
        </div>
      </div>

      {/* Inline running board */}
      {expanded && seq.length > 0 && (
        <div style={{borderTop:`1px solid ${ac}22`,padding:"12px 18px 16px"}}>
          <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:2,fontWeight:700,margin:"0 0 12px"}}>Running Board</p>
          <div style={{position:"relative"}}>
            <div style={{position:"absolute",left:7,top:8,bottom:8,width:2,background:`${BORDER}`,borderRadius:1}}/>
            {seq.map((entry, i) => {
              const timeMatch = entry.match(/^(\d{1,2}:\d{2})/);
              const time = timeMatch ? timeMatch[1] : "";
              const rest = entry.replace(/^\d{1,2}:\d{2}\s*-\s*/, "").trim();
              const {dot, label:eLabel, color} = entryStyle(entry);
              return (
                <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:i<seq.length-1?10:0,position:"relative"}}>
                  <div style={{width:16,height:16,borderRadius:"50%",background:dot,flexShrink:0,marginTop:2,boxShadow:`0 0 6px ${dot}66`,zIndex:1}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{color:color,fontSize:16,fontWeight:800,fontVariantNumeric:"tabular-nums"}}>{time}</span>
                      {eLabel&&<span style={{background:`${dot}22`,color:dot,borderRadius:5,padding:"1px 7px",fontSize:11,fontWeight:700,letterSpacing:0.5}}>{eLabel}</span>}
                    </div>
                    <p style={{color:MUTED,fontSize:13,margin:"2px 0 0",lineHeight:1.3}}>{rest}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {expanded && seq.length === 0 && (
        <div style={{borderTop:`1px solid ${ac}22`,padding:"12px 18px 16px"}}>
          <p style={{color:MUTED,fontSize:13,margin:0,textAlign:"center"}}>No running board available for this duty</p>
        </div>
      )}
    </div>
  );
}

// ─── WEEK HIGHLIGHTS ──────────────────────────────────────────────────────────
function WeekHighlightsCard({highlights}) {
  if (!highlights || highlights.length === 0) return null;
  return (
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"14px 16px",marginBottom:12}}>
      <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 8px"}}>This Week</p>
      {highlights.map((h,i) => (
        <p key={i} style={{color:TEXT,fontSize:14,fontWeight:600,margin:i<highlights.length-1?"0 0 4px":0}}>{h}</p>
      ))}
    </div>
  );
}

// ─── UPCOMING CAROUSEL ──────────────────────────────────────────────────────
// Fixed 29-day window (7 back, today, 21 forward) in a native scroll-snap
// strip, defaulted scrolled so today is the first of 3 visible cards. No
// infinite loading — if a driver ever wants to swipe further than 3 weeks
// out, that's a follow-up, not needed for the initial ask.
export const CAROUSEL_DAYS_BACK = 7;
export const CAROUSEL_DAYS_FORWARD = 21;
const carouselArrowStyle = {background:CARD,border:`1px solid ${BORDER}`,color:MUTED,borderRadius:10,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0};

export function UpcomingDayCard({date, isToday, info, onLogDate}) {
  const dayLabel = new Date(date+"T12:00:00").toLocaleDateString("en-IE", {weekday:"short"});
  const dateLabel = fmtShort(date);
  let body;
  if (info.status === "shift") {
    const departLocation = shiftDepartLocation(info.shift);
    body = (
      <>
        <p style={{color:TEXT,fontSize:13,fontWeight:700,margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{info.shift.roster}</p>
        <p style={{color:MUTED,fontSize:11,margin:0}}>{info.shift.reportTime}–{info.shift.signOffTime}</p>
        {departLocation && <p style={{color:ACCENT,fontSize:11,fontWeight:700,margin:"2px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{departLocation}</p>}
      </>
    );
  } else if (info.status === "dayoff") {
    const isRest = info.dayOff.type === "Rest Day";
    body = <p style={{color:isRest?DANGER:ACCENT,fontSize:12,fontWeight:700,margin:0}}>{info.dayOff.type}</p>;
  } else {
    body = <p style={{color:MUTED,fontSize:12,margin:0}}>Not logged yet</p>;
  }
  const isRestDayCard = info.status === "dayoff" && info.dayOff.type === "Rest Day";
  const clickable = info.status === "unlogged" || isRestDayCard;
  return (
    <div
      onClick={clickable ? () => onLogDate(date, isRestDayCard ? {isRestDay:true} : undefined) : undefined}
      style={{
        background:CARD, border:`1px solid ${isToday?ACCENT:BORDER}`, borderRadius:14,
        padding:"10px 10px", flex:"0 0 calc(33.333% - 6px)", textAlign:"center",
        scrollSnapAlign:"start", cursor:clickable?"pointer":"default", position:"relative"
      }}>
      <p style={{color:isToday?ACCENT:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:0.5,fontWeight:700,margin:"0 0 2px",paddingRight:clickable?20:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dayLabel} {dateLabel}</p>
      {body}
      {clickable && (
        <div aria-hidden="true" style={{position:"absolute",top:6,right:6,width:16,height:16,borderRadius:"50%",background:ACCENT,color:"#07090F",fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>+</div>
      )}
    </div>
  );
}

export function UpcomingCarousel({periods, activePeriodId, todayDate, onLogDate}) {
  const containerRef = useRef(null);
  const dates = useMemo(() => {
    const arr = [];
    for (let i = -CAROUSEL_DAYS_BACK; i <= CAROUSEL_DAYS_FORWARD; i++) arr.push(addDays(todayDate, i));
    return arr;
  }, [todayDate]);
  const todayIndex = CAROUSEL_DAYS_BACK;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !el.children[todayIndex]) return;
    el.scrollLeft = el.children[todayIndex].offsetLeft;
  }, [todayIndex]);

  function scrollByCard(dir) {
    const el = containerRef.current;
    if (!el || !el.children[0]) return;
    const cardEl = el.children[0];
    const gap = parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap || "0");
    el.scrollBy({ left: dir * (cardEl.offsetWidth + gap), behavior: "smooth" });
  }

  return (
    <div style={{marginBottom:12}}>
      <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 6px"}}>Upcoming</p>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <button aria-label="Earlier days" onClick={()=>scrollByCard(-1)} style={carouselArrowStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div ref={containerRef} className="upcoming-carousel-track" style={{display:"flex",gap:8,overflowX:"auto",scrollSnapType:"x mandatory",flex:1}}>
          {dates.map((date, i) => (
            <UpcomingDayCard key={date} date={date} isToday={i===todayIndex} info={dayInfo(periodForDate(periods, date, activePeriodId), date)} onLogDate={onLogDate}/>
          ))}
        </div>
        <button aria-label="Later days" onClick={()=>scrollByCard(1)} style={carouselArrowStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <style>{`.upcoming-carousel-track{-webkit-overflow-scrolling:touch;scrollbar-width:none}.upcoming-carousel-track::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
export function HomeScreen({period, periods, alerts, onViewAlerts, driverFirstName, onLog, onLogDate, onGoWeek, onOpenSettings}) {
  const stats = useMemo(() => pStats(period), [period]);
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetchWeather().then(w => { if (!cancelled) setWeather(w); });
    return () => { cancelled = true; };
  }, []);
  const todayDate = today();
  const cwIdx = stats.weeks.findIndex(w => todayDate >= w.start && todayDate <= w.end);
  const wi = cwIdx >= 0 ? cwIdx : 0;
  const cw = stats.weeks[wi];
  const thisWeekHighlights = useMemo(() => weekHighlights(period, cw.start), [period, cw.start]);
  const totalPct = Math.min((stats.total/MAX_HOURS)*100,100);
  const sunPct = Math.min((stats.sunday/MAX_SUNDAY)*100,100);
  const remainingHrs = Math.max(0, MAX_HOURS - stats.total);

  // Today's duty — look for a shift logged for today
  const todayShift = (period.shifts||[]).find(s => s.date === todayDate);
  // Tomorrow's duty — look for a shift logged for tomorrow
  const tomorrowShift = (period.shifts||[]).find(s => s.date === addDays(todayDate,1));
  // Any day off logged for today (Rest Day or otherwise) — comes from the
  // merged (real + auto) daysOff on the current week. Used below to decide
  // which today-card renders and whether the "log today's shift" notification
  // should fire; widened from a Rest-Day-only check so it agrees with the
  // greeting, which already covers all day-off types via greetingDutyContext.
  const todayDayOff = (cw.daysOff||[]).find(d => d.date === todayDate);

  const dutyContext = useMemo(() => greetingDutyContext(period, todayDate), [period, todayDate]);
  const shiftStreak = useMemo(() => computeShiftStreak(periods, period.id, todayDate), [periods, period.id, todayDate]);

  const activeAlerts = useMemo(() => (alerts||[]).filter(a => isLiveNow(a)), [alerts, todayDate]);

  useEffect(() => {
    if (!loadSettings().notificationsEnabled) return;
    // Reminders default to on, so a driver who never touched the toggle still
    // needs the OS permission requested at least once — do it here rather
    // than only from the Settings toggle, which they may never open.
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().then(perm => {
        if (perm !== "granted") saveSettings({...loadSettings(), notificationsEnabled:false});
      });
      return;
    }
    if (!todayShift && !todayDayOff) {
      notifyOnce(`dbus_notified_log_${todayDate}`, "Log today's shift", "Nothing logged yet for today in Shift Tracker.");
    }
    if (stats.total >= MAX_HOURS*0.9) {
      notifyOnce(`dbus_notified_total90_${period.id}`, "Approaching your period limit", `You're at ${fmtHrs(stats.total)} of your 190h 4m limit.`);
    }
    if (stats.sunday >= MAX_SUNDAY*0.9) {
      notifyOnce(`dbus_notified_sun90_${period.id}`, "Approaching your Sunday hours limit", `You're at ${fmtHrs(stats.sunday)} of your 14h 30m Sunday limit.`);
    }
  }, [period.id, stats.total, stats.sunday, todayShift, todayDayOff, todayDate]);

  // Break-end reminder — unlike the checks above (which fire once whenever
  // their state changes), this needs to fire at a specific real-world
  // moment, so it's checked on a 60s tick rather than only on render.
  useEffect(() => {
    function check() {
      const s = loadSettings();
      if (!s.notificationsEnabled || !s.breakReminderEnabled) return;
      const breakEnd = shiftBreakEnd(todayShift);
      if (!breakEnd) return;
      const leadMins = s.breakReminderMinutes || 10;
      const fireAt = new Date(breakEnd.getTime() - leadMins*60000);
      const now = new Date();
      if (now >= fireAt && now < breakEnd) {
        notifyOnce(`dbus_notified_breakend_${todayShift.id}`, "Break ending soon", `Your break ends in about ${leadMins} minutes.`);
      }
    }
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [todayShift]);

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      {/* Header gradient */}
      <div style={{padding:"calc(28px + env(safe-area-inset-top,0px)) 20px 20px",background:`linear-gradient(180deg,${CARD2} 0%,${BG} 100%)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
          <div style={{flex:1,minWidth:0}}>
            {driverFirstName ? (
              <>
                <p style={{color:TEXT,fontSize:15,fontWeight:700,margin:"0 0 4px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span>{greetingTimeBand()}, {driverFirstName} — {dutyContext}.</span>
                  {weather && <WeatherChip tempC={weather.tempC} iconKind={weatherIconKind(weather.code)}/>}
                </p>
                {shiftStreak >= 2 && (
                  <p style={{color:ACCENT,fontSize:12,fontWeight:600,margin:"0 0 4px"}}>{shiftStreak} shifts logged in a row — nice work.</p>
                )}
              </>
            ) : (
              <p style={{color:MUTED,fontSize:11,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:2,fontWeight:600,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span>Shift Tracker</span>
                {weather && <WeatherChip tempC={weather.tempC} iconKind={weatherIconKind(weather.code)}/>}
              </p>
            )}
            <p style={{color:TEXT,fontSize:22,fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>
              {fmtShort(period.startDate)} <span style={{color:MUTED,fontWeight:400}}>—</span> {fmtShort(addDays(period.startDate,34))}
            </p>
            <p style={{color:MUTED,fontSize:12,margin:"4px 0 0"}}>Week {wi+1} of 5 · {fmtShort(cw.start)} – {fmtShort(cw.end)}</p>
          </div>
          <SettingsButton onClick={onOpenSettings}/>
        </div>
      </div>

      <div style={{padding:"0 16px"}}>

        <WeekHighlightsCard highlights={thisWeekHighlights}/>

        <UpcomingCarousel periods={periods} activePeriodId={period.id} todayDate={todayDate} onLogDate={onLogDate}/>

        <RouteAlertBanner alerts={activeAlerts} onView={onViewAlerts}/>

        {/* TODAY'S DUTY — hero card when a shift is logged for today */}
        {todayShift ? (
          <TodayDutyCard shift={todayShift} label="Today's Duty" accentColor={ACCENT} />
        ) : todayDayOff ? (
          todayDayOff.type === "Rest Day" ? (
            <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"16px 18px",marginBottom:12,display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:42,height:42,borderRadius:12,background:`${SUCCESS}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SUCCESS} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.5 2.5L16 9"/></svg>
              </div>
              <div style={{flex:1}}>
                <p style={{color:TEXT,fontSize:14,fontWeight:700,margin:"0 0 2px"}}>Resting today</p>
                <p style={{color:MUTED,fontSize:12,margin:0}}>Scheduled rest day — nothing to log</p>
              </div>
            </div>
          ) : (
            <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"16px 18px",marginBottom:12,display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:42,height:42,borderRadius:12,background:`${SUCCESS}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SUCCESS} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.5 2.5L16 9"/></svg>
              </div>
              <div style={{flex:1}}>
                <p style={{color:TEXT,fontSize:14,fontWeight:700,margin:"0 0 2px"}}>{todayDayOff.type} today</p>
                <p style={{color:MUTED,fontSize:12,margin:0}}>Logged as {todayDayOff.type} — nothing to log</p>
              </div>
            </div>
          )
        ) : (
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"16px 18px",marginBottom:12,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:42,height:42,borderRadius:12,background:`${ACCENT}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div style={{flex:1}}>
              <p style={{color:TEXT,fontSize:14,fontWeight:700,margin:"0 0 2px"}}>No duty logged for today</p>
              <p style={{color:MUTED,fontSize:12,margin:0}}>Log today's shift or look up your duty below</p>
            </div>
          </div>
        )}

        {tomorrowShift && (
          <TodayDutyCard shift={tomorrowShift} label="Tomorrow's Duty" accentColor="#60a5fa" defaultExpanded={false} />
        )}

        {/* Quick action */}
        <button style={{...btnStyle,fontSize:16,padding:"16px 20px",borderRadius:14,textAlign:"left",marginBottom:12}} onClick={onLog}>
          + Log a Shift
        </button>

        {/* Remaining hours + week totals */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"14px 16px"}}>
            <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 4px"}}>Remaining</p>
            <p style={{color:remainingHrs<20?DANGER:remainingHrs<40?"#F59E0B":TEXT,fontSize:22,fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>{fmtHrs(remainingHrs)}</p>
            <p style={{color:MUTED,fontSize:11,margin:"2px 0 0"}}>of 190h 4m</p>
          </div>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"14px 16px"}}>
            <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 4px"}}>This week</p>
            <p style={{color:TEXT,fontSize:22,fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>{fmtHrs(cw.total)}</p>
            {cw.sunday>0&&<p style={{color:SUCCESS,fontSize:11,margin:"2px 0 0"}}>Sun {fmtHrs(cw.sunday)}</p>}
          </div>
        </div>

        {/* 5-week grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:12}}>
          {stats.weeks.map((w,i)=>(
            <div key={i} onClick={()=>onGoWeek(i)} style={{
              background:i===wi?`${ACCENT}18`:CARD,
              border:`1px solid ${i===wi?ACCENT:BORDER}`,
              borderRadius:12, padding:"10px 4px", textAlign:"center", cursor:"pointer"
            }}>
              <p style={{color:i===wi?ACCENT:MUTED,fontSize:11,margin:"0 0 4px",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>W{i+1}</p>
              <p style={{color:w.total>0?TEXT:MUTED,fontWeight:700,fontSize:14,margin:0}}>{w.total>0?fmtHrs(w.total):"–"}</p>
              {w.sunday>0&&<p style={{color:SUCCESS,fontSize:10.5,margin:"2px 0 0"}}>{fmtHrs(w.sunday)}</p>}
            </div>
          ))}
        </div>

        {/* Period compliance */}
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:"16px 18px"}}>
          <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 14px"}}>Period limits</p>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{color:MUTED,fontSize:13}}>Total hours</span>
              <span style={{color:stats.total>MAX_HOURS?DANGER:ACCENT,fontWeight:700,fontSize:13}}>{fmtHrs(stats.total)} <span style={{color:MUTED,fontWeight:400,fontSize:11}}>/ 190h 4m</span></span>
            </div>
            <div style={{background:BORDER,borderRadius:4,height:5}}>
              <div style={{width:"100%",transform:`scaleX(${totalPct/100})`,transformOrigin:"left",background:stats.total>MAX_HOURS?DANGER:totalPct>80?"#F59E0B":SUCCESS,height:5,borderRadius:4,transition:"transform 0.4s"}}/>
            </div>
            {stats.total>MAX_HOURS && <p style={{color:DANGER,fontSize:11,margin:"6px 0 0",fontWeight:600}}>Limit exceeded</p>}
          </div>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{color:MUTED,fontSize:13}}>Sunday hours</span>
              <span style={{color:stats.sunday>MAX_SUNDAY?DANGER:SUCCESS,fontWeight:700,fontSize:13}}>{fmtHrs(stats.sunday)} <span style={{color:MUTED,fontWeight:400,fontSize:11}}>/ 14h 30m</span></span>
            </div>
            <div style={{background:BORDER,borderRadius:4,height:5}}>
              <div style={{width:"100%",transform:`scaleX(${sunPct/100})`,transformOrigin:"left",background:stats.sunday>MAX_SUNDAY?DANGER:sunPct>80?"#F59E0B":SUCCESS,height:5,borderRadius:4,transition:"transform 0.4s"}}/>
            </div>
            {stats.sunday>MAX_SUNDAY && <p style={{color:DANGER,fontSize:11,margin:"6px 0 0",fontWeight:600}}>Limit exceeded</p>}
          </div>
          {stats.overtime>0 && (
            <div style={{marginTop:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{color:MUTED,fontSize:13}}>Overtime</span>
                <span style={{color:"#F59E0B",fontWeight:700,fontSize:13}}>{fmtHrs(stats.overtime)} <span style={{color:MUTED,fontWeight:400,fontSize:11}}>not counted toward limit</span></span>
              </div>
              <div style={{background:BORDER,borderRadius:4,height:5}}>
                <div style={{width:"100%",background:"#F59E0B44",height:5,borderRadius:4}}/>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
