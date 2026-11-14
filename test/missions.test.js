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

test('the flood tide asks more from tier 2 on, and leaves tier 1 and the boss alone', () => {
  const spec = (arch, tier, tide) => {
    const run = T.newRun(4242);
    run.tide = tide;
    H.prebuiltSquad(run, 0, 1);
    T.launchMission(run, arch, tier);
    const m = run.mission;
    return {
      need: m.objective.need,
      clock: m.clock ? m.clock.value : null,
      foes: m.enemies.length,
      cap: m.spawns.length ? m.spawns[0].max : null,
      text: m.objective.text,
    };
  };
  for (const arch of ARCHETYPES) {
    for (const tier of [1, 2, 3]) {
      if (arch === 'boss' && tier < 3) continue;
      const rising = spec(arch, tier, 'rising');
      const flood = spec(arch, tier, 'flood');
      if (tier === 1 || arch === 'boss') {
        assert.deepEqual(flood, rising, `${arch} t${tier}: the flood starts at tier 2`);
        continue;
      }
      // the Gale's lead over the steady wind (since 2.29 the steady wind presses too)
      const f = T.TIDES.flood,
        r = T.TIDES.rising;
      const t = {
        need: f.need.map((x, i) => x - r.need[i]),
        clock: f.clock.map((x, i) => x - r.clock[i]),
        swarm: f.swarm.map((x, i) => x - r.swarm[i]),
        escorts: f.escorts.map((x, i) => x.slice(r.escorts[i].length)),
      };
      // a crate is a round trip: a tide adds one at most, so the Gale adds none on top of the steady wind
      if (arch === 'salvage') t.need = t.need.map(() => 0);
      if (rising.need != null) {
        assert.equal(flood.need, rising.need + t.need[tier - 1], `${arch} t${tier}: objective size`);
        assert.ok(flood.text.includes(String(flood.need)), `${arch} t${tier}: the text says how many`);
      }
      if (rising.clock != null && arch !== 'swarm') assert.equal(flood.clock, rising.clock - t.clock[tier - 1]);
      if (arch === 'swarm') {
        assert.equal(flood.clock, rising.clock, 'a hold needs more rounds instead of a shorter clock');
        assert.equal(flood.cap, rising.cap + t.swarm[tier - 1]);
      }
      if (arch === 'elite') assert.equal(flood.foes, rising.foes + t.escorts[tier - 1].length);
    }
  }
});
