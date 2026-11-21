'use strict';
/**
 * Mark (2.92; the keyword sweep Garrett approved on 2026-11-21): the next hit on it, by anyone, deals N more. For N
 * rounds, every hit does; a Pierce Mark's next hit ignores Shield. It absorbs Studied (which lasted the whole
 * mission, a lock-on the 2.73 rule forbids) and Exposed.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();
const H = require('../tools/harness').createHarness();

function lone(seed = 3) {
  const run = T.quickMission({ seed, type: 'swarm', tier: 1 });
  const m = run.mission;
  const e = T.liveEnemies(m)[0];
  m.enemies = [e];
  m.spawns = [];
  Object.assign(e, { hp: 60, maxHp: 60, shield: 0, states: {} });
  return { run, m, h: m.heroes[0], e };
}
const play = (s, f) => T.runEffects(s.m, s.h, [f], { P: 0, E: 0, target: s.e.uid });
const hit = (s, extra) => {
  const before = s.e.hp;
  play(s, Object.assign({ v: 'strike', kind: 'any', dmg: 3 }, extra || {}));
  return before - s.e.hp;
};

test('no face uses studied or expose any more', () => {
  for (const c of T.CARDS)
    for (const k of ['P', 'E']) for (const x of c[k].fx) assert.ok(!['studied', 'expose'].includes(x.v), c.id);
});

test('a Mark adds 2 to the next hit, then is spent', () => {
  const s = lone();
  play(s, { v: 'mark' });
  assert.deepEqual([hit(s), hit(s)], [5, 3]);
});

test('a Mark for some rounds adds to every hit, then wears off', () => {
  const s = lone();
  play(s, { v: 'mark', n: 1, dur: 2 });
  assert.deepEqual([hit(s), hit(s)], [4, 4]);
  T.roundEnd(s.m);
  assert.equal(hit(s), 4, 'one round left');
  T.roundEnd(s.m);
  assert.equal(hit(s), 3, 'worn off');
  assert.equal(s.e.states.Marked, undefined);
});

test('a Pierce Mark makes the next hit ignore Shield; the larger of each part stands', () => {
  const s = lone();
  s.e.states.Shield = { v: 5, t: 9 };
  play(s, { v: 'mark', n: 2, pierce: true });
  play(s, { v: 'mark', n: 1 });
  assert.equal(hit(s), 5, '3 + 2 through Shield 5');
  assert.equal(hit(s), 0, 'then the Shield stands');
});

test('a 2.91 save keeps its Marked, Studied and Exposed foes as Marks', () => {
  const old = require('./fixtures/save-2.91.json');
  assert.equal(old.v, 23, 'the fixture is a version-23 save');
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  const [e1, e2] = run.mission.enemies;
  assert.deepEqual(e1.states.Marked, { next: 2 });
  assert.deepEqual(e2.states.Marked, { next: 3, pierce: true, each: 2, t: 3 });
  assert.ok(run.mission.enemies.every((e) => !e.states.Studied && !e.states.Exposed));
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run));
  assert.ok(H.playMission(run.mission).over);
});
