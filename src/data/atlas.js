/* ============================================================================
   TUMULT — THE ATLAS (data)
   The book of places. Each page is a KIND of place on Tumult, never one named
   spot: unnamed, a page can stand for a different location every session
   (Garrett, 2026-11-13). Each page has ONE fixed
   board ("Choose A"), and a facing page in two parts:
   the rules of this place (what its special spaces and paths do) and field
   notes (ecology, history, life there).

   Every board names fifteen spaces by a letter and a number: the letter is
   how far from where you arrive (A, the near edge, to E, the far edge), the
   number is the side (1, 2, 3). A mission says where things go by these
   names ("the beacon on C2"), so one mission works on every page, at the
   table as on the screen. A page may add unnamed extra spaces (X1, X2):
   high ground, a hazard, a shortcut.

   Each place grows from a Cosmic Shore pilot scene (froglet-studio/
   cosmic-shore, Tools/Build/pilot_art/scenes/<CALLSIGN>.py): the place in the
   painting is the page, and the painting is its plate. Gravity and weather
   are the atlas's proposals (canon gives only 10 g at the poles and 0.1 g at
   the equator); field notes are descriptive and generic, never canon
   history, named people beyond the pilot, or story (docs/LORE.md).

   Space format: label: [x, y, zones], x and y in board cells (the near edge
   is on the left), zones a string of zone keys (T.ZONES), one or two.
   Extras add h:1 (high ground: reached by climbing, a teleport or a hover;
   `climb` lists its ladders) or hz:1 (a hazard: 2 true damage at round end).
   ========================================================================== */
(function (T) {
  T.ATLAS = [
    /* ───────────── LAND ───────────── */
    {
      id: 'quarry', name: 'Crystal Quarry', ground: 'land', gravity: 4, plate: 'scene/ANVIL', from: 'ANVIL',
      weather: 'Hard noon light, dust on the wind.',
      blurb: 'Steps cut into a pale grey cliff, and a ramp of scarred planks up the middle.',
      spaces: {
        A1: [0.0, 0.0, 'A'], B1: [1.3, 0.0, 'B'], C1: [2.6, 0.0, 'B'], D1: [3.9, 0.0, 'D'], E1: [5.2, 0.0, 'D'],
        A2: [0.2, 1.2, 'A'], B2: [1.5, 1.2, 'B'], C2: [2.8, 1.2, 'BC'], D2: [4.1, 1.2, 'D'], E2: [5.4, 1.2, 'E'],
        A3: [0.0, 2.4, 'A'], B3: [1.3, 2.4, 'C'], C3: [2.6, 2.4, 'C'], D3: [3.9, 2.4, 'E'], E3: [5.2, 2.4, 'E'],
      },
      edges: 'A1-B1 B1-C1 C1-D1 D1-E1 A2-B2 B2-C2 C2-D2 D2-E2 A3-B3 B3-C3 C3-D3 D3-E3 A1-A2 A2-A3 C2-C3 D1-D2 E2-E3',
      extras: { X1: { at: [4.55, -0.95], zones: 'D', h: 1, climb: 'D1 E1' } },
      rules: [
        'Three terraces, joined only where a ramp is cut: A1–A2–A3, C2–C3, D1–D2 and E2–E3. Count the ramps before you plan a route.',
        'The crane head (X1) is high ground above D1 and E1. Climb to it, or teleport or hover up; foes on foot cannot follow.',
        'C2, the middle of the ramp, sits in two zones: a shooter there covers both the upper and the lower steps.',
      ],
      notes: [
        { h: 'What it is', t: 'A crystal quarry cut in steps into a pale grey cliff. The faces show seams of dark crystal, glassy where they are fresh, and heaps of faceted spoil lie on every terrace.' },
        { h: 'Ecology', t: 'Little grows on fresh-cut stone. What lives here lives in the spoil heaps and the shade under the planks, and comes out when the dust settles.' },
        { h: 'Life here', t: 'At four times Earth’s weight, nothing is carried that can be rolled. Dealers in heavy crystal bring boulders up the ramp by hand, and trust no porter with them.' },
        { h: 'Who comes from such places', t: 'Brikon Copperwright, callsign ANVIL: yak and beetle, a merchant who rolls a barrel-sized boulder up the ramp alone, as a beetle rolls its ball.' },
      ],
    },
    {
      id: 'mastcrop', name: 'Mast-Crop Hills', ground: 'land', gravity: 0.3, plate: 'scene/BUSHY', from: 'BUSHY',
      weather: 'Harvest wind; the chaff blows gold at the turn of the hour.',
      blurb: 'A round threshing floor on a hilltop, ringed by stalks as tall as masts.',
      spaces: {
        A1: [0.0, 0.2, 'A'], B1: [1.2, 0.0, 'B'], C1: [2.5, 0.3, 'BD'], D1: [3.8, 0.0, 'B'], E1: [5.0, 0.2, 'E'],
        A2: [0.0, 1.3, 'A'], B2: [1.5, 1.3, 'D'], C2: [2.5, 1.3, 'D'], D2: [3.5, 1.3, 'D'], E2: [5.0, 1.3, 'E'],
        A3: [0.0, 2.4, 'A'], B3: [1.2, 2.6, 'C'], C3: [2.5, 2.3, 'CD'], D3: [3.8, 2.6, 'C'], E3: [5.0, 2.4, 'E'],
      },
      edges: 'A1-A2 A2-A3 A1-B1 A2-B2 A3-B3 B1-C1 B3-C3 C1-D1 C3-D3 D1-E1 D2-E2 D3-E3 E1-E2 E2-E3 B2-C1 C1-D2 D2-C3 C3-B2 C2-B2 C2-C1 C2-D2 C2-C3',
      extras: {},
      rules: [
        'The threshing floor is a ring (B2, C1, D2, C3) around its centre, C2, which touches all four. Whoever holds C2 is one step from everything on the hill.',
        'The rows of stalks are walls: B1 and B2, D1 and D2 do not touch. To cross a row, go round by the floor.',
        'The floor is one zone with both field rows: C1 and C3 sit in two zones each, so the edges of the floor are in range of the fields.',
      ],
      notes: [
        { h: 'What it is', t: 'A round threshing floor of packed clay on a hilltop, ringed by a knee-high wall of dry stone. Behind the wall the crop stands as tall as masts, each stalk bowed under one seed head the size of a rowing boat.' },
        { h: 'Ecology', t: 'Near the equator a plant can grow tall and top-heavy, because the ground hardly pulls. The seed heads are winnowed by hand when the hour’s wind turns.' },
        { h: 'Life here', t: 'The last of every basket is promised to the birds on the wall. Nobody remembers when that started, and nobody would stop.' },
        { h: 'Who comes from such places', t: 'Bushy: horned lizard and hedgehog, a gatherer, caught winnowing at the hour when the chaff blows gold.' },
      ],
    },
    {
      id: 'barricade', name: 'Barricaded Market', ground: 'land', gravity: 1, plate: 'scene/SHRAPNEL', from: 'SHRAPNEL',
      weather: 'Still air between tall shuttered houses.',
      blurb: 'A narrow street of shuttered houses, held overnight behind a wall of fruit crates.',
      spaces: {
        A1: [0.0, 0.0, 'A'], B1: [1.2, 0.1, 'B'], C1: [2.4, 0.0, 'B'], D1: [3.6, 0.1, 'B'], E1: [4.8, 0.0, 'B'],
        A2: [0.1, 1.2, 'A'], B2: [1.3, 1.25, 'C'], C2: [2.6, 1.2, 'D'], D2: [3.8, 1.2, 'D'], E2: [5.0, 1.25, 'E'],
        A3: [0.0, 2.4, 'A'], B3: [1.2, 2.4, 'C'], C3: [2.4, 2.4, 'C'], D3: [3.6, 2.45, 'DE'], E3: [4.8, 2.4, 'E'],
      },
      edges: 'A1-B1 B1-C1 C1-D1 D1-E1 A2-B2 C2-D2 D2-E2 A3-B3 B3-C3 C3-D3 D3-E3 A1-A2 A2-A3 B1-B2 B2-B3 C1-C2 C2-C3 D1-D2 E1-E2 E2-E3',
      extras: {},
      rules: [
        'The barricade stands between B2 and C2: they do not touch. Go round by the high street (row 1) or the back lane (row 3).',
        'The high street, B1 to E1, is one long zone: from one end of it you are in range of the other.',
        'D3 is a corner where two zones meet.',
      ],
      notes: [
        { h: 'What it is', t: 'A street of tall shuttered houses, held overnight. Across it stands a barricade of fruit crates, two barrows and the poles of a market awning.' },
        { h: 'Ecology', t: 'The crates are full of fruit with skin like clear glass, orange, green and violet. Burst ones draw small things out of the gutters by first light.' },
        { h: 'Life here', t: 'A night behind a barricade ends with breakfast taken from the barricade. Domains are ways of living here, not sides: the people who held this street came from all three.' },
        { h: 'Who comes from such places', t: 'Shrapnel: toucan and newt, an activist, flipping a glass-skinned fruit off one thumb after a night of holding the street.' },
      ],
    },

    /* ───────────── SEA ───────────── */
    {
      id: 'wreckflats', name: 'Tidal Wreck Flats', ground: 'sea', gravity: 0.8, plate: 'scene/BANDIT', from: 'BANDIT',
      weather: 'The tide is far out, and it is coming back.',
      blurb: 'A bay floor at low tide, rippled sand and pools to the horizon, and a wreck on its side.',
      spaces: {
        A1: [0.0, 0.0, 'A'], B1: [1.3, 0.1, 'B'], C1: [2.6, 0.0, 'B'], D1: [3.9, 0.1, 'B'], E1: [5.2, 0.0, 'E'],
        A2: [0.2, 1.2, 'A'], B2: [1.4, 1.3, 'A'], C2: [2.6, 1.2, 'D'], D2: [3.8, 1.3, 'E'], E2: [5.0, 1.2, 'E'],
        A3: [0.0, 2.4, 'A'], B3: [1.3, 2.3, 'C'], C3: [2.6, 2.4, 'C'], D3: [3.9, 2.3, 'C'], E3: [5.2, 2.4, 'E'],
      },
      edges: 'A1-B1 B1-C1 C1-D1 D1-E1 A2-B2 B2-C2 C2-D2 D2-E2 A3-B3 B3-C3 C3-D3 D3-E3 A1-A2 A2-A3 B1-B2 B2-B3 D1-D2 D2-D3 E1-E2 E2-E3 A1-B2 B2-A3 D1-E2 D3-E2',
      extras: { X1: { at: [2.6, -0.85], zones: 'D', h: 1, climb: 'C1 C3' } },
      rules: [
        'The wreck lies across C2: its hull is entered only from B2 or D2, never from C1 or C3.',
        'The wreck’s deck (X1) is high ground, climbed from C1 or C3. It shares a zone with the hold below.',
        'The flats are open: more paths cross them than any other page, and B2 reaches four spaces.',
      ],
      notes: [
        { h: 'What it is', t: 'The floor of a bay with the tide far out: rippled wet sand and shallow pools to the horizon, and the black ribs of an old wreck lying on its side.' },
        { h: 'Ecology', t: 'Barnacles and weed beard everything the tide covers. The pools keep what the water left behind until it comes back for it.' },
        { h: 'Life here', t: 'Out of the wreck’s burst hold rolled a clay storage jar as large as a hut. Someone lives in it now, with the hoard laid out at the door like an octopus’s garden.' },
        { h: 'Who comes from such places', t: 'Rosh Rusthook, callsign BANDIT: octopus and raven, a pirate whose den is that jar.' },
      ],
    },
    {
      id: 'hamlet', name: 'Drowned Hamlet', ground: 'sea', gravity: 1.5, plate: 'scene/SPARE08', from: 'SPARE08',
      weather: 'The morning after the flood: flat brown water and lying mist.',
      blurb: 'Domed roofs ribbed like urchin shells, standing out of the floodwater to the horizon.',
      spaces: {
        A1: [0.0, 0.2, 'A'], B1: [1.3, 0.0, 'B'], C1: [2.5, 0.2, 'B'], D1: [3.8, 0.0, 'E'], E1: [5.0, 0.2, 'E'],
        A2: [0.2, 1.3, 'A'], B2: [1.3, 1.3, 'BC'], C2: [2.6, 1.3, 'D'], D2: [3.8, 1.3, 'D'], E2: [5.1, 1.3, 'D'],
        A3: [0.0, 2.4, 'A'], B3: [1.3, 2.6, 'C'], C3: [2.5, 2.4, 'C'], D3: [3.8, 2.6, 'F'], E3: [5.0, 2.4, 'F'],
      },
      edges: 'A1-A2 A2-A3 A2-B2 A1-B1 A3-B3 B1-C1 B3-C3 B2-C2 C1-C2 C2-C3 C1-D1 C3-D3 C2-D2 D1-D2 D2-D3 D1-E1 D2-E2 D3-E3 E1-E2 E2-E3',
      extras: { X1: { at: [1.9, 1.95], zones: 'C', hz: 1, edges: 'B2 C3' } },
      rules: [
        'Every path is a plank or a pole between roofs. B2 is a roof on its own, joined to A2 and C2 but not to B1 or B3.',
        'X1 is a drowned lane between B2 and C3: a shortcut, but anyone standing in it at round end takes 2.',
        'The middle street, C2 to E2, is one zone: a shooter at the far end covers the whole of it.',
      ],
      notes: [
        { h: 'What it is', t: 'A hamlet the morning after a flood: the roofs of a dozen small houses, domed and ribbed like sea urchin shells, their round doors under water to the lintel. Lamp poles lean at angles, and a line of washing hangs just above the water.' },
        { h: 'Ecology', t: 'The water is brown with the ground it took. When it falls, the roofs will be crusted to the eaves.' },
        { h: 'Life here', t: 'The ground of Tumult moves, and towns are built to be drowned and dug out again. Rescue comes by boat, and under Jade it comes free.' },
        { h: 'Who comes from such places', t: 'Oki Sandrunner: kangaroo and armadillo, a first responder carrying the last one out of the hamlet in the front of a tabard, the way a joey rides.' },
      ],
    },
    {
      id: 'lagoon', name: 'Kelp Lagoon', ground: 'sea', gravity: 1, plate: 'scene/FLUME', from: 'FLUME',
      weather: 'Still green water at midday.',
      blurb: 'A ring of glass floats round a lagoon of bronze kelp, and a salvage barge at anchor.',
      spaces: {
        A1: [0.0, 0.6, 'A'], B1: [1.2, 0.0, 'B'], C1: [2.5, -0.1, 'B'], D1: [3.8, 0.0, 'B'], E1: [5.0, 0.6, 'E'],
        A2: [-0.5, 1.5, 'A'], B2: [1.4, 1.5, 'D'], C2: [2.5, 1.5, 'D'], D2: [3.6, 1.5, 'D'], E2: [5.5, 1.5, 'E'],
        A3: [0.0, 2.4, 'A'], B3: [1.2, 3.0, 'C'], C3: [2.5, 3.1, 'C'], D3: [3.8, 3.0, 'C'], E3: [5.0, 2.4, 'E'],
      },
      edges: 'A1-B1 B1-C1 C1-D1 D1-E1 E1-E2 E2-E3 E3-D3 D3-C3 C3-B3 B3-A3 A3-A2 A2-A1 A2-B2 B2-C2 C2-D2 D2-E2',
      extras: { X1: { at: [5.95, 0.65], zones: 'E', h: 1, climb: 'E1 E2' } },
      rules: [
        'The floats make a ring round the lagoon; the kelp spine (B2, C2, D2) crosses it, joined only at A2 and E2.',
        'The spine is one zone: on it you are in range of everything else on it, end to end.',
        'The barge’s crane (X1) is high ground, climbed from E1 or E2.',
      ],
      notes: [
        { h: 'What it is', t: 'A kelp forest in a still green lagoon. The bronze blades lie on the surface, buoyed on floats as clear as glass and as large as apples. Far off, a rust-red salvage barge rides at anchor with its crane swung out.' },
        { h: 'Ecology', t: 'Under the water the stalks go straight down out of sight. Things that hunt in kelp are long and thin, and blend with it.' },
        { h: 'Life here', t: 'Salvage families live on their barges and open the morning’s find afloat on their backs among the kelp.' },
        { h: 'Who comes from such places', t: 'Ekora Hollowbrook, callsign FLUME: otter and eel, raised on a salvage barge, opening a find the way an otter opens a clam.' },
      ],
    },

    /* ───────────── AIR ───────────── */
    {
      id: 'meadows', name: 'Floating Meadows', ground: 'air', gravity: 0.1, plate: 'scene/DOE', from: 'DOE',
      weather: 'Dusk haze; at nightfall the other meadows go dark.',
      blurb: 'Rafts of turf and reed adrift in open haze, each at its own height.',
      spaces: {
        A1: [0.0, 0.3, 'A'], B1: [1.4, 0.0, 'B'], C1: [2.6, 0.1, 'B'], D1: [4.0, 0.2, 'E'], E1: [5.2, 0.1, 'E'],
        A2: [0.3, 1.3, 'A'], B2: [1.3, 1.4, 'AD'], C2: [2.6, 1.35, 'D'], D2: [3.7, 1.4, 'D'], E2: [5.4, 1.3, 'E'],
        A3: [0.0, 2.4, 'A'], B3: [1.4, 2.7, 'C'], C3: [2.6, 2.6, 'C'], D3: [4.0, 2.5, 'E'], E3: [5.2, 2.6, 'E'],
      },
      edges: 'A1-A2 A2-A3 A2-B2 A1-B2 B1-C1 B3-C3 C2-D2 D1-E1 E1-E2 E2-E3 E3-D3 A1-B1 A3-B3 B2-C2 C1-D1 C3-D3 D2-E2 C1-C2 C3-C2',
      extras: {},
      rules: [
        'Five rafts, joined by hanging paths: the near raft (A1, A2, A3, B2), the north raft (B1, C1), the south raft (B3, C3), the pond raft (C2, D2) and the far raft (D1, E1, E2, E3, D3).',
        'Each raft is a zone: everyone on one raft is in range of everyone else on it. B2 sits on the near raft’s edge and in the pond raft’s zone too.',
        'Every crossing is a single path. Hold one and a whole raft is cut off.',
      ],
      notes: [
        { h: 'What it is', t: 'A meadow that is a raft of turf and reed a few hundred paces wide, adrift in open haze. Its far edge simply ends, with nothing beyond but dusk and other dark meadows floating at different heights.' },
        { h: 'Ecology', t: 'At a tenth of Earth’s weight, soil and roots can hold together in the air. Reeds and pale night flowers ring the ponds, and the meadows drift with the wind.' },
        { h: 'Life here', t: 'People hunt by ear here, standing still in the ponds at nightfall. The day is an hour long, so the dark is never far away.' },
        { h: 'Who comes from such places', t: 'Fenlia Moonbell, callsign DOE: moose and fennec, a hunter thigh-deep in a pond, her two great ears turned two ways.' },
      ],
    },
    {
      id: 'highpass', name: 'High Pass Halt', ground: 'air', gravity: 6, plate: 'scene/SPARE03', from: 'SPARE03',
      weather: 'Thin, cold, clear air above a sea of cloud.',
      blurb: 'A trading halt under a rock overhang, on a pass between two drops.',
      spaces: {
        A1: [0.0, 0.1, 'A'], B1: [1.3, 0.0, 'B'], C1: [2.6, 0.1, 'B'], D1: [3.9, 0.0, 'E'], E1: [5.2, 0.1, 'E'],
        A2: [0.3, 1.25, 'A'], B2: [1.5, 1.25, 'D'], C2: [2.7, 1.25, 'D'], D2: [3.9, 1.25, 'D'], E2: [5.1, 1.25, 'E'],
        A3: [0.0, 2.4, 'A'], B3: [1.3, 2.5, 'C'], C3: [2.6, 2.4, 'C'], D3: [3.9, 2.5, 'F'], E3: [5.2, 2.4, 'F'],
      },
      edges: 'A2-B2 B2-C2 C2-D2 D2-E2 A2-A1 A2-A3 B2-B1 B2-B3 C2-C1 C2-C3 D2-D1 D2-D3 E2-E1 E2-E3 A1-B1 B1-C1 C1-D1 D1-E1 A3-B3 C3-D3 D3-E3',
      extras: {},
      rules: [
        'The pass (A2 to E2) is the fast road and one long zone: walk it and everything on it can reach you.',
        'The north ledge (row 1) runs the whole way and is slower but out of the pass’s zone. The south ledge is broken between B3 and C3.',
        'Every space on the pass touches the ledges on both sides.',
      ],
      notes: [
        { h: 'What it is', t: 'A trading halt on a high pass above a sea of cloud: a counter of one slab of dark slate under a rock overhang, bolts of striped silk weighted against the wind.' },
        { h: 'Ecology', t: 'Uphill, toward the pole, the ground pulls six times as hard as Earth’s. Plants hug the rock, and a fall is not survived.' },
        { h: 'Life here', t: 'Crystal dust is weighed to the grain on brass scales, and debts are paid back here with the interest added by finger and thumb.' },
        { h: 'Who comes from such places', t: 'Bellomo Stripewright: zebra and yak, a merchant settling an old debt at the counter on the pass.' },
      ],
    },
    {
      id: 'seacliff', name: 'Burrowed Sea Cliff', ground: 'air', gravity: 0.5, plate: 'scene/WINGMAN', from: 'WINGMAN',
      weather: 'Sea haze, and wind up the cliff face.',
      blurb: 'Ledges halfway up a sea cliff, riddled with burrow doors, the sea far below.',
      spaces: {
        A1: [0.0, 0.0, 'A'], B1: [1.3, 0.0, 'B'], C1: [2.6, 0.0, 'BC'], D1: [3.9, 0.0, 'C'], E1: [5.2, 0.0, 'C'],
        A2: [0.0, 1.3, 'A'], B2: [1.3, 1.3, 'D'], C2: [2.6, 1.3, 'D'], D2: [3.9, 1.3, 'D'], E2: [5.2, 1.3, 'E'],
        A3: [0.0, 2.6, 'A'], B3: [1.3, 2.6, 'F'], C3: [2.6, 2.6, 'F'], D3: [3.9, 2.6, 'EF'], E3: [5.2, 2.6, 'E'],
      },
      edges: 'A1-B1 B1-C1 C1-D1 D1-E1 A2-B2 B2-C2 C2-D2 D2-E2 A3-B3 B3-C3 C3-D3 D3-E3 A1-A2 A2-A3 B1-B2 C2-C3 D1-D2 E2-E3',
      extras: { X1: { at: [3.25, -0.9], zones: 'C', h: 1, climb: 'C1 D1' } },
      rules: [
        'Three ledges, one above another, joined by ladders at A, B1–B2, C2–C3, D1–D2 and E2–E3.',
        'The cliff top (X1) is high ground above C1 and D1.',
        'C1 and D3 are corners where two zones meet.',
      ],
      notes: [
        { h: 'What it is', t: 'A ledge halfway up a sea cliff riddled with burrows: round doorways cut into turf and rock, each with a plank door, a step and a lamp hook. Far below, pale water and moored craft as small as seeds.' },
        { h: 'Ecology', t: 'At half Earth’s weight, a cliff is a street. Seabirds and people share it, and the wind comes up the face all day.' },
        { h: 'Life here', t: 'Washing is pegged out along the lip of the ledge on driftwood posts. A crew that stays is worth more than a ship.' },
        { h: 'Who comes from such places', t: 'Jorin Gullwing, callsign WINGMAN: puffin and pelican, a pirate pegging out his crew’s washing with the spare pegs in his bill.' },
      ],
    },
  ];
  T.PAGE_BY = {};
  T.ATLAS.forEach((p) => (T.PAGE_BY[p.id] = p));
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
