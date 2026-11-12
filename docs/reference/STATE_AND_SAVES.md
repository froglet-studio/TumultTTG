# State, seeds and saves

How a run and a mission are held in memory, where their random numbers come from, and what a save is. Built in v2.1.0 (roadmap F1); the proposal it settles is `docs/design/09-engineering.md` §1, §3 and §7. `test/state.test.js` holds all of it in place.

## A mission is plain data

`run.mission` is made of numbers, strings, booleans, `null`, arrays and plain objects, and nothing else. No functions, no class instances, nothing `undefined`, and no object that can be reached by two different paths. Cards, gear, boons and enemy types are named by id and looked up in the data tables; a trap or a zone names its owner by `uid`.

Three things follow, and each has a test:

- **It can be copied.** `T.clone(mission)` is a second mission. Play both with the same actions and they produce the same log and end in the same state (1,000 missions, cloned at a random point, mid-round for half of them).
- **It can be saved in the middle of a round** and resumed exactly: the dice in hand, the track, the declared intents.
- **It can be handed to someone else.** A save pasted into a file is that moment, to the die: `node tools/mission-log.js --save file`.

One link is deliberate: `mission.heroes` is the same array as `run.heroes`. The heroes are the run's, and a mission plays them. A save writes them once and `T.deserializeRun` ties them back together. A copy made with `T.clone(mission)` carries its own copies of the heroes and belongs to no run — which is what a look-ahead wants.

What a mission needs from its run it takes when it starts (`T.startMission`): the squad, the crystals (`m.crystals`), and whether the once-a-run Second Wind is spent (`m.secondWindUsed`). `T.applyMissionResult` hands the last two back, applies the result, and sets `run.mission` to `null`. What the reward screen shows of the finished mission (rounds, kills, bonus objectives) is kept in `run.lastReward`.

Every hero, foe and decoy has a `uid` counted by the mission itself (`m.uids`): heroes are 1 and 2, foes follow. `T.spawnEnemy(m, type, tier, node)` is the only way a foe comes to be.

### If you add state

- Keep it plain. Store an id, not the thing; a `uid`, not the unit.
- Never store `undefined`: use `null`. JSON drops the one and keeps the other.
- `H.plainProblems(value)` (in `tools/harness.js`) lists every violation with its path. It runs after every card face, gear ability and consumable that `test/data.test.js` and `test/recipes.test.js` fire, so a verb that leaves something else behind fails there.

## Random streams

A random stream is **one 32-bit number kept in the state**. Drawing from it advances the number; the number is all there is to copy or save.

```js
T.stream(m.rngs, 'dice').pick(faces)     // a view on m.rngs.dice, with int / pick / shuffle
T.runStream(run, 'loot').shuffle(cards)  // a run's stream, made the first time it is asked for
T.makeRng(seed)                          // a stream that stands alone, for generators and tools
T.subSeed(seed, 'label')                 // the seed for one named purpose, derived from another
```

Each purpose has a stream of its own, so what one draws never moves another:

| stream | lives in | draws |
|---|---|---|
| `squad` | `run.rngs` | draft packs, hero ids, the kit `T.addProgression` hands out |
| `map` | `run.rngs` | the Tide Map |
| `loot` | `run.rngs` | card and boon offers, haven stock |
| `event` | `run.rngs` | which event, and the random picks inside one |
| `player` | `run.rngs` | a simulated player's choices in `tools/harness.js` — never the game's |
| board | used up before the mission starts | the mission generator: board, objective, foes, title |
| `dice` | `m.rngs` | every roll and reroll |
| `foes` | `m.rngs` | reinforcements: which, and where |

Enemy intents and their execution use no randomness at all, and neither does the autoplayer.

**A mission's seed** is `T.missionSeed(run, type, tier)`: the run's seed, where the mission is (its node on the Tide Map, or the order of launching when there is no map), its type and its tier. The board, `dice` and `foes` are each derived from it. So:

- **the same seed is the same board, whoever plays it** — another squad, another kit, another road across the map;
- a tool that plays the same forty squads against every mission type meets a different board in each (`tools/sim.js` does exactly that);
- rerolling a die does not change which reinforcements arrive.

The generator is mulberry32, the one the game has always used: `T.makeRng(123)` gives the numbers it gave in 2.0. What changed in 2.1.0 is which stream each draw comes from, so **a seed names a different mission than it did in 2.0.x**.

Never call `Math.random()` in `src/engine` or `src/data`, and never keep a generator in a closure: the engine test checks the first, and a stream that is not a number in the state cannot be copied or saved.

## Saves

A run is plain data too — its streams are numbers, a mission in progress is part of it — so **a save is the run written out as JSON**, and loading one gives back the same run. `T.deserializeRun(T.serializeRun(run))` serialises to the same text again. Saving draws no random number. Whole runs played through a save at every node, and once in the middle of every mission, end exactly as they do when played straight through.

The browser saves to `localStorage` (`tumult_v2_run`) after every action in a mission and at every node; **Continue** returns to wherever the page was closed — a mission in mid-round, a reward, a haven, an event, or the map. Only the animation queue (`m.fx`) is left out.

`run.v` is `T.SAVE_VERSION`. Raise it whenever the saved shape changes, add a step to `migrate` in `src/engine/run.js` that brings the previous version forward, and add a fixture under `test/fixtures/` taken from the outgoing version, as `save-2.0.json` was. Version history:

| `v` | from | shape |
|---|---|---|
| 1 | 2.0.x (no `v` field) | one random stream, not kept; no mission; heroes stripped of dice and track; each map node stored twice |
| 2 | 2.1.0 | the run as it stands: streams in `run.rngs`, the mission included, map rows as lists of node ids |

A version-1 save still loads: it returns to the map (2.0 never kept a mission), its streams start from the seed, and the map is rebuilt from the copy of each node that 2.0 kept up to date. A save from a newer version than the game is refused rather than guessed at.
