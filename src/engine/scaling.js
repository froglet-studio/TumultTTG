/* ============================================================================
   TUMULT — SCALING: how a mission answers the squad that meets it (pure; no DOM).
   Every mission is written for two pilots who set out new. A bigger squad brings
   more hands, so the mission brings more to do and more to fight; pilots who
   come back from earlier expeditions bring their growth, and the mission grows
   to meet it. Every rule here is a number a table can work out before play:
   the squad's size and its level, then a few additions to the mission.
   Board shape, and the seed that names it, never change: what scales is what
   stands on the board and what the objective asks (docs/reference/SCALING.md).
   ========================================================================== */
(function (T) {
  /**
   * The formulas, as data. `size` is the squad's pilots past the two every mission is written for;
   * `level` is the squad's renown, its pilots' levels past 1, averaged and rounded down (T.squadLevel).
   *  - hp:    each foe's vitality grows by this share, per pilot past two and per level.
   *  - foes:  extra foes, per pilot past two and per level (rounded down).
   *  - need:  more to do: the objective's count (seals, rounds held, caches, docks, marks), likewise.
   *  - swarm: a swarm's cap grows by this, likewise.
   */
  T.SCALING = {
    BASE_SQUAD: 2,
    LEVEL_UP: 6, // points of growth a level (T.pilotLevel): about what a tier of a run gives
    CARD_UP: 2, // a trait past the first six counts as this many points
    size: { hp: 0.5, foes: 2, need: 1, swarm: 1 },
    level: { hp: 0.05, foes: 0.25, need: 0.25, swarm: 0.25 },
    // the Heart: its chamber has no objective to grow, so a bigger squad meets more of the fight itself. Per pilot
    // past two, the Heart's foes take this much more vitality on top of `size.hp`, and its extras are `foes` of the usual.
    boss: { hp: 0.2, foes: 0.5 },
  };

  /** How many pilots fly in this run (a squad is two to five). */
  T.squadSize = (run) => Math.max(run.heroes.length, run.party ? run.party.owner.length : 0, 1);
  /** The squad's level past 1, averaged over its pilots and rounded down (pilots new to the road are level 1). */
  T.squadLevel = function (run) {
    const hs = run.heroes.filter(Boolean);
    if (!hs.length) return 0;
    const sum = hs.reduce((s, h) => s + Math.max(0, (h.level || 1) - 1), 0);
    return Math.floor(sum / hs.length);
  };
  /**
   * What the squad adds to a mission: { size, level, hp (percent), foes, need, swarm }.
   * Two new pilots add nothing: hp 100, and zero of everything else.
   */
  T.scaleFor = function (run) {
    const S = T.SCALING;
    const size = Math.max(0, T.squadSize(run) - S.BASE_SQUAD);
    const level = T.squadLevel(run);
    const add = (k) => Math.floor(size * S.size[k] + level * S.level[k] + 1e-9);
    return {
      size,
      level,
      hp: Math.round(100 * (1 + size * S.size.hp + level * S.level.hp)),
      foes: add('foes'),
      need: add('need'),
      swarm: add('swarm'),
    };
  };
  /** A tide with the squad's additions folded in: the missions read need and swarm from their tide. */
  T.scaledTide = function (tide, sc) {
    if (!sc.need && !sc.swarm) return tide;
    return Object.assign({}, tide, {
      squadNeed: sc.need, // what the squad adds, for a mission whose room caps it (the Vault's ledge)
      need: tide.need.map((v) => v + sc.need),
      swarm: tide.swarm.map((v) => v + sc.swarm),
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
    const hp = spec.isBoss ? sc.hp + Math.round(100 * sc.size * T.SCALING.boss.hp) : sc.hp;
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
