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
      txt:(P,E)=>`Reveal within ${1+P} for 2 rounds; the nearest foe is Marked and can't Hide for 2 rounds.` },
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
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
