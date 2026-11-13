'use strict';
/* Canon from play (2.20): answers and corrections written while playing become proposed canon records,
   plain data kept apart from any run. They never touch rules, dice or a mission. */
const test = require('node:test');
const assert = require('node:assert/strict');
const loadTumult = require('../tools/load');

const T = loadTumult();
const AT = '2026-11-13T23:00:00.000Z';

/** A localStorage for Node, so the keeping functions can be tested. */
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

test('canon: every place, foe, event, patron and threat the game shows is a subject a record can name', () => {
  const subjects = ['world']
    .concat(T.ATLAS.map((p) => 'place:' + p.id))
    .concat(Object.keys(T.ENEMIES).map((k) => 'foe:' + k))
    .concat(T.EVENTS.map((e) => 'event:' + e.id))
    .concat(T.PATRONS.map((p) => 'patron:' + p.id))
    .concat(T.THREATS.map((t) => 'threat:' + t.id))
    .concat(T.PREBUILTS.map((h) => 'hero:' + h.id))
    .concat(['pilot:ANVIL', 'pilot:SPARE01']);
  for (const s of subjects) assert.ok(T.isCanonSubject(s), s);
  for (const s of ['', 'world:x', 'place:', 'nonsense:x', 'place:a b', 'place:<b>', null])
    assert.ok(!T.isCanonSubject(s), String(s));
});

test('canon: a record is plain data, starts proposed and private, and its id depends only on what it says', () => {
  const o = {
    subject: 'place:quarry',
    kind: 'wrong',
    claim: '  Uphill quarries move crystal on sledges,\n not ramps. ',
    shown: 'Dealers in heavy crystal bring boulders up the ramp by hand.',
    where: 'atlas:notes:2',
    context: { build: '2.20.0', page: 'quarry', players: 1, empty: '', none: null },
    at: AT,
  };
  const r = T.canonRecord(o);
  assert.ok(r.ok, r.why);
  assert.equal(r.rec.status, 'proposed');
  assert.equal(r.rec.public, false);
  assert.equal(r.rec.claim, 'Uphill quarries move crystal on sledges, not ramps.');
  assert.deepEqual(r.rec.context, { build: '2.20.0', page: 'quarry', players: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(r.rec)), r.rec, 'survives JSON unchanged');
  assert.equal(T.canonRecord(o).rec.id, r.rec.id, 'same input, same id');
  assert.notEqual(T.canonRecord(Object.assign({}, o, { claim: 'Other.' })).rec.id, r.rec.id);
  assert.match(r.rec.id, /^c_[0-9a-z]+$/);
});

test('canon: a record needs a known subject and kind, a time, and words unless it is a "love this"', () => {
  const base = { subject: 'foe:mite', kind: 'detail', claim: 'They nest in spoil heaps.', at: AT };
  assert.ok(T.canonRecord(base).ok);
  assert.ok(!T.canonRecord(Object.assign({}, base, { subject: 'mite' })).ok);
  assert.ok(!T.canonRecord(Object.assign({}, base, { kind: 'rewrite' })).ok);
  assert.ok(!T.canonRecord(Object.assign({}, base, { at: '' })).ok);
  assert.ok(!T.canonRecord(Object.assign({}, base, { claim: '   ' })).ok);
  assert.ok(T.canonRecord(Object.assign({}, base, { kind: 'love', claim: '' })).ok);
  assert.equal(T.canonRecord(Object.assign({}, base, { claim: 'x'.repeat(5000) })).rec.claim.length, 1000);
});

test('canon: records are kept on the device, newest last, and export as one JSON object per line', () => {
  withStorage(() => {
    assert.deepEqual(T.loadCanon(), []);
    const a = T.canonRecord({ subject: 'world', kind: 'detail', claim: 'A day lasts about an hour.', at: AT }).rec;
    const b = T.canonRecord({ subject: 'pilot:ANVIL', kind: 'answer', claim: 'A debt.', prompt: 'hook', at: AT }).rec;
    assert.ok(T.addCanon(a));
    assert.ok(T.addCanon(b));
    assert.ok(T.addCanon(a), 'the same record twice is kept once');
    const list = T.loadCanon();
    assert.deepEqual(
      list.map((r) => r.id),
      [b.id, a.id],
    );
    const lines = T.canonLines(list).split('\n');
    assert.equal(lines.length, 2);
    assert.deepEqual(JSON.parse(lines[0]), b);
    T.clearCanon();
    assert.deepEqual(T.loadCanon(), []);
  });
  assert.deepEqual(T.loadCanon(), [], 'no storage, no records, no throw');
});

test('canon: the device keeps at most the newest T.CANON_MAX_RECORDS', () => {
  withStorage(() => {
    for (let i = 0; i < T.CANON_MAX_RECORDS + 5; i++)
      T.addCanon(T.canonRecord({ subject: 'world', kind: 'detail', claim: 'Note ' + i, at: AT }).rec);
    const list = T.loadCanon();
    assert.equal(list.length, T.CANON_MAX_RECORDS);
    assert.equal(list[list.length - 1].claim, 'Note ' + (T.CANON_MAX_RECORDS + 4));
  });
});

test('canon: the pilot question offers three different hooks from the pool, and they change between runs', () => {
  const seen = new Set();
  for (let run = 0; run < 8; run++) {
    const h = T.canonHooks('ANVIL', run);
    assert.equal(new Set(h).size, 3);
    h.forEach((x) => assert.ok(T.CANON_HOOKS.includes(x)));
    seen.add(h.join('|'));
  }
  assert.ok(seen.size > 1);
});

/* ───────────── through the real page ───────────── */
const path = require('node:path');
const { pathToFileURL } = require('node:url');
let hasJsdom = true;
try {
  require.resolve('jsdom');
} catch {
  hasJsdom = false;
}
const skip = hasJsdom ? false : 'jsdom is not installed (run `npm install`)';

async function page() {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const { until } = require('../tools/ui-drive');
  const { JSDOM } = require('jsdom');
  const errors = [];
  const dom = new JSDOM(build().html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    beforeParse(w) {
      w.console.error = (...a) => errors.push(a.map(String).join(' '));
      w.addEventListener('error', (e) => errors.push((e.error && e.error.stack) || e.message));
    },
  });
  const w = dom.window;
  const d = w.document;
  await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
  const click = (sel) => {
    const el = d.querySelector(sel);
    assert.ok(el, 'nothing to click: ' + sel);
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  };
  return { w, d, click, errors, records: () => JSON.parse(w.localStorage.getItem('tumult_v2_canon') || '[]') };
}

test(
  'canon UI: correcting a field note in the atlas keeps a proposed record of what was shown',
  { skip, timeout: 60_000 },
  async () => {
    const { d, click, errors, records } = await page();
    click('[data-act="atlas"]');
    click('[data-act="atlasPage"][data-arg="quarry"]');
    const marks = d.querySelectorAll('.atlas-notes [data-act="canonMark"]');
    assert.equal(marks.length, T.PAGE_BY.quarry.notes.length + 1, 'a mark on the weather and on every note');
    click('.atlas-notes p:nth-of-type(2) [data-act="canonMark"]');
    assert.ok(d.querySelector('.canon-quote').textContent.includes(T.PAGE_BY.quarry.notes[0].t));
    click('[data-act="canonKind"][data-arg="detail"]');
    d.getElementById('canonText').value = 'The spoil heaps are sorted by colour.';
    click('[data-act="canonSave"]');
    const [r] = records();
    assert.equal(r.subject, 'place:quarry');
    assert.equal(r.kind, 'detail');
    assert.equal(r.where, 'atlas:notes:0');
    assert.equal(r.status, 'proposed');
    assert.equal(r.context.page, 'quarry');
    assert.ok(!d.querySelector('.modal'), 'the note closes once sent');
    assert.deepEqual(errors, []);
  },
);

test(
  'canon UI: the draft asks why the pilot guides, keeps an answer, and asks nothing once turned off',
  { skip, timeout: 60_000 },
  async () => {
    const { d, click, errors, records } = await page();
    click('[data-act="newRun"]');
    click('[data-act="prebuilt"][data-arg="cavitt"]');
    assert.ok(d.querySelector('.canon-ask'), 'the question sits under the upgrades');
    click('[data-act="canonHook"][data-arg="1"]');
    click('[data-act="confirmHero"]');
    const [r] = records();
    assert.match(r.subject, /^pilot:[A-Z0-9]+$/);
    assert.equal(r.kind, 'answer');
    assert.equal(r.prompt, 'hook');
    assert.equal(r.context.hero, 'Cavitt');
    assert.ok(T.CANON_HOOKS.includes(r.claim));
    // skipping is answering nothing
    click('[data-act="prebuilt"][data-arg="marish"]');
    click('[data-act="confirmHero"]');
    assert.equal(records().length, 1);
    // the list on the title screen turns the asking off
    click('[data-act="quitToTitle"]');
    click('[data-act="canonList"]');
    assert.equal(d.querySelectorAll('.canon-row').length, 1);
    click('[data-act="canonAsk"]');
    click('[data-act="closeModal"]');
    click('[data-act="newRun"]');
    click('[data-act="prebuilt"][data-arg="ossa"]');
    assert.ok(!d.querySelector('.canon-ask'), 'no question once turned off');
    assert.deepEqual(errors, []);
  },
);
