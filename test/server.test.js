'use strict';
/**
 * The online backend (server/, docs/reference/BACKEND.md), run in Node with a stand-in for the
 * Worker runtime (test/server-harness.js): the store's rules, a live game room, the lobby, and two
 * screens of the web version playing one game through them.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { loadServer, makeObject, testServer } = require('./server-harness');
const load = require('../tools/load');

let hasJsdom = true;
try {
  require.resolve('jsdom');
} catch {
  hasJsdom = false;
}

const ENV = {
  INVITE_SECRET: 'test-secret',
  CANON_LEADS: 'u_lead',
  CANON_REVIEWERS: 'u_rev',
  ALLOWED_ORIGIN: 'https://tumult.froglet.games,https://*.tumult.pages.dev',
};
const ANA = { userId: 'u_ana', guest: false, name: 'Ana' };
const BO = { userId: 'u_bo', guest: false, name: 'Bo' };
const GUEST = { userId: 'g_cy', guest: true, name: '' };
const LEAD = { userId: 'u_lead', guest: false, name: 'Lead' };
let S;
test.before(async () => {
  S = await loadServer();
});

/** A pilot recipe as the draft makes it. */
function recipe(T, name = 'Mara') {
  const p = T.PREBUILTS[0];
  const h = T.makeHero({ id: 'x', name, species: p.species, cards: p.cards.slice() });
  Object.assign(h.up, p.up || {});
  return T.madeFrom(h, '2026-11-20T10:00:00Z');
}
const refusedWith = async (p, code) => {
  await assert.rejects(p, (e) => e.code === code, `refused as ${code}`);
};

test('store: shared pilots are rebuilt by the game rules, and only their maker writes them', async () => {
  const T = load();
  const docs = S.store.memoryDocs();
  const { setDoc, getDoc, listDocs } = S.store;
  const good = recipe(T);
  const bad = Object.assign({}, good, { id: 'made_zzz', cards: good.cards.concat(['nope']) });
  const kept = await setDoc(docs, 'heroes/u_ana', { list: [good, bad, good], at: 'now' }, ANA, ENV, 100);
  assert.deepEqual(kept.list, [T.validMade(good)], 'a pilot the rules refuse is dropped, a repeat kept once');
  assert.equal((await getDoc(docs, 'heroes/u_ana', null, ENV)).data.list.length, 1, 'anyone reads shared pilots');
  assert.equal((await listDocs(docs, 'heroes', null, ENV)).length, 1);
  await refusedWith(setDoc(docs, 'heroes/u_ana', { list: [] }, BO, ENV, 10), 'permission-denied');
  await refusedWith(setDoc(docs, 'heroes/g_cy', { list: [] }, GUEST, ENV, 10), 'permission-denied');
  await refusedWith(setDoc(docs, 'heroes/u_ana', { list: [] }, null, ENV, 10), 'unauthenticated');
  await refusedWith(setDoc(docs, 'heroes/u_ana', { list: [] }, ANA, ENV, 1e6), 'too-large');
  await refusedWith(getDoc(docs, 'secrets/x', ANA, ENV), 'permission-denied');
  await refusedWith(getDoc(docs, '../etc', ANA, ENV), 'invalid-argument');
});

test('store: canon notes go to reviewers, and only a lore lead decides', async () => {
  const T = load();
  const docs = S.store.memoryDocs();
  const { setDoc, getDoc, listDocs } = S.store;
  const { rec } = T.canonRecord({
    subject: 'world',
    kind: 'detail',
    claim: 'The tide remembers.',
    at: '2026-11-20T10:00:00Z',
  });
  assert.ok(rec, 'a record to send');
  const kept = await setDoc(
    docs,
    `canon/u_ana/notes/${rec.id}`,
    Object.assign({}, rec, { status: 'canon', public: true }),
    ANA,
    ENV,
    500,
  );
  assert.equal(kept.status, 'proposed', 'a player cannot mark their own note canon');
  assert.equal(kept.public, false);
  await refusedWith(setDoc(docs, 'canon/u_ana/notes/c_wrong', rec, ANA, ENV, 500), 'invalid-argument');
  await refusedWith(setDoc(docs, `canon/g_cy/notes/${rec.id}`, rec, GUEST, ENV, 500), 'permission-denied');
  await setDoc(docs, 'canon/u_ana', { at: rec.at, last: rec.id }, ANA, ENV, 50);
  await refusedWith(listDocs(docs, 'canon', ANA, ENV), 'permission-denied');
  assert.equal(
    (await listDocs(docs, 'canon', { userId: 'u_rev', guest: false }, ENV)).length,
    1,
    'a reviewer reads the inbox',
  );
  assert.equal((await listDocs(docs, 'canon/u_ana/notes', ANA, ENV)).length, 1, 'a player reads their own notes');
  await refusedWith(getDoc(docs, `canon/u_ana/notes/${rec.id}`, BO, ENV), 'permission-denied');
  await refusedWith(
    setDoc(docs, 'canonReview/' + rec.id, { status: 'canon' }, { userId: 'u_rev', guest: false }, ENV, 50),
    'permission-denied',
  );
  await setDoc(docs, 'canonReview/' + rec.id, { status: 'canon', public: true }, LEAD, ENV, 50);
  await refusedWith(setDoc(docs, 'canonReview/' + rec.id, { status: 'maybe' }, LEAD, ENV, 50), 'invalid-argument');
});

test('store: saves are private, guests keep one, and a merged account keeps the newer', async () => {
  const T = load();
  const docs = S.store.memoryDocs();
  const { setDoc, getDoc, mergeDocs, deleteOwned } = S.store;
  const run = T.serializeRun(T.newRun(3));
  await setDoc(docs, 'saves/g_cy', { run, meta: { runs: 2 }, at: 200 }, GUEST, ENV, run.length);
  await refusedWith(getDoc(docs, 'saves/g_cy', ANA, ENV), 'permission-denied');
  await refusedWith(setDoc(docs, 'saves/g_cy', { run: '{not a save', at: 1 }, GUEST, ENV, 20), 'invalid-argument');
  await setDoc(docs, 'saves/u_ana', { run: null, meta: { runs: 9 }, at: 100 }, ANA, ENV, 50);
  await setDoc(docs, 'heroes/u_ana', { list: [recipe(T, 'Ana One')] }, ANA, ENV, 100);
  await docs.put('heroes/g_cy', 'g_cy', { list: [recipe(T, 'Cy One')] });
  await mergeDocs(docs, 'g_cy', 'u_ana');
  assert.equal((await docs.get('saves/u_ana')).at, 200, "the guest's newer save wins");
  assert.deepEqual(
    (await docs.get('heroes/u_ana')).list.map((r) => r.name),
    ['Ana One', 'Cy One'],
    'pilots are joined',
  );
  assert.equal(await docs.get('saves/g_cy'), null, 'nothing is left under the guest');
  await deleteOwned(docs, 'u_ana');
  assert.equal(await docs.get('heroes/u_ana'), null, 'a deleted account leaves nothing behind');
});

/** A socket into a room, for a player: send ops, read answers and pushes. */
async function enter(room, code, user, q = '') {
  const res = await room.fetch(
    new Request(`https://api.test/api/room/${code}${q}`, {
      headers: { Upgrade: 'websocket', 'x-tumult-user': JSON.stringify(user) },
    }),
  );
  if (!res.upgraded) return { refused: (await res.json()).error };
  const end = res.upgraded;
  const got = [];
  end.onmessage = (t) => got.push(JSON.parse(t));
  let n = 0;
  const ask = (msg) => {
    const id = ++n;
    end.send(JSON.stringify(Object.assign({ id }, msg)));
    return new Promise((ok, no) => {
      const look = () => {
        const a = got.find((m) => m.id === id);
        if (!a) return setTimeout(look, 2);
        if (a.ok) ok(a.result);
        else no(Object.assign(new Error(a.message), { code: a.error }));
      };
      look();
    });
  };
  return { ask, got, end };
}
const pause = (ms = 20) => new Promise((r) => setTimeout(r, ms));

test('room: one host, seats for five, commands only for your own seat, invites for guests', async () => {
  const { o: room } = makeObject(S.room.GameRoom, ENV);
  const g = 'games/ABCD';
  assert.equal((await enter(room, 'ABCD', null)).refused, 'unauthenticated');
  const a = await enter(room, 'ABCD', ANA);
  await refusedWith(a.ask({ op: 'set', path: g + '/seats/1', data: { name: 'x' } }), 'not-found');
  await a.ask({ op: 'set', path: g, data: { rev: 0 } });
  assert.equal((await enter(room, 'ABCD', GUEST)).refused, 'needs-account', 'a guest needs the invite');
  const { token } = await a.ask({ op: 'invite' });
  const c = await enter(room, 'ABCD', GUEST, '?invite=' + token);
  assert.ok(!c.refused, 'a guest with the invite comes in');
  assert.equal(
    (await enter(room, 'ABCD', GUEST, '?invite=' + token.replace(/^./, (x) => (x === 'A' ? 'B' : 'A')))).refused,
    'needs-account',
  );
  const b = await enter(room, 'ABCD', BO);
  await refusedWith(b.ask({ op: 'set', path: g, data: { rev: 9 } }), 'already-exists', 'only the host writes the game');
  await refusedWith(c.ask({ op: 'invite' }), 'permission-denied');

  // a watcher hears each change
  await a.ask({ op: 'watch', wid: 'w1', path: g + '/seats' });
  await b.ask({ op: 'set', path: g + '/seats/1', data: { name: 'Bo', holder: 'tab-b' } });
  await refusedWith(c.ask({ op: 'set', path: g + '/seats/1', data: { name: 'Cy' } }), 'permission-denied');
  for (const n of [2, 3, 4]) await c.ask({ op: 'set', path: `${g}/seats/${n}`, data: { name: 'Cy' + n } });
  await refusedWith(
    c.ask({ op: 'set', path: g + '/seats/5', data: { name: 'Six' } }),
    'invalid-argument',
    'five players at most',
  );
  await pause();
  const last = a.got.filter((m) => m.type === 'snap' && m.wid === 'w1').pop();
  assert.equal(last.docs.length, 4, 'the host sees all four guests');

  // commands
  await b.ask({ op: 'set', path: g + '/cmds/1-000000001', data: { cmd: { op: 'x' }, seat: 1, seq: 1 } });
  await refusedWith(
    b.ask({ op: 'set', path: g + '/cmds/2-000000001', data: { cmd: {}, seat: 2, seq: 1 } }),
    'permission-denied',
  );
  await refusedWith(
    b.ask({ op: 'set', path: g + '/cmds/2-000000002', data: { cmd: {}, seat: 1, seq: 2 } }),
    'invalid-argument',
  );
  assert.equal((await a.ask({ op: 'list', path: g + '/cmds' })).docs.length, 1);
  await refusedWith(c.ask({ op: 'delete', path: g + '/cmds/1-000000001' }), 'permission-denied');
  await a.ask({ op: 'delete', path: g + '/cmds/1-000000001' });
  await refusedWith(a.ask({ op: 'get', path: 'games/WXYZ' }), 'permission-denied', 'one room, one game');

  // the live channel and leases
  await b.ask({ op: 'emit', topic: 'cmd', data: { seq: 2 } });
  await pause();
  assert.ok(
    a.got.some((m) => m.type === 'msg' && m.topic === 'cmd' && m.data.seq === 2),
    'the host hears it',
  );
  assert.ok(!b.got.some((m) => m.type === 'msg'), 'not echoed to the sender');
  await refusedWith(b.ask({ op: 'emit', topic: 't', data: 'x'.repeat(5000) }), 'too-large');
  assert.equal((await b.ask({ op: 'acquire', path: g + '/seats/1', holder: 'tb', ttlMs: 3000 })).acquired, true);
  assert.equal((await c.ask({ op: 'acquire', path: g + '/seats/1', holder: 'tc', ttlMs: 3000 })).acquired, false);
});

test('room: a day without play forgets the game', async () => {
  const { o: room, ctx } = makeObject(S.room.GameRoom, ENV);
  const a = await enter(room, 'QQQQ', ANA);
  await a.ask({ op: 'set', path: 'games/QQQQ', data: { rev: 1 } });
  assert.ok(ctx.alarmAt > Date.now());
  const meta = ctx.store.get('meta');
  meta.last = Date.now() - 25 * 3600 * 1000;
  ctx.store.set('meta', meta);
  await room.alarm();
  assert.equal(ctx.store.size, 0);
});

test('lobby: who is online, one row a player, a game code only when its host opens it', async () => {
  const { cleanStatus, listOf } = S.presence;
  assert.deepEqual(cleanStatus({ where: 'game', open: { code: 'ABCD', players: 9, max: 9 } }), {
    where: 'game',
    open: { code: 'ABCD', players: 5, max: 5 },
  });
  assert.deepEqual(cleanStatus({ where: 'hacking', open: { code: 'ABCD' } }), { where: 'menu', open: null });
  const st = cleanStatus(null);
  const rows = listOf([
    { uid: 'g1', name: '', guest: true, since: 1, status: st },
    { uid: 'u2', name: 'Bo', guest: false, since: 1, status: st },
    { uid: 'u2', name: 'Bo', guest: false, since: 5, status: { where: 'solo', open: null } },
  ]);
  assert.deepEqual(
    rows.map((r) => [r.id, r.name, r.where]),
    [
      ['u2', 'Bo', 'solo'],
      ['g1', 'Guest', 'menu'],
    ],
  );
  const { o: lobby } = makeObject(S.presence.Presence, ENV);
  const join = async (user) => {
    const r = await lobby.fetch(
      new Request('https://api.test/api/lobby', {
        headers: { Upgrade: 'websocket', 'x-tumult-user': JSON.stringify(user) },
      }),
    );
    const got = [];
    r.upgraded.onmessage = (t) => got.push(JSON.parse(t));
    return { end: r.upgraded, got };
  };
  const a = await join(ANA);
  const b = await join(BO);
  b.end.send(JSON.stringify({ op: 'status', status: { where: 'game', open: { code: 'ABCD', players: 1, max: 2 } } }));
  await pause(600);
  const seen = a.got.pop();
  assert.deepEqual(
    seen.players.map((p) => p.name),
    ['Ana', 'Bo'],
  );
  assert.deepEqual(seen.players[1].open, { code: 'ABCD', players: 1, max: 2 });
  b.end.close();
  await pause(600);
  assert.deepEqual(
    a.got.pop().players.map((p) => p.name),
    ['Ana'],
    'a closed screen drops off',
  );
});

test('worker: health, CORS for Tumult pages only, sign-in routes go to the sign-in module', async () => {
  const W = S.index.default;
  const ok = await W.fetch(new Request('https://api.test/api/health'), ENV, {});
  assert.equal((await ok.json()).ok, true);
  const pre = (origin) =>
    W.fetch(
      new Request('https://api.test/api/doc/heroes/x', { method: 'OPTIONS', headers: { Origin: origin } }),
      ENV,
      {},
    );
  assert.equal((await pre('https://tumult.froglet.games')).status, 204);
  assert.equal((await pre('https://pr-12.tumult.pages.dev')).status, 204, 'a preview may call');
  assert.equal((await pre('https://evil.example')).status, 403);
  assert.equal((await pre('https://tumult.pages.dev.evil.example')).status, 403);
  const r = await W.fetch(
    new Request('https://api.test/api/doc/heroes/x', { headers: { Origin: 'https://tumult.froglet.games' } }),
    ENV,
    {},
  );
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://tumult.froglet.games');
  assert.equal(r.status, 503, 'no database bound in this test');
  const auth = await W.fetch(new Request('https://api.test/auth/session'), ENV, {});
  assert.ok(auth instanceof Response);
  assert.equal((await W.fetch(new Request('https://api.test/api/me'), ENV, {})).status, 401);
});

test('builds: the offline file has no server code; the web version talks only to its own server', async () => {
  const { build, buildWeb } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const offline = build({}).html;
  for (const f of ['web/backend-worker.js', 'web/server.js', 'ui/net.js'])
    assert.ok(!offline.includes(`───── ${f} ─────`), f);
  const { js } = buildWeb({});
  assert.ok(js.includes("name: 'tumult-worker'"));
});

/* ───────────── two screens of the web version, one game, through the server ───────────── */
const windows = [];
test.after(() => windows.forEach((w) => w.close()));

async function page(js, server, user, token) {
  const { JSDOM } = require('jsdom');
  const { until } = require('../tools/ui-drive');
  const errors = [];
  const listeners = [];
  const dom = new JSDOM('<!doctype html><div id="app"></div>', {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://tumult.test/?api=https://api.test',
    beforeParse(w) {
      w.console.error = (...a) => errors.push('console.error: ' + a.map(String).join(' '));
      w.addEventListener('error', (e) => errors.push('window.error: ' + ((e.error && e.error.stack) || e.message)));
      w.fetch = server.fetch;
      w.WebSocket = server.socketClass();
      // the sign-in module, as far as the backend asks it
      w.T = {
        Account: {
          token: () => token,
          user: () => ({ id: user.userId, name: user.name, guest: user.guest }),
          ensure: async () => {},
          onChange: (fn) => listeners.push(fn),
          signIn: () => {},
        },
      };
    },
  });
  const w = dom.window;
  windows.push(w);
  const s = w.document.createElement('script');
  s.textContent = js;
  w.document.body.appendChild(s);
  const d = w.document;
  await until(() => d.getElementById('app').innerHTML.length > 50, 'the first render');
  await until(() => w.T.UI.net.available, 'the store');
  w.T.UI.MISSION_OVER_DELAY = 0;
  const click = (sel) => {
    const el = d.querySelector(sel);
    assert.ok(el, `nothing to click: ${sel}`);
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  };
  const act = (a, arg) => click(arg != null ? `[data-act="${a}"][data-arg="${arg}"]` : `[data-act="${a}"]`);
  const type = (id, text) => (d.getElementById(id).value = text);
  const toasts = [];
  const toast = w.T.UI.toast;
  w.T.UI.toast = (m, ms) => (toasts.push(String(m)), toast(m, ms));
  return { w, d, T: w.T, U: w.T.UI, errors, act, type, toasts };
}

test(
  'online over the server: a host and an invited guest draft, fly and finish a round',
  { skip: hasJsdom ? false : 'jsdom is not installed', timeout: 90_000 },
  async () => {
    const { until } = require('../tools/ui-drive');
    const { buildWeb } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
    const { js } = buildWeb({});
    const server = testServer(S, ENV, { 'tok-ana': ANA, 'tok-cy': GUEST });
    const A = await page(js, server, ANA, 'tok-ana');
    const B = await page(js, server, GUEST, 'tok-cy');
    assert.equal(A.T.Backend.name(), 'tumult-worker');

    A.type('netName', 'Ana');
    A.act('netHost');
    await until(() => A.U.net.code && A.U.net.invite, 'the game and its invite link', 5000);
    const code = A.U.net.code;
    // without the invite, a guest is turned away and told how to get in
    B.type('netName', 'Cy');
    B.type('netCode', code);
    B.act('netJoin');
    await until(() => B.toasts.some((t) => /invite link/.test(t)), 'the guest to be told about invites');
    assert.equal(B.U.net.role, null);
    // with it, they are in
    const link = new URL(A.U.net.invite);
    assert.equal(link.searchParams.get('join'), code);
    B.T.Backend.use('db').then((db) => db.useInvite(code, link.searchParams.get('invite')));
    await new Promise((r) => setTimeout(r, 10));
    B.act('netJoin');
    await until(() => A.U.net.names[1] === 'Cy', 'the host to see the guest', 5000);

    A.act('netStart');
    A.U.run.seed = 7;
    A.U.run.rngs = {};
    A.U.net.publish();
    await until(() => B.U.screen === 'draft' && B.U.draft && B.U.draft.heroIdx === 1, "the guest's draft", 5000);
    A.act('prebuilt', 'cavitt');
    A.act('confirmHero');
    B.act('prebuilt', B.T.PREBUILTS.find((p) => p.id !== 'cavitt').id);
    B.act('confirmHero');
    await until(() => A.U.screen === 'map' && B.U.screen === 'map', 'both screens on the map', 10000);
    const node = A.U.run.available.find((id) => !['haven', 'event'].includes(A.U.run.map.all[id].type));
    A.act('goNode', node);
    await until(() => B.U.screen === 'mission', "the guest's mission", 10000);
    const mA = () => A.U.run.mission;
    const mB = () => B.U.run.mission;
    const round = mA().round;
    A.act('endRound');
    if (A.U.ms.endConfirm) A.act('endRound');
    await until(() => B.U.run.party.ready[0], "the guest's turn", 10000);
    const to = B.T.reachableWalk(mB(), mB().heroes[1], B.T.apValue(mB().heroes[1]), false)[0];
    B.U.exec({ op: 'walk', hero: 1, node: to });
    await until(() => mA().heroes[1].pos === to, "the guest's walk on the host's screen", 10000);
    B.act('endRound');
    if (B.U.ms.endConfirm) B.act('endRound');
    await until(() => (mA().round > round || mA().over) && mB().round === mA().round, 'the next round on both', 10000);
    await until(() => B.U.net.rev === A.U.net.rev, "the guest to hold the host's latest state", 10000);
    assert.equal(B.T.serializeRun(B.U.run), A.T.serializeRun(A.U.run), 'both screens hold the same game');
    // the room kept the game: a screen that comes back is caught up from it
    const kept = server.rooms.get(code).ctx.store.get('doc:games/' + code);
    assert.equal(kept.run, A.T.serializeRun(A.U.run));
    assert.deepEqual(
      A.errors.concat(B.errors).filter((e) => !/Not implemented: navigation/.test(e)),
      [],
    );
    A.w.close(); // their timers would outlive the test
    B.w.close();
  },
);
