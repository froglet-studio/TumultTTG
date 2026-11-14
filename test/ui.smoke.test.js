'use strict';
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

async function drive(opts) {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const { driveRun } = require('../tools/ui-drive');
  return driveRun(build().html, opts);
}

test(
  'UI: a whole run can be played through the real interface (autoplayed turns)',
  { skip, timeout: 120_000 },
  async () => {
    const r = await drive({ seed: 1, auto: true });
    assert.deepEqual(r.errors, [], 'no JavaScript errors');
    assert.equal(r.screen, 'summary', 'the run reaches the summary screen');
    assert.ok(r.missions >= 1 && r.nodes >= 1);
  },
);

test(
  'UI: clicking card faces, targets and nodes never throws (fuzz, on the flood tide)',
  { skip, timeout: 120_000 },
  async () => {
    const r = await drive({ seed: 2, auto: false, tide: 'flood' });
    assert.deepEqual(r.errors, [], 'no JavaScript errors');
    assert.equal(r.tide, 'flood', "the difficulty picked on the title screen is the run's");
    assert.equal(r.screen, 'summary');
  },
);

test('UI: every draft step and run screen has a way back', { skip, timeout: 60_000 }, async () => {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const { JSDOM } = require('jsdom');
  const { until } = require('../tools/ui-drive');
  const dom = new JSDOM(build().html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  const w = dom.window;
  const d = w.document;
  try {
    await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
    const U = w.T.UI;
    const act = (a, arg) => {
      const el = d.querySelector(arg != null ? `[data-act="${a}"][data-arg="${arg}"]` : `[data-act="${a}"]`);
      assert.ok(el && !el.disabled, `nothing to click: ${a} ${arg == null ? '' : arg}`);
      el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
    };
    const at = () => `${U.screen}:${U.draft ? U.draft.heroIdx + ':' + U.draft.step : ''}`;
    act('newRun');
    act('draftQuit');
    assert.equal(U.screen, 'title', 'the first draft step leads back to the title');
    act('newRun');
    act('prebuilt', 'cavitt');
    act('draftBack');
    assert.equal(at(), 'draft:0:mode', 'a pre-made pilot can be put back');
    act('prebuilt', 'cavitt');
    act('confirmHero');
    act('draftPrev');
    assert.equal(at(), 'draft:0:up', 'the second pilot leads back to the first, as it was left');
    assert.equal(U.run.heroes.length, 0);
    act('confirmHero');
    act('draftMode', 'draft');
    act('pickSpecies', 'owl');
    act('pickSpecies', 'gecko');
    act('openPacks');
    act('pickCard');
    act('draftBack', 'species');
    assert.equal(at(), 'draft:1:species', 'the packs lead back to the bloodlines');
    act('openPacks');
    for (let i = 0; i < w.T.RULES.START_CARDS; i++) act('pickCard');
    act('draftBack');
    assert.equal(at(), 'draft:1:mode', 'a drafted pilot can be started over');
    act('prebuilt', 'veil');
    act('confirmHero');
    assert.equal(U.screen, 'map');
    act('quitToTitle');
    assert.equal(U.screen, 'title');
    act('continueRun');
    assert.equal(U.screen, 'map', 'and Continue picks the run up where it was left');
  } finally {
    w.close();
  }
});
