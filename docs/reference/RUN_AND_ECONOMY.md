# Tumult v2.0 — the run: Tide Map, progression and economy

## The hero

A hero is **Human + two bloodlines**, **6 trait cards** to start, **6 Upgrade Points** spent, **26 vitality**, a **15-die pool**. Over a run a hero grows to at most **9 cards, never more than 3 of 9 from one bloodline** (the v1.0 cap, kept verbatim — it is the draft's balance lever).

**Two ways to build.** *Quick Build* takes one of six pre-made heroes (Cavitt the Brawler-in-the-Cloud, Marish the Tidewarden, Ossa the Bulwark, Veil the Nightwing, Mycel the Network, Kess the Catapult). *Draft* opens packs of 4 cards drawn across your three pools, pick 1, six times; you may pass a pack. Then spend 6 UP on P/E tracks (caps 3/3 per card). Unspent UP carries over.

**P vs E (the v1.0 grammar, unchanged).** P deepens the Physical face's numbers — reliable, AP-fed. E awakens the Ethereal face — it cannot be played until its card has E 1 — and then scales its *capability*, something P can never buy at any level. A new hero sets out with at least two cards awakened (`T.RULES.START_AWAKE`): the pre-made heroes are written that way, and a drafted hero's first two E points go to its strongest signatures from the starting six UP (the player can move them; Confirm tops the count back up to two if UP is left). Hover a face to see its exact numbers at the hero's current P/E.

## The round (what the player actually does)

1. **Round start.** Spawn-nodes and Spawners emit. Every enemy chooses an intent — shown as an arrow and a label ("Cleave → Cavitt (4)").
2. **Hero phase.** Each standing hero: track slides one column (cards come home), engines fire, roll 3 dice from the pool into the bank. Then act freely with either hero in any order: play card faces (pay AP + etherion; the card goes to the track for its cooldown), walk (1 AP per edge; height nodes need Space verbs or the ramp), Interact (2 AP), Rally a downed ally (2 AP, back at 8), take a basic action that needs no card — **Strike** an adjacent foe for 2 (2 AP), **Brace** for Shield 1 until your next turn (1 AP), **Shove** an adjacent foe 1 node (2 AP), as often as AP allows and never onto the track; **Channel** a banked etherion (or Omni) into one for more: Mass makes Strike 4 or Shove 2 nodes, Charge lets you Interact 2 nodes away, Space lets you Scramble 1 node up or down a ledge (1 AP), Time adds a track slide to Brace — use gear (◇ per use, own small cooldown), use a consumable, fold M+C+S+T into one Omni, or return a clogged die to the pool. Minted (temporary) dice evaporate at the end of the phase. Banked dice carry — but the pool shrinks, so hoarding starves next turn's roll (the v1.0 hard pool cap, intact).
3. **Enemy phase.** Each enemy executes its declared intent. If the target left range it closes distance instead; a lane shot against a Hidden hero strikes an afterimage; a pushed enemy's plan collapses. Kiters retreat before shooting. Lurkers ambush from Hidden. Harriers blink adjacent and strike.
4. **Round end.** Counted snares spring; decoys strike; hazards deal 3 true damage to anyone standing in them (enemies too — push them in); spores choke; dots tick; the beacon counts if a hero is near it; the clock ticks; the flood spreads; states expire; the Heart may crack.

**Downed, not dead.** At 0 a hero is downed and loses states; an adjacent ally can Rally them. Both downed = mission lost.

## The Tide Map

Seven rows, bottom to top. Row 0 offers three openers (Swarm / Vault / Cascade). Rows 1–5 mix missions, Elites, Havens (row 2 and a guaranteed Haven in row 4) and Events. Row 6 is the Heart. Each node links to 1–3 nodes in the next row; every node is reachable. Tiers: rows 0–1 tier 1 (*The Shallows*), rows 2–4 tier 2 (*The Undertow*), rows 5–6 tier 3 (*The Deep*). A refused privateer toll upgrades your next mission to an Elite; a paid guide skips a row.

## Rewards (after a won mission)

- **UP:** 2, +1 per bonus objective achieved, +1 for an Elite (+1 with the Studious boon). Both heroes receive it; spend any time on the map via **Train**.
- **Omnicrystals (◇):** 4 + tier, +2 per bonus objective, +4 Elite, +10 boss (+2 Deep Pockets).
- **A trait:** pick 1 of 3 cards drawn from traits either hero could legally take, give it to a hero (bloodline must match; 3-of-9 cap; 9 max) — or skip for +2 ◇.
- **Elites also offer a boon** (pick 1 of 2).
- Everyone binds wounds: **+25% vitality** after a won mission; downed heroes get up at 25%.

**Bonus objectives** are per-archetype (e.g. *no hero below 50%*, *destroy the Warden*, *finish with 3+ rounds to spare*, *take no ambush damage*, *take no hazard damage*, *both heroes standing*). They are the skill-expression reward loop.

## Lifeline

Once per run, losing a **non-boss** mission does not end the run: no rewards, both heroes limp on at 50%, the Lifeline is spent. Losing the boss, or losing again, ends the run.

## Omnicrystals and gear

◇ is the **managed economy** (v1.0: "etherions = weather, omnicrystals = supply"). It is both currency and **fuel**: gear abilities cost ◇ per use and have their own small cooldown (not the track). Each hero carries up to **2 gear**; Havens stock 3 at a time (prices 4–7 ◇), and you may sell for half.

| Gear | Price | Verbs it grants |
|---|---|---|
| Grapnel | 6 | Reel (pull 1, 1◇) · Winch (pull from anywhere into melee + Anchor 2, 2◇) |
| Scope | 5 | Glance (reveal adjacent, 1◇) · Survey (reveal all + find the hidden objective, 2◇) |
| Capacitor | 6 | Store (draw a pool die as Omni, 1◇) · Discharge (mint 2 AP + 1 Charge, 2◇) |
| Phase-brace | 7 | Blink (teleport 2, height ok, 2◇) · Fade (Hidden 1, 1◇) |
| Chrono-shim | 7 | Shim (track +1, 1◇) · Rewind (track +3 and clock +1, 3◇) |
| Aegis Plate | 6 | Brace (Shield 3 all, 1 round, 1◇) · Bulwark (Shield 3 all, 2 rounds, you + adjacent ally, 2◇) |
| Tide Lantern | 5 | Flare (reveal 2 + Mark all revealed, 1◇) · Beacon (ally free move 2, 2◇) |
| Harpoon Gun | 6 | Shot (lane 3 + pull 1, 1◇) · Skewer (lane 5 pierce, 2◇) |
| Climbing Rig | 4 | Ascend (climb 1, height ok, 1◇) · Rappel (move 2 through foes, 1◇) |
| Medkit | 5 | Patch (heal 4, 1◇) · Revive (downed adjacent ally at 10, 2◇) |

Gear is the **orthogonality insurance** from the v1.0 mechanic basis: any build can buy the verb it lacks (Space for a vault, Reveal for the Sought, Pierce for a Warden) — general verbs, never keyed counters.

**Consumables** (one use, 3 per hero): Rally Vial (heal 6, 2◇), Omni Shard (mint 1 Omni, 3◇), Tide Charm (clock +2, 3◇), Flashpowder (reveal 2, 2◇), Grit (Shield 3 all for a round, 2◇).

**Havens:** rest for half of missing vitality free, or full repair for 3 ◇.

## Boons (passive, per hero; none breaks the 15-die invariant)

Tide-touched (start each mission with an Omni banked) · Thick Hide (every Shield +1) · Keen Sense (reveals +1; adjacent Hidden foes revealed at round start) · Deep Pockets (+2 ◇/mission) · Studious (+1 UP/mission) · Second Wind (once per run, its holder rises at 10 instead of going down) · Momentum (first strike of each round +2) · Anchor Soul (cannot be pulled) · Quick Hands (the track slides 1 extra as round 2 begins) · **Mass / Charge / Space / Time Affinity** (one AP face on your dice becomes that etherion) · Omni Core (one AP face becomes Omni) · Defiant (+2 vs Elites and the Heart).

Affinities are the build-around: they move your dice toward your colours, which is exactly how a deck's mana base shapes a draft.

## Events (12)

Terminal Beacon · Privateer Toll · Etherion Storm · Bloom of the Superorganism · Stranded Guide · Drowned Cache · Lintukoto Shrine · Mirror Pool (respec) · The Consolidation's Envoy · Molt Season (swap a trait) · Terminal Audit (≥10 ◇ halved, else +4) · Quiet Current. Each is 2–3 choices with costs, risks and occasional follow-ups (a card pick, a trade, a boon). No event repeats within a run.

## Saving

The run saves to `localStorage` at every node and after every action in a mission; **Continue** returns to wherever the page was closed, in the middle of a round if need be (`docs/reference/STATE_AND_SAVES.md`). Lifetime stats (tides sailed, Consolidations toppled, deepest row) persist across runs.
