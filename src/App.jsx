import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "./lib/supabaseClient.js";
import { signOut, getSession, onAuthStateChange } from "./lib/auth.js";
import { syncAll, migrateLocalDataIfNeeded } from "./lib/sync.js";
import { hasLiveRoster } from "./lib/garages.js";
import { fetchRouteAlerts } from "./lib/routeAlerts.js";
import { getDayType, addDays, fmtShort, uid } from "./lib/dutyMath.js";
import { loadRosterData, applyRosterData, periodForDate } from "./lib/roster.js";
import { BG, TEXT, MUTED, ACCENT, DANGER, applyTheme, btnStyle } from "./lib/theme.js";
import {
  loadData, writeDataLocally, saveData, APP_VERSION, WHATS_NEW,
  loadLeaveSettings, writeLeaveSettingsLocally, saveLeaveSettings,
  loadSettings, writeSettingsLocally,
} from "./lib/persistence.js";
import { BusLogo, BottomNav, ConfirmDialog } from "./components/shared.jsx";
import { GarageComingSoonScreen } from "./screens/GarageComingSoonScreen.jsx";
import { TermsScreen } from "./screens/TermsScreen.jsx";
import { FAQScreen } from "./screens/FAQScreen.jsx";
import { WhatsNewScreen } from "./screens/WhatsNewScreen.jsx";
import { SetupScreen } from "./screens/SetupScreen.jsx";
import { LogScreen } from "./screens/LogScreen.jsx";
import { RouteAlertsScreen } from "./screens/RouteAlertsScreen.jsx";
import { LogDayOffScreen } from "./screens/LogDayOffScreen.jsx";
import { PeriodScreen } from "./screens/PeriodScreen.jsx";
import { LeaveScreen } from "./screens/LeaveScreen.jsx";
import { ArchiveScreen } from "./screens/ArchiveScreen.jsx";
import { DutyLookup } from "./screens/DutyLookup.jsx";
import { HomeScreen } from "./screens/HomeScreen.jsx";
import { SettingsPanel } from "./screens/SettingsPanel.jsx";
import { TourOverlay } from "./screens/TourOverlay.jsx";

// Lazy: only a signed-out visitor ever needs this bundle chunk, so a logged-in
// driver's initial load never pays for it.
const AuthScreen = lazy(() => import("./screens/AuthScreen.jsx"));
const ResetPasswordScreen = lazy(() => import("./screens/ResetPasswordScreen.jsx"));

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  const [periods, setPeriods] = useState([]);
  const [activePeriodId, setActivePeriodId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editShift, setEditShift] = useState(null);
  const [editDayOff, setEditDayOff] = useState(null);
  const [archiveViewId, setArchiveViewId] = useState(null);
  const [openWeek, setOpenWeek] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [lookupDuty, setLookupDuty] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [themeKey, setThemeKey] = useState(0);
  const [leaveSettings, setLeaveSettings] = useState(loadLeaveSettings);
  const [dayOffFrom, setDayOffFrom] = useState("home"); // tracks where to return after logging day off
  const [viewingTerms, setViewingTerms] = useState(false);
  const [viewingFAQ, setViewingFAQ] = useState(null); // null = closed, "" | category key = open
  const [saveError, setSaveError] = useState(false);
  const [loadCorrupted, setLoadCorrupted] = useState(false);
  const [rosterVersion, setRosterVersion] = useState(0);
  const [logInitDate, setLogInitDate] = useState(null);
  const [logInitRestDay, setLogInitRestDay] = useState(false);
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = signed out
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [driverGarage, setDriverGarage] = useState(undefined); // undefined = not fetched yet, null = fetch failed
  const [driverFirstName, setDriverFirstName] = useState(null);
  const [routeAlerts, setRouteAlerts] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmFeedback, setConfirmFeedback] = useState(false);

  const activePeriod = periods.find(p=>p.id===activePeriodId);

  const tableConfigs = [
    {
      table: "app_data",
      load: async () => { const { data } = await loadData(); return data || { periods: [], activePeriodId: null }; },
      save: async (remote) => { writeDataLocally(remote); setPeriods(remote.periods || []); setActivePeriodId(remote.activePeriodId || null); },
    },
    {
      table: "leave_settings",
      load: () => loadLeaveSettings(),
      save: (remote) => { writeLeaveSettingsLocally(remote); setLeaveSettings(remote); },
    },
    {
      table: "settings",
      load: () => loadSettings(),
      save: (remote) => { writeSettingsLocally(remote); applyTheme(remote.appearance, () => setThemeKey((k) => k + 1)); },
    },
  ];

  useEffect(() => {
    getSession(supabase).then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } = onAuthStateChange(supabase, (newSession, event) => {
      setSession(newSession);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    async function runInitialSync() {
      await migrateLocalDataIfNeeded(supabase, session.user.id, tableConfigs);
      if (!cancelled) await syncAll(supabase, session.user.id, tableConfigs);
    }
    runInitialSync();

    function handleReconnect() { syncAll(supabase, session.user.id, tableConfigs); }
    function handleVisibilityChange() { if (document.visibilityState === "visible") handleReconnect(); }
    window.addEventListener("online", handleReconnect);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleReconnect);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session) { setDriverGarage(undefined); setDriverFirstName(null); return; }
    let cancelled = false;
    supabase.from("profiles").select("garage, first_name").eq("id", session.user.id).single()
      .then(({ data, error }) => {
        if (cancelled) return;
        setDriverGarage(error ? null : data?.garage ?? null);
        setDriverFirstName(error ? null : data?.first_name ?? null);
      });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!driverGarage || !hasLiveRoster(driverGarage)) { setRouteAlerts([]); return; }
    let cancelled = false;
    fetchRouteAlerts(supabase, driverGarage).then((data) => { if (!cancelled) setRouteAlerts(data); });
    return () => { cancelled = true; };
  }, [driverGarage]);

  useEffect(()=>{
    // Request persistent storage so browser doesn't evict data under pressure
    if(navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(()=>{});
    }
    // Apply saved theme on load
    const s = loadSettings();
    applyTheme(s.appearance, null);
    // Fetches fresher duty/running-board/rest-day data in the background so a
    // roster update can go live without an app rebuild — never blocks first
    // render; if it resolves after the user's already looking at a screen,
    // bumping rosterVersion forces the whole tree to re-render with it.
    loadRosterData().then(remote => {
      if(remote) {
        applyRosterData(remote);
        setRosterVersion(v => v+1);
      }
    });
    loadData().then(({data,corrupted})=>{
      if(corrupted) { setLoadCorrupted(true); setLoading(false); return; }
      if(data){setPeriods(data.periods||[]);setActivePeriodId(data.activePeriodId||null);}
      const terms = localStorage.getItem("dbus_terms");
      if(!terms) { setTermsAccepted(false); setLoading(false); return; }
      const seenVersion = localStorage.getItem("dbus_version");
      const isNewInstall = !seenVersion;
      if(seenVersion !== APP_VERSION && (isNewInstall || WHATS_NEW.showToExisting)) setShowWhatsNew(true);
      const toured = localStorage.getItem("dbus_toured");
      if(!toured) setShowTour(true);
      setLoading(false);
    });
  },[]);

  function handleThemeChange(appearance) {
    applyTheme(appearance, ()=>setThemeKey(k=>k+1));
  }

  // Drivers move between garages sometimes — this is the one place garage is
  // ever changed after signup. Only garages with hasLiveRoster() are
  // selectable in the Settings picker, so this never gets called with one
  // that has no roster yet.
  async function handleChangeGarage(newGarage) {
    const { error } = await supabase.from("profiles").update({ garage: newGarage }).eq("id", session.user.id);
    if (!error) setDriverGarage(newGarage);
    return !error;
  }

  async function handleChangeFirstName(newName) {
    const { error } = await supabase.from("profiles").update({ first_name: newName }).eq("id", session.user.id);
    if (!error) setDriverFirstName(newName);
    return !error;
  }

  function handleLeaveSettingsChange(s) {
    setLeaveSettings(s);
    saveLeaveSettings(s);
  }

  function acceptTerms() {
    localStorage.setItem("dbus_terms","1");
    setTermsAccepted(true);
    const seenVersion = localStorage.getItem("dbus_version");
    const isNewInstall = !seenVersion;
    if(seenVersion !== APP_VERSION && (isNewInstall || WHATS_NEW.showToExisting)) setShowWhatsNew(true);
    const toured = localStorage.getItem("dbus_toured");
    if(!toured) setShowTour(true);
  }

  function dismissWhatsNew() {
    localStorage.setItem("dbus_version", APP_VERSION);
    setShowWhatsNew(false);
    // Only force the full tour for drivers who've genuinely never seen it —
    // returning users on a routine update shouldn't be walked through it again.
    if(!localStorage.getItem("dbus_toured")) setShowTour(true);
  }

  function skipTourFromWhatsNew() {
    localStorage.setItem("dbus_toured","1");
    dismissWhatsNew();
  }

  function dismissTour() {
    localStorage.setItem("dbus_toured","1");
    setShowTour(false);
  }

  const persist=(ps,aid)=>{
    setPeriods(ps);setActivePeriodId(aid);
    saveData({periods:ps,activePeriodId:aid}).then(ok=>setSaveError(!ok));
  };

  function createPeriod(startDate) {
    const p={id:uid(),startDate,shifts:[],daysOff:[],createdAt:new Date().toISOString()};
    persist([...periods,p],p.id); setScreen("home");
  }

  function editActivePeriodStartDate(newDate) {
    if(getDayType(newDate)!=="sunday") return;
    const updated=periods.map(p=>p.id!==activePeriodId?p:{...p,startDate:newDate});
    persist(updated,activePeriodId);
  }

  function saveShift(shiftOrArray) {
    const items = Array.isArray(shiftOrArray) ? shiftOrArray : [shiftOrArray];
    const updated=periods.map(p=>{
      if(p.id!==activePeriodId)return p;
      let shifts = p.shifts;
      items.forEach(shift=>{
        const ei=shifts.findIndex(s=>s.id===shift.id);
        if (ei>=0) { shifts = shifts.map(s=>s.id===shift.id?shift:s); return; }
        // New shift (multi-day path): skip if some other shift already owns this date -
        // the day-circle picker greys out already-logged days, but this guards a race
        // (e.g. another device/tab logged something in between) the same way the old
        // standalone Repeat screen's own dedup used to.
        if (shifts.some(s=>s.date===shift.date)) return;
        shifts = [...shifts, shift];
      });
      return{...p,shifts};
    });
    persist(updated,activePeriodId); setEditShift(null); setLookupDuty(null); setLogInitDate(null); setLogInitRestDay(false); setScreen("home");
  }

  function saveDayOff(dayOffOrArray) {
    const items = Array.isArray(dayOffOrArray) ? dayOffOrArray : [dayOffOrArray];
    // Group items by target period
    let updated = [...periods];
    items.forEach(dayOff => {
      // periodForDate checks the active period first — a plain periods.find()
      // here could silently resolve into a stale archived period whose date
      // range still overlaps the active one, saving the day off somewhere it
      // would never be seen (not in Period, not on the Home carousel, not
      // editable/deletable). See periodForDate's own comment for why.
      const targetId = dayOff.id && periods.some(p=>(p.daysOff||[]).some(d=>d.id===dayOff.id))
        ? periods.find(p=>(p.daysOff||[]).some(d=>d.id===dayOff.id))?.id
        : (periodForDate(periods, dayOff.date, activePeriodId)?.id ?? activePeriodId);
      updated = updated.map(p => {
        if(p.id !== targetId) return p;
        const daysOff = p.daysOff||[];
        const ei = daysOff.findIndex(d=>d.id===dayOff.id);
        if (ei>=0) return {...p, daysOff: daysOff.map(d=>d.id===dayOff.id?dayOff:d)};
        // New entry (multi-day path): skip if another day off already owns
        // this date — the Log Day Off screen already blocks this in the UI,
        // this is just the same race guard saveShift already has for its own
        // multi-day path.
        if (daysOff.some(d=>d.date===dayOff.date)) return p;
        return {...p, daysOff:[...daysOff, dayOff]};
      });
    });
    persist(updated, activePeriodId);
    setEditDayOff(null);
    setScreen(dayOffFrom === "leave" ? "leave" : "period");
  }

  function deleteShift(sid) {
    setConfirm({msg:"Delete this shift? This can't be undone.",yesLabel:"Delete",onYes:()=>{
      const updated=periods.map(p=>p.id!==activePeriodId?p:{...p,shifts:p.shifts.filter(s=>s.id!==sid)});
      persist(updated,activePeriodId); setConfirm(null);
    }});
  }

  function deleteDayOff(did) {
    if (did.startsWith("fixed-")) {
      const date = did.slice(6);
      setConfirm({msg:"Stop treating this date as an automatic rest day? If you're resting on a different day instead, log that separately.",yesLabel:"Stop",onYes:()=>{
        const updated=periods.map(p=>p.id!==activePeriodId?p:{...p,removedFixedRestDates:[...(p.removedFixedRestDates||[]),date]});
        persist(updated,activePeriodId); setConfirm(null);
      }});
      return;
    }
    setConfirm({msg:"Remove this day off record?",yesLabel:"Remove",onYes:()=>{
      const updated=periods.map(p=>p.id!==activePeriodId?p:{...p,daysOff:(p.daysOff||[]).filter(d=>d.id!==did)});
      persist(updated,activePeriodId); setConfirm(null);
    }});
  }

  function startNewPeriod() {
    const currentEnd = addDays(activePeriod.startDate,34);
    const nextStart = addDays(activePeriod.startDate,35);
    setConfirm({
      msg:`Start a new 5-week period beginning ${fmtShort(nextStart)}? The period ending ${fmtShort(currentEnd)} will be archived.`,
      yesLabel:"Start New Period", danger:false,
      onYes:()=>{
        const np={id:uid(),startDate:nextStart,shifts:[],daysOff:[],createdAt:new Date().toISOString()};
        const updated=periods.map(p=>p.id===activePeriodId?{...p,archived:true}:p);
        persist([...updated,np],np.id); setConfirm(null); setArchiveViewId(null); setScreen("home");
      }
    });
  }

  if (session === undefined) {
    return <div style={{ background: BG, minHeight: "100vh" }} />; // brief blank frame while session check resolves
  }
  if (passwordRecovery) {
    return (
      <Suspense fallback={<div style={{ background: BG, minHeight: "100vh" }} />}>
        <ResetPasswordScreen supabase={supabase} onDone={() => setPasswordRecovery(false)} />
      </Suspense>
    );
  }
  if (session === null) {
    return (
      <Suspense fallback={<div style={{ background: BG, minHeight: "100vh" }} />}>
        <AuthScreen supabase={supabase} />
      </Suspense>
    );
  }

  if (driverGarage === undefined) {
    return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:BG}}><div style={{animation:"pulse 1.4s ease-in-out infinite"}}><BusLogo size={56}/></div><style>{`@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style></div>;
  }
  if (driverGarage && !hasLiveRoster(driverGarage)) {
    return <GarageComingSoonScreen garage={driverGarage} onSignOut={()=>signOut(supabase)}/>;
  }

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:BG}}><div style={{animation:"pulse 1.4s ease-in-out infinite"}}><BusLogo size={56}/></div><style>{`@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style></div>;
  if(loadCorrupted) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:BG,padding:24,textAlign:"center"}}>
      <div style={{marginBottom:20}}><BusLogo size={56}/></div>
      <p style={{color:TEXT,fontSize:17,fontWeight:700,margin:"0 0 10px"}}>We couldn't read your saved data</p>
      <p style={{color:MUTED,fontSize:14,margin:"0 0 24px",maxWidth:320,lineHeight:1.6}}>The data stored on this device looks damaged and can't be opened. If you have an exported backup file, you can restore it from Settings after continuing.</p>
      <button onClick={()=>{setLoadCorrupted(false);setLoading(false);}} style={{...btnStyle,maxWidth:280}}>Continue</button>
    </div>
  );
  if(!termsAccepted) return <TermsScreen onAccept={acceptTerms}/>;
  if(showWhatsNew) return <WhatsNewScreen onDone={dismissWhatsNew} onSkipTour={skipTourFromWhatsNew}/>;
  if(!activePeriodId||!activePeriod) return <SetupScreen onCreate={createPeriod}/>;

  const archivePeriod=periods.find(p=>p.id===archiveViewId);

  if(screen==="alerts") return <RouteAlertsScreen alerts={routeAlerts} onBack={()=>setScreen("home")}/>;

  if(screen==="archive"&&archiveViewId&&archivePeriod) return (
    <div style={{background:BG,minHeight:"100vh"}}>
      <div style={{padding:"20px 16px 0"}}>
        <button onClick={()=>setArchiveViewId(null)} style={{background:"none",border:"none",color:ACCENT,fontSize:20,cursor:"pointer"}}>← Back</button>
      </div>
      <PeriodScreen period={archivePeriod} onEdit={()=>{}} onDelete={()=>{}} onEditDayOff={()=>{}} onDeleteDayOff={()=>{}} readOnly/>
    </div>
  );

  return (
    <div style={{background:BG,minHeight:"100vh"}}>
      {screen==="log"&&<LogScreen period={activePeriod} editShift={editShift} lookupDuty={lookupDuty} initialDate={logInitDate} initialRestDay={logInitRestDay} alerts={routeAlerts}
        onSave={saveShift} onCancel={()=>{setEditShift(null);setLookupDuty(null);setLogInitDate(null);setLogInitRestDay(false);setScreen(editShift?"period":lookupDuty?"lookup":"home");}}
        onOpenSettings={()=>setShowSettings(true)}/>}
      {screen==="dayoff"&&<LogDayOffScreen periods={periods} editDayOff={editDayOff}
        onSave={saveDayOff} onCancel={()=>{setEditDayOff(null);setScreen(editDayOff?"period":dayOffFrom);}}
        onOpenSettings={()=>setShowSettings(true)}/>}
      {screen==="lookup"&&<DutyLookup alerts={routeAlerts} onLogShift={(d,dt,date)=>{setLookupDuty({d,dt,date});setScreen("log");}} onOpenSettings={()=>setShowSettings(true)}/>}
      {screen==="home"&&<HomeScreen period={activePeriod} periods={periods}
        alerts={routeAlerts}
        onViewAlerts={()=>setScreen("alerts")}
        driverFirstName={driverFirstName}
        onLog={()=>{setEditShift(null);setLogInitDate(null);setLogInitRestDay(false);setScreen("log");}}
        onLogDate={(date,opts)=>{setEditShift(null);setLookupDuty(null);setLogInitDate(date);setLogInitRestDay(!!opts?.isRestDay);setScreen("log");}}
        onGoWeek={i=>{setOpenWeek(i);setScreen("period");}}
        onOpenSettings={()=>setShowSettings(true)}/>}
      {screen==="period"&&<PeriodScreen period={activePeriod} initWeek={openWeek}
        onEdit={s=>{setEditShift(s);setScreen("log");}}
        onDelete={deleteShift}
        onEditDayOff={d=>{setEditDayOff(d);setDayOffFrom("period");setScreen("dayoff");}}
        onDeleteDayOff={deleteDayOff}
        onViewArchive={()=>setScreen("archive")}
        onEndPeriod={startNewPeriod}
        onViewFAQ={cat=>setViewingFAQ(cat)}
        onOpenSettings={()=>setShowSettings(true)}/>}
      {screen==="leave"&&<LeaveScreen periods={periods} leaveSettings={leaveSettings} onLogDayOff={()=>{setEditDayOff(null);setDayOffFrom("leave");setScreen("dayoff");}}
        onViewFAQ={cat=>setViewingFAQ(cat)}
        onOpenSettings={()=>setShowSettings(true)}/>}
      {screen==="archive"&&<ArchiveScreen periods={periods} activePeriodId={activePeriodId}
        onStartNew={startNewPeriod} onView={id=>setArchiveViewId(id)}
        onOpenSettings={()=>setShowSettings(true)}/>}
      <BottomNav active={screen==="log"?"log":["archive"].includes(screen)?"leave":screen} onChange={tab=>{
        // Navigating away from an in-progress shift/day-off edit discards it,
        // same as that screen's own Cancel — otherwise stale editShift/
        // editDayOff state would resurface next time Log opens.
        setEditShift(null);setLookupDuty(null);setLogInitDate(null);setLogInitRestDay(false);setEditDayOff(null);
        if(tab==="period")setOpenWeek(null);
        setScreen(tab);
      }}/>
      {confirm&&<ConfirmDialog msg={confirm.msg} yesLabel={confirm.yesLabel} danger={confirm.danger!==false} onYes={confirm.onYes} onNo={()=>setConfirm(null)}/>}
      {showTour&&<TourOverlay onDone={dismissTour}/>}
      {showSettings && activePeriod && (
        <SettingsPanel period={activePeriod} onClose={()=>setShowSettings(false)}
          onThemeChange={handleThemeChange} leaveSettings={leaveSettings} onLeaveSettingsChange={handleLeaveSettingsChange}
          onReplayTour={()=>{setShowSettings(false);setShowTour(true);}}
          onViewTerms={()=>{setShowSettings(false);setViewingTerms(true);}}
          onViewFAQ={()=>{setShowSettings(false);setViewingFAQ("");}}
          onEditStartDate={editActivePeriodStartDate}
          driverGarage={driverGarage} onChangeGarage={handleChangeGarage}
          driverFirstName={driverFirstName} onChangeFirstName={handleChangeFirstName}
          onSendFeedback={()=>setConfirmFeedback(true)}/>
      )}
      {confirmFeedback && (
        <ConfirmDialog msg="This opens a feedback form in a new tab, outside the app. Continue?" yesLabel="Continue" danger={false}
          onYes={()=>{setConfirmFeedback(false);window.open("https://docs.google.com/forms/d/e/1FAIpQLScgZEIoRM7xqkOpSyVcDQl23fbDJ_UTq99sF0c4mgta5bwrUQ/viewform?usp=header","_blank");}}
          onNo={()=>setConfirmFeedback(false)}/>
      )}
      {viewingTerms && (
        <div style={{position:"fixed",inset:0,zIndex:250,background:BG}}>
          <TermsScreen readOnly onClose={()=>setViewingTerms(false)}/>
        </div>
      )}
      {viewingFAQ !== null && (
        <div style={{position:"fixed",inset:0,zIndex:250,background:BG}}>
          <FAQScreen initialCategory={viewingFAQ} onClose={()=>setViewingFAQ(null)}/>
        </div>
      )}
      {saveError && (
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:400,background:DANGER,color:"#fff",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,paddingTop:"calc(12px + env(safe-area-inset-top,0px))"}}>
          <span style={{fontSize:13,fontWeight:600,flex:1}}>Couldn't save — your last change may not have stuck.</span>
          <button onClick={()=>persist(periods,activePeriodId)} style={{background:"#fff",color:DANGER,border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:800,cursor:"pointer",flexShrink:0}}>Try again</button>
          <button onClick={()=>setSaveError(false)} style={{background:"none",border:"none",color:"#fff",fontSize:18,cursor:"pointer",padding:"0 2px",lineHeight:1,flexShrink:0}}>×</button>
        </div>
      )}
    </div>
  );
}
