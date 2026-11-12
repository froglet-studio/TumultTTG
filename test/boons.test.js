'use strict';
/**
 * Boons do what their text says, by the numbers in their data: the engine acts on a boon's
 * `hook` and `val`, never on its id, so editing the table changes the game.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;
const val = (id) => T.BOON_BY[id].val;

/** A tier-1 mission whose first hero has held these boons since before it began. */
function withBoons(ids, archetype = 'swarm') {
  const run = T.newRun(5);
  H.prebuiltSquad(run, 0, 1);
  run.heroes[0].boons = ids.slice();
  T.launchMission(run, archetype, 1);
  const m = run.mission;
  const e = m.enemies[0];
  Object.assign(e, { hp: 60, maxHp: 60, shield: 0, baseShield: 0, states: {} });
  return { run, m, h: m.heroes[0], ally: m.heroes[1], e };
}
/** The same, with that one foe left alone on the board so rounds can pass quietly. */
function quiet(ids) {
  const s = withBoons(ids);
  s.m.enemies = [s.e];
  s.m.spawns = [];
  s.e.pos = Object.keys(s.m.board.nodes)
    .map(Number)
    .filter((n) => !T.occupied(s.m, n) || n === s.e.pos)
    .sort((a, b) => B.dist(s.m.board, b, s.h.pos, true) - B.dist(s.m.board, a, s.h.pos, true))[0];
  return s;
}
const strike = ({ m, h, e }, dmg = 3) => {
  const before = e.hp;
  T.runEffects(m, h, [{ v: 'strike', kind: 'melee', dmg }], { P: 0, E: 0, target: e.uid });
  return before - e.hp;
};

test('every boon hangs on a hook the engine acts on, and its text carries its number', () => {
  for (const b of T.BOONS) {
    assert.ok(T.BOON_HOOKS.includes(b.hook), `${b.id}: the engine has no hook "${b.hook}"`);
    const numbers = typeof b.val === 'number' ? [b.val] : Object.values(b.val).filter((v) => typeof v === 'number');
    for (const n of numbers) assert.ok(b.desc.includes(String(n)), `${b.id}: text does not mention ${n}`);
  }
});

test('Momentum: the first strike each round deals more — every round, and only a strike spends it', () => {
  const s = quiet(['momentum']);
  assert.equal(strike(s), 3 + val('momentum'), 'first strike of round 1');
  assert.equal(strike(s), 3, 'second strike of round 1');
  T.runEffects(s.m, s.h, [{ v: 'dot', val: 1, dur: 5, kind: 'corrode' }], { P: 0, E: 0, target: s.e.uid });
  T.endHeroPhase(s.m);
  const before = s.e.hp;
  T.endHeroPhase(s.m); // a whole round with no strike: only the corrosion ticks
  assert.equal(before - s.e.hp, 1, 'the tick is not a strike');
  assert.equal(strike(s), 3 + val('momentum'), 'first strike of round 3');
});

test('Quick Hands: cards played in round 1 come home a column sooner', () => {
  const home = (ids) => {
    const { m, h } = quiet(ids);
    h.track = [];
    T.commit(h, h.cards[0], 0, 3, '');
    let rounds = 0;
    while (!T.inHand(h, h.cards[0])) {
      T.endHeroPhase(m);
      rounds++;
    }
    return rounds;
  };
  assert.equal(home([]), 3);
  assert.equal(home(['quickhands']), 3 - val('quickhands').hasten);
});

test('Tide-touched: one die is already banked as Omni when the mission starts', () => {
  const run = T.newRun(5);
  H.prebuiltSquad(run, 0, 1);
  run.heroes[0].boons = ['tidetouched'];
  // look before the first roll: launchMission rolls, so count what the roll cannot explain
  T.launchMission(run, 'swarm', 1);
  const h = run.mission.heroes[0];
  assert.equal(h.held.length, T.RULES.ROLL + 1, 'three rolled and one banked');
  assert.ok(h.held.includes(val('tidetouched').bank));
  assert.equal(h.pool + h.held.length, T.RULES.POOL, 'still fifteen dice');
});

test('Thick Hide: every Shield its holder gains is larger', () => {
  const plain = withBoons([]);
  const thick = withBoons(['thickhide']);
  for (const s of [plain, thick]) T.runEffects(s.m, s.h, [{ v: 'shield', val: 2, dur: 1 }], { P: 0, E: 0 });
  assert.equal(plain.h.states.Shield.v, 2);
  assert.equal(thick.h.states.Shield.v, 2 + val('thickhide'));
});

test('Keen Sense: reveals reach further, and a Hidden foe beside the holder is seen at round start', () => {
  const reach = (ids) => {
    const s = quiet(ids);
    s.e.states.Hidden = { t: 9 };
    const d = B.dist(s.m.board, s.h.pos, s.e.pos, true);
    T.runEffects(s.m, s.h, [{ v: 'reveal', radius: d - 1, dur: 1 }], { P: 0, E: 0 });
    return !s.e.states.Hidden;
  };
  assert.equal(reach([]), false, 'one node out of reach');
  assert.equal(reach(['keensense']), val('keensense') >= 1, 'in reach with Keen Sense');

  const s = quiet(['keensense']);
  s.e.pos = B.walkNeighbors(s.m.board, s.h.pos).find((n) => !T.occupied(s.m, n));
  s.e.states.Hidden = { t: 9 };
  T.heroTurnStart(s.m, s.h);
  assert.equal(s.e.states.Hidden, undefined);
});

test('Deep Pockets and Studious: more ◇ and more UP after every mission', () => {
  const rewards = (ids) => {
    const { run, m } = withBoons(ids);
    m.won = true;
    T.missionRewards(run, m);
    return run.lastReward;
  };
  const base = rewards([]);
  assert.equal(rewards(['deeppockets']).crystals, base.crystals + val('deeppockets').crystals);
  assert.equal(rewards(['studious']).up, base.up + val('studious').up);
});

test('Second Wind: its holder rises once per run instead of going down', () => {
  const { m, h, ally, e } = withBoons(['secondwind']);
  T.damage(m, e, ally, 99, { kind: 'true', trueDmg: true });
  assert.equal(ally.downed, true, 'it is the holder’s boon, not the squad’s');
  T.damage(m, e, h, 99, { kind: 'true', trueDmg: true });
  assert.equal(h.downed, false);
  assert.equal(h.hp, val('secondwind'));
  T.damage(m, e, h, 99, { kind: 'true', trueDmg: true });
  assert.equal(h.downed, true, 'only once');
});

test('Anchor Soul: its holder cannot be pulled, and can still be pushed', () => {
  const far = (s) => {
    s.e.pos = Object.keys(s.m.board.nodes)
      .map(Number)
      .filter((n) => !T.occupied(s.m, n) && B.dist(s.m.board, n, s.h.pos, true) === 2)[0];
    return s;
  };
  const plain = far(withBoons([]));
  const soul = far(withBoons(['anchorsoul']));
  assert.ok(T.pullToward(plain.m, plain.e, plain.h, 1) > 0, 'the comparison hero is dragged');
  assert.equal(T.pullToward(soul.m, soul.e, soul.h, 1), 0);
  const beside = withBoons(['anchorsoul']);
  beside.e.pos = B.walkNeighbors(beside.m.board, beside.h.pos).find((n) => !T.occupied(beside.m, n));
  assert.ok(T.pushAway(beside.m, beside.e, beside.h, 1) > 0, 'a shove still moves them');
});

test('Affinities: one AP face of the holder’s dice becomes the etherion', () => {
  const count = (faces, f) => faces.filter((x) => x === f).length;
  const base = T.RULES.FACES;
  for (const id of ['aff_M', 'aff_C', 'aff_S', 'aff_T', 'omnicore']) {
    const faces = T.heroFaces({ boons: [id] });
    assert.equal(faces.length, base.length);
    assert.equal(count(faces, val(id)), count(base, val(id)) + 1, id);
    assert.equal(count(faces, 'AP'), count(base, 'AP') - 1, id);
  }
});

test('Defiant: more damage against Elites and the Heart, and no one else', () => {
  const s = quiet(['defiant']);
  assert.equal(strike(s), 3, 'an ordinary foe');
  s.e.elite = true;
  assert.equal(strike(s), 3 + val('defiant'));
  s.e.elite = false;
  s.e.boss = true;
  assert.equal(strike(s), 3 + val('defiant'));
});
