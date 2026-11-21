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
  side; a Reveal Field shows everything in it. Nothing off the ground (Hover) is touched by a Field.
- **A hazard is a Field of damage** that belongs to nobody: whoever ends the round on it takes the hazard's
  damage, Pierce.
- **Cleanse the ground** within N clears hazards and foes' Fields there, never your own.

It replaced five verbs: the snare (`trap`) and the counted snare, the spore, musk and ice zones (`zone`), the
trigger (`ambushTrap`), the auras (`aura`), and `clearHazard`. Fields combine with every way of moving a unit:
push a foe onto your Field, pull one across a spore cloud, or Anchor yourself on a hazard you are immune to.

In code: the verb `field` (`docs/reference/EXTENDING.md`), `m.fields` in a mission (saves version 20), and
`T.fieldNodes`, `T.fieldText` for the board.

## Link (2.87)

> **Link.** Join two units for N rounds: when one takes damage, a push or a pull, or a Heal, the other takes
> the same.

- **The same.** The damage the first was dealt, after its Shield, reaches the other as true damage; the same
  push or pull, from the same source and as far, moves the other; the same heal heals the other.
- **One at a time.** A unit has one Link; a new one replaces it. It ends when its rounds run out or either unit
  falls.
- **Who.** A face Links its target to the nearest other unit of the target's side within N of it.
- **Charge's keyword.** Link is Charge's signature (energy and links). It replaced Redirect (cut: making a foe's
  attack hit its own side bordered on turn theft) and the chain strike (Tesla Cascade Links its target instead).

Link combines with every other keyword: Mark one end and hit it, push one end into a Field and both go, or Link
a foe to the one a Brute is about to drag.

In code: the verb `link` (`within`, `dur`), the state `Linked` (`{ to, t }` on both units), `T.linkedTo`.

## Wound (2.88)

> **Wound N.** At round end it takes N, then the Wound drops by 1.

- **One number.** Wound 3 bites 3, then 2, then 1, then is gone. A new Wound replaces a smaller one; a smaller
  one does nothing. Its bite is true damage (Shield does not stop it).
- **Who.** Any unit; Cleanse sheds it. Some Wounds heal the one who gave them at each bite (Deepen the
  parasitism).
- **Magic's keyword for waiting.** It pays across rounds, so it belongs on faces that set up.

It replaced damage over time (`dot`) and its fifteen names (venom, crush, corrode, rot, drain, sting, quill, cut,
rake, grip, salt, foul, toxin, slime, scald). The old faces kept their flavour word in the log. A dot of 1 for 2
rounds became Wound 2; 1+E for 3 rounds became Wound 2+E.

In code: the verb `wound` (`n`, `area`, `healOwner`, `kind` for the log), the state `Wound`
(`{ n, owner, heal, kind }`), saves version 21.

## Gear: ethereal technology (2.89)

Gear is the third line. It touches spaces, the dice, the clock and the downed; it is bought, not trained, so it
never scales with P or E; and it **never strikes a unit directly**: a gear strike goes through a Field (the
Turret), and a gear pull is a Field that pulls (the Winch). Each piece has one passive and two actives. The
passives carry what boons did, and the actives what consumables did (`docs/reference/RUN_AND_ECONOMY.md` has the
table).

Field gained two keywords for it: **Pull N** (toward the Field's owner) and **Push N** (away from it).

**Weapons (2.106)** are the one way tech touches your strikes: a weapon's passive adds 1 to every strike of its
reach (melee, or ranged) you make, and its Overcharge takes a banked Omni die for **Empowered** 2 on every such
strike this round, stacking. It still never strikes on its own. Empower is the existing keyword (*Empowered N: the
next strike, or strikes, deal N more*); a weapon adds no new one.

## Heal (2.90)

> **Heal N.** Restore N vitality; on a downed pilot, it gets up with N.

- **Who.** You, an ally you choose, every pilot, or a downed ally beside you, as the face says. A heal for every pilot
  reaches a downed one wherever it lies.
- **A held Heal** (`ward`): if you go down within N rounds, it lands then and you get up with its number.
- **Tech heals only through a Field or the downed:** the Medkit's mending Field, and its Revive.
- **Rally** is the basic action, not a keyword: 2 AP, a downed ally beside you gets up with 8.

It replaced `revive` and `phoenix`. In code: the verb `heal` (`n`, `party`, `target`: `ally` / `chosenAlly` /
`downedAdj`, `ward`, `doubleIfLow`), `T.healUnit`, the Field keyword `heal`.

## Anchor (2.91)

> **Anchor.** It cannot be moved by anything, its own walking included. It still acts.

- Nothing pushes, pulls, blows or drags it, and it cannot walk or blink. It can still strike, play cards and use
  gear.
- **Yours or theirs.** Anchor yourself and you hold against a drag, but you stay put this round; a foe's root
  is an Anchor too. Status immunity turns away a foe's Anchor, never one you chose.
- It replaced five states: Held, Rooted, Slow, SlowSelf and NoTele (and the `slow`, `slowSelf` verbs and the
  `held` option).

In code: the verb `anchor` (`who`: self / foe / ally / target, `dur`), the state `Anchored`, `T.anchorEnt`,
`T.isAnchored`; saves version 23.

## Mark (2.92)

> **Mark N.** The next hit on it, by anyone, deals N more.

- **N** is 2 unless the face says. The Mark is spent by that hit.
- **For N rounds:** every hit on it deals N more until the Mark wears off (what Studied did, for a whole mission,
  until 2.92).
- **Pierce:** that next hit ignores Shield (what Exposed did).
- The larger of each part stands; a next-hit Mark and a lasting one can sit on the same foe.

In code: the verb `mark` (`n`, `dur`, `pierce`, `nearest`, `area` + `radius`), the state `Marked`
(`{ next, pierce, each, t }`), `T.markUnit`; saves version 24.

## Thorns (2.93)

> **Thorns N.** Anything that strikes it in melee takes N.

- **Lasting** Thorns turn back every melee strike for as long as they last.
- **Next-hit** Thorns turn back only the next melee strike, and may push the striker back: what Counter did until
  2.93. Both add up on that next hit.

In code: the verb `thorns` (`val`, `dur`, `next`, `push`), the state `Thorns` (`{ v, next, push, t }`); saves
version 25.

## Shield (2.94)

> **Shield N.** Each hit it takes is N lower; Shield all also stops area.

- **While it lasts**, every hit is N lower (area hits pass unless it says all; Pierce and true damage ignore it).
- **Against the next hit:** spent by that hit; it may send some of it back or step you a space away. What Pre-empt did until 2.94.
- Guard and Absorb are Shields too.

In code: the verb `shield` (`val`, `dur`, `all`, `party`, `allyRange`, `min`, `next`, `reflect`, `reposition`); the states `Shield` and, for the next hit, `Preempt`; saves version 26.

## Blink (2.95)

> **Blink N.** Leave the paths: appear on a free space within N; height only where it says.

- An Anchored unit cannot blink. The Phase-brace's passive makes your blinks reach 1 further.
- Swap, which trades places with an ally, stays its own verb for now.

In code: the verb `blink` (`reach`, `height`, `dest: 'adjTarget'`, `carryAlly`), the target `node_tele`.

## Haste (2.96)

> **Haste N.** Your track slides N extra columns, or the mission clock gains N rounds.

- **Track:** every card on your track comes home N columns sooner (an ally's, where it says).
- **Clock:** the mission clock gains N rounds (and a spreading flood waits as long).
- **Free:** the next N cards you play do not go to the track (this turn, where it says).

In code: the verb `haste` (`n`, `who`, `clock`, `free`, `dur`), the state `Freecast` for the free cards.

## Cleanse (2.97)

> **Cleanse.** Remove every harmful state, or clear a Field; for N, also ignores new ones.

- **Cleanse:** shed Weakened, Anchored and Wound (yours, or both pilots' where it says).
- **Cleanse for N:** and for N rounds no foe can Weaken or Anchor you (your own Anchor still can).
- **Cleanse the ground:** hazards and foes' Fields within N are cleared (2.86).

In code: the verb `cleanse` (`party`, `ward`, `field`); the state `StatusImmune`.

## Reveal (2.98)

> **Reveal N.** Everything within N is shown and Revealed this round: it can't be Hidden.

- **Around you:** within N, Hidden foes are found, and hidden objectives within reach are searched.
- **One foe:** it is Revealed for N rounds: it cannot be Hidden, and a zone strike finds it (what Locate did until 2.98).
- A Reveal Field keeps everything in it Revealed (2.86).

In code: the verb `reveal` (`radius`, `dur`, `target`, `nearest`, `findObjective`, `hintObjective`); the state `Located`.

## Reroll, Draw and Mint: the dice (2.101)

Three keywords for the dice, each a different thing a hand does at the table (Garrett, 2026-11-21: "reroll is
great, and grabbing a specific die is great, but not a random one").

> **Reroll N.** Pick up to N of your banked dice and roll them again.
>
> **Draw N.** Take N dice of your choice from your pool and bank them showing that face.
>
> **Mint N.** Bank N temporary dice showing that face; they are not among your 15 and are gone as the round ends.

- **Never at random.** A hand in the bag feels a d20 from a d8, so no die ever leaves the pool at random. Draw
  takes a plain d20 while the pool has one (it has every face), then the element die that shows the face most;
  a d8 never shows AP. The roll's own dice are chosen the same way: three plain, one element die of your choice,
  and with too few plain dice left, the element dice the pool holds most of (before 2.101 those were drawn at
  random).
- **What each spends.** Reroll changes what you hold, Draw spends your pool early (the 15 stay 15), and Mint adds
  dice from outside it. The keyword plan's single Mint (Reroll and Draw folded into it) was not taken.

In code: the verbs `reroll` (`n`), `draw` (`face`, `n`; the engine kind `draw` each turn), `mint` (`face`, `n`,
`target`); `T.drawKind`, `T.draw`, `T.mint`, `T.rerollHeld`.

## Hover, and ignoring hazards (2.102)

> **Hover N.** Off the ground for N rounds: no hazard or Field touches you, nothing pushes or pulls you, and your
> steps may take the ledges.
>
> **Ignore hazards N.** For N rounds a hazard does you no harm. You are still on the ground.

- **Two keywords, two meanings** (Garrett, 2026-11-21: "we want thematic and each to hold their own distinct
  meaning"). Ignoring hazards is the body shrugging the place off: gills, a coat, salt feet, shed heat. Hover is
  being above it all, so Fields, pushes and pulls miss you too, and the ledges are open to your steps. The plan's
  option of folding all 87 hazard faces into Hover was not taken: that would have handed every coat and gill the
  ledges.
- **Who hovers.** Fliers, not one element: the hummingbird, hawk, eagle, crane, egret, owl, pelican, seahorse and
  the winged insects (Glide Wings, Migration). Their flying moves Hover for the round before they move, so a flight
  can end on a ledge; a coat, a swim or a run still ignores hazards.
- **Weightless is Hover.** It was Hover plus the ledges; now Hover has the ledges, so the word went. Hover no
  longer mints 1 AP a turn: a keyword says one thing, and the ledges are what it gained.

In code: the verb `hover` (`dur`), the state `Hover` (an older save's `Weightless` reads as Hover); a face whose
`hover` comes before its `move` is offered the ledges (`T.reachableWalk`'s `climb`). Ignoring hazards is the verb
`hazardImmune` (`dur`, `party`), the state `HazardImmune`.

## Move and Guide (2.103)

> **Move N.** Step N spaces along the paths; foes block the way.
>
> **Guide N.** Move an ally up to N spaces along the paths, now, to a space you choose.

A move can differ in one of a few ways, each a different choice on the board (Garrett, 2026-11-21: "more
interesting movement choices are great as long as they are distinct"):

| The move is… | What changes | Where it pays |
|---|---|---|
| **climbing** (Climb N) | the steps may take the ledges | the Vault's ledge, high ground over a fight |
| **past foes** | the steps may pass through foes' spaces | slipping through a line, reaching the back |
| **trampling** | through foes' spaces, and each foe in the way is pushed aside as you reach it | shoving a foe into a Field or hazard on the way past |
| **exactly N** | the run is N steps, no fewer, never the same space twice | the cheetah's and hawk's sprint |
| **toward** | up to N steps toward a unit, stopping beside it | closing on a foe, joining an ally |
| **carrying an ally** | an ally beside where you set out comes along, onto a space beside where you stop | taking an ally up a ledge, out of a hazard |

- **Climb is a Move.** The verb `climb` jumped to any space within N along every edge, ignoring the foes in the
  way; now Climb N is a Move that may take the ledges, and foes block it as they block any walk.
- **Guide, not Rally.** Moving an ally was the verb `rally`, the same word as the Rally action that raises a
  downed ally. The action keeps the name; moving an ally is Guide.
- **Hover** (2.102) and a climbing form (Reshape) let every step take the ledges for as long as they last.
- Blink (leaving the paths) and Swap (trading places with an ally) stay their own verbs.

In code: the verb `move` (`n`, `climb`, `ignoreFoes`, `trample`, `exact`, `toward`, `free`, `carryAlly`), the verb
`guide` (`n`; targets `ally_move`, `ally_adj_move`). The target `node_climb` is gone: every Move targets
`node_move`.
