/* ============================================================================
   TUMULT — SETTINGS (browser only)
   The full page under ⚙ (Frogma "live preview"): tabs for Look and sound,
   Play, Accessibility, Account and Keys, with a real board and real cards
   beside them that change as you change the theme, the motion or the text
   size. And the quick panel a mission's ☰ opens (Frogma "Settings 2"): the
   few things changed mid-game, in one slide-over, the mission dimmed behind.
   The sea's theme, accent and motion are kept by src/ui/sea.js
   (tumult_v2_look); the rest here in tumult_v2_prefs. No rule reads them.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) => U.esc(s);
  const KEY = 'tumult_v2_prefs';

  /**
   * fx: how loud the sound effects are (0 to 100); text: 's', 'm', 'l' or 'xl'; hints: 'young' (the how-to
   * line in the first two missions), 'always' or 'never'; confirmEnd: ask before ending a round with 4+ AP
   * banked; contrast: stronger lines and text. The sound (src/ui/audio.js): sound is the master switch, master,
   * music and fx the three levels (0 to 100), muteMusic and muteFx their mutes, musicMode what plays next
   * ('game' follows the screen, 'shuffle', 'one' repeats), musicOff the tracks left out of the rotation.
   */
  const BASE = {
    fx: 70,
    text: 'm',
    hints: 'young',
    confirmEnd: true,
    contrast: false,
    sound: true,
    master: 100,
    music: 60,
    muteMusic: false,
    muteFx: false,
    musicMode: 'game',
    musicOff: [],
  };
  U.prefs = (() => {
    try {
      const got = JSON.parse(localStorage.getItem(KEY) || '{}');
      const p = Object.assign({}, BASE);
      if (Number.isFinite(got.fx)) p.fx = Math.max(0, Math.min(100, Math.round(got.fx)));
      if (['s', 'm', 'l', 'xl'].includes(got.text)) p.text = got.text;
      if (['young', 'always', 'never'].includes(got.hints)) p.hints = got.hints;
      if (typeof got.confirmEnd === 'boolean') p.confirmEnd = got.confirmEnd;
      if (typeof got.contrast === 'boolean') p.contrast = got.contrast;
      for (const k of ['master', 'music'])
        if (Number.isFinite(got[k])) p[k] = Math.max(0, Math.min(100, Math.round(got[k])));
      for (const k of ['sound', 'muteMusic', 'muteFx']) if (typeof got[k] === 'boolean') p[k] = got[k];
      if (['game', 'shuffle', 'one'].includes(got.musicMode)) p.musicMode = got.musicMode;
      if (Array.isArray(got.musicOff)) p.musicOff = got.musicOff.filter((x) => typeof x === 'string').slice(0, 50);
      return p;
    } catch {
      return Object.assign({}, BASE, { musicOff: [] });
    }
  })();
  function savePrefs() {
    try {
      localStorage.setItem(KEY, JSON.stringify(U.prefs));
    } catch {
      /* no storage: the settings last for this page */
    }
  }
  U.savePrefs = savePrefs;
  // the 🔊 buttons on every screen switch U.sound: it is the master switch, kept with the other settings
  Object.defineProperty(U, 'sound', {
    configurable: true,
    enumerable: true,
    get: () => U.prefs.sound !== false,
    set: (v) => {
      U.prefs.sound = !!v;
      savePrefs();
      if (U.audio) U.audio.sync();
    },
  });
  const TEXT = { s: 0.92, m: 1, l: 1.12, xl: 1.25 };
  /** Put the settings that change the page on it: the text size and contrast. Called after every render. */
  U.prefsApply = function () {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--text-scale', TEXT[U.prefs.text]);
    root.setAttribute('data-text', U.prefs.text);
    root.classList.toggle('contrast', !!U.prefs.contrast);
  };
  /** Whether the mission shows its one-line how-to above the board (src/ui/mission.js asks). */
  U.showHints = function (run) {
    const h = U.prefs.hints;
    if (h === 'never') return false;
    if (h === 'always') return true;
    return !run || !run.stats || (run.stats.missions || 0) < 2;
  };

  /* ───────────── controls ───────────── */
  const toggle = (act, on, label, sub, arg) =>
    `<div class="st-row"><span class="st-l"><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><button class="tog${on ? ' on' : ''}" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-act="${act}"${arg ? ` data-arg="${arg}"` : ''}></button></div>`;
  const seg = (act, cur, opts, label) =>
    `<div class="seg" role="group" aria-label="${esc(label)}">${opts.map(([id, name]) => `<button class="${cur === id ? 'on' : ''}" aria-pressed="${cur === id}" data-act="${act}" data-arg="${id}">${esc(name)}</button>`).join('')}</div>`;
  function themes() {
    const cur = U.look.theme;
    const sw = (id, name, bg) =>
      `<button class="st-theme${cur === id ? ' on' : ''}" data-act="lookTheme" data-arg="${id}" aria-pressed="${cur === id}"><span class="st-sw" style="background:${bg}"></span>${esc(name)}</button>`;
    return `<div class="st-themes">${sw('auto', 'Follow the route', 'linear-gradient(135deg,#cfe3e2,#0a2238 45%,#03201a 70%,#2a1840)')}${U.SEA_THEMES.map((t) => sw(t.id, t.name, t.sw)).join('')}</div>`;
  }
  function motionSeg() {
    return seg(
      'lookMotion',
      U.motion(),
      U.MOTIONS.map((m) => [m.id, m.name]),
      'Motion',
    );
  }
  const fxSlider = () =>
    `<div class="st-row"><span class="st-l"><b>Effects</b><small>Dice, hits and the rest</small></span><input type="range" min="0" max="100" step="5" value="${U.prefs.fx}" data-input="prefFx" aria-label="Effects volume"><span class="st-num">${U.prefs.fx}</span></div>`;

  const TABS = [
    ['look', 'Look'],
    ['audio', 'Audio studio'],
    ['play', 'Play'],
    ['access', 'Accessibility'],
    ['account', 'Account'],
    ['keys', 'Keys'],
  ];
  function tabBody(tab) {
    if (tab === 'audio') return U.audioStudioHTML ? U.audioStudioHTML() : '';
    if (tab === 'look')
      return `<section class="st-card"><span class="lab gold">Theme</span>${themes()}</section>
        <section class="st-card"><span class="lab gold">Accent</span><div class="st-accents">${U.ACCENTS.map((a) => `<button class="${U.look.accent === a.id ? 'on' : ''}" style="--c:${a.c}" data-act="lookAccent" data-arg="${a.id}" aria-pressed="${U.look.accent === a.id}">${esc(a.name)}</button>`).join('')}</div><small class="dim">The colour of the one button that moves you on.</small></section>
        <section class="st-card"><span class="lab gold">Motion</span>${motionSeg()}<small class="dim">${esc(U.MOTIONS.find((m) => m.id === U.motion()).txt)}</small>${U.look.motion ? '<button class="linkish small" data-act="lookMotion" data-arg="system">Follow this device</button>' : ''}</section>
        <section class="st-card"><span class="lab gold">Sound</span>${toggle('toggleSound', !!U.sound, 'Sound', U.sound ? 'On' : 'Off')}<div class="st-row"><span class="st-l"><b>Audio studio</b><small>The mixer, the soundtrack and every effect</small></span><button class="ghost" data-act="settingsTab" data-arg="audio">Open</button></div></section>`;
    if (tab === 'play') {
      const meta = T.loadMeta();
      return `<section class="st-card"><span class="lab gold">On the board</span><div class="st-row"><span class="st-l"><b>Hints on the map</b><small>The one-line help above the board</small></span>${seg(
        'prefHints',
        U.prefs.hints,
        [
          ['young', 'First missions'],
          ['always', 'Always'],
          ['never', 'Never'],
        ],
        'Hints',
      )}</div>${toggle('prefConfirm', U.prefs.confirmEnd, 'Confirm End Round', 'Only when a pilot still has 4 or more AP banked')}</section>
        <section class="st-card"><span class="lab gold">Story</span>${toggle('canonAsk', meta.askCanon !== false, 'Ask canon questions', 'A question when you draft a pilot or reach a place; you can always skip it')}</section>`;
    }
    if (tab === 'access')
      return `<section class="st-card"><span class="lab gold">Text size</span>${seg(
        'prefText',
        U.prefs.text,
        [
          ['s', 'Small'],
          ['m', 'Medium'],
          ['l', 'Large'],
          ['xl', 'Larger'],
        ],
        'Text size',
      )}</section>
        <section class="st-card"><span class="lab gold">Seeing it</span>${toggle('prefContrast', U.prefs.contrast, 'Stronger contrast', 'Brighter lines and text on every screen')}${toggle('lookMotion', U.motion() === 'off', 'Stop all motion', 'Nothing moves; the log and the forecast still say what happened', U.motion() === 'off' ? 'full' : 'off')}</section>`;
    if (tab === 'account') {
      const user = T.Account && T.Account.user ? T.Account.user() : null;
      const made = T.loadMade().length;
      return `<section class="st-card"><span class="lab gold">You</span>${user ? `<div class="st-row"><span class="st-l"><b>${esc(user.name || 'Signed in')}</b><small>Signed in. Your pilots and canon go with you.</small></span><button class="ghost" data-act="accountSignOut">Sign out</button></div>` : `<div class="st-row"><span class="st-l"><b>Playing as a guest</b><small>Everything is kept on this device. Solo play never needs an account.</small></span>${T.Account ? '<button class="ghost" data-act="accountSignIn">Sign in</button>' : ''}</div>`}</section>
        <section class="st-card"><span class="lab gold">On this device</span><div class="st-row"><span class="st-l"><b>${made} pilot${made === 1 ? '' : 's'} made</b><small>Kept with the crew under Pilots</small></span><button class="ghost" data-act="tab" data-arg="pilots">Open the crew</button></div><div class="st-row"><span class="st-l"><b>${T.loadCanon().length} canon notes</b><small>Copy them to send them on</small></span><button class="ghost" data-act="canonList">Copy or send</button></div></section>`;
    }
    const keys = [
      ['Ctrl Z', 'Undo the last step or play (in a mission)'],
      ['E', 'End the round'],
      ['Tab', 'Next pilot'],
      ['Esc', 'Cancel a target, close a panel'],
    ];
    return `<section class="st-card"><span class="lab gold">In a mission</span>${keys.map(([k, t]) => `<div class="st-row"><kbd>${esc(k)}</kbd><span class="st-l"><b>${esc(t)}</b></span></div>`).join('')}</section>`;
  }
  /** The live preview: a small board as a mission draws it, and real cards, under the settings chosen now. */
  function preview() {
    const page = T.ATLAS[1] || T.ATLAS[0];
    const cards = (T.PREBUILTS[0] || { cards: [] }).cards.slice(0, 4);
    return `<aside class="st-preview"><span class="lab">Live preview</span><div class="st-board">${U.dioramaHTML ? U.atlasMapSVG(page) : ''}</div><div class="st-cards">${cards.map((c) => U.relicMini(c, { act: 'noop' })).join('')}</div><button class="cta" data-act="noop" tabindex="-1">Continue ▶</button></aside>`;
  }
  U.settingsTab = U.settingsTab || 'look';
  U.renderSettings = function () {
    const tab = U.settingsTab;
    const tabs = TABS.map(
      ([id, name]) =>
        `<button class="${tab === id ? 'on' : ''}" data-act="settingsTab" data-arg="${id}" aria-pressed="${tab === id}">${esc(name)}</button>`,
    ).join('');
    return U.shell(
      '',
      `<div class="page settings"><div class="pg-head"><h1>Settings</h1><div class="chips" role="group" aria-label="Section">${tabs}</div></div>${tab === 'audio' ? tabBody(tab) : `<div class="st-cols"><div class="st-left">${tabBody(tab)}</div>${preview()}</div>`}</div>`,
    );
  };

  /* ───────────── the quick panel (a mission's ☰) ───────────── */
  U.quickHTML = function () {
    const meta = T.loadMeta();
    const cur = U.look.theme;
    const sw = U.SEA_THEMES.map(
      (t) =>
        `<button class="qk-sw${cur === t.id ? ' on' : ''}" style="background:${t.sw}" data-act="lookTheme" data-arg="${t.id}" aria-label="${esc(t.name)}" aria-pressed="${cur === t.id}" data-tip="${esc(t.name)}"></button>`,
    ).join('');
    const inRun = U.run && U.run.mission && !U.run.mission.over;
    return `<div class="quick"><div class="qk-head"><h3>Quick settings</h3><button class="ghost" data-act="closeModal" aria-label="Close">✕</button></div>
      <span class="lab">Theme</span><div class="qk-themes"><button class="qk-sw auto${cur === 'auto' ? ' on' : ''}" data-act="lookTheme" data-arg="auto" aria-label="Follow the route" aria-pressed="${cur === 'auto'}" data-tip="Follow the route"></button>${sw}</div>
      ${U.audioLevelsHTML ? `<span class="lab">Sound</span>${U.audioNowHTML(true)}${U.audioLevelsHTML(true)}<button class="linkish small" data-act="settings" data-arg="audio">Open the Audio studio</button>` : toggle('toggleSound', !!U.sound, 'Sound', U.sound ? 'On' : 'Off') + fxSlider()}
      ${toggle('prefHintsQuick', U.showHints(U.run), 'Hints on the map', 'The one-line help above the board')}
      ${toggle('canonAsk', meta.askCanon !== false, 'Ask canon questions', 'A question when you draft a pilot (can be skipped)')}
      ${toggle('prefConfirm', U.prefs.confirmEnd, 'Confirm End Round', 'Only when a pilot still has AP')}
      ${toggle('lookMotion', U.motion() !== 'full', 'Reduce motion', '', U.motion() !== 'full' ? 'full' : 'reduced')}
      <div class="qk-out">${inRun ? '<button class="ghost" data-act="help">? How to play</button>' : ''}${U.extraReport ? '<button class="ghost" data-act="ptReport">⚑ Report a problem</button>' : ''}<button class="ghost" data-act="settings">All settings</button>${inRun ? U.titleBtn().replace('ghost sm', 'ghost danger') : ''}</div></div>`;
  };
  U.openQuick = function () {
    if (U.ms) U.ms.menu = false;
    U.openModal(U.quickHTML(), null, { side: true });
  };
  /** Redraw what is open: the quick panel in place, else the page. */
  function redraw() {
    if (U.seaApply) U.seaApply();
    U.prefsApply();
    if (U.modal && U.modal.side) {
      U.modal.html = U.quickHTML();
      const box = document.querySelector('.modal .quick');
      if (box) box.outerHTML = U.modal.html;
      return;
    }
    if (U.screen === 'settings') U.render();
  }
  U.prefsInput = function (name, value) {
    if (name !== 'prefFx') return false;
    U.prefs.fx = Math.max(0, Math.min(100, Number(value) || 0));
    savePrefs();
    const num = document.querySelector('.st-num');
    if (num) num.textContent = U.prefs.fx;
    if (U.sfx && U.sfx.click) U.sfx.click();
    return true;
  };
  /** Settings actions. Look's own (theme, accent, motion) are answered by src/ui/sea.js, then redrawn here. */
  U.settingsAct = function (act, arg) {
    switch (act) {
      case 'settings':
        if (U.modal) U.closeModal();
        if (arg) U.settingsTab = arg;
        if (U.screen !== 'settings') U.settingsFrom = U.screen;
        U.screen = 'settings';
        U.render();
        return true;
      case 'quick':
        U.openQuick();
        return true;
      case 'settingsTab':
        U.settingsTab = arg;
        U.render();
        return true;
      case 'prefText':
        U.prefs.text = arg;
        break;
      case 'prefHints':
        U.prefs.hints = arg;
        break;
      case 'prefHintsQuick':
        U.prefs.hints = U.showHints(U.run) ? 'never' : 'always';
        break;
      case 'prefConfirm':
        U.prefs.confirmEnd = !U.prefs.confirmEnd;
        break;
      case 'prefContrast':
        U.prefs.contrast = !U.prefs.contrast;
        break;
      case 'noop':
        return true;
      default: {
        // the look, the sound and canon questions, answered here while the page or the quick panel is open
        const here = U.screen === 'settings' || (U.modal && U.modal.side);
        if (!here) return false;
        if (/^look(Theme|Accent|Motion)$/.test(act)) {
          if (U.seaAct) U.seaAct(act, arg);
          redraw();
          return true;
        }
        if (act === 'toggleSound') U.sound = !U.sound;
        else if (act === 'canonAsk') {
          const meta = T.loadMeta();
          meta.askCanon = meta.askCanon === false;
          T.saveMeta(meta);
        } else return false;
        redraw();
        return true;
      }
    }
    savePrefs();
    redraw();
    if (U.screen === 'mission' && U.updateMission) U.updateMission();
    return true;
  };
  /** The effects level for the synth in core.js and feel.js: master × effects, 1 at the defaults; 0 when muted. */
  U.fxGain = () =>
    U.prefs.sound === false || U.prefs.muteFx
      ? 0
      : (U.prefs.master / 100) * (U.prefs.fx / 70) * (U.prefs.fx > 0 ? 1 : 0);
  (U.ACTS = U.ACTS || []).push(U.settingsAct);
  (U.INPUTS = U.INPUTS || []).push(U.prefsInput);
  (U.SCREENS = U.SCREENS || {}).settings = U.renderSettings;
})((window.T = window.T || {}));
