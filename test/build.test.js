'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');

test('the single-file build assembles and its script compiles', async () => {
  const { build } = await import(pathToFileURL(path.join(root, 'tools', 'build.mjs')).href);
  const { html, js } = build();
  const manifest = require(path.join(root, 'src', 'manifest.json'));
  for (const rel of [...manifest.engine, ...manifest.ui, ...manifest.css]) {
    assert.ok(html.includes(`───── ${rel} ─────`), `${rel} is missing from the build`);
  }
  assert.ok(!html.includes('/*__JS__*/') && !html.includes('/*__CSS__*/'), 'template placeholders were replaced');
  assert.doesNotThrow(() => new vm.Script(js, { filename: 'TUMULT.inline.js' }));
  assert.ok(html.length > 200_000, 'build looks too small');
});

test('build variants: the playtest panel is only in the playtest build; the fragment has no page wrapper', async () => {
  const { build, outFile } = await import(pathToFileURL(path.join(root, 'tools', 'build.mjs')).href);
  const manifest = require(path.join(root, 'src', 'manifest.json'));
  const { version } = require(path.join(root, 'package.json'));
  const plain = build();
  const playtest = build({ playtest: true });
  const fragment = build({ playtest: true, fragment: true });
  for (const rel of [...manifest.playtest.js, ...manifest.playtest.css]) {
    assert.ok(!plain.html.includes(`───── ${rel} ─────`), `${rel} leaked into the ordinary build`);
    for (const b of [playtest, fragment]) assert.ok(b.html.includes(`───── ${rel} ─────`), `${rel} is missing`);
  }
  assert.match(plain.html, /<title>TUMULT<\/title>/);
  assert.match(playtest.html, /^<!doctype html>[^]*<title>Tumult Playtest<\/title>/);
  // a host page supplies the wrapper: the fragment is a title, a style, the mount point and the script
  assert.ok(fragment.html.startsWith('<title>Tumult Playtest</title>'));
  assert.doesNotMatch(fragment.html, /<!doctype|<(html|head|body)[\s>]/i);
  assert.match(fragment.html, /<div id="app"><\/div>/);
  for (const b of [plain, playtest, fragment]) {
    assert.ok(!/__TITLE__|__VERSION__|\/\*__(JS|CSS)__\*\//.test(b.html), 'template placeholders were replaced');
    assert.doesNotThrow(() => new vm.Script(b.js, { filename: 'TUMULT.inline.js' }));
  }
  // every build knows which build it is
  assert.ok(plain.js.includes(JSON.stringify({ version, playtest: false })));
  assert.ok(playtest.js.includes(JSON.stringify({ version, playtest: true })));
  assert.equal(outFile(), 'dist/TUMULT.html');
  assert.equal(outFile({ playtest: true, fragment: true }), 'dist/TUMULT.playtest.fragment.html');
});

test('docs/reference/CARDS.md matches the card data', () => {
  const r = spawnSync(process.execPath, [path.join(root, 'tools', 'catalog.js'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('the ability audit runs end to end', () => {
  // the heuristic player keeps this quick; the look-ahead player it uses by default has tests of its own
  const r = spawnSync(process.execPath, [path.join(root, 'tools', 'audit.js'), '2', '--stdout', '--player', 'weak'], {
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^# Ability audit/);
  assert.match(r.stdout, /## Pass C — gate check/);
});

test('every pilot has a portrait and a scene in the build, and every pre-made hero is a pilot', async () => {
  const { art } = await import(pathToFileURL(path.join(root, 'tools', 'build.mjs')).href);
  const manifest = require(path.join(root, 'src', 'manifest.json'));
  const sandbox = { window: { T: {} } };
  vm.runInNewContext(art(manifest).js, sandbox);
  const ART = sandbox.window.T.ART;
  const T = require(path.join(root, 'tools', 'load.js'))();
  const g = { T: { UI: {} } };
  vm.runInNewContext(require('node:fs').readFileSync(path.join(root, 'src', 'ui', 'pilots.js'), 'utf8'), {
    window: g,
  });
  const U = g.T.UI;
  for (const a of U.PILOT_ART) {
    assert.match(ART['pilot/' + a.key] || '', /^data:image\/jpeg;base64,/, `${a.key} has a portrait`);
    assert.match(ART['scene/' + a.key] || '', /^data:image\/jpeg;base64,/, `${a.key} has a scene`);
    assert.equal(a.clades.length, 2, `${a.key} is a pair of clades`);
  }
  // art follows the clade pair: an exact pair beats a stand-in that shares one clade, and the head clade counts
  const pair = (a, b) => ({ id: a + b, species: ['human', a, b] });
  assert.equal(U.artForPair(['octopus', 'raven']).key, 'BANDIT');
  assert.equal(U.artForPair(['mouse', 'owl']).key, 'ECHO', 'the exact pair beats the owl-headed stand-in');
  assert.equal(U.artForPair(['owl', 'jerboa']).key, 'SUNDIAL', 'a stand-in with the same head clade');
  assert.equal(U.artForPair(['flytrap', 'cordyceps']), null, 'no painting shares a clade: no portrait');
  // every pre-made hero has a painting, and no two heroes in a squad share one
  g.T.UI.run = { heroes: [pair('eel', 'flytrap'), pair('hopper', 'eel')] };
  const [a1, a2] = g.T.UI.run.heroes.map((h) => U.pilotOf(h));
  assert.ok(a1 && !(a2 && a2.key === a1.key), 'a squad never shows one face twice');
  g.T.UI.run = null;
  for (const pb of T.PREBUILTS) assert.ok(U.pilotOf({ id: pb.id, species: pb.species }), `${pb.name} has a painting`);
});
