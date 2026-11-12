# Changelog

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
