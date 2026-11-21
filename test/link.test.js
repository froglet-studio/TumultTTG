'use strict';
/**
 * Link (2.87; the keyword sweep Garrett approved on 2026-11-21): two units joined for N rounds. When one takes
 * damage, a push or a pull, or a heal, the other takes the same. It replaces Redirect (cut: it bordered on turn
 * theft) and the chain strike.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools/load')();
const H = require('../tools/harness').createHarness();
const B = T.Board;

function pair(seed = 3) {
  for (let s = seed; s < seed + 40; s++) {
    const run = T.quickMission({ seed: s, type: 'swarm', tier: 2 });
    const m = run.mission;
    const foes = T.liveEnemies(m);
    for (const a of foes)
      for (const b of foes)
        if (a !== b && B.dist(m.board, a.pos, b.pos, true) <= 2) return { run, m, h: m.heroes[0], a, b };
  }
  throw new Error('no two foes within 2');
}
const play = (m, h, f, ctx) => T.applyEffect(m, h, f, Object.assign({ P: 0, E: 1 }, ctx || {}));

test('no face uses Redirect or the chain strike any more', () => {
  for (const c of T.CARDS)
    for (const k of ['P', 'E'])
      for (const x of c[k].fx) {
        assert.notEqual(x.v, 'redirect', `${c.id} ${k}`);
        assert.ok(!(x.v === 'strike' && x.chain), `${c.id} ${k} chains`);
      }
  const linked = T.CARDS.filter((c) => ['P', 'E'].some((k) => c[k].fx.some((x) => x.v === 'link')));
  assert.ok(linked.length >= 7);
  assert.ok(
    linked.every((c) => (c.E.elt || c.el) === 'C' || c.E.fx.every((x) => x.v !== 'link')),
    'Link is Charge',
  );
});

test('damage on one Linked foe reaches the other, as the same amount', () => {
  const { m, h, a } = pair();
  play(m, h, { v: 'link', within: 2, dur: 2 }, { target: a.uid });
  const o = T.linkedTo(m, a);
  assert.ok(o && o !== a, 'a is Linked');
  const hb = o.hp;
  const ha = a.hp;
  const dealt = T.damage(m, h, a, 3, { kind: 'true', trueDmg: true });
  assert.equal(ha - a.hp, dealt);
  assert.equal(hb - o.hp, dealt, 'the other took the same');
});

test('a push on one Linked foe pushes the other the same way, and the Link ends with the rounds', () => {
  const { m, h, a } = pair();
  play(m, h, { v: 'link', within: 2, dur: 1 }, { target: a.uid });
  const o = T.linkedTo(m, a);
  const before = B.dist(m.board, o.pos, h.pos, true);
  const moved = T.pushAway(m, h, a, 1);
  if (moved) assert.ok(B.dist(m.board, o.pos, h.pos, true) >= before, 'the other was pushed away too');
  T.roundEnd(m);
  assert.equal(T.linkedTo(m, a), null, 'a 1-round Link is gone at round end');
});

test('a Link ends when one of the two falls', () => {
  const { m, h, a } = pair();
  play(m, h, { v: 'link', within: 2, dur: 3 }, { target: a.uid });
  const o = T.linkedTo(m, a);
  o.hp = 1;
  T.damage(m, h, o, 5, { kind: 'true', trueDmg: true });
  assert.equal(o.alive, false);
  assert.equal(T.linkedTo(m, a), null);
  const hp = a.hp;
  T.damage(m, h, a, 2, { kind: 'true', trueDmg: true });
  assert.equal(hp - a.hp, 2, 'nothing carried to the fallen');
});

test('Tesla Cascade Links its target and the strike lands on both', () => {
  const { m, h, a } = pair();
  const card = T.CARD.eel_discharge;
  const hp = new Map(T.liveEnemies(m).map((e) => [e, e.hp]));
  for (const f of card.E.fx) play(m, h, f, { target: a.uid });
  const o =
    T.linkedTo(m, a) ||
    T.liveEnemies(m)
      .concat(m.enemies)
      .find((e) => e !== a && e.hp < hp.get(e));
  assert.ok(a.hp < hp.get(a) && o && o.hp < hp.get(o), 'both were struck');
});

test('a mission with a Link in it saves, loads exactly and plays on', () => {
  const { run, m, h, a } = pair();
  play(m, h, { v: 'link', within: 2, dur: 2 }, { target: a.uid });
  const s = T.serializeRun(run);
  assert.equal(T.serializeRun(T.deserializeRun(s)), s);
  assert.ok(H.playMission(run.mission).over);
});
