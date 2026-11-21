'use strict';
// The costly faces (2.100): each 2–3 etherion face does something no chain of cheaper faces can.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;
const free = (m, n) => B.walkNeighbors(m.board, n).filter((x) => !T.occupied(m, x));

test('throw: Heavy Throw puts the ally beside you on a free space within reach, a ledge included', () => {
  const s = H.arena('hum_throw', { up: [1, 1] });
  const { m, h, ally } = s;
  ally.pos = free(m, h.pos)[0];
  const tg = T.canPlay(m, h, 'hum_throw', 'E').tg;
  assert.equal(tg.need, 'node');
  assert.ok(tg.options.length > 0);
  const far = tg.options.sort((a, b) => B.dist(m.board, h.pos, b, true) - B.dist(m.board, h.pos, a, true))[0];
  assert.ok(B.dist(m.board, h.pos, far, true) <= 3, 'reach is 2 + E');
  const r = T.playFace(m, h, 'hum_throw', 'E', { node: far });
  assert.ok(r && r.ok !== false, 'played');
  assert.equal(ally.pos, far, 'the ally lands where it was thrown');
  // an ally that is not beside you cannot be thrown
  const s2 = H.arena('hum_throw', { up: [1, 1] });
  assert.equal(T.canPlay(s2.m, s2.h, 'hum_throw', 'E').ok, false, 'the ally two steps off is out of hand');
});

test('swap with a foe: Become trades spaces with a foe, and an Anchored one holds fast', () => {
  const s = H.arena('oct_imperson', { up: [1, 1] });
  const { m, h } = s;
  const foe = s.adj;
  const a = h.pos,
    b = foe.pos;
  T.playFace(m, h, 'oct_imperson', 'E', { target: foe.uid });
  assert.equal(h.pos, b);
  assert.equal(foe.pos, a);
  const s2 = H.arena('oct_imperson', { up: [1, 1] });
  s2.adj.states.Anchored = { t: 2 };
  const before = s2.adj.pos;
  T.playFace(s2.m, s2.h, 'oct_imperson', 'E', { target: s2.adj.uid });
  assert.equal(s2.adj.pos, before, 'an Anchored foe is not moved');
});

test('spring: Thrum sets Fields, hazards and Wounds off now, and they still work at round end', () => {
  const s = H.arena('hop_strid', { up: [1, 1] });
  const { m, h } = s;
  const foe = s.adj;
  m.fields.push({
    nodes: [foe.pos],
    around: null,
    radius: 0,
    ring: false,
    on: 'end',
    trips: null,
    t: 2,
    owner: s.ally.uid,
    side: 'hero',
    label: null,
    fx: [{ kw: 'strike', n: 3, t: 1 }],
  });
  foe.states.Wound = { n: 2, owner: h.uid, heal: 0, kind: 'venom' };
  const hp = foe.hp + (foe.shield || 0);
  T.playFace(m, h, 'hop_strid', 'E', {});
  assert.ok(foe.hp < foe.maxHp && foe.hp + (foe.shield || 0) <= hp - 3, 'the Field and the Wound bit now');
  assert.equal(foe.states.Wound && foe.states.Wound.n, 2, 'the Wound does not drop when it springs');
  assert.equal(m.fields.length, 1, 'the Field is not spent');
});

test('rewind: Second Wind gives back what the round took, up to its cap', () => {
  const s = H.arena('hum_persist', { up: [1, 1] });
  const { m, h } = s;
  h.hp = h.maxHp;
  T.playFace(m, h, 'hum_persist', 'E', {});
  assert.ok(h.states.Rewind, 'set');
  h.hp -= 10; // the round's hits
  T.roundEnd(m);
  assert.equal(h.hp, h.maxHp - 10 + 6, 'regains 6 of 10 at E 1 (cap 4 + 2E)');
  assert.ok(!h.states.Rewind, 'it lasts one round');
});
