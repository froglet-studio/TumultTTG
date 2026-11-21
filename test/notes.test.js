'use strict';
/* Lines of story: the box beside End turn (T.addNote), kept in the log, the history and the chronicle. */
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

test('a line of story is one per pilot a round, kept clean, and changes nothing in play', () => {
  const run = T.quickMission({ seed: 21, type: 'vault', tier: 1 });
  const m = run.mission;
  const before = T.clone(m);
  assert.ok(T.addNote(m, 0, 'Cavitt   tests the rope\n before trusting it.').ok);
  assert.ok(T.addNote(m, 0, 'Cavitt tests the rope before trusting it.').ok, 'a second line replaces the first');
  assert.ok(T.addNote(m, 1, 'x'.repeat(500)).ok);
  assert.deepEqual(T.notesOf(m), [
    { r: m.round, hero: 0, text: 'Cavitt tests the rope before trusting it.' },
    { r: m.round, hero: 1, text: 'x'.repeat(T.NOTE_MAX) },
  ]);
  assert.ok(T.addNote(m, 1, '   ').ok, 'an empty line takes it back');
  assert.equal(T.notesOf(m).length, 1);
  assert.equal(T.addNote(m, 7, 'nobody').ok, false);
  // nothing but the log moved
  const strip = (x) => JSON.stringify(Object.assign({}, x, { log: null }));
  assert.equal(strip(m), strip(before));
  assert.deepEqual(H.plainProblems(m), []);
});

test("a line of story is a command for the player's own pilot, written on anyone's turn", () => {
  // Garrett, 2026-11-20: "we should be able to keep adding things during other players turns"
  const run = T.quickMission({ seed: 14, type: 'vault', tier: 1 });
  run.party = T.newParty(2);
  T.execCommand(run, { op: 'dump', hero: 0, di: 0 }, [0]); // the host begins their turn
  assert.equal(T.turnSeat(run), 0, "the host's turn");
  assert.ok(T.execCommand(run, { op: 'note', hero: 1, text: 'Waiting, watching.' }, [1]).ok, "on someone else's turn");
  assert.equal(
    T.execCommand(run, { op: 'note', hero: 1, text: 'Not mine.' }, [0]).ok,
    false,
    "never for someone else's pilot",
  );
  assert.ok(T.execCommand(run, { op: 'note', hero: 0, text: 'The host sets the pace.' }, [0]).ok);
  assert.ok(T.execCommand(run, { op: 'ready' }, [0]).passed);
  assert.ok(T.execCommand(run, { op: 'note', hero: 0, text: 'The host looks back.' }, [0]).ok, 'after their turn too');
  assert.ok(T.execCommand(run, { op: 'note', hero: 1, text: 'The guest follows the wind.' }, [1]).ok);
  assert.deepEqual(
    T.notesOf(run.mission).map((n) => [n.hero, n.text]),
    [
      [0, 'The host looks back.'],
      [1, 'The guest follows the wind.'],
    ],
    'one line a pilot a round, the latest kept',
  );
  assert.ok(T.COMMAND_OPS.includes('note'));
});

test('lines of story go to the history and are told again in the next passage', () => {
  const run = T.newRun(4411);
  H.prebuiltSquad(run, 0, 3);
  T.startMap(run);
  for (let guard = 0; guard < 10 && run.phase !== 'mission'; guard++) T.chooseNode(run, run.available[0]);
  assert.equal(run.phase, 'mission');
  T.addNote(run.mission, 0, 'We crossed the span at dusk.');
  T.endHeroPhase(run.mission);
  T.addNote(run.mission, 1, 'The wind did half the work.');
  const m = H.playMission(run.mission);
  T.missionRewards(run, m);
  T.applyMissionResult(run);
  const last = run.history[run.history.length - 1];
  assert.deepEqual(
    last.notes.map((n) => n.text),
    ['We crossed the span at dusk.', 'The wind did half the work.'],
  );
  if (run.over) return; // a lost run ends on the summary, which tells the last mission's lines itself
  if (run.lastReward) {
    run.lastReward.picked = run.heroes.map(() => true);
    run.lastReward.boonPicked = run.heroes.map(() => true);
  }
  T.finishNode(run);
  const p = T.currentPassage(run);
  const own = p.lines.filter((l) => l.own);
  assert.deepEqual(
    own.map((l) => [l.who, l.text]),
    [
      [0, 'We crossed the span at dusk.'],
      [1, 'The wind did half the work.'],
    ],
  );
  assert.deepEqual(H.plainProblems(run), []);
});

test('the lines of story never change how a run plays', () => {
  const play = (write) => {
    const t = require('../tools/load')();
    const h = createHarness(t);
    if (write) {
      const end = t.endHeroPhase;
      t.endHeroPhase = (m) => {
        t.addNote(m, 0, 'Round ' + m.round + ', in a line.');
        return end(m);
      };
    }
    const run = t.newRun(778);
    h.prebuiltSquad(run, 2, 5);
    h.playRun(run);
    const r = JSON.parse(t.serializeRun(run));
    delete r.story;
    delete r.rngs.story;
    r.history.forEach((x) => delete x.notes);
    return JSON.stringify(r).replace(/\{"r":\d+,"who":"note"[^}]*\},?/g, '');
  };
  assert.equal(play(false), play(true));
  require('../tools/load')(); // leave the shared T as it was for the tests after this one
});

test('a save from 2.30 (before lines of story) loads with none, plays on and saves again unchanged', () => {
  const old = require('./fixtures/save-2.30.json');
  assert.equal(old.v, 12, 'the fixture is a version-12 save');
  assert.ok(old.history.length && old.history.every((x) => x.notes === undefined));
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.ok(run.history.every((x) => Array.isArray(x.notes) && !x.notes.length));
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run));
  assert.ok(T.addNote(run.mission, 0, 'Picked up where we left it.').ok);
  assert.ok(H.playMission(run.mission).over);
});

test('UI: the box beside End turn keeps a line of story in the log', { skip, timeout: 60_000 }, async () => {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const { JSDOM } = require('jsdom');
  const { until } = require('../tools/ui-drive');
  const dom = new JSDOM(build().html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
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
    const box = d.getElementById('turnNote');
    assert.ok(box, 'the story box sits in the top bar');
    assert.ok(box.closest('.topbar').querySelector('[data-act="endRound"]'), 'beside End turn');
    box.value = 'Cavitt reads the <b>water</b> first.';
    box.dispatchEvent(new w.Event('input', { bubbles: true }));
    const round = m.round;
    click('[data-act="endRound"]');
    if (m.round === round) click('[data-act="endRound"]'); // the confirm for banked AP
    assert.equal(
      JSON.stringify(w.T.notesOf(m).map((n) => [n.r, n.text])),
      JSON.stringify([[round, 'Cavitt reads the <b>water</b> first.']]),
    );
    const line = d.querySelector('#mlog .note');
    assert.ok(line, 'the log shows it');
    assert.ok(!line.querySelector('b'), 'as text, never as markup');
    assert.match(line.textContent, /Cavitt reads the <b>water<\/b> first\./);
    assert.equal(d.getElementById('turnNote').value, '', 'a new round starts with an empty box');
  } finally {
    w.close();
  }
});
