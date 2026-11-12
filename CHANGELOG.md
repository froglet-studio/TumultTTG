# Changelog

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
