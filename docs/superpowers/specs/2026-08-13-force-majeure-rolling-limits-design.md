# Force Majeure Rolling Limits — Design

## Problem

The Leave page's Force Majeure card is factually wrong. It shows
`"No fixed limit · Jan–Dec"` and counts days by calendar year, same as
Annual Leave. The real entitlement (Irish Force Majeure Leave, Parental
Leave Act 1998 as amended 2006 — confirmed against the stakeholder's own
union-rep info, matches) is capped at **3 days in any rolling 12 consecutive
months** and **5 days in any rolling 36 consecutive months** — not a
calendar-year reset. A driver who takes a Force Majeure day in, say,
November still has it counting against their 12-month cap the following
March.

Separately, the stakeholder wanted confirmation that Force Majeure days
show up correctly on the Period screen's weekly view, same as Sick Day/
Annual Leave. Checked: they already do. `PeriodScreen.jsx`'s day-off
rendering is fully generic — it displays whatever string is in a day-off
entry's `type` field, with no hardcoded list, and Force Majeure already has
its own Home-greeting phrase and week-highlights treatment elsewhere in the
codebase. **No change needed there** — this design is Leave-page-only.

## Goal

Replace the Force Majeure card with one that: explains the real rule in
plain language, and shows two live, rolling counters (12-month and
36-month) instead of the current wrong single "used this calendar year"
count.

## Scope decisions (from stakeholder discussion)

- **Rolling windows, not calendar-year.** Both counters recompute live off
  today's date: the 12-month counter includes every Force Majeure day with
  `date >= today − 365 days`; the 36-month counter includes every Force
  Majeure day with `date >= today − 1095 days` (365×3). This matches the
  stakeholder's own worked example (an FM taken this year still counts
  toward the 36-month cap the following January, not reset at year-end).
- **Two counters, not one**, mirroring the existing `SelfCertCard`'s
  two-panel layout (which already handles a "multiple metrics for one leave
  type" card in this codebase) rather than inventing a new pattern.
- **The windows are nested, not disjoint.** Unlike Self Cert's clean
  Jan–Jun/Jul–Dec halves, a recent Force Majeure day legitimately appears in
  *both* the 12-month and 36-month date lists — that's correct, not a bug,
  because the entitlement really is "≤3 in any 12 months **and** ≤5 in any
  36 months" simultaneously, not two separate banked allowances.
- **Plain-language explainer in the card itself**, not just fixed subtitle
  text: *"Unforeseen family emergencies — capped at 3 days per rolling 12
  months, 5 days per rolling 36 months."*

## Data (`src/screens/LeaveScreen.jsx`)

The existing `allDaysOff` memo is calendar-year-scoped
(`d.date.startsWith(String(year))`) and is correctly kept as-is for Annual
Leave/Sick Day/Self Cert, which are genuinely calendar-year resets. Force
Majeure needs its own, separate, non-year-scoped computation:

```js
const allDaysOffEver = useMemo(() => periods.flatMap(p => p.daysOff || []), [periods]);
const fmAll = useMemo(
  () => allDaysOffEver.filter(d => d.type === "Force Majeure").sort((a,b) => a.date.localeCompare(b.date)),
  [allDaysOffEver]
);
const todayDate = today();
const fm12 = fmAll.filter(d => d.date >= addDays(todayDate, -365));
const fm36 = fmAll.filter(d => d.date >= addDays(todayDate, -1095));
```

The current line computing `fm` (year-scoped, from the existing
`allDaysOff`) is removed — replaced by the above.

## Card UI (`ForceMajeureCard`, new component alongside `SelfCertCard`)

Same structural pattern as `SelfCertCard` (collapsible header, traffic dot,
two side-by-side sub-panels on expand):

- Header subtitle: the plain-language explainer above (replaces the old
  "No fixed limit · Jan–Dec").
- Header traffic dot: worst-of-both-panels color.
- Two sub-panels, **"Last 12 months"** (cap 3) and **"Last 36 months"**
  (cap 5), each showing:
  - remaining/used (`{cap - count} left` / `{count} of {cap} used`)
  - its own traffic dot, colored via a small helper: `0 used → SUCCESS`,
    `used < cap → amber (#F59E0B)`, `used >= cap → DANGER`
  - its own date list (reusing the existing edit/delete row pattern from
    `SelfCertCard`'s sub-panels) — `fm12`'s dates for the first panel,
    `fm36`'s dates for the second (deliberately overlapping per the nested-
    windows decision above).

## Edge cases

- A Force Majeure day exactly 365 (or 1095) days old: included, since the
  filter is `>=`, matching "any 12/36 consecutive months" inclusively.
- No Force Majeure ever logged: both panels show `0 of 3/5 used`, green,
  empty date list with the existing empty-state message style (reworded
  from "No force majeure logged this year" to reflect the rolling window,
  e.g. "No force majeure logged" with no year qualifier since it's no
  longer year-scoped).
- Editing/deleting a Force Majeure entry from either panel needs to work
  the same as every other leave type's edit/delete today — no new logic
  needed here since it already flows through the same `onEditDayOff`/
  `onDeleteDayOff` props `SelfCertCard` already uses.

## Testing

- No component test framework exists in this repo (checked consistently
  across every feature built today) — this is a pure display/derivation
  change with no new business logic in `roster.js`/`dutyMath.js` (the
  rolling-window filtering is simple date comparison living directly in
  `LeaveScreen.jsx`), so verification is `npm run build` plus manual
  checks: log a Force Majeure day, confirm both counters increment
  correctly and the card no longer shows the old wrong copy.
