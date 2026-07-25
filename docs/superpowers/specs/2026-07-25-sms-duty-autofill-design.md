# SMS Duty Auto-Fill — Design Spec

**Date:** 2026-07-25
**Status:** Approved for planning

## Purpose

Phil is a spare driver. Each day BAC_SMS (Dublin Bus's alphanumeric SMS sender) texts him his duty assignment two days out — the text itself carries an explicit target date, roster code, and duty number. Today he must read the text and manually log the shift in the DB 5-Week Tracker app. This feature reads that text automatically and fills the shift in for him, with zero taps in the normal case.

This requires wrapping the existing Vite/React web app (currently sideloaded as a static-site zip) in a native Android shell, since reading the SMS inbox (`READ_SMS`) is an OS-level permission with no browser/PWA equivalent.

## Real example (source of truth for the parser)

```
Driver : 942601
ROCHE, PHILIP
Date : 21/10/2025
Roster : SZ1/32
Depot : 005
Duty : 005032
Tuesday duty.
Restdays available throughout the week
```

Sender: `BAC_SMS` (alphanumeric sender ID). Received Sunday 19 Oct 09:45, target date is the text's own `Date:` field (21/10/2025, Tuesday) — not derived from receipt time.

`Roster: SZ1/32` matches the app's existing `DUTIES[].r` field format exactly (see `public/roster-data.json` / `src/App.jsx`) — direct lookup, no separate zone parsing needed.

## Architecture

**Shell:** Wrap the existing app in Capacitor, Android platform only (no iOS — sideload-only distribution, matches how the reference app (`bacsms`, another driver's own build) is also Android-only).

**Native plugin:** One small hand-written Kotlin Capacitor plugin (`DutySmsPlugin`), narrowly scoped — a single method `getRecentMessages(sinceTimestamp)` that queries `content://sms/inbox` filtered to `address = "BAC_SMS"` and `date > sinceTimestamp`, returning `{body, date}` for each match. Requests the `READ_SMS` runtime permission via Capacitor's permission API only when the feature is first used, not on app launch. No third-party SMS-reading library — this keeps the permission-sensitive code small enough to audit directly, and mirrors the approach already confirmed working in the reference app.

**JS layer (`smsSync.js`, new module):**
- `parseDutySms(body) -> {date, rosterCode} | null` — pure function. Splits the message into `Label : value` lines, requires `Driver`, `Date`, `Roster`, `Duty` all present, parses `Date` as `dd/mm/yyyy`. Returns `null` (ignored, no crash) if any required field is missing or unparseable.
- `syncDutySms()` — orchestrator, called on app open and on pull-to-refresh. Reads `dbus_sms_last_scan` watermark from `localStorage`, calls the native plugin for messages since that watermark, runs each through `parseDutySms`, resolves `rosterCode` against `DUTIES` (must match an existing `r` value with a day-type consistent with the parsed date), and for each valid match:
  - looks up the existing shift (if any) for the target date
  - if empty, or existing shift has `autoFilled: true` → write/overwrite via the existing `saveShift`, tagging the new entry `autoFilled: true`
  - if existing shift is a real (non-autoFilled) entry → skip silently, never overwritten
  - advances the watermark to the newest processed message timestamp
  - if `rosterCode` doesn't match any known `DUTIES.r` (stale roster data / unrecognized code) → do not silently drop it; surface a small non-blocking Home banner ("Got a duty text for an unrecognized roster code — log it manually"), same visual pattern as the existing `BackupNudgeBanner`

**Data flow:** SMS inbox (Android OS) → native plugin query (Kotlin, `ContentResolver`) → Capacitor JS bridge → `parseDutySms` → `DUTIES` lookup → `saveShift` (existing, unmodified) → `localStorage` → same render path every other shift already uses.

## Error handling

- Malformed/unrelated text from `BAC_SMS` (missing a required field) → ignored, no crash, no UI noise.
- Valid parse, unrecognized roster code → non-blocking Home banner (see above), not a silent drop.
- `READ_SMS` permission denied or revoked → feature simply inactive; Settings shows its state plus a re-grant action; rest of the app is completely unaffected (identical to today's fully-manual behavior).
- Re-scanning already-seen messages → prevented via the `dbus_sms_last_scan` watermark (only messages newer than the watermark are ever queried).
- A newer correcting text for the same date → always wins, because the prior entry is `autoFilled: true` and therefore eligible for silent overwrite.

## Testing

- `parseDutySms` is a pure function — unit-testable directly against the real captured sample above, no device needed.
- Native SMS query only works on-device/emulator. Verification path: Android Studio emulator, seed a synthetic `BAC_SMS` message via `adb emu sms send`, confirm the app picks it up on foreground/refresh and writes the correct shift; then a real-device sideload check as the final confirmation, matching this repo's existing "verified live, not just build-clean" standard.

## Scope / non-goals (this pass)

- No iOS.
- No background listener / broadcast receiver — on-demand scan only (app open + pull-to-refresh), avoids Android's background-broadcast restrictions and matches the reference app's own working approach.
- SMS content never leaves the device — no network transmission of message bodies, preserving the app's existing T&C promise ("the developer has no access to your personal data").
- The "other type of driver" Phil mentioned is explicitly out of scope for this pass.
- `Driver`/`Depot`/`Duty` fields are parsed as part of the required-field check but not otherwise used yet.
- Sender allow-list is `BAC_SMS` (confirmed) — combined with the structural field-and-roster-code check as a second, independent filter against false positives.
