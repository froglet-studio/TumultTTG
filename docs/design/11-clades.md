# 11 · Clades for every painted animal

*Status: the sharing rule is built (2.42.0, `docs/reference/RUN_AND_ECONOMY.md`); the Primates are built (2.43.0). Every other branch below is a proposal until it ships. Garrett's direction (2026-11-16): every animal painted on a Cosmic Shore pilot becomes a clade, all 80 of them.*

## The rule

Garrett: "the full 9 card bloodline is correct but that is for a species, as you work your way up the taxonomical structure then you share traits."

- **Nine traits per clade, as before.** A clade's nine are drawn from the branches of the tree it sits on, plus traits of its own.
- **Traits are written once, at the branch they belong to.** Every cat carries the cat traits; every primate carries Grooming. A trait written for a branch names it (`kin` in `src/data/clades.js`).
- **Each clade has at least one trait that no clade on its branch carries.** The cheetah's Hyperspeed (travel exactly 4 spaces) is the cheetah's alone among cats. `test/data.test.js` holds this.
- **Unrelated animals may carry a variant** of a trait for their own surroundings: a falcon's or a marlin's take on Hyperspeed is a separate card with its own text, not the cheetah's card.
- **Primates share some of Human's traits**, since every pilot is a third human. Human's own nine stay as they are.
- **A pilot whose two clades share a trait holds it once.** Taking it again gives 2 UP bound to that card (`RULES.DOUBLE_UP`); that is the only way a card comes up twice.

## The branches, in the order they are built

One pull request per branch, each with its audit and simulation numbers.

| Branch | Painted animals |
|---|---|
| Primates (2.43) | orangutan, lemur, mandrill |
| Cats | cheetah, tiger, lynx, caracal, ocelot |
| Dogs and hyenas | fox, fennec, coyote, jackal, hyena |
| Weasels, badgers, red panda | otter, badger, red_panda |
| Sea mammals | orca, narwhal, walrus |
| Hoofed animals | bison, yak, ram, moose, deer, oryx, zebra |
| Gnawers and hares | mouse, porcupine, hare, black_hare |
| Armoured and slow | armadillo, pangolin, hedgehog, sloth |
| Pouched and egg-laying | kangaroo, opossum, platypus |
| Birds of prey and owls | eagle, hawk, owl |
| Waders | crane, heron, egret, ibis, flamingo, shoebill |
| Seabirds | pelican, puffin, booby |
| Perching and bright birds | raven, parrot, toucan, hummingbird, peacock |
| Ground birds | ostrich, turkey |
| Lizards | gecko, chameleon, basilisk, horned_lizard |
| Crocodiles and tortoises | crocodile, tortoise |
| Amphibians | axolotl, newt, tree_frog |
| Fish | koi, clownfish, lionfish, seahorse, eel |
| Molluscs and jellies | octopus, snail, jellyfish |
| Crustaceans | lobster, mantis_shrimp |
| Insects and arachnids | beetle, butterfly, firefly, mantis, scorpion |

The five painted animals that are already clades (octopus, eel, axolotl, owl, gecko) keep their nine and gain kin as their branch is built. The five unpainted clades (jerboa, hopper, flytrap, cordyceps, tardigrade) stay until Garrett decides otherwise.

## After the branches

The pre-made pilots are remapped to painted Cosmic Shore pilots once their clades exist, and the draft gains a way to start from a painted pilot.
