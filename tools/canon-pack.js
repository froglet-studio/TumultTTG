#!/usr/bin/env node
'use strict';
/**
 * The storyteller pack: what an AI needs to tell a Tumult story that keeps the game's rules and the
 * world's canon. Made from the game itself (rules, places, foes, pilots) and from canon records the lore
 * lead has decided on (the test page's inbox → Copy canon, or its store read by Claude).
 *
 *   node tools/canon-pack.js records.jsonl                 → dist/canon/tumult-storyteller.md + tumult-canon.jsonl
 *   node tools/canon-pack.js records.jsonl --proposals     also list undecided proposals, labelled as such
 *   node tools/canon-pack.js records.jsonl --out dir       write somewhere else
 *   node tools/canon-pack.js records.jsonl --public        also add canon marked public to docs/canon/public.jsonl
 *
 * The pack holds private canon too, so it is written under dist/ (never committed). Only records the lore
 * lead marked canon AND public are copied into the repository (Garrett, 2026-11-13).
 */
const fs = require('fs');
const path = require('path');
const loadTumult = require('./load');

const ROOT = path.join(__dirname, '..');
const PUBLIC_FILE = path.join(ROOT, 'docs', 'canon', 'public.jsonl');

/** Read JSON lines; blank lines and lines that are not records are skipped. */
function readLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch (e) {
        return null;
      }
    })
    .filter((r) => r && typeof r === 'object' && r.id && r.subject);
}

/** The game with its pilots' names (kept with the art, in the UI). */
function loadGame() {
  const T = loadTumult();
  require(path.join(ROOT, 'src', 'ui', 'pilots.js'));
  return T;
}

const KIND = { wrong: 'correction', detail: 'detail', love: 'kept as written', answer: 'answer' };
const line = (s) =>
  String(s || '')
    .replace(/\s+/g, ' ')
    .trim();

/** One record as a bullet: what is true, and what it replaces when it corrects shown text. */
function bullet(r) {
  const what = r.kind === 'love' ? `“${line(r.shown)}” is canon as written.` : line(r.claim);
  const note = r.kind === 'wrong' && r.shown ? ` *(Replaces: “${line(r.shown)}”)*` : '';
  const q = r.kind === 'answer' && r.shown ? ` *(Asked: ${line(r.shown).replace(/ Offered:.*$/, '')})*` : '';
  return `- ${what}${note}${q} — ${KIND[r.kind] || r.kind}, ${String(r.at || '').slice(0, 10)}`;
}

/**
 * Build the pack. `records` are decided records (status canon / rejected / proposed, as the inbox's Copy
 * canon gives them). Returns { markdown, canon, publicCanon }.
 */
function buildPack(T, records, opts = {}) {
  const R = T.RULES;
  const canon = records.filter((r) => r.status === 'canon');
  const proposals = opts.proposals ? records.filter((r) => !r.status || r.status === 'proposed') : [];
  const bySubject = (list, s) => list.filter((r) => r.subject === s);
  const used = new Set();
  const block = (s) => {
    const c = bySubject(canon, s);
    const p = bySubject(proposals, s);
    c.concat(p).forEach((r) => used.add(r.id));
    let out = '';
    if (c.length) out += `\n**Canon:**\n${c.map(bullet).join('\n')}\n`;
    if (p.length) out += `\n*Proposals (not canon; offer, never state as fact):*\n${p.map(bullet).join('\n')}\n`;
    return out;
  };

  const lore = fs
    .readFileSync(path.join(ROOT, 'docs', 'LORE.md'), 'utf8')
    .replace(/^# .*\n/, '')
    .replace(/^## /gm, '### ');

  const md = [];
  md.push(`# Tumult — storyteller pack

Made ${opts.date || new Date().toISOString().slice(0, 10)} from build ${opts.version || '?'}: ${canon.length} canon record${canon.length === 1 ? '' : 's'}${opts.proposals ? `, ${proposals.length} proposal${proposals.length === 1 ? '' : 's'}` : ''}.

You are telling stories set on Tumult. Read this in order of authority: **rules** first (a story must never break them), then **canon** (true; never contradict it), then the **world** as the game describes it (the default where canon is silent), then **proposals** (ideas you may offer, never state as fact). Where canon corrects what the game shows, canon wins. **Off limits** says what you must not invent.

Private: this pack may hold canon that is not public. Do not publish it.`);

  md.push(`## 1. Rules a story must respect

These are the game's rules; a story told alongside play, or about it, keeps them.

- Every pilot is human plus two **clades**, and holds at most ${R.MAX_PER_SPECIES} traits from any one clade, ${R.START_CARDS} to start and ${R.MAX_CARDS} at most.
- Each trait has two faces. **Physical** (adaptation: what a body can do) costs action points only. **Ethereal** (magic, from etherions) costs action points and at least one etherion, and must be awakened before it can be used. **Technology** is gear, fuelled by omnicrystals.
- A pilot's dice: a pool of ${R.POOL}, ${R.ROLL} rolled each turn. Faces are Mass, Charge, Space, Time, Omni (stands in for any etherion), and action points. The dice only pay for actions: an action does exactly what it says, with no roll to hit.
- Foes show what they will do before the pilots act, and pilots defend by acting first: there are no reactions or interrupts.
- **No one loses a turn.** Control (rooting, pushing, slowing) costs position or efficiency; a controlled person still acts.
- **No hard counters.** Nothing is beaten by exactly one ability, and no problem needs one particular ability to solve. Not every problem is a fight.
- At 0 vitality a pilot is **downed**, not dead; an ally beside them can rally them. Both pilots downed loses the mission.
- Every encounter happens on a different board: a page of the atlas, a kind of place, never one named spot.`);

  md.push(`## 2. The world\n\n${lore.trim()}`);

  const places = T.ATLAS.map(
    (p) =>
      `### ${p.name} (${p.ground}, ${p.gravity} g)\n\n${p.blurb} Weather: ${p.weather}\n\n${p.notes.map((n) => `- **${n.h}.** ${n.t}`).join('\n')}\n${block('place:' + p.id)}`,
  ).join('\n');
  md.push(
    `## 3. Places\n\nEach is a kind of place, not one spot: the quarry in one story may be a different quarry in the next.\n\n${places}`,
  );

  const pilots = (T.UI.PILOT_ART || [])
    .map((a) => {
      const b = block('pilot:' + a.key);
      return b || a.name !== a.key ? `### ${a.name} · ${a.key}\n\nHuman, ${a.clades.join(' and ')}.\n${b}` : '';
    })
    .filter(Boolean)
    .join('\n');
  md.push(
    `## 4. Pilots\n\nCosmic Shore pilots who come from Tumult. Adults with long histories before they ever flew.\n\n${pilots}`,
  );

  const foes = Object.entries(T.ENEMIES)
    .map(([k, e]) => `### ${e.name}\n\n${e.flavor}\n${block('foe:' + k)}`)
    .join('\n');
  md.push(`## 5. Creatures and foes\n\n${foes}`);

  const rest = canon.concat(proposals).filter((r) => !used.has(r.id));
  if (rest.length) {
    const subjects = [...new Set(rest.map((r) => r.subject))].sort();
    md.push(`## 6. Other canon\n\n${subjects.map((s) => `### ${s}\n${block(s)}`).join('\n')}`);
  }

  md.push(`## Off limits

- Do not invent named canon people beyond the pilots above, history the canon does not give, or how the larger story goes. Unnamed people, places and contracts are fine.
- No real people, and no characters, names or logos from other works.
- Say **Ark**, never another name for the great carriers; **domains** (Jade, Ruby, Gold) are ways of living, never factions or sides; a **squad** is three pilots.
- Do not contradict a rule in section 1 to make a scene work. Find another way.`);

  const publicCanon = canon.filter((r) => r.public === true);
  return { markdown: md.join('\n\n') + '\n', canon, publicCanon };
}

/**
 * Merge public canon into the repo's copy, by id: a newer decision replaces an older one, and a record
 * these decisions no longer hold as public canon (made private, rejected, reopened) leaves the copy.
 */
function mergePublic(existing, records) {
  const by = new Map(existing.map((r) => [r.id, r]));
  records.forEach((r) => {
    if (r.status === 'canon' && r.public === true) by.set(r.id, r);
    else by.delete(r.id);
  });
  return [...by.values()].sort((a, b) => String(a.at).localeCompare(String(b.at)) || a.id.localeCompare(b.id));
}

module.exports = { buildPack, readLines, mergePublic, loadGame };

if (require.main === module) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--out');
  if (!file) {
    console.error('usage: node tools/canon-pack.js records.jsonl [--proposals] [--public] [--out dir]');
    process.exit(1);
  }
  const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(ROOT, 'dist', 'canon');
  const T = loadGame();
  const records = readLines(fs.readFileSync(file, 'utf8'));
  const version = require(path.join(ROOT, 'package.json')).version;
  const pack = buildPack(T, records, { proposals: args.includes('--proposals'), version });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'tumult-storyteller.md'), pack.markdown);
  fs.writeFileSync(path.join(outDir, 'tumult-canon.jsonl'), T.canonLines(pack.canon) + '\n');
  console.log(
    `${pack.canon.length} canon records → ${path.relative(ROOT, outDir)}/tumult-storyteller.md, tumult-canon.jsonl`,
  );
  if (args.includes('--public')) {
    const existing = fs.existsSync(PUBLIC_FILE) ? readLines(fs.readFileSync(PUBLIC_FILE, 'utf8')) : [];
    const merged = mergePublic(existing, records);
    fs.mkdirSync(path.dirname(PUBLIC_FILE), { recursive: true });
    fs.writeFileSync(PUBLIC_FILE, merged.length ? T.canonLines(merged) + '\n' : '');
    console.log(`${pack.publicCanon.length} public → ${path.relative(ROOT, PUBLIC_FILE)} (${merged.length} in all)`);
  }
}
