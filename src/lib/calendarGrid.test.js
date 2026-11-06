import { describe, it, expect } from "vitest";
import { monthGrid, addMonths, isoDate, parseIso } from "./calendarGrid.js";

describe("monthGrid", () => {
  it("starts November 2026 on a Sunday, in the last (7th) column", () => {
    const weeks = monthGrid(2026, 10);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks[1][0]).toBe("2026-11-02"); // Monday
  });

  it("every week has exactly 7 cells and every day of the month appears once, in order", () => {
    for (const [y, m, days] of [[2026, 1, 28], [2028, 1, 29], [2026, 11, 31], [2026, 3, 30]]) {
      const weeks = monthGrid(y, m);
      weeks.forEach((w) => expect(w).toHaveLength(7));
      const dates = weeks.flat().filter(Boolean);
      expect(dates).toHaveLength(days);
      expect(dates[0]).toBe(isoDate(y, m, 1));
      expect(dates[days - 1]).toBe(isoDate(y, m, days));
    }
  });

  it("puts each date under its real weekday (Monday-first)", () => {
    const weeks = monthGrid(2026, 2); // March 2026, includes the DST change
    for (const w of weeks) {
      w.forEach((d, col) => {
        if (!d) return;
        const jsDay = new Date(d + "T12:00:00").getDay();
        expect((jsDay + 6) % 7).toBe(col);
      });
    }
  });
});

describe("addMonths / parseIso", () => {
  it("wraps across year boundaries both ways", () => {
    expect(addMonths({ year: 2026, monthIndex: 11 }, 1)).toEqual({ year: 2027, monthIndex: 0 });
    expect(addMonths({ year: 2026, monthIndex: 0 }, -1)).toEqual({ year: 2025, monthIndex: 11 });
  });
  it("round-trips an ISO date", () => {
    expect(parseIso("2026-11-06")).toEqual({ year: 2026, monthIndex: 10, day: 6 });
  });
});
