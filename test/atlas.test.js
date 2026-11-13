'use strict';
/* The atlas (2.19): every mission is played on a fixed board from a page of the atlas, a kind of place on
   Tumult. A page names fifteen spaces A1–E3, so a mission written once places things on every page. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const LABELS = 'ABCDE'.split('').flatMap((c) => [1, 2, 3].map((r) => c + r));

/** Walk adjacency of a page's board (paths, plus ladders to high ground). */
function adjacency(b, { ladders = true } = {}) {
  const adj = {};
  const link = ([a, z]) => {
    (adj[a] = adj[a] || []).push(z);
    (adj[z] = adj[z] || []).push(a);
  };
  b.edges.forEach(link);
  if (ladders) b.climb.forEach(link);
  return adj;
}
function reach(adj, from, blocked = new Set()) {
  const seen = new Set([from]);
  const q = [from];
  while (q.length) {
    const x = q.shift();
    for (const y of adj[x] || []) {
      const k = [x, y].sort().join('-');
      if (!seen.has(y) && !blocked.has(k)) {
        seen.add(y);
        q.push(y);
      }
    }
  }
  return seen;
}

test('every page is a whole page: its spaces, zones, plate, rules and field notes', () => {
  assert.ok(T.ATLAS.length >= 9);
  const ids = new Set();
  for (const p of T.ATLAS) {
    assert.ok(!ids.has(p.id), `${p.id} is unique`);
    ids.add(p.id);
    assert.equal(T.PAGE_BY[p.id], p);
    assert.ok(['land', 'sea', 'air'].includes(p.ground), `${p.id}: ground`);
    assert.ok(p.gravity >= 0.1 && p.gravity <= 10, `${p.id}: gravity within Tumult's 0.1 to 10 g`);
    assert.deepEqual(Object.keys(p.spaces).sort(), LABELS.slice().sort(), `${p.id}: the fifteen named spaces`);
    for (const k of Object.keys(p.extras || {})) assert.match(k, /^X\d$/, `${p.id}: extra spaces are X1, X2…`);
    const key = p.plate.replace('scene/', '');
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'scenes', key + '.webp')), `${p.id}: plate ${key}`);
    assert.ok(p.name && p.blurb && p.weather, `${p.id}: name, blurb and weather`);
    assert.ok(p.rules.length >= 2, `${p.id}: the rules of this place`);
    assert.ok(p.notes.length >= 3 && p.notes.every((n) => n.h && n.t), `${p.id}: field notes`);
    // a page is a kind of place, never one named spot (Garrett, 2026-11-13)
    assert.doesNotMatch(p.name, /^The /, `${p.id}: the name is a kind of place`);
  }
});

test('every board is one connected place with at least two ways across', () => {
  for (const p of T.ATLAS) {
    const b = T.pageBoard(p);
    const N = b.nodes;
    const by = Object.fromEntries(Object.values(N).map((n) => [n.label, n.id]));
    for (const n of Object.values(N)) {
      assert.ok(n.zones.length >= 1 && n.zones.length <= 2, `${p.id} ${n.label}: one or two zones`);
      for (const z of n.zones) assert.ok(T.ZONES[z], `${p.id} ${n.label}: zone ${z} is known`);
    }
    for (const [a, z] of b.edges) assert.ok(N[a] && N[z] && a !== z, `${p.id}: every path joins two spaces`);
    const adj = adjacency(b);
    assert.equal(reach(adj, by.A2).size, Object.keys(N).length, `${p.id}: every space can be reached`);
    // ground spaces are reachable on foot alone
    const foot = reach(adjacency(b, { ladders: false }), by.A2);
    for (const l of LABELS) assert.ok(foot.has(by[l]), `${p.id}: ${l} is reachable on foot`);
    // two edge-disjoint routes from the near edge to the far edge: one blocked path never closes the board
    const first = (() => {
      const prev = { [by.A2]: null };
      const q = [by.A2];
      while (q.length) {
        const x = q.shift();
        for (const y of adjacency(b, { ladders: false })[x] || [])
          if (!(y in prev)) {
            prev[y] = x;
            q.push(y);
          }
      }
      const used = new Set();
      for (let x = by.E2; prev[x] != null; x = prev[x]) used.add([x, prev[x]].sort().join('-'));
      return used;
    })();
    assert.ok(
      reach(adjacency(b, { ladders: false }), by.A2, first).has(by.E2),
      `${p.id}: a second way from A2 to E2 when the first is blocked`,
    );
  }
});

test('every mission plays on every page, and its ledges never sit on another space', () => {
  for (const arch of Object.keys(T.MISSIONS))
    for (const p of T.ATLAS) {
      const run = T.newRun(7);
      H.prebuiltSquad(run, 0, 1);
      T.launchMission(run, arch, arch === 'boss' ? 3 : 2, p.id);
      const m = run.mission;
      assert.equal(m.page, p.id);
      const ns = Object.values(m.board.nodes);
      for (let i = 0; i < ns.length; i++)
        for (let j = i + 1; j < ns.length; j++)
          assert.ok(
            Math.hypot(ns[i].x - ns[j].x, ns[i].y - ns[j].y) >= 0.7,
            `${arch} on ${p.id}: ${ns[i].label} and ${ns[j].label} overlap`,
          );
      H.playMission(m, { maxRounds: 30 });
      assert.ok(m.over, `${arch} on ${p.id} ends`);
      assert.deepEqual(H.plainProblems(m), [], `${arch} on ${p.id} stays plain data`);
    }
});

test('a route gives each played stop a page of its leg’s ground, the same for the same seed', () => {
  const chart = (seed) => {
    const run = T.newRun(seed);
    H.prebuiltSquad(run, 0, 1);
    T.startMap(run);
    return run;
  };
  for (const seed of [1, 2, 3, 11]) {
    const run = chart(seed);
    const pages = Object.values(run.map.all).map((n) => n.page);
    assert.deepEqual(
      Object.values(chart(seed).map.all).map((n) => n.page),
      pages,
      'the same seed charts the same pages',
    );
    for (const n of Object.values(run.map.all)) {
      if (n.type === 'haven' || n.type === 'event') {
        assert.equal(n.page, null, 'havens and events are off the board');
        continue;
      }
      assert.ok(T.PAGE_BY[n.page], `stop ${n.id} has a page`);
      const leg = T.groundAt(run, n.row);
      if (leg) assert.equal(T.PAGE_BY[n.page].ground, leg, `stop ${n.id} is on its leg's ground`);
      // not the page you arrive from, while the ground has another to give
      const before = Object.values(run.map.all)
        .filter((o) => o.next.includes(n.id))
        .map((o) => o.page);
      const ground = T.PAGE_BY[n.page].ground;
      if (T.ATLAS.some((p) => p.ground === ground && !before.includes(p.id)))
        assert.ok(!before.includes(n.page), `stop ${n.id} is not on a page it is reached from`);
    }
    // and the mission played there is on that page
    const id = run.available.find((i) => T.MISSIONS[run.map.all[i].type]);
    T.chooseNode(run, id);
    assert.equal(run.mission.page, run.map.all[id].page);
  }
});

test('a save from 2.18 (mid-mission, on a grid) loads, keeps its board, and plays on onto pages', () => {
  const old = require('./fixtures/save-2.18.json');
  assert.equal(old.v, 7, 'the fixture is a version-7 save');
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.equal(run.mission.page, null, 'the mission in progress keeps its grid');
  assert.deepEqual(run.mission.board, old.mission.board);
  assert.ok(Object.values(run.map.all).every((n) => n.page === null));
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run), 'it saves again unchanged');
  const out = H.playRun(run);
  assert.ok(out.run.over);
});
