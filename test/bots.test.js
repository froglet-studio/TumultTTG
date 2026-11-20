'use strict';
/**
 * AI seats (src/engine/bots.js) and the length of an expedition (T.LENGTHS): a seat the AI fills, a dropped
 * player's seat it holds, when it plays, what it chooses between missions; and the Short route.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();

/** A run with one person and the AI filling seats up to n, its pilots drafted and its route open. */
function table(n, { seed = 7, rounds = 'turns', length } = {}) {
  const run = T.newRun(seed);
  run.party = T.newParty(1, ['Ana']);
  run.party.rounds = rounds;
  T.fillSeats(run, n);
  if (length) T.setLength(run, length);
  run.heroes[0] = T.heroFromPrebuilt(run, T.PREBUILTS[0]);
  T.autoAllocate(run.heroes[0]);
  T.botStep(run);
  T.startMap(run);
  return run;
}
const launch = (run) =>
  T.chooseNode(
    run,
    run.available.find((id) => !['haven', 'event'].includes(run.map.all[id].type)),
  );

test('the AI fills empty seats: a player and a pre-made pilot each, none flown twice', () => {
  const run = table(3);
  assert.deepEqual(run.party.owner, [0, 1, 2], 'one pilot a seat');
  assert.deepEqual(
    run.party.players.map((p) => p.ai || false),
    [false, 'fill', 'fill'],
  );
  assert.equal(run.heroes.length, 3);
  assert.equal(new Set(run.heroes.map((h) => h.name)).size, 3, 'no pilot twice');
  run.party.players.slice(1).forEach((p, k) => assert.equal(p.name, 'AI · ' + run.heroes[k + 1].name));
  assert.equal(T.fillSeats(run, 9), 2, 'never past MAX_PLAYERS');
  assert.equal(run.party.players.length, T.MAX_PLAYERS);
});

test('AI pilots move once every person has had their turn, and the round goes on', () => {
  const run = table(3);
  launch(run);
  const m = run.mission;
  const round = m.round;
  assert.equal(T.botStep(run), 0, 'the AI waits for the person');
  assert.equal(T.botMayPlay(run, 1), false);
  T.smartHeroPhase(m, { only: T.heroesOf(run, 0) });
  T.execCommand(run, { op: 'ready' }, [0]);
  assert.equal(m.round, round, "the person's turn ends, not the round");
  assert.ok(T.botMayPlay(run, 1) && T.botMayPlay(run, 2), 'now the AI seats may play');
  assert.equal(T.botStep(run), 2, 'both AI seats take their turn');
  assert.ok(m.round > round || m.over, 'and the round goes on');
  // a whole mission, the person playing their pilot and the AI the others
  for (let g = 0; g < 40 && !m.over; g++) {
    T.smartHeroPhase(m, { only: T.heroesOf(run, 0) });
    T.execCommand(run, { op: 'ready' }, [0]);
    T.botStep(run);
  }
  assert.ok(m.over, 'the mission ends');
});

test('in rounds played all at once, the AI ends once everyone else has', () => {
  const run = table(2, { rounds: 'live' });
  launch(run);
  const m = run.mission;
  const round = m.round;
  assert.equal(T.botMayPlay(run, 1), false);
  T.execCommand(run, { op: 'ready' }, [0]);
  assert.equal(m.round, round);
  assert.equal(T.botStep(run), 1);
  assert.ok(m.round > round || m.over);
});

test('the AI moves only its own seat’s pilots', () => {
  const run = table(2);
  launch(run);
  const m = run.mission;
  T.execCommand(run, { op: 'ready' }, [0]);
  const mine = JSON.stringify(m.heroes[0]);
  T.botTurn(run, 1);
  if (!m.over && m.round === 1) assert.equal(JSON.stringify(m.heroes[0]), mine, "the person's pilot is untouched");
  assert.ok(T.botTurn(run, 0) === null, 'a person’s seat is never played by the AI');
});

test('a dropped player: the AI holds the seat, finishes a turn under way, and gives it back', () => {
  const run = T.newRun(3);
  run.party = T.newParty(2, ['Ana', 'Bo']);
  run.heroes = [0, 1].map((k) => T.heroFromPrebuilt(run, T.PREBUILTS[k]));
  run.heroes.forEach((h) => T.autoAllocate(h));
  T.startMap(run);
  launch(run);
  const m = run.mission;
  // Bo begins a turn, then drops: the table would wait for Bo
  const to = T.reachableWalk(m, m.heroes[1], 1, false)[0];
  assert.ok(T.execCommand(run, { op: 'walk', hero: 1, node: to }, [1]).ok);
  assert.equal(T.turnSeat(run), 1);
  assert.equal(T.holdSeat(run, 0), false, "the host's seat is the host's");
  assert.ok(T.holdSeat(run, 1));
  assert.equal(T.botKind(run, 1), 'hold');
  assert.ok(T.botMayPlay(run, 1), 'mid-turn, the AI finishes it at once');
  T.botStep(run);
  assert.notEqual(T.turnSeat(run), 1, "Bo's turn is over");
  assert.ok(T.releaseSeat(run, 1));
  assert.equal(T.isBot(run, 1), false, 'Bo is back');
  assert.equal(run.party.players[1].name, 'Bo', 'under their own name');
  // a seat the AI holds is plain data: it saves and loads back
  T.holdSeat(run, 1);
  assert.equal(T.botKind(T.deserializeRun(T.serializeRun(run)), 1), 'hold');
});

test('a person takes over a seat the AI fills, pilot and all', () => {
  const run = table(3);
  const pilot = run.heroes[2].id;
  assert.equal(T.takeOverSeat(run, 0, 'X'), false, "a person's seat is not the AI's to give");
  assert.ok(T.takeOverSeat(run, 2, 'Cy'));
  assert.deepEqual(run.party.players[2], { name: 'Cy', ai: false });
  assert.equal(run.heroes[2].id, pilot);
  assert.deepEqual(T.botSeats(run), [1]);
});

test('between missions the AI chooses its pilots’ upgrades, and the reward settles', () => {
  const run = table(3);
  launch(run);
  const m = run.mission;
  for (let g = 0; g < 40 && !m.over; g++) {
    T.smartHeroPhase(m, { only: T.heroesOf(run, 0) });
    T.execCommand(run, { op: 'ready' }, [0]);
    T.botStep(run);
  }
  T.missionRewards(run, m);
  T.applyMissionResult(run);
  if (run.phase !== 'reward' || run.lastReward.lifeline) return; // lost this one: nothing to choose
  T.botStep(run);
  const rw = run.lastReward;
  assert.ok(rw.picked[1] && rw.picked[2], 'the AI pilots have chosen');
  assert.equal(rw.picked[0], !rw.offers[0].length, "the person's choice is still theirs");
  assert.equal(T.botStep(run), 0, 'nothing more is due');
});

test('Full is the route it always was; Short has five stops: tier 1, three of tier 2, and the boss', () => {
  const plain = T.genTideMap(T.makeRng(42));
  assert.deepEqual(T.genTideMap(T.makeRng(42), 'full'), plain, 'Full is the same route');
  assert.equal(plain.rows.length, T.LENGTHS.full.stops);
  const short = T.genTideMap(T.makeRng(42), 'short');
  assert.equal(short.rows.length, T.LENGTHS.short.stops);
  const tiers = short.rows.map((r) => short.all[r[0]].tier);
  assert.deepEqual(tiers, [1, 2, 2, 2, 3]);
  assert.deepEqual(
    short.rows[4].map((id) => short.all[id].type),
    ['boss'],
  );
  for (const row of short.rows.slice(0, -1))
    for (const id of row) assert.ok(short.all[id].next.length, 'every stop leads on');
  assert.deepEqual(
    short.rows.map((r, i) => T.actOf(i, short)),
    [0, 1, 1, 1, 2],
    'each row is in the leg of its tier',
  );
  assert.deepEqual(
    plain.rows.map((r, i) => T.actOf(i, plain)),
    plain.rows.map((r, i) => T.actOf(i)),
    'on the Full route the legs are as before',
  );

  const run = table(2, { length: 'short' });
  assert.equal(run.length, 'short');
  assert.equal(run.map.rows.length, 5);
  assert.equal(T.setLength(run, 'full'), false, 'the length is set before the route opens');
  const back = T.deserializeRun(T.serializeRun(run));
  assert.equal(back.length, 'short');
});

test('a 2.82 save (version 18) loads as a Full expedition with people in every seat, and plays on', () => {
  const old = require('./fixtures/save-2.82.json');
  assert.equal(old.v, 18, 'the fixture is a version-18 save');
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.equal(run.length, 'full');
  assert.deepEqual(T.botSeats(run), []);
  assert.equal(T.botStep(run), 0, 'no AI plays');
  const m = run.mission;
  T.execCommand(run, { op: 'ready' }, [1]);
  T.execCommand(run, { op: 'ready' }, [2]);
  assert.ok(m.round > 1 || m.over, 'the round goes on');
});
