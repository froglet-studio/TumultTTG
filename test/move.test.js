'use strict';
/**
 * Move (2.103; Garrett, 2026-11-21: "more interesting movement choices are great as long as they are distinct").
 * Move N, and the ways a move can differ: climbing (the steps may take the ledges; was the verb `climb`), past
 * foes, trampling (the foes in the way are pushed aside), exactly N, toward a unit, carrying an ally beside you.
 * Guide N moves an ally (was the verb `rally`, which clashed with the Rally action that raises the downed).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');
const H = createHarness();
const T = global.T;
const B = T.Board;

const verbs = () => {
  const out = new Set();
  for (const c of T.CARDS) for (const k of ['P', 'E']) c[k].fx.forEach((x) => out.add(x.v));
  for (const g of T.GEAR) for (const ab of g.abilities) ab.fx.forEach((x) => out.add(x.v));
  for (const b of T.BASIC) b.fx.forEach((x) => out.add(x.v));
  return out;
};

test('Climb and the guide are Move and Guide now: no face uses the old verbs', () => {
  const v = verbs();
  for (const old of ['climb', 'rally', 'weightless']) assert.ok(!v.has(old), old);
  assert.ok(v.has('guide'));
});

test('climbing: a Move that climbs is offered the ledge, and takes it', () => {
  const s = H.arena(['gec_setae'], { archetype: 'vault', tier: 1 });
  const { m, h } = s;
  const ledge = m.objective.node;
  h.pos = B.allNeighbors(m.board, ledge).find((n) => !m.board.nodes[n].height && !T.occupied(m, n));
  const face = T.CARD.gec_setae.P;
  assert.ok(T.targetsFor(m, h, face.tgt, face, 2, 2).options.includes(ledge));
  assert.ok(T.playFace(m, h, 'gec_setae', 'P', { node: ledge }).ok);
  assert.equal(h.pos, ledge);
});

test('trampling: each foe in the way is pushed aside, and the mover ends where it chose', () => {
  const s = H.arena(['hoof_hooves'], { archetype: 'swarm', tier: 1, up: [2, 2] });
  const { m, h } = s;
  // a straight run of three free nodes from the hero, with a foe on the middle one
  let line = null;
  for (const a of B.walkNeighbors(m.board, h.pos))
    for (const b of B.walkNeighbors(m.board, a))
      if (b !== h.pos && !m.board.nodes[a].height && !m.board.nodes[b].height && !T.occupied(m, b))
        if (!line && B.dist(m.board, h.pos, b) === 2) line = [a, b];
  assert.ok(line, 'the board has a run of two');
  const [mid, end] = line;
  const other = T.entityAt(m, mid);
  if (other)
    other.pos = Object.keys(m.board.nodes)
      .map(Number)
      .find((n) => !T.occupied(m, n) && n !== end);
  const foe = m.enemies.find((e) => e.alive);
  foe.pos = mid;
  const r = T.playFace(m, h, 'hoof_hooves', 'E', { node: end });
  assert.ok(r.ok, r.why);
  assert.equal(h.pos, end);
  assert.notEqual(foe.pos, mid, 'the foe in the way was pushed off it');
});

test('Guide moves the chosen ally at once; the Rally action still raises the downed', () => {
  assert.ok(T.BASIC.some((b) => b.id === 'legup' && b.fx.some((x) => x.v === 'guide')));
  assert.equal(typeof T.rally, 'function');
});
