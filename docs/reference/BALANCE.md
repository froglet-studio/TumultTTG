# Tumult v2.0 — balance and simulation

## Targets (carried from v1.0 findings)

- **Length is the master dial.** Missions should mostly land in the **8–14 round band** so engines come online, tracks cycle, and dice variance produces *divergence* (a different best line each turn) rather than *delay*.
- **Lethality budget.** No single enemy hit above ~⅓ of hero vitality (26): the hardest single hits in the game are the Heart's Crush (7/8/9) and the Brute's Slam (5/6/7). Swarm focus can exceed it — that is the positioning puzzle.
- **Approach tax.** Teleports are Ethereal faces — an etherion (usually Space) and a cooldown of 2–4 (Fold-hop, Launch, Dampen, Phase-tunnel, Cross the Void); no turn-1 free alpha.
- **Difficulty curve.** Tier 1 ≈ 90–100% for a competent party (onboarding), tier 2 ≈ 75–90%, tier 3 ≈ 50–75%, boss ≈ 50% for a decent party; a full run won by a careless player ~20% of the time, by a thoughtful one far more.

## Method

A heuristic **hero autoplayer** (objective-first when a clock runs, otherwise best damage per AP, shields when threatened ≥4, reveals when foes are Hidden, movement toward the objective) plays generated missions headlessly in Node. It is a *floor*, not a ceiling: it doesn't kite, doesn't bait, doesn't plan around intents the way a human does. Parties mix the six prebuilt heroes and freshly drafted ones; tier-2/3 parties get progression comparable to a real run at that depth (extra UP, gear, a boon, an extra card).

`node tools/sim.js 40 missions` · `node tools/sim.js 80 runs` · `node tools/sim.js 10 cards` (fires all 198 faces) · `node tools/mission-log.js vault 2 7` (one narrated mission).

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
