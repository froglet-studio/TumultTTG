# Scaling: missions that answer the squad

Since 2.76 a squad flies two to five pilots, and a pilot a player made keeps its growth from one expedition to the next (Garrett, 2026-11-20: "create formulas for scaling maps etc. based on the player's level and the size of their party… a new adventure can scale with their upgrades"). Every mission is still written for **two new pilots**; this page is how it grows when the squad is bigger or more seasoned. Code: `src/engine/scaling.js` (`T.SCALING`, `T.scaleFor`, `T.squadPower`, `T.scaleSpec`, `T.pilotLevel`).

Everything here is a number a table can work out before the mission starts.

## Squad power and difficulty (2.109)

Garrett, 2026-11-21: "before a full arc is made it is based on the sum of the total power of all the characters at the start and the chosen difficulty level… as characters are updated from mission to mission they can continue to grow, but the mission can scale accordingly."

An expedition is sized from two things the players settle before it starts: the squad's **power** and the **difficulty** (the tide, `T.TIDES`: Steady wind or Gale, which shapes objectives, clocks, swarms and escorts tier by tier, as before).

- **A pilot's power** is **10**, and **1** more for every level past 1 it set out with (`T.pilotPowerFor`, `T.SCALING.PILOT`). A new pilot is power 10; a pilot back at level 4 is power 13.
- **The squad's power** is its pilots' power added up (`T.squadPower`). Two new pilots, the squad every mission is written for, are power 20. A seat whose pilot is still drafting counts as a new pilot.
- **Growth on the road.** The route already expects a squad to grow: about **3** upgrade points a pilot for every row it has come (`ROAD_UP`; the simulated runs grow 3.1 a row). A pilot that has grown faster than that brings **1** more power for every **6** points it is ahead, to every mission after; one that grows slower never brings less than it set out with (`h.setOut` holds the growth it set out with). A mission launched outside a route (the simulators, the playtest jump) expects a level a tier instead.

A **pilot's level** is `1 + floor(growth / 6)`, where growth is every upgrade point it holds past the six a new pilot starts with (spent, spare, or bound to a card) plus **2** for every trait past its first six (`T.pilotPower`, `LEVEL_UP`, `CARD_UP`).

## What the mission adds

For every point of squad power past 20:

| | per point of power past 20 | so one more new pilot (10) |
|---|---|---|
| each foe's vitality | +5% | +50% |
| extra foes | +⅕ | +2 |
| objective (seals, rounds held, caches, valve turns, marks) | +⅒ | +1 |
| a swarm's cap | +⅒ | +1 |

Fractions round down at the end. A squad of three at level 5 (power 3 × 14 = 42, 22 past 20) gets foes at 210% vitality, 4 extra foes, the objective +2 and the swarm +2. Two pilots at level 6 (power 30) meet the same missions as three new pilots: power is power, however it is spread.

Before 2.109 the squad's size and its *average* level were two separate numbers; a level now counts for every pilot who has it, so five seasoned pilots meet more than two.

- **Extra foes** are the mission's own rank and file (never its boss, elite or Spawners), placed in the back two columns where the tides' escorts stand, or past the front column if those are full. They come from a random stream of their own (`squad`), so the board, its objectives and everything else the seed names stay the same whoever plays it. The Heart's chamber takes half as many extras, from its own spawn, and its foes take another +2% vitality per point of power past 20 (+20% per new pilot, `T.SCALING.boss`): the Heart has no objective to grow, so the fight itself does.
- **Starts.** Every pilot starts on a space of its own: the mission's two starts first, then free spaces from the front column back, and on a crowded board a space with an objective on it.
- **Narrow places.** The Vault's ledge takes one more seal at most however big the squad. Salvage keeps its own cap of one more crate, and a Survey always leaves two marks spare; instead their clock is one round shorter for every 2 the objective would have grown (every 20 power past 20; the Survey never under 3).
- **Two new pilots add nothing.** Their missions are byte-identical to 2.75's (`test/scaling.test.js`).

The route shows the squad's power as a ⚖ pill, and every stop card shows the numbers it will be played with.

## Before and after 2.109 (power)

Measured on 2.104 (before the weapons and keep-all-traits changes), the same code with and without power. Mean win rate over all mission cells (heuristic player 40 squads a cell unless marked), and full runs with the heuristic player (80 runs, 40 with three pilots):

| | size + average level | power |
|---|---|---|
| two new pilots | 73.2% | 73.2% (identical) |
| two pilots at level 5 | 69.4% | 70.0% |
| three pilots at level 4 | 77.7% | 73.8% |
| five pilots at level 3 | 72.3% | 60.9% |
| look-ahead: two new pilots (40 a cell) | 91.4% | 91.4% (identical) |
| look-ahead: three pilots at level 4 (20 a cell) | 90.4% | 88.4% |
| look-ahead: five pilots at level 3 (12 a cell) | 86.4% | 79.6% |
| runs, two new pilots, Steady wind | 13/80 won, missions 73% | 13/80, 73% |
| runs, two new pilots, Gale | 2/80, 62% | 2/80, 63% |
| runs, three pilots at level 4 | 3/40, 70% | 1/40, 63% |

Summing makes a level count once for every pilot who has it, so a big seasoned squad meets more than it did; two new pilots, and squads that grow at the route's pace, meet the same missions. A full wipe now ends the expedition (below), which these numbers include.

## How the numbers were chosen (2.76)

`node tools/sim.js 40 missions` with `--pilots N` and `--level L` (`--noscale` turns scaling off; `--scaling size.hp=0.4,…` tries other numbers). The aim: a bigger squad is no easier than two pilots, and a seasoned squad is no easier than a new one.

**Squad size**, mean win rate over all 22 mission cells (heuristic player, 40 squads a cell; look-ahead player 20 squads for three pilots, 12 for five):

| pilots | heuristic, unscaled | heuristic, scaled | look-ahead, scaled |
|---|---|---|---|
| 2 | 78.5% | 78.5% | 94.6% |
| 3 | 93.9% | 79.0% | 94.8% |
| 5 | 97.5% | 78.0% | 93.9% |

Unscaled, a third pilot makes nearly everything a win; scaled, three, four and five pilots land within a point of two for the heuristic player. The look-ahead player lands within a point too. Its hard cell is the Vault at five pilots (33–83%: the ledge holds few). The Heart was its easy one at first (92% of 12 at five pilots against 40% for two), so the Heart grows more per pilot: with that, the look-ahead player wins it 40% with three pilots (of 20), 25% with four (of 16) and 50% with five (of 12); the heuristic player, a floor, 0–3% against 10%.

**Level.** Veteran squads (`H.addLevel`: up to three more traits, the rest of the level's growth as points) win about as often as new ones in most missions, because both players already win most of them; the Heart is where growth shows (look-ahead: 40% new, 53% at level 4, 63% at level 7, unscaled). Scaled, the look-ahead player wins 93% of missions at level 4 and 91% at level 7 against 95% new (the Heart 35% and 50% against 40%), and the heuristic player 73% and 58% against 78.5%: a seasoned squad is no easier than a new one, and its missions stay the same missions.

## A full wipe ends the expedition (2.109)

If every pilot is down when a mission ends, the expedition is over, whatever the Lifeline (Garrett, 2026-11-21: "if all players die the arc is over but they are revived for the next arc"). The Lifeline still carries a mission lost with someone standing (its clock ran out). A downed pilot is still out only until an ally raises it, and is back for the next mission.

## Open questions

- Whether a level should scale **the Heart's rules** (more Spawners, a faster flood) rather than only its vitality and spawn.
- Whether **gear and boons** should come home with a pilot. Today only traits and points do.
- Bigger squads crowd a fifteen-space page. Larger pages for big squads would be an atlas change (pages are one fixed board each).
