## What and why

<!-- What the change delivers and why, in a few sentences. Link the ROADMAP milestone or issue if there is one. -->

## Verification

<!-- What actually ran, and what a person still has to check by hand. -->

- [ ] `npm run check` passes (build + tests)
- [ ] `npm run format` was run
- [ ] Played it: <!-- which mission types / squads, or "docs only" -->

## If this adds or changes an ability, enemy, mission or piece of gear

- [ ] It is written as data using existing verbs (or the new verb is general — usable by cards, gear and enemies alike)
- [ ] **Litmus test:** it can be described without naming the one thing it beats (no keys, no hard counters)
- [ ] No mission requires it, and it is useful in more than one kind of situation
- [ ] It never removes a player's turn (control taxes position or efficiency instead)
- [ ] `npm run catalog` and `npm run audit` were re-run and the regenerated docs are part of this PR
