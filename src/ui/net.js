/* ============================================================================
   TUMULT — PLAY ONLINE (the playtest page and the web version).
   Two screens, one game, through a shared store (the `db` capability through T.Backend, ui/backend.js):
   on claude.ai the page's own (window.claude.use('db')); in the web version a live room per game code
   on Tumult's Cloudflare Worker (src/web/backend-worker.js, server/room.js). The offline file has no
   such store, and this file shows nothing there.

   The host's screen holds the game. A guest's screen shows the state the host last
   wrote and sends commands (T.execCommand) for its own pilot; the host carries them out
   in the order they arrive and writes the new state. Because the engine is
   deterministic and a run is plain data, the state is the whole truth: a screen that
   joins late, or reloads, is caught up by the next state.

   Store layout, under games/<CODE>:
     games/<CODE>               { rev, run (a save, T.serializeRun), fx, results, acks, host, names, at }
     games/<CODE>/seats/<n>     { name, holder }       a guest's claim on seat n
     games/<CODE>/cmds/<n>-<seq> { cmd, seat, seq, holder, at }   a guest's command, deleted once carried out
     lobby/<CODE>               { code, host, names, pilots, phase, stage, open, at, v }   the game as the list
                                of open games shows it (2.80), a few hundred bytes; refreshed while the host's
                                screen is open, deleted when the host leaves

   Commands are a reliable, ordered channel (2.74; the pattern of client prediction and server
   reconciliation that networked action games use; 2.73.1). Each guest numbers its commands 1, 2, 3…; the host
   carries out seq n only after n-1, and writes the last one it carried out for each seat in `acks`. A
   guest keeps every command the host has not acknowledged, plays it again on top of each state the host
   writes, and sends it again until it is acknowledged. Nothing is dropped for being slow: the store's
   live delivery can lag or stop (a hidden tab, a dropped stream), so the host also reads the commands
   every few seconds, and a guest reads the state when its own commands wait too long.

   Either screen can come back (2.74): the game a screen was in is remembered on the device
   (tumult_v2_net), and the title offers to rejoin it. A guest takes its seat again and carries on
   numbering from the host's acks; a host picks the game up from the state it last wrote.

   The fast lane (2.74): the store's live delivery can fall back to a refresh every half minute, which
   made the other player's moves feel slow. Where the page also offers a live channel between the
   screens open on it (claude.ai's `room`), a game's screens meet in a room named for its code. A guest
   sends each command there as well as to the store, and the host says "rev n is written" there after
   each state it writes, so the guest reads it at once. The room only hurries things along: messages
   can drop, so the store stays the truth, and a guest also reads the state every 2 s.
   ========================================================================== */
(function (T) {
  const U = T.UI;
  const esc = U.esc;
  const tab = Math.random().toString(36).slice(2, 10); // this screen, as a lease holder
  const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const newCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

  let db = null;
  let usr = null; // who is playing, when the page says
  let rooms = null; // the page's live channel, when it has one
  let lane = null; // this game's room
  const leaveLane = () => {
    if (lane) lane.leave().catch(() => {});
    lane = null;
  };
  /** Meet the game's other screens in a room named for its code, if the page offers one. */
  const joinLane = async () => {
    leaveLane();
    if (!rooms || typeof rooms.join !== 'function' || !N.code) return;
    try {
      const r = await rooms.join('tumult-' + N.code);
      if (!N.code) return r.leave().catch(() => {});
      lane = r;
      if (N.role === 'host')
        unsubs.push(
          r.on('cmd', (msg) => {
            const d = msg && msg.data;
            if (msg.isMe || !d || typeof d !== 'object') return;
            N.drain([{ id: `${+d.seat}-${String(+d.seq).padStart(9, '0')}`, data: () => d }]);
          }),
          r.on('here', (msg) => {
            const d = msg && msg.data;
            if (!msg.isMe && d && Number.isInteger(+d.seat)) seen(+d.seat);
          }),
        );
      else
        unsubs.push(
          r.on('rev', (msg) => {
            const d = msg && msg.data;
            if (d && +d.rev > N.rev) readState();
          }),
        );
    } catch {
      lane = null; // no room: the store alone carries the game, as before
    }
  };
  const ping = (topic, data) => {
    if (lane) lane.emit(topic, data).catch(() => {});
  };
  const N = (U.net = {
    available: false,
    canWrite: null, // may this viewer write the shared store? false: they can watch but not play; null: not told
    code: null,
    role: null, // 'host' | 'guest'
    seat: null,
    names: ['', '', '', '', ''], // one a seat, host first; '' is a seat nobody has taken
    rev: 0,
    status: '',
    // the host's choices for the table (the host-a-table screen sets them): how many seats, whether the AI fills
    // the empty ones, and how long the expedition is (T.LENGTHS)
    tableOpts: { seats: 0, aiFill: false, length: 'full' },
    away: {}, // seat → when the AI takes the seat of a player who has dropped (ms); the countdown every screen shows
    isGuest: () => N.role === 'guest',
    online: () => !!N.role,
  });

  // light up once the page's host answers; a saved copy of the page never will
  if (T.Backend && T.Backend.available()) {
    T.Backend.use('db')
      .then((d) => {
        db = d;
        N.available = !!d;
        if (d) {
          watchGames();
          N.fromLink();
        }
        if (d && U.screen === 'title') U.render();
        return T.Backend.use('room').then(
          (r) => {
            rooms = r;
            return T.Backend.use('user');
          },
          () => T.Backend.use('user'),
        );
      })
      .then(async (u) => {
        usr = u;
        if (!u || typeof u.can !== 'function') return;
        const c = await u.can('data.write');
        N.canWrite = c == null ? null : !!c;
        if (U.screen === 'title') U.render();
      })
      .catch(() => {});
  }

  /** Why a store call failed, as a player can act on it. */
  const NO_ACCESS =
    "Your access to this page lets you look but not write, so you can't host or join. Ask the page's owner to invite you by email as an Editor (on a page that isn't shared by link), or to add you to their organization as a Contributor.";
  const why = (e) => {
    const own = db && typeof db.explain === 'function' ? db.explain(e) : null;
    if (own) return esc(own);
    const code = String((e && (e.code || e.message)) || e || '');
    return /denied|grant|permission|not_writer|forbidden|unauth/i.test(code)
      ? NO_ACCESS
      : 'Could not reach the game (' + esc(code || 'unavailable') + ').';
  };
  N.why = why;

  const gameDoc = () => db.doc('games/' + N.code);
  /** A seat's name for each seat, the host's first and the rest empty. */
  const blankNames = (host) => Array.from({ length: T.MAX_PLAYERS }, (x, s) => (s ? '' : host));
  /** Who is here, for the lobby. */
  const lobbyStatus = () => {
    const n = N.names.filter((x, s) => s > 0 && x).length;
    if (!n)
      return N.tableOpts && N.tableOpts.aiFill
        ? 'Share the code, or start now: the AI fills the empty seats.'
        : 'Waiting for players… share the code (two to ' + T.MAX_PLAYERS + ' can play).';
    return `${n + 1} here. ${n + 1 < T.MAX_PLAYERS ? 'More can join until you start.' : 'The squad is full.'}`;
  };
  const unsubs = [];
  const stop = () => unsubs.splice(0).forEach((u) => u && u());

  /** The game this screen was last in, kept on the device so a reload can rejoin it. */
  const MEMO = 'tumult_v2_net';
  const MEMO_MS = 12 * 3600 * 1000;
  N.remembered = function () {
    try {
      const m = JSON.parse(localStorage.getItem(MEMO) || 'null');
      return m && m.code && Date.now() - (m.at || 0) < MEMO_MS ? m : null;
    } catch {
      return null;
    }
  };
  const remember = (m) => {
    try {
      if (m) localStorage.setItem(MEMO, JSON.stringify(Object.assign({ at: Date.now() }, m)));
      else localStorage.removeItem(MEMO);
    } catch {
      /* a page without storage cannot rejoin; it plays as before */
    }
  };

  /* ───────────── the host ───────────── */
  let lastWritten = null;
  let writing = Promise.resolve();
  const results = {}; // "<seat>-<seq>" → { ok, why, ctx }, the latest few
  const acks = {}; // seat → the last seq carried out
  const holders = {}; // seat → the screen (tab) that holds it now
  /** Write the state if it changed. One write at a time; a burst coalesces into the last one. */
  N.publish = function () {
    list();
    if (N.role !== 'host' || !U.run) return;
    botsSoon();
    const run = T.serializeRun(U.run);
    const fx = U.run.mission ? U.run.mission.fx : [];
    const body = JSON.stringify([run, fx.length, N.names, results, acks, N.away]);
    if (body === lastWritten) return;
    lastWritten = body;
    // a revision only grows, even across a reload of the host's page
    N.rev = Math.max(N.rev + 1, Date.now());
    const doc = {
      rev: N.rev,
      run,
      fx: JSON.stringify(fx),
      results: JSON.stringify(results),
      acks: Object.assign({}, acks),
      host: tab,
      names: N.names.slice(),
      away: Object.assign({}, N.away),
      at: Date.now(),
    };
    writing = writing
      .then(() => gameDoc().set(doc))
      .then(() => ping('rev', { rev: doc.rev }))
      .catch((e) => {
        lastWritten = null; // write it again with the next change, or the next look at the commands
        U.toast('Could not reach the other player: ' + esc((e && e.code) || e));
      });
  };

  /* ───────────── the list of games (2.80) ───────────── */
  /**
   * Who is playing, for the title's list of games: a small doc beside the game, so a newcomer can see the
   * games under way and step in without being told a code. The host's screen writes it when what it shows
   * changes, and at least once a minute while it is open, so a game whose host has gone quiet reads as such.
   */
  const LIST_BEAT_MS = 60 * 1000;
  N.LIVE_MS = 3 * 60 * 1000; // a host heard from within this is playing now
  const LIST_KEEP_MS = 12 * 3600 * 1000; // after this a quiet game is not shown at all
  const LIST_DROP_MS = 2 * 24 * 3600 * 1000; // and after this any screen tidies it away
  /** Where the expedition is, in a few words. */
  N.stageOf = function (run) {
    if (!run) return 'Gathering players';
    const map = run.map;
    const stop = map && run.nodeId != null && map.all[run.nodeId] ? map.all[run.nodeId].row + 1 : 0;
    const of = map ? ` (stop ${stop} of ${map.rows.length})` : '';
    if (run.phase === 'summary' || run.over) return run.won ? 'Finished: reached the Heart' : 'Finished';
    if (run.phase === 'draft') return 'Drafting pilots';
    if (run.phase === 'mission' && run.mission)
      return `In a mission${run.mission.title ? ': ' + run.mission.title : ''}, round ${run.mission.round || 1}${of}`;
    if (run.phase === 'map') return `On the route${of}`;
    return `Between missions${of}`;
  };
  /** The game as the list shows it. */
  N.summary = function () {
    const run = U.run;
    const joined = N.names.filter(Boolean).length;
    return {
      code: N.code,
      host: N.names[0] || 'Player 1',
      names: N.names.filter(Boolean),
      pilots: run ? run.heroes.filter(Boolean).map((h) => String(h.name || '')) : [],
      phase: run ? run.phase : 'lobby',
      stage: N.stageOf(run),
      // can a newcomer take a seat now? Before the start while there is room; after, on the route (2.79)
      open: run ? T.canAddPlayer(run) : joined < T.MAX_PLAYERS,
      over: !!(run && (run.over || run.phase === 'summary')),
      v: (T.BUILD && T.BUILD.version) || '',
    };
  };
  let lastListed = null;
  let beatTimer = null;
  function list(beat) {
    if (N.role !== 'host' || !N.code || !db) return;
    const s = N.summary();
    const body = JSON.stringify(s);
    if (!beat && body === lastListed) return;
    lastListed = body;
    db.doc('lobby/' + N.code)
      .set(Object.assign(s, { at: Date.now() }))
      .catch(() => (lastListed = null)); // the list is a convenience: the game goes on without it
  }
  const unlist = (code) => {
    if (db && code)
      db.doc('lobby/' + code)
        .delete()
        .catch(() => {});
  };

  /** The games the list knows of, newest first: { code, host, names, pilots, stage, open, over, at }. */
  N.games = [];
  const str = (x, n = 40) => String(x == null ? '' : x).slice(0, n);
  const takeGames = (docs) => {
    const now = Date.now();
    const out = [];
    for (const d of docs) {
      const g = d.exists === false ? null : d.data && d.data();
      if (!g || typeof g !== 'object') continue;
      const at = +g.at || 0;
      if (now - at > LIST_DROP_MS) {
        db.doc('lobby/' + d.id)
          .delete()
          .catch(() => {}); // long gone: tidy it away
        continue;
      }
      const code = str(g.code || d.id, 4).toUpperCase();
      if (!/^[A-Z]{4}$/.test(code)) continue;
      out.push({
        code,
        host: str(g.host, 24),
        names: Array.isArray(g.names) ? g.names.slice(0, T.MAX_PLAYERS).map((x) => str(x, 24)) : [],
        pilots: Array.isArray(g.pilots) ? g.pilots.slice(0, 10).map((x) => str(x, 30)) : [],
        stage: str(g.stage, 80),
        open: !!g.open,
        over: !!g.over,
        at,
      });
    }
    N.games = out.sort((a, b) => b.at - a.at);
    showGames();
    if (!gamesTimer) tickGames();
  };
  /** Redraw only the list on the title, so a name being typed there is kept. */
  function showGames() {
    if (typeof document === 'undefined' || !document) return; // the page is closing
    const el = document.getElementById('netGames');
    if (el && (U.screen === 'title' || U.screen === 'join')) el.innerHTML = U.gamesList();
  }
  const ago = (ms) => {
    const m = Math.round(ms / 60000);
    return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
  };
  /** The list of games on the title: playing now first, with a way in; quiet and finished ones after, folded. */
  U.gamesList = function () {
    const now = Date.now();
    const mine = N.remembered();
    const shown = N.games.filter((g) => now - g.at < LIST_KEEP_MS && g.code !== N.code);
    const live = shown.filter((g) => !g.over && now - g.at < N.LIVE_MS);
    const rest = shown.filter((g) => !live.includes(g));
    const row = (g, playing) => {
      const back = mine && mine.code === g.code;
      const btn = back
        ? `<button class="sm primary" data-act="netRejoin">Rejoin${mine.role === 'host' ? ' as host' : ''}</button>`
        : playing && g.open
          ? `<button class="sm primary" data-act="netJoinGame" data-arg="${esc(g.code)}">Join</button>`
          : '';
      const why = g.over
        ? ''
        : !playing
          ? 'The host’s screen is closed.'
          : g.open
            ? ''
            : g.names.length >= T.MAX_PLAYERS
              ? 'Full.'
              : 'You can join between missions.';
      return `<div class="net-game${playing ? '' : ' quiet'}"><div class="net-game-who"><b>${esc(g.host || 'Someone')}</b>’s game <span class="mono dim">${esc(g.code)}</span>
        <div class="small">${esc(g.names.join(', '))}${g.pilots.length ? ` <span class="dim">· flying ${esc(g.pilots.join(', '))}</span>` : ''}</div>
        <div class="small dim">${esc(g.stage)} · ${ago(now - g.at)}${why ? ' · ' + why : ''}</div></div>${btn}</div>`;
    };
    const head = live.length
      ? `<div class="dim small">Playing now</div>${live.map((g) => row(g, true)).join('')}`
      : '<div class="mute small">Nobody is playing online right now. Host a game and it shows here for others to join.</div>';
    const fold = rest.length
      ? `<details class="net-quiet"><summary class="small dim">Quiet and finished games (${rest.length})</summary>${rest.map((g) => row(g, false)).join('')}</details>`
      : '';
    return head + fold;
  };
  let gamesTimer = null;
  let gamesCol = null;
  /** Read the list again now (the live delivery can lag), at most every few seconds. */
  let gamesReadAt = 0;
  const readGames = () => {
    if (!gamesCol || typeof gamesCol.get !== 'function' || Date.now() - gamesReadAt < 5000) return;
    gamesReadAt = Date.now();
    gamesCol
      .get()
      .then((snap) => takeGames(snap.docs || []))
      .catch(() => {});
  };
  /**
   * Keep the list fresh while this screen is on the title: live, read again when the page comes back into
   * view, and every 20 s while the list has games on it (their times and liveness move on). An empty list
   * waits for the live delivery, so a page left open with nothing to show keeps no timer running.
   */
  const tickGames = () => {
    clearTimeout(gamesTimer);
    gamesTimer = null;
    if (!N.games.length) return;
    gamesTimer = setTimeout(() => {
      gamesTimer = null;
      if (U.screen === 'title' || U.screen === 'join') {
        showGames();
        readGames();
      }
      tickGames();
    }, 20000);
  };
  const watchGames = () => {
    gamesCol = db.collection('lobby');
    if (typeof gamesCol.onSnapshot === 'function')
      gamesCol.onSnapshot(
        (snap) => takeGames(snap.docs || []),
        () => setTimeout(watchGames, 5000),
      );
    else readGames();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (U.screen === 'title' || U.screen === 'join')) readGames();
  });

  /**
   * Carry out the guests' commands found in the store, each seat's in order. A command already carried
   * out is only tidied away; one that skips ahead waits for the one before it, which is on its way.
   */
  const tidying = new Set();
  const tidy = (id) => {
    if (tidying.has(id)) return;
    tidying.add(id);
    db.doc(`games/${N.code}/cmds/${id}`)
      .delete()
      .catch(() => {})
      .then(() => setTimeout(() => tidying.delete(id), 30000));
  };
  N.drain = function (docs) {
    if (N.role !== 'host') return;
    const list = docs
      .map((d) => ({ id: d.id, data: d.exists === false ? null : d.data && d.data() }))
      .filter((d) => d.data && d.data.cmd && Number.isInteger(d.data.seq) && Number.isInteger(d.data.seat))
      .sort((a, b) => a.data.seat - b.data.seat || a.data.seq - b.data.seq);
    for (const { id, data } of list) {
      const seat = data.seat;
      if (seat < 1 || seat >= N.names.length) continue;
      if (holders[seat] && data.holder && data.holder !== holders[seat]) {
        tidy(id); // from a screen that has since given up the seat
        continue;
      }
      const last = acks[seat] || 0;
      seen(seat);
      if (data.seq <= last) tidy(id);
      else if (data.seq === last + 1) {
        acks[seat] = data.seq;
        N.carryOut(seat + '-' + data.seq, data.cmd, [seat]);
        tidy(id);
      }
    }
  };
  let pollTimer = null;
  const POLL_MS = 2500;
  const poll = () => {
    if (N.role !== 'host' || !N.code) return;
    const q = db.collection(`games/${N.code}/cmds`);
    if (typeof q.get === 'function')
      q.get()
        .then((snap) => N.drain(snap.docs || []))
        .catch(() => {});
    // a write that failed is tried again here, once the store answers
    if (lastWritten === null) N.publish();
  };
  const watchCmds = () => {
    unsubs.push(
      db.collection(`games/${N.code}/cmds`).onSnapshot(
        (snap) => N.drain(snap.docs || []),
        () => N.role === 'host' && setTimeout(watchCmds, 1000), // the listener died: open a new one
      ),
    );
  };
  const onVisible = () => document.visibilityState === 'visible' && poll();

  N.host = async function (name) {
    if (!db) return;
    if (N.canWrite === false) {
      U.toast(NO_ACCESS, 9000);
      return;
    }
    N.code = newCode();
    N.role = 'host';
    N.seat = 0;
    N.names = blankNames(name || 'Player 1');
    U.seats = [0];
    U.screen = 'lobby';
    N.status = lobbyStatus();
    U.render();
    for (let tries = 0; ; tries++) {
      try {
        await gameDoc().set({ rev: 0, run: null, acks: {}, host: tab, names: N.names, at: Date.now() });
        break;
      } catch (e) {
        if (e && e.code === 'already-exists' && tries < 4) {
          N.code = newCode(); // someone else's game has this code: take another
          U.render();
          continue;
        }
        U.toast(why(e), 9000);
        if (e && /needs-account|unauthenticated/.test(String(e.code)) && usr && usr.signIn) usr.signIn();
        N.leave();
        return;
      }
    }
    remember({ code: N.code, role: 'host', name: N.names[0] });
    N.invite = null;
    if (typeof db.invite === 'function')
      db.invite(N.code)
        .then((link) => {
          N.invite = link;
          if (U.screen === 'lobby') U.render();
        })
        .catch(() => {});
    listenAsHost();
  };
  function listenAsHost() {
    joinLane();
    lastListed = null;
    list();
    clearInterval(beatTimer);
    beatTimer = setInterval(() => list(true), LIST_BEAT_MS);
    // who has taken each guest seat (1 to MAX_PLAYERS - 1)
    for (let s = 1; s < T.MAX_PLAYERS; s++)
      unsubs.push(
        db.doc(`games/${N.code}/seats/${s}`).onSnapshot((snap) => {
          const d = snap.exists ? snap.data() : null;
          N.names[s] = d ? String(d.name || 'Player ' + (s + 1)).slice(0, 24) : '';
          holders[s] = d && d.holder ? String(d.holder) : null;
          if (d) seen(s);
          const run = U.run;
          if (run && run.party && run.party.players[s]) {
            // a person sits down in a seat the AI fills: the seat and its pilot are theirs from now on
            if (N.names[s] && T.botKind(run, s) === 'fill') {
              T.takeOverSeat(run, s, N.names[s]);
              U.toast(esc(N.names[s]) + ' takes over from the AI.');
            } else if (!T.isBot(run, s)) run.party.players[s].name = N.names[s] || 'Player ' + (s + 1);
          }
          N.admit();
          N.status = lobbyStatus();
          if (U.screen === 'lobby') U.render();
          N.publish();
        }),
      );
    // guests' commands: live, and read again every few seconds in case the live delivery lags
    watchCmds();
    pollTimer = setInterval(poll, POLL_MS);
    clearInterval(seatTimer);
    seatTimer = setInterval(watchSeats, 1000);
    document.addEventListener('visibilitychange', onVisible);
  }

  /** Pick up hosting a game this screen hosted before a reload: from the state it last wrote. */
  N.resume = async function (code) {
    if (!db) return;
    let d;
    try {
      const snap = await db.doc('games/' + code).get();
      d = snap.exists ? snap.data() : null;
    } catch (e) {
      U.toast(why(e), 9000);
      return;
    }
    if (!d) {
      remember(null);
      U.toast('That game is gone.');
      U.render();
      return;
    }
    N.code = code;
    N.role = 'host';
    N.seat = 0;
    N.names = blankNames('Player 1').map((x, s) => String((d.names && d.names[s]) || x));
    N.rev = +d.rev || 0;
    U.seats = [0];
    N.away = Object.assign({}, d.away || {});
    Object.assign(acks, d.acks || {});
    try {
      Object.assign(results, JSON.parse(d.results || '{}'));
    } catch {
      /* no results to carry */
    }
    U.modal = null;
    if (d.run) {
      const run = T.deserializeRun(d.run);
      if (run.mission) run.mission.fx = JSON.parse(d.fx || '[]');
      U.run = run;
      if (run.phase === 'draft') {
        if (run.heroes[0]) U.draft = Object.assign(U.draft || {}, { heroIdx: 0, step: 'wait' });
        else U.beginDraft(0);
        U.screen = 'draft';
      } else if (run.phase === 'mission' && run.mission) {
        U.screen = 'mission';
        U.enterMission();
        // the effects in the state were shown before the reload
        U.ms.fxDone = run.mission.fx.length;
      } else U.screen = ['reward', 'haven', 'event', 'garage', 'summary'].includes(run.phase) ? run.phase : 'map';
    } else {
      U.run = null;
      U.screen = 'lobby';
    }
    N.status = lobbyStatus();
    lastWritten = null;
    U.render();
    listenAsHost();
    botsSoon();
    U.toast('Back in game ' + esc(code) + '.');
  };
  /** Carry out a guest's command on this (the host's) screen, then tell everyone. */
  N.carryOut = function (id, cmd, seats) {
    if (!U.run || !cmd || done.has(id)) return;
    done.add(id);
    cmd = JSON.parse(JSON.stringify(cmd)); // plain data of this page's own, whatever the store hands over
    const r = T.execCommand(U.run, cmd, seats);
    results[id] = { ok: !!r.ok, why: r.why || '' };
    const keys = Object.keys(results);
    if (keys.length > 12) delete results[keys[0]];
    N.afterChange();
    refresh();
    N.publish();
  };
  const done = new Set();
  /**
   * A player who took the next seat after the expedition set out joins it on the route (2.79, T.addPlayer):
   * their screen then drafts or brings a pilot, and the route waits for it.
   */
  N.admit = function () {
    const run = U.run;
    if (N.role !== 'host' || !run || !run.party) return;
    while (N.names[run.party.players.length] && T.canAddPlayer(run)) {
      const s = run.party.players.length;
      T.addPlayer(run, N.names[s]);
      U.toast(esc(N.names[s]) + ' joins the expedition and is bringing a pilot.');
      if (U.screen === 'map') U.render();
    }
  };
  /** What follows from a change on the host: every pilot drafted → the map; a newcomer waiting → in. */
  N.afterChange = function () {
    const run = U.run;
    if (N.role !== 'host' || !run) return;
    N.admit();
    botsSoon();
    // a guest's pilot can arrive before the host's, leaving a hole: count every seat, holes too (every()
    // skips them, which set out a squad with the host's pilot missing, 2.74–2.79.0)
    if (run.phase === 'draft' && T.squadReady(run)) {
      T.startMap(run);
      T.saveRun(run);
      U.screen = 'map';
      U.draft = null;
    }
  };
  /** The players who will set out: the host and the guests in the seats after it, with no empty seat between. */
  N.joined = () => {
    let n = 1;
    while (n < T.MAX_PLAYERS && N.names[n]) n++;
    return n;
  };
  /** How many will set out: the players here, and with the AI filling empty seats, as many seats as the host chose. */
  N.tableSize = () => {
    const o = N.tableOpts || {};
    const seats = Math.max(0, Math.min(T.MAX_PLAYERS, o.seats | 0));
    return o.aiFill ? Math.max(N.joined(), seats || 2) : N.joined();
  };
  N.start = function () {
    if (N.role !== 'host' || N.tableSize() < 2) return;
    U.startDraft();
    U.run.party = T.newParty(N.joined(), N.names);
    if (N.tableOpts.aiFill) T.fillSeats(U.run, N.tableSize());
    T.setLength(U.run, N.tableOpts.length || 'full');
    const rounds = U.homeRounds ? U.homeRounds() : U.roundsPref ? U.roundsPref() : null;
    if (rounds) U.run.party.rounds = rounds;
    T.botPilots(U.run); // the AI seats bring pre-made pilots
    U.draft.heroIdx = 0;
    N.publish();
  };

  /* ───────────── the AI's seats, on the host's screen ───────────── */
  /**
   * The AI plays its seats on the host's screen, where the game is: a seat the host asked it to fill, and the
   * seat of a player who has dropped, once the countdown runs out (src/engine/bots.js). It waits a moment after
   * each change, so the move that led to its turn is seen first.
   */
  let botTimer = null;
  const BOT_DELAY_MS = 700;
  function botsSoon() {
    if (N.role !== 'host' || botTimer || !U.run || !T.botSeats(U.run).length) return;
    botTimer = setTimeout(() => {
      botTimer = null;
      if (N.role !== 'host' || !U.run || !T.botStep(U.run)) return;
      N.afterChange();
      refresh();
      N.publish();
    }, BOT_DELAY_MS);
  }
  N.botsSoon = botsSoon;

  /**
   * Who is still here. A guest's screen says so every few seconds (a 'here' beat in the game's room, and its
   * seat doc's `at` now and then), and every command it sends says so too. A seat with a pilot that has said
   * nothing for N.DROP_MS has dropped: every screen sees a countdown, and when it runs out the AI holds the seat
   * (T.holdSeat) until the player is back. The host may give the seat to the AI at once, or wait for them.
   */
  N.DROP_MS = 30 * 1000; // quiet this long: dropped
  N.HOLD_MS = 60 * 1000; // the countdown
  const lastSeen = {}; // seat → when the host last heard from it
  const waiting = new Set(); // seats the host chose to wait for
  function seen(s) {
    lastSeen[s] = Date.now();
    if (N.role !== 'host' || !U.run) return;
    const back = N.away[s] != null || T.botKind(U.run, s) === 'hold';
    if (!back) return;
    delete N.away[s];
    waiting.delete(s);
    if (T.releaseSeat(U.run, s)) U.toast(`${esc(N.names[s] || 'Player ' + (s + 1))} is back in their seat.`);
    showAway();
    refresh();
    N.publish();
  }
  /** Look at every person's seat: start a countdown for one gone quiet, and hand it to the AI when it runs out. */
  function watchSeats() {
    const run = U.run;
    if (N.role !== 'host' || !run || !run.party || run.over) return;
    const now = Date.now();
    let changed = false;
    run.party.players.forEach((p, s) => {
      if (s === 0 || T.isBot(run, s) || !N.names[s]) return;
      if (lastSeen[s] == null) lastSeen[s] = now; // first look since this screen took the game: give them time
      const quiet = now - lastSeen[s] >= N.DROP_MS;
      if (!quiet || waiting.has(s)) return;
      if (N.away[s] == null) {
        N.away[s] = now + N.HOLD_MS;
        U.toast(`${esc(N.names[s])} lost connection. An AI pilot takes their seat in a minute.`, 5000);
        changed = true;
      } else if (now >= N.away[s]) N.giveToAI(s);
    });
    showAway();
    if (changed) N.publish();
  }
  /** The host gives a dropped player's seat to the AI now. */
  N.giveToAI = function (s) {
    if (N.role !== 'host' || !U.run || !T.holdSeat(U.run, s)) return;
    delete N.away[s];
    waiting.delete(s);
    U.toast(`An AI pilot holds ${esc(N.names[s] || 'their')}'s seat until they are back.`, 5000);
    showAway();
    refresh();
    N.publish();
    botsSoon();
  };
  /** The host waits for a dropped player instead: no countdown, and the table waits as it always did. */
  N.waitFor = function (s) {
    if (N.role !== 'host') return;
    waiting.add(s);
    delete N.away[s];
    if (U.run) T.releaseSeat(U.run, s);
    showAway();
    refresh();
    N.publish();
  };
  /** The countdown for each dropped seat, as a strip over whatever screen is showing; the host's has its two choices. */
  function showAway() {
    if (typeof document === 'undefined' || !document || !document.body) return;
    if (U.tickAway) U.tickAway(); // the mission screen shows the same countdowns in its squad and side column
    let el = document.getElementById('netAway');
    const run = U.run;
    const now = Date.now();
    const rows = [];
    for (const k of Object.keys(N.away || {})) {
      const s = +k;
      const left = Math.max(0, Math.ceil((N.away[k] - now) / 1000));
      const who = esc(N.names[s] || 'Player ' + (s + 1));
      const mine = N.role === 'guest' && s === N.seat;
      rows.push(
        `<div class="net-away-row"><b>${mine ? 'You seem to be offline' : who + ' lost connection'}</b> <span class="small">An AI pilot takes the seat in <span class="mono">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span> and plays it safe until they are back. Reloading the page puts a player back in their seat.</span>${
          N.role === 'host'
            ? ` <button class="sm" data-act="netGiveAI" data-arg="${s}">Give the seat to the AI</button><button class="sm ghost" data-act="netWait" data-arg="${s}">Wait for them</button>`
            : ''
        }</div>`,
      );
    }
    if (run && run.party)
      T.botSeats(run)
        .filter((s) => T.botKind(run, s) === 'hold')
        .forEach((s) =>
          rows.push(
            `<div class="net-away-row"><b>An AI pilot holds ${esc(N.names[s] || 'Player ' + (s + 1))}'s seat</b> <span class="small">until they are back. Reloading the page puts them back in it.</span></div>`,
          ),
        );
    if (!rows.length) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'netAway';
      el.className = 'net-away';
      document.body.appendChild(el);
    }
    el.innerHTML = rows.join('');
  }
  let seatTimer = null;
  // anything the host does on its own screen is written after the click that did it
  const later = () => setTimeout(() => N.publish(), 0);
  document.addEventListener('click', later);
  // typing in a box changes nothing until it is kept (on change), so a keystroke there writes nothing
  document.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    later();
  });

  /* ───────────── a guest ───────────── */
  /**
   * This screen's commands the host has not carried out yet, in order. A guest plays each command on its
   * own copy at once, so the click answers without waiting for the round trip: the engine is
   * deterministic, so the host works out the same thing. The host's state still wins. Each state it
   * writes is taken as it comes, and the commands it has not acknowledged yet are played again on top.
   * A command stays until the host acknowledges it, however long that takes; it is sent again meanwhile.
   */
  let pending = []; // { seq, cmd, at, sentAt }
  let seq = 0; // the last command this screen numbered
  const RESEND_MS = 3000; // a command not acknowledged by then is written again (same id: harmless)
  const STALL_MS = 8000; // past this, say that the host's screen is not answering
  const cmdId = (n) => `${N.seat}-${String(n).padStart(9, '0')}`;
  const write = (p) => {
    p.sentAt = Date.now();
    const body = { cmd: p.cmd, seat: N.seat, seq: p.seq, holder: tab, at: p.at };
    if (JSON.stringify(body).length < 3500) ping('cmd', body); // the room takes 4 KiB at most
    return db
      .doc(`games/${N.code}/cmds/${cmdId(p.seq)}`)
      .set({ cmd: p.cmd, seat: N.seat, seq: p.seq, holder: tab, at: p.at });
  };
  N.send = function (cmd) {
    // what goes over the wire is the command as made; the local play below fills in its ctx
    const wire = JSON.parse(JSON.stringify(cmd));
    cmd = JSON.parse(JSON.stringify(cmd));
    // a drafted pilot is not played ahead: the map opens on the host's word, once both are in
    const ahead = U.run && cmd.op !== 'addHero';
    const r = ahead ? T.execCommand(U.run, cmd, U.seats) : { ok: true, ctx: {} };
    if (r && r.ok === false) return r; // refused here: the host would refuse it too, so say why now
    const p = { seq: ++seq, cmd: wire, at: Date.now(), ahead };
    pending.push(p);
    write(p).catch((e) => {
      if (/denied|grant|permission|not_writer|forbidden|unauth/i.test(String((e && (e.code || e.message)) || e))) {
        pending = pending.filter((x) => x !== p);
        U.toast(why(e), 6000);
      } // anything else is tried again by the resend
    });
    return Object.assign({ sent: true }, r, { ok: true, ctx: (r && r.ctx) || {} });
  };
  let guestTimer = null;
  let stallSaid = 0;
  let reading = false;
  let lastRead = 0;
  /** Read the host's state now, rather than wait for the live delivery. One read at a time. */
  function readState() {
    if (reading || N.role !== 'guest' || !N.code) return;
    reading = true;
    lastRead = Date.now();
    gameDoc()
      .get()
      .then((s) => s.exists && N.receive(s.data()))
      .catch(() => {})
      .then(() => (reading = false));
  }
  const READ_MS = 2000; // the live delivery can lag by half a minute: read at least this often
  const BEAT_MS = 5000; // a 'here' in the game's room this often
  const SEAT_BEAT_MS = 20000; // and the seat doc's `at` this often, for a page with no room
  let beatAt = 0;
  let seatBeatAt = 0;
  const beat = (now) => {
    if (now - beatAt >= BEAT_MS) {
      beatAt = now;
      ping('here', { seat: N.seat });
    }
    if (now - seatBeatAt >= SEAT_BEAT_MS) {
      seatBeatAt = now;
      db.doc(`games/${N.code}/seats/${N.seat}`)
        .set({ name: N.myName || 'Player ' + (N.seat + 1), holder: tab, at: now })
        .catch(() => {}); // the next beat tries again
    }
  };
  const guestTick = () => {
    if (N.role !== 'guest') return;
    const now = Date.now();
    beat(now);
    if (now - lastRead >= READ_MS) readState();
    if (!pending.length) {
      N.stalled = false;
      return;
    }
    for (const p of pending) if (now - p.sentAt >= RESEND_MS) write(p).catch(() => {});
    N.stalled = now - pending[0].at >= STALL_MS;
    if (N.stalled && now - stallSaid > 15000) {
      stallSaid = now;
      U.toast(`Waiting for ${esc(N.names[0] || 'the host')}'s screen… Tumult must stay open there.`, 4000);
    }
  };
  const watchGame = () => {
    unsubs.push(
      gameDoc().onSnapshot(
        (s) => s.exists && N.receive(s.data()),
        () => N.role === 'guest' && setTimeout(watchGame, 1000),
      ),
    );
  };

  N.join = async function (code, name) {
    if (!db) return;
    code = String(code || '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
    if (code.length !== 4) {
      U.toast('A game code is four letters.');
      return;
    }
    if (N.canWrite === false) {
      U.toast(NO_ACCESS, 9000);
      return;
    }
    N.code = code;
    U.toast('Joining ' + esc(code) + '…');
    try {
      const snap = await gameDoc().get();
      if (!snap.exists) {
        N.code = null;
        U.toast('No game with that code. Check it with the host; the host must keep their page open.');
        return;
      }
      // a seat already in this name is taken again (a reload); else the first seat nobody holds. Once the
      // expedition has set out, only its own seats are open.
      const g = snap.data();
      // once the expedition has set out, a seat is open to a newcomer when the AI fills it, and on the route
      // between missions one more seat opens (2.79)
      let gameRun = null;
      try {
        gameRun = g.run ? T.deserializeRun(g.run) : null;
      } catch {
        /* a state this screen cannot read: no seat for a newcomer */
      }
      const openSeat = (s) =>
        !g.run ||
        (gameRun &&
          (T.botKind(gameRun, s) === 'fill' || (s === gameRun.party.players.length && T.canAddPlayer(gameRun))));
      const names = await Promise.all(
        Array.from({ length: T.MAX_PLAYERS - 1 }, (x, k) =>
          db
            .doc(`games/${code}/seats/${k + 1}`)
            .get()
            .then((d) => (d.exists && d.data() ? String(d.data().name || '') : '')),
        ),
      );
      const order = [];
      names.forEach((x, k) => x && x === name && order.push(k + 1));
      names.forEach((x, k) => !x && openSeat(k + 1) && order.push(k + 1));
      let seat = null;
      for (const s of order) {
        const seatDoc = db.doc(`games/${code}/seats/${s}`);
        // a short lease while claiming the seat; one left by a page that just reloaded runs out in seconds
        let lease = await seatDoc.acquire({ holder: tab, ttlMs: 3000 });
        for (let i = 0; i < 4 && !lease.acquired; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          lease = await seatDoc.acquire({ holder: tab, ttlMs: 3000 });
        }
        const taken = (await seatDoc.get()).data();
        if (!lease.acquired || (taken && taken.name && taken.name !== name)) continue;
        await seatDoc.set({ name: name || 'Player ' + (s + 1), holder: tab, at: Date.now() });
        seat = s;
        break;
      }
      if (seat == null) {
        N.code = null;
        U.toast(
          g.run
            ? 'That expedition is in a mission or full. A newcomer can join on the route, between missions, or take a seat the AI fills.'
            : `That game already has ${T.MAX_PLAYERS} players.`,
        );
        return;
      }
      N.seat = seat;
      N.myName = name || 'Player ' + (seat + 1);
      // carry on numbering from what the host has already carried out for this seat
      seq = (g.acks && +g.acks[seat]) || 0;
    } catch (e) {
      N.code = null;
      U.toast(why(e), 9000);
      if (e && /needs-account|unauthenticated/.test(String(e.code)) && usr && usr.signIn) usr.signIn();
      return;
    }
    N.role = 'guest';
    U.seats = [N.seat];
    U.screen = 'lobby';
    remember({ code, role: 'guest', name: name || 'Player ' + (N.seat + 1) });
    N.status = 'Joined. Waiting for the host to start…';
    // a guest's screen keeps no save of its own: the game lives on the host's
    N.realSave = N.realSave || T.saveRun;
    T.saveRun = () => true;
    U.render();
    watchGame();
    joinLane();
    lastRead = Date.now();
    guestTimer = setInterval(guestTick, 500);
  };

  /** A guest takes in the state the host wrote. */
  N.receive = function (d) {
    lastRead = Date.now(); // a state arrived, by whatever road: no need to read it again yet
    if (d && d.away && typeof d.away === 'object') {
      N.away = Object.assign({}, d.away);
      showAway();
    }
    if (!d || !d.run || d.rev <= N.rev) {
      if (d && d.names) N.names = d.names.map(String);
      if (d && !d.run && d.table && typeof d.table === 'object') {
        N.tableOpts = {
          seats: Math.min(T.MAX_PLAYERS, +d.table.seats | 0),
          aiFill: !!d.table.aiFill,
          length: T.LENGTHS[d.table.length] ? d.table.length : 'full',
        };
        if (U.screen === 'lobby') U.render();
      }
      return;
    }
    N.rev = d.rev;
    N.names = (d.names || N.names).map(String);
    const before = U.run;
    const run = T.deserializeRun(d.run);
    if (run.mission) run.mission.fx = JSON.parse(d.fx || '[]');
    const res = JSON.parse(d.results || '{}');
    const acked = (d.acks && +d.acks[N.seat]) || 0;
    // what came of this screen's own commands: what followed from each was shown when it was played here,
    // so only a refusal is news (the host's state had moved on); a pick it opened is closed again
    let refused = false;
    for (const p of pending) {
      if (p.seq > acked) break;
      const r = res[N.seat + '-' + p.seq];
      if (r && !r.ok) {
        refused = true;
        if (r.why) U.toast(esc(r.why));
      }
    }
    // play again what this screen has done that the host has not reached yet
    pending = pending.filter((p) => p.seq > acked);
    if (acked > seq) seq = acked; // a command from before a reload was carried out after this screen took its number
    for (const p of pending) if (p.ahead) T.execCommand(run, JSON.parse(JSON.stringify(p.cmd)), U.seats);
    U.run = run;
    showAway();
    // which screen: the run's phase decides, except the draft, which each player does on their own
    const sameMission =
      before && before.mission && run.mission && before.launched === run.launched && U.screen === 'mission';
    // a newcomer on the route makes the pilot it brings (2.79): the seat's pilot the run is still waiting for
    const owed =
      run.phase === 'map' && run.party ? run.party.owner.findIndex((s, i) => s === N.seat && !run.heroes[i]) : -1;
    if (run.phase === 'draft') {
      if (run.heroes[N.seat]) U.draft = Object.assign(U.draft || {}, { step: 'wait' });
      else if (!U.draft || U.screen !== 'draft') U.beginDraft(N.seat);
      U.screen = 'draft';
    } else if (owed >= 0) {
      if (!U.draft || U.draft.heroIdx !== owed || U.screen !== 'draft') U.beginDraft(owed);
      U.screen = 'draft';
    } else if (run.phase === 'mission' && run.mission) {
      if (!sameMission) {
        U.modal = null;
        U.screen = 'mission';
        U.enterMission();
        U.ms.heroIdx = T.heroesOf(run, N.seat)[0] || 0;
      }
    } else {
      if (U.screen === 'mission') U.modal = null;
      U.screen = ['reward', 'haven', 'event', 'garage', 'summary'].includes(run.phase) ? run.phase : 'map';
      // the expedition is over: this player's own pilot takes its growth home to this device
      if (run.phase === 'summary' && U.keepProgress) U.keepProgress(run);
    }
    if (refused && U.screen === 'mission' && U.ms && U.ms.mode !== 'idle') U.ms.mode = 'idle';
    // effects already shown are not shown again; if the host's state has fewer, start counting from there
    if (sameMission && U.ms && run.mission && run.mission.fx.length < U.ms.fxDone) U.ms.fxDone = run.mission.fx.length;
    if (sameMission) U.updateMission();
    else U.render();
  };

  function refresh() {
    if (U.screen === 'mission' && U.ms && U.ms.built) U.updateMission();
    else U.render();
  }

  N.leave = function () {
    remember(null); // leaving on purpose: nothing to rejoin
    if (N.role === 'host') unlist(N.code); // and nobody else can join it now
    clearInterval(beatTimer);
    lastListed = null;
    stop();
    leaveLane();
    pending = [];
    seq = 0;
    clearInterval(pollTimer);
    clearInterval(guestTimer);
    clearInterval(seatTimer);
    clearTimeout(botTimer);
    botTimer = null;
    N.away = {};
    waiting.clear();
    for (const k of Object.keys(lastSeen)) delete lastSeen[k];
    showAway();
    document.removeEventListener('visibilitychange', onVisible);
    for (const o of [acks, holders, results]) for (const k of Object.keys(o)) delete o[k];
    done.clear();
    lastWritten = null;
    if (N.realSave) T.saveRun = N.realSave;
    Object.assign(N, { code: null, role: null, seat: null, rev: 0, status: '', invite: null, myName: '' });
    U.seats = null;
    U.run = null;
    U.modal = null;
    U.screen = 'title';
    U.render();
  };

  /* ───────────── screens ───────────── */
  U.titleNet = function () {
    if (!N.available) return '';
    if (N.canWrite === false)
      return `<div class="net-pick"><span class="dim small">Play online</span><div class="mute small">${esc(NO_ACCESS)}</div></div>`;
    const m = N.remembered();
    const back = m
      ? `<button class="sm primary" data-act="netRejoin">Rejoin game ${esc(m.code)}${m.role === 'host' ? ' as host' : ''}</button>`
      : '';
    return `<div class="net-pick"><span class="dim small">Play online</span>${back}
      <input id="netName" placeholder="Your name" maxlength="24">
      <button class="sm" data-act="netHost">Host a game</button>
      <input id="netCode" placeholder="CODE" maxlength="4" style="width:5em;text-transform:uppercase" value="${esc(N.linked || '')}">
      <button class="sm" data-act="netJoin">Join</button>
      <div class="net-games" id="netGames">${U.gamesList()}</div>
      <div class="mute small">${esc(N.howTo())}</div></div>`;
  };
  N.howTo = () =>
    db && typeof db.invite === 'function'
      ? `Two to ${T.MAX_PLAYERS} players, a screen each: each flies one pilot and you take turns, and the AI can fill the empty seats. Join a game from the list, or with the code its host gives you. The host signs in, keeps this page open and shares the code, or an invite link for a player without an account.`
      : `Two to ${T.MAX_PLAYERS} players, a screen each: each flies one pilot and you take turns, and the AI can fill the empty seats. Join a game from the list, or with the code its host gives you; the host keeps this page open. Players need write access to this page (an email invite as Editor, or Contributor in your organization). A view-only link can't join.`;
  /** A link with ?join=CODE&invite=TOKEN: keep the invite for this tab and fill in the code. */
  N.fromLink = function () {
    if (typeof location === 'undefined') return;
    let q;
    try {
      q = new URLSearchParams(location.search);
    } catch (e) {
      return;
    }
    const code = String(q.get('join') || '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '');
    if (code.length !== 4) return;
    if (q.get('invite') && db && typeof db.useInvite === 'function') db.useInvite(code, q.get('invite'));
    N.linked = code;
    try {
      history.replaceState(history.state, '', location.pathname); // the code is in the box; the link need not stay in the bar
    } catch (e) {
      /* the bar keeps it */
    }
  };
  U.renderLobby = function () {
    const host = N.role === 'host';
    const W = U.welcome || {};
    // the server's invite (with its token) when there is one, else a plain ?join= link, else the code
    const link = N.invite || (W.inviteLink ? W.inviteLink(N.code || '') : null);
    const share = link || N.code || '';
    const room = N.joined() < T.MAX_PLAYERS;
    // the link (or, inside another page, the code) and a copy button: a friend needs nothing else
    const invite =
      host && room
        ? `<div class="invite-box"><span class="dim small">${link ? 'Invite link' : 'Game code'}</span><div class="row"><input id="inviteField" class="mono" readonly value="${esc(share)}"><button class="primary" data-act="inviteCopy" data-arg="${esc(N.code || '')}">Copy</button></div>
        <div class="small dim">${link ? 'Anyone with the link can join this game with only a name.' : 'Your friend opens this page and joins with the code.'}</div></div>`
        : '';
    const seat = (name, who, here) =>
      `<div class="seat${here ? '' : ' waiting'}"><span class="seat-dot" aria-hidden="true"></span><div><b>${esc(name)}</b><div class="small dim">${esc(who)}</div></div><span class="right small">${here ? 'Joined' : 'Waiting…'}</span></div>`;
    const o = N.tableOpts;
    const size = N.tableSize();
    // a seat the AI will fill says so; with no AI, one open seat waits for a friend
    const ai = (s) =>
      `<div class="seat waiting"><span class="seat-dot" aria-hidden="true"></span><div><b>Seat ${s + 1}</b><div class="small dim">open seat</div></div><span class="right small">AI fills it</span></div>`;
    const seats = N.names
      .map((x, s) =>
        s === 0 ? seat(x || 'Player 1', 'host', true) : x ? seat(x, 'guest', true) : s < size ? ai(s) : '',
      )
      .join('');
    const open = room && size <= N.joined() ? seat('Seat ' + (N.joined() + 1), 'waiting for your friend', false) : '';
    const seg = (act, items, on) =>
      `<span class="net-seg">${items.map(([v, label]) => `<button class="sm${String(v) === String(on) ? ' primary' : ' ghost'}" ${host ? `data-act="${act}" data-arg="${v}"` : 'disabled'}>${label}</button>`).join('')}</span>`;
    const opts = `<div class="net-opts">
      <div><span class="dim small">Length</span> ${seg(
        'netLength',
        Object.keys(T.LENGTHS).map((k) => [k, `${k === 'short' ? 'Short' : 'Full'} · ${T.LENGTHS[k].stops} stops`]),
        o.length,
      )}</div>
      <div><span class="dim small">Empty seats</span> ${seg('netSeats', [[0, 'Leave open']].concat([2, 3, 4, 5].filter((n) => n <= T.MAX_PLAYERS).map((n) => [n, `AI fills to ${n}`])), o.aiFill ? o.seats : 0)}</div></div>`;
    const go = size > 1;
    return `<div class="wrap"><div class="panel net-lobby"><div class="kick">Play with friends</div><h2>Expedition <span class="mono">${esc(N.code || '')}</span></h2>
      ${invite}
      <div class="seats">${seats}${open}</div>
      ${opts}
      <p class="dim">${esc(N.status)}</p>
      <div class="row">${host ? `<button class="primary" data-act="netStart" ${go ? '' : 'disabled'}>Start the expedition${go ? ` (${size} ${size - N.joined() ? `seats, ${size - N.joined()} AI` : 'players'})` : ''}</button>` : ''}<button class="ghost" data-act="netLeave">Leave</button></div></div></div>`;
  };
  /** Before the expedition sets out, the game doc carries the table's choices, so a guest's lobby shows them. */
  N.writeTable = function () {
    if (N.role !== 'host' || !db || U.run) return;
    gameDoc()
      .set({
        rev: 0,
        run: null,
        acks: {},
        host: tab,
        names: N.names.slice(),
        table: Object.assign({}, N.tableOpts),
        at: Date.now(),
      })
      .catch(() => {});
  };

  const val = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };
  const prevExtra = U.extraAct;
  U.extraAct = function (act, arg, el, e) {
    switch (act) {
      case 'netHost':
        N.host(val('netName') || 'Player 1');
        return true;
      case 'netJoin':
        N.join(val('netCode'), val('netName'));
        return true;
      case 'netJoinGame':
        N.join(arg, val('netName'));
        return true;
      case 'netRejoin': {
        const m = N.remembered();
        if (m && m.role === 'host') N.resume(m.code);
        else if (m) N.join(m.code, m.name);
        return true;
      }
      case 'netStart':
        N.start();
        return true;
      case 'netGiveAI':
        N.giveToAI(parseInt(arg, 10));
        return true;
      case 'netWait':
        N.waitFor(parseInt(arg, 10));
        return true;
      case 'netSeats':
        N.tableOpts.seats = parseInt(arg, 10) || 0;
        N.tableOpts.aiFill = N.tableOpts.seats > 0;
        N.writeTable();
        U.render();
        return true;
      case 'netLength':
        if (T.LENGTHS[arg]) N.tableOpts.length = arg;
        N.writeTable();
        U.render();
        return true;
      case 'netLeave':
        N.leave();
        return true;
    }
    return prevExtra ? prevExtra(act, arg, el, e) : false;
  };
})((window.T = window.T || {}));
