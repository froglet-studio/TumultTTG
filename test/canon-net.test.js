'use strict';
/* The canon inbox (2.21): on the test page, notes written in play are sent to the page's store, and the
   lore lead marks each canon or rejected, public or private. Driven through the real playtest build in
   jsdom, with a stand-in store shared by two screens (a tester and the owner). The store's access rules
   are the platform's and are not modelled here; docs/reference/CANON.md lists them. */
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

/** Documents at paths, read back as JSON, as they would cross the store. */
function fakeDb() {
  const store = new Map();
  const parent = (p) => p.split('/').slice(0, -1).join('/');
  const snap = (p) => {
    const t = store.get(p);
    return { id: p.split('/').pop(), exists: t != null, data: () => (t == null ? undefined : JSON.parse(t)) };
  };
  const doc = (p) => ({
    id: p.split('/').pop(),
    get: async () => snap(p),
    set: async (d) => void store.set(p, JSON.stringify(d)),
    collection: (sub) => col(p + '/' + sub),
  });
  const col = (p) => ({
    doc: (id) => doc(p + '/' + id),
    get: async () => ({ docs: [...store.keys()].filter((k) => parent(k) === p).map(snap) }),
  });
  return { doc, collection: col, store };
}
function fakeUser(id, owner) {
  return {
    id: async () => id,
    isOwner: async () => owner,
    canEdit: async () => owner,
    profiles: async (ids) => Object.fromEntries(ids.map((i) => [i, { id: i, name: i === 'u_tester' ? 'Tess' : 'G' }])),
  };
}

async function open(html, db, user) {
  const { JSDOM } = require('jsdom');
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    beforeParse(w) {
      w.console.error = (...a) => errors.push(a.map(String).join(' '));
      w.addEventListener('error', (e) => errors.push((e.error && e.error.stack) || e.message));
      w.claude = { use: async (name) => (name === 'db' ? db : name === 'user' ? user : null) };
    },
  });
  const w = dom.window;
  const d = w.document;
  await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
  await until(() => w.T.UI.canonNet.ready, 'the store');
  const click = (sel) => {
    const el = d.querySelector(sel);
    assert.ok(el, 'nothing to click: ' + sel);
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  };
  return { w, d, U: w.T.UI, click, errors };
}

test(
  'canon inbox: a tester’s correction reaches the store; the owner marks it canon and public',
  { skip, timeout: 60_000 },
  async () => {
    const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
    const html = build({ playtest: true }).html;
    const db = fakeDb();

    // a tester corrects a field note
    const A = await open(html, db, fakeUser('u_tester', false));
    A.click('[data-act="atlas"]');
    A.click('[data-act="atlasPage"][data-arg="quarry"]');
    A.click('.atlas-notes p:nth-of-type(2) [data-act="canonMark"]');
    A.d.getElementById('canonText').value = 'The ramp is rebuilt every season.';
    A.click('[data-act="canonSave"]');
    await until(() => [...db.store.keys()].some((k) => k.startsWith('canon/u_tester/notes/')), 'the note in the store');
    assert.ok(db.store.has('canon/u_tester'), 'the contributor is listed');
    A.click('[data-act="atlasBack"]');
    A.click('[data-act="atlasBack"]');
    A.click('[data-act="canonList"]');
    assert.match(A.d.querySelector('.modal').textContent, /1 of 1 sent/);
    assert.ok(!A.d.querySelector('[data-act="canonInbox"]'), 'a tester has no inbox');

    // the owner opens the inbox, edits the wording, marks it canon and public
    const B = await open(html, db, fakeUser('u_garrett', true));
    B.click('[data-act="canonList"]');
    B.click('[data-act="canonInbox"]');
    await until(() => B.d.querySelector('.canon-item'), 'the inbox');
    const item = B.d.querySelector('.canon-item');
    assert.match(item.textContent, /place:quarry/);
    assert.match(item.textContent, /Tess/);
    const id = [...db.store.keys()]
      .find((k) => k.startsWith('canon/u_tester/notes/'))
      .split('/')
      .pop();
    B.d.getElementById('cv-' + id).value = 'The ramp is rebuilt after every collapse.';
    B.click(`[data-act="canonDecide"][data-arg="${id}|canon"]`);
    await until(() => db.store.has('canonReview/' + id), 'the decision');
    B.click(`[data-act="canonFilter"][data-arg="canon"]`);
    B.click(`[data-act="canonPublic"][data-arg="${id}"]`);
    await until(() => JSON.parse(db.store.get('canonReview/' + id)).public, 'public');
    const rv = JSON.parse(db.store.get('canonReview/' + id));
    assert.equal(rv.status, 'canon');
    assert.equal(rv.claim, 'The ramp is rebuilt after every collapse.');
    assert.equal(rv.from, 'u_tester');
    const decided = B.U.canonNet.decided(B.U.canonNet.items[0]);
    assert.equal(decided.status, 'canon');
    assert.equal(decided.public, true);
    assert.equal(decided.claim, 'The ramp is rebuilt after every collapse.');
    assert.deepEqual(A.errors.concat(B.errors), []);
  },
);

test(
  'canon inbox: notes written before the store answered are sent when it does',
  { skip, timeout: 60_000 },
  async () => {
    const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
    const html = build({ playtest: true }).html;
    const db = fakeDb();
    const { JSDOM } = require('jsdom');
    const rec = {
      id: 'c_early',
      subject: 'world',
      kind: 'detail',
      claim: 'Windbreaks are repaired before houses.',
      at: '2026-11-13T00:00:00.000Z',
      status: 'proposed',
      public: false,
    };
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'http://localhost/',
      beforeParse(w) {
        w.localStorage.setItem('tumult_v2_canon', JSON.stringify([rec]));
        w.claude = { use: async (name) => (name === 'db' ? db : name === 'user' ? fakeUser('u_t', false) : null) };
      },
    });
    await until(() => db.store.has('canon/u_t/notes/c_early'), 'the early note sent');
    assert.equal(JSON.parse(dom.window.localStorage.getItem('tumult_v2_canon_sent'))[0], 'c_early');
  },
);
