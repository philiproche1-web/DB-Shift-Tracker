# Custom (Fixed) Rest Days — Design

## Problem

~90% of drivers follow the standard 5-week rotating rest-day pattern
(`FIXED_REST_PATTERN` in `src/lib/roster.js`), which auto-generates virtual
Rest Days for everyone. A minority of drivers — full-time drivers with a
fixed weekly schedule, and part-time drivers who work the same days every
week — have a different, simpler arrangement: the same weekday(s) off every
single week, forever, until changed. The app currently has no way to
override the global pattern per-driver.

## Goal

Let a driver opt into a personal weekly-repeating rest-day pattern from
Settings, which fully replaces the global 5-week pattern for them (not
additive) until they turn it back off.

## Scope decisions (from stakeholder discussion)

- **Replace, not additive.** Enabling this turns off the global 5-week
  pattern for that driver entirely; only their chosen weekday(s) generate
  virtual Rest Days.
- **Flexible weekday count.** Not locked to 2 — a part-time driver might work
  only 2 days and rest the other 5. Multi-select across all 7 weekdays, no
  enforced minimum/maximum.
- **Forward-only.** Turning it on applies from *today* onward within the
  current period. Past dates already resolved by the global pattern are left
  alone — no retroactive rewrite, and no waiting for the next period
  boundary either.
- **Bank holidays don't override it.** If a custom rest weekday lands on an
  Irish bank holiday, the driver still gets the day off — the custom rest
  day wins. (Verified this is actually free: `dayInfo()` already checks
  `mergedDaysOff` — which will include the custom Rest Day — before it ever
  reaches bank-holiday duty typing. No special-casing needed.)
- **Persisted to Supabase `profiles`**, same table/pattern as `garage` and
  `first_name` today, so it syncs across a driver's devices.

## Data model

New columns on `profiles`:

| column | type | default | notes |
|---|---|---|---|
| `custom_rest_days_enabled` | boolean | `false` | |
| `custom_rest_weekdays` | int[] | `'{}'` | 0=Sunday ... 6=Saturday |
| `custom_rest_days_since` | date | `null` | stamped to today on the OFF→ON transition only; editing the weekday selection while already enabled does not reset it |

Migration file added under `supabase/migrations/`.

## Core logic (`src/lib/roster.js`)

- New module-level state, mirroring how `FIXED_REST_PATTERN` is already
  mutated at runtime (see `applyRosterData`):
  ```js
  let CUSTOM_REST_CONFIG = { enabled: false, weekdays: new Set(), since: null };
  export function setCustomRestConfig(profile) { ... }
  ```
  Called once from `App.jsx` right after the profile fetch, alongside where
  `driverGarage` is set.

- `withFixedRestDays(startDate, daysOff, shifts, removedFixed)` branches:
  - If `CUSTOM_REST_CONFIG.enabled`: generate virtual Rest Days for every
    date in the period from `max(periodStart, since)` through the period end
    whose weekday is in `CUSTOM_REST_CONFIG.weekdays`.
  - Else: unchanged — `fixedRestDates(startDate)` 5-week pattern as today.
  - In both cases the same skip-if-taken (`taken` set of existing
    shifts/day-offs) and skip-if-removed (`removedFixedRestDates`) logic
    applies, and generated entries keep the same shape
    (`{ id: "fixed-<date>", date, type: "Rest Day", fixed: true }"`).

- No other call site changes. `dayInfo`, `pStats`, `weekHighlights`, PDF
  export, Home streak — all call `withFixedRestDays` already and keep
  working unmodified since the function's contract doesn't change.

## Settings UI (`src/screens/SettingsPanel.jsx`)

New "Fixed Rest Days" section, styled consistently with the existing garage
editor:

- Toggle switch (on/off).
- Row of 7 weekday chips (Sun–Sat), multi-select.
- Save button → local state → new `onChangeCustomRestDays(enabled, weekdays)`
  prop (mirrors `onChangeGarage`) → `supabase.from("profiles").update(...)` →
  toast on success/failure.
- Turning ON with zero weekdays selected is blocked client-side (need at
  least 1 selected to save as enabled).
- Turning OFF just flips `enabled` to `false`; the last weekday selection is
  left in the row so re-enabling later remembers the previous picks.

## Edge cases

- Real shift or manually-logged day-off already on a custom rest weekday
  (a swap/cover) → skipped automatically by the existing `taken` check.
- Driver deletes one of their generated custom Rest Days from the log → goes
  into `removedFixedRestDates`, same mechanism as the global pattern's swap
  exceptions today.
- All 7 weekdays selected (zero working days) → allowed, not blocked.
  Unrealistic but harmless; not worth special-casing.

## Testing

- `roster.test.js`: new cases for `withFixedRestDays` under custom config —
  weekly-repeat generation, `since`-date cutoff, skip-if-taken,
  skip-if-removed, and confirming disabled config falls back to the
  unchanged global-pattern behavior.
- Bank-holiday test file: one case confirming a custom rest day on a bank
  holiday resolves to `dayoff`, not a forced Sunday duty.
- No UI test framework exists in this repo today (checked) — Settings
  toggle gets manual verification only, same as garage/name editing.
