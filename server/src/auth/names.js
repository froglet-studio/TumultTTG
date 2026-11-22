/* ============================================================================
   DISPLAY NAMES AND AVATARS — what a player may be called and shown as (docs/reference/ACCOUNTS.md).

   A display name, for an account:
     - 3 to 20 characters once cleaned (one printable line, spaces squeezed);
     - letters (any script), digits, spaces and . _ - ' only, with at least one letter;
     - not one of Froglet's own words (Froglet, Tumult, Admin…), and not "Guest" followed by digits;
     - nothing from the word filter, read through common look-alikes (0 for o, 4 for a, $ for s…):
       strong words anywhere in the name, short ones only as a whole word, so "Cassidy" and "Grape" pass;
     - one account's alone: two accounts never share a name, comparing without case or spaces (nameKey).
   Guests keep whatever cleanName allows ("Guest 1234"); they are never filtered or reserved.

   An avatar is '' (automatic: the first pilot on the player's card, else initials), 'initials',
   'p:<art key>' (a pilot painting from the game), or 'google' / 'discord' (the picture that sign-in gave,
   served through this Worker so a page only ever talks to Froglet).
   ========================================================================== */

export const NAME_MIN = 3;
export const NAME_MAX = 20;
export const RENAME_GAP_MS = 24 * 3600 * 1000;

// The word lists, ROT13'd so this file does not read as a list of slurs. Decode with any ROT13 tool.
const rot13 = (s) => s.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));
const STRONG =
  'shpx fuvg phag avttre avttn snttbg sntbg ergneq juber fyhg ovgpu onfgneq qvpxurnq pbpxfhpxre zbgureshpxre jnaxre gjng encvfg uvgyre genaal chffl cravf intvan cbea wvmm qvyqb obbo nffubyr nefrubyr xvyylbhefrys urvyuvgyre fvrturvy xxx obyybpxf'
    .split(' ')
    .map(rot13);
const WHOLE = new Set(
  'nff nefr snt qvpx pbpx phz gvg gvgf frk ubr avt pbba jbc wnc fcnm ubzb nany encr fcvp cnxv anmv xvxr puvax tbbx qlxr crqb cnrqb xlf cevpx'
    .split(' ')
    .map(rot13),
);
const RESERVED = new Set([
  'froglet',
  'tumult',
  'admin',
  'administrator',
  'moderator',
  'mod',
  'staff',
  'official',
  'system',
  'support',
  'server',
  'everyone',
  'here',
  'anthropic',
  'claude',
]);

const LOOK = {
  0: 'o',
  1: 'i',
  2: 'z',
  3: 'e',
  4: 'a',
  5: 's',
  6: 'g',
  7: 't',
  8: 'b',
  9: 'g',
  '@': 'a',
  $: 's',
  '!': 'i',
  '|': 'i',
  '+': 't',
  '€': 'e',
};
/** Lower case, accents off, look-alikes read as letters. */
function fold(s) {
  return String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[0-9@$!|+€]/g, (c) => LOOK[c] || c);
}
const squash = (s) => s.replace(/[^a-z]+/g, '').replace(/(.)\1+/g, '$1');

/** True when the name has nothing from the word filter. */
export function clean(name) {
  const f = fold(name);
  const all = f.replace(/[^a-z]+/g, '');
  const once = squash(f);
  if (STRONG.some((w) => all.includes(w) || (squash(w).length > 3 && once.includes(squash(w))))) return false;
  const words = f.split(/[^a-z]+/).filter(Boolean);
  return !words.some((w) => WHOLE.has(w) || WHOLE.has(squash(w)) || WHOLE.has(w.replace(/s$/, '')));
}

/** The name folded for "is it taken": lower case, no spaces. Matches the migration's backfill. */
export const nameKey = (name) => String(name).toLowerCase().replace(/ /g, '');

/** Why an account may not use this (already cleaned) name, or '' when it may. */
export function nameProblem(name) {
  const n = String(name || '');
  if (n.length < NAME_MIN) return `A name needs at least ${NAME_MIN} characters.`;
  if (n.length > NAME_MAX) return `A name has at most ${NAME_MAX} characters.`;
  if (!/^[\p{L}\p{M}\p{N} ._'-]+$/u.test(n)) return "Use letters, numbers, spaces and . _ - ' only.";
  if (!/\p{L}/u.test(n)) return 'A name needs at least one letter.';
  const k = squash(fold(n));
  if (
    /^guest\d*$/i.test(n.replace(/ /g, '')) ||
    RESERVED.has(k) ||
    RESERVED.has(n.toLowerCase().replace(/[^a-z]/g, ''))
  )
    return 'That name is kept for Tumult itself. Pick another.';
  if (!clean(n)) return "That name isn't fit for the table. Pick another.";
  return '';
}

/** A pilot painting key, as the game names its art. */
export const ART_KEY = /^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/;
export const PICTURE_FROM = ['google', 'discord'];

/** The avatar to keep for a choice, or null when the choice is not one we know. */
export function cleanAvatar(v) {
  const s = String(v == null ? '' : v);
  if (s === '' || s === 'initials') return s;
  if (PICTURE_FROM.includes(s)) return s;
  const m = /^p:(.+)$/.exec(s);
  return m && ART_KEY.test(m[1]) ? s : null;
}

/** A picture address Google or Discord gave, kept only when it is on their image hosts over https. */
export function pictureUrl(v) {
  let u;
  try {
    u = new URL(String(v || ''));
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
  const h = u.hostname;
  if (h === 'cdn.discordapp.com' || h.endsWith('.googleusercontent.com')) return u.toString();
  return null;
}
