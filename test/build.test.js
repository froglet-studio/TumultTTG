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
  const r = spawnSync(process.execPath, [path.join(root, 'tools', 'audit.js'), '2', '--stdout'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^# Ability audit/);
  assert.match(r.stdout, /## Pass C — gate check/);
});
