# Shift Swaps — Design

## Problem

Drivers swap duties constantly — it is the single most common thing they do
to the roster that the app currently cannot represent. Today a swap is
arranged by WhatsApp, a phone call, or a note in the depot, and the app only
finds out afterwards, when the driver manually re-logs the day. Two things go
wrong:

1. **The rest rule is checked in someone's head.** A swap has to leave at
   least **10 hours** between one duty finishing and the next one starting,
   for *both* drivers, on *both* sides of the swapped date. That is four
   separate checks, against duty times nobody has memorised. Against the live
   Summerhill roster, **~23% of all consecutive-day duty pairings in Zone 1
   weekday break the 10-hour rule** (2,096 of 9,025 pairs) — this is not a
   rare edge case, it's roughly one in four.
2. **There is no shared surface.** A driver wanting rid of a Saturday late
   has nowhere to put it, and a driver looking for extra work has nowhere to
   look.

## What this is — and what it deliberately is not

The app has no authority over the company roster. A swap agreed in the app is
**an agreement record plus a legality check plus a paper trail** — the actual
roster change still goes through the depot exactly as it does today. The
final lifecycle state is therefore "confirmed at the depot", marked by the
drivers, not something the app can assert on its own.

Stating this plainly in the UI is a scope decision, not a caveat: an app that
*looked* like it was booking swaps with the company would be actively
dangerous.

## The three things a driver actually wants to do

| Kind | Meaning | Who ends up working what |
|---|---|---|
| **Straight swap** | "You take my Tuesday, I'll take your Thursday." | Both drivers work; duties trade. |
| **Give away / cover** | "Anyone want my Saturday late?" | Taker works an extra day; poster gets a day off. |
| **Take work** | "I want extra — anything going." | A standing wanted-post, no duty attached. |

All three are the same record with different fields populated. One table, one
lifecycle — not three features.

## Where it lives in the app

The bottom nav has five tabs (Home, Log, Lookup, Period, Leave) and Lookup is
the raised centre button. That ordering encodes **daily** frequency, and
swapping is episodic — a driver might do it twice a period, not twice a day.
**A sixth tab would dilute the four things drivers open the app for every
shift, to serve something they do occasionally.** So: no new tab.

Instead, three entry points sized to how the thought actually arrives:

**1. Home — a Swaps card, only when it has something to say.**
Slots under the existing "This Week" widget, above the compliance bars. Shows
a count when there is something needing the driver (`2 offers on your
Saturday`, `Your swap was accepted`) and collapses to a single quiet row
(`Swap board · 6 open`) when there isn't. This is the "is anything happening"
entry point, and it costs nothing when nothing is happening.

**2. Period screen — per-day action.** The realistic trigger is a driver
looking at a specific date and thinking *I can't do that one*. The day sheet
on a logged shift gains **Offer for swap** alongside the existing
Edit/Delete. This is the highest-value entry point and it adds no chrome —
it's one more row in a sheet that already exists.

**3. Log screen — nothing.** Deliberately. Logging is what you did; swapping
is what you're arranging. Keeping them apart avoids drivers logging a swap
that hasn't been agreed yet.

The board itself is a **full screen pushed onto the stack** (`screen ===
"swaps"`), exactly like `alerts`, `archive`, and `lookup` already do in
`App.jsx` — no nav change, no new routing concept. Settings gains a "Swaps"
section for the preferences below.

### Screen structure

```
Swap Board  (screen: "swaps")
├── Board      — open offers from your garage, newest first, filterable
│                by date / zone / kind. Each card shows the duty, its
│                times, and a green/amber/red clearance chip computed
│                against YOUR roster.
├── Mine       — what you've posted, with claim counts; what you've
│                claimed, with status. Withdraw lives here.
└── Agreed     — accepted swaps awaiting depot confirmation, and the
                 history of confirmed ones.
```

## The 10-hour clearance check

### The rule

`next duty sign-on − previous duty sign-off ≥ 10h 00m`, evaluated for **both
drivers**, on **both sides** of every date changing hands. A straight swap of
two dates is therefore up to eight checks; the UI reports the worst one.

### The math is already free

The roster data encodes duties that run past midnight as **hours ≥ 24**
(`SZ1/51 14:35–24:25`; the latest finish in the current data is `30:11`,
i.e. 06:11 the next morning), and `LogScreen`'s `buildSignOff()` stores
logged shifts the same way via its `+1` toggle. So no wrap-around logic is
needed — `parseTimeToMins()` in `dutyMath.js` already yields minutes from the
sign-on day's midnight:

```js
// gap in minutes between a duty on dayA and a duty on dayB (dayB > dayA)
export const MIN_CLEARANCE_MINS = 600; // 10h

export function clearanceGap(prevShift, prevDate, nextShift, nextDate) {
  const daysApart = Math.round(
    (new Date(nextDate + "T12:00:00") - new Date(prevDate + "T12:00:00")) / 86400000
  );
  return daysApart * 1440
    + parseTimeToMins(nextShift.reportTime)
    - parseTimeToMins(prevShift.signOffTime);
}
```

A duty finishing at 30:11 means the next day's sign-on cannot be before
16:11 — which is exactly the kind of thing drivers currently get wrong.

### The privacy problem, and why it disappears

Every driver's roster lives in their own `app_data` JSON blob, locked by RLS
to `auth.uid() = user_id`. Checking driver B's clearance would seem to need
driver A's private data.

It doesn't. **Each device validates only its own driver's clearance.** To
know whether B can take A's Tuesday duty, B needs A's *duty times for that
one date* (carried on the offer, and derived from the public roster anyway)
and B's *own* neighbouring days (already local). A does the mirror check for
whatever comes back. No private data crosses between drivers, no server-side
access to anyone's blob, no new privilege anywhere.

This is the load-bearing decision of the whole design: it lets the check be
exact without weakening the data model that already exists.

### What the check returns

`checkSwapLegality()` returns a verdict per side, never a bare boolean:

| Verdict | When | UI |
|---|---|---|
| `clear` | every gap ≥ 10h | Green chip, "9h 40m clear" |
| `tight` | ≥ 10h but < 11h | Amber chip — legal, worth a second look |
| `breach` | any gap < 10h | Red chip, claim button disabled, states the offending pair |
| `unknown` | a neighbouring day is unlogged, or is a Spare with no fixed times | Grey chip, "Can't check — 27 Aug isn't logged". **Warn, never block** — the driver knows their own diary better than the app does |

`unknown` mattering is why this returns a verdict rather than true/false:
Spare duties genuinely have no fixed sign-off, and a driver who hasn't logged
next week yet must still be allowed to arrange a swap.

### The other limits, checked at the same time

The swap preview shows the delta on limits the app already tracks, since a
swap moves hours between weeks and periods:

- **190h 04m** period total (`MAX_HOURS`) — before/after.
- **14h 30m** Sunday hours (`MAX_SUNDAY`) — a Sunday duty changing hands is
  the single most likely limit breach after clearance.
- **Max consecutive days** (`maxConsec`) — a cover shift filling a rest day
  extends the run; show the new figure.
- **Period boundary.** A swap on day 1 or day 35 needs the neighbouring day
  from the adjacent period. `periodForDate()` already resolves this
  correctly, including the archived-period overlap bug it guards against.

These are shown as *impact*, not as blockers — only a 10-hour breach disables
the claim button, because only that one is a hard rule.

## Data model

Swaps must **not** live in the `app_data` blob. That blob is whole-document,
last-write-wins, and single-owner — three properties that are exactly wrong
for a multi-party record where two drivers can claim the same offer in the
same second. New normalised tables, read directly, no offline write path.

```sql
-- 0018_shift_swaps.sql

create type swap_kind   as enum ('give_away', 'straight_swap', 'want_work');
create type swap_status as enum ('open','claimed','agreed','confirmed',
                                 'withdrawn','expired','declined');

create table public.swap_offers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  garage        text not null,
  kind          swap_kind not null,
  status        swap_status not null default 'open',
  -- Denormalised duty snapshot: public roster data, and it must survive the
  -- poster later editing or deleting their own logged shift.
  shift_date    date,
  zone          text,
  day_type      text,
  roster_code   text,
  duty_number   text,
  report_time   text,          -- "HH:MM", may exceed 24:00 (see above)
  sign_off_time text,
  work_hours    numeric(5,2),
  wanted_dates  date[] default '{}',   -- straight_swap: acceptable dates back
  note          text,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.swap_claims (
  id             uuid primary key default gen_random_uuid(),
  offer_id       uuid not null references public.swap_offers(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  status         swap_status not null default 'claimed',
  -- straight_swap only: the duty this driver is offering back, same
  -- snapshot shape, so the poster can run their own clearance check.
  back_date      date,
  back_roster_code text,
  back_report_time text,
  back_sign_off_time text,
  back_work_hours  numeric(5,2),
  message        text,
  created_at     timestamptz not null default now(),
  unique (offer_id, user_id)          -- one live claim per driver per offer
);

create table public.swap_agreements (
  id            uuid primary key default gen_random_uuid(),
  offer_id      uuid not null references public.swap_offers(id),
  claim_id      uuid not null references public.swap_claims(id),
  poster_id     uuid not null references auth.users(id),
  taker_id      uuid not null references auth.users(id),
  agreed_at     timestamptz not null default now(),
  poster_confirmed_at timestamptz,   -- depot sanctioned it, marked by driver
  taker_confirmed_at  timestamptz,
  cancelled_at  timestamptz,
  cancel_reason text
);
```

### RLS — the one genuinely new thing

Every policy in the schema today is `auth.uid() = user_id`. A swap board is
the first feature that needs a driver to see *another driver's* row, so the
policy must be narrow and explicit: **same garage, open offers only.**

```sql
-- Stable helper, so the policy isn't a correlated subquery on every row.
create function public.current_driver_garage() returns text
  language sql stable security definer set search_path = public
as $$ select garage from public.profiles where id = auth.uid() $$;

create policy "Drivers see open offers in their own garage"
  on public.swap_offers for select to authenticated
  using (
    user_id = auth.uid()                       -- always see your own
    or (garage = public.current_driver_garage()
        and status in ('open','claimed'))
  );

create policy "Drivers post their own offers"
  on public.swap_offers for insert to authenticated
  with check (user_id = auth.uid());

create policy "Drivers update only their own offers"
  on public.swap_offers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Claims are visible to the claimer and to the offer's owner only. Agreements
to the two parties only. Reuse the existing
`force_user_id_to_auth_uid()` trigger on all three tables — the same
defence-in-depth already applied to `app_data` and `push_subscriptions`, so a
client cannot post as someone else even if it tries.

**What a colleague can see about you:** your first name, your driver number,
and the duty you posted — nothing else. Driver number is already
company-wide, unique, and necessary (it's what goes on the depot form), so
this is the minimum that makes the feature work. Worth stating in the FAQ
rather than leaving drivers to infer it.

### Retention

Follow `0016_operational_table_retention.sql`: expire `open` offers past
`expires_at` (default: the shift date itself), and purge withdrawn/expired
rows after 90 days. Confirmed agreements are the paper trail — keep those.

## Lifecycle

```
        post                claim              accept            both mark
 (none) ────► OPEN ──────► CLAIMED ─────────► AGREED ──────────► CONFIRMED
                │             │                  │
                │ withdraw    │ decline /        │ cancel
                ▼             ▼ withdraw claim   ▼
            WITHDRAWN       OPEN             CANCELLED
                │
                │ shift date passes
                ▼
             EXPIRED
```

**The race.** Two drivers claiming the last open offer simultaneously is the
one real concurrency case. Handled with a conditional update rather than a
transaction the client can't hold:

```js
const { data } = await supabase
  .from("swap_offers")
  .update({ status: "claimed" })
  .eq("id", offerId).eq("status", "open")   // ← lost-update guard
  .select();
if (!data?.length) return { ok: false, reason: "taken" };
```

Zero rows back means someone else got there first — the board refreshes and
says so, rather than showing a claim that silently didn't happen.

**Accepting writes nothing to anyone's roster.** On `CONFIRMED`, each
driver's *own* device applies the change to its *own* `app_data` blob through
the existing `applyShiftSave` / `applyDayOffSave` mutations in
`periodMutations.js` — the taker gains a shift, the poster gains a Rest Day
or loses a shift. The swap tables own the agreement; the blob stays the sole
source of truth for the personal tracker. Nothing new writes across the RLS
boundary.

## Offline behaviour

The board is **read-only offline**, showing the last cached fetch behind an
"offline — this may be out of date" banner, with posting and claiming
disabled. This is a deliberate departure from the rest of the app, which
queues everything locally via `markDirty()`: a swap claim queued for three
hours and replayed against an offer that was taken two hours ago is worse
than a claim that plainly didn't happen. Bad signal is the normal case for
this user base, so the failure has to be honest and immediate.

## Notifications

`push_subscriptions` and the `send-reminders` Edge Function already exist and
already fan out per driver. Swap events reuse both — a `send-swap-events`
path in the same function, triggered on insert into `swap_claims` /
`swap_agreements`:

| Event | Goes to | Text |
|---|---|---|
| New claim on your offer | Poster | "Dave M (12345) wants your Sat 5 Sep late." |
| Your claim was accepted | Taker | "Swap agreed — Sat 5 Sep, SZ1/51 14:35–24:25." |
| Your claim was declined | Taker | "Your swap request for Sat 5 Sep wasn't accepted." |
| Offer expiring today | Poster | "Your Sat 5 Sep offer expires tonight." |

Opt-out per category in the Settings → Swaps section, defaulting on for the
first two and off for expiry reminders.

## Code layout

Follows the existing separation — pure logic in `src/lib/`, tested; screens
thin.

| File | New/changed | Contents |
|---|---|---|
| `src/lib/swaps.js` | new | `MIN_CLEARANCE_MINS`, `clearanceGap`, `checkSwapLegality`, `swapImpact`, `offerFromShift` — pure, no Supabase, no React |
| `src/lib/swaps.test.js` | new | The table below |
| `src/lib/swapsApi.js` | new | Every Supabase call: `postOffer`, `claimOffer`, `acceptClaim`, `withdraw`, `confirmAgreement`, `fetchBoard`. Isolated so `swaps.js` stays pure and testable |
| `src/screens/SwapBoardScreen.jsx` | new | The three-tab board |
| `src/screens/OfferSwapScreen.jsx` | new | Post flow, with live clearance preview |
| `src/screens/PeriodScreen.jsx` | changed | "Offer for swap" row on the day sheet |
| `src/screens/HomeScreen.jsx` | changed | Swaps card |
| `src/screens/SettingsPanel.jsx` | changed | Swaps preferences |
| `src/App.jsx` | changed | `screen === "swaps"` / `"offerSwap"`, board fetch, badge count |
| `supabase/migrations/0018_shift_swaps.sql` | new | Tables, enums, RLS, triggers, retention |

## Test plan (`src/lib/swaps.test.js`)

The clearance math is the part that must not be wrong, and it's pure — so it
gets the same treatment `dutyMath` and `roster` already have.

- exact 10h 00m gap → `clear` (boundary is inclusive)
- 9h 59m → `breach`
- 10h 30m → `tight`
- duty finishing `24:25` vs next-day sign-on `10:15` → `breach` (this is the
  case the >24:00 encoding exists for, and the one a human gets wrong)
- duty finishing `30:11` vs next-day sign-on `16:11` → `clear` at exactly 10h
- neighbouring day is a Rest Day → no constraint from that side
- neighbouring day unlogged → `unknown`, not `breach`
- neighbouring day is a Spare with no fixed sign-off → `unknown`
- swap spanning a period boundary resolves the neighbour via `periodForDate`
- both sides of a straight swap evaluated; worst verdict wins
- `swapImpact` reports correct before/after for 190h 04m, 14h 30m Sunday, and
  max-consecutive-days

Plus a screen test for the claim race returning `taken`, in the style of
`sync.test.js`.

## Build order

**Phase 1 — the useful half.** Give-away and cover only, `swaps.js` +
migration + board + Period entry point + manual confirm. No push, no
straight swaps, no counter-offers. This alone replaces the WhatsApp group and
delivers the 10-hour check, which is the actual safety win.

**Phase 2 — straight swaps and push.** Counter-offers with the mirrored
clearance check, notifications through the existing Edge Function, Home card.

**Phase 3 — the depot.** Generate the swap form as a PDF through the existing
`pdfExport.js`, prefilled with both driver numbers, both duties, both
clearance figures, and a signature line — so the paper trail the depot
actually wants comes out of the app instead of being written by hand.

## Open questions for the depot

1. Does Summerhill require both drivers to sign one form, or one each?
2. Is the 10-hour minimum a company rule or a local agreement — and does it
   apply to *any* duty pairing, or only across a rostered rest day?
3. Is there a cut-off (48h before the shift?) after which swaps aren't
   sanctioned? That becomes the default `expires_at` rather than the shift
   date itself.
4. Cross-garage swaps: out of scope while Summerhill is the only live
   roster, but the `garage` column and the RLS policy are already shaped to
   allow relaxing it later.
