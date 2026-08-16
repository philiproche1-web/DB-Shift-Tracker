import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { supabase } from "./lib/supabaseClient.js";
import { signOut, getSession, onAuthStateChange } from "./lib/auth.js";
import { syncAll, migrateLocalDataIfNeeded, hasPendingSync } from "./lib/sync.js";
import { hasLiveRoster } from "./lib/garages.js";
import { fetchRouteAlerts } from "./lib/routeAlerts.js";
import { isCalendarSunday, uid, today } from "./lib/dutyMath.js";
import { loadRosterData, applyRosterData, setCustomRestConfig, rollPeriodsForward, FIXED_REST_ID_PREFIX } from "./lib/roster.js";
import {
  applyShiftSave, applyDayOffSave, applyShiftDelete,
  applyDayOffDelete, applyFixedRestDayRemoval,
} from "./lib/periodMutations.js";
import { BG, CARD, BORDER, TEXT, MUTED, ACCENT, DANGER, applyTheme, btnStyle } from "./lib/theme.js";
import {
  loadData, writeDataLocally, saveData, APP_VERSION, WHATS_NEW,
  loadLeaveSettings, writeLeaveSettingsLocally, saveLeaveSettings,
  loadSettings, writeSettingsLocally,
} from "./lib/persistence.js";
import { BusLogo, BottomNav, ConfirmDialog, useModalA11y } from "./components/shared.jsx";
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
  const [_themeKey, setThemeKey] = useState(0); // value unused by design — only the setter forces theme re-renders
  const [leaveSettings, setLeaveSettings] = useState(loadLeaveSettings);
  const [dayOffFrom, setDayOffFrom] = useState("home"); // tracks where to return after logging day off
  const [viewingTerms, setViewingTerms] = useState(false);
  const [viewingFAQ, setViewingFAQ] = useState(null); // null = closed, "" | category key = open
  const [saveError, setSaveError] = useState(false);
  const [loadCorrupted, setLoadCorrupted] = useState(false);
  const [_rosterVersion, setRosterVersion] = useState(0); // value unused by design — only the setter forces a re-render on fresher roster data
  const [logInitDate, setLogInitDate] = useState(null);
  const [logInitRestDay, setLogInitRestDay] = useState(false);
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = signed out
  const [syncedOnce, setSyncedOnce] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [driverGarage, setDriverGarage] = useState(undefined); // undefined = not fetched yet, null = fetch failed
  const [driverFirstName, setDriverFirstName] = useState(null);
  const [driverCustomRestDays, setDriverCustomRestDays] = useState({ enabled: false, weekdays: [], since: null });
  const [routeAlerts, setRouteAlerts] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmFeedback, setConfirmFeedback] = useState(false);
  const [justRolledPeriod, setJustRolledPeriod] = useState(null);
  const [pendingSync, setPendingSync] = useState(false);
  const [sessionCheckTimedOut, setSessionCheckTimedOut] = useState(false);
  const [profileFetchError, setProfileFetchError] = useState(false);

  const activePeriod = periods.find(p=>p.id===activePeriodId);

  // Memoized rather than rebuilt every render: the sync effect below takes
  // this as a dependency, and lint correctly flagged that dependency as
  // missing (suppressed via the empty dep array) — a new tableConfigs
  // identity every render is a latent stale-closure risk for whoever edits
  // that effect next. Safe with an empty dep array: every closure here only
  // captures useState setters, which React guarantees are stable across
  // renders — the callbacks' actual behaviour never changes, only their
  // object identity would have, without this.
  const tableConfigs = useMemo(() => [
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
  ], []);

  useEffect(() => {
    // Bad signal is the normal case for this user, not an edge case — a
    // hung getSession() call used to leave the driver staring at a blank
    // frame indefinitely, indistinguishable from a crash, no spinner, no
    // way out short of force-closing the app. 8s is generous for a real
    // network round trip but short enough that a driver waiting on it
    // notices something's actually wrong rather than assuming it's just
    // slow.
    const timeout = setTimeout(() => setSessionCheckTimedOut(true), 8000);
    getSession(supabase).then(({ data }) => { clearTimeout(timeout); setSession(data.session ?? null); });
    const { data: { subscription } } = onAuthStateChange(supabase, (newSession, event) => {
      clearTimeout(timeout);
      setSession(newSession);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });
    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    setSyncedOnce(false);
    if (!session) return;
    let cancelled = false;
    async function runInitialSync() {
      await migrateLocalDataIfNeeded(supabase, session.user.id, tableConfigs);
      if (cancelled) return;
      const results = await syncAll(supabase, session.user.id, tableConfigs);
      if (!cancelled && results.app_data?.ok) setSyncedOnce(true);
      if (!cancelled) setPendingSync(hasPendingSync());
    }
    runInitialSync();

    // Drives the "not yet synced" indicator: a driver logging a shift with
    // no signal sees it saved locally with nothing telling them it hasn't
    // reached their account — this is what closes that gap, updated after
    // every sync attempt regardless of whether it succeeded.
    function handleReconnect() {
      syncAll(supabase, session.user.id, tableConfigs).then(() => setPendingSync(hasPendingSync()));
    }
    function handleVisibilityChange() { if (document.visibilityState === "visible") handleReconnect(); }
    window.addEventListener("online", handleReconnect);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleReconnect);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session?.user?.id]);

  // Only attempt an automatic period rollover once the initial multi-device
  // sync has resolved — rolling forward a stale local copy and persisting it
  // immediately could win a last-write-wins race against a device that
  // already pushed newer shifts into the new period. rollPeriodsForward is
  // idempotent (a second call on its own output returns rolled:false), so
  // this is safe even if periods/activePeriodId update again after this
  // runs. See docs/superpowers/specs/2026-08-13-auto-period-rollover-design.md.
  useEffect(() => {
    if (!syncedOnce) return;
    try {
      const rolled = rollPeriodsForward(periods, activePeriodId);
      if (rolled.rolled) {
        persist(rolled.periods, rolled.activePeriodId);
        setJustRolledPeriod(rolled.periods.find(p => p.id === rolled.activePeriodId));
      }
    } catch (e) {
      console.error("Period rollover check failed:", e);
    }
  }, [syncedOnce]);

  useEffect(() => {
    if (!session) { setDriverGarage(undefined); setDriverFirstName(null); setCustomRestConfig(null); setProfileFetchError(false); return; }
    let cancelled = false;
    supabase.from("profiles")
      .select("garage, first_name, custom_rest_days_enabled, custom_rest_weekdays, custom_rest_days_since")
      .eq("id", session.user.id).single()
      .then(({ data, error }) => {
        if (cancelled) return;
        setProfileFetchError(!!error);
        if (error) {
          // Used to set driverGarage to null on any error — indistinguishable
          // from "this driver genuinely has no garage set", which falls
          // through hasLiveRoster's check and lands them in the main app
          // with route alerts silently gone and no explanation. Now this
          // branch leaves driverGarage/driverFirstName/custom rest days
          // completely untouched: on first load that means it correctly
          // stays undefined (render shows a retry screen below, not an
          // infinite spinner or a broken fallthrough); on a later
          // background refetch it means a transient failure can't wipe out
          // an already-known-good value the driver was relying on.
          return;
        }
        setDriverGarage(data?.garage ?? null);
        setDriverFirstName(data?.first_name ?? null);
        setCustomRestConfig(data);
        setDriverCustomRestDays({
          enabled: !!data?.custom_rest_days_enabled,
          weekdays: data?.custom_rest_weekdays || [],
          since: data?.custom_rest_days_since || null,
        });
      });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!driverGarage || !hasLiveRoster(driverGarage)) { setRouteAlerts([]); return; }
    let cancelled = false;
    fetchRouteAlerts(supabase, driverGarage).then((data) => { if (!cancelled) setRouteAlerts(data); });
    return () => { cancelled = true; };
  }, [driverGarage]);

  useEffect(() => {
    // Belt-and-braces alongside the direct pendingSync updates in persist()
    // and the sync effect above: those cover shifts/periods (the case that
    // actually prompted this — logging a shift with no signal looking
    // identical to one that reached the account), but leave_settings and
    // settings also go through the same dirty-flag mechanism via write
    // paths scattered across SettingsPanel and elsewhere that aren't
    // individually wired here. A cheap periodic localStorage read is far
    // simpler and more robust than hunting down every write site, at the
    // cost of up to 4s of lag before the indicator reacts — acceptable for
    // something a driver checks, not something time-critical.
    const interval = setInterval(() => setPendingSync(hasPendingSync()), 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(()=>{
    // Request persistent storage so browser doesn't evict data under pressure
    if(navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(()=>{});
    }
    // Apply saved theme on load
    const s = loadSettings();
    applyTheme(s.appearance, null);
    // Re-apply whenever the OS's own light/dark switches — without this, a
    // driver on "system" appearance whose phone auto-switches to dark at
    // sunset mid-shift sees no change until they fully restart the app.
    // Re-reads settings fresh each time (not the closed-over `s` above) so
    // this stays correct if the driver later changes their in-app appearance
    // choice; when that choice is explicit dark/light rather than "system",
    // applyTheme's own output doesn't depend on the OS query, so this is a
    // harmless no-op re-render in that case, not a wrong theme.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSchemeChange = () => applyTheme(loadSettings().appearance, () => setThemeKey(k => k + 1));
    media.addEventListener("change", handleSchemeChange);
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
    return () => media.removeEventListener("change", handleSchemeChange);
  },[]);

  function handleThemeChange(appearance) {
    applyTheme(appearance, ()=>setThemeKey(k=>k+1));
  }

  // Stable references (not inline arrows) because useModalA11y below takes
  // each as a dependency to know when to re-attach its keydown listener and
  // re-focus the dialog — an inline arrow would be a new function every
  // render, re-running that effect (and re-stealing focus from wherever the
  // driver's interacting inside the overlay) on every unrelated App
  // re-render, e.g. a background sync updating periods.
  const closeTerms = useCallback(() => setViewingTerms(false), []);
  const closeFAQ = useCallback(() => setViewingFAQ(null), []);
  const termsModalRef = useModalA11y(viewingTerms ? closeTerms : null);
  const faqModalRef = useModalA11y(viewingFAQ !== null ? closeFAQ : null);

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

  // Stamps `since` to today only on the OFF -> ON transition — editing the
  // weekday selection while already enabled must not reset it. See
  // docs/superpowers/specs/2026-08-13-custom-rest-days-design.md.
  async function handleChangeCustomRestDays(enabled, weekdays) {
    const since = (enabled && !driverCustomRestDays.enabled) ? today() : driverCustomRestDays.since;
    const { error } = await supabase.from("profiles").update({
      custom_rest_days_enabled: enabled,
      custom_rest_weekdays: weekdays,
      custom_rest_days_since: since,
    }).eq("id", session.user.id);
    if (!error) {
      const next = { enabled, weekdays, since };
      setDriverCustomRestDays(next);
      setCustomRestConfig({
        custom_rest_days_enabled: enabled,
        custom_rest_weekdays: weekdays,
        custom_rest_days_since: since,
      });
    }
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
    saveData({periods:ps,activePeriodId:aid}).then(ok=>{ setSaveError(!ok); setPendingSync(hasPendingSync()); });
  };

  function createPeriod(startDate) {
    const p={id:uid(),startDate,shifts:[],daysOff:[],createdAt:new Date().toISOString()};
    persist([...periods,p],p.id); setScreen("home");
  }

  function editActivePeriodStartDate(newDate) {
    if(!isCalendarSunday(newDate)) return;
    const updated=periods.map(p=>p.id!==activePeriodId?p:{...p,startDate:newDate});
    persist(updated,activePeriodId);
  }

  function saveShift(shiftOrArray, bankHolidayInLieuEntries) {
    // Mutation logic lives in lib/periodMutations.js so it can be tested
    // without React — see periodMutations.test.js. This function keeps only
    // persistence and navigation.
    const updated = applyShiftSave(periods, activePeriodId, shiftOrArray, bankHolidayInLieuEntries);
    persist(updated,activePeriodId); setEditShift(null); setLookupDuty(null); setLogInitDate(null); setLogInitRestDay(false); setScreen("home");
  }

  function saveDayOff(dayOffOrArray, replaceShiftIds, replaceDayOffIds) {
    // See periodMutations.js — that module owns the period-routing and
    // duplicate-guard rules, and periodMutations.test.js locks them.
    const updated = applyDayOffSave(periods, activePeriodId, dayOffOrArray, replaceShiftIds, replaceDayOffIds);
    persist(updated, activePeriodId);
    setEditDayOff(null);
    setScreen(dayOffFrom === "leave" ? "leave" : "period");
  }

  function deleteShift(sid) {
    setConfirm({msg:"Delete this shift? This can't be undone.",yesLabel:"Delete",onYes:()=>{
      persist(applyShiftDelete(periods, activePeriodId, sid), activePeriodId); setConfirm(null);
    }});
  }

  function deleteDayOff(did) {
    if (did.startsWith(FIXED_REST_ID_PREFIX)) {
      const date = did.slice(FIXED_REST_ID_PREFIX.length);
      setConfirm({msg:"Stop treating this date as an automatic rest day? If you're resting on a different day instead, log that separately.",yesLabel:"Stop",onYes:()=>{
        persist(applyFixedRestDayRemoval(periods, activePeriodId, date), activePeriodId); setConfirm(null);
      }});
      return;
    }
    setConfirm({msg:"Remove this day off record?",yesLabel:"Remove",onYes:()=>{
      persist(applyDayOffDelete(periods, did), activePeriodId); setConfirm(null);
    }});
  }

  if (session === undefined) {
    // Was a genuinely blank div — indistinguishable from a crash on bad
    // signal, this app's normal operating condition. Now the same pulsing
    // logo used by every other loading state in this file, and after
    // sessionCheckTimedOut a retry prompt instead of waiting forever.
    if (sessionCheckTimedOut) {
      return (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:BG,padding:24,textAlign:"center"}}>
          <div style={{marginBottom:20}}><BusLogo size={56}/></div>
          <p style={{color:TEXT,fontSize:"1.0625rem",fontWeight:700,margin:"0 0 10px"}}>Taking longer than usual</p>
          <p style={{color:MUTED,fontSize:"0.875rem",margin:"0 0 24px",maxWidth:320,lineHeight:1.6}}>Checking you're signed in is taking a while — this usually means a weak connection.</p>
          <button onClick={()=>window.location.reload()} style={{...btnStyle,maxWidth:280}}>Try again</button>
        </div>
      );
    }
    return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:BG}}><div style={{animation:"pulse 1.4s ease-in-out infinite"}}><BusLogo size={56}/></div><style>{`@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style></div>;
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
    // profileFetchError only reaches here when the fetch has never
    // succeeded at all (a failed background refetch after an earlier
    // success leaves driverGarage already set, so this branch isn't
    // reached for that case) — that used to silently proceed into the
    // main app with driverGarage forced to null, route alerts and garage
    // context just gone with nothing telling the driver why. Retry here
    // is a reload, same pattern as the session-check timeout above and
    // the corrupted-data screen below.
    if (profileFetchError) {
      return (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:BG,padding:24,textAlign:"center"}}>
          <div style={{marginBottom:20}}><BusLogo size={56}/></div>
          <p style={{color:TEXT,fontSize:"1.0625rem",fontWeight:700,margin:"0 0 10px"}}>Couldn't load your profile</p>
          <p style={{color:MUTED,fontSize:"0.875rem",margin:"0 0 24px",maxWidth:320,lineHeight:1.6}}>This usually means a weak connection. Your data is safe — just needs another try to load.</p>
          <button onClick={()=>window.location.reload()} style={{...btnStyle,maxWidth:280}}>Try again</button>
        </div>
      );
    }
    return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:BG}}><div style={{animation:"pulse 1.4s ease-in-out infinite"}}><BusLogo size={56}/></div><style>{`@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style></div>;
  }
  if (driverGarage && !hasLiveRoster(driverGarage)) {
    return <GarageComingSoonScreen garage={driverGarage} onSignOut={()=>signOut(supabase)}/>;
  }

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:BG}}><div style={{animation:"pulse 1.4s ease-in-out infinite"}}><BusLogo size={56}/></div><style>{`@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style></div>;
  if(loadCorrupted) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:BG,padding:24,textAlign:"center"}}>
      <div style={{marginBottom:20}}><BusLogo size={56}/></div>
      <p style={{color:TEXT,fontSize:"1.0625rem",fontWeight:700,margin:"0 0 10px"}}>We couldn't read your saved data</p>
      <p style={{color:MUTED,fontSize:"0.875rem",margin:"0 0 24px",maxWidth:320,lineHeight:1.6}}>The data stored on this device looks damaged and can't be opened. Your shifts and leave are also saved to your account — continue, then sign in on this device and they'll come back.</p>
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
        <button onClick={()=>setArchiveViewId(null)} style={{background:"none",border:"none",color:ACCENT,fontSize:"1.25rem",cursor:"pointer"}}>← Back</button>
      </div>
      <PeriodScreen period={archivePeriod} onEdit={()=>{}} onDelete={()=>{}} onEditDayOff={()=>{}} onDeleteDayOff={()=>{}} readOnly/>
    </div>
  );

  return (
    <div style={{background:BG,minHeight:"100vh"}}>
      {screen==="log"&&<LogScreen key={editShift?.id||"new"} period={activePeriod} editShift={editShift} lookupDuty={lookupDuty} initialDate={logInitDate} initialRestDay={logInitRestDay} alerts={routeAlerts}
        onSave={saveShift} onCancel={()=>{setEditShift(null);setLookupDuty(null);setLogInitDate(null);setLogInitRestDay(false);setScreen(editShift?"period":lookupDuty?"lookup":"home");}}
        onEditConflict={setEditShift}
        onOpenSettings={()=>setShowSettings(true)}/>}
      {screen==="dayoff"&&<LogDayOffScreen periods={periods} editDayOff={editDayOff}
        onSave={saveDayOff} onCancel={()=>{setEditDayOff(null);setScreen(dayOffFrom);}}
        onOpenSettings={()=>setShowSettings(true)}/>}
      {screen==="lookup"&&<DutyLookup alerts={routeAlerts} onLogShift={(d,dt,date)=>{setLookupDuty({d,dt,date});setScreen("log");}} onOpenSettings={()=>setShowSettings(true)}/>}
      {screen==="home"&&<HomeScreen period={activePeriod} periods={periods}
        alerts={routeAlerts}
        onViewAlerts={()=>setScreen("alerts")}
        driverFirstName={driverFirstName}
        userId={session?.user?.id}
        onLog={()=>{setEditShift(null);setLogInitDate(null);setLogInitRestDay(false);setScreen("log");}}
        onLogDate={(date,opts)=>{setEditShift(null);setLookupDuty(null);setLogInitDate(date);setLogInitRestDay(!!opts?.isRestDay);setScreen("log");}}
        onGoWeek={i=>{setOpenWeek(i);setScreen("period");}}
        justRolledPeriod={justRolledPeriod} onDismissRolloverBanner={()=>setJustRolledPeriod(null)}
        onOpenSettings={()=>setShowSettings(true)}/>}
      {screen==="period"&&<PeriodScreen period={activePeriod} initWeek={openWeek}
        onEdit={s=>{setEditShift(s);setScreen("log");}}
        onDelete={deleteShift}
        onEditDayOff={d=>{setEditDayOff(d);setDayOffFrom("period");setScreen("dayoff");}}
        onDeleteDayOff={deleteDayOff}
        onViewArchive={()=>setScreen("archive")}
        onViewFAQ={cat=>setViewingFAQ(cat)}
        onOpenSettings={()=>setShowSettings(true)}/>}
      {screen==="leave"&&<LeaveScreen periods={periods} leaveSettings={leaveSettings} onLogDayOff={()=>{setEditDayOff(null);setDayOffFrom("leave");setScreen("dayoff");}}
        onEditDayOff={d=>{setEditDayOff(d);setDayOffFrom("leave");setScreen("dayoff");}}
        onDeleteDayOff={deleteDayOff}
        onViewFAQ={cat=>setViewingFAQ(cat)}
        onOpenSettings={()=>setShowSettings(true)}/>}
      {screen==="archive"&&<ArchiveScreen periods={periods} activePeriodId={activePeriodId}
        onView={id=>setArchiveViewId(id)}
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
          driverCustomRestDays={driverCustomRestDays} onChangeCustomRestDays={handleChangeCustomRestDays}
          userId={session?.user?.id}
          onSendFeedback={()=>setConfirmFeedback(true)}/>
      )}
      {confirmFeedback && (
        <ConfirmDialog msg="This opens a feedback form in a new tab, outside the app. Continue?" yesLabel="Continue" danger={false}
          onYes={()=>{setConfirmFeedback(false);window.open("https://docs.google.com/forms/d/e/1FAIpQLScgZEIoRM7xqkOpSyVcDQl23fbDJ_UTq99sF0c4mgta5bwrUQ/viewform?usp=header","_blank");}}
          onNo={()=>setConfirmFeedback(false)}/>
      )}
      {viewingTerms && (
        <div ref={termsModalRef} role="dialog" aria-modal="true" aria-label="Terms" tabIndex={-1} style={{position:"fixed",inset:0,zIndex:250,background:BG,outline:"none"}}>
          <TermsScreen readOnly onClose={closeTerms}/>
        </div>
      )}
      {viewingFAQ !== null && (
        <div ref={faqModalRef} role="dialog" aria-modal="true" aria-label="FAQ" tabIndex={-1} style={{position:"fixed",inset:0,zIndex:250,background:BG,outline:"none"}}>
          <FAQScreen initialCategory={viewingFAQ} onClose={closeFAQ}/>
        </div>
      )}
      {/* Small, low-profile — this is often a normal transient state (a
          few seconds of weak signal), not an error, so it shouldn't read
          as alarming the way saveError's red banner correctly does for an
          actual write failure. Suppressed while saveError is showing so
          the two don't stack; a failed local write is the more urgent
          thing to surface in that moment. */}
      {pendingSync && !saveError && (
        <div style={{position:"fixed",bottom:74,left:"50%",transform:"translateX(-50%)",zIndex:150,background:CARD,border:`1px solid ${BORDER}`,borderRadius:999,padding:"6px 14px",display:"flex",alignItems:"center",gap:7,boxShadow:"0 4px 16px rgba(0,0,0,0.3)"}}>
          {/* Own scoped keyframe, not the "pulse" name used by the separate
              loading screens elsewhere in this file — those are only in the
              DOM while loading, so relying on their definition here (which
              renders during normal use, well after loading) would silently
              do nothing once they unmount. */}
          <style>{`@keyframes pendingSyncPulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style>
          <span style={{width:7,height:7,borderRadius:"50%",background:ACCENT,flexShrink:0,animation:"pendingSyncPulse 1.4s ease-in-out infinite"}}/>
          <span style={{fontSize:"0.71875rem",color:MUTED,fontWeight:600,whiteSpace:"nowrap"}}>Saved on this phone — not synced yet</span>
        </div>
      )}
      {saveError && (
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:400,background:DANGER,color:"#fff",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,paddingTop:"calc(12px + env(safe-area-inset-top,0px))"}}>
          <span style={{fontSize:"0.8125rem",fontWeight:600,flex:1}}>Couldn't save — your last change may not have stuck.</span>
          <button onClick={()=>persist(periods,activePeriodId)} style={{background:"#fff",color:DANGER,border:"none",borderRadius:8,padding:"6px 12px",fontSize:"0.75rem",fontWeight:800,cursor:"pointer",flexShrink:0}}>Try again</button>
          <button onClick={()=>setSaveError(false)} style={{background:"none",border:"none",color:"#fff",fontSize:"1.125rem",cursor:"pointer",padding:"0 2px",lineHeight:1,flexShrink:0}}>×</button>
        </div>
      )}
    </div>
  );
}
