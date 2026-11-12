#!/usr/bin/env node
'use strict';
/**
 * Ability audit — turns the design rules for abilities into numbers.
 *
 *   node tools/audit.js [N=60]           write docs/reference/ABILITY_AUDIT.md
 *   node tools/audit.js [N] --stdout     print the report instead of writing it
 *
 * The rules being checked (see CLAUDE.md, "Ability rules"):
 *   1. every ability is useful somewhere in the journey
 *   2. no mission requires a particular ability (no gates)
 *   3. no ability is a one-trick hard counter to one specific problem
 *   4. every ability is either a staple (plain, useful, used often) or a flexible tool
 *
 * Three passes:
 *   A. static — read each face's verb recipe and work out which recurring problems it answers
 *   B. usage  — let the autoplayer play random legal squads and count which faces it plays
 *   C. gates  — remove a whole family of answers from the card pool and see if missions stay winnable
 *
 * Everything is seeded, so the report only changes when the game does.
 * The tables at the top of this file ARE the audit's opinion — edit them when the game's vocabulary changes.
 */
const fs = require('fs');
const path = require('path');
const { createHarness, ARCHETYPES } = require('./harness');

const H = createHarness();
const { T } = H;
const args = process.argv.slice(2);
const N = Number(args.find((a) => /^\d+$/.test(a)) || 60);

/* ───────────────────────────── the audit's vocabulary ───────────────────────────── */

/** The recurring problems of a run. Each needs several different answers; none may have exactly one. */
const PROBLEMS = [
  ['single', 'One tough foe', 'elites, the Heart, Spawners, a Brute'],
  ['crowd', 'A crowd', 'Swarm waves, the Heart’s Biters'],
  ['armor', 'Shields', 'Warden, Bulwark, the Heart'],
  ['height', 'Height', 'the Vault ledge'],
  ['unknown', 'The unseen', 'hidden caches, Lurkers, a faded Harrier'],
  ['tempo', 'The clock', 'every objective mission, the flood'],
  ['hazard', 'Hazards and being dragged', 'flood tiles, undertow, the Heart’s pull'],
  ['burst', 'One big telegraphed hit', 'Slam, Ambush, Phase Lance, Crush'],
  ['attrition', 'Attrition', 'vitality carried from mission to mission'],
  ['control', 'Control on you', 'Rooted, Weakened, pushed and pulled'],
];
const PROBLEM_NAME = Object.fromEntries(PROBLEMS.map(([k, n]) => [k, n]));

const num = (v, P = 3, E = 3) => (typeof v === 'function' ? v(P, E) : v);
const WIDE = ['area', 'lane_all', 'nodeArea'];

/** Which problems one effect (one entry of a face's fx list) helps with. */
function answersOf(x) {
  const a = new Set();
  const add = (...ks) => ks.forEach((k) => a.add(k));
  switch (x.v) {
    case 'strike':
      add('single');
      if (WIDE.includes(x.kind) || x.chain) add('crowd');
      if (x.pierce || x.trueDmg || x.stripShield) add('armor'); // area does not get through a Warden's or the Heart's shield
      if (x.revealTarget || x.kind === 'area' || x.kind === 'nodeArea') add('unknown');
      break;
    case 'execute':
    case 'studied':
      add('single');
      break;
    case 'dot':
    case 'mark':
      add('single');
      if (x.area) add('crowd');
      break;
    case 'empower':
      add('single');
      if (x.pierce) add('armor');
      break;
    case 'morph':
      add('single');
      if (x.climb) add('height');
      if (x.move) add('tempo');
      if (x.shield) add('burst');
      break;
    case 'stripShield':
      add('armor');
      break;
    case 'expose':
      add('armor', 'single');
      break;
    case 'move':
      add('tempo', 'burst'); // get there sooner; step out of a lane or out of reach
      break;
    case 'teleport':
      add('tempo', 'burst');
      if (x.height || x.anyTerrain) add('height');
      break;
    case 'climb':
      add('height', 'tempo');
      break;
    case 'swap':
    case 'rally':
      add('tempo', 'burst');
      break;
    case 'hover':
      add('hazard', 'control');
      break;
    case 'weightless':
      add('height', 'hazard', 'control'); // height is the card's promise; v2.0's pathing does not honour it yet
      break;
    case 'force':
      add('burst', 'single'); // shove an attacker out of reach; drag a kiter into reach, or anything into a hazard or trap
      if (x.area) add('crowd');
      break;
    case 'reveal':
      add('unknown');
      if (x.findObjective || x.hintObjective) add('tempo');
      break;
    case 'locate':
      add('unknown');
      break;
    case 'aura':
      add(x.kind === 'reveal' ? 'unknown' : 'crowd');
      break;
    case 'hidden':
    case 'preempt':
    case 'counter':
    case 'stasis':
    case 'slow':
    case 'guard':
      add('burst');
      break;
    case 'shield':
      add('burst');
      if (x.all || x.party) add('crowd'); // many small hits
      break;
    case 'thorns':
    case 'ambushTrap':
    case 'decoy':
    case 'redirect':
    case 'trap':
      add('crowd', 'burst');
      break;
    case 'zone':
      add('crowd');
      if (x.weaken || x.hideHeroes) add('burst');
      break;
    case 'weaken':
      add('burst');
      if (x.area) add('crowd');
      break;
    case 'anchor':
      if (x.who === 'foe' || x.who === 'target')
        add('burst'); // it cannot walk or blink to you
      else add('hazard', 'control'); // you cannot be dragged
      break;
    case 'hazardImmune':
      add('hazard');
      if (x.kind === 'push') add('control');
      break;
    case 'clearHazard':
      add('hazard');
      break;
    case 'statusImmune':
    case 'cleanse':
      add('control');
      break;
    case 'heal':
    case 'revive':
      add('attrition');
      break;
    case 'phoenix':
      add('attrition', 'burst');
      break;
    case 'absorb':
      add('burst', 'tempo');
      break;
    case 'engine':
      add(x.kind === 'regen' ? 'attrition' : 'tempo');
      break;
    case 'mint':
    case 'draw':
    case 'reroll':
    case 'hasten':
    case 'freecast':
    case 'clock':
      add('tempo');
      break;
    case 'interact':
      add('tempo');
      if (x.height) add('height');
      break;
    default: // rest, slowSelf: costs, not answers
      break;
  }
  return a;
}

/**
 * Effects that are worth playing in any mission — the "straightforward and used often" half of rule 4:
 * damage and damage boosts, movement, direct mitigation, healing, and dice/track economy.
 * (Whether their numbers are good enough is a balance question, not an audit question.)
 */
const STAPLE_VERBS = [
  ...['strike', 'execute', 'dot', 'empower', 'mark', 'studied', 'expose', 'morph'], // damage
  ...['move', 'teleport', 'climb'], // movement
  ...['shield', 'preempt', 'weaken'], // mitigation that works against any hit
  ...['heal', 'engine'], // sustain and engines
  ...['mint', 'draw', 'reroll', 'hasten', 'freecast'], // dice and track economy
];
const isConditional = (x) => Object.keys(x).some((k) => /^if[A-Z]/.test(k));

/** Effects that can settle a mission's central problem on their own — worth a human look (rule 3). */
function soloRisks(x) {
  const out = [];
  if (x.v === 'reveal' && num(x.radius) >= 99) out.push('reveals the whole board');
  if (x.v === 'reveal' && x.findObjective) out.push('finds the hidden objective outright');
  if (x.v === 'locate' && num(x.dur) >= 99) out.push('locates a foe for the whole mission');
  if (x.v === 'interact' && x.height) out.push('works the Vault from the floor');
  if ((x.v === 'stripShield' && x.amount == null) || (x.v === 'strike' && x.stripShield))
    out.push('deletes a Shield outright');
  if (x.v === 'hazardImmune' && x.party && x.kind !== 'push' && num(x.dur) >= 2)
    out.push('whole squad ignores hazards');
  return out;
}

/** Families of answers to remove in the gate check: [id, label, effect predicate]. */
const ABLATIONS = [
  [
    'vertical',
    'no way up',
    (x) =>
      (x.v === 'teleport' && (x.height || x.anyTerrain)) ||
      ['climb', 'weightless'].includes(x.v) ||
      (x.v === 'morph' && x.climb) ||
      (x.v === 'interact' && x.height),
  ],
  [
    'shieldbreak',
    'no shield-breakers',
    (x) =>
      (x.v === 'strike' && (x.pierce || x.trueDmg || x.stripShield)) ||
      ['stripShield', 'expose'].includes(x.v) ||
      (x.v === 'empower' && x.pierce),
  ],
  [
    'reveal',
    'no reveals',
    (x) =>
      ['reveal', 'locate'].includes(x.v) ||
      (x.v === 'aura' && x.kind === 'reveal') ||
      (x.v === 'strike' && x.revealTarget),
  ],
  [
    'area',
    'no area damage',
    (x) =>
      (x.v === 'strike' && (WIDE.includes(x.kind) || x.chain)) ||
      x.v === 'zone' ||
      (x.v === 'dot' && x.area) ||
      (x.v === 'aura' && x.kind === 'digest'),
  ],
  [
    'mitigation',
    'no shields or wards',
    (x) => ['shield', 'preempt', 'guard', 'stasis', 'counter', 'hidden', 'absorb', 'phoenix', 'thorns'].includes(x.v),
  ],
  ['heal', 'no healing', (x) => ['heal', 'revive'].includes(x.v) || (x.v === 'engine' && x.kind === 'regen')],
  [
    'mobility',
    'no movement abilities',
    (x) => ['move', 'teleport', 'climb', 'swap', 'hover', 'weightless'].includes(x.v),
  ],
  [
    'control',
    'no foe control',
    (x) =>
      (x.v === 'anchor' && (x.who === 'foe' || x.who === 'target')) ||
      ['weaken', 'slow', 'force', 'trap', 'redirect'].includes(x.v),
  ],
  [
    'hazard',
    'no hazard answers',
    (x) =>
      ['hazardImmune', 'clearHazard', 'hover', 'weightless'].includes(x.v) ||
      (x.v === 'anchor' && (x.who === 'self' || x.who === 'ally')),
  ],
  [
    'economy',
    'no dice economy',
    (x) => ['mint', 'draw', 'reroll', 'hasten', 'freecast'].includes(x.v) || (x.v === 'engine' && x.kind !== 'regen'),
  ],
];

/** Does the heuristic autoplayer (src/engine/ai.js) have any rule that could play this face? */
function autoplayerKnows(face) {
  const has = (...vs) => face.fx.some((x) => vs.includes(x.v));
  const foe = /^foe_/.test(face.tgt) && face.tgt !== 'foe_or_ally_adj';
  const node = /^node_/.test(face.tgt);
  const strike = face.fx.find((x) => x.v === 'strike');
  if (strike) return foe || ['area', 'lane_all'].includes(strike.kind) || !!strike.nearest;
  if (has('shield', 'preempt', 'counter', 'stasis', 'heal', 'reveal', 'engine')) return true;
  if (face.fx.some((x) => x.v === 'anchor' && x.who === 'foe') || has('weaken')) return foe;
  if (has('trap')) return node;
  if (has('teleport', 'climb', 'move')) return node;
  return false;
}

/* ───────────────────────────── pass A: static ───────────────────────────── */

const FACES = [];
for (const c of T.CARDS) {
  for (const fk of ['P', 'E']) {
    const face = c[fk];
    const answers = new Set();
    face.fx.forEach((x) => answersOf(x).forEach((k) => answers.add(k)));
    const staple = face.fx.some((x) => STAPLE_VERBS.includes(x.v) && !isConditional(x));
    FACES.push({
      key: c.id + '.' + fk,
      card: c,
      fk,
      face,
      answers: PROBLEMS.map(([k]) => k).filter((k) => answers.has(k)),
      cls: staple ? 'staple' : answers.size >= 2 ? 'tool' : 'narrow',
      risks: face.fx.flatMap(soloRisks),
      allConditional: face.fx.length > 0 && face.fx.every(isConditional),
      ai: autoplayerKnows(face),
      plays: 0,
      exposure: 0,
      by: Object.fromEntries(ARCHETYPES.map((a) => [a, { plays: 0, exposure: 0 }])),
    });
  }
}
const FACE = Object.fromEntries(FACES.map((f) => [f.key, f]));

/* ───────────────────────────── squads ───────────────────────────── */

/** Two heroes with random bloodlines and random legal kits, never using a banned card. `banned === 'all'` → no cards. */
function randomSquad(run, banned, tier) {
  run.heroes = [];
  for (let k = 0; k < 2; k++) {
    let h;
    for (let tries = 0; tries < 40; tries++) {
      const species = run.rng.shuffle(T.SPECIES_ORDER.filter((s) => s !== 'human')).slice(0, 2);
      h = T.newDraftHero(run, 'Audit' + k, 'the audited', species);
      if (banned === 'all') break;
      const pool = run.rng.shuffle(
        T.CARDS.filter((c) => h.species.includes(c.sp) && !banned.has(c.id)).map((c) => c.id),
      );
      for (const id of pool) {
        if (h.cards.length >= T.RULES.START_CARDS) break;
        if (T.canAddCard(h, id).ok) T.addCard(h, id);
      }
      if (h.cards.length >= T.RULES.START_CARDS) break;
    }
    h.upUnspent += (tier - 1) * 6; // roughly what a run has earned by this depth
    T.autoAllocate(h);
    run.heroes.push(h);
  }
}

const CELLS = [];
for (const arch of ARCHETYPES)
  for (const tier of [1, 2, 3]) if (arch !== 'boss' || tier === 3) CELLS.push([arch, tier]);

function playCell(arch, tier, i, banned, salt) {
  const seed = 90000 + salt * 7919 + i * 131 + tier * 17 + ARCHETYPES.indexOf(arch) * 1009;
  const run = T.newRun(seed);
  randomSquad(run, banned, tier);
  run.rng = T.makeRng(seed + 1); // the board and its foes depend on the seed only, not on how the squad was built
  T.launchMission(run, arch, tier);
  H.playMission(run.mission);
  return run;
}

/* ───────────────────────────── pass B: usage ───────────────────────────── */

let currentArch = null;
const realPlayFace = T.playFace;
T.playFace = function (m, h, cardId, fk) {
  const r = realPlayFace.apply(this, arguments);
  if (r && r.ok && currentArch) {
    const f = FACE[cardId + '.' + fk];
    f.plays++;
    f.by[currentArch].plays++;
  }
  return r;
};
let usageMissions = 0;
for (const [arch, tier] of CELLS) {
  for (let i = 0; i < N; i++) {
    currentArch = arch;
    const run = playCell(arch, tier, i, new Set(), 0);
    usageMissions++;
    for (const h of run.heroes) {
      for (const id of h.cards) {
        for (const fk of ['P', 'E']) {
          FACE[id + '.' + fk].exposure++;
          FACE[id + '.' + fk].by[arch].exposure++;
        }
      }
    }
  }
}
currentArch = null;
T.playFace = realPlayFace;

for (const f of FACES) {
  f.rate = f.exposure ? f.plays / f.exposure : 0;
  // share of this face's (exposure-normalised) use that comes from its single best mission type
  const rates = ARCHETYPES.map((a) => (f.by[a].exposure ? f.by[a].plays / f.by[a].exposure : 0));
  const sum = rates.reduce((s, x) => s + x, 0);
  f.topArch = sum ? ARCHETYPES[rates.indexOf(Math.max(...rates))] : null;
  f.topShare = sum ? Math.max(...rates) / sum : 0;
}

/* ───────────────────────────── pass C: gates ───────────────────────────── */

const bannedBy = (pred) =>
  new Set(T.CARDS.filter((c) => ['P', 'E'].some((fk) => c[fk].fx.some(pred))).map((c) => c.id));
const CONDITIONS = [['baseline', 'any cards (baseline)', new Set()]]
  .concat(ABLATIONS.map(([id, label, pred]) => [id, label, bannedBy(pred)]))
  .concat([['none', 'no cards at all', 'all']]);
const GATE_CELLS = CELLS.filter(([arch, tier]) => tier <= 2 || arch === 'boss');
const gate = {}; // gate[condition][cell] = win rate
CONDITIONS.forEach(([id, , banned]) => {
  gate[id] = {};
  for (const [arch, tier] of GATE_CELLS) {
    let wins = 0;
    // every condition plays the same boards and opposition; squads are re-drawn from whatever cards remain
    for (let i = 0; i < N; i++) if (playCell(arch, tier, i, banned, 1).mission.won) wins++;
    gate[id][arch + tier] = wins / N;
  }
});

/* ───────────────────────────── report ───────────────────────────── */

const pct = (x) => Math.round(x * 100) + '%';
const faceName = (f) => `${f.card.name} — ${f.face.n} (${f.fk === 'P' ? 'Phys' : 'Eth'})`;
const faceLine = (f) => `**${faceName(f)}** \`${f.key}\` — ${f.face.txt(1, 1)}`;
const MIN_EXPOSURE = Math.max(8, Math.round(N / 2));

const narrow = FACES.filter((f) => f.cls === 'narrow');
const useless = FACES.filter((f) => f.answers.length === 0);
const hardCounters = FACES.filter((f) => f.risks.length && f.cls === 'narrow');
const soloTools = FACES.filter((f) => f.risks.length && f.cls !== 'narrow');
const conditional = FACES.filter((f) => f.allConditional);
const blind = FACES.filter((f) => !f.ai);
const unplayed = FACES.filter((f) => f.ai && f.exposure >= MIN_EXPOSURE && f.plays === 0);
const oneMission = FACES.filter((f) => f.plays >= 10 && f.topShare >= 0.7);
const counts = { staple: 0, tool: 0, narrow: 0 };
FACES.forEach((f) => counts[f.cls]++);

const MIN_BASELINE = 0.3;
const gateFindings = [];
for (const [id, label] of CONDITIONS.slice(1)) {
  for (const [arch, tier] of GATE_CELLS) {
    const base = gate.baseline[arch + tier];
    const got = gate[id][arch + tier];
    if (base >= MIN_BASELINE && got <= base * 0.25) gateFindings.push({ id, label, arch, tier, base, got });
  }
}
const cardGates = gateFindings.filter((g) => g.id !== 'none');
// a cell the autoplayer rarely wins even with every card cannot show a collapse, so it cannot be judged
const unjudged = GATE_CELLS.filter(([a, t]) => gate.baseline[a + t] < MIN_BASELINE);
const unjudgedNames = unjudged.map(([a, t]) => `${a} t${t}`).join(', ');

const out = [];
const p = (s = '') => out.push(s);
p('# Ability audit');
p();
p(
  '> Generated by `npm run audit` (`tools/audit.js`). Do not edit by hand — change the game, or the tables at the top of the tool.',
);
p(
  `> ${FACES.length} faces on ${T.CARDS.length} cards · ${usageMissions} usage missions · ${N} missions per gate cell · seeded and reproducible.`,
);
p();
p('The rules this checks:');
p();
p('1. Every ability is useful somewhere in the journey.');
p('2. No mission requires a particular ability — nothing is a gate.');
p('3. No ability is a one-trick hard counter to one specific problem.');
p(
  '4. Every ability is either a **staple** (plain, useful, played often) or a flexible **tool** (answers several kinds of problem).',
);
p();
p(
  '**How to read it.** Pass A is the audit’s *opinion* of each face, derived from its verb recipe: which of ten recurring ' +
    'problems it answers. Pass B is what the heuristic autoplayer actually played. Pass C removes a whole family of answers ' +
    'from the card pool and replays every mission type. The autoplayer is a weak, literal player — a floor, not a verdict — ' +
    'so treat pass B as “where to look”, and pass C as conservative (if a weak player still wins without a family, a human will).',
);
p();
p(
  '**Limits.** Only trait cards are audited — gear and enemy abilities are not, yet. Pass A reads recipes, which is to say ' +
    'intent: where the engine does not honour a recipe option (see the known issues in `docs/HANDOFF.md`), the audit overstates.',
);
p();
p('## Summary');
p();
p('| Rule | Result |');
p('|---|---|');
p(
  `| 1 · useful somewhere | ${useless.length === 0 ? 'OK — every face answers at least one problem' : `**${useless.length} faces answer no listed problem**`} |`,
);
p(
  `| 2 · no gates | ${cardGates.length === 0 ? 'OK — no mission type collapses when one family of answers is removed' : `**${cardGates.length} mission/family pairs collapse** (see the gate check)`}${unjudged.length ? ` (${unjudgedNames} cannot be judged — the baseline is too low)` : ''}; but with no cards at all, missions whose objective is a kill are all but unwinnable |`,
);
p(
  `| 3 · no hard counters | ${hardCounters.length === 0 ? 'OK — no narrow face settles a mission on its own' : `**${hardCounters.length} narrow faces settle a problem on their own**`}${soloTools.length ? `; ${soloTools.length} broader faces can also settle one alone (review)` : ''} |`,
);
p(`| 4 · staple or flexible tool | ${counts.staple} staples, ${counts.tool} tools, **${counts.narrow} narrow** |`);
p(
  `| autoplayer coverage | it has a rule for ${FACES.length - blind.length} of ${FACES.length} faces; of those, ${unplayed.length} were never played and ${oneMission.length} were played almost only in one mission type |`,
);
p();
p('## The ten problems, and how many faces answer each');
p();
p('| Problem | Where it shows up | Faces that answer it | …of which staples |');
p('|---|---|---|---|');
for (const [k, name, where] of PROBLEMS) {
  const list = FACES.filter((f) => f.answers.includes(k));
  p(`| ${name} | ${where} | ${list.length} | ${list.filter((f) => f.cls === 'staple').length} |`);
}
p();
p(
  'A problem with few answers is a gate waiting to happen; a problem with very many is not really a problem. Both are design smells.',
);
p();
p('## Pass C — gate check');
p();
p(
  `Win rate of two random legal heroes (no gear, no boons) played by the autoplayer, ${N} missions per cell. Every row plays ` +
    'the same boards and opposition; squads are re-drawn from the cards that remain, so rows are independent samples and ' +
    'differences under about fifteen points are noise. Each row removes every card that has the named kind of effect on ' +
    'either face. **⚠** marks a cell that fell to a quarter of its baseline or less; **†** marks a column whose baseline is ' +
    'under 30%, where a collapse could not show.',
);
p();
const dagger = (a, t) => (gate.baseline[a + t] < MIN_BASELINE ? ' †' : '');
p('| Squads built with… | cards left | ' + GATE_CELLS.map(([a, t]) => `${a} t${t}${dagger(a, t)}`).join(' | ') + ' |');
p('|---|---|' + GATE_CELLS.map(() => '---').join('|') + '|');
for (const [id, label, banned] of CONDITIONS) {
  const left = banned === 'all' ? 0 : T.CARDS.length - banned.size;
  const cells = GATE_CELLS.map(([a, t]) => {
    const flagged = gateFindings.some((g) => g.id === id && g.arch === a && g.tier === t);
    return pct(gate[id][a + t]) + (flagged ? ' ⚠' : '');
  });
  p(`| ${label} | ${left} | ${cells.join(' | ')} |`);
}
p();
if (cardGates.length) {
  p('**Collapsed cells** — each is a mission type that leans on one family of answers:');
  p();
  for (const g of cardGates) p(`- ${g.arch} tier ${g.tier} with ${g.label}: ${pct(g.base)} → ${pct(g.got)}`);
} else {
  p(
    'No mission type collapses when any one family of answers is removed' +
      (unjudged.length ? ` — among those that can be judged. Not judged: ${unjudgedNames}.` : '.'),
  );
}
p();
p(
  'The last row is the pure test of rule 2: squads with **no abilities at all** — only walking, Interact and Rally. ' +
    'Wherever that row is at or near 0%, the mission cannot be finished without cards. That is expected for missions whose ' +
    'objective is a kill (v2.0 has no basic attack; the rare win is a foe dying in a hazard) and is the reason the roadmap ' +
    'adds basic actions for everyone.',
);
p();
p('## Review list');
p();
const section = (title, note, list, fmt = faceLine) => {
  p(`### ${title} (${list.length})`);
  p();
  p(note);
  p();
  if (!list.length) p('*None.*');
  for (const f of list) p('- ' + fmt(f));
  p();
};
section(
  'Narrow faces',
  'No universally useful effect (damage or a damage boost, movement, direct mitigation, healing, dice economy) and at most one kind of problem answered — so in most missions the face has nothing to do. Rule 4 says each of these should gain a second use or become plainly, generally useful.',
  narrow,
  (f) => `${faceLine(f)} *(answers: ${f.answers.map((k) => PROBLEM_NAME[k]).join(', ') || 'nothing listed'})*`,
);
section(
  'Hard-counter candidates',
  'Narrow faces whose one use settles a mission’s central problem by itself. These break rule 3 outright.',
  hardCounters,
  (f) => `${faceLine(f)} *(${f.risks.join('; ')})*`,
);
section(
  'Broad faces that can still settle a problem alone',
  'Fine as tools, but check that the mission keeps some play when one of these is in the squad — the problem should get easier, not vanish.',
  soloTools,
  (f) => `${faceLine(f)} *(${f.risks.join('; ')})*`,
);
section(
  'Wholly conditional faces',
  'Every effect on the face has a condition (`ifAnchored`, `ifOnHazard`, …). If the condition rarely holds, the face is dead weight.',
  conditional,
);
section(
  'Never played by the autoplayer',
  `The autoplayer has a rule for these faces and held them in at least ${MIN_EXPOSURE} missions, yet never chose them. Either the face is weak for its cost, or the heuristic undervalues it — Ethereal faces dominate this list because the heuristic takes the cheaper Physical face of the same card first.`,
  unplayed,
  (f) => `${faceLine(f)} *(held in ${f.exposure} missions)*`,
);
section(
  'Played almost only in one mission type',
  'At least 70% of this face’s use (per mission held) came from a single mission type — a hint that it is a specialist.',
  oneMission,
  (f) => `${faceLine(f)} *(${pct(f.topShare)} in ${f.topArch}; ${f.plays} plays)*`,
);
p(`### Faces the autoplayer cannot evaluate (${blind.length})`);
p();
p(
  'The heuristic autoplayer only understands strikes, shields, heals, reveals, engines, single-target control, traps and ' +
    'movement. It has no rule for the faces below, so passes B and C say nothing about them. Measuring them needs the ' +
    'look-ahead player described in the roadmap.',
);
p();
p(blind.map((f) => `\`${f.key}\``).join(' · ') || '*None.*');
p();
p('## Every face');
p();
p(
  '`plays/held` = times the autoplayer played the face ÷ missions in which a hero held the card. `—` = the autoplayer has no rule for it.',
);
p();
for (const sp of T.SPECIES_ORDER) {
  p(`### ${T.SPECIES[sp].name}`);
  p();
  p('| Face | Class | Answers | plays/held | Notes |');
  p('|---|---|---|---|---|');
  for (const f of FACES.filter((x) => x.card.sp === sp)) {
    const notes = [];
    if (f.risks.length) notes.push(f.risks.join('; '));
    if (f.allConditional) notes.push('wholly conditional');
    if (f.plays >= 10 && f.topShare >= 0.7) notes.push(`${pct(f.topShare)} of use in ${f.topArch}`);
    const usage = f.ai ? `${f.plays}/${f.exposure}${f.exposure ? ` (${f.rate.toFixed(2)})` : ''}` : '—';
    const cls = f.cls === 'narrow' ? '**narrow**' : f.cls;
    p(
      `| ${faceName(f)} | ${cls} | ${f.answers.map((k) => PROBLEM_NAME[k]).join(', ') || '—'} | ${usage} | ${notes.join('; ')} |`,
    );
  }
  p();
}

const text = out.join('\n') + '\n';
if (args.includes('--stdout')) {
  process.stdout.write(text);
} else {
  const file = path.join(__dirname, '..', 'docs', 'reference', 'ABILITY_AUDIT.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  console.log(
    `wrote docs/reference/ABILITY_AUDIT.md — ${counts.staple} staples, ${counts.tool} tools, ${counts.narrow} narrow; ` +
      `${hardCounters.length} hard-counter candidates; ${cardGates.length} collapsed gate cells; ` +
      `autoplayer blind to ${blind.length} faces`,
  );
}
