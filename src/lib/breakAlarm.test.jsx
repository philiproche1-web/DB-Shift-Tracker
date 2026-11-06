import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { upcomingBreakAlarm, alarmTiming, alarmId, ALARM_GRACE_MS } from "./breakAlarm.js";
import { BreakAlarm } from "../components/BreakAlarm.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// SZ1/15X Mon–Fri: break 12:40 → 16:10 (Dublin). 6 Nov 2026 is a Friday, GMT.
const DUTIES = [{ z: "Zone 1", t: "weekday", r: "SZ1/15X", be: "16:10" }];
const shift = { id: "s1", date: "2026-11-06", zone: "Zone 1", roster: "SZ1/15X" };
const periods = [{ id: "p", startDate: "2026-11-01", shifts: [shift], daysOff: [] }];
const at = (hhmm) => new Date(`2026-11-06T${hhmm}:00Z`);

describe("upcomingBreakAlarm", () => {
  it("fires breakReminderMinutes before the duty's break end", () => {
    const a = upcomingBreakAlarm(periods, at("15:00"), 10, DUTIES);
    expect(a.breakEnd.toISOString()).toBe("2026-11-06T16:10:00.000Z");
    expect(a.fireAt.toISOString()).toBe("2026-11-06T16:00:00.000Z");
  });
  it("nothing once the break has ended, or for spare / no-break duties", () => {
    expect(upcomingBreakAlarm(periods, at("16:11"), 10, DUTIES)).toBeNull();
    expect(upcomingBreakAlarm([{ ...periods[0], shifts: [{ ...shift, isSpare: true }] }], at("15:00"), 10, DUTIES)).toBeNull();
    expect(upcomingBreakAlarm(periods, at("15:00"), 10, [{ ...DUTIES[0], be: null }])).toBeNull();
  });
});

describe("alarmTiming", () => {
  const a = upcomingBreakAlarm(periods, at("15:00"), 10, DUTIES);
  it("waits until fireAt, then rings once", () => {
    expect(alarmTiming(a, at("15:00"), null)).toEqual({ ringNow: false, waitMs: 60 * 60000 });
    expect(alarmTiming(a, at("16:00"), null).ringNow).toBe(true);
    expect(alarmTiming(a, at("16:02"), alarmId(a)).ringNow).toBe(false);
  });
  it("doesn't ring if the app is opened long after fireAt", () => {
    const late = new Date(a.fireAt.getTime() + ALARM_GRACE_MS + 1000);
    expect(alarmTiming(a, late, null).ringNow).toBe(false);
  });
});

describe("BreakAlarm", () => {
  let mounted;
  afterEach(() => { act(() => mounted?.root.unmount()); mounted?.c.remove(); mounted = null; });
  it("shows the break end time and Stop closes it", () => {
    const c = document.createElement("div"); document.body.appendChild(c);
    const root = createRoot(c); mounted = { root, c };
    let stopped = 0;
    const a = upcomingBreakAlarm(periods, at("15:00"), 10, DUTIES);
    act(() => { root.render(<BreakAlarm alarm={a} sound vibrate onStop={() => stopped++}/>); });
    expect(c.textContent).toContain("Break ending");
    expect(c.textContent).toContain("SZ1/15X");
    act(() => { [...c.querySelectorAll("button")].find((b) => b.textContent === "Stop").click(); });
    expect(stopped).toBe(1);
  });
});
