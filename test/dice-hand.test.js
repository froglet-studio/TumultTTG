'use strict';
/**
 * No die drawn at random (2.101; Garrett, 2026-11-21: "you can't randomly grab a d20 vs a d8 because your hand
 * feels the difference even in bag. so reroll is great, and grabbing a specific die is great, but not a random
 * one"). Reroll and Draw stay; every die that leaves the pool is one a player could pick by touch.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();

function bare(seed) {
  const run = T.quickMission({ seed: seed || 2, type: 'vault', tier: 1 });
  const m = run.mission;
  const h = m.heroes[0];
  while (h.held.length) T.dump(m, h, 0);
  return { m, h };
}
const kinds = (h) => h.held.map((_, i) => T.heldKind(h, i));

test('Draw takes a plain d20 while the pool has one, and banks it showing the face', () => {
  const { h } = bare();
  assert.equal(T.draw(h, 'AP', 2), 2);
  assert.deepEqual(h.held, ['AP', 'AP']);
  assert.deepEqual(kinds(h), ['plain', 'plain']);
  assert.equal(h.pool + h.held.length, T.RULES.POOL);
});

test('with no plain die left, Draw takes the element die that shows the face most, and never AP from a d8', () => {
  const { h } = bare();
  const els = T.diceSet(h).filter((k) => k !== 'plain');
  assert.ok(els.length, 'this pilot has element dice');
  const plain = T.poolDice(h).filter((k) => k === 'plain').length;
  T.draw(h, 'AP', plain);
  assert.equal(T.poolDice(h).filter((k) => k === 'plain').length, 0);
  const el = els[0];
  assert.equal(T.drawKind(h, el), el, 'its own d8: four sides of it');
  assert.equal(T.drawKind(h, 'AP'), T.poolDice(h).includes('eth') ? 'eth' : null, 'no d8 shows AP');
  const before = h.held.length;
  assert.equal(T.draw(h, el, 1), 1);
  assert.equal(T.heldKind(h, before), el);
  assert.equal(h.pool + h.held.length, T.RULES.POOL);
});

test('a roll with too few plain dice takes element dice by kind, the same whatever the dice stream', () => {
  const picks = [];
  for (const seed of [2, 2]) {
    const { m, h } = bare(seed);
    const plain = T.poolDice(h).filter((k) => k === 'plain').length;
    T.draw(h, 'AP', plain - 1); // one plain die left in the pool
    // spin the dice stream differently on each pass: the kinds rolled must not depend on it
    if (picks.length) T.stream(m.rngs, 'dice').int(1000);
    const at = h.held.length;
    T.rollDice(m, h);
    picks.push(kinds(h).slice(at));
  }
  assert.deepEqual(picks[0], picks[1]);
  assert.equal(picks[0].filter((k) => k === 'plain').length, 1);
});
