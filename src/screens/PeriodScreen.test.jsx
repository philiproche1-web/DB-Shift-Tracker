import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { PeriodScreen } from "./PeriodScreen.jsx";
import { LogScreen } from "./LogScreen.jsx";
import { alertsForTodaysDuty } from "../lib/routeAlerts.js";
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
afterEach(() => { mounted?.unmount(); mounted = null; });
const noop = () => {};
const follows = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const findText = (c, re) => [...c.querySelectorAll("p,span,button")].find((e) => re.test(e.textContent));

describe("PeriodScreen layout (Phil 2026-11-06)", () => {
  // Start the period two weeks back so "this week" is week 3, not week 1.
  const start = addDays(sundayOf(today()), -14);
  const period = { id: "p1", startDate: start, shifts: [], daysOff: [], removedFixedRestDates: Array.from({ length: 35 }, (_, i) => addDays(start, i)) };

  it("shows the current week first, then the other weeks, then totals, archive and FAQ", () => {
    mounted = render(<PeriodScreen period={period} onEdit={noop} onDelete={noop} onEditDayOff={noop} onDeleteDayOff={noop} onViewArchive={noop} onViewFAQ={noop} onOpenSettings={noop}/>);
    const c = mounted.container;
    const weekLabels = [...c.querySelectorAll("p")].filter((p) => /^Week \d/.test(p.textContent)).map((p) => p.textContent);
    expect(weekLabels[0]).toBe("Week 3 · This week");
    expect(weekLabels.slice(1)).toEqual(["Week 1", "Week 2", "Week 4", "Week 5"]);
    const other = findText(c, /^Other weeks$/);
    const week5 = [...c.querySelectorAll("p")].find((p) => p.textContent === "Week 5");
    const total = findText(c, /^Total Hours/);
    const archive = findText(c, /^View Period Archive$/);
    const faq = findText(c, /Questions about your hours/);
    expect(follows(findText(c, /This week/), other)).toBe(true);
    expect(follows(week5, total)).toBe(true);
    expect(follows(total, archive)).toBe(true);
    expect(follows(archive, faq)).toBe(true);
  });

  it("only the current week is open", () => {
    mounted = render(<PeriodScreen period={period} onEdit={noop} onDelete={noop} onEditDayOff={noop} onDeleteDayOff={noop} onViewArchive={noop} onOpenSettings={noop}/>);
    const totals = [...mounted.container.querySelectorAll("span")].filter((s) => /^Week \d Total$/.test(s.textContent)).map((s) => s.textContent);
    expect(totals).toEqual(["Week 3 Total"]);
  });

  it("archived periods keep plain week order", () => {
    mounted = render(<PeriodScreen period={period} readOnly onEdit={noop} onDelete={noop} onEditDayOff={noop} onDeleteDayOff={noop}/>);
    const weekLabels = [...mounted.container.querySelectorAll("p")].filter((p) => /^Week \d/.test(p.textContent)).map((p) => p.textContent);
    expect(weekLabels).toEqual(["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"]);
    expect(findText(mounted.container, /^Other weeks$/)).toBeUndefined();
  });
});

describe("diversions", () => {
  const live = (id, zone) => ({ id, zone, starts_on: "2026-01-01", ends_on: null, type: "diversion", description: "x" });
  it("alertsForTodaysDuty: none without a duty today; same zone + garage-wide with one", () => {
    const alerts = [live("a", "Zone 1"), live("b", "Skerries"), live("c", null)];
    expect(alertsForTodaysDuty(alerts, null)).toEqual([]);
    expect(alertsForTodaysDuty(alerts, { zone: "Zone 1" }).map((a) => a.id)).toEqual(["a", "c"]);
  });
  it("Log a Shift never shows a diversion card", () => {
    const start = sundayOf(today());
    const period = { id: "p1", startDate: start, shifts: [], daysOff: [] };
    mounted = render(<LogScreen period={period} editShift={null} lookupDuty={null} initialDate={today()} initialRestDay={false}
      alerts={[live("a", "Zone 1")]} onSave={noop} onCancel={noop} onOpenSettings={noop}/>);
    expect(mounted.container.textContent).not.toMatch(/Diversion/i);
  });
});
