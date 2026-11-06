import { describe, it, expect, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { AchievementPopup } from "./AchievementPopup.jsx";
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
  it("shows the badge with a close X and stays up until closed", () => {
    vi.useFakeTimers();
    let closed = 0;
    mounted = render(<AchievementPopup item={{ key: "night_owl", extra: 0, firstRun: false }} onClose={() => closed++}/>);
    expect(mounted.container.textContent).toContain("Night Owl");
    expect(mounted.container.textContent).toContain("Settings › Achievements");
    act(() => { vi.advanceTimersByTime(60000); });
    expect(closed).toBe(0);
    act(() => { mounted.container.querySelector('[aria-label="Close"]').click(); });
    expect(closed).toBe(1);
  });

  it("with others waiting, says how many and links to the page", () => {
    let closed = 0, opened = 0;
    mounted = render(<AchievementPopup item={{ key: "duties:10", extra: 17, firstRun: true }} onClose={() => closed++} onOpenPage={() => opened++}/>);
    const more = [...mounted.container.querySelectorAll("button")].find((b) => b.textContent.includes("+17 more"));
    expect(more).toBeTruthy();
    act(() => { more.click(); });
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
    mounted = render(<HomeScreen {...props} todayBadges={{ keys: ["first_sick", "night_owl"], retroCount: 0 }} onOpenAchievements={() => opened++}/>);
    const btn = mounted.container.querySelector('[aria-label="New badge today: Night Owl"]');
    expect(btn.textContent).toContain("+1 more");
    act(() => { btn.click(); });
    expect(opened).toBe(1);
  });
  it("shows the first-run batch as one 'badges earned' banner", () => {
    mounted = render(<HomeScreen {...props} todayBadges={{ keys: [], retroCount: 13 }} onOpenAchievements={() => {}}/>);
    expect(mounted.container.querySelector('[aria-label="13 badges unlocked today"]')).toBeTruthy();
  });
  it("shows nothing with no badges today", () => {
    mounted = render(<HomeScreen {...props}/>);
    expect(mounted.container.textContent).not.toContain("New badge today");
  });
});

describe("Achievements page layout and tour (Phil 2026-11-06)", () => {
  it("each category is its own section with a count, badges in a swipe row", () => {
    const t = today();
    const ctx = buildContext({ periods: [], usage: {}, zones: ["Zone 1"], today: t, leaveSettings: { annualTotal: 20 } });
    mounted = render(<AchievementsScreen rows={badgeRows(ctx, {})} onBack={() => {}}/>);
    const ids = [...mounted.container.querySelectorAll("[data-category]")].map((s) => s.getAttribute("data-category"));
    expect(ids).toEqual(["duties", "routes", "leave", "covered", "app"]);
    const routes = mounted.container.querySelector('[data-category="routes"]');
    expect(routes.querySelector("h2").textContent).toBe("Routes");
    expect(routes.textContent).toContain("0 / 12");
    expect(routes.querySelector('[role="list"]').style.overflowX).toBe("auto");
  });
  it("the tour has a swapping slide", async () => {
    const { TOUR_SLIDES } = await import("../screens/TourOverlay.jsx");
    expect(TOUR_SLIDES.some((s) => s.title === "Swap in Seconds" && /WhatsApp/.test(s.body))).toBe(true);
  });
});
