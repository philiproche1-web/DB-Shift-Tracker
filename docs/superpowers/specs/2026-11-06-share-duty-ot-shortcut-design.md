# Share duty to WhatsApp, OT shortcut, bottom Save, duty-scoped Home diversion

Approved by Phil 2026-11-06 (voice notes, in session).

## 1. Share duty (camera button)

**Where:** camera button on the right of the Home duty cards (Today's Duty, Tomorrow's Duty) and on the Duty Lookup running-board card once a duty is selected.

**Flow:** tap → `ShareDutySheet` bottom sheet:
- image preview
- Lookup only: date field (`DateInput`), defaulting to the next date (today or later) whose day type matches the Lookup selection (Mon–Fri / Sat / Sun). Home cards already have a date and show no picker.
- caption `<textarea>`, prefilled:
  ```
  Looking to swap SZ1/15X – Fri 6 Nov. Report 06:10, finish 14:32.
  Looking for: early finish before 12:00
  ```
  The last line is a deliberate example for the driver to overwrite.
- **Share** button → `navigator.share({ files: [png], text: caption })`. The OS share sheet opens; WhatsApp is picked there. A web app cannot target WhatsApp directly with an image attached; after first use Android/iOS rank WhatsApp first.

**Safety net:** caption is written to the clipboard on every Share tap (iOS WhatsApp often drops text sent alongside a file). If `navigator.canShare({files})` is false, the PNG downloads instead and the caption is still copied. User cancelling the OS sheet (`AbortError`) is silent.

**Image:** drawn on a `<canvas>` by the app (no DOM screenshot, no new dependency), so it is crisp and always contains the full running board regardless of the card's expanded state or theme. Content: duty number, zone, day + date, report / break / finish times, every running-board stop, footer `rosterbuddy.ie`. Fixed dark palette matching the card.

**Units:**
- `src/lib/dutyShare.js` — pure: `buildShareCaption(data)`, `nextDateForDayType(dayType, fromIso)`, `shareSummary(duty/shift)`; side-effecting: `renderDutyImage(data) → Promise<Blob>`, `shareDutyImage({blob, caption, filename})`.
- `src/components/ShareDutySheet.jsx` — the sheet.

## 2. OT button on Home duty cards

Below the camera button. Opens that shift in Log/Edit (`setEditShift(shift)`) with **More options forced open and scrolled into view** (new `LogScreen` prop `focusMoreOptions`). Saves one trip through Period → week → Edit → More options. Only on Home cards (they always represent a logged shift).

## 3. Bottom Save

`LogScreen` keeps the top Save. A second identical Save block (button + block reason) renders at the very bottom, after Notes, whenever a duty/fixed type is selected.

## 4. Home diversion scoped to today's duty

`HomeScreen` shows the diversion button only when a shift is logged for today and a live alert applies to it: `isLiveNow(a) && (!a.zone || a.zone === todayShift.zone)`. No shift logged today → no alert. The Alerts screen itself still lists every alert.

## Testing

- Unit: caption text, next-date-for-day-type, image summary fields.
- Component: share sheet renders caption + Lookup date picker; OT button opens edit with More options open; bottom Save present and saves; Home alert hidden with no shift / other zone, shown for same zone and garage-wide.
- Mutation-test each new test.
- Visual: 360px wide, 100% and 200% text, temporary harness (login wall).
- Not verifiable here: real WhatsApp hand-off on a phone — Phil tests after upload.
