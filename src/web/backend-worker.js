/* ============================================================================
   TUMULT — THE WEB VERSION'S BACKEND PROVIDER, 'tumult-worker' (web version only).
   Serves the three online capabilities of T.Backend (src/ui/backend.js) from Tumult's own
   Cloudflare Worker (T.Server.base; server/, docs/reference/BACKEND.md), in the shapes the online
   screens already use on claude.ai, so src/ui/net.js, heroes-net.js and canon-net.js run unchanged:

     db    doc(path) / collection(path). A live game (games/<CODE>/…) goes through one WebSocket into
           that code's room; everything else (pilots, canon notes, saves) is plain HTTPS to the store.
     room  join('tumult-<CODE>'): the same socket's live channel between the game's screens.
     user  id(), can(), canEdit(), isOwner(), profiles(ids), from the sign-in module (T.Account).
     lobby watch(fn) → stop: who is online in Tumult now (the game's Lobby panel), while signed in.

   It also keeps a signed-in player's run in the cloud (saves/<user id>), so it follows them to another
   device. Who is signed in comes from T.Account (the sign-in module); a session is made only when
   something needs one (T.Account.ensure()), so a solo player never touches the server.
   ========================================================================== */
(function (T) {
  const B = T.Backend;
  const S = T.Server;
  if (!B || !S || !S.base) return; // no server yet (server/address.json): the web version plays solo
  const A = () => T.Account || null;
  const token = () => (A() && typeof A().token === 'function' && A().token()) || null;
  const me = () => (A() && typeof A().user === 'function' && A().user()) || null;
  /** Make a session if there is none (a guest, if nobody has signed in). */
  const ensure = async () => {
    if (A() && typeof A().ensure === 'function') await A().ensure();
    return token();
  };

  /* ───────────── HTTPS to the store ───────────── */
  const fail = (code, message) => Object.assign(new Error(message || code), { code });
  async function call(method, path, body) {
    const headers = {};
    const t = token();
    if (t) headers.Authorization = 'Bearer ' + t;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetch(S.base + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw fail('unavailable', 'the server did not answer');
    }
    let out = null;
    try {
      out = await res.json();
    } catch (e) {
      out = null;
    }
    if (!res.ok) throw fail((out && out.error) || 'http-' + res.status, out && out.message);
    return out;
  }
  const enc = (path) => path.split('/').map(encodeURIComponent).join('/');
  const snap = (id, exists, data) => ({
    id,
    exists,
    data: () => (exists ? JSON.parse(JSON.stringify(data)) : undefined),
  });

  /* ───────────── one socket per live game ───────────── */
  const INVITES = 'tumult_v2_invites'; // invite tokens this tab was given, by game code
  const invites = () => {
    try {
      return JSON.parse(sessionStorage.getItem(INVITES) || '{}');
    } catch (e) {
      return {};
    }
  };
  const keepInvite = (code, tok) => {
    try {
      sessionStorage.setItem(INVITES, JSON.stringify(Object.assign(invites(), { [code]: tok })));
    } catch (e) {
      /* the link can be opened again */
    }
  };
  const games = new Map(); // code → Game

  class Game {
    constructor(code) {
      this.code = code;
      this.ws = null;
      this.open = null; // a promise of an open socket
      this.n = 0;
      this.calls = new Map(); // id → { ok, no, timer }
      this.watches = new Map(); // wid → { path, fn, err }
      this.topics = new Map(); // topic → Set(fn)
      this.users = 0; // screens' handles still wanting this game (watches, rooms)
      this.tries = 0;
    }
    async connect() {
      if (this.open) return this.open;
      this.open = (async () => {
        const tok = await ensure();
        if (!tok) throw fail('unauthenticated', 'sign in to play online');
        const inv = invites()[this.code] || '';
        const q = '?session=' + encodeURIComponent(tok) + (inv ? '&invite=' + encodeURIComponent(inv) : '');
        // a WebSocket cannot say why it was turned away, so ask first
        await call('GET', `/api/room/${this.code}/can${inv ? '?invite=' + encodeURIComponent(inv) : ''}`);
        const ws = new WebSocket(S.base.replace(/^http/, 'ws') + `/api/room/${this.code}` + q);
        await new Promise((ok, no) => {
          ws.onopen = ok;
          ws.onerror = () => no(fail('unavailable', 'could not reach the game'));
        });
        this.ws = ws;
        this.tries = 0;
        ws.onmessage = (e) => this.receive(e.data);
        ws.onclose = () => this.closed(ws);
        ws.onerror = () => {};
        // after a reconnect, watch again what was watched
        for (const [wid, w] of this.watches) this.raw({ op: 'watch', wid, path: w.path });
        return ws;
      })();
      this.open.catch(() => (this.open = null));
      return this.open;
    }
    closed(ws) {
      if (this.ws !== ws) return;
      this.ws = null;
      this.open = null;
      for (const [, c] of this.calls) c.no(fail('unavailable', 'the connection to the game dropped'));
      this.calls.clear();
      if (this.users > 0) {
        const wait = Math.min(15000, 500 * 2 ** this.tries++);
        setTimeout(() => this.users > 0 && !this.ws && this.connect().catch(() => this.closed(null)), wait);
      }
    }
    raw(msg) {
      if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(msg));
    }
    async ask(msg) {
      const ws = await this.connect();
      const id = ++this.n;
      return new Promise((ok, no) => {
        const timer = setTimeout(() => {
          this.calls.delete(id);
          no(fail('unavailable', 'the game did not answer'));
        }, 15000);
        this.calls.set(id, {
          ok: (r) => (clearTimeout(timer), ok(r)),
          no: (e) => (clearTimeout(timer), no(e)),
        });
        ws.send(JSON.stringify(Object.assign({ id }, msg)));
      });
    }
    receive(text) {
      let m;
      try {
        m = JSON.parse(text);
      } catch (e) {
        return;
      }
      if (m.type === 'snap') {
        const w = this.watches.get(m.wid);
        if (w) w.fn(m);
      } else if (m.type === 'msg') {
        for (const fn of this.topics.get(m.topic) || []) fn({ data: m.data, isMe: false });
      } else if (m.id != null && this.calls.has(m.id)) {
        const c = this.calls.get(m.id);
        this.calls.delete(m.id);
        if (m.ok) c.ok(m.result);
        else c.no(fail(m.error, m.message));
      }
    }
    hold() {
      this.users++;
    }
    release() {
      if (--this.users > 0) return;
      setTimeout(() => {
        if (this.users > 0) return;
        if (this.ws) this.ws.close(1000, 'left');
        this.ws = null;
        this.open = null;
        games.delete(this.code);
      }, 2000);
    }
    watch(path, fn, err) {
      const wid = 'w' + ++this.n;
      this.watches.set(wid, { path, fn });
      this.hold();
      this.connect()
        .then(() => this.raw({ op: 'watch', wid, path }))
        .catch((e) => {
          this.watches.delete(wid);
          this.release();
          if (err) err(e);
        });
      return () => {
        if (!this.watches.delete(wid)) return;
        this.raw({ op: 'unwatch', wid });
        this.release();
      };
    }
  }
  const gameOf = (path) => {
    const code = path.split('/')[1];
    if (!games.has(code)) games.set(code, new Game(code));
    return games.get(code);
  };
  const live = (path) => /^games\/[A-Z]{4}(\/|$)/.test(path);

  /* ───────────── db ───────────── */
  function doc(path) {
    const id = path.split('/').pop();
    if (live(path)) {
      const g = gameOf(path);
      return {
        id,
        path,
        get: () => g.ask({ op: 'get', path }).then((r) => snap(id, r.exists, r.data)),
        set: (data) => g.ask({ op: 'set', path, data: JSON.parse(JSON.stringify(data)) }),
        delete: () => g.ask({ op: 'delete', path }),
        acquire: (o) => g.ask({ op: 'acquire', path, holder: o && o.holder, ttlMs: o && o.ttlMs }),
        onSnapshot: (fn, err) => g.watch(path, (m) => fn(snap(id, m.exists, m.data)), err),
      };
    }
    return {
      id,
      path,
      get: () => call('GET', '/api/doc/' + enc(path)).then((r) => snap(id, r.exists, r.data)),
      set: async (data) => {
        await ensure();
        return call('PUT', '/api/doc/' + enc(path), { data });
      },
      delete: () => call('DELETE', '/api/doc/' + enc(path)),
      // the store outside a live game has no live delivery: a watcher hears it now and every 20 s
      onSnapshot: (fn, err) => polled(() => doc(path).get(), fn, err),
    };
  }
  function collection(path) {
    const shape = (docs) => {
      const list = docs.map((d) => snap(d.id, true, d.data));
      return { docs: list, size: list.length, empty: !list.length, docChanges: () => [] };
    };
    if (live(path)) {
      const g = gameOf(path);
      return {
        get: () => g.ask({ op: 'list', path }).then((r) => shape(r.docs)),
        onSnapshot: (fn, err) => g.watch(path, (m) => fn(shape(m.docs || [])), err),
      };
    }
    return {
      get: () => call('GET', '/api/docs/' + enc(path)).then((r) => shape(r.docs)),
      onSnapshot: (fn, err) => polled(() => collection(path).get(), fn, err),
    };
  }
  const POLL_MS = 20000;
  function polled(read, fn, err) {
    let on = true;
    let timer = null;
    const look = () =>
      read().then(
        (s) => on && fn(s),
        (e) => on && err && err(e),
      );
    look();
    timer = setInterval(() => on && look(), POLL_MS);
    return () => {
      on = false;
      clearInterval(timer);
    };
  }
  const db = {
    doc,
    collection,
    /** The link a host shares so a player without an account can join this game. */
    invite: async (code) => {
      const r = await gameOf('games/' + code).ask({ op: 'invite' });
      const u = new URL(location.href);
      u.search = '';
      u.hash = '';
      u.searchParams.set('join', code);
      u.searchParams.set('invite', r.token);
      return u.toString();
    },
    /** This tab was given an invite (from a link): use it when it joins that game. */
    useInvite: (code, tok) => keepInvite(String(code).toUpperCase(), String(tok)),
    /** Why a call failed, as a player can act on it; null when the screen's own words fit. */
    explain: (e) => {
      const code = String((e && e.code) || '');
      if (code === 'needs-account' || code === 'unauthenticated')
        return 'Sign in to host a game. To join one without an account, open the invite link the host shares.';
      if (code === 'already-exists') return 'Someone else is using that game code. Try again for a new one.';
      return null;
    },
  };

  /* ───────────── room ───────────── */
  const room = {
    join: async (name) => {
      const code = String(name).replace(/^tumult-/, '');
      if (!/^[A-Z]{4}$/.test(code)) throw fail('invalid-argument', 'not a game room');
      const g = gameOf('games/' + code);
      g.hold();
      await g.connect();
      const mine = [];
      return {
        on: (topic, fn) => {
          if (!g.topics.has(topic)) g.topics.set(topic, new Set());
          g.topics.get(topic).add(fn);
          mine.push([topic, fn]);
          return () => g.topics.get(topic) && g.topics.get(topic).delete(fn);
        },
        emit: (topic, data) => g.ask({ op: 'emit', topic, data }),
        leave: async () => {
          mine.splice(0).forEach(([t, fn]) => g.topics.get(t) && g.topics.get(t).delete(fn));
          g.release();
        },
      };
    },
  };

  /* ───────────── user ───────────── */
  let roles = null;
  const rolesNow = async () => {
    if (!token()) return { reviewer: false, lead: false };
    if (!roles) roles = call('GET', '/api/me').catch(() => ({ reviewer: false, lead: false }));
    return roles;
  };
  const user = {
    id: async () => {
      const u = me();
      return (u && u.id) || null;
    },
    me: async () => {
      const u = me();
      return u ? { id: u.id, name: u.name || '' } : null;
    },
    // the server decides each write; the screens are not told in advance
    can: async () => null,
    canEdit: async () => !!(await rolesNow()).reviewer,
    isOwner: async () => !!(await rolesNow()).lead,
    profiles: async (ids) => {
      if (!ids || !ids.length) return {};
      const r = await call('GET', '/api/profiles?ids=' + ids.map(encodeURIComponent).join(','));
      return (r && r.profiles) || {};
    },
    signIn: () => A() && typeof A().signIn === 'function' && A().signIn(),
    guest: () => {
      const u = me();
      return !u || !!u.guest;
    },
  };

  /* ───────────── lobby: who is online ───────────── */
  // One socket for the page while someone is signed in (a guest made for an invite included). What
  // this screen is doing is read from the game every few seconds and sent only when it changes.
  const lobby = (() => {
    let ws = null;
    let players = [];
    let said = '';
    let tries = 0;
    let wanted = false;
    const fns = new Set();
    const status = () => {
      const N = T.UI && T.UI.net;
      if (N && N.online && N.online()) {
        const open =
          N.role === 'host' && N.code && !N.names.slice(1).every(Boolean)
            ? { code: N.code, players: N.names.filter(Boolean).length, max: N.names.length }
            : null;
        return { where: 'game', open };
      }
      return { where: T.UI && T.UI.run ? 'solo' : 'menu', open: null };
    };
    const tell = () => {
      const s = JSON.stringify(status());
      if (s === said || !ws || ws.readyState !== 1) return;
      said = s;
      ws.send(JSON.stringify({ op: 'status', status: JSON.parse(s) }));
    };
    function connect() {
      const t = token();
      if (!wanted || !t || ws) return;
      const sock = new WebSocket(S.base.replace(/^http/, 'ws') + '/api/lobby?session=' + encodeURIComponent(t));
      ws = sock;
      sock.onopen = () => {
        tries = 0;
        said = '';
        tell();
      };
      sock.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          if (m.type !== 'online') return;
          players = m.players || [];
          fns.forEach((fn) => fn(players));
        } catch (err) {
          /* not for us */
        }
      };
      sock.onclose = () => {
        if (ws !== sock) return;
        ws = null;
        if (wanted) setTimeout(connect, Math.min(30000, 1000 * 2 ** tries++));
      };
      sock.onerror = () => {};
    }
    setInterval(tell, 3000);
    return {
      /** Hear who is online: fn(players) now and on every change. Returns a function that stops it. */
      watch(fn) {
        fns.add(fn);
        fn(players);
        return () => fns.delete(fn);
      },
      players: () => players.slice(),
      /** Signed in: be in the lobby. Signed out: leave it. */
      follow() {
        wanted = !!token();
        if (wanted) connect();
        else if (ws) {
          const w = ws;
          ws = null;
          w.close(1000, 'signed out');
          players = [];
          fns.forEach((fn) => fn(players));
        }
      },
    };
  })();

  B.register({
    name: 'tumult-worker',
    capabilities: ['db', 'room', 'user', 'lobby'],
    available: () => typeof fetch === 'function' && typeof WebSocket === 'function',
    use: (capability) => ({ db, room, user, lobby })[capability] || null,
  });

  /* ───────────── cloud saves ───────────── */
  // A signed-in player's run and record are kept in saves/<user id> as well as on the device. A device
  // with no run of its own takes the cloud's; one that has a run never has it replaced unasked.
  const CLOUD_AT = 'tumult_v2_cloud_at';
  const local = {
    get: (k) => {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set: (k, v) => {
      try {
        if (v == null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
      } catch (e) {
        /* no storage: nothing to keep */
      }
    },
  };
  let pushTimer = null;
  const savePath = () => (me() && me().id ? 'saves/' + me().id : null);
  function pushSoon() {
    if (!savePath() || !token()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      const path = savePath();
      if (!path) return;
      const at = Date.now();
      call('PUT', '/api/doc/' + enc(path), { data: { run: local.get('tumult_v2_run'), meta: T.loadMeta(), at } })
        .then(() => local.set(CLOUD_AT, String(at)))
        .catch(() => {});
    }, 2500);
  }
  for (const name of ['saveRun', 'clearSave', 'saveMeta']) {
    const real = T[name];
    if (typeof real !== 'function') continue;
    T[name] = function () {
      const r = real.apply(this, arguments);
      pushSoon();
      return r;
    };
  }
  async function pull() {
    const path = savePath();
    if (!path || !token()) return;
    let cloud;
    try {
      const r = await call('GET', '/api/doc/' + enc(path));
      cloud = r.exists ? r.data : null;
    } catch (e) {
      return;
    }
    if (!cloud) return pushSoon(); // the first device of this account: the cloud starts from here
    if (+cloud.at <= +(local.get(CLOUD_AT) || 0)) return;
    // the record: the best of both
    const meta = T.loadMeta();
    const theirs = cloud.meta || {};
    Object.keys(theirs).forEach((k) => {
      if (typeof theirs[k] === 'number' && !(meta[k] >= theirs[k])) meta[k] = theirs[k];
    });
    local.set('tumult_v2_meta', JSON.stringify(meta));
    if (cloud.run && !local.get('tumult_v2_run')) {
      local.set('tumult_v2_run', cloud.run);
      if (T.UI && T.UI.screen === 'title' && T.UI.render) T.UI.render();
    }
    local.set(CLOUD_AT, String(cloud.at));
  }
  let who = null;
  function accountChanged() {
    const u = me();
    const id = (u && u.id) || null;
    if (id === who) return;
    who = id;
    roles = null;
    pull();
    lobby.follow();
    B.changed();
  }
  if (A() && typeof A().onChange === 'function') A().onChange(accountChanged);
  setTimeout(accountChanged, 0);
})((window.T = window.T || {}));
