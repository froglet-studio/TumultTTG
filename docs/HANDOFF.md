# Handoff — 11 November 2026

Tumult was designed and built over a long chat session and has now moved into this repository so that work can continue in Claude Code, with other people. This file is the bridge: what exists, what was checked, what is not done, and how to start.

## In short

- **v2.0 is a complete, playable game** and it is all here: source, tools, tests, reference docs, and the original v1.0 design bundle.
- **The next version is designed but not built.** Garrett's brief — polish and artwork, abilities that are each a staple or a flexible tool, boards that differ every encounter, problems that are not all fights, a game that helps create pilots — is written up as requirements in [`design/00-pillars.md`](design/00-pillars.md), as proposals in the rest of `design/`, and as milestones in [`ROADMAP.md`](ROADMAP.md).
- **There is now a way to measure the ability rules** (`npm run audit`), and a first set of findings.

## What is in the repository

| Thing | Where | Origin |
|---|---|---|
| The game | `src/` | v2.0, reorganised; rules unchanged |
| Build, dev server, simulators, generators, UI driver | `tools/` | rewritten for the repo (Node, no shell scripts) |
| Tests | `test/` | new |
| How v2.0 works | `docs/reference/` | the v2.0 system docs, updated for the new layout; `CARDS.md` and `ABILITY_AUDIT.md` are generated |
| Where it is going | `docs/design/`, `docs/ROADMAP.md` | new, from the design work in the chat session |
| The setting, as far as the game needs it | `docs/LORE.md` | a public-safe summary; not canon |
| The v1.0 design bundle | `docs/archive/v1.0/` | unchanged: six design docs, the Python reference engine, four interactive demos |

Old file names, for anyone holding the earlier source bundle: `data_cards.js` → `src/data/cards.js` · `data_world.js` → `src/data/world.js` · `engine.js`, `ai.js`, `run.js` → `src/engine/` · `ui_core.js`, `ui_mission.js`, `style.css` → `src/ui/` · `sim.js` → `tools/sim.js` · `dbg.js` → `tools/mission-log.js` · `build.sh` → `tools/build.mjs`.

## What was checked

On Linux with Node 22, at the commit that added this file:

- `npm run build` produces a single self-contained HTML file (about 335 KB) whose script compiles.
- `npm test`: 40 tests pass — card and world data integrity, all 198 card faces fire without an engine error, the dice and track invariants, the damage pipeline, no turn theft, determinism by seed, every mission type at every tier, full runs with save round-trips, the build, and two complete runs driven through the real interface in jsdom (one auto-played, one by clicking).
- Reformatting the engine and UI with Prettier changed nothing: 16 narrated missions and a full simulation batch were byte-identical before and after.
- Simulated balance is in line with the v2.0 tuning pass (`docs/reference/BALANCE.md`).

**Not checked:** the tools and tests have not been run on Windows or macOS, and CI has never run because nothing has been pushed. The code avoids the usual Windows traps (paths, file URLs, line endings), but the first `npm run check` on a new machine and the first CI run are real tests — do them first. In PowerShell, call tools that take arguments as `node tools/…`; `npm run x -- args` loses its `--` there.

## What changed in the move

- **One rules-relevant fix.** The pre-made hero *Veil* carried four Barn Owl cards, breaking the three-per-bloodline cap; *Binocular Foresight* was swapped for *Burrowing*. The new data test found it.
- **Two lines of boss text** now match the engine: the Vault drowns in seven rounds, not six, and area damage does not get through the Heart's shield.
- **Formatting.** Engine, UI and tools are Prettier-formatted. `src/data/` is excluded on purpose: its hand-aligned tables read and diff better one entry per line.
- **Version** is 2.0.1. See `CHANGELOG.md`.

## What is not done

Everything in the brief. Nothing in `docs/design/01`–`09` has been implemented. In particular the game today still has: two-hero squads; six mission archetypes on grid boards; a placeholder frame (a "tide-run" against a Consolidation and its Heart); emoji for icons; no dossier.

## What the first audit says

Full report: [`reference/ABILITY_AUDIT.md`](reference/ABILITY_AUDIT.md). Interpretation and plan: [`design/05-ability-audit.md`](design/05-ability-audit.md).

- 154 of 198 faces are staples, 30 are flexible tools, **14 are narrow** (mostly short-range reveals and hazard immunities).
- No mission type is gated by any one family of abilities — but **Elite and Boss are all but unwinnable with no cards**, because there is no basic attack. (The boss could not be judged for gates at all: the autoplayer wins it too rarely even with every card.)
- **17 faces can settle a mission's central problem alone** (whole-board reveals, outright Shield deletion).
- Squads with no cards win tier-1 Swarm and Cascade almost every time: those missions are too thin.
- The autoplayer has no rule for 67 faces and under-plays Ethereal faces, so usage numbers are a floor. That is why the roadmap starts with the foundations for a better player (F1, then F2).

## Decisions waiting for Garrett

1. The frame: is "a season as guides on Tumult, ending with a berth on the Cosmic Shore" right? ([design/01](design/01-frame-and-campaign.md) lists five specific questions.)
2. Squad size: three by default, two supported — agreed?
3. Basic actions, Channel and Overcast ([design/02](design/02-units-verbs-actions.md)): these add rules to the v1.0 core. Acceptable?
4. Which setting terms may appear in a public repository and a public build. The v2.0 event and mission text (`src/data/world.js`) uses some setting nouns as flavour, and `docs/LORE.md` summarises more. Review both **before the first push** — after it, they are public.
5. Licensing of non-code content. The MIT licence in this repository currently covers everything in it, including text and any future art.
6. Ethereal faces at E 0. v1.0 says an Ethereal capability exists only at E ≥ 1; the v2.0 engine lets the face be played at E 0 with its E-0 numbers, and about a fifth of simulated Ethereal plays are exactly that. Which is the rule?

## Known issues and debt

**Text the engine does not honour** — found by an independent review at handoff; each should be fixed test-first, and several will move balance a little (roadmap S0):
- Ethereal faces can be played at E 0: `T.canPlay` has no E check (see decision 6).
- Conditions on effects (`ifAnchored`, `ifOnHazard`, `ifAdjacent`, `ifE`) are honoured only by `strike`, `heal` and area `dot`; `ifHpBelow` is never read. So *Talon Strike — Pin* Weakens any foe, not only small prey, and *Radiotrophic Resilience — Thrive* mints its AP off-hazard too.
- Weightless and climbing Morph forms cannot walk onto height nodes: `walkNeighbors` only follows climb edges once the ramp is down.
- Anchoring a Harrier does not stop its blink; only a Counted Trap's hold does.
- The *Momentum* boon applies once per mission; its text says each round.
- `hazardImmune` ignores its `kind: 'push'` option, so *Current-Cling Anchor*'s physical face grants a round of hazard immunity its text does not mention.
- `anyTerrain` on `teleport`, `los` on `force` and `height` on `interact` are accepted in recipes and never read.
- A boon's `hook` field is decorative except for `face`; boons are wired by id.

**Game**
- No basic attack; kill objectives are all but impossible for a squad without cards.
- Tier-1 objective missions can be won by walking to the objective.
- Missions run shorter than the 8–14 round target at tiers 1 and 2.
- The boss's true difficulty is unknown: the autoplayer wins it a quarter to a third of the time with a realistic kit and almost never with a random one, and nobody has measured how people fare.
- A mission in progress is not saved; refreshing returns to the map at that node.

**Code**
- One random stream drives squad building, board generation, dice and opposition, so seeds are not comparable across squads.
- `tools/sim.js` and `test/missions.test.js` mix the archetype name's *length* into their seeds, so Swarm, Vault and Elite cells play identical squads. Harmless, but the samples are correlated. (`tools/audit.js` uses the archetype's index.)
- The autoplayer (`src/engine/ai.js`) is a chain of hand-written cases; it is for simulation only and is the weakest part of the measurement story.
- `T.runEffects` is defined and then wrapped later in `engine.js` (for decoy placement). It works; it is confusing.
- `src/data/world.js` mixes data tables with generator code.
- The UI is string templates re-rendered wholesale, with one delegated click handler. Fine at this size; it will not survive the presentation milestones unchanged.
- Saves carry no version number.
- The interface tests wait in real time for end-of-mission animations, which is most of the test suite's 15 seconds.

**Repository**
- The Pages workflow (`.github/workflows/pages.yml`) is manual and has never run. It uses the action versions documented in those actions' READMEs; adjust if GitHub complains.

## Starting in Claude Code

1. Clone, `npm install`, `npm run check`. If anything fails on your machine, fix that first.
2. `npm run dev` and play a run. Then `node tools/mission-log.js vault 2 7` to see the same rules narrated.
3. Read `CLAUDE.md` (loaded automatically), this file, and `ROADMAP.md`.

Prompts that make good first sessions:

> Read CLAUDE.md, docs/HANDOFF.md and docs/ROADMAP.md. Run `npm install` and `npm run check`, and tell me what, if anything, fails on this machine.

> Interview me on the open questions in docs/design/01-frame-and-campaign.md, one at a time. Then update the document with my answers and mark what is now settled.

> Implement roadmap milestone F1 as described in docs/design/09-engineering.md. Write the clone-equivalence test first, keep every existing test green, and open a pull request.

> Start roadmap milestone P1: propose the new mission-screen layout as a static mock-up in a branch before changing any behaviour.

Two optional helpers are included as project skills: `/ability` (add or change an ability in line with the ability rules) and `/playtest` (simulate and summarise).

## Repository setup still to do

- **Push.** The work is committed locally on `main` on top of the repository's initial commit.
- **Watch the first CI run** (format check, build, tests on Node 22 and 24).
- **Optional — a public play link.** Settings → Pages → Source: *GitHub Actions*, then run the *Publish playable build* workflow by hand. Nothing is published until someone does.
- **Optional — protect `main`** (require the CI check and a review) before inviting collaborators.
- **Optional — fewer permission prompts in Claude Code.** A shared `.claude/settings.json` can pre-approve the project's own commands. It is deliberately not included: which commands an agent may run without asking is a decision for the repository's owner. A starting point, to be checked against the current Claude Code permissions documentation:

  ```json
  {
    "permissions": {
      "allow": ["Bash(npm run *)", "Bash(npm test)", "Bash(node tools/*)", "Bash(node --test)"]
    }
  }
  ```

## Earlier copies

The v1.0 hub and the v2.0 single-file build shared before this repository existed are in Froglet's internal workspace. This repository supersedes them; when they disagree, this is the current one.
