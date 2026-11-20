/* ============================================================================
   TUMULT — HOW PLAYERS PLAY (anonymous play data).
   Watches the screens and names what happened as events: a visit, the tutorial, a run and
   its draft, each mission's start and end (outcome, rounds, the card faces played), a run's
   end, a pilot saved. The event list and every field are in docs/analytics/EVENT_SCHEMA.json;
   docs/reference/ANALYTICS.md says what is sent, where, and what is never sent.

   Nothing here touches the network. Each event goes to T.Backend's 'analytics' capability;
   only the web version registers a provider for it (src/web/analytics.js), so the offline file
   and the playtest page record nothing. A player who turns it off on the title screen, or whose
   browser asks sites not to track (Global Privacy Control, Do Not Track), sends nothing.

   Never sent: names a player typed (a pilot's name, canon notes), the save, an IP address, an
   account. The player is a random id made on this device.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const TL = (T.Telemetry = T.Telemetry || {});
  const KEY = 'tumult_v2_anon';
  const SCHEMA_VERSION = 1;

  /* ───────────── this device's anonymous record ───────────── */
  // { id, first, visits, runs, missions, off, cur }: cur is the mission being played, so that a
  // mission resumed from a save keeps counting the faces it had already played.
  let rec = null;
  function load() {
    if (rec) return rec;
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch (e) {}
    rec = saved && typeof saved === 'object' && typeof saved.id === 'string' ? saved : null;
    TL.firstVisit = !rec;
    if (!rec) rec = { id: newId(), first: Date.now(), visits: 0, runs: 0, missions: 0, off: false, cur: null };
    return rec;
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(rec));
    } catch (e) {}
  }
  function newId() {
    const b = new Uint8Array(12);
    const c = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto : null;
    if (c) c.getRandomValues(b);
    else for (let i = 0; i < b.length; i++) b[i] = (Date.now() * (i + 7) + performance.now() * 997) & 255;
    return 't_' + Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  }

  /** The browser asks sites not to track: honoured, whatever the toggle says. */
  const browserSaysNo = () =>
    typeof navigator !== 'undefined' &&
    (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes');
  /** Will an event be sent now? (A provider exists, the player has not turned it off, the browser allows it.) */
  TL.on = () => !!(T.Backend && T.Backend.available('analytics')) && !load().off && !browserSaysNo();
  TL.id = () => load().id;

  /** Send one event (a name from EVENT_SCHEMA.json and its fields). Quiet when there is nowhere to send it. */
  TL.track = function (event, props) {
    if (!TL.on()) return;
    const body = Object.assign({}, props, { schema_version: SCHEMA_VERSION, timestamp_utc_ms: Date.now() });
    T.Backend.use('analytics').then(
      (a) => a && a.track(event, body),
      () => {},
    );
  };
  /** Turn sending on or off for this device (the title screen's line). */
  TL.setOff = function (off) {
    load().off = !!off;
    save();
  };

  /* ───────────── the visit ───────────── */
  const started = Date.now();
  let missionsThisVisit = 0;
  function sessionStart() {
    const r = load();
    const first = TL.firstVisit;
    r.visits++;
    save();
    const ref = (() => {
      try {
        if (!document.referrer) return 'direct';
        const h = new URL(document.referrer).hostname;
        if (h === location.hostname) return 'self';
        return /(^|\.)froglet\.(games|studio)$/.test(h) ? h : 'other';
      } catch (e) {
        return 'other';
      }
    })();
    TL.track('session_started', {
      first_visit: first,
      visit: r.visits,
      days_since_first: Math.floor((Date.now() - r.first) / 86400000),
      runs_before: r.runs,
      missions_before: r.missions,
      has_save: !!(T.loadRun && T.loadRun()),
      referrer: ref,
    });
  }
  function sessionEnd() {
    const run = U.run;
    const m = run && run.mission;
    TL.track('session_ended', {
      seconds: Math.round((Date.now() - started) / 1000),
      screen: U.screen || 'title',
      missions_ended: missionsThisVisit,
      mission_round: U.screen === 'mission' && m && !m.over ? m.round : null,
    });
    if (T.Backend && TL.on())
      T.Backend.use('analytics').then(
        (a) => a && a.flush && a.flush(true),
        () => {},
      );
  }

  /* ───────────── pilots, as data that names no player ───────────── */
  // A pre-made pilot is game content and goes by its id; a pilot a player made is 'made'.
  function pilot(h) {
    const pb = (T.PREBUILTS || []).find((p) => p.name === h.name && String(h.id).startsWith(p.id + '_'));
    return {
      pilot: pb ? pb.id : 'made',
      clades: (h.species || []).slice(),
      cards: (h.cards || []).length,
    };
  }

  /* ───────────── one mission ───────────── */
  // A mission is named by its run's seed and how many missions the run had launched. Faces, gear and
  // moves are counted per mission; a take-back removes the last count it undid.
  const missionKey = (run) => run.seed + ':' + run.launched;
  const outcomeOf = (m) => (m.won ? 'won' : 'lost');
  function cur(run) {
    const r = load();
    const k = missionKey(run);
    if (!r.cur || r.cur.k !== k)
      r.cur = {
        k,
        t0: Date.now(),
        faces: {},
        P: 0,
        E: 0,
        E0: 0,
        gear: 0,
        basic: 0,
        items: 0,
        walks: 0,
        takeBacks: 0,
        stack: [],
        reported: false,
      };
    return r.cur;
  }
  function missionBase(run, m) {
    return {
      match_id: missionKey(run),
      archetype: m.archetype,
      tier: m.tier,
      boss: !!m.isBoss,
      mission_number: run.stats ? run.stats.missions + 1 : 1,
      tide: run.tide || null,
      quick: !!run.quick,
      players: T.playerCount ? T.playerCount(run) : 1,
      squad: m.heroes.map(pilot),
    };
  }
  function missionStarted(run) {
    const m = run.mission;
    if (!m) return;
    const r = load();
    const fresh = !r.cur || r.cur.k !== missionKey(run);
    const c = cur(run);
    save();
    if (!fresh) return; // the same mission again (resumed from a save, or the screen re-entered)
    TL.track('mission_started', Object.assign(missionBase(run, m), { first_mission: r.missions === 0 }));
    c.t0 = Date.now();
  }
  function missionEnded(run) {
    const m = run && run.mission;
    if (!m || !m.over) return;
    const c = cur(run);
    if (c.reported) return;
    c.reported = true;
    const r = load();
    r.missions++;
    missionsThisVisit++;
    save();
    TL.track(
      'mission_ended',
      Object.assign(missionBase(run, m), {
        outcome: outcomeOf(m),
        rounds: m.round,
        seconds: Math.round((Date.now() - c.t0) / 1000),
        kills: m.stats ? m.stats.kills : 0,
        hp: m.heroes.map((h) => Math.max(0, h.hp)),
        max_hp: m.heroes.map((h) => h.maxHp),
        downed: m.heroes.filter((h) => h.downed || h.hp <= 0).length,
        bonus_achieved: (m.bonus || []).filter((b) => b.achieved).length,
        bonus_total: (m.bonus || []).length,
        faces_physical: c.P,
        faces_ethereal: c.E,
        faces_ethereal_at_e0: c.E0,
        faces: c.faces,
        gear_uses: c.gear,
        basic_uses: c.basic,
        items_used: c.items,
        walks: c.walks,
        take_backs: c.takeBacks,
        first_mission: r.missions === 1,
      }),
    );
  }
  function missionLeft(run) {
    const m = run && run.mission;
    if (!m || m.over) return;
    TL.track(
      'mission_left',
      Object.assign(missionBase(run, m), { round: m.round, seconds: Math.round((Date.now() - cur(run).t0) / 1000) }),
    );
    save();
  }
  /** Count a command the player made in a mission (src/engine/party.js HERO_OPS). */
  function counted(run, cmd, res) {
    const m = run && run.mission;
    if (!m || !cmd || !res || res.ok === false) return;
    const c = cur(run);
    const op = cmd.op;
    let undo = null;
    if (op === 'face') {
      const k = cmd.card + ':' + cmd.fk;
      c.faces[k] = (c.faces[k] || 0) + 1;
      c[cmd.fk === 'E' ? 'E' : 'P']++;
      const h = m.heroes[cmd.hero];
      const e0 = cmd.fk === 'E' && h && T.heroE && T.heroE(h, cmd.card) === 0;
      if (e0) c.E0++;
      undo = { face: k, fk: cmd.fk === 'E' ? 'E' : 'P', e0 };
    } else if (op === 'gear') undo = (c.gear++, { n: 'gear' });
    else if (op === 'basic') undo = (c.basic++, { n: 'basic' });
    else if (op === 'item') undo = (c.items++, { n: 'items' });
    else if (op === 'walk') undo = (c.walks++, { n: 'walks' });
    if (undo) {
      c.stack.push(undo);
      if (c.stack.length > 40) c.stack.shift();
    }
    if (res.ended) c.stack = []; // a round's end cannot be taken back
    save();
  }
  function tookBack(run) {
    const c = cur(run);
    const u = c.stack.pop();
    c.takeBacks++;
    if (u && u.face) {
      c.faces[u.face] = Math.max(0, (c.faces[u.face] || 0) - 1);
      if (!c.faces[u.face]) delete c.faces[u.face];
      c[u.fk] = Math.max(0, c[u.fk] - 1);
      if (u.e0) c.E0 = Math.max(0, c.E0 - 1);
    } else if (u && u.n) c[u.n] = Math.max(0, c[u.n] - 1);
    save();
  }

  /* ───────────── watching the screens ───────────── */
  // Wrapped once the screens exist (this file loads after them); each wrapper calls the original first.
  function wrap(obj, name, after, before) {
    const real = obj[name];
    if (typeof real !== 'function') return;
    obj[name] = function () {
      const pre = before ? before.apply(this, arguments) : undefined;
      const r = real.apply(this, arguments);
      try {
        after.call(this, r, arguments, pre);
      } catch (e) {}
      return r;
    };
  }
  function install() {
    wrap(U, 'startDraft', () => {
      const r = load();
      TL.track('run_started', {
        first_run: r.runs === 0,
        runs_before: r.runs,
        tide: U.run && U.run.tide,
        play_now: !!U.playingNow,
      });
      r.runs++;
      save();
    });
    wrap(T, 'startMap', (res, args) => {
      const run = args[0];
      if (!run || run !== U.run || run.quick) return;
      TL.track('draft_completed', {
        squad: run.heroes.filter(Boolean).map(pilot),
        tide: run.tide,
        players: T.playerCount ? T.playerCount(run) : 1,
      });
    });
    wrap(
      U,
      'showTutorial',
      (res, args, before) => {
        if (U.tut === args[0] && before !== args[0]) TL.track('tutorial_shown', { key: String(args[0]) });
      },
      () => U.tut,
    );
    wrap(U, 'enterMission', () => U.run && missionStarted(U.run));
    wrap(U, 'exec', (res, args) => {
      if (!U.run || !res) return;
      counted(U.run, args[0], res);
      missionEnded(U.run);
    });
    wrap(
      U,
      'handleMissionAct',
      (res, args, before) => {
        if (args[0] === 'undo' && U.run && U.ms && U.ms.undo.length < before) tookBack(U.run);
      },
      (act) => (act === 'undo' && U.ms ? U.ms.undo.length : 0),
    );
    let lastScreen = null;
    wrap(U, 'render', () => {
      const run = U.run;
      if (run && run.mission) missionEnded(run);
      if (lastScreen === 'mission' && U.screen === 'title' && run) missionLeft(run);
      lastScreen = U.screen;
    });
    wrap(U, 'finishRunMeta', () => {
      const run = U.run;
      if (!run) return;
      TL.track('run_ended', {
        outcome: run.won ? 'won' : 'lost',
        missions: run.stats.missions,
        missions_won: (run.history || []).filter((x) => x.won).length,
        rounds: run.stats.rounds,
        kills: run.stats.kills,
        lifeline_used: !!run.stats.lifelineUsed,
        tide: run.tide || null,
        squad: run.heroes.filter(Boolean).map(pilot),
      });
    });
    wrap(T, 'keepMade', (kept) => {
      if (kept) TL.track('pilot_saved', { clades: kept.species.slice(), cards: kept.cards.length });
    });
  }

  /* ───────────── the title screen's line ───────────── */
  U.privacyLine = function () {
    if (!(T.Backend && T.Backend.available('analytics'))) return '';
    if (browserSaysNo())
      return `<p class="dim small privacy-line">Your browser asks sites not to track, so Tumult sends no play data.</p>`;
    const off = load().off;
    return `<p class="dim small privacy-line">${
      off
        ? 'Anonymous play data is off.'
        : 'Tumult sends anonymous play data (missions, rounds, cards played) to Froglet, to make the game better. No names, no account.'
    } <button class="link sm ghost" data-act="analyticsToggle">${off ? 'Turn it on' : 'Turn it off'}</button></p>`;
  };
  const prevExtra = U.extraAct;
  U.extraAct = function (act, arg, el, e) {
    if (act === 'analyticsToggle') {
      const off = !load().off;
      if (off) TL.track('analytics_turned_off', {});
      TL.setOff(off);
      if (!off) TL.track('analytics_turned_on', {});
      U.render();
      return true;
    }
    return prevExtra ? prevExtra(act, arg, el, e) : false;
  };

  /* ───────────── start ───────────── */
  let errors = 0;
  // The screens are watched from the moment this file loads (they are all defined above it), so no
  // click can come before the watching does; the visit itself is counted once the page is up.
  install();
  TL.start = function () {
    if (TL.started) return;
    TL.started = true;
    if (typeof window === 'undefined') return;
    sessionStart();
    window.addEventListener('pagehide', sessionEnd);
    window.addEventListener('error', (ev) => {
      if (++errors > 5) return;
      const file = String(ev.filename || '')
        .split('/')
        .pop()
        .replace(/\.[0-9a-f]{10}\./, '.');
      TL.track('client_exception', {
        message: String(ev.message || '').slice(0, 200),
        where: file ? `${file}:${ev.lineno || 0}` : '',
        screen: U.screen || null,
      });
    });
  };
  TL._test = { load, missionKey, pilot, reset: () => ((rec = null), (missionsThisVisit = 0)) };

  // The browser starts it once the page has its screens; Node tools and tests call T.Telemetry.start() when they want it.
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.TUMULT_NO_TELEMETRY) {
    // after the whole script has run, so the web version's provider (registered further down) is in place
    if (document.readyState === 'loading')
      window.addEventListener('DOMContentLoaded', () => setTimeout(() => TL.start(), 0));
    else setTimeout(() => TL.start(), 0);
  }
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
