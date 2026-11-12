# Extending the game (engineering guide)

The game ships as one HTML file built from a handful of plain scripts; everything outside the UI also runs in Node with no DOM. The design rule from v1.0 holds in code: **content is data, rules are verbs.**

## Files

| file | role |
|---|---|
| `src/data/cards.js` | the 99 trait cards — two faces each, P/E formulas as functions, verb recipes |
| `src/data/world.js` | rules constants, lanes, gear, consumables, boons, bestiary, mission generators, Tide Map, events, pre-made heroes, flavor |
| `src/engine/engine.js` | dice economy, track, damage pipeline, the verbs (`T.applyEffect`), movement and force, reveal, traps/zones/decoys, objectives, hazards, round structure |
| `src/engine/ai.js` | enemy intent selection and execution per policy; the heuristic hero autoplayer |
| `src/engine/run.js` | draft, UP allocation, Tide Map, rewards, haven, events, save/load |
| `src/ui/core.js`, `src/ui/mission.js`, `src/ui/style.css` | screens, SVG board, panels, targeting, animations, tiny synth |
| `src/manifest.json`, `src/index.template.html` | load order and the HTML shell the build fills in |
| `tools/` | build, dev server, headless harness, simulators, card catalog and ability audit generators, UI driver |
| `test/` | `node --test` suites: data integrity, engine rules, missions, runs, build, UI smoke |

All scripts attach to one global namespace, `T` (`window.T` in the browser, `global.T` in Node). Load order is `src/manifest.json`; a new source file must be added there.

**After any change:** `npm run check` (build + tests). After changing cards, enemies or missions also run `npm run docs` to regenerate `CARDS.md` and `ABILITY_AUDIT.md`, and `node tools/sim.js 20` to see what moved.

## Adding a card

```js
C('owl','owl_newcard','Card Name','S', 0,
  { n:'Phys Name', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
    fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P}],
    txt:(P,E)=>`Melee ${2+P}.` },
  { n:'Eth Name', ap:2, el:1, cd:3, dur:0, tgt:'node_tele',
    fx:[{v:'teleport', reach:(P,E)=>1+E, height:true}],
    txt:(P,E)=>`Blink up to ${1+E}, height included.` },
  'Flavor line.');
```

Rules of the grammar: the P face scales a physical magnitude (`base + P`); the E face unlocks a capability that scales with E (P may scale a mundane sub-part). The design intends that capability to exist only at E ≥ 1; the engine does not enforce it — `T.canPlay` has no E check, so an Ethereal face can be played at E 0 with its E-0 numbers (a known issue; decide the rule before relying on either behaviour). Magnitudes are functions so tooltips show resolved numbers. `el` is the card's etherion; a face may override with `elt`. `tgt` picks the targeting flow (`self`, `party`, `ally`, `foe_melee`, `foe_los`, `foe_any`, `foe_r2`, `foe_r3`, `foe_or_ally_adj`, `node_adj`, `node_r2`, `node_r3`, `node_move`, `node_tele`, `node_climb`). The **litmus test** still applies: if you can only describe the card by naming an enemy ability, it's a key — redesign it as a general verb. The full ability rules are in `docs/design/00-pillars.md`; `test/data.test.js` enforces the mechanical ones (physical faces cost no etherion, ethereal faces cost at least one, every face fires, text resolves at every P/E).

## The verbs (fx.v) the engine understands

`strike` (melee/los/area/lane_all/nodeArea; pierce, trueDmg, chain/chainDmg, nearest, onKill, stripShield, revealTarget) · `execute` · `stripShield` · `dot` · `move` (n, ignoreFoes, toward, free, noTrap) · `teleport` (reach, height, anyTerrain, dest:'adjTarget', carryAlly) · `climb` · `swap` · `rally` · `force` (push/pull/choose, n, area, radius, los) · `reveal` (radius, dur, findObjective, hintObjective) · `locate` · `mark` (nearest/area) · `expose` · `studied` · `hidden` (dur, canMove, party+radius) · `shield` (val, dur, all, party, allyRange, min) · `anchor` (who: self/foe/ally/target, held, adjacent) · `weaken` (area: adj/all/lane/radius/adjParty) · `slow` · `slowSelf` · `empower` (val, uses, kind, pierce, party, target:'ally') · `preempt` · `counter` · `thorns` · `stasis` · `hover` · `weightless` · `hazardImmune` · `statusImmune` · `guard` · `morph` · `rest` · `freecast` · `phoenix` · `absorb` · `ambushTrap` · `aura` (reveal/digest) · `heal` (party, target, doubleIfLow, ifOnHazard/elseVal) · `revive` · `cleanse` · `mint` · `draw` · `reroll` · `hasten` · `clock` · `engine` (regen/draw/ap) · `trap` (dmg, anchor, counted, noTele, remote) · `zone` · `decoy` (here, strike) · `clearHazard` · `interact` (range, height) · `redirect`.

Conditions: `ifAnchored`, `ifOnHazard`, `ifAdjacent` and `ifE` are honoured by `strike`, `heal` and area `dot` only; on any other verb they are silently ignored, and `ifHpBelow` is not read at all (known issues — two cards are stronger than their text because of this). Likewise `anyTerrain` on `teleport`, `los` on `force` and `height` on `interact` are accepted in recipes but not read by the engine. Adding a verb = one `case` in `T.applyEffect` and, if it's a lasting state, a `describeState` line for tooltips and (optionally) a tick rule in `roundEnd`.

## Adding an enemy

Add a bestiary entry in `T.ENEMIES` (hp/dmg arrays by tier, speed, shield, hidden, anchored, spawnEvery) and a `policy` name; then a `case` in `T.chooseIntents` (what it declares) — execution is generic by ability `kind` (`melee`, `los`, `area`, `brace`, `hide`, `summon`, `teleStrike`, `move`) with optional `push`, `pull`, `anchor`, `weaken`, `heal`, `ambush`.

## Adding a mission archetype

Add a generator to `T.MISSIONS`: build a board with `gridBoard(rng, cols, rows)` (+ `addHeight`), place `starts`, `enemies`, special nodes (`objective`, `spawn`, `hazard`), and return `{board, starts, enemies, objective, clock, spawns, hazardSpread, bonus}`. The entry itself also needs `title` (an array of names to pick from — `T.launchMission` throws without it) and `blurb`. Objective kinds the engine resolves: `hold`, `vault` (+lever/ramp), `find` (caches), `valve`, `kill`. New kinds need a branch in `doInteract`/`roundEnd`/`checkEnd`. Then add the archetype to `genTideMap`'s row tables, to the UI's `NODE_ICON/NODE_NAME`, and to `ARCHETYPES` in `tools/harness.js` so the simulators and tests cover it.

## Adding gear, boons, events

Gear: an entry in `T.GEAR` with two abilities using the same verb recipes (costs in ◇, own `cd`). Boons: an entry in `T.BOONS`. Only the `face` hook (re-face a die) is read generically; every other boon is applied by its `id` at the place it matters (`T.hasBoon(h, 'momentum')` and so on), so a new boon needs a line of engine code where it applies — reusing an existing `hook` name does nothing. Events: an entry in `T.EVENTS` with options whose `fx` keys the run layer already understands (`crystals`, `up`, `healAll`, `damageOne`, `nextElite`, `skipNext`, `bossBonusHp`, `boon`, `boonRandom`, `affinityRandom`, `audit`, `respec`, `cardPick`, `tradeCard`).

## Where to take it next

See `docs/ROADMAP.md`.
