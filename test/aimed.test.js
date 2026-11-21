'use strict';
// Aimed (2.103): an attack that lands on a space, not a unit.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;

function aimedScene() {
  const s = H.arena('hum_mind', { up: [1, 1] });
  const { m, h } = s;
  const foe = s.adj; // beside the tester
  const ab = Object.keys(T.ENEMIES[foe.type].abilities).find((k) => T.ENEMIES[foe.type].abilities[k].kind === 'melee');
  foe.intent = { key: ab, target: h.uid, targetName: h.name, label: 'x → Tester', dmg: 3, kind: 'melee' };
  m.enemies.filter((e) => e !== foe).forEach((e) => (e.intent = null));
  return { ...s, foe };
}

test('aimed: Pre-empt locks a foe on the space; step away and it strikes whoever stands there', () => {
  const s = aimedScene();
  const { m, h, foe } = s;
  const spot = h.pos;
  T.playFace(m, h, 'hum_mind', 'E', { target: foe.uid });
  assert.equal(foe.intent.aim, spot, 'the intent is Aimed at where the tester stands');
  // the tester steps off; another foe is pushed onto the spot
  h.pos =
    B.walkNeighbors(m.board, spot).find(
      (n) => !T.occupied(m, n) && n !== foe.pos && !B.adjacent(m.board, n, foe.pos),
    ) ?? h.pos;
  const other = m.enemies.find((e) => e !== foe && e.alive);
  Object.assign(other, { pos: spot, hp: 40, maxHp: 40, shield: 0, states: {} });
  const hp = h.hp;
  T.enemyPhase(m);
  assert.ok(other.hp < 40, 'the foe standing on the aimed space is struck');
  assert.equal(h.hp, hp, 'the tester who stepped away is not');
});

test('aimed: on an empty space the attack misses', () => {
  const s = aimedScene();
  const { m, h, foe } = s;
  T.aimIntent(m, foe);
  const spot = foe.intent.aim;
  h.pos = Object.keys(m.board.nodes)
    .map(Number)
    .find((n) => !T.occupied(m, n) && B.dist(m.board, n, spot, true) > 3);
  const hp = h.hp;
  T.enemyPhase(m);
  assert.equal(h.hp, hp);
  assert.ok(m.log.some((l) => /empty ground/.test(l.text)));
});

test('aimed: the Brute’s Slam is Aimed when it is telegraphed', () => {
  assert.equal(T.ENEMIES.brute.abilities.slam.aimed, true);
});
