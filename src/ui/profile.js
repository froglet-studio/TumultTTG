/* ============================================================================
   TUMULT — YOUR PROFILE (the web version's account page; docs/reference/ACCOUNTS.md "Your profile").
   Frogma - Tumult, "Profile (Nov 22)", Profile 1 "Profile page": the account button at the top right opens
   it. On the left, your card as other players see it; on the right, your display name and your avatar;
   below, the sign-ins on the account.

   An avatar is one of:
     ''            automatic: the first pilot on your card, else your initials (what everyone starts with)
     'p:<KEY>'     any pilot painting in the game (U.PILOT_ART), your own pilots listed first
     'google' | 'discord'   the picture that sign-in gave, fetched through Tumult's Worker (T.Account.pictureUrl)
     'initials'    your initials
   The same face is drawn everywhere a player is shown: the account button, the Lobby, profile cards
   (U.avatarSrc, U.avatarHTML). Names follow the server's rules (server/src/auth/names.js): this page checks
   them as you type, and the server has the last word.

   Inert without an account server: the offline file never shows it.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) => (U.esc ? U.esc(s) : String(s));
  const A = () => (T.Account && typeof T.Account.available === 'function' && T.Account.available() ? T.Account : null);
  const me = () => {
    const a = A();
    const u = a && a.user();
    return u && u.id ? u : null;
  };
  const NAME_MIN = 3;
  const NAME_MAX = 20;
  const LABEL = { google: 'Google', discord: 'Discord', email: 'email' };

  /* ───────────── faces, everywhere a player is shown ───────────── */
  const artOf = (key) => (U.PILOT_ART || []).find((a) => a.key === key) || null;
  /**
   * The picture for a player { id, avatar } (and, for an automatic avatar, their card's pilots), or null for
   * initials.
   */
  U.avatarSrc = function (person, card) {
    const av = (person && person.avatar) || '';
    if (av === 'initials') return null;
    if (av.startsWith('p:')) {
      const a = artOf(av.slice(2));
      return a && U.portraitSrc ? U.portraitSrc(a) : null;
    }
    if (av === 'google' || av === 'discord') {
      const a = A();
      return a && a.pictureUrl ? a.pictureUrl(person) : null;
    }
    const first = card && Array.isArray(card.pilots) ? card.pilots.find((p) => p && artOf(p.art)) : null;
    return first && U.portraitSrc ? U.portraitSrc(artOf(first.art)) : null;
  };
  const initials = (name) =>
    String(name || '?')
      .split(/\s+/)
      .map((w) => w[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';
  U.initials = initials;
  /** A player's face as markup: their picture, else their initials. */
  U.avatarHTML = function (person, cls, card) {
    const src = U.avatarSrc(person, card);
    return src
      ? `<span class="av-face ${cls || ''}"><img src="${esc(src)}" alt="" draggable="false" loading="lazy"></span>`
      : `<span class="av-face ini ${cls || ''}" aria-hidden="true">${esc(initials(person && person.name))}</span>`;
  };
  /** My own card's pilots, for an automatic avatar (the paintings of the pilots I fly and have made). */
  function myPilots() {
    const run = U.run || (T.loadRun && T.loadRun());
    const heroes = ((run && run.heroes) || []).filter(Boolean);
    const made = T.loadMade ? T.loadMade() : [];
    const out = [];
    for (const h of heroes.concat(made)) {
      let a = null;
      try {
        a = U.pilotOf ? U.pilotOf(h) : null;
      } catch (e) {
        a = null;
      }
      if (a && !out.some((o) => o.art === a.key)) out.push({ name: h.name || a.name, art: a.key });
    }
    return out;
  }
  U.myAvatarHTML = (cls) => {
    const u = me();
    return u ? U.avatarHTML(u, cls, { pilots: myPilots() }) : '';
  };

  /* ───────────── the page ───────────── */
  // what is being edited: kept until saved or the page is left
  const P = (U.profile = { name: null, avatar: null, tab: 'mine', check: null, busy: false, msg: '', bad: false });
  let checking = null;

  function reset() {
    const u = me();
    Object.assign(P, {
      name: u ? u.name : '',
      avatar: u ? u.avatar || '' : '',
      check: null,
      busy: false,
      msg: '',
      bad: false,
    });
    const av = P.avatar;
    P.tab = av === 'google' || av === 'discord' ? 'picture' : av === 'initials' ? 'initials' : 'mine';
    if (av.startsWith('p:') && !myPilots().some((p) => 'p:' + p.art === av)) P.tab = 'all';
  }
  U.openProfile = function () {
    if (!me() || me().guest) {
      if (U.askSignIn) U.askSignIn('Sign in to have a profile: a name and a face other players see.');
      return;
    }
    reset();
    U.screen = 'profile';
    U.render();
  };

  /** What the name box would say about a name before asking the server. */
  function localProblem(name) {
    const n = String(name || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (n.length < NAME_MIN) return `At least ${NAME_MIN} characters.`;
    if (n.length > NAME_MAX) return `At most ${NAME_MAX} characters.`;
    if (!/^[\p{L}\p{M}\p{N} ._'-]+$/u.test(n)) return "Letters, numbers, spaces and . _ - ' only.";
    if (!/\p{L}/u.test(n)) return 'At least one letter.';
    return '';
  }
  const cleanName = (v) =>
    String(v || '')
      .replace(/\s+/g, ' ')
      .trim();

  function rulesHTML() {
    const u = me();
    const n = cleanName(P.name);
    const mine = u && n === u.name;
    const local = localProblem(n);
    const c = P.check && P.check.name === n ? P.check : null;
    const row = (ok, txt) =>
      `<span class="pf-rule ${ok === true ? 'ok' : ok === false ? 'no' : ''}"><i aria-hidden="true">${ok === true ? '✓' : ok === false ? '✕' : '·'}</i>${esc(txt)}</span>`;
    const fits = !localProblem(n);
    let server = null;
    if (mine) server = true;
    else if (c) server = c.ok;
    const sp = c && !c.ok ? c.problem : '';
    const takenish = /already flies/.test(sp);
    const fitWord = sp && !takenish ? false : server === true ? true : null;
    const free = takenish ? false : server === true ? true : null;
    return `${row(fits, local || `${NAME_MIN} to ${NAME_MAX} letters, numbers, spaces`)}${row(fits ? free : null, takenish ? sp : 'Nobody else has it')}${row(fits ? fitWord : null, sp && !takenish ? sp : 'Fit for the table')}`;
  }
  function refreshRules() {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('pfRules');
    if (el) el.innerHTML = rulesHTML();
    const ct = document.getElementById('pfCount');
    if (ct) ct.textContent = `${cleanName(P.name).length} / ${NAME_MAX}`;
    document.querySelectorAll('[data-pf-name]').forEach((e) => (e.textContent = cleanName(P.name) || '…'));
    document.querySelectorAll('[data-pf-ini]').forEach((e) => (e.textContent = initials(cleanName(P.name))));
    // Save lights up once something changed, and not for a name the server has turned down
    const u = me();
    const n = cleanName(P.name);
    const changed = u && (n !== u.name || P.avatar !== (u.avatar || ''));
    const wait = u && u.renameAt && u.renameAt > Date.now() && n !== u.name;
    const refused = P.check && P.check.name === n && !P.check.ok;
    const btn = document.querySelector('[data-act="profSave"]');
    const und = document.querySelector('[data-act="profReset"]');
    if (btn) btn.disabled = !changed || P.busy || !!wait || !!refused;
    if (und) und.disabled = !changed || P.busy;
  }
  function askServer() {
    clearTimeout(checking);
    const n = cleanName(P.name);
    const u = me();
    if (!u || n === u.name || localProblem(n)) return;
    checking = setTimeout(() => {
      const a = A();
      if (!a || !a.checkName) return;
      a.checkName(n)
        .then((r) => {
          P.check = { name: n, ok: !!(r && r.ok), problem: (r && r.problem) || '' };
          refreshRules();
        })
        .catch(() => {
          /* an older server, or offline: Save will say */
        });
    }, 350);
  }

  function tiles(list) {
    return list
      .map((t) => {
        const on = P.avatar === t.value;
        return `<button class="pf-opt${on ? ' sel' : ''}" data-act="profAvatar" data-arg="${esc(t.value)}" aria-pressed="${on}" aria-label="${esc(t.label)}" data-tip="${esc(t.label)}">${t.inner}</button>`;
      })
      .join('');
  }
  function avatarTab() {
    const u = me();
    const paint = (a, label) => ({
      value: 'p:' + a.key,
      label: label || a.name,
      inner: `<img src="${esc(U.portraitSrc(a))}" alt="" draggable="false" loading="lazy">`,
    });
    if (P.tab === 'mine') {
      const mine = myPilots()
        .map((p) => artOf(p.art) && paint(artOf(p.art), p.name))
        .filter(Boolean);
      const auto = {
        value: '',
        label: 'Automatic: your first pilot',
        inner: `<span class="pf-auto">AUTO</span>`,
      };
      return mine.length
        ? `<div class="pf-grid">${tiles([auto].concat(mine))}</div>`
        : `<p class="pf-note">Your pilots show here once you fly or make one. Pick any painting under <b>All paintings</b> meanwhile.</p>`;
    }
    if (P.tab === 'all')
      return `<div class="pf-scroll"><div class="pf-grid pf-all">${tiles((U.PILOT_ART || []).filter((a) => U.portraitSrc(a)).map((a) => paint(a)))}</div></div>`;
    if (P.tab === 'picture') {
      const pics = (u && u.pictures) || [];
      const a = A();
      const list = pics.map((p) => ({
        value: p,
        label: `Your ${LABEL[p]} picture`,
        inner: `<img src="${esc((a && a.pictureUrl && a.pictureUrl({ id: u.id, avatar: p })) || '')}" alt="" draggable="false"><em>${LABEL[p]}</em>`,
      }));
      const missing = ['google', 'discord'].filter((p) => !pics.includes(p));
      const how = missing.length
        ? `<p class="pf-note">${pics.length ? '' : 'No sign-in picture yet. '}Sign in with ${missing.map((p) => LABEL[p]).join(' or ')} to bring ${missing.length > 1 ? 'its' : 'that'} picture; a sign-in you already have brings its picture the next time you use it.</p><div class="pf-row">${missing.map((p) => `<button class="pf-btn cy" data-act="acctProvider" data-arg="${p}">${(u.links || []).includes(p) ? 'Sign in again with' : 'Add'} ${LABEL[p]}</button>`).join('')}</div>`
        : '';
      return `${list.length ? `<div class="pf-grid">${tiles(list)}</div>` : ''}${how}<p class="pf-note">Your picture is fetched through Tumult's own server, and only shown if you pick it. Uploading your own picture is not offered yet.</p>`;
    }
    return `<div class="pf-grid">${tiles([{ value: 'initials', label: 'Your initials', inner: `<span class="pf-ini" data-pf-ini>${esc(initials(cleanName(P.name)))}</span>` }])}</div><p class="pf-note">Just your initials, on the sea's colours.</p>`;
  }

  function stats() {
    const meta = T.loadMeta ? T.loadMeta() : {};
    const canon = T.loadCanon ? T.loadCanon().length : 0;
    const stat = (n, l) => `<div class="pf-stat"><b>${n}</b><span>${l}</span></div>`;
    return `<div class="pf-stats">${stat(meta.runs || 0, 'Expeditions')}${stat(meta.wins || 0, 'Hearts')}${stat(canon, 'Canon')}</div>`;
  }

  U.renderProfile = function () {
    const u = me();
    if (!u || u.guest) {
      const inner = `<div class="pf"><div class="pf-empty"><h2>Your profile</h2><p>Sign in to have a name and a face other players see in the Lobby.</p>${A() ? '<button class="pf-btn go" data-act="signIn">Sign in</button>' : ''}</div></div>`;
      return U.shell ? U.shell('', inner) : inner;
    }
    if (P.name == null) reset();
    const draft = { id: u.id, name: cleanName(P.name) || u.name, avatar: P.avatar };
    const card = { pilots: myPilots() };
    const links = u.links || [];
    const changed = cleanName(P.name) !== u.name || P.avatar !== (u.avatar || '');
    const wait = u.renameAt && u.renameAt > Date.now() && cleanName(P.name) !== u.name;
    const waitH = wait ? Math.ceil((u.renameAt - Date.now()) / 3600000) : 0;
    const tabs = [
      ['mine', 'Your pilots'],
      ['all', 'All paintings'],
      ['picture', 'Sign-in picture'],
      ['initials', 'Initials'],
    ]
      .map(
        ([id, name]) =>
          `<button class="${P.tab === id ? 'on' : ''}" data-act="profTab" data-arg="${id}" aria-pressed="${P.tab === id}">${name}</button>`,
      )
      .join('');
    const add = ['google', 'discord']
      .filter((p) => !links.includes(p))
      .map((p) => `<button class="pf-btn cy sm" data-act="acctProvider" data-arg="${p}">+ ${LABEL[p]}</button>`)
      .join('');
    const inner = `<div class="pf">
      <section class="pf-me" aria-label="Your card">
        <span class="pf-eye">Your profile</span>
        <div class="pf-ring">${U.avatarHTML(draft, 'pf-big', card)}</div>
        <h1 class="pf-name" data-pf-name>${esc(draft.name)}</h1>
        <p class="pf-sub"><i class="pf-dot" aria-hidden="true"></i> Signed in with ${esc(links.map((l) => LABEL[l] || l).join(', ') || 'Tumult')}</p>
        ${stats()}
        <div class="pf-lab">How others see you</div>
        <div class="pf-preview">${U.avatarHTML(draft, 'pf-small', card)}<span><b data-pf-name>${esc(draft.name)}</b><span>On Home</span></span><span class="pf-tag">+ Add</span></div>
      </section>
      <section class="pf-edit" aria-label="Edit your profile">
        <div class="pf-sec">
          <label class="pf-h" for="pfName">Display name</label>
          <div class="pf-field"><input id="pfName" maxlength="${NAME_MAX + 4}" autocomplete="nickname" spellcheck="false" value="${esc(P.name)}"><span id="pfCount">${cleanName(P.name).length} / ${NAME_MAX}</span></div>
          <div class="pf-rules" id="pfRules" aria-live="polite">${rulesHTML()}</div>
          <p class="pf-note">Shown in the Lobby, on your card, at tables and on the canon notes you write.${wait ? ` <b>You can change it again in ${waitH} hour${waitH === 1 ? '' : 's'}.</b>` : ' You can change it once a day.'}</p>
        </div>
        <div class="pf-sec">
          <div class="pf-headrow"><span class="pf-h">Avatar</span><div class="pf-seg" role="group" aria-label="Where your avatar comes from">${tabs}</div></div>
          ${avatarTab()}
        </div>
        ${P.msg ? `<p class="pf-msg${P.bad ? ' bad' : ''}" role="status">${esc(P.msg)}</p>` : ''}
        <div class="pf-actions"><button class="pf-btn" data-act="profReset" ${changed && !P.busy ? '' : 'disabled'}>Undo</button><button class="pf-cta" data-act="profSave" ${changed && !P.busy && !wait ? '' : 'disabled'}>${P.busy ? 'Saving…' : 'Save profile'}</button></div>
      </section>
      <section class="pf-links" aria-label="Sign-ins">
        <span class="pf-h">Sign-ins</span>${links.map((l) => `<span class="pf-tag ok">${esc(LABEL[l] || l)} ✓</span>`).join('')}${add}
        <span class="pf-end"><button class="pf-btn sm" data-act="acctSignOut">Sign out</button><button class="pf-btn sm danger" data-act="acctOpen">Delete account…</button></span>
      </section>
    </div>`;
    return U.shell ? U.shell('', inner) : inner;
  };
  (U.SCREENS = U.SCREENS || {}).profile = U.renderProfile;

  async function save() {
    const a = A();
    const u = me();
    if (!a || !u || P.busy) return;
    const fields = {};
    const n = cleanName(P.name);
    if (n !== u.name) {
      const local = localProblem(n);
      if (local) {
        Object.assign(P, { msg: local, bad: true });
        return U.render();
      }
      fields.name = n;
    }
    if (P.avatar !== (u.avatar || '')) fields.avatar = P.avatar;
    if (!Object.keys(fields).length) return;
    Object.assign(P, { busy: true, msg: '', bad: false });
    U.render();
    try {
      const nu = await a.update(fields);
      if (fields.avatar !== undefined && (nu.avatar || '') !== fields.avatar)
        throw new Error('Avatars arrive with the next server update. Your name is saved.');
      Object.assign(P, { busy: false, msg: 'Saved. The Lobby shows your new profile now.', bad: false });
      P.name = nu.name;
      P.check = null;
      try {
        const lobby = T.Backend && T.Backend.available() ? await T.Backend.use('lobby') : null;
        if (lobby && lobby.refreshMe) lobby.refreshMe();
      } catch (e) {
        /* the lobby hears it on the next connect */
      }
      if (U.social && U.social.publish) U.social.publish(true);
    } catch (e) {
      Object.assign(P, { busy: false, msg: (e && e.message) || 'That did not save. Try again.', bad: true });
    }
    if (U.screen === 'profile') U.render();
  }

  if (typeof window === 'undefined') return;
  const prevExtra = U.extraAct;
  U.extraAct = function (act, arg, el, e) {
    switch (act) {
      case 'account':
      case 'profileOpen':
        U.openProfile();
        return true;
      case 'profTab':
        P.tab = arg || 'mine';
        U.render();
        return true;
      case 'profAvatar':
        P.avatar = arg || '';
        P.msg = '';
        U.render();
        return true;
      case 'profReset':
        reset();
        U.render();
        return true;
      case 'profSave':
        save();
        return true;
    }
    return prevExtra ? prevExtra(act, arg, el, e) : false;
  };
  document.addEventListener('input', (e) => {
    if (!e.target || e.target.id !== 'pfName') return;
    P.name = e.target.value;
    P.msg = '';
    refreshRules();
    askServer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target && e.target.id === 'pfName') save();
  });
  // on a phone the profile is also under More (the web version only, where there are accounts)
  window.addEventListener('load', () => {
    if (!A() || !U.MORE_ITEMS || U.MORE_ITEMS.some((m) => m.act === 'profileOpen')) return;
    const at = U.MORE_ITEMS.findIndex((m) => m.act === 'settings');
    U.MORE_ITEMS.splice(at < 0 ? U.MORE_ITEMS.length : at, 0, {
      act: 'profileOpen',
      name: 'Profile',
      icon: '☺',
      txt: 'Your name and avatar',
    });
  });
  // a sign-in, sign-out or save elsewhere: the page follows the account
  if (T.Account && typeof T.Account.onChange === 'function')
    T.Account.onChange((u) => {
      if (U.screen !== 'profile') return;
      if (!u || u.guest) U.screen = 'title';
      else if (!P.busy && P.name === null) reset();
      if (!U.modal) U.render();
    });
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
