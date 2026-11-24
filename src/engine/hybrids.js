/* ============================================================================
   TUMULT — HYBRID FOES (2.134; pure, no DOM)
   ----------------------------------------------------------------------------
   Garrett, 2026-11-22: "lets make the enemies more interesting. make them triple hybrids like the pets. but
   have the higher level ones able to use both the physical and ethereal powers ... Then the scaling formula
   can upgrade them like you would the player characters."

   • A foe is still its role (Biter, Brute, Warden, ...): its body, vitality, speed and the ability its
     policy plays. On top of that, each foe that comes onto the board is a hybrid of three clades, none
     human: its kind's own three (T.ENEMIES[type].clades, since 2.144), and carries a hybrid card
     like a pet's: one trait from each clade, drawn when it spawns from a stream of the mission's own ('hybrid'), the trait's Physical face (P, P2, P3) and its Ethereal face
     (E, E2, E3).
   • The foe plays a face of its card as an intent, telegraphed like any other, then the card cools:
     it is back after the face's cooldown and one round more, so the role's own ability comes between.
   • A foe has a level, as a pilot does: its mission's tier, one more for an elite, and the squad's power
     past (or short of) two new pilots', a level for every 10 (a new pilot's worth; T.foeLevel). Its card
     plays at P = level − 1 and E = level − 2 (0 to 3 each), and E is how many of its Ethereal faces are
     awake, one a point, as on a pet: a tier-1 foe plays its Physical faces at P 0, a tier-3 foe one
     Ethereal face, a tier-3 elite with a big squad all three.
   • A face becomes a foe's move through the verbs it already has (T.foeAbility): a strike is a melee or a
     zone attack (an area strike hits everyone beside it) and keeps its pushes, pulls, roots, Weaken and
     drain; a face that only hinders (Weaken, a root, a shove) is a 1-damage hex that carries it; a Shield
     on itself is a ward, a heal on itself a mend, Hidden a veil. A trait none of whose faces is any of
     these is never drawn for a foe; an Ethereal face that is none of them just stays unplayed.
   The Spawners and the Heart stay what they are: no hybrid card.
   ========================================================================== */
(function (T) {
  T.HYBRID = {
    NOT: ['spawner', 'heart'], // roles that carry no hybrid card
    LEVEL_POWER: 10, // squad power past two new pilots' for a foe level (a new pilot)
    REST: 1, // rounds the card cools past the face's own cooldown
  };
  T.HYBRID_FACES = ['P', 'P2', 'P3', 'E', 'E2', 'E3'];
  /** Names a rival pilot flies under (drawn from the mission's 'hybrid' stream). */
  T.RIVAL_NAMES = [
    'Vesk',
    'Orrin',
    'Tamsa',
    'Kell',
    'Brisa',
    'Dorn',
    'Ilka',
    'Sevrin',
    'Mako',
    'Ytta',
    'Corran',
    'Lune',
  ];
  const num = (v, P, E) => (typeof v === 'function' ? v(P, E) : v || 0);
  const FOE_TGT = (t) => typeof t === 'string' && t.startsWith('foe');

  /**
   * One card face as a foe's ability at P and E: { n, kind, dmg, push, pull, anchor, weaken, heal, ward, veil },
   * or null when the face has nothing a foe can do with it. Plain data, worked out afresh from the card.
   */
  T.foeAbility = function (face, P, E) {
    if (!face || !face.fx) return null;
    const fx = face.fx;
    const find = (v) => fx.find((x) => x.v === v);
    const s = find('strike');
    const ab = { n: face.n, hy: true };
    const riders = () => {
      const w = find('weaken');
      if (w && !w.self) ab.weaken = Math.max(1, num(w.val, P, E));
      const a = fx.find((x) => x.v === 'anchor' && (x.who === 'foe' || x.who === 'target'));
      if (a) ab.anchor = Math.max(1, num(a.dur, P, E) || 1);
      const f = find('force');
      if (f) ab[f.kind === 'pull' ? 'pull' : 'push'] = Math.max(1, num(f.n, P, E) || 1);
    };
    if (s) {
      ab.kind =
        s.kind === 'los' || s.kind === 'any'
          ? 'los'
          : ['area', 'zone_all', 'nodeArea'].includes(s.kind)
            ? 'area'
            : 'melee';
      ab.dmg = Math.max(1, num(s.dmg, P, E));
      riders();
      const hl = fx.find((x) => x.v === 'heal' && !x.party && !x.target);
      if (hl) ab.heal = Math.max(1, num(hl.n, P, E));
      return ab;
    }
    if (FOE_TGT(face.tgt) && fx.some((x) => ['weaken', 'anchor', 'force'].includes(x.v))) {
      riders();
      if (!ab.weaken && !ab.anchor && !ab.push && !ab.pull) return null;
      ab.kind = face.tgt === 'foe_melee' || face.tgt === 'foe_adj_all' ? 'melee' : 'los';
      ab.dmg = 1;
      return ab;
    }
    if (face.tgt === 'self' || face.tgt === 'party') {
      const sh = fx.find((x) => x.v === 'shield' && !x.next);
      if (sh) return Object.assign(ab, { kind: 'ward', ward: Math.max(1, num(sh.val, P, E)) });
      const hl = find('heal');
      if (hl) return Object.assign(ab, { kind: 'mend', heal: Math.max(1, num(hl.n, P, E)) });
      if (find('hidden')) return Object.assign(ab, { kind: 'veil' });
    }
    return null;
  };
  /** Can a foe play this trait's Physical face at all? (Only such traits are drawn for a hybrid card.) */
  const usable = (c) => !!T.foeAbility(c.P, 0, 0);

  /** A foe's level: its tier, one more for an elite, and the squad's power in levels (m.foeLv). At least 1. */
  T.foeLevel = (m, e) => Math.max(1, (e.tier || 1) + (e.elite ? 1 : 0) + ((m && m.foeLv) || 0));

  /** Give a new foe its three clades and hybrid card, from the mission's 'hybrid' stream. */
  T.hybridize = function (m, e) {
    if (!R().HYBRID_FOES || !m.rngs || m.rngs.hybrid == null || T.HYBRID.NOT.includes(e.type)) return;
    const rng = T.stream(m.rngs, 'hybrid');
    const rival = !!T.ENEMIES[e.type].rival;
    // a rival pilot is what a pilot is: human and two clades (2.135; Garrett: "you can also put the players up against other Non player characters")
    // a creature is its kind's three clades (T.ENEMIES[type].clades, painted as one beast; 2.144), its traits drawn from them
    const kind = T.ENEMIES[e.type].clades;
    const species = rival
      ? ['human'].concat(rng.shuffle(T.SPECIES_ORDER.filter((sp) => sp !== 'human')).slice(0, 2))
      : kind
        ? kind.slice()
        : rng.shuffle(T.SPECIES_ORDER.filter((sp) => sp !== 'human')).slice(0, 3);
    const traits = [];
    for (const sp of species) {
      const pool = T.cardsOf(sp).filter((c) => !traits.includes(c.id) && usable(c));
      if (pool.length) traits.push(pool[rng.int(pool.length)].id);
    }
    if (traits.length < 3) return;
    const L = T.foeLevel(m, e);
    e.clades = species;
    e.hy = {
      traits,
      level: L,
      P: Math.max(0, Math.min(R().P_CAP, L - 1)),
      // a rival pilot awakens as a pilot does, a face sooner than a creature
      E: Math.max(0, Math.min(R().E_CAP, L - (rival ? 1 : 2))),
      cd: 0,
    };
    if (rival) {
      e.rival = true;
      e.name = 'Rival ' + rng.pick(T.RIVAL_NAMES);
    }
  };
  /** The trait behind face `fk` of a foe's hybrid card. */
  const traitOf = (e, fk) => T.CARD[e.hy.traits[T.HYBRID_FACES.indexOf(fk) % 3]];
  /**
   * A foe's hybrid faces it can play now (its awake ones, which a foe can do something with), Ethereal first:
   * [{ fk, key, ab, sp }].
   */
  T.foeHybridFaces = function (e) {
    if (!e || !e.hy) return [];
    const out = [];
    ['E3', 'E2', 'E', 'P', 'P2', 'P3'].forEach((fk) => {
      const eth = fk[0] === 'E';
      if (eth && e.hy.E < (fk === 'E' ? 1 : +fk[1])) return;
      const c = traitOf(e, fk);
      const ab = floored(e, T.foeAbility(eth ? c.E : c.P, e.hy.P, e.hy.E));
      if (ab) out.push({ fk, key: 'hy:' + fk, ab, sp: e.clades[T.HYBRID_FACES.indexOf(fk) % 3], card: c.id });
    });
    return out;
  };
  /** The hardest hit of a foe's role (its own abilities' damage at its tier). */
  T.roleDmg = (e) =>
    Math.max(0, ...Object.values(T.ENEMIES[e.type].abilities).map((a) => (a.dmg ? T.enemyDmg(e, a) : 0)));
  /**
   * An attack from the hybrid card hits at least as hard as the role's own hardest hit, so the card adds what
   * the trait does (a push, a root, Weaken, reach) to the foe's body rather than trading its blow for it.
   */
  function floored(e, ab) {
    if (ab && ['melee', 'los', 'area'].includes(ab.kind)) ab.dmg = Math.max(ab.dmg, T.roleDmg(e));
    return ab;
  }
  /** A foe's ability by intent key: its role's (T.ENEMIES), or a face of its hybrid card ('hy:P2'). */
  T.foeAbilityByKey = function (e, key) {
    if (typeof key === 'string' && key.startsWith('hy:')) {
      if (!e.hy) return null;
      const fk = key.slice(3);
      const c = traitOf(e, fk);
      const ab = floored(e, T.foeAbility(fk[0] === 'E' ? c.E : c.P, e.hy.P, e.hy.E));
      if (ab) ab.cdr = Math.max(1, (fk[0] === 'E' ? c.E : c.P).cd || 1) + T.HYBRID.REST;
      return ab;
    }
    return T.ENEMIES[e.type].abilities[key];
  };
  const R = () => T.RULES;
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
