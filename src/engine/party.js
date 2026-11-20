/* ============================================================================
   TUMULT — PARTY: who plays which pilot (pure; no DOM).
   A run has one to MAX_PLAYERS players. Each hero belongs to one player (its seat);
   one player may hold several. The rules do not change with the number of players:
   the same squad meets the same missions. What changes is who may act for whom, and
   that players take turns: in a mission's hero phase one player acts at a time, the
   others wait, and the round's enemy turn comes once every player has had theirs. Seats
   always go in the same order, host first, so nobody takes two turns in a row and each
   player can plan their next turn while the others take theirs (Garrett, 2026-11-15).
   Seat 0 is the host: it makes the squad's shared choices (route, events, havens).
   ========================================================================== */
(function (T) {
  T.MAX_PLAYERS = 2;

  /** A new party: n players; heroes are dealt to seats in turn (hero i → seat i mod n). */
  T.newParty = function (n, names) {
    n = Math.max(1, Math.min(T.MAX_PLAYERS, n | 0 || 1));
    const players = [];
    for (let i = 0; i < n; i++) players.push({ name: (names && names[i]) || 'Player ' + (i + 1) });
    return { players, owner: [0, 1].map((i) => i % n), ready: players.map(() => false) };
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
    if (run.party) run.party.ready = run.party.players.map(() => false);
  };

  /**
   * Whose turn it is in a mission's hero phase: a seat, or null when turns do not apply (one
   * player, or no hero phase under way). Seats go in order, 0 first, every round, so no player
   * ever takes two turns in a row; party.ready marks the players who have had their turn. A player whose pilots are all down has no turn to take.
   */
  T.turnSeat = function (run) {
    const m = run.mission;
    const p = run.party;
    if (!p || p.players.length < 2 || !m || m.over || m.phase !== 'hero') return null;
    const n = p.players.length;
    const first = 0;
    for (let k = 0; k < n; k++) {
      const s = (first + k) % n;
      if (p.ready[s]) continue;
      if (!T.heroesOf(run, s).some((i) => m.heroes[i] && !m.heroes[i].downed)) continue;
      return s;
    }
    return null;
  };

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
    note: (run, m, h, c) => T.addNote(m, c.hero, c.text),
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
    // between missions
    adjustUp: (run, m, h, c) => T.adjustUp(h, c.card, c.which, c.delta),
    autoUp: (run, m, h) => (T.autoAllocate(h), { ok: true }),
    sellGear: (run, m, h, c) => (T.sellGear(run, c.hero, c.gi), { ok: true }),
    takeCard: (run, m, h, c) => T.takeOfferedCard(run, c.card, c.hero),
    skipCard: (run, m, h, c) => T.skipOfferedCard(run, c.hero),
    takeBoon: (run, m, h, c) => T.takeBoon(run, c.boon, c.hero),
    buyGear: (run, m, h, c) => T.buyGear(run, c.gear, c.hero),
    buyCons: (run, m, h, c) => T.buyConsumable(run, c.cons, c.hero),
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
    'valve',
    'dump',
    'reroll',
    'walk',
  ]);
  T.COMMAND_OPS = Object.keys(HERO_OPS).concat(['ready', 'addHero']);

  T.execCommand = function (run, cmd, seats) {
    const op = cmd && cmd.op;
    if (op === 'ready') {
      // the player whose turn it is ends it; once every player has had theirs, the round goes on
      const m = run.mission;
      if (!m || m.over || m.phase !== 'hero') return { ok: false, why: 'not now' };
      const turn = T.turnSeat(run);
      if (turn != null) {
        if (seats && !seats.includes(turn)) return { ok: false, why: `It is ${run.party.players[turn].name}'s turn.` };
        run.party.ready[turn] = true;
        const next = T.turnSeat(run);
        if (next != null) return { ok: true, passed: true, to: next };
      } else if (!T.setReady(run, seats)) return { ok: true, waiting: true };
      T.clearReady(run);
      T.endHeroPhase(m);
      m.heroes.forEach((x) => (x.freeMove = 0));
      return { ok: true, ended: true };
    }
    if (op === 'addHero') {
      // a player's drafted pilot joins the squad in that player's place
      const i = cmd.hero;
      if (run.phase !== 'draft' || !T.mayActFor(run, seats, i) || run.heroes[i]) return { ok: false, why: 'not now' };
      const h = cmd.pilot;
      // two screens draft apart, so two ids could meet: the second one gives way
      if (run.heroes.some((x) => x && x.id === h.id)) h.id += '_' + i;
      run.heroes[i] = h;
      return { ok: true };
    }
    const f = HERO_OPS[op];
    if (!f) return { ok: false, why: 'unknown command ' + op };
    if (!T.mayActFor(run, seats, cmd.hero)) return { ok: false, why: "that is another player's pilot" };
    const m = run.mission;
    if (MISSION_OPS.has(op) && (!m || m.over || m.phase !== 'hero')) return { ok: false, why: 'not now' };
    const turn = MISSION_OPS.has(op) ? T.turnSeat(run) : null;
    if (turn != null && T.ownerOf(run, cmd.hero) !== turn)
      return { ok: false, why: `It is ${run.party.players[turn].name}'s turn.` };
    const h = MISSION_OPS.has(op) ? m.heroes[cmd.hero] : run.heroes[cmd.hero];
    if (!h) return { ok: false, why: 'no such hero' };
    if (MISSION_OPS.has(op) && cmd.ctx == null) cmd.ctx = {};
    const r = f(run, m, h, cmd) || { ok: false };
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
