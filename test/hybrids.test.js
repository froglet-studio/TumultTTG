'use strict';
// Hybrid foes (src/engine/hybrids.js; Garrett, 2026-11-22): three clades, a hybrid card, levels from the squad.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;

function mission(seed = 11, type = 'swarm', tier = 2, pilots = 2) {
  const run = T.newRun(seed);
  H.prebuiltSquad(run, H.squadIds(0, pilots));
  T.launchMission(run, type, tier);
  return run.mission;
}

test('every foe but the Spawners and the Heart is a hybrid of three clades, none human', () => {
  for (const type of ['swarm', 'vault', 'elite', 'boss']) {
    const m = mission(5, type, 2);
    for (const e of m.enemies) {
      if (T.HYBRID.NOT.includes(e.type)) {
        assert.equal(e.hy, undefined, `${e.type} carries no hybrid card`);
        continue;
      }
      assert.equal(e.clades.length, 3);
      assert.equal(new Set(e.clades).size, 3);
      assert.ok(!e.clades.includes('human'));
      e.hy.traits.forEach((id, i) => {
        assert.ok(T.CARD[id].clades.includes(e.clades[i]), `${id} is a ${e.clades[i]} trait`);
        assert.ok(T.foeAbility(T.CARD[id].P, 0, 0), `${id}'s Physical face is something a foe can do`);
      });
    }
  }
});

test('the hybrid draw is the seed’s: the same seed makes the same foes, and the board is untouched', () => {
  const a = mission(9, 'vault', 3);
  const b = mission(9, 'vault', 3);
  assert.deepEqual(
    a.enemies.map((e) => [e.clades, e.hy]),
    b.enemies.map((e) => [e.clades, e.hy]),
  );
  const off = (() => {
    const was = T.RULES.HYBRID_FOES;
    T.RULES.HYBRID_FOES = 0;
    try {
      return mission(9, 'vault', 3);
    } finally {
      T.RULES.HYBRID_FOES = was;
    }
  })();
  assert.deepEqual(
    off.enemies.map((e) => [e.type, e.pos, e.hp]),
    a.enemies.map((e) => [e.type, e.pos, e.hp]),
    'the same foes on the same spaces',
  );
  assert.ok(
    off.enemies.every((e) => !e.hy),
    'with the rule off, no hybrid cards',
  );
  assert.doesNotThrow(() => JSON.stringify(a), 'plain data');
});

test('a foe’s level is its tier, an elite one more, and the squad’s power in levels; E wakes its Ethereal faces', () => {
  const t1 = mission(3, 'swarm', 1).enemies.find((e) => e.hy);
  assert.deepEqual([t1.hy.level, t1.hy.P, t1.hy.E], [1, 0, 0], 'tier 1: Physical faces at P 0');
  assert.ok(
    T.foeHybridFaces(t1).every((f) => f.fk[0] === 'P'),
    'no Ethereal face at E 0',
  );
  const t3 = mission(3, 'swarm', 3).enemies.find((e) => e.hy);
  assert.deepEqual([t3.hy.level, t3.hy.P, t3.hy.E], [3, 2, 1]);
  const el = mission(3, 'elite', 3).enemies.find((e) => e.elite);
  assert.equal(el.hy.level, 4, 'an elite is a level higher');
  const four = mission(3, 'swarm', 3, 4).enemies.find((e) => e.hy); // power 40: two levels more
  assert.equal(four.hy.level, 5);
  assert.deepEqual([four.hy.P, four.hy.E], [3, 3]);
  const solo = mission(3, 'swarm', 2, 1).enemies.find((e) => e.hy); // power 10: a level less
  assert.equal(solo.hy.level, 1);
  // with E 3 every Ethereal face a foe can use is offered, Ethereal first
  const faces = T.foeHybridFaces(four);
  assert.ok(faces.length >= 3);
  const firstP = faces.findIndex((f) => f.fk[0] === 'P');
  assert.ok(
    faces.slice(firstP).every((f) => f.fk[0] === 'P'),
    'Ethereal faces come first',
  );
});

test('a face becomes a foe’s move through the verbs foes already have', () => {
  const strike = {
    n: 'X',
    tgt: 'foe_melee',
    fx: [
      { v: 'strike', kind: 'melee', dmg: (P) => 2 + P },
      { v: 'force', kind: 'push', n: 1 },
    ],
  };
  assert.deepEqual(T.foeAbility(strike, 2, 0), { n: 'X', hy: true, kind: 'melee', dmg: 4, push: 1 });
  const hex = { n: 'Y', tgt: 'foe_r2', fx: [{ v: 'weaken', val: () => 2, dur: 1 }] };
  assert.deepEqual(T.foeAbility(hex, 0, 0), { n: 'Y', hy: true, kind: 'los', dmg: 1, weaken: 2 });
  const ward = { n: 'Z', tgt: 'self', fx: [{ v: 'shield', val: (P, E) => 1 + E, dur: 1 }] };
  assert.deepEqual(T.foeAbility(ward, 0, 2), { n: 'Z', hy: true, kind: 'ward', ward: 3 });
  assert.equal(T.foeAbility({ n: 'W', tgt: 'self', fx: [{ v: 'mint' }] }, 0, 0), null, 'nothing a foe can do');
});

test('a hybrid foe plays faces of its card in a mission, and the card cools before it comes again', () => {
  let used = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const m = mission(seed, 'swarm', 3);
    const names = new Set(m.enemies.flatMap((e) => T.foeHybridFaces(e).map((f) => f.ab.n)));
    const chosen = T.chooseIntents;
    T.chooseIntents = function (mm) {
      chosen(mm);
      for (const e of T.liveEnemies(mm)) if (e.intent && e.intent.hy) assert.equal(e.hy.cd, 0, 'only a card in hand');
    };
    try {
      H.playMission(m);
    } finally {
      T.chooseIntents = chosen;
    }
    used += m.log.filter((l) => [...names].some((n) => String(l.text || l).includes('uses ' + n))).length;
  }
  assert.ok(used > 0, 'foes used their hybrid cards');
});

test('a rival pilot is human and two clades, plays its card as a pilot would, and holds an elite stop', () => {
  let found = null;
  for (let seed = 1; seed <= 60 && !found; seed++) {
    const m = mission(seed, 'elite', 3);
    const r = m.enemies.find((e) => e.rival);
    if (r) found = { m, r };
  }
  assert.ok(found, 'some elite stop is held by a rival pilot');
  const { m, r } = found;
  assert.equal(r.clades[0], 'human');
  assert.equal(r.clades.length, 3);
  assert.ok(!r.clades.slice(1).includes('human'));
  assert.ok(r.name.startsWith('Rival '));
  assert.equal(m.objective.target, 'rival');
  assert.equal(r.hy.E, Math.min(3, r.hy.level - 1), 'it awakens as a pilot does, a face sooner than a creature');
  assert.ok(T.CARD[r.hy.traits[0]].clades.includes('human'));
});
