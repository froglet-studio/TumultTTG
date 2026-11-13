'use strict';
/**
 * Playing online (src/ui/net.js, playtest build): two screens, one game, through a shared
 * store. Here the store is a small stand-in for the page host's `db` capability, shared by two
 * pages in jsdom: a host and a guest draft their own pilots, the guest's commands are carried
 * out on the host's screen, and a round ends when both are ready.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let hasJsdom = true;
try {
  require.resolve('jsdom');
} catch {
  hasJsdom = false;
}
const skip = hasJsdom ? false : 'jsdom is not installed (run `npm install`)';
const { until } = require('../tools/ui-drive');

/** A stand-in for the db capability: documents at paths, live listeners, leases. */
function fakeDb() {
  const store = new Map(); // path → JSON text
  const docSubs = new Map(); // path → Set(fn)
  const colSubs = []; // { path, fn, seen: Map(id → text), order }
  const later = (f) => setTimeout(f, 1);
  const parent = (p) => p.split('/').slice(0, -1).join('/');
  const snap = (p) => {
    const t = store.get(p);
    return {
      id: p.split('/').pop(),
      exists: t != null,
      data: () => (t == null ? undefined : JSON.parse(t)),
      ref: doc(p),
      metadata: { fromCache: false, hasPendingWrites: false },
    };
  };
  function notify(p) {
    later(() => {
      for (const fn of docSubs.get(p) || []) fn(snap(p));
      for (const s of colSubs) if (s.path === parent(p)) fire(s);
    });
  }
  function fire(s) {
    const ids = [...store.keys()].filter((k) => parent(k) === s.path).map((k) => k.split('/').pop());
    const changes = [];
    for (const id of ids) {
      const t = store.get(s.path + '/' + id);
      if (!s.seen.has(id)) changes.push({ type: 'added', doc: snap(s.path + '/' + id) });
      else if (s.seen.get(id) !== t) changes.push({ type: 'modified', doc: snap(s.path + '/' + id) });
    }
    for (const id of s.seen.keys())
      if (!ids.includes(id)) changes.push({ type: 'removed', doc: snap(s.path + '/' + id) });
    s.seen = new Map(ids.map((id) => [id, store.get(s.path + '/' + id)]));
    if (s.order) changes.sort((a, b) => (a.doc.data() || {})[s.order] - (b.doc.data() || {})[s.order]);
    if (changes.length || s.first) {
      s.first = false;
      s.fn({ docs: changes.map((c) => c.doc), size: ids.length, empty: !ids.length, docChanges: () => changes });
    }
  }
  const leases = new Map();
  function doc(p) {
    return {
      id: p.split('/').pop(),
      path: p,
      get: async () => snap(p),
      set: async (d) => {
        store.set(p, JSON.stringify(d));
        notify(p);
      },
      update: async (d) => {
        store.set(p, JSON.stringify(Object.assign(JSON.parse(store.get(p)), d)));
        notify(p);
      },
      delete: async () => {
        store.delete(p);
        notify(p);
      },
      acquire: async ({ holder, ttlMs = 30000 }) => {
        const l = leases.get(p);
        if (l && l.holder !== holder && l.until > Date.now()) return { acquired: false };
        leases.set(p, { holder, until: Date.now() + ttlMs });
        return { acquired: true, holder };
      },
      onSnapshot: (fn) => {
        if (!docSubs.has(p)) docSubs.set(p, new Set());
        docSubs.get(p).add(fn);
        later(() => fn(snap(p)));
        return () => docSubs.get(p).delete(fn);
      },
      collection: (sub) => col(p + '/' + sub),
    };
  }
  function col(p, order) {
    return {
      path: p,
      doc: (id) => doc(p + '/' + id),
      orderBy: (f) => col(p, f),
      onSnapshot: (fn) => {
        const s = { path: p, fn, seen: new Map(), order, first: true };
        colSubs.push(s);
        later(() => fire(s));
        return () => colSubs.splice(colSubs.indexOf(s), 1);
      },
    };
  }
  return { doc, collection: col, store };
}

async function open(html, db) {
  const { JSDOM } = require('jsdom');
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    beforeParse(w) {
      w.console.error = (...a) => errors.push('console.error: ' + a.map(String).join(' '));
      w.addEventListener('error', (e) => errors.push('window.error: ' + ((e.error && e.error.stack) || e.message)));
      // data crosses between the two pages as JSON, as it would through the store
      w.claude = { use: async (name) => (name === 'db' ? db : null) };
    },
  });
  const w = dom.window;
  const d = w.document;
  await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
  await until(() => w.T.UI.net.available, 'the store');
  w.T.UI.MISSION_OVER_DELAY = 0;
  const click = (sel) => {
    const el = d.querySelector(sel);
    assert.ok(el, `nothing to click: ${sel}`);
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  };
  const act = (a, arg) => click(arg != null ? `[data-act="${a}"][data-arg="${arg}"]` : `[data-act="${a}"]`);
  const type = (id, text) => (d.getElementById(id).value = text);
  return { w, d, T: w.T, U: w.T.UI, errors, click, act, type };
}

test('online: two screens draft, fly and ready up in one game', { skip, timeout: 60_000 }, async () => {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const html = build({ playtest: true }).html;
  const db = fakeDb();
  const A = await open(html, db);
  const B = await open(html, db);
  assert.ok(A.d.querySelector('[data-act="netHost"]'), 'the title offers to play online');

  A.type('netName', 'Ana');
  A.act('netHost');
  await until(() => A.U.net.code && db.store.has('games/' + A.U.net.code), 'the game to open');
  B.type('netName', 'Bo');
  B.type('netCode', A.U.net.code.toLowerCase());
  B.act('netJoin');
  await until(() => A.U.net.names[1] === 'Bo', 'the host to see the guest');
  assert.equal(B.U.screen, 'lobby');

  A.act('netStart');
  await until(() => B.U.screen === 'draft' && B.U.draft && B.U.draft.heroIdx === 1, "the guest's draft");
  assert.deepEqual(
    [A.U.run.party.players[0].name, A.U.run.party.players[1].name],
    ['Ana', 'Bo'],
    'the players are named',
  );
  A.act('prebuilt', 'cavitt');
  A.act('confirmHero');
  assert.equal(A.U.draft.step, 'wait', 'the host waits for the guest');
  B.act('prebuilt', B.T.PREBUILTS.find((p) => p.id !== 'cavitt').id);
  B.act('confirmHero');
  await until(() => A.U.screen === 'map' && B.U.screen === 'map', 'both screens on the map');
  assert.equal(B.U.run.heroes.length, 2);

  // a guest cannot choose the route; the host takes the first mission on offer
  const node = A.U.run.available.find((id) => !['haven', 'event'].includes(A.U.run.map.all[id].type));
  B.act('goNode', node);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(A.U.screen, 'map');
  A.act('goNode', node);
  await until(() => B.U.screen === 'mission', "the guest's mission");
  const mA = () => A.U.run.mission;
  const mB = () => B.U.run.mission;
  assert.equal(B.U.ms.heroIdx, 1, 'the guest starts on their own pilot');

  // the guest walks their pilot: carried out on the host's screen, seen on both
  const to = B.T.reachableWalk(mB(), mB().heroes[1], B.T.apValue(mB().heroes[1]), false)[0];
  assert.ok(to != null, 'the guest has somewhere to walk');
  B.U.exec({ op: 'walk', hero: 1, node: to });
  await until(() => mA().heroes[1].pos === to && mB().heroes[1].pos === to, 'the walk on both screens');
  // and cannot act for the host's pilot, even by sending the command itself
  const pos0 = mA().heroes[0].pos;
  const rev = A.U.net.rev;
  B.U.exec({ op: 'walk', hero: 0, node: mA().heroes[0].pos === to ? pos0 : to });
  await until(() => A.U.net.rev > rev, 'the host to answer');
  assert.equal(mA().heroes[0].pos, pos0, "the host refuses a guest's command for the host's pilot");

  // the round ends once both have said they are ready
  const round = mA().round;
  const ready = (P) => {
    P.act('endRound');
    if (P.U.ms.endConfirm) P.act('endRound');
  };
  ready(A);
  await until(() => B.U.run.party.ready[0], 'the guest to see the host ready');
  assert.match(B.d.querySelector('[data-act="endRound"]').textContent, /1\/2/);
  assert.equal(mA().round, round);
  ready(B);
  await until(() => (mA().round > round || mA().over) && mB().round === mA().round, 'the next round on both');
  assert.equal(B.T.serializeRun(B.U.run), A.T.serializeRun(A.U.run), 'both screens hold the same game');
  assert.deepEqual(A.errors.concat(B.errors), []);
});
