#!/usr/bin/env node
'use strict';
/**
 * Headless balance harness.
 *
 *   node tools/sim.js [N=40] [missions|runs|cards|all]
 *
 *   missions  N auto-played missions per archetype × tier: win %, length, 8–14-round band, HP, kills
 *   runs      N full auto-played runs (map + missions + havens + events) with save round-trips
 *   cards     fire every face of every card once in a controlled arena (verb smoke test)
 *
 * The autoplayer is a heuristic FLOOR, not a ceiling: it does not kite, bait or
 * plan around intents the way a person does. Read the numbers accordingly.
 */
const { createHarness, ARCHETYPES } = require('./harness');

const H = createHarness();
const { T } = H;
const args = process.argv.slice(2);
const N = parseInt(args[0] || '40', 10);
const mode = args[1] || 'all';

const errors = {};
function recordErr(key, e) {
  const k =
    key +
    ' :: ' +
    String(e.stack || e)
      .split('\n')
      .slice(0, 2)
      .join(' | ');
  errors[k] = (errors[k] || 0) + 1;
}
const pct = (a, b) => ((100 * a) / b).toFixed(0);

if (mode === 'all' || mode === 'missions') {
  console.log(`\n=== MISSIONS (${N} each) ===`);
  console.log('archetype  tier   win%   avgR  inBand%  avgHP%  avgKills');
  for (const arch of ARCHETYPES) {
    for (const tier of [1, 2, 3]) {
      if (arch === 'boss' && tier < 3) continue;
      let wins = 0,
        rounds = 0,
        band = 0,
        hp = 0,
        kills = 0,
        played = 0;
      for (let i = 0; i < N; i++) {
        const run = T.newRun(1000 + i * 17 + tier * 101 + arch.length);
        if (i % 3 === 2) H.draftedSquad(run);
        else H.prebuiltSquad(run, i % 6, (i + 1 + (i % 5)) % 6);
        H.addProgression(run, tier);
        try {
          T.launchMission(run, arch, tier);
          const m = H.playMission(run.mission);
          played++;
          if (m.won) wins++;
          rounds += m.round;
          if (m.round >= 8 && m.round <= 14) band++;
          hp += run.heroes.reduce((s, h) => s + Math.max(0, h.hp) / h.maxHp, 0) / run.heroes.length;
          kills += m.stats.kills;
        } catch (e) {
          recordErr(arch + ' t' + tier, e);
        }
      }
      if (!played) {
        console.log(`${arch} t${tier}: all crashed`);
        continue;
      }
      console.log(
        `${arch.padEnd(9)}  ${tier}     ${pct(wins, played).padStart(3)}%   ${(rounds / played).toFixed(1).padStart(4)}   ` +
          `${pct(band, played).padStart(4)}%    ${pct(hp, played).padStart(3)}%    ${(kills / played).toFixed(1)}`,
      );
    }
  }
}

if (mode === 'all' || mode === 'runs') {
  console.log(`\n=== FULL RUNS (${N}) ===`);
  let wins = 0,
    rows = 0,
    crashes = 0,
    missions = 0,
    missionWins = 0;
  const endedBy = {};
  for (let i = 0; i < N; i++) {
    const run = T.newRun(5000 + i * 31);
    try {
      if (i % 2) H.draftedSquad(run);
      else H.prebuiltSquad(run, i % 6, (i + 2) % 6);
      const r = H.playRun(run);
      if (r.won) wins++;
      rows += r.lastRow;
      missions += r.missions;
      missionWins += r.missionWins;
      if (r.endedBy) endedBy[r.endedBy] = (endedBy[r.endedBy] || 0) + 1;
    } catch (e) {
      crashes++;
      recordErr('run', e);
    }
  }
  console.log(
    `run wins: ${wins}/${N}  avg row reached: ${(rows / N).toFixed(2)}  ` +
      `mission win%: ${missions ? pct(missionWins, missions) : 0}%  crashes: ${crashes}`,
  );
  console.log('run ended by:', endedBy);
}

if (mode === 'all' || mode === 'cards') {
  console.log('\n=== CARD SMOKE TEST ===');
  let fired = 0,
    unplayable = 0,
    failed = 0;
  for (const c of T.CARDS) {
    for (const fk of ['P', 'E']) {
      try {
        const r = H.fireFace(c.id, fk);
        if (r.status === 'fired') fired++;
        else unplayable++;
      } catch (e) {
        failed++;
        recordErr(c.id + '.' + fk, e);
      }
    }
  }
  console.log(`faces fired: ${fired}, unplayable in the test arena: ${unplayable}, failed: ${failed}`);
}

const keys = Object.keys(errors);
if (keys.length) {
  console.log('\n=== ERRORS ===');
  keys
    .sort((a, b) => errors[b] - errors[a])
    .slice(0, 25)
    .forEach((k) => console.log(errors[k] + 'x  ' + k));
  process.exitCode = 1;
} else {
  console.log('\nNo errors.');
}
