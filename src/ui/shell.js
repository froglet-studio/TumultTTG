/* ============================================================================
   TUMULT — THE APP SHELL (browser only)
   The bar every screen outside a mission sits under (Frogma: Home 1's top tabs,
   "Finalised UI"): TUMULT, then PLAY · ROUTE · PILOTS · CARDS · ATLAS · CANON,
   then the right-hand side (the Lobby chip and the account, filled by the home
   screens through U.shellRight) and ⚙ for Settings. On a phone the tabs move to
   a bar at the bottom: Home, Route, Pilots, Cards, More; More opens a sheet with
   Atlas, Canon, the Codex, How to play and Settings.
   Also here: one look for every empty state and error (U.emptyState) and the
   loading screen (U.loadingHTML), and what this browser has seen (U.seen):
   the places visited and the cards carried, for the Atlas and the binder.
   Nothing here reads or writes a rule.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) => U.esc(s);

  /** The tabs, in order. `phone` marks the four that stay on the phone's bottom bar (the rest go under More). */
  U.SHELL_TABS = [
    { id: 'play', name: 'Play', phone: 'Home', icon: '⌂' },
    { id: 'route', name: 'Route', phone: 'Route', icon: '⛵' },
    { id: 'pilots', name: 'Pilots', phone: 'Pilots', icon: '☺' },
    { id: 'cards', name: 'Cards', phone: 'Cards', icon: '▤' },
    { id: 'atlas', name: 'Atlas', icon: '◎' },
    { id: 'canon', name: 'Canon', icon: '✎' },
  ];
  /** Where More leads on a phone: the tabs that do not fit, and the pages with no tab of their own. */
  U.MORE_ITEMS = [
    { act: 'tab', arg: 'atlas', name: 'Atlas', icon: '◎', txt: 'Every kind of place on Tumult' },
    { act: 'tab', arg: 'canon', name: 'Canon', icon: '✎', txt: 'The story so far, and your notes' },
    { act: 'codex', name: 'Codex', icon: '◇', txt: 'Every word, foe, piece of gear and die' },
    { act: 'help', name: 'How to play', icon: '?', txt: 'Seven short pages, one rule each' },
    { act: 'settings', name: 'Settings', icon: '⚙', txt: 'Look, sound, play and accessibility' },
  ];
  /** Which tab a screen belongs to, so the bar can light it. */
  const TAB_OF = {
    title: 'play',
    lobby: 'play',
    help: 'play',
    codex: 'play',
    map: 'route',
    pilots: 'pilots',
    pilot: 'pilots',
    maker: 'pilots',
    cards: 'cards',
    atlas: 'atlas',
    canon: 'canon',
    settings: '',
  };
  U.tabOf = (screen) => (screen in TAB_OF ? TAB_OF[screen] : '');

  /** Whether there is a route to show: a run that is on its map (or past it, in a reward, haven or event). */
  const hasRoute = () => !!(U.run && U.run.map && !U.run.over);

  function topBar(tab) {
    const tabs = U.SHELL_TABS.map((t) => {
      const off = t.id === 'route' && !hasRoute();
      return `<button class="sh-tab${t.id === tab ? ' on' : ''}" data-act="tab" data-arg="${t.id}"${t.id === tab ? ' aria-current="page"' : ''}${off ? ' data-tip="No expedition on its route yet. Start one from Play."' : ''}>${esc(t.name)}</button>`;
    }).join('');
    const right = U.shellRight ? U.shellRight() : '';
    return `<header class="sh-top" role="navigation" aria-label="Main"><button class="sh-logo" data-act="tab" data-arg="play" aria-label="Tumult: home">TUMULT</button><nav class="sh-tabs">${tabs}</nav><span class="sh-right">${right}<button class="sh-gear${U.screen === 'settings' ? ' on' : ''}" data-act="settings" aria-label="Settings" data-tip="Settings">⚙</button></span></header>`;
  }
  function phoneBar(tab) {
    const four = U.SHELL_TABS.filter((t) => t.phone);
    const moreOn = !four.some((t) => t.id === tab);
    return `<nav class="sh-dock" aria-label="Main">${four
      .map(
        (t) =>
          `<button class="${t.id === tab ? 'on' : ''}" data-act="tab" data-arg="${t.id}"${t.id === tab ? ' aria-current="page"' : ''}><i aria-hidden="true">${t.icon}</i>${esc(t.phone)}</button>`,
      )
      .join(
        '',
      )}<button class="${moreOn ? 'on' : ''}" data-act="tab" data-arg="more"><i aria-hidden="true">≡</i>More</button></nav>`;
  }
  /**
   * A screen inside the shell: the top bar (the bottom bar on a phone) around `inner`. `tab` lights a tab;
   * left out, it is the screen's own (U.tabOf).
   */
  U.shell = function (tab, inner) {
    const t = tab == null ? U.tabOf(U.screen) : tab;
    return `<div class="shell" data-tab="${esc(t)}">${topBar(t)}<main class="sh-main">${inner}</main>${phoneBar(t)}</div>`;
  };
  /** The More sheet (phone): everything that has no place on the bottom bar. */
  U.moreHTML = function () {
    return `<div class="sh-more"><div class="sh-grab" aria-hidden="true"></div><h3>More</h3>${U.MORE_ITEMS.map(
      (m) =>
        `<button class="sh-more-row" data-act="${m.act}"${m.arg ? ` data-arg="${m.arg}"` : ''}><i aria-hidden="true">${m.icon}</i><span><b>${esc(m.name)}</b><span class="dim small">${esc(m.txt)}</span></span><span aria-hidden="true">›</span></button>`,
    ).join('')}</div>`;
  };

  /** Go to a tab. Returns true when it was one. */
  U.goTab = function (id) {
    U.closeModal && U.modal && U.closeModal();
    switch (id) {
      case 'play':
        U.screen = 'title';
        break;
      case 'route':
        if (!hasRoute()) {
          U.toast('No expedition on its route yet. Start one from Play.');
          return true;
        }
        U.screen = ['reward', 'haven', 'event', 'garage'].includes(U.run.phase)
          ? U.run.phase
          : U.run.mission
            ? 'mission'
            : 'map';
        break;
      case 'pilots':
        U.crew = Object.assign(U.crew || {}, { open: null });
        U.screen = 'pilots';
        break;
      case 'cards':
        U.screen = 'cards';
        break;
      case 'atlas':
        U.atlasPage = null;
        U.atlasFrom = 'title';
        U.screen = 'atlas';
        break;
      case 'canon':
        U.screen = 'canon';
        break;
      case 'more':
        U.openModal(U.moreHTML(), null, { sheet: true });
        return true;
      default:
        return false;
    }
    U.render();
    return true;
  };

  /* ───────────── empty states and errors: one look ───────────── */
  /**
   * What happened, what is safe, and one way forward (Frogma "errors and empty states"). `tone` colours the
   * ring: 'gold' (a pause), 'rose' (a refusal or a fault), 'cyan' (nothing yet), 'green' (yours to write).
   */
  U.emptyState = function ({ icon, title, text, act, arg, label, tone }) {
    const btn = act
      ? `<button class="ghost es-btn" data-act="${esc(act)}"${arg != null ? ` data-arg="${esc(arg)}"` : ''}>${esc(label)}</button>`
      : '';
    return `<div class="empty-state es-${tone || 'cyan'}" role="status"><span class="es-ring" aria-hidden="true">${icon || '·'}</span><h3>${esc(title)}</h3><p>${esc(text)}</p>${btn}</div>`;
  };
  /** The states the game says the same way everywhere. */
  U.EMPTY = {
    offline: {
      icon: '⌁',
      tone: 'gold',
      title: "You're offline",
      text: 'Your run is saved on this device. Solo play still works; online tables come back when you do.',
      act: 'netRetry',
      label: 'Try again',
    },
    full: {
      icon: '⛔',
      tone: 'rose',
      title: 'That table is full',
      text: 'Every seat is taken. Ask the host for a seat, or start your own table.',
      act: 'tab',
      arg: 'play',
      label: 'Host a table',
    },
    noCards: {
      icon: '▤',
      tone: 'cyan',
      title: 'No cards yet',
      text: 'Cards your pilots carry on expeditions land here. Your first come with your first draft.',
      act: 'newRun',
      label: 'Start an expedition',
    },
    noCanon: {
      icon: '✎',
      tone: 'green',
      title: 'Nothing written yet',
      text: 'Tap ✎ next to any text in the game to correct it or add a detail. It shows up here.',
      act: 'canonHow',
      label: 'How it works',
    },
    expired: {
      icon: '⌛',
      tone: 'gold',
      title: 'The code has expired',
      text: 'Invite codes last a day. Ask for a new link.',
      act: 'tab',
      arg: 'play',
      label: 'Enter another code',
    },
    broke: {
      icon: '⚠',
      tone: 'rose',
      title: 'Something broke',
      text: 'We saved your run first. Reload to pick up where you were.',
      act: 'reload',
      label: 'Reload',
    },
  };

  /* ───────────── loading ───────────── */
  const TIPS = [
    'A card on the track comes back when its column reaches Ready. Plan two rounds ahead.',
    'Foes show their plan before you act. Step out of a zone and a zone shot has no line.',
    'Dice you do not spend stay banked, but the pool shrinks: hoarding starves the next roll.',
    'Hidden breaks on melee, area, being moved or being Located. Nothing is a key.',
    'A downed pilot is not dead. An ally beside them can Rally them for 2 AP.',
    'Fold one each of Mass, Charge, Space and Time into an Omni when a roll will not fit.',
  ];
  /**
   * The loading screen: the living sea, one line on what is happening, one tip, and who is ready when it is an
   * online table (`who`: [{ name, ready }]). The tip is chosen by `seed` so it does not flicker between renders.
   */
  U.loadingHTML = function ({ line, place, who, seed, over } = {}) {
    const tip = TIPS[Math.abs(seed || 0) % TIPS.length];
    const people = (who || [])
      .map(
        (p) =>
          `<span class="ld-who${p.ready ? ' ready' : ''}">${U.portrait ? U.portrait({ name: p.name, species: p.species || ['human'] }, 'xs') : ''}${esc(p.name)} ${p.ready ? 'ready' : 'joining…'}</span>`,
      )
      .join('');
    return `<div class="loading${over ? ' over' : ''}" role="status" aria-live="polite"><span class="ld-ring" aria-hidden="true"></span><h2>${esc(line || 'The tide is turning')}</h2>${place ? `<p class="dim">Setting the board for ${esc(place)}…</p>` : ''}<div class="ld-tip"><span aria-hidden="true">✦</span><span><b>Tip.</b> ${esc(tip)}</span></div>${people ? `<div class="ld-people">${people}</div>` : ''}</div>`;
  };

  /* ───────────── waiting for a painting ───────────── */
  // The offline file carries every painting inside it; the web version fetches each one the first time a
  // screen shows it (tools/build.mjs). Rather than show a mission over an empty sea and pop the place in a
  // moment later, the loading screen covers it until the place and the squad's scenes are here, five seconds
  // at most. A painting already in the page (a data URI) or fetched once before never waits.
  const artHere = new Set();
  let artWaiting = false;
  const fetchArt = (src) =>
    new Promise((res) => {
      const done = () => (artHere.add(src), res());
      const img = new Image();
      img.onload = img.onerror = done;
      setTimeout(done, 5000);
      img.src = src;
    });
  /** True when every painting named is ready to draw; otherwise fetches them and renders again once they are. */
  U.artReady = function (srcs) {
    const need = srcs.filter((s) => typeof s === 'string' && s && !/^data:/.test(s) && !artHere.has(s));
    if (!need.length) return true;
    if (!artWaiting && typeof Image !== 'undefined') {
      artWaiting = true;
      Promise.all(need.map(fetchArt)).then(() => {
        artWaiting = false;
        U.render();
      });
    }
    return typeof Image === 'undefined';
  };
  /** The loading screen to lay over a mission whose paintings are still on the way, or null when they are here. */
  U.loadingGate = function () {
    const m = U.screen === 'mission' && U.run && U.run.mission;
    if (!m) return null;
    const page = m.page && T.PAGE_BY[m.page];
    const heroes = U.run.heroes || [];
    const srcs = [page && T.ART && T.ART[page.plate]].concat(
      heroes.map((h) => U.sceneSrc && U.pilotOf && U.sceneSrc(U.pilotOf(h))),
    );
    if (U.artReady(srcs)) return null;
    return U.loadingHTML({
      over: true,
      line: 'The tide is turning',
      place: page && page.name,
      who: heroes.map((h) => ({ name: h.name, species: h.species, ready: true })),
      seed: (U.run.stop || 0) + heroes.length,
    });
  };

  /* ───────────── what this browser has seen ───────────── */
  // The places a squad has played and the cards a squad has carried, kept in the meta record
  // (tumult_v2_meta: seenPages, seenCards { id: missions carried }). Written when a mission starts.
  let lastNoted = '';
  U.noteSeen = function () {
    const run = U.run;
    const m = run && run.mission;
    if (!m || !m.page) return;
    const key = run.seed + ':' + run.launched + ':' + m.page;
    if (key === lastNoted) return;
    lastNoted = key;
    const meta = T.loadMeta();
    meta.seenPages = meta.seenPages || [];
    meta.seenCards = meta.seenCards || {};
    if (!meta.seenPages.includes(m.page)) meta.seenPages.push(m.page);
    (run.heroes || []).forEach((h) =>
      (h ? h.cards : []).forEach((c) => (meta.seenCards[c] = (meta.seenCards[c] || 0) + 1)),
    );
    T.saveMeta(meta);
  };
  U.seen = function () {
    const meta = T.loadMeta();
    return { pages: meta.seenPages || [], cards: meta.seenCards || {} };
  };

  /** Typing in a field marked data-input="<name>": each screen's handler is asked in turn (U.INPUTS). */
  if (typeof document !== 'undefined')
    document.addEventListener('input', (e) => {
      const el = e.target && e.target.closest && e.target.closest('[data-input]');
      if (!el) return;
      const name = el.getAttribute('data-input');
      for (const h of U.INPUTS) if (h(name, el.value, el)) return;
    });
  U.INPUTS = U.INPUTS || [];

  /** The shell's own actions; true when one was taken. */
  U.shellAct = function (act, arg) {
    switch (act) {
      case 'tab':
        return U.goTab(arg);
      case 'reload':
        if (typeof location !== 'undefined') location.reload();
        return true;
    }
    return false;
  };
  (U.ACTS = U.ACTS || []).push(U.shellAct);
})((window.T = window.T || {}));
