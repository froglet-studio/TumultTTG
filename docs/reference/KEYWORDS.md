# Keywords

Tumult is moving from about 85 words of art to 22 keywords and a short grammar (Garrett approved the plan on
2026-11-21). The migration lands one keyword family per release. This page describes the ones that have landed,
each in the sentence a player resolves by hand. The rest still work as described in `CARDS.md` and
`EXTENDING.md`.

Three lines share the keywords, and each is set by what it touches, how far it reaches and how long it lasts:

| | Biophysical (Physical faces, AP) | Bioethereal (Ethereal faces, AP + etherions) | Ethereal technology (gear, ◇) |
|---|---|---|---|
| Touches | you and units beside you | any unit | spaces, the dice, the clock, the downed |
| Reaches | melee, along paths | zone, area, any | wherever the Field or gear is placed |
| Lasts | now, or this round at most | for N rounds | until spent or tripped; passives always |

## Field (2.86)

> **Field.** Marked spaces that do their keywords to whatever enters them or ends the round there.

- **Where.** On a chosen space and, with a radius, the spaces within that many steps of it; or *around you*,
  the spaces within N of you, following you as you move (*beside you* leaves out your own space).
- **When.** *Enters*: a unit that steps, is pushed or pulled, blinks or is blown onto one of its spaces.
  *Ends the round*: every unit standing in it as the round ends. A state a Field leaves at round end lasts
  into the next round.
- **How long.** For N rounds, or until it has sprung on as many units as it says (*the first foe to enter*
  is one).
- **Who.** Its harm (Strike, Weaken, Anchor, Mark) falls on its side's foes, and its help (Hidden) on its own
  side; a Reveal Field shows everything in it. Nothing off the ground (Hover, Weightless) is touched by a Field.
- **A hazard is a Field of damage** that belongs to nobody: whoever ends the round on it takes the hazard's
  damage, Pierce.
- **Cleanse the ground** within N clears hazards and foes' Fields there, never your own.

It replaced five verbs: the snare (`trap`) and the counted snare, the spore, musk and ice zones (`zone`), the
trigger (`ambushTrap`), the auras (`aura`), and `clearHazard`. Fields combine with every way of moving a unit:
push a foe onto your Field, pull one across a spore cloud, or Anchor yourself on a hazard you are immune to.

In code: the verb `field` (`docs/reference/EXTENDING.md`), `m.fields` in a mission (saves version 20), and
`T.fieldNodes`, `T.fieldText` for the board.
