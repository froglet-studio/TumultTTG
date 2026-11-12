'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let hasJsdom = true;
try {
  require.resolve('jsdom');
} catch {
  hasJsdom = false;
}
const skip = hasJsdom ? false : 'jsdom is not installed (run `npm install`)';

async function drive(opts) {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const { driveRun } = require('../tools/ui-drive');
  return driveRun(build().html, opts);
}

test(
  'UI: a whole run can be played through the real interface (autoplayed turns)',
  { skip, timeout: 120_000 },
  async () => {
    const r = await drive({ seed: 1, auto: true });
    assert.deepEqual(r.errors, [], 'no JavaScript errors');
    assert.equal(r.screen, 'summary', 'the run reaches the summary screen');
    assert.ok(r.missions >= 1 && r.nodes >= 1);
  },
);

test(
  'UI: clicking card faces, targets and nodes never throws (fuzz, on the flood tide)',
  { skip, timeout: 120_000 },
  async () => {
    const r = await drive({ seed: 2, auto: false, tide: 'flood' });
    assert.deepEqual(r.errors, [], 'no JavaScript errors');
    assert.equal(r.tide, 'flood', "the difficulty picked on the title screen is the run's");
    assert.equal(r.screen, 'summary');
  },
);
