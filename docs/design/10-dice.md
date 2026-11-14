# 10 · Dice kinds — a plain die, an ethereal die, and a die for each element

*Status: built in 2.29.0. Garrett's answers (2026-11-14): no AP×2 on the plain die; four dice a turn; how pilots get special dice stays open-ended (2.29 tries awakened cards, Affinity boons and Omni Core); the symbols are Cosmic Shore's, since Froglet's Hypersea games share resources freely. How it works today: `docs/reference/RUN_AND_ECONOMY.md` (Dice).*

## Why

Two out of five turns give a pilot no real choice (`node tools/turns.js 10`: 41% at 2.28.0). Garrett wants more AP for a pilot who flies alone and a higher floor on rolled elements, so that a roll opens more cards. He also wants the dice to carry a pilot's identity: some pilots should feel like mages. Every face today comes from one d12 (Mass, Charge, Space, Time, Omni, AP×2, six AP), so every pilot rolls the same odds.

## The dice

Every die shows the same symbols: AP, Mass, Charge, Space, Time and Omni. Omni still pays for any etherion. The element symbols are Cosmic Shore's element petals, with a key beside the selected pilot's dice.

| Die | Faces | Per die rolled |
|---|---|---|
| **Plain**, d20 | Mass, Charge, Space, Time, Omni, 15 × AP | 0.75 AP, 0.25 etherion |
| **Ethereal**, d12 | 2 each of AP, Omni, Mass, Charge, Space, Time | 0.33 AP, 0.83 etherion |
| **Mass**, d8 (and one each for Charge, Space, Time) | 4 × its own element, then one each of the other three and Omni. No AP | 0 AP, 1 etherion, half of them its own element |

For comparison, today's d12 gives 0.67 AP and 0.42 etherion a die.

A pilot rolling only plain dice gets more AP than today and fewer elements. A pilot whose pool holds ethereal or element dice trades AP for etherions, and an element die almost always pays for that pilot's own colour. That trade is the mage feel, and it makes a pilot's dice part of who they are.

## The pool stays 15 dice

The settled rule holds: pool + banked = 15, always. Each pilot starts with 15 plain dice. Abilities, boons and gear **swap** a plain die in the pool for an ethereal or element die. Affinity boons already work this way: they turn one AP face into an element face.

An ability that gives "an extra die this turn" **mints** one, rolled on the spot. A minted die is temporary and never counts toward the 15, as minted faces are today.

## At the table

d20, d12 and d8 are standard dice. Custom faces are best. Until then, use a reference strip for each kind, as in `08-tabletop-edition.md`.

## Open questions for Garrett (defaults in bold)

1. **Does the plain d20 keep two AP×2 sides,** or is every AP side worth 1?
2. How many dice are rolled a turn: **4**, or 3 as today? With 3 plain dice, a pilot gets 2.55 AP and 0.75 etherion a turn. With 4, 3.4 AP and 1.0 etherion.
3. How does a pilot get its first special dice: **awakening a card (E 1) swaps one plain die for that card's element die**, and ethereal dice come from boons and gear? Or only through rewards?
4. The symbols: may this repository copy Cosmic Shore's element symbol art (MIT, as the pilot art is), with the licence noted in `assets/README.md`?
