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

  /** Three hooks to offer for a pilot: a rotation of the pool, so each pilot and each run see a different three. */
  T.canonHooks = function (pilotKey, turn) {
    const pool = T.CANON_HOOKS;
    const start = (parseInt(hash(String(pilotKey)), 36) + (turn | 0)) % pool.length;
    return [0, 1, 2].map((i) => pool[(start + i * 3) % pool.length]);
  };
  T.CANON_MAX_RECORDS = MAX_RECORDS;
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
