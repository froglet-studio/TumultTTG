# 11 · Clades for every painted animal

*Status: the sharing rule is built (2.42.0, `docs/reference/RUN_AND_ECONOMY.md`); the Primates (2.43.0), the Cats (2.47.0), the Dogs and hyenas and Weasel kin (2.49.0), the Sea mammals (2.50.0), the Hoofed animals (2.51.0), the Gnawers (2.52.0), the Armoured and slow (2.53.0), the Pouched and egg-laying (2.54.0), the Birds of prey and owls (2.55.0), the Waders (2.56.0), the Seabirds (2.57.0), the Perching and bright birds (2.58.0), the Ground birds (2.59.0), the Lizards (2.60.0), the Crocodiles and tortoises (2.61.0), the Amphibians (2.62.0), the Fish (2.63.0), the Molluscs and jellies (2.64.0), the Crustaceans (2.65.0), and the Insects and arachnids (2.66.0) are built, and since 2.139 the grey wolf and the raccoon, with every clade placed on the tree of modern phylogeny (`docs/reference/TAXONOMY.md`). Every other branch below is a proposal until it ships. Garrett's direction (2026-11-16): every animal painted on a Cosmic Shore pilot becomes a clade, all 80 of them.*

## The rule

Garrett: "the full 9 card bloodline is correct but that is for a species, as you work your way up the taxonomical structure then you share traits."

- **Nine traits per clade, as before.** A clade's nine are drawn from the branches of the tree it sits on, plus traits of its own.
- **Traits are written once, at the branch they belong to.** Every cat carries the cat traits; every primate carries Grooming. A trait written for a branch names it (`kin` in `src/data/clades.js`).
- **Each clade has at least one trait that no clade on its branch carries.** The cheetah's Hyperspeed (travel exactly 4 spaces) is the cheetah's alone among cats. `test/data.test.js` holds this.
- **Kin follows descent, or a shared way of life** (2.139): a trait names the group it is written for, and every clade carrying it descends from that group (`src/data/taxonomy.js`); a few traits are shared by a way of life instead (`T.GUILDS`: pack runners, waders, seabirds, marine mammals). The hyena is a cat-like carnivore, so it carries the cats' Killing Bite by descent and the dogs' Keen Nose, Pack Howl and Long Trot as a pack runner.
- **Unrelated animals may carry a variant** of a trait for their own surroundings: a falcon's or a marlin's take on Hyperspeed is a separate card with its own text, not the cheetah's card.
- **Primates share some of Human's traits**, since every pilot is a third human. Human's own nine stay as they are.
- **A pilot whose two clades share a trait holds it once.** Taking it again gives 2 UP bound to that card (`RULES.DOUBLE_UP`); that is the only way a card comes up twice.

## The branches, in the order they are built

One pull request per branch, each with its audit and simulation numbers.

| Branch | Painted animals |
|---|---|
| Primates (2.43) | orangutan, lemur, mandrill |
| Cats (2.47) | cheetah, tiger, lynx, caracal, ocelot |
| Dogs and hyenas (2.49) | fox, fennec, coyote, jackal, hyena |
| Weasel kin (2.49) | otter, badger, red_panda |
| Sea mammals (2.50) | orca, narwhal, walrus |
| Hoofed animals (2.51) | bison, yak, ram, moose, deer, oryx, zebra |
| Gnawers and hares (2.52) | mouse, porcupine, hare, black_hare |
| Armoured and slow (2.53) | armadillo, pangolin, hedgehog, sloth |
| Pouched and egg-laying (2.54) | kangaroo, opossum, platypus |
| Birds of prey and owls (2.55) | eagle, hawk, owl |
| Waders (2.56) | crane, heron, egret, ibis, flamingo, shoebill |
| Seabirds (2.57) | pelican, puffin, booby |
| Perching and bright birds (2.58) | raven, parrot, toucan, hummingbird, peacock |
| Ground birds (2.59) | ostrich, turkey |
| Lizards (2.60) | gecko, chameleon, basilisk, horned_lizard |
| Crocodiles and tortoises (2.61) | crocodile, tortoise |
| Amphibians (2.62) | axolotl, newt, tree_frog |
| Fish (2.63) | koi, clownfish, lionfish, seahorse, eel |
| Molluscs and jellies (2.64) | octopus, snail, jellyfish |
| Crustaceans (2.65) | lobster, mantis_shrimp |
| Insects and arachnids (2.66) | beetle, butterfly, firefly, mantis, scorpion |
| Grey wolf and raccoon (2.139) | wolf, raccoon |

The branch names above are the order the clades were built in. Since 2.139 the pilot maker groups them by the tree of life instead (`docs/reference/TAXONOMY.md`): the hyena with the cats, the walrus and the raccoon with the dogs and weasels among the dog-like carnivores, the whales with the hoofed mammals, the owls with the hawks and eagles as Raptors.

The table gives clade ids, which never change, because saves and canon notes are keyed on them. Display names follow Cosmic Shore's (Garrett, 2026-11-20): `badger` is the **Ratel**, `orca` the **Orca**, and `hawk` the **Red-tailed Hawk**, a real species rather than a family.

The five painted animals that are already clades (octopus, eel, axolotl, owl, gecko) keep their nine and gain kin as their branch is built. The five unpainted clades (jerboa, hopper, flytrap, cordyceps, tardigrade) stay until Garrett decides otherwise; the jerboa sits on the Gnawers branch and lends the gnawers five of its traits.

## After the branches

The pre-made heroes are painted Cosmic Shore pilots (2.67.0; Garrett chose the pilots' names): Rosh is octopus and raven (BANDIT), Ekora otter and eel (FLUME), Nedira hedgehog and tortoise (CITADEL), Echo mouse and owl (ECHO), Karenth axolotl and koi (VOLT), Slingshot flamingo and mantis shrimp (SLINGSHOT). Each keeps the old hero's role and title. Still a proposal: the draft gains a way to start from a painted pilot.
