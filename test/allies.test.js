'use strict';
/**
 * "Your ally" with three or more pilots: a face, a gear ability or a duet move that reaches an ally lets
 * its player choose which one, so nothing assumes a squad of two. The player picks; the pick is plain data
 * (ctx.ally, a uid), so the play stays deterministic for whoever makes it. With two pilots nothing changes.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;

/** A squad of `n` on a mission: the tester holds `cards`; one ally stands beside them, the rest further off. */
function squad(cards, n = 3) {
  const run = T.newRun(78);
  const h = T.makeHero({
    id: 'x',
    name: 'Tester',
    species: ['human', T.CARD[cards[0]].sp, 'eel'],
    cards,
    up: Object.fromEntries(cards.map((id) => [id, [2, 2]])),
  });
  const others = [];
  for (let k = 1; k < n; k++)
    others.push(
      T.makeHero({ id: 'y' + k, name: 'Ally ' + k, species: ['human', 'owl', 'gecko'], cards: ['owl_talon'] }),
    );
  run.heroes = [h].concat(others);
  run.crystals = 20;
  T.launchMission(run, 'swarm', 2);
  const m = run.mission;
  h.held = ['AP', 'AP', 'AP', 'AP', 'AP', 'O', 'O', 'O', 'M', 'C', 'S', 'T'];
  h.pool = T.RULES.POOL - h.held.length;
  const ground = (x) => !T.occupied(m, x) && !m.board.nodes[x].height;
  const free = Object.keys(m.board.nodes).map(Number).filter(ground);
  const near = B.walkNeighbors(m.board, h.pos).find(ground);
  const heroes = m.heroes.slice(1);
  heroes[0].pos = near;
  heroes.slice(1).forEach((a, k) => {
    a.pos = free.filter((x) => !T.occupied(m, x) && B.dist(m.board, h.pos, x, true) >= 3)[k];
  });
  return { run, m, h, near: heroes[0], far: heroes[1] };
}

test('two pilots: a face that reaches your ally asks nothing more', () => {
  const s = squad(['hum_coop'], 2);
  const tg = T.canPlay(s.m, s.h, 'hum_coop', 'E').tg;
  assert.equal(tg.need, 'none');
  assert.equal(tg.allies, undefined);
});

test('three pilots: Unity asks which ally, and the AP goes to the one chosen, not the nearest', () => {
  const s = squad(['hum_coop']);
  const tg = T.canPlay(s.m, s.h, 'hum_coop', 'E').tg;
  assert.equal(tg.need, 'ally');
  assert.deepEqual(tg.options.slice().sort(), [s.near.uid, s.far.uid].sort());
  const near = T.apValue(s.near),
    far = T.apValue(s.far);
  assert.ok(T.playFace(s.m, s.h, 'hum_coop', 'E', { ally: s.far.uid }).ok);
  assert.ok(T.apValue(s.far) > far, 'the chosen ally mints the AP');
  assert.equal(T.apValue(s.near), near, 'the nearer one does not');
});

test('three pilots: a face aimed at an ally cannot reach the player who plays it, or a foe', () => {
  const s = squad(['hum_coop']);
  assert.equal(T.playFace(s.m, s.h, 'hum_coop', 'E', { ally: s.h.uid }).ok, false);
  assert.equal(T.playFace(s.m, s.h, 'hum_coop', 'E', { ally: s.m.enemies[0].uid }).ok, false);
});

test('three pilots: Call moves the ally the player picks, to a node the player picks', () => {
  const s = squad(['hum_lang']);
  const tg = T.canPlay(s.m, s.h, 'hum_lang', 'P').tg;
  assert.equal(tg.need, 'node');
  assert.deepEqual(tg.allies.slice().sort(), [s.near.uid, s.far.uid].sort());
  const pick = T.canPlay(s.m, s.h, 'hum_lang', 'P', s.far.uid).tg;
  assert.equal(pick.ally, s.far.uid, 'the pick decides whose moves are offered');
  assert.ok(pick.options.includes(s.far.pos));
  const to = pick.options.find((x) => x !== s.far.pos);
  const at = s.near.pos;
  assert.ok(T.playFace(s.m, s.h, 'hum_lang', 'P', { ally: s.far.uid, node: to }).ok);
  assert.equal(s.far.pos, to);
  assert.equal(s.near.pos, at);
});

test('three pilots: Lend reaches only an ally beside you', () => {
  const s = squad(['hum_coop']);
  s.h.held = ['AP', 'AP', 'AP', 'AP'];
  s.h.pool = T.RULES.POOL - 4;
  const tg = T.canUseBasic(s.m, s.h, 'lend').tg;
  assert.equal(tg.need, 'none', 'one ally beside you: nothing to choose');
  assert.equal(tg.ally, s.near.uid);
  assert.equal(T.useBasic(s.m, s.h, 'lend', { ally: s.far.uid }).ok, false, 'the far ally is out of reach');
  const before = T.apValue(s.near);
  assert.ok(T.useBasic(s.m, s.h, 'lend').ok);
  assert.equal(T.apValue(s.near), before + 2);
});

test('three pilots: a face with a target of its own still lets the player choose the ally (Herd the Prey)', () => {
  const s = squad(['orc_tactics']);
  const tg = T.canPlay(s.m, s.h, 'orc_tactics', 'P').tg;
  assert.equal(tg.need, 'foe');
  assert.deepEqual(tg.allies.slice().sort(), [s.near.uid, s.far.uid].sort());
  assert.ok(T.playFace(s.m, s.h, 'orc_tactics', 'P', { target: tg.options[0], ally: s.far.uid }).ok);
  assert.ok(s.far.states.Empower && s.far.states.Empower.length, 'the chosen ally is empowered');
  assert.ok(!(s.near.states.Empower && s.near.states.Empower.length), 'the other is not');
});

test('the look-ahead player weighs every ally a face could reach', () => {
  const s = squad(['hum_coop']);
  const acts = T.legalActions(s.m).filter((a) => a.t === 'face' && a.card === 'hum_coop' && a.face === 'E');
  assert.deepEqual(acts.map((a) => a.ally).sort(), [s.near.uid, s.far.uid].sort());
  const copy = T.clone(s.m);
  assert.ok(
    T.applyAction(
      copy,
      acts.find((a) => a.ally === s.far.uid),
    ).ok,
  );
  assert.ok(T.apValue(copy.heroes[2]) > T.apValue(s.far));
});
