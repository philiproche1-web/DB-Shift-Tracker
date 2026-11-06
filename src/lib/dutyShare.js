// Share a duty as an image + caption, e.g. into a depot WhatsApp swaps group.
//
// The image is drawn on a <canvas> by hand rather than screenshotting the
// DOM: no extra dependency, crisp at any phone density, and it always holds
// the FULL running board even when the on-screen card is collapsed.
//
// A web app cannot send straight to WhatsApp with an image attached — the
// OS share sheet has to open and the driver picks WhatsApp there. Android
// and iOS rank recently used targets first, so after the first share it is
// one extra tap. See docs/superpowers/specs/2026-11-06-share-duty-ot-shortcut-design.md.
import { getDayType, addDays, dutyNumber } from "./dutyMath.js";
import { DUTIES, getSeq } from "./roster.js";

export const CAPTION_EXAMPLE_LINE = "Looking for: early finish before 12:00";

// "Fri 6 Nov" — no comma, no year: how drivers write it in the group.
export function shortDayLabel(iso) {
  return new Date(iso + "T12:00:00")
    .toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" })
    .replace(",", "");
}

// data: { roster, date, reportTime, finishTime }
export function buildShareCaption({ roster, date, reportTime, finishTime }) {
  const times = [reportTime && `Report ${reportTime}`, finishTime && `finish ${finishTime}`].filter(Boolean).join(", ");
  const first = `Looking to swap ${roster}${date ? ` – ${shortDayLabel(date)}` : ""}.${times ? ` ${times}.` : ""}`;
  return `${first}\n${CAPTION_EXAMPLE_LINE}`;
}

// First date on/after fromIso whose duty roster matches dayType
// ("weekday" | "saturday" | "sunday"). Uses getDayType so a bank holiday
// counts as a Sunday-duty day, same as everywhere else in the app.
export function nextDateForDayType(dayType, fromIso) {
  for (let i = 0; i < 14; i++) {
    const d = addDays(fromIso, i);
    if (getDayType(d) === dayType) return d;
  }
  return fromIso;
}

export function shareFilename({ roster, date }) {
  const safe = String(roster || "duty").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${safe}${date ? `-${date}` : ""}.png`;
}

// Logged shift (Home card) → share data. Break start comes from the roster
// entry, same as the card itself shows.
export function shareDataFromShift(shift) {
  const t = getDayType(shift.date);
  const duty = DUTIES.find((d) => d.r === shift.roster && d.t === t && d.z === shift.zone);
  return {
    roster: shift.roster, zone: shift.zone, dutyNo: dutyNumber(shift.duty), date: shift.date,
    reportTime: shift.reportTime, breakStart: duty?.b ? duty.bs : null, finishTime: shift.signOffTime,
    seq: getSeq(shift.zone, t, shift.roster),
  };
}

// Roster duty picked in Duty Lookup → share data (date chosen in the sheet).
export function shareDataFromDuty(duty, seq) {
  return {
    roster: duty.r, zone: duty.z, dutyNo: dutyNumber(duty.d2),
    reportTime: duty.s, breakStart: duty.b ? duty.bs : null, finishTime: duty.e, seq,
  };
}

// ─── Image ────────────────────────────────────────────────────────────────
// Fixed dark palette (matches the app's dark card) so the image looks the
// same whichever theme the sharer uses.
const C = {
  bg: "#07090F", card: "#0D1321", border: "#1A2438", text: "#FFFFFF", muted: "#8C99B8",
  accent: "#FFCD00", amber: "#F59E0B", green: "#00C896", blue: "#60a5fa",
};
const FONT = `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
const W = 1080, PAD = 64;
const ENTRY_TIME_W = 150, ENTRY_TEXT_X = PAD + 48 + ENTRY_TIME_W, ENTRY_TEXT_W = W - ENTRY_TEXT_X - PAD;
const ENTRY_FONT = 32, ENTRY_LINE = 42, ENTRY_GAP = 22;

function entryParts(entry) {
  const m = entry.match(/^(\d{1,2}:\d{2})\s*-\s*(.+)$/);
  const time = m ? m[1] : "";
  const desc = (m ? m[2] : entry).trim();
  const low = entry.toLowerCase();
  const color = low.includes("report") ? C.accent
    : low.includes("finish") ? C.green
    : (low.includes("break") && !low.includes("return")) ? C.amber
    : C.blue;
  return { time, desc, color };
}

// Greedy word wrap using a caller-supplied width measurer so it can be unit
// tested without a real canvas (jsdom has none).
export function wrapText(text, maxWidth, measure) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && measure(next) > maxWidth) { lines.push(line); line = w; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

// Pure layout: positions every running-board row and the total height.
export function layoutDutyImage(data, measure) {
  const headerH = 330;           // brand, duty, zone/date, times row
  const boardTitleH = 110;
  let y = headerH + boardTitleH;
  const rows = (data.seq || []).map((entry) => {
    const p = entryParts(entry);
    const lines = wrapText(p.desc, ENTRY_TEXT_W, measure);
    const row = { ...p, lines, y };
    y += Math.max(1, lines.length) * ENTRY_LINE + ENTRY_GAP;
    return row;
  });
  if (!rows.length) y += 60;     // "No running board" line
  const footerH = 110;
  return { width: W, height: y + footerH, rows };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// data: { roster, zone, dutyNo, date, reportTime, breakStart, finishTime, seq }
// async so any failure (no canvas support) arrives as a rejection the sheet
// can show, never a synchronous throw inside a React effect.
export async function renderDutyImage(data) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");
  ctx.font = `500 ${ENTRY_FONT}px ${FONT}`;
  const layout = layoutDutyImage(data, (t) => ctx.measureText(t).width);
  canvas.width = layout.width;
  canvas.height = layout.height;

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, layout.height);
  ctx.fillStyle = C.card;
  roundRect(ctx, 24, 24, W - 48, layout.height - 48, 36);
  ctx.fill();
  ctx.textBaseline = "alphabetic";

  // Brand + duty
  ctx.fillStyle = C.accent;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText("ROSTER BUDDY", PAD, 100);
  ctx.fillStyle = C.text;
  ctx.font = `800 84px ${FONT}`;
  ctx.fillText(data.roster || "", PAD, 186);
  if (data.dutyNo) {
    ctx.font = `700 28px ${FONT}`;
    const label = `Duty No. ${data.dutyNo}`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = `${C.accent}22`;
    roundRect(ctx, W - PAD - tw - 32, 128, tw + 32, 52, 12);
    ctx.fill();
    ctx.fillStyle = C.accent;
    ctx.fillText(label, W - PAD - tw - 16, 164);
  }
  ctx.fillStyle = C.muted;
  ctx.font = `500 32px ${FONT}`;
  const sub = [data.zone, data.date ? new Date(data.date + "T12:00:00").toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" }) : ""].filter(Boolean).join(" · ");
  ctx.fillText(sub, PAD, 236);

  // Times row
  const boxes = [["REPORT", data.reportTime, C.accent]];
  if (data.breakStart) boxes.push(["BREAK", data.breakStart, C.amber]);
  boxes.push(["FINISH", data.finishTime, C.green]);
  const gap = 16, bw = (W - PAD * 2 - gap * (boxes.length - 1)) / boxes.length;
  boxes.forEach(([label, value, color], i) => {
    const x = PAD + i * (bw + gap);
    ctx.fillStyle = C.bg;
    roundRect(ctx, x, 262, bw, 104, 18);
    ctx.fill();
    ctx.fillStyle = C.muted;
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(label, x + 22, 300);
    ctx.fillStyle = color;
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText(value || "–", x + 22, 348);
  });

  // Running board
  ctx.fillStyle = C.muted;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText("RUNNING BOARD", PAD, 432);
  const first = layout.rows[0], last = layout.rows[layout.rows.length - 1];
  if (first && last && first !== last) {
    ctx.fillStyle = C.border;
    ctx.fillRect(PAD + 11, first.y + 30, 3, last.y - first.y);
  }
  for (const r of layout.rows) {
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.arc(PAD + 12, r.y + 30, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `800 ${ENTRY_FONT + 2}px ${FONT}`;
    ctx.fillText(r.time, PAD + 48, r.y + 42);
    ctx.fillStyle = C.text;
    ctx.font = `500 ${ENTRY_FONT}px ${FONT}`;
    r.lines.forEach((ln, i) => ctx.fillText(ln, ENTRY_TEXT_X, r.y + 42 + i * ENTRY_LINE));
  }
  if (!layout.rows.length) {
    ctx.fillStyle = C.muted;
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText("No running board available for this duty", PAD, 470);
  }

  ctx.fillStyle = C.muted;
  ctx.font = `600 26px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("rosterbuddy.ie", W / 2, layout.height - 64);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("image render failed"))), "image/png"));
}

// Returns "shared" | "cancelled" | "downloaded". The caption is copied to
// the clipboard every time: WhatsApp on iPhone often drops text sent along
// with an image, so the driver can paste it.
export async function shareDutyImage({ blob, caption, filename }) {
  try { navigator.clipboard?.writeText(caption)?.catch?.(() => {}); } catch { /* clipboard is best effort */ }
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: caption });
      return "shared";
    } catch (e) {
      if (e?.name === "AbortError") return "cancelled";
      // Any other failure (e.g. lost user activation): fall through to download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "downloaded";
}
