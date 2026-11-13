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
