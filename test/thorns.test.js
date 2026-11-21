'use strict';
/**
 * Thorns (2.93; the keyword sweep Garrett approved on 2026-11-21): anything that strikes it in melee takes N. A
 * next-hit Thorns turns back only the next melee strike, and may push the striker: it absorbs Counter.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();
const H = require('../tools/harness').createHarness();
const B = T.Board;

function duel(seed = 3) {
  const run = T.quickMission({ seed, type: 'swarm', tier: 1 });
  const m = run.mission;
  const h = m.heroes[0];
  const e = T.liveEnemies(m)[0];
  m.enemies = [e];
  m.spawns = [];
  Object.assign(e, { hp: 60, maxHp: 60, shield: 0, states: {} });
  e.pos = B.walkNeighbors(m.board, h.pos).find((n) => !T.occupied(m, n));
  return { run, m, h, e };
}
const thorns = (s, f) => T.runEffects(s.m, s.h, [Object.assign({ v: 'thorns' }, f)], { P: 0, E: 0 });
const bitten = (s) => {
  const before = s.e.hp;
  T.damage(s.m, s.e, s.h, 1, { kind: 'melee' });
  return before - s.e.hp;
};

test('no face uses counter any more', () => {
  for (const c of T.CARDS) for (const k of ['P', 'E']) for (const x of c[k].fx) assert.notEqual(x.v, 'counter', c.id);
});

test('Thorns turn back every melee strike while they last', () => {
  const s = duel();
  thorns(s, { val: 2, dur: 2 });
  assert.deepEqual([bitten(s), bitten(s)], [2, 2]);
  const before = s.e.hp;
  T.damage(s.m, s.e, s.h, 1, { kind: 'los' });
  assert.equal(s.e.hp, before, 'not a ranged hit');
});

test('a next-hit Thorns turns back only the next melee strike, and pushes', () => {
  const s = duel();
  thorns(s, { val: 3, next: true, push: 1, dur: 2 });
  const from = s.e.pos;
  assert.equal(bitten(s), 3);
  assert.notEqual(s.e.pos, from, 'pushed back');
  s.e.pos = from;
  assert.equal(bitten(s), 0, 'spent');
});

test('lasting and next-hit Thorns add up on that next hit', () => {
  const s = duel();
  thorns(s, { val: 1, dur: 2 });
  thorns(s, { val: 2, next: true, dur: 2 });
  assert.deepEqual([bitten(s), bitten(s)], [3, 1]);
});

test('a 2.92 save keeps a held Counter as a next-hit Thorns', () => {
  const old = require('./fixtures/save-2.92.json');
  assert.equal(old.v, 24, 'the fixture is a version-24 save');
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  const [a, b] = run.mission.heroes;
  assert.deepEqual(a.states.Thorns, { next: 3, push: 1, t: 2 });
  assert.deepEqual(b.states.Thorns, { v: 1, t: 2, next: 2 });
  assert.ok(run.mission.heroes.every((h) => !h.states.Counter));
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run));
  assert.ok(H.playMission(run.mission).over);
});
