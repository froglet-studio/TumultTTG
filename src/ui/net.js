/* ============================================================================
   TUMULT — PLAY ONLINE (test page only).
   Two screens, one game, through the shared store of the page that hosts the build
   (claude.ai's `db` capability: window.claude.use('db')). Only the playtest build has
   this file; with no such store, it shows nothing and the game is as it was.

   The host's screen holds the game. A guest's screen shows the state the host last
   wrote and sends commands (T.execCommand) for its own pilot; the host carries them out
   in the order they arrive and writes the new state. Because the engine is
   deterministic and a run is plain data, the state is the whole truth: a screen that
   joins late, or reloads, is caught up by the next state.

   Store layout, under games/<CODE>:
     games/<CODE>               { rev, run (a save, T.serializeRun), fx, results, acks, host, names, at }
     games/<CODE>/seats/<n>     { name, holder }       a guest's claim on seat n
     games/<CODE>/cmds/<n>-<seq> { cmd, seat, seq, holder, at }   a guest's command, deleted once carried out

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
    names: ['', ''],
    rev: 0,
    status: '',
    isGuest: () => N.role === 'guest',
    online: () => !!N.role,
  });

  // light up once the page's host answers; a saved copy of the page never will
  if (window.claude && typeof window.claude.use === 'function') {
    window.claude
      .use('db')
      .then((d) => {
        db = d;
        N.available = !!d;
        if (d && U.screen === 'title') U.render();
        return window.claude.use('room').then(
          (r) => {
            rooms = r;
            return window.claude.use('user');
          },
          () => window.claude.use('user'),
        );
      })
      .then(async (u) => {
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
    const code = String((e && (e.code || e.message)) || e || '');
    return /denied|grant|permission|not_writer|forbidden|unauth/i.test(code)
      ? NO_ACCESS
      : 'Could not reach the game (' + esc(code || 'unavailable') + ').';
  };
  N.why = why;

  const gameDoc = () => db.doc('games/' + N.code);
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
    if (N.role !== 'host' || !U.run) return;
    const run = T.serializeRun(U.run);
    const fx = U.run.mission ? U.run.mission.fx : [];
    const body = JSON.stringify([run, fx.length, N.names, results, acks]);
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
    N.names = [name || 'Player 1', ''];
    U.seats = [0];
    U.screen = 'lobby';
    N.status = 'Waiting for player 2…';
    U.render();
    try {
      await gameDoc().set({ rev: 0, run: null, acks: {}, host: tab, names: N.names, at: Date.now() });
    } catch (e) {
      U.toast(why(e), 9000);
      N.leave();
      return;
    }
    remember({ code: N.code, role: 'host', name: N.names[0] });
    listenAsHost();
  };
  function listenAsHost() {
    joinLane();
    // who has taken seat 1
    unsubs.push(
      db.doc(`games/${N.code}/seats/1`).onSnapshot((snap) => {
        const d = snap.exists ? snap.data() : null;
        N.names[1] = d ? String(d.name || 'Player 2').slice(0, 24) : '';
        holders[1] = d && d.holder ? String(d.holder) : null;
        if (U.run && U.run.party && U.run.party.players[1]) U.run.party.players[1].name = N.names[1] || 'Player 2';
        N.status = N.names[1] ? `${N.names[1]} is here.` : 'Waiting for player 2…';
        if (U.screen === 'lobby') U.render();
        N.publish();
      }),
    );
    // guests' commands: live, and read again every few seconds in case the live delivery lags
    watchCmds();
    pollTimer = setInterval(poll, POLL_MS);
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
    N.names = (d.names || ['Player 1', '']).map(String);
    N.rev = +d.rev || 0;
    U.seats = [0];
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
      } else U.screen = ['reward', 'haven', 'event', 'summary'].includes(run.phase) ? run.phase : 'map';
    } else {
      U.run = null;
      U.screen = 'lobby';
    }
    N.status = N.names[1] ? `${N.names[1]} is here.` : 'Waiting for player 2…';
    lastWritten = null;
    U.render();
    listenAsHost();
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
  /** What follows from a change on the host: both pilots drafted → the map. */
  N.afterChange = function () {
    const run = U.run;
    if (N.role !== 'host' || !run) return;
    if (run.phase === 'draft' && run.heroes.length === 2 && run.heroes.every(Boolean)) {
      T.startMap(run);
      T.saveRun(run);
      U.screen = 'map';
      U.draft = null;
    }
  };
  N.start = function () {
    if (N.role !== 'host' || !N.names[1]) return;
    U.startDraft();
    U.run.party = T.newParty(2, N.names);
    U.draft.heroIdx = 0;
    N.publish();
  };
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
  const guestTick = () => {
    if (N.role !== 'guest') return;
    const now = Date.now();
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
      const seatDoc = db.doc(`games/${code}/seats/1`);
      // a short lease while claiming the seat; one left by a page that just reloaded runs out in seconds
      let lease = await seatDoc.acquire({ holder: tab, ttlMs: 3000 });
      for (let i = 0; i < 4 && !lease.acquired; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        lease = await seatDoc.acquire({ holder: tab, ttlMs: 3000 });
      }
      const taken = (await seatDoc.get()).data();
      if (!lease.acquired || (taken && taken.name && taken.name !== name)) {
        N.code = null;
        U.toast('That game already has two players.');
        return;
      }
      await seatDoc.set({ name: name || 'Player 2', holder: tab });
      // carry on numbering from what the host has already carried out for this seat
      seq = (snap.data().acks && +snap.data().acks[1]) || 0;
    } catch (e) {
      N.code = null;
      U.toast(why(e), 9000);
      return;
    }
    N.role = 'guest';
    N.seat = 1;
    U.seats = [1];
    U.screen = 'lobby';
    remember({ code, role: 'guest', name: name || 'Player 2' });
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
    if (!d || !d.run || d.rev <= N.rev) {
      if (d && d.names) N.names = d.names.map(String);
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
    // which screen: the run's phase decides, except the draft, which each player does on their own
    const sameMission =
      before && before.mission && run.mission && before.launched === run.launched && U.screen === 'mission';
    if (run.phase === 'draft') {
      if (run.heroes[N.seat]) U.draft = Object.assign(U.draft || {}, { step: 'wait' });
      else if (!U.draft || U.screen !== 'draft') U.beginDraft(N.seat);
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
      U.screen = ['reward', 'haven', 'event', 'summary'].includes(run.phase) ? run.phase : 'map';
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
    stop();
    leaveLane();
    pending = [];
    seq = 0;
    clearInterval(pollTimer);
    clearInterval(guestTimer);
    document.removeEventListener('visibilitychange', onVisible);
    for (const o of [acks, holders, results]) for (const k of Object.keys(o)) delete o[k];
    done.clear();
    lastWritten = null;
    if (N.realSave) T.saveRun = N.realSave;
    Object.assign(N, { code: null, role: null, seat: null, rev: 0, status: '' });
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
      <input id="netCode" placeholder="CODE" maxlength="4" style="width:5em;text-transform:uppercase">
      <button class="sm" data-act="netJoin">Join</button>
      <div class="mute small">Two players, two screens: each flies one pilot and you take turns. The host keeps this page open and shares the code; the partner needs write access to this page (an email invite as Editor, or Contributor in your organization). A view-only link can't join.</div></div>`;
  };
  U.renderLobby = function () {
    const host = N.role === 'host';
    return `<div class="wrap"><div class="panel net-lobby"><div class="kick">Online game</div><h2>Code <span class="mono">${esc(N.code || '')}</span></h2>
      <p>${esc(N.names[0] || 'Player 1')} (host)${N.names[1] ? ' · ' + esc(N.names[1]) : ''}</p>
      <p class="dim">${esc(N.status)}</p>
      <div class="row">${host ? `<button class="primary" data-act="netStart" ${N.names[1] ? '' : 'disabled'}>Start the expedition</button>` : ''}<button class="ghost" data-act="netLeave">Leave</button></div></div></div>`;
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
        N.join(val('netCode'), val('netName') || 'Player 2');
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
      case 'netLeave':
        N.leave();
        return true;
    }
    return prevExtra ? prevExtra(act, arg, el, e) : false;
  };
})((window.T = window.T || {}));
