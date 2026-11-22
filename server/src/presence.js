/* ============================================================================
   TUMULT SERVER — THE LOBBY: WHO IS ONLINE (one Durable Object for everyone).
   Like Cosmic Shore's online list: every screen with a session keeps a socket here, says what it is
   doing, and hears the list of who is online now. The game shows it as "Lobby".

   GET /api/lobby?session=<token>  (WebSocket)
   Client → lobby  { op: 'status', status: { where: 'menu' | 'solo' | 'game', open: { code, players, max } | null } }
   Client → lobby  { op: 'nudge', to: <user id> }   "I left you a note": that player's screens re-read their inbox
   Lobby → client  { type: 'online', players: [{ id, name, guest, where, open }], at }
   Lobby → client  { type: 'nudge', from: <user id> }

   Only what a player chose to show is shown: their display name, whether they are in the menu, playing
   solo or in an online game, and a game's code only when its host opened it to the lobby. A screen
   that closes drops off at once; a list goes out at most twice a second.
   ========================================================================== */

const MAX_LISTED = 200;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

/** What a screen may say about itself, cleaned. */
export function cleanStatus(s) {
  s = s && typeof s === 'object' ? s : {};
  const where = ['menu', 'solo', 'game'].includes(s.where) ? s.where : 'menu';
  let open = null;
  const o = s.open;
  if (where === 'game' && o && /^[A-Z]{4}$/.test(o.code)) {
    const max = Math.min(5, Math.max(2, o.max | 0 || 2));
    open = { code: o.code, players: Math.min(max, Math.max(1, o.players | 0 || 1)), max };
  }
  return { where, open };
}

/** The list everyone hears: one row per player (their newest screen), accounts before guests. */
export function listOf(entries) {
  const by = new Map();
  for (const e of entries) {
    if (!e || !e.uid) continue;
    const had = by.get(e.uid);
    if (!had || e.since > had.since) by.set(e.uid, e);
  }
  return [...by.values()]
    .sort((a, b) => a.guest - b.guest || a.name.localeCompare(b.name))
    .slice(0, MAX_LISTED)
    .map((e) => ({
      id: e.uid,
      name: e.name || (e.guest ? 'Guest' : 'Player'),
      guest: e.guest,
      where: e.status.where,
      open: e.status.open,
    }));
}

export class Presence {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.timer = null;
  }
  async fetch(request) {
    let user = null;
    try {
      user = JSON.parse(request.headers.get('x-tumult-user') || 'null');
    } catch {
      user = null;
    }
    if (!user || !user.userId) return json({ error: 'unauthenticated' }, 401);
    if (request.headers.get('Upgrade') !== 'websocket') return json({ ok: true });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      uid: user.userId,
      name: String(user.name || '').slice(0, 24),
      guest: !!user.guest,
      since: Date.now(),
      status: cleanStatus(null),
    });
    this.soon();
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, raw) {
    let m;
    try {
      m = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    } catch {
      return;
    }
    if (m && m.op === 'nudge') return this.nudge(ws, m.to);
    if (!m || m.op !== 'status') return;
    const me = ws.deserializeAttachment();
    me.status = cleanStatus(m.status);
    me.since = Date.now();
    ws.serializeAttachment(me);
    this.soon();
  }
  async webSocketClose(ws, code) {
    try {
      ws.close(code === 1005 ? 1000 : code, 'bye');
    } catch {
      /* closed already */
    }
    this.soon();
  }
  async webSocketError() {
    this.soon();
  }
  /** Tell one player's screens that a note is waiting for them (an account may send a few a minute). */
  nudge(ws, to) {
    const me = ws.deserializeAttachment();
    if (!me || me.guest || typeof to !== 'string' || to === me.uid) return;
    const now = Date.now();
    me.nudges = (me.nudges || []).filter((t) => now - t < 60000);
    if (me.nudges.length >= 20) return;
    me.nudges.push(now);
    ws.serializeAttachment(me);
    const text = JSON.stringify({ type: 'nudge', from: me.uid });
    for (const s of this.ctx.getWebSockets()) {
      try {
        if (s.deserializeAttachment().uid === to) s.send(text);
      } catch {
        /* going */
      }
    }
  }
  /** Send the list soon: a burst of comings and goings makes one list. */
  soon() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.broadcast();
    }, 500);
  }
  broadcast() {
    const sockets = this.ctx.getWebSockets().filter((ws) => ws.readyState === undefined || ws.readyState === 1);
    const entries = sockets.map((ws) => {
      try {
        return ws.deserializeAttachment();
      } catch {
        return null;
      }
    });
    const text = JSON.stringify({ type: 'online', players: listOf(entries), at: Date.now() });
    for (const ws of sockets)
      try {
        ws.send(text);
      } catch {
        /* going */
      }
  }
}
