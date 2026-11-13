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
 *
 *   node tools/mission-log.js --save <file>
 *
 * carries on from a save instead — the text the playtest report's "Copy save" button copies, or
 * the browser's `tumult_v2_run` — from the exact moment it was taken: the log so far, then the
 * autoplayer's way to the end.
 */
const fs = require('fs');
const { createHarness } = require('./harness');

const H = createHarness();
const { T } = H;
let run;
if (process.argv[2] === '--save') {
  // a save is the whole run, a mission in progress included: carry on from that exact moment
  run = T.deserializeRun(fs.readFileSync(process.argv[3], 'utf8'));
  if (!run.mission) {
    const at = run.nodeId != null ? `row ${run.map.all[run.nodeId].row + 1}` : 'the start';
    console.log(`No mission in progress: this save is on the ${run.phase} screen at ${at} of seed ${run.seed}.`);
    console.log('squad: ' + run.heroes.map((h) => `${h.name} ${h.hp}/${h.maxHp} (${h.cards.join(' ')})`).join(' | '));
    process.exit(0);
  }
  console.log(
    `resuming seed ${run.seed}: ${run.mission.title} — ${run.mission.archetype} t${run.mission.tier}, round ${run.mission.round}`,
  );
} else {
  const [arch = 'vault', tier = '1', seed = '1', a = '0', b = '1', kit = 'start'] = process.argv.slice(2);
  run = T.quickMission({
    seed: Number(seed),
    heroes: [Number(a), Number(b)],
    type: arch,
    tier: Number(tier),
    kit,
  });
}
const m = run.mission;

const N = m.board.nodes;
console.log(
  'nodes: ' +
    Object.values(N)
      .map(
        (n) =>
          `${n.id}${n.height ? 'H' : ''}${n.objective ? '[' + n.objective.kind + ']' : ''}${n.spawn ? 'S' : ''}(${n.zones.join('/')})`,
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
