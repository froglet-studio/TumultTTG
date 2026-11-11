# Tumult — Consolidated Core (v1.0)
### One clean, explicit ruleset. No loose ends.

*This supersedes the scattered notes. Every mechanic referenced by an ability is defined once, below. Every ability states its effect in **quantitative terms of P and E** — no "scales with P" hand-waving. The game is balanced around **cooperative mission contribution**; the 1v1 duel is only a control.*

---

## PART I · MECHANICS GLOSSARY (everything an ability may reference)

**Vitality** — hit points. Reaching 0 downs a fighter (in missions: downed, not dead, unless the scene says so).

**The Track** — 6 columns sliding toward your hand, one step per *your* turn. Two row-types per column: **duration** (one live ongoing per column, glanceable) and **cooldown** (stackable). Playing *either* ability on a card commits the **whole card** to the track for that ability's **CD (+ any duration)**; both faces are locked until it returns to hand. A completed duration drops into cooldown if cooldown remains, else returns to hand.

**Dice & resources** — Total dice = **15**, split across *pool* (unrolled), *banked* (rolled, held), and *spent*. **Roll 3** from pool each turn-end; faces sort into banked. Base d12 ≈ AP-saturated, elements scarce; one **omni** face spends as any element. **AP** = common currency; **etherions** (M/C/S/T) = scarce. Unspent banked dice carry (banking). **Anti-brick valve:** 1-of-each-element → omni, returning 3 dice to pool; last resort: dump a die for nothing.

**Mint** (verb) — create *temporary* dice that evaporate at end of turn if unspent. Bounded; total never exceeds 15 permanent dice.

**P (Physical level)** and **E (Ethereal level)** — per-ability upgrade tracks bought with **Upgrade Points (UP)**. Each pip of P or E on an ability costs 1 UP. They scale **different terms** (see Part II). Default both = 0.

**Omnicrystals (◇)** — the *non-random* economy for equipment: found, bought, traded, consumed. Fuels gear abilities. Distinct from the per-turn etherion roll.

### States (conditions; each ended/bypassed by *several* general verbs — never one key)
- **Hidden** — immune to **line-of-sight** strikes only. Broken by: melee contact · any **area** effect · being **Forced** (moved) · being **Located** · *you* striking.
- **Shield N** — reduce incoming damage by N. Bypassed by: **Pierce** · **area/true** damage · being Forced off your spot.
- **Anchored** — cannot be moved by others (movement only; you still act fully). *No ability ever skips a turn.*
- **Marked** — a token; your next qualifying hit consumes it for **+2 damage**.
- **Engine (Bloom/Regen/etc.)** — start-of-turn passive: draws a fixed resource or heals a fixed amount; lives in the duration row.
- **Located/Exposed** — a node/fighter revealed for a duration.
- **Slowed/Hasted** — track slides slower/faster (cards return later/sooner).

### Board (mission-scalable graph)
Nodes = positions; **edges** = melee/movement; **node color = line-of-sight row** (ranged hits any same-color node). **Range:** *melee* = shared edge; *LOS* = same color. Missions add: **objective nodes**, **hazard nodes** (area damage each round), **height/locked nodes** (require a specific verb to reach/open), and **spawn nodes** (emit threats).

### The four etherions are four *surfaces* (co-equal, orthogonal)
**Mass** = bodies/force (push, pull, weight, anchor, pierce-by-force) · **Charge** = energy/links (shock, fields, chains, reveal-by-sensing, engines) · **Space** = position/topology (teleport, reach, area, swap, the deck/storage) · **Time** = the track itself (hasten, delay, recall-to-hand, pre-place, foresight).

---

## PART II · THE SCALING GRAMMAR (the fix for "P+E is just more P")

Every ability has **two faces**, and P and E **never scale the same term**:

> **Physical face** — paid in **AP**, short/zero CD. A grounded effect whose magnitude scales **with P only**: `value = base + P`. This is the reliable bread-and-butter.
>
> **Ethereal face** — paid in **AP + etherion(s)**, longer CD. It does something the physical face *cannot*: a **capability** (a new verb, extra targets, area, teleport, control, a track-edit, a duration) that **only exists at E ≥ 1** and **scales with E**. P may *additionally* scale a mundane *sub-component* of this face (a brace value, a base damage number) **only where a physical sub-part genuinely makes sense** — and often P scales nothing here at all.

**The rule that makes E worth buying:** *E unlocks and scales the magical capability; P can never substitute for it.* Verified non-degenerate — even at P=99, an E0 ethereal face stays mundane (no pierce, no area, no teleport). So:
- A **high-P** build = high, *reliable* physical ceilings, low variance, AP-fed.
- A **high-E** build = *capabilities* (reach/area/control/tempo) unavailable at any P, but etherion-hungry and higher-variance.
- They occupy different axes; neither dominates.

**Notation in the specs below:** `Phys: <formula in P>` and `Eth (E≥1): <capability + formula in E> [+ Phys sub-part in P if any]`.

---

## PART III · THE COMPLETE CARD SPECS

*Every number is explicit. CDs differ per face. "z" = nodes/zones. Each card = one Physical face + one Ethereal face.*

### Shared / Human (cerebral–social, leans Time & Charge)
**Theory of Mind**
- *Phys — Read* · 1 AP · CD 0 · **Mark** the target (next qualifying hit +2). No P scaling beyond the flat Mark (the +2 is the Mark constant).
- *Eth — Pre-empt* · 2 AP + 1 T · CD 3 · **Capability:** pre-arm a counter — the target's next hit on you is **reduced by 3 + 2·(E−1)**, and at **E≥2** you also **reflect E damage**. P: none (pure foresight). *Dur 2.*

**Throwing Arm**
- *Phys — Hurl* · 1 AP · CD 0 · LOS strike for **2 + P**.
- *Eth — Heavy Throw* · 2 AP + 1 M · CD 2 · **Capability:** knockback **E** z + ignores **Shield** at E≥2 (pierce). Phys sub-part: damage **3 + P**.

**Persistence**
- *Phys — Pace* · 1 AP · CD 1 · shrug the next slow/fatigue; **+P** move this turn.
- *Eth — Second Wind* · 2 AP + 1 T · CD 4 · **Capability (engine):** Regen **2 + E** vitality at the start of each of your turns. *Dur 4.* P: none.

### Mimic Octopus (trickster–utility, leans Space & Charge)
**Burrow Ambush**
- *Phys — Dig In* · 1 AP · CD 2 · gain **Hidden** (1 + ⌊P/2⌋ turns); your next strike from it **+3**.
- *Eth — Ambush Leap* · 2 AP + 1 S · CD 3 · **Capability:** **teleport** to a node within **1 + E** of the target, adjacent to it. Phys sub-part: arrival strike **3 + P**.

**Chromatic Cloak**
- *Phys — Blend* · 1 AP · CD 1 · **Hidden** while you don't move (1 + ⌊P/2⌋ turns).
- *Eth — Vanish* · 1 AP + 2 C · CD 3 · **Capability:** **Hidden for 1 + E turns AND may move while Hidden** (impossible at E0). Phys sub-part: a **Shield P** brace rides along. *Dur 1+E.*

**Jet**
- *Phys — Jet* · 1 AP · CD 0 · move **2 + P** z (any direction).
- *Eth — Recoil Slam* · 2 AP + 1 M · CD 2 · **Capability:** **Force-push** the target **E** z. Phys sub-part: dash **1 + P** z and **2 + P** dmg.

### Peacock Mantis Shrimp (burst brawler, leans Mass & Charge)
**Smasher**
- *Phys — Punch* · 1 AP · CD 0 · melee **3 + P**.
- *Eth — Tectonic Slam* · 4 AP + 2 M · CD 4 · **Capability:** **Pierce** (ignores Shield) + knockback **E** z + at **E≥2 cleave** all adjacent foes. Phys sub-part: melee **6 + P**.

**Cavitation** *(true-damage specialist)*
- *Phys — Tap* · 1 AP · CD 1 · melee **1 + P** (a setup poke).
- *Eth — Cavitation Bubble* · 2 AP + 2 C · CD 3 · **Capability:** **true damage** (unblockable, ignores Shield/armor) of **3 + 2·E**, range melee. P: none — the magic *is* the unblockability.

**Burrow Ambush** *(shrimp variant, Space — distinct from octopus by sub-part)*
- *Phys — Stalk* · 1 AP · CD 1 · move **1 + P** and gain **+2** to your next strike.
- *Eth — Spearer Lunge* · 2 AP + 1 S · CD 3 · **Capability:** **pull** the target **E** z into melee. Phys sub-part: strike **3 + P**.

### Electric Eel (ranged attrition, leans Charge & Space)
**Electric Discharge**
- *Phys — Jolt* · 1 AP · CD 0 · LOS **2 + P**.
- *Eth — Tesla Cascade* · 4 AP + 2 C · CD 4 · **Capability:** **chain** to **E** additional foes within 1 z of the target, each taking **3 + E**; strips target **Shield**. Phys sub-part: primary LOS **5 + P**.

**Electroreception** *(general Reveal, not an anti-stealth key)*
- *Phys — Sense* · 1 AP · CD 1 · **Locate** all creatures in your row within **2 + P** z this turn (reveals Hidden among other things).
- *Eth — Field Map* · 1 AP + 1 S · CD 3 · **Capability:** for **2 + E** turns you can't be ambushed and **share** the located map with allies anywhere. P: none.

### Venus Flytrap (zoner–engine, leans Charge & Time)
**Snap-Trap**
- *Phys — Set Jaws* · 2 AP · CD 2 · arm a node-snare: first foe entering takes **2 + P** + **Anchored** (movement-only, can still act).
- *Eth — Counted Trap* · 2 AP + 1 T · CD 3 · **Capability:** trap also denies teleport-out and triggers on the foe's **second action in-zone**; Anchor lasts **2 + E** turns. Phys sub-part: **4 + P** dmg.

**Photosynthesis**
- *Phys — Bask* · 1 AP · CD 1 · **+1 + ⌊P/2⌋** AP next turn.
- *Eth — Bloom Engine* · 1 AP + 1 C · CD 4 · **Capability (engine):** draw **1** guaranteed Charge from pool each turn; at **E≥2** you may instead **Mint E temporary Charge** on demand (the visible mint). *Dur 4.* P: none.

### Defensive / control (cross-species & gear)
**Repulse**
- *Phys — Shove* · 2 AP · CD 2 · **Force-push** adjacent foe **1 + ⌊P/2⌋** z and reposition (reveals Hidden).
- *Eth — Thunderclap* · 2 AP + 1 C · CD 3 · **Capability:** **area** push — all adjacent foes pushed **E** z. Phys sub-part: **2 + P** area dmg.

**Static Shield**
- *Phys — Brace* · 1 AP · CD 1 · **Shield (2 + P)** vs the next hit. *Dur 1.*
- *Eth — Field Wall* · 1 AP + 1 M · CD 3 · **Capability:** **Shield** applies to **all** damage (incl. area) for **1 + E** turns; at E≥2 also covers an **adjacent ally**. Phys sub-part: Shield value **2 + P**.

**Grapnel ◇** (gear) — *Phys — Reel* · 1 ◇ · CD 1 · pull foe **1** z. *Eth — Winch* · 2 ◇ · CD 3 · **Capability:** pull from any distance into melee + **Anchor** them **E** turns; Phys: **2 + P** dmg.
**Scope ◇** (gear) — *Phys — Glance* · 1 ◇ · CD 1 · **Locate** adjacent. *Eth — Survey* · 2 ◇ · CD 3 · **Capability:** **Locate any node** on the map + reveals traps/Hidden/loaded cards for **1 + E** turns. P: none.

---

## PART IV · THE TWO CONTROL CHARACTERS (with UP spent)

Each starts with **6 cards** (2 of 9 from each species) and **6 Upgrade Points** spent across their abilities. Note how the builds *differ in P/E philosophy*, which the grammar now makes meaningful.

### CAVITT — the Brawler-in-the-Cloud (P-leaning striker)
*Human · Octopus · Mantis Shrimp.* Spends UP on **physical ceilings**, dips one E for a signature.
| Card | P | E | Why |
|---|---|---|---|
| Smasher | **2** | 1 | Punch 5; Slam 8 + pierce + 1 knock — reliable melee with one magical pierce |
| Burrow Ambush | 1 | **2** | Leap teleports within 3 of foe — his approach answer (capability, not raw dmg) |
| Chromatic Cloak | 0 | 0 | Blend 1-turn conceal; saved UP elsewhere |
| Jet | 0 | 0 | Jet move 2 (base) |
| Throwing Arm | 0 | 0 | Hurl 2 — turn-1 poke |
| Theory of Mind | 0 | 0 | Read/Mark |
**Read of the build:** a P-striker who bought *one* E-capability (the teleport approach) to solve his "crossing the board" problem, and otherwise leans on reliable physical numbers. **6 UP: P=3, E=3.**

### MARISH — the Tidewarden (E-leaning controller)
*Human · Eel · Flytrap.* Spends UP on **capabilities** — reach, chains, engine, lockdown.
| Card | P | E | Why |
|---|---|---|---|
| Electric Discharge | 0 | **2** | Cascade chains to 2 foes — her swarm/AoE answer |
| Snap-Trap | 0 | **2** | Counted Trap: long Anchor + no-teleport — control capability |
| Repulse | 1 | 0 | Shove with a little extra push — physical reset |
| Static Shield | 0 | 0 | Brace 2 |
| Photosynthesis | 0 | **1** | Bloom engine online; mintable at E2 later |
| Persistence | 0 | 0 | Second Wind base |
**Read of the build:** an E-controller who bought *capabilities P can't give* — chaining damage (anti-swarm), durable anchor-lockdown, a resource engine. Higher variance, etherion-hungry, but does things a P-build simply cannot. **6 UP: P=1, E=5.**

> The two builds are now genuinely different *kinds* of character, not "more vs less" — Cavitt is reliable single-target physicality; Marish is capability-rich area/control/economy. That contrast only became expressible once P and E scaled different terms.

---

## PART V · BALANCING AROUND MISSIONS, NOT THE DUEL

The duel is a **control** — a clean closed system to verify mechanics. But the game is **cooperative**, and these kits are built to be measured by **contribution to mission objectives**, where utility is king. The same deterministic turn runs against an **AI/DM** narrating scenarios.

### The four mission-challenge archetypes (what kits must handle beyond 1v1)
1. **Swarm / AoE threat** — many weak bodies or a spreading hazard. *Answered by:* chains (Tesla Cascade), area (Thunderclap, Arc), node-control (traps on chokepoints), Force to herd. **Marish's E-build shines; Cavitt's single-target P is weak here** — exactly the cooperative complementarity we want.
2. **The high place / the locked vault** — an objective at a height or behind a barrier. *Answered by:* Space verbs (Ambush teleport, Reel/Winch, Jet), Reveal (Survey locates the mechanism), Force (pull a lever from afar). A pure striker is stuck; a Space/utility kit gets there.
3. **The hidden / the sought** — find a thing or a foe concealed in the scene. *Answered by:* Locate verbs (Sense, Survey, Scope), area sweeps, Force to flush. Many routes, no single key.
4. **The timed event / the cascade** — a hazard that escalates each round (flood, reactor, ritual). *Answered by:* Time verbs (hasten an ally's cooldown, delay the event on the track), engines (sustain through it), Regen. Tempo control becomes the objective.

### How a mission turn runs deterministically (no GM math, just adjudication)
- The **scene** is a graph with objective/hazard/height/spawn nodes and a **clock** (a track the AI/DM advances).
- Each player takes a **deterministic turn** spending known (rolled) resources against the scene, exactly as in the duel.
- The **AI/DM** only needs to: advance the clock, resolve spawns/hazards by the same strike/state rules, and **narrate**. Every player action resolves by the explicit ability formulas above — *the DM never improvises a number*, only the story.
- **Contribution metric (for balance):** instead of "who won," we measure **objective progress per turn per character** across scenario types. A kit is balanced if it's *the best contributor in some scenario class and a weak one in another* — never dominant or useless everywhere. (Cavitt: best at single elite threats, weak at swarms. Marish: best at swarms/control/timed events, weak at burst-down. That's a healthy pair.)

### Why this makes stories worth telling
Because the kits are **capability-rich** (Part II's E-faces are verbs, not just numbers), a scenario isn't "roll to hit the monster" — it's "the vault is on the high ledge, the ritual completes in 3 clock-steps, and a swarm guards the only sightline." Marish chains the swarm and delays the clock; Cavitt teleports to the ledge and pierces the guardian; the Grapnel reels the lever. **The same small mechanic set composes into a different story every scene** — which is the whole project thesis (small core, combinatorial emergence) applied to *narrative*, not just combat.

---

## PART VI · LOOSE ENDS, CLOSED
- ✅ **No "scales with P/E" hand-waving** — every face states an explicit formula or a defined capability unlock.
- ✅ **P ≠ E axis** — they scale different terms; E unlocks capabilities P can't buy (proven non-degenerate); no `(P+E)×base`.
- ✅ **Two abilities per card, distinct CDs** — cheap-physical (short CD) vs spicy-ethereal (long CD); firing either commits the whole card.
- ✅ **Every referenced mechanic is defined once** (Part I) and only referenced thereafter — signal, no noise.
- ✅ **No turn theft** — strongest control is Anchor (movement-only) or efficiency taxes; agency is never removed.
- ✅ **No hard counters** — states are pressured by many general verbs; equipment patches *verbs*, not matchups.
- ✅ **Balanced for missions** — contribution-per-scenario-class, with the duel retained only as a control.
