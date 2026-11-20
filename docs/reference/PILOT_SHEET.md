# Made pilots on Froglet's character sheet

Status: settled (2.78, Garrett 2026-11-20). Every pilot a player creates or updates in Tumult Online gets one row in Froglet's character sheet, beside the Cosmic Shore pilot fields the art team keeps there.

## How a pilot gets there

1. **The page.** When a pilot is confirmed in the draft, or comes home from an expedition with its growth, Tumult Online writes the player's list to its store, `heroes/<player id>` = `{ list, at, who }` (`src/ui/heroes-net.js`). `who` is the name the player's account shows, so the sheet can say who made the pilot. Documents written before 2.78 have no `who` until that player opens the page again.
2. **Claude, on a schedule.** A scheduled task reads the `heroes` collection with ArtifactData, runs `node tools/pilot-sheet.js <dir>`, and uploads the feed `tumult-pilots-feed-<digest>.json` to Google Drive. The digest names the rows' content, so when nothing changed the file already exists and nothing is sent.
3. **The sheet.** An Apps Script bound to the sheet (`tools/sheets/pilots-sync.gs`) checks Drive every ten minutes, applies the newest feed and trashes older ones.

The page cannot write to Google itself: an artifact page reaches only claude.ai, and the players are not the sheet's editors. The offline build is untouched and makes no network requests.

## What the sheet gets

| Column                                       | From                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Character                                    | the pilot's name                                                                                                      |
| Player                                       | `who`; left as it is when unknown                                                                                     |
| Species 1, Species 2                         | the two clades (a seeded row's own spelling is kept when it matches, e.g. "Cordyceps")                                |
| Traits                                       | the trait cards, in kit order                                                                                         |
| Abilities                                    | each card's two faces with their levels, `Bore P0 / Parasitize E1`; an Ethereal face not yet awakened says `(asleep)` |
| Backstory, Look, Personality, Faction or job | not asked by the game; typed in the sheet and never overwritten                                                       |
| Tumult status                                | `Finished` once those four are filled in, `Drafting` until then; any other value is left alone                        |
| Tumult id                                    | the pilot's id (`made_…`), the key; added at the end of the tab if missing                                            |

Columns whose header starts with "Pilot" are never written. A pilot already on the tab is found by its Tumult id; a new one first claims a row with no Character and no id whose two species match (rows seeded for painting), and otherwise gets a new row.

## Setting it up

1. In the sheet: Extensions → Apps Script, paste `tools/sheets/pilots-sync.gs`, save.
2. Choose `setup` and press Run. Google asks to allow access to the sheet and Drive; allow it. This installs the ten-minute check and applies any feed already in Drive.
3. The scheduled task (hourly) does the rest.

Rows hold player names, so feeds are written under `dist/` and never committed.
