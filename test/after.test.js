'use strict';
/**
 * The screens after a mission and at the end of an expedition (src/ui/after.js), driven through the real
 * interface in jsdom: the reward's pick is the old command, a full kit exchanges through the swap view, the
 * upgrade view grows a card, and the end screen's three views all draw.
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

async function open() {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const { JSDOM } = require('jsdom');
  const { until } = require('../tools/ui-drive');
  const dom = new JSDOM(build().html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  const w = dom.window;
  const d = w.document;
  await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
  const click = (sel) => {
    const el = d.querySelector(sel);
    assert.ok(el, 'nothing to click: ' + sel);
    assert.ok(!el.disabled, 'disabled: ' + sel);
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  };
  return { dom, w, d, T: w.T, U: w.T.UI, click };
}
/** Start a run with two pre-made pilots and end the first mission as `won`, the way Continue on the mission does. */
function toReward({ T, U, click }, won) {
  click('[data-act="newRun"]');
  click('[data-act="prebuilt"][data-arg="cavitt"]');
  click('[data-act="confirmHero"]');
  click('[data-act="prebuilt"][data-arg="kess"]');
  click('[data-act="confirmHero"]');
  const run = U.run;
  const id = run.available.find((i) => !['haven', 'event'].includes(run.map.all[i].type));
  T.chooseNode(run, id);
  const m = run.mission;
  m.over = true;
  m.won = won;
  T.missionRewards(run, m);
  T.applyMissionResult(run);
  U.screen = run.phase;
  U.render();
  return run;
}

test('After a mission: victory picks a trait per pilot with the old commands', { skip, timeout: 60_000 }, async () => {
  const ctx = await open();
  const { d, U, click } = ctx;
  try {
    const run = toReward(ctx, true);
    assert.equal(U.screen, 'reward');
    assert.match(d.querySelector('.am-big').textContent, /Victory/);
    assert.equal(d.querySelectorAll('.am-tab').length, 2, 'a tab for each pilot');
    // pick the second offered trait, then take it
    const second = run.lastReward.offers[0][1];
    click(`[data-act="amRwCard"][data-arg="0|${second}"]`);
    assert.equal(d.querySelector('[data-act="takeCard"]').getAttribute('data-arg'), `${second}|0`);
    assert.ok(d.querySelector('[data-act="rewardDone"]').disabled, 'onward waits for every pilot');
    click('[data-act="takeCard"]');
    assert.ok(run.heroes[0].cards.includes(second), 'the picked trait joins the kit');
    click('[data-act="amRwHero"][data-arg="1"]');
    click('[data-act="skipCard"][data-arg="1"]');
    click('[data-act="rewardDone"]');
    assert.equal(U.screen, 'map');
  } finally {
    ctx.dom.window.close();
  }
});

test('After a mission: a full kit exchanges a trait through the swap view', { skip, timeout: 60_000 }, async () => {
  const ctx = await open();
  const { d, T, U, click } = ctx;
  try {
    click('[data-act="newRun"]');
    click('[data-act="prebuilt"][data-arg="cavitt"]');
    click('[data-act="confirmHero"]');
    click('[data-act="prebuilt"][data-arg="kess"]');
    click('[data-act="confirmHero"]');
    const run = U.run;
    const h = run.heroes[0];
    for (const c of T.CARDS) if (h.cards.length < T.RULES.MAX_CARDS && T.canAddCard(h, c.id).ok) T.addCard(h, c.id);
    assert.equal(h.cards.length, T.RULES.MAX_CARDS);
    const id = run.available.find((i) => !['haven', 'event'].includes(run.map.all[i].type));
    T.chooseNode(run, id);
    run.mission.over = true;
    run.mission.won = true;
    T.missionRewards(run, run.mission);
    T.applyMissionResult(run);
    U.screen = 'reward';
    U.render();
    const sw = run.lastReward.offers[0].find((c) => T.isSwapOffer(run, 0, c));
    assert.ok(sw, 'a full kit is offered an exchange');
    click(`[data-act="amRwCard"][data-arg="0|${sw}"]`);
    click(`[data-act="swapPick"][data-arg="${sw}|0"]`);
    assert.ok(d.querySelector('.am-swap'), 'the swap view');
    assert.ok(d.querySelector('[data-act="swapDrop"]').disabled, 'nothing goes out until it is chosen');
    const drop = T.swapDrops(h, sw)[0];
    click(`[data-act="amDrop"][data-arg="${drop}"]`);
    assert.ok(d.querySelector('.am-tile.out'), 'the trait going out is marked');
    click('[data-act="swapDrop"]');
    assert.ok(h.cards.includes(sw) && !h.cards.includes(drop), 'one in, one out');
    assert.equal(h.cards.length, T.RULES.MAX_CARDS);
    assert.ok(!d.querySelector('.am-swap'), 'back to the rewards');
    assert.equal(h.reserve.join(), drop, 'the trait left behind is kept, in reserve');
    // between missions, Kit brings it back for one of the nine (2.105)
    click('[data-act="kit"][data-arg="0"]');
    click(`[data-act="kitPick"][data-arg="0|${drop}"]`);
    const out = T.loadOuts(h, drop)[0];
    const btn = d.querySelector(`[data-act="kitSwap"][data-arg="0|${drop}|${out}"]`);
    assert.ok(btn, 'the traits it could replace are offered');
    click(`[data-act="kitSwap"][data-arg="0|${drop}|${out}"]`);
    assert.ok(h.cards.includes(drop) && h.reserve.includes(out), 'swapped back in');
    assert.equal(h.cards.length, T.RULES.MAX_CARDS);
  } finally {
    ctx.dom.window.close();
  }
});

test('After a mission: the upgrade view grows and awakens a card', { skip, timeout: 60_000 }, async () => {
  const ctx = await open();
  const { d, T, U, click } = ctx;
  try {
    const run = toReward(ctx, true);
    const h = run.heroes[0];
    click('[data-act="train"][data-arg="0"]');
    assert.ok(d.querySelector('.am-up'), 'the upgrade view');
    const cid = U.am.up.card;
    const before = T.heroE(h, cid);
    const left = h.upUnspent;
    click('[data-act="amUpFace"][data-arg="E"]');
    click('.am-up [data-act="upRun"][data-arg$="|E|1"]');
    assert.equal(T.heroE(h, cid), before + 1, 'E went up by one');
    assert.ok(h.upUnspent < left || T.boundLeft(h, cid) >= 0);
    assert.ok(d.querySelector('.am-upcard.am-grown'), 'the card shows it grew');
    click('[data-act="closeModal"]');
    assert.ok(!d.querySelector('.am-up'));
  } finally {
    ctx.dom.window.close();
  }
});

test('After a mission: a loss the lifeline carries, then the end screens', { skip, timeout: 60_000 }, async () => {
  const ctx = await open();
  const { d, U, click } = ctx;
  try {
    const run = toReward(ctx, false);
    assert.equal(U.screen, 'reward');
    assert.ok(d.querySelector('.am-lost'), 'the lifeline screen');
    assert.match(d.querySelector('.am-big').textContent, /tide took it/i);
    click('[data-act="rewardDone"]');
    assert.equal(U.screen, 'map');
    // the expedition ends: the fallen screen, the logbook and the numbers
    run.over = true;
    run.phase = 'summary';
    U.screen = 'summary';
    U.render();
    assert.ok(d.querySelector('.am-fallen'));
    click('[data-act="amEnd"][data-arg="log"]');
    assert.ok(d.querySelector('.am-paper'), 'the logbook');
    assert.match(U.logbookText(run), /THE LOGBOOK/);
    click('[data-act="amEnd"][data-arg="stats"]');
    assert.ok(d.querySelector('.am-bignums'), 'the numbers');
    run.won = true;
    click('[data-act="amEnd"][data-arg="end"]');
    assert.ok(d.querySelector('.am-heart'), 'the Heart reached');
    click('[data-act="newRun"]');
    assert.equal(U.screen, 'draft');
  } finally {
    ctx.dom.window.close();
  }
});
