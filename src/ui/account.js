/* ============================================================================
   TUMULT — ACCOUNTS (the web version's sign-in; docs/reference/ACCOUNTS.md).
   Guest first: anyone plays solo with no account and no server. The first time something needs one
   (playing online, sharing a pilot), T.Account.ensure() makes a guest account on Tumult's Worker. The
   player can link Google, Discord or an email address at any time to keep that account, and so their
   pilots and saves, on any device. Online play needs a session; hosting needs a linked account, and a
   guest joins through the host's invite link (the Worker enforces both).

   Inert without a server: this file is in every build, but it only talks to the address in T.Server.base,
   which only the web version defines (src/web/server.js). The offline file never makes a request.

   T.Account
     available()            is there a server to sign in to
     token() / user()       this device's session token and { id, name, guest, links } (or null)
     ensure()               → user: a guest account on first need
     providers()            → { google, discord, email }: what the server offers
     signIn(provider)       go to Google or Discord; comes back to this page signed in (linking the guest)
     emailStart(email) / emailVerify(email, code)
     rename(name), signOut(), remove()
     onChange(fn)           called with the user whenever it changes
   Stored on the device under localStorage 'tumult_v2_account' = { token, user }.
   ========================================================================== */
(function (T) {
  const KEY = 'tumult_v2_account';
  const A = (T.Account = T.Account || {});
  const listeners = [];
  let offered = null;
  let pending = null;

  const base = () => {
    const b = T.Server && T.Server.base;
    return typeof b === 'string' && /^https?:\/\//.test(b) ? b.replace(/\/+$/, '') : '';
  };
  const load = () => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      return v && typeof v.token === 'string' ? v : null;
    } catch {
      return null;
    }
  };
  const save = (v) => {
    try {
      if (v) localStorage.setItem(KEY, JSON.stringify(v));
      else localStorage.removeItem(KEY);
    } catch {}
    listeners.forEach((f) => {
      try {
        f(v ? v.user : null);
      } catch {}
    });
  };

  A.available = () => !!base();
  A.token = () => (load() || {}).token || null;
  A.user = () => (load() || {}).user || null;
  A.onChange = (fn) => (listeners.push(fn), () => listeners.splice(listeners.indexOf(fn) >>> 0, 1));

  const oops = (status, error, message) => Object.assign(new Error(message), { status, error });
  /** One call to the Worker. Rejects with an Error whose message a player can read (and .status, .error). */
  async function api(method, path, body, token = A.token()) {
    if (!base()) throw oops(0, 'offline', 'Online play is not available here.');
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl && setTimeout(() => ctl.abort(), 12000);
    let res;
    try {
      res = await fetch(base() + path, {
        method,
        headers: Object.assign(
          body ? { 'Content-Type': 'application/json' } : {},
          token ? { Authorization: 'Bearer ' + token } : {},
        ),
        body: body ? JSON.stringify(body) : undefined,
        signal: ctl ? ctl.signal : undefined,
      });
    } catch {
      throw oops(0, 'unreachable', "Couldn't reach Tumult's server. Solo play still works.");
    } finally {
      if (timer) clearTimeout(timer);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && token && token === A.token()) save(null); // the session ended
      throw oops(res.status, data.error || 'failed', data.message || 'Sign-in failed.');
    }
    return data;
  }
  A.api = api;

  A.ensure = async function () {
    const cur = load();
    if (cur) return cur.user;
    if (!pending)
      pending = api('POST', '/auth/guest', {}, null)
        .then((d) => (save({ token: d.token, user: d.user }), d.user))
        .finally(() => (pending = null));
    return pending;
  };
  A.refresh = async function () {
    const cur = load();
    if (!cur) return null;
    const d = await api('GET', '/auth/me');
    save({ token: cur.token, user: d.user });
    return d.user;
  };
  A.providers = async function () {
    if (!offered) offered = api('GET', '/auth/providers', null, null).catch(() => ((offered = null), {}));
    return offered;
  };
  /** Leave for Google or Discord. A guest account on this device goes along, to be kept. */
  A.signIn = async function (provider) {
    const here = location.href.split('#')[0];
    const d = await api('POST', '/auth/start/' + provider, { return: here });
    location.assign(d.url);
  };
  A.emailStart = (email) => api('POST', '/auth/email/start', { email });
  A.emailVerify = async function (email, code) {
    const d = await api('POST', '/auth/email/verify', { email, code });
    save({ token: d.token || A.token(), user: d.user });
    return d.user;
  };
  A.rename = async function (name) {
    const d = await api('PATCH', '/auth/me', { name });
    save({ token: A.token(), user: d.user });
    return d.user;
  };
  A.signOut = async function () {
    await api('POST', '/auth/signout').catch(() => {});
    save(null);
  };
  A.remove = async function () {
    await api('DELETE', '/auth/me');
    save(null);
  };

  /** Coming back from Google or Discord: the fragment carries the new session, or why it failed. */
  A.takeReturn = async function () {
    if (typeof location === 'undefined' || !/tumult_(session|auth_error)=/.test(location.hash)) return null;
    const p = new URLSearchParams(location.hash.slice(1));
    const tok = p.get('tumult_session');
    const err = p.get('tumult_auth_error');
    try {
      history.replaceState(null, '', location.href.split('#')[0]); // keep the token out of history and screenshots
    } catch {}
    if (err) return { error: err };
    if (!tok || !/^[A-Za-z0-9_-]{20,100}$/.test(tok)) return null;
    const d = await api('GET', '/auth/me', null, tok);
    save({ token: tok, user: d.user });
    return { user: d.user };
  };

  /* ───────────── screens ───────────── */
  if (typeof window === 'undefined' || !T.UI) return;
  const U = T.UI;
  const esc = (s) => (U.esc ? U.esc(s) : String(s));
  const LABEL = { google: 'Google', discord: 'Discord', email: 'email' };
  const ui = { reason: '', email: '', codeSent: false, busy: false, msg: '', confirmDelete: false, offer: {} };

  const linksText = (u) => (u.links || []).map((l) => LABEL[l] || l).join(', ');

  /** The line on the title screen; nothing when there is no server. */
  U.titleAccount = function () {
    if (!A.available()) return '';
    const u = A.user();
    if (u && !u.guest)
      return `<div class="acct-line small">Signed in as <b>${esc(u.name)}</b> <span class="mute">with ${esc(linksText(u))}</span> <button class="sm ghost" data-act="acctOpen">Account</button></div>`;
    const who = u ? `Playing as <b>${esc(u.name)}</b>, a guest.` : 'Playing as a guest.';
    return `<div class="acct-line small">${who} <button class="sm" data-act="acctOpen">Sign in</button> <span class="mute">to keep your pilots on any device and host games online.</span></div>`;
  };

  function modalHtml() {
    const u = A.user();
    const full = u && !u.guest;
    const o = ui.offer;
    const btn = (p) =>
      o[p] && !(u && (u.links || []).includes(p))
        ? `<button data-act="acctProvider" data-arg="${p}" ${ui.busy ? 'disabled' : ''}>${full ? 'Add' : 'Continue with'} ${LABEL[p]}</button>`
        : '';
    const email = o.email
      ? ui.codeSent
        ? `<div class="acct-row"><span class="small">We sent a code to ${esc(ui.email)}.</span><input id="acctCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 digits" style="width:7em"><button class="primary" data-act="acctEmailVerify" ${ui.busy ? 'disabled' : ''}>${full ? 'Add email' : 'Sign in'}</button><button class="ghost sm" data-act="acctEmailBack">Another address</button></div>`
        : `<div class="acct-row"><input id="acctEmail" type="email" autocomplete="email" placeholder="you@example.com" value="${esc(ui.email)}"><button data-act="acctEmailStart" ${ui.busy ? 'disabled' : ''}>Email me a code</button></div>`
      : '';
    const none =
      !o.google && !o.discord && !o.email ? '<p class="mute small">Sign-in isn\'t set up on this server yet.</p>' : '';
    const intro = full
      ? `<p>Signed in as <b>${esc(u.name)}</b> with ${esc(linksText(u))}. Your pilots and saves follow this account to any device.</p>`
      : `<p>${u ? `You're playing as <b>${esc(u.name)}</b>, a guest on this device.` : "You're playing as a guest."} Sign in to keep your account, pilots and saves on any device and to host games online. Solo play never needs an account.</p>`;
    const name = u
      ? `<div class="acct-row"><span class="dim small">Name other players see</span><input id="acctName" maxlength="24" value="${esc(u.name)}"><button class="sm" data-act="acctRename" ${ui.busy ? 'disabled' : ''}>Save</button></div>`
      : '';
    const end = full
      ? `<div class="acct-row acct-end"><button class="ghost sm" data-act="acctSignOut">Sign out on this device</button>${
          ui.confirmDelete
            ? `<button class="sm danger" data-act="acctDelete" data-arg="yes">Delete my account and everything it holds</button><button class="ghost sm" data-act="acctDelete" data-arg="no">Keep it</button>`
            : `<button class="ghost sm" data-act="acctDelete">Delete account…</button>`
        }</div>`
      : u && ui.confirmDelete
        ? `<div class="acct-row acct-end"><button class="sm danger" data-act="acctDelete" data-arg="yes">Delete this guest account</button><button class="ghost sm" data-act="acctDelete" data-arg="no">Keep it</button></div>`
        : u
          ? `<div class="acct-row acct-end"><button class="ghost sm" data-act="acctDelete">Delete guest account…</button></div>`
          : '';
    return `<div class="acct"><div class="row"><h3>Account</h3><button class="sm right" data-act="closeModal">Close</button></div>
      ${ui.reason ? `<p class="acct-reason">${esc(ui.reason)}</p>` : ''}${intro}
      <div class="acct-row">${btn('google')}${btn('discord')}</div>${email}${none}
      ${ui.msg ? `<p class="acct-msg small">${esc(ui.msg)}</p>` : ''}${name}${end}</div>`;
  }
  const show = () => U.openModal(modalHtml());

  /** Open the account box, saying why sign-in is needed (the online screens use it on a 403). */
  U.askSignIn = function (reason) {
    Object.assign(ui, { reason: reason || '', msg: '', confirmDelete: false });
    show();
    A.providers().then((o) => {
      ui.offer = o || {};
      if (U.modal && U.modal.html.includes('class="acct"')) show();
    });
  };

  const val = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };
  /** Run a call with the buttons held, then redraw the box with what happened. */
  async function step(fn, done) {
    ui.busy = true;
    ui.msg = '';
    show();
    try {
      await fn();
      if (done) ui.msg = done;
    } catch (e) {
      ui.msg = (e && e.message) || 'Something went wrong.';
    }
    ui.busy = false;
    if (U.modal) show();
    else U.render();
  }

  const prevExtra = U.extraAct;
  U.extraAct = function (act, arg, el, e) {
    switch (act) {
      case 'acctOpen':
        U.askSignIn('');
        return true;
      case 'acctProvider':
        step(() => A.signIn(arg));
        return true;
      case 'acctEmailStart':
        ui.email = val('acctEmail');
        step(async () => {
          await A.emailStart(ui.email);
          ui.codeSent = true;
        });
        return true;
      case 'acctEmailBack':
        ui.codeSent = false;
        show();
        return true;
      case 'acctEmailVerify': {
        const code = val('acctCode');
        step(async () => {
          const u = await A.emailVerify(ui.email, code);
          ui.codeSent = false;
          ui.msg = `Signed in as ${u.name}.`;
        });
        return true;
      }
      case 'acctRename': {
        const name = val('acctName');
        step(() => A.rename(name), 'Name saved.');
        return true;
      }
      case 'acctSignOut':
        step(async () => {
          await A.signOut();
          U.modal = null;
        });
        return true;
      case 'acctDelete':
        if (arg === 'yes')
          step(async () => {
            await A.remove();
            U.modal = null;
            ui.confirmDelete = false;
            if (U.toast) U.toast('Your account and everything it held are deleted.', 3200);
          });
        else {
          ui.confirmDelete = arg !== 'no';
          show();
        }
        return true;
    }
    return prevExtra ? prevExtra(act, arg, el, e) : false;
  };

  // redraw the title line when the account changes
  A.onChange(() => {
    if (U.screen === 'title' && !U.modal && U.render) U.render();
  });

  // once every script has loaded (the web version defines T.Server after this file), pick up a return
  // from Google or Discord, and freshen the stored account
  window.addEventListener('load', () => {
    if (!A.available()) return;
    A.takeReturn()
      .then((r) => {
        if (r && r.error && U.toast) U.toast(esc(r.error), 4200);
        else if (r && r.user && U.toast) U.toast(`Signed in as <b>${esc(r.user.name)}</b>.`, 2600);
        else if (A.token()) return A.refresh();
      })
      .catch((e) => {
        if (U.toast && e && e.message) U.toast(esc(e.message), 4200);
      });
  });
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
