# Branching and release

What each branch is for, where each build comes from, and how work moves from one to the next. It follows Cosmic Shore's flow (`Docs/BRANCHING_AND_RELEASE.md` there), with `main` in place of Cosmic Shore's `master`.

Tumult has two co-owners, **Shombith and Garrett** (2026-11-20). Both work on `bleeding-edge`, both can promote, and either can settle a question this file leaves open.

## The three branches

| Branch | What it is | Who writes to it |
|---|---|---|
| `bleeding-edge` | **Trunk.** Where all work lands, and the repository's default branch. | Everyone, through a pull request |
| `development` | What testers get: the claude.ai playtest page and test builds. | Receives from `bleeding-edge` only |
| `main` | What players get: the release on froglet.games. | Receives from `development` only |

Work flows one way:

```
   your branch (claude/…, feature/…, bugfix/…)
        ↓  pull request, squash and merge
   bleeding-edge  ──► preview build      (the team)
        ↓  promotion, fast-forward
   development    ──► playtest page      (testers)
        ↓  promotion, fast-forward
   main           ──► release            (players)
```

Nothing flows back up. `development` and `main` never take a commit of their own; that is what keeps every promotion a fast-forward. **If in doubt, open your pull request into `bleeding-edge`.**

A fix that players need now still goes through `bleeding-edge` first and is promoted down the line, the same day if need be. Never commit straight to `development` or `main`.

## Short-lived branches

Named `type/area-short-description` (`feature/`, `bugfix/`, `hotfix/`, `chore/`), based on the latest `bleeding-edge`, one logical change each. Agent sessions name their own (`claude/…`, `codex/…`); keep those names, because the prefix shows who opened the branch. Pull requests into `bleeding-edge` are squashed; delete the branch after the merge.

## The builds

| Build | Source branch | Where it goes | Status |
|---|---|---|---|
| **Offline file** (`npm run build` → `dist/TUMULT.html`) | any | sent to anyone; plays with no network | built today |
| **Preview** (`npm run build:web`) | `bleeding-edge` and pull requests | tumult.pages.dev and a link per pull request (`.github/workflows/preview.yml`) | deploys once the Cloudflare secrets are set (`docs/reference/HOSTING.md`) |
| **Playtest page** (`npm run build:playtest`) | `development` | the claude.ai playtest artifact (online play lives here today, `src/ui/net.js`) | built on every push (`.github/workflows/playtest.yml`); a Claude session republishes it with `/playtest-publish` |
| **Hosted web build** (`npm run build:web`, `docs/reference/WEB_BUILD.md`) | `main` | GitHub Pages at tumult.froglet.games (`.github/workflows/pages.yml`) | published on every push to `main` once the admin setup in `docs/reference/HOSTING.md` is done |

The offline file stays one self-contained HTML file that makes no network requests. The hosted web build is a second output of the same source: it may talk to Froglet's own services (the backend and sign-in Worker, Froglet Analytics), and nothing else, and it must still play solo when those are unreachable. Anyone can play solo; online play needs sign-in or an invite.

## Runbook: promote `bleeding-edge` to `development`

Do this when a batch on `bleeding-edge` is worth putting in front of testers.

```bash
git fetch origin
git checkout development
git merge --ff-only origin/bleeding-edge
git push origin development
```

`--ff-only` is the safety catch: it succeeds only if `development` has no commits of its own. **If it refuses, do not force it and do not merge by hand.** Something was committed straight to `development`; find it first.

Prefer the GitHub interface? Open a pull request from `bleeding-edge` into `development` and use **Create a merge commit**. **Never squash a promotion**: squashing throws away the shared history that makes the next promotion a fast-forward.

Check they match afterwards:

```bash
git diff --stat origin/development origin/bleeding-edge   # empty = in sync
```

Then rebuild the playtest page (next section).

## Runbook: rebuild the playtest page from `development`

The claude.ai playtest artifact always shows `development`, so testers and the online games on it are never on half-finished work.

```bash
git fetch origin
git checkout --detach origin/development
npm ci
npm run check
npm run build:playtest        # → dist/TUMULT.playtest.html
```

Republish `dist/TUMULT.playtest.html` to the same artifact (`/playtest-publish` does all of this section), so its link and its shared store (the online games in progress) are kept. A Claude session does this with the Artifact tool, updating the existing artifact by its URL; never publish a second playtest artifact. Rewrite the playtest panel's NOTES for the release, as `CLAUDE.md` asks.

## Runbook: release `development` to `main`

Release from `development`, not `bleeding-edge`: `development` is what testers have played.

1. Bump the version and `CHANGELOG.md` on `bleeding-edge`, and promote it down, rather than editing `main`, which would give `main` a commit of its own.
2. Move `main`:

   ```bash
   git fetch origin
   git checkout main
   git merge --ff-only origin/development
   git push origin main
   ```

   or a pull request from `development` into `main` with **Create a merge commit**.

3. Tag it `vX.Y.Z` on `main`. The push to `main` publishes the hosted web build to tumult.froglet.games.

## Repository settings (admin only)

These are set on GitHub by a repository admin (Shombith). Nothing in the repository can set them.

1. **Default branch:** Settings → General → Default branch → `bleeding-edge`. New pull requests then target it.
2. **A ruleset on `bleeding-edge`**: require a pull request, require the CI checks `build + test (Node 22)` and `build + test (Node 24)`, require review from Code Owners (it only bites on `.github/`), block force pushes and deletion. Allow squash and merge commits.
3. **A ruleset on `development` and `main`**: block force pushes and deletion, require the CI checks, and leave **Require linear history** unticked so a promotion's merge commit is allowed. Add the two co-owners (or the admin role) to the bypass list for pushes, so the `--ff-only` promotions above can be pushed directly; everyone else goes through a pull request.
4. **Merging:** Settings → General → Pull Requests: allow squash merging (the default for feature branches) and merge commits (for promotions); turn off rebase merging.
5. **Actions → Fork pull request workflows:** require approval for all external contributors.
6. **Pages and previews:** the domain, Pages source, `github-pages` environment and Cloudflare secrets, step by step, are in `docs/reference/HOSTING.md`.
