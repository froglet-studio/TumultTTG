/* ============================================================================
   TUMULT — DATA: THE PAINTED CLADES, BY BRANCH OF THE TREE
   ----------------------------------------------------------------------------
   Every animal painted on a Cosmic Shore pilot becomes a clade with nine traits
   (Garrett, 2026-11-16). Traits are written once, at the branch of the tree they
   belong to, and every clade under that branch carries them: cats share many of
   their nine, and each clade has at least one trait that is its own. Primates
   also carry some Human traits. A pilot whose two clades share a trait holds it
   once; taking it again gives upgrade points bound to it (src/engine/run.js).

   The plan for every branch: docs/design/11-clades.md. A trait is a card as in
   cards.js; `kin` names the branch a shared trait is written for.
   ========================================================================== */
(function (T) {
  const h = (x) => Math.floor(x / 2);
  /** A trait: shown under `home`, carried by every clade in `clades` (home first). */
  const K = (clades, id, name, el, sig, P, E, flavor, kin) => {
    const card = { id, sp: clades[0], clades: clades.slice(), name, el, sig: sig || 0, P, E, flavor };
    if (kin) card.kin = kin;
    T.CARDS.push(card);
    T.CARD[id] = card;
  };
  /** A clade: its words, and where it sits on the tree. */
  const S = (id, spec) => {
    T.SPECIES[id] = Object.assign({ painted: true }, spec);
    T.SPECIES_ORDER.push(id);
  };

  /* ───────────────────────── PRIMATES ─────────────────────────
     orangutan · ring-tailed lemur · mandrill. Each carries Human's Opposable Grip, and some of Human's other
     traits; Grooming is every primate's; Canopy Leap the climbers'; Troop Call the troop-livers'. */
  S('orangutan', { name: 'Orangutan', lean: 'T/C', branch: 'Primates', icon: '🦧',
    tagline: 'Thoughtful canopy giant. Long arms, longer patience, clever hands.' });
  S('lemur', { name: 'Ring-Tailed Lemur', lean: 'C/S', branch: 'Primates', icon: '🐒',
    tagline: 'Sun-lover and leaper. Fights with scent and with its troop.' });
  S('mandrill', { name: 'Mandrill', lean: 'C/M', branch: 'Primates', icon: '🐒',
    tagline: 'Painted face, long fangs, the leader of a great troop.' });
  T.shareTrait('hum_grip', 'orangutan', 'lemur', 'mandrill');
  T.shareTrait('hum_tool', 'orangutan');
  T.shareTrait('hum_mind', 'orangutan');
  T.shareTrait('hum_coop', 'lemur', 'mandrill');
  T.shareTrait('hum_pattern', 'mandrill');

  K(['orangutan','lemur','mandrill'],'pri_groom','Grooming','C',0,
    { n:'Groom', ap:1, el:0, cd:1, dur:0, tgt:'ally',
      fx:[{v:'heal', n:(P,E)=>1+P, target:'ally'},{v:'cleanse', party:true}],
      txt:(P,E)=>`You and your ally shake off Anchored and Weakened; your ally heals ${1+P}.` },
    { n:'Bond', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'heal', n:(P,E)=>1+E, party:true},{v:'shield', val:1, dur:2, party:true}],
      txt:(P,E)=>`Both heroes heal ${1+E} and hold Shield 1 for 2 rounds.` },
    'Trust, one hair at a time.', 'Primates');
  K(['orangutan','lemur'],'pri_canopy','Canopy Leap','S',0,
    { n:'Swing', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Move ${1+P}, height nodes included; your next strike this turn deals +1.` },
    { n:'Treetops', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, height:true},{v:'shield', val:1, dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`Leap to any node within ${2+E}, height included; you and an adjacent ally hold Shield 1 this round.` },
    'The ground is for other animals.', 'Primates');
  K(['lemur','mandrill'],'pri_troop','Troop Call','C',0,
    { n:'Hoot', ap:1, el:0, cd:1, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:1},{v:'empower', val:(P,E)=>1+P, uses:1, target:'ally'}],
      txt:(P,E)=>`Step your ally 1 node, where you choose; their next strike deals +${1+P}.` },
    { n:'Troop', ap:2, el:1, cd:3, dur:2, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>E>=2?2:1, uses:99, party:true, dur:2},{v:'shield', val:1, dur:2, party:true}],
      txt:(P,E)=>`Party strikes +${E>=2?2:1} for 2 rounds, and both heroes hold Shield 1.` },
    'Every voice in the troop, at once.', 'Primates');

  // Orangutan: Opposable Grip, Tool Use, Theory of Mind, Grooming, Canopy Leap, and these four
  K(['orangutan'],'ora_reach','Long Reach','S',2,
    { n:'Reach', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'force', kind:'pull', n:1},{v:'strike', kind:'melee', dmg:(P,E)=>2+P, ifAdjacent:true}],
      txt:(P,E)=>`Pull a foe within 2 one node closer; if it arrives beside you, strike it for ${2+P}.` },
    { n:'Arm Span', ap:0, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'morph', bonus:1, reach:1, dur:(P,E)=>1+E}],
      txt:(P,E)=>`For ${1+E} rounds your melee reaches 2 nodes and your strikes deal +1.` },
    'Arms that span a river.');
  K(['orangutan'],'ora_leaf','Leaf Shelter','T',0,
    { n:'Leaf Roof', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`You and an adjacent ally hold Shield ${1+P} this round.` },
    { n:'Rain Shelter', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'hazardImmune', dur:(P,E)=>1+E},{v:'hazardImmune', dur:1, party:true},{v:'heal', n:1, party:true}],
      txt:(P,E)=>`Both heroes heal 1 and ignore hazards this round; you stay dry for ${1+E} rounds.` },
    'A leaf the size of a roof.');
  K(['orangutan'],'ora_study','Patient Study','T',0,
    { n:'Watch', ap:1, el:0, cd:2, dur:0, tgt:'foe_any',
      fx:[{v:'mark', n:(P,E)=>1+h(P), dur:3},{v:'mark'}],
      txt:(P,E)=>`Study a foe: it is Marked +${1+h(P)} for 3 rounds, and the next hit on it deals +2.` },
    { n:'Outthink', ap:1, el:1, cd:3, dur:2, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+E, next:true, reposition:1}],
      txt:(P,E)=>`Shield: the next hit on you is −${2+E}, and you slip 1 node when it lands. Dur 2.` },
    'It watches before it moves.');
  K(['orangutan'],'ora_memory','Fruit Memory','C',0,
    { n:'Recall', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+P, dur:2},{v:'heal', n:1}],
      txt:(P,E)=>`Remember where everything was: reveal everything within ${1+P} nodes for 2 rounds, and heal 1 from a remembered meal.` },
    { n:'Mental Map', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'haste', n:(P,E)=>1+E}],
      txt:(P,E)=>`Haste: every card on your track returns ${1+E} columns sooner.` },
    'Which tree fruits when, for a hundred miles.');

  // Ring-tailed lemur: Opposable Grip, Cooperative Instinct, Grooming, Canopy Leap, Troop Call, and these four
  K(['lemur'],'lem_sun','Sun Salute','C',2,
    { n:'Warm Up', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'draw', face:'AP', n:(P,E)=>1+h(P)},{v:'cleanse'}],
      txt:(P,E)=>`Arms open to the light: draw ${1+h(P)} pool ${1+h(P) > 1 ? 'dice' : 'die'} as AP and shake off Anchored and Weakened.` },
    { n:'Sunrise', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'ap', val:1, dur:(P,E)=>1+E, party:true}],
      txt:(P,E)=>`Both heroes mint 1 AP at the start of their turns for ${1+E} rounds.` },
    'Every morning, face to the sun.');
  K(['lemur'],'lem_stink','Stink Fight','C',0,
    { n:'Tail Waft', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:(P,E)=>1+h(P), dur:1, area:'adj'}],
      txt:(P,E)=>`Adjacent foes are Weakened ${1+h(P)}.` },
    { n:'Stink Cloud', ap:2, el:1, cd:3, dur:0, tgt:'node_r2',
      fx:[{v:'field', radius:1, on:'end', dur:2, remote:(P,E)=>2+E, fx:[{kw:'strike', n:1},{kw:'weaken', n:1}]}],
      txt:(P,E)=>`Foul a space within ${2+E}: a Field on it and its neighbours for 2 rounds. Foes ending the round there take 1 and are Weakened 1.` },
    'The tail is a weapon of sorts.');
  K(['lemur'],'lem_scent','Scent Mark','S',0,
    { n:'Mark Ground', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+P, dur:2},{v:'reveal', nearest:true, dur:2},{v:'mark', nearest:true}],
      txt:(P,E)=>`Reveal within ${1+P} for 2 rounds; the nearest foe is Revealed for 2 rounds and is Marked (the next hit on it deals +2).` },
    { n:'Territory', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+E, area:'radius', radius:2}],
      txt:(P,E)=>`Every foe within 2 is Weakened 1 for ${1+E} rounds.` },
    'This branch is ours.');
  K(['lemur'],'lem_tail','Tail Signal','T',0,
    { n:'Wave', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'haste', n:1},{v:'reroll', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Haste: every card on your track returns 1 column sooner, and reroll ${1+h(P)} banked ${1+h(P) > 1 ? 'dice' : 'die'}.` },
    { n:'Rally Flag', ap:1, el:1, cd:4, dur:2, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>2+E, next:true, party:true}],
      txt:(P,E)=>`Tail high, the troop braces: Shield: both heroes' next hit taken is −${2+E}. Dur 2.` },
    'Black and white rings, held high so the troop can follow.');

  // Mandrill: Opposable Grip, Cooperative Instinct, Pattern Recognition, Grooming, Troop Call, and these four
  K(['mandrill'],'man_paint','War Paint','C',2,
    { n:'Flush', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'adj'},{v:'empower', val:(P,E)=>1+P, uses:1, dur:1}],
      txt:(P,E)=>`Colours flare: adjacent foes are Weakened 1, and your next strike this turn deals +${1+P}.` },
    { n:'Blaze', ap:2, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'empower', val:2, uses:99, dur:(P,E)=>1+E},{v:'weaken', val:1, dur:1, area:'radius', radius:2}],
      txt:(P,E)=>`For ${1+E} rounds your strikes deal +2; every foe within 2 is Weakened 1 now.` },
    'The brighter the face, the bigger the fight.');
  K(['mandrill'],'man_fang','Fang Yawn','M',0,
    { n:'Fangs', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`Melee ${2+P}.` },
    { n:'Gape', ap:2, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'weaken', val:(P,E)=>1+E, dur:2}],
      txt:(P,E)=>`Melee ${3+P}; it is Weakened ${1+E} for 2 rounds.` },
    'A yawn that is not a yawn.');
  K(['mandrill'],'man_cheek','Cheek Pouches','T',0,
    { n:'Pouch', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'draw', face:'AP', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Draw ${1+h(P)} pool ${1+h(P) > 1 ? 'dice' : 'die'} straight into your bank as AP.` },
    { n:'Hoard', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'mint', face:'O', n:1},{v:'mint', face:'AP', n:(P,E)=>E}],
      txt:(P,E)=>`Mint 1 temporary Omni and ${E} temporary AP.` },
    'Snacks for later, and later is now.');
  K(['mandrill'],'man_charge','Ground Charge','M',0,
    { n:'Rush', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'move', n:1, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Rush 1 toward a foe, melee ${2+P}, and shove it 1.` },
    { n:'Bowl Over', ap:2, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:2, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'force', kind:'push', n:(P,E)=>1+E}],
      txt:(P,E)=>`Charge 2 toward a foe within 3, melee ${3+P}, and shove it ${1+E}.` },
    'Down from the trees, and all of it at once.');

  /* ───────────────────────── CATS ─────────────────────────
     lynx · caracal · ocelot · tiger · cheetah. Six traits are every cat's, though the cheetah, a runner with
     claws that never sheathe, lacks Retractable Claws and Night Eyes. The lynx and the caracal share Tufted Ears.
     Hyperspeed is the cheetah's alone: an exact run of four. */
  const CATS = ['lynx','caracal','ocelot','tiger','cheetah'];
  const CATS_CLAWED = ['lynx','caracal','ocelot','tiger'];
  S('lynx', { name: 'Eurasian Lynx', lean: 'S/T', branch: 'Cats', icon: '🐈',
    tagline: 'Snow-country ghost. Hears everything, leaves no track, strikes once.' });
  S('caracal', { name: 'Caracal', lean: 'S/M', branch: 'Cats', icon: '🐈',
    tagline: 'Desert leaper. Swats birds out of the air from a standing jump.' });
  S('ocelot', { name: 'Ocelot', lean: 'T/S', branch: 'Cats', icon: '🐆',
    tagline: 'Dappled night-walker of the forest floor and the branches over it.' });
  S('tiger', { name: 'Tiger', lean: 'M/C', branch: 'Cats', icon: '🐅',
    tagline: 'The largest cat. Swims, stalks in stripes, and roars the field still.' });
  S('cheetah', { name: 'Cheetah', lean: 'S/T', branch: 'Cats', icon: '🐆',
    tagline: 'The fastest runner alive. Claws like cleats, eyes for the long view.' });

  K(CATS,'cat_pounce','Pounce','M',0,
    { n:'Pounce', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:2, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>2+P, ifAdjacent:true}],
      txt:(P,E)=>`Run up to 2 toward a foe within 3; if you end beside it, melee ${2+P}.` },
    { n:'Leap', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, dest:'adjTarget', height:true},{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Leap beside a foe within ${2+E}, height included, melee ${3+E}, and pin it: Anchored 1.` },
    'All four feet leave the ground at once.', 'Cats');
  K(CATS_CLAWED,'cat_claws','Retractable Claws','M',0,
    { n:'Unsheathe', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'stripShield', amount:1},{v:'strike', kind:'melee', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`Peel 1 Shield off a foe beside you, then melee ${2+P}.` },
    { n:'Rake', ap:1, el:1, cd:2, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+E},{v:'strike', kind:'area', dmg:(P,E)=>1+E}],
      txt:(P,E)=>`Climb up to ${1+E}, height included, and rake every foe beside where you land for ${1+E}.` },
    'Kept sharp by never touching the ground.', 'Cats');
  K(CATS_CLAWED,'cat_eyes','Night Eyes','S',0,
    { n:'Eyeshine', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'mark', nearest:true}],
      txt:(P,E)=>`See in the dark within ${2+P} this round, and Mark the nearest foe.` },
    { n:'Night Hunt', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'reveal', radius:(P,E)=>2+E, dur:2},{v:'empower', val:1, uses:2, dur:2, party:true}],
      txt:(P,E)=>`Light up everything within ${2+E} for 2 rounds; both heroes' next two strikes deal +1.` },
    'A mirror behind the eye, catching every scrap of light.', 'Cats');
  K(CATS,'cat_stalk','Stalk','T',0,
    { n:'Stalk', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'empower', val:(P,E)=>2+P, uses:1, dur:2}],
      txt:(P,E)=>`Hide for 1 round; your next strike within 2 rounds deals +${2+P}.` },
    { n:'Ambush', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+E, canMove:true},{v:'field', around:true, ring:true, radius:1, on:'enter', trips:1, dur:2, fx:[{kw:'strike', n:(P,E)=>3+E}]}],
      txt:(P,E)=>`Hide for ${1+E} rounds, moving freely, and lie in wait: for 2 rounds a Field on the spaces beside you, and the first foe to enter takes ${3+E}.` },
    'Belly low, one paw at a time.', 'Cats');
  K(CATS,'cat_bite','Killing Bite','M',0,
    { n:'Throat Bite', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'strike', kind:'melee', dmg:2, ifHpBelow:7}],
      txt:(P,E)=>`Melee ${2+P}; if that leaves it at 6 HP or less, bite again for 2.` },
    { n:'Finish', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'execute', threshold:(P,E)=>3+E}],
      txt:(P,E)=>`Melee ${2+E}; if that leaves it at ${3+E} HP or less, it falls (not a boss).` },
    'One bite, in the one place.', 'Cats');
  K(CATS,'cat_feet','Land on Your Feet','S',0,
    { n:'Twist', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+h(P), next:true},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Shield: the next hit on you is ${1+h(P)} less, and hazards don't touch you this round.` },
    { n:'Nine Lives', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:(P,E)=>1+E},{v:'hazardImmune', dur:(P,E)=>1+E},{v:'heal', n:1}],
      txt:(P,E)=>`Cleanse, and for ${1+E} rounds no foe can Weaken or Anchor you and hazards don't touch you; heal 1.` },
    'Whatever way up you are dropped.', 'Cats');

  // Tufted Ears: the lynx and the caracal, ears tipped with black to catch sound
  K(['lynx','caracal'],'cat_tufts','Tufted Ears','S',0,
    { n:'Listen', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', nearest:true, dur:2},{v:'mark', n:(P,E)=>1+h(P), dur:3}],
      txt:(P,E)=>`Hear the nearest foe, hidden or not: it is Revealed for 2 rounds and Marked +${1+h(P)} for 3 rounds.` },
    { n:'Sound Map', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+E, dur:(P,E)=>1+E},{v:'mark', area:true, radius:(P,E)=>1+E}],
      txt:(P,E)=>`Hear everything within ${1+E} for ${1+E} rounds; every foe within ${1+E} is Marked.` },
    'Two black tufts, two antennae.');

  // Eurasian lynx: the six cat traits, Tufted Ears, and these two
  K(['lynx'],'lyn_snowshoe','Snowshoe Paws','S',0,
    { n:'Snowshoe', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Move ${1+P}; hazards don't touch you for 2 rounds.` },
    { n:'Deep Snow', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'hazardImmune', dur:(P,E)=>1+E},{v:'hazardImmune', dur:1, party:true},{v:'weaken', val:1, dur:(P,E)=>1+E, area:'adjParty'}],
      txt:(P,E)=>`Both heroes ignore hazards this round, and you for ${1+E} rounds; every foe beside either of you is Weakened 1 for ${1+E}.` },
    'Paws as wide as snowshoes, furred underneath.');
  K(['lynx'],'lyn_ghost','Snow Ghost','T',2,
    { n:'Fade', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+h(P), canMove:true},{v:'empower', val:1, uses:1, dur:2}],
      txt:(P,E)=>`Hide for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}, moving freely; your next strike deals +1.` },
    { n:'Ghost Strike', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, dest:'adjTarget'},{v:'strike', kind:'melee', dmg:(P,E)=>3+E, pierce:true},{v:'hidden', dur:1}],
      txt:(P,E)=>`Appear beside a foe within ${2+E}, melee ${3+E} through its Shield, and vanish again: Hidden 1.` },
    'Seen once, if at all.');

  // Caracal: the six cat traits, Tufted Ears, and these two
  K(['caracal'],'car_swat','Sky Swat','C',2,
    { n:'Swat', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+P},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Spring and swat a foe within 2 for ${2+P}; it is Weakened 1 this round.` },
    { n:'Snatch', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'force', kind:'pull', n:(P,E)=>1+E},{v:'strike', kind:'melee', dmg:(P,E)=>2+E, ifAdjacent:true},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Hook a foe within 3 and drag it ${1+E} toward you; if it lands beside you, melee ${2+E}. It is Anchored 1.` },
    'Birds three metres up are not safe.');
  K(['caracal'],'car_leap','Vertical Leap','S',0,
    { n:'Spring', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>2+P},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Jump to any node within ${2+P}, height included; Shield: the next hit on you is 1 less.` },
    { n:'Sky Leap', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, height:true},{v:'strike', kind:'area', dmg:(P,E)=>1+E}],
      txt:(P,E)=>`Leap to any node within ${2+E}, height included, landing on every foe beside it for ${1+E}.` },
    'Straight up, from standing.');

  // Ocelot: the six cat traits and these three
  K(['ocelot'],'oce_rosette','Rosette Cloak','T',2,
    { n:'Dapple', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+h(P), canMove:true},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Melt into broken light: Hidden ${1+h(P)}, moving freely, and Shield: the next hit on you is 1 less.` },
    { n:'Leaf Light', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:(P,E)=>1+E, party:true, radius:2},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`You and an ally within 2 are Hidden for ${1+E} rounds; both heroes' next strike deals +1.` },
    'Spots that are shadows that are spots.');
  K(['ocelot'],'oce_descent','Headfirst Descent','S',0,
    { n:'Descend', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'strike', kind:'area', dmg:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Climb up to ${1+P}, height included, and drop on every foe beside where you land for ${1+h(P)}.` },
    { n:'Branch Drop', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, dest:'adjTarget', height:true},{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Drop beside a foe within ${2+E}, melee ${3+E}, and it is Weakened 1.` },
    'Down the trunk face first, ankles turned backwards.');
  K(['ocelot'],'oce_prowl','Night Prowl','T',0,
    { n:'Prowl', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hidden', dur:1}],
      txt:(P,E)=>`Move ${1+P}, and end Hidden 1.` },
    { n:'Night Shift', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'haste', n:(P,E)=>1+E},{v:'reveal', radius:2, dur:1}],
      txt:(P,E)=>`Haste: every card on your track returns ${1+E} columns sooner; see within 2 this round.` },
    'Asleep all day, busy all night.');

  // Tiger: the six cat traits and these three
  K(['tiger'],'tig_roar','Roar','C',2,
    { n:'Roar', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:(P,E)=>1+h(P), dur:1, area:'adj'},{v:'force', kind:'push', n:1, area:true}],
      txt:(P,E)=>`Every foe beside you is Weakened ${1+h(P)} this round and knocked back 1.` },
    { n:'Thunder', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+E, area:'zone'},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Every foe in sight is Weakened 1 for ${1+E} rounds; both heroes' next strike deals +1.` },
    'Heard three kilometres away, and felt closer.');
  K(['tiger'],'tig_swim','Strong Swimmer','S',0,
    { n:'Swim', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hazardImmune', dur:1},{v:'cleanse'}],
      txt:(P,E)=>`Move ${1+P}; hazards don't touch you this round, and you shake off Anchored and Weakened.` },
    { n:'Undertow', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'force', kind:'pull', n:(P,E)=>1+E},{v:'anchor', who:'foe', dur:(P,E)=>1+h(E)},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Drag a foe within 3 toward you ${1+E} and hold it under: Anchored ${1+h(E)}. Hazards don't touch you this round.` },
    'A cat that likes the water.');
  K(['tiger'],'tig_stripes','Stripes','T',0,
    { n:'Stripes', ap:1, el:0, cd:2, dur:0, tgt:'foe_r3',
      fx:[{v:'mark', n:(P,E)=>1+h(P), dur:3},{v:'hidden', dur:1}],
      txt:(P,E)=>`Watch a foe within 3 from the grass: it is Marked +${1+h(P)} for 3 rounds, and you are Hidden 1.` },
    { n:'Tall Grass', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+E, canMove:true},{v:'empower', val:(P,E)=>2+E, uses:1, dur:3, pierce:true}],
      txt:(P,E)=>`Hide for ${1+E} rounds, moving freely; your next strike deals +${2+E} through Shield.` },
    'Orange is green to the deer.');

  // Cheetah: Pounce, Stalk, Killing Bite, Land on Your Feet, and these five. Hyperspeed is the cheetah's alone.
  K(['cheetah'],'che_hyper','Hyperspeed','S',2,
    { n:'Hyperspeed', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:4, exact:true, ignoreFoes:true},{v:'empower', val:(P,E)=>P, uses:1, dur:1}],
      txt:(P,E)=>`Run exactly 4, past foes${P ? `; your next strike this turn deals +${P}` : ''}.` },
    { n:'Top Speed', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:4, exact:true, ignoreFoes:true},{v:'empower', val:(P,E)=>2+E, uses:1, dur:1},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Run exactly 4, past foes; your next strike this turn deals +${2+E}, and Shield: the next hit on you is 1 less.` },
    'Nought to anything in three strides. But only in a straight line.');
  K(['cheetah'],'che_rudder','Tail Rudder','S',0,
    { n:'Swerve', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Cut ${1+P} sideways; Shield: the next hit on you is 1 less.` },
    { n:'Hairpin', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+E, next:true, reposition:1},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Ready to turn on a tail: Shield: the next hit on you is ${2+E} less and you dodge a step away from it. Step 1 now.` },
    'A long tail, for turning.');
  K(['cheetah'],'che_tear','Tear Marks','C',0,
    { n:'Focus', ap:1, el:0, cd:1, dur:0, tgt:'foe_los',
      fx:[{v:'reveal', target:true, dur:2},{v:'mark', n:(P,E)=>1+h(P), dur:3}],
      txt:(P,E)=>`Fix a foe in sight: it is Revealed for 2 rounds and Marked +${1+h(P)} for 3 rounds.` },
    { n:'Long Look', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:(P,E)=>2+E},{v:'mark', n:(P,E)=>1+E, dur:3},{v:'mark'}],
      txt:(P,E)=>`Pick out any foe: Revealed for ${2+E} rounds, and Marked: +2 to the next hit, +${1+E} to every hit for 3 rounds.` },
    'Dark lines that keep the sun out of the eyes.');
  K(['cheetah'],'che_claws','Sprinter\'s Claws','M',0,
    { n:'Kick Off', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Move ${1+P}; your next strike this turn deals +1.` },
    { n:'Dig In', ap:0, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'anchor', who:'self', dur:(P,E)=>1+E},{v:'shield', val:(P,E)=>1+E, dur:1}],
      txt:(P,E)=>`Claws in: you can't be pushed or pulled for ${1+E} rounds, and hold Shield ${1+E} this round.` },
    'Claws that never sheathe: cleats, not knives.');
  K(['cheetah'],'che_trip','Trip','M',0,
    { n:'Trip', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Hook a leg: melee ${1+P}, and it is Anchored 1.` },
    { n:'Tumble', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'anchor', who:'foe', dur:(P,E)=>1+h(E)},{v:'weaken', val:1, dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Melee ${2+E}; it is Anchored and Weakened 1 for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}.` },
    'A swipe at the back leg, at speed.');

  /* ───────────────────────── DOGS AND HYENAS ─────────────────────────
     fennec · red fox · jackal · coyote, and the spotted hyena. Keen Nose, Pack Howl and Long Trot are every
     one's; Pin Down is the dogs'. The two foxes share Mousing Pounce and Den; the jackal and the coyote,
     Yip Chorus and Opportunist. The hyena is a cat's cousin, not a dog's: it also carries Killing Bite. */
  const DOGS = ['fennec','fox','jackal','coyote'];
  const DOG_KIN = DOGS.concat('hyena');
  S('fennec', { name: 'Fennec Fox', lean: 'S/T', branch: 'Dogs and hyenas', icon: '🦊',
    tagline: 'Tiny desert fox with enormous ears. Hears prey under the sand.' });
  S('fox', { name: 'Red Fox', lean: 'S/C', branch: 'Dogs and hyenas', icon: '🦊',
    tagline: 'Clever, adaptable, and always one step to the side of where you looked.' });
  S('jackal', { name: 'Golden Jackal', lean: 'C/T', branch: 'Dogs and hyenas', icon: '🐕',
    tagline: 'Hunts in pairs, takes every chance, and is never as lost as it looks.' });
  S('coyote', { name: 'Coyote', lean: 'T/S', branch: 'Dogs and hyenas', icon: '🐺',
    tagline: 'The trickster. Lives anywhere, sounds like ten of itself.' });
  S('hyena', { name: 'Spotted Hyena', lean: 'M/C', branch: 'Dogs and hyenas', alsoKin: ['Cats'], icon: '🐕',
    tagline: 'Bone-cracking jaws, a matriarch\'s clan, and a laugh that carries for miles.' });
  T.shareTrait('cat_bite', 'hyena');

  K(DOG_KIN,'dog_nose','Keen Nose','S',0,
    { n:'Track', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'reveal', nearest:true, dur:2},{v:'mark', nearest:true}],
      txt:(P,E)=>`Smell out everything within ${2+P} this round; the nearest foe is Revealed for 2 rounds and is Marked (the next hit on it deals +2).` },
    { n:'Scent Lock', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:(P,E)=>2+E},{v:'mark', n:(P,E)=>E, dur:3}],
      txt:(P,E)=>`Lock onto a foe's scent: Revealed for ${2+E} rounds, and it is Marked +${E} for 3 rounds.` },
    'A thousand smells, and the one that matters.', 'Dogs and hyenas');
  K(DOG_KIN,'dog_howl','Pack Howl','C',0,
    { n:'Howl', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'adj'},{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Foes beside you are Weakened 1 this round; your ally's next strike deals +${1+h(P)}.` },
    { n:'Chorus', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'ap', val:1, dur:(P,E)=>1+E, party:true},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`For ${1+E} rounds both heroes gain 1 AP at the start of each turn; both heroes' next strike deals +1.` },
    'Where we are, and how many.', 'Dogs and hyenas');
  K(DOG_KIN,'dog_trot','Long Trot','T',0,
    { n:'Trot', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P}],
      txt:(P,E)=>`Move ${1+P}.` },
    { n:'Relay', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:2},{v:'haste', n:(P,E)=>1+E}],
      txt:(P,E)=>`Move 2; Haste: every card on your track returns ${1+E} columns sooner.` },
    'Not fast. Just never stopping.', 'Dogs and hyenas');
  K(DOGS,'dog_pin','Pin Down','M',0,
    { n:'Pin', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Melee ${2+P}, and it is Anchored 1.` },
    { n:'Hold Down', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+E},{v:'anchor', who:'foe', dur:(P,E)=>1+h(E)},{v:'weaken', val:1, dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Melee ${1+E}; hold it down: Anchored and Weakened 1, for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}.` },
    'Paws on its back, all your weight behind them.', 'Dogs and hyenas');

  // the two foxes
  K(['fennec','fox'],'fox_pounce','Mousing Pounce','M',0,
    { n:'Snow Dive', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+P, revealTarget:true},{v:'mark', n:1, dur:3}],
      txt:(P,E)=>`Dive on a foe within 2 for ${2+P}, hidden or not, and it is Marked +1 for 3 rounds.` },
    { n:'High Arc', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, dest:'adjTarget', height:true},{v:'strike', kind:'melee', dmg:(P,E)=>3+E, revealTarget:true}],
      txt:(P,E)=>`Arc through the air to beside a foe within ${2+E}, height included, and land on it for ${3+E}.` },
    'Up, over, and straight down through the snow.');
  K(['fennec','fox'],'fox_den','Den','T',0,
    { n:'Go to Ground', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'shield', val:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Go to ground: Hidden 1 and Shield ${1+h(P)} this round.` },
    { n:'Earth', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:(P,E)=>1+E, party:true, radius:1},{v:'heal', n:1, party:true},{v:'hazardImmune', dur:1, party:true}],
      txt:(P,E)=>`You and an ally beside you are Hidden for ${1+E} rounds; both heroes heal 1 and ignore hazards this round.` },
    'A hole with three back doors.');

  // the jackal and the coyote
  K(['jackal','coyote'],'dog_yip','Yip Chorus','C',0,
    { n:'Yip', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Call out what you see within ${2+P}; your ally's next strike deals +1.` },
    { n:'Where Are You', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'reveal', radius:(P,E)=>1+E, dur:(P,E)=>1+E},{v:'shield', val:1, next:true, party:true}],
      txt:(P,E)=>`Everything within ${1+E} answers for ${1+E} rounds and is seen, and Shield: both heroes' next hit taken is 1 less.` },
    'Two voices that sound like ten.');
  K(['jackal','coyote'],'dog_opp','Opportunist','M',0,
    { n:'Snatch', ap:1, el:0, cd:2, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'draw', face:'AP', n:1}],
      txt:(P,E)=>`Melee ${1+P}, and draw 1 pool die as AP.` },
    { n:'Steal the Kill', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E, onKill:{v:'mint', face:'O', n:1}},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Melee ${2+E}; if it falls, mint 1 Omni. Then step 1.` },
    'Whatever is left, whenever it is left.');

  // Fennec fox: the dogs' four, the foxes' two, and these three
  K(['fennec'],'fen_ears','Big Ears','S',2,
    { n:'Cool Down', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Hear everything within ${2+P} this round; your ears shed the heat: hazards don't touch you for 2 rounds.` },
    { n:'Under the Sand', ap:0, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'reveal', radius:(P,E)=>1+E, dur:(P,E)=>1+E},{v:'shield', val:(P,E)=>1+h(E), next:true}],
      txt:(P,E)=>`Hear everything within ${1+E} for ${1+E} rounds; Shield: the next hit on you is ${1+h(E)} less.` },
    'Half of the fox is ear.');
  K(['fennec'],'fen_thrift','Desert Thrift','T',0,
    { n:'Ration', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+h(P)},{v:'haste', n:1}],
      txt:(P,E)=>`Heal ${1+h(P)}; Haste: every card on your track returns 1 column sooner.` },
    { n:'Long Dry', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'ap', val:1, dur:(P,E)=>1+E},{v:'heal', n:1}],
      txt:(P,E)=>`For ${1+E} rounds you gain 1 AP at the start of each turn; heal 1.` },
    'Never drinks. Doesn\'t need to.');
  K(['fennec'],'fen_night','Night Trot','S',0,
    { n:'Night Trot', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'reveal', radius:1, dur:1}],
      txt:(P,E)=>`Move ${1+P}, seeing what is beside you as you go.` },
    { n:'Moon Run', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+E, canMove:true},{v:'move', n:2, free:true}],
      txt:(P,E)=>`Hide for ${1+E} rounds, moving freely, and run 2 now.` },
    'Out at dusk, home by dawn, and nobody saw.');

  // Red fox: the dogs' four, the foxes' two, and these three
  K(['fox'],'fox_magnet','Magnetic Sense','S',0,
    { n:'Line Up', ap:1, el:0, cd:1, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:(P,E)=>2+P},{v:'mark', n:1, dur:3}],
      txt:(P,E)=>`Line up on any foe: Revealed for ${2+P} rounds, and it is Marked +1 for 3 rounds.` },
    { n:'North Leap', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>3+E, dest:'adjTarget'},{v:'strike', kind:'melee', dmg:(P,E)=>2+E}],
      txt:(P,E)=>`Leap the long way to beside a foe within ${3+E}, and land on it for ${2+E}.` },
    'It pounces facing north, and it hits more often that way.');
  K(['fox'],'fox_cunning','Cunning','T',2,
    { n:'Read It', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P)},{v:'mark', n:1, dur:3}],
      txt:(P,E)=>`Work out a foe within 3: Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}, and it is Marked +1 for 3 rounds.` },
    { n:'Outfox', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+E, next:true, party:true},{v:'haste', free:true, n:1, dur:1}],
      txt:(P,E)=>`Shield: both heroes' next hit taken is ${1+E} less, and Haste: the next card you play this turn doesn't go to the track.` },
    'Already gone the way you were about to look.');
  K(['fox'],'fox_brush','Brush Feint','S',0,
    { n:'Brush', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+h(P), next:true, reposition:1},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Shield: the next hit on you is ${1+h(P)} less, and you dodge a step from it; step 1 now.` },
    { n:'Tail Flag', ap:1, el:1, cd:3, dur:0, tgt:'node_r3',
      fx:[{v:'decoy', dur:(P,E)=>1+E},{v:'hidden', dur:1}],
      txt:(P,E)=>`Flick your tail where you are not: a decoy draws foes to a node within 3 for ${1+E} rounds, and you are Hidden 1.` },
    'Look at the tail. Not the fox.');

  // Golden jackal: the dogs' four, the jackal and coyote's two, and these three
  K(['jackal'],'jac_pair','Pair Hunt','C',2,
    { n:'Flank', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'mark', n:1, dur:3}],
      txt:(P,E)=>`Melee ${1+P}, opening it up: it is Marked +1 for 3 rounds.` },
    { n:'Pair Hunt', ap:1, el:1, cd:3, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:2},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Send your partner up to 2; both heroes' next strike deals +${1+E}.` },
    'One drives, one waits.');
  K(['jackal'],'jac_coat','Golden Coat','T',0,
    { n:'Golden Coat', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1},{v:'cleanse'}],
      txt:(P,E)=>`Shield ${1+P} this round, and shake off Anchored and Weakened.` },
    { n:'Sunlit', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+E, dur:1, party:true},{v:'cleanse', party:true}],
      txt:(P,E)=>`Both heroes hold Shield ${1+E} this round and shake off Anchored and Weakened.` },
    'Dust slides off it.');
  K(['jackal'],'jac_luck','Scavenger\'s Luck','T',0,
    { n:'Scrounge', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'draw', face:'AP', n:1},{v:'reroll', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Draw 1 pool die as AP, and reroll ${1+h(P)} banked ${1+h(P) > 1 ? 'dice' : 'die'}.` },
    { n:'Lucky Find', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'mint', face:'O', n:1},{v:'heal', n:(P,E)=>1+E}],
      txt:(P,E)=>`Mint 1 temporary Omni, and heal ${1+E}.` },
    'Something good is always lying around.');

  // Coyote: the dogs' four, the jackal and coyote's two, and these three
  K(['coyote'],'coy_trick','Trickster','S',2,
    { n:'Lure', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'force', kind:'pull', n:(P,E)=>1+h(P)},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Lure a foe within 3 ${1+h(P)} toward you; it is Weakened 1 this round.` },
    { n:'Switcheroo', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'decoy', dur:2, here:true},{v:'blink', reach:(P,E)=>2+E},{v:'empower', val:2, uses:1, dur:2}],
      txt:(P,E)=>`Leave a decoy where you stand and slip to a node within ${2+E}; your next strike deals +2.` },
    'It was right there. It was never there.');
  K(['coyote'],'coy_adapt','Adapt Anywhere','T',0,
    { n:'Adapt', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'hazardImmune', dur:2},{v:'heal', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Shake off Anchored and Weakened, ignore hazards for 2 rounds, and heal ${1+h(P)}.` },
    { n:'Make Do', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:(P,E)=>1+E},{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E}],
      txt:(P,E)=>`Heal 1 at the start of each turn for ${2+E} rounds; Cleanse, and no foe can Weaken or Anchor you for ${1+E}.` },
    'Desert, forest, city. Same coyote.');
  K(['coyote'],'coy_lope','Lope Feint','S',0,
    { n:'Lope', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true}],
      txt:(P,E)=>`Lope ${1+P}, slipping past foes.` },
    { n:'Double Back', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E, ignoreFoes:true},{v:'hidden', dur:1},{v:'empower', val:1, uses:1, dur:2}],
      txt:(P,E)=>`Lope ${2+E} past foes and double back unseen: Hidden 1, and your next strike deals +1.` },
    'Never the straight line.');

  // Spotted hyena: Keen Nose, Pack Howl, Long Trot, Killing Bite, and these five
  K(['hyena'],'hye_crush','Bone Crush','M',2,
    { n:'Crunch', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P, pierce:(P,E)=>P>=2},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Melee ${2+P}${P >= 2 ? ' through Shield' : ''}; it is Weakened 1 this round.` },
    { n:'Bone Crack', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'stripShield', amount:(P,E)=>1+E},{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'weaken', val:2, dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Crack ${1+E} off its Shield, melee ${3+E}, and it is Weakened 2 for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}.` },
    'Jaws that eat the bones too.');
  K(['hyena'],'hye_whoop','Clan Whoop','C',0,
    { n:'Whoop', ap:1, el:0, cd:1, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:2},{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Call your partner up to 2 nodes; their next strike deals +${1+h(P)}.` },
    { n:'Mob', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+E, area:'radius', radius:2},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Every foe within 2 is Weakened 1 for ${1+E} rounds; both heroes' next strike deals +1.` },
    'Heard five kilometres off. Everyone comes.');
  K(['hyena'],'hye_scav','Scavenge','T',0,
    { n:'Scavenge', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P, onKill:{v:'heal', n:2}},{v:'heal', n:1}],
      txt:(P,E)=>`Melee ${1+P} and heal 1; if it falls, heal 2 more.` },
    { n:'Iron Gut', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E},{v:'cleanse'}],
      txt:(P,E)=>`Heal 1 at the start of each turn for ${2+E} rounds, and shake off Anchored and Weakened.` },
    'Nothing wasted.');
  K(['hyena'],'hye_endure','Endurance','T',0,
    { n:'Keep Going', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'heal', n:1}],
      txt:(P,E)=>`Move ${1+P}, and heal 1.` },
    { n:'Run It Down', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'ap', val:1, dur:(P,E)=>2+E},{v:'haste', n:1}],
      txt:(P,E)=>`For ${2+E} rounds you gain 1 AP at the start of each turn; Haste: your track returns 1 column sooner.` },
    'The chase ends when the prey stops. The hyena doesn\'t.');
  K(['hyena'],'hye_matri','Matriarch','C',0,
    { n:'Rank', ap:1, el:0, cd:1, dur:0, tgt:'ally',
      fx:[{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:2, target:'ally'},{v:'heal', n:1, target:'ally'}],
      txt:(P,E)=>`Your ally heals 1 and their next strike deals +${1+h(P)}.` },
    { n:'Clan', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'shield', val:1, dur:2, party:true},{v:'empower', val:(P,E)=>1+h(E), uses:2, dur:2, party:true}],
      txt:(P,E)=>`Both heroes hold Shield 1 for 2 rounds; their next two strikes deal +${1+h(E)}.` },
    'She leads, and the clan eats in her order.');

  /* ───────────────────────── WEASEL KIN ─────────────────────────
     sea otter · ratel · red panda. Musk and Dense Fur are every one's; Ferocity the otter's and the
     badger's. The otter also uses tools (Human's Tool Use); the red panda has Human's Opposable Grip (a false
     thumb) and climbs down headfirst like the ocelot (Headfirst Descent). */
  const WEASEL = ['otter','badger','red_panda'];
  S('otter', { name: 'Sea Otter', lean: 'C/M', branch: 'Weasel kin', icon: '🦦',
    tagline: 'Floats on its back, cracks shells on a rock, holds hands while it sleeps.' });
  S('badger', { name: 'Ratel', lean: 'M/T', branch: 'Weasel kin', icon: '🦡',
    tagline: 'Loose skin, no fear, and a habit of eating things that sting.' });
  S('red_panda', { name: 'Red Panda', lean: 'T/S', branch: 'Weasel kin', icon: '🐼',
    tagline: 'Treetop dweller in a thick red coat. Stands tall when it means it.' });
  T.shareTrait('hum_tool', 'otter');
  T.shareTrait('hum_grip', 'red_panda');
  T.shareTrait('oce_descent', 'red_panda');

  K(WEASEL,'wea_musk','Musk','C',0,
    { n:'Musk', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P), area:'adj'},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Foes beside you are Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}; Shield: the next hit on you is 1 less.` },
    { n:'Reek', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'field', radius:1, on:'end', dur:3, fx:[{kw:'weaken', n:1}]},{v:'weaken', val:1, dur:(P,E)=>1+E, area:'radius', radius:2}],
      txt:(P,E)=>`Every foe within 2 is Weakened 1 for ${1+E} rounds, and a Field reeks on and beside your space for 3 rounds: foes ending the round there are Weakened 1.` },
    'A smell with an opinion.', 'Weasel kin');
  K(WEASEL,'wea_fur','Dense Fur','M',0,
    { n:'Thick Coat', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Shield ${1+P} this round, and hazards don't touch you.` },
    { n:'Weatherproof', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+E, dur:2},{v:'hazardImmune', dur:(P,E)=>1+E}],
      txt:(P,E)=>`Shield ${1+E} for 2 rounds; hazards don't touch you for ${1+E}.` },
    'More hairs on a thumbnail than on a person\'s head.', 'Weasel kin');
  K(['otter','badger'],'wea_ferocity','Ferocity','M',0,
    { n:'Savage', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Melee ${2+P}; your next strike this turn deals +1.` },
    { n:'Frenzy', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'strike', kind:'area', dmg:1},{v:'thorns', val:1, dur:(P,E)=>1+E}],
      txt:(P,E)=>`Melee ${2+E}, then thrash: every foe beside you takes 1. For ${1+E} rounds, a foe that hits you in melee takes 1.` },
    'Small, and does not know it.');

  // Sea otter: Musk, Dense Fur, Ferocity, Tool Use, and these five
  K(['otter'],'ott_raft','Raft Together','C',0,
    { n:'Hold Paws', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+h(P), dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`Hold Shield ${2+h(P)} this round; an ally beside you holds it too.` },
    { n:'Raft', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'heal', n:(P,E)=>1+E, party:true},{v:'shield', val:1, dur:1, party:true},{v:'hazardImmune', dur:1, party:true}],
      txt:(P,E)=>`Both heroes heal ${1+E}, hold Shield 1 this round, and ignore hazards this round.` },
    'Nobody drifts off in the night.');
  K(['otter'],'ott_shell','Shell Crack','M',2,
    { n:'Crack', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'stripShield', amount:(P,E)=>1+P},{v:'strike', kind:'melee', dmg:(P,E)=>1+P}],
      txt:(P,E)=>`Knock ${1+P} off its Shield with your rock, then melee ${1+P}.` },
    { n:'Rock Throw', ap:1, el:1, cd:3, dur:0, tgt:'foe_los',
      fx:[{v:'stripShield', amount:2},{v:'strike', kind:'los', dmg:(P,E)=>2+E}],
      txt:(P,E)=>`Throw your rock at a foe in sight: 2 of its Shield cracks, and it takes ${2+E}.` },
    'One favourite rock, kept in an armpit pocket.');
  K(['otter'],'ott_roll','Otter Roll','S',0,
    { n:'Roll', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true},{v:'cleanse'}],
      txt:(P,E)=>`Roll ${1+P}, past foes, shaking off Anchored and Weakened.` },
    { n:'Spin Free', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E},{v:'cleanse', party:true}],
      txt:(P,E)=>`Spin away to a node within ${2+E}; both heroes shake off Anchored and Weakened.` },
    'Twist, twist, and gone.');
  K(['otter'],'ott_kelp','Kelp Anchor','T',0,
    { n:'Wrap', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'anchor', who:'self', dur:(P,E)=>1+h(P)},{v:'shield', val:1, dur:1},{v:'heal', n:1}],
      txt:(P,E)=>`Wrap yourself in place: nothing can push or pull you for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}; Shield 1 and heal 1.` },
    { n:'Kelp Bed', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'anchor', who:'self', dur:(P,E)=>1+E},{v:'anchor', who:'ally', dur:(P,E)=>1+E},{v:'heal', n:1, party:true}],
      txt:(P,E)=>`Neither hero can be pushed or pulled for ${1+E} rounds, and both heal 1.` },
    'Tied to the forest so the tide can\'t take you.');
  K(['otter'],'ott_whisker','Whisker Hunt','S',0,
    { n:'Whiskers', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'reveal', target:true, dur:2},{v:'mark', n:(P,E)=>1+h(P), dur:3}],
      txt:(P,E)=>`Feel out a foe within 2, seen or not: Revealed for 2 rounds, and it is Marked +${1+h(P)} for 3 rounds.` },
    { n:'Murky Hunt', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:3, dur:(P,E)=>1+E},{v:'mark', area:true, radius:2}],
      txt:(P,E)=>`Feel the water within 3 for ${1+E} rounds; every foe within 2 is Marked.` },
    'Dark water, and every ripple in it.');

  // Ratel (honey badger): Musk, Dense Fur, Ferocity, and these six
  K(['badger'],'bad_venom','Venom Shrug','T',0,
    { n:'Shrug', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:1},{v:'heal', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Shake off Anchored and Weakened, heal ${1+h(P)}, and Cleanse, and no foe can Weaken or Anchor you this round.` },
    { n:'Sleep It Off', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:(P,E)=>1+E},{v:'heal', n:(P,E)=>2+E}],
      txt:(P,E)=>`Heal ${2+E}; Cleanse, and no foe can Weaken or Anchor you for ${1+E} rounds.` },
    'Bitten. Shrugs. Carries on.');
  K(['badger'],'bad_dig','Burrow In','M',0,
    { n:'Dig', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'shield', val:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Dig in: Hidden 1 and Shield ${1+h(P)} this round.` },
    { n:'Tunnel', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E},{v:'hidden', dur:1}],
      txt:(P,E)=>`Tunnel to a node within ${2+E} and come up Hidden 1.` },
    'Faster down than you are.');
  K(['badger'],'bad_hide','Loose Hide','T',0,
    { n:'Twist Free', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'shield', val:(P,E)=>1+h(P), next:true, reflect:1}],
      txt:(P,E)=>`Shake off Anchored and Weakened; Shield: the next hit on you is ${1+h(P)} less, and you bite back for 1.` },
    { n:'Loose Skin', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>2+E, next:true, dur:2},{v:'shield', val:2, next:true}],
      txt:(P,E)=>`Hold a turn-and-bite ready: Thorns: the next foe to hit you in melee takes ${2+E}, and Shield 2 against that hit.` },
    'Grab it anywhere and it turns round inside its skin.');
  K(['badger'],'bad_bee','Bee Raid','C',0,
    { n:'Raid', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'wound', n:2, kind:'venom'}],
      txt:(P,E)=>`Melee ${1+P}, and it is stung: Wounded 2.` },
    { n:'Kick the Hive', ap:1, el:1, cd:3, dur:0, tgt:'node_r2',
      fx:[{v:'wound', n:(P,E)=>2+h(E), kind:'venom', area:'nodeArea'},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Kick a hive open at a node within 2: every foe on or beside it is stung: Wounded ${2+h(E)}. Stings don't bother you for 2.` },
    'The bees mind. The ratel doesn\'t.');
  K(['badger'],'bad_never','Never Retreat','M',2,
    { n:'Stand', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'anchor', who:'self', dur:1},{v:'empower', val:(P,E)=>1+P, uses:1, dur:2}],
      txt:(P,E)=>`Plant your feet: nothing can push or pull you this round, and your next strike deals +${1+P}.` },
    { n:'No Retreat', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:(P,E)=>1+E},{v:'thorns', val:(P,E)=>1+h(E), dur:(P,E)=>1+E},{v:'anchor', who:'self', dur:(P,E)=>1+E}],
      txt:(P,E)=>`Cleanse, and for ${1+E} rounds nothing can Weaken or Anchor you, or push or pull you, and a foe that hits you in melee takes ${1+h(E)}.` },
    'There is no other direction.');
  K(['badger'],'bad_bite','Bite Hold','M',0,
    { n:'Bite', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'wound', n:2, kind:'crush'}],
      txt:(P,E)=>`Melee ${1+P}, and don't let go: Wounded 2.` },
    { n:'Lockjaw', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'anchor', who:'foe', dur:2},{v:'wound', n:(P,E)=>2+h(E), kind:'crush'}],
      txt:(P,E)=>`Melee ${2+E} and lock on: it is Anchored for 2 rounds, and is Wounded ${2+h(E)}.` },
    'Lets go when it decides to.');

  // Red panda: Musk, Dense Fur, Opposable Grip, Headfirst Descent, and these five
  K(['red_panda'],'rpa_tall','Stand Tall','C',2,
    { n:'Stand Tall', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'adj'},{v:'shield', val:(P,E)=>1+h(P), next:true}],
      txt:(P,E)=>`Rear up, arms wide: foes beside you are Weakened 1 this round, and Shield: the next hit on you is ${1+h(P)} less.` },
    { n:'Arms Up', ap:0, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'force', kind:'push', n:(P,E)=>1+h(E), area:true},{v:'weaken', val:1, dur:(P,E)=>1+E, area:'radius', radius:2}],
      txt:(P,E)=>`Foes beside you are driven back ${1+h(E)}, and every foe within 2 is Weakened 1 for ${1+E} rounds.` },
    'Much bigger than it is, for a moment.');
  K(['red_panda'],'rpa_nap','Tree Nap','T',0,
    { n:'Nap', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'hidden', dur:1}],
      txt:(P,E)=>`Curl up out of sight: heal ${1+P}, and Hidden 1.` },
    { n:'Long Nap', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:(P,E)=>1+h(E), dur:3},{v:'hidden', dur:1}],
      txt:(P,E)=>`Heal ${1+h(E)} at the start of each turn for 3 rounds; Hidden 1.` },
    'Draped over a branch, tail over the nose.');
  K(['red_panda'],'rpa_tail','Tail Wrap','S',0,
    { n:'Balance', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Climb up to ${1+P}, height included, balanced on your tail: Shield 1 this round.` },
    { n:'Wrap Up', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+E, dur:2},{v:'anchor', who:'self', dur:2}],
      txt:(P,E)=>`Wrap up tight: Shield ${1+E} for 2 rounds, and nothing can push or pull you.` },
    'A blanket, a balance pole, a scarf.');
  K(['red_panda'],'rpa_bamboo','Bamboo Jaw','M',0,
    { n:'Chew', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`Melee ${2+P}.` },
    { n:'Crush Stalk', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'weaken', val:1, dur:2}],
      txt:(P,E)=>`Melee ${3+E}; it is Weakened 1 for 2 rounds.` },
    'Jaws built for wood.');
  K(['red_panda'],'rpa_cold','Cold Sleep','T',0,
    { n:'Slow Down', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+h(P), dur:1},{v:'hazardImmune', dur:2},{v:'haste', n:1}],
      txt:(P,E)=>`Shield ${1+h(P)} this round, ignore hazards for 2, and Haste: your track returns 1 column sooner.` },
    { n:'Torpor', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'stasis', dur:1},{v:'engine', kind:'regen', val:1, dur:(P,E)=>1+E}],
      txt:(P,E)=>`Drop into torpor: nothing can touch you until your next turn, and you heal 1 at the start of each turn for ${1+E} rounds.` },
    'When it is cold, it simply slows down.');
  /* ───────────────────────── SEA MAMMALS ─────────────────────────
     walrus · orca · narwhal. All three carry Blubber and Breath Hold; the two whales Echolocation and
     Pod Song; the two tuskers Tusk. */
  const SEA = ['walrus','orca','narwhal'];
  S('walrus', { name: 'Walrus', lean: 'M/T', branch: 'Sea mammals', icon: '🦭',
    tagline: 'A ton of whiskers, blubber and tusk. Loud, sociable, immovable.' });
  S('orca', { name: 'Orca', lean: 'M/C', branch: 'Sea mammals', icon: '🐋',
    tagline: 'The ocean’s pack hunter. Clever, coordinated, and never alone.' });
  S('narwhal', { name: 'Narwhal', lean: 'S/T', branch: 'Sea mammals', icon: '🐋',
    tagline: 'A pale whale of the ice, with a long spiral tusk that feels the water.' });

  K(SEA,'sea_blubber','Blubber','M',0,
    { n:'Insulate', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+h(P), dur:1}],
      txt:(P,E)=>`Shield ${2+h(P)} this round.` },
    { n:'Thick Layer', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:1},{v:'shield', val:(P,E)=>2+E, dur:2}],
      txt:(P,E)=>`Shield ${2+E} for 2 rounds, and Cleanse, and you can't be Weakened or Anchored by a foe this round.` },
    'Warm inside, whatever the water.', 'Sea mammals');
  K(SEA,'sea_breath','Breath Hold','T',0,
    { n:'Hold', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hazardImmune', dur:2},{v:'heal', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Ignore hazards for 2 rounds, and heal ${1+h(P)}.` },
    { n:'Long Dive', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hazardImmune', dur:(P,E)=>2+E},{v:'heal', n:(P,E)=>2+E},{v:'cleanse'}],
      txt:(P,E)=>`Ignore hazards for ${2+E} rounds, heal ${2+E}, and cleanse (Anchored, Weakened, Wounds).` },
    'One breath, a long way down.', 'Sea mammals');
  K(['orca','narwhal'],'sea_echo','Echolocation','S',0,
    { n:'Click', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Click: reveal within ${2+P} this round, and your next hit deals +1.` },
    { n:'Sound the Deep', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+E, dur:2},{v:'mark', area:true, radius:(P,E)=>1+E}],
      txt:(P,E)=>`Reveal everything within ${1+E} for 2 rounds, and Mark every foe within ${1+E} (the next hit on each deals +2).` },
    'The water answers in echoes.', 'Sea mammals');
  K(['orca','narwhal'],'sea_song','Pod Song','C',0,
    { n:'Call the Pod', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:2, party:true},{v:'heal', n:1, target:'ally'}],
      txt:(P,E)=>`Both heroes' next hit deals +${1+h(P)}; your ally heals 1.` },
    { n:'Chorus', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'ap', val:1, dur:(P,E)=>1+E, party:true}],
      txt:(P,E)=>`Both heroes gain 1 AP at the start of each turn for ${1+E} ${1+E > 1 ? 'rounds' : 'round'}.` },
    'Every pod sings its own dialect.', 'Sea mammals');
  K(['walrus','narwhal'],'sea_tusk','Tusk','M',0,
    { n:'Hook', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'stripShield', amount:2},{v:'strike', kind:'melee', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`Hook a foe beside you: 2 of its Shield comes off, then melee ${2+P}.` },
    { n:'Spear', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>4+E, pierce:true},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Melee ${4+E} that ignores Shield, and push it 1.` },
    'A tooth grown long enough to lean on.', 'Sea mammals');

  // Walrus: blubber, breath, tusk, and these six
  K(['walrus'],'wal_haul','Haul Out','S',0,
    { n:'Flop Ashore', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'shield', val:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Move ${1+P}, then hold Shield ${1+h(P)} this round.` },
    { n:'Bask', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E},{v:'shield', val:2, dur:1}],
      txt:(P,E)=>`Shield 2 this round, and heal 1 at the start of each turn for ${2+E} rounds.` },
    'Out of the water, onto the ice, and asleep.');
  K(['walrus'],'wal_whisker','Whisker Feel','S',0,
    { n:'Feel the Floor', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+P, dur:1},{v:'mark', nearest:true},{v:'heal', n:1}],
      txt:(P,E)=>`Reveal within ${1+P}, Mark the nearest foe (the next hit on it deals +2), and heal 1.` },
    { n:'Read the Current', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:3},{v:'mark', n:(P,E)=>1+E, dur:3},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Feel out any foe: Revealed for 3 rounds, it is Weakened 1 this round, and it is Marked +${1+E} for 3 rounds.` },
    'Four hundred whiskers, all of them listening.');
  K(['walrus'],'wal_bellow','Herd Bellow','C',0,
    { n:'Bellow', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+h(P), dur:1, party:true},{v:'weaken', val:1, dur:1, area:'adj'}],
      txt:(P,E)=>`Both heroes hold Shield ${1+h(P)} this round, and every foe beside you is Weakened 1.` },
    { n:'Herd Up', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+E, next:true, party:true},{v:'cleanse', party:true}],
      txt:(P,E)=>`Both heroes cleanse (Anchored, Weakened, Wounds), and Shield: the next hit on each is ${1+E} less.` },
    'Heard for a mile across the floe.');
  K(['walrus'],'wal_suction','Suction Feed','M',0,
    { n:'Suck In', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'force', kind:'pull', n:2},{v:'strike', kind:'los', dmg:(P,E)=>1+P}],
      txt:(P,E)=>`Pull a foe within 2 up to 2 toward you, and it takes ${1+P}.` },
    { n:'Feast', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'heal', n:(P,E)=>1+E}],
      txt:(P,E)=>`Melee ${2+E}, and heal ${1+E}.` },
    'It eats clams by sucking them out of the shell.');
  K(['walrus'],'wal_ice','Ice Haul','T',0,
    { n:'Tusk Up', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Haul yourself up on your tusks: climb ${1+P}, and hold Shield 1 this round.` },
    { n:'Break the Ice', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'field', around:true, radius:1, on:'end', dur:2, fx:[{kw:'weaken', n:1}]},{v:'hazardImmune', dur:(P,E)=>1+E}],
      txt:(P,E)=>`Smash the ice: for 2 rounds a Field within 1 of you Weakens 1 every foe that ends the round in it, and you ignore hazards for ${1+E} rounds.` },
    'Its Latin name means tooth-walker.');
  K(['walrus'],'wal_ton','Ton of Weight','M',0,
    { n:'Lean In', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Melee ${3+P}, and push it 1.` },
    { n:'Belly Flop', ap:0, el:1, cd:3, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>2+E},{v:'weaken', val:1, dur:1, area:'adj'}],
      txt:(P,E)=>`Every foe beside you takes ${2+E} and is Weakened 1 this round.` },
    'Nobody asks a walrus to move.');

  // Orca: blubber, breath, echolocation, pod song, and these five
  K(['orca'],'orc_breach','Breach','S',0,
    { n:'Breach', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:2, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>2+P, ifAdjacent:true}],
      txt:(P,E)=>`Surge up to 2 toward a foe within 3; if you end beside it, melee ${2+P}.` },
    { n:'Spyhop', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>3+E, dest:'adjTarget'},{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Burst out beside a foe within ${3+E}, melee ${3+E}, and push it 1.` },
    'Up out of the water, all eight tons of it.');
  K(['orca'],'orc_tactics','Pod Tactics','C',0,
    { n:'Herd the Prey', ap:1, el:0, cd:1, dur:0, tgt:'foe_any',
      fx:[{v:'mark'},{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Mark a foe (the next hit on it deals +2), and your ally's next hit deals +${1+h(P)}.` },
    { n:'Wave Hunt', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true},{v:'engine', kind:'ap', val:1, dur:1, target:'ally'}],
      txt:(P,E)=>`Both heroes' next hit deals +${1+E}, and your ally gains 1 AP next turn.` },
    'They plan, and they teach the plan to their young.');
  K(['orca'],'orc_wave','Wave Wash','S',0,
    { n:'Wash', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>1+P},{v:'force', kind:'push', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`A foe within 2 takes ${1+P} and is pushed ${1+h(P)}.` },
    { n:'Wall of Water', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'radius', radius:(P,E)=>1+E},{v:'force', kind:'push', n:1, area:true, radius:(P,E)=>1+E}],
      txt:(P,E)=>`Every foe within ${1+E} is Weakened 1 this round and pushed 1.` },
    'They wash seals off the ice together.');
  K(['orca'],'orc_apex','Apex','M',0,
    { n:'Take Down', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'execute', threshold:(P,E)=>2+P}],
      txt:(P,E)=>`Melee ${2+P}; a foe left at ${2+P} or less is finished.` },
    { n:'Top of the Sea', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'cleanse', ward:1},{v:'strike', kind:'melee', dmg:(P,E)=>4+E, pierce:true}],
      txt:(P,E)=>`Melee ${4+E} that ignores Shield, and Cleanse, and you can't be Weakened or Anchored by a foe this round.` },
    'Nothing in the sea hunts an orca.');
  K(['orca'],'orc_beach','Beach Charge','M',0,
    { n:'Ride the Surf', ap:1, el:0, cd:2, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Move ${1+P}, passing foes, and your next hit this turn deals +1.` },
    { n:'Strand', ap:2, el:1, cd:4, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'anchor', who:'foe', dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Melee ${3+E} and pin it on the shore: Anchored ${1+h(E)}.` },
    'It throws itself up the beach, and back.');

  // Narwhal: blubber, breath, echolocation, pod song, tusk, and these four
  K(['narwhal'],'nar_sense','Sense Tusk','S',0,
    { n:'Taste the Water', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'shield', val:(P,E)=>1+h(P), next:true},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Reveal within ${2+P}; Shield: the next hit on you is ${1+h(P)} less, and your next hit this turn deals +1.` },
    { n:'Read the Sea', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+E, next:true, party:true},{v:'hazardImmune', dur:1, party:true}],
      txt:(P,E)=>`Shield: the next hit on each hero is ${1+E} less, and both ignore hazards this round.` },
    'The tusk is a tooth that feels the sea.');
  K(['narwhal'],'nar_lead','Ice Lead','T',0,
    { n:'Show the Way', ap:1, el:0, cd:1, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>1+P}],
      txt:(P,E)=>`Your ally moves ${1+P}.` },
    { n:'Open Water', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hazardImmune', dur:(P,E)=>1+E},{v:'hazardImmune', dur:1, party:true},{v:'engine', kind:'ap', val:1, dur:1, party:true}],
      txt:(P,E)=>`Both heroes gain 1 AP next turn and ignore hazards this round; you for ${1+E} rounds.` },
    'It knows where the ice will open.');
  K(['narwhal'],'nar_dive','Deep Dive','T',0,
    { n:'Sound', ap:1, el:0, cd:2, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hidden', dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Move ${1+P}, Hidden 1, and your next hit this turn deals +1.` },
    { n:'Surface Far Off', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E},{v:'hidden', dur:1}],
      txt:(P,E)=>`Dive and come up anywhere within ${2+E}, Hidden 1.` },
    'A mile down, in the dark, all winter.');
  K(['narwhal'],'nar_ghost','Pale Ghost','C',0,
    { n:'Unsettle', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P)},{v:'strike', kind:'los', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`A foe within 3 takes ${2+P} and is Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}.` },
    { n:'Vanish', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:1, party:true, radius:2},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`You and an ally within 2 are Hidden 1, and your next hit deals +${1+E}.` },
    'The unicorn of the sea, seen mostly as a shape under the ice.');
  /* ───────────────────────── HOOFED ANIMALS ─────────────────────────
     yak · bison · oryx · bighorn ram · moose · deer · zebra. Every hoofed animal carries Hooves, Herd Ring,
     Wide Eyes and Kick; the horned four Horn Charge and Ruminate; moose and deer Antlers and Bound Away. */
  const HOOVED = ['yak','bison','oryx','ram','moose','deer','zebra'];
  const HORNED = ['yak','bison','oryx','ram'];
  const ANTLERED = ['moose','deer'];
  S('yak', { name: 'Yak', lean: 'T/M', branch: 'Hoofed animals', icon: '🐂',
    tagline: 'A shaggy load-carrier of the high cold, steady where the air runs thin.' });
  S('bison', { name: 'Bison', lean: 'M/T', branch: 'Hoofed animals', icon: '🦬',
    tagline: 'A ton of shoulder and fur that faces the storm head-on.' });
  S('oryx', { name: 'Oryx', lean: 'S/T', branch: 'Hoofed animals', icon: '🐐',
    tagline: 'A desert antelope with horns like rapiers and water saved for later.' });
  S('ram', { name: 'Bighorn Ram', lean: 'M/S', branch: 'Hoofed animals', icon: '🐏',
    tagline: 'Cliff-walker with curled horns and a skull built for collisions.' });
  S('moose', { name: 'Moose', lean: 'M/C', branch: 'Hoofed animals', icon: '🫎',
    tagline: 'Tall, solitary and wading. Gentle until it very suddenly is not.' });
  S('deer', { name: 'Deer', lean: 'S/C', branch: 'Hoofed animals', icon: '🦌',
    tagline: 'All ears and spring. Gone before you knew it had seen you.' });
  S('zebra', { name: 'Zebra', lean: 'C/S', branch: 'Hoofed animals', icon: '🦓',
    tagline: 'A herd in stripes that bites, kicks and never stands alone.' });

  K(HOOVED,'hoof_hooves','Hooves','S',0,
    { n:'Trot', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P}],
      txt:(P,E)=>`Move ${2+P}.` },
    { n:'Gallop', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>3+E, ignoreFoes:true},{v:'hazardImmune', dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Move ${3+E}, passing foes and ignoring hazards this round; your next hit this turn deals +1.` },
    'Built for ground, and lots of it.', 'Hoofed animals');
  K(HOOVED,'hoof_ring','Herd Ring','T',0,
    { n:'Close Ranks', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>2+h(P), dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`You and an ally beside you hold Shield ${2+h(P)} this round.` },
    { n:'Ring of Horns', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+E, dur:1, party:true},{v:'thorns', val:(P,E)=>1+E, next:true, push:1, dur:1}],
      txt:(P,E)=>`Both heroes hold Shield ${1+E} this round; Thorns: the next foe to hit you in melee takes ${1+E} and is pushed 1.` },
    'Young in the middle, everyone else facing out.', 'Hoofed animals');
  K(HOOVED,'hoof_eyes','Wide Eyes','S',0,
    { n:'Look Around', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'shield', val:(P,E)=>1+h(P), next:true},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Reveal within ${2+P}; Shield: the next hit on you is ${1+h(P)} less, and your next hit this turn deals +1.` },
    { n:'Nothing Behind Me', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'reveal', radius:(P,E)=>1+E, dur:1},{v:'shield', val:(P,E)=>1+E, next:true, party:true}],
      txt:(P,E)=>`Reveal everything within ${1+E} this round; Shield: the next hit on each hero is ${1+E} less.` },
    'Eyes on the sides of the head: it sees almost all the way round.', 'Hoofed animals');
  K(HOOVED,'hoof_kick','Kick','M',0,
    { n:'Back Kick', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'force', kind:'push', n:2}],
      txt:(P,E)=>`Melee ${3+P}, and push it 2.` },
    { n:'Double Barrel', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'force', kind:'push', n:(P,E)=>2+h(E)},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Melee ${3+E}, push it ${2+h(E)}, and it is Weakened 1 this round.` },
    'Both hind feet, all at once.', 'Hoofed animals');
  K(HORNED,'hoof_horn','Horn Charge','M',0,
    { n:'Lower Horns', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:2, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>2+P, ifAdjacent:true},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Charge up to 2 toward a foe within 3; if you end beside it, melee ${2+P} and push it 1.` },
    { n:'Gore', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E, pierce:true},{v:'force', kind:'push', n:2}],
      txt:(P,E)=>`Melee ${3+E} that ignores Shield, and push it 2.` },
    'Head down, and go.', 'Hoofed animals');
  K(HORNED,'hoof_chew','Ruminate','T',0,
    { n:'Chew the Cud', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+h(P)},{v:'haste', n:1}],
      txt:(P,E)=>`Heal 1 at the start of each turn for ${2+h(P)} rounds, and Haste: your track returns 1 column sooner.` },
    { n:'Four Stomachs', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>2+E},{v:'cleanse'},{v:'engine', kind:'regen', val:1, dur:2}],
      txt:(P,E)=>`Heal ${2+E}, cleanse (Anchored, Weakened, Wounds), and heal 1 at the start of each turn for 2 rounds.` },
    'It eats now and digests later.', 'Hoofed animals');
  K(ANTLERED,'hoof_antlers','Antlers','M',0,
    { n:'Rake', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Melee ${3+P}; it is Weakened 1 this round.` },
    { n:'Lock Antlers', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'anchor', who:'foe', dur:1},{v:'weaken', val:1, dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Melee ${3+E}, and lock it in place: Anchored 1 and Weakened 1 for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}.` },
    'Grown fresh every year, and dropped every winter.', 'Hoofed animals');
  K(ANTLERED,'hoof_bound','Bound Away','S',0,
    { n:'Bound', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Bound ${1+P}, passing foes; Shield: the next hit on you is 1 less.` },
    { n:'Over the Fence', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, height:true},{v:'hidden', dur:1}],
      txt:(P,E)=>`Leap to anywhere within ${2+E}, height included, and you are Hidden 1.` },
    'One spring and it is over the hedge.', 'Hoofed animals');

  // Yak
  K(['yak'],'yak_coat','Thick Coat','T',0,
    { n:'Shaggy', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+h(P), dur:1},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Shield ${2+h(P)} and ignore hazards this round.` },
    { n:'Winter Fleece', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'cleanse', ward:1},{v:'shield', val:(P,E)=>1+E, dur:2, party:true, allyRange:1}],
      txt:(P,E)=>`You and an ally beside you hold Shield ${1+E} for 2 rounds; Cleanse, and you can't be Weakened or Anchored by a foe this round.` },
    'Wool that keeps out a mountain night.');
  K(['yak'],'yak_bearer','Pack Bearer','C',0,
    { n:'Carry', ap:1, el:0, cd:1, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>1+P},{v:'shield', val:1, dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`Your ally moves ${1+P}; if they end beside you, you both hold Shield 1 this round.` },
    { n:'Supplies', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'ap', val:1, dur:(P,E)=>1+E, target:'ally'},{v:'heal', n:1, party:true}],
      txt:(P,E)=>`Both heroes heal 1, and your ally gains 1 AP at the start of each turn for ${1+E} ${1+E > 1 ? 'rounds' : 'round'}.` },
    'It carries the camp up the mountain.');
  K(['yak'],'yak_air','Thin Air','S',0,
    { n:'Steady Breath', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'ap', val:1, dur:1},{v:'heal', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Gain 1 AP next turn, and heal ${1+h(P)}.` },
    { n:'High Pass', ap:1, el:1, cd:3, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+E, carryAlly:(P,E)=>E>=2},{v:'shield', val:2, dur:1}],
      txt:(P,E)=>`Climb ${1+E}${E>=2?', carrying an ally beside you,':''} and hold Shield 2 this round.` },
    'Where other lungs give out, it keeps walking.');

  // Bison
  K(['bison'],'bis_stampede','Stampede','M',0,
    { n:'Thunder', ap:1, el:0, cd:2, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true},{v:'weaken', val:1, dur:1, area:'adj'},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Move ${1+P}, passing foes; every foe beside you where you stop is Weakened 1 this round, and your next hit this turn deals +1.` },
    { n:'Run Them Down', ap:0, el:1, cd:4, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>2+E},{v:'force', kind:'push', n:1, area:true}],
      txt:(P,E)=>`Every foe beside you takes ${2+E} and is pushed 1.` },
    'The ground shakes before you see them.');
  K(['bison'],'bis_wallow','Wallow','T',0,
    { n:'Dust Bath', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'shield', val:(P,E)=>1+h(P), dur:1},{v:'heal', n:1}],
      txt:(P,E)=>`Cleanse (Anchored, Weakened, Wounds); Shield ${1+h(P)} this round, and heal 1.` },
    { n:'Mud Coat', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>1+E, dur:2},{v:'shield', val:2, dur:2}],
      txt:(P,E)=>`Shield 2 for 2 rounds, and any foe that hits you in melee takes ${1+E}.` },
    'Roll in it. It keeps the flies off.');
  K(['bison'],'bis_hump','Shoulder Hump','M',0,
    { n:'Shoulder', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Melee ${3+P}, and push it 1.` },
    { n:'Plough the Snow', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'cleanse', ward:1},{v:'strike', kind:'melee', dmg:(P,E)=>4+E},{v:'force', kind:'push', n:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Melee ${4+E}, push it ${1+h(E)}, and Cleanse, and you can't be Weakened or Anchored by a foe this round.` },
    'Its head is a snowplough, and so is the rest of it.');

  // Oryx
  K(['oryx'],'ory_rapier','Rapier Horns','M',0,
    { n:'Thrust', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`Strike a foe within 2 for ${2+P}.` },
    { n:'Skewer', ap:1, el:1, cd:3, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>3+E, pierce:true},{v:'stripShield', amount:2}],
      txt:(P,E)=>`Strike a foe within 2 for ${3+E} that ignores Shield, and 2 of its Shield comes off.` },
    'A metre of straight, sharp horn.');
  K(['oryx'],'ory_store','Desert Store','T',0,
    { n:'Make Do', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Heal ${1+P}, and ignore hazards for 2 rounds.` },
    { n:'Saved Water', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'heal', n:(P,E)=>1+E, party:true},{v:'engine', kind:'regen', val:1, dur:2, party:true}],
      txt:(P,E)=>`Both heroes heal ${1+E}, and heal 1 at the start of each turn for 2 rounds.` },
    'It drinks from the dew, and needs little else.');
  K(['oryx'],'ory_mirage','Mirage Walk','S',0,
    { n:'Shimmer', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'shield', val:(P,E)=>1+h(P), next:true, reposition:1}],
      txt:(P,E)=>`Move ${1+P}; Shield: the next hit on you is ${1+h(P)} less, and you dodge a step from it.` },
    { n:'Heat Haze', ap:0, el:1, cd:4, dur:0, tgt:'node_r3',
      fx:[{v:'decoy', dur:(P,E)=>1+E},{v:'hidden', dur:1, canMove:true}],
      txt:(P,E)=>`A shimmer draws foes to a node within 3 for ${1+E} rounds, and you are Hidden 1 even if you move.` },
    'Out there, in the heat, nothing is quite where it seems.');

  // Bighorn ram
  K(['ram'],'ram_butt','Headbutt','M',0,
    { n:'Butt', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Melee ${3+P}, and push it 1.` },
    { n:'Clash', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:3, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>4+E, ifAdjacent:true},{v:'force', kind:'push', n:2}],
      txt:(P,E)=>`Charge up to 3 toward a foe within 3; if you end beside it, melee ${4+E} and push it 2.` },
    'The crack can be heard a mile off.');
  K(['ram'],'ram_sure','Sure Hooves','S',0,
    { n:'Ledge Walk', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>2+P},{v:'anchor', who:'self', dur:1}],
      txt:(P,E)=>`Climb ${2+P}; nothing can push or pull you this round.` },
    { n:'Cliff Run', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, height:true},{v:'empower', val:(P,E)=>1+E, uses:1, dur:1}],
      txt:(P,E)=>`Spring to anywhere within ${2+E}, height included; your next hit this turn deals +${1+E}.` },
    'A ledge the width of a hoof is plenty.');
  K(['ram'],'ram_curl','Curled Horns','T',0,
    { n:'Brace', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+h(P), next:true, reflect:1}],
      txt:(P,E)=>`Shield: the next hit on you is ${2+h(P)} less, and its attacker takes 1.` },
    { n:'Hard Head', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>2+E, next:true, push:1, dur:2},{v:'shield', val:2, dur:1}],
      txt:(P,E)=>`Shield 2 this round; for 2 rounds, Thorns: the next foe to hit you in melee takes ${2+E} and is pushed 1.` },
    'A skull built to take what it gives.');

  // Moose
  K(['moose'],'moo_wade','Wade Deep','S',0,
    { n:'Wade', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Move ${1+P}, and ignore hazards for 2 rounds.` },
    { n:'Dive for Weed', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'heal', n:(P,E)=>2+E},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Duck under: Hidden 1, heal ${2+E}, and ignore hazards for 2 rounds.` },
    'It feeds with its whole head under the lake.');
  K(['moose'],'moo_bellow','Bellow','C',0,
    { n:'Grunt', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P), area:'radius', radius:2}],
      txt:(P,E)=>`Every foe within 2 is Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}.` },
    { n:'Rut Call', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'force', kind:'pull', n:1, area:true, radius:(P,E)=>2+E},{v:'thorns', val:(P,E)=>1+E, next:true, push:1, dur:1}],
      txt:(P,E)=>`Every foe within ${2+E} is drawn 1 toward you; Thorns: the next to hit you in melee takes ${1+E} and is pushed 1.` },
    'A low call across the bog, and something answers.');
  K(['moose'],'moo_stand','Stand Ground','M',0,
    { n:'Plant', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Melee ${3+P}, and hold Shield 1 this round.` },
    { n:'Trample', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'cleanse', ward:1},{v:'strike', kind:'melee', dmg:(P,E)=>4+E},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Melee ${4+E}, pin it (Anchored 1), and Cleanse, and you can't be Weakened or Anchored by a foe this round.` },
    'It does not run from wolves. It waits for them.');

  // Deer
  K(['deer'],'dee_ears','Alert Ears','S',0,
    { n:'Ears Up', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Reveal within ${2+P}, and step 1.` },
    { n:'Warning Snort', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+E, next:true, reposition:1, party:true},{v:'reveal', radius:3, dur:1}],
      txt:(P,E)=>`Reveal within 3; Shield: the next hit on each hero is ${1+E} less, and they dodge a step from it.` },
    'Every ear turns before the twig snaps.');
  K(['deer'],'dee_dapple','Dapple','T',0,
    { n:'Freeze', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+h(P)},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Freeze in the light and shade: Hidden ${1+h(P)}, and Shield 1 this round.` },
    { n:'Fawn Spots', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:(P,E)=>1+E, party:true, radius:1},{v:'heal', n:1, party:true}],
      txt:(P,E)=>`You and an ally beside you are Hidden ${1+E}; both heroes heal 1.` },
    'Spots that look exactly like sunlight through leaves.');
  K(['deer'],'dee_spring','Spring Away','S',0,
    { n:'Pronk', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'move', n:2, free:true}],
      txt:(P,E)=>`Melee ${1+P}, then spring 2 away.` },
    { n:'White Flag', ap:1, el:1, cd:3, dur:0, tgt:'node_r3',
      fx:[{v:'decoy', dur:(P,E)=>1+E},{v:'move', n:2, free:true}],
      txt:(P,E)=>`Flash your tail: a decoy draws foes to a node within 3 for ${1+E} rounds, and you spring 2.` },
    'Straight up, all four feet, as if on springs.');

  // Zebra
  K(['zebra'],'zeb_dazzle','Dazzle Stripes','C',0,
    { n:'Dazzle', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P)},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`A foe within 2 is Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}; Shield: the next hit on you is 1 less.` },
    { n:'Moving Stripes', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(E), area:'radius', radius:(P,E)=>1+E},{v:'hidden', dur:1, canMove:true}],
      txt:(P,E)=>`Every foe within ${1+E} is Weakened 1 for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}, and you are Hidden 1 even if you move.` },
    'Hard to count, harder to pick out.');
  K(['zebra'],'zeb_bolt','Herd Bolt','S',0,
    { n:'Bolt', ap:1, el:0, cd:1, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>1+P},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Your ally moves ${1+P}, and you step 1.` },
    { n:'All Together', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'ap', val:1, dur:1, party:true},{v:'shield', val:(P,E)=>1+E, next:true, party:true}],
      txt:(P,E)=>`Both heroes gain 1 AP next turn, and Shield: the next hit on each is ${1+E} less.` },
    'When one runs, they all run.');
  K(['zebra'],'zeb_bite','Bite Fight','M',0,
    { n:'Nip', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Melee ${2+P}; it is Weakened 1 this round.` },
    { n:'Rear and Bite', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'strike', kind:'melee', dmg:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Rear up: melee ${3+E}, then melee ${1+h(E)}.` },
    'It fights with its teeth as much as its feet.');
  K(['zebra'],'zeb_water','Waterhole','T',0,
    { n:'Drink', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'cleanse'}],
      txt:(P,E)=>`Heal ${1+P}, and cleanse (Anchored, Weakened, Wounds).` },
    { n:'Drink in Turns', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'heal', n:(P,E)=>1+E, party:true},{v:'shield', val:1, dur:1, party:true}],
      txt:(P,E)=>`Both heroes heal ${1+E} and hold Shield 1 this round.` },
    'One drinks; the others watch.');
  K(['zebra'],'zeb_wall','Stripe Wall','T',0,
    { n:'Shoulder to Shoulder', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>2+h(P), dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`You and an ally beside you hold Shield ${2+h(P)} this round.` },
    { n:'Wall of Stripes', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:1, party:true, radius:1},{v:'shield', val:(P,E)=>1+E, dur:1, party:true}],
      txt:(P,E)=>`You and an ally beside you are Hidden 1; both heroes hold Shield ${1+E} this round.` },
    'Stand close and the herd becomes one blur.');
  /* ───────────────────────── GNAWERS ─────────────────────────
     mouse · porcupine · hare · black hare, with the jerboa. The jerboa's Gnawing Incisors are every
     gnawer's; its Vibrissae the mouse's and porcupine's; its Burrowing the mouse's; its Leap the hares';
     its Erratic Bounding the hares' and the mouse's. Long Ears, Boxing and Lie Low are both hares'. */
  T.SPECIES.jerboa.branch = 'Gnawers';
  S('mouse', { name: 'Field Mouse', lean: 'S/T', branch: 'Gnawers', icon: '🐭',
    tagline: 'Small, quick and everywhere. Through the gap before you saw the gap.' });
  S('porcupine', { name: 'Porcupine', lean: 'M/T', branch: 'Gnawers', icon: '🦔',
    tagline: 'A slow climber in a coat of thirty thousand quills. Best left alone.' });
  S('hare', { name: 'Brown Hare', lean: 'S/M', branch: 'Gnawers', icon: '🐇',
    tagline: 'Long ears, long legs, and a temper in spring.' });
  S('black_hare', { name: 'Black Hare', lean: 'S/C', branch: 'Gnawers', icon: '🐇',
    tagline: 'A night-coloured hare that runs where the moon doesn’t reach.' });
  T.shareTrait('jer_gnaw', 'mouse', 'porcupine', 'hare', 'black_hare');
  T.shareTrait('jer_vibrissae', 'mouse', 'porcupine');
  T.shareTrait('jer_burrow', 'mouse');
  T.shareTrait('jer_leap', 'hare', 'black_hare');
  T.shareTrait('jer_erratic', 'mouse', 'hare', 'black_hare');
  const HARES = ['hare','black_hare'];

  K(HARES,'har_ears','Long Ears','S',0,
    { n:'Listen', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'shield', val:1, next:true, reposition:1}],
      txt:(P,E)=>`Reveal within ${2+P}; Shield: the next hit on you is 1 less, and you dodge a step from it.` },
    { n:'Ears Back', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+E, dur:1},{v:'move', n:(P,E)=>1+E, free:true},{v:'hidden', dur:1, canMove:true}],
      txt:(P,E)=>`Hear everything within ${1+E} this round, slip ${1+E}, and you are Hidden 1 even if you move.` },
    'Each ear turns on its own.', 'Gnawers');
  K(HARES,'har_box','Boxing','M',0,
    { n:'Jab', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Melee ${3+P}, and shove it 1.` },
    { n:'Flurry', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Melee ${2+E} twice, then shove it 1.` },
    'Up on the hind legs, forepaws flying.', 'Gnawers');
  K(HARES,'har_low','Lie Low','T',0,
    { n:'Form', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+h(P)},{v:'heal', n:1}],
      txt:(P,E)=>`Flatten into a hollow: Hidden ${1+h(P)}, and heal 1.` },
    { n:'Still as Earth', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:(P,E)=>1+E, party:true, radius:1},{v:'shield', val:1, dur:1, party:true}],
      txt:(P,E)=>`You and an ally beside you are Hidden ${1+E}; both heroes hold Shield 1 this round.` },
    'Ears flat, eyes open, not a whisker moving.', 'Gnawers');

  // Mouse
  K(['mouse'],'mou_scurry','Scurry','S',0,
    { n:'Scurry', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P}],
      txt:(P,E)=>`Move ${1+P}.` },
    { n:'Every Which Way', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>3+E, ignoreFoes:true},{v:'shield', val:(P,E)=>1+E, next:true}],
      txt:(P,E)=>`Move ${3+E}, through foes; Shield: the next hit on you is ${1+E} less.` },
    'Along the wall, never across the floor.');
  K(['mouse'],'mou_gap','Through the Gap','S',0,
    { n:'Squeeze', ap:1, el:0, cd:1, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>1+h(P)},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Squeeze through to any node within ${1+h(P)}, and hold Shield 1 this round.` },
    { n:'Under the Door', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, carryAlly:(P,E)=>E>=2},{v:'hidden', dur:1}],
      txt:(P,E)=>`Slip to any node within ${2+E}${E>=2?', bringing an ally beside you,':''} and you are Hidden 1.` },
    'If its head fits, the rest follows.');
  K(['mouse'],'mou_stash','Seed Stash','C',0,
    { n:'Nibble', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'engine', kind:'ap', val:1, dur:1}],
      txt:(P,E)=>`Heal ${1+P}, and gain 1 AP next turn.` },
    { n:'Winter Store', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'heal', n:(P,E)=>1+E, party:true},{v:'engine', kind:'ap', val:1, dur:1, party:true}],
      txt:(P,E)=>`Both heroes heal ${1+E} and gain 1 AP next turn.` },
    'Seeds in every corner of the house.');
  K(['mouse'],'mou_tiny','Tiny Target','T',0,
    { n:'Duck', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+h(P), next:true, reposition:1}],
      txt:(P,E)=>`Shield: the next hit on you is ${2+h(P)} less, and you dodge a step from it.` },
    { n:'Too Small to See', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+E, canMove:true},{v:'shield', val:2, next:true}],
      txt:(P,E)=>`Hidden ${1+E} even if you move, and Shield: the next hit on you is 2 less.` },
    'The claw comes down where it was.');
  K(['mouse'],'mou_squeak','Squeak','C',0,
    { n:'Alarm', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+h(P), next:true, party:true},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Shield: the next hit on each hero is ${1+h(P)} less, and your ally's next hit deals +1.` },
    { n:'Ultrasound', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(E), area:'radius', radius:2},{v:'mark', nearest:true}],
      txt:(P,E)=>`Every foe within 2 is Weakened 1 for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}, and the nearest is Marked (the next hit on it deals +2).` },
    'A sound too high for most ears.');

  // Porcupine
  K(['porcupine'],'por_quills','Quills','M',0,
    { n:'Bristle', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>1+P, dur:1},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Shield 1 this round, and any foe that hits you in melee takes ${1+P}.` },
    { n:'Quill Coat', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>2+E, dur:2},{v:'shield', val:2, dur:2}],
      txt:(P,E)=>`Shield 2 for 2 rounds, and any foe that hits you in melee takes ${2+E}.` },
    'Thirty thousand reasons to look elsewhere.');
  K(['porcupine'],'por_rattle','Quill Rattle','C',0,
    { n:'Rattle', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P), area:'adj'},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Every foe beside you is Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}; Shield: the next hit on you is 1 less.` },
    { n:'Warning Display', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'force', kind:'push', n:1, area:true, radius:(P,E)=>1+h(E)},{v:'weaken', val:1, dur:(P,E)=>1+E, area:'radius', radius:2}],
      txt:(P,E)=>`Every foe within ${1+h(E)} is pushed 1, and every foe within 2 is Weakened 1 for ${1+E} rounds.` },
    'It shakes its tail like a box of knives.');
  K(['porcupine'],'por_climb','Tree Climb','S',0,
    { n:'Climb', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Climb ${1+P}, and hold Shield 1 this round.` },
    { n:'High Fork', ap:1, el:1, cd:3, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>2+E, carryAlly:(P,E)=>E>=2},{v:'engine', kind:'regen', val:1, dur:2}],
      txt:(P,E)=>`Climb ${2+E}${E>=2?', carrying an ally beside you,':''} and heal 1 at the start of each turn for 2 rounds.` },
    'Slow up the trunk, and nobody follows.');
  K(['porcupine'],'por_back','Back Turn','T',0,
    { n:'Turn Away', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>1+P, next:true, dur:1},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Turn your quills to the threat: Shield: the next hit on you is 1 less, and Thorns: the next foe to hit you in melee takes ${1+P}.` },
    { n:'Back into It', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'weaken', val:1, dur:2},{v:'wound', n:2, kind:'quill'}],
      txt:(P,E)=>`Back into a foe beside you: it takes ${3+E}, is Weakened 1 for 2 rounds, and is Wounded 2.` },
    'It charges backwards.');
  K(['porcupine'],'por_shed','Quill Shed','M',0,
    { n:'Flick', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`A quill stuck in a foe within 2: it takes ${2+P}.` },
    { n:'Quill Spray', ap:0, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'strike', kind:'zone_all', dmg:(P,E)=>1+E}],
      txt:(P,E)=>`Every foe in your zone takes ${1+E}.` },
    'They come loose, and stay in.');
  K(['porcupine'],'por_bark','Bark Eater','T',0,
    { n:'Gnaw Bark', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Heal ${1+P}, and hold Shield 1 this round.` },
    { n:'Salt Lick', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E}],
      txt:(P,E)=>`Cleanse (Anchored, Weakened, Wounds), and heal 1 at the start of each turn for ${2+E} rounds.` },
    'It eats what nothing else will.');
  K(['porcupine'],'por_waddle','Waddle','S',0,
    { n:'Amble', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'thorns', val:1, dur:1}],
      txt:(P,E)=>`Move ${1+P}; any foe that hits you in melee this round takes 1.` },
    { n:'Unbothered', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'cleanse', ward:1},{v:'move', n:(P,E)=>2+E, ignoreFoes:true}],
      txt:(P,E)=>`Move ${2+E}, straight past foes, and Cleanse, and you can't be Weakened or Anchored by a foe this round.` },
    'In no hurry. Nothing makes it hurry.');

  // Brown hare
  K(['hare'],'har_march','Mad March','M',0,
    { n:'Spar', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Melee ${2+P}, then hop 1.` },
    { n:'Spring Fever', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'empower', val:1, uses:99, dur:(P,E)=>1+E},{v:'engine', kind:'ap', val:1, dur:1}],
      txt:(P,E)=>`Every hit you deal for ${1+E} ${1+E > 1 ? 'rounds' : 'round'} deals +1, and gain 1 AP next turn.` },
    'In spring, every hare goes a little mad.');
  K(['hare'],'har_winter','White Winter','T',0,
    { n:'Snow Coat', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'hazardImmune', dur:2},{v:'shield', val:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Hidden 1, Shield ${1+h(P)} this round, and ignore hazards for 2 rounds.` },
    { n:'Whiteout', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:1, party:true, radius:2},{v:'hazardImmune', dur:(P,E)=>1+E},{v:'hazardImmune', dur:1, party:true}],
      txt:(P,E)=>`You and an ally within 2 are Hidden 1, and both ignore hazards this round; you for ${1+E} rounds.` },
    'Brown in summer, white by the first snow.');
  K(['hare'],'har_thump','Thump','C',0,
    { n:'Thump', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+h(P), next:true, party:true}],
      txt:(P,E)=>`Thump a warning: Shield: the next hit on each hero is ${1+h(P)} less.` },
    { n:'Ground Drum', ap:0, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'radius', radius:(P,E)=>1+E},{v:'engine', kind:'ap', val:1, dur:1, target:'ally'}],
      txt:(P,E)=>`Every foe within ${1+E} is Weakened 1 this round, and your ally gains 1 AP next turn.` },
    'A back foot on the ground: danger.');

  // Black hare
  K(['black_hare'],'bha_bolt','Shadow Bolt','S',0,
    { n:'Bolt', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true},{v:'hidden', dur:1, canMove:true}],
      txt:(P,E)=>`Move ${1+P}, passing foes, and you are Hidden 1 even if you move.` },
    { n:'Into the Dark', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>3+E},{v:'hidden', dur:(P,E)=>1+h(E), canMove:true}],
      txt:(P,E)=>`Vanish to any node within ${3+E}, Hidden ${1+h(E)} even if you move.` },
    'A dark shape, and then no shape.');
  K(['black_hare'],'bha_kick','Night Kick','M',0,
    { n:'Kick', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'force', kind:'push', n:2}],
      txt:(P,E)=>`Melee ${2+P}, and kick it back 2.` },
    { n:'From Nowhere', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E, pierce:true},{v:'move', n:2, free:true}],
      txt:(P,E)=>`Melee ${3+E} that ignores Shield, then spring 2 away.` },
    'You feel it before you see it.');
  K(['black_hare'],'bha_forage','Midnight Forage','C',0,
    { n:'Graze', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'reveal', radius:2, dur:1}],
      txt:(P,E)=>`Heal ${1+P}, and reveal within 2.` },
    { n:'Moonless Field', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'heal', n:(P,E)=>1+E, party:true},{v:'hidden', dur:1, party:true, radius:1}],
      txt:(P,E)=>`Both heroes heal ${1+E}; you and an ally beside you are Hidden 1.` },
    'It eats when nothing else can see it eat.');
  /* ───────────────────────── ARMOURED AND SLOW ─────────────────────────
     sloth · armadillo · pangolin · hedgehog. Slow Metabolism is the sloth's, armadillo's and pangolin's;
     Curl Up the three armoured ones'; Dig Claws and Long Tongue the armadillo's and pangolin's. */
  const ARMOURED = ['armadillo','pangolin','hedgehog'];
  const ANTEATERS = ['armadillo','pangolin'];
  S('sloth', { name: 'Three-Toed Sloth', lean: 'T/C', branch: 'Armoured and slow', icon: '🦥',
    tagline: 'Hangs on, takes its time, and is never, ever in a hurry.' });
  S('armadillo', { name: 'Armadillo', lean: 'M/S', branch: 'Armoured and slow', icon: '🦔',
    tagline: 'Banded armour, digging claws, and a startled leap straight up.' });
  S('pangolin', { name: 'Pangolin', lean: 'M/T', branch: 'Armoured and slow', icon: '🦔',
    tagline: 'A walking pine cone of sharp scales that rolls into a fortress.' });
  S('hedgehog', { name: 'Hedgehog', lean: 'T/M', branch: 'Armoured and slow', icon: '🦔',
    tagline: 'A snuffling night forager in a coat of spines. Curls up and waits.' });

  K(['sloth','armadillo','pangolin'],'arm_slow','Slow Metabolism','T',0,
    { n:'Conserve', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+h(P)},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Shield 1 this round, and heal 1 at the start of each turn for ${2+h(P)} rounds.` },
    { n:'Wait It Out', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>2+E},{v:'cleanse'},{v:'engine', kind:'ap', val:1, dur:1}],
      txt:(P,E)=>`Heal ${2+E}, cleanse (Anchored, Weakened, Wounds), and gain 1 AP next turn.` },
    'It needs very little, and it gets it.', 'Armoured and slow');
  K(ARMOURED,'arm_curl','Curl Up','T',0,
    { n:'Curl', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+P, dur:1},{v:'anchor', who:'self', dur:1},{v:'thorns', val:1, dur:1}],
      txt:(P,E)=>`Curl into a ball: Shield ${2+P} this round, nothing can push or pull you, and any foe that hits you in melee takes 1.` },
    { n:'Ball', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:2},{v:'shield', val:(P,E)=>3+E, dur:2}],
      txt:(P,E)=>`Shield ${3+E} for 2 rounds, and Cleanse, and you can't be Weakened or Anchored by a foe for 2.` },
    'Every soft part tucked away.', 'Armoured and slow');
  K(ANTEATERS,'arm_dig','Dig Claws','M',0,
    { n:'Rip', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'stripShield', amount:1}],
      txt:(P,E)=>`Tear 1 Shield off a foe beside you, then melee ${3+P}.` },
    { n:'Dig Down', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E},{v:'hidden', dur:1},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Dig down and come up anywhere within ${2+E}: Hidden 1, and Shield 1 this round.` },
    'Claws for breaking open termite towers.', 'Armoured and slow');
  K(ANTEATERS,'arm_tongue','Long Tongue','C',0,
    { n:'Lick Up', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+P},{v:'heal', n:1}],
      txt:(P,E)=>`A foe within 2 takes ${2+P}, and you heal 1.` },
    { n:'Into the Nest', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'force', kind:'pull', n:(P,E)=>1+E},{v:'strike', kind:'los', dmg:(P,E)=>2+E},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Draw a foe within 3 up to ${1+E} toward you; it takes ${2+E} and is Weakened 1 this round.` },
    'Longer than its head and body, nearly.', 'Armoured and slow');
  K(['hedgehog'],'hed_venom','Venom Shrug','T',0,
    { n:'Shrug It Off', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'heal', n:(P,E)=>1+P}],
      txt:(P,E)=>`Cleanse (Anchored, Weakened, Wounds), and heal ${1+P}.` },
    { n:'Immune', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'cleanse', party:true, ward:(P,E)=>1+E},{v:'heal', n:(P,E)=>1+E, party:true}],
      txt:(P,E)=>`Both heroes cleanse (Anchored, Weakened, Wounds) and heal ${1+E}; Cleanse, and you can't be Weakened or Anchored by a foe for ${1+E} ${1+E > 1 ? 'rounds' : 'round'}.` },
    'A snakebite slows it down for an hour.');

  // Sloth
  K(['sloth'],'slo_algae','Algae Fur','T',0,
    { n:'Green Coat', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+h(P)},{v:'heal', n:1}],
      txt:(P,E)=>`Hidden ${1+h(P)} in your green coat, and heal 1.` },
    { n:'A Whole Garden', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E, party:true},{v:'hidden', dur:1}],
      txt:(P,E)=>`Both heroes heal 1 at the start of each turn for ${2+E} rounds; you are Hidden 1.` },
    'Its fur grows a garden, with moths in it.');
  K(['sloth'],'slo_hook','Hook Claws','M',0,
    { n:'Hook', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Melee ${3+P}, and hook it: Anchored 1.` },
    { n:'Never Let Go', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'anchor', who:'foe', dur:(P,E)=>1+h(E)},{v:'weaken', val:1, dur:2}],
      txt:(P,E)=>`Melee ${3+E}; it is Anchored ${1+h(E)} and Weakened 1 for 2 rounds.` },
    'Claws that lock shut on their own.');
  K(['sloth'],'slo_unhurried','Unhurried','T',0,
    { n:'Take Your Time', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'haste', n:1},{v:'shield', val:(P,E)=>1+h(P), next:true}],
      txt:(P,E)=>`Haste: your track returns 1 column sooner, and Shield: the next hit on you is ${1+h(P)} less.` },
    { n:'Slow Hand', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'haste', free:true, n:1, dur:1},{v:'engine', kind:'ap', val:1, dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Haste: the next card you play this turn doesn't go to the track, and gain 1 AP at the start of each turn for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}.` },
    'Nothing is so urgent it can’t wait.');
  K(['sloth'],'slo_hang','Hang On','S',0,
    { n:'Hang', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'anchor', who:'self', dur:1}],
      txt:(P,E)=>`Climb ${1+P}; nothing can push or pull you this round.` },
    { n:'Upside Down', ap:1, el:1, cd:3, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>2+E, carryAlly:(P,E)=>E>=2},{v:'shield', val:2, dur:1}],
      txt:(P,E)=>`Climb ${2+E}${E>=2?', carrying an ally beside you,':''} and hold Shield 2 this round.` },
    'It sleeps hanging, and dies hanging, and does not fall.');
  K(['sloth'],'slo_swim','Slow Swim','S',0,
    { n:'Paddle', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Move ${1+P}, ignoring hazards this round.` },
    { n:'Float', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E, ignoreFoes:true},{v:'hazardImmune', dur:2},{v:'hidden', dur:1}],
      txt:(P,E)=>`Drift ${2+E}, passing foes; Hidden 1, and ignore hazards for 2 rounds.` },
    'Three times faster in water than in trees.');
  K(['sloth'],'slo_neck','Neck Turn','S',0,
    { n:'Look Back', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'mark', nearest:true},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Reveal within ${2+P}; Mark the nearest foe (the next hit on it deals +2), and Shield: the next hit on you is 1 less.` },
    { n:'All the Way Round', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+E, dur:2},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`See everything within ${1+E} for 2 rounds; your next hit deals +${1+E}.` },
    'It can turn its head almost all the way round.');
  K(['sloth'],'slo_sleep','Sleep Anywhere','T',0,
    { n:'Nap', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>2+P},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Heal ${2+P}; Shield: the next hit on you is 1 less.` },
    { n:'Deep Sleep', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'stasis', dur:1},{v:'heal', n:(P,E)=>1+E}],
      txt:(P,E)=>`Heal ${1+E}, then sleep: nothing can touch you until your next turn.` },
    'Fifteen hours a day, and anywhere at all.');
  K(['sloth'],'slo_swipe','Sudden Swipe','M',0,
    { n:'Swipe', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P}],
      txt:(P,E)=>`Melee ${3+P}.` },
    { n:'Out of Nowhere', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>4+E, pierce:true},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Melee ${4+E} that ignores Shield, and push it 1.` },
    'Slow, slow, slow, and then not.');

  // Armadillo
  K(['armadillo'],'adi_bands','Bands','M',0,
    { n:'Plated', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+h(P), dur:1},{v:'thorns', val:1, dur:1}],
      txt:(P,E)=>`Shield ${1+h(P)} this round; any foe that hits you in melee takes 1.` },
    { n:'Band Together', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>2+E, dur:1, party:true, allyRange:1},{v:'shield', val:1, next:true, party:true}],
      txt:(P,E)=>`You and an ally beside you hold Shield ${2+E} this round, and Shield: the next hit on each hero is 1 less.` },
    'Nine bands of bone, hinged with skin.');
  K(['armadillo'],'adi_jump','Startle Jump','S',0,
    { n:'Jump', ap:1, el:0, cd:1, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>1+h(P), height:true},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Leap straight up and away to any node within ${1+h(P)}, height included; Shield: the next hit on you is 1 less.` },
    { n:'Up and Away', ap:1, el:1, cd:3, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>2+E},{v:'force', kind:'push', n:1, area:true},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Burst upward: every foe beside you takes ${2+E} and is pushed 1, then step 1.` },
    'Frighten it and it jumps a metre straight up.');
  K(['armadillo'],'adi_breath','Breath Crossing','S',0,
    { n:'Walk the Bottom', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Move ${1+P}, and ignore hazards for 2 rounds.` },
    { n:'Gulp Air', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hazardImmune', dur:(P,E)=>2+E},{v:'hazardImmune', dur:1, party:true},{v:'heal', n:1, party:true}],
      txt:(P,E)=>`Both heroes heal 1 and ignore hazards this round; you hold your breath for ${2+E} rounds.` },
    'It holds its breath and walks across the riverbed.');
  K(['armadillo'],'adi_snuffle','Night Snuffle','C',0,
    { n:'Snuffle', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+P, dur:1},{v:'mark', nearest:true},{v:'heal', n:1}],
      txt:(P,E)=>`Reveal within ${1+P}, Mark the nearest foe (the next hit on it deals +2), and heal 1.` },
    { n:'Root Out', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:3},{v:'mark', n:(P,E)=>1+E, dur:3}],
      txt:(P,E)=>`Root out any foe: Revealed for 3 rounds, and it is Marked +${1+E} for 3 rounds.` },
    'Nose down, all night, grunting.');
  K(['armadillo'],'adi_shove','Armour Shove','M',0,
    { n:'Barge', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'force', kind:'push', n:2},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Melee ${2+P}, push it 2, and hold Shield 1 this round.` },
    { n:'Rolling Charge', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:3, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>3+E, ifAdjacent:true},{v:'force', kind:'push', n:2}],
      txt:(P,E)=>`Roll up to 3 toward a foe within 3; if you end beside it, melee ${3+E} and push it 2.` },
    'A head-down push behind a shell.');

  // Pangolin
  K(['pangolin'],'pan_scales','Overlapping Scales','T',0,
    { n:'Scale Up', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+h(P), next:true},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Shield: the next hit on you is ${2+h(P)} less, and hold Shield 1 this round.` },
    { n:'Unbroken', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>3+E, dur:2},{v:'thorns', val:(P,E)=>1+h(E), dur:2}],
      txt:(P,E)=>`Shield ${3+E} for 2 rounds; any foe that hits you in melee takes ${1+h(E)}.` },
    'Keratin, laid like roof tiles.');
  K(['pangolin'],'pan_tail','Tail Shield','T',0,
    { n:'Cover', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+h(P), dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`Hold Shield ${2+h(P)} this round; wrap your tail round an ally beside you and they hold it too.` },
    { n:'Wrapped Round', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>2+E, next:true, party:true},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Shield: the next hit on each hero is ${2+E} less, and each hero's next hit deals +1.` },
    'It carries its young on that tail.');
  K(['pangolin'],'pan_edges','Sharp Edges','M',0,
    { n:'Scale Slash', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P}],
      txt:(P,E)=>`Melee ${3+P}.` },
    { n:'Saw', ap:1, el:1, cd:3, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>2+E},{v:'wound', n:2, kind:'cut', area:'nodeArea'}],
      txt:(P,E)=>`Every foe beside you takes ${2+E}, then each is Wounded 2.` },
    'The scale edges are sharp enough to cut.');
  K(['pangolin'],'pan_upright','Walk Upright','S',0,
    { n:'Stride', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'reveal', radius:2, dur:1}],
      txt:(P,E)=>`Move ${1+P}, and reveal within 2 of where you stop.` },
    { n:'Tall and Wary', ap:0, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>3+E, dur:2},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`Reveal within ${3+E} for 2 rounds; your next hit deals +${1+E}.` },
    'On its back legs, tail for balance.');
  K(['pangolin'],'pan_ants','Ant Armour','C',0,
    { n:'Ant Bath', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'shield', val:(P,E)=>1+h(P), dur:1},{v:'heal', n:1}],
      txt:(P,E)=>`Cleanse (Anchored, Weakened, Wounds); Shield ${1+h(P)} this round, and heal 1.` },
    { n:'Stinging Shield', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:2},{v:'thorns', val:(P,E)=>2+E, next:true, dur:2}],
      txt:(P,E)=>`Cleanse, and for 2 rounds you can't be Weakened or Anchored by a foe, and Thorns: the next foe to hit you in melee takes ${2+E}.` },
    'Ants crawl under the scales, and it lets them.');

  // Hedgehog
  K(['hedgehog'],'heh_spines','Spines','M',0,
    { n:'Prickle', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>1+P, dur:1},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Shield 1 this round; any foe that hits you in melee takes ${1+P}.` },
    { n:'Bristling Ball', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>2+E, dur:2},{v:'weaken', val:1, dur:1, area:'adj'}],
      txt:(P,E)=>`For 2 rounds any foe that hits you in melee takes ${2+E}; every foe beside you is Weakened 1 this round.` },
    'Five thousand spines, all pointing out.');
  K(['hedgehog'],'heh_snuffle','Snuffle','S',0,
    { n:'Sniff About', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'reveal', radius:1, dur:1}],
      txt:(P,E)=>`Snuffle ${1+P}, and reveal within 1 of where you stop.` },
    { n:'Under the Hedge', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E},{v:'hidden', dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Move ${2+E} under cover; Hidden ${1+h(E)}.` },
    'It grunts like a small pig as it goes.');
  K(['hedgehog'],'heh_hibernate','Hibernate','T',0,
    { n:'Drowse', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+h(P)},{v:'haste', n:1}],
      txt:(P,E)=>`Heal 1 at the start of each turn for ${2+h(P)} rounds, and Haste: your track returns 1 column sooner.` },
    { n:'Winter Nest', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'stasis', dur:1},{v:'engine', kind:'regen', val:(P,E)=>1+h(E), dur:2}],
      txt:(P,E)=>`Sleep in your nest: nothing can touch you until your next turn, and heal ${1+h(E)} at the start of each turn for 2 rounds.` },
    'It sleeps the whole winter in a ball of leaves.');
  K(['hedgehog'],'heh_anoint','Anointing','C',0,
    { n:'Froth', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'weaken', val:1, dur:2}],
      txt:(P,E)=>`Melee ${2+P}; it is Weakened 1 for 2 rounds.` },
    { n:'Self-Anoint', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:2},{v:'thorns', val:(P,E)=>1+E, dur:2}],
      txt:(P,E)=>`Spread a bitter froth on your spines: for 2 rounds any foe that hits you in melee takes ${1+E}, and Cleanse, and you can't be Weakened or Anchored by a foe.` },
    'It chews something bitter and spreads the foam on its spines. Nobody knows why.');
  K(['hedgehog'],'heh_forage','Night Forage','C',0,
    { n:'Beetle Hunt', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'engine', kind:'ap', val:1, dur:1}],
      txt:(P,E)=>`Heal ${1+P}, and gain 1 AP next turn.` },
    { n:'Garden Rounds', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'heal', n:(P,E)=>1+E, party:true},{v:'reveal', radius:3, dur:1}],
      txt:(P,E)=>`Both heroes heal ${1+E}, and reveal within 3.` },
    'Two kilometres a night, garden to garden.');
  K(['hedgehog'],'heh_burst','Spine Burst','M',0,
    { n:'Unroll', ap:1, el:0, cd:1, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>1+P}],
      txt:(P,E)=>`Uncurl with a snap: every foe beside you takes ${1+P}.` },
    { n:'Pop', ap:1, el:1, cd:3, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>2+E},{v:'force', kind:'push', n:1, area:true},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Every foe beside you takes ${2+E} and is pushed 1; hold Shield 1 this round.` },
    'Curled tight, then all at once.');
  K(['hedgehog'],'heh_huff','Huff','C',0,
    { n:'Huff', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'weaken', val:1, dur:1},{v:'force', kind:'push', n:1},{v:'strike', kind:'los', dmg:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Huff at a foe within 2: it takes ${1+h(P)}, is Weakened 1 this round, and is pushed 1.` },
    { n:'Snort and Pop', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(E), area:'radius', radius:(P,E)=>1+E},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Every foe within ${1+E} is Weakened 1 for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}; Shield: the next hit on you is 1 less.` },
    'All bluster and spines.');
  /* ───────────────────────── POUCHED AND EGG-LAYING ─────────────────────────
     kangaroo · opossum · platypus. Pouch is the two marsupials'; the opossum also shares the hedgehog's
     Venom Shrug, and the platypus the jerboa's Burrowing. */
  S('kangaroo', { name: 'Red Kangaroo', lean: 'S/M', branch: 'Pouched and egg-laying', icon: '🦘',
    tagline: 'Tail like a third leg, legs like springs, and a boxer’s stance.' });
  S('opossum', { name: 'Opossum', lean: 'T/C', branch: 'Pouched and egg-laying', icon: '🐀',
    tagline: 'A night wanderer that shrugs off venom and plays dead convincingly.' });
  S('platypus', { name: 'Platypus', lean: 'C/T', branch: 'Pouched and egg-laying', icon: '🦫',
    tagline: 'Duck bill, otter feet, venom spurs. Hunts with its eyes shut.' });
  T.shareTrait('hed_venom', 'opossum');
  T.shareTrait('jer_burrow', 'platypus');

  K(['kangaroo','opossum'],'pou_pouch','Pouch','C',0,
    { n:'Tuck In', ap:1, el:0, cd:1, dur:0, tgt:'ally',
      fx:[{v:'heal', n:(P,E)=>1+P, target:'ally'},{v:'engine', kind:'ap', val:1, dur:1, target:'ally'}],
      txt:(P,E)=>`Your ally heals ${1+P} and gains 1 AP next turn.` },
    { n:'Carry Them Out', ap:1, el:1, cd:4, dur:0, tgt:'ally',
      fx:[{v:'swap'},{v:'shield', val:(P,E)=>1+E, dur:1, party:true}],
      txt:(P,E)=>`Swap places with your ally, wherever they are; both of you hold Shield ${1+E} this round.` },
    'Somewhere warm and safe to be carried.', 'Pouched and egg-laying');

  // Kangaroo
  K(['kangaroo'],'kan_hop','Hop','S',0,
    { n:'Hop', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true}],
      txt:(P,E)=>`Hop ${1+P}, over foes.` },
    { n:'Bound Across', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>3+E, height:true},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Bound to any node within ${3+E}, height included; your next hit this turn deals +1.` },
    'It cannot walk backwards, and never needs to.');
  K(['kangaroo'],'kan_tailkick','Tail Kick','M',0,
    { n:'Lean Back and Kick', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'force', kind:'push', n:2}],
      txt:(P,E)=>`Rock back on your tail and kick: melee ${3+P}, and push it 2.` },
    { n:'Gut Rake', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>4+E, pierce:true},{v:'wound', n:2, kind:'rake'}],
      txt:(P,E)=>`Melee ${4+E} that ignores Shield; it is Wounded 2.` },
    'Both feet, with the whole weight on the tail.');
  K(['kangaroo'],'kan_box','Box','M',0,
    { n:'Jab', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Melee ${2+P}; it is Weakened 1 this round.` },
    { n:'Clinch', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'anchor', who:'foe', dur:1},{v:'empower', val:(P,E)=>1+E, uses:1, dur:1}],
      txt:(P,E)=>`Melee ${2+E} and hold it (Anchored 1); your next hit this turn deals +${1+E}.` },
    'Forearms up, chest out.');
  K(['kangaroo'],'kan_prop','Tail Prop','T',0,
    { n:'Prop', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'anchor', who:'self', dur:1},{v:'shield', val:(P,E)=>2+h(P), dur:1}],
      txt:(P,E)=>`Brace on your tail: Shield ${2+h(P)} this round, and nothing can push or pull you.` },
    { n:'Five Legs', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:2},{v:'thorns', val:(P,E)=>2+E, next:true, push:1, dur:2}],
      txt:(P,E)=>`Cleanse, and for 2 rounds you can't be Weakened or Anchored by a foe, and Thorns: the next foe to hit you in melee takes ${2+E} and is pushed 1.` },
    'The tail takes its whole weight.');
  K(['kangaroo'],'kan_mob','Mob Lead','C',0,
    { n:'Thump the Mob', ap:1, el:0, cd:1, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>1+P},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Your ally moves ${1+P}, and their next hit deals +1.` },
    { n:'Whole Mob', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true},{v:'engine', kind:'ap', val:1, dur:1, target:'ally'}],
      txt:(P,E)=>`Each hero's next hit deals +${1+E}, and your ally gains 1 AP next turn.` },
    'The big ones lead, the small ones follow.');
  K(['kangaroo'],'kan_long','Long Hop','S',0,
    { n:'Stretch Out', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P}],
      txt:(P,E)=>`Move ${2+P}.` },
    { n:'Nine Metres', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>4+E, ignoreFoes:true},{v:'hazardImmune', dur:1},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Move ${4+E}, passing foes and ignoring hazards this round; Shield: the next hit on you is 1 less.` },
    'Nine metres in a single bound.');
  K(['kangaroo'],'kan_kickoff','Kick Off','S',0,
    { n:'Push Off', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'move', n:2, free:true}],
      txt:(P,E)=>`Melee ${2+P}, then spring 2 away.` },
    { n:'Off the Wall', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:3, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>3+E, ifAdjacent:true},{v:'force', kind:'push', n:2}],
      txt:(P,E)=>`Bound up to 3 toward a foe within 3; if you end beside it, melee ${3+E} and push it 2.` },
    'Kick, spring, gone.');
  K(['kangaroo'],'kan_lick','Desert Lick','T',0,
    { n:'Lick Forearms', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Cool down: heal ${1+P}, and ignore hazards for 2 rounds.` },
    { n:'Rest in the Shade', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E, party:true},{v:'cleanse'}],
      txt:(P,E)=>`Cleanse (Anchored, Weakened, Wounds); both heroes heal 1 at the start of each turn for ${2+E} rounds.` },
    'It licks its arms to keep cool.');

  // Opossum
  K(['opossum'],'opo_dead','Play Dead','T',0,
    { n:'Flop', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'shield', val:(P,E)=>2+h(P), next:true}],
      txt:(P,E)=>`Flop over: Hidden 1, and Shield: the next hit on you is ${2+h(P)} less.` },
    { n:'Very Convincing', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'stasis', dur:1},{v:'decoy', dur:(P,E)=>1+E, here:true},{v:'heal', n:1}],
      txt:(P,E)=>`Play dead: nothing can touch you until your next turn, foes are drawn to where you lie for ${1+E} rounds, and you heal 1.` },
    'Not on purpose. It simply faints.');
  K(['opossum'],'opo_tail','Prehensile Tail','S',0,
    { n:'Hang', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Climb ${1+P}, and hold Shield 1 this round.` },
    { n:'Swing Down', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, height:true},{v:'empower', val:(P,E)=>1+E, uses:1, dur:1}],
      txt:(P,E)=>`Swing to any node within ${2+E}, height included; your next hit this turn deals +${1+E}.` },
    'A tail that holds on by itself.');
  K(['opossum'],'opo_hiss','Fifty-Tooth Hiss','M',0,
    { n:'Gape', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Show all fifty teeth and bite: melee ${2+P}, and it is Weakened 1 this round.` },
    { n:'Hiss and Drool', ap:0, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+E, area:'radius', radius:2},{v:'force', kind:'push', n:1, area:true}],
      txt:(P,E)=>`Every foe within 2 is Weakened 1 for ${1+E} rounds, and every foe beside you is pushed 1.` },
    'More teeth than any other land mammal.');
  K(['opossum'],'opo_groom','Clean Groom','T',0,
    { n:'Groom', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'heal', n:(P,E)=>1+P}],
      txt:(P,E)=>`Cleanse (Anchored, Weakened, Wounds), and heal ${1+P}.` },
    { n:'Groom Each Other', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'cleanse', party:true},{v:'heal', n:(P,E)=>1+E, party:true}],
      txt:(P,E)=>`Both heroes cleanse (Anchored, Weakened, Wounds), and heal ${1+E}.` },
    'Fastidious, and it eats the ticks.');
  K(['opossum'],'opo_thumb','Thumb Feet','S',0,
    { n:'Grip', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'anchor', who:'self', dur:1}],
      txt:(P,E)=>`Move ${1+P}; nothing can push or pull you this round.` },
    { n:'Grab and Go', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'stripShield', amount:2},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Snatch 2 Shield off a foe beside you, melee ${2+E}, and step 1.` },
    'Thumbs on its back feet, too.');
  K(['opossum'],'opo_wander','Night Wander','S',0,
    { n:'Wander', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'reveal', radius:1, dur:1}],
      txt:(P,E)=>`Wander ${1+P}, and reveal within 1 of where you stop.` },
    { n:'Under Cover of Night', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E, ignoreFoes:true},{v:'hidden', dur:(P,E)=>1+h(E), canMove:true}],
      txt:(P,E)=>`Move ${2+E}, passing foes; Hidden ${1+h(E)} even if you move.` },
    'It never stays in one den two nights running.');
  K(['opossum'],'opo_nose','Scavenger’s Nose','C',0,
    { n:'Sniff Out', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'mark', nearest:true},{v:'heal', n:1}],
      txt:(P,E)=>`Reveal within ${2+P}, Mark the nearest foe (the next hit on it deals +2), and heal 1.` },
    { n:'Leftovers', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'draw', face:'C', val:1},{v:'heal', n:(P,E)=>1+E}],
      txt:(P,E)=>`Draw a Charge die from your pool, and heal ${1+E}.` },
    'Anything, anywhere, eaten.');

  // Platypus
  K(['platypus'],'pla_electro','Electroreception','C',0,
    { n:'Sense the Current', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'empower', val:1, uses:1, dur:1},{v:'mark', nearest:true}],
      txt:(P,E)=>`Feel the electric field: reveal within ${2+P}, Mark the nearest foe (the next hit on it deals +2), and your next hit this turn deals +1.` },
    { n:'Every Heartbeat', ap:1, el:1, cd:4, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', radius:(P,E)=>1+E, dur:2},{v:'reveal', target:true, dur:3},{v:'mark', n:(P,E)=>1+E, dur:3}],
      txt:(P,E)=>`Feel every heartbeat within ${1+E} for 2 rounds; pick one foe: Revealed for 3 rounds, and it is Marked +${1+E} for 3 rounds.` },
    'Forty thousand sensors in the bill.');
  K(['platypus'],'pla_spur','Venom Spur','M',0,
    { n:'Spur', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'wound', n:2, kind:'venom'}],
      txt:(P,E)=>`Melee ${2+P}; it is Wounded 2.` },
    { n:'Full Dose', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'wound', n:(P,E)=>2+E, kind:'venom'},{v:'weaken', val:1, dur:2}],
      txt:(P,E)=>`Melee ${2+E}; it is Wounded ${2+E} and is Weakened 1 for 2 rounds.` },
    'A hollow spur on each back ankle.');
  K(['platypus'],'pla_dive','Duck Dive','S',0,
    { n:'Dive', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hidden', dur:1},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Move ${1+P}, Hidden 1, and ignore hazards this round.` },
    { n:'Bottom Run', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E},{v:'hidden', dur:1},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Come up anywhere within ${2+E}, Hidden 1, and ignore hazards for 2 rounds.` },
    'Down, and gone, in a ring of ripples.');
  K(['platypus'],'pla_cheek','Cheek Store','T',0,
    { n:'Fill Cheeks', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'ap', val:1, dur:1},{v:'heal', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Gain 1 AP next turn, and heal ${1+h(P)}.` },
    { n:'Surface to Eat', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>2+E},{v:'engine', kind:'ap', val:1, dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Heal ${2+E}, and gain 1 AP at the start of each turn for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}.` },
    'It stores the catch in its cheeks and eats at the surface.');
  K(['platypus'],'pla_shut','Eyes-Shut Hunt','C',0,
    { n:'Blind Strike', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+P, revealTarget:true}],
      txt:(P,E)=>`Strike a foe within 2 for ${2+P}, hidden or not.` },
    { n:'Find by Feel', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:2},{v:'strike', kind:'los', dmg:(P,E)=>2+E, revealTarget:true},{v:'mark', n:1, dur:3}],
      txt:(P,E)=>`Find any foe by feel: it takes ${2+E}, it is Revealed for 2 rounds, and it is Marked +1 for 3 rounds.` },
    'Eyes, ears and nose all closed underwater.');
  K(['platypus'],'pla_web','Webbed Fold','S',0,
    { n:'Paddle', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Move ${1+P}, and hold Shield 1 this round.` },
    { n:'Fold and Dig', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+E, dur:2},{v:'anchor', who:'self', dur:1},{v:'heal', n:1}],
      txt:(P,E)=>`Fold back the webbing and dig in: Shield ${2+E} for 2 rounds, nothing can push or pull you this round, and heal 1.` },
    'The webs fold back when it walks on land.');
  K(['platypus'],'pla_egg','Egg Clutch','T',0,
    { n:'Guard the Nest', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`You and an ally beside you hold Shield ${1+P} this round.` },
    { n:'Sealed Burrow', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:(P,E)=>1+h(E), party:true, radius:1},{v:'engine', kind:'regen', val:1, dur:2, party:true}],
      txt:(P,E)=>`You and an ally beside you are Hidden ${1+h(E)}; both heroes heal 1 at the start of each turn for 2 rounds.` },
    'A mammal that lays eggs, and guards them.');
  K(['platypus'],'pla_odd','Odd One Out','C',0,
    { n:'Confuse', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P)},{v:'strike', kind:'los', dmg:1}],
      txt:(P,E)=>`A foe within 3 takes 1 and is Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}.` },
    { n:'Nothing Like It', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'decoy', dur:(P,E)=>1+E, here:true},{v:'blink', reach:2},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`Leave a puzzle where you stood (a decoy for ${1+E} rounds), slip to a node within 2, and your next hit deals +${1+E}.` },
    'The first scientists to see one thought it was a hoax.');
  /* ───────────────────────── BIRDS OF PREY AND OWLS ─────────────────────────
     bald eagle · red-tailed hawk, with the barn owl. Hollow Bones and Talon Strike are the owl's, and every raptor's;
     Keen Sight and Stoop are the day hunters'. The hawk's Sky Hyperspeed is the cheetah's run, taken to the air. */
  T.SPECIES.owl.branch = 'Birds of prey and owls';
  S('eagle', { name: 'Bald Eagle', lean: 'M/C', branch: 'Birds of prey and owls', icon: '🦅',
    tagline: 'Broad wings, a voice like a rusty hinge, and a grip nothing breaks.' });
  S('hawk', { name: 'Red-tailed Hawk', lean: 'S/M', branch: 'Birds of prey and owls', icon: '🦅',
    tagline: 'A brick-red tail and a long scream. Quick in the hedges, quicker in the open; hangs on the wind and drops.' });
  T.shareTrait('owl_bones', 'eagle', 'hawk');
  T.shareTrait('owl_talon', 'eagle', 'hawk');

  K(['eagle','hawk'],'rap_sight','Keen Sight','C',0,
    { n:'Spot', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>3+P, dur:1},{v:'mark', nearest:true}],
      txt:(P,E)=>`See everything within ${3+P}, and Mark the nearest foe (the next hit on it deals +2).` },
    { n:'Eye of the Sky', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', radius:(P,E)=>2+E, dur:1},{v:'reveal', target:true, dur:(P,E)=>2+E},{v:'mark', n:(P,E)=>1+h(E), dur:3}],
      txt:(P,E)=>`See everything within ${2+E} this round; pick a foe: Revealed for ${2+E} rounds, and it is Marked +${1+h(E)} for 3 rounds.` },
    'It reads a newspaper from a mile up, if it cared to.', 'Birds of prey and owls');
  K(['eagle','hawk'],'rap_stoop','Stoop','M',0,
    { n:'Drop', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:2, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>2+P, ifAdjacent:true}],
      txt:(P,E)=>`Drop up to 2 toward a foe within 3; if you end beside it, melee ${2+P}.` },
    { n:'Plummet', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>3+E, dest:'adjTarget', height:true},{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Fold the wings and fall beside a foe within ${3+E}, height included: melee ${3+E}, and it is Weakened 1 this round.` },
    'Wings folded, and the whole sky behind it.', 'Birds of prey and owls');

  // Bald eagle: Hollow Bones, Talon Strike, Keen Sight, Stoop, and these five
  K(['eagle'],'eag_soar','Soar','S',0,
    { n:'Ride the Wind', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Glide ${1+P}, over foes; hazards can't touch you this round.` },
    { n:'High Circle', ap:1, el:1, cd:3, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>2+E},{v:'reveal', radius:(P,E)=>2+E, dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Rise onto any node within ${2+E}, height included; see within ${2+E}, and your next hit this turn deals +1.` },
    'Hours on one thermal without a wingbeat.');
  K(['eagle'],'eag_lock','Talon Lock','M',0,
    { n:'Clamp', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'anchor', who:'foe', dur:1},{v:'anchor', who:'self', dur:1}],
      txt:(P,E)=>`Melee ${3+P} and lock on: it and you are both Anchored this round.` },
    { n:'Death Grip', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'anchor', who:'foe', dur:(P,E)=>1+h(E)},{v:'wound', n:2, kind:'grip'}],
      txt:(P,E)=>`Melee ${3+E} and do not let go: it is Anchored ${1+h(E)}, and is Wounded 2.` },
    'A grip that does not open.');
  K(['eagle'],'eag_scream','Eagle Scream','C',0,
    { n:'Scream', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'adj'},{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:1, party:true}],
      txt:(P,E)=>`Every foe beside you is Weakened 1, and both heroes' next hit this round deals +${1+h(P)}.` },
    { n:'Rally Cry', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true},{v:'shield', val:1, dur:1, party:true},{v:'weaken', val:1, dur:2, area:'adj'}],
      txt:(P,E)=>`Both heroes' next hit deals +${1+E} and they hold Shield 1 this round; foes beside you are Weakened 1 for 2 rounds.` },
    'Smaller than it sounds, and everyone hears it.');
  K(['eagle'],'eag_fish','Fish Snatch','S',0,
    { n:'Snatch', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>1+P},{v:'force', kind:'pull', n:1}],
      txt:(P,E)=>`Swoop on a foe within 3: it takes ${1+P} and is dragged 1 toward you.` },
    { n:'Skim and Lift', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E, ignoreFoes:true},{v:'hazardImmune', dur:1},{v:'heal', n:(P,E)=>1+E}],
      txt:(P,E)=>`Skim ${2+E}, over foes and through hazards, snatching a meal on the way: heal ${1+E}.` },
    'Down to the water and up again, and never wet past the ankles.');
  K(['eagle'],'eag_nest','Nest Guard','T',0,
    { n:'Over the Nest', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1, party:true, allyRange:1},{v:'thorns', val:1, next:true, dur:1}],
      txt:(P,E)=>`You and an ally beside you hold Shield ${1+P} this round, and Thorns: the first foe to hit you in melee takes 1.` },
    { n:'Eyrie', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+E, dur:2, party:true},{v:'engine', kind:'regen', val:1, dur:2, party:true}],
      txt:(P,E)=>`Both heroes hold Shield ${1+E} for 2 rounds and heal 1 at the start of each turn for 2 rounds.` },
    'A nest the size of a car, and it comes back every year.');

  // Red-tailed hawk: Hollow Bones, Talon Strike, Keen Sight, Stoop, and these five
  K(['hawk'],'haw_hyper','Sky Hyperspeed','S',0,
    { n:'Sky Dash', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:4, exact:true, ignoreFoes:true},{v:'hazardImmune', dur:1},{v:'empower', val:(P,E)=>P, uses:1, dur:1}],
      txt:(P,E)=>`Fly exactly 4, over foes and hazards${P ? `; your next strike this turn deals +${P}` : ''}.` },
    { n:'Sky Burst', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:4, exact:true, ignoreFoes:true},{v:'hazardImmune', dur:1},{v:'empower', val:(P,E)=>2+E, uses:1, dur:1},{v:'mark', nearest:true}],
      txt:(P,E)=>`Fly exactly 4, over foes and hazards; Mark the nearest foe (the next hit on it deals +2), and your next strike this turn deals +${2+E}.` },
    'The cheetah’s run, with nothing underfoot to slow it.');
  K(['hawk'],'haw_kite','Kite','S',0,
    { n:'Hang', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'reveal', radius:2, dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Slip ${1+P} and hang on the wind: see within 2, and your next hit this turn deals +1.` },
    { n:'Hold the Wind', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hover', dur:(P,E)=>1+E},{v:'reveal', radius:(P,E)=>2+E, dur:1}],
      txt:(P,E)=>`Hover for ${1+E} rounds: hazards and Fields don't touch you, and nothing pushes or pulls you, and mint 1 AP each turn; see within ${2+E}.` },
    'Perfectly still in a gale.');
  K(['hawk'],'haw_bind','Talon Bind','M',0,
    { n:'Bind', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'strike', kind:'melee', dmg:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Both feet: melee ${1+P}, then melee ${1+h(P)}.` },
    { n:'Tumble', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'force', kind:'push', n:2},{v:'weaken', val:1, dur:2}],
      txt:(P,E)=>`Lock feet and tumble: melee ${2+E}, push it 2, and it is Weakened 1 for 2 rounds.` },
    'Two hawks locked together, falling, neither letting go.');
  K(['hawk'],'haw_mantle','Mantle','T',0,
    { n:'Mantle', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1},{v:'hidden', dur:1},{v:'heal', n:1}],
      txt:(P,E)=>`Spread your wings over what you hold: Shield ${1+P}, Hidden 1, and heal 1.` },
    { n:'Cover the Kill', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:(P,E)=>1+h(E), party:true, radius:1},{v:'heal', n:(P,E)=>1+E, party:true}],
      txt:(P,E)=>`You and an ally beside you are Hidden ${1+h(E)}, and both heroes heal ${1+E}.` },
    'Wings down like a tent: mine.');
  K(['hawk'],'haw_hedge','Hedge Chase','S',0,
    { n:'Weave', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Weave ${1+P} through cover, past foes and; your next hit this turn deals +1.` },
    { n:'Through the Hedge', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, dest:'adjTarget'},{v:'strike', kind:'melee', dmg:(P,E)=>2+E, revealTarget:true},{v:'hidden', dur:1}],
      txt:(P,E)=>`Burst out beside a foe within ${2+E}, hidden or not: melee ${2+E}, and you are Hidden 1.` },
    'Through the gap in the hedge before the sparrow saw the gap.');
  /* ───────────────────────── WADERS ─────────────────────────
     crane · heron · egret · ibis · shoebill · flamingo. Every bird carries the owl's Hollow Bones; every wader
     Wade and Long Legs; all but the flamingo Spear Bill and Still Hunt. The heron carries Human's Tool Use.
     Migration is the crane's (the butterfly will share it) and Big Bill the shoebill's (the toucan and the
     pelican will). */
  const WADERS = ['crane','heron','egret','ibis','shoebill','flamingo'];
  const SPEARS = ['crane','heron','egret','ibis','shoebill'];
  S('crane', { name: 'Crane', lean: 'S/C', branch: 'Waders', icon: '🪿',
    tagline: 'Tall, grey and patient, with a dance for every season and a voice that carries for miles.' });
  S('heron', { name: 'Heron', lean: 'T/M', branch: 'Waders', icon: '🪿',
    tagline: 'A statue in the shallows until the moment it is not. Uses bait, on purpose.' });
  S('egret', { name: 'Egret', lean: 'C/S', branch: 'Waders', icon: '🪿',
    tagline: 'White plumes, yellow feet, and a habit of riding on bigger animals.' });
  S('ibis', { name: 'Ibis', lean: 'T/C', branch: 'Waders', icon: '🪿',
    tagline: 'A curved bill that finds what is buried, and a flock that flies in a line.' });
  S('shoebill', { name: 'Shoebill', lean: 'M/T', branch: 'Waders', icon: '🪿',
    tagline: 'Stands still for an hour, then falls on its prey with its whole body. Its bill is a clog.' });
  S('flamingo', { name: 'Flamingo', lean: 'T/C', branch: 'Waders', icon: '🦩',
    tagline: 'Pink from what it eats, at home in lakes that would burn anyone else. Never alone.' });
  T.shareTrait('owl_bones', ...WADERS);
  T.shareTrait('hum_tool', 'heron');

  K(WADERS,'wad_wade','Wade','S',0,
    { n:'Wade', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Wade ${1+P}; hazards can't touch you this round.` },
    { n:'Shallows', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E},{v:'hazardImmune', dur:2},{v:'cleanse', field:1},{v:'heal', n:1}],
      txt:(P,E)=>`Wade ${2+E}, Cleanse the ground within 1 of where you stop (hazards and foes' Fields), heal 1, and ignore hazards for 2 rounds.` },
    'Water to the knees is home.', 'Waders');
  K(WADERS,'wad_legs','Long Legs','S',0,
    { n:'High Step', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Step ${1+P} over foes, and hold Shield 1 this round.` },
    { n:'Stand Tall', ap:1, el:1, cd:3, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+E},{v:'reveal', radius:(P,E)=>2+E, dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Step up onto any node within ${1+E}, height included; see within ${2+E}, and your next hit this turn deals +1.` },
    'Stilts that fold the wrong way.', 'Waders');
  K(SPEARS,'wad_spear','Spear Bill','M',0,
    { n:'Stab', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P, pierce:true}],
      txt:(P,E)=>`Melee ${2+P} that ignores Shield.` },
    { n:'Run Through', ap:1, el:1, cd:3, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>3+E, pierce:true},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Strike a foe within 2 for ${3+E}, ignoring Shield; it is Weakened 1 this round.` },
    'A neck like a spring and a bill like a blade.', 'Waders');
  K(SPEARS,'wad_still','Still Hunt','T',0,
    { n:'Freeze', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'empower', val:(P,E)=>2+P, uses:1, dur:2},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Go still: Shield 1 this round, and your next hit within 2 rounds deals +${2+P}.` },
    { n:'Patience', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'empower', val:(P,E)=>3+E, uses:1, dur:2},{v:'reroll', n:1}],
      txt:(P,E)=>`Hidden 1; your next hit within 2 rounds deals +${3+E}, and reroll 1 banked die.` },
    'It can wait longer than you can.', 'Waders');

  // Crane: Hollow Bones, Spear Bill, Still Hunt, Wade, Long Legs, and these four
  K(['crane'],'cra_migrate','Migration','S',0,
    { n:'Long Haul', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+h(P)},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Fly ${2+h(P)}; hazards can't touch you this round.` },
    { n:'Flyway', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E},{v:'haste', n:(P,E)=>1+h(E)},{v:'heal', n:1}],
      txt:(P,E)=>`Fly ${2+E} and heal 1; Haste: your track slides ${1+h(E)} extra (your cards come back sooner).` },
    'The same road in the sky, every year, for ten thousand years.');
  K(['crane'],'cra_dance','Courtship Dance','C',0,
    { n:'Dance', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+P, uses:1, dur:2, target:'ally'},{v:'shield', val:1, dur:1, party:true}],
      txt:(P,E)=>`Dance for your partner: their next hit deals +${1+P}, and both heroes hold Shield 1 this round.` },
    { n:'Pair Dance', ap:0, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'cleanse', party:true},{v:'heal', n:(P,E)=>1+E, party:true},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Both heroes shake off Anchored and Weakened, heal ${1+E}, and deal +1 on their next hit.` },
    'Bow, leap, toss a stick, bow again.');
  K(['crane'],'cra_stride','Long Stride','S',0,
    { n:'Stride', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P}],
      txt:(P,E)=>`Stride ${1+P}.` },
    { n:'Run-Up', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>3+E, height:true},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Run, flap and lift: land on any node within ${3+E}, height included; hazards can't touch you this round.` },
    'Three long steps and it is in the air.');
  K(['crane'],'cra_trumpet','Trumpet','C',0,
    { n:'Call', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'weaken', val:1, dur:1, area:'adj'},{v:'shield', val:1, dur:1, party:true}],
      txt:(P,E)=>`See within ${2+P}; foes beside you are Weakened 1, and both heroes hold Shield 1 this round.` },
    { n:'Unison Call', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true},{v:'force', kind:'push', n:1, area:true, radius:1}],
      txt:(P,E)=>`Call in unison: both heroes' next hit deals +${1+E}, and every foe beside you falls back 1.` },
    'A windpipe coiled inside the breastbone, like a horn.');

  // Heron: Hollow Bones, Spear Bill, Still Hunt, Wade, Long Legs, Tool Use, and these three
  K(['heron'],'her_shade','Canopy Shade','T',0,
    { n:'Wing Canopy', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1},{v:'reveal', radius:2, dur:1},{v:'mark', nearest:true}],
      txt:(P,E)=>`Spread your wings into a roof: Shield ${1+P}, see within 2, and Mark the nearest foe.` },
    { n:'Deep Shade', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:(P,E)=>1+h(E), party:true, radius:1},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`You and an ally beside you are Hidden ${1+h(E)}; your next hit deals +${1+E}.` },
    'Shade on the water, and the fish come to it.');
  K(['heron'],'her_neck','Neck Spring','M',0,
    { n:'Spring', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`Strike a foe within 2 for ${2+P}.` },
    { n:'Coiled Strike', ap:1, el:1, cd:3, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>3+E, revealTarget:true},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Strike a foe within 2 for ${3+E}, hidden or not, and pin it: Anchored 1.` },
    'The neck is folded in an S, and the S is loaded.');
  K(['heron'],'her_rookery','Rookery','C',0,
    { n:'Colony', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+h(P), dur:1, party:true},{v:'heal', n:1, target:'ally'}],
      txt:(P,E)=>`Both heroes hold Shield ${1+h(P)} this round, and your ally heals 1.` },
    { n:'Rookery Watch', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'regen', val:1, dur:2, party:true},{v:'reveal', radius:(P,E)=>1+E, dur:1}],
      txt:(P,E)=>`Someone is always watching: see everything within ${1+E} this round, and both heroes heal 1 at the start of each turn for 2 rounds.` },
    'A hundred nests in one tree, and every one awake.');

  // Egret: Hollow Bones, Spear Bill, Still Hunt, Wade, Long Legs, and these four
  K(['egret'],'egr_plumes','Plumes','C',0,
    { n:'Display', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'decoy', dur:1, here:true},{v:'move', n:(P,E)=>1+P}],
      txt:(P,E)=>`Flare your plumes and slip away: leave a decoy where you stood for 1 round, and move ${1+P}.` },
    { n:'Dazzle', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'weaken', val:(P,E)=>1+h(E), dur:2},{v:'mark'},{v:'mark', n:1, dur:3}],
      txt:(P,E)=>`Dazzle a foe within 3: it is Weakened ${1+h(E)} for 2 rounds and Marked: +2 to the next hit, +1 to every hit for 3 rounds.` },
    'Plumes once worth more than gold.');
  K(['egret'],'egr_stir','Foot Stir','T',0,
    { n:'Stir', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+P, dur:1},{v:'mark', nearest:true},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Stir the mud with a yellow foot: see within ${1+P}, Mark the nearest foe, and your next hit this turn deals +1.` },
    { n:'Flush Out', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:2},{v:'strike', kind:'los', dmg:1, revealTarget:true},{v:'mark', n:(P,E)=>1+h(E), dur:3}],
      txt:(P,E)=>`Flush out any foe: it takes 1, it is Revealed for 2 rounds, and it is Marked +${1+h(E)} for 3 rounds.` },
    'Bright feet, shuffled, and everything hiding moves.');
  K(['egret'],'egr_cattle','Cattle Rider','S',0,
    { n:'Follow the Herd', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'heal', n:1},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Move ${1+P} and heal 1; your ally's next hit deals +1.` },
    { n:'Ride Along', ap:1, el:1, cd:4, dur:0, tgt:'ally',
      fx:[{v:'swap'},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Swap places with your ally, wherever they are; both heroes' next hit deals +${1+E}.` },
    'Where the big animals walk, the insects jump.');
  K(['egret'],'egr_lift','Graceful Lift','S',0,
    { n:'Lift', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Lift onto any node within ${1+P}, height included, and hold Shield 1 this round.` },
    { n:'Float', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weightless', dur:(P,E)=>1+E},{v:'empower', val:1, uses:1, dur:2},{v:'heal', n:1}],
      txt:(P,E)=>`Float for ${1+E} rounds: nothing pushes or pulls you, and hazards and Fields don't touch you, and you may walk onto height nodes; heal 1, and your next hit deals +1.` },
    'Up off the water without a splash.');

  // Ibis: Hollow Bones, Spear Bill, Still Hunt, Wade, Long Legs, and these four
  K(['ibis'],'ibi_probe','Probing Bill','C',0,
    { n:'Probe', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P, revealTarget:true},{v:'reveal', radius:1, dur:1}],
      txt:(P,E)=>`Melee ${2+P}, hidden or not, and see everything beside you.` },
    { n:'Deep Probe', ap:1, el:1, cd:3, dur:0, tgt:'node_r2',
      fx:[{v:'interact', range:2},{v:'reveal', radius:2, dur:1},{v:'heal', n:(P,E)=>E}],
      txt:(P,E)=>`Probe a node within 2: work an objective there as if you stood on it; see within 2${E ? `, and heal ${E}` : ''}.` },
    'A bill that feels for what it cannot see.');
  K(['ibis'],'ibi_flood','Flood Wader','T',0,
    { n:'High Water', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1},{v:'hazardImmune', dur:2},{v:'heal', n:1}],
      txt:(P,E)=>`Shield ${1+P} this round, heal 1, and ignore hazards for 2 rounds.` },
    { n:'Flood Plain', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hazardImmune', dur:(P,E)=>2+E},{v:'hazardImmune', dur:1, party:true},{v:'engine', kind:'regen', val:1, dur:2, party:true}],
      txt:(P,E)=>`Both heroes ignore hazards this round (you for ${2+E} rounds) and heal 1 at the start of each turn for 2 rounds.` },
    'When the river rises, the ibis comes.');
  K(['ibis'],'ibi_scribe','Scribe’s Eye','T',0,
    { n:'Read the Signs', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reroll', n:(P,E)=>1+h(P)},{v:'reveal', radius:2, dur:1}],
      txt:(P,E)=>`Reroll up to ${1+h(P)} banked dice, and see within 2.` },
    { n:'Write It Down', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'draw', face:'T', val:1},{v:'reroll', n:1},{v:'shield', val:(P,E)=>1+E, next:true}],
      txt:(P,E)=>`Draw a Time die from your pool and reroll 1 banked die; Shield: the next hit on you is ${1+E} less.` },
    'The bird of the scribes, in the oldest stories.');
  K(['ibis'],'ibi_flock','Flock V','S',0,
    { n:'Formation', ap:1, el:0, cd:1, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>1+P},{v:'shield', val:1, dur:1, party:true}],
      txt:(P,E)=>`Your ally moves ${1+P}, where you choose; both heroes hold Shield 1 this round.` },
    { n:'V-Flight', ap:1, el:1, cd:4, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>2+E},{v:'shield', val:(P,E)=>1+h(E), dur:1, party:true},{v:'haste', n:1, who:'ally'}],
      txt:(P,E)=>`Your ally moves ${2+E} in your slipstream; both hold Shield ${1+h(E)} this round, and Haste: your ally's track slides 1 extra.` },
    'The bird in front breaks the wind for the one behind.');

  // Shoebill: Hollow Bones, Spear Bill, Still Hunt, Wade, Long Legs, Big Bill, and these three
  K(['shoebill'],'bil_big','Big Bill','M',0,
    { n:'Bill Grab', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>1+P},{v:'force', kind:'pull', n:1}],
      txt:(P,E)=>`Grab a foe within 2: it takes ${1+P} and is hauled 1 toward you.` },
    { n:'Clamp Bill', ap:1, el:1, cd:3, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+E},{v:'anchor', who:'foe', dur:(P,E)=>1+h(E)},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Clamp a foe within 2: it takes ${2+E}, is Anchored ${1+h(E)}, and is Weakened 1 this round.` },
    'More bill than bird.');
  K(['shoebill'],'sho_collapse','Collapse Strike','M',0,
    { n:'Collapse', ap:1, el:0, cd:2, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>4+P}],
      txt:(P,E)=>`Fall on a foe beside you with your whole body: melee ${4+P}.` },
    { n:'Full Collapse', ap:2, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>5+E, pierce:true},{v:'weaken', val:1, dur:2}],
      txt:(P,E)=>`Melee ${5+E} that ignores Shield; it is Weakened 1 for 2 rounds.` },
    'All of it, at once, wings and all.');
  K(['shoebill'],'sho_clatter','Bill Clatter','C',0,
    { n:'Clatter', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'adj'},{v:'shield', val:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Clatter your bill like a drum: foes beside you are Weakened 1, and you hold Shield ${1+h(P)} this round.` },
    { n:'Machine-Gun Bill', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'force', kind:'push', n:1, area:true, radius:1},{v:'shield', val:(P,E)=>1+E, dur:1},{v:'empower', val:1, uses:1, dur:2}],
      txt:(P,E)=>`Every foe beside you falls back 1; hold Shield ${1+E} this round, and your next hit deals +1.` },
    'The only sound it makes, and it is a loud one.');
  K(['shoebill'],'sho_ghost','Swamp Ghost','T',0,
    { n:'Stand Still', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'empower', val:(P,E)=>1+P, uses:1, dur:2}],
      txt:(P,E)=>`Hidden 1; your next hit within 2 rounds deals +${1+P}.` },
    { n:'In the Reeds', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+E},{v:'hidden', dur:(P,E)=>1+h(E), canMove:true},{v:'empower', val:2, uses:1, dur:2}],
      txt:(P,E)=>`Move ${1+E}; Hidden ${1+h(E)} even if you move, and your next hit deals +2.` },
    'Grey on grey in the papyrus. It was there the whole time.');

  // Flamingo: Hollow Bones, Wade, Long Legs, and these six
  K(['flamingo'],'fla_oneleg','One-Leg Rest','T',0,
    { n:'Rest', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Stand on one leg: heal ${1+P}, and hold Shield 1 this round.` },
    { n:'Long Rest', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E},{v:'shield', val:(P,E)=>1+h(E), dur:2}],
      txt:(P,E)=>`Heal 1 at the start of each turn for ${2+E} rounds, and hold Shield ${1+h(E)} for 2 rounds.` },
    'Half the body asleep, and it never falls over.');
  K(['flamingo'],'fla_filter','Filter Feed','C',0,
    { n:'Filter', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reroll', n:(P,E)=>1+h(P)},{v:'heal', n:1}],
      txt:(P,E)=>`Sift the shallows: reroll up to ${1+h(P)} banked dice, and heal 1.` },
    { n:'Strain the Lake', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'draw', face:'C', val:1},{v:'heal', n:(P,E)=>1+E},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Draw a Charge die from your pool, heal ${1+E}, and ignore hazards this round.` },
    'Head upside down, bill sieving the water.');
  K(['flamingo'],'fla_march','Flock March','S',0,
    { n:'March', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'shield', val:(P,E)=>1+h(P), dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`March ${1+P}; you and an ally beside you hold Shield ${1+h(P)} this round.` },
    { n:'Massed March', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+E, dur:1, party:true},{v:'empower', val:1, uses:1, dur:2, party:true},{v:'force', kind:'push', n:1, area:true, radius:1}],
      txt:(P,E)=>`Both heroes hold Shield ${1+E} this round and deal +1 on their next hit; every foe beside you falls back 1.` },
    'Heads turning together, a thousand at once.');
  K(['flamingo'],'fla_salt','Salt Flats','T',0,
    { n:'Salt Feet', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'hazardImmune', dur:2},{v:'shield', val:(P,E)=>1+P, dur:1}],
      txt:(P,E)=>`Ignore hazards for 2 rounds, and hold Shield ${1+P} this round.` },
    { n:'Caustic Lake', ap:1, el:1, cd:3, dur:0, tgt:'node_r2',
      fx:[{v:'wound', n:(P,E)=>2+h(E), kind:'salt', area:'nodeArea'},{v:'hazardImmune', dur:1, party:true}],
      txt:(P,E)=>`Stir the bitter lake at a node within 2: every foe on or beside it is Wounded ${2+h(E)}; both heroes ignore hazards this round.` },
    'It lives where the water would strip your skin.');
  K(['flamingo'],'fla_milk','Crop Milk','T',0,
    { n:'Feed', ap:1, el:0, cd:1, dur:0, tgt:'ally',
      fx:[{v:'heal', n:(P,E)=>2+P, target:'ally'}],
      txt:(P,E)=>`Your ally heals ${2+P}.` },
    { n:'Nourish', ap:0, el:1, cd:4, dur:0, tgt:'ally',
      fx:[{v:'heal', n:(P,E)=>2+E, target:'ally'},{v:'engine', kind:'ap', val:1, dur:1, target:'ally'},{v:'cleanse', party:true}],
      txt:(P,E)=>`Your ally heals ${2+E} and gains 1 AP next turn; both heroes shake off Anchored and Weakened.` },
    'Both parents make it, and it is red.');
  K(['flamingo'],'fla_pink','Pink Flock','C',0,
    { n:'Blend In', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1, party:true, radius:1},{v:'heal', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Lose yourself in the flock: you and an ally beside you are Hidden 1, and you heal ${1+h(P)}.` },
    { n:'A Thousand Pink', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'decoy', dur:(P,E)=>1+E, here:true},{v:'hidden', dur:1, party:true, radius:1},{v:'empower', val:(P,E)=>1+h(E), uses:1, dur:2}],
      txt:(P,E)=>`Leave a decoy for ${1+E} rounds; you and an ally beside you are Hidden 1, and your next hit deals +${1+h(E)}.` },
    'Which one? All of them.');
  /* ───────────────────────── SEABIRDS ─────────────────────────
     puffin · pelican · blue-footed booby. Every bird's Hollow Bones; every seabird's Plunge Dive, Waterproof and
     Salt Gland. The puffin carries the jerboa's Burrowing, the pelican the shoebill's Big Bill. */
  const SEABIRDS = ['puffin','pelican','booby'];
  S('puffin', { name: 'Atlantic Puffin', lean: 'S/C', branch: 'Seabirds', icon: '🐧',
    tagline: 'Flies underwater, digs its own burrow, and carries ten fish at once.' });
  S('pelican', { name: 'Pelican', lean: 'M/T', branch: 'Seabirds', icon: '🦤',
    tagline: 'A great glider with a bill that holds more than its belly. Fishes in a line with friends.' });
  S('booby', { name: 'Blue-Footed Booby', lean: 'C/S', branch: 'Seabirds', icon: '🐦',
    tagline: 'Clumsy on land, a dart from the sky. Shows off its bright blue feet.' });
  T.shareTrait('owl_bones', ...SEABIRDS);
  T.shareTrait('jer_burrow', 'puffin');
  T.shareTrait('bil_big', 'pelican');

  K(SEABIRDS,'sea_plunge','Plunge Dive','M',0,
    { n:'Plunge', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+P},{v:'hidden', dur:1}],
      txt:(P,E)=>`Dive on a foe within 2 for ${2+P}, and stay under: Hidden 1.` },
    { n:'Sky Dart', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>3+E, dest:'adjTarget', height:true},{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Dart down beside a foe within ${3+E}, height included: melee ${3+E}, and hazards can't touch you this round.` },
    'Wings back, into the water like a thrown spear.', 'Seabirds');
  K(SEABIRDS,'sea_proof','Waterproof','T',0,
    { n:'Oil Feathers', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Shield ${1+P} this round, and hazards can't touch you.` },
    { n:'Sealed Coat', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:2},{v:'shield', val:(P,E)=>1+E, dur:2},{v:'heal', n:1}],
      txt:(P,E)=>`Shield ${1+E} for 2 rounds; Cleanse, and you can't be Weakened or Anchored by a foe for 2 rounds, and heal 1.` },
    'Water runs off, and the cold with it.', 'Seabirds');
  K(SEABIRDS,'sea_salt','Salt Gland','T',0,
    { n:'Drink the Sea', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'cleanse'}],
      txt:(P,E)=>`Heal ${1+P}, and shake off Anchored and Weakened.` },
    { n:'Brine Out', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>1+E, party:true},{v:'hazardImmune', dur:1, party:true}],
      txt:(P,E)=>`Both heroes heal 1 at the start of each turn for ${1+E} ${1+E > 1 ? 'rounds' : 'round'}, and ignore hazards this round.` },
    'It drinks the ocean and sneezes out the salt.', 'Seabirds');

  // Puffin: Hollow Bones, Plunge Dive, Waterproof, Salt Gland, Burrowing, and these four
  K(['puffin'],'puf_wingdive','Wingdive','S',0,
    { n:'Fly Underwater', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hidden', dur:1}],
      txt:(P,E)=>`Fly under the surface ${1+P}, and stay Hidden 1.` },
    { n:'Deep Wingbeat', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E},{v:'hidden', dur:(P,E)=>1+h(E), canMove:true},{v:'empower', val:1, uses:1, dur:2}],
      txt:(P,E)=>`Come up anywhere within ${2+E}; Hidden ${1+h(E)} even if you move, and your next hit deals +1.` },
    'The same wings, in a thicker sky.');
  K(['puffin'],'puf_beakful','Beakful','C',0,
    { n:'Catch', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'empower', val:1, uses:1, dur:1},{v:'heal', n:1}],
      txt:(P,E)=>`Melee ${1+P} and heal 1; there is room for more: your next hit this turn deals +1.` },
    { n:'Ten Fish', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'heal', n:(P,E)=>1+E, party:true},{v:'engine', kind:'ap', val:1, dur:1, target:'ally'}],
      txt:(P,E)=>`Share the catch: both heroes heal ${1+E}, and your ally gains 1 AP next turn.` },
    'A spiny tongue holds the first fish while it catches the tenth.');
  K(['puffin'],'puf_cliff','Cliff Launch','S',0,
    { n:'Drop Off', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Drop off the edge and fly ${1+P}, over foes; your next hit this turn deals +1.` },
    { n:'Cliff Top', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>3+E, height:true},{v:'shield', val:1, dur:1, party:true}],
      txt:(P,E)=>`Land on any node within ${3+E}, height included; both heroes hold Shield 1 this round.` },
    'Too heavy to take off from flat ground, so it lives on cliffs.');
  K(['puffin'],'puf_bill','Bright Bill','C',0,
    { n:'Flash', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P)},{v:'mark'}],
      txt:(P,E)=>`Flash your bill at a foe within 3: it is Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'} and Marked (the next hit on it deals +2).` },
    { n:'Breeding Colours', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true},{v:'heal', n:1, target:'ally'}],
      txt:(P,E)=>`Both heroes' next hit deals +${1+E}, and your ally heals 1.` },
    'Orange for the season, then it falls off.');

  // Pelican: Hollow Bones, Plunge Dive, Waterproof, Salt Gland, Big Bill, and these four
  K(['pelican'],'pel_scoop','Pouch Scoop','M',0,
    { n:'Scoop', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Melee ${2+P}, and it is tangled in your pouch: Weakened 1 this round.` },
    { n:'Gulp', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'anchor', who:'foe', dur:(P,E)=>1+h(E)},{v:'heal', n:1}],
      txt:(P,E)=>`Melee ${3+E} and hold it in your pouch: Anchored ${1+h(E)}; heal 1.` },
    'Three gallons of water and whatever was in it.');
  K(['pelican'],'pel_line','Fishing Line','C',0,
    { n:'Line Up', ap:1, el:0, cd:1, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>1+P},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Your ally moves ${1+P}, where you choose, and their next hit deals +1.` },
    { n:'Drive the Shoal', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'link', within:2, dur:2},{v:'force', kind:'pull', n:2},{v:'empower', val:(P,E)=>1+h(E), uses:1, dur:2, party:true}],
      txt:(P,E)=>`Link a foe within 3 to the nearest foe within 2 of it for 2 rounds, then drive it two nodes toward you (the other comes too); both heroes' next hit deals +${1+h(E)}.` },
    'A row of pelicans, beating the water, herding the fish.');
  K(['pelican'],'pel_glide','Long Glide','S',0,
    { n:'Glide', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+h(P), ignoreFoes:true}],
      txt:(P,E)=>`Glide ${2+h(P)}, over foes.` },
    { n:'Wave Ride', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>3+E},{v:'reveal', radius:(P,E)=>2+E, dur:1},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Ride the air over a wave to any node within ${3+E}; see within ${2+E}, and ignore hazards this round.` },
    'An inch above the swell, and never a wingbeat.');
  K(['pelican'],'pel_crash','Pelican Crash','M',0,
    { n:'Crash Down', ap:1, el:0, cd:2, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:2, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>3+P, ifAdjacent:true}],
      txt:(P,E)=>`Crash down up to 2 toward a foe within 3; if you end beside it, melee ${3+P}.` },
    { n:'Belly Flop', ap:2, el:1, cd:3, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>2+E},{v:'force', kind:'push', n:1, area:true, radius:1}],
      txt:(P,E)=>`Land on everything at once: every foe beside you takes ${2+E} and falls back 1.` },
    'Not graceful. Not meant to be.');

  // Blue-footed booby: Hollow Bones, Plunge Dive, Waterproof, Salt Gland, and these five
  K(['booby'],'boo_feet','Blue Feet Dance','C',0,
    { n:'Strut', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'adj'},{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:1}],
      txt:(P,E)=>`Lift each blue foot in turn: foes beside you are Weakened 1, and your next hit this turn deals +${1+h(P)}.` },
    { n:'Sky Point', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true},{v:'heal', n:1, party:true}],
      txt:(P,E)=>`Point your bill at the sky and whistle: both heroes heal 1 and deal +${1+E} on their next hit.` },
    'The bluer the feet, the better the fisher.');
  K(['booby'],'boo_shoal','Shoal Chase','S',0,
    { n:'Chase', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:2, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>2+P, ifAdjacent:true}],
      txt:(P,E)=>`Chase up to 2 toward a foe within 3; if you end beside it, melee ${2+P}.` },
    { n:'Group Dive', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>3+E, dest:'adjTarget'},{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Dive beside a foe within ${3+E} and hit it for ${2+E}; your ally's next hit deals +1.` },
    'Dozens at once, all into the same shoal.');
  K(['booby'],'boo_colony','Colony','T',0,
    { n:'Close Ranks', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`You and an ally beside you hold Shield ${1+P} this round.` },
    { n:'Ten Thousand Eyes', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+E, dur:2, party:true},{v:'reveal', radius:(P,E)=>1+E, dur:1}],
      txt:(P,E)=>`See everything within ${1+E} this round, and both heroes hold Shield ${1+E} for 2 rounds.` },
    'An island white with birds, and every one watching.');
  K(['booby'],'boo_nest','Ground Nest','T',0,
    { n:'Ring of Guano', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'anchor', who:'self', dur:1},{v:'shield', val:(P,E)=>2+h(P), dur:1}],
      txt:(P,E)=>`Sit tight on the nest: Shield ${2+h(P)} this round, and nothing can push or pull you.` },
    { n:'Hold the Nest', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>2+E, next:true, push:1, dur:2},{v:'shield', val:(P,E)=>1+h(E), dur:2}],
      txt:(P,E)=>`Shield ${1+h(E)} for 2 rounds, and Thorns: the next foe to hit you in melee takes ${2+E} and is pushed 1.` },
    'No nest at all: a ring on bare ground, defended.');
  K(['booby'],'boo_charm','Clumsy Charm','C',0,
    { n:'Pratfall', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'weaken', val:(P,E)=>1+h(P), dur:1},{v:'heal', n:1}],
      txt:(P,E)=>`Trip over your own feet: a foe within 3 is Weakened ${1+h(P)} this round, laughing, and you heal 1.` },
    { n:'Disarming', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'weaken', val:(P,E)=>1+h(E), dur:2},{v:'mark'},{v:'link', within:2, dur:2}],
      txt:(P,E)=>`A foe within 3 is Weakened ${1+h(E)} for 2 rounds and Marked, and Linked to the nearest foe within 2 of it for 2 rounds.` },
    'They named it for a fool. It was not the fool.');
  /* ───────────────────────── PERCHING AND BRIGHT BIRDS ─────────────────────────
     raven · parrot · toucan · hummingbird · peacock. Every bird's Hollow Bones. The raven and the parrot share
     Mimicry and Human's Pattern Recognition; the parrot also has Human's Opposable Grip, and Long Life (the koi,
     tortoise and lobster will share it). The toucan carries the shoebill's Big Bill. Display Fan, Alarm Call
     and Spur are the peacock's, and the turkey will share them. */
  const BRIGHT = ['raven','parrot','toucan','hummingbird','peacock'];
  S('raven', { name: 'Raven', lean: 'T/C', branch: 'Perching and bright birds', icon: '🐦‍⬛',
    tagline: 'Clever, playful, never forgets a face. Hunts with wolves and slides down snow for fun.' });
  S('parrot', { name: 'Parrot', lean: 'C/T', branch: 'Perching and bright birds', icon: '🦜',
    tagline: 'Loud, bright, long-lived, and holds its food in one foot while it talks back.' });
  S('toucan', { name: 'Toucan', lean: 'S/C', branch: 'Perching and bright birds', icon: '🐦',
    tagline: 'All bill and bluff. The bill is light as foam and the croak carries a mile.' });
  S('hummingbird', { name: 'Hummingbird', lean: 'S/T', branch: 'Perching and bright birds', icon: '🐦',
    tagline: 'The smallest bird there is, and the fiercest. Hovers, flies backwards, never stops.' });
  S('peacock', { name: 'Peacock', lean: 'C/M', branch: 'Perching and bright birds', icon: '🦚',
    tagline: 'A hundred eyes in its tail and a scream like a cat. Eats snakes.' });
  T.shareTrait('owl_bones', ...BRIGHT);
  T.shareTrait('hum_pattern', 'raven', 'parrot');
  T.shareTrait('hum_grip', 'parrot');
  T.shareTrait('bil_big', 'toucan');

  K(['raven','parrot'],'bir_mimic','Mimicry','C',0,
    { n:'Sound Like', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'decoy', dur:1, here:true},{v:'move', n:(P,E)=>1+P},{v:'empower', val:1, uses:1, dur:2}],
      txt:(P,E)=>`Throw your voice: leave a decoy where you stood for 1 round, move ${1+P}, and your next hit deals +1.` },
    { n:'Its Own Voice', ap:2, el:1, cd:4, dur:0, tgt:'foe_r3',
      fx:[{v:'link', within:1, dur:2},{v:'weaken', val:1, dur:1},{v:'strike', kind:'los', dmg:(P,E)=>E}],
      txt:(P,E)=>`Call in a foe's own voice: Link a foe within 3 to a foe beside it for 2 rounds; it is Weakened 1 this round${E ? ` and takes ${E}, and so does the other` : ''}.` },
    'It says your name better than you do.', 'Perching and bright birds');
  K(['parrot'],'bir_life','Long Life','T',0,
    { n:'Old Bird', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'cleanse'},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Heal ${1+P}, shake off Anchored and Weakened, and hold Shield 1 this round.` },
    { n:'Outlive It', ap:1, el:1, cd:5, dur:3, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>3+2*E, ward:3},{v:'heal', n:1}],
      txt:(P,E)=>`Heal 1, and hold a Heal: if you are downed within 3 rounds, Heal ${3+2*E} (you get up).` },
    'It will outlive the person who bought it, and their children.');
  K(['peacock'],'bir_fan','Display Fan','C',0,
    { n:'Fan Out', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'force', kind:'pull', n:1},{v:'weaken', val:1, dur:1},{v:'shield', val:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Spread the fan: a foe within 3 is drawn 1 toward you and Weakened 1 this round; you hold Shield ${1+h(P)}.` },
    { n:'Shiver the Train', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'force', kind:'pull', n:1, area:true, radius:(P,E)=>2+E},{v:'shield', val:(P,E)=>1+E, dur:1},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Rattle the whole fan: every foe within ${2+E} is drawn 1 toward you; you hold Shield ${1+E} this round, and your ally's next hit deals +1.` },
    'Everyone looks. That is the point.');
  K(['peacock'],'bir_alarm','Alarm Call','T',0,
    { n:'Alarm', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'shield', val:1, dur:1, party:true}],
      txt:(P,E)=>`Raise the alarm: see within ${2+P}, and both heroes hold Shield 1 this round.` },
    { n:'Whole Forest', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'reveal', radius:(P,E)=>1+E, dur:(P,E)=>1+h(E)},{v:'shield', val:(P,E)=>1+E, next:true, party:true}],
      txt:(P,E)=>`Wake the whole forest: see everything within ${1+E} for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}, and Shield: each hero's next hit taken is ${1+E} less.` },
    'The first to see, and the loudest to say so.');
  K(['peacock'],'bir_spur','Spur','M',0,
    { n:'Spur', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Melee ${2+P}, and it is Weakened 1 this round.` },
    { n:'Flying Spurs', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'strike', kind:'melee', dmg:(P,E)=>1+h(E)},{v:'weaken', val:1, dur:2}],
      txt:(P,E)=>`Leap and kick with both feet: melee ${2+E}, then melee ${1+h(E)}; it is Weakened 1 for 2 rounds.` },
    'A blunt horn on the back of each leg.');

  // Raven: Hollow Bones, Mimicry, Pattern Recognition, and these six
  K(['raven'],'rav_cache','Shiny Cache','T',0,
    { n:'Stash', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'ap', val:1, dur:1},{v:'shield', val:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Stash something for later: gain 1 AP next turn, and hold Shield ${1+h(P)} this round.` },
    { n:'Dig It Up', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'draw', face:'T', val:1},{v:'reroll', n:(P,E)=>1+h(E)},{v:'heal', n:1}],
      txt:(P,E)=>`Draw a Time die from your pool, reroll up to ${1+h(E)} banked dice, and heal 1.` },
    'A hundred hiding places, and it remembers every one.');
  K(['raven'],'rav_mob','Mob','C',0,
    { n:'Harry', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>1+P},{v:'weaken', val:1, dur:1},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Harry a foe within 2: it takes ${1+P} and is Weakened 1 this round, and your ally's next hit deals +1.` },
    { n:'Call the Mob', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'mark'},{v:'mark', n:(P,E)=>1+h(E), dur:3},{v:'empower', val:(P,E)=>1+h(E), uses:1, dur:2, party:true}],
      txt:(P,E)=>`Point the mob at a foe within 3: it is Marked (+2 to the next hit, +${1+h(E)} to every hit for 3 rounds), and both heroes' next hit deals +${1+h(E)}.` },
    'Every raven in the valley, at the owl, at once.');
  K(['raven'],'rav_carrion','Carrion Wing','S',0,
    { n:'Circle Down', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true},{v:'reveal', radius:1, dur:1}],
      txt:(P,E)=>`Circle down ${1+P}, over foes, and see everything beside where you land.` },
    { n:'Pick the Weak', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, dest:'adjTarget'},{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'execute', threshold:(P,E)=>1+E}],
      txt:(P,E)=>`Drop beside a foe within ${2+E} and peck it for ${2+E}; if that leaves it at ${1+E} hp or less, it falls.` },
    'It knows a fight is coming before the fighters do.');
  K(['raven'],'rav_memory','Raven Memory','T',0,
    { n:'I Know You', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'reveal', target:true, dur:(P,E)=>2+P},{v:'mark'}],
      txt:(P,E)=>`Remember a foe within 3: Revealed for ${2+P} rounds and is Marked (the next hit on it deals +2).` },
    { n:'Old Grudge', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:3},{v:'mark', n:(P,E)=>1+E, dur:3},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Name any foe: Revealed for 3 rounds, it is Marked +${1+E} for 3 rounds, and Shield: the next hit on you is 1 less.` },
    'It remembers a face for years, and tells its children.');
  K(['raven'],'rav_wolf','Wolf Guide','C',0,
    { n:'This Way', ap:1, el:0, cd:1, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>1+P},{v:'reveal', radius:2, dur:1}],
      txt:(P,E)=>`Call your ally on: they move ${1+P} where you choose, and you see within 2.` },
    { n:'Lead the Hunt', ap:1, el:1, cd:4, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:2},{v:'mark'},{v:'empower', val:(P,E)=>2+E, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Lead your ally to any foe: Revealed for 2 rounds and is Marked, and your ally's next hit deals +${2+E}.` },
    'It finds the meal; the wolves open it.');
  K(['raven'],'rav_snow','Snow Slide','S',0,
    { n:'Slide', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'heal', n:1}],
      txt:(P,E)=>`Slide ${1+P} for the fun of it, and heal 1.` },
    { n:'Roll Down', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E, ignoreFoes:true},{v:'cleanse'},{v:'empower', val:(P,E)=>1+h(E), uses:1, dur:2}],
      txt:(P,E)=>`Roll ${2+E} down the slope, past foes; shake off Anchored and Weakened, and your next hit deals +${1+h(E)}.` },
    'Down the roof on its back, then up to do it again.');

  // Parrot: Hollow Bones, Mimicry, Pattern Recognition, Opposable Grip, Long Life, and these four
  K(['parrot'],'par_crack','Beak Crack','M',0,
    { n:'Crack', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'stripShield', amount:1},{v:'strike', kind:'melee', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`Peel 1 Shield off a foe beside you, then melee ${2+P}.` },
    { n:'Nutcracker', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E, pierce:true},{v:'mark', n:(P,E)=>1+h(E), pierce:true}],
      txt:(P,E)=>`Melee ${3+E} that ignores Shield, and open a weak point: its next hit taken deals +${1+h(E)}.` },
    'It opens nuts a hammer would bounce off.');
  K(['parrot'],'par_chatter','Flock Chatter','C',0,
    { n:'Chatter', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:2, target:'ally'},{v:'heal', n:1, target:'ally'}],
      txt:(P,E)=>`Keep up the chatter: your ally heals 1 and their next hit deals +${1+h(P)}.` },
    { n:'Roost Roar', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'empower', val:1, uses:99, dur:2, party:true},{v:'engine', kind:'ap', val:(P,E)=>1+h(E), dur:1, target:'ally'}],
      txt:(P,E)=>`The whole roost at dusk: both heroes' hits deal +1 for 2 rounds, and your ally gains ${1+h(E)} AP next turn.` },
    'Noise is how the flock knows it is a flock.');
  K(['parrot'],'par_colours','Bright Colours','C',0,
    { n:'Flash Wings', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'weaken', val:(P,E)=>1+h(P), dur:1},{v:'mark'}],
      txt:(P,E)=>`Flash red and blue at a foe within 2: Weakened ${1+h(P)} this round and Marked (the next hit on it deals +2).` },
    { n:'Rainbow', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'decoy', dur:(P,E)=>1+E, here:true},{v:'hidden', dur:1, canMove:true},{v:'heal', n:1}],
      txt:(P,E)=>`Leave a flash of colour as a decoy for ${1+E} rounds and vanish into the leaves: Hidden 1, even if you move; heal 1.` },
    'In the canopy, bright is the best hiding.');
  K(['parrot'],'par_clay','Clay Lick','T',0,
    { n:'Lick', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:1},{v:'heal', n:(P,E)=>1+P}],
      txt:(P,E)=>`Eat the bank's clay: heal ${1+P}, and Cleanse, and you can't be Weakened or Anchored by a foe this round.` },
    { n:'Settle the Stomach', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'cleanse', party:true, ward:2},{v:'heal', n:(P,E)=>1+E, party:true}],
      txt:(P,E)=>`Both heroes shake off Anchored and Weakened and heal ${1+E}; Cleanse, and you can't be Weakened or Anchored by a foe for 2 rounds.` },
    'Clay first, then the bitter seeds.');

  // Toucan: Hollow Bones, Big Bill, and these seven
  K(['toucan'],'tou_bluff','Bright Bluff','C',0,
    { n:'Bluff', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'weaken', val:(P,E)=>1+h(P), dur:1},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Wave the bill at a foe within 2: it backs off 1 and is Weakened ${1+h(P)} this round.` },
    { n:'All Bill', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:2, area:'adj'},{v:'force', kind:'push', n:1, area:true, radius:(P,E)=>1+h(E)},{v:'shield', val:(P,E)=>1+E, dur:1}],
      txt:(P,E)=>`Every foe within ${1+h(E)} falls back 1; foes beside you are Weakened 1 for 2 rounds, and you hold Shield ${1+E} this round.` },
    'It looks dangerous. It is mostly air.');
  K(['toucan'],'tou_toss','Fruit Toss','C',0,
    { n:'Toss', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>1+P},{v:'heal', n:1, target:'ally'}],
      txt:(P,E)=>`Toss fruit: a foe within 3 takes ${1+P}, and your ally catches the next one and heals 1.` },
    { n:'Catch!', ap:0, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'heal', n:(P,E)=>1+E, target:'ally'},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Throw your ally a fruit: they heal ${1+E}, and their next hit deals +1.` },
    'Up, back, open, gone.');
  K(['toucan'],'tou_hop','Canopy Hop','S',0,
    { n:'Hop', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P}],
      txt:(P,E)=>`Hop onto any node within ${1+P}, height included.` },
    { n:'Branch to Branch', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, height:true},{v:'empower', val:1, uses:1, dur:1},{v:'reveal', radius:2, dur:1}],
      txt:(P,E)=>`Hop to any node within ${2+E}, height included; see within 2, and your next hit this turn deals +1.` },
    'It hops more than it flies.');
  K(['toucan'],'tou_cool','Bill Cool','T',0,
    { n:'Shed Heat', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Shed heat through your bill: heal ${1+P}, and hazards can't touch you this round.` },
    { n:'Radiator', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E},{v:'hazardImmune', dur:2},{v:'shield', val:1, dur:2}],
      txt:(P,E)=>`Heal 1 at the start of each turn for ${2+E} rounds; ignore hazards and hold Shield 1 for 2 rounds.` },
    'The bill is a radiator, and the toucan the engine.');
  K(['toucan'],'tou_raid','Nest Raider','M',0,
    { n:'Raid', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+P},{v:'stripShield', amount:1}],
      txt:(P,E)=>`Reach into cover: a foe within 2 takes ${2+P} and loses 1 Shield.` },
    { n:'Snatch the Egg', ap:1, el:1, cd:3, dur:0, tgt:'node_r2',
      fx:[{v:'interact', range:2},{v:'heal', n:1},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`Work an objective up to 2 away (not one up on a ledge); heal 1, and your next hit deals +${1+E}.` },
    'The long bill reaches into holes nothing else can.');
  K(['toucan'],'tou_fold','Fold Sleep','T',0,
    { n:'Tuck In', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1},{v:'hidden', dur:1}],
      txt:(P,E)=>`Tuck bill under wing and tail over head: Shield ${1+P}, and Hidden 1.` },
    { n:'Ball of Feathers', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>2+E},{v:'shield', val:2, dur:1},{v:'hidden', dur:1}],
      txt:(P,E)=>`Fold into a ball: heal ${2+E}, Shield 2 this round, and Hidden 1.` },
    'Folded, it is a feathered ball with no bill at all.');
  K(['toucan'],'tou_croak','Loud Croak','C',0,
    { n:'Croak', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'mark', nearest:true}],
      txt:(P,E)=>`Croak across the canopy: see within ${2+P}, and Mark the nearest foe (the next hit on it deals +2).` },
    { n:'Chorus', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true},{v:'weaken', val:1, dur:1, area:'adj'}],
      txt:(P,E)=>`Croak together: both heroes' next hit deals +${1+E}, and foes beside you are Weakened 1 this round.` },
    'A frog’s voice in a bird’s throat.');

  // Hummingbird: Hollow Bones, and these eight
  K(['hummingbird'],'hmb_hover','Hover','S',0,
    { n:'Hold Still', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hazardImmune', dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Dart ${1+P} and hang in the air: hazards can't touch you this round, and your next hit this turn deals +1.` },
    { n:'Hang in the Air', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hover', dur:(P,E)=>1+E},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Hover for ${1+E} rounds: hazards and Fields don't touch you, and nothing pushes or pulls you, and mint 1 AP each turn; Shield 1 this round.` },
    'Wings in a figure eight, and it does not move an inch.');
  K(['hummingbird'],'hmb_beats','Thousand Beats','T',0,
    { n:'Blur', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'ap', val:1, dur:1},{v:'shield', val:(P,E)=>1+h(P), next:true}],
      txt:(P,E)=>`Wings to a blur: gain 1 AP next turn, and Shield: the next hit on you is ${1+h(P)} less.` },
    { n:'Overdrive', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'mint', face:'AP', n:(P,E)=>h(E)},{v:'haste', n:1}],
      txt:(P,E)=>`${E>=2?`Gain ${h(E)} AP to spend this turn, and your`:'Your'} track slides 1 extra (Haste 1).` },
    'Seventy beats a second, all day.');
  K(['hummingbird'],'hmb_torpor','Night Torpor','T',0,
    { n:'Slow Down', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>2+P},{v:'rest'}],
      txt:(P,E)=>`Heal ${2+P} and go still (no further actions with this hero this turn).` },
    { n:'Deep Torpor', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:(P,E)=>1+h(E), dur:2},{v:'shield', val:(P,E)=>1+E, dur:1},{v:'hidden', dur:1}],
      txt:(P,E)=>`Go cold and still: heal ${1+h(E)} at the start of each turn for 2 rounds, Shield ${1+E} this round, and Hidden 1.` },
    'At night its heart slows from a thousand beats to fifty.');
  K(['hummingbird'],'hmb_needle','Needle Bill','M',0,
    { n:'Needle', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P, pierce:true}],
      txt:(P,E)=>`Melee ${1+P} that ignores Shield.` },
    { n:'Stab and Stab', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+E, pierce:true},{v:'strike', kind:'melee', dmg:(P,E)=>1+E, pierce:true},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Melee ${1+E} twice, each ignoring Shield; it is Weakened 1 this round.` },
    'A bill made for flowers, used on rivals.');
  K(['hummingbird'],'hmb_back','Backward Flight','S',0,
    { n:'Back Off', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Fly ${1+P} backwards out of reach, past foes, and hold Shield 1 this round.` },
    { n:'Hit and Back', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'force', kind:'push', n:(P,E)=>1+h(E)},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Melee ${2+E} and back away: it is pushed ${1+h(E)}, and Shield: the next hit on you is 1 less.` },
    'The only bird that flies backwards.');
  K(['hummingbird'],'hmb_nectar','Nectar Rush','C',0,
    { n:'Sip', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Sip nectar: heal ${1+P}, and your next hit this turn deals +1.` },
    { n:'Sugar High', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'draw', face:'C', val:1},{v:'heal', n:1},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`Draw a Charge die from your pool, heal 1, and your next hit deals +${1+E}.` },
    'Half its weight in sugar every day.');
  K(['hummingbird'],'hmb_fury','Tiny Fury','M',0,
    { n:'Dive Bomb', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:2, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>2+P, ifAdjacent:true}],
      txt:(P,E)=>`Dive up to 2 toward a foe within 3; if you end beside it, melee ${2+P}.` },
    { n:'Chase It Off', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'force', kind:'push', n:2},{v:'weaken', val:(P,E)=>1+h(E), dur:2}],
      txt:(P,E)=>`Melee ${2+E} and chase it off: push 2, and it is Weakened ${1+h(E)} for 2 rounds.` },
    'It chases hawks. The hawks leave.');
  K(['hummingbird'],'hmb_memory','Flower Memory','T',0,
    { n:'Route', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reroll', n:(P,E)=>1+h(P)},{v:'reveal', radius:2, dur:1}],
      txt:(P,E)=>`Remember the route: reroll up to ${1+h(P)} banked dice, and see within 2.` },
    { n:'Every Flower', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'reveal', radius:(P,E)=>1+E, dur:1},{v:'haste', n:1},{v:'haste', n:1, who:'ally'}],
      txt:(P,E)=>`Remember every flower on the board: see everything within ${1+E} this round, and Haste: both heroes' tracks slide 1 extra.` },
    'Which flowers, and when they refill, to the minute.');

  // Peacock: Hollow Bones, Display Fan, Alarm Call, Spur, and these five
  K(['peacock'],'pea_eyes','Hundred Eyes','C',0,
    { n:'Stare', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P)},{v:'strike', kind:'los', dmg:1}],
      txt:(P,E)=>`A hundred eyes on one foe within 3: it takes 1 and is Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}.` },
    { n:'All Eyes', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:2, area:'adj'},{v:'reveal', radius:(P,E)=>2+E, dur:1},{v:'empower', val:(P,E)=>1+h(E), uses:1, dur:2, party:true}],
      txt:(P,E)=>`Every eye open: see within ${2+E}, foes beside you are Weakened 1 for 2 rounds, and both heroes' next hit deals +${1+h(E)}.` },
    'Every eye is looking at you.');
  K(['peacock'],'pea_sweep','Train Sweep','M',0,
    { n:'Sweep', ap:1, el:0, cd:1, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Swing the train: every foe beside you takes ${1+h(P)}.` },
    { n:'Great Sweep', ap:0, el:1, cd:3, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>1+E},{v:'force', kind:'push', n:1, area:true, radius:1}],
      txt:(P,E)=>`Every foe beside you takes ${1+E} and is swept back 1.` },
    'Six feet of tail, and it is heavier than it looks.');
  K(['peacock'],'pea_snake','Snake Eater','M',0,
    { n:'Peck', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'cleanse', ward:1},{v:'strike', kind:'melee', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`Melee ${2+P}; Cleanse, and you can't be Weakened or Anchored by a foe this round.` },
    { n:'Venom Proof', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'cleanse', ward:2},{v:'strike', kind:'melee', dmg:(P,E)=>3+E}],
      txt:(P,E)=>`Melee ${3+E}, shake off Anchored and Weakened, and Cleanse, and you can't be Weakened or Anchored by a foe for 2 rounds.` },
    'It eats cobras, and shrugs off the bite.');
  K(['peacock'],'pea_roost','Jungle Roost','S',0,
    { n:'Flap Up', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Flap up onto any node within ${1+P}, height included, and hold Shield 1 this round.` },
    { n:'High Roost', ap:1, el:1, cd:4, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+E},{v:'heal', n:(P,E)=>1+E},{v:'engine', kind:'regen', val:1, dur:2}],
      txt:(P,E)=>`Roost on any node within ${1+E}, height included: heal ${1+E} now, and 1 at the start of each turn for 2 rounds.` },
    'High up, out of reach, all night.');
  K(['peacock'],'pea_iris','Iridescence','C',0,
    { n:'Shimmer', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, next:true},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Shimmer from blue to green: Shield: the next hit on you is ${1+P} less, and your next hit this turn deals +1.` },
    { n:'Shift the Light', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'decoy', dur:(P,E)=>1+E, here:true},{v:'move', n:2},{v:'hidden', dur:1}],
      txt:(P,E)=>`Leave your shimmer behind as a decoy for ${1+E} rounds, move 2, and stay Hidden 1.` },
    'No pigment at all: just the light, bent.');
  /* ───────────────────────── GROUND BIRDS ─────────────────────────
     ostrich · wild turkey. Every bird's Hollow Bones; Ground Sprint is both of theirs. The turkey shares the
     peacock's Display Fan, Alarm Call and Spur. The ostrich carries the hoofed animals' Kick and Wide Eyes:
     not kin, but the same answer to the same open plain (a variant). */
  S('ostrich', { name: 'Ostrich', lean: 'S/M', branch: 'Ground birds', variant: true, icon: '🐦',
    tagline: 'The biggest bird alive. Cannot fly, does not need to. Outruns horses, kicks like one.' });
  S('turkey', { name: 'Wild Turkey', lean: 'C/T', branch: 'Ground birds', icon: '🦃',
    tagline: 'Wary, fast on foot, roosts high. Gobbles at thunder.' });
  T.shareTrait('owl_bones', 'ostrich', 'turkey');
  T.shareTrait('hoof_kick', 'ostrich');
  T.shareTrait('hoof_eyes', 'ostrich');
  T.shareTrait('bir_fan', 'turkey');
  T.shareTrait('bir_alarm', 'turkey');
  T.shareTrait('bir_spur', 'turkey');

  K(['ostrich','turkey'],'gbd_sprint','Ground Sprint','S',0,
    { n:'Dash', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+h(P)},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Run ${2+h(P)}; your next hit this turn deals +1.` },
    { n:'Flat Out', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E, ignoreFoes:true},{v:'haste', n:(P,E)=>1+h(E)},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Run ${2+E}, past foes; Haste: your track slides ${1+h(E)} extra, and your next hit this turn deals +1.` },
    'Legs, and nothing but legs.', 'Ground birds');

  // Ostrich: Hollow Bones, Ground Sprint, Kick, Wide Eyes, and these five
  K(['ostrich'],'ost_stride','Stride','S',0,
    { n:'Five Metres', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true},{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:1}],
      txt:(P,E)=>`Stride ${1+P}, over foes; your next hit this turn deals +${1+h(P)}.` },
    { n:'Top Gear', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>3+E, ignoreFoes:true},{v:'hazardImmune', dur:1},{v:'shield', val:1, next:true},{v:'empower', val:(P,E)=>1+h(E), uses:1, dur:1}],
      txt:(P,E)=>`Stride ${3+E}, over foes and hazards; Shield: the next hit on you is 1 less, and your next hit this turn deals +${1+h(E)}.` },
    'Five metres a step, and two toes to land on.');
  K(['ostrich'],'ost_head','Head Low','T',0,
    { n:'Head Down', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'shield', val:(P,E)=>1+P, dur:1}],
      txt:(P,E)=>`Lie flat with your neck along the ground: Hidden 1, and Shield ${1+P} this round.` },
    { n:'Just a Bush', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+h(E)},{v:'heal', n:(P,E)=>1+E},{v:'empower', val:(P,E)=>1+E, uses:1, dur:3}],
      txt:(P,E)=>`From far off you are only a bush: Hidden ${1+h(E)}, heal ${1+E}, and your next hit within 3 rounds deals +${1+E}.` },
    'It does not bury its head. It lies very, very flat.');
  K(['ostrich'],'ost_wing','Wing Fan','C',0,
    { n:'Flare', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'adj'},{v:'shield', val:(P,E)=>1+h(P), dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`Flare your wings: foes beside you are Weakened 1, and you and an ally beside you hold Shield ${1+h(P)} this round.` },
    { n:'Distraction', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'decoy', dur:(P,E)=>1+E, here:true},{v:'move', n:2},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Flap and stagger as if hurt, leaving a decoy for ${1+E} rounds; move 2, and both heroes' next hit deals +1.` },
    'Wings it cannot fly with, put to every other use.');
  K(['ostrich'],'ost_gizzard','Stone Gizzard','M',0,
    { n:'Swallow Stones', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'anchor', who:'self', dur:1}],
      txt:(P,E)=>`Swallow a few stones: heal ${1+P}, and you are too heavy to push or pull this round.` },
    { n:'Grind', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:2},{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E}],
      txt:(P,E)=>`Heal 1 at the start of each turn for ${2+E} rounds, and Cleanse, and you can't be Weakened or Anchored by a foe for 2 rounds.` },
    'A kilo of pebbles inside, grinding.');
  K(['ostrich'],'ost_nest','Nest Ring','T',0,
    { n:'Guard the Ring', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1, party:true, allyRange:1},{v:'thorns', val:(P,E)=>1+h(P), next:true, dur:1}],
      txt:(P,E)=>`You and an ally beside you hold Shield ${1+P} this round, and Thorns: the first foe to hit you in melee takes ${1+h(P)}.` },
    { n:'Shared Nest', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+E, dur:2, party:true},{v:'heal', n:1, party:true},{v:'thorns', val:2, next:true, push:1, dur:2}],
      txt:(P,E)=>`Both heroes hold Shield ${1+E} for 2 rounds and heal 1; Thorns: the next foe to hit you in melee takes 2 and is pushed 1.` },
    'Many hens lay in one nest, and the pair guard all of it.');

  // Wild turkey: Hollow Bones, Display Fan, Alarm Call, Spur, Ground Sprint, and these four
  K(['turkey'],'tur_gobble','Gobble','C',0,
    { n:'Gobble', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'empower', val:1, uses:1, dur:2, target:'ally'},{v:'mark', nearest:true}],
      txt:(P,E)=>`Gobble at everything: see within ${2+P}, Mark the nearest foe, and your ally's next hit deals +1.` },
    { n:'Shock Gobble', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:2, area:'adj'},{v:'force', kind:'push', n:1, area:true, radius:1},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`Gobble like thunder: every foe beside you falls back 1 and is Weakened 1 for 2 rounds; your next hit deals +${1+E}.` },
    'It gobbles at owls, at thunder, at slammed doors.');
  K(['turkey'],'tur_watch','Flock Watch','T',0,
    { n:'Heads Up', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+h(P), next:true, party:true},{v:'reveal', radius:2, dur:1}],
      txt:(P,E)=>`See within 2; Shield: each hero's next hit taken is ${1+h(P)} less.` },
    { n:'Sentinels', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'reveal', radius:(P,E)=>1+E, dur:2},{v:'shield', val:(P,E)=>1+E, dur:1, party:true},{v:'shield', val:1, next:true, party:true}],
      txt:(P,E)=>`Someone always has their head up: see everything within ${1+E} for 2 rounds; both heroes hold Shield ${1+E} this round, and Shield 1 more against the next hit.` },
    'One feeds while another looks.');
  K(['turkey'],'tur_roost','Roost Flight','S',0,
    { n:'Flush', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Burst up onto any node within ${1+P}, height included; Shield: the next hit on you is 1 less.` },
    { n:'Up for the Night', ap:1, el:1, cd:4, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, height:true},{v:'heal', n:(P,E)=>1+E},{v:'hidden', dur:1}],
      txt:(P,E)=>`Fly up to any node within ${2+E}, height included; heal ${1+E}, and Hidden 1.` },
    'It runs from most things, and flies from the rest.');
  K(['turkey'],'tur_wattle','Wattle Flush','C',0,
    { n:'Go Red', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'weaken', val:(P,E)=>1+h(P), dur:1},{v:'strike', kind:'los', dmg:(P,E)=>1+P}],
      txt:(P,E)=>`Flush red, white and blue at a foe within 2: it takes ${1+P} and is Weakened ${1+h(P)} this round.` },
    { n:'Full Colour', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true},{v:'cleanse', party:true}],
      txt:(P,E)=>`Go full colour: both heroes shake off Anchored and Weakened, and their next hit deals +${1+E}.` },
    'Its head changes colour with its mood.');
  /* ───────────────────────── LIZARDS ─────────────────────────
     gecko · chameleon · basilisk · horned lizard. The gecko's Tail Autotomy and Scaled Hide are every lizard's,
     and its Solar Basking every reptile's (the crocodile and the tortoise will share it). */
  T.SPECIES.gecko.branch = 'Lizards';
  S('chameleon', { name: 'Chameleon', lean: 'T/C', branch: 'Lizards', icon: '🦎',
    tagline: 'Two eyes that look two ways, a tongue longer than its body, and every colour it likes.' });
  S('basilisk', { name: 'Basilisk', lean: 'S/M', branch: 'Lizards', icon: '🦎',
    tagline: 'Runs on two legs, and across water, faster than it can sink.' });
  S('horned_lizard', { name: 'Horned Lizard', lean: 'M/T', branch: 'Lizards', icon: '🦎',
    tagline: 'A flat spiked crown, sand-coloured, and blood it can squirt from its eyes.' });
  T.shareTrait('gec_autotomy', 'chameleon', 'basilisk', 'horned_lizard');
  T.shareTrait('gec_hide', 'chameleon', 'basilisk', 'horned_lizard');
  T.shareTrait('gec_basking', 'chameleon', 'basilisk', 'horned_lizard');

  // Chameleon: Tail Autotomy, Scaled Hide, Solar Basking, and these six
  K(['chameleon'],'cha_turret','Turret Eyes','T',0,
    { n:'Two Ways', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'shield', val:1, next:true},{v:'mark', nearest:true}],
      txt:(P,E)=>`One eye forward, one back: see within ${2+P}, Mark the nearest foe, and Shield: the next hit on you is 1 less.` },
    { n:'Lock Both Eyes', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:3},{v:'mark', n:(P,E)=>1+E, dur:3},{v:'reveal', radius:2, dur:1}],
      txt:(P,E)=>`Swing both eyes onto any foe: Revealed for 3 rounds, it is Marked +${1+E} for 3 rounds, and you see within 2.` },
    'Each eye on its own turret, each turret on its own errand.');
  K(['chameleon'],'cha_colour','Colour Shift','C',0,
    { n:'Fade', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'shield', val:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Shift to the colour behind you: Hidden 1, and Shield ${1+h(P)} this round.` },
    { n:'Flash Colours', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+h(E), canMove:true},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2},{v:'weaken', val:1, dur:1, area:'adj'}],
      txt:(P,E)=>`Flare dark, then vanish: foes beside you are Weakened 1; Hidden ${1+h(E)} even if you move, and your next hit deals +${1+E}.` },
    'Not for hiding, mostly: for talking.');
  K(['chameleon'],'cha_tongue','Ballistic Tongue','M',2,
    { n:'Tongue', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>1+P},{v:'force', kind:'pull', n:1}],
      txt:(P,E)=>`Shoot your tongue at a foe within 3: it takes ${1+P} and is reeled 1 toward you.` },
    { n:'Reel In', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'force', kind:'pull', n:2},{v:'strike', kind:'melee', dmg:(P,E)=>2+E, ifAdjacent:true},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Reel a foe within 3 two nodes toward you; if it arrives beside you, melee ${2+E}, and it is Anchored 1.` },
    'Out and back in a twentieth of a second.');
  K(['chameleon'],'cha_grip','Grip Feet','S',0,
    { n:'Grip', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'anchor', who:'self', dur:1}],
      txt:(P,E)=>`Climb onto any node within ${1+P}, height included, and grip: nothing can push or pull you this round.` },
    { n:'Branch Hold', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:2},{v:'anchor', who:'self', dur:2},{v:'shield', val:(P,E)=>1+E, dur:2}],
      txt:(P,E)=>`Hold on with all four feet and the tail: Shield ${1+E} for 2 rounds; Cleanse, and nothing can push or pull you, Weaken you or Anchor you for 2 rounds.` },
    'Feet like tongs, and a tail that holds on by itself.');
  K(['chameleon'],'cha_sway','Slow Sway','T',0,
    { n:'Sway', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hidden', dur:1, canMove:true}],
      txt:(P,E)=>`Rock like a leaf in the wind: move ${1+P}, Hidden 1.` },
    { n:'Leaf in the Wind', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+E, canMove:true},{v:'reroll', n:1}],
      txt:(P,E)=>`Hidden ${1+E} even if you move, and reroll 1 banked die.` },
    'Two steps forward, one back, like a leaf.');
  K(['chameleon'],'cha_casque','Casque','M',0,
    { n:'Head Butt', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Butt with your helmet: melee ${2+P}, and push it 1.` },
    { n:'Helmet Up', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+E, dur:1},{v:'thorns', val:(P,E)=>1+E, next:true, push:1, dur:2}],
      txt:(P,E)=>`Shield ${2+E} this round, and Thorns: the next foe to hit you in melee takes ${1+E} and is pushed 1.` },
    'A helmet of bone on top of its head.');

  // Basilisk: Tail Autotomy, Scaled Hide, Solar Basking, and these six
  K(['basilisk'],'bas_water','Water Run','S',2,
    { n:'Skitter', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Run ${1+P}, across water and hazards: they can't touch you this round.` },
    { n:'Walk on Water', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>3+E, ignoreFoes:true},{v:'hazardImmune', dur:2},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Run ${3+E} across anything, past foes; ignore hazards for 2 rounds, and your next hit this turn deals +1.` },
    'Too fast to sink, for about four metres.');
  K(['basilisk'],'bas_crest','Crest Flare','C',0,
    { n:'Flare', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'weaken', val:(P,E)=>1+h(P), dur:1},{v:'mark'}],
      txt:(P,E)=>`Raise your crest at a foe within 2: Weakened ${1+h(P)} this round, and Marked (the next hit on it deals +2).` },
    { n:'Full Sail', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true},{v:'weaken', val:1, dur:1, area:'adj'}],
      txt:(P,E)=>`Raise every crest: both heroes' next hit deals +${1+E}, and foes beside you are Weakened 1 this round.` },
    'Three sails: head, back and tail.');
  K(['basilisk'],'bas_dive','Dive','S',0,
    { n:'Plop', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hidden', dur:1},{v:'heal', n:1}],
      txt:(P,E)=>`Drop into the water ${1+P} away: Hidden 1, and heal 1.` },
    { n:'Stay Under', ap:1, el:1, cd:4, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E},{v:'hidden', dur:(P,E)=>1+h(E)},{v:'heal', n:(P,E)=>1+E}],
      txt:(P,E)=>`Come up anywhere within ${2+E}; Hidden ${1+h(E)}, and heal ${1+E}.` },
    'Half an hour on one breath.');
  K(['basilisk'],'bas_sprint','Lizard Sprint','S',0,
    { n:'Sprint', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P}],
      txt:(P,E)=>`Sprint ${1+P}.` },
    { n:'Burst', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:3, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>2+E, ifAdjacent:true},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Burst up to 3 toward a foe within 3; if you end beside it, melee ${2+E}; your next hit this turn deals +1.` },
    'Zero to top speed in one step.');
  K(['basilisk'],'bas_two','Two-Legged','M',0,
    { n:'Rear Up', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Rear up and claw: melee ${2+P}, and Shield: the next hit on you is 1 less.` },
    { n:'Run Them Down', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'force', kind:'push', n:1},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Melee ${3+E}, push it 1, and take one free step.` },
    'Up on the back legs, tail out behind.');
  K(['basilisk'],'bas_drop','Branch Drop','T',0,
    { n:'Let Go', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true},{v:'hazardImmune', dur:1},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Let go of the branch: drop ${1+P}, over foes and hazards, and hold Shield 1 this round.` },
    { n:'Drop and Run', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E},{v:'hazardImmune', dur:1},{v:'engine', kind:'ap', val:1, dur:1}],
      txt:(P,E)=>`Drop to any node within ${2+E}, landing running: ignore hazards this round, and gain 1 AP next turn.` },
    'Off the branch, into the river, across it, gone.');

  // Horned lizard: Tail Autotomy, Scaled Hide, Solar Basking, and these six
  K(['horned_lizard'],'hor_squirt','Blood Squirt','C',2,
    { n:'Squirt', ap:1, el:0, cd:2, dur:0, tgt:'foe_r2',
      fx:[{v:'weaken', val:(P,E)=>1+P, dur:1},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Squirt blood from your eye at a foe within 2: it reels back 1 and is Weakened ${1+P} this round.` },
    { n:'Foul Taste', ap:0, el:1, cd:4, dur:0, tgt:'foe_r2',
      fx:[{v:'weaken', val:(P,E)=>1+h(E), dur:2},{v:'wound', n:2, kind:'foul'},{v:'force', kind:'push', n:2}],
      txt:(P,E)=>`Squirt foul blood at a foe within 2: it reels back 2, is Weakened ${1+h(E)} for 2 rounds, and is Wounded 2.` },
    'A metre of blood, from the eye, and it tastes terrible.');
  K(['horned_lizard'],'hor_crown','Spiked Crown','M',0,
    { n:'Horns', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'thorns', val:1, dur:1}],
      txt:(P,E)=>`Melee ${2+P}; for this round, anything that hits you in melee takes 1.` },
    { n:'Unswallowable', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>1+E, dur:2},{v:'shield', val:(P,E)=>1+h(E), dur:2}],
      txt:(P,E)=>`Raise every spike: for 2 rounds you hold Shield ${1+h(E)}, and anything that hits you in melee takes ${1+E}.` },
    'Snakes that swallow one sometimes die of it.');
  K(['horned_lizard'],'hor_shimmy','Sand Shimmy','T',0,
    { n:'Shimmy', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'shield', val:(P,E)=>1+P, dur:1}],
      txt:(P,E)=>`Shimmy into the sand: Hidden 1, and Shield ${1+P} this round.` },
    { n:'Under the Sand', ap:1, el:1, cd:4, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>1+E},{v:'hidden', dur:(P,E)=>1+h(E)},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Wriggle to a node within ${1+E} under the sand: Hidden ${1+h(E)}, and ignore hazards for 2 rounds.` },
    'A shuffle of the ribs, and only the eyes show.');
  K(['horned_lizard'],'hor_ants','Ant Feast','T',0,
    { n:'Lick Up', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'engine', kind:'ap', val:1, dur:1}],
      txt:(P,E)=>`Eat ants by the hundred: heal ${1+P}, and gain 1 AP next turn.` },
    { n:'Whole Nest', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:2},{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E}],
      txt:(P,E)=>`Heal 1 at the start of each turn for ${2+E} rounds; the stings don't bother you: Cleanse, and you can't be Weakened or Anchored by a foe for 2 rounds.` },
    'Harvester ants, thousands a day, venom and all.');
  K(['horned_lizard'],'hor_flat','Flatten','T',0,
    { n:'Flatten', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+h(P), dur:1},{v:'anchor', who:'self', dur:1}],
      txt:(P,E)=>`Press flat to the ground: Shield ${2+h(P)} this round, and nothing can push or pull you.` },
    { n:'No Shadow', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:1, party:true, radius:1},{v:'shield', val:(P,E)=>1+E, dur:1, party:true}],
      txt:(P,E)=>`So flat you cast no shadow: you and an ally beside you are Hidden 1, and both heroes hold Shield ${1+E} this round.` },
    'Flat as a pancake, edges fringed so it casts no shadow.');
  K(['horned_lizard'],'hor_puff','Puff Up','M',0,
    { n:'Puff', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1},{v:'weaken', val:1, dur:1, area:'adj'}],
      txt:(P,E)=>`Gulp air and swell: Shield ${1+P} this round, and foes beside you are Weakened 1.` },
    { n:'Too Big to Bite', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+E, dur:1},{v:'force', kind:'push', n:1, area:true, radius:1},{v:'empower', val:1, uses:1, dur:2}],
      txt:(P,E)=>`Swell to twice your size: Shield ${2+E} this round, every foe beside you is shoved back 1, and your next hit deals +1.` },
    'Twice the size, all of a sudden, and all spikes.');
  /* ───────────────────────── CROCODILES AND TORTOISES ─────────────────────────
     crocodile · tortoise. Both carry the gecko's Solar Basking (every reptile's), and Armoured Hide and Slow
     Heart. The tortoise carries the parrot's Long Life. */
  S('crocodile', { name: 'Crocodile', lean: 'M/T', branch: 'Crocodiles and tortoises', icon: '🐊',
    tagline: 'Two hundred million years of waiting under the surface. Then the roll.' });
  S('tortoise', { name: 'Giant Tortoise', lean: 'T/M', branch: 'Crocodiles and tortoises', icon: '🐢',
    tagline: 'Slow, steady, and older than anyone it meets. Its house goes where it goes.' });
  T.shareTrait('gec_basking', 'crocodile', 'tortoise');
  T.shareTrait('bir_life', 'tortoise');

  K(['crocodile','tortoise'],'rep_hide','Armoured Hide','M',0,
    { n:'Plates', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+P, dur:1},{v:'anchor', who:'self', dur:1}],
      txt:(P,E)=>`Bone plates in the skin: Shield ${2+P} this round, and nothing can push or pull you.` },
    { n:'Osteoderms', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+E, dur:2},{v:'thorns', val:1, dur:2},{v:'heal', n:1}],
      txt:(P,E)=>`Shield ${2+E} for 2 rounds; anything that hits you in melee takes 1 meanwhile, and heal 1.` },
    'Armour grown, not worn.', 'Crocodiles and tortoises');
  K(['crocodile','tortoise'],'rep_heart','Slow Heart','T',0,
    { n:'Slow Down', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'engine', kind:'ap', val:1, dur:1}],
      txt:(P,E)=>`Slow your heart: heal ${1+P}, and gain 1 AP next turn.` },
    { n:'Two Beats a Minute', ap:1, el:1, cd:5, dur:1, tgt:'self',
      fx:[{v:'stasis', dur:1},{v:'heal', n:(P,E)=>2+E}],
      txt:(P,E)=>`Slow your heart almost to a stop: nothing can target you through the next enemy phase, and heal ${2+E}.` },
    'A heart that can wait an hour between beats.', 'Crocodiles and tortoises');

  // Crocodile: Solar Basking, Armoured Hide, Slow Heart, and these six
  K(['crocodile'],'cro_roll','Death Roll','M',2,
    { n:'Grab', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Melee ${2+P}, and hold on: Anchored 1.` },
    { n:'Roll', ap:2, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>4+E, pierce:true},{v:'weaken', val:(P,E)=>1+h(E), dur:2}],
      txt:(P,E)=>`Roll with it in your jaws: melee ${4+E} that ignores Shield, and it is Weakened ${1+h(E)} for 2 rounds.` },
    'Clamp, then spin, and nothing holds together.');
  K(['crocodile'],'cro_lurk','Lurk','T',0,
    { n:'Sink', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'empower', val:(P,E)=>1+P, uses:1, dur:2}],
      txt:(P,E)=>`Sink until only your eyes show: Hidden 1, and your next hit within 2 rounds deals +${1+P}.` },
    { n:'Log in the River', ap:1, el:1, cd:4, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+E},{v:'hidden', dur:(P,E)=>1+h(E), canMove:true},{v:'empower', val:(P,E)=>2+E, uses:1, dur:3}],
      txt:(P,E)=>`Drift ${1+E} like a log: Hidden ${1+h(E)} even if you move, and your next hit within 3 rounds deals +${2+E}.` },
    'It looks like a log. It is not a log.');
  K(['crocodile'],'cro_jaws','Ambush Jaws','M',0,
    { n:'Lunge', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'move', n:1, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>3+P, ifAdjacent:true}],
      txt:(P,E)=>`Lunge 1 toward a foe within 2; if you end beside it, melee ${3+P}.` },
    { n:'Out of the Water', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, dest:'adjTarget'},{v:'strike', kind:'melee', dmg:(P,E)=>3+E, revealTarget:true},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Burst from the water beside a foe within ${2+E}, hidden or not: melee ${3+E}, and it is Anchored 1.` },
    'Faster over two metres than anything that drinks.');
  K(['crocodile'],'cro_tail','Tail Sweep','M',0,
    { n:'Sweep', ap:1, el:0, cd:1, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>1+h(P)},{v:'force', kind:'push', n:1, area:true, radius:1}],
      txt:(P,E)=>`Swing your tail: every foe beside you takes ${1+h(P)} and is knocked back 1.` },
    { n:'Club Tail', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'force', kind:'push', n:2},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Club one foe with your tail: melee ${3+E}, push it 2, and it is Weakened 1 this round.` },
    'Half its length is tail, and all of it is muscle.');
  K(['crocodile'],'cro_gape','Gape','T',0,
    { n:'Gape', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'heal', n:1},{v:'weaken', val:1, dur:1, area:'adj'},{v:'shield', val:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Lie with your jaws wide in the sun: heal 1, hold Shield ${1+h(P)}, and foes beside you are Weakened 1 at the sight.` },
    { n:'Open Wide', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E},{v:'thorns', val:(P,E)=>2+E, next:true, dur:2}],
      txt:(P,E)=>`Heal 1 at the start of each turn for ${2+E} rounds; Thorns: the next foe to hit you in melee takes ${2+E}.` },
    'Mouth open on the bank, to cool off. Nobody comes closer.');
  K(['crocodile'],'cro_king','River King','C',0,
    { n:'Bellow', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'adj'},{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Bellow across the water: see within ${2+P}, foes beside you are Weakened 1, and your next hit this turn deals +1.` },
    { n:'My River', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true},{v:'hazardImmune', dur:1, party:true},{v:'shield', val:1, dur:1, party:true}],
      txt:(P,E)=>`This is your river: both heroes deal +${1+E} on their next hit, ignore hazards this round, and hold Shield 1 this round.` },
    'The biggest male owns the river, and everyone knows it.');

  // Giant tortoise: Solar Basking, Armoured Hide, Slow Heart, Long Life, and these five
  K(['tortoise'],'tor_shell','Shell','M',2,
    { n:'Shell Up', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:1},{v:'shield', val:(P,E)=>2+P, dur:1}],
      txt:(P,E)=>`Shield ${2+P} this round, and Cleanse, and you can't be Weakened or Anchored by a foe.` },
    { n:'House on Your Back', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>3+E, dur:2},{v:'shield', val:1, dur:1, party:true, allyRange:1},{v:'thorns', val:(P,E)=>1+E, next:true, push:1, dur:2}],
      txt:(P,E)=>`Shield ${3+E} for 2 rounds; an ally beside you holds Shield 1 this round, and Thorns: the next foe to hit you in melee takes ${1+E} and is pushed 1.` },
    'A house, a fortress and a back, all one bone.');
  K(['tortoise'],'tor_sure','Slow and Sure','T',0,
    { n:'Plan Ahead', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reroll', n:(P,E)=>1+h(P)},{v:'engine', kind:'ap', val:1, dur:1}],
      txt:(P,E)=>`Reroll up to ${1+h(P)} banked dice, and gain 1 AP next turn.` },
    { n:'In Good Time', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'ap', val:1, dur:(P,E)=>2+h(E)},{v:'shield', val:(P,E)=>1+E, next:true},{v:'empower', val:(P,E)=>1+E, uses:1, dur:3}],
      txt:(P,E)=>`Gain 1 AP at the start of each turn for ${2+h(E)} rounds; Shield: the next hit on you is ${1+E} less, and your next hit within 3 rounds deals +${1+E}.` },
    'It wins races. Ask anyone.');
  K(['tortoise'],'tor_beak','Beak Snap','M',0,
    { n:'Snap', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'stripShield', amount:1},{v:'strike', kind:'melee', dmg:(P,E)=>3+P}],
      txt:(P,E)=>`Snap: it loses 1 Shield, then melee ${3+P}.` },
    { n:'Shear', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E, pierce:true},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Shear with the beak's edge: melee ${3+E} that ignores Shield, and it is Weakened 1 this round.` },
    'No teeth, just an edge like shears.');
  K(['tortoise'],'tor_withdraw','Withdraw','T',0,
    { n:'Tuck In', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>3+P, dur:1},{v:'heal', n:1},{v:'anchor', who:'self', dur:1}],
      txt:(P,E)=>`Tuck everything in: Shield ${3+P} this round, heal 1, and nothing can push or pull you.` },
    { n:'Wait It Out', ap:1, el:1, cd:5, dur:1, tgt:'self',
      fx:[{v:'stasis', dur:1},{v:'heal', n:(P,E)=>2+E},{v:'cleanse'}],
      txt:(P,E)=>`Wait it out inside: nothing can target you through the next enemy phase; heal ${2+E} and shake off Anchored and Weakened.` },
    'Head, legs and tail, all inside, and the door shut.');
  K(['tortoise'],'tor_plod','Steady Plod','S',0,
    { n:'Plod', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Plod ${1+P}, and hold Shield 1 this round.` },
    { n:'Through Anything', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'cleanse', ward:2},{v:'move', n:(P,E)=>2+E},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Plod ${2+E} through anything; for 2 rounds ignore hazards, and Cleanse, and you can't be Weakened or Anchored by a foe.` },
    'It goes where it is going, and it gets there.');
  /* ───────────────────────── AMPHIBIANS ─────────────────────────
     axolotl · newt · tree frog. The axolotl's Toxic Secretion and External Gills are every amphibian's; its
     Regeneration and Lateral Line the newt's too. The tree frog's sticky toes are the gecko's Adhesive Setae:
     not kin, the same answer to the same wall (a variant). */
  T.SPECIES.axolotl.branch = 'Amphibians';
  S('newt', { name: 'Newt', lean: 'T/C', branch: 'Amphibians', icon: '🦎',
    tagline: 'Wanders the woods as a bright red eft for years, then goes back to the water. Tastes terrible.' });
  S('tree_frog', { name: 'Tree Frog', lean: 'S/C', branch: 'Amphibians', variant: true, icon: '🐸',
    tagline: 'Sticky toes, red eyes, a glass belly, and a voice far too big for it.' });
  T.shareTrait('axo_toxic', 'newt', 'tree_frog');
  T.shareTrait('axo_gills', 'newt', 'tree_frog');
  T.shareTrait('axo_regen', 'newt');
  T.shareTrait('axo_lateral', 'newt');
  T.shareTrait('gec_setae', 'tree_frog');

  // Newt: Regeneration, Toxic Secretion, External Gills, Lateral Line, and these five
  K(['newt'],'new_eft','Eft Wander','S',2,
    { n:'Wander', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'heal', n:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Wander ${1+P} through the leaf litter; heal 1, and your next hit this turn deals +1.` },
    { n:'Years on Land', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'cleanse', ward:2},{v:'move', n:(P,E)=>2+E, ignoreFoes:true},{v:'empower', val:1, uses:1, dur:2}],
      txt:(P,E)=>`Walk ${2+E}, past foes, bright and unbothered: Cleanse, and you can't be Weakened or Anchored by a foe for 2 rounds, and your next hit deals +1.` },
    'Bright orange, walking openly, because nothing wants to eat it.');
  K(['newt'],'new_belly','Warning Belly','C',0,
    { n:'Flash Belly', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'adj'},{v:'shield', val:(P,E)=>1+h(P), dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Arch your back and show your belly: foes beside you are Weakened 1, you hold Shield ${1+h(P)} this round, and your next hit this turn deals +1.` },
    { n:'Unken Reflex', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:(P,E)=>1+h(E), dur:2, area:'adj'},{v:'thorns', val:(P,E)=>1+h(E), dur:2},{v:'shield', val:1, dur:2}],
      txt:(P,E)=>`Freeze in warning: foes beside you are Weakened ${1+h(E)} for 2 rounds; for 2 rounds you hold Shield 1 and anything that hits you in melee takes ${1+h(E)}.` },
    'Belly up and bright: you were warned.');
  K(['newt'],'new_return','Water Return','T',0,
    { n:'Slip In', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hidden', dur:1},{v:'heal', n:1}],
      txt:(P,E)=>`Slip into the water ${1+P} away: Hidden 1, and heal 1.` },
    { n:'Home Pond', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+h(E), party:true},{v:'cleanse', party:true}],
      txt:(P,E)=>`Back to the pond where you hatched: both heroes shake off Anchored and Weakened and heal 1 at the start of each turn for ${2+h(E)} rounds.` },
    'It finds its way home to the pond it was born in.');
  K(['newt'],'new_tail','Tail Swim','S',0,
    { n:'Scull', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Scull ${1+P} with your tail; hazards can't touch you this round.` },
    { n:'Tail Flick', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'force', kind:'push', n:1},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Flick your tail: melee ${3+E}, push it 1, and take a free step.` },
    'A flattened tail, made for water.');
  K(['newt'],'new_rough','Rough Skin','M',0,
    { n:'Nip', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'wound', n:2, kind:'toxin'}],
      txt:(P,E)=>`Melee ${3+P}; your skin's poison gets in: it is Wounded 2.` },
    { n:'Deadly to Swallow', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>1+E, dur:2},{v:'shield', val:(P,E)=>1+h(E), dur:2},{v:'heal', n:1}],
      txt:(P,E)=>`Seep toxin: for 2 rounds you hold Shield ${1+h(E)} and anything that hits you in melee takes ${1+E}; heal 1.` },
    'Enough poison in one to stop a dozen hearts.');

  // Tree frog: Toxic Secretion, External Gills, Adhesive Setae, and these six
  K(['tree_frog'],'tfr_leap','Leaf Leap','S',2,
    { n:'Leap', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Leap onto any node within ${1+P}, height included; your next hit this turn deals +1.` },
    { n:'Leaf to Leaf', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>3+E, height:true},{v:'hidden', dur:1}],
      txt:(P,E)=>`Leap to any node within ${3+E}, height included, and land Hidden 1.` },
    'Twenty times its own length, and it sticks the landing.');
  K(['tree_frog'],'tfr_rain','Rain Call','C',0,
    { n:'Croak for Rain', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'heal', n:(P,E)=>1+h(P), party:true},{v:'hazardImmune', dur:1, party:true}],
      txt:(P,E)=>`Call the rain: both heroes heal ${1+h(P)} and ignore hazards this round.` },
    { n:'Downpour', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>1+E, party:true},{v:'reveal', radius:2, dur:1},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Bring the downpour: both heroes heal 1 at the start of each turn for ${1+E} ${1+E > 1 ? 'rounds' : 'round'} and deal +1 on their next hit; see within 2.` },
    'It sings before the storm, every time.');
  K(['tree_frog'],'tfr_startle','Red-Eye Startle','C',0,
    { n:'Open Eyes', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'weaken', val:(P,E)=>1+h(P), dur:1},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Flash your red eyes at a foe within 2: Weakened ${1+h(P)} this round, and you take a free step.` },
    { n:'Flash of Colour', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'decoy', dur:1, here:true},{v:'weaken', val:1, dur:1, area:'adj'},{v:'move', n:(P,E)=>2+E}],
      txt:(P,E)=>`Flash red eyes, orange feet and blue flanks: foes beside you are Weakened 1, you leave a decoy, and you leap ${2+E}.` },
    'Asleep it is green. Awake, it is every colour at once.');
  K(['tree_frog'],'tfr_glass','Glass Belly','T',0,
    { n:'Go Clear', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'shield', val:(P,E)=>1+P, dur:1}],
      txt:(P,E)=>`Go see-through on a leaf: Hidden 1, and Shield ${1+P} this round.` },
    { n:'Hide the Blood', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+h(E), canMove:true},{v:'heal', n:(P,E)=>1+E}],
      txt:(P,E)=>`Pack your blood away and turn to glass: Hidden ${1+h(E)} even if you move, and heal ${1+E}.` },
    'You can see its heart beating through the skin.');
  K(['tree_frog'],'tfr_chorus','Night Chorus','C',0,
    { n:'Call', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:2, target:'ally'},{v:'reveal', radius:2, dur:1}],
      txt:(P,E)=>`Call into the night: see within 2, and your ally's next hit deals +${1+h(P)}.` },
    { n:'Wall of Sound', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:2, area:'adj'},{v:'force', kind:'push', n:1, area:true, radius:(P,E)=>1+h(E)},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Every frog at once: foes within ${1+h(E)} fall back 1, foes beside you are Weakened 1 for 2 rounds, and both heroes' next hit deals +1.` },
    'Thousands of them, and you cannot hear yourself think.');
  K(['tree_frog'],'tfr_tongue','Long Tongue','M',0,
    { n:'Flick', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`Flick your tongue at a foe within 2 for ${2+P}.` },
    { n:'Snatch and Swallow', ap:1, el:1, cd:3, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+E},{v:'force', kind:'pull', n:1},{v:'heal', n:1}],
      txt:(P,E)=>`Snatch a foe within 2: it takes ${2+E} and is pulled 1 toward you, and you heal 1.` },
    'Out, stuck, in, before you saw it move.');
  /* ───────────────────────── FISH ─────────────────────────
     electric eel · koi · clownfish · lionfish · seahorse. The eel's Buoyancy Control is every fish's, and the
     axolotl's Lateral Line every new fish's. Koi and clownfish share Schooling; the koi carries Long Life. The
     seahorse's brood pouch and turret eyes are the kangaroo's Pouch and the chameleon's Turret Eyes, the same
     answers found again (a variant). */
  T.SPECIES.eel.branch = 'Fish';
  S('koi', { name: 'Koi', lean: 'T/C', branch: 'Fish', icon: '🐟',
    tagline: 'Gold and patient, lives for centuries. Swims upstream, and the story says it becomes a dragon.' });
  S('clownfish', { name: 'Clownfish', lean: 'C/T', branch: 'Fish', icon: '🐠',
    tagline: 'Lives in a stinging anemone that never stings it, with a partner it never leaves.' });
  S('lionfish', { name: 'Lionfish', lean: 'M/C', branch: 'Fish', icon: '🐡',
    tagline: 'All fans and venom spines. Corners its prey and swallows it whole.' });
  S('seahorse', { name: 'Seahorse', lean: 'T/S', branch: 'Fish', variant: true, icon: '🐴',
    tagline: 'Holds on with its tail, looks two ways at once, and the father carries the young.' });
  const NEW_FISH = ['koi','clownfish','lionfish','seahorse'];
  T.shareTrait('eel_buoyancy', ...NEW_FISH);
  T.shareTrait('axo_lateral', ...NEW_FISH);
  T.shareTrait('bir_life', 'koi');
  T.shareTrait('pou_pouch', 'seahorse');
  T.shareTrait('cha_turret', 'seahorse');

  K(['koi','clownfish'],'fis_school','Schooling','S',0,
    { n:'Swim Together', ap:1, el:0, cd:1, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>1+P},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Turn as one: your ally moves ${1+P} where you choose, and you take a free step.` },
    { n:'Bait Ball', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+E, dur:1, party:true},{v:'shield', val:1, next:true, party:true}],
      txt:(P,E)=>`Close up tight: both heroes hold Shield ${1+E} this round, and Shield: each one's next hit taken is 1 less.` },
    'A thousand fish, one mind.', 'Fish');

  // Koi: Buoyancy Control, Lateral Line, Schooling, Long Life, and these five
  K(['koi'],'koi_gate','Dragon Gate','S',2,
    { n:'Leap the Falls', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Leap up the falls onto any node within ${1+P}, height included; your next hit this turn deals +1.` },
    { n:'Become the Dragon', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'morph', bonus:(P,E)=>1+h(E), reach:0, dur:(P,E)=>1+E},{v:'heal', n:(P,E)=>1+E}],
      txt:(P,E)=>`For ${1+E} rounds your strikes deal +${1+h(E)}; heal ${1+E}.` },
    'The one that leaps the falls at the Dragon Gate becomes a dragon.');
  K(['koi'],'koi_up','Upstream','S',0,
    { n:'Against the Current', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'anchor', who:'self', dur:1}],
      txt:(P,E)=>`Swim ${1+P} against the current; nothing can push or pull you this round.` },
    { n:'Never Turn Back', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'cleanse', ward:2},{v:'move', n:(P,E)=>2+E, ignoreFoes:true},{v:'empower', val:(P,E)=>1+h(E), uses:1, dur:2}],
      txt:(P,E)=>`Swim ${2+E}, past foes; Cleanse, and you can't be Weakened or Anchored by a foe for 2 rounds, and your next hit deals +${1+h(E)}.` },
    'Upriver, always.');
  K(['koi'],'koi_shimmer','Shimmer Scales','C',0,
    { n:'Flash', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P)},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Flash your scales at a foe within 2: Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}, and you hold Shield 1 this round.` },
    { n:'Mirror Scales', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'shield', next:true, val:(P,E)=>2+E, reflect:(P,E)=>E}],
      txt:(P,E)=>`Shield: Shield: the next hit on you is ${2+E} less${E ? ` and reflects ${E}` : ''}.` },
    'Every scale a little mirror.');
  K(['koi'],'koi_calm','Pond Calm','T',0,
    { n:'Still Water', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'heal', n:(P,E)=>1+h(P), party:true},{v:'reroll', n:1}],
      txt:(P,E)=>`Still the water: both heroes heal ${1+h(P)}, and reroll 1 banked die.` },
    { n:'Garden Pond', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+h(E), party:true},{v:'cleanse', party:true}],
      txt:(P,E)=>`Both heroes shake off Anchored and Weakened and heal 1 at the start of each turn for ${2+h(E)} rounds.` },
    'Watching koi is the point of the pond.');
  K(['koi'],'koi_gold','Gold Gleam','C',0,
    { n:'Gleam', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:2, target:'ally'},{v:'shield', val:1, dur:1, party:true}],
      txt:(P,E)=>`Catch the light: your ally's next hit deals +${1+h(P)}, and both heroes hold Shield 1 this round.` },
    { n:'Lucky Fish', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'ap', val:1, dur:1, target:'ally'},{v:'reroll', n:(P,E)=>1+h(E)},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`For luck: your ally gains 1 AP next turn, you reroll up to ${1+h(E)} banked dice, and both heroes' next hit deals +1.` },
    'Gold for luck, and it is lucky.');

  // Clownfish: Buoyancy Control, Lateral Line, Schooling, and these six
  K(['clownfish'],'clo_anemone','Anemone Home','T',2,
    { n:'Back Home', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1},{v:'thorns', val:1, dur:1}],
      txt:(P,E)=>`Back among the tentacles: Shield ${1+P} this round, and anything that hits you in melee takes 1.` },
    { n:'Sting Garden', ap:1, el:1, cd:4, dur:0, tgt:'node_r2',
      fx:[{v:'wound', n:(P,E)=>2+h(E), kind:'sting', area:'nodeArea'},{v:'shield', val:1, dur:2, party:true}],
      txt:(P,E)=>`Lead foes into the anemone at a node within 2: every foe on or beside it is stung: Wounded ${2+h(E)}; both heroes hold Shield 1 for 2 rounds.` },
    'A house that stings everyone but you.');
  K(['clownfish'],'clo_dart','Dart','S',0,
    { n:'Dart', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P}],
      txt:(P,E)=>`Dart ${1+P}.` },
    { n:'Dart Out, Dart Back', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:2, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>2+E, ifAdjacent:true},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Dart up to 2 toward a foe within 3 and nip it for ${2+E} if you reach it; Shield: the next hit on you is 1 less.` },
    'Out a body length, and straight back.');
  K(['clownfish'],'clo_mucus','Mucus Coat','T',0,
    { n:'Coat', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:1},{v:'hazardImmune', dur:2},{v:'heal', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`A coat the stings slide off: ignore hazards for 2 rounds, Cleanse, and you can't be Weakened or Anchored by a foe this round, and heal ${1+h(P)}.` },
    { n:'Share the Coat', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hazardImmune', dur:(P,E)=>2+E},{v:'hazardImmune', dur:1, party:true},{v:'cleanse', party:true},{v:'shield', val:1, dur:1, party:true}],
      txt:(P,E)=>`Both heroes ignore hazards this round (you for ${2+E} rounds), shake off Anchored and Weakened, and hold Shield 1 this round.` },
    'The anemone thinks it is touching itself.');
  K(['clownfish'],'clo_pair','Pair Bond','C',0,
    { n:'Stay Close', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1, party:true, allyRange:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`You and an ally beside you hold Shield ${1+P} this round; your next hit this turn deals +1.` },
    { n:'Together Always', ap:1, el:1, cd:4, dur:0, tgt:'ally',
      fx:[{v:'swap'},{v:'heal', n:(P,E)=>1+E, party:true}],
      txt:(P,E)=>`Swap places with your partner, wherever they are, and both heroes heal ${1+E}.` },
    'One pair, one anemone, for life.');
  K(['clownfish'],'clo_role','Change Role','T',0,
    { n:'Step Up', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'empower', val:(P,E)=>1+P, uses:1, dur:2},{v:'heal', n:1}],
      txt:(P,E)=>`Take the lead: heal 1, and your next hit within 2 rounds deals +${1+P}.` },
    { n:'New Leader', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, target:'ally'},{v:'engine', kind:'ap', val:1, dur:1, target:'ally'},{v:'heal', n:1, target:'ally'}],
      txt:(P,E)=>`Hand the lead to your partner: they heal 1, gain 1 AP next turn, and their next hit deals +${1+E}.` },
    'When the leader goes, the next in line becomes it.');
  K(['clownfish'],'clo_pop','Pop','C',0,
    { n:'Pop', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'weaken', val:1, dur:1},{v:'strike', kind:'los', dmg:(P,E)=>1+P}],
      txt:(P,E)=>`Pop and click at a foe within 2: it takes ${1+P} and is Weakened 1 this round.` },
    { n:'Chatter Off', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'force', kind:'push', n:1, area:true, radius:(P,E)=>1+h(E)},{v:'weaken', val:1, dur:2, area:'adj'},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Pop like mad: foes within ${1+h(E)} back off 1, foes beside you are Weakened 1 for 2 rounds, and you hold Shield 1 this round.` },
    'Small fish, loud opinions.');

  // Lionfish: Buoyancy Control, Lateral Line, and these seven
  K(['lionfish'],'lio_spines','Venom Spines','M',2,
    { n:'Spine', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'wound', n:2, kind:'venom'}],
      txt:(P,E)=>`Melee ${2+P}; it is Wounded 2.` },
    { n:'Full Spines', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>2+E, dur:2},{v:'shield', val:1, dur:2}],
      txt:(P,E)=>`Raise every spine: for 2 rounds you hold Shield 1, and anything that hits you in melee takes ${2+E}.` },
    'Eighteen spines, and every one has venom.');
  K(['lionfish'],'lio_corral','Fan Corral','C',0,
    { n:'Herd', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'force', kind:'pull', n:1},{v:'anchor', who:'foe', dur:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Spread your fans and herd a foe within 2 one node toward you; it is Anchored ${1+h(P)}.` },
    { n:'Corner It', ap:1, el:1, cd:3, dur:0, tgt:'foe_r2',
      fx:[{v:'force', kind:'pull', n:1},{v:'anchor', who:'foe', dur:(P,E)=>1+h(E)},{v:'weaken', val:1, dur:2},{v:'empower', val:(P,E)=>E, uses:1, dur:2}],
      txt:(P,E)=>`Corner a foe within 2: draw it 1 closer, Anchored ${1+h(E)} and Weakened 1 for 2 rounds; your next hit deals +${E}.` },
    'Fins like a net, closing.');
  K(['lionfish'],'lio_hover','Hover Stalk','T',0,
    { n:'Drift Closer', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P}],
      txt:(P,E)=>`Drift ${1+P}.` },
    { n:'Hang Still', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'empower', val:(P,E)=>2+E, uses:1, dur:2},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Hang motionless: Hidden 1, ignore hazards this round, and your next hit within 2 rounds deals +${2+E}.` },
    'Barely moving, and then very much moving.');
  K(['lionfish'],'lio_gulp','Gulp','M',0,
    { n:'Gulp', ap:1, el:0, cd:2, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'heal', n:1}],
      txt:(P,E)=>`Swallow at it: melee ${3+P}, and heal 1.` },
    { n:'Whole', ap:1, el:1, cd:4, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'execute', threshold:(P,E)=>2+E},{v:'heal', n:(P,E)=>1+E}],
      txt:(P,E)=>`Melee ${3+E}; if that leaves it at ${2+E} hp or less it is swallowed whole. Heal ${1+E}.` },
    'Faster than the eye.');
  K(['lionfish'],'lio_invader','Invader','S',0,
    { n:'Settle In', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'heal', n:1}],
      txt:(P,E)=>`Move ${1+P} into new water, and heal 1.` },
    { n:'Take Over', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:2},{v:'engine', kind:'ap', val:1, dur:1},{v:'shield', val:(P,E)=>1+h(E), dur:2}],
      txt:(P,E)=>`Make it yours: gain 1 AP at the start of your next turn; Shield ${1+h(E)} and Cleanse, and no Weaken or Anchor from a foe for 2 rounds.` },
    'No predators here. Not yet.');
  K(['lionfish'],'lio_warn','Warning Fins','C',0,
    { n:'Fan Out', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'adj'},{v:'shield', val:(P,E)=>1+h(P), next:true}],
      txt:(P,E)=>`Fan out stripes and spines: foes beside you are Weakened 1, and Shield: the next hit on you is ${1+h(P)} less.` },
    { n:'Back Off', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'force', kind:'push', n:1, area:true, radius:(P,E)=>1+h(E)},{v:'weaken', val:1, dur:2, area:'adj'},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Spines first: foes within ${1+h(E)} back off 1, foes beside you are Weakened 1 for 2 rounds, and both heroes' next hit deals +1.` },
    'Red and white stripes: everyone knows what they mean.');
  K(['lionfish'],'lio_night','Night Hunt','T',0,
    { n:'Dusk', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'mark', nearest:true}],
      txt:(P,E)=>`Hunt at dusk: see within ${2+P}, and Mark the nearest foe (the next hit on it deals +2).` },
    { n:'Dark Reef', ap:1, el:1, cd:4, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:2},{v:'mark', n:(P,E)=>1+E, dur:3},{v:'hidden', dur:1}],
      txt:(P,E)=>`Choose prey on the dark reef: Revealed for 2 rounds, it is Marked +${1+E} for 3 rounds, and you are Hidden 1.` },
    'It feeds when the reef goes dark.');

  // Seahorse: Buoyancy Control, Lateral Line, Pouch, Turret Eyes, and these five
  K(['seahorse'],'sea_anchor','Tail Anchor','T',2,
    { n:'Hold On', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'anchor', who:'self', dur:1},{v:'shield', val:(P,E)=>1+P, dur:1}],
      txt:(P,E)=>`Wrap your tail round something: Shield ${1+P} this round, and nothing can push or pull you.` },
    { n:'Moored', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'anchor', who:'self', dur:2},{v:'shield', val:(P,E)=>1+E, dur:2},{v:'engine', kind:'regen', val:1, dur:2}],
      txt:(P,E)=>`Moor yourself: for 2 rounds hold Shield ${1+E}, heal 1 at the start of each turn, and nothing can push or pull you.` },
    'A tail that grips like a hand.');
  K(['seahorse'],'sea_snap','Snout Snap','M',0,
    { n:'Snap', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>1+P}],
      txt:(P,E)=>`Snap at a foe within 2 for ${1+P}.` },
    { n:'Fastest Mouth', ap:1, el:1, cd:3, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>3+E, revealTarget:true},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Snap faster than it can flinch: a foe within 2 takes ${3+E}, hidden or not; your next hit this turn deals +1.` },
    'A pivot of the head, a snap, and the shrimp is gone.');
  K(['seahorse'],'sea_drift','Drift Camouflage','T',0,
    { n:'Weed', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'heal', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Look like weed: Hidden 1, and heal ${1+h(P)}.` },
    { n:'Grow Filaments', ap:0, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:(P,E)=>1+h(E), party:true, radius:1},{v:'empower', val:(P,E)=>1+E, uses:1, dur:3}],
      txt:(P,E)=>`You and an ally beside you are Hidden ${1+h(E)}; your next hit within 3 rounds deals +${1+E}.` },
    'It grows skin flaps to match the weed it lives in.');
  K(['seahorse'],'sea_plates','Bony Plates','M',0,
    { n:'Plates', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+h(P), dur:1},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Shield ${2+h(P)} this round, and Shield: the next hit on you is 1 less.` },
    { n:'Armoured Ring', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+E, dur:2},{v:'thorns', val:(P,E)=>1+E, next:true, dur:2}],
      txt:(P,E)=>`Shield ${2+E} for 2 rounds; Thorns: the next foe to hit you in melee takes ${1+E}.` },
    'No scales: rings of bone, all the way down.');
  K(['seahorse'],'sea_fin','Slow Fin','S',0,
    { n:'Flutter', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Flutter ${1+P}; hazards can't touch you this round.` },
    { n:'Ride the Current', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E},{v:'hidden', dur:1},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Let the current carry you to any node within ${2+E}; Hidden 1, and hazards can't touch you this round.` },
    'The slowest fish in the sea, and it gets there anyway.');
  // ── Molluscs and jellies (2.64): the Mimic Octopus keeps its nine; the snail and jellyfish join it.
  // Boneless Squeeze is every soft body's; the snail also tastes with Chemo-Suckers and carries the tortoise's Shell.
  T.SPECIES.octopus.branch = 'Molluscs and jellies';
  S('snail', { name: 'Snail', lean: 'T/M', branch: 'Molluscs and jellies', icon: '🐌',
    tagline: 'Carries its house, climbs anything, and seals itself in to wait out the bad weather.' });
  S('jellyfish', { name: 'Jellyfish', lean: 'C/T', branch: 'Molluscs and jellies', variant: true, icon: '🪼',
    tagline: 'No brain, no bones, a bell full of stings, and one kind that turns young again instead of dying.' });
  T.shareTrait('oct_squeeze', 'snail', 'jellyfish');
  T.shareTrait('oct_chemo', 'snail');
  T.shareTrait('tor_shell', 'snail');
  T.shareTrait('axo_regen', 'snail', 'jellyfish');
  T.shareTrait('eel_buoyancy', 'jellyfish');

  // Snail: Boneless Squeeze, Chemo-Suckers, Shell, Regeneration, and these five
  K(['snail'],'snl_slime','Slime Trail','T',2,
    { n:'Glide', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'hazardImmune', dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Glide ${1+P} on your own slime, up walls and over anything sharp: height nodes included, hazards can't touch you this round, and your next hit this turn deals +1.` },
    { n:'Slick', ap:1, el:1, cd:3, dur:0, tgt:'node_r2',
      fx:[{v:'wound', n:2, kind:'slime', area:'nodeArea'},{v:'weaken', val:1, dur:(P,E)=>1+E, area:'adj'}],
      txt:(P,E)=>`Lay a slick on a node within 2: foes on or beside it are Wounded 2, and foes beside you are Weakened 1 for ${1+E} ${1+E > 1 ? 'rounds' : 'round'}.` },
    'Where it has been, everything is slippery.');
  K(['snail'],'snl_seal','Seal In','M',0,
    { n:'Withdraw', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+P, dur:1},{v:'anchor', who:'self', dur:1}],
      txt:(P,E)=>`Retreat into your shell: Shield ${2+P} this round, and nothing can push or pull you.` },
    { n:'Epiphragm', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'stasis', dur:1},{v:'heal', n:(P,E)=>1+E},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`Seal the door with dried slime: heal ${1+E}, nothing can touch you until your next turn, and your next hit deals +${1+E}.` },
    'A door of dried slime, and the weather can do what it likes.');
  K(['snail'],'snl_radula','Radula','M',0,
    { n:'Rasp', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'stripShield', amount:1},{v:'strike', kind:'melee', dmg:(P,E)=>3+P}],
      txt:(P,E)=>`Rasp with a tongue of tiny teeth: strip 1 Shield, then melee ${3+P}.` },
    { n:'File Down', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'stripShield', amount:2},{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'mark', n:(P,E)=>1+E, pierce:true}],
      txt:(P,E)=>`File it down: strip 2 Shield and melee ${2+E}; the next hit on it ignores Shield and deals +${1+E}.` },
    'Twenty thousand teeth, all very small.');
  K(['snail'],'snl_rain','After Rain','S',0,
    { n:'Wet Night', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'heal', n:1}],
      txt:(P,E)=>`Out after the rain: move ${1+P} and heal 1.` },
    { n:'Downpour', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>1+E, party:true},{v:'cleanse', field:1},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Everything comes out in the wet: both heroes heal 1 at the start of their next ${1+E} turns and deal +1 with their next hit, and the ground beside you is Cleansed of hazards and foes' Fields.` },
    'Snails come out when it rains, and so do their friends.');
  K(['snail'],'snl_stalks','Eye Stalks','C',0,
    { n:'Peek', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Raise your eyes on their stalks: see within ${2+P}, and Shield: the next hit on you is 1 less.` },
    { n:'Shell Watch', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:2},{v:'mark', n:1, dur:3},{v:'shield', val:(P,E)=>1+E, next:true}],
      txt:(P,E)=>`Watch one foe from the shell's edge: Revealed for 2 rounds, it is Marked +1 for 3 rounds, and Shield: the next hit on you is ${1+E} less.` },
    'Two eyes on stalks, quick to duck.');

  // Jellyfish: Boneless Squeeze, Regeneration, Buoyancy Control (a variant: it drifts like a fish but is none), and these six
  K(['jellyfish'],'jel_sting','Nematocysts','C',2,
    { n:'Sting', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'wound', n:2, kind:'venom'}],
      txt:(P,E)=>`Melee ${1+P}; it is Wounded 2.` },
    { n:'Fire All', ap:1, el:1, cd:3, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>1+E},{v:'wound', n:2, kind:'venom', area:'nodeArea'}],
      txt:(P,E)=>`Every sting fires at once: each foe beside you takes ${1+E}, then each is Wounded 2.` },
    'A thousand tiny harpoons, each one coiled and loaded.');
  K(['jellyfish'],'jel_trail','Trailing Tentacles','M',0,
    { n:'Trail', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>1+P, dur:1}],
      txt:(P,E)=>`Let your tentacles hang: anything that hits you in melee this round takes ${1+P}.` },
    { n:'Curtain', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>1+E, dur:2},{v:'thorns', val:(P,E)=>1+E, next:true, push:1, dur:2}],
      txt:(P,E)=>`Spread a curtain of stings: for 2 rounds anything that hits you in melee takes ${1+E}, and Thorns: the first to do so takes ${1+E} more and is pushed 1.` },
    'Metres of tentacle, trailing behind something you can barely see.');
  K(['jellyfish'],'jel_pulse','Bell Pulse','S',0,
    { n:'Pulse', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true}],
      txt:(P,E)=>`Pulse your bell and drift ${1+P}, through foes if need be.` },
    { n:'Jet', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'force', kind:'push', n:1, area:true, radius:1},{v:'move', n:(P,E)=>2+E, free:true}],
      txt:(P,E)=>`Clench hard: foes beside you are pushed back 1, then you shoot up to ${2+E} wherever you like.` },
    'Squeeze, drift, squeeze, drift.');
  K(['jellyfish'],'jel_glow','Bioluminescence','C',0,
    { n:'Glow', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Light up the water: see within ${2+P} (breaks Hidden, finds hidden objectives), and your next hit this turn deals +1.` },
    { n:'Lure Light', ap:1, el:1, cd:3, dur:0, tgt:'node_r2',
      fx:[{v:'decoy', dur:(P,E)=>1+E},{v:'hidden', dur:1}],
      txt:(P,E)=>`Flash a ring of light at a node within 2: foes treat it as a hero for ${1+E} ${1+E > 1 ? 'rounds' : 'round'}, and you go dark (Hidden 1).` },
    'Blue light in black water.');
  K(['jellyfish'],'jel_bloom','Bloom','T',0,
    { n:'Drift Together', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+h(P), dur:1, party:true, allyRange:2},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Drift close: you and an ally within 2 hold Shield ${1+h(P)} this round, and the ally's next hit deals +1.` },
    { n:'Swarm', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'decoy', dur:(P,E)=>1+E, here:true},{v:'hidden', dur:1, party:true, radius:1},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Become a bloom of thousands: a decoy stands where you are for ${1+E} ${1+E > 1 ? 'rounds' : 'round'}, heroes on or beside your node are Hidden 1, and both heroes' next hit deals +${1+E}.` },
    'One jellyfish is a curiosity. Ten thousand is the weather.');
  K(['jellyfish'],'jel_reverse','Turn Back','T',0,
    { n:'Shed', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'heal', n:(P,E)=>1+P}],
      txt:(P,E)=>`Shed the damaged layer: escape every hold and condition, and heal ${1+P}.` },
    { n:'Young Again', ap:1, el:1, cd:5, dur:3, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>3+2*E, ward:3}],
      txt:(P,E)=>`Ready to turn young: hold a Heal; if you are downed within 3 rounds, Heal ${3+2*E} at once (you get up).` },
    'One kind, when it is dying, simply starts over.');
  // ── Crustaceans (2.65): the lobster and the mantis shrimp. Both molt and wear a carapace;
  // the lobster also has the parrot's Long Life, and the mantis shrimp the chameleon's Turret Eyes.
  S('lobster', { name: 'Lobster', lean: 'M/T', branch: 'Crustaceans', icon: '🦞',
    tagline: 'Two claws, one for crushing and one for cutting, and it never quite stops growing.' });
  S('mantis_shrimp', { name: 'Mantis Shrimp', lean: 'M/C', branch: 'Crustaceans', icon: '🦐',
    tagline: 'Punches hard enough to boil the water, and sees colours nobody else has names for.' });
  const CRUST = ['lobster','mantis_shrimp'];
  T.shareTrait('bir_life', 'lobster');
  T.shareTrait('cha_turret', 'mantis_shrimp');

  K(CRUST,'crs_molt','Molt','T',0,
    { n:'Shrug Off', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'shield', val:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Wriggle loose of a cracked plate: escape every hold and condition, and hold Shield ${1+h(P)} this round.` },
    { n:'New Shell', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:2},{v:'heal', n:(P,E)=>2+E},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`Step out of the old shell: heal ${2+E}, Cleanse, and no Weaken or Anchor from a foe for 2 rounds, and your next hit deals +${1+E}.` },
    'Too big for its own skin, so it leaves it behind.', 'Crustaceans');
  K(CRUST,'crs_carapace','Carapace','M',0,
    { n:'Plate Up', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+P, dur:1}],
      txt:(P,E)=>`Turn your plates to the blow: Shield ${2+P} this round.` },
    { n:'Spiked Plates', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+E, dur:2},{v:'thorns', val:(P,E)=>1+E, dur:2}],
      txt:(P,E)=>`Bristle every spine on the shell: for 2 rounds hold Shield ${1+E}, and anything that hits you in melee takes ${1+E}.` },
    'Armour on the outside, all of it.', 'Crustaceans');

  // Lobster: Molt, Carapace, Long Life, and these six
  K(['lobster'],'lob_crusher','Crusher Claw','M',2,
    { n:'Crush', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'stripShield', amount:1},{v:'strike', kind:'melee', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`Crack it like a shell: strip 1 Shield, then melee ${2+P}.` },
    { n:'Break Open', ap:1, el:1, cd:4, dur:0, tgt:'foe_melee',
      fx:[{v:'stripShield', amount:2},{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'execute', threshold:(P,E)=>2+E}],
      txt:(P,E)=>`Strip 2 Shield and melee ${3+E}; if that leaves it at ${2+E} hp or less, it breaks.` },
    'The big claw, slow and certain.');
  K(['lobster'],'lob_pincer','Pincer Claw','C',0,
    { n:'Nip', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Snip and hold: melee ${1+P}, and it is Anchored 1.` },
    { n:'Hold Fast', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'anchor', who:'foe', dur:2},{v:'weaken', val:1, dur:2},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Clamp on: melee ${2+E}, it is Anchored and Weakened 1 for 2 rounds, and both heroes' next hit deals +1.` },
    'The quick claw, for holding and cutting.');
  K(['lobster'],'lob_flip','Tail Flip','S',0,
    { n:'Flip Back', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true}],
      txt:(P,E)=>`Snap your tail and shoot backwards ${1+P}, through foes if need be.` },
    { n:'Gone', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E},{v:'hidden', dur:1},{v:'shield', val:(P,E)=>1+E, next:true}],
      txt:(P,E)=>`One flick and you are elsewhere: go to any node within ${2+E}, Hidden 1, and Shield: the next hit on you is ${1+E} less.` },
    'Forwards is for walking. Backwards is for getting away.');
  K(['lobster'],'lob_march','Long March','T',0,
    { n:'Single File', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'shield', val:1, dur:1, party:true, allyRange:2}],
      txt:(P,E)=>`Walk ${1+P} in line: you and an ally within 2 hold Shield 1 this round.` },
    { n:'March On', ap:1, el:1, cd:4, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>1+E},{v:'engine', kind:'regen', val:1, dur:2, party:true}],
      txt:(P,E)=>`Lead the march: move your ally ${1+E}, and both heroes heal 1 at the start of their next 2 turns.` },
    'In autumn they walk the sea floor in long lines, each touching the one ahead.');
  K(['lobster'],'lob_feelers','Long Feelers','C',0,
    { n:'Feel Out', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Sweep your feelers: see within ${2+P} (breaks Hidden, finds hidden objectives), and your next hit this turn deals +1.` },
    { n:'Taste the Water', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:2},{v:'mark', n:(P,E)=>1+E, dur:3}],
      txt:(P,E)=>`Taste one foe on the water: Revealed for 2 rounds, and it is Marked +${1+E} for 3 rounds.` },
    'Feelers longer than its body, never still.');
  K(['lobster'],'lob_den','Rock Den','M',0,
    { n:'Back In', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'anchor', who:'self', dur:1},{v:'shield', val:(P,E)=>1+P, next:true}],
      txt:(P,E)=>`Back into a crack: nothing can push or pull you this round, and Shield: the next hit on you is ${1+P} less.` },
    { n:'Hold the Den', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'anchor', who:'self', dur:2},{v:'thorns', val:(P,E)=>2+E, next:true, push:1, dur:2},{v:'shield', val:(P,E)=>1+E, dur:2}],
      txt:(P,E)=>`Claws out at the door: for 2 rounds hold Shield ${1+E} and nothing can push or pull you; Thorns: the next foe to hit you in melee takes ${2+E} and is pushed 1.` },
    'Every lobster has a hole in the rock, and will fight for it.');

  // Mantis Shrimp: Molt, Carapace, Turret Eyes, and these six
  K(['mantis_shrimp'],'msh_punch','Smasher Punch','M',2,
    { n:'Punch', ap:1, el:0, cd:2, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P}],
      txt:(P,E)=>`Club it faster than a bullet: melee ${3+P}.` },
    { n:'Cavitation', ap:1, el:1, cd:4, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'strike', kind:'area', dmg:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Punch so fast the water boils: melee ${3+E}, then the shock hits every foe beside you for ${1+h(E)}.` },
    'Two strikes from one punch: the club, then the bubble.');
  K(['mantis_shrimp'],'msh_spear','Spearer Arms','S',0,
    { n:'Spear', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>1+P}],
      txt:(P,E)=>`Shoot out a barbed arm at a foe within 2 for ${1+P}.` },
    { n:'Ambush Spear', ap:1, el:1, cd:3, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+E, revealTarget:true},{v:'force', kind:'pull', n:1}],
      txt:(P,E)=>`From the burrow, spear a foe within 2 for ${2+E}, hidden or not, and drag it 1 toward you.` },
    'Some of its kind smash. Others stab.');
  K(['mantis_shrimp'],'msh_colours','Sixteen Colours','C',0,
    { n:'See It', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'mark', nearest:true}],
      txt:(P,E)=>`See in colours no one else can: see within ${2+P}, and Mark the nearest foe (the next hit on it deals +2).` },
    { n:'Weak Spot', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:2},{v:'mark', n:(P,E)=>1+E, pierce:true}],
      txt:(P,E)=>`Find the flaw: Revealed for 2 rounds, and the next hit on it ignores Shield and deals +${1+E}.` },
    'Sixteen kinds of colour cell. We have three.');
  K(['mantis_shrimp'],'msh_burrow','Burrow','T',0,
    { n:'Dig In', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'shield', val:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Back into your burrow: Hidden 1 and Shield ${1+h(P)} this round.` },
    { n:'Door Stone', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'decoy', dur:(P,E)=>1+E, here:true},{v:'hidden', dur:1, canMove:true},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`Plug the burrow with a stone and slip out the back: a decoy holds your spot for ${1+E} ${1+E > 1 ? 'rounds' : 'round'}, you are Hidden 1 even if you move, and your next hit deals +${1+E}.` },
    'A U-shaped burrow, and it knows both doors.');
  K(['mantis_shrimp'],'msh_glow','Fluoresce','C',0,
    { n:'Signal', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:2, target:'ally'},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Flash a colour only kin can read: your ally's next hit deals +${1+h(P)}, and Shield: the next hit on you is 1 less.` },
    { n:'Warning Glow', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+E, area:'adj'},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Glow a warning: foes beside you are Weakened 1 for ${1+E} ${1+E > 1 ? 'rounds' : 'round'}, and both heroes' next hit deals +1.` },
    'A patch that glows, for talking and for warning.');
  K(['mantis_shrimp'],'msh_ritual','Ritual Fight','M',0,
    { n:'Square Up', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:1, dur:1},{v:'thorns', val:(P,E)=>1+P, next:true, dur:2}],
      txt:(P,E)=>`Raise your tail plate like a shield: Shield 1 this round, and Thorns: the next foe to hit you in melee within 2 rounds takes ${1+P}.` },
    { n:'Tail Shield', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'shield', next:true, val:(P,E)=>2+E, reflect:(P,E)=>E},{v:'thorns', val:(P,E)=>1+E, next:true, push:1, dur:2}],
      txt:(P,E)=>`Take it on the tail plate: Shield: Shield: the next hit on you is ${2+E} less and ${E} of it bounces back; Thorns: the next foe to hit you in melee takes ${1+E} and is pushed 1.` },
    'They fight by taking turns to hit each other on the tail, and the tail can take it.');
  // ── Insects and arachnids (2.66): the Grasshopper (an unpainted clade) moves onto the branch and lends
  // its Exoskeleton, Compound Eyes, Molt and Glide Wings; every insect here also has Antennae.
  T.SPECIES.hopper.branch = 'Insects and arachnids';
  S('beetle', { name: 'Beetle', lean: 'M/T', branch: 'Insects and arachnids', icon: '🪲',
    tagline: 'Armoured wing cases, a horn for lifting, and strength far past its size.' });
  S('butterfly', { name: 'Butterfly', lean: 'S/T', branch: 'Insects and arachnids', icon: '🦋',
    tagline: 'Eyes painted on its wings, dust that slips any grip, and a journey longer than its life.' });
  S('firefly', { name: 'Firefly', lean: 'C/S', branch: 'Insects and arachnids', icon: '✨',
    tagline: 'Cold light in the dark, flashing in time with the others, and bitter to anything that bites.' });
  S('mantis', { name: 'Praying Mantis', lean: 'M/C', branch: 'Insects and arachnids', icon: '🦗',
    tagline: 'Still as a leaf, turns its head to watch you, and strikes before you see it move.' });
  S('scorpion', { name: 'Scorpion', lean: 'M/C', branch: 'Insects and arachnids', icon: '🦂',
    tagline: 'Pincers in front, a sting overhead, and it glows under the right light.' });
  const BUGS = ['beetle','butterfly','firefly','mantis'];
  T.shareTrait('hop_exo', 'beetle', 'firefly', 'mantis', 'scorpion');
  T.shareTrait('hop_eyes', ...BUGS);
  T.shareTrait('hop_glide', 'butterfly');
  T.shareTrait('hop_molt', 'scorpion');
  T.shareTrait('cra_migrate', 'butterfly');
  T.shareTrait('hed_venom', 'scorpion');

  K(BUGS,'ins_antennae','Antennae','C',0,
    { n:'Feel the Air', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+P, dur:1},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Feel the air: see within ${1+P} (breaks Hidden, finds hidden objectives), and Shield: the next hit on you is 1 less.` },
    { n:'Scent Trail', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:2},{v:'mark', n:(P,E)=>1+h(E), dur:3},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Smell out one foe: Revealed for 2 rounds, it is Marked +${1+h(E)} for 3 rounds, and your ally's next hit deals +1.` },
    'Two feelers that taste, smell and listen all at once.', 'Insects and arachnids');

  // Beetle: Exoskeleton, Compound Eyes, Antennae, and these six
  K(['beetle'],'btl_horn','Horn Lift','M',2,
    { n:'Lever', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Get your horn under it: melee ${2+P}, and push it 1.` },
    { n:'Flip', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'force', kind:'push', n:(P,E)=>1+h(E)},{v:'weaken', val:1, dur:2}],
      txt:(P,E)=>`Flip it on its back: melee ${2+E}, push it ${1+h(E)}, and it is Weakened 1 for 2 rounds.` },
    'It lifts a hundred times its weight, and then it throws it.');
  K(['beetle'],'btl_elytra','Wing Cases','T',0,
    { n:'Close Up', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'cleanse', ward:1},{v:'shield', val:(P,E)=>1+P, dur:1}],
      txt:(P,E)=>`Snap your wing cases shut: Shield ${1+P}, and Cleanse, and no Weaken or Anchor from a foe this round.` },
    { n:'Lift Off', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E, height:true},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Open the cases and fly, clumsily, to any node within ${2+E}, height included; Shield 1 this round.` },
    'Hard wings over soft ones.');
  K(['beetle'],'btl_roll','Ball Roller','S',0,
    { n:'Roll', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'force', kind:'push', n:1, area:true, radius:1},{v:'move', n:(P,E)=>1+P}],
      txt:(P,E)=>`Shove your ball through: foes beside you are pushed back 1, then you roll ${1+P}.` },
    { n:'By the Stars', ap:0, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>3+E, dur:1},{v:'engine', kind:'ap', val:1, dur:1},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Steer by the stars: see within ${3+E}, gain 1 AP at the start of your next turn, and hazards can't touch you this round.` },
    'It rolls in a straight line, steering by the Milky Way.');
  K(['beetle'],'btl_spray','Bombardier Spray','C',0,
    { n:'Pop', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>1+P},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Spray boiling chemicals at a foe within 2: ${1+P}, and it is Weakened 1.` },
    { n:'Boiling Burst', ap:1, el:1, cd:4, dur:0, tgt:'node_r2',
      fx:[{v:'wound', n:(P,E)=>2+h(E), kind:'scald', area:'nodeArea'},{v:'weaken', val:1, dur:2, area:'adj'}],
      txt:(P,E)=>`Burst at a node within 2: every foe on or beside it is scalded: Wounded ${2+h(E)}; foes beside you are Weakened 1 for 2 rounds.` },
    'Two chemicals, mixed at the last moment, at boiling point.');
  K(['beetle'],'btl_strong','Strong Back','M',0,
    { n:'Dig In', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'anchor', who:'self', dur:1},{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:1}],
      txt:(P,E)=>`Set your six legs: nothing can push or pull you this round, and your next hit this turn deals +${1+h(P)}.` },
    { n:'Carry', ap:1, el:1, cd:3, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>1+E},{v:'shield', val:(P,E)=>1+E, dur:1, party:true}],
      txt:(P,E)=>`Shoulder your ally: move them ${1+E}, and both heroes hold Shield ${1+E} this round.` },
    'Pound for pound, nothing alive is stronger.');
  K(['beetle'],'btl_dead','Play Dead','T',0,
    { n:'Drop', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'shield', val:(P,E)=>1+P, next:true}],
      txt:(P,E)=>`Fall over, legs up: Hidden 1, and Shield: the next hit on you is ${1+P} less.` },
    { n:'Not Dead Yet', ap:1, el:1, cd:5, dur:3, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>2+2*E, ward:3}],
      txt:(P,E)=>`You were only pretending: hold a Heal; if you are downed within 3 rounds, Heal ${2+2*E} at once (you get up).` },
    'Lie still long enough and the bird goes away.');

  // Butterfly: Compound Eyes, Antennae, Glide Wings, Migration, and these five
  K(['butterfly'],'but_eyespots','Eyespots','C',2,
    { n:'Flash Eyes', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'adj'},{v:'shield', val:(P,E)=>1+h(P), next:true}],
      txt:(P,E)=>`Open your wings on two great eyes: foes beside you are Weakened 1, and Shield: the next hit on you is ${1+h(P)} less.` },
    { n:'Owl Face', ap:0, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'force', kind:'push', n:1, area:true, radius:(P,E)=>1+h(E)},{v:'weaken', val:1, dur:2, area:'adj'},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Show the face of an owl: foes within ${1+h(E)} flinch back 1, foes beside you are Weakened 1 for 2 rounds, and your ally's next hit deals +1.` },
    'Two eyes that are not eyes, and they work anyway.');
  K(['butterfly'],'but_scales','Dust Scales','S',0,
    { n:'Slip', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'cleanse'},{v:'move', n:(P,E)=>1+P}],
      txt:(P,E)=>`Leave a puff of dust in its grip: escape every hold and condition, and move ${1+P}.` },
    { n:'Dust Cloud', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1, party:true, radius:1},{v:'shield', val:(P,E)=>1+E, next:true}],
      txt:(P,E)=>`Shake out a cloud of scales: heroes on or beside your node are Hidden 1, and Shield: the next hit on you is ${1+E} less.` },
    'Wings made of tiny tiles, and they come off in your fingers.');
  K(['butterfly'],'but_sip','Proboscis','T',0,
    { n:'Sip', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P}],
      txt:(P,E)=>`Uncoil your tongue and drink: heal ${1+P}.` },
    { n:'Nectar Share', ap:0, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>1+E, party:true},{v:'cleanse'}],
      txt:(P,E)=>`Find a flower for two: both heroes heal 1 at the start of each turn for ${1+E} ${1+E > 1 ? 'rounds' : 'round'}, and you shake off every condition.` },
    'A drinking straw, coiled like a watch spring.');
  K(['butterfly'],'but_flutter','Erratic Flight','S',0,
    { n:'Flutter', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true}],
      txt:(P,E)=>`Flit ${1+P} this way and that, past foes.` },
    { n:'Zigzag', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'blink', reach:(P,E)=>2+E},{v:'shield', val:(P,E)=>2+E, next:true}],
      txt:(P,E)=>`Zigzag where no one can follow: go to any node within ${2+E}, and Shield: the next hit on you is ${2+E} less.` },
    'No bird can guess where it will be next.');
  K(['butterfly'],'but_morph','Metamorphosis','T',0,
    { n:'Change', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'shield', val:1, dur:1},{v:'empower', val:(P,E)=>1+P, uses:1, dur:2}],
      txt:(P,E)=>`Feel the change coming: Shield 1 this round, and your next hit deals +${1+P}.` },
    { n:'Chrysalis', ap:1, el:1, cd:5, dur:0, tgt:'self',
      fx:[{v:'stasis', dur:1},{v:'heal', n:(P,E)=>2+E},{v:'empower', val:(P,E)=>2+E, uses:1, dur:3}],
      txt:(P,E)=>`Seal yourself in a chrysalis: heal ${2+E}, nothing can touch you until your next turn, and you come out with +${2+E} on your next hit.` },
    'Go in one thing, come out another.');

  // Firefly: Exoskeleton, Compound Eyes, Antennae, and these six
  K(['firefly'],'ffl_flash','Flash','C',2,
    { n:'Blink', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'mark', nearest:true}],
      txt:(P,E)=>`Flash your light: see within ${2+P}, and Mark the nearest foe (the next hit on it deals +2).` },
    { n:'Dazzle', ap:0, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:(P,E)=>1+h(E), dur:2, area:'adj'},{v:'reveal', radius:(P,E)=>2+E, dur:1}],
      txt:(P,E)=>`Flare bright: foes beside you are Weakened ${1+h(E)} for 2 rounds, and you see within ${2+E}.` },
    'A light with no heat in it.');
  K(['firefly'],'ffl_sync','Synchrony','T',0,
    { n:'In Time', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:2, party:true}],
      txt:(P,E)=>`Flash in time with your ally: both heroes' next hit deals +${1+h(P)}.` },
    { n:'All at Once', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'ap', val:1, dur:1, party:true},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true}],
      txt:(P,E)=>`The whole field flashes at once: both heroes gain 1 AP at the start of their next turn, and both heroes' next hit deals +${1+E}.` },
    'Thousands of them, blinking together, all night.');
  K(['firefly'],'ffl_lure','False Signal','S',0,
    { n:'Wrong Code', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'force', kind:'pull', n:1},{v:'strike', kind:'melee', dmg:(P,E)=>1+P, ifAdjacent:true}],
      txt:(P,E)=>`Flash the wrong code at a foe within 2 and draw it 1 closer; if it ends beside you, it takes ${1+P}.` },
    { n:'Lantern', ap:1, el:1, cd:3, dur:0, tgt:'node_r3',
      fx:[{v:'decoy', dur:(P,E)=>1+E},{v:'hidden', dur:1}],
      txt:(P,E)=>`Hang a false light on a node within 3: foes treat it as a hero for ${1+E} ${1+E > 1 ? 'rounds' : 'round'}, and you go dark (Hidden 1).` },
    'Some fireflies copy another kind\'s signal, and eat whoever answers.');
  K(['firefly'],'ffl_bitter','Bitter Blood','M',0,
    { n:'Bad Taste', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>1+P, dur:1}],
      txt:(P,E)=>`Taste foul: anything that hits you in melee this round takes ${1+P}.` },
    { n:'Reflex Bleed', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>1+E, dur:2},{v:'weaken', val:1, dur:2, area:'adj'},{v:'shield', val:1, dur:2}],
      txt:(P,E)=>`Bleed bitter from the joints: for 2 rounds hold Shield 1, anything that hits you in melee takes ${1+E}, and foes beside you are Weakened 1.` },
    'Birds learn quickly what a firefly tastes like.');
  K(['firefly'],'ffl_larva','Glow-Worm Bite','M',0,
    { n:'Bite', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`Bite with the jaws you had as a larva: melee ${2+P}.` },
    { n:'Numbing Bite', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'wound', n:2, kind:'venom'},{v:'weaken', val:1, dur:2}],
      txt:(P,E)=>`Bite and numb: melee ${2+E}; it is Wounded 2 and is Weakened 1 for 2 rounds.` },
    'As a grub it hunts snails, and it numbs them first.');
  K(['firefly'],'ffl_dark','Cold Light','S',0,
    { n:'Go Dark', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'hidden', dur:1}],
      txt:(P,E)=>`Switch off and drift ${1+P}: Hidden 1.` },
    { n:'Night Field', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1, party:true, radius:2},{v:'reveal', radius:(P,E)=>2+E, dur:1}],
      txt:(P,E)=>`Among a thousand lights no one can pick yours out: heroes within 2 of you are Hidden 1, and you see within ${2+E}.` },
    'When every light blinks, none of them is the one.');

  // Praying Mantis: Exoskeleton, Compound Eyes, Antennae, and these six
  K(['mantis'],'man_strike','Raptorial Strike','M',2,
    { n:'Snatch', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Snatch it in spiked arms: melee ${2+P}, and it is Anchored 1.` },
    { n:'Lightning Grab', ap:1, el:1, cd:3, dur:0, tgt:'foe_r2',
      fx:[{v:'force', kind:'pull', n:1},{v:'strike', kind:'melee', dmg:(P,E)=>3+E, ifAdjacent:true},{v:'anchor', who:'foe', dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Reach out faster than it can blink: draw a foe within 2 one closer; if it ends beside you it takes ${3+E} and is Anchored ${1+h(E)}.` },
    'Arms folded as if in prayer, and lined with spikes.');
  K(['mantis'],'man_still','Hold Still','T',0,
    { n:'Wait', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:2}],
      txt:(P,E)=>`Do nothing at all: Hidden 1, and your next hit within 2 rounds deals +${1+h(P)}.` },
    { n:'Patience', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'empower', val:(P,E)=>2+E, uses:1, dur:2},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Wait as long as it takes: Hidden 1, Shield: the next hit on you is 1 less, and your next hit within 2 rounds deals +${2+E}.` },
    'It can wait all day. It usually does.');
  K(['mantis'],'man_sway','Leaf Sway','S',0,
    { n:'Sway', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'shield', val:1, next:true}],
      txt:(P,E)=>`Rock like a leaf in the wind and step ${1+P}; Shield: the next hit on you is 1 less.` },
    { n:'Just a Twig', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+E},{v:'hidden', dur:(P,E)=>1+h(E), canMove:true}],
      txt:(P,E)=>`Move ${1+E} like a twig in a breeze: Hidden ${1+h(E)}, even if you move again.` },
    'It sways, so it looks like the leaves around it.');
  K(['mantis'],'man_head','Swivel Head','C',0,
    { n:'Turn and Look', ap:1, el:0, cd:1, dur:0, tgt:'foe_any',
      fx:[{v:'mark', n:1, dur:3},{v:'reveal', radius:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Turn your head to watch one foe: it is Marked +1 for 3 rounds, and you see within ${1+h(P)}.` },
    { n:'Measure', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:2},{v:'mark', n:(P,E)=>1+E, pierce:true}],
      txt:(P,E)=>`Judge the distance exactly: Revealed for 2 rounds, and the next hit on it ignores Shield and deals +${1+E}.` },
    'The only insect that looks over its shoulder.');
  K(['mantis'],'man_wings','Startle Display','C',0,
    { n:'Rear Up', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'adj'},{v:'shield', val:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Rear up and spread your arms: foes beside you are Weakened 1, and you hold Shield ${1+h(P)} this round.` },
    { n:'Wings Wide', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'force', kind:'push', n:1, area:true, radius:1},{v:'weaken', val:1, dur:2, area:'adj'},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`Throw open bright wings: foes beside you are pushed back 1 and Weakened 1 for 2 rounds, and your next hit deals +${1+E}.` },
    'Suddenly much bigger, and much brighter.');
  K(['mantis'],'man_flower','Flower Lure','S',0,
    { n:'Bloom', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'force', kind:'pull', n:1},{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:1}],
      txt:(P,E)=>`Look like a flower: draw a foe within 2 one closer, and your next hit this turn deals +${1+h(P)}.` },
    { n:'Orchid', ap:1, el:1, cd:4, dur:0, tgt:'node_r3',
      fx:[{v:'decoy', dur:(P,E)=>1+E},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Become an orchid, or seem to, at a node within 3: foes treat it as a hero for ${1+E} ${1+E > 1 ? 'rounds' : 'round'}, and both heroes' next hit deals +${1+E}.` },
    'Some mantises are flowers. Insects come to them.');

  // Scorpion: Exoskeleton, Molt, Venom Shrug, and these six
  K(['scorpion'],'sco_sting','Tail Sting','M',2,
    { n:'Sting', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'wound', n:2, kind:'venom'}],
      txt:(P,E)=>`Arch your tail and sting: melee ${1+P}; it is Wounded 2.` },
    { n:'Full Dose', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'wound', n:(P,E)=>2+h(E), kind:'venom'},{v:'weaken', val:1, dur:2}],
      txt:(P,E)=>`Spend the venom: melee ${2+E}; it is Wounded ${2+h(E)} and is Weakened 1 for 2 rounds.` },
    'The tail is the last thing it uses, and the worst.');
  K(['scorpion'],'sco_pincers','Pincers','M',0,
    { n:'Grab', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Grab it with both claws: melee ${1+P}, and it is Anchored 1.` },
    { n:'Hold and Sting', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'anchor', who:'foe', dur:2},{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`Pin it in the claws: it is Anchored 2, takes ${2+E} in melee, and your next hit deals +${1+E}.` },
    'Hold it still first.');
  K(['scorpion'],'sco_glow','Moonglow','C',0,
    { n:'Glint', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+P, dur:1},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Your shell catches the moonlight: see within ${1+P}, and hold Shield 1 this round.` },
    { n:'Moon Sense', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>3+E, dur:1},{v:'hazardImmune', dur:2},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Your whole shell drinks the light: see within ${3+E}, hazards can't touch you for 2 rounds, and both heroes' next hit deals +1.` },
    'Under the moon its shell glows blue-green, and no one knows quite why.');
  K(['scorpion'],'sco_sense','Sand Sense','C',0,
    { n:'Feel the Ground', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'mark', nearest:true},{v:'shield', val:(P,E)=>1+h(P), next:true}],
      txt:(P,E)=>`Feel the footsteps through your legs: Mark the nearest foe (the next hit on it deals +2), and Shield: the next hit on you is ${1+h(P)} less.` },
    { n:'Every Step', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', target:true, dur:(P,E)=>2+E},{v:'mark', n:1, dur:3},{v:'link', within:2, dur:2}],
      txt:(P,E)=>`Read one foe through the ground: Revealed for ${2+E} rounds, it is Marked +1 for 3 rounds, and it is Linked to the nearest foe within 2 of it for 2 rounds.` },
    'Tiny slits in its legs hear the sand move.');
  K(['scorpion'],'sco_burrow','Burrow','T',0,
    { n:'Under', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'shield', val:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Wriggle under the sand: Hidden 1 and Shield ${1+h(P)} this round.` },
    { n:'Ambush', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+h(E), canMove:true},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Wait under the sand: Hidden ${1+h(E)} even if you move, hazards can't touch you this round, and your next hit deals +${1+E}.` },
    'Only the claws show, and only just.');
  K(['scorpion'],'sco_brood','Brood Carry','T',0,
    { n:'Shelter', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+h(P), dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`Shelter what is close: you and an ally beside you hold Shield ${1+h(P)} this round.` },
    { n:'Carry Them', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+E, dur:2, party:true, allyRange:2},{v:'engine', kind:'regen', val:1, dur:2, party:true}],
      txt:(P,E)=>`Carry them on your back: for 2 rounds you and an ally within 2 hold Shield ${1+E}, and both heroes heal 1 at the start of each turn.` },
    'The young ride on their mother\'s back until their first molt.');
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
