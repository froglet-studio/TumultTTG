# Vehicles and big maps

Since 2.101 the atlas has **big maps**: wide country, eight spaces across (A–H) and four deep (1–4), too far to
walk comfortably. A mission played on one, the **Crossing**, has each player pick a **pocket vehicle** for their
pilot right before it starts (Garrett, 2026-11-21). The data is `src/data/vehicles.js` and the big pages are
`T.BIG_ATLAS` in `src/data/atlas.js`; the rules are `src/engine/vehicles.js`; the garage screen is
`src/ui/vehicles.js`.

## Ground

A space on a big map has a ground as well as its zones:

| Ground | On foot | Notes |
|---|---|---|
| Open | walk | the default; a hazard vent is open ground with a hazard on it |
| Rough | walk | reeds, scree, lava rubble: only a Crawler or a Wing drives over it |
| Water | never | a Skiff or a Diver crosses it, a Wing flies over it |
| Gap | never | a fissure or a drop: only a Wing crosses it |

Paths join neighbouring spaces. A path into water or over a gap is for vehicles only (drawn faint and dashed).
Every ground space of a big page can still be reached on foot, by more than one way across, so no mission needs a
vehicle, and a pilot whose vehicle is wrecked can always walk on (`test/vehicles.test.js`). Foes go on foot.

## Vehicles

One vehicle slot for each pilot (Garrett, 2026-11-21). Before a Crossing the run stops at the garage: each player
picks one of the five vehicles for their pilot, and the host sets out. A pilot with no pick takes the one the page
suggests for that seat (`suggest`), which is also what the simulated players bring.

| Vehicle | Seats | Speed | Hull | Crosses | Riders | Cards |
|---|---|---|---|---|---|---|
| ⛵ Skiff | 2 | 3 | 6 | open, water | | Swivel Gun (2 AP, any seat: 2 to a foe in your zone) · Wake (1 AP, driver: push every foe beside it 1) |
| 🪁 Wing | 1 | 3 | 4 | everything, high ground too | Hover | Stoop (2 AP, driver: 3 to a foe beside you) · Spotter (1 AP, any seat: Mark any foe you can see) |
| 🛞 Crawler | 3 | 2 | 10 | open, rough | Immune to hazards | Long Gun (3 AP, any seat: 3 to any foe on the board you can see) · Plough (2 AP, driver: push a foe beside it 2) |
| 🐟 Diver | 2 | 4 | 6 | water only | | Torpedo (2 AP, any seat: 3 to a foe in your zone) · Submerge (1 AP, driver: Hidden until your next turn) |
| 🏍 Runner | 1 | 4 | 4 | open only | | Ram (2 AP, driver: 2 to a foe beside you and push it 1) · Swerve (1 AP, driver: Shield 2 until your next turn) |

## The rules, as a player resolves them

- **Setting out.** Each pilot starts inside their vehicle on their start space. A vehicle that cannot stand there
  (a Diver on a beach) waits on the nearest space it can, and its pilot gets in from beside it.
- **Get in** (1 AP): into a vehicle beside you with a free seat. The first one in drives.
- **Get out** (1 AP): onto a free space beside the vehicle that you could walk on. If the driver gets out, the
  next rider takes the controls; with nobody inside the vehicle is parked. Nobody stops on a parked vehicle's
  space, though anyone may pass.
- **Drive** (1 AP, the driver): move the vehicle up to its speed over its own ground, never through a foe, a decoy
  or another vehicle, with everyone inside. Drive as often as you can pay. An Anchored rider holds it where it is.
- **Inside**, a pilot plays only the vehicle's cards and their own faces marked **Mounted**. Walking, the basic
  actions, gear, Interact and Rally are done on foot. Riders cannot be pushed or pulled.
- **Vehicle cards** are played like a basic action, once a round each for the vehicle, whoever plays them: a
  *driver* card by the one driving, an *any seat* card by any rider (a gunner's seat).
- **Hull.** A blow on anyone inside lands on the vehicle's hull instead, Shields and all worked out first. A
  vehicle on a hazard is burned once, however many ride in it. At 0 hull the vehicle is wrecked: its riders are
  set down on its space, or the nearest free ground, and go on on foot.

## Mounted

> **Mounted.** You can play this face from inside a vehicle.

A face is Mounted when it neither moves its player nor needs to touch: it works on yourself, your squad, or a foe
at range. A face that moves you (move, climb, blink, a boost), hides you, swaps, changes your form, lays a decoy
or rests, or one that strikes, pushes or pulls in melee, or works on a space or an ally beside you, is not.
Cards print the word (`T.isMounted`; `T.MOUNTED_EXCEPT` can turn the rule over for one face).

## Weapons

Three vehicles carry a gun on an *any seat* card (Swivel Gun, Long Gun, Torpedo); the Crawler's Long Gun reaches
any foe on the board. Gear weapons (the tech weapons thread) add a bonus to a pilot's own strikes; a vehicle's gun
is the vehicle's, not the pilot's. When gear weapons land, `T.weaponBonus` is the one place both meet.

## The big pages

| Page | Ground | Gravity | Plate | Suggested |
|---|---|---|---|---|
| Reed Delta | sea | 0.9 g | SPARE06 | Skiff, Crawler, Wing, Diver, Skiff |
| Ashfall Salt Flat | land | 2 g | TOMAHAWK | Runner, Crawler, Wing, Runner, Crawler |

A big page is never drawn for a small mission, and a Crossing is always played on one (`gen.big`). On the route,
a Crossing's stop gets a big page of its leg's ground, from a stream of its own (`bigmap`).

## The Crossing

Light most of the signal posts spread across the far side before dark: get out, stand on a post and Interact (2 AP
or a die of its element). Posts are on ground a pilot can stand on, one in each third of the way across and one to
spare. Foes patrol the far half. Bonuses: finish with 2+ rounds to spare; no vehicle wrecked. It stands in the
route's tier-2 rows where an event stood (Short row 2, Full row 4).

| Crossing, 2 pilots (`node tools/sim.js 40`) | tier 1 | tier 2 | tier 3 |
|---|---|---|---|
| heuristic | 65% | 18% | 3% |
| look-ahead | 83% | 80% | 45% |

Harder than a Survey at the same tier (look-ahead 100/98/93), on purpose: it replaces an event on the route, so
full runs got no easier (heuristic 8/40 runs won before and after, look-ahead 19/40).
