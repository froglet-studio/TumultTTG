'use strict';
/**
 * Roadmap F1. A mission is plain data: it can be copied, saved in the middle of a round and
 * resumed, and it plays on exactly as the original would. The board, the dice and the
 * opposition each draw from a random stream of their own, so a seed names a board whoever
 * plays it.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, ARCHETYPES } = require('../tools/harness');

const H = createHarness();
const { T } = H;

/** The i-th of an endless supply of different missions: every archetype and tier, pre-made and drafted squads. */
function mission(i) {
  const arch = ARCHETYPES[i % ARCHETYPES.length];
  const tier = arch === 'boss' ? 3 : 1 + (Math.floor(i / ARCHETYPES.length) % 3);
  const run = T.newRun(9000 + i);
  const a = i % 6;
  if (i % 4 === 3) H.draftedSquad(run);
  else H.prebuiltSquad(run, a, (a + 1 + (Math.floor(i / 6) % 5)) % 6);
  H.addProgression(run, tier);
  T.launchMission(run, arch, tier);
  return run;
}
/** Somewhere inside it: a few whole rounds, and for odd i the squad's half of the next one. */
function playInto(m, i) {
  for (let r = i % 5; r > 0 && !m.over; r--) {
    T.autoHeroPhase(m);
    if (!m.over) T.endHeroPhase(m);
  }
  if (i % 2 && !m.over) T.autoHeroPhase(m);
}
const logOf = (m) => m.log.map((l) => `[r${l.r}] ${l.text}`).join('\n');
/** The id of a first-row node that is a mission. */
const firstMission = (run) => run.map.rows[0].find((id) => T.MISSIONS[run.map.all[id].type]);
/** The run with its mission's squad unhooked: the mission plays the run's own heroes, the one link that is meant. */
const apart = (run) =>
  Object.assign({}, run, { mission: run.mission && Object.assign({}, run.mission, { heroes: null }) });
const state = (x) => JSON.stringify(x);

test('random streams: a stream is one number in plain state, and the generator is the one 2.0 had', () => {
  const r = T.makeRng(123);
  assert.deepEqual([r(), r(), r()], [0.7872516233474016, 0.1785435655619949, 0.49531551403924823]);
  assert.deepEqual(
    [r.int(1000), r.pick(['a', 'b', 'c', 'd']), r.shuffle([1, 2, 3, 4, 5]).join('')],
    [231, 'b', '12345'],
  );
  assert.equal(T.makeRng(0)(), 0.3588899802416563);

  // the same numbers come from a stream kept in someone's state…
  const holder = { dice: 123, other: 5 };
  const s = T.stream(holder, 'dice');
  const fresh = T.makeRng(123);
  for (let i = 0; i < 50; i++) assert.equal(s(), fresh());
  assert.equal(holder.other, 5, 'a stream touches only its own number');
  // …and that number is all there is to save: a copy of it carries on where the stream was
  const resumed = T.stream({ dice: holder.dice }, 'dice');
  for (let i = 0; i < 50; i++) assert.equal(resumed(), s());

  // sub-seeds: stable, different for different purposes, whole 32-bit numbers
  assert.equal(T.subSeed(7, 'dice'), T.subSeed(7, 'dice'));
  const seeds = ['dice', 'foes', 'board', 'map', 'squad', 'loot'].map((l) => T.subSeed(7, l));
  assert.equal(new Set(seeds).size, seeds.length);
  assert.notEqual(T.subSeed(7, 'dice'), T.subSeed(8, 'dice'));
  for (const x of seeds) assert.ok(Number.isInteger(x) && x >= 0 && x <= 0xffffffff);
});

test('T.clone copies plain data and refuses anything else', () => {
  const a = { n: 1, s: 'x', list: [1, { deep: [true, null] }], nothing: undefined };
  const b = T.clone(a);
  assert.deepEqual(b, a);
  b.list[1].deep.push(9);
  assert.equal(a.list[1].deep.length, 2, 'the copy shares nothing with the original');
  assert.ok('nothing' in b);
  assert.throws(() => T.clone({ fn() {} }), /function/);
  assert.throws(() => T.clone({ when: new Date() }), /plain/);
});

test('mission state is plain data, with nothing shared between two places', () => {
  for (let i = 0; i < 96; i++) {
    const run = mission(i);
    playInto(run.mission, i);
    const where = `mission ${i} (${run.mission.archetype} t${run.mission.tier})`;
    assert.deepEqual(H.plainProblems(run.mission), [], where);
    // the run as a whole too. The mission plays the run's own heroes: the one link that is meant.
    assert.equal(run.mission.heroes, run.heroes);
    assert.deepEqual(H.plainProblems(apart(run)), [], where + ', the run');
  }
});

test('a copy of a mission plays on exactly as the original does — 1,000 missions', () => {
  for (let i = 0; i < 1000; i++) {
    const m = mission(i).mission;
    playInto(m, i);
    const copy = T.clone(m);
    const before = state(m);
    assert.equal(state(copy), before);
    H.playMission(copy);
    if (state(m) !== before) assert.fail(`mission ${i}: playing the copy changed the original`);
    H.playMission(m);
    if (logOf(copy) !== logOf(m)) assert.fail(`mission ${i} (${m.archetype} t${m.tier}): the copy's log differs`);
    if (state(copy) !== state(m)) assert.fail(`mission ${i} (${m.archetype} t${m.tier}): the copy ended elsewhere`);
  }
});

test('the same seed is the same board, whoever plays it', () => {
  const board = (m) =>
    state({
      title: m.title,
      nodes: m.board.nodes,
      edges: m.board.edges,
      climb: m.board.climb,
      objective: m.objective,
      clock: m.clock,
      spawns: m.spawns,
      foes: m.enemies.map((e) => [e.uid, e.type, e.pos, e.hp, e.shield]),
      starts: m.heroes.map((h) => h.pos),
    });
  let distinct = 0;
  for (const arch of ARCHETYPES) {
    for (const tier of arch === 'boss' ? [3] : [1, 2, 3]) {
      for (const seed of [11, 12]) {
        const plain = T.newRun(seed);
        H.prebuiltSquad(plain, 0, 1);
        T.launchMission(plain, arch, tier);
        // another squad entirely, built with a great many more draws
        const other = T.newRun(seed);
        H.draftedSquad(other);
        H.addProgression(other, 2);
        T.runStream(other, 'squad').shuffle([1, 2, 3, 4, 5, 6, 7]);
        T.launchMission(other, arch, tier);
        assert.equal(board(other.mission), board(plain.mission), `${arch} t${tier} seed ${seed}`);
        assert.deepEqual(other.mission.rngs, plain.mission.rngs, 'the same dice and opposition to come');
      }
      const s11 = T.newRun(11);
      const s12 = T.newRun(12);
      for (const r of [s11, s12]) {
        H.prebuiltSquad(r, 0, 1);
        T.launchMission(r, arch, tier);
      }
      if (board(s11.mission) !== board(s12.mission)) distinct++;
    }
  }
  assert.ok(distinct >= 14, `another seed is another board (${distinct} of 16 differed)`);

  // on the Tide Map a node's mission belongs to the node, not to the road taken to it
  const viaMap = (seed, squad) => {
    const run = T.newRun(seed);
    squad(run);
    T.startMap(run);
    T.chooseNode(run, firstMission(run));
    return board(run.mission);
  };
  assert.equal(
    viaMap(31, (r) => H.prebuiltSquad(r, 2, 3)),
    viaMap(31, (r) => H.draftedSquad(r)),
  );
});

test('dice and opposition draw from streams of their own', () => {
  const run = T.newRun(77);
  H.prebuiltSquad(run, 0, 1);
  T.launchMission(run, 'swarm', 2);
  const m = run.mission;
  const twin = T.clone(m);
  // one squad rerolls its dice a dozen times; the other leaves them alone
  for (let i = 0; i < 12; i++) T.rerollHeld(twin, twin.heroes[0], [0, 1, 2]);
  assert.notEqual(twin.rngs.dice, m.rngs.dice);
  assert.equal(twin.rngs.foes, m.rngs.foes);
  // neither squad acts. What arrives, and where it goes, is the same for both
  for (let r = 0; r < 6; r++) {
    T.endHeroPhase(m);
    T.endHeroPhase(twin);
  }
  assert.ok(
    m.enemies.some((e) => e.spawned),
    'the swarm sent reinforcements',
  );
  assert.equal(state(twin.enemies), state(m.enemies));
  assert.equal(twin.rngs.foes, m.rngs.foes);
});

test('a run saved in the middle of a round resumes exactly, and saving costs nothing', () => {
  for (let i = 0; i < 24; i++) {
    const run = T.newRun(600 + i);
    if (i % 3 === 2) H.draftedSquad(run);
    else H.prebuiltSquad(run, i % 6, (i + 2) % 6);
    T.startMap(run);
    T.chooseNode(run, firstMission(run));
    playInto(run.mission, i + 1);
    assert.deepEqual(H.plainProblems(apart(run)), [], `run ${i} is plain data`);

    const saved = T.serializeRun(run);
    assert.equal(T.serializeRun(run), saved, 'saving twice writes the same thing: it draws no random number');
    assert.equal(JSON.parse(saved).v, T.SAVE_VERSION);
    const back = T.deserializeRun(saved);
    assert.equal(back.mission.heroes, back.heroes, 'the resumed mission plays the run’s own heroes');
    assert.equal(T.serializeRun(back), saved, 'a save round trip changes nothing');

    // both play on: the mission, its rewards, and the next node on the map
    for (const r of [run, back]) {
      H.playMission(r.mission);
      r.ending = logOf(r.mission);
      T.missionRewards(r, r.mission);
      T.applyMissionResult(r);
      if (!r.over) {
        if (r.lastReward.offer.length) T.skipOfferedCard(r);
        T.finishNode(r);
        const next = r.available.find((id) => T.MISSIONS[r.map.all[id].type]);
        if (next != null) T.chooseNode(r, next);
      }
    }
    assert.equal(back.ending, run.ending, `run ${i}: the resumed mission ended differently`);
    assert.equal(T.serializeRun(back), T.serializeRun(run), `run ${i}: the runs parted ways afterwards`);
  }
});

test('a finished mission leaves the run; what the reward screen shows is kept with the reward', () => {
  const run = mission(1);
  const m = run.mission;
  H.playMission(m);
  T.missionRewards(run, m);
  T.applyMissionResult(run);
  assert.equal(run.mission, null);
  assert.deepEqual([run.lastReward.rounds, run.lastReward.kills], [m.round, m.stats.kills]);
  assert.deepEqual(H.plainProblems(run), []);
  // crystals and the once-a-run Second Wind are the mission's while it lasts, and come home with it
  const purse = mission(2);
  purse.mission.crystals += 5;
  purse.mission.secondWindUsed = true;
  const had = purse.crystals;
  Object.assign(purse.mission, { over: true, won: false, lost: true });
  T.missionRewards(purse, purse.mission);
  T.applyMissionResult(purse);
  assert.equal(purse.crystals, had + 5, 'salvage is kept even when the mission is lost');
  assert.equal(purse.secondWindUsed, true);
});

test('whole runs played through a save at every node end the same way', () => {
  for (let i = 0; i < 6; i++) {
    const squad = (run) => (i % 2 ? H.draftedSquad(run) : H.prebuiltSquad(run, i % 6, (i + 3) % 6));
    const straight = T.newRun(7000 + i);
    squad(straight);
    const a = H.playRun(straight);
    const saved = T.newRun(7000 + i);
    squad(saved);
    const b = H.playRun(saved, { viaSaves: true });
    assert.deepEqual(
      [b.won, b.lastRow, b.missions, b.missionWins, b.endedBy],
      [a.won, a.lastRow, a.missions, a.missionWins, a.endedBy],
      `run ${i}`,
    );
    assert.equal(T.serializeRun(b.run), T.serializeRun(a.run), `run ${i}: the final states differ`);
  }
});

test('a save from 2.0 still loads, and its Tide can be finished', () => {
  const old = require('./fixtures/save-2.0.json');
  for (const key of ['inMission', 'onMap']) {
    assert.equal(old[key].v, undefined, 'the fixture is a 2.0 save');
    const run = T.deserializeRun(JSON.stringify(old[key]));
    assert.equal(run.v, T.SAVE_VERSION);
    assert.deepEqual([run.phase, run.mission], ['map', null], '2.0 never kept a mission: back to the map');
    assert.deepEqual(
      [run.seed, run.crystals, run.heroes.map((h) => h.cards.join())],
      [old[key].seed, old[key].crystals, old[key].heroes.map((h) => h.cards.join())],
    );
    assert.ok(run.available.length && run.available.every((id) => run.map.all[id]));
    assert.deepEqual(H.plainProblems(run), []);
    H.playRun(run);
    assert.ok(run.over, `${key}: the Tide plays out`);
  }
  assert.throws(() => T.deserializeRun(JSON.stringify({ v: T.SAVE_VERSION + 1, seed: 1 })), /newer/);
});

test('a save from 2.6 (mid-mission, before tides) loads on the rising tide and plays on', () => {
  const old = require('./fixtures/save-2.6.json');
  assert.equal(old.v, 2, 'the fixture is a version-2 save');
  assert.equal(old.tide, undefined);
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.equal(run.tide, 'rising');
  assert.equal(run.phase, 'mission');
  assert.equal(run.mission.round, old.mission.round, 'the mission carries on where it was');
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run), 'it saves again unchanged');
  H.playRun(run);
  assert.ok(run.over, 'the Tide plays out');
});
