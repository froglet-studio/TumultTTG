'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;

function scene(arch = 'swarm', tier = 1, seed = 5) {
  const run = T.newRun(seed);
  H.prebuiltSquad(run, 0, 1);
  T.launchMission(run, arch, tier);
  return { run, m: run.mission, h: run.mission.heroes[0], e: run.mission.enemies[0] };
}
const diceTotal = (h) => h.pool + h.held.length;

test('dice: pool + banked is always 15; Omni substitutes for any etherion', () => {
  const { m, h } = scene();
  assert.equal(diceTotal(h), T.RULES.POOL);
  h.held = ['AP', 'AP', 'O'];
  h.pool = 12;
  assert.equal(T.canPay(h, 1, 'S', 1), true, 'Omni pays for Space');
  T.pay(h, 1, 'S', 1);
  assert.deepEqual(h.held, ['AP']);
  assert.equal(diceTotal(h), T.RULES.POOL);
  assert.equal(T.canPay(h, 1, 'S', 1), false, 'no etherion left');
  T.draw(h, 'C', 2);
  assert.equal(diceTotal(h), T.RULES.POOL);
  T.mint(h, 'AP', 3); // minted dice are temporary and never count toward the 15
  assert.equal(diceTotal(h), T.RULES.POOL);
  assert.equal(T.apValue(h), 4);
  T.endHeroPhase(m);
  assert.equal(h.temp.length, 0, 'minted dice evaporate at the end of the hero phase');
  assert.equal(diceTotal(h), T.RULES.POOL);
});

test('dice: the anti-brick valve folds M+C+S+T into one Omni', () => {
  const { m, h } = scene();
  h.held = ['M', 'C', 'S', 'T', 'AP'];
  h.pool = 10;
  assert.equal(T.valve(m, h), true);
  assert.deepEqual(h.held.slice().sort(), ['AP', 'O']);
  assert.equal(diceTotal(h), T.RULES.POOL);
  assert.equal(T.valve(m, h), false, 'needs one of each');
});

test('track: a card returns after its cooldown; durations cool down afterwards', () => {
  const { h } = scene();
  h.track = [];
  T.commit(h, 'oct_jet', 0, 2, '');
  assert.equal(T.inHand(h, 'oct_jet'), false);
  T.slideTrack(h, 1);
  assert.equal(T.inHand(h, 'oct_jet'), false);
  T.slideTrack(h, 1);
  assert.equal(T.inHand(h, 'oct_jet'), true);

  T.commit(h, 'oct_cloak', 2, 3, '');
  T.slideTrack(h, 2);
  assert.equal(h.track[0].phase, 'cd', 'duration finished → cooldown begins');
  T.slideTrack(h, 3);
  assert.equal(T.inHand(h, 'oct_cloak'), true);
});

test('damage: Shield reduces; Pierce, true damage and area bypass it; Mark adds 2 once', () => {
  const { m, h, e } = scene();
  Object.assign(e, { hp: 40, maxHp: 40, shield: 0, states: {} });
  assert.equal(T.damage(m, h, e, 3, { kind: 'melee' }), 3);
  e.states.Shield = { v: 2, t: 2, all: false };
  assert.equal(T.damage(m, h, e, 3, { kind: 'melee' }), 1);
  assert.equal(T.damage(m, h, e, 3, { kind: 'melee', pierce: true }), 3);
  assert.equal(T.damage(m, h, e, 3, { kind: 'true', trueDmg: true }), 3);
  assert.equal(T.damage(m, h, e, 3, { kind: 'area' }), 3, 'a plain Shield does not stop area damage');
  e.states.Shield = { v: 2, t: 2, all: true };
  assert.equal(T.damage(m, h, e, 3, { kind: 'area' }), 1, 'an all-Shield does');
  delete e.states.Shield;
  e.states.Marked = {};
  assert.equal(T.damage(m, h, e, 3, { kind: 'melee' }), 5);
  assert.equal(e.states.Marked, undefined, 'Mark is consumed');
});

test('states have several answers: Hidden stops lane strikes, melee contact breaks it', () => {
  const { m, h, e } = scene();
  Object.assign(e, { hp: 40, maxHp: 40, shield: 0, states: { Hidden: { t: 3 } } });
  assert.equal(T.damage(m, h, e, 3, { kind: 'los' }), 0, 'lane strike hits an afterimage');
  assert.ok(e.states.Hidden);
  assert.equal(T.damage(m, h, e, 3, { kind: 'melee' }), 3);
  assert.equal(e.states.Hidden, undefined, 'contact reveals');
});

test('Anchored foes cannot be pushed', () => {
  const { m, h, e } = scene();
  e.states.Anchored = { t: 2 };
  const before = e.pos;
  assert.equal(T.pushAway(m, h, e, 2), 0);
  assert.equal(e.pos, before);
});

test('no turn theft: a Slowed, Weakened, Anchored enemy still acts', () => {
  const { m, h } = scene();
  const e = m.enemies.find((x) => x.type === 'biter');
  m.enemies = [e];
  e.pos = T.Board.walkNeighbors(m.board, h.pos).find((n) => !T.occupied(m, n));
  Object.assign(e.states, { Slow: { t: 2 }, Weak: { v: 1, t: 2 }, Anchored: { t: 2 } });
  T.chooseIntents(m);
  assert.ok(e.intent, 'it still declares an intent');
  const before = m.heroes.reduce((s, x) => s + x.hp, 0);
  T.enemyPhase(m);
  const after = m.heroes.reduce((s, x) => s + x.hp, 0);
  assert.ok(after < before, 'it still attacks (for reduced damage)');
});

test('determinism: the same seed plays the same mission', () => {
  const play = () => {
    const { m } = scene('cascade', 2, 99);
    H.playMission(m);
    return m.log.map((l) => l.text).join('\n');
  };
  assert.equal(play(), play());
});

test('the engine and data stay deterministic and DOM-free', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { SRC, manifest } = require('../tools/load');
  for (const rel of manifest.engine) {
    const code = fs.readFileSync(path.join(SRC, rel), 'utf8');
    assert.ok(!/Math\.random\s*\(/.test(code), `${rel} calls Math.random() — use the seeded rng`);
    assert.ok(!/\bdocument\./.test(code), `${rel} touches the DOM — that belongs in src/ui`);
  }
});
