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

test('players taking turns at one screen pass it on between turns', { skip, timeout: 60_000 }, async () => {
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
  click('[data-act="pickPlayers"][data-arg="3"]');
  click('[data-act="newRun"]');
  const T = w.T;
  const U = T.UI;
  const ids = T.PREBUILTS.map((p) => p.id);
  for (let k = 0; k < 3; k++) {
    click(`[data-act="prebuilt"][data-arg="${ids[k]}"]`);
    click('[data-act="confirmHero"]');
  }
  const run = U.run;
  click(`[data-act="goNode"][data-arg="${run.available.find((id) => T.MISSIONS[run.map.all[id].type])}"]`);
  const m = run.mission;
  const pass = d.getElementById('mpass');
  const end = () => {
    click('#mtop [data-act="endRound"]');
    if (U.ms.endConfirm) click('#mtop [data-act="endRound"]');
  };
  // the round's first turn: everyone is already looking, no cover; the squad says who has a turn to take
  assert.ok(pass.hidden);
  assert.equal(d.querySelectorAll('#msquad .sq-row').length, 3);
  assert.match(d.querySelector('#msquad').textContent, /take turns/);
  // the first player ends their turn without acting: two still to play, so the cover asks who goes next
  U.ms.heroIdx = 0;
  end();
  assert.ok(!pass.hidden, 'the screen is passed on');
  assert.match(pass.textContent, /Pass the screen/);
  assert.equal(pass.querySelectorAll('[data-act="passOk"]').length, 2);
  assert.match(d.querySelector('#msquad .sq-row[data-arg="0"]').textContent, /done/);
  click('#mpass [data-act="passOk"][data-arg="2"]');
  assert.ok(pass.hidden);
  assert.equal(T.ownerOf(run, U.ms.heroIdx), 2, "the third player's pilot is up");
  // the third player ends theirs: one turn left, so the cover names who has it
  end();
  assert.ok(!pass.hidden);
  assert.match(pass.textContent, /Pass to Player 2/);
  click('#mpass [data-act="passOk"]');
  assert.ok(pass.hidden);
  assert.equal(T.ownerOf(run, U.ms.heroIdx), 1);
  // the last turn ends the round: a new round, and no cover until a turn has been played
  const round = m.round;
  end();
  await until(() => m.round > round || m.over, 'the round to end');
  assert.ok(pass.hidden);
  assert.deepEqual(errors, []);
});
