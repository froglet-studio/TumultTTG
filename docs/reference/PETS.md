# Pets

A pet is a sidekick, the way Unmatched has them: a small unit of its own on the board, with its own vitality. Foes can see it, target it and hit it. It is not a decoy, because it lasts the whole mission and it acts. Built in 2.105.0 from Garrett's brief of 2026-11-21. The rules are in `src/data/pets.js`, the board in `src/engine/engine.js` (PETS), the run in `src/engine/run.js` (PETS), and the tests in `test/pets.test.js`.

## At the table

- **Finding one.** A haven may have a stray (`T.havenStock`). Adopting it costs 4 ◇ (`T.PET.PRICE`). A pilot keeps **two pets at most** (`T.PET.MAX`).
- **What it is.** A hybrid of three clades, none of them human. A pilot is human plus two clades.
- **Its card.** When the pet is found, one trait is drawn from each of its three clades, and the three traits' **Physical** faces make one pet card with three faces (P, P2, P3). It has no Ethereal face. The card sits in the pilot's kit and **counts toward the nine**. A full kit takes a pet only in exchange for a card, and every point on that card is refunded. The pet card grows with P like any Physical face; E never goes on it.
- **Playing it.** The pilot pays for a face with their own dice. **Any one face sends the whole card to the pilot's track** for that face's cooldown. Everything on the face happens **from the pet**: its range, its strikes, its steps, and any state it puts on "you". What a face does to dice, the track or the purse still goes to the pilot (`T.PET_PILOT_VERBS`: mint, draw, reroll, haste, engine, rest, execute).
- **Heel.** For 1 AP the pet walks up to 3 (`T.PET.SPEED`). It can pass through the squad but not through foes.
- **Sharing a node.** A pet may stand on its own pilot's node, and the pilot may stand on the pet's. Nobody else can stop there. **On its standing pilot's node, nothing can hurt the pet**, and foes do not target it there. A pet sets out each mission on its pilot's node, at full vitality (8, `T.PET.HP`).
- **Death.** At 0 vitality a pet dies and leaves the board. When the mission ends, the pet and its card leave the kit, and every point on the card is refunded.
- **Between expeditions.** Pets stay with the expedition they were found on, as gear does. A made pilot's record keeps only its traits (`T.madeFrom`).

## Data

- A pet is kept on its pilot as plain data: `h.pets = [{ id, name, species: [3 clades], traits: [3 card ids], card }]`. `card` is `pet~<id>~<trait>~<trait>~<trait>`. `T.registerPet` builds that card from the record and puts it in `T.CARD`, so every lookup by id finds it. It is not in `T.CARDS`, the clades' catalog, and it counts toward no clade's 3-of-9 (`T.cladeSlots`).
- On the board, `m.pets` holds `{ kind: 'pet', uid, owner (the pilot's uid), pid, species, name, hp, maxHp, pos, states, dead }`.
- `T.faceKeys(cardId)` gives `['P', 'P2', 'P3']` for a pet card and `['P', 'E']` for a trait.
- A new random stream, `'pets'`, draws strays, so the gear a haven offers is the same either way.
- The save version is 29. Older saves (28 and before) gain `pets: []` on every hero and on a mission in progress.

## How the players play them

The look-ahead player plays every pet face and Heel (an action `{ t: 'heel', hero, pet, node }`). It weighs a pet's vitality at 0.5 a point, and a dead pet at −12 (`T.EVAL.petHp`, `petDead`), because the card is lost for good. The heuristic plays pet faces through its usual rules, but never uses them to move its pilot, and it never Heels. Neither simulated player adopts a stray on a simulated run, so `node tools/sim.js` measures pets only with `--pets`, which gives every pilot one pet in place of a card.

## With the other systems

- **Equipment cards** (the tech weapons thread) share the slot rule: anything in `h.cards` counts toward the nine. `T.cardSource(h, id)` says where a card comes from.
- **Vehicles** (the pocket vehicles thread): a pet takes no seat in a vehicle. Riding pets, whose position follows the vehicle's, come with the vehicles.
