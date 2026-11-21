---
name: ship-preview
description: Ship this session's Tumult work to the team preview - run the checks, open the pull request into bleeding-edge, merge it once CI is green, and reply with the PR and the review link https://tumult.pages.dev. Players are not affected. Use on "/ship-preview", "ship it", "merge this", "put it on the preview", "give me a review link".
---

# Ship to the preview

`/ship-preview` takes the work in this session to a merged pull request on `bleeding-edge` and a review link anyone can play: https://tumult.pages.dev. Players do not see it; `/ship-launch` takes it to them. Saying `/ship-preview` is the go to merge; "PR only" stops at the pull request. Branches and builds: `docs/BRANCHING_AND_RELEASE.md`; hosting: `docs/reference/HOSTING.md`.

## 1. Where you are

- Work on a branch of your own from the latest `bleeding-edge` (agent sessions keep their `claude/…` name). Never ship from `bleeding-edge`, `development` or `main` themselves.
- `git fetch origin` and check `git rev-list --count origin/bleeding-edge..origin/main`. Not 0 means someone committed straight to `main`: say so to the person and offer a catch-up (merge `origin/main` into a branch from `bleeding-edge`, PR with **Create a merge commit**). A release refuses until that is merged.
- Bring your branch up to date: `git merge origin/bleeding-edge` (never rebase or force-push a branch someone else pushed to).

## 2. Gates (all must pass)

```
npm run check          builds (offline, playtest, web) + every test
npm run format         then npm run format:check
npm run docs           only if cards, enemies or missions changed; commit what it regenerates
```

And the working agreements in `CLAUDE.md`: a rules change has a test; a balance change has before/after numbers from `node tools/sim.js 40` for the PR; a change to the saved shape raises `T.SAVE_VERSION` with a migration and a fixture. A player-facing change bumps the version in `package.json` and `package-lock.json`, adds a `CHANGELOG.md` entry and rewrites the playtest NOTES (`src/ui/playtest.js`). After a failure, re-run only what failed while you fix it.

## 3. Commit, push, pull request

- Commits: `type(scope): summary`, imperative, about 72 characters, one logical change each, with the `Co-Authored-By:` and `Claude-Session:` trailers.
- `git push -u origin <branch>`.
- Open the pull request into **`bleeding-edge`**: what changed, why, the gate results, any sim numbers, and "Affects: <person>'s <area>" when it touches someone else's work. Changes under `.github/` need a code owner's review; say so and stop at the PR.
- Subscribe to the PR's activity and wait for CI (`build + test (Node 22)`, `build + test (Node 24)`, `preview`). Red is yours to fix: find the cause, push the fix; never skip a test.

## 4. Merge

When CI is green and the PR is mergeable: **squash and merge** into `bleeding-edge`, then delete the branch. A catch-up of `main` or a promotion is the exception: **Create a merge commit**, never squash. If the session cannot merge (no permission), give the person the PR link and say "Squash and merge".

## 5. The review link

- Every pull request already has its own preview, `https://<branch, "/" as "-">.tumult.pages.dev`, on the PR as the `preview` deployment.
- After the merge, the **Preview** workflow on `bleeding-edge` updates **https://tumult.pages.dev** in about a minute. Read the run's summary for its `Preview:` line and check it says deployed, not "secrets are not set".

Reply in one message: what shipped, the PR link, and the review link (https://tumult.pages.dev). End with one line: "`/ship-launch` puts it live for players."

## 6. If the backend changed

Anything under `server/` is not deployed by a merge. Tell the person to run `npx wrangler@4.42.0 deploy` from `server/` (and `npx wrangler@4.42.0 d1 migrations apply tumult --remote` for a new migration), or run it where the session is signed in to Cloudflare. Check `<worker>/api/health` afterwards (the address is in `server/address.json`).
