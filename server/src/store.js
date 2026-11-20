/* ============================================================================
   TUMULT SERVER — THE SHARED STORE (D1).
   Documents at paths, as the online screens address them (rules.js says who may do what):

     GET    /api/doc/<path>     → { exists, data }
     PUT    /api/doc/<path>     { data } → { ok: true, data }   (data as kept, after the rules rebuilt it)
     DELETE /api/doc/<path>     → { ok: true }
     GET    /api/docs/<path>    → { docs: [{ id, data }] }      a collection: the documents just under it
     GET    /api/profiles?ids=a,b → { profiles: { a: { name } } }

   The storage itself is an interface ({ get, put, del, list, byOwner }), D1 in the Worker and a Map in
   the tests, so every rule is tested without Cloudflare.
   ========================================================================== */
import { ruleFor, refuse, Refusal } from './rules.js';
import { T } from './engine.gen.js';

const parentOf = (path) => path.split('/').slice(0, -1).join('/');

/** The store over D1 (binding DB, table docs from migrations/0001_store.sql). */
export function d1Docs(db) {
  return {
    async get(path) {
      const row = await db.prepare('SELECT data FROM docs WHERE path = ?').bind(path).first();
      return row ? JSON.parse(row.data) : null;
    },
    async put(path, owner, data) {
      await db
        .prepare(
          'INSERT INTO docs (path, parent, owner, data, updated_at) VALUES (?, ?, ?, ?, ?) ' +
            'ON CONFLICT(path) DO UPDATE SET data = excluded.data, owner = excluded.owner, updated_at = excluded.updated_at',
        )
        .bind(path, parentOf(path), owner, JSON.stringify(data), Date.now())
        .run();
    },
    async del(path) {
      await db.prepare('DELETE FROM docs WHERE path = ?').bind(path).run();
    },
    async list(parent) {
      const { results } = await db
        .prepare('SELECT path, data FROM docs WHERE parent = ? ORDER BY updated_at DESC LIMIT 500')
        .bind(parent)
        .all();
      return results.map((r) => ({ path: r.path, data: JSON.parse(r.data) }));
    },
    async byOwner(owner) {
      const { results } = await db.prepare('SELECT path, data FROM docs WHERE owner = ?').bind(owner).all();
      return results.map((r) => ({ path: r.path, data: JSON.parse(r.data) }));
    },
  };
}

/** The same interface in memory (tests, and `wrangler dev` without a database). */
export function memoryDocs() {
  const m = new Map(); // path → { owner, data, at }
  let tick = 0;
  return {
    async get(path) {
      return m.has(path) ? structuredClone(m.get(path).data) : null;
    },
    async put(path, owner, data) {
      m.set(path, { owner, data: structuredClone(data), at: ++tick });
    },
    async del(path) {
      m.delete(path);
    },
    async list(parent) {
      return [...m]
        .filter(([p]) => parentOf(p) === parent)
        .sort((a, b) => b[1].at - a[1].at)
        .map(([path, v]) => ({ path, data: structuredClone(v.data) }));
    },
    async byOwner(owner) {
      return [...m].filter(([, v]) => v.owner === owner).map(([path, v]) => ({ path, data: structuredClone(v.data) }));
    },
  };
}

/* ───────────── the operations, with the rules ───────────── */
export async function getDoc(docs, path, user, env) {
  const r = ruleFor(path, 'doc', user, env);
  if (!r.read) refuse(user ? 403 : 401, user ? 'permission-denied' : 'unauthenticated');
  const data = await docs.get(path);
  return { exists: data != null, data };
}

export async function setDoc(docs, path, data, user, env, bytes) {
  const r = ruleFor(path, 'doc', user, env);
  if (!r.write) refuse(user ? 403 : 401, user ? 'permission-denied' : 'unauthenticated');
  if (bytes > r.max) refuse(413, 'too-large', `at most ${r.max} bytes here`);
  const kept = r.validate(data);
  await docs.put(path, r.owner, kept);
  return kept;
}

export async function deleteDoc(docs, path, user, env) {
  const r = ruleFor(path, 'doc', user, env);
  if (!r.write) refuse(user ? 403 : 401, user ? 'permission-denied' : 'unauthenticated');
  await docs.del(path);
}

export async function listDocs(docs, path, user, env) {
  const r = ruleFor(path, 'list', user, env);
  if (!r.read) refuse(user ? 403 : 401, user ? 'permission-denied' : 'unauthenticated');
  return (await docs.list(path)).map((d) => ({ id: d.path.split('/').pop(), data: d.data }));
}

/* ───────────── accounts: merging and deleting ───────────── */
/**
 * A guest linked a sign-in that already had an account: everything the guest kept moves to that account.
 * Pilots are joined (the account's first), canon notes move, and the newer save wins.
 */
export async function mergeDocs(docs, fromId, intoId) {
  if (!fromId || !intoId || fromId === intoId) return;
  for (const d of await docs.byOwner(fromId)) {
    const p = d.path.split('/');
    if (p[1] !== fromId) continue;
    p[1] = intoId;
    const to = p.join('/');
    const there = await docs.get(to);
    let data = d.data;
    if (there && p[0] === 'heroes') {
      const ids = new Set((there.list || []).map((r) => r.id));
      data = {
        list: (there.list || []).concat((d.data.list || []).filter((r) => !ids.has(r.id))).slice(0, T.MADE_MAX),
        at: there.at,
      };
    } else if (there && p[0] === 'saves') {
      data = (+there.at || 0) >= (+d.data.at || 0) ? there : d.data;
    } else if (there && p[0] === 'canon' && p.length === 2) {
      data = String(there.at) >= String(d.data.at) ? there : d.data;
    }
    await docs.put(to, intoId, data);
    await docs.del(d.path);
  }
}

/** A player deleted their account: everything they kept goes with it. */
export async function deleteOwned(docs, userId) {
  if (!userId) return;
  for (const d of await docs.byOwner(userId)) await docs.del(d.path);
}

/** The hooks the sign-in module calls (handleAuth's fourth argument). */
export const mergeUser = (env, fromId, intoId) => mergeDocs(d1Docs(env.DB), fromId, intoId);
export const deleteUser = (env, userId) => deleteOwned(d1Docs(env.DB), userId);

/** Players' display names, from the sign-in module's users table; none when it is not there yet. */
export async function profiles(env, ids) {
  ids = [...new Set(ids)].filter((i) => /^[A-Za-z0-9_-]{1,64}$/.test(i)).slice(0, 100);
  const out = {};
  if (!ids.length || !env.DB) return out;
  try {
    const q = `SELECT id, name FROM users WHERE id IN (${ids.map(() => '?').join(',')})`;
    const { results } = await env.DB.prepare(q)
      .bind(...ids)
      .all();
    for (const r of results) out[r.id] = { name: String(r.name || '') };
  } catch {
    /* no users table yet: names stay blank, as on a page that cannot see profiles */
  }
  return out;
}

/* ───────────── HTTP ───────────── */
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

/** Answer a /api/doc, /api/docs or /api/profiles request, or null when the path is not the store's. */
export async function handleStore(request, env, user, docs = env.DB ? d1Docs(env.DB) : null) {
  const url = new URL(request.url);
  const m = url.pathname.match(/^\/api\/(doc|docs|profiles)(?:\/(.*))?$/);
  if (!m) return null;
  if (!docs) return json({ error: 'unavailable', message: 'no database bound' }, 503);
  const path = decodeURIComponent(m[2] || '');
  try {
    if (m[1] === 'profiles')
      return json({ profiles: await profiles(env, (url.searchParams.get('ids') || '').split(',')) });
    if (m[1] === 'docs') {
      if (request.method !== 'GET') return json({ error: 'method-not-allowed' }, 405);
      return json({ docs: await listDocs(docs, path, user, env) });
    }
    if (request.method === 'GET') return json(await getDoc(docs, path, user, env));
    if (request.method === 'PUT') {
      const text = await request.text();
      if (text.length > 1024 * 1024) refuse(413, 'too-large');
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        refuse(400, 'invalid-argument', 'the body is not JSON');
      }
      const data = await setDoc(docs, path, body && body.data, user, env, text.length);
      return json({ ok: true, data });
    }
    if (request.method === 'DELETE') {
      await deleteDoc(docs, path, user, env);
      return json({ ok: true });
    }
    return json({ error: 'method-not-allowed' }, 405);
  } catch (e) {
    if (e instanceof Refusal) return json({ error: e.code, message: e.message }, e.status);
    throw e;
  }
}
