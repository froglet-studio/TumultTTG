'use strict';
/**
 * A Cloudflare Worker's runtime, as far as Tumult's server needs it, in Node: Durable Object state
 * (storage, hibernatable WebSockets), WebSocketPair and a Response that can say 101. Used by
 * test/server.test.js to run server/src/room.js, presence.js and store.js without Cloudflare.
 */
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');

const clone = (v) => (v === undefined ? undefined : structuredClone(v));

/** Two linked socket ends, as WebSocketPair makes them: what one sends, the other hears. */
class End {
  constructor() {
    this.readyState = 1;
    this.peer = null;
    this.att = undefined;
    this.heard = []; // messages, when nobody listens
    this.onmessage = null;
    this.onclose = null;
  }
  send(text) {
    if (this.readyState !== 1 || !this.peer || this.peer.readyState !== 1) throw new Error('closed');
    const peer = this.peer;
    setTimeout(() => peer.deliver(String(text)), 1);
  }
  deliver(text) {
    if (this.onmessage) this.onmessage(text);
    else this.heard.push(text);
  }
  close() {
    if (this.readyState !== 1) return;
    this.readyState = 3;
    const peer = this.peer;
    if (peer && peer.readyState === 1) setTimeout(() => peer.closedByPeer(), 1);
  }
  closedByPeer() {
    if (this.readyState !== 1) return;
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }
  serializeAttachment(v) {
    this.att = clone(v);
  }
  deserializeAttachment() {
    return clone(this.att);
  }
}
class WebSocketPair {
  constructor() {
    const a = new End();
    const b = new End();
    a.peer = b;
    b.peer = a;
    this[0] = a;
    this[1] = b;
  }
}
const BaseResponse = globalThis.Response;
class WorkerResponse extends BaseResponse {
  constructor(body, init) {
    if (init && init.status === 101) {
      super(null, { status: 200 });
      this.upgraded = init.webSocket;
    } else super(body, init);
  }
}

/** A Durable Object's ctx: storage in a Map, and the sockets it accepted (each talking to `obj`). */
function fakeCtx() {
  const m = new Map();
  const sockets = new Set();
  let obj = null;
  const ctx = {
    storage: {
      get: async (k) => clone(m.get(k)),
      put: async (k, v) => void m.set(k, clone(v)),
      delete: async (k) => m.delete(k),
      list: async ({ prefix = '' } = {}) =>
        new Map(
          [...m]
            .filter(([k]) => k.startsWith(prefix))
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([k, v]) => [k, clone(v)]),
        ),
      deleteAll: async () => m.clear(),
      setAlarm: async (at) => void (ctx.alarmAt = at),
    },
    alarmAt: 0,
    acceptWebSocket(ws) {
      sockets.add(ws);
      ws.onmessage = (text) => obj.webSocketMessage(ws, text);
      ws.onclose = () => {
        sockets.delete(ws);
        if (obj.webSocketClose) obj.webSocketClose(ws, 1000);
      };
    },
    getWebSockets: () => [...sockets].filter((s) => s.readyState === 1),
    bind(o) {
      obj = o;
    },
    store: m,
  };
  return ctx;
}

/** Build the server's engine copy and import the server's modules, in a Worker-like global scope. */
async function loadServer() {
  const root = path.join(__dirname, '..');
  const { engineModule, outPath } = await import(pathToFileURL(path.join(root, 'tools', 'build-server.mjs')).href);
  const text = engineModule();
  if (!fs.existsSync(outPath) || fs.readFileSync(outPath, 'utf8') !== text) fs.writeFileSync(outPath, text);
  globalThis.WebSocketPair = WebSocketPair;
  globalThis.Response = WorkerResponse;
  const imp = (rel) => import(pathToFileURL(path.join(root, 'server', 'src', rel)).href);
  const [room, presence, store, rules, index] = await Promise.all([
    imp('room.js'),
    imp('presence.js'),
    imp('store.js'),
    imp('rules.js'),
    imp('index.js'),
  ]);
  return { room, presence, store, rules, index };
}

/** A Durable Object of `Cls`, with its fake ctx. */
function makeObject(Cls, env) {
  const ctx = fakeCtx();
  const o = new Cls(ctx, env);
  ctx.bind(o);
  return { o, ctx };
}

/**
 * A server for pages to talk to: the same routes as server/src/index.js, with players known by
 * token (`users`: token → { userId, guest, name }) in place of the sign-in module.
 */
function testServer(S, env, users) {
  const docs = S.store.memoryDocs();
  const rooms = new Map();
  const lobby = makeObject(S.presence.Presence, env);
  const userOf = (req, url) => {
    const a = req.headers.get('Authorization') || '';
    const tok = a.startsWith('Bearer ') ? a.slice(7) : url.searchParams.get('session');
    return (tok && users[tok]) || null;
  };
  async function handle(req) {
    const url = new URL(req.url);
    const user = userOf(req, url);
    const headers = new Headers(req.headers);
    headers.set('x-tumult-user', JSON.stringify(user));
    const room = url.pathname.match(/^\/api\/room\/([A-Za-z]{4})(\/can)?$/);
    if (room) {
      const code = room[1].toUpperCase();
      if (!rooms.has(code)) rooms.set(code, makeObject(S.room.GameRoom, env));
      return rooms
        .get(code)
        .o.fetch(new Request('https://api.test/api/room/' + code + (room[2] || '') + url.search, { headers }));
    }
    if (url.pathname === '/api/lobby') return lobby.o.fetch(new Request(url, { headers }));
    if (url.pathname === '/api/me')
      return user
        ? Response.json(Object.assign({}, user, S.rules.roles(env, user)))
        : Response.json({ error: 'unauthenticated' }, { status: 401 });
    return (await S.store.handleStore(req, env, user, docs)) || Response.json({ error: 'not-found' }, { status: 404 });
  }
  /** fetch() for a page. */
  const fetch = async (u, init = {}) => handle(new Request(u, init));
  /** WebSocket for a page (window: the page's, so its events are the page's). */
  const socketClass = () =>
    class PageSocket {
      constructor(u) {
        this.readyState = 0;
        this.url = u;
        handle(new Request(u.replace(/^ws/, 'http'), { headers: { Upgrade: 'websocket' } })).then((r) => {
          if (!r.upgraded) {
            this.readyState = 3;
            if (this.onerror) this.onerror({});
            if (this.onclose) this.onclose({});
            return;
          }
          this.end = r.upgraded;
          this.end.onmessage = (text) => this.onmessage && this.onmessage({ data: text });
          this.end.onclose = () => {
            this.readyState = 3;
            if (this.onclose) this.onclose({});
          };
          this.readyState = 1;
          if (this.onopen) this.onopen({});
        });
      }
      send(text) {
        this.end.send(text);
      }
      close() {
        this.readyState = 3;
        if (this.end) this.end.close();
      }
    };
  return { handle, fetch, socketClass, docs, rooms, lobby };
}

module.exports = { loadServer, makeObject, testServer, WebSocketPair };
