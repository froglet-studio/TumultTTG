'use strict';
/* Made pilots copied to Froglet's character sheet (2.78): rows from Tumult Online's store
   (tools/pilot-sheet.js) and the Apps Script that upserts them (tools/sheets/pilots-sync.gs),
   run here against a pretend sheet. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const loadTumult = require('../tools/load');
const { rowsFrom, feedOf, COLUMNS } = require('../tools/pilot-sheet');

const T = loadTumult();
const recipe = (id, name, species, cards, at, e = 1) => {
  const up = {};
  cards.forEach((c, i) => (up[c] = [0, i < 2 ? e : 0]));
  return { id, name, title: '', species, cards, up, bound: {}, at };
};
const GOOP = recipe(
  'made_goop',
  'Goopmaw',
  ['human', 'cordyceps', 'flytrap'],
  ['cor_drain', 'hum_persist', 'cor_decomp', 'cor_radio', 'hum_mind', 'fly_photo'],
  '2026-11-20T18:28:21.394Z',
);
const KAAL = recipe(
  'made_kaal',
  'Kaal',
  ['human', 'jackal', 'kangaroo'],
  ['jac_luck', 'pou_pouch', 'jac_coat', 'dog_yip', 'kan_tailkick', 'hum_lang'],
  '2026-11-20T00:03:26.823Z',
);
const DOCS = [
  { id: 'u_a', data: { list: [GOOP], who: 'Ada' } },
  { id: 'u_b', data: { list: [KAAL, { name: 'broken' }] } },
];

test('pilot sheet: one row per made pilot, newest first, broken recipes left out', () => {
  const rows = rowsFrom(T, DOCS, { u_b: 'Bea' });
  assert.deepEqual(
    rows.map((r) => [r['Tumult id'], r.Character, r.Player, r['Species 1'], r['Species 2']]),
    [
      ['made_goop', 'Goopmaw', 'Ada', 'Cordyceps mycelium', 'Venus flytrap'],
      ['made_kaal', 'Kaal', 'Bea', 'Golden jackal', 'Red kangaroo'],
    ],
  );
  assert.match(rows[0].Traits, /^Hyphal Drain; Persistence; /);
  assert.match(rows[0].Abilities, /^Bore P0 \/ Parasitize E1; /);
  assert.match(rows[0].Abilities, /\(asleep\)/, 'an Ethereal face not yet awakened says so');
});

test('pilot sheet: the same pilot in two documents keeps the newer recipe; the feed is named by its rows', () => {
  const older = Object.assign({}, GOOP, { name: 'Goop', at: '2026-11-19T00:00:00.000Z' });
  const rows = rowsFrom(T, DOCS.concat([{ id: 'u_c', data: { list: [older] } }]), {});
  assert.equal(rows.filter((r) => r['Tumult id'] === 'made_goop').length, 1);
  assert.equal(rows.find((r) => r['Tumult id'] === 'made_goop').Character, 'Goopmaw');
  const a = feedOf(rows, '2026-11-20T00:00:00Z');
  const b = feedOf(rows, '2026-11-21T00:00:00Z');
  assert.equal(a.name, b.name, 'the time it was made does not change the name');
  assert.notEqual(a.name, feedOf(rows.slice(1), 'x').name);
  assert.deepEqual(a.feed.columns, COLUMNS);
});

/* ───────── the Apps Script, against a pretend sheet ───────── */
function fakeSheet(grid) {
  const cell = (r, c) => (grid[r - 1] && grid[r - 1][c - 1] !== undefined ? grid[r - 1][c - 1] : '');
  const set = (r, c, v) => {
    while (grid.length < r) grid.push([]);
    grid[r - 1][c - 1] = v;
  };
  const sheet = {
    getName: () => 'Pilots',
    getLastColumn: () => Math.max(...grid.map((row) => row.length)),
    getLastRow: () => grid.length,
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => cell(r + i, c + j))),
      setValue: (v) => set(r, c, v),
      setValues: (vs) => vs.forEach((row, i) => row.forEach((v, j) => set(r + i, c + j, v))),
    }),
  };
  return sheet;
}
function runScript(grid, feed) {
  const sheet = fakeSheet(grid);
  const props = {};
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, getSheets: () => [sheet] }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => (props[k] = v) }),
    },
    DriveApp: {
      searchFiles: () => {
        const files = [
          {
            getDateCreated: () => new Date(),
            getBlob: () => ({ getDataAsString: () => JSON.stringify(feed) }),
            setTrashed() {},
          },
        ];
        return { hasNext: () => files.length > 0, next: () => files.shift() };
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'tools', 'sheets', 'pilots-sync.gs'), 'utf8'), ctx);
  ctx.syncPilots();
  return grid;
}

const HEAD = [
  'Character',
  'Player',
  'Species 1',
  'Species 2',
  'Traits',
  'Abilities',
  'Backstory',
  'Look',
  'Personality',
  'Faction or job',
  'Tumult status',
  'Pilot status',
  'Pilot WORD',
  'Pilot notes',
];
const seeded = (a, b) => ['', '', a, b, '', '', '', '', '', '', 'Drafting', 'Not started', '', 'Being painted'];

test('pilots sync: claims a seeded row by species, appends the rest, never touches Pilot columns', () => {
  const grid = [HEAD.slice(), seeded('Cordyceps', 'Venus flytrap'), seeded('Chameleon', 'Ratel')];
  const { feed } = feedOf(rowsFrom(T, DOCS, {}), 'now');
  runScript(grid, feed);
  const col = (n) => grid[0].indexOf(n);
  assert.equal(grid[0][14], 'Tumult id', 'the key column is added at the end');
  assert.equal(grid[1][col('Character')], 'Goopmaw');
  assert.equal(grid[1][col('Player')], 'Ada');
  assert.equal(grid[1][col('Species 1')], 'Cordyceps', 'a seeded spelling that matches is kept');
  assert.equal(grid[1][col('Tumult id')], 'made_goop');
  assert.equal(grid[1][col('Pilot notes')], 'Being painted');
  assert.equal(grid[1][col('Pilot status')], 'Not started');
  assert.equal(grid[2][col('Character')], '', 'a row of other species is left alone');
  assert.equal(grid[3][col('Character')], 'Kaal');
  assert.equal(grid[3][col('Tumult status')], 'Drafting');
  assert.equal(grid[3][col('Pilot status')] || '', '', 'a new row writes nothing in the Pilot columns');

  // a later feed updates the same rows, and four filled story columns make a pilot Finished
  grid[3][col('Backstory')] = 'Grew up on a dredge.';
  grid[3][col('Look')] = 'Gold coat.';
  grid[3][col('Personality')] = 'Wry.';
  grid[3][col('Faction or job')] = 'Salvager';
  const renamed = [{ id: 'u_a', data: { list: [Object.assign({}, GOOP, { name: 'Goopmaw II' })], who: 'Ada' } }];
  runScript(grid, feedOf(rowsFrom(T, renamed.concat(DOCS.slice(1)), {}), 'later').feed);
  assert.equal(grid.length, 4, 'no new rows');
  assert.equal(grid[1][col('Character')], 'Goopmaw II');
  assert.equal(grid[3][col('Backstory')], 'Grew up on a dredge.', 'story columns typed in the sheet stay');
  assert.equal(grid[3][col('Tumult status')], 'Finished');
});
