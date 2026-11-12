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

test('height: Weightless and a climbing form walk up to a ledge; nobody else does until the ramp drops', () => {
  const B = T.Board;
  // a hero on the floor beside the Vault's ledge, holding the two cards that promise the climb
  const below = (prepare) => {
    const scene = H.arena(['owl_bones', 'axo_neoteny'], { archetype: 'vault', tier: 1 });
    const { m, h } = scene;
    const ledge = m.objective.node;
    h.pos = B.allNeighbors(m.board, ledge).find((n) => !m.board.nodes[n].height && !T.occupied(m, n));
    if (prepare) prepare(scene);
    const offered = T.reachableWalk(m, h, 1, false).includes(ledge);
    const walked = T.walk(m, h, ledge).ok;
    assert.equal(offered, walked, 'what the board offers is what a step can do');
    assert.equal(h.pos === ledge, walked);
    return walked;
  };
  assert.equal(below(), false, 'a hero on foot cannot');
  assert.equal(
    below((s) => assert.ok(H.playIn(s, 'owl_bones', 'E').ok)),
    true,
    'Hollow Bones — Weightless can',
  );
  assert.equal(
    below((s) => assert.ok(H.playIn(s, 'axo_neoteny', 'E').ok)),
    true,
    'Neoteny — Reshape can',
  );
  assert.equal(
    below((s) => (s.m.board.ramp = true)),
    true,
    'anyone can once the ramp is down',
  );
});

test('a Harrier that is Anchored, Slowed or held cannot blink — and still lances a hero beside it', () => {
  const B = T.Board;
  // one Harrier, ready to lance, either across the board from the squad or beside a hero
  const harrierTurn = (state, beside) => {
    const { m, h } = scene('swarm', 1, 5);
    const far = Object.keys(m.board.nodes)
      .map(Number)
      .filter((n) => !T.occupied(m, n) && m.heroes.every((x) => B.dist(m.board, n, x.pos, true) >= 2))
      .sort((a, b) => B.dist(m.board, a, h.pos, true) - B.dist(m.board, b, h.pos, true))[0];
    const near = B.walkNeighbors(m.board, h.pos).find((n) => !T.occupied(m, n));
    const e = T.spawnEnemy(m, 'harrier', 1, beside ? near : far);
    m.enemies = [e];
    m.spawns = [];
    Object.assign(e.states, state);
    T.chooseIntents(m);
    assert.equal(e.intent.key, 'lance');
    const from = e.pos;
    const hpBefore = m.heroes.reduce((s, x) => s + x.hp, 0);
    T.enemyPhase(m);
    return { moved: e.pos !== from, hurt: m.heroes.reduce((s, x) => s + x.hp, 0) < hpBefore };
  };
  assert.deepEqual(harrierTurn({}, false), { moved: true, hurt: true }, 'free, it blinks in and strikes');
  for (const [name, state] of [
    ['Anchored', { Anchored: { t: 2 } }],
    ['Slowed', { Slow: { t: 2 } }],
    ['held by a Counted Trap', { Anchored: { t: 2 }, NoTele: { t: 2 } }],
  ]) {
    assert.deepEqual(harrierTurn(state, false), { moved: false, hurt: false }, `${name}: no blink`);
    assert.deepEqual(harrierTurn(state, true), { moved: false, hurt: true }, `${name}: it still acts`);
  }
});

test('strike bonuses belong to strikes: wearing-down damage neither spends nor gains them', () => {
  const lone = () => {
    const s = scene();
    s.m.enemies = [s.e];
    s.m.spawns = [];
    Object.assign(s.e, { hp: 60, maxHp: 60, shield: 0, states: {} });
    return s;
  };
  const strike = ({ m, h, e }, kind = 'melee') => {
    const before = e.hp;
    T.runEffects(m, h, [{ v: 'strike', kind, dmg: 3 }], { P: 0, E: 0, target: e.uid });
    return before - e.hp;
  };
  const dotTick = (s) => {
    const before = s.e.hp;
    T.runEffects(s.m, s.h, [{ v: 'dot', val: 1, dur: 3, kind: 'corrode' }], { P: 0, E: 0, target: s.e.uid });
    T.roundEnd(s.m);
    return before - s.e.hp;
  };

  let s = lone();
  T.runEffects(s.m, s.h, [{ v: 'empower', val: 2, uses: 1 }], { P: 0, E: 0 });
  assert.equal(dotTick(s), 1, 'a corrosion tick is not the "next strike"');
  assert.equal(strike(s), 5, 'so the bonus is still there for the strike');
  assert.equal(strike(s), 3, 'and is spent by it');

  s = lone();
  T.runEffects(s.m, s.h, [{ v: 'morph', bonus: 2, dur: 3 }], { P: 0, E: 0 });
  assert.equal(dotTick(s), 1, 'a form adds to strikes, not to corrosion');
  assert.equal(strike(s), 5);
});

test('strike bonuses last as long as their card says', () => {
  // "this turn": gone when the round ends
  for (const cardId of ['hum_tool', 'owl_silent']) {
    const s = H.arena(cardId);
    assert.ok(H.playIn(s, cardId, 'P').ok, cardId);
    assert.ok(s.h.states.Empower, `${cardId}: the bonus is there this turn`);
    s.m.enemies = [];
    s.m.spawns = [];
    T.roundEnd(s.m);
    assert.equal(s.h.states.Empower, undefined, `${cardId}: and gone the next`);
  }
  // "for 1 + E rounds": Night Eyes — Thermal at E 1 covers this round and the next
  const s = H.arena('owl_night', { up: [0, 1] });
  assert.ok(H.playIn(s, 'owl_night', 'E').ok);
  s.m.enemies = [];
  s.m.spawns = [];
  T.roundEnd(s.m);
  assert.ok(s.h.states.Empower, 'still there in the second round');
  T.roundEnd(s.m);
  assert.equal(s.h.states.Empower, undefined, 'gone in the third');
});

test('Multitask frees the next card played this turn; Parallel’s two wait until they are spent', () => {
  const quietRoundEnd = (s) => {
    s.m.enemies = [];
    s.m.spawns = [];
    T.roundEnd(s.m);
  };
  const free = (h) => (h.states.Freecast || []).reduce((n, g) => n + g.n, 0);

  // the card played next, the same turn, stays in hand
  let s = H.arena(['oct_arms', 'hum_throw']);
  assert.ok(H.playIn(s, 'oct_arms', 'P').ok);
  assert.equal(free(s.h), 1);
  assert.ok(H.playIn(s, 'hum_throw', 'P').ok);
  assert.ok(T.inHand(s.h, 'hum_throw'), 'the freed card did not go to the track');
  assert.equal(free(s.h), 0, 'and the offer is spent');

  // not used this turn: gone when the round ends
  s = H.arena(['oct_arms', 'hum_throw']);
  assert.ok(H.playIn(s, 'oct_arms', 'P').ok);
  quietRoundEnd(s);
  assert.equal(free(s.h), 0, 'Multitask does not carry into the next round');

  // Parallel says "the next two cards", with no time limit
  s = H.arena(['oct_arms', 'hum_throw']);
  assert.ok(H.playIn(s, 'oct_arms', 'E').ok);
  quietRoundEnd(s);
  assert.equal(free(s.h), 2, 'Parallel waits');

  // with both waiting, the one that runs out first is spent first
  s.h.states.Freecast.push({ n: 1, t: 1 });
  T.commit(s.h, 'hum_throw', 0, 2, '');
  assert.deepEqual(s.h.states.Freecast, [{ n: 2, t: null }]);
});

test('a Located Harrier cannot fade from sight — and still readies its lance', () => {
  const B = T.Board;
  const fade = (located) => {
    const { m, h } = scene('swarm', 1, 5);
    const far = Object.keys(m.board.nodes)
      .map(Number)
      .filter((n) => !T.occupied(m, n))
      .sort((a, b) => B.dist(m.board, b, h.pos, true) - B.dist(m.board, a, h.pos, true))[0];
    const e = T.spawnEnemy(m, 'harrier', 1, far);
    delete e.states.Hidden; // it has been revealed
    if (located) e.states.Located = { t: 3 };
    m.enemies = [e];
    m.spawns = [];
    T.chooseIntents(m);
    assert.equal(e.intent.key, 'fade');
    T.enemyPhase(m);
    const hidden = T.isHidden(e);
    T.chooseIntents(m);
    return { hidden, next: e.intent.key };
  };
  assert.deepEqual(fade(false), { hidden: true, next: 'lance' });
  assert.deepEqual(fade(true), { hidden: false, next: 'lance' }, 'seen, but not robbed of its turn');
});

test('a Warden’s shield stops area damage too; Pierce and true damage get through', () => {
  const { m, h } = scene('vault', 1, 5);
  const w = m.enemies.find((e) => e.type === 'warden');
  w.hp = w.maxHp = 60;
  const blocked = w.shield;
  assert.ok(blocked > 0);
  assert.equal(T.damage(m, h, w, 5, { kind: 'melee' }), 5 - blocked);
  assert.equal(T.damage(m, h, w, 5, { kind: 'area' }), 5 - blocked, 'unlike a plain Shield');
  assert.equal(T.damage(m, h, w, 5, { kind: 'melee', pierce: true }), 5);
  assert.equal(T.damage(m, h, w, 5, { kind: 'true', trueDmg: true }), 5);
});

test('Ethereal faces: playable from E 0 today; RULES.ETHEREAL_MIN_E is the switch for the stricter reading', () => {
  const fresh = createHarness(); // its own copy of the rules, so the switch cannot leak into other tests
  const playable = (E, min) => {
    fresh.T.RULES.ETHEREAL_MIN_E = min;
    const s = fresh.arena('oct_jet', { up: [0, E] });
    return { P: fresh.T.canPlay(s.m, s.h, 'oct_jet', 'P').ok, E: fresh.T.canPlay(s.m, s.h, 'oct_jet', 'E').ok };
  };
  assert.equal(T.RULES.ETHEREAL_MIN_E, 0, 'the default has not changed without a decision');
  assert.deepEqual(playable(0, 0), { P: true, E: true });
  assert.deepEqual(
    playable(0, 1),
    { P: true, E: false },
    'under the strict reading an untrained card has no Ethereal face',
  );
  assert.deepEqual(playable(1, 1), { P: true, E: true });
});
