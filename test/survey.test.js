'use strict';
/**
 * Survey (2.34): the second mission that is not a fight (design/03). Tag survey marks spread over the
 * whole board before night falls. Half of them are veiled and must be sighted first, from within 1 or
 * with a reveal, so information verbs have real work and two pilots have a reason to split up. Each
 * mark is of an element, and a die of it tags the mark in place of 2 AP: a rolled element always has a use.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;
const marks = (m) => Object.values(m.board.nodes).filter((n) => n.objective && n.objective.kind === 'mark');
const col = (m, n) =>
  +Object.keys(m.board.at)
    .find((k) => m.board.at[k] === n.id)
    .split(',')[0];

test('a survey board: two more marks than you need, one in every column past the start, half veiled', () => {
  for (let tier = 1; tier <= 3; tier++)
    for (let seed = 1; seed <= 10; seed++) {
      const m = T.quickMission({ seed, type: 'survey', tier }).mission;
      const ob = m.objective;
      assert.equal(ob.kind, 'survey');
      const ms = marks(m);
      assert.equal(ms.length, ob.need + 2);
      for (const c of [1, 2, 3, 4])
        assert.ok(
          ms.some((n) => col(m, n) === c),
          `a mark in column ${c}`,
        );
      assert.ok(
        ms.every((n) => col(m, n) >= 1),
        'none where the pilots start',
      );
      const veiled = ms.filter((n) => n.objective.veiled);
      assert.ok(veiled.length >= Math.floor(ms.length / 2) - 1, 'about half start veiled');
      assert.ok(m.clock && m.clock.onZero === 'lose');
    }
});

test('a veiled mark cannot be tagged until sighted; standing within 1 sights it, standing on it tags it', () => {
  const m = T.quickMission({ seed: 4, type: 'survey', tier: 1 }).mission;
  const h = m.heroes[0];
  const v = marks(m).find((n) => n.objective.veiled);
  assert.ok(v, 'a veiled mark');
  h.held = ['AP', 'AP', 'AP', 'AP'];
  h.heldDie = h.held.map(() => 'plain');
  h.pool = T.RULES.POOL - h.held.length;
  const beside = B.walkNeighbors(m.board, v.id).find((n) => !T.occupied(m, n) && !m.board.nodes[n].height);
  h.pos = beside;
  assert.equal(T.doInteract(m, h, v.id, false).ok, false, 'veiled');
  assert.equal(T.apValue(h), 4, 'a refused tag costs nothing');
  T.sightAround(m, h);
  assert.equal(v.objective.veiled, false, 'sighted from beside it');
  assert.equal(T.doInteract(m, h, v.id, false).ok, false, 'tagged only from on it');
  h.pos = v.id;
  assert.ok(T.doInteract(m, h, v.id, false).ok);
  assert.equal(m.objective.done, 1);
  assert.ok(!m.board.nodes[v.id].objective, 'a tagged mark leaves the board');
});

test('a mark takes 2 AP or one die of its own element (Omni counts), and asks for neither twice', () => {
  const m = T.quickMission({ seed: 5, type: 'survey', tier: 1 }).mission;
  const h = m.heroes[0];
  const [a, b] = marks(m);
  a.objective.veiled = b.objective.veiled = false;
  const hold = (faces) => {
    h.held = faces.slice();
    h.heldDie = faces.map(() => 'plain');
    h.temp = [];
    h.pool = T.RULES.POOL - faces.length;
  };
  h.pos = a.id;
  hold([a.objective.el, 'AP']);
  assert.equal(T.markPay(h, a.objective), 'el', 'one AP is not enough, its element is');
  assert.ok(T.doInteract(m, h, a.id, false).ok);
  assert.deepEqual(h.held, ['AP'], 'the element die paid');
  h.pos = b.id;
  hold(['O', 'AP', 'AP']);
  assert.equal(T.markPay(h, b.objective), 'ap', 'AP first when there is enough');
  assert.ok(T.doInteract(m, h, b.id, false, 'el').ok, 'or the element when asked');
  assert.deepEqual(h.held, ['AP', 'AP'], 'Omni stood in for the element');
  assert.equal(m.objective.done, 2);
  assert.equal(h.pool + h.held.length, T.RULES.POOL);
});

test('a reveal sights every veiled mark it reaches', () => {
  const m = T.quickMission({ seed: 4, type: 'survey', tier: 2 }).mission;
  const h = m.heroes[0];
  const before = marks(m).filter((n) => n.objective.veiled).length;
  assert.ok(before > 0);
  T.applyEffect(m, h, { v: 'reveal', radius: 99 }, {});
  assert.equal(marks(m).filter((n) => n.objective.veiled).length, 0);
});

test('reaching the need wins, and night falling first loses', () => {
  const m = T.quickMission({ seed: 2, type: 'survey', tier: 1 }).mission;
  const h = m.heroes[0];
  for (const n of marks(m).slice(0, m.objective.need)) {
    n.objective.veiled = false;
    h.held = ['AP', 'AP'];
    h.heldDie = ['plain', 'plain'];
    h.pool = T.RULES.POOL - 2;
    T.doInteract(m, h, n.id, true);
  }
  assert.ok(m.won && m.over);
  const lost = T.quickMission({ seed: 2, type: 'survey', tier: 1 }).mission;
  lost.clock.value = 1;
  T.finishRound(lost);
  assert.ok(lost.lost || lost.over, 'nightfall ends it');
  assert.ok(!lost.won);
});

test('both players can win it, and the careful one at least as often', () => {
  const wins = { weak: 0, strong: 0 };
  for (let seed = 1; seed <= 8; seed++)
    for (const player of ['weak', 'strong']) {
      const m = T.quickMission({ seed, type: 'survey', tier: 2, kit: 'tier' }).mission;
      if (H.playMission(m, { player }).won) wins[player]++;
    }
  assert.ok(wins.weak >= 1, `heuristic won ${wins.weak}/8`);
  assert.ok(wins.strong >= wins.weak, `look-ahead ${wins.strong}, heuristic ${wins.weak}`);
});
