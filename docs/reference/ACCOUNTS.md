# Accounts and sign-in

Status: built (2026-11-20), wave 3 of the launch plan. Needs the admin setup below before it is live.

## What a player sees

- **Solo play needs nothing.** No account, no sign-in, no request to any server. The offline file has no server at all.
- **Guest first.** The first time a player does something online (joins a game, shares a pilot), the web version makes them a guest account on Tumult's Worker, named "Guest 1234" until they rename it. It lives on that device.
- **Keep it by signing in.** The title screen says "Playing as a guest. Sign in to keep your pilots on any device and host games online." The account box offers Google, Discord and an emailed six-digit code, whichever the server has set up. Linking keeps the same account id, so everything the guest owned stays theirs. Signing in with the same Google, Discord or email on another device reaches the same account; a guest account on that device is folded into it.
- **Online rules** (enforced by the Worker's routes, `server/src/index.js`): joining a game needs a session (a guest is enough) and the host's invite link or code; hosting, sharing pilots and sending canon notes need a linked account. The online screens call `T.UI.askSignIn(reason)` when the Worker answers `needs_account`.
- **The account box** also renames the account (the name other players see), signs out on this device, and deletes the account with everything it holds (two presses, no browser dialog).

## Your profile (2.129.0)

Frogma - Tumult, page "Profile (Nov 22)", Profile 1 "Profile page" (Shombith's pick). A signed-in player's account button (top right) shows their avatar and opens the **Profile** page (`src/ui/profile.js`, `profile.css`; on a phone also under More). On the left, their card as others see it, updating as they edit; on the right, the display name and the avatar; below, the sign-ins, Sign out and Delete account. A guest who reaches it is asked to sign in.

- **Display name** (`server/src/auth/names.js`, the one place the rules live): 3 to 20 characters; letters of any script, digits, spaces and `. _ - '`, with at least one letter; not one of Tumult's own words (Froglet, Tumult, Admin, Moderator…) or "Guest" with digits; nothing from a word filter, read through look-alikes (`0` for o, `$` for s…), strong words anywhere in the name and short ones only as a whole word, so "Cassidy", "Grape" and "Dickens" pass. **Unique among accounts**, ignoring case and spaces (`users.name_key`, a unique index, so two can never race into one name). An account changes its name once a day (a change of case only is free); guests rename freely within the length and the filter. The page checks as the player types (`GET /auth/name?name=`) and the Worker checks again on save. A guest becoming an account keeps its name if allowed and free, else gets digits ("Ada 4821"), else "Pilot 4821".
- **Avatar** (`users.avatar`): automatic (the default: the first pilot on the player's card, else initials), any **pilot painting** in the game (`p:<KEY>`, their own pilots listed first, then all 216), their **Google or Discord picture**, or **initials**. Google and Discord give a picture address at sign-in (`identities.picture`, refreshed at each sign-in, kept only when it is on their image hosts); the Worker fetches it and serves it at `GET /auth/picture/<user id>` only while the player has picked it, so the web version still talks to nobody but Froglet. **Uploading a picture of your own is not offered**: it needs file storage (Cloudflare R2), which is not set up.
- **Where it shows**: the account button, the Lobby's People list (the lobby carries each player's avatar; `{ op: 'me' }` on its socket re-reads a changed name or avatar at once), profile cards and requests (`U.avatarSrc`, `U.avatarHTML`). `profile/<user>` cards carry the avatar too.
- **Tests**: `server/test/auth.test.mjs` (names, the filter, uniqueness, the daily limit, avatars and the picture route), `test/profile.test.js` (the page end to end in jsdom).

## How it works

| Piece | Where |
|---|---|
| Routes, sessions, Google/Discord/email | `server/src/auth/index.js`, `providers.js`, `crypto.js` |
| Tables | `server/migrations/0002_auth.sql`: `users`, `identities`, `sessions`, `auth_states`, `email_codes`; `0003_profile.sql`: avatars and unique names |
| Names and avatars | `server/src/auth/names.js`; the page `src/ui/profile.js` |
| Game side | `src/ui/account.js` (`T.Account`, the title line, the account box), `src/ui/account.css` |
| Tests | `server/test/auth.test.mjs` (the Worker against the real migration on in-memory SQLite), `test/account.test.js` (the game's side end to end against the same code) |

- **Sessions** are random 32-byte tokens the game keeps in `localStorage` (`tumult_v2_account`) and sends as `Authorization: Bearer`, or `?session=` on a WebSocket. The database keeps only their SHA-256. A session lasts 400 days and is renewed each day it is used, so an active guest never loses their account. Signing out ends that device's session only.
- **Google and Discord** use OAuth 2.0 with PKCE. A one-time state row (10 minutes) remembers the page to return to and, when the player was signed in, the account to link. We ask only for an account number, a display name and the picture's address (`openid profile`, `identify`): no email, no friends, no servers. The Worker sends the browser back with `#tumult_session=<token>` in the fragment, which browsers never send to a server, and the game removes it from the address bar at once. The pattern follows froglet.games' Studio sign-in (`tools/studio-auth/` in Cosmic-Shore-landing-page).
- **Email** sends a six-digit code through Resend: 15 minutes, five tries, one code a minute per address. The address is kept only as an HMAC under `AUTH_PEPPER`, so the database cannot be read back into a mailing list.
- **Linking an identity that has an account already**: a guest is folded into that account (the backend's `mergeUser` moves pilots, saves and notes, newest save wins), then removed. Two full accounts are never merged; the player is told to sign out and sign in with the other one.
- **Only our pages** can start a sign-in or read the answers: `ALLOWED_ORIGIN` (default `https://tumult.froglet.games,https://www.froglet.games,https://*.tumult.pages.dev`, plus `http://localhost` for development). The same rule gives the CORS headers.
- **Clean-up**: the Worker's scheduled handler calls `sweepAuth(env)`, which deletes expired sessions, states and codes, and guest accounts unused for 400 days. Full accounts are never swept.
- **Inert without a server**: `T.Account` talks only to `T.Server.base`, which only the web version defines (`src/web/server.js`).

For the rest of the Worker: `handleAuth(request, env, ctx, { mergeUser, deleteUser })` serves `/auth/*`; `authenticate(request, env)` gives `{ userId, guest, name }` or null; `requireAccount(user)` gives the 401/403 for a route only full accounts may use; `cors(request, env)`; `sweepAuth(env)`.

## Admin setup (Shombith)

Do these once the backend Worker is deployed. froglet.games' DNS is not on Cloudflare, so the Worker lives at its workers.dev address, `https://tumult-api.<account>.workers.dev`: the same host as `server/address.json`, which the first deploy prints (written `<worker>` below). If the Worker later moves to a custom address, re-enter the two redirect URIs under the new host. While `server/address.json` is empty, the web version is solo only and offers no sign-in. Every value goes in Cloudflare → Workers → the Tumult Worker → Settings → Variables and Secrets. The game itself is served at `https://www.froglet.games/tumult/play/`, which the default `ALLOWED_ORIGIN` already allows; add the secret ones as **Secret**, never in `wrangler.toml` or the repository.

1. **Database.** Apply the migrations: `npx wrangler d1 migrations apply <database> --remote` from `server/` (it runs `0001`, `0002` and `0003` in order; the Worker's deploy workflow does this itself).
2. **Pepper.** `AUTH_PEPPER` (Secret): a long random string, e.g. the output of `openssl rand -base64 32`. Never change it afterwards: email sign-ins are found by it.
3. **Google.** In Google Cloud Console, make a project "Tumult", then APIs & Services → OAuth consent screen: External, app name Tumult, support email, `froglet.games` as the authorised domain, scopes `openid` and `profile` only, then Publish. If Google asks to verify that froglet.games is yours, use Search Console's HTML-file method (no DNS change): the file it gives goes into the website repository, Cosmic-Shore-landing-page. Credentials → Create OAuth client ID → Web application; authorised redirect URI `<worker>/auth/callback/google`. Put the ID in `GOOGLE_CLIENT_ID` and the secret in `GOOGLE_CLIENT_SECRET` (Secret).
4. **Discord.** At discord.com/developers/applications, New Application "Tumult" → OAuth2: add the redirect `<worker>/auth/callback/discord`. Copy the Client ID to `DISCORD_CLIENT_ID` and reset/copy the Client Secret to `DISCORD_CLIENT_SECRET` (Secret).
5. **Email: not at launch.** Launch with Google and Discord only. Resend needs DNS records on the sending domain, and froglet.games' DNS can't be changed for now, so leave `RESEND_API_KEY` and `EMAIL_FROM` unset; the game then offers no email sign-in. When DNS can be changed: at resend.com, add the domain `froglet.games` (or a subdomain such as `mail.froglet.games`) and put the DNS records it gives where froglet.games' DNS is managed; when it says Verified, create an API key with "Sending access" only. `RESEND_API_KEY` (Secret) and `EMAIL_FROM`, e.g. `Tumult <play@froglet.games>`. The free tier sends 3,000 emails a month. Email sign-in stays hidden until all three of these and `AUTH_PEPPER` are set.
6. **Origins.** Only if the game is served anywhere else: `ALLOWED_ORIGIN`, a comma list (`https://*.example.dev` allows its subdomains).
7. **Check.** Open `<worker>/auth/check`: it lists the callback URLs and whether each setting is present (never a secret's value). Then on the web version, press Sign in on the title screen and try each provider.
8. **Rate limit** (optional but advised): the Worker reads a rate-limit binding `AUTH_LIMITER` (in `wrangler.toml`, which the backend owns) for new guests and email codes per IP.

A provider whose settings are missing is simply not offered; the rest work.

## Privacy

What the database holds for a player: an account id, the name they chose, the avatar they chose, the address of the Google or Discord picture (shown to others only if they pick it), whether it is a guest, when it was made and last used, which sign-ins it has (Google's or Discord's account number; for email, an HMAC of the address), and hashed sessions. Deleting the account from the account box removes all of it and, through the backend's `deleteUser`, everything it owns. froglet.games' privacy page and delete-my-data page should name Tumult accounts once this is live.
