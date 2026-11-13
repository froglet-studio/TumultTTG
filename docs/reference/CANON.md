# Canon from play

Playing the web game helps write the world (Garrett, 2026-11-13). The game asks for a little flavour at natural pauses and lets a player correct what it shows; every answer becomes a **canon record** for the lore lead to approve. The table-top edition does not do this: it is the web version's own job.

Nothing here changes the rules. Answering, skipping or correcting never costs or pays anything in play.

## What players can say

| Where | What | Subject |
| --- | --- | --- |
| Atlas: blurb, weather, rules of this place, field notes | ✎ *That's wrong* / *Add a detail* / *Love this* | `place:<page id>` |
| Title screen: the pilot in the painting | ✎ as above | `pilot:<callsign>` |
| Codex: a foe's flavour | ✎ as above | `foe:<bestiary key>` |
| Event text | ✎ as above | `event:<id>` |
| Draft, upgrade step | *Why does this pilot guide?* Three hooks or your own words; optional | `pilot:<callsign>` of the painting the hero wears |

The marks never pop up. The question can be turned off under **Canon** on the title screen.

## A record

`T.canonRecord` (`src/engine/canon.js`) makes one; it is plain data:

```json
{ "id": "c_1x2y3z", "subject": "place:quarry", "kind": "detail",
  "claim": "The spoil heaps are sorted by colour.",
  "shown": "What it is. A crystal quarry cut in steps…", "where": "atlas:notes:0", "prompt": "",
  "context": { "build": "2.20.0", "screen": "atlas", "page": "quarry" },
  "by": "", "at": "2026-11-13T23:00:00.000Z", "status": "proposed", "public": false }
```

- `kind`: `wrong`, `detail`, `love` or `answer` (to a question; `prompt` names it, e.g. `hook`).
- `shown` is the text exactly as the player saw it, so a reviewer sees what was corrected.
- `status` starts `proposed`. Only the lore lead (Garrett) makes a record canon, and marks it `public` or not. **Only public canon is ever copied into this repository**; the rest stays private (Garrett, 2026-11-13).
- The id is a hash of what the record says, so the same note sent twice is kept once.

Records are kept on the device in `localStorage` `tumult_v2_canon` (the newest 500), apart from any run: they are about the world and outlive the run they came from, so the save format does not change. **Canon** on the title screen lists them and copies them as JSON lines (`T.canonLines`).

## Still to come

The plan has four steps; this is the first.

1. ✓ Records, ✎ marks, the draft question, Canon list (2.20.0).
2. The test page sends each record to a private inbox (its database), and a review tab lets the lore lead approve, edit, reject and mark public.
3. A storyteller pack generated from the game's rules and approved canon, for AI storytellers: rules first, then canon, then labelled proposals, then what is off limits.
4. More questions at natural pauses: a detail of each place on arrival, defining moments after a mission, the end-of-run dossier ([design 06](../design/06-pilots-and-backstory.md)).
