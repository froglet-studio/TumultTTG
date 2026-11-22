---
name: ship-launch
description: Launch Tumult to players - promote bleeding-edge to development and main, check that the froglet.games publish ran, confirm the live page at www.froglet.games/tumult/play/ serves the new version, and republish the claude.ai playtest page. Use on "/ship-launch", "release it", "launch", "put it live", "update the live page".
---

# Launch to players

`/ship-launch` releases what is on `bleeding-edge` to players: `development` (testers and the playtest page) and `main` (www.froglet.games/tumult/play/). It ships nothing new from this session: if the session has unmerged work, run `/ship-preview` first. Only on the person's own ask. Branches: `docs/BRANCHING_AND_RELEASE.md`; hosting: `docs/reference/HOSTING.md`.

## 1. Ready to launch?

First ask the person once whether to **wait for CI** or go **fast, on the local check** (`/ship-preview` section 2.5; skip the question when the command already said, as in `/ship-launch fast`). Fast changes three steps below: this session's pull request merges without waiting for its checks; the promotion does not wait for the CI run on `bleeding-edge` (the local `npm run check` on that same tree stands in for it); and `/playtest-publish` skips its own `npm run check` when `development`'s tree is the one checked here (`git diff --quiet <checked commit> origin/development`). Publish to froglet.games is still waited for: it is the launch. Read the skipped CI runs once afterwards and fix forward if one went red.

- `git fetch origin`. `git rev-list --count origin/bleeding-edge..origin/main` and `..origin/development` must both be 0. Not 0 means someone committed straight to that branch: stop, tell the person, and offer a catch-up (merge it into a branch from `bleeding-edge`, PR with **Create a merge commit**, never squash). A launch cannot fast-forward until it is merged.
- The latest **CI** run on `bleeding-edge` is green (fast: the local `npm run check` on the same tree instead), and https://tumult.pages.dev (the same code) has been looked at.
- This session's own pull request, when it has one, is merged into `bleeding-edge` first: green CI (fast: at once), then squash and merge in the same turn (`/ship-preview` sections 3 and 4, and its "Waiting without stalling").
- The version in `package.json` is higher than the one live, with a `CHANGELOG.md` entry and playtest NOTES for it. If not, bump them on `bleeding-edge` through `/ship-preview` first; never edit `development` or `main`.

## 2. Promote

Promotions are fast-forwards; never commit to `development` or `main` directly.

```bash
git fetch origin
git checkout development && git merge --ff-only origin/bleeding-edge && git push origin development
git checkout main        && git merge --ff-only origin/development   && git push origin main
```

If `--ff-only` refuses, stop (section 1). A session that may push only its own branch gives the person these lines to run instead (PowerShell: `;` between commands, and `git pull` after each checkout).

## 3. The live page

1. The push to `main` runs **Publish to froglet.games** (`.github/workflows/site.yml`). Wait for it without stalling (`/ship-preview`, "Waiting without stalling": a background wait or `gh run watch`, then read the run yourself; never end a turn with nothing set to wake you), then read its summary: it must not say `TUMULT_SITE_DEPLOY_KEY is not set`.
2. The website (froglet-studio/Cosmic-Shore-landing-page) gets a `chore(tumult): publish Tumult <version>` commit in `tumult/play/`; GitHub Pages serves it a minute or two later.
3. Confirm https://www.froglet.games/tumult/play/ loads the new version (ask the person to open it if the session cannot reach froglet.games), and that `_data/tumult.yml` in the website has `live: true` so the Play button on https://www.froglet.games/tumult/ leads there.
4. The game server deploys itself: when the promotion changed `server/`, `src/engine/`, `src/data/`, `src/manifest.json` or `tools/build-server.mjs`, the push to `main` also runs **Deploy game server** (`.github/workflows/worker.yml`), which applies new D1 migrations and deploys. Read its summary: it must say `/api/health` answers ok, not that `CLOUDFLARE_WORKERS_TOKEN` is not set (then the token setup in `docs/reference/HOSTING.md`, "The game server", is still to do, and the person deploys by hand with `npx wrangler@4.42.0 deploy` from `server/`). When none of those paths changed, no run starts; say nothing about the server.

## 4. The playtest page

Run `/playtest-publish` so the claude.ai playtest artifact shows `development`. Tag the release `vX.Y.Z` on `main` if the person wants tags.

## 5. Report

One message: the version now live, https://www.froglet.games/tumult/play/, https://tumult.pages.dev, the playtest page link, and anything that did not publish.
