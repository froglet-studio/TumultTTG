# Tumult v2.0 — the game as it stands

> This describes what is implemented today. Where the game is headed is in `docs/ROADMAP.md` and `docs/design/`.
>
> **v2.0 turns the v1.0 proof-of-concept into a playable, replayable game**: a roguelike *tide-run* where you draft two heroes from eleven bloodlines, ride a branching Tide Map through a Consolidation's territory, and topple its Heart. The v1.0 core is kept whole — 15-die economy, 6-column track, the P/E scaling grammar, no turn theft, no hard counters — and the fun layers are built on top.

## Play it

`npm install`, then `npm run dev` (http://localhost:5173) or `npm run build` (→ `dist/TUMULT.html`, one self-contained file that works offline). Runs save automatically between nodes, in the browser's local storage.

**The playtest build** — `npm run build:playtest` (→ `dist/TUMULT.playtest.html`) or `http://localhost:5173/?playtest` — is the same game with a panel on the title screen for whoever is testing it:

- **Jump into a mission.** Any of the six archetypes at any tier (the Heart is always tier 3), two of the pre-made heroes, their starting six cards or the kit a squad would carry by that tier, and a seed. The same choices always give the same board and the same opening dice, and `node tools/mission-log.js <archetype> <tier> <seed> <heroA> <heroB> <start|tier>` prints that same mission, because both start from `T.quickMission`. When the mission ends, the Tide carries on from that node.
- **Rule under test.** Switches `T.RULES.ETHEREAL_MIN_E` between 0 and 1 (decision 4 in `docs/HANDOFF.md`). It takes effect at once, mid-mission too, and stays set on that device.
- **What to look at in this build.** A short list, rewritten every release; a test fails if its version is not the package's.
- **Report.** On the title screen and in a mission's top bar: the mission in progress (seed, squad, foes, the last lines of the log, the command that rebuilds its board) and every mission finished on that device, with how many Physical and Ethereal faces were played and how many of those at E 0. It is kept in the browser's local storage (`tumult_v2_playtest`) and goes nowhere unless someone copies it.

The ordinary build carries none of this. No screen scrolls sideways at a phone's width, but the mission screen is still built for a mouse: a card face's numbers are in its hover tooltip (roadmap P1).

## The pitch, one paragraph

Every round both heroes act freely and interleaved. Each hero's track slides, engines fire, and they roll 3 dice into their bank. **Enemies have already told you what they will do** — intents are drawn on the board as arrows — so each round is a solvable puzzle: step out of a lane and the shot has no line; move two nodes and the slow brute spends its turn walking; Hide and ranged attacks strike afterimages; Anchor a Brute and it cannot close the distance. Cards have two faces: a cheap Physical face that scales with **P**, and an Ethereal face that costs an etherion and does what physical cannot — teleport, chain, area, control, engines — scaling with **E**. Between missions you earn Upgrade Points and omnicrystals, claim new traits (3-of-9 per bloodline), buy gear that patches your verb gaps, and pick up boons. At the top of the map, the Heart.

## What's new vs v1.0 (the fun layers)

1. **You play it.** The demos were inspectors; this is a game with agency, stakes, and a 30–60 minute run arc.
2. **The draft.** Hero creation is a real pack draft — pick 1 of 4, six times, across your three bloodline pools — or Quick Build one of six pre-made heroes.
3. **The Tide Map.** Seven rows, three acts (*The Shallows, The Undertow, The Deep*), branching paths with missions, elites, havens, events and the boss.
4. **Generated missions from the four challenge archetypes** — Swarm (hold the beacon), Vault (height + the winch lever), The Sought (hidden caches, lurkers), Cascade (spreading flood, the valve) — plus Elite and a two-phase Boss. *v1.0 roadmap item #1 (scenario generator): done in first form.*
5. **Telegraphed enemy intents** with minimal adaptation (they close distance if you leave range). Into-the-Breach legibility on top of the v1.0 "no reactive defense" rule.
6. **Progression & economy.** UP earning, 3-of-9 trait growth with card rewards, omnicrystals as both currency and gear fuel, 10 gear items, 15 boons (including etherion **Affinities** that re-face a die), consumables, havens, a Lifeline.
7. **All 99 cards rewritten in the v1.0 two-face formula format and implemented** as data-driven verb recipes. *v1.0 roadmap item #2: done.*
8. **A bestiary of 12 enemy types** built from the same verbs, with per-role AI policies.
9. **Balance pass** in the v1.0 spirit: lethality budget, approach taxed (teleports are Ethereal faces: an etherion and a cooldown of 2–4), missions tuned toward the 8–14 round band, hundreds of simulated missions and full runs.
10. **Hero vitality 26** (the engine's value), downed-not-dead with Rally, one Lifeline per run.

## Design pillars (unchanged from v1.0, now load-bearing)

- **Small core, enormous space.** A fixed vocabulary of verbs and states, four etherion surfaces, two faces per card. Depth comes from combination; a special-case rule is a smell.
- **No hard counters.** Every state is pressured by several general verbs. Gear grants verbs, never "anti-X".
- **No turn theft.** Control taxes efficiency or position (Anchored still acts; Weakened hits softer; Slow can't move). The player always acts.
- **Predictable outcomes; surprise from timing and combination.** Deterministic combat, random replenishment, visible intents.
- **Balance by contribution, not symmetry.** A kit should be the best answer to some archetype and a weak one to another. Strikers crack Wardens and the Heart; controllers own swarms and clocks.

## Lore frame (light touch — for the lore team to refine)

The run is the fall of a **quasi-stable Consolidation**. The **Terminal** is the quest-giver that will not intervene ("helps those who help themselves" — and logs the transaction). Etherion storms grant Affinities; the galactic superorganism's reef blooms offer traits; privateers levy tolls the Terminal tolerates as redistribution; an audit halves hoarded crystals. All event text lives in `src/data/world.js` under `T.EVENTS`. The frame is due to change — see `docs/design/01-frame-and-campaign.md`.

## Keyboard / UI notes

Tab switches the selected hero; E ends the round; Esc cancels targeting. Hover any card face, die, state chip or token for exact numbers at the hero's current P/E. The hint bar above the board always says how much AP the selected hero has and how many foes are targeting them.
