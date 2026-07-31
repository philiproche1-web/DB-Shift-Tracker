# Home screen week highlights

## Problem

The Home screen shows today's duty and a 29-day scrollable carousel, but nothing summarizes the current week's shape at a glance — a driver has to scroll the carousel day-by-day to notice they've got a short weekend coming up, a CPC day, or that their annual leave starts this week.

## Goals

- One small widget on Home, between the header and the Upcoming carousel, listing the current week's notable things: the recurring rest-day pattern (named as "short weekend"/"long weekend" when it matches those shapes), CPC/Training days, and the start of any Annual Leave/Sick Day/Force Majeure/Self Cert block.
- Read-only, derived entirely from existing data (`period.shifts`, `period.daysOff`, `FIXED_REST_PATTERN`) — no new persisted fields, no new Supabase schema.
- Reuses the app's existing week concept: periods always start on a Sunday (enforced in Settings), so "this week" is just `stats.weeks[wi]` — the same Sun–Sat week `HomeScreen` already computes for the 5-week grid and "This week" hours stat.

## Non-goals

- No lookahead beyond the current week — next week's shape isn't shown here (the carousel below already covers up to 21 days forward).
- No change to weekend naming for anything other than the recurring rest-day pattern — Annual Leave/Sick Day/Force Majeure/Self Cert landing on Sat+Sun is still announced via the leave-length line, never renamed "short weekend" (confirmed with Phil).

## Design (v2 — revised after the first implementation's final review)

The first implementation pass (`weekHighlights(period, weekStart)`, single-period, week-clamped) shipped through both task reviews clean, but the whole-branch final review caught a real defect: since periods always start on a Sunday, a single Sun–Sat week's own Saturday and Sunday are 6 days apart (opposite ends of the week), never adjacent — so a real Sat+Sun weekend can never be detected by looking within one week alone. It always straddles two consecutive weeks (Saturday of week N + Sunday of week N+1), and for the period's last week, straddles into a period that may not exist yet. Verified against the real bundled `FIXED_REST_PATTERN`: week 3's Saturday + week 4's Sunday is a genuine short weekend, and week 5's Saturday + the next period's Sunday+Monday is a genuine long weekend — neither fired under the v1 design. Separately, a leave run's true length was truncated at whichever period boundary happened to contain the query, even when the driver had already logged the whole block across both periods in one sitting.

### Data: `weekHighlights(periods, activePeriodId, weekStart)` — new pure function in `roster.js`

Signature changed from v1 to take all periods (`periods`, the array `HomeScreen` already has) plus `activePeriodId` (mirrors `computeShiftStreak(periods, activePeriodId, todayDate)`'s existing signature), instead of a single `period`. Resolves `period = periods.find(p => p.id === activePeriodId)` internally. Returns the same ordered `string[]` as v1, built from the same three categories:

**1. Rest days.** Filter the active period's merged (real + auto) rest days to `date` within `[weekStart, weekEnd]` as before. Then check whether `weekEnd` (this week's Saturday) is itself a rest day, and whether the following one/two days are also rest days via a new `isRestDayDate(date)` helper — which looks within the active period's own merged data for dates up to the period's last day, and beyond that either reads the **real** next period's own data (if `periods` already contains one starting the day after this period ends) or **synthesizes** it via `fixedRestDates()` on that hypothetical start date (safe because `FIXED_REST_PATTERN` is a fixed constant, not per-period data — a period that doesn't exist yet can't have manual overrides).
- Saturday is a rest day AND the following Sunday is too → `"Short weekend"`; if the day after that (Monday) is too → `"Long weekend"` instead.
- Any other rest days this week (not part of that Sat/Sun/Mon run) still get their own `"Off {Weekday}..."` line alongside it.
- No Saturday-anchored weekend detected → falls back to the plain `"Off {Weekday}"` / `"Off {Weekday} & {Weekday}"` / `"Off {Weekday}, {Weekday} & {Weekday}"` list, chronological order, same as v1.
- **Accepted asymmetry:** this only looks forward (this week's Saturday into next week's Sunday/Monday), not backward. A week whose own Sunday(+Monday) is actually the tail of the *previous* week's already-announced weekend (e.g. week 4's Sunday, week 1's Sunday+Monday after a period boundary) will still list that Sunday again in its own plain "Off" line — a minor, accepted redundancy, not a fix attempted here. The forward-only check is what covers Phil's two confirmed real-world cases (week 3 → short weekend, week 5 → long weekend).
- Zero rest days this week → no line (unchanged from v1; still possible if a driver removed both auto rest days).

**2. Special day-offs.** Scan `periods.flatMap(p => p.daysOff || [])` — **all periods, not just the active one** — for contiguous same-type runs. For each run whose start date falls within this week, same phrasing rule as v1 (`"{N} week{s}/day{s} {Type} starts this week"`). Scanning across all periods means a driver who logged an 18-day Annual Leave block in one sitting (spanning a period boundary) gets the true 18 reported, not whatever fraction happens to sit in the active period. This also fixes, as a side effect, the v1 "run started in an even earlier archived period" gap — the true start is now visible regardless of which period holds it, so continuation is correctly silent no matter how far back the run actually began.

**3. CPC/Training.** Unchanged from v1 — filters the active period's own `shifts` for `fixedType === "cpc"` within the week. Not affected by the cross-period concerns above (CPC days are single dates, not multi-day runs).

All three categories' lines are collected into one flat array and all shown — no de-duplication or "pick one" logic (confirmed with Phil: show everything, stacked).

### UI: new `WeekHighlightsCard` component

Rendered in `HomeScreen.jsx` between the header block and `<UpcomingCarousel/>`. Takes the `weekHighlights(...)` array; renders nothing if the array is empty, otherwise a small card with one line per highlight string, no icons/color-coding beyond the existing card style. Call site updated to `weekHighlights(periods, period.id, cw.start)` (both `periods` and `period` are already props `HomeScreen` has).

## Testing

Pure-function unit tests in `roster.test.js` covering: plain 2-day pattern, the week-3→4 short weekend (standard pattern, within one period), the week-5→next-period long weekend both synthesized (no real next period in `periods`) and from a real next period's own data, a special-day-off run starting mid-week, a run continuing from before the week — including from an earlier *period* now, not just an earlier date in the same period (expect silence), an 18-day leave run spanning a period boundary reporting its true total, a week-count vs day-count boundary (exactly 7 days vs 8 days), and a CPC day combined with a rest-day pattern in the same week (expect both lines).
