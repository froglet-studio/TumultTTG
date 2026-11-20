// Accounts on the Worker (server/src/auth/), run against the real migration in an in-memory SQLite that
// stands in for D1, with Google, Discord and Resend answered by a fake fetch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1 } from './d1.mjs';
import { handleAuth, authenticate, requireAccount, sweepAuth, cors, cleanName } from '../src/auth/index.js';

const MIGRATION_FILES = ['0002_auth.sql'];
const API = 'https://api.tumult.froglet.games';
const GAME = 'https://tumult.froglet.games/';

function setup(extra = {}) {
  const env = {
    DB: fakeD1(MIGRATION_FILES),
    GOOGLE_CLIENT_ID: 'gid',
    GOOGLE_CLIENT_SECRET: 'gsecret',
    DISCORD_CLIENT_ID: 'did',
    DISCORD_CLIENT_SECRET: 'dsecret',
    RESEND_API_KEY: 're_test',
    EMAIL_FROM: 'Tumult <play@froglet.games>',
    AUTH_PEPPER: 'pp-s3cret-value',
    ...extra,
  };
  const mail = [];
  const people = { google: { sub: 'g-1', given_name: 'Ada' }, discord: { id: 'd-1', global_name: 'Bram' } };
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const ok = (b) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (u === 'https://oauth2.googleapis.com/token' || u === 'https://discord.com/api/oauth2/token') {
      const f = new URLSearchParams(init.body);
      assert.ok(f.get('code_verifier'), 'PKCE verifier sent');
      return ok({ access_token: 'at-' + f.get('code') });
    }
    if (u === 'https://openidconnect.googleapis.com/v1/userinfo') return ok(people.google);
    if (u === 'https://discord.com/api/users/@me') return ok(people.discord);
    if (u === 'https://api.resend.com/emails') {
      mail.push(JSON.parse(init.body));
      return ok({ id: 'm1' });
    }
    throw new Error('unexpected fetch ' + u);
  };
  const merges = [];
  const deletes = [];
  const hooks = {
    mergeUser: async (e, from, into) => merges.push([from, into]),
    deleteUser: async (e, id) => deletes.push(id),
  };
  const call = async (method, path, { token, body, origin = 'https://tumult.froglet.games' } = {}) => {
    const headers = { Origin: origin };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body) headers['Content-Type'] = 'application/json';
    const res = await handleAuth(
      new Request(API + path, { method, headers, body: body && JSON.stringify(body) }),
      env,
      {},
      hooks,
    );
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {}
    return { res, data, text };
  };
  /** Go through Google or Discord as the browser would; returns the fragment the game page receives. */
  const oauth = async (provider, token) => {
    const s = await call('POST', '/auth/start/' + provider, { token, body: { return: GAME + '?x=1#old' } });
    assert.equal(s.res.status, 200, s.text);
    const out = new URL(s.data.url);
    const state = out.searchParams.get('state');
    assert.equal(out.searchParams.get('redirect_uri'), API + '/auth/callback/' + provider);
    const cb = await call('GET', `/auth/callback/${provider}?code=c1&state=${state}`);
    assert.equal(cb.res.status, 302);
    const loc = new URL(cb.res.headers.get('Location'));
    assert.equal(loc.origin + loc.pathname + loc.search, GAME + '?x=1');
    return { ...Object.fromEntries(new URLSearchParams(loc.hash.slice(1))), state };
  };
  const codeFromMail = () => /(\d{6})/.exec(mail.at(-1).subject)[1];
  return { env, call, oauth, mail, people, merges, deletes, codeFromMail };
}

test('a guest gets a session; the database keeps only its hash', async () => {
  const t = setup();
  const g = await t.call('POST', '/auth/guest', { body: { name: '  Wren\u0007 ' } });
  assert.equal(g.res.status, 200);
  assert.match(g.data.token, /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(
    { ...g.data.user, id: 'x', created: 0 },
    { id: 'x', name: 'Wren', guest: true, links: [], created: 0 },
  );
  assert.equal(g.res.headers.get('Access-Control-Allow-Origin'), 'https://tumult.froglet.games');
  const stored = t.env.DB.raw.prepare('SELECT token_hash FROM sessions').all();
  assert.equal(stored.length, 1);
  assert.notEqual(stored[0].token_hash, g.data.token);
  const me = await t.call('GET', '/auth/me', { token: g.data.token });
  assert.equal(me.data.user.id, g.data.user.id);
  const ws = await authenticate(new Request(API + '/api/room?session=' + g.data.token), t.env);
  assert.equal(ws.userId, g.data.user.id);
  assert.equal(ws.guest, true);
  assert.equal((await t.call('GET', '/auth/me')).res.status, 401);
  assert.equal((await t.call('GET', '/auth/me', { token: 'x'.repeat(43) })).res.status, 401);
});

test('a guest who links Google keeps the same account and stops being a guest', async () => {
  const t = setup();
  const g = await t.call('POST', '/auth/guest', {});
  assert.match(g.data.user.name, /^Guest \d{4}$/);
  const back = await t.oauth('google', g.data.token);
  assert.ok(back.tumult_session);
  const me = await t.call('GET', '/auth/me', { token: back.tumult_session });
  assert.equal(me.data.user.id, g.data.user.id);
  assert.equal(me.data.user.guest, false);
  assert.equal(me.data.user.name, 'Ada', 'a default guest name takes the provider name');
  assert.deepEqual(me.data.user.links, ['google']);
  // the state is one use only
  const again = await t.call('GET', `/auth/callback/google?code=c1&state=${back.state}`);
  assert.equal(again.res.status, 400);
  // linking Google twice is refused politely
  const twice = await t.call('POST', '/auth/start/google', { token: back.tumult_session, body: { return: GAME } });
  const st = new URL(twice.data.url).searchParams.get('state');
  t.people.google = { sub: 'g-2', given_name: 'Other' };
  const cb = await t.call('GET', `/auth/callback/google?code=c2&state=${st}`);
  assert.match(cb.res.headers.get('Location'), /#tumult_auth_error=/);
});

test('signing in on another device finds the same account; a guest there is folded into it', async () => {
  const t = setup();
  const a = await t.call('POST', '/auth/guest', {});
  await t.oauth('discord', a.data.token);
  const b = await t.call('POST', '/auth/guest', {});
  const back = await t.oauth('discord', b.data.token);
  const me = await t.call('GET', '/auth/me', { token: back.tumult_session });
  assert.equal(me.data.user.id, a.data.user.id);
  assert.deepEqual(t.merges, [[b.data.user.id, a.data.user.id]]);
  assert.equal((await t.call('GET', '/auth/me', { token: b.data.token })).res.status, 401, 'the folded guest is gone');
  // with no session at all, Discord simply signs in
  const fresh = await t.oauth('discord', null);
  assert.equal((await t.call('GET', '/auth/me', { token: fresh.tumult_session })).data.user.id, a.data.user.id);
});

test('two full accounts are never merged', async () => {
  const t = setup();
  const a = await t.call('POST', '/auth/guest', {});
  await t.oauth('google', a.data.token);
  const b = await t.call('POST', '/auth/guest', {});
  await t.oauth('discord', b.data.token); // b is a full account now
  const back = await t.oauth('google', b.data.token);
  assert.match(back.tumult_auth_error, /already belongs to another Tumult account/);
  assert.deepEqual(t.merges, []);
});

test('email: a six-digit code, limited tries, one code a minute', async () => {
  const t = setup();
  const g = await t.call('POST', '/auth/guest', {});
  const s = await t.call('POST', '/auth/email/start', { body: { email: ' Ada@Example.com ' } });
  assert.equal(s.res.status, 200, s.text);
  assert.deepEqual(t.mail.at(-1).to, ['ada@example.com']);
  assert.equal(t.env.DB.raw.prepare('SELECT * FROM email_codes').all()[0].email_hash.includes('example'), false);
  const soon = await t.call('POST', '/auth/email/start', { body: { email: 'ada@example.com' } });
  assert.equal(soon.res.status, 429);
  const code = t.codeFromMail();
  const wrong = await t.call('POST', '/auth/email/verify', {
    token: g.data.token,
    body: { email: 'ada@example.com', code: code === '000000' ? '111111' : '000000' },
  });
  assert.equal(wrong.data.error, 'wrong_code');
  const right = await t.call('POST', '/auth/email/verify', {
    token: g.data.token,
    body: { email: 'ADA@example.com', code },
  });
  assert.equal(right.res.status, 200, right.text);
  assert.equal(right.data.token, null, 'linking keeps the session the player has');
  assert.equal(right.data.user.id, g.data.user.id);
  assert.deepEqual(right.data.user.links, ['email']);
  assert.equal(
    (await t.call('POST', '/auth/email/verify', { body: { email: 'ada@example.com', code } })).data.error,
    'code_expired',
  );
  // too many wrong tries end the code
  t.env.DB.raw.exec('DELETE FROM email_codes');
  await t.call('POST', '/auth/email/start', { body: { email: 'bo@example.com' } });
  const good = t.codeFromMail();
  for (let i = 0; i < 5; i++)
    await t.call('POST', '/auth/email/verify', {
      body: { email: 'bo@example.com', code: good === '123456' ? '654321' : '123456' },
    });
  assert.equal(
    (await t.call('POST', '/auth/email/verify', { body: { email: 'bo@example.com', code: good } })).data.error,
    'code_expired',
  );
});

test('only our own pages may start a sign-in or read answers', async () => {
  const t = setup();
  const bad = await t.call('POST', '/auth/start/google', { body: { return: 'https://evil.example/' } });
  assert.equal(bad.res.status, 400);
  const lookalike = await t.call('POST', '/auth/start/google', {
    body: { return: 'https://tumult.froglet.games.evil.example/' },
  });
  assert.equal(lookalike.res.status, 400);
  assert.equal(
    (await t.call('POST', '/auth/start/google', { body: { return: 'https://pr-12.tumult.pages.dev/' } })).res.status,
    200,
  );
  assert.equal(
    (await t.call('POST', '/auth/start/google', { body: { return: 'http://localhost:5173/' } })).res.status,
    200,
  );
  const req = (o) => new Request(API + '/auth/me', { headers: { Origin: o } });
  assert.deepEqual(cors(req('https://evil.example'), t.env), {});
  assert.equal(
    cors(req('https://www.froglet.games'), t.env)['Access-Control-Allow-Origin'],
    'https://www.froglet.games',
  );
  const pre = await handleAuth(
    new Request(API + '/auth/guest', { method: 'OPTIONS', headers: { Origin: 'https://tumult.froglet.games' } }),
    t.env,
    {},
  );
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get('Access-Control-Allow-Headers'), /Authorization/);
});

test('a provider without settings is not offered', async () => {
  const t = setup({ DISCORD_CLIENT_SECRET: '', RESEND_API_KEY: '' });
  assert.deepEqual((await t.call('GET', '/auth/providers')).data, { google: true, discord: false, email: false });
  assert.equal((await t.call('POST', '/auth/start/discord', { body: { return: GAME } })).res.status, 404);
  assert.equal((await t.call('POST', '/auth/email/start', { body: { email: 'a@b.co' } })).res.status, 404);
  const chk = await t.call('GET', '/auth/check');
  assert.equal(chk.data.discord.client_secret_set, false);
  assert.ok(!chk.text.includes('gsecret') && !chk.text.includes('pp-s3cret-value'), 'the check never shows a secret');
});

test('rename, sign out, delete, and the rule for online play', async () => {
  const t = setup();
  const g = await t.call('POST', '/auth/guest', {});
  const guest = await authenticate(
    new Request(API + '/x', { headers: { Authorization: 'Bearer ' + g.data.token } }),
    t.env,
  );
  assert.equal(requireAccount(null).status, 401);
  assert.equal(requireAccount(guest).status, 403);
  const renamed = await t.call('PATCH', '/auth/me', { token: g.data.token, body: { name: '<b>Quill</b>' } });
  assert.equal(renamed.data.user.name, '<b>Quill</b>', 'stored as typed; screens escape it');
  assert.equal((await t.call('PATCH', '/auth/me', { token: g.data.token, body: { name: '   ' } })).res.status, 400);
  const back = await t.oauth('google', g.data.token);
  const full = await authenticate(
    new Request(API + '/x', { headers: { Authorization: 'Bearer ' + back.tumult_session } }),
    t.env,
  );
  assert.equal(requireAccount(full), null);
  assert.equal(full.name, '<b>Quill</b>', 'a name the player chose is kept when linking');
  await t.call('POST', '/auth/signout', { token: g.data.token });
  assert.equal((await t.call('GET', '/auth/me', { token: g.data.token })).res.status, 401);
  assert.equal(
    (await t.call('GET', '/auth/me', { token: back.tumult_session })).res.status,
    200,
    'other sessions stay',
  );
  await t.call('DELETE', '/auth/me', { token: back.tumult_session });
  assert.deepEqual(t.deletes, [g.data.user.id]);
  assert.equal(t.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
  assert.equal(t.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM identities').get().n, 0);
});

test('the sweep clears expired rows and long-idle guests only', async () => {
  const t = setup();
  const g = await t.call('POST', '/auth/guest', {});
  const k = await t.call('POST', '/auth/guest', {});
  await t.oauth('google', k.data.token);
  const old = Date.now() - 401 * 86400000;
  t.env.DB.raw.prepare('UPDATE users SET seen_at = ?').run(old);
  const r = await sweepAuth(t.env);
  assert.equal(r.guestsRemoved, 1);
  assert.equal((await t.call('GET', '/auth/me', { token: g.data.token })).res.status, 401);
  assert.equal(t.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1, 'a full account is never swept');
});

test('names are one printable line', () => {
  assert.equal(cleanName('a\nb\u202Ec  d'), 'abc d');
  assert.equal(cleanName('x'.repeat(40)).length, 24);
  assert.equal(cleanName(null), '');
});
