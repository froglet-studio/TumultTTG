# Anonymous play data

The web version tells Froglet how Tumult is played: where new players stop, how missions end, which card faces get played. It sends to Tumult's own **Froglet Analytics** server, the analytics server Froglet already runs for Cosmic Shore (`froglet-studio/Cosmic-Shore`, `Tools/Analytics/server/`), as a second instance with Tumult's own event list, data and keys. Nothing goes to a third party.

| | |
|---|---|
| Event list | `docs/analytics/EVENT_SCHEMA.json`, the contract: the server refuses an event it does not name |
| What the game records | `src/ui/telemetry.js` (both builds; it sends only when a provider offers `analytics`) |
| What sends it | `src/web/analytics.js` (web version only), a `T.Backend` provider offering one capability, `analytics` |
| Where | `docs/analytics/ingest.json` (the server's address) and `docs/analytics/ingest_key.public` |
| The server | `setup-analytics-vm.sh` in Cosmic Shore with `ANALYTICS_INSTANCE=tumult` (its README, "A second instance") |

## What is sent, and what never is

- **Anonymous.** The player is `t_` and 24 random hex digits, made on the device's first visit and kept in `localStorage` (`tumult_v2_anon`, with the device's visit, run and mission counts and the mission being counted). No account, no sign-in, no cookie.
- **Never sent:** a name a player typed (a made pilot is `made`, never its name), canon notes, the save, the browser's full referrer (only `direct`, `self`, `other` or a froglet.games host). The server stores no IP address, only a two-letter country.
- **Off switch.** The title screen says that play data is sent and has a button to turn it off (`analytics_turned_off` is the last event that device sends) and back on. A browser with Global Privacy Control or Do Not Track sends nothing and the title says so.
- **Builds.** The offline file and the playtest page contain no sender and make no request (`test/telemetry.test.js`). The web version sends from https pages only; on localhost only with `?analytics=1`. Preview deployments are tagged `build_kind: development`, tumult.froglet.games `release`.

## The events

Every event carries the envelope (`common_envelope` in the schema: the anonymous id, a visit id, the version, `web`, the build kind, the host, desktop or mobile, the OS family, phone / tablet / desktop, touch, the schema version and the device's clock).

| Event | When |
|---|---|
| `session_started` | the page opens: first visit or not, visits, days since the first, runs and missions before, a save to continue |
| `run_started`, `draft_completed` | New Expedition or Play now (`play_now`); the squad set out (each pilot's pre-made id or `made`, clades, card count) |
| `tutorial_shown` | a first-time tip (`map`, `mission`) |
| `guide_step` | the guided first mission: next, back, finished or skipped, and the step (`docs/reference/WELCOME.md`) |
| `signin_prompt` | sign-in offered (after the first win, on the title, before hosting) and how it was answered; only where the page has accounts |
| `invite_link` | an invite link opened, joined or declined, or copied by a host |
| `mission_started` | a mission's board opens for the first time (a mission resumed from a save is not counted twice) |
| `mission_ended` | won or lost: the playtest report's fields (rounds, kills, hit points, bonus objectives, Physical and Ethereal faces and those at E 0) plus every face's play count (`'<card id>:<P|E>'`), gear, basics, items, moves, take-backs and seconds |
| `mission_left` | back to the title with the mission unfinished, and the round |
| `run_ended` | the expedition's outcome, missions, rounds, kills, lifeline |
| `pilot_saved` | a player kept a pilot they built: its clades and card count |
| `session_ended` | the page closes: seconds, the screen, missions finished this visit |
| `client_exception` | a script error (at most five a visit) |

A mission's events share a `match_id` (`<run seed>:<missions launched>`), so its start, end or leaving group together. A take-back (Undo) removes the play it undid from the counts.

The new-player funnel, as the server's Funnel builder reads it: `session_started` (first visit) → `run_started` (Play now) → `draft_completed` → `tutorial_shown` (map) → `mission_started` (first mission) → `guide_step` (finished or skipped) → `mission_ended` (first mission) → `signin_prompt` (first win) → a second mission → a second day. Invites: `invite_link` opened → joined → `draft_completed` → `mission_started`.

## How it is sent

Events queue in memory and go to `<server>/batch/` as `{api_key, batch: [{event, properties, timestamp}]}` every 15 seconds or every 50 events; when the page is hidden or closed the rest goes with `navigator.sendBeacon`, and what a closing page could not send waits in `localStorage` (`tumult_v2_anon_queue`) for the next visit. A failed batch is tried again; the game never waits for it, and with the server unreachable it plays exactly as before. The ingest key is public and write-only by design, as Cosmic Shore's is: it ships in the page, and the server reads the same file from this repository, so the two cannot drift.

## Changing it

Add or change an event in `EVENT_SCHEMA.json` and `telemetry.js` together (`test/telemetry.test.js` fails when the game sends an event or field the schema does not name); raise `schema_version` in both when a field's meaning changes. The server reads the schema from `bleeding-edge` each night (it restarts when it changed), so an event must be on `bleeding-edge` before a build that sends it is played. An event that names a player, or anything a player typed, does not belong here.
