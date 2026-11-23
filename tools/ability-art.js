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
    .sort((a, b) => (a.sp === b.sp ? (a.id < b.id ? -1 : 1) : T.SPECIES_ORDER.indexOf(a.sp) - T.SPECIES_ORDER.indexOf(b.sp)))
    .flatMap((c) => T.faceKeys(c.id).map((fk) => c.id + '.' + fk));
}

function plan() {
  const sheets = readPlan();
  const placed = new Set(sheets.flat());
  const want = allFaces();
  const fresh = want.filter((k) => !placed.has(k));
  let last = sheets[sheets.length - 1];
  for (const k of fresh) {
    if (!last || last.length >= PER) sheets.push((last = []));
    last.push(k);
  }
  writePlan(sheets);
  console.log(`${want.length} faces on ${sheets.length} sheets (${fresh.length} newly placed)`);
}

/** A face as a picture: the animal and what it is doing, without the numbers. */
function describe(key) {
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
  const glow =
    fk === 'E'
      ? ` Ethereal: the trait is charged with ${glowOf(face.elt || c.el)} light that streams off it.`
      : ' Physical: no glow, raw texture, speed and force.';
  return `the trait "${c.name}" from ${whose} body, doing "${face.n}" (${txt}). Show only the trait itself, so close it fills the frame: its pattern, texture and the motion of the move.${glow}`;
}

function glowOf(el) {
  return { M: 'heavy violet-red gravitational', C: 'crackling electric yellow', S: 'rippling cyan spatial', T: 'swirling green time', O: 'shimmering white omni' }[el] || 'faint crystal';
}

const STYLE =
  'A 3x3 grid of nine square painted card illustrations, separated by thin dark navy gutters. ' +
  'Each cell is an abstract, extreme close-up of one animal trait in action, the way a trading card shows a power: ' +
  'never a whole animal, never eyes, a mouth, a face or a head, never a recognisable earth creature; only the trait itself (stripes, claws, ' +
  'scales, feathers, tail, plates, skin, light) cropped tight, with motion blur, speed lines of dust, sparks or water and a hint of the ' +
  'alien planet Tumult behind (dark rock, glowing crystal veins). The creatures of Tumult are hybrids of three animals, so the ' +
  'trait should read as a part of something larger and stranger. Rich semi-realistic painting, dramatic rim light, deep shadow; ' +
  'the action sits in a wide band across the middle of the cell so it still reads when cropped to a short strip. ' +
  'No text, letters, numbers, frames or UI anywhere. Cells, left to right, top to bottom:';

function prompt(n) {
  const s = readPlan()[n - 1];
  if (!s) throw new Error(`no sheet ${n}`);
  return STYLE + '\n' + s.map((k, i) => `(${i + 1}) ${describe(k)}`).join('\n');
}

function cut(n, file) {
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'abil-'));
  const [w, h] = execFileSync('identify', ['-format', '%w %h', file + '[0]'], { encoding: 'utf8' }).split(' ').map(Number);
  const cw = w / 3,
    ch = h / 3,
    trim = 0.03;
  const cells = [];
  for (let i = 0; i < 9; i++) {
    const x = (i % 3) * cw + cw * trim,
      y = Math.floor(i / 3) * ch + ch * trim;
    const out = path.join(tmp, `c${i}.png`);
    execFileSync('convert', [
      file + '[0]',
      '-crop',
      `${Math.round(cw * (1 - 2 * trim))}x${Math.round(ch * (1 - 2 * trim))}+${Math.round(x)}+${Math.round(y)}`,
      '+repage',
      '-resize',
      `${CELL}x${CELL}!`,
      out,
    ]);
    cells.push(out);
  }
  const dest = path.join(OUT, `sheet-${String(n).padStart(3, '0')}.webp`);
  execFileSync('montage', [...cells, '-tile', '3x3', '-geometry', `${CELL}x${CELL}+0+0`, '-background', '#0d1424', path.join(tmp, 'm.png')]);
  execFileSync('convert', [path.join(tmp, 'm.png'), '-quality', '66', '-define', 'webp:method=6', dest]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${dest} (${fs.statSync(dest).size} bytes)`);
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'plan') plan();
else if (cmd === 'prompt') console.log(prompt(Number(a)));
else if (cmd === 'keys')
  console.log(STYLE + '\n' + process.argv.slice(3).map((k, i) => `(${i + 1}) ${describe(k)}`).join('\n'));
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
