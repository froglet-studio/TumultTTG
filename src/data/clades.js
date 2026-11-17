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
      fx:[{v:'teleport', reach:(P,E)=>2+E, height:true},{v:'shield', val:1, dur:1, party:true, allyRange:1}],
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
    { n:'Arm Span', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'morph', bonus:1, reach:1, dur:(P,E)=>1+E}],
      txt:(P,E)=>`For ${1+E} rounds your melee reaches 2 nodes and your strikes deal +1.` },
    'Arms that span a river.');
  K(['orangutan'],'ora_leaf','Leaf Shelter','T',0,
    { n:'Leaf Roof', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`You and an adjacent ally hold Shield ${1+P} this round.` },
    { n:'Rain Shelter', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'hazardImmune', dur:(P,E)=>1+E, party:true},{v:'heal', n:1, party:true}],
      txt:(P,E)=>`Both heroes ignore hazards for ${1+E} rounds and heal 1.` },
    'A leaf the size of a roof.');
  K(['orangutan'],'ora_study','Patient Study','T',0,
    { n:'Watch', ap:1, el:0, cd:2, dur:0, tgt:'foe_any',
      fx:[{v:'studied', n:(P,E)=>1+h(P)},{v:'mark'}],
      txt:(P,E)=>`Study a foe: your hits on it deal +${1+h(P)} from now on, and the next hit on it deals +2.` },
    { n:'Outthink', ap:1, el:1, cd:3, dur:2, tgt:'self',
      fx:[{v:'preempt', val:(P,E)=>2+E, reflect:0, reposition:1}],
      txt:(P,E)=>`The next hit on you is −${2+E}, and you slip 1 node when it lands. Dur 2.` },
    'It watches before it moves.');
  K(['orangutan'],'ora_memory','Fruit Memory','C',0,
    { n:'Recall', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+P, dur:2},{v:'heal', n:1}],
      txt:(P,E)=>`Remember where everything was: reveal everything within ${1+P} nodes for 2 rounds, and heal 1 from a remembered meal.` },
    { n:'Mental Map', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'draw', face:'AP', n:1},{v:'hasten', n:(P,E)=>1+E}],
      txt:(P,E)=>`Draw 1 pool die as AP, and every card on your track returns ${1+E} columns sooner.` },
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
      fx:[{v:'zone', kind:'spore', radius:1, dur:2, dmg:1, weaken:1, hideHeroes:false, remote:(P,E)=>2+E}],
      txt:(P,E)=>`Foul a node within ${2+E} and its neighbours for 2 rounds: foes ending there take 1 and are Weakened 1.` },
    'The tail is a weapon of sorts.');
  K(['lemur'],'lem_scent','Scent Mark','S',0,
    { n:'Mark Ground', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+P, dur:2},{v:'locate', nearest:true, dur:2},{v:'mark', nearest:true}],
      txt:(P,E)=>`Reveal within ${1+P} for 2 rounds; the nearest foe can't Hide for 2 rounds and is Marked (the next hit on it deals +2).` },
    { n:'Territory', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+E, area:'radius', radius:2}],
      txt:(P,E)=>`Every foe within 2 is Weakened 1 for ${1+E} rounds.` },
    'This branch is ours.');
  K(['lemur'],'lem_tail','Tail Signal','T',0,
    { n:'Wave', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hasten', n:1},{v:'reroll', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Every card on your track returns 1 column sooner, and reroll ${1+h(P)} banked ${1+h(P) > 1 ? 'dice' : 'die'}.` },
    { n:'Rally Flag', ap:1, el:1, cd:4, dur:2, tgt:'party',
      fx:[{v:'preempt', val:(P,E)=>2+E, reflect:0, party:true}],
      txt:(P,E)=>`Tail high, the troop braces: both heroes' next hit taken is −${2+E}. Dur 2.` },
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
    { n:'Fangs', ap:1, el:0, cd:0, dur:0, tgt:'foe_melee',
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
    { n:'Hoard', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'mint', face:'O', n:1},{v:'mint', face:'AP', n:(P,E)=>1+E}],
      txt:(P,E)=>`Mint 1 temporary Omni and ${1+E} temporary AP.` },
    'Snacks for later, and later is now.');
  K(['mandrill'],'man_charge','Ground Charge','M',0,
    { n:'Rush', ap:1, el:0, cd:0, dur:0, tgt:'foe_r2',
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
      fx:[{v:'teleport', reach:(P,E)=>2+E, dest:'adjTarget', height:true},{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Leap beside a foe within ${2+E}, height included, melee ${3+E}, and pin it: Anchored 1.` },
    'All four feet leave the ground at once.', 'Cats');
  K(CATS_CLAWED,'cat_claws','Retractable Claws','M',0,
    { n:'Unsheathe', ap:1, el:0, cd:0, dur:0, tgt:'foe_melee',
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
      fx:[{v:'hidden', dur:(P,E)=>1+E, canMove:true},{v:'ambushTrap', dmg:(P,E)=>3+E, dur:2}],
      txt:(P,E)=>`Hide for ${1+E} rounds, moving freely, and lie in wait: the first foe to close takes ${3+E}.` },
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
      fx:[{v:'preempt', val:(P,E)=>1+h(P), reflect:0},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`The next hit on you is ${1+h(P)} less, and hazards don't touch you this round.` },
    { n:'Nine Lives', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'statusImmune', dur:(P,E)=>1+E},{v:'hazardImmune', dur:(P,E)=>1+E},{v:'heal', n:1}],
      txt:(P,E)=>`For ${1+E} rounds no foe can Weaken or Root you and hazards don't touch you; heal 1.` },
    'Whatever way up you are dropped.', 'Cats');

  // Tufted Ears: the lynx and the caracal, ears tipped with black to catch sound
  K(['lynx','caracal'],'cat_tufts','Tufted Ears','S',0,
    { n:'Listen', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'locate', nearest:true, dur:2},{v:'studied', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Hear the nearest foe, hidden or not: it is Located for 2 rounds and your hits on it deal +${1+h(P)}.` },
    { n:'Sound Map', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:99, dur:(P,E)=>1+E},{v:'mark', area:true, radius:(P,E)=>1+E}],
      txt:(P,E)=>`Hear the whole field for ${1+E} rounds; every foe within ${1+E} is Marked.` },
    'Two black tufts, two antennae.');

  // Eurasian lynx: the six cat traits, Tufted Ears, and these two
  K(['lynx'],'lyn_snowshoe','Snowshoe Paws','S',0,
    { n:'Snowshoe', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Move ${2+P}; hazards don't touch you for 2 rounds.` },
    { n:'Deep Snow', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'hazardImmune', dur:(P,E)=>1+E, party:true},{v:'weaken', val:1, dur:(P,E)=>1+E, area:'adjParty'}],
      txt:(P,E)=>`Both heroes ignore hazards for ${1+E} rounds; every foe beside either of you is Weakened 1 for ${1+E}.` },
    'Paws as wide as snowshoes, furred underneath.');
  K(['lynx'],'lyn_ghost','Snow Ghost','T',2,
    { n:'Fade', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+h(P), canMove:true},{v:'empower', val:1, uses:1, dur:2}],
      txt:(P,E)=>`Hide for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}, moving freely; your next strike deals +1.` },
    { n:'Ghost Strike', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>2+E, dest:'adjTarget'},{v:'strike', kind:'melee', dmg:(P,E)=>3+E, pierce:true},{v:'hidden', dur:1}],
      txt:(P,E)=>`Appear beside a foe within ${2+E}, melee ${3+E} through its Shield, and vanish again: Hidden 1.` },
    'Seen once, if at all.');

  // Caracal: the six cat traits, Tufted Ears, and these two
  K(['caracal'],'car_swat','Sky Swat','C',2,
    { n:'Swat', ap:1, el:0, cd:0, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+P},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Spring and swat a foe within 2 for ${2+P}; it is Weakened 1 this round.` },
    { n:'Snatch', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'force', kind:'pull', n:(P,E)=>1+E},{v:'strike', kind:'melee', dmg:(P,E)=>2+E, ifAdjacent:true},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Hook a foe within 3 and drag it ${1+E} toward you; if it lands beside you, melee ${2+E}. It is Anchored 1.` },
    'Birds three metres up are not safe.');
  K(['caracal'],'car_leap','Vertical Leap','S',0,
    { n:'Spring', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>2+P},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`Jump to any node within ${2+P}, height included; the next hit on you is 1 less.` },
    { n:'Sky Leap', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>2+E, height:true},{v:'strike', kind:'area', dmg:(P,E)=>1+E}],
      txt:(P,E)=>`Leap to any node within ${2+E}, height included, landing on every foe beside it for ${1+E}.` },
    'Straight up, from standing.');

  // Ocelot: the six cat traits and these three
  K(['ocelot'],'oce_rosette','Rosette Cloak','T',2,
    { n:'Dapple', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+h(P), canMove:true},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`Melt into broken light: Hidden ${1+h(P)}, moving freely, and the next hit on you is 1 less.` },
    { n:'Leaf Light', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:(P,E)=>1+E, party:true, radius:2},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`You and an ally within 2 are Hidden for ${1+E} rounds; both heroes' next strike deals +1.` },
    'Spots that are shadows that are spots.');
  K(['ocelot'],'oce_descent','Headfirst Descent','S',0,
    { n:'Descend', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'strike', kind:'area', dmg:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Climb up to ${1+P}, height included, and drop on every foe beside where you land for ${1+h(P)}.` },
    { n:'Branch Drop', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>2+E, dest:'adjTarget', height:true},{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Drop beside a foe within ${2+E}, melee ${3+E}, and it is Weakened 1.` },
    'Down the trunk face first, ankles turned backwards.');
  K(['ocelot'],'oce_prowl','Night Prowl','T',0,
    { n:'Prowl', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P, noTrap:true},{v:'hidden', dur:1}],
      txt:(P,E)=>`Move ${2+P} without setting off traps, and end Hidden 1.` },
    { n:'Night Shift', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hasten', n:(P,E)=>1+E},{v:'reveal', radius:2, dur:1}],
      txt:(P,E)=>`Every card on your track returns ${1+E} columns sooner; see within 2 this round.` },
    'Asleep all day, busy all night.');

  // Tiger: the six cat traits and these three
  K(['tiger'],'tig_roar','Roar','C',2,
    { n:'Roar', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:(P,E)=>1+h(P), dur:1, area:'adj'},{v:'force', kind:'push', n:1, area:true}],
      txt:(P,E)=>`Every foe beside you is Weakened ${1+h(P)} this round and knocked back 1.` },
    { n:'Thunder', ap:2, el:1, cd:4, dur:0, tgt:'self',
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
      fx:[{v:'studied', n:(P,E)=>1+h(P)},{v:'hidden', dur:1}],
      txt:(P,E)=>`Watch a foe within 3 from the grass: your hits on it deal +${1+h(P)}, and you are Hidden 1.` },
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
      fx:[{v:'move', n:4, exact:true, ignoreFoes:true},{v:'empower', val:(P,E)=>2+E, uses:1, dur:1},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`Run exactly 4, past foes; your next strike this turn deals +${2+E}, and the next hit on you is 1 less.` },
    'Nought to anything in three strides. But only in a straight line.');
  K(['cheetah'],'che_rudder','Tail Rudder','S',0,
    { n:'Swerve', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`Cut ${1+P} sideways; the next hit on you is 1 less.` },
    { n:'Hairpin', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'preempt', val:(P,E)=>2+E, reflect:0, reposition:1},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Ready to turn on a tail: the next hit on you is ${2+E} less and you dodge a step away from it. Step 1 now.` },
    'A long tail, for turning.');
  K(['cheetah'],'che_tear','Tear Marks','C',0,
    { n:'Focus', ap:1, el:0, cd:1, dur:0, tgt:'foe_los',
      fx:[{v:'locate', dur:2},{v:'studied', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Fix a foe in sight: it is Located for 2 rounds and your hits on it deal +${1+h(P)}.` },
    { n:'Long Look', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'locate', dur:(P,E)=>2+E},{v:'studied', n:(P,E)=>1+E},{v:'mark'}],
      txt:(P,E)=>`Pick out any foe: Located for ${2+E} rounds, Marked, and your hits on it deal +${1+E}.` },
    'Dark lines that keep the sun out of the eyes.');
  K(['cheetah'],'che_claws','Sprinter\'s Claws','M',0,
    { n:'Kick Off', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Move ${2+P}; your next strike this turn deals +1.` },
    { n:'Dig In', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'anchor', who:'self', dur:(P,E)=>1+E},{v:'shield', val:(P,E)=>1+E, dur:1},{v:'draw', face:'AP', n:1}],
      txt:(P,E)=>`Claws in: you can't be pushed or pulled for ${1+E} rounds, hold Shield ${1+E} this round, and draw 1 die as AP.` },
    'Claws that never sheathe: cleats, not knives.');
  K(['cheetah'],'che_trip','Trip','M',0,
    { n:'Trip', ap:1, el:0, cd:0, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'slow', dur:1}],
      txt:(P,E)=>`Hook a leg: melee ${1+P}, and it cannot move next round.` },
    { n:'Tumble', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'slow', dur:(P,E)=>1+h(E)},{v:'weaken', val:1, dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Melee ${2+E}; it cannot move and is Weakened 1 for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}.` },
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
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'locate', nearest:true, dur:2},{v:'mark', nearest:true}],
      txt:(P,E)=>`Smell out everything within ${2+P} this round; the nearest foe can't Hide for 2 rounds and is Marked (the next hit on it deals +2).` },
    { n:'Scent Lock', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'locate', dur:99},{v:'studied', n:(P,E)=>E}],
      txt:(P,E)=>`Lock onto a foe's scent: it can't Hide for the rest of the mission, and your hits on it deal +${E}.` },
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
    { n:'Trot', ap:1, el:0, cd:0, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P}],
      txt:(P,E)=>`Move ${2+P}.` },
    { n:'Relay', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:2},{v:'hasten', n:(P,E)=>1+E}],
      txt:(P,E)=>`Move 2; every card on your track returns ${1+E} columns sooner.` },
    'Not fast. Just never stopping.', 'Dogs and hyenas');
  K(DOGS,'dog_pin','Pin Down','M',0,
    { n:'Pin', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Melee ${2+P}, and it is Anchored 1.` },
    { n:'Hold Down', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+E},{v:'anchor', who:'foe', dur:(P,E)=>1+h(E), held:true},{v:'weaken', val:1, dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Melee ${1+E}; hold it down: Anchored, unable to blink, and Weakened 1, for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}.` },
    'Paws on its back, all your weight behind them.', 'Dogs and hyenas');

  // the two foxes
  K(['fennec','fox'],'fox_pounce','Mousing Pounce','M',0,
    { n:'Snow Dive', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+P, revealTarget:true},{v:'studied', n:1}],
      txt:(P,E)=>`Dive on a foe within 2 for ${2+P}, hidden or not, and your hits on it deal +1 after.` },
    { n:'High Arc', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>2+E, dest:'adjTarget', height:true},{v:'strike', kind:'melee', dmg:(P,E)=>3+E, revealTarget:true}],
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
      fx:[{v:'reveal', radius:99, dur:(P,E)=>1+E},{v:'preempt', val:1, reflect:0, party:true}],
      txt:(P,E)=>`The whole field answers for ${1+E} rounds: everything is seen, and both heroes' next hit taken is 1 less.` },
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
    { n:'Under the Sand', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'reveal', radius:99, dur:(P,E)=>1+E},{v:'preempt', val:(P,E)=>1+h(E), reflect:0}],
      txt:(P,E)=>`Hear the whole field for ${1+E} rounds; the next hit on you is ${1+h(E)} less.` },
    'Half of the fox is ear.');
  K(['fennec'],'fen_thrift','Desert Thrift','T',0,
    { n:'Ration', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+h(P)},{v:'hasten', n:1}],
      txt:(P,E)=>`Heal ${1+h(P)}; every card on your track returns 1 column sooner.` },
    { n:'Long Dry', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'ap', val:1, dur:(P,E)=>1+E},{v:'heal', n:1}],
      txt:(P,E)=>`For ${1+E} rounds you gain 1 AP at the start of each turn; heal 1.` },
    'Never drinks. Doesn\'t need to.');
  K(['fennec'],'fen_night','Night Trot','S',0,
    { n:'Night Trot', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P, noTrap:true},{v:'reveal', radius:1, dur:1}],
      txt:(P,E)=>`Move ${2+P} without setting off traps, seeing what is beside you as you go.` },
    { n:'Moon Run', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+E, canMove:true},{v:'move', n:2, free:true}],
      txt:(P,E)=>`Hide for ${1+E} rounds, moving freely, and run 2 now.` },
    'Out at dusk, home by dawn, and nobody saw.');

  // Red fox: the dogs' four, the foxes' two, and these three
  K(['fox'],'fox_magnet','Magnetic Sense','S',0,
    { n:'Line Up', ap:1, el:0, cd:1, dur:0, tgt:'foe_any',
      fx:[{v:'locate', dur:(P,E)=>2+P},{v:'studied', n:1}],
      txt:(P,E)=>`Line up on any foe: it can't Hide for ${2+P} rounds, and your hits on it deal +1.` },
    { n:'North Leap', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>3+E, dest:'adjTarget'},{v:'strike', kind:'melee', dmg:(P,E)=>2+E}],
      txt:(P,E)=>`Leap the long way to beside a foe within ${3+E}, and land on it for ${2+E}.` },
    'It pounces facing north, and it hits more often that way.');
  K(['fox'],'fox_cunning','Cunning','T',2,
    { n:'Read It', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P)},{v:'studied', n:1}],
      txt:(P,E)=>`Work out a foe within 3: Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}, and your hits on it deal +1.` },
    { n:'Outfox', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'preempt', val:(P,E)=>1+E, reflect:0, party:true},{v:'freecast', n:1, dur:1}],
      txt:(P,E)=>`Both heroes' next hit taken is ${1+E} less, and the next card you play this turn doesn't go to the track.` },
    'Already gone the way you were about to look.');
  K(['fox'],'fox_brush','Brush Feint','S',0,
    { n:'Brush', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'preempt', val:(P,E)=>1+h(P), reflect:0, reposition:1},{v:'move', n:1, free:true}],
      txt:(P,E)=>`The next hit on you is ${1+h(P)} less, and you dodge a step from it; step 1 now.` },
    { n:'Tail Flag', ap:1, el:1, cd:3, dur:0, tgt:'node_r3',
      fx:[{v:'decoy', dur:(P,E)=>1+E},{v:'hidden', dur:1}],
      txt:(P,E)=>`Flick your tail where you are not: a decoy draws foes to a node within 3 for ${1+E} rounds, and you are Hidden 1.` },
    'Look at the tail. Not the fox.');

  // Golden jackal: the dogs' four, the jackal and coyote's two, and these three
  K(['jackal'],'jac_pair','Pair Hunt','C',2,
    { n:'Flank', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'studied', n:1}],
      txt:(P,E)=>`Melee ${1+P}, opening it up: both heroes' hits on it deal +1 after.` },
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
      fx:[{v:'decoy', dur:2, here:true},{v:'teleport', reach:(P,E)=>2+E},{v:'empower', val:2, uses:1, dur:2}],
      txt:(P,E)=>`Leave a decoy where you stand and slip to a node within ${2+E}; your next strike deals +2.` },
    'It was right there. It was never there.');
  K(['coyote'],'coy_adapt','Adapt Anywhere','T',0,
    { n:'Adapt', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'hazardImmune', dur:2},{v:'heal', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Shake off Anchored and Weakened, ignore hazards for 2 rounds, and heal ${1+h(P)}.` },
    { n:'Make Do', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E},{v:'statusImmune', dur:(P,E)=>1+E}],
      txt:(P,E)=>`Heal 1 at the start of each turn for ${2+E} rounds; no foe can Weaken or Root you for ${1+E}.` },
    'Desert, forest, city. Same coyote.');
  K(['coyote'],'coy_lope','Lope Feint','S',0,
    { n:'Lope', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P, ignoreFoes:true}],
      txt:(P,E)=>`Lope ${2+P}, slipping past foes.` },
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
      fx:[{v:'stripShield'},{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'weaken', val:2, dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Crack its Shield away, melee ${3+E}, and it is Weakened 2 for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}.` },
    'Jaws that eat the bones too.');
  K(['hyena'],'hye_whoop','Clan Whoop','C',0,
    { n:'Whoop', ap:1, el:0, cd:1, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:2},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Call your partner up to 2 nodes; their next strike deals +1.` },
    { n:'Mob', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+E, area:'radius', radius:2},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Every foe within 2 is Weakened 1 for ${1+E} rounds; both heroes' next strike deals +1.` },
    'Heard five kilometres off. Everyone comes.');
  K(['hyena'],'hye_scav','Scavenge','T',0,
    { n:'Scavenge', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P, onKill:{v:'heal', n:2}},{v:'heal', n:1}],
      txt:(P,E)=>`Melee ${1+P} and heal 1; if it falls, heal 2 more.` },
    { n:'Iron Gut', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E},{v:'cleanse'}],
      txt:(P,E)=>`Heal 1 at the start of each turn for ${2+E} rounds, and shake off Anchored and Weakened.` },
    'Nothing wasted.');
  K(['hyena'],'hye_endure','Endurance','T',0,
    { n:'Keep Going', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P},{v:'heal', n:1}],
      txt:(P,E)=>`Move ${2+P}, and heal 1.` },
    { n:'Run It Down', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'ap', val:1, dur:(P,E)=>2+E},{v:'hasten', n:1}],
      txt:(P,E)=>`For ${2+E} rounds you gain 1 AP at the start of each turn; your track returns 1 column sooner.` },
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
     sea otter · honey badger · red panda. Musk and Dense Fur are every one's; Ferocity the otter's and the
     badger's. The otter also uses tools (Human's Tool Use); the red panda has Human's Opposable Grip (a false
     thumb) and climbs down headfirst like the ocelot (Headfirst Descent). */
  const WEASEL = ['otter','badger','red_panda'];
  S('otter', { name: 'Sea Otter', lean: 'C/M', branch: 'Weasel kin', icon: '🦦',
    tagline: 'Floats on its back, cracks shells on a rock, holds hands while it sleeps.' });
  S('badger', { name: 'Honey Badger', lean: 'M/T', branch: 'Weasel kin', icon: '🦡',
    tagline: 'Loose skin, no fear, and a habit of eating things that sting.' });
  S('red_panda', { name: 'Red Panda', lean: 'T/S', branch: 'Weasel kin', icon: '🐼',
    tagline: 'Treetop dweller in a thick red coat. Stands tall when it means it.' });
  T.shareTrait('hum_tool', 'otter');
  T.shareTrait('hum_grip', 'red_panda');
  T.shareTrait('oce_descent', 'red_panda');

  K(WEASEL,'wea_musk','Musk','C',0,
    { n:'Musk', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P), area:'adj'},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`Foes beside you are Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}; the next hit on you is 1 less.` },
    { n:'Reek', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'zone', kind:'musk', radius:1, dur:3, weaken:1},{v:'weaken', val:1, dur:(P,E)=>1+E, area:'radius', radius:2}],
      txt:(P,E)=>`Every foe within 2 is Weakened 1 for ${1+E} rounds, and the ground beside you reeks for 3 rounds: foes there are Weakened.` },
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
      fx:[{v:'heal', n:(P,E)=>1+E, party:true},{v:'shield', val:1, dur:1, party:true},{v:'hazardImmune', dur:2, party:true}],
      txt:(P,E)=>`Both heroes heal ${1+E}, hold Shield 1 this round, and ignore hazards for 2.` },
    'Nobody drifts off in the night.');
  K(['otter'],'ott_shell','Shell Crack','M',2,
    { n:'Crack', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'stripShield'},{v:'strike', kind:'melee', dmg:(P,E)=>1+P}],
      txt:(P,E)=>`Knock its whole Shield off with your rock, then melee ${1+P}.` },
    { n:'Rock Throw', ap:1, el:1, cd:3, dur:0, tgt:'foe_los',
      fx:[{v:'stripShield', amount:2},{v:'strike', kind:'los', dmg:(P,E)=>2+E}],
      txt:(P,E)=>`Throw your rock at a foe in sight: 2 of its Shield cracks, and it takes ${2+E}.` },
    'One favourite rock, kept in an armpit pocket.');
  K(['otter'],'ott_roll','Otter Roll','S',0,
    { n:'Roll', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P, ignoreFoes:true},{v:'cleanse'}],
      txt:(P,E)=>`Roll ${1+P}, past foes, shaking off Anchored and Weakened.` },
    { n:'Spin Free', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>2+E},{v:'cleanse', party:true}],
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
      fx:[{v:'locate', dur:2},{v:'studied', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Feel out a foe within 2, seen or not: it can't Hide for 2 rounds, and your hits on it deal +${1+h(P)}.` },
    { n:'Murky Hunt', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:3, dur:(P,E)=>1+E},{v:'mark', area:true, radius:2}],
      txt:(P,E)=>`Feel the water within 3 for ${1+E} rounds; every foe within 2 is Marked.` },
    'Dark water, and every ripple in it.');

  // Honey badger: Musk, Dense Fur, Ferocity, and these six
  K(['badger'],'bad_venom','Venom Shrug','T',0,
    { n:'Shrug', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'heal', n:(P,E)=>1+h(P)},{v:'statusImmune', dur:1}],
      txt:(P,E)=>`Shake off Anchored and Weakened, heal ${1+h(P)}, and no foe can Weaken or Root you this round.` },
    { n:'Sleep It Off', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>2+E},{v:'statusImmune', dur:(P,E)=>1+E}],
      txt:(P,E)=>`Heal ${2+E}; no foe can Weaken or Root you for ${1+E} rounds.` },
    'Bitten. Shrugs. Carries on.');
  K(['badger'],'bad_dig','Burrow In','M',0,
    { n:'Dig', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'shield', val:(P,E)=>1+h(P), dur:1}],
      txt:(P,E)=>`Dig in: Hidden 1 and Shield ${1+h(P)} this round.` },
    { n:'Tunnel', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>2+E},{v:'hidden', dur:1}],
      txt:(P,E)=>`Tunnel to a node within ${2+E} and come up Hidden 1.` },
    'Faster down than you are.');
  K(['badger'],'bad_hide','Loose Hide','T',0,
    { n:'Twist Free', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'preempt', val:(P,E)=>1+h(P), reflect:1}],
      txt:(P,E)=>`Shake off Anchored and Weakened; the next hit on you is ${1+h(P)} less, and you bite back for 1.` },
    { n:'Loose Skin', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'counter', dmg:(P,E)=>2+E, push:0, dur:2},{v:'preempt', val:2, reflect:0}],
      txt:(P,E)=>`Hold a turn-and-bite ready: the next foe to hit you in melee takes ${2+E}, and that hit is 2 less.` },
    'Grab it anywhere and it turns round inside its skin.');
  K(['badger'],'bad_bee','Bee Raid','C',0,
    { n:'Raid', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'dot', val:1, dur:2, kind:'venom'}],
      txt:(P,E)=>`Melee ${1+P}, and it is stung: 1 a round for 2 rounds.` },
    { n:'Kick the Hive', ap:1, el:1, cd:3, dur:0, tgt:'node_r2',
      fx:[{v:'dot', val:(P,E)=>1+h(E), dur:2, kind:'venom', area:'nodeArea'},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Kick a hive open at a node within 2: every foe on or beside it is stung, ${1+h(E)} a round for 2 rounds. Stings don't bother you for 2.` },
    'The bees mind. The badger doesn\'t.');
  K(['badger'],'bad_never','Never Retreat','M',2,
    { n:'Stand', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'anchor', who:'self', dur:1},{v:'empower', val:(P,E)=>1+P, uses:1, dur:2}],
      txt:(P,E)=>`Plant your feet: nothing can push or pull you this round, and your next strike deals +${1+P}.` },
    { n:'No Retreat', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'statusImmune', dur:(P,E)=>1+E},{v:'thorns', val:(P,E)=>1+h(E), dur:(P,E)=>1+E},{v:'anchor', who:'self', dur:(P,E)=>1+E}],
      txt:(P,E)=>`For ${1+E} rounds nothing can Weaken, Root, push or pull you, and a foe that hits you in melee takes ${1+h(E)}.` },
    'There is no other direction.');
  K(['badger'],'bad_bite','Bite Hold','M',0,
    { n:'Bite', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>1+P},{v:'dot', val:1, dur:2, kind:'crush'}],
      txt:(P,E)=>`Melee ${1+P}, and don't let go: 1 a round for 2 rounds.` },
    { n:'Lockjaw', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'anchor', who:'foe', dur:2, held:true},{v:'dot', val:(P,E)=>1+h(E), dur:2, kind:'crush'}],
      txt:(P,E)=>`Melee ${2+E} and lock on: it is Anchored and can't blink for 2 rounds, and takes ${1+h(E)} a round for 2.` },
    'Lets go when it decides to.');

  // Red panda: Musk, Dense Fur, Opposable Grip, Headfirst Descent, and these five
  K(['red_panda'],'rpa_tall','Stand Tall','C',2,
    { n:'Stand Tall', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'adj'},{v:'preempt', val:(P,E)=>1+h(P), reflect:0}],
      txt:(P,E)=>`Rear up, arms wide: foes beside you are Weakened 1 this round, and the next hit on you is ${1+h(P)} less.` },
    { n:'Arms Up', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'force', kind:'push', n:(P,E)=>1+h(E), area:true},{v:'weaken', val:1, dur:(P,E)=>1+E, area:'radius', radius:2}],
      txt:(P,E)=>`Foes beside you are driven back ${1+h(E)}, and every foe within 2 is Weakened 1 for ${1+E} rounds.` },
    'Much bigger than it is, for a moment.');
  K(['red_panda'],'rpa_nap','Tree Nap','T',0,
    { n:'Nap', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'hidden', dur:1}],
      txt:(P,E)=>`Curl up out of sight: heal ${1+P}, and Hidden 1.` },
    { n:'Long Nap', ap:1, el:1, cd:4, dur:0, tgt:'self',
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
    { n:'Chew', ap:1, el:0, cd:0, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`Melee ${2+P}.` },
    { n:'Crush Stalk', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'weaken', val:1, dur:2}],
      txt:(P,E)=>`Melee ${3+E}; it is Weakened 1 for 2 rounds.` },
    'Jaws built for wood.');
  K(['red_panda'],'rpa_cold','Cold Sleep','T',0,
    { n:'Slow Down', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+h(P), dur:1},{v:'hazardImmune', dur:2},{v:'hasten', n:1}],
      txt:(P,E)=>`Shield ${1+h(P)} this round, ignore hazards for 2, and your track returns 1 column sooner.` },
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
      fx:[{v:'shield', val:(P,E)=>2+E, dur:2},{v:'statusImmune', dur:1}],
      txt:(P,E)=>`Shield ${2+E} for 2 rounds, and you can't be Weakened or Rooted this round.` },
    'Warm inside, whatever the water.', 'Sea mammals');
  K(SEA,'sea_breath','Breath Hold','T',0,
    { n:'Hold', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hazardImmune', dur:2},{v:'heal', n:(P,E)=>1+h(P)}],
      txt:(P,E)=>`Ignore hazards for 2 rounds, and heal ${1+h(P)}.` },
    { n:'Long Dive', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hazardImmune', dur:(P,E)=>2+E},{v:'heal', n:(P,E)=>2+E},{v:'cleanse'}],
      txt:(P,E)=>`Ignore hazards for ${2+E} rounds, heal ${2+E}, and shed Anchored, Weakened and damage over time.` },
    'One breath, a long way down.', 'Sea mammals');
  K(['orca','narwhal'],'sea_echo','Echolocation','S',0,
    { n:'Click', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Click: reveal within ${2+P} this round, and your next hit deals +1.` },
    { n:'Sound the Deep', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:99, dur:2},{v:'mark', area:true, radius:(P,E)=>1+E}],
      txt:(P,E)=>`Reveal the whole board for 2 rounds, and Mark every foe within ${1+E} (the next hit on each deals +2).` },
    'The water answers in echoes.', 'Sea mammals');
  K(['orca','narwhal'],'sea_song','Pod Song','C',0,
    { n:'Call the Pod', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'empower', val:1, uses:1, dur:2, party:true},{v:'heal', n:1, target:'ally'}],
      txt:(P,E)=>`Both heroes' next hit deals +1; your ally heals 1.` },
    { n:'Chorus', ap:1, el:1, cd:4, dur:0, tgt:'party',
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
    { n:'Bask', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E},{v:'shield', val:2, dur:1}],
      txt:(P,E)=>`Shield 2 this round, and heal 1 at the start of each turn for ${2+E} rounds.` },
    'Out of the water, onto the ice, and asleep.');
  K(['walrus'],'wal_whisker','Whisker Feel','S',0,
    { n:'Feel the Floor', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+P, dur:1},{v:'mark', nearest:true},{v:'heal', n:1}],
      txt:(P,E)=>`Reveal within ${1+P}, Mark the nearest foe (the next hit on it deals +2), and heal 1.` },
    { n:'Read the Current', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'locate', dur:3},{v:'studied', n:(P,E)=>1+E},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Feel out any foe: it can't Hide for 3 rounds, it is Weakened 1 this round, and your hits on it deal +${1+E}.` },
    'Four hundred whiskers, all of them listening.');
  K(['walrus'],'wal_bellow','Herd Bellow','C',0,
    { n:'Bellow', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+h(P), dur:1, party:true},{v:'weaken', val:1, dur:1, area:'adj'}],
      txt:(P,E)=>`Both heroes hold Shield ${1+h(P)} this round, and every foe beside you is Weakened 1.` },
    { n:'Herd Up', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'preempt', val:(P,E)=>1+E, reflect:0, party:true},{v:'cleanse', party:true}],
      txt:(P,E)=>`Both heroes shed Anchored, Weakened and damage over time, and the next hit on each is ${1+E} less.` },
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
      fx:[{v:'zone', kind:'ice', radius:1, dur:2, weaken:1},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Smash the ice around you: for 2 rounds every foe within 1 of you is Weakened 1, and you ignore hazards.` },
    'Its Latin name means tooth-walker.');
  K(['walrus'],'wal_ton','Ton of Weight','M',0,
    { n:'Lean In', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Melee ${3+P}, and push it 1.` },
    { n:'Belly Flop', ap:2, el:1, cd:3, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>2+E},{v:'weaken', val:1, dur:1, area:'adj'}],
      txt:(P,E)=>`Every foe beside you takes ${2+E} and is Weakened 1 this round.` },
    'Nobody asks a walrus to move.');

  // Orca: blubber, breath, echolocation, pod song, and these five
  K(['orca'],'orc_breach','Breach','S',0,
    { n:'Breach', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:2, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>2+P, ifAdjacent:true}],
      txt:(P,E)=>`Surge up to 2 toward a foe within 3; if you end beside it, melee ${2+P}.` },
    { n:'Spyhop', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>3+E, dest:'adjTarget'},{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Burst out beside a foe within ${3+E}, melee ${3+E}, and push it 1.` },
    'Up out of the water, all eight tons of it.');
  K(['orca'],'orc_tactics','Pod Tactics','C',0,
    { n:'Herd the Prey', ap:1, el:0, cd:1, dur:0, tgt:'foe_any',
      fx:[{v:'mark'},{v:'empower', val:(P,E)=>1+h(P), uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Mark a foe (the next hit on it deals +2), and your ally's next hit deals +${1+h(P)}.` },
    { n:'Wave Hunt', ap:1, el:1, cd:4, dur:0, tgt:'party',
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
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>4+E, pierce:true},{v:'statusImmune', dur:1}],
      txt:(P,E)=>`Melee ${4+E} that ignores Shield, and you can't be Weakened or Rooted this round.` },
    'Nothing in the sea hunts an orca.');
  K(['orca'],'orc_beach','Beach Charge','M',0,
    { n:'Ride the Surf', ap:1, el:0, cd:2, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P, ignoreFoes:true},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Move ${2+P}, passing foes, and your next hit this turn deals +1.` },
    { n:'Strand', ap:2, el:1, cd:4, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'force', kind:'pull', n:1},{v:'anchor', who:'foe', dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Melee ${3+E}, drag it 1 toward you, and pin it: Anchored ${1+h(E)}.` },
    'It throws itself up the beach, and back.');

  // Narwhal: blubber, breath, echolocation, pod song, tusk, and these four
  K(['narwhal'],'nar_sense','Sense Tusk','S',0,
    { n:'Taste the Water', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'preempt', val:(P,E)=>1+h(P), reflect:0},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Reveal within ${2+P}; the next hit on you is ${1+h(P)} less, and your next hit this turn deals +1.` },
    { n:'Read the Sea', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'preempt', val:(P,E)=>1+E, reflect:0, party:true},{v:'hazardImmune', dur:2, party:true}],
      txt:(P,E)=>`The next hit on each hero is ${1+E} less, and both ignore hazards for 2 rounds.` },
    'The tusk is a tooth that feels the sea.');
  K(['narwhal'],'nar_lead','Ice Lead','T',0,
    { n:'Show the Way', ap:1, el:0, cd:1, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>1+P}],
      txt:(P,E)=>`Your ally moves ${1+P}.` },
    { n:'Open Water', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hazardImmune', dur:(P,E)=>1+E, party:true},{v:'engine', kind:'ap', val:1, dur:1, party:true}],
      txt:(P,E)=>`Both heroes ignore hazards for ${1+E} ${1+E > 1 ? 'rounds' : 'round'} and gain 1 AP next turn.` },
    'It knows where the ice will open.');
  K(['narwhal'],'nar_dive','Deep Dive','T',0,
    { n:'Sound', ap:1, el:0, cd:2, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P},{v:'hidden', dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Move ${2+P}, Hidden 1, and your next hit this turn deals +1.` },
    { n:'Surface Far Off', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>2+E},{v:'hidden', dur:1}],
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
      fx:[{v:'move', n:(P,E)=>3+P}],
      txt:(P,E)=>`Move ${3+P}.` },
    { n:'Gallop', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>3+E, ignoreFoes:true},{v:'hazardImmune', dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Move ${3+E}, passing foes and ignoring hazards this round; your next hit this turn deals +1.` },
    'Built for ground, and lots of it.', 'Hoofed animals');
  K(HOOVED,'hoof_ring','Herd Ring','T',0,
    { n:'Close Ranks', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>2+h(P), dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`You and an ally beside you hold Shield ${2+h(P)} this round.` },
    { n:'Ring of Horns', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+E, dur:1, party:true},{v:'counter', dmg:(P,E)=>1+E, push:1, dur:1}],
      txt:(P,E)=>`Both heroes hold Shield ${1+E} this round; the next foe to hit you in melee takes ${1+E} and is pushed 1.` },
    'Young in the middle, everyone else facing out.', 'Hoofed animals');
  K(HOOVED,'hoof_eyes','Wide Eyes','S',0,
    { n:'Look Around', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'preempt', val:(P,E)=>1+h(P), reflect:0},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Reveal within ${2+P}; the next hit on you is ${1+h(P)} less, and your next hit this turn deals +1.` },
    { n:'Nothing Behind Me', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'reveal', radius:99, dur:1},{v:'preempt', val:(P,E)=>1+E, reflect:0, party:true}],
      txt:(P,E)=>`Reveal the whole board this round; the next hit on each hero is ${1+E} less.` },
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
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+h(P)},{v:'hasten', n:1}],
      txt:(P,E)=>`Heal 1 at the start of each turn for ${2+h(P)} rounds, and your track returns 1 column sooner.` },
    { n:'Four Stomachs', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>2+E},{v:'cleanse'},{v:'engine', kind:'regen', val:1, dur:2}],
      txt:(P,E)=>`Heal ${2+E}, shed Anchored, Weakened and damage over time, and heal 1 at the start of each turn for 2 rounds.` },
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
      fx:[{v:'move', n:(P,E)=>2+P, ignoreFoes:true},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`Bound ${2+P}, passing foes; the next hit on you is 1 less.` },
    { n:'Over the Fence', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>2+E, height:true},{v:'hidden', dur:1}],
      txt:(P,E)=>`Leap to anywhere within ${2+E}, height included, and you are Hidden 1.` },
    'One spring and it is over the hedge.', 'Hoofed animals');

  // Yak
  K(['yak'],'yak_coat','Thick Coat','T',0,
    { n:'Shaggy', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+h(P), dur:1},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Shield ${2+h(P)} and ignore hazards this round.` },
    { n:'Winter Fleece', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+E, dur:2, party:true, allyRange:1},{v:'statusImmune', dur:1}],
      txt:(P,E)=>`You and an ally beside you hold Shield ${1+E} for 2 rounds; you can't be Weakened or Rooted this round.` },
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
      fx:[{v:'engine', kind:'ap', val:1, dur:1},{v:'heal', n:1}],
      txt:(P,E)=>`Gain 1 AP next turn, and heal 1.` },
    { n:'High Pass', ap:1, el:1, cd:3, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+E, carryAlly:(P,E)=>E>=2},{v:'shield', val:2, dur:1}],
      txt:(P,E)=>`Climb ${1+E}${E>=2?', carrying an ally beside you,':''} and hold Shield 2 this round.` },
    'Where other lungs give out, it keeps walking.');

  // Bison
  K(['bison'],'bis_stampede','Stampede','M',0,
    { n:'Thunder', ap:1, el:0, cd:2, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P, ignoreFoes:true},{v:'weaken', val:1, dur:1, area:'adj'},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Move ${2+P}, passing foes; every foe beside you where you stop is Weakened 1 this round, and your next hit this turn deals +1.` },
    { n:'Run Them Down', ap:2, el:1, cd:4, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>2+E},{v:'force', kind:'push', n:1, area:true}],
      txt:(P,E)=>`Every foe beside you takes ${2+E} and is pushed 1.` },
    'The ground shakes before you see them.');
  K(['bison'],'bis_wallow','Wallow','T',0,
    { n:'Dust Bath', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'shield', val:(P,E)=>1+h(P), dur:1},{v:'heal', n:1}],
      txt:(P,E)=>`Shed Anchored, Weakened and damage over time; Shield ${1+h(P)} this round, and heal 1.` },
    { n:'Mud Coat', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>1+E, dur:2},{v:'shield', val:2, dur:2}],
      txt:(P,E)=>`Shield 2 for 2 rounds, and any foe that hits you in melee takes ${1+E}.` },
    'Roll in it. It keeps the flies off.');
  K(['bison'],'bis_hump','Shoulder Hump','M',0,
    { n:'Shoulder', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'force', kind:'push', n:1}],
      txt:(P,E)=>`Melee ${3+P}, and push it 1.` },
    { n:'Plough the Snow', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>4+E},{v:'force', kind:'push', n:(P,E)=>1+h(E)},{v:'statusImmune', dur:1}],
      txt:(P,E)=>`Melee ${4+E}, push it ${1+h(E)}, and you can't be Weakened or Rooted this round.` },
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
      fx:[{v:'move', n:(P,E)=>2+P},{v:'preempt', val:(P,E)=>1+h(P), reflect:0, reposition:1}],
      txt:(P,E)=>`Move ${2+P}; the next hit on you is ${1+h(P)} less, and you dodge a step from it.` },
    { n:'Heat Haze', ap:1, el:1, cd:4, dur:0, tgt:'node_r3',
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
      fx:[{v:'teleport', reach:(P,E)=>2+E, height:true},{v:'empower', val:(P,E)=>1+E, uses:1, dur:1}],
      txt:(P,E)=>`Spring to anywhere within ${2+E}, height included; your next hit this turn deals +${1+E}.` },
    'A ledge the width of a hoof is plenty.');
  K(['ram'],'ram_curl','Curled Horns','T',0,
    { n:'Brace', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'preempt', val:(P,E)=>2+h(P), reflect:1}],
      txt:(P,E)=>`The next hit on you is ${2+h(P)} less, and its attacker takes 1.` },
    { n:'Hard Head', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'counter', dmg:(P,E)=>2+E, push:1, dur:2},{v:'shield', val:2, dur:1}],
      txt:(P,E)=>`Shield 2 this round; for 2 rounds, the next foe to hit you in melee takes ${2+E} and is pushed 1.` },
    'A skull built to take what it gives.');

  // Moose
  K(['moose'],'moo_wade','Wade Deep','S',0,
    { n:'Wade', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Move ${2+P}, and ignore hazards for 2 rounds.` },
    { n:'Dive for Weed', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'heal', n:(P,E)=>2+E},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Duck under: Hidden 1, heal ${2+E}, and ignore hazards for 2 rounds.` },
    'It feeds with its whole head under the lake.');
  K(['moose'],'moo_bellow','Bellow','C',0,
    { n:'Grunt', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P), area:'radius', radius:2}],
      txt:(P,E)=>`Every foe within 2 is Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}.` },
    { n:'Rut Call', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'force', kind:'pull', n:1, area:true, radius:(P,E)=>2+E},{v:'counter', dmg:(P,E)=>1+E, push:1, dur:1}],
      txt:(P,E)=>`Every foe within ${2+E} is drawn 1 toward you; the next to hit you in melee takes ${1+E} and is pushed 1.` },
    'A low call across the bog, and something answers.');
  K(['moose'],'moo_stand','Stand Ground','M',0,
    { n:'Plant', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Melee ${3+P}, and hold Shield 1 this round.` },
    { n:'Trample', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>4+E},{v:'anchor', who:'foe', dur:1},{v:'statusImmune', dur:1}],
      txt:(P,E)=>`Melee ${4+E}, pin it (Anchored 1), and you can't be Weakened or Rooted this round.` },
    'It does not run from wolves. It waits for them.');

  // Deer
  K(['deer'],'dee_ears','Alert Ears','S',0,
    { n:'Ears Up', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Reveal within ${2+P}, and step 1.` },
    { n:'Warning Snort', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'preempt', val:(P,E)=>1+E, reflect:0, reposition:1, party:true},{v:'reveal', radius:3, dur:1}],
      txt:(P,E)=>`Reveal within 3; the next hit on each hero is ${1+E} less, and they dodge a step from it.` },
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
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P)},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`A foe within 2 is Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}; the next hit on you is 1 less.` },
    { n:'Moving Stripes', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(E), area:'radius', radius:(P,E)=>1+E},{v:'hidden', dur:1, canMove:true}],
      txt:(P,E)=>`Every foe within ${1+E} is Weakened 1 for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}, and you are Hidden 1 even if you move.` },
    'Hard to count, harder to pick out.');
  K(['zebra'],'zeb_bolt','Herd Bolt','S',0,
    { n:'Bolt', ap:1, el:0, cd:1, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>1+P},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Your ally moves ${1+P}, and you step 1.` },
    { n:'All Together', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'ap', val:1, dur:1, party:true},{v:'preempt', val:(P,E)=>1+E, reflect:0, party:true}],
      txt:(P,E)=>`Both heroes gain 1 AP next turn, and the next hit on each is ${1+E} less.` },
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
      txt:(P,E)=>`Heal ${1+P}, and shed Anchored, Weakened and damage over time.` },
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
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'preempt', val:1, reflect:0, reposition:1}],
      txt:(P,E)=>`Reveal within ${2+P}; the next hit on you is 1 less, and you dodge a step from it.` },
    { n:'Ears Back', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:99, dur:1},{v:'move', n:(P,E)=>1+E, free:true},{v:'hidden', dur:1, canMove:true}],
      txt:(P,E)=>`Hear the whole board this round, slip ${1+E}, and you are Hidden 1 even if you move.` },
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
    { n:'Scurry', ap:1, el:0, cd:0, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P, noTrap:true}],
      txt:(P,E)=>`Move ${2+P}, setting off no traps.` },
    { n:'Every Which Way', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>3+E, ignoreFoes:true, noTrap:true},{v:'preempt', val:(P,E)=>1+E, reflect:0}],
      txt:(P,E)=>`Move ${3+E}, through foes and past traps; the next hit on you is ${1+E} less.` },
    'Along the wall, never across the floor.');
  K(['mouse'],'mou_gap','Through the Gap','S',0,
    { n:'Squeeze', ap:1, el:0, cd:1, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>1+h(P)},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Squeeze through to any node within ${1+h(P)}, and hold Shield 1 this round.` },
    { n:'Under the Door', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>2+E, carryAlly:(P,E)=>E>=2},{v:'hidden', dur:1}],
      txt:(P,E)=>`Slip to any node within ${2+E}${E>=2?', bringing an ally beside you,':''} and you are Hidden 1.` },
    'If its head fits, the rest follows.');
  K(['mouse'],'mou_stash','Seed Stash','C',0,
    { n:'Nibble', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'engine', kind:'ap', val:1, dur:1}],
      txt:(P,E)=>`Heal ${1+P}, and gain 1 AP next turn.` },
    { n:'Winter Store', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'heal', n:(P,E)=>1+E, party:true},{v:'engine', kind:'ap', val:1, dur:1, party:true}],
      txt:(P,E)=>`Both heroes heal ${1+E} and gain 1 AP next turn.` },
    'Seeds in every corner of the house.');
  K(['mouse'],'mou_tiny','Tiny Target','T',0,
    { n:'Duck', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'preempt', val:(P,E)=>2+h(P), reflect:0, reposition:1}],
      txt:(P,E)=>`The next hit on you is ${2+h(P)} less, and you dodge a step from it.` },
    { n:'Too Small to See', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+E, canMove:true},{v:'preempt', val:2, reflect:0}],
      txt:(P,E)=>`Hidden ${1+E} even if you move, and the next hit on you is 2 less.` },
    'The claw comes down where it was.');
  K(['mouse'],'mou_squeak','Squeak','C',0,
    { n:'Alarm', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'preempt', val:1, reflect:0, party:true},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`The next hit on each hero is 1 less, and your ally's next hit deals +1.` },
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
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P), area:'adj'},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`Every foe beside you is Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}; the next hit on you is 1 less.` },
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
      fx:[{v:'counter', dmg:(P,E)=>1+P, push:0, dur:1},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`Turn your quills to the threat: the next hit on you is 1 less, and the next foe to hit you in melee takes ${1+P}.` },
    { n:'Back into It', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'weaken', val:1, dur:2},{v:'dot', kind:'quill', val:1, dur:2}],
      txt:(P,E)=>`Back into a foe beside you: it takes ${3+E}, is Weakened 1 for 2 rounds, and takes 1 at the start of its next 2 turns.` },
    'It charges backwards.');
  K(['porcupine'],'por_shed','Quill Shed','M',0,
    { n:'Flick', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+P}],
      txt:(P,E)=>`A quill stuck in a foe within 2: it takes ${2+P}.` },
    { n:'Quill Spray', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'strike', kind:'zone_all', dmg:(P,E)=>1+E}],
      txt:(P,E)=>`Every foe in your zone takes ${1+E}.` },
    'They come loose, and stay in.');
  K(['porcupine'],'por_bark','Bark Eater','T',0,
    { n:'Gnaw Bark', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>1+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Heal ${1+P}, and hold Shield 1 this round.` },
    { n:'Salt Lick', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E}],
      txt:(P,E)=>`Shed Anchored, Weakened and damage over time, and heal 1 at the start of each turn for ${2+E} rounds.` },
    'It eats what nothing else will.');
  K(['porcupine'],'por_waddle','Waddle','S',0,
    { n:'Amble', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>1+P},{v:'thorns', val:1, dur:1}],
      txt:(P,E)=>`Move ${1+P}; any foe that hits you in melee this round takes 1.` },
    { n:'Unbothered', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E, ignoreFoes:true},{v:'statusImmune', dur:1}],
      txt:(P,E)=>`Move ${2+E}, straight past foes, and you can't be Weakened or Rooted this round.` },
    'In no hurry. Nothing makes it hurry.');

  // Brown hare
  K(['hare'],'har_march','Mad March','M',0,
    { n:'Spar', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Melee ${2+P}, then hop 1.` },
    { n:'Spring Fever', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'empower', val:1, uses:99, dur:(P,E)=>1+E},{v:'engine', kind:'ap', val:1, dur:1}],
      txt:(P,E)=>`Every hit you deal for ${1+E} ${1+E > 1 ? 'rounds' : 'round'} deals +1, and gain 1 AP next turn.` },
    'In spring, every hare goes a little mad.');
  K(['hare'],'har_winter','White Winter','T',0,
    { n:'Snow Coat', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'hazardImmune', dur:2},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Hidden 1, Shield 1 this round, and ignore hazards for 2 rounds.` },
    { n:'Whiteout', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:1, party:true, radius:2},{v:'hazardImmune', dur:(P,E)=>1+E, party:true}],
      txt:(P,E)=>`You and an ally within 2 are Hidden 1, and both ignore hazards for ${1+E} rounds.` },
    'Brown in summer, white by the first snow.');
  K(['hare'],'har_thump','Thump','C',0,
    { n:'Thump', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'preempt', val:(P,E)=>1+h(P), reflect:0, party:true}],
      txt:(P,E)=>`Thump a warning: the next hit on each hero is ${1+h(P)} less.` },
    { n:'Ground Drum', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'radius', radius:(P,E)=>1+E},{v:'engine', kind:'ap', val:1, dur:1, target:'ally'}],
      txt:(P,E)=>`Every foe within ${1+E} is Weakened 1 this round, and your ally gains 1 AP next turn.` },
    'A back foot on the ground: danger.');

  // Black hare
  K(['black_hare'],'bha_bolt','Shadow Bolt','S',0,
    { n:'Bolt', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P, ignoreFoes:true},{v:'hidden', dur:1, canMove:true}],
      txt:(P,E)=>`Move ${2+P}, passing foes, and you are Hidden 1 even if you move.` },
    { n:'Into the Dark', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>3+E},{v:'hidden', dur:(P,E)=>1+h(E), canMove:true}],
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
      txt:(P,E)=>`Heal ${2+E}, shed Anchored, Weakened and damage over time, and gain 1 AP next turn.` },
    'It needs very little, and it gets it.', 'Armoured and slow');
  K(ARMOURED,'arm_curl','Curl Up','T',0,
    { n:'Curl', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+P, dur:1},{v:'anchor', who:'self', dur:1},{v:'thorns', val:1, dur:1}],
      txt:(P,E)=>`Curl into a ball: Shield ${2+P} this round, nothing can push or pull you, and any foe that hits you in melee takes 1.` },
    { n:'Ball', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>3+E, dur:2},{v:'statusImmune', dur:2}],
      txt:(P,E)=>`Shield ${3+E} for 2 rounds, and you can't be Weakened or Rooted for 2.` },
    'Every soft part tucked away.', 'Armoured and slow');
  K(ANTEATERS,'arm_dig','Dig Claws','M',0,
    { n:'Rip', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'stripShield', amount:1}],
      txt:(P,E)=>`Tear 1 Shield off a foe beside you, then melee ${3+P}.` },
    { n:'Dig Down', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>2+E},{v:'hidden', dur:1},{v:'shield', val:1, dur:1}],
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
      txt:(P,E)=>`Shed Anchored, Weakened and damage over time, and heal ${1+P}.` },
    { n:'Immune', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'cleanse', party:true},{v:'heal', n:(P,E)=>1+E, party:true},{v:'statusImmune', dur:(P,E)=>1+E}],
      txt:(P,E)=>`Both heroes shed Anchored, Weakened and damage over time and heal ${1+E}; you can't be Weakened or Rooted for ${1+E} ${1+E > 1 ? 'rounds' : 'round'}.` },
    'A snakebite slows it down for an hour.');

  // Sloth
  K(['sloth'],'slo_algae','Algae Fur','T',0,
    { n:'Green Coat', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:(P,E)=>1+h(P)},{v:'heal', n:1}],
      txt:(P,E)=>`Hidden ${1+h(P)} in your green coat, and heal 1.` },
    { n:'A Whole Garden', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E, party:true},{v:'hidden', dur:1}],
      txt:(P,E)=>`Both heroes heal 1 at the start of each turn for ${2+E} rounds; you are Hidden 1.` },
    'Its fur grows a garden, with moths in it.');
  K(['sloth'],'slo_hook','Hook Claws','M',0,
    { n:'Hook', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'anchor', who:'foe', dur:1}],
      txt:(P,E)=>`Melee ${3+P}, and hook it: Anchored 1.` },
    { n:'Never Let Go', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'anchor', who:'foe', dur:(P,E)=>1+h(E), held:true},{v:'weaken', val:1, dur:2}],
      txt:(P,E)=>`Melee ${3+E}; it is held, Anchored ${1+h(E)}, and Weakened 1 for 2 rounds.` },
    'Claws that lock shut on their own.');
  K(['sloth'],'slo_unhurried','Unhurried','T',0,
    { n:'Take Your Time', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'hasten', n:1},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`Your track returns 1 column sooner, and the next hit on you is 1 less.` },
    { n:'Slow Hand', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'freecast', n:1, dur:1},{v:'engine', kind:'ap', val:1, dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`The next card you play this turn doesn't go to the track, and gain 1 AP at the start of each turn for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}.` },
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
      fx:[{v:'move', n:(P,E)=>2+P},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Move ${2+P}, ignoring hazards this round.` },
    { n:'Float', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E, ignoreFoes:true},{v:'hazardImmune', dur:2},{v:'hidden', dur:1}],
      txt:(P,E)=>`Drift ${2+E}, passing foes; Hidden 1, and ignore hazards for 2 rounds.` },
    'Three times faster in water than in trees.');
  K(['sloth'],'slo_neck','Neck Turn','S',0,
    { n:'Look Back', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'mark', nearest:true},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`Reveal within ${2+P}; Mark the nearest foe (the next hit on it deals +2), and the next hit on you is 1 less.` },
    { n:'All the Way Round', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:99, dur:2},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`See the whole board for 2 rounds; your next hit deals +${1+E}.` },
    'It can turn its head almost all the way round.');
  K(['sloth'],'slo_sleep','Sleep Anywhere','T',0,
    { n:'Nap', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>2+P},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`Heal ${2+P}; the next hit on you is 1 less.` },
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
      fx:[{v:'shield', val:(P,E)=>2+E, dur:1, party:true, allyRange:1},{v:'preempt', val:1, reflect:0, party:true}],
      txt:(P,E)=>`You and an ally beside you hold Shield ${2+E} this round, and the next hit on each hero is 1 less.` },
    'Nine bands of bone, hinged with skin.');
  K(['armadillo'],'adi_jump','Startle Jump','S',0,
    { n:'Jump', ap:1, el:0, cd:1, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>1+h(P), height:true},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`Leap straight up and away to any node within ${1+h(P)}, height included; the next hit on you is 1 less.` },
    { n:'Up and Away', ap:1, el:1, cd:3, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>2+E},{v:'force', kind:'push', n:1, area:true},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Burst upward: every foe beside you takes ${2+E} and is pushed 1, then step 1.` },
    'Frighten it and it jumps a metre straight up.');
  K(['armadillo'],'adi_breath','Breath Crossing','S',0,
    { n:'Walk the Bottom', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Move ${2+P}, and ignore hazards for 2 rounds.` },
    { n:'Gulp Air', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hazardImmune', dur:(P,E)=>2+E, party:true},{v:'heal', n:1, party:true}],
      txt:(P,E)=>`Both heroes heal 1 and ignore hazards for ${2+E} rounds.` },
    'It holds its breath and walks across the riverbed.');
  K(['armadillo'],'adi_snuffle','Night Snuffle','C',0,
    { n:'Snuffle', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+P, dur:1},{v:'mark', nearest:true},{v:'heal', n:1}],
      txt:(P,E)=>`Reveal within ${1+P}, Mark the nearest foe (the next hit on it deals +2), and heal 1.` },
    { n:'Root Out', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'locate', dur:3},{v:'studied', n:(P,E)=>1+E}],
      txt:(P,E)=>`Root out any foe: it can't Hide for 3 rounds, and your hits on it deal +${1+E}.` },
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
      fx:[{v:'preempt', val:(P,E)=>2+h(P), reflect:0},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`The next hit on you is ${2+h(P)} less, and hold Shield 1 this round.` },
    { n:'Unbroken', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>3+E, dur:2},{v:'thorns', val:(P,E)=>1+h(E), dur:2}],
      txt:(P,E)=>`Shield ${3+E} for 2 rounds; any foe that hits you in melee takes ${1+h(E)}.` },
    'Keratin, laid like roof tiles.');
  K(['pangolin'],'pan_tail','Tail Shield','T',0,
    { n:'Cover', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+h(P), dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`Hold Shield ${2+h(P)} this round; wrap your tail round an ally beside you and they hold it too.` },
    { n:'Wrapped Round', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'preempt', val:(P,E)=>2+E, reflect:0, party:true},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`The next hit on each hero is ${2+E} less, and each hero's next hit deals +1.` },
    'It carries its young on that tail.');
  K(['pangolin'],'pan_edges','Sharp Edges','M',0,
    { n:'Scale Slash', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P}],
      txt:(P,E)=>`Melee ${3+P}.` },
    { n:'Saw', ap:1, el:1, cd:3, dur:0, tgt:'foe_adj_all',
      fx:[{v:'strike', kind:'area', dmg:(P,E)=>2+E},{v:'dot', kind:'cut', val:1, dur:2, area:'nodeArea'}],
      txt:(P,E)=>`Every foe beside you takes ${2+E}, then 1 at the start of its next 2 turns.` },
    'The scale edges are sharp enough to cut.');
  K(['pangolin'],'pan_upright','Walk Upright','S',0,
    { n:'Stride', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P},{v:'reveal', radius:2, dur:1}],
      txt:(P,E)=>`Move ${2+P}, and reveal within 2 of where you stop.` },
    { n:'Tall and Wary', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>3+E, dur:2},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`Reveal within ${3+E} for 2 rounds; your next hit deals +${1+E}.` },
    'On its back legs, tail for balance.');
  K(['pangolin'],'pan_ants','Ant Armour','C',0,
    { n:'Ant Bath', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'shield', val:(P,E)=>1+h(P), dur:1},{v:'heal', n:1}],
      txt:(P,E)=>`Shed Anchored, Weakened and damage over time; Shield ${1+h(P)} this round, and heal 1.` },
    { n:'Stinging Shield', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'counter', dmg:(P,E)=>2+E, push:0, dur:2},{v:'statusImmune', dur:2}],
      txt:(P,E)=>`For 2 rounds you can't be Weakened or Rooted, and the next foe to hit you in melee takes ${2+E}.` },
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
      fx:[{v:'move', n:(P,E)=>2+P},{v:'reveal', radius:1, dur:1}],
      txt:(P,E)=>`Snuffle ${2+P}, and reveal within 1 of where you stop.` },
    { n:'Under the Hedge', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E, noTrap:true},{v:'hidden', dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Move ${2+E} under cover, setting off no traps; Hidden ${1+h(E)}.` },
    'It grunts like a small pig as it goes.');
  K(['hedgehog'],'heh_hibernate','Hibernate','T',0,
    { n:'Drowse', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+h(P)},{v:'hasten', n:1}],
      txt:(P,E)=>`Heal 1 at the start of each turn for ${2+h(P)} rounds, and your track returns 1 column sooner.` },
    { n:'Winter Nest', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'stasis', dur:1},{v:'engine', kind:'regen', val:(P,E)=>1+h(E), dur:2}],
      txt:(P,E)=>`Sleep in your nest: nothing can touch you until your next turn, and heal ${1+h(E)} at the start of each turn for 2 rounds.` },
    'It sleeps the whole winter in a ball of leaves.');
  K(['hedgehog'],'heh_anoint','Anointing','C',0,
    { n:'Froth', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'weaken', val:1, dur:2}],
      txt:(P,E)=>`Melee ${2+P}; it is Weakened 1 for 2 rounds.` },
    { n:'Self-Anoint', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'thorns', val:(P,E)=>1+E, dur:2},{v:'statusImmune', dur:2}],
      txt:(P,E)=>`Spread a bitter froth on your spines: for 2 rounds any foe that hits you in melee takes ${1+E}, and you can't be Weakened or Rooted.` },
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
      fx:[{v:'weaken', val:1, dur:1},{v:'force', kind:'push', n:1},{v:'strike', kind:'los', dmg:1}],
      txt:(P,E)=>`Huff at a foe within 2: it takes 1, is Weakened 1 this round, and is pushed 1.` },
    { n:'Snort and Pop', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(E), area:'radius', radius:(P,E)=>1+E},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`Every foe within ${1+E} is Weakened 1 for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}; the next hit on you is 1 less.` },
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
    { n:'Hop', ap:1, el:0, cd:0, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P, ignoreFoes:true}],
      txt:(P,E)=>`Hop ${2+P}, over foes.` },
    { n:'Bound Across', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>3+E, height:true},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Bound to any node within ${3+E}, height included; your next hit this turn deals +1.` },
    'It cannot walk backwards, and never needs to.');
  K(['kangaroo'],'kan_tailkick','Tail Kick','M',0,
    { n:'Lean Back and Kick', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'force', kind:'push', n:2}],
      txt:(P,E)=>`Rock back on your tail and kick: melee ${3+P}, and push it 2.` },
    { n:'Gut Rake', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>4+E, pierce:true},{v:'dot', kind:'rake', val:1, dur:2}],
      txt:(P,E)=>`Melee ${4+E} that ignores Shield; it takes 1 at the start of its next 2 turns.` },
    'Both feet, with the whole weight on the tail.');
  K(['kangaroo'],'kan_box','Box','M',0,
    { n:'Jab', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Melee ${2+P}; it is Weakened 1 this round.` },
    { n:'Clinch', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'anchor', who:'foe', dur:1, held:true},{v:'empower', val:(P,E)=>1+E, uses:1, dur:1}],
      txt:(P,E)=>`Melee ${2+E} and hold it (Anchored 1); your next hit this turn deals +${1+E}.` },
    'Forearms up, chest out.');
  K(['kangaroo'],'kan_prop','Tail Prop','T',0,
    { n:'Prop', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'anchor', who:'self', dur:1},{v:'shield', val:(P,E)=>2+h(P), dur:1}],
      txt:(P,E)=>`Brace on your tail: Shield ${2+h(P)} this round, and nothing can push or pull you.` },
    { n:'Five Legs', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'statusImmune', dur:2},{v:'counter', dmg:(P,E)=>2+E, push:1, dur:2}],
      txt:(P,E)=>`For 2 rounds you can't be Weakened or Rooted, and the next foe to hit you in melee takes ${2+E} and is pushed 1.` },
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
      fx:[{v:'move', n:(P,E)=>3+P}],
      txt:(P,E)=>`Move ${3+P}.` },
    { n:'Nine Metres', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>4+E, ignoreFoes:true},{v:'hazardImmune', dur:1},{v:'preempt', val:1, reflect:0}],
      txt:(P,E)=>`Move ${4+E}, passing foes and ignoring hazards this round; the next hit on you is 1 less.` },
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
    { n:'Rest in the Shade', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'regen', val:1, dur:(P,E)=>2+E, party:true},{v:'cleanse'}],
      txt:(P,E)=>`Shed Anchored, Weakened and damage over time; both heroes heal 1 at the start of each turn for ${2+E} rounds.` },
    'It licks its arms to keep cool.');

  // Opossum
  K(['opossum'],'opo_dead','Play Dead','T',0,
    { n:'Flop', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1},{v:'preempt', val:(P,E)=>2+h(P), reflect:0}],
      txt:(P,E)=>`Flop over: Hidden 1, and the next hit on you is ${2+h(P)} less.` },
    { n:'Very Convincing', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'stasis', dur:1},{v:'decoy', dur:(P,E)=>1+E, here:true},{v:'heal', n:1}],
      txt:(P,E)=>`Play dead: nothing can touch you until your next turn, foes are drawn to where you lie for ${1+E} rounds, and you heal 1.` },
    'Not on purpose. It simply faints.');
  K(['opossum'],'opo_tail','Prehensile Tail','S',0,
    { n:'Hang', ap:1, el:0, cd:1, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>1+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Climb ${1+P}, and hold Shield 1 this round.` },
    { n:'Swing Down', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>2+E, height:true},{v:'empower', val:(P,E)=>1+E, uses:1, dur:1}],
      txt:(P,E)=>`Swing to any node within ${2+E}, height included; your next hit this turn deals +${1+E}.` },
    'A tail that holds on by itself.');
  K(['opossum'],'opo_hiss','Fifty-Tooth Hiss','M',0,
    { n:'Gape', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Show all fifty teeth and bite: melee ${2+P}, and it is Weakened 1 this round.` },
    { n:'Hiss and Drool', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+E, area:'radius', radius:2},{v:'force', kind:'push', n:1, area:true}],
      txt:(P,E)=>`Every foe within 2 is Weakened 1 for ${1+E} rounds, and every foe beside you is pushed 1.` },
    'More teeth than any other land mammal.');
  K(['opossum'],'opo_groom','Clean Groom','T',0,
    { n:'Groom', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'cleanse'},{v:'heal', n:(P,E)=>1+P}],
      txt:(P,E)=>`Shed Anchored, Weakened and damage over time, and heal ${1+P}.` },
    { n:'Groom Each Other', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'cleanse', party:true},{v:'heal', n:(P,E)=>1+E, party:true}],
      txt:(P,E)=>`Both heroes shed Anchored, Weakened and damage over time, and heal ${1+E}.` },
    'Fastidious, and it eats the ticks.');
  K(['opossum'],'opo_thumb','Thumb Feet','S',0,
    { n:'Grip', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P},{v:'anchor', who:'self', dur:1}],
      txt:(P,E)=>`Move ${2+P}; nothing can push or pull you this round.` },
    { n:'Grab and Go', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'stripShield', amount:2},{v:'move', n:1, free:true}],
      txt:(P,E)=>`Snatch 2 Shield off a foe beside you, melee ${2+E}, and step 1.` },
    'Thumbs on its back feet, too.');
  K(['opossum'],'opo_wander','Night Wander','S',0,
    { n:'Wander', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P, noTrap:true},{v:'reveal', radius:1, dur:1}],
      txt:(P,E)=>`Wander ${2+P}, setting off no traps, and reveal within 1 of where you stop.` },
    { n:'Under Cover of Night', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E, ignoreFoes:true},{v:'hidden', dur:(P,E)=>1+h(E), canMove:true}],
      txt:(P,E)=>`Move ${2+E}, passing foes; Hidden ${1+h(E)} even if you move.` },
    'It never stays in one den two nights running.');
  K(['opossum'],'opo_nose','Scavenger’s Nose','C',0,
    { n:'Sniff Out', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'mark', nearest:true},{v:'heal', n:1}],
      txt:(P,E)=>`Reveal within ${2+P}, Mark the nearest foe (the next hit on it deals +2), and heal 1.` },
    { n:'Leftovers', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'draw', face:'C', val:1},{v:'heal', n:(P,E)=>1+E}],
      txt:(P,E)=>`Draw a Charge die from your pool, and heal ${1+E}.` },
    'Anything, anywhere, eaten.');

  // Platypus
  K(['platypus'],'pla_electro','Electroreception','C',0,
    { n:'Sense the Current', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>2+P, dur:1},{v:'empower', val:1, uses:1, dur:1},{v:'mark', nearest:true}],
      txt:(P,E)=>`Feel the electric field: reveal within ${2+P}, Mark the nearest foe (the next hit on it deals +2), and your next hit this turn deals +1.` },
    { n:'Every Heartbeat', ap:1, el:1, cd:4, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', radius:99, dur:2},{v:'locate', dur:3},{v:'studied', n:(P,E)=>1+E}],
      txt:(P,E)=>`Feel every heartbeat on the board for 2 rounds; pick one foe: it can't Hide for 3 rounds, and your hits on it deal +${1+E}.` },
    'Forty thousand sensors in the bill.');
  K(['platypus'],'pla_spur','Venom Spur','M',0,
    { n:'Spur', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+P},{v:'dot', kind:'venom', val:1, dur:2}],
      txt:(P,E)=>`Melee ${2+P}; it takes 1 at the start of its next 2 turns.` },
    { n:'Full Dose', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>2+E},{v:'dot', kind:'venom', val:(P,E)=>1+E, dur:3},{v:'weaken', val:1, dur:2}],
      txt:(P,E)=>`Melee ${2+E}; it takes ${1+E} at the start of its next 3 turns and is Weakened 1 for 2 rounds.` },
    'A hollow spur on each back ankle.');
  K(['platypus'],'pla_dive','Duck Dive','S',0,
    { n:'Dive', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P},{v:'hidden', dur:1},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Move ${2+P}, Hidden 1, and ignore hazards this round.` },
    { n:'Bottom Run', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>2+E},{v:'hidden', dur:1},{v:'hazardImmune', dur:2}],
      txt:(P,E)=>`Come up anywhere within ${2+E}, Hidden 1, and ignore hazards for 2 rounds.` },
    'Down, and gone, in a ring of ripples.');
  K(['platypus'],'pla_cheek','Cheek Store','T',0,
    { n:'Fill Cheeks', ap:1, el:0, cd:2, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'ap', val:1, dur:1},{v:'heal', n:1}],
      txt:(P,E)=>`Gain 1 AP next turn, and heal 1.` },
    { n:'Surface to Eat', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'heal', n:(P,E)=>2+E},{v:'engine', kind:'ap', val:1, dur:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Heal ${2+E}, and gain 1 AP at the start of each turn for ${1+h(E)} ${1+h(E) > 1 ? 'rounds' : 'round'}.` },
    'It stores the catch in its cheeks and eats at the surface.');
  K(['platypus'],'pla_shut','Eyes-Shut Hunt','C',0,
    { n:'Blind Strike', ap:1, el:0, cd:1, dur:0, tgt:'foe_r2',
      fx:[{v:'strike', kind:'los', dmg:(P,E)=>2+P, revealTarget:true}],
      txt:(P,E)=>`Strike a foe within 2 for ${2+P}, hidden or not.` },
    { n:'Find by Feel', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'locate', dur:2},{v:'strike', kind:'los', dmg:(P,E)=>2+E, revealTarget:true},{v:'studied', n:1}],
      txt:(P,E)=>`Find any foe by feel: it takes ${2+E}, can't Hide for 2 rounds, and your hits on it deal +1.` },
    'Eyes, ears and nose all closed underwater.');
  K(['platypus'],'pla_web','Webbed Fold','S',0,
    { n:'Paddle', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P},{v:'shield', val:1, dur:1}],
      txt:(P,E)=>`Move ${2+P}, and hold Shield 1 this round.` },
    { n:'Fold and Dig', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>2+E, dur:2},{v:'anchor', who:'self', dur:1},{v:'heal', n:1}],
      txt:(P,E)=>`Fold back the webbing and dig in: Shield ${2+E} for 2 rounds, nothing can push or pull you this round, and heal 1.` },
    'The webs fold back when it walks on land.');
  K(['platypus'],'pla_egg','Egg Clutch','T',0,
    { n:'Guard the Nest', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1, party:true, allyRange:1}],
      txt:(P,E)=>`You and an ally beside you hold Shield ${1+P} this round.` },
    { n:'Sealed Burrow', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'hidden', dur:(P,E)=>1+h(E), party:true, radius:1},{v:'engine', kind:'regen', val:1, dur:2, party:true}],
      txt:(P,E)=>`You and an ally beside you are Hidden ${1+h(E)}; both heroes heal 1 at the start of each turn for 2 rounds.` },
    'A mammal that lays eggs, and guards them.');
  K(['platypus'],'pla_odd','Odd One Out','C',0,
    { n:'Confuse', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'weaken', val:1, dur:(P,E)=>1+h(P)},{v:'strike', kind:'los', dmg:1}],
      txt:(P,E)=>`A foe within 3 takes 1 and is Weakened 1 for ${1+h(P)} ${1+h(P) > 1 ? 'rounds' : 'round'}.` },
    { n:'Nothing Like It', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'decoy', dur:(P,E)=>1+E, here:true},{v:'teleport', reach:2},{v:'empower', val:(P,E)=>1+E, uses:1, dur:2}],
      txt:(P,E)=>`Leave a puzzle where you stood (a decoy for ${1+E} rounds), slip to a node within 2, and your next hit deals +${1+E}.` },
    'The first scientists to see one thought it was a hoax.');
  /* ───────────────────────── BIRDS OF PREY AND OWLS ─────────────────────────
     bald eagle · hawk, with the barn owl. Hollow Bones and Talon Strike are the owl's, and every raptor's;
     Keen Sight and Stoop are the day hunters'. The hawk's Sky Hyperspeed is the cheetah's run, taken to the air. */
  T.SPECIES.owl.branch = 'Birds of prey and owls';
  S('eagle', { name: 'Bald Eagle', lean: 'M/C', branch: 'Birds of prey and owls', icon: '🦅',
    tagline: 'Broad wings, a voice like a rusty hinge, and a grip nothing breaks.' });
  S('hawk', { name: 'Hawk', lean: 'S/M', branch: 'Birds of prey and owls', icon: '🦅',
    tagline: 'Quick in the hedges, quicker in the open. Hangs on the wind and drops.' });
  T.shareTrait('owl_bones', 'eagle', 'hawk');
  T.shareTrait('owl_talon', 'eagle', 'hawk');

  K(['eagle','hawk'],'rap_sight','Keen Sight','C',0,
    { n:'Spot', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>3+P, dur:1},{v:'mark', nearest:true}],
      txt:(P,E)=>`See everything within ${3+P}, and Mark the nearest foe (the next hit on it deals +2).` },
    { n:'Eye of the Sky', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'reveal', radius:99, dur:1},{v:'locate', dur:(P,E)=>2+E},{v:'studied', n:(P,E)=>1+h(E)}],
      txt:(P,E)=>`See the whole board this round; pick a foe: it can't Hide for ${2+E} rounds, and your hits on it deal +${1+h(E)}.` },
    'It reads a newspaper from a mile up, if it cared to.', 'Birds of prey and owls');
  K(['eagle','hawk'],'rap_stoop','Stoop','M',0,
    { n:'Drop', ap:1, el:0, cd:1, dur:0, tgt:'foe_r3',
      fx:[{v:'move', n:2, toward:true, free:true},{v:'strike', kind:'melee', dmg:(P,E)=>2+P, ifAdjacent:true}],
      txt:(P,E)=>`Drop up to 2 toward a foe within 3; if you end beside it, melee ${2+P}.` },
    { n:'Plummet', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>3+E, dest:'adjTarget', height:true},{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'weaken', val:1, dur:1}],
      txt:(P,E)=>`Fold the wings and fall beside a foe within ${3+E}, height included: melee ${3+E}, and it is Weakened 1 this round.` },
    'Wings folded, and the whole sky behind it.', 'Birds of prey and owls');

  // Bald eagle: Hollow Bones, Talon Strike, Keen Sight, Stoop, and these five
  K(['eagle'],'eag_soar','Soar','S',0,
    { n:'Ride the Wind', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P, ignoreFoes:true},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Glide ${2+P}, over foes; hazards can't touch you this round.` },
    { n:'High Circle', ap:1, el:1, cd:3, dur:0, tgt:'node_climb',
      fx:[{v:'climb', reach:(P,E)=>2+E},{v:'reveal', radius:(P,E)=>2+E, dur:1},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Rise onto any node within ${2+E}, height included; see within ${2+E}, and your next hit this turn deals +1.` },
    'Hours on one thermal without a wingbeat.');
  K(['eagle'],'eag_lock','Talon Lock','M',0,
    { n:'Clamp', ap:1, el:0, cd:1, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+P},{v:'anchor', who:'foe', dur:1},{v:'anchor', who:'self', dur:1}],
      txt:(P,E)=>`Melee ${3+P} and lock on: it and you are both Anchored this round.` },
    { n:'Death Grip', ap:1, el:1, cd:3, dur:0, tgt:'foe_melee',
      fx:[{v:'strike', kind:'melee', dmg:(P,E)=>3+E},{v:'anchor', who:'foe', dur:(P,E)=>1+h(E), held:true},{v:'dot', kind:'grip', val:1, dur:2}],
      txt:(P,E)=>`Melee ${3+E} and do not let go: it is Anchored ${1+h(E)}, and takes 1 at the start of its next 2 turns.` },
    'A grip that does not open.');
  K(['eagle'],'eag_scream','Eagle Scream','C',0,
    { n:'Scream', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'weaken', val:1, dur:1, area:'adj'},{v:'empower', val:1, uses:1, dur:1, party:true}],
      txt:(P,E)=>`Every foe beside you is Weakened 1, and both heroes' next hit this round deals +1.` },
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
      fx:[{v:'shield', val:(P,E)=>1+P, dur:1, party:true, allyRange:1},{v:'counter', dmg:1, dur:1}],
      txt:(P,E)=>`You and an ally beside you hold Shield ${1+P} this round, and the first foe to hit you in melee takes 1.` },
    { n:'Eyrie', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'shield', val:(P,E)=>1+E, dur:2, party:true},{v:'engine', kind:'regen', val:1, dur:2, party:true}],
      txt:(P,E)=>`Both heroes hold Shield ${1+E} for 2 rounds and heal 1 at the start of each turn for 2 rounds.` },
    'A nest the size of a car, and it comes back every year.');

  // Hawk: Hollow Bones, Talon Strike, Keen Sight, Stoop, and these five
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
    { n:'Hold the Wind', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'hover', dur:(P,E)=>1+E},{v:'reveal', radius:(P,E)=>2+E, dur:1}],
      txt:(P,E)=>`Hover for ${1+E} rounds: immune to hazards, traps and push/pull, and mint 1 AP each turn; see within ${2+E}.` },
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
      fx:[{v:'move', n:(P,E)=>2+P, ignoreFoes:true, noTrap:true},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Weave ${2+P} through cover, past foes and setting off no traps; your next hit this turn deals +1.` },
    { n:'Through the Hedge', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>2+E, dest:'adjTarget'},{v:'strike', kind:'melee', dmg:(P,E)=>2+E, revealTarget:true},{v:'hidden', dur:1}],
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
      fx:[{v:'move', n:(P,E)=>2+P},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Wade ${2+P}; hazards can't touch you this round.` },
    { n:'Shallows', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E},{v:'hazardImmune', dur:2},{v:'clearHazard', radius:1},{v:'heal', n:1}],
      txt:(P,E)=>`Wade ${2+E}, clear the hazards within 1 of where you stop, heal 1, and ignore hazards for 2 rounds.` },
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
      fx:[{v:'move', n:(P,E)=>3+h(P)},{v:'hazardImmune', dur:1}],
      txt:(P,E)=>`Fly ${3+h(P)}; hazards can't touch you this round.` },
    { n:'Flyway', ap:1, el:1, cd:3, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+E},{v:'hasten', n:(P,E)=>1+h(E)},{v:'heal', n:1}],
      txt:(P,E)=>`Fly ${2+E} and heal 1; your track slides ${1+h(E)} extra (your cards come back sooner).` },
    'The same road in the sky, every year, for ten thousand years.');
  K(['crane'],'cra_dance','Courtship Dance','C',0,
    { n:'Dance', ap:1, el:0, cd:1, dur:0, tgt:'party',
      fx:[{v:'empower', val:(P,E)=>1+P, uses:1, dur:2, target:'ally'},{v:'shield', val:1, dur:1, party:true}],
      txt:(P,E)=>`Dance for your partner: their next hit deals +${1+P}, and both heroes hold Shield 1 this round.` },
    { n:'Pair Dance', ap:1, el:1, cd:3, dur:0, tgt:'party',
      fx:[{v:'cleanse', party:true},{v:'heal', n:(P,E)=>1+E, party:true},{v:'empower', val:1, uses:1, dur:2, party:true}],
      txt:(P,E)=>`Both heroes shake off Anchored and Weakened, heal ${1+E}, and deal +1 on their next hit.` },
    'Bow, leap, toss a stick, bow again.');
  K(['crane'],'cra_stride','Long Stride','S',0,
    { n:'Stride', ap:1, el:0, cd:0, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P}],
      txt:(P,E)=>`Stride ${2+P}.` },
    { n:'Run-Up', ap:1, el:1, cd:3, dur:0, tgt:'node_tele',
      fx:[{v:'teleport', reach:(P,E)=>3+E, height:true},{v:'hazardImmune', dur:1}],
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
    { n:'Rookery Watch', ap:1, el:1, cd:4, dur:0, tgt:'party',
      fx:[{v:'engine', kind:'regen', val:1, dur:2, party:true},{v:'reveal', radius:99, dur:1}],
      txt:(P,E)=>`Someone is always watching: see the whole board this round, and both heroes heal 1 at the start of each turn for 2 rounds.` },
    'A hundred nests in one tree, and every one awake.');

  // Egret: Hollow Bones, Spear Bill, Still Hunt, Wade, Long Legs, and these four
  K(['egret'],'egr_plumes','Plumes','C',0,
    { n:'Display', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'decoy', dur:1, here:true},{v:'move', n:(P,E)=>1+P}],
      txt:(P,E)=>`Flare your plumes and slip away: leave a decoy where you stood for 1 round, and move ${1+P}.` },
    { n:'Dazzle', ap:1, el:1, cd:3, dur:0, tgt:'foe_r3',
      fx:[{v:'weaken', val:(P,E)=>1+h(E), dur:2},{v:'mark'},{v:'studied', n:1}],
      txt:(P,E)=>`Dazzle a foe within 3: it is Weakened ${1+h(E)} for 2 rounds and Marked, and your hits on it deal +1.` },
    'Plumes once worth more than gold.');
  K(['egret'],'egr_stir','Foot Stir','T',0,
    { n:'Stir', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reveal', radius:(P,E)=>1+P, dur:1},{v:'mark', nearest:true},{v:'empower', val:1, uses:1, dur:1}],
      txt:(P,E)=>`Stir the mud with a yellow foot: see within ${1+P}, Mark the nearest foe, and your next hit this turn deals +1.` },
    { n:'Flush Out', ap:1, el:1, cd:3, dur:0, tgt:'foe_any',
      fx:[{v:'locate', dur:2},{v:'strike', kind:'los', dmg:1, revealTarget:true},{v:'studied', n:(P,E)=>1+h(E)}],
      txt:(P,E)=>`Flush out any foe: it takes 1, can't Hide for 2 rounds, and your hits on it deal +${1+h(E)}.` },
    'Bright feet, shuffled, and everything hiding moves.');
  K(['egret'],'egr_cattle','Cattle Rider','S',0,
    { n:'Follow the Herd', ap:1, el:0, cd:1, dur:0, tgt:'node_move',
      fx:[{v:'move', n:(P,E)=>2+P},{v:'heal', n:1},{v:'empower', val:1, uses:1, dur:2, target:'ally'}],
      txt:(P,E)=>`Move ${2+P} and heal 1; your ally's next hit deals +1.` },
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
      txt:(P,E)=>`Float for ${1+E} rounds: immune to push/pull, traps and hazards, and you may walk onto height nodes; heal 1, and your next hit deals +1.` },
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
      fx:[{v:'hazardImmune', dur:(P,E)=>2+E, party:true},{v:'engine', kind:'regen', val:1, dur:2, party:true}],
      txt:(P,E)=>`Both heroes ignore hazards for ${2+E} rounds and heal 1 at the start of each turn for 2 rounds.` },
    'When the river rises, the ibis comes.');
  K(['ibis'],'ibi_scribe','Scribe’s Eye','T',0,
    { n:'Read the Signs', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'reroll', n:(P,E)=>1+h(P)},{v:'reveal', radius:2, dur:1}],
      txt:(P,E)=>`Reroll up to ${1+h(P)} banked dice, and see within 2.` },
    { n:'Write It Down', ap:1, el:1, cd:4, dur:0, tgt:'self',
      fx:[{v:'engine', kind:'draw', face:'T', val:1},{v:'reroll', n:1},{v:'preempt', val:(P,E)=>1+E, reflect:0}],
      txt:(P,E)=>`Draw a Time die from your pool and reroll 1 banked die; the next hit on you is ${1+E} less.` },
    'The bird of the scribes, in the oldest stories.');
  K(['ibis'],'ibi_flock','Flock V','S',0,
    { n:'Formation', ap:1, el:0, cd:1, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>1+P},{v:'shield', val:1, dur:1, party:true}],
      txt:(P,E)=>`Your ally moves ${1+P}, where you choose; both heroes hold Shield 1 this round.` },
    { n:'V-Flight', ap:1, el:1, cd:4, dur:0, tgt:'ally_move',
      fx:[{v:'rally', move:(P,E)=>2+E},{v:'shield', val:(P,E)=>1+h(E), dur:1, party:true},{v:'hasten', n:1, who:'ally'}],
      txt:(P,E)=>`Your ally moves ${2+E} in your slipstream; both hold Shield ${1+h(E)} this round, and your ally's track slides 1 extra.` },
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
    { n:'Long Rest', ap:1, el:1, cd:4, dur:0, tgt:'self',
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
      fx:[{v:'dot', kind:'salt', val:(P,E)=>1+h(E), dur:2, area:'nodeArea'},{v:'hazardImmune', dur:2, party:true}],
      txt:(P,E)=>`Stir the bitter lake at a node within 2: every foe on or beside it takes ${1+h(E)} at the start of its next 2 turns; both heroes ignore hazards for 2 rounds.` },
    'It lives where the water would strip your skin.');
  K(['flamingo'],'fla_milk','Crop Milk','T',0,
    { n:'Feed', ap:1, el:0, cd:1, dur:0, tgt:'ally',
      fx:[{v:'heal', n:(P,E)=>2+P, target:'ally'}],
      txt:(P,E)=>`Your ally heals ${2+P}.` },
    { n:'Nourish', ap:1, el:1, cd:4, dur:0, tgt:'ally',
      fx:[{v:'heal', n:(P,E)=>2+E, target:'ally'},{v:'engine', kind:'ap', val:1, dur:1, target:'ally'},{v:'cleanse', party:true}],
      txt:(P,E)=>`Your ally heals ${2+E} and gains 1 AP next turn; both heroes shake off Anchored and Weakened.` },
    'Both parents make it, and it is red.');
  K(['flamingo'],'fla_pink','Pink Flock','C',0,
    { n:'Blend In', ap:1, el:0, cd:1, dur:0, tgt:'self',
      fx:[{v:'hidden', dur:1, party:true, radius:1},{v:'heal', n:1}],
      txt:(P,E)=>`Lose yourself in the flock: you and an ally beside you are Hidden 1, and you heal 1.` },
    { n:'A Thousand Pink', ap:1, el:1, cd:3, dur:0, tgt:'self',
      fx:[{v:'decoy', dur:(P,E)=>1+E, here:true},{v:'hidden', dur:1, party:true, radius:1},{v:'empower', val:(P,E)=>1+h(E), uses:1, dur:2}],
      txt:(P,E)=>`Leave a decoy for ${1+E} rounds; you and an ally beside you are Hidden 1, and your next hit deals +${1+h(E)}.` },
    'Which one? All of them.');
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
