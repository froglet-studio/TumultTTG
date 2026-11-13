'use strict';
/* The story between stops (src/data/story.js, src/engine/story.js). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const T = require('../tools/load')();
const { createHarness } = require('../tools/harness');
const H = createHarness(T);

const SITUATIONS = ['win', 'close', 'quiet', 'onward', 'reply'];

test('every clade has a voice for every situation, and every passage scene is painted', () => {
  for (const sp of Object.keys(T.SPECIES)) {
    const v = T.VOICES[sp];
    assert.ok(v, `${sp} has a voice`);
    for (const k of SITUATIONS) assert.ok(v[k] && v[k].length >= 2, `${sp} has two or more "${k}" lines`);
  }
  for (const k of ['start', 'win', 'close', 'loss', 'haven', 'event', 'leg', 'finale'])
    assert.ok(T.TERMINAL_LOG[k] && T.TERMINAL_LOG[k].length, `the Terminal logs "${k}"`);
  const painted = new Set(
    fs.readdirSync(path.join(__dirname, '..', 'assets', 'scenes')).map((f) => 'scene/' + f.replace(/\.[^.]+$/, '')),
  );
  for (const [k, list] of Object.entries(T.PASSAGE_SCENES))
    for (const s of list) assert.ok(painted.has(s), `${k}: ${s} is in assets/scenes`);
});

test('a run writes a passage at the start and after every stop, with every token filled', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const run = T.newRun(9000 + seed);
    H.prebuiltSquad(run, seed % 6, (seed + 2) % 6);
    H.playRun(run);
    assert.equal(run.story.log[0].kind, 'start', `seed ${seed}: the log opens at the start`);
    assert.ok(run.story.log.length >= 2, `seed ${seed}: the stops left passages`);
    run.story.log.forEach((p, i) => {
      assert.equal(p.n, i + 1);
      assert.ok(p.title && p.scene && p.lines.length >= 2, `seed ${seed}: passage ${p.n} is whole`);
      for (const l of p.lines) {
        assert.ok(!/\{\w+\}/.test(l.text), `seed ${seed}: "${l.text}" has an unfilled token`);
        assert.ok(l.who === 'terminal' || run.heroes[l.who], 'every line is the Terminal or a pilot of the squad');
      }
    });
    assert.deepEqual(H.plainProblems(run), [], 'the chronicle is plain data');
  }
});
test('the story draws from its own stream: with it or without it, a run plays out the same', () => {
  const play = (quiet) => {
    const t = require('../tools/load')();
    const h = createHarness(t);
    if (quiet) t.writePassage = () => null;
    const run = t.newRun(777);
    h.prebuiltSquad(run, 1, 4);
    h.playRun(run);
    const r = JSON.parse(t.serializeRun(run));
    delete r.story;
    delete r.rngs.story;
    return JSON.stringify(r);
  };
  assert.equal(play(false), play(true));
  require('../tools/load')(); // leave the shared T as it was for the tests after this one
});

test('a save from 2.14 (before the story) loads with an empty chronicle and writes on', () => {
  const old = require('./fixtures/save-2.14.json');
  assert.equal(old.v, 4, 'the fixture is a version-4 save');
  assert.equal(old.story, undefined);
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.deepEqual(run.story.log, []);
  assert.equal(T.serializeRun(T.deserializeRun(T.serializeRun(run))), T.serializeRun(run), 'it saves again unchanged');
  H.playRun(run);
  assert.ok(run.over);
  assert.ok(run.story.log.length >= 1, 'the chronicle starts at the next stop');
});
