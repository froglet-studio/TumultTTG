'use strict';
/**
 * Cleanse (2.95; the keyword sweep Garrett approved on 2026-11-21): remove every harmful state, or clear a Field; for
 * N, also ignore new ones. It absorbs status immunity.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();

test('no face uses statusImmune any more', () => {
  for (const c of T.CARDS)
    for (const k of ['P', 'E']) for (const x of c[k].fx) assert.notEqual(x.v, 'statusImmune', c.id);
});

test('Cleanse for N sheds harmful states and turns away new ones from foes', () => {
  const run = T.quickMission({ seed: 3, type: 'swarm', tier: 1 });
  const m = run.mission;
  const h = m.heroes[0];
  h.states.Weak = { v: 2, t: 2 };
  T.woundUnit(m, h, 2, null, 0, 'venom');
  T.runEffects(m, h, [{ v: 'cleanse', ward: 2 }], { P: 0, E: 0 });
  assert.equal(h.states.Weak, undefined);
  assert.equal(h.states.Wound, undefined);
  T.anchorEnt(m, h, 2);
  assert.equal(T.isAnchored(h), false, 'a foe cannot Anchor it now');
  T.anchorEnt(m, h, 2, true);
  assert.equal(T.isAnchored(h), true, 'its own choice still can');
});
