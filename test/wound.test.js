'use strict';
/**
 * Wound (2.88; the keyword sweep Garrett approved on 2026-11-21): at round end it takes N, then the Wound drops by
 * 1. One keyword for damage over time and its fifteen flavour names (venom, crush, corrode, rot, drain…).
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
const wound = (s, n, extra) =>
  T.runEffects(s.m, s.h, [Object.assign({ v: 'wound', n, kind: 'venom' }, extra || {})], {
    P: 0,
    E: 0,
    target: s.e.uid,
  });
const tick = (s) => {
  const before = s.e.hp;
  T.roundEnd(s.m);
  return before - s.e.hp;
};

test('no face uses the old damage over time', () => {
  for (const c of T.CARDS) for (const k of ['P', 'E']) for (const x of c[k].fx) assert.notEqual(x.v, 'dot', c.id);
  const n = T.CARDS.filter((c) => ['P', 'E'].some((k) => c[k].fx.some((x) => x.v === 'wound'))).length;
  assert.ok(n >= 20, 'the dot faces Wound now');
});

test('Wound 3 bites 3, then 2, then 1, then is gone', () => {
  const s = lone();
  wound(s, 3);
  assert.deepEqual([tick(s), tick(s), tick(s), tick(s)], [3, 2, 1, 0]);
  assert.equal(s.e.states.Wound, undefined);
});

test('the larger Wound stands, and its bite ignores Shield', () => {
  const s = lone();
  s.e.states.Shield = { v: 5, t: 9 };
  wound(s, 2);
  wound(s, 1);
  assert.equal(s.e.states.Wound.n, 2, 'a smaller Wound does not replace it');
  wound(s, 3);
  assert.equal(s.e.states.Wound.n, 3, 'a larger one does');
  assert.equal(tick(s), 3);
});

test('a Wound that heals its owner heals at each bite', () => {
  const s = lone();
  s.h.hp = s.h.maxHp - 5;
  wound(s, 2, { healOwner: 1 });
  tick(s);
  assert.equal(s.h.hp, s.h.maxHp - 4);
});

test('Cleanse sheds a Wound', () => {
  const s = lone();
  T.woundUnit(s.m, s.h, 3, s.e, 0, 'venom');
  T.runEffects(s.m, s.h, [{ v: 'cleanse' }], { P: 0, E: 0 });
  assert.equal(s.h.states.Wound, undefined);
});

test('a 2.87 save with damage over time loads as Wounds that deal about as much', () => {
  const old = require('./fixtures/save-2.87.json');
  assert.equal(old.v, 20, 'the fixture is a version-20 save');
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  const ws = run.mission.enemies.map((e) => e.states.Wound).filter(Boolean);
  assert.equal(ws.length, 2);
  assert.ok(run.mission.enemies.every((e) => !e.states.Dots));
  assert.deepEqual(
    ws.map((w) => w.n),
    [2, 3],
    '1 for 2 rounds is Wound 2; 2 for 3 and 1 for 1 (7 in all) is Wound 3',
  );
  assert.equal(ws[1].heal, 2);
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run));
  assert.ok(H.playMission(run.mission).over);
});
