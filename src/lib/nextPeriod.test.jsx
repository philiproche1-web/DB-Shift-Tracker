// Logging ahead into the NEXT 5-week period (Phil 2026-11-06): a driver gets
// a duty by text on 4 Dec for 6 Dec, when the current period ends 5 Dec.
import { describe, it, expect, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { applyShiftSave, applyDayOffSave, applyShiftDelete, ensureNextPeriodFor, isInNextPeriod } from "./periodMutations.js";
import { rollPeriodsForward, periodForDate } from "./roster.js";
import { LogScreen } from "../screens/LogScreen.jsx";
import { ArchiveScreen } from "../screens/ArchiveScreen.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ACTIVE = { id: "cur", startDate: "2026-11-01", shifts: [], daysOff: [] }; // ends Sat 5 Dec
const shift = (id, date) => ({ id, date, zone: "Zone 1", roster: "SZ1/01", duty: "005001", reportTime: "05:40", signOffTime: "13:55", workHours: 7.5 });

// What App.saveShift does.
function save(periods, s) {
  return applyShiftSave(ensureNextPeriodFor(periods, "cur", [s.date]), "cur", s);
}

describe("next-period helpers", () => {
  it("the next period is the 35 days straight after the active one", () => {
    expect(isInNextPeriod([ACTIVE], "cur", "2026-12-05")).toBe(false);
    expect(isInNextPeriod([ACTIVE], "cur", "2026-12-06")).toBe(true);
    expect(isInNextPeriod([ACTIVE], "cur", "2027-01-09")).toBe(true);
    expect(isInNextPeriod([ACTIVE], "cur", "2027-01-10")).toBe(false);
  });
  it("creates it once, only when needed", () => {
    expect(ensureNextPeriodFor([ACTIVE], "cur", ["2026-12-01"])).toHaveLength(1);
    const once = ensureNextPeriodFor([ACTIVE], "cur", ["2026-12-06"]);
    expect(once).toHaveLength(2);
    expect(once[1].startDate).toBe("2026-12-06");
    expect(ensureNextPeriodFor(once, "cur", ["2026-12-07"])).toBe(once);
  });
});

describe("saving ahead", () => {
  it("on 4 Dec, a shift for 6 Dec goes into the next period; the current one is untouched", () => {
    const after = save([ACTIVE], shift("s6", "2026-12-06"));
    const next = after.find((p) => p.startDate === "2026-12-06");
    expect(next.shifts.map((s) => s.id)).toEqual(["s6"]);
    expect(after.find((p) => p.id === "cur").shifts).toEqual([]);
    expect(periodForDate(after, "2026-12-06", "cur").id).toBe(next.id);
  });
  it("a second early shift lands in the same next period", () => {
    const after = save(save([ACTIVE], shift("s6", "2026-12-06")), shift("s7", "2026-12-07"));
    expect(after).toHaveLength(2);
    expect(after[1].shifts.map((s) => s.id)).toEqual(["s6", "s7"]);
  });
  it("editing a shift's date across the boundary moves it, never duplicates it", () => {
    const start = applyShiftSave([ACTIVE], "cur", shift("s1", "2026-12-04"));
    const moved = save(start, shift("s1", "2026-12-06"));
    expect(moved.find((p) => p.id === "cur").shifts).toEqual([]);
    expect(moved.find((p) => p.startDate === "2026-12-06").shifts.map((s) => s.date)).toEqual(["2026-12-06"]);
  });
  it("leave for the next period is saved there too", () => {
    const off = { id: "al", date: "2026-12-08", type: "Annual Leave" };
    const after = applyDayOffSave(ensureNextPeriodFor([ACTIVE], "cur", [off.date]), "cur", off);
    expect(after.find((p) => p.startDate === "2026-12-06").daysOff.map((d) => d.id)).toEqual(["al"]);
    expect(after.find((p) => p.id === "cur").daysOff).toEqual([]);
  });
  it("an early shift can be deleted", () => {
    const after = save([ACTIVE], shift("s6", "2026-12-06"));
    expect(applyShiftDelete(after, "cur", "s6")[1].shifts).toEqual([]);
  });
});

describe("changeover day", () => {
  afterEach(() => { vi.useRealTimers(); });
  it("on 6 Dec the early period becomes active with its shifts — no empty duplicate", () => {
    const early = save([ACTIVE], shift("s6", "2026-12-06"));
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-06T12:00:00"));
    const r = rollPeriodsForward(early, "cur");
    expect(r.rolled).toBe(true);
    expect(r.periods).toHaveLength(2);
    const active = r.periods.find((p) => p.id === r.activePeriodId);
    expect(active.startDate).toBe("2026-12-06");
    expect(active.shifts.map((s) => s.id)).toEqual(["s6"]);
    expect(r.periods.find((p) => p.id === "cur").archived).toBe(true);
  });
  it("without anything logged early it still makes a fresh period as before", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-06T12:00:00"));
    const r = rollPeriodsForward([ACTIVE], "cur");
    expect(r.periods).toHaveLength(2);
    expect(r.periods[1].shifts).toEqual([]);
  });
});

describe("screens", () => {
  let mounted;
  afterEach(() => { act(() => mounted?.root.unmount()); mounted?.c.remove(); mounted = null; vi.useRealTimers(); });
  function render(el) {
    const c = document.createElement("div"); document.body.appendChild(c);
    const root = createRoot(c); act(() => { root.render(el); }); mounted = { root, c }; return c;
  }
  const noop = () => {};
  const saveBtn = (c) => [...c.querySelectorAll("button")].find((b) => b.textContent === "Log Shift");

  it("Log a Shift accepts a date in the next period, not one beyond it", () => {
    const pick = (c) => act(() => { [...c.querySelectorAll("button")].find((b) => b.textContent.includes("CPC/Training")).click(); });
    const setTime = (c) => { const i = c.querySelector('input[type="time"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; act(() => { set.call(i, "07:00"); i.dispatchEvent(new Event("input", { bubbles: true })); }); };
    let c = render(<LogScreen period={ACTIVE} periods={[ACTIVE]} editShift={null} lookupDuty={null} initialDate="2026-12-06" initialRestDay={false} onSave={noop} onCancel={noop} onOpenSettings={noop}/>);
    pick(c); setTime(c);
    expect(saveBtn(c).disabled).toBe(false);
    act(() => mounted.root.unmount()); mounted.c.remove();
    c = render(<LogScreen period={ACTIVE} periods={[ACTIVE]} editShift={null} lookupDuty={null} initialDate="2027-01-10" initialRestDay={false} onSave={noop} onCancel={noop} onOpenSettings={noop}/>);
    pick(c); setTime(c);
    expect(saveBtn(c).disabled).toBe(true);
    expect(c.textContent).toContain("Only this 5-week period and the next one can be logged.");
  });

  it("the period archive doesn't list a period created early", () => {
    const periods = [{ id: "old", startDate: "2026-09-27", shifts: [], daysOff: [] }, ACTIVE, { id: "nx", startDate: "2026-12-06", shifts: [], daysOff: [] }];
    const c = render(<ArchiveScreen periods={periods} activePeriodId="cur" onView={noop} onOpenSettings={noop}/>);
    expect(c.textContent).toContain("1 archived period");
  });
});
