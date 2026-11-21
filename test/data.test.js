'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;

test('catalog: every clade carries nine traits, ids are unique', () => {
  assert.equal(new Set(T.CARDS.map((c) => c.id)).size, T.CARDS.length);
  assert.equal(new Set(T.SPECIES_ORDER).size, T.SPECIES_ORDER.length, 'no clade listed twice');
  for (const sp of T.SPECIES_ORDER) {
    assert.ok(T.SPECIES[sp], `${sp} is described`);
    assert.equal(T.cardsOf(sp).length, 9, `${sp} should have 9 cards`);
  }
  for (const c of T.CARDS) {
    assert.equal(c.clades[0], c.sp, `${c.id}: shown under its first clade`);
    for (const sp of c.clades) assert.ok(T.SPECIES[sp], `${c.id}: unknown clade ${sp}`);
  }
});

test('taxonomy: every clade has a trait of its own that no clade on its branch carries (Garrett, 2026-11-16)', () => {
  const branch = (sp) => T.SPECIES[sp].branch || sp;
  for (const sp of T.SPECIES_ORDER) {
    const kin = T.SPECIES_ORDER.filter((x) => x !== sp && branch(x) === branch(sp));
    if (!kin.length) continue;
    const own = T.cardsOf(sp).filter((c) => !c.clades.some((x) => kin.includes(x)));
    assert.ok(own.length >= 1, `${sp} needs a trait its kin (${kin.join(', ')}) do not carry`);
  }
});

test('primates carry some of Human’s traits, and no clade carries one from a branch it is not on', () => {
  for (const sp of ['orangutan', 'lemur', 'mandrill']) {
    assert.equal(T.SPECIES[sp].branch, 'Primates');
    assert.ok(
      T.cardsOf(sp).some((c) => c.sp === 'human'),
      `${sp} shares a Human trait`,
    );
  }
  for (const c of T.CARDS) {
    if (!c.kin) continue;
    for (const sp of c.clades.slice(1))
      assert.ok(
        T.SPECIES[sp].branch === c.kin || (T.SPECIES[sp].alsoKin || []).includes(c.kin) || T.SPECIES[sp].variant,
        `${c.id} is written for ${c.kin}; ${sp} is not on it`,
      );
  }
});

test('every face is well-formed and its text resolves at every P/E level', () => {
  for (const c of T.CARDS) {
    assert.ok(['M', 'C', 'S', 'T'].includes(c.el), `${c.id}: card etherion`);
    for (const fk of ['P', 'E']) {
      const f = c[fk];
      assert.ok(f && f.n && f.tgt && Array.isArray(f.fx) && f.fx.length, `${c.id}.${fk}: shape`);
      assert.equal(typeof f.ap, 'number', `${c.id}.${fk}: ap`);
      assert.equal(typeof f.cd, 'number', `${c.id}.${fk}: cd`);
      for (let P = 0; P <= T.RULES.P_CAP; P++) {
        for (let E = 0; E <= T.RULES.E_CAP; E++) {
          const s = f.txt(P, E);
          assert.ok(
            typeof s === 'string' && s.length > 0 && !/undefined|NaN/.test(s),
            `${c.id}.${fk} text at P${P}/E${E}: ${s}`,
          );
        }
      }
    }
    // The scaling grammar: the physical face costs AP only; the ethereal face always costs an etherion.
    assert.equal(c.P.el || 0, 0, `${c.id}: physical face must not cost etherions`);
    assert.ok(c.E.el >= 1, `${c.id}: ethereal face must cost at least one etherion`);
  }
});

test('a card plays at most once a turn: every face has a cooldown of at least 1', () => {
  for (const c of T.CARDS) for (const fk of ['P', 'E']) assert.ok(c[fk].cd >= 1, `${c.id}.${fk}: cd ${c[fk].cd}`);
});

test('every face grows with its card: the text at the top level differs from the first', () => {
  // an upgrade point spent on a card should always show; a face that never changes fades as a run goes on
  for (const c of T.CARDS) {
    assert.notEqual(c.P.txt(0, 1), c.P.txt(3, 3), `${c.id}.P does not scale with P`);
    assert.notEqual(c.E.txt(1, 1), c.E.txt(3, 3), `${c.id}.E does not scale with E`);
  }
});

test('no face is the key to a lock: nothing settles a recurring problem outright at every level', () => {
  // Balance pass, 2.73: a squad that holds the right card should find the problem easier, not gone.
  const at = (v, P, E) => (typeof v === 'function' ? v(P, E) : v);
  for (const c of T.CARDS)
    for (const fk of ['P', 'E'])
      for (const x of c[fk].fx) {
        const id = `${c.id}.${fk}`;
        if (x.v === 'reveal' && !x.target && !x.nearest) {
          assert.ok(at(x.radius, 1, 1) < 99, `${id}: reveals the whole board`);
          assert.ok(!x.findObjective, `${id}: finds the hidden objective from anywhere`);
        }
        if (x.v === 'reveal' && (x.target || x.nearest))
          assert.ok(at(x.dur, 3, 3) < 99, `${id}: locates a foe for the whole mission`);
        if (x.v === 'interact') assert.ok(!x.height, `${id}: works a ledge from the floor`);
        if (x.v === 'stripShield') assert.ok(x.amount != null, `${id}: deletes any Shield outright`);
        if (x.v === 'strike') assert.notEqual(x.stripShield, true, `${id}: deletes any Shield outright`);
        if (x.v === 'hazardImmune' && x.party)
          assert.ok(at(x.dur, 3, 3) <= 1, `${id}: the whole squad ignores hazards`);
      }
});

test('every face of every card fires without an engine error', () => {
  for (const c of T.CARDS) {
    for (const fk of ['P', 'E']) {
      const r = H.fireFace(c.id, fk); // throws on "Effect error" / "unimplemented verb"
      assert.equal(r.status, 'fired', `${c.id}.${fk} was not playable in the test arena (${r.why})`);
    }
  }
});

test('pre-made heroes are legal builds', () => {
  for (const pb of T.PREBUILTS) {
    assert.equal(pb.species[0], 'human', `${pb.id}: human is always the first bloodline`);
    assert.equal(pb.cards.length, T.RULES.START_CARDS, `${pb.id}: starting kit size`);
    const perSpecies = {};
    for (const id of pb.cards) {
      const c = T.CARD[id];
      assert.ok(c, `${pb.id}: unknown card ${id}`);
      assert.ok(pb.species.includes(c.sp), `${pb.id}: ${id} is not from one of its bloodlines`);
      perSpecies[c.sp] = (perSpecies[c.sp] || 0) + 1;
    }
    for (const n of Object.values(perSpecies)) assert.ok(n <= T.RULES.MAX_PER_SPECIES, `${pb.id}: 3-of-9 cap`);
    const spent = Object.values(pb.up).reduce((s, [p, e]) => s + p + e, 0);
    assert.ok(spent <= T.RULES.START_UP, `${pb.id}: spends ${spent} UP`);
  }
});

test('world data: ids are unique and entries are complete', () => {
  const uniq = (arr, what) => assert.equal(new Set(arr.map((x) => x.id)).size, arr.length, `${what} ids unique`);
  uniq(T.GEAR, 'gear');
  uniq(T.CONSUMABLES, 'consumable');
  uniq(T.BOONS, 'boon');
  uniq(T.EVENTS, 'event');
  for (const g of T.GEAR) {
    assert.equal(g.abilities.length, 2, `${g.id}: two abilities`);
    // paid in omnicrystals, or (a weapon's Overcharge, 2.101) in banked Omni dice
    for (const a of g.abilities)
      assert.ok(a.n && (a.cost >= 1 || a.omni >= 1) && Array.isArray(a.fx) && a.txt(), `${g.id}/${a.n}`);
  }
  for (const ev of T.EVENTS) assert.ok(ev.options.length >= 2 && ev.text && ev.title, `${ev.id}: at least two options`);
  for (const [id, e] of Object.entries(T.ENEMIES)) {
    assert.equal(e.hp.length, 3, `${id}: hp per tier`);
    assert.ok(e.policy && Object.keys(e.abilities).length >= 1, `${id}: policy + abilities`);
  }
});

test('every recipe names a verb and a targeting flow the engine knows (a typo fails here, not in play)', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../src/engine/engine.js'), 'utf8');
  // the case labels of a switch, from the line that opens a function to the next `default:`
  const cases = (opener, endMark) => {
    const from = src.indexOf(opener);
    assert.ok(from >= 0, `engine has ${opener}`);
    const body = src.slice(from, src.indexOf(endMark, from));
    return new Set([...body.matchAll(/case '([A-Za-z0-9_]+)'/g)].map((x) => x[1]));
  };
  const verbs = cases('T.applyEffect = function', 'unimplemented verb');
  const flows = cases('T.targetsFor = function', 'T.reachableWalk = function');
  assert.ok(verbs.size > 20 && flows.size > 10, 'the switches were found');

  const recipes = [];
  for (const c of T.CARDS) for (const fk of ['P', 'E']) recipes.push([`${c.id}.${fk}`, c[fk]]);
  for (const g of T.GEAR) for (const a of g.abilities) recipes.push([`${g.id} — ${a.n}`, a]);
  for (const item of T.CONSUMABLES) recipes.push([item.id, item]);
  for (const b of T.BASIC) recipes.push([`basic ${b.id}`, b]);

  const wrong = [];
  for (const [where, r] of recipes) {
    if (!flows.has(r.tgt)) wrong.push(`${where}: targeting '${r.tgt}'`);
    for (const fx of r.fx) if (!verbs.has(fx.v)) wrong.push(`${where}: verb '${fx.v}'`);
  }
  assert.deepEqual(wrong, []);
});
