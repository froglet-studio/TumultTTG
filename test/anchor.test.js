'use strict';
/**
 * Anchor (2.91; the keyword sweep Garrett approved on 2026-11-21): nothing moves an Anchored unit, its own walking
 * and blinking included. It still acts. One keyword for anchor, held, rooted, slow and no-teleport.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();
const H = require('../tools/harness').createHarness();
const B = T.Board;

function scene(seed = 3) {
  const run = T.quickMission({ seed, type: 'swarm', tier: 1 });
  const m = run.mission;
  return { run, m, h: m.heroes[0], e: T.liveEnemies(m)[0] };
}
const play = (m, h, f, ctx) => T.runEffects(m, h, [f], Object.assign({ P: 0, E: 0 }, ctx || {}));

test('no face uses slow, slowSelf, held or a no-teleport', () => {
  for (const c of T.CARDS)
    for (const k of ['P', 'E'])
      for (const x of c[k].fx) {
        assert.ok(!['slow', 'slowSelf'].includes(x.v), c.id);
        assert.ok(!x.held, c.id + ' held');
        for (const y of x.fx || []) assert.ok(!y.noTele, c.id + ' noTele');
      }
});

test('an Anchored hero cannot walk, blink, or be pushed, and still acts', () => {
  const { m, h, e } = scene();
  play(m, h, { v: 'anchor', who: 'self', dur: 1 });
  const to = B.walkNeighbors(m.board, h.pos).find((n) => !T.occupied(m, n));
  assert.equal(T.walk(m, h, to).ok, false, 'no walking');
  const from = h.pos;
  play(m, h, { v: 'teleport', reach: 2 }, { node: to });
  assert.equal(h.pos, from, 'no blinking');
  assert.equal(T.pushAway(m, e, h, 1), 0, 'no pushing');
  const hp = e.hp;
  play(m, h, { v: 'strike', kind: 'any', dmg: 2 }, { target: e.uid });
  assert.ok(e.hp < hp, 'it still acts');
});

test('a foe Anchored by a hero does not walk', () => {
  const { m, h, e } = scene();
  play(m, h, { v: 'anchor', who: 'foe', dur: 2 }, { target: e.uid });
  assert.ok(T.isAnchored(e));
  const at = e.pos;
  T.enemyPhase(m);
  assert.equal(e.pos, at);
});

test('a 2.90 save keeps its rooted, slowed, held and no-teleport units Anchored', () => {
  const old = require('./fixtures/save-2.90.json');
  assert.equal(old.v, 22, 'the fixture is a version-22 save');
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  const units = run.mission.heroes.concat(run.mission.enemies);
  for (const u of units)
    for (const k of ['Held', 'Rooted', 'Slow', 'SlowSelf', 'NoTele']) assert.equal(u.states[k], undefined);
  const [a, b] = run.mission.heroes;
  assert.deepEqual(a.states.Anchored, { t: 2 });
  assert.deepEqual(b.states.Anchored, { t: 1 });
  const [e1, e2] = run.mission.enemies;
  assert.deepEqual(e1.states.Anchored, { t: 3 });
  assert.deepEqual(e2.states.Anchored, { t: 2 });
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run));
  assert.ok(H.playMission(run.mission).over);
});
