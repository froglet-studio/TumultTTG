'use strict';
/**
 * Does every turn give every pilot a decision? Plays missions with the look-ahead player and, at the
 * start of every round, asks T.turnChoices what each standing hero's turn offers:
 *   idle    nothing the hero could do is worth 3 points (about 3 vitality) over doing nothing
 *   forced  one outcome is clearly best: the turn plays itself
 *   open    two or more different outcomes are close to the best: a real choice
 * Both heroes are measured from the same position at the round's start, before either acts.
 *
 *   node tools/turns.js [N=10] [archetype …]     N missions per archetype × tier (~1 s a mission)
 */
const { createHarness, ARCHETYPES } = require('./harness');
const H = createHarness();
const { T } = H;

const args = process.argv.slice(2);
const N = parseInt(args[0], 10) || 10;
const only = args.slice(1).filter((a) => ARCHETYPES.includes(a));
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

const total = {
  idle: 0,
  forced: 0,
  open: 0,
  turns: 0,
  choices: 0,
  seat: [
    { dull: 0, n: 0 },
    { dull: 0, n: 0 },
  ],
};
console.log(`\n=== TURNS (${N} missions each, look-ahead player) ===`);
console.log('archetype  tier  turns  idle%  forced%  open%  choices   dull% pilot 1 | pilot 2');
for (const arch of only.length ? only : ARCHETYPES) {
  for (const tier of [1, 2, 3]) {
    if (arch === 'boss' && tier < 3) continue;
    const c = {
      idle: 0,
      forced: 0,
      open: 0,
      turns: 0,
      choices: 0,
      seat: [
        { dull: 0, n: 0 },
        { dull: 0, n: 0 },
      ],
    };
    for (let i = 0; i < N; i++) {
      const run = T.newRun(1000 + i);
      if (i % 3 === 2) H.draftedSquad(run);
      else H.prebuiltSquad(run, i % 6, (i + 1 + (i % 5)) % 6);
      H.addProgression(run, tier);
      T.launchMission(run, arch, tier);
      const m = run.mission;
      for (let guard = 0; !m.over && guard < 40; guard++) {
        m.heroes.forEach((h, hi) => {
          if (h.downed || !T.liveHeroes(m).includes(h)) return;
          const t = T.turnChoices(m, hi);
          for (const x of [c, total]) {
            x[t.kind]++;
            x.turns++;
            x.choices += t.choices;
            x.seat[hi].n++;
            if (t.kind !== 'open') x.seat[hi].dull++;
          }
        });
        T.smartHeroPhase(m);
        if (m.over) break;
        T.endHeroPhase(m);
      }
    }
    const row = (x) =>
      `${String(x.turns).padStart(5)}  ${String(pct(x.idle, x.turns)).padStart(4)}%  ${String(pct(x.forced, x.turns)).padStart(6)}%  ${String(pct(x.open, x.turns)).padStart(4)}%  ${(x.choices / Math.max(1, x.turns)).toFixed(1).padStart(7)}   ${String(pct(x.seat[0].dull, x.seat[0].n)).padStart(5)}%   | ${String(pct(x.seat[1].dull, x.seat[1].n)).padStart(4)}%`;
    console.log(`${arch.padEnd(9)}  ${tier}    ${row(c)}`);
  }
}
const r = total;
console.log(
  `\nall: ${r.turns} turns — idle ${pct(r.idle, r.turns)}%, forced ${pct(r.forced, r.turns)}%, open ${pct(r.open, r.turns)}%, ` +
    `${(r.choices / Math.max(1, r.turns)).toFixed(1)} close choices a turn`,
);
