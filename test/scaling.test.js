'use strict';
/**
 * A mission answers the squad that meets it (src/engine/scaling.js): a bigger squad finds more to do and
 * more to fight, on the same board. Two new pilots, the squad every mission is written for, change nothing.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, ARCHETYPES } = require('../tools/harness');

const H = createHarness();
const { T } = H;

const squad = (seed, n) => {
  const run = T.newRun(seed);
  H.prebuiltSquad(run, H.squadIds(seed, n));
  return run;
};

test('two new pilots: nothing scales', () => {
  const run = squad(4, 2);
  assert.deepEqual(T.scaleFor(run), { size: 0, level: 0, hp: 100, foes: 0, need: 0, swarm: 0 });
  // and the spec is the one the mission's own generator writes
  const saved = JSON.parse(JSON.stringify(T.SCALING));
  for (const arch of ARCHETYPES) {
    const a = JSON.stringify(T.missionSpec(run, arch, 3, null, null).spec);
    for (const k of ['size', 'level']) for (const f of Object.keys(T.SCALING[k])) T.SCALING[k][f] = 7;
    T.SCALING.size.hp = 0;
    const b = JSON.stringify(T.missionSpec(squad(4, 2), arch, 3, null, null).spec);
    Object.assign(T.SCALING.size, saved.size);
    Object.assign(T.SCALING.level, saved.level);
    assert.equal(a, b, arch);
  }
});

test('a bigger squad: a start each, tougher foes, more of them, more to do, on the same board', () => {
  for (const n of [3, 4, 5]) {
    for (const arch of ARCHETYPES) {
      for (let seed = 1; seed <= 4; seed++) {
        const two = T.missionSpec(squad(seed, 2), arch, 2, null, null).spec;
        const run = squad(seed, n);
        const sc = T.scaleFor(run);
        assert.equal(sc.size, n - 2);
        const { spec } = T.missionSpec(run, arch, 2, null, null);
        assert.deepEqual(spec.board.edges, two.board.edges, 'the same walks');
        assert.deepEqual(Object.keys(spec.board.nodes), Object.keys(two.board.nodes), 'the same spaces');
        assert.equal(spec.foeHp, sc.hp);
        if (!spec.isBoss)
          assert.ok(spec.enemies.length > two.enemies.length || arch === 'survey', `${arch}: more foes`);
        T.launchMission(run, arch, 2);
        const m = run.mission;
        const at = m.heroes.map((h) => h.pos);
        assert.equal(new Set(at).size, n, `${arch} n${n} s${seed}: every pilot starts on a space of their own`);
        m.enemies.forEach((e) => assert.ok(!at.includes(e.pos), 'no foe on a start'));
        m.enemies
          .filter((e) => e.type === 'biter')
          .forEach((e) => assert.equal(e.maxHp, Math.round((T.foeHp(T.ENEMIES.biter.hp[1]) * sc.hp) / 100)));
      }
    }
  }
});

test('a bigger squad has more to do', () => {
  const two = squad(2, 2);
  const five = squad(2, 5);
  for (const arch of ['swarm', 'vault', 'hidden', 'cascade']) {
    const a = T.missionSpec(two, arch, 1, null, null).spec.objective.need;
    const b = T.missionSpec(five, arch, 1, null, null).spec.objective.need;
    // the Vault's ledge is narrow: one more seal at most
    assert.equal(b, a + (arch === 'vault' ? 1 : 3 * T.SCALING.size.need), arch);
  }
});

test('a scaled mission saves and resumes like any other', () => {
  const run = squad(9, 4);
  T.launchMission(run, 'swarm', 2);
  H.playMission(run.mission, { player: 'weak', maxRounds: 2 });
  const back = T.deserializeRun(T.serializeRun(run));
  assert.equal(back.mission.foeHp, run.mission.foeHp);
  assert.equal(T.serializeRun(back), T.serializeRun(run));
});
