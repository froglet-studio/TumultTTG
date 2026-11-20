/* ============================================================================
   TUMULT SERVER — A LIVE GAME ROOM (one Durable Object per game code).
   Two screens, one game, as in src/ui/net.js: the host's screen holds the game and writes its state;
   a guest's screen sends commands for its own pilot. This room is where both meet. It keeps the
   game's documents (the store layout net.js uses, under games/<CODE>), tells each screen at once when
   one it watches changes, and passes the short "live channel" messages between them. Because it keeps
   the latest state, a screen that reloads, or a host that comes back, is caught up from it.

   One WebSocket per screen: GET /api/room/<CODE>?session=<token>[&invite=<token>].
   Client → room   { id, op, … }      ops: get, set, delete, list, watch, unwatch, acquire, emit, invite
   Room → client   { id, ok, result } or { id, ok: false, error, message }
                   { type: 'snap', wid, exists, data } / { type: 'snap', wid, docs }   a watched path changed
                   { type: 'msg', topic, data }                                         another screen's message

   Who may do what:
     enter        an account; a guest account only with the host's invite (room.invite)
     games/<CODE> the game: the first account to write it hosts it, and only the host writes it again
     seats/<n>    a screen takes a free seat (1 to 4: five players in all), or the one it already holds
     cmds/<id>    written only by the seat's holder, for that seat; deleted by the host or the writer
   A room nobody has touched for a day forgets its game (an alarm).
   ========================================================================== */

const IDLE_MS = 24 * 3600 * 1000;
const MAX_DOC = 900 * 1024; // a WebSocket message is at most 1 MiB
const MAX_MSG = 4 * 1024;
const SEATS = 5; // players in a game, the host's seat 0 included

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
const parentOf = (path) => path.split('/').slice(0, -1).join('/');

class Refused extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}
const no = (code, message) => {
  throw new Refused(code, message);
};

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
/** The invite for one game: tied to its code and the moment it was opened, so a reused code needs a new one. */
export async function inviteToken(secret, code, created) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`tumult-invite:${code}:${created}`));
  return b64url(sig).slice(0, 22);
}

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.leases = new Map(); // path → { holder, until }
    if (ctx.setWebSocketAutoResponse && typeof WebSocketRequestResponsePair !== 'undefined')
      ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  /* ───────────── entering ───────────── */
  async fetch(request) {
    const url = new URL(request.url);
    const m = url.pathname.match(/\/api\/room\/([A-Z]{4})(\/can)?$/);
    if (!m) return json({ error: 'not-found' }, 404);
    const code = m[1];
    let user = null;
    try {
      user = JSON.parse(request.headers.get('x-tumult-user') || 'null');
    } catch {
      user = null;
    }
    if (!user || !user.userId) return json({ error: 'unauthenticated', message: 'sign in to play online' }, 401);
    const meta = await this.meta();
    if (user.guest) {
      const token = url.searchParams.get('invite') || '';
      const ok =
        meta.created &&
        this.env.INVITE_SECRET &&
        token === (await inviteToken(this.env.INVITE_SECRET, code, meta.created));
      if (!ok)
        return json({ error: 'needs-account', message: 'sign in, or open the invite link the host shared' }, 403);
    }
    // asked first, because a browser's WebSocket cannot say why it was turned away
    if (m[2]) return json({ ok: true, host: meta.host === user.userId });
    if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'expected a WebSocket' }, 426);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.accept(server, {
      uid: user.userId,
      guest: !!user.guest,
      name: String(user.name || '').slice(0, 24),
      code,
      watches: [],
    });
    return new Response(null, { status: 101, webSocket: client });
  }
  /** Take a socket into the room (hibernatable: the room may sleep between messages and keep it). */
  accept(ws, who) {
    this.ctx.acceptWebSocket(ws);
    ws.serializeAttachment(who);
  }
  sockets() {
    return this.ctx.getWebSockets();
  }

  /* ───────────── storage ───────────── */
  async meta() {
    return (await this.ctx.storage.get('meta')) || { host: null, created: 0, seats: {} };
  }
  async touch(meta) {
    meta.last = Date.now();
    await this.ctx.storage.put('meta', meta);
    await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
  }
  async alarm() {
    const meta = await this.meta();
    if (Date.now() - (meta.last || 0) < IDLE_MS - 1000) return this.ctx.storage.setAlarm((meta.last || 0) + IDLE_MS);
    await this.ctx.storage.deleteAll();
    for (const ws of this.sockets()) ws.close(4000, 'the game ended after a day without play');
  }
  readDoc(path) {
    return this.ctx.storage.get('doc:' + path);
  }
  async listDocs(parent) {
    const found = await this.ctx.storage.list({ prefix: 'doc:' + parent + '/' });
    const docs = [];
    for (const [k, data] of found) {
      const path = k.slice(4);
      if (parentOf(path) === parent) docs.push({ id: path.split('/').pop(), data });
    }
    return docs;
  }

  /* ───────────── messages ───────────── */
  async webSocketMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;
    const who = ws.deserializeAttachment();
    try {
      const result = await this.op(ws, who, msg);
      send(ws, { id: msg.id, ok: true, result: result === undefined ? null : result });
    } catch (e) {
      if (!(e instanceof Refused)) console.error('room', e && e.stack);
      send(ws, {
        id: msg.id,
        ok: false,
        error: e instanceof Refused ? e.code : 'internal',
        message: String(e.message || e),
      });
    }
  }
  async webSocketClose(ws, code) {
    try {
      ws.close(code === 1005 ? 1000 : code, 'bye');
    } catch {
      /* already closed */
    }
  }
  async webSocketError() {}

  /** Check a path is this game's, and say which part of it it is. */
  where(who, path) {
    const p = String(path || '').split('/');
    if (p[0] !== 'games' || p[1] !== who.code) no('permission-denied', 'not this game');
    if (p.length === 2) return { kind: 'game' };
    if (p.length === 3 && (p[2] === 'seats' || p[2] === 'cmds')) return { kind: 'collection' };
    if (p.length === 4 && p[2] === 'seats' && /^[1-9]$/.test(p[3]) && +p[3] < SEATS)
      return { kind: 'seat', seat: +p[3] };
    if (p.length === 4 && p[2] === 'cmds' && /^[0-9]{1,2}-[0-9]{1,12}$/.test(p[3])) return { kind: 'cmd' };
    no('invalid-argument', 'not a path in a game');
  }

  async op(ws, who, msg) {
    switch (msg.op) {
      case 'get': {
        this.where(who, msg.path);
        const data = await this.readDoc(msg.path);
        return { exists: data != null, data: data == null ? null : data };
      }
      case 'list': {
        if (this.where(who, msg.path).kind !== 'collection') no('invalid-argument', 'not a collection');
        return { docs: await this.listDocs(msg.path) };
      }
      case 'set':
        return this.set(who, msg.path, msg.data);
      case 'delete':
        return this.remove(who, msg.path);
      case 'watch': {
        const at = this.where(who, msg.path);
        const kind = at.kind === 'collection' ? 'list' : 'doc';
        const wid = String(msg.wid || '').slice(0, 16);
        who.watches = who.watches
          .filter((w) => w.wid !== wid)
          .concat([{ wid, path: msg.path, kind }])
          .slice(-12);
        ws.serializeAttachment(who);
        send(ws, await this.snap({ wid, path: msg.path, kind }));
        return null;
      }
      case 'unwatch':
        who.watches = who.watches.filter((w) => w.wid !== String(msg.wid));
        ws.serializeAttachment(who);
        return null;
      case 'acquire': {
        this.where(who, msg.path);
        const now = Date.now();
        const l = this.leases.get(msg.path);
        const holder = String(msg.holder || who.uid).slice(0, 32);
        if (l && l.until > now && l.holder !== holder) return { acquired: false };
        this.leases.set(msg.path, { holder, until: now + Math.min(Math.max(+msg.ttlMs || 3000, 500), 30000) });
        return { acquired: true };
      }
      case 'emit': {
        const body = JSON.stringify({ type: 'msg', topic: String(msg.topic || '').slice(0, 32), data: msg.data });
        if (body.length > MAX_MSG) no('too-large', 'a live message is at most 4 KiB');
        for (const other of this.sockets()) if (other !== ws) sendRaw(other, body);
        return null;
      }
      case 'invite': {
        const meta = await this.meta();
        if (meta.host !== who.uid) no('permission-denied', 'only the host invites');
        if (!this.env.INVITE_SECRET) no('unavailable', 'invites are not set up on this server');
        return { token: await inviteToken(this.env.INVITE_SECRET, who.code, meta.created) };
      }
      default:
        no('invalid-argument', 'unknown op');
    }
  }

  async set(who, path, data) {
    const at = this.where(who, path);
    if (data === undefined || JSON.stringify(data).length > MAX_DOC) no('too-large', 'that document is too large');
    const meta = await this.meta();
    if (at.kind === 'game') {
      if (!meta.host) {
        if (who.guest) no('needs-account', 'sign in to host a game');
        meta.host = who.uid;
        meta.created = Date.now();
      } else if (meta.host !== who.uid) no('already-exists', 'another player hosts a game with this code');
    } else if (at.kind === 'seat') {
      const holder = meta.seats[at.seat];
      if (holder && holder !== who.uid) no('permission-denied', 'that seat is taken');
      if (!data || typeof data !== 'object') no('invalid-argument', 'a seat is { name, holder }');
      const at = +data.at;
      data = { name: String(data.name || '').slice(0, 24), holder: String(data.holder || '').slice(0, 32) };
      if (Number.isFinite(at) && at > 0) data.at = at; // the holder's heartbeat: the host tells who has dropped
      meta.seats[at.seat] = who.uid;
    } else if (at.kind === 'cmd') {
      const seat = data && data.seat;
      if (!Number.isInteger(seat) || meta.seats[seat] !== who.uid)
        no('permission-denied', 'commands only for your own seat');
      if (path.split('/').pop().split('-')[0] !== String(seat))
        no('invalid-argument', 'a command is filed under its seat');
    } else no('invalid-argument', 'a collection is not a document');
    if (!meta.host) no('not-found', 'no game with this code');
    await this.ctx.storage.put('doc:' + path, data);
    await this.touch(meta);
    await this.changed(path);
    return null;
  }

  async remove(who, path) {
    const at = this.where(who, path);
    const meta = await this.meta();
    if (at.kind === 'cmd') {
      const d = await this.readDoc(path);
      if (meta.host !== who.uid && !(d && meta.seats[d.seat] === who.uid)) no('permission-denied');
    } else if (at.kind === 'seat') {
      if (meta.host !== who.uid && meta.seats[at.seat] !== who.uid) no('permission-denied');
      delete meta.seats[at.seat];
    } else if (at.kind === 'game') {
      if (meta.host !== who.uid) no('permission-denied');
      await this.ctx.storage.deleteAll();
      await this.changed(path);
      return null;
    } else no('invalid-argument');
    await this.ctx.storage.delete('doc:' + path);
    await this.touch(meta);
    await this.changed(path);
    return null;
  }

  /* ───────────── telling the watchers ───────────── */
  async snap(w) {
    if (w.kind === 'list') return { type: 'snap', wid: w.wid, docs: await this.listDocs(w.path) };
    const data = await this.readDoc(w.path);
    return { type: 'snap', wid: w.wid, exists: data != null, data: data == null ? null : data };
  }
  async changed(path) {
    const cache = new Map();
    for (const ws of this.sockets()) {
      let who;
      try {
        who = ws.deserializeAttachment();
      } catch {
        continue;
      }
      for (const w of (who && who.watches) || []) {
        if (!(w.kind === 'doc' ? w.path === path : w.path === parentOf(path))) continue;
        const key = w.kind + ':' + w.path;
        if (!cache.has(key)) cache.set(key, await this.snap({ wid: '', path: w.path, kind: w.kind }));
        send(ws, Object.assign({}, cache.get(key), { wid: w.wid }));
      }
    }
  }
}

function send(ws, obj) {
  sendRaw(ws, JSON.stringify(obj));
}
function sendRaw(ws, text) {
  try {
    ws.send(text);
  } catch {
    /* a socket closing as we speak: its screen catches up when it comes back */
  }
}
