# Tumult v2.0 — balance and simulation

## Targets (carried from v1.0 findings)

- **Length is the master dial.** Missions should mostly land in the **8–14 round band** so engines come online, tracks cycle, and dice variance produces *divergence* (a different best line each turn) rather than *delay*.
- **Lethality budget.** No single enemy hit above ~⅓ of hero vitality (26): the hardest single hits in the game are the Heart's Crush (7/8/9) and the Brute's Slam (5/6/7). Swarm focus can exceed it — that is the positioning puzzle.
- **Approach tax.** Teleports are Ethereal faces — an etherion (usually Space) and a cooldown of 2–4 (Fold-hop, Launch, Dampen, Phase-tunnel, Cross the Void); no turn-1 free alpha.
- **Difficulty curve.** Tier 1 ≈ 90–100% for a competent party (onboarding), tier 2 ≈ 75–90%, tier 3 ≈ 50–75%, boss ≈ 50% for a decent party; a full run won by a careless player ~20% of the time, by a thoughtful one far more.

## Method

Two simulated players play generated missions headlessly in Node ([`PLAYERS.md`](PLAYERS.md)). The heuristic **hero autoplayer** (objective-first when a clock runs, otherwise best damage per AP, shields when threatened ≥4, reveals when foes are Hidden, movement toward the objective) is a *floor*, not a ceiling: it doesn't kite, doesn't bait, doesn't plan around intents the way a human does. The **look-ahead player**, added in v2.2.0, does plan around intents; the tables up to v2.1.0 below are the heuristic's alone. Parties mix the six prebuilt heroes and freshly drafted ones; tier-2/3 parties get progression comparable to a real run at that depth (extra UP, gear, a boon, an extra card).

`node tools/sim.js 40 missions` (both players; add `--player weak` for the heuristic alone, which takes a second) · `node tools/sim.js 80 runs` · `node tools/sim.js 10 cards` (fires all 198 faces) · `node tools/mission-log.js vault 2 7` (one narrated mission).

## Results (40 missions per cell, the v2.0 tuning pass)

These are the numbers the tuning ended on. They drift a few points whenever cards, enemies or the autoplayer change — rerun `node tools/sim.js 40` for current figures rather than trusting this table.

| archetype | tier | win% | avg rounds | in 8–14 band | avg hero HP at end | avg kills |
|---|---|---|---|---|---|---|
| swarm | 1 | 100% | 6.0 | 0% | 83% | 6.0 |
| swarm | 2 | 88% | 6.4 | 13% | 40% | 5.1 |
| swarm | 3 | 63% | 7.7 | 35% | 21% | 4.8 |
| vault | 1 | 100% | 6.0 | 23% | 76% | 1.7 |
| vault | 2 | 78% | 6.8 | 43% | 62% | 2.5 |
| vault | 3 | 43% | 8.0 | 70% | 42% | 3.1 |
| hidden | 1 | 100% | 4.5 | 3% | 72% | 0.8 |
| hidden | 2 | 85% | 5.0 | 15% | 50% | 1.2 |
| hidden | 3 | 63% | 5.7 | 15% | 31% | 1.6 |
| cascade | 1 | 98% | 5.5 | 15% | 73% | 2.6 |
| cascade | 2 | 93% | 5.9 | 20% | 49% | 3.1 |
| cascade | 3 | 65% | 6.9 | 45% | 36% | 3.8 |
| elite | 1 | 90% | 8.0 | 23% | 68% | 2.6 |
| elite | 2 | 75% | 8.3 | 35% | 51% | 3.3 |
| elite | 3 | 75% | 9.4 | 20% | 50% | 3.5 |
| boss | 3 | 23%* | 17.7 | 33% | 15% | 7.7 |

\* The boss is the autoplayer's worst mission: with the kit a run would have by then it wins roughly a quarter to a third of the time. Its losses are mostly squads that never focus the Spawners — a targeting choice a person makes immediately. Nobody has measured how people fare.

**Full runs** (80, random map choices, autoplayer): **21% won**, average depth 5.6 of 7 rows, 74% mission win rate, zero crashes, save/load round-trips every node.


## What v2.0.2 changed (roadmap S0)

Making the engine do what the text says moved the numbers very little. `node tools/sim.js 40` immediately before and after, same seeds:

| archetype | tier | win % before | win % after | avg rounds before | avg rounds after |
|---|---|---|---|---|---|
| swarm | 1 | 100% | 100% | 6.0 | 6.0 |
| swarm | 2 | 88% | **83%** | 6.5 | 6.5 |
| swarm | 3 | 63% | **65%** | 7.8 | 7.3 |
| vault | 1 | 98% | 98% | 6.0 | 6.0 |
| vault | 2 | 73% | 73% | 6.9 | 6.9 |
| vault | 3 | 38% | 38% | 7.9 | 7.9 |
| hidden | 1 | 100% | 100% | 4.6 | 4.6 |
| hidden | 2 | 83% | 83% | 5.0 | 5.0 |
| hidden | 3 | 60% | 60% | 5.8 | 5.9 |
| cascade | 1 | 98% | 98% | 5.5 | 5.5 |
| cascade | 2 | 93% | 93% | 5.9 | 5.9 |
| cascade | 3 | 63% | 63% | 6.8 | 6.8 |
| elite | 1 | 95% | **93%** | 7.2 | 7.2 |
| elite | 2 | 70% | 70% | 8.8 | 8.8 |
| elite | 3 | 70% | **75%** | 9.5 | 9.8 |
| boss | 3 | 28% | **33%** | 16.4 | 16.3 |

Full runs (40): 9/40 won before, 8/40 after; missions won within runs 76% before, 75% after; average row reached 5.65 and 5.65.

Where the movement comes from: strike bonuses no longer leak into corrosion and zones, and two "this turn" bonuses now expire (the swarm and elite tier 1–2 cells); Momentum works every round and Quick Hands works at all (tier 3 and the boss, the only cells where the simulator hands out boons); an Anchored Harrier stays put (elite). The autoplayer has no rule for several of the faces that were fixed — it never walks a Weightless hero up a ledge — so for those the table shows no change where a person would see one.

## v2.1.0 — the same rules, the dice re-dealt

Roadmap F1 gave the board, the dice and the opposition a random stream each (`STATE_AND_SAVES.md`). No rule changed, but every draw now comes from a different place, so a seed names a different mission than it did and every simulated number is a fresh sample of the same game. The check that nothing else moved, at 1,000 missions a cell (`node tools/sim.js 1000 missions`), with twice the standard error of the difference beside it:

| archetype | tier | win% 2.0.3 | win% 2.1.0 | 2 SE | rounds 2.0.3 | rounds 2.1.0 | in band 2.1.0 | hero HP at end 2.1.0 |
|---|---|---|---|---|---|---|---|---|
| swarm | 1 | 100% | 100% | ±0.0 | 6.0 | 6.0 | 1% | 81% |
| swarm | 2 | 83% | 84% | ±3.3 | 6.6 | 6.6 | 15% | 39% |
| swarm | 3 | 61% | 64% | ±4.3 | 7.7 | 7.6 | 29% | 23% |
| vault | 1 | 93% | 93% | ±2.3 | 6.4 | 6.4 | 27% | 74% |
| vault | 2 | 74% | 72% | ±4.0 | 7.0 | 7.1 | 48% | 58% |
| vault | 3 | 40% | 42% | ±4.4 | 7.6 | 7.6 | 65% | 39% |
| hidden | 1 | 97% | 98% | ±1.4 | 4.5 | 4.5 | 8% | 72% |
| hidden | 2 | 84% | 86% | ±3.2 | 5.1 | 5.2 | 15% | 48% |
| hidden | 3 | 62% | 62% | ±4.3 | 5.3 | 5.4 | 17% | 31% |
| cascade | 1 | 99% | 99% | ±0.9 | 5.4 | 5.5 | 10% | 70% |
| cascade | 2 | 93% | 91% | ±2.4 | 5.9 | 6.0 | 24% | 51% |
| cascade | 3 | 70% | 72% | ±4.1 | 6.7 | 6.7 | 42% | 39% |
| elite | 1 | 82% | 79% | ±3.5 | 8.6 | 9.1 | 21% | 63% |
| elite | 2 | 77% | 77% | ±3.8 | 8.7 | 8.9 | 25% | 55% |
| elite | 3 | 66% | 68% | ±4.2 | 10.4 | 9.5 | 30% | 48% |
| boss | 3 | 27% | 25% | ±3.9 | 16.1 | 16.2 | 46% | 17% |

No cell moves by more than its 2 SE. Whole runs (`node tools/sim.js 2000 runs`): 449 of 2,000 won before, 466 after (22% and 23%); missions won within runs 73% and 73%; average row reached 5.48 and 5.52.

Two things about the simulator changed with it. The same squads now meet every mission type — squad *i* is built from run seed *i* in every cell, and only the boards differ — where before the cells for Swarm, Vault and Elite shared squads by accident and the rest shared nothing. And the simulated player's choices on the Tide Map come from a stream of their own, so they no longer disturb the game's.

At 40 missions a cell the table wobbles by ten points or more from sampling alone: use 40 for a quick look and 1,000 to claim a change.

## v2.2.0 — two players, and the gap between them

Roadmap F2 added a second simulated player ([`PLAYERS.md`](PLAYERS.md)). The heuristic is the floor it always was. The look-ahead player tries every legal action on a copy of the mission, lets the declared enemy turn play out, and keeps what leaves the squad best off; it thinks one round ahead and no further. Both play the same squads on the same boards with the same dice to come (`node tools/sim.js 100 missions`):

| archetype | tier | heuristic win% | look-ahead win% | gap | rounds (h / l) | in 8–14 band (h / l) | hero HP at end (h / l) |
|---|---|---|---|---|---|---|---|
| swarm | 1 | 100% | 100% | 0 | 6.0 / 6.0 | 0% / 0% | 83% / 94% |
| swarm | 2 | 79% | 99% | +20 | 6.8 / 6.1 | 18% / 3% | 38% / 83% |
| swarm | 3 | 60% | 100% | +40 | 7.7 / 7.0 | 33% / 3% | 21% / 71% |
| vault | 1 | 97% | 99% | +2 | 6.0 / 5.7 | 17% / 12% | 75% / 89% |
| vault | 2 | 69% | 96% | +27 | 7.3 / 5.9 | 52% / 12% | 56% / 88% |
| vault | 3 | 48% | 88% | +40 | 7.3 / 6.1 | 57% / 26% | 35% / 87% |
| hidden | 1 | 99% | 100% | +1 | 4.3 / 4.0 | 6% / 1% | 73% / 83% |
| hidden | 2 | 84% | 99% | +15 | 5.2 / 4.0 | 13% / 6% | 47% / 77% |
| hidden | 3 | 65% | 97% | +32 | 5.2 / 4.0 | 14% / 5% | 34% / 81% |
| cascade | 1 | 99% | 100% | +1 | 5.3 / 5.0 | 6% / 2% | 71% / 84% |
| cascade | 2 | 93% | 99% | +6 | 5.6 / 4.6 | 16% / 3% | 52% / 86% |
| cascade | 3 | 81% | 98% | +17 | 6.3 / 4.9 | 33% / 6% | 39% / 83% |
| elite | 1 | 80% | 93% | +13 | 7.6 / 6.3 | 25% / 9% | 64% / 81% |
| elite | 2 | 75% | 95% | +20 | 9.0 / 6.2 | 20% / 18% | 56% / 81% |
| elite | 3 | 72% | 98% | +26 | 9.4 / 5.7 | 40% / 17% | 48% / 86% |
| boss | 3 | 23% | 66% | +43 | 15.8 / 13.3 | 44% / 51% | 14% / 54% |

Whole runs (`node tools/sim.js 100 runs`): the heuristic wins 16 of 100 and 71% of its missions; the look-ahead player wins 63 of 100 and 89% of its missions, and 33 of the 37 runs it loses end at the Heart.

What this says, set against the targets at the top of this file:

- **The game is much easier than the old tables showed.** The targets were tier 2 at 75–90%, tier 3 at 50–75% and the Heart about even *for a competent party*. A player who merely reads the declared intents and thinks a round ahead wins tier 3 between 88% and 100% of the time. Only the Heart, at 66%, is near its target.
- **Missions are shorter still for a careful player** — four to seven rounds outside the Heart, against a target band of 8 to 14 — and it finishes them with about four fifths of its vitality. Engines and long cooldowns never get their turn.
- **The gap is the number to watch.** It is small where a mission cannot be lost (tier 1) and largest where there is something to read: the Heart (+43), Swarm and Vault at tier 3 (+40). A mission with a small gap and a middling win rate is decided by the dice; one with a large gap rewards the player.
- **None of this has been retuned.** Making tier 2 and 3 hard enough for a careful player is the work of the systems milestones, with a person's playtests beside these numbers.

## v2.4.0 — Ethereal faces must be awakened

Garrett settled handoff decision 4: an Ethereal face cannot be played until its card has E 1, and every hero sets out with at least two cards awakened (`ETHEREAL_MIN_E: 1`, `START_AWAKE: 2`). The pre-made heroes already had two or three; a drafted hero's first two E points go to its strongest signatures. `node tools/sim.js 40` immediately before and after, same seeds:

| archetype | tier | heuristic win% before → after | look-ahead win% before → after | look-ahead rounds before → after |
|---|---|---|---|---|
| swarm | 1 | 100% → 100% | 100% → 100% | 6.0 → 6.0 |
| swarm | 2 | 75% → 80% | 100% → 100% | 6.0 → 6.0 |
| swarm | 3 | 60% → 58% | 100% → 100% | 7.0 → 7.0 |
| vault | 1 | 100% → 95% | 100% → 100% | 5.5 → 5.7 |
| vault | 2 | 60% → 63% | 98% → 95% | 6.0 → 5.9 |
| vault | 3 | 43% → 40% | 90% → 93% | 5.8 → 5.8 |
| hidden | 1 | 98% → 98% | 100% → 100% | 3.6 → 3.6 |
| hidden | 2 | 85% → 85% | 100% → 100% | 3.9 → 3.8 |
| hidden | 3 | 63% → 68% | 95% → 95% | 4.0 → 4.1 |
| cascade | 1 | 100% → 100% | 100% → 100% | 5.0 → 5.0 |
| cascade | 2 | 88% → 85% | 100% → 100% | 4.7 → 4.5 |
| cascade | 3 | 80% → 78% | 98% → 98% | 4.9 → 5.1 |
| elite | 1 | 73% → 78% | 95% → 90% | 6.8 → 7.9 |
| elite | 2 | 68% → 68% | 95% → 95% | 6.3 → 6.8 |
| elite | 3 | 63% → 68% | 98% → 90% | 6.0 → 7.0 |
| boss | 3 | 25% → 23% | 70% → 68% | 12.7 → 13.4 |

Full runs (40): heuristic 8 → 9 won, missions won 68% → 68%; look-ahead 20 → 17 won, missions won 85% → 83%.

At 40 missions a cell, differences under about fifteen points are noise, and nothing moved that far. The rule makes the start of a run a little poorer — each hero has three or four of six faces asleep — and makes an E point worth more, since the first one on a card buys a whole face. It does not touch the bigger problem in this file: the game is still far too easy for the look-ahead player.

## v2.5.0 — basic actions

Every hero can Strike (2 damage to an adjacent foe, 2 AP), Brace (Shield 1 until their next turn, 1 AP) and Shove (push an adjacent foe 1, 2 AP), with or without cards (`T.BASIC`). Both simulated players use them. `node tools/sim.js 40`, 2.4.2 → 2.5.0, same seeds:

| archetype | tier | heuristic win% | look-ahead win% | look-ahead rounds |
|---|---|---|---|---|
| swarm | 1 | 100 → 100 | 100 → 100 | 6.0 → 6.0 |
| swarm | 2 | 80 → 83 | 100 → 100 | 6.0 → 6.0 |
| swarm | 3 | 58 → 65 | 100 → 100 | 7.0 → 7.0 |
| vault | 1 | 95 → 95 | 100 → 100 | 5.7 → 5.7 |
| vault | 2 | 63 → 55 | 95 → 95 | 5.9 → 6.1 |
| vault | 3 | 40 → 38 | 93 → 90 | 5.8 → 6.0 |
| hidden | 1 | 98 → 98 | 100 → 100 | 3.6 → 3.8 |
| hidden | 2 | 85 → 88 | 100 → 100 | 3.8 → 3.8 |
| hidden | 3 | 68 → 65 | 95 → 95 | 4.1 → 4.2 |
| cascade | 1 | 100 → 100 | 100 → 100 | 5.0 → 5.0 |
| cascade | 2 | 85 → 85 | 100 → 100 | 4.5 → 4.7 |
| cascade | 3 | 78 → 70 | 98 → 95 | 5.1 → 5.3 |
| elite | 1 | 78 → 80 | 90 → 95 | 7.9 → 6.7 |
| elite | 2 | 68 → 70 | 95 → 93 | 6.8 → 6.5 |
| elite | 3 | 68 → 68 | 90 → 95 | 7.0 → 6.2 |
| boss | 3 | 23 → 25 | 68 → 68 | 13.4 → 12.8 |

Full runs (40): heuristic 9 → 9 won; look-ahead 17 → 19 won, missions won 83% → 86%.

Nothing moves beyond the noise at 40 missions a cell: with cards in hand, a 2-damage blow for 2 AP is rarely the best play, which is what a floor should be. The change is in the audit's last row, squads with **no cards at all** (16 missions a cell, look-ahead player):

| | swarm t1 | swarm t2 | vault t1 | vault t2 | hidden t1 | hidden t2 | cascade t1 | cascade t2 | elite t1 | elite t2 | boss t3 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2.4.0 | 100% | 81% | 56% | 6% | 100% | 69% | 100% | 56% | 19% | 0% | 0% |
| 2.5.0 | 100% | 88% | 81% | 31% | 94% | 69% | 100% | 69% | 63% | 44% | 0% |

Every tier-1 mission type can now be won without cards at least 63% of the time, which meets roadmap S1's bar of a third. The Heart still cannot: Strike's 2 damage does not get through its shield.

## v2.6.0 — Channel

A banked etherion (or Omni) can be channelled into a basic action: Mass into Strike (4 damage) or Shove (2 nodes), Charge into Reach (Interact 2 nodes away), Space into Scramble (1 node, ledges included, 1 AP), Time into Brace (plus a track slide). `node tools/sim.js 40`, 2.5.0 → 2.6.0, same seeds:

| archetype | tier | heuristic win% | look-ahead win% | look-ahead rounds |
|---|---|---|---|---|
| swarm | 1 | 100 → 100 | 100 → 100 | 6.0 → 6.0 |
| swarm | 2 | 83 → 88 | 100 → 100 | 6.0 → 6.0 |
| swarm | 3 | 65 → 65 | 100 → 100 | 7.0 → 7.0 |
| vault | 1 | 95 → 95 | 100 → 100 | 5.7 → 5.6 |
| vault | 2 | 55 → 60 | 95 → 95 | 6.1 → 6.0 |
| vault | 3 | 38 → 38 | 90 → 98 | 6.0 → 5.8 |
| hidden | 1 | 98 → 98 | 100 → 100 | 3.8 → 3.6 |
| hidden | 2 | 88 → 88 | 100 → 100 | 3.8 → 3.5 |
| hidden | 3 | 65 → 65 | 95 → 98 | 4.2 → 3.7 |
| cascade | 1 | 100 → 100 | 100 → 100 | 5.0 → 4.8 |
| cascade | 2 | 85 → 88 | 100 → 100 | 4.7 → 4.5 |
| cascade | 3 | 70 → 70 | 95 → 98 | 5.3 → 4.8 |
| elite | 1 | 80 → 90 | 95 → 100 | 6.7 → 4.8 |
| elite | 2 | 70 → 78 | 93 → 98 | 6.5 → 5.2 |
| elite | 3 | 68 → 73 | 95 → 93 | 6.2 → 6.6 |
| boss | 3 | 25 → 25 | 68 → 78 | 12.8 → 12.1 |

Full runs (40): heuristic 9 → 9 won; look-ahead 19 → 22 won, missions won 86% → 88%.

**This makes the game easier, and it was already too easy.** The Elite moves most (heuristic tier 1: 80% → 90%; look-ahead tier 1: 95% → 100%) and the Heart for the look-ahead player (68% → 78%): a Mass die that used to sit unspent is now a 4-damage blow. The audit's card-less row rises further:

| | swarm t1 | swarm t2 | vault t1 | vault t2 | hidden t1 | hidden t2 | cascade t1 | cascade t2 | elite t1 | elite t2 | boss t3 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2.5.0 | 100% | 88% | 81% | 31% | 94% | 69% | 100% | 69% | 63% | 44% | 0% |
| 2.6.0 | 100% | 100% | 94% | 88% | 100% | 81% | 100% | 88% | 94% | 50% | 0% |

The retune that follows S1 (plan phase 3) has to absorb this: the floor is now solid, so difficulty must come from the opposition and the clock, not from dead dice.

## v2.10.0 — a crystal is an action, and a harder Heart

A banked etherion (or Omni) channelled into a basic action no longer needs AP: Mass — Strike 2 or Shove 1; Charge — Arc 1 damage into a foe within 3 (new), or Reach for 1 AP; Space — Scramble 1, ledges included; Time — Brace with a track slide (CHANGELOG 2.10.0).

On its own that made the game far easier: full runs, rising tide, look-ahead 22 → 38 of 40, heuristic 6 → 19 (a first try at Strike 3, Shove 2, Arc 2, Scramble 2 gave 40 and 30). Garrett asked for the difficulty to be rebuilt in the same change, so main never gets easier.

**Where the difficulty went back.** Nearly every mission was already won by a careful player; runs were lost at the Heart, whose test is the race after it cracks. Neither hero vitality (26 → 20: still 39 of 40) nor a thicker shield (5) moved the look-ahead player; more Heart damage did little and broke the lethality budget. More Heart to get through, on a shorter clock, did: **the Heart has 50/61/72 vitality (was 32/38/44; 78 at tier 3 since 2.28.0), and once cracked the Vault drowns in four rounds (was seven).** Its blows are unchanged.

`node tools/sim.js 40`, 2.9.0 → 2.10.0, rising tide, same seeds:

| archetype | tier | heuristic win% | look-ahead win% | look-ahead rounds |
|---|---|---|---|---|
| swarm | 1 | 100 → 100 | 100 → 100 | 6.0 → 6.0 |
| swarm | 2 | 88 → 90 | 100 → 100 | 6.0 → 6.0 |
| swarm | 3 | 53 → 63 | 100 → 100 | 7.0 → 7.0 |
| vault | 1 | 95 → 98 | 100 → 100 | 5.6 → 4.5 |
| vault | 2 | 65 → 93 | 95 → 100 | 6.0 → 4.9 |
| vault | 3 | 33 → 63 | 98 → 100 | 5.8 → 5.0 |
| hidden | 1 | 100 → 100 | 100 → 100 | 3.6 → 3.1 |
| hidden | 2 | 85 → 100 | 100 → 100 | 3.5 → 3.0 |
| hidden | 3 | 53 → 78 | 98 → 100 | 3.8 → 3.3 |
| cascade | 1 | 100 → 100 | 100 → 100 | 4.8 → 4.0 |
| cascade | 2 | 88 → 100 | 100 → 100 | 4.5 → 4.1 |
| cascade | 3 | 70 → 90 | 98 → 100 | 4.8 → 4.2 |
| elite | 1 | 90 → 80 | 100 → 100 | 4.7 → 4.9 |
| elite | 2 | 73 → 80 | 98 → 100 | 5.2 → 4.6 |
| elite | 3 | 73 → 75 | 93 → 98 | 6.5 → 6.0 |
| boss | 3 | 20 → 43 | 78 → 78 | 12.1 → 11.6 |

Full runs (40): **rising** look-ahead 22 → 19, heuristic 6 → 8 (one run in five, the target). **Flood** look-ahead 13 → 18, heuristic 5 → 5.

The flood tide is now a little easier than it was, because tides never change the Heart and the tier-3 missions got easier for a squad with free crystals; making the flood press the Heart too is the obvious next lever. The Heart is now the right length for a careful player (11 rounds, in the 8–14 band); the other missions are still short.

## v2.9.0 — the last narrow faces

Seven more faces gained a general effect (CHANGELOG 2.9.0). `node tools/sim.js 40`, 2.8.0 → 2.9.0, rising tide, cells that moved by 5 points or more:

| archetype | tier | heuristic win% | look-ahead win% |
|---|---|---|---|
| swarm | 3 | 65 → 53 | 100 → 100 |
| vault | 3 | 38 → 33 | 98 → 98 |
| hidden | 3 | 60 → 53 | 98 → 98 |
| elite | 2 | 78 → 73 | 98 → 98 |

Full runs (40): heuristic 9 → 6, look-ahead 22 → 22. The look-ahead player, who weighs each face by its outcome, is untouched. The heuristic plays a face with a Shield or a Weaken whenever it feels threatened, so Blend, Ink and Endure now take turns it used to spend striking. The heuristic is meant to win about one run in five; at 6 in 40 it is just under. Watch it in the next measurement before reading it as the game getting harder.

## v2.8.0 — sensing faces with a second use

Seven Physical reveal faces each gained a small general effect (CHANGELOG 2.8.0). `node tools/sim.js 40`, 2.7.0 → 2.8.0, rising tide, cells that moved:

| archetype | tier | heuristic win% | look-ahead win% | look-ahead rounds |
|---|---|---|---|---|
| vault | 2 | 60 → 63 | 95 → 93 | 6.0 → 6.0 |
| hidden | 2 | 88 → 85 | 100 → 100 | 3.5 → 3.5 |
| hidden | 3 | 65 → 60 | 98 → 98 | 3.7 → 3.8 |
| elite | 3 | 73 → 75 | 93 → 95 | 6.6 → 5.9 |
| boss | 3 | 25 → 20 | 78 → 78 | 12.1 → 12.1 |

Every other cell is unchanged. Full runs (40): heuristic 9 → 9, look-ahead 22 → 22. These are noise-sized moves from a different play order, not a change in difficulty.

## v2.7.0 — the Flood tide

Plan phase 3 set two targets: the look-ahead player (a careful person) should win tier-2 missions 75–90% of the time and tier-3 missions 50–75%, and the heuristic (a casual player) should still win about one run in five. Before changing anything, the levers were measured on tiers 2–3 with both players (30 squads a cell): more foes (+1 at tier 2, +2 at tier 3), tougher foes (Brute, Binder), reinforcements in non-swarm missions, bigger objectives (+1/+2), and longer or shorter clocks.

- **More or tougher foes barely touch the look-ahead player** (tier 3: 87–100% everywhere) while they cut the heuristic hard (vault tier 2: 60% → 33% with a Brute).
- **Bigger objectives on the same or a shorter clock are the lever that presses a careful squad**, and mostly on the Vault and the Cascade. The Swarm, the Hidden cache and the Elite hardly move: the beacon is never contested, the cache is found by the first reveal, and an elite is a straight fight the look-ahead player always wins. Those need mission rules (phase 6), not numbers.
- **Every setting that brought the look-ahead player to its tier-3 target took the heuristic to 2–3 run wins in 40.** So one difficulty cannot meet both targets. Garrett is choosing which player the default serves; this release keeps the default as it was and adds the harder tide.

`node tools/sim.js 40` (rising tide, unchanged from 2.6.0) against `node tools/sim.js 40 --tide flood`, same seeds:

| archetype | tier | heuristic win% | look-ahead win% | look-ahead rounds |
|---|---|---|---|---|
| swarm | 2 | 88 → 78 | 100 → 100 | 6.0 → 7.0 |
| swarm | 3 | 65 → 40 | 100 → 90 | 7.0 → 9.2 |
| vault | 2 | 60 → 40 | 95 → 83 | 6.0 → 7.0 |
| vault | 3 | 38 → 3 | 98 → 45 | 5.8 → 7.1 |
| hidden | 2 | 88 → 78 | 100 → 100 | 3.5 → 4.4 |
| hidden | 3 | 65 → 25 | 98 → 88 | 3.7 → 5.7 |
| cascade | 2 | 88 → 75 | 100 → 100 | 4.5 → 5.1 |
| cascade | 3 | 70 → 33 | 98 → 70 | 4.8 → 5.8 |
| elite | 2 | 78 → 65 | 98 → 95 | 5.2 → 6.3 |
| elite | 3 | 73 → 58 | 93 → 88 | 6.6 → 8.5 |

Tier 1 and the Heart are identical on both tides. Full runs (40): heuristic 9 → 2 won, missions won 69% → 59%; look-ahead 22 → 14 won, missions won 88% → 74%. On the flood tide 6 of the look-ahead player's 26 losses are the tier-3 Vault (45%), the one cell below its target; the Swarm, Hidden and Elite stay above it, and every tier-2 mission but the Vault stays above 90%.

## v2.28.0 — duet moves

Three basic actions that one pilot does for the other (`T.BASIC`, target `ally_adj` or a foe in range): Spot (mark a foe within 3 for +2 on the next hit, 2 AP), Leg up (an adjacent ally moves 2 for free this round, 1 AP) and Lend (an adjacent ally gets 2 AP for this round, 2 AP). The shared evaluation counts a free move as kept dice and a Mark as 2 hp off its foe, or the look-ahead player never sets anything up.

With Spot at 1 AP the careful player got clearly stronger: full runs 19 → 23 of 40, the finale 65 → 80%. At 2 AP the finale is back at 65%, but the careful squad still arrives fresher and runs stayed easier (look-ahead 41 → 47 of 80 against main). So the Heart gets thicker at tier 3: **72 → 78 vitality**. `node tools/sim.js 80 runs`, main → 2.28.0: heuristic 13 → 15, look-ahead 41 → 39 of 80. At 40: heuristic 4 → 4, look-ahead 19 → 20, finale heuristic 40 → 30%, look-ahead 65 → 63%. Mission cells moved a few points either way (vault tiers fell for the look-ahead player, 98/98/95 → 93/88/90%, as AP goes to Spot instead of the climb).

## What the tuning fixed along the way

- **Vault was unwinnable at 33%** because the lever's ramp didn't make the ledge walkable in the engine. Fixed; vault t1 went to 100%.
- **Missions resolved in 4–5 rounds** — objectives were too quick. Beacon holds 6/6/7, the vault needs two seals, the cache needs digging out twice, the valve three channels, the flood starts on round 2. Average length rose into the 6–9 range with a growing share in band.
- **The boss drowned parties in Biters.** Spawners now spawn every 3 rounds, spawned fodder is one tier lower, the Heart only calls the tide when fewer than two Biters stand, its lance is 3/4/5, hp 32/38/44, and the promised *shield fed by Spawners* rule is now actually enforced.
- **Tier 3 was brutal** (27–37%). Compositions trimmed (vault loses the Lurker, hidden loses the third Lurker, cascade swaps Brute for a Biter), Warden shield 3 at all tiers, vitality 24 → 26.
- **Runs death-spiralled.** +25% vitality after each won mission and one Lifeline per run took random-path completion from 3% to 21% without touching mission difficulty.
- **Autoplayer realism.** It now skips strikes that would deal 0 into a shield and prefers Spawners while the Heart is shielded — numbers before that were artificially grim.

## Known rough edges and levers

- **Mission length is still short of the 8–14 band at tiers 1–2.** Levers: +1 to hold counts / seals / channels, or +1–2 vitality on fodder. Tier 1 is fast on purpose (onboarding).
- **Hidden-cache missions resolve quickly** when a party has any reveal radius ≥2. Lever: 4 candidate caches at tier 3, or caches that move once when searched.
- **Elite variance by kind.** Harriers punish squishy pairs; Bulwarks punish clumping; Tidecallers punish parties without anchors. Intended, but the boon reward should perhaps scale with which elite you drew.
- **Per-card balance is first-pass.** All 198 faces fire without error; magnitudes follow the v1.0 formulas (base + P; capability scales with E). Likely hot cards: Tesla Cascade at E3 (3 chains), Resonance (lane-all), Swarm Phase (party AP engine), Cryptobiosis Tun (Shield 7 at P3). Likely cold: Cheek Caching, Threat Display Hiss, Rhizome Sprout. `npm run audit` (→ `ABILITY_AUDIT.md`) measures usage per face; see its caveats about the autoplayer.
- **The duel is gone as a mode** (a deliberate choice: campaign first). Bringing it back needs hero-versus-hero targeting, which v2.0 does not have. The v1.0 balance notes on the brawler/zoner matchup remain valid for a future arena.
