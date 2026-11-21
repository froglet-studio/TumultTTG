'use strict';
/**
 * The Code Atlas for Tumult: every folder, file, definition, data entry and value of the repository as one graph of
 * canonical nodes, sharded for the Loop Atlas page (docs/loopatlas/CODE.md). The output format is Cosmic Shore's
 * (Tools/Build/code_atlas.py there), so the same page reads both; only the extraction is Tumult's.
 *
 *   node tools/code-atlas.js build [--out DIR] [--strict]   write docs/loopatlas/code-out/ (ignored by git)
 *   node tools/code-atlas.js stats                          counts by kind, nothing written
 *   node tools/code-atlas.js self-test                      the parser, linker and hash refuse what they must
 *
 * What it reads:
 *  - every JS file under src/, tools/ and test/: top-level definitions (T.x = ..., function f, const x = ...), their
 *    line, signature and which other T definitions their body mentions (a light scan, not a compiler);
 *  - the engine's verbs: each `case 'verb':` of T.applyEffect, linked to every card face, gear ability and foe that uses it;
 *  - the data itself, loaded through tools/load.js: every entry of T.CARDS, T.GEAR, T.ENEMIES, T.RULES, ...
 *    with every value (a magnitude function shows its source and its value at P/E 1 and 3);
 *  - every Markdown file's sections; the Loop Atlas model's loops and pilots, linked to code from the paths and cards
 *    they cite and by hand in docs/loopatlas/code/links.json.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const REPO = path.resolve(__dirname, '..');
const ATLAS = path.join(REPO, 'docs', 'loopatlas');
const LINKS = path.join(ATLAS, 'code', 'links.json');
const DEFAULT_OUT = path.join(ATLAS, 'code-out');
const CODE_ROOTS = ['src', 'tools', 'test'];
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'code-out']);
const CODE_EXT = { '.js': 'js', '.mjs': 'js', '.css': 'css', '.html': 'html', '.json': 'json', '.py': 'py' };
const MAX_LIST = 64; // list elements kept per value list; the rest is counted
const MAX_VAL = 160; // characters of a value shown
const SHARD_TARGET = 400000; // raw bytes per shard
const MAX_SHARDS = 200;
// One letter per kind, the page's grouping alphabet (Cosmic Shore's, plus Tumult's verb X and entry D).
const KIND_CODE = {
  root: 'R',
  group: 'G',
  dir: 'd',
  js: 'c',
  css: 'a',
  html: 'a',
  json: 'a',
  py: 'c',
  md: 'k',
  sec: 's',
  loop: 'L',
  entry: 'D',
  method: 'M',
  const: 'K',
  value: 'F',
  verb: 'X',
};
// Data collections that only index another (T.CARD is T.CARDS by id): skipped, so an entry has one home.
const INDEXES = /(_BY|^CARD)$/;

// ------------------------------------------------------------------------------------------------ the graph
class Graph {
  constructor() {
    this.recs = new Map();
  }
  node(id, k, n, parent, extra) {
    let r = this.recs.get(id);
    if (!r) {
      r = { k, n };
      this.recs.set(id, r);
      if (parent) {
        r.p = parent;
        this.child(parent, id);
      }
    }
    for (const [key, v] of Object.entries(extra || {})) {
      if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)) r[key] = v;
    }
    return r;
  }
  child(parent, id) {
    const p = this.recs.get(parent);
    if (!p) return;
    p.c = p.c || [];
    if (!p.c.includes(id)) p.c.push(id);
  }
  rel(a, relation, b) {
    if (a === b || !this.recs.has(a)) return;
    const r = this.recs.get(a);
    r.r = r.r || {};
    const lst = (r.r[relation] = r.r[relation] || []);
    if (!lst.includes(b)) lst.push(b);
  }
  /** An edge, stored on both ends: each end gets the other as a neighbour (a copy in its ring). */
  link(a, ab, b, ba) {
    if (this.recs.has(a) && this.recs.has(b)) {
      this.rel(a, ab, b);
      this.rel(b, ba, a);
    }
  }
}

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (const b of Buffer.from(s, 'utf8')) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// ------------------------------------------------------------------------------------------------ JS scan
/** Blank comments and string contents (keeping line breaks and length), so a scan sees only code. */
function maskJs(src) {
  const out = src.split('');
  let i = 0;
  const blank = (a, b) => {
    for (let j = a; j < b; j++) if (out[j] !== '\n') out[j] = ' ';
  };
  while (i < src.length) {
    const ch = src[i];
    const nx = src[i + 1];
    if (ch === '/' && nx === '/') {
      const e = src.indexOf('\n', i);
      const end = e < 0 ? src.length : e;
      blank(i, end);
      i = end;
    } else if (ch === '/' && nx === '*') {
      const e = src.indexOf('*/', i + 2);
      const end = e < 0 ? src.length : e + 2;
      blank(i, end);
      i = end;
    } else if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\\') j++;
        else if (ch !== '`' && src[j] === '\n') break;
        j++;
      }
      blank(i + 1, j);
      i = j + 1;
    } else i++;
  }
  return out.join('');
}

const DEF = [
  // T.name = ... / T.UI.name = ...
  [/^( {0,2})(T(?:\.[A-Za-z_$][\w$]*)+)\s*=(?!=)\s*(.*)$/, (m) => ({ name: m[2], rest: m[3] })],
  [
    /^( {0,2})(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)?/,
    (m) => ({ name: m[2], rest: 'function (' + m[3] + ')' }),
  ],
  [/^( {0,2})(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=(?!=)\s*(.*)$/, (m) => ({ name: m[2], rest: m[3] })],
];

/** Top-level definitions of one JS file: name, line, kind (method/const/value), signature, mentions of T.x. */
function parseJs(src) {
  const masked = maskJs(src);
  const lines = src.split('\n');
  const mlines = masked.split('\n');
  const defs = [];
  for (let i = 0; i < mlines.length; i++) {
    const ml = mlines[i];
    for (const [re, take] of DEF) {
      const m = re.exec(ml);
      if (!m) continue;
      const d = take(m);
      const rest = d.rest.trim();
      const orig = lines[i].trim();
      const isFn = /^(async\s+)?(function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/.test(rest);
      const lit = /^[-\d'"`]/.test(orig.split('=').slice(1).join('=').trim());
      d.kind = isFn ? 'method' : lit || /^[A-Z][A-Z0-9_]*$/.test(d.name.split('.').pop()) ? 'const' : 'value';
      d.line = i + 1;
      d.indent = m[1].length;
      if (isFn) {
        const sm = /\(([^)]*)\)/.exec(orig.slice(orig.indexOf('=') + 1)) || /\(([^)]*)\)/.exec(orig);
        d.sig = d.name.split('.').pop() + '(' + (sm ? sm[1].trim() : '') + ')';
      } else
        d.v = orig
          .slice(orig.indexOf('=') + 1)
          .trim()
          .replace(/;$/, '')
          .slice(0, MAX_VAL);
      defs.push(d);
      break;
    }
  }
  // a definition's body runs to the next definition at the same depth or above
  for (let j = 0; j < defs.length; j++) {
    const end = j + 1 < defs.length ? defs[j + 1].line - 1 : mlines.length;
    const body = mlines.slice(defs[j].line - 1, end).join('\n');
    defs[j].lines = end - defs[j].line + 1;
    const ment = new Set();
    for (const m of body.matchAll(/\bT((?:\.[A-Za-z_$][\w$]*)+)/g)) ment.add('T' + m[1]);
    defs[j].mentions = [...ment];
    if (defs[j].name === 'T.applyEffect') {
      defs[j].verbs = [];
      const bl = src.split('\n').slice(defs[j].line - 1, end);
      bl.forEach((l, k) => {
        const vm = /^\s*case '([a-z_]+)':/.exec(l);
        if (vm) defs[j].verbs.push({ v: vm[1], line: defs[j].line + k });
      });
    }
  }
  return defs;
}

// ------------------------------------------------------------------------------------------------ values
function scalar(x) {
  if (typeof x === 'function') return fnText(x);
  if (typeof x === 'string') return x.length > MAX_VAL ? x.slice(0, MAX_VAL) + '…' : x;
  return String(x);
}
function fnText(f) {
  const s = f.toString().replace(/\s+/g, ' ');
  let at = '';
  if (f.length === 2) {
    try {
      const a = f(1, 1);
      const b = f(3, 3);
      if (typeof a === 'number' && typeof b === 'number') at = `  [P/E 1: ${a}, 3: ${b}]`;
      // a face's text: what a player reads at the first level and at the cap
      if (typeof a === 'string' && typeof b === 'string') return `P/E 1: ${a}` + (b !== a ? `  |  P/E 3: ${b}` : '');
    } catch (_) {
      /* a function of something else */
    }
  }
  return (s.length > MAX_VAL ? s.slice(0, MAX_VAL) + '…' : s) + at;
}
/** Every value of an entry as [key, value] rows; lists past MAX_LIST are counted, not dropped silently. */
function flatten(val, key, out, depth = 0) {
  if (val && typeof val === 'object' && depth < 8) {
    if (Array.isArray(val)) {
      if (val.every((x) => x === null || typeof x !== 'object')) {
        const shown = val.slice(0, MAX_LIST).map(scalar).join(', ');
        out.push([key, '[' + shown + (val.length > MAX_LIST ? `, … ${val.length - MAX_LIST} more` : '') + ']']);
        return out;
      }
      val.slice(0, MAX_LIST).forEach((x, i) => flatten(x, `${key}[${i}]`, out, depth + 1));
      if (val.length > MAX_LIST) out.push([key + '[…]', `${val.length - MAX_LIST} more`]);
      return out;
    }
    const ks = Object.keys(val);
    if (!ks.length) out.push([key, '{}']);
    for (const k of ks) flatten(val[k], key ? key + '.' + k : k, out, depth + 1);
    return out;
  }
  out.push([key, scalar(val)]);
  return out;
}

function entryName(x, k) {
  if (x && typeof x === 'object') return String(x.name || x.n || x.title || x.id || k);
  return String(k);
}

// ------------------------------------------------------------------------------------------------ build
class Builder {
  constructor(log = true) {
    this.g = new Graph();
    this.log = log;
    this.defs = new Map(); // T.x -> m: id
    this.files = new Map();
    this.missingLinks = [];
  }
  say(...a) {
    if (this.log) console.error(...a);
  }
  rel(p) {
    return path.relative(REPO, p).split(path.sep).join('/');
  }
  *walk(dir, exts) {
    const base = path.join(REPO, dir);
    if (!fs.existsSync(base)) return;
    const st = fs.statSync(base);
    if (st.isFile()) {
      if (!exts || exts.has(path.extname(base))) yield base;
      return;
    }
    for (const e of fs.readdirSync(base, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
      const p = path.join(base, e.name);
      if (e.isDirectory()) yield* this.walk(this.rel(p), exts);
      else if (!exts || exts.has(path.extname(e.name))) yield p;
    }
  }
  ensureDirs(rel) {
    const parts = rel.split('/').slice(0, -1);
    let parent = 'code/folders';
    let acc = '';
    for (const part of parts) {
      acc = acc ? acc + '/' + part : part;
      this.g.node('d:' + acc, 'dir', part, parent, { path: acc });
      parent = 'd:' + acc;
    }
    return parent;
  }
  fileNode(rel, kind, extra) {
    const id = 'f:' + rel;
    this.g.node(id, kind, rel.split('/').pop(), this.ensureDirs(rel), { path: rel, ...extra });
    this.files.set(rel, id);
    return id;
  }

  build() {
    const g = this.g;
    const t0 = Date.now();
    g.node('code', 'root', 'The codebase', null, {
      d: 'Every folder, file, definition, data entry and value of Tumult.',
    });
    g.node('code/folders', 'group', 'Folders', 'code');
    g.node('code/data', 'group', 'The game as data', 'code');
    g.node('code/verbs', 'group', 'Verbs', 'code');
    g.node('code/loops', 'group', 'Loops', 'code');
    this.codePass();
    this.say(`code done (${Date.now() - t0} ms)`);
    this.dataPass();
    this.say(`data done (${Date.now() - t0} ms)`);
    this.docsPass();
    this.say(`docs done (${Date.now() - t0} ms)`);
    this.loopsPass();
    this.say(`loops done (${Date.now() - t0} ms)`);
    return this;
  }

  codePass() {
    const g = this.g;
    const parsed = [];
    for (const root of CODE_ROOTS) {
      for (const p of this.walk(root, new Set(Object.keys(CODE_EXT)))) {
        const rel = this.rel(p);
        const kind = CODE_EXT[path.extname(p)];
        const src = fs.readFileSync(p, 'utf8');
        const fid = this.fileNode(rel, kind, { lines: src.split('\n').length });
        if (kind === 'js') parsed.push([rel, fid, parseJs(src)]);
      }
    }
    // other files a person might look for: the root's docs and config, the art's licence notes
    for (const p of [...this.walk('assets', new Set(['.md']))]) this.fileNode(this.rel(p), 'md');
    for (const name of ['package.json', 'CLAUDE.md', 'AGENTS.md', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md'])
      if (fs.existsSync(path.join(REPO, name))) this.fileNode(name, name.endsWith('.md') ? 'md' : 'json');
    for (const p of this.walk('.github', null)) this.fileNode(this.rel(p), 'json');
    // definitions: T.x are global (one id each); locals are per file
    for (const [rel, fid, defs] of parsed) {
      const seen = new Map();
      for (const d of defs) {
        let id = d.name.startsWith('T.') ? 'm:' + d.name : 'm:' + rel + '#' + d.name;
        if (g.recs.has(id) || seen.has(id)) {
          const n = (seen.get(id) || 1) + 1;
          seen.set(id, n);
          id = id + '~' + n;
        } else seen.set(id, 1);
        g.node(id, 'member', d.name, fid, { tk: d.kind, l: d.line, lines: d.lines, sig: d.sig, v: d.v, path: rel });
        if (d.name.startsWith('T.') && !this.defs.has(d.name)) this.defs.set(d.name, id);
        d.id = id;
        if (d.verbs) {
          for (const vb of d.verbs) {
            const vid = 'm:verb.' + vb.v;
            g.node(vid, 'member', vb.v, id, { tk: 'verb', l: vb.line, path: rel });
            g.child('code/verbs', vid);
          }
        }
      }
    }
    // mentions: a body's T.x that some file defines
    for (const [, , defs] of parsed) {
      for (const d of defs) {
        for (const name of d.mentions) {
          let to = this.defs.get(name);
          if (!to && name.split('.').length > 2) to = this.defs.get(name.split('.').slice(0, 2).join('.'));
          if (to && to !== d.id) g.link(d.id, 'mentions', to, 'mentionedBy');
        }
      }
    }
  }

  dataPass() {
    const g = this.g;
    const T = require('./load')();
    const verbOf = (fx, from) => {
      for (const f of fx || []) if (f && f.v) g.link(from, 'verbs', 'm:verb.' + f.v, 'usedBy');
    };
    for (const key of Object.keys(T)) {
      const val = T[key];
      if (typeof val === 'function' || !val || typeof val !== 'object' || INDEXES.test(key)) continue;
      const vals = Array.isArray(val) ? val : Object.values(val);
      if (vals.length && vals.every((x) => typeof x === 'function')) continue;
      const def = this.defs.get('T.' + key);
      const file = def ? g.recs.get(def).path : 'src/data';
      const holder = def || 'code/data';
      if (def) g.child('code/data', def);
      const objects = vals.length && vals.every((x) => x && typeof x === 'object');
      if (!objects) {
        // a table of constants (T.RULES, T.DICE): one entry, a row per value
        const id = `o:${file}#${key}`;
        g.node(id, 'entry', 'T.' + key, holder, { f: flatten(val, '', []), path: file });
        continue;
      }
      const keys = Array.isArray(val) ? val.map((x, i) => (x && x.id) || String(i)) : Object.keys(val);
      vals.forEach((x, i) => {
        const id = `o:${file}#${key}/${keys[i]}`;
        g.node(id, 'entry', entryName(x, keys[i]), holder, { f: flatten(x, '', []), path: file, eid: keys[i] });
      });
    }
    // relations the data states: a card's faces use verbs; a pilot flies cards and is of clades; gear and foes
    const C = (id) => {
      const f = this.defs.get('T.CARDS');
      return f ? `o:${g.recs.get(f).path}#CARDS/${id}` : null;
    };
    const S = (sp) => {
      const f = this.defs.get('T.SPECIES');
      return f ? `o:${g.recs.get(f).path}#SPECIES/${sp}` : null;
    };
    for (const c of T.CARDS || []) {
      const id = C(c.id);
      verbOf(c.P && c.P.fx, id);
      verbOf(c.E && c.E.fx, id);
      for (const sp of new Set([c.sp, ...(c.clades || [])])) g.link(id, 'clade', S(sp), 'cards');
    }
    const at = (key, x) => {
      const f = this.defs.get('T.' + key);
      return f ? `o:${g.recs.get(f).path}#${key}/${x}` : null;
    };
    for (const h of T.PREBUILTS || []) {
      const id = at('PREBUILTS', h.id);
      for (const c of h.cards || []) g.link(id, 'cards', C(c), 'pilots');
      for (const sp of h.species || []) g.link(id, 'clade', S(sp), 'pilots');
    }
    for (const gear of T.GEAR || []) for (const a of gear.abilities || []) verbOf(a.fx, at('GEAR', gear.id));
    for (const [k, e] of Object.entries(T.ENEMIES || {}))
      for (const a of Object.values(e.abilities || {})) verbOf(a.fx, at('ENEMIES', k));
  }

  docsPass() {
    const g = this.g;
    const mds = [...this.walk('docs', new Set(['.md']))].map((p) => this.rel(p));
    for (const rel of [...mds, ...[...this.files.keys()].filter((r) => r.endsWith('.md'))]) {
      if (rel.includes('/code-out/')) continue;
      const fid = this.files.get(rel) || this.fileNode(rel, 'md');
      const lines = fs.readFileSync(path.join(REPO, rel), 'utf8').split('\n');
      const stack = [[0, fid]];
      const slugs = new Set();
      let fence = false;
      lines.forEach((line, i) => {
        if (line.startsWith('```')) fence = !fence;
        if (fence) return;
        const m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
        if (!m) return;
        const lvl = m[1].length;
        const title = m[2];
        let slug =
          title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 60) || 'h';
        const s0 = slug;
        for (let k = 2; slugs.has(slug); k++) slug = `${s0}-${k}`;
        slugs.add(slug);
        while (stack.length && stack[stack.length - 1][0] >= lvl) stack.pop();
        const parent = stack.length ? stack[stack.length - 1][1] : fid;
        const sid = `s:${rel}#${slug}`;
        g.node(sid, 'sec', title.slice(0, 120), parent, { l: i + 1 });
        stack.push([lvl, sid]);
      });
      g.recs.get(fid).lines = lines.length;
    }
  }

  loopsPass() {
    const g = this.g;
    const model = JSON.parse(fs.readFileSync(path.join(ATLAS, 'model.json'), 'utf8'));
    const links = fs.existsSync(LINKS) ? JSON.parse(fs.readFileSync(LINKS, 'utf8')) : {};
    const L = (i) => 'L:' + i;
    for (const n of model.nodes)
      g.node(L(n.id), 'loop', n.name, n.parent ? L(n.parent) : 'code/loops', { tier: n.tier, lid: n.id });
    g.node('L:fleet', 'loop', 'The pilots', 'code/loops', { lid: 'fleet' });
    const cite = (lid, text) => {
      for (const m of String(text || '').matchAll(
        /((?:docs|src|tools|test)\/[^\s,;()]+?\.(?:md|js|mjs|json|css|html|py))/g,
      ))
        if (g.recs.has('f:' + m[1])) g.link(lid, 'code', 'f:' + m[1], 'loops');
      for (const m of String(text || '').matchAll(/\bcard ([a-z]+_[a-z_]+)/g)) {
        const f = this.defs.get('T.CARDS');
        const cid = f && `o:${g.recs.get(f).path}#CARDS/${m[1]}`;
        if (cid && g.recs.has(cid)) g.link(lid, 'code', cid, 'loops');
      }
    };
    for (const n of model.nodes) for (const s of n.src || []) cite(L(n.id), s);
    const pre = this.defs.get('T.PREBUILTS');
    for (const V of model.fleetOrder) {
      const f = model.fleet[V];
      const vid = 'L:vessel/' + V;
      g.node(vid, 'loop', f.label, 'L:fleet', { tier: 2, lid: 'fleet/' + V });
      for (const [E, v] of Object.entries(f.verbs || {})) {
        const id = `L:verb/${V}/${E}`;
        g.node(id, 'loop', v.ability || E, vid, { tier: 1, el: E });
        cite(id, v.source);
      }
      if (pre) {
        const prefix = `o:${g.recs.get(pre).path}#PREBUILTS/`;
        for (const id of g.recs.get(pre).c || []) {
          if (id.startsWith(prefix) && g.recs.get(id).n === V) g.link(vid, 'code', id, 'loops');
        }
      }
    }
    // hand links: docs/loopatlas/code/links.json, loop id -> ids or globs over ids (at most 60 hits each)
    const all = [...g.recs.keys()];
    for (const [lid, pats] of Object.entries(links)) {
      if (lid.startsWith('//')) continue;
      const ln = lid.startsWith('L:') ? lid : L(lid);
      if (!g.recs.has(ln)) {
        this.missingLinks.push(`${lid}: no such loop`);
        continue;
      }
      for (const pat of pats || []) {
        let hits;
        if (/[*?]/.test(pat)) {
          const re = new RegExp(
            '^' +
              pat
                .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.') +
              '$',
          );
          hits = all.filter((i) => re.test(i)).slice(0, 60);
        } else hits = g.recs.has(pat) ? [pat] : [];
        if (!hits.length) this.missingLinks.push(`${lid}: ${pat} matches nothing`);
        for (const h of hits) g.link(ln, 'code', h, 'loops');
      }
    }
  }

  /**
   * The inspection window's views: what the page draws for the node you are on (docs/loopatlas/CODE.md). A card is
   * drawn from its data (both faces, their cost and their text at the first level and at the cap); a pilot, an atlas
   * page and a place show their painted scene. A loop with no view of its own rolls up its code's and its children's,
   * a few from each, so the long game shows the whole atlas at a glance. Returns how many views were written.
   */
  writeViews(out) {
    const g = this.g;
    const T = global.T;
    if (!T || !T.CARDS) return 0;
    require(path.join(REPO, 'src', 'ui', 'pilots.js'));
    const U = T.UI || {};
    const dir = path.join(out, 'views');
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, 'img'), { recursive: true });
    const views = {};
    const nodes = {};
    const add = (id, vid) => {
      if (!g.recs.has(id) || !views[vid]) return;
      const l = (nodes[id] = nodes[id] || []);
      if (!l.some((e) => e[0] === vid)) l.push([vid]);
    };
    const at = (key, x) => {
      const f = this.defs.get('T.' + key);
      return f ? `o:${g.recs.get(f).path}#${key}/${x}` : null;
    };
    const text = (f, lv) => {
      try {
        return typeof f.txt === 'function' ? String(f.txt(lv, lv)) : String(f.txt || '');
      } catch (_) {
        return '';
      }
    };
    const face = (f) =>
      f && { n: f.n, ap: f.ap || 0, el: f.el || 0, cd: f.cd, dur: f.dur || 0, t1: text(f, 1), t3: text(f, 3) };
    for (const c of T.CARDS) {
      const vid = 'card:' + c.id;
      const sp = T.SPECIES[c.sp];
      views[vid] = {
        k: 'card',
        n: c.name,
        el: c.el,
        sp: sp ? sp.name : c.sp,
        fl: c.flavor || '',
        elc: (T.ETHERIONS[c.el] || {}).color,
        eln: (T.ETHERIONS[c.el] || {}).name,
        P: face(c.P),
        E: face(c.E),
      };
      add(at('CARDS', c.id), vid);
      for (const fx of [...((c.P && c.P.fx) || []), ...((c.E && c.E.fx) || [])])
        if (fx && fx.v) add('m:verb.' + fx.v, vid);
    }
    const scene = (key, name) => {
      const src = path.join(REPO, 'assets', 'scenes', key + '.webp');
      if (!key || !fs.existsSync(src)) return null;
      const vid = 'pic:' + key;
      if (!views[vid]) {
        fs.copyFileSync(src, path.join(dir, 'img', key + '.webp'));
        views[vid] = { k: 'pic', n: name, src: 'img/' + key + '.webp' };
      }
      return vid;
    };
    for (const h of T.PREBUILTS || []) {
      const a = U.pilotOf ? U.pilotOf({ id: h.id, name: h.name, species: h.species }) : null;
      const id = at('PREBUILTS', h.id);
      add(id, scene(a && a.key, h.name + ', ' + (h.title || '')));
      for (const c of h.cards || []) add(id, 'card:' + c);
    }
    for (const p of T.ATLAS || []) add(at('ATLAS', p.id), scene(String(p.plate || '').replace(/^scene\//, ''), p.name));
    // a loop: its code's views, then its children's, a few from each, best first (pictures before cards)
    const memo = new Map();
    const rollup = (id, depth) => {
      if (memo.has(id)) return memo.get(id);
      memo.set(id, []);
      const r = g.recs.get(id);
      const own = [...(nodes[id] || [])];
      const from = [...((r.r && r.r.code) || []), ...(r.k === 'loop' ? r.c || [] : [])];
      for (const c of from) {
        const sub = c.startsWith('L:') && depth < 9 ? rollup(c, depth + 1) : nodes[c] || [];
        for (const e of sub.slice(0, c.startsWith('L:') ? 3 : 8)) if (!own.some((o) => o[0] === e[0])) own.push(e);
      }
      own.sort((x, y) => (views[x[0]].k === 'pic' ? 0 : 1) - (views[y[0]].k === 'pic' ? 0 : 1));
      const top = own.slice(0, 12);
      memo.set(id, top);
      return top;
    };
    for (const [id, r] of g.recs) if (r.k === 'loop') rollup(id, 0);
    for (const [id, l] of memo) if (l.length) nodes[id] = l;
    fs.writeFileSync(path.join(dir, 'views.json'), JSON.stringify({ views, nodes }));
    return Object.keys(views).length;
  }

  write(out) {
    const g = this.g;
    for (const r of g.recs.values()) if (r.r) for (const k of Object.keys(r.r)) r.r[k] = [...new Set(r.r[k])].sort();
    // each record carries its children's kinds (one letter each) and, where the id does not say it, their names
    for (const r of g.recs.values()) {
      if (!r.c) continue;
      const ck = [];
      const cn = [];
      let named = false;
      for (const cid of r.c) {
        const cr = g.recs.get(cid);
        ck.push(KIND_CODE[cr.k === 'member' ? cr.tk : cr.k] || '?');
        if (/^(o:|s:|L:|code)/.test(cid) || cid.startsWith('m:verb.')) {
          cn.push(cr.n);
          named = true;
        } else cn.push('');
      }
      r.ck = ck.join('');
      if (named) r.cn = cn;
    }
    const blobs = new Map([...g.recs].map(([i, r]) => [i, JSON.stringify(r)]));
    let total = 0;
    for (const [i, b] of blobs) total += i.length + b.length + 4;
    const count = Math.max(1, Math.min(MAX_SHARDS, Math.ceil(total / SHARD_TARGET)));
    const shards = new Map();
    for (const [i, b] of blobs) {
      const s = fnv1a(i) % count;
      if (!shards.has(s)) shards.set(s, []);
      shards.get(s).push([i, b]);
    }
    fs.mkdirSync(path.join(out, 'shards'), { recursive: true });
    for (const old of fs.readdirSync(path.join(out, 'shards'))) fs.unlinkSync(path.join(out, 'shards', old));
    for (const [s, recs] of shards) {
      recs.sort((a, b) => (a[0] < b[0] ? -1 : 1));
      const body = '{' + recs.map(([i, b]) => JSON.stringify(i) + ':' + b).join(',') + '}';
      // gzip, then base64 in a .txt: claude.ai artifacts serve no .gz; the page inflates it with DecompressionStream
      const gz = zlib.gzipSync(Buffer.from(body, 'utf8'), { level: 9 });
      fs.writeFileSync(path.join(out, 'shards', String(s).padStart(3, '0') + '.gz.txt'), gz.toString('base64'));
    }
    const kinds = {};
    let values = 0;
    for (const r of g.recs.values()) {
      const k = r.k === 'member' ? r.tk : r.k;
      kinds[k] = (kinds[k] || 0) + 1;
      values += (r.f || []).length;
    }
    const loopCode = {};
    for (const [i, r] of g.recs) {
      if (r.k !== 'loop') continue;
      const key = i.startsWith('L:verb/') ? 'verb/' + i.slice(7) : r.lid;
      if (key) loopCode[key] = ((r.r && r.r.code) || []).length;
    }
    const views = this.writeViews(out);
    const index = {
      views,
      schema: 1,
      shards: count,
      shardFile: '{n}.gz.txt',
      hash: 'fnv1a32',
      root: 'code',
      nodes: g.recs.size,
      images: 0,
      thumb: 128,
      sheet: 16,
      loopImages: {},
      loopCode,
      values,
      bytes: total,
      kinds: Object.fromEntries(Object.entries(kinds).sort()),
      missingLinks: this.missingLinks,
    };
    fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(index, null, 1));
    const names = [...g.recs]
      .filter(([, r]) => ['loop', 'entry', 'js', 'md', 'json', 'css', 'html'].includes(r.k) || r.k === 'member')
      .map(([i, r]) => [i, r.n]);
    fs.writeFileSync(path.join(out, 'names.json'), JSON.stringify(names));
    return index;
  }
}

// ------------------------------------------------------------------------------------------------ self-test
const SAMPLE = `(function (T) {
  // T.fake = function () {}
  const R = () => T.RULES;
  T.alpha = function (m, h) {
    return T.beta(m) + "T.notMentioned";
  };
  T.beta = (m) => m;
  T.GAP = 3;
  T.applyEffect = function (m, a, f) {
    switch (f.v) {
      case 'strike': {
        return T.alpha(m);
      }
      case 'move':
        return 0;
    }
  };
})(T);
function local(x) {
  return x;
}
`;

function selfTest() {
  const fails = [];
  const ok = (cond, what) => {
    if (!cond) fails.push(what);
  };
  const d = parseJs(SAMPLE);
  const by = Object.fromEntries(d.map((x) => [x.name, x]));
  ok(!by['T.fake'], 'a commented-out definition is not one');
  ok(by.R && by['T.alpha'] && by['T.beta'] && by['T.GAP'] && by.local, `definitions found: ${d.map((x) => x.name)}`);
  ok(
    by['T.alpha'].kind === 'method' && by['T.alpha'].sig === 'alpha(m, h)',
    `method and signature: ${by['T.alpha'].sig}`,
  );
  ok(by['T.GAP'].kind === 'const' && by['T.GAP'].v === '3', 'constant and value');
  ok(by['T.alpha'].line === 4, `line numbers (${by['T.alpha'].line})`);
  ok(by['T.alpha'].mentions.includes('T.beta'), 'a body mentions what it calls');
  ok(!by['T.alpha'].mentions.includes('T.notMentioned'), 'a string that looks like a mention is not one');
  ok(by['T.applyEffect'].verbs.map((v) => v.v).join() === 'strike,move', 'verbs are the cases of T.applyEffect');
  const g = new Graph();
  g.node('a', 'member', 'A');
  g.node('b', 'member', 'B');
  g.link('a', 'mentions', 'b', 'mentionedBy');
  g.link('b', 'mentions', 'a', 'mentionedBy');
  ok(
    g.recs.get('a').r.mentions[0] === 'b' && g.recs.get('b').r.mentions[0] === 'a',
    'a cycle is two records, not a chain',
  );
  g.link('a', 'mentions', 'zz', 'mentionedBy');
  ok(!g.recs.has('zz') && g.recs.get('a').r.mentions.length === 1, 'a link to a missing node is refused');
  ok(fnv1a('') === 0x811c9dc5 && fnv1a('m:T.alpha') === fnv1a('m:T.alpha'), 'hash');
  const rows = flatten(
    { a: 1, b: [1, 2], c: { d: (P, E) => P + E }, e: Array.from({ length: 100 }, (_, i) => ({ i })) },
    '',
    [],
  );
  const row = (k) => rows.find((r) => r[0] === k);
  ok(row('a')[1] === '1' && row('b')[1] === '[1, 2]', 'flatten keeps values');
  ok(/P\/E 1: 2, 3: 6/.test(row('c.d')[1]), `a magnitude shows its values: ${row('c.d')[1]}`);
  ok(
    rows.some((r) => r[0] === 'e[…]'),
    'long lists are counted, not dropped silently',
  );
  if (fails.length) {
    console.log('code-atlas self-test FAILED:\n  ' + fails.join('\n  '));
    return 1;
  }
  console.log('code-atlas self-test: all checks refuse what they must');
  return 0;
}

function main(argv) {
  const cmd = argv[0];
  const flag = (f) => argv.includes(f);
  const outAt = argv.indexOf('--out');
  const out = outAt >= 0 ? path.resolve(argv[outAt + 1]) : DEFAULT_OUT;
  if (cmd === 'self-test') return selfTest();
  if (cmd !== 'build' && cmd !== 'stats') {
    console.log('usage: node tools/code-atlas.js build [--out DIR] [--strict] | stats | self-test');
    return 2;
  }
  const b = new Builder().build();
  if (cmd === 'stats') {
    const kinds = {};
    for (const r of b.g.recs.values())
      kinds[r.k === 'member' ? r.tk : r.k] = (kinds[r.k === 'member' ? r.tk : r.k] || 0) + 1;
    console.log(kinds, b.g.recs.size, 'records');
    return 0;
  }
  const idx = b.write(out);
  console.log(
    JSON.stringify(
      { nodes: idx.nodes, values: idx.values, bytes: idx.bytes, shards: idx.shards, kinds: idx.kinds },
      null,
      1,
    ),
  );
  for (const m of idx.missingLinks) console.error('  link: ' + m);
  if (flag('--strict') && idx.missingLinks.length) {
    console.error(`code-atlas: ${idx.missingLinks.length} hand links in docs/loopatlas/code/links.json match nothing`);
    return 1;
  }
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { parseJs, maskJs, flatten, fnv1a, Graph, Builder };
