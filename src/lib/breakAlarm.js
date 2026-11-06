// In-app break alarm. The push notification (sw.js) covers a locked phone or
// closed app, where a web app can't ring; while Roster Buddy is open on
// screen, this rings properly: a looping alarm tone plus vibration until the
// driver taps Stop. Same timing as the push: breakReminderMinutes before the
// duty's break end. Settings: alarmSound / alarmVibrate (default on).
import { getDayType, addDays } from "./dutyMath.js";
import { DUTIES } from "./roster.js";
import { shiftBreakEnd } from "./pushDuty.js";

export const ALARM_GRACE_MS = 5 * 60000; // still ring if opened just after fireAt
const FIRED_KEY = "rb_break_alarm_fired";

// Today's (or an overnight duty from yesterday's) break that hasn't ended.
// Returns { shift, breakEnd: Date, fireAt: Date } or null.
export function upcomingBreakAlarm(periods, now, leadMins, duties = DUTIES) {
  const pad = (n) => String(n).padStart(2, "0");
  const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const dates = [addDays(todayIso, -1), todayIso];
  const shifts = (periods || []).flatMap((p) => p.shifts || []).filter((s) => dates.includes(s.date));
  let best = null;
  for (const s of shifts) {
    const breakEnd = shiftBreakEnd({ ...s, dayType: getDayType(s.date) }, duties);
    if (!breakEnd || breakEnd <= now) continue;
    const fireAt = new Date(breakEnd.getTime() - (leadMins || 10) * 60000);
    if (!best || fireAt < best.fireAt) best = { shift: s, breakEnd, fireAt };
  }
  return best;
}

// "Should it ring now, and if not, how long until it should?"
// Returns { ringNow: bool, waitMs: number | null }.
export function alarmTiming(alarm, now, firedId) {
  if (!alarm) return { ringNow: false, waitMs: null };
  const id = alarmId(alarm);
  if (firedId === id) return { ringNow: false, waitMs: null };
  const diff = alarm.fireAt.getTime() - now.getTime();
  if (diff <= 0) return { ringNow: -diff <= ALARM_GRACE_MS, waitMs: null };
  return { ringNow: false, waitMs: diff };
}

export function alarmId(alarm) {
  return `${alarm.shift.id}|${alarm.breakEnd.toISOString()}`;
}
export function loadFired() { try { return localStorage.getItem(FIRED_KEY); } catch { return null; } }
export function saveFired(id) { try { localStorage.setItem(FIRED_KEY, id); } catch { /* best effort */ } }

// ─── Sound + vibration ────────────────────────────────────────────────────
let ctx = null, master = null, beepTimer = null, buzzTimer = null;

// Alarm tune: the opening phrase of "The Wheels on the Bus" (traditional
// melody), played as notes only — "…go round and round, round and round,
// round and round" — then a short pause, repeated until Stop.
// [frequency Hz, length in beats]
const C5 = 523.25, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880, C6 = 1046.5;
export const BUS_TUNE = [
  [C5, 0.5], [F5, 1], [F5, 0.5], [F5, 0.5], [F5, 1], [A5, 1], [C6, 1], [A5, 1], [F5, 2],
  [G5, 1], [E5, 1], [C5, 2],
  [C6, 1], [A5, 1], [F5, 2],
];
const BEAT_S = 0.28;
const TUNE_GAP_S = 0.9;
export const TUNE_LOOP_MS = Math.round((BUS_TUNE.reduce((n, [, b]) => n + b, 0) * BEAT_S + TUNE_GAP_S) * 1000);

function playTune() {
  let t = ctx.currentTime + 0.05;
  for (const [f, beats] of BUS_TUNE) {
    const d = beats * BEAT_S;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    g.gain.setValueAtTime(0.22, t + d * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d * 0.95);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + d);
    t += d;
  }
}

// Browsers only allow sound/vibration once the person has tapped the page
// at least once since it loaded; if they haven't, the alarm still shows
// full screen and these quietly do nothing.
export function startAlarm({ sound = true, vibrate = true } = {}) {
  stopAlarm();
  if (sound) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        ctx = ctx || new AC();
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        // All notes go through one gain node so Stop can silence notes
        // already queued, not just stop new loops.
        master = ctx.createGain();
        master.connect(ctx.destination);
        playTune();
        beepTimer = setInterval(playTune, TUNE_LOOP_MS);
      }
    } catch { /* no audio */ }
  }
  if (vibrate && navigator.vibrate) {
    const buzz = () => { try { navigator.vibrate([600, 250, 600]); } catch { /* no vibration */ } };
    buzz();
    buzzTimer = setInterval(buzz, 2000);
  }
}

export function stopAlarm() {
  const wasBuzzing = !!buzzTimer;
  if (beepTimer) clearInterval(beepTimer);
  if (buzzTimer) clearInterval(buzzTimer);
  beepTimer = buzzTimer = null;
  if (master) { try { master.disconnect(); } catch { /* ignore */ } master = null; }
  // Only cancel a vibration we started; calling it before any tap logs a
  // browser error.
  if (wasBuzzing) { try { navigator.vibrate?.(0); } catch { /* ignore */ } }
}

// Share the two switches with the service worker (it can't read
// localStorage), so the push notification respects them too.
export async function syncAlarmPrefsToServiceWorker(settings) {
  try {
    if (!("caches" in window)) return;
    const c = await caches.open("rb-prefs");
    await c.put("/__rb_prefs", new Response(JSON.stringify({
      alarmSound: settings.alarmSound !== false,
      alarmVibrate: settings.alarmVibrate !== false,
    }), { headers: { "Content-Type": "application/json" } }));
  } catch { /* best effort */ }
}
