# The tree of life the clades sit on

Since 2.139 (Garrett, 2026-11-24: "respect modern taxonomy better. e.g. label raptors as the group for owls and birds of prey. hyenas should be grouped with cats") every clade sits on a tree of real groups of living things, `T.TAXA` in `src/data/taxonomy.js`. Each group has a common name and a scientific one; clade ids never change, so the file only says where each one sits.

**What the tree says.** Whales are even-toed hoofed mammals; birds are reptiles; the hyena is a cat-like carnivore (Feliformia), not a dog; the walrus, the raccoon, the weasel kin and the dog family are dog-like carnivores (Caniformia); the pangolin is the carnivores' nearest relative; the armadillo and the sloth are xenarthrans, and the hedgehog is neither; the owls and the hawks and eagles are the Raptors; the peacock is landfowl with the turkey; the pelican sits with the herons and ibises; the jellyfish is a cnidarian, not a mollusc; crustaceans, insects and the scorpion are all arthropods.

**Where it shows.** The pilot maker groups clades under the groups marked `show`, in the tree's order, each headed by its common and scientific name (`src/ui/crew.js`). A clade's `branch` is that group's name, and its `taxon` is its own group; `T.lineage(sp)` lists every group from its own up to Living things.

**Shared traits.** A trait shared by descent names its group as `kin` (shown on the card in place of the clade), and every clade carrying it descends from that group: Killing Bite is the cat-like carnivores', Echolocation the whales'. A few traits are shared by a way of life instead: animals that are not each other's closest kin but meet the same world the same way. Those are `T.GUILDS`: pack runners (the dog family and the hyena), marine mammals (whales and the walrus), armoured and slow, waders, seabirds and armoured reptiles. A `variant` clade (the ostrich, the seahorse, the tree frog, the jellyfish) may carry another branch's trait as its own take on it. `test/data.test.js` holds all of this: every clade on the tree, every kin a group or a way of life, every carrier in it.

**Every clade still has a trait of its own** that no other clade in its shown group carries.

## The grey wolf and the raccoon (2.139)

- **Grey Wolf** (`wolf`, dog family): Keen Nose, Pack Howl and Long Trot as a pack runner, Pin Down from the dog family, and its own Relay Chase (signature), Test the Herd, Territory, Harry and Alpha Pair. Six painted crew pilots already had wolf as a clade and are now fully playable.
- **Raccoon** (`raccoon`, weasel kin): Dense Fur, Headfirst Descent (it turns its hind feet round to climb down, like the ocelot and the red panda) and Scavenger's Luck (shared with the jackal), and its own Feeling Paws (signature), Clever Latch, Bandit Mask, Quick Hands, Dousing and Climb Anything.

Both have painted heads (portrait sheet 6) and painted ability faces (ability sheets 119 to 121), made in Figma Weave with Nano Banana 2 Lite in Garrett's workspace.
