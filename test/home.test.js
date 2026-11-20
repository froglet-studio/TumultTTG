'use strict';
/**
 * Home (src/ui/home.js): the landing on a first visit, Home after it, and the new-expedition setup,
 * whose choices are kept and taken up by the expedition it starts.
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

async function boot(html, before) {
  const { JSDOM } = require('jsdom');
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    beforeParse(w) {
      w.addEventListener('error', (e) => errors.push((e.error && e.error.stack) || e.message));
      if (before) before(w);
    },
  });
  const w = dom.window;
  const d = w.document;
  await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
  const act = (a, arg) => {
    const el = d.querySelector(arg != null ? `[data-act="${a}"][data-arg="${arg}"]` : `[data-act="${a}"]`);
    assert.ok(el, `nothing to click: ${a} ${arg || ''}`);
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  };
  return { w, d, T: w.T, U: w.T.UI, act, errors, close: () => w.close() };
}

test('a first visit lands on Play now; the setup is kept and starts the expedition it says', { skip }, async () => {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const html = build().html;
  const p = await boot(html);
  assert.ok(p.d.querySelector('.home.is-landing'), 'the landing on a first visit');
  assert.doesNotMatch(p.d.querySelector('.hm-display').textContent, /\btwo\b|\d/i, 'its headline names no number');
  assert.equal(p.d.querySelector('[data-act="hostOpen"]'), null, 'the offline file offers no table to host');
  p.act('pickPlayers', 3);
  p.act('setRounds', 'live');
  p.act('pickTide', 'flood');
  const meta = p.T.loadMeta();
  assert.deepEqual([meta.players, meta.rounds, meta.tide], [3, 'live', 'flood']);
  assert.match(p.d.querySelector('.hs-line').textContent, /3 players, one screen.*all play each round at once.*Gale/);
  p.act('newRun');
  assert.equal(p.U.screen, 'draft');
  assert.equal(p.U.run.party.players.length, 3);
  assert.equal(p.U.run.party.rounds, 'live');
  assert.equal(p.U.run.tide, 'flood');
  // with an expedition saved, Home leads with Continue
  p.T.saveRun(p.U.run);
  p.U.screen = 'title';
  p.U.render();
  assert.ok(p.d.querySelector('[data-act="continueRun"]'), 'Continue on Home');
  assert.equal(p.d.querySelector('.is-landing'), null, 'no landing once something is saved');
  // Make a pilot opens the Pilots tab's maker, not a new draft
  p.act('makePilot');
  assert.equal(p.U.screen, 'maker');
  assert.deepEqual(p.errors, []);
  p.close();
});
