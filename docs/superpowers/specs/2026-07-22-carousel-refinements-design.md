# Upcoming Carousel refinements — design

## Purpose

Follow-up to the Upcoming Carousel (shipped same day, see `2026-07-22-upcoming-carousel-design.md`). Phil tried it live and wants two changes: a clearer "you can add this" affordance that also makes Rest Day cards actionable (for logging overtime worked on a rest day), and a depart-location line on logged-shift cards so a driver can see at a glance where to go, not just when.

## 1. "+" affordance, and Rest Day cards become tappable

Currently only "Not logged" cards are clickable; Rest Day cards are display-only. This adds:

- A small "+" badge rendered on **both** "Not logged" and "Rest Day" cards (visual cue only — the existing whole-card tap target is unchanged, the badge doesn't add a second click zone or change event handling).
- Rest Day cards become clickable, with the same `onLogDate(date)` mechanism "Not logged" cards already use, but additionally signaling "this is a rest-day tap" so the destination screen knows to pre-set the overtime toggle (see below). "Shift" cards (already logged) stay non-clickable, unchanged.
- Tapping a Rest Day card opens Log a Shift with: the date pre-filled (existing mechanism), **and** the existing "Working on a rest day" toggle pre-set to on (that toggle already exists in `LogScreen` — this just defaults it instead of leaving it for the driver to remember to flip).
- Log a Shift shows a small on-screen banner when opened this way: "Logging this as overtime — you're on a scheduled rest day." Reuses the app's existing toast/banner visual style (Settings panel already has one) but as its own local instance in `LogScreen`, shown for as long as the pre-set rest-day flag from this entry point is active, not a global app-level toast.
- Tapping "Not logged" is unchanged in behavior (date pre-fill only, no rest-day pre-set) — only gets the same "+" badge for visual consistency.

## 2. Depart location on logged-shift cards

Shift cards currently show duty number + report–finish times, e.g. `SZ1/25 · 05:32–13:47`. Add a third line showing where the driver needs to be: `Garage`, `Abbey St`, `Townsend St`, etc.

- No new data stored on the shift itself — looked up at render time from the same roster data (`DUTIES`) the running board already uses, keyed by the shift's `zone` + `roster` + the day-type of its `date` (weekday/Saturday/Sunday). This is the existing `rl` field on each `DUTIES` entry — despite its name, this field holds the *depart* location (established during the running-board fix earlier this session), not a separate "report location". No renaming of that field — just read correctly at this one new display site, with a clarifying comment.
- If no matching `DUTIES` entry is found (Spare shifts, Fixed duty types like CPC/Training — these have no fixed depart location), the location line is simply omitted. Card still shows duty + times exactly as it does today for those cases.

## Out of scope

- No change to how the depart-location data itself is stored or corrected — this only adds a new place that reads it.
- No change to "Not logged" card behavior beyond the "+" badge.
- No global/app-level toast system change — the rest-day banner is local to `LogScreen`.
- No change to how overtime hours are calculated — pre-setting the "Working on a rest day" toggle uses the exact same existing toggle and its existing downstream overtime logic, just defaulted differently based on entry point.
