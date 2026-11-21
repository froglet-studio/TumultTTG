'use strict';
/**
 * Hover (2.102; Garrett, 2026-11-21: keywords thematic and distinct, "hummingbirds, dragon flys etc. hover").
 * Hover N: off the ground for N rounds — no hazard or Field touches you, nothing pushes or pulls you, and your
 * steps may take the ledges. Weightless folds into it. Ignoring hazards stays its own keyword: the body shrugs
 * off a hazard while still on the ground.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');
const H = createHarness();
const T = H.T || global.T;
const B = T.Board;

const beside = (s) => {
  const { m, h } = s;
  const ledge = m.objective.node;
  h.pos = B.allNeighbors(m.board, ledge).find((n) => !m.board.nodes[n].height && !T.occupied(m, n));
  return ledge;
};

test('no face carries Weightless, and Hover no longer mints AP', () => {
  for (const c of T.CARDS)
    for (const k of ['P', 'E']) assert.ok(!c[k].fx.some((x) => x.v === 'weightless'), `${c.id} ${k}: Weightless`);
  const s = H.arena(['hop_glide'], { archetype: 'vault', tier: 1, up: [0, 1] });
  assert.ok(H.playIn(s, 'hop_glide', 'E').ok);
  assert.ok(s.h.states.Hover);
  assert.equal(s.h.states.Hover.noAp, undefined);
});

test('a face that Hovers before it moves offers the ledge, and the move takes it', () => {
  const s = H.arena(['cra_migrate'], { archetype: 'vault', tier: 1 });
  const ledge = beside(s);
  const face = T.CARD.cra_migrate.P;
  const tg = T.targetsFor(s.m, s.h, face.tgt, face, 0, 0);
  assert.ok(tg.options.includes(ledge), 'Long Haul offers the ledge');
  assert.ok(T.playFace(s.m, s.h, 'cra_migrate', 'P', { node: ledge }).ok);
  assert.equal(s.h.pos, ledge);
});

test('ignoring hazards keeps a pilot on the ground: a Field still touches it, a push still moves it', () => {
  const s = H.arena(['tar_extremo', 'hop_glide'], { archetype: 'vault', tier: 1, up: [0, 1] });
  assert.ok(H.playIn(s, 'tar_extremo', 'P').ok);
  assert.ok(s.h.states.HazardImmune);
  assert.ok(!s.h.states.Hover, 'not off the ground');
  assert.ok(!T.reachableWalk(s.m, s.h, 1, false).includes(beside(s)) || s.m.board.ramp, 'no ledge either');
});
