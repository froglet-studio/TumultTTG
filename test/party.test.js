'use strict';
/**
 * Players and seats: who may act for which hero, and the round that ends only when every
 * player is ready. The rules of play are the same for any number of players.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const T = require('../tools/load')();
const { createHarness } = require('../tools/harness');
const H = createHarness(T);

let hasJsdom = true;
try {
  require.resolve('jsdom');
} catch {
  hasJsdom = false;
}
const skip = hasJsdom ? false : 'jsdom is not installed (run `npm install`)';

test('a new run has one player who plays both heroes', () => {
  const run = T.newRun(1);
  assert.equal(T.playerCount(run), 1);
  assert.deepEqual(run.party.owner, [0, 0]);
  assert.deepEqual(H.plainProblems(run), []);
});

test('two players each play one hero; the host leads', () => {
  const run = T.newRun(1);
  run.party = T.newParty(2, ['Ana', 'Bo']);
  H.prebuiltSquad(run, 0, 1);
  assert.deepEqual(run.party.owner, [0, 1]);
  assert.deepEqual([T.heroesOf(run, 0), T.heroesOf(run, 1)], [[0], [1]]);
  assert.equal(T.ownerName(run, 1), 'Bo');
  assert.ok(T.mayActFor(run, [1], 1) && !T.mayActFor(run, [1], 0));
  assert.ok(T.mayActFor(run, null, 0), 'a shared screen acts for everyone');
  assert.ok(T.mayLead(run, [0]) && !T.mayLead(run, [1]) && T.mayLead(run, null));
  assert.equal(T.newParty(9).players.length, T.MAX_PLAYERS, 'never more players than pilots');
});

test('the round ends only when every player is ready', () => {
  const run = T.newRun(1);
  run.party = T.newParty(2);
  assert.equal(T.setReady(run, [0]), false, 'one of two is not enough');
  assert.equal(T.setReady(run, [0]), false, 'saying it twice changes nothing');
  assert.equal(T.setReady(run, [1]), true);
  T.clearReady(run);
  assert.deepEqual(run.party.ready, [false, false]);
  assert.equal(T.setReady(run, null), true, 'a shared screen readies everyone at once');
  const solo = T.newRun(1);
  assert.equal(T.setReady(solo, [0]), true, 'a solo player is ready alone');
});

test('the number of players never changes how a run plays', () => {
  const a = T.newRun(77);
  const b = T.newRun(77);
  b.party = T.newParty(2);
  for (const run of [a, b]) {
    H.prebuiltSquad(run, 2, 5);
    H.playRun(run);
  }
  const strip = (run) => T.serializeRun(Object.assign({}, run, { party: null }));
  assert.equal(strip(b), strip(a));
});

test('a save from 2.11 (mid-mission, before players) loads with one player and plays on', () => {
  const old = require('./fixtures/save-2.11.json');
  assert.equal(old.v, 3, 'the fixture is a version-3 save');
  assert.equal(old.party, undefined);
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.equal(T.playerCount(run), 1);
  assert.equal(run.tide, 'flood', 'the tide it was on is kept');
  assert.equal(run.phase, 'mission');
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run), 'it saves again unchanged');
  H.playRun(run);
  assert.ok(run.over, 'the Tide plays out');
});

test('UI: with two players, each screen acts only for its own pilot', { skip, timeout: 60_000 }, async () => {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const { until } = require('../tools/ui-drive');
  const { JSDOM } = require('jsdom');
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
    assert.ok(el, `nothing to click: ${a} ${arg}`);
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  };

  act('pickPlayers', 2);
  assert.match(d.body.textContent, /2 players/);
  act('newRun');
  U.run.seed = 3; // deterministic from here on
  U.run.rngs = {};
  assert.equal(w.T.playerCount(U.run), 2, 'the run has the players picked on the title screen');
  assert.match(d.body.textContent, /Player 1/, 'the draft says whose pilot it is');
  act('prebuilt', 'cavitt');
  act('confirmHero');
  assert.match(d.body.textContent, /Player 2/);
  act('prebuilt', w.T.PREBUILTS.find((p) => p.id !== 'cavitt').id);
  act('confirmHero');
  assert.equal(U.screen, 'map');

  // this screen now plays seat 1 only: the host's choices and hero 0 are not its to make
  U.seats = [1];
  const node = U.run.available[0];
  act('goNode', node);
  assert.equal(U.screen, 'map', "a guest cannot choose the squad's route");
  U.seats = null;
  act('goNode', node);
  assert.equal(U.screen, 'mission', 'the first node of this seed is a mission');
  U.seats = [1];
  const m = U.run.mission;
  const before = JSON.stringify(m.heroes[0]);
  const face = d.querySelector('[data-act="face"][data-arg^="0|"]');
  if (face) face.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.equal(JSON.stringify(m.heroes[0]), before, "a guest cannot play the host's pilot");
  const round = m.round;
  // the warning about banked AP may ask twice
  const ready = () => {
    act('endRound');
    if (U.ms.endConfirm) act('endRound');
  };
  // players take turns: round 1 is the host's first, so the guest's end-turn does nothing yet
  assert.match(d.querySelector('[data-act="endRound"]').textContent, /Player 1's turn/);
  ready();
  assert.equal(m.round, round, "a player cannot end someone else's turn");
  U.seats = [0];
  U.updateMission();
  assert.match(d.querySelector('[data-act="endRound"]').textContent, /End Player 1's turn/);
  ready();
  assert.equal(m.round, round, "ending the first player's turn passes it on; the round goes on");
  assert.equal(w.T.turnSeat(U.run), 1);
  U.seats = [1];
  U.updateMission();
  assert.match(d.querySelector('[data-act="endRound"]').textContent, /End Round/);
  ready();
  assert.ok(m.round > round || m.over, "the last player's turn ends the round");
  assert.equal(JSON.stringify(U.run.party.ready), '[false,false]', 'and the next round starts with nobody done');
  if (!m.over) assert.equal(w.T.turnSeat(U.run), 1, 'and the other player goes first');
  assert.deepEqual(errors, []);
});

test('a command does what the direct call does, and only for its own player', () => {
  const make = () => {
    const run = T.quickMission({ seed: 11, type: 'vault', tier: 1 });
    run.party = T.newParty(2);
    return run;
  };
  const a = make();
  const b = make();
  // round 1: the host's turn first; the guest may not move yet
  const h = a.mission.heroes[1];
  const to = T.reachableWalk(a.mission, h, T.apValue(h), false)[0];
  assert.ok(to != null);
  const early = T.execCommand(b, { op: 'walk', hero: 1, node: to }, [1]);
  assert.equal(early.ok, false, "a player cannot act in someone else's turn");
  assert.match(early.why, /Player 1's turn/);
  assert.equal(T.execCommand(b, { op: 'ready' }, [1]).ok, false, 'nor end it');
  assert.deepEqual(T.execCommand(b, { op: 'ready' }, [0]), { ok: true, passed: true, to: 1 });
  a.party.ready[0] = true;
  T.walk(a.mission, h, to);
  const r = T.execCommand(b, { op: 'walk', hero: 1, node: to }, [1]);
  assert.ok(r.ok);
  assert.equal(T.serializeRun(b), T.serializeRun(a));
  const refused = T.execCommand(b, { op: 'walk', hero: 0, node: to }, [1]);
  assert.equal(refused.ok, false, "a guest's command for the host's pilot is refused");
  assert.equal(T.serializeRun(b), T.serializeRun(a), 'and changes nothing');
  const round = b.mission.round;
  assert.ok(T.execCommand(b, { op: 'ready' }, [1]).ended);
  assert.ok(b.mission.round > round || b.mission.over);
  if (!b.mission.over) assert.equal(T.turnSeat(b), 1, 'the lead changes hands each round');
  assert.equal(T.execCommand(b, { op: 'nonsense', hero: 0 }, null).ok, false);
});

test('players take turns; a player with every pilot down is skipped', () => {
  const run = T.quickMission({ seed: 11, type: 'vault', tier: 1 });
  assert.equal(T.turnSeat(run), null, 'one player: no turns');
  run.party = T.newParty(2);
  assert.equal(T.turnSeat(run), 0);
  run.mission.heroes[0].downed = true;
  assert.equal(T.turnSeat(run), 1, 'a downed pilot has no turn to take');
  assert.equal(T.execCommand(run, { op: 'ready' }, [1]).ended, true, 'so the other player ends the round');
});
