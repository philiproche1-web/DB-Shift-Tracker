# Font Scaling (px → rem) — Design

**Date:** 2026-08-16
**Status:** Approved by Phil
**Origin:** Deferred item from `AUDIT-2026-08-14.md` — held back deliberately at the time as its own risk-bearing session.

## Problem

The app hardcodes `fontSize` as raw px numbers everywhere (theme tokens and per-screen inline styles). The 2026-08-14 audit measured 115 of 155 Home-screen text nodes ≤12px with zero rem/em usage, and confirmed forcing the root `<html>` font-size from 16→24px changed nothing on screen. A driver who sets a larger text size at the OS or browser level gets no benefit — the app's text stays fixed regardless.

`src/index.css` has no root `font-size` override (defaults to the browser's own base, which is itself scaled by OS accessibility text-size settings), so once values are expressed in rem instead of px, browser/OS text-size scaling will take effect automatically — no new app code needed to detect or apply scale.

## Goal

Convert every hardcoded numeric `fontSize` (px) to the equivalent rem value across the whole app, so OS/browser text-size accessibility settings scale the app's text. No new in-app UI, no user-facing toggle — this is a unit conversion, not a new feature.

## Scope

- `src/lib/theme.js` shared style tokens (`inputStyle`, `btnStyle`, `tag`, and the theme-variant duplicates) — converted first since most screens import these.
- Per-screen inline `fontSize` values in all 20 files currently containing them (`HomeScreen.jsx`, `LogScreen.jsx`, `LogDayOffScreen.jsx`, `App.jsx`, `SettingsPanel.jsx`, `shared.jsx`, `LeaveScreen.jsx`, `ErrorBoundary.jsx`, `PeriodScreen.jsx`, `ArchiveScreen.jsx`, `SetupScreen.jsx`, `DutyLookup.jsx`, `ResetPasswordScreen.jsx`, `AuthScreen.jsx`, `FAQScreen.jsx`, `WhatsNewScreen.jsx`, `TourOverlay.jsx`, `TermsScreen.jsx`, `GarageComingSoonScreen.jsx`).
- 366 total `fontSize` occurrences to convert.

**Conversion rule:** `rem = px / 16` (browser default root is 16px, confirmed unoverridden). Examples: `11px→0.6875rem`, `12px→0.75rem`, `13px→0.8125rem`, `14px→0.875rem`, `15px→0.9375rem`, `16px→1rem`, `18px→1.125rem`, `20px→1.25rem`, `22px→1.375rem`, `24px→1.5rem`, `28px→1.75rem`, `32px→2rem`. Use exact division, no rounding — all values in this codebase are multiples that divide cleanly.

**Out of scope:** `padding`, `borderRadius`, `width`/`height`, icon sizes, and other non-font px values stay as-is. No in-app text-size toggle. No touch-target changes (already done 08-14). No change to `index.css` or the viewport meta (already correctly permits pinch-zoom, no `user-scalable=no`).

## Verification

Component tests (jsdom) don't compute real layout, so pixel-accurate overflow can't be caught there — same limitation the 08-14 audit hit and worked around.

1. Rebuild the temporary audit harness (`audit.html` + `src/auditHarness.jsx`, fixture data, same pattern as 08-14) to view real screens past the login wall.
2. Load every screen at simulated OS text sizes 100% / 150% / 200% (root `font-size` override inside the harness only — never shipped).
3. Screenshot each screen at each size; look for real overflow, clipping, or broken wrapping on duty cards, nav labels, buttons, and modals.
4. Fix any real breakage found via layout changes (flex-wrap, min-width, truncation) — do not cap font growth to dodge a layout bug.
5. Delete the harness when done, same as last time.
6. Run the full existing test suite (281 tests) — expected to stay green since this is a value-only change, not a logic change.

## Guardrail (new)

Add one grep-based regression test that fails if a new numeric px `fontSize:` literal is reintroduced anywhere under `src/`, so the fix can't silently erode later. This repo already leans on tests as the source of truth (per the 08-14 audit's own standard) rather than trusting a one-time pass.

## Risks

- **Mechanical but large surface** (366 occurrences, 20 files) — highest risk is a missed occurrence or a transcription slip in the px→rem table, not a design risk. Guardrail test catches future regressions; visual verification catches existing-conversion mistakes before merge.
- **Layout regression risk at large scale** — accepted and handled via the browser-harness visual check at 200%, not via capping (per Phil's explicit choice).
