'use strict';
/**
 * What a recipe says is what the engine does: conditions gate their effect whatever the
 * verb, and no option on a recipe is silently ignored.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;

/** Make a foe plain and durable so a test reads only the effect it is about. */
const sturdy = (e, hp = 40) => Object.assign(e, { hp, maxHp: hp, shield: 0, baseShield: 0, states: {} });
const minted = (h, face) => h.temp.filter((f) => f === face).length;

test('conditions: an unmet condition stops its effect whatever the verb; a met one lets it through', () => {
  // Each case: how to break the condition, and how to satisfy it.
  const conditions = {
    ifOnHazard: { unmet: () => {}, met: ({ m, h }) => (m.board.nodes[h.pos].hazard = true) },
    ifAnchored: { unmet: () => {}, met: ({ adj }) => (adj.states.Anchored = { t: 2 }) },
    ifAdjacent: {
      unmet: ({ m, h, adj }) => {
        adj.pos = Object.keys(m.board.nodes)
          .map(Number)
          .find((n) => !T.occupied(m, n) && B.dist(m.board, h.pos, n, true) >= 2);
      },
      met: () => {},
    },
    ifHpBelow: { value: 9, unmet: ({ adj }) => (adj.hp = 9), met: ({ adj }) => (adj.hp = 8) },
    ifE: { value: 2, unmet: () => {}, met: () => {}, E: [1, 2] },
  };
  // Verbs that never checked conditions before, each with a way to see whether it happened.
  const verbs = {
    mint: { fx: { v: 'mint', face: 'AP', n: 1 }, happened: ({ h }) => minted(h, 'AP') === 1 },
    shield: { fx: { v: 'shield', val: 2, dur: 1 }, happened: ({ h }) => !!h.states.Shield },
    weaken: { fx: { v: 'weaken', val: 1, dur: 1 }, happened: ({ adj }) => !!adj.states.Weak },
    mark: { fx: { v: 'mark' }, happened: ({ adj }) => !!adj.states.Marked },
    anchor: { fx: { v: 'anchor', who: 'self', dur: 1 }, happened: ({ h }) => !!h.states.Anchored },
  };
  for (const [cond, c] of Object.entries(conditions))
    for (const [verb, v] of Object.entries(verbs))
      for (const want of [false, true]) {
        const scene = H.arena('hum_tool');
        sturdy(scene.adj);
        scene.h.temp = [];
        (want ? c.met : c.unmet)(scene);
        const fx = Object.assign({}, v.fx, { [cond]: c.value == null ? true : c.value });
        const E = c.E ? c.E[want ? 1 : 0] : 0;
        T.runEffects(scene.m, scene.h, [fx], { P: 0, E, target: scene.adj.uid });
        assert.equal(v.happened(scene), want, `${verb} with ${cond} ${want ? 'met' : 'unmet'}`);
      }
});

test('Talon Strike — Pin Weakens only prey left at 8 hp or less', () => {
  const big = H.arena('owl_talon');
  sturdy(big.adj, 40);
  assert.ok(H.playIn(big, 'owl_talon', 'E').ok);
  assert.ok(big.adj.states.Anchored, 'pinned');
  assert.equal(big.adj.states.Weak, undefined, 'a 35-hp foe is not small prey');

  const small = H.arena('owl_talon');
  sturdy(small.adj, 13); // Pin hits for 3 + P (P 2 here) and leaves it at 8
  assert.ok(H.playIn(small, 'owl_talon', 'E').ok);
  assert.equal(small.adj.hp, 8);
  assert.deepEqual(small.adj.states.Weak, { v: 2, t: 1 });
});

test('Radiotrophic Resilience — Thrive mints its AP only on a hazard', () => {
  const dry = H.arena('cor_radio');
  dry.h.hp = 10;
  dry.h.temp = [];
  assert.ok(H.playIn(dry, 'cor_radio', 'P').ok);
  assert.equal(dry.h.hp, 11, 'off a hazard it heals 1');
  assert.equal(minted(dry.h, 'AP'), 0, 'and mints nothing');

  const wet = H.arena('cor_radio');
  wet.m.board.nodes[wet.h.pos].hazard = true;
  wet.h.hp = 10;
  wet.h.temp = [];
  assert.ok(H.playIn(wet, 'cor_radio', 'P').ok);
  assert.equal(wet.h.hp, 14, 'on a hazard it heals 2 + P');
  assert.equal(minted(wet.h, 'AP'), 1, 'and mints 1 AP');
});
