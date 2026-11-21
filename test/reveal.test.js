'use strict';
/**
 * Reveal (2.96; the keyword sweep Garrett approved on 2026-11-21): everything within N is shown; a Revealed foe
 * cannot be Hidden while it lasts, and a zone strike finds it. It absorbs locate.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();

test('no face uses locate any more', () => {
  for (const c of T.CARDS) for (const k of ['P', 'E']) for (const x of c[k].fx) assert.notEqual(x.v, 'locate', c.id);
});

test('a targeted Reveal breaks Hidden, and the foe cannot Hide while it lasts', () => {
  const run = T.quickMission({ seed: 3, type: 'swarm', tier: 1 });
  const m = run.mission;
  const h = m.heroes[0];
  const e = T.liveEnemies(m)[0];
  e.states.Hidden = { t: 3 };
  T.runEffects(m, h, [{ v: 'reveal', target: true, dur: 2 }], { P: 0, E: 0, target: e.uid });
  assert.equal(e.states.Hidden, undefined);
  assert.ok(e.states.Located, 'Revealed');
});
