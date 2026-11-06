import { describe, it, expect } from "vitest";
import { buildShareCaption, nextDateForDayType, shortDayLabel, wrapText, layoutDutyImage, shareFilename } from "./dutyShare.js";
import { getDayType } from "./dutyMath.js";

describe("buildShareCaption", () => {
  it("is just the duty (no leading S) and the day, then an editable example line — no times", () => {
    expect(buildShareCaption({ roster: "SZ2/12X", date: "2026-11-02", reportTime: "09:23", finishTime: "19:40" }))
      .toBe("Looking to swap Z2/12X – Mon 2 Nov\nLooking for: early finish before 12:00");
  });
  it("leaves other codes alone", () => {
    expect(buildShareCaption({ roster: "Standard Spare", date: "2026-11-07" }))
      .toBe("Looking to swap Standard Spare – Sat 7 Nov\nLooking for: early finish before 12:00");
  });
  it("shortDayLabel has no comma", () => {
    expect(shortDayLabel("2026-11-08")).toBe("Sun 8 Nov");
  });
});

describe("nextDateForDayType", () => {
  it("returns the same day when it already matches", () => {
    expect(nextDateForDayType("weekday", "2026-11-06")).toBe("2026-11-06");
  });
  it("jumps to the next Saturday / Sunday", () => {
    expect(nextDateForDayType("saturday", "2026-11-09")).toBe("2026-11-14");
    expect(nextDateForDayType("sunday", "2026-11-09")).toBe("2026-11-15");
  });
  it("always lands on a date of that duty type", () => {
    for (const t of ["weekday", "saturday", "sunday"]) {
      for (let i = 0; i < 20; i++) {
        const from = `2026-12-${String(i + 1).padStart(2, "0")}`;
        expect(getDayType(nextDateForDayType(t, from))).toBe(t);
      }
    }
  });
});

describe("image layout", () => {
  const measure = (t) => t.length * 10;
  it("wraps long stop names inside the width", () => {
    const lines = wrapText("aaaa bbbb cccc dddd", 95, measure);
    expect(lines).toEqual(["aaaa bbbb", "cccc dddd"]);
    lines.forEach((l) => expect(measure(l)).toBeLessThanOrEqual(95));
  });
  it("gives every running-board entry a row, in order, and grows with them", () => {
    const seq = ["06:10 - Report (Summerhill)", "06:25 - Abbey St (15X)", "14:32 - Finish (Summerhill)"];
    const a = layoutDutyImage({ seq }, measure);
    expect(a.rows.map((r) => r.time)).toEqual(["06:10", "06:25", "14:32"]);
    expect(a.rows[1].y).toBeGreaterThan(a.rows[0].y);
    const b = layoutDutyImage({ seq: seq.slice(0, 1) }, measure);
    expect(a.height).toBeGreaterThan(b.height);
  });
  it("filename is safe", () => {
    expect(shareFilename({ roster: "SZ1/15X", date: "2026-11-06" })).toBe("SZ1-15X-2026-11-06.png");
  });
});
