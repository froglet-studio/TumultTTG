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

Stop and report if `npm run check` fails: testers must not get a broken build. In a fast `/ship-launch` (its section 1), skip `npm run check` when this session already passed it on the same tree (`git diff --quiet <checked commit> origin/development` exits 0); `npm ci` and `npm run build:playtest` still run.

Check the playtest panel's NOTES (`src/ui/playtest.js`) describe this version (`package.json`). If they are stale, say so to the person; they are rewritten on `bleeding-edge` and promoted, never edited on `development`.

## 3. Publish

Publish `dist/TUMULT.playtest.html` with the Artifact tool, `url` set to the playtest artifact, so it updates in place. Keep the artifact's capabilities (omit `capabilities`) so the shared store and sign-in keep working.

The page names the ability paintings beside it instead of carrying them (it holds 16 MB at most): `npm run build:playtest` copies them to `dist/ability-art/`. Pass them with the page as `files`, each at the path the page names it by, with `root: "dist"`: `{"ability-art/sheet-001.webp": "ability-art/sheet-001.webp", …}` for every file in `dist/ability-art/` (118 today, well under one publish's 255 files and 64 MB). Without them the cards show their drawn verbs instead of the paintings.

## 4. Report

One line to the person: the version and commit now on the playtest page, and its link.
