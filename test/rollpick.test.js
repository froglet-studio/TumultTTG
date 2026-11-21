'use strict';
/**
 * What a pilot rolls (2.83; Garrett, 2026-11-21: "instead of picking your dice it should be 3 ap dice and 1
 * element of your choice"): ROLL − ROLL_EL plain dice and ROLL_EL element die of the player's choice, chosen
 * from the pilot's own element dice. The choice stays until changed.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();
const { createHarness } = require('../tools/harness');
const H = createHarness(T);

const total = (h) => h.pool + h.held.length;
const kindsRolled = (h, n) => h.heldDie.slice(-n);
const count = (arr, k) => arr.filter((x) => x === k).length;
/** A mission whose first pilot carries two element dice, with its bank emptied back into the pool. */
function setUp(seed) {
  const run = T.quickMission({ seed, type: 'vault', tier: 1 });
  const m = run.mission;
  for (const h of m.heroes) while (h.held.length) T.dump(m, h, 0);
  return { run, m, h: m.heroes[0] };
}
const elDice = (h) => [...new Set(T.diceSet(h).filter((k) => k !== 'plain'))];

test('a roll is three plain dice and the element die chosen; fifteen always', () => {
  assert.equal(T.RULES.ROLL, 4);
  assert.equal(T.RULES.ROLL_EL, 1);
  const { m, h } = setUp(3);
  const el = elDice(h);
  assert.ok(el.length >= 1, 'the pilot has element dice to choose');
  const k = el[el.length - 1];
  assert.deepEqual(T.setRollPick(h, [k]).pick, [k]);
  T.rollDice(m, h);
  const rolled = kindsRolled(h, 4);
  assert.equal(count(rolled, 'plain'), 3, 'three AP dice');
  assert.equal(count(rolled, k), 1, 'and the chosen element die');
  assert.equal(total(h), T.RULES.POOL);
  assert.deepEqual(h.rollPick, [k], 'the choice stays for the next roll');
});

test("with nothing chosen, or the chosen kind all banked, the pool's commonest element die is rolled", () => {
  const { m, h } = setUp(3);
  T.setRollPick(h, []);
  assert.equal(h.rollPick, undefined);
  const now = T.rollPickNow(h);
  assert.equal(now.length, 1);
  assert.notEqual(now[0], 'plain');
  T.rollDice(m, h);
  assert.equal(count(kindsRolled(h, 4), 'plain'), 3);
  // every element die banked: the whole roll is plain
  let guard = 0;
  while (T.poolDice(h).some((k) => k !== 'plain') && guard++ < 20) T.rollDice(m, h);
  if (h.pool >= 4) {
    assert.deepEqual(T.rollPickNow(h), []);
    T.rollDice(m, h);
    assert.equal(count(kindsRolled(h, 4), 'plain'), 4);
  }
  assert.equal(total(h), T.RULES.POOL);
});

test("only one of a pilot's own element dice can be chosen", () => {
  const { h } = setUp(3);
  const el = elDice(h);
  const r = T.setRollPick(h, ['plain', 'nonsense', 'eth', ...el]);
  assert.equal(r.pick.length, 1);
  assert.ok(el.includes(r.pick[0]));
  assert.equal(T.setRollPick(h, ['plain']).pick.length, 0, 'plain dice are never chosen: the rest of a roll is plain');
});

test('a player chooses for their own pilot, on anyone’s turn, in either way to play', () => {
  for (const rounds of ['turns', 'live']) {
    const run = T.quickMission({ seed: 9, type: 'vault', tier: 1 });
    run.party = T.newParty(2);
    run.party.rounds = rounds;
    const m = run.mission;
    if (rounds === 'turns') {
      assert.ok(T.execCommand(run, { op: 'dump', hero: 0, di: 0 }, [0]).ok, 'the host begins their turn');
      assert.equal(T.turnSeat(run), 0);
    }
    assert.equal(
      T.execCommand(run, { op: 'rollPick', hero: 0, kinds: elDice(run.mission.heroes[0]) }, [1]).ok,
      false,
      'not for another',
    );
    const b = m.heroes[1];
    const k = elDice(b)[elDice(b).length - 1];
    assert.ok(T.execCommand(run, { op: 'rollPick', hero: 1, kinds: [k] }, [1]).ok, rounds);
    assert.deepEqual(b.rollPick, [k]);
    // the guest's roll takes it: at the end of their turn (turns), or as the round begins (live)
    const before = b.held.length;
    T.execCommand(run, { op: 'ready' }, [0]);
    T.execCommand(run, { op: 'ready' }, [1]);
    if (m.over) continue;
    const rolled = b.heldDie.slice(before, before + 4);
    if (T.poolDice(b).length + rolled.length >= 4 && rolled.length === 4)
      assert.equal(count(rolled, 'plain'), 3, rounds + ': three plain dice');
    assert.equal(total(b), T.RULES.POOL);
  }
});

test('the simulated players choose their element die too, and a mission plays out', () => {
  const run = T.quickMission({ seed: 4, type: 'swarm', tier: 2 });
  const m = run.mission;
  T.autoHeroPhase(m);
  assert.ok(
    m.heroes.every((h) => h.downed || !elDice(h).length || Array.isArray(h.rollPick)),
    'each standing pilot has chosen',
  );
  assert.ok(H.playMission(m).over);
});

test('a 2.81 save loads with nothing chosen, plays on, and saves again unchanged', () => {
  const old = require('./fixtures/save-2.81.json');
  assert.equal(old.v, 18, 'the fixture is a version-18 save');
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.equal(run.party.rounds, 'live');
  assert.ok(run.mission.heroes.every((h) => h.rollPick === undefined));
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run));
  assert.ok(T.execCommand(run, { op: 'rollPick', hero: 1, kinds: elDice(run.mission.heroes[1]) }, [1]).ok);
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run), 'a choice saves too');
  T.execCommand(run, { op: 'ready' }, [1]);
  assert.ok(H.playMission(run.mission).over);
});
