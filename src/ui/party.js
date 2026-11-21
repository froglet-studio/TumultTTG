/* ============================================================================
   TUMULT — UI PARTY: players, seats and who may click what.
   U.seats lists the seats this screen plays; null means all of them (one player, or
   several passing one screen round). Every action a player takes for one hero is let
   through only for that hero's player; the squad's shared choices only for the host.
   The rules live in src/engine/party.js; this file only routes clicks to them.
   ========================================================================== */
(function (T) {
  const U = T.UI;
  const esc = U.esc;
  U.seats = null;

  // actions whose data-arg starts with the hero's index ("i|…"), or has it second ("…|i")
  const HERO_FIRST = new Set([
    'heel',
    'adoptPet',
    'face',
    'gear',
    'cons',
    'basic',
    'interact',
    'rally',
    'valve',
    'asAPMode',
    'dumpMode',
    'die',
    'train',
    'kit',
    'kitPick',
    'kitSwap',
    'autoUpRun',
    'sellGear',
    'skipCard',
    'rollPick',
  ]);
  // choices that change nothing on the board, open to a player whoever's turn it is
  const ANYTIME = new Set(['rollPick']);
  const HERO_SECOND = new Set(['takeCard', 'swapPick', 'swapDrop', 'buyGear', 'evTakeCard']);
  // the squad's shared choices: the host makes them
  const LEAD = new Set([
    'goNode',
    'rewardDone',
    'rest',
    'leaveHaven',
    'eventOpt',
    'evSkipCard',
    'evTrade',
    'leaveEvent',
    'missionDone',
  ]);
  const DRAFT = new Set([
    'draftMode',
    'prebuilt',
    'pickSpecies',
    'draftBack',
    'draftQuit',
    'draftPrev',
    'openPacks',
    'pickCard',
    'rerollPack',
    'up',
    'autoUp',
    'resetUp',
    'confirmHero',
  ]);

  /** The hero an action is for, or null when it is not for one hero. */
  U.heroOfAct = function (act, arg, el) {
    if (act === 'upRun') return +el.getAttribute('data-hero');
    if (HERO_FIRST.has(act)) return +String(arg).split('|')[0];
    if (HERO_SECOND.has(act)) return +String(arg).split('|')[1];
    if (DRAFT.has(act) && U.screen === 'draft' && U.draft) return U.draft.heroIdx;
    return null;
  };
  /** May this screen take this action? Says why not when it may not. */
  U.gate = function (act, arg, el) {
    const run = U.run;
    if (!run) return true;
    const i = U.heroOfAct(act, arg, el);
    if (i != null && !isNaN(i) && !T.mayActFor(run, U.seats, i)) {
      U.toast(`${esc(T.ownerName(run, i))} plays that pilot.`);
      return false;
    }
    if (ANYTIME.has(act)) return true;
    const turn = U.screen === 'mission' && HERO_FIRST.has(act) ? T.turnSeat(run) : null;
    if (turn != null && i != null && !isNaN(i) && T.ownerOf(run, i) !== turn) {
      U.toast(`It is ${esc(run.party.players[turn].name)}'s turn.`);
      return false;
    }
    const s = i != null && !isNaN(i) ? T.ownerOf(run, i) : null;
    if (U.screen === 'mission' && HERO_FIRST.has(act) && T.turnOpen(run) && !T.seatsToPlay(run).includes(s)) {
      U.toast(`${esc(run.party.players[s].name)} has had a turn this round.`);
      return false;
    }
    if (U.screen === 'mission' && HERO_FIRST.has(act) && s != null && readyLive(run, s)) {
      U.toast(`${esc(run.party.players[s].name)} is ready for the round to end: press Waiting to keep playing.`);
      return false;
    }
    if (U.seats && LEAD.has(act) && !T.mayLead(run, U.seats)) {
      U.toast(`${esc(run.party.players[0].name)} makes the squad's choices.`);
      return false;
    }
    return true;
  };
  /**
   * Carry out a command (T.execCommand). On a guest's screen of a game played over the network
   * it goes to the host, whose screen carries it out and sends everyone the new state.
   */
  U.exec = function (cmd) {
    if (U.net && U.net.isGuest()) return U.net.send(cmd);
    // the mission screen keeps what a move can be taken back to (mission.js, T.canTakeBack)
    const before = U.takeBackBefore ? U.takeBackBefore(cmd) : null;
    const r = T.execCommand(U.run, cmd, U.seats);
    if (U.takeBackAfter) U.takeBackAfter(cmd, r, before);
    return r;
  };
  /** In live rounds, has this seat said it is done with the round? */
  const readyLive = (run, s) => T.liveRounds(run) && T.playerCount(run) >= 2 && !!run.party.ready[s];
  /** May this screen move or act for hero i on the board? */
  U.mine = (i) => {
    if (!U.run) return true;
    const run = U.run;
    if (!T.mayActFor(run, U.seats, i)) return false;
    if (readyLive(run, T.ownerOf(run, i))) return false;
    const turn = T.turnSeat(run);
    if (turn != null) return T.ownerOf(run, i) === turn;
    return !T.turnOpen(run) || T.seatsToPlay(run).includes(T.ownerOf(run, i));
  };
  /**
   * The player whose turn it is, when turns apply, and whether this screen holds that player. When the next
   * turn is open to whoever acts first (players choose their order each round), { open: true, left, here }.
   */
  U.turn = function () {
    const run = U.run;
    if (!run) return null;
    if (T.turnOpen(run)) {
      const left = T.seatsToPlay(run);
      return { open: true, left, here: left.some((s) => !U.seats || U.seats.includes(s)) };
    }
    const t = T.turnSeat(run);
    if (t == null) return null;
    return { seat: t, name: run.party.players[t].name, here: !U.seats || U.seats.includes(t) };
  };

  /** A small label naming the player of hero i, when there is more than one player. */
  U.seatTag = function (i) {
    const run = U.run;
    if (!run || T.playerCount(run) < 2) return '';
    return `<span class="seat-tag seat-${T.ownerOf(run, i)}">${esc(T.ownerName(run, i))}</span>`;
  };

  /** The end-of-round button's label: with players taking turns, it says whose turn it is. */
  U.endRoundLabel = function () {
    const run = U.run;
    const t = U.turn();
    if (t && t.open) {
      if (!t.here) return `Waiting for ${t.left.map((s) => esc(run.party.players[s].name)).join(', ')}…`;
      // on one screen the turn to end is the selected pilot's player's; on a player's own screen, theirs
      const s = U.seats ? t.left.find((x) => U.seats.includes(x)) : U.ms ? T.ownerOf(run, U.ms.heroIdx) : t.left[0];
      return `End ${esc(run.party.players[s].name)}'s turn ▶`;
    }
    if (t) {
      if (!t.here) return `${esc(t.name)}'s turn…`;
      const last = run.party.players.every((p, s) => s === t.seat || run.party.ready[s]);
      return last ? 'End Round ▶' : `End ${esc(t.name)}'s turn ▶`;
    }
    if (!run || !run.party || !U.seats || T.playerCount(run) < 2) return 'End Round ▶';
    const p = run.party;
    const n = p.ready.filter(Boolean).length;
    const mine = U.seats.every((s) => p.ready[s]);
    if (T.liveRounds(run))
      return mine ? `Waiting… ${n}/${p.players.length} (keep playing)` : `Done ▶ ${n}/${p.players.length}`;
    return mine ? `Waiting… ${n}/${p.players.length}` : `Ready ▶ ${n}/${p.players.length}`;
  };

  /** The title screen's player picker (kept in meta like the tide). */
  U.chosenPlayers = (meta) => Math.max(1, Math.min(T.MAX_PLAYERS, meta.players || 1));
  U.partyPicker = function (meta) {
    const cur = U.chosenPlayers(meta);
    const btns = Array.from({ length: T.MAX_PLAYERS }, (x, k) => k + 1)
      .map(
        (n) =>
          `<button class="${n === cur ? 'primary' : 'ghost'} sm" data-act="pickPlayers" data-arg="${n}">${n === 1 ? 'Solo' : n + ' players'}</button>`,
      )
      .join('');
    const txt =
      cur === 1
        ? 'You fly the whole squad.'
        : `Each player drafts and flies one pilot, passing the screen, and you ${U.roundsPref && U.roundsPref() === 'live' ? 'all play each round at once' : 'take turns'}.${cur > 2 ? ` A squad of ${cur} meets bigger missions: tougher foes, more of them, and more to do.` : ''}`;
    return `<div class="tide-pick"><span class="dim small">Players</span>${btns}<div class="mute small">${txt}</div></div>`;
  };
})((window.T = window.T || {}));
