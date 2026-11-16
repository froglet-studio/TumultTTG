'use strict';
/**
 * Traits shared across clades (Garrett, 2026-11-16): a trait is written once for a branch of the tree and
 * carried by every clade under it. A pilot whose two clades share a trait holds it once; taking it a second
 * time gives DOUBLE_UP upgrade points bound to that card, and that is the only way a card comes up twice.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const R = T.RULES;

// Tool Use is carried by Humans and Orangutans, so every orangutan pilot has it from two clades.

const hero = (species, cards) => {
  const run = T.newRun(7);
  const h = T.newDraftHero(run, 'Test', 'the tested', species);
  cards.forEach((id) => assert.ok(T.addCard(h, id).ok, id));
  return h;
};

test('a shared trait is held once, and a second pick binds upgrade points to it instead', () => {
  const h = hero(['orangutan', 'gecko'], ['hum_tool']);
  assert.deepEqual(T.CARD.hum_tool.clades.slice(0, 2), ['human', 'orangutan']);
  assert.ok(T.cardsOf('orangutan').some((c) => c.id === 'hum_tool'));
  assert.deepEqual(T.canAddCard(h, 'hum_tool'), { ok: true, double: true });
  const free = h.upUnspent;
  assert.deepEqual(T.addCard(h, 'hum_tool'), { ok: true, double: true });
  assert.deepEqual(h.cards, ['hum_tool'], 'still one card');
  assert.deepEqual(h.bound.hum_tool, [R.DOUBLE_UP, 0]);
  assert.equal(h.upUnspent, free, 'the free pool is untouched');
  assert.equal(T.canAddCard(h, 'hum_tool').ok, false, 'never a third time');
});

test("a trait only one of the hero's clades carries is never offered twice", () => {
  const h = hero(['gecko', 'eel'], ['hum_tool', 'gec_hide']);
  assert.equal(T.canAddCard(h, 'hum_tool').ok, false);
  assert.equal(T.canAddCard(h, 'gec_hide').ok, false);
  const run = T.newRun(9);
  for (let i = 0; i < 20; i++) assert.ok(T.draftPack(run, h, 4).every((id) => !h.cards.includes(id)));
});

test('bound points are spent on their card first, never on another, and come back last', () => {
  // the accounting, with two points bound (whatever RULES.DOUBLE_UP is today)
  const h = hero(['orangutan', 'gecko'], ['hum_tool', 'gec_hide']);
  h.upUnspent = 1;
  const was = R.DOUBLE_UP;
  R.DOUBLE_UP = 2;
  T.addCard(h, 'hum_tool');
  R.DOUBLE_UP = was;
  assert.ok(T.adjustUp(h, 'hum_tool', 'E', 1).ok);
  assert.ok(T.adjustUp(h, 'hum_tool', 'P', 1).ok);
  assert.equal(h.upUnspent, 1, "both points came from the card's own");
  assert.equal(T.boundLeft(h, 'hum_tool'), 0);
  assert.ok(T.adjustUp(h, 'hum_tool', 'P', 1).ok);
  assert.equal(h.upUnspent, 0, 'the third came from the free pool');
  assert.ok(T.adjustUp(h, 'hum_tool', 'P', -1).ok);
  assert.equal(h.upUnspent, 1, 'a free point goes back to the free pool');
  assert.ok(T.adjustUp(h, 'hum_tool', 'P', -1).ok);
  assert.equal(h.upUnspent, 1, 'a bound point goes back to the card');
  assert.equal(T.boundLeft(h, 'hum_tool'), 1);
  assert.equal(T.adjustUp(h, 'gec_hide', 'P', 1).ok, true);
  assert.equal(h.upUnspent, 0, 'another card pays from the free pool');
  T.respecHero(h);
  assert.equal(h.upUnspent, 1, 'a respec gives back only free points');
  assert.equal(T.boundLeft(h, 'hum_tool'), 2);
  T.autoAllocate(h);
  assert.equal(T.boundLeft(h, 'hum_tool'), 0, 'auto-allocate spends what is bound');
});

test('a shared trait counts toward whichever of its clades has room', () => {
  const h = hero(['orangutan', 'gecko'], ['hum_persist', 'hum_throw', 'hum_lang']);
  assert.equal(T.cladeCount(h, 'human'), 3);
  assert.ok(T.canAddCard(h, 'hum_tool').ok, 'a fourth Human trait fits when the orangutan has room');
  T.addCard(h, 'hum_tool');
  assert.equal(T.cladeCount(h, 'orangutan'), 1);
  ['ora_reach', 'ora_leaf'].forEach((id) => T.addCard(h, id));
  assert.equal(T.canAddCard(h, 'ora_study').ok, false, 'the orangutan is full: Tool Use took its third place');
  assert.equal(T.canAddCard(h, 'hum_general').ok, false);
});

test('a save from 2.41 loads with nothing bound and plays on', () => {
  const old = require('./fixtures/save-2.41.json');
  assert.equal(old.v, 14, 'the fixture is a version-14 save');
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  run.heroes.forEach((h) => assert.deepEqual(h.bound, {}));
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run));
  H.playRun(run);
  assert.ok(run.over);
});

test('taken twice, a trait with points already on it still gains every bound point (the 2.42 rule lost them)', () => {
  const h = hero(['orangutan', 'gecko'], ['hum_tool', 'gec_hide']);
  h.upUnspent = 2;
  assert.ok(T.adjustUp(h, 'hum_tool', 'P', 2).ok);
  assert.equal(h.upUnspent, 0);
  T.addCard(h, 'hum_tool');
  assert.equal(T.boundLeft(h, 'hum_tool'), R.DOUBLE_UP, 'the points already on it were free ones');
  T.autoAllocate(h);
  const u = h.up.hum_tool;
  assert.equal(u[0] + u[1], 2 + R.DOUBLE_UP, 'it ends with all of them');
  T.respecHero(h);
  assert.equal(h.upUnspent, 2, 'a respec gives back the two free points');
  assert.equal(T.boundLeft(h, 'hum_tool'), R.DOUBLE_UP, 'and keeps the bound ones for the card');
  T.removeCard(h, 'hum_tool');
  assert.equal(h.upUnspent, 2, 'dropping the card loses only what was bound to it');
});

test('a 2.47 save keeps its bound points, counted as spent on the card the way 2.42 counted them', () => {
  const old = require('./fixtures/save-2.47.json');
  assert.equal(old.v, 15, 'the fixture is a version-15 save');
  const n = old.heroes[0].bound.cat_stalk;
  const u = old.heroes[0].up.cat_stalk;
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.deepEqual(run.heroes[0].bound.cat_stalk, [n, Math.min(n, u[0] + u[1])]);
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run));
  H.playRun(run);
  assert.ok(run.over);
});
