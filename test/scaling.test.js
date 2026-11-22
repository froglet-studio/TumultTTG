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
  assert.deepEqual(T.scaleFor(run), {
    size: 0,
    power: 20,
    over: 0,
    under: 0,
    hp: 100,
    foes: 0,
    fewer: 0,
    need: 0,
    swarm: 0,
    clock: 0,
  });
  // and the spec is the one the mission's own generator writes
  const saved = JSON.parse(JSON.stringify(T.SCALING));
  for (const arch of ARCHETYPES) {
    const a = JSON.stringify(T.missionSpec(run, arch, 3, null, null).spec);
    for (const k of ['power', 'boss', 'under']) for (const f of Object.keys(T.SCALING[k])) T.SCALING[k][f] = 7;
    const b = JSON.stringify(T.missionSpec(squad(4, 2), arch, 3, null, null).spec);
    for (const k of ['power', 'boss', 'under']) Object.assign(T.SCALING[k], saved[k]);
    assert.equal(a, b, arch);
  }
});

test('a lone pilot (2.124): weaker foes, fewer of them, less to do, longer clocks, on the same board', () => {
  const S = T.SCALING;
  const solo = squad(3, 1);
  assert.equal(T.squadSize(solo), 1);
  const sc = T.scaleFor(solo);
  assert.equal(sc.power, S.PILOT);
  assert.equal(sc.under, S.PILOT);
  assert.equal(sc.hp, Math.round(100 * (1 - S.PILOT * S.under.hp)));
  assert.equal(sc.fewer, Math.round(S.PILOT * S.under.foes));
  assert.equal(sc.need, -Math.round(S.PILOT * S.under.need));
  assert.equal(sc.clock, Math.round(S.PILOT * S.under.clock));
  assert.ok(sc.fewer >= 1 && sc.need <= -1 && sc.clock >= 1 && sc.hp < 100);
  for (const arch of ARCHETYPES) {
    for (let seed = 1; seed <= 4; seed++) {
      const two = T.missionSpec(squad(seed, 2), arch, 2, null, null).spec;
      const run = squad(seed, 1);
      const { spec } = T.missionSpec(run, arch, 2, null, null);
      assert.deepEqual(spec.board.edges, two.board.edges, `${arch}: the same walks`);
      const hp = spec.isBoss ? sc.hp - Math.round(100 * sc.under * S.boss.under) : sc.hp;
      assert.equal(spec.foeHp, hp, `${arch}: foes' vitality`);
      assert.ok(spec.enemies.length >= 1, `${arch}: a foe stays on the board`);
      // (a Salvage with a crate less has room for a crew its full ledge turns away; the last foe always stays)
      assert.ok(spec.enemies.length <= Math.max(1, two.enemies.length), `${arch}: no more foes than two meet`);
      const kept = (e) => T.ENEMIES[e.type].boss || T.ENEMIES[e.type].elite || ['spawner', 'heart'].includes(e.type);
      assert.equal(spec.enemies.filter(kept).length, two.enemies.filter(kept).length, `${arch}: bosses, elites stay`);
      if (two.clock && spec.clock && two.clock.onZero === 'lose')
        assert.ok(spec.clock.value >= two.clock.value, `${arch}: no shorter clock`);
      T.launchMission(run, arch, 2);
      assert.equal(run.mission.heroes.length, 1);
    }
  }
  // a seasoned lone pilot gets back less: at two new pilots' power, nothing
  const vet = squad(3, 1);
  H.addLevel(vet, 6);
  assert.ok(T.scaleFor(vet).hp > sc.hp);
  H.addLevel(vet, 11);
  assert.equal(T.scaleFor(vet).under, 0);
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
        const hp = spec.isBoss ? sc.hp + Math.round(100 * sc.over * T.SCALING.boss.hp) : sc.hp;
        assert.equal(spec.foeHp, hp, `${arch}: foes' vitality`);
        if (!spec.isBoss)
          assert.ok(spec.enemies.length > two.enemies.length || arch === 'survey', `${arch}: more foes`);
        T.launchMission(run, arch, 2);
        const m = run.mission;
        const at = m.heroes.map((h) => h.pos);
        assert.equal(new Set(at).size, n, `${arch} n${n} s${seed}: every pilot starts on a space of their own`);
        m.enemies.forEach((e) => assert.ok(!at.includes(e.pos), 'no foe on a start'));
        m.enemies
          .filter((e) => e.type === 'biter')
          .forEach((e) => assert.equal(e.maxHp, Math.round((T.foeHp(T.ENEMIES.biter.hp[1]) * hp) / 100)));
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
    assert.equal(b, a + (arch === 'vault' ? 1 : Math.floor(3 * T.SCALING.PILOT * T.SCALING.power.need)), arch);
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

test('power is the sum of the pilots’: a third new pilot is the same as the two growing ten levels between them', () => {
  const S = T.SCALING;
  const three = T.scaleFor(squad(5, 3));
  assert.equal(three.power, 3 * S.PILOT);
  const vets = squad(5, 2);
  vets.heroes[0].level = 1 + S.PILOT / 2;
  vets.heroes[1].level = 1 + S.PILOT / 2;
  const v = T.scaleFor(vets);
  assert.equal(v.power, three.power);
  for (const k of ['hp', 'foes', 'need', 'swarm']) assert.equal(v[k], three[k], k);
  // a third new pilot: +50% vitality, 2 more foes, 1 more to do, a swarm 1 larger
  assert.deepEqual([three.hp, three.foes, three.need, three.swarm], [150, 2, 1, 1]);
  // five pilots at level 3 bring 5 × 2 more than five new ones
  const five = squad(5, 5);
  five.heroes.forEach((h) => (h.level = 3));
  assert.equal(T.scaleFor(five).power, 5 * S.PILOT + 10);
});

test('growth on the road counts past about a level a tier, and never lowers what the squad set out with', () => {
  const S = T.SCALING;
  const run = squad(6, 2);
  const base = T.scaleFor(run, { tier: 1, row: 0 }).power;
  // what the road expects by row 4 is no change
  run.heroes.forEach((h) => (h.upUnspent += 4 * S.ROAD_UP));
  assert.equal(T.scaleFor(run, { tier: 2, row: 4 }).power, base);
  // two levels past that: two more power for each pilot
  run.heroes.forEach((h) => (h.upUnspent += 2 * S.LEVEL_UP));
  assert.equal(T.scaleFor(run, { tier: 2, row: 4 }).power, base + 4);
  // where the row is not known, the road expects a level a tier
  assert.equal(T.scaleFor(run, { tier: 3 }).power, base + 4);
  // a seasoned pilot that has not grown on the road keeps the power it set out with
  const vet = squad(6, 2);
  H.addLevel(vet, 5);
  assert.equal(T.scaleFor(vet, { tier: 3, row: 6 }).power, 2 * (S.PILOT + 4));
  // and its growth past the road counts on top of that
  vet.heroes.forEach((h) => (h.upUnspent += 6 * S.ROAD_UP + S.LEVEL_UP));
  assert.equal(T.scaleFor(vet, { tier: 3, row: 6 }).power, 2 * (S.PILOT + 5));
  // and the mission is played with it
  const { spec } = T.missionSpec(run, 'swarm', 2, null, null);
  assert.equal(spec.foeHp, T.scaleFor(run, { tier: 2 }).hp);
});
