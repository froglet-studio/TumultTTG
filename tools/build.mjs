#!/usr/bin/env node
/**
 * Build the single-file game: dist/TUMULT.html
 *
 *   node tools/build.mjs            build
 *   node tools/build.mjs --check    build, then compile the inlined script to catch syntax errors
 *
 * Zero dependencies. The game is a set of plain scripts that share one global
 * namespace (T); the build inlines them, in src/manifest.json order, into
 * src/index.template.html together with the stylesheet.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const read = (rel) => readFileSync(join(src, rel), 'utf8');

export function build() {
  const manifest = JSON.parse(read('manifest.json'));
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const banner = (rel) => `\n/* ───── ${rel} ───── */\n`;
  const js = [...manifest.engine, ...manifest.ui].map((rel) => banner(rel) + read(rel)).join('\n');
  const css = manifest.css.map((rel) => banner(rel) + read(rel)).join('\n');
  if (js.includes('</script'))
    throw new Error('A source file contains "</script" — it would end the inline script early.');
  // Function replacers: the sources contain "$" sequences that String.replace would otherwise interpret.
  const html = read('index.template.html')
    .replace('__VERSION__', () => pkg.version)
    .replace('/*__CSS__*/', () => css)
    .replace('/*__JS__*/', () => js);
  return { html, js };
}

// Compare case-insensitively: on Windows the drive letter's case can differ between the two.
const isMain =
  !!process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isMain) {
  const { html, js } = build();
  if (process.argv.includes('--check')) new vm.Script(js, { filename: 'TUMULT.inline.js' });
  const out = join(root, 'dist', 'TUMULT.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`built dist/TUMULT.html — ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
}
