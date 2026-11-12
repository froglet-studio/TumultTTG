---
name: ability
description: Add, rework or review a Tumult ability (a trait card face, a gear ability or an enemy ability) so that it obeys the ability rules — never required, never a key, a staple or a flexible tool — and leave the catalog, audit and tests up to date. Use when asked to add, change, rebalance or review a card, trait, ability or piece of gear.
---

# Add or change an ability

## Before writing anything

1. Read the ability rules in `docs/design/00-pillars.md` and the recipes in `docs/reference/EXTENDING.md`.
2. Look at how neighbouring abilities are written in `src/data/cards.js` (cards) or `src/data/world.js` (gear, enemies). Match their shape and alignment exactly — those tables are hand-aligned and excluded from Prettier.
3. Answer these in your reply before proposing the data. If you cannot, the design is not ready — say so and offer alternatives.
   - **Litmus:** describe it without naming the one thing it beats.
   - **Three situations:** three different situations in which a player would play it.
   - **Absence:** what a squad without it does instead, in each mission type it helps with.
   - **Staple or tool:** which is it, and why.

## Writing it

- Use existing verbs. A new verb is justified only if cards, gear and enemies could all use it; if so, add one `case` to `T.applyEffect` in `src/engine/engine.js`, a `describeState` line if it leaves a state, and a test in `test/engine.test.js`.
- Physical face: AP only, short cooldown, magnitude `base + P`. Ethereal face: AP plus at least one etherion, longer cooldown, a capability that scales with E — write it so that it does something worth the etherion at E 1 (the engine allows play at E 0 unless `T.RULES.ETHEREAL_MIN_E` is raised; see `docs/HANDOFF.md`).
- Magnitudes are functions `(P, E) => n`, and `txt` must resolve to a sentence at every P and E from 0 to 3.
- Never remove a unit's turn. Never write an effect that only matters against one named enemy or one mission.
- Conditions (`ifAnchored`, `ifOnHazard`, `ifAdjacent`, `ifE`) are only honoured by `strike`, `heal` and area `dot` today. If the design needs one elsewhere, make the engine honour it and test it — do not write text the engine will not enforce.
- If the new verb or effect answers a kind of problem the audit does not know, add it to the tables at the top of `tools/audit.js` in the same change.

## After

1. `npm run check` — the data tests fire every face and check the grammar.
2. `npm run docs` — regenerates `docs/reference/CARDS.md` and `docs/reference/ABILITY_AUDIT.md`.
3. Read the audit's summary and review list. The change must not add a narrow face, a hard-counter candidate or a collapsed gate cell. If it does, fix the design, not the audit.
4. `node tools/sim.js 40` before and after if numbers changed; put both tables in the pull request.
5. Report: what was added, how it answers the four questions above, and what the audit and simulation said.
