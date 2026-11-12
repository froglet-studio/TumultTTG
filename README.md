# Tumult

A character-driven tabletop game about completing missions on Tumult — a tabletop RPG crossed with a board game, playable in a browser today.

You command a small squad. Each member is human plus two other bloodlines, and every trait they carry is a two-faced card: a cheap **Physical** face that hits harder as you train it, and an **Ethereal** face that spends an etherion to do what bodies cannot. You roll three dice a turn from a pool of fifteen, cards cool down on a six-column track, and enemies show you what they are about to do before you act — so every round is a small puzzle with more than one answer.

The project has two goals:

1. **A good game** — a TTRPG / board-game hybrid worth replaying.
2. **A character workshop** — playing it should help us create and understand our pilots and their backstories.

## Play

Requires [Node.js](https://nodejs.org) 22 or newer.

```
npm install
npm run dev        # open http://localhost:5173 — edit anything in src/ and refresh
```

or build the single-file game, which works offline and can be sent to anyone:

```
npm run build      # → dist/TUMULT.html
```

**Testing it?** `npm run build:playtest` (or `http://localhost:5173/?playtest` on the dev server) builds the same game with a panel on the title screen: start any mission at any tier with a seed, switch the rule that is waiting on a decision, and copy a report of what happened.

## Where things stand

**v2.0 is playable end to end**: draft two heroes from eleven bloodlines (99 trait cards), cross a branching seven-row map of generated missions, havens and events, and bring down the boss. It has telegraphed enemy intents, twelve enemy types, gear, boons, saving, a headless simulator and a test suite.

**Next** is the work that turns it into the game described in [`docs/ROADMAP.md`](docs/ROADMAP.md): missions that are not all fights, boards that differ every encounter, abilities that are each either a staple or a flexible tool, a campaign set on Tumult with squads of three pilots, a pilot dossier that grows out of play, original artwork, and a print-and-play edition.

## Repository map

| Path | What it is |
|---|---|
| `src/` | the game: `data/` (cards, world), `engine/` (rules, AI, run), `ui/` (browser) |
| `tools/` | build, dev server, simulators, doc generators, UI driver |
| `test/` | automated tests (`npm test`) |
| `docs/reference/` | how the game works today — rules, missions, bestiary, [card catalog](docs/reference/CARDS.md), [ability audit](docs/reference/ABILITY_AUDIT.md), balance, how to extend it |
| `docs/design/` | where the game is going — [pillars](docs/design/00-pillars.md) and proposals |
| `docs/ROADMAP.md` | milestones with acceptance criteria |
| `docs/HANDOFF.md` | state of the project when it moved into this repository |
| `docs/LORE.md` | the slice of the setting the game needs |
| `docs/archive/v1.0/` | the original design bundle (frozen) |

## Commands

| Command | Does |
|---|---|
| `npm run dev` | dev server, rebuilds on refresh |
| `npm run build` | builds `dist/TUMULT.html` and syntax-checks it |
| `npm run build:playtest` | builds `dist/TUMULT.playtest.html`: the game plus the playtest panel |
| `npm test` | runs all tests |
| `npm run check` | build + tests — run before opening a pull request |
| `npm run format` | formats code with Prettier |
| `npm run docs` | regenerates the card catalog and the ability audit |
| `node tools/sim.js 40` | balance tables from simulated missions and runs |
| `node tools/mission-log.js vault 2 7` | prints one narrated mission (archetype, tier, seed; then two hero numbers and `start` or `tier` for the kit) |

## Contributing

Designers, writers, artists and programmers are all welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md). If you use Claude Code, [`CLAUDE.md`](CLAUDE.md) is picked up automatically; start with [`docs/HANDOFF.md`](docs/HANDOFF.md).

## Copyright and License

Copyright 2026 Froglet Inc. Code released under the [MIT](LICENSE) license.
