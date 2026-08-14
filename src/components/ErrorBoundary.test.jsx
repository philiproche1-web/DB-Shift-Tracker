// Verifies the boundary actually catches, rather than assuming it does.
// Uses react-dom/client directly — no testing-library dependency needed for
// something this small.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./ErrorBoundary.jsx";

let container, root, consoleError;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  // React logs caught render errors to console.error; silence it so the
  // suite output stays readable, but keep the spy so we can assert on it.
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  act(() => root?.unmount());
  container.remove();
  consoleError.mockRestore();
});

function render(ui) {
  root = createRoot(container);
  act(() => root.render(ui));
}

function Boom({ message = "kaboom" }) {
  throw new Error(message);
}

describe("ErrorBoundary", () => {
  it("renders children normally when nothing throws", () => {
    render(<ErrorBoundary><p>all good</p></ErrorBoundary>);
    expect(container.textContent).toContain("all good");
    expect(container.textContent).not.toContain("Something went wrong");
  });

  it("catches a render throw instead of leaving a blank screen", () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    // The actual defect this guards: an empty container.
    expect(container.textContent.trim()).not.toBe("");
    expect(container.textContent).toContain("Something went wrong");
  });

  it("reassures the driver their data is intact", () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(container.textContent).toContain("Your shifts and leave are safe");
  });

  it("offers a reload control", () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button.textContent).toContain("Reload");
  });

  it("surfaces the error message so a driver can report it", () => {
    render(<ErrorBoundary><Boom message="roster data unreadable" /></ErrorBoundary>);
    expect(container.textContent).toContain("roster data unreadable");
  });

  it("logs the failure for remote debugging", () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    const logged = consoleError.mock.calls.some(
      (args) => typeof args[0] === "string" && args[0].includes("[ErrorBoundary]")
    );
    expect(logged).toBe(true);
  });
});
