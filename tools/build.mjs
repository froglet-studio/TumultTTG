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
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const read = (rel) => readFileSync(join(src, rel), 'utf8');

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2' };
const dataUri = (file) => `data:${MIME[file.split('.').pop()]};base64,${readFileSync(file).toString('base64')}`;

/**
 * The art, inlined so the build stays one file that makes no network requests (assets/README.md).
 * Every image in a folder listed under manifest.art.images becomes T.ART['<folder>/<NAME>'], a data URI;
 * the UI falls back to drawn art when a key is missing. Fonts become @font-face rules.
 */
export function art(manifest) {
  const a = manifest.art || { images: [], fonts: [] };
  const img = {};
  for (const dir of a.images) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    const tag = dir.split('/').pop().replace(/s$/, '');
    for (const f of readdirSync(abs).sort())
      if (MIME[f.split('.').pop()] && !f.endsWith('.woff2'))
        img[`${tag}/${f.replace(/\.[^.]+$/, '')}`] = dataUri(join(abs, f));
  }
  const css = (a.fonts || [])
    .map(
      (f) =>
        `@font-face { font-family: '${f.family}'; font-weight: ${f.weight}; font-style: normal; font-display: swap; src: url(${dataUri(join(root, f.file))}) format('woff2'); }`,
    )
    .join('\n');
  return { js: `window.T.ART = ${JSON.stringify(img)};\n`, css };
}

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
  const inlined = art(manifest);
  const js =
    stamp +
    inlined.js +
    [...manifest.engine, ...manifest.ui, ...extra.js].map((rel) => banner(rel) + read(rel)).join('\n');
  const css = inlined.css + '\n' + [...manifest.css, ...extra.css].map((rel) => banner(rel) + read(rel)).join('\n');
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
