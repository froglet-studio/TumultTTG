/* ============================================================================
   TUMULT — PARTY: who plays which pilot (pure; no DOM).
   A run has one to MAX_PLAYERS players. Each hero belongs to one player (its seat);
   one player may hold several. The rules do not change with the number of players:
   the same squad meets the same missions. What changes is who may act for whom, and
   that a round ends only when every player has said they are ready.
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
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
