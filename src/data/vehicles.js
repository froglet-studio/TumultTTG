/* ============================================================================
   TUMULT — VEHICLES (data)
   Pocket vehicles (Garrett, 2026-11-21): on the big maps of the atlas, right
   before a mission that needs them, each player picks a vehicle for their pilot.
   Getting in or out costs 1 AP. Inside, a pilot moves as the vehicle does (its
   speed, over the ground it can cross) and plays only the vehicle's own cards
   and their trait faces marked Mounted. Vehicles differ in seats, the ground
   they cross, speed and hull, and some carry long-range weapons.

   Everything here is resolvable at the table:
     Board   1 AP: get into a vehicle beside you with a free seat.
     Leave   1 AP: get out onto a free space beside it that you could walk on.
     Drive   1 AP (the driver): move the vehicle up to its speed, over its ground, with everyone inside.
     Hull    a blow that lands on anyone inside lands on the hull instead. At 0 the vehicle is wrecked and
             its riders are set down on the nearest free ground.
   The rules text lives in docs/reference/VEHICLES.md; the engine is src/engine/vehicles.js.
   ========================================================================== */
(function (T) {
  const f = (n) => () => n;

  /**
   * Ground on the big maps (a space's `terrain`). Open ground and rough ground can be walked; water and gaps
   * (a chasm, a fissure, open air) cannot, so a pilot on foot goes round. Every space of a page can still be
   * reached on foot or the page is refused (test/vehicles.test.js): no mission needs a vehicle.
   */
  T.TERRAIN = {
    open: { name: 'Open ground', foot: true, color: null },
    rough: { name: 'Rough ground', foot: true, color: '#7d6b4f', txt: 'Reeds, scree or lava rubble: walkable, but only a Crawler or a Wing gets a vehicle over it.' },
    water: { name: 'Water', foot: false, color: '#3f7f9e', txt: 'Too deep to wade: a Skiff or a Diver crosses it, a Wing flies over it.' },
    gap: { name: 'Gap', foot: false, color: '#2a2333', txt: 'A fissure or a drop: only a Wing crosses it.' },
  };
  T.TERRAIN_KEY = { '': 'open', r: 'rough', w: 'water', g: 'gap' };

  /**
   * The vehicles. `ground`: the terrains it can drive over (and `height`: it can reach high ground).
   * `speed`: spaces a Drive moves it, for 1 AP. `seats`: riders, the driver included. `hull`: what it takes
   * before it is wrecked. `ride`: a state its riders have while inside (an existing keyword: Hover, HazardImmune).
   * Cards are played like a basic action, once a round each for the vehicle (whoever plays it), and only from
   * inside: `seat: 'driver'` only by the one driving, `'any'` by any rider (a gunner's seat).
   * `weapon`: a long-range or mounted weapon, the vehicle's (docs/reference/VEHICLES.md, Weapons).
   */
  T.VEHICLES = [
    {
      id: 'skiff', name: 'Skiff', icon: '⛵', seats: 2, speed: 3, hull: 6, ground: ['open', 'water'],
      blurb: 'A flat-bottomed sail-skimmer that runs up on a beach as easily as it crosses a channel.',
      cards: [
        { id: 'swivel', n: 'Swivel Gun', icon: '➶', ap: 2, seat: 'any', weapon: 'ranged', tgt: 'foe_los',
          fx: [{ v: 'strike', kind: 'los', dmg: f(2) }], txt: '2 damage to a foe in your zone.' },
        { id: 'wake', n: 'Wake', icon: '≋', ap: 1, seat: 'driver', tgt: 'foe_adj_all',
          fx: [{ v: 'force', kind: 'push', n: f(1), area: true }], txt: 'Push every foe beside the Skiff 1 space.' },
      ],
    },
    {
      id: 'wing', name: 'Wing', icon: '🪁', seats: 1, speed: 3, hull: 4, ground: ['open', 'rough', 'water', 'gap'], height: true,
      ride: 'Hover',
      blurb: 'A one-seat kite-wing: it goes anywhere, over anything, and takes very little hitting.',
      cards: [
        { id: 'stoop', n: 'Stoop', icon: '⤓', ap: 2, seat: 'driver', tgt: 'foe_melee',
          fx: [{ v: 'strike', kind: 'melee', dmg: f(3) }], txt: '3 damage to a foe beside you.' },
        { id: 'spotter', n: 'Spotter', icon: '◎', ap: 1, seat: 'any', tgt: 'foe_any',
          fx: [{ v: 'mark' }], txt: 'Mark any foe you can see: the next hit on it, by anyone, deals +2.' },
      ],
    },
    {
      id: 'crawler', name: 'Crawler', icon: '🛞', seats: 3, speed: 2, hull: 10, ground: ['open', 'rough'],
      ride: 'HazardImmune',
      blurb: 'A sealed, slow, many-legged hauler with a long gun on its roof. Hazards do not get inside.',
      cards: [
        { id: 'longgun', n: 'Long Gun', icon: '⌖', ap: 3, seat: 'any', weapon: 'ranged', tgt: 'foe_any',
          fx: [{ v: 'strike', kind: 'any', dmg: f(3) }], txt: '3 damage to any foe on the board you can see.' },
        { id: 'plough', n: 'Plough', icon: '⇥', ap: 2, seat: 'driver', tgt: 'foe_melee',
          fx: [{ v: 'force', kind: 'push', n: f(2) }], txt: 'Push a foe beside the Crawler 2 spaces.' },
      ],
    },
    {
      id: 'diver', name: 'Diver', icon: '🐟', seats: 2, speed: 4, hull: 6, ground: ['water'],
      blurb: 'A two-seat underwater sled. Fast and armed, but it never leaves the water.',
      cards: [
        { id: 'torpedo', n: 'Torpedo', icon: '➵', ap: 2, seat: 'any', weapon: 'ranged', tgt: 'foe_los',
          fx: [{ v: 'strike', kind: 'los', dmg: f(3) }], txt: '3 damage to a foe in your zone.' },
        { id: 'submerge', n: 'Submerge', icon: '▾', ap: 1, seat: 'driver', tgt: 'self',
          fx: [{ v: 'hidden', dur: f(1) }], txt: 'Hidden until your next turn.' },
      ],
    },
    {
      id: 'runner', name: 'Runner', icon: '🏍', seats: 1, speed: 4, hull: 4, ground: ['open'],
      blurb: 'A one-seat ground racer: the fastest thing on open ground, useless off it.',
      cards: [
        { id: 'ram', n: 'Ram', icon: '⇒', ap: 2, seat: 'driver', tgt: 'foe_melee',
          fx: [{ v: 'strike', kind: 'melee', dmg: f(2) }, { v: 'force', kind: 'push', n: f(1) }], txt: '2 damage to a foe beside you, and push it 1 space.' },
        { id: 'swerve', n: 'Swerve', icon: '↯', ap: 1, seat: 'driver', tgt: 'self',
          fx: [{ v: 'shield', val: f(2), dur: f(1) }], txt: 'Shield 2 until your next turn.' },
      ],
    },
  ];
  T.VEHICLE_BY = {};
  T.VEHICLES.forEach((v) => {
    T.VEHICLE_BY[v.id] = v;
    v.cards.forEach((c) => (c.vehicle = v.id));
  });

  /**
   * Mounted (keyword, 2.101): a trait face a pilot can play from inside a vehicle. Garrett, 2026-11-21:
   * "vehicle cards plus Mounted faces". A face is Mounted when it neither moves its player nor needs to touch:
   * it works on yourself, your squad, or a foe at range. Printed on the card, so it is resolvable at the table:
   *   not Mounted: a face that moves you (move, climb, blink, a boost), hides you, swaps, changes your form,
   *   lays a decoy or rests, or one that strikes, shoves or pulls in melee, or works on a space or an ally beside you.
   * T.MOUNTED_EXCEPT can turn the rule over for a face by id ('card:P').
   */
  const NOT_MOUNTED_VERBS = new Set(['move', 'climb', 'blink', 'rally', 'hidden', 'rest', 'swap', 'morph', 'stasis', 'decoy', 'force']);
  const NOT_MOUNTED_TGT = new Set(['foe_melee', 'foe_adj_all', 'node_move', 'node_climb', 'node_tele', 'ally_adj_move', 'ally_move', 'node_adj', 'ally_adj', 'foe_or_ally_adj']);
  T.MOUNTED_EXCEPT = {};
  T.isMounted = function (card, faceKey) {
    const face = card[faceKey];
    const ex = T.MOUNTED_EXCEPT[card.id + ':' + faceKey];
    if (ex != null) return ex;
    if (NOT_MOUNTED_TGT.has(face.tgt)) return false;
    return !face.fx.some((x) => NOT_MOUNTED_VERBS.has(x.v) || (x.v === 'strike' && !['los', 'any', 'zone_all'].includes(x.kind)));
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
