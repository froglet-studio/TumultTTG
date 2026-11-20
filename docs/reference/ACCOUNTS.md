# Accounts and sign-in

Status: built (2026-11-20), wave 3 of the launch plan. Needs the admin setup below before it is live.

## What a player sees

- **Solo play needs nothing.** No account, no sign-in, no request to any server. The offline file has no server at all.
- **Guest first.** The first time a player does something online (joins a game, shares a pilot), the web version makes them a guest account on Tumult's Worker, named "Guest 1234" until they rename it. It lives on that device.
- **Keep it by signing in.** The title screen says "Playing as a guest. Sign in to keep your pilots on any device and host games online." The account box offers Google, Discord and an emailed six-digit code, whichever the server has set up. Linking keeps the same account id, so everything the guest owned stays theirs. Signing in with the same Google, Discord or email on another device reaches the same account; a guest account on that device is folded into it.
- **Online rules** (enforced by the Worker's routes, `server/src/index.js`): joining a game needs a session (a guest is enough) and the host's invite link or code; hosting, sharing pilots and sending canon notes need a linked account. The online screens call `T.UI.askSignIn(reason)` when the Worker answers `needs_account`.
- **The account box** also renames the account (the name other players see), signs out on this device, and deletes the account with everything it holds (two presses, no browser dialog).

## How it works

| Piece | Where |
|---|---|
| Routes, sessions, Google/Discord/email | `server/src/auth/index.js`, `providers.js`, `crypto.js` |
| Tables | `server/migrations/0002_auth.sql`: `users`, `identities`, `sessions`, `auth_states`, `email_codes` |
| Game side | `src/ui/account.js` (`T.Account`, the title line, the account box), `src/ui/account.css` |
| Tests | `server/test/auth.test.mjs` (the Worker against the real migration on in-memory SQLite), `test/account.test.js` (the game's side end to end against the same code) |

- **Sessions** are random 32-byte tokens the game keeps in `localStorage` (`tumult_v2_account`) and sends as `Authorization: Bearer`, or `?session=` on a WebSocket. The database keeps only their SHA-256. A session lasts 400 days and is renewed each day it is used, so an active guest never loses their account. Signing out ends that device's session only.
- **Google and Discord** use OAuth 2.0 with PKCE. A one-time state row (10 minutes) remembers the page to return to and, when the player was signed in, the account to link. We ask only for an account number and a display name (`openid profile`, `identify`): no email, no friends, no servers. The Worker sends the browser back with `#tumult_session=<token>` in the fragment, which browsers never send to a server, and the game removes it from the address bar at once. The pattern follows froglet.games' Studio sign-in (`tools/studio-auth/` in Cosmic-Shore-landing-page).
- **Email** sends a six-digit code through Resend: 15 minutes, five tries, one code a minute per address. The address is kept only as an HMAC under `AUTH_PEPPER`, so the database cannot be read back into a mailing list.
- **Linking an identity that has an account already**: a guest is folded into that account (the backend's `mergeUser` moves pilots, saves and notes, newest save wins), then removed. Two full accounts are never merged; the player is told to sign out and sign in with the other one.
- **Only our pages** can start a sign-in or read the answers: `ALLOWED_ORIGIN` (default `https://tumult.froglet.games,https://www.froglet.games,https://*.tumult.pages.dev`, plus `http://localhost` for development). The same rule gives the CORS headers.
- **Clean-up**: the Worker's scheduled handler calls `sweepAuth(env)`, which deletes expired sessions, states and codes, and guest accounts unused for 400 days. Full accounts are never swept.
- **Inert without a server**: `T.Account` talks only to `T.Server.base`, which only the web version defines (`src/web/server.js`).

For the rest of the Worker: `handleAuth(request, env, ctx, { mergeUser, deleteUser })` serves `/auth/*`; `authenticate(request, env)` gives `{ userId, guest, name }` or null; `requireAccount(user)` gives the 401/403 for a route only full accounts may use; `cors(request, env)`; `sweepAuth(env)`.

## Admin setup (Shombith)

Do these once the backend Worker is deployed (`docs/reference/` backend notes; the Worker's address is assumed to be `https://api.tumult.froglet.games` below). Every value goes in Cloudflare → Workers → the Tumult Worker → Settings → Variables and Secrets; add the secret ones as **Secret**, never in `wrangler.toml` or the repository.

1. **Database.** Apply the migration: `npx wrangler d1 migrations apply <database> --remote` from `server/` (it runs `0001` and `0002` in order).
2. **Pepper.** `AUTH_PEPPER` (Secret): a long random string, e.g. the output of `openssl rand -base64 32`. Never change it afterwards: email sign-ins are found by it.
3. **Google.** In Google Cloud Console, make a project "Tumult", then APIs & Services → OAuth consent screen: External, app name Tumult, support email, `froglet.games` as the authorised domain, scopes `openid` and `profile` only, then Publish. Credentials → Create OAuth client ID → Web application; authorised redirect URI `https://api.tumult.froglet.games/auth/callback/google`. Put the ID in `GOOGLE_CLIENT_ID` and the secret in `GOOGLE_CLIENT_SECRET` (Secret).
4. **Discord.** At discord.com/developers/applications, New Application "Tumult" → OAuth2: add the redirect `https://api.tumult.froglet.games/auth/callback/discord`. Copy the Client ID to `DISCORD_CLIENT_ID` and reset/copy the Client Secret to `DISCORD_CLIENT_SECRET` (Secret).
5. **Email.** At resend.com, add the domain `froglet.games` (or a subdomain such as `mail.froglet.games`) and put the DNS records it gives into Cloudflare DNS; when it says Verified, create an API key with "Sending access" only. `RESEND_API_KEY` (Secret) and `EMAIL_FROM`, e.g. `Tumult <play@froglet.games>`. The free tier sends 3,000 emails a month. Email sign-in stays hidden until all three of these and `AUTH_PEPPER` are set.
6. **Origins.** Only if the game is served anywhere else: `ALLOWED_ORIGIN`, a comma list (`https://*.example.dev` allows its subdomains).
7. **Check.** Open `https://api.tumult.froglet.games/auth/check`: it lists the callback URLs and whether each setting is present (never a secret's value). Then on the web version, press Sign in on the title screen and try each provider.
8. **Rate limit** (optional but advised): the Worker reads a rate-limit binding `AUTH_LIMITER` (in `wrangler.toml`, which the backend owns) for new guests and email codes per IP.

A provider whose settings are missing is simply not offered; the rest work.

## Privacy

What the database holds for a player: an account id, the name they chose, whether it is a guest, when it was made and last used, which sign-ins it has (Google's or Discord's account number; for email, an HMAC of the address), and hashed sessions. Deleting the account from the account box removes all of it and, through the backend's `deleteUser`, everything it owns. froglet.games' privacy page and delete-my-data page should name Tumult accounts once this is live.
