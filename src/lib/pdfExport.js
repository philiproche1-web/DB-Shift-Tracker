import { MAX_HOURS, MAX_SUNDAY, DAY_OFF_TYPES, addDays, fmtDate, fmtShort, fmtLong, fmtHrs, calcSpreadover, dutyNumber } from "./dutyMath.js";

// ─── PDF EXPORT ───────────────────────────────────────────────────────────────
export function buildPDFHTML(period, stats) {
  const endDate = addDays(period.startDate, 34);
  const generated = new Date().toLocaleDateString("en-IE",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});
  const totalOK = stats.total <= MAX_HOURS;
  const sundayOK = stats.sunday <= MAX_SUNDAY;
  const totalPct = Math.min((stats.total / MAX_HOURS) * 100, 100).toFixed(1);
  const sundayPct = Math.min((stats.sunday / MAX_SUNDAY) * 100, 100).toFixed(1);
  const totalColor = totalOK ? (stats.total / MAX_HOURS >= 0.8 ? "#f59e0b" : "#16a34a") : "#dc2626";
  const sundayColor = sundayOK ? (stats.sunday / MAX_SUNDAY >= 0.8 ? "#f59e0b" : "#16a34a") : "#dc2626";

  let weeksHTML = "";
  stats.weeks.forEach((w, i) => {
    const allItems = [
      ...w.shifts.map(s => ({...s, _type:"shift"})),
      ...(w.daysOff||[]).map(d => ({...d, _type:"dayoff"}))
    ].sort((a,b) => a.date.localeCompare(b.date));
    const cards = allItems.map(item => {
      if (item._type === "shift") {
        const spread = fmtHrs(calcSpreadover(item.reportTime, item.signOffTime));
        const tags = [
          item.isSpare ? '<span style="background:#fbbf24;color:#000;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;margin-right:4px">SPARE</span>' : "",
          item.isRestDay ? '<span style="background:#dc2626;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;margin-right:4px">REST DAY</span>' : ""
        ].join("");
        const stat = (label,value,color) => `<div><span style="display:block;color:#9ca3af;font-size:9px;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:1px">${label}</span><span style="font-size:12px;font-weight:600;color:${color||"#111"}">${value}</span></div>`;
        const stats5 = [
          stat("Report", item.reportTime || "—"),
          stat("Sign Off", item.signOffTime || "—"),
          stat("Spreadover", spread, item.isRestDay?"#dc2626":null),
          stat("Work", item.isRestDay||item.isSpare?"—":fmtHrs(item.workHours)),
          stat("Relief", item.isRestDay||item.isSpare?"—":fmtHrs(item.reliefHours)),
        ].join("");
        const otLine = item.overtimeHours > 0
          ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #f3f4f6;font-size:11px"><span style="color:#d97706;font-weight:700">Overtime: ${fmtHrs(item.overtimeHours)}</span>${item.overtimeNote ? ` <span style="color:#6b7280;font-style:italic">— ${item.overtimeNote}</span>` : ""}</div>`
          : "";
        const notesLine = item.notes
          ? `<div style="margin-top:6px;font-size:11px;color:#6b7280;font-style:italic">${item.notes}</div>`
          : "";
        return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:6px;page-break-inside:avoid;break-inside:avoid">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px;margin-bottom:8px">
            <div style="font-size:13px"><strong>${fmtDate(item.date)}</strong> <span style="color:#6b7280">· ${item.zone}</span></div>
            <div style="font-size:12px;font-weight:700;color:#1e3a5f">${tags}${item.roster}${dutyNumber(item.duty) ? ` <span style="color:#6b7280;font-weight:400">· Duty No. ${dutyNumber(item.duty)}</span>` : ""}</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">${stats5}</div>
          ${otLine}${notesLine}
        </div>`;
      }
      return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:9px 14px;margin-bottom:6px;background:#f9fafb;page-break-inside:avoid;break-inside:avoid;display:flex;justify-content:space-between;align-items:baseline">
        <strong style="font-size:13px">${fmtDate(item.date)}</strong>
        <span style="font-size:12px;font-style:italic;color:#6b7280">${item.type}</span>
      </div>`;
    }).join("");
    weeksHTML += `
      <div style="page-break-inside:avoid;break-inside:avoid">
        <h3 style="background:#1e3a5f;color:white;padding:8px 12px;margin:16px 0 8px;border-radius:6px;font-size:14px">
          Week ${i+1}: ${fmtShort(w.start)} – ${fmtShort(w.end)} &nbsp;|&nbsp; ${fmtHrs(w.total)} total${w.sunday>0?` / ${fmtHrs(w.sunday)} Sun`:""}${w.overtime>0?` / ${fmtHrs(w.overtime)} OT`:""}
        </h3>
        ${cards || '<p style="color:#6b7280;text-align:center;padding:10px 0">No entries this week</p>'}
      </div>`;
  });

  const tallyRows = DAY_OFF_TYPES.map(t =>
    `<tr><td style="padding:6px 8px">${t}</td><td style="padding:6px 8px;font-weight:bold">${stats.tally[t] || 0}</td></tr>`
  ).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Dublin Bus Shift Record — ${fmtShort(period.startDate)} to ${fmtShort(endDate)}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#111}
  h1{color:#1e3a5f;margin:0 0 4px}
  h2{color:#1e3a5f;border-bottom:2px solid #fbbf24;padding-bottom:6px;margin:24px 0 12px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td,th{padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:left;word-wrap:break-word;overflow-wrap:break-word}
  th{background:#f9fafb;font-weight:600}
  .comp-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0}
  .comp-box{border:2px solid;border-radius:8px;padding:14px}
  .bar-bg{background:#e5e7eb;border-radius:4px;height:8px;margin:8px 0}
  .bar-fill{height:8px;border-radius:4px}
  tr{page-break-inside:avoid;break-inside:avoid}
  @page{size:A4;margin:15mm}
  @media print{body{padding:0;max-width:none}}
</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
  <div>
    <h1>Dublin Bus — Shift Record</h1>
    <p style="margin:4px 0;color:#6b7280">Period: <strong>${fmtLong(period.startDate)}</strong> to <strong>${fmtLong(endDate)}</strong></p>
    <p style="margin:4px 0;color:#6b7280">Generated: ${generated}</p>
  </div>
</div>

<h2>Compliance Summary</h2>
<div class="comp-grid">
  <div class="comp-box" style="border-color:${totalColor}">
    <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Total Hours</div>
    <div style="font-size:28px;font-weight:800;color:${totalColor}">${fmtHrs(stats.total)}</div>
    <div class="bar-bg"><div class="bar-fill" style="width:${totalPct}%;background:${totalColor}"></div></div>
    <div style="font-size:12px;color:#6b7280">${totalPct}% of limit (190h 4m)</div>
    <div style="margin-top:8px;font-weight:700;color:${totalColor}">${totalOK ? "✓ Within limit" : "⚠ LIMIT EXCEEDED"}</div>
  </div>
  <div class="comp-box" style="border-color:${sundayColor}">
    <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Sunday Hours</div>
    <div style="font-size:28px;font-weight:800;color:${sundayColor}">${fmtHrs(stats.sunday)}</div>
    <div class="bar-bg"><div class="bar-fill" style="width:${sundayPct}%;background:${sundayColor}"></div></div>
    <div style="font-size:12px;color:#6b7280">${sundayPct}% of limit (14h 30m)</div>
    <div style="margin-top:8px;font-weight:700;color:${sundayColor}">${sundayOK ? "✓ Within limit" : "⚠ LIMIT EXCEEDED"}</div>
  </div>
</div>
${stats.overtime > 0 ? `
<div class="comp-box" style="border-color:#d97706;margin-bottom:8px">
  <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Overtime Hours (not counted toward limit)</div>
  <div style="font-size:28px;font-weight:800;color:#d97706">${fmtHrs(stats.overtime)}</div>
  <div style="font-size:12px;color:#6b7280;margin-top:4px">Includes rest day working and any logged overtime hours</div>
</div>` : ""}
<div style="background:#f3f4f6;border-radius:8px;padding:12px;margin-bottom:8px">
  <strong>Max consecutive days worked:</strong> ${stats.consec} day${stats.consec !== 1 ? "s" : ""}
</div>

<h2>Non-Working Days</h2>
<table><thead><tr><th>Type</th><th>Days</th></tr></thead>
<tbody>${tallyRows}</tbody></table>

<h2>Week by Week Breakdown</h2>
${weeksHTML}

<div style="margin-top:24px;padding:12px;background:#f3f4f6;border-radius:8px;font-size:12px;color:#6b7280">
  This document was generated by Dublin Bus Shift Tracker. For use in discussions with management or union representation.
</div>
</body></html>`;
}

export function exportPDF(period, stats) {
  const html = buildPDFHTML(period, stats);
  const blob = new Blob([html], {type: "text/html"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.target = "_blank";
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
