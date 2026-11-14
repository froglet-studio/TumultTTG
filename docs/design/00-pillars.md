# 00 · Pillars

**Status: Settled.** These are requirements. The core rules come from the v1.0 design bundle; the ability and mission rules are Garrett's brief for the next version.

## Two goals

1. **A great TTRPG / board-game hybrid.** Fun to replay, at a table or on a screen, alone or with friends.
2. **A character workshop.** Playing should help us create and understand our pilots and their backstories. A session should leave behind people, not just a score.

When the two pull apart, prefer the design in which a mechanical choice also says something about who made it.

## The core that is kept

| Rule | Why it stays |
|---|---|
| A pool of 15 dice per character; pool + banked = 15, always | hoarding starves your next roll — the economy regulates itself |
| Roll 4 a turn, drawn from your pool; the plain die is a d20 (each element and Omni once, the rest AP), and awakened cards and some boons swap plain dice for an element's d8 or an ethereal d12 (Garrett, 2026-11-14; was 3 a turn of one d12) | random *replenishment*, so each turn asks a different question |
| A six-column track: a played card goes away for its cooldown | tempo is visible and plannable |
| Every trait is a card with two faces | one decision per card per turn: reliable or remarkable |
| **Physical** face: AP only, scales with P. **Ethereal** face: AP + etherion, unlocks a capability that exists only at E ≥ 1, scales with E | P buys numbers, E buys verbs; neither replaces the other |
| Caps: P 3, E 3; six cards to start, nine at most, three per clade | small kits, sharp identities |
| **No turn theft** | control taxes position or efficiency; everyone always gets to act |
| **No hard counters** | every state is pressured by several general verbs |
| Deterministic combat | surprise comes from timing and combination, never from a damage roll |
| Proactive defence only | no interrupts; you prepare for what you can see coming |
| Telegraphed intents | every round is a solvable puzzle |
| Content is data; rules are verbs | a special case in the engine is a design smell |
| "The DM narrates; the rules adjudicate" | the log never invents a number |

## Ability rules

1. **Useful somewhere.** Every ability earns its place at some point in the journey.
2. **Never required.** No ability may be needed to progress. A squad that lacks it has another way — slower, costlier or riskier, but real.
3. **Never a key.** No ability is a one-trick hard counter to one specific problem.
4. **Staple or tool.** Every ability is either straightforward, useful and used often — or usable creatively in many situations. Nothing sits in between waiting for its one moment.

How to hold a design to them:

- **The litmus test.** Describe the ability without naming the one thing it beats. If you cannot, it is a key. Redesign it as a general verb.
- **The three-situations test.** Name three different situations in which you would play it. A staple passes trivially; a tool must pass honestly.
- **The absence test.** For every mission, name what a squad without this ability does instead.
- **The audit.** `npm run audit` classifies every face, removes whole families of answers to look for gates, and counts what gets played. See [05](05-ability-audit.md).

Corollaries: a problem should become *easier* when the right tool is present, never *vanish*; the cheapest answer to any problem is one every character has (a basic action — see [02](02-units-verbs-actions.md)); and an ability that only matters on one kind of board must be given a second use or folded into a broader one.

## Mission rules

- **Boards differ every encounter** — in shape, not just in which squares are missing. See [04](04-boards-and-conditions.md).
- **Not every problem is a fight.** At least half of the mission types are won by something other than destroying the opposition. See [03](03-missions.md).
- **Every mission has at least two routes** to its objective, and no route depends on a single family of abilities.
- **Failure is fast, instructive and survivable.** It should teach how to win next time, and it should move the story rather than end it.

## What we avoid

Grind walls. Vitality inflation as a difficulty curve. Random hits that could not have been avoided. Hard counters. Waiting for a turn that was taken away. Rules that only the app can adjudicate — everything must be resolvable by hand at a table.
