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

test('canon: every question gives a detail, asks about it, and offers three openings', () => {
  const ids = new Set();
  for (const p of T.CANON_PROMPTS) {
    assert.ok(!ids.has(p.id), 'unique id ' + p.id);
    ids.add(p.id);
    assert.ok(p.subject === 'pilot' || T.isCanonSubject(p.subject), p.id);
    assert.ok(p.detail.length > 20 && p.ask.endsWith('?'), p.id);
    assert.equal(p.angles.length, 3, p.id);
  }
  for (const page of T.ATLAS) {
    const n = T.CANON_PROMPTS.filter((p) => p.subject === 'place:' + page.id).length;
    assert.ok(n >= 3, `${page.id} has ${n} questions`);
  }
});

test('canon: a finished mission names its defining moments, most dramatic first, from the mission alone', () => {
  const hero = (uid, hp, downed) => ({ uid, hp, maxHp: 26, downed: !!downed });
  const kinds = (m) => T.canonMoments(m).map((x) => x.kind + x.hero);
  // down at the end beats a close call
  assert.deepEqual(kinds({ won: false, heroes: [hero(1, 2), hero(2, 0, true)], fx: [{ t: 'down', ent: 2 }] }), [
    'fell1',
  ]);
  // went down, got up: rallied; got up without going down (a seeded return): spared
  const m = {
    won: true,
    heroes: [hero(1, 9), hero(2, 14)],
    fx: [
      { t: 'dmg', ent: 1 },
      { t: 'down', ent: 1 },
      { t: 'revive', ent: 1 },
      { t: 'dmg', ent: 2 },
      { t: 'revive', ent: 2 },
    ],
  };
  assert.deepEqual(kinds(m), ['rallied0', 'spared1']);
  // a win on 3 vitality or less is a close call; a win without a hit is untouched; neither on a loss
  assert.deepEqual(kinds({ won: true, heroes: [hero(1, 26), hero(2, 3)], fx: [{ t: 'dmg', ent: 2 }] }), [
    'clutch1',
    'untouched0',
  ]);
  assert.deepEqual(kinds({ won: false, heroes: [hero(1, 26)], fx: [] }), []);
  assert.deepEqual(kinds({ won: true, heroes: [hero(1, 12)], fx: [{ t: 'dmg', ent: 1 }] }), [], 'an ordinary day');
  // every kind has a question with a detail, a question and three openings, its tokens filled
  for (const k of T.CANON_MOMENTS) {
    const p = T.canonMomentPrompt(
      'pilot:ANVIL',
      { kind: k.kind, hp: 2 },
      { name: 'Anvil', other: 'Doe', place: 'the Quarry', a: 'ant' },
    );
    assert.equal(p.id, 'moment.' + k.kind + ':pilot:ANVIL');
    assert.ok(p.ask.endsWith('?') && p.angles.length === 3, k.kind);
    assert.doesNotMatch(p.detail + p.ask + p.angles.join(''), /\{/, k.kind);
  }
  assert.equal(T.canonMomentPrompt('nobody', { kind: 'fell' }, {}), null);
});

test('canon: a real mission played to its end can be read for moments without changing it', () => {
  const heroes = [T.makeHero(T.PREBUILTS[0]), T.makeHero(T.PREBUILTS[1])];
  const m = { won: true, heroes, fx: [] };
  heroes.forEach((h, i) => (h.uid = i + 1));
  const before = JSON.stringify(m);
  assert.deepEqual(
    T.canonMoments(m).map((x) => x.kind),
    ['untouched', 'untouched'],
  );
  assert.equal(JSON.stringify(m), before);
});

test('canon: a place question is not asked again on a device until its others are answered', () => {
  const first = T.canonPrompt('place:quarry', { turn: 0 });
  assert.equal(first.subject, 'place:quarry');
  const seen = new Set([first.id]);
  let answered = [first.id];
  for (let k = 0; k < 2; k++) {
    const p = T.canonPrompt('place:quarry', { turn: 0, answered });
    assert.ok(!seen.has(p.id), 'a new question');
    seen.add(p.id);
    answered = answered.concat(p.id);
  }
  assert.ok(T.canonPrompt('place:quarry', { answered }), 'all answered: ask again rather than nothing');
  assert.equal(T.canonPrompt('place:nowhere', {}), null);
});

test('canon: a pilot gets their own question first, then shared ones with their name and clades', () => {
  const who = { name: 'Brikon Copperwright', a: 'yak', b: 'beetle' };
  const own = T.canonPrompt('pilot:ANVIL', { who });
  assert.equal(own.id, 'pilot.ANVIL');
  const next = T.canonPrompt('pilot:ANVIL', { who, answered: ['pilot.ANVIL'], turn: 1 });
  assert.match(next.id, /^pilot\.[a-z]+:pilot:ANVIL$/);
  assert.ok(!/\{(name|a|b)\}/.test(next.detail + next.ask + next.angles.join('')), 'tokens filled');
  const other = T.canonPrompt('pilot:ZODIAC', { who: { name: 'Ivelia Starreach', a: 'ocelot', b: 'heron' } });
  assert.match(other.id, /:pilot:ZODIAC$/, 'a pilot with no page gets a shared question');
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
  'canon UI: the draft asks about the pilot, keeps an embellished answer, and asks nothing once turned off',
  { skip, timeout: 60_000 },
  async () => {
    const { d, click, errors, records } = await page();
    click('[data-act="newRun"]');
    click('[data-act="prebuilt"][data-arg="cavitt"]');
    assert.ok(d.querySelector('.canon-ask .canon-detail'), 'the question sits under the upgrades');
    const key = 'draft0';
    click(`[data-act="canonAngle"][data-arg="${key}|1"]`);
    const box = d.getElementById('cp-' + key);
    assert.ok(box.value.length > 3, 'an opening is put in the box');
    box.value += 'they never speak of it.';
    box.dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
    click('[data-act="up"]'); // any redraw keeps what was typed
    assert.match(d.getElementById('cp-' + key).value, /never speak of it/);
    click('[data-act="confirmHero"]');
    const [r] = records();
    assert.match(r.subject, /^pilot:[A-Z0-9]+$/);
    assert.equal(r.kind, 'answer');
    assert.ok(
      T.CANON_PROMPTS.some((p) => r.prompt.split(':')[0] === p.id),
      r.prompt,
    );
    assert.equal(r.context.hero, 'Rosh');
    assert.match(r.claim, /never speak of it\.$/);
    assert.ok(r.shown.endsWith('?'), 'the detail and the question travel with the answer');
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

test(
  'canon UI: the end of a mission asks what a moment meant to the pilot it happened to',
  { skip, timeout: 60_000 },
  async () => {
    const { w, d, click, errors, records } = await page();
    const U = w.T.UI;
    const heroes = [w.T.makeHero(w.T.PREBUILTS[0]), w.T.makeHero(w.T.PREBUILTS[1])];
    heroes.forEach((h, i) => (h.uid = i + 1));
    heroes[1].hp = 0;
    heroes[1].downed = true;
    const m = { won: false, page: 'quarry', title: 'x', round: 5, heroes, fx: [{ t: 'down', ent: 2 }] };
    U.openModal(U.momentQuestion(m));
    const a = U.pilotOf(heroes[1]);
    assert.match(d.querySelector('.canon-ask').textContent, new RegExp(a.name + ' went down'));
    click('[data-act="canonAngle"][data-arg="moment|0"]');
    const box = d.getElementById('cp-moment');
    box.value += 'turned back for anyone.';
    click('[data-act="canonPromptSend"]');
    const [r] = records();
    assert.equal(r.subject, 'pilot:' + a.key);
    assert.equal(r.where, 'mission:moment');
    assert.equal(r.prompt, 'moment.fell:pilot:' + a.key);
    assert.equal(r.context.moment, 'fell');
    assert.equal(r.context.result, 'lost');
    assert.match(r.claim, /^After .+, .+ never again turned back for anyone\.$/);
    // nothing worth asking: no panel
    U.canonFlush();
    heroes.forEach((h) => ((h.hp = 12), (h.downed = false)));
    assert.equal(
      U.momentQuestion({
        won: true,
        heroes,
        fx: [
          { t: 'dmg', ent: 1 },
          { t: 'dmg', ent: 2 },
        ],
      }),
      '',
    );
    assert.deepEqual(errors, []);
  },
);

test(
  'canon UI: the end of a mission asks about its place, and Send keeps the answer once',
  { skip, timeout: 60_000 },
  async () => {
    const { w, d, click, errors, records } = await page();
    const U = w.T.UI;
    U.openModal(U.placeQuestion({ page: 'lagoon' }));
    assert.match(d.querySelector('.canon-ask').textContent, /Kelp Lagoon/);
    click('[data-act="canonPromptSend"]');
    assert.equal(records().length, 0, 'nothing typed, nothing sent');
    const box = d.querySelector('.canon-ask textarea');
    box.value = 'A song about the floats.';
    click('[data-act="canonPromptSend"]');
    const [r] = records();
    assert.equal(r.subject, 'place:lagoon');
    assert.equal(r.where, 'mission:end');
    assert.ok(d.querySelector('.canon-ask.sent'), 'the panel says it was sent');
    U.render();
    assert.ok(d.querySelector('.canon-ask.sent'), 'and still does after a redraw');
    U.canonFlush();
    assert.equal(records().length, 1, 'sent once');
    assert.deepEqual(errors, []);
  },
);
