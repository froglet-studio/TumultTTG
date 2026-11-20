/* ============================================================================
   TUMULT — AI SEATS: a seat at the table that an AI plays (pure; no DOM).
   A seat is played by a person or, when nobody is in it, by an AI (Shombith, 2026-11-20):
     'fill'  a seat the host asked the AI to fill when the table was made. It flies a pre-made pilot.
             A newcomer who joins on the route takes the seat over, pilot and all.
     'hold'  a player who dropped: the AI flies their pilot until they come back, and gives it back as
             it found it, between two of its actions.
   It is the same rule at a table: anyone may push a missing friend's pilot, and they play it safe.
   The AI is the look-ahead player (src/engine/lookahead.js), told to move only that seat's pilots.

   When the AI plays, in a sentence a table can follow: AI pilots move once every person has had their
   turn this round (or, in rounds played all at once, once everyone else has ended); an AI holding a
   dropped player's seat in the middle of their turn finishes it at once. Between missions it takes the
   first trait it is offered that needs no exchange (else the crystals), the first boon, and spends its
   points as the simulated players do (T.autoAllocate).

   The seat's kind is plain data on the party (`party.players[s].ai`, false when a person plays it),
   so it is saved, sent to every screen and loaded back like the rest of the run.
   ========================================================================== */
(function (T) {
  T.BOT_KINDS = ['fill', 'hold'];
  /** How the AI is in seat s: 'fill', 'hold', or null when a person plays it. */
  T.botKind = (run, s) => {
    const p = run.party && run.party.players[s];
    return p && T.BOT_KINDS.includes(p.ai) ? p.ai : null;
  };
  T.isBot = (run, s) => !!T.botKind(run, s);
  /** The seats the AI plays now. */
  T.botSeats = (run) => (run.party ? run.party.players.map((x, s) => s).filter((s) => T.isBot(run, s)) : []);
  /** The name an AI seat goes by: its pilot's, once it has one. */
  T.botName = (pilot) => 'AI · ' + (pilot ? pilot.name : 'pilot');

  /**
   * Fill the party's empty seats with the AI, up to `seats` players in all (never past MAX_PLAYERS).
   * Call it on a new party, before the draft: each new seat is dealt a pilot as T.newParty deals them.
   */
  T.fillSeats = function (run, seats) {
    const p = run.party;
    if (!p) return 0;
    const want = Math.max(0, Math.min(T.MAX_PLAYERS, seats | 0));
    let added = 0;
    while (p.players.length < want) {
      p.players.push({ name: T.botName(null), ai: 'fill' });
      p.ready.push(false);
      added++;
    }
    if (added) {
      // deal the pilots again for the new number of players: pilot i to seat i mod n, as T.newParty does
      const n = p.players.length;
      p.owner = Array.from({ length: T.pilotsFor(n) }, (x, i) => i % n);
    }
    return added;
  };

  /** A pre-made pilot for an AI seat: one the squad is not flying yet, chosen from a stream of its own. */
  function botPilot(run) {
    const flying = new Set(run.heroes.filter(Boolean).map((h) => h.name));
    const free = T.PREBUILTS.filter((pb) => !flying.has(pb.name));
    const pb = T.runStream(run, 'bot').pick(free.length ? free : T.PREBUILTS);
    const h = T.heroFromPrebuilt(run, pb);
    T.autoAllocate(h);
    if (run.heroes.some((x) => x && x.id === h.id)) h.id += '_ai';
    return h;
  }
  /**
   * Give every AI seat the pilots it is owed: while the squad is drafted, or on the route for a seat that
   * joined there. Returns how many it made.
   */
  T.botPilots = function (run) {
    const p = run.party;
    if (!p) return 0;
    const late = run.phase === 'map';
    if (run.phase !== 'draft' && !late) return 0;
    let made = 0;
    p.owner.forEach((s, i) => {
      if (run.heroes[i] || !T.isBot(run, s)) return;
      const h = botPilot(run);
      if (late) T.joinPilot(run, i, h);
      else run.heroes[i] = h;
      if (T.botKind(run, s) === 'fill') p.players[s].name = T.botName(h);
      made++;
    });
    return made;
  };

  /**
   * A dropped player's seat: the AI holds it (`hold`) until they come back (T.releaseSeat). A seat the AI
   * already fills stays filled.
   */
  T.holdSeat = function (run, s) {
    const pl = run.party && run.party.players[s];
    if (!pl || s === 0 || pl.ai === 'fill') return false;
    pl.ai = 'hold';
    return true;
  };
  /** The player is back: the seat is theirs again. */
  T.releaseSeat = function (run, s) {
    const pl = run.party && run.party.players[s];
    if (!pl || pl.ai !== 'hold') return false;
    pl.ai = false;
    return true;
  };
  /**
   * A person takes over seat s, which the AI fills (a newcomer at the table, at any time), pilot and all.
   */
  T.takeOverSeat = function (run, s, name) {
    if (T.botKind(run, s) !== 'fill') return false;
    run.party.players[s] = { name: name || 'Player ' + (s + 1), ai: false };
    return true;
  };

  /* ───────────── in a mission ───────────── */
  const standing = (run, s) => T.heroesOf(run, s).filter((i) => run.mission.heroes[i] && !run.mission.heroes[i].downed);
  /**
   * May the AI in seat s play now? In a hero phase, when the seat still has a turn this round, and every
   * person has had theirs (or the seat's own turn is under way: a dropped player's, mid-turn).
   */
  T.botMayPlay = function (run, s) {
    const m = run.mission;
    const p = run.party;
    if (!T.isBot(run, s) || !m || m.over || m.phase !== 'hero' || p.players.length < 2) return false;
    if (!standing(run, s).length) return false;
    const live = T.liveRounds(run);
    const left = live ? T.seatsPlaying(run) : T.seatsToPlay(run);
    if (!left.includes(s)) return false;
    if (!live && p.active != null && left.includes(p.active)) return p.active === s;
    return left.every((x) => T.isBot(run, x));
  };
  /**
   * The AI in seat s takes its turn: the look-ahead player moves that seat's pilots and nothing else, then
   * the turn ends as a person's would (T.execCommand 'ready'). Returns the actions it took, or null if it
   * may not play now.
   */
  T.botTurn = function (run, s, opts) {
    if (!T.botMayPlay(run, s)) return null;
    const m = run.mission;
    if (!T.liveRounds(run)) run.party.active = s; // its turn begins, as acting for a pilot begins a person's
    const taken = T.smartHeroPhase(m, Object.assign({ only: T.heroesOf(run, s) }, opts));
    if (!m.over && m.phase === 'hero') T.execCommand(run, { op: 'ready', seat: s }, [s]);
    return taken;
  };

  /* ───────────── between missions ───────────── */
  /** The AI seats choose their pilots' upgrades: the first trait that needs no exchange, the first boon. */
  T.botRewards = function (run) {
    const rw = run.lastReward;
    if (run.phase !== 'reward' || !rw || rw.lifeline) return 0;
    let n = 0;
    run.heroes.forEach((h, i) => {
      if (!h || !T.isBot(run, T.ownerOf(run, i))) return;
      if (!rw.picked[i]) {
        const c = rw.offers[i].find((id) => !T.isSwapOffer(run, i, id));
        if (c) T.takeOfferedCard(run, c, i);
        else T.skipOfferedCard(run, i);
        n++;
      }
      if (rw.boons && !rw.boonPicked[i]) {
        T.takeBoon(run, rw.boons[i][0], i);
        n++;
      }
      const spare = h.upUnspent;
      if (spare > 0) {
        T.autoAllocate(h);
        if (h.upUnspent !== spare) n++;
      }
    });
    return n;
  };

  /**
   * Whatever the AI seats owe the table now, done: pilots to draft, upgrades to choose, turns to take.
   * The host's screen calls it after every change. Returns how many things it did (0: nothing was due).
   */
  T.botStep = function (run, opts) {
    if (!run || !T.botSeats(run).length) return 0;
    let n = T.botPilots(run) + T.botRewards(run);
    for (let guard = 0; guard < 2 * T.MAX_PLAYERS && run.mission; guard++) {
      const s = T.botSeats(run).find((x) => T.botMayPlay(run, x));
      if (s == null) break;
      T.botTurn(run, s, opts);
      n++;
    }
    return n;
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
