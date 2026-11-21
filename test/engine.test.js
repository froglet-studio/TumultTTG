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

test('dice: one Omni, or any two etherions, spend as 1 AP (2.114)', () => {
  const { m, h } = scene();
  h.held = ['M', 'M', 'AP', 'C', 'O'];
  h.heldDie = ['M', 'plain', 'plain', 'C', 'plain'];
  h.pool = 10;
  h.temp = [];
  assert.equal(T.apSpends(h).length, 3, 'the Omni, M+M and M+C, each once');
  assert.equal(T.apValue(h), 1);
  assert.equal(T.spendAsAP(m, h, [4]).ok, true, 'an Omni alone');
  assert.equal(T.apValue(h), 2);
  assert.equal(T.spendAsAP(m, h, [0, 3]).ok, true, 'two different etherions');
  assert.deepEqual(h.held, ['M', 'AP']);
  assert.deepEqual(h.temp, ['AP', 'AP'], 'the AP is minted');
  assert.equal(T.apValue(h), 3);
  assert.equal(diceTotal(h), T.RULES.POOL);
  assert.equal(T.spendAsAP(m, h, [0]).ok, false, 'one etherion is not enough');
  assert.equal(T.spendAsAP(m, h, [0, 1]).ok, false, 'AP is not an etherion');
  T.endHeroPhase(m);
  assert.equal(h.temp.length, 0, 'and evaporates with the hero phase');
});

test('dice: payableAsAP reads a cost that spare dice could make up', () => {
  const { h } = scene();
  h.held = ['S', 'T', 'O', 'AP'];
  h.heldDie = ['plain', 'plain', 'plain', 'plain'];
  h.pool = 11;
  h.temp = [];
  assert.equal(T.payableAsAP(h, 3, 'M', 0), true, '1 AP + the Omni + the pair');
  assert.equal(T.payableAsAP(h, 4, 'M', 0), false);
  assert.equal(T.payableAsAP(h, 2, 'M', 1), true, 'the Omni pays the Mass, the pair the AP');
  assert.equal(T.payableAsAP(h, 3, 'M', 1), false);
  assert.equal(T.payableAsAP(h, 1, 'S', 1), false, 'payable already');
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
  e.states.Marked = { next: 2 };
  assert.equal(T.damage(m, h, e, 3, { kind: 'melee' }), 5);
  assert.equal(e.states.Marked, undefined, 'Mark is consumed');
});

test('states have several answers: Hidden stops zone strikes, melee contact breaks it', () => {
  const { m, h, e } = scene();
  Object.assign(e, { hp: 40, maxHp: 40, shield: 0, states: { Hidden: { t: 3 } } });
  assert.equal(T.damage(m, h, e, 3, { kind: 'los' }), 0, 'zone strike hits an afterimage');
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

test('height: Hover and a climbing form walk up to a ledge; nobody else does until the ramp drops', () => {
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
    'Hollow Bones — Hover can',
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

test('a Harrier that is Anchored cannot blink — and still lances a hero beside it', () => {
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
  for (const [name, state] of [['Anchored', { Anchored: { t: 2 } }]]) {
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
    T.runEffects(s.m, s.h, [{ v: 'wound', n: 1, kind: 'corrode' }], { P: 0, E: 0, target: s.e.uid });
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

test('Ethereal faces must be awakened: E 1 on the card (RULES.ETHEREAL_MIN_E; 0 is the v2.0 rule)', () => {
  const fresh = createHarness(); // its own copy of the rules, so the switch cannot leak into other tests
  const playable = (E, min) => {
    fresh.T.RULES.ETHEREAL_MIN_E = min;
    const s = fresh.arena('oct_jet', { up: [0, E] });
    return { P: fresh.T.canPlay(s.m, s.h, 'oct_jet', 'P').ok, E: fresh.T.canPlay(s.m, s.h, 'oct_jet', 'E').ok };
  };
  assert.equal(T.RULES.ETHEREAL_MIN_E, 1, 'Garrett, 2026-11-12: Ethereal faces are magic that must be awakened');
  assert.deepEqual(playable(0, 0), { P: true, E: true });
  assert.deepEqual(playable(0, 1), { P: true, E: false }, 'an untrained card has no Ethereal face');
  assert.deepEqual(playable(1, 1), { P: true, E: true });
});

test('basic actions: every hero can Strike, Brace and Shove with no cards, paying AP and nothing else', () => {
  const s = H.arena('hum_tool');
  const { m, h, adj } = s;
  assert.ok(adj, 'a foe stands next to the tester');
  h.cards = []; // no cards at all
  h.held = ['AP', 'AP', 'AP', 'AP', 'AP'];
  h.pool = T.RULES.POOL - h.held.length;
  const ids = T.legalActions(m)
    .filter((a) => a.t === 'basic' && a.hero === 0)
    .map((a) => a.basic);
  for (const id of ['brace', 'shove', 'strike']) assert.ok(ids.includes(id), id);
  assert.ok(
    ids.every((id) => !T.BASIC_BY[id].el),
    'nothing channelled without an etherion',
  );

  adj.shield = 0;
  if (adj.states.Shield) delete adj.states.Shield;
  const hp = adj.hp;
  assert.equal(T.useBasic(m, h, 'strike', { target: adj.uid }).ok, true);
  assert.equal(adj.hp, Math.max(0, hp - 2), 'Strike deals 2');
  assert.equal(h.held.length, 3, 'paid 2 AP');
  assert.equal(h.pool + h.held.length, T.RULES.POOL, 'the 15-die invariant holds');
  assert.equal(h.track.length, 0, 'a basic action never goes on the track');

  assert.equal(T.useBasic(m, h, 'brace').ok, true);
  assert.ok(h.states.Shield && h.states.Shield.v >= 1, 'Brace shields');
  h.held = ['AP'];
  h.pool = T.RULES.POOL - 1;
  assert.equal(T.canUseBasic(m, h, 'strike').why, 'need 2 AP', 'one AP is one too few');
});

test('basic actions are refused when they cannot be paid or have nothing to touch', () => {
  const { m, h } = H.arena('hum_tool');
  h.held = ['M'];
  h.pool = T.RULES.POOL - 1;
  assert.equal(T.canUseBasic(m, h, 'brace').ok, false, 'an etherion is not AP');
  h.held = ['AP', 'AP'];
  h.pool = T.RULES.POOL - 2;
  for (const e of m.enemies) e.pos = null; // nobody within reach
  m.enemies.forEach((e) => (e.alive = false));
  assert.equal(T.canUseBasic(m, h, 'strike').why, 'no valid target');
  assert.equal(T.canUseBasic(m, h, 'nonsense').ok, false);
});

test('Channel: a banked etherion (or Omni) is an action on its own, so no die is ever dead', () => {
  const { m, h, adj } = H.arena('hum_tool');
  h.cards = [];
  adj.shield = 0;
  if (adj.states.Shield) delete adj.states.Shield;
  adj.hp = 10;
  h.held = ['AP', 'AP', 'M'];
  h.pool = T.RULES.POOL - h.held.length;
  assert.equal(T.useBasic(m, h, 'strike_M', { target: adj.uid }).ok, true);
  assert.equal(adj.hp, 8, 'Mass channelled into Strike: 2 damage');
  assert.deepEqual(h.held, ['AP', 'AP'], 'paid the Mass alone: a channelled Strike costs no AP');
  assert.equal(h.pool + h.held.length, T.RULES.POOL);

  h.held = ['O'];
  h.pool = T.RULES.POOL - 1;
  assert.equal(T.canUseBasic(m, h, 'brace_T').ok, true, 'Omni stands in for any etherion');
  h.held = ['AP', 'AP', 'C'];
  h.pool = T.RULES.POOL - 3;
  assert.equal(T.canUseBasic(m, h, 'strike_M').why, 'needs M (or Omni)');

  // every etherion has a channelled action, so none can be stranded in the bank
  for (const el of ['M', 'C', 'S', 'T'])
    assert.ok(
      T.BASIC.some((b) => b.el === el),
      `a basic action takes ${el}`,
    );
});

test('at level 0, with no AP and no awakened card, every crystal still opens an action', () => {
  // Garrett, 2026-11-12: a hero loaded with etherions and no AP had nothing to spend them on.
  const { m, h } = H.arena('hum_tool');
  h.cards = [];
  for (const el of ['M', 'C', 'S', 'T', 'O']) {
    h.held = [el];
    h.pool = T.RULES.POOL - 1;
    const open = T.BASIC.filter((b) => b.el && b.ap === 0 && T.canUseBasic(m, h, b.id).ok);
    assert.ok(open.length, `a lone ${el} with no AP can be channelled`);
  }
  // and one of every colour needs nothing on the board to be worth taking
  for (const el of ['S', 'T'])
    assert.ok(
      T.BASIC.some((b) => b.el === el && b.ap === 0 && (b.tgt === 'self' || b.tgt === 'node_move')),
      `${el} has a channelled action that needs no foe`,
    );
});

/** Every node a run of exactly n steps can end on, counted by hand: no space twice, past anyone, ending empty. */
function runEnds(m, h, n) {
  const out = new Set();
  const walk = (path) => {
    const x = path[path.length - 1];
    if (path.length === n + 1) {
      if (!T.occupied(m, x)) out.add(x);
      return;
    }
    for (const y of T.Board.walkNeighbors(m.board, x))
      if (!path.includes(y) && !m.board.nodes[y].height) walk(path.concat(y));
  };
  walk([h.pos]);
  return out;
}

test('an exact run (Hyperspeed) offers every node a run of exactly that many steps ends on, and lands there', () => {
  const scene = H.arena('che_hyper');
  const { m, h } = scene;
  const exact = T.reachableWalk(m, h, 4, true, true);
  assert.ok(exact.length > 0, 'the arena has somewhere a run of four ends');
  assert.deepEqual(exact.slice().sort(), [...runEnds(m, h, 4)].sort(), 'the same nodes a player counts on the board');
  const tg = T.canPlay(m, h, 'che_hyper', 'P').tg;
  assert.deepEqual(tg.options.slice().sort(), exact.slice().sort(), 'the face offers the same nodes');
  const off = Object.keys(m.board.nodes)
    .map(Number)
    .find((n) => n !== h.pos && !exact.includes(n) && !T.occupied(m, n));
  if (off != null) {
    assert.ok(T.playFace(m, h, 'che_hyper', 'P', { node: off }).ok);
    assert.notEqual(h.pos, off, 'a node no run of four ends on is refused');
  }
  const scene2 = H.arena('che_hyper');
  assert.ok(H.playIn(scene2, 'che_hyper', 'P').ok);
  assert.ok(exact.includes(scene2.h.pos), 'it lands where a run of four ends');
});

test('a run of four has somewhere to go from every space of every page, the Mast-Crop threshing floor too (2.81.1)', () => {
  // the playtest report: on Three Caches (Mast-Crop Hills), Hyperspeed said there was nowhere to go
  for (const page of T.ATLAS) {
    const board = T.Board.build(T.pageBoard(page));
    for (const k of Object.keys(board.nodes)) {
      if (board.nodes[k].height) continue; // high ground: no walk leaves it without a ladder, as for any walk
      const h = { kind: 'hero', pos: +k, states: {}, cards: [], gear: [], boons: [] };
      const m = { board, heroes: [h], enemies: [], decoys: [] };
      assert.ok(
        T.reachableWalk(m, h, 4, true, true).length,
        `${page.id} ${board.nodes[k].label}: a run of 4 goes somewhere`,
      );
    }
  }
  // and past foes: on the floor's centre, with every neighbour taken, the run still goes through them
  const page = T.ATLAS.find((p) => p.id === 'mastcrop');
  const board = T.Board.build(T.pageBoard(page));
  const C2 = Object.keys(board.nodes)
    .map(Number)
    .find((n) => board.nodes[n].label === 'C2');
  const h = { kind: 'hero', pos: C2, states: {}, cards: [], gear: [], boons: [] };
  const foes = T.Board.walkNeighbors(board, C2).map((pos) => ({ kind: 'enemy', alive: true, pos, states: {} }));
  const m = { board, heroes: [h], enemies: foes, decoys: [] };
  const ends = T.reachableWalk(m, h, 4, true, true);
  assert.ok(ends.length, 'a ring of foes is run past');
  assert.ok(
    ends.every((n) => !T.occupied(m, n)),
    'and the run never ends on one',
  );
  assert.deepEqual(T.reachableWalk(m, h, 4, false, true), [], 'a plain walk of four cannot pass them');
});

test('a run toward a foe goes up to its full length and stops beside it (Pounce)', () => {
  const scene = H.arena('cat_pounce');
  const { m, h, zone } = scene;
  const B = T.Board;
  // a foe three steps off along open ground
  const three = Object.values(m.board.nodes)
    .map((n) => n.id)
    .find((id) => !T.occupied(m, id) && B.dist(m.board, h.pos, id, true) === 3 && !m.board.nodes[id].height);
  assert.ok(three != null, 'the arena has a node three away');
  m.enemies.forEach((e) => e !== zone && (e.pos = -1));
  zone.pos = three;
  const hp = zone.hp;
  const r = T.playFace(m, h, 'cat_pounce', 'P', { target: zone.uid });
  assert.ok(r.ok, r.why);
  assert.ok(B.adjacent(m.board, h.pos, zone.pos), 'two steps bring the hero beside it');
  assert.ok(zone.hp < hp, 'and the bite lands');
});

test('balance pass: a Shield breaker chips by its level, it does not delete the Shield', () => {
  const { m, h } = scene('vault', 1, 5);
  const w = m.enemies.find((e) => e.type === 'warden');
  w.shield = 6;
  // Crumble (jer_gnaw.E) chews 1 + E off the Shield: E 1 leaves 4, E 3 leaves 2
  T.applyEffect(m, h, T.CARD.jer_gnaw.E.fx[0], { P: 0, E: 1, target: w.uid });
  assert.equal(w.shield, 4);
  T.applyEffect(m, h, T.CARD.jer_gnaw.E.fx[0], { P: 0, E: 3, target: w.uid });
  assert.equal(w.shield, 0, 'what is left goes, and no further');
});

test('balance pass: Pace moves where its player chooses, after shrugging off a hold', () => {
  const s = H.arena(['hum_persist']);
  s.h.states.Anchored = { t: 2 };
  const from = s.h.pos;
  const chk = T.canPlay(s.m, s.h, 'hum_persist', 'P');
  assert.ok(chk.ok && chk.tg.need === 'node' && chk.tg.options.length, 'Pace asks for a node');
  const to = chk.tg.options[chk.tg.options.length - 1];
  assert.ok(T.playFace(s.m, s.h, 'hum_persist', 'P', { node: to }).ok);
  assert.notEqual(s.h.pos, from);
  assert.equal(s.h.pos, to);
  assert.ok(!s.h.states.Anchored, 'the hold is shed first');
});

test('balance pass: a card goes to the track when played, so it plays at most once a turn', () => {
  const s = H.arena(['hum_throw']);
  assert.ok(H.playIn(s, 'hum_throw', 'P').ok);
  assert.equal(T.canPlay(s.m, s.h, 'hum_throw', 'P').ok, false, 'Hurl is on the track until next turn');
  T.heroTurnStart(s.m, s.h);
  assert.ok(T.inHand(s.h, 'hum_throw'), 'and back the turn after');
});
