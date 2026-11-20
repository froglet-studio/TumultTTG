# Hosting

Where each build of Tumult is served from, what publishes it, and the one-time setup an admin does. The builds themselves are described in `WEB_BUILD.md`; the branches in `../BRANCHING_AND_RELEASE.md`.

| Address | What it shows | Published by | When |
|---|---|---|---|
| https://www.froglet.games/tumult/play/ | `main`: the release players get | `.github/workflows/site.yml`, a commit into the Froglet website | every push to `main`, or "Run workflow" |
| https://www.froglet.games/tumult/ | the store page with the Play button | the website repository itself | edited there |
| https://tumult.pages.dev | `bleeding-edge`: the team's latest | `.github/workflows/preview.yml` (Cloudflare Pages) | every push to `bleeding-edge` |
| https://&lt;branch&gt;.tumult.pages.dev | a pull request's branch, `/` written as `-` | the same | every push to the pull request; the link is on the PR as the `preview` deployment |
| https://froglet-studio.github.io/TumultTTG/ | `main`, plus the offline file at `/TUMULT.html` (fallback only) | `.github/workflows/pages.yml` | by hand |
| the claude.ai playtest page | `development`, with the playtest panel and online play | a Claude session, `/playtest-publish` | after each promotion to `development` |
| `tumult-api.<account>.workers.dev` | the online backend (`BACKEND.md`) | `npx wrangler deploy` from `server/` | by hand |

## Why the game lives inside the website

froglet.games is GitHub Pages from `froglet-studio/Cosmic-Shore-landing-page` (its `CNAME` names `www.froglet.games`). The domain's DNS is **not** on Cloudflare: its nameservers were Google's (`ns-cloud-a1..a4.googledomains.com`, recorded in Cosmic Shore's `Docs/WEBGL_TOYBOX.md` §5.2 on 2026-10-14), and nobody on the team can change it today. So nothing here needs a DNS change:

- **The game** is copied into the website's own folder `tumult/play/` on each release, so it is served by the site that already has the domain and its certificate. It sits beside its store page (`/tumult/`), shares the site's address for search engines, and its relative paths and service worker (scope `/tumult/play/`; it only touches caches named `tumult-…`) work in a sub-folder unchanged. Jekyll copies the files as they are, because none has front matter.
- **Previews** are on `pages.dev`, which needs no froglet.games record, as the website's own previews do.
- **The backend Worker** keeps its `workers.dev` address. A Worker's custom domain needs the domain's DNS on Cloudflare, and a CNAME from another DNS host to `workers.dev` is refused.
- **Email sign-in** stays off: sending from Resend needs DNS records on the sending domain. Google and Discord need none.

If the DNS becomes reachable later (moving froglet.games to Cloudflare's free plan is already planned for Cosmic Shore's browser Toybox: export the zone first, copy the MX records, keep the GitHub Pages records "DNS only"), `api.tumult.froglet.games` can take over from `workers.dev` (the `routes` line in `server/wrangler.toml`, the default in `src/web/server.js`, the Google and Discord redirect addresses), and email sign-in can be switched on (`ACCOUNTS.md`). The game can stay where it is.

Cloudflare reads `dist/web/_headers` (long caching for `assets/`, `noindex` so previews stay out of search results); GitHub Pages ignores it, and `site.yml` leaves it out of the website.

## One-time setup (an admin)

Nothing in the repository can do these. Each is undone by reversing it in the same screen.

### 1. Publishing into the website

The release workflow pushes one commit per release to the website's `main`, so it needs write access to that one repository, and nothing else.

1. **Make a key pair** on your computer (no passphrase): `ssh-keygen -t ed25519 -C "TumultTTG publish" -N "" -f tumult-site-key`. This writes `tumult-site-key` (private) and `tumult-site-key.pub` (public).
2. **Public half on the website:** froglet-studio/Cosmic-Shore-landing-page → Settings → **Deploy keys** → Add deploy key. Title `TumultTTG publish`, Key = the contents of `tumult-site-key.pub`, tick **Allow write access** → Add key.
3. **Private half on TumultTTG:** TumultTTG → Settings → **Environments** → New environment `froglet-games` → Configure:
   - Deployment branches and tags → **Selected branches and tags** → Add rule `main`.
   - Environment secrets → Add secret `TUMULT_SITE_DEPLOY_KEY` = the whole contents of `tumult-site-key`, from `-----BEGIN` to `END … KEY-----`.
4. Delete both files from your computer.
5. If the website's `main` has a ruleset that blocks pushes, add the deploy key to its bypass list (Settings → Rules → the ruleset → Bypass list → Add bypass → **Deploy keys**).

The first publish happens on the next push to `main` (a promotion from `development`), or press Actions → Publish to froglet.games → Run workflow on `main`. Then, in the website, set `live: true` and `play_url: "/tumult/play/"` in `_data/tumult.yml` so the Play buttons on `/tumult/` lead to it.

### 2. Cloudflare previews

1. **API token:** Cloudflare → My Profile → API Tokens → Create Token → **Create Custom Token**.
   - Name: `TumultTTG previews`
   - Permissions: **Account** → **Cloudflare Pages** → **Edit**
   - Account Resources: Include → Froglet's account (only that one)
   - Continue to summary → Create Token, and copy it (it is shown once).
2. **Account ID:** Cloudflare → Workers & Pages; it is in the right-hand column (also the long hex in the dashboard's address).
3. **Secrets:** TumultTTG → Settings → Secrets and variables → Actions → New repository secret, twice:
   - `CLOUDFLARE_API_TOKEN` = the token
   - `CLOUDFLARE_ACCOUNT_ID` = the account ID
4. **First deploy:** Actions → Preview → the latest `bleeding-edge` run → Re-run all jobs (or push anything). The run creates the Pages project `tumult` (production branch `bleeding-edge`) and prints the link in its summary. If `tumult.pages.dev` is already taken by someone else, Cloudflare gives the project another subdomain; the run summary shows the real one, and this file should be updated to match.

Until the two secrets exist, the Preview job builds and skips the deploy, and passes.

### 3. The fallback address (optional)

Only if the website cannot be used: TumultTTG → Settings → Pages → Source **GitHub Actions** (no custom domain), then Settings → Environments → `github-pages` → Deployment branches and tags → add `main`. Actions → Publish fallback build → Run workflow on `main` publishes https://froglet-studio.github.io/TumultTTG/.

### 4. The claude.ai playtest page

The playtest artifact is published from `development` by a Claude session, never by GitHub: run `/playtest-publish` (`.claude/skills/playtest-publish/SKILL.md`). It republishes the same artifact so its link and its shared store (the online games in progress) are kept. The session must be signed in as someone with edit access to the artifact.

Playtest page: _(not recorded yet: add the artifact's claude.ai link here)_

The `Playtest build` workflow also builds `TUMULT.playtest.html` on every push to `development` and keeps it on the run for 90 days, for anyone who wants the file without building it.
