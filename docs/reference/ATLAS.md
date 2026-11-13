# The atlas

Since 2.19 every mission is played on a page of the atlas: a book of places on Tumult, one place to a spread. The data is `src/data/atlas.js`; the board each page builds is `T.pageBoard(page)` in `src/engine/generators.js`; the Atlas screen and the spread are `src/ui/atlas.js`. The plan this settles is the atlas plan of 2026-11-13 (Garrett: zones instead of lanes, one fixed board per page, places left unnamed).

## A page is a kind of place

A page is never one named spot. *Crystal Quarry* is any quarry cut in steps into a cliff, so the same page can stand for a different quarry each session, and a table can say where it is. Names are descriptive for that reason, and the field notes describe what such places are like, never the history of one of them.

Each place grows from a Cosmic Shore pilot scene: the place in the painting is the page, and the painting is its plate (`scene/<CALLSIGN>`). Only planetside scenes are used; this is a game about Tumult, not the Hypersea.

## The spread

The left page is the **board**. The facing page is not a map. It has two parts:

- **Rules of this place**: what the page's paths and special spaces do (walls, rings, ramps, high ground, hazards, spaces in two zones). Everything a player needs to resolve the board by hand.
- **Field notes**: gravity and weather, then *What it is*, *Ecology*, *Life here* and *Who comes from such places* (the pilot the plate shows).

## The board

Every page names fifteen spaces by a letter and a number: the letter is how far from where you arrive (A, the near edge, to E, the far edge) and the number is the side (1, 2, 3). Missions place their starts, foes, spawns and objectives by these names (`b.at['c,r']` with column A–E = 0–4 and row 1–3 = 0–2), so every mission works on every page, at the table as on the screen ("the beacon on C2").

A page may add extra spaces, `X1`, `X2`:

| Mark | Meaning |
|---|---|
| `h: 1` | **High ground**: reached by its ladders (`climb`, dashed lines), a teleport or a hover. Foes on foot cannot follow. |
| `hz: 1` | **Hazard**: 2 true damage at the end of the round to anyone on it. `edges` joins it to the board on foot. |

A mission that adds a ledge of its own (the vault) puts it above its anchors and names it `L1`; it never sits on another space.

Each space is in one or two **zones** (the coloured regions): two units that share a zone are in range of a ranged strike, at any distance. Paths are walk edges, one step each.

Every board is checked by `test/atlas.test.js`: all fifteen names, every space reachable, the ground reachable on foot, one or two known zones a space, and a second way from A2 to E2 if the first is blocked.

## The pages today

| Ground | Page | Gravity | Plate |
|---|---|---|---|
| Land | Crystal Quarry | 4 g | ANVIL |
| Land | Mast-Crop Hills | 0.3 g | BUSHY |
| Land | Barricaded Market | 1 g | SHRAPNEL |
| Sea | Tidal Wreck Flats | 0.8 g | BANDIT |
| Sea | Drowned Hamlet | 1.5 g | SPARE08 |
| Sea | Kelp Lagoon | 1 g | FLUME |
| Air | Floating Meadows | 0.1 g | DOE |
| Air | High Pass Halt | 6 g | SPARE03 |
| Air | Burrowed Sea Cliff | 0.5 g | WINGMAN |

Gravity and weather are printed but have no rules yet; they are the next step (2.20). Canon gives only the range (10 g at the poles, 0.1 g at the equator); each page's value is the atlas's proposal.

## On the route

`T.chartPages(run)` gives every stop that is played on a board a page of its leg's ground, from the run's `atlas` stream: not the page of a stop that leads to it, nor of another stop in its row, while the ground has another page to give. Havens and events have no page. The route's tips name each stop's page; in a mission the place's name in the top bar opens its spread.

A mission launched without a route (the simulators, the playtest jump, `T.launchMission(run, type, tier, pageId)` with no page named) draws its page from its board's stream.

## Adding a page

1. Pick a planetside pilot scene that is a place, and make sure its plate is in `assets/scenes/`.
2. Add the page to `T.ATLAS`: `id`, a descriptive `name`, `ground`, `gravity` (0.1 to 10), `plate`, `from`, `weather`, `blurb`, the fifteen `spaces` (`[x, y, zones]`, x from the near edge), `edges` (`'A1-B1 …'`), any `extras`, two or more `rules`, and `notes`.
3. Write the rules so a player could resolve the board from the page alone, and the notes so the place could be anywhere on Tumult. No named canon places, people beyond the pilot, or story (`docs/LORE.md`).
4. `npm test` checks the board; play each archetype on it (`node tools/mission-log.js`) to see that it reads.
