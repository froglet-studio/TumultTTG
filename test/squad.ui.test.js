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

test(
  'three players: a face that reaches an ally asks which, on the mission screen',
  { skip, timeout: 60_000 },
  async () => {
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
    const ids = T.PREBUILTS.map((p) => p.id);
    for (let k = 0; k < 3; k++) {
      click(`[data-act="prebuilt"][data-arg="${ids[k]}"]`);
      click('[data-act="confirmHero"]');
    }
    const run = T.UI.run;
    const node = run.available.find((id) => T.MISSIONS[run.map.all[id].type] && run.map.all[id].type !== 'boss');
    click(`[data-act="goNode"][data-arg="${node}"]`);
    const m = run.mission;
    // the first pilot holds Cooperation, awakened, with dice to pay for Unity
    const h = m.heroes[0];
    h.cards.unshift('hum_coop');
    h.up.hum_coop = [1, 2];
    h.held = ['AP', 'AP', 'O', 'O'];
    h.pool = T.RULES.POOL - h.held.length;
    T.UI.updateMission();
    assert.ok(T.canPlay(m, h, 'hum_coop', 'E').ok, T.canPlay(m, h, 'hum_coop', 'E').why);
    click('[data-act="face"][data-arg="0|hum_coop|E"]');
    assert.equal(T.UI.ms.mode, 'target');
    const btns = [...d.querySelectorAll('#mtarget [data-act="pickAlly"]')];
    assert.equal(btns.length, 2, 'both allies are offered');
    const far = m.heroes.find((x) => x.uid === T.UI.ms.pending.tg.options[1]);
    const before = T.apValue(far);
    click(`#mtarget [data-act="pickAlly"][data-arg="${far.uid}"]`);
    assert.equal(T.UI.ms.mode, 'idle');
    assert.ok(T.apValue(far) > before, 'the ally the player chose mints the AP');
    // Call has a node of its own: the player may switch the ally first, and the nodes follow them
    h.cards.unshift('hum_lang');
    h.up.hum_lang = [1, 0];
    h.held = ['AP', 'AP', 'AP'];
    h.pool = T.RULES.POOL - h.held.length;
    T.UI.updateMission();
    click('[data-act="face"][data-arg="0|hum_lang|P"]');
    const tg = T.UI.ms.pending.tg;
    assert.equal(tg.need, 'node');
    const other = tg.allies.find((uid) => uid !== tg.ally);
    click(`#mtarget [data-act="pickAlly"][data-arg="${other}"]`);
    assert.equal(T.UI.ms.pending.tg.ally, other);
    const mover = m.heroes.find((x) => x.uid === other);
    assert.ok(T.UI.ms.pending.tg.options.includes(mover.pos), 'the nodes are now the chosen ally’s');
    assert.deepEqual(errors, []);
  },
);
