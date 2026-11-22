/* ============================================================================
   TUMULT — WELCOMING NEW PLAYERS.
   Takes a player from a link to their first finished mission (docs/reference/WELCOME.md):

   - Play now. A first visit (no expedition yet, no save) gets one button that sets out at once with
     two pre-made pilots, instead of the draft. Building your own squad stays one click away.
   - The guided first mission. Five steps, each lighting up one part of the real mission screen (the
     dice, the cards, an enemy's plan, the forecast, End Round) with a short card beside it. The player
     can play while it is open; Next, Back and Skip are always there. Once per device.
   - Keep your squad. After the first won mission, sign-in is offered once, under the report, so the
     win is read before the ask. Never before play, never again after "Not now".
   - Invites. A link with ?join=CODE opens the title on that game: join with a name, or, where this
     page cannot reach online play, play solo while the host waits.

   Accounts are not built here: they are T.Account and its sign-in box, T.UI.askSignIn (src/ui/account.js),
   which also draws the title's Sign in line and asks a host to sign in. Where accounts are not available
   (no server, the offline file) nobody is asked, and the game is exactly as before. Gameplay rules are untouched: this file only adds screens around them.
   ========================================================================== */
(function (T) {
  const U = T.UI;
  const esc = U.esc;
  const W = (U.welcome = U.welcome || {});
  const TUT_KEY = 'tumult_v2_tut'; // the first-time tips this device has seen (src/ui/core.js)

  /** Send an event to anonymous play data (src/ui/telemetry.js), if this build has it. */
  const track = (event, props) => T.Telemetry && T.Telemetry.track(event, props || {});

  function seenTips() {
    try {
      return JSON.parse(localStorage.getItem(TUT_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }
  const seen = (k) => !!seenTips()[k];
  function markSeen(k) {
    try {
      const s = seenTips();
      s[k] = 1;
      localStorage.setItem(TUT_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  /* ───────────── accounts (src/ui/account.js) ───────────── */
  const acct = () => (T.Account && T.Account.available && T.Account.available() ? T.Account : null);
  const signedIn = () => {
    const a = acct();
    const u = a && a.user && a.user();
    return !!(u && !u.guest);
  };
  /** May this page ask the player to sign in? Only where accounts are available and they are a guest. */
  W.canAsk = () => !!acct() && !!(U.askSignIn || T.UI.askSignIn) && !signedIn();
  function askSignIn(where) {
    track('signin_prompt', { where, action: 'opened' });
    (U.askSignIn || T.UI.askSignIn)('Keep this expedition and your pilots on any device.');
  }
  let watching = false;
  /** Once signed in, the card goes and the play-data line says so (once per sign-in). */
  function watchAccount() {
    const a = acct();
    if (watching || !a || typeof a.onChange !== 'function') return;
    watching = true;
    a.onChange(() => {
      if (!signedIn()) return;
      const card = document.getElementById('keepSquad');
      if (card) {
        track('signin_prompt', { where: 'first_win', action: 'signed_in' });
        card.remove();
      }
    });
  }

  /* ───────────── who is new ───────────── */
  /** A first visit: no expedition started on this device and nothing to continue. */
  U.isNewPlayer = (meta, hasSave) => !hasSave && !!meta && (meta.runs || 0) === 0 && !U.welcome.invite;

  /* ───────────── Play now ───────────── */
  // A striker and a shield-bearer: a pair that forgives a first try. Pre-made pilots, as the draft offers them.
  W.FIRST_SQUAD = ['cavitt', 'ossa'];
  U.playNow = function () {
    U.playingNow = true; // read by run_started (src/ui/telemetry.js)
    try {
      U.startDraft();
    } finally {
      U.playingNow = false;
    }
    const run = U.run;
    W.FIRST_SQUAD.forEach((id) => {
      const pb = T.PREBUILTS.find((p) => p.id === id);
      const h = T.heroFromPrebuilt(run, pb);
      T.awaken(h);
      run.heroes.push(h);
    });
    U.draft = null;
    T.startMap(run);
    T.saveRun(run);
    U.screen = 'map';
    U.showTutorial('map');
    U.render();
  };

  /* ───────────── the title: first visit, invite, account ───────────── */
  U.welcomeTitle = function (meta, hasSave) {
    let out = '';
    if (W.invite) out += inviteHTML();
    else if (U.isNewPlayer(meta, hasSave))
      out += `<div class="welcome-start"><button class="primary play-now" data-act="playNow">Play now</button>
        <div class="small dim">Free, no account needed. You set out with a ready-made squad, and your first mission teaches you as you go.</div></div>`;
    return out;
  };
  /* ───────────── the guided first mission ───────────── */
  // Each step lights one part of the mission screen: the first selector that finds something visible wins.
  const STEPS = [
    {
      key: 'dice',
      at: ['.dock-hero.active .dk-purse', '.dock-hero.active .dice', '.dock .dice'],
      also: ['.dock-hero.active .dice'], // lit together with the purse: the dice and what they paid
      title: 'Your dice',
      body: (m, h) =>
        `Each round ${esc(h.name)} rolls four dice. Most pay <b>AP</b>, the cost of every card. Some give an element, the etherion a card's stronger <b>Ethereal</b> face also needs. Dice you don't spend stay banked.`,
    },
    {
      key: 'cards',
      at: ['.dock-hero.active .hand', '.dock .hand'],
      title: 'Your cards',
      body: () =>
        `Every card has two faces: <b>Physical</b> for AP, <b>Ethereal</b> for AP and an etherion. Point at a face to see on the board what it will do; click to play it. A played card rests on the track for a few rounds.`,
    },
    {
      key: 'intent',
      at: ['#board .intent-lbl', '#board .intent-line', '.intents-panel', '#board'],
      title: 'What the enemy will do',
      body: (m) => {
        const e = m.enemies.find((x) => x.hp > 0 && x.intent);
        return `Enemies show their plan before you act. ${
          e ? `The ${esc(e.name)} means to <b>${esc(e.intent.label)}</b>. ` : ''
        }Step out of its reach, hide, push it, or hit it first: every plan has more than one answer.`;
      },
    },
    {
      key: 'forecast',
      at: ['#mfc .forecast', '#mfc'],
      title: 'What ending costs',
      body: () =>
        `This line adds up every enemy plan: what the squad takes if you end the round now. It changes as you preview each play. Bring it as low as the round allows.`,
    },
    {
      key: 'end',
      at: ['[data-act="endRound"]'],
      title: 'End the round',
      body: () =>
        `When you are done, end the round. The enemies act, your cards come back a step closer, and you roll again. Win by finishing the objective at the top of the screen.`,
    },
  ];
  W.STEPS = STEPS;
  W.step = 0;
  W.guiding = () => U.tut === 'mission' && U.screen === 'mission' && !!(U.run && U.run.mission);

  U.guideHTML = function () {
    const m = U.run && U.run.mission;
    if (!m || U.screen !== 'mission') return '';
    const i = Math.max(0, Math.min(STEPS.length - 1, W.step));
    const st = STEPS[i];
    const h = m.heroes[(U.ms && U.ms.heroIdx) || 0] || m.heroes[0];
    const last = i === STEPS.length - 1;
    const dots = STEPS.map((_, k) => `<span class="${k <= i ? 'on' : ''}"></span>`).join('');
    return `<div class="guide-spot" id="guideSpot" aria-hidden="true"></div>
      <div class="guide-coach" id="guideCoach" role="dialog" aria-label="First mission guide, step ${i + 1} of ${STEPS.length}" data-step="${st.key}">
        <span class="kick">First mission · ${i + 1} of ${STEPS.length}</span>
        <h3>${esc(st.title)}</h3>
        <p>${st.body(m, h)}</p>
        <div class="guide-dots">${dots}</div>
        <div class="row">${i > 0 ? '<button class="sm ghost" data-act="guideBack">Back</button>' : ''}<button class="sm primary" data-act="${last ? 'guideDone' : 'guideNext'}">${last ? 'Got it' : 'Next'}</button><button class="sm link ghost right" data-act="tutClose">Skip the guide</button></div>
      </div>`;
  };

  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function targetOf(st) {
    let first = null;
    for (const sel of st.at) {
      const el = document.querySelector(sel);
      if (!el) continue;
      first = first || el;
      if (visible(el)) return el;
    }
    return first;
  }
  /** Light the step's target and set the card beside it; runs after every render of the mission screen. */
  W.place = function (scroll) {
    const spot = document.getElementById('guideSpot');
    const coach = document.getElementById('guideCoach');
    if (!spot || !coach) return;
    const st = STEPS[W.step] || STEPS[0];
    const el = targetOf(st);
    if (!el || !visible(el)) {
      spot.style.display = 'none';
      coach.classList.add('floating');
      Object.assign(coach.style, { left: '', top: '', bottom: '' });
      return;
    }
    if (scroll && el.scrollIntoView) el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const pad = 6;
    let r = el.getBoundingClientRect();
    for (const sel of st.also || []) {
      const x = document.querySelector(sel);
      if (!x || x === el || !visible(x)) continue;
      const q = x.getBoundingClientRect();
      r = {
        left: Math.min(r.left, q.left),
        top: Math.min(r.top, q.top),
        right: Math.max(r.right, q.right),
        bottom: Math.max(r.bottom, q.bottom),
      };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const box = {
      l: Math.max(4, r.left - pad),
      t: Math.max(4, r.top - pad),
      r: Math.min(vw - 4, r.right + pad),
      b: Math.min(vh - 4, r.bottom + pad),
    };
    spot.style.display = '';
    Object.assign(spot.style, {
      left: box.l + 'px',
      top: box.t + 'px',
      width: Math.max(0, box.r - box.l) + 'px',
      height: Math.max(0, box.b - box.t) + 'px',
    });
    coach.classList.remove('floating');
    const cw = coach.offsetWidth || 340;
    const ch = coach.offsetHeight || 200;
    // beside the target where there is room: below, above, then left or right, else over the screen's foot
    let x = Math.min(Math.max(8, box.l), vw - cw - 8);
    let y;
    if (vw <= 640)
      y = (box.t + box.b) / 2 > vh / 2 ? 8 : vh - ch - 8; // a phone: the other half of the screen
    else if (box.b + 12 + ch < vh) y = box.b + 12;
    else if (box.t - 12 - ch > 0) y = box.t - 12 - ch;
    else if (box.l - 12 - cw > 0) ((x = box.l - 12 - cw), (y = Math.min(Math.max(8, box.t), vh - ch - 8)));
    else if (box.r + 12 + cw < vw) ((x = box.r + 12), (y = Math.min(Math.max(8, box.t), vh - ch - 8)));
    else y = vh - ch - 8;
    Object.assign(coach.style, { left: Math.max(8, x) + 'px', top: Math.max(8, y) + 'px', bottom: 'auto' });
  };
  let placing = 0;
  function schedulePlace(scroll) {
    if (!W.guiding()) return;
    if (typeof requestAnimationFrame !== 'function') return W.place(scroll);
    cancelAnimationFrame(placing);
    placing = requestAnimationFrame(() => W.place(scroll));
  }
  function guideTo(i, action) {
    const from = W.step;
    W.step = Math.max(0, Math.min(STEPS.length - 1, i));
    track('guide_step', { step: from + 1, key: STEPS[from].key, action });
    U.render();
    schedulePlace(true);
  }
  function guideEnd(action) {
    track('guide_step', { step: W.step + 1, key: STEPS[W.step].key, action });
    W.step = 0;
  }

  // a fresh guide each time the mission tip opens
  const realShow = U.showTutorial;
  U.showTutorial = function (key) {
    const before = U.tut;
    realShow.apply(this, arguments);
    if (key === 'mission' && U.tut === 'mission' && before !== 'mission') W.step = 0;
  };
  const realRender = U.render;
  U.render = function () {
    const r = realRender.apply(this, arguments);
    schedulePlace(false);
    return r;
  };
  if (U.updateMission) {
    const realUpdate = U.updateMission;
    U.updateMission = function () {
      const r = realUpdate.apply(this, arguments);
      schedulePlace(false);
      return r;
    };
  }
  if (typeof window !== 'undefined') window.addEventListener('resize', () => schedulePlace(false));

  /* ───────────── keep your squad: after the first won mission ───────────── */
  U.missionOverExtra = function (m) {
    if (!m.won || !W.canAsk() || seen('keepSquad')) return '';
    if (U.net && U.net.isGuest && U.net.isGuest()) return ''; // a guest's squad is the host's
    markSeen('keepSquad');
    watchAccount();
    track('signin_prompt', { where: 'first_win', action: 'shown' });
    return keepSquadCard();
  };
  const keepSquadCard = () =>
    `<div class="keep-squad" id="keepSquad"><span class="kick">Keep your squad</span>
      <b>Your first mission is won.</b>
      <p class="small">Sign in to keep this expedition and your pilots on any device, and to host games with friends. Playing on as a guest keeps everything in this browser only.</p>
      <button class="primary" data-act="signInKeep">Sign in to keep your squad</button>
      <button class="link ghost sm" data-act="keepSquadLater">Not now, keep playing as a guest</button></div>`;
  W.cardForTest = keepSquadCard;

  /* ───────────── invites ───────────── */
  const CODE = /^[A-Z0-9]{4,8}$/;
  /** The invite a link carried (?join=CODE or #join=CODE), taken off the address so a reload does not ask again. */
  W.readInvite = function (loc) {
    if (!loc) return null;
    const pick = (s) => {
      const mm = /(?:^|[?&#])join=([A-Za-z0-9]+)/.exec(s || '');
      return mm ? mm[1].toUpperCase() : null;
    };
    const code = pick(loc.search) || pick(loc.hash);
    return code && CODE.test(code) ? code : null;
  };
  /** The link that brings a friend to this game, or null where this page has no address to share. */
  W.inviteLink = function (code) {
    if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return null;
    try {
      if (window.top !== window) return null; // inside another page (the claude.ai test page): share the code
    } catch (e) {
      return null;
    }
    return location.origin + location.pathname + '?join=' + encodeURIComponent(code);
  };
  const netReady = () => !!(U.net && U.net.available && U.net.canWrite !== false);
  function inviteHTML() {
    const code = W.invite;
    const head = `<span class="kick">Play with a friend</span><h3>You're invited to expedition <span class="mono">${esc(code)}</span></h3>`;
    if (netReady())
      return `<div class="invite-card">${head}<p class="small dim">Each of you flies one pilot. No account needed to join.</p>
        <div class="row"><input id="inviteName" placeholder="Your name" maxlength="24"><button class="primary" data-act="inviteJoin">Join the game</button><button class="ghost sm" data-act="inviteDrop">Play alone instead</button></div></div>`;
    if (U.net && !W.inviteGaveUp)
      return `<div class="invite-card">${head}<p class="small dim">Reaching the game…</p></div>`;
    return `<div class="invite-card">${head}<p class="small">Online play isn't open on this page yet, so this invite can't be joined here. Start an expedition of your own meanwhile; nothing is lost.</p>
      <div class="row"><button class="primary" data-act="inviteDrop" data-arg="play">Play now</button></div></div>`;
  }
  function takeInvite() {
    if (typeof location === 'undefined') return;
    const code = W.readInvite(location);
    if (!code) return;
    W.invite = code;
    try {
      const clean = location.pathname + location.search.replace(/([?&])join=[^&]*&?/, '$1').replace(/[?&]$/, '');
      history.replaceState(history.state, '', clean + (/join=/.test(location.hash) ? '' : location.hash));
    } catch (e) {}
    // online play answers within a few seconds or not at all (a page that cannot reach it)
    setTimeout(() => {
      W.inviteGaveUp = true;
      track('invite_link', { action: 'opened', can_join: netReady() });
      if (U.screen === 'title') U.render();
    }, 4000);
  }

  /* ───────────── actions ───────────── */
  const prevExtra = U.extraAct;
  U.extraAct = function (act, arg, el, e) {
    switch (act) {
      case 'playNow':
        U.playNow();
        if (U.sfx) U.sfx.click();
        return true;
      case 'guideNext':
        guideTo(W.step + 1, 'next');
        return true;
      case 'guideBack':
        guideTo(W.step - 1, 'back');
        return true;
      case 'guideDone':
        guideEnd('finished');
        U.tut = null;
        U.render();
        return true;
      case 'tutClose':
        if (W.guiding()) guideEnd('skipped');
        return false; // the tip closes as it always has (src/ui/core.js)
      case 'signInKeep':
        askSignIn('first_win');
        return true;
      case 'keepSquadLater': {
        track('signin_prompt', { where: 'first_win', action: 'later' });
        const card = document.getElementById('keepSquad');
        if (card) card.remove();
        return true;
      }
      case 'inviteJoin': {
        const inp = document.getElementById('inviteName');
        const code = W.invite;
        W.invite = null;
        track('invite_link', { action: 'joined', can_join: true });
        U.net.join(code, (inp && inp.value.trim()) || 'Player 2');
        return true;
      }
      case 'inviteDrop':
        track('invite_link', { action: 'declined', can_join: netReady() });
        W.invite = null;
        if (arg === 'play' && U.isNewPlayer(T.loadMeta(), !!T.loadRun())) U.playNow();
        else U.render();
        return true;
      case 'inviteCopy': {
        const link = (U.net && U.net.invite) || W.inviteLink(arg) || arg;
        const done = () => {
          track('invite_link', { action: 'copied', can_join: true });
          if (el) {
            el.textContent = 'Copied';
            el.classList.add('copied');
            setTimeout(() => {
              el.textContent = 'Copy';
              el.classList.remove('copied');
            }, 1200);
          }
        };
        const field = document.getElementById('inviteField');
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText)
          navigator.clipboard.writeText(link).then(done, () => field && (field.select(), done()));
        else if (field) {
          field.select();
          try {
            document.execCommand('copy');
          } catch (x) {}
          done();
        }
        return true;
      }
    }
    return prevExtra ? prevExtra(act, arg, el, e) : false;
  };

  /* ───────────── start ───────────── */
  W.start = function () {
    if (W.started) return;
    W.started = true;
    takeInvite();
    watchAccount();
    if (W.invite && U.screen === 'title') U.render();
  };
  // after every script of the page has run, so online play (net.js) and any provider are in place
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading')
      window.addEventListener('DOMContentLoaded', () => setTimeout(() => W.start(), 0));
    else setTimeout(() => W.start(), 0);
  }
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
