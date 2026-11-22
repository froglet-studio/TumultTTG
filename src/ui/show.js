/* ============================================================================
   TUMULT — THE SHOW (browser only)
   Every blow of a mission played out where the player can see it, in the
   spirit of a card duel and a dark-fantasy fight (Frogma "In-game screen",
   B, The Stack, picked 2026-11-22): the card being played is held up, the
   striker lunges, a bolt or a slash crosses the board, the target flashes,
   a big number lands, a toast logs it; a slow serif banner marks a foe
   felled, a pilot fallen and each new round, and a round ends with its
   tally and any feat worth naming. The board drags and zooms on a PC.
   It reads the mission and its effects queue (m.fx) and draws; it never
   touches the mission, so nothing here can change an outcome.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) => U.esc(s);
  const $ = (s, r) => (r || document).querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const full = () => (U.motion ? U.motion() === 'full' : true);
  const later = (ms, fn) => setTimeout(fn, Math.max(0, ms));

  /* ───────────── where things are ───────────── */
  const unitOf = (m, uid) =>
    uid == null
      ? null
      : m.heroes.find((h) => h.uid === uid) ||
        m.enemies.find((e) => e.uid === uid) ||
        (m.decoys || []).find((d) => d.uid === uid) ||
        (m.pets || []).find((p) => p.uid === uid);
  const isFoe = (m, uid) => m.enemies.some((e) => e.uid === uid);
  const nameOf = (m, uid) => {
    const u = unitOf(m, uid);
    return u ? u.name || (T.ENEMIES[u.type] && T.ENEMIES[u.type].name) || '' : '';
  };
  const boardPt = (m, pos) => {
    const n = pos != null && m.board.nodes[pos];
    const g = U.ms && U.ms.g;
    return n && g ? [g.px(n), g.py(n)] : null;
  };
  /** The layer the show draws on inside the board's SVG, above the tokens. */
  function layer() {
    const svg = U.ms && U.ms.svg;
    if (!svg) return null;
    let l = svg.querySelector('#showfx');
    if (!l) {
      l = document.createElementNS(NS, 'g');
      l.setAttribute('id', 'showfx');
      svg.appendChild(l);
    }
    return l;
  }
  /** The overlay over the board for cards, banners, toasts and the round's tally. */
  function overlay() {
    const wrap = $('.mission .boardwrap');
    if (!wrap) return null;
    let o = $('#mshow', wrap);
    if (!o) {
      o = document.createElement('div');
      o.id = 'mshow';
      o.innerHTML = '<div class="sh-toasts" aria-live="polite"></div>';
      wrap.appendChild(o);
    }
    return o;
  }
  function put(html, ms, cls) {
    const o = overlay();
    if (!o) return;
    const d = document.createElement('div');
    d.className = cls;
    d.innerHTML = html;
    o.appendChild(d);
    later(ms, () => d.remove());
  }
  /** A class on a token for a moment: .atk for a blow, .hit for a hit taken. */
  function flashTok(uid, cls, ms) {
    const el = U.ms && U.ms.svg && U.ms.svg.querySelector('#tok-' + uid);
    if (!el) return;
    el.classList.remove(cls);
    el.getBoundingClientRect && el.getBoundingClientRect();
    el.classList.add(cls);
    later(ms, () => el.classList.remove(cls));
  }

  /* ───────────── the pieces ───────────── */
  function beam(m, from, to, side, melee) {
    const a = boardPt(m, from),
      b = boardPt(m, to),
      l = layer();
    if (!a || !b || !l) return;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'sh-beam ' + side + (melee ? ' melee' : ''));
    if (melee) {
      // a slash across the target
      g.innerHTML = [-38, -22, -52]
        .map(
          (r, i) =>
            `<line class="sl s${i}" x1="${b[0] - 34}" y1="${b[1] - 6 + i * 8}" x2="${b[0] + 34}" y2="${b[1] - 6 + i * 8}" transform="rotate(${r} ${b[0]} ${b[1]})"/>`,
        )
        .join('');
    } else {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      g.innerHTML = `<line class="ln" x1="${a[0]}" y1="${a[1] - 8}" x2="${b[0]}" y2="${b[1] - 8}" style="stroke-dasharray:${len};stroke-dashoffset:${len}"/><circle class="bo" r="9" cx="${a[0]}" cy="${a[1] - 8}"><animate attributeName="cx" from="${a[0]}" to="${b[0]}" dur="0.3s" fill="freeze"/><animate attributeName="cy" from="${a[1] - 8}" to="${b[1] - 8}" dur="0.3s" fill="freeze"/></circle>`;
    }
    l.appendChild(g);
    later(700, () => g.remove());
  }
  function impact(m, pos, cls) {
    const b = boardPt(m, pos),
      l = layer();
    if (!b || !l) return;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'sh-imp ' + (cls || ''));
    g.setAttribute('transform', `translate(${b[0]} ${b[1] - 6})`);
    g.innerHTML = '<circle class="fl" r="40"/><circle class="rg" r="30"/><circle class="rg r2" r="30"/>';
    l.appendChild(g);
    later(800, () => g.remove());
  }
  /** A felled foe's body stays a moment to wither outside-in and drop its heart. */
  function wither(m, e) {
    const b = boardPt(m, e.pos),
      l = layer();
    if (!b || !l || !U.foeArt) return;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'sh-wither die');
    g.innerHTML = U.foeArt(e, U.foeWidth(e), { x: b[0], y: b[1] - 4 });
    l.appendChild(g);
    later(1900, () => g.remove());
  }
  function shake(big) {
    const b = $('.mission .board');
    if (!b) return;
    b.classList.remove('sh-shake', 'sh-shake2');
    b.getBoundingClientRect();
    b.classList.add(big ? 'sh-shake2' : 'sh-shake');
    later(480, () => b.classList.remove('sh-shake', 'sh-shake2'));
  }
  /** The card being played, held up: the pilot's on the left, a foe's on the right. */
  function castCard(side, kicker, name, text, art) {
    if (!full()) return;
    put(
      `<span class="ck">${esc(kicker)}</span><span class="cn">${esc(name)}</span>${art ? `<div class="ca">${art}</div>` : ''}${text ? `<span class="ct">${text}</span>` : ''}`,
      1300,
      'sh-cast ' + side,
    );
  }
  /** A slow serif title across the board. */
  U.showBand = function (title, sub, cls) {
    put(`<b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`, 2700, 'sh-band ' + (cls || ''));
  };
  /** One line in the blow-by-blow feed (the last three stay a few seconds). */
  function toast(title, sub, cls) {
    const o = overlay();
    const box = o && $('.sh-toasts', o);
    if (!box) return;
    const d = document.createElement('div');
    d.className = 'sh-toast ' + (cls || '');
    d.innerHTML = `<i></i><span><b>${esc(title)}</b>${sub ? ' ' + esc(sub) : ''}</span>`;
    box.appendChild(d);
    while (box.children.length > 3) box.firstChild.remove();
    later(6000, () => d.remove());
  }

  /* ───────────── the round's tally ───────────── */
  const fresh = () => ({ dealt: 0, taken: 0, blocked: 0, felled: 0, falls: 0, first: false });
  function tally() {
    U.ms.tally = U.ms.tally || fresh();
    return U.ms.tally;
  }
  function feat(t, m) {
    const left = T.liveEnemies(m).length;
    if (t.felled >= 2) return ['MULTI-FELL', t.felled + ' foes felled in one round.'];
    if (t.taken === 0 && left && t.dealt + t.blocked > 0) return ['UNTOUCHED', 'A whole enemy turn without a scratch.'];
    if (t.blocked >= 3) return ['SHIELD WALL', t.blocked + ' damage turned aside by shields.'];
    if (t.dealt >= 8) return ['ONSLAUGHT', t.dealt + ' damage dealt in a single round.'];
    return null;
  }
  function summary(m, round, at) {
    const t = tally();
    U.ms.tally = fresh();
    U.ms.tally.first = t.first;
    if (!t.dealt && !t.taken && !t.blocked && !t.felled) return 0;
    const f = feat(t, m);
    later(at, () => {
      put(
        `<div class="sk">Round ${round - 1} resolved</div><div class="sn">${f ? f[0] : 'The line holds'}</div><div class="row"><div><b>${t.dealt}</b>dealt</div><div><b>${t.taken}</b>taken</div><div><b>${t.blocked}</b>blocked</div><div><b>${t.felled}</b>felled</div></div>${f ? `<div class="acc">${esc(f[1])}</div>` : ''}`,
        3400,
        'sh-sum',
      );
      if (f) toast(f[0], f[1], 'gold');
    });
    return 3400;
  }

  /* ───────────── the effects queue ───────────── */
  /**
   * Called by the mission screen for each new effect, in order, with the delay it would play at. Returns the
   * delay what follows should wait for, so a foe's blow has time to be seen before the next one.
   */
  U.showFx = function (m, f, ent, node, delay) {
    if (!U.ms) return delay;
    const t = tally();
    switch (f.t) {
      case 'play': {
        const h = m.heroes.find((x) => x.uid === f.hero);
        const c = T.CARD && T.CARD[f.card];
        const face = c && c[f.face];
        if (h && face) {
          const txt = face.txt ? U.kw(esc(face.txt(T.heroP(h, f.card), T.heroE(h, f.card)))) : '';
          later(delay, () => castCard('hero', h.name + ' plays', face.n, txt, U.cardArt ? U.cardArt(c, false) : ''));
          return delay + (full() ? 280 : 0);
        }
        return delay;
      }
      case 'dmg': {
        const foeHit = isFoe(m, f.ent);
        const by = f.by != null ? unitOf(m, f.by) : null;
        const byFoe = by && isFoe(m, f.by);
        if (foeHit) t.dealt += f.amount;
        else if (m.heroes.some((h) => h.uid === f.ent)) t.taken += f.amount;
        let d = delay;
        if (by && by.pos != null && full()) {
          const melee =
            by.pos === node || (T.Board && T.Board.adjacent ? !!T.Board.adjacent(m.board, by.pos, node) : false);
          if (byFoe) {
            const said = (U.ms.intentsSeen && U.ms.intentsSeen[f.by]) || '';
            const move = said.split(/[\s]*[→(,]/)[0].trim() || 'Strikes';
            later(d, () =>
              castCard(
                'foe',
                by.name,
                move,
                `→ ${esc(nameOf(m, f.ent))} · ${f.amount}`,
                U.foeArt ? U.foeArt(by, 150) : '',
              ),
            );
            d += 520;
          }
          later(d, () => {
            flashTok(f.by, 'atk', 720);
            beam(m, by.pos, node, byFoe ? 'foe' : 'hero', melee);
          });
          d += 300;
        }
        later(d, () => {
          impact(m, node, byFoe ? 'foe' : 'hero');
          flashTok(f.ent, 'hit', 520);
          if (full()) shake(f.amount >= 4);
          if (by) toast(`${nameOf(m, f.by)} · ${f.amount}`, `hits ${nameOf(m, f.ent)}.`, byFoe ? 'rd' : 'cy');
        });
        return d;
      }
      case 'shielded':
        t.blocked += f.blocked || 0;
        later(delay, () => toast('BLOCKED ' + (f.blocked || ''), `${nameOf(m, f.ent)}'s shield takes it.`, 'cy'));
        return delay;
      case 'miss':
        later(delay, () => toast('MISSED', `${nameOf(m, f.ent)} is not where the blow lands.`, 'cy'));
        return delay;
      case 'death': {
        const e = m.enemies.find((x) => x.uid === f.ent);
        if (!e) return delay;
        t.felled++;
        const first = !t.first;
        t.first = true;
        const nm = (e.name || '').toUpperCase();
        later(delay, () => {
          wither(m, Object.assign({}, e, { pos: f.pos != null ? f.pos : e.pos }));
          if (full()) shake(true);
          toast(nm + ' FELLED', 'It withers outside-in; its heart drops as one Etherion.', 'gold');
          if (first) toast('FIRST BLOOD', 'The first of the tide falls.', 'gold');
        });
        later(delay + 500, () =>
          U.showBand(nm + ' FELLED', e.boss ? 'The Heart is still' : 'Its heart drops as one Etherion'),
        );
        return delay;
      }
      case 'down': {
        const h = unitOf(m, f.ent);
        t.falls++;
        later(delay, () => U.showBand((h ? h.name.toUpperCase() : 'A PILOT') + ' HAS FALLEN', 'Downed', 'red'));
        return delay;
      }
      case 'revive': {
        const h = unitOf(m, f.ent);
        later(delay, () => U.showBand((h ? h.name.toUpperCase() : 'A PILOT') + ' RISES', 'Back in the fight', 'cyan'));
        return delay;
      }
      case 'phase2':
        later(delay, () => U.showBand('THE HEART CRACKS', 'Half-dead, it floods the Vault', 'red'));
        return delay;
      case 'round': {
        const at = delay + 400;
        const was = summary(m, f.round, at);
        later(at + (was ? 3500 : 300), () => U.showBand('ROUND ' + f.round, 'The tide comes on', 'violet'));
        return delay;
      }
      case 'over':
        later(delay + 300, () =>
          U.showBand(
            f.won ? 'VICTORY' : 'DEFEAT',
            f.won ? 'Mission complete' : 'Tumult keeps this one',
            f.won ? '' : 'red',
          ),
        );
        return delay;
    }
    return delay;
  };
  /** What each foe has declared, kept from the last drawing so its blow can be named after the turn moves on. */
  U.showRemember = function (m) {
    const seen = {};
    m.enemies.forEach((e) => {
      if (e.intent) seen[e.uid] = e.intent.label;
    });
    U.ms.intentsSeen = Object.assign(U.ms.intentsSeen || {}, seen);
  };

  /* ───────────── the camera: drag to pan, wheel to zoom (a PC; the buttons work anywhere) ───────────── */
  /**
   * The board's view, as a part of its full drawing: zoom 1 is the whole board. It changes the SVG's viewBox,
   * so everything drawn on the board, and everything placed over it from the viewBox, follows.
   */
  U.cameraOn = function (host, svg, W, H) {
    if (!host || !svg) return;
    const cam = (U.ms.cam = U.ms.cam && U.ms.cam.W === W && U.ms.cam.H === H ? U.ms.cam : { x: 0, y: 0, z: 1, W, H });
    const apply = () => {
      const w = W / cam.z,
        h = H / cam.z;
      cam.x = Math.max(-W * 0.25, Math.min(W - w + W * 0.25, cam.x));
      cam.y = Math.max(-H * 0.25, Math.min(H - h + H * 0.25, cam.y));
      if (cam.z <= 1.001) {
        cam.x = (W - w) / 2;
        cam.y = (H - h) / 2;
      }
      svg.setAttribute('viewBox', `${cam.x.toFixed(1)} ${cam.y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
      const pc = host.querySelector('.camz .pc');
      if (pc) pc.textContent = Math.round(cam.z * 100) + '%';
      host.classList.toggle('zoomed', cam.z > 1.001);
    };
    // from a point on the screen to a point in the board's drawing
    const toBoard = (cx, cy) => {
      const r = svg.getBoundingClientRect();
      const w = W / cam.z,
        h = H / cam.z;
      const s = Math.min(r.width / w, r.height / h) || 1;
      const ox = r.left + (r.width - w * s) / 2,
        oy = r.top + (r.height - h * s) / 2;
      return [cam.x + (cx - ox) / s, cam.y + (cy - oy) / s, s];
    };
    const zoomAt = (cx, cy, k) => {
      const [bx, by] = toBoard(cx, cy);
      const z = Math.max(1, Math.min(3, cam.z * k));
      // keep the point under the pointer where it is
      cam.x = bx - ((bx - cam.x) * cam.z) / z;
      cam.y = by - ((by - cam.y) * cam.z) / z;
      cam.z = z;
      apply();
    };
    U.cameraZoom = (k) => {
      const r = svg.getBoundingClientRect();
      if (k === 0) cam.z = 1;
      else zoomAt(r.left + r.width / 2, r.top + r.height / 2, k);
      apply();
    };
    if (!host.querySelector('.camz')) {
      const z = document.createElement('div');
      z.className = 'camz';
      z.innerHTML =
        '<button class="ghost" data-act="cam" data-arg="out" aria-label="Zoom out">−</button><button class="ghost pc" data-act="cam" data-arg="reset" aria-label="Show the whole board">100%</button><button class="ghost" data-act="cam" data-arg="in" aria-label="Zoom in">+</button>';
      host.appendChild(z);
    }
    apply();
    if (host._camWired) return;
    host._camWired = true;
    host.addEventListener(
      'wheel',
      (e) => {
        if (e.ctrlKey && !e.deltaY) return;
        e.preventDefault();
        zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
      },
      { passive: false },
    );
    let drag = null;
    host.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || (e.target.closest && e.target.closest('.camz, button')))
        return;
      drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
    });
    host.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      if (cam.z <= 1.001) return; // the whole board is already in view
      drag.moved = true;
      host.classList.add('dragging');
      const s = toBoard(0, 0)[2];
      cam.x = drag.cx - dx / s;
      cam.y = drag.cy - dy / s;
      apply();
    });
    const end = () => {
      if (!drag) return;
      host._dragged = drag.moved;
      host.classList.remove('dragging');
      drag = null;
    };
    host.addEventListener('pointerup', end);
    host.addEventListener('pointerleave', end);
    // a drag is not a click on whatever it ended over
    host.addEventListener(
      'click',
      (e) => {
        if (host._dragged) {
          host._dragged = false;
          e.stopPropagation();
          e.preventDefault();
        }
      },
      true,
    );
  };
})((window.T = window.T || {}));
