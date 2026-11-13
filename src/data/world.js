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
    ROLL: 3,                 // dice rolled per turn
    TRACK: 6,                // track columns
    FACES: ['M','C','S','T','O','AP2','AP','AP','AP','AP','AP','AP'], // base d12
    MOVE_AP: 1,              // AP per walk step
    INTERACT_AP: 2,
    RALLY_AP: 2, RALLY_HP: 8,  // revive a downed adjacent ally
    HAZARD_DMG: 3,
    P_CAP: 3, E_CAP: 3,
    ETHEREAL_MIN_E: 1,       // E a card needs before its Ethereal face can be played: Ethereal faces are magic that
                             // must be awakened (Garrett, 2026-11-12). 0 is the v2.0 rule, kept as a switch.
    START_AWAKE: 2,          // a new hero begins with this many cards awakened (E 1), paid from START_UP
    START_UP: 6, START_CARDS: 6, MAX_PER_SPECIES: 3, MAX_CARDS: 9,
    GEAR_SLOTS: 2,
  };

  T.LANES = {
    A: { name: 'Cyan',   color: '#2fb9d6' },
    B: { name: 'Amber',  color: '#e0a83a' },
    C: { name: 'Violet', color: '#a97df0' },
    D: { name: 'Rose',   color: '#e56a8f' },
  };

  /* ───────────────────────────── GEAR (◇) ───────────────────────────── */
  // Gear abilities cost omnicrystals per use and have their own small cooldown (not the track).
  // They grant GENERAL VERBS to patch a build's gaps — never a keyed counter.
  T.GEAR = [
    { id:'grapnel', name:'Grapnel', price:6, icon:'🪝',
      desc:'Force (pull) for any build. Reel a foe in, or winch it across the board and hold it.',
      abilities:[
        { n:'Reel', cost:1, cd:1, tgt:'foe_r2', fx:[{v:'force', kind:'pull', n:f(1)}], txt:()=>'Pull a foe within 2 one node toward you.' },
        { n:'Winch', cost:2, cd:3, tgt:'foe_any', fx:[{v:'force', kind:'pull', n:f(9)},{v:'anchor', who:'foe', dur:f(2)}], txt:()=>'Drag a foe from anywhere into melee and Anchor it 2.' },
      ]},
    { id:'scope', name:'Scope', price:5, icon:'🔭',
      desc:'Reveal for any build. Finds Hidden foes, traps, and the hidden objective.',
      abilities:[
        { n:'Glance', cost:1, cd:1, tgt:'self', fx:[{v:'reveal', radius:f(1), dur:f(1)}], txt:()=>'Reveal everything adjacent.' },
        { n:'Survey', cost:2, cd:3, tgt:'self', fx:[{v:'reveal', radius:f(99), dur:f(2), findObjective:true}], txt:()=>'Reveal the whole board for 2 rounds and pinpoint the hidden objective.' },
      ]},
    { id:'capacitor', name:'Capacitor', price:6, icon:'🔋',
      desc:'Economy. Convert omnicrystals into dice when the weather is bad.',
      abilities:[
        { n:'Store', cost:1, cd:1, tgt:'self', fx:[{v:'draw', face:'O', n:f(1)}], txt:()=>'Draw 1 pool die into your bank as Omni.' },
        { n:'Discharge', cost:2, cd:3, tgt:'self', fx:[{v:'mint', face:'AP', n:f(2)},{v:'mint', face:'C', n:f(1)}], txt:()=>'Mint 2 AP and 1 Charge this turn.' },
      ]},
    { id:'phasebrace', name:'Phase-brace', price:7, icon:'🌀',
      desc:'Space for any build. Reaches height nodes.',
      abilities:[
        { n:'Blink', cost:2, cd:2, tgt:'node_tele', fx:[{v:'teleport', reach:f(2), height:true}], txt:()=>'Teleport to any node within 2 — height included.' },
        { n:'Fade', cost:1, cd:2, tgt:'self', fx:[{v:'hidden', dur:f(1)}], txt:()=>'Hidden 1.' },
      ]},
    { id:'chronoshim', name:'Chrono-shim', price:7, icon:'⏳',
      desc:'Time for any build. Returns cards sooner, buys rounds from the clock.',
      abilities:[
        { n:'Shim', cost:1, cd:1, tgt:'self', fx:[{v:'hasten', n:f(1)}], txt:()=>'Every card on your track returns 1 column sooner.' },
        { n:'Rewind', cost:3, cd:4, tgt:'self', fx:[{v:'hasten', n:f(3)},{v:'clock', delta:f(1)}], txt:()=>'Track slides 3 extra columns; the mission clock gains 1.' },
      ]},
    { id:'aegis', name:'Aegis Plate', price:6, icon:'🛡️',
      desc:'Mitigation for any build. Even against area.',
      abilities:[
        { n:'Brace', cost:1, cd:1, tgt:'self', fx:[{v:'shield', val:f(3), dur:f(1), all:true}], txt:()=>'Shield 3 against everything this round.' },
        { n:'Bulwark', cost:2, cd:3, tgt:'party', fx:[{v:'shield', val:f(3), dur:f(2), all:true, party:true, allyRange:f(1)}], txt:()=>'Shield 3 against everything for 2 rounds, on you and an adjacent ally.' },
      ]},
    { id:'lantern', name:'Storm Lantern', price:5, icon:'🏮',
      desc:'Reveal + Mark, and a beacon for your ally.',
      abilities:[
        { n:'Flare', cost:1, cd:2, tgt:'self', fx:[{v:'reveal', radius:f(2), dur:f(1)},{v:'mark', area:true, radius:f(2)}], txt:()=>'Reveal within 2 and Mark every foe revealed.' },
        { n:'Beacon', cost:2, cd:2, tgt:'ally', fx:[{v:'rally', move:f(2)}], txt:()=>'Your ally may move 2 for free.' },
      ]},
    { id:'harpoon', name:'Harpoon Gun', price:6, icon:'🎯',
      desc:'Reach for melee builds: a lane shot that pulls, and a piercing skewer.',
      abilities:[
        { n:'Shot', cost:1, cd:1, tgt:'foe_los', fx:[{v:'strike', kind:'los', dmg:f(3)},{v:'force', kind:'pull', n:f(1)}], txt:()=>'Lane strike 3 and pull the foe 1.' },
        { n:'Skewer', cost:2, cd:3, tgt:'foe_los', fx:[{v:'strike', kind:'los', dmg:f(5), pierce:true}], txt:()=>'Lane strike 5 that ignores Shield.' },
      ]},
    { id:'climbrig', name:'Climbing Rig', price:4, icon:'🧗',
      desc:'The cheap answer to height.',
      abilities:[
        { n:'Ascend', cost:1, cd:1, tgt:'node_climb', fx:[{v:'climb', reach:f(1)}], txt:()=>'Climb onto an adjacent node, height included.' },
        { n:'Rappel', cost:1, cd:1, tgt:'node_move', fx:[{v:'move', n:f(2), ignoreFoes:true}], txt:()=>'Move 2, through foes.' },
      ]},
    { id:'medkit', name:'Medkit', price:5, icon:'🩹',
      desc:'Heal and revive, fueled by omnicrystals.',
      abilities:[
        { n:'Patch', cost:1, cd:1, tgt:'foe_or_ally_adj', fx:[{v:'heal', n:f(4), target:'chosenAlly'}], txt:()=>'Heal yourself or an adjacent ally 4.' },
        { n:'Revive', cost:2, cd:3, tgt:'self', fx:[{v:'revive', hp:f(10), adjacent:true}], txt:()=>'A downed adjacent ally rises with 10 hp.' },
      ]},
  ];
  T.GEAR_BY = {}; T.GEAR.forEach(g => T.GEAR_BY[g.id] = g);

  /* ───────────────────────────── TIDES (difficulty) ───────────────────────────── */
  // How hard a run's missions press. Each list is indexed by tier (1, 2, 3); the boss is never changed.
  // Rising is the game as it was tuned before 2.7. Flood is for careful players: bigger objectives on
  // shorter clocks are what press a careful squad — more or tougher foes hardly do (BALANCE.md, v2.7.0).
  T.TIDES = {
    rising: { id:'rising', n:'Steady wind', need:[0,0,0], clock:[0,0,0], swarm:[0,0,0], escorts:[[],[],[]],
      txt:'Tumult as it has always blown.' },
    flood: { id:'flood', n:'Gale', need:[0,1,2], clock:[0,1,2], swarm:[0,1,2], escorts:[[],['kiter'],['binder','kiter']],
      txt:'From tier 2, every objective needs 1 more (tier 3: 2 more), every clock but a hold’s starts 1 round shorter (2), swarms grow 1 larger (2), and elites bring 1 more escort (2).' },
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
    { id:'scramble_S', n:'Scramble', icon:'⤴', ap:0, el:'S', tgt:'node_climb', fx:[{v:'climb', reach:f(1)}],                               txt:'Channel Space: step to a free node 1 away, up or down a ledge included.' },
    { id:'brace_T',    n:'Brace',    icon:'🛡', ap:0, el:'T', tgt:'self',      fx:[{v:'shield', val:f(1), dur:f(1)},{v:'hasten', n:f(1)}], txt:'Channel Time: Shield 1 until your next turn, and your track slides 1 extra column.' },
  ];
  T.BASIC_BY = {}; T.BASIC.forEach(b => T.BASIC_BY[b.id] = b);

  /* ───────────────────────────── CONSUMABLES ───────────────────────────── */
  T.CONSUMABLES = [
    { id:'vial',   name:'Rally Vial',  price:2, icon:'🧪', tgt:'self', fx:[{v:'heal', n:f(6)}], txt:'Heal 6.' },
    { id:'shard',  name:'Omni Shard',  price:3, icon:'💠', tgt:'self', fx:[{v:'mint', face:'O', n:f(1)}], txt:'Mint 1 Omni this turn.' },
    { id:'charm',  name:'Windbreak Charm',  price:3, icon:'🪬', tgt:'self', fx:[{v:'clock', delta:f(2)}], txt:'The mission clock gains 2.' },
    { id:'flash',  name:'Flashpowder', price:2, icon:'✨', tgt:'self', fx:[{v:'reveal', radius:f(2), dur:f(1)}], txt:'Reveal within 2.' },
    { id:'grit',   name:'Grit',        price:2, icon:'🪨', tgt:'self', fx:[{v:'shield', val:f(3), dur:f(1), all:true}], txt:'Shield 3 against everything this round.' },
  ];
  T.CONSUMABLE_BY = {}; T.CONSUMABLES.forEach(c => T.CONSUMABLE_BY[c.id] = c);

  /* ───────────────────────────── BOONS ───────────────────────────── */
  // Passive run modifiers. None breaks the 15-die invariant; affinities re-face a die.
  T.BOONS = [
    { id:'tidetouched', name:'Etherion-touched', icon:'🌊', desc:'Start each mission with 1 Omni already banked.', hook:'missionStart', val:{bank:'O'} },
    { id:'thickhide',   name:'Thick Hide',   icon:'🐢', desc:'Every Shield you gain is +1.', hook:'shieldBonus', val:1 },
    { id:'keensense',   name:'Keen Sense',   icon:'👁️', desc:'Your reveals reach 1 further; Hidden foes adjacent to you are revealed at round start.', hook:'keen', val:1 },
    { id:'deeppockets', name:'Deep Pockets', icon:'💰', desc:'+2 ◇ after every mission.', hook:'reward', val:{crystals:2} },
    { id:'studious',    name:'Studious',     icon:'📖', desc:'+1 UP after every mission.', hook:'reward', val:{up:1} },
    { id:'secondwind',  name:'Second Wind',  icon:'💫', desc:'Once per run, when you would go down, you rise with 10 hp instead.', hook:'autoRevive', val:10 },
    { id:'momentum',    name:'Momentum',     icon:'💥', desc:'Your first strike each round deals +2.', hook:'firstStrike', val:2 },
    { id:'anchorsoul',  name:'Anchor Soul',  icon:'⚓', desc:'You cannot be pulled.', hook:'noPull', val:true },
    { id:'quickhands',  name:'Quick Hands',  icon:'🫳', desc:'As round 2 begins, your track slides 1 extra column: what you played in round 1 comes home sooner.', hook:'roundStart', val:{round:2, hasten:1} },
    { id:'aff_M', name:'Mass Affinity',   icon:'◆', desc:'One AP face on your dice becomes Mass.',   hook:'face', val:'M' },
    { id:'aff_C', name:'Charge Affinity', icon:'◆', desc:'One AP face on your dice becomes Charge.', hook:'face', val:'C' },
    { id:'aff_S', name:'Space Affinity',  icon:'◆', desc:'One AP face on your dice becomes Space.',  hook:'face', val:'S' },
    { id:'aff_T', name:'Time Affinity',   icon:'◆', desc:'One AP face on your dice becomes Time.',   hook:'face', val:'T' },
    { id:'omnicore', name:'Omni Core',    icon:'◇', desc:'One AP face on your dice becomes Omni.',   hook:'face', val:'O' },
    { id:'defiant',  name:'Defiant',      icon:'🔥', desc:'+2 damage against Elites and the Heart.', hook:'vsElite', val:2 },
  ];
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
      flavor:'Keeps its lane and never closes.' },
    brute:    { name:'Brute', glyph:'🦍', role:'bruiser', hp:[10,13,16], speed:1, policy:'brute',
      abilities:{ slam:{ n:'Slam', kind:'melee', dmg:[5,6,7], push:1 } },
      flavor:'Slow. Then not.' },
    kiter:    { name:'Kiter', glyph:'🏹', role:'zoner', hp:[7,9,11], speed:2, policy:'kiter',
      abilities:{ shot:{ n:'Shot', kind:'los', dmg:[3,4,5] } },
      flavor:'Shoots, retreats, shoots. Deny it the lane.' },
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
    heart:    { name:'The Heart', glyph:'🫀', role:'boss', boss:true, hp:[50,61,72], speed:0, policy:'heart', anchored:true, shield:[4,4,4],
      abilities:{ lance:{ n:'Lance', kind:'los', dmg:[3,4,5] }, crush:{ n:'Crush', kind:'melee', dmg:[7,8,9], pull:2 }, call:{ n:'Call the Swarm', kind:'summon' } },
      flavor:'What waits at the end of the route. Its shield is fed by its Spawners. When it is half-dead, the Vault begins to drown.' },
  };

  /* ───────────────────────────── EVENTS ───────────────────────────── */
  // Narrative forks. Each option lists effects the run layer applies.
  T.EVENTS = [
    { id:'beacon', title:'Terminal Beacon', icon:'📡',
      text:'A Terminal relay blinks awake as you pass. "Service available," it says, in the voice it uses for everyone. It will help those who help themselves — and it will log the transaction.',
      options:[
        { label:'Request repair (4 ◇)', cost:{crystals:4}, fx:{healAll:'full'}, result:'Both heroes restored. The relay files a receipt with no name on it.' },
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
        { label:'Stand in it', fx:{affinityRandom:true, damageOne:4}, result:'One hero takes 4 and comes out with an Affinity: a die face that was AP now rolls an etherion.' },
        { label:'Shelter', fx:{}, result:'You wait it out. The front passes, taking nothing.' },
      ]},
    { id:'bloom', title:'Bloom of the Superorganism', icon:'🌸',
      text:'A reef flowers along the shore — all of it one body, the superorganism reminding you whose cells you are made from.',
      options:[
        { label:'Rest among the blooms', fx:{healAll:8}, result:'Both heroes heal 8. Something in the reef recognizes your bloodlines.' },
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
        { label:'Offer 2 ◇', cost:{crystals:2}, fx:{up:1}, result:'Both heroes gain 1 UP. Whatever listens, it listened.' },
        { label:'Pray', fx:{boonRandom:true}, result:'A boon. You will not be able to say from where.' },
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
        { label:'Refuse', fx:{boon:'defiant'}, result:'The envoy makes a note. You gain Defiant: +2 damage against elites and the Heart.' },
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
        { label:'Rest', fx:{healAll:'half'}, result:'Both heroes recover half their missing vitality.' },
        { label:'Drill', fx:{up:1}, result:'You run the kits until the moves are reflex. +1 UP each.' },
      ]},
  ];

  /* ───────────────────────────── PREBUILT HEROES ───────────────────────────── */
  T.PREBUILTS = [
    { id:'cavitt', name:'Cavitt', title:'the Brawler-in-the-Cloud', species:['human','octopus','hopper'],
      cards:['hop_mandibles','oct_cloak','oct_jet','hop_catapult','hum_throw','hum_mind'],
      up:{ hop_mandibles:[2,0], hop_catapult:[1,2], oct_cloak:[0,1] },
      blurb:'P-leaning striker. Closes through cover, vanishes, lands the punch.' },
    { id:'marish', name:'Marish', title:'the Tidewarden', species:['human','eel','flytrap'],
      cards:['eel_discharge','eel_electro','fly_snap','fly_photo','hum_persist','hum_tool'],
      up:{ eel_discharge:[0,2], fly_snap:[0,2], fly_photo:[0,1], hum_tool:[1,0] },
      blurb:'E-leaning controller. Chains, traps, engines, lockdown.' },
    { id:'ossa', name:'Ossa', title:'the Bulwark', species:['human','tardigrade','gecko'],
      cards:['tar_dsup','tar_claw','gec_lockjaw','gec_hide','hum_grip','hum_persist'],
      up:{ tar_dsup:[1,2], tar_claw:[1,1], gec_lockjaw:[1,0] },
      blurb:'Immovable. Holds foes, holds the line, holds a shield over the party.' },
    { id:'veil', name:'Veil', title:'the Nightwing', species:['human','owl','jerboa'],
      cards:['owl_silent','owl_sound','jer_leap','owl_talon','jer_burrow','hum_pattern'],
      up:{ owl_silent:[1,1], jer_leap:[0,2], owl_talon:[1,0], owl_sound:[1,0] },
      blurb:'Scout-skirmisher. Sees everything, is nowhere, strikes from surprise.' },
    { id:'mycel', name:'Mycel', title:'the Network', species:['human','cordyceps','axolotl'],
      cards:['cor_network','cor_drain','axo_regen','axo_tail','hum_coop','hum_lang'],
      up:{ cor_network:[0,2], axo_regen:[1,1], cor_drain:[1,0], axo_tail:[1,0] },
      blurb:'Support-sustain. Feeds the party dice, drains the foe, regrows anything.' },
    { id:'kess', name:'Kess', title:'the Catapult', species:['human','hopper','eel'],
      cards:['hop_catapult','hop_strid','hop_exo','eel_discharge','eel_chargeup','hum_throw'],
      up:{ hop_catapult:[1,2], hop_strid:[0,1], eel_discharge:[1,0], hop_exo:[1,0] },
      blurb:'Burst and area. Coils, launches, and resonates whole lanes.' },
  ];

  /* ───────────────────────────── FLAVOR ───────────────────────────── */
  T.FLAVOR = {
    terminalIntro: [
      'The Terminal has flagged something at the end of this route. It will not intervene. It will, as always, help those who help themselves.',
      'The Ark opens its bay. Below: land, sea and air, and a route no guide has finished. This one is yours.',
      'Three things too large to fight: the etherions, the superorganism, the Terminal. Beneath them, a Heart small enough to end.',
    ],
    win: [
      'The Heart stops. The route is open behind you, and the Terminal logs it under no name. Somewhere overhead, the Ark marks the squad for the long way home.',
    ],
    lose: [
      'Tumult keeps the expedition. Somewhere, the Terminal notes a Heart that held one more season — and waits, as it does, for the next squad.',
    ],
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
