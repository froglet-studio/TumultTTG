# Changelog

## 2.7.0 — 2026-11-12 — the Flood tide (a harder difficulty)

Plan phase 3, the difficulty retune. Measuring it showed that one setting cannot serve both difficulty targets (BALANCE.md, v2.7.0), so this adds a second difficulty and leaves the first alone.

- **Added:** a difficulty for each run, `T.TIDES` in `world.js`: **Rising tide** (the game as before) and **Flood tide**. On a flood tide, from tier 2, every objective needs 1 more (tier 3: 2 more), every clock except a hold's starts 1 round shorter (2), swarms grow 1 larger (2), and elites bring 1 more escort (2). Tier 1 and the Heart are never changed. A rule a table can apply by hand.
- **Added:** the title screen picks the difficulty (remembered on the device); the map shows a pill on a flood tide. Objective texts state their counts (`Interact ×3`).
- **Changed:** mission generators take the tide as a third argument; `run.tide` is part of a run. Saves go to version 3: an older save loads on the rising tide (fixture `test/fixtures/save-2.6.json`, a version-2 save in the middle of a mission).
- **Added:** `node tools/sim.js 40 --tide flood`, `node tools/ui-drive.js 2 --manual --flood`. Tests: the flood asks exactly its rule's extra from tier 2 on and leaves tier 1 and the boss alone; a version-2 save migrates and plays on; the UI fuzz run plays a flood tide picked on the title screen (98 tests in all).
- **Balance:** the rising tide is unchanged, number for number. On the flood tide the look-ahead player wins 14 runs of 40 (22 on the rising tide) and the heuristic 2 (9). Tables in `docs/reference/BALANCE.md`.

## 2.6.0 — 2026-11-12 — Channel: no die is ever dead

The second slice of roadmap S1 (design/02), accepted into the core by Garrett.

- **Added:** Channel. Spend one banked etherion, or an Omni, with a basic action to do more:
  - Mass: Strike for 4, or Shove 2 nodes.
  - Charge: **Reach**, an Interact up to 2 nodes away (2 AP; not up a ledge from below).
  - Space: **Scramble**, 1 node to any free node, up or down a ledge included (1 AP).
  - Time: Brace, plus 1 extra track slide.

  Every etherion now has somewhere to go. Each channelled action is its own entry in `T.BASIC` (`el` names its etherion) and uses existing verbs. It is deliberately weaker than any Ethereal face of the same colour.
- **Changed:** a channelled button appears beside the basic actions only while its etherion is banked. The heuristic channels Mass into Strike when it can; the look-ahead player weighs every channelled action. How to Play explains Channel.
- **Changed:** a hero stuck on a ledge can Scramble down with a Space die.
- **Added:** a test that Channel pays its etherion or an Omni, refuses without one, and that every etherion has a channelled action (96 tests in all).
- **Balance:** this makes the game easier. The heuristic now wins the tier-1 Elite 90% of the time (was 80%), and the look-ahead player wins the Heart 78% (was 68%) and 22 runs of 40 (was 19). Card-less squads now win the tier-2 Vault 88% of the time in the audit (was 31%); the Heart is still 0% without cards. Tables are in `docs/reference/BALANCE.md`. The difficulty retune after S1 has to absorb this.

## 2.5.0 — 2026-11-12 — basic actions

The first slice of roadmap S1. Garrett accepted basic actions into the core rules (handoff decision 3).

- **Added:** every hero can **Strike** an adjacent foe for 2 (2 AP), **Brace** for Shield 1 until their next turn (1 AP) and **Shove** an adjacent foe 1 node (2 AP), with or without cards. They use the same verbs as cards, cost AP only, never go on the track and can be taken as often as AP allows. They are data (`T.BASIC` in `src/data/world.js`), with `T.canUseBasic` and `T.useBasic`, and buttons under each hero's hand. How to Play explains them.
- **Changed:** both simulated players use them. The look-ahead player gets them as legal actions (`{ t: 'basic', basic, target? }`). The heuristic strikes an adjacent foe it can hurt when no card is worth playing, and braces against a telegraphed hit of 4 or more.
- **Changed:** the ability audit's last row now plays squads with basic actions only. Card-less squads win every tier-1 mission type at least 63% of the time, where Elite was 19% before. The Heart is still 0% without cards.
- **Added:** tests for basic actions (paid in AP only, never on the track, refused without AP or a target). The recipe tests cover `T.BASIC`, and the interface fuzz run clicks the buttons (95 tests in all).
- **Balance:** `node tools/sim.js 40` before and after is in `docs/reference/BALANCE.md`. No cell moves beyond noise.

## 2.4.2 — 2026-11-12 — interface tests stop waiting

No rule changed, and nothing a player sees.

- **Changed:** the interface tests and `tools/ui-drive.js` no longer sleep a fixed second at the end of every mission; they set the pause before the mission-over modal (`T.UI.MISSION_OVER_DELAY`, 900 ms for a person) to 0 and wait until the modal is there. The run driven by autoplay went from about 8 s to 3 s, the clicking fuzz run from 9 s to 7 s, and `npm test` from about 25 s to 21 s on four cores.

## 2.4.1 — 2026-11-12 — generators are engine code

No rule changed; narrated missions and the simulator's tables are byte-identical before and after.

- **Changed:** the board generators, the mission archetypes and the Tide Map moved from `src/data/world.js` to `src/engine/generators.js`, where they are formatted and tested like the rest of the engine. `world.js` keeps the data tables (design/09 §5).
- **Added:** a test that every card face, gear ability and consumable names a verb and a targeting flow the engine knows, so a typo in a recipe fails a test instead of quietly doing nothing in play (93 tests in all).

## 2.4.0 — 2026-11-12 — Ethereal faces must be awakened

Garrett settled the last open rule from the handoff (decision 4): an Ethereal face is magic that must be awakened, and every hero starts with a few awakened.

- **Changed:** an Ethereal face cannot be played until its card has E 1 (`T.RULES.ETHEREAL_MIN_E` is now 1; it was 0). In a mission its button says "needs E 1".
- **Added:** every hero sets out with at least two cards awakened (`T.RULES.START_AWAKE`). The pre-made heroes already have two or three. A drafted hero's first two E points go to its strongest signatures, paid from the starting six UP; the player can move them, and Confirm tops the count back up to two if UP is left. `T.awaken(h)` and `T.awakenedCount(h)`.
- **Changed:** in the draft and in Train, an asleep Ethereal face is dashed and shows what it will do at E 1.
- **Changed:** the playtest panel's switch now offers the rule as shipped (E 1) and the old one (E 0). A choice stored by an older build is ignored, since it was only ever the old default.
- **Changed:** the ability audit counts an Ethereal face as held only while it is awake.
- **Added:** a test that every pre-made and drafted hero sets out with at least two cards awakened, paid from the starting UP (92 tests in all).
- **Balance:** `node tools/sim.js 40` before and after, both players, in `docs/reference/BALANCE.md`. No cell moved more than the noise at 40 missions (about fifteen points); whole runs 8 → 9 of 40 for the heuristic, 20 → 17 for the look-ahead player.

## 2.3.0 — 2026-11-12 — what happens if I end the round now?

The first slice of roadmap P1: the forecast, as text. No rule changed.

- **Added:** under the enemy intents, a line that says what ending the round as things stand will do: what each hero takes or mends, how many foes fall, whether the objective advances, whether the mission ends. Each hero's vitality shows where it is heading (`26/26 → 20`), and the hint bar says what stopping now costs the selected hero.
- **Changed:** that replaces the hint bar's "N foes targeting you (X dmg)", which added up declared numbers whether or not the foe could reach. The forecast plays the declared enemy turn out on a copy: a foe that cannot reach does not count; shields, hazards and wearing-down effects do. Nothing in an enemy turn is random, so it is exact.
- **Added:** `T.forecast(m)`, tested against what really happens at the end of 60-odd rounds across every mission type.
- **Not yet:** the forecast's ghosts on the board (where each mover ends up), and the rest of P1 — the layout, the roster rail, the hand as cards.

## 2.2.0 — 2026-11-12 — a second player, who reads the board

Roadmap milestone F2. No rule changed. The game gained a better instrument for measuring itself, and the first thing it measured is that the game is too easy. `docs/reference/PLAYERS.md` describes the player; `docs/reference/BALANCE.md` has the tables.

- **Added:** the look-ahead player (`src/engine/lookahead.js`). It knows no card by name: it lists every legal action, tries each on a copy of the mission, lets the declared enemy turn play out there, and keeps the line that scores best by one evaluation shared by every mission type. It looks four actions deep and one round ahead. The heuristic autoplayer stays, as the weak player.
- **Added:** actions as plain data — `T.legalActions`, `T.applyAction`, `T.describeAction`. A game is its seed and its list of actions: replaying the list gives the same game.
- **Added:** `T.imagine(m)`, the copy a planner, a preview or a hint must work on. It holds nothing a person at the table could not know: no dice to come, and no knowledge of which cache is the real one.
- **Added:** `T.objectiveProgress(m)`, 0 to 1 for every kind of mission, and `T.finishRound(m)`, the first half of ending the squad's phase.
- **Changed:** `node tools/sim.js` plays every mission with both players and prints the gap between them — how much a mission rewards thinking. It takes about 75 seconds at 40; `--player weak` is the old one-second table.
- **Changed:** the ability audit is played by the look-ahead player, on up to four cores, in about a minute. Its "cannot evaluate" list is empty (it was 67 faces); instead it lists the faces that player held and never chose.
- **Added:** the playtest build has **Plan** in a mission's top bar: what the look-ahead player would do with the turn, and a button to play it.
- **Added:** 7 tests (90 in all): every playable face is offered with every way to resolve it; everything offered can be taken; planning changes nothing; the plan does not depend on dice to come or on where the real cache is; a game replays from its actions; the look-ahead player wins at least as often as the heuristic on every mission type.
- **Balance:** nothing was retuned, and the heuristic's numbers are unchanged. The new player's are the news: over 100 missions a cell it wins 95% against the heuristic's 77% — 88–100% of every mission but the Heart (66%), and 63 whole runs of 100 against 16. Tier 2 and tier 3 are well above their targets for a careful player, and missions last four to seven rounds against a target of 8 to 14.

## 2.1.0 — 2026-11-12 — a mission you can copy, save and resume

Roadmap milestone F1. No rule changed; what changed is how the game holds its state and where its random numbers come from. `docs/reference/STATE_AND_SAVES.md` describes all of it.

- **Added:** a mission in progress is saved. The game saves after every action; close the page in the middle of a round and **Continue** returns to that round — the same dice in hand, the same track, the same intents on the board. Before, a refresh sent you back to the map.
- **Changed:** a run and its mission are plain data: no functions, nothing held in two places. `T.clone(mission)` is a second mission that plays on exactly as the first would — tested on 1,000 missions, copied at a random point. This is what the look-ahead player, previews and undo will stand on.
- **Changed:** the board, the dice and the opposition each draw from a random stream of their own (as do squad building, the Tide Map, loot and events), and a stream is one number kept in the state. The same seed is the same board whoever plays it; rerolling a die no longer changes which reinforcements arrive; saving draws nothing. **A seed names a different mission than it did in 2.0.x.**
- **Changed:** saves carry a version (`T.SAVE_VERSION`, now 2) and older ones are migrated. A 2.0 save still loads and its Tide can be finished; `test/fixtures/save-2.0.json` keeps that true.
- **Fixed:** after loading a saved Tide, finished nodes are ticked on the map again. 2.0 kept every map node in two places, and a loaded save updated only one.
- **Fixed:** a Tide closed on the reward screen could not be continued: that screen read the finished mission, which a save never held, and failed to draw. What it shows is kept with the reward now.
- **Changed:** while a mission lasts, the squad's crystals and the once-a-run Second Wind are the mission's (`m.crystals`, `m.secondWindUsed`); `T.applyMissionResult` hands them back and lets the mission go (`run.mission` is `null` between missions). Each mission counts its own unit ids, so a resumed one cannot hand out an id twice; `T.spawnEnemy(m, …)` replaces `T.makeEnemy`.
- **Added:** the playtest report has **Copy save**: the Tide exactly as it stands, a mission in progress included. `node tools/mission-log.js --save <file>` carries on from that moment.
- **Changed:** `tools/sim.js` meets every mission type with the same squads (only the boards differ), and its simulated player draws from a stream of its own.
- **Added:** 11 tests (83 in all), among them the three that define F1: a copy plays on exactly as the original; the same seed is the same board for any squad; a run saved mid-round resumes exactly.
- **Balance:** the rules are the same and the dice are re-dealt, so every simulated number is a fresh sample. At 1,000 missions a cell no win rate moves beyond twice its standard error (largest move 3 points); whole runs are 22% won before and 23% after over 2,000. Tables in `docs/reference/BALANCE.md`.

## 2.0.3 — 2026-11-12 — a build to playtest with

The same game, built a second way for whoever is testing it. One more card now does what its text says; nothing else in the rules changed.

- **Added:** the playtest build — `npm run build:playtest` → `dist/TUMULT.playtest.html`, or `http://localhost:5173/?playtest` on the dev server. A panel on the title screen starts any mission at any tier with two pre-made heroes, their starting six cards or the kit for that tier, and a seed; switches `ETHEREAL_MIN_E` (decision 4 in `docs/HANDOFF.md`), mid-mission too; lists what to look at in the build; and keeps a log of finished missions on the device, with a report to copy. The ordinary build carries none of it.
- **Added:** `T.quickMission` starts a run inside one chosen mission. The panel and `tools/mission-log.js` both use it, so a seed names the same board and opening dice in either; `mission-log.js` takes a sixth argument, `start` or `tier`, for the kit. `T.addProgression` (the kit a squad would carry by a tier) moved from the test harness into the run layer.
- **Added:** `node tools/build.mjs --fragment` writes a build without the `<html>`, `<head>` and `<body>` wrapper, for a host page that supplies its own. Every build now knows its version (`T.BUILD`).
- **Fixed:** *Distributed Arms — Multitask* frees the next card played **this turn**, as it says; the offer used to wait as long as it took. *Parallel*'s two still wait until they are spent. `freecast` takes `dur`.
- **Fixed:** no screen scrolls sideways at a phone's width: the Tide Map's nodes and the hand's cards share the row instead of overflowing it. The page is sized from its container rather than the viewport, so it sits properly inside a host page; a new screen starts at its top; a tooltip left by a tap goes when the page scrolls. The mission screen is still built for a mouse (roadmap P1).
- **Changed:** the interface has three optional extension points (`U.titleExtra`, `U.missionTopExtra`, `U.extraAct`), which is how the panel attaches without the game knowing about it.
- **Added:** 8 tests (72 in all): quick missions, the build variants, Multitask, and the panel driven through the real page.
- **Balance:** unchanged. `node tools/sim.js 40` prints the same tables, byte for byte, as 2.0.2.

## 2.0.2 — 2026-11-12 — the engine does what the text says

Roadmap milestone S0. A review at handoff listed eight places where card or boon text promised something the engine did not do. Seven are fixed, each test-first; the eighth is now a switch with the numbers for both settings, waiting on a decision. Tests written to keep the class from coming back found as many again, fixed here too.

- **Fixed:** a condition on an effect (`ifAnchored`, `ifOnHazard`, `ifAdjacent`, `ifE`, `ifHpBelow`) now gates it whatever its verb. *Talon Strike — Pin* Weakens only prey left at 8 hp or less; *Radiotrophic Resilience — Thrive* mints its AP only on a hazard.
- **Fixed:** *Hollow Bones — Weightless* and *Neoteny — Reshape* let a hero walk up to a ledge, as they always said.
- **Fixed:** an Anchored or Slowed Harrier cannot blink. A held Harrier still lances a hero beside it: before, a Counted Trap took its whole turn.
- **Fixed:** strike bonuses go to strikes. A corrosion tick, a snare or a zone no longer spends "your next strike" or gains a form's bonus; "this turn" bonuses (*Tool Use — Improvise*, *Silent Flight — Glide*) end with the turn; *Night Eyes — Thermal* lasts its 1 + E rounds instead of one.
- **Fixed:** boons are wired by their `hook` and `val`, so the table is the truth. *Momentum* works every round, not once a mission. *Quick Hands* did nothing; it now brings round-1 cards home a column sooner. *Second Wind*'s text says what it does: its holder rises, not whoever falls first.
- **Fixed:** a Located Harrier cannot fade (it keeps its turn). The Warden's bestiary text no longer claims area damage beats its shield. A few telegraphs and tooltips corrected.
- **Fixed:** no recipe carries an option the engine ignores. `interact` honours `height`; `anyTerrain`, `los` on `force`, `kind` on `hazardImmune` and three no-ops are gone. *Current-Cling Anchor — Cling* loses a round of hazard immunity its text never mentioned.
- **Added:** `T.RULES.ETHEREAL_MIN_E` — whether an Ethereal face can be played at E 0. Unchanged at 0; the choice is Garrett's (`docs/HANDOFF.md`, decision 4).
- **Added:** `node tools/sim.js … --rule NAME=VALUE` tries a rules constant for one run.
- **Added:** 24 tests (64 in all), among them one that fires every card face, gear ability and consumable in several situations and fails on any recipe option the engine ignores, and a suite that holds each of the fifteen boons to its text.
- **Balance:** small. Eleven of sixteen mission cells keep their win rate and none moves more than five points; see `docs/reference/BALANCE.md`.

## 2.0.1 — 2026-11-11 — moved into this repository

No rules changes. The v2.0 game was reorganised into `src/`, `tools/` and `test/` and given a build, a test suite and continuous integration.

- **Fixed:** the pre-made hero *Veil* carried four Barn Owl cards, breaking the three-per-bloodline cap. *Binocular Foresight* was replaced with *Burrowing* (Jerboa). Found by the new data tests.
- **Fixed (text only):** the boss briefing and the log said the Vault drowns in six rounds and that area damage beats the Heart's shield; the engine gives seven rounds and its shield stops area. The text now says so.
- **Documented:** a review found several places where card or boon text promises something the engine does not do. They are listed as known issues in `docs/HANDOFF.md` and scheduled as roadmap milestone S0; none was changed here.
- **Added:** `npm test` (40 tests: data integrity, engine rules, every mission type, full runs with save round-trips, the build, and two whole runs driven through the real interface).
- **Added:** `npm run audit` → `docs/reference/ABILITY_AUDIT.md`, which measures the ability rules: staples, tools and narrow faces, gate checks, autoplayer usage.
- **Added:** `npm run catalog` → `docs/reference/CARDS.md`, generated from the card data.
- **Added:** zero-dependency build (`tools/build.mjs`) and dev server replacing the shell script; Prettier; GitHub Actions.
- **Changed:** engine, UI and tools reformatted with Prettier. Simulation output is byte-identical before and after.
- **Docs:** design pillars, roadmap, proposals for the next version, and the v1.0 design bundle (archived, unchanged).
- **Repository:** run like Cosmic Shore. Changes under `.github/` need a code owner's review; workflow actions are pinned to commit SHAs; `.gitignore` blocks credentials; `AGENTS.md` points every agent at `CLAUDE.md`; the README states the licence as Cosmic Shore does; commit messages follow Froglet's `type(scope): summary` rules.

## 2.0.0 — 2026-11-06 — the playable game

A roguelike run built on the v1.0 core: draft two heroes from eleven bloodlines, a seven-row branching map, six generated mission archetypes (Swarm, Vault, The Sought, Cascade, Elite, Boss), telegraphed enemy intents, twelve enemy types, 99 two-faced trait cards implemented as data, gear, boons, consumables, havens, events, saving, and a headless balance simulator. See `docs/reference/`.

## 1.0 — the design bundle

The core rules (15-die pool, six-column track, two-faced cards, the P/E grammar, no turn theft, no hard counters), the species trait catalog, a reference engine in Python and four interactive demos. Archived in `docs/archive/v1.0/`.
