---
name: playtest-publish
description: Republish the claude.ai Tumult playtest page from the development branch, keeping its link and shared store. Use after a promotion to development, or on "update the playtest page", "republish the playtest artifact", "/playtest-publish".
---

# Republish the playtest page

The claude.ai playtest artifact always shows `development` (`docs/BRANCHING_AND_RELEASE.md`). GitHub cannot publish it, so a session does, with the Artifact tool.

## 1. Find the artifact

Its link is the "Playtest page:" line in `docs/reference/HOSTING.md`. If it is not recorded, ask the person for it and add it there in the same PR as any other change (or a one-line docs PR into `bleeding-edge`). Never publish a second playtest artifact: a new one loses every tester's link and the online games in its store.

Read it first (`Artifact` action `read` with the url). The result must say you are a **writer**; if not, stop and tell the person who owns it.

## 2. Build `development`

```bash
git fetch origin development
git checkout --detach origin/development
npm ci
npm run check
npm run build:playtest        # → dist/TUMULT.playtest.html
```

Stop and report if `npm run check` fails: testers must not get a broken build.

Check the playtest panel's NOTES (`src/ui/playtest.js`) describe this version (`package.json`). If they are stale, say so to the person; they are rewritten on `bleeding-edge` and promoted, never edited on `development`.

## 3. Publish

Publish `dist/TUMULT.playtest.html` with the Artifact tool, `url` set to the playtest artifact, so it updates in place. Keep the artifact's capabilities (omit `capabilities`) so the shared store and sign-in keep working.

## 4. Report

One line to the person: the version and commit now on the playtest page, and its link.
