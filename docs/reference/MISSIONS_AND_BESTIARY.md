# Tumult v2.0 — missions and the bestiary

## Boards

A board is a graph. Every node sits in one or more coloured **zones** (two units that share a zone are in range of a ranged strike at any distance, as on an Unmatched board; a node in two zones reaches both), **walk edges** (melee range = shared edge; 1 AP per step), and sometimes **climb edges** to **height nodes** reached by teleports with height and by climbing (Weightless and climbing Morph forms are meant to walk up as well, but v2.0's pathing does not let them — a known issue) — or the ramp, once the winch lever is cranked twice. Boards are generated from a grid (4×3, 4×4 or 5×3) with a few edges knocked out for corridors and a couple of diagonals added, so no two are quite alike. On these grid boards each column is one zone, which is what makes kiting geometric (the v1.0 battle-series finding); boards of other shapes are planned (the atlas).

Special nodes: **spawn-nodes** (foes emerge), **hazard tiles** (3 true damage at round end to anyone standing there — enemies too), **objective nodes** (vault, lever, beacon, caches, valve), plus snares and spore zones that heroes place.

## The four archetypes (+ Elite + Boss)

Each generator takes a tier (1–3) that scales compositions and clocks. Every mission has an objective, usually a clock, and two bonus objectives.

| Archetype | Objective | Clock (t1/t2/t3) | What it tests |
|---|---|---|---|
| **Swarm — Hold the Beacon** | A hero on or adjacent to the beacon at round end counts a hold; 6/6/7 holds needed. Spawn-nodes emit Biters/Stingers every round from round 2 (cap 3/3/4 live). | 10/11/12 | Area, chains, control, holding ground under escalating pressure |
| **Vault — The Drowning Vault** | Break two seals by Interacting on the ledge (a height node). The winch lever (Interact ×2) drops a ramp so anyone can walk up. A Warden guards the climb. | 10/9/9 | Space verbs, pierce/true damage vs the Warden, or the slower lever route |
| **The Sought** | One of three caches is real. Reveal verbs expose caches in radius (or step on one to search it); then dig it out (Interact ×2). Lurkers wait for whoever searches blind. | 11/10/10 | Reveal, ambush defense, efficient searching |
| **Cascade — The Rising** | The flood spreads one ring per round from round 2. Channel the valve three times. Time verbs and the Windbreak Charm delay the spread; anchors resist the undertow. | 10/9/9 | Tempo, sustain, hazard immunity, anchors |
| **Elite** | Destroy the elite (Bulwark, Harrier or Tidecaller); its escort need not fall. Rewards a boon. | none | Whatever the elite punishes: clumping, squishy heroes, no anchors |
| **Boss — The Heart** | Destroy the Heart. Its Shield 4 is fed by two Spawners: kill both and it gutters out (or bring Pierce or true damage — area does not get through the Heart's shield, nor a Warden's). At half vitality the Heart cracks: shield gone, Spawners collapse, the flood begins, 4 rounds to finish it, and it crushes and drags. | phase 2: 4 | Everything |

Bonus objectives: *no hero below 50%*, *destroy N foes*, *destroy the Warden*, *finish with 3+ rounds to spare*, *find it within 4 rounds*, *take no ambush damage*, *take no hazard damage*, *both heroes standing*, *destroy both Spawners*.

## Enemy intents

At round start every enemy declares one intent (ability + target), drawn as an arrow on the board and listed in the side panel. In the enemy phase it **executes the declared intent and adapts only to close distance**: if its target left melee range it walks (speed) and strikes if it arrives; a zone shooter that lost range moves into a zone it shares with its target; a Kiter retreats one node first if a hero is adjacent. A Hidden hero is immune to zone shots (afterimage) but not melee or area. **Anchored** foes cannot move; **Weakened** foes hit softer; **Slow** foes cannot move. An **Overridden** foe turns its attack on an adjacent ally of its own.

## Bestiary (stats t1 / t2 / t3)

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
| The Heart 🫀 | boss | 50/61/72 | 0 | Lance 3/4/5 zone · Crush 7/8/9 melee + pull 2 · Call the Swarm | Phase 1: lance its zone, call Biters when few remain. Phase 2: crush and drag, the flood rises |

Biters called by Spawners and by the Heart are one tier lower than the mission (fodder stays fodder). Swarm waves arrive at the mission's own tier and cap at 3/3/4 live.

## The DM voice

The log narrates every resolution in plain language ("Cavitt uses Shred on Biter for 4", "Marish is Hidden — the shot strikes a chromatic afterimage", "With its Spawners gone, the Heart's shield gutters out"). The DM never improvises a number: every line is the engine's explicit resolution, which is the v1.0 promise ("the DM narrates; the rules adjudicate").
