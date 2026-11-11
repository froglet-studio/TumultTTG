# 06 · Pilots and backstory — the dossier

**Status: Proposed.** This is the second goal of the project and nothing of it is built yet. v2.0 keeps a score; it does not keep a person.

## The idea

A season on Tumult is a pilot's origin story ([01](01-frame-and-campaign.md)). The game should finish it holding a **dossier** for each squad member: who they are, what they did, what it cost, and the questions a writer would want to ask next. The game supplies evidence and prompts. People write the backstory.

## What a dossier contains

The fields follow the shape of a studio pilot profile, so a dossier can be carried straight into one.

| Field | Where it comes from |
|---|---|
| Name, clades (human + two) | creation |
| **Callsign** | proposed by the game from the pilot's defining moment or most-played signature ability; the player accepts or renames |
| **Ability** | the trait that defined them in play — the card with the most decisive uses, not merely the most uses |
| Domain and kind of work | where their standing ended up (Jade / Ruby / Gold) and which patrons they kept taking |
| **Personality** | three or four tags earned from behaviour (below) |
| **Motivation** | the hook chosen at creation, as amended by what they actually did |
| **Backstory summary** | five or six dated beats from the season log, in order |
| Defining moments | the moments the player marked (below) |
| Bonds and rivalries | from squad play |
| Debts and scars | from Overcast and rescue ([02](02-units-verbs-actions.md), [01](01-frame-and-campaign.md)) |
| Suggested vessel leaning | from play style — a suggestion for the lore team, never a canon claim |
| Open questions | three prompts the season raised and did not answer |

## Evidence the game should collect

**A hook at creation.** One question, three answers drawn from a pool: *why are you guiding?* (a debt, a promise, a place to get away from, someone to find, something to prove). It costs ten seconds and gives every later event something to push against.

**Personality from behaviour.** Tags are earned by sustained patterns, shown to the player when earned, and can be refused.

| Tag | Earned by |
|---|---|
| protective | shields, heals and rallies spent on others well above the average |
| reckless | ends turns inside telegraphed damage; Overcasts when a safe line existed |
| methodical | banks dice, reveals before moving, finishes with rounds to spare |
| merciful | subdues or drives off when destroying was cheaper |
| ruthless | the reverse, repeatedly |
| loyal | breaks off from the objective to reach a downed squadmate |
| mercenary | takes the Gold contract whenever one is offered |
| stubborn | retries the lead they failed instead of taking the easier one |
| showboat | overkills, chases every bonus condition |

**Defining moments.** When something dramatic happens — first time downed, a rescue that failed, a clutch save at one vitality, a third Debt, a rival beaten or spared — the game pauses for one beat and offers a **Defining Moment**: a one-line statement the player picks from three or writes themselves ("After the strait, Marish never again left cargo for a client"), attached to a small permanent change on one trait card. At most one per pilot per leg. These are the spine of the dossier.

**A private agenda.** Each pilot draws one hidden goal for the season ("never leave a client behind", "end the season owing nobody", "be the one who lands the last blow on a rival"). Meeting it pays a bonus; ignoring it is information too. In co-op, agendas are secret from the other players until the end.

**Bonds.** Assisting, rallying and carrying a squadmate grows a bond; a bond unlocks one small shared ability at a threshold. Friction — being left downed, having a kill or a client taken — grows a rivalry, which is not a penalty but a different unlock. Both go on both dossiers.

**The environment as witness.** Mission briefings, patrons and beacons refer back to what the squad did earlier in the season. A world that remembers is cheap to build from the season log and does more for character than any amount of flavour text.

## Output

- A dossier screen per pilot at the end of each leg and of the season.
- Export as Markdown and JSON, plus a printable one-page pilot sheet. Field names match the profile shape above.
- The same JSON is the input for anyone who wants a model to draft prose from it. The game itself does not write backstory; it lists beats and asks questions.

## Guardrails

- A dossier is a draft about a fictional person, made by a player. Nothing in it is canon until the lore team says so.
- Art direction for pilots is "two clades expressed in a humanoid" — silhouette, markings, eyes, texture — not an animal head on a human body ([07](07-art-and-ux.md)).
- Pilots are adults with long histories before they ever flew. The season should read as the latest chapter, not the first.

## Build order

1. A season log: every decision and outcome as structured events (this also gives replays — [09](09-engineering.md)).
2. Tags and the dossier screen, from the log alone.
3. The creation hook and private agendas.
4. Defining moments with their card changes.
5. Bonds and rivalries.
6. Export.

Done when: two people who play the same squad differently get recognisably different dossiers, and a writer handed only the export can say who the pilot is.
