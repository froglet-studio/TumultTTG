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
  assert.equal(p.d.querySelector('.hm-keep'), null, 'the offline file has no accounts, so no sign-in line');
  const keepA = p.T.Account;
  p.T.Account = { available: () => true, user: () => ({ id: 'g1', guest: true }) };
  p.U.render();
  assert.match(p.d.querySelector('.hm-keep').textContent, /this browser only/, 'a guest is told where the save lives');
  p.T.Account = { available: () => true, user: () => ({ id: 'u1', guest: false, name: 'Sho' }) };
  p.U.render();
  assert.equal(p.d.querySelector('.hm-keep'), null, 'a signed-in player is not asked');
  p.T.Account = keepA;
  p.U.render();
  // a captain stands behind Home, and every few seconds another fades in over them
  const name = () => p.d.querySelector('.hm-plate-name').textContent;
  const first = name();
  const shown = () => p.d.querySelector('.hm-scene-img.on').style.backgroundImage;
  const was = shown();
  assert.ok(p.U.homeRotate(), 'Home turns to the next captain');
  assert.notEqual(shown(), was, 'a new painting fades in');
  await new Promise((r) => setTimeout(r, 900));
  assert.notEqual(name(), first, 'and the plate names the new captain');
  p.U.render();
  assert.equal(name(), p.d.querySelector('.hm-plate-name').textContent, 'a re-render keeps the same captain');
  p.d.documentElement.setAttribute('data-motion', 'off');
  assert.equal(p.U.homeRotate(), false, 'with motion Off the captain stays');
  p.d.documentElement.removeAttribute('data-motion');
  // the setup stays open while the player picks: a choice re-renders Home but does not fold it away
  const setup = () => p.d.querySelector('.hm-setup');
  assert.equal(setup().open, false, 'with an expedition saved the setup starts folded');
  setup().open = true;
  await until(() => p.U.setupOpen === true, 'the setup remembers it was opened');
  p.act('pickTide', 'rising');
  assert.equal(setup().open, true, 'picking the wind keeps the setup open');
  assert.ok(setup().classList.contains('hm-quiet'), 'and does not replay its opening');
  p.act('pickPlayers', 2);
  assert.equal(setup().open, true, 'so does picking the players');
  // Make a pilot opens the Pilots tab's maker, not a new draft
  p.act('makePilot');
  assert.equal(p.U.screen, 'maker');
  assert.deepEqual(p.errors, []);
  p.close();
});

test('the Lobby drawer: open tables to join, tables to ask into, and requests to answer', { skip }, async () => {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const p = await boot(build().html);
  assert.ok(p.d.querySelector('.home.is-landing'));
  const now = Date.now();
  const keepNet = p.U.net;
  p.U.net = {
    LIVE_MS: 180000,
    games: [
      { code: 'KRAB', host: 'Kestrel', by: 'u2', names: ['Kestrel'], pilots: [], stage: '', open: true, at: now },
      { code: 'GALE', host: 'Tamsin', by: 'u4', names: ['Tamsin', 'Ro'], pilots: [], stage: '', open: false, at: now },
    ],
  };
  const waiting = [{ from: 'u5', kind: 'invite', code: 'TIDE', name: '<b>Odalys</b>' }];
  p.U.social = { on: () => true, isFriend: () => false, sent: () => '', card: () => null, waiting: () => waiting };
  p.U.lobbyOpen = true;
  p.U.render();
  const panel = () => p.d.getElementById('lobbyPanel');
  assert.ok(panel(), 'the Lobby opens over the first-visit landing too');
  assert.ok(
    panel().querySelector('[data-act="netJoinGame"][data-arg="KRAB"]'),
    'an open seat is joined without a code',
  );
  assert.ok(
    panel().querySelector('[data-act="socialAsk"][data-arg="u4"]'),
    "a table mid-mission asks its host's account",
  );
  assert.match(panel().querySelector('[data-arg="requests"]').textContent, /1/, 'the Requests tab counts what waits');
  p.U.lobbyTab = 'requests';
  p.U.render();
  assert.ok(panel().querySelector('[data-act="socialAnswer"][data-arg="u5|1"]'), 'an invite can be taken');
  assert.ok(!panel().innerHTML.includes('<b>Odalys</b>'), 'names are escaped');
  p.U.social = null;
  p.U.render();
  assert.match(panel().textContent, /Sign in/, 'without an account the Requests tab asks for one');
  p.act('lobbyClose');
  assert.equal(panel(), null);
  p.U.net = keepNet;
  assert.deepEqual(p.errors, []);
  p.close();
});

test('Continue on an expedition saved in its draft carries on drafting', { skip }, async () => {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const p = await boot(build().html);
  p.act('newRun');
  assert.equal(p.U.screen, 'draft');
  p.T.saveRun(p.U.run); // Back out of the draft keeps the expedition, in phase 'draft', without the draft's own state
  p.U.run = null;
  p.U.draft = null;
  p.U.screen = 'title';
  p.U.render();
  assert.match(p.d.querySelector('.hm-panel').textContent, /Draft/i, 'Home offers to carry on drafting');
  p.act('continueRun');
  assert.equal(p.U.screen, 'draft', 'Continue opens the draft');
  assert.ok(p.U.draft && p.U.draft.heroIdx === 0, 'at the first pilot still to draft');
  assert.deepEqual(p.errors, []);
  p.close();
});
