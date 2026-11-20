/**
 * TUMULT — PILOTS SYNC (Google Apps Script, bound to Froglet's character sheet)
 *
 * Paste this file into the sheet's Extensions → Apps Script, save, choose `setup` and press Run once
 * (Google asks to allow access to the sheet and to Drive). From then on, every ten minutes it looks in
 * Drive for the newest `tumult-pilots-feed-<digest>.json` (written by Claude from Tumult Online's store
 * with tools/pilot-sheet.js) and upserts one row per pilot on the Pilots tab.
 *
 * What it writes, by header name: Character, Player, Species 1, Species 2, Traits, Abilities,
 * Tumult status, and a `Tumult id` column it adds at the end if the tab has none (the key; hide it if
 * you like). It never writes a column whose header starts with "Pilot", and never empties Backstory,
 * Look, Personality or Faction or job: the game does not ask for those, so whatever people type there
 * stays. Tumult status is "Finished" once all four are filled in, "Drafting" until then (and it is
 * left alone if someone typed anything else there).
 *
 * A pilot already on the tab is found by its Tumult id. A new one first claims a row with no
 * Character and no id whose two species match (rows seeded for painting), else gets a new row.
 * Reference: docs/reference/PILOT_SHEET.md in the Tumult repository.
 */
var TAB = 'Pilots';
var FEED_PREFIX = 'tumult-pilots-feed-';
var STORY = ['Backstory', 'Look', 'Personality', 'Faction or job'];

/** Run once by hand: installs the ten-minute check and runs it now. */
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncPilots') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncPilots').timeBased().everyMinutes(10).create();
  syncPilots();
}

/** Apply the newest feed in Drive, if it is not the one applied last; keep only the newest feed. */
function syncPilots() {
  var files = [];
  var it = DriveApp.searchFiles("title contains '" + FEED_PREFIX + "' and trashed = false");
  while (it.hasNext()) files.push(it.next());
  if (!files.length) return;
  files.sort(function (a, b) {
    return b.getDateCreated().getTime() - a.getDateCreated().getTime();
  });
  var newest = files[0];
  files.slice(1).forEach(function (f) {
    try {
      f.setTrashed(true);
    } catch (e) {}
  });
  var props = PropertiesService.getScriptProperties();
  var feed = JSON.parse(newest.getBlob().getDataAsString());
  if (feed.kind !== 'tumult-pilots' || !feed.digest || props.getProperty('digest') === feed.digest) return;
  upsert(feed);
  props.setProperty('digest', feed.digest);
}

function pilotsTab() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  return book.getSheetByName(TAB) || book.getSheets()[0];
}

/** Column numbers (1-based) by header; adds `Tumult id` at the end when missing. */
function headerMap(sheet) {
  var last = Math.max(1, sheet.getLastColumn());
  var heads = sheet.getRange(1, 1, 1, last).getValues()[0];
  var col = {};
  heads.forEach(function (h, i) {
    if (h !== '') col[String(h).trim()] = i + 1;
  });
  if (!col['Tumult id']) {
    col['Tumult id'] = last + 1;
    sheet.getRange(1, last + 1).setValue('Tumult id');
  }
  return col;
}

var norm = function (s) {
  return String(s || '')
    .trim()
    .toLowerCase();
};
/** "Cordyceps" matches "Cordyceps mycelium": a seeded row may use a shorter name. */
function sameSpecies(a, b) {
  a = norm(a);
  b = norm(b);
  return !!a && !!b && (a === b || a.indexOf(b + ' ') === 0 || b.indexOf(a + ' ') === 0);
}
function speciesMatch(row, col, s1, s2) {
  var a = row[col['Species 1'] - 1];
  var b = row[col['Species 2'] - 1];
  return (sameSpecies(a, s1) && sameSpecies(b, s2)) || (sameSpecies(a, s2) && sameSpecies(b, s1));
}

function upsert(feed) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = pilotsTab();
    var col = headerMap(sheet);
    var width = sheet.getLastColumn();
    var count = Math.max(0, sheet.getLastRow() - 1);
    var data = count ? sheet.getRange(2, 1, count, width).getValues() : [];
    var idCol = col['Tumult id'];
    var touched = {};

    feed.rows
      .slice()
      .reverse() // oldest first, so new rows are appended in the order the pilots were made
      .forEach(function (cells) {
        var r = {};
        feed.columns.forEach(function (c, i) {
          r[c] = cells[i];
        });
        var at = -1;
        for (var i = 0; i < data.length; i++) if (String(data[i][idCol - 1]) === r['Tumult id']) at = i;
        if (at < 0)
          for (var j = 0; j < data.length && at < 0; j++) {
            var row = data[j];
            if (!row[idCol - 1] && !row[col.Character - 1] && speciesMatch(row, col, r['Species 1'], r['Species 2']))
              at = j;
          }
        if (at < 0) {
          var blank = [];
          for (var k = 0; k < width; k++) blank.push('');
          data.push(blank);
          at = data.length - 1;
        }
        var target = data[at];
        touched[at] = true;
        var put = function (name, value) {
          if (!col[name] || /^pilot\b/i.test(name)) return;
          target[col[name] - 1] = value;
        };
        put('Tumult id', r['Tumult id']);
        put('Character', r.Character);
        if (r.Player) put('Player', r.Player);
        // a seeded row keeps its own spelling of a species that matches
        ['Species 1', 'Species 2'].forEach(function (name) {
          var other = name === 'Species 1' ? 'Species 2' : 'Species 1';
          var here = target[col[name] - 1];
          if (!sameSpecies(here, r[name]) && !sameSpecies(here, r[other])) put(name, r[name]);
        });
        put('Traits', r.Traits);
        put('Abilities', r.Abilities);
        STORY.forEach(function (name) {
          if (r[name]) put(name, r[name]);
        });
        setStatus(target, col);
      });

    // write back only the cells the sync owns, on the rows it touched, so nothing else on the tab
    // (other rows, Pilot columns, formulas) is rewritten
    var owned = ['Tumult id', 'Character', 'Player', 'Species 1', 'Species 2', 'Traits', 'Abilities', 'Tumult status']
      .concat(STORY)
      .filter(function (n) {
        return col[n] && !/^pilot\b/i.test(n);
      });
    Object.keys(touched).forEach(function (key) {
      var i = Number(key);
      owned.forEach(function (name) {
        var c = col[name];
        var v = data[i][c - 1];
        sheet.getRange(i + 2, c).setValue(v === undefined ? '' : v);
      });
    });
  } finally {
    lock.releaseLock();
  }
}

/** Finished once every story column is filled, Drafting until then; any other value is left alone. */
function setStatus(row, col) {
  var c = col['Tumult status'];
  if (!c) return;
  var now = String(row[c - 1] || '').trim();
  if (now && now !== 'Drafting' && now !== 'Finished') return;
  var done = STORY.every(function (name) {
    return col[name] && String(row[col[name] - 1] || '').trim() !== '';
  });
  row[c - 1] = done ? 'Finished' : 'Drafting';
}

/** A simple trigger: typing a story column of a synced pilot updates its Tumult status at once. */
function onEdit(e) {
  var sheet = e.range.getSheet();
  if (sheet.getName() !== pilotsTab().getName() || e.range.getRow() < 2) return;
  var col = {};
  sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .forEach(function (h, i) {
      if (h !== '') col[String(h).trim()] = i + 1;
    });
  if (!col['Tumult status'] || !col['Tumult id']) return;
  for (var r = e.range.getRow(); r <= e.range.getLastRow(); r++) {
    var row = sheet.getRange(r, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (!row[col['Tumult id'] - 1]) continue;
    var before = row[col['Tumult status'] - 1];
    setStatus(row, col);
    if (row[col['Tumult status'] - 1] !== before)
      sheet.getRange(r, col['Tumult status']).setValue(row[col['Tumult status'] - 1]);
  }
}
