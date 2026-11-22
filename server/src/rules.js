/* ============================================================================
   TUMULT SERVER — WHO MAY READ AND WRITE WHAT IN THE SHARED STORE.
   The same layout the online screens used on claude.ai (src/ui/heroes-net.js, canon-net.js), now
   enforced here, plus cloud saves:

     heroes/<user>                    { list: [recipe…], at }   anyone reads; the player writes their own
     canon/<user>                     { at, last }              the player and the reviewers read
     canon/<user>/notes/<record id>   a canon record            the player writes their own
     canonReview/<record id>          { status, public, … }     reviewers read; only a lore lead writes
     saves/<user>                     { run, meta, at }         only the player, guests too
     lobby/<CODE>                     { code, host, names, … }  the list of games being played (2.80): anyone
                                                                reads; the host's account writes its own
     profile/<user>                   { name, pilots, runs, … } a player's card in the Lobby: anyone reads; the
                                                                player's account writes its own
     friends/<user>                   { list: [user id…] }      only the player
     inbox/<to>/from/<from>           { kind, code, name, at }  one note from one player to another: a friend
                                                                request or its answer, an ask to join a table or
                                                                its answer, an invite. The sender writes it; the
                                                                two of them read it; either one deletes it

   Writing anything others can read (pilots, canon notes) needs an account; a guest may keep a save.
   Every document others will read is rebuilt by the game's own rules before it is kept: a pilot by
   T.validMade, a canon note by T.canonRecord. Live games are not here: see room.js.
   ========================================================================== */
import { T } from './engine.gen.js';

export class Refusal extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}
export const refuse = (status, code, message) => {
  throw new Refusal(status, code, message);
};

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const list = (s) =>
  String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

/** What this person may do beyond their own documents. */
export function roles(env, user) {
  const id = user && user.userId;
  const lead = !!id && !user.guest && list(env.CANON_LEADS).includes(id);
  const reviewer = lead || (!!id && !user.guest && list(env.CANON_REVIEWERS).includes(id));
  return { lead, reviewer };
}

/** Signed in with an account (not a guest): what sharing with other players needs. */
export const hasAccount = (user) => !!(user && user.userId && !user.guest);

const MAX_BYTES = { heroes: 96 * 1024, canon: 16 * 1024, canonReview: 8 * 1024, saves: 768 * 1024 };
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

function validHeroes(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.list))
    refuse(400, 'invalid-argument', 'a list of pilots');
  const seen = new Set();
  const kept = [];
  for (const r of data.list.slice(0, T.MADE_MAX)) {
    const rec = T.validMade(r);
    if (rec && !seen.has(rec.id)) (seen.add(rec.id), kept.push(rec));
  }
  return { list: kept, at: str(data.at, 30), who: str(data.who, 60) };
}

function validNote(data, id) {
  const made = T.canonRecord(data || {});
  if (!made.ok) refuse(400, 'invalid-argument', made.why);
  if (made.rec.id !== id) refuse(400, 'invalid-argument', 'the record id does not match its words');
  return made.rec; // always 'proposed' and private: only a lead decides otherwise, in canonReview
}

function validReview(data) {
  const d = data || {};
  if (!['proposed', 'canon', 'rejected'].includes(d.status)) refuse(400, 'invalid-argument', 'unknown status');
  return {
    status: d.status,
    public: !!d.public,
    claim: str(d.claim, 1000),
    note: str(d.note, 1000),
    at: str(d.at, 40),
    from: str(d.from, 64),
  };
}

const LISTING_DROP_MS = 2 * 24 * 3600 * 1000;
function validListing(data, code, by) {
  const d = data || {};
  if (!/^[A-Z]{4}$/.test(code) || (d.code && d.code !== code))
    refuse(400, 'invalid-argument', 'a listing is filed under its code');
  const names = (a, n, len) => (Array.isArray(a) ? a.slice(0, n).map((x) => str(String(x == null ? '' : x), len)) : []);
  return {
    code,
    host: str(d.host, 24),
    names: names(d.names, 5, 24),
    pilots: names(d.pilots, 10, 30),
    phase: str(d.phase, 16),
    stage: str(d.stage, 80),
    open: !!d.open,
    over: !!d.over,
    at: Date.now(), // the server's clock, so a listing cannot pretend to be fresh or stale
    v: str(d.v, 16),
    by,
  };
}

const ART_KEY = /^[A-Za-z0-9_-]{1,40}$/; // the game's painting keys are upper case (BANDIT)
const count = (v) => Math.max(0, Math.min(1e6, Math.floor(+v) || 0));
function validProfile(data) {
  const d = data || {};
  const pilots = Array.isArray(d.pilots)
    ? d.pilots
        .slice(0, 6)
        .map((p) => ({ name: str(p && p.name, 30), art: ART_KEY.test(p && p.art) ? p.art : '' }))
        .filter((p) => p.name)
    : [];
  const av = String(d.avatar || '');
  return {
    name: str(d.name, 24),
    avatar: ['google', 'discord', 'initials'].includes(av) || /^p:[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/.test(av) ? av : '',
    pilots,
    runs: count(d.runs),
    wins: count(d.wins),
    canon: count(d.canon),
    best: count(d.best),
    at: Date.now(),
  };
}
function validFriends(data) {
  const d = data || {};
  const ids = Array.isArray(d.list) ? d.list.filter((x) => typeof x === 'string' && ID.test(x)) : [];
  return { list: [...new Set(ids)].slice(0, 300), at: Date.now() };
}
const NOTE_KINDS = ['friend', 'friend-ok', 'join', 'join-ok', 'join-no', 'invite'];
function validInboxNote(data, from) {
  const d = data || {};
  if (!NOTE_KINDS.includes(d.kind)) refuse(400, 'invalid-argument', 'unknown kind of note');
  const code = /^[A-Z]{4}$/.test(d.code) ? d.code : '';
  if (['join-ok', 'invite'].includes(d.kind) && !code) refuse(400, 'invalid-argument', 'this note needs a game code');
  return { kind: d.kind, code, name: str(d.name, 24), from, at: Date.now() };
}

function validSave(data) {
  const d = data || {};
  let run = null;
  if (d.run != null) {
    if (typeof d.run !== 'string') refuse(400, 'invalid-argument', 'a save is text');
    try {
      T.deserializeRun(d.run); // a save the game cannot load is not kept
    } catch (e) {
      refuse(400, 'invalid-argument', 'that save does not load: ' + e.message);
    }
    run = d.run;
  }
  const meta = d.meta && typeof d.meta === 'object' && !Array.isArray(d.meta) ? d.meta : null;
  return { run, meta, at: Number.isFinite(+d.at) ? +d.at : Date.now() };
}

/**
 * The rule for one path, or a refusal for a path the store does not keep. `kind` is 'doc' or 'list'.
 * Returns { read, write, owner, validate(data) → data to keep }.
 */
export function ruleFor(path, kind, user, env) {
  const p = String(path || '').split('/');
  if (!p.every((s) => ID.test(s))) refuse(400, 'invalid-argument', 'not a store path');
  const me = user && user.userId;
  const { lead, reviewer } = roles(env, user);
  const own = (uid) => !!me && me === uid;
  const top = p[0];
  const deny = { read: false, write: false };

  if (kind === 'list') {
    if (p.length === 1 && (top === 'heroes' || top === 'lobby')) return { read: true };
    if (p.length === 1 && (top === 'canon' || top === 'canonReview')) return { read: reviewer };
    if (p.length === 3 && top === 'canon' && p[2] === 'notes') return { read: own(p[1]) || reviewer };
    if (p.length === 3 && top === 'inbox' && p[2] === 'from') return { read: own(p[1]) && hasAccount(user) };
    refuse(404, 'not-found', 'no such collection');
  }
  const max = MAX_BYTES[top];
  if (top === 'heroes' && p.length === 2)
    return { read: true, write: own(p[1]) && hasAccount(user), owner: p[1], max, validate: validHeroes };
  if (top === 'canon' && p.length === 2)
    return {
      read: own(p[1]) || reviewer,
      write: own(p[1]) && hasAccount(user),
      owner: p[1],
      max,
      validate: (d) => ({ at: str(d && d.at, 40), last: str(d && d.last, 64) }),
    };
  if (top === 'canon' && p.length === 4 && p[2] === 'notes')
    return {
      read: own(p[1]) || reviewer,
      write: own(p[1]) && hasAccount(user),
      owner: p[1],
      max,
      validate: (d) => validNote(d, p[3]),
    };
  if (top === 'canonReview' && p.length === 2)
    return { read: reviewer, write: lead, owner: null, max, validate: validReview };
  // the list of games being played (2.80): a host's account writes its own game's entry; anyone may
  // tidy away one that has been quiet for two days, as the screens do
  if (top === 'lobby' && p.length === 2)
    return {
      read: true,
      write: hasAccount(user),
      writeIf: (old) => !old || old.by === me || Date.now() - (+old.at || 0) > LISTING_DROP_MS,
      deleteIf: (old) => !old || old.by === me || Date.now() - (+old.at || 0) > LISTING_DROP_MS,
      owner: me,
      max: 4 * 1024,
      validate: (d) => validListing(d, p[1], me),
    };
  // the Lobby's social side: a player's card, their friends, and the notes players send each other
  if (top === 'profile' && p.length === 2)
    return { read: true, write: own(p[1]) && hasAccount(user), owner: p[1], max: 4 * 1024, validate: validProfile };
  if (top === 'friends' && p.length === 2)
    return {
      read: own(p[1]),
      write: own(p[1]) && hasAccount(user),
      owner: p[1],
      max: 16 * 1024,
      validate: validFriends,
    };
  if (top === 'inbox' && p.length === 4 && p[2] === 'from')
    return {
      read: (own(p[1]) || own(p[3])) && hasAccount(user),
      write: own(p[3]) && hasAccount(user) && p[1] !== p[3],
      deleteIf: () => (own(p[1]) || own(p[3])) && hasAccount(user),
      owner: p[3],
      max: 1024,
      validate: (d) => validInboxNote(d, p[3]),
    };
  if (top === 'saves' && p.length === 2)
    return { read: own(p[1]), write: own(p[1]), owner: p[1], max, validate: validSave };
  return deny;
}
