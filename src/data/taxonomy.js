/* ============================================================================
   TUMULT — DATA: THE TREE OF LIFE THE CLADES SIT ON (2.139)
   ----------------------------------------------------------------------------
   Where each clade sits in modern phylogeny (Garrett, 2026-11-24: "respect modern
   taxonomy better... raptors as the group for owls and birds of prey. hyenas
   should be grouped with cats"). Each node of T.TAXA is a real group of living
   things, with its common name and its scientific one; `show` marks the level
   the pilot maker groups clades by (a clade's `branch`). Whales sit inside the
   even-toed hoofed mammals, birds inside the reptiles, hyenas among the cat-like
   carnivores, the raccoon and the walrus among the dog-like ones.

   A trait shared by descent names the group it is written for (`kin`), and every
   clade that carries it descends from that group. A few traits are shared by a
   way of life instead (waders, seabirds, marine mammals, pack runners): animals
   that are not each other's closest kin but meet the same world the same way.
   Those are T.GUILDS, each with the clades it holds. A `variant` clade (the
   ostrich, the seahorse...) may carry another branch's trait as its own take on it.
   Clade ids never change; this file only says where they sit.
   ========================================================================== */
(function (T) {
  T.TAXA = {};
  T.TAXON_ORDER = [];
  /** A group: its id, names, parent, and the clades placed directly in it. */
  const N = (id, name, sci, parent, o) => {
    T.TAXA[id] = Object.assign({ id, name, sci, parent: parent || null }, o || {});
    T.TAXON_ORDER.push(id);
  };
  const G = { show: true };

  N('life', 'Living things', 'Biota');
  N('plants', 'Plants', 'Plantae', 'life', Object.assign({ of: ['flytrap'] }, G));
  N('fungi', 'Fungi', 'Fungi', 'life', Object.assign({ of: ['cordyceps'] }, G));
  N('animals', 'Animals', 'Animalia', 'life');
  N('cnidarians', 'Jellyfish and corals', 'Cnidaria', 'animals', Object.assign({ of: ['jellyfish'] }, G));
  N('bilaterians', 'Bilaterians', 'Bilateria', 'animals');

  // ── protostomes ──
  N('protostomes', 'Protostomes', 'Protostomia', 'bilaterians');
  N('molluscs', 'Molluscs', 'Mollusca', 'protostomes', Object.assign({ of: ['octopus', 'snail'] }, G));
  N('panarthropods', 'Panarthropods', 'Panarthropoda', 'protostomes');
  N('tardigrades', 'Water bears', 'Tardigrada', 'panarthropods', Object.assign({ of: ['tardigrade'] }, G));
  N('arthropods', 'Arthropods', 'Arthropoda', 'panarthropods', G);
  N('arachnids', 'Arachnids', 'Arachnida', 'arthropods', { of: ['scorpion'] });
  N('pancrustaceans', 'Crustaceans and insects', 'Pancrustacea', 'arthropods');
  N('crustaceans', 'Crustaceans', 'Malacostraca', 'pancrustaceans', { of: ['lobster', 'mantis_shrimp'] });
  N('insects', 'Insects', 'Insecta', 'pancrustaceans', {
    of: ['hopper', 'beetle', 'butterfly', 'firefly', 'mantis'],
  });

  // ── vertebrates ──
  N('vertebrates', 'Vertebrates', 'Vertebrata', 'bilaterians');
  N('rayfins', 'Ray-finned fish', 'Actinopterygii', 'vertebrates', Object.assign({ of: ['eel', 'koi', 'clownfish', 'lionfish', 'seahorse'] }, G));
  N('tetrapods', 'Four-limbed animals', 'Tetrapoda', 'vertebrates');
  N('amphibians', 'Amphibians', 'Amphibia', 'tetrapods', G);
  N('salamanders', 'Salamanders', 'Caudata', 'amphibians', { of: ['axolotl', 'newt'] });
  N('frogs', 'Frogs', 'Anura', 'amphibians', { of: ['tree_frog'] });
  N('amniotes', 'Amniotes', 'Amniota', 'tetrapods');

  // reptiles, birds among them
  N('reptiles', 'Reptiles and birds', 'Sauropsida', 'amniotes');
  N('squamates', 'Lizards', 'Squamata', 'reptiles', Object.assign({ of: ['gecko', 'chameleon', 'basilisk', 'horned_lizard'] }, G));
  N('archelosaurs', 'Turtles, crocodiles and birds', 'Archelosauria', 'reptiles');
  N('turtles', 'Turtles', 'Testudines', 'archelosaurs', Object.assign({ of: ['tortoise'] }, G));
  N('archosaurs', 'Crocodiles and birds', 'Archosauria', 'archelosaurs');
  N('crocodilians', 'Crocodilians', 'Crocodilia', 'archosaurs', Object.assign({ of: ['crocodile'] }, G));
  N('birds', 'Birds', 'Aves', 'archosaurs');
  N('palaeognaths', 'Ostriches and kin', 'Palaeognathae', 'birds', Object.assign({ of: ['ostrich'] }, G));
  N('landfowl', 'Landfowl', 'Galliformes', 'birds', Object.assign({ of: ['turkey', 'peacock'] }, G));
  N('neoaves', 'Neoaves', 'Neoaves', 'birds');
  N('strisores', 'Swifts and hummingbirds', 'Apodiformes', 'neoaves', Object.assign({ of: ['hummingbird'] }, G));
  N('mirandornithes', 'Flamingos and grebes', 'Mirandornithes', 'neoaves', Object.assign({ of: ['flamingo'] }, G));
  N('gruiforms', 'Cranes and rails', 'Gruiformes', 'neoaves', Object.assign({ of: ['crane'] }, G));
  N('shorebirds', 'Shorebirds and auks', 'Charadriiformes', 'neoaves', Object.assign({ of: ['puffin'] }, G));
  N('waterbirds', 'Waterbirds', 'Aequornithes', 'neoaves', G);
  N('suliforms', 'Gannets and boobies', 'Suliformes', 'waterbirds', { of: ['booby'] });
  N('pelecaniforms', 'Pelicans, herons and ibises', 'Pelecaniformes', 'waterbirds', {
    of: ['pelican', 'heron', 'egret', 'ibis', 'shoebill'],
  });
  N('telluraves', 'Land birds', 'Telluraves', 'neoaves');
  N('afroaves', 'Afroaves', 'Afroaves', 'telluraves');
  N('raptors', 'Raptors', 'Accipitriformes and Strigiformes', 'afroaves', G);
  N('accipitriforms', 'Hawks and eagles', 'Accipitriformes', 'raptors', { of: ['eagle', 'hawk'] });
  N('owls', 'Owls', 'Strigiformes', 'raptors', { of: ['owl'] });
  N('piciforms', 'Toucans and woodpeckers', 'Piciformes', 'afroaves', Object.assign({ of: ['toucan'] }, G));
  N('australaves', 'Parrots and songbirds', 'Psittacopasserae', 'telluraves', Object.assign({ of: ['parrot', 'raven'] }, G));

  // mammals
  N('mammals', 'Mammals', 'Mammalia', 'amniotes');
  N('monotremes', 'Monotremes', 'Monotremata', 'mammals', Object.assign({ of: ['platypus'] }, G));
  N('marsupials', 'Marsupials', 'Marsupialia', 'mammals', Object.assign({ of: ['kangaroo', 'opossum'] }, G));
  N('placentals', 'Placental mammals', 'Placentalia', 'mammals');
  N('xenarthrans', 'Sloths and armadillos', 'Xenarthra', 'placentals', Object.assign({ of: ['sloth', 'armadillo'] }, G));
  N('euarchontoglires', 'Primates and rodents', 'Euarchontoglires', 'placentals');
  N('primates', 'Primates', 'Primates', 'euarchontoglires', Object.assign({ of: ['human', 'orangutan', 'lemur', 'mandrill'] }, G));
  N('glires', 'Rodents and hares', 'Glires', 'euarchontoglires', G);
  N('rodents', 'Rodents', 'Rodentia', 'glires', { of: ['jerboa', 'mouse', 'porcupine'] });
  N('hares', 'Hares', 'Lagomorpha', 'glires', { of: ['hare', 'black_hare'] });
  N('laurasiatheres', 'Laurasiatheres', 'Laurasiatheria', 'placentals');
  N('eulipotyphla', 'Hedgehogs and shrews', 'Eulipotyphla', 'laurasiatheres', Object.assign({ of: ['hedgehog'] }, G));
  N('ungulates', 'Hoofed mammals and whales', 'Euungulata', 'laurasiatheres', G);
  N('perissodactyls', 'Odd-toed hoofed mammals', 'Perissodactyla', 'ungulates', { of: ['zebra'] });
  N('artiodactyls', 'Even-toed hoofed mammals', 'Artiodactyla', 'ungulates');
  N('ruminants', 'Ruminants', 'Ruminantia', 'artiodactyls');
  N('bovids', 'Bovids', 'Bovidae', 'ruminants', { of: ['yak', 'bison', 'oryx', 'ram'] });
  N('deer', 'Deer', 'Cervidae', 'ruminants', { of: ['moose', 'deer'] });
  N('whales', 'Whales', 'Cetacea', 'artiodactyls', { of: ['orca', 'narwhal'] });
  N('ferae', 'Carnivores and pangolins', 'Ferae', 'laurasiatheres');
  N('pangolins', 'Pangolins', 'Pholidota', 'ferae', Object.assign({ of: ['pangolin'] }, G));
  N('carnivores', 'Carnivores', 'Carnivora', 'ferae');
  N('feliforms', 'Cat-like carnivores', 'Feliformia', 'carnivores', G);
  N('cats', 'Cats', 'Felidae', 'feliforms', { of: ['lynx', 'caracal', 'ocelot', 'tiger', 'cheetah'] });
  N('hyenas', 'Hyenas', 'Hyaenidae', 'feliforms', { of: ['hyena'] });
  N('caniforms', 'Dog-like carnivores', 'Caniformia', 'carnivores', G);
  N('canids', 'Dog family', 'Canidae', 'caniforms', { of: ['fennec', 'fox', 'jackal', 'coyote', 'wolf'] });
  N('musteloids', 'Weasel kin', 'Musteloidea', 'caniforms', { of: ['otter', 'badger', 'red_panda', 'raccoon'] });
  N('pinnipeds', 'Seals and walruses', 'Pinnipedia', 'caniforms', { of: ['walrus'] });

  /** Ways of life shared across the tree: a trait written for one names it as its `kin`. */
  T.GUILDS = {
    'Pack runners': {
      why: 'Long-legged hunters that run prey down together: the dog family, and the hyenas, which are cat-like carnivores that came to the same life.',
      of: ['fennec', 'fox', 'jackal', 'coyote', 'wolf', 'hyena'],
    },
    'Marine mammals': {
      why: 'Mammals that went back to the sea: whales from the hoofed mammals, the walrus from the dog-like carnivores.',
      of: ['walrus', 'orca', 'narwhal'],
    },
    'Armoured and slow': {
      why: 'Diggers and curlers in armour or spines, from three branches of the mammals.',
      of: ['sloth', 'armadillo', 'pangolin', 'hedgehog'],
    },
    Waders: {
      why: 'Long-legged birds of the shallows, from the cranes, the pelican order and the flamingos.',
      of: ['crane', 'heron', 'egret', 'ibis', 'shoebill', 'flamingo'],
    },
    Seabirds: {
      why: 'Birds that live off the open sea, from the auks, the gannets and the pelicans.',
      of: ['puffin', 'pelican', 'booby'],
    },
    'Armoured reptiles': {
      why: 'Reptiles in plate and shell: the crocodiles and the turtles.',
      of: ['crocodile', 'tortoise'],
    },
  };

  /** The groups a clade sits in, from its own up to Living things. */
  T.lineage = (sp) => {
    const out = [];
    let id = T.SPECIES[sp] && T.SPECIES[sp].taxon;
    while (id) {
      out.push(id);
      id = T.TAXA[id].parent;
    }
    return out;
  };
  /** True when clade `sp` may carry a trait written for `kin`: a group it descends from, or a way of life it shares. */
  T.inKin = (sp, kin) =>
    T.lineage(sp).some((id) => T.TAXA[id].name === kin) || !!(T.GUILDS[kin] && T.GUILDS[kin].of.includes(sp));

  // Place every clade: `taxon` is its own group, `branch` the group the pilot maker shows it under.
  for (const id of T.TAXON_ORDER)
    for (const sp of T.TAXA[id].of || []) {
      if (!T.SPECIES[sp]) continue;
      T.SPECIES[sp].taxon = id;
      let g = id;
      while (g && !T.TAXA[g].show) g = T.TAXA[g].parent;
      T.SPECIES[sp].branch = g ? T.TAXA[g].name : T.TAXA[id].name;
    }
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
