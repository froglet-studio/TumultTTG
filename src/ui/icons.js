/* ============================================================================
   TUMULT — ICONS (browser only)
   One drawn pictogram for every thing the game used to show as an emoji:
   mission kinds, foes, events, boons, gear, consumables, basic actions,
   clades and the etherions. Drawn in Cosmic Shore's icon language: flat
   filled silhouettes, angular (mitred, no rounded corners), a cut rather
   than a stroke, at most three shapes, one colour (currentColor) — the
   interface tints by state, never by baking colour into the icon.
   Every shape is on a 24-unit grid. The data keeps its emoji `icon`/`glyph`
   for text (logs, the tabletop sheets); the screen asks U.ic(key) and falls
   back to that emoji when a key has no drawing, so nothing ever goes blank.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});

  // Shapes are SVG path data; a list draws several paths (evenodd, so an inner ring cuts a hole).
  const P = {
    /* ── the etherions ── */
    // The element symbols are Cosmic Shore's element petals (froglet-studio/cosmic-shore, MIT,
    // Assets/Resources/ElementPetals/*_petal.png), traced to paths so Hypersea games share one set (2.29).
    'el.M': 'M1 19.6 12 4.4 23 19.6z', // Mass: a triangle
    'el.C': 'M1 7.9 5 1h14l4 6.9L12.1 23z', // Charge: a cut gem
    'el.S': 'M1.7 8.5 12.1 1l10.2 7.5L12.1 23z', // Space: a kite
    'el.T': 'M3.9 12.1 12.1 1l8 11.1-8 10.9z', // Time: a tall diamond
    // Omni is Cosmic Shore's omnicrystal (Assets/_Graphics/ElementIcons/OmniCrystal_Active.png), redrawn on the grid:
    // a pentagon, five rhombi off its corners and five points beyond the cut squares on its sides (2.40).
    'el.O':
      'M12 7.98 15.64 10.62 14.25 14.90 9.75 14.90 8.36 10.62zM14.64 4.34 18.76 2.51 18.28 6.98zM19.92 12.02 22.93 15.36 18.53 16.29zM14.25 19.40 12 23.30 9.75 19.40zM5.47 16.29 1.07 15.36 4.08 12.02zM5.72 6.98 5.24 2.51 9.36 4.34zM12 7.98 9.36 4.34 12 0.70 14.64 4.34zM15.64 10.62 18.28 6.98 22.56 8.38 19.92 12.02zM14.25 14.90 18.53 16.29 18.53 20.79 14.25 19.40zM9.75 14.90 9.75 19.40 5.47 20.79 5.47 16.29zM8.36 10.62 4.08 12.02 1.44 8.38 5.72 6.98z',
    crystal: 'M12 1 20 9 12 23 4 9zM12 4.5 7.2 9 12 18.6 16.8 9z', // an omnicrystal (the currency)
    ap: 'M4 4h16v16H4zM8 8v8h8V8z',

    /* ── mission kinds on the route ── */
    'node.swarm': ['M3 8l4-3 4 3-4 3z', 'M13 8l4-3 4 3-4 3z', 'M8 16l4-3 4 3-4 3z'], // a scatter of small things
    'node.vault': 'M2 9 12 3l10 6v2H2zM4 12h3v7H4zM10.5 12h3v7h-3zM17 12h3v7h-3zM2 20h20v2H2z', // a held structure
    'node.cascade':
      'M2 6c4-3 6 3 10 0s6 3 10 0v4c-4 3-6-3-10 0S6 7 2 10zM2 14c4-3 6 3 10 0s6 3 10 0v4c-4 3-6-3-10 0s-6-3-10 0z', // water that runs
    'node.salvage': 'M3 8h18v13H3zM3 8l3-5h12l3 5M9 12h6v2H9z', // a crate, lid open
    'node.survey': 'M5 2h2v17H5zM7 3h11l-3 4 3 4H7zM2 20h20v2H2z', // a flag planted in the ground
    'node.hidden':
      'M10 2a8 8 0 1 0 4.9 14.3L21 22.4l1.4-1.4-6.1-6.1A8 8 0 0 0 10 2zm0 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10z', // a lens
    'node.elite': 'M4 2h4l4 6 4-6h4l-6 9 6 11h-4l-4-7-4 7H4l6-11z', // crossed blades, read as one mark
    'node.haven': 'M12 2 22 9v13H2V9zM9 14v8h6v-8z', // a shelter with a door
    'node.event': 'M12 2 22 12 12 22 2 12zM11 6v8h2V6zm0 10v2h2v-2z', // a sign
    'node.boss': 'M12 21 3 12V6l4-4 5 4 5-4 4 4v6zM12 9l-3 3 3 3 3-3z', // the knot at the end of the route
    'node.passage': 'M3 21 10 3h4l7 18h-4l-5-13-5 13z',

    /* ── objectives on the board ── */
    'obj.vault': 'M2 9 12 3l10 6v2H2zM4 12h3v7H4zM10.5 12h3v7h-3zM17 12h3v7h-3zM2 20h20v2H2z',
    'obj.lever': 'M15 2l3 2-5 9h-2zM4 14h16v8H4zM8 17v2h8v-2z',
    'obj.beacon': 'M11 8h2v14h-2zM6 4l2 2a6 6 0 0 0 0 8l-2 2A9 9 0 0 1 6 4zm12 0a9 9 0 0 1 0 12l-2-2a6 6 0 0 0 0-8z',
    'obj.cache': 'M2 7h20v4H2zM3 12h18v10H3zM10 12v4h4v-4z',
    'obj.crate': 'M3 6h18v15H3zM3 6l9 5 9-5M12 11v10', // a lashed crate
    'obj.mark': 'M5 2h2v20H5zM7 3h12l-3 4 3 4H7z', // a survey flag
    'obj.veiled':
      'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM11 7h2v6h-2zm0 8h2v2h-2z', // unsighted
    'obj.dock':
      'M11 2h2v3h3v2h-3v11a5 5 0 0 0 4-3l-2-1 4-2 1 4-1-.5A8 8 0 0 1 12 22a8 8 0 0 1-7-4.5L4 18l1-4 4 2-2 1a5 5 0 0 0 4 3V7H8V5h3z', // an anchor: set it down here
    'obj.valve': 'M11 2h2v4h5v2h-5v2.2a4 4 0 1 1-2 0V8H6V6h5zM5 20h14v2H5z',

    /* ── foes ── */
    'enemy.biter': 'M3 6h18l-3 5 3 2-9 9-9-9 3-2zM7 9l2 3 2-3zm6 0 2 3 2-3z', // jaws
    'enemy.stinger': 'M2 22 14 10l-2-2 9-6-6 9-2-2L3 21z', // a sting
    'enemy.brute': 'M4 6h16l2 5-3 11H5L2 11zM7 10v3h3v-3zm7 0v3h3v-3z', // a heavy brow
    'enemy.kiter': 'M3 12 13 4v5h8v6h-8v5z', // a shot, released
    'enemy.warden': 'M5 2h14v8l-7 12-7-12zM9 6v4l3 5 3-5V6z', // a standing stone
    'enemy.lurker': 'M2 12c3-5 7-7 10-7s7 2 10 7c-3 5-7 7-10 7S5 17 2 12zm10-3-3 3 3 3 3-3z', // an eye half-shut
    'enemy.binder':
      'M12 1 23 12 12 23 1 12zM12 4.5 4.5 12l7.5 7.5 7.5-7.5zM12 7l5 5-5 5-5-5zM12 9.5 9.5 12l2.5 2.5 2.5-2.5z', // a web
    'enemy.spawner': 'M12 2 20 7v10l-8 5-8-5V7zm-3 6v3h3V8zm3 5v3h3v-3z', // a pod with cells
    'enemy.bulwark': 'M12 1 21 4v8c0 5-4 9-9 11-5-2-9-6-9-11V4zm0 4L7 6.5V12c0 3 2 5.5 5 7z', // a shield
    'enemy.harrier': 'M2 4h5l15 15-3 3L4 7zM16 2l6 6-2 2-6-6z', // a blade
    'enemy.tidecaller': 'M12 2 16 8h-3v3c3 0 6 2 9 5v4c-3-3-6-5-9-5v7h-2v-7c-3 0-6 2-9 5v-4c3-3 6-5 9-5V8H8z', // a trident in a wave
    'enemy.heart': 'M12 21 3 12V6l4-4 5 4 5-4 4 4v6zM12 9l-3 3 3 3 3-3z', // the Heart

    /* ── events ── */
    'event.beacon': 'M11 8h2v14h-2zM6 4l2 2a6 6 0 0 0 0 8l-2 2A9 9 0 0 1 6 4zm12 0a9 9 0 0 1 0 12l-2-2a6 6 0 0 0 0-8z', // a relay
    'event.toll': 'M4 2h2v20H4zM7 3h13l-3 5 3 5H7z', // a flag across the way
    'event.storm': 'M6 4h12l4 5-4 4H6L2 9zM9 14h4l-2 3h3l-5 6 1-4H7z', // a front with a bolt
    'event.bloom': 'M12 2 15 9l7 3-7 3-3 7-3-7-7-3 7-3zm0 7-1.5 3 1.5 3 1.5-3z', // a flower of etherion
    'event.guide': 'M12 2c5 0 8 3 8 7 0 3-2 5-4 6l-2 3h-4l-2-3c-2-1-4-3-4-6 0-4 3-7 8-7zM9 20h6v2H9z', // a balloon
    'event.cache': 'M2 7h20v4H2zM3 12h18v10H3zM10 12v4h4v-4z', // a crate
    'event.shrine': 'M11 2h2l2 5h-6zM8 8h8v14H8zM4 22h16v-2H4z', // a candle-stone
    'event.mirror': 'M12 2c4 0 7 4 7 9s-3 9-7 9-7-4-7-9 3-9 7-9zm0 3c-2 0-4 3-4 6s2 6 4 6zM9 21h6v2H9z', // a still pool
    'event.envoy': 'M3 8h18v13H3zM8 4h8v4h-2V6h-4v2H8zM3 12h18v2H3z', // a case
    'event.molt': 'M12 2c6 0 10 4 10 9 0 6-5 11-10 11V2zM10 4v18C5 21 2 17 2 12c0-4 3-7 8-8z', // a shell, split
    'event.audit': 'M11 2h2v3h7l2 7c0 2-2 3-4 3s-4-1-4-3l2-6h-3v14h4v2H7v-2h4V6H8l2 6c0 2-2 3-4 3s-4-1-4-3l2-7h7z', // scales
    'event.quiet': 'M14 2a10 10 0 1 0 8 15A8 8 0 0 1 14 2z', // a crescent

    /* ── gear ── */
    'gear.grapnel': 'M11 2h2v12l4-3v-3h2v4l-6 6v4h-2v-4l-6-6V8h2v3l4 3z',
    'gear.scope': 'M2 14 16 4l2 4L5 18zM17 9l3-1 2 4-3 2zM8 16v6h2v-7z',
    'gear.capacitor': 'M7 4h10v18H7zM10 1h4v3h-4zM13 7l-3 6h3l-2 6 4-7h-3l2-5z',
    'gear.phasebrace': 'M12 2a10 10 0 1 0 10 10h-3a7 7 0 1 1-7-7zM15 2h7v7z',
    'gear.chronoshim':
      'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm-1 2v6l5 3 1-2-4-2V7z',
    'gear.aegis': 'M12 1 21 4v8c0 5-4 9-9 11-5-2-9-6-9-11V4z',
    'gear.lantern': 'M9 2h6v3h2v3l-1 1v10l1 1v3H7v-3l1-1V9L7 8V5h2zM11 11v6h2v-6z',
    'gear.harpoon': 'M2 20 16 6l-2-2 8-2-2 8-2-2L4 22z',
    'gear.climbrig': 'M5 2h3v20H5zM16 2h3v20h-3zM8 5h8v2H8zM8 11h8v2H8zM8 17h8v2H8z',
    'gear.medkit': 'M3 6h18v15H3zM9 3h6v3h-2V5h-2v1H9zM11 9v3H8v3h3v3h2v-3h3v-3h-3V9z',

    /* ── consumables ── */
    'cons.vial': 'M9 2h6v2h-1v5l6 11v2H4v-2l6-11V4H9zM8 16l-2 4h12l-2-4z',
    'cons.shard': 'M12 1 19 8 13 23 5 8zM12 5 9 8l3 9 3-9z',
    'cons.charm': 'M12 2 20 8v8l-8 6-8-6V8zM12 7l-4 3v4l4 3 4-3v-4z',
    'cons.flash': 'M12 1l2 8 8 3-8 3-2 8-2-8-8-3 8-3z',
    'cons.grit': 'M3 14 8 7l6 2 7 5-3 7H6z',

    /* ── boons ── */
    'boon.tidetouched':
      'M2 8c4-3 6 3 10 0s6 3 10 0v4c-4 3-6-3-10 0s-6-3-10 0zM2 15c4-3 6 3 10 0s6 3 10 0v4c-4 3-6-3-10 0s-6-3-10 0z',
    'boon.thickhide': 'M12 2 21 7v10l-9 5-9-5V7zM12 6 7 9v6l5 3 5-3V9z',
    'boon.keensense': 'M2 12c3-5 7-7 10-7s7 2 10 7c-3 5-7 7-10 7S5 17 2 12zm10-4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'boon.deeppockets': 'M4 4h16v6c0 6-4 11-8 12-4-1-8-6-8-12zM9 9l3 6 3-6z',
    'boon.studious': 'M2 4h8l2 2 2-2h8v16h-8l-2 2-2-2H2zM11 8v11h2V8z',
    'boon.secondwind': 'M12 2 15 9h7l-6 5 2 8-6-5-6 5 2-8-6-5h7z',
    'boon.momentum': 'M2 6h7l6 6-6 6H2l6-6zm9 0h4l6 6-6 6h-4l6-6z',
    'boon.anchorsoul':
      'M11 2h2v3h3v2h-3v12c3 0 5-2 6-5l-2-1 4-2 1 5-1-1c-1 4-5 7-9 7s-8-3-9-7l-1 1 1-5 4 2-2 1c1 3 3 5 6 5V7H8V5h3z',
    'boon.quickhands': 'M4 10h3V4h2v6h2V2h2v8h2V4h2v8l3-2 1 2-6 10H8L4 14z',
    'boon.omnicore': 'M12 1 15 9 23 12 15 15 12 23 9 15 1 12 9 9z',
    'boon.defiant': 'M12 1c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 3 1 4 2 4-1-4 1-7 1-10z',

    /* ── basic actions ── */
    'basic.strike': 'M2 4h5l15 15-3 3L4 7z',
    'basic.shove': 'M2 9h11V4l9 8-9 8v-5H2z',
    'basic.brace': 'M12 1 21 4v8c0 5-4 9-9 11-5-2-9-6-9-11V4z',
    'basic.spot':
      'M11 1h2v4h-2zM11 19h2v4h-2zM1 11h4v2H1zM19 11h4v2h-4zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', // a sight on a foe
    'basic.legup': 'M12 2 20 10h-5v6H9v-6H4zM4 19h16v3H4z', // a boost up
    'basic.lend': 'M3 7h13V3l6 6-6 6v-4H3zM21 17H8v4l-6-6 6-6v4h13z', // passed across
    'basic.arc': 'M14 1 5 13h6l-2 10 10-13h-6z',
    'basic.reach':
      'M10 2h4v3l3 1 2-2 3 3-2 2 1 3h3v4h-3l-1 3 2 2-3 3-2-2-3 1v3h-4v-3l-3-1-2 2-3-3 2-2-1-3H1v-4h3l1-3-2-2 3-3 2 2 3-1zm2 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    'basic.scramble': 'M2 20h6v-6h6V8h4V4l5 6-5 6v-4h-2v6h-6v6H2z',

    /* ── what a card face does, for the art on ability cards (2.41) ── */
    'verb.pull': 'M22 9H11V4l-9 8 9 8v-5h11z', // drawn in
    'verb.weaken': 'M10 2h4v11h5l-7 9-7-9h5z', // brought down
    'verb.dice': 'M12 1 22 6.5v11L12 23 2 17.5v-11zM12 6l-5.5 9.5h11z', // a die, rolled again

    /* ── clades ── */
    // The painted pilots' clades (2.42–2.66), drawn in the same language: a side or front silhouette, cuts for eyes and markings.
    'clade.orangutan': [
      'M2 7 7 3 17 3 22 7 22 11 17 14 7 14 2 11zM7.8 8.5 9 7.3 10.2 8.5 9 9.7zM13.8 8.5 15 7.3 16.2 8.5 15 9.7z',
      'M5 15 19 15 23 23 19 23 17 19 7 19 5 23 1 23z',
    ],
    'clade.lemur': [
      'M9 5 10 2 12 4 14 4 16 2 17 5 16 9 13 11 10 9zM10.6 6.5 11.5 5.6 12.4 6.5 11.5 7.4zM13.6 6.5 14.5 5.6 15.4 6.5 14.5 7.4z',
      'M10 11 16 11 17 19 9 19z',
      'M9 17 3 15 1 9 2 4 4 4 3 9 5 13 9 14zM1.4 7 2.6 7 4.6 7 3.4 7zM2 11 3.2 11 5.2 11 4 11z',
    ],
    'clade.mandrill':
      'M4 4 8 1 16 1 20 4 19 10 15 13 15 21 12 23 9 21 9 13 5 10zM7.8 6 9 4.8 10.2 6 9 7.2zM13.8 6 15 4.8 16.2 6 15 7.2zM9.9 11 11.1 11 11.1 19 9.9 19zM12.9 11 14.1 11 14.1 19 12.9 19z',
    'clade.lynx':
      'M4 1 5 1 9 8 15 8 19 1 20 1 20 12 23 15 19 16 12 22 5 16 1 15 4 12zM7.3 12 8.5 10.8 9.7 12 8.5 13.2zM14.3 12 15.5 10.8 16.7 12 15.5 13.2z',
    'clade.caracal':
      'M4 0.5 10 9 14 9 20 0.5 20 14 12 22 4 14zM7.3 13 8.5 11.8 9.7 13 8.5 14.2zM14.3 13 15.5 11.8 16.7 13 15.5 14.2z',
    'clade.ocelot':
      'M3 3 8 8 16 8 21 3 21 14 12 22 3 14zM7.3 12 8.5 10.8 9.7 12 8.5 13.2zM14.3 12 15.5 10.8 16.7 12 15.5 13.2zM11 9 13 9 13 10.5 11 10.5zM6 15 7.5 15 7.5 16.5 6 16.5zM16.5 15 18 15 18 16.5 16.5 16.5z',
    'clade.tiger':
      'M2 4 7 7 17 7 22 4 22 15 12 22 2 15zM7.3 12 8.5 10.8 9.7 12 8.5 13.2zM14.3 12 15.5 10.8 16.7 12 15.5 13.2zM11.4 8 12.6 8 12.6 11 11.4 11zM3.5 10 4.5 10 6.5 11 5.5 11zM19.5 10 20.5 10 18.5 11 17.5 11z',
    'clade.cheetah':
      'M4 4 8 7 16 7 20 4 20 14 12 22 4 14zM7.3 11 8.5 9.8 9.7 11 8.5 12.2zM14.3 11 15.5 9.8 16.7 11 15.5 12.2zM8 12.5 9 12.5 10.5 18 9.5 18zM15 12.5 16 12.5 14.5 18 13.5 18z',
    'clade.fox': 'M3 9 5 2 9 7 12 2 14 8 23 13 21 15 14 15 9 21 3 19zM11.8 11 13 9.8 14.2 11 13 12.2z',
    'clade.fennec': 'M5 11 2 1 9 8 13 1 14 10 22 14 20 16 14 16 9 22 4 20zM12.3 12.5 13.5 11.3 14.7 12.5 13.5 13.7z',
    'clade.jackal': 'M4 10 5 1 9 7 11 1 13 8 23 12 22 14 13 15 8 21 3 18zM10.8 10.5 12 9.3 13.2 10.5 12 11.7z',
    'clade.coyote': 'M6 22 6 13 8 6 7 2 10 5 12 3 12 8 18 1 19 3 14 12 12 22zM10.1 8.5 11 7.6 11.9 8.5 11 9.4z',
    'clade.hyena': 'M2 20 3 12 8 8 14 8 16 5 18 4 22 7 21 9 18 9 17 12 18 20 16 20 15 15 8 15 5 20z',
    'clade.otter': [
      'M1 14 6 11 14 11 18 8 22 9 23 11 20 13 18 16 4 17 1 17zM18.7 10 19.5 9.2 20.3 10 19.5 10.8z',
      'M1 14 0.5 19 3 17z',
    ],
    'clade.badger':
      'M2 10 8 4 16 4 22 10 12 22zM10 5 14 5 13 17 11 17zM6.3 11 7.5 9.8 8.7 11 7.5 12.2zM15.3 11 16.5 9.8 17.7 11 16.5 12.2z',
    'clade.red_panda': [
      'M3 3 7 7 17 7 21 3 22 13 12 20 2 13zM7.3 12 8.5 10.8 9.7 12 8.5 13.2zM14.3 12 15.5 10.8 16.7 12 15.5 13.2z',
      'M9 20 15 20 14 23 10 23z',
    ],
    'clade.walrus': [
      'M4 4 20 4 22 12 18 15 6 15 2 12zM6.8 8 8 6.8 9.2 8 8 9.2zM14.8 8 16 6.8 17.2 8 16 9.2z',
      'M8 14 10.5 14 9.5 23z',
      'M13.5 14 16 14 14.5 23z',
    ],
    'clade.orca': 'M1 13 6 9 10 9 12 3 14 9 19 10 23 13 19 16 7 16 3 15zM17 11 20 11.5 18 13z',
    'clade.narwhal': 'M1 15 4 11 10 9 16 10 19 11 23 2 23.6 2.4 20.5 12.5 18 16 8 17zM16.2 13 17 12.2 17.8 13 17 13.8z',
    'clade.yak':
      'M1 4 5 8 8 6 16 6 19 8 23 4 21 10 17 11 16 21 8 21 7 11 3 10zM8.3 12 9.5 10.8 10.7 12 9.5 13.2zM13.3 12 14.5 10.8 15.7 12 14.5 13.2z',
    'clade.bison': 'M2 20 2 12 5 7 10 4 15 6 18 8 21 8 23 12 21 14 19 14 18 20 16 20 15 15 7 15 5 20z',
    'clade.oryx': ['M9 10 15 10 14 21 10 21z', 'M9 10 4 0.5 5.5 0.5 11 10z', 'M15 10 20 0.5 18.5 0.5 13 10z'],
    'clade.ram': [
      'M9 8 15 8 14 21 10 21z',
      'M9 8 5 3 1 6 2 12 6 13 6 10 4 9 5 7 9 10z',
      'M15 10 19 7 20 9 18 10 18 13 22 12 23 6 19 3 15 8z',
    ],
    'clade.moose': [
      'M9 10 15 10 16 19 12 22 8 19z',
      'M10 10 7 9 2 9 1 3 3 5 4 2 6 5 7 2 9 6z',
      'M15 6 17 2 18 5 20 2 21 5 23 3 22 9 17 9 14 10z',
    ],
    'clade.deer': [
      'M9 11 15 11 14 21 12 23 10 21z',
      'M10 11 6 6 3 6 2 2 4 4 5 1 7 5 9 3 9 7 11 10z',
      'M13 10 15 7 15 3 17 5 19 1 20 4 22 2 21 6 18 6 14 11z',
    ],
    'clade.zebra':
      'M4 4 9 2 13 6 22 15 21 19 16 19 10 14 6 22 3 20zM8.4 5 9.6 5 7.6 9 6.4 9zM11.4 8 12.6 8 9.6 12 8.4 12zM14.4 11 15.6 11 13.6 15 12.4 15z',
    'clade.mouse': [
      'M2 18 4 13 9 10 13 10 14 6 18 6 18 10 22 14 20 16 17 18zM17.2 12 18 11.2 18.8 12 18 12.8z',
      'M2 18 0.5 22 2 22 4 18z',
    ],
    'clade.porcupine': 'M2 19 3 15 1 13 4 12 3 9 6 10 6 6 9 8 10 4 12 8 14 5 15 9 17 8 18 12 22 15 21 18 17 19z',
    'clade.hare': 'M6 22 5 15 8 10 9 1 11 9 13 2 14 10 17 12 18 17 20 20 20 22zM13.2 13 14 12.2 14.8 13 14 13.8z',
    'clade.black_hare':
      'M1 15 5 11 12 10 16 8 17 2 19 7 20 3 21 9 23 12 20 13 17 15 19 20 16 20 13 15 6 16 3 20 1 19 3 16z',
    'clade.sloth': [
      'M1 2 23 2 23 4 1 4z',
      'M6 4 8 4 9 8 15 8 16 4 18 4 18 13 15 19 9 19 6 13zM9.5 10 14.5 10 13.5 14 10.5 14z',
    ],
    'clade.armadillo':
      'M2 18 4 11 9 7 15 7 19 10 21 13 23 14 22 17 19 17 18 18zM7.5 9 8.5 9 8.5 17 7.5 17zM10.5 8 11.5 8 11.5 17 10.5 17zM13.5 8 14.5 8 14.5 17 13.5 17z',
    'clade.pangolin':
      'M12 1 20 4 23 12 20 20 12 23 4 20 1 12 4 4zM7 8 12 6 17 8 12 10zM5 13 12 11 19 13 12 15zM7 18 12 16 17 18 12 20z',
    'clade.hedgehog': 'M1 19 2 15 1 12 4 12 4 8 7 9 8 5 11 7 13 4 15 7 17 6 18 10 21 12 23 16 20 17 19 19z',
    'clade.kangaroo': 'M13 2 14 0.5 15 2 17 4 15 7 15 10 18 13 18 18 21 22 16 22 14 19 11 21 1 23 9 17 10 11 12 7z',
    'clade.opossum': [
      'M1 11 5 12 8 10 15 10 18 8 23 12 18 15 16 18 7 18 4 15zM17.2 11 18 10.2 18.8 11 18 11.8z',
      'M16 18 19 22 21 20 19 19 18 17z',
    ],
    'clade.platypus': [
      'M4 12 7 8 14 8 17 10 23 10 23 13 17 13 14 16 7 16z',
      'M4 10 1 9 1 15 4 14zM14.3 10.5 15 9.8 15.7 10.5 15 11.2z',
    ],
    'clade.eagle': 'M4 22 5 12 8 6 13 4 18 5 22 8 22 13 19 11 18 9 15 11 12 22zM13.8 7 15 5.8 16.2 7 15 8.2z',
    'clade.hawk': 'M12 6 14 8 23 7 21 10 15 12 14 18 16 21 12 20 8 21 10 18 9 12 3 10 1 7 10 8z',
    'clade.crane': 'M15 1 18 2 23 3 18 4 16 4 14 10 17 12 18 16 14 17 13 23 12 23 12 17 8 15 3 16 8 12 12 10z',
    'clade.heron':
      'M13 1 16 2 22 3 16 4 14 5 16 8 13 10 17 12 18 16 14 17 13 23 12 23 12 17 8 15 3 15 8 12 11 10 13 8 11 5z',
    'clade.egret':
      'M13 1 16 2 22 4 16 4 14 6 13 10 17 12 18 16 14 17 13 23 12 23 12 17 8 15 1 12 4 12 7 11 11 10 12 6z',
    'clade.ibis':
      'M12 2 15 2 19 5 22 10 21 10 17 6 15 5 14 10 17 12 18 16 14 17 13 23 12 23 12 17 8 15 3 16 8 12 12 10z',
    'clade.shoebill': 'M2 5 10 3 13 5 23 10 21 13 13 12 11 22 5 22 3 12zM6.8 7 8 5.8 9.2 7 8 8.2z',
    'clade.flamingo': 'M9 3 12 2 13 4 15 5 14 6 12 5 11 6 13 11 18 12 14 15 11 15 11 23 10 23 10 15 6 13 9 11 9 7z',
    'clade.puffin': ['M3 22 4 10 7 5 12 4 15 6 15 12 13 22z', 'M14 7 23 10 14 13zM8.8 8 10 6.8 11.2 8 10 9.2z'],
    'clade.pelican': 'M3 22 3 10 6 5 10 4 13 6 23 8 23 10 15 17 11 16 10 22zM8.1 7 9 6.1 9.9 7 9 7.9z',
    'clade.booby': [
      'M8 2 12 3 17 5 13 6 14 13 11 16 8 14 7 8zM9.2 4.5 10 3.7 10.8 4.5 10 5.3z',
      'M4 22 10 18 10 22z',
      'M14 22 14 18 20 22z',
      'M9 16 10 18 11 18 12 16z',
    ],
    'clade.raven': 'M1 20 6 14 9 9 14 6 17 5 23 7 18 9 16 13 10 17 4 21zM14.2 7.2 15 6.4 15.8 7.2 15 8z',
    'clade.parrot': 'M6 22 5 10 9 4 15 3 19 6 21 11 18 14 17 10 14 11 13 22zM10.8 7 12 5.8 13.2 7 12 8.2z',
    'clade.toucan': 'M1 13 3 8 8 5 10 6 23 7 19 12 10 11 9 22 3 22zM5.1 8 6 7.1 6.9 8 6 8.9z',
    'clade.hummingbird': ['M4 13 9 9 13 10 23 9 13 12 11 16 6 22 7 16z', 'M8 10 11 1 13 2 12 10z'],
    'clade.peacock': [
      'M1 14 2 7 6 3 12 1 18 3 22 7 23 14zM4.7 8 6 6.7 7.3 8 6 9.3zM10.7 5 12 3.7 13.3 5 12 6.3zM16.7 8 18 6.7 19.3 8 18 9.3z',
      'M10 12 14 12 13 23 11 23z',
    ],
    'clade.ostrich':
      'M16 1 19 2 21 3 18 4 17 10 20 11 19 15 13 16 13 23 12 23 11 16 10 23 9 23 9 16 5 15 3 12 8 9 15 9 15 3z',
    'clade.turkey': ['M1 16 2 7 6 3 12 2 13 9 9 16z', 'M9 16 12 9 16 8 18 5 20 4 22 6 21 8 21 12 18 18 12 19z'],
    'clade.chameleon': [
      'M4 12 9 8 16 8 19 4 23 9 21 12 17 13 15 16 9 16zM18.5 9 19.5 8 20.5 9 19.5 10z',
      'M4 12 2 15 3 19 7 20 8 17 6 17 5 15z',
    ],
    'clade.basilisk':
      'M14 2 18 3 21 6 18 7 17 9 19 13 22 15 18 16 16 13 14 17 17 23 14 23 11 18 1 12 10 14 12 8 11 5 13 4z',
    'clade.horned_lizard': 'M12 1 14 3 17 2 16 5 20 9 20 15 15 20 12 23 9 20 4 15 4 9 8 5 7 2 10 3z',
    'clade.crocodile':
      'M1 14 4 11 7 11 8 9 10 11 12 9 15 10 23 12 23 14 15 15 13 17 4 17zM13.3 11.5 14 10.8 14.7 11.5 14 12.2z',
    'clade.tortoise':
      'M1 18 3 12 7 7 14 7 18 11 21 11 23 14 20 16 19 18 17 21 15 18 7 18 5 21 3 18zM8 10 13 10 14 13 11 15 7 13z',
    'clade.newt':
      'M11 1 13 1 14 4 13 6 17 6 18 8 14 9 14 14 17 15 16 17 13 16 12 23 11 16 8 17 7 15 10 14 10 9 6 8 7 6 11 6 10 4z',
    'clade.tree_frog':
      'M3 6 6 3 9 5 15 5 18 3 21 6 21 11 23 16 19 20 15 17 9 17 5 20 1 16 3 11zM4.6 5.5 6 4.1 7.4 5.5 6 6.9zM16.6 5.5 18 4.1 19.4 5.5 18 6.9z',
    'clade.koi': 'M2 10 8 6 16 7 20 11 23 9 23 17 20 15 16 18 8 17 2 13 0.5 15 0.5 11zM4.2 10.5 5 9.7 5.8 10.5 5 11.3z',
    'clade.clownfish':
      'M1 12 5 7 13 6 18 9 23 6 21 12 23 18 18 15 13 18 5 17zM6.3 7 7.7 7 7.7 17 6.3 17zM12.3 6.5 13.7 6.5 13.7 17.5 12.3 17.5z',
    'clade.lionfish':
      'M2 12 5 9 6 2 8 8 9 1 11 8 12 2 14 8 16 4 17 10 21 9 23 12 21 15 17 14 16 20 13 16 11 22 9 16 6 21 5 15z',
    'clade.seahorse':
      'M11 1 15 1 18 4 22 5 18 6 16 7 16 12 15 17 12 20 13 22 9 23 8 21 11 18 10 12 9 7zM12.2 3.5 13 2.7 13.8 3.5 13 4.3z',
    'clade.snail':
      'M1 20 3 17 5 8 10 4 15 5 18 9 18 14 15 17 19 17 20 12 21 13 22 8 23 17 23 20zM9 9 13 8 15 11 12 14 9 12z',
    'clade.jellyfish': [
      'M3 12 4 6 8 2 16 2 20 6 21 12z',
      'M5 12 7 12 6 22z',
      'M9 12 11 12 10.5 20 9.5 20z',
      'M13 12 15 12 14.5 20 13.5 20z',
      'M17 12 19 12 18 22z',
    ],
    'clade.lobster': [
      'M10 8 14 8 15 14 14 20 12 23 10 20 9 14z',
      'M10 9 5 6 3 2 6 1 5 4 8 4 11 8z',
      'M13 8 16 4 19 4 18 1 21 2 19 6 14 9z',
    ],
    'clade.mantis_shrimp': [
      'M1 14 5 11 14 10 18 8 21 8 23 11 19 13 18 16 5 17z',
      'M16 13 19 15 21 20 19 21 17 16zM19.2 10 20 9.2 20.8 10 20 10.8z',
    ],
    'clade.beetle': 'M12 1 13 5 17 7 19 12 18 19 12 23 6 19 5 12 7 7 11 5zM11.6 9 12.4 9 12.4 21 11.6 21z',
    'clade.butterfly': [
      'M11 8 13 8 13 20 11 20z',
      'M11 10 6 2 1 4 2 11 5 13 2 17 5 21 11 15z',
      'M13 15 19 21 22 17 19 13 22 11 23 4 18 2 13 10z',
    ],
    'clade.firefly': [
      'M10 2 14 2 15 6 15 13 12 15 9 13 9 6z',
      'M9 15 15 15 16 20 12 23 8 20z',
      'M9 6 3 10 4 12 9 9z',
      'M15 9 20 12 21 10 15 6z',
    ],
    'clade.mantis': [
      'M17 1 20 2 21 5 18 6 17 10 15 13 14 23 13 23 13 14 9 15 3 22 2 21 8 13 12 11 15 6 15 3z',
      'M17 7 12 6 9 3 10 7 14 9z',
    ],
    'clade.scorpion': [
      'M5 14 9 11 14 11 17 13 15 16 9 17z',
      'M14 11 16 6 14 2 11 1 10 3 12 4 13 7 12 11z',
      'M5 14 2 11 1 13 3 16z',
      'M5 15 2 18 1 16 3 14z',
    ],
    'clade.human': 'M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM3 22c0-5 4-8 9-8s9 3 9 8z',
    'clade.jerboa': 'M8 4a3 3 0 1 1 0 6l3 3c3 0 6 2 7 5l4 1-1 2-4-1H7l1-4-3-4c-2-2-1-6 3-8z',
    'clade.hopper': 'M2 14 9 8h7l6 4-4 2H9l-3 8H4l2-8zM16 8l2-6h2l-2 6z',
    'clade.owl':
      'M4 2l4 3h8l4-3v12c0 5-4 8-8 8s-8-3-8-8zm4 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-4 5-1 2h2z',
    'clade.octopus':
      'M12 2c4 0 7 3 7 7 0 2-1 3-2 4l3 7h-2l-3-5-1 6h-2v-6l-1 6H9l-1-6-3 5H3l3-7c-1-1-2-2-2-4 0-4 3-7 8-7z',
    'clade.gecko':
      'M12 1l2 3v5l4-2 2 1-1 1-5 3v3l4 2 1 3-2-1-3-2-1 3 1 5h-2l-1-4-1 4H9l1-5-1-3-3 2-2 1 1-3 4-2v-3L4 9 3 8l2-1 4 2V4z',
    'clade.axolotl':
      'M6 6h12l3 3v6l-3 3H6l-3-3V9zM2 5l3 2-3 2zm20 0-3 2 3 2zM2 15l3 2-3 2zm20 0-3 2 3 2zM8 10v2h2v-2zm6 0v2h2v-2z',
    'clade.eel': 'M2 14c3-6 6-8 9-6s5 6 8 4 3-4 3-4l1 3c0 2-2 5-5 5s-5-4-7-5-4 1-6 5z',
    'clade.flytrap': 'M11 13h2v9h-2zM2 4l4 1 6 6 6-6 4-1-2 4-8 6-8-6z',
    'clade.cordyceps': 'M4 9c0-4 4-7 8-7s8 3 8 7zM10 10h4v12h-4z',
    'clade.tardigrade': 'M4 8h16l2 4-2 4H4l-2-4zM4 16v4h2v-4zm5 0v4h2v-4zm4 0v4h2v-4zm5 0v4h2v-4z',
  };
  U.ICON_PATHS = P;

  /** The drawing for a key, as SVG path data (a list), or null. */
  U.iconPaths = (key) => {
    const p = P[key];
    return p == null ? null : Array.isArray(p) ? p : [p];
  };
  /**
   * An inline <svg> for `key`, or the `fallback` text (an emoji) when there is no drawing.
   * `cls` adds classes; the icon is 1em square and takes the text colour.
   */
  U.ic = function (key, fallback, cls) {
    const ps = U.iconPaths(key);
    if (!ps) return fallback == null ? '' : `<span class="ic-fb ${cls || ''}">${fallback}</span>`;
    return `<svg class="icn ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${ps.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
  };
  /**
   * The picture for what a card face does: its first verb (strikes by how they reach, forces by which way they
   * move a foe), drawn with the icon that verb already has elsewhere when there is one. The ability cards'
   * art is made from these, so it always shows what the card does.
   */
  const VERB_ICON = {
    'strike.melee': 'basic.strike',
    'strike.los': 'enemy.kiter',
    'strike.any': 'basic.arc',
    strike: 'cons.flash',
    'force.pull': 'verb.pull',
    force: 'basic.shove',
    shield: 'basic.brace',
    absorb: 'basic.brace',
    thorns: 'boon.thickhide',
    counter: 'boon.thickhide',
    hazardImmune: 'boon.thickhide',
    redirect: 'basic.lend',
    move: 'basic.scramble',
    climb: 'basic.scramble',
    hover: 'event.guide',
    weightless: 'event.guide',
    teleport: 'gear.phasebrace',
    swap: 'gear.phasebrace',
    reveal: 'boon.keensense',
    locate: 'boon.keensense',
    expose: 'boon.keensense',
    studied: 'boon.keensense',
    mark: 'basic.spot',
    hidden: 'enemy.lurker',
    decoy: 'event.mirror',
    morph: 'event.mirror',
    heal: 'gear.medkit',
    cleanse: 'gear.medkit',
    phoenix: 'boon.defiant',
    mint: 'cons.shard',
    empower: 'gear.capacitor',
    engine: 'gear.capacitor',
    freecast: 'gear.capacitor',
    draw: 'boon.studious',
    reroll: 'verb.dice',
    hasten: 'gear.chronoshim',
    preempt: 'gear.chronoshim',
    stasis: 'gear.chronoshim',
    anchor: 'boon.anchorsoul',
    weaken: 'verb.weaken',
    stripShield: 'verb.weaken',
    dot: 'verb.weaken',
    execute: 'node.elite',
    trap: 'enemy.biter',
    ambushTrap: 'enemy.biter',
    zone: 'event.bloom',
    aura: 'event.bloom',
    rally: 'basic.legup',
    interact: 'basic.reach',
  };
  U.verbIconKey = function (face, el) {
    const x = (face && face.fx && face.fx[0]) || {};
    const k = VERB_ICON[x.v + '.' + x.kind] || VERB_ICON[x.v];
    return k && P[k] ? k : 'el.' + ((face && face.elt) || el || 'M');
  };
  U.icFace = (face, el, cls) => U.ic(U.verbIconKey(face, el), '•', cls);
  // The keys the rest of the interface uses, by kind, so a caller never builds strings by hand.
  U.icEnemy = (type, glyph, cls) => U.ic('enemy.' + type, glyph, cls);
  U.icNode = (type, cls) => U.ic('node.' + type, '•', cls);
  U.icEvent = (def, cls) => U.ic('event.' + def.id, def.icon, cls);
  U.icBoon = (id, cls) => {
    const b = T.BOON_BY[id];
    if (/^aff_/.test(id)) return U.ic('el.' + id.slice(4), b.icon, cls);
    return U.ic('boon.' + id, b && b.icon, cls);
  };
  U.icGear = (id, cls) => U.ic('gear.' + id, T.GEAR_BY[id] && T.GEAR_BY[id].icon, cls);
  U.icCons = (id, cls) => U.ic('cons.' + id, T.CONSUMABLE_BY[id] && T.CONSUMABLE_BY[id].icon, cls);
  U.icBasic = (b, cls) => U.ic('basic.' + b.id.replace(/_[A-Z]$/, ''), b.icon, cls);
  /**
   * Painted heads (2.68): sprite sheets in assets/portraits, four 128 px tiles to a row, inlined as
   * T.ART['portrait/sheet-N']. Each list is one sheet, read left to right, top to bottom. A clade with no
   * head (human), or a page without the art, gets its drawn icon.
   */
  U.PORTRAIT_SHEETS = [
    [
      'jerboa',
      'hopper',
      'owl',
      'octopus',
      'gecko',
      'axolotl',
      'eel',
      'flytrap',
      'cordyceps',
      'tardigrade',
      'orangutan',
      'lemur',
      'mandrill',
      'lynx',
      'caracal',
      'ocelot',
    ],
    [
      'tiger',
      'cheetah',
      'fennec',
      'fox',
      'jackal',
      'coyote',
      'hyena',
      'otter',
      'badger',
      'red_panda',
      'walrus',
      'orca',
      'narwhal',
      'yak',
      'bison',
      'oryx',
    ],
    [
      'ram',
      'moose',
      'deer',
      'zebra',
      'mouse',
      'porcupine',
      'hare',
      'black_hare',
      'sloth',
      'armadillo',
      'pangolin',
      'hedgehog',
      'kangaroo',
      'opossum',
      'platypus',
      'eagle',
    ],
    [
      'hawk',
      'crane',
      'heron',
      'egret',
      'ibis',
      'shoebill',
      'flamingo',
      'puffin',
      'pelican',
      'booby',
      'raven',
      'parrot',
      'toucan',
      'hummingbird',
      'peacock',
      'ostrich',
    ],
    [
      'turkey',
      'chameleon',
      'basilisk',
      'horned_lizard',
      'crocodile',
      'tortoise',
      'newt',
      'tree_frog',
      'koi',
      'clownfish',
      'lionfish',
      'seahorse',
      'snail',
      'jellyfish',
      'lobster',
      'mantis_shrimp',
    ],
    ['beetle', 'butterfly', 'firefly', 'mantis', 'scorpion'],
  ];
  const PORTRAIT = {};
  U.PORTRAIT_SHEETS.forEach((ids, s) => ids.forEach((id, i) => (PORTRAIT[id] = { sheet: s + 1, i, n: ids.length })));
  U.portraitOf = (sp) => PORTRAIT[sp] || null;
  U.icClade = (sp, cls) => {
    const p = PORTRAIT[sp];
    const art = p && U.artClass ? U.artClass('portrait/sheet-' + p.sheet) : '';
    if (!art) return U.ic('clade.' + sp, T.SPECIES[sp] && T.SPECIES[sp].icon, cls);
    const rows = Math.ceil(p.n / 4);
    const x = ((p.i % 4) * 100) / 3;
    const y = rows > 1 ? (Math.floor(p.i / 4) * 100) / (rows - 1) : 0;
    return `<span class="icn por ${art} ${cls || ''}" style="background-size:400% ${rows * 100}%;background-position:${x.toFixed(3)}% ${y.toFixed(3)}%" aria-hidden="true"></span>`;
  };
  U.icEl = (el, cls) => U.ic('el.' + el, el, cls);
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
