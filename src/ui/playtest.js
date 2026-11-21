/* ============================================================================
   TUMULT — PLAYTEST ADD-ON. Only in the playtest build (npm run build:playtest).
   A panel on the title screen for whoever is testing the game: jump into any
   mission, choose how rounds go with friends, read what to look at
   in this build, and copy a report of what happened.
   It adds no rules. It starts missions through T.quickMission, the same door
   tools/mission-log.js uses, so a seed names the same mission in both.
   ========================================================================== */
(function (T) {
  const U = T.UI;
  const esc = U.esc;
  const KEY = 'tumult_v2_playtest';
  const TYPES = ['swarm', 'vault', 'hidden', 'cascade', 'salvage', 'survey', 'elite', 'boss'];
  const LOG_MAX = 40;

  /**
   * What a tester should look at in this build. `version` must match package.json
   * (test/playtest.test.js checks), so a release cannot ship with last release's list.
   * `cards` names the trait cards a note is about; the panel says which pre-made hero carries them.
   */
  const NOTES = {
    version: '2.121.0',
    items: [
      {
        text: 'Burn: a face that spends its whole card until the mission ends, for a play nothing else makes. Full Dose (scorpion) leaves a Wound that holds before it fades; Boiling Burst (beetle) leaves boiling ground for the rest of the mission. When is it worth it?',
        cards: ['sco_sting', 'btl_spray'],
      },
      {
        text: 'Dice as AP: a banked Omni, or any two banked etherions (the same or different), now make 1 AP, at no cost and as often as you like. Press ◇→AP (it stands beside the four basic actions when spare dice would pay for a card you hold), then click an Omni or two element dice: they go back to the pool and you gain 1 AP for this turn. A face you could pay for this way says ◇→AP to pay. Folding one each of M, C, S and T into an Omni still works. Did you ever end a turn with an element you could not use? Was spending it as AP a real choice against saving it for an Ethereal face or an Overcharge?',
      },
      {
        text: "Gear runs on Omni now, and some of it has a card. Omnicrystals only buy gear: every gear ability is free or costs banked Omni dice. An ability with a cooldown lives on the gear's card, which joins your kit and counts toward your nine (but not toward a clade's three); with a full kit it waits in your reserve. Playing either face sends the card to your track. A weapon's Overcharge has no cooldown, so it stays on the gear. Did a gear card earn its place in your nine? Was it clear which abilities sit on the card and which on the gear?",
      },
      {
        text: "Resonance: every Ethereal face leaves its element in the air for this round and the next (the top bar shows it). Recoil Slam, Pop, Cavitation and Pick the Weak each draw on an element for a bonus: play a partner's face first and yours lands bigger. Omni in the air counts as any. The Stridulation face once called Resonance is now Thrum.",
        cards: ['oct_jet', 'heh_burst', 'msh_punch', 'rav_carrion', 'hop_strid'],
      },
      {
        text: "Two new words. At dusk: a face placed now that lands at round end, after the foes act, on whoever is there then (Patience on the mantis, Under the Surface on the crocodile; a ring on the board shows where). Flanked: a foe with the squad on two spaces beside it, which the jackal's Flank, the hyena's Crunch and the orca's Take Down hit 2 harder.",
        cards: ['man_still', 'cro_lurk', 'jac_pair', 'hye_crush', 'orc_apex'],
      },
      {
        text: "Some blows are Aimed now: the foe strikes a space, not a pilot. The Brute's Slam is Aimed, so step off the marked space and it lands on empty ground, or leave another foe there to take it. Pre-empt (Theory of Mind) makes any foe's attack Aimed for the round.",
        cards: ['hum_mind'],
      },
      {
        text: 'Five more costly faces now each do one thing nothing else does. Apex Form makes your melee strikes knock foes back, and a foe stopped short crashes into whatever is in the way: both take the hit. Immovable Hold locks on to a foe, which is dragged along beside you when you walk. Neurotoxin fixes a foe on its plan: it repeats this round’s intent for the next rounds, so you know what it will do. Step Out of Time no longer heals, and Tesla Cascade no longer strips Shield; their Link and untargetable parts stay. Did a crash, a drag or a fixed foe ever set up a turn you planned around?',
        cards: ['axo_meta', 'tar_claw', 'oct_bite', 'tar_crypto', 'eel_discharge'],
      },
      {
        text: 'Missions are sized by squad power: each pilot brings 10, and 1 more for every level past 1; two new pilots are 20, and every point past that makes foes tougher, and more of them, with more to do. Pilots who grow faster than the route expects meet missions that grow with them, and if the whole squad goes down the expedition ends (the Lifeline only carries a mission lost with someone standing). Hover the ⚖ pill on the route to see your power. With seasoned pilots, did a mission feel too easy or too hard? Did a bigger, newer squad and a smaller, seasoned one with the same power feel alike?',
      },
      {
        text: 'Pocket pets are here. A haven may have a stray: a hybrid of three clades (never human) with one card that holds a Physical face from each of them. Adopt it for 4 ◇ (two pets at most); its card is a card like any other, in your kit or your reserve, and the pet only sets out when its card flies. A pet on your node rides with you in any vehicle. Any one of its three faces sends the whole card to your track, and the face acts from the pet: its reach, its strike, its steps. Heel (1 AP) walks it up to 3. Did playing a card through the pet read clearly on the board?',
      },
      {
        text: 'Weapons: two new pieces of gear at the havens. The Shock Baton adds 1 to every melee strike you make (the basic Strike too), and the Coil Rifle adds 1 to every ranged one. Each has an Overcharge that takes a banked Omni die instead of omnicrystals: every Omni you put on the weapon adds 2 to every strike of its reach this round, and you can stack them. An Omni spent there cannot pay an Ethereal face. Foes are a little tougher to make up for it. Did you ever Overcharge, and was it worth the Omni? Did a weapon change which cards you reached for?',
      },
      {
        text: 'A pilot keeps every trait it earns now. Nine fly into a mission; once the kit holds nine, a new trait either waits in reserve (Keep in reserve) or comes in at once for one that stays behind (Fly it now). Nothing is lost and nothing is refunded: a trait left behind keeps its points. Between missions, open Kit on the route to change which nine fly: pick a reserve trait, then the one it replaces. The dice follow the kit (each awakened card that flies brings its element die). Molt and Trade set the old trait aside the same way. Did you change your kit to suit the next stop? Was it clear where the reserve lives?',
      },
      {
        text: 'Four costly faces now do something no cheaper play can. Heavy Throw throws the ally beside you onto a free space within reach, a ledge included. Become trades places with a foe. Resonance sets every Field, hazard and Wound around you off at once (they still go off at round end). Second Wind gives back, at round end, what you lose after playing it. Did any of them make a turn you could not have played before? Was any of them hard to aim?',
        cards: ['hum_throw', 'oct_imperson', 'hop_strid', 'hum_persist'],
      },
      {
        text: "Pocket vehicles and big maps. A new stop on the route, the Crossing, is played on a big map (Reed Delta or Ashfall Salt Flat: eight spaces across, with water, reeds, fissures and vents). Before it, each player picks a vehicle for their pilot: Skiff, Wing, Crawler, Diver or Runner, each with its own seats, speed, hull, ground it can cross and two cards (some carry long guns). Getting in or out is 1 AP, and so is each Drive. Inside you play only the vehicle's cards and your faces marked Mounted; blows land on the hull. Which vehicle did you pick, and did it pay for itself? Did you ever want to get out and walk?",
      },
      {
        text: 'Movement has clearer words: Climb is a Move that may take ledges (foes now block it, as they block any walk), Guide moves an ally (Rally only raises the downed), and Gallop now tramples: it goes through foes and pushes each one aside, into a hazard or Field if that is where aside is. Did a climb that used to reach a ledge get stuck behind a foe? Did trampling give you a shove you could plan?',
      },
      {
        text: 'Fliers now Hover: off the ground, no hazard or Field touches them, nothing pushes or pulls them, and their flights can end on a ledge (hawk, eagle, crane, egret, owl, pelican, hummingbird, seahorse, winged insects). Coats, gills and swims still just ignore hazards. Did a flier reach somewhere you did not expect? Did the two ever read as the same thing?',
      },
      {
        text: 'No die is ever drawn at random now: Draw takes a plain die while your pool has one, then the element die that shows the face most, and a roll with few plain dice left takes the element dice you hold most of. Did any Draw bank a die you did not expect?',
      },
      {
        text: 'A pet can share your node, and there nothing can hurt it; off your node foes can target it, and at 0 it dies and is gone for the rest of the mission (it comes back for the next). Did you find yourself parking it on your node, or sending it out? Was it worth risking?',
      },
      {
        text: 'The mission screen, the draft and the route now follow the designs picked on the Frogma board. On a mission the board sits in a frame with the sea around it; ⛶ Full screen lets it fill the screen, and the foes’ plans and your hand become trays you can slide away. A Squad panel lists every pilot and, with friends, whose turn it is, who is done and who still has one to take. Taking turns at one screen, a cover goes over the board between turns and names who is up, so nobody sees the last hand. On a phone the foot of the screen is one sheet with tabs: Hand, Plans, Squad and Log. The draft fills your kit along the bottom as you pick, and the route reads like a climb: the Heart at the top, your next stops as big cards, the stops you passed below. Is anything you used often harder to find? Did the cover between turns ever get in the way?',
      },
      {
        text: 'The pages around the game are new. Across the top (a bar at the bottom on a phone, with More for the rest): Pilots, a wall of the crew in their scenes with a page each and Make a pilot (two clades, a name and callsign, three story questions, then save or draft their cards); Cards, a binder of every trait you have found, as foil relics that catch the light; Atlas, every kind of place by land, sea and air, each a model of its board on a table; Canon, your notes pinned up by subject; and Settings, which shows the change on a sample as you make it, plus a quick panel from ⚙ on a mission. How to play is now seven short pages with a picture each, and the codex has tabs for words, foes, gear, dice and clades. Which page did you open more than once? Was anything you looked for missing, or in two places?',
      },
      {
        text: 'Online, the host can have the AI fill empty seats (up to five) and choose a Short (5 stops) or Full expedition; a host alone can now set out with the AI. AI pilots move once every person has ended their turn. If a player drops, everyone sees a countdown, then an AI pilot holds their seat until they reload the page. Did the AI pilots pull their weight? Did a drop ever leave the table stuck?',
      },
      {
        text: "New screens after a mission and at the end of an expedition, from the finalised Frogma boards. A win is one screen: VICTORY over the painting of the place, the objectives and the squad on the left, and on the right each pilot's reward behind their own tab: tap a trait to read both faces, then Take it (or Skip for 2 ◇); after an elite a boon sits underneath. A full kit opens the exchange: the trait coming in, the nine you hold, tap the one that goes out and see its points come back and the bloodline counts, then Swap. Grow a card (the old Train) is now a view of its own: the kit down the side, the card large, each face's words before and after, and a burst of light when it grows. A loss the lifeline carries says so in red, with the hearts left. The haven is four choices (Rest, Trade, Train, Listen) beside its painting, with the stalls below; events sit beside their painting too. The end of an expedition has three tabs: The Heart reached (or the expedition ending, with what carries over), a Logbook page you can copy or print, and the Numbers. Is any choice now harder to find than before? Does the logbook read like your expedition?",
      },
      {
        text: 'The sea comes alive and the mission screen is calmer. Behind every screen the water now drifts: sea lines, slow light and rising motes. The sea follows the expedition down the route, from the light Shore in the shallows through the Deep Sea and Glow to a violet Storm at the Heart, a little darker every stop; Look (in the ☰ menu on a mission, or on the title) pins a theme, picks an accent and sets motion to Full, Reduced or Off. On the mission screen, Plan, Report, sound, help and Title sit behind ☰, the place’s rules fold into one chip, the story box opens from ✎, four basic actions show with the rest under More, cards with nothing to do fold small, and the how-to line goes after the first two missions. Pilots now walk their path node by node, strikers lean into their blows, a hit shakes, the forecast pulses when it changes and the track steps toward Ready at a new round. Is anything you used often now too far away? Does any animation slow a turn down?',
      },
      {
        text: 'The mission screen fits phones and tablets now. On a phone: the board, then a one-line forecast, then your pilot with a hand you swipe a card at a time; nothing runs off the side. Tap a card face once to see what it would do on the board, and what ending the round would do after it; tap it again to play it. On any screen the forecast now has its own strip under the board, and ↶ Undo sits beside End Round (Ctrl+Z on a keyboard): take back a step or a play, as long as it rolled no dice and revealed nothing. Did you ever need to undo something that would not go back? Did a tap ever play a card you only meant to look at?',
      },
      {
        text: 'With three or more pilots, every face, gear ability and duet move that reaches an ally now lets you choose which one: Unity, Link, Lend and the like ask you to click the ally (or press their name above the board), and moves like Call or Cue let you click another pilot before you pick where they go. The texts say "an ally" and "all heroes" now, instead of "your ally" and "both heroes". With two pilots nothing changes. In a game of three or more, did you ever hand something to the wrong pilot?',
        cards: ['hum_coop', 'hum_lang'],
      },
      {
        text: 'Card texts no longer use the retired words: immune to push/pull is now Anchored (which since 2.91 also keeps you from walking), shedding damage over time is Cleanse, and traps are gone from the texts (there are only Fields now). Spot any old word still on a card? Send it in the report.',
        cards: ['tar_cling', 'jer_ears'],
      },
      {
        text: 'Locate is now part of Reveal: a face that picks out one foe Reveals it for some rounds (it cannot be Hidden, and a zone strike finds it), and the faces say Revealed. The old Lane strike tooltip is gone: those faces say Zone strike, which is what they always did. Is Revealed clear on a foe token?',
        cards: ['che_tear', 'adi_snuffle'],
      },
      {
        text: 'Faces that made you immune to Weaken and Anchor now Cleanse you too: they shed Weakened, Anchored and Wounds at once, then keep foes from Weakening or Anchoring you for a few rounds. Do you notice the difference when a foe has already Anchored you?',
        cards: ['pan_ants', 'heh_anoint'],
      },
      {
        text: 'Cards that slide your track, buy rounds from the mission clock or let your next card skip the track now all say Haste. Nothing else changed. Is Haste a word you can play by at the table?',
        cards: ['ora_memory', 'oct_arms'],
      },
      {
        text: 'Teleport is now called Blink on every card and in every tooltip: leave the paths and appear on a free space within N (high ground only where the card says). Nothing else changed. Does Blink read better than teleport at the table?',
        cards: ['oct_ink'],
      },
      {
        text: 'Pre-empt is now a Shield against the next hit: the faces say Shield: the next hit on you is N less. Guard (ambushes halved) and Absorb are Shields too. Does the one word make it easier to see how protected your pilot is?',
        cards: ['koi_shimmer', 'oct_intellect'],
      },
      {
        text: 'Counter is now part of Thorns: a Thorns that lasts turns back every melee strike, and a next-hit Thorns turns back only the next one, sometimes with a push. The faces read "Thorns: the next foe to hit you in melee takes N". Is it clear on your pilot which kind you hold?',
        cards: ['pan_ants', 'heh_anoint'],
      },
      {
        text: 'Mark is now one keyword with a number: the next hit on a Marked foe deals that much more (2 unless the card says). Faces that used to Study a foe ("your hits on it deal +1 permanently") now Mark it for 3 rounds: +1 to every hit until it wears off, not for the whole mission. Exposed is a Pierce Mark: the next hit ignores Shield. Does the number on a Mark read clearly on the foe?',
        cards: ['che_tear', 'msh_colours'],
      },
      {
        text: 'Anchor is now one keyword: nothing moves an Anchored unit, its own walking and blinking included, and it still acts. Rooted, Slowed, held and "can’t blink" are all Anchored now. That cuts both ways: Anchor yourself against a drag and you stay put for the round, so walk first. When a foe roots you, nothing can push you either. Does planning around your own Anchor feel like a fair price?',
        cards: ['fly_root'],
      },
      {
        text: 'Heal now gets a downed pilot up: a Heal that reaches a downed ally raises it with that much (Bond, Raft and every heal for both pilots do it). Faces that used to revive you are a held Heal: if you go down within 3 rounds, it lands. The Medkit lays a mending Field (Heal 3 to allies ending the round on or beside your space). Rally is still the basic action (2 AP, beside you, up with 8). When a partner is down, do you now reach for a heal instead of walking over to Rally?',
        cards: ['pri_groom', 'ott_raft'],
      },
      {
        text: 'Boons and consumables are gone: their jobs are on gear now. Every piece of gear has a passive, always on while you wear it (the Aegis Plate gives +1 to every Shield, the Scope reaches further, the Medkit gets you up once a mission), and two actives you pay for in ◇ (the Medkit heals 6, the Chrono-shim buys 2 rounds of clock). The Grapnel is now a Winch and the Harpoon Gun a Turret: both lay Fields instead of hitting directly. Elites pay in crystals instead of a boon. Do you miss choosing a boon after an elite? Does a haven shop with passives make the choice of gear more interesting?',
      },
      {
        text: 'Decoys that stay where you are now really appear: Very Convincing (Play Dead), A Thousand Pink, Rainbow, Swarm (Bloom) and Door Stone (Burrow) used to leave nothing, because you were still standing there. Now the decoy shares your space (a small token at its edge) and keeps it when you leave. Do foes go for it the way the card says?',
        cards: ['opo_dead', 'fla_pink', 'msh_burrow'],
      },
      {
        text: 'Smoke Step now leaves you Hidden after the blink (it used to drop Hidden as you moved), and No Retreat (Never Retreat) really stops you being pushed or pulled. Do they do what their cards say now?',
        cards: ['oct_ink', 'bad_never'],
      },
      {
        text: 'Damage over time is now one keyword, Wound: at round end the foe takes the Wound, then it drops by 1 (Wound 3 is 3, then 2, then 1). Venom, crush, corrode, rot and the rest are all Wounds now, and a new Wound replaces a smaller one. Is the number on the foe easy to follow from round to round?',
        cards: ['gec_lockjaw', 'axo_toxic'],
      },
      {
        text: 'A new keyword, Link (Charge): two foes joined for a few rounds, so damage, pushes, pulls and heals on one reach the other. Tesla Cascade, Override, Spasm, Its Own Voice, Every Step, Disarming and Drive the Shoal Link their target to the nearest foe. Redirect is gone. Try Linking two foes and pushing one into a Field, or Marking one end before you hit it. Is it clear on the board which two are Linked?',
        cards: ['eel_discharge', 'eel_doublet', 'pel_line'],
      },
      {
        text: 'Snares, spore clouds, triggers and sensing auras are now one keyword, Field: marked spaces that do their keywords to whatever enters them or ends the round there. Its harm falls on foes and its help on allies, Hover is above it, and a hazard is a Field of damage that belongs to nobody. A Field now springs when you push or pull a foe into it, and a Field’s Weaken now lasts into the next round. Try pushing a foe onto your Set Jaws or into a spore cloud. Does a Field read clearly on the board and in its tooltip?',
        cards: ['fly_snap', 'fly_hairs'],
      },
      {
        text: 'A card on the track now stays readable: its name, both faces and their costs are shown at full strength (hover a face for its full text), with a band across the art saying when it is back in hand. Can you still tell at a glance which cards are away?',
      },
      {
        text: 'Some Ethereal faces now cost two or three etherions and hit much harder, mostly for no AP (Heavy Throw, Vacuum, Tesla Cascade, Step Out of Time, Apex Form and more). With one element die of your choice a turn, a big face is one you save up for. Did you bank etherions across turns for one? Was it worth the wait?',
        cards: ['hum_throw', 'eel_discharge', 'tar_crypto'],
      },
      {
        text: 'Many Ethereal faces now cost no AP, only their etherions: the ones that used to give AP back (they give that much less back now), and the ones players hardly ever chose. Do any of them get played now? Does spending only an element die feel like a good use of it?',
        cards: ['eel_gulp', 'hum_coop', 'oct_arms'],
      },
      {
        text: 'Every roll is now three plain dice and one element die you choose. Under "Next roll", beside your dice, pick which of your element dice comes up next (one of the colours you have awakened); the choice stays until you change it. Does the fixed roll make turns easier to plan? Do you find yourself changing the element often, or setting it once?',
      },
      {
        text: 'Hyperspeed and Sky Hyperspeed now count a run of exactly 4 the way you would on the board: four steps, past foes, never the same space twice, ending on an empty space. Before, they only offered spaces whose shortest way was 4, so on a tight board like Mast-Crop Hills they often said there was nowhere to go. Does the run go where you expect now?',
        cards: ['che_hyper', 'haw_hyper'],
      },
      {
        text: 'Two ways to share a round with friends, under "Way to play with friends" on this panel (the host chooses). Take turns: each round, whoever acts first takes the next turn, and you roll your next dice the moment your turn ends, so you can plan while the others play. All at once: no turns; everyone spends AP whenever they like, in whatever order you agree, presses Done, and everyone rolls together when the round begins. Which way did your table enjoy more? With All at once, did two moves ever clash?',
      },
      {
        text: 'Play online now lists the games being played: who hosts, who is in, their pilots and where they are. Type your name and press Join, no code needed; a game in a mission says you can join between missions. Did you find your friends’ game? Did a game you left, or one whose host closed the page, read as quiet?',
      },
      {
        text: 'The story box beside End turn now stays open on other players’ turns: write what your pilot is doing while you wait. Did you add more lines of story this way?',
      },
      {
        text: 'Online, a guest can now finish drafting before the host: the squad waits for the host’s pilot, and the host’s upgrades and Set out work. Did every player get to set out?',
      },
      {
        text: 'Someone can join an expedition already under way. While the squad is on the route between missions, a newcomer enters the game code, makes or brings a pilot, and the route waits until it joins. A late pilot gets spare points to match the least-grown pilot already flying, and the next mission grows for the bigger squad. Did joining feel smooth? Was the newcomer caught up enough?',
      },
      {
        text: 'A pilot you share now carries your name, so the list of pilots says who made each one and Froglet can follow up on the ones worth painting. Pilots you shared before show your name after you next open the page. Does “Made by” show the name you expect?',
      },
      {
        text: 'A trait a pilot already holds is never offered to it again. Pilots of two clades that share traits (a primate with a human side, two cats) used to be offered a shared trait a second time for 1 upgrade point; now the draft and every reward draw only traits it could take, so its pool is smaller and the ones it is after come up more often. Pilots saved with such a point keep it. Did the late exchanges offer what you were hoping for?',
      },
      {
        text: 'Up to five players. Pick 3, 4 or 5 players on the title (or host online and let up to four join with the code): each player drafts and flies one pilot, and you take turns. A bigger squad meets bigger missions: tougher foes, more of them, and more to do; the ⚖ pill on the route says how much. Does a squad of four feel as pressed as a squad of two? Is the board too crowded?',
      },
      {
        text: 'Pilots you made now keep their growth. When an expedition ends, won or lost, a pilot you built comes home with its traits and points, at a level, and shows it in the list next time. Fly it again and the missions grow to meet it. Does a veteran feel stronger and still challenged? Is anything you expected to keep (gear, boons) missing?',
      },
      {
        text: 'Three clades take Cosmic Shore’s names: the Honey Badger is now the Ratel, the Hawk is the Red-tailed Hawk (a real species), and the Orca keeps its name. Saved pilots of those clades load as before. Cards that move dice from your pool now say “draw”, not “pull”, so Pull’s tip only shows where a foe is moved. Does every clade name read as a real animal?',
        cards: ['fly_photo', 'jer_cache', 'gec_basking'],
      },
      {
        text: 'Online play should feel quicker: the other player’s moves, the handoff at the end of a turn and the enemy phase now cross between the two screens over a live channel, instead of waiting on the page’s store, which could take up to half a minute. If the channel drops, the partner’s screen still checks every 2 seconds. And either player can now reload and pick up the game: the title offers “Rejoin game ABCD”. Does the partner’s screen keep up now? Did a rejoin put you back where you were?',
      },
      {
        text: 'Online play: a partner’s moves no longer undo themselves. A move the host’s screen was slow to hear used to be dropped after 15 seconds, and the partner’s turn snapped back. Now each move is numbered, kept and sent again until the host’s screen confirms it, and the host also checks for moves every few seconds. If the host’s screen stops answering, the partner is told so instead. The host must still keep Tumult open. Partners: does a long, thoughtful turn now stand? Does anything still snap back?',
      },
      {
        text: 'A balance pass on every ability. No card can be played twice in one turn any more (the cheap moves and Read were being chained), and the cheapest moves go one step less. Nothing settles a problem outright now: sensing reaches as far as the card is upgraded instead of the whole board, Shield breakers chip by their level instead of deleting it, the squad-wide hazard shelters cover your ally for this round and you for longer, a lock-on lasts some rounds rather than the mission, and nothing works a ledge from the floor. Thirty-odd faces that ignored upgrades now grow with them, and Pace now moves you. Does any card you liked feel flat now? Is anything still the one answer you always reach for?',
      },
      {
        text: 'Every pilot you build in the draft is now kept. When you start an expedition, the pilots players have made appear below the pre-made heroes, with who made them; on this page that means everyone who plays it, not only you. Pick one to fly it as it was built. ✕ takes one of your own off the list. Did your pilots come back as you left them? Is anyone else’s worth flying?',
      },
      {
        text: 'The mission screen has a dock along the bottom for the pilot you are flying: AP in large type, etherions banked, dice, the whole hand in one row, and the actions. It never folds or scrolls away. The side column holds the enemy intents, your ally and the log; click the ally to swap them into the dock. Can you play a whole turn without hunting for anything? Does the board still have room on your screen?',
      },
      {
        text: 'Choosing the next stop: the stops you can reach now stand as cards above the route, each with its objective, clock, foes, place rules and bonus goals, and the route reads from the top down. Is it clear which stop you would rather take, and why? Is anything you want to know before choosing missing?',
      },
      {
        text: '76 more painted pilots from Cosmic Shore: 126 portraits and scenes in all, one for each pair of clades they cover. More heroes now wear a painting of their own pair instead of a stand-in, and the title shows a different one each expedition. Does any portrait or scene look wrong for the clades it is shown with?',
      },
      {
        text: 'Every clade now has a painted head: on cards, in draft packs, the codex and the pilot screens, in place of the flat icons (human keeps its drawn icon). Does any head not read as its animal at small sizes, or clash with the card art?',
      },
      {
        text: 'Every pre-made hero is now a painted pilot, with that pilot’s name, clades and art: Rosh (octopus and raven), Ekora (otter and eel), Nedira (hedgehog and tortoise), Echo (mouse and owl), Karenth (axolotl and koi) and Slingshot (flamingo and mantis shrimp). Each keeps the role and title of the hero it replaces. Does each one play the role its title promises?',
        cards: ['rav_mob', 'wea_musk', 'heh_spines', 'mou_tiny', 'koi_gold', 'msh_punch'],
      },
      {
        text: 'The last branch: Beetle, Butterfly, Firefly, Praying Mantis and Scorpion, with the Grasshopper moved onto it. The insects share the grasshopper’s Compound Eyes and their own Antennae; all but the butterfly wear its Exoskeleton, the butterfly glides on its wings and migrates like the crane, and the scorpion molts like it and shrugs off venom like the hedgehog. The beetle lifts and plays dead, the butterfly flashes eyespots and turns in a chrysalis, the firefly flashes in time, the mantis waits and grabs, the scorpion holds and stings. Which bug surprised you?',
      },
      {
        text: 'Two crustaceans start a new branch: Lobster and Mantis Shrimp. Both Molt (shrug off holds, or step out of the shell healed) and wear a Carapace; the lobster also has the parrot’s Long Life, and the mantis shrimp the chameleon’s Turret Eyes. The lobster crushes with one claw, holds with the other, flips away backwards and guards its den; the mantis shrimp punches hard enough to hit twice, spears from its burrow and sees the weak spot. Which claw did you reach for most?',
      },
      {
        text: 'Snail and Jellyfish join the Mimic Octopus on a new branch. All three share Boneless Squeeze; the snail also tastes with Chemo-Suckers, carries the tortoise’s Shell and regrows like the axolotl, and the jellyfish drifts with the eel’s Buoyancy Control and regrows too. The snail glides up walls, seals itself in and rasps; the jellyfish stings, trails tentacles, glows, blooms and can turn young again when downed. Do they feel soft-bodied and strange?',
      },
      {
        text: 'Four fish join the eel on its branch: Koi, Clownfish, Lionfish and Seahorse. All five share Buoyancy and the axolotl’s Lateral Line; the koi and clownfish share Schooling, the koi also has the parrot’s Long Life, and the seahorse shares the pouched animals’ Pouch and the chameleon’s turret eyes. The koi climbs upstream and turns gold, the clownfish hides in its anemone and darts out, the lionfish corners prey with its spines, the seahorse anchors by its tail and snaps. Which fish feels most like itself?',
      },
      {
        text: 'Newt and Tree Frog join the axolotl on its branch. All three share Toxic Secretion and External Gills; the newt also shares Regeneration and Lateral Line, and the tree frog’s sticky toes are the gecko’s Adhesive Setae. The newt wanders bright and poisonous and heads home to the pond; the tree frog leaps leaf to leaf, flashes red eyes and calls the rain. Do they feel different from the axolotl?',
      },
      {
        text: 'Crocodile and Giant Tortoise join. Both share Armoured Hide and Slow Heart (which can stop your heart long enough that nothing can target you), and every reptile’s Solar Basking; the tortoise also has the parrot’s Long Life. The crocodile lurks, lunges and rolls; the tortoise shells up, plans ahead and plods through anything. Are they too hard to kill, or just right?',
      },
      {
        text: 'Three lizards join the gecko on its branch: Chameleon, Basilisk and Horned Lizard. All four share the gecko’s Tail Autotomy, Scaled Hide and Solar Basking. The chameleon shoots its tongue and watches two ways at once, the basilisk runs across water, and the horned lizard squirts blood, raises spikes and flattens into the sand. Does each one feel like itself?',
      },
      {
        text: 'The last two birds join: Ostrich and Wild Turkey. Both share Ground Sprint; the turkey shares the peacock’s Display Fan, Alarm Call and Spur, and the ostrich kicks and watches like the hoofed animals (Kick and Wide Eyes). The ostrich hides flat and guards a shared nest; the turkey gobbles, keeps watch and flies up to roost. Do the ground birds feel like birds?',
      },
      {
        text: 'Five bright birds join: Raven, Parrot, Toucan, Hummingbird and Peacock. The raven and parrot share Mimicry and Human’s Pattern Recognition, and the parrot has Opposable Grip and Long Life (get up again if downed). The toucan shares Big Bill; the hummingbird has eight traits of its own (Hover, Thousand Beats, Night Torpor and more); the peacock fans, screams and kicks with its spurs. Which one plays most like the animal?',
      },
      {
        text: 'Three seabirds join: Atlantic Puffin, Pelican and Blue-Footed Booby. All three share Plunge Dive, Waterproof and Salt Gland (and every bird’s Hollow Bones). The puffin also burrows like the jerboa, and the pelican shares the shoebill’s Big Bill. The puffin flies underwater, the pelican herds foes for its partner, the booby dances and holds its nest. Which one did you enjoy most?',
      },
      {
        text: 'Six waders join: Crane, Heron, Egret, Ibis, Shoebill and Flamingo. All six carry Hollow Bones, Wade and Long Legs; all but the flamingo share Spear Bill and Still Hunt. The heron also carries Tool Use, the crane has Migration and the shoebill Big Bill (other birds will share those later). The flamingo is the odd one out: a healer that marches with its partner and thrives in hazards. Do the six feel different from each other?',
      },
      {
        text: 'Two birds of prey join the Barn Owl on its branch: Bald Eagle and Hawk. All three share the owl’s Hollow Bones and Talon Strike; the eagle and hawk share Keen Sight and Stoop, a fall from the sky onto a foe. The eagle holds on and calls its partner in; the hawk has Sky Hyperspeed (the cheetah’s exact run of 4, over hazards too), hovers on the wind and chases through cover. Do the two feel different, and does the owl still feel like itself?',
      },
      {
        text: 'Three pouched and egg-laying animals join: Red Kangaroo, Opossum and Platypus. The kangaroo and opossum share Pouch, which heals your partner or swaps places with them anywhere on the board. The opossum shares the hedgehog’s Venom Shrug and the platypus the jerboa’s Burrowing. Does swapping places open up new plays for two?',
      },
      {
        text: 'Four armoured and slow animals join: Three-Toed Sloth, Armadillo, Pangolin and Hedgehog. The three armoured ones share Curl Up; sloth, armadillo and pangolin share Slow Metabolism; armadillo and pangolin share Dig Claws and Long Tongue. They are hard to hurt and heal over time, with spines, scales and sudden swipes to hit back. Are they fun, or just slow?',
      },
      {
        text: 'Four gnawers join: Field Mouse, Porcupine, Brown Hare and Black Hare. They share the jerboa’s traits: every gnawer has Gnawing Incisors, the mouse and porcupine its Vibrissae, the hares its Leap, and the hares and mouse its Erratic Bounding. The two hares also share Long Ears, Boxing and Lie Low. Is the porcupine’s prickly defence fun to play, and do the hares feel different from each other?',
      },
      {
        text: 'Seven hoofed animals join: Yak, Bison, Oryx, Bighorn Ram, Moose, Deer and Zebra. All seven share Hooves, Herd Ring, Wide Eyes and Kick; the horned four share Horn Charge and Ruminate; moose and deer share Antlers and Bound Away. Each has three to five traits of its own. Do the seven feel different from each other, or does the shared half drown them out?',
      },
      {
        text: 'Three sea mammals join: Walrus, Orca and Narwhal. All three share Blubber and Breath Hold; the two whales share Echolocation and Pod Song; the walrus and narwhal share Tusk. The walrus is a slow, heavy anchor, the orca a pack hunter that sets up its partner, the narwhal a scout that slips under the ice. Does each feel like itself?',
      },
      {
        text: 'Eight more clades: Fennec Fox, Red Fox, Golden Jackal, Coyote and Spotted Hyena, then Sea Otter, Honey Badger and Red Panda. The dogs and the hyena share Keen Nose, Pack Howl and Long Trot (the hyena also shares the cats’ Killing Bite, since hyenas sit nearer the cats). The otter, badger and red panda share Musk and Dense Fur. Does each feel like itself? Which shared trait did you take twice?',
      },
      {
        text: 'A trait your two clades share can be taken a second time, and that pick is now 1 Upgrade Point for that card alone (it was 2, and often gave nothing at all because of a bug, now fixed). Over whole runs that is about as strong as taking a different card. When you are offered a trait you already hold, which do you take, and does it feel like a real choice?',
      },
      {
        text: 'Five cats join: Eurasian Lynx, Caracal, Ocelot, Tiger and Cheetah. Cats share Pounce, Stalk, Killing Bite and Land on Your Feet (and all but the cheetah share Retractable Claws and Night Eyes). The cheetah alone has Hyperspeed: a run of exactly 4, past foes. Does each cat feel like itself? Is an exact run fun to plan around?',
      },
      {
        text: 'A new mission that is not a fight: Survey. Survey marks lie across the whole board and night is coming. Stand on one and Interact to tag it, for 2 AP or one die of the mark’s colour (Omni counts). The far ones start veiled (a ringed ! on the board): stand within 1 of one, or reach it with a reveal, to sight it first. It sits in the middle of the route, in place of the second Cascade. Did the two of you split up? Did a rolled element ever go to a mark instead of a card, and was that a real choice? Use the panel to start one: Survey, any tier.',
      },
      {
        text: 'When a mission ends on something that happened to one of your pilots (they went down, a partner got them back up, they finished on 3 vitality or less, or they came through without a scratch), the panel now says what happened and asks what it meant to them, with three openings ("After the Quarry, … never again"). One moment per mission, the most dramatic. Did the moment it picked feel like the one that mattered?',
      },
      {
        text: 'The game now asks you to embellish the world. When a mission ends, a panel gives you one detail of the place you just crossed and an open question about it, with three openings to carry on from (or start from nothing); the draft does the same for the pilot you picked. Answers go to Garrett as proposals. Were the questions ones you wanted to answer? Which opening did you take, and which question fell flat?',
      },
      {
        text: 'Three new clades, the first of the animals painted on Cosmic Shore pilots: Orangutan, Ring-Tailed Lemur and Mandrill. Primates share some traits with Humans and with each other (Grooming, Canopy Leap, Troop Call), and each has four of its own. A human-orangutan pilot can take Tool Use twice: the second time it is UP for that card. Do the three feel different from each other, and from a Human?',
      },
      {
        text: 'Dice look like dice again, in their real shapes: the plain die is a d20 (an icosahedron), an element’s die a d8 (an octahedron) and the ethereal die a d12 (a dodecahedron), with the face it shows in the middle. The same shapes tumble in the roll tray. Your abilities are now cards: each has art showing what its two faces do, the Physical side in steel on the left and the Ethereal side in its etherion’s colour on the right, over the clade it comes from, and each face button carries the same picture. Can you tell what a card does from its art? Do the dice read at a glance?',
      },
      {
        text: 'The dice got a new look. Your dice are now held like a hand of cards: each one is a small card with its symbol in the corner, a picture of what it does (Mass shows Strike and Shove, Charge Arc and Reach, Space Scramble, Time Brace, Omni pays for anything, AP shows its number), and its size (d20 plain, d8 element, d12 ethereal). Hover one and it lifts. Omni now uses the omnicrystal symbol from Cosmic Shore. When a new round begins, each pilot’s dice tumble across a tray at the foot of the board in their own shapes, land one after another on what they rolled, and are dealt into your hand. The story line under End Round is now readable (it was dark text on a dark box). Is the tray ever in the way? Can you read what each die does at a glance?',
      },
      {
        text: 'Two players now have a purse each. The 6 ◇ you start with are shared out (3 each), and so is what a mission earns. Your pilot buys, sells and fuels its gear from your own purse, and a skipped trait pays you. The haven’s full repair and event prices come from the fuller purse first. Each screen now shows only your own Buy, Sell and Train buttons; your partner’s upgrade shows "… is choosing" until they are done. Both purses show at the top, named, with yours in gold. Solo play is unchanged: one player, one purse. Did you miss being able to pool crystals? Would a "give ◇" button help?',
      },
      {
        text: 'Moving the objective forward is now celebrated. Breaking a seal, turning the winch or the valve, holding the beacon, checking a cache or lifting a crate brings up a gold card on the board ("A seal breaks", "The valve turns"…) with a bar that fills from where the objective was to where it is now, gold rings where it happened, and a rising chime (with the sound on). The objective pill in the top bar fills with gold as you go. You can also see beforehand what will count: Interact glows gold when it would count, a play that would move the objective gets a gold ◎, and hovering it says "◎ moves the objective forward". Do you now know when you are doing the right thing? Is the card ever in the way?',
      },
      {
        text: 'The mission screen now folds away what you are not using, so the board is much bigger. The pilot you are not playing folds to its vitality and dice, above the one you are; click it to switch, or "Show cards" to see its hand without switching. The log folds to its last lines (▾ opens it), the enemy intents fold to the forecast (click their heading), and a long objective folds to two lines (click it to read it all). Your choices are remembered on this computer. Clicks should also answer faster: panels redraw only when something in them changed, the ✦ hints are worked out just after the screen updates, and online, your own moves show on your screen at once instead of waiting for the host. Does anything feel slow still? Did you ever miss something that was folded away?',
      },
      {
        text: 'The same player now goes first every round (Player 1, then Player 2, then the foes). Nobody takes two turns in a row any more, so you can plan your next turn while your partner takes theirs, knowing nothing new will land on you before you act. Does the wait feel like planning time now?',
      },
      {
        text: 'Combos are now shown. A play the world would add to gets a gold ✦: a shove under heavy gravity (the foe slams down for extra damage), a hit on a foe your partner Marked (the Mark is spent for +2), or anything that breaks a foe’s guard. Hover it and the line above the board says what the world adds, worked out exactly on a copy of the mission. A catch shows as ⚠, for example a foe that holds fast against a shove, or a blow that finds an afterimage. Did a ✦ make you try something you would not have? Did one ever promise something that did not happen?',
      },
      {
        text: 'A mission now has a time of day. A day on Tumult lasts about an hour, so six rounds make one: the board brightens at dawn and noon, goes rose at dusk and blue at night, and the top bar says which. It changes nothing in play. Windy places blow gusts across the board toward the edge the wind pushes to, and fog drifts low. As each round begins the Terminal types a readout (the place, its pull and weather at the start; then the round, the hour and what is left on the clock). Plays, hits, shields, heals and falls now flash on the board, a state you gain floats up by its keyword, and each etherion has its own sound (Mass deep, Charge buzzing, Space airy, Time a bell). Turn the sound on with the speaker button. Is anything too much, or too quiet? Does night ever make the board hard to read?',
      },
      {
        text: 'The route is redrawn as the climb it is. Each leg lies over its painting and says how it is travelled (by land, by sea, by air), with what that ground’s guides would tell you. Each stop is a painted roundel of the place it is played in, with its name, its kind, its tier and its pull: ▲ heavy (uphill) or ▼ light (downhill). Hover a stop to see the place. The road you took is lit gold, the next choices glow, stops you passed by fade, and your two pilots stand where you last stopped. Does the route help you choose where to go? Does it feel like a journey?',
      },
      {
        text: 'A story box now sits under End turn. On your turn, write what it looked like in a line, as the pilot you have selected (for example: "Slingshot counts the waves between the gusts, and jumps on the ninth"). Press Enter, or just end your turn. It changes nothing in play. Your line shows in the log, then in your pilot’s words in the passage after the stop, and in the record of the run at the end. Online, each player writes their own. Did you write any? What made you want to?',
      },
      {
        text: 'Words of art now explain themselves. Hidden, Anchor, Weak, Shield, Push, Zone and the rest are drawn as small chips with an icon in card text, foe intents and the log; hover one for its rule in a sentence. Tokens on the board wear the same icons as badges, with a number where a state counts down. Hover a card face, a basic action or a gear ability and the board shows what it would do, exactly: rings on whoever it would reach, damage numbers, where things would be shoved or pulled, which states they would gain. While choosing a target, hover each one to compare. Was there a word you still had to look up? Did a preview ever show something that then did not happen?',
      },
      {
        text: 'Moving your partner is now yours to decide, all at once. Leg up, Call, Cue and the Beacon gear ask you where your partner goes when you play them, and they move there immediately. Your partner never gets free steps to spend later, so you can plan your whole turn and account only for what the foes do. Does that make two-player turns easier to plan? Do you ever miss letting your partner choose?',
      },
      {
        text: 'Layout fixes and ways back. Card costs no longer run off the edge of a card, a bloodline name moves to its own line when it is long, every Take button on the reward screen lines up under its card, and a face you cannot play says why on a line of its own. On the board, zone names no longer print over the names of spaces. Every draft step now has a Back button: to the title, to your first pilot, to the bloodlines, or to start a pilot over. The route, missions, rewards, havens and events all have a Title button, and Continue picks up where you left off. Is there still a screen you could not leave, or text that overflows?',
      },
      {
        text: 'New dice, and four a turn. Most of your dice are d20s: mostly AP, with each element and Omni once. Every card you awaken, and every Affinity boon, swaps a plain die for a d8 of its element (no AP, half that element), marked 8 in its corner; Omni Core gives a d12 with two of each symbol. The element symbols are now Cosmic Shore’s (a key sits under your dice). Foes are tougher and objectives a little bigger to match. Did four dice give you more to decide? Did a pilot start to feel like a mage? Was there ever too little AP?',
      },
      {
        text: 'Pilots can now help each other with three basic actions, no card needed. Spot (2 AP): mark a foe up to 3 nodes away, so the next hit on it, by either of you, deals +2. Leg up (1 AP): move an ally beside you up to 2 nodes, to where you choose. Lend (2 AP): give an ally beside you 2 AP for this round; lend it before their turn, or it is lost. Did you ever plan a turn around your partner? Which one did you use, and which never?',
      },
      {
        text: 'A new mission that is not a fight: Salvage. Crates lie on the far side; carry them to the near edge (A) before the water takes the wreck. Interact beside a crate to pick it up, one each at a time; reaching the near edge sets it down, however you get there (even the wind). Did you split up or carry together? Did you fight the scavengers, or go round them? Is it too easy, or too tight? Use the panel to start one: Salvage, any tier.',
      },
      {
        text: 'Places now have rules. Light gravity (hills, meadows, sea cliff): a shove or pull goes 1 space further. Heavy gravity (quarry, high pass): anything shoved or pulled takes 1 damage a space. Some visits bring wind (at the end of each round everyone not braced, anchored or hovering moves 1 space downwind, into hazards too) or fog (ranged strikes reach only 2 steps). The top bar shows today’s rules; hover them for the sentence. Did a place change what you did? Did the wind ever feel unfair, or fun?',
      },
      {
        text: 'Note any turn where you had nothing interesting to do, and say which mission it was: the simulator says about two turns in five are like that, mostly at tier 1.',
      },
      {
        text: 'After every won mission each pilot now gets an upgrade of their own: a trait offer of three cards that fit that pilot (or skip for +2 ◇), and after an elite a boon each. With two players, each picks for their own pilot. Did both of you have a pick you cared about? Was one offer always better than the other?',
      },
      {
        text: 'Two players now take turns. In each round one player flies their pilot and presses End turn, then the other does the same, and the foes act once both are done. The same player goes first every round, so nobody takes two turns in a row. This applies on one screen and online. Does waiting for your partner feel like planning together, or like dead time?',
      },
      {
        text: 'Online play now says why when it cannot connect. A partner who only has view access to the page (a share link) cannot write to the game, so the title tells them to ask for an email invite as Editor. Play online on the separate invite-only Tumult Online page. Did joining work first time?',
      },
      {
        text: 'Canon notes now reach the lore lead: every ✎ correction and draft answer you write on this page is sent to its private inbox (Canon on the title says how many have gone). Only you and the page’s editors can read them, never other testers. Garrett: Canon → Open the inbox to mark each note canon or rejected, edit its wording, and tick public for what may be copied into the repository. Did anything you wrote fail to arrive?',
      },
      {
        text: 'Playing now helps write the world. Look for the small ✎ beside the atlas’s rules and field notes, the pilot on the title screen, foes in the Codex and events: say it is wrong, add a detail, or say you love it. When you draft, the game asks why the pilot you picked guides (optional). Everything you write is a proposal for Garrett to approve; find it all under Canon on the title screen, and copy it to send it on. Were the questions welcome, or in the way? Is there text you wanted to correct and could not?',
      },
      {
        text: 'Every mission is now played on a page of the atlas: a fixed board for a kind of place on Tumult (a quarry, a drowned hamlet, floating meadows), with its own paths, zones and high ground, over its painting. Spaces are named A1 to E3. Click the place’s name in the mission’s top bar, or Atlas on the title, to read its page: the board, the rules of this place and field notes. Do the places feel different to fight across? Is the facing page worth reading? Which page would you redraw?',
      },
      {
        text: 'Lanes are now zones: soft coloured regions on the board, in new muted colours so they never look like an etherion or a domain. A ranged strike hits anything that shares a zone with you. Today every zone is still one column, so play is exactly as before; this is the ground for boards of any shape (the atlas). Can you tell at a glance which foes can shoot you? Does a zone read as one region?',
      },
      {
        text: 'Every run is now a different expedition: who sent you (Jade, Ruby or Gold, and why), what waits at the end (the finale plays by the Heart’s rules under a new name), and the order of land, sea and air, each leg with its own painting. Events lean toward the ground you are crossing. Start three runs: do they feel like three different journeys? Which expedition would you most like to play again?',
      },
      {
        text: 'The words now tell one story: each run is an expedition set down from an Ark, crossing Tumult by land, sea and air to the Heart. The skiff, the HyperSea tide and the Consolidation are gone, and the difficulties are now Steady wind and Gale. Does any screen still feel like it belongs to the old frame? Does the title make you want to set out?',
      },
      {
        text: 'After every stop your pilots now say something about what just happened, in the voice of their clade, and the summary keeps the whole log. Do the two pilots sound like different people? Which line felt most like your pilot, and which felt wrong for them? Do you read them, or skip?',
      },
      {
        text: 'Drawn icons replace the emoji everywhere: foes on the board, the route, dice, gear, boons, events. Can you tell every foe apart at a glance on the board? Which icon did you have to hover to understand?',
      },
      {
        text: 'The route is now a chart with the road you took lit up, and events and havens show a painting. Does the run feel more like a journey somewhere? Is anything harder to read than the old grid?',
      },
      {
        text: 'Play online: one of you types a name and presses “Host a game”, the other types the four-letter code and presses Join, from their own screen. Each drafts and flies one pilot; the host picks the route and you take turns. Does it keep up? Anything that went out of step between the two screens, or that you had to wait for, put in a report.',
      },
      {
        text: 'Two players on one screen: pick “2 players” on the title screen and pass the screen. Does owning one pilot change how you talk through a turn?',
      },
      {
        text: 'New look: Cosmic Shore’s pilots now play the heroes. A hero shows the painting of their own two clades when there is one, else a stand-in that shares a clade (marked “stand-in”). Does seeing a face change how you feel about a hero? Which pairs would you most like painted next?',
      },
      {
        text: 'Read the board and the cards at a glance: do the new type, the panels and the scene under the board help or get in the way? Anything hard to read on a phone?',
      },
      {
        text: 'A crystal is an action: any banked etherion (or Omni) can be spent on its own, with no AP, for a basic action of its colour — Mass strikes for 2 or shoves 1, Charge arcs 1 damage into a foe up to 3 away, Space scrambles 1 node (ledges too), Time braces and slides your track. Are elements now the rolls you hope for? Does a turn with three crystals and no AP still feel like a turn?',
      },
      {
        text: 'To pay for free crystals, the Heart is tougher (72 vitality at tier 3, was 44) and once it cracks the Vault drowns in four rounds, not seven. Does the last fight feel like a race you can plan for, or a wall?',
      },
      {
        text: 'Charge Reach (Interact 2 nodes away) still costs 1 AP. Does Arc give a lone Charge die enough to do when nothing is in reach?',
      },
    ],
  };

  /* ───────────── state (kept on this device) ───────────── */
  const fresh = () => ({
    cfg: { type: 'vault', tier: 1, kit: 'tier', heroes: [0, 1], seed: '' },
    rounds: 'turns',
    last: null,
    log: [],
  });
  function load() {
    const st = fresh();
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && typeof saved === 'object') {
        Object.assign(st.cfg, saved.cfg);
        // the Ethereal rule switch (2.4–2.80) is gone: a stored 'etherealMinE' is ignored, and the rule is as shipped
        if (T.ROUND_MODES.includes(saved.rounds)) st.rounds = saved.rounds;
        if (saved.last) st.last = saved.last;
        if (Array.isArray(saved.log)) st.log = saved.log.slice(0, LOG_MAX);
      }
    } catch (e) {}
    // never trust what was stored: a build with other heroes or missions may have written it
    const c = st.cfg;
    if (!TYPES.includes(c.type)) c.type = 'vault';
    c.tier = c.type === 'boss' ? 3 : [1, 2, 3].includes(c.tier) ? c.tier : 1;
    c.kit = c.kit === 'start' ? 'start' : 'tier';
    const ok = (i) => Number.isInteger(i) && i >= 0 && i < T.PREBUILTS.length;
    if (!Array.isArray(c.heroes) || c.heroes.length !== 2 || !c.heroes.every(ok) || c.heroes[0] === c.heroes[1])
      c.heroes = [0, 1];
    c.seed = String(c.seed == null ? '' : c.seed)
      .replace(/\D/g, '')
      .slice(0, 9);
    return st;
  }
  const st = load();
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch (e) {}
  }
  /** The way to play that expeditions started on this screen take (T.ROUND_MODES). */
  U.roundsPref = () => st.rounds;

  /* ───────────── what was played (counted per mission) ───────────── */
  let live = { m: null, faces: {}, P: 0, E: 0, E0: 0 };
  const realPlayFace = T.playFace;
  T.playFace = function (m, h, cardId, faceKey) {
    const r = realPlayFace.apply(this, arguments);
    if (r && r.ok && U.run && m === U.run.mission) {
      if (live.m !== m) live = { m, faces: {}, P: 0, E: 0, E0: 0 };
      const k = cardId + ':' + faceKey;
      live.faces[k] = (live.faces[k] || 0) + 1;
      live[faceKey]++;
      if (faceKey === 'E' && T.heroE(h, cardId) === 0) live.E0++;
    }
    return r;
  };
  const played = (m) => (live.m === m ? live : { faces: {}, P: 0, E: 0, E0: 0 });

  /** One line of the session log: a mission that was played to its end. */
  function record(run, m) {
    const p = played(m);
    const rec = {
      at: new Date().toISOString(),
      v: T.BUILD.version,
      play: T.playerCount(run) >= 2 ? run.party.rounds || 'turns' : 'solo', // how rounds went
      seed: run.seed,
      quick: run.quick || null,
      type: m.archetype,
      tier: m.tier,
      title: m.title,
      squad: m.heroes.map((h) => h.name),
      hp: m.heroes.map((h) => Math.max(0, h.hp) + '/' + h.maxHp),
      won: !!m.won,
      rounds: m.round,
      kills: m.stats.kills,
      bonus: m.bonus.filter((b) => b.achieved).length + '/' + m.bonus.length,
      P: p.P,
      E: p.E,
      E0: p.E0,
      faces: p.faces,
    };
    st.log.unshift(rec);
    st.log.length = Math.min(st.log.length, LOG_MAX);
    save();
    return rec;
  }

  /* ───────────── starting a mission ───────────── */
  function launch() {
    const c = st.cfg;
    const seed = c.seed ? Number(c.seed) : Date.now() & 0x7fffffff;
    const quick = { heroes: c.heroes.slice(), kit: c.kit };
    const run = T.quickMission({ seed, heroes: quick.heroes, type: c.type, tier: c.tier, kit: c.kit });
    run.quick = quick;
    st.last = { type: c.type, tier: c.tier, kit: c.kit, heroes: quick.heroes, seed };
    save();
    U.run = run;
    U.screen = 'mission';
    U.enterMission();
    U.showTutorial('mission');
    T.saveRun(run);
    U.render();
  }
  const command = (q, type, tier, seed) =>
    `node tools/mission-log.js ${type} ${tier} ${seed} ${q.heroes[0]} ${q.heroes[1]} ${q.kit}`;

  /* ───────────── the report ───────────── */
  const ROUNDS = {
    turns: 'take turns, in the order you choose; each player rolls as their turn ends',
    live: 'all at once, no turns; everyone rolls together when the round begins',
    solo: 'solo',
  };
  const roundsText = () => {
    const run = U.run;
    const now = run && T.playerCount(run) >= 2 ? ` (this expedition: ${ROUNDS[run.party.rounds] || ROUNDS.turns})` : '';
    return ROUNDS[st.rounds] + now;
  };
  function logLine(r) {
    const when = String(r.at).slice(0, 16).replace('T', ' ');
    const kit = r.quick ? `${r.quick.kit} kit` : 'on an expedition';
    return `${when} · ${r.type} t${r.tier} · seed ${r.seed} · ${r.squad.join(' + ')} · ${kit} · ${r.won ? 'WON' : 'LOST'} in ${r.rounds} rounds · hp ${r.hp.join(', ')} · ${r.kills} kills · bonus ${r.bonus} · faces P ${r.P} / E ${r.E} (${r.E0} at E 0)${r.play ? ' · ' + r.play : r.minE != null ? ' · rule E≥' + r.minE : ''} · v${r.v}`;
  }
  function reportText() {
    const out = [`TUMULT playtest report — build ${T.BUILD.version}`, 'Rounds with friends: ' + roundsText()];
    const run = U.run;
    const m = run && run.mission;
    if (m && (U.screen === 'mission' || !m.over)) {
      const p = played(m);
      out.push(
        '',
        `Now: ${m.title} — ${m.archetype} · tier ${m.tier} · seed ${run.seed} · round ${m.round} · ${m.over ? (m.won ? 'won' : 'lost') : 'in progress'}`,
        'Squad: ' +
          m.heroes.map((h) => `${h.name} ${Math.max(0, h.hp)}/${h.maxHp} hp${h.downed ? ' (down)' : ''}`).join(' · '),
        'Foes: ' +
          (m.enemies
            .filter((e) => e.alive !== false)
            .map((e) => `${e.name} ${Math.max(0, e.hp)}/${e.maxHp}`)
            .join(' · ') || 'none'),
        `Faces played: P ${p.P} / E ${p.E} (${p.E0} at E 0)`,
      );
      if (run.quick) out.push('Same board and opening dice: ' + command(run.quick, m.archetype, m.tier, run.seed));
      out.push('', 'Last lines of the log:', ...m.log.slice(-12).map((l) => `  [r${l.r}] ${l.text}`));
    }
    out.push('', `Missions finished on this device (${st.log.length}, newest first):`);
    out.push(...(st.log.length ? st.log.map((r) => '  ' + logLine(r)) : ['  none yet']));
    return out.join('\n');
  }
  function openReport() {
    U.openModal(
      `<div class="row"><h3>Playtest report</h3><span class="right row"><button class="sm primary" data-act="pt-copy">Copy report</button><button class="sm" data-act="pt-save" ${U.run ? '' : 'disabled'}>Copy save</button><button class="sm" data-act="pt-clear">Clear log</button><button class="sm" data-act="closeModal">Close</button></span></div>
      <p class="dim small">What you are playing now and every mission finished on this device. Nothing leaves the page unless you copy it: paste it wherever you report what you found. <b>Copy save</b> copies the Tide exactly as it stands — a mission in progress included — so that whoever gets it can carry on from this moment (<span class="mono">node tools/mission-log.js --save file</span>).</p>
      <textarea class="pt-report" id="pt-report" readonly spellcheck="false">${esc(reportText())}</textarea>`,
    );
  }
  /** Put text on the clipboard; where the page may not, show it selected so it can be copied by hand. */
  function copy(text, done) {
    const box = document.getElementById('pt-report');
    const byHand = () => {
      if (!box) return;
      box.value = text;
      box.focus();
      box.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {}
      U.toast(ok ? done : 'Selected — copy it with your keyboard or the menu.');
    };
    try {
      navigator.clipboard.writeText(text).then(() => U.toast(done), byHand);
    } catch (e) {
      byHand();
    }
  }

  /* ───────────── the panel ───────────── */
  const seg = (act, arg, label, on, off) =>
    `<button class="sm ${on ? 'on' : ''}" data-act="${act}" data-arg="${arg}" ${off ? 'disabled' : ''}>${label}</button>`;
  function carriers(cards) {
    if (!cards || !cards.length) return '';
    const who = T.PREBUILTS.filter((pb) => cards.some((c) => pb.cards.includes(c))).map((pb) => pb.name);
    const lines = [...new Set(cards.map((c) => T.SPECIES[T.CARD[c].sp].name))];
    return who.length
      ? ` <span class="pt-who">Play ${esc(who.join(' or '))}.</span>`
      : ` <span class="pt-who">No pre-made hero carries it: draft ${esc(lines.join(' or '))} on a New Expedition.</span>`;
  }
  U.titleExtra = function () {
    const c = st.cfg;
    const boss = c.type === 'boss';
    const heroRow = (slot) =>
      T.PREBUILTS.map((pb, i) =>
        seg(
          'pt-hero',
          slot + '|' + i,
          `${esc(pb.name)} <span class="pt-sp">${pb.species
            .slice(1)
            .map((s) => U.icClade(s))
            .join('')}</span>`,
          c.heroes[slot] === i,
        ),
      ).join('');
    const last = st.last
      ? `<div class="pt-last">Last: ${esc(U.NODE_NAME[st.last.type])} · tier ${st.last.tier} · seed <b class="mono">${st.last.seed}</b> <button class="sm ghost" data-act="pt-again">Use this seed</button></div>`
      : '';
    return `<div class="pt panel">
      <div class="row"><span class="kick">Playtest build ${esc(T.BUILD.version)}</span><span class="right"><button class="sm" data-act="pt-report">Report · ${st.log.length} played</button></span></div>
      <h3>Jump into a mission</h3>
      <div class="pt-row"><span class="pt-lab">Mission</span>${TYPES.map((t) => seg('pt-type', t, U.NODE_ICON[t] + ' ' + esc(U.NODE_NAME[t]), c.type === t)).join('')}</div>
      <div class="pt-row"><span class="pt-lab">Tier</span>${[1, 2, 3].map((t) => seg('pt-tier', t, t, c.tier === t, boss && t !== 3)).join('')}
        <span class="pt-lab pt-gap">Kit</span>${seg('pt-kit', 'tier', 'For this tier', c.kit === 'tier')}${seg('pt-kit', 'start', 'Starting six', c.kit === 'start')}</div>
      <div class="pt-row"><span class="pt-lab">Hero 1</span>${heroRow(0)}</div>
      <div class="pt-row"><span class="pt-lab">Hero 2</span>${heroRow(1)}</div>
      <div class="pt-row"><span class="pt-lab">Seed</span><input id="pt-seed" class="pt-seed" inputmode="numeric" maxlength="9" placeholder="random" value="${esc(c.seed)}" aria-label="Seed">
        <button class="primary" data-act="pt-go">▶ Play this mission</button></div>
      ${last}
      <p class="dim small">The same seed, squad and kit always give the same board and the same opening dice. After the mission the expedition carries on from that node.</p>
      <h3>Way to play with friends</h3>
      <div class="pt-row">${seg('pt-rounds', 'turns', 'Take turns', st.rounds === 'turns')}${seg('pt-rounds', 'live', 'All at once', st.rounds === 'live')}</div>
      <p class="dim small"><b>Take turns</b>: each round, players take turns in the order they choose, and each player rolls their next dice as soon as their turn ends. <b>All at once</b>: no turns. Everyone spends their AP whenever they like, in whatever order you agree between you, and presses Done; once everyone is done the foes act, and everyone rolls together. The host chooses: expeditions started on this screen play this way, and so does the one under way if you host it. Kept on this device.</p>
      <details><summary>What to look at in this build</summary><ul class="pt-notes">${NOTES.items.map((n) => `<li>${esc(n.text)}${carriers(n.cards)}</li>`).join('')}</ul></details>
    </div>`;
  };
  U.missionTopExtra = (m) =>
    `<button class="ghost sm" data-act="pt-plan" data-tip="What the look-ahead player would do with this turn" ${m.over ? 'disabled' : ''}>Plan</button><button class="ghost sm" data-act="pt-report" data-tip="Playtest report: seed, squad, the log so far">Report</button>`;

  /* ───────────── what the look-ahead player would do ───────────── */
  let plan = [];
  function openPlan() {
    const m = U.run && U.run.mission;
    if (!m || m.over) return;
    plan = T.planHeroPhase(m);
    // each step is described on the mission as it would stand by then
    const copy = T.imagine(m);
    const steps = plan.map((a) => {
      const line = T.describeAction(copy, a);
      T.applyAction(copy, a);
      return line;
    });
    U.openModal(
      `<div class="row"><h3>What the look-ahead player would do</h3><span class="right row">${plan.length ? '<button class="sm primary" data-act="pt-plan-play">Play these</button>' : ''}<button class="sm" data-act="closeModal">Close</button></span></div>
      <p class="dim small">It knows no card by name. It tries every legal action on a copy of the mission, lets the enemies do what they have declared, and keeps the line that leaves the squad best off by one measure shared by every mission. It sees this round and no further, and never the dice to come. The balance tables are this player’s results.</p>
      ${steps.length ? `<ol class="pt-notes">${steps.map((t) => `<li>${esc(t)}</li>`).join('')}</ol><p class="dim small">Then it would end the round.</p>` : '<p>It would end the round here: nothing it can do now leaves the squad better off.</p>'}`,
    );
  }
  function playPlan() {
    const m = U.run && U.run.mission;
    U.closeModal();
    if (!m || m.over) return;
    for (const a of plan) if (!T.applyAction(m, a).ok || m.over) break;
    plan = [];
    U.ms.undo = []; // played straight on the mission: nothing before it to go back to
    U.updateMission();
    T.saveRun(U.run);
  }

  /* ───────────── actions ───────────── */
  const prevExtra = U.extraAct; // the game's own add-ons (Home, src/ui/home.js) come before this panel
  U.extraAct = function (act, arg, el, e) {
    if (act === 'missionDone') {
      // seen before the game handles it: the mission is over and still whole
      const run = U.run;
      if (run && run.mission && run.mission.over) record(run, run.mission);
      return prevExtra ? prevExtra(act, arg, el, e) : false;
    }
    if (act.slice(0, 3) !== 'pt-') return prevExtra ? prevExtra(act, arg, el, e) : false;
    const c = st.cfg;
    switch (act) {
      case 'pt-type':
        if (TYPES.includes(arg)) c.type = arg;
        if (c.type === 'boss') c.tier = 3;
        break;
      case 'pt-tier':
        c.tier = c.type === 'boss' ? 3 : Math.max(1, Math.min(3, parseInt(arg, 10) || 1));
        break;
      case 'pt-kit':
        c.kit = arg === 'start' ? 'start' : 'tier';
        break;
      case 'pt-hero': {
        const [slot, i] = arg.split('|').map(Number);
        if (c.heroes[1 - slot] === i) c.heroes[1 - slot] = c.heroes[slot]; // picking the other slot's hero swaps them
        c.heroes[slot] = i;
        break;
      }
      case 'pt-again':
        if (st.last) Object.assign(c, st.last, { heroes: st.last.heroes.slice(), seed: String(st.last.seed) });
        break;
      case 'pt-rounds': {
        if (!T.ROUND_MODES.includes(arg)) break;
        st.rounds = arg;
        // Home's setup shows the same choice (src/ui/home.js): one way to play, set in either place
        const meta = T.loadMeta();
        meta.rounds = arg;
        T.saveMeta(meta);
        // the expedition under way changes too, when this screen is its host (online, the guests follow)
        const run = U.run;
        if (
          run &&
          run.party &&
          T.playerCount(run) >= 2 &&
          !run.over &&
          !(U.net && U.net.isGuest()) &&
          T.mayLead(run, U.seats)
        ) {
          T.execCommand(run, { op: 'rounds', mode: arg }, U.seats);
          T.saveRun(run);
          if (U.net && U.net.publish) U.net.publish();
        }
        U.toast(
          arg === 'live'
            ? 'All at once: everyone plays each round together.'
            : 'Take turns: one player at a time, in any order.',
        );
        break;
      }
      case 'pt-go':
        save();
        launch();
        return true;
      case 'pt-report':
        openReport();
        return true;
      case 'pt-plan':
        openPlan();
        return true;
      case 'pt-plan-play':
        playPlan();
        return true;
      case 'pt-copy':
        copy(reportText(), 'Report copied.');
        return true;
      case 'pt-save':
        if (U.run) copy(T.serializeRun(U.run), 'Save copied.');
        return true;
      case 'pt-clear':
        st.log = [];
        save();
        openReport();
        return true;
      default:
        return true;
    }
    save();
    U.render();
    return true;
  };
  // typing a seed must not redraw the panel under the cursor
  document.addEventListener('input', (e) => {
    if (!e.target || e.target.id !== 'pt-seed') return;
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    if (digits !== e.target.value) e.target.value = digits;
    st.cfg.seed = digits;
    save();
  });

  U.playtest = { NOTES, state: st, reportText, launch };
})(window.T);
