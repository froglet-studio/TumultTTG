# Art

Everything here is inlined into the single-file build as data URIs by `tools/build.mjs` (see `art` in
`src/manifest.json`), so the game still makes no network requests. A key the UI asks for and cannot find
falls back to drawn art (an initial on a disc), so the game never ships with a hole.

| Folder       | What                                                                                                                                                                        | Key in `T.ART`       | Size              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------- |
| `pilots/`    | a pilot's portrait, 160 px square, JPEG                                                                                                                                     | `pilot/<CALLSIGN>`   | ~8 KB each        |
| `scenes/`    | the same pilot in their world, 768×432, WebP                                                                                                                                | `scene/<CALLSIGN>`   | ~40–50 KB each    |
| `scenes-hd/` | the same scenes at full size, 1536×864, WebP q74; the web version sends these in place of `scenes/` (`buildWeb` in `tools/build.mjs`), the single file keeps the small ones | (as `scene/`)        | ~100 KB each      |
| `portraits/` | painted clade heads, 128 px tiles four to a row, WebP                                                                                                                       | `portrait/sheet-<N>` | ~17–61 KB a sheet |
| `fonts/`     | Chakra Petch SemiBold and Cinzel Bold, Latin subsets, WOFF2                                                                                                                 | `@font-face`         | 8 KB + 15 KB      |

## Where it comes from, and its licence

- **Pilots and scenes** are Cosmic Shore's pilots (`froglet-studio/cosmic-shore`, MIT, © Froglet Inc.): the
  portraits are that repository's player avatars (`Assets/_Graphics/Profile/Pilots/Avatar_<CALLSIGN>.png`, cut
  from each scene's close-up) and the scenes are `Assets/Resources/Pilots/Scenes/<CALLSIGN>.jpg` (or
  `Docs/Pilots/art/scenes/`), resized and re-encoded. The thirty pilots beyond the callsigns (added in 2.12)
  take their portrait from their bust, `Docs/Pilots/art/busts/<Name>.jpg` (the upper middle square), their scene
  from `Docs/Pilots/art/scenes/<Name>.jpg`, and their pair from the bust's brief
  (`busts/briefs/<Name>.txt`). The painted crew pilots (76 added in 2.69, Cosmic Shore 2026-11-19; crews 13 to 17, 90 more, in 2.123) take their
  portrait from `Assets/_Graphics/Profile/Pilots/Avatar_<Name>.png`, their scene from
  `Assets/Resources/Pilots/Scenes/<Name>.jpg`, and their pair and callsign from `Docs/Pilots/art/roster/plan.json`;
  many share a callsign, so their files and keys use the first name in capitals (`pilot/JORIRO`). Scenes also illustrate events and havens, where they show life on Tumult. Who each pilot is lives in `src/ui/pilots.js`.
  Garrett asked for them here on 2026-11-12: Tumult's heroes are Cosmic Shore's pilots.
- **Element symbols** (Mass, Charge, Space, Time) are Cosmic Shore's element petals (`froglet-studio/cosmic-shore`, MIT,
  © Froglet Inc., `Assets/Resources/ElementPetals/<element>_petal.png`), traced to SVG paths in `src/ui/icons.js`
  (2.29). Garrett, 2026-11-14: Froglet's Hypersea games share their resources freely.
- **The Omni symbol** is Cosmic Shore's omnicrystal (`froglet-studio/cosmic-shore`, MIT, © Froglet Inc.,
  `Assets/_Graphics/ElementIcons/OmniCrystal_Active.png`), redrawn as an SVG path in `src/ui/icons.js` (2.40;
  Garrett, 2026-11-15).
- **Clade portraits** were generated for this repository in Figma Weave (Nano Banana Pro, Garrett's workspace,
  2026-11-17), styled on a test sheet he approved, and approved by him before going in. Garrett chose generated
  sheets for clade art (2026-11-17). Each 2048 px sheet was cut into equal cells, trimmed 2.5% a side to drop the
  grid lines, resized to 128 px and repacked four to a row; the scorpion was a single 1024 px image. Which clade
  sits in which tile is `U.PORTRAIT_SHEETS` in `src/ui/icons.js`.
- **Ability paintings** (`ability-art/sheet-NNN.webp`) were generated for this repository in Figma Weave in Garrett's
  workspace (2026-11-22/23): the first two sheets with Nano Banana Pro, the rest with Nano Banana 2 Lite, which Garrett
  chose for the full set. Garrett set the direction (abstract close-ups of the trait in motion, no whole animals, no
  faces) and approved test sheets before the run. Each 1024 px sheet is a 3×3 grid; `node tools/ability-art.js cut`
  finds its gutters, trims 2% a cell, resizes to 144 px and repacks it. Which face sits in which tile is
  `U.ABILITY_SHEETS` in `src/ui/ability-art.js`; `tools/ability-art.js prompt N` prints the prompt a sheet was made from.
- **Chakra Petch** is © 2018 The Chakra Petch Project Authors, under the SIL Open Font License 1.1
  (`fonts/OFL.txt`). It is Cosmic Shore's display face. Subset with
  `pyftsubset ChakraPetch-SemiBold.ttf --unicodes=U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201D,U+2026,U+2022,U+2190-2193,U+00D7 --flavor=woff2`.
- **Cinzel** is © 2020 The Cinzel Project Authors, under the SIL Open Font License 1.1 (`fonts/OFL-Cinzel.txt`). It is the
  slow serif of the mission's banners and blows (a foe felled, a new round, a big hit). The Latin subset Google
  Fonts serves (`fonts.gstatic.com/s/cinzel/v26`, weight 700).

## Sound

| Folder         | What                                                                              | Key in `T.AUDIO` | Size                          |
| -------------- | --------------------------------------------------------------------------------- | ---------------- | ----------------------------- |
| `audio/music/` | Cosmic Shore's soundtrack, eleven tracks, 96 kbps stereo MP3, loudness-normalised | `music/<name>`   | 0.9–3.8 MB each, 27 MB in all |
| `audio/sfx/`   | fifty of Cosmic Shore's effects, 96 kbps mono MP3, trimmed and peak-normalised    | `sfx/<name>`     | 2–120 KB each, 1.2 MB in all  |

Both are Cosmic Shore's (`froglet-studio/cosmic-shore`, MIT, © Froglet Inc.; Shombith asked for them on
2026-11-22; Garrett, 2026-11-14: Froglet's Hypersea games share their resources freely). The music is
`Assets/_Audio/Music/` (the full-quality MP3s where there are some, the WAV masters otherwise), titled as Cosmic
Shore's `Soundtrack` asset titles them. The effects are the files Cosmic Shore's FMOD project (`Cosmic Shore/`)
plays for its Menu and Gameplay events, plus Cosmic Shore's menu hover (`Assets/_Audio/Sounds/Hover.ogg`) and
its six creature-death layers (`Assets/_Audio/Sounds/MiguelSFX/`). Left out on purpose: the vessel engine and
tadpole loops (long hums made for flight), the third-party library samples the FMOD project layers under them
(the `S6k` recordings, `VGMSampColl`, the drum hits, a spring reverb impulse) and the haptic samples.
`tools/audio-import.sh` rebuilds every file from a Cosmic Shore checkout; which Tumult moment plays which file is
`src/ui/audio.js` (`docs/reference/AUDIO.md`).

The offline file inlines every effect and only the music named in `manifest.audio.offline` (one 2-minute loop,
1.6 MB), so it grows by about 3.5 MB rather than 40. The web version sends every file under a content-hashed name.

## Adding a pilot

1. Resize their avatar to 160×160 (JPEG, quality 80) as `pilots/<CALLSIGN>.jpg` and their scene to 768×432
   (WebP, quality 58–62) as `scenes/<CALLSIGN>.webp`; save the scene at its full 1536×864 (WebP, quality 74) as
   `scenes-hd/<CALLSIGN>.webp`.
2. Add a row to `U.PILOTS` in `src/ui/pilots.js`: callsign, name, and the two animals after human.
3. `npm run check`: `test/build.test.js` holds every pilot to having both pictures.
