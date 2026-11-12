# Contributing to Tumult

You do not need to write code to help. The most useful contributions right now, roughly in order:

- **Play it and say what happened.** A short playtest note (template below) is worth more than a long opinion.
- **Propose abilities, missions and boards** that fit the rules in [`docs/design/00-pillars.md`](docs/design/00-pillars.md).
- **Write.** Event text, mission briefings, clade taglines and card flavour all live in plain data files.
- **Draw.** The art direction, and a proposed pipeline for dropping in finished art, are described in [`docs/design/07-art-and-ux.md`](docs/design/07-art-and-ux.md).
- **Build.** Pick an item from [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Setup

Install [Node.js](https://nodejs.org) 22 or newer, then:

```
git clone https://github.com/froglet-studio/TumultTTG.git
cd TumultTTG
npm install
npm run dev          # http://localhost:5173
```

## Making a change

1. Create a branch from `main`, named `type/area-short-description` (`feature/`, `bugfix/`, `hotfix/`, `chore/`). Agent sessions name their own branches (Claude Code uses `claude/…`); keep those names, because the prefix shows who opened the branch.
2. Make the change. Keep it small enough to review in one sitting.
3. Run `npm run check` (build + tests) and `npm run format`.
4. If you touched cards, enemies or missions, run `npm run docs` and include the regenerated files.
5. Open a pull request into `main` and fill in the template. Everything reaches `main` through a pull request; the default merge is squash and merge.

Rules changes need a test. Balance changes need before/after numbers from `node tools/sim.js 40` in the pull request.

## Proposing an ability

Open an issue (or a pull request against `src/data/cards.js`) with:

```
Name / clade / etherion:
Physical face  — cost (AP), cooldown, what it does, how it scales with P:
Ethereal face  — cost (AP + etherion), cooldown, the capability it unlocks, how it scales with E:
Three different situations where I would play it:
What a squad without it does instead:
```

The last two lines are the point. An ability must be either a **staple** (plain, useful, played often) or a **tool** with several distinct uses; no mission may require it; and it must never be the single answer to a single problem. If you can only describe it by naming the thing it beats, it is a key, not an ability — redesign it as a general verb.

## Playtest notes

```
Build / date:
Squad (clades, notable cards):
How far I got, and what ended the run:
The best moment:
The most confusing moment:
A card I never played, and why:
A mission that felt the same as an earlier one:
Did either pilot start to feel like a person? What did it?
```

## Style

- Code is formatted by Prettier (`npm run format`). The tables in `src/data/` are aligned by hand on purpose — one card face, enemy or item per line — and Prettier leaves them alone. Keep them aligned.
- The engine (`src/engine`, `src/data`) must stay deterministic and free of DOM access; use the seeded `rng`, never `Math.random()`.
- No new runtime dependencies. The game is one self-contained HTML file that makes no network requests.
- Player-facing text: plain, concrete, second person. The log narrates what the rules did; it never invents numbers.
- Commit messages follow Froglet's git rules, the same as Cosmic Shore's: `type(scope): summary` in the imperative, under about 72 characters, no trailing period. Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf` — for example `feat(cards): give reveal faces a second use on survey missions`. One logical change per commit; add a body when the why is not obvious from the diff.

## Using Claude Code

`CLAUDE.md` at the repository root is loaded automatically and carries the project's rules. Two optional helpers live in `.claude/skills/`: `/ability` (add or change an ability the right way) and `/playtest` (simulate and summarise). Start a first session with `docs/HANDOFF.md`.

## This repository is public

Tumult is run in the open, the way Cosmic Shore is: the code, the rules, the design proposals and the decisions behind them are public. That makes a few rules firm.

- **No secrets.** No API keys, passwords, tokens, signing keys or `.env` files; `.gitignore` blocks the usual ones, and credentials live in the team password manager. If one is ever committed, treat it as leaked: revoke it first, then remove it.
- **No internal or personal material.** No internal documents or links into them, no unreleased story material, no personal data, and no art you do not have the right to share.
- **Workflows get a second reviewer.** Anything under `.github/` can hand repository permissions to the code it runs, so a code owner reviews every change there (`.github/CODEOWNERS`).
- **AI work is labelled.** Commits written by Claude are authored `Claude <noreply@anthropic.com>` and carry `Co-Authored-By:` and `Claude-Session:` trailers, as in Cosmic Shore. Keep them, and have a person review agent work before it reaches `main`.

When unsure, ask Garrett first.
