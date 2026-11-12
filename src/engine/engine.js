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
  T.makeRng = function (seed) {
    let a = seed >>> 0 || 0x9e3779b9;
    const rng = function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
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
      board.edges.forEach(([a, b]) => {
        board.walkAdj[a].push(b);
        board.walkAdj[b].push(a);
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
    los(board, a, b) {
      return a !== b && board.nodes[a].lane === board.nodes[b].lane;
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
  let UID = 1;
  T.makeHero = function (spec) {
    const h = {
      kind: 'hero',
      uid: UID++,
      id: spec.id,
      name: spec.name,
      title: spec.title || '',
      species: spec.species.slice(),
      cards: spec.cards.slice(),
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
      stats: { dmgDealt: 0, dmgTaken: 0, kills: 0 },
      boons: [],
      faces: null,
    };
    spec.cards.forEach((c) => (h.up[c] = [0, 0]));
    if (spec.up)
      Object.keys(spec.up).forEach((c) => {
        if (h.up[c]) h.up[c] = spec.up[c].slice();
      });
    return h;
  };
  T.heroP = (h, cardId) => (h.up[cardId] || [0, 0])[0];
  T.heroE = (h, cardId) => (h.up[cardId] || [0, 0])[1];
  T.heroFaces = function (h) {
    // Affinity boons re-face one AP die each
    const faces = R().FACES.slice();
    (h.boons || []).forEach((b) => {
      const bo = T.BOON_BY[b];
      if (bo && bo.hook === 'face') {
        const i = faces.lastIndexOf('AP');
        if (i >= 0) faces[i] = bo.val;
      }
    });
    return faces;
  };
  // Boons are wired by hook, never by id: the engine asks for the values a hero's boons
  // hang on a hook and acts on those, so the table in src/data/world.js is the whole truth.
  T.BOON_HOOKS = [
    'face', // val: the die face one AP face becomes
    'missionStart', // val: { bank: face } — one die already banked as that face
    'roundStart', // val: { round, hasten } — the track slides extra columns as that round starts
    'shieldBonus', // val: added to every Shield the holder gains
    'keen', // val: added to the reach of the holder's reveals; Hidden foes beside them are seen at round start
    'reward', // val: { crystals, up } — added to every mission's rewards
    'autoRevive', // val: hp the holder rises with, once per run, instead of going down
    'firstStrike', // val: added to the holder's first strike each round
    'noPull', // the holder cannot be pulled
    'vsElite', // val: added to the holder's damage against elites and the boss
  ];
  T.boonVals = function (h, hook) {
    if (!T.BOON_HOOKS.includes(hook)) throw new Error('unknown boon hook ' + hook);
    return (h.boons || [])
      .map((id) => T.BOON_BY[id])
      .filter((b) => b && b.hook === hook)
      .map((b) => b.val);
  };
  const boonSum = (h, hook) => T.boonVals(h, hook).reduce((sum, v) => sum + v, 0);

  T.makeEnemy = function (type, tier, pos) {
    const d = T.ENEMIES[type];
    const ti = Math.max(0, Math.min(2, tier - 1));
    const e = {
      kind: 'enemy',
      uid: UID++,
      type,
      name: d.name,
      glyph: d.glyph,
      tier,
      pos,
      speed: d.speed,
      hp: d.hp[ti],
      maxHp: d.hp[ti],
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
  };
  T.enemyAbility = (e, key) => {
    const ab = T.ENEMIES[e.type].abilities[key];
    return ab;
  };
  T.enemyDmg = (e, ab) => (Array.isArray(ab.dmg) ? ab.dmg[e.ti] : ab.dmg || 0);

  /* ───────────────────────────── MISSION SETUP ───────────────────────────── */
  T.startMission = function (run, spec, archetype, tier, rng) {
    B.build(spec.board);
    const m = {
      archetype,
      tier,
      board: spec.board,
      heroes: run.heroes,
      enemies: [],
      decoys: [],
      traps: {},
      zones: [],
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
      rng,
      run,
      stats: { kills: 0, lowHp: false, ambushDmg: 0, hazardDmg: 0, foundRound: null },
      isBoss: !!spec.isBoss,
      title: spec.title,
      eliteKind: spec.eliteKind,
      spawnedCount: 0,
    };
    spec.enemies.forEach((en) => m.enemies.push(T.makeEnemy(en.type, tier, en.node)));
    m.heroes.forEach((h, i) => {
      h.pos = spec.starts[i % spec.starts.length];
      h.downed = false;
      h.hp = Math.max(1, h.hp);
      h.states = {};
      h.temp = [];
      h.track = [];
      h.held = [];
      h.pool = R().POOL;
      h.rested = false;
      h.gear.forEach((g) => (g.cds = [0, 0]));
      h.roundFlags = { struck: false };
      for (const v of T.boonVals(h, 'missionStart'))
        if (v.bank) {
          h.pool -= 1;
          h.held.push(v.bank);
        }
    });
    if (run.bossBonusHp && m.isBoss)
      m.enemies
        .filter((e) => e.boss)
        .forEach((e) => {
          e.hp += run.bossBonusHp;
          e.maxHp += run.bossBonusHp;
        });
    m.log.push({ r: 0, who: 'dm', text: spec.blurb });
    T.beginRound(m);
    return m;
  };

  /* ───────────────────────────── LOG / FX ───────────────────────────── */
  const say = (m, text, who) => m.log.push({ r: m.round, who: who || 'dm', text });
  const fx = (m, o) => m.fx.push(o);
  T.say = say;

  /* ───────────────────────────── DICE ───────────────────────────── */
  T.rollDice = function (m, h) {
    const k = Math.min(R().ROLL, h.pool);
    const faces = T.heroFaces(h);
    const out = [];
    for (let i = 0; i < k; i++) {
      const f = m.rng.pick(faces);
      out.push(f);
      h.held.push(f);
    }
    h.pool -= k;
    if (h.pool + h.held.length !== R().POOL) throw new Error('dice invariant broken for ' + h.name);
    fx(m, { t: 'roll', hero: h.uid, faces: out });
    return out;
  };
  T.apValue = (h) => h.held.concat(h.temp).reduce((s, f) => s + (f === 'AP' ? 1 : f === 'AP2' ? 2 : 0), 0);
  T.elCount = (h, kind) => h.held.concat(h.temp).filter((f) => f === kind).length;
  T.omniCount = (h) => h.held.concat(h.temp).filter((f) => f === 'O').length;
  T.canPay = function (h, ap, elt, eln) {
    if (T.apValue(h) < (ap || 0)) return false;
    if (eln && elt) {
      if (T.elCount(h, elt) + T.omniCount(h) < eln) return false;
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
      h.held.splice(i, 1);
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
  T.draw = (h, face, n) => {
    let got = 0;
    for (let i = 0; i < n && h.pool > 0; i++) {
      h.pool--;
      h.held.push(face);
      got++;
    }
    return got;
  };
  T.valve = function (m, h) {
    // anti-brick: one of each M,C,S,T → one Omni (3 dice return to pool)
    const idx = ['M', 'C', 'S', 'T'].map((f) => h.held.indexOf(f));
    if (idx.some((i) => i < 0)) return false;
    ['M', 'C', 'S', 'T'].forEach((f) => {
      const i = h.held.indexOf(f);
      h.held.splice(i, 1);
      h.pool++;
    });
    h.pool--;
    h.held.push('O');
    say(m, `${h.name} folds one of each etherion into an Omni.`, 'sys');
    return true;
  };
  T.dump = function (m, h, idx) {
    if (idx < 0 || idx >= h.held.length) return false;
    h.held.splice(idx, 1);
    h.pool++;
    return true;
  };
  T.rerollHeld = function (m, h, indices) {
    const faces = T.heroFaces(h);
    indices.forEach((i) => {
      if (i >= 0 && i < h.held.length) h.held[i] = m.rng.pick(faces);
    });
    fx(m, { t: 'roll', hero: h.uid, faces: indices.map((i) => h.held[i]) });
  };

  /* ───────────────────────────── TRACK ───────────────────────────── */
  T.inHand = (h, cardId) => h.cards.includes(cardId) && !h.track.some((t) => t.card === cardId);
  T.commit = function (h, cardId, dur, cd, note) {
    if (h.states.Freecast && h.states.Freecast.n > 0) {
      h.states.Freecast.n--;
      if (h.states.Freecast.n <= 0) delete h.states.Freecast;
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
    return !!(st(ent).Anchored || st(ent).Held || st(ent).Rooted || ent.anchoredPerm);
  }
  function forceImmune(ent) {
    return isAnchored(ent) || !!st(ent).Hover || !!st(ent).Weightless;
  }
  function hazardImmune(ent) {
    return !!(st(ent).HazardImmune || st(ent).Hover || st(ent).Weightless || st(ent).Stasis);
  }
  function trapImmune(ent) {
    return !!(st(ent).Hover || st(ent).Weightless);
  }
  /** Weightless heroes and climbing forms walk the climb edges up to height nodes. */
  function canClimb(ent) {
    return !!(st(ent).Weightless || (st(ent).Morph && st(ent).Morph.climb));
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
  function anchorEnt(m, ent, t, held) {
    if (st(ent).StatusImmune && ent.kind === 'hero') return;
    const cur = st(ent).Anchored;
    st(ent).Anchored = { t: Math.max(t, cur ? cur.t : 0) };
    if (held) st(ent).Held = { t: Math.max(t, (st(ent).Held || { t: 0 }).t) };
    fx(m, { t: 'state', ent: ent.uid, name: 'Anchored' });
  }
  T.isHidden = isHidden;
  T.isAnchored = isAnchored;

  /* ───────────────────────────── OCCUPANCY ───────────────────────────── */
  T.entityAt = function (m, node) {
    for (const h of m.heroes) if (!h.downed && h.pos === node) return h;
    for (const e of m.enemies) if (e.alive && e.pos === node) return e;
    for (const d of m.decoys) if (d.pos === node) return d;
    return null;
  };
  T.occupied = (m, node) => !!T.entityAt(m, node);
  T.liveEnemies = (m) => m.enemies.filter((e) => e.alive);
  T.liveHeroes = (m) => m.heroes.filter((h) => !h.downed);
  T.foesFor = (m, actor) => (actor.kind === 'hero' ? T.liveEnemies(m) : T.liveHeroes(m).concat(m.decoys));
  T.allyOf = (m, h) => m.heroes.find((x) => x !== h);

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
    // attacker modifiers (heroes)
    if (source && source.kind === 'hero') {
      const ss = st(source);
      if (opts.strike && ss.Empower && ss.Empower.length) {
        // consume the first matching empower
        const idx = ss.Empower.findIndex((e) => !e.kind || e.kind === kind);
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
      if (opts.strike) {
        const flags = source.roundFlags || (source.roundFlags = {});
        if (!flags.struck) dmg += boonSum(source, 'firstStrike');
        flags.struck = true;
      }
      if (target.elite || target.boss) dmg += boonSum(source, 'vsElite');
      if (ts.Studied) dmg += ts.Studied.n;
      if (ts.Marked) {
        dmg += 2;
        delete ts.Marked;
      }
      if (ts.Exposed) {
        dmg += ts.Exposed.bonus;
        pierce = true;
        delete ts.Exposed;
      }
      if (ss.Weak) dmg = Math.max(0, dmg - ss.Weak.v);
    } else if (source && source.kind === 'enemy') {
      if (st(source).Weak) dmg = Math.max(0, dmg - st(source).Weak.v);
      if (opts.ambush && ts.Guard) dmg = Math.ceil(dmg / 2);
    }
    // absorb (ranged, heroes)
    if (target.kind === 'hero' && ts.Absorb && kind === 'los' && ts.Absorb.n > 0) {
      ts.Absorb.n--;
      T.mint(target, ts.Absorb.face || 'C', 1);
      if (ts.Absorb.n <= 0) delete ts.Absorb;
      say(m, `${target.name} absorbs the energy and banks it.`);
      return 0;
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
      if (p.reposition && target.kind === 'hero') {
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
    // counter (melee/force)
    if (ts.Counter && kind === 'melee' && source && source.kind === 'enemy') {
      const c = ts.Counter;
      source.hp -= c.dmg;
      fx(m, { t: 'dmg', ent: source.uid, amount: c.dmg, pos: source.pos });
      say(m, `${target.name} turns the blow back: ${source.name} takes ${c.dmg}.`);
      if (c.push) pushAway(m, target, source, c.push);
      delete ts.Counter;
      checkEnemyDeath(m, source, target);
    }
    if (dmg > 0) {
      target.hp -= dmg;
      fx(m, { t: 'dmg', ent: target.uid, amount: dmg, pos: target.pos, kind });
      if (source && source.kind === 'hero') source.stats.dmgDealt += dmg;
      if (target.kind === 'hero') {
        target.stats.dmgTaken += dmg;
        if (opts.ambush) m.stats.ambushDmg += dmg;
        if (target.hp <= target.maxHp / 2) m.stats.lowHp = true;
      }
      say(
        m,
        `${source ? source.name : 'The current'} ${opts.label || 'hits'} ${target.name} for ${dmg}${pierce ? ' (pierce)' : ''}${trueDmg ? ' (true)' : ''}.`,
        source && source.kind === 'hero' ? 'hero' : 'enemy',
      );
    } else {
      say(m, `${source ? source.name : 'The blow'} is fully blunted by ${target.name}.`);
    }
    // thorns
    if (kind === 'melee' && ts.Thorns && source && source.kind === 'enemy') {
      source.hp -= ts.Thorns.v;
      fx(m, { t: 'dmg', ent: source.uid, amount: ts.Thorns.v, pos: source.pos });
      say(m, `${source.name} is seared by ${target.name}'s skin for ${ts.Thorns.v}.`);
      checkEnemyDeath(m, source, target);
    }
    // contact / area reveals
    if (isHidden(target) && (kind === 'melee' || kind === 'area' || kind === 'any') && !opts.noReveal)
      breakHidden(m, target, 'contact');
    if (source && source.kind === 'hero' && isHidden(source)) breakHidden(m, source, 'striking');
    // death
    if (target.kind === 'enemy') checkEnemyDeath(m, target, source);
    else if (target.kind === 'hero') checkHeroDown(m, target);
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
  function checkHeroDown(m, h) {
    if (h.downed || h.hp > 0) return;
    const ph = h.states.Phoenix;
    if (ph) {
      h.hp = ph.hp;
      delete h.states.Phoenix;
      say(m, `${h.name} re-forms from the seeded node with ${h.hp} vitality!`, 'sys');
      fx(m, { t: 'revive', ent: h.uid });
      return;
    }
    const [rise] = T.boonVals(h, 'autoRevive');
    if (rise && !m.run.secondWindUsed) {
      m.run.secondWindUsed = true;
      h.hp = rise;
      say(m, `A second wind — ${h.name} rises again with ${rise}.`, 'sys');
      fx(m, { t: 'revive', ent: h.uid });
      return;
    }
    h.hp = 0;
    h.downed = true;
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
  function pushAway(m, source, target, n) {
    if (forceImmune(target)) {
      say(m, `${target.name} holds fast.`);
      return 0;
    }
    let moved = 0;
    for (let i = 0; i < n; i++) {
      const cands = B.walkNeighbors(m.board, target.pos).filter((x) => canEnter(m, target, x, false));
      if (!cands.length) break;
      const best = cands.sort((a, b) => B.dist(m.board, b, source.pos, true) - B.dist(m.board, a, source.pos, true))[0];
      if (B.dist(m.board, best, source.pos, true) <= B.dist(m.board, target.pos, source.pos, true)) break;
      moveEntity(m, target, best, 'forced');
      moved++;
    }
    return moved;
  }
  function pullToward(m, source, target, n) {
    if (forceImmune(target) || (target.kind === 'hero' && T.boonVals(target, 'noPull').length)) {
      say(m, `${target.name} holds fast.`);
      return 0;
    }
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
    return moved;
  }
  function moveEntity(m, ent, node, how) {
    const from = ent.pos;
    ent.pos = node;
    fx(m, { t: 'move', ent: ent.uid, from, to: node, how });
    if (how === 'forced' && isHidden(ent)) breakHidden(m, ent, 'moved');
    if (ent.kind === 'enemy') {
      onEnemyEnter(m, ent, node);
    }
    if (ent.kind === 'hero' && how !== 'forced' && isHidden(ent) && !st(ent).Hidden.canMove)
      breakHidden(m, ent, 'moved');
  }
  T.moveEntity = moveEntity;
  T.pushAway = pushAway;
  T.pullToward = pullToward;

  function onEnemyEnter(m, e, node) {
    if (!e.alive) return;
    // traps
    const traps = m.traps[node];
    if (traps && traps.length && !trapImmune(e)) {
      const tr = traps[0];
      if (!tr.counted) {
        traps.shift();
        say(m, `A snare springs under ${e.name}!`, 'hero');
        T.damage(m, tr.owner, e, tr.dmg, { kind: 'area', label: 'snares', trueDmg: false, noReveal: false });
        if (e.alive && tr.anchor) anchorEnt(m, e, tr.anchor);
        fx(m, { t: 'trap', node });
      } else {
        e.inCounted = node;
      }
    }
    // ambush traps on heroes adjacent
    for (const h of T.liveHeroes(m)) {
      const at = h.states.AmbushTrap;
      if (at && B.adjacent(m.board, h.pos, node)) {
        say(m, `${h.name}'s trigger snaps: ${e.name} is struck as it closes.`, 'hero');
        T.damage(m, h, e, at.dmg, { kind: 'melee', label: 'ambushes' });
        if (e.alive && at.weaken) weaken(m, e, at.weaken, 1);
        if (e.alive && at.anchor) anchorEnt(m, e, at.anchor);
        delete h.states.AmbushTrap;
      }
      const aura = (h.states.Auras || []).find((a) => a.kind === 'reveal' && a.markEntrants && !a.markedThisRound);
      if (aura && B.adjacent(m.board, h.pos, node)) {
        st(e).Marked = {};
        aura.markedThisRound = true;
        say(m, `${e.name} brushes the cilia — Marked.`, 'hero');
      }
    }
  }
  T.springCounted = function (m, e) {
    if (!e.inCounted || e.pos !== e.inCounted) {
      e.inCounted = null;
      return;
    }
    const traps = m.traps[e.pos];
    if (!traps || !traps.length) {
      e.inCounted = null;
      return;
    }
    const i = traps.findIndex((t) => t.counted);
    if (i < 0) {
      e.inCounted = null;
      return;
    }
    const tr = traps.splice(i, 1)[0];
    e.inCounted = null;
    say(m, `The counted snare springs shut on ${e.name}!`, 'hero');
    T.damage(m, tr.owner, e, tr.dmg, { kind: 'area', label: 'snares' });
    if (e.alive) {
      anchorEnt(m, e, tr.anchor);
      if (tr.noTele) st(e).NoTele = { t: tr.anchor };
    }
    fx(m, { t: 'trap', node: e.pos });
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
  // Returns {need:'none'|'foe'|'node'|'ally'|'foeOrAlly', options:[ids], reason}
  T.targetsFor = function (m, h, tgt, face, P, E) {
    const bd = m.board;
    const foes = T.liveEnemies(m);
    const ally = T.allyOf(m, h);
    const vis = (e) => !isHidden(e) || !!st(e).Located; // can't target unseen foes with single-target effects
    const reach = st(h).Morph && st(h).Morph.reach ? 2 : 1;
    switch (tgt) {
      case 'self':
      case 'party':
        return { need: 'none' };
      case 'ally':
        return ally && !ally.downed ? { need: 'none', ally: ally.uid } : { need: 'none', invalid: 'no ally standing' };
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
      case 'foe_r2':
        return {
          need: 'foe',
          options: foes.filter((e) => B.dist(bd, h.pos, e.pos, true) <= 2 && vis(e)).map((e) => e.uid),
        };
      case 'foe_r3':
        return {
          need: 'foe',
          options: foes.filter((e) => B.dist(bd, h.pos, e.pos, true) <= 3 && vis(e)).map((e) => e.uid),
        };
      case 'foe_adj_all':
      case 'foe_lane_all':
        return { need: 'none' };
      case 'foe_or_ally_adj': {
        const opts = foes.filter((e) => B.adjacent(bd, h.pos, e.pos)).map((e) => e.uid);
        if (ally && !ally.downed && B.adjacent(bd, h.pos, ally.pos)) opts.push(ally.uid);
        if (ally && !ally.downed && face && face.fx.some((x) => x.target === 'chosenAlly')) opts.push(h.uid);
        return { need: 'foeOrAlly', options: opts };
      }
      case 'node_adj':
        return { need: 'node', options: B.walkNeighbors(bd, h.pos).filter((n) => !T.occupied(m, n)) };
      case 'node_r2': {
        const r = face
          ? Math.max(
              ...face.fx.map((x) =>
                x.remote != null ? num(x.remote, P, E) : x.range != null ? num(x.range, P, E) : 0,
              ),
              2,
            )
          : 2;
        return { need: 'node', options: [h.pos].concat(B.within(bd, h.pos, r, true)) };
      }
      case 'node_r3': {
        const r = face ? Math.max(...face.fx.map((x) => (x.remote != null ? num(x.remote, P, E) : 0)), 3) : 3;
        return { need: 'node', options: B.within(bd, h.pos, r, true).filter((n) => !T.occupied(m, n)) };
      }
      case 'node_move': {
        const mv = face.fx.find((x) => x.v === 'move');
        const n = num(mv.n, P, E);
        return { need: 'node', options: T.reachableWalk(m, h, n, mv.ignoreFoes) };
      }
      case 'node_tele': {
        const tp = face.fx.find((x) => x.v === 'teleport');
        const r = num(tp.reach, P, E);
        let opts = B.within(bd, h.pos, r, true).filter((n) => !T.occupied(m, n) && (tp.height || !bd.nodes[n].height));
        if (tp.dest === 'adjTarget')
          return {
            need: 'foe',
            options: foes.filter((e) => B.dist(bd, h.pos, e.pos, true) <= r && vis(e)).map((e) => e.uid),
          };
        return { need: 'node', options: opts };
      }
      case 'node_climb': {
        const cl = face.fx.find((x) => x.v === 'climb');
        const r = num(cl.reach, P, E);
        return { need: 'node', options: B.within(bd, h.pos, r, true).filter((n) => !T.occupied(m, n)) };
      }
      default:
        return { need: 'none' };
    }
  };
  T.reachableWalk = function (m, h, n, ignoreFoes) {
    const bd = m.board;
    const out = [];
    const seen = new Set([h.pos]);
    const q = [[h.pos, 0]];
    const climber = canClimb(h);
    while (q.length) {
      const [x, d] = q.shift();
      if (d >= n) continue;
      for (const y of B.walkNeighbors(bd, x, climber)) {
        if (seen.has(y)) continue;
        if (bd.nodes[y].height && !climber && !bd.ramp) continue;
        const occ = T.entityAt(m, y);
        if (occ && !(ignoreFoes || occ.kind === 'hero')) continue; // can't pass through foes unless ignoring
        seen.add(y);
        if (!occ) out.push(y);
        q.push([y, d + 1]);
      }
    }
    return out;
  };

  /* ───────────────────────────── PLAY A FACE ───────────────────────────── */
  // ctx: {target: uid|null, node: id|null, choice:'push'|'pull'}
  T.canPlay = function (m, h, cardId, faceKey) {
    if (h.downed || h.rested) return { ok: false, why: h.downed ? 'downed' : 'resting' };
    if (!T.inHand(h, cardId)) return { ok: false, why: 'on track' };
    const card = T.CARD[cardId];
    const face = card[faceKey];
    const P = T.heroP(h, cardId),
      E = T.heroE(h, cardId);
    const elt = face.elt || card.el;
    const eln = face.el || 0;
    if (faceKey === 'E' && E < R().ETHEREAL_MIN_E) return { ok: false, why: 'needs E ' + R().ETHEREAL_MIN_E };
    if (!T.canPay(h, face.ap, elt, eln)) return { ok: false, why: 'cannot pay' };
    const tg = T.targetsFor(m, h, face.tgt, face, P, E);
    if (tg.invalid) return { ok: false, why: tg.invalid };
    if (tg.need !== 'none' && (!tg.options || !tg.options.length)) return { ok: false, why: 'no valid target' };
    return { ok: true, tg };
  };
  T.playFace = function (m, h, cardId, faceKey, ctx) {
    const chk = T.canPlay(m, h, cardId, faceKey);
    if (!chk.ok) return { ok: false, why: chk.why };
    const card = T.CARD[cardId];
    const face = card[faceKey];
    const P = T.heroP(h, cardId),
      E = T.heroE(h, cardId);
    const elt = face.elt || card.el;
    const eln = face.el || 0;
    T.pay(h, face.ap, elt, eln);
    say(
      m,
      `${h.name} plays ${card.name} — ${face.n}${faceKey === 'E' ? ' (' + T.ETHERIONS[elt].name + ')' : ''}.`,
      'hero',
    );
    fx(m, { t: 'play', hero: h.uid, card: cardId, face: faceKey });
    const how = T.commit(h, cardId, face.dur || 0, face.cd || 0, face.n);
    if (how === 'free') say(m, `(${card.name} does not go to the track.)`, 'sys');
    const rctx = ctx || {};
    Object.assign(rctx, { P, E, card, faceKey });
    T.runEffects(m, h, face.fx, rctx);
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
    const isHero = actor.kind === 'hero';
    const ally = isHero ? T.allyOf(m, actor) : null;
    const party = () => (isHero ? T.liveHeroes(m) : [actor]);
    // Conditions gate the whole effect, whatever its verb. The ones about a target need it
    // still standing. An effect that carries `elseVal` runs anyway, at that magnitude instead
    // (strike and heal read it).
    const condOk = () => {
      if (f.ifOnHazard && !bd.nodes[actor.pos].hazard) return false;
      if (f.ifE && E < f.ifE) return false;
      if (f.ifAnchored || f.ifAdjacent || f.ifHpBelow != null) {
        const t = targetEnt(m, ctx) || ctx.lastTarget;
        if (!t || t.alive === false || t.downed) return false;
        if (f.ifAnchored && !isAnchored(t)) return false;
        if (f.ifAdjacent && !B.adjacent(bd, actor.pos, t.pos)) return false;
        if (f.ifHpBelow != null && t.hp >= num(f.ifHpBelow, P, E)) return false;
      }
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
          kind: f.kind === 'lane_all' || f.kind === 'nodeArea' ? 'area' : f.kind === 'any' ? 'any' : f.kind,
          pierce: bool(f.pierce, P, E),
          trueDmg: !!f.trueDmg,
          label: ctx.card ? `uses ${ctx.card[ctx.faceKey].n} on` : 'hits',
          strike: true,
        };
        let targets = [];
        if (f.kind === 'area') targets = foesAdj(m, actor);
        else if (f.kind === 'lane_all') targets = T.liveEnemies(m).filter((e) => B.los(bd, actor.pos, e.pos));
        else if (f.kind === 'nodeArea') {
          const center = ctx.node != null ? ctx.node : actor.pos;
          targets = foesWithin(m, center, 1);
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
            t.shield = 0;
            delete st(t).Shield;
          }
          if (f.revealTarget) breakHidden(m, t, 'twitch');
          T.damage(m, actor, t, dmg, opts);
          if (f.onKill && t.kind === 'enemy' && !t.alive) T.applyEffect(m, actor, f.onKill, ctx);
          ctx.lastTarget = t;
        }
        if (f.chain && targets.length && targets[0].kind === 'enemy') {
          const primary = targets[0];
          const n = num(f.chain, P, E);
          const cd = num(f.chainDmg, P, E);
          const others = T.liveEnemies(m)
            .filter((e) => e !== primary && B.dist(bd, primary.pos, e.pos, true) <= 1)
            .slice(0, n);
          for (const o of others) {
            say(m, `The arc chains to ${o.name}.`, 'hero');
            T.damage(m, actor, o, cd, { kind: 'area', label: 'arcs into' });
          }
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
            m.run.crystals += f.salvage;
            say(m, `Salvaged ${f.salvage} ◇.`, 'sys');
          }
        } else say(m, `${t.name} is not yet dying (${t.hp} > ${th}).`, 'sys');
        break;
      }
      case 'stripShield': {
        const t = targetEnt(m, ctx) || ctx.lastTarget;
        if (!t || t.kind !== 'enemy') break;
        if (f.amount) {
          t.shield = Math.max(0, t.shield - f.amount);
          if (st(t).Shield) st(t).Shield.v = Math.max(0, st(t).Shield.v - f.amount);
        } else {
          t.shield = 0;
          delete st(t).Shield;
        }
        say(m, `${t.name}'s Shield is ${f.amount ? 'weakened' : 'stripped'}.`, 'hero');
        break;
      }
      case 'dot': {
        let targets = [];
        if (f.area === 'nodeArea') {
          const center = ctx.node != null ? ctx.node : actor.pos;
          targets = foesWithin(m, center, 1);
        } else {
          const t = targetEnt(m, ctx) || ctx.lastTarget;
          if (t) targets = [t];
        }
        for (const t of targets) {
          if (t.kind !== 'enemy') continue;
          st(t).Dots = st(t).Dots || [];
          st(t).Dots.push({
            v: num(f.val, P, E),
            t: num(f.dur, P, E),
            kind: f.kind,
            escalate: num(f.escalate, P, E),
            healOwner: num(f.healOwner, P, E),
            owner: actor.uid,
          });
          fx(m, { t: 'state', ent: t.uid, name: f.kind });
        }
        break;
      }
      /* ---------- MOVEMENT ---------- */
      case 'move': {
        if (actor.kind !== 'hero') break;
        const n = num(f.n, P, E);
        if (n <= 0) break;
        if (st(actor).SlowSelf) {
          say(m, `${actor.name} cannot move this round.`, 'sys');
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
            if (p && p.length > 2) dest = p[1];
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
        const opts = T.reachableWalk(m, actor, n, f.ignoreFoes);
        if (!opts.includes(dest)) {
          if (f.free) {
            ctx.pendingFreeMove = n;
          }
          break;
        }
        if (f.noTrap) actor.states.NoTrapStep = { t: 1 };
        const fromN = actor.pos;
        moveEntity(m, actor, dest, 'walk');
        if (f.noTrap) delete actor.states.NoTrapStep;
        say(m, `${actor.name} moves ${fromN} → ${dest}.`, 'hero');
        onHeroEnter(m, actor, dest);
        break;
      }
      case 'teleport': {
        if (actor.kind !== 'hero') break;
        const r = num(f.reach, P, E);
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
        if (B.dist(bd, actor.pos, dest, true) > r || T.occupied(m, dest) || (bd.nodes[dest].height && !f.height)) {
          say(m, 'Out of reach.', 'sys');
          break;
        }
        if (st(actor).NoTele) {
          say(m, `${actor.name} is held — no teleporting out.`, 'sys');
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
      case 'climb': {
        if (actor.kind !== 'hero') break;
        const r = num(f.reach, P, E);
        const dest = ctx.node;
        if (dest == null) break;
        if (B.dist(bd, actor.pos, dest, true) > r || T.occupied(m, dest)) {
          say(m, 'Out of reach.', 'sys');
          break;
        }
        const from = actor.pos;
        moveEntity(m, actor, dest, 'climb');
        say(m, `${actor.name} climbs ${from} → ${dest}.`, 'hero');
        onHeroEnter(m, actor, dest);
        if (bool(f.carryAlly, P, E) && ally && !ally.downed && B.adjacent(bd, from, ally.pos)) {
          const spot = B.allNeighbors(bd, dest).filter((n) => !T.occupied(m, n) && n !== from)[0];
          if (spot) {
            moveEntity(m, ally, spot, 'climb');
            say(m, `${ally.name} is lifted along.`, 'hero');
          }
        }
        break;
      }
      case 'swap': {
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
      case 'rally': {
        if (!ally || ally.downed) break;
        const n = num(f.move, P, E);
        ally.freeMove = (ally.freeMove || 0) + n;
        say(m, `${ally.name} may move ${n} for free.`, 'hero');
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
        const r = num(f.radius, P, E);
        revealArea(m, actor, actor.pos, r, num(f.dur, P, E) || 1, { findObjective: !!f.findObjective });
        if (f.hintObjective && m.objective && m.objective.kind === 'find' && !m.objective.found) {
          const real = m.objective.real;
          const d = B.dist(bd, actor.pos, real, true);
          say(m, `The UV trail says the real cache is ${d} node${d === 1 ? '' : 's'} away.`, 'sys');
        }
        break;
      }
      case 'locate': {
        let t = f.nearest ? nearestFoe(m, actor) : targetEnt(m, ctx);
        if (!t || t.kind !== 'enemy') break;
        breakHidden(m, t, 'located');
        addTimed(m, t, 'Located', num(f.dur, P, E) || 1);
        ctx.lastTarget = t;
        break;
      }
      case 'mark': {
        let targets = [];
        if (f.area) {
          const r = num(f.radius, P, E);
          targets = foesWithin(m, actor.pos, r);
        } else if (f.nearest) {
          const e = nearestFoe(m, actor);
          if (e) targets = [e];
        } else {
          const t = targetEnt(m, ctx);
          if (t) targets = [t];
        }
        for (const t of targets)
          if (t.kind === 'enemy') {
            st(t).Marked = {};
            fx(m, { t: 'state', ent: t.uid, name: 'Marked' });
          }
        if (targets.length) say(m, `${targets.map((t) => t.name).join(', ')} Marked.`, 'hero');
        break;
      }
      case 'expose': {
        const t = targetEnt(m, ctx);
        if (!t || t.kind !== 'enemy') break;
        st(t).Exposed = { bonus: num(f.bonus, P, E) };
        say(m, `${t.name}'s weak point is exposed.`, 'hero');
        break;
      }
      case 'studied': {
        const t = targetEnt(m, ctx) || ctx.lastTarget;
        if (!t || t.kind !== 'enemy') break;
        st(t).Studied = { n: (st(t).Studied ? st(t).Studied.n : 0) + num(f.n, P, E) };
        say(m, `${actor.name} studies ${t.name} (+${st(t).Studied.n} to hits).`, 'hero');
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
        const v = num(f.val, P, E);
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
        if (f.who === 'self') {
          anchorEnt(m, actor, d);
          say(m, `${actor.name} anchors (${d}).`, 'hero');
        } else if (f.who === 'ally') {
          if (ally && !ally.downed && (!f.adjacent || B.adjacent(bd, actor.pos, ally.pos))) {
            anchorEnt(m, ally, d);
            say(m, `${ally.name} anchored (${d}).`, 'hero');
          }
        } else {
          const t = targetEnt(m, ctx) || ctx.lastTarget;
          if (!t) break;
          if (t.kind === 'enemy') {
            anchorEnt(m, t, d, !!f.held);
            say(m, `${t.name} Anchored ${d}${f.held ? ' (held)' : ''}.`, 'hero');
          } else if (t.kind === 'hero') {
            anchorEnt(m, t, d);
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
        else if (f.area === 'lane') targets = T.liveEnemies(m).filter((e) => B.los(bd, actor.pos, e.pos));
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
      case 'slow': {
        const t = targetEnt(m, ctx) || ctx.lastTarget;
        if (!t || t.kind !== 'enemy') break;
        addTimed(m, t, 'Slow', num(f.dur, P, E));
        say(m, `${t.name} cannot move for ${num(f.dur, P, E)}.`, 'hero');
        break;
      }
      case 'slowSelf':
        addTimed(m, actor, 'SlowSelf', num(f.dur, P, E) || 1);
        break;
      case 'empower': {
        const v = num(f.val, P, E);
        if (v <= 0 && !f.pierce) break;
        const list = f.party ? T.liveHeroes(m) : f.target === 'ally' ? (ally && !ally.downed ? [ally] : []) : [actor];
        list.forEach((h) => {
          h.states.Empower = h.states.Empower || [];
          h.states.Empower.push({
            v,
            uses: f.uses || 1,
            kind: f.kind || null,
            pierce: !!f.pierce,
            t: num(f.dur, P, E) || null,
          });
          fx(m, { t: 'state', ent: h.uid, name: 'Empower' });
        });
        if (list.length)
          say(m, `${list.map((h) => h.name).join(' & ')}: next strike +${v}${f.pierce ? ' (pierce)' : ''}.`, 'hero');
        break;
      }
      case 'preempt': {
        const v = num(f.val, P, E);
        const list = f.party === true || bool(f.party, P, E) ? T.liveHeroes(m) : [actor];
        list.forEach((h) => {
          h.states.Preempt = { v, reflect: num(f.reflect, P, E), t: f.dur || 2, reposition: f.reposition || 0 };
          fx(m, { t: 'state', ent: h.uid, name: 'Preempt' });
        });
        say(m, `${list.map((h) => h.name).join(' & ')} pre-empt: next hit −${v}.`, 'hero');
        break;
      }
      case 'counter': {
        actor.states.Counter = { dmg: num(f.dmg, P, E), push: f.push || 0, t: f.dur || 2 };
        say(m, `${actor.name} readies a deflection.`, 'hero');
        break;
      }
      case 'thorns':
        addTimed(m, actor, 'Thorns', num(f.dur, P, E) || 1, { v: num(f.val, P, E) });
        say(m, `${actor.name}'s skin turns hostile (${num(f.val, P, E)}).`, 'hero');
        break;
      case 'stasis':
        addTimed(m, actor, 'Stasis', num(f.dur, P, E) || 1);
        say(m, `${actor.name} steps outside time.`, 'hero');
        break;
      case 'hover':
        addTimed(m, actor, 'Hover', num(f.dur, P, E), { noAp: !!f.noAp });
        say(m, `${actor.name} hovers.`, 'hero');
        break;
      case 'weightless':
        addTimed(m, actor, 'Weightless', num(f.dur, P, E));
        say(m, `${actor.name} is weightless.`, 'hero');
        break;
      case 'hazardImmune': {
        const d = num(f.dur, P, E);
        if (d <= 0) break;
        const list = f.party ? T.liveHeroes(m) : [actor];
        list.forEach((h) => addTimed(m, h, 'HazardImmune', d));
        break;
      }
      case 'statusImmune':
        addTimed(m, actor, 'StatusImmune', num(f.dur, P, E));
        break;
      case 'guard': {
        const d = num(f.dur, P, E);
        const list = f.party ? T.liveHeroes(m) : [actor];
        list.forEach((h) => addTimed(m, h, 'Guard', d));
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
      case 'freecast': {
        const n = num(f.n, P, E);
        if (n <= 0) break;
        actor.states.Freecast = { n: (actor.states.Freecast ? actor.states.Freecast.n : 0) + n };
        say(m, `${actor.name}: the next ${n} card${n > 1 ? 's' : ''} won't go to the track.`, 'hero');
        break;
      }
      case 'phoenix':
        actor.states.Phoenix = { hp: num(f.hp, P, E), t: num(f.dur, P, E) };
        say(m, `${actor.name} seeds a return (${num(f.hp, P, E)} hp if downed within ${num(f.dur, P, E)}).`, 'hero');
        break;
      case 'absorb':
        actor.states.Absorb = { n: num(f.n, P, E), t: num(f.dur, P, E), face: f.face || 'C' };
        say(m, `${actor.name} will absorb the next ${num(f.n, P, E)} ranged hit(s).`, 'hero');
        break;
      case 'ambushTrap':
        actor.states.AmbushTrap = {
          dmg: num(f.dmg, P, E),
          t: num(f.dur, P, E) || 2,
          weaken: f.weaken || 0,
          anchor: num(f.anchor, P, E),
        };
        say(m, `${actor.name} sets a trigger (${num(f.dmg, P, E)} to the first foe that closes).`, 'hero');
        break;
      case 'aura': {
        actor.states.Auras = actor.states.Auras || [];
        actor.states.Auras.push({
          kind: f.kind,
          val: num(f.val, P, E),
          radius: num(f.radius, P, E),
          t: num(f.dur, P, E),
          markEntrants: !!f.markEntrants,
        });
        if (f.kind === 'reveal') revealArea(m, actor, actor.pos, num(f.radius, P, E), 1);
        say(m, `${actor.name} extends an aura (${f.kind}).`, 'hero');
        break;
      }
      /* ---------- RESOURCES ---------- */
      case 'heal': {
        const n = num(met ? f.n : f.elseVal, P, E);
        if (n <= 0) break;
        let list = [actor];
        if (f.party) list = T.liveHeroes(m);
        else if (f.target === 'ally') list = ally && !ally.downed ? [ally] : [];
        else if (f.target === 'chosenAlly') {
          const t = targetEnt(m, ctx);
          list = t && t.kind === 'hero' ? [t] : [actor];
        }
        list.forEach((h) => {
          let amt = n;
          if (f.doubleIfLow && h.hp < h.maxHp / 4) amt *= 2;
          const before = h.hp;
          h.hp = Math.min(h.maxHp, h.hp + amt);
          fx(m, { t: 'heal', ent: h.uid, amount: h.hp - before });
        });
        if (list.length)
          say(m, `${list.map((h) => h.name).join(' & ')} heal${list.length > 1 ? '' : 's'} ${n}.`, 'hero');
        break;
      }
      case 'revive': {
        const t = ally;
        if (!t || !t.downed) break;
        if (f.adjacent && !B.adjacent(bd, actor.pos, t.pos)) {
          say(m, 'No downed ally adjacent.', 'sys');
          break;
        }
        t.downed = false;
        t.hp = num(f.hp, P, E);
        say(m, `${t.name} rises with ${t.hp}!`, 'sys');
        fx(m, { t: 'revive', ent: t.uid });
        break;
      }
      case 'cleanse': {
        const list = f.party ? T.liveHeroes(m) : [actor];
        list.forEach((h) => {
          ['Anchored', 'Rooted', 'Weak', 'Slow', 'SlowSelf', 'NoTele'].forEach((k) => delete h.states[k]);
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
      case 'hasten': {
        const n = num(f.n, P, E);
        if (n <= 0) break;
        const list = f.who === 'ally' ? (ally ? [ally] : []) : [actor];
        list.forEach((h) => T.hasten(h, n));
        say(m, `${list.map((h) => h.name).join(' & ')}: track slides ${n} extra.`, 'hero');
        break;
      }
      case 'clock': {
        const d = num(f.delta, P, E);
        if (m.clock) {
          m.clock.value += d;
          say(m, `The clock gains ${d}.`, 'sys');
        }
        if (m.hazardSpread) m.hazardSpread.delayed += Math.max(0, d);
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
            face: typeof f.face === 'function' ? f.face(P, E) : f.face,
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
      case 'trap': {
        let node = ctx.node;
        const r = f.remote != null ? num(f.remote, P, E) : 1;
        if (node == null) break;
        if (B.dist(bd, actor.pos, node, true) > r || bd.nodes[node].height) {
          say(m, 'Too far to set.', 'sys');
          break;
        }
        m.traps[node] = m.traps[node] || [];
        m.traps[node].push({
          owner: actor,
          dmg: num(f.dmg, P, E),
          anchor: num(f.anchor, P, E),
          counted: !!f.counted,
          noTele: !!f.noTele,
        });
        say(m, `${actor.name} arms a ${f.counted ? 'counted ' : ''}snare on node ${node}.`, 'hero');
        fx(m, { t: 'trapSet', node });
        break;
      }
      case 'zone': {
        const node = ctx.node != null ? ctx.node : actor.pos;
        m.zones.push({
          node,
          radius: f.radius || 1,
          kind: f.kind,
          dmg: f.dmg || 0,
          weaken: f.weaken || 0,
          hideHeroes: !!f.hideHeroes,
          t: f.dur || 2,
          owner: actor.uid,
        });
        say(m, `${actor.name} seeds spores around node ${node}.`, 'hero');
        fx(m, { t: 'zone', node });
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
          uid: UID++,
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
      case 'clearHazard': {
        const r = f.radius || 1;
        [actor.pos].concat(B.within(bd, actor.pos, r, true)).forEach((n) => {
          if (bd.nodes[n].hazard) {
            bd.nodes[n].hazard = false;
          }
        });
        say(m, `${actor.name} clears the nearby hazard.`, 'hero');
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
      case 'redirect': {
        const t = targetEnt(m, ctx);
        if (!t || t.kind !== 'enemy') break;
        st(t).Redirect = { t: 1 };
        say(m, `${t.name}'s nervous field is overridden — its next attack turns on its own.`, 'hero');
        break;
      }
      default:
        say(m, `(unimplemented verb ${f.v})`, 'sys');
    }
    // deferred decoy placement (husk/blink): place at origin after teleport
    if (ctx.pendingDecoy && f.v === 'teleport') {
      const d = ctx.pendingDecoy;
      if (!T.occupied(m, d.pos)) {
        m.decoys.push(d);
        say(m, `A decoy remains behind.`, 'hero');
        fx(m, { t: 'decoy', node: d.pos });
      }
      ctx.pendingDecoy = null;
    }
  };
  // a 'here' decoy with no teleport afterwards (e.g. Drop Tail then move): place after move
  const origRun = T.runEffects;
  T.runEffects = function (m, actor, fxs, ctx) {
    origRun(m, actor, fxs, ctx);
    if (ctx.pendingDecoy) {
      const d = ctx.pendingDecoy;
      if (!T.occupied(m, d.pos)) {
        m.decoys.push(d);
        fx(m, { t: 'decoy', node: d.pos });
      }
      ctx.pendingDecoy = null;
    }
  };

  function onHeroEnter(m, h, node) {
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
    if (st(h).Rooted || st(h).SlowSelf) return { ok: false, why: 'rooted' };
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
    if (T.occupied(m, dest)) return { ok: false, why: 'occupied' };
    const steps = p.length - 1;
    const bonus = st(h).Morph && st(h).Morph.move ? 1 : 0;
    const payable = Math.max(0, steps - free - bonus);
    if (T.apValue(h) < payable) return { ok: false, why: 'need ' + payable + ' AP' };
    T.pay(h, payable);
    h.freeMove = Math.max(0, free - steps);
    if (isAnchored(h) && st(h).Anchored && !st(h).Rooted) delete st(h).Anchored; // choosing to walk ends a self-anchor
    for (let i = 1; i < p.length; i++) {
      moveEntity(m, h, p[i], 'walk');
      onHeroEnter(m, h, p[i]);
    }
    say(m, `${h.name} moves to node ${dest}${payable ? ` (${payable} AP)` : ' (free)'}.`, 'hero');
    T.afterAction(m);
    return { ok: true };
  };
  T.doInteract = function (m, h, node, viaAbility) {
    const bd = m.board;
    const nd = bd.nodes[node];
    const ob = m.objective;
    if (!nd || !nd.objective) return { ok: false, why: 'nothing here' };
    const here = h.pos === node,
      adj = B.adjacent(bd, h.pos, node);
    if (!viaAbility) {
      if (!(here || (adj && !nd.height)))
        return { ok: false, why: nd.height ? 'must stand on the ledge (or use a Reach verb)' : 'not adjacent' };
      if (T.apValue(h) < R().INTERACT_AP) return { ok: false, why: 'need 2 AP' };
      T.pay(h, R().INTERACT_AP);
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
    } else if (k === 'beacon') {
      say(m, 'The beacon only needs you near it at round end.', 'sys');
      return { ok: false, why: 'no interaction' };
    } else return { ok: false, why: 'nothing to do' };
    fx(m, { t: 'interact', node });
    T.afterAction(m);
    return { ok: true };
  };
  T.rally = function (m, h) {
    const ally = T.allyOf(m, h);
    if (!ally || !ally.downed) return { ok: false, why: 'no downed ally' };
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
  T.useGear = function (m, h, gi, ai, ctx) {
    const g = h.gear[gi];
    if (!g) return { ok: false };
    const def = T.GEAR_BY[g.id];
    const ab = def.abilities[ai];
    if (h.downed || h.rested) return { ok: false, why: 'cannot act' };
    if (g.cds[ai] > 0) return { ok: false, why: 'cooling' };
    if (m.run.crystals < ab.cost) return { ok: false, why: 'need ◇' };
    const tg = T.targetsFor(m, h, ab.tgt, ab, 0, 0);
    if (tg.need !== 'none' && (!tg.options || !tg.options.length)) return { ok: false, why: 'no target' };
    m.run.crystals -= ab.cost;
    g.cds[ai] = ab.cd;
    say(m, `${h.name} uses ${def.name} — ${ab.n} (${ab.cost} ◇).`, 'hero');
    fx(m, { t: 'gear', hero: h.uid });
    const rctx = ctx || {};
    Object.assign(rctx, { P: 0, E: 0 });
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
            const b = T.makeEnemy(T.ENEMIES[e.type].spawns, Math.max(1, m.tier - 1), spot);
            m.enemies.push(b);
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
      if (h.downed) continue;
      T.heroTurnStart(m, h);
    }
    m.fx.push({ t: 'round', round: m.round });
  };
  function spawnWave(m) {
    for (const sp of m.spawns) {
      if (m.round < sp.startRound) continue;
      const liveSwarm = m.enemies.filter((e) => e.alive && e.spawned).length;
      if (liveSwarm >= sp.max) continue;
      const nodes = m.rng.shuffle(sp.nodes).filter((n) => !T.occupied(m, n));
      if (!nodes.length) continue;
      const count = m.tier >= 2 && m.round % 2 === 0 ? 2 : 1;
      for (let i = 0; i < count && i < nodes.length; i++) {
        const type = m.rng.pick(sp.pool);
        const e = T.makeEnemy(type, m.tier, nodes[i]);
        e.spawned = true;
        m.enemies.push(e);
        m.spawnedCount++;
        say(m, `A ${e.name} emerges from the spawn-node.`, 'enemy');
        fx(m, { t: 'spawn', ent: e.uid, pos: nodes[i] });
      }
    }
  }
  T.heroTurnStart = function (m, h) {
    T.slideTrack(h, 1);
    for (const v of T.boonVals(h, 'roundStart')) if (v.round === m.round && v.hasten) T.slideTrack(h, v.hasten);
    h.roundFlags = { struck: false };
    // engines
    for (const en of h.states.Engines || []) {
      if (en.kind === 'regen') {
        const b = h.hp;
        h.hp = Math.min(h.maxHp, h.hp + en.val);
        if (h.hp > b) {
          say(m, `${h.name} regenerates ${h.hp - b}.`, 'hero');
          fx(m, { t: 'heal', ent: h.uid, amount: h.hp - b });
        }
        if (en.cleanse) ['Anchored', 'Rooted', 'Weak', 'Slow'].forEach((k) => delete h.states[k]);
      } else if (en.kind === 'draw') {
        if (en.mintAlt) T.mint(h, en.face || 'C', en.mintAlt);
        else T.draw(h, en.face || 'C', en.val || 1);
        say(m, `${h.name}'s engine yields ${en.face || 'C'}.`, 'hero');
      } else if (en.kind === 'ap') {
        T.mint(h, 'AP', en.val || 1);
      }
    }
    if (h.states.Hover && !h.states.Hover.noAp) T.mint(h, 'AP', 1);
    T.rollDice(m, h);
    // zones hide heroes
    for (const z of m.zones)
      if (z.hideHeroes && B.dist(m.board, z.node, h.pos, true) <= z.radius) setHidden(m, h, 1, false);
    // keen sense
    if (T.boonVals(h, 'keen').length)
      for (const e of T.liveEnemies(m))
        if (isHidden(e) && B.adjacent(m.board, h.pos, e.pos)) breakHidden(m, e, 'keen sense');
    (h.states.Auras || []).forEach((a) => {
      a.markedThisRound = false;
      if (a.kind === 'reveal') revealArea(m, h, h.pos, a.radius, 1);
    });
  };

  T.endHeroPhase = function (m) {
    if (m.over) return;
    m.phase = 'enemy';
    for (const h of m.heroes) {
      h.temp = [];
      h.freeMove = 0;
    }
    T.enemyPhase(m);
    if (!m.over) T.roundEnd(m);
    if (!m.over) T.beginRound(m);
  };

  T.roundEnd = function (m) {
    m.phase = 'end';
    // counted snares spring on enemies still standing in them
    for (const e of T.liveEnemies(m)) T.springCounted(m, e);
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
    // hazards
    for (const h of T.liveHeroes(m))
      if (m.board.nodes[h.pos].hazard && !hazardImmune(h)) {
        say(m, `${h.name} is caught in the hazard.`, 'enemy');
        const d = T.damage(m, null, h, R().HAZARD_DMG, { kind: 'true', trueDmg: true, label: 'floods over' });
        m.stats.hazardDmg += d;
      }
    for (const e of T.liveEnemies(m))
      if (m.board.nodes[e.pos].hazard && !hazardImmune(e) && !e.boss) {
        T.damage(m, null, e, R().HAZARD_DMG, { kind: 'true', trueDmg: true, label: 'floods over' });
      }
    // zones
    for (const z of m.zones)
      for (const e of T.liveEnemies(m))
        if (B.dist(m.board, z.node, e.pos, true) <= z.radius) {
          if (z.dmg)
            T.damage(m, m.heroes.find((h) => h.uid === z.owner) || null, e, z.dmg, {
              kind: 'area',
              label: 'is choked by spores for',
            });
          if (z.weaken && e.alive) weaken(m, e, z.weaken, 1);
        }
    // dots & auras
    for (const e of T.liveEnemies(m)) {
      const dots = st(e).Dots || [];
      for (const d of dots) {
        const owner = m.heroes.find((h) => h.uid === d.owner);
        T.damage(m, owner || null, e, d.v, { kind: 'true', trueDmg: true, label: `(${d.kind}) wears down` });
        if (d.healOwner && owner && !owner.downed) {
          owner.hp = Math.min(owner.maxHp, owner.hp + d.healOwner);
        }
        d.t--;
        if (d.escalate) d.v += d.escalate;
        if (!e.alive) break;
      }
      if (e.alive) st(e).Dots = dots.filter((d) => d.t > 0);
      if (e.alive && !st(e).Dots.length) delete st(e).Dots;
    }
    for (const h of T.liveHeroes(m))
      for (const a of h.states.Auras || [])
        if (a.kind === 'digest') {
          for (const e of T.liveEnemies(m))
            if (isAnchored(e) && !e.anchoredPerm) {
              T.damage(m, h, e, a.val, { kind: 'true', trueDmg: true, label: 'digests' });
              h.hp = Math.min(h.maxHp, h.hp + 1);
            }
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
          say(m, 'The Terminal logs the current. Held!', 'sys');
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
        } else if (k === 'Auras') {
          s[k] = v.filter((x) => --x.t > 0);
          if (!s[k].length) delete s[k];
        } else if (k === 'Empower') {
          s[k] = v.filter((x) => x.t == null || --x.t > 0);
          if (!s[k].length) delete s[k];
        } else if (v && typeof v.t === 'number' && v.t < 90) {
          v.t--;
          if (v.t <= 0) delete s[k];
        }
      }
    };
    m.heroes.forEach(tick);
    m.enemies
      .filter((e) => e.alive)
      .forEach((e) => {
        tick(e);
        if (e.baseShield && e.shield < e.baseShield && e.type === 'warden') e.shield = e.baseShield;
      });
    m.zones = m.zones.filter((z) => --z.t > 0);
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
        say(m, 'THE HEART CRACKS. The Vault begins to drown — seven rounds.', 'sys');
        m.clock = { value: 7, label: 'Rounds until the Vault drowns', onZero: 'lose' };
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
      else if (b.id === 'both') b.achieved = m.won && T.liveHeroes(m).length === 2;
      else if (b.id === 'spawners') b.achieved = !m.enemies.some((e) => e.type === 'spawner' && e.alive);
      if (!m.won) b.achieved = false;
    }
  }

  /* ───────────────────────────── BOSS HP PROGRESS for UI ───────────────────────────── */
  T.describeState = function (k, v) {
    const map = {
      Hidden: 'Hidden — immune to lane (ranged) strikes. Broken by melee contact, area, being moved, or being Located.',
      Shield: `Shield ${v.v} — each hit is reduced by ${v.v}${v.all ? ', even area' : ' (area bypasses)'}. Pierce and true damage ignore it.`,
      Anchored:
        'Anchored — cannot be pushed or pulled. An anchored foe cannot walk or blink; a hero who walks lets go. Still acts fully.',
      Held: 'Held — immovable by anyone.',
      Rooted: 'Rooted — cannot walk while it lasts. Still acts.',
      Marked: 'Marked — the next hit on this foe deals +2.',
      Weak: `Weakened ${v.v} — its hits deal −${v.v}.`,
      Located: 'Located — cannot Hide; can be targeted and struck down the lane even if Hidden.',
      Studied: `Studied — hero hits deal +${v.n}.`,
      Exposed: `Exposed — next hit ignores Shield and deals +${v.bonus}.`,
      Thorns: `Thorns ${v.v} — melee attackers take ${v.v}.`,
      Preempt: `Pre-empt — next hit taken is −${v.v}${v.reflect ? ', reflects ' + v.reflect : ''}.`,
      Counter: `Counter — next melee against you is turned back for ${v.dmg}.`,
      Stasis: 'Stasis — untargetable.',
      Hover: 'Hover — immune to hazards, traps, push/pull.',
      Weightless: 'Weightless — immune to force/traps/hazards; may walk onto height.',
      Morph: `Morph — strikes +${v.bonus}${v.reach ? ', reach 2' : ''}${v.climb ? ', can climb' : ''}.`,
      HazardImmune: 'Immune to hazards.',
      StatusImmune: 'Immune to Weaken/Anchor.',
      Guard: 'Guarded — ambush damage halved.',
      Freecast: `Next ${v.n} card(s) skip the track.`,
      Phoenix: `Phoenix — revive with ${v.hp} if downed.`,
      Absorb: `Absorb — next ${v.n} ranged hit(s) negated, minting Charge.`,
      AmbushTrap: `Trigger — first foe to close takes ${v.dmg}.`,
      Engines: 'Engine running.',
      Auras: 'Aura active.',
      Empower: 'Empowered — next strike(s) boosted.',
      Slow: 'Cannot move.',
      SlowSelf: 'Cannot move this round.',
      NoTele: 'Cannot teleport.',
      Redirect: 'Overridden — next attack hits an ally.',
      Dots: 'Taking damage over time.',
    };
    return map[k] || k;
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
