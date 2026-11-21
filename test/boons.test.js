'use strict';
/**
 * Gear passives (2.89: what boons did) do what their text says, by the numbers in their data: the engine acts on
 * a passive's `hook` and `val`, never on the gear's id, so editing the table changes the game.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;
const val = (id) => T.GEAR_BY[id].passive.val;

/** A tier-1 mission whose first hero has worn this gear (and only this) since before it began. */
function withBoons(ids, archetype = 'swarm') {
  const run = T.newRun(5);
  H.prebuiltSquad(run, 0, 1);
  run.heroes.forEach((h) => (h.gear = []));
  run.heroes[0].gear = ids.map((id) => ({ id, cds: [0, 0] }));
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

test('every gear has a passive on a hook the engine acts on, and two actives; the boons and consumables are gone', () => {
  assert.equal(T.BOONS.length, 0);
  assert.equal(T.CONSUMABLES.length, 0);
  for (const g of T.GEAR) {
    assert.ok(g.passive, `${g.id}: a passive`);
    assert.ok(T.BOON_HOOKS.includes(g.passive.hook), `${g.id}: the engine has no hook "${g.passive.hook}"`);
    const v = g.passive.val;
    const numbers =
      typeof v === 'number' ? [v] : typeof v === 'object' ? Object.values(v).filter((x) => typeof x === 'number') : [];
    for (const n of numbers) assert.ok(g.passive.txt.includes(String(n)), `${g.id}: text does not mention ${n}`);
    assert.equal(g.abilities.length, 2, `${g.id}: two actives`);
  }
  // two weapons share the hook, never the passive: each adds to strikes of its own reach (2.101)
  const passives = new Set(T.GEAR.map((g) => g.passive.hook + JSON.stringify(g.passive.val)));
  assert.equal(passives.size, T.GEAR.length, 'no two pieces share a passive');
});

test('tech never strikes a unit directly: a gear strike goes through a Field', () => {
  for (const g of T.GEAR)
    for (const a of g.abilities) for (const x of a.fx) assert.notEqual(x.v, 'strike', `${g.id} ${a.n}`);
});

test('Chrono-shim: cards played in round 1 come home a column sooner', () => {
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
  assert.equal(home(['chronoshim']), 3 - val('chronoshim').hasten);
});

test('Capacitor: one die is already banked as Omni when the mission starts', () => {
  const run = T.newRun(5);
  H.prebuiltSquad(run, 0, 1);
  run.heroes.forEach((h) => (h.gear = []));
  run.heroes[0].gear = [{ id: 'capacitor', cds: [0, 0] }];
  // look before the first roll: launchMission rolls, so count what the roll cannot explain
  T.launchMission(run, 'swarm', 1);
  const h = run.mission.heroes[0];
  assert.equal(h.held.length, T.RULES.ROLL + 1, 'three rolled and one banked');
  assert.ok(h.held.includes(val('capacitor').bank));
  assert.equal(h.pool + h.held.length, T.RULES.POOL, 'still fifteen dice');
});

test('Aegis Plate: every Shield its holder gains is larger', () => {
  const plain = withBoons([]);
  const thick = withBoons(['aegis']);
  for (const s of [plain, thick]) T.runEffects(s.m, s.h, [{ v: 'shield', val: 2, dur: 1 }], { P: 0, E: 0 });
  assert.equal(plain.h.states.Shield.v, 2);
  assert.equal(thick.h.states.Shield.v, 2 + val('aegis'));
});

test('Scope: reveals reach further, and a Hidden foe beside the holder is seen at round start', () => {
  const reach = (ids) => {
    const s = quiet(ids);
    s.e.states.Hidden = { t: 9 };
    const d = B.dist(s.m.board, s.h.pos, s.e.pos, true);
    T.runEffects(s.m, s.h, [{ v: 'reveal', radius: d - 1, dur: 1 }], { P: 0, E: 0 });
    return !s.e.states.Hidden;
  };
  assert.equal(reach([]), false, 'one node out of reach');
  assert.equal(reach(['scope']), val('scope') >= 1, 'in reach with the Scope');

  const s = quiet(['scope']);
  s.e.pos = B.walkNeighbors(s.m.board, s.h.pos).find((n) => !T.occupied(s.m, n));
  s.e.states.Hidden = { t: 9 };
  T.heroTurnStart(s.m, s.h);
  assert.equal(s.e.states.Hidden, undefined);
});

test('Medkit: its wearer rises once a mission instead of going down', () => {
  const { m, h, ally, e } = withBoons(['medkit']);
  T.damage(m, e, ally, 99, { kind: 'true', trueDmg: true });
  assert.equal(ally.downed, true, 'it is the wearer’s gear, not the squad’s');
  T.damage(m, e, h, 99, { kind: 'true', trueDmg: true });
  assert.equal(h.downed, false);
  assert.equal(h.hp, val('medkit'));
  T.damage(m, e, h, 99, { kind: 'true', trueDmg: true });
  assert.equal(h.downed, true, 'only once');
});

test('Climbing Rig: its holder cannot be pulled, and can still be pushed', () => {
  const far = (s) => {
    s.e.pos = Object.keys(s.m.board.nodes)
      .map(Number)
      .filter((n) => !T.occupied(s.m, n) && B.dist(s.m.board, n, s.h.pos, true) === 2)[0];
    return s;
  };
  const plain = far(withBoons([]));
  const soul = far(withBoons(['climbrig']));
  assert.ok(T.pullToward(plain.m, plain.e, plain.h, 1) > 0, 'the comparison hero is dragged');
  assert.equal(T.pullToward(soul.m, soul.e, soul.h, 1), 0);
  const beside = withBoons(['climbrig']);
  beside.e.pos = B.walkNeighbors(beside.m.board, beside.h.pos).find((n) => !T.occupied(beside.m, n));
  assert.ok(T.pushAway(beside.m, beside.e, beside.h, 1) > 0, 'a shove still moves them');
});

test('Phase-brace: blinks reach 1 further', () => {
  const reach = (ids) => {
    const { m, h } = withBoons(ids);
    const before = h.pos;
    const far = Object.keys(m.board.nodes)
      .map(Number)
      .find((n) => !T.occupied(m, n) && !m.board.nodes[n].height && B.dist(m.board, before, n, true) === 3);
    if (far == null) return null;
    T.runEffects(m, h, [{ v: 'blink', reach: 2 }], { P: 0, E: 0, node: far });
    return h.pos === far;
  };
  const plain = reach([]);
  if (plain === null) return;
  assert.equal(plain, false, 'reach 2 does not get there');
  assert.equal(reach(['phasebrace']), true, 'reach 2 + 1 does');
});

test('Storm Lantern: a foe beside the wearer is Marked as its turn begins', () => {
  const s = quiet(['lantern']);
  s.e.pos = B.walkNeighbors(s.m.board, s.h.pos).find((n) => !T.occupied(s.m, n));
  T.heroTurnStart(s.m, s.h);
  assert.ok(s.e.states.Marked);
});

test('Turret and Winch: Fields last a round longer, and pull 1 further', () => {
  const lay = (ids, f) => {
    const s = quiet(ids);
    T.runEffects(s.m, s.h, [f], { P: 0, E: 0, node: s.h.pos });
    return s;
  };
  const f = { v: 'field', on: 'end', dur: 2, fx: [{ kw: 'weaken', n: 1 }] };
  assert.equal(lay([], f).m.fields[0].t, 2);
  assert.equal(lay(['harpoon'], f).m.fields[0].t, 3);
  const pull = (ids) => {
    const s = quiet(ids);
    const node = B.walkNeighbors(s.m.board, s.e.pos).find((n) => !T.occupied(s.m, n));
    T.runEffects(s.m, s.h, [{ v: 'field', on: 'enter', trips: 1, fx: [{ kw: 'pull', n: 1 }] }], { P: 0, E: 0, node });
    const d0 = B.dist(s.m.board, s.h.pos, node, true);
    T.moveEntity(s.m, s.e, node, 'walk');
    return d0 - B.dist(s.m.board, s.h.pos, s.e.pos, true);
  };
  assert.ok(pull(['grapnel']) >= pull([]), 'the Winch pulls at least as far');
});

test('a 2.88 save refunds its boons (3 ◇ each) and consumables (their price), and passes the boon on offer', () => {
  const old = require('./fixtures/save-2.88.json');
  assert.equal(old.v, 21, 'the fixture is a version-21 save');
  const before = old.purses.reduce((a, b) => a + b, 0);
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.ok(run.heroes.every((h) => !h.boons.length && !h.consumables.length));
  assert.equal(
    run.purses.reduce((a, b) => a + b, 0),
    before + 2 * 3 + 2 + 2,
  );
  assert.equal(run.lastReward.boons, null);
  assert.ok(run.lastReward.boonPicked.every(Boolean));
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run));
  run.heroes.forEach((h, i) => run.lastReward.picked[i] || T.skipOfferedCard(run, i));
  assert.ok(T.rewardSettled(run.lastReward), 'with the traits passed, the reward is settled');
});

/* ── Weapons (2.101) ── */
const shoot = ({ m, h, e }, kind, dmg = 3) => {
  const before = e.hp;
  T.runEffects(m, h, [{ v: 'strike', kind, dmg }], { P: 0, E: 0, target: e.uid });
  return before - e.hp;
};
const near = (s) => {
  // the foe beside the pilot and in its zone, so a melee and a ranged strike both reach it
  const n = B.walkNeighbors(s.m.board, s.h.pos).find((x) => !T.occupied(s.m, x) && B.los(s.m.board, s.h.pos, x));
  s.e.pos = n;
  return s;
};

test('weapons: each adds its number to every strike of its reach, and to no other', () => {
  const plain = near(withBoons([]));
  const baton = near(withBoons(['baton']));
  const rifle = near(withBoons(['coilgun']));
  const n = (id) => val(id).n;
  assert.equal(shoot(baton, 'melee') - shoot(plain, 'melee'), n('baton'), 'the baton adds to melee');
  assert.equal(shoot(near(withBoons(['baton'])), 'los'), shoot(near(withBoons([])), 'los'), 'not to ranged');
  assert.equal(shoot(rifle, 'los') - shoot(near(withBoons([])), 'los'), n('coilgun'), 'the rifle adds to ranged');
  assert.equal(shoot(near(withBoons(['coilgun'])), 'melee'), shoot(near(withBoons([])), 'melee'), 'not to melee');
  assert.equal(shoot(near(withBoons(['baton'])), 'melee', 0), 0, 'a strike of nothing stays nothing');
  // the basic Strike is a melee strike too
  const s = near(withBoons(['baton']));
  const before = s.e.hp;
  T.runEffects(s.m, s.h, T.BASIC_BY.strike.fx, { P: 0, E: 0, target: s.e.uid });
  assert.equal(before - s.e.hp, 2 + n('baton'));
});

test('weapons never strike on their own, and Overcharge takes banked Omni dice: +2 a strike this round, stacked', () => {
  for (const id of ['baton', 'coilgun'])
    for (const a of T.GEAR_BY[id].abilities)
      assert.ok(
        a.fx.every((x) => x.v !== 'strike'),
        `${id} ${a.n}`,
      );
  const s = near(withBoons(['baton']));
  const { m, h } = s;
  const oc = T.GEAR_BY.baton.abilities.findIndex((a) => a.n === 'Overcharge');
  h.held = h.held.map(() => 'AP');
  h.heldDie = h.held.map(() => 'plain');
  assert.equal(T.canUseGear(m, h, 0, oc).ok, false, 'no banked Omni, no Overcharge');
  h.held.push('O', 'O');
  h.heldDie.push('plain', 'plain');
  h.pool -= 2;
  const purse = m.purses[0];
  assert.ok(T.useGear(m, h, 0, oc).ok);
  assert.ok(T.useGear(m, h, 0, oc).ok, 'no cooldown: a second Omni stacks');
  assert.equal(T.omniCount(h), 0, 'both Omni spent');
  assert.equal(m.purses[0], purse, 'no omnicrystals spent');
  assert.equal(h.pool + h.held.length, T.RULES.POOL, 'still fifteen dice');
  const bonus = val('baton').n + 4;
  assert.equal(shoot(s, 'melee'), 3 + bonus, 'the first strike');
  assert.equal(shoot(s, 'melee'), 3 + bonus, 'and every strike this round');
  assert.equal(shoot(s, 'los'), 3, 'only strikes of its reach');
  T.endHeroPhase(m);
  assert.ok(!(h.states.Empower || []).length, 'gone at round end');
});
