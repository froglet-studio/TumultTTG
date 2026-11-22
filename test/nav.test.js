'use strict';
/**
 * The browser's Back button (src/ui/nav.js): it returns to the screen before, closes a window first,
 * and treats the steps of an expedition as one place, so Back never leaves the game while there is
 * somewhere in it to go back to.
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

test(
  'Back returns to the screen before, closes a window first, and skips the steps of an expedition',
  { skip },
  async () => {
    const { JSDOM } = require('jsdom');
    const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
    const errors = [];
    const dom = new JSDOM(build().html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'http://localhost/',
      beforeParse(w) {
        w.addEventListener('error', (e) => errors.push((e.error && e.error.stack) || e.message));
      },
    });
    const w = dom.window;
    const d = w.document;
    await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
    const U = w.T.UI;
    const act = (a, arg) => {
      const el = d.querySelector(arg != null ? `[data-act="${a}"][data-arg="${arg}"]` : `[data-act="${a}"]`);
      assert.ok(el, `nothing to click: ${a} ${arg || ''}`);
      el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
    };
    const back = async () => {
      const at = U.screen;
      const len = w.history.length;
      w.history.back();
      await until(() => U.screen !== at || U.modal == null || w.history.length !== len, 'Back to land');
      await new Promise((r) => setTimeout(r, 30));
    };
    const start = w.history.length;
    assert.equal(U.screen, 'title');
    assert.equal(w.history.state && w.history.state.screen, 'title', 'the first screen is an entry of its own');

    // a run saved, so the Route tab and Continue have somewhere to go
    const T = w.T;
    const run = T.newRun(11);
    run.heroes = [T.heroFromPrebuilt(run, T.PREBUILTS[0]), T.heroFromPrebuilt(run, T.PREBUILTS[1])];
    T.startMap(run);
    T.saveRun(run);
    U.run = null;
    U.screen = 'title';
    U.render();
    U.goTab('cards');
    assert.equal(U.screen, 'cards');
    await back();
    assert.equal(U.screen, 'title', 'Back from Cards lands on Home');

    // a window: Back closes it and stays on the screen
    U.goTab('pilots');
    U.openModal('<p>a window</p>');
    assert.ok(U.modal);
    await back();
    assert.equal(U.modal, null, 'Back closed the window');
    assert.equal(U.screen, 'pilots', 'and stayed on Pilots');
    await back();
    assert.equal(U.screen, 'title', 'then Back again reaches Home');

    // into an expedition and Back out of it: the expedition waits, and Forward resumes it
    act('continueRun');
    const flow = U.screen;
    assert.ok(U.NAV_FLOW.includes(flow), `Continue opened a step of the expedition (${flow})`);
    await back();
    assert.equal(U.screen, 'title', 'Back from the expedition lands on Home');
    assert.ok(w.T.loadRun(), 'the expedition is still saved');
    w.history.forward();
    await until(() => U.screen !== 'title', 'Forward to land');
    assert.equal(U.screen, flow, 'Forward resumes it');
    assert.ok(w.history.length > start, 'the game kept entries of its own');
    assert.deepEqual(errors, []);
    w.close();
  },
);
