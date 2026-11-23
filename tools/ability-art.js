'use strict';
/**
 * Paintings of what each ability face does (assets/ability-art, src/ui/ability-art.js).
 *
 *   node tools/ability-art.js plan              rewrite src/ui/ability-art.js: every trait face, nine to a sheet
 *                                               (faces already placed keep their sheet and cell; new ones fill in)
 *   node tools/ability-art.js prompt 12         the image prompt for sheet 12 (a 3×3 grid, one face a cell)
 *   node tools/ability-art.js cut 12 in.png     cut a generated 3×3 sheet into cells, trim the gutters, shrink
 *                                               each to 144 px and repack them as assets/ability-art/sheet-012.webp
 *   node tools/ability-art.js keys a.P b.E …    a prompt for any nine faces (a test sheet)
 *   node tools/ability-art.js missing           the sheets in the plan that have no file yet
 *
 * The paintings were generated in Figma Weave (Nano Banana Pro, Garrett's workspace) from the prompts this
 * tool writes, styled on a test sheet Garrett approved (assets/README.md). `cut` needs ImageMagick (convert).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PLAN = path.join(ROOT, 'src', 'ui', 'ability-art.js');
const OUT = path.join(ROOT, 'assets', 'ability-art');
const PER = 9; // a 3×3 sheet
const CELL = 144; // px of one painting in the game

const T = require('./load')();

/** The sheets as they are now: an array of arrays of 'cardId.P' / 'cardId.E' keys. */
function readPlan() {
  if (!fs.existsSync(PLAN)) return [];
  const g = { T: { UI: {} } };
  new Function('window', 'global', fs.readFileSync(PLAN, 'utf8'))(undefined, g);
  return g.T.UI.ABILITY_SHEETS || [];
}

function writePlan(sheets) {
  const body = sheets.map((s) => '    ' + JSON.stringify(s).replace(/"/g, "'").replace(/,/g, ', ')).join(',\n');
  fs.writeFileSync(
    PLAN,
    `/* ============================================================================
   TUMULT — ABILITY ART (browser only; written by tools/ability-art.js plan)
   A painting of each trait face in action, nine to a sheet in assets/ability-art (3×3 tiles of 144 px),
   inlined as T.ART['ability-art/sheet-NNN']. Each list is one sheet, read left to right, top to bottom; a key is
   'cardId.P' or 'cardId.E'. A face with no painting, or a page built without the art, keeps its drawn verb.
   Edit by rerunning the tool, never by hand: a face keeps its cell once it has one.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  // prettier-ignore
  U.ABILITY_SHEETS = [
${body},
  ];
  const AT = {};
  U.ABILITY_SHEETS.forEach((keys, s) => keys.forEach((k, i) => (AT[k] = { sheet: s + 1, i })));
  /** Where face \`fk\` ('P' or 'E') of card \`id\` is painted, or null. */
  U.abilityArtOf = (id, fk) => AT[id + '.' + fk] || null;
  /** The CSS class of a face's sheet and the background placing its cell, or null when it is not painted here. */
  U.abilityArt = (id, fk) => {
    const a = AT[id + '.' + fk];
    const cls = a && U.artClass ? U.artClass('ability-art/sheet-' + String(a.sheet).padStart(3, '0')) : '';
    if (!cls) return null;
    return { cls, style: \`background-size:300% 300%;background-position:\${(a.i % 3) * 50}% \${Math.floor(a.i / 3) * 50}%\` };
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
`,
  );
}

function allFaces() {
  return Object.values(T.CARDS)
    .filter((c) => !c.gear && !c.pet)
    .sort((a, b) =>
      a.sp === b.sp ? (a.id < b.id ? -1 : 1) : T.SPECIES_ORDER.indexOf(a.sp) - T.SPECIES_ORDER.indexOf(b.sp),
    )
    .flatMap((c) => T.faceKeys(c.id).map((fk) => c.id + '.' + fk));
}

function plan() {
  const sheets = readPlan();
  const placed = new Set(sheets.flat());
  const want = allFaces();
  // new faces fill in most-played first: the pre-made pilots' kits, then the rest of their clades, then the rest
  const kit = new Set(T.PREBUILTS.flatMap((p) => p.cards));
  const kin = new Set(T.PREBUILTS.flatMap((p) => p.species));
  const rank = (k) => {
    const id = k.split('.')[0];
    return kit.has(id) ? 0 : kin.has(T.CARD[id].sp) ? 1 : 2;
  };
  const fresh = want
    .filter((k) => !placed.has(k))
    .map((k, i) => [rank(k), i, k])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map((x) => x[2]);
  let last = sheets[sheets.length - 1];
  for (const k of fresh) {
    if (!last || last.length >= PER) sheets.push((last = []));
    last.push(k);
  }
  writePlan(sheets);
  console.log(`${want.length} faces on ${sheets.length} sheets (${fresh.length} newly placed)`);
}

/** A face as a picture: the animal and what it is doing, without the numbers. */
function describe(key, short) {
  const [id, fk] = key.split('.');
  const c = T.CARD[id];
  const face = c[fk];
  const sp = T.SPECIES[c.sp];
  const whose = c.sp === 'human' ? "a pilot's" : `${/^[aeiou]/i.test(sp.name) ? 'an' : 'a'} ${sp.name.toLowerCase()}'s`;
  const txt = face
    .txt(1, fk === 'E' ? 1 : 0)
    .replace(/\+\d+/g, 'extra')
    .replace(/−\d+/g, 'less')
    .replace(/\b\d+\b/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/\s{2,}/g, ' ');
  const glow = fk === 'E' ? ` Ethereal: ${glowOf(face.elt || c.el)} light streams off it.` : ' Physical: no glow.';
  // no names in quotes: a lighter model letters quoted words onto the painting as captions
  // short: only the first clause of the face text, for sheets where the lighter model lettered the rules onto the art
  const act = short ? txt.split(/[:.;]/)[0].trim() : txt.replace(/\.$/, '');
  return `${whose} ${c.name.toLowerCase()}, in action: ${act}.${glow}`;
}

function glowOf(el) {
  return (
    {
      M: 'heavy violet-red gravitational',
      C: 'crackling electric yellow',
      S: 'rippling cyan spatial',
      T: 'swirling green time',
      O: 'shimmering white omni',
    }[el] || 'faint crystal'
  );
}

const STYLE =
  'A 3x3 grid of exactly nine equal square painted card illustrations in three even rows of three, separated by thin dark navy gutters. ' +
  'Each cell is an abstract, extreme close-up of one animal trait in action, the way a trading card shows a power: ' +
  'never a whole animal, never eyes, a mouth, a face or a head, never a recognisable earth creature; only the trait itself (stripes, claws, ' +
  'scales, feathers, tail, plates, skin, light) cropped tight, with motion blur, speed lines of dust, sparks or water and a hint of the ' +
  'alien planet Tumult behind (dark rock, glowing crystal veins). The creatures of Tumult are hybrids of three animals, so the ' +
  'trait should read as a part of something larger and stranger. Rich semi-realistic painting, dramatic rim light, deep shadow; ' +
  'the action sits in a wide band across the middle of the cell so it still reads when cropped to a short strip. ' +
  'Show only the trait, so close it fills the frame: its pattern, texture and the motion of the move. ' +
  'Absolutely no text, captions, titles, labels, letters, numbers, frames or UI anywhere in the image; do not number the cells. Every row holds exactly three cells, never four. Cells, left to right, top to bottom:';

function prompt(n, short) {
  const s = readPlan()[n - 1];
  if (!s) throw new Error(`no sheet ${n}`);
  const cells = s.map((k, i) => `(${i + 1}) ${describe(k, short)}`);
  // a short last sheet still asks for nine cells, so the grid stays 3×3; the spare cells are never shown
  for (let i = s.length; i < 9; i++) cells.push(`(${i + 1}) dark rock with faint glowing crystal veins, nothing else.`);
  return STYLE + '\n' + cells.join('\n');
}

/**
 * Where the gutters of a generated 3×3 sheet fall along one axis. Models don't always split the square in equal
 * thirds, so each line of pixels across the sheet is scored by how much of it is gutter-dark (a dark navy with
 * little colour), and the cells lie between the runs of gutter lines. Falls back to equal thirds.
 */
function bands(rgb, w, h, axis) {
  const len = axis === 'x' ? w : h,
    other = axis === 'x' ? h : w;
  const score = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    let dark = 0;
    for (let j = 0; j < other; j += 2) {
      const o = 3 * (axis === 'x' ? j * w + i : i * w + j);
      const r = rgb[o],
        g = rgb[o + 1],
        bl = rgb[o + 2];
      if (Math.max(r, g, bl) < 70 && bl >= r) dark++;
    }
    score[i] = dark / Math.ceil(other / 2);
  }
  const isG = (i) => score[i] > 0.85;
  // the outer border, if any
  let lo = 0,
    hi = len - 1;
  while (lo < len / 10 && isG(lo)) lo++;
  while (hi > len - len / 10 && isG(hi)) hi--;
  const cuts = [];
  for (const [f0, f1] of [
    [0.22, 0.45],
    [0.55, 0.78],
  ]) {
    let best = null;
    for (let i = Math.floor(len * f0); i < len * f1; i++) {
      if (!isG(i)) continue;
      let j = i;
      while (j + 1 < len && isG(j + 1)) j++;
      if (!best || j - i > best[1] - best[0]) best = [i, j];
      i = j;
    }
    cuts.push(best);
  }
  if (cuts.some((c) => !c)) {
    const t = (hi - lo) / 3;
    return [0, 1, 2].map((k) => [lo + k * t, lo + (k + 1) * t]);
  }
  return [
    [lo, cuts[0][0]],
    [cuts[0][1] + 1, cuts[1][0]],
    [cuts[1][1] + 1, hi + 1],
  ];
}

function cut(n, file) {
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'abil-'));
  const [w, h] = execFileSync('identify', ['-format', '%w %h', file + '[0]'], { encoding: 'utf8' })
    .split(' ')
    .map(Number);
  const rgb = execFileSync('convert', [file + '[0]', '-depth', '8', 'rgb:-'], { maxBuffer: 1 << 28 });
  const xs = bands(rgb, w, h, 'x'),
    ys = bands(rgb, w, h, 'y');
  const cells = [];
  for (let i = 0; i < 9; i++) {
    const [x0, x1] = xs[i % 3],
      [y0, y1] = ys[Math.floor(i / 3)];
    // a hair inside the cell, so no gutter or soft edge shows
    const ix = (x1 - x0) * 0.02,
      iy = (y1 - y0) * 0.02;
    const out = path.join(tmp, `c${i}.png`);
    execFileSync('convert', [
      file + '[0]',
      '-crop',
      `${Math.round(x1 - x0 - 2 * ix)}x${Math.round(y1 - y0 - 2 * iy)}+${Math.round(x0 + ix)}+${Math.round(y0 + iy)}`,
      '+repage',
      '-resize',
      `${CELL}x${CELL}^`,
      '-gravity',
      'center',
      '-extent',
      `${CELL}x${CELL}`,
      out,
    ]);
    cells.push(out);
  }
  const dest = path.join(OUT, `sheet-${String(n).padStart(3, '0')}.webp`);
  execFileSync('montage', [
    ...cells,
    '-tile',
    '3x3',
    '-geometry',
    `${CELL}x${CELL}+0+0`,
    '-background',
    '#0d1424',
    path.join(tmp, 'm.png'),
  ]);
  execFileSync('convert', [path.join(tmp, 'm.png'), '-quality', '66', '-define', 'webp:method=6', dest]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(
    `${dest} (${fs.statSync(dest).size} bytes) cols ${xs.map((c) => c.map(Math.round).join('-')).join(' ')} rows ${ys.map((c) => c.map(Math.round).join('-')).join(' ')}`,
  );
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'plan') plan();
else if (cmd === 'prompt') console.log(prompt(Number(a), b === 'short'));
else if (cmd === 'keys')
  console.log(
    STYLE +
      '\n' +
      process.argv
        .slice(3)
        .map((k, i) => `(${i + 1}) ${describe(k)}`)
        .join('\n'),
  );
else if (cmd === 'cut') cut(Number(a), b);
else if (cmd === 'missing') {
  const have = new Set(fs.existsSync(OUT) ? fs.readdirSync(OUT) : []);
  console.log(
    readPlan()
      .map((_, i) => i + 1)
      .filter((n) => !have.has(`sheet-${String(n).padStart(3, '0')}.webp`))
      .join(' '),
  );
} else console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
