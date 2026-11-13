# Public canon

`public.jsonl` holds the canon records the lore lead (Garrett) has approved **and marked public**: one JSON object per line, in the shape `docs/reference/CANON.md` describes. It is a redundant copy of what the test page's inbox holds, kept in git so the history of every decision is readable here too (Garrett, 2026-11-13).

Only public canon belongs in this repository. Private canon stays in the test page's inbox and Froglet's own canon home.

To update it, copy the approved records from the inbox (Canon → Open the inbox → Copy canon) into a file and run:

```
node tools/canon-pack.js records.jsonl --public
```

That also writes the storyteller pack to `dist/canon/` (not committed: it may hold private canon). A record that is no longer public canon (made private, rejected or reopened) leaves `public.jsonl` the next time it is run.
