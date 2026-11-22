/* ============================================================================
   TUMULT — FEEL (browser only)
   What a mission looks and sounds like, beyond what it is: the hour-long day
   passing over the board, round by round; the place's wind and fog drawn on
   it; the Terminal's readout as a round begins; plays, hits, shields and
   falls answered by a flash on the board and a sound. Nothing here touches
   the mission: it reads the mission and its effects queue (m.fx), and draws.
   Sound is a small synth (WebAudio), so the build stays one file with no
   assets and no network.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) => U.esc(s);
  // anything less than Full motion (the player's pick in Look, else the system's setting: src/ui/sea.js)
  const reduced = () => (U.motion ? U.motion() !== 'full' : false);

  /* ───────────── the day ───────────── */
  /**
   * A day on Tumult lasts about an hour (docs/LORE.md), so a mission sees it pass: each round is about ten
   * minutes, and six rounds make a day. Where in the day a mission starts follows from its seed, so the same
   * mission always starts at the same hour. Only the look changes; no rule reads the time of day.
   */
  U.DAY = [
    { id: 'dawn', name: 'Dawn', icon: '◓', tip: 'The light comes up fast: a day on Tumult lasts about an hour.' },
    { id: 'morning', name: 'Morning', icon: '☀', tip: 'Full light. Each round is about ten minutes of the day.' },
    { id: 'noon', name: 'Noon', icon: '☀', tip: 'The sun stands high; shadows are short.' },
    {
      id: 'afternoon',
      name: 'Afternoon',
      icon: '☀',
      tip: 'The light starts to lean. Night is never far away on Tumult.',
    },
    { id: 'dusk', name: 'Dusk', icon: '◒', tip: 'The light goes as fast as it came.' },
    { id: 'night', name: 'Night', icon: '☾', tip: 'Night on Tumult is short: dawn is a few rounds away.' },
  ];
  const seedHour = (m) => {
    const s = String(m.seed != null ? m.seed : m.title || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % U.DAY.length;
  };
  U.dayOf = (m) => U.DAY[(seedHour(m) + Math.max(1, m.round) - 1) % U.DAY.length];
  U.dayPill = (m) => {
    const d = U.dayOf(m);
    return `<span class="pill day day-${d.id}" data-tip="${esc(`<b>${d.name}</b><div>${d.tip}</div><div class="dim small">The time of day changes nothing in play.</div>`)}">${d.icon} ${d.name}</span>`;
  };

  /* ───────────── the sky and the weather over the board ───────────── */
  function layer(host, id, before) {
    let el = host.querySelector('#' + id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      host.insertBefore(el, before || null);
    }
    return el;
  }
  /** Lay the hour and the weather over the board, and give the Terminal's readout when a round begins. */
  U.feelUpdate = function (m) {
    const host = document.getElementById('board');
    if (!host) return;
    const banner = document.getElementById('banner');
    const d = U.dayOf(m);
    // the light falls on the ground under the board (the painting), the weather blows over it
    const sky = layer(host, 'sky', host.querySelector('svg'));
    sky.className = 'sky sky-' + d.id;
    const pl = m.place || {};
    const wx = layer(host, 'wx', banner);
    const kind = pl.weather === 'wind' ? 'wind ' + (pl.wind > 0 ? 'to-e' : 'to-a') : pl.weather === 'fog' ? 'fog' : '';
    if (wx.dataset.kind !== kind) {
      wx.dataset.kind = kind;
      wx.className = 'wx' + (kind ? ' wx-' + kind : '');
      wx.innerHTML = kind.startsWith('wind') ? streaks() : '';
    }
    U.windBed(pl.weather === 'wind' && !m.over);
    // the readout, once a round, as it begins
    const key = m.round + ':' + (m.over ? 'over' : '');
    if (U.ms && U.ms.readout !== key && !m.over) {
      U.ms.readout = key;
      readout(host, readoutText(m, d));
    }
  };
  /** A few gusts, each its own length, height and pace, so the wind reads as wind and not as a pattern. */
  function streaks() {
    let html = '';
    for (let i = 0; i < 16; i++) {
      const top = 4 + Math.random() * 92;
      const len = 60 + Math.random() * 160;
      const dur = 1.6 + Math.random() * 2.2;
      const del = -Math.random() * dur;
      const op = 0.12 + Math.random() * 0.22;
      html += `<i style="top:${top.toFixed(1)}%;width:${len.toFixed(0)}px;animation-duration:${dur.toFixed(2)}s;animation-delay:${del.toFixed(2)}s;opacity:${op.toFixed(2)}"></i>`;
    }
    return html;
  }
  function readoutText(m, d) {
    if (m.round <= 1) {
      const pg = m.page && T.PAGE_BY[m.page];
      const pl = m.place || {};
      const parts = [pg ? pg.name.toUpperCase() : (m.title || '').toUpperCase()];
      if (pg) parts.push(pg.gravity + ' G' + (pg.gravity > 1.5 ? ' · UPHILL' : pg.gravity < 0.7 ? ' · DOWNHILL' : ''));
      if (pl.weather === 'wind') parts.push(pl.wind > 0 ? 'WIND → E' : 'WIND ← A');
      if (pl.weather === 'fog') parts.push('FOG');
      parts.push(d.name.toUpperCase());
      return 'GUIDE LOG · ' + parts.join(' · ');
    }
    return `ROUND ${m.round} · ${d.name.toUpperCase()}${m.clock ? ' · ' + m.clock.value + ' LEFT' : ''}`;
  }
  function readout(host, text) {
    let el = host.querySelector('.readout');
    if (!el) {
      el = document.createElement('div');
      el.className = 'readout';
      host.appendChild(el);
    }
    el.classList.remove('show');
    el.textContent = '> ' + text;
    // restart the type-in
    void el.offsetWidth;
    el.style.setProperty('--chars', String(text.length + 2));
    el.classList.add('show');
    U.sfx.readout();
  }

  /* ───────────── effects on the board ───────────── */
  const SVGNS = 'http://www.w3.org/2000/svg';
  function fxLayer() {
    const svg = U.ms && U.ms.svg;
    if (!svg) return null;
    let g = svg.querySelector('#fxlayer');
    if (!g) {
      g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('id', 'fxlayer');
      svg.appendChild(g);
    }
    return g;
  }
  function burst(node, cls, delay, ms) {
    const m = U.run && U.run.mission;
    const g = fxLayer();
    if (!m || !g || node == null || !m.board.nodes[node] || reduced()) return;
    const geo = U.ms.g;
    setTimeout(() => {
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', geo.px(m.board.nodes[node]));
      c.setAttribute('cy', geo.py(m.board.nodes[node]));
      c.setAttribute('r', 26);
      c.setAttribute('class', 'burst ' + cls);
      g.appendChild(c);
      setTimeout(() => c.remove(), ms || 900);
    }, delay || 0);
  }
  function flash(uid, cls, delay) {
    const el = U.ms && U.ms.svg && U.ms.svg.querySelector('#tok-' + uid);
    // a flash is not movement: it stays on Reduced (without the shake, feel.css) and goes only on Off
    if (!el || (U.motion && U.motion() === 'off')) return;
    setTimeout(() => {
      el.classList.remove(cls);
      el.getBoundingClientRect(); // restart the animation
      el.classList.add(cls);
      setTimeout(() => el.classList.remove(cls), 600);
    }, delay || 0);
  }
  const elOfPlay = (f) => {
    const c = T.CARD && T.CARD[f.card];
    if (!c || f.face !== 'E') return null;
    return (c.E && c.E.elt) || c.el;
  };
  /**
   * Answer one effect from the queue with a flash and a sound. Called by the mission screen for each effect as
   * it plays them (mission.js playFx), with the entity and node it found and the delay it chose.
   */
  U.feelFx = function (m, f, ent, node, delay) {
    switch (f.t) {
      case 'play': {
        const h = m.heroes.find((x) => x.uid === f.hero);
        const el = elOfPlay(f);
        if (h) burst(h.pos, el ? 'play el-' + el : 'play', delay);
        setTimeout(() => (el ? U.sfx.ether(el) : U.sfx.tap()), delay);
        break;
      }
      case 'dmg':
        if (ent) flash(ent.uid, 'hit', delay);
        burst(node, 'dmg', delay, 600);
        break;
      case 'shielded':
        if (ent) flash(ent.uid, 'blocked', delay);
        setTimeout(() => U.sfx.shield(), delay);
        break;
      case 'state':
        if (node != null && U.floater) {
          const k = U.kwOfState && U.kwOfState(f.name);
          U.floater(
            node,
            '+' + (U.stateName ? U.stateName(f.name) : f.name),
            'state ' + (k ? 'kw-' + k.tone : ''),
            delay,
          );
        }
        break;
      case 'roll':
        rollTray(m, f, delay);
        break;
      case 'move':
        if (f.how === 'forced' || f.how === 'swap') setTimeout(() => U.sfx.whoosh(), delay);
        break;
      case 'death':
        burst(node, 'death', delay, 1100);
        setTimeout(() => U.sfx.fall(), delay);
        break;
      case 'heal':
        burst(node, 'heal', delay, 800);
        break;
      case 'decoy':
      case 'zone':
      case 'trapSet':
        burst(f.node, 'set', delay, 800);
        break;
    }
  };

  /* ───────────── the dice rolling ───────────── */
  /**
   * When a pilot's new dice come up, they are rolled where everyone can see them: the dice tumble across a tray
   * on the board in their own shapes (the plain d20, an element's d8, the ethereal d12), flicker through faces
   * they could show, and land one after another on the faces the engine rolled. Then each is dealt into the
   * pilot's hand. The faces shown while tumbling are for show only; the result was settled by the engine.
   */
  const faceGlyph = (f) => U.faceGlyph(f);
  function rollTray(m, f, delay) {
    const host = typeof document !== 'undefined' && document.getElementById('board');
    const hi = m.heroes.findIndex((h) => h.uid === f.hero);
    const h = m.heroes[hi];
    if (!h || !f.faces || !f.faces.length) return;
    const kinds = f.kinds || f.faces.map(() => 'plain');
    const at = f.at || [];
    // the new dice in the hand are dealt in as each one lands
    const deal = (j, ms) =>
      setTimeout(() => {
        const d = document.querySelector(`.mission .die[data-arg="${hi}|${at[j]}"]`);
        if (!d) return;
        d.classList.remove('fresh');
        d.getBoundingClientRect();
        d.classList.add('fresh');
        setTimeout(() => d.classList.remove('fresh'), 700);
      }, ms);
    if (!host || reduced()) {
      at.forEach((_, j) => deal(j, delay));
      return;
    }
    setTimeout(() => {
      let tray = host.querySelector('#rolltray');
      if (!tray) {
        tray = document.createElement('div');
        tray.id = 'rolltray';
        tray.className = 'rolltray';
        host.appendChild(tray);
      }
      const row = document.createElement('div');
      row.className = 'rollrow';
      row.innerHTML =
        `<span class="who">${esc(h.name)}</span>` +
        f.faces
          .map((face, j) => {
            const sides = U.dieSides(kinds[j]);
            return `<span class="rdie d${sides} k-${kinds[j]}" style="--j:${j}" data-face="${face}">${U.dieSVG(kinds[j])}<i class="rf">${faceGlyph(face)}</i><i class="rs">d${sides}</i></span>`;
          })
          .join('');
      tray.appendChild(row);
      const dice = [...row.querySelectorAll('.rdie')];
      dice.forEach((el, j) => {
        const could = T.dieFaces(h, kinds[j]);
        const face = el.querySelector('.rf');
        const flick = setInterval(() => {
          face.innerHTML = faceGlyph(could[Math.floor(Math.random() * could.length)]);
        }, 70);
        const land = 620 + j * 140;
        setTimeout(() => {
          clearInterval(flick);
          face.innerHTML = faceGlyph(f.faces[j]);
          el.classList.add('landed', 'f-' + f.faces[j]);
          if (j === dice.length - 1 && U.sfx.land) U.sfx.land();
        }, land);
        deal(j, land + 700);
      });
      const done = 620 + dice.length * 140 + 1000;
      setTimeout(() => row.classList.add('gone'), done);
      setTimeout(() => {
        row.remove();
        if (!tray.children.length) tray.remove();
      }, done + 400);
    }, delay || 0);
  }

  /* ───────────── the objective answering back ───────────── */
  /**
   * When the objective moves forward, the board says so: a gold banner names what was done and fills a bar
   * from where the objective stood to where it stands now, gold rings go out from where it happened, and a
   * rising chime plays. It reads T.objectiveProgress before and after each update, so it answers any kind of
   * objective, a partner's progress online as well, and the hold counted at the end of a round.
   */
  const obNodes = (m) => {
    const out = {};
    for (const n of Object.values(m.board.nodes)) if (n.objective) out[n.id] = JSON.stringify(n.objective);
    return out;
  };
  const carriers = (m) => m.heroes.filter((h) => !h.downed && h.carrying).length;
  function obSnap(m) {
    return {
      p: T.objectiveProgress ? T.objectiveProgress(m) : 0,
      ob: JSON.stringify(m.objective || {}),
      nodes: obNodes(m),
      carry: carriers(m),
      ramp: !!m.board.ramp,
    };
  }
  /** In words, what just moved the objective forward. */
  function obNews(m, was, now) {
    const a = JSON.parse(was.ob);
    const b = m.objective || {};
    const up = (k) => (b[k] || 0) > (a[k] || 0);
    if (m.won) return 'Objective complete';
    switch (b.kind) {
      case 'hold':
        return 'The beacon holds';
      case 'valve':
        return 'The valve turns';
      case 'vault':
        if (up('done')) return 'A seal breaks';
        if (now.ramp && !was.ramp) return 'The ramp is down';
        if (up('leverDone')) return 'The winch turns';
        break;
      case 'find':
        if (b.found && !a.found) return 'The real cache';
        if (up('done')) return 'Digging it out';
        return 'Not this one';
      case 'salvage':
        if (up('done')) return 'Crate brought home';
        if (now.carry > was.carry) return 'Crate lifted';
        break;
    }
    return 'The objective moves';
  }
  /** Where it happened: the objective's spaces that changed, else the objective's own space. */
  function obWhere(m, was, now) {
    const changed = Object.keys(now.nodes).filter((k) => now.nodes[k] !== was.nodes[k]);
    for (const k of Object.keys(was.nodes)) if (!(k in now.nodes) && !changed.includes(k)) changed.push(k);
    const ids = changed.filter((k) => m.board.nodes[k]).map((k) => m.board.nodes[k].id);
    if (ids.length) return ids;
    const ob = m.objective || {};
    if (ob.kind === 'salvage') return m.heroes.filter((h) => !h.downed && h.carrying).map((h) => h.pos);
    return ob.node != null ? [ob.node] : [];
  }
  /**
   * Compare the objective with how it stood at the last update, and answer when it moved forward. Returns
   * the news, or null. The mission screen calls it at the top of each update (mission.js updateMission).
   */
  U.objectiveCheck = function (m) {
    const ms = U.ms;
    if (!ms || !m) return null;
    const now = obSnap(m);
    const was = ms.obSnap;
    ms.obSnap = now;
    if (!was || now.p <= was.p + 1e-6) return null;
    // chipping at a target's vitality is answered by the hit itself; only its fall is news
    if (m.objective && m.objective.kind === 'kill' && !m.won) return null;
    const news = { text: obNews(m, was, now), from: was.p, to: now.p, where: obWhere(m, was, now), done: !!m.won };
    ms.obJust = Date.now() + 1400;
    showGoal(news);
    return news;
  };
  function showGoal(news) {
    const host = document.getElementById('board');
    if (host) {
      let el = host.querySelector('#goal');
      if (!el) {
        el = document.createElement('div');
        el.id = 'goal';
        host.appendChild(el);
      }
      const pct = (x) => Math.round(100 * Math.max(0, Math.min(1, x))) + '%';
      el.className = 'goal' + (news.done ? ' done' : '');
      el.innerHTML = `<div class="goal-card"><div class="goal-kick">◎ Objective</div><div class="goal-txt">${esc(news.text)}</div><div class="goal-bar" style="--from:${pct(news.from)};--to:${pct(news.to)}"><i></i></div><div class="goal-pct">${pct(news.to)}</div></div>`;
      el.getBoundingClientRect(); // restart the animation
      el.classList.add('show');
      clearTimeout(showGoal.t);
      showGoal.t = setTimeout(() => el.classList.remove('show'), 2200);
    }
    news.where.forEach((n, i) => {
      burst(n, 'goal', i * 90, 1100);
      burst(n, 'goal goal-2', 220 + i * 90, 1200);
    });
    if (U.floater && news.where.length) U.floater(news.where[0], '◎', 'goal', 0);
    if (U.sfx.goal) U.sfx.goal(news.done);
  }

  /* ───────────── sound ───────────── */
  // a small synth: oscillators and filtered noise through one master gain; nothing is loaded
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  function audio() {
    if (!U.sound || typeof window === 'undefined') return null;
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume();
      master.gain.value = 0.9 * (U.fxGain ? U.fxGain() : 1); // the mixer in Settings (src/ui/audio.js)
      return ctx;
    } catch (e) {
      return null;
    }
  }
  function tone(freq, dur, { type = 'sine', vol = 0.04, at = 0, to = null, attack = 0.005 } = {}) {
    const a = audio();
    if (!a) return;
    const t0 = a.currentTime + at;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  function noise(dur, { vol = 0.05, at = 0, type = 'bandpass', freq = 1200, to = null, q = 1 } = {}) {
    const a = audio();
    if (!a) return;
    const t0 = a.currentTime + at;
    const s = a.createBufferSource();
    s.buffer = noiseBuf;
    const f = a.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    f.Q.value = q;
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f);
    f.connect(g);
    g.connect(master);
    s.start(t0, Math.random() * 0.5);
    s.stop(t0 + dur + 0.02);
  }
  const SFX = {
    // dice: a handful of clicks on a hard surface
    roll: () => {
      for (let i = 0; i < 6; i++)
        noise(0.03, { vol: 0.05, at: i * 0.045 + Math.random() * 0.02, freq: 2400 + i * 300, q: 4 });
      tone(660, 0.06, { type: 'triangle', vol: 0.015, at: 0.3 });
    },
    // a body blow: a falling thump and a scuff
    hit: () => {
      tone(150, 0.2, { to: 45, vol: 0.09 });
      noise(0.12, { vol: 0.05, type: 'lowpass', freq: 900 });
    },
    shield: () => {
      tone(880, 0.25, { type: 'square', vol: 0.012 });
      tone(1320, 0.3, { type: 'sine', vol: 0.02 });
      noise(0.05, { vol: 0.03, freq: 4000, q: 6 });
    },
    whoosh: () => noise(0.3, { vol: 0.05, freq: 300, to: 1800, q: 2 }),
    fall: () => {
      tone(300, 0.5, { to: 70, type: 'triangle', vol: 0.05 });
      noise(0.4, { vol: 0.03, type: 'lowpass', freq: 600, to: 120 });
    },
    tap: () => tone(1100, 0.05, { type: 'triangle', vol: 0.02 }),
    // the last die settling: a soft knock and a bright tick
    land: () => {
      noise(0.05, { vol: 0.05, type: 'lowpass', freq: 1400 });
      tone(990, 0.08, { type: 'triangle', vol: 0.018, at: 0.02 });
    },
    // each etherion's own colour of sound: Mass deep, Charge buzzing, Space airy, Time a bell
    ether: (el) => {
      if (el === 'M') {
        tone(98, 0.5, { vol: 0.07, attack: 0.04 });
        tone(196, 0.4, { vol: 0.03, attack: 0.04 });
      } else if (el === 'C') {
        tone(440, 0.25, { type: 'sawtooth', vol: 0.02 });
        tone(447, 0.25, { type: 'sawtooth', vol: 0.02 });
        noise(0.15, { vol: 0.02, freq: 3000, q: 8 });
      } else if (el === 'S') {
        tone(1320, 0.5, { vol: 0.025, attack: 0.08 });
        tone(1980, 0.6, { vol: 0.015, attack: 0.12 });
        noise(0.4, { vol: 0.015, freq: 5000, q: 1 });
      } else if (el === 'T') {
        tone(880, 0.9, { vol: 0.035 });
        tone(880 * 2.76, 0.6, { vol: 0.012 });
        tone(880 * 5.4, 0.3, { vol: 0.006 });
      } else {
        [523, 659, 784].forEach((f, i) => tone(f, 0.4, { vol: 0.025, at: i * 0.05 }));
      }
    },
    readout: () => {
      for (let i = 0; i < 4; i++) tone(1600 + i * 120, 0.03, { type: 'square', vol: 0.006, at: i * 0.04 });
    },
    // the objective moved: a rising major arpeggio over a soft shimmer; the whole objective rings longer
    goal: (done) => {
      const notes = done ? [523, 659, 784, 1047, 1319] : [587, 740, 880, 1175];
      notes.forEach((f, i) => tone(f, 0.5, { type: 'triangle', vol: 0.035, at: i * 0.07 }));
      tone(notes[notes.length - 1] * 2, 0.9, { vol: 0.012, at: notes.length * 0.07 });
      noise(0.6, { vol: 0.012, freq: 6000, q: 1, at: 0.1 });
    },
    turn: () => {
      tone(587, 0.18, { vol: 0.03 });
      tone(880, 0.3, { vol: 0.03, at: 0.12 });
    },
  };
  // the old beeps stay where nothing better answers; the rest are replaced
  Object.assign(U.sfx, SFX);

  // a bed of wind under a windy mission: filtered noise that rises and falls, very quiet
  let bed = null;
  U.windBed = function (on) {
    on = on && U.sound && U.screen === 'mission';
    if (!on) {
      if (bed) {
        try {
          bed.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
          const b = bed;
          setTimeout(() => b.s.stop(), 1200);
        } catch (e) {}
        bed = null;
      }
      return;
    }
    if (bed) return;
    const a = audio();
    if (!a) return;
    try {
      const s = a.createBufferSource();
      s.buffer = noiseBuf;
      s.loop = true;
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 420;
      const g = a.createGain();
      g.gain.value = 0.0001;
      g.gain.setTargetAtTime(0.022, a.currentTime, 1.2);
      const lfo = a.createOscillator();
      const lg = a.createGain();
      lfo.frequency.value = 0.09;
      lg.gain.value = 180;
      lfo.connect(lg);
      lg.connect(f.frequency);
      s.connect(f);
      f.connect(g);
      g.connect(master);
      s.start();
      lfo.start();
      bed = { s, g };
    } catch (e) {}
  };
})((window.T = window.T || {}));
