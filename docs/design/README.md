# Design

What the game should become. `docs/reference/` describes what is built; this folder describes what is intended.

Every document carries a status line:

- **Settled** — a requirement. Changing it needs Garrett's say-so.
- **Proposed** — a worked-out direction that nobody has approved yet. Argue with it, prototype it, replace it.
- **Partly built** — some of it exists in the code; the document says which part.

| # | Document | Status | In one line |
|---|---|---|---|
| 00 | [Pillars](00-pillars.md) | Settled | the two goals, the core that is kept, the ability and mission rules |
| 01 | [Frame and campaign](01-frame-and-campaign.md) | Proposed | a season as guides on Tumult: squads of three, patrons, beacons, rescue, mission chains |
| 02 | [Units, verbs and actions](02-units-verbs-actions.md) | Proposed | verbs act on everything; basic actions for everyone; Channel and Overcast |
| 03 | [Missions](03-missions.md) | Proposed | an objective grammar and twelve mission types, most of them not fights |
| 04 | [Boards and conditions](04-boards-and-conditions.md) | Proposed | board shapes, sightlines, gravity, wind, the one-hour day |
| 05 | [Ability audit](05-ability-audit.md) | Partly built | how the ability rules are measured, what the first audit found, what to fix |
| 06 | [Pilots and backstory](06-pilots-and-backstory.md) | Proposed | the dossier that grows out of play |
| 07 | [Art and UX](07-art-and-ux.md) | Proposed | art direction, layout, forecasts, accessibility |
| 08 | [Tabletop edition](08-tabletop-edition.md) | Proposed | print-and-play components generated from the same data |
| 09 | [Engineering](09-engineering.md) | Proposed | cloneable state, the look-ahead player, replays, modules |

When a proposal is built, update its status line, move the description of what now exists into `docs/reference/`, and leave here only what is still intent.
