#!/usr/bin/env node
'use strict';
/**
 * Headless balance harness.
 *
 *   node tools/sim.js [N=40] [missions|runs|cards|all] [--player weak|strong|both] [--tide rising|flood]
 *                     [--rule NAME=VALUE ...]
 *
 *   missions  N auto-played missions per archetype × tier: win %, length, 8–14-round band, HP, kills
 *   runs      N full auto-played runs (map + missions + havens + events)
 *   cards     fire every face of every card once in a controlled arena (verb smoke test)
 *
 *   --player  who plays the squad. weak: the heuristic autoplayer, which knows a rule for two thirds
 *             of the card faces and looks no further than the action in hand. strong: the look-ahead
 *             player, which tries every legal action on a copy of the mission and scores the outcome.
 *             both (the default): the same missions under each, and the gap between them — how much
 *             a mission rewards thinking. The strong player takes about a tenth of a second a mission;
 *             `--player weak` is the quick look.
 *   --tide    the run's difficulty, a key of T.TIDES (default rising).
 *   --rule    try a different value for a constant in T.RULES, for this run only:
 *             node tools/sim.js 40 missions --rule VITALITY=28 --rule ETHEREAL_MIN_E=1
 *
 * Neither player is a person. The weak one is a floor; the strong one plans a single round ahead
 * and is closer to a careful player, but it does not bait, hold a card for later or read the log.
 */
const { createHarness, ARCHETYPES } = require('./harness');

const H = createHarness();
const { T } = H;
const argv = process.argv.slice(2);
const args = [];
let players = ['weak', 'strong'];
let tide = 'rising';
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--player') {
    const who = argv[++i];
    if (!['weak', 'strong', 'both'].includes(who)) {
      console.error('--player wants weak, strong or both');
      process.exit(2);
    }
    players = who === 'both' ? ['weak', 'strong'] : [who];
    continue;
  }
  if (argv[i] === '--tide') {
    tide = argv[++i];
    if (!T.TIDES[tide]) {
      console.error(`--tide wants one of: ${T.TIDE_ORDER.join(', ')}`);
      process.exit(2);
    }
    console.log(`tide ${tide}`);
    continue;
  }
  if (argv[i] !== '--rule') {
    args.push(argv[i]);
    continue;
  }
  const [name, value] = String(argv[++i] || '').split('=');
  if (!(name in T.RULES) || value === undefined || Number.isNaN(Number(value))) {
    console.error(`--rule wants NAME=NUMBER with NAME one of: ${Object.keys(T.RULES).join(', ')}`);
    process.exit(2);
  }
  T.RULES[name] = Number(value);
  console.log(`rule ${name} = ${value}`);
}
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

const NAME = { weak: 'heuristic', strong: 'look-ahead' };

if (mode === 'all' || mode === 'missions') {
  console.log(`\n=== MISSIONS (${N} each) — ${players.map((p) => NAME[p]).join(' | ')} ===`);
  const cols = ' win%  avgR  inBand%  avgHP%  avgKills';
  console.log('archetype  tier  ' + players.map(() => cols).join('   |') + (players.length > 1 ? '   |  gap' : ''));
  for (const arch of ARCHETYPES) {
    for (const tier of [1, 2, 3]) {
      if (arch === 'boss' && tier < 3) continue;
      const cells = players.map((player) => {
        const c = { wins: 0, rounds: 0, band: 0, hp: 0, kills: 0, played: 0 };
        for (let i = 0; i < N; i++) {
          // The same N squads meet every mission: squad i is built from run seed i in every cell, while
          // each cell's boards, dice and opposition are its own (a mission's seed names its type and tier).
          // Both players get the same squad on the same board with the same dice to come.
          const run = T.newRun(1000 + i);
          run.tide = tide;
          if (i % 3 === 2) H.draftedSquad(run);
          else H.prebuiltSquad(run, i % 6, (i + 1 + (i % 5)) % 6);
          H.addProgression(run, tier);
          try {
            T.launchMission(run, arch, tier);
            const m = H.playMission(run.mission, { player });
            c.played++;
            if (m.won) c.wins++;
            c.rounds += m.round;
            if (m.round >= 8 && m.round <= 14) c.band++;
            c.hp += run.heroes.reduce((s, h) => s + Math.max(0, h.hp) / h.maxHp, 0) / run.heroes.length;
            c.kills += m.stats.kills;
          } catch (e) {
            recordErr(`${arch} t${tier} (${NAME[player]})`, e);
          }
        }
        return c;
      });
      if (cells.some((c) => !c.played)) {
        console.log(`${arch} t${tier}: all crashed`);
        continue;
      }
      const show = (c) =>
        `${pct(c.wins, c.played).padStart(4)}%  ${(c.rounds / c.played).toFixed(1).padStart(4)}  ${pct(c.band, c.played).padStart(6)}%  ` +
        `${pct(c.hp, c.played).padStart(5)}%  ${(c.kills / c.played).toFixed(1).padStart(8)}`;
      const gap =
        cells.length > 1
          ? Math.round((100 * cells[1].wins) / cells[1].played - (100 * cells[0].wins) / cells[0].played)
          : 0;
      console.log(
        `${arch.padEnd(9)}  ${tier}    ` +
          cells.map(show).join('   |') +
          (cells.length > 1 ? `   |  ${(gap > 0 ? '+' : '') + gap}` : ''),
      );
    }
  }
}

if (mode === 'all' || mode === 'runs') {
  console.log(`\n=== FULL RUNS (${N}) ===`);
  for (const player of players) {
    let wins = 0,
      rows = 0,
      crashes = 0,
      missions = 0,
      missionWins = 0;
    const endedBy = {};
    for (let i = 0; i < N; i++) {
      const run = T.newRun(5000 + i * 31);
      run.tide = tide;
      try {
        if (i % 2) H.draftedSquad(run);
        else H.prebuiltSquad(run, i % 6, (i + 2) % 6);
        const r = H.playRun(run, { player });
        if (r.won) wins++;
        rows += r.lastRow;
        missions += r.missions;
        missionWins += r.missionWins;
        if (r.endedBy) endedBy[r.endedBy] = (endedBy[r.endedBy] || 0) + 1;
      } catch (e) {
        crashes++;
        recordErr(`run (${NAME[player]})`, e);
      }
    }
    console.log(
      `${NAME[player]}: run wins: ${wins}/${N}  avg row reached: ${(rows / N).toFixed(2)}  ` +
        `mission win%: ${missions ? pct(missionWins, missions) : 0}%  crashes: ${crashes}`,
    );
    console.log(`${NAME[player]}: run ended by:`, endedBy);
  }
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
