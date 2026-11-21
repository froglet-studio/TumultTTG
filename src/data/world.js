/* ============================================================================
   TUMULT v2.0 — DATA: WORLD
   Rules constants, gear (omnicrystal-fueled), consumables, boons, the
   bestiary, events, prebuilt heroes, and flavor text. Board and mission
   generators and the Tide Map live in src/engine/generators.js.
   ========================================================================== */
(function (T) {
  const f = (n) => () => n;

  /* ───────────────────────────── CONSTANTS ───────────────────────────── */
  T.RULES = {
    VITALITY: 26,            // hero vitality
    POOL: 15,                // dice per hero — invariant
    ROLL: 4,                 // dice rolled per turn (4 since 2.29: Garrett, 2026-11-14)
    ROLL_EL: 1,              // of them, element dice of the player's choice; the rest plain (2.83: Garrett, 2026-11-21)
    TRACK: 6,                // track columns
    FACES: ['M','C','S','T','O','AP','AP','AP','AP','AP','AP','AP','AP','AP','AP','AP','AP','AP','AP','AP'], // the plain die, a d20: each element once, 15 AP
    ELEMENT_DICE: 1,         // each card awakened (E 1+) puts one die of its element in the pool in place of a plain die (2.29)
    FOE_HP: 150,             // foes' vitality, percent of the bestiary's (140 in 2.83: the chosen element die; 145 in 2.85; 150 since 2.105: weapons)
    MOVE_AP: 1,              // AP per walk step
    INTERACT_AP: 2,
    RALLY_AP: 2, RALLY_HP: 8,  // revive a downed adjacent ally
    HAZARD_DMG: 3,
    P_CAP: 3, E_CAP: 3,
    ETHEREAL_MIN_E: 1,       // E a card needs before its Ethereal face can be played: Ethereal faces are magic that
                             // must be awakened (Garrett, 2026-11-12). 0 is the v2.0 rule, kept as a switch.
    START_AWAKE: 2,          // a new hero begins with this many cards awakened (E 1), paid from START_UP
    START_UP: 6, START_CARDS: 6, MAX_PER_SPECIES: 3, MAX_CARDS: 9,
    DOUBLE_UP: 1,            // 2.42–2.76: a shared trait taken a second time was this many UP for it alone (old saves keep them)
    GEAR_SLOTS: 2,
  };

  // Zones: two units that share a zone are in range of a ranged strike. Muted earth tones, so a zone is never
  // mistaken for an etherion (red, yellow, cyan, violet) or a domain (jade, ruby, gold).
  T.ZONES = {
    A: { name: 'Slate', color: '#7f9cc0' },
    B: { name: 'Sand',  color: '#cdb68a' },
    C: { name: 'Plum',  color: '#a585ad' },
    D: { name: 'Sage',  color: '#8fab80' },
    E: { name: 'Clay',  color: '#c08a6e' },
    F: { name: 'Ash',   color: '#a3a7ad' },
  };

  /* ───────────────────────────── GEAR (◇) ───────────────────────────── */
  // Gear is ethereal technology (the keyword plan, Garrett 2026-11-21): it works on spaces, the dice, the clock
  // and the downed, it is bought rather than trained, and it never strikes except through a Field. Each piece has
  // two actives, paid in omnicrystals with their own small cooldown (not the track), and one passive, always on
  // while it is worn. Since 2.89 the passives carry what boons did and the actives what consumables did.
  // `passive.hook` is one of T.BOON_HOOKS (src/engine/engine.js); `passive.txt` is the sentence on the gear.
  T.GEAR = [
    { id:'grapnel', name:'Winch', price:6, icon:'🪝',
      desc:'Fields that drag. Lay a line on the ground and whatever crosses it is reeled toward you.',
      passive:{ hook:'fieldForce', val:1, txt:'Your Fields push and pull 1 further.' },
      abilities:[
        { n:'Reel Line', cost:1, cd:1, tgt:'node_r2', fx:[{v:'field', on:'enter', trips:1, dur:f(3), remote:f(2), fx:[{kw:'pull', n:f(2)}]}], txt:()=>'A Field on a space within 2 for 3 rounds: the first foe to enter is pulled 2 toward you.' },
        { n:'Winch', cost:2, cd:3, tgt:'node_r3', fx:[{v:'field', radius:f(1), on:'enter', trips:f(2), dur:f(2), remote:f(3), fx:[{kw:'pull', n:f(2)},{kw:'anchor', t:f(1)}]}], txt:()=>'A Field on a space within 3 and its neighbours for 2 rounds: the first 2 foes to enter are pulled 2 toward you and Anchored 1.' },
      ]},
    { id:'scope', name:'Scope', price:5, icon:'🔭',
      desc:'Reveal for any build. Finds Hidden foes and the hidden objective.',
      passive:{ hook:'keen', val:1, txt:'Your reveals reach 1 further, and Hidden foes beside you are revealed as your turn begins.' },
      abilities:[
        { n:'Glance', cost:1, cd:1, tgt:'self', fx:[{v:'reveal', radius:f(2), dur:f(1)}], txt:()=>'Reveal everything within 2.' },
        { n:'Survey', cost:2, cd:3, tgt:'self', fx:[{v:'reveal', radius:f(99), dur:f(2), findObjective:true}], txt:()=>'Reveal the whole board for 2 rounds and pinpoint the hidden objective.' },
      ]},
    { id:'capacitor', name:'Capacitor', price:6, icon:'🔋',
      desc:'Economy. Convert omnicrystals into dice when the weather is bad.',
      passive:{ hook:'missionStart', val:{bank:'AP'}, txt:'Start each mission with 1 AP already banked.' },
      abilities:[
        { n:'Store', cost:1, cd:1, tgt:'self', fx:[{v:'draw', face:'O', n:f(1)}], txt:()=>'Draw 1 pool die into your bank as Omni.' },
        { n:'Discharge', cost:2, cd:3, tgt:'self', fx:[{v:'mint', face:'AP', n:f(2)},{v:'mint', face:'C', n:f(1)}], txt:()=>'Mint 2 AP and 1 Charge this turn.' },
      ]},
    { id:'phasebrace', name:'Phase-brace', price:7, icon:'🌀',
      desc:'Space for any build. Reaches height nodes.',
      passive:{ hook:'blinkReach', val:1, txt:'Your blinks reach 1 further.' },
      abilities:[
        { n:'Blink', cost:2, cd:2, tgt:'node_tele', fx:[{v:'blink', reach:f(2), height:true}], txt:()=>'Blink to any node within 2 — height included.' },
        { n:'Fade', cost:1, cd:2, tgt:'self', fx:[{v:'hidden', dur:f(1)}], txt:()=>'Hidden 1.' },
      ]},
    { id:'chronoshim', name:'Chrono-shim', price:7, icon:'⏳',
      desc:'Time for any build. Returns cards sooner, buys rounds from the clock.',
      passive:{ hook:'roundStart', val:{round:2, hasten:1}, txt:'As round 2 begins, your track slides 1 extra column: what you played in round 1 comes home sooner.' },
      abilities:[
        { n:'Shim', cost:1, cd:1, tgt:'self', fx:[{v:'haste', n:f(1)}], txt:()=>'Haste: every card on your track returns 1 column sooner.' },
        { n:'Rewind', cost:3, cd:4, tgt:'self', fx:[{v:'haste', n:f(3)},{v:'haste', clock:true, n:f(2)}], txt:()=>'Haste: your track slides 3 extra columns, and the mission clock gains 2.' },
      ]},
    { id:'aegis', name:'Aegis Plate', price:6, icon:'🛡️',
      desc:'Mitigation for any build. Even against area.',
      passive:{ hook:'shieldBonus', val:1, txt:'Every Shield you gain is +1.' },
      abilities:[
        { n:'Brace', cost:1, cd:1, tgt:'self', fx:[{v:'shield', val:f(3), dur:f(1), all:true}], txt:()=>'Shield 3 against everything this round.' },
        { n:'Bulwark', cost:2, cd:3, tgt:'party', fx:[{v:'shield', val:f(3), dur:f(2), all:true, party:true, allyRange:f(1)}], txt:()=>'Shield 3 against everything for 2 rounds, on you and every ally beside you.' },
      ]},
    { id:'lantern', name:'Storm Lantern', price:5, icon:'🏮',
      desc:'Reveal + Mark, and a beacon for an ally.',
      passive:{ hook:'spot', val:1, txt:'As your turn begins, a foe within 1 of you (beside you) is Marked.' },
      abilities:[
        { n:'Flare', cost:1, cd:2, tgt:'self', fx:[{v:'reveal', radius:f(2), dur:f(1)},{v:'mark', area:true, radius:f(2)}], txt:()=>'Reveal within 2 and Mark every foe revealed.' },
        { n:'Beacon', cost:2, cd:2, tgt:'ally_move', fx:[{v:'guide', n:f(2)}], txt:()=>'Guide an ally up to 2 nodes, to a node you choose, now.' },
      ]},
    { id:'harpoon', name:'Turret', price:6, icon:'🎯',
      desc:'Fields that strike. Set a turret down and it holds the ground around it.',
      passive:{ hook:'fieldDur', val:1, txt:'Your Fields last 1 round longer.' },
      abilities:[
        { n:'Sentry', cost:1, cd:1, tgt:'node_r2', fx:[{v:'field', radius:f(1), on:'end', dur:f(2), remote:f(2), fx:[{kw:'strike', n:f(2)}]}], txt:()=>'A turret on a space within 2 for 2 rounds: every foe that ends the round on it or beside it takes 2.' },
        { n:'Skewer', cost:2, cd:3, tgt:'node_r2', fx:[{v:'field', on:'enter', trips:1, dur:f(3), remote:f(2), fx:[{kw:'strike', n:f(5), pierce:true}]}], txt:()=>'A spike on a space within 2 for 3 rounds: the first foe to enter takes 5, Pierce.' },
      ]},
    { id:'climbrig', name:'Climbing Rig', price:4, icon:'🧗',
      desc:'The cheap answer to height.',
      passive:{ hook:'noPull', val:true, txt:'Mag boots: you cannot be pulled.' },
      abilities:[
        { n:'Ascend', cost:1, cd:1, tgt:'node_move', fx:[{v:'move', climb:true, n:f(1)}], txt:()=>'Climb 1.' },
        { n:'Rappel', cost:1, cd:1, tgt:'node_move', fx:[{v:'move', n:f(2), ignoreFoes:true}], txt:()=>'Move 2, through foes.' },
      ]},
    { id:'medkit', name:'Medkit', price:5, icon:'🩹',
      desc:'Heal and revive, fueled by omnicrystals.',
      passive:{ hook:'autoRevive', val:10, txt:'Once a mission, when you would go down, you rise with 10 hp instead.' },
      abilities:[
        { n:'Patch', cost:1, cd:1, tgt:'self', fx:[{v:'field', radius:f(1), on:'end', dur:f(2), fx:[{kw:'heal', n:f(3)}]}], txt:()=>'A mending Field on your space and beside it for 2 rounds: allies ending the round there Heal 3 (a downed one gets up).' },
        { n:'Revive', cost:2, cd:3, tgt:'self', fx:[{v:'heal', n:f(10), target:'downedAdj'}], txt:()=>'Heal 10 a downed ally beside you: it gets up with 10.' },
      ]},
    // Weapons (2.105: Garrett, 2026-11-21): tech that makes your own strikes hit harder. A weapon never strikes on
    // its own; its passive adds to every strike of its reach you make, and its Overcharge takes banked Omni dice
    // (the omnicrystals a player rolls) for an Empower on every such strike this round.
    { id:'baton', name:'Shock Baton', price:6, icon:'⚡',
      desc:'A melee weapon. Every blow you land in melee hits harder; feed it Omni and it hits much harder.',
      passive:{ hook:'weapon', val:{ reach:'melee', n:1 }, txt:'Your melee strikes deal 1 more.' },
      abilities:[
        { n:'Overcharge', cost:0, omni:1, cd:0, tgt:'self', fx:[{v:'empower', val:f(2), kind:['melee'], uses:99, dur:f(1), stack:true}], txt:()=>'Put a banked Omni on the baton: Empowered 2 for every melee strike you make this round. Stack as many as you have.' },
        { n:'Arc Guard', cost:1, cd:2, tgt:'self', fx:[{v:'thorns', val:f(2), dur:f(1)}], txt:()=>'Thorns 2 this round: anything that strikes you in melee takes 2.' },
      ]},
    { id:'coilgun', name:'Coil Rifle', price:6, icon:'🔫',
      desc:'A ranged weapon. Every shot you take at range hits harder; feed it Omni and it hits much harder.',
      passive:{ hook:'weapon', val:{ reach:'ranged', n:1 }, txt:'Your ranged strikes deal 1 more.' },
      abilities:[
        { n:'Overcharge', cost:0, omni:1, cd:0, tgt:'self', fx:[{v:'empower', val:f(2), kind:['los','any'], uses:99, dur:f(1), stack:true}], txt:()=>'Put a banked Omni on the rifle: Empowered 2 for every ranged strike you make this round. Stack as many as you have.' },
        { n:'Rangefinder', cost:1, cd:2, tgt:'foe_los', fx:[{v:'reveal', target:true, dur:f(2)},{v:'mark'}], txt:()=>'A foe in your zone is Revealed for 2 rounds and Marked: the next hit on it deals 2 more.' },
      ]},
  ];
  T.GEAR_BY = {}; T.GEAR.forEach(g => T.GEAR_BY[g.id] = g);

  /* ───────────────────────────── DICE KINDS (2.29) ───────────────────────────── */
  // Garrett's original dice: a plain d20 (T.RULES.FACES: every element once, the rest AP), an ethereal d12 with two
  // of every symbol, and a d8 for each element (half its own element, one each of the others and Omni, no AP).
  // A pilot always has 15 dice; awakened cards swap plain dice for their element's d8, the mage path. docs/design/10-dice.md
  T.DICE = {
    plain: { n:'Plain die', sides:20 },
    eth:   { n:'Ethereal die', sides:12, faces:['AP','AP','O','O','M','M','C','C','S','S','T','T'] },
    M:     { n:'Mass die',   sides:8, faces:['M','M','M','M','C','S','T','O'] },
    C:     { n:'Charge die', sides:8, faces:['C','C','C','C','M','S','T','O'] },
    S:     { n:'Space die',  sides:8, faces:['S','S','S','S','M','C','T','O'] },
    T:     { n:'Time die',   sides:8, faces:['T','T','T','T','M','C','S','O'] },
  };

  /* ───────────────────────────── TIDES (difficulty) ───────────────────────────── */
  // How hard a run's missions press. Each list is indexed by tier (1, 2, 3); the boss is never changed.
  // Rising is the game as it was tuned before 2.7. Flood is for careful players: bigger objectives on
  // shorter clocks are what press a careful squad — more or tougher foes hardly do (BALANCE.md, v2.7.0).
  /* Places as opponents (2.26): the gravity of a page and the weather of the day are rules, each one
     sentence a player can resolve by hand. Bands by the page's gravity in g. */
  T.GRAVITY = [
    { id: 'light',  max: 0.5,      name: 'Light gravity', text: 'Anything shoved or pulled goes 1 space further.' },
    { id: 'normal', max: 2.9,      name: 'Gravity',       text: '' },
    { id: 'heavy',  max: Infinity, name: 'Heavy gravity', text: 'Anything shoved or pulled takes 1 damage for each space it is moved.' },
  ];
  T.WEATHER = {
    calm: { name: 'Calm', text: '' },
    wind: { name: 'Wind', text: 'At the end of every round the wind moves every unit 1 space downwind, if a path leads there and the space is free. A shield, an anchor or a hover holds you; so does the Heart.' },
    fog:  { name: 'Fog',  text: 'A ranged strike reaches only units within 2 steps, even in its zone.' },
  };
  T.FOG_RANGE = 2;
  T.TIDES = {
    // 2.29: four dice a turn, so every objective needs 1 more and every clock but a hold's starts 1 round shorter
    // than the missions' own numbers, from tier 1; the Gale keeps its lead from tier 2.
    rising: { id:'rising', n:'Steady wind', need:[1,1,1], clock:[1,1,1], swarm:[0,0,0], escorts:[[],[],[]],
      txt:'Tumult as it blows: every objective needs 1 more than its base, and every clock but a hold’s starts 1 round shorter.' },
    flood: { id:'flood', n:'Gale', need:[1,2,2], clock:[1,2,2], swarm:[0,1,2], escorts:[[],['kiter'],['binder','kiter']],
      txt:'As the steady wind, and from tier 2 every objective needs 1 more again, every clock but a hold’s starts 1 round shorter again, swarms grow 1 larger (tier 3: 2), and elites bring 1 more escort (2).' },
  };
  T.TIDE_ORDER = ['rising', 'flood'];

  /* ───────────────────────────── BASIC ACTIONS ───────────────────────────── */
  // What every hero can always do, with no cards at all (design/02). Weak on purpose: they are the floor,
  // so that no mission needs an ability. Same verbs as cards; no track, no etherion. Move, Interact and
  // Rally predate this table and keep their own code.
  T.BASIC = [
    { id:'strike', n:'Strike', icon:'⚔', ap:2, tgt:'foe_melee', fx:[{v:'strike', kind:'melee', dmg:f(2)}], txt:'2 damage to an adjacent foe.' },
    { id:'brace',  n:'Brace',  icon:'🛡', ap:1, tgt:'self',      fx:[{v:'shield', val:f(1), dur:f(1)}],      txt:'Shield 1 until your next turn.' },
    { id:'shove',  n:'Shove',  icon:'↦', ap:2, tgt:'foe_melee', fx:[{v:'force', kind:'push', n:f(1)}],     txt:'Push an adjacent foe 1 node.' },
    // Channel: a banked etherion (or Omni) is an action on its own — no AP — so a rolled crystal is never a dead
    // die, even for a hero with no awakened card of its colour (Garrett, 2026-11-12: "we want elements to be the
    // exciting rolls not dead weight"). Every colour has one that needs no target, or one that almost always has
    // one. Still weaker than any Ethereal face of the same colour: the floor, not a strategy.
    { id:'strike_M',   n:'Strike',   icon:'⚔', ap:0, el:'M', tgt:'foe_melee', fx:[{v:'strike', kind:'melee', dmg:f(2)}],                   txt:'Channel Mass: 2 damage to an adjacent foe.' },
    { id:'shove_M',    n:'Shove',    icon:'↦', ap:0, el:'M', tgt:'foe_melee', fx:[{v:'force', kind:'push', n:f(1)}],                       txt:'Channel Mass: push an adjacent foe 1 node.' },
    { id:'arc_C',      n:'Arc',      icon:'ϟ', ap:0, el:'C', tgt:'foe_r3',    fx:[{v:'strike', kind:'any', dmg:f(1)}],                     txt:'Channel Charge: 1 damage to a foe up to 3 nodes away.' },
    { id:'reach_C',    n:'Reach',    icon:'⚙', ap:1, el:'C', tgt:'node_r2',   fx:[{v:'interact', range:f(2)}],                             txt:'Channel Charge: Interact with an objective up to 2 nodes away (not up a ledge from below).' },
    { id:'scramble_S', n:'Scramble', icon:'⤴', ap:0, el:'S', tgt:'node_move', fx:[{v:'move', climb:true, n:f(1)}],                               txt:'Channel Space: climb 1 (a step that may take a ledge).' },
    // Duet moves (2.28): one pilot sets up, the other cashes in, so a turn can be spent on your partner's.
    // General verbs that already exist (mark, rally, mint); each needs a partner to pay off in full.
    { id:'spot',  n:'Spot',   icon:'◎', ap:2, tgt:'foe_r3',   fx:[{v:'mark'}],                                   txt:'Mark a foe up to 3 nodes away: the next hit on it, by anyone, deals +2.' },
    { id:'legup', n:'Leg up', icon:'⇡', ap:1, tgt:'ally_adj_move', fx:[{v:'guide', n:f(2)}],                  txt:'Boost an adjacent ally: Guide them 2, now.' },
    { id:'lend',  n:'Lend',   icon:'⇄', ap:2, tgt:'ally_adj', fx:[{v:'mint', face:'AP', n:f(2), target:'ally'}], txt:'Give an adjacent ally 2 AP to spend this round. Lent after their turn, it is lost.' },
    { id:'brace_T',    n:'Brace',    icon:'🛡', ap:0, el:'T', tgt:'self',      fx:[{v:'shield', val:f(1), dur:f(1)},{v:'haste', n:f(1)}], txt:'Channel Time: Shield 1 until your next turn, and Haste: your track slides 1 extra column.' },
  ];
  T.BASIC_BY = {}; T.BASIC.forEach(b => T.BASIC_BY[b.id] = b);

  /* ───────────────────────────── CONSUMABLES ───────────────────────────── */
  // Retired in 2.89 (the keyword plan): each one's job is now a gear active (Rally Vial: the Medkit's Patch; Grit:
  // the Aegis Plate's Brace; Flashpowder: the Scope's Glance; Omni Shard: the Capacitor's Store; Windbreak Charm:
  // the Chrono-shim's Rewind). The list stays, empty, so older saves load (their items are refunded).
  T.CONSUMABLES = [];
  T.CONSUMABLE_BY = {}; T.CONSUMABLES.forEach(c => T.CONSUMABLE_BY[c.id] = c);

  /* ───────────────────────────── BOONS ───────────────────────────── */
  // Retired in 2.89 (the keyword plan): every boon that did a pilot's job is a gear passive now (Thick Hide: Aegis
  // Plate; Keen Sense: Scope; Quick Hands: Chrono-shim; Second Wind: Medkit; Anchor Soul: Climbing Rig;
  // Etherion-touched, gentler: the Capacitor banks 1 AP). The Affinities and Omni Core are cut, since the element die is chosen each turn;
  // Momentum and Defiant are cut; Deep Pockets and Studious were route rewards. Empty, so older saves load.
  T.BOONS = [];
  T.BOON_BY = {}; T.BOONS.forEach(b => T.BOON_BY[b.id] = b);

  /* ───────────────────────────── BESTIARY ───────────────────────────── */
  // Stats are indexed by tier [t1,t2,t3]. Intents are telegraphed at round start.
  // Enemies are built from the same verbs as heroes — no special rules.
  T.ENEMIES = {
    biter:    { name:'Biter', glyph:'🦷', role:'swarm', hp:[3,4,5], speed:2, policy:'rush',
      abilities:{ bite:{ n:'Bite', kind:'melee', dmg:[2,3,3] } },
      flavor:'Spawn of the Heart. One is nothing. Six are a swarm.' },
    stinger:  { name:'Stinger', glyph:'🪡', role:'swarm', hp:[3,4,5], speed:1, policy:'shooter',
      abilities:{ sting:{ n:'Sting', kind:'los', dmg:[2,3,3] } },
      flavor:'Keeps its zone and never closes.' },
    brute:    { name:'Brute', glyph:'🦍', role:'bruiser', hp:[10,13,16], speed:1, policy:'brute',
      abilities:{ slam:{ n:'Slam', kind:'melee', dmg:[5,6,7], push:1 } },
      flavor:'Slow. Then not.' },
    kiter:    { name:'Kiter', glyph:'🏹', role:'zoner', hp:[7,9,11], speed:2, policy:'kiter',
      abilities:{ shot:{ n:'Shot', kind:'los', dmg:[3,4,5] } },
      flavor:'Shoots, retreats, shoots. Deny it the zone.' },
    warden:   { name:'Warden', glyph:'🗿', role:'guardian', hp:[12,15,18], speed:0, policy:'guardian', shield:[3,3,3], anchored:true,
      abilities:{ cleave:{ n:'Cleave', kind:'melee', dmg:[4,5,6] }, brace:{ n:'Brace', kind:'brace' } },
      flavor:'It does not move. You go around it or through it — Pierce or true damage; its shield stops area too.' },
    lurker:   { name:'Lurker', glyph:'🫥', role:'ambusher', hp:[7,9,11], speed:2, policy:'lurker', hidden:true,
      abilities:{ ambush:{ n:'Ambush', kind:'melee', dmg:[5,6,7], ambush:true }, creep:{ n:'Creep', kind:'move' } },
      flavor:'You will not see it until it is adjacent. Reveal it first.' },
    binder:   { name:'Binder', glyph:'🕸️', role:'controller', hp:[7,9,11], speed:1, policy:'binder',
      abilities:{ bind:{ n:'Bind', kind:'los', dmg:[2,2,3], anchor:2 }, drain:{ n:'Drain', kind:'melee', dmg:[3,3,4], heal:2 } },
      flavor:'Roots you where it wants you. It still cannot stop you acting.' },
    spawner:  { name:'Spawner', glyph:'🫧', role:'structure', hp:[7,9,11], speed:0, policy:'spawner', anchored:true, spawnEvery:3, spawns:'biter',
      abilities:{ spawn:{ n:'Spawn', kind:'summon' } },
      flavor:'A node of the Heart. Kill it and the swarm thins.' },
    bulwark:  { name:'Bulwark', glyph:'🛡️', role:'elite', elite:true, hp:[18,22,26], speed:1, policy:'bulwark', shield:[2,2,3],
      abilities:{ crush:{ n:'Crush', kind:'melee', dmg:[5,6,7] }, quake:{ n:'Quake', kind:'area', dmg:[3,4,4] }, brace:{ n:'Brace', kind:'brace' } },
      flavor:'An elite. Its quake punishes clumping.' },
    harrier:  { name:'Harrier', glyph:'🗡️', role:'elite', elite:true, hp:[12,15,18], speed:2, policy:'harrier', hidden:true,
      abilities:{ lance:{ n:'Phase Lance', kind:'teleStrike', dmg:[5,6,7], reach:3 }, fade:{ n:'Fade', kind:'hide' } },
      flavor:'An elite. Blinks to your weakest hero. Anchor it or reveal it.' },
    tidecaller:{ name:'Tidecaller', glyph:'🌊', role:'elite', elite:true, hp:[12,14,16], speed:1, policy:'tidecaller',
      abilities:{ undertow:{ n:'Undertow', kind:'los', dmg:[2,3,3], pull:2 }, surge:{ n:'Surge', kind:'los', dmg:[4,5,6], weaken:1 } },
      flavor:'An elite. Drags you toward the hazard. Anchor yourself.' },
    heart:    { name:'The Heart', glyph:'🫀', role:'boss', boss:true, hp:[50,61,86], speed:0, policy:'heart', anchored:true, shield:[4,4,4],
      abilities:{ lance:{ n:'Lance', kind:'los', dmg:[3,4,5] }, crush:{ n:'Crush', kind:'melee', dmg:[7,8,9], pull:2 }, call:{ n:'Call the Swarm', kind:'summon' } },
      flavor:'What waits at the end of the route. Its shield is fed by its Spawners. When it is half-dead, the Vault begins to drown.' },
  };

  /* ───────────────────────────── EVENTS ───────────────────────────── */
  // Narrative forks. Each option lists effects the run layer applies.
  T.EVENTS = [
    { id:'beacon', title:'Terminal Beacon', icon:'📡',
      text:'A Terminal relay blinks awake as you pass. "Service available," it says, in the voice it uses for everyone. It will help those who help themselves — and it will log the transaction.',
      options:[
        { label:'Request repair (4 ◇)', cost:{crystals:4}, fx:{healAll:'full'}, result:'The squad is restored. The relay files a receipt with no name on it.' },
        { label:'Accept a nudge', fx:{up:2, damageOne:5}, result:'A corrective jolt. One hero staggers (−5), both come away sharper (+2 UP each).' },
        { label:'Walk on', fx:{}, result:'The relay dims. It has a hundred thousand years; it can wait.' },
      ]},
    { id:'toll', title:'Privateer Toll', icon:'🏴‍☠️',
      text:'Privateers have strung a line across the pass. Piracy here is older than law — a redistribution the Terminal tolerates. They want three crystals for safe passage.',
      options:[
        { label:'Pay the toll (3 ◇)', cost:{crystals:3}, fx:{}, result:'They salute, almost sincerely, and let you through.' },
        { label:'Refuse', fx:{nextElite:true, crystals:4}, result:'You keep your crystals and take theirs (+4 ◇) — but word travels. The next stop will be guarded by an elite.' },
        { label:'Offer a trade', fx:{tradeCard:true}, result:'One hero swaps a trait for something from the privateers\' hold.' },
      ]},
    { id:'storm', title:'Etherion Storm', icon:'⛈️',
      text:'The weather itself turns to etherion. Mass, Charge, Space, Time — a raw front of one of them rolls over the squad. To stand in it is to be changed by it.',
      options:[
        { label:'Stand in it', fx:{crystals:5, damageOne:4}, result:'One hero takes 4, and comes out with 5 ◇ of ether crystallised on their coat.' },
        { label:'Shelter', fx:{}, result:'You wait it out. The front passes, taking nothing.' },
      ]},
    { id:'bloom', title:'Bloom of the Superorganism', icon:'🌸',
      text:'A reef flowers along the shore — all of it one body, the superorganism reminding you whose cells you are made from.',
      options:[
        { label:'Rest among the blooms', fx:{healAll:8}, result:'Every pilot heals 8. Something in the reef recognizes your bloodlines.' },
        { label:'Harvest a trait', fx:{cardPick:true}, result:'The reef offers a trait. One hero takes it.' },
      ]},
    { id:'guide', title:'Stranded Guide', icon:'🎈',
      text:'An airship guide from another service floats becalmed. For two crystals she will show you a shortcut she is not supposed to know.',
      options:[
        { label:'Pay for the shortcut (2 ◇)', cost:{crystals:2}, fx:{skipNext:true}, result:'She takes you past the next stop entirely.' },
        { label:'Decline', fx:{}, result:'She waves. You pass.' },
      ]},
    { id:'cache', title:'Drowned Cache', icon:'🧰',
      text:'A sunken crate, Terminal-sealed, cracked open by the tide. Salvage is yours by the oldest law here — but the cold goes into the bones.',
      options:[
        { label:'Salvage it', fx:{crystals:6, damageOne:3}, result:'+6 ◇. One hero takes 3 from the cold.' },
        { label:'Leave it', fx:{}, result:'The sea keeps its secrets.' },
      ]},
    { id:'shrine', title:'Lintukoto Shrine', icon:'🕯️',
      text:'A shrine to the old name, maintained by no one. Offerings left in crystal; answers left in nothing you could prove.',
      options:[
        { label:'Offer 2 ◇', cost:{crystals:2}, fx:{up:1}, result:'Every pilot gains 1 UP. Whatever listens, it listened.' },
        { label:'Pray', fx:{crystals:4}, result:'+4 ◇ in the offering bowl that were not there before. You will not be able to say from where.' },
      ]},
    { id:'mirror', title:'Mirror Pool', icon:'🪞',
      text:'Still water that shows you as you might have been. Here, briefly, a choice can be unmade.',
      options:[
        { label:'Respec a hero', fx:{respec:true}, result:'Every UP returns to one hero\'s pool. Spend it again.' },
        { label:'Leave the water still', fx:{}, result:'You are who you are.' },
      ]},
    { id:'envoy', title:'The Heart\'s Envoy', icon:'💼',
      text:'A courteous functionary in a clean coat. The Heart offers eight crystals if you turn the expedition around. "Everyone has a number," the envoy says, meaning it kindly.',
      options:[
        { label:'Take the crystals', fx:{crystals:8, bossBonusHp:10}, result:'+8 ◇. The Heart, reassured, grows (+10 hp). You did not turn around.' },
        { label:'Refuse', fx:{up:1}, result:'The envoy makes a note. Saying no to the Heart steadies you: every pilot gains 1 UP.' },
      ]},
    { id:'molt', title:'Molt Season', icon:'🐚',
      text:'The whole reef is shedding. A hero could shed too — one trait for another from the same bloodline.',
      options:[
        { label:'Molt a trait', fx:{tradeCard:true}, result:'One hero swaps a trait for a new one from their species.' },
        { label:'Keep your skin', fx:{}, result:'Not this season.' },
      ]},
    { id:'audit', title:'Terminal Audit', icon:'⚖️',
      text:'A gentle request for your holdings. The Terminal mitigates consolidation wherever it finds it — including, apologetically, yours.',
      options:[
        { label:'Report honestly', fx:{audit:true}, result:'If you held 10 ◇ or more, half is redistributed. If not, you receive 4.' },
        { label:'Refuse the audit', fx:{damageOne:4}, result:'The Terminal does not insist. The wind does: one hero takes 4.' },
      ]},
    { id:'quiet', title:'Quiet Hour', icon:'🌙',
      text:'Nothing hunts here. Nothing calls. The wind drops, and for one whole Tumult day, an hour and no more, the world is only ground and sky.',
      options:[
        { label:'Rest', fx:{healAll:'half'}, result:'Every pilot recovers half their missing vitality.' },
        { label:'Drill', fx:{up:1}, result:'You run the kits until the moves are reflex. +1 UP each.' },
      ]},
  ];

  /* ───────────────────────────── PREBUILT HEROES ───────────────────────────── */
  T.PREBUILTS = [
    // Each pre-made hero is a painted pilot (src/ui/pilots.js): that pilot's name and pair of clades, head clade first.
    // The ids are the heroes' old names, kept because saved canon notes are keyed on them (`hero:<id>`).
    { id:'cavitt', name:'Rosh', title:'the Brawler-in-the-Cloud', species:['human','octopus','raven'],
      cards:['oct_cloak','oct_jet','rav_mob','rav_carrion','hum_throw','hum_mind'],
      up:{ rav_mob:[2,0], rav_carrion:[1,1], oct_cloak:[0,1], oct_jet:[1,0] },
      blurb:'P-leaning striker. Closes through cover, vanishes, drops on whatever is weakest.' },
    { id:'marish', name:'Ekora', title:'the Tidewarden', species:['human','otter','eel'],
      cards:['eel_discharge','eel_electro','wea_musk','ott_kelp','hum_persist','hum_tool'],
      up:{ eel_discharge:[0,2], wea_musk:[0,2], ott_kelp:[0,1], hum_tool:[1,0] },
      blurb:'E-leaning controller. Chains, weakens, anchors the party in the current.' },
    { id:'ossa', name:'Nedira', title:'the Bulwark', species:['human','hedgehog','tortoise'],
      cards:['tor_shell','tor_beak','heh_spines','heh_burst','hum_grip','hum_persist'],
      up:{ tor_shell:[1,2], heh_spines:[1,1], tor_beak:[1,0] },
      blurb:'Immovable. Shells up, bristles, and holds a shield over the party.' },
    { id:'veil', name:'Echo', title:'the Nightwing', species:['human','mouse','owl'],
      cards:['owl_silent','owl_sound','owl_talon','mou_scurry','mou_tiny','hum_pattern'],
      up:{ owl_silent:[1,1], mou_tiny:[0,2], owl_talon:[1,0], owl_sound:[1,0] },
      blurb:'Scout-skirmisher. Sees everything, is nowhere, strikes from surprise.' },
    { id:'mycel', name:'Karenth', title:'the Network', species:['human','axolotl','koi'],
      cards:['axo_regen','axo_tail','koi_calm','koi_gold','hum_coop','hum_lang'],
      up:{ koi_gold:[0,2], axo_regen:[1,1], koi_calm:[1,0], axo_tail:[1,0] },
      blurb:'Support-sustain. Feeds the party dice and luck, calms the water, regrows anything.' },
    { id:'kess', name:'Slingshot', title:'the Catapult', species:['human','flamingo','mantis_shrimp'],
      cards:['msh_punch','msh_spear','msh_colours','fla_salt','fla_march','hum_throw'],
      up:{ msh_punch:[1,2], fla_salt:[0,1], msh_spear:[1,0], fla_march:[1,0] },
      blurb:'Burst and area. Punches twice at once, salts the shallows, marches the flock.' },
  ];

  /* ───────────────────────────── FLAVOR ───────────────────────────── */
  T.FLAVOR = {
    terminalIntro: [
      'The Terminal has flagged something at the end of this route. It will not intervene. It will, as always, help those who help themselves.',
      'The Ark opens its bay. Below: land, sea and air, and a route no guide has finished. This one is yours.',
      'Three things too large to fight: the etherions, the superorganism, the Terminal. Beneath them, a Heart small enough to end.',
    ],
    win: [
      '{THREAT} stops. The route is open behind you, and the Terminal logs it under no name. Somewhere overhead, the Ark marks the squad for the long way home.',
    ],
    lose: [
      'Tumult keeps the expedition. Somewhere, the Terminal notes that {THREAT} held one more season — and waits, as it does, for the next squad.',
    ],
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
