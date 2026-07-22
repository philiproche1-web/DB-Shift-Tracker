# Log Shift screen fixes — design

## Purpose

Phil found three things on Log a Shift while using the app: a visually duplicated "Log Shift" button, a same-date conflict that hard-blocks saving with no way to fix a mistake, and a request to bring the existing "Repeat a Duty" capability (currently a separate screen off Period) directly into the main logging flow so multi-day logging doesn't require a second screen.

## 1. Duplicate button (bug)

`LogScreen` currently renders two "Log Shift"/"Save Changes" buttons stacked at the bottom when the primary button is disabled — the real, functional one, and a second, dead, always-disabled decorative one left over from an earlier version. Delete the dead one. No behavior change, purely a leftover-code cleanup.

## 2. Same-date conflict: hard block → confirm-to-overwrite

Currently, logging a shift on a date that already has one is a hard block: Save stays disabled, the only way forward is leaving the screen to edit/delete the existing shift first. This is inconsistent with how day-off conflicts on the same screen already behave (soft warning, save still allowed) and gives no path to fix a mistake in place.

New behavior: the warning banner stays exactly as-is (still visible, still red, still names the conflicting shift). Save becomes clickable. Tapping it shows a confirm dialog: *"This will replace the shift already logged for [date] ([existing duty]) — continue?"* Confirming replaces the existing shift record in place (same identity, not a second duplicate entry for that date) with what was just entered. Cancelling the dialog leaves everything as it was, no save happens.

This only applies to logging a **single** date (the primary date field, not the multi-day case below) and only when not already editing that same shift (editing a shift via its own Edit action is unaffected — a shift can't conflict with itself).

## 3. Repeat Duty moves into Log a Shift

The current "↻ Repeat" button/screen (opened from Period, scoped to one specific week, lets you pick a duty and tick which of that week's days to log it on) is retired. Its capability moves directly into the main Log a Shift screen:

- New row of small day-circles (Sun–Sat, single-letter labels) appears between the Duty picker and the "Spare driver shift" toggle — matching where Phil asked for it.
- Only shown when creating a **new** entry with a real numbered duty selected (not Spare, not a Fixed type like CPC/Training — those have no fixed schedule to replicate across days). Not shown when editing an existing shift.
- The circles represent the 7 days of whichever week the Date field is currently set to (recomputed if the date changes). The date field's own day is always shown as selected/pinned (it's always included) and can't be toggled off there.
- Days that already have a shift logged are greyed out and can't be selected in this multi-day picker — if one of those needs correcting, that's the single-date confirm-to-overwrite flow (item 2) on its own date, not a bulk operation.
- Ticking one or more extra days changes the Save button to "Log N days" (matching the existing Repeat screen's button-label convention). Confirming logs the same duty/zone/times across the primary date plus every ticked day, in one action, with one confirm dialog listing the dates (reusing the exact confirm-dialog pattern the old Repeat screen already used).
- Changing zone, toggling Spare, or changing the date clears any ticked extra days (they may no longer make sense for the new context) — consistent with how those actions already clear other entered fields on this screen.

## Out of scope

- No change to how multi-day-logged shifts are stored — same shift shape as any other logged shift, just several created in one action.
- No new confirm-dialog component — both new confirmations reuse the screen's existing dialog pattern.
- No per-day overwrite inside the multi-day picker — conflicting days are excluded from selection entirely, not offered for individual overwrite in bulk.
