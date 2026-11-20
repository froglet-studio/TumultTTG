'use strict';
// The game's side of accounts (src/ui/account.js), end to end against the Worker's own code
// (server/src/auth/) over an in-memory database: guest first, linking, the title line and the box.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(root, 'src', 'ui', 'account.js'), 'utf8');
const imp = (rel) => import(pathToFileURL(path.join(root, rel)).href);

async function world({ server = true, ui = true } = {}) {
  const { handleAuth } = await imp('server/src/auth/index.js');
  const { fakeD1 } = await imp('server/test/d1.mjs');
  const env = { DB: fakeD1(), GOOGLE_CLIENT_ID: 'g', GOOGLE_CLIENT_SECRET: 'gs', AUTH_PEPPER: 'p' };
  const calls = [];
  const store = new Map();
  const ctx = {
    console,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    AbortController,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    location: { href: 'https://tumult.froglet.games/', hash: '', assign: (u) => (ctx.went = u) },
    history: { replaceState: (a, b, u) => ((ctx.location.href = u), (ctx.location.hash = '')) },
    addEventListener: (ev, fn) => ev === 'load' && (ctx.onload = fn),
    fetch: async (url, init = {}) => {
      calls.push(init.method + ' ' + url);
      const req = new Request(url, { ...init, headers: { ...init.headers, Origin: 'https://tumult.froglet.games' } });
      return handleAuth(req, env, {}, {});
    },
  };
  ctx.window = ctx;
  ctx.T = { Server: server ? { base: 'https://api.tumult.froglet.games' } : undefined };
  const shown = [];
  if (ui)
    ctx.T.UI = {
      screen: 'title',
      modal: null,
      esc: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]),
      openModal(html) {
        this.modal = { html };
        shown.push(html);
      },
      render() {},
      toast: (m) => shown.push('toast:' + m),
    };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'account.js' });
  return { ctx, A: ctx.T.Account, U: ctx.T.UI, env, calls, store, shown };
}

test('without a server the account code makes no request and draws nothing', async () => {
  const w = await world({ server: false });
  assert.equal(w.A.available(), false);
  assert.equal(w.U.titleAccount(), '');
  w.ctx.onload();
  await assert.rejects(w.A.ensure(), /not available/);
  assert.deepEqual(w.calls, []);
});

test('solo play never reaches the server; the first online need makes one guest account', async () => {
  const w = await world();
  w.ctx.onload();
  assert.deepEqual(w.calls, [], 'loading the page with no account asks nothing');
  assert.match(w.U.titleAccount(), /Playing as a guest\..*Sign in/);
  const [a, b] = await Promise.all([w.A.ensure(), w.A.ensure()]);
  assert.equal(a.id, b.id, 'two callers at once share one guest');
  assert.equal(w.calls.filter((c) => c.includes('/auth/guest')).length, 1);
  assert.equal(a.guest, true);
  assert.ok(JSON.parse(w.store.get('tumult_v2_account')).token);
  assert.equal((await w.A.ensure()).id, a.id);
  assert.match(w.U.titleAccount(), new RegExp(`Playing as <b>${a.name}</b>, a guest`));
});

test('a guest links Google and comes back signed in to the same account', async () => {
  const w = await world();
  const g = await w.A.ensure();
  // leave for Google
  await w.A.signIn('google');
  const out = new URL(w.ctx.went);
  assert.equal(out.host, 'accounts.google.com');
  // Google answers the Worker; the Worker sends the browser back with a session in the fragment
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u) => {
    const ok = (b) => new Response(JSON.stringify(b), { status: 200 });
    if (String(u).includes('oauth2.googleapis.com')) return ok({ access_token: 'at' });
    return ok({ sub: 'g-7', given_name: 'Ada' });
  };
  const { handleAuth } = await imp('server/src/auth/index.js');
  const cb = await handleAuth(
    new Request(`https://api.tumult.froglet.games/auth/callback/google?code=c&state=${out.searchParams.get('state')}`),
    w.env,
    {},
    {},
  );
  globalThis.fetch = realFetch;
  const loc = cb.headers.get('Location');
  w.ctx.location.href = loc;
  w.ctx.location.hash = loc.slice(loc.indexOf('#'));
  const r = await w.A.takeReturn();
  assert.equal(r.user.id, g.id);
  assert.equal(r.user.guest, false);
  assert.equal(w.ctx.location.hash, '', 'the token leaves the address bar');
  assert.match(w.U.titleAccount(), /Signed in as <b>Ada<\/b>.*with Google/);
});

test('the account box offers what the server has, and escapes names', async () => {
  const w = await world();
  await w.A.ensure();
  await w.A.rename('<i>Wren</i>');
  w.U.askSignIn('Sign in to host a game.');
  await new Promise((r) => setTimeout(r, 20));
  const html = w.U.modal.html;
  assert.match(html, /Sign in to host a game\./);
  assert.match(html, /Continue with Google/);
  assert.doesNotMatch(html, /Discord|Email me a code/, 'Discord and email are not set up in this test');
  assert.ok(html.includes('&lt;i&gt;Wren&lt;/i&gt;') && !html.includes('<i>Wren'));
});

test('a session the server no longer knows is forgotten; delete removes the account', async () => {
  const w = await world();
  await w.A.ensure();
  w.env.DB.raw.exec('DELETE FROM sessions');
  await assert.rejects(w.A.refresh(), /ended/);
  assert.equal(w.A.token(), null);
  const u = await w.A.ensure();
  await w.A.remove();
  assert.equal(w.A.user(), null);
  assert.equal(w.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM users WHERE id = ?').get(u.id).n, 0);
});
