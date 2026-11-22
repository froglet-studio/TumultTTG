# Sound

Tumult plays Cosmic Shore's soundtrack and effects (2.130, Shombith 2026-11-22). Where the files come from and their
licence: `assets/README.md`. The code: `src/ui/audio.js` (browser only; the engine never makes a sound).

## How a file reaches the page

`tools/build.mjs` fills `T.AUDIO` from `manifest.audio`: `T.AUDIO['sfx/<name>']` and `T.AUDIO['music/<name>']`.

|         | Offline file                                                                                                  | Web version                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Effects | all, as data URIs (~1.6 MB)                                                                                   | all, `assets/audio/sfx/<name>.<hash>.mp3`                              |
| Music   | only `manifest.audio.offline` (one loop); none in the playtest file, whose claude.ai page holds 16 MB at most | all eleven, `assets/audio/music/<name>.<hash>.mp3`                     |
| Fetched | already in the page                                                                                           | an effect after the first tap or key; a track when it starts, streamed |

The service worker leaves music and any Range request to the browser's own cache (a cache cannot store a partial
response); effects are cached like every other asset. MP3 plays in every browser Tumult supports, Safari included.

## Music

One `<audio>` element at a time, crossfaded over 1.4 s. Nothing plays before the first tap or key (browsers
forbid it). After every render the screen names a mood:

| Screen                                                                    | Mood                      |
| ------------------------------------------------------------------------- | ------------------------- |
| Home, Settings, Codex, Atlas, Pilots, Cards, Canon, the Lobby, Host, Join | Menus                     |
| The draft                                                                 | Draft                     |
| The route, a reward, a haven, an event                                    | Route                     |
| A mission                                                                 | Mission                   |
| A won mission, a won expedition                                           | Victory (the outro, once) |

Each track lists the moods it suits (`TRACKS`). A new mood changes the track only when the one playing does not
suit it, so walking from the route into a reward keeps the music going. A track played from the Audio studio plays
to its end first. When a track ends the next is chosen from the rotation (every track not unticked), avoiding the
last two played. Modes: **Follow the game** (the moods), **Shuffle all**, **Repeat one**.

## Effects

`SFX` in `src/ui/audio.js` lists every effect: its id, what it answers in the game, its files (one is picked at
random each time; the six kills vary) and a level trim. Each is decoded once into a Web Audio buffer and played
with a slight random pitch so no two blows sound the same.

They reach the game four ways, none of which changes a screen's code path:

- **`U.sfx`**: the synth's calls (`click`, `heal`, `shield`, `fall`, `ether`, `goal`, `win`, `lose` …) play the
  matching effect, and fall back to the synth while a file is loading or missing. `roll` and `land` stay synth:
  nothing in Cosmic Shore is a die.
- **The effects queue**: `U.feelFx` is wrapped for what the synth never answered (a pilot downed and rising, a
  heart cracking, arrivals, gear, a knock-back, an Ethereal face helping a pilot).
- **The show** (`src/ui/show.js`) cues the attack (`attack`, `foeAttack`, `melee`) with its beam and the impact
  (`impact`, `heavy` for 4 or more) as it lands, so the sound and the blow arrive together.
- **Actions**: a handler first in `U.ACTS` plays an action's own effect (take a card, train, buy, set out, undo,
  end the round) and the screen's plain click is skipped for that moment.

## Settings

Kept in `tumult_v2_prefs` with the other settings (`src/ui/settings.js`): `sound` (the master switch, which every
🔊 button toggles), `master`, `music`, `fx` (0 to 100), `muteMusic`, `muteFx`, `musicMode` and `musicOff` (the
tracks left out). Effects are master × effects, scaled so the defaults match the old synth; music uses a square
law so the slider's middle sounds like the middle. The Audio studio is Settings' Audio tab; the quick panel shows
the player and the three levels.

## Adding a sound

Put the MP3 in `assets/audio/sfx/` (or add a line to `tools/audio-import.sh`), add an entry to `SFX` and call
`U.cue('<id>')` where it happens, or map an existing `U.sfx` call to it. A track goes in `assets/audio/music/`
and `TRACKS` with its moods.
