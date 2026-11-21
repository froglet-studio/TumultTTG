/* ============================================================================
   TUMULT — KEYWORDS (browser only)
   The game's words of art (Weakened, Anchored, Marked, Hidden, push, zone…)
   are drawn the same way everywhere they appear: a small icon, a colour that
   says whether it helps or hurts, and a tooltip that says what it does in one
   sentence a player could resolve by hand. The board uses the same icons on
   the tokens, so a word on a card and the mark it leaves on a foe look alike.
   U.kw(text) decorates text that is already escaped; U.kwGloss(text) lists
   the keywords a text uses, for tooltips (a tooltip cannot hold a tooltip).
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});

  // drawn on the 24-unit grid, one colour (currentColor), like the rest of the icon set
  Object.assign(U.ICON_PATHS, {
    'kw.hidden':
      'M2 12c3-5 6-7 10-7s7 2 10 7c-3 5-6 7-10 7S5 17 2 12zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM3 21 21 3l1.4 1.4-18 18z',
    'kw.shield': 'M12 1 21 4v7c0 6-4 10-9 12C7 21 3 17 3 11V4z',
    'kw.anchor':
      'M11 2h2v3h3v2h-3v12c3 0 5-2 6-5l-2-1 4-2 1 5-2-1c-1 4-4 7-8 7s-7-3-8-7l-2 1 1-5 4 2-2 1c1 3 3 5 6 5V7H8V5h3z',
    'kw.root': 'M11 2h2v9l5-4 1.4 1.4L13 14v3l6 3-1 2-6-3-6 3-1-2 6-3v-3L4.6 8.4 6 7l5 4z',
    'kw.mark':
      'M11 1h2v4a7 7 0 0 1 6 6h4v2h-4a7 7 0 0 1-6 6v4h-2v-4a7 7 0 0 1-6-6H1v-2h4a7 7 0 0 1 6-6zm1 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    'kw.weak': 'M10 2h4v12h5l-7 8-7-8h5z',
    'kw.locate': 'M10 1h4v5h-4zM10 18h4v5h-4zM1 10h5v4H1zM18 10h5v4h-5zM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z',
    'kw.expose': 'M12 1 21 4v7c0 6-4 10-9 12C7 21 3 17 3 11V4zm1 4-3 6h3l-2 8 6-10h-3l2-4z',
    'kw.thorns': 'M12 1l2 6 6-3-3 6 6 2-6 2 3 6-6-3-2 6-2-6-6 3 3-6-6-2 6-2-3-6 6 3z',
    'kw.stasis': 'M5 2h14v2l-5 8 5 8v2H5v-2l5-8-5-8zm3 2 4 6 4-6z',
    'kw.hover': 'M12 2 20 10l-1.4 1.4L12 4.8l-6.6 6.6L4 10zM12 9l8 8-1.4 1.4-6.6-6.6-6.6 6.6L4 17z',
    'kw.empower': 'M12 1 20 11h-5v12H9V11H4z',
    'kw.pierce': 'M1 11h16V7l6 5-6 5v-4H1zM8 4h3v16H8z',
    'kw.push': 'M2 10h11V5l9 7-9 7v-5H2z',
    'kw.pull': 'M22 10H11V5l-9 7 9 7v-5h11z',
    'kw.melee': 'M15 1h4v4L9 15l2 2-2 2-2-2-3 3-2-2 3-3-2-2 2-2 2 2z',
    'kw.lane': 'M1 11h18V6l4 6-4 6v-5H1zM1 7h3v10H1z',
    'kw.zone':
      'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
    'kw.burst': 'M12 1l3 7 7-2-4 6 4 6-7-2-3 7-3-7-7 2 4-6-4-6 7 2z',
    'kw.reveal': 'M2 12c3-5 6-7 10-7s7 2 10 7c-3 5-6 7-10 7S5 17 2 12zm10-4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'kw.mint': 'M4 4h16v16H4zM11 7v4H7v2h4v4h2v-4h4v-2h-4V7z',
    'kw.decoy': 'M12 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM5 22c0-6 3-10 7-10s7 4 7 10zM2 2l2 0 0 2-2 0z',
    'kw.link':
      'M9 7h4a5 5 0 0 1 0 10h-1v-2h1a3 3 0 0 0 0-6H9a3 3 0 0 0-2.8 2H4.1A5 5 0 0 1 9 7zm6 10h-4a5 5 0 0 1 0-10h1v2h-1a3 3 0 0 0 0 6h4a3 3 0 0 0 2.8-2h2.1A5 5 0 0 1 15 17z',
    'kw.trap': 'M2 14h20v3H2zM3 14l3-6 3 6zm6 0 3-6 3 6zm6 0 3-6 3 6z',
    'kw.hazard': 'M12 2 23 21H1zm-1 6v7h2V8zm0 9v2h2v-2z',
    'kw.height': 'M2 20h6v-5h5v-5h5V5h4v17H2z',
    'kw.counter': 'M4 8h11a6 6 0 0 1 0 12H8v-3h7a3 3 0 0 0 0-6H4v3L0 9.5 4 5z',
    'kw.preempt': 'M5 2h6v3H8v14h3v3H5zM13 2h6v20h-6v-3h3V5h-3z',
    'kw.heal': 'M9 2h6v7h7v6h-7v7H9v-7H2V9h7z',
    'kw.slow': 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm-1 2h2v5l4 2-1 2-5-3z',
  });

  /**
   * One entry per word of art: what to match (the first match wins), its icon, whether it helps (good) or
   * harms (bad) whoever carries it, and the sentence that explains it. `state` names the state key the
   * engine uses, so a token on the board can wear the same icon.
   */
  const K = [
    {
      id: 'weak',
      re: 'Weak(?:en(?:ed|s)?)?',
      icon: 'kw.weak',
      tone: 'bad',
      state: 'Weak',
      tip: 'Weakened N: each hit it deals is N lower, until it wears off.',
    },
    {
      id: 'anchor',
      re: 'Anchor(?:ed|s|ing)?',
      icon: 'kw.anchor',
      tone: 'bad',
      state: 'Anchored',
      tip: 'Anchored: nothing moves it. It cannot be pushed or pulled, and cannot walk or blink. It still acts.',
    },
    {
      id: 'root',
      re: 'Root(?:ed|s)?',
      icon: 'kw.root',
      tone: 'bad',
      state: 'Rooted',
      tip: 'Rooted: Anchored (since 2.91 one keyword): nothing moves it, its own walking included. It still acts.',
    },
    {
      id: 'wound',
      re: 'Wound(?:ed|s)?',
      icon: 'kw.weak',
      tone: 'bad',
      state: 'Wound',
      tip: 'Wound N: at round end it takes N, then the Wound drops by 1 (Wound 3 is 3, then 2, then 1). A new Wound replaces a smaller one.',
    },
    {
      id: 'link',
      re: 'Link(?:ed|s)?',
      icon: 'kw.link',
      tone: 'bad',
      state: 'Linked',
      tip: 'Linked: two units joined for some rounds. When one takes damage, a push or a pull, or a heal, the other takes the same.',
    },
    {
      id: 'mark',
      re: 'Mark(?:ed|s)?',
      icon: 'kw.mark',
      tone: 'bad',
      state: 'Marked',
      tip: 'Marked: the next hit on it, by anyone, deals +2. The mark is then spent.',
    },
    {
      id: 'hidden',
      re: 'Hidden|Hid(?:e|es|ing)',
      icon: 'kw.hidden',
      tone: 'good',
      state: 'Hidden',
      tip: 'Hidden: zone (ranged) strikes cannot find it. Melee, area hits, being moved or being Located breaks it.',
    },
    {
      id: 'locate',
      re: 'Locat(?:e|ed|es)',
      icon: 'kw.locate',
      tone: 'bad',
      state: 'Located',
      tip: 'Located: cannot Hide, and can be struck across a zone even while Hidden.',
    },
    {
      id: 'expose',
      re: 'Expos(?:e|ed|es)',
      icon: 'kw.expose',
      tone: 'bad',
      state: 'Exposed',
      tip: 'Exposed: the next hit on it ignores Shield and deals extra.',
    },
    {
      id: 'shield',
      re: 'Shield(?:ed|s)?',
      icon: 'kw.shield',
      tone: 'good',
      state: 'Shield',
      tip: 'Shield N: each hit taken is N lower. Area hits bypass it unless it says otherwise; pierce and true damage ignore it.',
    },
    {
      id: 'thorns',
      re: 'Thorns',
      icon: 'kw.thorns',
      tone: 'good',
      state: 'Thorns',
      tip: 'Thorns N: anything that strikes it in melee takes N.',
    },
    {
      id: 'stasis',
      re: 'Stasis',
      icon: 'kw.stasis',
      tone: 'good',
      state: 'Stasis',
      tip: 'Stasis: cannot be targeted while it lasts.',
    },
    {
      id: 'hover',
      re: 'Hover(?:s|ing)?|Weightless',
      icon: 'kw.hover',
      tone: 'good',
      state: 'Hover',
      tip: 'Hover: off the ground, so hazards and Fields do not touch it, and it cannot be pushed or pulled.',
    },
    {
      id: 'empower',
      re: 'Empower(?:ed|s)?',
      icon: 'kw.empower',
      tone: 'good',
      state: 'Empower',
      tip: 'Empowered: its next strike (or strikes) deal more.',
    },
    {
      id: 'preempt',
      re: 'Pre-?arm(?:ed)?|Pre-?empt',
      icon: 'kw.preempt',
      tone: 'good',
      state: 'Preempt',
      tip: 'Pre-empt: the next hit it takes is reduced.',
    },
    {
      id: 'counter',
      re: 'Counter(?:s|ed)?(?![-\\w])',
      icon: 'kw.counter',
      tone: 'good',
      state: 'Counter',
      tip: 'Counter: the next melee strike against it is turned back on the striker.',
    },
    {
      id: 'pierce',
      re: 'pierc(?:e|es|ing)|true damage',
      icon: 'kw.pierce',
      tone: 'neutral',
      tip: 'Pierce: ignores Shield.',
    },
    {
      id: 'push',
      re: 'knockback|knock(?:ed|s)? back|push(?:ed|es)?|shove[sd]?',
      icon: 'kw.push',
      tone: 'neutral',
      tip: 'Push: moves the target that many nodes straight away from the one pushing. Anchored, Held and hovering units do not move; a unit pushed into a hazard takes its damage.',
    },
    {
      id: 'pull',
      re: 'pull(?:ed|s)?|drag(?:ged|s)?|reel(?:ed|s)?',
      icon: 'kw.pull',
      tone: 'neutral',
      tip: 'Pull: moves the target that many nodes toward the one pulling. Anchored, Held and hovering units do not move.',
    },
    {
      id: 'melee',
      re: 'Melee',
      icon: 'kw.melee',
      tone: 'neutral',
      tip: 'Melee: hits a foe on a node beside you. Breaks Hidden.',
    },
    {
      id: 'lane',
      re: 'Lane strike|lane',
      icon: 'kw.lane',
      tone: 'neutral',
      tip: 'Lane strike: hits a foe you can see along the board, at any range.',
    },
    {
      id: 'zone',
      re: 'zone(?:s)?',
      icon: 'kw.zone',
      tone: 'neutral',
      tip: 'Zone: a coloured region of the board. A zone strike hits anything that shares a zone with you; a Hidden foe cannot be found that way.',
    },
    {
      id: 'burst',
      re: 'Burst',
      icon: 'kw.burst',
      tone: 'neutral',
      tip: 'Burst: hits every foe beside you at once (an area hit: it bypasses Shield unless the Shield says otherwise).',
    },
    {
      id: 'reveal',
      re: 'Reveal(?:s|ed)?',
      icon: 'kw.reveal',
      tone: 'neutral',
      tip: 'Reveal: shows everything within range, breaks Hidden there and finds hidden objectives.',
    },
    {
      id: 'mint',
      re: 'mint(?:s|ed)?|temporary',
      icon: 'kw.mint',
      tone: 'good',
      tip: 'Mint: adds dice to the bank for this round only. Minted dice never count toward the 15 and vanish at the end of the round.',
    },
    {
      id: 'decoy',
      re: 'decoy',
      icon: 'kw.decoy',
      tone: 'neutral',
      tip: 'Decoy: a stand-in on the board that draws attacks meant for the nearer hero.',
    },
    {
      id: 'field',
      re: 'Field(?:s)?',
      icon: 'kw.trap',
      tone: 'neutral',
      tip: 'Field: marked spaces that do their keywords to whatever enters them or ends the round there. Its harm falls on foes, its help on allies; Hover is above it. A hazard is a Field of damage.',
    },
    {
      id: 'hazard',
      re: 'hazard(?:s)?',
      icon: 'kw.hazard',
      tone: 'bad',
      tip: 'Hazard: a Field of damage that belongs to nobody: whoever ends the round on it takes damage.',
    },
    {
      id: 'height',
      re: 'height|ledge(?:s)?',
      icon: 'kw.height',
      tone: 'neutral',
      tip: 'Height: a raised node. Walking up needs a Space verb (climb, blink) or a ramp; from height, foes below are easier to hit.',
    },
    {
      id: 'heal',
      re: 'heal(?:s|ed)?|regrow(?:s)?',
      icon: 'kw.heal',
      tone: 'good',
      tip: 'Heal: restores vitality, never above its maximum.',
    },
    {
      id: 'slow',
      re: 'Slow(?:ed|s)?',
      icon: 'kw.slow',
      tone: 'bad',
      state: 'Slow',
      tip: 'Slow: Anchored (since 2.91 one keyword): nothing moves it, its own walking included. It still acts.',
    },
  ];
  U.KEYWORDS = K;
  const BY = {};
  K.forEach((k) => (BY[k.id] = k));
  U.KW_BY = BY;
  const BY_STATE = {};
  K.forEach((k) => k.state && (BY_STATE[k.state] = k));
  BY_STATE.Weightless = BY.hover;
  BY_STATE.SlowSelf = BY.slow;
  BY_STATE.Held = BY.anchor;
  U.kwOfState = (state) => BY_STATE[state] || null;

  const RE = new RegExp('\\b(' + K.map((k) => '(' + k.re + ')').join('|') + ')\\b', 'gi');
  const which = (groups) => {
    for (let i = 0; i < K.length; i++) if (groups[i + 1] != null) return K[i];
    return null;
  };
  const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  /** A keyword chip: icon + word, coloured by tone, with its tooltip. */
  U.kwChip = function (k, word) {
    return `<span class="kw kw-${k.tone}" data-kw="${k.id}" data-tip="${attr(`<b>${U.ic(k.icon)} ${word}</b><div>${k.tip}</div>`)}">${U.ic(k.icon, '', 'kw-ic')}${word}</span>`;
  };
  /** Decorate already-escaped text: every keyword becomes a chip. */
  U.kw = function (html) {
    if (!html) return html;
    return String(html).replace(RE, (word, ...groups) => {
      const k = which(groups);
      return k ? U.kwChip(k, word) : word;
    });
  };
  /** The keywords a text uses, each with its sentence: for tooltips, which cannot hold tooltips of their own. */
  U.kwGloss = function (text) {
    const seen = [];
    String(text || '').replace(RE, (word, ...groups) => {
      const k = which(groups);
      if (k && !seen.includes(k)) seen.push(k);
      return word;
    });
    if (!seen.length) return '';
    return `<div class="kw-gloss">${seen.map((k) => `<div><span class="kw kw-${k.tone}">${U.ic(k.icon, '', 'kw-ic')}${k.tip.split(':')[0]}</span> ${k.tip.slice(k.tip.indexOf(':') + 1)}</div>`).join('')}</div>`;
  };
})((window.T = window.T || {}));
