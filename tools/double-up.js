'use strict';
/**
 * How many upgrade points should a trait taken a second time be worth (RULES.DOUBLE_UP)?
 * Garrett (2026-11-16): "another card and more upgrade power result in comparable win rates".
 *
 *   node tools/double-up.js [N=60] [--player weak|strong] [--tide rising|flood] [--max 4]
 *
 * Each sample is one pilot whose two clades share a trait (and who holds one), with a partner drafted
 * at random, given the kit of its tier. The same squad then meets the same mission, with the same board
 * and dice to come, several ways:
 *   as drafted   no extra pick
 *   new card     the pilot takes a trait it does not hold (one a pack would offer), with no points on it
 *   again +k     the pilot takes a shared trait it holds a second time: k UP bound to it, for k = 1..max
 * The table gives the mission win % and the heroes' HP left. The k whose row is closest to "new card"
 * is the value at which the two picks are worth about the same.
 */
const { createHarness } = require('./harness');
const H = createHarness();
const { T } = H;

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : dflt;
};
const N = parseInt(args.find((a) => /^\d+$/.test(a)) || '60', 10);
const player = flag('player', 'weak');
const tide = flag('tide', 'rising');
const MAX = parseInt(flag('max', '4'), 10);
const ARCH = ['swarm', 'vault', 'hidden', 'cascade', 'salvage', 'elite'];
const TIERS = [2, 3];

// every pair of non-human clades whose traits overlap, counting Human's (every pilot is a third human)
const clades = T.SPECIES_ORDER.filter((s) => s !== 'human');
const pairs = [];
for (let i = 0; i < clades.length; i++)
  for (let j = i + 1; j < clades.length; j++) {
    const shared = T.CARDS.filter((c) => {
      const n = ['human', clades[i], clades[j]].filter((s) => c.clades.includes(s)).length;
      return n >= 2;
    });
    if (shared.length) pairs.push([clades[i], clades[j]]);
  }

/** A squad whose first pilot can take a held trait again; null if the draft never gave it one. */
function squad(seed, tier) {
  const run = T.newRun(seed);
  run.tide = tide;
  H.draftedSquad(run); // the partner, and the streams a real draft would use
  const rng = T.runStream(run, 'player');
  const species = pairs[rng.int(pairs.length)];
  const h = T.newDraftHero(run, 'Sharer', 'the tested', species);
  // draft as a player who likes shared traits: take one when a pack offers it
  for (let p = 0; p < 30 && h.cards.length < T.RULES.START_CARDS; p++) {
    const pack = T.draftPack(run, h, 4).filter((id) => !T.canAddCard(h, id).double);
    if (!pack.length) break;
    const shared = pack.filter((id) => T.CARD[id].clades.filter((s) => h.species.includes(s)).length >= 2);
    T.addCard(h, (shared.length ? shared : pack)[rng.int(shared.length || pack.length)]);
  }
  T.autoAllocate(h);
  run.heroes[0] = h;
  H.addProgression(run, tier);
  const doubles = h.cards.filter((id) => T.canAddCard(h, id).double);
  const fresh = T.draftPack(run, h, 4).filter((id) => !T.canAddCard(h, id).double);
  if (!doubles.length || !fresh.length) return null;
  return { run, again: doubles[rng.int(doubles.length)], card: fresh[rng.int(fresh.length)] };
}

function play(run, arch, tier) {
  T.launchMission(run, arch, tier);
  const m = H.playMission(run.mission, { player });
  const hp = run.heroes.reduce((s, h) => s + Math.max(0, h.hp) / h.maxHp, 0) / run.heroes.length;
  return { won: !!m.won, hp };
}

const variants = ['as drafted', 'new card'].concat([...Array(MAX)].map((_, k) => `again +${k + 1}`));
const tot = Object.fromEntries(variants.map((v) => [v, { won: 0, hp: 0, n: 0 }]));
const base = T.RULES.DOUBLE_UP;
let skipped = 0;
for (const tier of TIERS)
  for (const arch of ARCH)
    for (let i = 0; i < N; i++) {
      const s = squad(5000 + i, tier);
      if (!s) {
        skipped++;
        continue;
      }
      for (const v of variants) {
        const run = T.clone(s.run);
        const h = run.heroes[0];
        if (v === 'new card') T.addCard(h, s.card);
        else if (v !== 'as drafted') {
          T.RULES.DOUBLE_UP = parseInt(v.split('+')[1], 10);
          T.addCard(h, s.again);
          T.autoAllocate(h);
          T.RULES.DOUBLE_UP = base;
        }
        const r = play(run, arch, tier);
        tot[v].won += r.won ? 1 : 0;
        tot[v].hp += r.hp;
        tot[v].n++;
      }
    }

const pct = (a, b) => ((100 * a) / b).toFixed(1);
console.log(
  `\n${player === 'strong' ? 'look-ahead' : 'heuristic'} player, ${tide} tide, tiers ${TIERS.join('+')}, ` +
    `${ARCH.length} mission types, ${tot['as drafted'].n} paired missions (${skipped} squads had nothing to take twice)`,
);
console.log('pick          win%    HP left');
for (const v of variants)
  console.log(`${v.padEnd(12)}  ${pct(tot[v].won, tot[v].n).padStart(5)}   ${pct(tot[v].hp, tot[v].n).padStart(5)}%`);
