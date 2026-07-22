# Home screen "Upcoming" carousel — design

## Purpose

Phil currently has no quick way to see what he's logged for the days around today without scrolling into Period/Log screens. He wants a glanceable, swipeable strip at the top of Home showing a few days at a time — what duty (if any) he's logged, rest days, leave — biased toward looking forward, with the ability to swipe back to check recent days too.

## Placement

New `UpcomingCarousel` component renders at the very top of the Home screen, above the existing "Today's Duty" card. Nothing existing moves or changes: "Today's Duty" card stays as the detailed view of today specifically, the "This week" hours strip and Period Limits further down the page are untouched.

## Interaction

- Horizontally swipeable row of day-cards, **3 visible at a time** on a phone-width screen.
- Native touch-scroll with CSS scroll-snap (snap to each card) — no carousel library needed.
- Small chevron buttons either side of the row for tap-to-advance (desktop/non-touch use, and general discoverability).
- Default window on Home mount: **today + next 2 days**, today's card visually highlighted (accent border) so it's identifiable after swiping away from it.
- Swiping left reveals earlier days (yesterday and further back); swiping right reveals further-ahead days. No hard limit on how far back/forward — bounded only by what `pStats()` can resolve for a given date (see Data source below).
- Swipe position is not persisted — every time Home mounts (app open, tab switch back to Home), the carousel resets to the today-centered default window.

## Card content

Each card shows the day name + short date (e.g. "Wed 22 Jul"), then one of four states for that date:

1. **Logged shift** — duty number + report–finish times, e.g. `SZ1/25 · 05:32–13:47`.
2. **Rest day** (fixed 5-week pattern or manually logged) — "Rest Day" tag, reusing the existing red rest-day styling already used on Period/Today's Duty.
3. **Leave** (Annual, Sick, etc.) — the leave type as the label, e.g. "Annual Leave".
4. **Nothing logged for that date** — "Not logged" placeholder. Tapping it opens Log a Shift pre-filled with that date (reuses the existing Log a Shift flow's date pre-fill, same as tapping a date elsewhere in the app already does).

Tapping a card in states 1–3 has no defined new action in this design (no navigation) — cards are read-only glance info for those states. (Open to adding "tap to view/edit" later if it turns out to be wanted, but out of scope here.)

## Data source

No new storage, no new schema. For each date in the visible window:

- Resolve the period that covers that date (a date may fall in the currently active period, or occasionally require checking adjacent periods near a period boundary).
- Use `pStats()` on that period the same way `HomeScreen`/`wkStats` already do, which returns `shifts` and `daysOff` with the fixed-rest-day pattern already merged in.
- Look up the date in `shifts` first (logged shift), then in `daysOff` (rest/leave), else "not logged".

**Edge case — date outside any period:** if a date falls before the earliest period's `startDate` or after the latest period's end with no period covering it yet (e.g. swiping back before Phil's first-ever logged period, or forward past where a period has been created), treat it identically to "nothing logged for that date" — show the "Not logged" placeholder, tapping it still opens Log a Shift pre-filled with that date. No error state, no special messaging — this keeps the component simple and matches how the rest of the app already treats unlogged dates.

## Visual / responsive notes

- Must read well at the app's standard mobile width (375px baseline used elsewhere in the app) — 3 cards fit side by side with small gaps, each roughly equal width.
- Today's highlight and the Rest Day/Leave tag colors reuse existing design tokens (`ACCENT`, `DANGER`, `MUTED`, `BORDER`, `TEXT`, `cardStyle`) rather than introducing new colors.

## Out of scope

- No week-grid (Sun–Sat fixed) view — explicitly rejected in favor of the rolling 3-day swipeable window.
- No persistence of swipe position across Home re-mounts.
- No new tap-to-edit/view action on logged-shift or rest/leave cards.
- No changes to the existing "This week" hours strip, Period screen, or any other screen.
