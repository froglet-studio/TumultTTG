/* ============================================================================
   TUMULT — SCALING: how a mission answers the squad that meets it (pure; no DOM).
   Every mission is written for two pilots who set out new. A bigger squad brings
   more hands, so the mission brings more to do and more to fight; pilots who
   come back from earlier expeditions bring their growth, and the mission grows
   to meet it. Every rule here is a number a table can work out before play:
   the squad's power (its pilots' power, added up) and the chosen difficulty,
   then a few additions to the mission.
   Board shape, and the seed that names it, never change: what scales is what
   stands on the board and what the objective asks (docs/reference/SCALING.md).
   ========================================================================== */
(function (T) {
  /**
   * The formulas, as data. An expedition is sized, as it sets out, from two things: the squad's **power**, the
   * sum of its pilots' power (T.pilotPowerFor: PILOT for a new pilot, one more for every level past 1), and the
   * difficulty the players chose (the tide, T.TIDES, which shapes clocks and objectives tier by tier). Every
   * mission is written for two new pilots, power 2 × PILOT; each point of power past that adds, to every mission:
   *  - hp:    each foe's vitality grows by this share.
   *  - foes:  extra foes (rounded down).
   *  - need:  more to do: the objective's count (seals, rounds held, caches, docks, marks), likewise.
   *  - swarm: a swarm's cap grows by this, likewise.
   * One more new pilot is PILOT points (+50% vitality, 2 foes, 1 more to do, a swarm 1 larger); a level is 1.
   */
  T.SCALING = {
    BASE_SQUAD: 2,
    PILOT: 10, // a new pilot's power
    LEVEL_UP: 6, // points of growth a level (T.pilotLevel): about what a tier of a run gives
    ROAD_UP: 3, // points of growth the route expects a pilot to gain for every row it has come (tools/sim.js runs)
    CARD_UP: 2, // a trait past the first six counts as this many points
    power: { hp: 0.05, foes: 0.2, need: 0.1, swarm: 0.1 },
    // the Heart: its chamber has no objective to grow, so a stronger squad meets more of the fight itself. Per point
    // of power, the Heart's foes take this much more vitality on top of `power.hp`, and its extras are `foes` of the usual;
    // per point short of two new pilots, `under` less on top of `under.hp`.
    boss: { hp: 0.02, foes: 0.5, under: 0.015 },
    // a squad weaker than two new pilots (a lone pilot: Garrett, 2026-11-22, "solo only needs one character"). For
    // every point of power short of two new pilots' the mission gives back, rounded to the nearest:
    //  - hp:    each foe's vitality shrinks by this share.
    //  - foes:  fewer foes: the mission's own rank and file, the last placed first (never its boss, elite or spawner).
    //  - need:  less to do (never under 1); swarm: a swarm's cap shrinks; clock: rounds more on every clock the tide
    //           shortens (not a hold's).
    // A lone new pilot is 10 short: 60% vitality, 2 fewer foes, 1 less to do, a swarm 1 smaller, a clock 1 round longer.
    under: { hp: 0.04, foes: 0.2, need: 0.1, swarm: 0.1, clock: 0.1 },
  };

  /** How many pilots fly in this run (a squad is one to five). */
  T.squadSize = (run) => Math.max(run.heroes.length, run.party ? run.party.owner.length : 0, 1);
  /**
   * A pilot's power for a mission. As it sets out: PILOT, and one more for every level past 1 it came with
   * (h.level, fixed as it sets out). On the road it keeps growing, and the route already expects that: about
   * ROAD_UP points for every row behind the stop (a tier's worth, LEVEL_UP a tier, where the stop's row is not
   * known). Growth past that counts too, a level for every LEVEL_UP points, so a squad that grows faster than the
   * road meets missions that grow with it; one that grows slower never brings less than it set out with.
   * `at` is { tier, row } of the mission; with neither, the power it set out with.
   */
  T.pilotPowerFor = function (h, at) {
    const S = T.SCALING;
    const setOut = Math.max(0, ((h && h.level) || 1) - 1);
    if (!at || (!at.tier && at.row == null)) return S.PILOT + setOut;
    const from = h.setOut != null ? h.setOut : setOut * S.LEVEL_UP; // growth points it set out with
    const expected = at.row != null ? at.row * S.ROAD_UP : (at.tier - 1) * S.LEVEL_UP;
    const ahead = Math.floor((T.pilotPower(h) - from - expected) / S.LEVEL_UP);
    return S.PILOT + setOut + Math.max(0, ahead);
  };
  /** The squad's power: the sum of its pilots' (a seat whose pilot is still drafting counts as a new pilot). */
  T.squadPower = function (run, at) {
    const hs = run.heroes.filter(Boolean);
    const waiting = Math.max(0, T.squadSize(run) - hs.length);
    return hs.reduce((s, h) => s + T.pilotPowerFor(h, at), 0) + waiting * T.SCALING.PILOT;
  };
  /** The squad's level past 1, averaged over its pilots and rounded down (what the route and pilot cards show). */
  T.squadLevel = function (run) {
    const hs = run.heroes.filter(Boolean);
    if (!hs.length) return 0;
    const sum = hs.reduce((s, h) => s + Math.max(0, (h.level || 1) - 1), 0);
    return Math.floor(sum / hs.length);
  };
  /**
   * What the squad adds to a mission at `at` ({ tier, row }):
   * { size, power, over, under, hp (percent), foes, fewer, need, swarm, clock }.
   * `over` is the squad's power past two new pilots', `under` how far short of it a smaller squad falls. Past it
   * the mission grows (foes, need and swarm, rounded down); short of it, it gives back (fewer foes, need and swarm
   * below zero, clocks a round longer, rounded to the nearest). Two new pilots add nothing: hp 100, and zero of
   * everything else. With no tier, what it adds as the expedition sets out.
   */
  T.scaleFor = function (run, at) {
    const S = T.SCALING;
    const size = Math.max(0, T.squadSize(run) - S.BASE_SQUAD);
    const power = T.squadPower(run, at);
    const over = Math.max(0, power - S.BASE_SQUAD * S.PILOT);
    const under = Math.max(0, S.BASE_SQUAD * S.PILOT - power);
    const add = (k) => Math.floor(over * S.power[k] + 1e-9);
    const back = (k) => Math.round(under * S.under[k] + 1e-9);
    return {
      size,
      power,
      over,
      under,
      hp: Math.round(100 * (1 + over * S.power.hp - under * S.under.hp)),
      foes: add('foes'),
      fewer: back('foes'),
      need: add('need') - back('need'),
      swarm: add('swarm') - back('swarm'),
      clock: back('clock'),
    };
  };
  /** A tide with the squad's additions folded in: the missions read need and swarm from their tide. */
  T.scaledTide = function (tide, sc) {
    if (!sc.need && !sc.swarm && !sc.clock) return tide;
    return Object.assign({}, tide, {
      squadNeed: Math.max(0, sc.need), // what the squad adds, for a mission whose room caps it (the Vault's ledge)
      need: tide.need.map((v) => v + sc.need),
      swarm: tide.swarm.map((v) => v + sc.swarm),
      clock: tide.clock.map((v) => v - (sc.clock || 0)),
    });
  };
  /** The foes that may come as extras: the mission's own rank and file, never its boss, elite or spawner. */
  const RANK = (t) => {
    const d = T.ENEMIES[t];
    return d && !d.boss && !d.elite && t !== 'spawner' && t !== 'heart';
  };
  /**
   * Fold the squad's scaling into a mission spec: starting spaces for every pilot, foe vitality, and the
   * extra foes. Extras and extra starts come from a stream of their own (`rng`), so the board itself,
   * and everything else the mission's seed names, is the same whoever plays it.
   */
  T.scaleSpec = function (spec, sc, pilots, rng) {
    const b = spec.board;
    const enemyAt = new Set(spec.enemies.map((e) => e.node));
    const free = (id, onGoal) => {
      const n = b.nodes[id];
      return n && !n.height && !n.hazard && !n.terrain && (onGoal || !n.objective) && !n.spawn && !enemyAt.has(id);
    };
    // a start for every pilot: the mission's own first, then free spaces from the front column back
    if (spec.starts.length < pilots) {
      const taken = new Set(spec.starts);
      const cell = {};
      Object.keys(b.at).forEach((k) => (cell[b.at[k]] = k.split(',').map(Number)));
      const order = (p, q) => cell[p][0] - cell[q][0] || cell[p][1] - cell[q][1] || p - q;
      const ids = Object.keys(cell).map(Number);
      // a space with nothing on it first; on a crowded board, one with an objective on it (a mark, a crate)
      const near = ids
        .filter((id) => !taken.has(id) && free(id))
        .sort(order)
        .concat(ids.filter((id) => !taken.has(id) && !free(id) && free(id, true)).sort(order));
      spec.starts = spec.starts.concat(near.slice(0, pilots - spec.starts.length));
    }
    // a smaller squad meets fewer foes: the mission's rank and file, the last placed first (the escorts, then the
    // crew), and never the last foe on the board
    for (let k = 0; k < (sc.fewer || 0) && spec.enemies.length > 1; k++) {
      let j = spec.enemies.length - 1;
      while (j >= 0 && !RANK(spec.enemies[j].type)) j--;
      if (j < 0) break;
      spec.enemies.splice(j, 1);
    }
    const B = T.SCALING.boss;
    const hp = spec.isBoss ? sc.hp + Math.round(100 * (sc.over * B.hp - sc.under * B.under)) : sc.hp;
    if (hp !== 100) spec.foeHp = hp;
    // the Heart's chamber takes half as many extras, from its own spawn: its fight is the Heart and its Spawners
    const extras = spec.isBoss ? Math.floor(sc.foes * T.SCALING.boss.foes + 1e-9) : sc.foes;
    if (extras > 0) {
      const pool = spec.enemies.map((e) => e.type).filter(RANK);
      const spawned = (spec.spawns || []).flatMap((x) => x.pool || []).filter(RANK);
      const kinds = pool.length ? pool : spawned.length ? spawned : ['biter'];
      for (let k = 0; k < extras; k++) {
        const taken = new Set(spec.enemies.map((e) => e.node).concat(spec.starts));
        const open = (key) => {
          const id = b.at[key];
          const n = b.nodes[id];
          return !taken.has(id) && n && !n.hazard && !n.objective && (!n.terrain || T.TERRAIN[n.terrain].foot);
        };
        // the back two columns, as the tides' escorts stand; a board full there takes them past the front column
        let spots = Object.keys(b.at).filter((key) => +key.split(',')[0] >= b.cols - 2 && open(key));
        if (!spots.length) spots = Object.keys(b.at).filter((key) => +key.split(',')[0] >= 2 && open(key));
        if (!spots.length) break;
        spec.enemies.push({ type: rng.pick(kinds), node: b.at[rng.pick(spots)] });
      }
    }
    return spec;
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
