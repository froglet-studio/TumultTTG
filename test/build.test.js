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
