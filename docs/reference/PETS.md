# Pocket pets

A pet is a sidekick, the way Unmatched has them: a small unit of its own on the board, with its own vitality. Foes can see it, target it and hit it. It is not a decoy, because it lasts the whole mission and it acts. Pets are inventory, like pocket vehicles (Garrett, 2026-11-21: "Pocket vehicles and pocket pets. It is all inventory"). Built in 2.109.0 from Garrett's brief of 2026-11-21. The rules are in `src/data/pets.js`, the board in `src/engine/engine.js` (PETS), the run in `src/engine/run.js` (PETS), and the tests in `test/pets.test.js`.

## At the table

- **Finding one.** A haven may have a stray (`T.havenStock`). Adopting it costs 4 ◇ (`T.PET.PRICE`). A pilot keeps **two pets at most** (`T.PET.MAX`).
- **What it is.** A hybrid of three clades, none of them human. A pilot is human plus two clades.
- **Its card.** When the pet is found, one trait is drawn from each of its three clades, and the three traits' **Physical** faces make one pet card with three faces (P, P2, P3). It has no Ethereal face. The card is a card like any other: it **counts toward the nine** when it flies, and otherwise waits in the **reserve** (2.107). With room in the kit it joins the kit; with a full kit it waits in reserve, or flies in place of a card that goes to the reserve with its points. Nothing is refunded. **A pet sets out only when its card is in the kit**; with its card in reserve it stays in the pocket, and `T.changeLoadout` brings it back between missions. The pet card grows with P like any Physical face; E never goes on it.
- **Playing it.** The pilot pays for a face with their own dice. **Any one face sends the whole card to the pilot's track** for that face's cooldown. Everything on the face happens **from the pet**: its range, its strikes, its steps, and any state it puts on "you". What a face does to dice, the track or the purse still goes to the pilot (`T.PET_PILOT_VERBS`: mint, draw, reroll, haste, engine, rest, execute).
- **Heel.** For 1 AP the pet walks up to 3 (`T.PET.SPEED`). It can pass through the squad but not through foes.
- **Sharing a node.** A pet may stand on its own pilot's node, and the pilot may stand on the pet's. Nobody else can stop there. **On its standing pilot's node, nothing can hurt the pet**, and foes do not target it there. A pet sets out each mission on its pilot's node, at full vitality (8, `T.PET.HP`).
- **Death.** At 0 vitality a pet dies and leaves the board, and its card cannot be played for the rest of the mission. It is gone for that mission only: it sets out again, at full vitality, with the next one, its card and the points on it untouched (Garrett, 2026-11-21).
- **Riding.** A pet on its pilot's node gets into a vehicle with them, drives with them and gets out with them, even in a one-seater, and takes no seat (Garrett, 2026-11-21: "a pet on a player will ride with them even in a one seater"). It stays sheltered inside. While it rides, its card plays only Mounted faces (a pet face is Mounted when the trait face it was made from is, `T.isMountedFace`), and it cannot Heel. If the vehicle is wrecked, it is thrown clear with its pilot.
- **Between expeditions.** Pets stay with the expedition they were found on, as gear does. A made pilot's record keeps only its traits (`T.madeFrom`).

## Data

- A pet is kept on its pilot as plain data: `h.pets = [{ id, name, species: [3 clades], traits: [3 card ids], card }]`. `card` is `pet~<id>~<trait>~<trait>~<trait>`. `T.registerPet` builds that card from the record and puts it in `T.CARD`, so every lookup by id finds it. It is not in `T.CARDS`, the clades' catalog, and it counts toward no clade's 3-of-9 (`T.cladeSlots`).
- On the board, `m.pets` holds `{ kind: 'pet', uid, owner (the pilot's uid), pid, species, name, hp, maxHp, pos, states, dead }`.
- `T.faceKeys(cardId)` gives `['P', 'P2', 'P3']` for a pet card and `['P', 'E']` for a trait.
- A new random stream, `'pets'`, draws strays, so the gear a haven offers is the same either way.
- The save version is 30. Older saves (29 and before) gain `pets: []` on every hero and on a mission in progress.

## How the players play them

The look-ahead player plays every pet face and Heel (an action `{ t: 'heel', hero, pet, node }`). It weighs a pet's vitality at 0.5 a point, and a dead pet at −12 (`T.EVAL.petHp`, `petDead`), because its card is lost for the rest of the mission. The heuristic plays pet faces through its usual rules, but never uses them to move its pilot, and it never Heels. Neither simulated player adopts a stray on a simulated run, so `node tools/sim.js` measures pets only with `--pets`, which gives every pilot one pet in place of a card.

## With the other systems

- **Equipment cards** (the tech weapons thread) share the slot rule: anything in `h.cards` counts toward the nine. `T.cardSource(h, id)` says where a card comes from.
- **Vehicles**: a pet takes no seat; see Riding above (`src/engine/vehicles.js`, `petsOn` and `carryPets`).
