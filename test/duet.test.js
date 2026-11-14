'use strict';
/**
 * Duet moves (2.28): basic actions every pilot has that pay off through the partner, so a turn can
 * be spent on your partner's turn. Built from verbs that already exist (mark, rally, mint).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;

/** An arena with the partner put beside the tester (or away from them). */
function scene(beside = true) {
  const s = H.arena('hum_tool');
  const ally = T.allyOf(s.m, s.h);
  const free = Object.keys(s.m.board.nodes)
    .map(Number)
    .filter((n) => !T.occupied(s.m, n) && !s.m.board.nodes[n].height);
  ally.pos = beside
    ? B.walkNeighbors(s.m.board, s.h.pos).find((n) => !T.occupied(s.m, n))
    : free.find((n) => B.dist(s.m.board, s.h.pos, n, true) >= 2);
  s.h.held = ['AP', 'AP', 'AP', 'AP'];
  s.h.pool = T.RULES.POOL - s.h.held.length;
  return Object.assign(s, { ally });
}

test('Spot marks a foe; the next hit on it, by the partner, deals 2 more', () => {
  const s = scene();
  const foe = s.adj;
  foe.shield = 0;
  delete foe.states.Shield;
  assert.ok(T.useBasic(s.m, s.h, 'spot', { target: foe.uid }).ok);
  assert.ok(foe.states.Marked, 'Marked');
  const hp = foe.hp;
  T.damage(s.m, s.ally, foe, 2, { kind: 'melee', label: 'test' });
  assert.equal(foe.hp, Math.max(0, hp - 4));
  assert.ok(!foe.states.Marked, 'the mark is spent');
});

test('Leg up gives the partner beside you 2 free steps; Lend gives them 2 AP for this round', () => {
  const s = scene();
  assert.ok(T.useBasic(s.m, s.h, 'legup').ok);
  assert.equal(s.ally.freeMove, 2);
  const before = T.apValue(s.ally);
  assert.ok(T.useBasic(s.m, s.h, 'lend').ok);
  assert.equal(T.apValue(s.ally), before + 2);
  assert.equal(s.ally.pool + s.ally.held.length, T.RULES.POOL, 'minted dice never count: 15 dice still');
  T.finishRound(s.m);
  assert.equal(s.ally.temp.length, 0, 'lent AP is gone at the end of the round');
});

test('Leg up and Lend need the partner beside you', () => {
  const s = scene(false);
  for (const id of ['legup', 'lend']) assert.equal(T.canUseBasic(s.m, s.h, id).why, 'your ally must be beside you');
});

test('the look-ahead player finds the duet moves', () => {
  const used = new Set();
  for (let seed = 1; seed <= 12 && used.size < 2; seed++) {
    const m = T.quickMission({ seed, type: ['swarm', 'elite', 'vault'][seed % 3], tier: 2, kit: 'tier' }).mission;
    for (let r = 0; r < 8 && !m.over; r++) {
      for (const a of T.smartHeroPhase(m))
        if (a.t === 'basic' && ['spot', 'legup', 'lend'].includes(a.basic)) used.add(a.basic);
      if (!m.over) T.endHeroPhase(m);
    }
  }
  assert.ok(used.size >= 1, 'it played at least one duet move');
});
