# The two players

Nobody can playtest forty missions of every kind after every change, so the game is measured by players made of code. There are two, and the gap between them is itself a measurement: how much a mission rewards thinking. Built in v2.2.0 (roadmap F2); the proposal it settles is `docs/design/09-engineering.md` §2. `test/lookahead.test.js` holds it in place.

| | the heuristic (weak) | the look-ahead player (strong) |
|---|---|---|
| where | `T.autoHeroPhase`, `src/engine/ai.js` | `T.smartHeroPhase`, `src/engine/lookahead.js` |
| how it chooses | a chain of hand-written rules: rally, interact, walk to the objective, the best strike by a rule of thumb | tries every legal action on a copy of the mission, lets the round play out there, keeps the line that scores best |
| what it can play | faces it has a rule for: 131 of 198 | every face, every gear ability, every consumable — it needs no rule |
| reads enemy intents | no | yes: the declared enemy turn is played out before anything is scored |
| cost | a millisecond a mission | about a tenth of a second a mission |
| what it is | a floor: a player who never reads the board | a careful player who thinks one round ahead and no further |

Neither is a person. What a person reports outranks both.

## Actions are data

An action is a plain object. `hero` is an index into `m.heroes`.

| `t` | fields | what it is |
|---|---|---|
| `face` | `card`, `face` (`'P'` or `'E'`), `target` (a uid) or `node`, `choice` (`'push'` or `'pull'`) where the face asks | play a card face |
| `walk` | `node` | walk there, one AP a step |
| `interact` | `node` | work the objective on or beside the hero |
| `rally` | | put a downed ally back on their feet |
| `gear` | `gear`, `ability`, and `target`, `node` or `choice` as for a face | use a gear ability |
| `item` | `item` | use a consumable |
| `valve` | | fold one of each etherion into an Omni |

- `T.legalActions(m)` lists every action the squad could take next. Every playable face is in it once for each way it can be resolved, and everything in it works.
- `T.applyAction(m, action)` does one, and returns what the engine returns.
- `T.describeAction(m, action)` says it in a few words: `Cavitt: Jet Propulsion — Jet → node 7`.

**A game is its seed and its list of actions.** Apply the same actions in the same order to the same mission, ending each round with `T.endHeroPhase`, and the same game comes out — the test replays three. That is what a replay, a bug report or an undo needs.

One thing is decided for the player: a face that lets its player reroll banked dice rerolls the plain AP dice, the faces with the most to gain.

## How the look-ahead player plans

1. **It imagines on a copy** — `T.imagine(m)`, never the mission itself. The copy carries nothing a person at the table could not know:
   - its dice and reinforcements come from streams of its own, so a reroll tried there is one possible outcome, never the one to come;
   - an unfound cache is wherever a searcher would look first — the unsearched one nearest the squad — whichever the real one is.

   Hidden foes are not hidden from it, and need not be: the board draws them, dimmed, and lists their intents.
2. **It searches a few actions deep with a beam.** From each position kept, every legal action is tried on a fresh copy; the two best results are kept (`width`), four actions deep (`depth`). A step that only sets up the next one survives if what follows makes it one of the best lines.
3. **Each position is scored as if the squad stopped there.** `T.finishRound` plays out the rest of the round — the enemies have declared what they will do, and nothing in it is random — and `T.evaluate` scores what is left.
4. **It plays the best line it found, and plans again** if the search ran out of depth, or if the dice did something no plan could know.

`T.planHeroPhase(m)` returns the plan and changes nothing; `T.smartHeroPhase(m)` plays the squad's phase. Anything that shows a player what would happen — a preview, a forecast, a hint — must start from `T.imagine` for the same reason the planner does. The interface's forecast is the first: `T.forecast(m)` is step 3 on its own, reported instead of scored — what each hero takes, where each foe ends up, what the objective and the clock do if the round ends now.

## The evaluation

One measure for every mission, in points of about one hero vitality each (`T.EVAL`):

| weight | points | for |
|---|---|---|
| `win` | 1000 | the mission won (lost: the same, negative) |
| `progress` | 70 | the whole objective; `T.objectiveProgress(m)` runs from 0 to 1 for every kind of mission |
| `heroHp` | 1 | each point of vitality a hero has |
| `heroDown` | 18 | a hero down, on top of the vitality lost |
| `foeHp` | 0.9 | each point of vitality and shield a foe still has |
| `foeAlive` | 4 | each foe still standing: it will act again |
| `clock` | 2.5 | each round left on a clock |
| `approach` | 1.6 | each step between a hero and where the objective needs someone — the nearest hero in full, the next at half |
| `dice` | 0.5 | each die kept for next round, up to four a hero (`hoard`, 0.1, beyond that) |
| `short` | 5 | each AP held by a hero who stands where the objective takes an Interact and cannot yet pay for one |
| `cooldown` | 0.25 | each column a played card still has to travel |
| `crystal`, `item` | 0.4, 2 | crystals and consumables kept |

The weights were set by reasoning and three corrections, each from watching it lose a mission it should have won: both heroes are credited for approaching the objective, not only the nearest; dice beyond four are worth almost nothing, or it hoards; and a hero one AP short of an Interact holds that AP instead of spending it on whatever is to hand. They have not been fitted to the win rates, and should not be: a player tuned until the tables look right measures nothing.

## What it cannot do

- **It thinks one round ahead.** It holds nothing back for a later turn, sets no trap for a foe that is two rounds away, and does not value an engine for what it will give in round three. The audit lists the faces it never chose (40 of 198 at the last run): strike-next-turn set-ups, engines, long reveals, immunities. Each is either weak for its cost or pays off later than this player can see — a person has to say which.
- **It does not read the log.** A UV trail that says how far the real cache is tells it nothing.
- **It does not choose its squad, its upgrades or its road across the map.** `tools/harness.js` does that with simple rules, the same for both players.

Tried and dropped: scoring two rounds ahead, with the squad standing still for the second. It played more of the faces (never played fell from 61 to 44 of the 180 held often enough to judge) and worse — 87% of missions won against 96%, the Vault falling to a half — because a squad that will stand still for a round is too frightened to stand where the objective is.

## Does every turn offer a decision?

Garrett's aim for two players is that both have interesting decisions every turn (2026-11-14). `T.turnChoices(m, hero)` measures one hero's turn from where the mission stands. On an imagined copy it tries every action that hero could take first, adds their best single next action, plays out the round and scores it as the planner does. It changes nothing.

- **idle**: nothing the hero could do beats doing nothing by 3 points (about 3 vitality).
- **forced**: one outcome is clearly best, so the turn plays itself.
- **open**: two or more different outcomes come close to the best (within 3 points, or a quarter of what is at stake). Two moves that end in the same place count once.

`node tools/turns.js 10` plays 10 missions of every archetype and tier with the look-ahead player, asks this of each standing hero at the start of every round, and prints the share of idle, forced and open turns, with *dull* (idle or forced) for each pilot. Both heroes are measured from the round's start, before either acts, so it is an estimate for whoever goes second.

The baseline at 2.25.0:

```
archetype  tier  turns  idle%  forced%  open%  choices   dull% pilot 1 | pilot 2
swarm      1      120    31%      19%    50%      2.3      48%   |   52%
swarm      2      120    11%      18%    71%      2.4      37%   |   22%
swarm      3      140    11%      20%    69%      2.6      31%   |   31%
vault      1       96    31%      30%    39%      2.2      60%   |   63%
vault      2      110    23%      31%    46%      2.2      49%   |   58%
vault      3      110     7%      32%    61%      2.3      40%   |   38%
hidden     1       62    18%      42%    40%      2.0      68%   |   52%
hidden     2       62    10%      34%    56%      2.5      55%   |   32%
hidden     3       72     6%      28%    67%      2.4      39%   |   28%
cascade    1       72    15%      40%    44%      2.0      64%   |   47%
cascade    2       70    14%      30%    56%      2.2      49%   |   40%
cascade    3       80     3%      38%    60%      2.3      43%   |   38%
elite      1       70     7%      61%    31%      1.5      69%   |   69%
elite      2       76     3%      42%    55%      1.9      37%   |   53%
elite      3      186     6%      16%    78%      2.6      23%   |   22%
boss       3      267    12%      22%    66%      2.5      34%   |   34%

all: 1713 turns — idle 13%, forced 28%, open 59%, 2.3 close choices a turn
```

About two turns in five are dull, and tier 1 is the worst: in a tier-1 vault or elite, most turns either do not matter or have one clear answer. This is the number the next steps (rules for places, missions that are not fights, moves that pilots make together) are meant to bring down.

## Using them

```
node tools/sim.js 40                        both players on the same missions, and the gap (about 75 s)
node tools/sim.js 40 missions --player weak the heuristic alone (a second)
npm run audit                               the ability audit, played by the look-ahead player (about a minute, on four cores)
node tools/audit.js --player weak           the audit as it was before 2.2.0
```

In the playtest build, **Plan** in a mission's top bar shows what the look-ahead player would do with the turn, and can play it.

The numbers are in [`BALANCE.md`](BALANCE.md).
