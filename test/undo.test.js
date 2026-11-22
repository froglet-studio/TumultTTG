'use strict';
/**
 * Take-backs (docs/design/07-art-and-ux.md, Undo): a move can be undone until it rolls dice or reveals
 * something. T.canTakeBack decides; the mission screen keeps the missions to go back to.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const T = require('../tools/load')();

let hasJsdom = true;
try {
  require.resolve('jsdom');
} catch {
  hasJsdom = false;
}
const skip = hasJsdom ? false : 'jsdom is not installed (run `npm install`)';

/** Every action the look-ahead player could take now, each tried on its own copy. */
function tryEach(m) {
  return T.legalActions(m).map((a) => {
    const before = T.clone(m);
    const after = T.clone(m);
    const r = T.applyAction(after, a);
    return { a, ok: r.ok, back: T.canTakeBack(before, after), before, after };
  });
}

test('a step, a strike or a played face that rolls nothing can be taken back', () => {
  let found = 0;
  for (const type of ['vault', 'swarm', 'hidden', 'survey']) {
    for (let seed = 1; seed <= 6; seed++) {
      const run = T.quickMission({ seed, type, tier: 1 });
      for (const x of tryEach(run.mission)) {
        if (!x.ok) continue;
        // nothing random moved: the same streams, the same caches, the same foes on the board
        if (x.back) {
          assert.deepEqual(x.after.rngs, x.before.rngs);
          assert.equal(x.after.over, false);
          found++;
        }
      }
    }
  }
  assert.ok(found > 100, `too few moves could be taken back (${found})`);
});

test('a die rolled, a cache searched, a Hidden foe seen or the round ended cannot be taken back', () => {
  const run = T.quickMission({ seed: 3, type: 'vault', tier: 1 });
  const m = run.mission;
  const before = T.clone(m);
  const rolled = T.clone(m);
  T.stream(rolled.rngs, 'dice')();
  assert.equal(T.canTakeBack(before, rolled), false, 'a draw from the dice stream');

  const ended = T.clone(m);
  T.endHeroPhase(ended);
  assert.equal(T.canTakeBack(before, ended), false, 'the round ending');

  const hid = T.clone(m);
  const foe = hid.enemies.find((e) => e.alive);
  foe.states.Hidden = { t: 99, canMove: true };
  const seen = T.clone(hid);
  delete seen.enemies.find((e) => e.uid === foe.uid).states.Hidden;
  assert.equal(T.canTakeBack(hid, seen), false, 'a Hidden foe revealed');

  const cache = T.quickMission({ seed: 5, type: 'hidden', tier: 1 }).mission;
  const n = cache.objective.candidates[0];
  const searched = T.clone(cache);
  searched.board.nodes[n].objective.searched = true;
  assert.equal(T.canTakeBack(cache, searched), false, 'a cache searched');

  assert.equal(T.canTakeBack(before, T.clone(m)), true, 'nothing changed');
});

test(
  'UI: Undo puts the mission back as it stood, and ending the round clears it',
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
      click('.mnode.avail');
      assert.ok(d.getElementById('mfc').textContent.includes('End the round now'), 'the forecast has a strip');
      const undo = () => d.querySelector('[data-act="undo"]');
      assert.ok(undo() && undo().disabled, 'nothing to take back yet');

      // a step, made the way a player makes one: a click on a node the pilot can walk to
      const m0 = U.run.mission;
      const h = m0.heroes[U.ms.heroIdx];
      const to = w.T.reachableWalk(m0, h, 1, false)[0];
      assert.ok(to != null, 'somewhere to walk');
      const was = JSON.stringify(m0);
      const r = U.exec({ op: 'walk', hero: U.ms.heroIdx, node: to });
      assert.ok(r.ok);
      U.updateMission();
      assert.notEqual(JSON.stringify(U.run.mission), was);
      assert.equal(U.ms.undo.length, 1);
      assert.ok(!undo().disabled, 'the step can be taken back');

      click('[data-act="undo"]');
      assert.equal(JSON.stringify(U.run.mission), was, 'exactly as it stood');
      assert.equal(U.ms.undo.length, 0);
      assert.ok(undo().disabled);

      // another step, then the round ends: nothing before the enemy turn can be taken back
      assert.ok(U.exec({ op: 'walk', hero: U.ms.heroIdx, node: to }).ok);
      U.updateMission();
      assert.equal(U.ms.undo.length, 1);
      const round = U.run.mission.round;
      click('[data-act="endRound"]');
      if (U.run.mission.round === round) click('[data-act="endRound"]'); // the confirm for banked AP
      assert.equal(U.ms.undo.length, 0, 'a new round starts with nothing to take back');
    } finally {
      w.close();
    }
  },
);
