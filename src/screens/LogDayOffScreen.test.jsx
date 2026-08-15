import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { LogDayOffScreen } from "./LogDayOffScreen.jsx";
import { sundayOf, today, addDays } from "../lib/dutyMath.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function render(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(element); });
  return { container, unmount: () => act(() => root.unmount()) };
}
function click(el) { act(() => { el.click(); }); }
function saveButton(container) {
  return [...container.querySelectorAll("button")].find(b => /Log Day Off|Save Changes|Log \d+ Days/.test(b.textContent));
}

const start = sundayOf(today());
const noop = () => {};
const shift = (id, date, over = {}) => ({ id, date, roster: "SZ1/01", ...over });
const dayOff = (id, date, type) => ({ id, date, type });

let mounted;
afterEach(() => { mounted?.unmount(); mounted = null; });

describe("LogDayOffScreen conflict warnings", () => {
  it("shows no conflict warning when the date is clear", () => {
    const periods = [{ id: "p1", startDate: start, shifts: [], daysOff: [] }];
    mounted = render(<LogDayOffScreen periods={periods} editDayOff={null} onSave={noop} onCancel={noop} onOpenSettings={noop} />);
    expect(mounted.container.textContent).not.toContain("already logged");
    expect(saveButton(mounted.container).disabled).toBe(false);
  });

  it("shows the shift-conflict warning (amber) when the date already has a shift, and saving asks to confirm", () => {
    const conflictDate = addDays(start, 2);
    const s = shift("s1", conflictDate);
    const periods = [{ id: "p1", startDate: start, shifts: [s], daysOff: [] }];
    mounted = render(<LogDayOffScreen periods={periods} editDayOff={dayOff("edit1", conflictDate, "Annual Leave")}
      onSave={noop} onCancel={noop} onOpenSettings={noop} />);
    expect(mounted.container.textContent).toContain("A shift (SZ1/01) is already logged");
    // Editing an existing single day off (not range mode) — Save doesn't
    // immediately call onSave, it opens the replace-confirmation dialog.
    click(saveButton(mounted.container));
    expect(mounted.container.textContent).toContain("This will replace");
    expect(mounted.container.textContent).toContain("Replace");
  });

  it("shows the day-off-conflict warning (red) when the date already has a different day off logged", () => {
    const conflictDate = addDays(start, 3);
    const existing = dayOff("existing", conflictDate, "Sick Day");
    const periods = [{ id: "p1", startDate: start, shifts: [], daysOff: [existing] }];
    mounted = render(<LogDayOffScreen periods={periods} editDayOff={dayOff("edit1", conflictDate, "Annual Leave")}
      onSave={noop} onCancel={noop} onOpenSettings={noop} />);
    expect(mounted.container.textContent).toContain("Sick Day is already logged");
  });

  it("does not treat a same-date shift as a conflict when the type is Bank Holiday In Lieu", () => {
    // The in-lieu entry is deliberately logged alongside the worked shift —
    // treating it as a conflict would be wrong, per LogDayOffScreen's own
    // comment on conflictShifts.
    const conflictDate = addDays(start, 2);
    const s = shift("s1", conflictDate);
    const periods = [{ id: "p1", startDate: start, shifts: [s], daysOff: [] }];
    mounted = render(<LogDayOffScreen periods={periods} editDayOff={dayOff("edit1", conflictDate, "Bank Holiday In Lieu")}
      onSave={noop} onCancel={noop} onOpenSettings={noop} />);
    expect(mounted.container.textContent).not.toContain("already logged");
    expect(saveButton(mounted.container).disabled).toBe(false);
  });

  it("confirming the replace dialog calls onSave with the conflicting shift's id to replace", () => {
    const conflictDate = addDays(start, 2);
    const s = shift("s1", conflictDate);
    const periods = [{ id: "p1", startDate: start, shifts: [s], daysOff: [] }];
    let savedArgs = null;
    mounted = render(<LogDayOffScreen periods={periods} editDayOff={dayOff("edit1", conflictDate, "Annual Leave")}
      onSave={(...args) => { savedArgs = args; }} onCancel={noop} onOpenSettings={noop} />);
    click(saveButton(mounted.container));
    const confirmBtn = [...mounted.container.querySelectorAll("button")].find(b => b.textContent === "Replace");
    click(confirmBtn);
    expect(savedArgs).toBeTruthy();
    const [dayOffArg, shiftIds] = savedArgs;
    expect(dayOffArg.date).toBe(conflictDate);
    expect(shiftIds).toEqual(["s1"]);
  });

  it("saves immediately with no confirm dialog when there is no conflict", () => {
    const periods = [{ id: "p1", startDate: start, shifts: [], daysOff: [] }];
    let saveCalled = false;
    mounted = render(<LogDayOffScreen periods={periods} editDayOff={dayOff("edit1", addDays(start, 2), "Annual Leave")}
      onSave={() => { saveCalled = true; }} onCancel={noop} onOpenSettings={noop} />);
    click(saveButton(mounted.container));
    expect(saveCalled).toBe(true);
    expect(mounted.container.textContent).not.toContain("This will replace");
  });
});
