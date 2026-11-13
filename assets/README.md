# Art

Everything here is inlined into the single-file build as data URIs by `tools/build.mjs` (see `art` in
`src/manifest.json`), so the game still makes no network requests. A key the UI asks for and cannot find
falls back to drawn art (an initial on a disc), so the game never ships with a hole.

| Folder | What | Key in `T.ART` | Size |
|---|---|---|---|
| `pilots/` | a pilot's portrait, 160 px square, JPEG | `pilot/<CALLSIGN>` | ~8 KB each |
| `scenes/` | the same pilot in their world, 768×432, JPEG | `scene/<CALLSIGN>` | ~50 KB each |
| `fonts/` | Chakra Petch SemiBold, Latin subset, WOFF2 | `@font-face` | 8 KB |

## Where it comes from, and its licence

- **Pilots and scenes** are Cosmic Shore's pilots (`froglet-studio/cosmic-shore`, MIT, © Froglet Inc.): the
  portraits are that repository's player avatars (`Assets/_Graphics/Profile/Pilots/Avatar_<CALLSIGN>.png`, cut
  from each scene's close-up) and the scenes are `Assets/Resources/Pilots/Scenes/<CALLSIGN>.jpg` (or
  `Docs/Pilots/art/scenes/`), resized and re-encoded. Who each pilot is lives in `src/ui/pilots.js`.
  Garrett asked for them here on 2026-11-12: Tumult's heroes are Cosmic Shore's pilots.
- **Chakra Petch** is © 2018 The Chakra Petch Project Authors, under the SIL Open Font License 1.1
  (`fonts/OFL.txt`). It is Cosmic Shore's display face. Subset with
  `pyftsubset ChakraPetch-SemiBold.ttf --unicodes=U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201D,U+2026,U+2022,U+2190-2193,U+00D7 --flavor=woff2`.

## Adding a pilot

1. Resize their avatar to 160×160 (JPEG, quality 80) as `pilots/<CALLSIGN>.jpg` and their scene to 768×432
   (quality 68) as `scenes/<CALLSIGN>.jpg`.
2. Add a row to `U.PILOTS` in `src/ui/pilots.js`: callsign, name, and the two animals after human.
3. `npm run check`: `test/build.test.js` holds every pilot to having both pictures.
