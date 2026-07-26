# Home screen personalization + weather

## Problem

Home's only personalization today is a muted eyebrow line — `driverFirstName ? "Hi {name}" : "Shift Tracker"` (`src/screens/HomeScreen.jsx:269`) — that doesn't react to what's actually happening today (duty, rest day, time of day) and is easy to miss. There's also no weather anywhere in the app, despite drivers checking it constantly for their shift.

## Goals

- Turn the greeting into a real, prominent, context-aware line: time of day + today's actual duty/day state + a positive-only streak of consecutive shifts logged.
- Add a small, glanceable current-weather chip (icon + °C) near the greeting, with zero setup cost (no API key, no backend).
- Keep both additive and low-risk — no changes to save/sync logic, `dutyMath.js`'s compliance math, or any persisted-data shape.

## Non-goals

- No forecast-at-shift-time matching — weather shows current conditions only.
- No punitive/nagging streak copy — a broken or short streak is simply not shown, never called out.
- No change to the existing period date-range headline or its layout — the greeting is a new line above it.
- No garage-specific weather location for this pass (fixed Dublin coordinates) — multi-garage weather is a future extension if/when other garages go live (see [[db_5wk_tracker_multigarage_split]] in project memory), not required now since only Summerhill has a live roster.

## Design

### A — Personalized greeting

New line rendered **above** the existing period date-range headline in `HomeScreen.jsx`'s header block (`:266-285`). The existing eyebrow line (`driverFirstName?"Hi ${driverFirstName}":"Shift Tracker"`) is replaced by this new line; nothing else in the header changes.

**Composition:** `{time-of-day greeting}, {name} — {duty/day context}`, e.g. *"Good morning, Phil — you're on SZ1/07 today."*

- **Time-of-day band**, by local hour (`new Date().getHours()`): 5–11 → "Good morning", 12–16 → "Good afternoon", 17–4 (wraps past midnight) → "Good evening".
- **Name fallback:** if `driverFirstName` is unset, drop the time-of-day+name clause entirely and fall back to the existing generic "Shift Tracker" text — the duty/day-context clause still doesn't apply without a name context, so this is a full fallback to today's exact current behavior, not a partial one.
- **Duty/day context**, checked in this order against today's actual state (mirrors the existing `todayShift`/`todayRestEntry` logic already computed in `HomeScreen` at `:205-209`, plus a new day-off check):
  1. Real shift logged today → `you're on {shift.roster} today`
  2. Scheduled/logged rest day → `enjoy your rest day`
  3. A day-off (Annual Leave, Sick Day, etc.) logged today → `you're on {dayOff.type} today`
  4. Nothing logged → `nothing logged for today yet`
- **Streak line**, rendered as a second, smaller line directly under the greeting, **only when the computed streak is ≥ 2**: `"{N} shifts logged in a row — nice work."` Computed by walking backward from today, day by day: a day with a real shift increments the count and continues; a day with a rest day or day-off is skipped over (doesn't increment, doesn't stop the walk — normal days off never look like a broken streak); a day with nothing logged stops the walk. The walk never crosses a period boundary awkwardly since `period.shifts`/`daysOff` are date-keyed, not week-keyed — no period-object lookup issues expected, but the implementer should confirm data for the walk is available for dates before the current period's start if the streak would otherwise be artificially cut short (see plan).

### B — Weather chip

Small inline chip (weather icon + temperature in °C) rendered next to or directly under the new greeting line — same header block, no new section on the page.

- **Data source:** [Open-Meteo](https://open-meteo.com) current-weather API — free, no signup, no API key, no rate-limit concerns for this usage pattern. Fixed Dublin coordinates (approx. 53.35, -6.26 — Summerhill garage's rough area, since only Summerhill has a live roster today per [[db_5wk_tracker_multigarage_split]]).
- **Fetch + cache:** client-side `fetch()` on Home mount, cached in `localStorage` with a timestamp; a cached value younger than ~45 minutes is reused without a new network call — same offline-first spirit as the existing roster-data caching (`lib/persistence.js`/`lib/roster.js` patterns), so a driver opening the app repeatedly doesn't cause a fetch storm and the app still shows the last-known weather if opened offline.
- **Icon mapping:** Open-Meteo returns a WMO weather code; map the common codes (clear, partly cloudy, overcast, fog, drizzle/rain, snow, thunderstorm) to a small set of existing-style SVG icons (matching this app's icon conventions elsewhere — inline SVG, no external icon library, no emoji per the app's established SVG-over-emoji convention flagged in project memory).
- **Failure handling:** if the fetch fails (network error, API error, or the browser is offline with no cached value yet), the chip simply does not render — no error banner, no placeholder, no retry UI. This is a nice-to-have enhancement, not a load-bearing feature; silent omission is correct here.
- **Temperature format:** whole-number Celsius, e.g. `14°C` — no decimal, no Fahrenheit toggle (out of scope, this app is Ireland-only).

## Data flow / state changes

No new persisted fields, no schema changes, no changes to `shiftFields()`/`performSave()`/sync. New local state in `HomeScreen`:
- Derived (not stored) values for the greeting: time-of-day band, duty/day-context string, and the streak count — all computed from props already passed into `HomeScreen` (`period`, `periods`, `driverFirstName`) plus `today()`. No new props required from `App.jsx` unless the streak walk needs access to shifts from a prior period (see Edge cases) — the implementer should read how `periods` is currently threaded through before assuming a new prop is needed.
- One new small module, e.g. `lib/weather.js`, exporting a `fetchWeather()` (returns `{tempC, code}` or `null` on failure) and the WMO-code-to-icon mapping — kept separate from `HomeScreen.jsx` itself so the fetch/cache logic has one clear responsibility and can be unit-tested with `vitest` like the rest of `lib/*.js` (mocking `fetch`), unlike the JSX-only work elsewhere in this app which has no test harness.

## Edge cases

- **Driver with no first name set:** greeting fully reverts to the current generic text — no half-personalized "Good morning — you're on SZ1/07 today" without a name, since that reads oddly with no name.
- **Streak crossing a period boundary:** if today is early in a new period, the streak walk may want to look at shifts logged in the previous (now-archived) period. `periods` (the full array, already passed to `HomeScreen` for the Upcoming carousel's `periodForDate`) should be available for this — confirm during implementation whether the walk needs the archived period's `shifts` array too, or whether limiting the streak count to the active period only is an acceptable simplification (a shift logged in a closed period is real work either way, so truncating the streak at a period boundary would be a minor cosmetic inaccuracy, not a data bug — implementer's call if it adds meaningfully more complexity).
- **Weather offline on first-ever launch:** no cached value exists yet and the network call fails — chip simply doesn't render, matches the general failure-handling rule above.
- **Time-of-day band spanning midnight:** 17:00–23:59 and 00:00–04:59 both count as "Good evening" — a driver on a late/night duty opening the app at 2am should not see "Good morning."

## Testing / verification plan

- `lib/weather.js`'s pure logic (WMO-code→icon mapping, cache-freshness check) gets real `vitest` unit tests, mocking `fetch` — consistent with every other `lib/*.js` file in this codebase.
- The streak-walk logic, if extracted as a pure function (recommended — keeps it testable), also gets unit tests: a run of consecutive shifts, a run interrupted by a rest day (streak continues), a run interrupted by an unlogged day (streak stops there), a streak of exactly 0 or 1 (not shown).
- `HomeScreen.jsx`'s new render logic is UI-only and follows this repo's established pattern for screens with no test harness: `npm run build`/`npm run lint` clean, plus live-browser verification (via the throwaway-harness technique used earlier this session, or the real dev server if auth/test data allows) covering: each duty/day-context branch, the no-name fallback, a real streak render, weather chip present vs. absent (simulate fetch failure).
