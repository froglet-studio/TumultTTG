# Tumult — Replayability Study & First Principles (v0.1)

*Balance asks "is it fair?" Replayability asks the harder question: **is each game a new puzzle, or the same puzzle reskinned?** This study used an *adaptive* agent (one that plays the best use of whatever it actually rolled, like a thinking player — not a fixed script) to measure whether resource variance produces **divergence** (fresh, situational, cinematic) or merely **delay** (the same optimal line, postponed). The finding is clean, and it dictates how we expand.*

> **The two questions, operationalized**
> 1. *When you don't get the resource you want, do you stall, or adapt into something unexpected?* → measured by **filler ratio** (turns spent poking/waiting) and **opening entropy** (variety of how games begin).
> 2. *Does that adaptation just refine one optimal line, or is it situationally awesome — a different puzzle each game?* → measured by **distinct winning-line count** and **top-line dominance** (what % of games use the single most common line).

---

## The experiment

Adaptive Cavitt vs a fixed competent kiter; 600 games per condition; only the dice differ. Two builds tested: **Narrow** (the current 6-card starter — a Mass+Space core) and **Broad** (adds Charge and Time options of *comparable* value: Cavitation true-damage, Vanish alpha, Distributed-Arms multi-action).

### Result A — the trap we were in (opponent dies to the alpha)

| Metric | Narrow | Broad |
|---|---|---|
| Filler ratio | **67%** | **67%** |
| Opening entropy | **0.00 bits** | **0.00 bits** |
| Top-line dominance | 70% | 65% |
| Opening: AmbushLeap | **100%** | **100%** |

**Adding Charge and Time options changed *nothing*.** Every game opened with the same teleport-alpha, two-thirds of turns were filler, and the dice only decided *which turn* you killed them. This is pure **delay-staleness**: variance shifts timing, never kind. The broad build's extra tools were dead weight — because the game ended before they were ever needed.

### Result B — the same builds, with one change: the opponent survives the alpha

(Opponent HP raised so a single combo can't end the fight; the dominant teleport made non-spammable.)

| Metric | Narrow | Broad |
|---|---|---|
| Filler ratio | 67% → **23%** | 67% → **21%** |
| Opening entropy | 0.00 → **1.25 bits** | 0.00 → **1.47 bits** |
| Distinct winning lines | 5 → **45** | 5 → **72** |
| Top-line dominance | 70% → **16%** | 65% → **11%** |
| Opening variety | Punch 64% / Ambush 25% / Ballistic 10% | Punch 59% / Ambush 26% / Ballistic 11% / Cavitation 4% |

The same system, the same builds, the same dice — and now **divergence**. Games open many different ways, filler nearly vanishes (you almost always have a meaningful best-use-of-this-hand), and 45–72 distinct winning lines emerge instead of one. The **broad build diverges measurably further** (72 vs 45 lines; Cavitation surfaces as the *answer* in 13% of plays — specifically when the opponent shielded and true damage was suddenly the right tool).

---

## The fundamental principles (what we just learned)

### 1. Replayability is gated by **survivability**, not by ability count.
The single biggest lever was *how long a fight lasts*. When one combo ends the game, no amount of build breadth matters — you never live long enough to need a second idea, so you always do the one best thing. **The puzzle only exists if the game lasts long enough to pose it.** This is why the balance study's "tune to turn-count (8–14 turns)" finding and this replayability finding are *the same finding from two directions*: short games are both unbalanced **and** unreplayable. **Length is the master dial.**

### 2. Variance creates *delay* by default and *divergence* only by design.
A scarce resource gating one dominant line produces staleness — the dice just make you wait. Divergence requires that **multiple lines be of comparable value but best in different situations**, so the resource draw (and board state) *changes which line is correct*, not *whether you can yet afford the one correct line*. The test for any new ability: *"Does this give players a different best answer under a different draw, or a stronger version of the same answer?"* Only the former buys replayability.

### 3. Breadth pays off **only above the survivability threshold.**
Below it, broad = narrow (Result A: identical). Above it, broad > narrow (Result B: 72 vs 45 lines). So build breadth and game length are **multiplicative, not additive** — adding options to a game that ends in 3 turns is wasted; adding them to a game that lasts 12 turns compounds. *Fix length first, then breadth becomes valuable.*

### 4. The "cinematic combo" is real, and it has a fingerprint.
The Cavitation-vs-shield moment is exactly the dynamic the design wants: the opponent did something (raised mitigation) that made the *normal* best play (raw damage) wrong, and the *situationally* best play (true damage) right — and the resources to do it were available because the build *had* that option. That's "unexpected by both players, situationally awesome, didn't just refine the optimal line." Its fingerprint: **a play that is usually suboptimal becomes correct because of a transient board/resource state.** Every species and item we add should be auditable for *how many such moments it can create*.

### 5. Filler ratio is the canary.
67% filler = a stale game wearing a variance costume. ~20% filler = a game where the dice keep handing you interesting problems. Track it. If a build or matchup sits above ~40% filler, the resource economy is gating one line, not feeding many.

---

## How these principles guide expansion (the next focuses)

**Species abilities — design each new trait to *flip* a best-line, not *raise* one.**
- Favor traits whose value is **conditional** (great vs mitigation / vs stealth / when adjacent / when low / when the track is crowded) over flat damage/defense. Conditional value is what makes a draw situational.
- Each species should offer **at least one option per etherion** of *comparable* peak value, so a Charge-heavy draw and a Mass-heavy draw lead to different — not weaker — games. (The Eel, e.g., is Charge-monotone right now; that *reduces* its own replayability, because every draw wants the same Charge line.)
- Audit signature traits for **single-combo dominance** (the AmbushLeap problem). If one combo is correct regardless of draw, it's a balance *and* replayability hole — fix by capping its recurrence (CD/etherion cost) so other lines get their turn.

**Items / omnicrystals — fill the holes that *create new conditional moments*, not raw stat sticks.**
- The highest-value items are ones that **introduce a transient state that flips which line is best**: armor that makes true-damage the answer; a haste that makes a multi-action turn suddenly correct; a mitigation that punishes the brawler's normal punch and rewards Cavitation. Items should *manufacture the cinematic-combo conditions*, not just add +X.
- Items run on **omnicrystals** (the non-random economy), so they're the player's tool to *deliberately* shape which conditional moments their build can exploit — the planned counterweight to the dice's randomness. That's the clean division of labor: **dice create unpredictable conditions; items let you pre-load answers to specific conditions you expect.**
- Explicitly target the **archetype-enabler holes** the balance study flagged (e.g., a ranged build with no range-reset). Those aren't just balance gaps; they're *replayability* gaps, because a build with no answer to its bad matchup plays the same losing line every time.

---

## Canonical rules implied (keep the ruleset streamlined)

These don't add systems — they constrain the ones we have, which is the goal (rich variance from a small, stable core):

1. **Lethality budget:** no single turn's output should exceed ~⅓ of a fighter's vitality, and no two-turn banked combo more than ~½ — enforced so games reliably last 8–14 turns and the puzzle has room to exist. (Tune via vitality, top-end costs, and the always-available affordable mitigation/reset.)
2. **Recurrence cap on dominant lines:** any line strong enough to be "always correct when available" must be rare enough (CD + scarce-etherion cost) that other lines fill the gaps. The cooldown track already does this; use it deliberately on the standouts.
3. **Conditional-value mandate for new content:** new traits/items are evaluated on *how many best-line flips they create*, not raw power. Reject flat stat-sticks; they add power without adding puzzles.
4. **One-comparable-option-per-etherion per species** (soft target): so no species collapses to a single-element monotone line, which is the build-level version of the staleness trap.

```
THE CORE LOOP OF REPLAYABLE FUN (what we're protecting)
  dice hand you an unpredictable set of resources + the board hands you a transient state
        -> several lines are viable; a DIFFERENT one is best than last game
        -> you adapt into a line you didn't plan (low filler, high entropy)
        -> sometimes that line is a situational combo neither player saw coming
        -> the game ends having posed a puzzle unique to this exact draw
  This loop only runs if games LAST (principle 1) and builds OFFER conditional breadth (principle 2-3).
```
