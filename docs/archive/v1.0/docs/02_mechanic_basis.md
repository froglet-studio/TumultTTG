# Tumult — The Mechanic Basis: Orthogonal Verbs, No Hard Counters (v0.1)

*The streamlined canonical core. A small set of **verbs** and **states** that compose into an enormous play space — so depth comes from **combination**, not from a growing pile of special-case counters. This pass also pulls in the **equipment (omnicrystal) layer**, so we're reasoning about the whole system at once.*

> **The anti-pattern we're killing.** Earlier drafts had lock-and-key counters: *"Electroreception negates invisibility,"* *"the Eyes ignore defensive durations."* That's a special tool whose only job is to solve the problem another tool created. It bloats the rules, makes matchups rock-paper-scissors, and means a build either *has the key* (auto-win the interaction) or *doesn't* (auto-lose). **We replace every key with a general verb that pressures many states at once, and give every state several emergent answers.**

---

## 1 · The two primitives: STATES and VERBS

Everything in Tumult is a **verb** (something an ability *does*) acting to create, remove, or exploit a **state** (a condition on a fighter, a node, or a card). Keep both lists short; let them combine.

### States (conditions — on a fighter, a node, or a card)
| State | Meaning | How it ENDS / is BYPASSED (always plural — never one key) |
|---|---|---|
| **Hidden** | immune to *line-of-sight* strikes | melee contact (adjacency ignores LOS) · any **area/node** effect · being **Forced** (moved reveals you) · being **Located** by any Reveal · *you* Striking (attacking reveals) |
| **Anchored** | can't be moved by others' Force (or can't move) | wait it out · a stronger displacement that overrides · destroying the source node-effect |
| **Mitigated** (Shield) | reduces incoming damage by X | **Pierce** (any attack pays a premium) · **area/true** effects · **Force** them off the defended spot · **out-tempo** (delay its return) |
| **Charged** (Loaded) | stored AP/etherion on a card for a bigger release | spend it · or it's wasted if you're displaced/disrupted before release |
| **Marked** | a token a fighter carries; **consumed** by other verbs for a bonus | spend it (combo currency) · expires |
| **Slowed / Hasted** | track slides slower/faster (cards return later/sooner) | a counter-Time op · wait |
| **Linked** | two things share fate (split a hit, swap places, share resources) | break the link · distance |
| **Located** (Exposed) | a node/fighter is revealed for a duration | duration ends |

> **No state is a binary win.** *Hidden* doesn't mean "untouchable" — it means "safe from one *category* (LOS)." Melee, area, force, and reveal all still reach it, and each of those verbs does **other** jobs too. That's the difference between a state and a lock.

### Verbs (what abilities do — the whole palette)
**Strike** (deal damage: melee / LOS / area, optionally +Pierce, optionally apply Mark) · **Move** (self) · **Force** (move another: push / pull / swap) · **Reveal** (Locate a node/fighter) · **Conceal** (gain Hidden) · **Mitigate** (reduce incoming) · **Charge** (store) · **Mark/Consume** (set up & cash combos) · **Track-op** (Time: slide / hasten / delay / recall-to-hand / pre-place) · **Space-op** (teleport / reach / swap hand↔deck / draw).

That's it. Roughly **ten verbs and eight states.** Every ability in the game is a *recipe* of one or two verbs at a cost in AP + one etherion.

---

## 2 · The four etherions are four *surfaces*, not four power levels

This is what keeps them co-equal and orthogonal — each acts on a different surface of the game, so none is strictly better, and a draw heavy in one points you at a *different* kind of play, not a weaker one.

- **Mass** acts on **bodies & momentum** — Force, weight, Mitigate-by-density, knockback, anchor.
- **Charge** acts on **energy & connections** — Strike-energy, fields, Link/chain, Reveal-by-sensing, Charge-store.
- **Space** acts on **position & topology** — teleport, reach, area, swap, **the deck** (storage *is* space).
- **Time** acts on **the track itself** — hasten/delay/recall/pre-place, foresight, duration.

Three verbs touch the fiction (Mass, Charge, Space); one touches the *substrate* (Time). That asymmetry is deliberate: in a cooldown game, *tempo* is the scarcest lever, so Time is the rarest and most surgical etherion — and per our invariant it still may never *remove a turn*, only reshape when things return.

---

## 3 · Worked example: how stealth is handled with **zero** anti-stealth keys

The simulator now resolves *Hidden* entirely through general verbs. Over 408 games where Cavitt cloaked, his concealment was pressured through **four unrelated routes** — and no card exists whose purpose is "beat stealth":

```
broken by node TRAP (area, hits the node) ...... 1304   (Snap-Trap's job is lockdown; stealth-break is incidental)
broken by Scope reveal (equipment) ..............  214   (a general Locate verb; also finds traps, loaded cards)
broken by AREA arc (Discharge's area mode) .......  70   (Discharge's job is damage; area mode hits hidden too)
broken by FORCE (Repulse displaces him) ..........   3   (Repulse's job is range-reset; moving reveals)
+ melee contact ignores LOS entirely (always available to any fighter who closes)
```

None of these tools was *designed against Cloak.* The trap locks down; the arc deals area damage; the scope reveals (anything); repulse resets range. Each **incidentally** pressures Hidden because Hidden is defined as vulnerability to whole *categories* of verb. **That is combinatorial emergence: a few general verbs, many interactions, no lock-and-key.** A cloak build isn't auto-beaten by a key it can't see coming, nor auto-winning against a build that "didn't bring the answer" — it's pressured by ordinary play from many angles, and counterplays back (re-cloak after the reveal lapses, use melee-immune positioning, bait the trap).

The same logic governs every defense: **Mitigation** isn't beaten by an "armor-ignore" key but by Pierce (priced premium, available to all), area, Force-them-off-the-spot, or Time-delay their shield. Many routes, all reusable for other purposes.

---

## 4 · The equipment layer (omnicrystals) — fill **verb gaps**, don't add keys

Equipment runs on **omnicrystals** — the *non-random* economy (found, bought, traded, consumed), distinct from the per-turn etherion roll. Its design job is **orthogonality insurance**: let any build cover a *verb* its species trio lacks, so no build is structurally locked out of an interaction.

- Equipment grants **the same general verbs**, just fueled differently. A **Grapnel** = Force (pull); a **Scope** = Reveal; a **Capacitor** = Charge-store; a **Phase-brace** = Conceal/teleport; a **Chrono-shim** = a small Track-op.
- Because gear patches *verbs*, not *matchups*, it prevents hard-counters at the **build** level: a melee trio with no ranged answer doesn't hard-lose to kiters — it can equip a Grapnel (pull) or a thrown item, paid in omnicrystals it stockpiled. The fix is *general* (reach), not *keyed* ("anti-zoner module").
- This is the clean **division of labor** the whole system rests on: **the dice create unpredictable conditions each turn; equipment lets you pre-load general answers to conditions you expect.** Etherions = weather; omnicrystals = supply. Neither is a key; both are verbs.

> **Rule for any new item or trait:** it must grant a **general verb** (useful in many situations) or a **state interaction** that already exists in the basis. If the only way to describe it is *"counters X,"* reject it and instead ask *"which general verb would incidentally pressure X?"* — then make **that**, available to many builds.

---

## 5 · Why this produces an enormous space from a tiny ruleset (the combinatorics)

The play space isn't the count of cards — it's the count of **verb × state × board × resource** interactions, which multiply:

- ~10 verbs × ~8 states = **dozens of base interactions**, before context.
- Each gets multiplied by **board topology** (melee vs LOS vs area on a graph), by **which etherion** powers it, by **track timing** (is your follow-up back in hand yet?), and by **the resource draw** (which verb is affordable *this* turn).
- A starting fighter holds 6 of 9 traits → already 84 trait-triads per species; three species per character; then equipment; then the per-turn dice deciding which of your held verbs is live. The *combinations* are effectively unbounded while the *rules to learn* stay at "ten verbs, eight states, four surfaces."

This is the target the project has been circling: **a small, stable, learnable core that generates high-variance, never-the-same games** — because the richness lives in how few things *combine*, not in how many special cases we wrote.

---

## 6 · Canonical constraints (so the core stays small as we expand)

1. **No keys.** New content grants a *general verb* or interacts with an *existing state*. Anything describable only as "counters X" is rejected; build the general verb that incidentally pressures X.
2. **Every state has ≥3 emergent answers**, none of which is dedicated to it. If a state can only be removed one way, it's a lock — redesign it as vulnerability-to-a-category.
3. **Etherions stay surface-orthogonal** (Mass=bodies, Charge=energy, Space=position/deck, Time=track). No etherion does another's job; abilities mix etherions by mixing verbs, not by overlapping their domains.
4. **Pierce/Reveal/Force are universal premiums, not class features.** The general answers to defenses/stealth/position must be broadly purchasable (often via etherion-cost or omnicrystal), so no build is the sole holder of an interaction.
5. **No turn theft** (carried from before): control taxes efficiency or position, never agency.
6. **Equipment patches verbs, never matchups.** Gear exists to give a build access to a verb it lacks, keeping the matchup graph emergent rather than rock-paper-scissors.

```
THE LITMUS TEST FOR ANY NEW TRAIT OR ITEM
  Describe it without naming an enemy ability or build.
  If you can't — it's a key. Redesign it as a general verb
  that happens to pressure that state, and hand the verb to many.
```

---

### How this reframes the existing cards (migration notes)
- **Sixteen-Channel Eyes** (was: "ignore defensive durations, see all stealth") → becomes a **Reveal + Mark** card: Locate a node/fighter (general info; pressures Hidden *among other things*) and apply Mark (combo currency). It no longer *nullifies* defenses; Mark + a Pierce option lets you *punch through* one, the same way anyone with Pierce could.
- **Electroreception** (was: "hard-counters invisibility") → folds into the general **Reveal** verb (Locate within LOS), identical to a Scope item — so anti-stealth is a *verb anyone can field*, not an Eel class feature.
- **Snap-Trap, Repulse, Discharge-area** keep their primary jobs (lockdown, range-reset, area damage) and *incidentally* pressure Hidden — exactly as the sim now shows. No change needed; they were already general.
- Net effect: the rulebook **shrinks** (fewer special rules) while the interaction space **grows** (the general verbs touch more states). That's the trade we want every time.
