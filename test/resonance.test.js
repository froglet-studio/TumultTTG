'use strict';
// Resonance (2.116): an Ethereal face leaves its element in the air; a face that draws on it takes it for a bonus.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;

const sturdy = (e) => Object.assign(e, { hp: 40, maxHp: 40, shield: 0, baseShield: 0, states: {} });

test('resonance: an Ethereal face leaves its element in the air, strong this round, fading the next, then gone', () => {
  const { m, h } = H.arena('hum_mind', { up: [1, 1] });
  m.enemies.forEach((e) => (e.intent = null));
  const foe = m.enemies.find((e) => e.alive);
  assert.ok(T.playFace(m, h, 'hum_mind', 'E', { target: foe.uid }).ok);
  assert.equal(m.air.T, 2, 'Pre-empt is a Time face');
  T.roundEnd(m);
  assert.equal(m.air.T, 1, 'fading');
  T.roundEnd(m);
  assert.equal(m.air.T, 0, 'gone');
  H.assertPlain(m);
});

test('resonance: Recoil Slam draws on Charge in the air to Anchor, and spends it', () => {
  const s = H.arena('oct_jet', { up: [1, 1] });
  sturdy(s.adj);
  s.m.air.C = 1;
  assert.ok(T.playFace(s.m, s.h, 'oct_jet', 'E', { target: s.adj.uid }).ok);
  assert.ok(s.adj.states.Anchored, 'Anchored, from the Charge in the air');
  assert.equal(s.m.air.C, 0, 'the Charge is spent');
  assert.equal(s.m.air.M, 2, 'and the face leaves its own Mass');

  const t = H.arena('oct_jet', { up: [1, 1] });
  sturdy(t.adj);
  assert.ok(T.playFace(t.m, t.h, 'oct_jet', 'E', { target: t.adj.uid }).ok);
  assert.equal(t.adj.states.Anchored, undefined, 'nothing in the air: it still hits, without the Anchor');
});

test('resonance: Omni in the air stands in for any element', () => {
  const s = H.arena('msh_punch', { up: [0, 1] });
  sturdy(s.adj);
  s.m.air.O = 2;
  assert.ok(T.playFace(s.m, s.h, 'msh_punch', 'E', { target: s.adj.uid }).ok);
  assert.equal(s.m.air.O, 0, 'the Omni was drawn as Time');
  const t = H.arena('msh_punch', { up: [0, 1] });
  sturdy(t.adj);
  assert.ok(T.playFace(t.m, t.h, 'msh_punch', 'E', { target: t.adj.uid }).ok);
  assert.ok(40 - s.adj.hp > 40 - t.adj.hp, 'the punch lands twice with Time in the air');
});

test('a 2.115 save mid-mission (version 31) loads with nothing in the air and plays on', () => {
  const old = require('./fixtures/save-2.115.json');
  assert.equal(old.v, 31);
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.deepEqual(run.mission.air, { M: 0, C: 0, S: 0, T: 0, O: 0 });
  H.playMission(run.mission, { player: 'weak' });
  assert.ok(run.mission.over);
});
