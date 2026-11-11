# Tumult — working notes for Claude Code

Tumult is a tabletop RPG crossed with a board game, playable in a browser. It has two jobs, and both matter in every decision:

1. **Be a good game** — fun to replay, at a table or on a screen.
2. **Be a character workshop** — playing it should help Froglet create and understand its pilots and their backstories.

New here? Read `docs/HANDOFF.md` (state of the project), then `docs/ROADMAP.md` (what to build next). `docs/design/` holds the design: `00-pillars.md` is settled; everything else there is a proposal until Garrett says otherwise.

## Commands

```
npm install            once
npm run dev            dev server at http://localhost:5173 (rebuilds on refresh)
npm run build          → dist/TUMULT.html (single self-contained file) + syntax check
npm test               all tests (~15 s; includes two full runs through the real UI in jsdom)
npm run check          build + test — run before calling any change done
npm run format         Prettier (src/data/ is deliberately excluded)
npm run docs           regenerate docs/reference/CARDS.md and ABILITY_AUDIT.md

node tools/sim.js 40                 balance tables (or `40 missions`, `80 runs`, `10 cards`)
node tools/mission-log.js vault 2 7  one narrated mission: archetype, tier, seed [heroA heroB]
node tools/ui-drive.js 3 --manual    drive a whole run through the UI by clicking (seed 3)
```

Tools that take arguments are called with `node` directly, because PowerShell can swallow the `--` that `npm run x -- args` needs.

## Map

```
src/manifest.json         load order — a new source file must be listed here
src/data/cards.js         99 trait cards as data (two faces each, verb recipes)
src/data/world.js         rules constants, gear, boons, bestiary, mission generators, map, events
src/engine/engine.js      dice, track, damage, verbs (T.applyEffect), movement, objectives, rounds
src/engine/ai.js          enemy intents + execution; heuristic hero autoplayer (simulation only)
src/engine/run.js         draft, upgrades, map, rewards, havens, events, save/load
src/ui/                   screens, SVG board, input (browser only)
tools/                    build, dev server, harness, simulators, doc generators, UI driver
test/                     node --test suites
docs/reference/           how v2.0 works today (CARDS.md and ABILITY_AUDIT.md are generated)
docs/design/              where it is going (pillars = settled, the rest = proposals)
docs/archive/v1.0/        the original design bundle — frozen, never edit
```

## How the code is put together

- **No framework, no bundler, no runtime dependencies.** Plain scripts that all attach to one global namespace `T` (`window.T` in the browser, `global.T` in Node). The build concatenates them in manifest order into one HTML file. `tools/load.js` loads the same files in Node.
- **Content is data, rules are verbs.** A card face is `{ n, ap, el, cd, dur, tgt, fx:[{ v:'strike', … }], txt }`. Magnitudes are functions `(P, E) => n`. The engine interprets verbs in `T.applyEffect`. Adding content should rarely need engine code; a new verb must be general enough for cards, gear and enemies alike. Recipes: `docs/reference/EXTENDING.md`.
- **The engine never touches the DOM** and is deterministic for a given seed (`T.makeRng`). Keep it that way — the simulators, the audit and the tests depend on it. Never call `Math.random()` in `src/engine` or `src/data`.
- **UI** lives under `T.UI`: string-template rendering, one delegated click handler keyed on `data-act` / `data-arg`. Saves use `localStorage` keys `tumult_v2_run`, `tumult_v2_meta`, `tumult_v2_tut`.
- The code still says `hero` and `species`; the design docs say *pilot* and *clade*. Do not rename piecemeal — it happens once, in roadmap milestone C1.

## Rules of the game that must not break

Kept from v1.0 on purpose. Most are enforced in `test/engine.test.js` and `test/data.test.js`.

- 15-die pool per hero: pool + banked = 15, always. Roll 3 per turn. Minted dice are temporary and never count.
- d12 faces: Mass, Charge, Space, Time, Omni, AP2, and six AP. Omni pays for any etherion.
- Six-column track: playing either face sends the whole card away for that face's cooldown (after its duration).
- Two faces per card. **Physical** costs AP only and scales with P. **Ethereal** costs AP + at least one etherion and unlocks a capability that scales with E. (The design says that capability exists only at E ≥ 1; v2.0 does not enforce it — see the known issues in `docs/HANDOFF.md` before relying on either behaviour.) Caps: P 3, E 3. Kits: 6 cards to start, 9 at most, never more than 3 from one bloodline.
- **No turn theft.** Control taxes position or efficiency; a controlled unit still acts.
- **No hard counters.** Every state is pressured by several general verbs.
- Deterministic combat, random replenishment. Defence is proactive (no reactions or interrupts). Enemies telegraph their intent before the player acts.

## Ability rules (Garrett's brief — treat as requirements)

1. Every ability is useful somewhere in the journey.
2. No mission may require a particular ability; lacking one must never block progress.
3. No ability may be a one-trick hard counter to one specific problem.
4. Every ability is either a **staple** (straightforward, useful, used often) or a **tool** (usable creatively in many situations).

And for missions: **every encounter's board is different**, and **not every problem is a fight**.

Litmus test for any new card, gear, enemy or mission: *can you describe it without naming the one thing it beats or the one thing that beats it?* If not, redesign it as a general verb. `npm run audit` measures these rules for the trait cards (gear and enemy abilities are not audited yet); a change to abilities or missions is not done until the audit has been regenerated and read.

## Working agreements

- Before finishing: `npm run check`, `npm run format`, and `npm run docs` if cards, enemies or missions changed. Commit the regenerated docs with the change.
- A rules change needs a test. A balance change needs before/after numbers from `node tools/sim.js 40` in the commit or PR description.
- Small, reviewable commits on a branch; open a PR; CI runs format check, build and tests.
- The build stays one self-contained HTML file that makes no network requests.
- Write for the table as well as the screen: anything the engine does should be explainable in a sentence a player could resolve by hand.
- Design docs are part of the product. When an implementation settles a proposal, update the proposal's status line and move the settled description into `docs/reference/`.
- If two readings of a design are plausible, or a change would touch the pillars, **ask Garrett rather than guessing.**

## This repository is public

- No internal material: no links to or text pasted from Froglet's internal notes, no unreleased story beats or named canon characters, no business or schedule details, no personal data. Summarise only what the game needs — `docs/LORE.md` is the working subset.
- Terminology: **Ark**, never "Caddis". **Domains** (Jade, Ruby, Gold) are not factions. In the setting a **squad** is three pilots (the game fields two heroes today; three is proposed). People are human plus two **clades**.
- All art must be original or explicitly licensed for this repo; no generated likenesses of real people, no third-party characters or logos.
