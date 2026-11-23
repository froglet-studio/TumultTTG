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

/** A stand-in for the room capability: named rooms whose moments reach every page in them. */
function fakeRooms() {
  const named = new Map(); // name → Set({ topic → Set(fn) })
  const page = () => {
    const mine = new Map(); // name → handlers of this page
    return {
      join: async (name) => {
        if (!named.has(name)) named.set(name, new Set());
        const hs = new Map();
        named.get(name).add(hs);
        mine.set(name, hs);
        return {
          name,
          emit: async (topic, data) => {
            const text = JSON.stringify(data);
            if (text.length > 4096) throw { code: 'invalid_argument', message: 'over 4 KiB' };
            for (const other of named.get(name))
              for (const fn of other.get(topic) || [])
                setTimeout(() => fn({ topic, data: JSON.parse(text), isMe: other === hs, sameTab: other === hs }), 1);
          },
          on: (topic, fn) => {
            if (!hs.has(topic)) hs.set(topic, new Set());
            hs.get(topic).add(fn);
            return () => hs.get(topic).delete(fn);
          },
          connected: () => true,
          leave: async () => named.get(name).delete(hs),
        };
      },
    };
  };
  return { page };
}

const windows = [];
test.after(() => windows.forEach((w) => w.close())); // their timers would keep the run alive

async function open(html, db, rooms) {
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
      const room = rooms ? rooms.page() : null;
      w.claude = { use: async (name) => (name === 'db' ? db : name === 'room' ? room : null) };
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
  assert.ok(A.d.querySelector('[data-act="hostOpen"]'), 'the title offers to host a table');

  A.act('hostOpen');
  A.type('netName', 'Ana');
  A.act('netHost');
  await until(() => A.U.net.code && db.store.has('games/' + A.U.net.code), 'the game to open');
  B.act('joinOpen');
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
  A.act('spotPilot', 'cavitt');
  A.act('prebuilt', 'cavitt');
  A.act('confirmHero');
  assert.equal(A.U.draft.step, 'wait', 'the host waits for the guest');
  B.act('spotPilot', B.T.PREBUILTS.find((p) => p.id !== 'cavitt').id);
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
  // players take turns in the order they choose: the round opens with either free to go first
  assert.match(B.d.querySelector('[data-act="endRound"]').textContent, /End Bo's turn/);
  assert.match(A.d.querySelector('[data-act="endRound"]').textContent, /End Ana's turn/);
  const held = mA().heroes[0].held.length;
  ready(A);
  await until(() => B.U.run.party.ready[0], 'the guest to see the host end their turn');
  assert.equal(mA().round, round, "the host's turn ends; the round does not");
  assert.ok(mA().heroes[0].rolledAhead, "the host's pilot rolls next round's dice as the turn ends");
  assert.ok(mA().heroes[0].held.length > held, 'and banks them at once, to plan with');
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
async function toGuestTurn(db, rooms) {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const html = build({ playtest: true }).html;
  const A = await open(html, db, rooms);
  const B = await open(html, db, rooms);
  A.act('hostOpen');
  A.type('netName', 'Ana');
  A.act('netHost');
  await until(() => A.U.net.code && db.store.has('games/' + A.U.net.code), 'the game to open');
  B.act('joinOpen');
  B.type('netName', 'Bo');
  B.type('netCode', A.U.net.code);
  B.act('netJoin');
  await until(() => A.U.net.names[1] === 'Bo', 'the host to see the guest');
  A.act('netStart');
  A.U.run.seed = SEED;
  A.U.run.rngs = {};
  A.U.net.publish();
  await until(() => B.U.screen === 'draft' && B.U.draft && B.U.draft.heroIdx === 1, "the guest's draft");
  A.act('spotPilot', 'cavitt');
  A.act('prebuilt', 'cavitt');
  A.act('confirmHero');
  B.act('spotPilot', B.T.PREBUILTS.find((p) => p.id !== 'cavitt').id);
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
    // a first step from which a second leads somewhere new (tried on a copy, so the dice do not decide the test)
    const onward = (m, a) => {
      const c = B.T.clone(m);
      B.T.walk(c, c.heroes[1], a);
      return B.T.reachableWalk(c, c.heroes[1], B.T.apValue(c.heroes[1]), false).find((n) => n !== a && n !== start);
    };
    const a = steps(B, 99).find((n) => onward(mB(), n) != null);
    assert.ok(a != null, 'somewhere to walk to, and on from');
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

test('online: a guest and then a host reload their page and rejoin the game', { skip, timeout: 60_000 }, async () => {
  const db = fakeDb({ lag: 20 });
  const { A, B } = await toGuestTurn(db);
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const html = build({ playtest: true }).html;
  const code = A.U.net.code;
  const [a, b] = [A, B].map((P) => P.U.net.remembered());
  assert.deepEqual([a.code, a.role, b.code, b.role], [code, 'host', code, 'guest'], 'each screen remembers its game');

  // the guest walks, then its page reloads: the old page goes quiet, a new one rejoins from the title
  const [to] = steps(B, 1);
  B.U.exec({ op: 'walk', hero: 1, node: to });
  await until(() => A.U.run.mission.heroes[1].pos === to, 'the walk on the host');
  B.U.net.leave();
  const B2 = await open(html, db);
  B2.w.localStorage.setItem('tumult_v2_net', JSON.stringify(b));
  B2.U.render();
  B2.act('netRejoin');
  await until(
    () => B2.U.screen === 'mission' && B2.U.run.mission.heroes[1].pos === to,
    'the guest back in the mission',
  );
  assert.equal(B2.U.ms.heroIdx, 1, 'on their own pilot');
  const next = steps(B2, 3).find((n) => n !== to);
  assert.ok(next != null);
  B2.U.exec({ op: 'walk', hero: 1, node: next });
  await until(() => A.U.run.mission.heroes[1].pos === next, "the rejoined guest's walk on the host");

  // now the host's page reloads and picks the game up from the state it last wrote
  await until(() => B2.U.net.rev === A.U.net.rev, 'the guest caught up');
  const before = A.T.serializeRun(A.U.run);
  A.U.net.leave();
  const A2 = await open(html, db);
  A2.w.localStorage.setItem('tumult_v2_net', JSON.stringify(a));
  A2.U.render();
  assert.match(A2.d.querySelector('[data-act="netRejoin"]').textContent, new RegExp(code));
  A2.act('netRejoin');
  await until(() => A2.U.screen === 'mission', 'the host back in the mission');
  assert.equal(A2.T.serializeRun(A2.U.run), before, 'the host picks up the game as it was');
  const third = steps(B2, 3).find((n) => n !== next);
  B2.U.exec({ op: 'walk', hero: 1, node: third });
  await until(() => A2.U.run.mission.heroes[1].pos === third, 'the guest plays on with the resumed host');
  await until(() => B2.U.net.rev === A2.U.net.rev, 'the guest takes the resumed host’s state');
  assert.equal(B2.T.serializeRun(B2.U.run), A2.T.serializeRun(A2.U.run), 'both screens hold the same game');
  assert.deepEqual(A.errors.concat(B.errors, A2.errors, B2.errors), []);
});

test(
  'online: with a live channel, moves cross at once even when the store is slow',
  { skip, timeout: 60_000 },
  async () => {
    let slow = false;
    // once play starts, the store hears nothing live: only reads and the room carry the game
    const db = fakeDb({ lag: 20, deaf: () => slow });
    const { A, B } = await toGuestTurn(db, fakeRooms());
    slow = true;
    const mA = () => A.U.run.mission;
    const [to] = steps(B, 1);
    const t0 = Date.now();
    B.U.exec({ op: 'walk', hero: 1, node: to });
    await until(() => mA().heroes[1].pos === to, 'the host to hear the walk');
    const heard = Date.now() - t0;
    assert.ok(heard < 1000, `the host heard the walk through the room, in ${heard} ms (a poll takes up to 2.5 s)`);
    await until(() => B.U.net.rev === A.U.net.rev, "the host's answer on the guest's screen");
    assert.equal(B.U.net.remembered().code, A.U.net.code);
    // the host's turn-taking reaches the guest fast too: the guest ends its turn, the round runs on the host
    const round = mA().round;
    B.act('endRound');
    if (B.U.ms.endConfirm) B.act('endRound');
    await until(() => mA().round > round || mA().over, 'the next round on the host');
    const t1 = Date.now();
    await until(() => B.U.net.rev === A.U.net.rev, 'the next round on the guest');
    assert.ok(Date.now() - t1 < 1500, 'the guest read the new state on the host’s word');
    assert.equal(B.T.serializeRun(B.U.run), A.T.serializeRun(A.U.run), 'both screens hold the same game');
    assert.deepEqual(A.errors.concat(B.errors), []);
  },
);

test('online: three screens join one game, draft a pilot each and set out', { skip, timeout: 60_000 }, async () => {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const html = build({ playtest: true }).html;
  const db = fakeDb();
  const A = await open(html, db);
  const B = await open(html, db);
  const C = await open(html, db);
  A.act('hostOpen');
  A.type('netName', 'Ana');
  A.act('netHost');
  await until(() => A.U.net.code && db.store.has('games/' + A.U.net.code), 'the game to open');
  B.act('joinOpen');
  B.type('netName', 'Bo');
  B.type('netCode', A.U.net.code);
  B.act('netJoin');
  await until(() => A.U.net.names[1] === 'Bo', 'the host to see the first guest');
  C.act('joinOpen');
  C.type('netName', 'Cy');
  C.type('netCode', A.U.net.code);
  C.act('netJoin');
  await until(() => A.U.net.names[2] === 'Cy', 'the host to see the second guest');
  assert.equal(C.U.net.seat, 2, 'the second guest takes the next seat');
  assert.match(A.d.querySelector('[data-act="netStart"]').textContent, /3 players/);

  A.act('netStart');
  A.U.run.seed = SEED;
  A.U.run.rngs = {};
  A.U.net.publish();
  assert.equal(A.U.run.party.owner.length, 3, 'three players fly three pilots');
  await until(() => C.U.screen === 'draft' && C.U.draft && C.U.draft.heroIdx === 2, "the second guest's draft");
  const ids = A.T.PREBUILTS.map((p) => p.id);
  A.act('spotPilot', ids[0]);
  A.act('prebuilt', ids[0]);
  A.act('confirmHero');
  B.act('spotPilot', ids[1]);
  B.act('prebuilt', ids[1]);
  B.act('confirmHero');
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(A.U.screen, 'draft', 'the map waits for every pilot');
  C.act('spotPilot', ids[2]);
  C.act('prebuilt', ids[2]);
  C.act('confirmHero');
  await until(() => [A, B, C].every((P) => P.U.screen === 'map'), 'every screen on the map');
  assert.equal(A.U.run.heroes.map((h, i) => A.T.ownerOf(A.U.run, i)).join(','), '0,1,2', 'a pilot each');
  // a fourth screen joins on the route (2.79): it brings a pilot, and the route waits for it
  const D = await open(html, db);
  D.act('joinOpen');
  D.type('netName', 'Di');
  D.type('netCode', A.U.net.code);
  D.act('netJoin');
  await until(() => D.U.net.seat === 3, 'the newcomer to take the next seat');
  await until(() => A.U.run.party.players.length === 4, 'the host to let the newcomer in');
  assert.equal(A.U.run.party.owner.length, 4, 'the newcomer brings a pilot of its own');
  await until(() => D.U.screen === 'draft' && D.U.draft && D.U.draft.heroIdx === 3, "the newcomer's draft");
  assert.equal(A.T.chooseNode(A.U.run, A.U.run.available[0]).ok, false, 'the route waits for its pilot');
  D.act('spotPilot', ids[3]);
  D.act('prebuilt', ids[3]);
  D.act('confirmHero');
  await until(() => A.U.run.heroes.length === 4 && D.U.screen === 'map', 'the newcomer on the route');
  await until(() => [B, C, D].every((P) => P.U.run.heroes.length === 4), 'every screen sees four pilots');
  assert.equal(A.T.scaleFor(A.U.run).size, 2, 'the next mission scales for four');
  assert.deepEqual(A.errors.concat(B.errors, C.errors, D.errors), []);
});

test(
  'online: a guest who sets out first waits for the host, whose draft goes on',
  { skip, timeout: 60_000 },
  async () => {
    // 2.74–2.79.0: the guest's pilot left a hole where the host's would go; every() skips holes, so the squad
    // set out without the host's pilot, and the host's draft screen broke on the hole
    const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
    const html = build({ playtest: true }).html;
    const db = fakeDb();
    const A = await open(html, db);
    const B = await open(html, db);
    A.act('hostOpen');
    A.type('netName', 'Ana');
    A.act('netHost');
    await until(() => A.U.net.code && db.store.has('games/' + A.U.net.code), 'the game to open');
    B.act('joinOpen');
    B.type('netName', 'Bo');
    B.type('netCode', A.U.net.code);
    B.act('netJoin');
    await until(() => A.U.net.names[1] === 'Bo', 'the host to see the guest');
    A.act('netStart');
    await until(() => B.U.screen === 'draft' && B.U.draft, "the guest's draft");
    const draft = (P, sp) => {
      P.act('draftMode', 'draft');
      sp.forEach((s) => P.act('pickSpecies', s));
      P.act('openPacks');
      while (P.U.draft.step === 'packs') P.act('pickCard', P.U.draft.pack[0]);
    };
    draft(A, ['owl', 'eel']);
    draft(B, ['owl', 'gecko']);
    B.act('confirmHero');
    await until(() => A.U.run.heroes[1], "the guest's pilot on the host");
    assert.equal(A.U.run.phase, 'draft', 'the squad waits for the host');
    assert.equal(A.U.screen, 'draft');
    const cid = A.U.draft.hero.cards[0];
    const left = A.U.draft.hero.upUnspent;
    A.act('up', cid + '|P|1');
    assert.equal(A.U.draft.hero.upUnspent, left - 1, "the host's upgrade is taken");
    A.act('confirmHero');
    await until(() => A.U.screen === 'map' && B.U.screen === 'map', 'both on the map');
    assert.ok(A.U.run.heroes[0] && A.U.run.heroes[1], 'both pilots set out');
    assert.deepEqual(A.errors.concat(B.errors), []);
  },
);

test(
  'online: the title lists the games being played, and a newcomer joins one from it',
  { skip, timeout: 60_000 },
  async () => {
    const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
    const html = build({ playtest: true }).html;
    const db = fakeDb();
    // a game whose host went quiet long ago, and one finished: neither offers a way in
    db.store.set(
      'lobby/QQQQ',
      JSON.stringify({
        code: 'QQQQ',
        host: 'Old',
        names: ['Old'],
        stage: 'On the route',
        open: true,
        at: Date.now() - 3600e3,
      }),
    );
    const A = await open(html, db);
    const B = await open(html, db);
    B.act('joinOpen');
    await until(() => B.d.getElementById('netGames'), 'the list on the Join screen');
    await until(
      () => /Quiet and finished games \(1\)/.test(B.d.getElementById('netGames').textContent),
      'the quiet game, folded',
    );
    assert.equal(B.d.querySelector('[data-act="netJoinGame"]'), null, 'a quiet game offers no way in');

    A.act('hostOpen');
    A.type('netName', 'Ana');
    A.act('netHost');
    await until(() => A.U.net.code && db.store.has('lobby/' + A.U.net.code), 'the game to be listed');
    const code = A.U.net.code;
    const listed = JSON.parse(db.store.get('lobby/' + code));
    assert.equal(listed.host, 'Ana');
    assert.equal(listed.open, true);
    assert.ok(JSON.stringify(listed).length < 600, 'the list entry stays small');
    // the guest types a name but no code, and joins from the list; the name typed is kept while the list updates
    B.type('netName', 'Bo');
    await until(() => B.d.querySelector(`[data-act="netJoinGame"][data-arg="${code}"]`), 'the game on the list');
    assert.match(B.d.getElementById('netGames').textContent, /Ana’s game/);
    assert.equal(B.d.getElementById('netName').value, 'Bo');
    B.act('netJoinGame', code);
    await until(() => A.U.net.names[1] === 'Bo', 'the host to see the guest');
    assert.equal(B.U.screen, 'lobby');
    await until(() => JSON.parse(db.store.get('lobby/' + code)).names.join() === 'Ana,Bo', 'the list to show both');

    A.act('netStart');
    A.U.run.seed = SEED;
    A.U.run.rngs = {};
    A.U.net.publish();
    const entry = () => JSON.parse(db.store.get('lobby/' + code));
    await until(() => entry().stage === 'Drafting pilots', 'the list to say the squad is drafting');
    assert.equal(entry().open, false, 'nobody new can join mid-draft');
    const ids = A.T.PREBUILTS.map((p) => p.id);
    await until(() => B.U.screen === 'draft', "the guest's draft");
    A.act('spotPilot', ids[0]);
    A.act('prebuilt', ids[0]);
    A.act('confirmHero');
    B.act('spotPilot', ids[1]);
    B.act('prebuilt', ids[1]);
    B.act('confirmHero');
    await until(() => A.U.screen === 'map', 'the route');
    await until(() => /^On the route/.test(entry().stage) && entry().open, 'the list to open a seat on the route');
    assert.equal(entry().pilots.length, 2, 'the list names the pilots');

    // the host leaves: the game leaves the list
    A.act('netLeave');
    await until(() => !db.store.has('lobby/' + code), 'the game off the list');
    assert.deepEqual(A.errors.concat(B.errors), []);
  },
);

test(
  'online: all at once, two screens act at the same moment and both moves stand',
  { skip, timeout: 60_000 },
  async () => {
    // Garrett, 2026-11-20: "players can all play in real time without taking turns"
    const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
    const html = build({ playtest: true }).html;
    const db = fakeDb({ lag: 40 });
    const A = await open(html, db);
    const B = await open(html, db);
    A.act('pt-rounds', 'live');
    A.act('hostOpen');
    A.type('netName', 'Ana');
    A.act('netHost');
    await until(() => A.U.net.code && db.store.has('games/' + A.U.net.code), 'the game to open');
    B.act('joinOpen');
    B.type('netName', 'Bo');
    B.type('netCode', A.U.net.code);
    B.act('netJoin');
    await until(() => A.U.net.names[1] === 'Bo', 'the host to see the guest');
    A.act('netStart');
    A.U.run.seed = SEED;
    A.U.run.rngs = {};
    A.U.net.publish();
    await until(() => B.U.screen === 'draft' && B.U.draft && B.U.draft.heroIdx === 1, "the guest's draft");
    assert.equal(A.U.run.party.rounds, 'live', "the host's way to play");
    A.act('spotPilot', 'cavitt');
    A.act('prebuilt', 'cavitt');
    A.act('confirmHero');
    B.act('spotPilot', B.T.PREBUILTS.find((p) => p.id !== 'cavitt').id);
    B.act('prebuilt', B.T.PREBUILTS.find((p) => p.id !== 'cavitt').id);
    B.act('confirmHero');
    await until(() => A.U.screen === 'map' && B.U.screen === 'map', 'both screens on the map', 10000);
    const node = A.U.run.available.find((id) => !['haven', 'event'].includes(A.U.run.map.all[id].type));
    A.act('goNode', node);
    await until(() => B.U.screen === 'mission', "the guest's mission", 10000);
    const mA = () => A.U.run.mission;
    assert.equal(B.U.run.party.rounds, 'live');
    assert.match(B.d.querySelector('[data-act="endRound"]').textContent, /Done/);
    // both walk at once: the guest's walk is on its way to the host while the host walks its own pilot
    const walkTo = (P, i) => {
      const m = P.U.run.mission;
      const blocked = new Set(m.heroes.map((h) => h.pos));
      return P.T.reachableWalk(m, m.heroes[i], P.T.apValue(m.heroes[i]), false).find((n) => !blocked.has(n));
    };
    const toB = walkTo(B, 1);
    const toA = A.T.reachableWalk(mA(), mA().heroes[0], A.T.apValue(mA().heroes[0]), false).find(
      (n) => n !== toB && !mA().heroes.some((h) => h.pos === n),
    );
    assert.ok(toA != null && toB != null, 'both have somewhere to walk');
    assert.ok(B.U.exec({ op: 'walk', hero: 1, node: toB }).ok !== false);
    assert.ok(A.U.exec({ op: 'walk', hero: 0, node: toA }).ok);
    A.U.net.publish();
    await until(
      () =>
        B.U.run.mission.heroes[0].pos === toA && mA().heroes[1].pos === toB && B.U.run.mission.heroes[1].pos === toB,
      'both walks on both screens',
    );
    const round = mA().round;
    B.act('endRound');
    if (B.U.ms.endConfirm) B.act('endRound');
    await until(() => A.U.run.party.ready[1], 'the host to see the guest done');
    assert.equal(mA().round, round, 'the round waits for the host');
    assert.ok(!mA().heroes[1].rolledAhead, 'nobody rolls ahead');
    A.act('endRound');
    if (A.U.ms.endConfirm) A.act('endRound');
    await until(
      () => (mA().round > round || mA().over) && B.U.run.mission.round === mA().round,
      'the next round on both',
    );
    await until(() => B.T.serializeRun(B.U.run) === A.T.serializeRun(A.U.run), 'both screens hold the same game');
    assert.deepEqual(A.errors.concat(B.errors), []);
  },
);

test('online: a player writes a line of story while another takes their turn', { skip, timeout: 60_000 }, async () => {
  // Garrett, 2026-11-20: "we should be able to keep adding things during other players turns"
  const db = fakeDb();
  const { A, B } = await toGuestTurn(db);
  assert.equal(A.T.turnSeat(A.U.run), 1, "the guest's turn");
  A.U.updateMission();
  const box = A.d.getElementById('turnNote');
  assert.ok(box, 'the host still has the story box');
  box.value = 'Cavitt watches the ledge while Bo climbs.';
  box.dispatchEvent(new A.w.Event('input', { bubbles: true }));
  box.dispatchEvent(new A.w.Event('change', { bubbles: true }));
  assert.ok(A.T.notesOf(A.U.run.mission).some((n) => n.hero === 0 && /watches the ledge/.test(n.text)));
  // and the guest, its turn ended, writes one while the round goes on elsewhere
  await until(() => B.d.getElementById('turnNote'), "the guest's story box");
  const gb = B.d.getElementById('turnNote');
  gb.value = 'Bo hums to the rope.';
  gb.dispatchEvent(new B.w.Event('input', { bubbles: true }));
  gb.dispatchEvent(new B.w.Event('change', { bubbles: true }));
  await until(
    () => A.T.notesOf(A.U.run.mission).some((n) => n.hero === 1 && /hums/.test(n.text)),
    "the guest's line on the host",
  );
  assert.deepEqual(A.errors.concat(B.errors), []);
  // stop both screens' timers: the windows close when the file's tests end
  B.U.net.leave();
  A.U.net.leave();
});

test('online: a host alone sets out with the AI filling the empty seats', { skip, timeout: 60_000 }, async () => {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const html = build({ playtest: true }).html;
  const db = fakeDb();
  const A = await open(html, db);
  A.act('hostOpen');
  A.act('setAiFill', 'open');
  A.type('netName', 'Ana');
  A.act('netHost');
  await until(() => A.U.net.code && db.store.has('games/' + A.U.net.code), 'the game to open');
  assert.ok(A.d.querySelector('[data-act="netStart"]').disabled, 'alone, with no AI, the table cannot set out');
  A.act('setAiFill', 'ai');
  A.act('setSeats', 3);
  A.act('setLength', 'short');
  assert.match(A.d.querySelector('.hm-seats').textContent, /AI fills it/);
  assert.match(A.d.querySelector('[data-act="netStart"]').textContent, /1 player \+ 2 AI/);
  // a guest's lobby shows what the host chose
  const B = await open(html, db);
  B.act('joinOpen');
  B.type('netName', 'Bo');
  B.type('netCode', A.U.net.code);
  B.act('netJoin');
  await until(() => A.U.net.names[1] === 'Bo', 'the host to see the guest');
  await until(() => B.U.net.tableOpts.seats === 3 && B.U.net.tableOpts.length === 'short', "the host's choices");
  A.act('netStart');
  A.U.run.seed = SEED;
  A.U.run.rngs = {};
  A.U.net.publish();
  const run = () => A.U.run;
  assert.equal(run().length, 'short');
  assert.equal(
    JSON.stringify(run().party.players.map((p) => p.ai || false)),
    '[false,false,"fill"]',
    'two people and the AI in the third seat',
  );
  assert.ok(run().heroes[2], "the AI's pilot is drafted at once");
  await until(() => B.U.screen === 'draft' && B.U.draft && B.U.draft.heroIdx === 1, "the guest's draft");
  // the AI drafts a random pre-made pilot as the game opens, so each person picks one it did not take
  const free = A.T.PREBUILTS.filter((p) => p.name !== run().heroes[2].name).map((p) => p.id);
  A.act('spotPilot', free[0]);
  A.act('prebuilt', free[0]);
  A.act('confirmHero');
  B.act('spotPilot', free[1]);
  B.act('prebuilt', free[1]);
  B.act('confirmHero');
  await until(() => A.U.screen === 'map' && B.U.screen === 'map', 'both screens on the map', 10000);
  assert.equal(run().map.rows.length, 5, 'a Short route');
  const node = run().available.find((id) => !['haven', 'event'].includes(run().map.all[id].type));
  A.act('goNode', node);
  await until(() => B.U.screen === 'mission', "the guest's mission", 10000);
  const m = () => run().mission;
  const round = m().round;
  A.act('endRound');
  if (A.U.ms.endConfirm) A.act('endRound');
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal(m().round, round, 'the AI waits for every person');
  B.act('endRound');
  if (B.U.ms.endConfirm) B.act('endRound');
  await until(() => m().round > round || m().over, 'the AI to take its turn and the round to go on', 10000);
  await until(() => B.U.run.mission.round === m().round, 'the guest to see it');
  assert.deepEqual(A.errors.concat(B.errors), []);
});

test(
  'online: a guest drops, the AI holds their seat, and they take it back by reloading',
  { skip, timeout: 60_000 },
  async () => {
    const db = fakeDb();
    const rooms = fakeRooms();
    const { A, B } = await toGuestTurn(db, rooms);
    A.U.net.DROP_MS = 300;
    A.U.net.HOLD_MS = 600;
    const m = () => A.U.run.mission;
    const round = m().round;
    B.U.net.leave(); // the guest's page goes quiet, mid-turn (it says nothing more and hears nothing)
    await until(() => A.U.net.away[1] != null, 'the host to see the guest drop', 5000);
    assert.match(A.d.getElementById('netAway').textContent, /Bo lost connection/);
    assert.ok(A.d.querySelector('[data-act="netGiveAI"]'), 'the host may give the seat to the AI at once');
    // the mission HUD shows the same: the squad row with its countdown, and a seat card with the host's two choices
    await until(() => A.d.querySelector('#msquad .sq-st.away [data-until]'), "the squad to show Bo's countdown", 5000);
    assert.match(A.d.querySelector('#mside .seat-panel').textContent, /Bo lost connection/);
    assert.ok(A.d.querySelector('#mside .seat-panel [data-act="netGiveAI"]'));
    await until(() => A.T.botKind(A.U.run, 1) === 'hold', 'the countdown to run out', 5000);
    await until(
      () => /AI/.test(A.d.querySelector('#msquad').textContent),
      'the squad to say the AI has the seat',
      5000,
    );
    await until(() => m().round > round || m().over, "the AI to finish Bo's turn", 10000);
    assert.equal(A.U.run.party.players[1].name, 'Bo', 'the seat keeps its name');
    // Bo reloads and rejoins: the seat is theirs again
    const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
    const B2 = await open(build({ playtest: true }).html, db, rooms);
    B2.act('joinOpen');
    B2.type('netName', 'Bo');
    B2.type('netCode', A.U.net.code);
    B2.act('netJoin');
    await until(() => B2.U.net.seat === 1, 'Bo to take their seat again', 10000);
    await until(() => !A.T.isBot(A.U.run, 1), 'the AI to give it back', 5000);
    await until(() => B2.U.screen === 'mission', "Bo's mission", 5000);
    assert.equal(A.d.getElementById('netAway'), null, 'nothing to say any more');
    // the host may also wait instead of handing the seat over
    A.U.net.DROP_MS = 1e9;
    A.U.net.waitFor(1);
    assert.equal(A.U.net.away[1], undefined);
    assert.deepEqual(A.errors.concat(B2.errors), []);
  },
);
