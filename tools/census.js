#!/usr/bin/env node
'use strict';
/**
 * Face census — is anything categorically better, or worse, than the rest?
 *
 *   node tools/census.js [N=4000] [--top 25] [--min 15] [--json file]
 *
 * The look-ahead player plays N missions (every archetype and tier in turn) with two random legal
 * heroes, each built from two random clades with the upgrade points a run would have by that tier.
 * For every hero in every mission, each awake face in hand is given an index:
 *
 *   index = (that face's share of the hero's face plays) × (number of awake faces the hero held)
 *
 * so 1 is a fair share. A face far above 1 is picked over its neighbours whatever they are — the
 * mark of something categorically better; a face near 0 is passed over whatever else is in hand.
 * The report gives the spread, the extremes, and the faces whose index falls most from tier 1 to
 * tier 3 (useful early, not late). Faces held fewer than --min times are left out.
 *
 * Read it beside the ability audit (`npm run audit`). Like the audit's pass B it measures one
 * player, who looks a round ahead and plays both heroes: a face it never picks may pay off later
 * than it can see, or be weak for its cost. The extremes are where to look, not verdicts.
 * About 7 minutes for 4000 missions on four cores; seeded and reproducible.
 */
const os = require('os');
const fs = require('fs');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { createHarness, ARCHETYPES } = require('./harness');

const H = createHarness();
const { T } = H;
const CELLS = [];
for (const a of ARCHETYPES) for (const t of [1, 2, 3]) if (a !== 'boss' || t === 3) CELLS.push([a, t]);

function squad(run, tier) {
  run.heroes = [];
  const rng = T.runStream(run, 'squad');
  for (let k = 0; k < 2; k++) {
    const species = rng.shuffle(T.SPECIES_ORDER.filter((s) => s !== 'human')).slice(0, 2);
    const h = T.newDraftHero(run, 'Census' + k, 'the counted', species);
    for (const id of rng.shuffle(T.CARDS.filter((c) => h.species.includes(c.sp)).map((c) => c.id))) {
      if (h.cards.length >= T.RULES.START_CARDS) break;
      if (T.canAddCard(h, id).ok) T.addCard(h, id);
    }
    h.upUnspent += (tier - 1) * 6; // roughly what a run has earned by this depth
    T.autoAllocate(h);
    run.heroes.push(h);
  }
}

const blank = () => ({ idx: 0, n: 0, used: 0, t: { 1: [0, 0], 2: [0, 0], 3: [0, 0] } });
function play(from, to) {
  const acc = {};
  let wins = 0;
  let plays = null;
  const real = T.playFace;
  T.playFace = function (m, h, id, fk) {
    const r = real.apply(this, arguments);
    // only what was really played: the look-ahead player also tries faces on copies it imagines
    if (r && r.ok && !m.imagined && plays) {
      const mine = (plays[h.uid] = plays[h.uid] || {});
      mine[id + '.' + fk] = (mine[id + '.' + fk] || 0) + 1;
    }
    return r;
  };
  for (let i = from; i < to; i++) {
    const [arch, tier] = CELLS[i % CELLS.length];
    const run = T.newRun(123000 + i * 7);
    squad(run, tier);
    T.launchMission(run, arch, tier);
    plays = {};
    H.playMission(run.mission, { player: 'strong' });
    if (run.mission.won) wins++;
    for (const h of run.heroes) {
      const faces = [];
      for (const id of h.cards)
        for (const fk of ['P', 'E'])
          if (fk === 'P' || T.heroE(h, id) >= T.RULES.ETHEREAL_MIN_E) faces.push(id + '.' + fk);
      const mine = plays[h.uid] || {};
      const total = Object.values(mine).reduce((a, b) => a + b, 0);
      for (const k of faces) {
        const a = (acc[k] = acc[k] || blank());
        const ix = total ? ((mine[k] || 0) / total) * faces.length : 0;
        a.idx += ix;
        a.n++;
        if (mine[k]) a.used++;
        a.t[tier][0] += ix;
        a.t[tier][1]++;
      }
    }
  }
  T.playFace = real;
  return { acc, wins };
}

if (!isMainThread) parentPort.postMessage(play(workerData.from, workerData.to));
else {
  const argv = process.argv.slice(2);
  const opt = (name, d) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : d);
  const N = Number(argv.find((a) => /^\d+$/.test(a)) || 4000);
  const TOP = Number(opt('--top', 25));
  const MIN = Number(opt('--min', 15));
  const W = Math.max(1, Math.min(4, os.cpus().length));
  const per = Math.ceil(N / W);
  Promise.all(
    [...Array(W)].map(
      (_, w) =>
        new Promise((resolve, reject) => {
          const wk = new Worker(__filename, { workerData: { from: w * per, to: Math.min(N, (w + 1) * per) } });
          wk.on('message', resolve);
          wk.on('error', reject);
        }),
    ),
  ).then((parts) => {
    const acc = {};
    let wins = 0;
    for (const p of parts) {
      wins += p.wins;
      for (const [k, a] of Object.entries(p.acc)) {
        const b = (acc[k] = acc[k] || blank());
        b.idx += a.idx;
        b.n += a.n;
        b.used += a.used;
        for (const t of [1, 2, 3]) for (const j of [0, 1]) b.t[t][j] += a.t[t][j];
      }
    }
    if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify({ N, wins, acc }));
    const rows = Object.entries(acc)
      .filter(([, a]) => a.n >= MIN)
      .map(([k, a]) => {
        const [id, fk] = k.split('.');
        const tier = (t) => (a.t[t][1] ? a.t[t][0] / a.t[t][1] : null);
        return {
          k,
          f: T.CARD[id][fk],
          name: `${T.CARD[id].name} — ${T.CARD[id][fk].n}`,
          idx: a.idx / a.n,
          n: a.n,
          used: a.used / a.n,
          t1: tier(1),
          t3: tier(3),
        };
      })
      .sort((x, y) => y.idx - x.idx);
    const line = (r) =>
      `${r.idx.toFixed(2).padStart(5)}  held ${String(r.n).padStart(4)}  played in ${(100 * r.used).toFixed(0).padStart(3)}%  ` +
      `t1 ${r.t1 == null ? '  – ' : r.t1.toFixed(2)} t3 ${r.t3 == null ? '  – ' : r.t3.toFixed(2)}  ${r.k.padEnd(17)} ${r.name} — ${r.f.txt(2, 2)}`;
    const band = (lo, hi) => rows.filter((r) => r.idx >= lo && r.idx < hi).length;
    console.log(`${N} missions, ${wins} won · ${rows.length} faces held at least ${MIN} times (fair share = 1)`);
    console.log(
      `index  <0.1: ${band(0, 0.1)}   0.1–0.5: ${band(0.1, 0.5)}   0.5–2: ${band(0.5, 2)}   2–3: ${band(2, 3)}   ≥3: ${band(3, Infinity)}`,
    );
    console.log(`\nMost chosen (${TOP})`);
    rows.slice(0, TOP).forEach((r) => console.log(line(r)));
    console.log(`\nLeast chosen (${TOP})`);
    rows.slice(-TOP).forEach((r) => console.log(line(r)));
    console.log(`\nFading: chosen at tier 1, much less at tier 3`);
    rows
      .filter((r) => r.t1 != null && r.t3 != null && r.t1 >= 1 && r.t3 < 0.4 * r.t1)
      .sort((x, y) => y.t1 - y.t3 - (x.t1 - x.t3))
      .slice(0, TOP)
      .forEach((r) => console.log(line(r)));
  });
}
