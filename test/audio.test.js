'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');
const manifest = require(path.join(root, 'src', 'manifest.json'));
const load = () => import(pathToFileURL(path.join(root, 'tools', 'build.mjs')).href);
const src = fs.readFileSync(path.join(root, 'src', 'ui', 'audio.js'), 'utf8');
const listed = (re) => [...src.matchAll(re)].map((m) => m[1]);
// every file an effect names, and every track id
const sfxFiles = [
  ...new Set(
    [...src.matchAll(/files: \[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])),
  ),
];
const trackIds = listed(/\{ id: '([^']+)', title:/g);

test('every effect and track the Audio studio lists has its file', () => {
  assert.ok(sfxFiles.length >= 40, 'the effects are listed');
  assert.equal(trackIds.length, 11, "Cosmic Shore's eleven tracks");
  for (const f of sfxFiles) assert.ok(fs.existsSync(path.join(root, manifest.audio.sfx, f + '.mp3')), `sfx/${f}.mp3`);
  for (const t of trackIds)
    assert.ok(fs.existsSync(path.join(root, manifest.audio.music, t + '.mp3')), `music/${t}.mp3`);
});

test('the offline file carries every effect and only the offline music; the web version names each by content', async () => {
  const { audio, buildWeb } = await load();
  const offline = JSON.parse(
    audio(manifest)
      .replace(/^window\.T\.AUDIO = /, '')
      .replace(/;\s*$/, ''),
  );
  for (const f of sfxFiles) assert.match(offline['sfx/' + f] || '', /^data:audio\/mpeg;base64,/, `sfx/${f} inlined`);
  const music = Object.keys(offline).filter((k) => k.startsWith('music/'));
  assert.deepEqual(music.map((k) => k.slice(6)).sort(), [...manifest.audio.offline].sort());
  const kb = Object.values(offline).reduce((n, v) => n + v.length, 0) / 1024;
  assert.ok(kb < 5000, `the offline file's sound stays under 5 MB (${kb.toFixed(0)} KB)`);

  const { files, js } = buildWeb();
  const web = JSON.parse(js.match(/window\.T\.AUDIO = (\{[^\n]*\});/)[1]);
  for (const t of trackIds) {
    assert.match(web['music/' + t] || '', /^assets\/audio\/music\/[^/]+\.[0-9a-f]{10}\.mp3$/, `music/${t}`);
    assert.ok(files.has(web['music/' + t]), `${web['music/' + t]} is built`);
  }
  for (const f of sfxFiles) assert.ok(files.has(web['sfx/' + f]), `sfx/${f} is built`);
});

test('the service worker leaves streamed music to the browser', () => {
  const sw = fs.readFileSync(path.join(root, 'src', 'web', 'sw.js'), 'utf8');
  assert.match(sw, /\/assets\/audio\/music\/'\) \|\| req\.headers\.has\('range'\)\) return;/);
});

test('the playtest file stays under the claude.ai page limit: effects, no music', async () => {
  const { build } = await load();
  const { html, js } = build({ playtest: true });
  const sound = JSON.parse(js.match(/window\.T\.AUDIO = (\{[^\n]*\});/)[1]);
  assert.ok(!Object.keys(sound).some((k) => k.startsWith('music/')), 'no music');
  assert.ok(
    Object.keys(sound).some((k) => k.startsWith('sfx/')),
    'the effects',
  );
  assert.ok(Buffer.byteLength(html) < 16 * 1024 * 1024, `${(Buffer.byteLength(html) / 1048576).toFixed(1)} MB`);
});
