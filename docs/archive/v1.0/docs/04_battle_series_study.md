# Tumult — Battle Series: A Variance & Balance Study (v0.1)

*Same two builds (**Cavitt** vs **Marish**), same map, hundreds of games — only the dice change between them. The goal was to watch how replenishment variance alone reshapes a fight. It did that — and in the process exposed a structural balance problem that no amount of dice could hide, which is exactly what a battle series is for.*

> **Method note.** Combat is fully deterministic (no to-hit rolls); the only randomness is each turn's 5-die replenishment, rolled with a seeded RNG so every game is reproducible. Both fighters are run by fixed heuristic policies — not optimal play, but consistent, so differences come from dice and design, not from me steering. Numbers below are over 400 games unless noted.

---

## The map (Unmatched-style graph)

A 3×3 grid of nodes. **Edges** are movement/melee paths (1 AP per step; adjacent = melee range). **Colors** are ranged line-of-sight zones, assigned **by column**, so two same-color nodes can be a full move apart — *that's* what makes kiting geometrically possible.

```
        1 --- 2 --- 3          Columns = LOS colors:
        |     |     |            Blue  : 1 4 7
        4 --- 5 --- 6            Green : 2 5 8
        |     |     |            Amber : 3 6 9
        7 --- 8 --- 9
```
- **Melee:** you must share an edge (e.g. 5↔2, 5↔4, 5↔6, 5↔8).
- **Ranged (LOS):** you may hit any opponent in a node of **your column's color**, however far along it — e.g. a shooter on **7** can hit **1** (both Blue) from two moves away.
- **Start:** Cavitt node **7**, Marish node **3** (opposite corners).

*Reskin the colors to HyperSea sightlines later; the graph is the thing.*

---

## Headline result (baseline builds, as costed)

| Outcome | Share |
|---|---|
| **Cavitt (brawler) wins** | **97.5%** |
| Marish (zoner) wins | 2.5% |
| Draws | 0% |
| Avg length | **4.1 turns** (range 2–8) |

That is not a balanced matchup — and the *flatness* is the tell. If dice variance were the dominant force, we'd see a spread of outcomes; instead one build wins almost regardless of the roll. **Variance was decisive only inside the 2.5%** — the rare games where Marish rolled the exact Charge she needed on turn 1 *and* Cavitt rolled no Space to teleport.

### Three games, to see the texture
- **Seed 13 — the clean kill (3 turns):** Cavitt opens with **Ambush Leap** (teleport node 7→2, adjacent to Marish) for 5, punches twice next turn, leaps again for the kill. Marish gets her Second Wind engine online and one retreat — and dies before firing a single shot.
- **Seed 12 — the same story, faster:** turn-1 Ambush for 8, and despite two traps springing on Cavitt (2 dmg each) Marish is dead on turn 3 at −2. Her traps *worked perfectly* and were irrelevant.
- **Seed 11 — variance's best case for Marish (7 turns):** Cavitt's dice deny him Space for several turns, so he can't re-leap; Marish kites to node 9, lands two Jolts, springs a Counted Trap for 4 and an immobilize. She claws to a stable ~7 hp with Second Wind + Bloom both running. **And still loses** — the moment Cavitt banks enough Mass, one Ambush + Ballistic + Punch erases her. This is the *longest, luckiest* game for the zoner, and it's still a loss.

---

## Why melee dominated — and why numbers couldn't fix it

I isolated four obvious "balance dials" and ran 400 games each. **None worked**, which is the most important finding here:

| Dial tried | Result |
|---|---|
| Ambush needs a 1-turn setup | 97.5% Cavitt *(unchanged)* |
| Vitality 15 → 20 | **99.2% Cavitt** *(worse — more hp = more shots Marish never fires)* |
| Marish acts first | 95.8% Cavitt |
| Marish pre-places a trap | **100% Cavitt** |

Raising vitality made it *worse*. That's the diagnostic: **the problem isn't that Marish dies too fast, it's that she has no tool to change the range or reduce a hit.** More hit points just means more turns of being punched. The disease is structural, not numeric:

1. **Approach is nearly free.** Jet moves 2 edges for 1 AP; Ambush Leap *teleports* adjacent for 2 AP + 1 Space. The brawler crosses the whole map and is hitting by turn 1–2, before the zoner's engine-and-kite plan can even start.
2. **The zoner has no mitigation.** Marish's whole kit is offense + sustain + lockdown. She takes every hit at full value. Sustain (+1/turn) can't outrace 6–9 damage spikes.
3. **Her own win condition traps her in melee range.** Ranged LOS is same-color — but on a small map the same-color node she needs to *shoot* from is often *also adjacent* to the brawler. The kite-spot analysis confirmed it: from most nodes, a shoot-but-safe square exists against only **1–2 of 8** possible enemy positions. She can shoot, or she can be safe, rarely both.

## The cure — and where balance actually lives

I then gave Marish **real structural tools** (a **Repulse** to knock the brawler back and reset to range, a **Static Shield** damage-reduction duration — both stand-ins for tech/omnicrystal gear or alternate card picks) and **taxed Cavitt's approach** (Ambush at 2 Space, "sticky" disengagement). Two clean brackets emerged:

| Configuration | Cavitt | Marish | Avg length |
|---|---|---|---|
| Baseline (no zoner tools) | 97.5% | 2.5% | 4 turns |
| Zoner tools **spammable**, heavy approach tax | 26.5% | **73.5%** | **14.5 turns** |
| Zoner tools **on cooldowns**, light approach tax | ~70% | ~30% | ~6 turns |

The true 50/50 sits between the last two rows — but the *headline* isn't the exact number, it's this: **the average game length tracks the balance.** A 4-turn average means someone is being deleted before the game starts; a 14-turn average means both engines come online and the fight becomes the dance it's supposed to be. **Length is the balance gauge.** When you tune this matchup, target the turn count, not the win rate — get games into the 8–14 turn band and the win rate follows.

The mechanism the over-fix revealed is also the design lesson: **Repulse (range reset) was worth more than any amount of damage or hp**, because it attacks the brawler's *only* plan — being adjacent. A zoner doesn't beat a brawler by out-damaging him; it beats him by **denying the range he needs**, the same way Cavitt beats a stealthier foe not with damage but with the Eyes that deny concealment. Both archetypes win by *removing the opponent's enabling condition*, not by trading blows. That's the rock-paper-scissors the four etherions are supposed to express, and the sim says it's real once both sides actually *have* their enabling/denying tools.

---

## What variance *did* do (the original question)

Within a balanced configuration, the dice genuinely reshape each game — they just couldn't rescue an unbalanced one:
- **Which etherion arrives first decides the opening.** Cavitt with early Space teleports turn 1; Cavitt starved of Space has to walk, buying Marish 2–3 setup turns (seed 11). Marish with early Charge fires High Voltage on turn 2; Charge-starved, she chips with Jolts and leans on Bloom/omni to function.
- **Banking converts a quiet roll into a loud one.** Cavitt's slow turns aren't wasted — they bank Mass toward a Ballistic Blow. Variance shifts *when* the spike lands, not *whether* it does.
- **The omni face is the floor.** In Charge-dry games Marish ran almost entirely on omni faces and Bloom; without that safety valve she'd have been bricked. The "always get something" promise held.
- **Game length is the variance signature.** Balanced games ranged 8–20 turns on identical builds — the dice alone produced 2.5× swings in fight duration. That's the texture you wanted: every match of the same two characters feels different because the resource weather is different.

---

## Action items (ranked)

1. **Every archetype needs its enabling-condition denier, or it's not viable.** A zoner *must* be able to pick a range-reset (knockback/repulse) and/or mitigation. Audit each species: does it offer at least one "deny the opponent's plan" tool, not just damage? (Octopus Ink/Recoil-Slam, Shrimp Tail-Flip/Deimatic, Flytrap roots, Eel needs a repulse — flag a gap.)
2. **Tune to turn-count, not win-rate.** Target average duels of **8–14 turns**. The current burst ceiling (banked Ambush+Ballistic+Punch ≈ 12 across two turns) deletes an 18-hp fighter too fast; either trim top-end single-target burst slightly or ensure the defender always has an affordable mitigation/reset available the turn before.
3. **Mind the map.** On a small grid, "shoot from same color" collapses into "shoot from melee range." Ranged builds need maps with **long single-color sightlines that aren't movement-adjacent** — design arenas with explicit kite lanes, or ranged play is dead on arrival.
4. **The no-turn-removal rule is already paying off.** Note that *immobilize* (the traps) was strong but never oppressive precisely because Cavitt could still act while rooted — he punched from inside the trap. Movement-denial that leaves agency intact is the right ceiling for control; the sim never produced a feels-bad lockout.
5. **Approach should cost something.** Free repositioning (Jet 2-for-1, cheap teleport) is the brawler's real power. A small tax — disengagement cost, or teleports priced in scarce etherions so they can't fire turn 1 — restores the zoner's setup window without nerfing damage.
```
EQUILIBRIUM SUMMARY
  unbalanced  -> 4-turn games, 97/3 split   (someone deleted pre-engine)
  over-fixed  -> 14-turn games, 27/73 split (zoner reset-locks brawler)
  target band -> 8-14 turn games, ~50/50    (both engines online; dice decide)
```
