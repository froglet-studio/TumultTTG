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

test(
  'UI: words of art are drawn as keywords, explained, and previewed on the board',
  { skip, timeout: 60_000 },
  async () => {
    const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
    const { JSDOM } = require('jsdom');
    const { until } = require('../tools/ui-drive');
    const dom = new JSDOM(build().html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'http://localhost/',
    });
    const w = dom.window;
    const d = w.document;
    try {
      await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
      const U = w.T.UI;
      const html = U.kw('Melee 2 and Weakened 1; the foe is Anchored.');
      assert.match(html, /class="kw kw-neutral" data-kw="melee"/);
      assert.match(html, /data-kw="weak"/);
      assert.match(html, /data-kw="anchor"/);
      assert.match(
        U.kwGloss('Weakened 1'),
        /each hit it deals is N lower/,
        'a tooltip carries the meaning of its keywords',
      );
      // every state a token can wear has its keyword, so the board and the card text look alike
      for (const s of ['Shield', 'Hidden', 'Anchored', 'Rooted', 'Marked', 'Weak', 'Located', 'Exposed', 'Stasis'])
        assert.ok(U.kwOfState(s), 'a keyword for ' + s);
      // hovering a playable face draws what it would do on a copy of the mission, never on the mission itself
      const click = (sel) => d.querySelector(sel).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      click('[data-act="newRun"]');
      U.run.seed = 5;
      U.run.rngs = {};
      click('[data-act="prebuilt"][data-arg="cavitt"]');
      click('[data-act="confirmHero"]');
      click('[data-act="prebuilt"][data-arg="kess"]');
      click('[data-act="confirmHero"]');
      click('.mnode.avail');
      const m = U.run.mission;
      const before = JSON.stringify(m);
      let drew = 0;
      for (const b of d.querySelectorAll('#mside .fbtn.ok, #mside [data-act="basic"]:not([disabled])')) {
        b.dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true }));
        drew += d.querySelectorAll('#preview .pv').length;
      }
      assert.ok(drew > 0, 'some play previews its result');
      assert.equal(JSON.stringify(m), before, 'previews never touch the mission');
    } finally {
      w.close();
    }
  },
);

test('UI: the route paints each stop with the place it is played in', { skip, timeout: 60_000 }, async () => {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const { JSDOM } = require('jsdom');
  const { until } = require('../tools/ui-drive');
  const dom = new JSDOM(build().html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  const w = dom.window;
  const d = w.document;
  try {
    await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
    const click = (sel) => d.querySelector(sel).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    click('[data-act="newRun"]');
    click('[data-act="prebuilt"][data-arg="cavitt"]');
    click('[data-act="confirmHero"]');
    click('[data-act="prebuilt"][data-arg="kess"]');
    click('[data-act="confirmHero"]');
    const run = w.T.UI.run;
    const route = d.querySelector('.route');
    assert.ok(route, 'the route is drawn');
    // every stop with a page wears its painting, written once as a class (never inline in the markup)
    for (const nd of Object.values(run.map.all)) {
      if (!nd.page || nd.type === 'boss') continue; // the finale wears its threat's ground instead
      const plate = w.T.PAGE_BY[nd.page].plate;
      assert.ok(route.querySelector('.plate.' + w.T.UI.artClass(plate)), `stop ${nd.id} shows ${plate}`);
    }
    const stops = [...route.querySelectorAll('.mnode, .leg')].map((x) => x.outerHTML).join('');
    assert.ok(!/data:image/.test(stops), 'no painting is repeated in the markup');
    assert.match(d.getElementById('art-classes').textContent, /data:image/);
    // each leg says how it is travelled; the squad stands at the foot of the route
    assert.equal(d.querySelectorAll('.leg .leg-kick').length, 4);
    assert.match(route.textContent, /by (land|sea|air)/);
    assert.equal(d.querySelectorAll('.squad-mark.start .pfp').length, 2);
    assert.ok(d.querySelectorAll('.mnode.avail').length >= 2, 'the first stops glow');
  } finally {
    w.close();
  }
});

test(
  'UI: the day passes over the board, the weather blows on it, and neither touches the mission',
  { skip, timeout: 60_000 },
  async () => {
    const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
    const { JSDOM } = require('jsdom');
    const { until } = require('../tools/ui-drive');
    const dom = new JSDOM(build().html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'http://localhost/',
    });
    const w = dom.window;
    const d = w.document;
    try {
      await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
      const U = w.T.UI;
      const click = (sel) => d.querySelector(sel).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      click('[data-act="newRun"]');
      click('[data-act="prebuilt"][data-arg="cavitt"]');
      click('[data-act="confirmHero"]');
      click('[data-act="prebuilt"][data-arg="kess"]');
      click('[data-act="confirmHero"]');
      click('.mnode.avail');
      const m = U.run.mission;
      // six rounds make a day, starting where the mission's seed says
      const days = [];
      for (let r = 1; r <= 7; r++) days.push(U.dayOf(Object.assign({}, m, { round: r })).id);
      assert.equal(days[0], days[6], 'the day comes round again after six rounds');
      assert.equal(new Set(days).size, 6);
      assert.equal(
        U.dayOf(m).id,
        U.dayOf(JSON.parse(JSON.stringify(m))).id,
        'the same mission starts at the same hour',
      );
      assert.match(d.querySelector('.sky').className, new RegExp('sky-' + U.dayOf(m).id));
      assert.ok(d.querySelector('.pill.day'), 'the top bar says what time of day it is');
      assert.match(d.querySelector('.readout').textContent, /^> GUIDE LOG · /, 'the Terminal reads out the place');
      // wind draws gusts toward the edge it blows to; drawing it changes nothing
      const before = JSON.stringify(m);
      const was = { weather: m.place.weather, wind: m.place.wind };
      m.place.weather = 'wind';
      m.place.wind = -1;
      const withWind = JSON.stringify(m);
      U.updateMission();
      assert.ok(d.querySelector('.wx.wx-wind.to-a'));
      assert.ok(d.querySelectorAll('.wx i').length >= 8);
      assert.equal(JSON.stringify(m), withWind, 'the look never writes to the mission');
      m.place.weather = was.weather;
      m.place.wind = was.wind;
      U.updateMission();
      assert.equal(JSON.stringify(m), before);
      // a play answers on the board, in its own layer
      const face = d.querySelector('#mside .fbtn.ok');
      if (face) {
        face.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
        const target = d.querySelector('#mtarget [data-act]');
        assert.ok(d.querySelector('#fxlayer') || target, 'a play is answered, or asks for its target');
      }
    } finally {
      w.close();
    }
  },
);
