'use strict';
/* Heroes players make (2.72): every pilot built in the draft is kept and can be chosen again beside the
   pre-made heroes; on the test page they are shared through the page's store. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const T = require('../tools/load')();

let hasJsdom = true;
try {
  require.resolve('jsdom');
} catch {
  hasJsdom = false;
}
const skip = hasJsdom ? false : 'jsdom is not installed (run `npm install`)';

function withStorage(fn) {
  const store = {};
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: (k) => delete store[k],
  };
  try {
    return fn(store);
  } finally {
    delete global.localStorage;
  }
}

/** A drafted hero, as the draft builds one: six picks, two awakened, the rest spent automatically. */
function drafted(seed, name, species) {
  const run = T.newRun(seed);
  const h = T.newDraftHero(run, name, 'the drafted', species);
  while (h.cards.length < T.RULES.START_CARDS) T.addCard(h, T.draftPack(run, h, 4)[0]);
  T.awaken(h);
  T.autoAllocate(h);
  return h;
}

test('a made hero comes back as it was built: the same cards and the same points', () => {
  for (let i = 0; i < 20; i++) {
    const h = drafted(500 + i, 'Pell', i % 2 ? ['owl', 'eel'] : ['otter', 'raven']);
    const rec = T.validMade(T.madeFrom(h, '2026-11-19T00:00:00.000Z'));
    assert.ok(rec, 'a drafted hero is a valid recipe');
    const back = T.heroFromPrebuilt(T.newRun(1), rec);
    assert.deepEqual(back.cards, h.cards);
    assert.deepEqual(back.up, h.up);
    assert.deepEqual(back.bound, h.bound);
    assert.equal(back.upUnspent, h.upUnspent);
    assert.equal(back.name, 'Pell');
  }
});

test('a trait taken twice before 2.77 keeps its own point when the hero is made again', () => {
  const shared = T.CARDS.find((c) => c.clades.filter((s) => s !== 'human').length >= 2);
  assert.ok(shared, 'some trait is shared by two clades');
  const sp = shared.clades.filter((s) => s !== 'human').slice(0, 2);
  const run = T.newRun(4);
  const h = T.newDraftHero(run, 'Wren', 'the drafted', sp);
  T.addCard(h, shared.id);
  assert.equal(T.addCard(h, shared.id).ok, false, 'a held trait is not taken again');
  h.bound[shared.id] = [T.RULES.DOUBLE_UP, 0]; // as a pilot saved before 2.77 holds it
  while (h.cards.length < T.RULES.START_CARDS) T.addCard(h, T.draftPack(run, h, 4)[0]);
  T.adjustUp(h, shared.id, 'P', 1); // from the bound point
  T.autoAllocate(h);
  const back = T.heroFromPrebuilt(T.newRun(1), T.validMade(T.madeFrom(h)));
  assert.deepEqual(back.bound, h.bound);
  assert.equal(back.upUnspent, h.upUnspent);
  assert.equal(T.boundLeft(back, shared.id), T.boundLeft(h, shared.id));
});

test('a shared recipe that breaks the rules is refused', () => {
  const good = T.madeFrom(drafted(7, 'Hale', ['owl', 'eel']));
  assert.ok(T.validMade(good));
  const bad = (f) => {
    const r = JSON.parse(JSON.stringify(good));
    f(r);
    return T.validMade(r);
  };
  assert.equal(
    bad((r) => (r.species = ['owl', 'eel', 'human'])),
    null,
    'human comes first',
  );
  assert.equal(
    bad((r) => (r.cards[0] = 'no_such_card')),
    null,
    'only real cards',
  );
  assert.equal(
    bad((r) => r.cards.pop()),
    null,
    'six cards at least',
  );
  assert.equal(
    bad((r) => (r.up[r.cards[0]] = [4, 0])),
    null,
    'P is capped',
  );
  assert.equal(
    bad((r) => r.cards.forEach((c) => (r.up[c] = [1, 1]))),
    null,
    'no more points than a new hero has',
  );
  assert.equal(
    bad((r) => (r.id = '<img>')),
    null,
    'ids are plain',
  );
  assert.equal(
    bad((r) => (r.name = '   ')),
    null,
    'a name',
  );
  const foreign = T.CARDS.find((c) => !c.clades.some((s) => good.species.includes(s)));
  assert.equal(
    bad((r) => (r.cards[0] = foreign.id)),
    null,
    'only the hero’s own bloodlines',
  );
});

test('made heroes are kept on the device, newest first, once each', () => {
  withStorage(() => {
    assert.deepEqual(T.loadMade(), []);
    const a = T.madeFrom(drafted(1, 'Orin', ['owl', 'eel']), 'a');
    const b = T.madeFrom(drafted(2, 'Lumen', ['otter', 'raven']), 'b');
    T.keepMade(a);
    T.keepMade(b);
    T.keepMade(a);
    assert.deepEqual(
      T.loadMade().map((r) => r.name),
      ['Orin', 'Lumen'],
    );
    T.forgetMade(a.id);
    assert.deepEqual(
      T.loadMade().map((r) => r.name),
      ['Lumen'],
    );
    assert.equal(T.keepMade({ name: 'nobody' }), null);
  });
});

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
  });
  const col = (p) => ({
    doc: (id) => doc(p + '/' + id),
    get: async () => ({ docs: [...store.keys()].filter((k) => parent(k) === p).map(snap) }),
  });
  return { doc, collection: col, store };
}
const fakeUser = (id) => ({
  id: async () => id,
  me: async () => ({ id, name: id === 'u_tess' ? 'Tess' : 'Bo' }),
  isOwner: async () => false,
  canEdit: async () => false,
  profiles: async (ids) => Object.fromEntries(ids.map((i) => [i, { id: i, name: i === 'u_tess' ? 'Tess' : 'Bo' }])),
});

test(
  'a pilot one player drafts on the test page is offered to the next player beside the pre-made heroes',
  { skip, timeout: 60_000 },
  async () => {
    const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
    const { until } = require('../tools/ui-drive');
    const { JSDOM } = require('jsdom');
    const html = build({ playtest: true }).html;
    const db = fakeDb();
    const open = async (user) => {
      const errors = [];
      const dom = new JSDOM(html, {
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        url: 'http://localhost/',
        beforeParse(w) {
          w.addEventListener('error', (e) => errors.push((e.error && e.error.stack) || e.message));
          w.claude = { use: async (name) => (name === 'db' ? db : name === 'user' ? user : null) };
        },
      });
      const w = dom.window;
      const d = w.document;
      await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
      await until(() => w.T.UI.heroesShared(), 'the store');
      const act = (a, arg) => {
        const el = d.querySelector(arg != null ? `[data-act="${a}"][data-arg="${arg}"]` : `[data-act="${a}"]`);
        assert.ok(el, `nothing to click: ${a} ${arg}`);
        el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
      };
      return { w, d, U: w.T.UI, act, errors };
    };

    // Tess drafts a pilot from packs
    const A = await open(fakeUser('u_tess'));
    A.act('newRun');
    A.act('draftMode', 'draft');
    A.act('pickSpecies', 'owl');
    A.act('pickSpecies', 'eel');
    A.act('openPacks');
    while (A.U.draft.step === 'packs') A.act('pickCard');
    const made = A.U.draft.hero;
    A.act('confirmHero');
    await until(() => db.store.has('heroes/u_tess'), 'the pilot in the store');
    assert.equal(JSON.parse(db.store.get('heroes/u_tess')).list[0].name, made.name);
    assert.equal(JSON.parse(db.store.get('heroes/u_tess')).who, 'Tess', 'with the name of the player who made it');
    assert.equal(A.w.T.loadMade().length, 1, 'kept on the device too');
    // a pre-made hero is not kept again
    A.act('prebuilt', 'cavitt');
    A.act('confirmHero');
    assert.equal(A.w.T.loadMade().length, 1);

    // Bo opens the page and finds Tess's pilot in the list
    const B = await open(fakeUser('u_bo'));
    B.act('newRun');
    await until(() => B.d.body.textContent.includes('Made by Tess'), 'the shared pilot');
    const id = JSON.parse(db.store.get('heroes/u_tess')).list[0].id;
    B.act('prebuilt', id);
    // the two screens are separate windows: compare as plain data
    const plain = (x) => JSON.parse(JSON.stringify(x));
    assert.deepEqual(plain(B.U.draft.hero.cards), plain(made.cards));
    assert.deepEqual(plain(B.U.draft.hero.up), plain(made.up));
    B.act('confirmHero');
    assert.equal(B.w.T.loadMade().length, 0, 'flying it leaves it Tess’s: it is not kept again as Bo’s');
    assert.ok(!db.store.has('heroes/u_bo'));
    assert.deepEqual(A.errors.concat(B.errors), []);
  },
);
