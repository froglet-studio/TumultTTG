/* ============================================================================
   TUMULT — STORY (data)
   The words between encounters: a passage after every stop, in two voices.
   The Terminal keeps the log (it is an interface, never a character); the
   pilots talk, each in the voice of their head clade, about what just
   happened to them. Playing should help Froglet hear who a pilot is
   (pillar 2), so the lines are about temperament, not lore.

   Tokens, filled by T.writePassage (src/engine/story.js):
     {A} {B}         the speaker and the other pilot
     {Aclade} {Bclade}  their head clades, as a word ("octopus")
     {FOE}           a foe from the stop just finished
     {PLACE}         the leg of the route the squad is on
     {THREAT}        what waits at the end of the route
     {ROUNDS}        how many rounds the stop took
   Nothing here invents canon: no named places, no named people.
   ========================================================================== */
(function (T) {
  /** Each clade's voice. Keys are situations; `reply` answers whatever the other pilot just said. */
  T.VOICES = {
    human: {
      win: ['"Again. Same plan, tighter." {A} is already writing it down.', '"That worked because we talked first," {A} says. "Remember that."'],
      close: ['{A} counts the bruises out loud, like inventory. "We can carry that."', '"Too close. My fault, I called it late."'],
      quiet: ['{A} sorts the kit by hand, one strap at a time, and does not say what they are thinking.', '"Tell me something true about where you grew up," {A} says to {B}.'],
      onward: ['"We plan for {THREAT}, not for hope," {A} says, and spreads the map.', '{A} looks ahead at {PLACE}. "We have done harder. Probably."'],
      reply: ['"Fair," {A} says.', '{A} nods, and makes a note of it.', '"Write that down," {A} says. "I mean it."'],
    },
    jerboa: {
      win: ['{A} is three rocks away before the dust settles. "Done? Done. Next."', '"Did you see me? Nobody saw me." {A} sounds delighted.'],
      close: ['{A} cannot stop moving, checking one exit, then another. "We were slow. I was slow."', '"Never stand still in a place like that," {A} says. "Never."'],
      quiet: ['{A} sleeps sitting up, ears turning at every sound.', '{A} drums a heel on the ground until {B} puts a hand on it.'],
      onward: ['"{PLACE}," {A} says, ears up. "Big, open, easy to cross. I like it already."', '"Shortest line to {THREAT}?" {A} is half out the door.'],
      reply: ['{A} is already somewhere else.', '"Sure, sure," {A} says, not listening, watching the ridge.', '{A} flicks an ear. It might be agreement.'],
    },
    hopper: {
      win: ['{A} cracks every joint in a long, satisfied ripple. "Good jump."', '"Bigger next time," {A} says. "Bigger is better."'],
      close: ['{A} picks a chip of their own shell out of the dirt and keeps it.', '"Shell holds," {A} says, tapping it. "Mostly."'],
      quiet: ['{A} hums, low and unbroken, a sound with a crowd in it.', 'At dusk {A} wanders off to sit with the long grass and comes back calmer.'],
      onward: ['"{PLACE}. Wide sky. Good for jumping," {A} says.', '{A} flexes both legs. "{THREAT} is not going to see us land."'],
      reply: ['{A} clicks, pleased.', '"Hah," {A} says. "Yes."', '{A} rubs two limbs together, thinking about it.'],
    },
    owl: {
      win: ['{A} turns their head all the way round, once, listening to the quiet. "Clear."', '"I heard it coming three moves out," {A} says. "You were faster than I needed."'],
      close: ['"I saw it a second too late," {A} says. "I don\'t like seconds."', '{A} sits very still for a long time after. Nobody asks.'],
      quiet: ['{A} keeps the night watch without being asked, and notices everything.', '"There is a sound out there I don\'t know yet," {A} says softly.'],
      onward: ['{A} looks at {PLACE} and goes silent, mapping it.', '"{THREAT} breathes," {A} says. "I can hear it from here."'],
      reply: ['{A} blinks, slowly.', '"Hm," {A} says, which from {A} is a speech.', '{A} tilts their head, considering {B}.'],
    },
    octopus: {
      win: ['{A} is somehow holding three things that were not theirs before the fight.', '"Of course it worked," {A} says, colours rippling smug. "I was being you for half of it."'],
      close: ['{A} goes grey all over, which is how you know.', '"I lost an arm back there," {A} says. "It\'ll grow. Still rude."'],
      quiet: ['{A} takes apart a lock nobody asked them to, just to see.', '{A} imitates {B} perfectly, for a minute, until {B} laughs.'],
      onward: ['{A} tastes the air of {PLACE} with the tip of an arm. "Salt. Iron. Something hiding."', '"{THREAT} has a weak spot," {A} says. "Everything does."'],
      reply: ['{A}\'s skin goes a doubtful brown.', '"Mm," {A} says, busy with something else, with several somethings.', '{A} flashes a quick stripe of yes.'],
    },
    gecko: {
      win: ['{A} licks one eye, which means satisfied.', '"Bit it. Held it. Done," {A} says.'],
      close: ['{A} dropped their tail back there and is pretending it does not matter.', '"I didn\'t let go," {A} says, as if that settles it.'],
      quiet: ['{A} sleeps upside down on the underside of the roof, and is offended when this is mentioned.', '{A} chirps at the dark, loud, until the dark goes quiet.'],
      onward: ['"Walls in {PLACE}?" {A} asks. "Good. More floor."', '{A} grips the nearest surface. "{THREAT} doesn\'t shake me off."'],
      reply: ['{A} barks once.', '"Yes," {A} says. "Obviously."', '{A} grips tighter, which might be agreement.'],
    },
    axolotl: {
      win: ['{A} smiles their permanent, faint smile. "Nobody lost anything that won\'t grow back."', '"See? Patience," {A} says.'],
      close: ['{A} looks at the wound with mild interest. "Give it a day."', '"Something in me woke up back there," {A} says quietly. "I put it back to sleep."'],
      quiet: ['{A} spends the evening with their feet in the coldest water they can find.', '"Rest is a skill," {A} tells {B}. "Practise it."'],
      onward: ['"{PLACE} will be slow," {A} says. "Slow suits me."', '{A}\'s gills flush. "{THREAT}. Well. We will see what grows."'],
      reply: ['{A}\'s gills flutter, amused.', '"Mm-hm," {A} says, unhurried.', '{A} lets it sink in.'],
    },
    eel: {
      win: ['A last spark crawls across {A}\'s skin and goes to ground. "Discharged."', '"Felt every one of them," {A} says. "The field\'s quiet now."'],
      close: ['{A} is still humming too high to touch. "Give me a minute. Then don\'t give me a minute."', '"I overspent," {A} says, flat. "Won\'t happen twice."'],
      quiet: ['{A} sits apart so the static does not bother anyone. It bothers them.', 'When the lamp fails, {A} lights the place with one hand, bored.'],
      onward: ['{A} reads {PLACE} through their skin. "Lot of charge in the ground here."', '"{THREAT}," {A} says, "has a pulse. I can find a pulse."'],
      reply: ['{A}\'s skin crackles once.', '"Noted," {A} says, crisp.', 'A small blue arc jumps from {A} to the ground. Probably agreement.'],
    },
    flytrap: {
      win: ['{A} closes slowly around the last of it. "Patience is a meal."', '"They walked into it," {A} says. "They always walk into it."'],
      close: ['{A} has a torn leaf and a short temper. "Next one comes to me."', '"I was rooted when I should have moved," {A} says. "I know."'],
      quiet: ['{A} turns their face to whatever light there is and does not move for an hour.', '{A} sets a little snare by the door, out of habit, and catches the rations.'],
      onward: ['"{PLACE}," {A} says. "Good soil? Bad soil. Fine."', '"Let {THREAT} come," {A} says. "I\'ll be where it needs to go."'],
      reply: ['{A} rustles.', '"Slowly," {A} says. "Slowly."', '{A} opens, a little, which is a kind of smile.'],
    },
    cordyceps: {
      win: ['Thin threads withdraw from the ground under {A}. "I know this place now."', '"It\'s all one network if you listen," {A} says. "Even them."'],
      close: ['{A} grows a little extra over the gash, pale and fine. "Patched."', '"Part of me is still back there," {A} says. "It\'ll find its way."'],
      quiet: ['{A} sends a fine thread out across the camp, touching everything, and pulls it back before anyone minds.', '"We\'re connected," {A} tells {B}, too seriously, and then laughs.'],
      onward: ['"There is something under {PLACE}," {A} says. "Old. Rooted."', '"{THREAT} is a body," {A} says. "Bodies can be got into."'],
      reply: ['A thread brushes {B}\'s sleeve, there and gone.', '"We agree," {A} says, meaning all of {A}.', '{A} takes it in, through more than ears.'],
    },
    tardigrade: {
      win: ['{A} did not notice most of the fight, and was in the middle of it.', '"Was that it?" {A} asks.'],
      close: ['{A} was nearly flat, and is now not, and sees no reason to discuss it.', '"I curled up," {A} says. "I came back. That\'s the trick."'],
      quiet: ['{A} sleeps like a stone, and nothing will wake them, and they wake right on time.', '{A} offers {B} the last ration without being asked.'],
      onward: ['"{PLACE}," {A} says. "Heavy? Cold? Fine."', '"{THREAT} can push," {A} says. "I don\'t move."'],
      reply: ['{A} does not move, approvingly.', '"Mm," {A} says, a long, slow sound.', '{A} shrugs, very slowly.'],
    },
    orangutan: {
      win: ['{A} sits back and peels something to eat, unhurried. "It went the way I thought it would."', '"You moved well," {A} tells {B}. "I watched."'],
      close: ['{A} turns a bruise toward the light and studies it, the way they study everything.', '"I waited one breath too long," {A} says. "Waiting is usually right. Not then."'],
      quiet: ['{A} builds a nest of folded cloth for the night, the same careful way each time.', '{A} takes {B}\'s broken buckle, says nothing, and hands it back mended.'],
      onward: ['{A} looks a long while at {PLACE} before saying anything. "Up. We go up."', '"{THREAT} is in a hurry," {A} says. "We are not."'],
      reply: ['{A} considers that for a long, comfortable time.', '"Mm. Yes," {A} says, eventually.', '{A} reaches over and pats {B}\'s shoulder, once.'],
    },
    lemur: {
      win: ['{A} sits up with arms spread to whatever sun there is. "Warm. Won. Good."', '"Did you hear me call it? I called it," {A} says, tail high.'],
      close: ['{A} is grooming the same patch of fur over and over. "Fine. I\'m fine."', '"Too cold back there," {A} says. "I fight badly cold."'],
      quiet: ['{A} curls against {B} for warmth without asking, and is asleep at once.', '{A} marks the doorway with their scent, so the place is theirs.'],
      onward: ['"Is there sun in {PLACE}?" {A} asks. "Tell me there is sun."', '{A}\'s tail goes straight up like a flag. "{THREAT}. Everybody stay together."'],
      reply: ['{A} chatters, agreeing loudly.', '"Yes, yes," {A} says, already leaning on {B}.', '{A} flicks the striped tail, once.'],
    },
    mandrill: {
      win: ['{A} bares every long tooth in a yawn that is not a yawn. "Mine."', '"They saw the colours and broke," {A} says. "Good."'],
      close: ['{A}\'s face has gone dull, which on {A} means bad.', '"I should have been in front," {A} says. "I am always in front."'],
      quiet: ['{A} sits at the edge of the light, facing out, between {B} and the dark.', '{A} lets {B} take the first share of food, and watches that nobody else does.'],
      onward: ['{A} walks ahead into {PLACE} as if it were already theirs.', '"{THREAT} will look at me first," {A} says. "Let it."'],
      reply: ['{A} grunts. It is a yes.', '"Hm," {A} says, and shows a tooth.', '{A} slaps the ground once, approving.'],
    },
    lynx: {
      win: ['{A} is already sitting somewhere high, watching the quiet. Nobody saw them get there.', '"One," {A} says. "That was all it needed."'],
      close: ['{A} licks a torn paw and says nothing at all.', '"I heard it late," {A} says, ear-tufts flat. "I do not hear things late."'],
      quiet: ['{A} sits at the edge of the camp in the cold and seems to prefer it.', '{A} turns their ears toward a sound nobody else can hear, and keeps them there.'],
      onward: ['{A} listens to {PLACE} for a long time. "It is not empty."', '"{THREAT} will not hear me," {A} says. "That is the whole plan."'],
      reply: ['{A}\'s ear-tufts turn toward {B}, then away.', '"Yes," {A} says, very quietly.', '{A} blinks once, slowly, which is a lot from {A}.'],
    },
    caracal: {
      win: ['{A} springs straight up for no reason and lands lightly. "Good."', '"Did you see how high?" {A} asks. "Higher than it."'],
      close: ['{A} paces in short, angry lines. "It kept low. I hate low."', '"I jumped early," {A} says. "Next time I wait."'],
      quiet: ['{A} bats at moths in the lamplight, missing none of them.', '{A} sleeps in a ball, ears still standing, black tips twitching.'],
      onward: ['"Anything flying in {PLACE}?" {A} asks, too hopefully.', '{A} crouches, rear end wiggling. "{THREAT}. Point me at it."'],
      reply: ['{A}\'s ears flick: yes.', '"Fine. Fine," {A} says, already crouching.', '{A} hisses, cheerfully.'],
    },
    ocelot: {
      win: ['{A} appears out of the shadows beside {B}, as if they had been there the whole time. "Done."', '"They never looked up," {A} says, pleased.'],
      close: ['{A} has gone very still and very dappled. It takes a while to find them.', '"Too much light," {A} says. "I need less light."'],
      quiet: ['{A} sleeps all afternoon in the branches and wakes at dusk, bright and chatty.', '{A} watches {B} cook with frank, unblinking interest.'],
      onward: ['"{PLACE} at night," {A} says. "Please. At night."', '{A} slips ahead into {PLACE} and is gone between one blink and the next.'],
      reply: ['{A} purrs, which is surprising.', '"Mm," {A} says, from somewhere.', '{A}\'s tail curls, considering.'],
    },
    tiger: {
      win: ['{A} stretches the whole long length of themselves and yawns. "Is that all of them?"', '"They heard me first," {A} says. "That is usually enough."'],
      close: ['{A} washes a wound in the nearest water and lets nobody near it.', '"I was too big for that place," {A} says. "I will be smaller next time. No. I will not."'],
      quiet: ['{A} lies half in the stream with only their head out, entirely at peace.', '{A} lets {B} lean against their side, as if allowing a favour.'],
      onward: ['{A} walks into {PLACE} without hurrying, which is somehow worse.', '"{THREAT}," {A} says, and the word comes out as a low rumble.'],
      reply: ['{A} chuffs, a soft, friendly sound.', '"Yes," {A} rumbles.', '{A} flicks one ear, unbothered.'],
    },
    cheetah: {
      win: ['{A} is breathing hard and grinning. "Again. Faster."', '"I was there before it knew I had left," {A} says.'],
      close: ['{A} lies flat, ribs heaving. "Too long. I can\'t run that long."', '"I needed a straight line," {A} says. "There wasn\'t one."'],
      quiet: ['{A} sits on the highest rock in camp, scanning the horizon until dark.', '{A} chirps at {B}, a small bird-sound that does not fit them at all.'],
      onward: ['"{PLACE}. Open?" {A} asks. "Tell me it is open."', '{A} is already on their toes. "{THREAT}. Let me run at it."'],
      reply: ['{A} chirps.', '"Yes, yes, go," {A} says.', '{A} is already looking at the horizon again.'],
    },
    fennec: {
      win: ['{A}\'s huge ears swivel, then settle. "That was the last one. I can hear it."', '"Small," {A} says, "is not the same as easy."'],
      close: ['{A} drinks almost nothing and pretends that was the plan.', '"Too loud," {A} says, ears flat. "Everything was too loud."'],
      quiet: ['{A} digs a neat little hollow beside the fire and curls into it.', '{A} listens to the ground for a while, smiling at whatever is under it.'],
      onward: ['"{PLACE} is hot and dry?" {A} asks. "Good. Mine, then."', '{A} tilts both ears toward {PLACE}. "{THREAT} is in there. I heard it breathe."'],
      reply: ['{A}\'s ears turn to {B}.', '"Mm-hm," {A} says brightly.', '{A} yips, once.'],
    },
    fox: {
      win: ['{A} trots back with their brush held high. "Told you it would work."', '"They went left," {A} says. "I knew they would go left."'],
      close: ['{A} licks a torn ear and grumbles. "That was not clever. That was lucky."', '"Somebody out-thought me," {A} says, offended.'],
      quiet: ['{A} pounces on a mouse in the grass, nose-first, and comes up proud.', '{A} has stolen {B}\'s spoon, and is wondering whether to give it back.'],
      onward: ['"There is always a back way into {PLACE}," {A} says. "Always."', '{A} grins. "{THREAT}. I have an idea, and you are going to hate it."'],
      reply: ['{A} grins with too many teeth.', '"Obviously," {A} says.', '{A}\'s tail swishes.'],
    },
    jackal: {
      win: ['{A} bumps shoulders with {B}. "Pair work. Told you."', '"We took it from two sides," {A} says. "Nothing likes two sides."'],
      close: ['{A} limps back on three legs and refuses to be carried.', '"I lost you for a moment," {A} says to {B}. "Don\'t do that."'],
      quiet: ['{A} trades a long howl with something far off, and seems satisfied with the answer.', '{A} sleeps back to back with {B}.'],
      onward: ['"You go round, I go through," {A} says, nodding at {PLACE}.', '"{THREAT} is one thing," {A} says. "We are two."'],
      reply: ['{A} yips.', '"With you," {A} says.', '{A} nudges {B}\'s arm with their nose.'],
    },
    coyote: {
      win: ['{A} laughs, a ragged, delighted sound. "It fell for that? It fell for that."', '"Never do the same trick twice," {A} says. "Except that one. That one works."'],
      close: ['{A} shakes off and grins anyway. "Learned something. Mostly about pain."', '"Plan B," {A} says. "I had a plan B, and a plan C, and it ate both."'],
      quiet: ['{A} eats whatever is in the pot, and then whatever is in the other pot.', '{A} sings, badly and at length, to nobody in particular.'],
      onward: ['"{PLACE}? I can live anywhere," {A} says.', '"{THREAT} is going to be so surprised," {A} says, and won\'t say by what.'],
      reply: ['{A} cackles.', '"Sure, sure," {A} says.', '{A} cocks their head, amused.'],
    },
    hyena: {
      win: ['{A} cracks something between their teeth that was not meant to crack. "Done."', '{A} whoops, and something far off whoops back.'],
      close: ['{A} keeps walking long after it should hurt too much to walk.', '"It ran," {A} says. "Things that run get tired. I do not."'],
      quiet: ['{A} gnaws on a bone nobody else would have kept.', '{A} giggles in their sleep, which unsettles everyone except {B}.'],
      onward: ['"{PLACE}," {A} says. "Long way. Fine. I walk."', '"{THREAT} will be tired by the end," {A} says. "I will not."'],
      reply: ['{A} giggles.', '"Hm," {A} says, chewing.', '{A} whoops softly.'],
    },
    otter: {
      win: ['{A} floats on their back, pleased with themselves. "That went well."', '"Teamwork," {A} says, and holds out a paw for {B} to hold.'],
      close: ['{A} grooms the same patch of fur over and over. "I got cold."', '"It cracked me," {A} says. "I am the one who cracks things."'],
      quiet: ['{A} has found a favourite stone and keeps it in a fold under their arm.', '{A} juggles three pebbles, very fast, for no one.'],
      onward: ['"Is there water in {PLACE}?" {A} asks. "Please say water."', '{A} taps a stone against their chest. "{THREAT} has a shell. Shells open."'],
      reply: ['{A} squeaks happily.', '"Yes! Yes," {A} says.', '{A} rolls over.'],
    },
    badger: {
      win: ['{A} sits back on their haunches, unhurried. "It should not have stayed."', '"I was not going to stop," {A} says. "It worked that out."'],
      close: ['{A} shakes off what should have stopped them and keeps going.', '"It bit me," {A} says. "It bit me. I do not care."'],
      quiet: ['{A} digs a hole, sleeps in it, and fills it in behind them in the morning.', '{A} raids a wild hive and comes back stung, sticky and pleased.'],
      onward: ['"I will go first into {PLACE}," {A} says. Nobody argues.', '"{THREAT}," {A} says. "Fine. It will learn."'],
      reply: ['{A} grunts.', '"Hm," {A} says.', '{A} does not move, which is agreement.'],
    },
    red_panda: {
      win: ['{A} stands up on their hind legs, arms wide, very pleased. "Ha!"', '"Up and down," {A} says. "Up and down, and it never found me."'],
      close: ['{A} wraps their tail around their face and declines to talk about it.', '"Too warm," {A} says. "I fight badly when it is warm."'],
      quiet: ['{A} naps on the highest branch in camp, limbs hanging down on either side.', '{A} eats bamboo, slowly, with total concentration.'],
      onward: ['"Trees in {PLACE}?" {A} asks hopefully.', '{A} rears up to look bigger. "{THREAT}. I am ready."'],
      reply: ['{A} squeaks.', '"Okay," {A} says, from a branch.', '{A} curls their tail around {B}\'s ankle.'],
    },
    walrus: {
      win: ['{A} settles their whole weight down on the warm ground and sighs. "Good."', '"It moved," {A} says. "I did not. That is how it goes."'],
      close: ['{A} lies very still, breathing slow and deep, until the shaking stops.', '"Too many of them, too fast," {A} grumbles through their whiskers.'],
      quiet: ['{A} sleeps in a heap against {B}, snoring like a storm.', '{A} combs the ground with their whiskers, looking for something only they understand.'],
      onward: ['"{PLACE}," {A} says. "Is it cold? Good."', '{A} sets their tusks. "{THREAT} can try to move me."'],
      reply: ['{A} grunts, deep and loud.', '"Mm," {A} rumbles.', '{A} bellows, happily.'],
    },
    orca: {
      win: ['{A} circles back to {B}, grinning. "That is how a pod does it."', '"We drove it into the corner," {A} says. "We, not me."'],
      close: ['{A} goes quiet and won\'t sing, which worries everyone.', '"It knew our plan," {A} says, unsettled. "Things do not usually know our plan."'],
      quiet: ['{A} teaches {B} a whistle, then a second, then a sentence.', '{A} hums, a long falling note, and stares at the dark.'],
      onward: ['"{PLACE}. We go in together," {A} says.', '"{THREAT} hunts alone," {A} says. "That is its mistake."'],
      reply: ['{A} clicks, approving.', '"Together," {A} says.', '{A} whistles a short phrase back.'],
    },
    narwhal: {
      win: ['{A} tilts their head as if listening to something under the floor. "It is quiet now."', '"I felt it come," {A} says. "So I was not there."'],
      close: ['{A} is pale even for {A}, and very still.', '"The water lied to me," {A} says softly. "It does not do that."'],
      quiet: ['{A} sits alone by the cold edge of camp and seems content there.', '{A} lets {B} touch the spiral of their tusk, once.'],
      onward: ['"{PLACE}," {A} says. "There will be a way through. There always is."', '{A} turns their tusk toward the dark. "{THREAT}. I can feel it from here."'],
      reply: ['{A} nods, slowly.', '"Yes," {A} says, from far away.', '{A} hums, very low.'],
    },
    yak: {
      win: ['{A} breathes out a long cloud of steam. "Up, and over. Good."', '"It tired before I did," {A} says. "They always do, up here."'],
      close: ['{A} lies down where they stand and will not move for an hour.', '"Heavy day," {A} says, and nothing more.'],
      quiet: ['{A} lets {B} lean into their shaggy side against the wind.', '{A} chews slowly, watching the far peaks go pink.'],
      onward: ['"Is {PLACE} high?" {A} asks. "Then I go first."', '"{THREAT}," {A} says. "One step, then the next. Same as any mountain."'],
      reply: ['{A} grunts, a low, contented sound.', '"Mm," {A} says.', '{A} flicks an ear.'],
    },
    bison: {
      win: ['{A} shakes the dust out of their great shaggy head. "Again, if it wants."', '"It got out of my way," {A} says. "Eventually."'],
      close: ['{A} rolls in the dirt for a long time, as if to rub the fight off.', '"I faced it," {A} says. "That is the whole of it. I faced it."'],
      quiet: ['{A} stands facing the wind, the way they always do.', '{A} rumbles at {B}, which seems to be a joke.'],
      onward: ['"Into {PLACE}," {A} says. "Straight in. Through the storm, not round it."', '{A} lowers their head. "{THREAT}. Good."'],
      reply: ['{A} snorts.', '"Yes," {A} rumbles.', '{A} paws the ground once.'],
    },
    oryx: {
      win: ['{A} stands very straight, horns catching the light. "Finished."', '"I kept my distance," {A} says. "It never got close enough to matter."'],
      close: ['{A} rests in the shade without drinking and says they are fine.', '"Too long in the open," {A} says. "Even I can thirst."'],
      quiet: ['{A} licks the dew off a stone at dawn, perfectly content.', '{A} watches the heat-shimmer on the horizon as if reading it.'],
      onward: ['"{PLACE} is dry?" {A} asks. "Then I know how to cross it."', '"{THREAT}," {A} says, and points both long horns that way.'],
      reply: ['{A} dips their horns.', '"Agreed," {A} says.', '{A} looks at {B} steadily.'],
    },
    ram: {
      win: ['{A} shakes their head as if to clear a ringing. "That one I felt. Good."', '"Head first," {A} says. "It is the only way I know."'],
      close: ['{A} sits at the top of the highest rock and refuses help getting down.', '"It hit back," {A} says, offended. "Things don\'t hit back."'],
      quiet: ['{A} climbs something nobody else could climb, just to sit on it.', '{A} butts {B}\'s shoulder, gently, as a greeting.'],
      onward: ['"Cliffs in {PLACE}?" {A} asks. "Please."', '{A} lowers their curled horns. "{THREAT}. Let me knock."'],
      reply: ['{A} stamps.', '"Ha," {A} says.', '{A} tosses their horns.'],
    },
    moose: {
      win: ['{A} wades into the nearest water up to their shoulders and closes their eyes. "Done."', '"It thought I was slow," {A} says. "I am not slow."'],
      close: ['{A} stands in the shallows a long time, alone, which is how they like it.', '"I stood my ground," {A} says. "The ground did not stand with me."'],
      quiet: ['{A} dunks their whole head underwater and comes up chewing weed.', '{A} lets {B} sit nearby without comment, which is a great honour.'],
      onward: ['"Water in {PLACE}?" {A} asks. "Then I will be fine."', '"{THREAT}," {A} says. "I will wait for it to come to me."'],
      reply: ['{A} grunts.', '"Hm," {A} says, from the lake.', '{A} swings their great head round to look.'],
    },
    deer: {
      win: ['{A} is back beside {B} before anyone saw them leave. "Is it over?"', '"I was gone before it turned," {A} says, a little breathless.'],
      close: ['{A} trembles for a while, ears swivelling at every sound.', '"I heard it too late," {A} says. "I never hear things too late."'],
      quiet: ['{A} sleeps lightly at the edge of the light, ears never quite still.', '{A} nibbles at the green shoots by camp, delicately.'],
      onward: ['"I\'ll listen ahead in {PLACE}," {A} says.', '{A}\'s ears turn toward {PLACE}. "{THREAT} is there. It is breathing."'],
      reply: ['{A}\'s ears flick toward {B}.', '"Yes," {A} says softly.', '{A} stamps a forefoot, once.'],
    },
    zebra: {
      win: ['{A} kicks up their heels and brays at the sky. "Together! See?"', '"It could not tell which of us was which," {A} says, delighted.'],
      close: ['{A} nips at {B}\'s shoulder, worried, then pretends they didn\'t.', '"Never alone," {A} says. "I was alone for a moment. I hated it."'],
      quiet: ['{A} grooms {B}\'s hair with their teeth, whether {B} wants it or not.', '{A} stands nose to tail with {B}, swishing flies off both of you.'],
      onward: ['"{PLACE}," {A} says. "We go as a herd, or not at all."', '"{THREAT}," {A} says. "Let it try to pick one of us out."'],
      reply: ['{A} brays.', '"Together," {A} says.', '{A} flicks their tail.'],
    },
  };

  /** The Terminal's log lines, by situation. Plain, procedural, a little dry; never a character. */
  T.TERMINAL_LOG = {
    start: ['LOG OPEN. Squad of two. Destination: {THREAT}. Survival is not guaranteed and is not tracked.', 'LOG OPEN. Two pilots registered. Route assigned. The Terminal will observe.'],
    win: ['LOG: stop cleared in {ROUNDS} rounds. Both pilots standing.', 'LOG: hostile presence reduced. {FOE} recorded as encountered.', 'LOG: objective complete. Filed.'],
    close: ['LOG: stop cleared in {ROUNDS} rounds. Medical attention advised. Not provided.', 'LOG: objective complete. Injuries recorded. Squad continues.'],
    loss: ['LOG: objective failed. Squad recovered. The route continues without reward.', 'LOG: failure recorded. Lifeline spent.'],
    haven: ['LOG: rest stop. Repairs available at standard rates.', 'LOG: safe ground. No hostiles registered.'],
    event: ['LOG: encounter off the route. Outcome filed.', 'LOG: unscheduled stop. Noted.'],
    leg: ['LOG: entering {PLACE}. Conditions: unknown.', 'LOG: leg complete. Next: {PLACE}.'],
    finale: ['LOG: {THREAT} is one stop ahead. The Terminal has no advice.', 'LOG: final approach. All logs will be kept.'],
  };

  /** Scenes for passages (keys of T.ART), by situation; one is picked each time. */
  T.PASSAGE_SCENES = {
    start: ['scene/ENSIGN', 'scene/WINGMAN', 'scene/SPARE07'],
    win: ['scene/TALON', 'scene/ANVIL', 'scene/MASON', 'scene/TOMAHAWK', 'scene/TENACIOUS'],
    close: ['scene/HORNET', 'scene/SPARE08', 'scene/STRIDER', 'scene/KRUSH'],
    loss: ['scene/SPARE02', 'scene/LONGSHIFT', 'scene/SPARE08'],
    haven: ['scene/CITADEL', 'scene/SIPHON', 'scene/SPARE04', 'scene/ECHO'],
    event: ['scene/OPAL', 'scene/SCALES', 'scene/MANGER', 'scene/DAMSEL'],
    leg: ['scene/JUGGER', 'scene/RIPTIDE', 'scene/SPARE06', 'scene/NEEDLE'],
    finale: ['scene/ZODIAC', 'scene/SPARE05', 'scene/FLUX'],
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
