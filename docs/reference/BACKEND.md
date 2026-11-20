# The online backend

Status: built (wave 3 of the launch plan, 2026-11-20). Not yet deployed: see "Putting it on Cloudflare".

Tumult's web version plays solo with no server at all. Everything online goes through one Cloudflare Worker, `tumult-api`, in `server/`:

| What | Where | How |
|---|---|---|
| Live games, 2 to 5 players | `server/src/room.js` | one Durable Object per four-letter game code; each screen keeps a WebSocket to it |
| Who is online (the game's Lobby) | `server/src/presence.js` | one Durable Object for everyone; a WebSocket per signed-in page |
| Shared pilots, canon notes, cloud saves | `server/src/store.js`, `rules.js` | D1 (SQLite), one row per document, plain HTTPS |
| Sign-in and accounts | `server/src/auth/` | the sign-in module (`docs/reference/ACCOUNTS.md`); a placeholder until it lands |

The game reaches it through `T.Backend` (`src/ui/backend.js`): the web version registers the provider `tumult-worker` (`src/web/backend-worker.js`), which serves the same `db`, `room` and `user` capabilities as the claude.ai playtest page, so the online screens (`src/ui/net.js`, `heroes-net.js`, `canon-net.js`) run unchanged on either. The offline single file contains none of this and makes no requests.

## Why a relay and not peer-to-peer

Decided by Shombith, 2026-11-20. Tumult is turn-based, so the 50 to 100 ms a move takes through Cloudflare's nearest server is not felt. Peer-to-peer would still need a server to introduce the browsers and a paid relay (TURN) for the roughly one network in ten that blocks direct connections; it would lose the game when the host's tab closes; and it could never let the server check moves. The room keeps the latest state, so a screen that reloads, or a host who comes back, is caught up from it. A later step can have the room run the engine itself, so no player's screen has to stay open.

## A live game

The host's screen holds the game, as on claude.ai: it carries out every command and writes the whole state; the engine is deterministic and a run is plain data, so the state is the whole truth (`src/ui/net.js` explains the reliable, ordered command channel). The room adds who may do what:

- **Entering** needs a session. A guest session (no account) also needs the host's invite link: `?join=CODE&invite=TOKEN`, shown in the host's lobby. The invite is an HMAC of the code and the moment the game opened (`INVITE_SECRET`), so a reused code needs a new link.
- **The game document** (`games/<CODE>`) is written by the first account that writes it, the host, and by no one else. A code another host holds is refused as `already-exists`, and the host's screen takes another code.
- **Seats** 1 to 4 (five players with the host): a screen takes a free seat or the one it already holds.
- **Commands** (`games/<CODE>/cmds/<seat>-<seq>`) are written only by the seat's holder, for that seat; the host or the writer deletes them.
- **The live channel** (`emit`): messages of up to 4 KiB to the game's other screens, as claude.ai's `room` did.
- A room nobody has touched for a day forgets its game (a Durable Object alarm).

Protocol, one WebSocket per screen at `/api/room/<CODE>?session=<token>[&invite=<token>]`: the client sends `{ id, op, … }` with `op` one of `get`, `set`, `delete`, `list`, `watch`, `unwatch`, `acquire`, `emit`, `invite`; the room answers `{ id, ok, result }` or `{ id, ok: false, error, message }`, and pushes `{ type: 'snap', wid, … }` when a watched path changes and `{ type: 'msg', topic, data }` for live messages. A browser's WebSocket cannot say why it was refused, so the client asks `GET /api/room/<CODE>/can` first.

## The Lobby: who is online

Like Cosmic Shore's online list, shown in the game as "Lobby", not "Friends". Every page with a session keeps a socket at `/api/lobby` and says what it is doing: in the menu, playing solo, or in an online game, with the game's code only when its host has seats free. Everyone hears the list (display name, guest or not, where, open game), at most twice a second. In the game: `T.Backend.use('lobby')` gives `watch(fn(players)) → stop`. The Lobby panel itself is part of the screen redesign.

## The store

| Path | Read | Write | Kept as |
|---|---|---|---|
| `heroes/<user>` | anyone | that player, with an account | each pilot rebuilt by `T.validMade`; ones the rules refuse are dropped |
| `canon/<user>` and `canon/<user>/notes/<id>` | that player, reviewers | that player, with an account | each note rebuilt by `T.canonRecord`, always `proposed` and private |
| `canonReview/<id>` | reviewers | lore leads | a decision: status, public, claim, note |
| `saves/<user>` | that player | that player, guests too | `{ run, meta, at }`; a run the game cannot load is refused |

The server checks pilots and notes with the game's own engine: `tools/build-server.mjs` turns the engine files in `src/manifest.json` into one module (`server/src/engine.gen.js`, generated, not committed) before every `wrangler dev` and `deploy`. Lore leads and reviewers are user ids in `CANON_LEADS` and `CANON_REVIEWERS` (`server/wrangler.toml`).

HTTP: `GET/PUT/DELETE /api/doc/<path>`, `GET /api/docs/<collection>`, `GET /api/profiles?ids=a,b` (display names), `GET /api/me` (who and which roles), `GET /api/health`.

**Cloud saves.** While someone is signed in (a guest included), each save of the run and the record also goes to `saves/<user>`, a few seconds later. A device with no run of its own takes the cloud's; one that has a run is never overwritten unasked; the record takes the best of both. When a guest links a sign-in that already had an account, everything moves to that account (`mergeUser`: pilots joined, the newer save kept); deleting an account deletes its documents (`deleteUser`).

**Storage on the device** (web version only): `tumult_v2_cloud_at` (localStorage, when the cloud save was last matched); `tumult_v2_api` and `tumult_v2_invites` (sessionStorage: a `?api=` server for this tab, and invite tokens from links).

## Running it locally

```
cd server
npx wrangler d1 migrations apply tumult --local
echo INVITE_SECRET=dev > .dev.vars
npx wrangler dev                      # http://localhost:8787
```

Then open the web version with `?api=http://localhost:8787` (`npm run dev:web`). Until the sign-in module is merged nobody is signed in, so only reads work. `npm test` runs the server's rules, rooms, lobby and a two-screen game over them in Node, without Cloudflare (`test/server.test.js`, `test/server-harness.js`).

## Putting it on Cloudflare

Admin steps, for Shombith (one time, about 15 minutes), from `server/`:

1. In Cloudflare, put Froglet's account on the **Workers Paid** plan ($5 a month; Durable Objects need it at this size).
2. `npx wrangler login`
3. `npx wrangler d1 create tumult`, and put the `database_id` it prints into `server/wrangler.toml` (the id is not a secret; commit it).
4. `npx wrangler d1 migrations apply tumult --remote`
5. `npx wrangler secret put INVITE_SECRET`, pasting a long random string (`openssl rand -base64 32`). Keep it only in Cloudflare.
6. `npx wrangler deploy`. Check `https://tumult-api.<account>.workers.dev/api/health` answers `{"ok":true,…}`.
7. The address: if `froglet.games` is on Cloudflare DNS, uncomment the `routes` line in `wrangler.toml` and deploy again for `https://api.tumult.froglet.games` (the game's default, `src/web/server.js`). If not, set `DEFAULT` in `src/web/server.js` to the workers.dev address.
8. Once sign-in is live, put the lore lead's user id in `CANON_LEADS` (and reviewers in `CANON_REVIEWERS`) and deploy.

The sign-in module's own secrets (Google, Discord, email) are in `docs/reference/ACCOUNTS.md`.

Cost: at Tumult's size it stays inside the plan's included usage. Rooms hibernate between messages and cost nothing while nobody is connected.
