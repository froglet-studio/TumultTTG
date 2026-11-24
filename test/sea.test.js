'use strict';
// The sea around the board (src/ui/sea.js), the calmer mission screen and the motion kit (mission.js):
// only the look changes, never the mission.
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

async function open(storage) {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const { JSDOM } = require('jsdom');
  const { until } = require('../tools/ui-drive');
  const dom = new JSDOM(build().html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    beforeParse(w) {
      for (const [k, v] of Object.entries(storage || {})) w.localStorage.setItem(k, v);
    },
  });
  const w = dom.window;
  const d = w.document;
  await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
  const click = (sel) => d.querySelector(sel).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  return { dom, w, d, U: w.T.UI, click };
}
function toMission(click) {
  click('[data-act="newRun"]');
  click('[data-act="prebuilt"][data-arg="cavitt"]');
  click('[data-act="confirmHero"]');
  click('.mnode.avail');
}

test('Sea: the theme follows the route, darker every stop, Storm at the Heart', { skip }, async () => {
  const { dom, U } = await open();
  try {
    const run = (row, rows = 7) => ({
      map: { rows: Array.from({ length: rows }, () => []), all: { 1: { row } } },
      nodeId: 1,
    });
    assert.equal(JSON.stringify(U.seaDepth(null)), '{"depth":0,"theme":"deep"}', 'off a route: the Deep Sea');
    assert.equal(U.seaDepth(run(0)).theme, 'shore');
    assert.equal(U.seaDepth(run(1)).theme, 'shore');
    assert.equal(U.seaDepth(run(3)).theme, 'deep');
    assert.equal(U.seaDepth(run(5)).theme, 'glow');
    assert.equal(U.seaDepth(run(6)).theme, 'storm', 'the last stop is the Heart');
    const depths = [0, 1, 2, 3, 4, 5, 6].map((r) => U.seaDepth(run(r)).depth);
    assert.equal(JSON.stringify(depths), JSON.stringify([...depths].sort((a, b) => a - b)), 'deeper every stop');
  } finally {
    dom.window.close();
  }
});

test('Sea: the Look panel sets theme, accent and motion, and they are kept', { skip, timeout: 60_000 }, async () => {
  const { dom, w, d, U, click } = await open();
  try {
    const root = d.documentElement;
    assert.ok(d.getElementById('sea'), 'the sea is behind the page');
    assert.ok(d.querySelectorAll('#sea .sea-line').length >= 8, 'with sea lines');
    assert.ok(d.querySelectorAll('#sea .sea-mote').length >= 8, 'and motes');
    assert.equal(root.getAttribute('data-sea'), 'deep', 'the title is in the Deep Sea');
    assert.equal(root.getAttribute('data-motion'), 'full', 'with no reduce-motion setting, everything moves');
    U.openLook(); // Home in the app shell has no Look button; the mission menu and Settings do
    assert.ok(d.querySelector('.modal .look'), 'Look opens');
    click('[data-act="lookTheme"][data-arg="glow"]');
    click('[data-act="lookAccent"][data-arg="ruby"]');
    click('[data-act="lookMotion"][data-arg="off"]');
    assert.equal(root.getAttribute('data-sea'), 'glow');
    assert.equal(root.getAttribute('data-accent'), 'ruby');
    assert.equal(root.getAttribute('data-motion'), 'off');
    assert.ok(root.classList.contains('calm'));
    assert.equal(U.motion(), 'off');
    assert.ok(d.querySelector('[data-act="lookMotion"][data-arg="off"]').classList.contains('on'));
    assert.deepEqual(JSON.parse(w.localStorage.getItem('tumult_v2_look')), {
      theme: 'glow',
      accent: 'ruby',
      motion: 'off',
    });
    // nonsense is ignored
    U.seaAct('lookTheme', 'lava');
    assert.equal(root.getAttribute('data-sea'), 'glow');
    // back to following the device and the route
    click('[data-act="lookMotion"][data-arg="system"]');
    click('[data-act="lookTheme"][data-arg="auto"]');
    assert.equal(U.look.motion, null);
    assert.equal(U.motion(), 'full');
    toMission(click);
    assert.equal(root.getAttribute('data-sea'), 'shore', 'the first stops are in the shallows');
  } finally {
    dom.window.close();
  }
});

test('Sea: a stored look is read back, and a broken one falls back', { skip }, async () => {
  let o = await open({ tumult_v2_look: JSON.stringify({ theme: 'storm', accent: 'gold', motion: 'reduced' }) });
  try {
    assert.equal(o.d.documentElement.getAttribute('data-sea'), 'storm');
    assert.equal(o.d.documentElement.getAttribute('data-accent'), 'gold');
    assert.equal(o.U.motion(), 'reduced');
  } finally {
    o.dom.window.close();
  }
  o = await open({ tumult_v2_look: '{"theme":"nope","accent":7' });
  try {
    assert.equal(JSON.stringify(o.U.look), '{"theme":"auto","accent":"tide","motion":null}');
  } finally {
    o.dom.window.close();
  }
});

test('Calm: one menu, one conditions chip, the story box and More on request', { skip, timeout: 60_000 }, async () => {
  const { dom, d, U, click } = await open();
  try {
    toMission(click);
    const m = U.run.mission;
    const before = JSON.stringify(m);
    // the screen's own buttons sit behind one menu
    assert.ok(!d.querySelector('#mtop .mmenu.open'));
    for (const a of ['toggleSound', 'help', 'quick']) assert.ok(d.querySelector(`#mtop .mmenu [data-act="${a}"]`), a);
    click('#mtop [data-act="mmenu"]');
    assert.ok(d.querySelector('#mtop .mmenu.open'), 'the menu opens');
    click('#board');
    assert.ok(!d.querySelector('#mtop .mmenu.open'), 'and closes when the page is clicked');
    // the place's rules fold into one chip; the round joins the clock
    const chip = d.querySelector('#mtop .conds-btn');
    assert.match(chip.textContent, /^\d conditions? /);
    assert.ok(d.querySelector('#mtop .conds-list .pill.day'), 'the hour is one of them');
    click('#mtop [data-act="conds"]');
    assert.ok(d.querySelector('#mtop .conds.open'));
    if (m.clock) assert.match(d.querySelector('#mtop .clock').textContent, /round 1/);
    // the story box waits behind ✎
    assert.ok(!d.querySelector('#mtop .endgrp.note-open'));
    click('#mtop [data-act="noteOpen"]');
    assert.ok(d.querySelector('#mtop .endgrp.note-open #turnNote'));
    // the enemy plans are a heading, no sentence
    assert.match(d.querySelector('#mside .intents-panel .fold-head b').textContent, /^Enemy plans$/);
    // every action that can be taken now is in view; the ones that cannot wait behind the fold (2.143)
    const i = U.ms.heroIdx;
    const acts = '#mdock .actions';
    assert.ok(d.querySelectorAll(`${acts} > button:not(.more-btn):not([disabled])`).length, 'something to do');
    assert.ok(!d.querySelector(`${acts} > button[disabled]`), 'nothing greyed out in view');
    assert.ok(!d.querySelector(`${acts} .more-acts button:not([disabled])`), 'nothing doable folded away');
    if (!dom.window.T.canUseBasic(m, m.heroes[i], 'strike').ok)
      assert.ok(d.querySelector(`${acts} .more-acts [data-arg="${i}|strike"]`));
    // one button for each action, however many ways it can be paid for
    assert.equal(d.querySelectorAll(`#mdock [data-act="basic"][data-arg="${i}|strike_M"]`).length, 0);
    assert.equal(d.querySelectorAll(`#mdock [data-act="basic"][data-arg="${i}|strike"]`).length, 1);
    assert.ok(!d.querySelector('#mdock .actions.more-open'));
    click('#mdock [data-act="moreActs"]');
    assert.ok(d.querySelector('#mdock .actions.more-open'));
    // the first missions keep the how-to line; later ones do not
    assert.ok(d.querySelector('#mtarget .hint'));
    U.run.stats.missions = 3;
    U.updateMission();
    assert.ok(!d.querySelector('#mtarget .hint'), 'the how-to line goes once the expedition is under way');
    assert.equal(JSON.stringify(m), before, 'none of it touches the mission');
  } finally {
    dom.window.close();
  }
});

test('Dice as AP: an Omni, or two etherions clicked in turn, make 1 AP', { skip, timeout: 60_000 }, async () => {
  const { dom, d, U, click } = await open();
  try {
    toMission(click);
    const m = U.run.mission;
    const i = U.ms.heroIdx;
    const h = m.heroes[i];
    const n = h.held.length;
    h.held = ['M', 'S', 'O'];
    h.heldDie = ['plain', 'plain', 'plain'];
    h.pool += n - 3;
    h.temp = [];
    U.updateMission();
    assert.ok(d.querySelector('#mdock [data-act="asAPMode"]'));
    click('#mdock [data-act="asAPMode"]');
    assert.equal(U.ms.mode, 'asAP');
    // a die that can be clicked is marked as one, never with the pilot screen's full-page '.pick' (2.143)
    assert.equal(d.querySelectorAll('#mdock .die.die-pick').length, 3);
    assert.ok(!d.querySelector('#mdock .die.pick'));
    click(`#mdock [data-act="die"][data-arg="${i}|2"]`);
    assert.deepEqual(h.held, ['M', 'S']);
    assert.deepEqual(h.temp, ['AP']);
    assert.equal(U.ms.mode, 'idle');
    click('#mdock [data-act="asAPMode"]');
    click(`#mdock [data-act="die"][data-arg="${i}|0"]`);
    assert.ok(
      d.querySelector(`#mdock [data-act="die"][data-arg="${i}|0"]`).classList.contains('die-chosen'),
      'the first stays marked',
    );
    click(`#mdock [data-act="die"][data-arg="${i}|1"]`);
    assert.deepEqual(h.held, []);
    assert.deepEqual(h.temp, ['AP', 'AP']);
    assert.equal(h.pool + h.held.length, 15);
  } finally {
    dom.window.close();
  }
});

test(
  'Motion: a walk plays out node by node and ends where the engine put the pilot',
  { skip, timeout: 60_000 },
  async () => {
    const { dom, w, d, U, click } = await open();
    try {
      toMission(click);
      const m = U.run.mission;
      const i = U.ms.heroIdx;
      const h = m.heroes[i];
      const opts = w.T.reachableWalk(m, h, Math.min(2, w.T.apValue(h)));
      const far = opts.find((n) => !w.T.Board.adjacent(m.board, h.pos, n)) || opts[0];
      assert.ok(far != null, 'somewhere to walk');
      const tok = d.getElementById('tok-' + h.uid);
      click(`#node-${far}`);
      assert.equal(h.pos, far, 'the engine moved the pilot at once');
      assert.ok(tok._walking, 'the token is walking');
      await new Promise((r) => setTimeout(r, U.STEP_MS * 3 + 200));
      assert.ok(!tok._walking, 'and has arrived');
      assert.equal(tok.getAttribute('transform'), tok._home, 'where the pilot stands');
      // with motion Off there is no walk at all
      U.look.motion = 'off';
      const next = w.T.reachableWalk(m, h, 1)[0];
      if (next != null && w.T.apValue(h) >= 1) {
        click(`#node-${next}`);
        assert.ok(!tok._walking, 'Off: the pilot is simply there');
        assert.equal(tok.getAttribute('transform'), tok._home);
      }
    } finally {
      dom.window.close();
    }
  },
);

test('One action, two ways to pay: one button, and the bar asks how', { skip, timeout: 60_000 }, async () => {
  const { dom, d, U, click } = await open();
  try {
    toMission(click);
    const T = dom.window.T;
    const m = U.run.mission;
    const i = U.ms.heroIdx;
    const h = m.heroes[i];
    const near = T.Board.walkNeighbors(m.board, h.pos).find((x) => !T.occupied(m, x));
    m.enemies.find((e) => e.alive).pos = near;
    const n = h.held.length;
    h.held = ['M', 'AP', 'AP'];
    h.heldDie = ['plain', 'plain', 'plain'];
    h.pool += n - 3;
    h.temp = [];
    U.updateMission();
    assert.ok(T.canUseBasic(m, h, 'strike').ok && T.canUseBasic(m, h, 'strike_M').ok);
    const strikes = d.querySelectorAll(`#mdock [data-act="basic"][data-arg="${i}|strike"]`);
    assert.equal(strikes.length, 1, 'one Strike button');
    assert.ok(!strikes[0].disabled && !strikes[0].closest('.more-acts'), 'in view');
    const before = JSON.stringify(m);
    click(`#mdock [data-act="basic"][data-arg="${i}|strike"]`);
    assert.equal(U.ms.mode, 'pay');
    assert.equal(d.querySelectorAll('#mtarget [data-act="payWith"]').length, 2, 'AP, or a Mass');
    assert.equal(JSON.stringify(m), before, 'nothing is paid yet');
    click('#mtarget [data-act="payWith"][data-arg="strike_M"]');
    assert.equal(U.ms.mode, 'target');
    assert.equal(U.ms.pending.id, 'strike_M');
    click('#mtarget [data-act="cancelMode"]');
    // with only one way to pay, the button goes straight on
    h.held = ['AP', 'AP'];
    h.pool += 1;
    h.heldDie = ['plain', 'plain'];
    U.updateMission();
    click(`#mdock [data-act="basic"][data-arg="${i}|strike"]`);
    assert.equal(U.ms.mode, 'target');
    assert.equal(U.ms.pending.id, 'strike');
  } finally {
    dom.window.close();
  }
});
