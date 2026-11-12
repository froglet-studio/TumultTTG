# 04 · Boards and conditions

**Status: Proposed.** v2.0 builds every board from a small grid (4×3, 4×4 or 5×3) with a few edges removed and lanes running down the columns. The boards differ in detail and feel the same. The brief is that the board should be different with each encounter.

## Board shapes

A board is still a graph of nodes with walk edges, climb edges and sightlines. What changes is that the graph comes from one of several generators, each producing a recognisably different place.

| Shape | Looks like | What it does to play |
|---|---|---|
| **Lattice** | ruins, a market, a deck | the v2.0 grid; many routes, short sightlines |
| **Ring** | a crater rim, a caldera lake | two ways round; the centre is special (hazard, objective or creature) |
| **Spine and ribs** | a ridge trail with spurs | one fast exposed route, slow sheltered detours |
| **Islands and bridges** | a strait, a broken span | chokepoints you can hold, cut or be cut off by |
| **Hub and spokes** | a beacon plaza | everything is two steps from the middle; the middle is contested |
| **Switchback** | a cliff face in tiers | a vertical board: climb edges, falls, things dropped from above |
| **River** | a channel or wind corridor | a flow lane moves whatever is in it one node each round |
| **Warren** | caves, a wreck's interior | branches and dead ends; information is worth more than speed |

Each generator takes a seed and a size and returns nodes, edges, feature slots (start, objective, opposition, props) and a list of *interesting pairs* — places far apart by foot and close by sightline, or the reverse — because that asymmetry is what makes positioning a decision.

## Sightlines, not coloured lanes

v2.0 colours nodes by lane. That will not survive more shapes, and the lane colours already collide with the etherion colours and will collide with the domain colours. Replace lanes with **sightlines**: two nodes see each other if the generator says so (a straight run of edges with no blocking feature between). The interface draws them on demand — hover a unit to see what it can see, hover a ranged ability to see what it can reach. Cover, haze, a moved crate or a raised windbreak break a sightline, which gives the squad a way to *make* safety rather than only find it.

## Terrain features

Cover and windbreaks · breakable walls and bridges · movable crates · ledges (height) · water (slow, or a hazard as the tide rises) · unstable ground (gives way after a set number of crossings — telegraphed) · beacons · build sites. Features are props ([02](02-units-verbs-actions.md)), so every verb that can affect a prop can reshape the board. Tumult's ground deforms; the board should too.

## Conditions — Tumult as the opponent

Each mission has one condition, sometimes two. A condition is a small rule module with a visible timetable; nothing it does is a surprise.

| Condition | Rule (first draft) | What it rewards |
|---|---|---|
| **Gravity band** | *Uphill* (heavy): each edge costs +1 AP, pushes travel 1 less, falls hurt. *Downhill* (light): jumps reach +1, pushes travel 1 more, carried loads are free | Mass and Space verbs differently on each side; the same squad plays two ways |
| **Wind** | an arrow on the board; at round end every light, unsheltered unit is pushed 1 downwind; ranged strikes upwind lose 1 | windbreaks, Anchors, heavy forms; using the wind to move things for you |
| **The short day** | a day on Tumult lasts about an hour, so night arrives mid-mission: on a marked round, sightlines shorten to 2 and the unseen stay unseen until found; dawn returns later | information verbs every single mission, not just in one archetype |
| **Tide** | v2.0's flood, generalised: water rises ring by ring on a timetable, and on some boards falls again | tempo, carrying, high ground |
| **Storm front** | a line that sweeps across the board; behind it, hazards | route planning; holding a shelter rather than a position |
| **Unstable ground** | marked nodes collapse after N crossings or one heavy impact | weight, forced movement as demolition |

Conditions are where "hazard immunity", "reveal" and "anchor" stop being specialist answers: with wind, night and weight on most boards, each of them matters most of the time. That is the plan for the narrow faces in the audit ([05](05-ability-audit.md)) — make the world broader, rather than making the cards stranger.

## Never the same twice

A mission's **signature** is (type, shape, condition, size class). The season generator must:

- never repeat a signature within a season;
- never use the same shape twice in a row, nor the same condition twice in a row;
- give each leg its own palette — land favours spine, switchback, lattice and gravity; sea favours islands, river, ring and tide; air favours hub, switchback, river-as-wind-corridor and wind.

Eight shapes × six conditions × twelve types is far more than a season uses, so the constraint is cheap and the variety is real.

## Tests to write with the generators

- every board is connected by walk edges alone, and the objective is reachable with basic actions only;
- no start node is adjacent to hostile opposition; no objective is visible to a ranged hostile from the start;
- every board has at least two edge-disjoint routes from start to objective (the "two routes" rule, structurally);
- a thousand generated seasons satisfy the signature constraints;
- shape metrics (diameter, mean degree, number of chokepoints, sightline density) differ measurably between generators — if two shapes score alike, one of them is not earning its place.
