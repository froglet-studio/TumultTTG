---
name: loop-atlas
description: Work through the Tumult Loop Atlas (docs/loopatlas, the map https://claude.ai/artifact/BJc3vHJ8PUtjFwcLmbmM2T) - propose onto its Proposed layer, record Garrett's plan and build decisions, take and close build orders, link loops to code, run the steward run (apply what the map's Board decided), and republish the map with its Code Atlas. Use on "the steward run", "the board", "the atlas", "the loop map", "new idea", "plan P<n>", "build this", "what is planned or being built", "republish the map", or a note left on the map.
---

# Tumult Loop Atlas

Read `docs/loopatlas/PROCESS.md` first; it is the rule. Proposed is brainstorming (anyone, Claude included), Planned is
Garrett's decision, Now changes only when the game does. Every move is
`python3 tools/loop_atlas.py <step> <loop, item or P<n>> --by <who>`, which rewrites the YAML, logs one line in
`ledger.jsonl` and rebuilds `model.json` and `BOARD.md`; commit them together. `plan`, `develop` and `done` refuse
`--by Claude`: name the person whose word it was and quote it in the commit.

1. **Start**: `python3 tools/loop_atlas.py --check`, then read `docs/loopatlas/BOARD.md`. Answer "what is planned or
   being built" from it and the ledger, never from memory.
2. **Brainstorm**: a suggestion or hole found anywhere becomes `propose <loop> --note "..." --by Claude`, a `holes`
   entry by hand, or `idea <id> --area <game|ui|tooling> --name "..." --note "..." --by Claude`. Cite the source.
3. **Plan / develop** only on Garrett's word (a message of his, or a decision on the map's Board).
4. **Build** a queued order: `start <target> --branch <branch> --by Claude`, build it under every `CLAUDE.md` rule (the
   `ability` and `playtest` skills for cards and balance), and in the same PR `done <target> --by Garrett --status part`
   so the atlas and the game merge together. A person signs off fun (`--status signed`).
5. **Link code**: add what the automatic links miss to `docs/loopatlas/code/links.json`; `node tools/code-atlas.js build
   --strict` fails on a link that matches nothing.
6. **Steward run**: `PROCESS.md`, "The steward run" (ArtifactData export, `gather`, `apply`, at most five proposals, one
   PR, mark `applied`, at most one build order).
7. **Republish**: `PROCESS.md`, "Publishing". Read the artifact first, keep its database, never publish a second map, and
   declare the capabilities given there.
