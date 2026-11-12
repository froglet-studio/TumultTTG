# 09 · Engineering

**Status: §1, §3 and §7 are built (v2.1.0, roadmap F1 — [`../reference/STATE_AND_SAVES.md`](../reference/STATE_AND_SAVES.md)) and so is §2 (v2.2.0, roadmap F2 — [`../reference/PLAYERS.md`](../reference/PLAYERS.md)). The rest is proposed.** The v2.0 code is small, tested and deliberately simple. These are the changes that unlock the rest of the roadmap, in the order they pay off.

## 1 · Mission state that can be copied — built

*As proposed, before 2.1.0:* Today a mission is a live object graph. Make it plain data: no functions or DOM references inside the state, cards referenced by id, the random generator's position stored in the state. Then `clone(mission)` is a structured copy, and five things become cheap at once:

- **look-ahead** — try an action on a copy and see what happens;
- **forecast and previews** in the interface ([07](07-art-and-ux.md));
- **undo** — keep the previous state;
- **mid-mission saves** — serialise it;
- **replays and bug reports** — a seed plus the list of actions reproduces any game exactly.

Test to write first: for random missions, `clone` then play both copies with the same actions and compare logs.

## 2 · A player that looks ahead — built

*As proposed, before 2.2.0:* The heuristic autoplayer has hand-written rules for some verbs and none for others, so it cannot evaluate a third of the cards and under-plays Ethereal faces ([05](05-ability-audit.md)). Replace it, for measurement, with a generic one:

1. list every legal action for the squad (the engine already knows: `T.canPlay` and its targets, plus the basic actions);
2. apply each to a copy; then simulate the rest of the round — enemy intents are declared, so this is deterministic;
3. score the result with one evaluation shared by every mission: objective progress, squad vitality, opposition remaining, tempo left on the clock, dice and cards kept for next turn;
4. search a few actions deep with a beam, not one action greedily.

Because it scores outcomes instead of recognising verbs, it handles any new card, prop or mission type without being taught. Uses: the audit, balance tables, the hint button, an auto-played squadmate, and regression tests that say "this mission is still winnable by a competent player".

Keep the old heuristic as the *weak* player. The gap between the two is a useful number: it is how much a mission rewards thinking.

## 3 · Separate random streams — built

*As proposed, before 2.1.0:* Board generation, dice and opposition choices currently share one generator, so changing how a squad is built changes the board that follows. Give each its own stream derived from the seed. Seeds then mean "this board" regardless of who plays it, which makes paired comparisons and bug reports exact. (`tools/audit.js` already works around this by reseeding before a mission.)

## 4 · A season log

Record every decision and outcome as structured events. The dossier ([06](06-pilots-and-backstory.md)), replays, the post-mission report and playtest telemetry all read from it.

## 5 · Split the data from the generators

`src/data/world.js` mixes hand-aligned data tables (gear, boons, bestiary, events) with code (board and mission generators, the map). Split it: tables stay as data, generators move to `src/engine/` and get formatted and tested like the rest. Add a schema check for cards and props so a typo in a recipe fails a test instead of failing in play.

## 6 · Modules, when the time comes

The global `T` namespace keeps the build trivial and has cost little so far. It will start to hurt as the engine grows — everything can reach everything. Move to ES modules (engine and data importable on their own, no DOM), add JSDoc types for the data shapes, and keep the single-file output with a small bundling step. Do this once, between milestones, not gradually.

## 7 · Saves that survive updates — built

*As proposed, before 2.1.0:* Saves are keyed `tumult_v2_*` with no version inside. Add a version field and a migration step before the first change that alters the saved shape, and a test that loads a saved game from each prior version.

## Constraints that do not move

- The engine and data are deterministic and DOM-free.
- The shipped game is one self-contained HTML file that makes no network requests.
- No runtime dependencies. Development dependencies stay few and boring.
- `npm run check` stays under a minute.
