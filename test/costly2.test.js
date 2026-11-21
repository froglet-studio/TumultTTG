'use strict';
// The costly faces, part two (2.104): crash, drag and fix.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;

test('crash: in Apex Form a melee strike knocks the foe back, and one stopped short crashes', () => {
  const s = H.arena('axo_meta', { up: [1, 1] });
  const { m, h } = s;
  const foe = s.adj;
  Object.assign(foe, { hp: 40, maxHp: 40, shield: 0 });
  T.playFace(m, h, 'axo_meta', 'E', {});
  assert.equal(h.states.Morph.crash, 4);
  // wall the foe in: every space away from the pilot is a ledge, and a second foe stands on one of them
  const away = B.walkNeighbors(m.board, foe.pos).filter(
    (x) => B.dist(m.board, x, h.pos, true) > B.dist(m.board, foe.pos, h.pos, true),
  );
  assert.ok(away.length, 'there is somewhere to push it');
  away.forEach((x) => (m.board.nodes[x].height = true));
  const other = m.enemies.find((e) => e !== foe && e.alive);
  // nobody else beside the foe: the buddy stands off
  s.ally.pos = Object.keys(m.board.nodes)
    .map(Number)
    .find((n) => !T.occupied(m, n) && B.dist(m.board, n, foe.pos, true) > 2);
  Object.assign(other, { pos: away[0], hp: 40, maxHp: 40, shield: 0 });
  const hp = foe.hp;
  T.pushAway(m, h, foe, 1);
  assert.equal(foe.hp, hp - 4, 'the foe stopped short crashes for 3 + E');
  assert.equal(other.hp, 36, 'and so does the foe in the way');
});

test('hold: Immovable Hold drags the foe into the space you leave when you walk', () => {
  const s = H.arena('tar_claw', { up: [1, 1] });
  const { m, h } = s;
  const foe = s.adj;
  T.playFace(m, h, 'tar_claw', 'E', { target: foe.uid });
  assert.equal(h.states.Holding.uid, foe.uid);
  const from = h.pos;
  const step = B.walkNeighbors(m.board, h.pos).find((n) => !T.occupied(m, n) && n !== foe.pos);
  T.moveEntity(m, h, step, 'walk');
  assert.ok(B.adjacent(m.board, h.pos, foe.pos), 'the foe stays beside you');
  assert.ok(foe.pos === from || B.dist(m.board, foe.pos, from, true) <= 1, 'dragged to where you were');
});

test('fix: Neurotoxin makes the foe repeat its intent', () => {
  const s = H.arena('oct_bite', { up: [1, 1] });
  const { m, h } = s;
  const foe = s.adj;
  Object.assign(foe, { hp: 40, maxHp: 40, shield: 0 });
  T.chooseIntents(m);
  const before = JSON.stringify(foe.intent);
  T.playFace(m, h, 'oct_bite', 'E', { target: foe.uid });
  assert.ok(foe.states.Fixed, 'fixed');
  T.roundEnd(m);
  T.chooseIntents(m);
  assert.equal(JSON.stringify(foe.intent), before, 'the same intent next round');
});
