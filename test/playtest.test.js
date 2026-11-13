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
const { until } = require('../tools/ui-drive');
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
  const w = dom.window;
  const d = w.document;
  await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
  w.T.UI.MISSION_OVER_DELAY = 0; // the pause that lets a person see the final board
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
/** Pick Elite, tier 2, Veil + Marish, seed 8 on the panel and press Play. */
function startElite(p) {
  p.act('pt-type', 'elite');
  p.act('pt-tier', '2');
  p.act('pt-hero', '0|3');
  p.type('#pt-seed', '8');
  p.act('pt-go');
}
const ELITE = { seed: 8, heroes: [3, 1], type: 'elite', tier: 2, kit: 'tier' };

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
  assert.match(p.U.playtest.reportText(), /node tools\/mission-log\.js elite 2 8 3 1 tier/);
  assert.ok(p.d.querySelector('#mtop [data-act="pt-report"]'), 'the report is one click away mid-mission');

  // the forecast: what ending the round now would do, a line a hero, and each hero's vitality says where it is heading
  const f = p.T.forecast(p.U.run.mission);
  const said = p.d.querySelector('#mside .forecast').textContent;
  for (const h of f.heroes) {
    assert.ok(said.includes(h.name), `the forecast names ${h.name}`);
    if (h.after < h.hp) assert.ok(said.includes(`takes ${h.hp - h.after} (${h.after} left)`), said);
  }
  const heading = Array.from(p.d.querySelectorAll('#mside .hero .hp')).map((el) => el.textContent);
  f.heroes.forEach((h, i) => assert.equal(heading[i].includes('→ ' + h.after), h.after !== h.hp, heading[i]));

  // "Copy save" hands over this exact moment. Where the page may not use the clipboard (as here),
  // the save is shown selected instead — and the tools can carry on from it
  p.act('pt-report');
  p.act('pt-save');
  const carried = require('../tools/load')().deserializeRun(p.d.getElementById('pt-report').value);
  assert.equal(snap(carried.mission), snap(p.U.run.mission));
  assert.deepEqual(carried.mission.rngs, { ...p.U.run.mission.rngs });

  // "Plan" shows the look-ahead player's turn and can play it; the mission is not touched until it does
  const before = snap(p.U.run.mission);
  p.act('closeModal');
  p.act('pt-plan');
  assert.match(p.d.querySelector('.modal').textContent, /What the look-ahead player would do/);
  assert.equal(snap(p.U.run.mission), before);
  const steps = p.d.querySelectorAll('.modal ol li').length;
  assert.ok(steps > 0, 'it has something to do on the first turn');
  const logged = p.U.run.mission.log.length;
  p.act('pt-plan-play');
  assert.equal(p.d.querySelector('.modal'), null);
  assert.ok(p.U.run.mission.log.length > logged, 'the plan was played on the real mission');
  assert.ok(JSON.parse(p.w.localStorage.getItem('tumult_v2_run')).mission.log.length > logged, 'and saved');

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
    assert.equal(p.T.RULES.ETHEREAL_MIN_E, 1, 'as shipped');
    p.act('pt-rule', '0');
    assert.equal(p.T.RULES.ETHEREAL_MIN_E, 0);
    startElite(p);
    const h = p.U.run.mission.heroes[0];
    const atZero = h.cards.find((c) => p.T.heroE(h, c) === 0);
    assert.notEqual(p.T.canPlay(p.U.run.mission, h, atZero, 'E').why, 'needs E 1', 'the old rule, in a mission');
    const stored = p.w.localStorage.getItem(KEY);
    assert.equal(JSON.parse(stored).etherealMinE, 0);

    const again = await boot(html, (w) => w.localStorage.setItem(KEY, stored));
    assert.equal(again.T.RULES.ETHEREAL_MIN_E, 0, 'still set after a reload');

    // before 2.4.0 the panel stored its default as 'minE': that was never a tester's choice
    const old = await boot(html, (w) => w.localStorage.setItem(KEY, JSON.stringify({ minE: 0 })));
    assert.equal(old.T.RULES.ETHEREAL_MIN_E, 1, 'an old stored default does not override the new rule');

    const junk = JSON.stringify({
      etherealMinE: 7,
      cfg: { type: 'nonsense', tier: 9, heroes: [4, 4], seed: 'x1y2' },
      log: 'no',
    });
    const odd = await boot(html, (w) => w.localStorage.setItem(KEY, junk));
    const st = odd.U.playtest.state;
    assert.equal(odd.T.RULES.ETHEREAL_MIN_E, 1);
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
    await until(() => p.d.querySelector('[data-act="missionDone"]'), 'the mission-over modal');
    p.act('missionDone');
    const log = p.U.playtest.state.log;
    assert.equal(log.length, 1);
    const r = log[0];
    assert.deepEqual(
      [r.seed, r.type, r.tier, r.won, r.rounds, r.v, r.minE, r.quick.kit],
      [8, 'elite', 2, !!m.won, m.round, p.T.BUILD.version, 1, 'tier'],
    );
    const counted = Object.values(r.faces).reduce((a, b) => a + b, 0);
    assert.ok(counted > 0 && counted === r.P + r.E, 'every face played was counted once');
    assert.ok(r.E0 <= r.E);
    assert.match(
      p.U.playtest.reportText(),
      /Missions finished on this device \(1, newest first\):\n.*elite t2 · seed 8/,
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

test(
  'a page closed in the middle of a mission carries on from the same moment',
  { skip, timeout: 60_000 },
  async () => {
    const RUN = 'tumult_v2_run';
    const html = (await builds())({ playtest: true }).html;
    const moment = (m) =>
      JSON.stringify({
        round: m.round,
        rngs: m.rngs,
        crystals: m.crystals,
        heroes: m.heroes.map((h) => [h.uid, h.hp, h.pos, h.held, h.pool, h.track, h.states]),
        foes: m.enemies.map((e) => [e.uid, e.type, e.hp, e.pos, e.alive, e.intent]),
        log: m.log.length,
      });
    const endRound = (page) => {
      page.act('endRound');
      if (page.U.ms.endConfirm) page.act('endRound'); // "a hero still has AP banked" asks twice
    };

    const first = await boot(html);
    startElite(first);
    endRound(first);
    assert.equal(first.U.run.mission.round, 2);
    const saved = first.w.localStorage.getItem(RUN);
    assert.ok(JSON.parse(saved).mission, 'the mission is in the save');

    // the same storage in a new page: Continue goes straight back into the round
    const second = await boot(html, (w) => w.localStorage.setItem(RUN, saved));
    second.act('continueRun');
    assert.equal(second.U.screen, 'mission');
    assert.equal(moment(second.U.run.mission), moment(first.U.run.mission));
    assert.ok(second.d.querySelector('#tokens .token'), 'the board is drawn');
    endRound(second);
    endRound(first);
    assert.equal(moment(second.U.run.mission), moment(first.U.run.mission), 'and both play the same next round');

    // finish it, and close the page again on the reward screen
    const m = second.U.run.mission;
    for (let guard = 0; !m.over && guard < 40; guard++) {
      second.T.autoHeroPhase(m);
      if (!m.over) second.T.endHeroPhase(m);
    }
    second.U.updateMission();
    await until(() => second.d.querySelector('[data-act="missionDone"]'), 'the mission-over modal');
    second.act('missionDone');
    const after = second.w.localStorage.getItem(RUN);
    if (second.U.screen === 'reward') {
      const third = await boot(html, (w) => w.localStorage.setItem(RUN, after));
      third.act('continueRun');
      assert.equal(third.U.screen, 'reward');
      assert.match(
        third.d.getElementById('app').textContent,
        /\d+ rounds, \d+ foes destroyed|the Lifeline holds once/,
      );
      assert.deepEqual(third.errors, []);
    }
    assert.deepEqual([...first.errors, ...second.errors], []);
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
