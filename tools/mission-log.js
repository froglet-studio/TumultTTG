#!/usr/bin/env node
'use strict';
/**
 * Print the full narrated log of one auto-played mission — the quickest way to
 * see what the rules actually do.
 *
 *   node tools/mission-log.js [archetype=vault] [tier=1] [seed=1] [heroA=0] [heroB=1] [kit=start]
 *
 * archetype: swarm | vault | hidden | cascade | elite | boss
 * heroA/heroB: indices into the pre-made heroes (T.PREBUILTS)
 * kit: start (the six-card starting kit) | tier (the kit a squad would have by that tier)
 *
 * The playtest build's "Jump into a mission" starts from the same T.quickMission, and its
 * report prints this command: same arguments, same board, same opening dice.
 */
const { createHarness } = require('./harness');

const H = createHarness();
const { T } = H;
const [arch = 'vault', tier = '1', seed = '1', a = '0', b = '1', kit = 'start'] = process.argv.slice(2);

const run = T.quickMission({
  seed: Number(seed),
  heroes: [Number(a), Number(b)],
  type: arch,
  tier: Number(tier),
  kit,
});
const m = run.mission;

const N = m.board.nodes;
console.log(
  'nodes: ' +
    Object.values(N)
      .map(
        (n) =>
          `${n.id}${n.height ? 'H' : ''}${n.objective ? '[' + n.objective.kind + ']' : ''}${n.spawn ? 'S' : ''}(${n.lane})`,
      )
      .join(' '),
);
console.log(
  'edges: ' +
    m.board.edges.map((e) => e.join('-')).join(' ') +
    ' | climb: ' +
    m.board.climb.map((e) => e.join('-')).join(' '),
);
console.log(
  'heroes: ' +
    m.heroes.map((h) => h.name + '@' + h.pos).join(', ') +
    ' | enemies: ' +
    m.enemies.map((e) => e.name + '@' + e.pos).join(', '),
);

H.playMission(m);
m.log.forEach((l) => console.log(`[r${l.r}] ${l.text}`));
console.log(
  `RESULT ${m.won ? 'WON' : 'LOST'} · round ${m.round} · hp ${m.heroes.map((h) => h.hp).join('/')} · clock ${m.clock ? m.clock.value : '—'}`,
);
