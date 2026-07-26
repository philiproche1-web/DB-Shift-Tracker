# Log Shift screen — information architecture rework

## Problem

`LogScreen.jsx` renders 9-10 stacked blocks on one page (Date, Zone, Duty, Also-log-on, Spare toggle, Other duty types, Shift details, Rest day toggle, Overtime, Notes). Flagged in the 2026-07-16 UX audit and deliberately deferred pending a clearer read on what's actually annoying in practice.

On inspection, the friction isn't the page length itself — it's that several sections are dead weight on the common path (pick date → zone → duty → auto-filled times → save):

1. "Other duty types" (CPC/Training/Workout Spare grid) sits full-width between Duty and Shift Details — every driver scrolls past 3 buttons they never touch on a normal duty.
2. "Spare driver" toggle and "Other duty types" are two separate UI patterns (a switch, a button grid) doing the same job — choosing what kind of shift this is.
3. Rest day toggle and Overtime are separate always-visible cards, but are rare per-shift — dead space on the vast majority of saves.

## Goals

- Shrink the visible height of the common "log a normal duty" path.
- Fold the three duty-type choices (normal / spare / fixed-type) into one control.
- Hide rest day / overtime behind a collapsible section without losing data or hiding previously-set values on edit.
- No changes to save logic, `dutyMath.js`, or any pure function — UI/state reorg only in `LogScreen.jsx`.

## Non-goals

- No wizard/step-sequence rework (rejected as approach C — no concrete driver complaint justifies the rewrite risk).
- No change to the "Also log this duty on" (extra-days) feature or its logic.
- No change to how `shiftFields()`/`performSave()`/`saveShift` handle the data — this is presentation only.

## Design

### A — Unified duty-type control

Replaces: the standalone "Spare driver shift" toggle card + the "Other duty types" button grid + the implicit "normal duty" default (currently just "no toggle/type selected").

One button grid, in this order: **Duty** (default) / **Spare** / then each `FIXED_DUTY_TYPES` entry (CPC/Training, Workout Spare, etc.), each showing its fixed duration subtext exactly as the current grid does.

- Selecting **Duty** clears `isSpare`/`fixedType`, reveals the existing `DutyPicker` beneath the control (unchanged component/behavior).
- Selecting **Spare** sets `isSpare=true`, clears `fixedType`/`rIdx`, hides the picker.
- Selecting a fixed type behaves as `selectFixedType()` does today.
- **All three transitions now go through `guardedRun`** (the same "this will clear entered times" confirm already used for Zone changes and the old Spare toggle). Today `selectFixedType()` skips this guard and wipes silently — bringing it onto the unified control fixes that inconsistency as a side effect, not a separately-scoped task.

Net block count on the "what is this shift" portion of the page: 4 (Duty picker / Also-log-on / Spare toggle / Other-duty-types grid) → 2-3 (type selector / conditionally the Duty picker / Also-log-on, unchanged gating on `!isSpare && !fixedType`).

### B — Collapsible "More options" (Rest day + Overtime)

Merges the Rest day toggle card and the Overtime card into one collapsible section.

- **Closed by default** on a new entry (`!editShift`).
- **Auto-expanded when editing a shift** (`editShift` is set) **and** `isRestDay` is true or `overtimeHours > 0` — so nothing already set is ever hidden without an extra tap.
- Header row shows a one-line summary of what's set inside when collapsed and non-empty, e.g. "Rest day", "+45m overtime", or "Rest day · +45m overtime". Shows nothing extra (just a chevron) when both are unset.
- Collapsing hides the DOM only — `isRestDay`/`overtimeH`/`overtimeM`/`overtimeNote` state is untouched, so toggling the section shut and back open never loses an entered value.
- Internal nesting is unchanged: the Overtime card still only renders while `!isRestDay` (working overtime on top of a rest-day shift already reads as "the whole shift is overtime," per existing copy).

## Data flow / state changes

No new persisted fields. New local UI state in `LogScreen`:
- One state value replacing the `isSpare` boolean's *selection* role (e.g. `dutyTypeChoice: "duty" | "spare" | <fixedType key>`) that drives which block renders — `isSpare`/`fixedType` themselves stay as the actual saved-shape fields, unchanged in `shiftFields()`.
- One boolean, `moreOptionsOpen`, initialized per the auto-expand rule above.

## Edge cases

- Editing a shift that has both `isRestDay` and overtime set → "More options" auto-expands, both visible immediately.
- Switching duty type after entering times → `guardedRun` warns before wiping (now consistent across Duty/Spare/Fixed, previously fixed-type switches wiped silently).
- Multi-day "Also log this duty on" save (`extraDays`) — unaffected; `shiftFields()` still applies the same `isRestDay`/overtime values to every date in the batch, exactly as today.
- Collapsing "More options" mid-edit does not clear anything — verified by design (state lives in the parent component regardless of section visibility), confirmed live in testing.

## Testing / verification plan

- No `dutyMath.js`/pure-function changes — existing 99 tests stay green untouched, no new unit tests required for this change.
- Live-verify in browser:
  1. Normal duty: pick Duty → duty from picker → times auto-fill → save. Confirm shorter visible page, correct save.
  2. Spare: pick Spare → enter times → save.
  3. Each fixed type: pick it → enter start time → confirm auto-calculated finish → save.
  4. Switching duty type after entering times → confirm the guard/warning fires for all three paths, including fixed-type (previously silent).
  5. Edit an existing shift with `isRestDay=true` and overtime set → confirm "More options" is already expanded, values correct.
  6. Collapse then re-expand "More options" on a shift with values set → confirm nothing cleared.
  7. `npm run build` / `npm run lint` clean.
