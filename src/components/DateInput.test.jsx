import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { DateInput } from "./shared.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function render(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(element); });
  return { container, unmount: () => act(() => root.unmount()) };
}
const click = (el) => act(() => { el.click(); });
const dialog = () => document.querySelector('[role="dialog"]');
const dayBtn = (n) => [...dialog().querySelectorAll('[role="grid"] button')].find(b => b.textContent === String(n));

let mounted;
afterEach(() => { mounted?.unmount(); mounted = null; });

describe("DateInput (in-app calendar, replaces the native date picker)", () => {
  it("never renders a native date input, whose OS dialog overflowed the screen", () => {
    mounted = render(<DateInput value="2026-11-06" onChange={() => {}}/>);
    expect(mounted.container.querySelector('input[type="date"]')).toBeNull();
    expect(mounted.container.textContent).toContain("Fri 6 Nov 2026");
  });

  it("opens a 7-column calendar that includes Sunday, plus Cancel and Today buttons", () => {
    mounted = render(<DateInput value="2026-11-06" onChange={() => {}}/>);
    click(mounted.container.querySelector("button"));
    expect(dialog()).not.toBeNull();
    expect(dialog().textContent).toContain("November 2026");
    // 1 Nov 2026 is a Sunday — it must sit in the 7th column of the first row
    const grid = dialog().querySelector('[role="grid"]');
    expect(grid.children[6].textContent).toBe("1");
    expect(grid.style.gridTemplateColumns).toBe("repeat(7,minmax(0,1fr))");
    const labels = [...dialog().querySelectorAll("button")].map(b => b.textContent);
    expect(labels).toContain("Cancel");
    expect(labels).toContain("Today");
  });

  it("picking a day calls onChange with the old e.target.value shape and closes", () => {
    let got = null;
    mounted = render(<DateInput value="2026-11-06" onChange={(e) => { got = e.target.value; }}/>);
    click(mounted.container.querySelector("button"));
    click(dayBtn(22));
    expect(got).toBe("2026-11-22");
    expect(dialog()).toBeNull();
  });

  it("moves between months, wrapping the year", () => {
    let got = null;
    mounted = render(<DateInput value="2026-12-30" onChange={(e) => { got = e.target.value; }}/>);
    click(mounted.container.querySelector("button"));
    click(dialog().querySelector('[aria-label="Next month"]'));
    expect(dialog().textContent).toContain("January 2027");
    click(dayBtn(3));
    expect(got).toBe("2027-01-03");
  });

  it("disables days before min (the range 'To' picker) and Cancel changes nothing", () => {
    let calls = 0;
    mounted = render(<DateInput value="2026-11-10" min="2026-11-10" onChange={() => { calls++; }}/>);
    click(mounted.container.querySelector("button"));
    expect(dayBtn(9).disabled).toBe(true);
    expect(dayBtn(10).disabled).toBe(false);
    click([...dialog().querySelectorAll("button")].find(b => b.textContent === "Cancel"));
    expect(dialog()).toBeNull();
    expect(calls).toBe(0);
  });
});
