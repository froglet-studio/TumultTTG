'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, ARCHETYPES } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const SEEDS = 8;

function playMany(arch, tier) {
  let wins = 0;
  for (let i = 0; i < SEEDS; i++) {
    const run = T.newRun(1000 + i);
    if (i % 3 === 2) H.draftedSquad(run);
    else H.prebuiltSquad(run, i % 6, (i + 1 + (i % 5)) % 6);
    H.addProgression(run, tier);
    T.launchMission(run, arch, tier);
    const m = H.playMission(run.mission);
    assert.ok(m.over, `${arch} t${tier} seed ${i}: mission must end`);
    const bad = m.log.filter((l) => /Effect error|unimplemented/.test(l.text));
    assert.deepEqual(bad, [], `${arch} t${tier} seed ${i}: engine errors in the log`);
    for (const h of m.heroes) assert.equal(h.pool + h.held.length, T.RULES.POOL, 'dice invariant after a mission');
    if (m.won) wins++;
  }
  return wins / SEEDS;
}

for (const arch of ARCHETYPES) {
  for (const tier of [1, 2, 3]) {
    if (arch === 'boss' && tier < 3) continue;
    test(`${arch} tier ${tier}: auto-played missions run cleanly`, () => {
      const rate = playMany(arch, tier);
      // Loose floors only — these catch "the mission became unwinnable", not balance drift.
      if (tier === 1) assert.ok(rate >= 0.6, `${arch} t1 win rate collapsed: ${rate}`);
    });
  }
}

test('every generated board is connected and its objective is reachable', () => {
  for (const arch of ARCHETYPES) {
    for (let seed = 1; seed <= 25; seed++) {
      const run = T.newRun(seed);
      H.prebuiltSquad(run, 0, 1);
      T.launchMission(run, arch, arch === 'boss' ? 3 : 1 + (seed % 3));
      const m = run.mission;
      const start = m.heroes[0].pos;
      for (const n of Object.values(m.board.nodes)) {
        const d = T.Board.dist(m.board, start, n.id, true);
        assert.ok(d < 99, `${arch} seed ${seed}: node ${n.id} is unreachable`);
      }
    }
  }
});
