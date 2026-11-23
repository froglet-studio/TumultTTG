/* Tumult — the browser's Back button (docs/reference/NAVIGATION.md).
   Every screen a player moves to by choice (Home, the tabs, settings, hosting, joining) adds an entry to the
   browser's history, so Back returns to the screen before it instead of leaving the game. The steps of an
   expedition (draft, route, mission, reward, haven, event, summary) are one entry between them: Back from
   the middle of a mission goes to the screen the player came from, with the expedition saved, and coming
   Forward to it resumes the expedition where it is. Back with a window open closes the window. */
((T) => {
  const U = (T.UI = T.UI || {});
  if (typeof window === 'undefined' || !window.history || !window.history.pushState) return;
  const H = window.history;

  // the steps of an expedition: moving between them replaces the entry rather than adding one
  const FLOW = ['draft', 'map', 'mission', 'reward', 'haven', 'event', 'garage', 'summary'];
  U.NAV_FLOW = FLOW;

  let last = null; // the screen the current entry stands for
  let popping = false;

  const entry = (screen) => ({ tumult: 1, screen });
  const ours = (st) => st && st.tumult === 1 && typeof st.screen === 'string';

  /** Called at the end of every render: a new screen the player moved to adds an entry. */
  U.navNote = function () {
    const s = U.screen;
    if (popping || s === last) return;
    try {
      if (last == null || !ours(H.state)) H.replaceState(entry(s), '');
      else if (FLOW.includes(last) && FLOW.includes(s)) H.replaceState(entry(s), '');
      else H.pushState(entry(s), '');
    } catch {
      /* a sandboxed frame may refuse history; Back then does what the page around it does */
    }
    last = s;
  };

  /** Keep our entry when another part of the page tidies the address bar. */
  U.navClean = function (url) {
    try {
      H.replaceState(H.state, '', url);
    } catch {
      /* as above */
    }
  };

  // the screen an expedition is on now, when Forward or Back lands on one of its steps
  function flowScreen() {
    const r = U.run || (T.loadRun && T.loadRun());
    if (!r) return 'title';
    U.run = r;
    if (r.phase === 'summary') return 'summary';
    if (r.over) return 'title';
    if (r.phase === 'draft') {
      if (!U.draft && U.resumeDraft) U.resumeDraft(r); // the draft's own state is not saved: start the next pilot
      return r.phase !== 'draft' ? 'map' : U.draft ? 'draft' : 'title';
    }
    if (r.phase === 'mission' && r.mission) return 'mission';
    if (['reward', 'haven', 'event', 'garage'].includes(r.phase)) return r.phase;
    return 'map';
  }

  // a screen that needs something which may have gone falls back to Home
  function reachable(s) {
    if (FLOW.includes(s)) return flowScreen();
    if (s === 'lobby' && !U.net) return 'title';
    if ((s === 'pilot' || s === 'maker') && !U.crew) return 'pilots';
    return s;
  }

  window.addEventListener('popstate', (e) => {
    const st = e.state;
    if (!ours(st)) return;
    // Back with a window open closes the window and keeps the player where they are
    if (U.modal) {
      if (U.closeModal) U.closeModal();
      else U.modal = null;
      try {
        H.pushState(entry(U.screen), '');
      } catch {
        /* as above */
      }
      last = U.screen;
      if (U.render) U.render();
      return;
    }
    const from = U.screen;
    let to = reachable(st.screen);
    if (FLOW.includes(from) && U.run && !U.run.over && T.saveRun) T.saveRun(U.run); // leaving keeps the expedition
    if (to === 'mission' && U.enterMission) {
      U.screen = to;
      U.enterMission();
    }
    U.screen = to;
    popping = true;
    try {
      if (U.render) U.render();
    } finally {
      popping = false;
    }
    if (to !== st.screen) {
      try {
        H.replaceState(entry(to), '');
      } catch {
        /* as above */
      }
    }
    last = to;
  });
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
