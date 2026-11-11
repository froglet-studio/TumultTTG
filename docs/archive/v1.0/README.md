# Tumult — Design Bundle (v1.0)

> A tabletop RPG system designed to feed the NPC cast and emergent storytelling of **Cosmic Shore**'s HyperSea, with a small mechanic core that composes into rich, replayable scenarios.

This bundle contains everything needed to understand the design, run the engine, inspect example matches in your browser, and pick up development where it left off. **You can hand this folder to anyone.** No external dependencies beyond Python 3 (for the engine) and a modern browser (for the interactive artifacts).

---

## What this is, in one paragraph

A turn-based RPG where every character is a **3-species composite** (Human is always one) drafting from a small set of trait cards, each carrying **two abilities** (a cheap P-scaling face and a spicy E-scaling face) governed by a **6-column track** that slides cards from duration → cooldown → hand. Resources come from a **15-die spent pool** rolled 3 dice at a time, sorting into AP and the four etherions (Mass, Charge, Space, Time). The system is built on a small set of **orthogonal verbs and states** with **no hard counters** — every defense is pressured by many ordinary attacks. Balance is measured by **contribution to cooperative mission objectives**, not 1v1 duel symmetry; the duel is retained only as a control.

---

## Read me in this order

1. **`docs/01_consolidated_core.md`** — *Start here.* The canonical ruleset. Every mechanic defined once, every ability written with explicit P/E formulas, the two sample characters with upgrade points spent. **This is the authoritative reference; if anything conflicts elsewhere, this wins.**
2. **`docs/02_mechanic_basis.md`** — *Design philosophy.* The "orthogonal verbs and states, no hard counters" framework. Read this to understand *why* the rules are shaped this way and how to add content without breaking the system.
3. **`docs/03_replayability_principles.md`** — *Empirical findings.* What we learned from running thousands of simulated games about which design choices produce **divergence** (each game a new puzzle) vs. **delay** (the same line, postponed). The litmus tests at the bottom guide all new-content design.

The other docs are supporting evidence and history:
- **`docs/04_battle_series_study.md`** — The balance study that exposed the "game length is the master dial" finding and quantified the brawler-vs-zoner matchup.
- **`docs/05_costed_slice_duel.md`** — An earlier worked example: three species fully costed with the older ability format, run through a manually-narrated duel. Useful for seeing the design's evolution.
- **`docs/06_species_traits_catalog.md`** — The full 99-card species catalog (10 species × 9 traits, plus Human). Note: written under the older "scales with P/E" hand-waving — **the rules format here is superseded by doc 01**, but the species concepts and flavor are intact and worth mining for further development.

---

## Run the engine

```bash
cd engine/
python3 tumult_engine.py duel      # one duel with verbose turn-by-turn output
python3 tumult_engine.py stats     # 1000-duel batch with balance + length statistics
```

`tumult_engine.py` is a **single self-contained file** (~600 lines, no dependencies) implementing the canonical v1.0 rules. It is the place to extend the system:

- Add a card → add an entry to the `ABILITIES` table at the top, define two ability functions, and register them in `RESOLVERS`.
- Add a character → add an entry mirroring `CAVITT` / `MARISH` (cards + upgrade points).
- Add a scenario → add a board to the `make_*_board()` factories and an objective resolver.
- Swap in a smarter AI → replace `cavitt_policy` / `marish_policy` (the rules layer is untouched).

The engine has **assertions** for the 15-die invariant and the no-turn-theft rule. If you break a core invariant during extension, the tests will scream.

---

## Open the interactive artifacts in your browser

Each is a **single self-contained HTML file** with all data and styles inlined. Open them by double-clicking; they run offline.

1. **`interactive/01_mission_drowning_vault.html`** — **The flagship artifact.** A playable cooperative mission with both heroes running their real kits against an AI/DM advancing a clock and a swarm. Scrub one decision at a time; hover any card, die, track pill, or state for live rules and current values. Watch a last-second 8-turn win with the clock at 1.
2. **`interactive/02_duel_state_inspector.html`** — Full state-change inspector for a 1v1 duel (78 frames, every decision). All hover-tooltips, movement trails, the two-ability rules library shared across hand/track/log. The technical proof that "nothing in the dark" is achievable.
3. **`interactive/03_duel_match_inspector_v1.html`** — Earlier version of the duel inspector (turn-level rather than decision-level). Useful for comparing the iteration step.
4. **`interactive/04_two_fights_broadcast.html`** — Two dramatic same-setup duels side by side, demonstrating how dice variance alone reshapes a fight. The original "make it watchable" deliverable.

**Reading order I recommend:** open artifact 4 first for the elevator pitch (15 seconds — *same setup, two stories*), then artifact 1 for the depth (the cooperative mission with full state visible). Artifacts 2 and 3 are diagnostic tools.

---

## What's done

- ✅ A canonical ruleset (v1.0) with every mechanic defined once and every ability quantitatively specified.
- ✅ A non-degenerate P/E scaling grammar where E unlocks capabilities P can never substitute for. Mathematically verified.
- ✅ A 15-die resource economy with a 3-die roll, a hard pool cap, a banking mechanic, and an anti-brick valve.
- ✅ A 6-column track economy where cards go duration → cooldown → hand, with distinct per-ability cooldowns.
- ✅ Two complementary sample characters with upgrade points spent, demonstrating the P-striker vs. E-controller archetypes.
- ✅ A graph-based board model that supports duels and missions (height nodes, LOS rows, spawn points, objectives).
- ✅ A working reference engine running the canonical rules.
- ✅ A cooperative mission engine with clock, swarm, and objective, scoring an 84% win rate (real tension, real failure cases).
- ✅ Interactive inspectors with per-decision scrubbing, hover-inspect on every element, movement trails, and live-value tooltips.
- ✅ A design philosophy document explaining how to add content without introducing hard counters.

## What's known and not yet done

- ⚠️ **Duel balance: ~90% Cavitt.** This is correctly understood — Cavitt is the single-target specialist who *should* lose to swarms (and does, in mission play). The duel is a control, not the target. If you want it closer to 50/50, the lever is **taxing the brawler's approach** (raise Ambush Leap's etherion cost or add a "sticky" disengage penalty). See `docs/04_battle_series_study.md` for the experiments isolating which dials matter.
- ⚠️ **Hero policies are heuristic.** They play competently but not optimally. The win rate reflects *these* tactics. A stronger AI (MCTS or trained policy) would change absolute numbers but should not change the *relative* finding that Marish dominates swarms and Cavitt dominates single targets.
- ⚠️ **The species catalog (doc 06) uses the old format.** All 99 cards there were written under the "scales with P/E" hand-waving before the v1.0 grammar was locked. The concepts are good; the ability text needs a rewrite pass using the v1.0 formula style (which `docs/01_consolidated_core.md` Part III demonstrates for a subset of cards).
- ⚠️ **One hand-authored mission.** "The Drowning Vault" proves the framework works. A real game wants a **scenario generator** spinning up varied maps from the four challenge archetypes (swarm, height/locked, hidden/sought, timed cascade).
- ⚠️ **No tech/omnicrystal economy implemented in the engine** beyond the Grapnel and Scope stubs. The split (etherions = random weather, omnicrystals = managed supply) is designed and documented; the inventory/economy layer is not built.
- ⚠️ **No upgrade-point earning system.** Characters start with 6 UP spent, but the rules for *gaining* UP through mission play are undefined.

## Where to take it next

The natural next development steps, ranked by likely value:

1. **A scenario generator** that emits varied missions from the four archetypes. This is the gateway to AI-DM-narrated play and where the storytelling thesis lives.
2. **Rewrite the species catalog (doc 06)** in the v1.0 formula format. Each card needs its two abilities with explicit P/E formulas and distinct CDs. The litmus test from doc 03: *can you describe each new card without naming an enemy ability or build?*
3. **The tech/omnicrystal layer.** Inventory, gear acquisition, the conversion membrane between random etherions and managed omnicrystals.
4. **The approach-tax balance pass.** Get duel win rates into the 55/45 band without breaking the mission complementarity — primarily a tuning exercise on Ambush Leap's cost.
5. **A stronger policy.** MCTS or a trained policy would let you measure design changes against optimized play, not just heuristic play, which would tighten every other finding.

---

## File map

```
bundle/
├── README.md                                  ← you are here
├── docs/
│   ├── 01_consolidated_core.md                ← AUTHORITATIVE RULES
│   ├── 02_mechanic_basis.md                   ← design philosophy
│   ├── 03_replayability_principles.md         ← empirical findings
│   ├── 04_battle_series_study.md              ← balance study
│   ├── 05_costed_slice_duel.md                ← earlier worked example
│   └── 06_species_traits_catalog.md           ← 99-card catalog (old format)
├── engine/
│   └── tumult_engine.py                       ← runnable reference engine
└── interactive/
    ├── 01_mission_drowning_vault.html         ← FLAGSHIP — playable mission
    ├── 02_duel_state_inspector.html           ← full-state duel scrubber
    ├── 03_duel_match_inspector_v1.html        ← earlier inspector
    └── 04_two_fights_broadcast.html           ← variance demonstration
```

---

## A note on tone

This bundle is the artifact of a long design conversation. The docs occasionally reference findings and tunings in the order they were discovered, which means some earlier docs describe systems that were later revised. **`docs/01_consolidated_core.md` is the final, authoritative spec.** Everything else is supporting material — useful for understanding *how* and *why*, but not for deciding *what the rules currently are.* When in doubt, doc 01 wins.

The whole project is built around one principle: **a small core that combines into an enormous space.** Ten verbs, eight states, four etherion surfaces, two abilities per card, three growth axes — and from that, a system that can tell different stories every time. If you find yourself adding a special-case rule, treat that as a smell and look for the general verb that would have made it unnecessary. The litmus test in doc 03 is the best filter for new content.
