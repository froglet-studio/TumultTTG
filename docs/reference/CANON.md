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
| Draft, upgrade step | A question about the pilot whose painting the hero wears; optional | `pilot:<callsign>` of that painting |
| Mission over | A question about the page the mission was played on; optional | `place:<page id>` |

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

## The inbox (test page only)

On the test page (`src/ui/canon-net.js`, playtest build only), each record is also sent to the page's store as it is written; records written while the store was not answering are sent when it does (`tumult_v2_canon_sent` remembers which have gone).

| Path | What | Who reads | Who writes |
| --- | --- | --- | --- |
| `canon/<viewer id>` | `{ at, last }`: lists a contributor | owner, editors | that contributor |
| `canon/<viewer id>/notes/<record id>` | the record | owner, editors, that contributor | that contributor |
| `canonReview/<record id>` | `{ status, public, claim, note, at, from }`: the decision; `claim` only when the wording was edited | owner, editors | owner only |

The test page is published with these store rules and the `user` capability (names of who sent what):

```json
{ "db": { "rules": [
    { "path": "canon", "read": "admin", "write": "owner" },
    { "path": "canon/{self}", "read": "interact", "write": "interact" },
    { "path": "canonReview", "read": "admin", "write": "owner" },
    { "path": "heroes", "read": "view", "write": "owner" },
    { "path": "heroes/{self}", "read": "view", "write": "interact" } ] },
  "user": { "scopes": ["profile"] } }
```

The `heroes` rules share the pilots players make (`docs/reference/RUN_AND_ECONOMY.md`). Everything else in the store (online games under `games/`) keeps the default rules. Testers need Contributor access to send, as for online play.

**Canon → Open the inbox** (owner and editors) lists every note with who sent it, what they were shown and where. The owner marks each *canon*, *rejected* or *keep proposed*, may edit the wording first, and ticks **public** for what may be copied into this repository. *Copy canon* gives the approved records as JSON lines with the decision applied (`status`, `public`, the edited `claim`, `decided: { at, note }`).

## The storyteller pack

`node tools/canon-pack.js records.jsonl` (records from the inbox's *Copy canon*) writes `dist/canon/tumult-storyteller.md`, for an AI to read before telling a Tumult story, and `tumult-canon.jsonl`, every canon record for tools. The pack reads in order of authority:

1. **Rules a story must respect**, from the game (`T.RULES`): clades and traits, the faces, dice, no turn theft, no hard counters, downed not dead.
2. **The world**: `docs/LORE.md`.
3. **Places**, **pilots** and **foes**, each as the game shows it with its canon beneath; a correction names the text it replaces.
4. **Other canon** (world, events, patrons, threats).
5. **Proposals**, only with `--proposals`, labelled as ideas to offer and never state as fact.
6. **Off limits**: no invented canon people, history or story; house terms.

The pack can hold private canon, so it stays under `dist/` and is never committed. Use it as project knowledge for a storyteller, or as the input of the tell-your-own-story mode the atlas plan proposes.

`--public` also updates `docs/canon/public.jsonl`, the repository's copy of canon marked public (`docs/canon/README.md`).

## Questions that ask the player to embellish

Garrett (2026-11-16): "guide them into an interesting question where they can provide details on the details you provide … more than ad lib, less than a blank canvas." Every question (`T.CANON_PROMPTS`, `src/data/canon.js`) has three parts:

- a **detail** the game already shows, restated from the atlas's field notes, never new canon;
- a **question** about it, open enough to have many answers;
- three **openings**, the first words of an answer ("Children sort it by colour, because…"), which put themselves in the box for the player to carry on. A player may also start from nothing.

`T.canonPrompt(subject, { answered, turn, who })` picks one: a question already answered on this device is skipped while its subject has others. Places have three questions each and are asked when a mission on that page ends. A pilot whose world is an atlas page has their own question, asked first at the draft; after it, five questions every pilot shares, filled with the pilot's name and clades (their id names the pilot, `pilot.keepsake:pilot:ANVIL`, so each is answered once per pilot). An answer's record carries the question's id in `prompt` and its detail and question in `shown`.

**Defining moments** (2.45.0, design 06). When a mission ends, `T.canonMoments(m)` reads what happened to each hero from the mission's effects list and state: `fell` (down at the end), `rallied` (went down, an ally got them up), `spared` (a seeded return or second wind kept them up), `clutch` (won on 3 vitality or less), `untouched` (won without a hit). The most dramatic one that happened to a hero wearing a Cosmic Shore pilot's painting is asked about on the mission-over panel, above the place question, with `T.canonMomentPrompt`: the facts, a question about what they meant, three openings. Its id is `moment.<kind>:pilot:<callsign>`; a moment is asked each time it happens. Moments change nothing in play.

## Still to come

The plan has four steps.

1. ✓ Records, ✎ marks, the draft question, Canon list (2.20.0).
2. ✓ The test page sends each record to a private inbox, and the lore lead approves, edits, rejects and marks public (2.21.0).
3. ✓ The storyteller pack and the repository's copy of public canon (2.22.0, below).
4. More questions at natural pauses. ✓ Embellishing questions about places after every mission and about pilots at the draft (2.44.0), and defining moments after a mission (2.45.0). Still to build: the end-of-run dossier ([design 06](../design/06-pilots-and-backstory.md)).
