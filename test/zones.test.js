'use strict';
/* Zones (2.18): a node sits in one or more coloured zones, and two units that share a zone are in range of a
   ranged strike, as on an Unmatched board. On today's grid boards each column is one zone, so play is as it
   was with lanes. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;

test('every node of every board is in at least one known zone', () => {
  for (const arch of Object.keys(T.MISSIONS))
    for (const tier of [1, 2, 3])
      for (const seed of [1, 2, 3]) {
        const run = T.newRun(seed);
        H.prebuiltSquad(run, 0, 1);
        T.launchMission(run, arch, tier);
        for (const n of Object.values(run.mission.board.nodes)) {
          assert.ok(Array.isArray(n.zones) && n.zones.length >= 1, `${arch} t${tier} node ${n.id} has a zone`);
          for (const z of n.zones) assert.ok(T.ZONES[z], `${arch} t${tier} node ${n.id}: zone ${z} is known`);
          assert.equal(n.lane, undefined, 'lanes are gone');
        }
      }
});

test('range is a shared zone: a node in two zones reaches both, and never itself', () => {
  const run = T.newRun(3);
  H.prebuiltSquad(run, 0, 1);
  T.launchMission(run, 'swarm', 1);
  const bd = run.mission.board;
  const ns = Object.values(bd.nodes).filter((n) => !n.height);
  const inA = ns.find((n) => n.zones.includes('A'));
  const inB = ns.find((n) => n.zones.includes('B'));
  const bridge = ns.find((n) => n !== inA && n !== inB);
  assert.equal(B.los(bd, inA.id, inB.id), false, 'different zones: out of range');
  bridge.zones = ['A', 'B'];
  assert.ok(B.los(bd, bridge.id, inA.id), 'the bridge shares A');
  assert.ok(B.los(bd, bridge.id, inB.id), 'the bridge shares B');
  assert.ok(B.los(bd, inA.id, bridge.id), 'range is symmetric');
  assert.equal(B.los(bd, inA.id, inB.id), false, 'sharing a zone with the same third node is not range');
  assert.equal(B.los(bd, bridge.id, bridge.id), false, 'a node is never in range of itself');
});

test('a zone strike hits every foe that shares any of your zones, and no other', () => {
  const sc = H.arena('hop_strid', { up: [0, 1] });
  const { m, h } = sc;
  const bd = m.board;
  const foes = T.liveEnemies(m);
  foes.forEach((e) => Object.assign(e, { hp: 40, maxHp: 40, shield: 0, states: {} }));
  // put the hero in two zones and record who should be hit before playing
  bd.nodes[h.pos].zones = ['A', 'C'];
  const expect = foes.filter((e) => B.los(bd, h.pos, e.pos)).map((e) => e.uid);
  assert.ok(expect.length >= 1, 'someone is in range');
  const before = Object.fromEntries(foes.map((e) => [e.uid, e.hp]));
  const res = H.playIn(sc, 'hop_strid', 'E');
  assert.ok(res.ok, res.why);
  for (const e of foes) {
    const hit = e.hp < before[e.uid];
    assert.equal(hit, expect.includes(e.uid), `${e.name} at ${e.pos} ${hit ? 'was' : 'was not'} hit`);
  }
});

test('a save from 2.17 (mid-mission, lanes) loads with zones and plays on', () => {
  const old = require('./fixtures/save-2.17.json');
  assert.equal(old.v, 6, 'the fixture is a version-6 save');
  const lanes = Object.values(old.mission.board.nodes).map((n) => n.lane);
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.deepEqual(
    Object.values(run.mission.board.nodes).map((n) => n.zones),
    lanes.map((l) => [l]),
    'each lane became a zone of its own name',
  );
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run), 'it saves again unchanged');
  H.playRun(run);
  assert.ok(run.over);
});
