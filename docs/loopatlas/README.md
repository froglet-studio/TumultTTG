# The Tumult Loop Atlas

The Loop Atlas is Tumult's model of its loops: every loop from one verb resolving (Pulse) to what changes over months
(Era), nested by timescale, with what the game does today (Now), what is decided (Planned), what is proposed, the holes
nobody has decided, and the doc each loop came from. It is also a **development tool**: anyone can raise an idea or ask
for a move on the map, Garrett decides, and a decision becomes a build order a session builds (`PROCESS.md`). Beneath
the loops sits the **Code Atlas**: zoom from any loop into the code, data and docs that implement it, down to every
value (`CODE.md`).

The map is the claude.ai artifact https://claude.ai/artifact/BJc3vHJ8PUtjFwcLmbmM2T. **The YAML files here are its
source of truth.** It is built on Cosmic Shore's Loop Atlas (`Docs/LoopAtlas` in froglet-studio/cosmic-shore): the same
schema, tool, page and process, with Tumult's words (pilots for vessels, the eight tiers named for Tumult's timescales).

## Files

| Path | Holds |
| --- | --- |
| `model/meta.yaml` | Schema version, last update, the pilots' order, the default pilot, the link to the map. |
| `model/vocabulary.yaml` | The ladder of words every loop uses: layers, the eight tiers (Pulse, Verb, Combo, Round, Mission, Expedition, Arc, Era), the drivers and handoffs. |
| `model/loops/NN-*.yaml` | The loops, one file per place or group, read in file-name order. |
| `model/edges.yaml` | Links between loops that are not parent and child: `train`, `cross`, `feed`. |
| `model/kit.yaml` | What every pilot's kit shares: roles per mission kind, the pulse, verb archetypes, which drivers each element serves. |
| `model/proposals.yaml` | Proposals P1 to P8 and the loops each touches, with their stage. |
| `model/items.yaml` | Product work beyond the loops (Game, Interface, Tooling), moving through the layers like loops. |
| `model/fleet/<Pilot>.yaml` | One pre-made pilot: an Ethereal face per element, its combos, its cards and best missions. |
| `schema.json` | JSON Schema for the assembled model. |
| `model.json` | The assembled model, **generated**; never edit it by hand. `tools/code-atlas.js` reads it. |
| `page/atlas.template.html` | The published page with the model taken out. The map's runtime lives here. |
| `PROCESS.md` | **How work moves**: propose, plan, develop, start, done, drop; the map's Board; the steward run. |
| `ledger.jsonl` | One line per lifecycle step (who moved what, when). Appended by the tool. |
| `BOARD.md` | The atlas as a work board, **generated**: build orders, decided plans, proposals, holes, recent moves. |
| `CODE.md` | **The Code Atlas**: what it extracts from Tumult and how the map shows it. |
| `code/links.json` | Hand links from loops to the code that implements them (the automatic ones need none). |
| `code-out/` | The Code Atlas build (`node tools/code-atlas.js build`), **generated and ignored**; published beside the page as `code/`. |

## Editing the model

Moving an idea between layers goes through the lifecycle steps in `PROCESS.md`, which log every move. Other edits:

1. Edit the YAML. Field meanings are in Cosmic Shore's `Docs/LoopAtlas/README.md`; `schema.json` is the full list.
2. `python3 tools/loop_atlas.py build` validates and rewrites `model.json` and `BOARD.md`. Commit them with the YAML.
3. To publish: `python3 tools/loop_atlas.py build --html <file>` and `node tools/code-atlas.js build --strict`, then
   republish (`PROCESS.md`, "Publishing").

`python3 tools/loop_atlas.py --check` validates the model and fails if `model.json` or `BOARD.md` is stale; `report`
lists drift (a cited doc that is gone, a timescale outside its tier); `self-test` proves the checks refuse what they
must. `test/loopatlas.test.js` runs all three in `npm test` (the Python ones only where PyYAML and jsonschema are
installed: `pip install pyyaml jsonschema`), plus the Code Atlas self-test and a strict build.

## The checks

- The YAML matches `schema.json`: no unknown fields, required ones present, statuses and kinds from the fixed sets.
- One root loop (`era`), every other loop reachable from it, no parent cycles; a loop never sits above its parent's tier.
- Every driver, handoff, layer, tier and archetype named is defined in `vocabulary.yaml` or `kit.yaml`.
- Every edge joins two loops, every proposal touches loops that exist, the default pilot is in the fleet.
- `plan`, `develop` and `done` refuse `--by Claude`: they are a person's decisions.
