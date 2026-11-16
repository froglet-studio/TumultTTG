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
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
