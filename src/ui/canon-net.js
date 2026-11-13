/* ============================================================================
   TUMULT — THE CANON INBOX (test page only)
   On the test page, every canon note a player writes (src/ui/canon.js) is
   also sent to the page's private store, and the lore lead reviews them
   there: canon, rejected or still proposed, public or private, with the
   wording edited if need be. Only records marked canon AND public are ever
   copied into the public repository (Garrett, 2026-11-13).

   Store layout (rules declared when the test page is published; see
   docs/reference/CANON.md):
     canon/<viewer id>                 { at, last }      one per contributor, so the inbox can list them
     canon/<viewer id>/notes/<rec id>  a canon record, as T.canonRecord made it
     canonReview/<rec id>              { status, public, claim, note, at, from }   the lore lead's decision
   A contributor writes and reads only their own notes; Editors and the owner
   read them all; only the owner (the lore lead) writes a decision.
   With no such store (TUMULT.html, or a saved copy of the page) this file
   does nothing, and notes stay on the device as before.
   ========================================================================== */
(function (T) {
  const U = T.UI;
  const esc = U.esc;
  const SENT = 'tumult_v2_canon_sent';

  const C = (U.canonNet = {
    ready: false, // the store and this viewer's id are known
    reviewer: false, // may read the whole inbox (Editor or owner)
    lead: false, // may decide (the owner)
    items: null, // [{ rec, from }] once loaded
    reviews: {},
    names: {},
    filter: 'proposed',
    error: '',
  });
  let db = null;
  let user = null;
  let uid = null;

  const loadSent = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem(SENT) || '[]'));
    } catch (e) {
      return new Set();
    }
  };
  const saveSent = (s) => {
    try {
      localStorage.setItem(SENT, JSON.stringify([...s].slice(-T.CANON_MAX_RECORDS)));
    } catch (e) {}
  };

  /* ───────────── sending ───────────── */
  let chain = Promise.resolve();
  /** Send one record; writes go one at a time. Resolves true once the store has it. */
  function send(rec) {
    if (!C.ready) return Promise.resolve(false);
    chain = chain.then(async () => {
      try {
        await db.doc(`canon/${uid}/notes/${rec.id}`).set(Object.assign({}, rec));
        await db.doc(`canon/${uid}`).set({ at: rec.at, last: rec.id });
        const s = loadSent();
        s.add(rec.id);
        saveSent(s);
        return true;
      } catch (e) {
        return false;
      }
    });
    return chain;
  }
  /** Notes written before the store answered, or on a visit when it did not, go now. */
  function sendUnsent() {
    const sent = loadSent();
    T.loadCanon()
      .filter((r) => !sent.has(r.id))
      .forEach(send);
  }
  U.canonSent = (rec) => send(rec);
  /** How many notes on this device have reached the inbox. */
  C.sentCount = () => {
    const sent = loadSent();
    return T.loadCanon().filter((r) => sent.has(r.id)).length;
  };

  // light up once the page's host answers; a saved copy of the page never will
  if (window.claude && typeof window.claude.use === 'function') {
    Promise.all([window.claude.use('db'), window.claude.use('user')])
      .then(async ([d, u]) => {
        if (!d || !u) return;
        const id = await u.id();
        if (!id) return;
        db = d;
        user = u;
        uid = id;
        C.ready = true;
        C.reviewer = !!(await u.canEdit());
        C.lead = !!(await u.isOwner());
        sendUnsent();
        if (U.screen === 'title' && !U.modal) U.render();
      })
      .catch(() => {});
  }

  /* ───────────── reviewing ───────────── */
  async function loadInbox() {
    C.error = '';
    try {
      const people = await db.collection('canon').get();
      const items = [];
      for (const p of people.docs) {
        const notes = await db.collection(`canon/${p.id}/notes`).get();
        notes.docs.forEach((n) => items.push({ rec: n.data(), from: p.id }));
      }
      const reviews = {};
      (await db.collection('canonReview').get()).docs.forEach((r) => (reviews[r.id] = r.data()));
      items.sort((a, b) => String(b.rec.at).localeCompare(String(a.rec.at)));
      C.items = items;
      C.reviews = reviews;
      const ids = [...new Set(items.map((i) => i.from))];
      const ps = ids.length ? await user.profiles(ids) : {};
      ids.forEach((i) => (C.names[i] = (ps[i] && ps[i].name) || 'Someone'));
    } catch (e) {
      C.error = 'The inbox could not be read (' + ((e && e.code) || 'unavailable') + ').';
      C.items = C.items || [];
    }
  }
  const statusOf = (it) => (C.reviews[it.rec.id] && C.reviews[it.rec.id].status) || 'proposed';
  /** A record with its decision applied: the shape the storyteller pack and the repo copy read. */
  C.decided = function (it) {
    const r = C.reviews[it.rec.id] || {};
    return Object.assign({}, it.rec, {
      status: r.status || 'proposed',
      public: !!r.public,
      claim: r.claim || it.rec.claim,
      decided: r.at ? { at: r.at, note: r.note || '' } : null,
    });
  };

  function itemHTML(it) {
    const r = it.rec;
    const rv = C.reviews[r.id] || {};
    const st = statusOf(it);
    const kind = (T.CANON_KINDS[r.kind] || {}).label || r.kind;
    const ctx = Object.entries(r.context || {})
      .map(([k, v]) => `${k} ${v}`)
      .join(' · ');
    const claim = rv.claim || r.claim;
    const lead = C.lead;
    const btn = (s, label) =>
      `<button class="sm ${st === s ? 'primary' : 'ghost'}" data-act="canonDecide" data-arg="${esc(r.id)}|${s}" ${lead ? '' : 'disabled'}>${label}</button>`;
    return `<div class="canon-item st-${st}">
      <div class="row"><span class="mono small">${esc(r.subject)}</span><span class="pill">${esc(kind)}</span><span class="small dim">${esc(C.names[it.from] || 'Someone')} · ${esc(String(r.at).slice(0, 10))}</span><span class="right pill">${esc(st)}${rv.public ? ' · public' : ''}</span></div>
      ${r.shown ? `<blockquote class="canon-quote small">${esc(r.shown.length > 280 ? r.shown.slice(0, 280) + '…' : r.shown)}</blockquote>` : ''}
      ${lead ? `<textarea class="canon-text" id="cv-${esc(r.id)}" rows="2">${esc(claim)}</textarea>` : `<div>${esc(claim || '♥')}</div>`}
      <div class="mute small">${esc(ctx)}${r.where ? ' · ' + esc(r.where) : ''}</div>
      <div class="row">${btn('canon', 'Canon')}${btn('rejected', 'Reject')}${btn('proposed', 'Keep proposed')}
        <label class="small right"><input type="checkbox" data-act="canonPublic" data-arg="${esc(r.id)}" ${rv.public ? 'checked' : ''} ${lead ? '' : 'disabled'}> public (may be copied into the repo)</label></div>
    </div>`;
  }
  function inboxHTML() {
    if (!C.items) return `<h3>Canon inbox</h3><p class="dim">Reading the inbox…</p>`;
    const count = (s) => C.items.filter((it) => statusOf(it) === s).length;
    const shown = C.items.filter((it) => C.filter === 'all' || statusOf(it) === C.filter).slice(0, 100);
    const tabs = [
      ['proposed', 'Proposed'],
      ['canon', 'Canon'],
      ['rejected', 'Rejected'],
      ['all', 'All'],
    ]
      .map(
        ([f, l]) =>
          `<button class="sm ${C.filter === f ? 'primary' : 'ghost'}" data-act="canonFilter" data-arg="${f}">${l} ${f === 'all' ? C.items.length : count(f)}</button>`,
      )
      .join('');
    return `<div class="row"><h3>Canon inbox</h3><span class="right small dim">${C.lead ? 'You are the lore lead: your decisions are kept.' : 'Read only: only the owner decides.'}</span></div>
      <p class="dim small">Every note testers have sent from play. Mark each canon or rejected, and public if it may be copied into the public repository; edit the wording before you decide if it needs it.</p>
      ${C.error ? `<p class="el-M small">${esc(C.error)}</p>` : ''}
      <div class="row">${tabs}<button class="sm right" data-act="canonInbox">Refresh</button></div>
      <div class="canon-list canon-inbox">${shown.map(itemHTML).join('') || '<p class="dim small">Nothing here.</p>'}</div>
      <div class="row" style="margin-top:10px"><button data-act="canonCopyCanon" ${count('canon') ? '' : 'disabled'}>Copy canon (JSON lines)</button><button class="right" data-act="closeModal">Close</button></div>`;
  }
  async function decide(id, patch) {
    const it = C.items && C.items.find((x) => x.rec.id === id);
    if (!it || !C.lead) return;
    const box = document.getElementById('cv-' + id);
    const prev = C.reviews[id] || {};
    const claim = box ? box.value.replace(/\s+/g, ' ').trim().slice(0, 1000) : prev.claim || it.rec.claim;
    const next = Object.assign(
      { status: prev.status || 'proposed', public: !!prev.public, note: prev.note || '' },
      patch,
      { claim: claim === it.rec.claim ? '' : claim, at: new Date().toISOString(), from: it.from },
    );
    C.reviews[id] = next;
    U.openModal(inboxHTML());
    try {
      await db.doc('canonReview/' + id).set(next);
    } catch (e) {
      C.reviews[id] = prev;
      U.toast('Not saved: ' + ((e && e.code) || 'unavailable'));
      U.openModal(inboxHTML());
    }
  }

  /** What the Canon list adds on the test page: whether notes reached the inbox, and the inbox for reviewers. */
  U.canonListExtra = function () {
    if (!C.ready) return '';
    const n = T.loadCanon().length;
    return `<div class="row small"><span class="dim">${C.sentCount()} of ${n} sent to the lore lead’s inbox.</span>${C.reviewer ? '<button class="sm right" data-act="canonInbox">Open the inbox</button>' : ''}</div>`;
  };

  const prevExtra = U.extraAct;
  U.extraAct = function (act, arg, el, e) {
    switch (act) {
      case 'canonInbox':
        if (!C.ready || !C.reviewer) return true;
        C.items = C.items || null;
        U.openModal(inboxHTML());
        loadInbox().then(() => U.modal && U.openModal(inboxHTML()));
        return true;
      case 'canonFilter':
        C.filter = arg;
        U.openModal(inboxHTML());
        return true;
      case 'canonDecide': {
        const [id, status] = String(arg).split('|');
        decide(id, { status });
        return true;
      }
      case 'canonPublic': {
        const prev = C.reviews[arg] || {};
        decide(arg, { public: !prev.public });
        return true;
      }
      case 'canonCopyCanon': {
        const lines = T.canonLines(C.items.filter((it) => statusOf(it) === 'canon').map(C.decided));
        if (navigator.clipboard && navigator.clipboard.writeText)
          navigator.clipboard.writeText(lines).then(
            () => U.toast('Copied.'),
            () => U.toast('The page may not copy here.'),
          );
        return true;
      }
    }
    return prevExtra ? prevExtra(act, arg, el, e) : false;
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
