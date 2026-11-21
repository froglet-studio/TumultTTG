#!/usr/bin/env node
'use strict';
/**
 * The pilots players made, as rows for Froglet's character list (a Google Sheet kept beside the
 * Cosmic Shore pilots). Tumult Online keeps every made pilot in its store under heroes/<player id>
 * (src/ui/heroes-net.js); Claude reads that collection, this tool turns it into rows, the rows go to
 * Google Drive as one JSON feed file, and an Apps Script bound to the sheet (tools/sheets/pilots-sync.gs)
 * upserts them, one row per pilot, keyed on the pilot's id.
 *
 *   node tools/pilot-sheet.js <heroes dir>                 → dist/sheet/tumult-pilots-feed-<digest>.json
 *   node tools/pilot-sheet.js <heroes dir> --names n.json  player names by id, for docs written before 2.78
 *   node tools/pilot-sheet.js <heroes dir> --out dir       write somewhere else
 *
 * <heroes dir> holds one <player id>.json per store document ({ list, at, who }), as ArtifactData
 * writes them with `out_dir`. The digest names the rows' content, so an unchanged list makes the same
 * file name and need not be sent again. Rows hold player names, so the feed lives under dist/ (never
 * committed). Reference: docs/reference/PILOT_SHEET.md.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const loadTumult = require('./load');

/** The sheet's own column names; the Apps Script finds its columns by these headers. */
const COLUMNS = ['Tumult id', 'Character', 'Player', 'Species 1', 'Species 2', 'Traits', 'Abilities'];

/** "Cordyceps Mycelium" → "Cordyceps mycelium": the sheet writes species in sentence case. */
const sentence = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : '');

/** One made pilot as a sheet row, or null if the recipe breaks the rules. */
function rowOf(T, rec, player) {
  const r = T.validMade(rec);
  if (!r) return null;
  const sp = r.species.filter((s) => s !== 'human');
  const traits = r.cards.map((c) => T.CARD[c].name);
  const abilities = r.cards.map((c) => {
    const card = T.CARD[c];
    const [p, e] = r.up[c] || [0, 0];
    return `${card.P.n} P${p} / ${card.E.n} ${e >= T.RULES.ETHEREAL_MIN_E ? 'E' + e : '(asleep)'}`;
  });
  return {
    'Tumult id': r.id,
    Character: r.name,
    Player: player || '',
    'Species 1': sentence(T.SPECIES[sp[0]].name),
    'Species 2': sentence(T.SPECIES[sp[1]].name),
    Traits: traits.join('; '),
    Abilities: abilities.join('; '),
    at: r.at,
  };
}

/**
 * Rows from the store's documents: [{ id: player id, data: { list, at, who } }]. One row per pilot id;
 * if two documents hold the same pilot, the newer recipe wins. Newest first.
 */
function rowsFrom(T, docs, names) {
  const byId = new Map();
  for (const doc of docs) {
    const data = doc.data || {};
    const player = (typeof data.who === 'string' && data.who.trim()) || (names && names[doc.id]) || '';
    for (const rec of Array.isArray(data.list) ? data.list.slice(0, T.MADE_MAX) : []) {
      const row = rowOf(T, rec, player);
      if (!row) continue;
      const prev = byId.get(row['Tumult id']);
      if (!prev || String(row.at) > String(prev.at)) byId.set(row['Tumult id'], row);
    }
  }
  return [...byId.values()].sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

/** The feed file's content and its name. */
function feedOf(rows, at) {
  const body = rows.map((r) => COLUMNS.map((c) => r[c]));
  const digest = crypto.createHash('sha1').update(JSON.stringify(body)).digest('hex').slice(0, 12);
  const feed = { kind: 'tumult-pilots', version: 1, at, digest, columns: COLUMNS, rows: body };
  return { feed, name: `tumult-pilots-feed-${digest}.json` };
}

function readDocs(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ id: f.replace(/\.json$/, ''), data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const opt = (k) => {
    const i = args.indexOf(k);
    return i >= 0 ? args.splice(i, 2)[1] : null;
  };
  const namesFile = opt('--names');
  const out = opt('--out') || path.join(__dirname, '..', 'dist', 'sheet');
  const dir = args[0];
  if (!dir) {
    console.error('usage: node tools/pilot-sheet.js <heroes dir> [--names names.json] [--out dir]');
    process.exit(2);
  }
  const T = loadTumult();
  const names = namesFile ? JSON.parse(fs.readFileSync(namesFile, 'utf8')) : {};
  const rows = rowsFrom(T, readDocs(dir), names);
  const { feed, name } = feedOf(rows, new Date().toISOString());
  fs.mkdirSync(out, { recursive: true });
  const file = path.join(out, name);
  fs.writeFileSync(file, JSON.stringify(feed, null, 2) + '\n');
  console.log(`${rows.length} pilots → ${file}`);
}

module.exports = { COLUMNS, rowOf, rowsFrom, feedOf, readDocs };
