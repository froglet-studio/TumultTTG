# 03 · Missions

**Status: Proposed.** v2.0 has six archetypes (Swarm, Vault, The Sought, Cascade, Elite, Boss). The audit shows both ends are thin: squads with no cards at all win Swarm and Cascade at tier 1 almost every time by walking to the objective, while Elite and Boss are pure fights. Neither is the puzzle we want. This proposes a grammar for objectives and twelve mission types built from it. Depends on [02](02-units-verbs-actions.md).

## Rules

- At least half of the mission types are **not won by destroying the opposition**.
- Every mission offers **at least two routes** to its objective, and neither depends on one family of abilities. The briefing names the routes in plain words ("carry it across the bridge, or float it down the channel").
- Outcomes are **graded** — full, partial, failed — and each grade leads somewhere ([01](01-frame-and-campaign.md)).
- Opposition may be people, animals, weather, terrain or time. Whatever it is, it **telegraphs**.

## An objective grammar

Objectives are assembled from a small set of primitives, so a new mission is data, not code.

| Primitive | Reads as |
|---|---|
| `reach` | get a unit to a place |
| `hold` | keep a unit at a place for N rounds |
| `carry` | move a carryable unit from A to B |
| `escort` | an actor with its own pace must arrive intact |
| `protect` | a unit's integrity must stay above X until the clock ends |
| `search` | find which of several candidates is real |
| `tag` | apply a non-lethal mark to N targets |
| `herd` | move neutral actors into a zone using position, not force of arms |
| `work` | perform N Interacts at one or more sites |
| `break` | reduce a prop's integrity to zero |
| `subdue` | bring an actor to low integrity and Interact — capture, not kill |
| `evade` | finish with an alarm or attention meter below a threshold |
| `outpace` | complete your objective before a rival actor completes its own |
| `leave` | exit the board with at least K units |

A mission is one or two primitives, a clock, opposition, a board ([04](04-boards-and-conditions.md)), and bonus conditions.

## Twelve mission types

| # | Type | Usual patron | Objective | Fight? | The puzzle |
|---|---|---|---|---|---|
| 1 | **Protect** | Jade | `protect` a site or people through weather and raiders | optional | where to stand; what to shield; when to repair |
| 2 | **Escort** | Gold | `escort` a client or caravan across | optional | the client moves on its own rule — clear its path, not the board |
| 3 | **Survey** | Ruby | `search` + `tag` survey points before night | no | route planning under a clock; terrain is the opponent |
| 4 | **Salvage** | Ruby / Gold | `carry` K crates out of a wreck as the water rises | no | carrying slows you — relay, throw, float, or lighten |
| 5 | **Rescue** | Jade | `search`, stabilise, `carry` survivors, `leave` | no | triage: who first, and who carries |
| 6 | **Tagging** | Ruby / Jade | `tag` a great creature at three points without killing it | no | it is far stronger than you; use the board, its habits and the wind |
| 7 | **Bounty** | Gold | `subdue` a named rival and bring them in | yes | take them alive: control and positioning beat damage |
| 8 | **Infiltration** | Ruby | `reach` + `carry` with `evade` — sentries have sightlines | avoidable | read the patrols; a fight is the costly fallback, not a failure |
| 9 | **Match** | Gold | `outpace` a rival squad at a territory or ball game | non-lethal | the same verbs, pointed at a scoreboard; knockouts get back up |
| 10 | **Drive** | Jade | `herd` animals through a pass, or move nests before a storm | no | push, lure, block and shelter — neutral actors, visible rules |
| 11 | **Raise** | Jade / Gold | `work` at sites to build a windbreak or relight a beacon | optional | split the squad between working and keeping the site workable |
| 12 | **Crossing** | — | the set piece that ends a leg | varies | each one combines two primitives under that leg's signature condition |

The v2.0 archetypes survive as instances: Swarm is a *Protect*, Vault an *Infiltration* without sentries, The Sought a *Rescue* without survivors, Cascade a *Salvage* without cargo, Elite a *Bounty*. Keep their generators as the first templates.

## Routes, concretely

"Two routes, no single family" has to be checked per mission, not asserted. Examples of the standard to hold:

- **Salvage**: walk each crate out (slow, safe) · relay it between squadmates (fast, needs position) · Shove it into the channel and collect it downstream (risky, uses the tide) · any Space verb shortens any of these, none requires one.
- **Tagging**: bait it to a ledge and tag from above · Anchor it briefly with any hold and tag at leisure · let it charge a windbreak and tag while it recovers · tire it by making it move upwind.
- **Infiltration**: time the patrol · break the sightline with cover, haze or a moved crate · draw the sentry away with a decoy, a noise or a neutral animal · go through, and pay for it in alarm.

The audit's gate check runs every mission type with each family of answers removed; a mission type that collapses fails review.

## Opposition that is not an enemy

- **Neutral actors** follow one visible rule (flee from the nearest pilot; move downwind; follow food). They can be helped, moved and frightened, and harming them usually costs standing.
- **Rivals** pursue their own objective and only fight what is in their way.
- **The clock** is always diegetic: nightfall, the tide, the storm front, the client's patience, the alarm.
- **Kaiju-scale creatures** are terrain that moves: telegraphed a round ahead, survivable by position, never a vitality race.

## Build order

1. The objective grammar and graded outcomes, with the four existing objective missions re-expressed in it.
2. Salvage and Escort (they exercise `carry` and neutral actors).
3. Survey and Rescue (they give information verbs real work).
4. Drive, Raise, Tagging.
5. Infiltration, Bounty, Match.
6. Crossings, one per leg.

Done when: twelve types exist; at least six have no kill condition; every type passes the gate check; and a simulated season never serves two missions with the same signature ([04](04-boards-and-conditions.md)).
