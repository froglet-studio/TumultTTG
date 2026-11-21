/* ============================================================================
   TUMULT v2.0 — ENGINE (pure; no DOM)
   The canonical rules, implemented once:
     • 15-die economy (pool + banked = 15, roll 3, mint, draw, anti-brick valve)
     • 6-column track (duration → cooldown → hand), hasten, freecast
     • P/E grammar: every magnitude is a function (P,E)
     • Verbs: strike/move/force/reveal/hidden/shield/anchor/mark/engine/... (51)
     • Round: intents → hero phase → enemy phase → round end
     • Missions: hold / vault / find / valve / kill, clocks, spawns, hazard spread
     • Invariants: no turn theft (control taxes efficiency, never agency),
       no hard counters (every state has several general answers).
   ========================================================================== */
(function (T) {
  const R = () => T.RULES;

  /* ───────────────────────────── RNG ───────────────────────────── */
  // A random stream is one 32-bit number kept in plain state — holder[key] — and drawing from it
  // advances that number. T.stream is a view on it with the usual helpers; the number is all
  // there is to copy or save. (mulberry32, the generator the game has always used.)
  T.stream = function (holder, key) {
    const rng = function () {
      let a = holder[key] | 0;
      a = (a + 0x6d2b79f5) | 0;
      holder[key] = a;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rng.int = (n) => Math.floor(rng() * n);
    rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
    rng.shuffle = (arr) => {
      const b = arr.slice();
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
      }
      return b;
    };
    return rng;
  };
  /** A stream that stands alone, for generators and tools: T.makeRng(7).pick(list). */
  T.makeRng = (seed) => T.stream({ s: seed >>> 0 || 0x9e3779b9 }, 's');
  /**
   * The seed for one named purpose, derived from another seed. Every stream of a run or a mission
   * gets its own, so what one of them draws never moves another: T.subSeed(seed, 'dice').
   */
  T.subSeed = function (seed, label) {
    let h = (seed >>> 0) ^ 0x811c9dc5;
    for (let i = 0; i < label.length; i++) {
      h ^= label.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  };
  /**
   * A copy of plain data: numbers, strings, booleans, null, arrays and plain objects. A mission is
   * nothing else, so T.clone(mission) is a second mission that plays on exactly as the first would.
   * Anything else is refused, because it would be state the copy could not carry.
   */
  T.clone = function clone(v) {
    if (v === null || typeof v !== 'object') {
      if (typeof v === 'function') throw new Error('T.clone: state holds a function');
      return v;
    }
    if (Array.isArray(v)) {
      const out = new Array(v.length);
      for (let i = 0; i < v.length; i++) out[i] = clone(v[i]);
      return out;
    }
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null)
      throw new Error('T.clone: state holds something that is not plain data');
    const out = {};
    for (const k of Object.keys(v)) out[k] = clone(v[k]);
    return out;
  };
  const num = (x, P, E) => (typeof x === 'function' ? x(P || 0, E || 0) : x == null ? 0 : x);
  const bool = (x, P, E) => !!(typeof x === 'function' ? x(P || 0, E || 0) : x);

  /* ───────────────────────────── BOARD ───────────────────────────── */
  const B = (T.Board = {
    build(board) {
      board.walkAdj = {};
      board.allAdj = {};
      Object.keys(board.nodes).forEach((k) => {
        board.walkAdj[k] = [];
        board.allAdj[k] = [];
      });
      // a big map's water and gaps are never walked (src/data/vehicles.js): their paths are for vehicles only
      const foot = (k) => !board.nodes[k].terrain || T.TERRAIN[board.nodes[k].terrain].foot;
      board.edges.forEach(([a, b]) => {
        if (foot(a) && foot(b)) {
          board.walkAdj[a].push(b);
          board.walkAdj[b].push(a);
        }
        board.allAdj[a].push(b);
        board.allAdj[b].push(a);
      });
      board.climb.forEach(([a, b]) => {
        board.allAdj[a].push(b);
        board.allAdj[b].push(a);
      });
      return board;
    },
    walkNeighbors(board, n, climber) {
      // climb edges act as walk edges once the ramp is down, and always for a climber
      const base = board.walkAdj[n] || [];
      if (!board.ramp && !climber) return base;
      const extra = board.climb.filter((e) => e[0] === n || e[1] === n).map((e) => (e[0] === n ? e[1] : e[0]));
      return base.concat(extra);
    },
    allNeighbors(board, n) {
      return board.allAdj[n] || [];
    },
    adjacent(board, a, b) {
      return a !== b && B.allNeighbors(board, a).includes(b);
    },
    /** In range of a ranged strike: two different nodes that share a zone (in fog, also within its range). */
    los(board, a, b) {
      return a !== b && B.sharesZone(board, a, b) && (!board.fog || B.dist(board, a, b, true) <= board.fog);
    },
    sharesZone(board, a, b) {
      const zb = board.nodes[b].zones;
      return board.nodes[a].zones.some((z) => zb.includes(z));
    },
    dist(board, a, b, useAll) {
      if (a === b) return 0;
      const seen = new Set([a]);
      const q = [[a, 0]];
      while (q.length) {
        const [n, d] = q.shift();
        const ns = useAll ? B.allNeighbors(board, n) : B.walkNeighbors(board, n);
        for (const m of ns) {
          if (m === b) return d + 1;
          if (!seen.has(m)) {
            seen.add(m);
            q.push([m, d + 1]);
          }
        }
      }
      return 99;
    },
    within(board, a, r, useAll) {
      const out = [];
      const seen = new Set([a]);
      const q = [[a, 0]];
      while (q.length) {
        const [n, d] = q.shift();
        if (n !== a) out.push(n);
        if (d >= r) continue;
        const ns = useAll ? B.allNeighbors(board, n) : B.walkNeighbors(board, n);
        for (const m of ns)
          if (!seen.has(m)) {
            seen.add(m);
            q.push([m, d + 1]);
          }
      }
      return out;
    },
    path(board, a, b, blocked, climber) {
      // shortest walk path avoiding blocked nodes (except destination); only a climber's
      // path may cross height nodes before the ramp is down
      if (a === b) return [a];
      const prev = { [a]: null };
      const q = [a];
      while (q.length) {
        const n = q.shift();
        for (const m of B.walkNeighbors(board, n, climber)) {
          if (m in prev) continue;
          if (blocked && blocked.has(m) && m !== b) continue;
          prev[m] = n;
          if (m === b) {
            const p = [b];
            let c = b;
            while (prev[c] !== null) {
              c = prev[c];
              p.unshift(c);
            }
            return p;
          }
          q.push(m);
        }
      }
      return null;
    },
    stepToward(board, from, to, blocked) {
      const p = B.path(board, from, to, blocked);
      return p && p.length > 1 ? p[1] : from;
    },
  });

  /* ───────────────────────────── ENTITIES ───────────────────────────── */
  // Every hero, foe and decoy in a mission has a uid, counted by the mission itself (m.uids):
  // a copied or resumed mission goes on counting where it was, and no two things share one.
  const nextUid = (m) => ++m.uids;
  T.makeHero = function (spec) {
    const h = {
      kind: 'hero',
      uid: null, // given when a mission starts
      id: spec.id,
      name: spec.name,
      title: spec.title || '',
      species: spec.species.slice(),
      cards: spec.cards.slice(),
      reserve: (spec.reserve || []).slice(), // traits it holds but leaves behind this mission (T.loadCard)
      up: {},
      hp: R().VITALITY,
      maxHp: R().VITALITY,
      pos: null,
      pool: R().POOL,
      held: [],
      temp: [],
      track: [],
      states: {},
      gear: [],
      consumables: [],
      downed: false,
      upUnspent: 0,
      bound: {}, // card id → [UP that card alone may use (a trait picked twice), of those spent on it]
      stats: { dmgDealt: 0, dmgTaken: 0, kills: 0 },
      boons: [],
      faces: null,
      // pets (src/data/pets.js): each one's clades, the three traits its card is made of, and that card's id
      pets: (spec.pets || []).map((p) => ({
        id: p.id,
        name: p.name,
        species: p.species.slice(),
        traits: p.traits.slice(),
        card: p.card,
      })),
    };
    T.registerPets([h]);
    spec.cards.concat(h.reserve).forEach((c) => (h.up[c] = [0, 0]));
    if (spec.up)
      Object.keys(spec.up).forEach((c) => {
        if (h.up[c]) h.up[c] = spec.up[c].slice();
      });
    return h;
  };
  T.heroP = (h, cardId) => (h.up[cardId] || [0, 0])[0];
  T.heroE = (h, cardId) => (h.up[cardId] || [0, 0])[1];
  /** A pilot's 15 dice by kind: one die of its element for each awakened card (T.RULES.ELEMENT_DICE), the rest plain. */
  T.diceSet = function (h) {
    const set = [];
    if (R().ELEMENT_DICE)
      for (const cid of h.cards || []) {
        const card = T.CARD[cid];
        if (card && T.DICE[card.el] && T.heroE(h, cid) >= R().ETHEREAL_MIN_E && set.length < R().POOL)
          set.push(card.el);
      }
    while (set.length < R().POOL) set.push('plain');
    return set;
  };
  /** The faces of one of a pilot's dice. A plain die is T.RULES.FACES as the pilot's boons re-face it. */
  T.dieFaces = (h, kind) => (kind && kind !== 'plain' && T.DICE[kind] ? T.DICE[kind].faces : T.heroFaces(h));
  /** The kind of the i-th banked die (a die banked without one, as in older saves, is plain). */
  T.heldKind = (h, i) => (h.heldDie && h.heldDie[i]) || 'plain';
  function bank(h, face, kind) {
    if (!h.heldDie) h.heldDie = [];
    while (h.heldDie.length < h.held.length) h.heldDie.push('plain');
    h.held.push(face);
    h.heldDie.push(kind || 'plain');
  }
  function unbank(h, i) {
    h.held.splice(i, 1);
    if (h.heldDie) h.heldDie.splice(i, 1);
  }
  /** The dice still in the pool, by kind: the pilot's set less the dice banked. */
  T.poolDice = function (h) {
    const left = T.diceSet(h);
    h.held.forEach((_, i) => {
      const j = left.indexOf(T.heldKind(h, i));
      left.splice(j >= 0 ? j : left.lastIndexOf('plain') >= 0 ? left.lastIndexOf('plain') : 0, 1);
    });
    return left;
  };
  T.heroFaces = () => R().FACES.slice();
  // Passives are wired by hook, never by id: the engine asks for the values a hero's gear hangs on a hook and acts
  // on those, so the gear table in src/data/world.js is the whole truth. Gear passives carry what boons did (2.89);
  // a boon on an older save still counts until its migration refunds it.
  T.BOON_HOOKS = [
    'missionStart', // val: { bank: face } — one die already banked as that face
    'roundStart', // val: { round, hasten } — the track slides extra columns as that round starts
    'shieldBonus', // val: added to every Shield the holder gains
    'keen', // val: added to the reach of the holder's reveals; Hidden foes beside them are seen at round start
    'autoRevive', // val: hp the holder rises with, once a mission, instead of going down
    'noPull', // the holder cannot be pulled
    'blinkReach', // val: added to the reach of the holder's blinks
    'spot', // val: as the holder's turn begins, the nearest foe within that many steps is Marked
    'fieldDur', // val: added to the rounds of every Field the holder lays that has rounds
    'fieldForce', // val: added to every push and pull of the holder's Fields
    'weapon', // val: { reach: 'melee' | 'ranged', n } — added to every strike of that reach the holder makes (2.108)
  ];
  T.boonVals = function (h, hook) {
    if (!T.BOON_HOOKS.includes(hook)) throw new Error('unknown passive hook ' + hook);
    const gear = (h.gear || []).map((g) => T.GEAR_BY[g.id] && T.GEAR_BY[g.id].passive);
    const boons = (h.boons || []).map((id) => T.BOON_BY[id]);
    return gear
      .concat(boons)
      .filter((b) => b && b.hook === hook)
      .map((b) => b.val);
  };
  const boonSum = (h, hook) => T.boonVals(h, hook).reduce((sum, v) => sum + v, 0);
  /** A weapon's reach for a strike of this kind: melee is melee; a strike along a line or anywhere is ranged;
   *  an area strike has none, so no weapon adds to it (2.108). */
  T.weaponReach = (kind) => (kind === 'melee' ? 'melee' : kind === 'los' || kind === 'any' ? 'ranged' : null);
  /**
   * How much more a pilot's strike of this kind deals for its weapons (2.108): each weapon of that reach adds its
   * number. The one place a weapon's bonus is read, so any other source of weapons (a vehicle's, say) joins here.
   * A weapon's Overcharge is an Empower on the same strike kinds (src/data/world.js).
   */
  T.weaponBonus = function (h, kind) {
    const reach = T.weaponReach(kind);
    if (!reach || !h || h.kind !== 'hero') return 0;
    return T.boonVals(h, 'weapon')
      .filter((v) => v.reach === reach)
      .reduce((sum, v) => sum + v.n, 0);
  };

  /** Put a new foe on the board. The only way one comes to be: it takes its uid from the mission. */
  /** A foe's vitality: its bestiary value scaled by T.RULES.FOE_HP (percent), rounded. */
  T.foeHp = (hp) => Math.round((hp * (R().FOE_HP || 100)) / 100);
  T.spawnEnemy = function (m, type, tier, pos) {
    const e = makeEnemy(type, tier, pos);
    // a bigger or more seasoned squad meets tougher foes (T.scaleFor): m.foeHp is that, in percent
    if (m.foeHp && m.foeHp !== 100) e.hp = e.maxHp = Math.round((e.maxHp * m.foeHp) / 100);
    e.uid = nextUid(m);
    m.enemies.push(e);
    return e;
  };
  function makeEnemy(type, tier, pos) {
    const d = T.ENEMIES[type];
    const ti = Math.max(0, Math.min(2, tier - 1));
    const e = {
      kind: 'enemy',
      uid: null,
      type,
      name: d.name,
      glyph: d.glyph,
      tier,
      pos,
      speed: d.speed,
      hp: T.foeHp(d.hp[ti]),
      maxHp: T.foeHp(d.hp[ti]),
      shield: d.shield ? d.shield[ti] : 0,
      baseShield: d.shield ? d.shield[ti] : 0,
      states: {},
      intent: null,
      alive: true,
      elite: !!d.elite,
      boss: !!d.boss,
      role: d.role,
      anchoredPerm: !!d.anchored,
      spawnEvery: d.spawnEvery || 0,
      spawnCounter: 0,
      phase: 1,
      ti,
    };
    if (d.hidden) e.states.Hidden = { t: 99, canMove: true };
    if (d.anchored) e.states.Anchored = { t: 99 };
    return e;
  }
  T.enemyAbility = (e, key) => {
    const ab = T.ENEMIES[e.type].abilities[key];
    return ab;
  };
  T.enemyDmg = (e, ab) => (Array.isArray(ab.dmg) ? ab.dmg[e.ti] : ab.dmg || 0);

  /* ───────────────────────────── MISSION SETUP ───────────────────────────── */
  /**
   * A mission is plain data and nothing in it points back at the run: it can be copied (T.clone),
   * saved and resumed. What it needs from the run it takes in here — the squad, the players' purses, the
   * once-a-run Second Wind — and T.applyMissionResult hands the last two back.
   * `seed` names its dice and its opposition; the board in `spec` was drawn before it began.
   */
  T.startMission = function (run, spec, archetype, tier, seed) {
    B.build(spec.board);
    const m = {
      seed,
      rngs: { dice: T.subSeed(seed, 'dice'), foes: T.subSeed(seed, 'foes') },
      uids: 0,
      archetype,
      tier,
      board: spec.board,
      heroes: run.heroes,
      enemies: [],
      decoys: [],
      pets: [],
      dusk: [],
      air: { M: 0, C: 0, S: 0, T: 0, O: 0 },
      fields: [],
      objective: spec.objective,
      clock: spec.clock ? Object.assign({}, spec.clock) : null,
      spawns: spec.spawns || [],
      hazardSpread: spec.hazardSpread ? Object.assign({}, spec.hazardSpread) : null,
      bonus: (spec.bonus || []).map((b) => Object.assign({ achieved: null }, b)),
      round: 0,
      phase: 'setup',
      log: [],
      fx: [],
      over: false,
      won: false,
      lost: false,
      // each player's crystals, and whose purse each hero spends from (src/engine/party.js)
      purses: run.purses.slice(),
      owner: run.heroes.map((h, i) => T.ownerOf(run, i)),
      secondWindUsed: !!run.secondWindUsed,
      stats: { kills: 0, lowHp: false, ambushDmg: 0, hazardDmg: 0, foundRound: null },
      isBoss: !!spec.isBoss,
      page: spec.page || null,
      place: spec.place || { gravity: 'normal', weather: 'calm', wind: 0 },
      title: spec.title,
      eliteKind: spec.eliteKind || null,
      spawnedCount: 0,
    };
    if (spec.foeHp && spec.foeHp !== 100) m.foeHp = spec.foeHp; // only when it scales: a two-pilot save is unchanged
    m.heroes.forEach((h) => (h.uid = nextUid(m)));
    spec.enemies.forEach((en) => T.spawnEnemy(m, en.type, tier, en.node));
    m.heroes.forEach((h, i) => {
      h.pos = spec.starts[i % spec.starts.length];
      h.downed = false;
      h.hp = Math.max(1, h.hp);
      h.states = {};
      h.temp = [];
      h.track = [];
      h.held = [];
      h.heldDie = [];
      h.pool = R().POOL;
      h.rested = false;
      h.carrying = 0;
      delete h.ride;
      h.gear.forEach((g) => (g.cds = [0, 0]));
      h.roundFlags = { struck: false };
      for (const v of T.boonVals(h, 'missionStart'))
        if (v.bank) {
          h.pool -= 1;
          bank(h, v.bank, 'plain');
        }
    });
    // each pilot's pets set out on its own node with it (src/data/pets.js)
    T.registerPets(m.heroes);
    // a pet sets out only when its card flies this mission; with its card in reserve it stays in the pocket
    m.heroes.forEach((h) => (h.pets || []).forEach((pr) => h.cards.includes(pr.card) && T.addPet(m, h, pr)));
    if (run.bossBonusHp && m.isBoss)
      m.enemies
        .filter((e) => e.boss)
        .forEach((e) => {
          e.hp += run.bossBonusHp;
          e.maxHp += run.bossBonusHp;
        });
    if (spec.vehicles) T.setupVehicles(m, spec.vehicles);
    m.log.push({ r: 0, who: 'dm', text: spec.blurb });
    m.board.fog = m.place.weather === 'fog' ? T.FOG_RANGE : 0;
    for (const t of T.placeRules(m)) m.log.push({ r: 0, who: 'sys', text: t });
    T.beginRound(m);
    return m;
  };

  /* ───────────────────────────── LOG / FX ───────────────────────────── */
  const say = (m, text, who) => m.log.push({ r: m.round, who: who || 'dm', text });
  const fx = (m, o) => m.fx.push(o);
  T.say = say;
  T.fx = fx;
  /**
   * A player's line of story for a turn (the box beside End turn): kept in the mission's log as
   * { r, who: 'note', hero, text }, one per hero a round (a new one replaces it; an empty one takes it
   * back). It changes nothing in play. It goes on to the run's history and the chronicle.
   */
  T.NOTE_MAX = 200;
  T.addNote = function (m, i, text) {
    if (!m.heroes[i]) return { ok: false, why: 'no such hero' };
    const clean = String(text == null ? '' : text)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, T.NOTE_MAX);
    const at = m.log.findIndex((l) => l.who === 'note' && l.hero === i && l.r === m.round);
    if (at >= 0) m.log.splice(at, 1);
    if (clean) m.log.push({ r: m.round, who: 'note', hero: i, text: clean });
    return { ok: true };
  };
  /** The players' lines of story in a mission, in the order written: [{ r, hero, text }]. */
  T.notesOf = (m) => m.log.filter((l) => l.who === 'note').map((l) => ({ r: l.r, hero: l.hero, text: l.text }));

  /* ───────────────────────────── DICE ───────────────────────────── */
  /**
   * What a pilot rolls (2.83; Garrett, 2026-11-21: "instead of picking your dice it should be 3 ap dice and 1
   * element of your choice"). Each turn ROLL dice come out of the pool: ROLL_EL of them element dice, the kind
   * the player chose (`h.rollPick`, one kind from the pilot's own element dice: a d8 of an awakened card's
   * element, or Omni Core's ethereal d12), and the rest plain d20s, the AP dice. The choice stays from roll to
   * roll until changed. With nothing chosen, or none of that kind left in the pool, the element die is the kind
   * the pool holds most of (the first such in the pilot's set); with no element die in the pool it is plain, and
   * with too few plain dice the rest are the element dice the pool holds most of. No die is ever drawn at random
   * (2.101): a hand in the bag feels a d20 from a d8. Choosing a die never chooses its face.
   */
  T.setRollPick = function (h, kinds) {
    const set = T.diceSet(h);
    const pick = [];
    for (const k of Array.isArray(kinds) ? kinds : [kinds]) {
      if (pick.length >= R().ROLL_EL) break;
      if (k === 'plain' || !set.includes(k) || pick.includes(k)) continue; // not one of this pilot's element dice
      pick.push(k);
    }
    if (pick.length) h.rollPick = pick;
    else delete h.rollPick;
    return { ok: true, pick };
  };
  /** The element dice the pilot's next roll takes, as kinds: its choice where the pool still holds it. */
  T.rollPickNow = function (h) {
    const left = T.poolDice(h);
    const out = [];
    const want = (h.rollPick || []).filter((k) => k !== 'plain');
    for (let n = 0; n < R().ROLL_EL; n++) {
      let k = want.find((x) => left.includes(x));
      if (!k) {
        // the kind the pool holds most of, the first such in the pilot's set
        let best = 0;
        for (const x of T.diceSet(h)) {
          const c = left.filter((y) => y === x).length;
          if (x !== 'plain' && c > best) ((best = c), (k = x));
        }
      }
      if (!k) break;
      out.push(left.splice(left.indexOf(k), 1)[0]);
      want.splice(want.indexOf(k), 1);
    }
    return out;
  };
  T.rollDice = function (m, h) {
    // ROLL dice from the pool: ROLL_EL element dice as the player chose (T.rollPickNow), the rest plain, each rolled.
    const k = Math.min(R().ROLL, h.pool);
    const dice = T.stream(m.rngs, 'dice');
    const left = T.poolDice(h);
    const take = T.rollPickNow(h).slice(0, k);
    while (take.length < k && left.filter((x) => x === 'plain').length > take.filter((x) => x === 'plain').length)
      take.push('plain');
    // too few plain dice: the rest are element dice taken by hand, never at random (2.101): the kind the pool
    // still holds most of, the first such in the pilot's set
    while (take.length < k) {
      const rest = left.slice();
      take.forEach((x) => rest.splice(rest.indexOf(x), 1));
      let best = null;
      let most = 0;
      for (const x of T.diceSet(h)) {
        const c = rest.filter((y) => y === x).length;
        if (c > most) ((most = c), (best = x));
      }
      if (!best) break;
      take.push(best);
    }
    const out = [];
    const kinds = [];
    const at = [];
    for (let i = 0; i < k; i++) {
      const j = left.indexOf(take[i]);
      const kind = left.splice(j, 1)[0];
      const f = dice.pick(T.dieFaces(h, kind));
      out.push(f);
      kinds.push(kind);
      at.push(h.held.length);
      bank(h, f, kind);
    }
    h.pool -= k;
    if (h.pool + h.held.length !== R().POOL) throw new Error('dice invariant broken for ' + h.name);
    // which dice were rolled, and where they were banked, so the screen can roll them (feel.js)
    fx(m, { t: 'roll', hero: h.uid, faces: out, kinds, at });
    return out;
  };
  /**
   * Roll the next round's dice now, at the end of this pilot's player's turn (2.81; Garrett, 2026-11-20), so
   * the player can plan them while the others play. They are banked at once and the round's start rolls no
   * more for this pilot (h.rolledAhead, cleared as the round begins). Only when players take turns.
   */
  T.rollAhead = function (m, h) {
    if (!h || h.downed || h.rolledAhead) return;
    T.rollDice(m, h);
    h.rolledAhead = true;
  };
  T.apValue = (h) => h.held.concat(h.temp).reduce((s, f) => s + (f === 'AP' ? 1 : f === 'AP2' ? 2 : 0), 0);
  T.elCount = (h, kind) => h.held.concat(h.temp).filter((f) => f === kind).length;
  T.omniCount = (h) => h.held.concat(h.temp).filter((f) => f === 'O').length;
  T.canPay = function (h, ap, elt, eln) {
    if (T.apValue(h) < (ap || 0)) return false;
    if (eln && elt) {
      // an Omni cost (a gear card's face, 2.119) is paid in Omni alone, counted once
      if ((elt === 'O' ? 0 : T.elCount(h, elt)) + T.omniCount(h) < eln) return false;
    }
    return true;
  };
  function removeFace(h, face) {
    let i = h.temp.indexOf(face);
    if (i >= 0) {
      h.temp.splice(i, 1);
      return true;
    }
    i = h.held.indexOf(face);
    if (i >= 0) {
      unbank(h, i);
      h.pool++;
      return true;
    }
    return false;
  }
  T.pay = function (h, ap, elt, eln) {
    // etherion first (exact face, then omni)
    for (let i = 0; i < (eln || 0); i++) {
      if (!removeFace(h, elt)) removeFace(h, 'O');
    }
    let need = ap || 0;
    while (need > 0) {
      if (removeFace(h, 'AP')) {
        need -= 1;
        continue;
      }
      if (removeFace(h, 'AP2')) {
        need -= 2;
        continue;
      }
      break; // should not happen if canPay was checked
    }
    if (h.pool + h.held.length !== R().POOL) throw new Error('dice invariant broken (pay) for ' + h.name);
  };
  T.mint = (h, face, n) => {
    for (let i = 0; i < n; i++) h.temp.push(face);
  };
  /**
   * The die a pilot takes from the pool to Draw a face (2.101; Garrett, 2026-11-21: "grabbing a specific die is
   * great, but not a random one"): a die is picked by hand, never at random. The plain d20 first (it has every
   * face), then the element die that shows that face most, then any die that shows it; null if none can.
   */
  T.drawKind = function (h, face) {
    const left = T.poolDice(h);
    let best = null;
    let most = 0;
    for (const k of ['plain'].concat(left.filter((x, i) => x !== 'plain' && left.indexOf(x) === i))) {
      if (!left.includes(k)) continue;
      const c = T.dieFaces(h, k).filter((x) => x === face).length;
      if (k === 'plain' && c > 0) return k;
      if (c > most) ((most = c), (best = k));
    }
    return best;
  };
  /** Draw N: take N dice of your choice from the pool and bank them showing that face (T.drawKind). */
  T.draw = (h, face, n) => {
    let got = 0;
    for (let i = 0; i < n && h.pool > 0; i++) {
      const kind = T.drawKind(h, face);
      if (!kind) break;
      h.pool--;
      bank(h, face, kind);
      got++;
    }
    return got;
  };
  T.valve = function (m, h) {
    // anti-brick: one of each M,C,S,T → one Omni (3 dice return to pool)
    const idx = ['M', 'C', 'S', 'T'].map((f) => h.held.indexOf(f));
    if (idx.some((i) => i < 0)) return false;
    ['M', 'C', 'S', 'T'].forEach((f) => {
      unbank(h, h.held.indexOf(f));
      h.pool++;
    });
    h.pool--;
    bank(h, 'O', T.drawKind(h, 'O') || 'plain');
    say(m, `${h.name} folds one of each etherion into an Omni.`, 'sys');
    return true;
  };
  T.dump = function (m, h, idx) {
    if (idx < 0 || idx >= h.held.length) return false;
    unbank(h, idx);
    h.pool++;
    return true;
  };
  T.rerollHeld = function (m, h, indices) {
    const dice = T.stream(m.rngs, 'dice');
    indices.forEach((i) => {
      if (i >= 0 && i < h.held.length) h.held[i] = dice.pick(T.dieFaces(h, T.heldKind(h, i)));
    });
    const at = indices.filter((i) => i >= 0 && i < h.held.length);
    fx(m, { t: 'roll', hero: h.uid, faces: at.map((i) => h.held[i]), kinds: at.map((i) => T.heldKind(h, i)), at });
  };

  /* ───────────────────────────── TRACK ───────────────────────────── */
  T.inHand = (h, cardId) => h.cards.includes(cardId) && !h.track.some((t) => t.card === cardId);
  T.commit = function (h, cardId, dur, cd, note) {
    const grants = h.states.Freecast;
    if (grants && grants.length) {
      // several offers may be waiting: spend the one that runs out soonest
      const left = (g) => (g.t == null ? Infinity : g.t);
      const g = grants.reduce((a, b) => (left(b) < left(a) ? b : a));
      if (--g.n <= 0) grants.splice(grants.indexOf(g), 1);
      if (!grants.length) delete h.states.Freecast;
      return 'free';
    }
    if (dur > 0) h.track.push({ card: cardId, phase: 'dur', left: dur, cd, note: note || '' });
    else if (cd > 0) h.track.push({ card: cardId, phase: 'cd', left: cd, cd: 0, note: 'cooling' });
    return 'committed';
  };
  T.slideTrack = function (h, n) {
    n = n || 1;
    for (let k = 0; k < n; k++) {
      const keep = [];
      for (const t of h.track) {
        t.left -= 1;
        if (t.left <= 0) {
          if (t.phase === 'dur' && t.cd > 0) {
            t.phase = 'cd';
            t.left = t.cd;
            t.cd = 0;
            t.note = 'cooling';
            keep.push(t);
          }
        } else keep.push(t);
      }
      h.track = keep;
    }
  };
  T.hasten = (h, n) => T.slideTrack(h, n);

  /* ───────────────────────────── STATE HELPERS ───────────────────────────── */
  const st = (ent) => ent.states;
  function addShield(m, ent, v, t, all) {
    if (ent.kind === 'hero') v += boonSum(ent, 'shieldBonus');
    const s = st(ent).Shield;
    if (!s || v > s.v || (v === s.v && t > s.t))
      st(ent).Shield = { v, t: Math.max(t, s ? s.t : 0), all: !!(all || (s && s.all)) };
    else {
      s.t = Math.max(s.t, t);
      s.all = s.all || !!all;
    }
    fx(m, { t: 'state', ent: ent.uid, name: 'Shield' });
  }
  function setHidden(m, ent, t, canMove) {
    const s = st(ent).Hidden;
    st(ent).Hidden = { t: Math.max(t, s ? s.t : 0), canMove: !!(canMove || (s && s.canMove)) };
    fx(m, { t: 'state', ent: ent.uid, name: 'Hidden' });
  }
  function breakHidden(m, ent, why) {
    if (st(ent).Hidden) {
      delete st(ent).Hidden;
      say(m, `${ent.name} is revealed${why ? ' (' + why + ')' : ''}.`);
      fx(m, { t: 'reveal', ent: ent.uid });
    }
  }
  function isHidden(ent) {
    return !!st(ent).Hidden;
  }
  function isAnchored(ent) {
    return !!(st(ent).Anchored || ent.anchoredPerm);
  }
  function forceImmune(ent) {
    // a vehicle's riders go where it goes, and nowhere else (src/engine/vehicles.js)
    return isAnchored(ent) || !!st(ent).Hover || !!st(ent).Weightless || ent.ride != null;
  }
  function hazardImmune(ent) {
    return !!(st(ent).HazardImmune || st(ent).Hover || st(ent).Weightless || st(ent).Stasis);
  }
  function trapImmune(ent) {
    return !!(st(ent).Hover || st(ent).Weightless);
  }
  /** Hovering heroes and climbing forms walk the climb edges up to height nodes (Weightless: an older save's Hover). */
  function canClimb(ent) {
    return !!(st(ent).Hover || st(ent).Weightless || (st(ent).Morph && st(ent).Morph.climb));
  }
  function addTimed(m, ent, name, t, extra) {
    const cur = st(ent)[name];
    st(ent)[name] = Object.assign({}, cur || {}, extra || {}, { t: Math.max(t, cur ? cur.t : 0) });
    fx(m, { t: 'state', ent: ent.uid, name });
  }
  function weaken(m, ent, v, t) {
    if (st(ent).StatusImmune) return;
    const cur = st(ent).Weak;
    st(ent).Weak = { v: Math.max(v, cur ? cur.v : 0), t: Math.max(t, cur ? cur.t : 0) };
    fx(m, { t: 'state', ent: ent.uid, name: 'Weak' });
  }
  /**
   * Anchor a unit (2.91: one keyword for anchor, held, rooted, slow and no-teleport): nothing moves it, its own
   * walking and blinking included, and it still acts. Status immunity turns away an anchor put on a hero by a foe,
   * not one the squad chose (`chosen`).
   */
  function anchorEnt(m, ent, t, chosen) {
    if (st(ent).StatusImmune && ent.kind === 'hero' && !chosen) return;
    const cur = st(ent).Anchored;
    st(ent).Anchored = { t: Math.max(t, cur ? cur.t : 0) };
    fx(m, { t: 'state', ent: ent.uid, name: 'Anchored' });
  }
  T.anchorEnt = anchorEnt;
  T.isHidden = isHidden;
  T.isAnchored = isAnchored;

  /* ───────────────────────────── OCCUPANCY ───────────────────────────── */
  T.entityAt = function (m, node) {
    for (const h of m.heroes) if (!h.downed && h.pos === node) return h;
    for (const e of m.enemies) if (e.alive && e.pos === node) return e;
    for (const d of m.decoys) if (d.pos === node) return d;
    for (const p of m.pets || []) if (!p.dead && p.pos === node) return p;
    return null;
  };
  /* ───────────────────────────── PETS ───────────────────────────── */
  /** A pilot's pet joins the mission on the pilot's own node (a pet may share it: Garrett, 2026-11-21). */
  T.addPet = function (m, h, rec) {
    const p = {
      kind: 'pet',
      uid: nextUid(m),
      owner: h.uid,
      pid: rec.id,
      species: rec.species.slice(),
      name: rec.name,
      hp: T.PET.HP,
      maxHp: T.PET.HP,
      pos: h.pos,
      states: {},
      dead: false,
    };
    m.pets.push(p);
    return p;
  };
  T.livePets = (m) => (m.pets || []).filter((p) => !p.dead);
  /**
   * Resonance (2.118): elements in the air. Playing an Ethereal face leaves its element there, strong
   * (2) this round and fading (1) the next, then gone. A face that draws on an element takes it for a
   * bonus and spends it; Omni in the air stands in for any element. The squad shares the air.
   */
  T.AIR_ELS = ['M', 'C', 'S', 'T', 'O'];
  T.leaveInAir = function (m, el) {
    m.air = m.air || { M: 0, C: 0, S: 0, T: 0, O: 0 };
    m.air[el] = 2;
    say(m, `${T.ETHERIONS[el].name} hangs in the air.`, 'sys');
  };
  /** What the air holds of `el` (its own, else Omni), or null. */
  T.inAir = (m, el) => (m.air && m.air[el] > 0 ? el : m.air && m.air.O > 0 ? 'O' : null);
  /** Draw on `el` for this play: spend it (or Omni) once, however many effects of the face ask for it. */
  function drawAir(m, el, ctx) {
    ctx.drewAir = ctx.drewAir || {};
    if (ctx.drewAir[el]) return true;
    const got = T.inAir(m, el);
    if (!got) return false;
    m.air[got] = 0;
    ctx.drewAir[el] = got;
    say(m, `It draws on the ${T.ETHERIONS[got].name} in the air.`, 'sys');
    return true;
  }
  /**
   * Flanked (2.115): a unit with units of the other side on two different spaces beside it. For a foe,
   * the other side is the squad: pilots standing, their pets and their decoys. For a pilot, it is foes.
   */
  T.isFlanked = function (m, u) {
    if (!u || u.pos == null) return false;
    const others = u.kind === 'enemy' ? T.liveHeroes(m).concat(T.livePets(m), m.decoys || []) : T.liveEnemies(m);
    const spaces = new Set();
    for (const o of others)
      if (o.pos != null && o.pos !== u.pos && B.adjacent(m.board, u.pos, o.pos)) spaces.add(o.pos);
    return spaces.size >= 2;
  };
  T.petsOf = (m, h) => (m.pets || []).filter((p) => p.owner === h.uid && !p.dead);
  T.petOwner = (m, p) => m.heroes.find((h) => h.uid === p.owner) || null;
  /** The pet a pet card plays off, or null if that pet is not (or no longer) with its pilot. */
  /** Is this card one of the hero's pets' cards (whether or not that pet is on the board)? */
  T.petRecOf = (h, cardId) => (h.pets || []).find((p) => p.card === cardId) || null;
  T.isPetCard = (h, cardId) => !!T.petRecOf(h, cardId);
  T.petFor = (m, h, cardId) => {
    const rec = T.petRecOf(h, cardId);
    return rec ? T.petsOf(m, h).find((p) => p.pid === rec.id) || null : null;
  };
  /** A pet on its own pilot's node, the pilot standing, is invulnerable (Garrett, 2026-11-21). */
  T.sheltered = (m, p) => {
    if (p.kind !== 'pet' || p.dead) return false;
    const o = T.petOwner(m, p);
    return !!(o && !o.downed && o.pos === p.pos);
  };
  /** Pets a foe can go for: alive, and not sheltered on their pilot's node. */
  T.exposedPets = (m) => T.livePets(m).filter((p) => !T.sheltered(m, p));
  /** Pilot and pet are partners: one may stand on the other's node. */
  const partners = (a, b) =>
    (a.kind === 'pet' && b.kind === 'hero' && a.owner === b.uid) ||
    (b.kind === 'pet' && a.kind === 'hero' && b.owner === a.uid);
  /** Everything standing on a node. */
  T.unitsAt = (m, node) =>
    []
      .concat(
        m.heroes.filter((h) => !h.downed && h.pos === node),
        m.enemies.filter((e) => e.alive && e.pos === node),
        m.decoys.filter((d) => d.pos === node),
      )
      .concat(T.livePets(m).filter((p) => p.pos === node));
  /**
   * Can this unit stop on this node? Empty, or holding only its partners: a pilot's own pets, or a pet's own
   * pilot (and that pilot's other pets).
   */
  T.freeFor = (m, ent, node) =>
    !(m.vehicles && T.vehicleAt(m, node)) &&
    T.unitsAt(m, node).every(
      (u) => u === ent || partners(ent, u) || (ent.kind === 'pet' && u.kind === 'pet' && u.owner === ent.owner),
    );
  // a parked vehicle stands on its space too: nobody stops there, though anyone may pass
  T.occupied = (m, node) => !!T.entityAt(m, node) || !!(m.vehicles && m.vehicles.some((v) => v.pos === node));
  T.liveEnemies = (m) => m.enemies.filter((e) => e.alive);
  T.liveHeroes = (m) => m.heroes.filter((h) => !h.downed);
  T.foesFor = (m, actor) =>
    actor.kind === 'hero' || actor.kind === 'pet'
      ? T.liveEnemies(m)
      : T.liveHeroes(m).concat(m.decoys, T.exposedPets(m));
  /**
   * "Your ally": with two pilots, the other one. With more, the nearest ally standing (the first in squad order
   * on a tie), or if none stands, the nearest one down, so a face that reaches "your ally" reaches the
   * one a player at the table would point to.
   */
  const byNearness = (m, h, list) =>
    list
      .map((x, k) => ({ x, d: B.dist(m.board, h.pos, x.pos), k }))
      .sort((a, b) => a.d - b.d || a.k - b.k)
      .map((o) => o.x);
  T.allyOf = function (m, h) {
    const others = m.heroes.filter((x) => x !== h);
    if (others.length < 2) return others[0];
    return (
      byNearness(
        m,
        h,
        others.filter((x) => !x.downed),
      )[0] || byNearness(m, h, others)[0]
    );
  };
  /** Every other pilot, nearest first (squad order on a tie). */
  T.alliesOf = (m, h) =>
    byNearness(
      m,
      h,
      m.heroes.filter((x) => x !== h),
    );
  /**
   * The ally a face reaches. With three or more pilots the player picks one (ctx.ally, a uid) among the
   * allies the face can reach (T.targetsFor lists them); without a pick, T.allyOf.
   */
  T.chosenAlly = function (m, h, ctx) {
    const pick = ctx && ctx.ally != null ? m.heroes.find((x) => x.uid === ctx.ally && x !== h) : null;
    return pick || T.allyOf(m, h);
  };
  /** The ally a Rally or a revive reaches: with two pilots the other one; with more, the nearest one down. */
  T.downedAllyOf = function (m, h) {
    const others = m.heroes.filter((x) => x !== h);
    if (others.length < 2) return others[0];
    return (
      byNearness(
        m,
        h,
        others.filter((x) => x.downed),
      )[0] || T.allyOf(m, h)
    );
  };

  /* ───────────────────────────── DAMAGE PIPELINE ───────────────────────────── */
  // opts: {kind:'melee'|'los'|'area'|'true'|'any', pierce, trueDmg, ambush, source, label, noReveal, strike}
  // strike: this is a hero's strike (the strike verb). Only a strike spends or gains what cards
  // call strike bonuses; a snare, a zone, corrosion or a decoy's blow is not one.
  T.damage = function (m, source, target, amount, opts) {
    opts = opts || {};
    const kind = opts.kind || 'melee';
    if (!target || (amount <= 0 && !opts.forceZero)) return 0;
    if (target.kind === 'decoy') {
      target.hp -= amount;
      fx(m, { t: 'dmg', ent: target.uid, amount, pos: target.pos });
      say(m, `${source ? source.name : 'Something'} strikes a ${target.name} for ${amount}.`);
      if (target.hp <= 0) {
        m.decoys = m.decoys.filter((d) => d !== target);
        say(m, `The ${target.name} collapses.`);
      }
      return amount;
    }
    if (target.kind === 'pet' && T.sheltered(m, target)) {
      say(m, `${target.name} is safe beside ${T.petOwner(m, target).name}: the blow finds nothing.`);
      return 0;
    }
    const ts = st(target);
    if (ts.Stasis) {
      say(m, `${target.name} is outside time — the blow passes through nothing.`);
      return 0;
    }
    if (isHidden(target) && kind === 'los' && !(source && source.kind === 'hero' && ts.Located)) {
      say(m, `${source ? source.name : 'The shot'} strikes a chromatic afterimage — ${target.name} is Hidden.`);
      fx(m, { t: 'miss', ent: target.uid });
      return 0;
    }
    let dmg = amount;
    let pierce = !!opts.pierce;
    const trueDmg = !!opts.trueDmg;
    // attacker modifiers (heroes, and pets, who strike for their pilot)
    if (source && (source.kind === 'hero' || source.kind === 'pet')) {
      const ss = st(source);
      if (opts.strike && ss.Empower && ss.Empower.length) {
        // consume the first matching empower
        const idx = ss.Empower.findIndex(
          (e) => !e.kind || e.kind === kind || (Array.isArray(e.kind) && e.kind.includes(kind)),
        );
        if (idx >= 0) {
          const e = ss.Empower[idx];
          dmg += e.v;
          if (e.pierce) pierce = true;
          e.uses -= 1;
          if (e.uses <= 0) ss.Empower.splice(idx, 1);
          if (!ss.Empower.length) delete ss.Empower;
        }
      }
      if (opts.strike && ss.Morph) dmg += ss.Morph.bonus || 0;
      // a weapon adds to every strike of its reach (2.108); a strike that deals nothing stays at nothing
      if (opts.strike && dmg > 0) dmg += T.weaponBonus(source, kind);
      if (opts.strike) {
        const flags = source.roundFlags || (source.roundFlags = {});
        flags.struck = true;
      }
      // Mark (2.92): the next hit on it deals `next` more (Pierce if `pierce`), and every hit `each` more while it lasts
      if (ts.Marked) {
        const mk = ts.Marked;
        dmg += (mk.next || 0) + (mk.each || 0);
        if (mk.next) {
          if (mk.pierce) pierce = true;
          delete mk.next;
          delete mk.pierce;
        }
        if (!mk.each) delete ts.Marked;
      }
      if (ss.Weak) dmg = Math.max(0, dmg - ss.Weak.v);
    } else if (source && source.kind === 'enemy') {
      if (st(source).Weak) dmg = Math.max(0, dmg - st(source).Weak.v);
    }
    // shield
    if (!pierce && !trueDmg) {
      let sv = 0;
      let applies = true;
      if (ts.Shield) {
        sv = ts.Shield.v;
        applies = ts.Shield.all || kind !== 'area';
      }
      if (target.kind === 'enemy' && target.shield > 0) {
        sv = Math.max(sv, target.shield);
        applies = applies || kind !== 'area';
        if (kind === 'area') applies = !!(ts.Shield && ts.Shield.all);
        if (target.boss || target.type === 'warden') applies = true;
      }
      if (sv > 0 && applies) {
        const before = dmg;
        dmg = Math.max(0, dmg - sv);
        if (before !== dmg) fx(m, { t: 'shielded', ent: target.uid, blocked: before - dmg });
      }
    }
    // preempt
    if (ts.Preempt && dmg > 0) {
      const p = ts.Preempt;
      dmg = Math.max(0, dmg - p.v);
      if (p.reflect && source && source.kind === 'enemy') {
        source.hp -= p.reflect;
        fx(m, { t: 'dmg', ent: source.uid, amount: p.reflect, pos: source.pos });
        say(m, `${target.name} pre-empted the blow and reflects ${p.reflect}.`);
        checkEnemyDeath(m, source, target);
      }
      if (p.reposition && target.kind === 'hero' && target.ride == null) {
        const away = B.walkNeighbors(m.board, target.pos)
          .filter((n) => !T.occupied(m, n))
          .sort((a, b) => B.dist(m.board, b, source ? source.pos : a) - B.dist(m.board, a, source ? source.pos : b))[0];
        if (away) {
          target.pos = away;
          fx(m, { t: 'move', ent: target.uid, to: away });
        }
      }
      delete ts.Preempt;
    }
    // a blow on anyone inside a vehicle lands on its hull (src/engine/vehicles.js)
    const hull = dmg > 0 && target.kind === 'hero' && target.ride != null ? T.vehicleOf(m, target) : null;
    if (dmg > 0) {
      if (!hull) target.hp -= dmg;
      // `by`: who struck, for the screen to show the blow coming from them (no rule reads it)
      const hit = { t: 'dmg', ent: target.uid, amount: dmg, pos: target.pos, kind };
      if (source && source.uid != null && kind !== 'area' && kind !== 'true') hit.by = source.uid;
      fx(m, hit);
      if (source && source.kind === 'hero') source.stats.dmgDealt += dmg;
      else if (source && source.kind === 'pet') {
        const o = T.petOwner(m, source);
        if (o) o.stats.dmgDealt += dmg;
      }
      if (target.kind === 'hero') {
        target.stats.dmgTaken += dmg;
        if (opts.ambush) m.stats.ambushDmg += dmg;
        if (target.hp <= target.maxHp / 2) m.stats.lowHp = true;
      }
      say(
        m,
        `${source ? source.name : 'The hazard'} ${opts.label || 'hits'} ${target.name}${hull ? `'s ${T.VEHICLE_BY[hull.type].name}` : ''} for ${dmg}${pierce ? ' (pierce)' : ''}${trueDmg ? ' (true)' : ''}.`,
        source && (source.kind === 'hero' || source.kind === 'pet') ? 'hero' : 'enemy',
      );
      if (hull) T.hitHull(m, hull, dmg);
    } else {
      say(m, `${source ? source.name : 'The blow'} is fully blunted by ${target.name}.`);
    }
    // link: the other unit takes the same
    if (dmg > 0 && !opts.linked) {
      const o = linkedTo(m, target);
      if (o)
        T.damage(m, source, o, dmg, {
          kind: 'true',
          trueDmg: true,
          linked: true,
          label: 'reaches through the Link to',
        });
    }
    // Thorns (2.93: Counter folded in): a melee striker takes `v`, and the next one `next` more (and a push)
    if (kind === 'melee' && ts.Thorns && source && source.kind === 'enemy') {
      const th = ts.Thorns;
      const n = (th.v || 0) + (th.next || 0);
      if (n > 0) {
        source.hp -= n;
        fx(m, { t: 'dmg', ent: source.uid, amount: n, pos: source.pos });
        say(m, `${source.name} is turned back by ${target.name}'s Thorns for ${n}.`);
      }
      if (th.next) {
        if (th.push && source.alive && source.hp > 0) pushAway(m, target, source, th.push);
        delete th.next;
        delete th.push;
        if (!th.v) delete ts.Thorns;
      }
      checkEnemyDeath(m, source, target);
    }
    // contact / area reveals
    if (isHidden(target) && (kind === 'melee' || kind === 'area' || kind === 'any') && !opts.noReveal)
      breakHidden(m, target, 'contact');
    if (source && (source.kind === 'hero' || source.kind === 'pet') && isHidden(source))
      breakHidden(m, source, 'striking');
    // death
    if (target.kind === 'enemy')
      checkEnemyDeath(m, target, source && source.kind === 'pet' ? T.petOwner(m, source) : source);
    else if (target.kind === 'hero') checkHeroDown(m, target);
    else if (target.kind === 'pet') checkPetDeath(m, target);
    return dmg;
  };
  function checkEnemyDeath(m, e, killer) {
    if (!e.alive || e.hp > 0) return;
    e.alive = false;
    m.stats.kills++;
    if (killer && killer.kind === 'hero') killer.stats.kills++;
    say(m, `${e.name} is destroyed.`, 'sys');
    fx(m, { t: 'death', ent: e.uid, pos: e.pos });
    if (e.boss) {
      m.won = true;
    }
  }
  /** A pet at 0 dies: it leaves the board, and after the mission its pilot loses it and its cards. */
  function checkPetDeath(m, p) {
    if (p.dead || p.hp > 0) return;
    p.dead = true;
    p.hp = 0;
    say(m, `${p.name} dies.`, 'sys');
    fx(m, { t: 'death', ent: p.uid, pos: p.pos });
  }
  T.checkPetDeath = checkPetDeath;
  function checkHeroDown(m, h) {
    if (h.downed || h.hp > 0) return;
    const ph = h.states.Phoenix;
    if (ph) {
      h.hp = ph.hp;
      delete h.states.Phoenix;
      say(m, `${h.name}'s held Heal lands: up again with ${h.hp}!`, 'sys');
      fx(m, { t: 'revive', ent: h.uid });
      return;
    }
    const [rise] = T.boonVals(h, 'autoRevive');
    if (rise && !m.secondWindUsed) {
      m.secondWindUsed = true;
      h.hp = rise;
      say(m, `A second wind — ${h.name} rises again with ${rise}.`, 'sys');
      fx(m, { t: 'revive', ent: h.uid });
      return;
    }
    h.hp = 0;
    h.downed = true;
    if (h.carrying) {
      // the crate falls where they fell, if there is room for it
      h.carrying = 0;
      if (!m.board.nodes[h.pos].objective) {
        m.board.nodes[h.pos].objective = { kind: 'crate' };
        say(m, `${h.name} drops the crate.`, 'sys');
      } else say(m, `${h.name}'s crate is lost.`, 'sys');
    }
    h.states = {};
    h.temp = [];
    say(m, `${h.name} is DOWN. An adjacent ally can Rally them (2 AP).`, 'sys');
    fx(m, { t: 'down', ent: h.uid });
  }

  /* ───────────────────────────── FORCE ───────────────────────────── */
  function canEnter(m, ent, node, allowHeight) {
    const nd = m.board.nodes[node];
    if (!nd) return false;
    if (nd.height && !allowHeight) return false;
    return !T.occupied(m, node);
  }
  /** Gravity: light carries a shove or pull 1 space further; heavy makes every space of it hurt. */
  const gravityOf = (m) => (m.place && m.place.gravity) || 'normal';
  function landed(m, source, target, moved) {
    if (moved && gravityOf(m) === 'heavy' && target.alive !== false && !target.downed) {
      say(m, `${target.name} slams down under the weight.`);
      T.damage(m, source && source.kind === 'hero' ? source : null, target, moved, {
        kind: 'true',
        trueDmg: true,
        label: 'slams down for',
      });
    }
    return moved;
  }
  function pushAway(m, source, target, n, viaLink) {
    if (!viaLink) {
      const o = linkedTo(m, target);
      if (o) {
        const r = pushAway(m, source, target, n, true);
        if (standing(o)) pushAway(m, source, o, n, true);
        return r;
      }
    }
    if (forceImmune(target)) {
      say(m, `${target.name} holds fast.`);
      return 0;
    }
    if (gravityOf(m) === 'light') n += 1;
    let moved = 0;
    for (let i = 0; i < n; i++) {
      const cands = B.walkNeighbors(m.board, target.pos).filter((x) => canEnter(m, target, x, false));
      const best = cands.sort((a, b) => B.dist(m.board, b, source.pos, true) - B.dist(m.board, a, source.pos, true))[0];
      if (best == null || B.dist(m.board, best, source.pos, true) <= B.dist(m.board, target.pos, source.pos, true)) {
        crash(m, source, target);
        break;
      }
      moveEntity(m, target, best, 'forced');
      moved++;
    }
    return landed(m, source, target, moved);
  }
  /**
   * Crash (2.104): a unit pushed by one in a crashing form (Apex Form's `crash`) that is stopped short takes
   * the crash, and so does the unit in the way: the one beside it farthest from the pusher.
   */
  function crash(m, source, target) {
    const c = source && st(source).Morph && st(source).Morph.crash;
    if (!c || !standing(target)) return;
    const far = (x) => B.dist(m.board, x, source.pos, true);
    const away = B.allNeighbors(m.board, target.pos).filter((x) => far(x) > far(target.pos));
    const by = away.map((x) => T.entityAt(m, x)).find((u) => u && standing(u) && u.kind !== 'decoy');
    say(m, `${target.name} crashes${by ? ' into ' + by.name : ''}.`, 'hero');
    T.damage(m, source, target, c, { kind: 'true', trueDmg: true, label: 'crashes for' });
    if (by) T.damage(m, source, by, c, { kind: 'true', trueDmg: true, label: 'is crashed into for' });
  }
  function pullToward(m, source, target, n, viaLink) {
    if (!viaLink) {
      const o = linkedTo(m, target);
      if (o) {
        const r = pullToward(m, source, target, n, true);
        if (standing(o)) pullToward(m, source, o, n, true);
        return r;
      }
    }
    if (forceImmune(target) || (target.kind === 'hero' && T.boonVals(target, 'noPull').length)) {
      say(m, `${target.name} holds fast.`);
      return 0;
    }
    if (gravityOf(m) === 'light') n += 1;
    let moved = 0;
    for (let i = 0; i < n; i++) {
      if (B.adjacent(m.board, target.pos, source.pos)) break;
      const cands = B.walkNeighbors(m.board, target.pos).filter((x) => canEnter(m, target, x, false));
      if (!cands.length) break;
      const best = cands.sort((a, b) => B.dist(m.board, a, source.pos, true) - B.dist(m.board, b, source.pos, true))[0];
      if (B.dist(m.board, best, source.pos, true) >= B.dist(m.board, target.pos, source.pos, true)) break;
      moveEntity(m, target, best, 'forced');
      moved++;
    }
    return landed(m, source, target, moved);
  }
  function moveEntity(m, ent, node, how) {
    const from = ent.pos;
    ent.pos = node;
    fx(m, { t: 'move', ent: ent.uid, from, to: node, how });
    if (how === 'forced' && isHidden(ent)) breakHidden(m, ent, 'moved');
    onEnter(m, ent, node);
    if (ent.kind === 'hero' && how !== 'forced' && isHidden(ent) && !st(ent).Hidden.canMove)
      breakHidden(m, ent, 'moved');
    if (how === 'walk' && st(ent).Holding) dragHeld(m, ent, from);
  }
  /**
   * Hold (2.104): a unit that holds a foe drags it along when it walks: the foe goes into the space the
   * holder left, or the free space beside the holder nearest it. A foe that walked off, fell, or is
   * Anchored by anything else is let go.
   */
  function dragHeld(m, holder, from) {
    const hd = st(holder).Holding;
    const foe = unitBy(m, hd.uid);
    const held = foe && st(foe).Held;
    const near = foe && B.dist(m.board, from, foe.pos, true) <= 1;
    if (!standing(foe) || !held || held.by !== holder.uid || !near || forceImmune(foe)) {
      delete st(holder).Holding;
      if (held && held.by === holder.uid) delete st(foe).Held;
      return;
    }
    const spots = B.walkNeighbors(m.board, holder.pos)
      .filter((n) => n === foe.pos || !T.occupied(m, n))
      .sort((a, b) => B.dist(m.board, a, from, true) - B.dist(m.board, b, from, true) || (a < b ? -1 : 1));
    if (!spots.length) return;
    if (spots[0] !== foe.pos) {
      moveEntity(m, foe, spots[0], 'forced');
      say(m, `${holder.name} drags ${foe.name} along.`, 'hero');
    }
  }
  T.moveEntity = moveEntity;
  T.pushAway = pushAway;
  T.pullToward = pullToward;

  const heroBy = (m, uid) => m.heroes.find((h) => h.uid === uid) || null;

  /* ───────────────────────────── LINK ─────────────────────────────
   * Link (2.87): two units joined for N rounds. When one takes damage, a push or a pull, or a Heal, the other
   * takes the same: the damage it was dealt (as true damage), the same push or pull from the same source,
   * the same heal. A unit has one Link at a time; a new one replaces it, and it ends when either falls.
   */
  const unitBy = (m, uid) =>
    m.heroes.find((h) => h.uid === uid) ||
    m.enemies.find((e) => e.uid === uid) ||
    (m.pets || []).find((p) => p.uid === uid) ||
    null;
  const standing = (u) => !!u && (u.kind === 'enemy' ? u.alive : u.kind === 'pet' ? !u.dead : !u.downed);
  function linkedTo(m, u) {
    const l = u && st(u).Linked;
    if (!l) return null;
    const o = unitBy(m, l.to);
    return standing(o) && st(o).Linked && st(o).Linked.to === u.uid ? o : null;
  }
  T.linkedTo = linkedTo;
  function unlink(m, u) {
    const o = linkedTo(m, u);
    delete st(u).Linked;
    if (o) delete st(o).Linked;
  }
  function linkUnits(m, a, b, t) {
    if (!standing(a) || !standing(b) || a === b || t <= 0) return false;
    unlink(m, a);
    unlink(m, b);
    st(a).Linked = { to: b.uid, t };
    st(b).Linked = { to: a.uid, t };
    fx(m, { t: 'state', ent: a.uid, name: 'Linked' });
    fx(m, { t: 'state', ent: b.uid, name: 'Linked' });
    say(m, `${a.name} and ${b.name} are Linked for ${t} round${t === 1 ? '' : 's'}.`, 'hero');
    return true;
  }
  T.linkUnits = linkUnits;
  /** The nearest other standing unit of `u`'s side within `r` of it (ties: the earliest), or null. */
  function nearestKin(m, u, r) {
    const kin = u.kind === 'enemy' ? T.liveEnemies(m) : T.liveHeroes(m);
    return (
      kin
        .filter((o) => o !== u)
        .map((o) => [o, B.dist(m.board, u.pos, o.pos, true)])
        .filter(([, d]) => d <= r)
        .sort((x, y) => x[1] - y[1] || x[0].uid - y[0].uid)
        .map(([o]) => o)[0] || null
    );
  }
  function linkHeal(m, u, amt) {
    const o = linkedTo(m, u);
    if (!o || amt <= 0) return;
    const before = o.hp;
    o.hp = Math.min(o.maxHp, o.hp + amt);
    if (o.hp > before) {
      fx(m, { t: 'heal', ent: o.uid, amount: o.hp - before });
      say(m, `The Link carries the heal to ${o.name} (${o.hp - before}).`, 'hero');
    }
  }
  T.linkHeal = linkHeal;

  /** Mark a unit: the larger of each part stands (`next`, `pierce`, `each` for `t` rounds). */
  function markUnit(m, u, o) {
    const mk = st(u).Marked || {};
    if (o.next) {
      mk.next = Math.max(mk.next || 0, o.next);
      if (o.pierce) mk.pierce = true;
    }
    if (o.each) {
      mk.each = Math.max(mk.each || 0, o.each);
      mk.t = Math.max(mk.t || 0, o.t || 1);
    }
    st(u).Marked = mk;
    fx(m, { t: 'state', ent: u.uid, name: 'Marked' });
  }
  T.markUnit = markUnit;
  /** Heal a unit: restore vitality, or get a downed pilot up with that much (2.90: Heal raises the downed). */
  function healUnit(m, u, amt) {
    if (amt <= 0 || u.dead) return 0;
    if (u.kind === 'hero' && u.downed) {
      u.downed = false;
      u.hp = Math.min(u.maxHp, amt);
      say(m, `${u.name} gets up with ${u.hp}!`, 'sys');
      fx(m, { t: 'revive', ent: u.uid });
      return u.hp;
    }
    const before = u.hp;
    u.hp = Math.min(u.maxHp, u.hp + amt);
    fx(m, { t: 'heal', ent: u.uid, amount: u.hp - before });
    return u.hp - before;
  }
  T.healUnit = healUnit;
  /** Wound a unit: it takes the Wound at round end, one less each round. A new Wound replaces a smaller one. */
  function woundUnit(m, u, n, source, heal, kind) {
    const w = st(u).Wound;
    if (w && w.n >= n) return;
    st(u).Wound = {
      n,
      owner: source ? source.uid : w ? w.owner : null,
      heal: Math.max(heal || 0, w ? w.heal : 0),
      kind: kind || (w && w.kind) || 'wound',
    };
    fx(m, { t: 'state', ent: u.uid, name: 'Wound' });
  }
  T.woundUnit = woundUnit;

  /* ───────────────────────────── FIELDS ─────────────────────────────
   * A Field (2.86) is a marked space, or a set of them, that does its keywords to whatever enters it or ends
   * the round there. It is the one shape behind what were snares, counted snares, spore and musk zones,
   * triggers and auras; a hazard reads as a Field of damage that belongs to nobody.
   *   { nodes: [..] | null, around: uid | null, radius, ring, on: 'enter' | 'end', trips, t, owner, side, label,
   *     fx: [{ kw: 'strike' | 'weaken' | 'anchor' | 'mark' | 'hidden' | 'reveal', n, t, pierce, if, noTele }] }
   * `around` makes the Field follow a unit (the spaces within `radius` of it; `ring` leaves out its own).
   * `trips` counts the units it may still spring on (null: every one); `t` counts rounds (null: until spent).
   * A Field's harm falls on its side's foes and its help on its own side; nothing off the ground (Hover,
   * Weightless) is touched by one.
   */
  const FIELD_HELPS = { hidden: true, heal: true };
  // the Fields springing now (a Field that pulls a unit across its own spaces does not spring again on the way)
  const SPRINGING = new Set();
  function fieldNodes(m, f) {
    if (f.around == null) return f.nodes || [];
    const u = heroBy(m, f.around);
    if (!u || u.downed) return [];
    const ring = B.within(m.board, u.pos, f.radius || 1, true);
    return f.ring ? ring : [u.pos].concat(ring);
  }
  T.fieldNodes = fieldNodes;
  function fieldHits(f, u, x) {
    const foe = (u.kind === 'enemy') === (f.side !== 'enemy');
    return FIELD_HELPS[x.kw] ? !foe : foe;
  }
  /** Spring one Field on one unit. `late` (a round-end trip) makes a state it leaves last into the next round. */
  function springField(m, f, u, late) {
    if (trapImmune(u) || (u.kind === 'enemy' && !u.alive)) return false;
    const down = u.kind === 'hero' && u.downed; // a downed pilot is reached only by a Heal
    const owner = f.owner != null ? heroBy(m, f.owner) : null;
    let hit = false;
    for (const x of f.fx) {
      if (x.kw === 'reveal' || !fieldHits(f, u, x) || (down && x.kw !== 'heal')) continue;
      if (x.if === 'anchored' && (!isAnchored(u) || u.anchoredPerm)) continue;
      const t = (x.t || 1) + (late ? 1 : 0);
      if (!hit && !FIELD_HELPS[x.kw])
        say(
          m,
          `${u.name} is caught in ${owner ? owner.name + "'s" : 'a'} Field.`,
          u.kind === 'enemy' ? 'hero' : 'enemy',
        );
      hit = true;
      if (x.kw === 'strike')
        T.damage(m, owner, u, x.n, {
          kind: x.pierce ? 'true' : 'area',
          trueDmg: !!x.pierce,
          label: f.label || 'is struck by the Field for',
        });
      else if (x.kw === 'weaken') weaken(m, u, x.n, t);
      else if (x.kw === 'anchor') {
        anchorEnt(m, u, t);
      } else if (x.kw === 'mark') markUnit(m, u, { next: x.n || 2 });
      else if (x.kw === 'hidden') setHidden(m, u, t, false);
      else if (x.kw === 'heal') healUnit(m, u, x.n);
      else if ((x.kw === 'pull' || x.kw === 'push') && owner && !SPRINGING.has(f)) {
        const n = x.n + boonSum(owner, 'fieldForce');
        SPRINGING.add(f);
        try {
          if (x.kw === 'pull') pullToward(m, owner, u, n);
          else pushAway(m, owner, u, n);
        } finally {
          SPRINGING.delete(f);
        }
      }
      if (u.kind === 'enemy' ? !u.alive : u.downed) break;
    }
    if (hit && f.trips != null) f.trips--;
    return hit;
  }
  /** A unit has stepped (or been moved) onto `node`: every 'enter' Field there springs on it. */
  function onEnter(m, u, node) {
    let spent = false;
    for (const f of m.fields) {
      if (f.on !== 'enter' || (f.trips != null && f.trips <= 0)) continue;
      if (!fieldNodes(m, f).includes(node)) continue;
      if (springField(m, f, u, false)) {
        fx(m, { t: 'trap', node });
        if (f.trips != null && f.trips <= 0) spent = true;
      }
    }
    if (spent) m.fields = m.fields.filter((f) => f.trips == null || f.trips > 0);
  }
  /** Round end: every 'end' Field springs on the units standing in it, and reveal Fields look again. */
  function fieldsAtRoundEnd(m) {
    for (const f of m.fields) {
      const owner = f.owner != null ? heroBy(m, f.owner) : null;
      const nodes = fieldNodes(m, f);
      if (!nodes.length) continue;
      if (owner && f.fx.some((x) => x.kw === 'reveal')) {
        const c = f.around != null ? owner.pos : nodes[0];
        revealArea(m, owner, c, f.radius || 0, 2);
      }
      if (f.on !== 'end') continue;
      const set = new Set(nodes);
      for (const u of m.heroes.concat(T.liveEnemies(m))) {
        if (f.trips != null && f.trips <= 0) break;
        if (set.has(u.pos)) springField(m, f, u, true);
      }
    }
    m.fields = m.fields.filter((f) => f.trips == null || f.trips > 0);
  }

  /**
   * Spring everything set within `radius` of a unit, now: every Field (anyone's) on the units standing in
   * its spaces there, every hazard there on whoever stands on it, and every Wound there bites (without
   * dropping). None of it is spent: each still does its work at round end.
   */
  T.springAround = function (m, actor, radius) {
    const bd = m.board;
    const near = new Set([actor.pos].concat(B.within(bd, actor.pos, radius, true)));
    const units = () =>
      T.liveHeroes(m)
        .concat(T.liveEnemies(m))
        .filter((u) => near.has(u.pos));
    say(m, `${actor.name} sets everything within ${radius} springing.`, actor.kind === 'enemy' ? 'enemy' : 'hero');
    for (const f of m.fields.slice()) {
      const set = new Set(fieldNodes(m, f).filter((n) => near.has(n)));
      if (!set.size) continue;
      for (const u of units()) {
        if (f.trips != null && f.trips <= 0) break;
        if (set.has(u.pos) && springField(m, f, u, false)) fx(m, { t: 'trap', node: u.pos });
      }
    }
    m.fields = m.fields.filter((f) => f.trips == null || f.trips > 0);
    for (const u of units())
      if (bd.nodes[u.pos].hazard && !hazardImmune(u) && !u.boss) {
        const d = T.damage(m, null, u, R().HAZARD_DMG, { kind: 'true', trueDmg: true, label: 'floods over' });
        if (u.kind === 'hero') m.stats.hazardDmg += d;
      }
    for (const u of units()) {
      const w = st(u).Wound;
      if (!w) continue;
      const owner = unitBy(m, w.owner);
      T.damage(m, owner || null, u, w.n, { kind: 'true', trueDmg: true, label: `(${w.kind || 'wound'}) wounds` });
    }
  };

  /* ───────────────────────────── REVEAL ───────────────────────────── */
  function revealArea(m, actor, center, radius, dur, opts) {
    opts = opts || {};
    if (actor.kind === 'hero') radius += boonSum(actor, 'keen');
    const nodes =
      radius >= 99 ? Object.keys(m.board.nodes).map(Number) : [center].concat(B.within(m.board, center, radius, true));
    const set = new Set(nodes);
    for (const e of T.liveEnemies(m))
      if (set.has(e.pos)) {
        breakHidden(m, e, 'located');
        addTimed(m, e, 'Located', dur || 1);
      }
    sightMarks(m, nodes, actor.name || 'A reveal');
    // hidden objective caches
    if (m.objective && m.objective.kind === 'find') {
      for (const c of m.objective.candidates) {
        const nd = m.board.nodes[c];
        if (set.has(c) || opts.findObjective) {
          if (!nd.objective.searched) {
            nd.objective.searched = true;
            if (nd.objective.real) {
              m.objective.found = true;
              if (m.stats.foundRound == null) m.stats.foundRound = m.round;
              say(m, `The real cache is revealed on node ${c}!`, 'sys');
            } else say(m, `Node ${c} is a decoy cache.`, 'sys');
          }
        }
      }
    }
    fx(m, { t: 'revealArea', center, nodes });
  }

  /* ───────────────────────────── TARGETING ───────────────────────────── */
  // Returns {need:'none'|'foe'|'node'|'ally'|'foeOrAlly', options:[ids], reason, ally?, allies?}
  /**
   * How far a face reaches "your ally": null when it does not (at this level), 'adj' when only an ally beside
   * you, 'any' when any ally standing. A face that names an ally lets its player choose which one.
   */
  const allyRef = (f, P, E) => {
    if (f.carryAlly != null) return bool(f.carryAlly, P, E) ? 'adj' : null;
    if (f.v === 'guide' || (f.v === 'swap' && !f.foe)) return 'any';
    if (f.target !== 'ally' && f.who !== 'ally') return null;
    if (!f.pierce && ['val', 'n'].some((k) => f[k] != null && num(f[k], P, E) <= 0)) return null;
    if (f.v === 'anchor' && num(f.dur, P, E) <= 0) return null;
    return f.adjacent ? 'adj' : 'any';
  };
  const allyReach = (tgt, face, P, E) => {
    if (tgt === 'ally_adj' || tgt === 'ally_adj_move' || tgt === 'ally_throw') return 'adj';
    if (tgt === 'ally' || tgt === 'ally_move') return 'any';
    const refs = ((face && face.fx) || []).map((f) => allyRef(f, P, E)).filter(Boolean);
    if (!refs.length) return null;
    return refs.every((r) => r === 'adj') ? 'adj' : 'any';
  };
  /**
   * Targets for a play. `pick` is the ally the player has chosen, for a face that reaches one: with three or
   * more pilots, a face that names "an ally" says which allies it can reach (`allies`, nearest first) and
   * which one it works on now (`ally`). A face that needs no other target asks for the ally itself
   * (need 'ally'). With two pilots there is only one ally, and nothing changes.
   */
  T.targetsFor = function (m, h, tgt, face, P, E, pick) {
    if (m.heroes.length <= 2 || h.kind !== 'hero') return baseTargets(m, h, tgt, face, P, E, T.allyOf(m, h));
    const reach = allyReach(tgt, face, P, E);
    if (!reach) return baseTargets(m, h, tgt, face, P, E, T.allyOf(m, h));
    const cands = T.alliesOf(m, h).filter((x) => !x.downed && (reach === 'any' || B.adjacent(m.board, h.pos, x.pos)));
    const chosen = cands.find((x) => x.uid === pick) || cands[0] || T.allyOf(m, h);
    const r = baseTargets(m, h, tgt, face, P, E, chosen);
    if (r.invalid || !cands.length) return r;
    r.ally = chosen.uid;
    if (cands.length < 2) return r;
    if (r.need === 'none') return Object.assign(r, { need: 'ally', options: cands.map((x) => x.uid) });
    r.allies = cands.map((x) => x.uid);
    return r;
  };
  /**
   * The ally a play goes to: the player's pick, checked against the allies the face can reach, or the one it
   * reaches by default. Returns { ok, ally } (ally: a uid, or null with two pilots).
   */
  const allyFor = (m, tg, ctx) => {
    if (m.heroes.length <= 2 || tg.ally == null) return { ok: true, ally: null };
    const allowed = tg.need === 'ally' ? tg.options : tg.allies || [tg.ally];
    const want = ctx && ctx.ally != null ? ctx.ally : tg.ally;
    return allowed.includes(want) ? { ok: true, ally: want } : { ok: false, why: 'that ally is out of reach' };
  };
  const baseTargets = function (m, h, tgt, face, P, E, ally) {
    const bd = m.board;
    const foes = T.liveEnemies(m);
    const vis = (e) => !isHidden(e) || !!st(e).Located; // can't target unseen foes with single-target effects
    const reach = st(h).Morph && st(h).Morph.reach ? 2 : 1;
    switch (tgt) {
      case 'self':
      case 'party':
        return { need: 'none' };
      case 'ally':
        return ally && !ally.downed ? { need: 'none', ally: ally.uid } : { need: 'none', invalid: 'no ally standing' };
      case 'ally_adj':
        if (!ally || ally.downed) return { need: 'none', invalid: 'no ally standing' };
        return B.adjacent(bd, h.pos, ally.pos)
          ? { need: 'none', ally: ally.uid }
          : { need: 'none', invalid: 'your ally must be beside you' };
      case 'ally_move':
      case 'ally_adj_move': {
        // you move your partner, now, to a node you choose: the rest of your turn stays yours to plan
        if (!ally || ally.downed) return { need: 'none', invalid: 'no ally standing' };
        if (tgt === 'ally_adj_move' && !B.adjacent(bd, h.pos, ally.pos))
          return { need: 'none', invalid: 'your ally must be beside you' };
        const rl = face && face.fx.find((x) => x.v === 'guide');
        const n = rl ? num(rl.n, P, E) : 0;
        const steps = isAnchored(ally) ? [] : T.reachableWalk(m, ally, n, false);
        return { need: 'node', options: [ally.pos].concat(steps), ally: ally.uid, allyMove: n };
      }
      case 'foe_melee':
        return {
          need: 'foe',
          options: foes
            .filter(
              (e) =>
                B.dist(bd, h.pos, e.pos, true) <= reach &&
                B.dist(bd, h.pos, e.pos, true) >= 1 &&
                (reach > 1 || B.adjacent(bd, h.pos, e.pos)),
            )
            .map((e) => e.uid),
        };
      case 'foe_los':
        return { need: 'foe', options: foes.filter((e) => B.los(bd, h.pos, e.pos) && vis(e)).map((e) => e.uid) };
      case 'foe_any':
        return { need: 'foe', options: foes.filter(vis).map((e) => e.uid) };
      case 'foe_r2': {
        // a face may reach further as it grows: an effect's `reach` sets the range (2 at least)
        const rx = face && face.fx.find((x) => x.reach != null);
        const r = rx ? Math.max(2, num(rx.reach, P, E)) : 2;
        return {
          need: 'foe',
          options: foes.filter((e) => B.dist(bd, h.pos, e.pos, true) <= r && vis(e)).map((e) => e.uid),
        };
      }
      case 'foe_r3':
        return {
          need: 'foe',
          options: foes.filter((e) => B.dist(bd, h.pos, e.pos, true) <= 3 && vis(e)).map((e) => e.uid),
        };
      case 'foe_adj_all':
      case 'foe_zone_all':
        return { need: 'none' };
      case 'foe_or_ally_adj': {
        const opts = foes.filter((e) => B.adjacent(bd, h.pos, e.pos)).map((e) => e.uid);
        for (const x of T.alliesOf(m, h)) if (!x.downed && B.adjacent(bd, h.pos, x.pos)) opts.push(x.uid);
        if (ally && !ally.downed && face && face.fx.some((x) => x.target === 'chosenAlly')) opts.push(h.uid);
        return { need: 'foeOrAlly', options: opts };
      }
      case 'node_adj':
        return { need: 'node', options: B.walkNeighbors(bd, h.pos).filter((n) => T.freeFor(m, h, n)) };
      case 'node_r2': {
        const r = face
          ? Math.max(
              ...face.fx.map((x) =>
                x.remote != null ? num(x.remote, P, E) : x.range != null ? num(x.range, P, E) : 0,
              ),
              2,
            )
          : 2;
        const all = [h.pos].concat(B.within(bd, h.pos, r, true));
        // a decoy is set down on an empty node; work and spores can reach any node in range
        const decoyOnly =
          face &&
          face.fx.some((x) => x.v === 'decoy' && !x.here) &&
          !face.fx.some((x) => /^(interact|dot|zone|strike|trap)$/.test(x.v));
        return { need: 'node', options: decoyOnly ? all.filter((n) => T.freeFor(m, h, n)) : all };
      }
      case 'node_r3': {
        const r = face ? Math.max(...face.fx.map((x) => (x.remote != null ? num(x.remote, P, E) : 0)), 3) : 3;
        return { need: 'node', options: B.within(bd, h.pos, r, true).filter((n) => T.freeFor(m, h, n)) };
      }
      case 'node_move': {
        const mv = face.fx.find((x) => x.v === 'move');
        const n = num(mv.n, P, E);
        // a face that lifts you off the ground before it moves you (Hover, then Move) may take the ledges
        const hi = face.fx.findIndex((x) => x.v === 'hover');
        const lift = hi >= 0 && hi < face.fx.indexOf(mv);
        const climbing = bool(mv.climb, P, E) || lift;
        const through = mv.ignoreFoes || num(mv.trample, P, E) > 0;
        return { need: 'node', options: T.reachableWalk(m, h, n, through, mv.exact, climbing) };
      }
      case 'node_tele': {
        const tp = face.fx.find((x) => x.v === 'blink');
        const r = num(tp.reach, P, E) + boonSum(h, 'blinkReach');
        let opts = B.within(bd, h.pos, r, true).filter((n) => T.freeFor(m, h, n) && (tp.height || !bd.nodes[n].height));
        if (tp.dest === 'adjTarget')
          return {
            need: 'foe',
            options: foes.filter((e) => B.dist(bd, h.pos, e.pos, true) <= r && vis(e)).map((e) => e.uid),
          };
        return { need: 'node', options: opts };
      }
      case 'ally_throw': {
        // you throw your ally, beside you, to a free node within reach of you
        if (!ally || ally.downed) return { need: 'none', invalid: 'no ally standing' };
        if (!B.adjacent(bd, h.pos, ally.pos)) return { need: 'none', invalid: 'your ally must be beside you' };
        if (isAnchored(ally)) return { need: 'none', invalid: 'your ally is Anchored' };
        const tw = face.fx.find((x) => x.v === 'throw');
        const r = num(tw.reach, P, E);
        const opts = B.within(bd, h.pos, r, true).filter(
          (n) => n !== ally.pos && !T.occupied(m, n) && (tw.height || !bd.nodes[n].height),
        );
        return { need: 'node', options: opts, ally: ally.uid };
      }
      default:
        return { need: 'none' };
    }
  };
  /**
   * The empty nodes a hero can walk to in n steps or fewer. With `exact`, the nodes a run of exactly n steps
   * can end on, never stepping on the same space twice: count the steps on the board, as at the table. (Before
   * 2.81.1 it was the nodes whose *shortest* walk is n, which on a small or well-joined board left a run of 4
   * nowhere to go from most of it: the whole threshing floor of Mast-Crop Hills.)
   */
  T.reachableWalk = function (m, h, n, ignoreFoes, exact, climb) {
    const bd = m.board;
    const climber = canClimb(h) || !!climb;
    // a step onto y: is it allowed, and is y somewhere a walk may pass (but not stop, if occupied)?
    const step = (y) => {
      if (bd.nodes[y].height && !climber && !bd.ramp) return null;
      const occ = T.unitsAt(m, y).filter((u) => u !== h);
      // the squad's pilots and pets can be walked through; foes only when ignoring them
      if (occ.some((u) => !(ignoreFoes || u.kind === 'hero' || u.kind === 'pet'))) return null;
      return { empty: T.freeFor(m, h, y) };
    };
    if (exact) {
      const out = new Set();
      const onPath = new Set([h.pos]);
      const go = (x, d) => {
        for (const y of B.walkNeighbors(bd, x, climber)) {
          if (onPath.has(y)) continue;
          const s = step(y);
          if (!s) continue;
          if (d + 1 === n) {
            if (s.empty) out.add(y);
            continue;
          }
          onPath.add(y);
          go(y, d + 1);
          onPath.delete(y);
        }
      };
      if (n > 0) go(h.pos, 0);
      return [...out];
    }
    const out = [];
    const seen = new Set([h.pos]);
    const q = [[h.pos, 0]];
    while (q.length) {
      const [x, d] = q.shift();
      if (d >= n) continue;
      for (const y of B.walkNeighbors(bd, x, climber)) {
        if (seen.has(y)) continue;
        const s = step(y);
        if (!s) continue;
        seen.add(y);
        if (s.empty) out.push(y);
        q.push([y, d + 1]);
      }
    }
    return out;
  };

  /* ───────────────────────────── PLAY A FACE ───────────────────────────── */
  // ctx: {target: uid|null, node: id|null, choice:'push'|'pull'}
  T.canPlay = function (m, h, cardId, faceKey, pick) {
    if (h.downed || h.rested) return { ok: false, why: h.downed ? 'downed' : 'resting' };
    if (!T.inHand(h, cardId)) return { ok: false, why: 'on track' };
    const card = T.CARD[cardId];
    const face = card[faceKey];
    const P = T.heroP(h, cardId),
      E = T.heroE(h, cardId);
    const elt = face.elt || card.el;
    const eln = face.el || 0;
    if (faceKey === 'E' && E < R().ETHEREAL_MIN_E) return { ok: false, why: 'needs E ' + R().ETHEREAL_MIN_E };
    // a pet's card acts from the pet (src/data/pets.js): no pet on the board, no play
    const body = T.isPetCard(h, cardId) ? T.petFor(m, h, cardId) : h;
    if (!body) return { ok: false, why: 'your pet is not here' };
    // inside a vehicle only Mounted faces; a pet riding with its pilot plays by the same rule
    if (T.ridingWith(m, h, body) && !T.isMountedFace(card, faceKey))
      return { ok: false, why: 'not Mounted: get out first' };
    if (!T.canPay(h, face.ap, elt, eln)) return { ok: false, why: 'cannot pay' };
    const tg = T.targetsFor(m, body, face.tgt, face, P, E, pick);
    if (tg.invalid) return { ok: false, why: tg.invalid };
    if (tg.need !== 'none' && (!tg.options || !tg.options.length)) return { ok: false, why: 'no valid target' };
    return { ok: true, tg, body };
  };
  T.playFace = function (m, h, cardId, faceKey, ctx) {
    const chk = T.canPlay(m, h, cardId, faceKey, ctx && ctx.ally);
    if (!chk.ok) return { ok: false, why: chk.why };
    const al = allyFor(m, chk.tg, ctx);
    if (!al.ok) return al;
    const card = T.CARD[cardId];
    const face = card[faceKey];
    const P = T.heroP(h, cardId),
      E = T.heroE(h, cardId);
    const elt = face.elt || card.el;
    const eln = face.el || 0;
    T.pay(h, face.ap, elt, eln);
    const body = chk.body;
    say(
      m,
      `${h.name} plays ${card.name} — ${face.n}${faceKey === 'E' ? ' (' + T.ETHERIONS[elt].name + ')' : ''}${body !== h ? ', through ' + body.name : ''}.`,
      'hero',
    );
    fx(m, { t: 'play', hero: h.uid, card: cardId, face: faceKey });
    const how = T.commit(h, cardId, face.dur || 0, face.cd || 0, face.n);
    if (how === 'free') say(m, `(${card.name} does not go to the track.)`, 'sys');
    const rctx = ctx || {};
    Object.assign(rctx, { P, E, card, faceKey });
    if (al.ally != null) rctx.ally = al.ally;
    if (face.dusk) {
      // Dusk (2.115): the face is placed now and lands at round end, after the foes have acted. What it
      // needs is kept as plain data (who, which face, its levels, the space chosen), not the effects.
      (m.dusk = m.dusk || []).push({
        uid: body.uid,
        card: cardId,
        face: faceKey,
        P,
        E,
        node: rctx.node != null ? rctx.node : null,
      });
      say(m, `${body.name} waits for dusk.`, 'hero');
    } else T.runEffects(m, body, face.fx, rctx);
    // Resonance (2.118): an Ethereal face leaves its element in the air, after it has drawn on what was there
    if (faceKey === 'E' && T.AIR_ELS.includes(elt)) T.leaveInAir(m, elt);
    if (body !== h) delete rctx.pendingFreeMove; // a free step a pet's face grants is the pet's, and it has taken it
    T.afterAction(m);
    return { ok: true, ctx: rctx };
  };

  /* ───────────────────────────── EFFECT RUNNER ───────────────────────────── */
  T.runEffects = function (m, actor, fxs, ctx) {
    ctx.lastTarget = null;
    for (const f of fxs) {
      if (m.over) break;
      try {
        T.applyEffect(m, actor, f, ctx);
      } catch (err) {
        say(m, 'Effect error: ' + err.message, 'sys');
        if (typeof console !== 'undefined') console.error(err);
      }
    }
  };
  const targetEnt = (m, ctx) => {
    if (ctx.target == null) return null;
    return (
      m.enemies.find((e) => e.uid === ctx.target && e.alive) ||
      m.heroes.find((h) => h.uid === ctx.target) ||
      m.decoys.find((d) => d.uid === ctx.target) ||
      (m.pets || []).find((p) => p.uid === ctx.target && !p.dead) ||
      null
    );
  };
  const foesAdj = (m, actor) => T.liveEnemies(m).filter((e) => B.adjacent(m.board, actor.pos, e.pos));
  const foesWithin = (m, node, r) => {
    const set = new Set([node].concat(B.within(m.board, node, r, true)));
    return T.liveEnemies(m).filter((e) => set.has(e.pos));
  };
  const nearestFoe = (m, actor, requireLos) => {
    let best = null,
      bd = 99;
    for (const e of T.liveEnemies(m)) {
      if (requireLos && !B.los(m.board, actor.pos, e.pos)) continue;
      const d = B.dist(m.board, actor.pos, e.pos, true);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  };

  T.applyEffect = function (m, actor, f, ctx) {
    const P = ctx.P || 0,
      E = ctx.E || 0;
    const bd = m.board;
    // a pet card acts from the pet, but what it does to dice, the track or the purse goes to the pilot
    if (actor.kind === 'pet' && T.PET_PILOT_VERBS.includes(f.v)) actor = T.petOwner(m, actor) || actor;
    const isHero = actor.kind === 'hero' || actor.kind === 'pet';
    const ally = isHero ? T.chosenAlly(m, actor, ctx) : null;
    const party = () => (isHero ? T.liveHeroes(m) : [actor]);
    // Conditions gate the whole effect, whatever its verb. The ones about a target need it
    // still standing. An effect that carries `elseVal` runs anyway, at that magnitude instead
    // (strike and heal read it).
    const condOk = () => {
      if (f.ifOnHazard && !bd.nodes[actor.pos].hazard) return false;
      if (f.ifE && E < f.ifE) return false;
      if (f.ifAnchored || f.ifAdjacent || f.ifFlanked || f.ifHpBelow != null) {
        const t = targetEnt(m, ctx) || ctx.lastTarget;
        if (!t || t.alive === false || t.downed) return false;
        if (f.ifAnchored && !isAnchored(t)) return false;
        if (f.ifAdjacent && !B.adjacent(bd, actor.pos, t.pos)) return false;
        if (f.ifFlanked && !T.isFlanked(m, t)) return false;
        if (f.ifHpBelow != null && t.hp >= num(f.ifHpBelow, P, E)) return false;
      }
      // last, so the element is spent only when everything else holds
      if (f.ifAir && !drawAir(m, f.ifAir, ctx)) return false;
      return true;
    };
    const met = condOk();
    if (!met && f.elseVal == null) return;
    switch (f.v) {
      /* ---------- STRIKES ---------- */
      case 'strike': {
        const dmg = num(met ? f.dmg : f.elseVal, P, E);
        if (dmg <= 0 && !f.stripShield) break;
        const opts = {
          kind: f.kind === 'zone_all' || f.kind === 'nodeArea' ? 'area' : f.kind === 'any' ? 'any' : f.kind,
          pierce: bool(f.pierce, P, E),
          trueDmg: !!f.trueDmg,
          label: ctx.card ? `uses ${ctx.card[ctx.faceKey].n} on` : 'hits',
          strike: true,
        };
        let targets = [];
        if (f.kind === 'area') targets = foesAdj(m, actor);
        else if (f.kind === 'zone_all') targets = T.liveEnemies(m).filter((e) => B.los(bd, actor.pos, e.pos));
        else if (f.kind === 'nodeArea') {
          const center = ctx.node != null ? ctx.node : actor.pos;
          targets = foesWithin(m, center, f.radius != null ? num(f.radius, P, E) : 1);
        } else if (f.nearest) {
          const e = nearestFoe(m, actor, f.kind === 'los');
          if (e) targets = [e];
        } else {
          const t = targetEnt(m, ctx);
          if (t) targets = [t];
        }
        if (f.kind === 'melee' && st(actor).Morph && st(actor).Morph.reach) opts.kind = 'melee';
        for (const t of targets) {
          if (f.stripShield && t.kind === 'enemy') {
            // true strips it all; a number (or a magnitude) strips that much
            const cut = f.stripShield === true ? Infinity : num(f.stripShield, P, E);
            t.shield = Math.max(0, t.shield - cut);
            if (st(t).Shield) st(t).Shield.v = Math.max(0, st(t).Shield.v - cut);
            if (cut === Infinity || (st(t).Shield && st(t).Shield.v <= 0)) delete st(t).Shield;
          }
          if (f.revealTarget) breakHidden(m, t, 'twitch');
          T.damage(m, actor, t, dmg, opts);
          const mp = st(actor).Morph && st(actor).Morph.push;
          if (mp && opts.kind === 'melee' && standing(t)) pushAway(m, actor, t, mp);
          if (f.onKill && t.kind === 'enemy' && !t.alive) T.applyEffect(m, actor, f.onKill, ctx);
          ctx.lastTarget = t;
        }
        break;
      }
      case 'execute': {
        const t = targetEnt(m, ctx);
        if (!t || t.kind !== 'enemy') break;
        const th = num(f.threshold, P, E);
        if (t.hp <= th && !t.boss) {
          say(m, `${actor.name} decomposes ${t.name} — nothing left to stand.`, 'hero');
          t.hp = 0;
          checkEnemyDeath(m, t, actor);
          if (f.salvage) {
            const hi = m.heroes.indexOf(actor);
            m.purses[hi >= 0 ? T.purseSeat(m, hi) : 0] += f.salvage;
            say(m, `Salvaged ${f.salvage} ◇.`, 'sys');
          }
        } else say(m, `${t.name} is not yet dying (${t.hp} > ${th}).`, 'sys');
        break;
      }
      case 'stripShield': {
        const t = targetEnt(m, ctx) || ctx.lastTarget;
        if (!t || t.kind !== 'enemy') break;
        const amount = f.amount != null ? num(f.amount, P, E) : 0;
        if (amount) {
          t.shield = Math.max(0, t.shield - amount);
          if (st(t).Shield) st(t).Shield.v = Math.max(0, st(t).Shield.v - amount);
        } else {
          t.shield = 0;
          delete st(t).Shield;
        }
        say(m, `${t.name}'s Shield is ${amount ? 'weakened' : 'stripped'}.`, 'hero');
        break;
      }
      case 'wound': {
        // Wound N (2.88): at round end it takes N, then the Wound drops by 1. The larger Wound stands.
        let targets = [];
        if (f.area === 'nodeArea') {
          const center = ctx.node != null ? ctx.node : actor.pos;
          targets = foesWithin(m, center, f.radius != null ? num(f.radius, P, E) : 1);
        } else {
          const t = targetEnt(m, ctx) || ctx.lastTarget;
          if (t) targets = [t];
        }
        const n = num(f.n, P, E);
        const heal = num(f.healOwner, P, E) || 0;
        for (const t of targets) {
          if (n <= 0 || (t.kind === 'enemy' ? !t.alive : t.downed)) continue;
          woundUnit(m, t, n, actor, heal, f.kind);
        }
        break;
      }
      /* ---------- MOVEMENT ---------- */
      case 'move': {
        if (!isHero) break;
        const n = num(f.n, P, E);
        if (n <= 0) break;
        if (isAnchored(actor)) {
          say(m, `${actor.name} is Anchored and cannot move.`, 'sys');
          break;
        }
        let dest = null;
        if (f.toward && ctx.target != null) {
          const t = targetEnt(m, ctx);
          if (t) {
            const p = B.path(
              bd,
              actor.pos,
              t.pos,
              new Set(
                T.liveEnemies(m)
                  .filter((e) => e !== t)
                  .map((e) => e.pos),
              ),
            );
            // up to n steps along the way to it, stopping beside it
            if (p && p.length > 2) dest = p[Math.min(n, p.length - 2)];
          }
        } else if (f.free && ctx.node == null) {
          dest = null;
          ctx.pendingFreeMove = n;
          break;
        } else dest = ctx.node;
        if (dest == null) {
          if (f.free) {
            ctx.pendingFreeMove = n;
          }
          break;
        }
        const climbing = bool(f.climb, P, E);
        const tramp = num(f.trample, P, E);
        const opts = T.reachableWalk(m, actor, n, f.ignoreFoes || tramp > 0, f.exact, climbing);
        if (!opts.includes(dest)) {
          if (f.free) {
            ctx.pendingFreeMove = n;
          }
          break;
        }
        const fromN = actor.pos;
        if (tramp > 0) {
          // Trample N (2.103): step by step through the foes in the way, each pushed N away as you reach it
          const p = B.path(bd, actor.pos, dest, null, canClimb(actor) || climbing) || [actor.pos, dest];
          for (let i = 1; i < p.length; i++) {
            const foe = T.entityAt(m, p[i]);
            if (foe && foe.kind === 'enemy' && foe.alive) pushAway(m, actor, foe, tramp);
            moveEntity(m, actor, p[i], 'walk');
            onHeroEnter(m, actor, p[i]);
          }
          if (actor.pos !== dest) moveEntity(m, actor, dest, 'walk');
        } else {
          moveEntity(m, actor, dest, climbing ? 'climb' : 'walk');
          onHeroEnter(m, actor, dest);
        }
        say(m, `${actor.name} ${climbing ? 'climbs' : 'moves'} ${fromN} → ${dest}.`, 'hero');
        // carrying an ally: one beside where you set out comes along, onto a free space beside where you stop
        if (bool(f.carryAlly, P, E) && ally && !ally.downed && !isAnchored(ally) && B.adjacent(bd, fromN, ally.pos)) {
          const spot = B.allNeighbors(bd, dest).filter((x) => !T.occupied(m, x) && x !== fromN)[0];
          if (spot) {
            moveEntity(m, ally, spot, climbing ? 'climb' : 'walk');
            onHeroEnter(m, ally, spot);
            say(m, `${ally.name} is carried along.`, 'hero');
          }
        }
        break;
      }
      case 'blink': {
        if (!isHero) break;
        const r = num(f.reach, P, E) + boonSum(actor, 'blinkReach');
        let dest = ctx.node;
        if (f.dest === 'adjTarget') {
          const t = targetEnt(m, ctx);
          if (!t) break;
          const cands = B.allNeighbors(bd, t.pos).filter((n) => !T.occupied(m, n) && (f.height || !bd.nodes[n].height));
          if (!cands.length) {
            say(m, 'No room beside the target.', 'sys');
            break;
          }
          dest = cands.sort((a, b) => B.dist(bd, actor.pos, a, true) - B.dist(bd, actor.pos, b, true))[0];
        }
        if (dest == null) break;
        if (
          B.dist(bd, actor.pos, dest, true) > r ||
          !T.freeFor(m, actor, dest) ||
          (bd.nodes[dest].height && !f.height)
        ) {
          say(m, 'Out of reach.', 'sys');
          break;
        }
        if (isAnchored(actor)) {
          say(m, `${actor.name} is Anchored — no blinking out.`, 'sys');
          break;
        }
        const from = actor.pos;
        if (bool(f.carryAlly, P, E) && ally && !ally.downed && B.adjacent(bd, from, ally.pos)) {
          const spot = B.allNeighbors(bd, dest).filter((n) => !T.occupied(m, n) && n !== from)[0];
          if (spot) {
            moveEntity(m, ally, spot, 'teleport');
            say(m, `${ally.name} is carried along.`, 'hero');
          }
        }
        moveEntity(m, actor, dest, 'teleport');
        say(m, `${actor.name} blinks ${from} → ${dest}.`, 'hero');
        onHeroEnter(m, actor, dest);
        break;
      }
      case 'swap': {
        if (f.foe) {
          // Take its place: you and a foe trade spaces. Anything that cannot be moved holds fast.
          const t = targetEnt(m, ctx);
          if (!standing(t) || t.kind !== 'enemy') break;
          if (B.dist(bd, actor.pos, t.pos, true) > Math.max(2, num(f.reach, P, E))) {
            say(m, 'Out of reach.', 'sys');
            break;
          }
          if (isAnchored(actor) || forceImmune(t)) {
            say(m, `${isAnchored(actor) ? actor.name : t.name} holds fast.`, 'sys');
            break;
          }
          const a = actor.pos,
            b = t.pos;
          actor.pos = b;
          t.pos = a;
          fx(m, { t: 'move', ent: actor.uid, from: a, to: b, how: 'swap' });
          fx(m, { t: 'move', ent: t.uid, from: b, to: a, how: 'forced' });
          if (isHidden(t)) breakHidden(m, t, 'moved');
          say(m, `${actor.name} and ${t.name} trade places.`, 'hero');
          onEnter(m, t, a);
          onEnter(m, actor, b);
          if (actor.kind === 'hero') onHeroEnter(m, actor, b);
          ctx.lastTarget = t;
          break;
        }
        if (!ally || ally.downed) break;
        const a = actor.pos,
          b = ally.pos;
        actor.pos = b;
        ally.pos = a;
        fx(m, { t: 'move', ent: actor.uid, from: a, to: b, how: 'swap' });
        fx(m, { t: 'move', ent: ally.uid, from: b, to: a, how: 'swap' });
        say(m, `${actor.name} and ${ally.name} swap places.`, 'hero');
        break;
      }
      case 'throw': {
        // Throw your ally, beside you, onto a free node within reach (ledges where it says).
        if (!ally || ally.downed || !B.adjacent(bd, actor.pos, ally.pos)) break;
        const dest = ctx.node;
        const r = num(f.reach, P, E);
        if (dest == null || T.occupied(m, dest) || B.dist(bd, actor.pos, dest, true) > r) {
          say(m, 'Out of reach.', 'sys');
          break;
        }
        if (bd.nodes[dest].height && !f.height) break;
        if (isAnchored(ally)) {
          say(m, `${ally.name} is Anchored and cannot be thrown.`, 'sys');
          break;
        }
        const from = ally.pos;
        moveEntity(m, ally, dest, 'thrown');
        say(m, `${actor.name} throws ${ally.name} ${from} → ${dest}.`, 'hero');
        if (ally.kind === 'hero') onHeroEnter(m, ally, dest);
        break;
      }
      case 'hold': {
        // Lock on to a foe beside you for N rounds: when you walk, it is dragged along.
        const t = targetEnt(m, ctx);
        if (!standing(t) || !B.adjacent(bd, actor.pos, t.pos)) break;
        const d = num(f.dur, P, E);
        st(actor).Holding = { uid: t.uid, t: d };
        st(t).Held = { by: actor.uid, t: d };
        say(m, `${actor.name} locks on to ${t.name}.`, 'hero');
        ctx.lastTarget = t;
        break;
      }
      case 'fix': {
        // Fix its mind: for N rounds after this one, the foe repeats this round's intent (same move, same
        // target). It still acts.
        const t = targetEnt(m, ctx) || ctx.lastTarget;
        if (!standing(t) || t.kind !== 'enemy' || !t.intent) break;
        st(t).Fixed = { intent: JSON.parse(JSON.stringify(t.intent)), t: num(f.dur, P, E) + 1 };
        say(m, `${t.name} is fixed on what it means to do.`, 'hero');
        break;
      }
      case 'aim': {
        // Read a foe (and the foes within `radius` of it): its attack this round is Aimed, at the space its
        // target stands on now.
        const t = targetEnt(m, ctx);
        if (!standing(t) || t.kind !== 'enemy') break;
        const r = num(f.radius, P, E) || 0;
        const foes = [t].concat(r > 0 ? foesWithin(m, t.pos, r).filter((x) => x !== t) : []);
        let n = 0;
        for (const e of foes) if (T.aimIntent && T.aimIntent(m, e)) n++;
        say(
          m,
          n
            ? `${actor.name} reads ${n === 1 ? t.name : n + ' foes'}: the blow is Aimed.`
            : `${t.name} has nothing to aim.`,
          'hero',
        );
        break;
      }
      case 'spring': {
        // Everything set springs now: within `radius` of you, every Field and hazard on whoever stands in it,
        // and every Wound bites. They still do again at round end.
        T.springAround(m, actor, num(f.radius, P, E));
        break;
      }
      case 'rewind': {
        // At round end, regain what you lose from now until then, up to `cap`.
        st(actor).Rewind = { hp: actor.hp, cap: num(f.cap, P, E), t: 1 };
        say(m, `${actor.name} braces to recover what this round takes.`, 'hero');
        break;
      }
      case 'guide': {
        // Guide N (2.103, was the verb `rally`): the player who plays it moves an ally, at once, to the node they
        // chose (ctx.node): nothing is left for the ally to decide, so whoever plays it can plan the rest of their
        // turn exactly. Rally is the basic action that raises the downed, and nothing else.
        if (!ally || ally.downed) break;
        const n = num(f.n, P, E);
        if (ctx.node == null || ctx.node === ally.pos) {
          if (ctx.node === ally.pos) say(m, `${ally.name} holds their ground.`, 'hero');
          break;
        }
        const climber = canClimb(ally);
        const p = B.path(
          bd,
          ally.pos,
          ctx.node,
          new Set(
            T.liveEnemies(m)
              .map((e) => e.pos)
              .concat(m.decoys.map((d) => d.pos)),
          ),
          climber,
        );
        if (!p || p.length < 2 || p.length - 1 > n || T.occupied(m, ctx.node)) break;
        for (let i = 1; i < p.length; i++) {
          moveEntity(m, ally, p[i], 'walk');
          onHeroEnter(m, ally, p[i]);
        }
        say(m, `${actor.name} sends ${ally.name} to ${bd.nodes[ctx.node].label || 'node ' + ctx.node}.`, 'hero');
        break;
      }
      /* ---------- FORCE ---------- */
      case 'force': {
        const n = num(f.n, P, E);
        if (n <= 0) break;
        let targets = [];
        if (f.area) {
          const r = f.radius != null ? num(f.radius, P, E) : 1;
          targets = r === 1 ? foesAdj(m, actor) : foesWithin(m, actor.pos, r);
        } else {
          const t = targetEnt(m, ctx) || ctx.lastTarget;
          if (t) targets = [t];
        }
        for (const t of targets) {
          if (t.kind !== 'enemy') continue;
          let kind = f.kind;
          if (kind === 'choose') kind = ctx.choice === 'push' ? 'push' : 'pull';
          const moved = kind === 'push' ? pushAway(m, actor, t, n) : pullToward(m, actor, t, n);
          if (moved) say(m, `${t.name} is ${kind === 'push' ? 'knocked back' : 'dragged'} ${moved}.`, 'hero');
          ctx.lastTarget = t;
        }
        break;
      }
      /* ---------- INFORMATION ---------- */
      case 'reveal': {
        // Reveal (2.96 absorbs locate): within N of you everything is shown; on one foe (`target`, `nearest`), it is
        // Revealed for `dur`: it cannot be Hidden, and a zone strike finds it.
        if (f.target || f.nearest) {
          const t = f.nearest ? nearestFoe(m, actor) : targetEnt(m, ctx);
          if (!t || t.kind !== 'enemy') break;
          breakHidden(m, t, 'revealed');
          addTimed(m, t, 'Located', num(f.dur, P, E) || 1);
          ctx.lastTarget = t;
          break;
        }
        const r = num(f.radius, P, E);
        revealArea(m, actor, actor.pos, r, num(f.dur, P, E) || 1, { findObjective: !!f.findObjective });
        if (f.hintObjective && m.objective && m.objective.kind === 'find' && !m.objective.found) {
          const real = m.objective.real;
          const d = B.dist(bd, actor.pos, real, true);
          say(m, `The UV trail says the real cache is ${d} node${d === 1 ? '' : 's'} away.`, 'sys');
        }
        break;
      }
      case 'mark': {
        // Mark N (2.92): the next hit on it deals N more (2 unless it says); `pierce`, that hit ignores Shield;
        // `dur`, every hit on it deals N more for that many rounds. It absorbs Studied and Exposed.
        let targets = [];
        if (f.area) {
          const r = num(f.radius, P, E);
          targets = foesWithin(m, actor.pos, r);
        } else if (f.nearest) {
          const e = nearestFoe(m, actor);
          if (e) targets = [e];
        } else {
          const t = targetEnt(m, ctx) || ctx.lastTarget;
          if (t) targets = [t];
        }
        const n = f.n != null ? num(f.n, P, E) : 2;
        const dur = f.dur != null ? num(f.dur, P, E) : 0;
        for (const t of targets)
          if (t.kind === 'enemy' && n > 0)
            markUnit(m, t, dur > 0 ? { each: n, t: dur } : { next: n, pierce: !!f.pierce });
        if (targets.length)
          say(
            m,
            `${targets.map((t) => t.name).join(', ')} Marked +${n}${dur > 0 ? ` for ${dur} rounds` : ''}.`,
            'hero',
          );
        break;
      }
      /* ---------- SELF STATES ---------- */
      case 'hidden': {
        const d = num(f.dur, P, E);
        const list = f.party
          ? T.liveHeroes(m).filter((h) => B.dist(bd, actor.pos, h.pos, true) <= (f.radius || 0))
          : [actor];
        list.forEach((h) => setHidden(m, h, d, !!f.canMove));
        say(m, `${list.map((h) => h.name).join(' & ')} Hidden ${d}.`, 'hero');
        break;
      }
      case 'shield': {
        // Shield N (2.94 absorbs pre-empt, guard and absorb): each hit it takes is N lower for `dur` rounds; `next`,
        // only the next hit (which may `reflect` some back, or `reposition` you a step away).
        const v = num(f.val, P, E);
        if (f.next) {
          if (v <= 0) break;
          const list = f.party === true || bool(f.party, P, E) ? T.liveHeroes(m) : [actor];
          list.forEach((h) => {
            const cur = h.states.Preempt;
            h.states.Preempt = {
              v: Math.max(v, cur ? cur.v : 0),
              reflect: num(f.reflect, P, E) || 0,
              t: f.dur || 2,
              reposition: f.reposition || 0,
            };
            fx(m, { t: 'state', ent: h.uid, name: 'Preempt' });
          });
          say(m, `${list.map((h) => h.name).join(' & ')}: Shield ${v} against the next hit.`, 'hero');
          break;
        }
        if (v <= 0 && !f.min) break;
        const d = num(f.dur, P, E) || 1;
        let list = [actor];
        if (f.party || f.ally) {
          list = T.liveHeroes(m).filter(
            (h) =>
              h === actor || B.dist(bd, actor.pos, h.pos, true) <= (f.allyRange != null ? num(f.allyRange, P, E) : 99),
          );
        }
        list.forEach((h) => addShield(m, h, Math.max(v, f.min || 0), d, !!f.all));
        say(
          m,
          `${list.map((h) => h.name).join(' & ')}: Shield ${Math.max(v, f.min || 0)}${f.all ? ' (all)' : ''} for ${d}.`,
          'hero',
        );
        break;
      }
      case 'anchor': {
        const d = num(f.dur, P, E);
        if (d <= 0) break;
        const chosen = isHero; // a hero's own anchor on itself or an ally is a choice, not a status put on it
        if (f.who === 'self') {
          anchorEnt(m, actor, d, chosen);
          say(m, `${actor.name} anchors (${d}).`, 'hero');
        } else if (f.who === 'ally') {
          if (ally && !ally.downed && (!f.adjacent || B.adjacent(bd, actor.pos, ally.pos))) {
            anchorEnt(m, ally, d, chosen);
            say(m, `${ally.name} anchored (${d}).`, 'hero');
          }
        } else {
          const t = targetEnt(m, ctx) || ctx.lastTarget;
          if (!t) break;
          if (t.kind === 'enemy') {
            anchorEnt(m, t, d);
            say(m, `${t.name} Anchored ${d}.`, 'hero');
          } else if (t.kind === 'hero') {
            anchorEnt(m, t, d, chosen);
          }
        }
        break;
      }
      case 'weaken': {
        const v = num(f.val, P, E);
        if (v <= 0) break;
        const d = num(f.dur, P, E) || 1;
        let targets = [];
        if (f.area === 'adj') targets = foesAdj(m, actor);
        else if (f.area === 'all') targets = T.liveEnemies(m);
        else if (f.area === 'zone') targets = T.liveEnemies(m).filter((e) => B.los(bd, actor.pos, e.pos));
        else if (f.area === 'radius') targets = foesWithin(m, actor.pos, num(f.radius, P, E));
        else if (f.area === 'adjParty') {
          const set = new Set();
          T.liveHeroes(m).forEach((h) => foesAdj(m, h).forEach((e) => set.add(e)));
          targets = [...set];
        } else {
          const t = targetEnt(m, ctx) || ctx.lastTarget;
          if (t) targets = [t];
        }
        targets.filter((t) => t.kind === 'enemy').forEach((t) => weaken(m, t, v, d));
        if (targets.length) say(m, `Weakened ${v}: ${targets.map((t) => t.name).join(', ')}.`, 'hero');
        break;
      }
      case 'empower': {
        const v = num(f.val, P, E);
        if (v <= 0 && !f.pierce) break;
        const list = f.party ? T.liveHeroes(m) : f.target === 'ally' ? (ally && !ally.downed ? [ally] : []) : [actor];
        list.forEach((h) => {
          h.states.Empower = h.states.Empower || [];
          // `stack` (a weapon's Overcharge, 2.108): a second one adds to the first instead of waiting behind it
          const same =
            f.stack &&
            h.states.Empower.find((e) => e.stack && JSON.stringify(e.kind) === JSON.stringify(f.kind || null));
          if (same) {
            same.v += v;
            same.t = Math.max(same.t || 0, num(f.dur, P, E) || 0) || null;
            fx(m, { t: 'state', ent: h.uid, name: 'Empower' });
            return;
          }
          const e = { v, uses: f.uses || 1, kind: f.kind || null, pierce: !!f.pierce, t: num(f.dur, P, E) || null };
          if (f.stack) e.stack = true;
          h.states.Empower.push(e);
          fx(m, { t: 'state', ent: h.uid, name: 'Empower' });
        });
        if (list.length)
          say(m, `${list.map((h) => h.name).join(' & ')}: next strike +${v}${f.pierce ? ' (pierce)' : ''}.`, 'hero');
        break;
      }
      case 'thorns': {
        // Thorns N: anything that strikes you in melee takes N, for `dur` rounds; `next`, only the next one (and
        // `push` pushes it back). It absorbs Counter.
        const n = num(f.val, P, E);
        const d = num(f.dur, P, E) || 1;
        if (n <= 0) break;
        const th = st(actor).Thorns || {};
        if (f.next) {
          th.next = Math.max(th.next || 0, n);
          if (f.push) th.push = Math.max(th.push || 0, num(f.push, P, E));
        } else th.v = Math.max(th.v || 0, n);
        th.t = Math.max(th.t || 0, d);
        st(actor).Thorns = th;
        fx(m, { t: 'state', ent: actor.uid, name: 'Thorns' });
        say(m, `${actor.name} grows Thorns (${n}${f.next ? ', the next melee hit' : ''}).`, 'hero');
        break;
      }
      case 'stasis':
        addTimed(m, actor, 'Stasis', num(f.dur, P, E) || 1);
        say(m, `${actor.name} steps outside time.`, 'hero');
        break;
      case 'hover':
        // Hover N (2.102): off the ground for N rounds: no hazard or Field touches you, nothing pushes or pulls you,
        // and your steps may take the ledges. It folds in Weightless, and no longer mints AP.
        addTimed(m, actor, 'Hover', num(f.dur, P, E));
        say(m, `${actor.name} lifts off the ground.`, 'hero');
        break;
      case 'hazardImmune': {
        const d = num(f.dur, P, E);
        if (d <= 0) break;
        const list = f.party ? T.liveHeroes(m) : [actor];
        list.forEach((h) => addTimed(m, h, 'HazardImmune', d));
        break;
      }
      case 'morph': {
        const d = num(f.dur, P, E);
        actor.states.Morph = {
          bonus: num(f.bonus, P, E),
          climb: !!f.climb,
          reach: f.reach || 0,
          move: f.move || 0,
          t: d,
        };
        if (f.crash != null) actor.states.Morph.crash = num(f.crash, P, E);
        if (f.push != null) actor.states.Morph.push = num(f.push, P, E);
        if (f.shield) addShield(m, actor, f.shield, d, false);
        say(
          m,
          `${actor.name} changes form (+${num(f.bonus, P, E)} strikes${f.reach ? ', reach' : ''}${f.climb ? ', climb' : ''}) for ${d}.`,
          'hero',
        );
        break;
      }
      case 'rest':
        actor.rested = true;
        say(m, `${actor.name} goes still.`, 'hero');
        break;

      case 'heal': {
        // Heal N (2.90): restore N vitality; a downed pilot it reaches gets up with N. `ward: R` holds it
        // instead: if you go down within R rounds, it lands then and you get up with N.
        const n = num(met ? f.n : f.elseVal, P, E);
        if (n <= 0) break;
        if (f.ward != null) {
          actor.states.Phoenix = { hp: n, t: num(f.ward, P, E) };
          say(m, `${actor.name} holds a Heal in reserve (${n} if downed within ${num(f.ward, P, E)}).`, 'hero');
          break;
        }
        let list = [actor];
        if (f.party) list = isHero ? m.heroes.slice() : [actor];
        else if (f.target === 'ally') list = ally ? [ally] : [];
        else if (f.target === 'chosenAlly') {
          const t = targetEnt(m, ctx);
          list = t && t.kind === 'hero' ? [t] : [actor];
        } else if (f.target === 'downedAdj') {
          const t = isHero ? T.downedAllyOf(m, actor) : null;
          list = t && t.downed && B.adjacent(bd, actor.pos, t.pos) ? [t] : [];
          if (!list.length) say(m, 'No downed ally beside you.', 'sys');
        }
        list.forEach((h) => {
          let amt = n;
          if (f.doubleIfLow && h.hp < h.maxHp / 4) amt *= 2;
          healUnit(m, h, amt);
          linkHeal(m, h, amt);
        });
        if (list.length)
          say(m, `${list.map((h) => h.name).join(' & ')} heal${list.length > 1 ? '' : 's'} ${n}.`, 'hero');
        break;
      }
      case 'cleanse': {
        if (f.field != null) {
          // Cleanse the ground: hazards and foes' Fields within `field` of you are cleared.
          const r = num(f.field, P, E);
          const near = new Set([actor.pos].concat(B.within(bd, actor.pos, r, true)));
          near.forEach((n) => (bd.nodes[n].hazard = false));
          m.fields = m.fields.filter(
            (z) => z.side === (actor.kind === 'enemy' ? 'enemy' : 'hero') || !fieldNodes(m, z).some((n) => near.has(n)),
          );
          say(m, `${actor.name} cleanses the ground nearby.`, 'hero');
          if (!f.states) break;
        }
        // Cleanse for N (2.95 absorbs status immunity): shed every harmful state, and for N rounds no foe can
        // Weaken or Anchor you
        if (f.ward != null) {
          const w = num(f.ward, P, E);
          (f.party ? T.liveHeroes(m) : [actor]).forEach((h) =>
            ['Weak', 'Wound', 'Anchored'].forEach((k) => delete h.states[k]),
          );
          if (w > 0) addTimed(m, actor, 'StatusImmune', w);
          say(m, `${actor.name} is Cleansed${w > 0 ? ` and stays clean for ${w}` : ''}.`, 'hero');
          break;
        }
        const list = f.party ? T.liveHeroes(m) : [actor];
        list.forEach((h) => {
          ['Anchored', 'Weak', 'Wound'].forEach((k) => delete h.states[k]);
        });
        say(m, `${list.map((h) => h.name).join(' & ')} shake free.`, 'hero');
        break;
      }
      case 'mint': {
        const n = num(f.n, P, E);
        if (n <= 0) break;
        const list = f.target === 'ally' ? (ally && !ally.downed ? [ally] : []) : [actor];
        list.forEach((h) => T.mint(h, f.face, n));
        if (list.length)
          say(
            m,
            `${list.map((h) => h.name).join(' & ')} mint${list.length > 1 ? '' : 's'} ${n} ${f.face === 'O' ? 'Omni' : f.face === 'AP' ? 'AP' : T.ETHERIONS[f.face].name}.`,
            'hero',
          );
        break;
      }
      case 'draw': {
        const n = num(f.n, P, E);
        const got = T.draw(actor, f.face, n);
        say(m, got ? `${actor.name} draws ${got} ${f.face} from the pool.` : `${actor.name}'s pool is empty.`, 'hero');
        break;
      }
      case 'reroll': {
        ctx.pendingReroll = num(f.n, P, E);
        say(m, `${actor.name} may reroll ${ctx.pendingReroll} banked dice.`, 'sys');
        break;
      }
      case 'haste': {
        // Haste N (2.95, one keyword for hasten, clock and freecast): your track slides N extra columns; `clock`,
        // the mission clock gains N rounds; `free`, the next N cards you play do not go to the track.
        const n = num(f.n, P, E);
        if (f.clock) {
          if (m.clock) {
            m.clock.value += n;
            say(m, `The clock gains ${n}.`, 'sys');
          }
          if (m.hazardSpread) m.hazardSpread.delayed += Math.max(0, n);
          break;
        }
        if (n <= 0) break;
        if (f.free) {
          // dur: the offer lapses after that many round ends (1 = "this turn"); without it, it waits
          const t = num(f.dur, P, E) || null;
          (actor.states.Freecast = actor.states.Freecast || []).push({ n, t });
          say(
            m,
            `${actor.name}: the next ${n} card${n > 1 ? 's' : ''}${t === 1 ? ' this turn' : ''} won't go to the track.`,
            'hero',
          );
          break;
        }
        const list = f.who === 'ally' ? (ally ? [ally] : []) : [actor];
        list.forEach((h) => T.hasten(h, n));
        say(m, `${list.map((h) => h.name).join(' & ')}: track slides ${n} extra.`, 'hero');
        break;
      }
      case 'engine': {
        const d = num(f.dur, P, E) || (ctx.card ? ctx.card[ctx.faceKey].dur : 3);
        const list = f.party ? T.liveHeroes(m) : f.target === 'ally' ? (ally ? [ally] : []) : [actor];
        list.forEach((h) => {
          h.states.Engines = h.states.Engines || [];
          h.states.Engines.push({
            kind: f.kind,
            val: num(f.val, P, E),
            face: (typeof f.face === 'function' ? f.face(P, E) : f.face) || null,
            t: d,
            cleanse: bool(f.cleanse, P, E),
            mintAlt: num(f.mintAlt, P, E),
          });
          fx(m, { t: 'state', ent: h.uid, name: 'Engine' });
        });
        say(m, `${list.map((h) => h.name).join(' & ')}: ${f.kind} engine for ${d}.`, 'hero');
        break;
      }
      /* ---------- BOARD ---------- */
      case 'field': {
        // Lay a Field: on a chosen space (and the spaces within `radius` of it), or around you (`around`).
        const around = f.around ? actor.uid : null;
        const radius = num(f.radius, P, E) || 0;
        let nodes = null;
        if (around == null) {
          const c = ctx.node != null ? ctx.node : actor.pos;
          if (f.remote != null && (B.dist(bd, actor.pos, c, true) > num(f.remote, P, E) || bd.nodes[c].height)) {
            say(m, 'Too far to set.', 'sys');
            break;
          }
          nodes = [c].concat(radius ? B.within(bd, c, radius, true) : []);
        }
        const fl = {
          nodes,
          around,
          radius,
          ring: !!f.ring,
          on: f.on || 'end',
          trips: f.trips != null ? num(f.trips, P, E) : null,
          t: f.dur != null ? num(f.dur, P, E) + (actor.kind === 'hero' ? boonSum(actor, 'fieldDur') : 0) : null,
          owner: actor.uid,
          side: actor.kind === 'enemy' ? 'enemy' : 'hero',
          label: f.label || null,
          fx: f.fx
            .map((x) => {
              const o = { kw: x.kw, n: num(x.n, P, E) || 0, t: x.t != null ? num(x.t, P, E) : 1 };
              if (x.pierce) o.pierce = true;
              if (x.if) o.if = x.if;
              if (x.noTele) o.noTele = true;
              return o;
            })
            .filter((x) => (['strike', 'weaken', 'pull', 'push', 'heal'].includes(x.kw) ? x.n > 0 : x.t > 0)),
        };
        m.fields.push(fl);
        if (fl.fx.some((x) => x.kw === 'reveal')) revealArea(m, actor, nodes ? nodes[0] : actor.pos, radius, 1);
        say(m, `${actor.name} lays a Field ${around != null ? 'around themself' : 'on node ' + nodes[0]}.`, 'hero');
        fx(m, { t: 'trapSet', node: nodes ? nodes[0] : actor.pos });
        break;
      }
      case 'decoy': {
        let node = f.here ? actor.pos : ctx.node;
        if (node == null) node = B.walkNeighbors(bd, actor.pos).find((n) => !T.occupied(m, n));
        if (f.here) {
          /* decoy stays where actor WAS; actor will teleport after */
        }
        if (node == null) break;
        const d = {
          kind: 'decoy',
          uid: nextUid(m),
          name: 'decoy',
          pos: node,
          hp: 6,
          t: num(f.dur, P, E),
          owner: actor.uid,
          strike: num(f.strike, P, E),
        };
        if (f.here) ctx.pendingDecoy = d;
        else {
          if (T.occupied(m, node)) break;
          m.decoys.push(d);
          say(m, `${actor.name} leaves a decoy on node ${node}.`, 'hero');
          fx(m, { t: 'decoy', node });
        }
        break;
      }
      case 'interact': {
        const range = num(f.range, P, E);
        const node = ctx.node;
        if (node == null) break;
        if (B.dist(bd, actor.pos, node, true) > range) {
          say(m, 'Too far.', 'sys');
          break;
        }
        if (!f.height && bd.nodes[node].height && actor.pos !== node) {
          say(m, 'That one needs someone up on the ledge.', 'sys');
          break;
        }
        T.doInteract(m, actor, node, true);
        break;
      }
      case 'link': {
        // Link the target to the nearest other unit of its side within `within` of it.
        const t = targetEnt(m, ctx);
        const dur = num(f.dur, P, E) || 1;
        const within = num(f.within, P, E) || 1;
        if (!standing(t)) break;
        const o = nearestKin(m, t, within);
        if (!o) {
          say(m, `Nothing near ${t.name} to Link it to.`, 'sys');
          break;
        }
        linkUnits(m, t, o, dur);
        break;
      }
      default:
        say(m, `(unimplemented verb ${f.v})`, 'sys');
    }
    // deferred decoy placement (husk/blink): place at origin after teleport
    if (ctx.pendingDecoy && f.v === 'blink') {
      const d = ctx.pendingDecoy;
      if (!T.occupied(m, d.pos)) {
        m.decoys.push(d);
        say(m, `A decoy remains behind.`, 'hero');
        fx(m, { t: 'decoy', node: d.pos });
      }
      ctx.pendingDecoy = null;
    }
  };
  // a 'here' decoy with no teleport afterwards (e.g. Drop Tail then move): place it once the face is done. If the
  // hero never left (a face with no move, or a move that could not happen), the decoy stands on the hero's own
  // node with them, as the card says ("a decoy holds your spot"), and stays there when they go.
  const origRun = T.runEffects;
  T.runEffects = function (m, actor, fxs, ctx) {
    origRun(m, actor, fxs, ctx);
    if (ctx.pendingDecoy) {
      const d = ctx.pendingDecoy;
      const occ = T.entityAt(m, d.pos);
      if (!occ || occ === actor) {
        m.decoys.push(d);
        say(m, occ ? `A decoy stands with ${actor.name}.` : `A decoy remains behind.`, 'hero');
        fx(m, { t: 'decoy', node: d.pos });
      }
      ctx.pendingDecoy = null;
    }
  };

  /** Survey: a veiled mark within `radius` of a node is sighted, and can be tagged from then on. */
  function sightMarks(m, nodes, who) {
    if (!m.objective || m.objective.kind !== 'survey') return;
    for (const n of nodes) {
      const o = m.board.nodes[n] && m.board.nodes[n].objective;
      if (o && o.kind === 'mark' && o.veiled) {
        o.veiled = false;
        say(m, `${who} sights a survey mark on node ${n}.`, 'sys');
      }
    }
  }
  T.sightAround = function (m, h) {
    sightMarks(m, [h.pos].concat(B.within(m.board, h.pos, 1, true)), h.name);
  };
  function onHeroEnter(m, h, node) {
    T.sightAround(m, h);
    // cache search on foot
    if (m.objective && m.objective.kind === 'find') {
      const nd = m.board.nodes[node];
      if (nd.objective && nd.objective.kind === 'cache' && !nd.objective.searched) {
        nd.objective.searched = true;
        if (nd.objective.real) {
          m.objective.found = true;
          if (m.stats.foundRound == null) m.stats.foundRound = m.round;
          say(m, `${h.name} finds the real cache!`, 'sys');
        } else say(m, `${h.name} searches node ${node}: a decoy.`, 'sys');
      }
    }
  }

  /* ───────────────────────────── BASIC ACTIONS ───────────────────────────── */
  T.walk = function (m, h, dest) {
    if (h.downed || h.rested) return { ok: false, why: 'cannot act' };
    if (h.ride != null) return { ok: false, why: 'inside a vehicle: drive, or get out' };
    if (isAnchored(h)) return { ok: false, why: 'Anchored' };
    const bd = m.board;
    const free = h.freeMove || 0;
    const climber = canClimb(h);
    if (bd.nodes[dest].height && !climber && !bd.ramp) return { ok: false, why: 'height' };
    const p = B.path(
      bd,
      h.pos,
      dest,
      new Set(
        T.liveEnemies(m)
          .map((e) => e.pos)
          .concat(m.decoys.map((d) => d.pos)),
      ),
      climber,
    );
    if (!p || p.length < 2) return { ok: false, why: 'no path' };
    if (!T.freeFor(m, h, dest)) return { ok: false, why: 'occupied' };
    const steps = p.length - 1;
    const bonus = st(h).Morph && st(h).Morph.move ? 1 : 0;
    const payable = Math.max(0, steps - free - bonus);
    if (T.apValue(h) < payable) return { ok: false, why: 'need ' + payable + ' AP' };
    T.pay(h, payable);
    h.freeMove = Math.max(0, free - steps);
    for (let i = 1; i < p.length; i++) {
      moveEntity(m, h, p[i], 'walk');
      onHeroEnter(m, h, p[i]);
    }
    say(m, `${h.name} moves to node ${dest}${payable ? ` (${payable} AP)` : ' (free)'}.`, 'hero');
    T.afterAction(m);
    return { ok: true };
  };
  /**
   * Survey marks can be tagged with a die of their own element (Omni counts) instead of 2 AP.
   * 'el' when that is the payment asked for, or the only one the hero can make; else 'ap'.
   */
  const MARK_EL = { M: 'Mass', C: 'Charge', S: 'Space', T: 'Time' };
  T.markPay = function (h, o, pay) {
    const el = o && o.kind === 'mark' && o.el && T.elCount(h, o.el) + T.omniCount(h) > 0;
    const ap = T.apValue(h) >= R().INTERACT_AP;
    if (pay === 'el') return el ? 'el' : null;
    if (pay === 'ap') return ap ? 'ap' : null;
    return ap ? 'ap' : el ? 'el' : null;
  };
  T.doInteract = function (m, h, node, viaAbility, pay) {
    const bd = m.board;
    const nd = bd.nodes[node];
    const ob = m.objective;
    if (!nd || !nd.objective) return { ok: false, why: 'nothing here' };
    if (h.ride != null) return { ok: false, why: 'get out first: objectives are worked on foot' };
    const here = h.pos === node,
      adj = B.adjacent(bd, h.pos, node);
    if (nd.objective.kind === 'crate' && h.carrying) return { ok: false, why: 'already carrying a crate' };
    if (nd.objective.kind === 'dock') return { ok: false, why: 'carry a crate here: it is delivered as you arrive' };
    if (nd.objective.kind === 'mark' && nd.objective.veiled)
      return { ok: false, why: 'veiled: sight it first (stand within 1, or reveal it)' };
    if (!viaAbility) {
      if (nd.objective.kind === 'mark' && !here) return { ok: false, why: 'stand on the mark to tag it' };
      if (!(here || (adj && !nd.height)))
        return { ok: false, why: nd.height ? 'must stand on the ledge (or use a Reach verb)' : 'not adjacent' };
      if (nd.objective.kind === 'mark') {
        const how = T.markPay(h, nd.objective, pay);
        if (!how) return { ok: false, why: `need 2 AP or a ${MARK_EL[nd.objective.el]} die` };
        if (how === 'el') T.pay(h, 0, nd.objective.el, 1);
        else T.pay(h, R().INTERACT_AP);
      } else {
        if (T.apValue(h) < R().INTERACT_AP) return { ok: false, why: 'need 2 AP' };
        T.pay(h, R().INTERACT_AP);
      }
    }
    const k = nd.objective.kind;
    if (k === 'vault' && ob.kind === 'vault') {
      ob.done = (ob.done || 0) + 1;
      say(m, `${h.name} breaks a seal (${ob.done}/${ob.need || 1}).`, 'sys');
      if (ob.done >= (ob.need || 1)) {
        m.won = true;
        say(m, 'The vault opens.', 'sys');
      }
    } else if (k === 'lever' && ob.kind === 'vault') {
      ob.leverDone++;
      say(m, `${h.name} cranks the winch (${ob.leverDone}/${ob.leverNeed}).`, 'sys');
      if (ob.leverDone >= ob.leverNeed && !bd.ramp) {
        bd.ramp = true;
        say(m, `A ramp drops to the ledge — anyone can walk up now.`, 'sys');
        fx(m, { t: 'ramp' });
      }
    } else if (k === 'valve' && ob.kind === 'valve') {
      ob.done++;
      say(m, `${h.name} channels the valve (${ob.done}/${ob.need}).`, 'sys');
      if (ob.done >= ob.need) {
        m.won = true;
        say(m, 'The flood stops.', 'sys');
      }
    } else if (k === 'cache' && ob.kind === 'find') {
      if (!nd.objective.searched) {
        nd.objective.searched = true;
        if (nd.objective.real) {
          ob.found = true;
          if (m.stats.foundRound == null) m.stats.foundRound = m.round;
        }
      }
      if (nd.objective.real) {
        ob.done = (ob.done || 0) + 1;
        say(m, `${h.name} digs at the cache (${ob.done}/${ob.need || 1}).`, 'sys');
        if (ob.done >= (ob.need || 1)) {
          ob.extracted = true;
          m.won = true;
          say(m, 'The cache is out.', 'sys');
        }
      } else say(m, `A decoy cache.`, 'sys');
    } else if (k === 'crate' && ob.kind === 'salvage') {
      if (h.carrying) return { ok: false, why: 'already carrying a crate' };
      delete nd.objective;
      h.carrying = 1;
      say(m, `${h.name} shoulders a crate.`, 'sys');
    } else if (k === 'mark' && ob.kind === 'survey') {
      delete nd.objective;
      ob.done++;
      say(m, `${h.name} tags a survey mark (${ob.done}/${ob.need}).`, 'sys');
      if (ob.done >= ob.need) {
        m.won = true;
        say(m, 'The survey is done before nightfall.', 'sys');
      }
    } else if (k === 'dock') {
      return { ok: false, why: 'carry a crate here: it is delivered as you arrive' };
    } else if (k === 'beacon') {
      say(m, 'The beacon only needs you near it at round end.', 'sys');
      return { ok: false, why: 'no interaction' };
    } else return { ok: false, why: 'nothing to do' };
    fx(m, { t: 'interact', node });
    T.afterAction(m);
    return { ok: true };
  };
  T.rally = function (m, h) {
    const ally = T.downedAllyOf(m, h);
    if (!ally || !ally.downed) return { ok: false, why: 'no downed ally' };
    if (h.ride != null) return { ok: false, why: 'get out first' };
    if (!B.adjacent(m.board, h.pos, ally.pos)) return { ok: false, why: 'not adjacent' };
    if (T.apValue(h) < R().RALLY_AP) return { ok: false, why: 'need 2 AP' };
    T.pay(h, R().RALLY_AP);
    ally.downed = false;
    ally.hp = R().RALLY_HP;
    say(m, `${h.name} rallies ${ally.name} back to their feet (${R().RALLY_HP}).`, 'sys');
    fx(m, { t: 'revive', ent: ally.uid });
    T.afterAction(m);
    return { ok: true };
  };
  /**
   * Heel (src/data/pets.js): for T.PET.HEEL_AP, one of the hero's pets moves up to T.PET.SPEED, a walk like any
   * other (through the squad, around foes), and may end on its pilot's node.
   */
  /** Is this body (the pilot, or a pet of theirs) inside a vehicle? A pet on its riding pilot's node rides along. */
  T.ridingWith = (m, h, body) => h.ride != null && (body === h || body.pos === h.pos);
  /** Is this face Mounted? A pet card's face is Mounted when the trait face it was made from is. */
  T.isMountedFace = (card, faceKey) =>
    card.gear ? false : card.pet ? T.isMounted(T.CARD[card[faceKey].from], 'P') : T.isMounted(card, faceKey);
  T.heelTargets = function (m, h, petUid) {
    const p = T.petsOf(m, h).find((x) => x.uid === petUid);
    if (!p || isAnchored(p) || T.ridingWith(m, h, p)) return [];
    return T.reachableWalk(m, p, T.PET.SPEED, false);
  };
  T.canHeel = function (m, h, petUid) {
    if (h.downed || h.rested) return { ok: false, why: h.downed ? 'downed' : 'resting' };
    const p = T.petsOf(m, h).find((x) => x.uid === petUid);
    if (!p) return { ok: false, why: 'no such pet' };
    if (isAnchored(p)) return { ok: false, why: 'Anchored' };
    if (T.ridingWith(m, h, p)) return { ok: false, why: 'riding with you' };
    if (T.apValue(h) < T.PET.HEEL_AP) return { ok: false, why: 'need ' + T.PET.HEEL_AP + ' AP' };
    const options = T.heelTargets(m, h, petUid);
    if (!options.length) return { ok: false, why: 'nowhere to go' };
    return { ok: true, options };
  };
  T.heel = function (m, h, petUid, node) {
    const chk = T.canHeel(m, h, petUid);
    if (!chk.ok) return chk;
    if (!chk.options.includes(node)) return { ok: false, why: 'out of reach' };
    const p = T.petsOf(m, h).find((x) => x.uid === petUid);
    T.pay(h, T.PET.HEEL_AP);
    const from = p.pos;
    moveEntity(m, p, node, 'walk');
    onHeroEnter(m, p, node);
    say(m, `${h.name} calls ${p.name} to heel: ${from} → ${node}.`, 'hero');
    T.afterAction(m);
    return { ok: true };
  };
  /** Can this hero take this basic action now? Returns { ok, why?, tg? } like T.canPlay. */
  T.canUseBasic = function (m, h, id, pick) {
    const b = T.BASIC_BY[id];
    if (!b) return { ok: false, why: 'unknown action' };
    if (h.downed || h.rested) return { ok: false, why: h.downed ? 'downed' : 'resting' };
    if (h.ride != null) return { ok: false, why: 'inside a vehicle: its cards, or a Mounted face' };
    if (T.apValue(h) < b.ap) return { ok: false, why: 'need ' + b.ap + ' AP' };
    if (b.el && !T.canPay(h, b.ap, b.el, 1)) return { ok: false, why: 'needs ' + b.el + ' (or Omni)' };
    const tg = T.targetsFor(m, h, b.tgt, b, 0, 0, pick);
    if (tg.invalid) return { ok: false, why: tg.invalid };
    if (tg.need !== 'none' && (!tg.options || !tg.options.length)) return { ok: false, why: 'no valid target' };
    return { ok: true, tg };
  };
  /** A basic action (T.BASIC): pay its AP and run its verbs. It never goes on the track. */
  T.useBasic = function (m, h, id, ctx) {
    const chk = T.canUseBasic(m, h, id, ctx && ctx.ally);
    if (!chk.ok) return chk;
    const al = allyFor(m, chk.tg, ctx);
    if (!al.ok) return al;
    const b = T.BASIC_BY[id];
    T.pay(h, b.ap, b.el, b.el ? 1 : 0);
    say(m, `${h.name}: ${b.n} (${b.ap} AP${b.el ? ' + ' + b.el + ', channelled' : ''}).`, 'hero');
    const rctx = Object.assign({}, ctx || {}, { P: 0, E: 0 });
    if (al.ally != null) rctx.ally = al.ally;
    T.runEffects(m, h, b.fx, rctx);
    T.afterAction(m);
    return { ok: true, ctx: rctx };
  };
  /** What a gear ability costs, as a player reads it: omnicrystals from the purse, or banked Omni dice (2.108). */
  T.gearCostText = (ab) => (ab.omni ? `${ab.omni} Omni` : 'free');
  /** How a gear ability is used, in a few words: its cost, and whether it is played from the gear's card. */
  T.gearUseText = (ab) =>
    `${T.gearCostText(ab)} · ${T.onGearCard(ab) ? `on its card, cooldown ${ab.cd}` : 'from the gear, no cooldown'}`;
  /** The line a shop shows under a piece of gear whose abilities sit on a card. */
  T.gearCardNote = (g) => (g.card ? 'Its card joins your kit and counts toward the nine.' : '');
  /** Whether this pilot can pay for and use this gear ability now, leaving aside its target. */
  T.canUseGear = function (m, h, gi, ai) {
    const g = h.gear[gi];
    if (!g) return { ok: false };
    const ab = T.GEAR_BY[g.id].abilities[ai];
    if (h.downed || h.rested) return { ok: false, why: 'cannot act' };
    if (h.ride != null) return { ok: false, why: 'inside a vehicle: its cards, or a Mounted face' };
    // an ability with a cooldown is played from the gear's card in the kit (2.119), not from the gear
    if (T.onGearCard(ab)) return { ok: false, why: 'on its card' };
    if (g.cds[ai] > 0) return { ok: false, why: 'cooling' };
    if (ab.omni && T.omniCount(h) < ab.omni) return { ok: false, why: 'need a banked Omni' };
    return { ok: true };
  };
  T.useGear = function (m, h, gi, ai, ctx) {
    const g = h.gear[gi];
    if (!g) return { ok: false };
    const def = T.GEAR_BY[g.id];
    const ab = def.abilities[ai];
    const can = T.canUseGear(m, h, gi, ai);
    if (!can.ok) return can;
    const tg = T.targetsFor(m, h, ab.tgt, ab, 0, 0, ctx && ctx.ally);
    if (tg.need !== 'none' && (!tg.options || !tg.options.length)) return { ok: false, why: 'no target' };
    const al = allyFor(m, tg, ctx);
    if (!al.ok) return al;
    if (ab.omni) T.pay(h, 0, 'O', ab.omni);
    g.cds[ai] = ab.cd;
    say(m, `${h.name} uses ${def.name} — ${ab.n} (${T.gearCostText(ab)}).`, 'hero');
    fx(m, { t: 'gear', hero: h.uid });
    const rctx = ctx || {};
    Object.assign(rctx, { P: 0, E: 0 });
    if (al.ally != null) rctx.ally = al.ally;
    T.runEffects(m, h, ab.fx, rctx);
    T.afterAction(m);
    return { ok: true, ctx: rctx };
  };
  T.useConsumable = function (m, h, ci) {
    const c = h.consumables[ci];
    if (!c) return { ok: false };
    const def = T.CONSUMABLE_BY[c];
    if (h.downed) return { ok: false };
    h.consumables.splice(ci, 1);
    say(m, `${h.name} uses ${def.name}.`, 'hero');
    T.runEffects(m, h, def.fx, { P: 0, E: 0 });
    T.afterAction(m);
    return { ok: true };
  };
  T.afterAction = function (m) {
    T.checkEnd(m);
  };

  /* ───────────────────────────── ROUND STRUCTURE ───────────────────────────── */
  T.beginRound = function (m) {
    m.round += 1;
    if (m.vehicles) m.vehicles.forEach((v) => (v.used = [])); // a vehicle's cards are once a round
    m.phase = 'hero';
    say(m, `— Round ${m.round} —`, 'sys');
    // spawns
    spawnWave(m);
    for (const e of T.liveEnemies(m))
      if (e.spawnEvery) {
        e.spawnCounter++;
        if (e.spawnCounter >= e.spawnEvery) {
          e.spawnCounter = 0;
          const spot = B.walkNeighbors(m.board, e.pos).find((n) => !T.occupied(m, n));
          if (spot) {
            const b = T.spawnEnemy(m, T.ENEMIES[e.type].spawns, Math.max(1, m.tier - 1), spot);
            say(m, `${e.name} spawns a ${b.name}.`, 'enemy');
            fx(m, { t: 'spawn', ent: b.uid, pos: spot });
          }
        }
      }
    // enemy intents
    T.chooseIntents(m);
    // hero turn starts
    for (const h of m.heroes) {
      h.rested = false;
      h.freeMove = 0;
      h.roundFlags = { struck: false }; // downed heroes too: one rallied mid-round has not struck yet
      if (h.downed) continue;
      T.sightAround(m, h);
      T.heroTurnStart(m, h);
    }
    for (const h of m.heroes) delete h.rolledAhead;
    m.fx.push({ t: 'round', round: m.round });
  };
  function spawnWave(m) {
    for (const sp of m.spawns) {
      if (m.round < sp.startRound) continue;
      const liveSwarm = m.enemies.filter((e) => e.alive && e.spawned).length;
      if (liveSwarm >= sp.max) continue;
      const foes = T.stream(m.rngs, 'foes');
      const nodes = foes.shuffle(sp.nodes).filter((n) => !T.occupied(m, n));
      if (!nodes.length) continue;
      const count = m.tier >= 2 && m.round % 2 === 0 ? 2 : 1;
      for (let i = 0; i < count && i < nodes.length; i++) {
        const type = foes.pick(sp.pool);
        const e = T.spawnEnemy(m, type, m.tier, nodes[i]);
        e.spawned = true;
        m.spawnedCount++;
        say(m, `A ${e.name} emerges from the spawn-node.`, 'enemy');
        fx(m, { t: 'spawn', ent: e.uid, pos: nodes[i] });
      }
    }
  }
  T.heroTurnStart = function (m, h) {
    T.slideTrack(h, 1);
    for (const v of T.boonVals(h, 'roundStart')) if (v.round === m.round && v.hasten) T.slideTrack(h, v.hasten);
    // engines
    for (const en of h.states.Engines || []) {
      if (en.kind === 'regen') {
        const b = h.hp;
        h.hp = Math.min(h.maxHp, h.hp + en.val);
        if (h.hp > b) {
          say(m, `${h.name} regenerates ${h.hp - b}.`, 'hero');
          fx(m, { t: 'heal', ent: h.uid, amount: h.hp - b });
        }
        if (en.cleanse) ['Anchored', 'Weak'].forEach((k) => delete h.states[k]);
      } else if (en.kind === 'draw') {
        if (en.mintAlt) T.mint(h, en.face || 'C', en.mintAlt);
        else T.draw(h, en.face || 'C', en.val || 1);
        say(m, `${h.name}'s engine yields ${en.face || 'C'}.`, 'hero');
      } else if (en.kind === 'ap') {
        T.mint(h, 'AP', en.val || 1);
      }
    }
    if (!h.rolledAhead) T.rollDice(m, h);
    // keen sense
    if (T.boonVals(h, 'keen').length)
      for (const e of T.liveEnemies(m))
        if (isHidden(e) && B.adjacent(m.board, h.pos, e.pos)) breakHidden(m, e, 'keen sense');
    // a lantern spots the nearest foe
    for (const r of T.boonVals(h, 'spot')) {
      const near = T.liveEnemies(m)
        .filter((e) => !isHidden(e) && B.dist(m.board, h.pos, e.pos, true) <= r)
        .sort((a, b) => B.dist(m.board, h.pos, a.pos, true) - B.dist(m.board, h.pos, b.pos, true) || a.uid - b.uid)[0];
      if (near && !(st(near).Marked && st(near).Marked.next)) markUnit(m, near, { next: 2 });
    }
  };

  /**
   * Play out the rest of the round once the squad has stopped: the enemies do what they declared,
   * then the round ends. Nothing here is random — which is what lets a player look ahead.
   */
  T.finishRound = function (m) {
    if (m.over) return;
    m.phase = 'enemy';
    for (const h of m.heroes) {
      h.temp = [];
      h.freeMove = 0;
    }
    T.enemyPhase(m);
    if (!m.over) T.roundEnd(m);
  };
  /** End the squad's phase: finish the round, then begin the next (new dice, reinforcements, new intents). */
  T.endHeroPhase = function (m) {
    T.finishRound(m);
    if (!m.over) T.beginRound(m);
  };

  /**
   * The wind moves every unit 1 space downwind: to the walkable neighbour furthest along the wind
   * (at least half a space), if it is free. A shield, an anchor or a hover holds a unit, and the boss
   * stands. Units furthest downwind move first, so nobody is blocked by someone about to move.
   */
  T.blowWind = function (m) {
    const dir = m.place.wind || 1;
    const x = (n) => m.board.nodes[n].x * dir;
    const units = T.liveHeroes(m)
      .concat(T.liveEnemies(m))
      .filter((u) => !u.boss && !forceImmune(u) && !st(u).Shield)
      .sort((a, b) => x(b.pos) - x(a.pos) || a.uid - b.uid);
    const moved = [];
    for (const u of units) {
      const to = B.walkNeighbors(m.board, u.pos)
        .filter((n) => x(n) >= x(u.pos) + 0.5 && canEnter(m, u, n, false))
        .sort((a, b) => x(b) - x(a) || a - b)[0];
      if (to == null) continue;
      moveEntity(m, u, to, 'forced');
      moved.push(u.name);
    }
    if (moved.length) say(m, `The wind drives ${moved.join(', ')} downwind.`, 'enemy');
  };
  /** The rules this place adds today, a sentence each (empty in normal gravity and calm weather). */
  T.placeRules = function (m) {
    const p = m.place || {};
    const g = T.GRAVITY.find((b) => b.id === p.gravity);
    const w = T.WEATHER[p.weather];
    const out = [];
    if (g && g.text) out.push(`${g.name}: ${g.text}`);
    if (w && w.text)
      out.push(
        `${w.name}${p.wind ? (p.wind > 0 ? ', toward the far edge (E)' : ', toward where you arrived (A)') : ''}: ${w.text}`,
      );
    return out;
  };
  T.roundEnd = function (m) {
    m.phase = 'end';
    // Dusk faces land now, after the foes have acted, in the order they were placed (2.115)
    const dusk = m.dusk || [];
    m.dusk = [];
    for (const d of dusk) {
      if (m.over) break;
      const actor = m.heroes.find((h) => h.uid === d.uid) || (m.pets || []).find((p) => p.uid === d.uid && !p.dead);
      const card = T.CARD[d.card];
      if (!actor || !card) continue;
      say(m, `At dusk, ${actor.name}'s ${card[d.face].n} lands.`, 'hero');
      T.runEffects(m, actor, card[d.face].fx, { P: d.P, E: d.E, card, faceKey: d.face, node: d.node });
    }
    // decoy strikes
    for (const d of m.decoys.slice()) {
      if (d.strike) {
        const foe = T.liveEnemies(m).find((e) => B.adjacent(m.board, d.pos, e.pos));
        if (foe) {
          const owner = m.heroes.find((h) => h.uid === d.owner);
          say(m, `The duplicate lashes out at ${foe.name}.`, 'hero');
          T.damage(m, owner || null, foe, d.strike, { kind: 'melee', label: 'strikes' });
          d.strike = 0;
        }
      }
    }
    // wind: every unit moves 1 space downwind if it can (before hazards, so the wind can blow you into one)
    if (m.place && m.place.weather === 'wind') T.blowWind(m);
    // hazards
    const hulls = new Set(); // a vehicle on a hazard is caught once, however many ride in it
    for (const h of T.liveHeroes(m)) {
      if (!m.board.nodes[h.pos].hazard || hazardImmune(h)) continue;
      if (h.ride != null) {
        if (hulls.has(h.ride)) continue;
        hulls.add(h.ride);
      }
      say(m, `${h.name} is caught in the hazard.`, 'enemy');
      const d = T.damage(m, null, h, R().HAZARD_DMG, { kind: 'true', trueDmg: true, label: 'floods over' });
      m.stats.hazardDmg += d;
    }
    for (const p of T.livePets(m))
      if (m.board.nodes[p.pos].hazard && !hazardImmune(p)) {
        say(m, `${p.name} is caught in the hazard.`, 'enemy');
        T.damage(m, null, p, R().HAZARD_DMG, { kind: 'true', trueDmg: true, label: 'floods over' });
      }
    for (const e of T.liveEnemies(m))
      if (m.board.nodes[e.pos].hazard && !hazardImmune(e) && !e.boss) {
        T.damage(m, null, e, R().HAZARD_DMG, { kind: 'true', trueDmg: true, label: 'floods over' });
      }
    // Fields spring on whoever ends the round in them
    fieldsAtRoundEnd(m);
    // Resonance: strong fades, fading is gone
    if (m.air) for (const k of T.AIR_ELS) if (m.air[k] > 0) m.air[k]--;
    // Wounds bite, then drop by 1
    for (const u of T.liveEnemies(m).concat(T.liveHeroes(m), T.livePets(m))) {
      const w = st(u).Wound;
      if (!w) continue;
      const owner = unitBy(m, w.owner);
      T.damage(m, owner || null, u, w.n, { kind: 'true', trueDmg: true, label: `(${w.kind || 'wound'}) wounds` });
      if (w.heal && owner && owner.kind === 'hero' && !owner.downed)
        owner.hp = Math.min(owner.maxHp, owner.hp + w.heal);
      w.n--;
      if (w.n <= 0) delete st(u).Wound;
    }
    // Rewind: regain what this round took since it was set, up to its cap
    for (const h of T.liveHeroes(m)) {
      const rw = st(h).Rewind;
      if (!rw) continue;
      const back = Math.min(rw.cap, rw.hp - h.hp);
      if (back > 0) {
        h.hp = Math.min(h.maxHp, h.hp + back);
        say(m, `${h.name} recovers ${back} of what the round took.`, 'hero');
      }
      delete st(h).Rewind;
    }
    // objective: hold
    const ob = m.objective;
    if (ob && ob.kind === 'hold') {
      const near = T.liveHeroes(m).some((h) => h.pos === ob.node || B.adjacent(m.board, h.pos, ob.node));
      if (near) {
        ob.held++;
        say(m, `The beacon holds (${ob.held}/${ob.need}).`, 'sys');
        if (ob.held >= ob.need) {
          m.won = true;
          say(m, 'The Terminal logs the way through. Held!', 'sys');
        }
      } else say(m, 'No hero near the beacon — the round does not count.', 'sys');
    }
    // clock
    if (m.clock && !m.won) {
      m.clock.value -= 1;
      if (m.clock.value <= 0) {
        if (m.clock.onZero === 'lose') {
          m.lost = true;
          say(m, 'The clock runs out.', 'sys');
        }
      }
    }
    // hazard spread
    if (m.hazardSpread && !m.hazardSpread.dormant && !m.won) {
      if (m.hazardSpread.delayed > 0) {
        m.hazardSpread.delayed--;
        say(m, 'The flood is held back this round.', 'sys');
      } else {
        const cur = Object.values(m.board.nodes)
          .filter((n) => n.hazard)
          .map((n) => n.id);
        const next = new Set();
        cur.forEach((n) =>
          B.walkNeighbors(m.board, n).forEach((x) => {
            if (!m.board.nodes[x].hazard && !m.board.nodes[x].height) next.add(x);
          }),
        );
        next.forEach((x) => (m.board.nodes[x].hazard = true));
        if (next.size) {
          say(m, `The flood spreads (${next.size} more nodes).`, 'enemy');
          fx(m, { t: 'flood', nodes: [...next] });
        }
      }
    }
    // tick states
    const tick = (ent) => {
      const s = st(ent);
      for (const k of Object.keys(s)) {
        const v = s[k];
        if (k === 'Engines') {
          s[k] = v.filter((x) => --x.t > 0);
          if (!s[k].length) delete s[k];
        } else if (k === 'Marked' && typeof v.t === 'number') {
          // a lasting Mark wears off; a next-hit Mark on top of it stays until it is spent
          if (--v.t <= 0) {
            delete v.each;
            delete v.t;
            if (!v.next) delete s[k];
          }
        } else if (k === 'Empower' || k === 'Freecast') {
          s[k] = v.filter((x) => x.t == null || --x.t > 0);
          if (!s[k].length) delete s[k];
        } else if (v && typeof v.t === 'number' && v.t < 90) {
          v.t--;
          if (v.t <= 0) delete s[k];
        }
      }
    };
    m.heroes.forEach(tick);
    T.livePets(m).forEach(tick);
    m.enemies
      .filter((e) => e.alive)
      .forEach((e) => {
        tick(e);
        if (e.baseShield && e.shield < e.baseShield && e.type === 'warden') e.shield = e.baseShield;
      });
    m.fields = m.fields.filter((f) => f.t == null || --f.t > 0);
    m.decoys = m.decoys.filter((d) => --d.t > 0);
    // boss shield is fed by its spawners
    for (const e of T.liveEnemies(m))
      if (e.boss && e.shield > 0 && !m.enemies.some((x) => x.type === 'spawner' && x.alive)) {
        e.shield = 0;
        e.baseShield = 0;
        say(m, "With its Spawners gone, the Heart's shield gutters out.", 'sys');
        fx(m, { t: 'state', ent: e.uid, name: 'Shield' });
      }
    // boss phase
    for (const e of T.liveEnemies(m))
      if (e.boss && e.phase === 1 && e.hp <= e.maxHp / 2) {
        e.phase = 2;
        e.shield = 0;
        e.baseShield = 0;
        say(m, 'THE HEART CRACKS. The Vault begins to drown — four rounds.', 'sys');
        m.clock = { value: 4, label: 'Rounds until the Vault drowns', onZero: 'lose' };
        if (m.hazardSpread) m.hazardSpread.dormant = false;
        m.enemies
          .filter((x) => x.type === 'spawner' && x.alive)
          .forEach((x) => {
            x.alive = false;
            say(m, `${x.name} collapses.`, 'sys');
          });
        fx(m, { t: 'phase2' });
      }
    T.checkEnd(m);
  };

  T.checkEnd = function (m) {
    if (m.over) return;
    const ob = m.objective;
    // salvage: a crate is delivered the moment its carrier stands on the near edge, however they got there
    if (ob && ob.kind === 'salvage' && !m.won)
      for (const h of T.liveHeroes(m))
        if (h.carrying && ob.docks.includes(h.pos)) {
          h.carrying = 0;
          ob.done++;
          say(m, `${h.name} sets a crate down safe (${ob.done}/${ob.need}).`, 'sys');
          if (ob.done >= ob.need) {
            m.won = true;
            say(m, 'The salvage is out.', 'sys');
          }
        }
    if (ob && ob.kind === 'kill') {
      const alive = T.liveEnemies(m).some((e) => e.type === ob.target);
      if (!alive) m.won = true;
    }
    if (!T.liveHeroes(m).length) m.lost = true;
    if (m.won || m.lost) {
      m.over = true;
      m.phase = 'over';
      finalizeBonus(m);
      say(m, m.won ? 'MISSION COMPLETE.' : 'MISSION FAILED.', 'sys');
      fx(m, { t: 'over', won: m.won });
    }
  };
  function finalizeBonus(m) {
    for (const b of m.bonus) {
      if (b.id === 'nolow') b.achieved = !m.stats.lowHp;
      else if (b.id === 'kills') b.achieved = m.stats.kills >= b.kills;
      else if (b.killType) b.achieved = !m.enemies.some((e) => e.type === b.killType && e.alive);
      else if (b.clockLeft != null) b.achieved = !!(m.clock && m.clock.value >= b.clockLeft) && m.won;
      else if (b.byRound != null)
        b.achieved = m.won && (m.stats.foundRound != null ? m.stats.foundRound : m.round) <= b.byRound;
      else if (b.id === 'noambush') b.achieved = m.stats.ambushDmg === 0;
      else if (b.id === 'dry') b.achieved = m.stats.hazardDmg === 0;
      else if (b.id === 'intact') b.achieved = !m.stats.wrecks;
      else if (b.id === 'both') b.achieved = m.won && T.liveHeroes(m).length === 2;
      else if (b.id === 'spawners') b.achieved = !m.enemies.some((e) => e.type === 'spawner' && e.alive);
      if (!m.won) b.achieved = false;
    }
  }

  /* ───────────────────────────── BOSS HP PROGRESS for UI ───────────────────────────── */
  /** A Field in one sentence a player could resolve by hand. */
  T.fieldText = function (m, f) {
    const owner = f.owner != null ? heroBy(m, f.owner) : null;
    const word = (x) =>
      x.kw === 'strike'
        ? `${x.n}${x.pierce ? ' pierce' : ''} damage${x.if === 'anchored' ? ' if Anchored' : ''}`
        : x.kw === 'weaken'
          ? `Weakened ${x.n}`
          : x.kw === 'anchor'
            ? `Anchored ${x.t}`
            : x.kw === 'pull' || x.kw === 'push'
              ? `${x.kw === 'pull' ? 'pulled' : 'pushed'} ${x.n} ${x.kw === 'pull' ? 'toward' : 'away from'} its owner`
              : x.kw === 'mark'
                ? 'Marked'
                : x.kw === 'hidden'
                  ? 'Hidden (your side)'
                  : x.kw === 'heal'
                    ? `Heal ${x.n} (your side; the downed get up)`
                    : 'Revealed';
    const who =
      f.trips === 1 ? 'the first foe to ' : f.trips != null ? `the next ${f.trips} foes to ` : 'every foe that ';
    const when = f.on === 'enter' ? 'enters' : 'ends the round here';
    const where = f.around != null ? `around ${owner ? owner.name : 'its owner'}` : 'here';
    const left = f.t != null ? `, ${f.t} round${f.t === 1 ? '' : 's'} left` : '';
    return `${owner ? owner.name + "'s " : ''}Field ${where}: ${who}${when} — ${f.fx.map(word).join(', ')}${left}.`;
  };
  T.describeState = function (k, v) {
    const map = {
      Hidden: 'Hidden — immune to zone (ranged) strikes. Broken by melee contact, area, being moved, or being Located.',
      Shield: `Shield ${v.v} — each hit is reduced by ${v.v}${v.all ? ', even area' : ' (area bypasses)'}. Pierce and true damage ignore it.`,
      Anchored: 'Anchored — nothing moves it: no push, no pull, and it cannot walk or blink. It still acts.',
      Marked: `Marked — ${[v.next ? `the next hit on it deals +${v.next}${v.pierce ? ' and ignores Shield' : ''}` : '', v.each ? `every hit deals +${v.each} for ${v.t}` : ''].filter(Boolean).join('; ')}.`,
      Weak: `Weakened ${v.v} — its hits deal −${v.v}.`,
      Located: `Revealed for ${v.t} — cannot be Hidden; a zone strike finds it.`,
      Thorns: `Thorns — ${[v.v ? `melee attackers take ${v.v}` : '', v.next ? `the next takes ${v.next}${v.push ? ' and is pushed ' + v.push : ''}` : ''].filter(Boolean).join('; ')}.`,
      Preempt: `Shield ${v.v} against the next hit${v.reflect ? ', and ' + v.reflect + ' of it goes back' : ''}${v.reposition ? ', and you step away' : ''}.`,
      Stasis: 'Stasis — untargetable.',
      Hover:
        'Hover — off the ground: hazards and Fields do not touch it, nothing pushes or pulls it, and its steps may take the ledges.',
      Weightless:
        'Hover — off the ground: hazards and Fields do not touch it, nothing pushes or pulls it, and its steps may take the ledges.',
      Morph: `Morph — strikes +${v.bonus}${v.reach ? ', reach 2' : ''}${v.climb ? ', can climb' : ''}.`,
      HazardImmune: 'Immune to hazards.',
      StatusImmune: 'Cleansed — no foe can Weaken or Anchor it while this lasts.',
      Freecast: `Next ${Array.isArray(v) ? v.reduce((n, g) => n + g.n, 0) : 0} card(s) skip the track.`,
      Phoenix: `Heal held — if downed within ${v.t}, get up with ${v.hp}.`,
      Engines: 'Engine running.',
      Empower: 'Empowered — next strike(s) boosted.',
      Linked: `Linked for ${v.t} — damage, pushes, pulls and heals on either reach the other.`,
      Wound: `Wound ${v.n} — takes ${v.n} at round end, then the Wound drops by 1.`,
      Rewind: `At round end, regains what it lost since, up to ${v.cap}.`,
      Holding: `Holding a foe for ${v.t}: when it walks, the foe is dragged along.`,
      Held: `Held for ${v.t}: dragged along when its holder walks. It still acts.`,
      Fixed: `Fixed for ${v.t}: repeats the same intent each round. It still acts.`,
    };
    return map[k] || k;
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
