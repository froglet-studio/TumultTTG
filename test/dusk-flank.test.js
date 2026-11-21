'use strict';
// Dusk and Flanked (2.115): a face that lands at round end, after the foes act; a bonus for two units on one foe.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;

const calm = (m, except) =>
  m.enemies.forEach((e) => {
    if (e !== except) e.intent = null;
  });
/** Send a unit to a free space at least 3 from every given space. */
const away = (m, u, ...from) => {
  u.pos = Object.keys(m.board.nodes)
    .map(Number)
    .find((n) => !T.occupied(m, n) && !m.board.nodes[n].height && from.every((f) => B.dist(m.board, n, f, true) >= 3));
};
const tough = (e) => Object.assign(e, { hp: 40, maxHp: 40, shield: 0, states: {} });

test('flanked: a foe with the squad on two different spaces beside it', () => {
  const { m, h, ally, adj } = H.arena('jac_pair', { up: [1, 0] });
  away(m, ally, h.pos, adj.pos);
  assert.equal(T.isFlanked(m, adj), false, 'one pilot beside it is not a flank');
  const other = B.walkNeighbors(m.board, adj.pos).find((n) => n !== h.pos && !T.occupied(m, n));
  ally.pos = other;
  assert.equal(T.isFlanked(m, adj), true);
});

test('flanked: Flank (Pair Hunt) hits harder on a flanked foe, and still hits without one', () => {
  const s = H.arena('jac_pair', { up: [1, 0] });
  const { m, h, ally, adj } = s;
  tough(adj);
  ally.pos = B.walkNeighbors(m.board, adj.pos).find((n) => n !== h.pos && !T.occupied(m, n)) ?? ally.pos;
  const flanked = T.isFlanked(m, adj);
  T.playFace(m, h, 'jac_pair', 'P', { target: adj.uid });
  const hit = 40 - adj.hp;
  const t = H.arena('jac_pair', { up: [1, 0] });
  tough(t.adj);
  away(t.m, t.ally, t.h.pos, t.adj.pos);
  T.playFace(t.m, t.h, 'jac_pair', 'P', { target: t.adj.uid });
  const plain = 40 - t.adj.hp;
  assert.ok(plain > 0, 'the floor: it hits without a flank');
  assert.ok(flanked, 'the buddy and the tester flank it');
  assert.equal(hit, plain + 2, 'flanked, it deals 2 more');
});

test('dusk: Patience lands after the foes act, on every foe then beside you', () => {
  const { m, h, adj } = H.arena('man_still', { up: [0, 1] });
  calm(m);
  tough(adj);
  const r = T.playFace(m, h, 'man_still', 'E', {});
  assert.ok(r.ok, r.why);
  assert.equal(adj.hp, 40, 'nothing lands when it is played');
  assert.equal(m.dusk.length, 1);
  H.assertPlain(m);
  T.finishRound(m);
  assert.equal(adj.hp, 40 - (4 + 1), 'it lands at round end');
  assert.deepEqual(m.dusk, []);
});

test('dusk: Under the Surface strikes whoever stands on the chosen space at dusk, not when it was chosen', () => {
  const { m, h, ally, adj, zone } = H.arena('cro_lurk', { up: [0, 1] });
  away(m, ally, h.pos, adj.pos);
  calm(m);
  tough(adj);
  const spot = adj.pos;
  T.playFace(m, h, 'cro_lurk', 'E', { node: spot });
  // the first foe leaves the space and another steps onto it before dusk
  adj.pos = B.walkNeighbors(m.board, spot).find((n) => !T.occupied(m, n) && n !== h.pos);
  assert.ok(adj.pos != null);
  const other = zone || m.enemies.find((e) => e !== adj && e.alive);
  tough(other);
  other.pos = spot;
  T.finishRound(m);
  assert.equal(other.hp, 40 - (5 + 2), 'the foe on the space at dusk takes it');
  assert.equal(adj.hp, 40, 'the foe that stepped away does not');
});

test('dusk: a save made with a face waiting for dusk resumes and lands it', () => {
  const { run, m, h, adj } = H.arena('man_still', { up: [0, 1] });
  calm(m);
  tough(adj);
  T.playFace(m, h, 'man_still', 'E', {});
  const back = T.deserializeRun(T.serializeRun(run));
  const foe = back.mission.enemies.find((e) => e.uid === adj.uid);
  T.finishRound(back.mission);
  assert.equal(foe.hp, 35);
});

test('a 2.112 save mid-mission (version 30) loads with no dusk faces and plays on', () => {
  const old = require('./fixtures/save-2.112.json');
  assert.equal(old.v, 30);
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.deepEqual(run.mission.dusk, []);
  H.playMission(run.mission, { player: 'weak' });
  assert.ok(run.mission.over);
});
