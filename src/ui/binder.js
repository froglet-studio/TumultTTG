/* ============================================================================
   TUMULT — THE CARDS TAB: THE BINDER (browser only)
   Every trait card as a relic (Frogma "Cards 1" and "card 1, motion A"): a
   gold frame, the etherion's gem in the corner, the clade, the name and both
   faces. In the binder every card rests still; only the card you open lights
   up, with a soft light that follows the pointer across its foil (no tilt, no
   sweep). Motion Off or Reduced keeps that light still in the middle.
   A card is "found" once a squad of yours has carried it into a mission
   (U.seen, src/ui/shell.js); the rest wait face down, named by their clade.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) => U.esc(s);
  const EL = T.ETHERIONS;
  const PER_PAGE = 12;
  const ELS = ['M', 'C', 'S', 'T'];

  /** The etherion a card belongs to: its Ethereal face's, else the card's. */
  const elOf = (c) => (c.E && c.E.elt) || c.el;
  const gem = (c, cls) =>
    `<span class="rl-gem ${cls || ''}" style="--el:${EL[elOf(c)].color}" aria-label="${esc(EL[elOf(c)].name)}" role="img"></span>`;
  const cost = (f) => `${f.ap} AP${f.el ? ` + ${f.el}◆` : ''}`;
  /** The pilots who carry a card in their starting kit (the pre-made crew), by name. */
  const carriers = (id) => T.PREBUILTS.filter((pb) => pb.cards.includes(id)).map((pb) => pb.name);

  /**
   * A card as a relic. `o.P`, `o.E` show it at a level (default the first: P 1, E 1); `o.lit` gives it the
   * light that follows the pointer (the one open card); `o.clades` names the clade it is carried through.
   */
  U.relicHTML = function (id, o) {
    o = o || {};
    const c = T.CARD[id];
    if (!c) return '';
    const P = o.P == null ? 1 : o.P,
      E = o.E == null ? 1 : o.E;
    const sp = T.SPECIES[U.cladeIn(c, o.clades)];
    const face = (fk) => {
      const f = c[fk];
      return `<div class="rl-face ${fk === 'E' ? 'eth' : ''}"><b>${esc(f.n)}</b> <span class="rl-cost">· ${esc(cost(f))}</span><span class="rl-txt">${U.kw ? U.kw(esc(f.txt(P, E))) : esc(f.txt(P, E))}</span></div>`;
    };
    return `<div class="relic${o.lit ? ' lit' : ''}" data-card="${esc(id)}" style="--el:${EL[elOf(c)].color}"><div class="rl-in">${o.lit ? '<i class="rl-light" aria-hidden="true"></i>' : ''}<div class="rl-top"><span class="rl-clade">${U.icClade(sp.id || U.cladeIn(c, o.clades))} ${esc(c.kin || sp.name)}</span>${gem(c)}</div><div class="rl-art">${U.cardArt(c, false, U.cladeIn(c, o.clades))}</div><h3 class="rl-name">${esc(c.name)}</h3>${face('P')}${face('E')}<div class="rl-foot"><span>P ${P} · E ${E}</span>${c.sig >= 2 ? '<span>★ Signature</span>' : ''}</div></div></div>`;
  };
  /** A card's small tile, as it rests in the binder and on a pilot's page. */
  U.relicMini = function (id, o) {
    o = o || {};
    const c = T.CARD[id];
    if (!c) return '';
    const sp = T.SPECIES[U.cladeIn(c, o.clades)];
    const lvl = o.P != null ? `P${o.P} · E${o.E}` : 'P1 · E1';
    return `<button class="relic-mini${o.on ? ' on' : ''}" data-act="${o.act || 'cardOpen'}" data-arg="${esc(id)}" style="--el:${EL[elOf(c)].color}" aria-label="${esc(c.name)}">${gem(c, 'sm')}<span class="rm-art">${U.cardArt(c, false, U.cladeIn(c, o.clades))}</span><b>${esc(c.name)}</b><span class="rm-clade">${esc(c.kin || sp.name)}</span><span class="rm-lvl">${lvl}</span></button>`;
  };
  /** A card not yet found: face down, named by its clade. */
  const hidden = (c) =>
    `<button class="relic-mini down" data-act="cardOpen" data-arg="${esc(c.id)}" aria-label="A ${esc(T.SPECIES[c.sp].name)} card not found yet"><span class="rm-q" aria-hidden="true">?</span><span class="rm-clade">${esc(T.SPECIES[c.sp].name)}</span></button>`;

  /**
   * The cards you have found: every card a squad of yours carried into a mission (U.seen), and every card in
   * your crew's kits (the ready-made pilots and those you made). { id: missions carried }
   */
  U.foundCards = function () {
    const seen = Object.assign({}, U.seen().cards);
    const crew = T.PREBUILTS.concat(T.loadMade());
    crew.forEach((pb) => pb.cards.forEach((c) => (seen[c] = seen[c] || 0)));
    return seen;
  };

  /* ───────────── the binder ───────────── */
  U.binder = U.binder || { el: 'all', page: 0, open: null, q: '' };
  function filtered() {
    const b = U.binder;
    const q = (b.q || '').trim().toLowerCase();
    return T.CARDS.filter((c) => b.el === 'all' || elOf(c) === b.el).filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (T.SPECIES[c.sp].name || '').toLowerCase().includes(q) ||
        c.P.n.toLowerCase().includes(q) ||
        c.E.n.toLowerCase().includes(q) ||
        c.P.txt(1, 1).toLowerCase().includes(q) ||
        c.E.txt(1, 1).toLowerCase().includes(q),
    );
  }
  /** The open card's panel: the relic lit, what it is to you, and who carries it. */
  function detail(id, found) {
    const c = T.CARD[id];
    if (!c) return '';
    if (!found)
      return `<div class="bd-detail">${U.emptyState({ icon: '?', tone: 'cyan', title: 'Not found yet', text: `A ${T.SPECIES[c.sp].name} card. It turns face up once a pilot of yours carries it.` })}</div>`;
    const seen = U.seen().cards[id] || 0;
    const who = carriers(id);
    const lvl = U.binder.lvl || 1;
    return `<div class="bd-detail"><div class="bd-stage">${U.relicHTML(id, { lit: true, P: lvl, E: lvl })}</div>
      <div class="bd-facts"><span>${who.length ? 'Used by ' + esc(who.join(', ')) : 'No ready-made pilot carries it'}</span><span>Carried into ${seen} mission${seen === 1 ? '' : 's'}</span>${c.sig >= 2 ? '<span>★ Signature</span>' : ''}</div>
      <div class="bd-lvl" role="group" aria-label="Show the card at a level">${[1, 2, 3].map((n) => `<button class="${lvl === n ? 'on' : ''}" data-act="cardLvl" data-arg="${n}">P${n} · E${n}</button>`).join('')}</div>
      <p class="dim small">${esc(c.flavor || '')}</p></div>`;
  }
  U.renderCards = function () {
    const b = U.binder;
    const seen = U.foundCards();
    const all = filtered();
    const found = T.CARDS.filter((c) => c.id in seen).length;
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    b.page = Math.min(b.page, pages - 1);
    const slice = all.slice(b.page * PER_PAGE, (b.page + 1) * PER_PAGE);
    const tiles = slice.map((c) => (c.id in seen ? U.relicMini(c.id, { on: b.open === c.id }) : hidden(c))).join('');
    const chips = [['all', 'All']]
      .concat(ELS.map((e) => [e, EL[e].name]))
      .map(
        ([id, name]) =>
          `<button class="${b.el === id ? 'on' : ''}" data-act="cardEl" data-arg="${id}"${id !== 'all' ? ` style="--el:${EL[id].color}"` : ''}>${id !== 'all' ? '<i aria-hidden="true">◆</i>' : ''}${esc(name)}</button>`,
      )
      .join('');
    const pct = Math.round((found / T.CARDS.length) * 100);
    const body = found
      ? `<div class="bd-grid">${tiles || '<p class="dim">No card matches.</p>'}</div>
        <div class="bd-pager"><button class="ghost" data-act="cardPage" data-arg="-1" aria-label="Previous page" ${b.page ? '' : 'disabled'}>‹</button><span>Page ${b.page + 1} of ${pages}</span><button class="ghost" data-act="cardPage" data-arg="1" aria-label="Next page" ${b.page < pages - 1 ? '' : 'disabled'}>›</button></div>`
      : U.emptyState(U.EMPTY.noCards);
    const open = b.open ? detail(b.open, b.open in seen) : '';
    return U.shell(
      'cards',
      `<div class="page bd${open ? ' has-open' : ''}"><div class="pg-head"><h1>Collection</h1><span class="dim">${found} of ${T.CARDS.length} found</span><span class="bd-meter" aria-hidden="true"><b style="width:${pct}%"></b></span><div class="chips bd-els" role="group" aria-label="Etherion">${chips}</div><input class="bd-q" type="search" placeholder="Search cards" value="${esc(b.q)}" data-input="cardSearch" aria-label="Search cards"></div>
      <div class="bd-cols"><div class="bd-left">${body}</div>${open ? `<aside class="bd-side">${open}<button class="ghost bd-close" data-act="cardClose">Close</button></aside>` : ''}</div></div>`,
    );
  };

  /* ───────────── the light that follows you (motion A) ───────────── */
  if (typeof document !== 'undefined')
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.relic.lit');
      if (!card || (U.motion && U.motion() !== 'full')) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
    });

  U.binderInput = function (name, value) {
    if (name !== 'cardSearch') return false;
    U.binder.q = value;
    U.binder.page = 0;
    U.render();
    const box = document.querySelector('.bd-q');
    if (box) {
      box.focus();
      box.setSelectionRange(value.length, value.length);
    }
    return true;
  };
  U.binderAct = function (act, arg) {
    const b = U.binder;
    switch (act) {
      case 'cards':
        U.screen = 'cards';
        break;
      case 'cardEl':
        b.el = arg;
        b.page = 0;
        break;
      case 'cardPage':
        b.page = Math.max(0, b.page + Number(arg));
        break;
      case 'cardOpen':
        b.open = b.open === arg && U.screen === 'cards' ? null : arg;
        b.lvl = 1;
        if (U.screen !== 'cards') {
          // from a pilot's page: the card opens in the binder, on its page
          b.el = 'all';
          b.q = '';
          b.page = Math.floor(T.CARDS.findIndex((c) => c.id === arg) / PER_PAGE);
          U.screen = 'cards';
        }
        break;
      case 'cardClose':
        b.open = null;
        break;
      case 'cardLvl':
        b.lvl = Number(arg) || 1;
        break;
      default:
        return false;
    }
    U.render();
    return true;
  };
  (U.ACTS = U.ACTS || []).push(U.binderAct);
  (U.INPUTS = U.INPUTS || []).push(U.binderInput);
  (U.SCREENS = U.SCREENS || {}).cards = U.renderCards;
})((window.T = window.T || {}));
