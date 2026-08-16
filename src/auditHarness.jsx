// src/auditHarness.jsx
//
// TEMPORARY — built for docs/superpowers/specs/2026-08-16-font-scaling-design.md's
// visual-verification pass (see the plan's Task 7), same pattern as the
// 2026-08-14 audit's `audit.html` + `auditHarness.jsx`. Mounts every real
// screen with fixture data, bypassing the login wall, with a control bar to
// switch screens and simulate OS/browser text-size scaling. Deleted in
// Task 8 once verification is done — never shipped.
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { today, sundayOf, addDays } from "./lib/dutyMath.js";
import { HomeScreen } from "./screens/HomeScreen.jsx";
import { LogScreen } from "./screens/LogScreen.jsx";
import { LogDayOffScreen } from "./screens/LogDayOffScreen.jsx";
import { PeriodScreen } from "./screens/PeriodScreen.jsx";
import { LeaveScreen } from "./screens/LeaveScreen.jsx";
import { ArchiveScreen } from "./screens/ArchiveScreen.jsx";
import { DutyLookup } from "./screens/DutyLookup.jsx";
import { SettingsPanel } from "./screens/SettingsPanel.jsx";
import { SetupScreen } from "./screens/SetupScreen.jsx";
import { TermsScreen } from "./screens/TermsScreen.jsx";
import { FAQScreen } from "./screens/FAQScreen.jsx";
import { WhatsNewScreen } from "./screens/WhatsNewScreen.jsx";
import { TourOverlay } from "./screens/TourOverlay.jsx";
import { GarageComingSoonScreen } from "./screens/GarageComingSoonScreen.jsx";
import AuthScreen from "./screens/AuthScreen.jsx";
import ResetPasswordScreen from "./screens/ResetPasswordScreen.jsx";
import { BottomNav } from "./components/shared.jsx";

const noop = () => {};
const start = sundayOf(today());
const todayDate = today();

function shift(id, date, over = {}) {
  return {
    id, date, zone: "Zone 1", roster: "SZ1/01", duty: "005001", fixedType: null,
    reportTime: "05:40", signOffTime: "13:55", workHours: 7.5, reliefHours: 0.5,
    isSpare: false, isRestDay: false, overtimeHours: 0, overtimeNote: "", notes: "",
    ...over,
  };
}

const period = {
  id: "p1",
  startDate: start,
  createdAt: new Date("2026-01-01").toISOString(),
  shifts: [shift("s1", todayDate)],
  daysOff: [{ id: "d1", date: addDays(todayDate, 3), type: "Annual Leave" }],
  removedFixedRestDates: [todayDate],
};
const periods = [period];
const leaveSettings = { annualTotal: 20 };
const driverCustomRestDays = { enabled: false, weekdays: [], since: null };

const SCREENS = {
  Home: <HomeScreen period={period} periods={periods} alerts={[]} onViewAlerts={noop}
    driverFirstName="Phil" userId="test-user" onLog={noop} onLogDate={noop} onGoWeek={noop}
    justRolledPeriod={null} onDismissRolloverBanner={noop} onOpenSettings={noop} />,
  Log: <LogScreen period={period} editShift={null} lookupDuty={null} initialDate={null} initialRestDay={false}
    alerts={[]} onSave={noop} onCancel={noop} onEditConflict={noop} onOpenSettings={noop} />,
  LogDayOff: <LogDayOffScreen periods={periods} editDayOff={null} onSave={noop} onCancel={noop} onOpenSettings={noop} />,
  Period: <PeriodScreen period={period} onEdit={noop} onDelete={noop} onEditDayOff={noop} onDeleteDayOff={noop}
    onViewArchive={noop} onViewFAQ={noop} onOpenSettings={noop} />,
  Leave: <LeaveScreen periods={periods} leaveSettings={leaveSettings} onLogDayOff={noop} onEditDayOff={noop}
    onDeleteDayOff={noop} onViewFAQ={noop} onOpenSettings={noop} />,
  Archive: <ArchiveScreen periods={periods} activePeriodId="p1" onView={noop} onOpenSettings={noop} />,
  DutyLookup: <DutyLookup alerts={[]} onLogShift={noop} onOpenSettings={noop} />,
  Settings: <SettingsPanel period={period} onClose={noop} onThemeChange={noop} leaveSettings={leaveSettings}
    onLeaveSettingsChange={noop} onReplayTour={noop} onViewTerms={noop} onViewFAQ={noop} onEditStartDate={noop}
    driverGarage="Broadstone" onChangeGarage={noop} driverFirstName="Phil" onChangeFirstName={noop}
    driverCustomRestDays={driverCustomRestDays} onChangeCustomRestDays={noop} userId="test-user" onSendFeedback={noop} />,
  Setup: <SetupScreen onCreate={noop} />,
  Terms: <TermsScreen onAccept={noop} />,
  FAQ: <FAQScreen onClose={noop} initialCategory="" />,
  WhatsNew: <WhatsNewScreen onDone={noop} onSkipTour={noop} />,
  Tour: <TourOverlay onDone={noop} />,
  GarageComingSoon: <GarageComingSoonScreen garage="Phibsborough" onSignOut={noop} />,
  Auth: <AuthScreen supabase={{}} />,
  ResetPassword: <ResetPasswordScreen supabase={{}} onDone={noop} />,
};

function AuditHarness() {
  const [screenName, setScreenName] = useState(Object.keys(SCREENS)[0]);
  const [scale, setScale] = useState(100);

  // rem units are relative to the ROOT (<html>) font-size, not any ancestor
  // — this is what actually simulates an OS/browser text-size setting.
  // Setting fontSize on a wrapper div would do nothing to rem values.
  useEffect(() => {
    document.documentElement.style.fontSize = `${scale}%`;
    return () => { document.documentElement.style.fontSize = ""; };
  }, [scale]);

  return (
    <div>
      <div style={{
        position: "sticky", top: 0, zIndex: 9999, background: "#222", color: "#fff",
        padding: 10, display: "flex", gap: 12, alignItems: "center",
        fontFamily: "system-ui", fontSize: 14,
      }}>
        <label>Screen:{" "}
          <select value={screenName} onChange={(e) => setScreenName(e.target.value)}>
            {Object.keys(SCREENS).map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>OS text size:{" "}
          <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
            <option value={100}>100%</option>
            <option value={150}>150%</option>
            <option value={200}>200%</option>
          </select>
        </label>
      </div>
      {SCREENS[screenName]}
      {/* BottomNav is position:fixed in real usage (App.jsx renders it
          alongside every screen) — included here too so Task 7's sweep
          covers it, not just the screen bodies. */}
      <BottomNav active="home" onChange={noop} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<AuditHarness />);
