# Duty number display

## Problem

A driver logs into an in-cab machine ("AutoZone") to identify which route/duty they're working, using a plain numeric duty code — not the app's own duty label (e.g. `SZ1/1X`, `SZ2/01`). For duties whose app label carries an "X" suffix (`1X`, `2X`, ...), drivers also think of the duty by its underlying real number (e.g. "1X" = duty 68). Right now the app never shows this number anywhere — a driver has no on-screen reference for what to key into the machine, or what a colleague means when they say "duty 68."

## Goals

- Show a `"Duty No. {N}"` tag near the top of every place a duty appears: Today's/Tomorrow's Duty card (Home), Duty Lookup, each logged entry on the Period screen, and the PDF export.
- Source this from data the app already has — no new Supabase schema, no new persisted fields.
- Fix the one real data gap found during investigation: all 80 Zone 1 Saturday duties are missing this number in the bundled roster data.

## Non-goals

- No change to the app's own duty label (`SZ1/1X`, `SZ2/01`, etc.) — drivers still search/pick duties the same way they always have. This is an additional reference number alongside the existing label, not a replacement.
- No display for Spare or CPC/Training entries — confirmed with Phil these have no real duty number in the data, so no tag shows for them (not blank/placeholder, the tag is simply absent).

## Design

### Where the number already lives

Every `DUTIES` catalog entry has a `d2` field, originally added purely as an internal lookup key for `getSeq()` (the running-board sequence table) — never surfaced to drivers. Investigation (2026-07-31) confirmed its last 3 characters are exactly the real duty number drivers mean:

| Entry | `d2` | Real number |
|---|---|---|
| Zone 1, duty 1, weekday | `005001` | 1 |
| Zone 2, duty 1, weekday | `005101` | 101 (matches Phil's own example) |
| Zone 2, duty 2, weekday | `005102` | 102 |
| Zone 1, "1X", weekday | `005068` | 68 |
| Zone 1, "1X", Sunday | `005071` | 71 (different real number per day-type, as Phil described) |
| Skerries, duty 1, weekday | `201` | 201 |
| "150", duty 1, weekday | `005251` | 251 |

When a shift is logged from a real `DUTIES` entry, `d2` is already copied onto the saved shift as `shift.duty` (`src/screens/LogScreen.jsx:150`, `duty: fixedType ? fixedType : (isSpare ? "spare" : duty.d2)`) — so a logged shift never needs to re-look-up the `DUTIES` catalog to find its own number.

**One data gap found:** all 80 Zone 1 Saturday duties have `d2` set to a duplicate of their own `r` label (e.g. `d2: "SZ1/01"`) instead of a numeric code — every other zone/day-type combination (390 total duties, 310 with a clean numeric `d2`) has the real number already. Confirmed with Phil: re-derive these 80 from the Zone 1 gospel PDF's Saturday section "DUTY N" headers, same extraction convention already used for this app's data (see `db_5wk_tracker_gospel_sources` project memory for file locations), and backfill both `public/roster-data.json` (live) and the bundled `DUTIES` const in `src/lib/roster.js` (offline fallback) — both must be fixed, a fix to only one looks correct in dev (HMR reads the bundle) but wrong in prod or vice versa.

### `dutyNumber(code)` — new pure helper in `src/lib/dutyMath.js`

```javascript
export function dutyNumber(code) {
  if (!code || !/^\d+$/.test(code)) return null;
  return String(parseInt(code.slice(-3), 10));
}
```

Takes either a `DUTIES` entry's `d2` or a saved shift's `shift.duty` (both are the same kind of value). Returns the trailing 3 digits with leading zeros stripped (`"005068"` → `"68"`, `"201"` → `"201"`), or `null` for anything non-numeric (`"spare"`, a `fixedType` key like `"cpc"`, or — until the data-fix above lands — the Zone 1 Saturday `r`-duplicate gap). Callers render nothing when this returns `null`.

### Display: four call sites, same `"Duty No. {n}"` tag

1. **`TodayDutyCard`, Home** (`src/screens/HomeScreen.jsx:36`) — next to the existing roster-number line (`{shift.roster}`), reads `dutyNumber(shift.duty)`.
2. **Duty Lookup** (`src/screens/DutyLookup.jsx:115`) — in the duty summary strip, next to `{duty.r}`, reads `dutyNumber(duty.d2)`.
3. **Period screen, each logged entry** (`src/screens/PeriodScreen.jsx:122`) — in the existing tag row (alongside the day-type/Spare/Rest day/OT tags at `:123-128`), reads `dutyNumber(item.duty)`.
4. **PDF export** (`src/lib/pdfExport.js:44`) — next to `${item.roster}`, reads `dutyNumber(item.duty)`.

All four are additive (a new small tag/span placed next to text that already exists) — no restructuring of any of these screens' layouts.

## Testing

Pure-function unit tests for `dutyNumber` in `dutyMath.test.js`: strips leading zeros from a 6-digit code, passes through an already-3-digit code unchanged, returns `null` for `"spare"`/`"cpc"`/`null`/`undefined`/empty string, and returns `null` for a non-numeric roster-label fallback (the Zone 1 Saturday gap shape, pre-fix) to confirm callers correctly show nothing rather than a wrong number.

The data-fix (80 Zone 1 Saturday duties) is a one-off data task, not something a unit test can cover — verified by spot-checking a handful of the corrected entries' numbers against the source PDF by eye, and confirming the post-fix `DUTIES` array has zero non-numeric `d2` gaps left (same audit script used to find the 80 in the first place, re-run to confirm it now returns 0).
