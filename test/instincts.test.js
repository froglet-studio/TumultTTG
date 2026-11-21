'use strict';
// Clade instincts (2.121): one always-on rule per clade, through the passive hooks gear uses.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;

test('instincts: every one names a known clade and a known passive hook, and human has none', () => {
  for (const [id, x] of Object.entries(T.INSTINCTS)) {
    assert.ok(T.SPECIES[id], `${id} is a clade`);
    assert.ok(T.BOON_HOOKS.includes(x.hook), `${id}: ${x.hook}`);
    assert.ok(x.txt && x.name);
  }
  assert.equal(T.INSTINCTS.human, undefined);
});

test('instincts: every pre-made pilot has one for each of its two animal clades', () => {
  for (const p of T.PREBUILTS) {
    const h = T.makeHero(p);
    assert.equal(T.instinctsOf(h).length, 2, p.name);
  }
});

test('instincts: Shell adds 1 to every Shield, Caustic Feet takes 1 off a hazard, Smasher adds to melee', () => {
  const h = T.makeHero({ id: 'z', name: 'Z', species: ['human', 'tortoise', 'mantis_shrimp'], cards: ['hum_grip'] });
  assert.equal(T.boonSum(h, 'shieldBonus'), 1);
  assert.equal(T.weaponBonus(h, 'melee'), 1);
  assert.equal(T.weaponBonus(h, 'los'), 0);
  const f = T.makeHero({ id: 'f', name: 'F', species: ['human', 'flamingo', 'owl'], cards: ['owl_talon'] });
  assert.equal(T.boonSum(f, 'hazardSoft'), 1);
  assert.equal(T.boonSum(f, 'keen'), 1);
});

test('instincts: Spines adds 1 to every Thorns its pilot gains', () => {
  const { m, h } = H.arena('heh_spines', { up: [1, 1] });
  h.species = ['human', 'owl', 'eel'];
  T.runEffects(m, h, [{ v: 'thorns', val: 2, dur: 1 }], { P: 0, E: 0 });
  assert.equal(h.states.Thorns.v, 2, 'without the hedgehog');
  delete h.states.Thorns;
  h.species = ['human', 'hedgehog', 'eel'];
  T.runEffects(m, h, [{ v: 'thorns', val: 2, dur: 1 }], { P: 0, E: 0 });
  assert.equal(h.states.Thorns.v, 3, 'with it');
});
