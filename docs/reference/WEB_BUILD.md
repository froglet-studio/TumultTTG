# The web version

Tumult has two builds from one source (`src/manifest.json`):

| | Offline file | Web version |
|---|---|---|
| Command | `npm run build` | `npm run build:web` |
| Output | `dist/TUMULT.html`, one file (~8 MB) | `dist/web/`, a small page plus `assets/` |
| Network | none, ever | its own files; later Froglet's own services only |
| Where it goes | sent to anyone, played from disk | www.froglet.games/tumult/play/, Cloudflare previews |

Both contain the same engine and screens. The playtest panel and the online screens (`manifest.playtest`) are in neither; they stay in the playtest build for the claude.ai page.

## What `dist/web/` holds

- `index.html` — about 2 KB: the game's night-sky colour for the first paint, a preload for the font, one stylesheet and one deferred script.
- `assets/tumult.<hash>.js`, `assets/tumult.<hash>.css` — every source in manifest order, as in the single file. About 1 MB and 80 KB raw, about 270 KB and 18 KB gzipped, which both GitHub Pages and Cloudflare apply.
- `assets/<pilots|scenes|portraits>/<NAME>.<hash>.webp` — each painting as its own file. `T.ART` holds their paths instead of data URIs, so the screens are unchanged, and a painting is fetched only when a screen shows it.
- `assets/ChakraPetch-SemiBold.<hash>.woff2` — the font, named from the stylesheet beside it.
- `sw.js` — a service worker (https and localhost only). It fetches the script, stylesheet and font when installed, keeps every `assets/` file it serves (cache first: a content-named file never changes), and fetches the page from the network first, falling back to the cached copy offline. Each release has its own cache, named from the core files' hashes; the old one is deleted when the new one takes over.
- `_headers` — Cloudflare Pages: `assets/` cached for a year as immutable, the page and `sw.js` always revalidated. GitHub Pages ignores it and caches everything for 10 minutes; the content hashes keep that correct.
- `.nojekyll` — GitHub Pages serves the files as they are.

Every file under `assets/` is named by the first 10 hex digits of its SHA-256, so a rebuild that changes nothing changes no name, and a returning player downloads only what changed. A first visit downloads about 300 KB before the title screen can draw, against 8 MB for the single file (base64 paintings barely compress).

## Working on it

```
npm run build:web                 dist/web/ + syntax check of the script and the service worker
npm run dev:web                   http://localhost:5173, the web version as Pages serves it, rebuilt on each page load
```

`test/web.test.js` checks that every file the page and the stylesheet name is built, that every painting key of the single file is a file here, that nothing under `assets/` lacks a content hash, and that the service worker compiles and precaches only files that exist.

## Deploying

Addresses, workflows and the admin setup are in `HOSTING.md`. In short:

- **Pull requests and `bleeding-edge`:** `.github/workflows/preview.yml` deploys `dist/web` to the Cloudflare Pages project `tumult` (`bleeding-edge` at tumult.pages.dev, each pull request at its branch's address, linked on the PR). It needs the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; until they exist it builds and skips the deploy.
- **`main`:** `.github/workflows/site.yml` copies `dist/web` into the Froglet website's `tumult/play/` folder on every push, and GitHub Pages serves it at www.froglet.games/tumult/play/. `pages.yml` is a manual fallback at froglet-studio.github.io/TumultTTG/.
- **`development`:** `.github/workflows/playtest.yml` builds the playtest file; a Claude session puts it on the claude.ai page with `/playtest-publish`.

## The backend seam

The online screens reach a server only through `T.Backend` (`src/ui/backend.js`), never through a host page's API. A provider is `{ name, available(), use(capability) }`; the newest available one serves every call, and with none the game plays solo, exactly as before. The capabilities are `db` (the shared store), `room` (an optional live channel) and `user` (who is playing); `src/ui/net.js`, `heroes-net.js` and `canon-net.js` show the calls each makes.

Built in today is `claude-artifact`, the claude.ai page that hosts the playtest build (`window.claude.use`). The Cloudflare Workers backend will register a provider with the same three capabilities (`T.Backend.register`), and the online screens will then join the web version's manifest list.
