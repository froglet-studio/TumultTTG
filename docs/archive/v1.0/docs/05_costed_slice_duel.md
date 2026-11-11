# Tumult — Costed Slice, Sample Character & Duel (v0.1)

*Companion to the trait catalog. This document turns three species into **fully-costed, multi-ability cards**, drafts one character from them, builds a deliberately opposite opponent, and plays a head-to-head **Unmatched-style duel** to feel how the economy actually moves — no GM, just two builds and the dice.*

---

## Costing conventions

**Resources per turn (starting character).** You roll **5 dice** from your 15-die spent pool at game start and at each turn's end. The base **d12** is AP-saturated (≈ 7 of 12 faces give AP, one face each for M/C/S/T, one omni). So a normal turn yields **~3–5 AP and ~1–2 etherions**. Etherions are *scarce spice*; AP is the *common tide*. Unspent dice **bank**, so saving a turn lets you afford one big play (~10 dice) instead of several small ones.

**Cost tiers (complexity scales with cost):**
- **Simple** — 1 AP. Fast, low cognitive load. The "many little things."
- **Medium** — 2–3 AP, *or* 1 AP + 1 etherion.
- **Spicy** — 3–5 AP + 1–2 etherions, or 2–3 etherions. The "one big thing"; usually needs banking. These are the encounter-definers the etherion scarcity pays for.

**Cooldown (CD)** is in **track columns** (max 6). Most cards have **no duration** → straight to cooldown. **Duration cards usually have little/no CD** — the duration *is* the balancing cost (it occupies the scarce one-per-column duration row). CD exists to give opponents a breather and stop a thing running forever; we tune it per card.

**No reactive defense.** You can't act on another player's turn. All "defense/counter" is **proactive**: a duration or **armed trigger** you set up on your turn that sits on your track and resolves automatically when its condition is met. You defend by *anticipating*.

**Combat is deterministic.** No to-hit rolls — damage is fixed by the ability; the *only* randomness is the end-of-turn replenishment roll. Mitigation comes only from **active durations**.

**Sim baselines (for the duel):** Vitality **15**. Board = **5 zones in a line** (1–2–3–4–5); adjacent = range 1. **Move 1 zone = 1 AP** unless a card moves you. Hand limit 6; starting characters have no deck.

**Card notation:** `◦ Ability — cost: effect. CD/Dur.` ✦ marks each card's primary etherion. ★ = signature trait.

---

# 0 · HUMAN  *(the fixed third — cerebral / social / economy)*

Human's edge in this bestiary is leverage, not weaponry: it leans **Time** (foresight, endurance) and **Charge** (the social current). Light on raw damage — which is the point. Several cards want *allies or summons* to shine, illustrating the utility-vs-combat trade honestly: weak in a vacuum, decisive when your build supplies its own bodies (octopus decoys, shrimp ambush, a sidekick).

**0.1 Theory of Mind** ✦Time ★ — *predict & pre-empt*
- ◦ Read — **1 AP**: place a **Read** mark on a foe (Dur 3). While marked: +1 to your actions vs it, +1 mitigation vs it. *CD 0.*
- ◦ Pre-empt — **2 AP + 1T**: spend a Read to arm a trigger — the marked foe's next attack on you is **reduced to 0** (Dur 2). *CD 2.*
- *Scaling:* P → Read bonus +1. E → Pre-empt also reflects 2 dmg / +1 target.

**0.2 Tool Use** ✦Space ★ — *improvise leverage*
- ◦ Improvise — **1 AP**: fashion a tool; +1 to one chosen action type until end of next turn. *CD 0.*
- ◦ Reach Rig — **2 AP + 1S**: your next melee/interact gains +1 zone range; pull yourself or a target 1 zone. *CD 1.*
- *Scaling:* P → tool bonus +1. E → reach/pull +1 zone.

**0.3 Persistence Endurance** ✦Time — *outlast (engine)*
- ◦ Pace — **1 AP**: ignore the next fatigue/slow/exhaustion effect (Dur 3). *CD 0.*
- ◦ Second Wind — **2 AP + 1T**: **standing engine** — recover **1 Vitality at the start of each of your turns** (Dur 4). *CD 2 after it ends.*
- *Scaling:* P → Pace also +1 move. E → heal +1/turn or Dur +1.

**0.4 Throwing Arm** ✦Mass — *the one natural ranged attack*
- ◦ Hurl — **1 AP**: ranged **2 dmg** at up to 2 zones. *CD 0.*
- ◦ Heavy Throw — **2 AP + 1M**: ranged **3 dmg** + knockback 1 zone (or prone), 2 zones. *CD 1.*
- *Scaling:* P → +1 dmg / +1 zone. E → knockback +1 / +1 dmg.

**0.5 Language** ✦Charge ★(minor) — *coordinate (needs bodies)*
- ◦ Call — **1 AP**: an ally/summon gets a free 1-zone move or +1 to its next action. *CD 0.*
- ◦ Rally — **2 AP + 1C**: aura — allies in 2 zones +1, foes −1 (Dur 3). *CD 1.*
- *Scaling:* P → +1 affected. E → radius/effect +1. *(Dead in a soloed 1v1; excellent with summons/sidekick.)*

**0.6 Pattern Recognition** ✦Space — *find the weak point*
- ◦ Spot — **1 AP**: reveal hidden traps/foes in your + adjacent zones; ignore concealment there this round. *CD 0.*
- ◦ Weak Point — **1 AP + 1S**: your next hit on a target **ignores all mitigation/armor**. *CD 2.*
- *Scaling:* P → +1 zone. E → also +2 dmg / lasts 2 hits.

**0.7 Opposable Grip** ✦Mass — *fine control & leverage*
- ◦ Manipulate — **1 AP**: pick locks/disarm devices; or disarm an adjacent foe's held item. *CD 0.*
- ◦ Leverage — **2 AP + 1M**: grapple/immobilize an adjacent foe (Dur 2) **or** wrench for **3 dmg**. *CD 1.*
- *Scaling:* P → +1 finesse/break. E → grapple deals 1/turn / +1 force.

**0.8 Cooperative Instinct** ✦Charge — *force-multiplier (needs bodies)*
- ◦ Assist — **1 AP**: your next ally/summon action vs a shared target +2. *CD 0.*
- ◦ Unity — **2 AP + 1C**: you + a summon/ally share one AP pool this turn (act as one). *CD 2.*
- *Scaling:* P → assist +1. E → +1 participant / +1 turn.

**0.9 Adaptive Generalist** ✦Time — *jack-of-all-trades*
- ◦ Improv — **1 AP**: attempt any action untrained, no penalty; once/turn. *CD 0.*
- ◦ Mimic Form — **2 AP + 1T**: replicate the cheapest version of any ability you've seen this scene, once. *CD 3.*
- *Scaling:* P → +1 use/turn. E → replicate at +1 tier.

---

# 4 · MIMIC OCTOPUS  *(trickster / utility — Space-Charge-Time)*

The juice test: almost no raw damage, yet **never categorically dwarfed**, because it owns *positioning, stealth, action-economy, and information* — higher-leverage axes than chip damage. Its big E-faces are scene-movers.

**4.1 Impersonation** ✦Space ★ — *be something else*
- ◦ Mimic — **2 AP**: copy a creature's look/movement; fool casual observers (Dur 3). *CD 0.*
- ◦ Become — **1 AP + 2S**: briefly take a seen form — use **one of its cheap abilities as if you had the card**, this turn. *CD 3.*
- *Best at:* flexing into whatever the moment needs. P → Dur/quality +1. E → borrow a pricier ability / 2 forms.

**4.2 Chromatic Cloak** ✦Charge ★ — *don't be hit*
- ◦ Blend — **1 AP**: **concealment** while you don't move (untargetable >1 zone; −2 to hit adjacent) (Dur 2). *CD 0.*
- ◦ Vanish — **1 AP + 2C**: **invisible 1 turn** (untargetable); next attack from stealth **+3 dmg**. *CD 3.*
- *Best at:* not being hit. P → Dur +1. E → move while invisible / +1 turn.

**4.3 Jet Propulsion** ✦Mass — *burst mobility*
- ◦ Jet — **1 AP**: move **2 zones**, any direction. *CD 0.*
- ◦ Recoil Slam — **2 AP + 1M**: dash 1 zone, **shove** an adjacent foe 2 zones (into wall/hazard = +2 dmg). *CD 1.*
- *Scaling:* P → +1 zone. E → shove +1 / carry an ally.

**4.4 Ink Screen** ✦Space — *deny the zoner*
- ◦ Ink — **1 AP**: haze your zone — blocks line-of-sight & ranged through it (Dur 2). *CD 1.*
- ◦ Smoke Step — **1 AP + 1S**: drop ink and teleport to any zone touching it. *CD 1.*
- *Best at:* shutting down ranged play. P → Dur/size +1. E → teleport +1 / leave a decoy.

**4.5 Boneless Squeeze** ✦Mass — *escape & soak*
- ◦ Squeeze — **1 AP**: instantly escape a grapple/restraint; fit through any gap. *CD 0.*
- ◦ Compress — **1 AP + 1M**: 1 turn, **halve physical damage** to you & can't be forced to move (Dur 1). *CD 2.*
- *Scaling:* P → also clear a condition. E → immune 1 hit / Dur +1.

**4.6 Distributed Arms** ✦Time ★(minor) — *do more per turn*
- ◦ Multitask — **2 AP**: take one extra **simple (1-AP)** action this turn. *CD 1.*
- ◦ Parallel — **2 AP + 2T**: resolve two of your card abilities as simultaneous — the second **doesn't trigger its cooldown** this turn. *CD 4.*
- *Best at:* action economy. P → +1 extra simple action. E → +1 parallel / refund 1 AP.

**4.7 Chemo-Suckers** ✦Charge — *track & sap*
- ◦ Taste — **1 AP**: ID substances/residue; detect a hidden adjacent creature. *CD 0.*
- ◦ Cling-Read — **1 AP + 1C**: tag an adjacent foe — you always know its zone & it can't gain concealment vs you; its next action −1 (Dur 4). *CD 0.*
- *Scaling:* P → +1 detail/range. E → also sap 1 AP / +1 target.

**4.8 Paralytic Bite** ✦Time — *steal a turn*
- ◦ Bite — **1 AP**: adjacent **2 dmg**; target −1 to its next action. *CD 0.*
- ◦ Neurotoxin — **2 AP + 2T**: adjacent target is **enervated next turn — each action it takes costs +1 AP** and it can't bank dice (Dur 1). It still acts fully; it just does less per AP. *CD 4.*
- *Scaling:* P → +1 dmg on Bite. E → enervate +1 turn / +1 target.

> **System invariant:** *No ability removes a whole turn.* The strongest control taxes efficiency (extra AP cost, −1/−2 penalties, movement-only immobilize), never agency. This holds even under cooldown/track manipulation — nothing may chain into an effective skip.

**4.9 Adaptive Intellect** ✦Charge — *snowball one foe*
- ◦ Study — **1 AP**: mark a foe — **+1 vs it for the rest of the fight, stacks** (Dur: fight). *CD 1.*
- ◦ Counter-Model — **2 AP + 1C**: arm a trigger — foe's next attack on you **−3 dmg** and you reposition 1 zone (Dur 2). *CD 2.*
- *Best at:* grinding a single rival. P → stack +1. E → reduce +2 / +1 use.

---

# S · PEACOCK MANTIS SHRIMP  *(burst brawler — Mass-Charge)*
*Odontodactylus scyllarus. The combative direction: raw kinetic violence, true-damage follow-through, the best eyes in nature, and enough mobility to land the punch. Ladder: species → Stomatopoda → Crustacea → Arthropoda.*

**S.1 Smasher Strike** ✦Mass ★ — *the bullet-fast club*
- ◦ Punch — **1 AP**: adjacent **3 dmg**, ignores 1 armor. *CD 0.*
- ◦ Ballistic Blow — **3 AP + 1M**: adjacent **6 dmg**, ignores **all** armor, knockback 1 zone. *CD 2.*
- *Best at:* raw single-target damage. P → +1 dmg. E → +2 dmg / cleave adjacent.

**S.2 Cavitation Bubble** ✦Charge ★ — *the collapse that can't be blocked*
- ◦ Shockwave — **1 AP + 1C**: after any Smasher hit (even a blocked one) this turn, **2 dmg ignoring ALL mitigation**. *CD 1.*
- ◦ Sonoluminescent Burst — **2 AP + 2C**: cone — **3 dmg ignoring mitigation** to all adjacent foes + blind (−2) (Dur 1). *CD 3.*
- *Best at:* damage nothing can reduce. P → +1 dmg. E → +1 dmg / +1 zone.

**S.3 Spearer Snag** ✦Space — *drag them back into range*
- ◦ Harpoon — **2 AP**: 2-zone ranged **3 dmg** + pull target 1 zone toward you. *CD 1.*
- ◦ Reel — **1 AP + 1S**: yank a target from up to 3 zones into melee (no dmg). *CD 1.*
- *Best at:* defeating a kiting zoner. P → +1 dmg/zone. E → pull +1 / also immobilize.

**S.4 Saddle Telson Armor** ✦Mass — *the shock-absorber shell*
- ◦ Brace — **1 AP**: reduce next physical hit by **3** (Dur 2). *CD 0.*
- ◦ Coil — **2 AP + 1M**: **standing armor** — reduce ALL incoming damage by **2** while active (Dur 3). *CD 1.*
- *Best at:* tanking. P → reduction +1. E → also reflect 1 / Dur +1.

**S.5 Sixteen-Channel Eyes** ✦Charge ★ — *see what no one else can*
- ◦ See True — **1 AP**: ignore concealment/invisibility/illusion/camouflage in 2 zones; reveal weak points (your hits +1) (Dur 2). *CD 0.*
- ◦ Spectral Lock — **1 AP + 1C**: target a foe — for the fight it **can't hide from you** and **your attacks ignore its defensive durations** (Dur: fight). *CD 3.*
- *Best in game at:* perception — hard-counters stealth/illusion. P → +1 zone/bonus. E → +1 target / share with allies.

**S.6 Meral Spread** ✦Charge — *threat display*
- ◦ Flare — **1 AP**: adjacent foe −1 to its actions next turn (Dur 1). *CD 0.*
- ◦ Deimatic Display — **2 AP + 1C**: foes in 2 zones pay +1 AP to approach you / −2 to attack you (Dur 2). *CD 2.*
- *Scaling:* P → +1 affected. E → radius +1 / fear (foe must move away).

**S.7 Molt** ✦Time — *shed the debuffs*
- ◦ Shed — **2 AP**: clear all conditions on you; −1 armor next turn (soft shell) (Dur 1 vuln). *CD 2.*
- ◦ Renewal — **1 AP + 2T**: regrow — recover **4 Vitality over 2 turns** + clear conditions (Dur 2). *CD 3.*
- *Best at:* resetting lockdown/poison. P → less vuln. E → heal +2 / faster.

**S.8 Burrow Ambush** ✦Space ★ — *the alpha strike*
- ◦ Dig In — **1 AP**: take cover in your zone — concealed & **+3 to your next attack** from it (Dur until you attack/move). *CD 1.*
- ◦ Ambush Leap — **2 AP + 1S**: teleport to a zone **adjacent to a foe** and Punch immediately for **+2 dmg**. *CD 2.*
- *Best at:* opening burst. P → +1 ambush dmg. E → range +1 / +1 dmg.

**S.9 Tail-Flip Escape** ✦Mass — *caridoid retreat*
- ◦ Flip — **1 AP**: burst **2 zones backward**, ignoring foes in the way. *CD 0.*
- ◦ Thrust Wave — **2 AP + 1M**: rocket back 2 zones AND knockback all foes you were adjacent to 1 zone + **2 dmg**. *CD 1.*
- *Scaling:* P → +1 zone. E → +1 dmg/knockback.

---

# The build: **CAVITT**, *the Brawler-in-the-Cloud*
**Human · Mimic Octopus · Peacock Mantis Shrimp**

A HyperSea duelist who reads you, closes through cover, vanishes, then lands a punch that boils the water between you. The three heritages compose cleanly: **Human reads & pre-empts**, **Octopus relocates & hides**, **Shrimp delivers the kill**. The signature move is *Cloak → teleport in → Ballistic Blow*.

### The 27-card menu (what this character *could* become)
All nine of each species above are draftable. The character is one **reading** of these three — capped at **3 of 9 per species (9 total)**.

### Starting draft — **2 of 9 from each (6 cards)**
| From | Card | Why |
|---|---|---|
| Human | **Theory of Mind** | Read the foe; pre-empt their big hit — the assassin's insurance. |
| Human | **Throwing Arm** | A turn-1 ranged poke so he isn't helpless while closing distance. |
| Octopus | **Jet Propulsion** | Mobility to close on a kiter and reposition after a strike. |
| Octopus | **Chromatic Cloak** | Survive the approach; set up the +3 stealth alpha. |
| Shrimp | **Smasher Strike** | The payoff — 3 dmg cheap, 6 dmg banked. |
| Shrimp | **Burrow Ambush** | Teleport adjacent + bonus damage — the opener. |

**Game plan:** poke with Hurl while Jetting in → Cloak/Dig-In → Ambush Leap or Vanish into a Ballistic Blow. **Weaknesses (by design):** *no sustain or heal*, no debuff-cleanse (Molt unpicked), and **light on true damage** — so an opponent who stacks defensive **durations** or **roots him in place** is his nightmare. He bursts or he loses.

**Growth path (toward 9):** add **Cavitation Bubble** (true damage to punch through armor/durations), **Distributed Arms** (chain Ambush + Smasher + Cavitation in one turn), **Sixteen-Channel Eyes** (ignore the enemy's defensive durations — directly answers his weakness), then **tech/omnicrystal** sustain.

---

# The opponent: **MARISH**, *the Tidewarden*
**Human · Electric Eel · Venus Flytrap** — a deliberately *opposite* archetype: a **ranged attrition zoner** who sees through tricks, roots the approach, and outlasts. Built to exploit exactly Cavitt's weaknesses.

### Starting draft (6 cards)
| From | Card | Role |
|---|---|---|
| Human | **Tool Use** | Reach/utility; extend a shock or interact. |
| Human | **Persistence Endurance** | *Second Wind* heal-engine — win the long game. |
| Eel | **Electric Discharge** | Ranged damage — keep Cavitt at arm's length. |
| Eel | **Electroreception** | **See the cloaked octopus** — anti-stealth. |
| Flytrap | **Snap-Trap** | **Root the brawler** before he lands the punch. |
| Flytrap | **Photosynthesis** | Charge-etherion engine to fuel the shocks. |

### New costed cards (Eel & Flytrap)

**7.1 Electric Discharge** ✦Charge
- ◦ Jolt — **1 AP**: ranged **2 dmg** at 2 zones. *CD 0.*
- ◦ High Voltage — **3 AP + 1C**: **5 dmg** + brief stun (−1) at 2 zones; chain **2 dmg** to a foe adjacent to the target. *CD 2.*
- *Scaling:* P → +1 dmg. E → +1 chain / +1 zone.

**7.2 Electroreception** ✦Space
- ◦ Sense Field — **1 AP**: detect all hidden/cloaked/invisible in 3 zones — **ignore concealment & invisibility** (Dur 2). *CD 0.*
- ◦ Field Map — **1 AP + 1S**: for the fight, you **can't be ambushed**, always know foes' zones, and foes can't gain stealth vs you (Dur: fight). *CD 3.*
- *Best at:* hard-countering stealth. P → +1 zone. E → also predict movement.

**8.1 Snap-Trap** ✦Time
- ◦ Set Jaws — **2 AP**: place a trap (your zone or adjacent); first foe to enter is **immobilized** (Dur 3) + **2 dmg**. Armed trigger. *CD 1.*
- ◦ Counted Trap — **2 AP + 1T**: trap springs on the foe's **second action in-zone** — immobilize (Dur 3) + **4 dmg** + **can't teleport out** (Dur 2). *CD 2.*
- *Best at:* punishing the approach. P → +1 dmg/Dur. E → +1 trap / no-escape.

**8.2 Photosynthesis** ✦Charge
- ◦ Bask — **1 AP**: +1 AP at the start of your next turn (Dur 1). *CD 0.*
- ◦ Bloom Engine — **1 AP + 1C**: **standing engine** — gain **1 Charge etherion** at the start of each of your turns (Dur 4). *CD 2.*
- *Best at:* fueling an etherion-hungry build. P → +1 AP. E → +1 etherion/turn / Dur +1.

---

# THE DUEL  *(no GM — two builds, real dice)*

**Setup.** Board zones **1–2–3–4–5**. **Cavitt** starts zone **1**, **Marish** zone **5**. Both Vitality **15**, hand of 6, 6-column track, 15-die pool of base d12s. Dice rolled with seed 47 (reproducible); shown each turn as the active player's available pool. Cavitt acts first.

> **Reading the matchup:** Cavitt must *burst* before Marish's lockdown + sustain grind him out. Marish can *see through Cloak* (Electroreception) and *root the approach* (Snap-Trap) — but her shock and her engine both need **Charge**, and the dice are about to be stingy with it. Tempo will decide this.

---

### Turn 1 — Cavitt *(roll: 5 AP, 1C)*
Five zones from Marish, no line for anything. He **Jets** (1 AP) zone 1→3, **Hurls** — out of range (Marish at 5, range 2 reaches zone 5 only from 3? 3→5 is 2 zones — in range): **Hurl 2 dmg** (1 AP). **Marish 15 → 13.** Banks 3 AP + the C toward a Vanish.
*Track: Hurl → cooldown (CD 0, returns next slide). Position: Cavitt z3, Marish z5.*

### Turn 1 — Marish *(roll: 4 AP, 1C, 1T)*
She wants her engine online before the brawler arrives. **Bloom Engine** (1 AP + 1C) — now generating 1 Charge/turn (Dur 4). **Counted Trap** (2 AP + 1T) on **zone 4** — the lane Cavitt must cross — primed to spring on his *second* action there (immobilize + 4 dmg + no teleport-out). Holds 1 AP.
*Marish z5; trap armed on z4. Cavitt z3.*

### Turn 2 — Cavitt *(roll: 5 AP + banked 3 AP & 1C = 8 AP, 1C, 1 omni)*
Big turn available. The trap on z4 is the problem — entering it and acting twice springs it. He plays around it: **Jet** (1 AP) z3→**z4** (entering once — trap not yet sprung; one more action here springs it). He does **not** act again in z4. Instead **Vanish** (1 AP + 2C — pays 1C + omni-as-C... only has 1C +1 omni = 2C ✓) — **invisible**, next stealth attack +3. Banks 6 AP. *He's invisible in the trap zone but hasn't triggered it (Vanish is one action; he entered with the move).* 
> Wait — entering z4 was action one; Vanish in z4 is action two → **the Counted Trap springs.** Immobilize (Dur 3), **4 dmg**, no teleport-out. **Cavitt 15 → 11**, rooted on z4, and Vanish resolves *after* — he's invisible **but immobilized and can't reposition**. A hard lesson in the trap.
*Cavitt z4 (rooted, invisible), banked 6 AP. Marish z5.*

### Turn 2 — Marish *(roll: 5 AP, 1 omni; +1 C from Bloom)*
She can't see him (invisible) and he's stuck adjacent-but-one. She can't target the invisible Cavitt, but she knows roughly where the trap sprung. **Sense Field** (1 AP) — **ignores invisibility** in 3 zones: Cavitt revealed on z4. **High Voltage** (3 AP + 1C from Bloom) at z4: **5 dmg** + stun (−1). **Cavitt 11 → 6.** Holds 1 AP + omni.
> Electroreception just erased the octopus's whole stealth plan. Cavitt is rooted, stunned, revealed, at 6.
*Cavitt z4 (rooted Dur 2 left, stun). Marish z5, 15.*

### Turn 3 — Cavitt *(roll: 4 AP, 1M; + banked 6 AP = 10 AP, 1M)*
Still immobilized (can't move) but his **invisibility lapsed** (attacking will break it anyway). He's adjacent to Marish? No — z4 vs z5 is **range 1 (adjacent)**. He *can* punch. Stun gives −1. This is his window — dump the bank. **Ballistic Blow** (3 AP + 1M): **6 dmg**, ignores all armor, knockback 1 zone... but he's rooted; knockback pushes *Marish* z5→ off-board edge, stays z5. **Marish 15 → 9.** Then **Punch** (1 AP): **3 dmg**, −1 stun → still 3. **Marish 9 → 6.** Banks 6 AP. Smasher Strike → CD 2.
*Even rooted, the brawler's burst is brutal. Marish 15 → 6. Cavitt z4 @6, root Dur 1 left. Marish z5 @6.*

### Turn 3 — Marish *(roll: 4 AP, 1T, 1 omni; +1C Bloom)*
At 6, with a 6-Vitality brawler adjacent who just hit for 9 — she must create space and stabilize. **Second Wind** (2 AP + 1T) — heal-engine online (+1/turn, Dur 4). **Jolt** (1 AP) z5→z4 target: **2 dmg. Cavitt 6 → 4.** She wants distance but the board edge traps her at z5; she holds 1 AP + 1C (Bloom) + omni, banking toward another High Voltage. *Note: her trap is spent; nothing roots Cavitt now and his root expires.*
*Marish z5 @6 (Second Wind +1/turn). Cavitt z4 @4, root expiring.*

### Turn 4 — Cavitt *(roll: 1 AP, 2M, 1C, 1 omni; + banked 6 AP = 7 AP, 2M, 1C, 1 omni)*
Root gone. Both low; this can end now. **Punch** (1 AP): **3 dmg. Marish 6 → 3.** **Ballistic Blow** still on CD (1 left). He has 2M — but Smasher's big mode is cooling. Use **Throwing Arm – Heavy Throw**? It's been in hand; (2 AP + 1M): **3 dmg** + knockback. **Marish 3 → 0.**
> **Cavitt wins, end of Turn 4.** The brawler ate a textbook lockdown opening — trap + shock dropped him to 6 — but the *banked Ballistic Blow + Punch* on Turn 3 (10 dice of saved violence) was a swing Marish's 15 Vitality couldn't absorb once he was adjacent.

---

## What the duel taught us about the system

- **Banking is the brawler's whole game, and it worked exactly as intended.** Cavitt's Turn-3 spike (6 saved dice → Ballistic Blow + Punch for 9) is the "one big complicated thing" the economy promises. Marish's mistake was letting him *arrive with a full bank*. The variance lived only at the seam between turns; each turn itself was a solved puzzle.
- **The trap did its job — and still wasn't enough.** Marish's Counted Trap played *perfectly* (Cavitt walked in and double-acted), cost him 4 + a stun + 5 from the follow-up shock, and dropped him to 6. Lockdown blunted the alpha but couldn't stop a banked Ballistic Blow at melee. Reading: **immobilize that doesn't also deny *damage output* only delays a burst build.** A version of Marish that picked **Vine Growth (constrict)** or led with **Deimatic-style "−2 to attack"** durations might have survived. Good knob to watch.
- **Electroreception hard-countered Cloak — as designed.** The octopus's invisibility evaporated the instant Marish spent 1 AP on Sense Field. That's the *intended* rock-paper-scissors: stealth builds must respect anti-stealth, and Cavitt's growth answer (Sixteen-Channel Eyes → *ignore defensive durations*) is precisely the counter-counter. The four etherions stayed co-equal: Mass closed the deal, but Space (trap/teleport), Charge (shock/engine), and Time (heal/lockdown) all *mattered* every turn.
- **Charge scarcity throttled the zoner.** Marish's whole kit (High Voltage, Bloom, Field Map) is Charge-hungry, and the dice gave her almost no native Charge — she leaned entirely on **Bloom Engine** and **omni faces** to function. That's the system self-balancing: an etherion-greedy build *must* invest in an income engine (Photosynthesis) or dice-shaping, and until it does, it's tempo-starved. Had Marish drawn two early Charge faces, she'd have landed High Voltage a turn sooner and likely won. **The replenishment variance, not a fixed rule, decided the race** — exactly the texture we wanted.
- **The deterministic-combat / random-replenishment split felt great to adjudicate.** No to-hit rolls meant every turn was a clean optimization against known resources; the only suspense was *what comes back*. That's a fundamentally different (and calmer) tension than dice-to-hit games, and it made a GM-less duel fully resolvable.
- **Where it's fragile:** Cavitt has *no answer to sustained durations or repeated lockdown* if he can't bank. A Marish who **kited better** (the board's 5-zone edge cruelly pinned her against the wall — a bigger or looped board changes everything) and **chained traps** could starve his bank and win the long game. The matchup is close; the board geometry and the Charge dice were the deciding variables, which is a healthy sign — *builds* and *luck-of-replenishment* swung it, not a dominant card.

### Suggested next tunes (from this one game)
1. **Board matters enormously** for melee-vs-ranged balance. Pin down standard arena size/shape (a 5-zone line over-favors whoever lands the first root). A loop or a 7–9 zone map gives kiters room.
2. **Re-examine pure-immobilize.** Consider that strong roots should *also* dampen the rooted creature's offense (or be cheaper but weaker), so lockdown delays rather than merely feeds a burst.
3. **Burst ceiling check.** A banked Ballistic Blow + Punch = 9 vs 15 Vitality is ~60% of a health bar in one turn. Either Vitality wants to be higher (~18–20) or top-end single-target burst wants a small tax, so games don't hinge entirely on one banked spike.
4. **Engines are mandatory for E-builds** — confirmed. That's fine and intended, but make sure every etherion-heavy species has at least one income/engine trait (Flytrap Photosynthesis, Gecko Solar Basking, etc.) so the archetype is *playable*, not just *aspirational*.
