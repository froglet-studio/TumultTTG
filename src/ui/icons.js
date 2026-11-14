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
    'el.O': 'M12 1 15 9 23 12 15 15 12 23 9 15 1 12 9 9z', // Omni: a four-point star
    crystal: 'M12 1 20 9 12 23 4 9zM12 4.5 7.2 9 12 18.6 16.8 9z', // an omnicrystal (the currency)
    ap: 'M4 4h16v16H4zM8 8v8h8V8z',

    /* ── mission kinds on the route ── */
    'node.swarm': ['M3 8l4-3 4 3-4 3z', 'M13 8l4-3 4 3-4 3z', 'M8 16l4-3 4 3-4 3z'], // a scatter of small things
    'node.vault': 'M2 9 12 3l10 6v2H2zM4 12h3v7H4zM10.5 12h3v7h-3zM17 12h3v7h-3zM2 20h20v2H2z', // a held structure
    'node.cascade':
      'M2 6c4-3 6 3 10 0s6 3 10 0v4c-4 3-6-3-10 0S6 7 2 10zM2 14c4-3 6 3 10 0s6 3 10 0v4c-4 3-6-3-10 0s-6-3-10 0z', // water that runs
    'node.salvage': 'M3 8h18v13H3zM3 8l3-5h12l3 5M9 12h6v2H9z', // a crate, lid open
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

    /* ── clades ── */
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
  U.icClade = (sp, cls) => U.ic('clade.' + sp, T.SPECIES[sp] && T.SPECIES[sp].icon, cls);
  U.icEl = (el, cls) => U.ic('el.' + el, el, cls);
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
