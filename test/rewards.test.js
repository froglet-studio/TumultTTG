'use strict';
/**
 * Every pilot gets an upgrade of their own after a won mission (Garrett, 2026-11-14): a trait offer
 * each, and after an elite a boon offer each. No offer is shared, and nobody chooses for another.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;

/** A won tier-1 mission of this archetype, its reward drawn. */
function wonReward(archetype = 'swarm', seed = 5) {
  const run = T.newRun(seed);
  H.prebuiltSquad(run, 0, 1);
  T.launchMission(run, archetype, 1);
  const m = run.mission;
  m.won = true;
  m.over = true;
  T.missionRewards(run, m);
  T.applyMissionResult(run);
  return { run, rw: run.lastReward };
}

test('each hero gets a trait offer of their own: cards they can take, none offered twice', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { run, rw } = wonReward('swarm', seed);
    assert.equal(rw.offers.length, run.heroes.length);
    const all = rw.offers.flat();
    assert.equal(new Set(all).size, all.length, 'no card is offered to two heroes');
    rw.offers.forEach((offer, i) => {
      assert.equal(offer.length, 3);
      offer.forEach((cid) => assert.ok(T.canAddCard(run.heroes[i], cid).ok, `${cid} fits hero ${i}`));
    });
    assert.equal(rw.boons, null, 'no boon after an ordinary mission');
    assert.ok(!T.rewardSettled(rw));
  }
});

test('the reward is settled only when every hero has taken or skipped, and only from their own offer', () => {
  const { run, rw } = wonReward();
  const theirs = rw.offers[1][0];
  assert.equal(T.takeOfferedCard(run, theirs, 0).ok, false, "a hero cannot take another hero's card");
  const before = run.heroes[0].cards.length;
  assert.ok(T.takeOfferedCard(run, rw.offers[0][0], 0).ok);
  assert.equal(run.heroes[0].cards.length, before + 1);
  assert.equal(T.takeOfferedCard(run, rw.offers[0][1], 0).ok, false, 'one trait each');
  assert.ok(!T.rewardSettled(rw));
  const cr = T.crystalsFor(run, 1);
  assert.ok(T.skipOfferedCard(run, 1).ok);
  assert.equal(T.crystalsFor(run, 1), cr + 2);
  assert.equal(T.skipOfferedCard(run, 1).ok, false);
  assert.ok(T.rewardSettled(rw));
});

test('an elite offers no boon since 2.89 (boons are gear passives): its reward is crystals and the trait', () => {
  const { run, rw } = wonReward('elite');
  const plain = wonReward().rw;
  assert.equal(rw.boons, null);
  assert.ok(rw.crystals > plain.crystals, 'an elite still pays more');
  run.heroes.forEach((h, i) => (rw.picked[i] = true));
  assert.ok(T.rewardSettled(rw));
});

test('on two screens each player chooses only for their own pilot', () => {
  const { run, rw } = wonReward();
  run.party = T.newParty(2);
  assert.equal(T.execCommand(run, { op: 'skipCard', hero: 1 }, [0]).ok, false, 'the host cannot skip for the guest');
  assert.ok(T.execCommand(run, { op: 'skipCard', hero: 1 }, [1]).ok);
  assert.ok(T.execCommand(run, { op: 'takeCard', hero: 0, card: rw.offers[0][0] }, [0]).ok);
  assert.ok(T.rewardSettled(rw));
});

test('a lost mission held by the Lifeline offers nothing and is settled at once', () => {
  const run = T.newRun(5);
  H.prebuiltSquad(run, 0, 1);
  T.launchMission(run, 'swarm', 1);
  run.mission.won = false;
  run.mission.over = true;
  T.missionRewards(run, run.mission);
  T.applyMissionResult(run);
  assert.ok(run.lastReward.lifeline);
  assert.ok(T.rewardSettled(run.lastReward));
});

test('a save from 2.22 on the reward screen loads with an offer for each hero', () => {
  const old = require('./fixtures/save-2.22.json');
  assert.equal(old.v, 8, 'the fixture is a version-8 save');
  assert.ok(old.lastReward.offer.length && old.lastReward.boon.length);
  const run = T.deserializeRun(JSON.stringify(old));
  const rw = run.lastReward;
  assert.equal(run.v, T.SAVE_VERSION);
  assert.deepEqual(
    rw.offers,
    run.heroes.map(() => old.lastReward.offer),
  );
  assert.equal(rw.boons, null, 'the boon on offer is passed (2.89)');
  assert.equal(rw.offer, undefined);
  assert.ok(!T.rewardSettled(rw));
  run.heroes.forEach((h, i) => T.skipOfferedCard(run, i));
  assert.ok(T.rewardSettled(rw));
  T.finishNode(run);
  assert.ok(H.playRun(run).run.over);
});

/** A won reward for a squad whose first hero holds nine traits. */
function fullKitReward(seed) {
  const run = T.newRun(seed);
  H.prebuiltSquad(run, 0, 1);
  const h = run.heroes[0];
  for (const c of T.CARDS)
    if (h.cards.length < T.RULES.MAX_CARDS && T.canAddCard(h, c.id).ok && !h.cards.includes(c.id)) T.addCard(h, c.id);
  T.autoAllocate(h);
  T.launchMission(run, 'swarm', 1);
  const m = run.mission;
  m.won = true;
  m.over = true;
  T.missionRewards(run, m);
  T.applyMissionResult(run);
  return { run, h, rw: run.lastReward };
}

test('a full kit is offered exchanges: a new trait in, an old one out, nine kept (Garrett, 2026-11-20)', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const { run, h, rw } = fullKitReward(seed);
    assert.equal(h.cards.length, T.RULES.MAX_CARDS);
    assert.ok(rw.offers[0].length > 0, 'a full kit still gets an offer');
    const cid = rw.offers[0].find((c) => T.isSwapOffer(run, 0, c));
    if (!cid) continue;
    assert.equal(T.takeOfferedCard(run, cid, 0).ok, false, 'an exchange names the trait it gives up');
    const drop = T.swapDrops(h, cid)[0];
    // every point on the old trait comes back, and any a second copy bound to it, spent or not
    const b = h.bound && h.bound[drop];
    const pts = h.upUnspent + h.up[drop][0] + h.up[drop][1] + (b ? b[0] - b[1] : 0);
    assert.ok(T.takeOfferedCard(run, cid, 0, drop).ok);
    assert.equal(h.cards.length, T.RULES.MAX_CARDS, 'still nine');
    assert.ok(h.cards.includes(cid) && !h.cards.includes(drop));
    assert.deepEqual(h.up[cid], [0, 0]);
    assert.equal(h.up[drop], undefined);
    assert.equal(h.upUnspent, pts, "the old trait's points all come back");
    assert.ok(T.cladeSlots(h, h.cards), 'the 3-of-9 cap holds');
    assert.ok(rw.picked[0]);
    return;
  }
  assert.fail('no seed offered an exchange');
});

test('an exchange is refused when it would break the cap, or when the kit has room', () => {
  const { run, h } = fullKitReward(3);
  const other = run.heroes[1];
  const outside = T.CARDS.find((c) => !c.clades.some((sp) => h.species.includes(sp)));
  assert.equal(T.canSwapCard(h, outside.id, h.cards[0]).ok, false, 'not of the bloodline');
  assert.equal(T.canSwapCard(h, h.cards[1], h.cards[0]).ok, false, 'already held');
  const spare = T.CARDS.find((c) => T.canAddCard(other, c.id).ok && !other.cards.includes(c.id));
  assert.equal(T.canSwapCard(other, spare.id, other.cards[0]).ok, false, 'six cards: take it, do not exchange');
  // a trait of one clade can only come in for a trait that frees a slot of that clade, when that clade is full
  for (const c of T.CARDS) {
    if (h.cards.includes(c.id) || !c.clades.some((sp) => h.species.includes(sp))) continue;
    for (const d of h.cards) {
      const ok = T.canSwapCard(h, c.id, d).ok;
      assert.equal(ok, !!T.cladeSlots(h, h.cards.filter((x) => x !== d).concat(c.id)));
    }
  }
});

test('an exchange goes through the party command', () => {
  const { run, rw } = fullKitReward(5);
  const cid = rw.offers[0].find((c) => T.isSwapOffer(run, 0, c));
  if (!cid) return;
  const drop = T.swapDrops(run.heroes[0], cid)[0];
  assert.ok(T.execCommand(run, { op: 'takeCard', hero: 0, card: cid, drop }, null).ok);
  assert.ok(run.heroes[0].cards.includes(cid));
});
