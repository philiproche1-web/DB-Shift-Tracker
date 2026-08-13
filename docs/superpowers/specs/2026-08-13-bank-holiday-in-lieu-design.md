# Bank Holiday In Lieu — Design

## Problem

When a driver works a bank holiday, they choose between bank holiday pay
(extra pay that day, no leave impact) or a normal day's pay plus 1¼ days
added to their annual leave entitlement ("day in lieu"). The app currently
has no way to record this choice or track the resulting entitlement bonus —
a driver taking the in-lieu option has no record of it anywhere in the app,
and their Annual Leave entitlement total never reflects it.

## Goal

When a driver logs a shift worked on a bank holiday, prompt them for which
option they took. If "day in lieu," record it with its date and
automatically add 1¼ days to their Annual Leave entitlement — visibly and
traceably, via a new Leave page card.

## Scope decisions (from stakeholder discussion)

- **Tied to shift logging, not a standalone Leave-page entry.** The
  stakeholder's own framing: ~60% of drivers take bank holiday pay, ~40%
  take the day in lieu, and the real-world choice is made "on the day" via
  a physical form at the depot — so prompting at the moment of logging the
  shift mirrors the real process and removes a manual step, rather than
  asking the driver to separately remember to log it later.
- **Mandatory choice, no skip.** The prompt must be answered before the
  shift saves — no "decide later." This matches the real-world process
  (the depot form is filled in at the time), so there's no legitimate
  "undecided" state to support.
- **Only fires on a brand-new shift log, not on later edits.** Editing an
  already-logged bank-holiday shift's times/hours doesn't re-ask — the
  payroll choice was already made once, in reality, and shouldn't be
  disturbed by an unrelated correction.
- **Only "Day in Lieu" leaves a record.** "Bank Holiday Pay" needs nothing
  stored beyond the shift itself — it has no entitlement impact.
- **The Annual Leave total is computed, not mutated.** Rather than bumping
  the stored `annualTotal` setting directly, the Leave page computes
  `entitlement + (bank holidays in lieu × 1.25)` live from the list of
  dated in-lieu entries. This is what makes the stakeholder's stated goal —
  "if there's ever a discrepancy, the driver can go back and see which date
  it's for" — actually true: deleting a wrongly-logged entry corrects the
  total automatically, with no separate "undo the bonus" step to forget.
- **Multi-date logging** (a driver can log several dates as one shift entry
  via the existing "extra days" picker): if more than one date in that
  batch is a bank holiday, prompt once per bank-holiday date, in sequence,
  before the final save.

## Data model

New day-off type, `"Bank Holiday In Lieu"`, stored in the period's
`daysOff` array exactly like every other type (`{id, date, type}`) — but
deliberately **not** added to `DAY_OFF_TYPES`/`LOGGABLE_DAY_OFF_TYPES` in
`dutyMath.js`. Those two lists drive the manual "Log Day Off" picker; this
type is created automatically by the shift-logging flow only, never
manually chosen.

This reuses the existing pattern safely:
- `dayInfo()` already checks a real shift before checking `daysOff` for a
  given date, so a Bank Holiday In Lieu entry coexisting with the actual
  worked shift on the same date causes no conflict — same as how a Self
  Cert entry can already coexist with a shift today (existing, unrelated
  behavior).
- `dayOffTally()` only counts types already present in `DAY_OFF_TYPES`, so
  it automatically ignores this new type with no code change needed there.
- `PeriodScreen`'s week view renders `daysOff` generically with no
  type whitelist, so a Bank Holiday In Lieu entry **will** show up
  alongside the real shift in that week's list, italicized like any other
  day-off type. This is treated as a deliberate, wanted side effect —
  consistent extra visibility into why that day was significant — not
  something to suppress.
- `weekHighlights()`'s "special day-off run" detection (`roster.js`)
  currently filters `d.type !== "Rest Day"` to decide what counts as a
  highlight-worthy run. This must also exclude `"Bank Holiday In Lieu"` —
  without the exclusion, working a bank holiday would incorrectly surface
  as a "day off starts this week" highlight on Home, which is backwards
  (the driver worked that day). Filter becomes
  `d.type !== "Rest Day" && d.type !== "Bank Holiday In Lieu"`.

## Shift-logging flow (`LogScreen.jsx`)

Before calling `performSave()`, check every date being saved (`[date,
...extraDays]`) for `isBankHoliday(d) && !isRestDay` (a bank holiday date
where the driver is logging a real worked shift, not marking it as a rest
day). For each such date, show a required modal:

> **You worked a bank holiday — how's it being paid?**
> [ Bank Holiday Pay ]  [ Day in Lieu (+1¼ annual leave) ]

Collect the choice for each bank-holiday date in the batch (sequential
modals if more than one), then call `onSave` with the existing shift
payload plus a new second argument: an array of the resulting Bank Holiday
In Lieu day-off entries to create (empty array if every choice was "Pay").

This check only runs when `!editShift` (a brand-new shift being logged) —
editing an existing shift skips it entirely, per the "only fires once"
decision above.

## `App.jsx` — `saveShift`

Extend `saveShift(shiftOrArray, bankHolidayInLieuEntries)` — the existing
first-argument shape and behavior (single shift or array, upsert-by-id,
date-collision guard) is unchanged. The new second argument, when
non-empty, is merged into the same period's `daysOff` array in the same
`persist()` call, so the shift and its in-lieu record save atomically —
no risk of one succeeding without the other.

## Leave page (`LeaveScreen.jsx`)

- New non-year-scoped-vs-calendar-year question: bank holidays in lieu
  **are** calendar-year scoped, same as Annual Leave itself (an in-lieu day
  earned this year adds to this year's entitlement) — reuse the existing
  `allDaysOff` (already year-filtered), no new rolling-window logic needed
  here (unlike Force Majeure).
- `bhil = allDaysOff.filter(d => d.type === "Bank Holiday In Lieu")`
- Annual Leave card's total becomes
  `leaveSettings.annualTotal + bhil.length * 1.25`, with the subtitle
  showing the breakdown for transparency, e.g.
  `"20 + 2×1¼ in lieu = 22.5 days entitlement · Jan–Dec"` when `bhil.length
  > 0`, falling back to the current plain `"{annualTotal} days entitlement
  · Jan–Dec"` when there are none — no need to clutter the common case with
  a "+0" breakdown.
- New card, "Bank Holiday In Lieu," same structural pattern as the existing
  simple cards (`LeaveCard`, no total/remaining concept needed — every
  entry is a flat +1¼ addition, there's no cap to track against). Subtitle:
  *"Added automatically when you log a bank holiday shift as day in lieu."*
  Body: `DayList` of `bhil` entries (date + edit/delete, same as every
  other card), each showing "+1¼ days" next to its date.
- `SettingsPanel.jsx`'s existing "Annual leave entitlement" editor is
  **unchanged** — it still edits the plain base number (e.g. 20). The
  bank-holiday bonus is additive on top, computed only on the Leave page,
  so editing the base entitlement in Settings never touches or gets
  confused with the in-lieu bonus.

## Edge cases

- Deleting a Bank Holiday In Lieu entry (via the new card's existing
  edit/delete affordance) automatically reduces the computed Annual Leave
  total on the next render — no separate cleanup step, by construction of
  the computed-not-stored design above.
- A bank holiday that falls on a driver's rest day (not worked) never
  triggers the prompt — the `!isRestDay` guard in the trigger condition
  above.
- Multi-date logging where every date's bank-holiday check resolves to
  "Pay": no in-lieu entries created, `onSave`'s second argument is an empty
  array, behavior is identical to today.

## Testing

- No component test framework exists in this repo (checked consistently
  across every feature built today) — the trigger condition and modal flow
  are pure UI, verified with `npm run build` plus manual checks: log a
  shift on a known bank holiday, confirm the prompt appears, confirm
  choosing "Day in Lieu" creates the dated entry and bumps the Annual Leave
  total correctly, confirm choosing "Pay" leaves no trace, confirm editing
  that same shift afterward does not re-prompt.
- `roster.test.js`: one new test case for `weekHighlights`' exclusion of
  `"Bank Holiday In Lieu"` from the special-day-off-run detection (this one
  *is* testable, pure function, no UI) — a period with a Bank Holiday In
  Lieu entry should not produce a "starts this week" highlight for it.
