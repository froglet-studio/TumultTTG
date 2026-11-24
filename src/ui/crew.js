/* ============================================================================
   TUMULT — THE PILOTS TAB (browser only)
   Your crew as a grid of pilots in their painted worlds (Frogma "Pilots 2"),
   one pilot's page (the dossier), and Make a pilot in four steps: two clades
   (head first), a name, callsign and domain, three questions on paper, and
   the reveal as a relic. A made pilot is kept with the others players build
   (tumult_v2_heroes, T.keepMade), with a starting kit chosen for it; Draft
   their cards builds the kit in a new expedition's draft instead.
   Nothing here changes a rule: a made pilot is a recipe like any other.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) => U.esc(s);

  U.DOMAINS = [
    { id: 'jade', name: 'Jade', c: '#2fbf8a' },
    { id: 'ruby', name: 'Ruby', c: '#e8475e' },
    { id: 'gold', name: 'Gold', c: '#f0c35a' },
  ];
  const DOMAIN_BY = Object.fromEntries(U.DOMAINS.map((d) => [d.id, d]));
  const cladesOf = (pb) => pb.species.filter((s) => s !== 'human');
  const cladeName = (s) => (T.SPECIES[s] ? T.SPECIES[s].name : s);

  /**
   * Everyone in the crew: the ready-made pilots, then the ones made on this device and those others shared.
   * [{ pb, made, mine, who }]
   */
  U.crewList = function () {
    const out = T.PREBUILTS.map((pb) => ({ pb, made: false, mine: false }));
    (U.madeHeroes ? U.madeHeroes() : T.loadMade().map((rec) => ({ rec, who: 'you', mine: true }))).forEach((x) =>
      out.push({ pb: x.rec, made: true, mine: x.mine, who: x.who }),
    );
    return out;
  };
  const byId = (id) => U.crewList().find((x) => x.pb.id === id);
  /** The painting a crew member is shown with, and whether it is exactly theirs. */
  function artOf(pb) {
    const h = { id: pb.id, name: pb.name, species: pb.species };
    const a = U.artForPair(cladesOf(pb));
    return { a, exact: U.isExact(a, h), scene: U.sceneSrc(a), face: U.portraitSrc(a) };
  }
  /** A crew member's callsign: the one they chose, else their painting's when it is exactly theirs. */
  function callsignOf(pb) {
    if (pb.callsign) return pb.callsign;
    const art = artOf(pb);
    return art.exact ? U.callsignOf(art.a) : '';
  }
  /** Their full name: the painted pilot's when the painting is theirs and shares the first name. */
  function fullName(pb) {
    const art = artOf(pb);
    return art.exact && art.a.name.split(' ')[0] === pb.name ? art.a.name : pb.name;
  }
  /** Whether a crew member is flying in the expedition on now. */
  const flying = (pb) =>
    !!(
      U.run &&
      !U.run.over &&
      (U.run.heroes || []).some((h) => h && (h.madeId === pb.id || String(h.id).startsWith(pb.id + '_')))
    );
  /** "Otter head · Eel": the head clade first, then the feature. */
  const pairLine = (pb) => {
    const [a, b] = cladesOf(pb);
    return `${esc(cladeName(a))} head · ${esc(cladeName(b))}`;
  };
  /** The cards a crew member leads with: signatures first. */
  const leading = (pb, n) =>
    pb.cards
      .slice()
      .sort((x, y) => T.CARD[y].sig - T.CARD[x].sig)
      .slice(0, n);
  const lvl = (pb, c) => (pb.up && pb.up[c]) || [0, 0];

  /* ───────────── the crew grid ───────────── */
  U.crew = U.crew || { filter: 'all', sel: null, open: null };
  const FILTERS = [
    ['all', 'Everyone'],
    ['ready', 'Ready-made'],
    ['mine', 'Made by you'],
    ['flying', 'On expedition'],
  ];
  function tile(x, sel) {
    const pb = x.pb;
    const art = artOf(pb);
    const cs = callsignOf(pb);
    return `<button class="crew-tile${sel ? ' on' : ''}" data-act="crewSel" data-arg="${esc(pb.id)}" aria-pressed="${sel}">${
      art.scene
        ? `<span class="ct-art" style="background-image:url(${art.scene})"></span>`
        : `<span class="ct-art none">${cladesOf(pb)
            .map((s) => U.icClade(s))
            .join('')}</span>`
    }<span class="ct-veil"></span>${flying(pb) ? '<span class="ct-badge">On expedition</span>' : x.made ? `<span class="ct-badge made">${x.mine ? 'Made by you' : 'Made by ' + esc(x.who || 'a player')}</span>` : ''}<span class="ct-text">${cs ? `<span class="ct-call">${esc(cs)}</span>` : ''}<b>${esc(fullName(pb))}</b><span class="ct-pair">${cladesOf(pb).map(cladeName).map(esc).join(' · ')}</span></span></button>`;
  }
  /** The side panel: the selected pilot, their signature cards, and the ways on. */
  function side(x) {
    const pb = x.pb;
    const art = artOf(pb);
    const cs = callsignOf(pb);
    const blurb = pb.blurb || (pb.story && pb.story[0] ? pb.story[0] : '');
    return `<aside class="crew-side"><div class="cs-art"${art.scene ? ` style="background-image:url(${art.scene})"` : ''}></div><div class="cs-body">${cs ? `<span class="eyebrow">${esc(cs)}${pb.domain && DOMAIN_BY[pb.domain] ? ' · ' + esc(DOMAIN_BY[pb.domain].name) : ''}</span>` : ''}<h2>${esc(fullName(pb))}</h2><div class="cs-pair">${pairLine(pb)}${art.exact ? '' : ' <span class="dim small">(stand-in painting)</span>'}</div>${blurb ? `<p>${esc(blurb)}</p>` : ''}
      <div class="lab">Signature cards</div><div class="cs-cards">${leading(pb, 3)
        .map((c) => U.relicMini(c, { clades: pb.species, P: lvl(pb, c)[0], E: lvl(pb, c)[1] }))
        .join('')}</div>
      <div class="cs-btns"><button class="cta" data-act="crewFly" data-arg="${esc(pb.id)}" data-tip="Start a new expedition with ${esc(pb.name)} in the squad">Choose</button><button class="ghost" data-act="crewOpen" data-arg="${esc(pb.id)}">Dossier</button></div></div></aside>`;
  }
  U.renderPilots = function () {
    const c = U.crew;
    const all = U.crewList();
    const list = all.filter((x) =>
      c.filter === 'ready'
        ? !x.made
        : c.filter === 'mine'
          ? x.made && x.mine
          : c.filter === 'flying'
            ? flying(x.pb)
            : true,
    );
    const sel = all.find((x) => x.pb.id === c.sel) || list[0] || all[0];
    const chips = FILTERS.map(
      ([id, name]) =>
        `<button class="${c.filter === id ? 'on' : ''}" data-act="crewFilter" data-arg="${id}" aria-pressed="${c.filter === id}">${esc(name)}</button>`,
    ).join('');
    const grid = list.length
      ? list.map((x) => tile(x, sel && x.pb.id === sel.pb.id)).join('')
      : `<div class="crew-empty">${U.emptyState(
          c.filter === 'mine'
            ? {
                icon: '+',
                tone: 'green',
                title: 'No pilots made yet',
                text: 'Make one from two clades and a name. They join this crew and can fly any expedition.',
                act: 'makePilot',
                label: 'Make a pilot',
              }
            : {
                icon: '⛵',
                tone: 'cyan',
                title: 'Nobody is out on the route',
                text: 'Choose a pilot and start an expedition.',
                act: 'crewFilter',
                arg: 'all',
                label: 'Show everyone',
              },
        )}</div>`;
    return U.shell(
      'pilots',
      `<div class="page crew"><div class="pg-head"><h1>Your crew</h1><div class="chips" role="group" aria-label="Show">${chips}</div><button class="ghost dashed right" data-act="makePilot">+ Make a pilot</button></div>
      <div class="crew-cols"><div class="crew-grid">${grid}</div>${sel ? side(sel) : ''}</div></div>`,
    );
  };

  /* ───────────── one pilot's page ───────────── */
  U.renderPilot = function () {
    const x = byId(U.crew.open);
    if (!x) {
      U.screen = 'pilots';
      return U.renderPilots();
    }
    const pb = x.pb;
    const art = artOf(pb);
    const cs = callsignOf(pb);
    const dom = pb.domain && DOMAIN_BY[pb.domain];
    const probe = { up: pb.up || {}, bound: pb.bound || {}, cards: pb.cards, upUnspent: pb.spare || 0 };
    const level = pb.runs ? T.pilotLevel(probe) : 1;
    const subj = ['hero:' + pb.id].concat(cs ? ['pilot:' + cs] : []);
    const notes = T.loadCanon().filter((r) => subj.includes(r.subject));
    const story = (pb.story || [])
      .map((a, i) =>
        a
          ? `<div class="pp-q"><span class="lab">${esc(QUESTIONS[i].replace('{name}', pb.name))}</span><p>${esc(a)}</p></div>`
          : '',
      )
      .join('');
    const kit = pb.cards
      .map((c) => U.relicMini(c, { clades: pb.species, P: lvl(pb, c)[0], E: lvl(pb, c)[1] }))
      .join('');
    const forget =
      x.made && x.mine
        ? `<button class="ghost danger" data-act="crewForget" data-arg="${esc(pb.id)}">${U.crew.forgetting === pb.id ? 'Really let them go?' : 'Let them go'}</button>`
        : '';
    return U.shell(
      'pilots',
      `<div class="page pilot-page"><div class="pp-hero"${art.scene ? ` style="background-image:url(${art.scene})"` : ''}><div class="pp-veil"></div><div class="pp-title">${cs ? `<span class="eyebrow"${dom ? ` style="color:${dom.c}"` : ''}>${esc(cs)}${dom ? ' · ' + esc(dom.name) + ' domain' : ''}</span>` : ''}<h1>${esc(fullName(pb))}</h1><div class="pp-pair">${cladesOf(
        pb,
      )
        .map((s) => `${U.icClade(s)} ${esc(cladeName(s))}`)
        .join(' · ')} · human</div>${pb.title ? `<div class="dim">${esc(pb.title)}</div>` : ''}</div></div>
      <div class="pp-cols"><section><div class="pp-facts"><span><b>Level ${level}</b></span><span>${pb.runs ? pb.runs + ' expedition' + (pb.runs > 1 ? 's' : '') : 'No expeditions yet'}</span><span>${pb.cards.length} traits</span>${art.exact ? '' : `<span class="dim">Painting: stand-in (${esc(art.a ? art.a.name : 'none')})</span>`}</div>
        ${pb.blurb ? `<p class="pp-blurb">${esc(pb.blurb)}</p>` : ''}${story}
        <div class="lab">Kit</div><div class="pp-kit">${kit}</div></section>
        <aside><div class="lab">Canon about ${esc(pb.name)}</div>${notes.length ? `<div class="pp-notes">${notes.map((r) => `<div class="pin-note ${r.status === 'canon' ? 'canon' : ''}"><span>${esc(r.claim || '♥')}</span><span class="pn-tag">${r.status === 'canon' ? 'Canon' : 'Proposed'}</span></div>`).join('')}</div>` : '<p class="dim small">Nothing written about them yet. Answers you give in play land here.</p>'}
        <div class="pp-btns"><button class="cta" data-act="crewFly" data-arg="${esc(pb.id)}">Choose for an expedition</button><button class="ghost" data-act="tab" data-arg="pilots">Back to the crew</button>${forget}</div></aside></div></div>`,
    );
  };

  /* ───────────── make a pilot ───────────── */
  const QUESTIONS = ['Where did {name} learn to fly?', 'What do they never do?', 'Who do they owe?'];
  const FIRST = ['Saro', 'Velin', 'Tamsa', 'Orrin', 'Kaela', 'Doro', 'Ysel', 'Brannoc', 'Imra', 'Lio', 'Pell', 'Wenna'];
  const PRE = ['Tide', 'Salt', 'Reed', 'Ash', 'Moss', 'Brine', 'Kelp', 'Stone', 'Fog', 'Gull'];
  const SUF = ['whistle', 'hollow', 'ward', 'wright', 'bloom', 'keel', 'reach', 'mere', 'song', 'gate'];
  const CALLS = [
    'WHISTLE',
    'RIPTIDE',
    'LANTERN',
    'KESTREL',
    'ANCHOR',
    'DRIFT',
    'EMBER',
    'SPINDLE',
    'BRINE',
    'COMPASS',
    'SKIFF',
    'MARLIN',
    'TALLY',
    'CINDER',
  ];
  const nameAt = (i) => `${FIRST[i % FIRST.length]} ${PRE[(i * 7 + 3) % PRE.length]}${SUF[(i * 5 + 1) % SUF.length]}`;
  const callsAt = (i) => [0, 1, 2].map((k) => CALLS[(i * 3 + k * 5) % CALLS.length]);
  function newMaker() {
    const i = T.loadMade().length + T.PREBUILTS.length;
    return {
      step: 1,
      clades: [],
      name: nameAt(i),
      sug: i,
      callsign: callsAt(i)[0],
      own: '',
      domain: 'jade',
      story: ['', '', ''],
      canon: true,
      q: '',
    };
  }
  const STEPS = ['Clades', 'Name', 'Story', 'Reveal'];
  function steps(m) {
    return `<ol class="mk-steps">${STEPS.map((s, i) => `<li class="${m.step === i + 1 ? 'on' : m.step > i + 1 ? 'done' : ''}"><button data-act="makerStep" data-arg="${i + 1}" ${i + 1 > maxStep(m) ? 'disabled' : ''}>${i + 1} ${esc(s)}</button></li>`).join('')}</ol>`;
  }
  const maxStep = (m) => (m.clades.length < 2 ? 1 : !m.name.trim() ? 2 : 4);
  /** The made pilot as a crew member would be: the recipe the reveal shows, before it has a kit. */
  const probeOf = (m) => ({ id: 'maker', name: m.name.trim() || 'Your pilot', species: ['human'].concat(m.clades) });
  function preview(m) {
    const h = probeOf(m);
    const a = m.clades.length ? U.artForPair(m.clades) : null;
    const exact = a && U.isExact(a, h);
    const src = U.portraitSrc(a);
    const line =
      m.clades.length === 2
        ? `${esc(cladeName(m.clades[0]))} head · ${esc(cladeName(m.clades[1]).toLowerCase())} feature`
        : m.clades.length
          ? `${esc(cladeName(m.clades[0]))} head · pick a second`
          : 'Pick a head clade';
    const note = !a
      ? 'Pick two clades. The nearest painting stands in until yours is painted.'
      : exact
        ? `This pair has a painting: ${a.name}.`
        : `No painting for this pair yet; this is the closest one (${a.clades.map(cladeName).join(' · ').toLowerCase()}). Yours is painted when the pair is.`;
    return `<aside class="mk-preview"><span class="lab">Preview · nearest painting</span><div class="mk-face">${src ? `<img src="${src}" alt="">` : ''}</div><h3>${line}</h3><p class="dim small">${esc(note)}</p><div class="chips static">${m.clades.map((s) => `<span>${esc(cladeName(s))}: ${esc(T.SPECIES[s].tagline || '')}</span>`).join('')}</div><button class="cta" data-act="makerStep" data-arg="2" ${m.clades.length === 2 ? '' : 'disabled'}>Next: name ▶</button></aside>`;
  }
  function stepClades(m) {
    const q = m.q.trim().toLowerCase();
    const groups = {};
    T.SPECIES_ORDER.filter((s) => s !== 'human' && T.cardsOf(s).length)
      .filter(
        (s) => !q || cladeName(s).toLowerCase().includes(q) || (T.SPECIES[s].branch || '').toLowerCase().includes(q),
      )
      .forEach((s) =>
        (groups[T.SPECIES[s].branch || 'Others'] = groups[T.SPECIES[s].branch || 'Others'] || []).push(s),
      );
    // groups in the order of the tree (src/data/taxonomy.js), each headed by its common and scientific name
    const order = (T.TAXON_ORDER || []).map((id) => T.TAXA[id]).filter((x) => x.show);
    const sci = (br) => (order.find((x) => x.name === br) || {}).sci;
    const rank = (br) => {
      const i = order.findIndex((x) => x.name === br);
      return i < 0 ? order.length : i;
    };
    const grid = Object.entries(groups)
      .sort((a, b) => rank(a[0]) - rank(b[0]))
      .map(
        ([br, list]) =>
          `<div class="mk-branch"><span class="lab">${esc(br)}${sci(br) && sci(br) !== br ? ` <i class="dim">${esc(sci(br))}</i>` : ''}</span><div class="mk-grid">${list
            .map((s) => {
              const k = m.clades.indexOf(s);
              return `<button class="mk-clade${k === 0 ? ' head' : k === 1 ? ' feat' : ''}" data-act="makerClade" data-arg="${s}" aria-pressed="${k >= 0}">${U.icClade(s)} ${esc(cladeName(s))}${k === 0 ? ' <i>head</i>' : k === 1 ? ' <i>2nd</i>' : ''}</button>`;
            })
            .join('')}</div></div>`,
      )
      .join('');
    return `<div class="mk-cols"><section><h2>Two clades and a human</h2><p class="dim">The first gives the head; the second one feature. Pick in that order.</p><input type="search" class="mk-q" placeholder="Find a clade" value="${esc(m.q)}" data-input="makerQ" aria-label="Find a clade"><div class="mk-branches">${grid || '<p class="dim">No clade by that name.</p>'}</div></section>${preview(m)}</div>`;
  }
  function pilotCardBig(m, cls) {
    const a = U.artForPair(m.clades);
    const dom = DOMAIN_BY[m.domain];
    const cs = (m.own || m.callsign || '').toUpperCase();
    return `<div class="mk-card ${cls || ''}" style="--dom:${dom.c}"${U.sceneSrc(a) ? ` data-art="1"` : ''}>${U.sceneSrc(a) ? `<span class="mk-card-art" style="background-image:url(${U.sceneSrc(a)})"></span>` : ''}<span class="mk-card-veil"></span><span class="mk-card-text"><span class="eyebrow" style="color:${dom.c}">${esc(cs)} · ${esc(dom.name)}</span><b>${esc(m.name || 'Your pilot')}</b><span>${m.clades.map(cladeName).map(esc).join(' · ').toLowerCase()} · human</span></span></div>`;
  }
  function stepName(m) {
    const calls = callsAt(m.sug)
      .map(
        (c) =>
          `<button class="${!m.own && m.callsign === c ? 'on' : ''}" data-act="makerCall" data-arg="${c}">${c}</button>`,
      )
      .join('');
    const doms = U.DOMAINS.map(
      (d) =>
        `<button class="mk-dom${m.domain === d.id ? ' on' : ''}" style="--dom:${d.c}" data-act="makerDomain" data-arg="${d.id}" aria-pressed="${m.domain === d.id}"><i></i>${esc(d.name)}</button>`,
    ).join('');
    return `<div class="mk-cols"><section><h2>What do they answer to?</h2>
      <label class="lab" for="mkName">Name</label><input id="mkName" class="mk-name" maxlength="24" value="${esc(m.name)}" data-input="makerName" autocomplete="off"><button class="linkish small" data-act="makerSuggest">↻ suggest another</button>
      <span class="lab">Callsign</span><div class="chips">${calls}<input class="mk-own" maxlength="12" placeholder="+ your own" value="${esc(m.own)}" data-input="makerOwn" aria-label="Your own callsign"></div>
      <span class="lab">Domain</span><div class="mk-doms">${doms}</div><p class="dim small">A domain is a colour and a home, not a side.</p>
      <button class="cta" data-act="makerStep" data-arg="3" ${m.name.trim() ? '' : 'disabled'}>Next: story ▶</button></section>${pilotCardBig(m)}</div>`;
  }
  function stepStory(m) {
    const face = U.portraitSrc(U.artForPair(m.clades));
    return `<div class="mk-paper"><section><span class="mk-paper-kick">${esc(m.name)} · three questions</span>${QUESTIONS.map(
      (q, i) =>
        `<label class="mk-qa"><span>${esc(q.replace('{name}', m.name.split(' ')[0]))}</span><textarea rows="2" maxlength="280" placeholder="Answer, or leave it for the table to find out" data-input="makerStory" data-arg="${i}">${esc(m.story[i])}</textarea></label>`,
    ).join('')}
      <div class="row"><button class="cta" data-act="makerStep" data-arg="4">Next: reveal ▶</button><button class="linkish" data-act="makerSkip">Skip all</button></div></section>
      <aside>${face ? `<img class="mk-sketch" src="${face}" alt="">` : '<div class="mk-sketch"></div>'}<p class="small">Answers are yours. Send them as canon if you want them to shape the world.</p><label class="mk-tog"><input type="checkbox" data-act="makerCanon" ${m.canon ? 'checked' : ''}> Send as canon notes</label></aside></div>`;
  }
  function stepReveal(m) {
    const a = m.story.find((s) => s.trim());
    return `<div class="mk-reveal"><div class="mk-relic">${pilotCardBig(m, 'big')}${a ? `<p class="mk-line">${esc(a)}</p>` : ''}</div><div class="row center"><button class="cta" data-act="makerSave">Save to the crew</button><button class="ghost" data-act="makerDraft">Draft their cards ▶</button></div><p class="dim small center">Saved to the crew, they set out with a kit of their clades' signature cards. Draft their cards to pick the kit yourself in a new expedition.</p></div>`;
  }
  U.renderMaker = function () {
    const m = (U.maker = U.maker || newMaker());
    const body =
      m.step === 1 ? stepClades(m) : m.step === 2 ? stepName(m) : m.step === 3 ? stepStory(m) : stepReveal(m);
    return U.shell('pilots', `<div class="page maker step-${m.step}">${steps(m)}${body}</div>`);
  };

  /**
   * A starting kit for a pilot made outside the draft: START_CARDS of their three clades' cards, round the
   * clades in turn (head, feature, human), signatures first, as the draft's rules allow; points spent as
   * the autoplayer would (T.autoAllocate). Deterministic: the same pair always gets the same kit.
   */
  U.makerKit = function (name, clades) {
    const species = ['human'].concat(clades);
    const h = T.makeHero({ id: 'maker', name, species, cards: [] });
    h.upUnspent = T.RULES.START_UP;
    const order = [clades[0], clades[1], 'human'];
    const lists = order.map((s) =>
      T.cardsOf(s)
        .slice()
        .sort((a, b) => b.sig - a.sig || (a.id < b.id ? -1 : 1)),
    );
    let guard = 0;
    while (h.cards.length < T.RULES.START_CARDS && guard++ < 200) {
      const list = lists[guard % 3];
      const c = list.find((x) => T.canAddCard(h, x.id).ok);
      if (c) T.addCard(h, c.id);
    }
    T.autoAllocate(h);
    return h;
  };
  /** Who a pilot from Make a pilot is, as its recipe keeps it: callsign, domain and story. */
  const identity = (m) => ({
    callsign: (m.own || m.callsign || '').toUpperCase(),
    domain: m.domain,
    story: m.story.map((s) => s.trim()),
  });
  /** Its story answers, sent as canon notes about it when the maker asked for that. */
  function storyToCanon(m, kept) {
    if (!m.canon || !U.canonKeep) return;
    m.story.forEach((a, i) => {
      if (a.trim())
        U.canonKeep({
          subject: 'hero:' + kept.id,
          kind: 'answer',
          claim: a.trim(),
          shown: QUESTIONS[i].replace('{name}', m.name.split(' ')[0]),
          where: 'maker:story',
        });
    });
  }
  function saveMade(m) {
    const h = U.makerKit(m.name.trim(), m.clades);
    const rec = Object.assign(T.madeFrom(h, new Date().toISOString()), identity(m));
    const kept = T.keepMade(rec);
    if (!kept) return null;
    if (U.heroesShare) U.heroesShare(kept);
    storyToCanon(m, kept);
    return kept;
  }
  /**
   * A pilot from Make a pilot whose cards are drafted: the draft keeps the maker (d.maker), and when the
   * pilot is confirmed its recipe takes the callsign, domain and story, and the answers go to canon.
   */
  U.makerStamp = (d, rec) => (d && d.maker ? Object.assign(rec, identity(d.maker)) : rec);
  U.makerKept = (d, kept) => d && d.maker && kept && storyToCanon(d.maker, kept);

  U.crewInput = function (name, value, el) {
    const m = U.maker;
    switch (name) {
      case 'makerQ':
        m.q = value;
        U.render();
        refocus('.mk-q', value);
        return true;
      case 'makerName':
        m.name = value.slice(0, 24);
        redrawCard();
        return true;
      case 'makerOwn':
        m.own = value.replace(/[^A-Za-z0-9 -]/g, '').slice(0, 12);
        redrawCard();
        return true;
      case 'makerStory':
        m.story[Number(el.getAttribute('data-arg'))] = value.slice(0, 280);
        return true;
    }
    return false;
  };
  function refocus(sel, value) {
    const box = document.querySelector(sel);
    if (!box) return;
    box.focus();
    box.setSelectionRange(value.length, value.length);
  }
  /** Typing redraws only the card beside the form, so the field keeps its caret. */
  function redrawCard() {
    const card = document.querySelector('.maker .mk-card');
    if (card) card.outerHTML = pilotCardBig(U.maker);
    const next = document.querySelector('.maker [data-act="makerStep"][data-arg="3"]');
    if (next) next.disabled = !U.maker.name.trim();
  }

  U.crewAct = function (act, arg, t) {
    const c = U.crew;
    switch (act) {
      case 'pilots':
        U.screen = 'pilots';
        break;
      case 'crewFilter':
        c.filter = arg;
        break;
      case 'crewSel':
        c.sel = arg;
        // on a phone the panel does not fit beside the grid: a tap opens the pilot's page
        if (typeof window !== 'undefined' && window.innerWidth < 760) {
          c.open = arg;
          U.screen = 'pilot';
        }
        break;
      case 'crewOpen':
        c.open = arg;
        c.forgetting = null;
        U.screen = 'pilot';
        break;
      case 'crewForget':
        if (c.forgetting !== arg) c.forgetting = arg;
        else {
          T.forgetMade(arg);
          if (U.heroesForget) U.heroesForget(arg);
          c.forgetting = null;
          c.open = null;
          c.sel = null;
          U.screen = 'pilots';
        }
        break;
      case 'crewFly': {
        const x = byId(arg);
        if (!x) return true;
        if (U.run && !U.run.over && U.run.map && !U.crew.confirmFly) {
          U.crew.confirmFly = arg;
          U.openModal(
            `<h3>Start a new expedition?</h3><p>The one on its route now is saved and ends when the new one starts.</p><div class="row"><button class="primary" data-act="crewFly" data-arg="${esc(arg)}">Start with ${esc(x.pb.name)}</button><button class="ghost" data-act="closeModal">Keep the one I have</button></div>`,
          );
          return true;
        }
        U.crew.confirmFly = null;
        if (U.modal) U.closeModal();
        U.startDraft();
        if (U.draftAct) U.draftAct('prebuilt', arg);
        break;
      }
      case 'makePilot':
        U.maker = newMaker();
        U.screen = 'maker';
        break;
      case 'makerStep':
        U.maker.step = Math.min(Number(arg), maxStep(U.maker));
        break;
      case 'makerClade': {
        const m = U.maker;
        const k = m.clades.indexOf(arg);
        if (k >= 0) m.clades.splice(k, 1);
        else if (m.clades.length < 2) m.clades.push(arg);
        else m.clades[1] = arg;
        break;
      }
      case 'makerSuggest':
        U.maker.sug++;
        U.maker.name = nameAt(U.maker.sug);
        U.maker.callsign = callsAt(U.maker.sug)[0];
        break;
      case 'makerCall':
        U.maker.callsign = arg;
        U.maker.own = '';
        break;
      case 'makerDomain':
        if (DOMAIN_BY[arg]) U.maker.domain = arg;
        break;
      case 'makerSkip':
        U.maker.story = ['', '', ''];
        U.maker.step = 4;
        break;
      case 'makerCanon':
        U.maker.canon = !!(t && t.checked);
        return true;
      case 'makerSave': {
        const kept = saveMade(U.maker);
        if (!kept) {
          U.toast('This browser would not keep the pilot.');
          return true;
        }
        U.toast(`${kept.name} joined the crew.`);
        U.maker = null;
        c.filter = 'mine';
        c.sel = kept.id;
        U.screen = 'pilots';
        break;
      }
      case 'makerDraft': {
        const m = U.maker;
        U.startDraft();
        const d = U.draft;
        d.species = m.clades.slice();
        d.name = m.name.trim();
        d.maker = m;
        if (U.draftAct) U.draftAct('openPacks');
        U.maker = null;
        break;
      }
      default:
        return false;
    }
    U.render();
    return true;
  };
  (U.ACTS = U.ACTS || []).push(U.crewAct);
  (U.INPUTS = U.INPUTS || []).push(U.crewInput);
  Object.assign((U.SCREENS = U.SCREENS || {}), { pilots: U.renderPilots, pilot: U.renderPilot, maker: U.renderMaker });
})((window.T = window.T || {}));
