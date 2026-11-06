import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { WeekStrip, dayStatus, WEEKS_BACK, weeksForward } from "./WeekStrip.jsx";
import { HomeScreen } from "../screens/HomeScreen.jsx";
import { today, sundayOf, addDays } from "../lib/dutyMath.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function render(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(element); });
  return { container, unmount: () => act(() => { root.unmount(); container.remove(); }) };
}
let mounted;
afterEach(() => { mounted?.unmount(); mounted = null; document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove()); });

const t = today();
const start = sundayOf(t);
const allDays = Array.from({ length: 35 }, (_, i) => addDays(start, i));
const shift = (date, over = {}) => ({ id: "s" + date, date, zone: "Zone 1", roster: "SZ1/01", duty: "005001", reportTime: "05:40", signOffTime: "13:55", workHours: 7.5, ...over });
const period = (shifts = [], daysOff = []) => ({ id: "p1", startDate: start, createdAt: "2026-01-01T00:00:00Z", shifts, daysOff, removedFixedRestDates: allDays });

describe("dayStatus (traffic light)", () => {
  it("green when logged, red when today/past and empty, yellow when future and empty", () => {
    expect(dayStatus({ status: "shift" }, "2026-11-01", "2026-11-06")).toBe("logged");
    expect(dayStatus({ status: "dayoff", dayOff: { type: "Annual Leave" } }, "2026-11-20", "2026-11-06")).toBe("logged");
    expect(dayStatus({ status: "dayoff", dayOff: { type: "Rest Day" } }, "2026-11-03", "2026-11-06")).toBe("rest");
    expect(dayStatus({ status: "dayoff", dayOff: { type: "Rest Day", fixed: true } }, "2026-11-20", "2026-11-06")).toBe("rest");
    expect(dayStatus({ status: "unlogged" }, "2026-11-06", "2026-11-06")).toBe("missed");
    expect(dayStatus({ status: "unlogged" }, "2026-11-05", "2026-11-06")).toBe("missed");
    expect(dayStatus({ status: "unlogged" }, "2026-11-07", "2026-11-06")).toBe("upcoming");
  });
});

describe("WeekStrip", () => {
  it("reaches to the end of the next period (as far as you can log)", () => {
    // Period starting this Sunday: next period ends 69 days later, 9 weeks on.
    expect(weeksForward([period()], "p1", t)).toBe(9);
    expect(weeksForward([], "x", t)).toBe(3);
    const p = period([shift(t)]);
    mounted = render(<WeekStrip periods={[p]} activePeriodId="p1" todayDate={t} onSelect={() => {}}/>);
    const weeks = mounted.container.querySelectorAll("[data-week]");
    expect(weeks).toHaveLength(WEEKS_BACK + 1 + 9);
    expect(mounted.container.querySelector(`[data-date="${addDays(start, 69)}"]`)).toBeTruthy();
  });

  it("shows Sun–Sat weeks from 2 back, with today's date and status", () => {
    const p = period([shift(t)]);
    mounted = render(<WeekStrip periods={[p]} activePeriodId="p1" todayDate={t} onSelect={() => {}}/>);
    const weeks = mounted.container.querySelectorAll("[data-week]");
    expect(weeks[WEEKS_BACK].getAttribute("data-week")).toBe(start);
    expect(weeks[0].getAttribute("data-week")).toBe(addDays(start, -14));
    const todayBtn = mounted.container.querySelector(`[data-date="${t}"]`);
    expect(todayBtn.getAttribute("data-status")).toBe("logged");
    expect(todayBtn.textContent).toContain(String(Number(t.slice(8, 10))));
    expect(mounted.container.querySelector(`[data-date="${addDays(start, 21)}"]`).getAttribute("data-status")).toBe("upcoming");
    expect(mounted.container.textContent).toContain("This week");
  });
});

describe("Home week strip behaviour", () => {
  const noop = () => {};
  const props = (p, over = {}) => ({ period: p, periods: [p], alerts: [], onViewAlerts: noop, driverFirstName: "Phil", userId: null,
    onLogDate: noop, onGoWeek: noop, justRolledPeriod: null, onDismissRolloverBanner: noop, onOpenSettings: noop, ...over });

  it("the old Log a Shift button and Upcoming carousel are gone", () => {
    mounted = render(<HomeScreen {...props(period())}/>);
    expect(mounted.container.textContent).not.toContain("+ Log a Shift");
    expect(mounted.container.textContent).not.toContain("Upcoming");
  });

  it("tapping an unlogged day opens Log for that date", () => {
    let logged = null;
    const future = addDays(start, 10);
    mounted = render(<HomeScreen {...props(period(), { onLogDate: (d) => { logged = d; } })}/>);
    act(() => { mounted.container.querySelector(`[data-date="${future}"]`).click(); });
    expect(logged).toBe(future);
  });

  it("tapping a logged duty opens its full card; Edit duty edits that shift", () => {
    let edited = null;
    const d = addDays(start, 2);
    mounted = render(<HomeScreen {...props(period([shift(d, { roster: "SZ1/15X" })]), { onEditShift: (s) => { edited = s; } })}/>);
    act(() => { mounted.container.querySelector(`[data-date="${d}"]`).click(); });
    const sheet = document.querySelector('[role="dialog"]');
    expect(sheet.textContent).toContain("Z1/15X");
    expect(sheet.textContent).toContain("Report");
    act(() => { [...sheet.querySelectorAll("button")].find((b) => b.textContent === "Edit duty").click(); });
    expect(edited?.date).toBe(d);
  });

  it("a logged rest day offers to log it as worked, and Edit for a logged day off", () => {
    let logged = null, editedOff = null;
    const d = addDays(start, 3);
    mounted = render(<HomeScreen {...props(period([], [{ id: "r1", date: d, type: "Rest Day" }]), {
      onLogDate: (date, o) => { logged = { date, o }; }, onEditDayOff: (x) => { editedOff = x; } })}/>);
    act(() => { mounted.container.querySelector(`[data-date="${d}"]`).click(); });
    const sheet = document.querySelector('[role="dialog"]');
    expect(sheet.textContent).toContain("Rest Day");
    act(() => { [...sheet.querySelectorAll("button")].find((b) => b.textContent === "Edit").click(); });
    expect(editedOff?.id).toBe("r1");
    act(() => { mounted.container.querySelector(`[data-date="${d}"]`).click(); });
    act(() => { [...document.querySelector('[role="dialog"]').querySelectorAll("button")].find((b) => /Working this rest day/.test(b.textContent)).click(); });
    expect(logged).toEqual({ date: d, o: { isRestDay: true } });
  });
});
