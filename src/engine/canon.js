/* ============================================================================
   TUMULT — CANON RECORDS
   Playing the web game helps write the world: it asks for flavour and lets a
   player correct what it shows. Each answer is a canon record, plain data:

     { id, subject, kind, claim, shown, where, prompt, context, by, at,
       status: 'proposed', public: false }

   A record starts proposed. Only the lore lead makes it canon, and marks it
   public or private: only public canon is ever copied into this repository
   (Garrett, 2026-11-13). Records are kept on this device (localStorage
   'tumult_v2_canon') apart from any run, since they are about the world and
   outlive the run they came from; T.canonLines exports them as JSON lines.
   Nothing here touches rules, dice or a mission.
   ========================================================================== */
(function (T) {
  const KEY = 'tumult_v2_canon';
  const MAX_RECORDS = 500;
  const MAX_CLAIM = 1000;
  const MAX_SHOWN = 1200;

  /** True when `s` names something a record can be about ('world', or kind:id). */
  T.isCanonSubject = function (s) {
    if (s === 'world') return true;
    const m = /^([a-z]+):([A-Za-z0-9_-]+)$/.exec(String(s || ''));
    return !!m && m[1] !== 'world' && T.CANON_SUBJECT_KINDS.includes(m[1]);
  };

  /** A short stable hash of a string, base 36 (FNV-1a), for record ids. */
  function hash(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36);
  }
  const text = (v, max) =>
    String(v == null ? '' : v)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);

  /**
   * Make a record from what a player said. `at` is an ISO time from the caller (the engine keeps no clock).
   * Returns { ok: true, rec } or { ok: false, why }.
   */
  T.canonRecord = function (o) {
    o = o || {};
    if (!T.isCanonSubject(o.subject)) return { ok: false, why: 'Unknown subject.' };
    if (!T.CANON_KINDS[o.kind]) return { ok: false, why: 'Unknown kind of note.' };
    const claim = text(o.claim, MAX_CLAIM);
    if (!claim && o.kind !== 'love') return { ok: false, why: 'Write something first.' };
    const at = text(o.at, 40);
    if (!at) return { ok: false, why: 'A record needs a time.' };
    const context = {};
    Object.entries(o.context || {}).forEach(([k, v]) => {
      if (v != null && v !== '') context[k] = typeof v === 'number' ? v : text(v, 80);
    });
    const rec = {
      id: '',
      subject: o.subject,
      kind: o.kind,
      claim,
      shown: text(o.shown, MAX_SHOWN),
      where: text(o.where, 80),
      prompt: text(o.prompt, 40),
      context,
      by: text(o.by, 40),
      at,
      status: 'proposed',
      public: false,
    };
    rec.id = 'c_' + hash([rec.subject, rec.kind, rec.claim, rec.shown, rec.where, rec.at].join('|'));
    return { ok: true, rec };
  };

  /** The records as JSON lines, one per line, oldest first: the shape the storyteller pack reads. */
  T.canonLines = function (records) {
    return (records || []).map((r) => JSON.stringify(r)).join('\n');
  };

  /** Read every record kept on this device (none when storage is unavailable). */
  T.loadCanon = function () {
    try {
      const list = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  };
  T.saveCanon = function (list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX_RECORDS)));
      return true;
    } catch (e) {
      return false;
    }
  };
  /** Keep one more record; the oldest go once there are more than MAX_RECORDS. False if it could not be kept. */
  T.addCanon = function (rec) {
    const list = T.loadCanon().filter((r) => r.id !== rec.id);
    list.push(rec);
    return T.saveCanon(list);
  };
  T.clearCanon = function () {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
  };

  const fill = (str, w) => String(str).replace(/\{(name|a|b|other|place|hp)\}/g, (m, k) => (w[k] != null ? w[k] : m));

  /**
   * The question to ask about a subject now, or null. `subject` is 'place:<page>' or 'pilot:<callsign>';
   * `answered` is the prompt ids this device has already answered (they are not asked again while others
   * remain); `turn` rotates the choice; for a pilot, `who` is { name, a, b } (their two clades) and the
   * pilot's own question, when there is one, comes before the questions every pilot shares.
   * Returns { id, subject, detail, ask, angles } with the pilot's words filled in.
   * `noClades` leaves out the shared questions that name the pilot's clades: a hero wearing a stand-in
   * painting has other clades than its pilot, so a question about the pilot's eagle reads as a mistake.
   */
  T.canonPrompt = function (subject, opts = {}) {
    const answered = new Set(opts.answered || []);
    const turn = opts.turn | 0;
    const pool = T.CANON_PROMPTS.filter((p) => p.subject === subject);
    let pick = pool.filter((p) => !answered.has(p.id));
    if (subject.startsWith('pilot:')) {
      const namesClade = (p) => /\{[ab]\}/.test([p.detail, p.ask].concat(p.angles).join(' '));
      const shared = T.CANON_PROMPTS.filter((p) => p.subject === 'pilot' && !(opts.noClades && namesClade(p)));
      if (!pick.length) pick = shared.filter((p) => !answered.has(p.id + ':' + subject));
      if (!pick.length) pick = pool.concat(shared);
    } else if (!pick.length) pick = pool;
    if (!pick.length) return null;
    const p = pick[((turn % pick.length) + pick.length) % pick.length];
    const w = opts.who || {};
    // a shared pilot question is answered once per pilot, so its id names the pilot
    const id = p.subject === 'pilot' ? p.id + ':' + subject : p.id;
    return {
      id,
      subject,
      detail: fill(p.detail, w),
      ask: fill(p.ask, w),
      angles: p.angles.map((x) => fill(x, w)),
    };
  };

  /** Vitality left at the end of a won mission that counts as a close call. */
  const CLUTCH = 3;
  /**
   * What happened to each hero in a finished mission that is worth a question, read from the mission alone
   * (its effects list and the heroes' state): [{ kind, hero, hp }], most dramatic first, at most one per hero.
   * fell: down at the end. rallied: went down and an ally got them up. spared: a seeded return or second
   * wind kept them up. clutch: a win on CLUTCH vitality or less. untouched: a win without a hit taken.
   */
  T.canonMoments = function (m) {
    const order = T.CANON_MOMENTS.map((x) => x.kind);
    const out = [];
    (m.heroes || []).forEach((h, i) => {
      let down = false;
      let rallied = false;
      let spared = false;
      let hit = false;
      for (const f of m.fx || []) {
        if (f.ent !== h.uid) continue;
        if (f.t === 'down') down = true;
        else if (f.t === 'revive') {
          if (down) rallied = true;
          else spared = true;
          down = false;
        } else if (f.t === 'dmg') hit = true;
      }
      let kind = null;
      if (h.downed) kind = 'fell';
      else if (rallied) kind = 'rallied';
      else if (spared) kind = 'spared';
      else if (m.won && h.hp <= CLUTCH) kind = 'clutch';
      else if (m.won && !hit) kind = 'untouched';
      if (kind) out.push({ kind, hero: i, hp: Math.max(0, h.hp) });
    });
    return out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  };
  /**
   * The question for one moment about `subject` ('pilot:<callsign>'), with `who` = { name, other, place, hp, a }
   * filled in. Its id names the kind and the pilot; a moment is asked each time it happens.
   */
  T.canonMomentPrompt = function (subject, moment, who) {
    const p = T.CANON_MOMENTS.find((x) => x.kind === moment.kind);
    if (!p || !T.isCanonSubject(subject)) return null;
    const w = Object.assign({ hp: moment.hp }, who || {});
    return {
      id: 'moment.' + p.kind + ':' + subject,
      subject,
      detail: fill(p.detail, w),
      ask: fill(p.ask, w),
      angles: p.angles.map((x) => fill(x, w)),
    };
  };
  T.CANON_MAX_RECORDS = MAX_RECORDS;
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
