# 08 · Tabletop edition

**Status: Proposed.** The rules were designed for a table (v1.0) and are currently only playable on a screen (v2.0). This is the plan for bringing the two back together.

## Principle

One source of truth. Cards, enemies, missions and boards are data in `src/data/`; the browser game renders them one way and a print generator renders them another. Nothing is typed twice, and a rules change reprints the game.

It follows that every rule must be resolvable by hand. "The engine works it out" is not a rule. If a mechanic needs bookkeeping a table would not tolerate, simplify the mechanic.

## Components

| Component | Notes |
|---|---|
| **Dice** | fifteen per pilot, in a bag: plain d20s, plus one d8 of its element for each awakened card and Affinity boon, and an ethereal d12 for Omni Core (2.29). Draw 4 from the bag each turn; spent dice go back in. Custom faces are ideal; ordinary dice with a reference strip work today. d20: 1 Mass · 2 Charge · 3 Space · 4 Time · 5 Omni · 6–20 AP. Element d8: 1–4 its element · 5–8 the other three and Omni |
| **Pilot board** | pool area, bank area, the six-column track, vitality dial, slots for states, Debt and scars |
| **Trait cards** | tarot-sized, Physical face on the top half and Ethereal on the bottom; P and E tracked with clips or a dry-wipe pip row. The text printed is the resolved text for each level |
| **The atlas** | a book, one place to a spread (Garrett, 2026-11-13): the board on the left page, and facing it the rules of this place (what its special spaces and paths do) and field notes (ecology, life there, who comes from such places). Places are kinds, not named spots, so one page stands for a different place each session. A run is a journey from page to page. The game's Atlas screen is this book on a screen (`docs/reference/ATLAS.md`) |
| **Condition cards** | one per condition, with its timetable printed as a track |
| **Opposition cards** | one per actor, with its policy as a three-line flowchart; an intent marker placed at round start is the telegraph |
| **Mission cards** | objective, routes, clock, graded outcomes and what each grade opens |
| **Tokens** | units, props, hazards, states |
| **Season sheet and dossiers** | the route, standing with each domain, and one dossier per pilot to fill in ([06](06-pilots-and-backstory.md)) |

## Who runs the opposition

Opposition follows short, deterministic policies, so three modes are possible from the same components:

- **No game master.** Players resolve each actor's flowchart. This is the default and must always work.
- **A game master** plays the opposition and narrates, within the same policies — "the DM narrates; the rules adjudicate".
- **The app as referee.** The browser game runs opposition, conditions and the clock on a shared screen while players use physical dice and cards.

## The generator

`tools/print.js` (to be written) reads the same data as the game and emits print-ready HTML sheets — cards nine to a page with cut marks, boards, reference sheets, the rules summary — which any browser prints to PDF. No layout program in the loop. It reuses the SVG art from [07](07-art-and-ux.md).

## Questions the first printed prototype has to answer

1. Is fifteen d12 per player too many to handle? If so: a shared dice tray and a personal bank, or a smaller pool with the same ratios. The pool invariant matters more than the number.
2. How long does a round take with three pilots and no computer? The target is under five minutes.
3. Which effects are too fiddly by hand? (Chains, durations that tick at different moments, anything "until your next turn".) Each one found is a rules bug, not a tabletop bug.
4. Does generated-board setup take too long compared with a printed board per shape?

## Order of work

1. A rules summary generated from data, and a printable card sheet for the current 99 traits.
2. Pilot boards and the dice reference.
3. Opposition and mission cards with flowcharts.
4. Boards and conditions, once [04](04-boards-and-conditions.md) exists.
5. A complete print-and-play PDF for a one-leg season.

Done when: four people who have never seen the browser game can set up and play a mission from the printed pack alone.
