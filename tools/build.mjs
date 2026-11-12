#!/usr/bin/env node
/**
 * Build the single-file game.
 *
 *   node tools/build.mjs                        dist/TUMULT.html
 *   node tools/build.mjs --playtest             dist/TUMULT.playtest.html — the game plus the playtest panel
 *   node tools/build.mjs --playtest --fragment  dist/TUMULT.playtest.fragment.html — the same, without the
 *                                               <html>/<head>/<body> wrapper, for a host page that supplies one
 *   add --check to any of them                  also compile the inlined script to catch syntax errors
 *
 * Zero dependencies. The game is a set of plain scripts that share one global
 * namespace (T); the build inlines them, in src/manifest.json order, into a
 * template together with the stylesheet.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const read = (rel) => readFileSync(join(src, rel), 'utf8');

/** Where a variant is written, relative to the repository root. */
export const outFile = ({ playtest = false, fragment = false } = {}) =>
  `dist/TUMULT${playtest ? '.playtest' : ''}${fragment ? '.fragment' : ''}.html`;

export function build({ playtest = false, fragment = false } = {}) {
  const manifest = JSON.parse(read('manifest.json'));
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const extra = playtest ? manifest.playtest : { js: [], css: [] };
  const banner = (rel) => `\n/* ───── ${rel} ───── */\n`;
  // The page knows which build it is: the playtest panel shows it and puts it in its reports.
  const stamp = `window.T = window.T || {};\nwindow.T.BUILD = ${JSON.stringify({ version: pkg.version, playtest })};\n`;
  const js = stamp + [...manifest.engine, ...manifest.ui, ...extra.js].map((rel) => banner(rel) + read(rel)).join('\n');
  const css = [...manifest.css, ...extra.css].map((rel) => banner(rel) + read(rel)).join('\n');
  if (js.includes('</script'))
    throw new Error('A source file contains "</script" — it would end the inline script early.');
  if (css.includes('</style'))
    throw new Error('A stylesheet contains "</style" — it would end the inline style early.');
  // Function replacers: the sources contain "$" sequences that String.replace would otherwise interpret.
  const html = read(fragment ? 'fragment.template.html' : 'index.template.html')
    .replace('__VERSION__', () => pkg.version)
    .replace('__TITLE__', () => (playtest ? 'Tumult Playtest' : 'TUMULT'))
    .replace('/*__CSS__*/', () => css)
    .replace('/*__JS__*/', () => js);
  return { html, js };
}

// Compare case-insensitively: on Windows the drive letter's case can differ between the two.
const isMain =
  !!process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isMain) {
  const variant = { playtest: process.argv.includes('--playtest'), fragment: process.argv.includes('--fragment') };
  const { html, js } = build(variant);
  if (process.argv.includes('--check')) new vm.Script(js, { filename: 'TUMULT.inline.js' });
  const rel = outFile(variant);
  const out = join(root, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`built ${rel} — ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
}
