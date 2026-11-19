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

  /* ───────────── questions: a detail, a question, three ways in ───────────── */
  /**
   * Open questions on screen, by key: { p (T.canonPrompt), subject, where, context, text, sent }.
   * The text typed is kept here as it is typed, so a screen that redraws keeps it.
   */
  U.canonPrompts = {};
  /** Prompt ids already answered on this device (a shared pilot question counts once per pilot). */
  const answered = () =>
    T.loadCanon()
      .map((r) => r.prompt)
      .filter(Boolean);

  /** One question as a panel: the detail, the question, three openings, a box and Send. */
  function promptHTML(key) {
    const q = U.canonPrompts[key];
    if (q.sent)
      return `<div class="canon-ask sent" id="cpw-${key}"><span class="small dim">Sent to the lore lead. Thank you.</span></div>`;
    const p = q.p;
    const angles = p.angles
      .map((a, i) => `<button class="sm ghost" data-act="canonAngle" data-arg="${key}|${i}">${esc(a)}…</button>`)
      .join('');
    return `<div class="canon-ask" id="cpw-${key}">
      ${q.head || ''}
      <div class="canon-detail">${esc(p.detail)}</div>
      <b>${esc(p.ask)}</b>
      <div class="row">${angles}</div>
      <textarea id="cp-${key}" class="canon-text" rows="2" maxlength="1000" data-canon="${key}" placeholder="Start from an opening above, or from nothing">${esc(q.text || '')}</textarea>
      <div class="row"><button class="sm" data-act="canonPromptSend" data-arg="${key}">Send</button><span class="mute small">Optional. It goes to the lore lead as a proposal.</span></div></div>`;
  }
  /** Keep what was typed in one question, if anything and not yet sent. */
  function sendPrompt(key) {
    const q = U.canonPrompts[key];
    if (!q || q.sent) return false;
    const box = $('#cp-' + key);
    const text = ((box ? box.value : q.text) || '').trim();
    if (!text || q.p.angles.some((a) => a === text)) return false;
    const ok = keep({
      subject: q.subject,
      kind: 'answer',
      prompt: q.p.id,
      shown: q.p.detail + ' ' + q.p.ask,
      where: q.where,
      claim: text,
      context: Object.assign(context(), q.context || {}),
    });
    if (ok) q.sent = true;
    return ok;
  }
  /** After any redraw: questions show what was typed in them, or that they were sent. */
  U.canonRestore = function () {
    Object.keys(U.canonPrompts).forEach((key) => {
      const q = U.canonPrompts[key];
      const wrap = $('#cpw-' + key);
      if (!wrap) return;
      if (q.sent && !wrap.classList.contains('sent')) wrap.outerHTML = promptHTML(key);
      const box = $('#cp-' + key);
      if (box && q.text && box.value !== q.text) box.value = q.text;
    });
  };
  /** Send whatever is typed and unsent (a screen is being left), and forget the questions. */
  U.canonFlush = function () {
    Object.keys(U.canonPrompts).forEach(sendPrompt);
    U.canonPrompts = {};
  };
  // what is typed survives a redraw of the screen under it
  if (typeof document !== 'undefined')
    document.addEventListener('input', (e) => {
      const key = e.target && e.target.getAttribute && e.target.getAttribute('data-canon');
      if (key && U.canonPrompts[key]) U.canonPrompts[key].text = e.target.value;
    });

  /** The draft: a question about the Cosmic Shore pilot whose painting this hero wears. */
  U.pilotQuestion = function (hero, d) {
    const a = U.pilotOf && U.pilotOf(hero);
    if (!a || !U.canonAsks()) return '';
    const key = 'draft' + d.heroIdx;
    const subject = 'pilot:' + a.key;
    let q = U.canonPrompts[key];
    if (!q || q.subject !== subject) {
      const clade = (c) => String(c).replace(/_/g, ' ');
      const p = T.canonPrompt(subject, {
        answered: answered(),
        turn: T.loadMeta().runs + d.heroIdx,
        noClades: !U.isExact(a, hero),
        who: { name: a.name, a: clade(a.clades[0]), b: clade(a.clades[1]) },
      });
      if (!p) return '';
      q = U.canonPrompts[key] = {
        p,
        subject,
        where: 'draft:question',
        text: '',
        context: { hero: hero.name, painting: U.isExact(a, hero) ? 'exact' : 'stand-in' },
        head: `<div class="row">${U.portrait(hero, 'xs')}<b>${esc(a.name)}</b><span class="dim small">${esc(U.callsignOf(a))} · ${U.isExact(a, hero) ? '' : `the pilot whose painting ${esc(hero.name)} wears · `}tell us about them</span></div>`,
      };
    }
    return promptHTML(key);
  };
  /** On confirming a hero: keep their answer, if one was typed and not sent. */
  U.savePilotAnswer = function (d) {
    sendPrompt('draft' + d.heroIdx);
    delete U.canonPrompts['draft' + d.heroIdx];
  };

  /** The end of a mission: a question about the place it was played on. */
  U.placeQuestion = function (m) {
    const page = m && m.page && T.PAGE_BY[m.page];
    if (!page || !U.canonAsks()) return '';
    const key = 'place';
    const subject = 'place:' + page.id;
    if (!U.canonPrompts[key] || U.canonPrompts[key].subject !== subject) {
      const run = U.run;
      const p = T.canonPrompt(subject, {
        answered: answered(),
        turn: T.loadMeta().runs + ((run && run.history && run.history.length) || 0),
      });
      if (!p) return '';
      U.canonPrompts[key] = {
        p,
        subject,
        where: 'mission:end',
        text: '',
        head: `<div class="kick">While the dust settles · ${esc(page.name)}</div>`,
      };
    }
    return promptHTML(key);
  };

  /**
   * The end of a mission: if something happened to a painted pilot (down, rallied, a close call...), say what
   * happened and ask what it meant to them. One moment per mission, the most dramatic.
   */
  U.momentQuestion = function (m) {
    if (!m || !U.canonAsks() || !U.pilotOf) return '';
    const key = 'moment';
    const place = (m.page && T.PAGE_BY[m.page] && T.PAGE_BY[m.page].name) || m.title || 'the route';
    const clade = (c) => String(c).replace(/_/g, ' ');
    const nameOf = (h) => {
      const a = h && U.pilotOf(h);
      return a ? a.name : h ? h.name : 'the squad';
    };
    for (const mo of T.canonMoments(m)) {
      const hero = m.heroes[mo.hero];
      const a = U.pilotOf(hero);
      if (!a) continue;
      const subject = 'pilot:' + a.key;
      const q = U.canonPrompts[key];
      if (!q || q.subject !== subject || q.kind !== mo.kind) {
        const other = m.heroes.length === 2 ? m.heroes[1 - mo.hero] : null;
        const p = T.canonMomentPrompt(subject, mo, {
          name: a.name,
          other: nameOf(other),
          place,
          a: clade(a.clades[0]),
        });
        if (!p) continue;
        U.canonPrompts[key] = {
          p,
          subject,
          kind: mo.kind,
          where: 'mission:moment',
          text: '',
          context: { hero: hero.name, moment: mo.kind, round: m.round, result: m.won ? 'won' : 'lost' },
          head: `<div class="row">${U.portrait(hero, 'xs')}<span class="kick">A moment on ${esc(place)}</span></div>`,
        };
      }
      return promptHTML(key);
    }
    return '';
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
      case 'canonAngle': {
        const [key, i] = String(arg).split('|');
        const q = U.canonPrompts[key];
        const box = $('#cp-' + key);
        if (!q || !box) return true;
        const cur = box.value.trim();
        // an opening replaces another opening, never words the player wrote
        if (!cur || q.p.angles.some((a) => cur === a)) box.value = q.p.angles[+i] + ' ';
        else box.value = q.p.angles[+i] + ' ' + cur;
        q.text = box.value;
        box.focus();
        return true;
      }
      case 'canonPromptSend': {
        const q = U.canonPrompts[arg];
        if (!q) return true;
        if (!sendPrompt(arg)) {
          U.toast('Write a little more first: carry on from an opening, or start your own.');
          return true;
        }
        const wrap = $('#cpw-' + arg);
        if (wrap) wrap.outerHTML = promptHTML(arg);
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
