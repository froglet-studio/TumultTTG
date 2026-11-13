# 01 · Frame and campaign — a season as guides on Tumult

**Status: Proposed.** Nothing here is built. v2.0's frame (a "tide-run" against a Consolidation and its Heart) was a placeholder; this replaces it with one that serves both goals.

## The premise

The squad are **guides**: people who take clients, cargo and messages across a world that is trying to throw them off it. A campaign is one **season** of guiding. It runs through the four guide services in order — **land, sea, air**, and the fourth, which is not a service at all but a berth: **joining the Cosmic Shore**. A squad that finishes the season leaves Tumult as pilots.

That makes the campaign, literally, the pilots' origin story. Whatever happened on the way — who they worked for, what they owed, what they refused to do — is their backstory, and the game has been keeping notes ([06](06-pilots-and-backstory.md)).

## The squad

- **Three** members, because a squad is three. The interface and the balance must also work with two (v2.0's size) so a short session stays short.
- Solo: one player commands all three. Co-op: each player owns one. Hot-seat first; networking is out of scope. *Built in 2.12.0 for today's two-pilot squad:* players and seats (`run.party`), each player drafting and flying their own pilot, the host making the squad's shared choices, and a round that ends when every player is ready ([`reference/OVERVIEW.md`](../reference/OVERVIEW.md#players)). Playing over the network was added in 2.13.0, on the test page only: two screens, the host's holding the game (Garrett, 2026-11-13).
- Rename throughout, once, in one change: *hero → pilot*, *species / bloodline → clade*, *Tide Map → season route*.

## Patrons and domains

Every mission is offered by a patron, and the patron's **domain** sets the deal. Domains are not factions; they are three ways of being in the world.

| Domain | The deal | Pays in | When it goes wrong |
|---|---|---|---|
| **Ruby** — a venture | nobody hired you; keep what you find | Notoriety, salvage | rescue needs a deposit you paid beforehand — or you walk home |
| **Gold** — a contract | terms, a fee, penalties for lateness and damage | money (omnicrystals) | rescue comes, and bills you |
| **Jade** — an appointment | you volunteered; the community is counting on you | Fame, standing | rescue is free, and everyone knows you needed it |

Everyone starts Ruby. Taking a paid contract moves you toward Gold; accepting a volunteer appointment moves you toward Jade. Standing with each domain changes prices at beacons, which leads appear, and how rescue treats you. A pilot's drift across the three over a season is one of the clearest character signals the game records.

## Beacons

Beacons are the waypoints of Tumult: safe ground where nothing attacks. They replace v2.0's Havens. A beacon belongs to a domain; you can always rest there, but it only **refuels and repairs** you at standing prices if you are in good standing with its domain. This gives the route a real texture — the shortest way may run through beacons that do not like you.

## Rescue instead of a Lifeline

v2.0 had one free Lifeline per run. Replace it with the setting's own rule: when a mission is lost, the squad is **rescued according to its standing** — free under Jade (it costs standing and a day), billed under Gold (it becomes a debt), pre-paid under Ruby (no deposit, no rescue: lose the day, the cargo, and limp to the nearest beacon). Losing never ends the season outright; it changes what the season is about. Only the final crossing can be failed for good.

## Leads — missions that follow from missions

Missions come in short chains. How one ends decides what is offered next:

- a clean success opens the follow-up (the client recommends you; the salvage points to a bigger wreck);
- a partial success opens a harder or stranger version (you got the caravan through, but lost the cargo — now find it);
- a failure opens a consequence (the people you could not protect have moved; the rival who beat you has the contract).

Each mission therefore has graded outcomes, not win/lose. Chains are data: a mission type, a seed, and three pointers.

## Shape of a season

Four legs — **land**, **sea**, **air**, **the Shore** — each with its own boards, conditions and patrons ([03](03-missions.md), [04](04-boards-and-conditions.md)). A leg is three to four stops chosen from a branching route, ending in a **crossing**: the set piece that moves the squad to the next leg. Crossings are not all fights — an ascent "uphill" into heavy gravity, a storm passage, a trial flown for a berth. Target length: 60–90 minutes for a full season, with a one-leg "short season" for a first play.

## Open questions for Garrett

1. Is "guides who earn a berth on the Cosmic Shore" the right arc, or should a season end on Tumult?
2. Should every squad contain members from different domains, or does the squad share one standing?
3. How lethal is Tumult? Downed-not-dead is assumed everywhere above.
4. Which named places and patrons may the game use? Until told otherwise it invents none and uses generic roles.
5. What are the crossings? Proposals are welcome from the lore team; the mechanics only need "a set piece with graded outcomes".
