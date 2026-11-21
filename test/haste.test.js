'use strict';
/**
 * Haste (2.95; the keyword sweep Garrett approved on 2026-11-21): your track slides N extra columns, or the mission
 * clock gains N rounds, or the next N cards skip the track. One keyword for hasten, clock and freecast.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();

test('no face or gear uses hasten, clock or freecast any more', () => {
  const old = ['hasten', 'clock', 'freecast'];
  for (const c of T.CARDS) for (const k of ['P', 'E']) for (const x of c[k].fx) assert.ok(!old.includes(x.v), c.id);
  for (const g of T.GEAR) for (const a of g.abilities) for (const x of a.fx) assert.ok(!old.includes(x.v), g.id);
  for (const b of T.BASIC) for (const x of b.fx) assert.ok(!old.includes(x.v), b.id);
});

test('Haste slides the track, buys clock, or lets the next card skip the track', () => {
  const run = T.quickMission({ seed: 4, type: 'vault', tier: 1 });
  const m = run.mission;
  const h = m.heroes[0];
  h.track = [];
  T.commit(h, h.cards[0], 0, 3, '');
  const before = JSON.stringify(h.track);
  T.runEffects(m, h, [{ v: 'haste', n: 1 }], { P: 0, E: 0 });
  assert.notEqual(JSON.stringify(h.track), before, 'the track slid');
  if (m.clock) {
    const c = m.clock.value;
    T.runEffects(m, h, [{ v: 'haste', n: 2, clock: true }], { P: 0, E: 0 });
    assert.equal(m.clock.value, c + 2);
  }
  T.runEffects(m, h, [{ v: 'haste', n: 1, free: true, dur: 1 }], { P: 0, E: 0 });
  assert.ok(h.states.Freecast && h.states.Freecast.length);
});
