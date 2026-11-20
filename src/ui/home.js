/* ============================================================================
   TUMULT — HOME: the first visit, Home, the new-expedition setup, hosting and joining
   a table, the Lobby panel and the waiting room (docs/reference/HOME.md).
   Drawn from the Frogma - Tumult board's "Finalised UI" pages (Landing, Home 1, Setup 4,
   Create A, Join B, Lobby, Waiting C), for desktop and phone alike: one markup, and the
   styles in home.css fold it to a phone.

   Every online piece is optional. Hosting, joining and the Games list need the online
   screens (U.net, src/ui/net.js: the playtest page and the web version); the People tab
   needs the backend's `lobby` capability (src/web/backend-worker.js); signing in needs
   T.Account (src/ui/account.js). Without them Home is the offline game's own title.
   AI seats and the expedition's length come from the engine when it has them
   (T.fillSeats, T.setLength, T.LENGTHS; src/engine/bots.js) and are left out when not.

   What is kept on the device, in the meta save (tumult_v2_meta):
     players, tide          as before (the party picker and the wind)
     where                  'screen' | 'online': where a new expedition is played
     rounds                 'turns' | 'live': how rounds go with two or more players
     table                  { length, aiFill, seats }: the host's choices for a table
     netName                the name a player last gave for online play
   ========================================================================== */
(function (T) {
  const U = T.UI;
  const esc = U.esc;

  /* ───────────── what is on offer here ───────────── */
  const net = () => U.net || null;
  /** Can this page host or join a game online? */
  const online = () => !!(net() && net().available && net().canWrite !== false);
  const acct = () =>
    T.Account && typeof T.Account.available === 'function' && T.Account.available() ? T.Account : null;
  const me = () => {
    const A = acct();
    const u = A && typeof A.user === 'function' ? A.user() : null;
    return u && u.id ? u : null;
  };
  /** A signed-in player (not a guest the server made for an invite). */
  const signedIn = () => !!(me() && !me().guest);
  const lengths = () => (T.LENGTHS && T.LENGTHS.short ? T.LENGTHS : null);

  /* ───────────── the choices, kept in meta ───────────── */
  const setupOf = (meta) => ({
    players: U.chosenPlayers ? U.chosenPlayers(meta) : 1,
    where: meta.where === 'online' && online() ? 'online' : 'screen',
    rounds: meta.rounds === 'live' ? 'live' : 'turns',
    tide: T.TIDES[meta.tide] ? meta.tide : 'rising',
  });
  const tableOf = (meta) => {
    const t = meta.table || {};
    return {
      length: lengths() && t.length === 'short' ? 'short' : 'full',
      aiFill: t.aiFill !== false,
      seats: Math.max(2, Math.min(T.MAX_PLAYERS, +t.seats || T.MAX_PLAYERS)),
    };
  };
  U.homeSetup = () => setupOf(T.loadMeta());
  U.homeTable = () => tableOf(T.loadMeta());
  /** How rounds go for an expedition started from Home (the playtest panel's own switch wins when it has one). */
  U.homeRounds = () => setupOf(T.loadMeta()).rounds;
  const nameFor = (meta) => (signedIn() ? me().name : '') || meta.netName || '';

  /** What a setup says in a sentence, for the line under the choices and for "Same as last time". */
  function setupLine(s) {
    const wind = T.TIDES[s.tide].n;
    if (s.players === 1) return `Solo: you draft and fly two pilots. ${wind}.`;
    const where = s.where === 'online' ? 'online, a screen each' : 'one screen';
    const how = s.rounds === 'live' ? 'you all play each round at once' : 'you take turns';
    const pass = s.where === 'online' ? '' : ', passing it round';
    return `${s.players} players, ${where}: each drafts and flies one pilot and ${how}${pass}. ${wind}.`;
  }
  const short = (s) =>
    [
      s.players === 1 ? 'solo' : `${s.players} players`,
      s.players > 1 ? (s.where === 'online' ? 'online' : 'this screen') : '',
      s.players > 1 ? (s.rounds === 'live' ? 'all at once' : 'take turns') : '',
      T.TIDES[s.tide].n.toLowerCase(),
    ]
      .filter(Boolean)
      .join(' · ');

  /* ───────────── small pieces shared by these screens ───────────── */
  /** A row of choices, one pressed. opts: [{ v, label, off, tip }] */
  function seg(name, act, cur, opts, extra) {
    const btns = opts
      .map(
        (o) =>
          `<button class="hs-opt${o.v === cur ? ' on' : ''}" data-act="${act}" data-arg="${esc(String(o.v))}" aria-pressed="${o.v === cur}"${o.off ? ' disabled' : ''}${o.tip ? ` data-tip="${esc(o.tip)}"` : ''}>${esc(o.label)}</button>`,
      )
      .join('');
    return `<div class="hs-row"><span class="hs-lab">${esc(name)}</span><div class="hs-seg" role="group" aria-label="${esc(name)}">${btns}</div>${extra || ''}</div>`;
  }
  /** A round face for a player: their pilot's portrait when there is one, else their initials. */
  function face(name, hero, cls) {
    if (hero && U.portrait) return `<span class="hm-av ${cls || ''}">${U.portrait(hero, 'sm')}</span>`;
    const ini = String(name || '?')
      .split(/\s+/)
      .map((w) => w[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return `<span class="hm-av ${cls || ''}" aria-hidden="true">${esc(ini || '?')}</span>`;
  }
  U.homeFace = face;
  /** The people online now, from the backend's lobby capability (an empty list without one). */
  U.lobbyPeople = [];
  let lobbyCap = null;
  let lobbyStop = null;
  function followLobby() {
    if (lobbyStop || !T.Backend || !T.Backend.available()) return;
    lobbyStop = () => {};
    T.Backend.use('lobby')
      .then((cap) => {
        lobbyCap = cap && typeof cap.watch === 'function' ? cap : null;
        if (!lobbyCap) return;
        lobbyStop = lobbyCap.watch((list) => {
          U.lobbyPeople = Array.isArray(list) ? list : [];
          if (U.screen === 'title' || U.lobbyOpen || U.screen === 'lobby' || U.screen === 'host') redrawLobbyBits();
        });
      })
      .catch(() => {});
  }
  const onlineCount = () => (lobbyCap ? U.lobbyPeople.length : 0);
  const liveGames = () => {
    const N = net();
    if (!N || !N.games) return [];
    const now = Date.now();
    return N.games.filter((g) => !g.over && now - g.at < (N.LIVE_MS || 120000));
  };
  /** Only the counts and the panel change when the lobby moves: redraw those, never a box being typed in. */
  function redrawLobbyBits() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-lobby-count]').forEach((el) => (el.textContent = lobbyChipText()));
    const p = document.getElementById('lobbyPanel');
    if (p) p.outerHTML = lobbyPanelHTML();
    const ppl = document.getElementById('hostPeople');
    if (ppl) ppl.innerHTML = peopleRows(true);
  }
  const lobbyChipText = () => {
    const n = onlineCount();
    const g = liveGames().length;
    return n ? `Lobby ${n}` : g ? `Lobby · ${g} game${g > 1 ? 's' : ''}` : 'Lobby';
  };

  /** The top bar's right side: the Lobby chip and who is signed in (U.shellRight, src/ui/shell.js). */
  function rightSide() {
    const lobby =
      online() || lobbyCap
        ? `<button class="hm-chip${onlineCount() ? ' live' : ''}" data-act="lobbyOpen" aria-haspopup="dialog"><i aria-hidden="true">●</i> <span data-lobby-count>${esc(lobbyChipText())}</span></button>`
        : '';
    const A = acct();
    const u = me();
    const who = !A
      ? ''
      : signedIn()
        ? `<button class="hm-me" data-act="account" data-tip="${esc(u.name || 'Your account')}" aria-label="Your account">${face(u.name)}</button>`
        : `<button class="ghost sm hm-signin" data-act="signIn">Sign in</button>`;
    return lobby + who;
  }
  const prevRight = U.shellRight;
  U.shellRight = function () {
    return (prevRight ? prevRight() : '') + rightSide();
  };
  /** A screen in the app's frame: the shared top bar and phone tabs when src/ui/shell.js is here, else a bar of our own. */
  function framed(tab, inner, cls) {
    if (U.shell) return U.shell(tab, `<div class="home ${cls || ''}">${inner}</div>`);
    return `<div class="home ${cls || ''}"><header class="hm-bar"><span class="hm-brand">TUMULT</span><nav class="hm-nav"><button class="hm-link" data-act="help">How to play</button><button class="hm-link" data-act="atlas">Atlas</button><button class="hm-link" data-act="codex">Codex</button><button class="hm-link" data-act="canonList">Canon</button><button class="hm-link" data-act="look" aria-label="Look: the sea, its accent and motion">Look</button><button class="hm-link" data-act="toggleSound" aria-label="Sound">${U.sound ? '🔊' : '🔇'}</button></nav><span class="hm-right">${rightSide()}</span></header>${inner}</div>`;
  }

  /* ───────────── the scene behind Home ───────────── */
  function backdrop(meta) {
    const art = U.PILOT_ART || [];
    if (!art.length || !U.sceneSrc) return '';
    const who = art[(meta.runs || 0) % art.length];
    const scene = U.sceneSrc(who);
    if (!scene) return '';
    const cap = `<div class="title-cap"><b>${esc(who.name)}</b> · ${esc(U.callsignOf(who))} · ${esc(who.clades.join(' · '))} ${U.canonMark ? U.canonMark('pilot:' + who.key, `${who.name}, callsign ${U.callsignOf(who)}: ${who.clades.join(' and ')}`, 'title:caption') : ''}</div>`;
    return `<div class="hm-scene" aria-hidden="true"><div class="hm-scene-img" style="background-image:url(${scene})"></div></div><div class="hm-veil" aria-hidden="true"></div>${cap}`;
  }

  /** The way back into an online game this screen was in (net.js remembers it). */
  const rejoinTile = () => {
    const m = net() && net().remembered && net().remembered();
    return m
      ? `<button class="hm-act hm-back" data-act="netRejoin"><b>Rejoin game ${esc(m.code)}${m.role === 'host' ? ' as host' : ''}</b><span>${m.role === 'host' ? 'Your table' : 'The game you were in'}</span></button>`
      : '';
  };

  /* ───────────── first visit: the landing ───────────── */
  function landing(meta) {
    const play = U.playNow ? 'playNow' : 'newRun';
    const host = online()
      ? `<button class="ghost hm-big" data-act="hostOpen">Host a table</button><button class="ghost hm-big" data-act="joinOpen">Join a game</button>`
      : '';
    return framed(
      'play',
      `${backdrop(meta)}<section class="hm-hero hm-land">
        <span class="hm-eyebrow">A tabletop RPG on the tide</span>
        <h1 class="hm-display">Your squad.<br>One tide.<br>No second try.</h1>
        <p class="hm-lede">Draft a squad of pilots, cross Tumult by land, sea and air to the Heart, and write the world as you play. In your browser, on your own or with friends at the table.</p>
        <div class="hm-ctas"><button class="primary hm-cta" data-act="${play}">Play now ▶</button>${host}</div>
        <p class="hm-fine">No account needed to play.${acct() ? ' Sign in later to keep your squad.' : ''}</p>${U.privacyLine ? U.privacyLine() : ''}
        ${rejoinTile()}${setupPanel(meta, false)}${U.titleExtra ? U.titleExtra() : ''}
      </section>
      <aside class="hm-tiles" aria-label="What Tumult is">
        <div class="hm-tile"><b>◆ Cards with two faces</b><span>Physical and Ethereal, and they grow as you play</span></div>
        <div class="hm-tile"><b>⛵ A route to the Heart</b><span>Every board is different</span></div>
        <div class="hm-tile"><b>✎ Write the world</b><span>Your notes can become canon</span></div>
      </aside>`,
      'is-landing',
    );
  }

  /* ───────────── Home ───────────── */
  /** Where a saved expedition stands, for the Continue panel. */
  function whereNow(run) {
    const out = { kick: 'Continue', title: 'Your expedition', line: '' };
    const names = (run.heroes || []).filter(Boolean).map((h) => h.name);
    const lives = run.lifeline > 0 ? `${run.lifeline} lifeline${run.lifeline > 1 ? 's' : ''} left` : 'no lifeline left';
    if (run.map && run.map.rows) {
      const rows = run.map.rows.length;
      const nd = run.nodeId != null ? run.map.all[run.nodeId] : null;
      const row = nd ? nd.row : -1;
      const act = T.actOf(Math.max(0, row));
      const place = run.map.actNames ? run.map.actNames[act] : '';
      out.kick = `Continue · stop ${Math.min(rows, row + 2)} of ${rows}`;
      out.title = place || 'On the route';
      if (run.phase === 'mission') out.kick = `Continue · in a mission · stop ${row + 1} of ${rows}`;
    } else out.kick = 'Continue · drafting';
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
    out.line = names.length
      ? `${list} ${names.length > 1 ? 'are' : 'is'} on the route. ${lives[0].toUpperCase() + lives.slice(1)}.`
      : '';
    return out;
  }
  /** The new-expedition setup, unfolding in place (Setup 4): four rows of choices and Start. */
  function setupPanel(meta, open) {
    const s = setupOf(meta);
    const last = meta.lastSetup;
    const again =
      last && T.TIDES[last.tide] && short(last) !== short(s)
        ? `<button class="hs-again" data-act="setupAgain" data-tip="${esc(setupLine(Object.assign({}, s, last)))}">↺ Same as last time: ${esc(short(last))}</button>`
        : '';
    const solo = s.players === 1;
    const rows = [
      seg(
        'Players',
        'pickPlayers',
        s.players,
        Array.from({ length: T.MAX_PLAYERS }, (x, k) => ({ v: k + 1, label: k ? String(k + 1) : 'Solo' })),
      ),
      seg('Where', 'setWhere', s.where, [
        { v: 'screen', label: 'This screen', off: false },
        {
          v: 'online',
          label: 'Online',
          off: !online() || solo,
          tip: !online()
            ? 'Online play needs the web version at tumult.froglet.games.'
            : solo
              ? 'Pick 2 or more players to play online.'
              : '',
        },
      ]),
      seg('Rounds', 'setRounds', s.rounds, [
        { v: 'turns', label: 'Take turns', off: solo, tip: 'One player plays, then the next.' },
        {
          v: 'live',
          label: 'All at once',
          off: solo,
          tip: 'Everyone plays the round together; it ends when all are done.',
        },
      ]),
      seg(
        'Wind',
        'pickTide',
        s.tide,
        T.TIDE_ORDER.map((id) => ({ v: id, label: T.TIDES[id].n, tip: T.TIDES[id].txt })),
      ),
    ].join('');
    const go = s.where === 'online' && !solo ? 'hostOpen' : 'newRun';
    return `<details class="hm-setup"${open ? ' open' : ''}><summary><span class="hm-setup-h">New expedition</span><span class="hm-setup-sum">${esc(short(s))}</span></summary>
      <div class="hm-setup-body">${again}${rows}
        <div class="hs-foot"><p class="hs-line">${esc(setupLine(s))}${s.players > 2 ? ' A bigger squad meets bigger missions.' : ''}</p><button class="primary hm-cta" data-act="${go}">${go === 'hostOpen' ? 'Host it ▶' : 'Start ▶'}</button></div>
      </div></details>`;
  }
  function home(meta, run) {
    const w = run ? whereNow(run) : null;
    const games = liveGames();
    const hero = w
      ? `<span class="hm-eyebrow">${esc(w.kick)}</span><h1 class="hm-display hm-place">${esc(w.title)}</h1>${w.line ? `<p class="hm-lede">${esc(w.line)}</p>` : ''}<div class="hm-ctas"><button class="primary hm-cta" data-act="continueRun">Continue ▶</button></div>`
      : `<span class="hm-eyebrow">An expedition on Tumult</span><h1 class="hm-display">Tumult</h1><p class="hm-lede">Draft a squad of pilots from Tumult's bloodlines and lead them down from the Ark, across Tumult by land, sea and air, to the Heart at the end of the route. Every turn is a puzzle: four dice, a six-column track, and enemies that tell you what they'll do.</p>`;
    const tiles = [];
    if (online()) {
      tiles.push(
        `<button class="hm-act" data-act="hostOpen"><b>Host a table</b><span>Online, with a code</span></button>`,
      );
      tiles.push(
        `<button class="hm-act" data-act="joinOpen"><b>Join a game</b><span data-games-count>${games.length ? `${games.length} being played now` : 'With a code'}</span></button>`,
      );
    }
    tiles.push(
      `<button class="hm-act" data-act="makePilot"><b>Make a pilot</b><span>Bring your own to the draft</span></button>`,
    );
    const back = rejoinTile();
    const squad =
      run && run.heroes && run.heroes.filter(Boolean).length
        ? `<div class="hm-squad" aria-label="Your squad">${run.heroes
            .filter(Boolean)
            .map((h) => {
              const sc = U.sceneSrc && U.pilotOf ? U.sceneSrc(U.pilotOf(h)) : null;
              return `<div class="hm-pc"${sc ? ` style="background-image:url(${sc})"` : ''}><span>${esc(h.name)}</span></div>`;
            })
            .join('')}</div>`
        : '';
    const stats = `<div class="hm-stats mute small">Expeditions: ${meta.runs || 0} · Hearts ended: ${meta.wins || 0} · Furthest stop: ${meta.bestRow || 0}/6</div>`;
    return framed(
      'play',
      `${backdrop(meta)}<section class="hm-hero">${invited()}${hero}${setupPanel(meta, !run)}<div class="hm-acts">${back}${tiles.join('')}</div>
        ${stats}${U.privacyLine ? U.privacyLine() : ''}
        <div class="mute small hm-flavor">${esc(T.FLAVOR.terminalIntro[(meta.runs || 0) % T.FLAVOR.terminalIntro.length])}</div>
        ${U.titleExtra ? U.titleExtra() : ''}</section>${squad}${U.lobbyOpen ? lobbyPanelHTML() : ''}`,
      run ? 'has-run' : '',
    );
  }
  /** An invite link opened this page (src/ui/welcome.js): its card leads Home. */
  const invited = () =>
    U.welcome && U.welcome.invite && U.welcomeTitle
      ? `<div class="hm-invited">${U.welcomeTitle(T.loadMeta(), !!T.loadRun())}</div>`
      : '';
  /** Is this a first visit: nothing played, nothing saved, nobody sent here by an invite? */
  const firstVisit = (meta, hasSave) =>
    U.isNewPlayer ? U.isNewPlayer(meta, hasSave) : !hasSave && !(meta.runs || 0) && !(net() && net().linked);
  U.renderHome = function () {
    followLobby();
    const meta = T.loadMeta();
    const run = T.loadRun();
    if (firstVisit(meta, !!run) && !U.homeFull) return landing(meta);
    return home(meta, run);
  };

  /* ───────────── host a table (Create A) ───────────── */
  /** The host's choices for the table: the expedition's length, its wind, how rounds go and empty seats. */
  function tableChoices(meta, live) {
    const t = tableOf(meta);
    const s = setupOf(meta);
    const L = lengths();
    const rows = [];
    if (L)
      rows.push(
        seg('Length', 'setLength', t.length, [
          { v: 'short', label: `Short · ${L.short.stops} stops` },
          { v: 'full', label: `Full · ${L.full.stops} stops` },
        ]),
      );
    rows.push(
      seg(
        'Wind',
        'pickTide',
        s.tide,
        T.TIDE_ORDER.map((id) => ({ v: id, label: T.TIDES[id].n, tip: T.TIDES[id].txt })),
      ),
    );
    rows.push(
      seg('Rounds', 'setRounds', s.rounds, [
        { v: 'turns', label: 'Take turns' },
        { v: 'live', label: 'All at once' },
      ]),
    );
    rows.push(
      seg(
        'Seats',
        'setSeats',
        t.seats,
        Array.from({ length: T.MAX_PLAYERS - 1 }, (x, k) => ({ v: k + 2, label: String(k + 2) })),
      ),
    );
    if (T.fillSeats)
      rows.push(
        seg('Empty seats', 'setAiFill', t.aiFill ? 'ai' : 'open', [
          { v: 'ai', label: 'AI fills them' },
          { v: 'open', label: 'Leave them' },
        ]),
      );
    const name = live
      ? ''
      : `<div class="hs-row"><label class="hs-lab" for="netName">Your name</label><input id="netName" class="hs-input" maxlength="24" placeholder="Your name" value="${esc(nameFor(meta))}"${signedIn() ? ' readonly' : ''}></div>`;
    const note = `Each player flies one pilot. Missions grow with the squad: more seats, more foes.${T.fillSeats ? ' An AI pilot flies a seat nobody takes, and flies for anyone who drops until they are back.' : ''}`;
    return `<div class="panel hs-panel">${name}${rows.join('')}<p class="hs-note">${esc(note)}</p></div>`;
  }
  /** The seats of a table: who sits in each, and the open ones. */
  function seatCards(names, opts) {
    const t = opts.table;
    const run = U.run;
    const out = [];
    for (let s = 0; s < t.seats; s++) {
      const nm = names[s];
      // a table waits before the draft: a seat shows its player, not a pilot from another run
      const hero = opts.heroes && run && run.party ? run.heroes[(run.party.owner || []).indexOf(s)] : null;
      if (nm) {
        const st = opts.status ? opts.status(s) : s === 0 ? 'Host' : 'At the table';
        out.push(
          `<div class="hm-seat${s === opts.mine ? ' mine' : ''}">${face(nm, hero)}<b>${esc(hero ? hero.name : nm)}</b><span class="small dim">${esc(hero ? nm : s === opts.mine ? 'You' : '')}${s === 0 ? (hero || s === opts.mine ? ' · host' : 'host') : ''}</span><span class="hm-seat-st">${esc(st)}</span></div>`,
        );
      } else
        out.push(
          `<div class="hm-seat open"><span class="hm-av open" aria-hidden="true"></span><b class="dim">Open seat</b><span class="small dim">${t.aiFill && T.fillSeats ? 'AI fills it' : 'Waiting for a player'}</span>${opts.host ? `<button class="ghost sm" data-act="copyInvite">Invite</button>` : ''}</div>`,
        );
    }
    return `<div class="hm-seats" style="--seats:${t.seats}">${out.join('')}</div>`;
  }
  /** The people online, for inviting from the host's table or the People tab. */
  function peopleRows(host) {
    const list = U.lobbyPeople || [];
    if (!lobbyCap) return `<p class="mute small">Sign in to see who is online.</p>`;
    if (!list.length) return `<p class="mute small">Nobody else is online right now.</p>`;
    const where = (p) => {
      const st = p.status || {};
      if (st.open) return `Hosting a table · ${st.open.players} of ${st.open.max}`;
      return st.where === 'game' ? 'In a game' : st.where === 'solo' ? 'Playing solo' : 'Online';
    };
    return list
      .slice(0, 40)
      .map((p) => {
        const st = p.status || {};
        const btn =
          st.open && st.open.code && !host
            ? `<button class="sm primary" data-act="netJoinGame" data-arg="${esc(st.open.code)}">Join</button>`
            : host && net() && net().code
              ? `<button class="sm ghost" data-act="copyInvite" data-tip="Copy the invite link to send them">Invite</button>`
              : '';
        return `<div class="hm-person">${face(p.name)}<div><b>${esc(p.name || 'A player')}</b><div class="small dim">${esc(where(p))}</div></div>${btn}</div>`;
      })
      .join('');
  }
  const inviteLink = () => {
    const N = net();
    if (!N || !N.code) return '';
    if (N.invite) return N.invite;
    if (U.welcome && U.welcome.inviteLink) return U.welcome.inviteLink(N.code);
    const here =
      typeof location !== 'undefined' && /^https?:/.test(location.protocol) ? location.origin + location.pathname : '';
    return here ? `${here}?join=${N.code}` : N.code;
  };
  U.renderHost = function () {
    followLobby();
    const meta = T.loadMeta();
    const t = tableOf(meta);
    const body = `<div class="hm-page hm-host"><div class="hm-head"><button class="ghost sm hm-backbtn" data-act="homeBack" aria-label="Back to Home">‹</button><div><span class="hm-eyebrow">Host a table</span><h2>A new expedition, up to ${T.MAX_PLAYERS} pilots</h2></div></div>
      <div class="hm-cols">${tableChoices(meta, false)}
      <div class="hm-side">${seatCards([nameFor(meta) || 'You'], { table: t, mine: 0 })}
        ${signedIn() || !acct() ? '' : `<div class="panel hm-signnote"><b>Hosting needs an account</b><p class="small dim">Sign in so your table has a name others can find, and so it comes back to you on another device. A friend without an account joins through your invite link.</p><button class="sm" data-act="signIn" data-arg="Hosting a table needs an account, so the table comes back to you on any device.">Sign in</button></div>`}
        <div class="hm-go"><span class="mute small">You get a code and an invite link to share. Open seats wait until the first mission.</span><button class="ghost" data-act="newRunSolo">Play on this screen</button><button class="primary hm-cta" data-act="netHost">Open the table ▶</button></div></div></div></div>`;
    return framed('play', body, 'is-page');
  };
  /** The host's table once it is open, and the waiting room a guest sees (Waiting C). */
  U.tableScreen = function () {
    const N = net();
    const meta = T.loadMeta();
    const host = N.role === 'host';
    const t = tableOf(meta);
    // the host's choices go to the online game, which reads them when the expedition starts (N.start)
    if (host) {
      const o = { seats: t.seats, aiFill: t.aiFill && !!T.fillSeats, length: t.length };
      const changed = JSON.stringify(o) !== JSON.stringify(N.tableOpts || null);
      N.tableOpts = o;
      // a guest's waiting room shows the host's choices from the game doc (net.js, before setting out)
      if (changed && typeof N.writeTable === 'function') setTimeout(() => N.writeTable(), 0);
    } else {
      const o = N.tableOpts || {};
      t.seats = Math.max(N.names.filter(Boolean).length, +o.seats || N.names.length);
      t.aiFill = !!o.aiFill;
    }
    const n = N.joined ? N.joined() : N.names.filter(Boolean).length;
    const invite = host
      ? `<div class="panel hm-invite"><span class="hs-lab">Invite</span><code class="hm-code" aria-label="Table code">${esc(N.code || '')}</code><input class="hm-link-box" id="inviteField" readonly value="${esc(inviteLink())}" aria-label="Invite link"><button class="primary sm" data-act="copyInvite">Copy</button></div>`
      : '';
    const people = host
      ? `<div class="panel hm-people"><div class="hs-lab">From the Lobby${onlineCount() ? ` · ${onlineCount()} online` : ''}</div><div id="hostPeople">${peopleRows(true)}</div></div>`
      : '';
    const aiN = t.aiFill && T.fillSeats ? Math.max(0, t.seats - n) : 0;
    const startLbl = aiN ? `Start with ${n} players + ${aiN} AI ▶` : `Start with ${n} players ▶`;
    const go = host
      ? `<div class="hm-go"><span class="mute small">${esc(N.status || '')}</span><button class="ghost" data-act="netLeave">Close the table</button><button class="primary hm-cta" data-act="netStart" ${n > 1 || aiN ? '' : 'disabled'}>${startLbl}</button></div>`
      : `<div class="hm-go"><span class="mute small">${esc(N.status || 'Waiting for the host to start…')}</span><button class="ghost" data-act="netLeave">Leave</button></div>`;
    const brief = host
      ? ''
      : `<div class="panel hm-brief"><span class="hm-eyebrow">The expedition</span><h3>${esc((N.names[0] || 'The host') + '’s table')}</h3><p class="dim">When the host starts, each of you drafts one pilot here, then the squad sets out down the route together.</p><div class="hm-pills"><span class="pill">${n} of ${t.seats} seats</span>${aiN ? `<span class="pill">${aiN} AI pilot${aiN > 1 ? 's' : ''}</span>` : ''}</div></div>`;
    const body = `<div class="hm-page hm-table"><div class="hm-head"><div><span class="hm-eyebrow">${host ? 'Your table' : 'Waiting room'}</span><h2>${host ? 'Waiting for your squad' : esc((N.names[0] || 'The host') + '’s table')} <span class="mono dim">${esc(N.code || '')}</span></h2></div></div>
      <div class="hm-cols">${host ? tableChoices(meta, true) : brief}<div class="hm-side">${invite}${seatCards(N.names, { table: t, mine: N.seat, host, status: (s) => (s === 0 ? 'Host' : 'Ready') })}${people}${go}</div></div></div>`;
    return framed('play', body, 'is-page');
  };

  /* ───────────── join a game (Join B) ───────────── */
  U.renderJoin = function () {
    followLobby();
    const meta = T.loadMeta();
    const N = net();
    const code = (N && N.linked) || U.joinCode || '';
    const box = `<div class="panel hm-join"><span class="hm-eyebrow">Join a game</span><h2>Got a code?</h2>
      <label class="hs-lab" for="netCode">Table code</label><input id="netCode" class="hm-codein" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD" value="${esc(code)}">
      <label class="hs-lab" for="netName">Your name</label><input id="netName" class="hs-input" maxlength="24" placeholder="Your name" value="${esc(nameFor(meta))}"${signedIn() ? ' readonly' : ''}>
      <button class="primary hm-cta" data-act="netJoin">${signedIn() ? 'Join ▶' : 'Join as a guest ▶'}</button>
      ${
        acct() && !signedIn()
          ? `<div class="hm-or"><span>or sign in</span></div><p class="small dim">Keep your pilots and cards on any device, see who is online, and host your own table.</p><button class="ghost" data-act="signIn">Sign in</button>`
          : signedIn()
            ? `<p class="small dim">Signed in as <b>${esc(me().name || '')}</b>.</p>`
            : ''
      }</div>`;
    const list = N
      ? `<div class="panel hm-open"><div class="hs-lab">Games being played${onlineCount() ? ` · ${onlineCount()} online` : ''}</div><div class="net-games" id="netGames">${U.gamesList ? U.gamesList() : ''}</div><p class="small mute">Join a game with an open seat without a code. Mid-mission you join between missions: you land on the route and draft your pilot there.</p></div>`
      : '';
    const body = `<div class="hm-page hm-joinp"><div class="hm-head"><button class="ghost sm hm-backbtn" data-act="homeBack" aria-label="Back to Home">‹</button><div><span class="hm-eyebrow">Join a game</span><h2>Sit at someone's table</h2></div></div><div class="hm-cols">${box}<div class="hm-side">${list}</div></div></div>`;
    return framed('play', body, 'is-page');
  };

  /* ───────────── the Lobby panel (Games, People) ───────────── */
  function lobbyPanelHTML() {
    const tab = U.lobbyTab === 'people' ? 'people' : 'games';
    const g = liveGames().length;
    const tabs = `<div class="hm-tabs" role="tablist"><button role="tab" class="${tab === 'games' ? 'on' : ''}" aria-selected="${tab === 'games'}" data-act="lobbyTab" data-arg="games">Games${g ? ' ' + g : ''}</button><button role="tab" class="${tab === 'people' ? 'on' : ''}" aria-selected="${tab === 'people'}" data-act="lobbyTab" data-arg="people">People${onlineCount() ? ' ' + onlineCount() : ''}</button></div>`;
    const games = `<div class="net-games" id="${U.screen === 'join' ? 'netGamesPanel' : 'netGames'}">${U.gamesList ? U.gamesList() : '<p class="mute small">Online play needs the web version.</p>'}</div><p class="small mute">Join a game with an open seat without a code. Mid-mission, you join between missions: you land on the route and draft your pilot there. Your own games come back to you here if you closed the tab.</p>`;
    const people = `<div class="hm-people-list">${peopleRows(false)}</div><p class="small mute">Everyone signed in and online shows here.</p>`;
    const foot = online()
      ? `<div class="hm-lobby-foot"><button class="ghost sm" data-act="joinOpen">Enter a code</button><button class="primary sm" data-act="hostOpen">Host a table</button></div>`
      : '';
    return `<div class="hm-lobby-bg" id="lobbyPanel" data-act="lobbyClose"><aside class="hm-lobby" role="dialog" aria-label="Lobby" data-stop="1"><div class="hm-lobby-h"><div><b>Lobby</b><div class="small dim">${onlineCount() ? `● ${onlineCount()} online` : ''}${g ? ` · ${g} game${g > 1 ? 's' : ''}` : ''}</div></div><button class="ghost sm" data-act="lobbyClose" aria-label="Close the Lobby">✕</button></div>${tabs}<div class="hm-lobby-body">${tab === 'games' ? games : people}</div>${foot}</aside></div>`;
  }
  U.lobbyPanelHTML = lobbyPanelHTML;

  /* ───────────── the waiting room during the draft ───────────── */
  /** The draft's waiting step with others still drafting: the squad so far, seat by seat (Waiting C). */
  U.waitingRoom = function (run) {
    const p = run.party;
    const rows = p.players
      .map((pl, s) => {
        const i = p.owner.indexOf(s);
        const h = i >= 0 ? run.heroes[i] : null;
        const bot = T.isBot ? T.isBot(run, s) : !!pl.ai;
        const st = h ? 'Ready' : bot ? 'AI picks a pilot' : 'Drafting…';
        return `<div class="hm-wait-row${h ? ' ready' : ''}">${face(pl.name, h)}<div><b>${esc(pl.name)}</b>${h ? ` <span class="dim">· ${esc(h.name)}</span>` : ''}</div><span class="hm-seat-st">${h ? '✓ ' : ''}${esc(st)}</span></div>`;
      })
      .join('');
    const left = p.players.filter((pl, s) => !run.heroes[p.owner.indexOf(s)]).length;
    const L = lengths();
    const len = L && run.length ? `${L[run.length] ? L[run.length].stops : ''} stops` : '';
    return `<div class="panel hm-waiting"><span class="hm-eyebrow">While you wait</span><h3>Your pilot is ready</h3><p class="dim">${left ? `Waiting for ${left} more to finish drafting. The route opens when everyone has a pilot.` : 'Everyone has a pilot: the route opens now.'}</p>
      <div class="hm-pills"><span class="pill">${esc(T.TIDES[run.tide] ? T.TIDES[run.tide].n : '')}</span>${len ? `<span class="pill">${esc(len)}</span>` : ''}<span class="pill">${T.liveRounds(run) ? 'All at once' : 'Take turns'}</span></div>
      <div class="hs-lab" style="margin-top:12px">At the table · ${p.players.length - left} of ${p.players.length} ready</div><div class="hm-wait">${rows}</div></div>`;
  };

  /* ───────────── actions ───────────── */
  const keep = (f) => {
    const meta = T.loadMeta();
    f(meta);
    T.saveMeta(meta);
  };
  /** Remember the name typed in a box for next time. */
  const keepName = () => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('netName');
    if (el && el.value.trim() && !signedIn()) keep((m) => (m.netName = el.value.trim().slice(0, 24)));
  };
  /** Hand the table's choices to the online game and the engine, as each has the means to take them. */
  U.applyTable = function (run) {
    const meta = T.loadMeta();
    const t = tableOf(meta);
    if (T.setLength && lengths()) T.setLength(run, t.length);
    return t;
  };
  const prevExtra = U.extraAct;
  U.extraAct = function (act, arg, el, e) {
    switch (act) {
      case 'setWhere':
        keep((m) => (m.where = arg === 'online' ? 'online' : 'screen'));
        U.render();
        return true;
      case 'setRounds':
        keep((m) => (m.rounds = arg === 'live' ? 'live' : 'turns'));
        if (U.net && U.net.role === 'host' && U.run && U.run.party)
          U.run.party.rounds = arg === 'live' ? 'live' : 'turns';
        U.render();
        return true;
      case 'setLength':
        keep((m) => (m.table = Object.assign(tableOf(m), { length: arg === 'short' ? 'short' : 'full' })));
        U.render();
        return true;
      case 'setSeats':
        keep((m) => (m.table = Object.assign(tableOf(m), { seats: +arg })));
        U.render();
        return true;
      case 'setAiFill':
        keep((m) => (m.table = Object.assign(tableOf(m), { aiFill: arg === 'ai' })));
        U.render();
        return true;
      case 'setupAgain':
        keep((m) => {
          const l = m.lastSetup;
          if (!l) return;
          m.players = l.players;
          m.where = l.where;
          m.rounds = l.rounds;
          if (T.TIDES[l.tide]) m.tide = l.tide;
        });
        U.render();
        return true;
      case 'newRun':
      case 'playNow':
        keep((m) => (m.lastSetup = setupOf(m)));
        return prevExtra ? prevExtra(act, arg, el, e) : false; // the draft starts as before
      case 'newRunSolo':
        keepName();
        keep((m) => {
          m.where = 'screen';
          m.lastSetup = setupOf(m);
        });
        U.startDraft();
        return true;
      case 'hostOpen':
        if (!online()) {
          U.toast('Online play needs the web version at tumult.froglet.games.');
          return true;
        }
        U.lobbyOpen = false;
        U.screen = 'host';
        U.render();
        return true;
      case 'joinOpen':
        U.lobbyOpen = false;
        U.screen = 'join';
        U.render();
        return true;
      case 'homeBack':
        U.screen = 'title';
        U.render();
        return true;
      case 'homeFull':
        U.homeFull = true;
        U.render();
        return true;
      case 'makePilot':
        if (U.openMaker) U.openMaker();
        else {
          U.startDraft();
          if (U.draft) U.draft.step = 'species'; // the draft's own "make your own" path
          U.render();
        }
        return true;
      case 'lobbyOpen':
        U.lobbyOpen = true;
        if (U.screen === 'title') U.render();
        else if (typeof document !== 'undefined') {
          const wrap = document.createElement('div');
          wrap.innerHTML = lobbyPanelHTML();
          document.getElementById('app').appendChild(wrap.firstChild);
        }
        return true;
      case 'lobbyClose':
        if (e && e.target && e.target.closest && e.target.closest('[data-stop]') && el.id === 'lobbyPanel') return true;
        U.lobbyOpen = false;
        if (typeof document !== 'undefined') {
          const p = document.getElementById('lobbyPanel');
          if (p) p.remove();
        }
        return true;
      case 'lobbyTab':
        U.lobbyTab = arg === 'people' ? 'people' : 'games';
        redrawLobbyBits();
        return true;
      case 'copyInvite': {
        const link = inviteLink();
        const done = () => U.toast(`Invite link copied: ${esc(link)}`);
        try {
          if (navigator.clipboard && navigator.clipboard.writeText)
            navigator.clipboard.writeText(link).then(done, done);
          else done();
        } catch (err) {
          done();
        }
        const box = typeof document !== 'undefined' && document.getElementById('inviteField');
        if (box && box.select) box.select();
        return true;
      }
      case 'signIn':
        if (U.askSignIn) U.askSignIn(arg || '');
        else if (acct() && T.Account.signIn) T.Account.signIn('google');
        return true;
      case 'account':
        if (U.askSignIn) U.askSignIn('');
        return true;
      case 'netHost':
      case 'netJoin':
      case 'netJoinGame':
        keepName();
        break; // net.js carries these out
    }
    return prevExtra ? prevExtra(act, arg, el, e) : false;
  };
  if (typeof document !== 'undefined')
    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'netName') keepName();
    });
  if (T.Account && typeof T.Account.onChange === 'function')
    T.Account.onChange(() => {
      lobbyStop = null;
      followLobby();
      if (['title', 'host', 'join'].includes(U.screen) && U.render) U.render();
    });
})((window.T = window.T || {}));
