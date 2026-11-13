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
     games/<CODE>               { rev, run (a save, T.serializeRun), fx, results, host, names, at }
     games/<CODE>/seats/<n>     { name, holder }       a guest's claim on seat n
     games/<CODE>/cmds/<id>     { cmd, seats, at }     a guest's command, deleted once carried out
   ========================================================================== */
(function (T) {
  const U = T.UI;
  const esc = U.esc;
  const tab = Math.random().toString(36).slice(2, 10); // this screen, as a lease holder
  const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const newCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

  let db = null;
  const N = (U.net = {
    available: false,
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
      })
      .catch(() => {});
  }

  const gameDoc = () => db.doc('games/' + N.code);
  const unsubs = [];
  const stop = () => unsubs.splice(0).forEach((u) => u && u());

  /* ───────────── the host ───────────── */
  let lastWritten = null;
  let writing = Promise.resolve();
  const results = {}; // command id → { ok, why, ctx }, the latest few
  /** Write the state if it changed. One write at a time; a burst coalesces into the last one. */
  N.publish = function () {
    if (N.role !== 'host' || !U.run) return;
    const run = T.serializeRun(U.run);
    const fx = U.run.mission ? U.run.mission.fx : [];
    const body = JSON.stringify([run, fx.length, N.names, Object.keys(results).length]);
    if (body === lastWritten) return;
    lastWritten = body;
    N.rev++;
    const doc = {
      rev: N.rev,
      run,
      fx: JSON.stringify(fx),
      results: JSON.stringify(results),
      host: tab,
      names: N.names.slice(),
      at: Date.now(),
    };
    writing = writing
      .then(() => gameDoc().set(doc))
      .catch((e) => U.toast('Could not reach the other player: ' + esc((e && e.code) || e)));
  };

  N.host = async function (name) {
    if (!db) return;
    N.code = newCode();
    N.role = 'host';
    N.seat = 0;
    N.names = [name || 'Player 1', ''];
    U.seats = [0];
    U.screen = 'lobby';
    N.status = 'Waiting for player 2…';
    U.render();
    await gameDoc().set({ rev: 0, run: null, host: tab, names: N.names, at: Date.now() });
    // who has taken seat 1
    unsubs.push(
      db.doc(`games/${N.code}/seats/1`).onSnapshot((snap) => {
        const d = snap.exists ? snap.data() : null;
        N.names[1] = d ? String(d.name || 'Player 2').slice(0, 24) : '';
        if (U.run && U.run.party && U.run.party.players[1]) U.run.party.players[1].name = N.names[1] || 'Player 2';
        N.status = N.names[1] ? `${N.names[1]} is here.` : 'Waiting for player 2…';
        if (U.screen === 'lobby') U.render();
        N.publish();
      }),
    );
    // guests' commands, oldest first
    unsubs.push(
      db
        .collection(`games/${N.code}/cmds`)
        .orderBy('at')
        .onSnapshot((snap) => {
          snap.docChanges().forEach((ch) => {
            if (ch.type !== 'added') return;
            const d = ch.doc.data() || {};
            ch.doc.ref ? ch.doc.ref.delete() : db.doc(`games/${N.code}/cmds/${ch.doc.id}`).delete();
            N.carryOut(ch.doc.id, d.cmd, [1]);
          });
        }),
    );
  };
  /** Carry out a guest's command on this (the host's) screen, then tell everyone. */
  N.carryOut = function (id, cmd, seats) {
    if (!U.run || !cmd || done.has(id)) return;
    done.add(id);
    cmd = JSON.parse(JSON.stringify(cmd)); // plain data of this page's own, whatever the store hands over
    const r = T.execCommand(U.run, cmd, seats);
    results[id] = { ok: !!r.ok, why: r.why || '', ctx: r.ctx || null };
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
  document.addEventListener('keydown', later);

  /* ───────────── a guest ───────────── */
  const sent = new Map(); // command id → the hero it was for
  N.send = function (cmd) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    sent.set(id, cmd.hero);
    db.doc(`games/${N.code}/cmds/${id}`)
      .set({ cmd: JSON.parse(JSON.stringify(cmd)), seats: U.seats, at: Date.now() })
      .catch((e) => U.toast('Could not send that: ' + esc((e && e.code) || e)));
    return { ok: true, sent: true, ctx: {} };
  };

  N.join = async function (code, name) {
    if (!db) return;
    code = String(code || '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
    N.code = code;
    const snap = await gameDoc().get();
    if (!snap.exists) {
      N.code = null;
      U.toast('No game with that code.');
      return;
    }
    const seatDoc = db.doc(`games/${code}/seats/1`);
    const lease = await seatDoc.acquire({ holder: tab, ttlMs: 3000 });
    const taken = (await seatDoc.get()).data();
    if (!lease.acquired || (taken && taken.name && taken.name !== name)) {
      N.code = null;
      U.toast('That game already has two players.');
      return;
    }
    await seatDoc.set({ name: name || 'Player 2', holder: tab });
    N.role = 'guest';
    N.seat = 1;
    U.seats = [1];
    U.screen = 'lobby';
    N.status = 'Joined. Waiting for the host to start…';
    // a guest's screen keeps no save of its own: the game lives on the host's
    N.realSave = N.realSave || T.saveRun;
    T.saveRun = () => true;
    U.render();
    unsubs.push(gameDoc().onSnapshot((s) => s.exists && N.receive(s.data())));
  };

  /** A guest takes in the state the host wrote. */
  N.receive = function (d) {
    if (!d || !d.run || d.rev <= N.rev) {
      if (d && d.names) N.names = d.names.map(String);
      return;
    }
    N.rev = d.rev;
    N.names = (d.names || N.names).map(String);
    const before = U.run;
    const run = T.deserializeRun(d.run);
    if (run.mission) run.mission.fx = JSON.parse(d.fx || '[]');
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
    // what came of this screen's own commands
    const res = JSON.parse(d.results || '{}');
    for (const [id, r] of Object.entries(res)) {
      if (!sent.has(id)) continue;
      sent.delete(id);
      if (!r.ok && r.why) U.toast(esc(r.why));
      else if (r.ctx && U.screen === 'mission' && U.ms && U.ms.mode === 'idle') U.followUp(r.ctx);
    }
    if (sameMission) U.updateMission();
    else U.render();
  };

  function refresh() {
    if (U.screen === 'mission' && U.ms && U.ms.built) U.updateMission();
    else U.render();
  }

  N.leave = function () {
    stop();
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
    return `<div class="net-pick"><span class="dim small">Play online</span>
      <input id="netName" placeholder="Your name" maxlength="24">
      <button class="sm" data-act="netHost">Host a game</button>
      <input id="netCode" placeholder="CODE" maxlength="4" style="width:5em;text-transform:uppercase">
      <button class="sm" data-act="netJoin">Join</button>
      <div class="mute small">Two players, two screens: each flies one pilot. Share the game's code with your partner; they need edit access to this page.</div></div>`;
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
