#!/usr/bin/env node
'use strict';
/**
 * Headless balance harness.
 *
 *   node tools/sim.js [N=40] [missions|runs|cards|all] [--player weak|strong|both] [--tide rising|flood]
 *                     [--length short|full]
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
 *   --length  how long a run's expedition is, a key of T.LENGTHS (default full; runs only).
 *   --pilots  the squad's size, 2 to 5 (default 2); the missions scale to it (src/engine/scaling.js).
 *   --level   every pilot's level (default 1): what pilots bring back from earlier expeditions.
 *   --pets    every pilot has a pet (src/data/pets.js) in place of its last trait (missions only).
 *   --noscale the missions do not answer the squad's size or level (to see what the scaling buys).
 *   --scaling try other scaling numbers, for this run only: --scaling size.hp=0.3,level.foes=1
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
let length = 'full';
let pilots = 2;
let level = 1;
let pets = false;
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
  if (argv[i] === '--length') {
    length = argv[++i];
    if (!T.LENGTHS[length]) {
      console.error(`--length wants one of: ${Object.keys(T.LENGTHS).join(', ')}`);
      process.exit(2);
    }
    console.log(`length ${length}`);
    continue;
  }
  if (argv[i] === '--pilots') {
    pilots = Math.max(2, Math.min(5, parseInt(argv[++i], 10) || 2));
    console.log(`pilots ${pilots}`);
    continue;
  }
  if (argv[i] === '--level') {
    level = Math.max(1, parseInt(argv[++i], 10) || 1);
    console.log(`level ${level}`);
    continue;
  }
  if (argv[i] === '--scaling') {
    for (const kv of String(argv[++i] || '').split(',')) {
      const [path, v] = kv.split('=');
      const [k, f] = path.split('.');
      if (!T.SCALING[k] || !(f in T.SCALING[k]) || Number.isNaN(Number(v))) {
        console.error('--scaling wants size.F=N or level.F=N, F one of: ' + Object.keys(T.SCALING.size).join(', '));
        process.exit(2);
      }
      T.SCALING[k][f] = Number(v);
    }
    console.log('scaling', JSON.stringify(T.SCALING));
    continue;
  }
  if (argv[i] === '--pets') {
    pets = true;
    console.log('pets: every pilot has one, in place of a trait');
    continue;
  }
  if (argv[i] === '--noscale') {
    for (const k of ['size', 'level']) for (const f of Object.keys(T.SCALING[k])) T.SCALING[k][f] = 0;
    console.log('no scaling');
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
          T.setLength(run, length);
          if (i % 3 === 2) H.draftedSquad(run, pilots);
          else if (pilots === 2) H.prebuiltSquad(run, i % 6, (i + 1 + (i % 5)) % 6);
          else H.prebuiltSquad(run, H.squadIds(i, pilots));
          H.addProgression(run, tier);
          if (level > 1) H.addLevel(run, level);
          if (pets) H.givePets(run);
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
      T.setLength(run, length);
      try {
        if (i % 2) H.draftedSquad(run, pilots);
        else H.prebuiltSquad(run, H.squadIds(i, pilots));
        if (level > 1) H.addLevel(run, level);
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
