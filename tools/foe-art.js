'use strict';
/**
 * Paintings of the creatures of Tumult (assets/foe-art/<type>.webp, drawn by U.foeArt in src/ui/fauna.js).
 * Each kind of foe is one triple hybrid of T.ENEMIES[type].clades, painted as a single beast, never its three
 * animals side by side (Garrett, 2026-11-24). Generated in Figma Weave (Nano Banana 2, 512 px, 1:1) from the
 * prompts below, then resized to 256 px webp.
 *
 *   node tools/foe-art.js prompt brute     the prompt a painting was made from
 *   node tools/foe-art.js missing          creature kinds with clades and no painting yet
 */
const fs = require('fs');
const path = require('path');
const STYLE = (body, role) =>
  `A single creature of the alien planet Tumult, painted as one trading-card monster portrait. It is ONE seamless hybrid animal, ${body} The three animals are fused into one plausible body, not three animals side by side and not a collage; no part looks like a whole earth animal. Its pose shows its role: ${role} ` +
  `The whole creature fits inside a centered circle with a little room around it, three-quarter view, filling most of the frame. Background: dark violet-navy alien rock with faint glowing crystal veins, softly out of focus. Rich semi-realistic painting, dramatic rim light, deep shadow, saturated but dark, menacing. ` +
  `Absolutely no text, letters, numbers, labels, frames, borders or UI anywhere in the image. Only one creature.`;
const PROMPTS = {
  biter: STYLE(
    'the size of a hound: a lean rodent body with a long naked tail and twitching whiskers, the long armoured snout and interlocking teeth of a crocodile, and a glossy black-green beetle carapace split down its back with scuttling beetle legs at the shoulders.',
    'a swarm hunter lunging forward, jaws wide, about to bite.',
  ),
  stinger: STYLE(
    'small and hovering: the iridescent blurred wings and needle beak of a hummingbird, the segmented arched tail and venom stinger of a scorpion, and the striped venomous fan-spines of a lionfish flaring from its body.',
    'it hangs in the air at a distance, tail cocked, aiming a glowing venom sting.',
  ),
  brute: STYLE(
    'huge and hulking: the shaggy humped shoulders and curved horns of a bison, the great ivory tusks, whiskered muzzle and thick wrinkled blubber hide of a walrus, and the long muscular knuckle-walking arms and blue-and-red ridged face colours of a mandrill.',
    'a slow bruiser rearing up to slam a massive fist into the ground, dust and rock flying.',
  ),
  kiter: STYLE(
    'lean and fast: the spotted tawny body, long legs and tear-marked face of a cheetah, a crown and back of long black-and-white porcupine quills, and the armoured rainbow forearms and stalked eyes of a mantis shrimp.',
    'a skirmisher springing backward mid-retreat while flicking a volley of quills toward the viewer.',
  ),
  warden: STYLE(
    'massive and immovable: the domed, ancient, mossy shell and stumpy legs of a giant tortoise, overlapping bronze pangolin scales armouring its neck and tail, and a broad crown of moose antlers like a shield wall.',
    'a guardian planted on a rock pedestal like a statue, braced, antlers lowered to cleave anything that comes close.',
  ),
  lurker: STYLE(
    'sleek and half-hidden: the colour-shifting skin and curling tail of a chameleon, the tufted ears, short tail and powerful pouncing body of a lynx, and suckered octopus tentacles in place of a mane and along its belly.',
    'an ambusher half-dissolved into the rocks by camouflage, coiled to pounce from the shadows.',
  ),
  binder: STYLE(
    'rooted and creeping: the hinged, toothed, red-mouthed traps of a venus flytrap opening along its back, a slick dark eel body that writhes like a vine, and pale cordyceps fungus stalks and threads sprouting from it and spreading like a web over the ground.',
    'a controller lashing out fungal threads that bind and root its prey while it drains them.',
  ),
  bulwark: STYLE(
    'a walking fortress: the banded armour plates of an armadillo rolled over its back, the heavy spiralled horns of a ram, and huge red-black lobster crushing claws and jointed shell legs.',
    'an elite shield-bearer stamping the ground so it quakes, claws raised to crush.',
  ),
  harrier: STYLE(
    'sleek and deadly: the long spiral ivory tusk and mottled grey skin of a narwhal used as a lance, the broad barred wings and talons of a red-tailed hawk, and the folded raptorial forelegs of a praying mantis.',
    'an elite striker blinking out of a shimmer of light, diving lance-first across the gap.',
  ),
  tidecaller: STYLE(
    'fluid and regal: the black-and-white body and tall dorsal fin of an orca, the curling prehensile tail and armoured ridged snout of a seahorse, and translucent glowing jellyfish bell and trailing tentacles flowing from it like robes.',
    'an elite sea-caller rising in a swirl of water, pulling a wave toward itself with its tentacles.',
  ),
};

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'prompt' && PROMPTS[arg]) console.log(PROMPTS[arg]);
else if (cmd === 'missing') {
  require('./load.js')();
  const dir = path.join(__dirname, '..', 'assets', 'foe-art');
  const gone = Object.keys(T.ENEMIES).filter((k) => T.ENEMIES[k].clades && !fs.existsSync(path.join(dir, k + '.webp')));
  console.log(gone.length ? gone.join('\n') : 'every creature kind is painted');
} else console.log('usage: node tools/foe-art.js prompt <type> | missing');
