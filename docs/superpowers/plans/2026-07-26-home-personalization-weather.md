# Home Screen Personalization + Weather Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Home's muted "Hi {name}" eyebrow line with a context-aware greeting (time of day + today's duty/rest/day-off state + a positive-only consecutive-shifts streak), and add a small current-weather chip (icon + °C) via the free Open-Meteo API.

**Architecture:** Pure logic split across two existing `lib/*.js` files (by their existing dependency boundaries — see Global Constraints) plus one new `lib/weather.js` module, all independently unit-tested with `vitest`. `HomeScreen.jsx` and `components/shared.jsx` get small, additive JSX changes to render the result. No new persisted fields, no sync/save-path changes.

**Tech Stack:** React (existing), `fetch()` + `localStorage` for weather caching (no new dependencies), Open-Meteo's free current-weather REST API (no key, no signup).

## Global Constraints

- No changes to `shiftFields()`, `performSave()`, sync (`lib/sync.js`), or any persisted-data shape.
- `lib/dutyMath.js` stays roster-independent (no imports from `roster.js`) — only add functions here that need nothing but a `Date`/date string.
- `lib/roster.js` already exports `dayInfo(period, date)` and `periodForDate(periods, date, activePeriodId)` (both handle merged fixed-rest-days and cross-period-boundary resolution correctly) — new duty-context/streak logic MUST reuse these, not re-implement day-off/rest-day resolution.
- Streak text is positive-only: never rendered below a count of 2, never phrased as a warning/nag.
- Weather chip fails silently (renders nothing) on any fetch/parse error or missing cache — no error UI, no retry control.
- Every new pure function gets a `vitest` unit test in the matching `*.test.js` file, consistent with every existing file in `src/lib/`.
- This repo has no component-level test harness for JSX screens — `HomeScreen.jsx`/`components/shared.jsx` changes are verified via `npm run build`/`npm run lint` plus live-browser checks (the throwaway-harness technique used earlier this session is the established fallback when the real app's auth gate blocks a live check).
- Ambiguity resolved by this plan (ready to implement as specified, not left open): the streak walk **excludes today** — it starts at yesterday and walks backward. This is deliberate: most Home opens happen before today's shift is logged, and starting the count at today would show a streak of 0 every morning even after a genuine 10-day run, defeating the point of the encouragement. Today's own status has no effect on the displayed streak number.

---

### Task 1: Time-of-day greeting band (`lib/dutyMath.js`)

**Files:**
- Modify: `src/lib/dutyMath.js` (add one function, anywhere after the existing `today()`/`thisSunday()` helpers)
- Modify: `src/lib/dutyMath.test.js` (add tests)

**Interfaces:**
- Produces: `greetingTimeBand(date = new Date())` → returns `"Good morning"` (05:00–11:59), `"Good afternoon"` (12:00–16:59), or `"Good evening"` (17:00–04:59, wraps past midnight). Takes an optional `Date` object (defaults to `new Date()`) so it's testable without mocking the system clock.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/dutyMath.test.js` (add `greetingTimeBand` to the existing `import { ... } from "./dutyMath.js";` line at the top, and add this new `describe` block anywhere in the file):

```js
describe("greetingTimeBand", () => {
  it("returns Good morning for 05:00-11:59", () => {
    expect(greetingTimeBand(new Date(2026, 6, 26, 5, 0))).toBe("Good morning");
    expect(greetingTimeBand(new Date(2026, 6, 26, 11, 59))).toBe("Good morning");
  });
  it("returns Good afternoon for 12:00-16:59", () => {
    expect(greetingTimeBand(new Date(2026, 6, 26, 12, 0))).toBe("Good afternoon");
    expect(greetingTimeBand(new Date(2026, 6, 26, 16, 59))).toBe("Good afternoon");
  });
  it("returns Good evening for 17:00-23:59 and 00:00-04:59 (wraps past midnight)", () => {
    expect(greetingTimeBand(new Date(2026, 6, 26, 17, 0))).toBe("Good evening");
    expect(greetingTimeBand(new Date(2026, 6, 26, 23, 59))).toBe("Good evening");
    expect(greetingTimeBand(new Date(2026, 6, 26, 0, 0))).toBe("Good evening");
    expect(greetingTimeBand(new Date(2026, 6, 26, 4, 59))).toBe("Good evening");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run dutyMath`
Expected: FAIL with `greetingTimeBand is not defined` (or similar — the import will fail since the function doesn't exist yet).

- [ ] **Step 3: Implement**

Add to `src/lib/dutyMath.js`:

```js
export function greetingTimeBand(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  return "Good evening";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run dutyMath`
Expected: PASS, all tests in the file green (existing tests unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dutyMath.js src/lib/dutyMath.test.js
git commit -m "$(cat <<'EOF'
Add greetingTimeBand for the Home screen personalized greeting

Pure time-of-day classifier (morning/afternoon/evening) - no roster
dependency, takes an optional Date so it's testable without mocking
the system clock.
EOF
)"
```

---

### Task 2: Duty/day context + consecutive-shift streak (`lib/roster.js`)

**Files:**
- Modify: `src/lib/roster.js` (add two functions, near the existing `dayInfo`/`periodForDate` at the bottom of the "ROSTER DATA" section)
- Create: `src/lib/roster.test.js` (new file — none exists yet for this module)

**Interfaces:**
- Consumes: `dayInfo(period, date)` and `periodForDate(periods, date, activePeriodId)`, both already defined earlier in the same file — no new imports needed, `addDays` is already imported from `./dutyMath.js` at the top of `roster.js`.
- Produces:
  - `greetingDutyContext(period, date)` → a string fragment: `"you're on {roster} today"` (real shift), `"enjoy your rest day"` (a day-off whose `type` is exactly `"Rest Day"`), `"you're on {type} today"` (any other day-off type — Annual Leave, Sick Day, etc.), or `"nothing logged for today yet"` (unlogged, or the date falls outside the period's range).
  - `computeShiftStreak(periods, activePeriodId, todayDate)` → an integer ≥ 0. Walks backward from the day *before* `todayDate` (today itself is excluded — see Global Constraints), incrementing on a real shift, skipping through (not stopping on, not incrementing) a day-off, and stopping at the first `"unlogged"` day. Capped at 60 days of walking so a period with no data before it can't loop indefinitely.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/roster.test.js`:

```js
import { describe, it, expect } from "vitest";
import { greetingDutyContext, computeShiftStreak } from "./roster.js";

const PERIOD = {
  id: "p1",
  startDate: "2026-07-19",
  shifts: [
    { id: "s1", date: "2026-07-20", roster: "SZ1/01" },
    { id: "s2", date: "2026-07-21", roster: "SZ1/02" },
    { id: "s3", date: "2026-07-23", roster: "SZ1/03" },
  ],
  daysOff: [
    { id: "d1", date: "2026-07-22", type: "Rest Day" },
    { id: "d2", date: "2026-07-24", type: "Annual Leave" },
  ],
};

describe("greetingDutyContext", () => {
  it("returns the roster when a real shift is logged", () => {
    expect(greetingDutyContext(PERIOD, "2026-07-20")).toBe("you're on SZ1/01 today");
  });
  it("returns the rest-day phrasing for a Rest Day", () => {
    expect(greetingDutyContext(PERIOD, "2026-07-22")).toBe("enjoy your rest day");
  });
  it("returns the day-off type for a non-rest-day day-off", () => {
    expect(greetingDutyContext(PERIOD, "2026-07-24")).toBe("you're on Annual Leave today");
  });
  it("returns the unlogged phrasing when nothing is logged", () => {
    expect(greetingDutyContext(PERIOD, "2026-07-25")).toBe("nothing logged for today yet");
  });
  it("returns the unlogged phrasing for a date outside the period", () => {
    expect(greetingDutyContext(PERIOD, "2026-09-01")).toBe("nothing logged for today yet");
  });
});

describe("computeShiftStreak", () => {
  it("counts consecutive shifts backward from yesterday, skipping over day-offs", () => {
    // today=2026-07-25 (unlogged) -> streak looks at 24 (Annual Leave, skip),
    // 23 (shift, +1), 22 (Rest Day, skip), 21 (shift, +1), 20 (shift, +1), 19 (period start, unlogged -> stop)
    expect(computeShiftStreak([PERIOD], "p1", "2026-07-25")).toBe(3);
  });
  it("today's own status never affects the count", () => {
    // Same today date (2026-07-25, unlogged) in both cases - the only difference
    // is whether today itself also has a shift. The walk starts at yesterday and
    // never inspects today, so both must produce the same count (3).
    const withTodayLogged = {
      ...PERIOD,
      shifts: [...PERIOD.shifts, { id: "s4", date: "2026-07-25", roster: "SZ1/04" }],
    };
    expect(computeShiftStreak([PERIOD], "p1", "2026-07-25")).toBe(computeShiftStreak([withTodayLogged], "p1", "2026-07-25"));
  });
  it("stops at the first unlogged day and returns 0 if yesterday itself is unlogged", () => {
    expect(computeShiftStreak([PERIOD], "p1", "2026-07-21")).toBe(1); // yesterday=20 (shift,+1), day before=19 (period start, unlogged -> stop)
    expect(computeShiftStreak([PERIOD], "p1", "2026-07-20")).toBe(0); // yesterday=19, period start date itself has nothing before it logged -> unlogged -> stop immediately
  });
  it("returns 0 when periods is empty or the date is far outside any period", () => {
    expect(computeShiftStreak([], "p1", "2026-07-25")).toBe(0);
    expect(computeShiftStreak([PERIOD], "p1", "2099-01-01")).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run roster.test`
Expected: FAIL — `greetingDutyContext`/`computeShiftStreak` are not exported yet.

- [ ] **Step 3: Implement**

Add to `src/lib/roster.js`, directly after the existing `dayInfo` function:

```js
// Builds the Home-screen greeting's duty/day-context clause from the same
// resolution `dayInfo` already does for the Upcoming carousel - no separate
// rest-day/day-off logic to keep in sync.
export function greetingDutyContext(period, date) {
  const info = dayInfo(period, date);
  if (info.status === "shift") return `you're on ${info.shift.roster} today`;
  if (info.status === "dayoff") {
    return info.dayOff.type === "Rest Day" ? "enjoy your rest day" : `you're on ${info.dayOff.type} today`;
  }
  return "nothing logged for today yet";
}

// Consecutive-shift streak for the Home greeting, positive-only framing.
// Deliberately excludes todayDate itself (see plan's Global Constraints) -
// starts the walk at the day before today and goes backward. A rest day or
// any other day-off is skipped through (doesn't break the streak, doesn't
// add to it); the first truly unlogged day stops the walk. Capped at 60
// days so a period with nothing logged before it can't loop indefinitely.
export function computeShiftStreak(periods, activePeriodId, todayDate) {
  let count = 0;
  let cursor = addDays(todayDate, -1);
  for (let i = 0; i < 60; i++) {
    const period = periodForDate(periods, cursor, activePeriodId);
    const info = dayInfo(period, cursor);
    if (info.status === "shift") { count++; cursor = addDays(cursor, -1); continue; }
    if (info.status === "dayoff") { cursor = addDays(cursor, -1); continue; }
    break;
  }
  return count;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run roster.test`
Expected: PASS, all 9 test cases green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/roster.js src/lib/roster.test.js
git commit -m "$(cat <<'EOF'
Add greetingDutyContext and computeShiftStreak for the Home greeting

Both reuse the existing dayInfo()/periodForDate() resolution (merged
fixed rest days, cross-period boundary handling) instead of
re-implementing day-off logic. The streak walk deliberately excludes
today itself - most Home opens happen before today's shift is logged,
so counting from today would always show a streak of 0 in the morning
even after a real run of consecutive days.
EOF
)"
```

---

### Task 3: Weather module (`lib/weather.js`)

**Files:**
- Create: `src/lib/weather.js`
- Create: `src/lib/weather.test.js`

**Interfaces:**
- Produces:
  - `isWeatherCacheFresh(cache, now = Date.now())` → boolean. `cache` is `{tempC, code, fetchedAt}` or falsy; fresh means `now - cache.fetchedAt < 45 minutes`.
  - `weatherIconKind(code)` → one of `"clear" | "cloudy" | "fog" | "rain" | "snow" | "storm"`, mapped from an Open-Meteo WMO weather code. Unknown/unmapped codes fall back to `"cloudy"` (never throws, never returns something a consumer has to guard against).
  - `async fetchWeather()` → `Promise<{tempC: number, code: number} | null>`. Returns a fresh cached value without a network call if one exists; otherwise fetches from Open-Meteo, caches the result, and returns it; on any failure (network error, non-OK response, malformed JSON) falls back to a stale cached value if one exists, otherwise resolves to `null`. Never throws — every failure path is caught.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/weather.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isWeatherCacheFresh, weatherIconKind, fetchWeather } from "./weather.js";

describe("isWeatherCacheFresh", () => {
  it("is fresh within 45 minutes", () => {
    const now = 1000000;
    expect(isWeatherCacheFresh({tempC:10, code:0, fetchedAt: now - 44*60*1000}, now)).toBe(true);
  });
  it("is stale after 45 minutes", () => {
    const now = 1000000;
    expect(isWeatherCacheFresh({tempC:10, code:0, fetchedAt: now - 46*60*1000}, now)).toBe(false);
  });
  it("is not fresh when there's no cache", () => {
    expect(isWeatherCacheFresh(null)).toBe(false);
    expect(isWeatherCacheFresh(undefined)).toBe(false);
  });
});

describe("weatherIconKind", () => {
  it("maps known WMO codes to icon kinds", () => {
    expect(weatherIconKind(0)).toBe("clear");
    expect(weatherIconKind(2)).toBe("cloudy");
    expect(weatherIconKind(45)).toBe("fog");
    expect(weatherIconKind(61)).toBe("rain");
    expect(weatherIconKind(71)).toBe("snow");
    expect(weatherIconKind(95)).toBe("storm");
  });
  it("falls back to cloudy for an unknown code", () => {
    expect(weatherIconKind(9999)).toBe("cloudy");
  });
});

describe("fetchWeather", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("returns a fresh cached value without calling fetch", async () => {
    localStorage.setItem("dbus_weather_cache", JSON.stringify({tempC:12, code:1, fetchedAt: Date.now()}));
    const result = await fetchWeather();
    expect(result).toEqual({tempC:12, code:1});
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches, caches, and returns fresh data when no cache exists", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ current_weather: { temperature: 14.6, weathercode: 3 } }) });
    const result = await fetchWeather();
    expect(result).toEqual({tempC:15, code:3});
    const cached = JSON.parse(localStorage.getItem("dbus_weather_cache"));
    expect(cached.tempC).toBe(15);
    expect(cached.code).toBe(3);
  });

  it("falls back to a stale cache on fetch failure", async () => {
    localStorage.setItem("dbus_weather_cache", JSON.stringify({tempC:8, code:61, fetchedAt: Date.now() - 60*60*1000}));
    fetch.mockRejectedValue(new Error("network down"));
    const result = await fetchWeather();
    expect(result).toEqual({tempC:8, code:61});
  });

  it("returns null when the fetch fails and there is no cache at all", async () => {
    fetch.mockRejectedValue(new Error("network down"));
    const result = await fetchWeather();
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run weather.test`
Expected: FAIL — `src/lib/weather.js` doesn't exist yet.

- [ ] **Step 3: Implement**

Create `src/lib/weather.js`:

```js
// Current-weather chip for the Home greeting - Open-Meteo, no API key, no
// signup, free for this usage pattern. Fixed Dublin/Summerhill-area
// coordinates since only Summerhill has a live roster today (see
// lib/garages.js) - revisit if/when other garages go live.
const WEATHER_CACHE_KEY = "dbus_weather_cache";
const WEATHER_CACHE_MS = 45 * 60 * 1000;
const DUBLIN_LAT = 53.35;
const DUBLIN_LON = -6.26;

export function isWeatherCacheFresh(cache, now = Date.now()) {
  return !!cache && typeof cache.fetchedAt === "number" && (now - cache.fetchedAt) < WEATHER_CACHE_MS;
}

function readCache() {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(tempC, code) {
  try { localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ tempC, code, fetchedAt: Date.now() })); } catch {}
}

export async function fetchWeather() {
  const cached = readCache();
  if (isWeatherCacheFresh(cached)) return { tempC: cached.tempC, code: cached.code };

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${DUBLIN_LAT}&longitude=${DUBLIN_LON}&current_weather=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("weather fetch failed");
    const json = await res.json();
    const tempC = Math.round(json.current_weather.temperature);
    const code = json.current_weather.weathercode;
    writeCache(tempC, code);
    return { tempC, code };
  } catch {
    // Offline or the API is down - a stale cached value beats showing nothing
    // if one exists; otherwise there's genuinely nothing to show.
    if (cached) return { tempC: cached.tempC, code: cached.code };
    return null;
  }
}

// Maps an Open-Meteo WMO weather code (https://open-meteo.com/en/docs) to
// one of a small set of icon kinds this app draws inline (see WeatherIcon
// in components/shared.jsx) - never throws, unknown codes fall back to the
// generic "cloudy" icon rather than the caller having to guard against an
// unrecognized kind.
export function weatherIconKind(code) {
  if (code === 0) return "clear";
  if ([1, 2, 3].includes(code)) return "cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "cloudy";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run weather.test`
Expected: PASS, all cases green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/weather.js src/lib/weather.test.js
git commit -m "$(cat <<'EOF'
Add lib/weather.js for the Home screen weather chip

Open-Meteo current-weather fetch with a 45-minute localStorage cache
(same offline-first pattern as roster-data caching) and a WMO-code to
icon-kind mapping. Every failure path (network error, bad response,
no cache) is caught and resolves to a stale cache or null - never
throws, so the UI layer can render nothing rather than an error state.
EOF
)"
```

---

### Task 4: Wire the greeting + streak + weather chip into Home

**Files:**
- Modify: `src/components/shared.jsx` (add `WeatherIcon` and `WeatherChip` components)
- Modify: `src/screens/HomeScreen.jsx` (replace the eyebrow line, add the streak line, add weather fetch + render)

**Interfaces:**
- Consumes: `greetingTimeBand` (from `../lib/dutyMath.js`, already imported in `HomeScreen.jsx` as part of its existing import line — add it to that line), `greetingDutyContext`/`computeShiftStreak` (from `../lib/roster.js`, already imported in `HomeScreen.jsx` — add them to that existing import line), `fetchWeather`/`weatherIconKind` (new import from `../lib/weather.js`), `WeatherChip` (new import from `../components/shared.jsx`).
- Produces: no new exports consumed elsewhere — this task is a leaf in the dependency graph.

- [ ] **Step 1: Add `WeatherIcon` and `WeatherChip` to `src/components/shared.jsx`**

Add near the other small icon components (e.g. directly after `NavIcon`, before `BottomNav`):

```jsx
// Small inline weather icon set for the Home greeting's weather chip -
// matches this app's existing SVG-only convention (see BusLogo/NavIcon) -
// no emoji, since low-end Android renders emoji as blank boxes.
export function WeatherIcon({kind, size=16}) {
  const s = {width:size, height:size, fill:"none", stroke:"currentColor", strokeWidth:1.8, strokeLinecap:"round", strokeLinejoin:"round"};
  if (kind==="clear") return (
    <svg viewBox="0 0 24 24" style={s}>
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
      <line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/>
      <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
      <line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>
    </svg>
  );
  if (kind==="fog") return (
    <svg viewBox="0 0 24 24" style={s}>
      <path d="M17 12a4 4 0 0 0-3.7-4A5 5 0 0 0 4 9.5"/>
      <line x1="3" y1="16" x2="21" y2="16"/><line x1="5" y1="20" x2="19" y2="20"/>
    </svg>
  );
  if (kind==="rain") return (
    <svg viewBox="0 0 24 24" style={s}>
      <path d="M17 13a4 4 0 0 0-3.7-6A5 5 0 0 0 4 8.5 3.5 3.5 0 0 0 4.5 15h11.8"/>
      <line x1="8" y1="18" x2="8" y2="21"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="16" y1="18" x2="16" y2="21"/>
    </svg>
  );
  if (kind==="snow") return (
    <svg viewBox="0 0 24 24" style={s}>
      <path d="M17 13a4 4 0 0 0-3.7-6A5 5 0 0 0 4 8.5 3.5 3.5 0 0 0 4.5 15h11.8"/>
      <line x1="8" y1="18" x2="8" y2="18.5"/><line x1="12" y1="19" x2="12" y2="19.5"/><line x1="16" y1="18" x2="16" y2="18.5"/>
    </svg>
  );
  if (kind==="storm") return (
    <svg viewBox="0 0 24 24" style={s}>
      <path d="M17 13a4 4 0 0 0-3.7-6A5 5 0 0 0 4 8.5 3.5 3.5 0 0 0 4.5 15h6.5"/>
      <polyline points="13 14 10 19 13 19 11 23"/>
    </svg>
  );
  return ( // "cloudy" and any unrecognized kind
    <svg viewBox="0 0 24 24" style={s}>
      <path d="M17 13a4 4 0 0 0-3.7-6A5 5 0 0 0 4 8.5 3.5 3.5 0 0 0 4.5 15h11.8"/>
    </svg>
  );
}

export function WeatherChip({tempC, code}) {
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,background:CARD,border:`1px solid ${BORDER}`,borderRadius:999,padding:"3px 9px",fontSize:12,fontWeight:700,color:MUTED,flexShrink:0}}>
      <WeatherIcon kind={code} size={14}/>
      {tempC}°C
    </span>
  );
}
```

Note: `WeatherChip` takes the already-resolved icon `kind` string via its `code` prop's caller — to keep this component free of a `weatherIconKind` import (so `shared.jsx` doesn't need to import from `lib/weather.js`), `HomeScreen.jsx` (Step 3 below) calls `weatherIconKind(weather.code)` itself and passes the resulting kind string as `WeatherChip`'s `code` prop. Rename that prop mentally to "icon kind" - it is a string like `"clear"`/`"rain"`, not a numeric WMO code, despite the prop name; keep the prop named `code` only for brevity in this small component, matching no existing convention that would be broken by a clearer name — **implementer's choice:** if `code` reads confusingly as you write this, name the prop `iconKind` instead and update the one call site in Step 3 to match. Either is fine; just be consistent between this component and its call site.

`CARD`, `BORDER`, `MUTED` are already imported at the top of `shared.jsx` (confirm before assuming — check the file's existing import line).

- [ ] **Step 2: Verify `shared.jsx` builds with the new components**

Run: `npm run build`
Expected: clean (these new exports aren't consumed yet, so this just confirms no syntax errors).

- [ ] **Step 3: Wire into `HomeScreen.jsx`**

**3a. Update imports.** Find the existing import lines near the top of `HomeScreen.jsx`:

```jsx
import { MAX_HOURS, MAX_SUNDAY, getDayType, addDays, fmtShort, fmtHrs, today, calcSpreadover } from "../lib/dutyMath.js";
import { isActiveOn } from "../lib/routeAlerts.js";
import { DUTIES, shiftDepartLocation, shiftBreakEnd, pStats, periodForDate, dayInfo, getSeq } from "../lib/roster.js";
import { BG, CARD, BORDER, CARD2, TEXT, MUTED, ACCENT, SUCCESS, DANGER, btnStyle, tag } from "../lib/theme.js";
import { daysSinceLastBackup, isBackupNudgeSnoozed, notifyOnce, loadSettings, saveSettings } from "../lib/persistence.js";
import { BackupNudgeBanner, RouteAlertBanner, ConfirmDialog } from "../components/shared.jsx";
```

Replace with:

```jsx
import { MAX_HOURS, MAX_SUNDAY, getDayType, addDays, fmtShort, fmtHrs, today, calcSpreadover, greetingTimeBand } from "../lib/dutyMath.js";
import { isActiveOn } from "../lib/routeAlerts.js";
import { DUTIES, shiftDepartLocation, shiftBreakEnd, pStats, periodForDate, dayInfo, getSeq, greetingDutyContext, computeShiftStreak } from "../lib/roster.js";
import { BG, CARD, BORDER, CARD2, TEXT, MUTED, ACCENT, SUCCESS, DANGER, btnStyle, tag } from "../lib/theme.js";
import { daysSinceLastBackup, isBackupNudgeSnoozed, notifyOnce, loadSettings, saveSettings } from "../lib/persistence.js";
import { fetchWeather, weatherIconKind } from "../lib/weather.js";
import { BackupNudgeBanner, RouteAlertBanner, ConfirmDialog, WeatherChip } from "../components/shared.jsx";
```

**3b. Add weather state + fetch.** Find this existing line inside `HomeScreen` (right after the other `useState` declarations, near `const [backupBannerDismissed, setBackupBannerDismissed] = useState(false);`):

```jsx
  const [backupBannerDismissed, setBackupBannerDismissed] = useState(false);
```

Add immediately after it:

```jsx
  const [weather, setWeather] = useState(null);
  useEffect(() => { fetchWeather().then(setWeather); }, []);
```

**3c. Compute the greeting/streak values.** Find this existing line (right after `todayDate`/`cwIdx` etc. are computed, near `const todayRestEntry = ...`):

```jsx
  const todayRestEntry = (cw.daysOff||[]).find(d => d.date === todayDate && d.type === "Rest Day");
```

Add immediately after it:

```jsx
  const dutyContext = greetingDutyContext(period, todayDate);
  const shiftStreak = computeShiftStreak(periods, period.id, todayDate);
```

**3d. Replace the eyebrow line.** Find this exact line in the header block:

```jsx
            <p style={{color:MUTED,fontSize:11,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:2,fontWeight:600}}>{driverFirstName?`Hi ${driverFirstName}`:"Shift Tracker"}</p>
```

Replace with:

```jsx
            {driverFirstName ? (
              <>
                <p style={{color:TEXT,fontSize:15,fontWeight:700,margin:"0 0 4px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span>{greetingTimeBand()}, {driverFirstName} — {dutyContext}.</span>
                  {weather && <WeatherChip tempC={weather.tempC} code={weatherIconKind(weather.code)}/>}
                </p>
                {shiftStreak >= 2 && (
                  <p style={{color:ACCENT,fontSize:12,fontWeight:600,margin:"0 0 4px"}}>{shiftStreak} shifts logged in a row — nice work.</p>
                )}
              </>
            ) : (
              <p style={{color:MUTED,fontSize:11,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:2,fontWeight:600}}>Shift Tracker</p>
            )}
```

(This passes `weatherIconKind(weather.code)` as `WeatherChip`'s `code` prop, per the naming note in Task 4 Step 1 — if you renamed that prop to `iconKind` there, use `iconKind={weatherIconKind(weather.code)}` here instead, matching whichever name you chose.)

- [ ] **Step 4: Build and lint clean**

Run: `npm run build`
Expected: clean, module count may increase by 1 (the new `weather.js` module) — not a regression, just a new file being bundled.

Run: `npm run lint`
Expected: no new warnings.

- [ ] **Step 5: Live-verify in browser**

This repo's real app is auth-gated against a production Supabase backend with no test credentials available (a known, previously-hit limitation in this repo — see project memory). Use the throwaway-harness technique: a temporary `harness.html`/`harness.jsx` at the repo root (never committed, deleted immediately after checking) that mounts `HomeScreen` directly with mock `period`/`periods`/`driverFirstName` props, served via a scratch-port `vite` dev server. Check:

1. A driver with `driverFirstName` set and a real shift logged today → greeting reads `"{time band}, {name} — you're on {roster} today."` matching the actual system time when the check runs.
2. A driver with a rest day today → `"...enjoy your rest day."`
3. A driver with no `driverFirstName` set → falls back to the plain "Shift Tracker" line, no greeting/streak/weather rendered in that branch (matches today's exact existing behavior for this case).
4. Seed `period.shifts`/`daysOff` so a streak of 3+ exists ending yesterday → confirm the streak line renders with the right count and doesn't appear at all when the streak is 0 or 1.
5. Weather: since a real network fetch may or may not succeed in the harness environment, verify both branches deliberately — once with `fetch` allowed to run for real (chip should appear with a plausible Dublin temperature if online), and once by stubbing `fetchWeather` (or blocking the network call) to resolve `null` (confirm the chip is simply absent, no layout gap, no console error).

Do not claim this verification happened if you don't have a working browser available — do a careful static trace instead and say so explicitly in your report.

- [ ] **Step 6: Commit**

```bash
git add src/components/shared.jsx src/screens/HomeScreen.jsx
git commit -m "$(cat <<'EOF'
Wire personalized greeting, streak, and weather chip into Home

Replaces the muted "Hi {name}" eyebrow line with a context-aware
greeting (time of day + today's actual duty/rest/day-off state) and
adds a positive-only consecutive-shifts streak line plus a small
current-weather chip. No driverFirstName set falls back to today's
exact existing "Shift Tracker" text - no half-personalized greeting
without a name.
EOF
)"
```

---

## Post-implementation

After all four tasks: re-read the full header block in `HomeScreen.jsx` once to confirm it reads correctly for all four driver states (named + shift, named + rest day, named + nothing logged, no name at all), then do one full live click-through on a fresh Home load confirming the header doesn't visually break at a narrow (375px) viewport width with a long duty roster code and the weather chip both present on the same line (the `flexWrap:"wrap"` in Step 3d's JSX should handle this, but confirm rather than assume).
