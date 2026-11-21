/* ============================================================================
   TUMULT — DATA: PETS (2.102)
   ----------------------------------------------------------------------------
   A pet is a sidekick, as in Unmatched: a small unit of its own on the board, with its own vitality, that foes
   see, target and hit. It is not a decoy: it lasts the mission and acts. Garrett, 2026-11-21:
     "pets that act kinda like the sidekicks in unmatched. they will have their own cards cut into the 9 card max"
     "found on the expedition" · "2 pets maximum. pets can die" · "pets can occupy the same space as their player"
     "a pet in a player space is invulnerable"
     "pets also have three species but none of them can be human" (drafting their cards was replaced the same day)

   • A pet is a hybrid of three clades, none of them human (a pilot is human and two). Pilots find them on the
     expedition (a haven's stray, T.havenStock), two at most.
   • A pet comes with one card, made when it is found (Garrett, 2026-11-21: "it has a random card from each of
     the three species. grab the physical part from all three cards and turn it into one card with three
     physical abilities. the whole card goes on cooldown when one is used"). One trait is drawn from each of
     its clades, and the pet card carries the three Physical faces, as faces P, P2 and P3. It has no Ethereal
     face. It sits in the pilot's kit, counts toward the nine, and grows with P like any Physical face.
   • A pet card is paid with the pilot's dice and goes on the pilot's track whole, whichever face was played,
     but it acts from the pet: its reach, its strikes, its steps, its own states ("you" on the face is the
     pet). What a face does to dice, the track or the purse still goes to the pilot (T.PET_PILOT_VERBS).
   • Heel (1 AP): the pet moves up to T.PET.SPEED.
   • A pet at 0 vitality dies. It leaves the board and its card is out for the rest of the mission; it comes
     back, whole, for the next one (Garrett, 2026-11-21: "if a player or pet dies it is gone for the mission.
     and comes back next mission").
   • A pet may share its own pilot's node, and its pilot may share its node; nobody else can. While it is on
     its standing pilot's node nothing can hurt it.

   A pet, kept on its pilot (h.pets), is plain data: { id, name, species: [3 clades], traits: [3 card ids],
   card }. Its card is built from that by T.registerPet and kept in T.CARD under `card`, so every lookup by id
   finds it; it is not in T.CARDS, the clades' catalog.
   ========================================================================== */
(function (T) {
  T.PET = {
    HP: 8, // a pet's vitality, every mission
    SPEED: 3, // how far Heel takes it
    HEEL_AP: 1,
    MAX: 2, // pets per pilot
    PRICE: 4, // ◇ to adopt one at a haven
  };
  /** Names a haven's stray answers to (drawn from the run's 'pets' stream). */
  T.PET_NAMES = [
    'Burr', 'Pip', 'Moss', 'Tock', 'Ember', 'Wick', 'Nib', 'Sorrel', 'Quill', 'Biscuit', 'Fennel', 'Rook',
    'Juniper', 'Skip', 'Cinder', 'Bramble', 'Dot', 'Marrow', 'Tansy', 'Flint', 'Kip', 'Soot', 'Pebble', 'Whisk',
  ];
  /**
   * Verbs that work on the dice, the track or the purse. On a pet card they still go to the pilot: the pet
   * has neither dice nor a track.
   */
  T.PET_PILOT_VERBS = ['mint', 'draw', 'reroll', 'haste', 'engine', 'rest', 'execute'];

  /** The face keys of a card: P and E for a trait, P, P2 and P3 for a pet's card. */
  T.PET_FACES = ['P', 'P2', 'P3'];
  T.faceKeys = (cardId) => {
    const c = T.CARD[cardId];
    return c && c.pet ? T.PET_FACES : c && c.faces ? c.faces : ['P', 'E']; // a gear card names its own (world.js)
  };
  /** A card that belongs to no clade: a pet's or a gear's. It counts toward the nine, never toward a 3-of-9. */
  T.isKinless = (cardId) => {
    const c = T.CARD[cardId];
    return !!(c && (c.pet || c.gear));
  };
  T.isPetCardId = (cardId) => typeof cardId === 'string' && cardId.startsWith('pet~');
  /** Build a pet's card from its record and put it in T.CARD. The same record always builds the same card. */
  T.registerPet = function (rec) {
    const traits = rec.traits.map((id) => T.CARD[id]);
    const card = {
      id: rec.card,
      pet: rec.id,
      sp: rec.species[0], // the clade its art is drawn from; it counts toward no clade (T.cladeSlots)
      clades: [],
      kin: 'Pet',
      name: rec.name,
      el: traits[0].el,
      sig: 0,
      E: null,
      flavor: `A ${rec.species.map((sp) => (T.SPECIES[sp] ? T.SPECIES[sp].name : sp)).join(', ')} hybrid.`,
    };
    T.PET_FACES.forEach((k, i) => (card[k] = Object.assign({}, traits[i].P, { from: traits[i].id })));
    T.CARD[card.id] = card;
    return card;
  };
  /** Make sure every pet of these heroes has its card in T.CARD (after a save or a made pilot is loaded). */
  T.registerPets = (heroes) =>
    (heroes || []).forEach((h) => ((h && h.pets) || []).forEach((p) => T.CARD[p.card] || T.registerPet(p)));
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
