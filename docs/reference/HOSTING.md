# Hosting

Where each build of Tumult is served from, what publishes it, and the one-time setup an admin does. The builds themselves are described in `WEB_BUILD.md`; the branches in `../BRANCHING_AND_RELEASE.md`.

| Address | What it shows | Published by | When |
|---|---|---|---|
| https://tumult.froglet.games | `main`: the release players get | `.github/workflows/pages.yml` (GitHub Pages) | every push to `main`, or "Run workflow" |
| https://tumult.froglet.games/TUMULT.html | the offline single file of `main` | the same run | the same |
| https://tumult.pages.dev | `bleeding-edge`: the team's latest | `.github/workflows/preview.yml` (Cloudflare Pages) | every push to `bleeding-edge` |
| https://&lt;branch&gt;.tumult.pages.dev | a pull request's branch, `/` written as `-` | the same | every push to the pull request; the link is on the PR as the `preview` deployment |
| the claude.ai playtest page | `development`, with the playtest panel and online play | a Claude session, `/playtest-publish` | after each promotion to `development` |

This mirrors the Froglet website (`froglet-studio/Cosmic-Shore-landing-page`): GitHub Pages serves what players see, and Cloudflare Pages serves previews on `pages.dev`. The domain's DNS is **not** on Cloudflare: froglet.games uses Google's nameservers (`ns-cloud-a1..a4.googledomains.com`, recorded in Cosmic Shore's `Docs/WEBGL_TOYBOX.md` §5.2 on 2026-10-14), so every froglet.games record below is added there, at the Google DNS host (Google Cloud DNS, or Squarespace Domains for a domain that came from Google Domains). Previews need no froglet.games record at all. The one difference is that Tumult's previews are uploaded by a workflow (`wrangler pages deploy`) rather than built by Cloudflare's Git integration, because the build is `npm run build:web`, not Jekyll.

Cloudflare reads `dist/web/_headers` (long caching for `assets/`, `noindex` so previews stay out of search results); GitHub Pages ignores it.

## One-time setup (an admin)

Nothing in the repository can do these. Each is undone by reversing it in the same screen.

### 1. GitHub Pages at tumult.froglet.games

1. **Verify the domain for the organisation**, if `froglet.games` is not already listed: GitHub → organisation `froglet-studio` → Settings → Pages → Add a domain → `froglet.games`. GitHub shows a TXT record (`_github-pages-challenge-froglet-studio`); add it at froglet.games' DNS host (Google, step 2), then press Verify. This stops anyone else's repository claiming a `froglet.games` subdomain.
2. **DNS:** at froglet.games' DNS host (Google Cloud DNS → the froglet.games zone → Add standard, or Squarespace Domains → froglet.games → DNS → Custom records), add:
   - Type `CNAME`, Host `tumult`, Data `froglet-studio.github.io.` (Google Cloud DNS wants the trailing dot), TTL 1 hour.
   GitHub issues and renews the HTTPS certificate itself once this resolves.
3. **Pages source:** TumultTTG → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
4. **Custom domain:** same screen → Custom domain → `tumult.froglet.games` → Save. Wait for the DNS check to turn green (minutes, sometimes an hour), then tick **Enforce HTTPS**.
5. **Let `main` deploy:** Settings → Environments → `github-pages` → Deployment branches and tags. GitHub limits it to the default branch (`bleeding-edge`); add a rule for `main`, and remove `bleeding-edge` so only a release can go live.

The first publish happens on the next push to `main` (a promotion from `development`), or press Actions → Publish playable build → Run workflow on `main`. `main` must contain the web build (`npm run build:web`) for that run to pass.

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

### 3. The claude.ai playtest page

The playtest artifact is published from `development` by a Claude session, never by GitHub: run `/playtest-publish` (`.claude/skills/playtest-publish/SKILL.md`). It republishes the same artifact so its link and its shared store (the online games in progress) are kept. The session must be signed in as someone with edit access to the artifact.

Playtest page: _(not recorded yet: add the artifact's claude.ai link here)_

The `Playtest build` workflow also builds `TUMULT.playtest.html` on every push to `development` and keeps it on the run for 90 days, for anyone who wants the file without building it.

## The API's address

The backend Worker (`docs/reference/BACKEND.md`) is served from its `workers.dev` address at launch, because a Worker's custom domain needs the domain's DNS on Cloudflare, and a CNAME from Google's DNS to `workers.dev` is refused by Cloudflare. Moving froglet.games' DNS to Cloudflare's free plan (export the zone first, copy the MX records, keep the GitHub Pages records "DNS only") is a later step, already planned for Cosmic Shore's browser Toybox; after it, `api.tumult.froglet.games` takes over by the `routes` line in `server/wrangler.toml`, the default in `src/web/server.js` and the Google and Discord redirect addresses.
