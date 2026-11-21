'use strict';
/**
 * Field (2.86; the keyword sweep Garrett approved on 2026-11-21): a marked space, or a set of them, that does
 * its keywords to whatever enters it or ends the round there. One keyword for what were snares, counted snares,
 * spore and musk zones, triggers and auras; a hazard reads as a Field of damage that belongs to nobody.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();
const H = require('../tools/harness').createHarness();
const B = T.Board;

function arena(seed = 3) {
  const run = T.quickMission({ seed, type: 'swarm', tier: 1 });
  const m = run.mission;
  const h = m.heroes[0];
  const foe = T.liveEnemies(m)[0];
  return { run, m, h, foe };
}
const lay = (m, h, f, ctx) => T.applyEffect(m, h, f, Object.assign({ P: 0, E: 0 }, ctx || {}));
const freeNeighbour = (m, node) => B.walkNeighbors(m.board, node).find((n) => !T.occupied(m, n));

test('no card uses the verbs Field replaced', () => {
  const old = ['trap', 'zone', 'ambushTrap', 'aura', 'clearHazard'];
  for (const c of T.CARDS)
    for (const k of ['P', 'E'])
      for (const x of c[k].fx) assert.ok(!old.includes(x.v), `${c.id} ${k} still uses ${x.v}`);
  const fielded = T.CARDS.filter((c) => ['P', 'E'].some((k) => c[k].fx.some((x) => x.v === 'field')));
  assert.ok(fielded.length >= 12, 'the snares, zones, triggers and auras are Fields now');
});

test('a snare Field springs on the first foe to enter, then is spent', () => {
  const { m, h, foe } = arena();
  const node = freeNeighbour(m, foe.pos);
  lay(
    m,
    h,
    {
      v: 'field',
      on: 'enter',
      trips: 1,
      fx: [
        { kw: 'strike', n: 3 },
        { kw: 'anchor', t: 1 },
      ],
    },
    { node },
  );
  assert.equal(m.fields.length, 1);
  const hp = foe.hp;
  T.moveEntity(m, foe, node, 'walk');
  assert.ok(foe.hp < hp, 'it took the strike');
  assert.ok(T.isAnchored(foe), 'and is Anchored');
  assert.equal(m.fields.length, 0, 'the Field is spent');
});

test("a Field's harm falls on foes, never its own side, and Hover is above it", () => {
  const { m, h, foe } = arena();
  const ally = m.heroes[1];
  const node = freeNeighbour(m, ally.pos);
  lay(m, h, { v: 'field', on: 'enter', trips: 1, fx: [{ kw: 'strike', n: 5 }] }, { node });
  const hp = ally.hp;
  T.moveEntity(m, ally, node, 'walk');
  assert.equal(ally.hp, hp, 'an ally walks through');
  assert.equal(m.fields.length, 1, 'and the Field is still armed');
  T.moveEntity(
    m,
    ally,
    B.walkNeighbors(m.board, node).find((n) => !T.occupied(m, n)),
    'walk',
  );
  foe.states.Hover = { t: 2 };
  const fhp = foe.hp;
  T.moveEntity(m, foe, node, 'walk');
  assert.equal(foe.hp, fhp, 'a hovering foe is off the ground');
});

test('push a foe into a Field and it springs (Field combines with Push and Pull)', () => {
  const { m, h, foe } = arena();
  // find a space next to the foe that a push from the hero's side would land on: lay the Field on every
  // neighbour of the foe, then push it 1
  for (const n of B.walkNeighbors(m.board, foe.pos))
    if (!T.occupied(m, n)) lay(m, h, { v: 'field', on: 'enter', trips: 1, fx: [{ kw: 'strike', n: 2 }] }, { node: n });
  const hp = foe.hp;
  const from = foe.pos;
  T.pushAway(m, h, foe, 1);
  if (foe.pos !== from) assert.ok(foe.hp < hp, 'the pushed foe landed in a Field and was struck');
});

test('a round-end Field springs on whoever ends there, and its Weaken lasts into the next round', () => {
  const { m, h, foe } = arena();
  lay(m, h, { v: 'field', radius: 1, on: 'end', dur: 2, fx: [{ kw: 'weaken', n: 1 }] }, { node: foe.pos });
  T.roundEnd(m);
  if (!foe.alive) return;
  assert.ok(foe.states.Weak, 'Weakened after the round ended (before 2.86 the tick took it at once)');
  assert.equal(m.fields.length, 1, 'one round left');
  T.roundEnd(m);
  assert.equal(m.fields.length, 0, 'gone after its 2 rounds');
});

test('a Field around you follows you, and a ring leaves out your own space', () => {
  const { m, h } = arena();
  lay(m, h, {
    v: 'field',
    around: true,
    ring: true,
    radius: 1,
    on: 'enter',
    trips: 1,
    dur: 2,
    fx: [{ kw: 'strike', n: 3 }],
  });
  const f = m.fields[0];
  assert.ok(!T.fieldNodes(m, f).includes(h.pos));
  const to = freeNeighbour(m, h.pos);
  T.moveEntity(m, h, to, 'walk');
  assert.deepEqual(T.fieldNodes(m, f).sort(), B.within(m.board, to, 1, true).sort(), 'it moved with you');
});

test('Cleanse the ground clears hazards and foes’ Fields, not your own', () => {
  const { m, h } = arena();
  const near = B.within(m.board, h.pos, 1, true);
  m.board.nodes[near[0]].hazard = true;
  m.fields.push({
    nodes: [near[0]],
    around: null,
    radius: 0,
    ring: false,
    on: 'end',
    trips: null,
    t: 2,
    owner: null,
    side: 'enemy',
    label: null,
    fx: [{ kw: 'strike', n: 2, t: 1 }],
  });
  lay(m, h, { v: 'field', on: 'enter', trips: 1, fx: [{ kw: 'strike', n: 2 }] }, { node: near[0] });
  lay(m, h, { v: 'cleanse', field: 1 });
  assert.equal(m.board.nodes[near[0]].hazard, false, 'the hazard is cleared');
  assert.deepEqual(
    m.fields.map((f) => f.side),
    ['hero'],
    'the foe Field is gone, yours stays',
  );
});

test('a mission with Fields in it saves, loads exactly and plays on', () => {
  const { run, m, h } = arena(5);
  lay(
    m,
    h,
    { v: 'field', radius: 1, on: 'end', dur: 2, fx: [{ kw: 'strike', n: 1 }, { kw: 'hidden' }] },
    { node: h.pos },
  );
  const s = T.serializeRun(run);
  assert.equal(T.serializeRun(T.deserializeRun(s)), s);
  assert.ok(H.playMission(run.mission).over);
});

test('a 2.85 save mid-round keeps its snares, zone, trigger and aura as Fields', () => {
  const old = require('./fixtures/save-2.85.json');
  assert.equal(old.v, 19, 'the fixture is a version-19 save');
  const run = T.deserializeRun(JSON.stringify(old));
  const m = run.mission;
  assert.equal(run.v, T.SAVE_VERSION);
  assert.equal(m.traps, undefined);
  assert.equal(m.zones, undefined);
  assert.equal(m.fields.length, 5, 'two snares, a zone, a trigger and an aura');
  assert.deepEqual(
    m.fields.map((f) => f.on),
    ['enter', 'end', 'end', 'enter', 'end'],
  );
  assert.ok(m.heroes.every((h) => !h.states.AmbushTrap && !h.states.Auras));
  assert.equal(m.fields[2].nodes.length > 1, true, 'the zone covers its neighbours');
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run));
  assert.ok(H.playMission(m).over);
});
