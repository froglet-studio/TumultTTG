'use strict';
/**
 * Playing online (src/ui/net.js, playtest build): two screens, one game, through a shared
 * store. Here the store is a small stand-in for the page host's `db` capability, shared by two
 * pages in jsdom: a host and a guest draft their own pilots, the guest's commands are carried
 * out on the host's screen, and players take turns, and a round ends when both have had theirs.
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

/**
 * A stand-in for the db capability: documents at paths, live listeners, leases. `opt` makes it
 * behave like the real store on a bad day: `lag` (ms) delays every live delivery, `deaf(path)` says
 * whether live delivery to listeners at that path has stopped, and `failWrite(path)` whether a write
 * there is refused as unavailable (once per call to it that says so).
 */
function fakeDb(opt = {}) {
  const store = new Map(); // path → JSON text
  const docSubs = new Map(); // path → Set(fn)
  const colSubs = []; // { path, fn, seen: Map(id → text), order }
  const later = (f) => setTimeout(f, opt.lag || 1);
  const deaf = (p) => !!(opt.deaf && opt.deaf(p));
  const unavailable = () => Promise.reject({ code: 'unavailable', message: 'the store did not answer' });
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
      if (!deaf(p)) for (const fn of docSubs.get(p) || []) fn(snap(p));
      for (const s of colSubs) if (s.path === parent(p) && !deaf(s.path)) fire(s);
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
      const docs = ids.map((id) => snap(s.path + '/' + id));
      s.fn({ docs, size: ids.length, empty: !ids.length, docChanges: () => changes });
    }
  }
  const leases = new Map();
  function doc(p) {
    return {
      id: p.split('/').pop(),
      path: p,
      get: async () => snap(p),
      set: async (d) => {
        if (opt.failWrite && opt.failWrite(p)) return unavailable();
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
      get: async () => {
        const ids = [...store.keys()].filter((k) => parent(k) === p);
        return { docs: ids.map(snap), size: ids.length, empty: !ids.length };
      },
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

const windows = [];
test.after(() => windows.forEach((w) => w.close())); // their timers would keep the run alive

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
  windows.push(w);
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

const SEED = 7;

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
  // a fixed seed, so the board and the opening dice are the same on every run of this test
  A.U.run.seed = SEED;
  A.U.run.rngs = {};
  A.U.net.publish();
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

  const ready = (P) => {
    P.act('endRound');
    if (P.U.ms.endConfirm) P.act('endRound');
  };
  const round = mA().round;
  // players take turns, the host first in round 1: the guest waits
  assert.match(B.d.querySelector('[data-act="endRound"]').textContent, /'s turn…/);
  ready(A);
  await until(() => B.U.run.party.ready[0], 'the guest to see the host end their turn');
  assert.equal(mA().round, round, "the host's turn ends; the round does not");
  assert.match(B.d.querySelector('[data-act="endRound"]').textContent, /End Round/);

  // the guest walks their pilot: carried out on the host's screen, seen on both
  const to = B.T.reachableWalk(mB(), mB().heroes[1], B.T.apValue(mB().heroes[1]), false)[0];
  assert.ok(to != null, 'the guest has somewhere to walk');
  B.U.exec({ op: 'walk', hero: 1, node: to });
  assert.equal(mB().heroes[1].pos, to, "the guest's screen moves at once, ahead of the host's answer");
  // a state the host wrote before it reached the walk: the walk is played again on top, never undone
  B.U.net.receive({
    rev: B.U.net.rev + 0.5,
    run: A.T.serializeRun(A.U.run),
    fx: JSON.stringify(mA().fx),
    results: '{}',
    names: A.U.net.names,
  });
  assert.equal(mB().heroes[1].pos, to, 'an older state from the host does not undo the walk');
  await until(() => mA().heroes[1].pos === to && mB().heroes[1].pos === to, 'the walk on both screens');
  // and cannot act for the host's pilot, even by sending the command itself
  const pos0 = mA().heroes[0].pos;
  const forged = { op: 'walk', hero: 0, node: mA().heroes[0].pos === to ? pos0 : to };
  assert.equal(B.U.exec(forged).ok, false, "the guest's own screen refuses it at once");
  A.U.net.carryOut('forged1', forged, [1]);
  assert.equal(mA().heroes[0].pos, pos0, "the host refuses a guest's command for the host's pilot");

  // the guest's turn is the last: ending it ends the round
  ready(B);
  await until(() => (mA().round > round || mA().over) && mB().round === mA().round, 'the next round on both');
  assert.equal(B.T.serializeRun(B.U.run), A.T.serializeRun(A.U.run), 'both screens hold the same game');
  assert.deepEqual(A.errors.concat(B.errors), []);
});

/** Host and guest in the first mission, on the guest's turn. */
async function toGuestTurn(db) {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const html = build({ playtest: true }).html;
  const A = await open(html, db);
  const B = await open(html, db);
  A.type('netName', 'Ana');
  A.act('netHost');
  await until(() => A.U.net.code && db.store.has('games/' + A.U.net.code), 'the game to open');
  B.type('netName', 'Bo');
  B.type('netCode', A.U.net.code);
  B.act('netJoin');
  await until(() => A.U.net.names[1] === 'Bo', 'the host to see the guest');
  A.act('netStart');
  A.U.run.seed = SEED;
  A.U.run.rngs = {};
  A.U.net.publish();
  await until(() => B.U.screen === 'draft' && B.U.draft && B.U.draft.heroIdx === 1, "the guest's draft");
  A.act('prebuilt', 'cavitt');
  A.act('confirmHero');
  B.act('prebuilt', B.T.PREBUILTS.find((p) => p.id !== 'cavitt').id);
  B.act('confirmHero');
  await until(() => A.U.screen === 'map' && B.U.screen === 'map', 'both screens on the map', 10000);
  const node = A.U.run.available.find((id) => !['haven', 'event'].includes(A.U.run.map.all[id].type));
  A.act('goNode', node);
  await until(() => B.U.screen === 'mission', "the guest's mission", 10000);
  A.act('endRound');
  if (A.U.ms.endConfirm) A.act('endRound');
  await until(() => B.U.run.party.ready[0], "the guest's turn", 10000);
  return { A, B };
}

/** Every walk the guest's pilot can take from where it stands, one node at a time. */
function steps(B, n) {
  const m = B.U.run.mission;
  const h = m.heroes[1];
  return B.T.reachableWalk(m, h, B.T.apValue(h), false).slice(0, n);
}

test(
  'online: a guest move the live delivery never brings is not lost or undone',
  { skip, timeout: 60_000 },
  async () => {
    let deafCmds = false;
    const db = fakeDb({ lag: 40, deaf: (p) => deafCmds && /\/cmds$/.test(p) });
    const { A, B } = await toGuestTurn(db);
    const mA = () => A.U.run.mission;
    const mB = () => B.U.run.mission;
    // the host's live view of the commands stops, as it did in the halted playtest
    deafCmds = true;
    const [to] = steps(B, 1);
    assert.ok(to != null, 'the guest has somewhere to walk');
    B.U.exec({ op: 'walk', hero: 1, node: to });
    assert.equal(mB().heroes[1].pos, to, 'the guest moves at once');
    // meanwhile the host writes a state that has not reached the walk (here: a name changes)
    A.U.net.names[1] = 'Bo.';
    A.U.net.publish();
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(mB().heroes[1].pos, to, 'a state without the walk does not undo it');
    // the host's look at the commands, every few seconds, finds it
    await until(() => mA().heroes[1].pos === to, 'the host to carry out the walk', 8000);
    await until(() => B.U.net.rev === A.U.net.rev, "the host's state on the guest's screen");
    assert.equal(mB().heroes[1].pos, to, 'the walk stands on both screens');
    assert.equal(B.T.serializeRun(B.U.run), A.T.serializeRun(A.U.run), 'both screens hold the same game');
    assert.deepEqual(A.errors.concat(B.errors), []);
  },
);

test(
  'online: a command whose write fails is sent again, and commands are carried out in order',
  { skip, timeout: 60_000 },
  async () => {
    let failNext = 0;
    const db = fakeDb({
      lag: 20,
      failWrite: (p) => /\/cmds\//.test(p) && failNext > 0 && failNext-- > 0,
    });
    const { A, B } = await toGuestTurn(db);
    const mA = () => A.U.run.mission;
    const mB = () => B.U.run.mission;
    const start = mB().heroes[1].pos;
    // the first walk's write is refused; the second goes through at once and must wait for it
    failNext = 1;
    const [a] = steps(B, 1);
    B.U.exec({ op: 'walk', hero: 1, node: a });
    const back = B.T.reachableWalk(mB(), mB().heroes[1], B.T.apValue(mB().heroes[1]), false).find(
      (n) => n !== a && n !== start,
    );
    assert.ok(back != null, 'somewhere to walk on to');
    B.U.exec({ op: 'walk', hero: 1, node: back });
    assert.equal(mB().heroes[1].pos, back);
    await new Promise((r) => setTimeout(r, 400));
    assert.equal(mA().heroes[1].pos, start, 'the second walk waits for the first');
    await until(() => mA().heroes[1].pos === back, 'both walks, in order, on the host', 10000);
    await until(() => B.U.net.rev === A.U.net.rev, "the host's state on the guest's screen");
    assert.equal(B.T.serializeRun(B.U.run), A.T.serializeRun(A.U.run), 'both screens hold the same game');
    assert.deepEqual(A.errors.concat(B.errors), []);
  },
);
