/* ============================================================================
   TUMULT — AUDIO (browser only): Cosmic Shore's music and sound effects.
   The files are under assets/audio (assets/README.md says where each comes
   from). tools/build.mjs puts their addresses in T.AUDIO: data URIs in the
   offline file (every effect and one music loop), content-named files in the
   web version (everything, each fetched only when it is first wanted).
   Music streams through one <audio> element at a time, crossfaded, and
   follows the screen (menus, the draft, the route, a mission, a win).
   Effects are decoded once into Web Audio buffers. Until a buffer is ready,
   and wherever a file is missing, the small synth in core.js and feel.js
   still answers, so the game never goes silent and never waits for a file.
   The Audio studio (Settings) is drawn here: the mixer, the player, every
   track and every effect. Volumes and choices live in U.prefs (settings.js).
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) => U.esc(s);
  const browser = typeof window !== 'undefined' && typeof document !== 'undefined';
  const SRC = () => T.AUDIO || {};

  /* ───────────── what there is ───────────── */
  /** Moods the screens ask for; a track lists the moods it suits. */
  const MOODS = {
    menu: 'Menus',
    draft: 'Draft',
    route: 'Route',
    mission: 'Mission',
    after: 'Victory',
  };
  /** Cosmic Shore's soundtrack (its Soundtrack asset's titles), in the order its Audio Studio lists them. */
  const TRACKS = [
    { id: 'space-gliding', title: 'Space Gliding', moods: ['menu', 'route'] },
    { id: 'sky-fire', title: 'Sky Fire', moods: ['mission'] },
    { id: 'cosmic-shore-2', title: 'Cosmic Shore 2 Tune', moods: ['draft', 'route'] },
    { id: 'chill-time-3', title: 'Chill Time 3', moods: ['menu', 'route'] },
    { id: 'waited-so-long', title: "I've Waited So Long", moods: ['draft', 'menu'] },
    { id: 'cosmic-shore-3', title: 'Cosmic Shore 3', moods: ['mission'] },
    { id: 'cosmic-shore-3-loop', title: 'Cosmic Shore 3 (loop)', moods: ['mission', 'route', 'menu', 'draft'] },
    { id: 'secret-hide-away', title: 'Secret Hide Away', moods: ['menu', 'draft'] },
    { id: 'severity', title: 'Severity', moods: ['mission'] },
    { id: 'disoriented', title: 'Disoriented', moods: ['mission'] },
    { id: 'end-game-outro', title: 'End Game Outro', moods: ['after'] },
  ];
  /**
   * Every effect, by what it answers in Tumult. `files` are names under assets/audio/sfx (one is picked at
   * random each time); `rate` plays it faster or slower; `vol` trims it. The Cosmic Shore event each comes
   * from is in assets/README.md.
   */
  const SFX = [
    // menus and screens
    { id: 'click', group: 'Menus', name: 'Click', when: 'Any button', files: ['click'], vol: 0.7 },
    { id: 'confirm', group: 'Menus', name: 'Confirm', when: 'Take a card, choose an option', files: ['confirm'] },
    { id: 'denied', group: 'Menus', name: 'Denied', when: 'Something you cannot do', files: ['denied'], vol: 0.7 },
    { id: 'open', group: 'Menus', name: 'Open', when: 'A panel opens', files: ['open'], vol: 0.5 },
    {
      id: 'close',
      group: 'Menus',
      name: 'Close',
      when: 'A panel closes, back to the title',
      files: ['close'],
      vol: 0.5,
    },
    { id: 'switch', group: 'Menus', name: 'Switch', when: 'Skip a card, end the round', files: ['switch', 'switch-2'] },
    { id: 'hover', group: 'Menus', name: 'Select', when: 'Pick a pilot', files: ['hover'], vol: 0.8 },
    { id: 'letsgo', group: 'Menus', name: "Let's go", when: 'Set out, start a mission', files: ['lets-go'] },
    // the run
    {
      id: 'smallReward',
      group: 'The run',
      name: 'Small reward',
      when: 'Rewards, an objective step',
      files: ['small-reward'],
    },
    { id: 'bigReward', group: 'The run', name: 'Big reward', when: 'A mission won', files: ['big-reward'] },
    { id: 'upgrade', group: 'The run', name: 'Upgrade', when: 'Train a card', files: ['upgrade'] },
    { id: 'redeem', group: 'The run', name: 'Purchase', when: 'Buy gear', files: ['redeem'] },
    { id: 'score', group: 'The run', name: 'Readout', when: 'A forecast or tally appears', files: ['score'], vol: 0.6 },
    { id: 'goal', group: 'The run', name: 'Goal line', when: 'The whole objective done', files: ['goal'] },
    { id: 'gameOver', group: 'The run', name: 'Game over', when: 'A mission lost', files: ['game-over'] },
    { id: 'travel', group: 'The run', name: 'Boost', when: 'Sail to the next place', files: ['boost'] },
    { id: 'undo', group: 'The run', name: 'Drift back', when: 'Undo', files: ['drift-release'], vol: 0.6 },
    // combat
    { id: 'attack', group: 'Combat', name: 'Attack', when: 'A pilot strikes', files: ['laser'] },
    { id: 'foeAttack', group: 'Combat', name: 'Foe attack', when: 'An enemy strikes', files: ['laser'], rate: 0.72 },
    { id: 'impact', group: 'Combat', name: 'Impact', when: 'A blow lands', files: ['impact'] },
    { id: 'heavy', group: 'Combat', name: 'Heavy impact', when: 'A blow of 4 or more', files: ['creature-hit'] },
    {
      id: 'kill',
      group: 'Combat',
      name: 'Kill',
      when: 'An enemy falls',
      files: ['kill-1', 'kill-2', 'kill-3', 'kill-4', 'kill-5', 'kill-6'],
    },
    { id: 'downed', group: 'Combat', name: 'Downed', when: 'A pilot goes down', files: ['shield-down'] },
    { id: 'shieldUp', group: 'Combat', name: 'Shield', when: 'A shield takes a blow', files: ['shield-up'] },
    { id: 'shatter', group: 'Combat', name: 'Shatter', when: 'Something is revealed', files: ['crystal'], vol: 0.7 },
    { id: 'trap', group: 'Combat', name: 'Mine', when: 'A trap springs', files: ['mine'] },
    { id: 'boom', group: 'Combat', name: 'Explosion', when: 'A heart cracks', files: ['explosion'] },
    { id: 'spawn', group: 'Combat', name: 'Arrival', when: 'Something new on the board', files: ['spawn'], vol: 0.6 },
    { id: 'heal', group: 'Combat', name: 'Energy', when: 'Healing and resting', files: ['energy'] },
    { id: 'melee', group: 'Combat', name: 'Speed burst', when: 'A blow struck up close', files: ['speed-burst'] },
    { id: 'push', group: 'Combat', name: 'Skim', when: 'A unit is pushed or swapped', files: ['skim'], vol: 0.7 },
    {
      id: 'bump',
      group: 'Combat',
      name: 'Collide',
      when: 'A unit is thrown into something',
      files: ['bump'],
      vol: 0.7,
    },
    { id: 'pickup', group: 'Combat', name: 'Crystal', when: 'A crate, a cache, gear used', files: ['block-break'] },
    // the elements: each etherion's face, its help to an ally and its comeback
    { id: 'ether-M', group: 'Elements', name: 'Mass face', when: 'A Mass face is played', files: ['joust-mass'] },
    { id: 'ether-C', group: 'Elements', name: 'Charge face', when: 'A Charge face is played', files: ['joust-charge'] },
    { id: 'ether-S', group: 'Elements', name: 'Space face', when: 'A Space face is played', files: ['joust-space'] },
    { id: 'ether-T', group: 'Elements', name: 'Time face', when: 'A Time face is played', files: ['joust-time'] },
    {
      id: 'ally-M',
      group: 'Elements',
      name: 'Mass help',
      when: 'A Mass face helps a pilot',
      files: ['ally-mass'],
      vol: 0.6,
    },
    {
      id: 'ally-C',
      group: 'Elements',
      name: 'Charge help',
      when: 'A Charge face helps a pilot',
      files: ['ally-charge'],
      vol: 0.6,
    },
    {
      id: 'ally-S',
      group: 'Elements',
      name: 'Space help',
      when: 'A Space face helps a pilot',
      files: ['ally-space'],
      vol: 0.6,
    },
    {
      id: 'ally-T',
      group: 'Elements',
      name: 'Time help',
      when: 'A Time face helps a pilot',
      files: ['ally-time'],
      vol: 0.6,
    },
    {
      id: 'comeback-M',
      group: 'Elements',
      name: 'Mass comeback',
      when: 'A pilot rises again (Mass die)',
      files: ['comeback-mass'],
    },
    {
      id: 'comeback-C',
      group: 'Elements',
      name: 'Charge comeback',
      when: 'A pilot rises again (Charge die)',
      files: ['comeback-charge'],
    },
    {
      id: 'comeback-S',
      group: 'Elements',
      name: 'Space comeback',
      when: 'A pilot rises again (Space die)',
      files: ['comeback-space'],
    },
    {
      id: 'comeback-T',
      group: 'Elements',
      name: 'Time comeback',
      when: 'A pilot rises again (Time die)',
      files: ['comeback-time'],
    },
    {
      id: 'omni',
      group: 'Elements',
      name: 'Physical face',
      when: 'A Physical or Omni face is played',
      files: ['boost'],
      vol: 0.7,
    },
  ];
  const BY = Object.fromEntries(SFX.map((s) => [s.id, s]));

  /* ───────────── levels ───────────── */
  const P = () => U.prefs || {};
  const on = () => U.sound !== false;
  const lvl = (v) => Math.max(0, Math.min(100, Number(v) || 0)) / 100;
  /** The effects level, 0 to ~1.4: master × effects, 1 at the defaults (the synth's own scale). */
  const fxLevel = () => (on() && !P().muteFx ? lvl(P().master == null ? 100 : P().master) * (lvl(P().fx) / 0.7) : 0);
  /** The music level for an <audio> element, 0 to 1: a square law, so the slider's middle sounds like the middle. */
  const musicLevel = () =>
    on() && !P().muteMusic ? Math.min(1, lvl(P().master == null ? 100 : P().master) * Math.pow(lvl(P().music), 2)) : 0;

  /* ───────────── effects ───────────── */
  let ctx = null;
  const buf = {};
  const loading = {};
  function audioCtx() {
    if (!browser) return null;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) {
      return null;
    }
  }
  function load(file) {
    if (buf[file] || loading[file]) return;
    const url = SRC()['sfx/' + file];
    const a = audioCtx();
    if (!url || !a || typeof fetch === 'undefined') return;
    loading[file] = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((b) => new Promise((res, rej) => a.decodeAudioData(b, res, rej)))
      .then((b) => (buf[file] = b))
      .catch(() => {
        loading[file] = 'failed'; // the synth keeps answering for this one
      });
  }
  /** Fetch and decode every effect now (after the first tap or key, when the browser lets a page make sound). */
  function preload() {
    for (const s of SFX) for (const f of s.files) load(f);
  }
  /**
   * Play an effect by its id (SFX above). True when it played (or was meant to be silent); false when its
   * file is not ready, so the caller can fall back to the synth. `force` plays it even when effects are
   * muted (the Audio studio's preview), at the effects slider's level or half volume.
   */
  function cue(id, o) {
    o = o || {};
    const s = BY[id];
    if (!s || !browser) return false;
    let g = fxLevel();
    if (o.force && g <= 0) g = Math.max(0.5, lvl(P().fx) / 0.7);
    if (g <= 0) return true;
    const file = s.files[Math.floor(Math.random() * s.files.length)];
    const b = buf[file];
    if (!b) {
      load(file);
      return false;
    }
    const a = audioCtx();
    if (!a) return false;
    try {
      const src = a.createBufferSource();
      src.buffer = b;
      // a little variety: no two hits quite the same
      src.playbackRate.value = (s.rate || 1) * (o.rate || 1) * (o.exact ? 1 : 0.96 + Math.random() * 0.08);
      const gain = a.createGain();
      gain.gain.value = 0.55 * g * (s.vol == null ? 1 : s.vol) * (o.vol == null ? 1 : o.vol);
      src.connect(gain);
      gain.connect(a.destination);
      src.start(a.currentTime + Math.max(0, (o.at || 0) / 1000));
      return true;
    } catch (e) {
      return false;
    }
  }
  U.cue = cue;

  // A cue played by an action below takes the place of that action's plain click in the same moment.
  let quiet = 0;
  const hush = () => {
    quiet = Date.now() + 80;
  };
  /** Cosmic Shore's sounds in place of the synth's, where one fits; the synth stays as the fallback. */
  function swap(name, pick) {
    const synth = U.sfx && U.sfx[name];
    if (!U.sfx) return;
    U.sfx[name] = function () {
      const id = pick.apply(null, arguments);
      if (id === null) return; // answered elsewhere (the show's own cues)
      if (id && cue(id)) return;
      if (synth) synth.apply(null, arguments);
    };
  }
  if (U.sfx) {
    U.sfx.hitSynth = U.sfx.hit; // the show falls back to it while the impact file loads
    swap('click', () => (Date.now() < quiet ? null : 'click'));
    // a blow is sounded by the show (src/ui/show.js) as it lands, in time with the beam
    swap('hit', () => (U.showFx ? null : 'impact'));
    swap('heal', () => 'heal');
    swap('shield', () => 'shieldUp');
    swap('whoosh', () => 'push');
    swap('fall', () => 'kill');
    swap('tap', () => 'omni');
    swap('ether', (el) => (BY['ether-' + el] ? 'ether-' + el : 'omni'));
    swap('reveal', () => 'shatter');
    swap('trap', () => 'trap');
    swap('readout', () => 'score');
    swap('turn', () => 'switch');
    swap('goal', (done) => (done ? 'goal' : 'smallReward'));
    swap('win', () => 'bigReward');
    swap('lose', () => 'gameOver');
    // the dice keep the synth's clatter (roll, land): nothing in Cosmic Shore is a die
  }

  /** The board's other moments, from the same effects queue the feel and the show read (mission.js playFx). */
  const elOfCard = (id) => {
    const c = T.CARD && T.CARD[id];
    return c ? (c.E && c.E.elt) || c.el : null;
  };
  if (U.feelFx) {
    const feel = U.feelFx;
    const KIND = ['Shield', 'Hidden', 'Empower', 'Preempt', 'Thorns', 'Engine', 'Linked', 'Anchored'];
    let lastEl = null; // the element of the last Ethereal face played, for the help it gives
    let helped = 0;
    U.feelFx = function (m, f, ent, node, delay) {
      const r = feel.apply(this, arguments);
      const at = { at: delay || 0 };
      const hero = (uid) => m && m.heroes && m.heroes.find((x) => x.uid === uid);
      switch (f.t) {
        case 'play': {
          const c = T.CARD && T.CARD[f.card];
          lastEl = c && T.isEthFace(f.face) ? (c[f.face] && c[f.face].elt) || c.el : null;
          helped = 0;
          break;
        }
        case 'down':
          cue('downed', at);
          break;
        case 'revive': {
          const h = hero(f.ent);
          const k = h && h.rollPick && h.rollPick[0];
          const el = /^[MCST]$/.test(k || '') ? k : 'T';
          cue('comeback-' + el, at);
          break;
        }
        case 'phase2':
          cue('boom', at);
          break;
        case 'spawn':
        case 'decoy':
          cue('spawn', at);
          break;
        case 'gear':
          cue('pickup', at);
          break;
        case 'move':
          if (!f.how && f.from == null) cue('bump', at); // knocked back
          break;
        case 'state':
          // a helping state on a pilot rings in the colour of the Ethereal face that gave it, once a play
          if (lastEl && !helped && BY['ally-' + lastEl] && hero(f.ent) && KIND.includes(f.name)) {
            helped = 1;
            cue('ally-' + lastEl, at);
          }
          break;
      }
      return r;
    };
  }

  /** Actions that get a sound of their own, ahead of every screen's handler (which then skips its click). */
  const ACT_CUE = {
    takeCard: 'confirm',
    evTakeCard: 'confirm',
    amRwCard: 'confirm',
    amRwHero: 'confirm',
    kitPick: 'confirm',
    adoptPet: 'confirm',
    eventOpt: 'confirm',
    choice: 'confirm',
    skipCard: 'switch',
    evSkipCard: 'switch',
    endRound: 'switch',
    train: 'upgrade',
    upRun: 'upgrade',
    autoUpRun: 'upgrade',
    amUpCard: 'upgrade',
    amUpFace: 'upgrade',
    buyGear: 'redeem',
    sellGear: 'redeem',
    goNode: 'travel',
    undo: 'undo',
    newRun: 'letsgo',
    newRunSolo: 'letsgo',
    playNow: 'letsgo',
    continueRun: 'letsgo',
    selHero: 'hover',
    selHeroTok: 'hover',
    quitToTitle: 'close',
    toTitle: 'close',
  };
  function actCue(act) {
    const id = ACT_CUE[act];
    if (id && cue(id)) hush();
    return false; // never takes the action: the screens still do it
  }
  (U.ACTS = U.ACTS || []).unshift(actCue);

  /* ───────────── music ───────────── */
  const M = {
    el: null,
    cur: null,
    mood: null,
    pinned: false, // played from the studio: it plays to its end before the screen chooses again
    paused: false,
    started: false,
    history: [],
    fades: [],
  };
  const urlOf = (id) => SRC()['music/' + id];
  const available = () => TRACKS.filter((t) => urlOf(t.id));
  const rotation = () => {
    const off = P().musicOff || [];
    const r = available().filter((t) => !off.includes(t.id));
    return r.length ? r : available();
  };
  function moodNow() {
    const s = U.screen;
    if (s === 'mission') {
      const m = U.run && U.run.mission;
      return m && m.over && m.won ? 'after' : 'mission';
    }
    if (s === 'draft') return 'draft';
    if (s === 'map' || s === 'reward' || s === 'haven' || s === 'event') return 'route';
    if (s === 'summary') return U.run && U.run.won ? 'after' : 'route';
    return 'menu';
  }
  const fits = (t, mood) => !!t && (P().musicMode === 'shuffle' || t.moods.includes(mood));
  function pick(mood) {
    const r = rotation();
    if (!r.length) return null;
    const pool = P().musicMode === 'shuffle' ? r : r.filter((t) => t.moods.includes(mood));
    const from = pool.length ? pool : r;
    const fresh = from.filter((t) => t.id !== M.cur && !M.history.slice(-2).includes(t.id));
    const list = fresh.length
      ? fresh
      : from.filter((t) => t.id !== M.cur).length
        ? from.filter((t) => t.id !== M.cur)
        : from;
    return list[Math.floor(Math.random() * list.length)];
  }
  function fade(el, to, ms, then) {
    const from = el.volume;
    const t0 = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      try {
        el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      } catch (e) {}
      if (k >= 1) {
        clearInterval(id);
        M.fades = M.fades.filter((x) => x !== id);
        if (then) then();
      }
    }, 50);
    M.fades.push(id);
  }
  /** Start a track (crossfading from the one playing). */
  function play(id, o) {
    o = o || {};
    const t = TRACKS.find((x) => x.id === id);
    const url = t && urlOf(t.id);
    if (!browser || !url) return false;
    const old = M.el;
    if (old) {
      old.onended = null;
      fade(old, 0, o.cut ? 150 : 1400, () => {
        try {
          old.pause();
          old.removeAttribute('src');
          old.load();
        } catch (e) {}
      });
    }
    let el;
    try {
      el = new Audio();
    } catch (e) {
      return false;
    }
    el.preload = 'auto';
    el.src = url;
    el.volume = 0;
    el.loop = P().musicMode === 'one';
    el.onended = () => next(true);
    M.el = el;
    if (M.cur && M.cur !== id) M.history.push(M.cur);
    if (M.history.length > 20) M.history.shift();
    M.cur = id;
    M.pinned = !!o.pinned;
    M.paused = false;
    const go = el.play();
    if (go && go.catch) go.catch(() => (M.paused = true)); // not allowed yet: the next tap starts it
    fade(el, musicLevel(), 1400);
    refresh();
    return true;
  }
  /** The next track: the screen's choice, or anything in the rotation when shuffling. */
  function next(ended) {
    let mood = M.mood || moodNow();
    if (ended && mood === 'after') mood = 'route'; // the outro plays once
    const t = pick(mood);
    if (t) play(t.id);
  }
  function prev() {
    const id = M.history.pop();
    if (id) {
      const keep = M.cur;
      play(id, { pinned: true });
      M.history = M.history.filter((x) => x !== keep);
    } else if (M.el) M.el.currentTime = 0;
  }
  function toggle() {
    if (!M.el) return next();
    if (M.el.paused) {
      M.paused = false;
      const go = M.el.play();
      if (go && go.catch) go.catch(() => {});
      fade(M.el, musicLevel(), 400);
    } else {
      M.paused = true;
      M.el.pause();
    }
    refresh();
  }
  /** Follow the screen: a new mood changes the track unless the one playing suits it too (or was chosen). */
  function scene() {
    if (!browser) return;
    const mood = moodNow();
    const was = M.mood;
    M.mood = mood;
    if (!M.started || M.paused) return;
    const t = TRACKS.find((x) => x.id === M.cur);
    if (!M.el || !t) return next();
    if (mood !== was && !M.pinned && !fits(t, mood)) next();
    else if (mood === 'after' && was !== 'after' && !M.pinned && P().musicMode !== 'one') next();
  }
  /** Apply the volumes now (a slider moved, a mute pressed, sound switched off). */
  function sync() {
    if (M.el && !M.paused) {
      M.fades.forEach(clearInterval);
      M.fades = [];
      try {
        M.el.volume = musicLevel();
        M.el.loop = P().musicMode === 'one';
      } catch (e) {}
    }
    if (M.started && !M.el && musicLevel() > 0) next();
  }
  /** The first tap or key: the browser now lets the page make sound. */
  function unlock() {
    if (M.started) return;
    M.started = true;
    audioCtx();
    preload();
    if (M.paused && M.el) toggle();
    else scene();
  }
  if (browser) {
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
      document.addEventListener(ev, unlock, { capture: true, passive: true }),
    );
    const render = U.render;
    if (render)
      U.render = function () {
        const r = render.apply(this, arguments);
        scene();
        startTick();
        return r;
      };
  }
  U.audio = {
    TRACKS,
    SFX,
    MOODS,
    cue,
    play,
    next,
    prev,
    toggle,
    sync,
    scene,
    available,
    now: () => ({
      id: M.cur,
      track: TRACKS.find((t) => t.id === M.cur) || null,
      playing: !!(M.el && !M.el.paused),
      time: M.el ? M.el.currentTime || 0 : 0,
      dur: M.el && isFinite(M.el.duration) ? M.el.duration : 0,
      mood: M.mood,
    }),
  };

  /* ───────────── the Audio studio (Settings) ───────────── */
  const clock = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  const LEVELS = [
    ['master', 'Master', 'Everything Tumult plays', 'sound'],
    ['music', 'Music', "Cosmic Shore's soundtrack", 'muteMusic'],
    ['fx', 'Effects', 'Cards, blows, menus and the dice', 'muteFx'],
  ];
  function muted(which) {
    return which === 'master' ? !on() : !!P()[which === 'music' ? 'muteMusic' : 'muteFx'];
  }
  const speaker = (off) =>
    `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${off ? '<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'}</svg>`;
  /** One level: its mute and its slider. `compact` for the quick panel. */
  function levelRow([id, name, sub], compact) {
    const v = P()[id] == null ? (id === 'master' ? 100 : 60) : P()[id];
    const off = muted(id);
    return `<div class="au-lvl${off ? ' off' : ''}"><button class="au-mute" data-act="auMute" data-arg="${id}" aria-pressed="${off}" aria-label="${off ? 'Unmute' : 'Mute'} ${esc(name)}" data-tip="${off ? 'Unmute' : 'Mute'}">${speaker(off)}</button><span class="au-ln"><b>${esc(name)}</b>${compact ? '' : `<small>${esc(sub)}</small>`}</span><input type="range" min="0" max="100" step="5" value="${v}" data-input="auVol" data-arg="${id}" aria-label="${esc(name)} volume"><span class="au-num" data-au-num="${id}">${v}</span></div>`;
  }
  U.audioLevelsHTML = (compact) =>
    `<div class="au-levels${compact ? ' compact' : ''}">${LEVELS.map((l) => levelRow(l, compact)).join('')}</div>`;
  const MODES = [
    ['game', 'Follow the game'],
    ['shuffle', 'Shuffle all'],
    ['one', 'Repeat one'],
  ];
  function nowHTML(compact) {
    const n = U.audio.now();
    const t = n.track;
    const pct = n.dur ? Math.min(100, (n.time / n.dur) * 100) : 0;
    const title = t ? t.title : available().length ? 'Nothing playing yet' : 'No music in this file';
    const sub = t
      ? (n.playing ? 'Playing' : 'Paused') + (n.mood ? ' · ' + MOODS[n.mood] + ' screen' : '')
      : available().length
        ? 'Tap anywhere and the soundtrack starts'
        : 'The web version carries the soundtrack';
    const btn = (act, label, icon, extra) =>
      `<button class="au-tp${extra || ''}" data-act="${act}" aria-label="${label}" data-tip="${label}">${icon}</button>`;
    return `<div class="au-now${n.playing ? ' playing' : ''}${compact ? ' compact' : ''}"><div class="au-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="au-np"><span class="au-kick">Now playing</span><b class="au-title">${esc(title)}</b><small class="au-sub">${esc(sub)}</small><div class="au-bar"><span class="au-fill" style="width:${pct.toFixed(1)}%"></span></div><span class="au-time"><span data-au-t>${clock(n.time)}</span><span>${n.dur ? clock(n.dur) : '–:––'}</span></span></div><div class="au-tps">${btn('auPrev', 'Back', '⏮')}${btn('auToggle', n.playing ? 'Pause' : 'Play', n.playing ? '❚❚' : '▶', ' main')}${btn('auNext', 'Skip', '⏭')}</div></div>`;
  }
  U.audioNowHTML = nowHTML;
  function tracksHTML() {
    const off = P().musicOff || [];
    const n = U.audio.now();
    const inRot = TRACKS.filter((t) => urlOf(t.id) && !off.includes(t.id)).length;
    const rows = TRACKS.map((t, i) => {
      const has = !!urlOf(t.id);
      const ticked = has && !off.includes(t.id);
      const here = n.id === t.id;
      return `<div class="au-row${here ? ' here' : ''}${has ? '' : ' gone'}"><span class="au-i">${here && n.playing ? '<span class="au-eq sm"><i></i><i></i><i></i></span>' : String(i + 1).padStart(2, '0')}</span><button class="au-play" data-act="auPlay" data-arg="${t.id}" ${has ? '' : 'disabled'} aria-label="Play ${esc(t.title)} now"><b>${esc(t.title)}</b><small>${has ? t.moods.map((m) => MOODS[m]).join(' · ') : 'In the web version'}</small></button><button class="au-tick${ticked ? ' on' : ''}" data-act="auRot" data-arg="${t.id}" ${has ? '' : 'disabled'} role="switch" aria-checked="${ticked}" aria-label="${esc(t.title)} in the rotation" data-tip="${ticked ? 'In the rotation' : 'Left out of the rotation'}">${ticked ? '✓' : ''}</button></div>`;
    }).join('');
    return `<div class="au-tracks-head"><span class="au-count">${inRot} of ${available().length} in rotation</span><div class="seg" role="group" aria-label="What plays next">${MODES.map(([id, name]) => `<button class="${(P().musicMode || 'game') === id ? 'on' : ''}" aria-pressed="${(P().musicMode || 'game') === id}" data-act="auMode" data-arg="${id}">${esc(name)}</button>`).join('')}</div></div><div class="au-tracks">${rows}</div>`;
  }
  function sfxHTML() {
    const groups = [...new Set(SFX.map((s) => s.group))];
    return groups
      .map(
        (g) =>
          `<div class="au-group"><span class="au-gl">${esc(g)}</span><div class="au-pads">${SFX.filter(
            (s) => s.group === g,
          )
            .map(
              (s) =>
                `<button class="au-pad${s.files.some((f) => SRC()['sfx/' + f]) ? '' : ' gone'}" data-act="auSfx" data-arg="${s.id}" aria-label="Preview ${esc(s.name)}"><span class="au-pi">▶</span><b>${esc(s.name)}</b><small>${esc(s.when)}</small></button>`,
            )
            .join('')}</div></div>`,
      )
      .join('');
  }
  /** The Audio studio: Settings' Audio tab. */
  U.audioStudioHTML = function () {
    return `<div class="au-studio"><div class="au-side"><section class="st-card au-card"><span class="lab gold">Mixer</span>${U.audioLevelsHTML(false)}</section>
      <section class="st-card au-card"><span class="lab gold">Player</span>${nowHTML(false)}</section></div>
      <section class="st-card au-card au-sound"><span class="lab gold">Soundtrack</span>${tracksHTML()}<small class="dim">Follow the game plays what suits the screen: calm in the menus, the draft and on the route, harder in a mission, the outro after a win. Untick a track to leave it out.</small></section>
      <section class="st-card au-card au-fx"><span class="lab gold">Effects</span><small class="dim">Press one to hear it. Every one is Cosmic Shore's, played where it fits in Tumult.</small>${sfxHTML()}</section></div>`;
  };

  /** Keep the player's clock and bar moving while it is on screen, without redrawing the page. */
  function refresh() {
    if (!browser) return;
    document.querySelectorAll('.au-now').forEach((box) => {
      box.outerHTML = nowHTML(box.classList.contains('compact'));
    });
    const list = document.querySelector('.au-tracks');
    if (list) {
      const head = document.querySelector('.au-tracks-head');
      const wrap = document.createElement('div');
      wrap.innerHTML = tracksHTML();
      if (head) head.replaceWith(wrap.firstElementChild);
      list.replaceWith(wrap.lastElementChild);
    }
    startTick();
  }
  // only while a player is on screen and music is playing, so a closed page or a test leaves no timer running
  let ticking = null;
  function tick() {
    const boxes = browser ? document.querySelectorAll('.au-now') : [];
    if (!boxes.length || !M.el || M.el.paused) {
      clearInterval(ticking);
      ticking = null;
      return;
    }
    const n = U.audio.now();
    boxes.forEach((box) => {
      const f = box.querySelector('.au-fill');
      const t = box.querySelector('[data-au-t]');
      if (f && n.dur) f.style.width = ((n.time / n.dur) * 100).toFixed(1) + '%';
      if (t) t.textContent = clock(n.time);
      if (t && t.nextElementSibling && n.dur) t.nextElementSibling.textContent = clock(n.dur);
    });
  }
  function startTick() {
    if (!ticking && browser && M.el && !M.el.paused && document.querySelector('.au-now'))
      ticking = setInterval(tick, 500);
  }

  function save() {
    if (U.savePrefs) U.savePrefs();
  }
  function studioAct(act, arg) {
    switch (act) {
      case 'auMute':
        if (arg === 'master') U.sound = !on();
        else if (arg === 'music') P().muteMusic = !P().muteMusic;
        else P().muteFx = !P().muteFx;
        save();
        sync();
        redraw();
        if (arg !== 'music') cue('click');
        return true;
      case 'auPlay':
        M.started = true;
        play(arg, { pinned: true });
        return true;
      case 'auToggle':
        M.started = true;
        toggle();
        return true;
      case 'auNext':
        M.started = true;
        M.pinned = false;
        next();
        return true;
      case 'auPrev':
        M.started = true;
        prev();
        return true;
      case 'auMode':
        P().musicMode = arg;
        save();
        sync();
        refresh();
        return true;
      case 'auRot': {
        const off = new Set(P().musicOff || []);
        if (off.has(arg)) off.delete(arg);
        else off.add(arg);
        P().musicOff = [...off];
        save();
        refresh();
        return true;
      }
      case 'auSfx':
        if (!cue(arg, { force: true })) {
          // not decoded yet: fetch it and play it the moment it is here
          const s = BY[arg];
          if (s) s.files.forEach(load);
          setTimeout(() => cue(arg, { force: true }), 250);
        }
        return true;
    }
    return false;
  }
  function redraw() {
    if (!browser) return;
    document.querySelectorAll('.au-levels').forEach((box) => {
      box.outerHTML = U.audioLevelsHTML(box.classList.contains('compact'));
    });
    if (U.screen !== 'settings' && !(U.modal && U.modal.side)) U.render();
  }
  function studioInput(name, value, el) {
    if (name !== 'auVol' || !el) return false;
    const id = el.getAttribute('data-arg');
    P()[id] = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    document.querySelectorAll(`[data-au-num="${id}"]`).forEach((n) => (n.textContent = P()[id]));
    save();
    sync();
    if (id !== 'music') {
      clearTimeout(studioInput.t);
      studioInput.t = setTimeout(() => cue('click'), 60); // hear the level as you set it
    }
    return true;
  }
  (U.ACTS = U.ACTS || []).push(studioAct);
  (U.INPUTS = U.INPUTS || []).push(studioInput);
})((window.T = window.T || {}));
