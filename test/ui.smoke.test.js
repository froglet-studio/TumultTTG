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
      for (const b of d.querySelectorAll('#mdock .fbtn.ok, #mdock [data-act="basic"]:not([disabled])')) {
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
      const face = d.querySelector('#mdock .fbtn.ok');
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

test(
  'UI: a play the world adds to is marked ✦ and its preview says what the world adds',
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
      const T = w.T;
      const U = T.UI;
      const click = (sel) => d.querySelector(sel).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      click('[data-act="newRun"]');
      click('[data-act="prebuilt"][data-arg="cavitt"]');
      click('[data-act="confirmHero"]');
      click('[data-act="prebuilt"][data-arg="kess"]');
      click('[data-act="confirmHero"]');
      click('.mnode.avail');
      const m = U.run.mission;
      const i = U.ms.heroIdx;
      const h = m.heroes[i];
      // a foe beside the pilot, with a Mark on it (a partner's Spot), and plenty of AP to act with
      const near = T.Board.walkNeighbors(m.board, h.pos).find((n) => !T.occupied(m, n));
      assert.ok(near != null);
      const foe = m.enemies.find((e) => e.alive);
      foe.pos = near;
      foe.states.Marked = new w.Object();
      T.mint(h, 'AP', 6);
      const before = JSON.stringify(m);
      U.updateMission();
      const strike = d.querySelector(`#mdock [data-act="basic"][data-arg="${i}|strike"]`);
      assert.ok(strike && !strike.disabled, 'Strike can be used');
      // the marks are worked out just after the click is drawn
      assert.ok(!strike.querySelector('.combo-mark'), 'not before the screen has been drawn');
      await until(() => strike.querySelector('.combo-mark'), 'the ✦ marks');
      const mark = strike.querySelector('.combo-mark');
      assert.ok(mark, 'Strike is marked: it would spend the Mark');
      assert.match(mark.getAttribute('data-tip'), /Marked is spent on this/);
      strike.dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true }));
      assert.match(d.querySelector('#mtarget .pv-combos').textContent, /✦ .*Marked is spent on this/);
      assert.equal(JSON.stringify(m), before, 'looking never changes the mission');
    } finally {
      w.close();
    }
  },
);

test(
  'UI: the mission screen folds away what is not in use, and redraws only what changed',
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
      const before = JSON.stringify(m);
      const sel = U.ms.heroIdx;
      const other = 1 - sel;
      const panel = (i) => d.querySelector(`#mside .hero[data-arg="${i}"], #mdock .hero[data-arg="${i}"]`);
      // the pilot being played is in the dock, never folded; the other is folded to its vitality and dice in the side
      assert.ok(d.querySelector(`#mdock .hero[data-arg="${sel}"] .hand`), "the dock shows the selected pilot's cards");
      assert.ok(!d.querySelector('#mdock [data-act="peek"], #mdock [data-act="fold"]'), 'nothing in the dock folds');
      assert.ok(d.querySelector('#mdock .res-ap'), 'the dock shows the AP banked');
      assert.ok(panel(other).classList.contains('folded') && !panel(other).querySelector('.hand'));
      assert.ok(panel(other).querySelector('.dice') && panel(other).querySelector('.hpbar'));
      assert.equal(d.querySelector('#mside .hero').getAttribute('data-arg'), String(other));
      // its cards open on request, without selecting it
      click(`#mside .hero[data-arg="${other}"] [data-act="peek"]`);
      assert.ok(panel(other).querySelector('.hand'));
      assert.equal(U.ms.heroIdx, sel);
      // the log folds to its last lines, and the choice is kept for this browser
      assert.ok(d.getElementById('mlog').classList.contains('folded'), 'the log starts folded');
      click('.mission .bottom [data-act="fold"]');
      assert.ok(!d.getElementById('mlog').classList.contains('folded'));
      assert.equal(JSON.parse(w.localStorage.getItem('tumult_v2_ui')).log, true);
      // the intents fold away; the forecast has a strip of its own under the board
      click('#mside [data-act="fold"][data-arg="intents"]');
      assert.ok(!d.querySelector('#mside .intents'), 'the intents are folded away');
      assert.ok(d.querySelector('#mfc .forecast'), 'the forecast stays');
      // an update that changes nothing leaves the panels as they are
      const side = d.querySelector('#mside .hero');
      U.updateMission();
      assert.equal(d.querySelector('#mside .hero'), side, 'the side panel was not redrawn');
      assert.equal(JSON.stringify(m), before, 'folding never changes the mission');
      // flying the other pilot swaps them: it takes the dock, and the one flown before goes to the side
      click(`#mside .hero[data-arg="${other}"]`);
      assert.equal(U.ms.heroIdx, other);
      assert.ok(d.querySelector(`#mdock .hero[data-arg="${other}"] .hand`));
      assert.ok(
        d.querySelector(`#mside .hero[data-arg="${sel}"]`) && !d.querySelector(`#mdock .hero[data-arg="${sel}"]`),
      );
    } finally {
      w.close();
    }
  },
);

test('UI: moving the objective forward is answered on the board', { skip, timeout: 60_000 }, async () => {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const { JSDOM } = require('jsdom');
  const { until } = require('../tools/ui-drive');
  const dom = new JSDOM(build().html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  const w = dom.window;
  const d = w.document;
  try {
    await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
    const T = w.T;
    const U = T.UI;
    const click = (sel) => d.querySelector(sel).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    // a cascade (a valve, worked by Interact), started the way the playtest panel starts one
    U.run = T.quickMission({ seed: 5, type: 'cascade', tier: 1 });
    U.screen = 'mission';
    U.enterMission();
    U.render();
    const m = U.run.mission;
    const ob = m.objective;
    assert.equal(ob.kind, 'valve');
    const target = ob.node;
    const i = U.ms.heroIdx;
    const h = m.heroes[i];
    h.pos = T.Board.walkNeighbors(m.board, target).find((n) => !T.occupied(m, n));
    T.mint(h, 'AP', 6);
    U.updateMission();
    assert.equal(U.objectiveCheck(m), null, 'nothing moved since the last look: no news');
    const btn = d.querySelector(`#mdock [data-act="interact"][data-arg="${i}"]`);
    assert.ok(btn && !btn.disabled && btn.classList.contains('goal-act'), 'Interact glows where it would count');
    const p0 = T.objectiveProgress(m);
    click(`#mdock [data-act="interact"][data-arg="${i}"]`);
    assert.ok(T.objectiveProgress(m) > p0, 'the objective moved');
    const card = d.querySelector('#board #goal.show');
    assert.ok(card, 'a card says so on the board');
    assert.match(card.textContent, /Objective/);
    assert.match(card.querySelector('.goal-bar').getAttribute('style'), /--from:\s*\d+%;\s*--to:\s*\d+%/);
    assert.ok(d.querySelector('#mtop .obj-prog.just'), 'the progress pill in the top bar pulses');
    await until(() => d.querySelector('#fxlayer .burst.goal'), 'gold rings where it happened');
    const before = JSON.stringify(m);
    U.updateMission();
    assert.equal(JSON.stringify(m), before, 'answering never changes the mission');
  } finally {
    w.close();
  }
});

test(
  'UI: dice look like dice, abilities like cards, and new dice are rolled on the board',
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
      const T = w.T;
      const U = T.UI;
      U.run = T.quickMission({ seed: 7, type: 'vault', tier: 2 });
      U.screen = 'mission';
      U.enterMission();
      U.render();
      const m = U.run.mission;
      const i = U.ms.heroIdx;
      const h = m.heroes[i];
      h.held = ['AP', 'AP2', 'M', 'C', 'S', 'T', 'O'];
      h.heldDie = ['plain', 'plain', 'M', 'C', 'eth', 'T', 'plain'];
      h.pool = T.RULES.POOL - h.held.length;
      U.updateMission();
      const die = (di) => d.querySelector(`#mdock .die[data-arg="${i}|${di}"]`);
      // each die is drawn as the die it is: a d20 a hexagon of facets, a d8 a diamond, a d12 a decagon
      const outline = (el) => el.querySelector('.dbody .o').getAttribute('d');
      const corners = (el) => outline(el).trim().split(/\s+/).length / 2;
      assert.ok(die(0).classList.contains('d20') && corners(die(0)) === 6, 'a plain die is an icosahedron');
      assert.ok(die(2).classList.contains('d8') && corners(die(2)) === 4, 'an element die is an octahedron');
      assert.ok(die(4).classList.contains('d12') && corners(die(4)) === 10, 'the ethereal die is a dodecahedron');
      assert.equal(die(0).querySelector('.face').textContent, '1', 'AP shows its number');
      assert.equal(die(1).querySelector('.face').textContent, '2');
      assert.ok(die(2).querySelector('.face svg.icn'), 'an etherion shows its symbol');
      assert.match(die(2).getAttribute('data-tip'), /Channel: Strike, Shove/);
      // the Omni symbol is Cosmic Shore's omnicrystal (several shapes), not a single star
      assert.ok(die(6).querySelector('.face svg path') && /z\s*M/.test(T.UI.ICON_PATHS['el.O']));
      // the abilities are cards, with art showing what each face does
      const hc = d.querySelector('#mdock .hcard');
      assert.ok(
        hc && hc.querySelector('.hart .vp svg') && hc.querySelector('.hart .ve svg'),
        'card art for both faces',
      );
      for (const id of Object.keys(T.CARD))
        for (const fk of ['P', 'E'])
          assert.ok(T.UI.ICON_PATHS[T.UI.verbIconKey(T.CARD[id][fk], T.CARD[id].el)], id + fk);
      assert.ok(d.querySelector('.dicekey').innerHTML.includes('<svg'), 'the key draws the Omni symbol too');

      // a new round: the dice that come up tumble in a tray on the board and land on what was rolled
      await until(() => d.querySelector('#board #rolltray'), 'the first roll of the mission is shown too');
      d.querySelector('#board #rolltray').remove();
      const fx0 = m.fx.length;
      T.beginRound(m);
      const roll = m.fx.slice(fx0).find((f) => f.t === 'roll' && f.hero === h.uid);
      assert.ok(roll && roll.kinds.length === roll.faces.length && roll.at.length === roll.faces.length);
      roll.at.forEach((di, j) => {
        assert.equal(h.held[di], roll.faces[j], 'the roll says where each die was banked');
        assert.equal(T.heldKind(h, di), roll.kinds[j]);
      });
      U.updateMission();
      await until(() => d.querySelector('#board #rolltray .rollrow'), 'a tray of tumbling dice');
      await until(() => d.querySelectorAll('#board .rdie.landed').length >= roll.faces.length, 'the dice land', 4000);
      const mine = [...d.querySelectorAll('#board .rollrow')].find((r) => r.textContent.includes(h.name));
      assert.deepEqual(
        [...mine.querySelectorAll('.rdie')].map((x) => x.getAttribute('data-face')),
        [...roll.faces], // the engine's array is from the page's realm
        'they land on the faces the engine rolled',
      );
      await until(() => !d.querySelector('#board #rolltray'), 'the tray clears', 6000);
    } finally {
      w.close();
    }
  },
);

test('UI: the story line under End Round is written in the light text colour', () => {
  const css = require('node:fs').readFileSync(path.join(__dirname, '..', 'src', 'ui', 'style.css'), 'utf8');
  const rule = css.match(/\.turn-note input\s*\{[^}]*\}/);
  assert.ok(rule, 'the rule exists');
  assert.match(rule[0], /color:\s*var\(--txt\)/);
});
