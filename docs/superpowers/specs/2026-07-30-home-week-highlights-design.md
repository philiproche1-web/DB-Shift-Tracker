# Home screen week highlights

## Problem

The Home screen shows today's duty and a 29-day scrollable carousel, but nothing summarizes the current week's shape at a glance — a driver has to scroll the carousel day-by-day to notice they've got a short weekend coming up, a CPC day, or that their annual leave starts this week.

## Goals

- One small widget on Home, between the header and the Upcoming carousel, listing the current week's notable things: the recurring rest-day pattern (named as "short weekend"/"long weekend" when it matches those shapes), CPC/Training days, and the start of any Annual Leave/Sick Day/Force Majeure/Self Cert block.
- Read-only, derived entirely from existing data (`period.shifts`, `period.daysOff`, `FIXED_REST_PATTERN`) — no new persisted fields, no new Supabase schema.
- Reuses the app's existing week concept: periods always start on a Sunday (enforced in Settings), so "this week" is just `stats.weeks[wi]` — the same Sun–Sat week `HomeScreen` already computes for the 5-week grid and "This week" hours stat.

## Non-goals

- No lookahead beyond the current week — next week's shape isn't shown here (the carousel below already covers up to 21 days forward).
- No cross-period detection — a leave block that started in a previous archived period and rolls into this one may be misreported as "starts this week" (see Known limitation). Not fixing now; low frequency given periods are contiguous 5-week blocks.
- No change to weekend naming for anything other than the recurring rest-day pattern — Annual Leave/Sick Day/Force Majeure/Self Cert landing on Sat+Sun is still announced via the leave-length line, never renamed "short weekend" (confirmed with Phil).

## Design

### Data: `weekHighlights(period, weekStart)` — new pure function in `roster.js`

Takes the same `period` object and a week-start date (`cw.start`, already computed in `HomeScreen`) and returns an ordered array of highlight strings, built from three independent categories:

**1. Rest days.** Merge real + auto-generated rest days for the week via the existing `withFixedRestDays`, filter to `type === "Rest Day"` and `date` within `[weekStart, weekStart+6]`, collect the weekday names in date order (chronological, not alphabetical).
- Set is exactly `{Sat, Sun}` → `"Short weekend"`
- Set is exactly `{Sat, Sun, Mon}` → `"Long weekend"`
- Otherwise → `"Off {Weekday}"` / `"Off {Weekday} & {Weekday}"` / `"Off {Weekday}, {Weekday} & {Weekday}"` (full weekday names, Oxford-less list)
- Zero rest days this week → no line (shouldn't normally happen given the standard roster always yields 2/week, but a driver who removed both via "stop treating as automatic rest day" could hit this)

**2. Special day-offs.** Scan `period.daysOff` for contiguous same-type runs (unbroken consecutive calendar dates, same `type`, type ≠ "Rest Day"). For each run whose **start date** falls within this week:
- `dayCount % 7 === 0 && dayCount >= 7` → `"{N} week{s} {Type} starts this week"`
- otherwise → `"{N} day{s} {Type} starts this week"`
- A run already in progress before this week (start date before `weekStart`) produces nothing — silent continuation, per Phil's call.

**3. CPC/Training.** Filter `period.shifts` for `fixedType === "cpc"` and `date` within the week, collect weekday names in date order, same list format as category 1: `"CPC · {Weekday}"` / `"CPC · {Weekday} & {Weekday}"`.

All three categories' lines are collected into one flat array and all shown — no de-duplication or "pick one" logic (confirmed with Phil: show everything, stacked).

### UI: new `WeekHighlights` component

Rendered in `HomeScreen.jsx` between the header block and `<UpcomingCarousel/>`. Takes the `weekHighlights(...)` array; renders nothing if the array is empty (defensive — see category 1's zero-rest-days edge case), otherwise a small card with one line per highlight string, no icons/color-coding beyond the existing card style (matches the plain, informational tone of the rest of Home's cards).

### Known limitation

A leave/sick/etc. run's start date is only checked against `period.daysOff` — the active period's own data. If real leave genuinely started in the prior archived period and the boundary falls mid-run, this week could still read "starts this week" for a run that actually started earlier. Accepted as a rare edge case for this pass.

## Testing

Pure-function unit tests in `roster.test.js` (or a new `weekHighlights.test.js`) covering: plain 2-day pattern, short weekend, long weekend, a special-day-off run starting mid-week, a run continuing from before the week (expect silence), a week-count vs day-count boundary (exactly 7 days vs 8 days), and a CPC day combined with a rest-day pattern in the same week (expect both lines).
