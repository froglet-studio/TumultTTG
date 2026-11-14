'use strict';
/**
 * A place is an opponent too (2.26): the gravity of its page and the weather of the day are rules,
 * each one sentence a player can resolve by hand, and each works on every unit alike.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;

/** A tier-1 swarm with its foes cleared away: a board to set units on by hand. */
function arena(seed = 3, place = {}) {
  const run = T.quickMission({ seed, type: 'swarm', tier: 1 });
  const m = run.mission;
  m.place = Object.assign({ gravity: 'normal', weather: 'calm', wind: 0 }, place);
  m.board.fog = m.place.weather === 'fog' ? T.FOG_RANGE : 0;
  m.enemies.forEach((e) => (e.alive = false));
  return m;
}
const free = (m) =>
  Object.keys(m.board.nodes)
    .map(Number)
    .filter((n) => !m.board.nodes[n].height && !T.occupied(m, n));

test('every page has a gravity band and weathers the game knows', () => {
  for (const p of T.ATLAS) {
    assert.ok(['light', 'normal', 'heavy'].includes(T.gravityBand(p.gravity)), p.id);
    assert.ok(p.skies.length >= 1 && p.skies.every((w) => T.WEATHER[w]), p.id);
  }
  assert.equal(T.gravityBand(0.1), 'light');
  assert.equal(T.gravityBand(1), 'normal');
  assert.equal(T.gravityBand(6), 'heavy');
  for (const b of T.GRAVITY) assert.ok(b.id === 'normal' || b.text.length > 10);
});

test('the weather is drawn from its own stream: the same seed, the same board under any sky', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const a = T.quickMission({ seed, type: 'vault', tier: 2 }).mission;
    const b = T.quickMission({ seed, type: 'vault', tier: 2 }).mission;
    assert.deepEqual(a.place, b.place);
    const page = T.PAGE_BY[a.page];
    assert.equal(a.place.gravity, T.gravityBand(page.gravity));
    assert.ok(page.skies.includes(a.place.weather));
    assert.equal(a.place.wind !== 0, a.place.weather === 'wind');
    assert.equal(a.board.fog, a.place.weather === 'fog' ? T.FOG_RANGE : 0);
    seen.add(a.place.weather);
  }
  assert.equal(seen.size, 3, 'calm, wind and fog all turn up');
});

test('light gravity carries a shove 1 space further; heavy makes each space hurt', () => {
  let found = 0;
  for (let seed = 1; seed <= 6 && !found; seed++) {
    const base = arena(seed);
    const h = base.heroes[0];
    const e = T.spawnEnemy(base, 'biter', 1, free(base)[0]);
    for (const at of free(base))
      for (const from of B.walkNeighbors(base.board, at)) {
        if (T.occupied(base, from) && base.heroes[0].pos !== from) continue;
        const cases = ['normal', 'light', 'heavy'].map((g) => {
          const m = T.clone(base);
          m.place.gravity = g;
          const mh = m.heroes[0];
          const me = m.enemies.find((x) => x.uid === e.uid);
          m.heroes[1].pos = -1;
          mh.pos = from;
          me.pos = at;
          const hp = me.hp;
          const moved = T.pushAway(m, mh, me, 1);
          return { moved, lost: hp - me.hp };
        });
        if (cases[0].moved === 1 && cases[1].moved === 2) {
          assert.equal(cases[0].lost, 0, 'a shove does no harm in normal gravity');
          assert.equal(cases[1].lost, 0);
          assert.equal(cases[2].moved, 1);
          assert.equal(cases[2].lost, 1, 'heavy: 1 damage for the space it was moved');
          found++;
        }
      }
    void h;
  }
  assert.ok(found, 'some board has room for a two-space shove');
});

test('the wind moves every unit 1 space downwind, unless a shield, an anchor or the Heart holds it', () => {
  const m = arena(3, { weather: 'wind', wind: 1 });
  const x = (n) => m.board.nodes[n].x;
  // put a hero where the wind has somewhere to take them, then blow
  const spot = free(m).find((n) => B.walkNeighbors(m.board, n).some((k) => x(k) >= x(n) + 0.5 && !T.occupied(m, k)));
  const [h, other] = m.heroes;
  other.downed = true;
  h.pos = spot;
  const c = T.clone(m);
  T.blowWind(c);
  assert.ok(x(c.heroes[0].pos) >= x(spot) + 0.5, 'blown downwind');
  assert.ok(B.walkNeighbors(m.board, spot).includes(c.heroes[0].pos), 'one step, along a path');
  // braced, they hold
  const s = T.clone(m);
  s.heroes[0].states.Shield = { v: 1, t: 1, all: false };
  T.blowWind(s);
  assert.equal(s.heroes[0].pos, spot);
  // the other way, they go the other way (or stay, with nowhere to go), never further downwind
  const back = T.clone(m);
  back.place.wind = -1;
  T.blowWind(back);
  assert.ok(x(back.heroes[0].pos) <= x(spot));
});

test('the wind blows at the end of the round, and the forecast shows it', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const run = T.quickMission({ seed, type: 'swarm', tier: 2 });
    const m = run.mission;
    if (m.place.weather !== 'wind') continue;
    const f = T.forecast(m);
    const real = T.clone(m);
    T.finishRound(real);
    real.heroes.forEach((h, i) => assert.equal(f.heroes[i].to, h.pos !== m.heroes[i].pos ? h.pos : null));
    return;
  }
  assert.fail('no windy swarm in 40 seeds');
});

test('fog: a ranged strike reaches only units within 2 steps, even in its zone', () => {
  const m = arena(3, { weather: 'fog' });
  const nodes = Object.keys(m.board.nodes).map(Number);
  let far = 0;
  for (const a of nodes)
    for (const b of nodes) {
      if (a === b || !B.sharesZone(m.board, a, b)) continue;
      const d = B.dist(m.board, a, b, true);
      assert.equal(B.los(m.board, a, b), d <= T.FOG_RANGE);
      if (d > T.FOG_RANGE) far++;
    }
  assert.ok(far, 'this board has a zone longer than the fog lets you see');
});

test('the rules of a place are told in a sentence each, and only when they apply', () => {
  assert.deepEqual(T.placeRules(arena(3)), []);
  const r = T.placeRules(arena(3, { gravity: 'heavy', weather: 'wind', wind: -1 }));
  assert.equal(r.length, 2);
  assert.match(r[0], /^Heavy gravity: /);
  assert.match(r[1], /^Wind, toward where you arrived \(A\): /);
});

test('a save from 2.24 (mid-mission) loads with calm, normal rules and plays on', () => {
  const old = require('./fixtures/save-2.24.json');
  assert.equal(old.v, 9, 'the fixture is a version-9 save');
  assert.equal(old.mission.place, undefined);
  const run = T.deserializeRun(JSON.stringify(old));
  assert.deepEqual(run.mission.place, { gravity: 'normal', weather: 'calm', wind: 0 });
  assert.ok(!run.mission.board.fog, 'no fog on a board from before fog');
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run));
  assert.ok(H.playMission(run.mission).over, 'the mission plays to its end');
});
