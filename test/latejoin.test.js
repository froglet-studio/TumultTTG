'use strict';
/**
 * A player joins an expedition under way (2.78): on the route, between missions, a newcomer takes the next
 * seat and brings a pilot; the route waits for it, and the next mission scales for the bigger squad.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;

const onRoute = (players) => {
  const run = T.newRun(21);
  run.party = T.newParty(players, ['Ana', 'Bo', 'Cy']);
  H.prebuiltSquad(run, 0, 1);
  while (run.heroes.length < run.party.owner.length)
    run.heroes.push(T.heroFromPrebuilt(run, T.PREBUILTS[run.heroes.length + 2]));
  T.startMap(run);
  return run;
};

test('a newcomer on the route brings a pilot, and the route waits for it', () => {
  const run = onRoute(2);
  assert.ok(T.canAddPlayer(run));
  const r = T.addPlayer(run, 'Garrett');
  assert.deepEqual([r.ok, r.seat, r.hero], [true, 2, 2]);
  assert.equal(run.party.players.length, 3);
  assert.deepEqual(run.party.owner, [0, 1, 2]);
  assert.equal(run.purses.length, 3);
  assert.equal(run.purses[2], Math.min(...run.purses.slice(0, 2)), 'a purse as full as the emptiest');
  assert.equal(T.squadReady(run), false);
  assert.equal(T.chooseNode(run, run.available[0]).ok, false, 'no stop until the pilot joins');
  assert.equal(T.canAddPlayer(run), false, 'one newcomer at a time');
  const h = T.heroFromPrebuilt(T.newRun(3), T.PREBUILTS[5]);
  assert.equal(T.execCommand(run, { op: 'addHero', hero: 2, pilot: h }, [1]).ok, false, "not another seat's pilot");
  assert.ok(T.execCommand(run, { op: 'addHero', hero: 2, pilot: h }, [2]).ok);
  assert.ok(T.squadReady(run));
  assert.equal(T.scaleFor(run).size, 1, 'the next mission scales for three');
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run));
  assert.ok(T.chooseNode(run, run.available[0]).ok !== false);
});

test('a lone player who flies two hands the second pilot to the newcomer', () => {
  const run = onRoute(1);
  const r = T.addPlayer(run, 'Bo');
  assert.deepEqual([r.ok, r.seat, r.hero], [true, 1, 1]);
  assert.deepEqual(run.party.owner, [0, 1]);
  assert.ok(T.squadReady(run), 'no new pilot to wait for');
});

test('nobody joins in a mission, or past five players', () => {
  const run = onRoute(2);
  T.chooseNode(
    run,
    run.available.find((id) => run.map.all[id].type !== 'haven' && run.map.all[id].type !== 'event'),
  );
  if (run.phase === 'mission') assert.equal(T.addPlayer(run, 'Late').ok, false);
  const full = onRoute(2);
  full.party.players.push({ name: 'C' }, { name: 'D' }, { name: 'E' });
  assert.equal(T.canAddPlayer(full), false);
});

test('a late pilot catches up with the least-grown pilot flying, and keeps its own level', () => {
  const run = onRoute(2);
  run.heroes.forEach((h, i) => (h.upUnspent += 4 + i * 3)); // grown 4 and 7 points on the road
  T.addPlayer(run, 'Cy');
  const h = T.heroFromPrebuilt(T.newRun(3), T.PREBUILTS[5]);
  const before = T.pilotPower(h);
  const r = T.joinPilot(run, 2, h);
  assert.equal(T.pilotPower(h), Math.min(...run.heroes.slice(0, 2).map(T.pilotPower)));
  assert.equal(r.caughtUp, T.pilotPower(h) - before);
  assert.equal(h.level, 1, 'its level is the one it came with');
});
