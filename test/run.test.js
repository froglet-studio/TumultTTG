'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;

test('full runs: map → missions → havens → events complete, with save round-trips', () => {
  let finished = 0;
  for (let i = 0; i < 8; i++) {
    const run = T.newRun(5000 + i * 31);
    if (i % 2) H.draftedSquad(run);
    else H.prebuiltSquad(run, i % 6, (i + 2) % 6);
    const r = H.playRun(run, { checkSave: true });
    assert.ok(run.over, `run ${i} should end (won or lost)`);
    assert.ok(r.missions >= 1);
    finished++;
  }
  assert.equal(finished, 8);
});

test('draft: packs only offer legal cards; the 3-of-9 and 9-card caps hold', () => {
  const run = T.newRun(42);
  const h = T.newDraftHero(run, 'Tess', 'the drafted', ['owl', 'gecko']);
  for (let pick = 0; pick < T.RULES.MAX_CARDS; pick++) {
    const pack = T.draftPack(run, h, 4);
    assert.ok(pack.length > 0, 'a legal pack exists until the kit is full');
    for (const id of pack) assert.equal(T.canAddCard(h, id).ok, true, `${id} offered but illegal`);
    assert.equal(T.addCard(h, pack[0]).ok, true);
  }
  assert.equal(h.cards.length, T.RULES.MAX_CARDS);
  for (const sp of h.species) {
    assert.ok(h.cards.filter((id) => T.CARD[id].sp === sp).length <= T.RULES.MAX_PER_SPECIES, `${sp}: 3-of-9 cap`);
  }
  const extra = T.CARDS.find((c) => h.species.includes(c.sp) && !h.cards.includes(c.id));
  assert.equal(T.canAddCard(h, extra.id).ok, false, 'kit is full');
  const foreign = T.CARDS.find((c) => !h.species.includes(c.sp));
  assert.equal(T.canAddCard(h, foreign.id).ok, false, 'not your bloodline');
});

test('upgrade points: P and E are capped and refundable', () => {
  const run = T.newRun(7);
  const h = T.newDraftHero(run, 'Uma', 'the drafted', ['eel', 'flytrap']);
  T.addCard(h, 'eel_discharge');
  h.upUnspent = 10;
  for (let i = 0; i < T.RULES.E_CAP; i++) assert.equal(T.adjustUp(h, 'eel_discharge', 'E', 1).ok, true);
  assert.equal(T.adjustUp(h, 'eel_discharge', 'E', 1).ok, false, 'E cap');
  assert.equal(T.heroE(h, 'eel_discharge'), T.RULES.E_CAP);
  assert.equal(h.upUnspent, 10 - T.RULES.E_CAP);
  T.respecHero(h);
  assert.equal(h.upUnspent, 10);
  assert.equal(T.heroE(h, 'eel_discharge'), 0);
});

test('the tide map: every node is reachable and the boss is the last row', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const run = T.newRun(seed);
    T.startMap(run);
    const { rows, all } = run.map;
    assert.equal(rows[rows.length - 1].length, 1);
    assert.equal(rows[rows.length - 1][0].type, 'boss');
    for (let r = 1; r < rows.length; r++) {
      for (const n of rows[r]) {
        assert.ok(
          rows[r - 1].some((p) => p.next.includes(n.id)),
          `seed ${seed}: node ${n.id} (row ${r}) has no way in`,
        );
      }
    }
    for (const n of Object.values(all)) if (n.type !== 'boss') assert.ok(n.next.length >= 1, 'no dead ends');
  }
});
