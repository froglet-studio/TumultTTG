'use strict';
// Burn (2.119): a face whose card is gone until the mission ends once it resolves.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;

const sturdy = (e) => Object.assign(e, { hp: 40, maxHp: 40, shield: 0, baseShield: 0, states: {} });

test('burn: the card leaves the hand until the mission ends, and Haste does not bring it back', () => {
  const { m, h, adj } = H.arena('sco_sting', { up: [0, 1] });
  sturdy(adj);
  assert.ok(T.playFace(m, h, 'sco_sting', 'E', { target: adj.uid }).ok);
  assert.equal(T.inHand(h, 'sco_sting'), false);
  for (let i = 0; i < 8; i++) T.slideTrack(h, 1);
  assert.equal(T.inHand(h, 'sco_sting'), false, 'eight columns of Haste later it is still gone');
  assert.equal(T.canPlay(m, h, 'sco_sting', 'P').ok, false, 'its Physical face goes with it');
  H.assertPlain(m);
});

test('burn: the card is back in hand at the next mission', () => {
  const { run, m, h, adj } = H.arena('sco_sting', { up: [0, 1] });
  sturdy(adj);
  T.playFace(m, h, 'sco_sting', 'E', { target: adj.uid });
  T.launchMission(run, 'swarm', 1);
  assert.equal(T.inHand(h, 'sco_sting'), true);
});

test('burn: Full Dose leaves a Wound that holds before it drops', () => {
  const { m, h, adj } = H.arena('sco_sting', { up: [0, 1] });
  sturdy(adj);
  m.enemies.forEach((e) => (e.intent = null));
  T.playFace(m, h, 'sco_sting', 'E', { target: adj.uid });
  assert.deepEqual([adj.states.Wound.n, adj.states.Wound.stay], [4, 3]);
  T.roundEnd(m);
  assert.deepEqual([adj.states.Wound.n, adj.states.Wound.stay], [4, 2], 'it bit for 4 and held');
  T.roundEnd(m);
  T.roundEnd(m);
  T.roundEnd(m);
  assert.equal(adj.states.Wound.n, 3, 'then it drops as any Wound does');
});

test('burn: Boiling Burst leaves boiling ground that lasts the mission and burns foes that end a round in it', () => {
  const { m, h, adj } = H.arena('btl_spray', { up: [0, 1] });
  sturdy(adj);
  m.enemies.forEach((e) => (e.intent = null));
  assert.ok(T.playFace(m, h, 'btl_spray', 'E', { node: adj.pos }).ok);
  const field = m.fields[m.fields.length - 1];
  assert.equal(field.t, null, 'it lasts until the mission ends');
  const hp = adj.hp;
  const mine = h.hp;
  delete adj.states.Wound;
  T.roundEnd(m);
  assert.equal(adj.hp, hp - 2, 'a foe that ends the round in it takes 1 + E');
  assert.equal(h.hp, mine, 'the squad standing in it is not burnt');
  for (let i = 0; i < 6; i++) T.roundEnd(m);
  assert.ok(m.fields.includes(field), 'still there');
});
