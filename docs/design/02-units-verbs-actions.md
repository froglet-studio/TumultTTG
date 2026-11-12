# 02 · Units, verbs and actions

**Status: Partly built.** Strike, Brace and Shove are in the game (2.5.0, `T.BASIC` in `src/data/world.js`; Move, Interact and Rally were already there). Garrett accepted basic actions and Channel into the core on 2026-11-12; Overcast and Debt wait for the frame. Channel is in too (2.6.0: Mass into Strike or Shove, Charge into a 2-node Reach, Space into a 1-node Scramble over a ledge, Time into Brace with a track slide). Carry and the unit model are next. This is the change that makes the ability rules achievable. Build it before adding mission types.

## The problem

In v2.0 almost every verb is aimed at a *foe*. A push pushes an enemy; a shield shields a hero; a reveal finds a hidden enemy or cache. So an ability is only as broad as combat is, and a mission that is not a fight leaves half the kit with nothing to do. The first audit shows the result: most of the narrow faces are reveals and hazard immunities — verbs with only one kind of thing to act on ([05](05-ability-audit.md)).

## One kind of thing on the board

Everything that occupies a node is a **unit** with the same shape: a position, an integrity (vitality for the living), states, a weight class, and tags.

| Kind | Examples | Disposition |
|---|---|---|
| **pilot** | the squad | — |
| **actor** | raiders, a herd animal, a client, a rival squad, a sentry, a big creature | hostile · neutral · friendly · rival |
| **prop** | crate, door, winch, windbreak, bridge, beacon, survey marker, wreck | — |

Tags say what can be done to it: `movable`, `carryable`, `breakable`, `climbable`, `operable`, `cover`, `heavy`, `rooted`.

## Three target classes instead of "foe" and "ally"

Each verb names the class of thing it may touch, never a disposition:

- **harm** — anything with integrity: a raider, a wall, a jammed door, a bridge behind you.
- **affect** — anything with a position: push a crate onto a plate, anchor a client against the wind, pull a lever from across a gap, mark a survey point, slow a stampede, reveal a path.
- **help** — anything that can be better off: heal a neutral to win it over, shield the beacon you are defending, hasten a squadmate's track, steady a frightened animal.

Nothing about the 99 cards has to be rewritten for this: their recipes already say `force`, `anchor`, `shield`, `reveal`. The engine's targeting widens, and every card gains uses for free. That is the cheapest possible route to rule 4.

## Basic actions — what every character can always do

No mission may require an ability, so the floor has to be real. Every character, with no cards at all:

| Action | Cost | Effect |
|---|---|---|
| **Move** | 1 AP per edge | as now |
| **Interact** | 2 AP | operate a prop, search, talk, work on a build site |
| **Rally** | 2 AP | get an adjacent downed squadmate up |
| **Strike** | 2 AP | 2 damage to an adjacent unit — weak, but it means a kill objective is never impossible |
| **Brace** | 1 AP | Shield 1 until your next turn |
| **Carry / Drop** | 1 AP | pick up a carryable unit (crate, survivor, downed squadmate); carrying costs +1 AP per edge |
| **Shove** | 2 AP | push an adjacent movable unit 1 |

Acceptance for this table: squads with no cards can finish every mission type at tier 1 at least sometimes, and the audit's "no cards at all" row has no zero in it.

## Channel — every die has a use

A banked etherion that matches none of your ready cards is a dead die, and dead dice feel bad. **Channel**: spend one etherion with a basic action to do more work.

| Etherion | Channelled into a basic action |
|---|---|
| Mass | Strike +2, or Shove +1 node |
| Charge | Interact at range 2 along a sightline |
| Space | Move ignores one terrain cost — a ledge, a gap, an occupied node |
| Time | slide your own track one column |

These are deliberately weaker than any Ethereal face of the same colour. They are the floor, not a strategy.

## Overcast — powerful, but addictive

Magic on Tumult costs something. **Overcast**: pay for a missing etherion by taking one **Debt**. A Debt locks one die out of your pool — the invariant becomes pool + banked + locked = 15 — so each Overcast makes every later turn slightly leaner. Debt clears at a beacon, at a price that depends on your standing. Carry three and one becomes a **scar**: a permanent, named mark on the dossier with a small mechanical edge and a small cost.

Overcast is how a squad without the right etherion still gets to try the remarkable thing. It is also a record of who reaches for power under pressure, which is exactly what the dossier wants to know.

## What does not change

No turn theft, no hard counters, deterministic resolution, proactive defence, telegraphed intents. Neutral and friendly actors telegraph too — the herd will move downwind, the client will walk two nodes toward the exit — so escorting and herding are puzzles of the same kind as fighting.

## Engine notes

- `enemy` and `hero` become `unit` with `kind` and `disposition`; `T.targetsFor` returns units by target class and range, not by side.
- Verbs keep their names. Each case in `T.applyEffect` stops assuming a side and checks tags instead (`force` needs `movable`; `harm` needs integrity).
- Props are data, like cards and enemies.
- Enemy policies become actor policies; add `neutral` (follows a simple visible rule) and `rival` (pursues its own objective).
- Do this behind the existing tests: the 15-die invariant, track behaviour and the damage pipeline must not move.
