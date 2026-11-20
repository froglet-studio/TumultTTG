/* ============================================================================
   TUMULT SERVER — THE WORKER (tumult-api). docs/reference/BACKEND.md
   One Cloudflare Worker for everything online:
     /auth/*            sign-in and accounts (src/auth/, the sign-in module)
     /api/room/<CODE>   a live game: a WebSocket into that code's Durable Object (room.js)
     /api/lobby         who is online now: a WebSocket into the one Presence object (presence.js)
     /api/doc, /api/docs, /api/profiles   the shared store in D1 (store.js, rules.js)
     /api/health        is it up, and which version
   Solo play never calls it. The game's pages live on other origins (tumult.froglet.games, previews),
   so every answer carries CORS headers for the origins in ALLOWED_ORIGIN.
   ========================================================================== */
import * as auth from './auth/index.js';
import { handleStore, mergeUser, deleteUser, sweepStore } from './store.js';
import { roles } from './rules.js';
export { GameRoom } from './room.js';
export { Presence } from './presence.js';
import { originAllowed, VERSION } from './cors.js';

function withCors(response, request, env) {
  const origin = request.headers.get('Origin');
  if (!originAllowed(origin, env) || response.status === 101) return response;
  const r = new Response(response.body, response);
  r.headers.set('Access-Control-Allow-Origin', origin);
  r.headers.set('Vary', 'Origin');
  return r;
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === '/auth' || path.startsWith('/auth/'))
    return auth.handleAuth(request, env, ctx, { mergeUser, deleteUser });
  if (!path.startsWith('/api/')) return json({ error: 'not-found' }, 404);

  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('Origin');
    if (!originAllowed(origin, env)) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      },
    });
  }
  if (path === '/api/health') return json({ ok: true, version: VERSION, rooms: !!env.ROOMS, store: !!env.DB });

  const user = await auth.authenticate(request, env);
  if (path === '/api/me') {
    if (!user) return json({ error: 'unauthenticated' }, 401);
    return json(Object.assign({ userId: user.userId, guest: !!user.guest, name: user.name || '' }, roles(env, user)));
  }
  if (path === '/api/lobby') {
    if (request.headers.get('Origin') && !originAllowed(request.headers.get('Origin'), env))
      return json({ error: 'forbidden-origin' }, 403);
    if (!env.LOBBY) return json({ error: 'unavailable', message: 'no lobby bound' }, 503);
    const headers = new Headers(request.headers);
    headers.set('x-tumult-user', JSON.stringify(user || null));
    return env.LOBBY.get(env.LOBBY.idFromName('lobby')).fetch(new Request(url, { headers, method: 'GET' }));
  }
  const room = path.match(/^\/api\/room\/([A-Za-z]{4})(\/can)?$/);
  if (room) {
    // a page on another site must not open a game with a player's token
    if (request.headers.get('Origin') && !originAllowed(request.headers.get('Origin'), env))
      return json({ error: 'forbidden-origin' }, 403);
    if (!env.ROOMS) return json({ error: 'unavailable', message: 'no rooms bound' }, 503);
    const code = room[1].toUpperCase();
    const headers = new Headers(request.headers);
    headers.set('x-tumult-user', JSON.stringify(user || null)); // only this Worker reaches the room
    const inner = new Request(new URL('/api/room/' + code + (room[2] || '') + url.search, url), {
      headers,
      method: 'GET',
    });
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(inner);
  }
  return (await handleStore(request, env, user)) || json({ error: 'not-found' }, 404);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return withCors(await route(request, env, ctx), request, env);
    } catch (e) {
      console.error(e && e.stack);
      return withCors(json({ error: 'internal' }, 500), request, env);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sweepStore(env));
    if (typeof auth.sweepAuth === 'function') ctx.waitUntil(auth.sweepAuth(env));
  },
};
