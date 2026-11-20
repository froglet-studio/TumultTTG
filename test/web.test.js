'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');
const load = () => import(pathToFileURL(path.join(root, 'tools', 'build.mjs')).href);

test('the web version: a small page, every file it names exists, every asset is named by its content', async () => {
  const { buildWeb, build } = await load();
  const { files, js } = buildWeb();
  const html = files.get('index.html');
  assert.ok(html.length < 4000, 'the page itself stays small');
  assert.ok(!/__(TITLE|VERSION)__|<!--__HEAD__-->/.test(html), 'template placeholders were replaced');
  const named = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(
    named.some((n) => /^assets\/tumult\.[0-9a-f]{10}\.js$/.test(n)),
    'the script is named by its content',
  );
  assert.ok(
    named.some((n) => /^assets\/tumult\.[0-9a-f]{10}\.css$/.test(n)),
    'the stylesheet is named by its content',
  );
  for (const n of named) assert.ok(files.has(n), `${n} is named by the page but not built`);
  for (const p of files.keys())
    if (p.startsWith('assets/')) assert.match(p, /\.[0-9a-f]{10}\.[a-z0-9]+$/, `${p} has no content hash`);
  for (const p of ['sw.js', '_headers', '.nojekyll']) assert.ok(files.has(p), `${p} is missing`);
  // the same game as the single file: every source, and the script compiles
  const manifest = require(path.join(root, 'src', 'manifest.json'));
  for (const rel of [...manifest.engine, ...manifest.ui]) assert.ok(js.includes(`───── ${rel} ─────`), rel);
  // the playtest panel stays out; the online screens are in, served by the web version's own backend
  for (const rel of manifest.playtest.js)
    if (!manifest.web.js.includes(rel)) assert.ok(!js.includes(`───── ${rel} ─────`), `${rel} leaked in`);
  for (const rel of manifest.web.js) assert.ok(js.includes(`───── ${rel} ─────`), `${rel} is missing`);
  assert.ok(
    js.indexOf('───── web/backend-worker.js') < js.indexOf('───── ui/net.js'),
    'the backend provider loads before the online screens look for it',
  );
  assert.doesNotThrow(() => new vm.Script(js, { filename: 'tumult.js' }));
  assert.ok(!js.includes('data:image/'), 'paintings are files, not inlined');
  // every painting the game can show is a file, under the same key as in the single file
  const sandbox = { window: { T: {} } };
  vm.runInNewContext(js.slice(0, js.indexOf('\n/* ─────')), sandbox);
  const ART = sandbox.window.T.ART;
  const single = { window: { T: {} } };
  vm.runInNewContext(build().js.slice(0, build().js.indexOf('\n/* ─────')), single);
  assert.deepEqual(Object.keys(ART).sort(), Object.keys(single.window.T.ART).sort());
  for (const [k, url] of Object.entries(ART)) assert.ok(files.has(url), `${k} → ${url} is not built`);
  // the font is named relative to the stylesheet, which sits beside it
  const css = files.get(named.find((n) => n.endsWith('.css')));
  for (const m of css.matchAll(/url\(([^)]+\.woff2)\)/g)) assert.ok(files.has('assets/' + m[1]), m[1]);
});

test('the web version: the service worker compiles and lists the files a first visit needs', async () => {
  const { buildWeb } = await load();
  const { files, version } = buildWeb();
  const sw = files.get('sw.js');
  assert.doesNotThrow(() => new vm.Script(sw, { filename: 'sw.js' }));
  const handlers = {};
  const self = { addEventListener: (t, f) => (handlers[t] = f), location: { origin: 'https://x' } };
  vm.runInNewContext(sw + '\n;this.out = { CACHE, CORE };', Object.assign(self, { self }));
  assert.equal(self.out.CACHE, `tumult-${version}`);
  assert.ok(self.out.CORE.includes('./'));
  for (const p of self.out.CORE.slice(1)) assert.ok(files.has(p.slice(2)), `${p} is precached but not built`);
  assert.deepEqual(Object.keys(handlers).sort(), ['activate', 'fetch', 'install']);
  // the same sources give the same names, so a rebuild that changes nothing invalidates no cache
  assert.equal(buildWeb().version, version);
});

test('the backend seam: offline by default, claude.ai when its page hosts the game, newest provider first', () => {
  const fs = require('node:fs');
  const code = fs.readFileSync(path.join(root, 'src', 'ui', 'backend.js'), 'utf8');
  const offline = { window: { T: {} } };
  vm.runInNewContext(code, offline);
  const B = offline.window.T.Backend;
  assert.equal(B.available(), false);
  assert.equal(B.name(), 'offline');
  return B.use('db')
    .then((d) => assert.equal(d, null, 'no provider: null, not an error'))
    .then(async () => {
      const hosted = { window: { T: {}, claude: { use: async (c) => (c === 'db' ? { tag: 'artifact-db' } : null) } } };
      vm.runInNewContext(code, hosted);
      const H = hosted.window.T.Backend;
      assert.equal(H.name(), 'claude-artifact');
      assert.deepEqual(await H.use('db'), { tag: 'artifact-db' });
      assert.equal(await H.use('room'), null);
      H.register({ name: 'worker', available: () => true, use: async (c) => ({ tag: 'worker-' + c }) });
      assert.equal(H.name(), 'worker');
      assert.deepEqual(await H.use('user'), { tag: 'worker-user' });
      assert.throws(() => H.register({ name: 'broken' }));
    });
});
