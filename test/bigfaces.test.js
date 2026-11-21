'use strict';
/**
 * Big Ethereal faces (2.85; Garrett, 2026-11-21: "make some more powerful abilities that cost more elemental
 * dice"): some faces cost two or three etherions of their element, and are paid in full or not at all.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();

test('every element has Ethereal faces costing two and three etherions', () => {
  for (const el of ['M', 'C', 'S', 'T']) {
    const faces = T.CARDS.filter((c) => c.E && (c.E.elt || c.el) === el).map((c) => c.E.el);
    assert.ok(faces.includes(2), el + ': a 2-etherion face');
    assert.ok(faces.includes(3), el + ': a 3-etherion face');
  }
});

test('a 3-etherion face needs all three (Omni counts) and spends them', () => {
  const run = T.quickMission({ seed: 2, type: 'vault', tier: 1 });
  const m = run.mission;
  const h = m.heroes[0];
  h.cards = h.cards.slice(0, 5).concat('tar_crypto');
  h.up.tar_crypto = [0, 1];
  h.track = h.track.filter((t) => t.card !== 'tar_crypto');
  while (h.held.length) T.dump(m, h, 0);
  T.draw(h, 'T', 2);
  assert.equal(T.canPlay(m, h, 'tar_crypto', 'E').ok, false, 'two are not enough');
  T.draw(h, 'O', 1);
  assert.ok(T.canPlay(m, h, 'tar_crypto', 'E').ok, 'Omni stands in for the third');
  assert.ok(T.playFace(m, h, 'tar_crypto', 'E', {}).ok);
  assert.equal(h.held.length, 0, 'all three spent, and no AP asked');
  assert.equal(h.pool + h.held.length, T.RULES.POOL);
});
