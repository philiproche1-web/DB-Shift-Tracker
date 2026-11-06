// Short "ta-da" for a new badge, synthesised with Web Audio (no audio file
// to download). Browsers only allow sound after the person has tapped
// something on the page, so the very first pop-up on opening the app may be
// silent; badges earned right after logging something will play. Off when
// settings.badgeSound === false. Phones on silent/vibrate stay silent.
import { loadSettings } from "./persistence.js";

let ctx = null;

export function badgeSoundEnabled() {
  return loadSettings().badgeSound !== false;
}

export function playBadgeSound() {
  try {
    if (!badgeSoundEnabled()) return false;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = ctx || new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    // C5 E5 G5 then a held C6: a quick rising "yay".
    [[523.25, 0, 0.12], [659.25, 0.1, 0.12], [783.99, 0.2, 0.12], [1046.5, 0.32, 0.45]].forEach(([f, t, d]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.25, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + d);
      o.connect(g).connect(ctx.destination);
      o.start(now + t);
      o.stop(now + t + d + 0.05);
    });
    return true;
  } catch {
    return false;
  }
}
