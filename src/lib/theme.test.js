// Contrast floors for the theme tokens.
//
// The bottom nav used to hardcode its background (#0A0E1A) and take its
// inactive label colour from MUTED. In light mode that rendered a near-black
// bar under a near-white app, and the labels measured 4.05:1 against it —
// under the 4.5:1 WCAG AA floor for text this size, in the theme a driver in
// bright sunlight is most likely using.
//
// These tests pin the ratios so a future palette tweak can't quietly drop
// back below the line.
import { describe, it, expect } from "vitest";
import { DARK, LIGHT } from "./theme.js";

// WCAG relative luminance / contrast ratio.
function luminance(hex) {
  const [r, g, b] = hex.replace("#", "").match(/../g).map(h => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const AA_NORMAL = 4.5;

describe("contrast ratio helper", () => {
  it("matches known reference values", () => {
    expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
    expect(contrast("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    // The exact pairing this work fixed: old MUTED on the old hardcoded nav.
    expect(contrast("#64748B", "#0A0E1A")).toBeCloseTo(4.05, 1);
  });
});

describe.each([["DARK", DARK], ["LIGHT", LIGHT]])("%s theme meets WCAG AA", (name, t) => {
  it("inactive nav label on the nav surface", () => {
    expect(contrast(t.NAV_MUTED, t.NAV)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("body text on the page background", () => {
    expect(contrast(t.TEXT, t.BG)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("body text on a card", () => {
    expect(contrast(t.TEXT, t.CARD)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("muted text on a card", () => {
    expect(contrast(t.MUTED, t.CARD)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});

describe("nav surface belongs to its theme", () => {
  it("does not reuse the dark nav colour in the light theme", () => {
    // The specific defect: one hardcoded literal shared by both themes.
    expect(LIGHT.NAV).not.toBe(DARK.NAV);
  });

  it("sits close to the light theme's own surfaces, not the dark theme's", () => {
    // A light nav should read as part of a light app: high contrast against
    // dark text, low contrast against the page background.
    expect(contrast(LIGHT.NAV, LIGHT.BG)).toBeLessThan(2);
    expect(contrast(DARK.NAV, DARK.BG)).toBeLessThan(2);
  });
});
