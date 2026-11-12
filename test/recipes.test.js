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

/* ───────────────────── no option on a recipe is silently ignored ───────────────────── */

/**
 * Wrap a recipe so that every key the engine reads from it is recorded in `seen`. A formula
 * (a function of P and E) counts only once the engine evaluates it: read but never called,
 * it is being used as a plain truthy value.
 */
function spy(recipe, seen) {
  return new Proxy(recipe, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (typeof key !== 'string') return value;
      if (typeof value === 'function') return (...args) => (seen.add(key), value(...args));
      seen.add(key);
      // a nested recipe (onKill) is watched too, under "key.child"
      if (value && typeof value === 'object' && !Array.isArray(value))
        return spy(value, { add: (k) => seen.add(`${key}.${k}`) });
      return value;
    },
  });
}
const keysOf = (recipe, prefix = '') =>
  Object.entries(recipe).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? [prefix + k, ...keysOf(v, `${prefix}${k}.`)] : [prefix + k],
  );

/** Aim at the thick of it: a foe's own node, else a node beside a foe, else the first option. */
function nearFoe(tg, { m }) {
  if (tg.need !== 'node') return {};
  const foes = T.liveEnemies(m);
  const on = tg.options.find((n) => foes.some((e) => e.pos === n));
  const beside = tg.options.find((n) => foes.some((e) => B.adjacent(m.board, n, e.pos)));
  return { node: on != null ? on : beside != null ? beside : tg.options[0] };
}
/**
 * The situations a recipe is tried in. A key counts as read if the engine reads it in any
 * of them, so each exists to reach a branch the plain arena does not.
 */
const SITUATIONS = {
  plain: {},
  // foes that survive the first effect, one of them Anchored, and the action aimed at them
  crowded: {
    arrange: ({ adj, lane }) => {
      [adj, lane].filter(Boolean).forEach((e) => sturdy(e));
      adj.states.Anchored = { t: 3 };
    },
    choose: nearFoe,
  },
  // a foe that survives a hit but is left on low hp
  wounded: { arrange: ({ adj, lane }) => [adj, lane].filter(Boolean).forEach((e) => sturdy(e, 12)) },
  onHazard: { arrange: ({ m, h }) => (m.board.nodes[h.pos].hazard = true) },
  allyDown: {
    arrange: ({ m, h, ally }) => {
      ally.downed = true;
      ally.pos = B.walkNeighbors(m.board, h.pos).find((n) => !T.occupied(m, n));
    },
  },
};

/** Run `use(scene, situation)` in every situation with `holder.fx` spied on; return the keys never read. */
function unreadKeys(holder, use) {
  const original = holder.fx;
  const seen = original.map(() => new Set());
  holder.fx = original.map((x, i) => spy(x, seen[i]));
  try {
    for (const situation of Object.values(SITUATIONS)) use(situation);
  } finally {
    holder.fx = original;
  }
  return original.flatMap((x, i) =>
    keysOf(x)
      .filter((k) => !seen[i].has(k))
      .map((k) => `${x.v}.${k}`),
  );
}

test('no option on a card, gear or consumable recipe is ignored, and every formula is evaluated', () => {
  const ignored = [];
  const note = (where, keys) => keys.length && ignored.push(`${where}: ${keys.join(', ')}`);

  for (const card of T.CARDS)
    for (const faceKey of ['P', 'E'])
      note(
        `${card.id}.${faceKey}`,
        unreadKeys(card[faceKey], (situation) => H.fireFace(card.id, faceKey, situation)),
      );

  for (const gear of T.GEAR)
    gear.abilities.forEach((ability, ai) =>
      note(
        `${gear.id} — ${ability.n}`,
        unreadKeys(ability, ({ arrange, choose }) => {
          const scene = H.arena('hum_tool');
          scene.h.gear = [{ id: gear.id, cds: [0, 0] }];
          if (arrange) arrange(scene);
          const tg = T.targetsFor(scene.m, scene.h, ability.tgt, ability, 0, 0);
          const ctx = {};
          if (tg.need === 'foe' || tg.need === 'foeOrAlly') ctx.target = (tg.options || [])[0];
          if (tg.need === 'node') ctx.node = (tg.options || [])[0];
          if (choose && tg.options) Object.assign(ctx, choose(tg, scene));
          T.useGear(scene.m, scene.h, 0, ai, ctx);
          H.assertPlain(scene.m, `after ${gear.id} — ${ability.n}`);
        }),
      ),
    );

  for (const item of T.CONSUMABLES)
    note(
      item.id,
      unreadKeys(item, ({ arrange }) => {
        const scene = H.arena('hum_tool');
        scene.h.consumables = [item.id];
        if (arrange) arrange(scene);
        T.useConsumable(scene.m, scene.h, 0);
        H.assertPlain(scene.m, `after ${item.id}`);
      }),
    );

  assert.deepEqual(
    ignored,
    [],
    'the engine never reads these recipe options (or never evaluates their formula) — implement them or delete them',
  );
});

test('interact reaches a ledge from below only when its recipe says height', () => {
  const tryFromFloor = (fx) => {
    const scene = H.arena('hum_tool', { archetype: 'vault', tier: 1 });
    const { m, h } = scene;
    const ledge = m.objective.node;
    h.pos = B.allNeighbors(m.board, ledge).find((n) => !m.board.nodes[n].height && !T.occupied(m, n));
    T.runEffects(m, h, [fx], { P: 0, E: 0, node: ledge });
    return m.objective.done;
  };
  assert.equal(tryFromFloor({ v: 'interact', range: 1 }), 0, 'a plain reach cannot work the ledge from the floor');
  assert.equal(tryFromFloor({ v: 'interact', range: 1, height: true }), 1, 'Reach Rig can');
});
