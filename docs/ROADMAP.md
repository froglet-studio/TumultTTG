# Roadmap

From v2.0 (a playable roguelike run) to the game in the brief: polished, illustrated, with abilities that are each a staple or a flexible tool, boards that differ every encounter, problems that are not all fights, and pilots who come out of it with a history.

Milestones are grouped into four tracks so that several people can work at once. Each has a **done when** that can be checked. Design detail is in `docs/design/`; everything there except the pillars is a proposal — settle the open questions with Garrett before building on them.

```
Foundations   F1 ──► F2 ──► F3
                │      │
Systems   S0 ✓  └► S1 ─┴► S2 ──► S3 ──► S4      (S0 is done)
                    │
Characters          └► C1 ──► C2 ──► C3
Presentation   P1 ──► P2 ──► P3 ──► P4          (P1 can start today)
```

## Foundations

### F1 · Cloneable state and separate random streams
Make mission state plain data; give board generation, dice and opposition their own seeded streams. ([09](design/09-engineering.md) §1, §3)

**Done when:** `clone(mission)` followed by identical actions yields identical logs for 1,000 random missions; the same seed gives the same board whatever squad plays it; a mission can be saved and resumed mid-round.

### F2 · The look-ahead player
A generic player that lists legal actions, simulates the rest of the round on a copy, and scores outcomes. Keep the heuristic as the weak player. ([09](design/09-engineering.md) §2)

**Done when:** the audit's "cannot evaluate" list is empty; the look-ahead player beats the heuristic on every mission type; the simulator reports both, and the gap between them.

### F3 · The rules as tests
Once the audit reads clean (after S1 and S2), fail the build when a face is narrow, a mission type is gated, or a narrow face can settle a mission alone. ([05](design/05-ability-audit.md))

**Done when:** those three conditions are tests, and they pass.

## Systems

### S0 · Make the engine do what the text says — done (v2.0.2)
A review at handoff found places where card, boon or mission text promises something the engine does not do — conditions that are ignored, forms that cannot climb, an Anchor that does not hold a blink. They are listed in [`HANDOFF.md`](HANDOFF.md) under known issues. Fix each one test-first, and settle with Garrett whether Ethereal faces may be played at E 0. Small, independent, and a good way into the codebase.

**Done when:** every item on that list has a test and is either fixed or its text changed; before/after balance tables are in each pull request; the list in the handoff is empty.

**Outcome:** seven of the eight fixed, each with a test, plus as many again that the same tests turned up (`CHANGELOG.md`). The eighth — Ethereal faces at E 0 — is a switch in `T.RULES` with a test for both settings and the numbers for each, waiting on Garrett ([`HANDOFF.md`](HANDOFF.md), decision 4).

### S1 · Units, target classes and basic actions
One unit model for pilots, actors and props; verbs target by class (harm, affect, help), not by side; Move, Interact, Rally, Strike, Brace, Carry and Shove for everyone; Channel; Overcast and Debt. ([02](design/02-units-verbs-actions.md))

**Done when:** every existing test still passes; squads with no cards can finish every mission type at tier 1 at least a third of the time with the look-ahead player; no etherion die is ever unspendable; pool + banked + locked = 15 is a tested invariant.

### S2 · Fix the review list
Work through the audit: the 14 narrow faces gain a second use or a broader verb; the 17 faces that can settle a problem alone are softened so the problem eases rather than vanishes; tier-1 objective missions stop being winnable by walking. ([05](design/05-ability-audit.md))

**Done when:** the audit summary shows no narrow faces and no hard-counter candidates; every face is played at a non-trivial rate by the look-ahead player in at least two mission types; a card-less squad wins a tier-1 objective mission well under half the time.

### S3 · Objectives, outcomes and new mission types
The objective grammar, graded outcomes, and the twelve mission types — at least six with no kill condition — in the build order given. ([03](design/03-missions.md))

**Done when:** twelve types generate and play; each names two routes in its briefing; every type passes the gate check; a neutral actor and a rival each appear in at least two types.

### S4 · Board shapes and conditions
Eight board generators, sightlines in place of lanes, terrain as props, and the conditions (gravity band, wind, the short day, tide, storm front, unstable ground). ([04](design/04-boards-and-conditions.md))

**Done when:** the generator tests in the design pass; shape metrics differ measurably between generators; 1,000 simulated seasons never repeat a mission signature and never use the same shape or condition twice running.

## Characters

### C1 · The frame: a season as guides on Tumult
Rename hero → pilot and species → clade in one change. Squads of three (two still supported). Patrons and domain standing, beacons, rescue by domain, leads. Four legs and their crossings. ([01](design/01-frame-and-campaign.md), [LORE](LORE.md))

Needs Garrett's answers to the open questions in the design first.

**Done when:** a season can be played start to finish under the new frame; losing a mission never ends a season before the final crossing; balance tables exist for squads of two and three; no v2.0 placeholder terms remain in player-facing text.

### C2 · The season log and the dossier
Structured events for every decision; personality tags from behaviour; the creation hook; the dossier screen; export to Markdown and JSON. ([06](design/06-pilots-and-backstory.md))

**Done when:** two people who play the same squad differently get recognisably different dossiers; a writer given only the export can say who the pilot is.

### C3 · Defining moments, agendas and bonds
Player-marked moments with permanent card changes; private season goals; bonds and rivalries between squadmates. ([06](design/06-pilots-and-backstory.md))

**Done when:** each pilot ends a season with at least one defining moment; agendas change what players choose in observed playtests; bonds unlock something a player would miss.

## Presentation

### P1 · Layout, hand and forecast
The board-centred layout, roster rail, hand as cards, intents in resolution order, and the end-of-turn forecast. Can start immediately on the v2.0 rules. ([07](design/07-art-and-ux.md))

**Done when:** nobody has to add up incoming damage by hand; the interface tests still drive a full run.

### P2 · Previews, undo and the guided first mission
**Done when:** every action shows its result before it is paid for; anything not involving new information or dice can be undone; a new player finishes the first mission without opening help.

### P3 · Art
Tokens, emblems and card frames first; then procedural pilot portraits and leg backdrops; then the drop-in asset pipeline. All original.

**Done when:** no emoji stand in for art; a portrait identifies its two clades at token size; replacing one asset needs no code change.

### P4 · Tabletop edition
The print generator, pilot boards, opposition flowcharts, and a one-leg print-and-play pack. ([08](design/08-tabletop-edition.md))

**Done when:** four people who have never seen the browser game set up and play a mission from the printed pack alone.

## Throughout

- **Balance** after every systems milestone: `node tools/sim.js 40` before and after, numbers in the pull request. Targets from v1.0 still stand — missions of 8 to 14 rounds, no single hit above a third of a pilot's vitality, tier 1 welcoming and tier 3 tense.
- **Accessibility and motion** settings arrive with the features they govern, not at the end.
- **Docs**: when a proposal is built, move its description to `docs/reference/` and update its status.
- **Modules** ([09](design/09-engineering.md) §6): move from the global namespace to ES modules once, between milestones — after F2 is a good moment.

## A sensible first month

1. ~~S0 — quick, concrete, and it makes the game honest.~~ Done.
2. F1, then F2 — everything else is measured with them.
3. P1 in parallel — it improves the game people are already playing.
4. Garrett's answers on the frame, so C1 can be designed against real decisions.
5. S1 — the change that makes the ability rules reachable.
