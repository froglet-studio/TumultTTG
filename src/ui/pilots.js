/* ============================================================================
   TUMULT — PILOT ART (browser only)
   Art belongs to a clade pair, not to a hero. A pilot is human plus two clades;
   a painting shows one pair, head clade first. A hero is shown with the painting
   of their own pair when one exists, else the nearest stand-in (one that shares
   their clades, the head clade first), else their clades' marks on a disc.
   Tumult and Cosmic Shore share this art: as either game paints a new pair it
   slots in here, and every pair is meant to be supported in the end
   (Garrett, 2026-11-13). The paintings are inlined from assets/ (assets/README.md).
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});

  // Every painting we have, by the Cosmic Shore callsign it was made for. `clades` is the pair, head first;
  // a clade Tumult also has uses Tumult's id (T.SPECIES), so the two games match on the same word.
  U.PILOT_ART = [
    { key: 'BANDIT', name: 'Rosh Rusthook', clades: ['octopus', 'raven'] },
    { key: 'FLUME', name: 'Ekora Hollowbrook', clades: ['otter', 'eel'] },
    { key: 'VOLT', name: 'Karenth Amberweaver', clades: ['axolotl', 'koi'] },
    { key: 'SUNDIAL', name: 'Delmira Stillwater', clades: ['owl', 'pangolin'] },
    { key: 'ECHO', name: 'Echo', clades: ['mouse', 'owl'] },
    { key: 'REAPER', name: 'Reaper', clades: ['gecko', 'mantis'] },
    { key: 'HORNET', name: 'Zeko Mirethorn', clades: ['mantis', 'newt'] },
    { key: 'CITADEL', name: 'Nedira Shellward', clades: ['hedgehog', 'tortoise'] },
    { key: 'ANVIL', name: 'Brikon Copperwright', clades: ['yak', 'beetle'] },
    { key: 'DOE', name: 'Fenlia Moonbell', clades: ['moose', 'fennec'] },
    { key: 'ENSIGN', name: 'Veliane Crestward', clades: ['crane', 'lemur'] },
    { key: 'GALLEON', name: 'Haradek Anchorkeel', clades: ['walrus', 'bison'] },
    { key: 'IVY', name: 'Mathalo Kelpbloom', clades: ['orangutan', 'sloth'] },
    { key: 'MANGER', name: 'Tamako Deephook', clades: ['ibis', 'platypus'] },
    { key: 'NEEDLE', name: 'Ilia Silvergate', clades: ['narwhal', 'seahorse'] },
    { key: 'OPAL', name: 'Quivera Pearlspark', clades: ['chameleon', 'jellyfish'] },
    { key: 'RAMPART', name: 'Obelo Stormstone', clades: ['badger', 'armadillo'] },
    { key: 'TALON', name: 'Wyvendo Waveline', clades: ['lynx', 'jackal'] },
    { key: 'WINGMAN', name: 'Jorin Gullwing', clades: ['puffin', 'pelican'] },
    { key: 'ZODIAC', name: 'Ivelia Starreach', clades: ['ocelot', 'heron'] },
    // Cosmic Shore's crew beyond the callsigns: the same painters, the same rules (Docs/Pilots/art/).
    { key: 'ASTROFOIL', name: 'Astrofoil', clades: ['snail', 'jellyfish'] },
    { key: 'BUSHY', name: 'Bushy', clades: ['horned_lizard', 'hedgehog'] },
    { key: 'COMET', name: 'Comet', clades: ['clownfish', 'lobster'] },
    { key: 'DAMSEL', name: 'Damsel', clades: ['hummingbird', 'lobster'] },
    { key: 'DOZER', name: 'Dozer', clades: ['tree_frog', 'scorpion'] },
    { key: 'FIEST', name: 'Fiest', clades: ['cheetah', 'hyena'] },
    { key: 'FLUX', name: 'Flux', clades: ['oryx', 'orca'] },
    { key: 'JUGGER', name: 'Jugger', clades: ['orca', 'eagle'] },
    { key: 'KRUSH', name: 'Krush', clades: ['coyote', 'turkey'] },
    { key: 'LONGSHIFT', name: 'Longshift', clades: ['black_hare', 'badger'] },
    { key: 'MAESTRO', name: 'Maestro', clades: ['platypus', 'butterfly'] },
    { key: 'MASON', name: 'Mason', clades: ['ostrich', 'porcupine'] },
    { key: 'RIPTIDE', name: 'Riptide', clades: ['zebra', 'lionfish'] },
    { key: 'SCALES', name: 'Scales', clades: ['egret', 'koi'] },
    { key: 'SHRAPNEL', name: 'Shrapnel', clades: ['toucan', 'newt'] },
    { key: 'SIPHON', name: 'Siphon', clades: ['caracal', 'red_panda'] },
    { key: 'SLINGSHOT', name: 'Slingshot', clades: ['flamingo', 'mantis_shrimp'] },
    { key: 'SPARE01', name: 'Korvane Ashwhistle', clades: ['mandrill', 'peacock'] },
    { key: 'SPARE02', name: 'Lunari Hollowreach', clades: ['opossum', 'lynx'] },
    { key: 'SPARE03', name: 'Bellomo Stripewright', clades: ['zebra', 'yak'] },
    { key: 'SPARE04', name: 'Zeria Emberwick', clades: ['fox', 'firefly'] },
    { key: 'SPARE05', name: 'Halven Frostgate', clades: ['hare', 'ram'] },
    { key: 'SPARE06', name: 'Tamsin Dusklight', clades: ['hare', 'tiger'] },
    { key: 'SPARE07', name: 'Fennaro Mossbell', clades: ['hare', 'deer'] },
    { key: 'SPARE08', name: 'Oki Sandrunner', clades: ['kangaroo', 'armadillo'] },
    { key: 'STRIDER', name: 'Strider', clades: ['shoebill', 'crocodile'] },
    { key: 'TENACIOUS', name: 'Tenacious', clades: ['tiger', 'tortoise'] },
    { key: 'TENDER', name: 'Tender', clades: ['parrot', 'narwhal'] },
    { key: 'TOMAHAWK', name: 'Tomahawk', clades: ['basilisk', 'hawk'] },
    { key: 'TRACE', name: 'Trace', clades: ['booby', 'jellyfish'] },
    // Cosmic Shore's painted crew (2026-11-19): a person per seed, many to a callsign, so each is keyed by their
    // first name and carries the callsign they fly (Docs/Pilots/art/roster/plan.json).
    { key: 'JORIRO', callsign: 'ENSIGN', name: 'Joriro Wavecove', clades: ['pangolin', 'yak'] },
    { key: 'DELLALIA', callsign: 'MANGER', name: 'Dellalia Tidebloom', clades: ['narwhal', 'jellyfish'] },
    { key: 'SABERO', callsign: 'ANVIL', name: 'Sabero Lowrest', clades: ['badger', 'tardigrade'] },
    { key: 'OLO', callsign: 'VOLT', name: 'Olo Spindlewing', clades: ['koi', 'fennec'] },
    { key: 'ROLAMO', callsign: 'ZODIAC', name: 'Rolamo Mirehollow', clades: ['ibis', 'tortoise'] },
    { key: 'YOX', callsign: 'SUNDIAL', name: 'Yox Lowhook', clades: ['ocelot', 'mole'] },
    { key: 'XATHATA', callsign: 'OPAL', name: 'Xathata Ashwell', clades: ['moose', 'gecko'] },
    { key: 'BELTHALY', callsign: 'RAMPART', name: 'Belthaly Wavewell', clades: ['lynx', 'hyena'] },
    { key: 'NETHAEL', callsign: 'CITADEL', name: 'Nethael Foamridge', clades: ['hummingbird', 'armadillo'] },
    { key: 'MAMO', callsign: 'HORNET', name: 'Mamo Silverthorn', clades: ['pangolin', 'ibis'] },
    { key: 'XALAAI', callsign: 'IVY', name: 'Xalaai Shellhollow', clades: ['mole', 'firefly'] },
    { key: 'BRIOLA', callsign: 'TALON', name: 'Briola Whistlefield', clades: ['narwhal', 'armadillo'] },
    { key: 'PEVETH', callsign: 'DOE', name: 'Peveth Driftrest', clades: ['lobster', 'crane'] },
    { key: 'FENRA', callsign: 'WINGMAN', name: 'Fenra Greywell', clades: ['cuttlefish', 'sloth'] },
    { key: 'CORRARIN', callsign: 'BANDIT', name: 'Corrarin Deepreach', clades: ['mole', 'lynx'] },
    { key: 'NELOEL', callsign: 'NEEDLE', name: 'Neloel Anchorfall', clades: ['firefly', 'ibis'] },
    { key: 'UTHAEL', callsign: 'GALLEON', name: 'Uthael Stormdrift', clades: ['puffin', 'hedgehog'] },
    { key: 'CARIO', callsign: 'FLUME', name: 'Cario Emberrest', clades: ['axolotl', 'platypus'] },
    { key: 'LULAANE', callsign: 'ENSIGN', name: 'Lulaane Whistlewright', clades: ['badger', 'koi'] },
    { key: 'BELRENRO', callsign: 'MANGER', name: 'Belrenro Frostbrook', clades: ['cuttlefish', 'gecko'] },
    { key: 'ZERIOLA', callsign: 'ANVIL', name: 'Zeriola Lanternsong', clades: ['tardigrade', 'jellyfish'] },
    { key: 'MALOANE', callsign: 'VOLT', name: 'Maloane Wavegate', clades: ['tapir', 'toucan'] },
    { key: 'FENX', callsign: 'ZODIAC', name: 'Fenx Brightlight', clades: ['hedgehog', 'wolf'] },
    { key: 'QUILOX', callsign: 'SUNDIAL', name: 'Quilox Ambermere', clades: ['pelican', 'axolotl'] },
    { key: 'PEDIRI', callsign: 'OPAL', name: 'Pediri Wakereach', clades: ['lynx', 'moose'] },
    { key: 'ZESONDO', callsign: 'RAMPART', name: 'Zesondo Kelphook', clades: ['lobster', 'newt'] },
    { key: 'MIRIN', callsign: 'CITADEL', name: 'Mirin Dawnstone', clades: ['lynx', 'crane'] },
    { key: 'OLONE', callsign: 'HORNET', name: 'Olone Deepwright', clades: ['heron', 'moose'] },
    { key: 'QUIKOTH', callsign: 'IVY', name: 'Quikoth Ashfield', clades: ['badger', 'axolotl'] },
    { key: 'ATHARA', callsign: 'TALON', name: 'Athara Glassmore', clades: ['firefly', 'otter'] },
    { key: 'TAKOANE', callsign: 'DOE', name: 'Takoane Sandfin', clades: ['jellyfish', 'fennec'] },
    { key: 'DELLORIN', callsign: 'WINGMAN', name: 'Dellorin Stillbell', clades: ['axolotl', 'puffin'] },
    { key: 'MAIX', callsign: 'BANDIT', name: 'Maix Whistlesworth', clades: ['lynx', 'mantis'] },
    { key: 'MIRISA', callsign: 'NEEDLE', name: 'Mirisa Saltward', clades: ['koi', 'chameleon'] },
    { key: 'CAKOOLA', callsign: 'GALLEON', name: 'Cakoola Lanterndrift', clades: ['yak', 'jellyfish'] },
    { key: 'CORLILIA', callsign: 'FLUME', name: 'Corlilia Rustmark', clades: ['raven', 'heron'] },
    { key: 'GALSOOLA', callsign: 'ENSIGN', name: 'Galsoola Gulltail', clades: ['lemur', 'gecko'] },
    { key: 'VEVEOLA', callsign: 'MANGER', name: 'Veveola Spindlespark', clades: ['orangutan', 'tardigrade'] },
    { key: 'ZETH', callsign: 'ANVIL', name: 'Zeth Starwater', clades: ['owl', 'newt'] },
    { key: 'ROSONDO', callsign: 'VOLT', name: 'Rosondo Rusthollow', clades: ['armadillo', 'tardigrade'] },
    { key: 'ULINE', callsign: 'ZODIAC', name: 'Uline Shellmoor', clades: ['ibis', 'newt'] },
    { key: 'LUNULO', callsign: 'SUNDIAL', name: 'Lunulo Stormlight', clades: ['pangolin', 'gecko'] },
    { key: 'OVEX', callsign: 'OPAL', name: 'Ovex Driftsong', clades: ['mole', 'pelican'] },
    { key: 'JODIOLA', callsign: 'RAMPART', name: 'Jodiola Emberthorn', clades: ['hyena', 'narwhal'] },
    { key: 'PEKOAR', callsign: 'CITADEL', name: 'Pekoar Starwright', clades: ['seahorse', 'yak'] },
    { key: 'QUIBEMO', callsign: 'HORNET', name: 'Quibemo Ashstone', clades: ['yak', 'platypus'] },
    { key: 'MAMAOLA', callsign: 'IVY', name: 'Mamaola Crestmark', clades: ['puffin', 'moose'] },
    { key: 'TANUWEN', callsign: 'TALON', name: 'Tanuwen Spindlespark', clades: ['heron', 'orangutan'] },
    { key: 'WYVE', callsign: 'DOE', name: 'Wyve Stillline', clades: ['bison', 'koi'] },
    { key: 'DELLIAR', callsign: 'WINGMAN', name: 'Delliar Brinewater', clades: ['owl', 'heron'] },
    { key: 'DELSOKO', callsign: 'BANDIT', name: 'Delsoko Tidehook', clades: ['ocelot', 'cuttlefish'] },
    { key: 'NEMAIX', callsign: 'NEEDLE', name: 'Nemaix Hollowline', clades: ['armadillo', 'tapir'] },
    { key: 'BRILOLIA', callsign: 'GALLEON', name: 'Brilolia Coralrest', clades: ['gecko', 'tardigrade'] },
    { key: 'ITHAX', callsign: 'FLUME', name: 'Ithax Moonmark', clades: ['armadillo', 'mantis'] },
    { key: 'MAKOOLA', callsign: 'ENSIGN', name: 'Makoola Starsail', clades: ['jackal', 'toucan'] },
    { key: 'TALOLO', callsign: 'MANGER', name: 'Talolo Foamrest', clades: ['ibis', 'mole'] },
    { key: 'IRI', callsign: 'ANVIL', name: 'Iri Whistlebell', clades: ['bison', 'puffin'] },
    { key: 'MIBEN', callsign: 'VOLT', name: 'Miben Glasscove', clades: ['heron', 'otter'] },
    { key: 'VERAO', callsign: 'ZODIAC', name: 'Verao Emberrest', clades: ['chameleon', 'cuttlefish'] },
    { key: 'BRISILIA', callsign: 'SUNDIAL', name: 'Brisilia Stillridge', clades: ['hummingbird', 'mantis'] },
    { key: 'PEWEN', callsign: 'OPAL', name: 'Pewen Reefwatch', clades: ['bison', 'capybara'] },
    { key: 'BRIRAIX', callsign: 'RAMPART', name: 'Briraix Driftthorn', clades: ['fennec', 'beetle'] },
    { key: 'MATA', callsign: 'CITADEL', name: 'Mata Deepridge', clades: ['tapir', 'lemur'] },
    { key: 'LUDIRA', callsign: 'HORNET', name: 'Ludira Kelpfin', clades: ['newt', 'lemur'] },
    { key: 'BELSIAR', callsign: 'IVY', name: 'Belsiar Silvermore', clades: ['yak', 'pelican'] },
    { key: 'CANUAR', callsign: 'TALON', name: 'Canuar Stormwatch', clades: ['lemur', 'walrus'] },
    { key: 'URO', callsign: 'DOE', name: 'Uro Spindlefield', clades: ['tortoise', 'firefly'] },
    { key: 'EMAO', callsign: 'WINGMAN', name: 'Emao Ambermark', clades: ['wolf', 'badger'] },
    { key: 'ORA', callsign: 'BANDIT', name: 'Ora Spindlestone', clades: ['beetle', 'platypus'] },
    { key: 'NEMATH', callsign: 'NEEDLE', name: 'Nemath Dawnward', clades: ['tortoise', 'lemur'] },
    { key: 'OTH', callsign: 'GALLEON', name: 'Oth Farmere', clades: ['firefly', 'hedgehog'] },
    { key: 'SASOKO', callsign: 'FLUME', name: 'Sasoko Hollowwell', clades: ['hummingbird', 'moose'] },
    { key: 'ANUDEK', callsign: 'OPAL', name: 'Anudek Silversong', clades: ['puffin', 'octopus'] },
    { key: 'XABEDEK', callsign: 'IVY', name: 'Xabedek Stormgate', clades: ['eel', 'newt'] },
    { key: 'BELSOTH', callsign: 'DOE', name: 'Belsoth Deepwell', clades: ['fennec', 'pangolin'] },
    { key: 'ZEBEEL', callsign: 'FLUME', name: 'Zebeel Reefsail', clades: ['jellyfish', 'seahorse'] },
    // Crews 13 to 17 (2026-11-22): the next 90 of the painted crew, the same roster (plan.json), so a player who
    // drafts one of these pairs sees that pilot's own painting.
    { key: 'PENOOLA', callsign: 'ENSIGN', name: 'Penoola Wakesworth', clades: ['koi', 'orangutan'] },
    { key: 'BELWEN', callsign: 'MANGER', name: 'Belwen Dawnwatch', clades: ['bison', 'hedgehog'] },
    { key: 'KADIWEN', callsign: 'ANVIL', name: 'Kadiwen Stormthorn', clades: ['eel', 'axolotl'] },
    { key: 'NENUVE', callsign: 'VOLT', name: 'Nenuve Amberfin', clades: ['ibis', 'gecko'] },
    { key: 'MILAWEN', callsign: 'ZODIAC', name: 'Milawen Gullmore', clades: ['armadillo', 'eel'] },
    { key: 'JORO', callsign: 'SUNDIAL', name: 'Joro Brightridge', clades: ['jackal', 'raven'] },
    { key: 'NENUX', callsign: 'OPAL', name: 'Nenux Anchorgate', clades: ['bison', 'hyena'] },
    { key: 'KAMASH', callsign: 'RAMPART', name: 'Kamash Duskhollow', clades: ['chameleon', 'heron'] },
    { key: 'PERENSA', callsign: 'CITADEL', name: 'Perensa Farhart', clades: ['fennec', 'sloth'] },
    { key: 'IDIO', callsign: 'HORNET', name: 'Idio Pearlsworth', clades: ['octopus', 'ibis'] },
    { key: 'MILOLY', callsign: 'IVY', name: 'Miloly Emberspark', clades: ['pelican', 'cuttlefish'] },
    { key: 'KARIIX', callsign: 'TALON', name: 'Kariix Wakerunner', clades: ['tapir', 'orangutan'] },
    { key: 'BELBERIN', callsign: 'DOE', name: 'Belberin Spindlebloom', clades: ['cuttlefish', 'jackal'] },
    { key: 'ILORIN', callsign: 'WINGMAN', name: 'Ilorin Sandwater', clades: ['newt', 'sloth'] },
    { key: 'CORBEEK', callsign: 'BANDIT', name: 'Corbeek Emberwater', clades: ['koi', 'armadillo'] },
    { key: 'GALSOLY', callsign: 'NEEDLE', name: 'Galsoly Stormdrift', clades: ['yak', 'walrus'] },
    { key: 'CARIEL', callsign: 'GALLEON', name: 'Cariel Moonbrook', clades: ['capybara', 'crane'] },
    { key: 'FENKORA', callsign: 'FLUME', name: 'Fenkora Mirewell', clades: ['tardigrade', 'wolf'] },
    { key: 'WYNE', callsign: 'ENSIGN', name: 'Wyne Crestthorn', clades: ['toucan', 'tortoise'] },
    { key: 'HABEAR', callsign: 'MANGER', name: 'Habear Rustsail', clades: ['orangutan', 'toucan'] },
    { key: 'MISISH', callsign: 'ANVIL', name: 'Misish Frostwell', clades: ['hummingbird', 'eel'] },
    { key: 'ULOTH', callsign: 'VOLT', name: 'Uloth Whistlewright', clades: ['hyena', 'octopus'] },
    { key: 'BELMIDEK', callsign: 'ZODIAC', name: 'Belmidek Wavefield', clades: ['sloth', 'seahorse'] },
    { key: 'ARARA', callsign: 'SUNDIAL', name: 'Arara Miresong', clades: ['jellyfish', 'newt'] },
    { key: 'ISOLO', callsign: 'OPAL', name: 'Isolo Gullhollow', clades: ['jellyfish', 'wolf'] },
    { key: 'PEMIIX', callsign: 'RAMPART', name: 'Pemiix Glasswater', clades: ['axolotl', 'lynx'] },
    { key: 'ARILIA', callsign: 'CITADEL', name: 'Arilia Anchorwatch', clades: ['crane', 'jellyfish'] },
    { key: 'NEKOANE', callsign: 'HORNET', name: 'Nekoane Anchorwatch', clades: ['orangutan', 'puffin'] },
    { key: 'DARSOANE', callsign: 'IVY', name: 'Darsoane Coralhollow', clades: ['narwhal', 'ocelot'] },
    { key: 'GALBEMO', callsign: 'TALON', name: 'Galbemo Farwright', clades: ['yak', 'lynx'] },
    { key: 'CALOSH', callsign: 'DOE', name: 'Calosh Ashwatch', clades: ['moose', 'newt'] },
    { key: 'CORANE', callsign: 'WINGMAN', name: 'Corane Stillmoor', clades: ['jellyfish', 'otter'] },
    { key: 'ROSIRIN', callsign: 'BANDIT', name: 'Rosirin Ashmoor', clades: ['owl', 'eel'] },
    { key: 'YON', callsign: 'NEEDLE', name: 'Yon Greywing', clades: ['capybara', 'mole'] },
    { key: 'CORBEMO', callsign: 'GALLEON', name: 'Corbemo Ashbell', clades: ['lobster', 'hyena'] },
    { key: 'ANOTH', callsign: 'FLUME', name: 'Anoth Foammore', clades: ['orangutan', 'mole'] },
    { key: 'YOMILIA', callsign: 'ENSIGN', name: 'Yomilia Moonshore', clades: ['axolotl', 'walrus'] },
    { key: 'CALAOLA', callsign: 'MANGER', name: 'Calaola Mirecove', clades: ['tardigrade', 'axolotl'] },
    { key: 'NEMAMO', callsign: 'ANVIL', name: 'Nemamo Silverridge', clades: ['seahorse', 'crane'] },
    { key: 'DELKO', callsign: 'VOLT', name: 'Delko Saltlight', clades: ['pelican', 'heron'] },
    { key: 'BRISH', callsign: 'ZODIAC', name: 'Brish Crestwhistle', clades: ['lemur', 'beetle'] },
    { key: 'DELNURI', callsign: 'SUNDIAL', name: 'Delnuri Farbell', clades: ['platypus', 'tardigrade'] },
    { key: 'CABEANE', callsign: 'OPAL', name: 'Cabeane Lowwick', clades: ['orangutan', 'mantis'] },
    { key: 'OMAKO', callsign: 'RAMPART', name: 'Omako Driftbloom', clades: ['capybara', 'gecko'] },
    { key: 'TAKOUS', callsign: 'CITADEL', name: 'Takous Coralfin', clades: ['walrus', 'ocelot'] },
    { key: 'XATHALO', callsign: 'HORNET', name: 'Xathalo Amberkeel', clades: ['newt', 'otter'] },
    { key: 'DELLOANE', callsign: 'IVY', name: 'Delloane Stormrunner', clades: ['fennec', 'tortoise'] },
    { key: 'MALIMO', callsign: 'TALON', name: 'Malimo Lowgate', clades: ['gecko', 'chameleon'] },
    { key: 'SAMAIA', callsign: 'DOE', name: 'Samaia Tidethorn', clades: ['koi', 'hyena'] },
    { key: 'GALLITH', callsign: 'WINGMAN', name: 'Gallith Pearlmark', clades: ['jackal', 'seahorse'] },
    { key: 'HAN', callsign: 'BANDIT', name: 'Han Amberfall', clades: ['beetle', 'tapir'] },
    { key: 'KALARA', callsign: 'NEEDLE', name: 'Kalara Lowfield', clades: ['ocelot', 'lynx'] },
    { key: 'OLIA', callsign: 'GALLEON', name: 'Olia Ashmark', clades: ['chameleon', 'armadillo'] },
    { key: 'CORNDO', callsign: 'FLUME', name: 'Corndo Kelpweaver', clades: ['capybara', 'otter'] },
    { key: 'SANUIA', callsign: 'ENSIGN', name: 'Sanuia Tidewright', clades: ['sloth', 'owl'] },
    { key: 'PENDO', callsign: 'MANGER', name: 'Pendo Rustmark', clades: ['wolf', 'pelican'] },
    { key: 'WYSOOLA', callsign: 'ANVIL', name: 'Wysoola Hollowtail', clades: ['hummingbird', 'pelican'] },
    { key: 'KASH', callsign: 'VOLT', name: 'Kash Lanternfin', clades: ['jackal', 'lemur'] },
    { key: 'BELKO', callsign: 'ZODIAC', name: 'Belko Sandcove', clades: ['yak', 'bison'] },
    { key: 'UIX', callsign: 'SUNDIAL', name: 'Uix Whistlemore', clades: ['bison', 'narwhal'] },
    { key: 'GALMAO', callsign: 'OPAL', name: 'Galmao Whistlehollow', clades: ['ocelot', 'otter'] },
    { key: 'YOVE', callsign: 'RAMPART', name: 'Yove Sandwhistle', clades: ['wolf', 'cuttlefish'] },
    { key: 'DAREK', callsign: 'CITADEL', name: 'Darek Brightbell', clades: ['raven', 'pangolin'] },
    { key: 'ULIA', callsign: 'HORNET', name: 'Ulia Stormrunner', clades: ['lynx', 'sloth'] },
    { key: 'OLOEL', callsign: 'IVY', name: 'Oloel Gullmoor', clades: ['beetle', 'mole'] },
    { key: 'MIRAVE', callsign: 'TALON', name: 'Mirave Hollowwatch', clades: ['hummingbird', 'fennec'] },
    { key: 'PELOWEN', callsign: 'DOE', name: 'Pelowen Anchorshore', clades: ['narwhal', 'tapir'] },
    { key: 'SATHAANE', callsign: 'WINGMAN', name: 'Sathaane Shellsong', clades: ['sloth', 'mole'] },
    { key: 'SARAX', callsign: 'BANDIT', name: 'Sarax Anchorthorn', clades: ['eel', 'jackal'] },
    { key: 'CORN', callsign: 'NEEDLE', name: 'Corn Wakewick', clades: ['tardigrade', 'otter'] },
    { key: 'DELMADEK', callsign: 'GALLEON', name: 'Delmadek Tidedrift', clades: ['toucan', 'puffin'] },
    { key: 'KABEN', callsign: 'FLUME', name: 'Kaben Greyweaver', clades: ['tardigrade', 'tortoise'] },
    { key: 'ALOIX', callsign: 'ENSIGN', name: 'Aloix Sandmark', clades: ['seahorse', 'lobster'] },
    { key: 'AANE', callsign: 'MANGER', name: 'Aane Saltbloom', clades: ['owl', 'crane'] },
    { key: 'MIRIOLA', callsign: 'ANVIL', name: 'Miriola Drifthollow', clades: ['armadillo', 'cuttlefish'] },
    { key: 'JOUS', callsign: 'VOLT', name: 'Jous Stormhook', clades: ['tardigrade', 'yak'] },
    { key: 'BELDIRI', callsign: 'ZODIAC', name: 'Beldiri Wakelight', clades: ['narwhal', 'crane'] },
    { key: 'RODIIX', callsign: 'SUNDIAL', name: 'Rodiix Mirewell', clades: ['chameleon', 'mantis'] },
    { key: 'LULIIA', callsign: 'OPAL', name: 'Luliia Coralwright', clades: ['lynx', 'platypus'] },
    { key: 'FENLALIA', callsign: 'RAMPART', name: 'Fenlalia Wavewatch', clades: ['sloth', 'lemur'] },
    { key: 'OMIX', callsign: 'CITADEL', name: 'Omix Mooncove', clades: ['tapir', 'raven'] },
    { key: 'TAMO', callsign: 'HORNET', name: 'Tamo Copperstone', clades: ['crane', 'tortoise'] },
    { key: 'DARX', callsign: 'IVY', name: 'Darx Lanternspark', clades: ['pangolin', 'crane'] },
    { key: 'JOSORA', callsign: 'TALON', name: 'Josora Deepspark', clades: ['hedgehog', 'ibis'] },
    { key: 'YONOEK', callsign: 'DOE', name: 'Yonoek Rustkeel', clades: ['seahorse', 'eel'] },
    { key: 'CALADEK', callsign: 'WINGMAN', name: 'Caladek Anchorspark', clades: ['eel', 'badger'] },
    { key: 'JOTHAAR', callsign: 'BANDIT', name: 'Jothaar Glasswick', clades: ['cuttlefish', 'yak'] },
    { key: 'NELASA', callsign: 'NEEDLE', name: 'Nelasa Whistlewatch', clades: ['ocelot', 'badger'] },
    { key: 'YONE', callsign: 'GALLEON', name: 'Yone Glasswatch', clades: ['beetle', 'firefly'] },
    { key: 'ROLODEK', callsign: 'FLUME', name: 'Rolodek Spindlebell', clades: ['moose', 'yak'] },
  ];
  /** The callsign a painting's pilot flies: their own field, else the key it was made for. */
  U.callsignOf = (a) => (a ? a.callsign || a.key : '');
  U.ART_BY = {};
  U.PILOT_ART.forEach((a) => (U.ART_BY[a.key] = a));

  const art = (k) => (T.ART && T.ART[k]) || null;
  const cladesOf = (h) => (h.species || []).filter((s) => s !== 'human');
  /** How well a painting fits a pair: both clades beat one, the head clade beats the second; 0 = no fit. */
  U.artFit = function (a, pair) {
    const shared = a.clades.filter((c) => pair.includes(c)).length;
    if (!shared) return 0;
    return shared * 4 + (pair.includes(a.clades[0]) ? 2 : 0) + (a.clades[0] === pair[0] ? 1 : 0);
  };
  /** The best painting for a pair that is not in `taken`, or null. Exact pairs win; ties go to catalog order. */
  U.artForPair = function (pair, taken) {
    let best = null,
      bestFit = 0;
    for (const a of U.PILOT_ART) {
      if (taken && taken.has(a.key)) continue;
      const f = U.artFit(a, pair);
      if (f > bestFit) ((best = a), (bestFit = f));
    }
    return best;
  };
  /**
   * The painting a hero is shown with. Within a squad no two heroes share a face: heroes take theirs in
   * squad order, and a hero not yet in the squad (one being drafted) takes what the squad has left.
   */
  U.pilotOf = function (h) {
    if (!h) return null;
    const squad = (U.run && U.run.heroes) || [];
    const taken = new Set();
    for (const s of squad) {
      if (!s) continue; // a seat still drafting
      const a = U.artForPair(cladesOf(s), taken);
      if (s === h || s.id === h.id) return a;
      if (a) taken.add(a.key);
    }
    return U.artForPair(cladesOf(h), taken);
  };
  /** True when the painting is of exactly this hero's pair, false for a stand-in. */
  U.isExact = (a, h) => !!a && cladesOf(h).every((c) => a.clades.includes(c));
  U.portraitSrc = (a) => (a ? art('pilot/' + a.key) : null);
  U.sceneSrc = (a) => (a ? art('scene/' + a.key) : null);
  /** A round portrait; with no painting, the hero's clade marks on a disc. */
  U.portrait = function (h, cls) {
    const a = U.pilotOf(h);
    const src = U.portraitSrc(a);
    if (src) {
      const tip = U.isExact(a, h) ? '' : ` data-tip="Stand-in portrait: ${a.name}, ${a.clades.join(' and ')}"`;
      return `<span class="pfp ${cls || ''}"${tip}><img src="${src}" alt="" draggable="false"></span>`;
    }
    const marks = cladesOf(h)
      .map((s) => (T.SPECIES[s] ? U.icClade(s) : ''))
      .join('');
    return `<span class="pfp ${cls || ''} none">${marks || '?'}</span>`;
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
