# Changelog

## 2.95.0 — 2026-11-21 — Blink

The ninth keyword of the sweep (`docs/reference/KEYWORDS.md`).

- **Blink N.** Leave the paths: appear on a free space within N (height only where the face says). The verb `teleport` is `blink` on 54 faces, the Phase-brace and the engine, and every text says Blink. An Anchored unit cannot blink (2.91).
- No rule changed and no save changed: a rename. The weak player's missions (`40 missions --player weak`) are identical, 76.1%.

## 2.94.0 — 2026-11-21 — Shield absorbs Pre-empt, Guard and Absorb

The eighth keyword of the sweep (`docs/reference/KEYWORDS.md`).

- **Shield N.** Each hit it takes is N lower while it lasts; a **Shield against the next hit** is spent by that hit, and may send some back (`reflect`) or step you away (`reposition`): what Pre-empt did (`shield` with `next`).
- **85 Pre-empt faces** are next-hit Shields, and their texts say Shield. **Guard** (ambushes halved) is a Shield 1 or 2 for as long; **Absorb** (the next ranged hits negated, minting Charge) is a Shield of 3+2E against the next hit and a Charge minted now.
- **Saves** are version 26: a held Guard becomes Shield 1, a held Absorb a Shield of 3 against the next hit (fixture `save-2.93.json`).
- **Balance.** Same seeds, 2.93.0 → 2.94.0: `80 runs --player strong` 39 → 38; `120 runs --player weak` 10 → 10; `node tools/sim.js 40` runs 5 → 5 and 21 → 19 of 40, mission wins 71% → 71% and 88% → 87%. Nothing is retuned.

## 2.93.0 — 2026-11-21 — Thorns

The seventh keyword of the sweep (`docs/reference/KEYWORDS.md`).

- **Thorns N.** Anything that strikes it in melee takes N, for as long as it lasts. A **next-hit Thorns** turns back only the next melee strike (and may push the striker): what Counter did. Both add up on that next hit (`thorns` with `val`, `dur`, `next`, `push`; state `Thorns` = `{ v, next, push, t }`).
- **20 Counter faces** are next-hit Thorns, and their texts say Thorns.
- **Saves** are version 25: a held Counter becomes a next-hit Thorns (fixture `save-2.92.json`).
- **Balance.** Same seeds, 2.92.0 → 2.93.0: `80 runs --player strong` 39 → 39; `120 runs --player weak` 11 → 10; `node tools/sim.js 40` runs 6 → 5 and 21 → 21 of 40, mission wins unchanged (71%, 88%). Nothing is retuned.

## 2.92.0 — 2026-11-21 — Mark

The sixth keyword of the sweep (`docs/reference/KEYWORDS.md`).

- **Mark N.** The next hit on it, by anyone, deals N more (2 unless the face says), then the Mark is spent. *For N rounds*: every hit deals N more until it wears off. *Pierce*: that next hit ignores Shield. The larger of each part stands (`mark` with `n`, `dur`, `pierce`; state `Marked` = `{ next, pierce, each, t }`).
- **Studied is a Mark for 3 rounds.** Its +N to every hero hit used to last the whole mission and stack, a lock-on the 2.73 rule forbids; 29 faces now Mark +N for 3 rounds. **Exposed is a Pierce Mark** (5 faces).
- **Saves** are version 24: a bare Mark is +2 to the next hit, Studied +n to every hit for 3 rounds, Exposed a Pierce Mark (fixture `save-2.91.json`).
- **Balance.** Same seeds, 2.91.0 → 2.92.0: `80 runs --player strong` 41 → 39; `120 runs --player weak` 13 → 11; `node tools/sim.js 40` runs 7 → 6 and 23 → 21 of 40, mission wins 71% → 71% and 89% → 88%. Studied's end makes it a little harder, which takes back Anchor's drift; nothing is retuned.

## 2.91.0 — 2026-11-21 — Anchor

The fifth keyword of the sweep (`docs/reference/KEYWORDS.md`).

- **Anchor.** Nothing moves an Anchored unit: no push or pull, and it cannot walk or blink. It still acts. One state, `Anchored`, in place of five: Anchored, Held, Rooted, Slow, SlowSelf and NoTele (`T.anchorEnt`).
- **What changes.** A hero who Anchors itself no longer lets go by walking: it stays put for the round, so the order of a turn matters. A foe's root (the Binder's) is an Anchor, so a rooted pilot cannot be pushed either. An Anchored hero cannot blink. `slow` and `slowSelf` faces Anchor; `held` and the counted Field's no-blink went away, since every Anchor is both.
- **Saves** are version 23: each old state becomes Anchored for as long as the longest of them (fixture `save-2.90.json`).
- **Balance.** Same seeds, 2.90.0 → 2.91.0: `80 runs --player strong` 40 → 41; `120 runs --player weak` 11 → 13; `node tools/sim.js 40` runs 6 → 7 and 22 → 23 of 40, mission wins 70% → 71% and 89% → 89%. Each within the noise; the sweep's drift is retuned at its end with larger samples.

## 2.90.0 — 2026-11-21 — Heal raises the downed

The fourth keyword of the sweep (`docs/reference/KEYWORDS.md`; Garrett, 2026-11-21: Heal raises the downed, Rally stays the basic action).

- **Heal N.** Restore N vitality; a downed pilot a Heal reaches gets up with N. Every heal for both pilots, or for your ally, now raises a downed one (`T.healUnit`).
- **Revive and Phoenix are Heals.** Regrow's revive is *Heal 4 a downed ally beside you*; the five faces that brought you back are a **held Heal** (`ward`): if you go down within 3 rounds, it lands and you get up with that much.
- **Medkit (tech heals only through a Field or the downed).** Patch lays a mending Field on and beside your space for 2 rounds (allies ending the round there Heal 3, a downed one gets up); Revive is Heal 10 a downed ally beside you. Field gained the Heal keyword.
- **Rally** stays the basic action: 2 AP, a downed ally beside you gets up with 8.
- **Balance.** Same seeds, 2.89.0 → 2.90.0: `80 runs --player strong` 38 → 40; `120 runs --player weak` 11 → 11; `node tools/sim.js 40` runs 6 → 6 and 21 → 22 of 40, mission wins 70% → 70% and 88% → 89%. Within the noise, so nothing is retuned. No save change (a held Heal is the old `Phoenix` state).

## 2.89.0 — 2026-11-21 — boons and consumables fold into gear

The keyword plan's third line, ethereal technology (`docs/reference/KEYWORDS.md`): gear works on spaces, the dice, the clock and the downed, is bought rather than trained, and strikes only through a Field.

- **Every gear has a passive** (on while worn) and two actives (paid in ◇). The passives carry what boons did: Aegis Plate, every Shield +1 (Thick Hide); Scope, reveals +1 and Hidden foes beside you seen (Keen Sense); Chrono-shim, the track slides 1 extra as round 2 begins (Quick Hands); Medkit, once a mission rise at 10 (Second Wind); Climbing Rig, mag boots, you cannot be pulled (Anchor Soul); Capacitor, start each mission with 1 AP banked (Etherion-touched, gentler); Phase-brace, blinks reach 1 further; Storm Lantern, a foe beside you is Marked as your turn begins; Turret, your Fields last 1 round longer; Winch, your Fields push and pull 1 further.
- **The actives carry what consumables did.** Medkit's Patch heals 6 (Rally Vial; was 4), Scope's Glance reveals within 2 (Flashpowder), Chrono-shim's Rewind gives the clock 2 (Windbreak Charm; was 1); Grit and the Omni Shard were already the Aegis Plate's Brace and the Capacitor's Store.
- **The Grapnel is a Winch and the Harpoon Gun a Turret.** Tech never strikes a unit directly: Reel Line and Winch lay Fields that pull whoever enters (Field gains Pull and Push), Sentry and Skewer lay Fields that strike.
- **Cut:** the Affinities and Omni Core (the element die is chosen every turn), Momentum, Defiant, Deep Pockets, Studious, and every consumable. Elites no longer offer a boon; they already pay 4 ◇ more. Three events that gave a boon give crystals or UP instead.
- **Saves** are version 22: an older pilot's boons are refunded at 3 ◇ each and its consumables at their price, to its own purse (fixture `save-2.88.json`).
- **Balance.** Foes keep 145% vitality: the fold does not let it come down. With every simulated squad wearing gear from tier 2, the passives make tiers 2 and 3 easier, so the Capacitor's banked die is an AP (an Omni measured easier) and the Lantern Marks only a foe beside you. Same seeds, 2.88.0 → 2.89.0 at 145%: `80 runs --player strong` 40 → 38; `120 runs --player weak` 10 → 11; `node tools/sim.js 40` runs 3 → 6 and 19 → 21 of 40, mission wins 69% → 70% and 87% → 88% (its mission table hands every tier 2 and 3 squad gear, so the passives show there most). At 140% it was 50 of 80, at 135% 47, at 130% 56: lowering vitality makes the game easier at once (`docs/reference/BALANCE.md`).

## 2.88.1 — 2026-11-21 — every ability does what it says

Garrett: "make sure that decoys actually leave decoys, and all movement abilities actually grant their movement etc."

- **A new test plays every card face** (all 529 cards, both faces) in a dozen situations and checks that each effect on it changes the game somewhere, that every decoy face leaves its decoy where and for as long as its text says, that every move, blink, climb and rally reaches as far as its number and really moves the unit, and that the numbers a face prints are the numbers it plays (`test/abilities.test.js`).
- **Fixed what it found.** Five decoys that stay where you are (Very Convincing, A Thousand Pink, Rainbow, Swarm, Door Stone) never appeared, because the hero was still on the node: the decoy now shares your node and keeps it when you go. Smoke Step dropped its Hidden as soon as you blinked; it now hides you after. No Retreat's own status immunity turned away its own anchor, so push and pull still moved you; a hero's own anchor is now a choice, not a status. A decoy cast at a node within 2 (Lure Light) could be aimed at an occupied node and vanish; it now offers empty nodes only. Strand's "drag it 1 toward you" on a foe already beside you never did anything, so the text now says what it does: melee and pin. Two texts now print a number they played without saying (Blink's decoy lasts 2; Lock Both Eyes sees within 2).
- **The look-ahead player walks a free move in full** (it capped every walk at 3 steps, so free moves of 4 and 5 were cut short).
- **Balance.** `node tools/sim.js 40`: every table identical before and after, on 2.88.0 (look-ahead 19/40 runs, heuristic 3/40). No save change.

## 2.88.0 — 2026-11-21 — Wound

The third keyword of the sweep (`docs/reference/KEYWORDS.md`).

- **Wound N.** At round end it takes N, then the Wound drops by 1 (Wound 3 is 3, then 2, then 1). It replaces damage over time and its fifteen names (venom, crush, corrode, rot, drain, sting…), which stay as the flavour word in the log. Its bite is true damage; a new Wound replaces a smaller one; Cleanse sheds it (`wound`, state `Wound`).
- **28 faces.** A dot of 1 for 2 rounds is Wound 2; 1+h(E) for 2 is Wound 2+h(E); 1+E for 2 is Wound 1+E; 1+E for 3 is Wound 2+E; 2 for 2 is Wound 2. Deepen the parasitism keeps its heal at each bite and loses its +1 a round at E 2.
- **Saves** are version 21: a foe's damage over time loads as one Wound dealing about as much in all (fixture `save-2.87.json`).
- **Balance.** Same seeds, 2.87.0 → 2.88.0: `node tools/sim.js 40` runs 3 → 3 and 18 → 19 of 40, mission wins 69% → 69% and 87% → 87%; `80 runs --player strong` 38 → 40; `120 runs --player weak` 10 → 10. Within the noise (two standard errors on 80 runs is about ±9). When Wounds added up, it was easier (41 of 80, 12 of 120), so the larger Wound stands instead. Nothing is retuned.

## 2.87.0 — 2026-11-21 — Link

The second keyword of the sweep (`docs/reference/KEYWORDS.md`).

- **Link (Charge).** Two units joined for N rounds: when one takes damage, a push or a pull, or a heal, the other takes the same (the damage it was dealt, after Shield, as true damage; the same push or pull from the same source; the same heal). A unit has one Link at a time, and it ends with its rounds or when either falls (`link`, state `Linked`).
- **Seven Charge faces Link their target to the nearest foe.** Tesla Cascade (in place of its chain: Linked for E rounds, then struck for 6+P), Override, Its Own Voice and Every Step (in place of Redirect), Spasm and Drive the Shoal (in place of their Weaken: the push or pull moves both), and Disarming (in place of its +1 Studied).
- **Cut: Redirect** (a foe's next attack turned on its own side bordered on turn theft) and the chain strike.
- **Balance.** Same seeds, 2.86.0 → 2.87.0: `node tools/sim.js 40` runs 3 → 3 and 18 → 18 of 40 (one cell's kills moved by 0.1); `80 runs --player strong` 39 → 38; `120 runs --player weak` 10 → 10. Not easier, so nothing is retuned. No save change: `Linked` is a state like any other.

## 2.86.0 — 2026-11-21 — Field, the first keyword of the sweep

Garrett approved the 22-keyword plan on 2026-11-21 (Field and Link in, tech as drawn, Heal raises the downed); it lands one keyword family per release (`docs/reference/KEYWORDS.md`).

- **Field.** Snares, counted snares, spore, musk and ice zones, triggers and sensing auras are one keyword now: marked spaces that do their keywords (Strike, Weaken, Anchor, Mark, Hidden, Reveal) to whatever enters them or ends the round there, on a chosen space or around you. Its harm falls on its side's foes and its help on its own side; Hover and Weightless are above it; a hazard reads as a Field of damage. Fourteen faces changed words, not numbers, with these exceptions: a trigger's strike is now an area hit like a snare's; Enzymes' Field reaches Anchored foes within 2 of you (it reached every Anchored foe on the board and healed 1 a foe); Cilia Field Marks every foe that steps beside you, not only the first each round.
- **Fields combine with movement.** A Field now springs on a foe pushed, pulled, blown or blinked onto it, not only one that walks in.
- **Fixed: a zone's Weaken did nothing.** It was given for one round at round end and the round-end tick took it at once; a state a Field leaves at round end now lasts into the next round.
- **Cleanse the ground** (`cleanse` with `field`) replaces `clearHazard`: hazards and foes' Fields within N are cleared, never yours.
- **Saves** are version 20: a mission keeps `fields`, and a 2.85 save mid-round keeps its snares, zones, triggers and auras as Fields (fixture `save-2.85.json`).
- **Balance.** No numbers moved: `node tools/sim.js 40`, 120 heuristic runs and 80 look-ahead runs are the same as 2.85.0 (the simulated squads rarely carry these cards), so nothing is retuned.

## 2.85.1 — 2026-11-21 — cards on the track stay readable

Garrett: "the whole cards should still be readable when it is on cooldown"

- **Cooling cards read in full.** A card on the track used to fade to 45% and drop its faces. Now it shows its name, P/E levels, both faces and their costs at full strength, and each face keeps its hover text. The art greys out behind a band that says "back in N", the frame turns dashed, and nothing on the card can be pressed. No rules or save change.

## 2.85.0 — 2026-11-21 — big Ethereal faces

Garrett: "make some more powerful abilities that cost more elemental dice. simply so we don't need boons or consumables"

- **Two and three etherions.** Twelve Ethereal faces now cost two or three etherions of their element and do much more, most of them for no AP. 2: Heavy Throw, Vacuum (every foe near you drawn in and Weakened), Resonance, Phase-tunnel, Fold-hop, Second Wind, Pre-empt. 3: Immovable Hold, Tesla Cascade, Override, Apex Form, Step Out of Time. Since you choose one element die a turn, a three-etherion face is one you save up for. This follows the keyword plan Garrett accepted: big etherion abilities are Ethereal faces; boons and consumables will become gear in the keyword migration, so they stay for now.
- **Balance.** Runs got easier (80 runs, look-ahead 42 → 49), so every foe has **145%** of its listed vitality (was 140%): 80 runs look-ahead 42 → 39, 120 runs heuristic 13 → 10 (`docs/reference/BALANCE.md`). No save change.

## 2.84.0 — 2026-11-21 — Ethereal faces at 0 AP

Garrett: "the underpowered elemental abilities and the ones that refund an ap die should have their ap cost reduced to zero instead"

- **No AP back, no AP cost.** The nine Ethereal faces that gave AP back (Unity, Pocket Fold, Parallel, Reserve, Mental Map, Hoard, Dig In, Catch!, Overdrive) cost 0 AP and give back that much less: the same AP in the end, but playable with an empty bank. Parallel frees a third card at E 3 instead of minting AP.
- **Underplayed faces cost 0 AP.** 84 more Ethereal faces, the ones the census shows the look-ahead player almost never picks (index under 0.25), now cost only their etherions. 93 of 529 Ethereal faces cost no AP.
- **Balance.** 80 runs, look-ahead 43 → 42; 120 runs, heuristic 12 → 13; `node tools/sim.js 40`, runs 3 → 2 and 20 → 16. Not easier, so nothing is retuned (`docs/reference/BALANCE.md`). No save change.

## 2.83.0 — 2026-11-21 — three plain dice and an element die you choose

Garrett: "instead of picking your dice it should be 3 ap dice and 1 element of your choice"

- **A fixed roll.** Every turn a pilot rolls three plain d20s (the AP dice) and one element die of its player's choice, picked from the pilot's own element dice: a d8 of an element it has awakened, or Omni Core's d12 (Garrett chose this over any element, or a sure etherion). It replaces 2.82's free choice of all four. Choose under *Next roll*, any time in a mission, on anyone's turn; the choice stays until changed. With nothing chosen, or every die of that kind banked, the roll takes the element die the pool holds most of; with none left in the pool, all four are plain. Pool and bank still make fifteen (`T.RULES.ROLL_EL`, `T.setRollPick`, `h.rollPick`).
- **Simulated players** choose the element of an Ethereal face back in hand next round that the bank can't pay for, or else the element their awakened cards use most (`T.autoRollPick`).
- **Balance.** The sure etherion helped the careful player: 80 runs, look-ahead 40 → 52 at the old vitality. So every foe has **140%** of its listed vitality (was 130%). `node tools/sim.js 40`, 2.82.0 → 2.83.0: heuristic runs 6 → 3 of 40, mission wins 73% → 66%; look-ahead runs 18 → 20 of 40, mission wins 85% → 87%. Details in `docs/reference/BALANCE.md`.
- **Saves** keep version 19: `h.rollPick` is still a list of kinds, and a 2.82 choice loads as its first element die (plain dice in it are ignored).

## 2.82.0 — 2026-11-20 — choose which dice you roll

Garrett: "when players roll dice, they should be able to select which ones they roll from their pool"

- **Next roll.** Beside your pilot's dice, choose up to four from your pool for the next roll: plain d20s (mostly AP) or your element d8s (no AP, four of their etherion), and the ethereal d12 if you have one. The choice stays from roll to roll until you change it; dice you leave unchosen are drawn at random as before, and so is a chosen die that is banked when the roll comes. You choose the dice, never their faces. Pool and bank still make fifteen (`T.setRollPick`, `h.rollPick`).
- **Both ways to play.** Choose any time in a mission, on anyone's turn, for your own pilot. Taking turns, your roll comes as your turn ends, so choose before you end it (a choice after is for the roll after); all at once, everyone rolls as the round begins.
- **Simulated players choose too** (`T.autoRollPick`): an element die for each Ethereal face back in hand next round that the bank can't pay for (two at most), plain dice for the rest. Balance, `node tools/sim.js 40`, 2.81.1 → 2.82: heuristic runs 6 → 6 of 40, mission wins 73% → 73%; look-ahead runs 25 → 18 of 40, mission wins 90% → 85%. Choosing is not easier for either player, so nothing is retuned. (Choosing only element dice and leaving the rest at random was worse still: heuristic vault t3 43% → 18%.) The UI driver allows a mission 60 rounds, since a long boss fight can pass 30.
- **Saves** are version 19: a pilot may carry its chosen dice. A 2.81 save loads with nothing chosen and draws at random (fixture `save-2.81.json`).

## 2.81.1 — 2026-11-20 — a run of exactly 4 counts its steps

Garrett, from a playtest of Three Caches on Mast-Crop Hills: "it seemed like our abilities would allow us to go through guys 4 spaces away (hyperspeed), but the card said no spaces available."

- **Exactly 4 means four steps.** Hyperspeed and Top Speed (cheetah) and Sky Dash and Sky Burst (hawk) run exactly 4. The engine used to offer only the spaces whose *shortest* way was 4, which is not what a player counts, and on a small, well-joined board there are few: on Mast-Crop Hills, from any space of the threshing floor (B2, C1, C2, D2, C3) everything is 3 or fewer away, so the card had nowhere to go even on an empty board. Now a run of exactly 4 is four steps, past foes and allies, never on the same space twice, ending on an empty space: count it on the board, as at the table (`T.reachableWalk`). Every space of every page off high ground now has somewhere to run (tested), and the highlighted spaces are the ones the card accepts.
- **Balance.** `node tools/sim.js 40` is unchanged to the digit (no pre-made squad in the simulator carries either card). No save change.

## 2.81.0 — 2026-11-20 — take turns in any order, or play all at once

Garrett: "each player should roll their dice as soon as they end their turn. players should take turns in the order of their choice each round." And: "lets replace that [the A/B test] with a different way to play where we do all roll together at the end of the round and players can all play in real time without taking turns."

- **Turns in any order.** With players taking turns, the order is no longer host first: each round, whoever acts first for one of their pilots takes the next turn, and nobody else acts until they end it, so a duo power is still yours to plan. A player can also end their turn without acting. The End turn button names whose turn it ends; a player who has had their turn sees who is still to go.
- **Roll as your turn ends.** Ending your turn rolls your next round's dice at once, so you can plan while the others play (`T.rollAhead`). Those are the dice you hold when the round begins; nobody rolls twice, and the pool and bank still make fifteen.
- **All at once, a second way to play.** The playtest panel's Ethereal rule switch (an A/B test settled in 2.4) is gone; in its place, "Way to play with friends": Take turns (as above, the default) or All at once. All at once has no turns: every player spends AP whenever they like, in whatever order the table agrees, and presses Done (press Waiting to take it back); once everyone with a pilot standing is done, the foes act and everyone rolls together. The host chooses, before or during an expedition. Online, the host's screen carries out moves one at a time in the order they arrive, so two players acting at the same moment are both kept, and a move the board no longer allows is refused (tested with two screens walking at once).
- **The story box** stays open to everyone in both ways (2.79.2).
- **Saves** are version 18: the party keeps the turn under way (`active`) and the way to play (`rounds`), and a pilot may be marked as having rolled ahead. A 2.80 save mid-round loads taking turns and plays on (fixture `save-2.80.json`). Solo play is unchanged.

## 2.80.0 — 2026-11-20 — see who is playing and join their game

Garrett: "now lets have it work more like cosmic shore where we can just see who is playing and jump into their game."

- **A list of games on the title.** Under Play online, Tumult Online now lists the games being played: whose game it is, who is in it, the pilots they fly, and where the expedition is ("Drafting pilots", "On the route (stop 2 of 6)", "In a mission: Hold the Beacon, round 3"). Type your name and press Join: no code to pass around. Codes still work.
- **When you can join.** Join shows while a game is gathering players or its squad is on the route with a seat free (2.79). A game in a mission says you can join between missions; a full one says so. A game you were in offers Rejoin.
- **Quiet and finished games.** Each host's screen refreshes its entry at least once a minute, so a game not heard from for three minutes is folded under "Quiet and finished games" with no Join button, as is a finished one. Entries leave the list when the host leaves, after 12 hours of quiet, and are tidied away after two days.
- **Compatibility.** The list is a small extra document per game (`lobby/<CODE>`); the game's own documents and commands are unchanged, so a game started on 2.79.x plays on, and screens on either version can still join by code. A game hosted from 2.79 appears in the list once its host reloads onto 2.80. No save change, no rules change.

## 2.79.2 — 2026-11-20 — story on anyone's turn

Garrett: "make sure we keep the container that adds flavor during other players turns. we should be able to keep adding things during other players turns"

- **The story box stays open.** With players taking turns, the box beside End turn used to show only on your own turn, and a line written outside it was refused. Now every player can write a line of story for their own pilot at any time in a mission: while others take their turns, after their own, during the foes' turn. It is still one line a pilot a round (the latest kept), still never for someone else's pilot, and it still changes nothing in play. On a screen looking at another player's pilot, the box writes for your own.

## 2.79.1 — 2026-11-20 — an online squad waits for the host's pilot

Garrett: "we tried a 5 and 2 player test and we were not able to start either. it was hanging on the upgrade screen and not accepting my upgrades then i could net press the set out button"

- **Fix.** When a guest confirmed their pilot before the host did, the squad's list of pilots had a hole where the host's would go. The check "has everyone drafted?" skipped the hole, so the expedition set out without the host's pilot, and the host's draft screen broke on it (upgrades and Set out did nothing). Every seat is now counted, holes too (`T.squadReady`), and the pilot art skips a seat still drafting. A test drives exactly this: a guest who sets out first, then the host upgrading and setting out.

## 2.79.0 — 2026-11-20 — join an expedition under way

Garrett: "is there a way the two players mid game could save their game, we update, and then I join in?"

- **A newcomer joins on the route.** Between missions one more player can join, up to five: online with the game's code, while the squad is on the route (`T.canAddPlayer`, `T.addPlayer`). They bring a pilot, drafted or one they made, and the route waits for it (`T.squadReady`). A lone player's second pilot passes to the newcomer instead.
- **Catching up.** A late pilot gets spare upgrade points to match the least-grown pilot already flying (`T.joinPilot`), and its player's purse starts as full as the emptiest. It keeps the level it came with; the next mission scales for the bigger squad.
- **Updating a live game.** An online game from 2.74 to 2.77 resumes on this version: the host picks "Rejoin game" and the guests follow (checked by loading a 2.74 save mid-mission and playing it out). No save change: a party simply has more players and pilots.
- **Balance.** No change for any squad that does not take a newcomer: `node tools/sim.js 40` is byte-identical to 2.78.
## 2.78.0 — 2026-11-20 — made pilots on Froglet's character sheet

Garrett: "Whenever a player creates or updates a character, add or update their row in the Google Sheet … Leave the Pilot columns alone."

- **The player's name travels with their pilots.** Tumult Online's store now keeps `who`, the name the player's account shows, beside their list of made pilots (`heroes/<player id>`), and writes it once for lists saved before. No save change; the offline build is untouched.
- **Rows for the sheet.** `node tools/pilot-sheet.js <heroes dir>` turns the store's documents into one row per pilot (name, player, the two clades, traits, each face with its level) in a Drive feed file named by its content.
- **The sheet keeps itself up to date.** `tools/sheets/pilots-sync.gs`, an Apps Script bound to the sheet, applies the newest feed every ten minutes: upserts by pilot id, claims a seeded row whose species match, never writes the Pilot columns or empties the story columns, and sets Tumult status to Finished once Backstory, Look, Personality and Faction or job are filled. How it fits together: `docs/reference/PILOT_SHEET.md`.

## 2.77.0 — 2026-11-20 — a held trait is never offered again

Garrett: "lets no longer have them gain extra points for drawing the card again. they just have a smaller pool. which gives them more reliability in their late game adaptive swaps."

- **No second copies.** A trait a pilot holds is never offered to it again, in the draft, a reward or an event (`T.canAddCard` says "already held"). From 2.42 a pilot whose two clades shared a trait could take it a second time as 1 upgrade point bound to it; that pick is gone, so a two-clade pilot draws from a smaller pool and meets the traits it is after more often, which matters most for exchanges once its kit is full.
- **Old saves.** A run or a made pilot that already holds bound points keeps them and spends them as before; if the card leaves, they come back as free points (2.76.1). No save change. `tools/double-up.js`, which measured the second pick, is removed.
- **Balance** (`node tools/sim.js 40`, against 2.76.1): look-ahead runs 25/40 both ways, mission win 90%; heuristic runs 5 → 6 of 40, mission win 72% → 73%. Single cells move by a point or two at most: noise from the draft drawing from a different pool.

## 2.76.1 — 2026-11-20 — a lost card gives back every point

Garrett: "when players loose a card they should get their points refunded."

- **Refunds.** Whenever a trait leaves a kit (an exchange for a new trait, the "Molt a trait" and "Offer a trade" events), every upgrade point on it comes back to the pilot's free pool, including the point a second copy bound to it, spent or not. Before, the bound point was lost with the card. Every path goes through `T.removeCard`. No save change.

## 2.76.0 — 2026-11-20 — squads of up to five, missions that answer them, pilots that keep their growth

Garrett: "create formulas for scaling maps etc. based on the player's level and the size of their party. set the max player count to 5. then players can save meta progression on their characters and a new adventure can scale with their upgrades."

- **Up to five players** (`T.MAX_PLAYERS` 5). One player flies two pilots; two to five fly one each, passing one screen or online with up to four guests (net.js now claims the first free seat, and a reload takes back its own). An expedition that has set out takes no new players. With more than two pilots, "your ally" is the nearest ally standing, and Rally and revives reach the nearest ally down.
- **Scaling formulas** (`src/engine/scaling.js`, `docs/reference/SCALING.md`). Per pilot past two: foes +50% vitality, 2 more foes, objectives +1, swarms +1. Per level past one: +5% vitality and a quarter of a foe, an objective step and a swarm step. Extra foes and starts come from a stream of their own, so the board is the same whoever plays it. The Vault's ledge caps at one more seal; Salvage and Survey shorten their clocks instead; the Heart takes half the extra foes and +20% more vitality per pilot past two. Two new pilots: nothing changes.
- **Pilots keep their growth.** A pilot a player made comes home from every expedition with its traits, points and spare points, at a level (`T.pilotLevel`: one per six points of growth, a trait past six counts two), and sets out next time with that kit. The squad's level as it sets out scales the missions. Gear, boons and crystals stay behind.
- **Saves** are version 17 (optional `level`, `madeId`, `runs` on heroes, `foeHp` on missions); a 2.75 save loads unchanged (fixture `save-2.75.json`).
- **Tools.** `node tools/sim.js` takes `--pilots N`, `--level L`, `--noscale` and `--scaling`.
- **Balance** (`node tools/sim.js 40`). Two new pilots: byte-identical to 2.75. Mean mission win over the 22 cells, three and five pilots: heuristic 79% and 78% against 78.5% for two (unscaled 94% and 98%); look-ahead 95% and 94% against 95%. Level 4 and 7 squads: look-ahead 93% and 91%, heuristic 73% and 58%. The Heart grows another +20% vitality per pilot past two, so a big squad's last fight is no softer: look-ahead 40% / 25% / 50% for three / four / five pilots against 40% for two (it was 92% at five before this retune).

## 2.75.1 — 2026-11-20 — Cosmic Shore's clade names, and dice are drawn

Garrett: "Hawk is not a species. photosynthesis uses the word pull in references to dice, which collides with the use elsewhere… lets use ratel for honey badger to be consistent. and orca for killer whale."

- **Names.** The Honey Badger is the **Ratel** and the Hawk is the **Red-tailed Hawk**, matching its painted head. The Orca was already the Orca; no card or name said "killer whale". Clade ids (`badger`, `hawk`) do not change, so saved runs, saved pilots, online games and canon notes load exactly as before.
- **Draw, not pull.** Photosynthesis (Bask), Cheek Caching (Stash) and Solar Basking (Bask) said "pull" a die, which lit up the Pull keyword and its tip about moving foes. They now say "draw", as every other dice card does. The tortoise's Withdraw and the snail's shell faces no longer say "pull" either (Tuck In, Retreat into your shell, Shell Watch). Text only: no rule changes.

## 2.75.0 — 2026-11-20 — a full kit grows by exchange

Garrett: "after getting 9 cards total, players should be able to swap cards at similar points exchanging an old card for a new one but keeping the 9 card max."

- **Exchanges.** A pilot with nine traits used to get an empty trait offer after a mission. Now it gets up to three traits of its bloodline it could take by giving one up (`T.swapCard`, `T.swapDrops`, `T.isSwapOffer`). The new trait arrives unupgraded and the free points on the old one come back; a second copy's bound point goes with its card. The 3-of-9 cap holds after the exchange. A second copy the pilot can still take is offered first, and skipping still pays 2 ◇.
- **Online.** The `takeCard` command carries the trait given up (`drop`); older commands without it are unchanged.
- **Balance.** Exchange offers draw from a stream of their own and the simulated players pass on them. The one thing that changes for them is that a full kit's pass now pays 2 ◇, as any skipped offer does (before, a full kit had nothing to skip). `node tools/sim.js 40`: the mission tables are identical to 2.74.0; full runs: heuristic 5/40 → 5/40, look-ahead 26/40 → 25/40 (one seed, 24, went the other way at its last mission).

## 2.74.0 — 2026-11-20 — online: quicker, and a reload can rejoin

Garrett, after 2.73.1: "it feels slow often… like it is waiting for the network to process a simple move." The engine answers a move in about 7 ms; the wait was the page store's live delivery, which can fall back to a refresh every half minute.

- **A fast lane.** Where the page offers a live channel between the screens open on it (claude.ai's `room`), a game's screens meet in a room named for its code. A guest sends each command there as well as to the store, and the host says "this state is written" there after each write, so the guest reads it at once. Messages there can drop, so the store stays the truth; the room only hurries it along. Tumult Online opens the two topics (`cmd`, `rev`) to Contributors and up.
- **A backstop read.** A guest reads the host's state at least every 2 seconds when nothing has arrived, so a stalled live delivery costs 2 seconds, not 30.
- **Rejoin after a reload.** The game a screen is in is remembered on the device (`tumult_v2_net`, 12 hours; leaving on purpose forgets it), and the title offers _Rejoin game ABCD_. A guest takes its seat again (waiting out the few seconds a reloaded page's seat claim lasts) and carries on numbering from the host's acks; a host picks the game up from the state it last wrote, with its acks and results.
- **Tests.** Online tests for a guest and then a host reloading and rejoining, and for moves crossing through the room in under a second while the store hears nothing live.

## 2.73.1 — 2026-11-20 — online: a partner's turn no longer resets

A playtest was halted because the partner's (guest's) turn kept snapping back while the host's screen was fine.

- **The cause.** A guest plays each command on its own screen at once and sends it to the host. If the host's screen had not carried it out within 15 seconds, the guest dropped it and its screen fell back to the host's state, so the turn reset. The store's live delivery to the host can lag or stop (the live game in the halted playtest still holds two of the guest's commands the host never heard), so a slow turn was a lost turn.
- **The fix: a reliable, ordered channel.** Each guest numbers its commands; the host carries out number n only after n − 1 and writes the last one it carried out for each seat with the state. A guest keeps every command until it is acknowledged, plays it again on top of each state the host writes, and writes it again every 3 seconds meanwhile. The host reads the commands live and every 2.5 seconds, opens a new live view if one dies, and writes a state again if a write fails. A guest whose commands wait reads the state itself, and after 8 seconds is told it is waiting for the host's screen. A command is sent as it was made, not as the guest's own play filled it in.
- **Tests.** Two new online tests run a store whose live delivery to the host stops, and one whose writes fail; both failed before the fix.

## 2.73.0 — 2026-11-19 — a balance and utility pass: no keys, no chains, everything grows

Garrett's ask: nothing categorically better than anything else, everything useful from the first mission to the Heart, and combos that feel cinematic because of their depth, not because one card is the key to a lock.

- **A card plays at most once a turn.** 38 faces had a cooldown of 0 and could be chained: two Trots for 8 steps, a Mark on every foe. Every face now has a cooldown of at least 1, so it is back in hand the turn after. A data test holds the rule.
- **No face is the key to a lock** (47 faces). Whole-board reveals now reach as far as the card is upgraded (1 + E around you, 2 + E for the two keenest senses); Acoustic Map no longer finds the hidden cache from anywhere. Shield breakers chip 1 + E (Otter's Crack: 1 + P) instead of deleting any Shield. Squad-wide hazard shelters cover the ally for this round and their caster for the rounds the card gave before. Scent locks last 2 + E rounds instead of the mission. Reach Rig and Snatch the Egg no longer work a ledge from the floor. A data test holds each.
- **Every face grows with its card.** 36 faces read the same at every level (Read, Huff, Steady Breath, Break the Ice…); each now has a magnitude that grows with P or E, mostly 1 + ½P, so an upgrade point always shows. A data test holds the rule.
- **The cheapest moves go one step less.** The 59 physical faces that moved 4 or more for 1 AP at P 2 now move one fewer (Trot, Spring, Jet, Undulate…). They were picked about two and a half times as often as their neighbours.
- **Fixes.** Pace's move did nothing (it never asked where to); it now does. Digest hits for 1 + ½P when the foe is not held instead of nothing. Tesla Cascade costs 3 AP and one etherion (was 4 and two), Surge 2 AP (was 3), Spot Threat's reroll is free. Multitask also mints ½P AP.
- **The look-ahead player sees a little further** (`docs/reference/PLAYERS.md`). It takes a face's free step as a walk, it counts what a set-up has already bought for later rounds (a regen engine with vitality to restore, AP to come, a strike bonus held, a Studied foe) at 0.6 of its worth (`T.EVAL.ahead`), and it no longer drops a line that has just minted dice before it can spend them (`T.EVAL.spare`). None of this was fitted to the win rates.
- **A census of what gets chosen** (`node tools/census.js`): each face's share of its hero's plays against a fair share. Before the pass, 40 faces were picked over three times their fair share (the best five times) and 139 never; after it, 16 and 102, the best 3.7 times. Difficulty: main is a touch harder, not easier (`docs/reference/BALANCE.md`).

## 2.72.0 — 2026-11-19 — pilots you made, ready to fly again

- **Every pilot built is kept.** Confirming a pilot drafted from packs keeps its name, clades, cards and the points on them (`T.madeFrom`, kept on the device under `tumult_v2_heroes`, newest first, up to 60). A new expedition lists them under the pre-made heroes, _…or play a pilot someone made_, and picking one builds it exactly as it was (a trait taken twice keeps its own point). ✕ takes one of your own off the list. Playing a pre-made hero adds nothing.
- **Shared on the test page.** On the test page and Tumult Online each player's made pilots are also written to the page's store (`heroes/<viewer id>`), so everyone who opens the page can fly them, with the maker's name shown. A pilot shared by someone else is rebuilt from the rules before it is offered (`T.validMade`: real clades and cards, 3 of 9, caps, no more points than a new hero), and flying it does not make it yours. The offline TUMULT.html keeps them on the device only.

## 2.71.0 — 2026-11-19 — the dock: your turn in one place

- **A fixed dock.** The pilot being flown now sits in a dock along the foot of the mission screen that never folds or scrolls away: vitality, AP banked in large type, etherions banked as counted chips, dice and pool, the track, the whole hand in one row, and the basic actions and gear (three to a row, costs in gold). On a short screen the cards drop their art so the board keeps its room. On a phone the dock sticks to the bottom of the screen and its hand and actions scroll sideways.
- **The side column is what changes.** Enemy intents and the forecast, the ally (folded to vitality, AP and dice; click to fly them, which swaps them into the dock, or Show cards) and the log, which now sits at the foot of the side column.
- **Bigger where it matters.** The clock, the objective and every face's cost are larger; the ally's AP shows in gold beside its dice.

## 2.70.0 — 2026-11-19 — choose the next stop by what it asks

- **Stop cards.** Above the route, every stop the squad can reach next stands as a card, side by side: for a mission, its objective in a word (Hold, Break in, Find, Channel, Carry, Tag, Defeat) and in full, how many rounds its clock gives, the foes on the board (with counts and vitality in the tips) and any swarm that keeps coming, the place's gravity and weather, and its bonus goals. A haven or an event says what it offers. Each card has its own Set out button, and hovering a card lights its stop on the route. The numbers are exact: the card reads the same spec the mission is launched from (`T.missionSpec`, `T.previewStop`), and previewing changes nothing in the run. Which cache is real stays hidden.
- **The route reads from the top.** The squad sets out at the top of the route and the Heart waits at the foot, so the first choice is on screen without scrolling. A stop's tip on the route now also gives its objective, clock and foes.

## 2.69.0 — 2026-11-19 — 76 more painted pilots

- **Art.** Cosmic Shore's 76 new painted crew pilots join the 50 already here, each with a portrait and a scene in their world (`assets/pilots/`, `assets/scenes/`) and their pair of clades, so 126 paintings now cover 126 different pairs. Heroes whose pair had only a stand-in before often get an exact painting now, and a squad has far more faces to choose from. Scenes also rotate behind the title.
- Many crew pilots fly the same callsign, so each is keyed by first name (`JORIRO`) and carries its callsign (`ENSIGN`) for captions and canon (`U.callsignOf`).
- Five of their animals are not Tumult clades yet (capybara, cuttlefish, mole, tapir, wolf); those paintings show for a hero who shares their other clade.
- The single-file build grows from about 4.4 MB to 8.1 MB.

## 2.68.1 — 2026-11-17 — draft questions match your clades

- **Canon questions in the draft.** A hero wearing a stand-in painting was asked about the painted pilot's clades, so an orca and mandrill hero was asked "what gives away the eagle in them?" (the painting is Jugger, orca and eagle). A stand-in is now never asked a question that names the pilot's clades, and the question says it is about the pilot whose painting the hero wears (`noClades` in `T.canonPrompt`).

## 2.68.0 — 2026-11-17 — painted clade heads

- **Portraits.** Every clade but human now shows a painted head wherever its icon appeared: on cards, in draft packs and the species picker, in the codex and on pilot screens. The heads come from six sprite sheets of 128 px tiles (`assets/portraits/`, about 290 KB in all), sliced with CSS (`U.PORTRAIT_SHEETS`, `U.icClade`). Human, and any page built without the art, keeps the drawn icon. A build test requires a head for every clade.
- The sheets were generated in Figma Weave (Nano Banana Pro) from Garrett's approved test sheet and approved by him before going in (`assets/README.md`).

## 2.67.1 — 2026-11-17 — every clade drawn

- **Icons.** The 75 clades added since 2.42 now have drawn icons in the same language as the first twelve: flat, angular silhouettes on the 24-unit grid, with cuts for eyes and markings. Until now they fell back to emoji on cards, in the codex and in draft packs. A build test now requires an icon for every clade.
- **Shared traits name your clade.** A card shared across clades named the clade it was first written for, so Hollow Bones on a Blue-Footed Booby said "Barn Owl". Cards now name the clade the pilot carries them through, in draft packs, training, the hand and the codex (`U.cladeIn`). Branch traits still name their branch.

## 2.67.0 — 2026-11-17 — the pre-made heroes are painted pilots

With all 21 branches built, each pre-made hero is now a painted Cosmic Shore pilot: that pilot's name, pair of clades and art (Garrett chose the pilots' names). Each keeps the old hero's title and role; the ids stay the old names so saved canon notes still match.

| Was                                                     | Now (painting)        | Clades                  |
| ------------------------------------------------------- | --------------------- | ----------------------- |
| Cavitt, the Brawler-in-the-Cloud (octopus, grasshopper) | Rosh (BANDIT)         | octopus, raven          |
| Marish, the Tidewarden (eel, flytrap)                   | Ekora (FLUME)         | otter, eel              |
| Ossa, the Bulwark (tardigrade, gecko)                   | Nedira (CITADEL)      | hedgehog, tortoise      |
| Veil, the Nightwing (owl, jerboa)                       | Echo (ECHO)           | mouse, owl              |
| Mycel, the Network (cordyceps, axolotl)                 | Karenth (VOLT)        | axolotl, koi            |
| Kess, the Catapult (grasshopper, eel)                   | Slingshot (SLINGSHOT) | flamingo, mantis shrimp |

- Each kit keeps six cards, at most three per bloodline, and six UP with two cards awakened.
- **Balance** (`node tools/sim.js 40`, before → after):
  - Full runs: heuristic 7/40 → 6/40, look-ahead 21/40 → 24/40. The boss: heuristic 18% → 13%, look-ahead 40% → 40%.
  - Vault missions got harder for both players (heuristic t3 55% → 40%); hidden and salvage got a little easier for the heuristic.
  - Mission win rate overall: 75% → 72% (heuristic), 88% → 88% (look-ahead).

## 2.66.0 — 2026-11-17 — the insects and arachnids

The twenty-first and last branch of the tree (`docs/design/11-clades.md`): five painted bugs, each with nine traits. The Grasshopper (not painted) moves onto the branch and keeps its nine.

- **Beetle, Butterfly, Firefly, Praying Mantis and Scorpion.**
- Shared traits:
  - **Antennae**, written for the branch: the four insects
  - the grasshopper's **Compound Eyes**: the four insects
  - the grasshopper's **Chitinous Exoskeleton**: all but the butterfly
  - the butterfly also has the grasshopper's **Glide Wings** and the crane's **Migration**
  - the scorpion also has the grasshopper's **Molt** and the hedgehog's **Venom Shrug**
- Traits of each one's own:
  - beetle: Horn Lift, Wing Cases, Ball Roller, Bombardier Spray, Strong Back and Play Dead
  - butterfly: Eyespots, Dust Scales, Proboscis, Erratic Flight and Metamorphosis
  - firefly: Flash, Synchrony, False Signal, Bitter Blood, Glow-Worm Bite and Cold Light
  - mantis: Raptorial Strike, Hold Still, Leaf Sway, Swivel Head, Startle Display and Flower Lure
  - scorpion: Tail Sting, Pincers, Moonglow, Sand Sense, Burrow and Brood Carry
- Each has a voice in the passages between stops. The audit reports no narrow faces.
- **Balance** (look-ahead player, forced squad: one hero is the clade plus a random second, 60 runs):
  - Results: beetle 23%, butterfly 25%, firefly 22%, mantis 22%, scorpion 33%.
  - The scorpion was at 37% before Grab hit 1 softer and Ambush's bonus dropped by 1.

## 2.65.0 — 2026-11-17 — the crustaceans

The twentieth branch of the tree (`docs/design/11-clades.md`): two painted crustaceans, each with nine traits.

- **Lobster and Mantis Shrimp.**
- Shared traits:
  - **Molt** and **Carapace**, written for the branch: both
  - the lobster also has the parrot's **Long Life**, and the mantis shrimp the chameleon's **Turret Eyes**
- Traits of each one's own:
  - lobster: Crusher Claw, Pincer Claw, Tail Flip, Long March, Long Feelers and Rock Den
  - mantis shrimp: Smasher Punch, Spearer Arms, Sixteen Colours, Burrow, Fluoresce and Ritual Fight
- Each has a voice in the passages between stops. The audit reports no narrow faces; Square Up gained Shield 1 so it does more than answer one telegraphed hit.
- **Balance** (look-ahead player, forced squad: one hero is the clade plus a random second, 60 runs): lobster 28%, mantis shrimp 35%. Earlier branches range from 18% to 40%.

## 2.64.0 — 2026-11-17 — the molluscs and jellies

The nineteenth branch of the tree (`docs/design/11-clades.md`): two painted soft bodies join the Mimic Octopus, each with nine traits.

- **Snail and Jellyfish.** The Octopus now sits on this branch and keeps its nine.
- Shared traits:
  - **Boneless Squeeze** (the octopus's): all three
  - **Regeneration** (the axolotl's): snail and jellyfish
  - the snail also has the octopus's **Chemo-Suckers** and the tortoise's **Shell**
  - the jellyfish drifts with the eel's **Buoyancy Control**. It is no fish, so it is a variant.
- Traits of each one's own:
  - snail: Slime Trail, Seal In, Radula, After Rain and Eye Stalks
  - jellyfish: Nematocysts, Trailing Tentacles, Bell Pulse, Bioluminescence, Bloom and Turn Back (re-form when downed)
- Each has a voice in the passages between stops. The audit reports no narrow faces.
- **Balance** (look-ahead player, forced squad: one hero is the clade plus a random second, 60 runs):
  - Results: octopus 23% (unchanged), snail 22%, jellyfish 33%.
  - The jellyfish was at 42% before a trim:
    - Sting hits for 1+P (was 2+P)
    - Glow gives +1 to your next hit instead of a Mark
    - Trail is thorns 1+P with no Weaken
  - The snail was at 18% before Rasp hit 1 harder and Glide added +1 to your next hit.

## 2.63.0 — 2026-11-17 — the fish

The eighteenth branch of the tree (`docs/design/11-clades.md`): four painted fish join the Eel, each with nine traits.

- **Koi, Clownfish, Lionfish and Seahorse.** The Eel now sits on this branch and keeps its nine.
- Shared traits:
  - **Buoyancy Control** (the eel's) and **Lateral Line** (the axolotl's): all five
  - **Schooling**: koi and clownfish
  - the koi also has the parrot's **Long Life**, and the seahorse has the pouched animals' **Pouch** and the chameleon's **Turret Eyes** (variants)
- Traits of each one's own:
  - koi: Dragon Gate, Upstream, Shimmer Scales, Pond Calm and Gold Gleam
  - clownfish: Anemone Home, Dart, Mucus Coat, Pair Bond, Change Role and Pop
  - lionfish: Venom Spines, Fan Corral, Hover Stalk, Gulp, Invader, Warning Fins and Night Hunt
  - seahorse: Tail Anchor, Snout Snap, Drift Camouflage, Bony Plates and Slow Fin
- Each has a voice in the passages between stops. The audit reports no narrow faces.
- Fixed: the Mirror Scales text printed raw template code.
- **Balance** (look-ahead player, forced squad: one hero is the clade plus a random second, 60 runs):
  - Results: eel 23%, koi 27%, clownfish 35%, lionfish 33%, seahorse 25%.
  - The lionfish was at 37% before a trim: Corner It's bonus is +E (was +1+E), Take Over gives 1 AP once, and Drift Closer moves 2+P with no damage bonus.

## 2.62.0 — 2026-11-17 — the amphibians

The seventeenth branch of the tree (`docs/design/11-clades.md`): two painted amphibians join the Axolotl, each with nine traits.

- **Newt and Tree Frog.** The Axolotl now sits on this branch and keeps its nine.
- Shared traits:
  - **Toxic Secretion** and **External Gills** (the axolotl's): all three
  - **Regeneration** and **Lateral Line**: axolotl and newt
  - the tree frog's sticky toes are the gecko's **Adhesive Setae**. It is not the gecko's kin, but it gives the same answer to the same wall (a variant).
- Traits of each one's own:
  - newt: Eft Wander, Warning Belly, Water Return, Tail Swim and Rough Skin
  - tree frog: Leaf Leap, Rain Call, Red-Eye Startle, Glass Belly, Night Chorus and Long Tongue
- Each has a voice in the passages between stops. The audit reports no narrow faces.
- **Balance** (look-ahead player, forced squad: one hero is the clade plus a random second, 60 runs):
  - Results: axolotl 33%, tree frog 23%, newt 25%.
  - The newt was at 18% before its own strikes were raised: Rough Skin and Tail Flick hit 1 harder, Warning Belly adds +1 to your next hit, Eft Wander adds +1 too, and Tail Swim moves 1 further.

## 2.61.0 — 2026-11-17 — the crocodiles and tortoises

The sixteenth branch of the tree (`docs/design/11-clades.md`): two painted reptiles, each with nine traits.

- **Crocodile and Giant Tortoise.**
- Shared traits:
  - **Solar Basking** (every reptile's)
  - **Armoured Hide** and **Slow Heart**. Slow Heart's ethereal face stops the heart long enough that nothing can target you through the next enemy phase.
  - the tortoise carries the parrot's **Long Life**
- Traits of each one's own:
  - crocodile: Death Roll, Lurk, Ambush Jaws, Tail Sweep, Gape and River King
  - tortoise: Shell, Slow and Sure, Beak Snap, Withdraw and Steady Plod
- Each has a voice in the passages between stops. The audit reports no narrow faces.
- **Balance** (look-ahead player, forced squad: one hero is the clade plus a random second, 60 runs):
  - The crocodile wins 27%.
  - The tortoise won 13% at first. After the fixes below it wins 18%, the lowest of the new clades so far but below average, not above.
  - Fixes: Beak Snap hits harder, Steady Plod moves further, Shell's ethereal face also hits back, and Slow and Sure's ethereal face adds to a later hit.

## 2.60.0 — 2026-11-17 — the lizards

The fifteenth branch of the tree (`docs/design/11-clades.md`): three painted lizards join the Gecko, each with nine traits.

- **Chameleon, Basilisk and Horned Lizard.** The Gecko now sits on this branch and keeps its nine.
- Shared traits:
  - all four lizards carry the gecko's **Tail Autotomy**, **Scaled Hide** and **Solar Basking**
  - Solar Basking will go to every reptile; the crocodile and the tortoise come next
- Traits of each one's own:
  - chameleon: Turret Eyes, Colour Shift, Ballistic Tongue, Grip Feet, Slow Sway and Casque
  - basilisk: Water Run, Crest Flare, Dive, Lizard Sprint, Two-Legged and Branch Drop
  - horned lizard: Blood Squirt, Spiked Crown, Sand Shimmy, Ant Feast, Flatten and Puff Up
- Each has a voice in the passages between stops. The audit reports no narrow faces.
- **Balance** (240 drafted runs, look-ahead player): inside this release, runs with a new lizard win 34% (44 runs) and runs without one 29%. The gap is within the noise for so few runs.

## 2.59.0 — 2026-11-17 — the ground birds

The fourteenth branch of the tree (`docs/design/11-clades.md`): the last two painted birds, each with nine traits.

- **Ostrich and Wild Turkey.**
- Shared traits:
  - **Hollow Bones** (every bird) and **Ground Sprint** (both)
  - the turkey carries the peacock's **Display Fan**, **Alarm Call** and **Spur**
  - the ostrich carries the hoofed animals' **Kick** and **Wide Eyes**. It is not their kin, but it gives the same answer to the same open plain (a _variant_, `docs/design/11-clades.md`).
- Traits of each one's own:
  - ostrich: Stride, Head Low, Wing Fan, Stone Gizzard and Nest Ring
  - turkey: Gobble, Flock Watch, Roost Flight and Wattle Flush
- Each has a voice in the passages between stops. The audit reports no narrow faces.
- **Balance** (look-ahead player):
  - In 240 drafted runs, only 23 had an ostrich or a turkey, and they won 2 of them (35% for the rest).
  - With a forced squad (one hero is the clade plus a random second, 60 runs each), the ostrich wins 25%, the turkey 32%, the crane 30% and the eagle 40%.
  - Ground Sprint's Dash, Wattle Flush's Go Red and the ostrich's Stride were raised a little.
  - Both are on the low side of the birds and make no run easier.

## 2.58.0 — 2026-11-17 — the perching and bright birds

The thirteenth branch of the tree (`docs/design/11-clades.md`): five painted birds, each with nine traits.

- **Raven, Parrot, Toucan, Hummingbird and Peacock.**
- Shared traits:
  - **Hollow Bones**: every bird
  - **Mimicry** (a decoy, or a foe's attack turned on its neighbour) and Human's **Pattern Recognition**: raven and parrot
  - the parrot also carries Human's **Opposable Grip**, and **Long Life**: the koi, tortoise and lobster will share it
  - the toucan carries the shoebill's **Big Bill**
  - **Display Fan**, **Alarm Call** and **Spur** are the peacock's for now; the turkey will share them
- Traits of each one's own:
  - raven: Shiny Cache, Mob, Carrion Wing, Raven Memory, Wolf Guide and Snow Slide
  - parrot: Beak Crack, Flock Chatter, Bright Colours and Clay Lick
  - toucan: Bright Bluff, Fruit Toss, Canopy Hop, Bill Cool, Nest Raider, Fold Sleep and Loud Croak
  - hummingbird: Hover, Thousand Beats, Night Torpor, Needle Bill, Backward Flight, Nectar Rush, Tiny Fury and Flower Memory
  - peacock: Hundred Eyes, Train Sweep, Snake Eater, Jungle Roost and Iridescence
- Each has a voice in the passages between stops. The audit reports no narrow faces.
- **Balance** (240 drafted runs, look-ahead player):
  - Inside this release, runs with one of the five win 33% and runs without one 37%.
  - The toucan is the highest, at 7 wins in 13 runs. That is too few runs to tune on.

## 2.57.0 — 2026-11-17 — the seabirds

The twelfth branch of the tree (`docs/design/11-clades.md`): three painted seabirds, each with nine traits.

- **Atlantic Puffin, Pelican and Blue-Footed Booby.**
- Shared traits:
  - **Hollow Bones**: every bird
  - **Plunge Dive**, **Waterproof** and **Salt Gland**: all three
  - the puffin carries the jerboa's **Burrowing**, the pelican the shoebill's **Big Bill**
- Traits of each one's own:
  - puffin: Wingdive, Beakful, Cliff Launch and Bright Bill
  - pelican: Pouch Scoop, Fishing Line, Long Glide and Pelican Crash
  - booby: Blue Feet Dance, Shoal Chase, Colony, Ground Nest and Clumsy Charm
- Each has a voice in the passages between stops. The audit reports no narrow faces.
- **Balance** (240 drafted runs, look-ahead player): inside this release, runs with a seabird win 23% and runs without one 30%. The seabirds make no run easier.

## 2.56.0 — 2026-11-17 — the waders

The eleventh branch of the tree (`docs/design/11-clades.md`): six painted waders, each with nine traits.

- **Crane, Heron, Egret, Ibis, Shoebill and Flamingo.**
- Shared traits:
  - **Hollow Bones** (the owl's): every bird
  - **Wade** and **Long Legs**: all six
  - **Spear Bill** and **Still Hunt**: all but the flamingo
  - the heron carries Human's **Tool Use**
- Traits of each one's own:
  - crane: Migration (the butterfly will share it), Courtship Dance, Long Stride and Trumpet
  - heron: Canopy Shade, Neck Spring and Rookery
  - egret: Plumes, Foot Stir, Cattle Rider and Graceful Lift
  - ibis: Probing Bill, Flood Wader, Scribe's Eye and Flock V
  - shoebill: Big Bill (the toucan and pelican will share it), Collapse Strike, Bill Clatter and Swamp Ghost
  - flamingo: One-Leg Rest, Filter Feed, Flock March, Salt Flats, Crop Milk and Pink Flock
- Each has a voice in the passages between stops. The audit reports no narrow faces.
- **Balance** (240 drafted runs, look-ahead player):
  - Inside this release, runs with a wader win 28% and runs without one 36%, so the waders make no run easier.
  - The flamingo, a healer with no direct strike, is the lowest (2 of 15 runs); too few runs to tune on yet.

## 2.55.0 — 2026-11-17 — the birds of prey and owls

The tenth branch of the tree (`docs/design/11-clades.md`): two painted raptors join the Barn Owl, each with nine traits.

- **Bald Eagle and Hawk.** The Barn Owl now sits on this branch and keeps its nine.
- Shared traits:
  - **Hollow Bones** and **Talon Strike**: the owl's, now carried by all three
  - **Keen Sight** (see far, Mark a foe; or pick any foe to hunt) and **Stoop** (drop onto a foe from up to 3+E away): eagle and hawk
- Traits of each one's own:
  - eagle: Soar, Talon Lock, Eagle Scream, Fish Snatch and Nest Guard
  - hawk: Sky Hyperspeed (the cheetah's exact run of 4, over hazards too), Kite, Talon Bind, Mantle and Hedge Chase
- Each has a voice in the passages between stops. The audit reports no narrow faces.
- **Balance** (240 drafted runs, look-ahead player):
  - Inside this release, runs with an eagle or a hawk win 32% and runs without one 31%.
  - A first pass had them at 40%, so Keen Sight's Spot lost its +1 and Eagle Scream's party bonus is a flat +1.
  - Main wins 87 and this release 75; the squads differ between the builds, since they are drawn from the clade list.

## 2.54.0 — 2026-11-17 — the pouched and egg-laying

The ninth branch of the tree (`docs/design/11-clades.md`): three painted animals, each with nine traits.

- **Red Kangaroo, Opossum and Platypus.**
- The kangaroo and the opossum share **Pouch**. Its two faces:
  - your ally heals and gains AP;
  - you swap places with your ally anywhere on the board, and both hold Shield.
- Traits shared from earlier branches:
  - the opossum carries the hedgehog's **Venom Shrug**;
  - the platypus carries the jerboa's **Burrowing**.
- Traits of each one's own:
  - kangaroo: Hop, Tail Kick, Box, Tail Prop, Mob Lead, Long Hop, Kick Off and Desert Lick
  - opossum: Play Dead, Prehensile Tail, Fifty-Tooth Hiss, Clean Groom, Thumb Feet, Night Wander and Scavenger's Nose
  - platypus: Electroreception, Venom Spur, Duck Dive, Cheek Store, Eyes-Shut Hunt, Webbed Fold, Egg Clutch and Odd One Out
- Each has a voice in the passages between stops. The audit reports no narrow faces.
- **Balance** (240 drafted runs, look-ahead player, on both builds):
  - Main wins 74 and this release 87.
  - The drafted squads are not the same on the two builds: they are drawn from the clade list, and the list is longer here.
  - The like-for-like figure is inside this release. Runs with one of the three new clades win 29%; runs without one win 38%. The new clades are not what makes runs easier.

## 2.53.0 — 2026-11-16 — the armoured and slow

The eighth branch of the tree (`docs/design/11-clades.md`): four painted animals, each with nine traits.

- **Three-Toed Sloth, Armadillo, Pangolin and Hedgehog.**
- Shared traits:
  - **Slow Metabolism**: sloth, armadillo and pangolin
  - **Curl Up**: the armoured three (armadillo, pangolin and hedgehog)
  - **Dig Claws** and **Long Tongue**: armadillo and pangolin
- Traits of each one's own:
  - sloth: Algae Fur, Hook Claws, Unhurried, Hang On, Slow Swim, Neck Turn, Sleep Anywhere and Sudden Swipe
  - armadillo: Bands, Startle Jump, Breath Crossing, Night Snuffle and Armour Shove
  - pangolin: Overlapping Scales, Tail Shield, Sharp Edges, Walk Upright and Ant Armour
  - hedgehog: Venom Shrug, Spines, Snuffle, Hibernate, Anointing, Night Forage, Spine Burst and Huff
  - Venom Shrug is the hedgehog's for now; the opossum will share it when the pouched animals arrive.
- Each has a voice in the passages between stops. The audit reports no narrow faces (Venom Shrug's Immune also heals).
- Balance: 240 drafted runs, look-ahead player, the same seeds on both. Main wins 73 and this release 74. Runs with an armoured clade win 26%, runs without one 33%.

## 2.52.0 — 2026-11-16 — the gnawers

The seventh branch of the tree (`docs/design/11-clades.md`): four painted gnawers, each with nine traits.

- **Field Mouse, Porcupine, Brown Hare and Black Hare.** The jerboa joins their branch and shares its traits:
  - Gnawing Incisors with all four
  - Vibrissae Sense with the mouse and the porcupine
  - Burrowing with the mouse
  - Saltatorial Leap with both hares
  - Erratic Bounding with both hares and the mouse
- The two hares also share **Long Ears**, **Boxing** and **Lie Low**.
- Traits of each one's own:
  - mouse: Scurry, Through the Gap, Seed Stash, Tiny Target, Squeak
  - porcupine: Quills, Quill Rattle, Tree Climb, Back Turn, Quill Shed, Bark Eater, Waddle
  - brown hare: Mad March, White Winter, Thump
  - black hare: Shadow Bolt, Night Kick, Midnight Forage
- Each has a voice in the passages between stops. The audit reports no narrow faces.
- Balance: in 240 drafted runs (look-ahead player, the same seeds on both), main wins 70 and this release 73. Runs with a gnawer win 37%; runs without one win 27%.

## 2.51.0 — 2026-11-16 — the hoofed animals

The sixth branch of the tree (`docs/design/11-clades.md`): seven painted hoofed animals, each with nine traits.

- **Yak, Bison, Oryx, Bighorn Ram, Moose, Deer and Zebra.**
- All seven carry **Hooves**, **Herd Ring**, **Wide Eyes** and **Kick**. The horned four (yak, bison, oryx, ram) share **Horn Charge** and **Ruminate**; moose and deer share **Antlers** and **Bound Away**.
- Traits of each one's own:
  - yak: Thick Coat, Pack Bearer, Thin Air
  - bison: Stampede, Wallow, Shoulder Hump
  - oryx: Rapier Horns, Desert Store, Mirage Walk
  - ram: Headbutt, Sure Hooves, Curled Horns
  - moose: Wade Deep, Bellow, Stand Ground
  - deer: Alert Ears, Dapple, Spring Away
  - zebra: Dazzle Stripes, Herd Bolt, Bite Fight, Waterhole, Stripe Wall
- Each has a voice in the passages between stops. The audit reports no narrow faces.
- **Test harness:** a simulated mission now stops at its 40th round by the mission's own count. It used to count calls, so a mission resumed from a save ran three rounds longer than the same mission played straight, and the save-replay test failed whenever a mission reached the cap.
- Balance: 240 drafted runs, look-ahead player, the same seeds on both: main wins 86, this release 70. Runs with a hoofed clade win 27%, runs without 32%. On a first pass the hoofed clades won less, so Kick, Antlers and Stand Ground hit 1 harder, Herd Ring shields 1 more, and Wide Eyes and Stampede add +1 to the next hit. Main gets harder, not easier.

## 2.50.0 — 2026-11-16 — the sea mammals

The fifth branch of the tree (`docs/design/11-clades.md`): three painted sea mammals, each with nine traits.

- **Walrus, Orca and Narwhal.**
- All three carry **Blubber** and **Breath Hold**. The two whales share **Echolocation** and **Pod Song**; the walrus and the narwhal share **Tusk**.
- Traits of each one's own:
  - walrus: Haul Out, Whisker Feel, Herd Bellow, Suction Feed, Ice Haul and Ton of Weight
  - orca: Breach, Pod Tactics, Wave Wash, Apex and Beach Charge
  - narwhal: Sense Tusk, Ice Lead, Deep Dive and Pale Ghost
- Each has a voice in the passages between stops.
- The audit reports no narrow faces.
- Balance: 240 drafted runs, look-ahead player, the same seeds on both: main wins 85, this release 86. The narwhal first won 3 of its 31 runs, so Pale Ghost, Deep Dive and Sense Tusk hit a little harder (9 of 31 after).

## 2.49.0 — 2026-11-16 — dogs, hyenas and weasel kin

The third and fourth branches of the tree (`docs/design/11-clades.md`): eight painted animals, each with nine traits.

- **Fennec Fox, Red Fox, Golden Jackal, Coyote and Spotted Hyena** (branch _Dogs and hyenas_).
  - Keen Nose, Pack Howl and Long Trot are carried by all five; Pin Down by the four dogs.
  - Fennec and fox share Mousing Pounce and Den; jackal and coyote share Yip Chorus and Opportunist.
  - The hyena also carries the cats' Killing Bite: hyenas sit on the cat side of the carnivores, so a branch may name a second branch it is kin to (`alsoKin`).
- **Sea Otter, Honey Badger and Red Panda** (branch _Weasel kin_). All three carry Musk and Dense Fur; otter and badger share Ferocity. The otter also shares Human Tool Use; the red panda shares Human Grip and the ocelot's Headfirst Descent (variants for unrelated climbers).
- Every clade keeps at least one trait no clade on its branch carries; each has a voice in the passages between stops.
- The audit reports no narrow faces (Keen Nose's Track also Marks the nearest foe).
- Balance: in 240 drafted runs with the look-ahead player, main wins 88 and this release 85. The new clades together win about as often as the old (37% against 36%); the red fox ran highest, so Go to Ground no longer heals and Line Up gives +1 instead of +1 to +2. `node tools/sim.js 120 runs` moves 47 → 55 (look-ahead) and 22 → 27 (heuristic), but half its squads are drafted from a longer clade list, so they are different squads; the paired drafted runs above are the like-for-like test.

## 2.48.0 — 2026-11-16 — a trait taken twice: 1 UP, and it counts

Garrett: "lets also consider the right number on upgrading from a second card, so another card and more upgrade power result in comparable win rates".

- **Fix.** In 2.42, the points already on a card counted against the points bound to it. So a trait that held points gained few or none of them when taken a second time: Stalk at P 2, taken again for 3, gained 1. Bound points now keep their own count (`hero.bound[id] = [n, spent]`). They add to what is on the card, are spent there first, and still never go to another card.
- **A second pick is worth 1 UP** (`RULES.DOUBLE_UP` 2 → 1). Over whole runs, 1 UP wins about as often as taking a different card, and 2 UP clearly more (look-ahead 48 / 58 / 68 runs of 120 for card / 1 / 2; heuristic 85 / 88 / 102 of 400). Within single missions no value could be told apart (`tools/double-up.js`, new). Numbers in `docs/reference/BALANCE.md`.
- Saves go to version 16; a 2.47 save keeps its bound points, counted as on the card the way 2.42 counted them (fixture `save-2.47.json`).

## 2.47.0 — 2026-11-16 — the cats

Garrett: "cats are going to share many of those 9 traits, but hyperspeed (travel exactly 4 spaces) should be unique to a cheetah."

The second branch of the tree: five painted cats, each with nine traits.

- **Eurasian Lynx, Caracal, Ocelot, Tiger and Cheetah.**
- **Six cat traits:**
  - Pounce, Stalk, Killing Bite and Land on Your Feet are carried by every cat.
  - Retractable Claws and Night Eyes are carried by every cat except the cheetah, whose claws never sheathe.
- **Tufted Ears** is shared by the lynx and the caracal.
- **Traits of each cat's own:**
  - lynx: Snowshoe Paws and Snow Ghost
  - caracal: Sky Swat and Vertical Leap
  - ocelot: Rosette Cloak, Headfirst Descent and Night Prowl
  - tiger: Roar, Strong Swimmer and Stripes
  - cheetah: five, among them **Hyperspeed**, a run of exactly 4 that passes foes
- **An exact run.** A move can require that its destination be exactly that many steps away, by its shortest walk (`exact` on `move`; `T.reachableWalk(m, h, n, ignoreFoes, exact)`).
- **A run toward a foe goes its full length.** A move `toward` a foe with n steps now walks up to n steps and stops beside the foe; before, it always took one step. Pounce uses this. The mandrill's Bowl Over already said "charge 2" and now does.
- Each cat has a voice in the passages between stops.
- Tests for both movement changes.

Audit: 272 faces, 0 narrow (Throat Bite became a strike plus a finishing bite after the first pass flagged it), 0 hard-counter candidates, 0 collapsed gate cells. Simulation, `node tools/sim.js 40`, before and after the cats (on 2.43): heuristic run wins 5/40 → 7/40, mission win 72% → 73%; look-ahead 14/40 → 12/40, 83% → 83%. Within noise.

## 2.46.0 — 2026-11-16 — Survey, a second mission that is not a fight

The next non-combat mission from the plan for two-player runs (`docs/design/03-missions.md`), aimed at turns where one move is clearly best.

- **Survey — Before Nightfall.** Survey marks lie across the whole board, two more than you need, with at least one in every column past the start. Tag 4/5/6 of them (+ the tide) before night falls (6/6/5 rounds, less the tide's round). To tag a mark you stand on it and Interact.
- **A mark takes 2 AP or one die of its element.** Each mark is Mass, Charge, Space or Time, shown by its colour, and Omni counts. So a rolled element always has a use, and spending it on a mark or a card is a real choice.
- **Veiled marks.** Half the marks, the farthest first, start veiled (a ringed ! on the board). A veiled mark can't be tagged until a pilot stands within 1 of it or a reveal reaches it, which gives information verbs real work. A few foes wander between the marks, and a lurker joins from tier 2.
- **On the route** it takes Cascade's place in the middle row (tier 2). Cascade still opens the run.
- The look-ahead player sees both ways to pay. The heuristic heads for the nearest mark its partner is not nearer to, so the two split the board.
- **Balance** (`node tools/sim.js 80 runs`, main → 2.46.0): heuristic 18 → 17, look-ahead 32 → 33. Survey cells over 40 missions, heuristic / look-ahead: t1 100/100%, t2 80/100%, t3 33/90%.
- **Dull turns** (`node tools/turns.js 10`): Survey t1/t2/t3 31/24/35%, against 38/42/31% for the Cascade it replaces at tier 2. It started at 43% at tier 2 when marks took AP only and could be tagged from beside them.
- No mission needs an ability: squads with no cards at all win Survey 100% at tier 1 and 94% at tier 2 (`ABILITY_AUDIT.md`).

## 2.45.0 — 2026-11-16 — canon from play: defining moments

A step of design 06: when something dramatic happens to a pilot, the game says what happened and asks what it meant.

- **At the end of a mission**, above the question about the place, the panel names one moment that happened to a pilot whose painting a hero wears and asks about it, in the same shape as other questions: the facts from play, a question, three openings. ("… went down on the Quarry, and … got them back on their feet. What does … owe … now?")
- **Five kinds, most dramatic first** (`T.CANON_MOMENTS`): went down and stayed down; went down and was rallied; should have gone down and did not (a seeded return or a second wind); won on 3 vitality or less; won without taking a hit. They are read from the finished mission alone (`T.canonMoments(m)`, from its effects list), so nothing new is saved.
- Answers are proposals about the pilot (`pilot:<callsign>`, `where: mission:moment`), with the kind and the result in their context.
- Design 06 ties each moment to a small permanent change on a trait card. That is left out: these moments change no rules, dice or missions.

## 2.44.0 — 2026-11-16 — canon from play: questions to embellish

Garrett: "more canon is better, but guide them into an interesting question where they can provide details on the details you provide. make them feel like they are embellishing. more than ad lib, less than a blank canvas."

- **Every question now has three parts**: a **detail** the game already shows (from the atlas's field notes), a **question** about it, and three **openings**, the first words of an answer for the player to carry on ("It is ground down and…"). Picking an opening puts it in the box; it never overwrites words the player wrote. Answers may also start from nothing. Nothing in a question is new canon: each detail restates its page.
- **After every mission**, the mission-over panel asks one question about the page it was played on ("While the dust settles"). 27 questions, three for each of the nine places. A question answered on this device is not asked again until its place's others have been.
- **At the draft**, the question about the Cosmic Shore pilot whose painting the hero wears takes the same shape: the nine pilots whose world is an atlas page get their own question first ("Who taught Brikon to carry it alone…?"), then five every pilot shares, filled with their name and clades. It replaces the "why do they guide?" choices of 2.20.
- Optional as before: _Send_ on the panel, or _Continue_ sends what was typed; turning questions off under Canon hides them. What is typed survives the screen redrawing. Answers carry the question and detail they answer (`prompt`, `shown`).
- No rules, dice or missions change.

## 2.43.0 — 2026-11-16 — the primates

Garrett: "every pilot is 1/3 human but other primates might have some of the same abilities as humans."

The first branch of the tree: three primates painted on Cosmic Shore pilots join as clades, each with nine traits. Traits are written once for the branch they belong to (`src/data/clades.js`, plan in `docs/design/11-clades.md`).

- **Orangutan, Ring-Tailed Lemur and Mandrill.** Each carries Human's Opposable Grip, plus other Human traits: the orangutan has Theory of Mind and Tool Use, the lemur and the mandrill Cooperative Instinct, the mandrill Pattern Recognition. A pilot who is human and orangutan holds Tool Use once, and taking it again gives 2 UP bound to it (2.42).
- **Three primate traits.** Grooming (every primate: heal an ally and cleanse both; ethereal, both heal and hold Shield 1), Canopy Leap (the climbers: a climb that sets up a strike; ethereal, a leap with a shield for you and a neighbour) and Troop Call (the troop-livers: rally and empower an ally; ethereal, the whole squad hits harder and holds Shield 1).
- **Four traits of each one's own**, so no primate is another with a new name: the orangutan's Long Reach, Leaf Shelter, Patient Study and Fruit Memory; the lemur's Sun Salute, Stink Fight, Scent Mark and Tail Signal; the mandrill's War Paint, Fang Yawn, Cheek Pouches and Ground Charge.
- Each has a voice in the passages between stops.
- A test holds the rule that every clade has a trait no clade on its branch carries.

Audit: 228 faces, 0 narrow (two reveal faces were given a second use before merging), 0 hard-counter candidates, 0 collapsed gate cells. Simulation, `node tools/sim.js 40`, before and after: heuristic run wins 7/40 → 5/40, mission win 74% → 72%; look-ahead 13/40 → 14/40, 84% → 83%. Within noise; nothing got easier.

## 2.42.0 — 2026-11-16 — traits shared across clades

Garrett: "as you work your way up the taxonomical structure then you share traits", and "a peregrine falcon cheetah that pick both only has one card but picking it a second time converts to upgrade points for either the physical or ethereal upgrades but only for that card. it is the only way for it to appear a second time as well."

The first step towards a bloodline for every animal on a Cosmic Shore pilot: the rule that lets one trait belong to several clades.

- **A trait can belong to several clades** (`card.clades`, `T.shareTrait`, `T.cardsOf`). It counts toward whichever of the hero's clades has room under the three-per-clade cap (`T.cladeSlots`, `T.cladeCount`).
- **Taken twice, it becomes upgrade points.** A hero whose two clades share a trait holds it once. It can be offered once more (in a pack, a reward or an event), and taking it gives 2 UP bound to that card (`RULES.DOUBLE_UP`, `hero.bound`): spent on its P or E before any free point, never elsewhere. The card says so before you take it, and shows what is still bound. In the opening draft such a pick does not use up one of the six cards.
- Saves go to version 15 (`hero.bound`); a 2.41 save loads with nothing bound.
- No trait is shared yet, so nothing plays differently today. The bloodlines that use it come next.

## 2.41.0 — 2026-11-15 — dice like dice, abilities like cards

Garrett, on 2.40: "the abilities should look like cards that dice shoud look like dice", and "the dice should look like the 20 sided dice that they are and the 12 sides should look 12 sided, etc."

- **Dice in their real shapes.** A banked die is drawn as its polyhedron. The plain die is a d20, an icosahedron seen down a corner: a hexagon with the front face in the middle. An element's die is a d8, an octahedron. The ethereal die is a d12, a dodecahedron seen face on: a decagon round a pentagon. The face the die shows sits in the middle, in its etherion's colour (AP shows its number). The roll tray uses the same shapes (`U.DIE_SHAPE`, `U.dieSVG`). Each die lies a little turned, the same way every time it is drawn. The tooltip still names the Channel an etherion is on its own.
- **Abilities as cards.** Each ability in the hand is a card framed in its etherion's colour. At the top is art showing what its two faces do: the Physical side in steel on the left and the Ethereal side in its colour on the right, each face's verb drawn large, over the silhouette of the clade it comes from (`U.cardArt`, verb pictures from `U.verbIconKey`). The Ethereal side dims until the card is awakened. Each face button carries its picture. The large trait cards in the draft and rewards show the same art.
- No rule or balance changes.

## 2.40.0 — 2026-11-15 — dice like a hand of cards

Garrett: "The typed text under the end round is black on dark. very hard to read. lets steadily upgrade the look. start with the dice. the omni could use the symbol from cosmic shore. it could also animate 4 d20s rolling at the end of your turn. it could feel more like a hand of cards with art depicting the actions."

- **Readable story line.** The text you type under End Round was drawn in the page's background colour. It is now the light text colour.
- **Dice as a hand of cards.** Each banked die is a small card: its face's symbol in the corner, the action it pays for as its picture (AP shows its number; Mass shows Strike and Shove, Charge Arc and Reach, Space Scramble, Time Brace, taken from the Channel basic actions; Omni shows "Any"), a caption, and its size (20, 8 or 12). The hand fans gently, overlaps a little once it holds more than seven, and a card lifts on hover. The tooltip names the Channels too.
- **Cosmic Shore's Omni symbol.** Omni is drawn as Cosmic Shore's omnicrystal (`OmniCrystal_Active.png`, MIT), redrawn as an SVG path, wherever an etherion symbol is shown, including the dice key.
- **The roll, shown.** When a round begins (and when dice are rerolled), each pilot's new dice tumble across a tray at the foot of the board in their own shapes (a d20, an element's d8, the ethereal d12), flicker through faces they could show and land one by one on the rolled faces, with a knock as the last one lands. Then each is dealt into the hand. The roll effect now says each die's kind and where it was banked (`kinds`, `at`). The effects queue is not saved, so saves do not change. Reduced-motion settings skip the tumbling.
- No rule or balance changes.

## 2.39.0 — 2026-11-15 — a purse each

Garrett, after a two-player playtest: "the money that we spend in the shop. we should each have our own. we should have our own buttons instead of looking like we can upgrade or buy things for each other." He chose a purse per player, with one player keeping one purse.

- **A purse per player.** Two players keep their omnicrystals apart (`run.purses`). A solo run keeps one purse and plays exactly as before.
  - The starting 6 ◇ are shared out when the route opens: 3 each.
  - A pilot buys gear and consumables, sells gear, and fuels its gear in a mission from its own player's purse. A skipped trait and Deep Pockets pay their own player. A finishing blow's salvage goes to whoever struck it.
  - What the squad earns together (a mission's crystals, an event's) is shared out evenly; the odd crystal goes to the emptier purse.
  - What the squad pays together (the haven's full repair, an event's price) comes from the fuller purse first. The audit halves every purse.
- **Your own buttons.** Each screen offers only its own pilot's Buy, Sell and Train buttons, and its own trait and boon choices. The partner's upgrade shows "… is choosing" until it is done. Both purses are shown, named, with this screen's own marked in gold. The mission's top bar shows them as one pill (yours in bold).
- **Saves.** `T.SAVE_VERSION` is 14. An older save's crystals are shared out among its players, and so are a mission's and an open reward's (fixture `save-2.38.json`).
- No change for one player: the simulators play solo, and `node tools/sim.js 40` gives the same tables as before.

## 2.38.0 — 2026-11-15 — the objective answers back

Garrett, after a two-player playtest: "we need more juice when you get objectives so you know you are doing the right things."

- **When the objective moves forward, the board says so.**
  - A gold card names what was done: a seal breaks, the winch turns, the valve turns, the beacon holds, not this one (a decoy cache), the real cache, a crate lifted or brought home. It has a bar that fills from where the objective was to where it is now.
  - Gold rings go out from where it happened, with a rising chime (a longer one when the objective is complete).
  - The objective's pill in the top bar pulses, and it now fills with gold as the objective comes along.
  - This works for every kind of objective, because it compares `T.objectiveProgress` before and after each update. It answers a partner's progress online as well, and the beacon counted at the end of a round. Hits on a kill target are not announced, because the hit already shows.
- **What will count, shown beforehand.**
  - Interact glows gold whenever it can be used: it is always the objective's own action.
  - A card, basic action or gear ability that would move the objective gets a gold ◎. Like the ✦ hints, this is worked out on a copy (`T.imagine`).
  - Hovering it adds "◎ moves the objective forward" to the line above the board.
- No rule or balance changes. Nothing here writes to the mission (a test checks it).

## 2.37.0 — 2026-11-15 — faster clicks, and a screen that folds

Garrett, after a two-player playtest: "the interface should be more dynamic, collapsible, and use space better. it should also update faster when selections are made."

- **Folding.** The mission screen folds away what you are not using:
  - The pilot not selected folds to its vitality, states and dice, with a line saying how many of its cards are playable. It sits above the selected pilot, so both are in view without scrolling. Click it to select it, or "Show cards" to open its hand without selecting it.
  - The log folds to its last two lines (▾ opens it).
  - The enemy intents fold to the forecast; the intents are still drawn on the board.
  - A long objective folds to two lines; click it to read it all.
  - An empty cooldown track is not drawn. The place, clock, hour, round and crystal pills share two rows, so the top bar stays on one line at 1280 px.
  - The log, intents and objective choices are kept in this browser (`localStorage` key `tumult_v2_ui`). At 1280×800 the board is about 40% taller (568 px instead of 408).
- **Faster.**
  - The top bar, side panel and log are redrawn only when what they show has changed, so hover and focus survive a click.
  - The ✦ combo hints (2.35) are worked out just after the click has been drawn, not before.
  - Online, a guest's command is carried out on the guest's own screen at once, then sent to the host. The engine is deterministic, so the host gets the same result. The host's state still wins: each state it writes is taken as it comes, and commands it has not reached yet are played again on top. A command the guest's screen refuses is not sent, and the reason shows at once.
  - The host no longer writes the game after keystrokes in a text box.
- No rule or balance changes.

## 2.36.0 — 2026-11-15 — the same player goes first every round

Garrett, after a two-player playtest: "we should not switch who goes first because it is confusing to take two turns in a row and it defeats the purpose of rolling at the end of the turn and thinking about your turn ahead of time if you have to take another turn with new information immediately."

- **Turn order is fixed.** Seat 0 (the host) goes first in every round, then seat 1, then the foes. The lead no longer swaps, so a player never ends one round's turn and starts the next round's straight away. Each player can plan their next turn while the others play. `T.turnSeat` changes; a player whose pilots are all down is still skipped.
- One player, or the simulators: no change (turns apply only with two players).

## 2.35.0 — 2026-11-14 — combos you can see

Garrett: "I want these character to feel like they have fun toys that can be played with in interesting and expressive ways. they should combine to create emergent effects."

- **✦ on plays the world adds to.** After every action, each play you could make is tried on a copy of the mission (`T.imagine`) against each target it could pick, and against up to ten of the nodes it could pick. If the world would add to it, its button gets a gold ✦, and the ✦'s tooltip says what. Things the world adds:
  - The engine's own narration: a body slamming down under heavy gravity, a guard broken.
  - Setups paid off: a Mark or Exposed spent, an Empower used.
- **What it adds, in the preview.** The "Would:" line above the board now ends with what the world adds (✦) and the catches (⚠): a foe that holds fast against a shove, a blow that finds an afterimage, one that passes through a foe in Stasis or is fully blunted. A play that only meets a catch still shows its line. States a play would spend or break are struck through.
- Partner combos come out of this as well: once Kess Marks a foe, Cavitt's hits on it carry a ✦ that says the Mark will be spent.
- Nothing is guessed. Every ✦ comes from the exact result on a copy, and looking never changes the mission (a test checks it).
- No rule or balance changes.

## 2.34.0 — 2026-11-14 — the hour, the wind, and the board answering back

Garrett: "Get everything polished and more pleasant to play. think animations, effect, sound … bring that world to life."

- **The hour-long day** (`docs/LORE.md`: "A day lasts about an hour. Night is never far away, and never long."). Each round is about ten minutes, so six rounds make a day: dawn, morning, noon, afternoon, dusk, night. The light washes over the painting under the board, which stays readable at night, and the top bar names the hour. Where in the day a mission starts follows from its seed. Nothing in play reads the time of day.
- **Weather on the board.** Wind is drawn as gusts blowing toward the edge it pushes to, and fog drifts low.
- **The Terminal's readout.** As a round begins, a line types in at the top of the board. Round 1 gives the guide log: the place, its pull (uphill or downhill), the weather and the hour. After that, each round gives the round, the hour, and what is left on the clock.
- **The board answers.**
  - A card played rings its pilot in its etherion's colour.
  - A hit flashes the token and bursts, and a shield flares cyan.
  - A fall collapses, a heal glows, and a decoy, zone or trap set out marks its node.
  - A state gained floats up, coloured by its keyword.
- **Sound.** The small synth grew (still WebAudio, no files, no network).
  - Dice rattle, blows thump, and shields ring.
  - Forced moves whoosh, falls drop, and turns chime.
  - Each etherion has its own voice: Mass deep, Charge buzzing, Space airy, Time a bell.
  - A windy place has a very quiet wind under it, which stops when you leave the board or turn sound off.
- **Built for all players.** All of it lives in `src/ui/feel.js` and `feel.css`. It reads the mission and its effects queue and never writes to them (a test checks this). Reduced-motion settings turn off the gusts, the flashes and the type-in.
- No rule or balance changes.

## 2.33.0 — 2026-11-14 — the route, painted

Garrett: "make the ladder up the rogue like adventure look better and more representative of the artwork."

- **Legs.**
  - Each leg lies over its painting, which is now plain to see (the road is dimmed where it runs, not the whole picture).
  - Each leg is headed _Leg I · by land_, then its name, then a line from that ground's guides, written from `docs/LORE.md`: ground that deforms and is rebuilt, windbreaks, the constant wind, uphill and downhill.
  - The finale is headed by what the threat looks like, over its own ground, and breathes rose.
  - A leg you have finished fades to sepia.
- **Stops.**
  - Each stop on a board is a roundel painted with its atlas page's plate, with the kind of stop as a seal in the corner.
  - Each stop is labelled with the place's name, its kind, its tier and its pull: ▲ heavy (uphill) or ▼ light (downhill), in g.
  - Hovering a stop shows the place's painting, its gravity, what it is like, and what the stop asks of you.
  - Havens and events keep their marks and say what they offer.
- **The road.**
  - The road taken is lit gold, the next choices glow and flow, and the roads ahead are dotted.
  - Stops you passed by fade, and stops more than two rows ahead are dimmed, though still readable for planning.
  - Your two pilots stand beside the stop where you last stopped, and before the first stop at the foot of the route, _setting out_.
- **Behind the scenes.** A painting shown many times is written into the page once, as a class (`U.artClass`), never repeated in the markup or in tooltips. On a phone, the leg titles shrink to a line and the stops use the whole width.
- No rule or balance changes.

## 2.32.0 — 2026-11-14 — a line of story for any turn

Garrett: "have players able to add story fluff to any one of their turns in a box next to the end turn button."

- **The story box.** It sits under End turn. In your own turn, write a line about what the turn looked like, as the pilot you have selected. Press Enter or just end your turn, and it is kept. Each pilot gets one line per round: writing again replaces it, and clearing the box takes it back.
- **Where it goes.**
  - The mission's log shows it in your pilot's name.
  - The passage after the stop tells it again, in your pilot's words and before the clades' own lines.
  - The record at the end of the run closes with the last mission's lines.
  - Copy save carries all of it.
  - It is not sent to the canon inbox: it is the table's story, not a correction to the setting.
- **Rules.** `T.addNote(m, hero, text)` keeps `{ r, who: 'note', hero, text }` in the mission's log. The text is trimmed, cut to 200 characters, and always shown as text, never as markup. A line changes nothing in play, and a test checks that a run plays the same with or without lines. It is also a command (`op: 'note'`), so online each player writes for their own pilot, in their own turn.
- **Saves.** Version 13. Each mission in the run's history keeps its `notes`. A 2.30 save loads with none (fixture `save-2.30.json`).
- No balance changes.

## 2.31.0 — 2026-11-14 — words explain themselves, plays preview on the board

Garrett: "make things interactive so any question the player has is answered intuitively by the interface. e.g. hovering over weaken explains what that does with a tooltip and that word indicates that visually to the player before they do so."

- **Keywords.** A new `src/ui/keywords.js` lists the game's words of art, from Weak, Anchor, Root, Mark, Hidden, Locate and Expose through Shield, Thorns, Stasis, Hover, Empower, Pre-empt, Counter and Pierce, Push, Pull, Melee, Lane, Zone and Burst, to Reveal, Mint, Decoy, Trap, Hazard, Height, Heal and Slow. Each has an icon, a tone (helps you, hurts you, or neutral) and one sentence of rule. Card text, foe intents, the log and place rules draw them as chips; hovering a chip shows its sentence. A card's tooltip lists the words it uses with their sentences.
- **Badges.** Tokens on the board wear the same icons for the states they hold, with a count where a state runs out, instead of emoji.
- **Previews.** Hovering a playable card face, basic action or gear ability plays it on `T.imagine(m)` for every target it could pick and draws the difference on the board: a ring on each unit it would reach, damage and healing numbers, a ghost where a unit would be moved, the states it would gain, and a "Would:" line above the board. In target mode, hovering a token or node previews just that choice. The mission itself is never touched (a test checks that it is unchanged).
- The playtest note about Leg up now describes 2.30's rule.
- No rule or balance changes.

## 2.30.0 — 2026-11-14 — partner moves are decided by the player who gives them

Garrett: "do a strong pass in ensuring that duo powers are something that the controlling player can treat as deterministic … if they have to wait for another player to make a movement decision for some movement they gave them then the rest of their turn is not something they can determine in their planning."

- **The `rally` verb moves your partner now, to a node you choose.** It no longer hands them free steps for later. It uses new targets `ally_move` and `ally_adj_move`, which list the nodes your partner can reach, including staying put. Leg up (basic, 2 nodes, partner beside you), Call (Language, 1 + P), Cue (Swarm Pheromone, 1) and the Beacon gear (2) all work this way.
- Every other duet power was already settled at play time. Spot marks a foe, Lend gives AP, and the rest of the ally buffs are fixed numbers. A test checks that every power that moves a partner names its node.
- **Balance** (`node tools/sim.js 40`, before → after):
  - Heuristic: unchanged (7/40 runs).
  - Look-ahead: runs 14 → 13 of 40, missions 81% → 84%. The gain is in salvage t2 and t3 (95 → 98%, 88 → 93%), about two missions each at this sample size. The Heart is 43% → 38%.
  - The shared evaluation no longer counts free steps, since a partner never holds any now.

## 2.29.1 — 2026-11-14 — layout fixes and ways back

Garrett: "Fix the formatting issues and add back buttons where possible."

- **Cards fit.** A face's cost and cooldown wrap onto their own line instead of running past the card's edge, a long bloodline name wraps under the card's name, and on the board a face you cannot play gives its reason on a second line. The reward screen's Take buttons line up under their cards.
- **The board.** Zone names sit below the names of spaces and tokens' health, with a dark outline, so they no longer print over each other.
- **Ways back.**
  - The draft's first step leads back to the title, or for the second pilot back to the first pilot as it was left.
  - The packs lead back to the bloodlines.
  - Spending Upgrade Points leads back to choosing how to build.
  - The route, missions, rewards, havens and events all have a Title button. The run is saved, and Continue resumes it where it was left. Online, that button reads _Leave game_.
- No rule changes.

## 2.29.0 — dice kinds and four dice a turn

Garrett's original dice (`docs/design/10-dice.md`), aimed at turns with nothing to decide. A pilot's dice now follow its kit.

- **The plain die is a d20:** Mass, Charge, Space, Time and Omni once each, AP on the other 15 sides. No AP×2: the game has variance enough.
- **Special dice.** Each awakened card, and each Affinity boon, swaps one plain die for a d8 of its element: four sides its element, one each of the other three and Omni, no AP. Omni Core swaps one for an ethereal d12, two of each symbol. A pilot who wakes more cards rolls more etherions and fewer AP, mostly in the colours its own cards need: the mage path. Every pilot still has 15 dice.
- **Four dice a turn** (was 3), drawn at random from the pool. A banked die keeps its kind; a spent one goes back.
- **Cosmic Shore's element symbols:** Mass is a triangle, Charge a cut gem, Space a kite, Time a tall diamond, traced from Cosmic Shore's element petals so Froglet's Hypersea games share one set. A special die shows its size in the corner, the pool's tip lists its dice by kind, and a key to the symbols sits under the selected pilot's dice.
- **Retune, so main does not get easier:** every foe has 130% of its listed vitality; the Heart's tier-3 base is 86 (was 78); the steady wind asks 1 more of every objective and starts every clock but a hold's 1 round shorter, from tier 1, and the Gale keeps its lead from tier 2; a Salvage takes at most one extra crate from any tide.
- **Balance:** `node tools/sim.js 80 runs`, main → 2.29.0: heuristic 15 → 17, look-ahead 39 → 33, so a little harder for a careful squad. Without the retune four dice gave 40 and 54. Tables in `docs/reference/BALANCE.md`.
- **Dull turns** (`node tools/turns.js 10`): **41% → 34%**. Turns with nothing worth doing fell from 14% to 8%. Stronger Channels were tried and left out: they let plain play catch up with careful play.
- **Save version 12:** a banked die has a kind (`heldDie`). A die banked in an older save is plain (fixture `save-2.28.json`).
- `node tools/turns.js` takes `--rule NAME=VALUE`, as `tools/sim.js` does. The recipe test also tries every face against foes one hit from going down.

## 2.28.0 — 2026-11-14 — duet moves: pilots help each other

Step 5 of the two-player plan: basic actions that one pilot does for the other, so each turn can be planned around your partner. No card is needed, and each is one sentence at the table.

- **Spot** (2 AP): mark a foe up to 3 nodes away; the next hit on it, by anyone, deals +2.
- **Leg up** (1 AP): an adjacent ally may move 2 nodes for free this round.
- **Lend** (2 AP): give an adjacent ally 2 AP to spend this round. Lent after their turn, it is lost.
- Both simulated players can use them. The shared evaluation now counts a Marked foe as 2 hp weaker and a free move as kept dice; without that the look-ahead player never set anything up for its partner (`docs/reference/PLAYERS.md`).
- **Retune, so main does not get easier:** Spot at 1 AP made careful squads clearly stronger (full runs 19 → 23 of 40, the finale 65 → 80%). Spot costs 2 AP, and the Heart has 78 vitality at tier 3 (was 72).
- **Balance:** `node tools/sim.js 80 runs`, main → 2.28.0: heuristic 13 → 15, look-ahead 41 → 39 of 80. `node tools/sim.js 40`: full runs heuristic 4 → 4, look-ahead 19 → 20 of 40; finale heuristic 40 → 30%, look-ahead 65 → 63%; Vault tiers fall for the look-ahead player (98/98/95 → 93/88/90%), other cells within a few points (`docs/reference/BALANCE.md`).
- **Dull turns:** unchanged (`node tools/turns.js 10`: 41% before and after, idle 14%, forced 27%). The duet moves give careful squads a better line more than they give every turn a choice: a turn with 3 AP and one sensible move stays forced. That needs a bigger lever (more AP or dice a turn, or a tier 1 that presses harder), which is a design question, not a tuning one.

## 2.27.0 — 2026-11-14 — Salvage, a mission that is not a fight

Step 4 of the two-player plan, and the first of the design's mission types won without destroying anything (`docs/design/03-missions.md`).

- **Salvage — Before the Tide.** One more crate than you need lies on the far side (columns C–E). Carry 2, 3 or 4 of them (by tier) to the near edge, where you came in, before the water takes the wreck (8/7/7 rounds). Interact beside a crate to pick it up. Each pilot carries one at a time, and a crate is set down the moment its carrier stands on the near edge, however they got there: a walk, a blink, a shove or the wind. A carrier who goes down drops it where they fall. Scavengers stand among the crates, and the water spreads from the far edge after a round's grace. The Gale adds a crate, a shorter clock and an escort, as for the other objectives.
- **Two routes, no single family:** walk round the scavengers or through them, shorten carries with any Space verb or Scramble, hold the water with Time verbs or the Windbreak Charm, and use the wind when it blows your way. Fighting is one way through, never the objective.
- **On the route:** Salvage replaces one Swarm in row 1 and one Cascade in row 5. A privateer toll can make it an Elite, like the others.
- Both simulated players can play it. The look-ahead player plans each pilot's way to a crate or to the near edge. The heuristic carries a crate home even with a foe beside it.
- **Save version 11:** a hero has `carrying`. Nobody in an older save is carrying (fixture `save-2.26.json`).
- **Balance (`node tools/sim.js 40`):** Salvage 98/68/38% heuristic and 100/98/98% look-ahead by tier, so the gap grows with the tier, as in the Vault (thinking pays). Full runs: heuristic 7 → 4 of 40, look-ahead 19 → 19 of 40, so the game got harder for the weak player and no easier for anyone. Other cells are unchanged.
- **Dull turns:** about the same as the other objective missions (47% for salvage across tiers). A new kind of mission adds variety; making turns less dull for both players is the job of the next step, moves that pilots make together.

## 2.26.0 — 2026-11-14 — gravity and weather are rules of the place

Step 3 of the two-player plan: the place is an opponent too, so the same squad plays a different game on a different page. Each rule is one sentence, and each works on foes and pilots alike.

- **Light gravity** (0.5 g or less: Mast-Crop Hills, Floating Meadows, Burrowed Sea Cliff): anything shoved or pulled goes 1 space further.
- **Heavy gravity** (3 g or more: Crystal Quarry, High Pass Halt): anything shoved or pulled takes 1 damage for each space it is moved.
- **Wind:** at the end of every round every unit moves 1 space downwind (toward E or toward A), if a path leads there and the space is free. A shield, an anchor or a hover holds you; the Heart stands. It blows before hazards.
- **Fog:** a ranged strike reaches only units within 2 steps, even in its zone.
- Each page lists the weathers a visit may bring (`skies`), and each mission draws one from a stream of its own, so a seed's board is unchanged. The top bar shows today's rules with the rule in its tip, the forecast shows where the wind will put everyone, the log opens with them, and the atlas spread lists them under _Rules of this place_.
- **Save version 10:** the mission keeps its `place` and its board its `fog`. A mission under way in an older save keeps normal gravity and calm air (fixture `save-2.24.json`).
- **Balance (`node tools/sim.js 40`, before → after):** a little harder, never easier. Full runs: heuristic 9 → 7 of 40, look-ahead 21 → 19 of 40. Single missions within a few points everywhere; the heuristic loses a little more at tier 3 (swarm 93 → 83%, cascade 90 → 85%), the look-ahead player wins tier-3 elites 95 → 98% and the finale 60 → 65% (heuristic 35 → 40%).
- **Dull turns (`node tools/turns.js 10`):** 41% → 39%. Light gravity and wind give Mass and Brace more to do, but most dull turns are still at tier 1; the missions that are not fights (next step) are aimed there.
- The test that the look-ahead player beats the heuristic now plays 16 squads a cell, not 8: with 8, one unlucky finale moved its gap by several points.

## 2.25.0 — 2026-11-14 — measure whether every turn is a decision

Step 2 of the two-player plan: a baseline for "both players have interesting decisions every turn".

- **`T.turnChoices(m, hero)`** (`src/engine/lookahead.js`) says what one hero's turn offers from here: _idle_ (nothing is worth 3 points over doing nothing), _forced_ (one clear best outcome) or _open_ (two or more different outcomes close to the best). It works on an imagined copy and changes nothing.
- **`node tools/turns.js 10`** plays every archetype and tier with the look-ahead player and reports idle, forced and open turns, and dull turns for each pilot. Baseline: 13% idle, 28% forced, 59% open, so about 41% of turns are dull. The worst are tier 1, elites (69%) and vaults (61%). `docs/reference/PLAYERS.md` has the table.
- No change to play.

## 2.24.0 — 2026-11-14 — every pilot gets an upgrade

Garrett: "both players should always get an upgrade." The first step of the two-player plan (2026-11-14).

- **A trait for every hero.** After a won mission each hero is offered three cards of their own, drawn from the traits that hero can take, and no card is offered to both. Each takes one or skips for +2 ◇. Before, the squad shared one pick of one card.
- **A boon for every hero** after an elite: each picks one of their own two.
- **With two players, each chooses for their own pilot**, on one screen or two: _Skip_ is now a pilot's choice, not the host's, and goes through `T.execCommand` like _Take_. _Continue_ waits until every pilot has chosen.
- **Save version 9:** the reward keeps one offer per hero (`offers`, `boons`, and a `picked` / `boonPicked` flag each). A version-8 save on the reward screen offers its one trait and boon to each hero (fixture `save-2.22.json`).
- **Balance:** within noise. Full runs, `node tools/sim.js 40`: heuristic 8 → 9 of 40, look-ahead 21 → 21 of 40; 80 heuristic runs: 20 → 21. Single missions are unchanged (their kits are fixed). The simulated players take the first card offered, so a person who chooses well may gain more than this shows; watch it in playtests.

## 2.23.0 — 2026-11-14 — two players take turns; online join says why it fails

Garrett: "the multiplayer didn't work. nothing happened they didn't connect. the players should take turns."

- **Turns.** With two players, a mission's hero phase is played one player at a time. The player whose turn it is flies their own pilot and presses _End turn_, the other player then does the same, and the enemy turn comes once both are done. The first player alternates each round: seat (round − 1) mod players goes first. A player whose pilots are all down is skipped. `T.turnSeat(run)` decides, and `T.execCommand` refuses a command, or an end of turn, from a player whose turn it is not. This applies on one shared screen and online alike. It is tracked in `party.ready`, so the save shape does not change. It only restricts the order of actions and changes no rules or numbers, so difficulty can only hold or rise.
- **Why the join failed.** A partner who opened the test page from its share link holds view access, and view access can never write to the page's store, so their join failed with no message. The title now checks `user.can('data.write')` and, when it is false, explains that the partner needs an email invite as Editor or a Contributor seat in the organization. Store errors when hosting, joining or sending are shown instead of swallowed. Online games move to a separate invite-only page.

## 2.22.0 — 2026-11-13 — canon from play: the storyteller pack

Step 3 of 4. What the lore lead approves becomes a resource for AI storytellers, and public canon is kept in this repository as well.

- **`node tools/canon-pack.js records.jsonl`** writes `dist/canon/tumult-storyteller.md` and `tumult-canon.jsonl` from the game and the approved records (the inbox's _Copy canon_). In order of authority: the rules a story must respect (numbers taken from `T.RULES`), the world (`docs/LORE.md`), every atlas place, Cosmic Shore pilot and foe with its approved canon beneath it (a correction names the text it replaces), other canon, and what is off limits. `--proposals` adds undecided notes, labelled as ideas to offer, never facts. Rejected notes never appear. The pack can hold private canon, so it stays under `dist/` and is never committed.
- **`--public`** keeps `docs/canon/public.jsonl`: canon the lore lead marked public, a redundant copy in git (Garrett, 2026-11-13). A record no longer public canon leaves it on the next run.
- No change to play.

## 2.21.0 — 2026-11-13 — canon from play: the lore lead's inbox

Step 2 of 4. On the test page, canon notes leave the device and reach a private inbox, where the lore lead decides on each one.

- **Sent as written.** Every ✎ correction and draft answer is written to the test page's store (`canon/<viewer>/notes/<id>`); notes written while the store was not answering go when it does. _Canon_ on the title says how many have been sent.
- **The inbox** (Canon → _Open the inbox_, for the page's owner and editors): every note with who sent it, what they were shown and where, filtered by proposed, canon, rejected or all. The owner, as lore lead, marks each _canon_, _rejected_ or _keep proposed_, edits its wording, and ticks **public** for what may be copied into this repository (Garrett, 2026-11-13); decisions are kept in `canonReview/<id>`. _Copy canon_ gives the approved notes as JSON lines with the decisions applied.
- **Who reads what:** a tester writes and reads only their own notes; editors and the owner read all of them; only the owner decides. The test page is published with these store rules (`docs/reference/CANON.md`).
- `TUMULT.html` is unchanged: with no store, notes stay on the device and are copied by hand. No rules, dice or missions change.

## 2.20.0 — 2026-11-13 — canon from play: correct what the game shows

Garrett: "the web experience asks us for flavor through the experience. then this gets recorded into the lore … steer the details of the world by correcting what is presented." This is the first of four steps (plan agreed with Garrett, 2026-11-13).

- **Correct this.** A small ✎ sits beside the atlas's rules of a place, its blurb, weather and field notes; the pilot named on the title screen; every foe's flavour in the Codex; and every event's text. A player picks _That's wrong_, _Add a detail_ or _Love this_ and writes a line.
- **One question at the draft:** why does the Cosmic Shore pilot whose painting this hero wears guide? Three answers are offered (a rotation of `T.CANON_HOOKS`), or the player writes their own; it is optional, and can be turned off.
- **Each answer is a canon record** (`src/engine/canon.js`): plain data with what was shown, where, the build, page and mission, starting _proposed_ and _private_. Garrett is the lore lead: only he makes a record canon, and only records he marks public are ever copied into this repository. Records are kept on the device (`tumult_v2_canon`, newest 500), apart from any run, so the save is unchanged.
- **Canon** on the title screen lists them, turns the questions on or off, and copies them as JSON lines. The test page will send them to a private inbox in the next step.
- No rules, dice or missions change: the simulation is untouched.

## 2.19.0 — 2026-11-13 — the atlas: every mission on a page of Tumult

Garrett: "the physical copy should have a book of these with each page a different location … the book of maps becomes an atlas for tumult." Every mission is now played on a fixed board from a page of the atlas.

- **Nine pages**, three for each ground: Crystal Quarry, Mast-Crop Hills, Barricaded Market (land); Tidal Wreck Flats, Drowned Hamlet, Kelp Lagoon (sea); Floating Meadows, High Pass Halt, Burrowed Sea Cliff (air). Each grows from a Cosmic Shore pilot scene, whose painting is its plate. Places are kinds, not named spots, so a page can stand for a different place each session (Garrett).
- **One fixed board per page** (Garrett: "Choose A"), with its own shape: terraces joined by ramps, a threshing ring, a barricaded street, a ring of floats round a lagoon, rafts joined by single paths. Zones follow the place (a raft, a terrace, a ledge), some spaces sit in two, and some pages add high ground or a hazard (X1).
- **Spaces have names**, A1 to E3: the letter is how far from where you arrive, the number the side. Every mission places its starts, foes and objectives by name, so each of the six missions works on every page. A mission's own ledge is L1.
- **The Atlas screen** (title and every header): the contents by ground, and each place as a spread: the board on the left page; facing it, _Rules of this place_ (what its paths and special spaces do) and _Field notes_ (gravity, weather, what it is, ecology, life there, who comes from such places). In a mission, the place's name in the top bar opens its page, and the board sits over the place's painting.
- **On the route**, each stop is given a page of its leg's ground (stream `atlas`), not the page of a stop that leads to it while the ground has another; the route's tips name the place.
- **Gravity and weather are printed but have no rules yet**: that is 2.20.
- **Difficulty (harder, not easier):** `node tools/sim.js 40`, before → after. Heuristic 13 → 8 runs of 40, missions 79% → 74%; look-ahead 22 → 21 runs, missions 90% → 88%. The finale is the main change: Heart win rate 43% → 35% (heuristic) and 78% → 60% (look-ahead), and 15.7 → 18.2 rounds; on its own it ranges by page from 50% (High Pass Halt) to 100% (Tidal Wreck Flats) for the look-ahead player. The Thinning Swarm at tier 3 got easier for the heuristic (63% → 93%) and Elite tier 1 too (80% → 93%), on boards with more room. The ability audit has no narrow faces and no collapsed gate cells.
- **Saves:** version 8 adds `page` to route stops and the mission, and space labels to a page board. A version-7 save's stops draw a page when played and a mission in progress keeps its grid (fixture `save-2.18.json`).
- `T.launchMission(run, type, tier, pageId)` takes a page; `tools/mission-log.js` prints the place and space names. Reference: `docs/reference/ATLAS.md`.

## 2.18.0 — 2026-11-13 — zones instead of lanes

Garrett: "move away from lanes as vertical columns of nodes", toward boards with the spatial variety of Unmatched. This is the first step of the atlas plan: the rule a board of any shape needs.

- **Zones.** Every node sits in one or more coloured zones, and two units that share a zone are in range of a ranged strike, at any distance. A node in two zones reaches both. Every card, foe and piece of gear that said _lane_ now says _zone_ (`zone_all`, `foe_zone_all`, `area: 'zone'`); Hidden and Located work as before.
- **On today's boards each column is one zone**, so play is unchanged: the full simulation (`node tools/sim.js 40`, both players) and six narrated missions are byte-identical before and after. Heuristic 13/40 runs, look-ahead 22/40, as before.
- **Drawn as regions.** Each zone is one soft region whatever its shape (a disc at each node, joined along the shortest tree between them), named under its lowest node; a node's outer ring shows an arc for each of its zones. New muted colours (Slate, Sand, Plum, Sage, Clay, Ash) so a zone is never mistaken for an etherion or a domain.
- **Saves:** version 7 replaces a board node's `lane` with `zones`. A version-6 save's lane becomes a zone of the same name (fixture `save-2.17.json`).

## 2.17.0 — 2026-11-13 — a different expedition each time

Garrett: "it should have a different feel and adventure each time." Each run now draws its own expedition from its seed.

- **Who sent you.** A Jade appointment (light a dark beacon, bring a lost party home), a Ruby venture (be the first to finish the route, chart the new ground) or a Gold contract (a salvage claim, an escort). The opening passage carries the brief, and the route is headed with it.
- **What waits at the end.** Six threats: the Drowned Engine, the Standing Storm, the Quarry Hive, the Hollow Beacon, the Choking Reef, the Wind Knot. The finale is the Heart by its rules, its stats and its board; only its name and its words change ("Heart of the Standing Storm"). The route, the summary and the passages say what it is.
- **Three legs in a new order.** Land, sea and air, each under one of four names and over one of its own paintings; the last leg crosses the threat's own ground. A new leg's passage shows that leg's painting.
- **Events fit the ground.** Each event happens on two of the three grounds (a sunken cache at sea or on land, never in the air), and every ground has eight, so each event comes up as often as before.
- **Difficulty:** full runs, 80 squads, before → after: look-ahead 41 → 44 wins, heuristic 22 → 27; heuristic alone over 400 runs 108 → 117 (27% → 29%), within the noise of which events a run meets. No rules, foes or missions changed.
- **Saves:** version 6 adds `run.story.expedition`. A version-5 save has none: its route keeps its names and its finale is the Heart (fixture `save-2.16.json`). The expedition draws from a stream of its own (`expedition`).
- Names are generic on purpose: no canon places or people (`docs/LORE.md`).

## 2.16.0 — 2026-11-13 — an expedition on Tumult

Garrett chose the frame: each run is an expedition on Tumult, set down from an Ark, with the Terminal narrating. This step changes only words; the rules, ids and saves are untouched.

- **One setting throughout.** The skiff, the HyperSea tide-run and the Consolidation are gone from every screen, mission, foe, event and log line. The title reads _An expedition on Tumult_; _New Tide_ is _New Expedition_; the Tide Map is _the route_, and its three legs are _the Lowland Reach_, _the Open Sea_ and _the High Air_ (land, sea and air, as Tumult's guide services run). The Heart stays the end of the route.
- **Difficulty is weather now:** _Steady wind_ (was Rising tide) and _Gale_ (was Flood tide). Same rules, same ids (`rising`, `flood`), so a saved choice carries over.
- Renamed to match: Storm Lantern, Windbreak Charm, Etherion-touched, Call the Swarm, The Heart's Envoy, Quiet Hour; three mission titles (The Thinning Swarm, What the Wind Buried, Floodgate).
- The interface still says _hero_ and _bloodline_; those become _pilot_ and _clade_ together with the code, in roadmap milestone C1.
- A saved run keeps the leg names it was made with.

## 2.15.0 — 2026-11-13 — between the stops

Garrett: "there should be some more storytelling in between." After every stop the run now writes a short passage, and the run keeps them as its log.

- **A passage after every stop**, shown above the route until you read on: a painting, one or two lines of the Terminal's log (an interface, never a character), and a short exchange between your two pilots about what just happened: a clean win, a close call (the one who came off worst speaks), a loss, a night at a haven, an event, a new leg of the route, the last approach.
- **Each clade has a voice.** Eleven sets of lines (`T.VOICES`, `src/data/story.js`) about temperament, not lore: the jerboa never stands still, the tardigrade did not notice the fight, the octopus is holding three things that were not theirs. Playing a pilot should tell you who they are (pillar 2). A line said in the last few passages is not said again yet.
- **The log of the run** is on the summary screen: every passage, in order.
- **Saves:** version 5 adds `run.story`; an older save starts its log empty (fixture `save-2.14.json`). Each mission's history entry also keeps the foe that mattered, whether it was close, and who was hurt worst.
- **No rules change.** The story draws from its own stream (`story`); a test plays the same run with and without it and gets the same result, so the simulators are unaffected.
- With two players, each screen reads on at its own pace.

## 2.14.0 — 2026-11-13 — drawn, not typed

Garrett: "increase the fidelity across the board; it should feel like it is in our universe the whole time." The first of four steps (fidelity, setting, story between encounters, a different expedition each run). This one changes only what you see.

- **Drawn icons instead of emoji.** Every foe, mission kind, event, boon, piece of gear, consumable, basic action, clade, objective and etherion now has a pictogram drawn in Cosmic Shore's icon language: flat filled silhouettes, angular, one colour that the interface tints. Dice show their etherion's mark. `src/ui/icons.js`; a key with no drawing falls back to its emoji, so nothing goes blank. The data keeps its emoji for text.
- **The route is a chart.** The Tide Map draws each stop as a medallion and the currents between them as curves: the road taken lit gold, the next choices flowing, each leg over a dimmed painting of its ground, the Heart at the top.
- **Events and havens are illustrated.** A painting of life on Tumult beside the words, chosen for the event's mood.
- **Thirty more pilots.** Cosmic Shore's crew beyond the callsigns (portraits from their busts, scenes from their paintings): fifty clade pairs painted in all, the pool future events and stories draw their people from.
- **Build:** scenes are WebP now; the file grows from 2 MB to about 3.4 MB and still makes no network requests.
- No rules or save change; the simulators are unaffected (the engine is untouched).

## 2.13.0 — 2026-11-13 — play online

The second step of multiplayer: two players on two screens, in one game, on the test page.

- **Host and join.** On the test page's title screen, _Play online_: one player hosts and gets a four-letter code, the other joins with it. The host starts the tide when both are there. Each player drafts their own pilot at the same time; the map opens when both are done.
- **One game, held by the host.** The host's screen carries out every change and writes the whole state to the page's shared store; the guest's screen shows it and sends its own commands, which the host carries out in the order they come. A screen that reloads or joins late is caught up by the next state. `src/ui/net.js`.
- **Commands.** Everything a player does to the run now goes through `T.execCommand` (`src/engine/party.js`): a card face, a walk, a basic action, gear, an item, the round's Ready, a draft pick joining the squad, training, rewards and shopping. On one screen it runs at once, as before; online, on the host's. The host refuses a command for another player's pilot.
- **Only the test page has it** (the playtest build, through claude.ai's shared store). `TUMULT.html` still makes no network requests and is unchanged. The partner needs edit access to the page (an organization member at Contributor, or an outside person invited by email as Editor).
- **No rules change**; the simulators are unaffected. Tests: two pages in jsdom sharing a stand-in store draft, walk and ready up in one game and end with the same state (`test/net.test.js`); a command does what the direct call does (`test/party.test.js`).
- Not yet: the guest does not see the enemy turn animate, only its result; a host who closes the page ends the game for both (the host can carry on alone from Continue).

## 2.12.0 — 2026-11-13 — two players

Garrett: "now let's make it multiplayer." The first step: players and seats, which every way of playing together needs. Playing from two screens over the network comes next, on the test page.

- **Players.** The title screen picks Solo or 2 players (kept like the tide). With two, each player drafts and flies one pilot, and their name is on that pilot's draft, panel and party card. Today they pass one screen.
- **Seats.** Each hero belongs to one player; seat 0, the host, makes the squad's shared choices (the route, rewards to skip, havens, events). A screen that holds only some seats acts only for their pilots; one that holds all (solo, or a passed screen) acts for everyone, as before. `src/engine/party.js` (rules), `src/ui/party.js` (who may click what).
- **Ready.** A round ends when every player is ready. On one screen, End Round readies everyone at once, so nothing changes; from separate screens the button reads _Ready 1/2_ until the last player presses it.
- **Saves:** version 4 adds `run.party`; an older save loads with one player (fixture `save-2.11.json`).
- **No rules change.** Two players meet exactly the squad, missions and dice one player does; a test holds a run to the same result whatever the number of players. The simulators are unaffected.

## 2.11.0 — 2026-11-13 — the Cosmic Shore look

Garrett: a graphical overhaul inspired by Cosmic Shore, whose pilots are Tumult's heroes and who just got new artwork.

- **Pilot art follows the clade pair.** Twenty of Cosmic Shore's painted pilots (their portraits and their scenes) ship inside the build. A hero is shown with the painting of their own two clades when one exists, else the nearest stand-in that shares a clade (the head clade first), else their clades' marks; no two heroes in a squad share a face. Every pair is meant to be supported in the end, with Tumult and Cosmic Shore sharing the art as either paints a new one (Garrett, 2026-11-13). `src/ui/pilots.js`; how to add one: `assets/README.md`.
- **Where it shows:** a pilot in their world behind the title, a new one each tide; a scene banner and portrait on every pre-made hero; the portrait in the draft, the party bar and each hero's panel; portraits on the board's hero tokens; the lead pilot's scene faint under the board.
- **The look:** Chakra Petch (Cosmic Shore's display face, SIL OFL) for headings and buttons, a deep-sea plate with a faint survey grid, chamfered HUD panels with a lit edge, quieter lanes. Etherion colours are untouched. `src/ui/theme.css`, loaded after `style.css`.
- **Build:** `tools/build.mjs` inlines `assets/` as data URIs (manifest `art`), so the game is still one file that makes no network requests; it grows from about 0.4 MB to 2 MB. A missing picture falls back to drawn art. A test holds every painting to having both pictures and every pre-made hero to having a face.
- **Fix:** the channelled Shove and Scramble texts now match what they do (1 node; Scramble steps 1).
- No rules change; the simulators are unaffected.

## 2.10.0 — 2026-11-13 — a crystal is an action

Garrett, after a playtest: a hero loaded with elemental crystals and no AP, or no card that could use them, had nothing to do with them. "We want elements to be the exciting rolls, not dead weight." He chose, from three ways to do it, to make a crystal an action on its own.

- **Channel costs no AP.** A banked etherion (or Omni) is spent on its own for a basic action of its colour: Mass — Strike an adjacent foe for 2 or Shove it 1 node; Charge — **Arc** (new) 1 damage into a foe up to 3 nodes away, or Reach an objective 2 nodes away (still 1 AP, was 2); Space — Scramble 1 node, up or down a ledge; Time — Brace (Shield 1) and slide your track 1 extra. Was: 2 AP (Strike 4, Shove 2, Reach) or 1 AP (Scramble, Brace) plus the etherion.
- Every crystal, at level 0, with no AP and no awakened card, now opens something; a test holds it (`test/engine.test.js`).
- The heuristic player channels Mass and Charge into blows and Time into Brace when threatened.
- **The Heart is harder, to pay for it:** 50/61/72 vitality (was 32/38/44), and once it cracks the Vault drowns in four rounds (was seven). Free crystals alone took the careful simulated player from 22 runs of 40 to 38; Garrett asked for the difficulty back in the same change.
- **Balance:** full runs, rising tide: look-ahead 22 → 19 of 40, heuristic 6 → 8; flood tide: look-ahead 13 → 18, heuristic 5 → 5. (`docs/reference/BALANCE.md`, v2.10.0). Squads with no cards still cannot beat the Heart, as before; free crystals alone had briefly let them (31%).
- **Audit:** unchanged (168 staples, 30 tools, 0 narrow), except that its look-ahead baseline on the tougher Heart is now too low to judge the Heart for gates.

## 2.9.0 — 2026-11-12 — no narrow faces left

Plan phase 4, second group of roadmap S2. The audit's last seven narrow faces each gain a small effect that matters in any mission; what they already did is unchanged.

| Face              | Card                                | Now also                         |
| ----------------- | ----------------------------------- | -------------------------------- |
| Deflect (Eth)     | Counterbalance Tail (Jerboa)        | Shield E (at least 1) this round |
| Blend             | Chromatic Cloak (Octopus)           | Shield 1                         |
| Ink               | Ink Screen (Octopus)                | foes adjacent to you Weakened 1  |
| Gills             | External Gills (Axolotl)            | heal 1 (2 at P 2+)               |
| Enzymes (Eth)     | Carnivorous Digestion (Flytrap)     | heal 1 + E now                   |
| Cilia Field (Eth) | Trigger-Hair Sense (Flytrap)        | foes adjacent now Weakened 1     |
| Endure            | Extremophile Traversal (Tardigrade) | Shield 1 (2 at P 2+) this round  |

- **Audit:** narrow faces 7 → 0 (168 staples, 30 tools); still no hard-counter candidates or collapsed gate cells. Endure left the never-played list; Vanish (Chromatic Cloak's Ethereal face) joined it.
- **Balance:** the look-ahead player is unchanged (22 runs of 40). The heuristic falls from 9 runs to 6, and from 65% to 53% on the tier-3 Swarm: it plays any face with a Shield or a Weaken when threatened, so it now spends turns on Blend and Ink that it used to spend on blows. That is the weak player's blind spot, not a harder game (`docs/reference/BALANCE.md`, v2.9.0).

## 2.8.0 — 2026-11-12 — sensing faces earn their slot

Plan phase 4, the first group of roadmap S2: the audit's narrow faces. Each of the seven Physical faces that only revealed now also does a small thing that matters in any mission. Its reveal is unchanged.

| Face      | Card                         | Now also                                      |
| --------- | ---------------------------- | --------------------------------------------- |
| Spot      | Pattern Recognition (Human)  | your next strike this turn deals +1           |
| Feel      | Vibrissae Sense (Jerboa)     | Shield 1                                      |
| Listen    | Sound Mapping (Barn Owl)     | one free step                                 |
| Flick     | Scent Tongue (Gecko)         | Marks the nearest foe (+2 on the next hit)    |
| Feel Flow | Lateral Line (Axolotl)       | the next hit on you is −1                     |
| Sense     | Electroreception (Eel)       | 1 true damage to the nearest foe in your lane |
| Hairs     | Trigger-Hair Sense (Flytrap) | adjacent foes Weakened 1                      |

- **Audit:** narrow faces 14 → 7; staples 154 → 161; still no hard-counter candidates or collapsed gate cells. The look-ahead player now plays Feel, which it never did before; it still never plays Listen or Flick, and Spot is still played almost only in the hidden-cache mission. Two faces joined the never-played list (Burrowing's Dig and Paralytic Bite's Ethereal face), most likely sampling noise from the changed play; the next S2 group looks at them.
- **Balance:** next to nothing moves (`node tools/sim.js 40`; full runs: heuristic 9/40, look-ahead 22/40, as in 2.7.0). Tables in `docs/reference/BALANCE.md`.

## 2.7.0 — 2026-11-12 — the Flood tide (a harder difficulty)

Plan phase 3, the difficulty retune. Measuring it showed that one setting cannot serve both difficulty targets (BALANCE.md, v2.7.0), so this adds a second difficulty and leaves the first alone.

- **Added:** a difficulty for each run, `T.TIDES` in `world.js`: **Rising tide** (the game as before) and **Flood tide**. On a flood tide, from tier 2, every objective needs 1 more (tier 3: 2 more), every clock except a hold's starts 1 round shorter (2), swarms grow 1 larger (2), and elites bring 1 more escort (2). Tier 1 and the Heart are never changed. A rule a table can apply by hand.
- **Added:** the title screen picks the difficulty (remembered on the device); the map shows a pill on a flood tide. Objective texts state their counts (`Interact ×3`).
- **Changed:** mission generators take the tide as a third argument; `run.tide` is part of a run. Saves go to version 3: an older save loads on the rising tide (fixture `test/fixtures/save-2.6.json`, a version-2 save in the middle of a mission).
- **Added:** `node tools/sim.js 40 --tide flood`, `node tools/ui-drive.js 2 --manual --flood`. Tests: the flood asks exactly its rule's extra from tier 2 on and leaves tier 1 and the boss alone; a version-2 save migrates and plays on; the UI fuzz run plays a flood tide picked on the title screen (98 tests in all).
- **Balance:** the rising tide is unchanged, number for number. On the flood tide the look-ahead player wins 14 runs of 40 (22 on the rising tide) and the heuristic 2 (9). Tables in `docs/reference/BALANCE.md`.

## 2.6.0 — 2026-11-12 — Channel: no die is ever dead

The second slice of roadmap S1 (design/02), accepted into the core by Garrett.

- **Added:** Channel. Spend one banked etherion, or an Omni, with a basic action to do more:
  - Mass: Strike for 4, or Shove 2 nodes.
  - Charge: **Reach**, an Interact up to 2 nodes away (2 AP; not up a ledge from below).
  - Space: **Scramble**, 1 node to any free node, up or down a ledge included (1 AP).
  - Time: Brace, plus 1 extra track slide.

  Every etherion now has somewhere to go. Each channelled action is its own entry in `T.BASIC` (`el` names its etherion) and uses existing verbs. It is deliberately weaker than any Ethereal face of the same colour.

- **Changed:** a channelled button appears beside the basic actions only while its etherion is banked. The heuristic channels Mass into Strike when it can; the look-ahead player weighs every channelled action. How to Play explains Channel.
- **Changed:** a hero stuck on a ledge can Scramble down with a Space die.
- **Added:** a test that Channel pays its etherion or an Omni, refuses without one, and that every etherion has a channelled action (96 tests in all).
- **Balance:** this makes the game easier. The heuristic now wins the tier-1 Elite 90% of the time (was 80%), and the look-ahead player wins the Heart 78% (was 68%) and 22 runs of 40 (was 19). Card-less squads now win the tier-2 Vault 88% of the time in the audit (was 31%); the Heart is still 0% without cards. Tables are in `docs/reference/BALANCE.md`. The difficulty retune after S1 has to absorb this.

## 2.5.0 — 2026-11-12 — basic actions

The first slice of roadmap S1. Garrett accepted basic actions into the core rules (handoff decision 3).

- **Added:** every hero can **Strike** an adjacent foe for 2 (2 AP), **Brace** for Shield 1 until their next turn (1 AP) and **Shove** an adjacent foe 1 node (2 AP), with or without cards. They use the same verbs as cards, cost AP only, never go on the track and can be taken as often as AP allows. They are data (`T.BASIC` in `src/data/world.js`), with `T.canUseBasic` and `T.useBasic`, and buttons under each hero's hand. How to Play explains them.
- **Changed:** both simulated players use them. The look-ahead player gets them as legal actions (`{ t: 'basic', basic, target? }`). The heuristic strikes an adjacent foe it can hurt when no card is worth playing, and braces against a telegraphed hit of 4 or more.
- **Changed:** the ability audit's last row now plays squads with basic actions only. Card-less squads win every tier-1 mission type at least 63% of the time, where Elite was 19% before. The Heart is still 0% without cards.
- **Added:** tests for basic actions (paid in AP only, never on the track, refused without AP or a target). The recipe tests cover `T.BASIC`, and the interface fuzz run clicks the buttons (95 tests in all).
- **Balance:** `node tools/sim.js 40` before and after is in `docs/reference/BALANCE.md`. No cell moves beyond noise.

## 2.4.2 — 2026-11-12 — interface tests stop waiting

No rule changed, and nothing a player sees.

- **Changed:** the interface tests and `tools/ui-drive.js` no longer sleep a fixed second at the end of every mission; they set the pause before the mission-over modal (`T.UI.MISSION_OVER_DELAY`, 900 ms for a person) to 0 and wait until the modal is there. The run driven by autoplay went from about 8 s to 3 s, the clicking fuzz run from 9 s to 7 s, and `npm test` from about 25 s to 21 s on four cores.

## 2.4.1 — 2026-11-12 — generators are engine code

No rule changed; narrated missions and the simulator's tables are byte-identical before and after.

- **Changed:** the board generators, the mission archetypes and the Tide Map moved from `src/data/world.js` to `src/engine/generators.js`, where they are formatted and tested like the rest of the engine. `world.js` keeps the data tables (design/09 §5).
- **Added:** a test that every card face, gear ability and consumable names a verb and a targeting flow the engine knows, so a typo in a recipe fails a test instead of quietly doing nothing in play (93 tests in all).

## 2.4.0 — 2026-11-12 — Ethereal faces must be awakened

Garrett settled the last open rule from the handoff (decision 4): an Ethereal face is magic that must be awakened, and every hero starts with a few awakened.

- **Changed:** an Ethereal face cannot be played until its card has E 1 (`T.RULES.ETHEREAL_MIN_E` is now 1; it was 0). In a mission its button says "needs E 1".
- **Added:** every hero sets out with at least two cards awakened (`T.RULES.START_AWAKE`). The pre-made heroes already have two or three. A drafted hero's first two E points go to its strongest signatures, paid from the starting six UP; the player can move them, and Confirm tops the count back up to two if UP is left. `T.awaken(h)` and `T.awakenedCount(h)`.
- **Changed:** in the draft and in Train, an asleep Ethereal face is dashed and shows what it will do at E 1.
- **Changed:** the playtest panel's switch now offers the rule as shipped (E 1) and the old one (E 0). A choice stored by an older build is ignored, since it was only ever the old default.
- **Changed:** the ability audit counts an Ethereal face as held only while it is awake.
- **Added:** a test that every pre-made and drafted hero sets out with at least two cards awakened, paid from the starting UP (92 tests in all).
- **Balance:** `node tools/sim.js 40` before and after, both players, in `docs/reference/BALANCE.md`. No cell moved more than the noise at 40 missions (about fifteen points); whole runs 8 → 9 of 40 for the heuristic, 20 → 17 for the look-ahead player.

## 2.3.0 — 2026-11-12 — what happens if I end the round now?

The first slice of roadmap P1: the forecast, as text. No rule changed.

- **Added:** under the enemy intents, a line that says what ending the round as things stand will do: what each hero takes or mends, how many foes fall, whether the objective advances, whether the mission ends. Each hero's vitality shows where it is heading (`26/26 → 20`), and the hint bar says what stopping now costs the selected hero.
- **Changed:** that replaces the hint bar's "N foes targeting you (X dmg)", which added up declared numbers whether or not the foe could reach. The forecast plays the declared enemy turn out on a copy: a foe that cannot reach does not count; shields, hazards and wearing-down effects do. Nothing in an enemy turn is random, so it is exact.
- **Added:** `T.forecast(m)`, tested against what really happens at the end of 60-odd rounds across every mission type.
- **Not yet:** the forecast's ghosts on the board (where each mover ends up), and the rest of P1 — the layout, the roster rail, the hand as cards.

## 2.2.0 — 2026-11-12 — a second player, who reads the board

Roadmap milestone F2. No rule changed. The game gained a better instrument for measuring itself, and the first thing it measured is that the game is too easy. `docs/reference/PLAYERS.md` describes the player; `docs/reference/BALANCE.md` has the tables.

- **Added:** the look-ahead player (`src/engine/lookahead.js`). It knows no card by name: it lists every legal action, tries each on a copy of the mission, lets the declared enemy turn play out there, and keeps the line that scores best by one evaluation shared by every mission type. It looks four actions deep and one round ahead. The heuristic autoplayer stays, as the weak player.
- **Added:** actions as plain data — `T.legalActions`, `T.applyAction`, `T.describeAction`. A game is its seed and its list of actions: replaying the list gives the same game.
- **Added:** `T.imagine(m)`, the copy a planner, a preview or a hint must work on. It holds nothing a person at the table could not know: no dice to come, and no knowledge of which cache is the real one.
- **Added:** `T.objectiveProgress(m)`, 0 to 1 for every kind of mission, and `T.finishRound(m)`, the first half of ending the squad's phase.
- **Changed:** `node tools/sim.js` plays every mission with both players and prints the gap between them — how much a mission rewards thinking. It takes about 75 seconds at 40; `--player weak` is the old one-second table.
- **Changed:** the ability audit is played by the look-ahead player, on up to four cores, in about a minute. Its "cannot evaluate" list is empty (it was 67 faces); instead it lists the faces that player held and never chose.
- **Added:** the playtest build has **Plan** in a mission's top bar: what the look-ahead player would do with the turn, and a button to play it.
- **Added:** 7 tests (90 in all): every playable face is offered with every way to resolve it; everything offered can be taken; planning changes nothing; the plan does not depend on dice to come or on where the real cache is; a game replays from its actions; the look-ahead player wins at least as often as the heuristic on every mission type.
- **Balance:** nothing was retuned, and the heuristic's numbers are unchanged. The new player's are the news: over 100 missions a cell it wins 95% against the heuristic's 77% — 88–100% of every mission but the Heart (66%), and 63 whole runs of 100 against 16. Tier 2 and tier 3 are well above their targets for a careful player, and missions last four to seven rounds against a target of 8 to 14.

## 2.1.0 — 2026-11-12 — a mission you can copy, save and resume

Roadmap milestone F1. No rule changed; what changed is how the game holds its state and where its random numbers come from. `docs/reference/STATE_AND_SAVES.md` describes all of it.

- **Added:** a mission in progress is saved. The game saves after every action; close the page in the middle of a round and **Continue** returns to that round — the same dice in hand, the same track, the same intents on the board. Before, a refresh sent you back to the map.
- **Changed:** a run and its mission are plain data: no functions, nothing held in two places. `T.clone(mission)` is a second mission that plays on exactly as the first would — tested on 1,000 missions, copied at a random point. This is what the look-ahead player, previews and undo will stand on.
- **Changed:** the board, the dice and the opposition each draw from a random stream of their own (as do squad building, the Tide Map, loot and events), and a stream is one number kept in the state. The same seed is the same board whoever plays it; rerolling a die no longer changes which reinforcements arrive; saving draws nothing. **A seed names a different mission than it did in 2.0.x.**
- **Changed:** saves carry a version (`T.SAVE_VERSION`, now 2) and older ones are migrated. A 2.0 save still loads and its Tide can be finished; `test/fixtures/save-2.0.json` keeps that true.
- **Fixed:** after loading a saved Tide, finished nodes are ticked on the map again. 2.0 kept every map node in two places, and a loaded save updated only one.
- **Fixed:** a Tide closed on the reward screen could not be continued: that screen read the finished mission, which a save never held, and failed to draw. What it shows is kept with the reward now.
- **Changed:** while a mission lasts, the squad's crystals and the once-a-run Second Wind are the mission's (`m.crystals`, `m.secondWindUsed`); `T.applyMissionResult` hands them back and lets the mission go (`run.mission` is `null` between missions). Each mission counts its own unit ids, so a resumed one cannot hand out an id twice; `T.spawnEnemy(m, …)` replaces `T.makeEnemy`.
- **Added:** the playtest report has **Copy save**: the Tide exactly as it stands, a mission in progress included. `node tools/mission-log.js --save <file>` carries on from that moment.
- **Changed:** `tools/sim.js` meets every mission type with the same squads (only the boards differ), and its simulated player draws from a stream of its own.
- **Added:** 11 tests (83 in all), among them the three that define F1: a copy plays on exactly as the original; the same seed is the same board for any squad; a run saved mid-round resumes exactly.
- **Balance:** the rules are the same and the dice are re-dealt, so every simulated number is a fresh sample. At 1,000 missions a cell no win rate moves beyond twice its standard error (largest move 3 points); whole runs are 22% won before and 23% after over 2,000. Tables in `docs/reference/BALANCE.md`.

## 2.0.3 — 2026-11-12 — a build to playtest with

The same game, built a second way for whoever is testing it. One more card now does what its text says; nothing else in the rules changed.

- **Added:** the playtest build — `npm run build:playtest` → `dist/TUMULT.playtest.html`, or `http://localhost:5173/?playtest` on the dev server. A panel on the title screen starts any mission at any tier with two pre-made heroes, their starting six cards or the kit for that tier, and a seed; switches `ETHEREAL_MIN_E` (decision 4 in `docs/HANDOFF.md`), mid-mission too; lists what to look at in the build; and keeps a log of finished missions on the device, with a report to copy. The ordinary build carries none of it.
- **Added:** `T.quickMission` starts a run inside one chosen mission. The panel and `tools/mission-log.js` both use it, so a seed names the same board and opening dice in either; `mission-log.js` takes a sixth argument, `start` or `tier`, for the kit. `T.addProgression` (the kit a squad would carry by a tier) moved from the test harness into the run layer.
- **Added:** `node tools/build.mjs --fragment` writes a build without the `<html>`, `<head>` and `<body>` wrapper, for a host page that supplies its own. Every build now knows its version (`T.BUILD`).
- **Fixed:** _Distributed Arms — Multitask_ frees the next card played **this turn**, as it says; the offer used to wait as long as it took. _Parallel_'s two still wait until they are spent. `freecast` takes `dur`.
- **Fixed:** no screen scrolls sideways at a phone's width: the Tide Map's nodes and the hand's cards share the row instead of overflowing it. The page is sized from its container rather than the viewport, so it sits properly inside a host page; a new screen starts at its top; a tooltip left by a tap goes when the page scrolls. The mission screen is still built for a mouse (roadmap P1).
- **Changed:** the interface has three optional extension points (`U.titleExtra`, `U.missionTopExtra`, `U.extraAct`), which is how the panel attaches without the game knowing about it.
- **Added:** 8 tests (72 in all): quick missions, the build variants, Multitask, and the panel driven through the real page.
- **Balance:** unchanged. `node tools/sim.js 40` prints the same tables, byte for byte, as 2.0.2.

## 2.0.2 — 2026-11-12 — the engine does what the text says

Roadmap milestone S0. A review at handoff listed eight places where card or boon text promised something the engine did not do. Seven are fixed, each test-first; the eighth is now a switch with the numbers for both settings, waiting on a decision. Tests written to keep the class from coming back found as many again, fixed here too.

- **Fixed:** a condition on an effect (`ifAnchored`, `ifOnHazard`, `ifAdjacent`, `ifE`, `ifHpBelow`) now gates it whatever its verb. _Talon Strike — Pin_ Weakens only prey left at 8 hp or less; _Radiotrophic Resilience — Thrive_ mints its AP only on a hazard.
- **Fixed:** _Hollow Bones — Weightless_ and _Neoteny — Reshape_ let a hero walk up to a ledge, as they always said.
- **Fixed:** an Anchored or Slowed Harrier cannot blink. A held Harrier still lances a hero beside it: before, a Counted Trap took its whole turn.
- **Fixed:** strike bonuses go to strikes. A corrosion tick, a snare or a zone no longer spends "your next strike" or gains a form's bonus; "this turn" bonuses (_Tool Use — Improvise_, _Silent Flight — Glide_) end with the turn; _Night Eyes — Thermal_ lasts its 1 + E rounds instead of one.
- **Fixed:** boons are wired by their `hook` and `val`, so the table is the truth. _Momentum_ works every round, not once a mission. _Quick Hands_ did nothing; it now brings round-1 cards home a column sooner. _Second Wind_'s text says what it does: its holder rises, not whoever falls first.
- **Fixed:** a Located Harrier cannot fade (it keeps its turn). The Warden's bestiary text no longer claims area damage beats its shield. A few telegraphs and tooltips corrected.
- **Fixed:** no recipe carries an option the engine ignores. `interact` honours `height`; `anyTerrain`, `los` on `force`, `kind` on `hazardImmune` and three no-ops are gone. _Current-Cling Anchor — Cling_ loses a round of hazard immunity its text never mentioned.
- **Added:** `T.RULES.ETHEREAL_MIN_E` — whether an Ethereal face can be played at E 0. Unchanged at 0; the choice is Garrett's (`docs/HANDOFF.md`, decision 4).
- **Added:** `node tools/sim.js … --rule NAME=VALUE` tries a rules constant for one run.
- **Added:** 24 tests (64 in all), among them one that fires every card face, gear ability and consumable in several situations and fails on any recipe option the engine ignores, and a suite that holds each of the fifteen boons to its text.
- **Balance:** small. Eleven of sixteen mission cells keep their win rate and none moves more than five points; see `docs/reference/BALANCE.md`.

## 2.0.1 — 2026-11-11 — moved into this repository

No rules changes. The v2.0 game was reorganised into `src/`, `tools/` and `test/` and given a build, a test suite and continuous integration.

- **Fixed:** the pre-made hero _Veil_ carried four Barn Owl cards, breaking the three-per-bloodline cap. _Binocular Foresight_ was replaced with _Burrowing_ (Jerboa). Found by the new data tests.
- **Fixed (text only):** the boss briefing and the log said the Vault drowns in six rounds and that area damage beats the Heart's shield; the engine gives seven rounds and its shield stops area. The text now says so.
- **Documented:** a review found several places where card or boon text promises something the engine does not do. They are listed as known issues in `docs/HANDOFF.md` and scheduled as roadmap milestone S0; none was changed here.
- **Added:** `npm test` (40 tests: data integrity, engine rules, every mission type, full runs with save round-trips, the build, and two whole runs driven through the real interface).
- **Added:** `npm run audit` → `docs/reference/ABILITY_AUDIT.md`, which measures the ability rules: staples, tools and narrow faces, gate checks, autoplayer usage.
- **Added:** `npm run catalog` → `docs/reference/CARDS.md`, generated from the card data.
- **Added:** zero-dependency build (`tools/build.mjs`) and dev server replacing the shell script; Prettier; GitHub Actions.
- **Changed:** engine, UI and tools reformatted with Prettier. Simulation output is byte-identical before and after.
- **Docs:** design pillars, roadmap, proposals for the next version, and the v1.0 design bundle (archived, unchanged).
- **Repository:** run like Cosmic Shore. Changes under `.github/` need a code owner's review; workflow actions are pinned to commit SHAs; `.gitignore` blocks credentials; `AGENTS.md` points every agent at `CLAUDE.md`; the README states the licence as Cosmic Shore does; commit messages follow Froglet's `type(scope): summary` rules.

## 2.0.0 — 2026-11-06 — the playable game

A roguelike run built on the v1.0 core: draft two heroes from eleven bloodlines, a seven-row branching map, six generated mission archetypes (Swarm, Vault, The Sought, Cascade, Elite, Boss), telegraphed enemy intents, twelve enemy types, 99 two-faced trait cards implemented as data, gear, boons, consumables, havens, events, saving, and a headless balance simulator. See `docs/reference/`.

## 1.0 — the design bundle

The core rules (15-die pool, six-column track, two-faced cards, the P/E grammar, no turn theft, no hard counters), the species trait catalog, a reference engine in Python and four interactive demos. Archived in `docs/archive/v1.0/`.
