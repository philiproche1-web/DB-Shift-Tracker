import { describe, it, expect } from "vitest";
import { buildPDFHTML } from "./pdfExport.js";

const period = { startDate: "2026-07-19" };

function statsWith(shift) {
  return {
    total: 7.5, sunday: 0, overtime: 0, consec: 1,
    tally: { "Annual Leave": 0, "Sick Day": 0, "Rest Day": 0, "Force Majeure": 0, "Self Cert": 0 },
    weeks: [{
      start: "2026-07-19", end: "2026-07-25", total: 7.5, sunday: 0, overtime: 0,
      shifts: [shift], daysOff: [],
    }],
  };
}

const baseShift = {
  date: "2026-07-20", zone: "Zone 1", roster: "SZ1/01", duty: "005001",
  reportTime: "05:40", signOffTime: "13:55", workHours: 7.5, reliefHours: 0.5,
  isSpare: false, isRestDay: false, overtimeHours: 0, overtimeNote: "", notes: "",
};

describe("buildPDFHTML escapes driver-entered free text", () => {
  it("escapes an HTML payload in notes", () => {
    const html = buildPDFHTML(period, statsWith({ ...baseShift, notes: '<img src=x onerror=alert(1)>' }));
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("escapes an HTML payload in overtimeNote", () => {
    const html = buildPDFHTML(period, statsWith({
      ...baseShift, overtimeHours: 1, overtimeNote: '"><script>alert(1)</script>',
    }));
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("escapes zone and roster even though both are normally controlled values", () => {
    const html = buildPDFHTML(period, statsWith({ ...baseShift, zone: "<b>Zone</b>", roster: "<b>R</b>" }));
    expect(html).not.toContain("<b>Zone</b>");
    expect(html).not.toContain("<b>R</b>");
  });

  it("still renders a shift with no notes at all", () => {
    const html = buildPDFHTML(period, statsWith(baseShift));
    expect(html).toContain("SZ1/01");
    expect(html).toContain("05:40");
  });

  it("does not choke on notes containing an ampersand or quotes", () => {
    const html = buildPDFHTML(period, statsWith({ ...baseShift, notes: `Ran late — driver's mate & the "12B"` }));
    expect(html).toContain("Ran late");
    expect(html).toContain("&amp;");
    expect(html).toContain("&#39;");
    expect(html).toContain("&quot;");
  });
});
