/* ============================================================================
   TUMULT — THE DRAFT SCREEN (Frogma "Draft flow, playable", mix 1: Gallery, then a closer look; Shombith
   2026-11-22). Everything of a step laid out at once; any card, bloodline or pilot opens big on tap.
   The rules and the actions stay in core.js (draftAct); this file only draws. Browser only.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  const EL = T.ETHERIONS;
  const STEPS = [
    ['mode', 'Pilot'],
    ['species', 'Bloodlines'],
    ['packs', 'Packs'],
    ['up', 'Upgrade'],
  ];
  const squadOf = (run) => (run && run.party ? run.party.owner.length : 1);

  /* ── small pieces ── */
  const I = {
    chev: 'M9 6l6 6-6 6',
    back: 'M15 6l-6 6 6 6',
    x: 'M6 6l12 12M18 6L6 18',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    swap: 'M7 7h11l-3-3M17 17H6l3 3',
    auto: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
    undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
    info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    check: 'M5 12l5 5 9-10',
  };
  const ico = (k, s) =>
    `<svg width="${s || 16}" height="${s || 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${I[k]}"/></svg>`;
  const elCol = (k) => (EL[k] ? EL[k].color : '#e7edf2');
  const gem = (el) => `<span class="dr-gem" style="--g:${elCol(el)}">${U.icEl ? U.icEl(el, 'tiny') : ''}</span>`;

  /** Words of art in a face's text, in bold with their number: the card stays calm, the key facts stand out. */
  const KWS = [
    'Zone strike',
    'Circle down',
    'Hidden',
    'Shield',
    'Weakened',
    'Weaken',
    'Anchored',
    'Marked',
    'Mark',
    'Aimed',
    'Burst',
    'Melee',
    'Strike',
    'Heal',
    'Rooted',
    'Root',
    'Slowed',
    'Slow',
    'Pull',
    'Push',
    'Blink',
    'Exposed',
    'Guard',
    'Taunt',
    'Shove',
  ];
  const KRE = new RegExp('\\b(' + KWS.join('|') + ')( \\d+)?\\b', 'g');
  const bold = (text) => esc(text).replace(KRE, (m) => `<b>${m}</b>`);

  /** A stable number for a string, to vary a card's painting and its crop. */
  const hash = (s) => {
    let h = 0;
    for (const ch of String(s)) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
    return h;
  };
  /** A painting for a trait card: one of its own clade's pilots (that clade's head first), else none. */
  function cardPainting(c) {
    const all = U.PILOT_ART || [];
    let cand = all.filter((a) => c.sp === 'human' || a.clades.includes(c.sp));
    const own = cand.filter((a) => a.clades[0] === c.sp);
    if (own.length > 1 || (own.length && cand.length < 3)) cand = own;
    return cand.length ? cand[hash(c.name) % cand.length] : null;
  }
  /** The art at the top of a calm card: a painting cropped its own way, else the clade's head. */
  function cardArt(c) {
    const a = cardPainting(c);
    const src = a && U.sceneSrc ? U.sceneSrc(a) : null;
    if (src) {
      const h = hash(c.id);
      return `<span class="dr-pic" style="background-image:url(${src});background-position:${15 + (h % 70)}% ${20 + ((h >> 8) % 45)}%"></span>`;
    }
    return `<span class="dr-pic dr-headart">${U.icClade(c.sp, 'dr-bighead')}</span>`;
  }

  /** One face of a calm card: its cost, its text at the levels shown, and (upgrading) its level bars. */
  function face(c, fk, P, E, o) {
    const f = c[fk];
    if (!f) return '';
    const isE = T.isEthFace ? T.isEthFace(fk) : fk === 'E';
    const need = !isE ? 0 : c.pet && T.PET_ETH ? T.PET_ETH.indexOf(fk) + 1 : T.RULES.ETHEREAL_MIN_E;
    const elt = f.elt || c.el;
    const lv = isE ? E : P;
    const asleep = isE && (o.up || c.pet) && E < need;
    const txt = f.txt(P, asleep ? need : E);
    const col = isE ? elCol(elt) : '#00d4ff';
    const cost = `${f.ap || f.el ? '' : '0'}${f.ap ? f.ap + '<span>&nbsp;AP</span>' : ''}${f.ap && f.el ? '<span>&nbsp;+&nbsp;</span>' : ''}${f.el ? f.el + `<i style="color:${elCol(elt)}">${U.icEl ? U.icEl(elt, 'tiny') : '◆'}</i>` : ''}<span class="cd">&nbsp;· CD ${f.cd || 0}</span>${f.dur ? `<span class="cd">&nbsp;· Dur ${f.dur}</span>` : ''}`;
    let bars = '';
    let next = '';
    if (o.up && !c.gear && !(isE && c.pet)) {
      const segs = [1, 2, 3]
        .map((j) => {
          const d = j === lv ? -1 : j - lv;
          return `<button class="dr-sg${j <= lv ? ' on' : ''}${j === lv + 1 ? ' nx' : ''}" data-act="up" data-arg="${c.id}|${fk}|${d}" aria-label="Set ${fk} to ${j === lv ? lv - 1 : j}"></button>`;
        })
        .join('');
      const cap = asleep ? `Asleep · ${need} E wakes it` : `${fk} ${lv} / 3`;
      bars = `<div class="dr-lv">${segs}<span class="dr-lc${asleep ? ' z' : ''}">${cap}</span></div>`;
      if (o.next && lv < 3) {
        const nP = isE ? P : P + 1;
        const nE = isE ? Math.max(E + 1, need) : E;
        const now = txt;
        const then = f.txt(nP, nE);
        next = asleep
          ? `<p class="dr-nxt"><b>+1 E wakes it:</b> the face can be played.</p>`
          : then === now
            ? `<p class="dr-nxt dim">+1 ${fk} changes no number at this step.</p>`
            : `<p class="dr-nxt"><b>+1 ${fk}:</b> ${bold(then)}</p>`;
      }
    }
    const tip = U.faceTipHTML ? ` data-tip="${esc(U.faceTipHTML(c, fk, P, E))}"` : '';
    return `<div class="dr-face${asleep ? ' sl' : ''}" style="--lc:${col}"><div class="dr-fh"><span class="dr-ck"${tip}>${isE ? 'E' : 'P'}</span><b class="dr-fn">${esc(f.n)}</b><span class="dr-cost">${cost}</span></div><p class="dr-ft">${bold(txt)}</p>${bars}${next}</div>`;
  }

  /**
   * A calm card (round 2's "Gallery"): the painting with the name on it, then the two faces in plain words, the
   * keyword and its number in bold. o: { P, E, up (level bars), next ("what +1 buys"), flavor, look (an act|arg
   * the art opens), take (the Take button), clades, cls }
   */
  U.calmCard = function (cid, o) {
    o = o || {};
    const c = T.CARD[cid];
    const P = o.P || 0,
      E = o.E || 0;
    const sp = U.cladeIn ? U.cladeIn(c, o.clades) : c.sp;
    const kin = c.kin || (T.SPECIES[sp] ? T.SPECIES[sp].name : '');
    const star = c.sig >= 2 ? '<span class="dr-star" title="Signature trait">★</span>' : '';
    const look = o.look
      ? `<button class="dr-look" data-act="${o.look[0]}" data-arg="${esc(o.look[1])}" aria-label="Look closer at ${esc(c.name)}"></button>`
      : '';
    const faces = T.faceKeys(cid)
      .map((fk) => face(c, fk, P, E, o))
      .join('');
    return `<div class="dr-card ${o.cls || ''}" data-card="${cid}" style="--ec:${elCol((c.E && c.E.elt) || c.el)}"><div class="dr-ca">${cardArt(c)}<i class="dr-sh"></i><span class="dr-ccl">${esc(kin)}</span>${gem((c.E && c.E.elt) || c.el)}<div class="dr-cnm"><b>${esc(c.name)}</b>${star}${o.flavor !== false && c.flavor ? `<span class="dr-cfl">${esc(c.flavor)}</span>` : ''}</div>${look}</div><div class="dr-cb">${faces}</div>${o.bound ? `<div class="dr-bound">${o.bound} UP bound to this card</div>` : ''}</div>`;
  };

  /** A small tile of a card: the painting, the name, and (upgrading) its P and E as pips. */
  function tile(cid, h, act, arg, cls) {
    const c = T.CARD[cid];
    const pips = (n, col) => [0, 1, 2].map((j) => `<i class="${j < n ? 'on' : ''}" style="--lc:${col}"></i>`).join('');
    const pp = h
      ? `<span class="dr-tb"><span class="dr-pp"><span class="dr-ck sm" style="--lc:#00d4ff">P</span>${pips(T.heroP(h, cid), '#00d4ff')}</span>${c.E ? `<span class="dr-pp"><span class="dr-ck sm" style="--lc:${elCol(c.E.elt || c.el)}">E</span>${pips(T.heroE(h, cid), elCol(c.E.elt || c.el))}</span>` : ''}</span>`
      : '';
    return `<button class="dr-tile ${cls || ''}" data-act="${act}" data-arg="${esc(arg)}" style="--ec:${elCol((c.E && c.E.elt) || c.el)}" aria-label="${esc(c.name)}"><span class="dr-ca">${cardArt(c)}<i class="dr-sh"></i>${gem((c.E && c.E.elt) || c.el)}<span class="dr-cnm"><b>${esc(c.name)}</b>${c.sig >= 2 ? '<span class="dr-star">★</span>' : ''}</span></span>${pp}</button>`;
  }

  /** The painting a pilot of these clades wears, as a banner background (or nothing). */
  const sceneOf = (h) => {
    const a = U.pilotOf ? U.pilotOf(h) : null;
    const src = a && U.sceneSrc ? U.sceneSrc(a) : null;
    return { a, src };
  };
  const banner = (h, title, sub, cls) => {
    const { src } = sceneOf(h);
    return `<div class="dr-ban ${cls || ''}">${src ? `<span class="dr-bpic" style="background-image:url(${src})"></span>` : ''}<span class="dr-ring"></span><div class="dr-bt"><b>${esc(title)}</b><small>${sub}</small></div></div>`;
  };
  const go = (txt, sub, act, arg, off) =>
    `<button class="dr-go${off ? ' off' : ''}" data-act="${act}"${arg != null ? ` data-arg="${esc(arg)}"` : ''}${off ? ' disabled' : ''}><span><b>${txt}</b><small>${sub}</small></span>${ico('chev', 18)}</button>`;
  const backb = (label, act, arg, tip) =>
    `<button class="dr-back" data-act="${act}"${arg != null ? ` data-arg="${esc(arg)}"` : ''}${tip ? ` data-tip="${esc(tip)}"` : ''}>${ico('back', 16)}<span>${esc(label)}</span></button>`;
  const lean = (s) =>
    (T.SPECIES[s].lean || '')
      .split('/')
      .map((e) => `<i style="color:${elCol(e)}">${U.icEl ? U.icEl(e, 'tiny') : e}</i>`)
      .join('');
  const shortName = (n) =>
    n
      .replace(
        /^(Long-Eared|Red-Legged|Barn|Mimic|Tokay|Electric|Venus|Eurasian|Spotted|Ring-Tailed|Golden|Sea|Red|Bald|Red-tailed|Atlantic|Blue-Footed|Wild|Horned|Giant|Three-Toed|Praying|Brown|Field|Bighorn|Cordyceps) /,
        '',
      )
      .replace(' Mycelium', '');

  /* ── the top bar: the squad's seats, and where this pilot is in the draft ── */
  function topbar(d) {
    const run = U.run;
    const n = squadOf(run);
    const seats = [];
    for (let i = 0; i < n; i++) {
      const h = run.heroes[i];
      const cur = i === d.heroIdx;
      const sub = h
        ? h.species
            .slice(1)
            .map((s) => T.SPECIES[s].name)
            .join(' · ')
        : cur
          ? 'drafting'
          : 'next';
      seats.push(
        `<span class="dr-seat${h ? ' done' : cur ? ' on' : ''}"><b>${esc(h ? h.name : cur ? (d.hero && d.hero.name) || d.name : 'Pilot ' + (i + 1))}</b><small>${esc(sub)}</small></span>`,
      );
    }
    const at = Math.max(
      0,
      STEPS.findIndex((s) => s[0] === d.step),
    );
    const prog = STEPS.map(
      ([, l], i) => `<li class="${i === at ? 'on' : i < at ? 'done' : ''}"><i>${i + 1}</i><span>${l}</span></li>`,
    ).join('');
    const pp = STEPS.map((s, i) => `<li class="${i === at ? 'on' : i < at ? 'done' : ''}"></li>`).join('');
    return `<header class="dr-top"><span class="dr-brand">TUMULT</span><span class="dr-brand2">THE DRAFT</span><nav class="dr-seats" aria-label="Squad">${seats.join('')}</nav><ol class="dr-prog">${prog}</ol><ol class="dr-pprog" aria-hidden="true">${pp}</ol><span class="dr-tools"><button class="dr-ib" data-act="toggleSound" aria-label="Sound">${U.sound ? '🔊' : '🔇'}</button><button class="dr-ib" data-act="help" aria-label="Help">?</button></span></header>`;
  }

  /* ── step 1: how to build this pilot ── */
  function stepMode(d) {
    const run = U.run;
    const who = U.seatTag ? U.seatTag(d.heroIdx) : '';
    const free = (pb) => !run.heroes.some((h) => h && h.name === pb.name);
    const pre = T.PREBUILTS.filter(free).map((pb) => ({ pb, who: '', mine: false }));
    const made = U.madeHeroes ? U.madeHeroes().filter((x) => free(x.rec)) : [];
    const pcard = (x) => {
      const pb = x.pb || x.rec;
      const { src } = sceneOf({ id: pb.id, name: pb.name, species: pb.species });
      const clades = pb.species
        .slice(1)
        .map((s) => T.SPECIES[s].name)
        .join(' · ');
      const forget = x.mine
        ? `<button class="dr-x" data-act="forgetMade" data-arg="${esc(pb.id)}" data-tip="Take ${esc(pb.name)} off this device's list." aria-label="Forget ${esc(pb.name)}">${ico('x', 12)}</button>`
        : '';
      return `<div class="dr-pcard"><button class="dr-pc" data-act="preLook" data-arg="${esc(pb.id)}" aria-label="Look closer at ${esc(pb.name)}">${src ? `<span class="dr-pa" style="background-image:url(${src})"></span>` : ''}<span class="dr-pn"><b>${esc(pb.name)}</b><small>${esc(clades)}</small>${x.who ? `<small class="dr-by">Made by ${esc(x.who)}</small>` : ''}</span></button><button class="dr-fly" data-act="prebuilt" data-arg="${esc(pb.id)}">Fly</button>${forget}</div>`;
    };
    const madeHTML = made.length
      ? `<div class="dr-lab" style="margin-top:18px">Pilots players made · ${U.heroesShared && U.heroesShared() ? 'shared with everyone on this page' : 'kept on this device'}</div><div class="dr-pgrid">${made.map((x) => pcard({ rec: x.rec, who: x.who, mine: x.mine })).join('')}</div>`
      : '';
    const out =
      U.net && U.net.online()
        ? backb('Leave game', 'netLeave')
        : d.heroIdx > 0 && run.heroes[d.heroIdx - 1]
          ? backb(
              'Back to ' + run.heroes[d.heroIdx - 1].name,
              'draftPrev',
              null,
              'Back to the pilot before, as you left them.',
            )
          : backb('Back to the title', 'draftQuit');
    return `<div class="dr-hdr rise"><div><h1 class="dr-h1">Pilot ${d.heroIdx + 1} ${who}· how will you build them?</h1><p class="dr-lede">Every pilot is Human plus two bloodlines, with ${T.RULES.START_CARDS} trait cards and ${T.RULES.START_UP || 6} Upgrade Points. You grow to nine cards over the run.</p></div></div>
      <div class="dr-build"><button class="dr-opt rise" data-act="draftMode" data-arg="draft"><span class="dr-rec">Recommended</span><span class="dr-fan"><i></i><i></i><i></i><i></i></span><b>Draft from packs</b><span class="dr-ot">Choose two bloodlines, then take 1 card of 4, six times: a real limited draft across your three pools.</span><span class="dr-take">Start drafting ${ico('chev', 16)}</span></button>
      <div class="rise"><div class="dr-lab">Or fly a ready-made pilot · tap one for a closer look</div><div class="dr-pgrid">${pre.map(pcard).join('')}</div>${madeHTML}</div></div>
      <div class="dr-foot">${out}</div>`;
  }

  /* ── step 2: two bloodlines ── */
  function stepSpecies(d) {
    const f = d.filter || 'all';
    const filters = [
      ['all', 'All'],
      ['M', 'Mass'],
      ['C', 'Charge'],
      ['S', 'Space'],
      ['T', 'Time'],
    ]
      .map(
        ([k, l]) =>
          `<button class="dr-fb${f === k ? ' on' : ''}" data-act="draftFilter" data-arg="${k}">${k === 'all' ? '' : `<i style="color:${elCol(k)}">${U.icEl ? U.icEl(k, 'tiny') : ''}</i>`}${l}</button>`,
      )
      .join('');
    const list = T.SPECIES_ORDER.filter((s) => s !== 'human' && (f === 'all' || T.SPECIES[s].lean.split('/')[0] === f));
    const heads = list
      .map((s) => {
        const i = d.species.indexOf(s);
        return `<div class="dr-hd${i >= 0 ? ' sel' : ''}"><button class="dr-hb" data-act="pickSpecies" data-arg="${s}" aria-label="${esc(T.SPECIES[s].name)}">${U.icClade(s, 'dr-hp')}<span class="dr-hn">${esc(shortName(T.SPECIES[s].name))}</span><span class="dr-lean">${lean(s)}</span>${i >= 0 ? `<span class="dr-badge">${i + 1}</span>` : ''}</button><button class="dr-peek" data-act="cladeLook" data-arg="${s}" aria-label="Look closer at ${esc(T.SPECIES[s].name)}">${ico('eye', 14)}</button></div>`;
      })
      .join('');
    const h = { name: d.name, species: ['human'].concat(d.species) };
    const { a } = sceneOf(h);
    const note = !d.species.length
      ? 'Pick two bloodlines. The portrait follows them.'
      : a
        ? U.isExact(a, h)
          ? 'An exact painting of this pair'
          : 'Stand-in painting: ' + a.clades.map((x) => (T.SPECIES[x] ? T.SPECIES[x].name : x)).join(' and ')
        : '';
    const slots = [0, 1]
      .map((i) => {
        const s = d.species[i];
        return s
          ? `<button class="dr-slot full" data-act="pickSpecies" data-arg="${s}" data-tip="Take ${esc(T.SPECIES[s].name)} out">${U.icClade(s, 'dr-slh')}<span>${esc(T.SPECIES[s].name)}</span></button>`
          : `<span class="dr-slot empty"><span>${i ? 'Second bloodline' : 'First bloodline'}</span></span>`;
      })
      .join('');
    const sig = d.species
      .map((s) =>
        T.cardsOf(s)
          .filter((c) => c.sp === s)
          .sort((x, y) => y.sig - x.sig)
          .slice(0, 2)
          .map((c) => tile(c.id, null, 'cladeLook', s, 'sm'))
          .join(''),
      )
      .join('');
    const line = ['human']
      .concat(d.species)
      .map((s) => T.SPECIES[s].name)
      .join(' · ');
    return `<div class="dr-hdr rise dr-hdr-bl"><div><h1 class="dr-h1">Choose two bloodlines</h1><p class="dr-lede">Human is always the third. Each bloodline brings its own traits; the eye shows them.</p></div></div>
      <div class="dr-bl rise"><div class="dr-flt">${filters}<span class="dr-lab dr-cnt">${list.length} bloodlines</span></div><div class="dr-hgrid">${heads}</div></div>
      <aside class="dr-me rise"><div class="dr-lab">Your pilot</div><label class="dr-nf"><span>Name</span><input id="heroName" value="${esc(d.name)}" maxlength="24" autocomplete="off"></label>
        ${banner(h, d.name, esc(line), 'dr-pair')}<span class="dr-note">${esc(note)}</span>
        <div class="dr-slots"><span class="dr-slot hum"><span class="dr-hum">H</span><span>Human</span></span>${slots}</div>
        ${sig ? `<div class="dr-lab">Signature traits you could draft</div><div class="dr-sig">${sig}</div>` : ''}<span class="dr-fill"></span>
        ${go('Open the first pack', `${d.species.length} of 2 bloodlines chosen`, 'openPacks', null, d.species.length !== 2)}</aside>
      <div class="dr-foot">${backb('Back', 'draftBack')}</div>`;
  }

  /* ── step 3: the packs ── */
  function kitBar(h) {
    const N = T.RULES.START_CARDS;
    const slots = [];
    for (let k = 0; k < N; k++) {
      const cid = h.cards[k];
      if (cid) {
        const c = T.CARD[cid];
        slots.push(
          `<span class="dr-ks full" style="--ec:${elCol((c.E && c.E.elt) || c.el)}" data-tip="${esc(c.name)}">${cardArt(c)}<span class="dr-ksn">${esc(c.name)}</span></span>`,
        );
      } else if (k === h.cards.length) slots.push(`<span class="dr-ks nx">pick ${k + 1}</span>`);
    }
    const counts = h.species
      .map(
        (s) =>
          `<span class="dr-cntc${T.cladeCount(h, s) >= 3 ? ' full' : ''}" data-tip="${esc(T.SPECIES[s].name)}: ${T.cladeCount(h, s)} of 3">${U.icClade(s, 'dr-cp')}<b>${T.cladeCount(h, s)}</b>/3</span>`,
      )
      .join('');
    return `<div class="dr-kit"><span class="dr-kl">Kit <b>${h.cards.length}</b>/${N}</span><div class="dr-kslots">${slots.join('')}</div><div class="dr-cnts">${counts}</div></div>`;
  }
  function stepPacks(d) {
    const h = d.hero;
    const cards = d.pack
      .map(
        (cid, i) =>
          `<div class="dr-pk rise">${U.calmCard(cid, { clades: h.species, look: ['cardLook', i] })}<button class="dr-take" data-act="pickCard" data-arg="${cid}">Take ${esc(T.CARD[cid].name)}</button></div>`,
      )
      .join('');
    return `<div class="dr-hdr rise"><div><h1 class="dr-h1">Pick ${d.picks + 1} of ${T.RULES.START_CARDS}</h1><p class="dr-lede">One card from this pack joins ${esc(h.name)}’s kit. Tap the art for a closer look.</p></div><span class="dr-sp"></span><button class="dr-tb" data-act="rerollPack" data-tip="Costs nothing in this version; use it if a pack has nothing for you.">${ico('swap')}<span>Pass this pack</span></button></div>
      <div class="dr-pack">${cards}</div>
      <div class="dr-kitwrap">${kitBar(h)}</div>
      <div class="dr-foot">${backb('Back to bloodlines', 'draftBack', 'species', 'Choose other bloodlines. The cards picked so far are put back.')}</div>`;
  }

  /* ── step 4: Upgrade Points ── */
  function upBlock(h) {
    const orbs = [];
    const all = Math.max(h.upUnspent, T.RULES.START_UP || 6);
    for (let j = 0; j < all; j++) orbs.push(`<i class="${j < h.upUnspent ? 'f' : ''}"></i>`);
    return `<div class="dr-upp"><span class="dr-n">${h.upUnspent}</span><span class="dr-t">UP<br>left</span><span class="dr-ob">${orbs.join('')}</span></div>`;
  }
  const awakeN = (h) => h.cards.filter((cid) => T.heroE(h, cid) >= T.RULES.ETHEREAL_MIN_E).length;
  function confirmLabel(d) {
    const h = d.hero;
    const more = d.heroIdx < squadOf(U.run) - 1 && !(U.net && U.net.online());
    const after = more ? `then draft pilot ${d.heroIdx + 2}` : 'then set out';
    const carry = h.upUnspent > 0 ? `${h.upUnspent} UP carry over · ` : '';
    return go(`Confirm ${esc(h.name)}`, carry + after, 'confirmHero');
  }
  function stepUp(d) {
    const h = d.hero;
    const cards = h.cards
      .map(
        (cid, i) =>
          `<div class="rise">${U.calmCard(cid, { P: T.heroP(h, cid), E: T.heroE(h, cid), up: true, flavor: false, clades: h.species, bound: T.boundLeft(h, cid), look: ['cardLook', i] })}</div>`,
      )
      .join('');
    const rules = `<span class="dr-rb" tabindex="0">${ico('info')}<span>How P and E work</span><span class="dr-rtip"><b class="cy">P</b> deepens the physical face’s numbers, reliable and paid in AP. <b style="color:#f2c14e">E</b> awakens the ethereal face (it can’t be played until its card has E ${T.RULES.ETHEREAL_MIN_E}) and scales its capability, something P can never buy. Every pilot sets out with at least ${T.RULES.START_AWAKE} cards awake. Caps: P 3, E 3 per card.</span></span>`;
    const q = U.pilotQuestion ? U.pilotQuestion(h, d) : '';
    return `<div class="dr-hdr rise dr-hdr-up"><div><h1 class="dr-h1">Spend ${esc(h.name)}’s Upgrade Points</h1><p class="dr-lede">Tap a bar to set a level. Tap the art to see what the next point buys.</p></div></div>
      <div class="dr-up">${cards}</div>
      <aside class="dr-side rise"><div class="dr-row">${upBlock(h)}<span class="dr-tools2"><button class="dr-tb" data-act="autoUp">${ico('auto')}<span>Auto</span></button><button class="dr-tb" data-act="resetUp">${ico('undo')}<span>Reset</span></button></span></div>
        <div class="dr-row"><span class="dr-rdy${awakeN(h) >= T.RULES.START_AWAKE ? '' : ' warn'}">${ico('check', 15)}${awakeN(h)} of ${h.cards.length} awake</span>${rules}</div>
        ${q ? `<div class="dr-q">${q}</div>` : ''}</aside>
      <div class="dr-foot">${backb('Back', 'draftBack', null, 'Build this pilot another way: a different pre-made pilot, or a fresh draft.')}<span class="dr-sp"></span>${confirmLabel(d)}</div>`;
  }

  /* ── the closer look: any card, bloodline or pilot, big ── */
  function flow(ids, at, mk) {
    const n = ids.length;
    return ids
      .map((cid, i) => {
        let dd = i - at;
        if (dd > n / 2) dd -= n;
        if (dd < -n / 2) dd += n;
        const ad = Math.abs(dd);
        const st = `transform:translateX(${dd * 360}px) translateZ(${-ad * 160}px) rotateY(${dd * -24}deg);opacity:${ad > 1 ? 0 : dd ? 0.55 : 1};z-index:${10 - ad}`;
        return `<div class="dr-fl${dd ? ' side' : ' mid'}" style="${st}">${mk(cid, dd === 0)}${dd ? `<button class="dr-flhit" data-act="lookTo" data-arg="${i}" aria-label="${esc(T.CARD[cid].name)}"></button>` : ''}</div>`;
      })
      .join('');
  }
  const arw = (act, arg, dir, label) =>
    `<button class="dr-arw" data-act="${act}" data-arg="${arg}" aria-label="${label}">${ico(dir, 20)}</button>`;
  function overlay(d) {
    const L = d.look;
    if (!L) return '';
    let body = '';
    if (L.kind === 'card' && d.step === 'packs' && d.pack.length) {
      const i = Math.min(L.i, d.pack.length - 1);
      const cid = d.pack[i];
      body = `<div class="dr-flow">${flow(d.pack, i, (id) => U.calmCard(id, { clades: d.hero.species, cls: 'big' }))}</div>
        <div class="dr-obar">${arw('lookStep', -1, 'back', 'Previous card')}<button class="dr-take big" data-act="pickCard" data-arg="${cid}">Take ${esc(T.CARD[cid].name)}</button>${arw('lookStep', 1, 'chev', 'Next card')}</div>`;
    } else if (L.kind === 'card' && d.step === 'up' && d.hero) {
      const h = d.hero;
      const i = Math.min(L.i, h.cards.length - 1);
      body = `<div class="dr-flow up">${flow(h.cards, i, (id, mid) => U.calmCard(id, { P: T.heroP(h, id), E: T.heroE(h, id), up: mid, next: mid, flavor: false, clades: h.species, cls: 'big' }))}</div>
        <div class="dr-obar">${arw('lookStep', -1, 'back', 'Previous card')}${upBlock(h)}${arw('lookStep', 1, 'chev', 'Next card')}</div>`;
    } else if (L.kind === 'clade' && T.SPECIES[L.id]) {
      const s = L.id;
      const sp = T.SPECIES[s];
      const picked = d.species.includes(s);
      const word = shortName(sp.name);
      const pickTxt = picked ? 'Remove ' + word : d.species.length < 2 ? 'Choose ' + word : 'Swap in ' + word;
      const sig = T.cardsOf(s)
        .filter((c) => c.sp === s)
        .sort((x, y) => y.sig - x.sig)
        .slice(0, 3);
      const leanTxt = sp.lean
        .split('/')
        .map(
          (e) => `<span style="color:${elCol(e)}">${U.icEl ? U.icEl(e, 'tiny') : ''}${EL[e] ? EL[e].name : e}</span>`,
        )
        .join('');
      body = `<div class="dr-ocl"><div class="dr-ocl-l">${U.icClade(s, 'dr-bighead2')}<div class="dr-row c">${arw('cladeStep', -1, 'back', 'Previous bloodline')}${arw('cladeStep', 1, 'chev', 'Next bloodline')}</div></div>
        <div class="rise"><div class="dr-lab">Bloodline</div><h1 class="dr-h1 xl">${esc(sp.name)}</h1><p class="dr-lede big">${esc(sp.tagline)}</p>
        <div class="dr-row" style="margin-top:10px"><span class="dr-leanb">${leanTxt}</span><span class="dr-sp"></span>${d.step === 'species' ? `<button class="dr-take${picked ? ' in' : ''}" data-act="pickSpecies" data-arg="${s}">${esc(pickTxt)}</button>` : ''}</div>
        <div class="dr-lab" style="margin-top:16px">Its signature traits</div><div class="dr-clsig">${sig.map((c) => U.calmCard(c.id, { flavor: false })).join('')}</div></div></div>`;
    } else if (L.kind === 'pre') {
      const free = (pb) => !U.run.heroes.some((h) => h && h.name === pb.name);
      const list = T.PREBUILTS.filter(free).concat((U.madeHeroes ? U.madeHeroes() : []).map((x) => x.rec).filter(free));
      const i = Math.max(
        0,
        list.findIndex((p) => p.id === L.id),
      );
      const pb = list[i];
      if (pb) {
        const h = { id: pb.id, name: pb.name, species: pb.species };
        const clades = pb.species
          .slice(1)
          .map((s) => T.SPECIES[s].name)
          .join(' · ');
        const cards = pb.cards
          .map((cid) => {
            const c = T.CARD[cid];
            return `<span><i style="background:${elCol((c.E && c.E.elt) || c.el)}"></i>${esc(c.name)}</span>`;
          })
          .join('');
        const prev = list[(i + list.length - 1) % list.length].id;
        const next = list[(i + 1) % list.length].id;
        body = `<div class="dr-opre">${banner(h, pb.name, esc(pb.title || ''), 'rise')}
          <div class="rise dr-col"><div class="dr-lab">Ready-made pilot</div><h1 class="dr-h1 xl">${esc(pb.name)}</h1><p class="dr-lede">Human · ${esc(clades)}</p>${pb.blurb ? `<p class="dr-lede hi">${esc(pb.blurb)}</p>` : ''}
          <div class="dr-plist">${cards}</div><span class="dr-fill"></span>
          <div class="dr-row">${arw('preLook', prev, 'back', 'Previous pilot')}${arw('preLook', next, 'chev', 'Next pilot')}<span class="dr-sp"></span>${go('Fly ' + esc(pb.name), 'a ready-made pilot, points already spent', 'prebuilt', pb.id)}</div></div></div>`;
      }
    }
    if (!body) return '';
    return `<div class="dr-ovl"><button class="dr-tb dr-ovx" data-act="lookClose">${ico('x')}<span>Close</span></button>${body}</div>`;
  }

  /** The draft screen. `wait` (online, waiting for the other player) keeps its own room. */
  U.renderDraftScreen = function () {
    const d = U.draft;
    const run = U.run;
    if (d.step === 'wait') {
      const other = run.party.players.find((p, s) => !run.heroes[s]);
      const body = U.waitingRoom
        ? U.waitingRoom(run)
        : `<div class="panel"><h3>Your pilot is ready</h3><p class="dim">Waiting for ${esc(other ? other.name : 'the other player')} to finish drafting…</p></div>`;
      return `<div class="wrap">${U.header('The Draft')}${body}</div>`;
    }
    const body =
      d.step === 'mode'
        ? stepMode(d)
        : d.step === 'species'
          ? stepSpecies(d)
          : d.step === 'packs'
            ? stepPacks(d)
            : stepUp(d);
    // the sea behind: the painting this pilot will wear, blurred
    const h = d.hero || { name: d.name, species: ['human'].concat(d.species || []) };
    let { src } = sceneOf(h);
    if (!src && run.heroes.length) src = sceneOf(run.heroes[run.heroes.length - 1]).src;
    return `<div class="dr dr-s-${d.step}">${src ? `<div class="dr-bgs" style="background-image:url(${src})"></div>` : ''}<div class="dr-veil"></div>${topbar(d)}<main class="dr-main">${body}</main>${overlay(d)}</div>`;
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
