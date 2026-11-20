# Scaling: missions that answer the squad

Since 2.76 a squad flies two to five pilots, and a pilot a player made keeps its growth from one expedition to the next (Garrett, 2026-11-20: "create formulas for scaling maps etc. based on the player's level and the size of their party… a new adventure can scale with their upgrades"). Every mission is still written for **two new pilots**; this page is how it grows when the squad is bigger or more seasoned. Code: `src/engine/scaling.js` (`T.SCALING`, `T.scaleFor`, `T.scaleSpec`, `T.pilotLevel`).

Everything here is a number a table can work out before the mission starts.

## Two numbers about the squad

- **Size past two** — `size = pilots − 2`. One player flies two pilots; two to five players fly one each (`T.pilotsFor`).
- **Level past one** — `level = floor(average of (pilot level − 1))`, each pilot's level as it **set out** on this expedition. Growth during the expedition does not count: that is the run's own curve, which the tiers already answer.

A **pilot's level** is `1 + floor(growth / 6)`, where growth is every upgrade point it holds past the six a new pilot starts with (spent, spare, or bound to a card) plus **2** for every trait past its first six (`T.pilotPower`, `LEVEL_UP`, `CARD_UP`). Six points is about what a tier of a run gives (`T.addProgression`). A new pilot is level 1; a pilot back from one expedition is usually level 2 to 6; a pilot with nine traits all at P 3 / E 3 is about level 10.

## What the mission adds

| | per pilot past two | per level past one |
|---|---|---|
| each foe's vitality | +50% | +5% |
| extra foes | +2 | +¼ |
| objective (seals, rounds held, caches, valve turns, marks) | +1 | +¼ |
| a swarm's cap | +1 | +¼ |

Fractions add up and round down at the end, so a squad of three at level 5 (size 1, level 4) gets foes at 170% vitality, 3 extra foes, the objective +2 and the swarm +2.

- **Extra foes** are the mission's own rank and file (never its boss, elite or Spawners), placed in the back two columns where the tides' escorts stand, or past the front column if those are full. They come from a random stream of their own (`squad`), so the board, its objectives and everything else the seed names stay the same whoever plays it. The Heart's chamber takes half as many extras, from its own spawn.
- **Starts.** Every pilot starts on a space of its own: the mission's two starts first, then free spaces from the front column back, and on a crowded board a space with an objective on it.
- **Narrow places.** The Vault's ledge takes one more seal at most however big the squad. Salvage keeps its own cap of one more crate, and a Survey always leaves two marks spare; instead their clock is one round shorter for every two pilots past two (the Survey never under 3).
- **Two new pilots add nothing.** Their missions are byte-identical to 2.75's (`test/scaling.test.js`).

The route shows the squad's scaling as a ⚖ pill, and every stop card shows the numbers it will be played with.

## How the numbers were chosen

`node tools/sim.js 40 missions` with `--pilots N` and `--level L` (`--noscale` turns scaling off; `--scaling size.hp=0.4,…` tries other numbers). The aim: a bigger squad is no easier than two pilots, and a seasoned squad is no easier than a new one.

**Squad size**, mean win rate over all 22 mission cells (heuristic player, 40 squads a cell; look-ahead player 20 squads for three pilots, 12 for five):

| pilots | heuristic, unscaled | heuristic, scaled | look-ahead, scaled |
|---|---|---|---|
| 2 | 78.5% | 78.5% | 94.6% |
| 3 | 93.9% | 79.0% | 94.8% |
| 5 | 97.5% | 78.0% | 93.9% |

Unscaled, a third pilot makes nearly everything a win; scaled, three, four and five pilots land within a point of two for the heuristic player. The look-ahead player lands within a point too. Its hard cell is the Vault at five pilots (33–83%: the ledge holds few), and its easy one is the Heart at five (92% of 12, against 40% for two): the Heart is the first place to look if big squads find the end too soft.

**Level.** Veteran squads (`H.addLevel`: up to three more traits, the rest of the level's growth as points) win about as often as new ones in most missions, because both players already win most of them; the Heart is where growth shows (look-ahead: 40% new, 53% at level 4, 63% at level 7, unscaled). Scaled, the look-ahead player wins 93% of missions at level 4 and 91% at level 7 against 95% new (the Heart 35% and 50% against 40%), and the heuristic player 73% and 58% against 78.5%: a seasoned squad is no easier than a new one, and its missions stay the same missions.

## Open questions

- Whether a level should scale **the Heart's rules** (more Spawners, a faster flood) rather than only its vitality and spawn.
- Whether **gear and boons** should come home with a pilot. Today only traits and points do.
- Bigger squads crowd a fifteen-space page. Larger pages for big squads would be an atlas change (pages are one fixed board each).
