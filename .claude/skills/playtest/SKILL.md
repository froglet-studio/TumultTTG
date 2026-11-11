---
name: playtest
description: Simulate Tumult and report what the numbers say — balance tables, narrated missions, the ability audit, a run driven through the real interface. Use when asked how a change plays, whether something is balanced, to compare before and after, or for a playtest report.
---

# Simulated playtest

## Run

```
npm run check                          # build + tests; stop and report if this fails
node tools/sim.js 40                   # balance tables: missions, full runs, card smoke test
npm run audit                          # ability rules → docs/reference/ABILITY_AUDIT.md
node tools/mission-log.js <archetype> <tier> <seed>    # one narrated mission, to see why a number is what it is
node tools/ui-drive.js 3 --manual      # a whole run clicked through the real interface
```

Archetypes: `swarm`, `vault`, `hidden`, `cascade`, `elite`, `boss` (boss is tier 3 only).

To compare a change, run the simulation on the base commit first (`git stash` or a second worktree) and keep both outputs.

## Read the numbers against the targets

- Win rate by tier: tier 1 welcoming (about 90–100%), tier 2 about 75–90%, tier 3 about 50–75%, boss about even for a decent squad.
- Mission length: 8 to 14 rounds is the target band. Shorter means engines never come online.
- No single hit above a third of a hero's vitality.
- Zero crashes, zero engine errors in logs, and every card face fires.
- Audit: no new narrow faces, no hard-counter candidates, no collapsed gate cells.

## Caveats to state in the report

- The autoplayer is a weak, literal player. It has no rule for about a third of the card faces and prefers Physical faces. Its win rates are a floor, and a face it never plays is a question, not a verdict.
- Forty missions per cell is only good to about ±10–15 points. Do not report a five-point move as a finding; raise the count instead (`node tools/sim.js 200 missions`).
- Simulation says nothing about whether the game is fun or readable. Say what a person should try by hand.

## Report

Lead with what changed and whether it is inside the targets. Then the table rows that moved, one narrated example that explains the biggest move, anything the audit flagged, and what you could not determine. Keep it to what the reader needs in order to decide.
