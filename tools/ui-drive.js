#!/usr/bin/env node
'use strict';
/**
 * Drive the BUILT game end-to-end in jsdom, through the real UI:
 * title → draft (one quick-build hero, one pack-drafted hero) → map →
 * missions / havens / events → run summary. Collects any JavaScript errors.
 *
 *   node tools/ui-drive.js [seed=1] [--manual] [--flood]
 *
 * auto (default): hero turns are played by the engine autoplayer, everything else by clicking.
 * --manual:       hero turns are played by clicking card faces, targets and nodes (a UI fuzz).
 * --flood:        pick the flood tide (the harder difficulty) on the title screen first.
 *
 * Requires the dev dependency `jsdom` (npm install).
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Wait until `ready()` is true, checking every few milliseconds; fail after `ms`. */
async function until(ready, what, ms = 5000) {
  for (const end = Date.now() + ms; !ready();) {
    if (Date.now() > end) throw new Error('timed out waiting for ' + what);
    await sleep(5);
  }
}

async function driveRun(html, { seed = 1, auto = true, maxSteps = 40, tide = 'rising' } = {}) {
  const { JSDOM } = require('jsdom');
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    beforeParse(w) {
      w.console.error = (...a) => errors.push('console.error: ' + a.map(String).join(' '));
      w.addEventListener('error', (e) => errors.push('window.error: ' + ((e.error && e.error.stack) || e.message)));
    },
  });
  const w = dom.window;
  const d = w.document;
  await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render'); // DOMContentLoaded → first render
  const T = w.T;
  const U = T.UI;
  U.MISSION_OVER_DELAY = 0; // the pause that lets a person see the final board
  const log = [];
  const step = (name) => log.push(`${name} → screen=${U.screen}`);
  const click = (target) => {
    const el = typeof target === 'string' ? d.querySelector(target) : target;
    if (!el || el.disabled) return false;
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  };
  const act = (a, arg) => click(arg != null ? `[data-act="${a}"][data-arg="${arg}"]` : `[data-act="${a}"]`);
  const all = (sel) => Array.from(d.querySelectorAll(sel));
  const clickNode = () => {
    const n = d.querySelector('#nodes .node.valid');
    if (n) n.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    return !!n;
  };

  try {
    if (!d.querySelector('[data-act="newRun"]')) throw new Error('title screen did not render');
    if (!act('pickTide', tide)) throw new Error('the title screen offers no ' + tide + ' tide');
    act('newRun');
    if (U.run.tide !== tide) throw new Error(`the run started on the ${U.run.tide} tide, not ${tide}`);
    // deterministic from here on: every stream of the run restarts from this seed
    U.run.seed = seed;
    U.run.rngs = {};

    // Hero 1: quick build. Hero 2: draft from packs.
    act('prebuilt', 'cavitt');
    act('confirmHero');
    act('draftMode', 'draft');
    act('pickSpecies', 'owl');
    act('pickSpecies', 'gecko');
    act('openPacks');
    for (let i = 0; i < T.RULES.START_CARDS; i++) {
      if (!click('[data-act="pickCard"]')) throw new Error('draft pack had no pickable card');
    }
    act('autoUp');
    act('confirmHero');
    step('draft done');
    if (U.screen !== 'map') throw new Error('expected the map after the draft, got ' + U.screen);

    let nodes = 0;
    let missions = 0;
    let guard = 0;
    while (!U.run.over && guard++ < maxSteps) {
      act('tutClose');
      if (U.screen === 'map') {
        if (click('[data-act="train"]')) {
          act('autoUpRun', '0');
          act('closeModal');
        }
        const avail = all('.mnode.avail');
        if (!avail.length) throw new Error('no reachable node on the map');
        click(avail[0]);
        nodes++;
        step('node ' + nodes);
      } else if (U.screen === 'mission') {
        const m = U.run.mission;
        let rounds = 0;
        while (!m.over && rounds++ < 30) {
          act('tutClose');
          if (auto) {
            T.autoHeroPhase(m);
            U.updateMission();
          } else {
            for (let hi = 0; hi < m.heroes.length && !m.over; hi++) {
              act('selHero', String(hi));
              for (let plays = 0; plays < 8 && !m.over; plays++) {
                const face = all('.fbtn.ok')[0];
                if (!face) break;
                click(face);
                if (U.ms.mode === 'target') {
                  const need = U.ms.pending.tg.need;
                  const ok = need === 'node' ? clickNode() : click('#tokens .token.targetable');
                  if (!ok) act('cancelMode');
                }
                if (U.ms.mode === 'choice') act('choice', 'pull');
                if (U.ms.mode === 'reroll') {
                  click('.die.pick');
                  act('rerollConfirm');
                }
                if (U.ms.mode === 'freeMove' && !clickNode()) act('cancelMode');
                if (U.ms.mode !== 'idle') act('cancelMode');
              }
              // a basic action, through its button and the target it asks for
              if (click(`[data-act="basic"][data-arg^="${hi}|"]:not([disabled])`) && U.ms.mode === 'target') {
                if (!click('#tokens .token.targetable')) act('cancelMode');
              }
              act('interact', String(hi));
              act('rally', String(hi));
              if (U.ms.mode === 'idle') clickNode(); // walk somewhere legal
            }
          }
          if (m.over) break;
          act('endRound');
          if (U.ms.endConfirm) act('endRound');
        }
        missions++;
        step(`mission "${m.title}" ${m.won ? 'won' : 'lost'} in ${m.round} rounds`);
        await until(() => d.querySelector('[data-act="missionDone"]'), 'the mission-over modal');
        if (!act('missionDone')) throw new Error('mission-over modal did not offer Continue');
      } else if (U.screen === 'reward') {
        if (!click('[data-act="takeCard"]:not([disabled])')) act('skipCard');
        click('[data-act="takeBoon"]');
        if (!act('rewardDone')) throw new Error('reward screen would not continue');
      } else if (U.screen === 'haven') {
        act('rest', 'half');
        click('[data-act="buyGear"]:not([disabled])');
        click('[data-act="buyCons"]:not([disabled])');
        act('leaveHaven');
      } else if (U.screen === 'event') {
        click('[data-act="eventOpt"]:not([disabled])');
        click('[data-act="evTakeCard"]:not([disabled])');
        click('[data-act="evTrade"]');
        act('evSkipCard');
        if (!act('leaveEvent')) throw new Error('event screen would not continue');
      } else if (U.screen === 'summary') {
        break;
      } else {
        throw new Error('unexpected screen ' + U.screen);
      }
    }
    step('end');
    return { log, nodes, missions, tide: U.run.tide, over: !!U.run.over, won: !!U.run.won, screen: U.screen, errors };
  } finally {
    w.close();
  }
}

module.exports = { driveRun, until };

if (require.main === module) {
  (async () => {
    const path = require('path');
    const { build } = await import(require('url').pathToFileURL(path.join(__dirname, 'build.mjs')).href);
    const args = process.argv.slice(2);
    const seed = Number(args.find((a) => /^\d+$/.test(a)) || 1);
    const tide = args.includes('--flood') ? 'flood' : 'rising';
    const r = await driveRun(build().html, { seed, auto: !args.includes('--manual'), tide });
    console.log(r.log.join('\n'));
    console.log(`\nnodes=${r.nodes} missions=${r.missions} over=${r.over} won=${r.won} screen=${r.screen}`);
    if (r.errors.length) {
      console.log('\nERRORS:\n' + r.errors.slice(0, 10).join('\n'));
      process.exit(1);
    }
    console.log('no JS errors');
  })().catch((e) => {
    console.error('DRIVER FAILED\n' + (e.stack || e));
    process.exit(2);
  });
}
