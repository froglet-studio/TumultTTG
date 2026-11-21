# The Code Atlas: zoom from a loop into Tumult, down to every value

Every loop on the map that some code implements has one more ring, **Code**. Zoom into it and you are in Tumult's code
tree. Each ring is one node of the project and holds what it is made of, plus a box per kind of **neighbour**: what a
definition calls or reads and what calls or reads it, the verbs a card uses and the cards that use a verb, a pilot's
cards and clades, the loops it serves, and **Lives in**, the node that holds it. A neighbour is the node itself, not a
link: zoom into it and you see the same record as everywhere else it appears, so every path through the graph is a path
down the tree, and a cycle unrolls into a chain that fits in its first ring. This is Cosmic Shore's Code Atlas
(`Docs/LoopAtlas/CODE.md` there): the same page and record format, with Tumult's own extraction.

## What `tools/code-atlas.js` extracts

| Node | Id | From |
| --- | --- | --- |
| Folder, file | `d:<path>`, `f:<path>` | `src/`, `tools/`, `test/`, `docs/`, the root's docs, `.github/` |
| Definition | `m:T.<name>` (global) or `m:<file>#<name>` (local) | every top-level `T.x = ...`, `function f`, `const x = ...` in a JS file: line, signature or value, length, and which `T.*` its body calls or reads |
| Verb | `m:verb.<verb>` | each `case '<verb>':` of `T.applyEffect`, linked to every card, gear piece, consumable and foe whose `fx` uses it |
| Data entry | `o:<file>#<COLLECTION>/<id>` | every entry of every data table on `T` (cards, clades, gear, boons, foes, missions, events, pages, canon prompts...), loaded through `tools/load.js`, with every value as a row; a magnitude shows its source and its value at P/E 1 and 3, a face's text what a player reads at the first level and at the cap. Tables of constants (`T.RULES`, `T.EVAL`) are one entry each. |
| Doc section | `s:<file>#<slug>` | every heading of every Markdown file |
| Loop | `L:<loop id>`, `L:vessel/<Pilot>`, `L:verb/<Pilot>/<Element>` | `model.json`: linked to every repo path and card a loop cites, each pre-made pilot to its entry, and by hand in `code/links.json` |

It is a light scan, not a JS parser: comments and strings are blanked first, a definition is anything at the top two
indents, and its body runs to the next one. `node tools/code-atlas.js self-test` proves the scan, the linker, the hash
and the value rows refuse what they must; `build --strict` fails on a hand link that matches nothing.

## The inspection window

Garrett, on the map, 2026-11-21: "when inspecting its 9 cards i would expect to find a preview of the card in an
inspection window ... other places should have similar art that can roll up into the main loop atlas and populate the
inspection window." The window in the map's corner shows the node you are on, or the nearest node above it that has
something to show; ‹ › step through its views and ⤢ makes it bigger.

- **Cards** are drawn from their data, not from a picture: name, element and clade, then each face with its cost,
  cooldown, name and text at the first level and at the cap, and the flavour line. Every card entry, every verb a card
  uses and every pilot who flies it shows them.
- **Pictures**: each pre-made pilot shows its painted scene (the same one the game picks, `U.pilotOf`), each atlas page
  its plate. Only the scenes in use are copied, so the publish stays small.
- **Rolling up**: a loop with no view of its own takes up to three from each of its children and up to eight from its
  code, pictures first, twelve at most. A pilot's kit shows the pilot then its cards; the long game shows the pilots and
  pages at a glance.

`code-out/views/views.json` holds `{views: {id: view}, nodes: {node id: [[view id]]}}`, and `views/img/` the scenes.
Cosmic Shore's Amoebius turntables and screen layouts are two more kinds of view in the same file; Tumult adds `card`
and `pic`.

## Output

`code-out/index.json` (a few KB: shard count, root, which loops have code), `names.json`, and `shards/NNN.gz.txt`
(records by `fnv1a(id) % shards`, gzip as base64 text because claude.ai serves no `.gz`). About 3,700 nodes and 20,000
values, half a megabyte, built in under a second. The inspection window's views are under `views/` (above).
