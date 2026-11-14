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
  const cr = run.crystals;
  assert.ok(T.skipOfferedCard(run, 1).ok);
  assert.equal(run.crystals, cr + 2);
  assert.equal(T.skipOfferedCard(run, 1).ok, false);
  assert.ok(T.rewardSettled(rw));
});

test('after an elite every hero chooses a boon of their own', () => {
  const { run, rw } = wonReward('elite');
  assert.equal(rw.boons.length, run.heroes.length);
  const all = rw.boons.flat();
  assert.equal(new Set(all).size, all.length, 'no boon is offered to two heroes');
  run.heroes.forEach((h, i) => (rw.picked[i] = true));
  assert.ok(!T.rewardSettled(rw));
  assert.equal(T.takeBoon(run, rw.boons[1][0], 0).ok, false);
  run.heroes.forEach((h, i) => assert.ok(T.takeBoon(run, rw.boons[i][0], i).ok));
  run.heroes.forEach((h, i) => assert.ok(h.boons.includes(rw.boons[i][0])));
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
  assert.deepEqual(
    rw.boons,
    run.heroes.map(() => old.lastReward.boon),
  );
  assert.equal(rw.offer, undefined);
  assert.ok(!T.rewardSettled(rw));
  run.heroes.forEach((h, i) => {
    T.skipOfferedCard(run, i);
    T.takeBoon(run, rw.boons[i][i], i);
  });
  assert.ok(T.rewardSettled(rw));
  T.finishNode(run);
  assert.ok(H.playRun(run).run.over);
});
