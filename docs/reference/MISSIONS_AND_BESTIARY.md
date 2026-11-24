# Tumult v2.0 — missions and the bestiary

## Boards

A board is a graph. Every node sits in one or more coloured **zones** (two units that share a zone are in range of a ranged strike at any distance, as on an Unmatched board; a node in two zones reaches both), **walk edges** (melee range = shared edge; 1 AP per step), and sometimes **climb edges** to **height nodes** reached by teleports with height and by climbing (Weightless and climbing Morph forms are meant to walk up as well, but v2.0's pathing does not let them — a known issue) — or the ramp, once the winch lever is cranked twice. Since 2.19 every mission is played on a page of the **atlas** (`docs/reference/ATLAS.md`): a fixed board for a kind of place on Tumult, with its own paths, zones and special spaces. Every page names fifteen spaces A1–E3 (A the near edge, E the far; 1–3 the side), so a mission places its starts, foes and objectives by name and works on every page. A route gives each stop a page of its leg's ground (land, sea or air); a mission launched on its own (the simulators, the playtest jump) draws one from its board's stream. The grid generator (4×3, 4×4 or 5×3, each column one zone) remains for a mission with no page.

Special nodes: **spawn-nodes** (foes emerge), **hazard tiles** (3 true damage at round end to anyone standing there — enemies too), **objective nodes** (vault, lever, beacon, caches, valve), plus snares and spore zones that heroes place.

## The archetypes (four objectives, Salvage, Survey, Elite and Boss)

Each generator takes a tier (1–3) that scales compositions and clocks. Every mission has an objective, usually a clock, and two bonus objectives.

| Archetype | Objective | Clock (t1/t2/t3) | What it tests |
|---|---|---|---|
| **Swarm — Hold the Beacon** | A hero on or adjacent to the beacon at round end counts a hold; 6/6/7 holds needed. Spawn-nodes emit Biters/Stingers every round from round 2 (cap 3/3/4 live). | 10/11/12 | Area, chains, control, holding ground under escalating pressure |
| **Vault — The Drowning Vault** | Break two seals by Interacting on the ledge (a height node). The winch lever (Interact ×2) drops a ramp so anyone can walk up. A Warden guards the climb. | 10/9/9 | Space verbs, pierce/true damage vs the Warden, or the slower lever route |
| **The Sought** | One of three caches is real. Reveal verbs expose caches in radius (or step on one to search it); then dig it out (Interact ×2). Lurkers wait for whoever searches blind. | 11/10/10 | Reveal, ambush defense, efficient searching |
| **Cascade — The Rising** | The flood spreads one ring per round from round 2. Channel the valve three times. Time verbs and the Windbreak Charm delay the spread; anchors resist the undertow. | 10/9/9 | Tempo, sustain, hazard immunity, anchors |
| **Salvage — Before the Tide** (2.27, not a fight) | One more crate than you need lies on the far side (columns C–E): carry 2/3/4 of them to the near edge (A). Interact beside a crate to pick it up; each pilot carries one at a time, and a crate is set down the moment its carrier stands on the near edge, however they got there (a walk, a blink, the wind). A carrier who goes down drops it. Scavengers stand among the crates and the water spreads from the far edge after a round's grace. | 8/7/7 | Routes and timing; movement of any kind; Time verbs against the water; getting past foes rather than through them |
| **Survey — Before Nightfall** (2.46, not a fight) | Two more survey marks than you need, at least one in every column past the start (B–E): tag 4/5/6 of them before night falls. Tag a mark by Interacting on or beside it, for 2 AP or one die of the mark's element (Omni counts); the mark's colour is its element. Half the marks, the farthest first, start veiled: a veiled mark cannot be tagged until it is sighted, by a pilot standing within 1 of it or by a reveal that reaches it. A few foes wander between the marks. | 6/6/5 | Splitting up and route planning; reveals and movement; what to spend a rolled element on |
| **Elite** | Destroy the elite (Bulwark, Harrier or Tidecaller); its escort need not fall. Rewards a boon. | none | Whatever the elite punishes: clumping, squishy heroes, no anchors |
| **Boss — The Heart** | Destroy the Heart. Its Shield 4 is fed by two Spawners: kill both and it gutters out (or bring Pierce or true damage — area does not get through the Heart's shield, nor a Warden's). At half vitality the Heart cracks: shield gone, Spawners collapse, the flood begins, 4 rounds to finish it, and it crushes and drags. | phase 2: 4 | Everything |

Bonus objectives: *no hero below 50%*, *destroy N foes*, *destroy the Warden*, *finish with 3+ rounds to spare*, *find it within 4 rounds*, *take no ambush damage*, *take no hazard damage*, *both heroes standing*, *destroy both Spawners*.

## Enemy intents

At round start every enemy declares one intent (ability + target), drawn as an arrow on the board and listed in the side panel. In the enemy phase it **executes the declared intent and adapts only to close distance**: if its target left melee range it walks (speed) and strikes if it arrives; a zone shooter that lost range moves into a zone it shares with its target; a Kiter retreats one node first if a hero is adjacent. A Hidden hero is immune to zone shots (afterimage) but not melee or area. **Anchored** foes cannot move; **Weakened** foes hit softer; **Slow** foes cannot move. An **Overridden** foe turns its attack on an adjacent ally of its own.

## Bestiary (stats t1 / t2 / t3)

The HP column is the bestiary's own number. Since 2.29 (four dice a turn) every foe, the Heart included, has more than it: 130% in 2.29, 140% in 2.83 (the chosen element die), 145% in 2.85 (the big Ethereal faces), 150% in 2.108 (weapons), 160% in 2.119 (gear on Omni), 166% in 2.120 (dice as AP), 180% since 2.122 (clade instincts), rounded (`T.RULES.FOE_HP`): a Biter with 6 has 11.

| Enemy | Role | HP | Speed | Abilities | Policy |
|---|---|---|---|---|---|
| Biter 🦷 | swarm | 3/4/5 | 2 | Bite 2/3/3 melee | Rush the nearest hero (decoys count if nearer) |
| Stinger 🪡 | swarm | 3/4/5 | 1 | Sting 2/3/3 zone | Shoot anyone in its zone, else move into one |
| Brute 🦍 | bruiser | 10/13/16 | 1 | Slam 5/6/7 melee + push 1 | Lumber toward the lowest-vitality hero |
| Kiter 🏹 | zoner | 7/9/11 | 2 | Shot 3/4/5 zone | Retreat if adjacent, then shoot |
| Warden 🗿 | guardian | 12/15/18 | 0 | Cleave 4/5/6 melee · Brace | Immobile, Shield 3 (refreshes); cleaves adjacent else braces |
| Lurker 🫥 | ambusher | 7/9/11 | 2 | Ambush 5/6/7 melee · Creep | Starts Hidden; creeps closer; ambushes when within reach |
| Binder 🕸️ | controller | 7/9/11 | 1 | Bind 2/2/3 zone + roots 2 · Drain 3/3/4 melee, heals 2 | Roots a hero in its zone; drains when adjacent |
| Spawner 🫧 | structure | 7/9/11 | 0 | Spawn (a Biter every 3 rounds) | Immobile; feeds the Heart's shield |
| Bulwark 🛡️ | elite | 18/22/26 | 1 | Crush 5/6/7 · Quake 3/4/4 area · Brace | Quakes if 2 heroes adjacent; braces under half |
| Harrier 🗡️ | elite | 12/15/18 | 2 | Phase Lance 5/6/7 (blink adjacent, reach 3) · Fade | Alternates lance and Hidden. Anchored, Slowed or held in a Counted Trap it cannot blink, though it still lances a hero beside it; Located, it cannot fade |
| Tidecaller 🌊 | elite | 12/14/16 | 1 | Undertow 2/3/3 zone + pull 2 · Surge 4/5/6 zone + Weaken | Drags heroes toward hazards; alternate undertow/surge |
| The Heart 🫀 | boss | 50/61/86 | 0 | Lance 3/4/5 zone · Crush 7/8/9 melee + pull 2 · Call the Swarm | Phase 1: lance its zone, call Biters when few remain. Phase 2: crush and drag, the flood rises |

## Hybrid foes (2.134)

Garrett, 2026-11-22: "make them triple hybrids like the pets. but have the higher level ones able to use both the physical and ethereal powers… Then the scaling formula can upgrade them like you would the player characters." Code: `src/engine/hybrids.js`.

- **Three clades.** Every foe but the Spawners and the Heart is a hybrid of three clades, none human. Since 2.143 each kind is always the same three (`T.ENEMIES[type].clades`; Garrett, 2026-11-24): Biter mouse, crocodile and beetle; Stinger scorpion, hummingbird and lionfish; Brute bison, walrus and mandrill; Kiter cheetah, porcupine and mantis shrimp; Warden tortoise, pangolin and moose; Lurker lynx, chameleon and octopus; Binder flytrap, eel and cordyceps; Bulwark armadillo, ram and lobster; Harrier narwhal, red-tailed hawk and mantis; Tidecaller orca, jellyfish and seahorse. A rival pilot draws its pair as it spawns. Each kind is painted as one fused beast (`assets/foe-art`), and the game never names a foe's clades: players work them out from the painting and the faces it plays. The unit keeps them as `e.clades`. The role (the table above) is still its body: vitality, speed, policy and its own abilities.
- **A hybrid card.** Like a pet's, one trait from each clade: their Physical faces (P, P2, P3) and Ethereal faces (E, E2, E3), as `e.hy.traits`. When the card is in hand and one of its faces has something to do this round, the foe telegraphs that face instead of its role's move, Ethereal faces first. Then the card cools for the face's cooldown and one round more, so the role's own move comes between.
- **A level, as a pilot has one.** A foe's level is its tier, one more for an elite, plus the squad's power past two new pilots' at a level for every 10 (one less for every 10 short, so a lone new pilot meets foes a level lower; `T.foeLevel`, `spec.foeLv`). Its card plays at **P = level − 1** and **E = level − 2** (0 to 3 each), and, as on a pet, E is how many of its Ethereal faces are awake. A tier-1 foe plays Physical faces at P 0; a tier-3 foe has one Ethereal face; an elite at tier 3 two; a tier-3 foe against four pilots all three.
- **What a face does for a foe** (`T.foeAbility`), in the verbs foes already had: a strike is a melee or zone attack, or an area attack on everyone beside it, and keeps the face's push, pull, root, Weaken and drain; it hits at least as hard as the role's own hardest blow. A face that only hinders (Weaken, a root, a shove) is a 1-damage hex that carries it. A Shield on itself is a **ward**, a heal on itself a **mend**, Hidden a **veil** (Hidden 2); those wait for a round the role has no blow to land, or for a foe at half vitality. Only traits whose Physical face is one of these are drawn; an Ethereal face that is none of them stays unplayed.
- A table resolves it by hand: take the kind's three clades, draw a trait from each, note the foe's level, and when its card is back, read the first face (Ethereal first) that has a target.

**Measured** (`node tools/sim.js 40`, with `--rule HYBRID_FOES=0` for before). Mean over the 25 mission cells: heuristic 77.4% → 77.2% won, vitality left 72.5% → 70.9%; look-ahead 91.4% → 91.0%, 95.9% → 95.2%. Full runs: heuristic 0/40 both, mission win 66% → 67%; look-ahead 15/40 → 17/40 (within noise at 40 runs), mission win 84% → 87%. Missions are no easier; the foes now differ from one to the next.

## Rival pilots (2.135)

Garrett, 2026-11-22: "you can also put the players up against other Non player characters." An elite stop may be held by a **rival pilot** (`rival`, one of the four elites the Elite archetype draws from): another pilot on the same stretch, on orders of its own. Its objective reads *Defeat the rival pilot*.

- **What a pilot is**: human and two clades (`e.clades[0]` is `human`), with a hybrid card of one trait from each, so it plays a human trait as the squad's pilots do. It flies under a name (`T.RIVAL_NAMES`).
- **It awakens as a pilot does**: E = level − 1 (a creature's is level − 2), so even at tier 1 it has an Ethereal face awake, and from level 4 all three.
- **Its own moves**: Close In (melee 5/6/7) on whoever is beside it, else its Sidearm (zone 3/4/5) on the weakest pilot in its zone, else it closes in. Vitality 15/18/22, speed 2, no Shield, never Hidden on its own.
- **Measured** (240 elite missions a tier, heuristic player, by elite): tier 2 won 97% with 58% vitality left (Bulwark 60% / 35%, Harrier 100% / 71%, Tidecaller 100% / 82%); tier 3 won 80% with 38% left (Bulwark 35% / 24%, Harrier 98% / 58%, Tidecaller 100% / 75%). It sits between the Bulwark and the others.

Biters called by Spawners and by the Heart are one tier lower than the mission (fodder stays fodder). Swarm waves arrive at the mission's own tier and cap at 3/3/4 live.

## The DM voice

The log narrates every resolution in plain language ("Rosh uses Mob on Biter for 2", "Ekora is Hidden — the shot strikes a chromatic afterimage", "With its Spawners gone, the Heart's shield gutters out"). The DM never improvises a number: every line is the engine's explicit resolution, which is the v1.0 promise ("the DM narrates; the rules adjudicate").
