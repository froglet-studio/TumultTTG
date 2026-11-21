'use strict';
/**
 * Shield (2.94; the keyword sweep Garrett approved on 2026-11-21): each hit it takes is N lower; a Shield against the
 * next hit only is spent by that hit. One keyword for shield, pre-empt, guard and absorb.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();
const H = require('../tools/harness').createHarness();

function scene(seed = 3) {
  const run = T.quickMission({ seed, type: 'swarm', tier: 1 });
  const m = run.mission;
  return { run, m, h: m.heroes[0], e: T.liveEnemies(m)[0] };
}
const taken = (s, n = 5, kind = 'los') => {
  const before = s.h.hp;
  T.damage(s.m, s.e, s.h, n, { kind });
  return before - s.h.hp;
};

test('no face uses pre-empt, guard or absorb any more', () => {
  for (const c of T.CARDS)
    for (const k of ['P', 'E']) for (const x of c[k].fx) assert.ok(!['preempt', 'guard', 'absorb'].includes(x.v), c.id);
});

test('a Shield against the next hit is spent by it; a lasting one is not', () => {
  const s = scene();
  s.h.gear = [];
  T.runEffects(s.m, s.h, [{ v: 'shield', val: 3, next: true }], { P: 0, E: 0 });
  assert.deepEqual([taken(s), taken(s)], [2, 5]);
  T.runEffects(s.m, s.h, [{ v: 'shield', val: 2, dur: 2 }], { P: 0, E: 0 });
  assert.deepEqual([taken(s), taken(s)], [3, 3]);
});

test('a party Shield against the next hit covers both pilots', () => {
  const s = scene();
  T.runEffects(s.m, s.h, [{ v: 'shield', val: 2, next: true, party: true }], { P: 0, E: 0 });
  assert.ok(s.m.heroes.every((h) => h.states.Preempt && h.states.Preempt.v === 2));
});

test('a 2.93 save turns a held Guard into Shield 1 and a held Absorb into a next-hit Shield', () => {
  const old = require('./fixtures/save-2.93.json');
  assert.equal(old.v, 25, 'the fixture is a version-25 save');
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  const [a, b] = run.mission.heroes;
  assert.deepEqual(a.states.Shield, { all: false, v: 1, t: 2 });
  assert.equal(b.states.Preempt.v, 3);
  assert.ok(run.mission.heroes.every((h) => !h.states.Guard && !h.states.Absorb));
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run));
  assert.ok(H.playMission(run.mission).over);
});
