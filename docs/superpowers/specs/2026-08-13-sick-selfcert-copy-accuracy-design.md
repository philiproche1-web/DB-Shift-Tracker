# Sick Leave / Self Cert Copy Accuracy — Design

## Problem

Two more Leave page cards give inaccurate or missing context, same class of
issue as the Force Majeure card (see the companion
`2026-08-13-force-majeure-rolling-limits-design.md`):

- The Sick Leave card's traffic-light thresholds (currently `≤3 green, ≤7
  amber, else red`) are arbitrary and unrelated to the real consequence: 13
  or more certified sick days in a calendar year puts a driver into ACP
  (an internal attendance-monitoring process — exact expansion of the
  acronym unconfirmed by the stakeholder, so the card uses "ACP" bare
  rather than guessing a full name).
- The Self Cert card has no explanation of the rule that actually governs
  when it can be used: it can't be combined with adjacent rest days to
  create more than 2 consecutive days off.

Unlike Force Majeure, both of these are pure copy/threshold changes — no
new rolling-window computation, no change to how days are counted.

## Sick Leave card (`src/screens/LeaveScreen.jsx`)

- Traffic-light thresholds on `sick.length` (the existing, already
  calendar-year-scoped count — no change to the underlying data):
  - 0–7: green (`SUCCESS`)
  - 8–9: amber (`#F59E0B`)
  - 10–12: red (`DANGER`)
  - 13+: still red, but the card additionally shows a distinct callout —
    *"You've hit the ACP threshold — 13+ certified sick days in a calendar
    year."* — rather than just staying visually identical to the 10–12
    band. This is the stakeholder's explicit ask: 13+ is a materially
    different state (already past the line), not just "more of the same
    red."
- Subtitle stays `"Certified by doctor · Jan–Dec"` (unchanged, still
  accurate) with the new explainer line added underneath it, always
  visible (not just at 13+): *"13+ certified sick days in a calendar year
  triggers ACP."* This is the stakeholder's "add that line in" ask —
  informational up front, not just a reactive warning once the threshold's
  already hit.

## Self Cert card (`SelfCertCard` in `src/screens/LeaveScreen.jsx`)

- Adds one explainer line to the existing subtitle (`"2 days per half-year
  · resets 1 Jan & 1 Jul"`, kept as-is): *"Can't be combined with rest days
  to create more than 2 consecutive days off (e.g. not the day before or
  after a weekend)."*
- Copy only — no validation or blocking logic. Confirmed explicitly with
  the stakeholder: this is purely so drivers understand the rule
  themselves, not an app-enforced restriction.

## Testing

Pure copy/threshold changes, no new business logic — verified with `npm
run build` plus a manual visual check that the new lines render and the
sick-leave color bands land on the right side of each threshold (7 vs 8, 9
vs 10, 12 vs 13).
