'use strict';
/**
 * Load the Tumult engine (data + rules + AI + run layer, no UI) into a fresh
 * global `T` namespace for Node tools and tests.
 *
 *   const T = require('./load')();      // from tools/
 *   const T = require('../tools/load')(); // from test/
 *
 * The source files are plain browser scripts that attach to `window.T` in the
 * browser and `global.T` in Node. Load order comes from src/manifest.json.
 */
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const manifest = require(path.join(SRC, 'manifest.json'));

module.exports = function loadTumult() {
  global.T = {};
  for (const rel of manifest.engine) {
    const file = path.join(SRC, rel);
    delete require.cache[require.resolve(file)];
    require(file);
  }
  return global.T;
};
module.exports.SRC = SRC;
module.exports.manifest = manifest;
