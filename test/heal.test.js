'use strict';
/**
 * Heal (2.90; the keyword sweep Garrett approved on 2026-11-21, "Heal raises the downed"): restore N vitality; a
 * downed pilot a Heal reaches gets up with N. It absorbs revive and phoenix (a held Heal, `ward`). Rally stays the
 * name of the basic action.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();
const H = require('../tools/harness').createHarness();
const B = T.Board;

function squad(seed = 3) {
  const run = T.quickMission({ seed, type: 'swarm', tier: 1 });
  const m = run.mission;
  const [h, ally] = m.heroes;
  return { run, m, h, ally };
}
const down = (m, u) => T.damage(m, null, u, 999, { kind: 'true', trueDmg: true });
const play = (m, h, f, ctx) => T.runEffects(m, h, [f], Object.assign({ P: 0, E: 0 }, ctx || {}));

test('no face uses revive or phoenix any more', () => {
  for (const c of T.CARDS)
    for (const k of ['P', 'E']) for (const x of c[k].fx) assert.ok(!['revive', 'phoenix'].includes(x.v), c.id);
  for (const g of T.GEAR)
    for (const a of g.abilities) for (const x of a.fx) assert.ok(!['revive', 'phoenix'].includes(x.v));
});

test('a party Heal gets a downed ally up with that much', () => {
  const { m, h, ally } = squad();
  down(m, ally);
  assert.ok(ally.downed);
  play(m, h, { v: 'heal', n: 3, party: true });
  assert.equal(ally.downed, false);
  assert.equal(ally.hp, 3);
});

test('a Heal for a downed ally beside you reaches only the one beside you', () => {
  const { m, h, ally } = squad();
  down(m, ally);
  ally.pos = Object.keys(m.board.nodes)
    .map(Number)
    .find((n) => !T.occupied(m, n) && B.dist(m.board, n, h.pos, true) >= 3);
  play(m, h, { v: 'heal', n: 4, target: 'downedAdj' });
  assert.ok(ally.downed, 'too far');
  ally.pos = B.walkNeighbors(m.board, h.pos).find((n) => !T.occupied(m, n));
  play(m, h, { v: 'heal', n: 4, target: 'downedAdj' });
  assert.equal(ally.downed, false);
  assert.equal(ally.hp, 4);
});

test('a held Heal (ward) lands when its holder would go down', () => {
  const { m, h } = squad();
  play(m, h, { v: 'heal', n: 6, ward: 3 });
  down(m, h);
  assert.equal(h.downed, false);
  assert.equal(h.hp, 6);
  down(m, h);
  assert.ok(h.downed, 'only once');
});

test('a mending Field gets up a downed pilot who ends the round in it', () => {
  const { m, h, ally } = squad();
  ally.pos = B.walkNeighbors(m.board, h.pos).find((n) => !T.occupied(m, n));
  play(m, h, { v: 'field', radius: 1, on: 'end', dur: 2, fx: [{ kw: 'heal', n: 3 }] });
  down(m, ally);
  T.roundEnd(m);
  assert.equal(ally.downed, false);
  assert.equal(ally.hp, 3);
});

test('a mission where Heals raise the downed plays to its end and saves exactly', () => {
  const { run, m, h, ally } = squad(6);
  down(m, ally);
  play(m, h, { v: 'heal', n: 2, party: true });
  const s = T.serializeRun(run);
  assert.equal(T.serializeRun(T.deserializeRun(s)), s);
  assert.ok(H.playMission(m).over);
});
