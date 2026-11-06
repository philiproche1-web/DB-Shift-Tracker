import { useState, useEffect, useMemo } from "react";
import { MAX_HOURS, MAX_SUNDAY, getDayType, addDays, fmtShort, fmtHrs, today, calcSpreadover, greetingTimeBand, dutyNumber } from "../lib/dutyMath.js";
import { alertsForTodaysDuty } from "../lib/routeAlerts.js";
import { displayRoster, DUTIES, pStats, getSeq, greetingDutyContext, computeShiftStreak, weekHighlights } from "../lib/roster.js";
import { BG, CARD, BORDER, CARD2, TEXT, MUTED, ACCENT, SUCCESS, DANGER, btnStyle, cardStyle, inputStyle, tag } from "../lib/theme.js";
import { notifyOnce, loadSettings, saveSettings } from "../lib/persistence.js";
import { subscribeToPush } from "../lib/push.js";
import { fetchWeather, weatherIconKind } from "../lib/weather.js";
import { HeaderAlertButton, NewPeriodBanner, WeatherChip, SettingsButton, useModalA11y } from "../components/shared.jsx";
import { ShareDutySheet } from "../components/ShareDutySheet.jsx";
import { WeekStrip } from "../components/WeekStrip.jsx";
import { Badge } from "../components/Badge.jsx";
import { describeKey } from "../lib/achievements.js";
import { shareDataFromShift } from "../lib/dutyShare.js";

// Makes sure this device actually has a push subscription registered, given
// the driver already has reminders on and OS permission granted. The Settings
// toggle is the only other caller of subscribeToPush, so without this an
// existing driver — who has notificationsEnabled defaulted to true and granted
// permission long before push existed — would have zero rows in
// push_subscriptions and silently receive nothing. Called unconditionally on
// every mount (no "already subscribed" guard) rather than short-circuiting on
// isPushSubscribed(), which only reflects browser-side subscription state —
// if the Supabase upsert ever failed after a successful browser subscribe,
// that check would report "subscribed" forever with no way to retry. Safe to
// call every time: pushManager.subscribe() with the same applicationServerKey
// resolves with the existing subscription instead of creating a new one
// (browser-native idempotency), and the Supabase upsert is keyed
// onConflict:"endpoint", so a redundant call is just a cheap no-op rewrite of
// the same row — and it's how the browser rotating its push endpoint actually
// gets picked up.
async function ensurePushSubscription(userId) {
  if (!userId) return;
  try {
    await subscribeToPush(userId);
  } catch { /* best effort — the Settings toggle stays the explicit path */ }
}

export { displayRoster };

// ─── TODAY DUTY CARD ──────────────────────────────────────────────────────────
// Camera (share) + OT buttons. Vertical beside the running board when the
// card is open (that column was empty space), a right-aligned row when it is
// collapsed so they're never hidden behind an extra tap.
function DutyCardActions({ac, onShare, onOT, vertical}) {
  if (!onShare && !onOT) return null;
  const b = {width:44,height:44,borderRadius:12,background:"#07090F55",border:`1px solid ${ac}44`,color:ac,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:0,flexShrink:0};
  return (
    <div style={{display:"flex",flexDirection:vertical?"column":"row",gap:8,flexShrink:0,justifyContent:"flex-end"}}>
      {onShare && <button type="button" aria-label="Share this duty" onClick={(e)=>{e.stopPropagation();onShare();}} style={b}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </button>}
      {onOT && <button type="button" aria-label="Log overtime or rest day" onClick={(e)=>{e.stopPropagation();onOT();}} style={{...b,fontSize:"0.8125rem",fontWeight:800,letterSpacing:0.5}}>OT</button>}
    </div>
  );
}

export function TodayDutyCard({shift, label, accentColor, defaultExpanded=true, onShare, onOT}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const seq = useMemo(()=>getSeq(shift.zone, getDayType(shift.date), shift.roster),[shift]);
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
            <p style={{color:ac,fontSize:"0.6875rem",textTransform:"uppercase",letterSpacing:2,fontWeight:700,margin:"0 0 4px"}}>{label}</p>
            {/* Phil 2026-11-06: show "Z1/15X" (no leading S), Duty No. beside
                it, and no zone line — the code already says the zone. Display
                only: the stored roster code is never changed. */}
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <p style={{color:TEXT,fontSize:"1.75rem",fontWeight:800,margin:0,letterSpacing:"-1px"}}>{displayRoster(shift.roster)}</p>
              {dutyNumber(shift.duty) && <span style={{...tag(ACCENT),display:"inline-block"}}>Duty No. {dutyNumber(shift.duty)}</span>}
            </div>
            {(shift.isSpare || shift.isRestDay) && <p style={{color:MUTED,fontSize:"0.8125rem",margin:"3px 0 0"}}>{[shift.isSpare&&"Spare",shift.isRestDay&&"Rest day"].filter(Boolean).join(" · ")}</p>}
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{color:TEXT,fontSize:"1.25rem",fontWeight:800,margin:0}}>{fmtHrs(spread)}</p>
            {getDayType(shift.date)==="sunday"&&<span style={{...tag(SUCCESS),marginTop:4,display:"block"}}>Sunday</span>}
            <span className={expanded?undefined:"rb-hint-pulse"} style={{color:ac,fontSize:"0.75rem",marginTop:6,display:"block"}}>{expanded?"▲ less":"▼ running board"}</span>
            <style>{`@keyframes rb-hint{0%,100%{opacity:1}50%{opacity:.25}}.rb-hint-pulse{animation:rb-hint 1s ease-in-out 4}@media (prefers-reduced-motion: reduce){.rb-hint-pulse{animation:none}}`}</style>
          </div>
        </div>
        {/* Key times row */}
        <div style={{display:"grid",gridTemplateColumns:`1fr ${duty?.b?"1fr ":""}1fr`,gap:6}}>
          {/* minWidth:0 overrides the grid item default of min-width:auto — without
              it, a 1fr column won't shrink below its content's intrinsic width, so
              at large OS/browser text sizes these three columns push the card wider
              than its overflow:hidden container instead of wrapping/shrinking. */}
          <div style={{background:"#07090F55",borderRadius:10,padding:"8px 10px",minWidth:0}}>
            <p style={{color:MUTED,fontSize:"0.6875rem",textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 2px"}}>Report</p>
            <p style={{color:ac,fontSize:"0.9375rem",fontWeight:800,margin:0,fontVariantNumeric:"tabular-nums"}}>{shift.reportTime}</p>
          </div>
          {duty?.b&&<div style={{background:"#07090F55",borderRadius:10,padding:"8px 10px",minWidth:0}}>
            <p style={{color:MUTED,fontSize:"0.6875rem",textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 2px"}}>Break</p>
            <p style={{color:"#F59E0B",fontSize:"0.9375rem",fontWeight:800,margin:0,fontVariantNumeric:"tabular-nums"}}>{duty.bs||"–"}</p>
          </div>}
          <div style={{background:"#07090F55",borderRadius:10,padding:"8px 10px",minWidth:0}}>
            <p style={{color:MUTED,fontSize:"0.6875rem",textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 2px"}}>Finish</p>
            <p style={{color:SUCCESS,fontSize:"0.9375rem",fontWeight:800,margin:0,fontVariantNumeric:"tabular-nums"}}>{shift.signOffTime}</p>
          </div>
        </div>
        {!expanded && (onShare||onOT) && <div style={{marginTop:10}}><DutyCardActions ac={ac} onShare={onShare} onOT={onOT}/></div>}
      </div>

      {/* Inline running board */}
      {expanded && seq.length > 0 && (
        <div style={{borderTop:`1px solid ${ac}22`,padding:"12px 18px 16px"}}>
          <p style={{color:MUTED,fontSize:"0.625rem",textTransform:"uppercase",letterSpacing:2,fontWeight:700,margin:"0 0 12px"}}>Running Board</p>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <div style={{position:"relative",flex:1,minWidth:0}}>
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
                      <span style={{color:color,fontSize:"1rem",fontWeight:800,fontVariantNumeric:"tabular-nums"}}>{time}</span>
                      {eLabel&&<span style={{background:`${dot}22`,color:dot,borderRadius:5,padding:"1px 7px",fontSize:"0.6875rem",fontWeight:700,letterSpacing:0.5}}>{eLabel}</span>}
                    </div>
                    <p style={{color:MUTED,fontSize:"0.8125rem",margin:"2px 0 0",lineHeight:1.3}}>{rest}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <DutyCardActions ac={ac} onShare={onShare} onOT={onOT} vertical/>
          </div>
        </div>
      )}

      {expanded && seq.length === 0 && (
        <div style={{borderTop:`1px solid ${ac}22`,padding:"12px 18px 16px",display:"flex",gap:12,alignItems:"center"}}>
          <p style={{color:MUTED,fontSize:"0.8125rem",margin:0,textAlign:"center",flex:1}}>No running board available for this duty</p>
          <DutyCardActions ac={ac} onShare={onShare} onOT={onOT} vertical/>
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
      <p style={{color:MUTED,fontSize:"0.625rem",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 8px"}}>This Week</p>
      {highlights.map((h,i) => (
        <p key={i} style={{color:TEXT,fontSize:"0.875rem",fontWeight:600,margin:i<highlights.length-1?"0 0 4px":0}}>{h}</p>
      ))}
    </div>
  );
}

// ─── DAY CARD (from the week strip) ─────────────────────────────────────
// Opens over Home when a green (logged) day is tapped: the full duty card
// with Edit, OT/rest day/notes and Share, or the day off with Edit.
// Rest day / overtime / notes right on the card (Phil 2026-11-06: drivers
// couldn't find them behind Edit > More options). Same fields and rules as
// the Log screen's More options: on a rest day all hours count as overtime,
// so the overtime boxes hide.
export function ShiftExtrasEditor({shift, onSave, onEditShift}) {
  const [isRestDay, setIsRestDay] = useState(!!shift.isRestDay);
  const [otH, setOtH] = useState(Math.floor(shift.overtimeHours || 0));
  const [otM, setOtM] = useState(Math.round(((shift.overtimeHours || 0) % 1) * 60));
  const [otNote, setOtNote] = useState(shift.overtimeNote || "");
  const [notes, setNotes] = useState(shift.notes || "");
  const next = { ...shift, isRestDay, overtimeHours: otH + otM / 60, overtimeNote: otNote.trim(), notes: notes.trim() };
  const changed = next.isRestDay !== !!shift.isRestDay || Math.abs(next.overtimeHours - (shift.overtimeHours || 0)) > 1e-6
    || next.overtimeNote !== (shift.overtimeNote || "") || next.notes !== (shift.notes || "");
  const label = {display:"block",color:TEXT,fontSize:"0.78125rem",textTransform:"uppercase",letterSpacing:1.2,fontWeight:700,margin:"0 0 8px"};
  const box = {...inputStyle,padding:"12px 8px",textAlign:"center",minWidth:0};
  return (
    <div style={{...cardStyle,padding:"14px 16px",marginBottom:12}}>
      <div role="switch" aria-checked={isRestDay} aria-label="Working on a rest day" tabIndex={0}
        onClick={() => setIsRestDay(!isRestDay)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsRestDay(!isRestDay); } }}
        style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,cursor:"pointer",marginBottom:14}}>
        <div>
          <p style={{color:isRestDay?DANGER:TEXT,fontSize:"0.875rem",fontWeight:600,margin:0}}>Working on a rest day</p>
          <p style={{color:MUTED,fontSize:"0.75rem",margin:"2px 0 0"}}>The whole duty counts as overtime, not toward 190h</p>
        </div>
        <div style={{width:44,height:26,borderRadius:13,background:isRestDay?DANGER:BORDER,position:"relative",flexShrink:0}}>
          <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:isRestDay?21:3,transition:"left 0.2s"}}/>
        </div>
      </div>
      {(
        <div style={{marginBottom:14}}>
          <label htmlFor="day-ot-h" style={label}>{isRestDay ? "Extra overtime" : "Overtime"}</label>
          {isRestDay && <p style={{color:MUTED,fontSize:"0.71875rem",margin:"-4px 0 8px"}}>On top of the duty, e.g. a late break.</p>}
          <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto minmax(0,1fr) auto",gap:8,alignItems:"center"}}>
            <input id="day-ot-h" aria-label="Overtime hours" type="number" inputMode="numeric" min="0" max="12" value={otH} onChange={(e)=>setOtH(Math.min(12,Math.max(0,parseInt(e.target.value)||0)))} style={box}/>
            <span style={{color:MUTED,fontSize:"0.8125rem"}}>h</span>
            <input aria-label="Overtime minutes" type="number" inputMode="numeric" min="0" max="59" value={otM} onChange={(e)=>setOtM(Math.min(59,Math.max(0,parseInt(e.target.value)||0)))} style={box}/>
            <span style={{color:MUTED,fontSize:"0.8125rem"}}>m</span>
          </div>
          {(otH > 0 || otM > 0) && (
            <textarea aria-label="What was this overtime for?" value={otNote} onChange={(e)=>setOtNote(e.target.value)} placeholder="What was it for? e.g. late break"
              style={{...inputStyle,marginTop:10,minHeight:56,resize:"vertical",fontFamily:"inherit",lineHeight:1.5}}/>
          )}
        </div>
      )}
      <label htmlFor="day-notes" style={label}>Notes</label>
      <textarea id="day-notes" value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="e.g. duty changed at short notice"
        style={{...inputStyle,minHeight:64,resize:"vertical",fontFamily:"inherit",lineHeight:1.5,marginBottom:14}}/>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:10}}>
        {onEditShift
          ? <button type="button" onClick={() => onEditShift(shift)} style={{background:"none",border:`1px solid ${ACCENT}`,color:ACCENT,borderRadius:12,padding:"13px 0",fontSize:"0.9375rem",fontWeight:700,cursor:"pointer",minWidth:0}}>Edit duty</button>
          : <span/>}
        <button type="button" disabled={!changed} onClick={() => onSave(next)}
          style={{...btnStyle,padding:"13px 0",minWidth:0,opacity:changed?1:0.4,cursor:changed?"pointer":"default"}}>Save</button>
      </div>
    </div>
  );
}

export function DaySheet({day, onClose, onShare, onEditShift, onEditDayOff, onLogDate, onSaveShift, focusExtras = false}) {
  const ref = useModalA11y(onClose);
  const {date, info} = day;
  const label = new Date(date + "T12:00:00").toLocaleDateString("en-IE", {weekday:"long", day:"numeric", month:"long"});
  const secondary = {background:"none",border:`1px solid ${ACCENT}`,color:ACCENT,borderRadius:12,padding:"13px 0",fontSize:"0.9375rem",fontWeight:700,cursor:"pointer",minWidth:0};
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000000aa",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:10}}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} onClick={(e)=>e.stopPropagation()}
        style={{width:"100%",maxWidth:480,maxHeight:"88vh",overflowY:"auto",background:BG,border:`1px solid ${BORDER}`,borderRadius:20,padding:"14px 12px 12px",outline:"none",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,margin:"0 4px 10px"}}>
          <p style={{color:TEXT,fontSize:"1rem",fontWeight:800,margin:0}}>{label}</p>
          <button type="button" onClick={onClose} aria-label="Close" style={{width:44,height:44,borderRadius:12,background:"none",border:`1px solid ${BORDER}`,color:TEXT,fontSize:"1.375rem",lineHeight:1,cursor:"pointer",flexShrink:0}}>×</button>
        </div>
        {info.status === "shift" ? (
          <>
            <TodayDutyCard shift={info.shift} label={date === today() ? "Today's Duty" : "Duty"} accentColor={ACCENT}
              onShare={() => onShare(info.shift)} defaultExpanded={!focusExtras && date >= today()}/>
            <ShiftExtrasEditor key={info.shift.id} shift={info.shift} onEditShift={onEditShift} onSave={(s) => { onSaveShift?.(s); onClose(); }}/>
          </>
        ) : (
          <div style={{...cardStyle,padding:"16px 18px"}}>
            <p style={{color:info.dayOff.type === "Rest Day" ? SUCCESS : ACCENT,fontSize:"1.125rem",fontWeight:800,margin:"0 0 4px"}}>{info.dayOff.type}</p>
            <p style={{color:MUTED,fontSize:"0.8125rem",margin:"0 0 14px"}}>{info.dayOff.fixed ? "From your fixed rest-day pattern" : "Logged"}</p>
            <div style={{display:"grid",gap:8}}>
              {info.dayOff.type === "Rest Day" && (
                <button type="button" onClick={() => onLogDate(date, {isRestDay:true})} style={btnStyle}>Working this rest day? Log it</button>
              )}
              {!info.dayOff.fixed && info.dayOff.type !== "Bank Holiday In Lieu" && onEditDayOff && (
                <button type="button" onClick={() => onEditDayOff(info.dayOff)} style={secondary}>Edit</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
export function HomeScreen({period, periods, alerts, onViewAlerts, todayBadges = {keys:[], retroCount:0}, onOpenAchievements, driverFirstName, userId, onLogDate, onEditShift, onEditDayOff, onSaveShift, onGoWeek, justRolledPeriod, onDismissRolloverBanner, onOpenSettings}) {
  const [shareShift, setShareShift] = useState(null);
  const [openDay, setOpenDay] = useState(null); // {date, info} from the week strip
  const stats = useMemo(() => pStats(period), [period]);
  const [weather, setWeather] = useState(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchWeather().then(w => { if (!cancelled) setWeather(w); });
    return () => { cancelled = true; };
  }, []);
  const todayDate = today();
  const cwIdx = stats.weeks.findIndex(w => todayDate >= w.start && todayDate <= w.end);
  const wi = cwIdx >= 0 ? cwIdx : 0;
  const cw = stats.weeks[wi];
  const thisWeekHighlights = useMemo(() => weekHighlights(periods, period.id, cw.start), [periods, period.id, cw.start]);
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

  // Only when a duty is logged for today AND the alert touches it: same zone,
  // or garage-wide (no zone). Phil 2026-11-06: no logged duty, no alert. The
  // Alerts screen itself still lists everything.
  const activeAlerts = useMemo(() => alertsForTodaysDuty(alerts, todayShift), [alerts, todayDate, todayShift]);

  useEffect(() => {
    // Used to call Notification.requestPermission() unconditionally here on
    // every mount whenever notificationsEnabled was true (the default) — a
    // system permission dialog with zero explanation, seconds after
    // signup. A reflex Deny there silently and permanently disabled
    // reminders, with nothing telling the driver it happened or how to
    // undo it. Settings' own toggle (toggleNotifications) already does
    // this properly — asks only when the driver taps it, with a clear
    // toast either way — so this now shows an explainer card instead of
    // calling the browser API directly; the card's own "Turn on" button is
    // the only place this component ever calls requestPermission.
    if (typeof Notification === "undefined") return; // unsupported browser, nothing to prime
    if (Notification.permission !== "default") return; // already decided, one way or the other
    if (localStorage.getItem("dbus_notif_primed")) return; // already asked once, don't nag every visit
    setShowNotifPrompt(true);
  }, []);

  useEffect(() => {
    // Permission was already granted on an earlier visit — including every
    // existing driver, who granted it to a build that had no push at all.
    // They'd otherwise never get subscribed without toggling reminders off
    // and back on in Settings, which nothing tells them to do.
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && loadSettings().notificationsEnabled) {
      ensurePushSubscription(userId);
    }
    if (stats.total >= MAX_HOURS*0.9) {
      notifyOnce(`dbus_notified_total90_${period.id}`, "Approaching your period limit", `You're at ${fmtHrs(stats.total)} of your 190h 4m limit.`);
    }
    if (stats.sunday >= MAX_SUNDAY*0.9) {
      notifyOnce(`dbus_notified_sun90_${period.id}`, "Approaching your Sunday hours limit", `You're at ${fmtHrs(stats.sunday)} of your 14h 30m Sunday limit.`);
    }
  }, [period.id, stats.total, stats.sunday, userId]);

  function dismissNotifPrompt() {
    localStorage.setItem("dbus_notif_primed", "1");
    setShowNotifPrompt(false);
  }
  // "Not now" deliberately does NOT call requestPermission — OS permission
  // stays "default", so tapping the Settings toggle later still works
  // exactly as if this card had never appeared. Also corrects
  // notificationsEnabled to false: it was defaulting to true despite
  // permission never actually being granted, which is what made the old
  // cold-prompt logic think it had something to act on in the first place.
  function declineNotifPrompt() {
    saveSettings({...loadSettings(), notificationsEnabled:false});
    dismissNotifPrompt();
  }
  function acceptNotifPrompt() {
    Notification.requestPermission().then(perm => {
      const enabled = perm === "granted";
      saveSettings({...loadSettings(), notificationsEnabled:enabled});
      if (enabled) ensurePushSubscription(userId);
      dismissNotifPrompt();
    });
  }

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      {/* Header gradient */}
      <div style={{padding:"calc(28px + env(safe-area-inset-top,0px)) 20px 20px",background:`linear-gradient(180deg,${CARD2} 0%,${BG} 100%)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
          <div style={{flex:1,minWidth:0}}>
            {driverFirstName ? (
              <>
                <p style={{color:TEXT,fontSize:"0.9375rem",fontWeight:700,margin:"0 0 4px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span>{greetingTimeBand()}, {driverFirstName} — {dutyContext}.</span>
                  {weather && <WeatherChip tempC={weather.tempC} iconKind={weatherIconKind(weather.code)}/>}
                </p>
                {shiftStreak >= 2 && (
                  <p style={{color:ACCENT,fontSize:"0.75rem",fontWeight:600,margin:"0 0 4px"}}>{shiftStreak} shifts logged in a row — nice work.</p>
                )}
              </>
            ) : (
              <p style={{color:MUTED,fontSize:"0.6875rem",margin:"0 0 4px",textTransform:"uppercase",letterSpacing:2,fontWeight:600,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span>Roster Buddy</span>
                {weather && <WeatherChip tempC={weather.tempC} iconKind={weatherIconKind(weather.code)}/>}
              </p>
            )}
            <p style={{color:TEXT,fontSize:"1.375rem",fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>
              {fmtShort(period.startDate)} <span style={{color:MUTED,fontWeight:400}}>—</span> {fmtShort(addDays(period.startDate,34))}
            </p>
            <p style={{color:MUTED,fontSize:"0.75rem",margin:"4px 0 0"}}>Week {wi+1} of 5 · {fmtShort(cw.start)} – {fmtShort(cw.end)}</p>
          </div>
          <SettingsButton onClick={onOpenSettings}/>
        </div>
      </div>

      <div style={{padding:"0 16px"}}>

        {/* Week strip (Phil 2026-11-06): straight under the date. Tap a red
            or yellow day to log it; tap a green day to open it. */}
        <WeekStrip periods={periods} activePeriodId={period.id} todayDate={todayDate}
          onSelect={(date, info) => info.status === "unlogged" ? onLogDate(date) : setOpenDay({date, info})}/>

        {/* Full-width so it doesn't fight the greeting/date for horizontal
            room the way a header pill did (that squeezed "Good afternoon,
            Phil..." down to five/six wrapped lines on a phone). Sits above
            Today's Duty so it's seen before scrolling, not squeezed into
            the header row. */}
        {todayBadges.retroCount > 0 && todayBadges.keys.length === 0 && (
          <button type="button" onClick={onOpenAchievements} aria-label={`${todayBadges.retroCount} badges unlocked today`}
            style={{width:"100%",textAlign:"left",background:`${ACCENT}14`,border:`1px solid ${ACCENT}55`,borderRadius:14,padding:"10px 14px",marginBottom:12,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
            <span aria-hidden="true" style={{width:40,height:40,borderRadius:"50%",border:`3px solid ${ACCENT}`,background:`${ACCENT}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.25rem",flexShrink:0}}>🏆</span>
            <span style={{minWidth:0}}>
              <span style={{display:"block",color:MUTED,fontSize:"0.6875rem",textTransform:"uppercase",letterSpacing:1.2,fontWeight:700}}>Achievements unlocked</span>
              <span style={{display:"block",color:TEXT,fontSize:"0.9375rem",fontWeight:800}}>{todayBadges.retroCount} badges earned so far · see them</span>
            </span>
          </button>
        )}
        {todayBadges.keys.length > 0 && (() => {
          const latest = describeKey(todayBadges.keys[todayBadges.keys.length - 1]);
          if (!latest) return null;
          const extra = todayBadges.keys.length - 1 + todayBadges.retroCount;
          return (
            <button type="button" onClick={onOpenAchievements} aria-label={`New badge today: ${latest.name}`}
              style={{width:"100%",textAlign:"left",background:`${latest.badge.color}14`,border:`1px solid ${latest.badge.color}55`,borderRadius:14,padding:"10px 14px",marginBottom:12,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
              <Badge badge={latest.badge} level={latest.level} size={40}/>
              <span style={{minWidth:0}}>
                <span style={{display:"block",color:MUTED,fontSize:"0.6875rem",textTransform:"uppercase",letterSpacing:1.2,fontWeight:700}}>New badge today</span>
                <span style={{display:"block",color:TEXT,fontSize:"0.9375rem",fontWeight:800}}>{latest.name}{latest.year ? ` ${latest.year}` : ""}{extra > 0 ? ` +${extra} more` : ""}</span>
              </span>
            </button>
          );
        })()}

        <HeaderAlertButton count={activeAlerts.length} onClick={onViewAlerts}/>

        {justRolledPeriod && <NewPeriodBanner period={justRolledPeriod} onDismiss={onDismissRolloverBanner}/>}

        {/* TODAY'S DUTY leads the screen. It used to sit fourth, below the
            week highlights, the 35-day carousel and the alert banner, which
            measured out at today's report/sign-off times landing on the fold
            (y=632 against a 640px viewport on a 360x640 handset) — so a
            driver glancing at the phone at a stop had to scroll to read the
            one thing they opened the app for. Everything demoted below it is
            planning context, useful but not time-critical. */}
        {todayShift ? (
          <TodayDutyCard shift={todayShift} label="Today's Duty" accentColor={ACCENT} onShare={()=>setShareShift(todayShift)} onOT={()=>setOpenDay({date:todayShift.date, info:{status:"shift", shift:todayShift}, focusExtras:true})} />
        ) : todayDayOff ? (
          todayDayOff.type === "Rest Day" ? (
            <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"16px 18px",marginBottom:12,display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:42,height:42,borderRadius:12,background:`${SUCCESS}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SUCCESS} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.5 2.5L16 9"/></svg>
              </div>
              <div style={{flex:1}}>
                <p style={{color:TEXT,fontSize:"0.875rem",fontWeight:700,margin:"0 0 2px"}}>Resting today</p>
                <p style={{color:MUTED,fontSize:"0.75rem",margin:0}}>Scheduled rest day — nothing to log</p>
              </div>
            </div>
          ) : (
            <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"16px 18px",marginBottom:12,display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:42,height:42,borderRadius:12,background:`${SUCCESS}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SUCCESS} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.5 2.5L16 9"/></svg>
              </div>
              <div style={{flex:1}}>
                <p style={{color:TEXT,fontSize:"0.875rem",fontWeight:700,margin:"0 0 2px"}}>{todayDayOff.type} today</p>
                <p style={{color:MUTED,fontSize:"0.75rem",margin:0}}>Logged as {todayDayOff.type} — nothing to log</p>
              </div>
            </div>
          )
        ) : (
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"16px 18px",marginBottom:12,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:42,height:42,borderRadius:12,background:`${ACCENT}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div style={{flex:1}}>
              <p style={{color:TEXT,fontSize:"0.875rem",fontWeight:700,margin:"0 0 2px"}}>No duty logged for today</p>
              <p style={{color:MUTED,fontSize:"0.75rem",margin:0}}>Log today's shift or look up your duty below</p>
            </div>
          </div>
        )}

        {tomorrowShift && (
          <TodayDutyCard shift={tomorrowShift} label="Tomorrow's Duty" accentColor="#60a5fa" defaultExpanded={false} onShare={()=>setShareShift(tomorrowShift)} onOT={()=>setOpenDay({date:tomorrowShift.date, info:{status:"shift", shift:tomorrowShift}, focusExtras:true})} />
        )}

        {/* Explains what's being asked before the OS permission dialog
            appears, rather than that dialog just showing up cold. Same
            dismissible-card pattern as NewPeriodBanner above, not a
            blocking modal. */}
        {showNotifPrompt && (
          <div style={{...cardStyle,padding:"14px 16px",marginBottom:12,display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{width:36,height:36,borderRadius:10,background:`${ACCENT}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{color:TEXT,fontSize:"0.84375rem",fontWeight:700,margin:"0 0 3px"}}>Get a nudge when your break ends</p>
              <p style={{color:MUTED,fontSize:"0.75rem",margin:"0 0 10px",lineHeight:1.5}}>We can remind you when your break's about to finish, and if you haven't logged a shift by evening. Off by default until you say yes.</p>
              <div style={{display:"flex",gap:8}}>
                <button onClick={acceptNotifPrompt} style={{background:ACCENT,color:"#07090F",border:"none",borderRadius:8,padding:"8px 14px",fontSize:"0.78125rem",fontWeight:700,cursor:"pointer"}}>Turn on</button>
                <button onClick={declineNotifPrompt} style={{background:"none",color:MUTED,border:`1px solid ${BORDER}`,borderRadius:8,padding:"8px 14px",fontSize:"0.78125rem",fontWeight:600,cursor:"pointer"}}>Not now</button>
              </div>
            </div>
          </div>
        )}

        {/* The "+ Log a Shift" button was removed (Phil 2026-11-06): today's
            circle in the week strip and the Log tab both do it. */}

        {/* Planning context — demoted below the time-critical cards above. */}
        <WeekHighlightsCard highlights={thisWeekHighlights}/>


        {/* Remaining hours + week totals */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"14px 16px"}}>
            <p style={{color:MUTED,fontSize:"0.625rem",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 4px"}}>Remaining</p>
            <p style={{color:remainingHrs<20?DANGER:remainingHrs<40?"#F59E0B":TEXT,fontSize:"1.375rem",fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>{fmtHrs(remainingHrs)}</p>
            <p style={{color:MUTED,fontSize:"0.6875rem",margin:"2px 0 0"}}>of 190h 4m</p>
          </div>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"14px 16px"}}>
            <p style={{color:MUTED,fontSize:"0.625rem",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 4px"}}>This week</p>
            <p style={{color:TEXT,fontSize:"1.375rem",fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>{fmtHrs(cw.total)}</p>
            {cw.sunday>0&&<p style={{color:SUCCESS,fontSize:"0.6875rem",margin:"2px 0 0"}}>Sun {fmtHrs(cw.sunday)}</p>}
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
              <p style={{color:i===wi?ACCENT:MUTED,fontSize:"0.6875rem",margin:"0 0 4px",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>W{i+1}</p>
              <p style={{color:w.total>0?TEXT:MUTED,fontWeight:700,fontSize:"0.875rem",margin:0}}>{w.total>0?fmtHrs(w.total):"–"}</p>
              {w.sunday>0&&<p style={{color:SUCCESS,fontSize:"0.65625rem",margin:"2px 0 0"}}>{fmtHrs(w.sunday)}</p>}
            </div>
          ))}
        </div>

        {/* Period compliance */}
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:"16px 18px"}}>
          <p style={{color:MUTED,fontSize:"0.625rem",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 14px"}}>Period limits</p>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{color:MUTED,fontSize:"0.8125rem"}}>Total hours</span>
              <span style={{color:stats.total>MAX_HOURS?DANGER:ACCENT,fontWeight:700,fontSize:"0.8125rem"}}>{fmtHrs(stats.total)} <span style={{color:MUTED,fontWeight:400,fontSize:"0.6875rem"}}>/ 190h 4m</span></span>
            </div>
            <div style={{background:BORDER,borderRadius:4,height:5}}>
              <div style={{width:"100%",transform:`scaleX(${totalPct/100})`,transformOrigin:"left",background:stats.total>MAX_HOURS?DANGER:totalPct>80?"#F59E0B":SUCCESS,height:5,borderRadius:4,transition:"transform 0.4s"}}/>
            </div>
            {stats.total>MAX_HOURS && <p style={{color:DANGER,fontSize:"0.6875rem",margin:"6px 0 0",fontWeight:600}}>Limit exceeded</p>}
          </div>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{color:MUTED,fontSize:"0.8125rem"}}>Sunday hours</span>
              <span style={{color:stats.sunday>MAX_SUNDAY?DANGER:SUCCESS,fontWeight:700,fontSize:"0.8125rem"}}>{fmtHrs(stats.sunday)} <span style={{color:MUTED,fontWeight:400,fontSize:"0.6875rem"}}>/ 14h 30m</span></span>
            </div>
            <div style={{background:BORDER,borderRadius:4,height:5}}>
              <div style={{width:"100%",transform:`scaleX(${sunPct/100})`,transformOrigin:"left",background:stats.sunday>MAX_SUNDAY?DANGER:sunPct>80?"#F59E0B":SUCCESS,height:5,borderRadius:4,transition:"transform 0.4s"}}/>
            </div>
            {stats.sunday>MAX_SUNDAY && <p style={{color:DANGER,fontSize:"0.6875rem",margin:"6px 0 0",fontWeight:600}}>Limit exceeded</p>}
          </div>
          {stats.overtime>0 && (
            <div style={{marginTop:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{color:MUTED,fontSize:"0.8125rem"}}>Overtime</span>
                <span style={{color:"#F59E0B",fontWeight:700,fontSize:"0.8125rem"}}>{fmtHrs(stats.overtime)} <span style={{color:MUTED,fontWeight:400,fontSize:"0.6875rem"}}>not counted toward limit</span></span>
              </div>
              <div style={{background:BORDER,borderRadius:4,height:5}}>
                <div style={{width:"100%",background:"#F59E0B44",height:5,borderRadius:4}}/>
              </div>
            </div>
          )}
        </div>

      </div>
      {openDay && <DaySheet day={openDay} focusExtras={!!openDay.focusExtras} onClose={()=>setOpenDay(null)}
        onShare={(s)=>{ setOpenDay(null); setShareShift(s); }}
        onEditShift={onEditShift && ((s)=>{ setOpenDay(null); onEditShift(s); })}
        onEditDayOff={onEditDayOff && ((d)=>{ setOpenDay(null); onEditDayOff(d); })}
        onLogDate={(d, o)=>{ setOpenDay(null); onLogDate(d, o); }}
        onSaveShift={onSaveShift}/>}
      {shareShift && <ShareDutySheet duty={shareDataFromShift(shareShift)} source="home" onClose={()=>setShareShift(null)}/>}
    </div>
  );
}
