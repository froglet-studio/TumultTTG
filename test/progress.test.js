'use strict';
/**
 * Pilots keep what they learn (Garrett, 2026-11-20): a pilot a player made comes home from an expedition with
 * its traits and points, sets out next time at the level it reached, and the missions grow to meet it.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();

function withStorage(fn) {
  const store = {};
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: (k) => delete store[k],
  };
  try {
    return fn(store);
  } finally {
    delete global.localStorage;
  }
}
function drafted(run, name, species) {
  const h = T.newDraftHero(run, name, 'the drafted', species);
  while (h.cards.length < T.RULES.START_CARDS) T.addCard(h, T.draftPack(run, h, 4)[0]);
  T.awaken(h);
  T.autoAllocate(h);
  return h;
}

test('a new pilot is level 1; growth past a new pilot raises it a level per LEVEL_UP points', () => {
  const run = T.newRun(3);
  const h = drafted(run, 'Sable', ['lynx', 'owl']);
  assert.equal(T.pilotPower(h), 0);
  assert.equal(T.pilotLevel(h), 1);
  h.upUnspent += T.SCALING.LEVEL_UP - 1;
  assert.equal(T.pilotLevel(h), 1);
  h.upUnspent += 1;
  assert.equal(T.pilotLevel(h), 2);
  const extra = T.CARDS.find((c) => T.canAddCard(h, c.id).ok && !h.cards.includes(c.id));
  T.addCard(h, extra.id);
  assert.equal(T.pilotPower(h), T.SCALING.LEVEL_UP + T.SCALING.CARD_UP);
  T.PREBUILTS.forEach((pb) => assert.equal(T.pilotLevel(T.heroFromPrebuilt(run, pb)), 1, pb.name + ' sets out new'));
});

test('a made pilot comes home with its growth and sets out again at its level', () =>
  withStorage(() => {
    const run = T.newRun(5);
    const h = drafted(run, 'Quill', ['otter', 'raven']);
    const kept = T.keepMade(T.madeFrom(h, '2026-11-20'));
    h.madeId = kept.id;
    // an expedition's worth of growth
    h.upUnspent += 14;
    T.autoAllocate(h);
    for (const c of T.CARDS)
      if (h.cards.length < 9 && !h.cards.includes(c.id) && T.canAddCard(h, c.id).ok) T.addCard(h, c.id);
    h.upUnspent += 3;
    const rec = T.keepMade(T.progressRecord(h, kept));
    assert.ok(rec, 'the grown recipe is valid');
    assert.equal(rec.id, kept.id, 'the same pilot, not a new one');
    assert.equal(rec.runs, 1);
    assert.equal(T.loadMade().length, 1);
    const next = T.newRun(6);
    const back = T.heroFromPrebuilt(next, T.loadMade()[0]);
    assert.deepEqual(back.cards, h.cards);
    assert.deepEqual(back.up, h.up);
    assert.equal(back.upUnspent, h.upUnspent, 'the points it had not spent come home too');
    assert.equal(back.madeId, kept.id);
    assert.equal(back.level, T.pilotLevel(h));
    assert.ok(back.level > 1);
    // kept again from the draft, it keeps its expeditions
    const again = T.keepMade(T.madeFrom(back, '2026-11-21'));
    assert.equal(again.runs, 1);
  }));

test('a recipe with more than a new pilot holds is refused unless it has flown', () => {
  const run = T.newRun(8);
  const h = drafted(run, 'Marrow', ['otter', 'eel']);
  h.upUnspent += 10;
  const rec = T.madeFrom(h, '');
  assert.equal(T.validMade(rec), null, 'a new pilot has six points');
  assert.ok(T.validMade(Object.assign({}, rec, { runs: 2 })));
  assert.equal(T.validMade(Object.assign({}, rec, { runs: 2, spare: 999 })), null);
  assert.equal(T.validMade(Object.assign({}, rec, { runs: -1 })), null);
});

test("the missions answer the squad's level as it set out, not what it grows on the way", () => {
  const run = T.newRun(9);
  run.heroes = [T.heroFromPrebuilt(run, T.PREBUILTS[0]), T.heroFromPrebuilt(run, T.PREBUILTS[1])];
  assert.equal(T.scaleFor(run).level, 0);
  run.heroes[0].upUnspent += 30; // growth on this expedition
  assert.equal(T.scaleFor(run).level, 0);
  run.heroes.forEach((h) => (h.level = 5));
  const sc = T.scaleFor(run);
  assert.equal(sc.level, 4);
  assert.equal(sc.hp, Math.round(100 * (1 + 4 * T.SCALING.level.hp)));
  run.heroes[1].level = 1;
  assert.equal(T.scaleFor(run).level, 2, 'the squad level is its pilots’ levels past 1, averaged, rounded down');
});

test('a 2.75 save loads, plays on and saves again unchanged in shape', () => {
  const { createHarness } = require('../tools/harness');
  const H = createHarness(T);
  const old = require('./fixtures/save-2.75.json');
  assert.equal(old.v, 16, 'the fixture is a version-16 save');
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.equal(run.mission.foeHp, undefined, 'two new pilots: nothing scales');
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run));
  H.playRun(run);
  assert.ok(run.over);
});

test('a made pilot comes home with its reserve, the points on it, and sets out with it again', () => {
  withStorage(() => {
    const run = T.newRun(77);
    const h = drafted(run, 'Reed', ['lynx', 'owl']);
    for (const c of T.CARDS) if (h.cards.length < T.RULES.MAX_CARDS && T.canAddCard(h, c.id).ok) T.addCard(h, c.id);
    const extra = T.CARDS.find((c) => T.canCollect(h, c.id).ok);
    assert.ok(T.addCard(h, extra.id).reserve);
    h.upUnspent = 2;
    T.adjustUp(h, extra.id, 'E', 1);
    h.runs = 1;
    const rec = T.validMade(T.madeFrom(h, '2026-11-21'));
    assert.ok(rec, 'the recipe is valid');
    assert.deepEqual(rec.reserve, [extra.id]);
    assert.deepEqual(rec.up[extra.id], [0, 1]);
    const back = T.heroFromPrebuilt(T.newRun(78), rec);
    assert.deepEqual(back.reserve, [extra.id]);
    assert.deepEqual(back.up[extra.id], [0, 1]);
    assert.deepEqual(back.cards, h.cards);
    assert.equal(T.validMade(Object.assign({}, rec, { reserve: [h.cards[0]] })), null, 'no trait twice');
    assert.equal(T.validMade(Object.assign({}, rec, { reserve: ['nope'] })), null, 'only real traits');
  });
});
