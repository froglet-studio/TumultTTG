# Changelog

## 2.20.0 — 2026-11-13 — canon from play: correct what the game shows

Garrett: "the web experience asks us for flavor through the experience. then this gets recorded into the lore … steer the details of the world by correcting what is presented." This is the first of four steps (plan agreed with Garrett, 2026-11-13).

- **Correct this.** A small ✎ sits beside the atlas's rules of a place, its blurb, weather and field notes; the pilot named on the title screen; every foe's flavour in the Codex; and every event's text. A player picks *That's wrong*, *Add a detail* or *Love this* and writes a line.
- **One question at the draft:** why does the Cosmic Shore pilot whose painting this hero wears guide? Three answers are offered (a rotation of `T.CANON_HOOKS`), or the player writes their own; it is optional, and can be turned off.
- **Each answer is a canon record** (`src/engine/canon.js`): plain data with what was shown, where, the build, page and mission, starting *proposed* and *private*. Garrett is the lore lead: only he makes a record canon, and only records he marks public are ever copied into this repository. Records are kept on the device (`tumult_v2_canon`, newest 500), apart from any run, so the save is unchanged.
- **Canon** on the title screen lists them, turns the questions on or off, and copies them as JSON lines. The test page will send them to a private inbox in the next step.
- No rules, dice or missions change: the simulation is untouched.

## 2.19.0 — 2026-11-13 — the atlas: every mission on a page of Tumult

Garrett: "the physical copy should have a book of these with each page a different location … the book of maps becomes an atlas for tumult." Every mission is now played on a fixed board from a page of the atlas.

- **Nine pages**, three for each ground: Crystal Quarry, Mast-Crop Hills, Barricaded Market (land); Tidal Wreck Flats, Drowned Hamlet, Kelp Lagoon (sea); Floating Meadows, High Pass Halt, Burrowed Sea Cliff (air). Each grows from a Cosmic Shore pilot scene, whose painting is its plate. Places are kinds, not named spots, so a page can stand for a different place each session (Garrett).
- **One fixed board per page** (Garrett: "Choose A"), with its own shape: terraces joined by ramps, a threshing ring, a barricaded street, a ring of floats round a lagoon, rafts joined by single paths. Zones follow the place (a raft, a terrace, a ledge), some spaces sit in two, and some pages add high ground or a hazard (X1).
- **Spaces have names**, A1 to E3: the letter is how far from where you arrive, the number the side. Every mission places its starts, foes and objectives by name, so each of the six missions works on every page. A mission's own ledge is L1.
- **The Atlas screen** (title and every header): the contents by ground, and each place as a spread: the board on the left page; facing it, *Rules of this place* (what its paths and special spaces do) and *Field notes* (gravity, weather, what it is, ecology, life there, who comes from such places). In a mission, the place's name in the top bar opens its page, and the board sits over the place's painting.
- **On the route**, each stop is given a page of its leg's ground (stream `atlas`), not the page of a stop that leads to it while the ground has another; the route's tips name the place.
- **Gravity and weather are printed but have no rules yet**: that is 2.20.
- **Difficulty (harder, not easier):** `node tools/sim.js 40`, before → after. Heuristic 13 → 8 runs of 40, missions 79% → 74%; look-ahead 22 → 21 runs, missions 90% → 88%. The finale is the main change: Heart win rate 43% → 35% (heuristic) and 78% → 60% (look-ahead), and 15.7 → 18.2 rounds; on its own it ranges by page from 50% (High Pass Halt) to 100% (Tidal Wreck Flats) for the look-ahead player. The Thinning Swarm at tier 3 got easier for the heuristic (63% → 93%) and Elite tier 1 too (80% → 93%), on boards with more room. The ability audit has no narrow faces and no collapsed gate cells.
- **Saves:** version 8 adds `page` to route stops and the mission, and space labels to a page board. A version-7 save's stops draw a page when played and a mission in progress keeps its grid (fixture `save-2.18.json`).
- `T.launchMission(run, type, tier, pageId)` takes a page; `tools/mission-log.js` prints the place and space names. Reference: `docs/reference/ATLAS.md`.

## 2.18.0 — 2026-11-13 — zones instead of lanes

Garrett: "move away from lanes as vertical columns of nodes", toward boards with the spatial variety of Unmatched. This is the first step of the atlas plan: the rule a board of any shape needs.

- **Zones.** Every node sits in one or more coloured zones, and two units that share a zone are in range of a ranged strike, at any distance. A node in two zones reaches both. Every card, foe and piece of gear that said *lane* now says *zone* (`zone_all`, `foe_zone_all`, `area: 'zone'`); Hidden and Located work as before.
- **On today's boards each column is one zone**, so play is unchanged: the full simulation (`node tools/sim.js 40`, both players) and six narrated missions are byte-identical before and after. Heuristic 13/40 runs, look-ahead 22/40, as before.
- **Drawn as regions.** Each zone is one soft region whatever its shape (a disc at each node, joined along the shortest tree between them), named under its lowest node; a node's outer ring shows an arc for each of its zones. New muted colours (Slate, Sand, Plum, Sage, Clay, Ash) so a zone is never mistaken for an etherion or a domain.
- **Saves:** version 7 replaces a board node's `lane` with `zones`. A version-6 save's lane becomes a zone of the same name (fixture `save-2.17.json`).

## 2.17.0 — 2026-11-13 — a different expedition each time

Garrett: "it should have a different feel and adventure each time." Each run now draws its own expedition from its seed.

- **Who sent you.** A Jade appointment (light a dark beacon, bring a lost party home), a Ruby venture (be the first to finish the route, chart the new ground) or a Gold contract (a salvage claim, an escort). The opening passage carries the brief, and the route is headed with it.
- **What waits at the end.** Six threats: the Drowned Engine, the Standing Storm, the Quarry Hive, the Hollow Beacon, the Choking Reef, the Wind Knot. The finale is the Heart by its rules, its stats and its board; only its name and its words change ("Heart of the Standing Storm"). The route, the summary and the passages say what it is.
- **Three legs in a new order.** Land, sea and air, each under one of four names and over one of its own paintings; the last leg crosses the threat's own ground. A new leg's passage shows that leg's painting.
- **Events fit the ground.** Each event happens on two of the three grounds (a sunken cache at sea or on land, never in the air), and every ground has eight, so each event comes up as often as before.
- **Difficulty:** full runs, 80 squads, before → after: look-ahead 41 → 44 wins, heuristic 22 → 27; heuristic alone over 400 runs 108 → 117 (27% → 29%), within the noise of which events a run meets. No rules, foes or missions changed.
- **Saves:** version 6 adds `run.story.expedition`. A version-5 save has none: its route keeps its names and its finale is the Heart (fixture `save-2.16.json`). The expedition draws from a stream of its own (`expedition`).
- Names are generic on purpose: no canon places or people (`docs/LORE.md`).

## 2.16.0 — 2026-11-13 — an expedition on Tumult

Garrett chose the frame: each run is an expedition on Tumult, set down from an Ark, with the Terminal narrating. This step changes only words; the rules, ids and saves are untouched.

- **One setting throughout.** The skiff, the HyperSea tide-run and the Consolidation are gone from every screen, mission, foe, event and log line. The title reads *An expedition on Tumult*; *New Tide* is *New Expedition*; the Tide Map is *the route*, and its three legs are *the Lowland Reach*, *the Open Sea* and *the High Air* (land, sea and air, as Tumult's guide services run). The Heart stays the end of the route.
- **Difficulty is weather now:** *Steady wind* (was Rising tide) and *Gale* (was Flood tide). Same rules, same ids (`rising`, `flood`), so a saved choice carries over.
- Renamed to match: Storm Lantern, Windbreak Charm, Etherion-touched, Call the Swarm, The Heart's Envoy, Quiet Hour; three mission titles (The Thinning Swarm, What the Wind Buried, Floodgate).
- The interface still says *hero* and *bloodline*; those become *pilot* and *clade* together with the code, in roadmap milestone C1.
- A saved run keeps the leg names it was made with.

## 2.15.0 — 2026-11-13 — between the stops

Garrett: "there should be some more storytelling in between." After every stop the run now writes a short passage, and the run keeps them as its log.

- **A passage after every stop**, shown above the route until you read on: a painting, one or two lines of the Terminal's log (an interface, never a character), and a short exchange between your two pilots about what just happened: a clean win, a close call (the one who came off worst speaks), a loss, a night at a haven, an event, a new leg of the route, the last approach.
- **Each clade has a voice.** Eleven sets of lines (`T.VOICES`, `src/data/story.js`) about temperament, not lore: the jerboa never stands still, the tardigrade did not notice the fight, the octopus is holding three things that were not theirs. Playing a pilot should tell you who they are (pillar 2). A line said in the last few passages is not said again yet.
- **The log of the run** is on the summary screen: every passage, in order.
- **Saves:** version 5 adds `run.story`; an older save starts its log empty (fixture `save-2.14.json`). Each mission's history entry also keeps the foe that mattered, whether it was close, and who was hurt worst.
- **No rules change.** The story draws from its own stream (`story`); a test plays the same run with and without it and gets the same result, so the simulators are unaffected.
- With two players, each screen reads on at its own pace.

## 2.14.0 — 2026-11-13 — drawn, not typed

Garrett: "increase the fidelity across the board; it should feel like it is in our universe the whole time." The first of four steps (fidelity, setting, story between encounters, a different expedition each run). This one changes only what you see.

- **Drawn icons instead of emoji.** Every foe, mission kind, event, boon, piece of gear, consumable, basic action, clade, objective and etherion now has a pictogram drawn in Cosmic Shore's icon language: flat filled silhouettes, angular, one colour that the interface tints. Dice show their etherion's mark. `src/ui/icons.js`; a key with no drawing falls back to its emoji, so nothing goes blank. The data keeps its emoji for text.
- **The route is a chart.** The Tide Map draws each stop as a medallion and the currents between them as curves: the road taken lit gold, the next choices flowing, each leg over a dimmed painting of its ground, the Heart at the top.
- **Events and havens are illustrated.** A painting of life on Tumult beside the words, chosen for the event's mood.
- **Thirty more pilots.** Cosmic Shore's crew beyond the callsigns (portraits from their busts, scenes from their paintings): fifty clade pairs painted in all, the pool future events and stories draw their people from.
- **Build:** scenes are WebP now; the file grows from 2 MB to about 3.4 MB and still makes no network requests.
- No rules or save change; the simulators are unaffected (the engine is untouched).

## 2.13.0 — 2026-11-13 — play online

The second step of multiplayer: two players on two screens, in one game, on the test page.

- **Host and join.** On the test page's title screen, *Play online*: one player hosts and gets a four-letter code, the other joins with it. The host starts the tide when both are there. Each player drafts their own pilot at the same time; the map opens when both are done.
- **One game, held by the host.** The host's screen carries out every change and writes the whole state to the page's shared store; the guest's screen shows it and sends its own commands, which the host carries out in the order they come. A screen that reloads or joins late is caught up by the next state. `src/ui/net.js`.
- **Commands.** Everything a player does to the run now goes through `T.execCommand` (`src/engine/party.js`): a card face, a walk, a basic action, gear, an item, the round's Ready, a draft pick joining the squad, training, rewards and shopping. On one screen it runs at once, as before; online, on the host's. The host refuses a command for another player's pilot.
- **Only the test page has it** (the playtest build, through claude.ai's shared store). `TUMULT.html` still makes no network requests and is unchanged. The partner needs edit access to the page (an organization member at Contributor, or an outside person invited by email as Editor).
- **No rules change**; the simulators are unaffected. Tests: two pages in jsdom sharing a stand-in store draft, walk and ready up in one game and end with the same state (`test/net.test.js`); a command does what the direct call does (`test/party.test.js`).
- Not yet: the guest does not see the enemy turn animate, only its result; a host who closes the page ends the game for both (the host can carry on alone from Continue).

## 2.12.0 — 2026-11-13 — two players

Garrett: "now let's make it multiplayer." The first step: players and seats, which every way of playing together needs. Playing from two screens over the network comes next, on the test page.

- **Players.** The title screen picks Solo or 2 players (kept like the tide). With two, each player drafts and flies one pilot, and their name is on that pilot's draft, panel and party card. Today they pass one screen.
- **Seats.** Each hero belongs to one player; seat 0, the host, makes the squad's shared choices (the route, rewards to skip, havens, events). A screen that holds only some seats acts only for their pilots; one that holds all (solo, or a passed screen) acts for everyone, as before. `src/engine/party.js` (rules), `src/ui/party.js` (who may click what).
- **Ready.** A round ends when every player is ready. On one screen, End Round readies everyone at once, so nothing changes; from separate screens the button reads *Ready 1/2* until the last player presses it.
- **Saves:** version 4 adds `run.party`; an older save loads with one player (fixture `save-2.11.json`).
- **No rules change.** Two players meet exactly the squad, missions and dice one player does; a test holds a run to the same result whatever the number of players. The simulators are unaffected.

## 2.11.0 — 2026-11-13 — the Cosmic Shore look

Garrett: a graphical overhaul inspired by Cosmic Shore, whose pilots are Tumult's heroes and who just got new artwork.

- **Pilot art follows the clade pair.** Twenty of Cosmic Shore's painted pilots (their portraits and their scenes) ship inside the build. A hero is shown with the painting of their own two clades when one exists, else the nearest stand-in that shares a clade (the head clade first), else their clades' marks; no two heroes in a squad share a face. Every pair is meant to be supported in the end, with Tumult and Cosmic Shore sharing the art as either paints a new one (Garrett, 2026-11-13). `src/ui/pilots.js`; how to add one: `assets/README.md`.
- **Where it shows:** a pilot in their world behind the title, a new one each tide; a scene banner and portrait on every pre-made hero; the portrait in the draft, the party bar and each hero's panel; portraits on the board's hero tokens; the lead pilot's scene faint under the board.
- **The look:** Chakra Petch (Cosmic Shore's display face, SIL OFL) for headings and buttons, a deep-sea plate with a faint survey grid, chamfered HUD panels with a lit edge, quieter lanes. Etherion colours are untouched. `src/ui/theme.css`, loaded after `style.css`.
- **Build:** `tools/build.mjs` inlines `assets/` as data URIs (manifest `art`), so the game is still one file that makes no network requests; it grows from about 0.4 MB to 2 MB. A missing picture falls back to drawn art. A test holds every painting to having both pictures and every pre-made hero to having a face.
- **Fix:** the channelled Shove and Scramble texts now match what they do (1 node; Scramble steps 1).
- No rules change; the simulators are unaffected.

## 2.10.0 — 2026-11-13 — a crystal is an action

Garrett, after a playtest: a hero loaded with elemental crystals and no AP, or no card that could use them, had nothing to do with them. "We want elements to be the exciting rolls, not dead weight." He chose, from three ways to do it, to make a crystal an action on its own.

- **Channel costs no AP.** A banked etherion (or Omni) is spent on its own for a basic action of its colour: Mass — Strike an adjacent foe for 2 or Shove it 1 node; Charge — **Arc** (new) 1 damage into a foe up to 3 nodes away, or Reach an objective 2 nodes away (still 1 AP, was 2); Space — Scramble 1 node, up or down a ledge; Time — Brace (Shield 1) and slide your track 1 extra. Was: 2 AP (Strike 4, Shove 2, Reach) or 1 AP (Scramble, Brace) plus the etherion.
- Every crystal, at level 0, with no AP and no awakened card, now opens something; a test holds it (`test/engine.test.js`).
- The heuristic player channels Mass and Charge into blows and Time into Brace when threatened.
- **The Heart is harder, to pay for it:** 50/61/72 vitality (was 32/38/44), and once it cracks the Vault drowns in four rounds (was seven). Free crystals alone took the careful simulated player from 22 runs of 40 to 38; Garrett asked for the difficulty back in the same change.
- **Balance:** full runs, rising tide: look-ahead 22 → 19 of 40, heuristic 6 → 8; flood tide: look-ahead 13 → 18, heuristic 5 → 5. (`docs/reference/BALANCE.md`, v2.10.0). Squads with no cards still cannot beat the Heart, as before; free crystals alone had briefly let them (31%).
- **Audit:** unchanged (168 staples, 30 tools, 0 narrow), except that its look-ahead baseline on the tougher Heart is now too low to judge the Heart for gates.

## 2.9.0 — 2026-11-12 — no narrow faces left

Plan phase 4, second group of roadmap S2. The audit's last seven narrow faces each gain a small effect that matters in any mission; what they already did is unchanged.

| Face | Card | Now also |
|---|---|---|
| Deflect (Eth) | Counterbalance Tail (Jerboa) | Shield E (at least 1) this round |
| Blend | Chromatic Cloak (Octopus) | Shield 1 |
| Ink | Ink Screen (Octopus) | foes adjacent to you Weakened 1 |
| Gills | External Gills (Axolotl) | heal 1 (2 at P 2+) |
| Enzymes (Eth) | Carnivorous Digestion (Flytrap) | heal 1 + E now |
| Cilia Field (Eth) | Trigger-Hair Sense (Flytrap) | foes adjacent now Weakened 1 |
| Endure | Extremophile Traversal (Tardigrade) | Shield 1 (2 at P 2+) this round |

- **Audit:** narrow faces 7 → 0 (168 staples, 30 tools); still no hard-counter candidates or collapsed gate cells. Endure left the never-played list; Vanish (Chromatic Cloak's Ethereal face) joined it.
- **Balance:** the look-ahead player is unchanged (22 runs of 40). The heuristic falls from 9 runs to 6, and from 65% to 53% on the tier-3 Swarm: it plays any face with a Shield or a Weaken when threatened, so it now spends turns on Blend and Ink that it used to spend on blows. That is the weak player's blind spot, not a harder game (`docs/reference/BALANCE.md`, v2.9.0).

## 2.8.0 — 2026-11-12 — sensing faces earn their slot

Plan phase 4, the first group of roadmap S2: the audit's narrow faces. Each of the seven Physical faces that only revealed now also does a small thing that matters in any mission. Its reveal is unchanged.

| Face | Card | Now also |
|---|---|---|
| Spot | Pattern Recognition (Human) | your next strike this turn deals +1 |
| Feel | Vibrissae Sense (Jerboa) | Shield 1 |
| Listen | Sound Mapping (Barn Owl) | one free step |
| Flick | Scent Tongue (Gecko) | Marks the nearest foe (+2 on the next hit) |
| Feel Flow | Lateral Line (Axolotl) | the next hit on you is −1 |
| Sense | Electroreception (Eel) | 1 true damage to the nearest foe in your lane |
| Hairs | Trigger-Hair Sense (Flytrap) | adjacent foes Weakened 1 |

- **Audit:** narrow faces 14 → 7; staples 154 → 161; still no hard-counter candidates or collapsed gate cells. The look-ahead player now plays Feel, which it never did before; it still never plays Listen or Flick, and Spot is still played almost only in the hidden-cache mission. Two faces joined the never-played list (Burrowing's Dig and Paralytic Bite's Ethereal face), most likely sampling noise from the changed play; the next S2 group looks at them.
- **Balance:** next to nothing moves (`node tools/sim.js 40`; full runs: heuristic 9/40, look-ahead 22/40, as in 2.7.0). Tables in `docs/reference/BALANCE.md`.

## 2.7.0 — 2026-11-12 — the Flood tide (a harder difficulty)

Plan phase 3, the difficulty retune. Measuring it showed that one setting cannot serve both difficulty targets (BALANCE.md, v2.7.0), so this adds a second difficulty and leaves the first alone.

- **Added:** a difficulty for each run, `T.TIDES` in `world.js`: **Rising tide** (the game as before) and **Flood tide**. On a flood tide, from tier 2, every objective needs 1 more (tier 3: 2 more), every clock except a hold's starts 1 round shorter (2), swarms grow 1 larger (2), and elites bring 1 more escort (2). Tier 1 and the Heart are never changed. A rule a table can apply by hand.
- **Added:** the title screen picks the difficulty (remembered on the device); the map shows a pill on a flood tide. Objective texts state their counts (`Interact ×3`).
- **Changed:** mission generators take the tide as a third argument; `run.tide` is part of a run. Saves go to version 3: an older save loads on the rising tide (fixture `test/fixtures/save-2.6.json`, a version-2 save in the middle of a mission).
- **Added:** `node tools/sim.js 40 --tide flood`, `node tools/ui-drive.js 2 --manual --flood`. Tests: the flood asks exactly its rule's extra from tier 2 on and leaves tier 1 and the boss alone; a version-2 save migrates and plays on; the UI fuzz run plays a flood tide picked on the title screen (98 tests in all).
- **Balance:** the rising tide is unchanged, number for number. On the flood tide the look-ahead player wins 14 runs of 40 (22 on the rising tide) and the heuristic 2 (9). Tables in `docs/reference/BALANCE.md`.

## 2.6.0 — 2026-11-12 — Channel: no die is ever dead

The second slice of roadmap S1 (design/02), accepted into the core by Garrett.

- **Added:** Channel. Spend one banked etherion, or an Omni, with a basic action to do more:
  - Mass: Strike for 4, or Shove 2 nodes.
  - Charge: **Reach**, an Interact up to 2 nodes away (2 AP; not up a ledge from below).
  - Space: **Scramble**, 1 node to any free node, up or down a ledge included (1 AP).
  - Time: Brace, plus 1 extra track slide.

  Every etherion now has somewhere to go. Each channelled action is its own entry in `T.BASIC` (`el` names its etherion) and uses existing verbs. It is deliberately weaker than any Ethereal face of the same colour.
- **Changed:** a channelled button appears beside the basic actions only while its etherion is banked. The heuristic channels Mass into Strike when it can; the look-ahead player weighs every channelled action. How to Play explains Channel.
- **Changed:** a hero stuck on a ledge can Scramble down with a Space die.
- **Added:** a test that Channel pays its etherion or an Omni, refuses without one, and that every etherion has a channelled action (96 tests in all).
- **Balance:** this makes the game easier. The heuristic now wins the tier-1 Elite 90% of the time (was 80%), and the look-ahead player wins the Heart 78% (was 68%) and 22 runs of 40 (was 19). Card-less squads now win the tier-2 Vault 88% of the time in the audit (was 31%); the Heart is still 0% without cards. Tables are in `docs/reference/BALANCE.md`. The difficulty retune after S1 has to absorb this.

## 2.5.0 — 2026-11-12 — basic actions

The first slice of roadmap S1. Garrett accepted basic actions into the core rules (handoff decision 3).

- **Added:** every hero can **Strike** an adjacent foe for 2 (2 AP), **Brace** for Shield 1 until their next turn (1 AP) and **Shove** an adjacent foe 1 node (2 AP), with or without cards. They use the same verbs as cards, cost AP only, never go on the track and can be taken as often as AP allows. They are data (`T.BASIC` in `src/data/world.js`), with `T.canUseBasic` and `T.useBasic`, and buttons under each hero's hand. How to Play explains them.
- **Changed:** both simulated players use them. The look-ahead player gets them as legal actions (`{ t: 'basic', basic, target? }`). The heuristic strikes an adjacent foe it can hurt when no card is worth playing, and braces against a telegraphed hit of 4 or more.
- **Changed:** the ability audit's last row now plays squads with basic actions only. Card-less squads win every tier-1 mission type at least 63% of the time, where Elite was 19% before. The Heart is still 0% without cards.
- **Added:** tests for basic actions (paid in AP only, never on the track, refused without AP or a target). The recipe tests cover `T.BASIC`, and the interface fuzz run clicks the buttons (95 tests in all).
- **Balance:** `node tools/sim.js 40` before and after is in `docs/reference/BALANCE.md`. No cell moves beyond noise.

## 2.4.2 — 2026-11-12 — interface tests stop waiting

No rule changed, and nothing a player sees.

- **Changed:** the interface tests and `tools/ui-drive.js` no longer sleep a fixed second at the end of every mission; they set the pause before the mission-over modal (`T.UI.MISSION_OVER_DELAY`, 900 ms for a person) to 0 and wait until the modal is there. The run driven by autoplay went from about 8 s to 3 s, the clicking fuzz run from 9 s to 7 s, and `npm test` from about 25 s to 21 s on four cores.

## 2.4.1 — 2026-11-12 — generators are engine code

No rule changed; narrated missions and the simulator's tables are byte-identical before and after.

- **Changed:** the board generators, the mission archetypes and the Tide Map moved from `src/data/world.js` to `src/engine/generators.js`, where they are formatted and tested like the rest of the engine. `world.js` keeps the data tables (design/09 §5).
- **Added:** a test that every card face, gear ability and consumable names a verb and a targeting flow the engine knows, so a typo in a recipe fails a test instead of quietly doing nothing in play (93 tests in all).

## 2.4.0 — 2026-11-12 — Ethereal faces must be awakened

Garrett settled the last open rule from the handoff (decision 4): an Ethereal face is magic that must be awakened, and every hero starts with a few awakened.

- **Changed:** an Ethereal face cannot be played until its card has E 1 (`T.RULES.ETHEREAL_MIN_E` is now 1; it was 0). In a mission its button says "needs E 1".
- **Added:** every hero sets out with at least two cards awakened (`T.RULES.START_AWAKE`). The pre-made heroes already have two or three. A drafted hero's first two E points go to its strongest signatures, paid from the starting six UP; the player can move them, and Confirm tops the count back up to two if UP is left. `T.awaken(h)` and `T.awakenedCount(h)`.
- **Changed:** in the draft and in Train, an asleep Ethereal face is dashed and shows what it will do at E 1.
- **Changed:** the playtest panel's switch now offers the rule as shipped (E 1) and the old one (E 0). A choice stored by an older build is ignored, since it was only ever the old default.
- **Changed:** the ability audit counts an Ethereal face as held only while it is awake.
- **Added:** a test that every pre-made and drafted hero sets out with at least two cards awakened, paid from the starting UP (92 tests in all).
- **Balance:** `node tools/sim.js 40` before and after, both players, in `docs/reference/BALANCE.md`. No cell moved more than the noise at 40 missions (about fifteen points); whole runs 8 → 9 of 40 for the heuristic, 20 → 17 for the look-ahead player.

## 2.3.0 — 2026-11-12 — what happens if I end the round now?

The first slice of roadmap P1: the forecast, as text. No rule changed.

- **Added:** under the enemy intents, a line that says what ending the round as things stand will do: what each hero takes or mends, how many foes fall, whether the objective advances, whether the mission ends. Each hero's vitality shows where it is heading (`26/26 → 20`), and the hint bar says what stopping now costs the selected hero.
- **Changed:** that replaces the hint bar's "N foes targeting you (X dmg)", which added up declared numbers whether or not the foe could reach. The forecast plays the declared enemy turn out on a copy: a foe that cannot reach does not count; shields, hazards and wearing-down effects do. Nothing in an enemy turn is random, so it is exact.
- **Added:** `T.forecast(m)`, tested against what really happens at the end of 60-odd rounds across every mission type.
- **Not yet:** the forecast's ghosts on the board (where each mover ends up), and the rest of P1 — the layout, the roster rail, the hand as cards.

## 2.2.0 — 2026-11-12 — a second player, who reads the board

Roadmap milestone F2. No rule changed. The game gained a better instrument for measuring itself, and the first thing it measured is that the game is too easy. `docs/reference/PLAYERS.md` describes the player; `docs/reference/BALANCE.md` has the tables.

- **Added:** the look-ahead player (`src/engine/lookahead.js`). It knows no card by name: it lists every legal action, tries each on a copy of the mission, lets the declared enemy turn play out there, and keeps the line that scores best by one evaluation shared by every mission type. It looks four actions deep and one round ahead. The heuristic autoplayer stays, as the weak player.
- **Added:** actions as plain data — `T.legalActions`, `T.applyAction`, `T.describeAction`. A game is its seed and its list of actions: replaying the list gives the same game.
- **Added:** `T.imagine(m)`, the copy a planner, a preview or a hint must work on. It holds nothing a person at the table could not know: no dice to come, and no knowledge of which cache is the real one.
- **Added:** `T.objectiveProgress(m)`, 0 to 1 for every kind of mission, and `T.finishRound(m)`, the first half of ending the squad's phase.
- **Changed:** `node tools/sim.js` plays every mission with both players and prints the gap between them — how much a mission rewards thinking. It takes about 75 seconds at 40; `--player weak` is the old one-second table.
- **Changed:** the ability audit is played by the look-ahead player, on up to four cores, in about a minute. Its "cannot evaluate" list is empty (it was 67 faces); instead it lists the faces that player held and never chose.
- **Added:** the playtest build has **Plan** in a mission's top bar: what the look-ahead player would do with the turn, and a button to play it.
- **Added:** 7 tests (90 in all): every playable face is offered with every way to resolve it; everything offered can be taken; planning changes nothing; the plan does not depend on dice to come or on where the real cache is; a game replays from its actions; the look-ahead player wins at least as often as the heuristic on every mission type.
- **Balance:** nothing was retuned, and the heuristic's numbers are unchanged. The new player's are the news: over 100 missions a cell it wins 95% against the heuristic's 77% — 88–100% of every mission but the Heart (66%), and 63 whole runs of 100 against 16. Tier 2 and tier 3 are well above their targets for a careful player, and missions last four to seven rounds against a target of 8 to 14.

## 2.1.0 — 2026-11-12 — a mission you can copy, save and resume

Roadmap milestone F1. No rule changed; what changed is how the game holds its state and where its random numbers come from. `docs/reference/STATE_AND_SAVES.md` describes all of it.

- **Added:** a mission in progress is saved. The game saves after every action; close the page in the middle of a round and **Continue** returns to that round — the same dice in hand, the same track, the same intents on the board. Before, a refresh sent you back to the map.
- **Changed:** a run and its mission are plain data: no functions, nothing held in two places. `T.clone(mission)` is a second mission that plays on exactly as the first would — tested on 1,000 missions, copied at a random point. This is what the look-ahead player, previews and undo will stand on.
- **Changed:** the board, the dice and the opposition each draw from a random stream of their own (as do squad building, the Tide Map, loot and events), and a stream is one number kept in the state. The same seed is the same board whoever plays it; rerolling a die no longer changes which reinforcements arrive; saving draws nothing. **A seed names a different mission than it did in 2.0.x.**
- **Changed:** saves carry a version (`T.SAVE_VERSION`, now 2) and older ones are migrated. A 2.0 save still loads and its Tide can be finished; `test/fixtures/save-2.0.json` keeps that true.
- **Fixed:** after loading a saved Tide, finished nodes are ticked on the map again. 2.0 kept every map node in two places, and a loaded save updated only one.
- **Fixed:** a Tide closed on the reward screen could not be continued: that screen read the finished mission, which a save never held, and failed to draw. What it shows is kept with the reward now.
- **Changed:** while a mission lasts, the squad's crystals and the once-a-run Second Wind are the mission's (`m.crystals`, `m.secondWindUsed`); `T.applyMissionResult` hands them back and lets the mission go (`run.mission` is `null` between missions). Each mission counts its own unit ids, so a resumed one cannot hand out an id twice; `T.spawnEnemy(m, …)` replaces `T.makeEnemy`.
- **Added:** the playtest report has **Copy save**: the Tide exactly as it stands, a mission in progress included. `node tools/mission-log.js --save <file>` carries on from that moment.
- **Changed:** `tools/sim.js` meets every mission type with the same squads (only the boards differ), and its simulated player draws from a stream of its own.
- **Added:** 11 tests (83 in all), among them the three that define F1: a copy plays on exactly as the original; the same seed is the same board for any squad; a run saved mid-round resumes exactly.
- **Balance:** the rules are the same and the dice are re-dealt, so every simulated number is a fresh sample. At 1,000 missions a cell no win rate moves beyond twice its standard error (largest move 3 points); whole runs are 22% won before and 23% after over 2,000. Tables in `docs/reference/BALANCE.md`.

## 2.0.3 — 2026-11-12 — a build to playtest with

The same game, built a second way for whoever is testing it. One more card now does what its text says; nothing else in the rules changed.

- **Added:** the playtest build — `npm run build:playtest` → `dist/TUMULT.playtest.html`, or `http://localhost:5173/?playtest` on the dev server. A panel on the title screen starts any mission at any tier with two pre-made heroes, their starting six cards or the kit for that tier, and a seed; switches `ETHEREAL_MIN_E` (decision 4 in `docs/HANDOFF.md`), mid-mission too; lists what to look at in the build; and keeps a log of finished missions on the device, with a report to copy. The ordinary build carries none of it.
- **Added:** `T.quickMission` starts a run inside one chosen mission. The panel and `tools/mission-log.js` both use it, so a seed names the same board and opening dice in either; `mission-log.js` takes a sixth argument, `start` or `tier`, for the kit. `T.addProgression` (the kit a squad would carry by a tier) moved from the test harness into the run layer.
- **Added:** `node tools/build.mjs --fragment` writes a build without the `<html>`, `<head>` and `<body>` wrapper, for a host page that supplies its own. Every build now knows its version (`T.BUILD`).
- **Fixed:** *Distributed Arms — Multitask* frees the next card played **this turn**, as it says; the offer used to wait as long as it took. *Parallel*'s two still wait until they are spent. `freecast` takes `dur`.
- **Fixed:** no screen scrolls sideways at a phone's width: the Tide Map's nodes and the hand's cards share the row instead of overflowing it. The page is sized from its container rather than the viewport, so it sits properly inside a host page; a new screen starts at its top; a tooltip left by a tap goes when the page scrolls. The mission screen is still built for a mouse (roadmap P1).
- **Changed:** the interface has three optional extension points (`U.titleExtra`, `U.missionTopExtra`, `U.extraAct`), which is how the panel attaches without the game knowing about it.
- **Added:** 8 tests (72 in all): quick missions, the build variants, Multitask, and the panel driven through the real page.
- **Balance:** unchanged. `node tools/sim.js 40` prints the same tables, byte for byte, as 2.0.2.

## 2.0.2 — 2026-11-12 — the engine does what the text says

Roadmap milestone S0. A review at handoff listed eight places where card or boon text promised something the engine did not do. Seven are fixed, each test-first; the eighth is now a switch with the numbers for both settings, waiting on a decision. Tests written to keep the class from coming back found as many again, fixed here too.

- **Fixed:** a condition on an effect (`ifAnchored`, `ifOnHazard`, `ifAdjacent`, `ifE`, `ifHpBelow`) now gates it whatever its verb. *Talon Strike — Pin* Weakens only prey left at 8 hp or less; *Radiotrophic Resilience — Thrive* mints its AP only on a hazard.
- **Fixed:** *Hollow Bones — Weightless* and *Neoteny — Reshape* let a hero walk up to a ledge, as they always said.
- **Fixed:** an Anchored or Slowed Harrier cannot blink. A held Harrier still lances a hero beside it: before, a Counted Trap took its whole turn.
- **Fixed:** strike bonuses go to strikes. A corrosion tick, a snare or a zone no longer spends "your next strike" or gains a form's bonus; "this turn" bonuses (*Tool Use — Improvise*, *Silent Flight — Glide*) end with the turn; *Night Eyes — Thermal* lasts its 1 + E rounds instead of one.
- **Fixed:** boons are wired by their `hook` and `val`, so the table is the truth. *Momentum* works every round, not once a mission. *Quick Hands* did nothing; it now brings round-1 cards home a column sooner. *Second Wind*'s text says what it does: its holder rises, not whoever falls first.
- **Fixed:** a Located Harrier cannot fade (it keeps its turn). The Warden's bestiary text no longer claims area damage beats its shield. A few telegraphs and tooltips corrected.
- **Fixed:** no recipe carries an option the engine ignores. `interact` honours `height`; `anyTerrain`, `los` on `force`, `kind` on `hazardImmune` and three no-ops are gone. *Current-Cling Anchor — Cling* loses a round of hazard immunity its text never mentioned.
- **Added:** `T.RULES.ETHEREAL_MIN_E` — whether an Ethereal face can be played at E 0. Unchanged at 0; the choice is Garrett's (`docs/HANDOFF.md`, decision 4).
- **Added:** `node tools/sim.js … --rule NAME=VALUE` tries a rules constant for one run.
- **Added:** 24 tests (64 in all), among them one that fires every card face, gear ability and consumable in several situations and fails on any recipe option the engine ignores, and a suite that holds each of the fifteen boons to its text.
- **Balance:** small. Eleven of sixteen mission cells keep their win rate and none moves more than five points; see `docs/reference/BALANCE.md`.

## 2.0.1 — 2026-11-11 — moved into this repository

No rules changes. The v2.0 game was reorganised into `src/`, `tools/` and `test/` and given a build, a test suite and continuous integration.

- **Fixed:** the pre-made hero *Veil* carried four Barn Owl cards, breaking the three-per-bloodline cap. *Binocular Foresight* was replaced with *Burrowing* (Jerboa). Found by the new data tests.
- **Fixed (text only):** the boss briefing and the log said the Vault drowns in six rounds and that area damage beats the Heart's shield; the engine gives seven rounds and its shield stops area. The text now says so.
- **Documented:** a review found several places where card or boon text promises something the engine does not do. They are listed as known issues in `docs/HANDOFF.md` and scheduled as roadmap milestone S0; none was changed here.
- **Added:** `npm test` (40 tests: data integrity, engine rules, every mission type, full runs with save round-trips, the build, and two whole runs driven through the real interface).
- **Added:** `npm run audit` → `docs/reference/ABILITY_AUDIT.md`, which measures the ability rules: staples, tools and narrow faces, gate checks, autoplayer usage.
- **Added:** `npm run catalog` → `docs/reference/CARDS.md`, generated from the card data.
- **Added:** zero-dependency build (`tools/build.mjs`) and dev server replacing the shell script; Prettier; GitHub Actions.
- **Changed:** engine, UI and tools reformatted with Prettier. Simulation output is byte-identical before and after.
- **Docs:** design pillars, roadmap, proposals for the next version, and the v1.0 design bundle (archived, unchanged).
- **Repository:** run like Cosmic Shore. Changes under `.github/` need a code owner's review; workflow actions are pinned to commit SHAs; `.gitignore` blocks credentials; `AGENTS.md` points every agent at `CLAUDE.md`; the README states the licence as Cosmic Shore does; commit messages follow Froglet's `type(scope): summary` rules.

## 2.0.0 — 2026-11-06 — the playable game

A roguelike run built on the v1.0 core: draft two heroes from eleven bloodlines, a seven-row branching map, six generated mission archetypes (Swarm, Vault, The Sought, Cascade, Elite, Boss), telegraphed enemy intents, twelve enemy types, 99 two-faced trait cards implemented as data, gear, boons, consumables, havens, events, saving, and a headless balance simulator. See `docs/reference/`.

## 1.0 — the design bundle

The core rules (15-die pool, six-column track, two-faced cards, the P/E grammar, no turn theft, no hard counters), the species trait catalog, a reference engine in Python and four interactive demos. Archived in `docs/archive/v1.0/`.
