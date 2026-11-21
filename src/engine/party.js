/* ============================================================================
   TUMULT — PARTY: who plays which pilot (pure; no DOM).
   A run has one to MAX_PLAYERS players. Each hero belongs to one player (its seat);
   one player may hold several. The rules do not change with the number of players:
   the same squad meets the same missions. What changes is who may act for whom, and
   and how a round is shared out: players take turns, in the order they choose, or all
   play at once (T.ROUND_MODES); the round's enemy turn comes once every player is done.
   Seat 0 is the host: it makes the squad's shared choices (route, events, havens).
   ========================================================================== */
(function (T) {
  T.MAX_PLAYERS = 5; // Garrett, 2026-11-20 (2 until 2.76)

  /** How many pilots a party of n players flies: two at least (one player flies both), else one each. */
  T.pilotsFor = (n) => Math.max(2, n | 0);
  /** A new party: n players; its pilots (T.pilotsFor) are dealt to seats in turn (pilot i → seat i mod n). */
  T.newParty = function (n, names) {
    n = Math.max(1, Math.min(T.MAX_PLAYERS, n | 0 || 1));
    const players = [];
    for (let i = 0; i < n; i++) players.push({ name: (names && names[i]) || 'Player ' + (i + 1) });
    const owner = [];
    for (let i = 0; i < T.pilotsFor(n); i++) owner.push(i % n);
    return { players, owner, ready: players.map(() => false), active: null, rounds: 'turns' };
  };
  /**
   * Two ways to play a round with friends (2.81; Garrett, 2026-11-20). 'turns': players take turns in the order
   * they choose, and each rolls their next dice as their turn ends. 'live': nobody takes turns; every player
   * spends their AP whenever they like, in whatever order they agree at the table, and everyone rolls together
   * when the round begins ("we do all roll together at the end of the round and players can all play in real
   * time without taking turns"). The host's screen carries out every command one at a time, so two players
   * acting at once are simply taken in the order they arrive.
   */
  T.ROUND_MODES = ['turns', 'live'];
  T.liveRounds = (run) => !!(run.party && run.party.rounds === 'live');
  /**
   * A player joins an expedition already under way (2.79; Garrett, 2026-11-20: "is there a way the two players
   * mid game could save their game, we update, and then I join in?"). Only on the route, between missions,
   * and never past MAX_PLAYERS. With two players or more the newcomer brings a pilot of its own, drafted or
   * made, which joins with T.joinPilot; a lone player's second pilot passes to the newcomer instead.
   */
  T.canAddPlayer = (run) =>
    !!run.party && run.phase === 'map' && !run.over && run.party.players.length < T.MAX_PLAYERS && T.squadReady(run);
  T.addPlayer = function (run, name) {
    if (!T.canAddPlayer(run)) return { ok: false, why: 'not now' };
    const p = run.party;
    const seat = p.players.length;
    p.players.push({ name: name || 'Player ' + (seat + 1) });
    p.ready.push(false);
    if (p.active === undefined) p.active = null;
    if (run.purses) run.purses.push(Math.min(...run.purses)); // a purse as full as the emptiest
    let hero = p.owner.indexOf(0, 1); // a lone player's second pilot, when there is one
    if (seat === 1 && hero > 0) p.owner[hero] = 1;
    else {
      hero = p.owner.length;
      p.owner.push(seat);
    }
    return { ok: true, seat, hero };
  };
  /** Has every seat its pilot? The route waits for a pilot still being drafted. */
  T.squadReady = (run) => {
    // every seat counted, holes too: every() skips a hole, so a guest's pilot arriving before the host's
    // once set out a squad with the host's pilot missing (2.74–2.79.0)
    const n = Math.max(run.party ? run.party.owner.length : 2, run.heroes.length);
    for (let i = 0; i < n; i++) if (!run.heroes[i]) return false;
    return true;
  };
  /**
   * A late pilot catches up with the least grown: it gets as many spare points as the least-grown pilot
   * already flying has grown past it (T.pilotPower). Its level, which scales missions, is the one it came with.
   */
  T.joinPilot = function (run, i, h) {
    const others = run.heroes.filter((x, j) => x && j !== i);
    const behind = others.length ? Math.min(...others.map(T.pilotPower)) - T.pilotPower(h) : 0;
    if (behind > 0) h.upUnspent = (h.upUnspent || 0) + behind;
    if (h.level == null) h.level = 1;
    run.heroes[i] = h;
    return { ok: true, caughtUp: Math.max(0, behind) };
  };
  /** The seat that plays hero i. */
  T.ownerOf = (run, i) => (run.party ? run.party.owner[i] || 0 : 0);
  T.playerCount = (run) => (run.party ? run.party.players.length : 1);
  T.ownerName = (run, i) => (run.party ? run.party.players[T.ownerOf(run, i)].name : '');
  /** The heroes a seat plays. */
  T.heroesOf = (run, seat) => run.heroes.map((h, i) => i).filter((i) => T.ownerOf(run, i) === seat);

  /* ───────────── purses: each player's own crystals ───────────── */
  /**
   * Omnicrystals belong to the players: one purse a seat (`run.purses`, and `m.purses` while a mission lasts),
   * so one player keeps one purse for both pilots, and two players keep one each (Garrett, 2026-11-15).
   * A pilot buys, sells and fuels gear from its own player's purse. What the squad earns together is shared
   * out evenly, and what the squad pays together comes from the fullest purse first.
   */
  /** n crystals shared among k purses: evenly, the odd ones to the first seats. */
  T.splitCrystals = (n, k) => {
    k = Math.max(1, k | 0);
    n = Math.max(0, n | 0);
    return Array.from({ length: k }, (x, s) => Math.floor(n / k) + (s < n % k ? 1 : 0));
  };
  /** The seat whose purse pays for hero i: in a mission, the seat it was dealt at launch. */
  T.purseSeat = (x, i) => {
    const owner = x.party ? x.party.owner : x.owner;
    const s = owner ? owner[i] || 0 : 0;
    return s < x.purses.length ? s : 0;
  };
  /** The crystals hero i may spend (its player's purse); in a mission, pass the mission. */
  T.crystalsFor = (x, i) => x.purses[T.purseSeat(x, i)];
  /** All the crystals there are, every purse together. */
  T.totalCrystals = (x) => (x.purses ? x.purses.reduce((a, b) => a + b, 0) : x.crystals || 0);
  /** The squad earns n crystals together: shared out evenly, the odd ones to the emptiest purses. */
  T.gainShared = function (x, n) {
    n = Math.max(0, n | 0);
    const k = x.purses.length;
    for (let s = 0; s < k; s++) x.purses[s] += Math.floor(n / k);
    for (let r = 0; r < n % k; r++) {
      let s = 0;
      x.purses.forEach((v, j) => {
        if (v < x.purses[s]) s = j;
      });
      x.purses[s]++;
    }
  };
  /** The squad pays n crystals together, a crystal at a time from the fullest purse. False if all of them can't. */
  T.payShared = function (x, n) {
    if (T.totalCrystals(x) < n) return false;
    for (let k = 0; k < n; k++) {
      let s = 0;
      x.purses.forEach((v, j) => {
        if (v > x.purses[s]) s = j;
      });
      x.purses[s]--;
    }
    return true;
  };
  /**
   * Before the route opens, the starting crystals (`run.crystals`, set while the squad is drafted, or by the
   * tools) become the players' purses. Called by T.startMap and T.launchMission; a run already settled is left
   * as it is unless something has set `run.crystals` again (a tool giving a squad its kit for a tier).
   */
  T.settlePurses = function (run) {
    if (typeof run.crystals !== 'number') return;
    run.purses = T.splitCrystals(run.crystals, T.playerCount(run));
    delete run.crystals;
  };

  /**
   * May a screen holding these seats act for hero i? `seats` null means every seat is here
   * (one player, or players passing one screen round).
   */
  T.mayActFor = (run, seats, i) => !seats || seats.includes(T.ownerOf(run, i));
  /** May a screen holding these seats make the squad's shared choices? Only the host's can. */
  T.mayLead = (run, seats) => !seats || seats.includes(0);

  /**
   * Mark these seats ready to end the round. Returns true when every player is ready: the
   * caller then ends the hero phase and calls T.clearReady.
   */
  T.setReady = function (run, seats, on) {
    const p = run.party;
    if (!p) return true;
    p.players.forEach((pl, s) => {
      if (!seats || seats.includes(s)) p.ready[s] = on !== false;
    });
    return p.ready.every(Boolean);
  };
  T.clearReady = function (run) {
    if (!run.party) return;
    run.party.ready = run.party.players.map(() => false);
    run.party.active = null;
  };

  /**
   * Players take turns, in the order they choose each round (Garrett, 2026-11-20: "players should take turns in
   * the order of their choice each round"). A player begins their turn by acting for one of their pilots;
   * while that turn lasts nobody else acts (so a duo power stays the acting player's to plan), and ending it
   * leaves the next turn open to whoever has not had one. party.ready marks the players who have had their
   * turn this round, party.active the one taking it now. A player whose pilots are all down has no turn.
   */
  const turnsApply = (run) => {
    const m = run.mission;
    const p = run.party;
    return !!(p && p.players.length >= 2 && p.rounds !== 'live' && m && !m.over && m.phase === 'hero');
  };
  /**
   * In live rounds, the seats that still play this round: not yet ready, with a pilot standing. The round ends
   * once there are none.
   */
  T.seatsPlaying = function (run) {
    const m = run.mission;
    const p = run.party;
    if (!p || !m) return [];
    return p.players
      .map((x, s) => s)
      .filter((s) => !p.ready[s] && T.heroesOf(run, s).some((i) => m.heroes[i] && !m.heroes[i].downed));
  };
  /** Seats that still have a turn to take this round. */
  T.seatsToPlay = function (run) {
    if (!turnsApply(run)) return [];
    const m = run.mission;
    const p = run.party;
    return p.players
      .map((x, s) => s)
      .filter((s) => !p.ready[s] && T.heroesOf(run, s).some((i) => m.heroes[i] && !m.heroes[i].downed));
  };
  /**
   * Whose turn it is: the seat taking it now, or the only one left to take one. Null when the next turn is
   * open to choose (T.turnOpen), or when turns do not apply (one player, or no hero phase under way).
   */
  T.turnSeat = function (run) {
    if (!turnsApply(run)) return null;
    const left = T.seatsToPlay(run);
    const a = run.party.active;
    if (a != null && left.includes(a)) return a;
    return left.length === 1 ? left[0] : null;
  };
  /** Is the next turn open: several players still to take one, and none of them begun? */
  T.turnOpen = (run) => turnsApply(run) && T.turnSeat(run) == null && T.seatsToPlay(run).length > 1;
  /**
   * End a player's turn: they have had it this round, and their standing pilots roll the next round's dice
   * at once (Garrett, 2026-11-20: "each player should roll their dice as soon as they end their turn"), so
   * they can plan while the others play. Returns true when every player has had their turn.
   */
  function endTurn(run, seat) {
    const m = run.mission;
    run.party.ready[seat] = true;
    run.party.active = null;
    for (const i of T.heroesOf(run, seat)) T.rollAhead(m, m.heroes[i]);
    return T.seatsToPlay(run).length === 0;
  }

  /* ───────────── commands: every change a player makes, as data ───────────── */
  /**
   * A command is one thing a player does, as plain data: { op, hero, … }. Every screen changes
   * the run only through T.execCommand, so a command made on one screen can be carried out on
   * another (the host's, when players are on separate screens) with the same result. `seats`
   * are the seats of the player who made it (null: all); a command for someone else's pilot,
   * or a shared choice by a player who is not the host, is refused.
   * Returns { ok, why?, ctx? }: ctx carries what a card face asks of its player next
   * (pendingReroll: pick that many banked dice; pendingFreeMove: a free walk of that many nodes).
   */
  const HERO_OPS = {
    // in a mission
    face: (run, m, h, c) => T.playFace(m, h, c.card, c.fk, c.ctx),
    basic: (run, m, h, c) => T.useBasic(m, h, c.id, c.ctx),
    gear: (run, m, h, c) => T.useGear(m, h, c.gi, c.ai, c.ctx),
    item: (run, m, h, c) => T.useConsumable(m, h, c.ci),
    interact: (run, m, h, c) => T.doInteract(m, h, c.node, false, c.pay),
    rally: (run, m, h) => T.rally(m, h),
    heel: (run, m, h, c) => T.heel(m, h, c.pet, c.node),
    note: (run, m, h, c) => T.addNote(m, c.hero, c.text),
    rollPick: (run, m, h, c) => T.setRollPick(h, c.kinds),
    valve: (run, m, h) => ({ ok: !!T.valve(m, h) }),
    dump: (run, m, h, c) => (T.dump(m, h, c.di), { ok: true }),
    reroll: (run, m, h, c) => (c.picked.length && T.rerollHeld(m, h, c.picked), { ok: true }),
    walk: (run, m, h, c) => {
      if (!c.free) return T.walk(m, h, c.node);
      h.freeMove = c.free;
      const r = T.walk(m, h, c.node);
      h.freeMove = 0;
      return r;
    },
    // in a vehicle (src/engine/vehicles.js)
    board: (run, m, h, c) => T.board(m, h, c.vehicle),
    leave: (run, m, h, c) => T.leave(m, h, c.node),
    drive: (run, m, h, c) => T.drive(m, h, c.node),
    vcard: (run, m, h, c) => T.useVehicleCard(m, h, c.id, c.ctx),
    // between missions
    pickVehicle: (run, m, h, c) => T.pickVehicle(run, c.hero, c.vehicle),
    adjustUp: (run, m, h, c) => T.adjustUp(h, c.card, c.which, c.delta),
    autoUp: (run, m, h) => (T.autoAllocate(h), { ok: true }),
    sellGear: (run, m, h, c) => (T.sellGear(run, c.hero, c.gi), { ok: true }),
    loadCard: (run, m, h, c) => T.changeLoadout(run, c.hero, c.card, typeof c.out === 'string' ? c.out : null),
    takeCard: (run, m, h, c) => T.takeOfferedCard(run, c.card, c.hero, typeof c.drop === 'string' ? c.drop : undefined),
    skipCard: (run, m, h, c) => T.skipOfferedCard(run, c.hero),
    buyGear: (run, m, h, c) => T.buyGear(run, c.gear, c.hero),
    adoptPet: (run, m, h, c) => T.adoptPet(run, c.hero, typeof c.drop === 'string' ? c.drop : undefined),
    evTakeCard: (run, m, h, c) => {
      const r = T.addCard(h, c.card);
      if (r.ok && run.event && run.event.followup) run.event.followup.done = true;
      return r;
    },
  };
  const MISSION_OPS = new Set([
    'note',
    'face',
    'basic',
    'gear',
    'item',
    'interact',
    'rally',
    'heel',
    'valve',
    'dump',
    'reroll',
    'walk',
    'board',
    'leave',
    'drive',
    'vcard',
  ]);
  T.COMMAND_OPS = Object.keys(HERO_OPS).concat(['ready', 'addHero', 'rounds', 'setOut']);

  T.execCommand = function (run, cmd, seats) {
    const op = cmd && cmd.op;
    if (op === 'ready') {
      // the player whose turn it is ends it; once every player has had theirs, the round goes on
      const m = run.mission;
      if (!m || m.over || m.phase !== 'hero') return { ok: false, why: 'not now' };
      if (T.liveRounds(run) && T.playerCount(run) >= 2) {
        // live rounds: these seats are done (or, pressed again on a player's own screen, not done after all)
        const p = run.party;
        const mine = p.players.map((x, s) => s).filter((s) => !seats || seats.includes(s));
        if (seats && mine.every((s) => p.ready[s])) {
          mine.forEach((s) => (p.ready[s] = false));
          return { ok: true, unready: true };
        }
        mine.forEach((s) => (p.ready[s] = true));
        if (T.seatsPlaying(run).length) return { ok: true, waiting: true };
      } else if (turnsApply(run)) {
        // the turn under way ends; with none under way, a player ends their own turn without acting
        const turn = T.turnSeat(run);
        const left = T.seatsToPlay(run);
        let seat = turn;
        if (seat == null) {
          const mine = left.filter((s) => !seats || seats.includes(s));
          seat = cmd.seat != null && mine.includes(cmd.seat) ? cmd.seat : mine.length === 1 || seats ? mine[0] : null;
        }
        if (seat == null) return { ok: false, why: 'whose turn is that?' };
        if (seats && !seats.includes(seat)) return { ok: false, why: `It is ${run.party.players[seat].name}'s turn.` };
        if (!endTurn(run, seat)) return { ok: true, passed: true, to: T.turnSeat(run) };
      } else if (!T.setReady(run, seats)) return { ok: true, waiting: true };
      T.clearReady(run);
      T.endHeroPhase(m);
      m.heroes.forEach((x) => (x.freeMove = 0));
      return { ok: true, ended: true };
    }
    if (op === 'setOut') {
      // the squad has its vehicles: the mission begins (the host's call, as how rounds go is)
      if (run.phase !== 'garage') return { ok: false, why: 'not now' };
      if (run.party && !T.mayLead(run, seats)) return { ok: false, why: `${run.party.players[0].name} sets out.` };
      return T.leaveGarage(run);
    }
    if (op === 'rounds') {
      // how rounds go is the host's choice, and may change at any time; a turn under way is let go
      if (!run.party || !T.ROUND_MODES.includes(cmd.mode)) return { ok: false, why: 'no such way to play' };
      if (!T.mayLead(run, seats)) return { ok: false, why: `${run.party.players[0].name} chooses how rounds go.` };
      run.party.rounds = cmd.mode;
      run.party.active = null;
      return { ok: true };
    }
    if (op === 'addHero') {
      // a player's drafted pilot joins the squad in that player's place
      const i = cmd.hero;
      const late = run.phase === 'map' && run.party && i < run.party.owner.length;
      if ((run.phase !== 'draft' && !late) || !T.mayActFor(run, seats, i) || run.heroes[i])
        return { ok: false, why: 'not now' };
      const h = cmd.pilot;
      // two screens draft apart, so two ids could meet: the second one gives way
      if (run.heroes.some((x) => x && x.id === h.id)) h.id += '_' + i;
      if (late) return T.joinPilot(run, i, h);
      run.heroes[i] = h;
      return { ok: true };
    }
    const f = HERO_OPS[op];
    if (!f) return { ok: false, why: 'unknown command ' + op };
    if (!T.mayActFor(run, seats, cmd.hero)) return { ok: false, why: "that is another player's pilot" };
    const m = run.mission;
    // a line of story may be written any time in a mission, on another player's turn too (Garrett,
    // 2026-11-20: "we should be able to keep adding things during other players turns"): it changes nothing in play
    if (op === 'note') {
      if (!m || m.over) return { ok: false, why: 'not now' };
      return Object.assign({}, T.addNote(m, cmd.hero, cmd.text), { ctx: cmd.ctx || {} });
    }
    // choosing the dice of a pilot's next roll changes nothing on the board: any time in a mission, whoever's turn
    if (op === 'rollPick') {
      if (!m || m.over || !m.heroes[cmd.hero]) return { ok: false, why: 'not now' };
      return Object.assign({}, T.setRollPick(m.heroes[cmd.hero], cmd.kinds), { ctx: cmd.ctx || {} });
    }
    if (MISSION_OPS.has(op) && (!m || m.over || m.phase !== 'hero')) return { ok: false, why: 'not now' };
    const turn = MISSION_OPS.has(op) ? T.turnSeat(run) : null;
    if (turn != null && T.ownerOf(run, cmd.hero) !== turn)
      return { ok: false, why: `It is ${run.party.players[turn].name}'s turn.` };
    // the next turn is open: acting for a pilot begins its player's turn, if they have not had one
    if (
      MISSION_OPS.has(op) &&
      T.liveRounds(run) &&
      T.playerCount(run) >= 2 &&
      run.party.ready[T.ownerOf(run, cmd.hero)]
    )
      return { ok: false, why: `${T.ownerName(run, cmd.hero)} is ready: press Waiting to keep playing.` };
    let began = false;
    if (MISSION_OPS.has(op) && turn == null && turnsApply(run)) {
      const s = T.ownerOf(run, cmd.hero);
      if (!T.seatsToPlay(run).includes(s))
        return { ok: false, why: `${run.party.players[s].name} has had a turn this round.` };
      run.party.active = s;
      began = true;
    }
    const h = MISSION_OPS.has(op) ? m.heroes[cmd.hero] : run.heroes[cmd.hero];
    if (!h) return { ok: false, why: 'no such hero' };
    if (MISSION_OPS.has(op) && cmd.ctx == null) cmd.ctx = {};
    const r = f(run, m, h, cmd) || { ok: false };
    if (began && !r.ok) run.party.active = null; // nothing done: the turn is not begun
    return Object.assign({}, r, { ctx: cmd.ctx });
  };

  /* ───────────── take-backs: what a player may undo ───────────── */
  /**
   * What a player could not have known before a play: the random streams (a die rolled, a foe's
   * choice drawn), which caches have been searched and which is real, which survey marks are still
   * veiled, which foes are on the board and which of them are Hidden, and whether the mission is over.
   * Two missions with the same secrets differ only in things the player already knew.
   */
  T.secretsOf = function (m) {
    const nodes = Object.values(m.board.nodes)
      .filter((n) => n.objective)
      .map((n) => [n.id, !!n.objective.searched, !!n.objective.veiled]);
    const foes = m.enemies.map((e) => [e.uid, !!(e.states && e.states.Hidden)]);
    const ob = m.objective || {};
    return JSON.stringify([m.rngs, nodes, foes, !!ob.found, !!m.over, m.round, m.phase]);
  };
  /**
   * May the change from `before` to `after` be taken back? Yes when it rolled no dice, drew nothing
   * at random, revealed nothing and did not end the mission or the round: the player could have
   * planned it from what they could already see, so undoing it hides nothing and gains nothing
   * (docs/design/07-art-and-ux.md, Undo). A table plays the same way: put the token back.
   */
  T.canTakeBack = (before, after) => T.secretsOf(before) === T.secretsOf(after);
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
