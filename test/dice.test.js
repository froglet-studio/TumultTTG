'use strict';
/**
 * Dice kinds (2.29): a plain d20, an ethereal d12 and a d8 for each element. A pilot always has 15 dice;
 * each awakened card puts a die of its element in the pool in place of a plain one.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const count = (list, x) => list.filter((y) => y === x).length;

test('the dice: a d20 with every element once, a d12 with two of each symbol, a d8 for each element', () => {
  const plain = T.RULES.FACES;
  assert.equal(plain.length, 20);
  for (const e of ['M', 'C', 'S', 'T', 'O']) assert.equal(count(plain, e), 1, `${e} once on the plain die`);
  assert.equal(count(plain, 'AP'), 15, 'AP on every other side, no AP×2 (Garrett, 2026-11-14)');
  assert.equal(count(plain, 'AP2'), 0);
  const eth = T.DICE.eth.faces;
  assert.equal(eth.length, 12);
  for (const x of ['AP', 'O', 'M', 'C', 'S', 'T']) assert.equal(count(eth, x), 2);
  for (const e of ['M', 'C', 'S', 'T']) {
    const d8 = T.DICE[e].faces;
    assert.equal(d8.length, 8);
    assert.equal(count(d8, e), 4, `half the ${e} die is ${e}`);
    for (const x of ['M', 'C', 'S', 'T', 'O'].filter((y) => y !== e)) assert.equal(count(d8, x), 1);
    assert.equal(count(d8, 'AP') + count(d8, 'AP2'), 0, 'an element die has no AP');
  }
});

test('each awakened card puts a die of its element in the pool, and the pool is still 15', () => {
  const { m, h } = H.arena('hum_tool');
  const awake = h.cards.filter((c) => T.heroE(h, c) >= T.RULES.ETHEREAL_MIN_E);
  const set = T.diceSet(h);
  assert.equal(set.length, T.RULES.POOL);
  assert.equal(set.length - count(set, 'plain'), awake.filter((c) => T.DICE[T.CARD[c].el]).length);
  for (const c of awake) assert.ok(set.includes(T.CARD[c].el), `${c} adds a ${T.CARD[c].el} die`);
  // wake another card: one more die of its element, one plain die fewer
  const asleep = h.cards.find((c) => T.heroE(h, c) < T.RULES.ETHEREAL_MIN_E && T.DICE[T.CARD[c].el]);
  if (asleep) {
    h.up[asleep][1] = T.RULES.ETHEREAL_MIN_E;
    const after = T.diceSet(h);
    assert.equal(count(after, 'plain'), count(set, 'plain') - 1);
    assert.equal(count(after, T.CARD[asleep].el), count(set, T.CARD[asleep].el) + 1);
  }
  assert.equal(T.poolDice(h).length, h.pool, 'the pool by kind matches the pool count');
  void m;
});

test('rolling draws from the pool by kind, banks each die with its kind, and spending returns it', () => {
  const { m, h } = H.arena('hum_tool');
  while (h.held.length) T.dump(m, h, 0);
  const set = T.diceSet(h);
  for (let i = 0; i < 300; i++) {
    T.rollDice(m, h);
    assert.equal(h.held.length, h.heldDie.length, 'every banked die has a kind');
    h.held.forEach((f, di) => assert.ok(T.dieFaces(h, T.heldKind(h, di)).includes(f), 'a face its die has'));
    const inPlay = T.poolDice(h).concat(h.heldDie).sort();
    assert.deepEqual(inPlay, set.slice().sort(), 'pool + banked is the whole set, kind by kind');
    while (h.held.length) T.dump(m, h, 0);
  }
  assert.equal(h.pool, T.RULES.POOL);
});

test('a save from 2.28 loads with every banked die plain and plays on', () => {
  const old = require('./fixtures/save-2.28.json');
  assert.equal(old.v, 11);
  const run = T.deserializeRun(JSON.stringify(old));
  for (const h of run.mission.heroes) {
    assert.equal(h.heldDie.length, h.held.length);
    assert.ok(h.heldDie.every((k) => k === 'plain'));
  }
  assert.ok(H.playMission(run.mission).over);
});
