# Handoff — 11 November 2026

Tumult was designed and built over a long chat session and has now moved into this repository so that work can continue in Claude Code, with other people. This file is the bridge: what exists, what was checked, what is not done, and how to start.

## In short

- **v2.0 is a complete, playable game** and it is all here: source, tools, tests, reference docs, and the original v1.0 design bundle.
- **The next version is designed but not built.** Garrett's brief — polish and artwork, abilities that are each a staple or a flexible tool, boards that differ every encounter, problems that are not all fights, a game that helps create pilots — is written up as requirements in [`design/00-pillars.md`](design/00-pillars.md), as proposals in the rest of `design/`, and as milestones in [`ROADMAP.md`](ROADMAP.md).
- **There is now a way to measure the ability rules** (`npm run audit`), and a first set of findings.
- **Since the handoff:** roadmap milestone S0 is done (v2.0.2, 12 November 2026). The engine now does what the card, boon and bestiary text says; the list this file used to carry is empty, and two tests keep it that way. One question from it is still open — decision 4 below.
- **There is a build to playtest with** (v2.0.3): `npm run build:playtest` adds a panel that starts any mission from a seed, switches the rule from decision 4, and writes a report. See "Play it" in [`reference/OVERVIEW.md`](reference/OVERVIEW.md).
- **Roadmap milestone F1 is done** (v2.1.0): a mission is plain data that can be copied, saved in the middle of a round and resumed exactly; the board, the dice and the opposition each have a random stream of their own, so a seed names a board whoever plays it; saves carry a version. [`reference/STATE_AND_SAVES.md`](reference/STATE_AND_SAVES.md) is how it works. 
- **The interface forecasts the end of the round** (v2.3.0, the first slice of roadmap P1): under the enemy intents, what ending the round now will cost each hero and do to the objective. It is exact, because an enemy turn has no dice in it.
- **Roadmap milestone F2 is done** (v2.2.0): a second simulated player that tries every legal action on a copy of the mission and scores the outcome. It can play every card face, the simulator reports it beside the old autoplayer, and the ability audit is played by it. [`reference/PLAYERS.md`](reference/PLAYERS.md) is how it works. **What it found matters more than that it exists:** a player who only reads the declared intents and thinks one round ahead wins 88–100% of tier-3 missions and two runs in three — the game is far easier than its targets, and than the old tables said ([`reference/BALANCE.md`](reference/BALANCE.md)).

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

CI has run since: the first pull request and the merge to `main` both passed the format check, build and tests on Node 22 and 24.

**Not checked:** the tools and tests have not been run on Windows or macOS. The code avoids the usual Windows traps (paths, file URLs, line endings), but the first `npm run check` on a new machine is a real test — do it first. In PowerShell, call tools that take arguments as `node tools/…`; `npm run x -- args` loses its `--` there.

## How this repository was assembled

The work was done in a Claude Cowork session and committed there, on Garrett's computer, as six commits that were never pushed. A Claude Code session on 11 November 2026 rebuilt them here from that session's transcript: it replayed every recorded file operation in order (files written, edits, formatting, generated docs) and checked the result two ways.

- **Against the numbers Cowork recorded** from its own final clone: 75 files; a 343,303-byte build; 40 of 40 tests; the same audit summary; regenerating the docs changes nothing; the same simulated runs (4 of 20 won, 74% of missions) and the same scripted run through the interface.
- **Against Cowork's commit ids.** From the rebuilt files, with Cowork's commit messages, author and timestamp, git produces exactly Cowork's ids, `1489bc2` through `f8ce148`. The content is byte-identical to the copy on Garrett's computer.

The first six commits in this repository have the same trees as Cowork's six. They were re-made in Froglet's commit format, with the session trailers and a signature, so their ids differ; each one's message names the Cowork commit it reproduces. The copy on Garrett's computer is superseded: do not push it.

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
- The autoplayer has no rule for 67 faces and under-plays Ethereal faces, so usage numbers are a floor. That is why the roadmap starts with the foundations for a better player (F1, then F2). *(Both are built. The audit is now played by the look-ahead player, which can play every face; the generated report is current, and this list is the first audit's.)*

## Decisions

**DECIDED (Garrett, 2026-11-11): run this repository like Cosmic Shore**, with the same security and transparency. That settled the three questions this handoff left open before the first push:

- **The setting may be public.** `docs/LORE.md`, the design proposals and the setting nouns used as flavour in `src/data/world.js` stay in the open, as Cosmic Shore's design docs are; those already name Tumult. Internal notes, links into Froglet's workspace, unreleased story and personal data still stay out.
- **Licence:** MIT, stated in the README the way Cosmic Shore states it.
- **Authorship:** commits written by Claude are authored `Claude <noreply@anthropic.com>` and carry `Co-Authored-By:` and `Claude-Session:` trailers, as in Cosmic Shore.

What that means day to day is in `CONTRIBUTING.md` and `CLAUDE.md` ("This repository is public"); the GitHub settings it needs are under [Repository settings](#repository-settings).

**Waiting for Garrett:**

1. The frame: is "a season as guides on Tumult, ending with a berth on the Cosmic Shore" right? ([design/01](design/01-frame-and-campaign.md) lists five specific questions.)
2. Squad size: three by default, two supported — agreed?
3. ~~Basic actions, Channel and Overcast.~~ **DECIDED (Garrett, 2026-11-12):** basic actions and Channel join the core; Overcast and Debt wait for the frame (C1), because Debt clears at beacons. Strike, Brace and Shove are built (2.5.0).
4. ~~Ethereal faces at E 0.~~ **DECIDED (Garrett, 2026-11-12):** Ethereal faces are magic that must be awakened — a face needs E 1 on its card — but every hero begins with a few awakened, so they start with some toys. Built in 2.4.0 (`ETHEREAL_MIN_E: 1`, `START_AWAKE: 2`); the playtest build keeps the old rule one switch away.

## Known issues and debt

**Text the engine does not honour** — none known. A review at handoff found eight places; roadmap S0 fixed seven and turned the eighth into decision 4, and found and fixed as many again on the way (`CHANGELOG.md`, 2.0.2). Two tests guard the class: `test/recipes.test.js` fails on any recipe option the engine ignores or formula it never evaluates, and `test/boons.test.js` holds every boon to its text. Neither can read prose, so flavour text, telegraphs and tooltips still need a person's eye when rules change.

**Game**
- With no cards at all, the Heart still cannot be beaten (0% in the audit): Strike's 2 damage does not get through its shield. Every other mission type can now be finished without cards (2.5.0).
- Tier-1 objective missions can be won by walking to the objective.
- Missions run shorter than the 8–14 round target at tiers 1 and 2.
- **Tiers 2 and 3 are too easy for a careful player**, and missions too short: the look-ahead player wins 88–100% of every mission but the Heart, in four to seven rounds, with four fifths of its vitality left. The targets were 75–90% at tier 2 and 50–75% at tier 3. Only the Heart (66%) is near its target. Nothing has been retuned; nobody has measured how people fare.
- The mission screen is built for a mouse. It fits a phone's width, but a card face's numbers are only in its hover tooltip (roadmap P1).
- A hero on a ledge cannot walk back down until the ramp drops; only a blink, a climb, still being Weightless or (since 2.6.0) a Space die channelled into Scramble gets them off. Harmless on the Vault, where the ledge is the objective. Settle it before a board puts a ledge anywhere else (roadmap S4).
- The heuristic autoplayer plays a conditional face whether or not its condition holds, and does not know that a Weightless hero can walk up a ledge. The look-ahead player has neither blind spot; it has others — it thinks one round ahead, so it never plays some forty faces whose worth comes later (`reference/PLAYERS.md`, "What it cannot do").
- A mission can stall. With one hero left and an elite that cannot reach them, the heuristic autoplayer neither wins nor loses and the simulator calls it a loss at round 40 — `node tools/mission-log.js elite 2 7 3 1 tier` is one. Whether a person can be stuck the same way is not known; it is the same gap as the missing basic attack (roadmap S1).

**Code**
- A seed names a different mission from v2.1.0 on than it did in 2.0.x: the draws moved to separate streams. Old seeds in notes and reports do not carry over.
- The heuristic autoplayer (`src/engine/ai.js`) is a chain of hand-written cases, kept as the weak player. The look-ahead player's judgement is one table of weights (`T.EVAL`), set by reasoning and not fitted to results; it has never been checked against how a person plays.
- `node tools/sim.js 40` takes over a minute now that it plays every mission twice, and `npm run audit` about a minute on four cores. `--player weak` is the quick look.
- `T.runEffects` is defined and then wrapped later in `engine.js` (for decoy placement). It works; it is confusing.
- The Warden's shield stops area damage because `T.damage` checks for its type by name, and an overridden foe's blow at its neighbour skips the damage pipeline altogether. Both are special cases in the engine that should be data and verbs.
- The UI is string templates re-rendered wholesale, with one delegated click handler. Fine at this size; it will not survive the presentation milestones unchanged.
- The test suite takes about 20 seconds; the long pole is the test that the look-ahead player beats the heuristic on every mission type (about 14 s on four cores).

**Repository**
- The Pages workflow (`.github/workflows/pages.yml`) is manual and has never run. It uses the action versions documented in those actions' READMEs, pinned to commit SHAs; adjust if GitHub complains, and bump each SHA with its version comment.

## Starting in Claude Code

1. Clone, `npm install`, `npm run check`. If anything fails on your machine, fix that first.
2. `npm run dev` and play a run. Then `node tools/mission-log.js vault 2 7` to see the same rules narrated.
3. Read `CLAUDE.md` (loaded automatically), this file, and `ROADMAP.md`.

Prompts that make good first sessions:

> Read CLAUDE.md, docs/HANDOFF.md and docs/ROADMAP.md. Run `npm install` and `npm run check`, and tell me what, if anything, fails on this machine.

> Interview me on the open questions in docs/design/01-frame-and-campaign.md, one at a time. Then update the document with my answers and mark what is now settled.

> Start roadmap milestone S1 (docs/design/02-units-verbs-actions.md): give every pilot basic actions. Measure before and after with both players (`node tools/sim.js 40`), and say what happens to the "no cards at all" row of the audit.

> Start roadmap milestone P1: propose the new mission-screen layout as a static mock-up in a branch before changing any behaviour.

Two optional helpers are included as project skills: `/ability` (add or change an ability in line with the ability rules) and `/playtest` (simulate and summarise).

## Repository settings

Already in files, mirroring Cosmic Shore: `.github/CODEOWNERS` puts `.github/` under review by Shombith03, FenrysUnchained, gradies and YsKhan61, the same four who review Cosmic Shore's; workflows run with read-only tokens (only the Pages deploy job gets more) and pinned actions; `.gitignore` blocks signing material and `.env` files; `AGENTS.md` points every agent at `CLAUDE.md`.

Only a repository admin can set the rest, on GitHub:

- **A ruleset on `main`**, the counterpart of Cosmic Shore's "Protect trunks": require a pull request, require the CI checks (`build + test (Node 22)` and `build + test (Node 24)`), require review from Code Owners, and block force pushes and deletion. CODEOWNERS enforces nothing until this exists. Do it before inviting more people: dozens of accounts can already push here.
- **Actions → Fork pull request workflows:** require approval for all external contributors, the setting Cosmic Shore's CI docs require for a public repository.
- **Merging:** squash and merge as the default, as Cosmic Shore's git rules set for feature branches.
- **Optional — a public play link.** Settings → Pages → Source: *GitHub Actions*, then run the *Publish playable build* workflow by hand. Nothing is published until someone does.
- **Optional — fewer permission prompts in Claude Code.** A shared `.claude/settings.json` can pre-approve the project's own commands. It is deliberately not included: which commands an agent may run without asking is a decision for the repository's owner. A starting point, to be checked against the current Claude Code permissions documentation:

  ```json
  {
    "permissions": {
      "allow": ["Bash(npm run *)", "Bash(npm test)", "Bash(node tools/*)", "Bash(node --test)"]
    }
  }
  ```

## Earlier copies

The v1.0 hub and the v2.0 single-file build shared before this repository existed are in Froglet's internal workspace. This repository supersedes them; when they disagree, this is the current one. The same goes for the unpushed copy of this repository on Garrett's computer (see [How this repository was assembled](#how-this-repository-was-assembled)).
