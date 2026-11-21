'use strict';
// The Loop Atlas (docs/loopatlas): the model is valid and its generated files are current, and the Code Atlas
// builds with every hand link matching something. The Python checks need PyYAML and jsonschema; where they are
// missing those tests are skipped with the command to install them.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.join(__dirname, '..');
const py = spawnSync('python3', ['-c', 'import yaml, jsonschema'], { encoding: 'utf8' });
const noPy = py.status !== 0 && 'needs python3 with PyYAML and jsonschema (pip install pyyaml jsonschema)';
const run = (cmd, args) => spawnSync(cmd, args, { cwd: REPO, encoding: 'utf8' });

test('loop atlas: model valid, model.json and BOARD.md current', { skip: noPy }, () => {
  const r = run('python3', ['tools/loop_atlas.py', '--check']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});

test('loop atlas: its checks refuse what they must', { skip: noPy }, () => {
  const r = run('python3', ['tools/loop_atlas.py', 'self-test']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});

test('code atlas: self-test', () => {
  const r = run('node', ['tools/code-atlas.js', 'self-test']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});

test('code atlas: strict build reaches every loop it links and every card', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'code-atlas-'));
  const r = run('node', ['tools/code-atlas.js', 'build', '--strict', '--out', out]);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const idx = JSON.parse(fs.readFileSync(path.join(out, 'index.json'), 'utf8'));
  assert.deepStrictEqual(idx.missingLinks, []);
  const T = require('../tools/load')();
  assert.ok(idx.kinds.entry >= T.CARDS.length, 'every card is an entry');
  assert.ok(idx.kinds.verb >= 40, 'the verbs of T.applyEffect are nodes');
  assert.ok(idx.loopCode.face > 0 && idx.loopCode['fleet/Rosh'] > 0, 'loops and pilots reach their code');
  fs.rmSync(out, { recursive: true, force: true });
});
