/* ============================================================================
   TUMULT — CANON CAPTURE (UI)
   The web game is a way to write the world (Garrett, 2026-11-13). Beside the
   text it shows about places, pilots, foes and events sits a small mark:
   "Correct this". A player can say it is wrong, add a detail, or say they love
   it, and that becomes a proposed canon record (src/engine/canon.js). When a
   pilot is drafted, the game asks one question about the Cosmic Shore pilot
   whose painting they wear. Every question can be skipped, and the asking can
   be turned off; the marks never pop up on their own.
   Records stay on this device until copied (title screen → Canon).
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) => U.esc(s);
  const $ = (sel) => document.querySelector(sel);

  /** What each mark on screen refers to, by its key: { subject, shown, where }. */
  U.canonShown = {};

  /**
   * A "Correct this" mark for one piece of shown text. `where` says which piece (atlas:notes:2) so a reviewer
   * can find it; the text itself travels with the record, exactly as the player saw it.
   */
  U.canonMark = function (subject, shown, where) {
    const key = subject + '|' + where;
    U.canonShown[key] = { subject, shown: String(shown || ''), where };
    return `<button class="cmark" data-act="canonMark" data-arg="${esc(key)}" data-tip="Correct this, or add to it" aria-label="Correct this">✎</button>`;
  };

  /** Whether the game should ask questions as it goes (the marks are always there). */
  U.canonAsks = function () {
    return T.loadMeta().askCanon !== false;
  };

  /** Where the player is, kept with every record so a reviewer can see what they saw. */
  function context() {
    const run = U.run;
    const m = run && run.mission;
    const page = (m && m.page) || (U.screen === 'atlas' && U.atlasPage) || '';
    return {
      build: (T.BUILD && T.BUILD.version) || '',
      screen: U.screen || '',
      page,
      mission: (m && m.archetype) || '',
      tide: (run && run.tide) || '',
      players: (run && run.party && run.party.players && run.party.players.length) || 0,
    };
  }
  /** Who wrote it: the player's name when playing online (the test page adds who is signed in when it sends). */
  function by() {
    const N = U.net;
    if (!N || !N.online || !N.online() || !N.names) return '';
    return N.names[N.role === 'host' ? 0 : 1] || '';
  }

  /** Keep one record; tell the player whether it was kept. */
  function keep(o) {
    const r = T.canonRecord(Object.assign({ at: new Date().toISOString(), by: by(), context: context() }, o));
    if (!r.ok) {
      U.toast(r.why);
      return false;
    }
    if (!T.addCanon(r.rec)) {
      U.toast('This browser would not keep the note.');
      return false;
    }
    if (U.canonSent) U.canonSent(r.rec); // the test page may send it on
    return true;
  }

  /* ───────────── the correction ───────────── */
  let note = null; // { subject, shown, where, kind }
  function noteHTML() {
    const k = T.CANON_KINDS[note.kind];
    const kinds = ['wrong', 'detail', 'love']
      .map(
        (id) =>
          `<button class="sm ${note.kind === id ? 'primary' : 'ghost'}" data-act="canonKind" data-arg="${id}">${esc(T.CANON_KINDS[id].label)}</button>`,
      )
      .join('');
    return `<h3>Correct this</h3>
      <p class="dim small">What you write goes to the lore lead as a proposal. It becomes canon only once approved.</p>
      <blockquote class="canon-quote">${esc(note.shown)}</blockquote>
      <div class="row">${kinds}</div>
      <label class="small dim" for="canonText">${esc(k.ask)}</label>
      <textarea id="canonText" class="canon-text" rows="4" maxlength="1000">${esc(note.text || '')}</textarea>
      <div class="row" style="margin-top:10px"><button class="primary" data-act="canonSave">Send to the lore lead</button><button class="ghost" data-act="closeModal">Cancel</button></div>`;
  }
  const typed = () => ($('#canonText') ? $('#canonText').value : '');

  /* ───────────── the pilot question, on the draft ───────────── */
  /** The question about the pilot whose painting a hero wears, or '' when there is no painting or no asking. */
  U.pilotQuestion = function (hero, d) {
    const a = U.pilotOf && U.pilotOf(hero);
    if (!a || !U.canonAsks()) return '';
    const hooks = T.canonHooks(a.key, T.loadMeta().runs + d.heroIdx);
    const pick = d.hook ? d.hook.pick : null;
    const chips = hooks
      .map(
        (h, i) =>
          `<button class="sm ${pick === i ? 'primary' : 'ghost'}" data-act="canonHook" data-arg="${i}">${esc(h)}</button>`,
      )
      .join('');
    return `<div class="canon-ask"><div class="row">${U.portrait(hero, 'xs')}<b>Why does ${esc(a.name)} guide?</b><span class="dim small">${esc(a.key)} · optional</span></div>
      <div class="row">${chips}</div>
      <input id="canonHookText" class="canon-line" maxlength="300" placeholder="…or in your own words" value="${esc((d.hook && d.hook.text) || '')}">
      <div class="mute small">Your answer goes to the lore lead as a proposal about ${esc(a.name)}. Skip it if nothing comes to mind.</div></div>`;
  };
  /** On confirming a hero: keep their answer, if they gave one. */
  U.savePilotAnswer = function (d) {
    const a = d.hero && U.pilotOf && U.pilotOf(d.hero);
    if (!a || !U.canonAsks()) return;
    const own = $('#canonHookText') ? $('#canonHookText').value.trim() : (d.hook && d.hook.text) || '';
    const hooks = T.canonHooks(a.key, T.loadMeta().runs + d.heroIdx);
    const claim = own || (d.hook && d.hook.pick != null ? hooks[d.hook.pick] : '');
    if (!claim) return;
    keep({
      subject: 'pilot:' + a.key,
      kind: 'answer',
      prompt: 'hook',
      shown: `Why does ${a.name} guide?` + (own ? '' : ' Offered: ' + hooks.join(' / ')),
      where: 'draft:hook',
      claim,
      context: Object.assign(context(), {
        hero: d.hero.name,
        painting: U.isExact(a, d.hero) ? 'exact' : 'stand-in',
      }),
    });
  };

  /* ───────────── the list, from the title ───────────── */
  let clearing = false;
  function listHTML() {
    const list = T.loadCanon();
    const asks = U.canonAsks();
    const rows = list
      .slice()
      .reverse()
      .slice(0, 60)
      .map(
        (r) =>
          `<div class="canon-row"><span class="mono small dim">${esc(r.subject)}</span> <span class="pill">${esc((T.CANON_KINDS[r.kind] || {}).label || r.kind)}</span><div class="small">${esc(r.claim || '♥')}</div></div>`,
      )
      .join('');
    return `<div class="row"><h3>Canon from play</h3><span class="right small dim">${list.length} note${list.length === 1 ? '' : 's'} on this device</span></div>
      <p class="dim small">Answers and corrections you have written while playing. Each is a proposal until the lore lead approves it. Copy them to send them on.</p>
      <div class="row"><button class="sm ${asks ? 'primary' : 'ghost'}" data-act="canonAsk">${asks ? 'Asking questions as I play: on' : 'Asking questions as I play: off'}</button><span class="small dim">The ✎ marks stay either way.</span></div>
      ${U.canonListExtra ? U.canonListExtra() : ''}
      <div class="canon-list">${rows || '<p class="dim small">Nothing yet. Look for ✎ beside field notes, pilots, foes and events.</p>'}</div>
      <textarea class="pt-report canon-out" id="canonOut" readonly spellcheck="false">${esc(T.canonLines(list))}</textarea>
      <div class="row" style="margin-top:10px"><button class="primary" data-act="canonCopy" ${list.length ? '' : 'disabled'}>Copy all</button><button class="ghost" data-act="canonClear" ${list.length ? '' : 'disabled'}>${clearing ? 'Really clear them all?' : 'Clear'}</button><button class="right" data-act="closeModal">Close</button></div>`;
  }

  /** The canon actions; true when one was taken. */
  U.canonAct = function (act, arg) {
    switch (act) {
      case 'canonMark': {
        const s = U.canonShown[arg];
        if (!s) return true;
        note = { subject: s.subject, shown: s.shown, where: s.where, kind: 'wrong', text: '' };
        U.openModal(noteHTML());
        return true;
      }
      case 'canonKind':
        if (!note || !T.CANON_KINDS[arg]) return true;
        note.text = typed();
        note.kind = arg;
        U.openModal(noteHTML());
        return true;
      case 'canonSave': {
        if (!note) return true;
        const ok = keep({
          subject: note.subject,
          kind: note.kind,
          claim: typed(),
          shown: note.shown,
          where: note.where,
        });
        if (ok) {
          note = null;
          U.closeModal();
          U.toast(
            U.canonNet && U.canonNet.ready
              ? 'Sent to the lore lead. Thank you.'
              : 'Kept on this device. Copy it from Canon on the title to send it on.',
          );
        }
        return true;
      }
      case 'canonHook': {
        const d = U.draft;
        if (!d) return true;
        const i = parseInt(arg, 10);
        const text = $('#canonHookText') ? $('#canonHookText').value : '';
        d.hook = { pick: d.hook && d.hook.pick === i ? null : i, text };
        U.render();
        return true;
      }
      case 'canonList':
        clearing = false;
        U.openModal(listHTML());
        return true;
      case 'canonAsk': {
        const meta = T.loadMeta();
        meta.askCanon = meta.askCanon === false;
        T.saveMeta(meta);
        U.openModal(listHTML());
        return true;
      }
      case 'canonCopy': {
        const box = $('#canonOut');
        const text = T.canonLines(T.loadCanon());
        const byHand = () => {
          if (box) box.select();
          U.toast('Select all and copy.');
        };
        if (navigator.clipboard && navigator.clipboard.writeText)
          navigator.clipboard.writeText(text).then(() => U.toast('Copied.'), byHand);
        else byHand();
        return true;
      }
      case 'canonClear':
        if (!clearing) clearing = true;
        else {
          T.clearCanon();
          clearing = false;
        }
        U.openModal(listHTML());
        return true;
    }
    return false;
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
