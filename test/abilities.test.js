'use strict';
/**
 * Every ability does what it says (Garrett, 2026-11-21): a decoy face leaves a decoy, a movement face carries
 * its pilot as far as its text says, and no effect on a face is dead weight that never changes the game.
 *
 * recipes.test.js proves the engine reads every option on a recipe; this proves that what it reads happens.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;

const sturdy = (e, hp = 40) => Object.assign(e, { hp, maxHp: hp, shield: 0, baseShield: 0, states: {} });
const nodeIds = (m) => Object.keys(m.board.nodes).map(Number);
const freeAt = (m, from, d) =>
  nodeIds(m).filter((n) => !T.occupied(m, n) && !m.board.nodes[n].height && B.dist(m.board, from, n, true) === d);
const CONDITIONS = ['ifOnHazard', 'ifAnchored', 'ifAdjacent', 'ifHpBelow', 'ifE'];
const textOf = (face, P, E) => (typeof face.txt === 'function' ? face.txt(P, E) : face.txt);
const faces = () =>
  T.CARDS.flatMap((card) => ['P', 'E'].map((k) => ({ card, k, face: card[k], id: `${card.id}.${k}` })));

/**
 * The situations a face is tried in. An effect passes if it changes the game in any one of them, so each is
 * here to give some effect its moment: a foe to pull in, a wound to heal, a Shield to strip, an objective to work.
 */
const SITUATIONS = {
  plain: {},
  // foes two and three away, so a pull, a dash or a reach has room to act
  far: {
    arrange: ({ m, h, adj, zone }) => {
      // in sight where the board allows, so a pull across the zone has a foe to reach
      const two = freeAt(m, h.pos, 2)
        .concat(freeAt(m, h.pos, 3))
        .sort((a, b) => B.los(m.board, h.pos, b) - B.los(m.board, h.pos, a));
      if (adj && two.length) adj.pos = two[0];
      const three = freeAt(m, h.pos, 3);
      if (zone && three.length) zone.pos = three[0];
      [adj, zone].filter(Boolean).forEach((e) => sturdy(e));
    },
  },
  // every foe out beyond a short reveal, so "the nearest foe" is not one the reveal already found
  distant: {
    arrange: ({ m, h }) =>
      T.liveEnemies(m).forEach((e) => {
        const n = nodeIds(m).find((x) => !T.occupied(m, x) && B.dist(m.board, h.pos, x, true) >= 4);
        if (n != null) e.pos = n;
      }),
  },
  hurt: {
    arrange: ({ h, ally }) => {
      h.hp = Math.max(1, h.hp - 8);
      ally.hp = Math.max(1, ally.hp - 8);
      h.states.Weak = { v: 1, t: 2 };
    },
  },
  shielded: {
    arrange: ({ adj, zone }) =>
      [adj, zone].filter(Boolean).forEach((e) => {
        sturdy(e);
        e.shield = e.baseShield = 4;
      }),
  },
  frail: { arrange: ({ adj, zone }) => [adj, zone].filter(Boolean).forEach((e) => sturdy(e, 4)) },
  hazard: {
    arrange: ({ m, h }) =>
      [h.pos].concat(B.within(m.board, h.pos, 1, true)).forEach((n) => (m.board.nodes[n].hazard = true)),
  },
  hidden: { arrange: ({ m }) => T.liveEnemies(m).forEach((e) => (sturdy(e).states.Hidden = { t: 3 })) },
  allyBeside: {
    arrange: ({ m, h, ally }) => {
      const n = B.walkNeighbors(m.board, h.pos).find((x) => !T.occupied(m, x));
      if (n != null) ally.pos = n;
    },
  },
  allyDown: {
    arrange: ({ m, h, ally }) => {
      ally.downed = true;
      ally.hp = 0;
      ally.pos = B.walkNeighbors(m.board, h.pos).find((n) => !T.occupied(m, n));
    },
  },
  // a card of each hero's on the track, for faces that slide or clear it
  tracks: {
    arrange: ({ h, ally }) =>
      [h, ally].forEach((x) => {
        x.cards = x.cards.concat(['hum_persist']);
        x.up.hum_persist = [1, 1];
        T.commit(x, 'hum_persist', 0, 3, 'test');
      }),
  },
  // the real cache two nodes off, for faces that work an objective from afar
  objective: {
    opts: { archetype: 'hidden' },
    arrange: ({ m, h }) => {
      const real = m.objective.real;
      const n = nodeIds(m).find((x) => !T.occupied(m, x) && B.dist(m.board, x, real, true) === 2);
      if (n != null) h.pos = n;
    },
  },
  vault: { opts: { archetype: 'vault' } },
};
// another board, whose zones are wider than the plain arena's: room for a pull across a zone
SITUATIONS.wide = { opts: { archetype: 'hidden' } };
const scene = (cardId, sit) => {
  const s = H.arena(cardId, SITUATIONS[sit].opts || {});
  if (SITUATIONS[sit].arrange) SITUATIONS[sit].arrange(s);
  return s;
};

/**
 * What the game looks like, for telling whether an effect changed it: the whole mission but its log, its
 * animations, its uid counter and its play statistics (a played face counts there whatever it did).
 */
const NOT_STATE = new Set(['log', 'fx', 'uids', 'stats']);
function snapshot(m, ctx) {
  const state = Object.fromEntries(Object.entries(m).filter(([k]) => !NOT_STATE.has(k)));
  return JSON.stringify([state, ctx.pendingFreeMove, ctx.pendingReroll]);
}
/** The ways a face can be aimed in a situation: every target, the first nodes on offer, push and pull. */
function aims(cardId, k, sit) {
  const s = scene(cardId, sit);
  const chk = T.canPlay(s.m, s.h, cardId, k);
  if (!chk.ok) return [];
  let out = [{}];
  if (chk.tg.need === 'foe' || chk.tg.need === 'foeOrAlly') out = chk.tg.options.map((target) => ({ target }));
  if (chk.tg.need === 'node') out = chk.tg.options.slice(0, 14).map((node) => ({ node }));
  if (T.CARD[cardId][k].fx.some((x) => x.kind === 'choose'))
    out = out.flatMap((a) => [a, Object.assign({}, a, { choice: 'push' })]);
  return out;
}
/** Play a face as aimed, optionally with effect `drop` switched off (its condition made unmeetable). */
function outcome(cardId, k, sit, aim, drop) {
  const s = scene(cardId, sit);
  const face = T.CARD[cardId][k];
  const fx = face.fx;
  if (drop != null)
    face.fx = fx.map((x, i) => (i === drop ? Object.assign({}, x, { ifE: 99, elseVal: undefined }) : x));
  try {
    const ctx = Object.assign({ choice: 'pull' }, aim);
    const r = T.playFace(s.m, s.h, cardId, k, ctx);
    return r.ok ? snapshot(s.m, r.ctx) : null;
  } finally {
    face.fx = fx;
  }
}

test('every effect on every card face changes the game in some situation', () => {
  const dead = [];
  for (const { card, k, face, id } of faces())
    face.fx.forEach((f, i) => {
      if (CONDITIONS.some((c) => f[c] != null)) return; // conditions are recipes.test.js's
      let tried = false;
      const counts = Object.keys(SITUATIONS).some((sit) =>
        aims(card.id, k, sit).some((aim) => {
          tried = true;
          return outcome(card.id, k, sit, aim, null) !== outcome(card.id, k, sit, aim, i);
        }),
      );
      if (tried && !counts) dead.push(`${id} ${f.v} (“${textOf(face, 2, 2)}”)`);
    });
  assert.deepEqual(dead, [], `effects that never do anything:\n${dead.join('\n')}`);
});

test('every decoy face leaves a decoy, on the node its text names', () => {
  const failed = [];
  for (const { card, k, face, id } of faces()) {
    const d = face.fx.find((x) => x.v === 'decoy');
    if (!d || CONDITIONS.some((c) => d[c] != null)) continue;
    const s = H.arena(card.id);
    const from = s.h.pos;
    const chk = T.canPlay(s.m, s.h, card.id, k);
    if (!chk.ok) {
      failed.push(`${id}: cannot be played (${chk.why})`);
      continue;
    }
    // aim at the last node on offer (the far end of a move or blink), or the target given
    const ctx = { choice: 'pull' };
    if (chk.tg.need === 'node') ctx.node = chk.tg.options[chk.tg.options.length - 1];
    if (chk.tg.need === 'foe' || chk.tg.need === 'foeOrAlly') ctx.target = chk.tg.options[0];
    const aimed = ctx.node;
    T.playFace(s.m, s.h, card.id, k, ctx);
    const left = s.m.decoys.find((x) => x.owner === s.h.uid);
    const want = d.here ? from : aimed != null ? aimed : null;
    const dur = typeof d.dur === 'function' ? d.dur(T.heroP(s.h, card.id), T.heroE(s.h, card.id)) : d.dur;
    if (!left) failed.push(`${id}: no decoy`);
    else if (want != null && left.pos !== want) failed.push(`${id}: decoy on ${left.pos}, not ${want}`);
    else if (left.t !== dur) failed.push(`${id}: decoy lasts ${left.t}, not ${dur}`);
  }
  assert.deepEqual(failed, [], failed.join('\n'));
});

test('a decoy left on your own node draws the foes, and stays when you go', () => {
  const s = H.arena('opo_dead', { up: [2, 2] });
  const from = s.h.pos;
  assert.ok(H.playIn(s, 'opo_dead', 'E').ok);
  const d = s.m.decoys.find((x) => x.owner === s.h.uid);
  assert.ok(d, 'Play Dead leaves a decoy');
  assert.equal(d.pos, from, 'where the hero lies');
  assert.equal(T.entityAt(s.m, from), s.h, 'the hero is still the one standing there');
  const to = T.reachableWalk(s.m, s.h, 1, false)[0];
  s.h.states = {};
  assert.ok(T.walk(s.m, s.h, to).ok);
  assert.equal(T.entityAt(s.m, from), d, 'and the decoy keeps the spot');
});

/** Every node a unit could reach on an empty board: by walking n (climbing only if it can), or within r. */
function emptyBoard(s) {
  s.m.enemies.forEach((e) => (e.alive = false));
  s.m.decoys = [];
  s.ally.pos = nodeIds(s.m)
    .filter((n) => n !== s.h.pos)
    .sort((a, b) => B.dist(s.m.board, s.h.pos, b, true) - B.dist(s.m.board, s.h.pos, a, true))[0];
}
const walkDist = (m, who, n, climb) => {
  const d = { [who.pos]: 0 };
  const q = [who.pos];
  while (q.length) {
    const x = q.shift();
    for (const y of B.walkNeighbors(m.board, x, climb))
      if (d[y] == null && (climb || !m.board.nodes[y].height || m.board.ramp)) {
        d[y] = d[x] + 1;
        q.push(y);
      }
  }
  return d;
};

test('every movement face moves its pilot as far as its text says, and the move happens', () => {
  const failed = [];
  for (const { card, k, face, id } of faces()) {
    const P = 2,
      E = 2;
    const verb = face.fx.find(
      (x) => ['move', 'teleport', 'climb', 'rally'].includes(x.v) && !CONDITIONS.some((c) => x[c] != null),
    );
    if (!verb) continue;
    const s = H.arena(card.id, { up: [P, E] });
    emptyBoard(s);
    const m = s.m;
    const val = (x) => (typeof x === 'function' ? x(P, E) : x);
    const chk = T.canPlay(m, s.h, card.id, k);
    if (!chk.ok) {
      if (!/no valid target|no ally/.test(chk.why)) failed.push(`${id}: cannot be played (${chk.why})`);
      continue;
    }
    const tg = chk.tg;
    const mover = verb.v === 'rally' ? s.ally : s.h;
    const n = val(verb.v === 'teleport' || verb.v === 'climb' ? verb.reach : verb.v === 'rally' ? verb.move : verb.n);
    if (!(n > 0)) continue;
    const ctx = { choice: 'pull' };
    let want = null;
    if (verb.v === 'move' && (verb.free || verb.toward)) {
      // a free or toward move comes after aiming at something else: the free part must still be granted in full
      if (tg.need === 'foe' || tg.need === 'foeOrAlly') {
        s.m.enemies[0].alive = true;
        s.m.enemies[0].pos = freeAt(m, s.h.pos, Math.min(n + 1, 3))[0];
        const again = T.canPlay(m, s.h, card.id, k);
        if (!again.ok) continue;
        ctx.target = again.tg.options[0];
      }
      if (tg.need === 'node') ctx.node = tg.options[0];
      const from = s.h.pos;
      const r = T.playFace(m, s.h, card.id, k, ctx);
      if (!r.ok) failed.push(`${id}: ${r.why}`);
      else if (verb.free && r.ctx.pendingFreeMove !== n && s.h.pos === from)
        failed.push(`${id}: grants a free move of ${r.ctx.pendingFreeMove || 0}, not ${n}`);
      continue;
    }
    if (tg.need !== 'node') continue;
    const climb = verb.v === 'climb' || T.canClimb?.(mover) || false;
    const dist =
      verb.v === 'teleport' || verb.v === 'climb'
        ? Object.fromEntries(nodeIds(m).map((x) => [x, B.dist(m.board, mover.pos, x, true)]))
        : walkDist(m, mover, n, climb);
    // the far end of the move: a free node exactly n away (by walking, or in a straight reach), if the board has one
    const ok = (x) => !T.occupied(m, x) && (verb.v !== 'teleport' || verb.height || !m.board.nodes[x].height);
    const farthest = nodeIds(m).filter((x) => ok(x) && dist[x] != null && dist[x] <= n);
    const best = Math.max(...farthest.map((x) => dist[x]));
    const offered = tg.options.filter((x) => dist[x] === best && x !== mover.pos);
    if (best > 0 && verb.v !== 'climb' && !offered.length && !(verb.v === 'move' && verb.exact))
      failed.push(`${id}: reaches ${Math.max(...tg.options.map((x) => dist[x] || 0))}, not ${best} (${verb.v} ${n})`);
    want = offered[0] != null ? offered[0] : tg.options.find((x) => x !== mover.pos);
    if (want == null) continue;
    ctx.node = want;
    const r = T.playFace(m, s.h, card.id, k, ctx);
    if (!r.ok) failed.push(`${id}: ${r.why}`);
    else if (mover.pos !== want) failed.push(`${id}: offered node ${want} but stayed on ${mover.pos}`);
  }
  assert.deepEqual(failed, [], failed.join('\n'));
});

test('the numbers a face prints are the numbers it plays', () => {
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const KEYS = {
    move: ['n'],
    teleport: ['reach'],
    climb: ['reach'],
    rally: ['move'],
    force: ['n'],
    decoy: ['dur', 'strike'],
    strike: ['dmg'],
    shield: ['val'],
    heal: ['n'],
  };
  const wrong = new Set();
  for (const { face, k, id } of faces())
    for (const [P, E] of [
      [0, 1],
      [1, 1],
      [2, 2],
      [3, 3],
      [3, 1],
      [1, 3],
    ]) {
      if (k === 'P' && E > 1) continue;
      const t = textOf(face, P, E).toLowerCase();
      const said = new Set((t.match(/\d+/g) || []).map(Number));
      WORDS.forEach((w, i) => new RegExp(`\\b${w}\\b`).test(t) && said.add(i));
      if (/\bstep\b/.test(t)) said.add(1);
      for (const x of face.fx)
        for (const key of KEYS[x.v] || []) {
          const v = typeof x[key] === 'function' ? x[key](P, E) : x[key];
          if (typeof v === 'number' && v > 0 && !said.has(v))
            wrong.add(`${id} ${x.v}.${key} = ${v} at P${P} E${E}: “${t}”`);
        }
    }
  assert.deepEqual([...wrong], [], [...wrong].join('\n'));
});
