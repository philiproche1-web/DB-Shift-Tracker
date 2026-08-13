# Automatic Period Rollover — Design

## Problem

Ending a 5-week period is currently 100% manual: a driver has to open Period,
tap "End period & start new" (or the equivalent button on Archive), and
confirm a dialog. Several drivers — including the reporting driver himself —
have forgotten to do this, or found it confusing. The app should do this
automatically: a period is a fixed 35-day block of the real Dublin Bus
roster cycle, not a personal choice, so there's no reason a driver should
have to manually tell the app it's over.

## Goal

When a driver opens the app and their active period has ended, silently
archive it and start the next one — no confirmation needed, since nothing
is lost or ambiguous. Tell them once, after the fact, with a light-touch
banner.

## Scope decisions (from stakeholder discussion)

- **No advance heads-up.** Considered warning drivers a couple of days
  before their period ends, but rejected: they can't act on it anyway (it
  happens automatically regardless), and it adds a second dismiss-state to
  maintain. One touchpoint only.
- **One-time FYI banner after the fact**, not a confirm dialog — shown the
  first time the driver opens the app after the rollover happened. Not
  repeated on later opens.
- **Silent full catch-up**, not one-period-at-a-time. If a driver's away for
  several periods (holidays, sick leave), the next time they open the app it
  jumps straight to whichever 35-day block contains today, archiving
  whatever came before. No empty periods are manufactured for the gap weeks
  — nothing was ever logged there, so there's nothing to represent. One
  banner regardless of how many periods were skipped.
- **The manual "End period & start new" mechanism is removed entirely** —
  both the button on Period and the button on Archive, and the
  `startNewPeriod()` function itself. Reasoning worked through with the
  stakeholder: "end early" isn't a legitimate action (periods are fixed to
  the real roster cycle, not a personal choice), "auto-rollover hasn't fired
  yet" isn't a real safety net (the only way that happens is a bug, or the
  driver never opening the app — in which case they can't tap the button
  either), and the existing button has no guard against firing *before* the
  period has actually ended, which silently misaligns real data. Removing it
  deletes a footgun rather than keeping a redundant safety net.

## Core logic (`src/lib/roster.js`)

New pure function, alongside the existing period helpers:

```js
export function rollPeriodsForward(periods, activePeriodId) {
  const active = periods.find(p => p.id === activePeriodId);
  if (!active) return { periods, activePeriodId, rolled: false };
  const now = today();
  if (now <= addDays(active.startDate, 34)) return { periods, activePeriodId, rolled: false };
  let start = active.startDate;
  while (now > addDays(start, 34)) start = addDays(start, 35);
  const archived = periods.map(p => p.id === activePeriodId ? { ...p, archived: true } : p);
  const next = { id: uid(), startDate: start, shifts: [], daysOff: [], createdAt: new Date().toISOString() };
  return { periods: [...archived, next], activePeriodId: next.id, rolled: true };
}
```

- Reuses exactly the archive-and-create shape `startNewPeriod()` used to
  produce manually.
- The `while` loop keeps the period grid aligned (35-day steps from the
  original anchor) while jumping however many blocks are needed to reach
  today — bounded by real elapsed calendar time, so no infinite-loop risk
  even after a long gap.
- No active period (brand-new signup, before their first period exists) →
  no-ops safely; unrelated to the separate `SetupScreen` onboarding flow.
- `rolled: true` is only ever true on the exact load where the boundary was
  actually crossed — this doubles as the one-shot banner trigger with no
  extra "have I shown this" flag needed anywhere.

## Where it's called (`src/App.jsx`)

Inside the existing `loadData().then(({data, corrupted}) => {...})` mount
callback — the same place the What's New/Tour first-load checks already
live — right after `data.periods`/`data.activePeriodId` are read:

```js
if (data) {
  const rolled = rollPeriodsForward(data.periods || [], data.activePeriodId || null);
  setPeriods(rolled.periods);
  setActivePeriodId(rolled.activePeriodId);
  if (rolled.rolled) {
    saveData({ periods: rolled.periods, activePeriodId: rolled.activePeriodId });
    setJustRolledPeriod(rolled.periods.find(p => p.id === rolled.activePeriodId));
  }
}
```

Runs exactly once, only in this initial mount path — not inside the
background reconnect/sync handler (`handleReconnect`/`syncAll`) — so a
second tab, a flaky connection, or a reconnect event can never trigger a
double-roll or race. A second device just picks up the already-rolled
period through the normal periods sync, no banner shown there (same driver,
no need to tell them twice).

Persisted through the same `saveData`/Supabase sync path every other period
mutation already uses, so multi-device consistency is automatic — nothing
new to build there.

## Banner UI

New component in `src/components/shared.jsx`, styled like the existing
`RouteAlertBanner` but with a dismiss button (matching the toast dismiss
pattern already in `SettingsPanel.jsx`):

```jsx
export function NewPeriodBanner({period, onDismiss}) {
  return (
    <div style={{...cardStyle,padding:"14px 16px",marginBottom:12,display:"flex",gap:10,alignItems:"center"}}>
      <div style={{flex:1,minWidth:0}}>
        <p style={{color:TEXT,fontSize:13.5,fontWeight:700,margin:"0 0 2px"}}>New 5-week period started</p>
        <p style={{color:MUTED,fontSize:12,margin:0}}>{fmtShort(period.startDate)} – {fmtShort(addDays(period.startDate,34))} · your last one's been archived</p>
      </div>
      <button onClick={onDismiss} style={{background:"none",border:"none",color:MUTED,fontSize:18,cursor:"pointer",padding:"0 4px",flexShrink:0}}>×</button>
    </div>
  );
}
```

`App.jsx` holds `justRolledPeriod` state (the new active period, or `null`),
set as shown above, cleared on dismiss. Passed to `HomeScreen`, rendered
above the existing `RouteAlertBanner`.

## Removed: manual rollover

- `src/App.jsx`: delete `startNewPeriod()` entirely.
- `src/screens/PeriodScreen.jsx`: remove the "End period & start new" /
  "This period has ended — start a new one" button (and the `onEndPeriod`
  prop).
- `src/screens/ArchiveScreen.jsx`: remove the "Start New Period" button (and
  the `onStartNew` prop). Update the empty-state body copy from "When you
  start a new period, the current one moves here for safe keeping" to
  something reflecting it's automatic now, e.g. "Once your 5-week period
  ends, the previous one moves here automatically."

## Testing

- `roster.test.js`: new cases for `rollPeriodsForward` —
  - no-op when there's no active period
  - no-op when the active period hasn't ended yet
  - single-period rollover: correct archived flag on the old period, correct
    `startDate` on the new one
  - multi-period catch-up after a long gap: lands on the grid-aligned block
    containing today, no intermediate periods created
- No component test framework exists in this repo (checked previously) —
  the `App.jsx`/banner/button-removal changes are verified with `npm run
  build` plus best-effort manual checks; full authenticated verification is
  on the stakeholder once deployed.
