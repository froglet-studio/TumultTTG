/* ============================================================================
   TUMULT — GENERATORS
   Board generators, the mission archetypes (each a title, a blurb and a
   generator that returns a mission spec the engine instantiates), and the
   Tide Map. Moved out of src/data/world.js so that data stays data and code
   is formatted and tested like the rest of the engine. Deterministic: every
   draw comes from the rng passed in.
   ========================================================================== */
(function (T) {
  /* ───────────────────────────── BOARD GENERATORS ───────────────────────────── */
  // A board is a graph: nodes in one or more coloured zones (two units that share a zone are in range of a
  // ranged strike, as in Unmatched), walk edges, climb edges to height nodes. On a grid, each column is a zone.
  function gridBoard(rng, cols, rows, opts) {
    opts = opts || {};
    const nodes = {};
    const edges = [];
    const climb = [];
    const zoneKeys = ['A', 'B', 'C', 'D'];
    let id = 1;
    const at = {};
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const n = {
          id,
          x: c,
          y: r,
          zones: [zoneKeys[c % zoneKeys.length]],
          height: false,
          spawn: false,
          hazard: false,
          objective: null,
          start: false,
        };
        nodes[id] = n;
        at[c + ',' + r] = id;
        id++;
      }
    // walk edges: horizontal + vertical
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const a = at[c + ',' + r];
        if (c + 1 < cols) edges.push([a, at[c + 1 + ',' + r]]);
        if (r + 1 < rows) edges.push([a, at[c + ',' + (r + 1)]]);
      }
    // knock out a few interior edges to make corridors (never isolate a node)
    const removals = opts.corridors == null ? Math.floor((cols * rows) / 6) : opts.corridors;
    for (let k = 0; k < removals; k++) {
      const i = Math.floor(rng() * edges.length);
      const [a, b] = edges[i];
      const test = edges.filter((e, j) => j !== i);
      if (connected(Object.keys(nodes).map(Number), test)) edges.splice(i, 1);
    }
    // a couple of diagonal shortcuts
    const diags = opts.diagonals == null ? 2 : opts.diagonals;
    for (let k = 0; k < diags; k++) {
      const c = Math.floor(rng() * (cols - 1)),
        r = Math.floor(rng() * (rows - 1));
      const a = at[c + ',' + r],
        b = at[c + 1 + ',' + (r + 1)];
      if (!edges.some((e) => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))) edges.push([a, b]);
    }
    return { nodes, edges, climb, at, cols, rows, nextId: id };
  }
  function connected(ids, edges) {
    const adj = {};
    ids.forEach((i) => (adj[i] = []));
    edges.forEach(([a, b]) => {
      adj[a].push(b);
      adj[b].push(a);
    });
    const seen = new Set([ids[0]]);
    const q = [ids[0]];
    while (q.length) {
      const n = q.pop();
      for (const m of adj[n])
        if (!seen.has(m)) {
          seen.add(m);
          q.push(m);
        }
    }
    return seen.size === ids.length;
  }
  function addHeight(board, nearIds, zone) {
    const n = {
      id: board.nextId++,
      x: 0,
      y: -1,
      zones: [zone || 'B'],
      height: true,
      spawn: false,
      hazard: false,
      objective: null,
      start: false,
    };
    // position above the mean of its anchors
    const xs = nearIds.map((i) => board.nodes[i].x),
      ys = nearIds.map((i) => board.nodes[i].y);
    n.x = xs.reduce((a, b) => a + b, 0) / xs.length;
    n.y = Math.min(...ys) - 0.9;
    board.nodes[n.id] = n;
    nearIds.forEach((i) => board.climb.push([i, n.id]));
    return n.id;
  }
  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }
  function shuffle(rng, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  T.boardUtil = { gridBoard, addHeight, pick, shuffle };

  /* ───────────────────────────── MISSION ARCHETYPES ───────────────────────────── */
  // Each generator returns a mission spec the engine instantiates.
  /** What the run's tide (T.TIDES) adds at this tier: more to do, less time, a bigger swarm, more escorts. */
  const tideAt = (tide, tier) => {
    const t = tide || T.TIDES.rising;
    return { need: t.need[tier - 1], clock: t.clock[tier - 1], swarm: t.swarm[tier - 1], escorts: t.escorts[tier - 1] };
  };
  /** Place extra foes on free nodes in the back two columns (the board's own stream picks which). */
  function addEscorts(rng, b, enemies, starts, types) {
    for (const type of types) {
      const taken = new Set(enemies.map((e) => e.node).concat(starts));
      const free = Object.keys(b.at)
        .filter((k) => +k.split(',')[0] >= b.cols - 2)
        .map((k) => b.at[k])
        .filter((id) => !taken.has(id) && !b.nodes[id].hazard && !b.nodes[id].objective);
      if (!free.length) return;
      enemies.push({ type, node: pick(rng, free) });
    }
  }
  const timesWord = (n) => (n === 2 ? 'twice' : n === 3 ? 'three times' : n + ' times');

  T.MISSIONS = {
    swarm: {
      title: ['Hold the Beacon', 'The Thinning Swarm', 'Breakwater'],
      blurb: 'A swarm pours from the spawn-nodes. Hold the beacon long enough for the Terminal to log the way through.',
      gen(rng, tier, tide) {
        const up = tideAt(tide, tier);
        const b = gridBoard(rng, 4, 3, { corridors: 1 });
        const left = [b.at['0,0'], b.at['0,1'], b.at['0,2']];
        const right = [b.at['3,0'], b.at['3,2']];
        const beacon = b.at['2,1'];
        b.nodes[beacon].objective = { kind: 'beacon' };
        right.forEach((i) => (b.nodes[i].spawn = true));
        const starts = [b.at['0,1'], b.at['1,1']];
        const need = [6, 6, 7][tier - 1] + up.need;
        const enemies = [
          { type: 'biter', node: b.at['3,1'] },
          { type: 'biter', node: b.at['2,0'] },
          { type: 'stinger', node: b.at['3,0'] },
        ];
        if (tier >= 2) enemies.push({ type: 'brute', node: b.at['3,2'] });
        if (tier >= 3) enemies.push({ type: 'binder', node: b.at['2,2'] });
        return {
          board: b,
          starts,
          enemies,
          objective: {
            kind: 'hold',
            node: beacon,
            need,
            held: 0,
            text: `Hold the beacon ${need} rounds (a hero on or adjacent at round end)`,
          },
          clock: { value: [10, 11, 12][tier - 1], label: 'Rounds left', onZero: 'lose' },
          spawns: [
            {
              nodes: right,
              every: 1,
              pool: ['biter', 'biter', 'stinger'],
              startRound: 2,
              max: [3, 3, 4][tier - 1] + up.swarm,
            },
          ],
          bonus: [
            { id: 'nolow', text: 'No hero drops below 50%' },
            { id: 'kills', text: `Destroy ${[6, 8, 10][tier - 1]} foes`, kills: [6, 8, 10][tier - 1] },
          ],
        };
      },
    },
    vault: {
      title: ['The Drowning Vault', 'The High Ledge', 'The Flooded Reliquary'],
      blurb:
        'The vault sits on a ledge no road reaches. The water is rising. Space verbs get you up there; the winch lever is the long way.',
      gen(rng, tier, tide) {
        const up = tideAt(tide, tier);
        const seals = 2 + up.need;
        const b = gridBoard(rng, 4, 3, { corridors: 1 });
        const ledgeAnchors = [b.at['3,0'], b.at['2,0']];
        const ledge = addHeight(b, ledgeAnchors, 'D');
        b.nodes[ledge].objective = { kind: 'vault' };
        const lever = b.at['3,2'];
        b.nodes[lever].objective = { kind: 'lever' };
        const starts = [b.at['0,1'], b.at['0,2']];
        const enemies = [
          { type: 'warden', node: b.at['3,0'] },
          { type: 'stinger', node: b.at['2,2'] },
          { type: 'biter', node: b.at['1,0'] },
        ];
        if (tier >= 2) enemies.push({ type: 'biter', node: b.at['2,1'] });
        if (tier >= 3) enemies.push({ type: 'kiter', node: b.at['3,1'] });
        return {
          board: b,
          starts,
          enemies,
          objective: {
            kind: 'vault',
            node: ledge,
            leverNode: lever,
            leverNeed: 2,
            leverDone: 0,
            need: seals,
            done: 0,
            text: `Break ${seals === 2 ? 'both seals' : 'all ' + seals + ' seals'} on the ledge (Interact ×${seals} up there) — or crank the lever twice to drop a ramp first`,
          },
          clock: { value: [10, 9, 9][tier - 1] - up.clock, label: 'Water reaches the vault in', onZero: 'lose' },
          spawns: [],
          bonus: [
            { id: 'warden', text: 'Destroy the Warden', killType: 'warden' },
            { id: 'fast', text: 'Open it with 3+ rounds to spare', clockLeft: 3 },
          ],
        };
      },
    },
    hidden: {
      title: ['The Sought', 'Three Caches', 'What the Wind Buried'],
      blurb:
        'Something the Heart does not want found is in one of three caches. Lurkers wait for whoever searches blind. Reveal first.',
      gen(rng, tier, tide) {
        const up = tideAt(tide, tier);
        const digs = 2 + up.need;
        const b = gridBoard(rng, 4, 4, { corridors: 2 });
        const cands = shuffle(rng, [b.at['3,0'], b.at['2,3'], b.at['3,2'], b.at['1,3']]).slice(0, 3);
        const real = pick(rng, cands);
        cands.forEach((i) => (b.nodes[i].objective = { kind: 'cache', real: i === real, searched: false }));
        const starts = [b.at['0,0'], b.at['0,1']];
        const enemies = [
          { type: 'lurker', node: b.at['2,1'] },
          { type: 'binder', node: b.at['3,1'] },
        ];
        if (tier >= 2) enemies.push({ type: 'lurker', node: b.at['2,2'] });
        if (tier >= 3) enemies.push({ type: 'stinger', node: b.at['1,2'] });
        return {
          board: b,
          starts,
          enemies,
          objective: {
            kind: 'find',
            candidates: cands,
            real,
            found: false,
            extracted: false,
            need: digs,
            done: 0,
            text: `Find the real cache (reveal it, or search it on foot), then dig it out (Interact ×${digs})`,
          },
          clock: { value: [11, 10, 10][tier - 1] - up.clock, label: 'Rounds before it is moved', onZero: 'lose' },
          spawns: [],
          bonus: [
            { id: 'quick', text: 'Find it within 4 rounds', byRound: 4 },
            { id: 'noambush', text: 'Take no Ambush damage' },
          ],
        };
      },
    },
    cascade: {
      title: ['The Rising', 'Floodgate', 'Cascade'],
      blurb:
        'The flood spreads one ring each round. Two channels at the valve stop it. Time verbs buy you rounds; anchors keep you out of the undertow.',
      gen(rng, tier, tide) {
        const up = tideAt(tide, tier);
        const turns = 3 + up.need;
        const b = gridBoard(rng, 5, 3, { corridors: 2 });
        const origin = b.at['4,2'];
        b.nodes[origin].hazard = true;
        const valve = b.at['4,0'];
        b.nodes[valve].objective = { kind: 'valve' };
        const starts = [b.at['0,0'], b.at['0,1']];
        const enemies = [
          { type: 'kiter', node: b.at['3,1'] },
          { type: 'biter', node: b.at['2,2'] },
          { type: 'biter', node: b.at['2,0'] },
        ];
        if (tier >= 2) enemies.push({ type: 'biter', node: b.at['3,2'] });
        if (tier >= 3) enemies.push({ type: 'tidecaller', node: b.at['3,0'] });
        return {
          board: b,
          starts,
          enemies,
          objective: {
            kind: 'valve',
            node: valve,
            need: turns,
            done: 0,
            text: `Channel the valve ${timesWord(turns)} (Interact ×${turns}) before the flood takes the board`,
          },
          clock: { value: [10, 9, 9][tier - 1] - up.clock, label: 'Rounds until the flood is total', onZero: 'lose' },
          hazardSpread: { origin, everyRounds: 1, delayed: 1 },
          spawns: [],
          bonus: [
            { id: 'dry', text: 'Take no hazard damage' },
            { id: 'quick', text: 'Finish with 3+ rounds to spare', clockLeft: 3 },
          ],
        };
      },
    },
    elite: {
      title: ['The Enforcer', 'A Quasi-stable Thing', 'The Heart’s Hand'],
      blurb: 'An elite holds this stop. Elites reward a boon — if you leave standing.',
      gen(rng, tier, tide) {
        const up = tideAt(tide, tier);
        const b = gridBoard(rng, 4, 3, { corridors: 1 });
        const kind = pick(rng, ['bulwark', 'harrier', 'tidecaller']);
        const starts = [b.at['0,1'], b.at['0,2']];
        const enemies = [
          { type: kind, node: b.at['3,1'] },
          { type: 'biter', node: b.at['2,0'] },
          { type: 'stinger', node: b.at['3,2'] },
        ];
        if (tier >= 2) enemies.push({ type: 'biter', node: b.at['2,2'] });
        if (kind === 'tidecaller') {
          b.nodes[b.at['3,0']].hazard = true;
          b.nodes[b.at['3,2']].hazard = true;
        }
        addEscorts(rng, b, enemies, starts, up.escorts);
        return {
          board: b,
          starts,
          enemies,
          eliteKind: kind,
          objective: { kind: 'kill', text: `Destroy the ${T.ENEMIES[kind].name}`, target: kind },
          clock: null,
          spawns: [],
          bonus: [
            { id: 'nolow', text: 'No hero drops below 50%' },
            { id: 'fast', text: 'Win within 6 rounds', byRound: 6 },
          ],
        };
      },
    },
    boss: {
      title: ['The Heart'],
      blurb:
        'Its shield is fed by its Spawners: destroy both and the shield falls, or bring Pierce. At half vitality the Vault begins to drown — four rounds to finish it.',
      gen(rng, tier) {
        const b = gridBoard(rng, 5, 3, { corridors: 1, diagonals: 1 });
        const heartNode = b.at['4,1'];
        const starts = [b.at['0,1'], b.at['0,0']];
        const sp1 = b.at['3,0'],
          sp2 = b.at['3,2'];
        const enemies = [
          { type: 'heart', node: heartNode },
          { type: 'spawner', node: sp1 },
          { type: 'spawner', node: sp2 },
          { type: 'biter', node: b.at['2,1'] },
        ];
        return {
          board: b,
          starts,
          enemies,
          isBoss: true,
          objective: { kind: 'kill', text: 'Destroy the Heart', target: 'heart' },
          clock: null,
          spawns: [],
          hazardSpread: { origin: b.at['4,2'], everyRounds: 1, delayed: 0, dormant: true },
          bonus: [
            { id: 'both', text: 'Both heroes standing at the end' },
            { id: 'spawners', text: 'Destroy both Spawners' },
          ],
        };
      },
    },
  };

  /* ───────────────────────────── TIDE MAP ───────────────────────────── */
  // 7 rows. Row 0: three openers. Rows 1-5 mixed. Row 6: boss. Each node connects to 1-2 nodes in the next row.
  T.genTideMap = function (rng) {
    const rows = [];
    const typesFor = (r) => {
      if (r === 0) return shuffle(rng, ['swarm', 'vault', 'cascade']);
      if (r === 1) return shuffle(rng, ['hidden', 'event', 'swarm']);
      if (r === 2) return shuffle(rng, ['elite', 'haven', 'vault']);
      if (r === 3) return shuffle(rng, ['cascade', 'event', 'hidden']);
      if (r === 4) return ['haven', 'elite', 'swarm'];
      if (r === 5) return shuffle(rng, ['vault', 'cascade', 'event']);
      return ['boss'];
    };
    const tierFor = (r) => (r <= 1 ? 1 : r <= 4 ? 2 : 3);
    let id = 0;
    for (let r = 0; r < 7; r++) {
      const ts = typesFor(r);
      rows.push(
        ts.map((t, c) => ({
          id: id++,
          row: r,
          col: ts.length === 1 ? 1 : c,
          type: t,
          tier: tierFor(r),
          next: [],
          done: false,
        })),
      );
    }
    for (let r = 0; r < 6; r++) {
      const cur = rows[r],
        nxt = rows[r + 1];
      cur.forEach((n) => {
        if (nxt.length === 1) {
          n.next.push(nxt[0].id);
          return;
        }
        const cands = [n.col - 1, n.col, n.col + 1].filter((c) => c >= 0 && c < nxt.length);
        const picks = shuffle(rng, cands).slice(0, rng() < 0.6 ? 2 : 1);
        if (!picks.includes(n.col) && rng() < 0.7) picks.push(n.col);
        picks.forEach((c) => n.next.push(nxt[c].id));
      });
      // guarantee every next-row node is reachable
      nxt.forEach((m) => {
        if (!cur.some((n) => n.next.includes(m.id))) {
          const nearest = cur.reduce((a, b) => (Math.abs(a.col - m.col) <= Math.abs(b.col - m.col) ? a : b));
          nearest.next.push(m.id);
        }
      });
    }
    // each node has one home, map.all; a row is a list of ids (so a saved map loads back as the same map)
    const all = {};
    rows.flat().forEach((n) => (all[n.id] = n));
    return {
      rows: rows.map((row) => row.map((n) => n.id)),
      all,
      current: null,
      actNames: ['The Lowland Reach', 'The Open Sea', 'The High Air'],
    };
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
