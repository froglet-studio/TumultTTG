'use strict';
/**
 * The playtest build (npm run build:playtest): the panel on the title screen starts the
 * mission the command-line tools would, switches the rule under test, and keeps a log.
 * Driven through the real page in jsdom, like test/ui.smoke.test.js.
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY = 'tumult_v2_playtest';

async function builds() {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  return build;
}
/** Open a built page. `before(window)` runs before the page's own script. */
async function boot(html, before) {
  const { JSDOM } = require('jsdom');
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    beforeParse(w) {
      w.console.error = (...a) => errors.push('console.error: ' + a.map(String).join(' '));
      w.addEventListener('error', (e) => errors.push('window.error: ' + ((e.error && e.error.stack) || e.message)));
      if (before) before(w);
    },
  });
  await sleep(150); // first render
  const w = dom.window;
  const d = w.document;
  const click = (sel) => {
    const el = d.querySelector(sel);
    assert.ok(el, `nothing to click: ${sel}`);
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  };
  const act = (a, arg) => click(arg != null ? `[data-act="${a}"][data-arg="${arg}"]` : `[data-act="${a}"]`);
  const type = (sel, text) => {
    const el = d.querySelector(sel);
    el.value = text;
    el.dispatchEvent(new w.Event('input', { bubbles: true }));
  };
  return { w, d, T: w.T, U: w.T.UI, errors, act, type };
}
const snap = (m) =>
  JSON.stringify({
    nodes: m.board.nodes,
    edges: m.board.edges,
    foes: m.enemies.map((e) => [e.type, e.pos, e.hp]),
    heroes: m.heroes.map((h) => [h.name, h.pos, h.held.join(''), h.cards.join(',')]),
  });
/** Pick Elite, tier 2, Veil + Marish, seed 7 on the panel and press Play. */
function startElite(p) {
  p.act('pt-type', 'elite');
  p.act('pt-tier', '2');
  p.act('pt-hero', '0|3');
  p.type('#pt-seed', '7');
  p.act('pt-go');
}
const ELITE = { seed: 7, heroes: [3, 1], type: 'elite', tier: 2, kit: 'tier' };

test('the playtest notes are written for this version and name real cards', { skip }, async () => {
  const p = await boot((await builds())({ playtest: true }).html);
  const { NOTES } = p.U.playtest;
  assert.equal(
    NOTES.version,
    require('../package.json').version,
    'update NOTES in src/ui/playtest.js with the release',
  );
  assert.ok(NOTES.items.length >= 1);
  for (const n of NOTES.items) for (const c of n.cards || []) assert.ok(p.T.CARD[c], `no card "${c}"`);
  p.act('pt-report'); // the report opens from the title screen too
  assert.match(p.d.getElementById('pt-report').value, /none yet/);
  assert.deepEqual(p.errors, []);
});

test('the panel starts the mission the command-line tools would', { skip }, async () => {
  const p = await boot((await builds())({ playtest: true }).html);
  assert.ok(p.d.querySelector('.pt'), 'the panel is on the title screen');
  startElite(p);
  assert.equal(p.U.screen, 'mission');
  const here = require('../tools/load')().quickMission(ELITE);
  assert.equal(snap(p.U.run.mission), snap(here.mission), 'same board, foes, squad and opening dice as T.quickMission');
  assert.match(p.U.playtest.reportText(), /node tools\/mission-log\.js elite 2 7 3 1 tier/);
  assert.ok(p.d.querySelector('#mtop [data-act="pt-report"]'), 'the report is one click away mid-mission');

  // The Heart is always tier 3, and one hero cannot fill both seats
  const q = await boot((await builds())({ playtest: true }).html);
  q.act('pt-type', 'boss');
  assert.equal(q.U.playtest.state.cfg.tier, 3);
  assert.ok(q.d.querySelector('[data-act="pt-tier"][data-arg="1"]').disabled);
  q.act('pt-hero', '1|0');
  assert.deepEqual(Array.from(q.U.playtest.state.cfg.heroes), [1, 0], 'choosing the other seat’s hero swaps them');
  assert.deepEqual([...p.errors, ...q.errors], []);
});

test(
  'the rule switch takes effect at once and is remembered; stored settings are never trusted',
  { skip },
  async () => {
    const html = (await builds())({ playtest: true }).html;
    const p = await boot(html);
    assert.equal(p.T.RULES.ETHEREAL_MIN_E, 0, 'as shipped');
    p.act('pt-rule', '1');
    assert.equal(p.T.RULES.ETHEREAL_MIN_E, 1);
    startElite(p);
    const h = p.U.run.mission.heroes[0];
    const atZero = h.cards.find((c) => p.T.heroE(h, c) === 0);
    assert.equal(p.T.canPlay(p.U.run.mission, h, atZero, 'E').why, 'needs E 1', 'mid-mission too');
    const stored = p.w.localStorage.getItem(KEY);
    assert.equal(JSON.parse(stored).minE, 1);

    const again = await boot(html, (w) => w.localStorage.setItem(KEY, stored));
    assert.equal(again.T.RULES.ETHEREAL_MIN_E, 1, 'still set after a reload');

    const junk = JSON.stringify({
      minE: 7,
      cfg: { type: 'nonsense', tier: 9, heroes: [4, 4], seed: 'x1y2' },
      log: 'no',
    });
    const odd = await boot(html, (w) => w.localStorage.setItem(KEY, junk));
    const st = odd.U.playtest.state;
    assert.equal(odd.T.RULES.ETHEREAL_MIN_E, 0);
    assert.deepEqual(
      [st.cfg.type, st.cfg.tier, Array.from(st.cfg.heroes), st.cfg.seed, st.log.length],
      ['vault', 1, [0, 1], '12', 0],
    );
    assert.ok(odd.d.querySelector('.pt'));
    assert.deepEqual([...p.errors, ...again.errors, ...odd.errors], []);
  },
);

test(
  'a finished mission lands in the log and the report, and the Tide carries on',
  { skip, timeout: 60_000 },
  async () => {
    const p = await boot((await builds())({ playtest: true }).html);
    startElite(p);
    const m = p.U.run.mission;
    for (let guard = 0; !m.over && guard < 40; guard++) {
      p.T.autoHeroPhase(m);
      if (!m.over) p.T.endHeroPhase(m);
    }
    assert.ok(m.over, 'the mission ends');
    p.U.updateMission();
    await sleep(1000); // the mission-over modal opens after a short delay
    p.act('missionDone');
    const log = p.U.playtest.state.log;
    assert.equal(log.length, 1);
    const r = log[0];
    assert.deepEqual(
      [r.seed, r.type, r.tier, r.won, r.rounds, r.v, r.minE, r.quick.kit],
      [7, 'elite', 2, !!m.won, m.round, p.T.BUILD.version, 0, 'tier'],
    );
    const counted = Object.values(r.faces).reduce((a, b) => a + b, 0);
    assert.ok(counted > 0 && counted === r.P + r.E, 'every face played was counted once');
    assert.ok(r.E0 <= r.E);
    assert.match(
      p.U.playtest.reportText(),
      /Missions finished on this device \(1, newest first\):\n.*elite t2 · seed 7/,
    );
    assert.equal(JSON.parse(p.w.localStorage.getItem(KEY)).log.length, 1, 'kept on this device');
    if (p.U.screen === 'reward') {
      // the reward screen wants its card and boon offers answered before it lets go
      for (const a of ['skipCard', 'takeBoon']) if (p.d.querySelector(`[data-act="${a}"]`)) p.act(a);
      p.act('rewardDone');
      assert.equal(p.U.screen, 'map');
      assert.ok(p.d.querySelector('.mnode.avail'), 'the next row is open');
    } else {
      assert.equal(p.U.screen, 'summary');
    }
    assert.deepEqual(p.errors, []);
  },
);

test('the ordinary build has no playtest panel; the fragment boots inside a host page', { skip }, async () => {
  const build = await builds();
  const plain = await boot(build().html);
  assert.equal(plain.d.querySelector('.pt'), null);
  assert.equal(plain.U.playtest, undefined);
  assert.equal(plain.T.BUILD.playtest, false);
  assert.ok(plain.d.querySelector('[data-act="newRun"]'));

  const host = '<!doctype html><html><head><meta charset="utf-8"></head><body>';
  const hosted = await boot(host + build({ playtest: true, fragment: true }).html + '</body></html>');
  assert.ok(hosted.d.querySelector('[data-act="pt-go"]'));
  assert.equal(hosted.d.title, 'Tumult Playtest');
  assert.deepEqual([...plain.errors, ...hosted.errors], []);
});
