/* ============================================================================
   TUMULT — THE SEA AROUND THE BOARD (browser only)
   The page behind every screen is water: a deep gradient, slow glows, sea
   lines drifting across it, a little light coming down and motes rising.
   Four themes (Deep Sea, Shore, Glow, Storm), four accents, and how much moves
   (Full, Reduced, Off). By default the theme follows the expedition down the
   route: Shore in the shallows, Deep Sea mid-route, Glow in the deep stops,
   Storm at the Heart, a little darker every stop. A player can pin one.
   The look is kept for this browser in tumult_v2_look. Nothing here reads or
   writes a rule: the map art, the board and the cards stay as they are.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) => U.esc(s);
  const KEY = 'tumult_v2_look';

  /** The seas. `sw` is the swatch shown in the Look panel. */
  U.SEA_THEMES = [
    { id: 'deep', name: 'Deep Sea', desc: 'Navy water, cyan sea lines. The middle of the route.', sw: '#0a2238' },
    { id: 'shore', name: 'Shore', desc: 'The light twin: foam and sand, for daylight. The shallows.', sw: '#cfe3e2' },
    { id: 'glow', name: 'Glow', desc: 'Near black, with living light. The deep stops.', sw: '#03201a' },
    { id: 'storm', name: 'Storm', desc: 'Violet and rough, faster water. The Heart.', sw: '#2a1840' },
  ];
  U.ACCENTS = [
    { id: 'tide', name: 'Tide', c: '#1f8ea3' },
    { id: 'jade', name: 'Jade', c: '#2fbf8a' },
    { id: 'ruby', name: 'Ruby', c: '#e8475e' },
    { id: 'gold', name: 'Gold', c: '#f0c35a' },
  ];
  U.MOTIONS = [
    { id: 'full', name: 'Full', txt: 'Everything moves: the sea, the dice, the walks and the hits.' },
    {
      id: 'reduced',
      name: 'Reduced',
      txt: 'The sea drifts slowly with no motes; moves and hits are short fades, with no shake or tumbling dice.',
    },
    { id: 'off', name: 'Off', txt: 'Nothing moves. The log and the forecast still say what happened.' },
  ];
  const THEME_BY = Object.fromEntries(U.SEA_THEMES.map((t) => [t.id, t]));
  const ACCENT_BY = Object.fromEntries(U.ACCENTS.map((a) => [a.id, a]));
  const MOTION_BY = Object.fromEntries(U.MOTIONS.map((x) => [x.id, x]));

  /** theme: 'auto' (follows the route) or a theme id; motion: null (follows the system) or a motion id. */
  U.look = (() => {
    const base = { theme: 'auto', accent: 'tide', motion: null };
    try {
      const got = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (got.theme !== 'auto' && !THEME_BY[got.theme]) delete got.theme;
      if (!ACCENT_BY[got.accent]) delete got.accent;
      if (!MOTION_BY[got.motion]) delete got.motion;
      return Object.assign(base, got);
    } catch {
      return base;
    }
  })();
  function saveLook() {
    try {
      localStorage.setItem(KEY, JSON.stringify(U.look));
    } catch {
      /* no storage: the look lasts for this page */
    }
  }
  const systemReduced = () =>
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** How much moves: 'full', 'reduced' or 'off'. The player's pick, else the system's reduce-motion setting. */
  U.motion = () => U.look.motion || (systemReduced() ? 'reduced' : 'full');

  /**
   * How far down the route the expedition is, 0 at the first stop to 1 at the Heart, and the sea that goes
   * with it. Off a route (the title, the codex) it is the Deep Sea at no depth.
   */
  U.seaDepth = function (run) {
    const map = run && run.map;
    const node = map && run.nodeId != null ? map.all[run.nodeId] : null;
    if (!node || !map.rows || map.rows.length < 2) return { depth: 0, theme: 'deep' };
    const last = map.rows.length - 1;
    const depth = Math.max(0, Math.min(1, node.row / last));
    const theme = node.row >= last ? 'storm' : depth < 0.3 ? 'shore' : depth < 0.65 ? 'deep' : 'glow';
    return { depth, theme };
  };
  /** The sea in use now: the pinned theme, or the one the route has reached. */
  U.seaNow = function () {
    const onRoute = U.run && !U.run.over && U.screen !== 'title';
    const d = onRoute ? U.seaDepth(U.run) : { depth: 0, theme: 'deep' };
    return U.look.theme === 'auto' ? d : { depth: 0, theme: U.look.theme };
  };

  /* ───────────── the water itself ───────────── */
  // a wave every 240 px; each line slides two waves left and starts again, so the drift never jumps
  function wave(y, amp, width) {
    let d = `M0 ${y} Q 60 ${y - amp} 120 ${y}`;
    for (let x = 240; x <= width; x += 120) d += ` T ${x} ${y}`;
    return d;
  }
  // a fixed scatter (no randomness): the same sea every time the page opens
  const LINES = [
    [96, 6, 38, 0.9, 1],
    [190, 11, 52, 0.55, 1.5],
    [286, 16, 44, 0.75, 1],
    [380, 6, 60, 0.45, 1.5],
    [474, 11, 48, 0.8, 1],
    [570, 16, 56, 0.5, 1.5],
    [664, 6, 40, 0.7, 1],
    [760, 11, 64, 0.4, 1.5],
    [854, 14, 46, 0.6, 1],
    [948, 8, 58, 0.45, 1.5],
  ];
  const MOTES = [
    [27, 64, 1],
    [79, 69, 7],
    [18, 52, 1],
    [4, 70, 8],
    [33, 50, 3],
    [57, 77, 5],
    [31, 56, 13],
    [13, 61, 3],
    [5, 83, 12],
    [62, 58, 4],
    [69, 68, 1],
    [92, 81, 5],
    [74, 63, 8],
    [45, 88, 10],
    [86, 55, 6],
    [52, 66, 11],
  ];
  function seaHTML() {
    const W = 1600;
    const lines = LINES.map(
      ([y, amp, dur, op, sw]) =>
        `<g class="sea-line" style="animation-duration:calc(var(--sea-spd) * ${dur}s);opacity:${op}"><path d="${wave(y, amp, W + 480)}" fill="none" stroke-width="${sw}"/></g>`,
    ).join('');
    const motes = MOTES.map(
      ([x, y, d]) => `<i class="sea-mote" style="left:${x}%;top:${y}%;animation-delay:-${d}s"></i>`,
    ).join('');
    return (
      `<div class="sea-blob b1"></div><div class="sea-blob b2"></div><div class="sea-blob b3"></div>` +
      `<div class="sea-ray r1"></div><div class="sea-ray r2"></div><div class="sea-ray r3"></div>` +
      `<svg class="sea-lines" viewBox="0 0 ${W} 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${lines}</svg>` +
      `<div class="sea-motes">${motes}</div><div class="sea-dark"></div>`
    );
  }
  /**
   * Put the look on the page: the sea behind #app (made once), and the theme, accent and motion as attributes
   * on the root element that the styles read (src/ui/sea.css). Called after every render (core.js U.render).
   */
  U.seaApply = function () {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const now = U.seaNow();
    const motion = U.motion();
    root.setAttribute('data-sea', now.theme);
    root.setAttribute('data-accent', U.look.accent);
    root.setAttribute('data-motion', motion);
    root.classList.toggle('calm', motion !== 'full');
    root.style.setProperty('--sea-depth', now.depth.toFixed(2));
    let sea = document.getElementById('sea');
    if (!sea && document.body) {
      sea = document.createElement('div');
      sea.id = 'sea';
      sea.setAttribute('aria-hidden', 'true');
      sea.innerHTML = seaHTML();
      document.body.insertBefore(sea, document.body.firstChild);
    }
  };

  /* ───────────── the Look panel ───────────── */
  U.lookHTML = function () {
    const L = U.look;
    const route = U.seaNow();
    const auto = `<button class="lk-theme${L.theme === 'auto' ? ' on' : ''}" data-act="lookTheme" data-arg="auto" aria-pressed="${L.theme === 'auto'}"><span class="lk-sw lk-auto"></span><span><b>Follow the route</b><span class="dim small">Shore in the shallows, Deep Sea mid-route, Glow in the deep stops, Storm at the Heart, darker every stop.${L.theme === 'auto' ? ' Now: ' + esc(THEME_BY[route.theme].name) + '.' : ''}</span></span></button>`;
    const themes = U.SEA_THEMES.map(
      (t) =>
        `<button class="lk-theme${L.theme === t.id ? ' on' : ''}" data-act="lookTheme" data-arg="${t.id}" aria-pressed="${L.theme === t.id}"><span class="lk-sw" style="background:${t.sw}"></span><span><b>${esc(t.name)}</b><span class="dim small">${esc(t.desc)}</span></span></button>`,
    ).join('');
    const accents = U.ACCENTS.map(
      (a) =>
        `<button class="lk-accent${L.accent === a.id ? ' on' : ''}" data-act="lookAccent" data-arg="${a.id}" aria-pressed="${L.accent === a.id}" style="--c:${a.c}">${esc(a.name)}</button>`,
    ).join('');
    const cur = U.motion();
    const motions = U.MOTIONS.map(
      (x) =>
        `<button class="lk-motion${cur === x.id ? ' on' : ''}" data-act="lookMotion" data-arg="${x.id}" aria-pressed="${cur === x.id}">${esc(x.name)}</button>`,
    ).join('');
    const sys = U.look.motion
      ? '<button class="linkish small" data-act="lookMotion" data-arg="system">Follow this device\'s setting</button>'
      : '<span class="mute small">Following this device\'s reduce-motion setting until you pick one.</span>';
    return `<div class="look"><div class="row"><h3 style="margin:0">Look</h3><button class="sm right" data-act="closeModal">Done</button></div>
      <div class="lk-sec">Sea</div><div class="lk-themes">${auto}${themes}</div>
      <div class="lk-sec">Accent</div><div class="lk-accents">${accents}</div>
      <div class="lk-sec">Motion</div><div class="lk-motions" role="group" aria-label="Motion">${motions}</div>
      <p class="dim small" style="margin:6px 0 0">${esc(MOTION_BY[cur].txt)}</p>${sys}
      <p class="mute small">Only the look changes: the board, its map art and every rule stay the same.</p></div>`;
  };
  U.openLook = function () {
    U.openModal(U.lookHTML());
  };
  function redrawLook() {
    U.seaApply();
    const box = document.querySelector('.modal .look');
    if (box) box.parentElement.innerHTML = U.lookHTML();
    if (U.modal) U.modal.html = U.lookHTML();
  }
  /** The Look panel's buttons; core.js asks here before its own switch. Returns true when it took the action. */
  U.seaAct = function (act, arg) {
    switch (act) {
      case 'look':
        if (U.ms) U.ms.menu = false;
        U.openLook();
        return true;
      case 'lookTheme':
        if (arg !== 'auto' && !THEME_BY[arg]) return true;
        U.look.theme = arg;
        break;
      case 'lookAccent':
        if (!ACCENT_BY[arg]) return true;
        U.look.accent = arg;
        break;
      case 'lookMotion':
        U.look.motion = MOTION_BY[arg] ? arg : null;
        break;
      default:
        return false;
    }
    saveLook();
    redrawLook();
    return true;
  };
})((window.T = window.T || {}));
