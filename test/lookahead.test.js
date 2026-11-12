'use strict';
/**
 * Roadmap F2. The look-ahead player: it lists every legal action, plans on copies, uses nothing a
 * person at the table could not know, and beats the heuristic autoplayer on every mission type.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, ARCHETYPES } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const state = (x) => JSON.stringify(x);

/** Squad i against a mission: the same squads the balance tables use. */
function mission(arch, tier, i) {
  const run = T.newRun(1000 + i);
  if (i % 3 === 2) H.draftedSquad(run);
  else H.prebuiltSquad(run, i % 6, (i + 1 + (i % 5)) % 6);
  H.addProgression(run, tier);
  T.launchMission(run, arch, tier);
  return run.mission;
}
const CELLS = [];
for (const arch of ARCHETYPES) for (const tier of arch === 'boss' ? [3] : [1, 2, 3]) CELLS.push([arch, tier]);

test('every playable face is among the legal actions, with every way to resolve it', () => {
  for (const c of T.CARDS)
    for (const face of ['P', 'E']) {
      const { m, h } = H.arena(c.id);
      const chk = T.canPlay(m, h, c.id, face);
      const listed = T.legalActions(m).filter(
        (a) => a.t === 'face' && a.hero === 0 && a.card === c.id && a.face === face,
      );
      if (!chk.ok) {
        assert.equal(listed.length, 0, `${c.id}.${face} cannot be played and must not be offered`);
        continue;
      }
      const ways = c[face].fx.some((x) => x.v === 'force' && x.kind === 'choose') ? 2 : 1;
      const targets = chk.tg.need === 'none' ? 1 : chk.tg.options.length;
      assert.equal(listed.length, targets * ways, `${c.id}.${face}`);
    }
});

test('legal means legal: every action offered can be taken, in every kind of mission', () => {
  let offered = 0;
  const kinds = new Set();
  for (const [arch, tier] of CELLS) {
    const m = mission(arch, tier, 3);
    for (let round = 0; round < 4 && !m.over; round++) {
      // the squad's phase, one look at a time: everything on offer works on a copy
      for (let step = 0; step < 6 && !m.over; step++) {
        const actions = T.legalActions(m);
        for (const a of actions) {
          const copy = T.clone(m);
          const r = T.applyAction(copy, a);
          assert.ok(r.ok, `${arch} t${tier}: ${T.describeAction(m, a)} was offered and refused (${r.why})`);
          kinds.add(a.t);
          offered++;
        }
        if (!actions.length) break;
        T.applyAction(m, actions[(round * 7 + step * 3) % actions.length]);
      }
      if (!m.over) T.endHeroPhase(m);
    }
  }
  assert.ok(offered > 500, `only ${offered} actions were tried`);
  for (const t of ['face', 'walk', 'interact', 'gear']) assert.ok(kinds.has(t), `no "${t}" action was ever offered`);
  assert.deepEqual(
    T.legalActions(Object.assign(mission('swarm', 1, 0), { over: true })),
    [],
    'none once the mission is over',
  );
});

test('planning changes nothing, and finishing a round is the first half of ending the squad’s phase', () => {
  for (const [arch, tier] of CELLS) {
    const m = mission(arch, tier, 5);
    T.autoHeroPhase(m);
    T.endHeroPhase(m);
    const before = state(m);
    const plan = T.planHeroPhase(m);
    assert.equal(state(m), before, `${arch} t${tier}: planning touched the mission`);
    assert.ok(Array.isArray(plan));

    const whole = T.clone(m);
    const halves = T.clone(m);
    T.endHeroPhase(whole);
    T.finishRound(halves);
    assert.equal(halves.round, m.round, 'finishing the round does not begin the next: no new dice, no reinforcements');
    assert.deepEqual(halves.rngs, m.rngs, 'and draws nothing');
    if (!halves.over) T.beginRound(halves);
    assert.equal(state(halves), state(whole));
  }
});

test('the look-ahead knows nothing the table does not: not the dice to come, not the real cache', () => {
  for (const [arch, tier] of CELLS) {
    const m = mission(arch, tier, 2);
    T.autoHeroPhase(m);
    T.endHeroPhase(m);
    const plan = state(T.planHeroPhase(m));
    // the same table, with other dice and other reinforcements on their way
    const other = T.clone(m);
    other.rngs = { dice: 12345, foes: 67890 };
    assert.equal(state(T.planHeroPhase(other)), plan, `${arch} t${tier}: the plan depends on dice not yet rolled`);
  }
  // What it imagines on is a copy with dice of its own: they do not follow from the real ones,
  // and they are not the real ones. (A reroll is the one draw inside the squad's phase.)
  const m = mission('swarm', 2, 0);
  const copy = T.imagine(m);
  assert.notEqual(copy.rngs.dice, m.rngs.dice);
  assert.notEqual(copy.rngs.foes, m.rngs.foes);
  const otherDice = Object.assign(T.clone(m), { rngs: { dice: 1, foes: 2 } });
  assert.deepEqual(T.imagine(otherDice).rngs, copy.rngs);
  const real = T.clone(m);
  T.rerollHeld(real, real.heroes[0], [0, 1, 2]);
  T.rerollHeld(copy, copy.heroes[0], [0, 1, 2]);
  assert.equal(copy.log.length, 0, 'and it carries no history');
  assert.deepEqual(m.heroes[0].held, T.clone(m).heroes[0].held, 'imagining rolled nothing real');
  assert.notEqual(copy.rngs.dice, real.rngs.dice);
  // The Sought: the real cache is somewhere else, and the plan is the same
  for (let i = 0; i < 6; i++) {
    const m = mission('hidden', 2, i);
    const ob = m.objective;
    assert.equal(ob.found, false);
    const elsewhere = T.clone(m);
    const decoy = ob.candidates.find((n) => n !== ob.real);
    elsewhere.objective.real = decoy;
    for (const n of ob.candidates) elsewhere.board.nodes[n].objective.real = n === decoy;
    assert.equal(
      state(T.planHeroPhase(elsewhere)),
      state(T.planHeroPhase(m)),
      `seed ${i}: the plan knows where the cache is`,
    );
  }
});

test('a game is its seed and its actions: replaying the list gives the same game', () => {
  for (const [arch, tier] of [
    ['vault', 2],
    ['elite', 3],
    ['hidden', 1],
  ]) {
    const m = mission(arch, tier, 4);
    const rounds = [];
    for (let guard = 0; !m.over && guard < 40; guard++) {
      rounds.push(T.smartHeroPhase(m));
      if (!m.over) T.endHeroPhase(m);
    }
    assert.ok(m.over);
    assert.ok(rounds.flat().length > 0);
    assert.equal(state(JSON.parse(state(rounds))), state(rounds), 'actions are plain data');

    const again = mission(arch, tier, 4);
    for (const actions of rounds) {
      for (const a of actions) assert.ok(T.applyAction(again, a).ok, T.describeAction(again, a));
      if (!again.over) T.endHeroPhase(again);
    }
    assert.equal(state(again), state(m), `${arch} t${tier}`);
  }
});

test('objective progress runs from 0 to 1 for every kind of mission', () => {
  for (const [arch, tier] of CELLS) {
    const m = mission(arch, tier, 1);
    assert.equal(T.objectiveProgress(m), 0, `${arch} t${tier} starts at nothing`);
    let last = 0;
    for (let guard = 0; !m.over && guard < 40; guard++) {
      T.smartHeroPhase(m);
      if (!m.over) T.endHeroPhase(m);
      const p = T.objectiveProgress(m);
      assert.ok(p >= 0 && p <= 1, `${arch} t${tier}: ${p}`);
      last = p;
    }
    if (m.won) assert.equal(last, 1, `${arch} t${tier}: a won mission is complete`);
    else assert.ok(last < 1);
  }
});

test('the look-ahead player beats the heuristic on every mission type', { timeout: 120_000 }, () => {
  const N = 8;
  const total = { weak: 0, strong: 0, played: 0 };
  for (const arch of ARCHETYPES) {
    const wins = { weak: 0, strong: 0 };
    // tier 1 is won by both nearly always; the difference is made where a mission can be lost
    for (const tier of arch === 'boss' ? [3] : [2, 3])
      for (let i = 0; i < N; i++) {
        for (const player of ['weak', 'strong'])
          if (H.playMission(mission(arch, tier, i), { player }).won) wins[player]++;
        total.played++;
      }
    assert.ok(wins.strong >= wins.weak, `${arch}: look-ahead ${wins.strong}, heuristic ${wins.weak}`);
    total.weak += wins.weak;
    total.strong += wins.strong;
  }
  const gap = (total.strong - total.weak) / total.played;
  assert.ok(gap >= 0.1, `the gap over ${total.played} missions is only ${Math.round(gap * 100)} points`);
});

test('the forecast says exactly what ending the round now will do, and touches nothing', () => {
  let rounds = 0;
  let hurt = 0;
  for (const [arch, tier] of CELLS) {
    const m = mission(arch, tier, 6);
    for (let guard = 0; !m.over && guard < 6; guard++) {
      if (guard % 2) T.autoHeroPhase(m); // sometimes after the squad has acted, sometimes before
      if (m.over) break;
      const before = state(m);
      const f = T.forecast(m);
      assert.equal(state(m), before, `${arch} t${tier}: forecasting touched the mission`);

      const real = T.clone(m);
      T.finishRound(real);
      real.heroes.forEach((h, i) => {
        const line = f.heroes[i];
        assert.deepEqual(
          [line.name, line.hp, line.after, line.downed],
          [h.name, Math.max(0, m.heroes[i].hp), Math.max(0, h.hp), !m.heroes[i].downed && h.downed],
          `${arch} t${tier} round ${m.round}: ${h.name}`,
        );
        if (line.after < line.hp) hurt++;
      });
      assert.equal(f.progress.after, T.objectiveProgress(real));
      assert.equal(f.progress.before, T.objectiveProgress(m));
      assert.equal(f.clock, real.clock ? real.clock.value : null);
      assert.equal(f.result, real.over ? (real.won ? 'won' : 'lost') : null);
      for (const foe of f.foes) {
        const e = real.enemies.find((x) => x.uid === foe.uid);
        assert.deepEqual([foe.to, foe.falls], [e.pos, !e.alive], `${arch} t${tier}: ${foe.name}`);
      }
      rounds++;
      T.endHeroPhase(m);
    }
  }
  assert.ok(rounds > 60 && hurt > 20, `too little was forecast to mean anything (${rounds} rounds, ${hurt} hits)`);
  assert.equal(
    T.forecast(Object.assign(mission('swarm', 1, 0), { over: true })),
    null,
    'nothing to forecast once it is over',
  );
});
