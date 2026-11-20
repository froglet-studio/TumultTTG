/* ============================================================================
   TUMULT ACCOUNTS — guest first, then link Google, Discord or email to keep it.
   docs/reference/ACCOUNTS.md has the whole story and the admin setup.

   Every player who goes online gets a guest account the first time something needs one (solo play never
   reaches the server). A guest can link Google, Discord or an email address at any time; the account id
   stays the same, so their pilots, saves and notes stay theirs. Signing in on another device with the same
   Google, Discord or email gives the same account.

   For the rest of the Worker (server/src/index.js):
     handleAuth(request, env, ctx, hooks)  every /auth/* request; hooks = { mergeUser, deleteUser }
     authenticate(request, env)            → { userId, guest, name } | null, from "Authorization: Bearer"
                                             or ?session= (WebSockets cannot send headers)
     requireAccount(user)                  → null when allowed, else a 401/403 Response
     cors(request, env)                    → the CORS headers for an allowed origin ({} for others)
     sweepAuth(env)                        expired sessions, states and codes; guests idle 400 days

   Routes (JSON in and out unless said):
     GET    /auth/providers                which sign-ins this server offers { google, discord, email }
     POST   /auth/guest     { name? }      → { token, user }   a new guest account
     GET    /auth/me                       → { user }
     PATCH  /auth/me        { name }       → { user }
     DELETE /auth/me                       deletes the account and everything it owns
     POST   /auth/signout                  ends this session
     POST   /auth/start/<google|discord> { return } → { url }   link (with a session) or sign in (without)
     GET    /auth/callback/<provider>      the provider sends the player here; we send them back to the
                                           game with #tumult_session=<token> or #tumult_auth_error=<why>
     POST   /auth/email/start  { email }   mails a six-digit code (Resend)
     POST   /auth/email/verify { email, code } → { token, user }   link (with a session) or sign in
     GET    /auth/check                    which settings are present (never a secret), for setup
   ========================================================================== */
import { randomToken, newUserId, sixDigits, sha256, challengeOf, hmac, same } from './crypto.js';
import { PROVIDERS } from './providers.js';

const DAY = 86400000;
const SESSION_MS = 400 * DAY; // sliding: refreshed on use, so a player who keeps playing never loses a guest account
const STATE_MS = 10 * 60000;
const CODE_MS = 15 * 60000;
const CODE_GAP_MS = 60000;
const CODE_TRIES = 5;
const IDLE_GUEST_MS = 400 * DAY;
const DEFAULT_ORIGINS = 'https://tumult.froglet.games,https://www.froglet.games,https://*.tumult.pages.dev';

/* ───────────── settings ───────────── */
const trim = (v) => String(v || '').trim();
const origins = (env) =>
  trim(env.ALLOWED_ORIGIN || DEFAULT_ORIGINS)
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

/** Is this origin one of ours? "https://*.x" allows any subdomain of x; http only for localhost. */
export function originAllowed(origin, env) {
  let u;
  try {
    u = new URL(origin);
  } catch {
    return false;
  }
  if (u.username || u.password) return false;
  if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return true;
  if (u.protocol !== 'https:') return false;
  return origins(env).some((a) =>
    a.startsWith('https://*.') ? u.hostname.endsWith('.' + a.slice('https://*.'.length)) : u.origin === a,
  );
}

/** A page of ours to send the player back to, without its fragment; null for anything else. */
function returnUrl(value, env) {
  let u;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  if (!originAllowed(u.origin, env)) return null;
  u.hash = '';
  return u.toString();
}

export function cors(request, env) {
  const o = request.headers.get('Origin');
  if (!o || !originAllowed(o, env)) return {};
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/* ───────────── responses ───────────── */
const json = (request, env, body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(request, env) },
  });
const fail = (request, env, status, error, message) => json(request, env, { error, message }, status);

function backTo(url, key, value) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url + '#' + key + '=' + encodeURIComponent(value),
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function page(message, status) {
  const safe = String(message).replace(
    /[<>&"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c],
  );
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tumult</title><body style="background:#04070f;color:#cfe3f0;font:16px system-ui;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px;text-align:center"><p>${safe}</p>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      },
    },
  );
}

const body = async (request) => {
  try {
    const b = await request.json();
    return b && typeof b === 'object' ? b : {};
  } catch {
    return {};
  }
};

/** A name other players may see: printable, one line, 1 to 24 characters. */
export function cleanName(v) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
}
const guestName = () => 'Guest ' + sixDigits().slice(0, 4);

async function limited(env, request, what) {
  if (!env.AUTH_LIMITER || typeof env.AUTH_LIMITER.limit !== 'function') return false;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  try {
    const { success } = await env.AUTH_LIMITER.limit({ key: what + ':' + ip });
    return !success;
  } catch {
    return false;
  }
}

/* ───────────── accounts ───────────── */
async function userJson(env, id) {
  const u = await env.DB.prepare('SELECT id, name, guest, created_at FROM users WHERE id = ?').bind(id).first();
  if (!u) return null;
  const { results } = await env.DB.prepare('SELECT provider FROM identities WHERE user_id = ? ORDER BY created_at')
    .bind(id)
    .all();
  return {
    id: u.id,
    name: u.name,
    guest: !!u.guest,
    links: (results || []).map((r) => r.provider),
    created: u.created_at,
  };
}

async function newSession(env, userId) {
  const token = randomToken(32);
  const now = Date.now();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), userId, now, now + SESSION_MS)
    .run();
  return token;
}

async function createUser(env, name, guest) {
  const id = newUserId();
  const now = Date.now();
  await env.DB.prepare('INSERT INTO users (id, name, guest, created_at, seen_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, name, guest ? 1 : 0, now, now)
    .run();
  return id;
}

async function deleteUserRows(env, id) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM identities WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM auth_states WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
  ]);
}

/**
 * Someone proved they own (provider, subject). `current` is the account they were signed in to, if any.
 * - The identity is new: it joins `current` (which stops being a guest), or a new account is made.
 * - The identity has an account already: that account is theirs. A guest they were playing as is folded
 *   into it (hooks.mergeUser moves pilots and saves) and removed. Two full accounts are never merged:
 *   that is refused, and they can sign out and sign in with the other one.
 * Returns { userId } or { error, message }.
 */
async function resolveIdentity(env, hooks, provider, subject, profileName, current) {
  const owner = await env.DB.prepare('SELECT user_id FROM identities WHERE provider = ? AND subject = ?')
    .bind(provider, subject)
    .first();
  const label = provider === 'email' ? 'That email address' : `That ${PROVIDERS[provider].label} account`;
  if (owner) {
    if (!current || current.userId === owner.user_id) return { userId: owner.user_id };
    if (!current.guest)
      return {
        error: 'identity_taken',
        message: `${label} already belongs to another Tumult account. Sign out, then sign in with it to use that account.`,
      };
    if (hooks.mergeUser) await hooks.mergeUser(env, current.userId, owner.user_id);
    await deleteUserRows(env, current.userId);
    return { userId: owner.user_id, merged: true };
  }
  const now = Date.now();
  if (current) {
    const has = await env.DB.prepare('SELECT 1 AS x FROM identities WHERE user_id = ? AND provider = ?')
      .bind(current.userId, provider)
      .first();
    if (has && provider !== 'email')
      return { error: 'already_linked', message: `This account already has a ${PROVIDERS[provider].label} sign-in.` };
    const name =
      current.guest && /^Guest \d{4}$/.test(current.name) && cleanName(profileName) ? cleanName(profileName) : null;
    await env.DB.batch([
      env.DB.prepare('INSERT INTO identities (provider, subject, user_id, created_at) VALUES (?, ?, ?, ?)').bind(
        provider,
        subject,
        current.userId,
        now,
      ),
      env.DB.prepare('UPDATE users SET guest = 0, name = COALESCE(?, name) WHERE id = ?').bind(name, current.userId),
    ]);
    return { userId: current.userId };
  }
  const id = await createUser(env, cleanName(profileName) || guestName(), false);
  await env.DB.prepare('INSERT INTO identities (provider, subject, user_id, created_at) VALUES (?, ?, ?, ?)')
    .bind(provider, subject, id, now)
    .run();
  return { userId: id };
}

/* ───────────── sessions ───────────── */
function tokenOf(request) {
  const h = request.headers.get('Authorization') || '';
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,100})$/.exec(h.trim());
  if (m) return m[1];
  const q = new URL(request.url).searchParams.get('session');
  return q && /^[A-Za-z0-9_-]{20,100}$/.test(q) ? q : null;
}

/** Who sent this request: { userId, guest, name } or null. Refreshes a session in use, at most daily. */
export async function authenticate(request, env) {
  const token = tokenOf(request);
  if (!token) return null;
  const hash = await sha256(token);
  const now = Date.now();
  const row = await env.DB.prepare(
    'SELECT s.user_id, s.expires_at, u.name, u.guest, u.seen_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?',
  )
    .bind(hash)
    .first();
  if (!row || row.expires_at <= now) return null;
  if (now - row.seen_at > DAY)
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET seen_at = ? WHERE id = ?').bind(now, row.user_id),
      env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').bind(now + SESSION_MS, hash),
    ]);
  return { userId: row.user_id, guest: !!row.guest, name: row.name, tokenHash: hash };
}

/** null when `user` may do what only a full account may (host, share pilots, send canon notes). */
export function requireAccount(user) {
  const h = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (!user)
    return new Response(JSON.stringify({ error: 'signed_out', message: 'Sign in to play online.' }), {
      status: 401,
      headers: h,
    });
  if (user.guest)
    return new Response(
      JSON.stringify({
        error: 'needs_account',
        message: 'Sign in with Google, Discord or email to do this. Guests can join a game from an invite link.',
      }),
      { status: 403, headers: h },
    );
  return null;
}

export async function sweepAuth(env) {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    env.DB.prepare('DELETE FROM auth_states WHERE expires_at <= ?').bind(now),
    env.DB.prepare('DELETE FROM email_codes WHERE expires_at <= ?').bind(now),
  ]);
  const { results } = await env.DB.prepare('SELECT id FROM users WHERE guest = 1 AND seen_at < ? LIMIT 500')
    .bind(now - IDLE_GUEST_MS)
    .all();
  for (const r of results || []) await deleteUserRows(env, r.id);
  return { guestsRemoved: (results || []).length };
}

/* ───────────── email ───────────── */
const emailOk = (e) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e) && e.length <= 254;
const normEmail = (e) =>
  String(e || '')
    .trim()
    .toLowerCase();
const emailOn = (env) => !!(trim(env.RESEND_API_KEY) && trim(env.EMAIL_FROM) && trim(env.AUTH_PEPPER));

async function sendCode(env, to, code) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + trim(env.RESEND_API_KEY), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: trim(env.EMAIL_FROM),
      to: [to],
      subject: `${code} is your Tumult sign-in code`,
      text: `Your Tumult sign-in code is ${code}.\n\nIt works for 15 minutes. If you didn't ask for it, you can ignore this email.\n\nFroglet Games`,
    }),
  });
  if (!res.ok) throw new Error('mail refused (' + res.status + ')');
}

/* ───────────── the router ───────────── */
export async function handleAuth(request, env, ctx, hooks = {}) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const m = request.method;
  if (m === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request, env) });
  try {
    if (path === '/auth/providers' && m === 'GET')
      return json(request, env, {
        google: PROVIDERS.google.configured(env),
        discord: PROVIDERS.discord.configured(env),
        email: emailOn(env),
      });

    if (path === '/auth/check' && m === 'GET') return check(url, env);

    if (path === '/auth/guest' && m === 'POST') {
      if (await limited(env, request, 'guest'))
        return fail(request, env, 429, 'slow_down', 'Too many new accounts from here. Try again in a minute.');
      const b = await body(request);
      const id = await createUser(env, cleanName(b.name) || guestName(), true);
      return json(request, env, { token: await newSession(env, id), user: await userJson(env, id) });
    }

    if (path === '/auth/me') {
      const me = await authenticate(request, env);
      if (!me) return fail(request, env, 401, 'signed_out', 'Your sign-in has ended.');
      if (m === 'GET') return json(request, env, { user: await userJson(env, me.userId) });
      if (m === 'PATCH') {
        const name = cleanName((await body(request)).name);
        if (!name) return fail(request, env, 400, 'bad_name', 'A name needs at least one letter.');
        await env.DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name, me.userId).run();
        return json(request, env, { user: await userJson(env, me.userId) });
      }
      if (m === 'DELETE') {
        if (hooks.deleteUser) await hooks.deleteUser(env, me.userId);
        await deleteUserRows(env, me.userId);
        return json(request, env, { deleted: true });
      }
    }

    if (path === '/auth/signout' && m === 'POST') {
      const me = await authenticate(request, env);
      if (me) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(me.tokenHash).run();
      return json(request, env, { signedOut: true });
    }

    const start = /^\/auth\/start\/(google|discord)$/.exec(path);
    if (start && m === 'POST') {
      const p = PROVIDERS[start[1]];
      if (!p.configured(env))
        return fail(request, env, 404, 'not_offered', `${p.label} sign-in isn't set up on this server.`);
      const back = returnUrl((await body(request)).return, env);
      if (!back) return fail(request, env, 400, 'bad_return', "This sign-in didn't come from a Tumult page.");
      const me = await authenticate(request, env);
      const state = randomToken(16);
      const verifier = randomToken(32);
      const now = Date.now();
      await env.DB.batch([
        env.DB.prepare('DELETE FROM auth_states WHERE expires_at <= ?').bind(now),
        env.DB.prepare(
          'INSERT INTO auth_states (state, provider, verifier, user_id, return_to, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        ).bind(state, start[1], verifier, me ? me.userId : null, back, now + STATE_MS),
      ]);
      const redirectUri = url.origin + '/auth/callback/' + start[1];
      return json(request, env, {
        url: p.authorizeUrl(env, { redirectUri, state, challenge: await challengeOf(verifier) }),
      });
    }

    const cb = /^\/auth\/callback\/(google|discord)$/.exec(path);
    if (cb && m === 'GET') return callback(request, url, env, hooks, cb[1]);

    if (path === '/auth/email/start' && m === 'POST') {
      if (!emailOn(env)) return fail(request, env, 404, 'not_offered', "Email sign-in isn't set up on this server.");
      const email = normEmail((await body(request)).email);
      if (!emailOk(email)) return fail(request, env, 400, 'bad_email', "That doesn't look like an email address.");
      if (await limited(env, request, 'email'))
        return fail(request, env, 429, 'slow_down', 'Too many codes from here. Try again in a minute.');
      const eh = await hmac(trim(env.AUTH_PEPPER), email);
      const now = Date.now();
      const prev = await env.DB.prepare('SELECT created_at FROM email_codes WHERE email_hash = ?').bind(eh).first();
      if (prev && now - prev.created_at < CODE_GAP_MS)
        return fail(request, env, 429, 'slow_down', 'A code is on its way. Wait a minute before asking for another.');
      const code = sixDigits();
      await env.DB.prepare(
        'INSERT OR REPLACE INTO email_codes (email_hash, code_hash, created_at, expires_at, tries) VALUES (?, ?, ?, ?, 0)',
      )
        .bind(eh, await sha256(eh + ':' + code), now, now + CODE_MS)
        .run();
      await sendCode(env, email, code);
      return json(request, env, { sent: true });
    }

    if (path === '/auth/email/verify' && m === 'POST') {
      if (!emailOn(env)) return fail(request, env, 404, 'not_offered', "Email sign-in isn't set up on this server.");
      const b = await body(request);
      const email = normEmail(b.email);
      const code = String(b.code || '').replace(/\D/g, '');
      const eh = await hmac(trim(env.AUTH_PEPPER), email);
      const row = await env.DB.prepare('SELECT code_hash, expires_at, tries FROM email_codes WHERE email_hash = ?')
        .bind(eh)
        .first();
      if (!row || row.expires_at <= Date.now() || row.tries >= CODE_TRIES)
        return fail(request, env, 400, 'code_expired', 'That code has expired. Ask for a new one.');
      if (code.length !== 6 || !same(await sha256(eh + ':' + code), row.code_hash)) {
        await env.DB.prepare('UPDATE email_codes SET tries = tries + 1 WHERE email_hash = ?').bind(eh).run();
        return fail(request, env, 400, 'wrong_code', "That code isn't right. Check the email and try again.");
      }
      await env.DB.prepare('DELETE FROM email_codes WHERE email_hash = ?').bind(eh).run();
      const me = await authenticate(request, env);
      const r = await resolveIdentity(env, hooks, 'email', eh, '', me);
      if (r.error) return fail(request, env, 409, r.error, r.message);
      const token = me && me.userId === r.userId ? null : await newSession(env, r.userId);
      return json(request, env, { token, user: await userJson(env, r.userId), merged: !!r.merged });
    }

    return fail(request, env, 404, 'not_found', 'No such sign-in route.');
  } catch (e) {
    return fail(request, env, 502, 'auth_failed', 'Sign-in failed: ' + ((e && e.message) || 'unknown error'));
  }
}

async function callback(request, url, env, hooks, provider) {
  const state = url.searchParams.get('state') || '';
  const row = state
    ? await env.DB.prepare('SELECT provider, verifier, user_id, return_to, expires_at FROM auth_states WHERE state = ?')
        .bind(state)
        .first()
    : null;
  if (row) await env.DB.prepare('DELETE FROM auth_states WHERE state = ?').bind(state).run(); // one use only
  if (!row || row.provider !== provider || row.expires_at <= Date.now())
    return page('This sign-in expired. Go back to Tumult and try again.', 400);
  const back = returnUrl(row.return_to, env);
  if (!back) return page('This sign-in expired. Go back to Tumult and try again.', 400);
  const code = url.searchParams.get('code');
  if (!code) return backTo(back, 'tumult_auth_error', "Sign-in didn't complete. You're still playing as before.");
  let who;
  try {
    who = await PROVIDERS[provider].profile(env, {
      code,
      verifier: row.verifier,
      redirectUri: url.origin + url.pathname,
    });
  } catch (e) {
    return backTo(
      back,
      'tumult_auth_error',
      `${PROVIDERS[provider].label} sign-in failed (${(e && e.message) || 'unknown'}).`,
    );
  }
  let current = null;
  if (row.user_id) {
    const u = await env.DB.prepare('SELECT id, name, guest FROM users WHERE id = ?').bind(row.user_id).first();
    if (u) current = { userId: u.id, name: u.name, guest: !!u.guest };
  }
  const r = await resolveIdentity(env, hooks, provider, who.subject, who.name, current);
  if (r.error) return backTo(back, 'tumult_auth_error', r.message);
  return backTo(back, 'tumult_session', await newSession(env, r.userId));
}

function check(url, env) {
  const report = {
    worker: 'tumult-auth',
    callback_urls: { google: url.origin + '/auth/callback/google', discord: url.origin + '/auth/callback/discord' },
    database_bound: !!env.DB,
    allowed_origins: origins(env),
    google: { client_id_set: !!trim(env.GOOGLE_CLIENT_ID), client_secret_set: !!trim(env.GOOGLE_CLIENT_SECRET) },
    discord: { client_id_set: !!trim(env.DISCORD_CLIENT_ID), client_secret_set: !!trim(env.DISCORD_CLIENT_SECRET) },
    email: {
      resend_api_key_set: !!trim(env.RESEND_API_KEY),
      email_from: trim(env.EMAIL_FROM),
      auth_pepper_set: !!trim(env.AUTH_PEPPER),
    },
    rate_limiter_bound: !!env.AUTH_LIMITER,
  };
  return new Response(JSON.stringify(report, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
