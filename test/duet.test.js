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

test('Leg up moves the partner beside you, at once, to a node the giver chooses; Lend gives them 2 AP', () => {
  const s = scene();
  const before = T.apValue(s.ally);
  assert.ok(T.useBasic(s.m, s.h, 'lend').ok);
  assert.equal(T.apValue(s.ally), before + 2);
  const tg = T.canUseBasic(s.m, s.h, 'legup').tg;
  assert.equal(tg.need, 'node', 'the giver picks the destination');
  assert.ok(tg.options.includes(s.ally.pos), 'staying put is a choice');
  const to = tg.options.find((n) => n !== s.ally.pos && B.dist(s.m.board, s.ally.pos, n, false) === 2) ?? tg.options[1];
  assert.ok(T.useBasic(s.m, s.h, 'legup', { node: to }).ok);
  assert.equal(s.ally.pos, to, 'the partner is already there: nothing is left for them to decide');
  assert.ok(!s.ally.freeMove, 'no free steps are handed over');
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

test('every power that moves your partner resolves on the spot, so a turn can be planned exactly', () => {
  // Call, Cue, Leg up and the Beacon gear all name the destination when they are played
  const movers = [];
  for (const c of Object.values(T.CARD))
    for (const fk of ['P', 'E']) if (c[fk].fx.some((x) => x.v === 'guide')) movers.push(c[fk].tgt);
  for (const b of T.BASIC) if (b.fx.some((x) => x.v === 'guide')) movers.push(b.tgt);
  for (const g of T.GEAR) for (const ab of g.abilities) if (ab.fx.some((x) => x.v === 'guide')) movers.push(ab.tgt);
  assert.ok(movers.length >= 4);
  for (const t of movers) assert.ok(['ally_move', 'ally_adj_move'].includes(t), 'a guide names its node: ' + t);
  // and the same plan played twice gives the same board
  const a = scene();
  const b = scene();
  const to = T.canUseBasic(a.m, a.h, 'legup').tg.options.at(-1);
  T.useBasic(a.m, a.h, 'legup', { node: to });
  T.useBasic(b.m, b.h, 'legup', { node: to });
  assert.equal(JSON.stringify(a.m.heroes), JSON.stringify(b.m.heroes));
});
