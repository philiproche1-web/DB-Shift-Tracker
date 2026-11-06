import { describe, it, expect, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { AchievementPopup, POPUP_MS } from "./AchievementPopup.jsx";
import { AchievementsScreen } from "../screens/AchievementsScreen.jsx";
import { HomeScreen } from "../screens/HomeScreen.jsx";
import { badgeRows, buildContext } from "../lib/achievements.js";
import { today, sundayOf } from "../lib/dutyMath.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function render(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(element); });
  return { container, rerender: (el) => act(() => root.render(el)), unmount: () => act(() => { root.unmount(); container.remove(); }) };
}

let mounted;
afterEach(() => { mounted?.unmount(); mounted = null; vi.useRealTimers(); });

describe("AchievementPopup", () => {
  it("shows a badge's name and joke and closes itself after POPUP_MS", () => {
    vi.useFakeTimers();
    let closed = 0;
    mounted = render(<AchievementPopup item={{ kind: "badge", key: "night_owl" }} onClose={() => closed++}/>);
    expect(mounted.container.textContent).toContain("Night Owl");
    expect(mounted.container.textContent).toContain("depot cat");
    act(() => { vi.advanceTimersByTime(POPUP_MS - 10); });
    expect(closed).toBe(0);
    act(() => { vi.advanceTimersByTime(20); });
    expect(closed).toBe(1);
  });

  it("does not restart its timer when the parent re-renders with a new onClose", () => {
    vi.useFakeTimers();
    let closed = 0;
    const item = { kind: "badge", key: "duties:1" };
    mounted = render(<AchievementPopup item={item} onClose={() => closed++}/>);
    act(() => { vi.advanceTimersByTime(POPUP_MS / 2); });
    mounted.rerender(<AchievementPopup item={item} onClose={() => closed++}/>);
    act(() => { vi.advanceTimersByTime(POPUP_MS / 2 + 10); });
    expect(closed).toBe(1);
  });

  it("the welcome summary stays up and its button opens the page", () => {
    vi.useFakeTimers();
    let closed = 0, opened = 0;
    mounted = render(<AchievementPopup item={{ kind: "summary", count: 9, firstRun: true }} onClose={() => closed++} onOpenPage={() => opened++}/>);
    expect(mounted.container.textContent).toContain("You've already earned 9 badges");
    act(() => { vi.advanceTimersByTime(POPUP_MS * 3); });
    expect(closed).toBe(0);
    act(() => { [...mounted.container.querySelectorAll("button")].find((b) => b.textContent === "See your badges").click(); });
    expect(closed).toBe(1);
    expect(opened).toBe(1);
  });
});

describe("AchievementsScreen", () => {
  it("shows earned/total, hides secret badges, and shows progress on locked ones", () => {
    const t = today();
    const ctx = buildContext({ periods: [], usage: { lookups: 3 }, zones: ["Zone 1"], today: t, leaveSettings: { annualTotal: 20 } });
    const rows = badgeRows(ctx, { "duty_detective:1": { at: t } });
    mounted = render(<AchievementsScreen rows={rows} onBack={() => {}}/>);
    expect(mounted.container.textContent).toContain(`1 of ${rows.length} earned`);
    const joker = mounted.container.querySelector('[data-badge="joker"]');
    expect(joker.textContent).toContain("Secret badge");
    expect(joker.textContent).not.toContain("Joker");
    expect(mounted.container.querySelector('[data-badge="duty_detective"]').textContent).toContain("3 / 25");
  });
});

describe("HomeScreen new-badge banner", () => {
  const t = today();
  const period = { id: "p1", startDate: sundayOf(t), createdAt: "2026-01-01T00:00:00Z", shifts: [], daysOff: [], removedFixedRestDates: [t] };
  const props = { period, periods: [period], alerts: [], onViewAlerts: () => {}, driverFirstName: "Phil", userId: null, onLog: () => {}, onLogDate: () => {},
    onGoWeek: () => {}, justRolledPeriod: null, onDismissRolloverBanner: () => {}, onOpenSettings: () => {} };
  it("shows today's newest badge and opens the page on tap", () => {
    let opened = 0;
    mounted = render(<HomeScreen {...props} todayBadges={["first_sick", "night_owl"]} onOpenAchievements={() => opened++}/>);
    const btn = mounted.container.querySelector('[aria-label="New badge today: Night Owl"]');
    expect(btn.textContent).toContain("+1 more");
    act(() => { btn.click(); });
    expect(opened).toBe(1);
  });
  it("shows nothing with no badges today", () => {
    mounted = render(<HomeScreen {...props}/>);
    expect(mounted.container.textContent).not.toContain("New badge today");
  });
});
