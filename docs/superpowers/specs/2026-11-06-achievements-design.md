# Achievements / badges

Agreed with Phil 2026-11-06 (voice notes, in session).

## Catalogue

Levels = one badge with several thresholds; each level pops up on its own. Yearly / half-yearly badges can be re-earned each year and show a count ("×2"). Secret badges show as "?" until earned.

**Duties** (from logged shifts)
| id | name | rule |
|---|---|---|
| duties | First Duty / 10 / 50 / 100 / 250 Duties | shifts logged ≥ 1, 10, 50, 100, 250 |
| first_ot | First Overtime | any shift with overtimeHours > 0 |
| rest_day_grafter | Rest Day Grafter | any shift with isRestDay |
| sunday_service | Sunday Service | any shift whose date runs Sunday duties (`getDayType` = sunday, so bank holidays count) |
| early_bird | Early Bird | reportTime < 05:30 |
| night_owl | Night Owl | signOffTime ≥ 21:00, or signs off after midnight (signOff < report) |
| all_zones | All Zones | a shift logged in every zone of the driver's garage roster |

**Leave** (from logged days off; auto fixed rest days do not count as "logged")
| id | name | rule |
|---|---|---|
| first_rest_day | First Rest Day | a Rest Day logged |
| holiday_mode | Holiday Mode | an Annual Leave day logged |
| spent_up | Spent Up (yearly) | Annual Leave days in a calendar year ≥ entitlement (annualTotal + 1.25 × Bank Holiday In Lieu that year) |
| first_sick | First Sick Day | a Sick Day logged |
| full_five | Full Five (yearly) | ≥ 5 Sick Days in a calendar year (5 paid sick days) |
| acp | Welcome to the Program (secret, yearly) | ≥ 13 Sick Days in a calendar year (ACP threshold) |
| first_self_cert | First Self Cert | any Self Cert |
| sc_h1_first / sc_h1_both | Self Cert Jan–Jun: first / both (yearly) | ≥ 1 / ≥ 2 Self Certs dated Jan–Jun |
| sc_h2_first / sc_h2_both | Self Cert Jul–Dec: first / both (yearly) | ≥ 1 / ≥ 2 Self Certs dated Jul–Dec |
| sc_full_house | Full House (yearly) | ≥ 4 Self Certs in a calendar year |
| family_first | Family First | a Force Majeure day |
| maxed_out | Maxed Out | 3 Force Majeure days inside any rolling 365 days |
| full_record | Full Record | every loggable leave type logged at least once |
| joker | The Joker (secret, yearly) | in one calendar year: Spent Up + ≥ 5 Sick + ≥ 4 Self Cert + ≥ 3 Force Majeure |

**Covered days** — a day counts when `dayInfo` shows a shift or a day off (auto fixed rest days count here: they're real rest days). Only fully past days.
| id | name | rule |
|---|---|---|
| full_week | Full Week / 4 Full Weeks | count of Sun–Sat weeks with all 7 days covered ≥ 1, 4 |
| full_month | Full Month | count of calendar months fully covered ≥ 1 (count shown) |
| full_period | Full Period / 3 Full Periods | count of 5-week periods fully covered ≥ 1, 3 |

**Using the app** (counters stored with the driver's synced settings)
| id | name | rule |
|---|---|---|
| regular | Regular: 3 / 7 / 30 days | best run of consecutive days the app was opened |
| duty_detective | Duty Detective / 25 Lookups | duties opened in Duty Lookup ≥ 1, 25 |
| swap_shop | Swap Shop | a duty shared (shared or image saved) |
| explorer | Explorer | visited Home, Log, Lookup, Period and Leave |
| heads_up | Heads Up | opened the diversions screen |
| paper_trail | Paper Trail | exported a period PDF |

Not included, by decision: a domestic violence leave badge.

## Storage

`settings.achievements = { v:1, earned: { "<id>:<level|year|yearHalf>": { at: "YYYY-MM-DD", retro?: true } }, usage: { lookups, shares, alertsViewed, pdfExports, tabs: [], openDays: [] (last 60 dates) } }`. Rides the existing `settings` sync table (whole-document last-write-wins): no migration. Logging badges are recomputed from data every time, so a lost write only costs usage counters. Badges are never revoked (deleting a shift does not take one away).

## Behaviour

- Evaluate after the first successful sync (`syncedOnce`) and whenever periods, leave settings or usage change.
- **First run** (no `settings.achievements`): everything already earned is stored `retro`, and one welcome pop-up shows "You've already earned N badges" with a button to the Achievements page.
- **Afterwards:** each new badge queues a full-screen pop-up (~3s auto close, tap to close). If more than 5 arrive at once (e.g. a sync just landed), they're treated like the welcome batch: one summary pop-up instead of a flood.
- **Home:** badges earned today (not retro) show as a banner at the top; tap opens the Achievements page.
- **Achievements page:** opened from Settings. Grouped by category; earned with date and count; locked with the rule and progress (e.g. "37 / 50"); secret ones as "?".

## Look

Round medallion, emoji icon, category colour, rim colour by level (bronze → silver → gold). Pop-up: medal scales in with a bounce, CSS confetti, name, one-line joke.

## Units

- `src/lib/achievements.js` — pure catalogue + `evaluate(ctx)` → `{ earnedKeys, progress }`; `diffNew(stored, keys)`.
- `src/lib/usage.js` — `recordUsage(kind, value)` writes counters into settings and fires `rb-usage`.
- `src/components/Badge.jsx`, `src/components/AchievementPopup.jsx`, `src/screens/AchievementsScreen.jsx`.

## Testing

Unit tests per rule (thresholds, yearly keys, rolling FM window, coverage counts, night owl midnight case), first-run vs incremental diff, flood guard. Component tests for pop-up queue and page. Mutation-checked. Visual check locally.
