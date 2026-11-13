# 07 · Art and UX

**Status: Proposed, with pieces built.** The forecast exists as text since v2.3.0 — a line under the enemy intents and a heading on each hero's vitality (`docs/reference/OVERVIEW.md`); its ghosts on the board do not. **2.11.0 began the art:** heroes are shown as Cosmic Shore's pilots, with their painted portraits on the board, the panels and the draft, a pilot's scene behind the title and under the board, Chakra Petch for display type and a deep-sea HUD look (`assets/README.md`, `src/ui/pilots.js`, `src/ui/theme.css`). That departs from "drawn in code first" and from "never an animal head on a human body" below: Garrett chose the Cosmic Shore pilots' own art (2026-11-12). Emblems, card frames per etherion, tokens for actors and props, and backdrops per leg are not built.

## Art direction

- **Original art, drawn in code first.** Vector (SVG) art generated or authored in the repository, so the game stays one self-contained file and every piece is ours to ship. No third-party characters, logos or likenesses.
- **A place, not a dashboard.** Each leg has a backdrop and palette — land (ochre rock, hard shadow, heat), sea (slate water, spray, long horizon), air (thin blue, cloud deck, bright rim light). The board sits *in* it.
- **Pilots as people.** Portraits are built procedurally from the pilot's two clades in a humanoid frame: silhouette, markings, eyes, ears or antennae, skin and texture. The rule is *two clades expressed in a humanoid* — never an animal head on a human body. A portrait should be recognisable at token size and readable at card size.
- **Emblems.** One mark per clade and per domain, designed as a set, usable at 16 px.
- **Cards that look like cards.** A frame per etherion, the two faces visibly two halves of one object, room for an illustration, cost and cooldown where the eye lands first.
- **Tokens for everything on the board** — actors, props, hazards — with silhouettes distinct enough to read without colour.

### Colour is spoken for

The four etherions own their hues (Mass red, Charge yellow, Space cyan, Time violet; Omni white). Domains are named after colours too, and v2.0's lanes use a third set. That is one palette too many. So:

- etherion hue means etherion, everywhere, and nothing else uses those hues at full strength;
- domains are told apart by **emblem and shape** first, with muted tones second;
- lanes go away: 2.18 replaced them with zones in muted colours of their own ([04](04-boards-and-conditions.md));
- nothing is ever conveyed by colour alone — every state has a glyph and a label.

### Real art, when it arrives

An `assets/` folder with a manifest: drop in a portrait, a card illustration or a token keyed by id and the build inlines it in place of the procedural version. An illustrator can replace the art piece by piece without touching code, and the game never ships with a hole.

## Interface

**Layout.** The board in the middle. A roster rail with the three pilots (vitality, banked dice, states, who has acted). The selected pilot's **hand as a fan of real cards**, with cards on the track shown along the six columns they are travelling. The opposition's intents listed in the order they will resolve.

**Forecast.** The most valuable thing the interface can do is answer *"what happens if I end the turn now?"* — damage each pilot will take, where each mover ends up, what the tide, wind or clock does. Shown as ghosts on the board and a line per pilot. Enemies already telegraph; this adds up the telegraphs.

**Previews.** Hover or focus any action to see its exact result before paying: damage after shields, the path, where a push lands, which sightlines change.

**Undo.** Anything can be undone until it reveals information or rolls dice. Take-backs cost nothing and remove most of the friction of a puzzle game.

**Teaching.** A guided first mission that introduces dice, the track and the two faces one at a time, replacing the wall-of-text help. A codex for terms, opened from any tooltip. A briefing that names the mission's routes in plain words.

**After the mission.** A short report: what happened, the grade, what it opens, and any defining moment ([06](06-pilots-and-backstory.md)).

**Feel.** Movement along edges, weight in hits, the track visibly sliding, dice that land. Short. Skippable. A reduced-motion setting that removes all of it.

**Access.** Everything reachable by keyboard; visible focus; text that scales; contrast that passes; a text log that is complete on its own; no information by colour alone; a layout that works on a tablet lying on a table.

**Saving.** Mid-mission saves, so a session can stop anywhere ([09](09-engineering.md)).

## Order of work

1. The layout, the hand, the roster and the forecast — these change how the game plays.
2. Previews and undo.
3. Tokens, emblems and card frames — the art that carries information.
4. Portraits and backdrops.
5. The guided first mission.
6. Motion, sound, and the reduced-motion and tablet passes.

Done when: a new player finishes the first mission without opening help; nobody has to count damage by hand; a screenshot of any moment could be a page of the rulebook.
