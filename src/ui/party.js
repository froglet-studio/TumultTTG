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
    'face',
    'gear',
    'cons',
    'basic',
    'interact',
    'rally',
    'valve',
    'dumpMode',
    'die',
    'train',
    'kit',
    'autoUpRun',
    'sellGear',
  ]);
  const HERO_SECOND = new Set(['takeCard', 'takeBoon', 'buyGear', 'buyCons', 'evTakeCard']);
  // the squad's shared choices: the host makes them
  const LEAD = new Set([
    'goNode',
    'skipCard',
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
    if (!run || !U.seats) return true;
    const i = U.heroOfAct(act, arg, el);
    if (i != null && !isNaN(i) && !T.mayActFor(run, U.seats, i)) {
      U.toast(`${esc(T.ownerName(run, i))} plays that pilot.`);
      return false;
    }
    if (LEAD.has(act) && !T.mayLead(run, U.seats)) {
      U.toast(`${esc(run.party.players[0].name)} makes the squad's choices.`);
      return false;
    }
    return true;
  };
  /** May this screen move or act for hero i on the board? */
  U.mine = (i) => !U.run || T.mayActFor(U.run, U.seats, i);

  /** A small label naming the player of hero i, when there is more than one player. */
  U.seatTag = function (i) {
    const run = U.run;
    if (!run || T.playerCount(run) < 2) return '';
    return `<span class="seat-tag seat-${T.ownerOf(run, i)}">${esc(T.ownerName(run, i))}</span>`;
  };

  /** The end-of-round button's label: with players on other screens, it says who is ready. */
  U.endRoundLabel = function () {
    const run = U.run;
    if (!run || !run.party || !U.seats || T.playerCount(run) < 2) return 'End Round ▶';
    const p = run.party;
    const n = p.ready.filter(Boolean).length;
    const mine = U.seats.every((s) => p.ready[s]);
    return mine ? `Waiting… ${n}/${p.players.length}` : `Ready ▶ ${n}/${p.players.length}`;
  };

  /** The title screen's player picker (kept in meta like the tide). */
  U.chosenPlayers = (meta) => Math.max(1, Math.min(T.MAX_PLAYERS, meta.players || 1));
  U.partyPicker = function (meta) {
    const cur = U.chosenPlayers(meta);
    const btns = [1, 2]
      .map(
        (n) =>
          `<button class="${n === cur ? 'primary' : 'ghost'} sm" data-act="pickPlayers" data-arg="${n}">${n === 1 ? 'Solo' : n + ' players'}</button>`,
      )
      .join('');
    const txt =
      cur === 1
        ? 'You fly both pilots.'
        : 'Each player drafts and flies one pilot, passing the screen. The rules are the same as solo.';
    return `<div class="tide-pick"><span class="dim small">Players</span>${btns}<div class="mute small">${txt}</div></div>`;
  };
})((window.T = window.T || {}));
