import { describe, it, expect } from "vitest";
import { GARAGES, GARAGES_WITH_ROSTER, hasLiveRoster, garageOptions } from "./garages.js";

describe("GARAGES", () => {
  it("includes Summerhill and the other seven garages", () => {
    expect(GARAGES).toHaveLength(8);
    expect(GARAGES).toContain("Summerhill");
  });

  it("has no duplicates", () => {
    expect(new Set(GARAGES).size).toBe(GARAGES.length);
  });
});

describe("hasLiveRoster", () => {
  it("is true for Summerhill", () => {
    expect(hasLiveRoster("Summerhill")).toBe(true);
  });

  it("is false for every other canonical garage", () => {
    for (const g of GARAGES.filter((g) => g !== "Summerhill")) {
      expect(hasLiveRoster(g)).toBe(false);
    }
  });

  it("is false for an unrecognized value", () => {
    expect(hasLiveRoster("Broadstone")).toBe(false);
  });

  it("only lists Summerhill in GARAGES_WITH_ROSTER", () => {
    expect(GARAGES_WITH_ROSTER).toEqual(["Summerhill"]);
  });
});

describe("garageOptions", () => {
  it("returns one option per garage, in order", () => {
    expect(garageOptions().map((o) => o.value)).toEqual(GARAGES);
  });

  it("marks only Summerhill as not disabled, with its plain name as the label", () => {
    const summerhill = garageOptions().find((o) => o.value === "Summerhill");
    expect(summerhill.disabled).toBe(false);
    expect(summerhill.label).toBe("Summerhill");
  });

  it("marks every other garage disabled with a coming-soon label", () => {
    for (const o of garageOptions().filter((o) => o.value !== "Summerhill")) {
      expect(o.disabled).toBe(true);
      expect(o.label).toBe(`${o.value} — coming soon`);
    }
  });
});
