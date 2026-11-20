'use strict';
/** Up to five players at one screen (Garrett, 2026-11-20): each drafts a pilot, and the squad sets out together. */
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

test('five players at one screen draft five pilots and reach the map', { skip, timeout: 60_000 }, async () => {
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
  click('[data-act="pickPlayers"][data-arg="5"]');
  click('[data-act="newRun"]');
  const T = w.T;
  const ids = T.PREBUILTS.map((p) => p.id);
  for (let k = 0; k < 5; k++) {
    assert.equal(T.UI.draft.heroIdx, k);
    click(`[data-act="prebuilt"][data-arg="${ids[k % ids.length]}"]`);
    const label = d.querySelector('[data-act="confirmHero"]').textContent;
    assert.match(label, k < 4 ? new RegExp(`draft pilot ${k + 2}`) : /set out/);
    click('[data-act="confirmHero"]');
  }
  assert.equal(T.UI.screen, 'map');
  const run = T.UI.run;
  assert.equal(run.heroes.length, 5);
  assert.equal(run.heroes.map((h, i) => T.ownerOf(run, i)).join(','), '0,1,2,3,4');
  // the first mission on the route: every pilot on the board, and the board answers the squad
  const node = run.available.find((id) => T.MISSIONS[run.map.all[id].type] && run.map.all[id].type !== 'boss');
  click(`[data-act="goNode"][data-arg="${node}"]`);
  assert.equal(T.UI.screen, 'mission');
  assert.equal(new Set(run.mission.heroes.map((h) => h.pos)).size, 5);
  assert.equal(run.mission.foeHp, T.scaleFor(run).hp);
  assert.deepEqual(errors, []);
});
