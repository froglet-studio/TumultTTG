# 05 · Ability audit

**Status: Partly built.** The audit tool exists (`npm run audit` → [`docs/reference/ABILITY_AUDIT.md`](../reference/ABILITY_AUDIT.md)). The player it measures with is too weak to trust on its own, and the findings below have not been acted on.

## What it measures

The four ability rules ([00](00-pillars.md)) turned into three passes over all 198 card faces:

- **A · static.** Each face's verb recipe is mapped to the recurring *problems* it answers — one tough foe, a crowd, shields, height, the unseen, the clock, hazards, a big telegraphed hit, attrition, control. A face with a universally useful effect (damage or a damage boost, movement, direct mitigation, healing, dice economy) is a **staple**. Otherwise it is a **tool** if it answers two or more problems and **narrow** if it answers one or none.
- **B · usage.** The heuristic autoplayer plays random legal squads through every mission type and tier; the audit counts which faces it plays, per mission in which they were held.
- **C · gates.** Whole families of answers (every way up, every shield-breaker, every reveal, all healing…) are removed from the card pool in turn, and every mission type is replayed. A mission type that collapses without a family is gated by it. The last row removes all cards.

The mapping tables at the top of `tools/audit.js` are the audit's opinion. They are meant to be edited as the game's vocabulary grows.

## What the first audit found (v2.0.1)

| Rule | Finding |
|---|---|
| 1 · useful somewhere | every face answers at least one problem |
| 2 · never required | no mission type collapses when any one family is removed (the boss cannot be judged: the autoplayer wins it too rarely even with every card) — **but squads with no cards win Elite about one time in a hundred and the Boss never**, because v2.0 has no basic attack |
| 3 · never a key | no narrow face settles a mission alone; **17 broader faces can** — eight reveal the whole board (one also finds the hidden objective outright), five delete a Shield outright, two make the whole squad immune to hazards, one works the Vault from the floor, one locates a foe for the whole mission |
| 4 · staple or tool | 154 staples, 30 tools, **14 narrow** — eight short-range reveals, two hazard immunities, two stationary Hidden effects, one counter, one combo-only aura |

Three things the numbers say that the rules did not ask:

- **The objective missions are too thin at tier 1.** With no cards at all, squads win Swarm 97% and Cascade 95% of the time. Walking to the objective should not be a winning plan.
- **Elites lean on control.** Removing push, pull, anchor and weaken halves the Elite win rate. Not a gate, but the closest thing to one.
- **The autoplayer cannot evaluate 67 of 198 faces**, and of the faces it can, it never chose 19 — almost all Ethereal, because it grabs the cheaper Physical face of the same card first. Passes B and C are only as good as the player.

## What to do about it

**1. Build the look-ahead player first** ([09](09-engineering.md)). Until something can play every face on its merits, usage numbers are a hint, not evidence. Target: the "cannot evaluate" list is empty.

**2. Give everyone basic actions** ([02](02-units-verbs-actions.md)). Target: the "no cards at all" row has no zero in it.

**3. Fix the narrow faces by widening the world, not by decorating the cards.**

| Narrow today | Because | Becomes broad when |
|---|---|---|
| short-range reveals | only The Sought and Lurkers have anything to find | night falls on most boards; survey points, survivors, tracks, weak walls and patrol routes are all things to find ([03](03-missions.md), [04](04-boards-and-conditions.md)) |
| hazard immunity | only Cascade and the boss have hazards | it reads "ignore the board's condition for N rounds" — wind, heavy gravity, tide, storm |
| stationary Hidden | only lane shooters care | sentries and alarm meters exist; Hidden also drops a unit from neutral actors' attention |
| a counter that only answers melee | one trigger | it answers any forced movement, including wind and the tide |
| an aura that needs Anchored foes | one enabler | it keys off any held unit — carried, rooted, braced or anchored |

Where a card still has one use after that, change the card.

**4. Soften the seventeen that can settle a problem alone.** The problem should get easier, not vanish.

- Whole-board reveals → a large radius, or the whole board for one round, or "reveal one thing of your choice anywhere".
- "Finds the hidden objective outright" → removes one false candidate, or points the direction.
- "Strip its Shield entirely" → strip a fixed amount that scales with E.
- "Interact at range, even up a ledge" → range yes; height only along a sightline.
- Squad-wide hazard immunity → one round for the squad, or several for one unit.

**5. Then make the rules a test.** When the summary reads clean, add a test that fails the build if a face is narrow, a mission type is gated, or a narrow face can settle a mission alone. From then on the rules enforce themselves.

## Limits worth remembering

- "Staple" says the *effect* is always worth having, not that the *numbers* are right. Whether a staple is actually played is a balance question for pass B with a competent player.
- The problem list describes v2.0's missions. Every new mission type or condition adds problems; add them to the tool in the same change.
- A static mapping cannot see combinations. A face that looks narrow may be the hinge of a three-card line. The audit produces a review list for people, not a verdict.
- Pass A reads recipes — intent. Where the engine does not honour a recipe option (see the known issues in [`HANDOFF.md`](../HANDOFF.md)), the audit overstates: two of the nine "Height" answers cannot reach a ledge today.
- Pass C's rows are independent samples of random squads on the same boards. Differences under about fifteen points are noise; one row beating the baseline is not a finding.
- Only trait cards are audited. Gear and enemy abilities should be.
