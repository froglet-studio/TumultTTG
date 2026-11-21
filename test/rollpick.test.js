'use strict';
/**
 * Choosing which dice to roll (2.82; Garrett, 2026-11-20: "when players roll dice, they should be able to select
 * which ones they roll from their pool"). The choice stays until changed; dice not chosen are drawn at random.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();
const { createHarness } = require('../tools/harness');
const H = createHarness(T);

const total = (h) => h.pool + h.held.length;
const kindsRolled = (h, n) => h.heldDie.slice(-n);
/** A mission whose first pilot carries two element dice, with its bank emptied back into the pool. */
function setUp(seed) {
  const run = T.quickMission({ seed, type: 'vault', tier: 1 });
  const m = run.mission;
  for (const h of m.heroes) while (h.held.length) T.dump(m, h, 0);
  return { run, m, h: m.heroes[0] };
}

test('the chosen dice are the ones rolled; the rest are drawn at random; fifteen always', () => {
  const { m, h } = setUp(3);
  const el = T.diceSet(h).filter((k) => k !== 'plain');
  assert.ok(el.length >= 2, 'the pilot has element dice to choose');
  assert.deepEqual(T.setRollPick(h, [el[0], el[1]]).pick, [el[0], el[1]]);
  T.rollDice(m, h);
  assert.deepEqual(kindsRolled(h, 4).slice(0, 2), [el[0], el[1]], 'the two chosen dice are rolled first');
  assert.equal(total(h), T.RULES.POOL);
  assert.deepEqual(h.rollPick, [el[0], el[1]], 'and stay chosen for the next roll');
  // both are banked now: the next roll draws in their place at random
  assert.deepEqual(T.rollPickNow(h), []);
  T.rollDice(m, h);
  assert.equal(total(h), T.RULES.POOL);
  assert.equal(h.held.length, 8);
});

test("only a pilot's own dice can be chosen, never more than a roll", () => {
  const { h } = setUp(3);
  const set = T.diceSet(h);
  const el = set.find((k) => k !== 'plain');
  const n = set.filter((k) => k === el).length;
  const r = T.setRollPick(h, [el, el, el, el, 'eth', 'nonsense', 'plain']);
  assert.equal(r.pick.filter((k) => k === el).length, n, 'no more of a kind than the pilot has');
  assert.ok(!r.pick.includes('eth') && !r.pick.includes('nonsense'));
  assert.ok(r.pick.length <= T.RULES.ROLL);
  T.setRollPick(h, ['plain', 'plain', 'plain', 'plain', 'plain']);
  assert.equal(h.rollPick.length, T.RULES.ROLL);
  T.setRollPick(h, []);
  assert.equal(h.rollPick, undefined, 'choosing none draws at random, as before');
});

test('with nothing chosen the roll is the one 2.81 rolled', () => {
  const a = setUp(5);
  const b = setUp(5);
  T.setRollPick(b.h, []);
  assert.deepEqual(T.rollDice(a.m, a.h), T.rollDice(b.m, b.h));
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
    assert.equal(T.execCommand(run, { op: 'rollPick', hero: 0, kinds: ['plain'] }, [1]).ok, false, 'not for another');
    assert.ok(T.execCommand(run, { op: 'rollPick', hero: 1, kinds: ['plain', 'plain'] }, [1]).ok, rounds);
    assert.deepEqual(m.heroes[1].rollPick, ['plain', 'plain']);
    // the guest's roll takes the plain dice: at the end of their turn (turns), or as the round begins (live)
    const b = m.heroes[1];
    const before = b.held.length;
    T.execCommand(run, { op: 'ready' }, [0]);
    T.execCommand(run, { op: 'ready' }, [1]);
    if (m.over) continue;
    const rolled = b.heldDie.slice(before, before + 2);
    assert.deepEqual(rolled, ['plain', 'plain'], rounds + ': the chosen dice were rolled');
    assert.equal(total(b), T.RULES.POOL);
  }
});

test('the simulated players choose their dice too, and a mission plays out', () => {
  const run = T.quickMission({ seed: 4, type: 'swarm', tier: 2 });
  const m = run.mission;
  T.autoHeroPhase(m);
  assert.ok(
    m.heroes.every((h) => h.downed || Array.isArray(h.rollPick)),
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
  assert.ok(T.execCommand(run, { op: 'rollPick', hero: 1, kinds: ['plain'] }, [1]).ok);
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run), 'a choice saves too');
  T.execCommand(run, { op: 'ready' }, [1]);
  assert.ok(H.playMission(run.mission).over);
});
