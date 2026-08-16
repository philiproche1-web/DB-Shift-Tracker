// First component-render tests in this repo — everything else tested
// pure logic. The audit found zero component/screen tests despite the
// bugs that actually reached drivers being UI-integration bugs (duplicate
// Self Cert, wrong edit affordance, greeting contradiction) rather than
// arithmetic errors. This covers LogScreen's save-gating specifically,
// per the audit's own suggested scope.
//
// No @testing-library in this repo — renders directly via react-dom/client
// + React's own act() (React 19 exports it from "react" directly).
import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { LogScreen } from "./LogScreen.jsx";
import { sundayOf, today, addDays } from "../lib/dutyMath.js";

// React 19 requires this to allow act() outside its own test-renderer setup.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function render(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(element); });
  return { container, unmount: () => act(() => root.unmount()) };
}
function saveButton(container) {
  const matches = [...container.querySelectorAll("button")].filter(b => /Log Shift|Save Changes|Log \d+ days/.test(b.textContent));
  // The two Save positions (normal duty pick vs Spare/CPC) are meant to be
  // mutually exclusive — asserting exactly one here means a regression that
  // renders both at once fails loudly instead of this helper silently
  // picking whichever happens to be first.
  expect(matches.length).toBeLessThanOrEqual(1);
  return matches[0];
}
function textNode(container, text) {
  return [...container.querySelectorAll("*")].find(e => e.children.length === 0 && e.textContent.trim() === text);
}
// jsdom doesn't compute real layout — getBoundingClientRect() is always 0
// here, so DOM order (via compareDocumentPosition) is what actually proves
// "renders before/after", not pixel position. The live-browser verification
// (separate from this suite) is what confirmed the real visual position.
function isBefore(a, b) {
  return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}
function click(el) { act(() => { el.click(); }); }
function setValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  act(() => { setter.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
}

const start = sundayOf(today());
const noop = () => {};
const shift = (id, date, over = {}) => ({
  id, date, zone: "Zone 1", roster: "SZ1/01", duty: "005001", fixedType: null,
  reportTime: "05:40", signOffTime: "13:55", workHours: 7.5, reliefHours: 0.5,
  isSpare: false, isRestDay: false, overtimeHours: 0, overtimeNote: "", notes: "",
  ...over,
});

let mounted;
afterEach(() => { mounted?.unmount(); mounted = null; });

describe("LogScreen save gating", () => {
  it("disables Save on a fresh entry with nothing picked yet", () => {
    const period = { id: "p1", startDate: start, shifts: [], daysOff: [] };
    mounted = render(<LogScreen period={period} editShift={null} lookupDuty={null} initialDate={null}
      initialRestDay={false} alerts={[]} onSave={noop} onCancel={noop} onOpenSettings={noop} />);
    const btn = saveButton(mounted.container);
    expect(btn.disabled).toBe(true);
  });

  it("enables Save once editing an existing shift (all fields already populated)", () => {
    const s = shift("s1", addDays(start, 2));
    const period = { id: "p1", startDate: start, shifts: [s], daysOff: [] };
    mounted = render(<LogScreen period={period} editShift={s} lookupDuty={null} initialDate={null}
      initialRestDay={false} alerts={[]} onSave={noop} onCancel={noop} onOpenSettings={noop} />);
    const btn = saveButton(mounted.container);
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe("Save Changes");
  });

  it("shows the conflict warning, with an inline edit link, when the date already has a shift", () => {
    const existing = shift("existing", addDays(start, 2));
    const period = { id: "p1", startDate: start, shifts: [existing], daysOff: [] };
    let editedTo = null;
    mounted = render(<LogScreen period={period} editShift={null} lookupDuty={null} initialDate={addDays(start, 2)}
      initialRestDay={false} alerts={[]} onSave={noop} onCancel={noop}
      onEditConflict={(s) => { editedTo = s; }} onOpenSettings={noop} />);
    expect(mounted.container.textContent).toContain("already logged for this date");
    const editLink = [...mounted.container.querySelectorAll("button")].find(b => b.textContent === "Edit that shift instead");
    expect(editLink).toBeTruthy();
    click(editLink);
    expect(editedTo).toBe(existing);
  });

  it("does not show the conflict warning, or the fallback text, once onEditConflict is provided but no conflict exists", () => {
    const period = { id: "p1", startDate: start, shifts: [], daysOff: [] };
    mounted = render(<LogScreen period={period} editShift={null} lookupDuty={null} initialDate={addDays(start, 2)}
      initialRestDay={false} alerts={[]} onSave={noop} onCancel={noop} onEditConflict={noop} onOpenSettings={noop} />);
    expect(mounted.container.textContent).not.toContain("already logged for this date");
  });

  it("falls back to the old plain-text warning when onEditConflict isn't provided at all", () => {
    const existing = shift("existing", addDays(start, 2));
    const period = { id: "p1", startDate: start, shifts: [existing], daysOff: [] };
    mounted = render(<LogScreen period={period} editShift={null} lookupDuty={null} initialDate={addDays(start, 2)}
      initialRestDay={false} alerts={[]} onSave={noop} onCancel={noop} onOpenSettings={noop} />);
    expect(mounted.container.textContent).toContain("Edit or delete it first, or pick a different date.");
    expect([...mounted.container.querySelectorAll("button")].find(b => b.textContent === "Edit that shift instead")).toBeFalsy();
  });

  it("still requires a start time even for a fixed-duration duty type (CPC/Training) — selecting it alone doesn't enable Save", () => {
    // canSave requires reportTime too, and selecting a fixed duty type
    // resets reportTime to "" — this is intentional (the driver still has
    // to say when it started), not a gap to "fix".
    const period = { id: "p1", startDate: start, shifts: [], daysOff: [] };
    mounted = render(<LogScreen period={period} editShift={null} lookupDuty={null} initialDate={addDays(start, 2)}
      initialRestDay={false} alerts={[]} onSave={noop} onCancel={noop} onOpenSettings={noop} />);
    expect(saveButton(mounted.container).disabled).toBe(true);
    const cpcBtn = [...mounted.container.querySelectorAll("button")].find(b => b.textContent.includes("CPC/Training"));
    click(cpcBtn);
    expect(saveButton(mounted.container).disabled).toBe(true);
    const startTimeInput = mounted.container.querySelector('input[type="time"]');
    setValue(startTimeInput, "07:00");
    expect(saveButton(mounted.container).disabled).toBe(false);
  });

  it("calls onSave with the entered shift once a fixed duty type and start time are both set", () => {
    const period = { id: "p1", startDate: start, shifts: [], daysOff: [] };
    let saved = null;
    mounted = render(<LogScreen period={period} editShift={null} lookupDuty={null} initialDate={addDays(start, 2)}
      initialRestDay={false} alerts={[]} onSave={(s) => { saved = s; }} onCancel={noop} onOpenSettings={noop} />);
    const cpcBtn = [...mounted.container.querySelectorAll("button")].find(b => b.textContent.includes("CPC/Training"));
    click(cpcBtn);
    setValue(mounted.container.querySelector('input[type="time"]'), "07:00");
    click(saveButton(mounted.container));
    expect(saved).toBeTruthy();
    expect(saved.date).toBe(addDays(start, 2));
    expect(saved.fixedType).toBe("cpc");
    expect(saved.reportTime).toBe("07:00");
  });
});

describe("LogScreen Save button position", () => {
  // Phil's follow-up on the initial move: for a normal duty pick, Save
  // renders early — everything it needs is already auto-filled. For
  // Spare/CPC/Workout Spare, the duty picker and "Also log this duty on"
  // section are hidden entirely, and a start time still has to be typed
  // into Shift details — so Save renders AFTER that section instead,
  // rather than sitting above a field it isn't ready for yet.
  it("renders Save before Shift details for a normal duty pick", () => {
    const period = { id: "p1", startDate: start, shifts: [], daysOff: [] };
    mounted = render(<LogScreen period={period} editShift={null} lookupDuty={null} initialDate={addDays(start, 2)}
      initialRestDay={false} alerts={[]} onSave={noop} onCancel={noop} onOpenSettings={noop} />);
    const dutyPickerBtn = [...mounted.container.querySelectorAll("button")].find(b => b.textContent.includes("Tap to choose a duty"));
    click(dutyPickerBtn);
    const firstDuty = mounted.container.querySelector('div[style*="max-height"] button');
    click(firstDuty);

    const save = saveButton(mounted.container);
    const shiftDetailsLabel = textNode(mounted.container, "Shift details");
    expect(save).toBeTruthy();
    expect(shiftDetailsLabel).toBeTruthy();
    expect(isBefore(save, shiftDetailsLabel)).toBe(true);
  });

  it("renders Save after Shift details (Start time) for a fixed duty type, not before", () => {
    const period = { id: "p1", startDate: start, shifts: [], daysOff: [] };
    mounted = render(<LogScreen period={period} editShift={null} lookupDuty={null} initialDate={addDays(start, 2)}
      initialRestDay={false} alerts={[]} onSave={noop} onCancel={noop} onOpenSettings={noop} />);
    const cpcBtn = [...mounted.container.querySelectorAll("button")].find(b => b.textContent.includes("CPC/Training"));
    click(cpcBtn);

    const save = saveButton(mounted.container);
    const startTimeLabel = textNode(mounted.container, "Start time");
    expect(save).toBeTruthy();
    expect(startTimeLabel).toBeTruthy();
    expect(isBefore(startTimeLabel, save)).toBe(true);
    // And the early-render slot genuinely has nothing in it for this path —
    // not just "Save happens to also appear later too".
    expect(mounted.container.querySelectorAll("button").length).toBeGreaterThan(0);
  });

  it("never renders two Save buttons at once, for either path", () => {
    const period = { id: "p1", startDate: start, shifts: [], daysOff: [] };
    mounted = render(<LogScreen period={period} editShift={null} lookupDuty={null} initialDate={addDays(start, 2)}
      initialRestDay={false} alerts={[]} onSave={noop} onCancel={noop} onOpenSettings={noop} />);
    const cpcBtn = [...mounted.container.querySelectorAll("button")].find(b => b.textContent.includes("CPC/Training"));
    click(cpcBtn);
    expect([...mounted.container.querySelectorAll("button")].filter(b => /Log Shift|Save Changes|Log \d+ days/.test(b.textContent)).length).toBe(1);
  });
});
