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

test('the number of players changes only whose crystals are whose: one purse each (Garrett, 2026-11-15)', () => {
  const a = T.newRun(77);
  const b = T.newRun(77);
  b.party = T.newParty(2);
  for (const run of [a, b]) {
    H.prebuiltSquad(run, 2, 5);
    T.startMap(run);
    for (let g = 0; g < 10 && run.phase !== 'mission'; g++) T.chooseNode(run, run.available[0]);
    H.playMission(run.mission);
  }
  assert.deepEqual(a.purses, [6], 'one player keeps one purse');
  assert.deepEqual(b.purses, [3, 3], 'two players share the starting crystals out');
  assert.equal(T.totalCrystals(b.mission), T.totalCrystals(a.mission), 'the same crystals in all');
  // the mission itself plays the same
  const strip = (run) =>
    T.serializeRun(
      Object.assign({}, run, {
        party: null,
        purses: null,
        mission: Object.assign({}, run.mission, { purses: null, owner: null }),
      }),
    );
  assert.equal(strip(b), strip(a));
});

test('each player buys, sells and fuels gear from their own purse; what the squad earns or pays is shared', () => {
  const run = T.newRun(91);
  run.party = T.newParty(2);
  H.prebuiltSquad(run, 0, 3);
  run.crystals = 20;
  T.startMap(run);
  assert.deepEqual(run.purses, [10, 10]);
  run.haven = T.havenStock(run);
  const g = T.GEAR.find((x) => x.price <= 10 && x.price > 0);
  run.purses = [g.price - 1, 10];
  assert.equal(T.buyGear(run, g.id, 0).ok, false, "a pilot can't spend its partner's crystals");
  assert.ok(T.buyGear(run, g.id, 1).ok);
  assert.deepEqual(run.purses, [g.price - 1, 10 - g.price]);
  const gi = run.heroes[1].gear.findIndex((x) => x.id === g.id);
  T.sellGear(run, 1, gi);
  assert.equal(run.purses[1], 10 - g.price + Math.floor(g.price / 2), 'selling pays the seller');
  // the squad's repair comes from the fullest purse first
  run.purses = [5, 1];
  assert.ok(T.havenRest(run, true).ok);
  assert.deepEqual(run.purses, [2, 1]);
  // what the squad earns together is shared out evenly, the odd one to the emptier purse
  T.gainShared(run, 5);
  assert.deepEqual(run.purses, [4, 4]);
  // a trait skipped pays its own player
  run.lastReward = { picked: [false, false], offers: [[], []] };
  T.skipOfferedCard(run, 1);
  assert.deepEqual(run.purses, [4, 6]);
  // in a mission, gear is fuelled from its player's purse
  T.launchMission(run, 'swarm', 1);
  const m = run.mission;
  assert.deepEqual(m.purses, [4, 6]);
  assert.deepEqual(m.owner, [0, 1]);
  assert.equal(T.crystalsFor(m, 1), 6);
  assert.deepEqual(H.plainProblems(m), []);
});

test('a save from 2.38 (one purse for the squad) loads with the crystals shared out among its players', () => {
  const old = require('./fixtures/save-2.38.json');
  assert.equal(old.v, 13, 'the fixture is a version-13 save');
  assert.equal(old.party.players.length, 2);
  assert.equal(old.mission.crystals, 13);
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.equal(run.crystals, undefined);
  assert.deepEqual(run.purses, [3, 3]);
  assert.deepEqual(run.mission.purses, [7, 6]);
  assert.deepEqual(run.mission.owner, [0, 1]);
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run), 'it saves again unchanged');
  assert.ok(H.playMission(run.mission).over);
  T.missionRewards(run, run.mission);
  T.applyMissionResult(run);
  assert.equal(run.purses.length, 2);
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
  // players take turns in the order they choose: the round opens, and this screen (seat 1) may go first
  U.updateMission();
  assert.match(d.querySelector('[data-act="endRound"]').textContent, /End Player 2's turn/);
  ready();
  assert.equal(m.round, round, "ending one player's turn passes it on; the round goes on");
  assert.ok(m.heroes[1].rolledAhead, "and that player's pilot rolls next round's dice at once");
  assert.equal(w.T.turnSeat(U.run), 0, 'the host is the only one left');
  ready();
  assert.equal(m.round, round, "a player cannot end someone else's turn, nor take a second");
  U.seats = [0];
  U.updateMission();
  assert.match(d.querySelector('[data-act="endRound"]').textContent, /End Round/);
  ready();
  assert.ok(m.round > round || m.over, "the last player's turn ends the round");
  assert.equal(JSON.stringify(U.run.party.ready), '[false,false]', 'and the next round starts with nobody done');
  if (!m.over) assert.ok(w.T.turnOpen(U.run), 'and with the order open again');

  // a purse each, and each screen shows only its own player's buttons in the shop and the upgrades
  const T = w.T;
  assert.equal(JSON.stringify(U.run.purses), '[3,3]', 'the starting crystals are shared out');
  U.run.mission = null;
  U.run.phase = 'haven';
  U.run.haven = T.havenStock(U.run);
  U.run.purses[0] = 40;
  U.screen = 'haven';
  U.seats = [1];
  U.render();
  const buys = () =>
    [...d.querySelectorAll('[data-act="buyGear"]')].map((b) => b.getAttribute('data-arg').split('|')[1]);
  assert.ok(buys().length && buys().every((i) => i === '1'), "the guest's screen offers to buy only for its own pilot");
  assert.ok(d.querySelector('[data-act="buyGear"]').disabled, 'and from its own purse (3 ◇)');
  assert.match(d.body.textContent, /Player 1/, 'both purses are shown, named');
  assert.ok(!d.querySelector('[data-act="train"][data-arg="0"]'), "nor can it train the host's pilot");
  U.seats = [0];
  U.render();
  assert.ok(buys().every((i) => i === '0'));
  assert.ok(!d.querySelector('[data-act="buyGear"]').disabled, "the host's 40 ◇ are the host's to spend");
  assert.deepEqual(errors, []);
});

test('a command does what the direct call does, and only for its own player', () => {
  const make = () => {
    const run = T.quickMission({ seed: 14, type: 'vault', tier: 1 });
    run.party = T.newParty(2);
    return run;
  };
  const a = make();
  const b = make();
  // round 1: the order is open; the guest goes first by acting, and the host waits
  const h = a.mission.heroes[1];
  const to = T.reachableWalk(a.mission, h, T.apValue(h), false)[0];
  assert.ok(to != null);
  assert.ok(T.turnOpen(b));
  const r = T.execCommand(b, { op: 'walk', hero: 1, node: to }, [1]);
  assert.ok(r.ok, 'the guest takes the first turn');
  a.party.active = 1;
  T.walk(a.mission, h, to);
  assert.equal(T.serializeRun(b), T.serializeRun(a));
  assert.equal(T.turnSeat(b), 1);
  const h0 = b.mission.heroes[0];
  const to0 = T.reachableWalk(b.mission, h0, T.apValue(h0), false)[0];
  const early = T.execCommand(b, { op: 'walk', hero: 0, node: to0 }, [0]);
  assert.equal(early.ok, false, "a player cannot act in someone else's turn");
  assert.match(early.why, /Player 2's turn/);
  assert.equal(T.execCommand(b, { op: 'ready' }, [0]).ok, false, 'nor end it');
  const refused = T.execCommand(b, { op: 'walk', hero: 0, node: to0 }, [1]);
  assert.equal(refused.ok, false, "a guest's command for the host's pilot is refused");
  assert.equal(T.serializeRun(b), T.serializeRun(a), 'and changes nothing');
  assert.deepEqual(T.execCommand(b, { op: 'ready' }, [1]), { ok: true, passed: true, to: 0 });
  assert.equal(T.execCommand(b, { op: 'walk', hero: 1, node: to }, [1]).ok, false, 'one turn a round');
  const round = b.mission.round;
  assert.ok(T.execCommand(b, { op: 'ready' }, [0]).ended);
  assert.ok(b.mission.round > round || b.mission.over);
  if (!b.mission.over) assert.ok(T.turnOpen(b), 'every round opens with the order to choose');
  assert.equal(T.execCommand(b, { op: 'nonsense', hero: 0 }, null).ok, false);
});

test('a player may end their turn without acting; on one screen, the turn named', () => {
  const run = T.quickMission({ seed: 14, type: 'vault', tier: 1 });
  run.party = T.newParty(3);
  run.heroes.push(T.heroFromPrebuilt(run, T.PREBUILTS[4]));
  assert.ok(T.turnOpen(run));
  assert.equal(T.execCommand(run, { op: 'ready' }, null).ok, false, 'one screen for all: say whose turn ends');
  assert.ok(T.execCommand(run, { op: 'ready', seat: 2 }, null).passed);
  assert.deepEqual(run.party.ready, [false, false, true]);
  assert.ok(T.turnOpen(run), 'two still to play, in either order');
  assert.ok(T.execCommand(run, { op: 'ready' }, [0]).passed, 'a screen of one player ends its own');
  assert.equal(T.turnSeat(run), 1, 'the last one left');
});

test('ending a turn rolls the next dice at once; the round deals them no second roll', () => {
  const run = T.quickMission({ seed: 9, type: 'vault', tier: 1 });
  run.party = T.newParty(2);
  const m = run.mission;
  const [a, b] = m.heroes;
  const total = (h) => h.pool + h.held.length;
  T.execCommand(run, { op: 'ready' }, [0]);
  assert.ok(a.rolledAhead && !b.rolledAhead);
  const aHeld = a.held.slice();
  assert.equal(total(a), T.RULES.POOL, 'pool and bank still make fifteen');
  const round = m.round;
  T.execCommand(run, { op: 'ready' }, [1]);
  if (m.over) return;
  assert.equal(m.round, round + 1);
  assert.ok(!a.rolledAhead && !b.rolledAhead, 'cleared as the round begins');
  assert.deepEqual(a.held.slice(0, aHeld.length), aHeld, 'the dice rolled ahead are the ones it holds');
  [a, b].forEach((h) => assert.equal(total(h), T.RULES.POOL));
});

test('players take turns; a player with every pilot down is skipped', () => {
  const run = T.quickMission({ seed: 11, type: 'vault', tier: 1 });
  assert.equal(T.turnSeat(run), null, 'one player: no turns');
  assert.equal(T.turnOpen(run), false);
  run.party = T.newParty(2);
  assert.equal(T.turnSeat(run), null, 'two players: the order is open');
  assert.ok(T.turnOpen(run));
  run.mission.heroes[0].downed = true;
  assert.equal(T.turnSeat(run), 1, 'a downed pilot has no turn to take');
  assert.equal(T.execCommand(run, { op: 'ready' }, [1]).ended, true, 'so the other player ends the round');
});

test('all at once: no turns, everyone plays whenever, and the round ends when everyone is done', () => {
  const run = T.quickMission({ seed: 14, type: 'vault', tier: 1 });
  run.party = T.newParty(2);
  const m = run.mission;
  assert.equal(T.execCommand(run, { op: 'rounds', mode: 'live' }, [1]).ok, false, 'the host chooses how rounds go');
  assert.equal(T.execCommand(run, { op: 'rounds', mode: 'sideways' }, [0]).ok, false);
  assert.ok(T.execCommand(run, { op: 'rounds', mode: 'live' }, [0]).ok);
  assert.equal(T.turnSeat(run), null, 'nobody has the turn');
  assert.equal(T.turnOpen(run), false);
  // two players act in any order, back and forth, without a turn to begin or end
  const dumpFor = (i) => T.execCommand(run, { op: 'dump', hero: i, di: 0 }, [T.ownerOf(run, i)]);
  for (const i of [1, 0, 1, 1, 0]) if (m.heroes[i].held.length) assert.ok(dumpFor(i).ok, 'pilot ' + i + ' acts');
  assert.equal(run.party.active, null);
  const round = m.round;
  // a player who is done can say so and take it back; while done, their pilot waits
  assert.ok(T.execCommand(run, { op: 'ready' }, [0]).waiting);
  assert.match(T.execCommand(run, { op: 'dump', hero: 0, di: 0 }, [0]).why, /is ready/);
  assert.ok(!m.heroes[0].rolledAhead, 'nobody rolls ahead: everyone rolls together as the round begins');
  assert.ok(T.execCommand(run, { op: 'ready' }, [0]).unready);
  assert.deepEqual(run.party.ready, [false, false]);
  // a story line may be written by anyone, any time
  assert.ok(T.execCommand(run, { op: 'note', hero: 1, text: 'Waits by the sluice.' }, [1]).ok);
  T.execCommand(run, { op: 'ready' }, [0]);
  assert.equal(m.round, round, 'one player still playing');
  const r = T.execCommand(run, { op: 'ready' }, [1]);
  assert.ok(r.ended || m.over);
  if (!m.over) {
    assert.equal(m.round, round + 1);
    assert.deepEqual(run.party.ready, [false, false], 'the next round starts with nobody done');
    m.heroes.forEach((h) => assert.equal(h.pool + h.held.length, T.RULES.POOL));
  }
  // on one screen, End Round ends it for everyone
  if (!m.over) assert.ok(T.execCommand(run, { op: 'ready' }, null).ended || m.over);
  // and back to turns: the order is open again
  assert.ok(T.execCommand(run, { op: 'rounds', mode: 'turns' }, null).ok);
  if (!m.over) assert.ok(T.turnOpen(run));
});

test('all at once: a player with every pilot down is not waited for', () => {
  const run = T.quickMission({ seed: 11, type: 'vault', tier: 1 });
  run.party = T.newParty(2);
  run.party.rounds = 'live';
  run.mission.heroes[0].downed = true;
  assert.equal(T.execCommand(run, { op: 'ready' }, [1]).ended, true);
});

test('a 2.80 save, mid-round with the host done, loads taking turns and plays on', () => {
  const old = require('./fixtures/save-2.80.json');
  assert.equal(old.v, 17, 'the fixture is a version-17 save');
  assert.deepEqual(old.party.ready, [true, false]);
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.equal(run.party.rounds, 'turns');
  assert.equal(run.party.active, null);
  assert.equal(T.turnSeat(run), 1, 'the guest is the one left to take a turn');
  assert.ok(!run.mission.heroes[0].rolledAhead, 'nothing was rolled ahead before 2.81');
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run), 'it saves again unchanged');
  assert.ok(T.execCommand(run, { op: 'ready' }, [1]).ended || run.mission.over);
  assert.ok(H.playMission(run.mission).over);
});
