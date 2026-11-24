/* ============================================================================
   TUMULT — HOW TO PLAY AND THE CODEX (browser only)
   How to play is seven short pages, one rule each with a picture beside it
   (Frogma "how to play"); the full rules stay one tap away. The Codex is
   every word of art in one sentence a player could resolve by hand, every
   foe, piece of gear and die, searchable, with links to the cards that use a
   word (Frogma "codex"). Opened from Play, from More on a phone, and from ?
   in a mission.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) => U.esc(s);
  const EL = T.ETHERIONS;

  /* ───────────── pictures for the pages ───────────── */
  // a small board on a 5 x 3 grid: [col, row] for each piece
  function board({ hero = [0, 0], ally = [0, 1], foes = [], lines = [], zone = null, high = null }) {
    const X = (c) => 40 + c * 90,
      Y = (r) => 40 + r * 90;
    const out = [];
    if (zone)
      out.push(
        `<rect x="${X(zone[0]) - 34}" y="${Y(zone[1]) - 34}" width="${(zone[2] - zone[0]) * 90 + 68}" height="${(zone[3] - zone[1]) * 90 + 68}" rx="34" class="hz-zone"/>`,
      );
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++)
        out.push(`<line class="hz-e" x1="${X(c)}" y1="${Y(r)}" x2="${X(c + 1)}" y2="${Y(r)}"/>`);
    for (let c = 0; c < 5; c += 2)
      for (let r = 0; r < 2; r++)
        out.push(`<line class="hz-e" x1="${X(c)}" y1="${Y(r)}" x2="${X(c)}" y2="${Y(r + 1)}"/>`);
    lines.forEach(([a, b]) =>
      out.push(`<line class="hz-intent" x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}"/>`),
    );
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 5; c++)
        out.push(
          `<circle class="hz-n${high && high[0] === c && high[1] === r ? ' high' : ''}" cx="${X(c)}" cy="${Y(r)}" r="22"/>`,
        );
    const piece = (p, cls, txt) =>
      `<g class="${cls}" transform="translate(${X(p[0])},${Y(p[1])})"><circle r="22"/><text y="5" text-anchor="middle">${txt}</text></g>`;
    if (hero) out.push(piece(hero, 'hz-hero', 'P1'));
    if (ally) out.push(piece(ally, 'hz-ally', 'P2'));
    foes.forEach((f) => out.push(piece(f, 'hz-foe', '▼')));
    return `<svg class="hz-board" viewBox="0 0 440 260" role="img" aria-label="A small board">${out.join('')}</svg>`;
  }
  const track = () =>
    `<div class="hz-track" aria-label="The six-column track">${['Ready', '1', '2', '3', '4', '5']
      .map(
        (c, i) =>
          `<span class="${i === 0 ? 'ready' : ''}"><small>${c}</small>${i === 2 ? '<b>Jet</b>' : i === 0 ? '<b>Blend</b>' : ''}</span>`,
      )
      .join('')}</div>`;
  const dice = () =>
    `<div class="hz-dice">${['AP', 'AP', 'M', 'S'].map((f, i) => U.dieHTML(f, '', i === 3 ? 'S' : 'plain')).join('')}</div><p class="dim small center">Four dice rolled from fifteen. What you do not spend stays banked.</p>`;
  const cardPic = () => {
    const pb = T.PREBUILTS[0];
    return `<div class="hz-card">${U.relicHTML(pb.cards[0], { clades: pb.species })}</div>`;
  };

  const PAGES = [
    {
      t: 'Lead a squad down to the Heart',
      p: [
        'You fly a squad of pilots from the Ark, across Tumult by land, sea and air, to the Heart at the end of the route.',
        'Every stop on the route is a mission, a haven or an event. You choose the next leg.',
      ],
      s: 'Win the missions, grow your pilots, and destroy the Heart.',
      pic: () => board({ foes: [[4, 1]], lines: [] }),
    },
    {
      t: 'Four dice a round',
      p: [
        'Each pilot has fifteen dice. At the start of a round they roll four, drawn from the pool.',
        '<b>AP</b> pays for moving and acting. An <b>etherion</b> (Mass, Charge, Space, Time) pays for a card’s Ethereal face; Omni pays for any.',
      ],
      s: 'Bank what you do not need: the pool shrinks, so hoarding starves the next roll.',
      pic: dice,
    },
    {
      t: 'Foes tell you their plan first',
      p: [
        'Every foe shows what it will do <b class="rose">before you act</b>: the red tag over it, and the dashed line to its target.',
        'Your turn is to answer it: hide, block, move away, or hit first.',
      ],
      s: 'Nothing happens by surprise. Foes act when you press End Round.',
      pic: () =>
        board({
          foes: [
            [2, 0],
            [3, 1],
            [2, 2],
          ],
          lines: [
            [
              [2, 0],
              [0, 0],
            ],
            [
              [3, 1],
              [0, 1],
            ],
            [
              [2, 2],
              [0, 1],
            ],
          ],
        }),
    },
    {
      t: 'Every card has two faces',
      p: [
        'The <b>Physical</b> face costs AP and grows with P. The <b>Ethereal</b> face costs AP and an etherion, and does something Physical cannot; it grows with E.',
        'An Ethereal face sleeps until its card has E 1. Every pilot starts with two awake.',
      ],
      s: 'Playing either face sends the whole card to the track.',
      pic: cardPic,
    },
    {
      t: 'The track brings cards back',
      p: [
        'A played card goes onto the six-column track at its cooldown. Each new round every card steps one column toward Ready.',
        'A card plays at most once a round, so plan two rounds ahead.',
      ],
      s: 'A short cooldown is a card you lean on; a long one is a card you save.',
      pic: track,
    },
    {
      t: 'Zones, steps and high ground',
      p: [
        'Spaces joined by a line are a step apart (1 AP). A zone shot hits anything that shares a coloured zone with you, at any distance; melee needs a shared line.',
        'A dashed ring is high ground: reached by its ladder, a teleport or a hover.',
      ],
      s: 'Step out of a zone and a zone shot has no line.',
      pic: () => board({ foes: [[3, 0]], zone: [2, 0, 4, 1], high: [4, 2] }),
    },
    {
      t: 'Downed is not dead',
      p: [
        'At 0 vitality a pilot is downed. An ally beside them can <b>Rally</b> them for 2 AP.',
        'If the whole squad is down, the expedition ends; your pilots are whole again for the next one. Lose a mission that is not the Heart any other way (its clock runs out) and your one <b>lifeline</b> lets you carry on.',
      ],
      s: 'That is everything. The Codex has every word, foe and die.',
      pic: () => board({ hero: [1, 1], ally: [2, 1], foes: [[4, 1]] }),
    },
  ];
  U.howto = U.howto || { page: 0 };
  U.renderHelp = function () {
    const i = Math.max(0, Math.min(PAGES.length - 1, U.howto.page));
    const pg = PAGES[i];
    const dots = PAGES.map(
      (_, j) =>
        `<button class="${j === i ? 'on' : ''}" data-act="howtoGo" data-arg="${j}" aria-label="Page ${j + 1}"></button>`,
    ).join('');
    const inner = `<div class="page howto"><span class="eyebrow center">How to play · ${i + 1} of ${PAGES.length}</span><h1 class="center">${esc(pg.t)}</h1>
      <div class="ht-card"><div class="ht-pic">${pg.pic()}</div><div class="ht-text">${pg.p.map((x) => `<p>${x}</p>`).join('')}<p class="dim small">${esc(pg.s)}</p><div class="ht-dots" role="group" aria-label="Pages">${dots}</div></div></div>
      <div class="row center ht-btns"><button class="ghost" data-act="howtoGo" data-arg="${i - 1}" ${i ? '' : 'disabled'}>‹ Back</button>${i < PAGES.length - 1 ? `<button class="cta" data-act="howtoGo" data-arg="${i + 1}">Next ›</button>` : `<button class="cta" data-act="howtoDone">${U.howto.from === 'mission' ? 'Back to the board' : 'Done'}</button>`}</div>
      <details class="ht-full"><summary>The full rules on one page</summary>${U.helpHTML()}</details></div>`;
    return U.shell('play', inner);
  };

  /* ───────────── the codex ───────────── */
  U.codex2 = U.codex2 || { tab: 'words', q: '' };
  const TONE = { good: 'cyan', bad: 'rose', neutral: 'gold' };
  function words(q) {
    return U.KEYWORDS.filter((k) => !q || k.tip.toLowerCase().includes(q))
      .map((k) => {
        const i = k.tip.indexOf(':');
        const name = i > 0 ? k.tip.slice(0, i) : k.id;
        const text = i > 0 ? k.tip.slice(i + 1).trim() : k.tip;
        return `<article class="cx-card cx-${TONE[k.tone] || 'cyan'}"><h3>${U.ic(k.icon, '', 'kw-ic')} ${esc(name)}</h3><p>${esc(text)}</p><button class="linkish small" data-act="codexCards" data-arg="${esc(name)}">Cards with ${esc(name)} ›</button></article>`;
      })
      .join('');
  }
  function foes(q) {
    return Object.entries(T.ENEMIES)
      .filter(([, e]) => !q || (e.name + ' ' + e.role + ' ' + e.flavor).toLowerCase().includes(q))
      .map(
        ([k, e]) =>
          `<article class="cx-card cx-rose">${U.foePainting && U.foePainting({ type: k }) ? `<div class="cx-foe">${U.foeArt({ type: k, elite: e.elite, boss: e.boss }, 96)}</div>` : ''}<h3>${U.icEnemy(k, e.glyph)} ${esc(e.name)} <small class="dim">${esc(e.role)}${e.elite ? ' · elite' : ''}${e.boss ? ' · boss' : ''}</small></h3><p class="small mono dim">Vitality ${e.hp.join(' / ')} · speed ${e.speed}${e.shield ? ' · Shield ' + e.shield.join(' / ') : ''}${e.hidden ? ' · starts Hidden' : ''}</p>${Object.values(
            e.abilities,
          )
            .map(
              (a) =>
                `<p class="small">• <b>${esc(a.n)}</b> ${a.dmg ? '(' + a.dmg.join(' / ') + ' ' + esc(a.kind) + ')' : '(' + esc(a.kind) + ')'}${a.push ? ', push ' + a.push : ''}${a.pull ? ', pull ' + a.pull : ''}${a.anchor ? ', roots ' + a.anchor : ''}</p>`,
            )
            .join(
              '',
            )}<p class="flavor">${esc(e.flavor)} ${U.canonMark ? U.canonMark('foe:' + k, e.flavor, 'codex:flavor') : ''}</p></article>`,
      )
      .join('');
  }
  function gear(q) {
    const g = T.GEAR.filter((x) => !q || (x.name + ' ' + x.desc).toLowerCase().includes(q)).map(
      (x) =>
        `<article class="cx-card cx-gold"><h3>${U.icGear(x.id)} ${esc(x.name)} <small class="dim">${x.price} ◇</small></h3><p class="small dim">${esc(x.desc)}</p>${x.passive ? `<p class="small">◆ <b>Passive</b>: ${esc(x.passive.txt)}</p>` : ''}${x.abilities.map((a) => `<p class="small">• <b>${esc(a.n)}</b> (${T.gearUseText(a)}): ${esc(a.txt())}</p>`).join('')}${x.card ? `<p class="small dim">${T.gearCardNote(x)}</p>` : ''}</article>`,
    );
    return g.join('');
  }
  function diceTab() {
    return Object.entries(T.DICE)
      .map(([k, d]) => {
        const faces = d.faces || ['M', 'C', 'S', 'T', 'O'].concat(Array(15).fill('AP'));
        const counts = {};
        faces.forEach((f) => (counts[f] = (counts[f] || 0) + 1));
        return `<article class="cx-card cx-cyan"><h3>${U.dieHTML(k === 'plain' ? 'AP' : k === 'eth' ? 'O' : k, '', k)} ${esc(d.n)} <small class="dim">d${d.sides}</small></h3><p class="small">${Object.entries(
          counts,
        )
          .map(([f, n]) => `${n} × ${f === 'AP' ? 'AP' : f === 'O' ? 'Omni' : esc(EL[f].name)}`)
          .join(
            ' · ',
          )}</p><p class="small dim">${k === 'plain' ? 'The die every pilot starts with.' : k === 'eth' ? 'Omni Core swaps a plain die for this one.' : `Each awakened ${esc(EL[k].name)} card, and each ${esc(EL[k].name)} Affinity boon, swaps a plain die for this one.`}</p></article>`;
      })
      .join('');
  }
  function clades(q) {
    return T.SPECIES_ORDER.filter((s) => s !== 'human' && T.cardsOf(s).length)
      .filter((s) => !q || (T.SPECIES[s].name + ' ' + (T.SPECIES[s].tagline || '')).toLowerCase().includes(q))
      .map((s) => {
        const sp = T.SPECIES[s];
        return `<article class="cx-card cx-gold"><h3>${U.icClade(s)} ${esc(sp.name)} <small class="dim">leans ${esc(sp.lean || '')}</small></h3><p class="small">${esc(sp.tagline || '')}</p><button class="linkish small" data-act="codexCards" data-arg="${esc(sp.name)}">${T.cardsOf(s).length} cards ›</button></article>`;
      })
      .join('');
  }
  const CX_TABS = [
    ['words', 'Words', words],
    ['foes', 'Foes', foes],
    ['gear', 'Gear', gear],
    ['dice', 'Dice', diceTab],
    ['clades', 'Clades', clades],
  ];
  U.renderCodex2 = function () {
    const c = U.codex2;
    const q = (c.q || '').trim().toLowerCase();
    const tab = CX_TABS.find((t) => t.id === c.tab || t[0] === c.tab) || CX_TABS[0];
    const tabs = CX_TABS.map(
      ([id, name]) =>
        `<button class="${tab[0] === id ? 'on' : ''}" data-act="codex2Tab" data-arg="${id}" aria-pressed="${tab[0] === id}">${esc(name)}</button>`,
    ).join('');
    const body = tab[2](q);
    const seen = new Set(U.seen ? Object.keys(U.seen().cards) : []);
    const foesSeen = Object.entries(T.ENEMIES).slice(0, 8);
    const strip =
      tab[0] === 'words'
        ? `<div class="cx-strip"><span class="lab">Foes</span>${foesSeen.map(([k, e]) => `<button class="cx-foe" data-act="codex2Tab" data-arg="foes">${U.icEnemy(k, e.glyph)} ${esc(e.name)}</button>`).join('')}</div>`
        : '';
    void seen;
    const inner = `<div class="page codex"><div class="pg-head"><h1>Codex</h1><div class="chips" role="group" aria-label="Section">${tabs}</div><input class="cx-q right" type="search" placeholder="Search the codex" value="${esc(c.q)}" data-input="codexQ" aria-label="Search the codex"></div><div class="cx-grid">${body || `<p class="dim">Nothing in ${esc(tab[1])} matches.</p>`}</div>${strip}</div>`;
    return U.shell('play', inner);
  };

  U.guideInput = function (name, value) {
    if (name !== 'codexQ') return false;
    U.codex2.q = value;
    U.render();
    const box = document.querySelector('.cx-q');
    if (box) {
      box.focus();
      box.setSelectionRange(value.length, value.length);
    }
    return true;
  };
  U.guideAct = function (act, arg) {
    switch (act) {
      case 'help':
        if (U.ms) U.ms.menu = false;
        if (U.modal) U.closeModal();
        U.howto = { page: 0, from: U.screen === 'help' ? U.howto.from : U.screen };
        U.prevScreen = U.screen === 'help' ? U.prevScreen : U.screen;
        U.screen = 'help';
        break;
      case 'howtoGo':
        U.howto.page = Math.max(0, Math.min(PAGES.length - 1, Number(arg) || 0));
        break;
      case 'howtoDone':
        U.screen = U.howto.from && U.howto.from !== 'help' ? U.howto.from : 'title';
        break;
      case 'codex':
        if (U.modal) U.closeModal();
        if (U.screen !== 'codex') U.prevScreen = U.screen;
        U.screen = 'codex';
        break;
      case 'codex2Tab':
        U.codex2.tab = arg;
        break;
      case 'codexBack':
        U.screen = U.prevScreen && U.prevScreen !== 'codex' ? U.prevScreen : 'title';
        break;
      case 'codexCards':
        U.binder = Object.assign(U.binder || {}, { q: arg, el: 'all', page: 0, open: null });
        U.screen = 'cards';
        break;
      default:
        return false;
    }
    U.render();
    return true;
  };
  (U.ACTS = U.ACTS || []).push(U.guideAct);
  (U.INPUTS = U.INPUTS || []).push(U.guideInput);
  Object.assign((U.SCREENS = U.SCREENS || {}), { help: U.renderHelp, codex: U.renderCodex2 });
})((window.T = window.T || {}));
