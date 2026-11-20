#!/usr/bin/env node
/**
 * Build the single-file game.
 *
 *   node tools/build.mjs                        dist/TUMULT.html
 *   node tools/build.mjs --playtest             dist/TUMULT.playtest.html — the game plus the playtest panel
 *   node tools/build.mjs --playtest --fragment  dist/TUMULT.playtest.fragment.html — the same, without the
 *                                               <html>/<head>/<body> wrapper, for a host page that supplies one
 *   node tools/build.mjs --web                  dist/web/ — the hosted web version: a small page that loads the
 *                                               script, the styles, the font and each painting as separate files
 *                                               named by their content, so a browser keeps them until they change
 *   add --check to any of them                  also compile the inlined script to catch syntax errors
 *
 * Zero dependencies. The game is a set of plain scripts that share one global
 * namespace (T); the build inlines them, in src/manifest.json order, into a
 * template together with the stylesheet.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
export function art(manifest, url = dataUri) {
  const a = manifest.art || { images: [], fonts: [] };
  const img = {};
  for (const dir of a.images) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    const tag = dir.split('/').pop().replace(/s$/, '');
    for (const f of readdirSync(abs).sort())
      if (MIME[f.split('.').pop()] && !f.endsWith('.woff2'))
        img[`${tag}/${f.replace(/\.[^.]+$/, '')}`] = url(join(abs, f), 'image');
  }
  const css = (a.fonts || [])
    .map(
      (f) =>
        `@font-face { font-family: '${f.family}'; font-weight: ${f.weight}; font-style: normal; font-display: swap; src: url(${url(join(root, f.file), 'font')}) format('woff2'); }`,
    )
    .join('\n');
  return { js: `window.T.ART = ${JSON.stringify(img)};\n`, css };
}

/** Where a variant is written, relative to the repository root. */
export const outFile = ({ playtest = false, fragment = false } = {}) =>
  `dist/TUMULT${playtest ? '.playtest' : ''}${fragment ? '.fragment' : ''}.html`;

/**
 * Where the web version sends its anonymous play data: Tumult's Froglet Analytics server and the public,
 * write-only ingest key that server accepts (docs/reference/ANALYTICS.md). The key file is the same one the
 * server reads from this repository, so the two cannot drift.
 */
export function analyticsConfig() {
  const dir = join(root, 'docs', 'analytics');
  const { url } = JSON.parse(readFileSync(join(dir, 'ingest.json'), 'utf8'));
  const key = readFileSync(join(dir, 'ingest_key.public'), 'utf8').trim();
  if (!/^https:\/\/[a-z0-9.-]+$/.test(url) || !/^fa_in_public_[A-Za-z0-9_-]{16,}$/.test(key))
    throw new Error('docs/analytics/ingest.json needs an https url and ingest_key.public a public ingest key');
  return { url, key };
}

/** The game's script and stylesheet, art aside: the sources in manifest order, each under a banner. */
function sources({ playtest = false, web = false } = {}) {
  const manifest = JSON.parse(read('manifest.json'));
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const extra = playtest ? manifest.playtest : { js: [], css: [] };
  // The web version's own scripts (Froglet Analytics); never in the offline file, which makes no network requests.
  const webJs = web ? (manifest.web && manifest.web.js) || [] : [];
  const webCss = web ? (manifest.web && manifest.web.css) || [] : [];
  // each file once, where it first comes: the web version's backend before the playtest panel's online screens
  const once = (list) => [...new Set(list)];
  const banner = (rel) => `\n/* ───── ${rel} ───── */\n`;
  const fill = (rel, body) =>
    rel === 'web/analytics.js'
      ? body.replace("/*__ANALYTICS__*/ { url: '', key: '' }", () => JSON.stringify(analyticsConfig()))
      : body;
  // The page knows which build it is: the playtest panel shows it and puts it in its reports.
  const stamp = `window.T = window.T || {};\nwindow.T.BUILD = ${JSON.stringify({ version: pkg.version, playtest })};\n`;
  const js = once([...manifest.engine, ...manifest.ui, ...webJs, ...extra.js])
    .map((rel) => banner(rel) + fill(rel, read(rel)))
    .join('\n');
  const css = once([...manifest.css, ...webCss, ...extra.css])
    .map((rel) => banner(rel) + read(rel))
    .join('\n');
  return { manifest, pkg, stamp, js, css };
}

export function build({ playtest = false, fragment = false } = {}) {
  const s = sources({ playtest });
  const inlined = art(s.manifest);
  const js = s.stamp + inlined.js + s.js;
  const css = inlined.css + '\n' + s.css;
  if (js.includes('</script'))
    throw new Error('A source file contains "</script" — it would end the inline script early.');
  if (css.includes('</style'))
    throw new Error('A stylesheet contains "</style" — it would end the inline style early.');
  // Function replacers: the sources contain "$" sequences that String.replace would otherwise interpret.
  const html = read(fragment ? 'fragment.template.html' : 'index.template.html')
    .replace('__VERSION__', () => s.pkg.version)
    .replace('__TITLE__', () => (playtest ? 'Tumult Playtest' : 'TUMULT'))
    .replace('/*__CSS__*/', () => css)
    .replace('/*__JS__*/', () => js);
  return { html, js };
}

/** A file's name with the start of its content hash: `tumult.js` → `tumult.3f9a0c21be.js`. */
const hashed = (name, body) => {
  const h = createHash('sha256').update(body).digest('hex').slice(0, 10);
  const dot = name.lastIndexOf('.');
  return `${name.slice(0, dot)}.${h}${name.slice(dot)}`;
};

/** Where the web version is written, relative to the repository root. */
export const webDir = ({ playtest = false } = {}) => `dist/web${playtest ? '-playtest' : ''}`;

/**
 * The hosted web version (GitHub Pages, Cloudflare previews). The same sources as the single file, but
 * index.html is a few hundred bytes that loads assets/ — the script, the stylesheet, the font and each
 * painting as its own file, named by its content. A painting is fetched only when a screen shows it, and a
 * returning player's browser (and sw.js, which keeps them for offline play) reuses every file whose name
 * has not changed. Returns { files: Map(path → Buffer|string), js } without writing anything.
 */
export function buildWeb({ playtest = false } = {}) {
  const s = sources({ playtest, web: true });
  const files = new Map();
  const put = (path, body) => (files.set(path, body), path);
  // art and fonts: copied as they are, under a content-hashed name; the script and stylesheet name them
  const inlined = art(s.manifest, (file, kind) => {
    const body = readFileSync(file);
    const name = hashed(file.split(/[\\/]/).pop(), body);
    if (kind === 'font') return put(`assets/${name}`, body).slice('assets/'.length); // relative to the stylesheet
    const dir = file.split(/[\\/]/).slice(-2, -1)[0];
    return put(`assets/${dir}/${name}`, body); // relative to the page
  });
  const fonts = [...files.keys()].filter((p) => p.endsWith('.woff2'));
  const js = s.stamp + inlined.js + s.js;
  const css = inlined.css + '\n' + s.css;
  const jsPath = put(`assets/${hashed('tumult.js', js)}`, js);
  const cssPath = put(`assets/${hashed('tumult.css', css)}`, css);
  // the files a first visit needs before it can draw: sw.js fetches these at install, the rest on demand
  const core = [jsPath, cssPath, ...fonts];
  const version = createHash('sha256').update(core.join('|')).digest('hex').slice(0, 10);
  const html = read('web/index.template.html')
    .replace('__VERSION__', () => s.pkg.version)
    .replace('__TITLE__', () => (playtest ? 'Tumult Playtest' : 'Tumult'))
    .replace(
      '<!--__HEAD__-->',
      () =>
        fonts.map((f) => `<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin />`).join('\n    ') +
        `\n    <link rel="stylesheet" href="${cssPath}" />\n    <script defer src="${jsPath}"></script>`,
    );
  put('index.html', html);
  put(
    'sw.js',
    read('web/sw.js')
      .replace('__CACHE__', () => `tumult-${version}`)
      .replace('/*__CORE__*/ []', () => JSON.stringify(['./', ...core.map((p) => './' + p)])),
  );
  put('_headers', read('web/_headers'));
  put('.nojekyll', '');
  return { files, js, version };
}

// Compare case-insensitively: on Windows the drive letter's case can differ between the two.
const isMain =
  !!process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isMain) {
  const variant = { playtest: process.argv.includes('--playtest'), fragment: process.argv.includes('--fragment') };
  if (process.argv.includes('--web')) {
    const { files, js } = buildWeb(variant);
    if (process.argv.includes('--check')) {
      new vm.Script(js, { filename: 'tumult.js' });
      new vm.Script(files.get('sw.js'), { filename: 'sw.js' });
    }
    const dir = join(root, webDir(variant));
    rmSync(dir, { recursive: true, force: true });
    let bytes = 0;
    for (const [rel, body] of files) {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), body);
      bytes += Buffer.byteLength(body);
    }
    const first = [...files].filter(([p]) => !/\/(pilots|scenes|portraits)\//.test(p));
    const firstKB = first.reduce((n, [, b]) => n + Buffer.byteLength(b), 0) / 1024;
    console.log(
      `built ${webDir(variant)}/ — ${files.size} files, ${(bytes / 1024).toFixed(0)} KB in all, ` +
        `${firstKB.toFixed(0)} KB before the first painting`,
    );
  } else {
    const { html, js } = build(variant);
    if (process.argv.includes('--check')) new vm.Script(js, { filename: 'TUMULT.inline.js' });
    const rel = outFile(variant);
    const out = join(root, rel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    console.log(`built ${rel} — ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
  }
}
