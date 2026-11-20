/* ============================================================================
   TUMULT v2.0 — UI MISSION SCREEN
   Board (SVG) with zones, height, hazards, traps, objectives; tokens with hp;
   enemy intents drawn as arrows; hero panels (dice, track, hand, gear);
   targeting flows; animations from the engine's fx queue.
   ========================================================================== */
(function (T) {
  const U = T.UI;
  const B = T.Board;
  const esc = U.esc;
  const EL = T.ETHERIONS;
  const $ = (s, r) => (r || document).querySelector(s);
  const OBJ_ICON = {
    vault: '🏛️',
    lever: '🕹️',
    beacon: '📡',
    cache: '❓',
    valve: '🔧',
    crate: '📦',
    dock: '⚓',
    mark: '📍',
  };
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  U.enterMission = function () {
    U.ms = {
      heroIdx: 0,
      mode: 'idle',
      pending: null,
      rerollLeft: 0,
      rerollPicked: [],
      fxDone: 0,
      built: false,
      overShown: false,
      undo: [], // missions as they stood before each move that can still be taken back (T.canTakeBack)
      armed: null, // on a touch screen: the play tapped once, previewed, waiting for a second tap
    };
  };
  const M = () => U.run.mission;
  const hero = () => M().heroes[U.ms.heroIdx];

  /**
   * Which parts of the mission screen are folded away: the log (folded to its last lines), the enemy
   * intents (folded to the forecast), the objective (folded to two lines), and, for a pilot not selected,
   * whether its cards are shown anyway. Kept for this browser in tumult_v2_ui; a page without storage
   * starts from the defaults.
   */
  const LAYOUT_KEY = 'tumult_v2_ui';
  U.layout = (() => {
    const base = {
      log: false,
      intents: true,
      obj: false,
      full: false,
      noHand: false,
      noPlans: false,
      tab: 'hand',
      peek: {},
    };
    try {
      return Object.assign(base, JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}'), { peek: {} });
    } catch {
      return base;
    }
  })();
  function saveLayout() {
    try {
      const { log, intents, obj, full, noHand, noPlans, tab } = U.layout;
      localStorage.setItem(LAYOUT_KEY, JSON.stringify({ log, intents, obj, full, noHand, noPlans, tab }));
    } catch {
      /* no storage: the choice lasts for this page */
    }
  }
  /** The small button that folds a part of the screen away or opens it out. */
  function foldBtn(key, what) {
    const open = !!U.layout[key];
    return `<button class="fold ghost sm" data-act="fold" data-arg="${key}" aria-expanded="${open}" data-tip="${open ? 'Fold ' + what + ' away' : 'Show all of ' + what}">${open ? '▴' : '▾'}</button>`;
  }
  /** Write a panel's HTML only when it changed: no work for the browser, and hover and focus survive. */
  function setHTML(el, html) {
    if (!el || el._html === html) return false;
    el.innerHTML = html;
    el._html = html;
    return true;
  }

  /* ───────────── geometry ───────────── */
  function geom(m) {
    const ns = Object.values(m.board.nodes);
    const minX = Math.min(...ns.map((n) => n.x)),
      maxX = Math.max(...ns.map((n) => n.x)),
      minY = Math.min(...ns.map((n) => n.y)),
      maxY = Math.max(...ns.map((n) => n.y));
    const cell = 118,
      pad = 54;
    const W = (maxX - minX) * cell + pad * 2,
      H = (maxY - minY) * cell + pad * 2 + 10;
    return {
      cell,
      pad,
      W,
      H,
      px: (n) => pad + (n.x - minX) * cell,
      py: (n) => pad + (n.y - minY) * cell + 6,
      minX,
      maxX,
      minY,
      maxY,
    };
  }

  /* ───────────── skeleton ───────────── */
  /**
   * The mission HUD (Frogma "Finalised UI", HUD 1×2): the board in a frame with the sea around it, the mission
   * across the top, the foes' plans, the squad and the log on the right, the pilot being flown and its hand
   * along the foot. ⛶ Full screen (HUD 1+) lets the board fill the screen; the plans and the hand become trays
   * that slide away. On a phone the foot is one sheet with tabs: Hand, Plans, Squad and Log.
   * Which of these is chosen is kept for this browser with the folds (tumult_v2_ui).
   */
  const TABS = [
    ['hand', 'Hand'],
    ['plans', 'Plans'],
    ['squad', 'Squad'],
    ['log', 'Log'],
  ];
  U.hudClass = function () {
    const L = U.layout;
    return `mission hud${L.full ? ' full' : ''}${L.noHand ? ' nohand' : ''}${L.full && L.noPlans ? ' noplans' : ''}`;
  };
  U.renderMission = function () {
    // the board sits in a place: its atlas page's plate (or, on a board with no page, the lead pilot's world)
    const m = U.run && U.run.mission;
    const page = m && m.page && T.PAGE_BY[m.page];
    const lead = m && m.heroes[0];
    const scene = (page && T.ART && T.ART[page.plate]) || (lead && U.sceneSrc(U.pilotOf(lead)));
    const L = U.layout;
    const tab = TABS.some(([k]) => k === L.tab) ? L.tab : 'hand';
    const tabs = TABS.map(
      ([k, n]) =>
        `<button class="ptab${k === tab ? ' on' : ''}" data-act="hudTab" data-arg="${k}" aria-pressed="${k === tab}">${n}</button>`,
    ).join('');
    return `<div class="${U.hudClass()}" data-tab="${tab}">
      <div class="top" id="mtop"></div>
      <div class="boardwrap"><div id="mtarget"></div><div class="board${page ? ' paged' : ''}" id="board"${scene ? ` style="--scene:url(${scene})"` : ''}><div class="banner" id="banner"></div></div><button class="ghost fsbtn" data-act="hudFull" id="mfull">${L.full ? '⤡ Back to frame' : '⛶ Full screen'}</button><div class="mfc" id="mfc" aria-live="polite"></div></div>
      <div class="tray">
        <div class="ptabs">${tabs}<button class="primary endbtn2" data-act="endRound" id="mend2">End Round ▶</button></div>
        <div class="side"><button class="grab grab-plans" data-act="hudTray" data-arg="plans" aria-label="Slide the plans tray">${L.noPlans ? '◂ Plans' : 'Plans ▸'}</button><div class="side-in pane p-plans" id="mside"></div><div class="pane p-squad" id="msquad"></div><div class="bottom pane p-log">${foldBtn('log', 'the log')}<div class="log${L.log ? '' : ' folded'}" id="mlog"></div></div></div>
        <div class="dock"><button class="grab grab-hand" data-act="hudTray" data-arg="hand" aria-label="Slide the hand tray">${L.noHand ? 'Hand ▴' : 'Hand ▾'}</button><div class="pane p-hand" id="mdock"></div></div>
      </div>
      <div class="pass" id="mpass" hidden></div>
    </div>`;
  };
  U.afterMissionRender = function () {
    U.ms.built = false;
    buildBoard();
    U.updateMission();
  };

  /**
   * Each zone's nodes and the links that draw it as one region: the shortest tree joining its nodes on the
   * board (Prim's, by drawn distance), so a zone of any shape reads as one piece.
   */
  function zoneRegions(board) {
    const N = board.nodes;
    const byZone = {};
    Object.values(N).forEach((n) => n.zones.forEach((z) => (byZone[z] = byZone[z] || []).push(n.id)));
    const d2 = (a, b) => (N[a].x - N[b].x) ** 2 + (N[a].y - N[b].y) ** 2;
    return Object.keys(byZone)
      .sort()
      .map((zone) => {
        const ids = byZone[zone];
        const inTree = [ids[0]];
        const links = [];
        while (inTree.length < ids.length) {
          let best = null;
          inTree.forEach((a) =>
            ids.forEach((b) => {
              if (!inTree.includes(b) && (!best || d2(a, b) < best[2])) best = [a, b, d2(a, b)];
            }),
          );
          links.push([best[0], best[1]]);
          inTree.push(best[1]);
        }
        return { zone, ids, links };
      });
  }
  U.zoneRegions = zoneRegions;
  /** An SVG arc of radius r from one angle to another (degrees, clockwise from the top). */
  function arcPath(r, a0, a1) {
    const pt = (a) => [r * Math.sin((a * Math.PI) / 180), -r * Math.cos((a * Math.PI) / 180)];
    const [x0, y0] = pt(a0 + 4),
      [x1, y1] = pt(a1 - 4);
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  U.arcPath = arcPath;

  /* ───────────── board build ───────────── */
  function buildBoard() {
    const m = M();
    const g = geom(m);
    const host = $('#board');
    const old = host.querySelector('svg');
    if (old) old.remove();
    host.style.setProperty('--ar', `${g.W} / ${g.H}`); // a narrow screen sizes the board to its map
    const svg = svgEl('svg', { viewBox: `0 0 ${g.W} ${g.H}`, preserveAspectRatio: 'xMidYMid meet' });
    host.insertBefore(svg, host.firstChild);
    const defs = svgEl('defs', {}, svg);
    const mk = svgEl(
      'marker',
      {
        id: 'arrow',
        viewBox: '0 0 10 10',
        refX: '9',
        refY: '5',
        markerWidth: '7',
        markerHeight: '7',
        orient: 'auto-start-reverse',
      },
      defs,
    );
    svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#e56a8f' }, mk);
    svgEl('circle', { cx: 0, cy: 0, r: 18 }, svgEl('clipPath', { id: 'face-clip' }, defs));
    const zones = svgEl('g', { id: 'zones' }, svg);
    const edges = svgEl('g', { id: 'edges' }, svg);
    const nodes = svgEl('g', { id: 'nodes' }, svg);
    svgEl('g', { id: 'markers' }, svg);
    svgEl('g', { id: 'intents' }, svg);
    svgEl('g', { id: 'tokens' }, svg);
    svgEl('g', { id: 'preview' }, svg);
    // zones: one soft region per zone, whatever its shape (a disc at each of its nodes, joined along the
    // shortest tree between them), named under its lowest node
    const N = m.board.nodes;
    zoneRegions(m.board).forEach(({ zone, ids, links }) => {
      const z = T.ZONES[zone];
      const gr = svgEl('g', { class: 'zone-glow', 'data-zone': zone }, zones);
      ids.forEach((id) => svgEl('circle', { cx: g.px(N[id]), cy: g.py(N[id]), r: 46, fill: z.color }, gr));
      links.forEach(([a, b]) =>
        svgEl(
          'line',
          {
            x1: g.px(N[a]),
            y1: g.py(N[a]),
            x2: g.px(N[b]),
            y2: g.py(N[b]),
            stroke: z.color,
            'stroke-width': 92,
            'stroke-linecap': 'round',
          },
          gr,
        ),
      );
      const low = ids.reduce((a, b) => (N[b].y > N[a].y || (N[b].y === N[a].y && N[b].x < N[a].x) ? b : a));
      svgEl(
        'text',
        {
          x: g.px(N[low]),
          // below the space's own name and a token's health, so the three never print over each other
          y: Math.min(g.H - 4, g.py(N[low]) + 62),
          'text-anchor': 'middle',
          fill: z.color,
          'font-size': 10,
          'font-family': 'var(--mono)',
          stroke: '#0a1120',
          'stroke-width': 3,
          'paint-order': 'stroke',
          opacity: 0.9,
        },
        zones,
      ).textContent = z.name + ' zone';
    });
    m.board.edges.forEach(([a, b]) =>
      svgEl('line', { x1: g.px(N[a]), y1: g.py(N[a]), x2: g.px(N[b]), y2: g.py(N[b]), class: 'edge' }, edges),
    );
    m.board.climb.forEach(([a, b]) =>
      svgEl(
        'line',
        { x1: g.px(N[a]), y1: g.py(N[a]), x2: g.px(N[b]), y2: g.py(N[b]), class: 'edge climb', 'data-climb': '1' },
        edges,
      ),
    );
    Object.values(N).forEach((n) => {
      const gr = svgEl(
        'g',
        { id: 'node-' + n.id, class: 'node', transform: `translate(${g.px(n)},${g.py(n)})`, 'data-node': n.id },
        nodes,
      );
      svgEl('circle', { r: 27, class: 'ring' }, gr);
      // the outer ring shows the node's zones: one arc for each
      n.zones.forEach((zone, i) => {
        const k = n.zones.length;
        const attrs = { fill: 'none', stroke: T.ZONES[zone].color, 'stroke-opacity': 0.5, 'stroke-width': 2 };
        if (k === 1) svgEl('circle', Object.assign({ r: 31 }, attrs), gr);
        else svgEl('path', Object.assign({ d: arcPath(31, (i / k) * 360, ((i + 1) / k) * 360) }, attrs), gr);
      });
      svgEl('text', { y: 40, class: 'lbl', 'text-anchor': 'middle' }, gr).textContent =
        n.label || (n.height ? 'ledge ' + n.id : n.id);
    });
    svg.addEventListener('click', onBoardClick);
    svg.addEventListener('mousemove', (e) => {
      const t = e.target.closest('[data-tipid]');
      const tip = t ? tipFor(t.getAttribute('data-tipid')) : null;
      if (tip) {
        t.setAttribute('data-tip', tip);
      }
    });
    U.ms.built = true;
    U.ms.g = g;
    U.ms.svg = svg;
  }
  function tipFor(id) {
    const m = M();
    if (id.startsWith('e')) {
      const e = m.enemies.find((x) => x.uid === +id.slice(1));
      if (!e) return '';
      const d = T.ENEMIES[e.type];
      const states = Object.keys(e.states)
        .filter((k) => k !== 'Anchored' || !e.anchoredPerm)
        .map((k) => `<span class="state">${k}</span>`)
        .join(' ');
      return `<b>${U.icEnemy(e.type, e.glyph)} ${esc(e.name)}</b> <span class="dim">tier ${e.tier}${e.elite ? ' · elite' : ''}</span><div class="mono small">hp ${e.hp}/${e.maxHp}${e.shield ? ' · Shield ' + e.shield : ''} · speed ${e.speed}</div>${e.intent ? `<div style="color:#ffb3c7">Intent: ${esc(e.intent.label)}</div>` : ''}${states ? `<div style="margin-top:4px">${states}</div>` : ''}<div class="flavor">${esc(d.flavor)}</div>`;
    }
    if (id.startsWith('h')) {
      const h = m.heroes.find((x) => x.uid === +id.slice(1));
      if (!h) return '';
      return `<b>${esc(h.name)}</b> <span class="dim">${esc(h.title)}</span><div class="mono small">hp ${h.hp}/${h.maxHp} · pool ${h.pool} · banked ${h.held.length}</div>${Object.keys(
        h.states,
      )
        .map((k) => `<div class="small">• ${esc(T.describeState(k, h.states[k]))}</div>`)
        .join('')}`;
    }
    if (id.startsWith('d'))
      return '<b>Decoy</b><div class="small">Draws enemy attacks that would target the nearer hero.</div>';
    if (id.startsWith('n')) {
      const n = m.board.nodes[+id.slice(1)];
      if (!n) return '';
      const bits = [
        `<b>${n.label ? 'Space ' + n.label : 'Node ' + n.id}</b> — ${n.zones.map((z) => T.ZONES[z].name).join(' and ')} zone`,
      ];
      if (n.height) bits.push('Height: reachable only by Space verbs (teleport/climb/hover) or the ramp.');
      if (n.hazard) bits.push(`Hazard: ${T.RULES.HAZARD_DMG} true damage at round end to anyone standing here.`);
      if (n.spawn) bits.push('Spawn-node: foes emerge here.');
      if (n.objective) bits.push(objText(m, n));
      if (m.traps[n.id] && m.traps[n.id].length)
        bits.push(`Snare: ${m.traps[n.id].map((t) => (t.counted ? 'counted, ' : '') + t.dmg + ' dmg').join('; ')}`);
      return bits.join('<div style="height:4px"></div>');
    }
    return '';
  }
  function objText(m, n) {
    const o = n.objective;
    const ob = m.objective;
    switch (o.kind) {
      case 'vault':
        return `The vault. Break ${ob.need} seal(s) by Interacting while standing here (${ob.done || 0}/${ob.need}).`;
      case 'lever':
        return `Winch lever. Interact ×${ob.leverNeed} to drop a ramp to the ledge (${ob.leverDone}/${ob.leverNeed}).`;
      case 'beacon':
        return `The beacon. A hero on or adjacent at round end holds it (${ob.held}/${ob.need}).`;
      case 'cache':
        return o.searched
          ? o.real
            ? `The real cache. Dig it out: Interact ×${ob.need} (${ob.done || 0}/${ob.need}).`
            : 'A decoy cache.'
          : 'A cache — search it by stepping on it, or reveal it from range.';
      case 'valve':
        return `The valve. Channel ×${ob.need} (${ob.done}/${ob.need}).`;
      case 'crate':
        return 'A crate. Interact on or beside it to pick it up, then carry it to the near edge (A).';
      case 'mark': {
        const el = { M: 'Mass', C: 'Charge', S: 'Space', T: 'Time' }[o.el];
        return o.veiled
          ? `A veiled survey mark (${el}). Sight it first: stand within 1 of it, or reach it with a reveal.`
          : `A survey mark (${el}). Tag it by Interacting while standing on it: 2 AP, or one ${el} or Omni die (${ob.done}/${ob.need}).`;
      }
    }
    return '';
  }

  /* ───────────── update everything ───────────── */
  /** How long the board stays in view before the mission-over modal opens (ms). Tests set it to 0. */
  U.MISSION_OVER_DELAY = 900;
  U.updateMission = function () {
    const m = M();
    clearPreview();
    U.ms.armed = null;
    if (!U.ms.built) buildBoard();
    // what ending the round now would do: the enemy turn is declared, so this is exact (T.forecast)
    U.ms.forecast = T.forecast(m);
    // players take turns: when the turn passes, say whose it is and pick up their pilot
    const turn = U.turn();
    const tkey = turn ? m.round + ':' + (turn.open ? 'open' + turn.left.join('') : turn.seat) : null;
    if (tkey !== U.ms.lastTurn) {
      U.ms.lastTurn = tkey;
      if (turn && turn.open) {
        // whoever acts first takes the next turn
        if (turn.here) {
          const mine = turn.left
            .filter((s) => !U.seats || U.seats.includes(s))
            .flatMap((s) => T.heroesOf(U.run, s))
            .filter((i) => !m.heroes[i].downed);
          if (mine.length && !mine.includes(U.ms.heroIdx)) U.ms.heroIdx = mine[0];
          U.toast(
            U.seats ? 'Take your turn whenever you like: act to begin it.' : 'Anyone can go next: act to begin a turn.',
          );
        }
        if (U.sfx.turn) U.sfx.turn();
      } else if (turn) {
        if (turn.here) {
          const mine = T.heroesOf(U.run, turn.seat).filter((i) => !m.heroes[i].downed);
          if (mine.length && !mine.includes(U.ms.heroIdx)) U.ms.heroIdx = mine[0];
        }
        U.toast(turn.here && U.seats ? 'Your turn.' : `${esc(turn.name)}'s turn.`);
        if (U.sfx.turn) U.sfx.turn();
      }
    }
    if (U.objectiveCheck) U.objectiveCheck(m);
    renderTop(m);
    renderTargetBar(m);
    renderForecast(m);
    renderSide(m);
    renderLog(m);
    showPass(m);
    updateBoard(m);
    // a new round: every resting card steps one column toward Ready, together
    if (U.ms.trackRound != null && U.ms.trackRound !== m.round)
      document.querySelectorAll('.mission .track').forEach((t) => t.classList.add('slide'));
    U.ms.trackRound = m.round;
    scheduleCombos();
    playFx(m);
    if (U.feelUpdate) U.feelUpdate(m);
    if (m.over && !U.ms.overShown) {
      U.ms.overShown = true;
      setTimeout(() => showMissionOver(m), U.MISSION_OVER_DELAY);
    }
  };

  /** Put the HUD's chosen shape on the screen without drawing it again. */
  function applyHud() {
    const root = $('.mission.hud');
    if (!root) return;
    const L = U.layout;
    root.className = U.hudClass();
    root.setAttribute('data-tab', TABS.some(([k]) => k === L.tab) ? L.tab : 'hand');
    document.querySelectorAll('.mission .ptab').forEach((b) => {
      const on = b.getAttribute('data-arg') === root.getAttribute('data-tab');
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    const fs = $('#mfull');
    if (fs) fs.textContent = L.full ? '⤡ Back to frame' : '⛶ Full screen';
    const gh = $('.mission .grab-hand');
    if (gh) gh.textContent = L.noHand ? 'Hand ▴' : 'Hand ▾';
    const gp = $('.mission .grab-plans');
    if (gp) gp.textContent = L.noPlans ? '◂ Plans' : 'Plans ▸';
    // the board keeps its proportions in its new frame
    if (U.feelResize) U.feelResize();
  }
  U.applyHud = applyHud;

  /**
   * Pass the screen: players taking turns at one screen hand it on between turns. The cover names who is up
   * and hides the hand that was just played until its player has the screen back. In an open round, where
   * players choose their order, it asks who goes next. Online each player has their own screen: no cover.
   */
  function passState(m) {
    const run = U.run;
    if (U.seats || !run.party || T.playerCount(run) < 2 || T.liveRounds(run) || m.over || m.phase !== 'hero')
      return null;
    const p = run.party;
    if (!p.ready.some(Boolean)) return null; // the round's first turn: the table is already looking
    const turn = T.turnSeat(run);
    const left = T.seatsToPlay(run);
    if (turn != null && p.active === turn) return null; // a turn under way: it was begun on this screen
    if (!left.length) return null;
    return { key: m.round + ':' + p.ready.map((x) => (x ? 1 : 0)).join(''), turn, left };
  }
  function showPass(m) {
    const el = $('#mpass');
    if (!el) return;
    const st = passState(m);
    U.ms.passKey = st && st.key;
    if (!st || U.ms.passShown === st.key) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    const run = U.run;
    const p = run.party;
    const name = (s) => esc(p.players[s].name);
    const done = p.players.map((x, s) => s).filter((s) => p.ready[s]);
    const n = p.players.length;
    const pilotOf = (s) => m.heroes[T.heroesOf(run, s).find((i) => !m.heroes[i].downed)];
    const heads = `<span class="dim small">${done.length ? done.map(name).join(', ') + (done.length > 1 ? ' are' : ' is') + ' done' : ''}</span>`;
    let html;
    if (st.turn != null || st.left.length === 1) {
      const s = st.turn != null ? st.turn : st.left[0];
      const h = pilotOf(s);
      const after = st.left.filter((x) => x !== s);
      html = `<div class="pass-in">${h ? U.portrait(h, 'xl') : ''}<span class="kick">Round ${m.round} · turn ${done.length + 1} of ${n}</span><h2>Pass to ${name(s)}</h2><p>${h ? esc(h.name) + "'s turn. " : ''}The last hand stays hidden until its player has the screen again.</p><button class="primary" data-act="passOk" data-arg="${s}">I'm ${name(s)} · show my turn</button>${after.length ? `<span class="dim small">${after.map(name).join(' and ')} go after ${name(s)}</span>` : ''}${heads}</div>`;
    } else {
      const btns = st.left
        .map((s) => {
          const h = pilotOf(s);
          return `<button class="pass-who" data-act="passOk" data-arg="${s}">${h ? U.portrait(h, 'lg') : ''}<b>${name(s)}</b><span class="dim small">${h ? esc(h.name) : ''}</span></button>`;
        })
        .join('');
      html = `<div class="pass-in"><span class="kick">Round ${m.round} · turn ${done.length + 1} of ${n}</span><h2>Pass the screen</h2><p>Who goes next? Players choose their order each round. The last hand stays hidden until its player has the screen again.</p><div class="pass-row">${btns}</div>${heads}</div>`;
    }
    if (el._html !== html) {
      el.innerHTML = html;
      el._html = html;
    }
    el.hidden = false;
  }

  function renderTop(m) {
    const ob = m.objective;
    let prog = '';
    if (ob.kind === 'hold') prog = `${ob.held}/${ob.need} held`;
    else if (ob.kind === 'vault')
      prog = m.board.ramp
        ? `ramp down · seals ${ob.done || 0}/${ob.need}`
        : `lever ${ob.leverDone}/${ob.leverNeed} · seals ${ob.done || 0}/${ob.need}`;
    else if (ob.kind === 'valve') prog = `${ob.done}/${ob.need} channelled`;
    else if (ob.kind === 'find')
      prog = ob.found
        ? `found · dug ${ob.done || 0}/${ob.need}`
        : `${ob.candidates.filter((c) => m.board.nodes[c].objective.searched).length}/${ob.candidates.length} caches checked`;
    else if (ob.kind === 'kill') {
      const t = m.enemies.find((e) => e.type === ob.target);
      prog = t ? `${t.name} ${Math.max(0, t.hp)}/${t.maxHp}` : 'destroyed';
    }
    const clock = m.clock
      ? `<span class="clock ${m.clock.value <= 2 ? 'hot' : ''}" data-tip="${esc(m.clock.label + ' · round ' + m.round)}"><span class="cv">⏳ ${m.clock.value}</span><small class="rnd">round ${m.round}</small></span>`
      : `<span class="pill mono">Round ${m.round}</span>`;
    // the place's rules today: gravity, weather and the hour, folded into one chip; each rule in its tip
    const pl = m.place || {};
    const gb = T.GRAVITY.find((b) => b.id === pl.gravity);
    const wx = T.WEATHER[pl.weather];
    const conds = [
      gb && gb.text ? `<span class="pill" data-tip="${esc(gb.text)}">${esc(gb.name)}</span>` : '',
      wx && wx.text
        ? `<span class="pill" data-tip="${esc(wx.text)}">${pl.weather === 'wind' ? (pl.wind > 0 ? 'Wind → E' : 'Wind ← A') : 'Fog'}</span>`
        : '',
      U.dayPill ? U.dayPill(m) : '',
    ].filter(Boolean);
    const ms = U.ms;
    const condsChip = conds.length
      ? `<span class="conds${ms.conds ? ' open' : ''}"><button class="pill conds-btn" data-act="conds" aria-expanded="${!!ms.conds}" data-tip="The place's rules today: gravity, weather and the hour">${conds.length} condition${conds.length === 1 ? '' : 's'} ${ms.conds ? '▴' : '▾'}</button><span class="conds-list">${conds.join('')}</span></span>`
      : '';
    // the screen's own buttons, behind one menu: the playtest's Plan and Report, sound, help, look, the way out
    const menuBtn = `<button class="ghost sm mmenu-btn${ms.menu ? ' on' : ''}" data-act="mmenu" aria-expanded="${!!ms.menu}" aria-label="Menu" data-tip="Sound, help, look and the way out">☰</button>`;
    const menu = `<div class="mmenu${ms.menu ? ' open' : ''}">${U.missionTopExtra ? U.missionTopExtra(m) : ''}<button class="ghost sm" data-act="toggleSound">${U.sound ? '🔊 Sound' : '🔇 Sound'}</button><button class="ghost sm" data-act="help">? Help</button><button class="ghost sm" data-act="look">Look</button>${U.titleBtn()}</div>`;
    const ae = document.activeElement;
    const typing = ae && ae.id === 'turnNote' ? [ae.selectionStart, ae.selectionEnd] : null;
    const noteOpen = ms.noteOpen || !!typing || !!ms.noteDraft;
    const changed = setHTML(
      $('#mtop'),
      `<div class="topbar"><div class="mhead"><div class="kickrow"><span class="kick">${esc(m.archetype === 'boss' ? 'Finale' : m.archetype === 'elite' ? 'Elite' : 'Mission')} · tier ${m.tier}${m.page && T.PAGE_BY[m.page] ? ` · <button class="linkish" data-act="atlasHere" data-tip="This place in the atlas: its board, its rules and its field notes">${esc(T.PAGE_BY[m.page].name)}</button>` : ''}</span>${condsChip}</div><h3 style="margin:0">${esc(m.title)}</h3>
      <div class="obj${U.layout.obj ? ' open' : ''}" data-act="fold" data-arg="obj" title="${U.layout.obj ? 'Click to fold the objective to two lines' : 'Click to read the whole objective'}"><div class="obj-txt"><b>Objective:</b> ${esc(ob.text)}</div><div class="small dim obj-bonus"><span class="obj-bar" style="--p:${Math.round(100 * T.objectiveProgress(m))}%"><i></i></span><span class="pill obj-prog${U.ms.obJust > Date.now() ? ' just' : ''}" style="--p:${Math.round(100 * T.objectiveProgress(m))}%" data-tip="How far the objective has come">${prog}</span> ${m.bonus.map((b) => '<span class="bonus">○ ' + esc(b.text) + '</span>').join(' ')}</div></div></div>
      <div class="tpills">${clock}${U.purseHTML(m, true)}</div>
      <div class="endgrp${noteOpen ? ' note-open' : ''}"><div class="endrow">${undoBtn(m)}<button class="ghost sm note-btn${noteOpen ? ' on' : ''}" data-act="noteOpen" aria-expanded="${noteOpen}" aria-label="Write a line of story" data-tip="Give this turn a line of story">✎</button>${menuBtn}<button class="primary endbtn" data-act="endRound" ${m.over ? 'disabled' : ''}>${U.endRoundLabel ? U.endRoundLabel() : 'End Round ▶'}</button></div><div class="turnline small">${turnLine(U.run)}</div>${noteBox(m)}${menu}</div></div>`,
    );
    const end2 = $('#mend2');
    if (end2) {
      end2.textContent = U.endRoundLabel ? U.endRoundLabel() : 'End Round ▶';
      end2.disabled = !!m.over;
    }
    const box = changed && typing && $('#turnNote');
    if (box) {
      box.focus();
      box.setSelectionRange(typing[0], typing[1]);
    }
  }

  /**
   * The story box beside End turn: every player may give the round a line of story, as the pilot they have
   * selected (or their own, when they are looking at someone else's), on their own turn or while others take
   * theirs. It is kept with the mission's log (T.addNote) and goes on to the chronicle.
   */
  function noteBox(m) {
    const ms = U.ms;
    const own = (j) => !U.run || T.mayActFor(U.run, U.seats, j);
    let i = ms.noteHero != null && ms.noteDraft != null ? ms.noteHero : ms.heroIdx;
    if (!own(i)) i = m.heroes.findIndex((x, j) => x && own(j));
    const h = m.heroes[i];
    if (m.over || !h || !own(i)) return '';
    const noted = m.log.find((l) => l.who === 'note' && l.hero === i && l.r === m.round);
    const val = ms.noteDraft != null ? ms.noteDraft : noted ? noted.text : '';
    const tip =
      'Optional: what this turn looked like, in a line of story. It changes nothing in play. It is kept in the log, told again between stops, and in the record of the run.';
    return `<label class="turn-note${noted ? ' noted' : ''}" data-tip="${esc(tip)}"><span class="tn-ic">✎</span><input id="turnNote" maxlength="${T.NOTE_MAX}" autocomplete="off" placeholder="${esc(h.name)}, this turn, in a line of story…" value="${esc(val)}"></label>`;
  }
  /** Keep what was typed in the story box, as a line of story for its pilot this round. */
  function commitNote() {
    const ms = U.ms;
    if (!ms || ms.noteDraft == null) return;
    const m = M();
    const i = ms.noteHero != null ? ms.noteHero : ms.heroIdx;
    const text = ms.noteDraft;
    ms.noteDraft = null;
    ms.noteHero = null;
    if (!m || m.over) return;
    const r = U.exec({ op: 'note', hero: i, text });
    if (r && r.ok === false && r.why) U.toast(esc(r.why));
  }
  U.commitNote = commitNote;
  // the menu closes when anything else on the page is clicked
  document.addEventListener('click', (e) => {
    if (!U.ms || !U.ms.menu || U.screen !== 'mission' || !U.run || !U.run.mission) return;
    if (e.target && e.target.closest && e.target.closest('.mmenu, .mmenu-btn')) return;
    U.ms.menu = false;
    renderTop(M());
  });
  document.addEventListener('input', (e) => {
    if (!e.target || e.target.id !== 'turnNote' || !U.ms) return;
    if (U.ms.noteDraft == null) {
      const m = M();
      const own = (j) => !U.run || T.mayActFor(U.run, U.seats, j);
      U.ms.noteHero = own(U.ms.heroIdx) || !m ? U.ms.heroIdx : m.heroes.findIndex((x, j) => x && own(j));
    }
    U.ms.noteDraft = e.target.value;
  });
  document.addEventListener('change', (e) => {
    if (!e.target || e.target.id !== 'turnNote' || U.screen !== 'mission') return;
    const had = U.ms.noteDraft != null && U.ms.noteDraft.trim();
    commitNote();
    renderLog(M());
    const box = e.target.closest('.turn-note');
    if (box) box.classList.toggle('noted', !!had);
  });

  function renderTargetBar(m) {
    const ms = U.ms;
    const el = $('#mtarget');
    if (!el) return;
    if (ms.mode === 'idle') {
      // the how-to line is for the first missions; after that the board speaks for itself and help is in the menu
      const young = !U.run || !U.run.stats || (U.run.stats.missions || 0) < 2;
      el.innerHTML = young ? `<div class="hint">${hintText(m)}</div>` : '';
      return;
    }
    let txt = '';
    if (ms.mode === 'target' && ms.pending.tg.allyMove != null) {
      const ally = m.heroes.find((x) => x.uid === ms.pending.tg.ally);
      txt = `<b>${esc(ms.pending.label)}</b> — choose where ${esc(ally ? ally.name : 'your ally')} goes (up to ${ms.pending.tg.allyMove}; click them to stay). They move now.`;
    } else if (ms.mode === 'target')
      txt = `<b>${esc(ms.pending.label)}</b> — choose a ${ms.pending.tg.need === 'node' ? 'node' : 'target'} (highlighted).`;
    else if (ms.mode === 'choice') txt = `<b>${esc(ms.pending.label)}</b> — push or pull?`;
    else if (ms.mode === 'reroll') txt = `<b>Reroll</b> — click up to ${ms.rerollLeft} banked dice, then confirm.`;
    else if (ms.mode === 'freeMove') txt = `<b>Free step</b> — click a highlighted node (up to ${ms.freeN}).`;
    else if (ms.mode === 'dump') txt = `<b>Return a die</b> — click a banked die to send it back to the pool.`;
    el.innerHTML = `<div class="targeting">${txt}<span class="right row">${ms.mode === 'choice' ? '<button class="sm primary" data-act="choice" data-arg="push">Push</button><button class="sm primary" data-act="choice" data-arg="pull">Pull</button>' : ''}${ms.mode === 'reroll' ? '<button class="sm primary" data-act="rerollConfirm">Confirm</button>' : ''}<button class="sm ghost" data-act="cancelMode">${ms.mode === 'freeMove' || ms.mode === 'reroll' ? 'Skip' : 'Cancel'}</button></span></div>`;
  }
  function hintText(m) {
    const h = hero();
    if (!h || h.downed) return 'Select a hero.';
    const ap = T.apValue(h);
    const parts = [`<b>${esc(h.name)}</b>: ${ap} AP banked`];
    parts.push(
      U.touch()
        ? 'tap a card face to see what it does, tap again to play it · tap a node to walk (1 AP/step)'
        : 'hover a card face to see what it does, click to play it · click a node to walk (1 AP/step) · End Round when done',
    );
    return parts.join(' · ');
  }

  /* ───────────── take-backs ───────────── */
  /** Does this screen take touches rather than a pointer that hovers? (jsdom, with no matchMedia: no.) */
  U.touch = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: none)').matches;
  /** The moves a player can take back: those that only spend what is in hand, on the board in view. */
  const TAKE_BACK = new Set(['face', 'basic', 'gear', 'item', 'interact', 'rally', 'valve', 'dump', 'walk']);
  /** Take-backs are for one screen playing alone or passing the screen; online, the host's mission is shared. */
  const takeBackOn = () => !(U.net && U.net.online && U.net.online());
  /** Called by U.exec before a command: the mission as it stands, if the command could be taken back. */
  U.takeBackBefore = function (cmd) {
    if (U.screen !== 'mission' || !U.ms || !U.run || !U.run.mission) return null;
    if (cmd.op === 'ready' || !takeBackOn()) {
      U.ms.undo = [];
      return null;
    }
    if (!TAKE_BACK.has(cmd.op) || U.run.mission.over) return null;
    return { m: T.clone(U.run.mission), heroIdx: U.ms.heroIdx, label: moveLabel(cmd) };
  };
  /** Called by U.exec after it: keep the old mission if nothing hidden came out, or forget them all if it did. */
  U.takeBackAfter = function (cmd, r, before) {
    if (!before || !U.ms) return;
    if (!r || r.ok === false) return;
    if (!T.canTakeBack(before.m, U.run.mission)) {
      U.ms.undo = [];
      return;
    }
    U.ms.undo.push(before);
    if (U.ms.undo.length > 40) U.ms.undo.shift();
  };
  function moveLabel(cmd) {
    const m = M();
    const h = m.heroes[cmd.hero];
    const who = h ? h.name + "'s " : '';
    if (cmd.op === 'face') return who + T.CARD[cmd.card][cmd.fk].n;
    if (cmd.op === 'basic') return who + ((T.BASIC_BY[cmd.id] && T.BASIC_BY[cmd.id].n) || 'action');
    if (cmd.op === 'gear') return who + T.GEAR_BY[h.gear[cmd.gi].id].abilities[cmd.ai].n;
    if (cmd.op === 'walk') return who + 'step';
    if (cmd.op === 'item') return who + T.CONSUMABLE_BY[h.consumables[cmd.ci]].name;
    return who + { interact: 'Interact', rally: 'Rally', valve: 'fold to Omni', dump: 'returned die' }[cmd.op];
  }
  /** Put the mission back as it stood before the last move that can be taken back. */
  function takeBack() {
    const ms = U.ms;
    const cur = U.run && U.run.mission;
    if (!ms || !cur || cur.over || !ms.undo.length || !takeBackOn()) return;
    const e = ms.undo.pop();
    // lines of story written since are kept: they are words, not moves
    const had = new Set(e.m.log.filter((l) => l.who === 'note').map((l) => l.hero + ':' + l.r + ':' + l.text));
    U.run.mission = e.m;
    cur.log
      .filter((l) => l.who === 'note' && l.r === e.m.round && !had.has(l.hero + ':' + l.r + ':' + l.text))
      .forEach((l) => T.addNote(e.m, l.hero, l.text));
    ms.mode = 'idle';
    ms.pending = null;
    ms.rerollPicked = [];
    ms.heroIdx = e.heroIdx;
    ms.fxDone = e.m.fx.length;
    ms.built = false;
    U.toast(`Taken back: ${esc(e.label)}.`);
    if (U.sfx.click) U.sfx.click();
    afterAction();
  }
  U.takeBack = takeBack;
  function undoBtn(m) {
    if (!takeBackOn() || m.over) return '';
    const last = U.ms.undo[U.ms.undo.length - 1];
    const tip = last
      ? `Take back ${esc(last.label)} (Ctrl+Z). Anything that rolled dice or revealed something cannot be taken back.`
      : 'Nothing to take back. Moves that rolled no dice and revealed nothing can be taken back, until the round ends.';
    return `<button class="ghost undo" data-act="undo" ${last ? '' : 'disabled'} data-tip="${esc(tip)}" aria-label="Undo">↶<span class="undo-lab"> Undo</span></button>`;
  }

  /* ───────────── side panels ───────────── */
  function renderSide(m) {
    const live = T.liveEnemies(m).filter((e) => e.intent);
    const intents =
      live
        .map(
          (e) =>
            `<div class="intent" data-tipid="e${e.uid}" data-tip=""><span class="g">${U.icEnemy(e.type, e.glyph)}</span><span class="who"><b>${esc(e.name)}</b> <span class="dim mono small">${Math.max(0, e.hp)}hp${e.shield ? ' ' + U.ic('enemy.bulwark', '🛡', 'tiny') + e.shield : ''}</span><i class="ehp"><i style="width:${Math.round((100 * Math.max(0, e.hp)) / (e.maxHp || 1))}%"></i></i></span><span class="right small">${U.kw(esc(e.intent.label))}</span></div>`,
        )
        .join('') || '<span class="dim small">No foes standing.</span>';
    const open = U.layout.intents;
    const foes = T.liveEnemies(m).length;
    const changed = setHTML(
      $('#mside'),
      seatPanel(m) +
        `<div class="panel tight intents-panel${open ? '' : ' folded'}"><div class="row fold-head" data-act="fold" data-arg="intents"><b class="lab" data-tip="Declared before you act: each foe does what it says, adapting only to close distance. Each also carries its plan on the board.">Enemy plans</b><span class="dim small right">${open ? (live.length ? `${live.length} act at round end` : '') : `${foes} foe${foes === 1 ? '' : 's'}`}</span>${foldBtn('intents', 'the enemy intents')}</div>${open ? `<div class="intents" style="margin-top:6px">${intents}</div>` : ''}</div>` +
        waitPanel(m),
    );
    renderSquad(m);
    // the pilot being played stays in the dock: its hand, AP, dice and actions always on screen, never folded
    const sel = m.heroes[U.ms.heroIdx];
    setHTML($('#mdock'), sel ? heroPanel(m, sel, U.ms.heroIdx) : '');
    // tooltips on intents are computed lazily
    if (changed)
      document
        .querySelectorAll('#mside [data-tipid]')
        .forEach((el) => el.setAttribute('data-tip', tipFor(el.getAttribute('data-tipid'))));
  }

  /**
   * Where each player stands this round, in words: whose turn it is, who is done, who still has one to take.
   * Null for one player. `here` says whether this screen holds that seat.
   */
  function seatState(run, s) {
    const p = run.party;
    if (!p || T.playerCount(run) < 2) return null;
    const m = run.mission;
    const here = !U.seats || U.seats.includes(s);
    const down = T.heroesOf(run, s).every((i) => !m.heroes[i] || m.heroes[i].downed);
    if (down) return { k: 'down', t: 'down' };
    // online: a player who has gone quiet (the countdown before the AI takes the seat), or a seat the AI flies
    const away = U.net && U.net.away && U.net.away[s];
    if (away != null) return { k: 'away', t: 'lost connection', until: +away };
    const bot = T.botKind ? T.botKind(run, s) : false;
    const ai = (st) =>
      bot ? Object.assign(st, { ai: bot, t: st.k === 'turn' || st.k === 'play' ? 'AI playing' : st.t }) : st;
    if (bot === 'hold' && !p.ready[s] && !T.liveRounds(run) && T.turnSeat(run) !== s)
      return { k: 'ai', t: 'AI holds the seat', ai: bot };
    if (T.liveRounds(run)) return ai(p.ready[s] ? { k: 'done', t: 'done ✓' } : { k: 'play', t: 'playing' });
    if (p.ready[s]) return ai({ k: 'done', t: 'done ✓' });
    const turn = T.turnSeat(run);
    if (turn === s) return ai({ k: 'turn', t: here && U.seats ? 'your turn' : 'their turn' });
    const left = T.seatsToPlay(run);
    if (turn == null && left.includes(s)) return ai({ k: 'next', t: left.length > 1 ? 'any order' : 'next' });
    return ai({ k: 'wait', t: 'waiting' });
  }
  U.seatState = seatState;
  /** m:ss until a time (ms), for a countdown. */
  const clockTo = (until) => {
    const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  };
  /** The countdowns on the mission screen tick with the one over every screen (src/ui/net.js calls this). */
  U.tickAway = function () {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-until]').forEach((el) => {
      el.textContent = clockTo(+el.getAttribute('data-until'));
    });
    const m = U.run && U.run.mission;
    if (!m || !document.querySelector('.mission.hud')) return;
    // a seat went quiet or came back since the last draw: draw the squad and the seat card again
    const key = JSON.stringify(Object.keys((U.net && U.net.away) || {})) + (T.botSeats ? T.botSeats(U.run).join() : '');
    if (key !== U.ms.awayKey) {
      U.ms.awayKey = key;
      renderSide(m);
    }
  };

  /**
   * Online, in play: a card for each seat that has gone quiet (the countdown, and on the host's screen its two
   * choices) and each seat an AI holds for a player who dropped. It stands in for the strip over other screens.
   */
  function seatPanel(m) {
    const run = U.run;
    const N = U.net;
    if (!N || !N.role || !run.party || m.over) return '';
    const name = (s) => esc((N.names && N.names[s]) || run.party.players[s].name || 'Player ' + (s + 1));
    const rows = [];
    for (const k of Object.keys(N.away || {})) {
      const s = +k;
      const mine = N.role === 'guest' && s === N.seat;
      rows.push(`<div class="seat-row away"><b>${mine ? 'You seem to be offline' : name(s) + ' lost connection'}</b>
        <div class="small">An AI pilot takes the seat in <span class="mono" data-until="${+N.away[k]}">${clockTo(+N.away[k])}</span> and plays it safe until they are back.</div>${
          N.role === 'host'
            ? `<div class="seat-acts"><button class="sm" data-act="netGiveAI" data-arg="${s}">Give it to the AI</button><button class="sm ghost" data-act="netWait" data-arg="${s}">Wait for them</button></div>`
            : ''
        }</div>`);
    }
    (T.botSeats ? T.botSeats(run) : [])
      .filter((s) => T.botKind(run, s) === 'hold')
      .forEach((s) =>
        rows.push(
          `<div class="seat-row held"><b>An AI pilot holds ${name(s)}'s seat</b><div class="small">until they are back. Reloading the page puts them back in it.</div></div>`,
        ),
      );
    return rows.length ? `<div class="panel tight seat-panel">${rows.join('')}</div>` : '';
  }

  /** One line under End: who goes after this turn, and whose turn ends the round. */
  function turnLine(run) {
    if (!run || !run.party || T.playerCount(run) < 2) return '';
    const p = run.party;
    const name = (s) => esc(p.players[s].name);
    if (T.liveRounds(run)) {
      const n = p.ready.filter(Boolean).length;
      return n && n < p.players.length
        ? `You can still play after Done, until the last player is done · ${n}/${p.players.length} done`
        : 'Everyone plays at once: foes move when the last player is done';
    }
    const left = T.seatsToPlay(run);
    const turn = T.turnSeat(run);
    const after = left.filter((s) => s !== turn);
    if (turn != null && !after.length) return `${name(turn)} ends the round`;
    if (turn != null) return `Then ${after.map(name).join(', ')}, in any order · the last turn ends the round`;
    if (left.length > 1) return `${left.map(name).join(', ')} still to play, in any order`;
    return '';
  }

  /** The squad: every pilot, its player, its vitality and dice, where it stands this round. Click to fly it. */
  function renderSquad(m) {
    const run = U.run;
    const players = T.playerCount(run);
    const mode = players < 2 ? '' : T.liveRounds(run) ? 'all at once' : 'take turns';
    const p = run.party;
    const done = p && players >= 2 ? p.ready.filter(Boolean).length : 0;
    const rows = m.heroes
      .map((h, i) => {
        const sel = i === U.ms.heroIdx;
        const st = seatState(run, T.ownerOf(run, i));
        const status = st
          ? `<span class="sq-st ${st.k}${st.ai ? ' ai' : ''}">${st.t}${st.until ? ` <span class="mono" data-until="${st.until}">${clockTo(st.until)}</span>` : ''}</span>`
          : `<span class="sq-st ${sel ? 'turn' : 'wait'}">${sel ? 'flying' : h.downed ? 'down' : 'Tab ⇄'}</span>`;
        const els = ['M', 'C', 'S', 'T', 'O']
          .map((e) => ({ e, n: h.held.filter((f) => f === e).length }))
          .filter((x) => x.n)
          .map((x) => `<span class="res-el" style="--c:${EL[x.e].color}">${U.ic('el.' + x.e, x.e)}<b>${x.n}</b></span>`)
          .join('');
        return `<div class="sq-row${sel ? ' sel' : ''}${h.downed ? ' downed' : ''}" data-act="selHero" data-arg="${i}" data-tip="${esc(sel ? `Flying ${h.name}` : `Fly ${h.name} (Tab)`)}">
          ${U.portrait(h, 'sm')}
          <span class="sq-main"><span class="sq-name"><b>${esc(h.name)}</b>${players >= 2 ? ` <span class="dim">· ${esc(T.ownerName(run, i))}</span>` : ''}</span><i class="sq-hp"><i style="width:${(100 * Math.max(0, h.hp)) / h.maxHp}%"></i></i><span class="sq-res">${els}<span class="ap-chip">${T.apValue(h)} AP</span></span></span>
          <span class="sq-side"><span class="mono small">${h.downed ? 'down' : h.hp}${heading(i)}</span>${status}${sel ? '' : `<button class="ghost sm peek" data-act="peek" data-arg="${i}" aria-expanded="${!!U.layout.peek[i]}">${U.layout.peek[i] ? 'Hide cards ▴' : 'Cards ▾'}</button>`}</span>
        </div>`;
      })
      .join('');
    const peeks = m.heroes.map((h, i) => (i !== U.ms.heroIdx && U.layout.peek[i] ? heroPanel(m, h, i) : '')).join('');
    setHTML(
      $('#msquad'),
      `<div class="panel tight squad-panel"><div class="row"><b class="lab">Squad · ${m.heroes.length}${mode ? ' · ' + mode : ''}</b><span class="dim small right">${T.liveRounds(run) && players >= 2 ? `${done} of ${players} done` : ''}</span></div><div class="sq-rows">${rows}</div>${peeks}</div>`,
    );
  }

  /**
   * Online, on a player's own screen: once they have ended their turn (or are done, in live rounds), or while
   * another player takes theirs, a card says who the table is waiting on and how to take it back.
   */
  function waitPanel(m) {
    const run = U.run;
    if (!U.seats || !run.party || T.playerCount(run) < 2 || m.over) return '';
    const p = run.party;
    const name = (s) => `<b>${esc(p.players[s].name)}</b>`;
    const list = (a) =>
      a.length > 1 ? a.slice(0, -1).map(name).join(', ') + ' and ' + name(a[a.length - 1]) : a.map(name).join('');
    const mine = U.seats.every((s) => p.ready[s]);
    if (T.liveRounds(run)) {
      if (!mine) return '';
      const left = T.seatsPlaying(run);
      return `<div class="panel tight wait-panel"><b class="lab ok">You are done with the round</b><div>Waiting on ${list(left)}. Foes act when everyone is done.</div><button class="ghost" data-act="endRound">Take it back</button><div class="dim small">You can still change your moves until the round resolves.</div></div>`;
    }
    const turn = T.turnSeat(run);
    const left = T.seatsToPlay(run);
    const waitingOn = turn != null ? [turn] : left;
    if (waitingOn.some((s) => U.seats.includes(s))) return '';
    return `<div class="panel tight wait-panel"><b class="lab ok">${mine ? 'You ended your turn' : 'Not your turn yet'}</b><div>Waiting on ${list(waitingOn)}. ${mine ? 'Your dice for the next round are rolled: plan while they play.' : 'Watch the board; your turn comes when theirs ends.'}</div></div>`;
  }
  /** Beside a hero's vitality: where it will stand if the round ends now, when that is somewhere else. */
  function heading(i) {
    const f = U.ms.forecast && U.ms.forecast.heroes[i];
    if (!f || f.after === f.hp) return '';
    return ` <span class="${f.after < f.hp ? 'fc-bad' : 'fc-good'}">→ ${f.downed ? 'down' : f.after}</span>`;
  }
  /**
   * "What happens if I end the round now?" — the telegraphs, hazards and objective added up, a chip a pilot,
   * in a strip under the board that is always in view. While a play is previewed (hovered, or tapped once on
   * a touch screen), the strip shows what ending the round would do after that play instead, beside now.
   */
  function forecastChips(m, f, was, prev) {
    const chips = f.heroes
      .map((x, i) => ({ x, i, w: was && was.heroes[i], p: prev && prev.heroes[i] }))
      .filter(({ i }) => !m.heroes[i].downed)
      .map(({ x, w, p }) => {
        const d = x.hp - x.after;
        const changed = w && (w.after !== x.after || w.downed !== x.downed);
        // since the last move, the figure moved: the chip says so with a short pulse
        const bump = p && (p.after !== x.after || p.downed !== x.downed || p.hp !== x.hp) ? ' bump' : '';
        const tone = x.downed || d > 0 ? 'bad' : d < 0 ? 'good' : 'ok';
        const what = x.downed
          ? 'goes down'
          : d > 0
            ? `takes ${d} <span class="dim">(${x.after} left)</span>`
            : d < 0
              ? `mends ${-d} <span class="dim">(${x.after})</span>`
              : 'is untouched';
        const from = changed
          ? `<s class="dim">${w.downed ? 'down' : w.hp - w.after > 0 ? '−' + (w.hp - w.after) : w.hp - w.after < 0 ? '+' + (w.after - w.hp) : 'untouched'}</s> `
          : '';
        return `<span class="fc-chip ${tone}${changed ? ' changed' : ''}${bump}"><b>${esc(x.name)}</b> ${from}${what}</span>`;
      });
    const falls = f.foes.filter((x) => x.falls).length;
    const fellBefore = was ? was.foes.filter((x) => x.falls).length : falls;
    if (falls)
      chips.push(
        `<span class="fc-chip good${falls !== fellBefore ? ' changed' : ''}">${falls} foe${falls > 1 ? 's fall' : ' falls'}</span>`,
      );
    const ob = m.objective;
    if (f.result)
      chips.push(
        `<span class="fc-chip ${f.result === 'won' ? 'good' : 'bad'}"><b>the mission is ${f.result}</b></span>`,
      );
    else if (f.progress.after > f.progress.before)
      chips.push('<span class="fc-chip good">the objective advances</span>');
    else if (ob && ob.kind === 'hold') chips.push('<span class="fc-chip bad">no one is by the beacon</span>');
    return chips.join('');
  }
  function forecastHTML(m, after) {
    const f = U.ms.forecast;
    if (!f) return '';
    const tip =
      'Worked out from the declared intents, hazards and effects in play. Nothing in an enemy turn is random: this is what will happen if you end the round as things stand.';
    if (after)
      return `<div class="forecast preview" data-tip="${esc(tip)}"><span class="fc-lab">After this play, ending the round:</span>${forecastChips(m, after, f)}</div>`;
    return `<div class="forecast" data-tip="${esc(tip)}"><span class="fc-lab">End the round now:</span>${forecastChips(m, f, null, U.ms.fcPrev)}</div>`;
  }
  function renderForecast(m, after) {
    setHTML($('#mfc'), m.over ? '' : forecastHTML(m, after));
    // the next redraw compares with this one; a preview's redraw does not count as a move
    if (!after) U.ms.fcPrev = U.ms.forecast;
  }
  function heroPanel(m, h, i) {
    const sel = U.ms.heroIdx === i;
    const ally = T.allyOf(m, h);
    const states = Object.keys(h.states)
      .map(
        (k) =>
          `<span class="state ${['Weak', 'Rooted', 'Slow', 'SlowSelf', 'NoTele'].includes(k) ? 'bad' : ''}" data-tip="${esc(T.describeState(k, h.states[k]))}">${U.kwOfState(k) ? U.ic(U.kwOfState(k).icon, '', 'kw-ic') : ''}${k}${h.states[k] && h.states[k].v != null ? ' ' + h.states[k].v : ''}${h.states[k] && typeof h.states[k].t === 'number' && h.states[k].t < 90 ? ' · ' + h.states[k].t : ''}</span>`,
      )
      .join('');
    const canPickDie = U.ms.mode === 'reroll' || U.ms.mode === 'dump';
    const poolTip = (x) => {
      const left = T.poolDice(x);
      const n = (k) => left.filter((d) => d === k).length;
      const special = Object.keys(T.DICE)
        .filter((k) => k !== 'plain' && n(k))
        .map((k) => `${n(k)} ${T.DICE[k].n} (d${T.DICE[k].sides})`);
      return `Dice still in your pool: ${n('plain')} plain (d20)${special.length ? ', ' + special.join(', ') : ''}. You roll ${T.RULES.ROLL} a turn, drawn at random from the pool; pool + banked = ${T.RULES.POOL} always. Each awakened card puts a die of its element in your pool in place of a plain one.`;
    };
    // dice lie as they fell: each a little turned, the same way each time it is drawn
    const tilt = (j) => `style="--r:${(((j * 37 + 11) % 13) - 6) * 2}deg"`;
    const dice =
      h.held
        .map((f, di) =>
          U.dieHTML(
            f,
            (canPickDie && sel ? 'pick' : '') + (U.ms.rerollPicked.includes(di) && sel ? ' rolled' : ''),
            T.heldKind(h, di),
            `data-act="die" data-arg="${i}|${di}" ${tilt(di)}`,
          ),
        )
        .join('') + h.temp.map((f, j) => U.dieHTML(f, 'temp', '', tilt(h.held.length + j))).join('');
    const trackCols = [];
    for (let c = 1; c <= T.RULES.TRACK; c++) {
      const items = h.track.filter((t) => t.left === c);
      trackCols.push(
        `<div class="tcol"><span class="n" data-tip="${c === 1 ? 'Back in hand next round' : 'Back in ' + c + ' rounds'}">${c}</span><span class="tlab">${c === 1 ? 'next round' : 'in ' + c}</span>${items.map((t) => `<span class="tpill ${t.phase}" data-tip="${esc(T.CARD[t.card].name)} — ${t.phase === 'dur' ? 'active (duration), then cools ' + t.cd : 'cooling'}; returns to hand in ${t.left + (t.phase === 'dur' ? t.cd : 0)}">${t.phase === 'dur' ? '●' : '○'} ${esc(T.CARD[t.card].name)}</span>`).join('')}</div>`,
      );
    }
    const hand = h.cards
      .map((cid) => {
        const c = T.CARD[cid];
        const P = T.heroP(h, cid),
          E = T.heroE(h, cid);
        const onTrack = h.track.find((t) => t.card === cid);
        const asleep = E < T.RULES.ETHEREAL_MIN_E;
        const elC = EL[(c.E && c.E.elt) || c.el].color;
        const title = `<div class="hn">${esc(c.name)}${c.sig >= 2 ? ' <span class="star">★</span>' : ''}<span class="pe">P${P} E${E}</span></div>`;
        if (onTrack)
          return `<div class="hcard cooling" style="--c:${elC}">${U.cardArt(c, asleep, U.cladeIn(c, h.species))}${title}<div class="small dim back">on track · back in ${onTrack.left + (onTrack.phase === 'dur' ? onTrack.cd : 0)}</div></div>`;
        const fb = (fk) => {
          const f = c[fk];
          const chk = !m.over && !h.downed ? T.canPlay(m, h, cid, fk) : { ok: false, why: '' };
          const elt = f.elt || c.el;
          const cost = `${f.ap}AP${f.el ? ' +' + f.el + '<span style="color:' + EL[elt].color + '">◆</span>' : ''}${f.cd ? ' cd' + f.cd : ''}`;
          return `<button class="fbtn ${fk} ${chk.ok ? 'ok' : ''} el-${fk === 'E' ? elt : 'AP'}" data-act="face" data-arg="${i}|${cid}|${fk}" data-tip="${U.faceTipHTML(c, fk, P, E).replace(/"/g, '&quot;')}" ${chk.ok ? '' : 'disabled'}><span class="fic" style="color:${fk === 'E' ? EL[elt].color : 'var(--txt)'}">${U.icFace(f, c.el)}</span><span>${esc(f.n)}</span><span class="fcost">${cost}</span>${!chk.ok && chk.why && chk.why !== 'cannot pay' ? `<span class="fwhy">${esc(chk.why)}</span>` : ''}</button>`;
        };
        // a card with nothing it can do now folds small; hovering it brings it back
        const idle =
          m.over || h.downed || (!T.canPlay(m, h, cid, 'P').ok && !T.canPlay(m, h, cid, 'E').ok) ? ' idle' : '';
        return `<div class="hcard${idle}" style="--c:${elC}">${U.cardArt(c, asleep, U.cladeIn(c, h.species))}${title}${fb('P')}${fb('E')}</div>`;
      })
      .join('');
    const gear = h.gear
      .map((g, gi) => {
        const def = T.GEAR_BY[g.id];
        return def.abilities
          .map((a, ai) => {
            const ok = !m.over && !h.downed && g.cds[ai] <= 0 && T.crystalsFor(m, i) >= a.cost;
            return `<button class="gbtn ${ok ? 'ok' : ''}" data-act="gear" data-arg="${i}|${gi}|${ai}" data-tip="${esc(`<b>${esc(def.name)} — ${esc(a.n)}</b><div>${esc(a.txt())}</div><div class='mono small'>${a.cost} ◇ · cd ${a.cd}</div>${U.kwGloss(a.txt())}`)}" ${ok ? '' : 'disabled'}>${U.icGear(g.id)} ${esc(a.n)} <span class="dim">${a.cost}◇${g.cds[ai] > 0 ? ' · ' + g.cds[ai] : ''}</span></button>`;
          })
          .join('');
      })
      .join('');
    const cons = h.consumables
      .map(
        (c, ci) =>
          `<button class="gbtn" data-act="cons" data-arg="${i}|${ci}" data-tip="${esc(T.CONSUMABLE_BY[c].txt)}" ${m.over || h.downed ? 'disabled' : ''}>${U.icCons(c)} ${esc(T.CONSUMABLE_BY[c].name)}</button>`,
      )
      .join('');
    const head = `<div class="hh">${U.portrait(h, 'md')}<span class="nm">${esc(h.name)}</span>${U.seatTag ? U.seatTag(i) : ''}<span class="tt">${esc(h.title)}</span><span class="hp">${h.downed ? 'DOWNED' : h.hp + '/' + h.maxHp}${heading(i)}</span></div>
      <div class="hpbar" style="margin-top:4px"><i style="width:${(100 * Math.max(0, h.hp)) / h.maxHp}%"></i></div>
      <div class="states">${h.carrying ? `<span class="state" data-tip="Carrying a crate: reach any space on the near edge (A) to set it down. Dropped if you go down.">Crate</span>` : ''}${states}</div>`;
    const diceRow = `<div class="dice"><span class="dhand">${dice || '<span class="dim small">no dice banked</span>'}</span><span class="pool" data-tip="${esc(poolTip(h))}">pool ${h.pool}</span><span class="ap-chip" data-tip="Action points banked">${T.apValue(h)} AP</span></div>`;
    // a pilot not selected folds to its vitality and dice; its cards open on request
    if (!sel && !U.layout.peek[i]) {
      const ready = h.cards.filter(
        (cid) =>
          !h.track.some((t) => t.card === cid) &&
          !m.over &&
          !h.downed &&
          (T.canPlay(m, h, cid, 'P').ok || T.canPlay(m, h, cid, 'E').ok),
      ).length;
      const onTrack = h.track.length;
      return `<div class="hero folded ${h.downed ? 'downed' : ''}" data-act="selHero" data-arg="${i}">
      ${head}${diceRow}
      <div class="fold-sum small dim"><span>${h.cards.length} cards · ${ready} playable now${onTrack ? ` · ${onTrack} on the track` : ''}${h.gear.length ? ` · ${h.gear.length} gear` : ''}</span><button class="ghost sm peek" data-act="peek" data-arg="${i}">Show cards ▾</button></div>
    </div>`;
    }
    const inode = h.downed ? null : interactNode(m, h);
    const canInteract = inode != null && (T.apValue(h) >= 2 || !!T.markPay(h, m.board.nodes[inode].objective));
    const down = T.downedAllyOf(m, h);
    const canRally = !h.downed && down && down.downed && B.adjacent(m.board, h.pos, down.pos) && T.apValue(h) >= 2;
    const canValve = !h.downed && ['M', 'C', 'S', 'T'].every((f) => h.held.includes(f));
    // the four basic actions used most stay in view; the rest (and the channelled ones) wait behind More
    const MAIN = ['strike', 'brace', 'shove', 'spot'];
    const basicBtn = (b) => {
      const ok = !m.over && T.canUseBasic(m, h, b.id).ok;
      if (b.el && !ok) return ''; // a channelled action shows only while its etherion is in the bank
      const tip = b.el
        ? `${b.n}, channelled (${b.ap ? b.ap + ' AP + ' : ''}1 ${EL[b.el].name} or Omni${b.ap ? '' : ', no AP'}): ${b.txt}`
        : `${b.n} (${b.ap} AP): ${b.txt} Anyone can do this, any number of times.`;
      const mark = b.el ? ` <span style="color:${EL[b.el].color}">+◆</span>` : '';
      return `<button class="sm" data-act="basic" data-arg="${i}|${b.id}" ${ok ? '' : 'disabled'} data-tip="${esc(esc(tip) + U.kwGloss(b.txt))}">${U.icBasic(b)} ${esc(b.n)}${mark}${b.ap || !b.el ? ` <span class="acost">${b.ap}</span>` : ''}</button>`;
    };
    const interactB = `<button class="sm${canInteract ? ' goal-act' : ''}" data-act="interact" data-arg="${i}" ${canInteract ? '' : 'disabled'} data-tip="Interact with an adjacent objective (2 AP; a survey mark also takes a die of its element). Height objectives require standing on the node.">⚙ Interact <span class="acost">2</span></button>`;
    const rallyB = `<button class="sm" data-act="rally" data-arg="${i}" ${canRally ? '' : 'disabled'} data-tip="Revive a downed adjacent ally (2 AP, back at 8).">✚ Rally <span class="acost">2</span></button>`;
    const main = T.BASIC.filter((b) => MAIN.includes(b.id)).map(basicBtn);
    const more = T.BASIC.filter((b) => !MAIN.includes(b.id))
      .map(basicBtn)
      .filter(Boolean);
    // Interact and Rally join the four when they can be used: they are what the moment is about
    (canInteract ? main : more).push(interactB);
    (canRally ? main : more).push(rallyB);
    more.push(
      `<button class="sm" data-act="valve" data-arg="${i}" ${canValve ? '' : 'disabled'} data-tip="Anti-brick valve: fold one each of M, C, S, T into one Omni (3 dice return to the pool).">◇ Fold 4→Omni</button>`,
      `<button class="sm ghost" data-act="dumpMode" data-arg="${i}" ${h.downed || !h.held.length ? 'disabled' : ''} data-tip="Return a banked die to the pool (last resort when your bank is clogged).">↩ Return die</button>`,
    );
    const channelled = T.BASIC.filter((b) => b.el && !m.over && T.canUseBasic(m, h, b.id).ok).length;
    const moreOpen = !!U.ms.moreActs;
    const actions = `<div class="actions${moreOpen ? ' more-open' : ''}">
        ${main.join('')}
        <button class="sm ghost more-btn" data-act="moreActs" aria-expanded="${moreOpen}" data-tip="Every other basic action${channelled ? ', including ' + channelled + ' you can channel now' : ''}">${moreOpen ? 'Fewer actions ▴' : `More actions (${more.length})${channelled ? ' <span class="more-el">+◆</span>' : ''} ▾`}</button>
        <span class="more-acts">${more.join('')}</span>
      </div>`;
    const gearRow = gear || cons ? `<div class="gearrow">${gear}${cons}</div>` : '';
    if (sel) {
      // the dock: who you are flying and what they have to spend on the left, the hand in the middle, the
      // actions anyone can take on the right — the whole of a turn's choices, in one place that never moves
      const ap = T.apValue(h);
      const els = ['M', 'C', 'S', 'T', 'O']
        .map((e) => ({ e, n: h.held.filter((f) => f === e).length + h.temp.filter((f) => f === e).length }))
        .filter((x) => x.n)
        .map(
          (x) =>
            `<span class="res-el" style="--c:${EL[x.e].color}" data-tip="${esc(`${x.n} ${EL[x.e].name} banked: pays a face's ${x.e === 'O' ? 'etherion of any element' : EL[x.e].name + ' cost'}, or channels an action.`)}">${U.ic('el.' + x.e, x.e)}<b>${x.n}</b></span>`,
        )
        .join('');
      return `<div class="hero dock-hero active ${h.downed ? 'downed' : ''}" data-arg="${i}">
      <div class="dk-res">
        ${head}
        <div class="dk-purse">
          <span class="res-ap${ap ? '' : ' empty'}" data-tip="${esc(`Action points banked this turn: ${ap}. Faces, steps (1 AP each), Strike, Brace, Shove, Interact and Rally spend them. What is not spent stays banked.`)}"><b>${ap}</b><span>AP</span></span>
          <span class="res-els">${els || '<span class="dim small">no etherions</span>'}</span>
          <span class="pool" data-tip="${esc(poolTip(h))}">pool ${h.pool}</span>
        </div>
        <div class="dice"><span class="dhand">${dice || '<span class="dim small">no dice banked</span>'}</span></div>
        ${U.diceKey()}
      </div>
      <div class="dk-hand"><div class="track dk-track${h.track.length ? '' : ' empty'}"><span class="tlab tready" data-tip="Cards in hand, ready to play">Track · ready ${h.cards.length - h.track.length}</span>${trackCols.join('')}</div><div class="hand">${hand}</div></div>
      <div class="dk-acts">${actions}${gearRow}</div>
    </div>`;
    }
    return `<div class="hero peeking ${h.downed ? 'downed' : ''}" data-act="selHero" data-arg="${i}">
      ${head}${diceRow}<div class="fold-sum small dim"><span>Not being flown: click to fly ${esc(h.name)}</span><button class="ghost sm peek" data-act="peek" data-arg="${i}">Hide cards ▴</button></div>
      ${h.track.length ? `<div class="track">${trackCols.join('')}</div>` : ''}
      <div class="hand">${hand}</div>
      ${actions}
      ${gearRow}
    </div>`;
  }
  function interactNode(m, h) {
    const nodes = [h.pos].concat(B.walkNeighbors(m.board, h.pos));
    for (const n of nodes) {
      const nd = m.board.nodes[n];
      if (!nd.objective) continue;
      const k = nd.objective.kind;
      if (k === 'beacon' || k === 'dock') continue;
      if (k === 'crate' && h.carrying) continue;
      if (nd.height && n !== h.pos) continue;
      if (k === 'cache' && (!m.objective.found || !nd.objective.real) && n !== h.pos) continue;
      if (k === 'cache' && nd.objective.searched && !nd.objective.real) continue;
      if (k === 'lever' && m.board.ramp) continue;
      if (k === 'mark' && (nd.objective.veiled || n !== h.pos)) continue;
      return n;
    }
    return null;
  }

  function renderLog(m) {
    const el = $('#mlog');
    const changed = setHTML(
      el,
      m.log
        .slice(-60)
        .map((l) =>
          l.who === 'note'
            ? `<div class="l note">${U.portrait && m.heroes[l.hero] ? U.portrait(m.heroes[l.hero], 'xs') : ''}<span>“${esc(l.text)}”</span> <span class="dim small">— ${esc(m.heroes[l.hero] ? m.heroes[l.hero].name : '')}</span></div>`
            : `<div class="l ${l.who}">${U.kw(esc(l.text))}</div>`,
        )
        .join(''),
    );
    if (changed) el.scrollTop = el.scrollHeight;
  }

  /* ───────────── board update ───────────── */
  function validNodes(m) {
    const ms = U.ms;
    const h = hero();
    if (!h || h.downed) return new Set();
    if (ms.mode === 'target' && ms.pending.tg.need === 'node') return new Set(ms.pending.tg.options);
    if (ms.mode === 'freeMove') return new Set(T.reachableWalk(m, h, ms.freeN, false));
    if (ms.mode === 'idle' && !m.over) {
      const ap = T.apValue(h) + (h.freeMove || 0);
      if (ap <= 0 || h.states.Rooted || h.states.SlowSelf) return new Set();
      return new Set(T.reachableWalk(m, h, Math.min(ap, 4), false));
    }
    return new Set();
  }
  function validTargets(m) {
    const ms = U.ms;
    if (ms.mode === 'target' && (ms.pending.tg.need === 'foe' || ms.pending.tg.need === 'foeOrAlly'))
      return new Set(ms.pending.tg.options);
    return new Set();
  }

  function updateBoard(m) {
    const g = U.ms.g;
    const svg = U.ms.svg;
    const N = m.board.nodes;
    const vn = validNodes(m);
    const vt = validTargets(m);
    // nodes
    Object.values(N).forEach((n) => {
      const el = $('#node-' + n.id, svg);
      if (!el) return;
      el.setAttribute(
        'class',
        [
          'node',
          n.height ? 'height' : '',
          n.hazard ? 'hazard' : '',
          n.spawn ? 'spawn' : '',
          vn.has(n.id) ? 'valid' : '',
        ].join(' '),
      );
      el.setAttribute('data-tipid', 'n' + n.id);
      el.setAttribute('data-tip', tipFor('n' + n.id));
    });
    svg
      .querySelectorAll('.edge.climb')
      .forEach((e) => e.setAttribute('class', 'edge climb' + (m.board.ramp ? ' ramp' : '')));
    // markers
    const mk = $('#markers', svg);
    mk.innerHTML = '';
    Object.values(N).forEach((n) => {
      const x = g.px(n),
        y = g.py(n);
      if (n.hazard) {
        const hg = svgEl('g', { class: 'hazmark', transform: `translate(${x - 8},${y - 40}) scale(0.66)` }, mk);
        U.iconPaths('node.cascade').forEach((d) => svgEl('path', { d }, hg));
      }
      if (n.spawn) svgEl('circle', { cx: x + 22, cy: y - 22, r: 5, fill: '#e56a8f' }, mk);
      if (n.objective) {
        const o = n.objective;
        let ic = OBJ_ICON[o.kind];
        if (o.kind === 'cache') ic = o.searched ? (o.real ? '💎' : '✖') : '❓';
        const key =
          o.kind === 'cache'
            ? o.searched
              ? o.real
                ? 'cons.shard'
                : null
              : 'obj.cache'
            : o.kind === 'mark' && o.veiled
              ? 'obj.veiled'
              : 'obj.' + o.kind;
        const ps = key && U.iconPaths(key);
        if (ps) {
          const og = svgEl(
            'g',
            {
              class: 'objmark-ic k-' + o.kind + (o.el ? ' mk-' + o.el : ''),
              transform: `translate(${x - 11},${y - 11}) scale(0.92)`,
            },
            mk,
          );
          ps.forEach((d) => svgEl('path', { d }, og));
        } else
          svgEl(
            'text',
            { x: x, y: y + 6, class: 'objmark', 'text-anchor': 'middle', 'font-size': 18 },
            mk,
          ).textContent = ic;
      }
      if (m.traps[n.id] && m.traps[n.id].length)
        svgEl('text', { x: x - 22, y: y - 18, class: 'trapmark' }, mk).textContent = '🪤';
    });
    m.zones.forEach((z) => {
      const n = N[z.node];
      svgEl(
        'circle',
        {
          cx: g.px(n),
          cy: g.py(n),
          r: g.cell * z.radius * 0.75,
          fill: '#7fd08a',
          opacity: 0.12,
          stroke: '#7fd08a',
          'stroke-dasharray': '4 4',
        },
        mk,
      );
    });
    // intents
    const it = $('#intents', svg);
    it.innerHTML = '';
    T.liveEnemies(m).forEach((e) => {
      if (!e.intent) return;
      const tgt =
        e.intent.target != null
          ? m.heroes.find((h) => h.uid === e.intent.target) || m.decoys.find((d) => d.uid === e.intent.target)
          : null;
      const a = N[e.pos];
      if (tgt && N[tgt.pos]) {
        const b = N[tgt.pos];
        const dx = g.px(b) - g.px(a),
          dy = g.py(b) - g.py(a);
        const L = Math.hypot(dx, dy) || 1;
        const ux = dx / L,
          uy = dy / L;
        svgEl(
          'line',
          {
            x1: g.px(a) + ux * 24,
            y1: g.py(a) + uy * 24,
            x2: g.px(b) - ux * 30,
            y2: g.py(b) - uy * 30,
            class: 'intent-line',
          },
          it,
        );
      }
      const lbl = svgEl('text', { x: g.px(a), y: g.py(a) - 34, class: 'intent-lbl', 'text-anchor': 'middle' }, it);
      lbl.textContent = e.intent.label.replace(/ → [^(]*/, ' ').slice(0, 34);
    });
    // tokens
    const tk = $('#tokens', svg);
    const seen = new Set();
    const upsert = (id, cls, n, build, upd) => {
      let el = $('#' + id, svg);
      if (!el) {
        el = svgEl('g', { id, class: 'token ' + cls }, tk);
        build(el);
      }
      // where it stands; a token mid-walk keeps walking and goes home when it arrives (walkToken)
      el._home = `translate(${g.px(n)},${g.py(n)})`;
      if (!el._walking) el.setAttribute('transform', el._home);
      el.setAttribute('class', 'token ' + cls + (el._walking ? ' walking' : ''));
      upd(el);
      seen.add(id);
      return el;
    };
    m.heroes.forEach((h, i) => {
      if (!N[h.pos]) return;
      const cls = ['hero', U.ms.heroIdx === i ? 'active' : '', h.downed ? 'downed' : ''].join(' ');
      upsert(
        'tok-' + h.uid,
        cls,
        N[h.pos],
        (el) => {
          el.setAttribute('data-act', 'selHeroTok');
          el.setAttribute('data-arg', String(i));
          el.setAttribute('data-tipid', 'h' + h.uid);
          svgEl('circle', { r: 20, class: 'body' }, el);
          const face = U.portraitSrc(U.pilotOf(h));
          if (face) {
            svgEl(
              'image',
              { href: face, x: -18, y: -18, width: 36, height: 36, 'clip-path': 'url(#face-clip)', class: 'face' },
              el,
            );
            svgEl('circle', { r: 20, class: 'ring' }, el);
          } else svgEl('text', { y: 5, class: 'initial' }, el).textContent = h.name[0];
          svgEl('rect', { x: -18, y: 24, width: 36, height: 4, rx: 2, class: 'hpb' }, el);
          svgEl('rect', { x: -18, y: 24, width: 36, height: 4, rx: 2, class: 'hpf' }, el);
          svgEl('text', { y: 36, class: 'hp' }, el);
          svgEl('text', { x: 16, y: -12, class: 'hp', id: 'sh-' + h.uid }, el);
        },
        (el) => {
          el.querySelector('.hpf').setAttribute('width', (36 * Math.max(0, h.hp)) / h.maxHp);
          el.querySelector('.hp').textContent = h.downed ? 'down' : h.hp;
          stateBadges(el, h, 20);
          el.setAttribute('data-tip', tipFor('h' + h.uid));
        },
      );
    });
    m.enemies.forEach((e) => {
      if (!e.alive || !N[e.pos]) return;
      const hid = T.isHidden(e) && !e.states.Located;
      const cls = [
        'enemy',
        e.elite ? 'elite' : '',
        e.boss ? 'boss' : '',
        hid ? 'hidden' : '',
        vt.has(e.uid) ? 'targetable' : '',
      ].join(' ');
      upsert(
        'tok-' + e.uid,
        cls,
        N[e.pos],
        (el) => {
          el.setAttribute('data-act', 'tgtEnemy');
          el.setAttribute('data-arg', String(e.uid));
          el.setAttribute('data-tipid', 'e' + e.uid);
          svgEl('circle', { r: e.boss ? 24 : 18, class: 'body' }, el);
          const ps = U.iconPaths('enemy.' + e.type);
          if (ps) {
            const k = e.boss ? 1.25 : 0.9;
            const g = svgEl('g', { class: 'glyph-ic', transform: `translate(${-12 * k},${-12 * k}) scale(${k})` }, el);
            ps.forEach((d) => svgEl('path', { d }, g));
          } else svgEl('text', { y: 6, class: 'glyph' }, el).textContent = e.glyph;
          svgEl('rect', { x: -16, y: 22, width: 32, height: 4, rx: 2, class: 'hpb' }, el);
          svgEl('rect', { x: -16, y: 22, width: 32, height: 4, rx: 2, class: 'hpf enemy' }, el);
          svgEl('text', { y: 34, class: 'hp' }, el);
          svgEl('text', { x: 16, y: -12, class: 'hp', id: 'sh-' + e.uid }, el);
        },
        (el) => {
          el.querySelector('.hpf').setAttribute('width', (32 * Math.max(0, e.hp)) / e.maxHp);
          el.querySelector('.hp').textContent = e.hp;
          stateBadges(el, e, e.boss ? 24 : 18);
          el.setAttribute('data-tip', tipFor('e' + e.uid));
        },
      );
    });
    m.decoys.forEach((d) => {
      if (!N[d.pos]) return;
      upsert(
        'tok-' + d.uid,
        'decoy' + (vt.has(d.uid) ? ' targetable' : ''),
        N[d.pos],
        (el) => {
          el.setAttribute('data-tipid', 'd' + d.uid);
          el.setAttribute('data-tip', tipFor('d'));
          svgEl('circle', { r: 16, class: 'body' }, el);
          svgEl('text', { y: 5, class: 'initial', 'font-size': 11 }, el).textContent = 'decoy';
        },
        () => {},
      );
    });
    // ally targetable (foeOrAlly)
    tk.querySelectorAll('.token').forEach((el) => {
      if (!seen.has(el.id)) {
        el.style.transition = 'opacity .4s';
        el.style.opacity = 0;
        setTimeout(() => el.remove(), 420);
      }
    });
    if (U.ms.mode === 'target' && U.ms.pending.tg.need === 'foeOrAlly')
      m.heroes.forEach((h) => {
        if (vt.has(h.uid)) {
          const el = $('#tok-' + h.uid, svg);
          if (el) el.setAttribute('class', el.getAttribute('class') + ' targetable');
        }
      });
  }

  /**
   * The states a unit carries, drawn round its token with the same icons the words use on cards (U.kw):
   * what a card says it does and the mark it leaves look alike. Good states sit on the right, bad on the left.
   */
  const BADGE_STATES = [
    'Shield',
    'Hidden',
    'Anchored',
    'Rooted',
    'Marked',
    'Weak',
    'Located',
    'Exposed',
    'Thorns',
    'Stasis',
    'Hover',
    'Weightless',
    'Empower',
    'Preempt',
    'Counter',
    'Slow',
    'SlowSelf',
    'Held',
  ];
  function unitBadges(u) {
    const out = [];
    const shield = u.kind === 'enemy' ? u.shield : u.states.Shield && u.states.Shield.v;
    for (const k of BADGE_STATES) {
      if (k === 'Shield' ? !shield : !u.states[k]) continue;
      if (k === 'Anchored' && u.anchoredPerm) continue;
      const kw = U.kwOfState(k);
      if (!kw) continue;
      const v = k === 'Shield' ? shield : u.states[k] && u.states[k].v;
      out.push({ k, kw, v: typeof v === 'number' ? v : null });
    }
    return out;
  }
  function stateBadges(el, u, r) {
    let g = el.querySelector('.badges');
    if (g) g.remove();
    const list = unitBadges(u);
    if (!list.length) return;
    g = svgEl('g', { class: 'badges' }, el);
    const good = list.filter((b) => b.kw.tone === 'good');
    const bad = list.filter((b) => b.kw.tone !== 'good');
    const place = (arr, side) =>
      arr.forEach((b, j) => {
        const a = ((side > 0 ? -50 : -130) + side * j * 34) * (Math.PI / 180);
        const x = Math.cos(a) * (r + 6),
          y = Math.sin(a) * (r + 6);
        const bg = svgEl(
          'g',
          { class: 'badge kw-' + b.kw.tone, transform: `translate(${x.toFixed(1)},${y.toFixed(1)})` },
          g,
        );
        svgEl('circle', { r: 8 }, bg);
        const ig = svgEl('g', { transform: 'translate(-6,-6) scale(0.5)' }, bg);
        U.iconPaths(b.kw.icon).forEach((d) => svgEl('path', { d }, ig));
        if (b.v != null && b.v > 1) svgEl('text', { x: 7, y: 9, class: 'badge-n' }, bg).textContent = b.v;
      });
    place(good, 1);
    place(bad, -1);
  }

  /* ───────────── preview: what a play would do, before it is made ───────────── */
  /**
   * Hovering a face, a basic action or a gear ability (or, while aiming, a target) plays it on a copy of the
   * mission (T.imagine) and draws the difference on the board: damage, the states it leaves (with the same
   * icons as the words on the card), who moves where, who falls. Combat is deterministic, so this is exactly
   * what the play will do; the copy holds no dice to come.
   */
  function play(copy, p, i, ctx) {
    const h = copy.heroes[i];
    if (p.kind === 'card') return T.playFace(copy, h, p.cardId, p.fk, ctx);
    if (p.kind === 'basic') return T.useBasic(copy, h, p.id, ctx);
    return T.useGear(copy, h, p.gi, p.ai, ctx);
  }
  function units(m) {
    return m.heroes.concat(m.enemies);
  }
  function diffPlay(m, copy) {
    const out = [];
    for (const u of units(copy)) {
      const o = units(m).find((x) => x.uid === u.uid);
      if (!o) continue;
      const hpNow = Math.max(0, o.hp),
        hpThen = Math.max(0, u.hp);
      const fell = (o.kind === 'enemy' ? o.alive && !u.alive : !o.downed && u.downed) || (hpNow > 0 && hpThen <= 0);
      const before = new Set(unitBadges(o).map((b) => b.k + ':' + b.v));
      const added = unitBadges(u).filter((b) => !before.has(b.k + ':' + b.v));
      // a state gone entirely: a setup paid off (Marked, Exposed, Empower spent) or a guard broken
      const after = new Set(unitBadges(u).map((b) => b.k));
      const removed = unitBadges(o).filter((b) => !after.has(b.k));
      const moved = u.pos !== o.pos && m.board.nodes[u.pos] ? u.pos : null;
      if (hpThen !== hpNow || fell || added.length || removed.length || moved != null)
        out.push({ o, u, d: hpThen - hpNow, fell, added, removed, moved });
    }
    return out;
  }
  /**
   * What the world adds to a play: the lines the engine narrates in its own voice (a body slamming down under
   * heavy gravity, a foe that holds fast, a blow that finds an afterimage), and the setups it pays off (a Mark
   * or an Exposed spent, an Empower used). Each is { tone: 'good' | 'bad' | 'neutral', text }.
   */
  const ROUTINE = [/ strikes a .* for \d+\.$/, / collapses\.$/];
  const CATCH = [/holds fast/, /afterimage/, /outside time/, /fully blunted/, /is seared by/];
  function combosOf(m, copy, diffs) {
    const out = [];
    for (const l of copy.log) {
      // (a copy starts with an empty log: T.imagine; everything in it is the play's)
      if (l.who !== 'dm' || ROUTINE.some((re) => re.test(l.text))) continue;
      out.push({ tone: CATCH.some((re) => re.test(l.text)) ? 'bad' : 'good', text: l.text });
    }
    for (const x of diffs)
      for (const b of x.removed || []) {
        const foe = x.o.kind === 'enemy';
        if (foe && b.kw.tone === 'bad') out.push({ tone: 'good', text: `${x.o.name}'s ${b.k} is spent on this` });
        else if (!foe && b.k === 'Empower') out.push({ tone: 'good', text: `${x.o.name}'s Empower is spent on this` });
        else if (foe && b.kw.tone === 'good') out.push({ tone: 'good', text: `${x.o.name} loses ${b.k}` });
        else if (!foe && b.kw.tone === 'good') out.push({ tone: 'bad', text: `${x.o.name} loses ${b.k}` });
      }
    return out;
  }
  function previewFor(p, ctxs, i = U.ms.heroIdx, withForecast) {
    const m = M();
    const all = [];
    const combos = [];
    const p0 = T.objectiveProgress(m);
    let goal = 0;
    for (const ctx of ctxs) {
      const copy = T.imagine(m);
      let r;
      try {
        r = play(copy, p, i, Object.assign({}, ctx));
      } catch (e) {
        r = null;
      }
      if (!r || !r.ok) continue;
      const d = diffPlay(m, copy);
      all.push(...d);
      // one way to make the play: what ending the round would do after it (with several targets, it depends)
      if (withForecast && ctxs.length === 1 && !copy.over) all.fc = T.forecast(copy);
      goal = Math.max(goal, T.objectiveProgress(copy) - p0);
      for (const c of combosOf(m, copy, d)) if (!combos.some((x) => x.text === c.text)) combos.push(c);
    }
    all.combos = combos;
    all.goal = goal > 1e-6 && !(m.objective && m.objective.kind === 'kill') ? goal : 0; // a hit on the target says so itself
    return all;
  }
  U.previewFor = previewFor;
  function drawPreview(diffs, note) {
    const svg = U.ms.svg;
    const g = U.ms.g;
    const pv = svg && $('#preview', svg);
    if (!pv) return;
    pv.innerHTML = '';
    const N = M().board.nodes;
    const words = [];
    for (const x of diffs) {
      const n = N[x.o.pos];
      if (!n) continue;
      const cx = g.px(n),
        cy = g.py(n);
      const grp = svgEl('g', { class: 'pv', transform: `translate(${cx},${cy})` }, pv);
      svgEl(
        'circle',
        { r: 30, class: 'pv-ring ' + (x.d < 0 || x.fell ? (x.o.kind === 'enemy' ? 'good' : 'bad') : 'neutral') },
        grp,
      );
      if (x.d)
        svgEl(
          'text',
          { y: -34, class: 'pv-num ' + (x.d < 0 ? 'dmg' : 'heal'), 'text-anchor': 'middle' },
          grp,
        ).textContent = (x.d > 0 ? '+' : '') + x.d;
      if (x.fell) svgEl('text', { y: 6, class: 'pv-fell', 'text-anchor': 'middle' }, grp).textContent = '✕';
      x.added.forEach((b, j) => {
        const bg = svgEl(
          'g',
          { class: 'badge ghost kw-' + b.kw.tone, transform: `translate(${-10 * (x.added.length - 1) + j * 20},40)` },
          grp,
        );
        svgEl('circle', { r: 9 }, bg);
        const ig = svgEl('g', { transform: 'translate(-6.5,-6.5) scale(0.54)' }, bg);
        U.iconPaths(b.kw.icon).forEach((d) => svgEl('path', { d }, ig));
      });
      if (x.moved != null) {
        const to = N[x.moved];
        svgEl('line', { x1: 0, y1: 0, x2: g.px(to) - cx, y2: g.py(to) - cy, class: 'pv-move' }, grp);
        svgEl('circle', { cx: g.px(to) - cx, cy: g.py(to) - cy, r: 20, class: 'pv-ghost' }, grp);
      }
      const name = x.o.name;
      const bits = [];
      if (x.d) bits.push(`${x.d > 0 ? '+' : ''}${x.d}`);
      if (x.fell) bits.push(x.o.kind === 'enemy' ? 'destroyed' : 'down');
      x.added.forEach((b) =>
        bits.push(
          U.kwChip(
            b.kw,
            b.kw.tip.split(':')[0].replace(/ N$/, '') + (b.v != null && b.k !== 'Hidden' ? ' ' + b.v : ''),
          ),
        ),
      );
      if (x.moved != null) bits.push('→ ' + esc(N[x.moved].label || x.moved));
      (x.removed || []).forEach((b) => bits.push(`<s class="dim">${esc(b.k)}</s>`));
      words.push(`<b>${esc(name)}</b> ${bits.join(' ')}`);
    }
    if (diffs.fc) renderForecast(M(), diffs.fc);
    const bar = $('#mtarget');
    if (diffs.goal) words.unshift('<span class="pv-goal">◎ moves the objective forward</span>');
    if (bar && (words.length || note || (diffs.combos && diffs.combos.length))) {
      let el = bar.querySelector('.pv-line');
      if (!el) {
        el = document.createElement('div');
        el.className = 'pv-line';
        bar.appendChild(el);
      }
      const combos = (diffs.combos || [])
        .slice(0, 4)
        .map((c) => `<span class="pv-combo ${c.tone}">${c.tone === 'bad' ? '⚠' : '✦'} ${U.kw(esc(c.text))}</span>`)
        .join(' ');
      el.innerHTML = `<span class="dim">Would:</span> ${words.join(' · ') || ''}${note ? ` <span class="dim">${note}</span>` : ''}${combos ? `<div class="pv-combos">${combos}</div>` : ''}`;
    }
  }
  function clearPreview() {
    const pv = U.ms && U.ms.svg && $('#preview', U.ms.svg);
    if (pv) pv.innerHTML = '';
    const el = document.querySelector('#mtarget .pv-line');
    if (el) el.remove();
    const fc = document.querySelector('#mfc .forecast.preview');
    if (fc && U.run && U.run.mission) renderForecast(U.run.mission);
    document.querySelectorAll('.mission .armed').forEach((b) => b.classList.remove('armed'));
    if (U.ms) U.ms.armed = null;
  }
  U.clearPreview = clearPreview;
  /** The play a hovered button stands for, with its targets, or null. */
  function pendingOf(btn) {
    const m = M();
    const act = btn.getAttribute('data-act');
    const arg = btn.getAttribute('data-arg') || '';
    const parts = arg.split('|');
    const i = +parts[0];
    const h = m.heroes[i];
    if (!h || !U.mine(i)) return null;
    if (act === 'face') {
      const chk = T.canPlay(m, h, parts[1], parts[2]);
      return chk.ok ? { p: { kind: 'card', cardId: parts[1], fk: parts[2] }, tg: chk.tg, i } : null;
    }
    if (act === 'basic') {
      const chk = T.canUseBasic(m, h, parts[1]);
      return chk.ok ? { p: { kind: 'basic', id: parts[1] }, tg: chk.tg, i } : null;
    }
    if (act === 'gear') {
      const [gi, ai] = [+parts[1], +parts[2]];
      const g = h.gear[gi];
      const ab = g && T.GEAR_BY[g.id].abilities[ai];
      if (!ab) return null;
      const tg = T.targetsFor(m, h, ab.tgt, ab, 0, 0);
      return tg.invalid ? null : { p: { kind: 'gear', gi, ai }, tg, i };
    }
    return null;
  }
  function ctxsFor(tg) {
    if (tg.need === 'none') return [{}];
    if (tg.need === 'foe' || tg.need === 'foeOrAlly') return (tg.options || []).map((target) => ({ target }));
    return [];
  }
  /**
   * Light a ✦ on every play the player could make now that the world would add to: try it on a copy for each
   * target it could pick (and for a few of the nodes it could pick), and keep what the world adds (combosOf).
   * The mark's tip says what; hovering the play shows it on the board.
   */
  let comboJob = 0;
  /**
   * The ✦ marks are worked out after the click has been drawn: each one tries plays on a copy, which is the
   * slowest thing on this screen, and the player should see what they did first. A newer update cancels an
   * older job.
   */
  function scheduleCombos() {
    const job = ++comboJob;
    const run = () => {
      if (job !== comboJob || U.screen !== 'mission' || !U.run || !U.run.mission) return;
      markCombos(U.run.mission);
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(run, 0));
    else setTimeout(run, 0);
  }
  /** The buttons that play something, in the dock and in a pilot's panel opened in the side column. */
  const PLAYS = ['face', 'basic', 'gear'].map((a) => `#mdock [data-act="${a}"], #mside [data-act="${a}"]`).join(', ');
  function markCombos(m) {
    if (m.over || U.ms.mode !== 'idle') {
      document.querySelectorAll('.mission .combo-mark').forEach((x) => x.remove());
      return;
    }
    for (const btn of document.querySelectorAll(PLAYS)) {
      btn.querySelectorAll('.combo-mark').forEach((x) => x.remove()); // the panel is kept when it did not change: work the marks out afresh
      if (btn.disabled) continue;
      const pk = pendingOf(btn);
      if (!pk) continue;
      let ctxs = ctxsFor(pk.tg);
      if (pk.tg.need === 'node') ctxs = (pk.tg.options || []).slice(0, 10).map((node) => ({ node }));
      const pv = previewFor(pk.p, ctxs, pk.i);
      if (pv.goal)
        btn.insertAdjacentHTML(
          'beforeend',
          `<span class="combo-mark goal-mark" data-tip="${esc('<b>◎ This play moves the objective forward</b><div class="dim small">Hover it to see how on the board.</div>')}">◎</span>`,
        );
      const good = (pv.combos || []).filter((c) => c.tone === 'good');
      if (!good.length) continue;
      const tip = `<b>✦ The world adds to this play</b>${good
        .slice(0, 4)
        .map((c) => `<div>${esc(c.text)}</div>`)
        .join('')}<div class="dim small">Hover the play to see it on the board.</div>`;
      btn.insertAdjacentHTML('beforeend', `<span class="combo-mark" data-tip="${esc(tip)}">✦</span>`);
    }
  }
  document.addEventListener('mouseover', (e) => {
    if (U.screen !== 'mission' || !U.ms || !U.ms.built || M().over) return;
    if (U.touch()) return; // a tap is not a hover: a touch screen previews on its first tap (previewFirst)
    const ms = U.ms;
    if (ms.mode === 'idle') {
      const btn = e.target.closest && e.target.closest(PLAYS);
      if (!btn || btn.disabled) return;
      const pk = pendingOf(btn);
      if (!pk) return clearPreview();
      const ctxs = ctxsFor(pk.tg);
      const many = ctxs.length > 1;
      drawPreview(
        previewFor(pk.p, ctxs, pk.i, true),
        pk.tg.need === 'node' ? '(pick a node to see exactly)' : many ? '(each ring is a target you could pick)' : '',
      );
      return;
    }
    if (ms.mode === 'target' && ms.pending) {
      const tok = e.target.closest && e.target.closest('#tokens .token, #nodes .node');
      if (!tok) return;
      let ctx = null;
      const tgArg = tok.getAttribute('data-arg');
      if (tok.classList.contains('enemy') && (ms.pending.tg.need === 'foe' || ms.pending.tg.need === 'foeOrAlly'))
        ctx = { target: +tgArg };
      else if (tok.classList.contains('hero') && ms.pending.tg.need === 'foeOrAlly')
        ctx = { target: M().heroes[+tgArg].uid };
      else if (ms.pending.tg.need === 'node') {
        const node = tok.classList.contains('node')
          ? +tok.getAttribute('data-node')
          : tok.classList.contains('hero')
            ? M().heroes[+tgArg].pos
            : null;
        if (node != null && ms.pending.tg.options.includes(node)) ctx = { node };
      }
      if (!ctx) return;
      const p =
        ms.pending.kind === 'card' ? { kind: 'card', cardId: ms.pending.cardId, fk: ms.pending.fk } : ms.pending;
      drawPreview(previewFor(p, [ctx], U.ms.heroIdx, true));
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (U.screen !== 'mission' || !U.ms || U.touch()) return;
    const from =
      e.target.closest && e.target.closest('#mside [data-act], #mdock [data-act], #tokens .token, #nodes .node');
    const to =
      e.relatedTarget &&
      e.relatedTarget.closest &&
      e.relatedTarget.closest('#mside [data-act], #mdock [data-act], #tokens .token, #nodes .node');
    if (from && from !== to) clearPreview();
  });

  /* ───────────── fx / animation ───────────── */
  function floater(node, text, cls, delay) {
    const m = M();
    const g = U.ms.g;
    const n = m.board.nodes[node];
    if (!n) return;
    const host = $('#board');
    const svg = U.ms.svg;
    if (!host || !svg || !svg.viewBox || !svg.viewBox.baseVal) return;
    const r = svg.getBoundingClientRect();
    const hr = host.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const sc = Math.min(r.width / vb.width, r.height / vb.height);
    const ox = (r.width - vb.width * sc) / 2 + (r.left - hr.left),
      oy = (r.height - vb.height * sc) / 2 + (r.top - hr.top);
    const x = ox + g.px(n) * sc,
      y = oy + g.py(n) * sc - 10;
    setTimeout(() => {
      const d = document.createElement('div');
      d.className = 'floater ' + cls;
      d.style.left = x + 'px';
      d.style.top = y + 'px';
      d.textContent = text;
      host.appendChild(d);
      setTimeout(() => d.remove(), 1200);
    }, delay || 0);
  }
  U.floater = floater;
  function banner(text) {
    const b = $('#banner');
    if (!b) return;
    b.innerHTML = `<span>${esc(text)}</span>`;
    setTimeout(() => {
      if (b) b.innerHTML = '';
    }, 1700);
  }
  /* ───────────── motion: walks and blows (src/ui/sea.js U.motion says how much moves) ───────────── */
  const motion = () => (U.motion ? U.motion() : 'full');
  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  /** Each step of a walk takes this long, node to node along the route the engine walked. */
  U.STEP_MS = 250;
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  /**
   * Walk a token node by node from where it stood to where it stands now, starting after `delay` and after any
   * walk it is already on. Never a teleport: on Full it walks, on Reduced it fades in where it lands, on Off
   * it is simply there. Returns how long the walk takes, so what follows can wait for it.
   */
  function walkToken(m, f, delay) {
    const el = U.ms.svg && U.ms.svg.querySelector('#tok-' + f.ent);
    const g = U.ms.g;
    const N = m.board.nodes;
    if (!el || !g || !N[f.from] || !N[f.to] || f.from === f.to) return 0;
    const mo = motion();
    if (mo === 'off') return 0;
    if (mo === 'reduced' || !raf) {
      setTimeout(() => {
        el.classList.remove('arrive');
        el.getBoundingClientRect();
        el.classList.add('arrive');
        setTimeout(() => el.classList.remove('arrive'), 400);
      }, delay);
      return 0;
    }
    // a walk follows the board's paths; a shove, a pull or a swap slides straight there
    const ids = f.how === 'walk' ? B.path(m.board, f.from, f.to, null, true) || [f.from, f.to] : [f.from, f.to];
    const pts = ids.map((id) => [g.px(N[id]), g.py(N[id])]);
    const steps = pts.length - 1;
    const stepMs = f.how === 'walk' ? U.STEP_MS : 180;
    const ends = (U.ms.walkEnds = U.ms.walkEnds || {});
    const t0 = Math.max(now() + delay, ends[f.ent] || 0);
    const dur = steps * stepMs;
    ends[f.ent] = t0 + dur;
    const put = ([x, y]) => el.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
    if (!el._walking) put(pts[0]);
    el._walking = (el._walking || 0) + 1;
    el.classList.add('walking');
    let started = false;
    const tick = () => {
      const t = (now() - t0) / stepMs;
      if (t < 0) {
        if (started || el._walking === 1) put(pts[0]);
        return raf(tick);
      }
      started = true;
      if (t < steps) {
        const i = Math.floor(t);
        const k = ease(t - i);
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        put([ax + (bx - ax) * k, ay + (by - ay) * k]);
        return raf(tick);
      }
      el._walking--;
      if (!el._walking) {
        el.classList.remove('walking');
        if (el._home) el.setAttribute('transform', el._home);
      } else put(pts[steps]);
    };
    raf(tick);
    return Math.max(0, t0 + dur - now() - delay);
  }
  /** The striker leans into the blow: a short lunge toward the target and back (Full motion only). */
  function lunge(m, f, delay) {
    if (motion() !== 'full' || f.by == null || !raf) return;
    const el = U.ms.svg && U.ms.svg.querySelector('#tok-' + f.by);
    const src =
      m.heroes.find((h) => h.uid === f.by) ||
      m.enemies.find((e) => e.uid === f.by) ||
      m.decoys.find((d) => d.uid === f.by);
    const g = U.ms.g;
    const a = src && m.board.nodes[src.pos];
    const b = m.board.nodes[f.pos];
    if (!el || !a || !b || src.pos === f.pos) return;
    const ax = g.px(a);
    const ay = g.py(a);
    const dx = g.px(b) - ax;
    const dy = g.py(b) - ay;
    const reach = Math.min(0.4, 22 / (Math.hypot(dx, dy) || 1));
    const OUT = 110;
    const BACK = 260;
    setTimeout(
      () => {
        if (el._walking) return;
        const t0 = now();
        const tick = () => {
          const t = now() - t0;
          if (el._walking) return;
          const k = t < OUT ? ease(t / OUT) : 1 - ease(Math.min(1, (t - OUT) / BACK));
          el.setAttribute(
            'transform',
            `translate(${(ax + dx * reach * k).toFixed(1)},${(ay + dy * reach * k).toFixed(1)})`,
          );
          if (t < OUT + BACK) raf(tick);
          else if (el._home) el.setAttribute('transform', el._home);
        };
        raf(tick);
      },
      Math.max(0, delay - OUT),
    );
  }
  function playFx(m) {
    const q = m.fx.slice(U.ms.fxDone);
    U.ms.fxDone = m.fx.length;
    let delay = 0;
    let hitSound = false;
    for (const f of q) {
      const ent =
        f.ent != null
          ? m.heroes.find((h) => h.uid === f.ent) ||
            m.enemies.find((e) => e.uid === f.ent) ||
            m.decoys.find((d) => d.uid === f.ent)
          : null;
      const node = f.pos != null ? f.pos : ent ? ent.pos : null;
      if (f.t === 'move') {
        // the walk plays out before what follows it; a long enemy turn is kept to a few seconds
        const took = walkToken(m, f, delay);
        if (took && delay < 4000) delay += Math.min(took, 1500);
      }
      if (U.feelFx) U.feelFx(m, f, ent, node, delay);
      switch (f.t) {
        case 'dmg':
          lunge(m, f, delay);
          if (node != null) floater(node, '−' + f.amount, 'dmg', delay);
          hitSound = true;
          delay += 160;
          break;
        case 'heal':
          if (node != null && f.amount > 0) floater(node, '+' + f.amount, 'heal', delay);
          delay += 120;
          break;
        case 'shielded':
          if (node != null) floater(node, '🛡 ' + f.blocked, 'block', delay);
          break;
        case 'miss':
          if (node != null) floater(node, 'afterimage', 'miss', delay);
          break;
        case 'roll':
          if (U.sound) setTimeout(() => U.sfx.roll(), delay);
          break;
        case 'reveal':
          if (U.sound) setTimeout(() => U.sfx.reveal(), delay);
          break;
        case 'trap':
          if (U.sound) setTimeout(() => U.sfx.trap(), delay);
          if (f.node != null) floater(f.node, 'SNAP', 'dmg', delay);
          break;
        case 'death':
          if (node != null) floater(node, '✕', 'miss', delay);
          break;
        case 'down':
          banner('DOWNED');
          break;
        case 'revive':
          banner('RISES');
          if (U.sound) U.sfx.heal();
          break;
        case 'phase2':
          banner('THE HEART CRACKS');
          break;
        case 'flood':
          break;
        case 'ramp':
          banner('RAMP DOWN');
          break;
        case 'over':
          setTimeout(() => (f.won ? U.sfx.win() : U.sfx.lose()), 200);
          break;
      }
    }
    if (hitSound) U.sfx.hit();
  }

  /* ───────────── mission over ───────────── */
  function showMissionOver(m) {
    const bonus = m.bonus
      .map((b) => `<div class="bonus ${b.achieved ? 'ok' : 'no'}">${b.achieved ? '✓' : '○'} ${esc(b.text)}</div>`)
      .join('');
    U.openModal(
      `<h2>${m.won ? 'Mission complete' : 'Mission failed'}</h2><p class="dim">${esc(m.title)} · ${m.round} rounds · ${m.stats.kills} foes destroyed</p>${m.won ? bonus : `<p>${U.run.lifeline > 0 && !m.isBoss ? 'Your Lifeline will carry you on — no rewards from this stop.' : 'Tumult keeps the expedition.'}</p>`}${U.momentQuestion ? U.momentQuestion(m) : ''}${U.placeQuestion ? U.placeQuestion(m) : ''}${U.missionOverExtra ? U.missionOverExtra(m) : ''}<div class="row" style="margin-top:12px"><button class="primary" data-act="missionDone">Continue</button></div>`,
    );
  }

  /* ───────────── interaction ───────────── */
  function onBoardClick(e) {
    const tok = e.target.closest('[data-act]');
    if (tok) return; // tokens handled by delegation
    const nd = e.target.closest('[data-node]');
    if (!nd) return;
    const node = +nd.getAttribute('data-node');
    nodeClicked(node);
  }
  function nodeClicked(node) {
    const m = M();
    const ms = U.ms;
    const h = hero();
    if (!h || m.over) return;
    if (U.mine && !U.mine(ms.heroIdx)) return; // another player's pilot
    if (ms.mode === 'target' && ms.pending.tg.need === 'node') {
      if (!ms.pending.tg.options.includes(node)) return;
      commitPending({ node });
      return;
    }
    if (ms.mode === 'freeMove') {
      const opts = T.reachableWalk(m, h, ms.freeN, false);
      if (!opts.includes(node)) return;
      const r = U.exec({ op: 'walk', hero: ms.heroIdx, node, free: ms.freeN });
      if (!r.ok) U.toast(r.why);
      ms.mode = 'idle';
      afterAction();
      return;
    }
    if (ms.mode === 'idle') {
      if (h.downed) return;
      const r = U.exec({ op: 'walk', hero: ms.heroIdx, node });
      if (!r.ok) {
        if (r.why && r.why !== 'no path') U.toast(r.why);
        return;
      }
      U.sfx.click();
      afterAction();
    }
  }
  function beginPlay(i, cardId, fk) {
    const m = M();
    U.ms.heroIdx = i;
    const h = hero();
    const chk = T.canPlay(m, h, cardId, fk);
    if (!chk.ok) {
      U.toast(chk.why || 'Cannot play');
      return;
    }
    const card = T.CARD[cardId];
    const face = card[fk];
    const pending = {
      kind: 'card',
      cardId,
      fk,
      tg: chk.tg,
      label: `${card.name} — ${face.n}`,
      needsChoice: face.fx.some((x) => x.v === 'force' && x.kind === 'choose'),
    };
    if (chk.tg.need === 'none') {
      U.ms.pending = pending;
      commitPending({});
    } else {
      U.ms.pending = pending;
      U.ms.mode = 'target';
      U.updateMission();
    }
  }
  function beginGear(i, gi, ai) {
    const m = M();
    U.ms.heroIdx = i;
    const h = hero();
    const g = h.gear[gi];
    const def = T.GEAR_BY[g.id];
    const ab = def.abilities[ai];
    if (g.cds[ai] > 0 || T.crystalsFor(m, i) < ab.cost) return;
    const tg = T.targetsFor(m, h, ab.tgt, ab, 0, 0);
    if (tg.need !== 'none' && (!tg.options || !tg.options.length)) {
      U.toast('No valid target.');
      return;
    }
    const pending = { kind: 'gear', gi, ai, tg, label: `${def.name} — ${ab.n}`, needsChoice: false };
    if (tg.need === 'none') {
      U.ms.pending = pending;
      commitPending({});
    } else {
      U.ms.pending = pending;
      U.ms.mode = 'target';
      U.updateMission();
    }
  }
  function beginBasic(i, id) {
    const m = M();
    U.ms.heroIdx = i;
    const h = hero();
    const chk = T.canUseBasic(m, h, id);
    if (!chk.ok) {
      U.toast(chk.why || 'Cannot do that now.');
      return;
    }
    const b = T.BASIC_BY[id];
    U.ms.pending = { kind: 'basic', id, tg: chk.tg, label: b.n, needsChoice: false };
    if (chk.tg.need === 'none') commitPending({});
    else {
      U.ms.mode = 'target';
      U.updateMission();
    }
  }
  function commitPending(ctx) {
    const m = M();
    const ms = U.ms;
    const p = ms.pending;
    const h = hero();
    if (p.needsChoice && !ctx.choice && p.tg.need !== 'none') {
      ms.choiceCtx = ctx;
      ms.mode = 'choice';
      U.updateMission();
      return;
    }
    let r;
    const fullCtx = Object.assign({}, ctx);
    const i = ms.heroIdx;
    // every change goes through a command, so it can be carried out on the host's screen (U.exec)
    if (p.kind === 'card') r = U.exec({ op: 'face', hero: i, card: p.cardId, fk: p.fk, ctx: fullCtx });
    else if (p.kind === 'basic') r = U.exec({ op: 'basic', hero: i, id: p.id, ctx: fullCtx });
    else r = U.exec({ op: 'gear', hero: i, gi: p.gi, ai: p.ai, ctx: fullCtx });
    ms.pending = null;
    ms.mode = 'idle';
    if (!r.ok) {
      U.toast(r.why || 'Could not play.');
      U.updateMission();
      return;
    }
    U.sfx.click();
    U.followUp(r.ctx || {});
    afterAction();
  }
  /** What a played face asks of its player next: pick dice to reroll, or a free walk. */
  U.followUp = function (ctx) {
    const m = M();
    const ms = U.ms;
    const h = hero();
    if (ctx.pendingReroll) {
      ms.mode = 'reroll';
      ms.rerollLeft = ctx.pendingReroll;
      ms.rerollPicked = [];
    } else if (ctx.pendingFreeMove && !h.downed && !m.over) {
      const opts = T.reachableWalk(m, h, ctx.pendingFreeMove, false);
      if (opts.length) {
        ms.mode = 'freeMove';
        ms.freeN = ctx.pendingFreeMove;
      }
    }
  };
  function afterAction() {
    U.updateMission();
    // the mission is part of the save: closing the page now loses nothing
    T.saveRun(U.run);
  }

  /**
   * A touch screen cannot hover, so its first tap on a play shows what the play would do (the same preview a
   * mouse gets by hovering) and the second tap makes it. Returns true when this tap only previewed.
   */
  function previewFirst(act, arg, el) {
    if (!U.touch() || !el || U.ms.mode !== 'idle') return false;
    const key = act + ':' + arg;
    if (U.ms.armed === key) return false;
    const pk = pendingOf(el);
    if (!pk) return false;
    clearPreview();
    U.ms.armed = key;
    el.classList.add('armed');
    const ctxs = ctxsFor(pk.tg);
    drawPreview(
      previewFor(pk.p, ctxs, pk.i, true),
      'Tap it again to play' + (pk.tg.need === 'none' ? '.' : ', then pick where.'),
    );
    return true;
  }
  U.handleMissionAct = function (act, arg, el, ev) {
    const m = M();
    const ms = U.ms;
    if ((act === 'face' || act === 'basic' || act === 'gear') && previewFirst(act, arg, el)) return true;
    if (act !== 'mmenu' && ms.menu) ms.menu = false;
    switch (act) {
      // the screen's own folds: they change only what is shown on this screen
      case 'mmenu':
      case 'conds':
      case 'noteOpen': {
        const k = act === 'mmenu' ? 'menu' : act;
        ms[k] = !ms[k];
        renderTop(m);
        if (act === 'noteOpen' && ms.noteOpen) {
          const box = $('#turnNote');
          if (box) box.focus();
        }
        return true;
      }
      // the HUD's own shape: framed or full screen, the trays, the phone's tabs (kept with the folds)
      case 'hudFull':
      case 'hudTray':
      case 'hudTab': {
        const L = U.layout;
        if (act === 'hudFull') {
          L.full = !L.full;
          L.noHand = L.noPlans = false;
        } else if (act === 'hudTray') {
          const k = arg === 'plans' ? 'noPlans' : 'noHand';
          L[k] = !L[k];
        } else if (TABS.some(([k]) => k === arg)) L.tab = arg;
        saveLayout();
        applyHud();
        return true;
      }
      case 'passOk': {
        // the player named on the pass cover takes the screen; in an open round, the one who said "me"
        if (arg != null && arg !== '') {
          const mine = T.heroesOf(U.run, +arg).filter((i) => !m.heroes[i].downed);
          if (mine.length) ms.heroIdx = mine[0];
        }
        ms.passShown = ms.passKey;
        showPass(m);
        U.updateMission();
        return true;
      }
      case 'moreActs':
        ms.moreActs = !ms.moreActs;
        renderSide(m);
        return true;
      case 'undo':
        takeBack();
        return true;
      case 'fold': {
        if (!['log', 'intents', 'obj'].includes(arg)) return true;
        U.layout[arg] = !U.layout[arg];
        saveLayout();
        if (arg === 'log') {
          const log = $('#mlog');
          if (log) {
            log.classList.toggle('folded', !U.layout.log);
            log.scrollTop = log.scrollHeight;
          }
          const btn = $('.mission .bottom .fold');
          if (btn) btn.outerHTML = foldBtn('log', 'the log');
        }
        U.updateMission();
        return true;
      }
      case 'peek':
        U.layout.peek[arg] = !U.layout.peek[arg];
        U.updateMission();
        return true;
      case 'selHero':
        if (ms.mode === 'idle') {
          ms.heroIdx = +arg;
          U.updateMission();
        }
        return true;
      case 'selHeroTok': {
        const i = +arg;
        if (
          ms.mode === 'target' &&
          ms.pending.tg.need === 'foeOrAlly' &&
          ms.pending.tg.options.includes(m.heroes[i].uid)
        ) {
          commitPending({ target: m.heroes[i].uid });
          return true;
        }
        // moving a partner: clicking them keeps them where they stand
        if (ms.mode === 'target' && ms.pending.tg.need === 'node' && ms.pending.tg.options.includes(m.heroes[i].pos)) {
          commitPending({ node: m.heroes[i].pos });
          return true;
        }
        if (ms.mode === 'idle') {
          ms.heroIdx = i;
          U.updateMission();
        }
        return true;
      }
      case 'tgtEnemy': {
        const uid = +arg;
        if (ms.mode === 'target' && ms.pending.tg.options.includes(uid)) {
          commitPending({ target: uid });
        }
        return true;
      }
      case 'face': {
        const [i, cid, fk] = arg.split('|');
        if (ms.mode !== 'idle') {
          ms.mode = 'idle';
          ms.pending = null;
        }
        beginPlay(+i, cid, fk);
        return true;
      }
      case 'gear': {
        const [i, gi, ai] = arg.split('|').map(Number);
        if (ms.mode !== 'idle') {
          ms.mode = 'idle';
          ms.pending = null;
        }
        beginGear(i, gi, ai);
        return true;
      }
      case 'cons': {
        const [i, ci] = arg.split('|').map(Number);
        ms.heroIdx = i;
        const r = U.exec({ op: 'item', hero: i, ci });
        if (!r.ok) U.toast('Cannot use that now.');
        afterAction();
        return true;
      }
      case 'basic': {
        const [i, id] = arg.split('|');
        if (ms.mode !== 'idle') {
          ms.mode = 'idle';
          ms.pending = null;
        }
        beginBasic(+i, id);
        return true;
      }
      case 'interact': {
        const i = +arg;
        ms.heroIdx = i;
        const h = hero();
        const n = interactNode(m, h);
        if (n == null) {
          U.toast('No objective adjacent.');
          return true;
        }
        const r = U.exec({ op: 'interact', hero: i, node: n });
        if (!r.ok) U.toast(r.why);
        else U.sfx.click();
        afterAction();
        return true;
      }
      case 'rally': {
        ms.heroIdx = +arg;
        const r = U.exec({ op: 'rally', hero: +arg });
        if (!r.ok) U.toast(r.why);
        else U.sfx.heal();
        afterAction();
        return true;
      }
      case 'valve': {
        ms.heroIdx = +arg;
        if (U.exec({ op: 'valve', hero: +arg }).ok) U.sfx.click();
        afterAction();
        return true;
      }
      case 'dumpMode': {
        ms.heroIdx = +arg;
        ms.mode = ms.mode === 'dump' ? 'idle' : 'dump';
        U.updateMission();
        return true;
      }
      case 'die': {
        const [i, di] = arg.split('|').map(Number);
        if (i !== ms.heroIdx) return true;
        const h = hero();
        if (ms.mode === 'dump') {
          U.exec({ op: 'dump', hero: i, di });
          ms.mode = 'idle';
          afterAction();
        } else if (ms.mode === 'reroll') {
          if (ms.rerollPicked.includes(di)) ms.rerollPicked = ms.rerollPicked.filter((x) => x !== di);
          else if (ms.rerollPicked.length < ms.rerollLeft) ms.rerollPicked.push(di);
          U.updateMission();
        }
        return true;
      }
      case 'rerollConfirm': {
        if (ms.rerollPicked.length) U.exec({ op: 'reroll', hero: ms.heroIdx, picked: ms.rerollPicked.slice() });
        ms.mode = 'idle';
        ms.rerollPicked = [];
        afterAction();
        return true;
      }
      case 'choice': {
        const ctx = Object.assign({}, ms.choiceCtx || {}, { choice: arg });
        ms.choiceCtx = null;
        commitPending(ctx);
        return true;
      }
      case 'cancelMode':
        ms.mode = 'idle';
        ms.pending = null;
        ms.rerollPicked = [];
        U.updateMission();
        return true;
      case 'endRound': {
        if (m.over) return true;
        ms.mode = 'idle';
        ms.pending = null;
        const unspent = m.heroes.filter((x, i) => !x.downed && T.apValue(x) >= 4 && (!U.mine || U.mine(i))).length;
        if (unspent && !ms.endConfirm) {
          ms.endConfirm = true;
          U.toast('A hero still has 4+ AP banked — banking is fine. Click End Round again to confirm.', 2600);
          setTimeout(() => {
            ms.endConfirm = false;
          }, 4000);
          return true;
        }
        ms.endConfirm = false;
        // with two players, this ends the turn of the one playing; the last turn ends the round
        const t = U.turn && U.turn();
        if (t && !t.here) {
          U.toast(t.open ? 'Your turn is over for this round.' : `It is ${esc(t.name)}'s turn.`);
          return true;
        }
        commitNote();
        // with the next turn open, a player may end theirs without acting: on one screen, the selected pilot's
        const seat = t && t.open && !U.seats ? T.ownerOf(U.run, ms.heroIdx) : undefined;
        U.exec(seat != null ? { op: 'ready', seat } : { op: 'ready' });
        U.sfx.click();
        afterAction();
        return true;
      }
      case 'missionDone': {
        if (U.canonFlush) U.canonFlush();
        U.closeModal();
        T.missionRewards(U.run, m);
        T.applyMissionResult(U.run);
        if (U.run.phase === 'summary') {
          U.screen = 'summary';
          U.finishRunMeta();
        } else {
          U.screen = 'reward';
          T.saveRun(U.run);
        }
        U.render();
        return true;
      }
      case 'toggleSound':
        U.sound = !U.sound;
        U.updateMission();
        return true;
    }
    return false;
  };
  document.addEventListener('keydown', (e) => {
    if (U.screen !== 'mission' || !U.ms) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      if (e.target.id === 'turnNote' && (e.key === 'Enter' || e.key === 'Escape')) e.target.blur();
      return;
    }
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      takeBack();
      return;
    }
    if (e.key === 'Escape') {
      U.ms.mode = 'idle';
      U.ms.pending = null;
      U.updateMission();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      U.ms.heroIdx = (U.ms.heroIdx + 1) % U.run.mission.heroes.length;
      U.updateMission();
    }
    if (e.key === 'e' || e.key === 'E') {
      const b = $('[data-act="endRound"]');
      if (b && !b.disabled) b.click();
    }
  });
})((window.T = window.T || {}));
