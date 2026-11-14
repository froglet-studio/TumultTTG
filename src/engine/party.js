/* ============================================================================
   TUMULT — PARTY: who plays which pilot (pure; no DOM).
   A run has one to MAX_PLAYERS players. Each hero belongs to one player (its seat);
   one player may hold several. The rules do not change with the number of players:
   the same squad meets the same missions. What changes is who may act for whom, and
   that players take turns: in a mission's hero phase one player acts at a time, the
   others wait, and the round's enemy turn comes once every player has had theirs. The
   player who goes first changes every round.
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
   * player, or no hero phase under way). Seats go in order from this round's first player,
   * (round - 1) mod players, so the lead changes hands every round; party.ready marks the
   * players who have had their turn. A player whose pilots are all down has no turn to take.
   */
  T.turnSeat = function (run) {
    const m = run.mission;
    const p = run.party;
    if (!p || p.players.length < 2 || !m || m.over || m.phase !== 'hero') return null;
    const n = p.players.length;
    const first = (Math.max(1, m.round) - 1) % n;
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
    interact: (run, m, h, c) => T.doInteract(m, h, c.node, false),
    rally: (run, m, h) => T.rally(m, h),
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
    takeBoon: (run, m, h, c) => (T.takeBoon(run, c.boon, c.hero), { ok: true }),
    buyGear: (run, m, h, c) => T.buyGear(run, c.gear, c.hero),
    buyCons: (run, m, h, c) => T.buyConsumable(run, c.cons, c.hero),
    evTakeCard: (run, m, h, c) => {
      const r = T.addCard(h, c.card);
      if (r.ok && run.event && run.event.followup) run.event.followup.done = true;
      return r;
    },
  };
  const MISSION_OPS = new Set([
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
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
