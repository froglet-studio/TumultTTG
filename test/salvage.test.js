'use strict';
/**
 * Salvage (2.27): the first mission that is not a fight (design/03). Carry crates from the far side
 * to the near edge as the water comes in. Foes are in the way; fighting them is one way through,
 * never the objective.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;
const crates = (m) =>
  Object.values(m.board.nodes)
    .filter((n) => n.objective && n.objective.kind === 'crate')
    .map((n) => n.id);

test('a salvage board: one more crate than you need on the far side, the near edge to bring them to', () => {
  for (let tier = 1; tier <= 3; tier++)
    for (let seed = 1; seed <= 10; seed++) {
      const m = T.quickMission({ seed, type: 'salvage', tier }).mission;
      const ob = m.objective;
      assert.equal(ob.kind, 'salvage');
      assert.equal(crates(m).length, ob.need + 1);
      assert.equal(ob.docks.length, 3);
      ob.docks.forEach((d) => assert.equal(m.board.nodes[d].label[0], 'A'));
      crates(m).forEach((c) => assert.ok('CDE'.includes(m.board.nodes[c].label[0]), 'crates lie on the far side'));
      assert.ok(m.clock && m.hazardSpread);
    }
});

test('Interact picks a crate up, one at a time; reaching the near edge sets it down', () => {
  const m = T.quickMission({ seed: 2, type: 'salvage', tier: 1 }).mission;
  const h = m.heroes[0];
  const c = crates(m)[0];
  h.pos = B.walkNeighbors(m.board, c).find((n) => !T.occupied(m, n)) ?? c;
  h.held = ['AP2', 'AP2', 'AP2'];
  h.heldDie = [];
  h.pool = T.RULES.POOL - h.held.length;
  assert.ok(T.doInteract(m, h, c, false).ok);
  assert.equal(h.carrying, 1);
  assert.ok(!m.board.nodes[c].objective, 'the crate has left the board');
  const other = crates(m).find((n) => B.adjacent(m.board, h.pos, n));
  if (other != null) assert.equal(T.doInteract(m, h, other, false).ok, false, 'one crate at a time');
  // however they arrive (a walk, a blink, the wind), a carrier on the near edge sets it down
  h.pos = m.objective.docks[1];
  T.afterAction(m);
  assert.equal(h.carrying, 0);
  assert.equal(m.objective.done, 1);
});

test('a carrier who goes down drops the crate where they fall', () => {
  const m = T.quickMission({ seed: 2, type: 'salvage', tier: 1 }).mission;
  const h = m.heroes[0];
  h.carrying = 1;
  h.pos = Object.values(m.board.nodes).find((n) => !n.objective && !T.occupied(m, n) && !n.height).id;
  T.damage(m, null, h, 999, { kind: 'true', trueDmg: true, label: 'test' });
  assert.ok(h.downed);
  assert.equal(h.carrying, 0);
  assert.equal(m.board.nodes[h.pos].objective.kind, 'crate');
});

test('both players can win it, and the careful one more often', () => {
  const wins = { weak: 0, strong: 0 };
  for (let seed = 1; seed <= 8; seed++)
    for (const player of ['weak', 'strong']) {
      const m = T.quickMission({ seed, type: 'salvage', tier: 2, kit: 'tier' }).mission;
      if (H.playMission(m, { player }).won) wins[player]++;
    }
  assert.ok(wins.weak >= 1, `heuristic won ${wins.weak}/8`);
  assert.ok(wins.strong >= wins.weak, `look-ahead ${wins.strong}, heuristic ${wins.weak}`);
});

test('a save from 2.26 loads with nobody carrying and plays on', () => {
  const old = require('./fixtures/save-2.26.json');
  assert.equal(old.v, 10);
  const run = T.deserializeRun(JSON.stringify(old));
  assert.ok(run.heroes.every((h) => h.carrying === 0));
  assert.ok(H.playMission(run.mission).over);
});
