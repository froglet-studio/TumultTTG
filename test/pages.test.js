'use strict';
/* The pages around the game (2.84): Make a pilot, and the loading screen, through the real page. */
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
  await until(() => w.document.getElementById('app').innerHTML, 'the first render');
  return { w, d: w.document, U: w.T.UI, errors };
}

test(
  'Make a pilot, then Draft their cards: the drafted pilot keeps its callsign, domain and story',
  { skip, timeout: 60_000 },
  async () => {
    const { w, U, errors } = await page();
    try {
      U.goTab('pilots');
      U.crewAct('makePilot');
      Object.assign(U.maker, {
        clades: ['owl', 'eel'],
        name: 'Tamsin Reed',
        own: 'tide-6',
        domain: 'gold',
        story: ['Grew up on the Ark.', 'Owes a favour.', ''],
        canon: true,
      });
      U.crewAct('makerDraft');
      const d = U.draft;
      assert.deepEqual(d.species, ['owl', 'eel']);
      let guard = 0;
      while (d.step !== 'up' && guard++ < 20) U.draftAct('pickCard', d.pack[0].id || d.pack[0]);
      U.draftAct('autoUp');
      U.draftAct('confirmHero');
      const made = JSON.parse(w.localStorage.getItem('tumult_v2_heroes'));
      const rec = made.find((r) => r.name === 'Tamsin Reed');
      assert.ok(rec, 'kept with the crew');
      assert.equal(rec.callsign, 'TIDE-6');
      assert.equal(rec.domain, 'gold');
      assert.deepEqual(rec.story, ['Grew up on the Ark.', 'Owes a favour.', '']);
      const notes = JSON.parse(w.localStorage.getItem('tumult_v2_canon') || '[]').filter(
        (r) => r.subject === 'hero:' + rec.id,
      );
      assert.equal(notes.length, 2, 'the two answers went to canon');
      assert.deepEqual(errors, []);
    } finally {
      w.close();
    }
  },
);

test(
  'the loading screen holds a mission whose place painting is still on the way, and never a painting already in the page',
  { skip, timeout: 60_000 },
  async () => {
    const { w, U } = await page();
    try {
      const T = w.T;
      const page = T.PAGE_BY.quarry;
      assert.match(T.ART[page.plate], /^data:/, 'the offline file carries its paintings');
      U.screen = 'mission';
      U.run = { heroes: [], stop: 1, mission: { page: 'quarry' } };
      assert.equal(U.loadingGate(), null, 'a painting in the page draws at once');
      T.ART[page.plate] = 'assets/plates/quarry.0123456789.webp'; // as the web version names it
      const html = U.loadingGate();
      assert.ok(html, 'a fetched painting waits');
      assert.match(html, /class="loading over"/);
      assert.match(html, new RegExp('Setting the board for ' + page.name));
      U.screen = 'title';
      assert.equal(U.loadingGate(), null, 'only a mission waits');
    } finally {
      w.close();
    }
  },
);
