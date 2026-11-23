// Accounts on the Worker (server/src/auth/), run against the real migration in an in-memory SQLite that
// stands in for D1, with Google, Discord and Resend answered by a fake fetch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1 } from './d1.mjs';
import { handleAuth, authenticate, requireAccount, sweepAuth, cors, cleanName } from '../src/auth/index.js';
import { nameProblem, clean, cleanAvatar, pictureUrl } from '../src/auth/names.js';

const MIGRATION_FILES = ['0002_auth.sql', '0003_profile.sql'];
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
  const people = {
    google: { sub: 'g-1', given_name: 'Ada', picture: 'https://lh3.googleusercontent.com/a/ada=s96-c' },
    discord: { id: 'd-1', global_name: 'Bram', avatar: 'abc123' },
  };
  const pictures = [];
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
    if (u.startsWith('https://lh3.googleusercontent.com/') || u.startsWith('https://cdn.discordapp.com/')) {
      pictures.push(u);
      return new Response(new Uint8Array([137, 80, 78, 71]), { status: 200, headers: { 'Content-Type': 'image/png' } });
    }
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
  return { env, call, oauth, mail, people, merges, deletes, codeFromMail, pictures };
}

test('a guest gets a session; the database keeps only its hash', async () => {
  const t = setup();
  const g = await t.call('POST', '/auth/guest', { body: { name: '  Wren\u0007 ' } });
  assert.equal(g.res.status, 200);
  assert.match(g.data.token, /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(
    { ...g.data.user, id: 'x', created: 0 },
    { id: 'x', name: 'Wren', guest: true, links: [], created: 0, avatar: '', pictures: [], renameAt: 0 },
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
  const html = await t.call('PATCH', '/auth/me', { token: g.data.token, body: { name: '<b>Quill</b>' } });
  assert.equal(html.res.status, 400, 'markup is not a name');
  const renamed = await t.call('PATCH', '/auth/me', { token: g.data.token, body: { name: 'Quill' } });
  assert.equal(renamed.data.user.name, 'Quill');
  assert.equal((await t.call('PATCH', '/auth/me', { token: g.data.token, body: { name: '   ' } })).res.status, 400);
  const back = await t.oauth('google', g.data.token);
  const full = await authenticate(
    new Request(API + '/x', { headers: { Authorization: 'Bearer ' + back.tumult_session } }),
    t.env,
  );
  assert.equal(requireAccount(full), null);
  assert.equal(full.name, 'Quill', 'a name the player chose is kept when linking');
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

test('display names: length, letters, the word filter and reserved words', () => {
  for (const ok of ['Shombith', 'Cassidy', 'Grape', "Jo's Crew", 'Rosh-7', 'Dickens', 'Essex', 'Ñandú', 'Hancock'])
    assert.equal(nameProblem(ok), '', ok);
  for (const bad of [
    'ab',
    'x'.repeat(21),
    '12345',
    '<b>',
    'Admin',
    'TUMULT',
    'Guest 1234',
    'sh1t',
    'Fuuuck',
    'Big Dick',
  ])
    assert.notEqual(nameProblem(bad), '', bad);
  assert.equal(clean('Ass Kicker'), false, 'a short word on its own');
  assert.equal(clean('Classy'), true, 'inside another word it passes');
  assert.equal(cleanAvatar('p:BANDIT'), 'p:BANDIT');
  assert.equal(cleanAvatar('initials'), 'initials');
  assert.equal(cleanAvatar('google'), 'google');
  assert.equal(cleanAvatar(''), '');
  assert.equal(cleanAvatar('p:../x'), null);
  assert.equal(cleanAvatar('https://evil.example/x.png'), null);
  assert.equal(pictureUrl('https://lh3.googleusercontent.com/a/x'), 'https://lh3.googleusercontent.com/a/x');
  assert.equal(pictureUrl('http://lh3.googleusercontent.com/a/x'), null);
  assert.equal(pictureUrl('https://evil.example/a.png'), null);
});

test("an account's name is its own, checked while typing, and changes once a day", async () => {
  const t = setup();
  const a = await t.oauth('google');
  const b = await t.oauth('discord');
  const ta = a.tumult_session;
  const tb = b.tumult_session;
  assert.equal((await t.call('GET', '/auth/me', { token: ta })).data.user.name, 'Ada');
  const check = (token, name) => t.call('GET', '/auth/name?name=' + encodeURIComponent(name), { token });
  assert.deepEqual((await check(tb, 'Moss')).data, { ok: true, problem: '' });
  assert.equal((await check(tb, ' a D a ')).data.ok, false, 'case and spaces do not make a new name');
  assert.equal((await check(ta, 'ADA')).data.ok, true, 'your own name is yours');
  const taken = await t.call('PATCH', '/auth/me', { token: tb, body: { name: 'ada' } });
  assert.equal(taken.res.status, 409);
  assert.match(taken.data.message, /already flies as/);
  const bad = await t.call('PATCH', '/auth/me', { token: tb, body: { name: 'sh1thead' } });
  assert.equal(bad.res.status, 400);
  const ok = await t.call('PATCH', '/auth/me', { token: tb, body: { name: 'Moss' } });
  assert.equal(ok.data.user.name, 'Moss');
  assert.ok(ok.data.user.renameAt > Date.now(), 'the next change waits a day');
  const again = await t.call('PATCH', '/auth/me', { token: tb, body: { name: 'Wren' } });
  assert.equal(again.res.status, 429);
  const recase = await t.call('PATCH', '/auth/me', { token: tb, body: { name: 'MOSS' } });
  assert.equal(recase.data.user.name, 'MOSS', 'a change of case is free');
  // the database itself refuses two accounts with one name
  assert.throws(() => t.env.DB.raw.prepare("UPDATE users SET name_key = 'ada' WHERE name = 'MOSS'").run());
});

test('a guest becoming an account takes a free, clean name', async () => {
  const t = setup();
  await t.oauth('google'); // Ada
  const g = await t.call('POST', '/auth/guest', {});
  const back = await t.oauth('google', g.data.token); // same Google: folds into Ada
  assert.ok(back.tumult_session);
  const g2 = await t.call('POST', '/auth/guest', {});
  t.people.discord = { id: 'd-9', global_name: 'Ada' };
  await t.oauth('discord', g2.data.token);
  const u = (await t.call('GET', '/auth/me', { token: g2.data.token })).data.user;
  assert.match(u.name, /^Ada \d{4}$/, 'a taken name gets digits');
  const g3 = await t.call('POST', '/auth/guest', { body: { name: 'Twat' } });
  t.people.discord = { id: 'd-10', global_name: 'Nice' };
  await t.oauth('discord', g3.data.token);
  assert.match((await t.call('GET', '/auth/me', { token: g3.data.token })).data.user.name, /^Pilot \d{4}$/);
});

test('avatars: a pilot painting, or the sign-in picture served through us', async () => {
  const t = setup();
  const a = await t.oauth('google');
  const tok = a.tumult_session;
  const me = (await t.call('GET', '/auth/me', { token: tok })).data.user;
  assert.deepEqual(me.pictures, ['google']);
  assert.equal(
    (await t.call('PATCH', '/auth/me', { token: tok, body: { avatar: 'p:BANDIT' } })).data.user.avatar,
    'p:BANDIT',
  );
  assert.equal((await t.call('PATCH', '/auth/me', { token: tok, body: { avatar: 'javascript:x' } })).res.status, 400);
  const nope = await t.call('PATCH', '/auth/me', { token: tok, body: { avatar: 'discord' } });
  assert.equal(nope.res.status, 400, 'no Discord picture to show');
  assert.equal((await t.call('GET', '/auth/picture/' + me.id)).res.status, 404, 'a painting is not served here');
  await t.call('PATCH', '/auth/me', { token: tok, body: { avatar: 'google' } });
  const pic = await t.call('GET', '/auth/picture/' + me.id);
  assert.equal(pic.res.status, 200);
  assert.equal(pic.res.headers.get('Content-Type'), 'image/png');
  assert.deepEqual(t.pictures, ['https://lh3.googleusercontent.com/a/ada=s96-c']);
  const who = await authenticate(new Request(API + '/x', { headers: { Authorization: 'Bearer ' + tok } }), t.env);
  assert.equal(who.avatar, 'google', 'the lobby hears the avatar');
  await t.call('PATCH', '/auth/me', { token: tok, body: { avatar: '' } });
  assert.equal((await t.call('GET', '/auth/picture/' + me.id)).res.status, 404, 'initials: nothing to serve');
  const d = await t.oauth('discord', tok);
  assert.ok(d.tumult_session);
  const both = (await t.call('GET', '/auth/me', { token: tok })).data.user;
  assert.deepEqual(both.pictures.sort(), ['discord', 'google']);
});
