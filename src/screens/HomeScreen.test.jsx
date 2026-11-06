import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { HomeScreen, displayRoster } from "./HomeScreen.jsx";
import { today, sundayOf, addDays } from "../lib/dutyMath.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function render(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(element); });
  return { container, unmount: () => act(() => root.unmount()) };
}

const start = sundayOf(today());
const todayDate = today();
const noop = () => {};
const shift = (id, date, over = {}) => ({
  id, date, zone: "Zone 1", roster: "SZ1/01", duty: "005001", fixedType: null,
  reportTime: "05:40", signOffTime: "13:55", workHours: 7.5, reliefHours: 0.5,
  isSpare: false, isRestDay: false, overtimeHours: 0, overtimeNote: "", notes: "",
  ...over,
});

function basePeriod(over = {}) {
  return {
    id: "p1", startDate: start, createdAt: new Date("2026-01-01").toISOString(), shifts: [], daysOff: [],
    // Suppresses today's own automatic pattern-generated rest day by
    // default — without this, whether "today" is genuinely unlogged in
    // these fixtures depends on which real calendar weekday the suite
    // happens to run on (today() is the real date, and the fixed 5-week
    // pattern marks specific weekdays as automatic rest days). A test
    // exercising a real shift/day-off for today overrides shifts/daysOff
    // below anyway, which already independently skips the automatic
    // generation for a taken date — this default only changes anything
    // for the "genuinely nothing logged" cases, making them calendar-
    // independent instead of only passing by coincidence on some days.
    removedFixedRestDates: [todayDate],
    ...over,
  };
}
function homeProps(period) {
  return {
    period, periods: [period], alerts: [], onViewAlerts: noop,
    driverFirstName: "Phil", userId: "test-user", onLog: noop, onLogDate: noop, onGoWeek: noop,
    justRolledPeriod: null, onDismissRolloverBanner: noop, onOpenSettings: noop,
  };
}

let mounted;
afterEach(() => { mounted?.unmount(); mounted = null; });

describe("HomeScreen today-card branching", () => {
  it("shows the Today's Duty card when a shift is logged for today", () => {
    const period = basePeriod({ shifts: [shift("s1", todayDate)] });
    mounted = render(<HomeScreen {...homeProps(period)} />);
    expect(mounted.container.textContent).toContain("Today's Duty");
    expect(mounted.container.textContent).toContain("Z1/01");
    expect(mounted.container.textContent).not.toContain("No duty logged for today");
  });

  it("shows the resting card when today is a Rest Day and no shift is logged", () => {
    const period = basePeriod({ daysOff: [{ id: "d1", date: todayDate, type: "Rest Day" }] });
    mounted = render(<HomeScreen {...homeProps(period)} />);
    expect(mounted.container.textContent).toContain("Resting today");
    expect(mounted.container.textContent).not.toContain("Today's Duty");
  });

  it("shows the '{type} today' card for a non-Rest-Day day off (e.g. Annual Leave)", () => {
    const period = basePeriod({ daysOff: [{ id: "d1", date: todayDate, type: "Annual Leave" }] });
    mounted = render(<HomeScreen {...homeProps(period)} />);
    expect(mounted.container.textContent).toContain("Annual Leave today");
    expect(mounted.container.textContent).not.toContain("Resting today");
    expect(mounted.container.textContent).not.toContain("Today's Duty");
  });

  it("shows the nothing-logged empty state when today has neither a shift nor a day off", () => {
    const period = basePeriod();
    mounted = render(<HomeScreen {...homeProps(period)} />);
    expect(mounted.container.textContent).toContain("No duty logged for today");
    expect(mounted.container.textContent).not.toContain("Today's Duty");
    expect(mounted.container.textContent).not.toContain("Resting today");
  });

  it("a shift takes priority over a day off logged the same date (mirrors dayInfo's own precedence)", () => {
    const period = basePeriod({
      shifts: [shift("s1", todayDate)],
      daysOff: [{ id: "d1", date: todayDate, type: "Annual Leave" }],
    });
    mounted = render(<HomeScreen {...homeProps(period)} />);
    expect(mounted.container.textContent).toContain("Today's Duty");
    expect(mounted.container.textContent).not.toContain("Annual Leave today");
  });

  it("shows Tomorrow's Duty as a secondary card alongside today's own state", () => {
    const period = basePeriod({ shifts: [shift("s1", addDays(todayDate, 1))] });
    mounted = render(<HomeScreen {...homeProps(period)} />);
    expect(mounted.container.textContent).toContain("Tomorrow's Duty");
    expect(mounted.container.textContent).toContain("No duty logged for today");
  });
});

describe("HomeScreen diversion alert — only when today's logged duty is affected", () => {
  const live = (id, zone) => ({ id, zone, starts_on: addDays(todayDate, -1), ends_on: null, type: "diversion", description: "x" });
  const alertBtn = (c) => c.querySelector('[aria-label*="active diversion"]');

  it("hides every alert when no duty is logged for today", () => {
    const period = basePeriod();
    mounted = render(<HomeScreen {...homeProps(period)} alerts={[live("a", "Zone 1"), live("b", null)]} />);
    expect(alertBtn(mounted.container)).toBeNull();
  });

  it("hides an alert for a different zone", () => {
    const period = basePeriod({ shifts: [shift("s1", todayDate, { zone: "Zone 2" })] });
    mounted = render(<HomeScreen {...homeProps(period)} alerts={[live("a", "Zone 1")]} />);
    expect(alertBtn(mounted.container)).toBeNull();
  });

  it("shows same-zone and garage-wide alerts for today's duty", () => {
    const period = basePeriod({ shifts: [shift("s1", todayDate)] });
    mounted = render(<HomeScreen {...homeProps(period)} alerts={[live("a", "Zone 1"), live("b", null), live("c", "Zone 2")]} />);
    expect(alertBtn(mounted.container).getAttribute("aria-label")).toBe("2 active diversions for your garage");
  });
});

describe("HomeScreen duty card camera + OT buttons", () => {
  it("OT opens the day card with rest day, overtime and notes right there", () => {
    const s = shift("s1", todayDate);
    mounted = render(<HomeScreen {...homeProps(basePeriod({ shifts: [s] }))} />);
    act(() => { mounted.container.querySelector('[aria-label="Log overtime or rest day"]').click(); });
    const sheet = document.querySelector('[role="dialog"]');
    expect(sheet.querySelector('[aria-label="Working on a rest day"]')).toBeTruthy();
    expect(sheet.querySelector('[aria-label="Overtime hours"]')).toBeTruthy();
    expect(sheet.querySelector("#day-notes")).toBeTruthy();
    sheet.remove();
  });

  it("camera opens the share sheet with the swap caption", () => {
    mounted = render(<HomeScreen {...homeProps(basePeriod({ shifts: [shift("s1", todayDate)] }))} />);
    act(() => { mounted.container.querySelector('[aria-label="Share this duty"]').click(); });
    const caption = document.querySelector("#share-caption");
    expect(caption.value).toMatch(/^Looking to swap Z1\/01 – \w{3} \d{1,2} \w{3}\nLooking for: early finish before 12:00$/);
    expect(document.querySelector('[role="dialog"]').textContent).toContain("Swap Z1/01");
  });
});

describe("Today's Duty card header (Phil 2026-11-06)", () => {
  it("drops the leading S on Zone 1/2 codes only", () => {
    expect(displayRoster("SZ1/15X")).toBe("Z1/15X");
    expect(displayRoster("SZ2/04")).toBe("Z2/04");
    expect(displayRoster("33SK/03")).toBe("33SK/03");
    expect(displayRoster("150/07")).toBe("150/07");
    expect(displayRoster("Standard Spare")).toBe("Standard Spare");
  });
  it("shows Z1/01 with Duty No. beside it and no zone line", () => {
    const period = basePeriod({ shifts: [shift("s1", todayDate)] });
    mounted = render(<HomeScreen {...homeProps(period)} />);
    const code = [...mounted.container.querySelectorAll("p")].find(p => p.textContent === "Z1/01");
    expect(code).toBeTruthy();
    expect(code.parentElement.textContent).toContain("Duty No. 1");
    expect([...mounted.container.querySelectorAll("p")].some(p => p.textContent === "Zone 1")).toBe(false);
  });
});

describe("day card quick edit (Phil 2026-11-06)", () => {
  const setVal = (el, v) => {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const set = Object.getOwnPropertyDescriptor(proto, "value").set;
    act(() => { set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); });
  };
  const open = (s, extra = {}) => {
    mounted = render(<HomeScreen {...homeProps(basePeriod({ shifts: [s] }))} {...extra} />);
    act(() => { mounted.container.querySelector('[aria-label="Log overtime or rest day"]').click(); });
    return document.querySelector('[role="dialog"]');
  };
  afterEach(() => { document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove()); });
  const btn = (root, text) => [...root.querySelectorAll("button")].find((b) => b.textContent === text);

  it("saves overtime, its reason and a note in one go; Save stays off until something changes", () => {
    let saved = null;
    const sheet = open(shift("s1", todayDate), { onSaveShift: (x) => { saved = x; } });
    expect(btn(sheet, "Save").disabled).toBe(true);
    setVal(sheet.querySelector('[aria-label="Overtime hours"]'), "1");
    setVal(sheet.querySelector('[aria-label="Overtime minutes"]'), "30");
    setVal(sheet.querySelector('[aria-label="What was this overtime for?"]'), "late break");
    setVal(sheet.querySelector("#day-notes"), "covered for Mick");
    act(() => { btn(sheet, "Save").click(); });
    expect(saved).toMatchObject({ id: "s1", overtimeHours: 1.5, overtimeNote: "late break", notes: "covered for Mick", isRestDay: false });
  });

  it("on a rest day the overtime boxes stay, as extra overtime on top of the duty", () => {
    let saved = null;
    const sheet = open(shift("s1", todayDate), { onSaveShift: (x) => { saved = x; } });
    act(() => { sheet.querySelector('[aria-label="Working on a rest day"]').click(); });
    expect(sheet.textContent).toContain("Extra OT");
    setVal(sheet.querySelector('[aria-label="Overtime hours"]'), "1");
    act(() => { btn(sheet, "Save").click(); });
    expect(saved).toMatchObject({ isRestDay: true, overtimeHours: 1 });
  });

  it("Edit duty sits beside Save and opens the full edit", () => {
    let edited = null;
    const sheet = open(shift("s1", todayDate), { onEditShift: (x) => { edited = x; } });
    act(() => { btn(sheet, "Edit duty").click(); });
    expect(edited.id).toBe("s1");
  });
});
