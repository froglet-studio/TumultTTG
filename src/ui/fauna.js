/* ============================================================================
   TUMULT — FAUNA (browser only)
   The foes drawn as creatures in Cosmic Shore's fauna language, not as
   discs with a glyph: an Etherion crystal heart leads, a wireframe of braid
   spindles trails behind it, teal health prisms ride the limbs (the outermost
   first), and one long red danger prism is the sting. Every kind of foe has
   its own body plan; four forms (Mass, Charge, Space, Time) change the shape,
   never the colour, and vary how a swarm looks. The form is only a look: it
   comes from the foe's id and no rule reads it.
   A creature animates by the classes on any ancestor: .atk (its blow), .hit
   (a hit taken) and .die (it withers outside-in and drops its heart as one
   Etherion). Idle motion stops under reduced motion (src/ui/fauna in hud.css).
   Nothing here touches the mission.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const DARK = '#141A3E',
    SLATE = '#5A6FA8',
    LIGHT = '#A9BCF0',
    TEAL = '#2FE0C8',
    TEAL_HI = '#B8FFF2',
    RED = '#FF3B5C',
    RED_HI = '#FFC2CD',
    HEART = '#DDF6FF',
    HEART_LO = '#7FD8FF';
  const SPACE_K = 1.6477; // a Space body's span, as in Cosmic Shore
  const f1 = (n) => (Math.round(n * 10) / 10).toString();
  const deg = (r) => (r * 180) / Math.PI;

  function qpt(p0, p1, p2, t) {
    const a = (1 - t) * (1 - t),
      b = 2 * (1 - t) * t,
      c = t * t;
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    return [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1], deg(Math.atan2(dy, dx))];
  }

  function prism(x, y, ang, L, W, danger, shield) {
    const fill = danger ? RED : TEAL,
      hi = danger ? RED_HI : TEAL_HI;
    const h = W / 2,
      a = Math.min(h, L / 2);
    const body = `M${f1(-L / 2)} 0L${f1(-L / 2 + a)} ${f1(-h)}L${f1(L / 2 - a)} ${f1(-h)}L${f1(L / 2)} 0L${f1(L / 2 - a)} ${f1(h)}L${f1(-L / 2 + a)} ${f1(h)}Z`;
    const top = `M${f1(-L / 2)} 0L${f1(-L / 2 + a)} ${f1(-h)}L${f1(L / 2 - a)} ${f1(-h)}L${f1(L / 2)} 0Z`;
    return (
      `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${Math.round(ang)})"><path d="${body}" fill="${DARK}" transform="scale(1.25)"/>` +
      `<path d="${body}" fill="${fill}"/><path d="${top}" fill="${hi}" opacity=".55"/>` +
      (shield ? `<path d="${body}" fill="none" stroke="#F4F7FF" stroke-width="1.6"/>` : '') +
      '</g>'
    );
  }

  function braid(p0, p1, p2, form, w) {
    const d = `M${f1(p0[0])} ${f1(p0[1])}Q${f1(p1[0])} ${f1(p1[1])} ${f1(p2[0])} ${f1(p2[1])}`;
    if (form === 'S') w *= 0.7;
    const k = form === 'M' ? 1.35 : 1;
    let out = `<path d="${d}" fill="none" stroke="${DARK}" stroke-width="${f1(5.2 * w * k)}" stroke-linecap="round"/>`;
    if (form === 'C') {
      // Charge: the braid's strands part
      for (const [o, c] of [
        [-2.4, SLATE],
        [2.4, LIGHT],
        [0, '#7C8FCC'],
      ])
        out += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${f1(1.3 * w)}" stroke-linecap="round" transform="translate(0 ${o})"/>`;
    } else {
      const dash = form === 'S' ? '5 4' : '7 5';
      out += `<path d="${d}" fill="none" stroke="${SLATE}" stroke-width="${f1(3 * w * k)}" stroke-linecap="round" stroke-dasharray="${dash}"/>`;
      out += `<path d="${d}" fill="none" stroke="${LIGHT}" stroke-width="${f1(1.5 * w * k)}" stroke-linecap="round" stroke-dasharray="${dash}" stroke-dashoffset="6"/>`;
    }
    return out;
  }

  function heart(x, y, r) {
    const pts = (k) =>
      [0, 60, 120, 180, 240, 300]
        .map(
          (a) =>
            f1(x + Math.cos((a * Math.PI) / 180) * r * k) + ',' + f1(y + Math.sin((a * Math.PI) / 180) * r * k * 0.86),
        )
        .join(' ');
    return (
      `<polygon points="${pts(1.18)}" fill="${DARK}"/><polygon points="${pts(1)}" fill="${HEART_LO}"/>` +
      `<polygon points="${f1(x - r)},${f1(y)} ${f1(x - r / 2)},${f1(y - r * 0.86)} ${f1(x + r / 2)},${f1(y - r * 0.86)} ${f1(x)},${f1(y)}" fill="${HEART}"/>` +
      `<polygon points="${f1(x)},${f1(y)} ${f1(x + r / 2)},${f1(y - r * 0.86)} ${f1(x + r)},${f1(y)}" fill="#fff"/>` +
      `<circle class="core" cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.32)}" fill="#fff"/>`
    );
  }

  /** Limbs radiating all round a heart: the anchored and the boss kinds have no front. */
  function radial(cx, cy, n, r1, r2, bend, ts, stingAt) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3;
      const p1 = [cx + Math.cos(a + bend) * r1, cy + Math.sin(a + bend) * r1 * 0.8];
      const p2 = [cx + Math.cos(a) * r2, cy + Math.sin(a) * r2 * 0.8];
      out.push(['r' + i, null, p1, p2, ts, stingAt.includes(i)]);
    }
    return out;
  }

  // A plan: the heart [x, y, r], limbs [name, start (null = the heart), control, end, prism ts, sting?],
  // front tines that close like a jaw, how heavy the braids are, and whether the body has a front at all.
  const PLANS = {
    biter: {
      h: [34, 50, 14],
      front: [
        ['jawU', [18, 30], [6, 40]],
        ['jawL', [18, 70], [6, 60]],
      ],
      limbs: [
        ['u', null, [70, 14], [122, 20], [0.55, 0.85]],
        ['l', null, [70, 86], [122, 80], [0.55, 0.85]],
        ['m', null, [80, 50], [112, 50], [], true],
      ],
    },
    stinger: {
      h: [26, 52, 11],
      limbs: [
        ['u', null, [54, 30], [78, 34], [0.7]],
        ['l', null, [54, 74], [80, 70], [0.7]],
        ['tail', null, [70, 50], [100, 40], [0.4, 0.8]],
        ['tail2', [100, 40], [118, 32], [126, 52], [], true],
      ],
    },
    kiter: {
      h: [52, 50, 13],
      limbs: [
        ['vu', null, [66, 4], [104, 10], [0.5, 0.82, 1]],
        ['vl', null, [66, 96], [104, 90], [0.5, 0.82, 1]],
        ['vu2', null, [80, 24], [96, 32], [0.9]],
        ['vl2', null, [80, 76], [96, 68], [0.9]],
        ['lash', null, [100, 50], [136, 54], [], true],
      ],
    },
    brute: {
      h: [38, 50, 18],
      heavy: 1.5,
      front: [
        ['jawU', [16, 26], [2, 38]],
        ['jawL', [16, 74], [2, 62]],
      ],
      limbs: [
        ['u', null, [66, 6], [118, 14], [0.4, 0.7, 0.95]],
        ['l', null, [66, 94], [118, 86], [0.4, 0.7, 0.95]],
        ['m', null, [80, 50], [104, 50], [0.6], true],
      ],
    },
    lurker: {
      h: [24, 50, 9],
      heavy: 0.7,
      limbs: [
        ['u', null, [60, 36], [96, 44], [0.75]],
        ['l', null, [60, 64], [96, 56], [0.75]],
        ['tail', null, [80, 50], [110, 50], [0.6]],
        ['tail2', [110, 50], [124, 50], [134, 50], [], true],
      ],
    },
    harrier: {
      h: [40, 50, 12],
      limbs: [
        ['vu', null, [58, 14], [120, 4], [0.45, 0.8, 1]],
        ['vl', null, [58, 86], [120, 96], [0.45, 0.8, 1]],
        ['lash', null, [100, 50], [134, 50], [0.5], true],
      ],
    },
    tidecaller: {
      h: [42, 50, 13],
      limbs: [
        ['vu', null, [70, 10], [104, 16], [0.6, 1]],
        ['vl', null, [70, 90], [104, 84], [0.6, 1]],
        ['t1', null, [90, 36], [134, 30], [0.55, 0.85]],
        ['t2', null, [90, 64], [134, 70], [0.55, 0.85]],
        ['lash', null, [100, 50], [138, 50], [], true],
      ],
    },
    warden: { h: [70, 50, 17], radial: true, heavy: 1.4, limbs: radial(70, 50, 6, 30, 44, 0.35, [0.9], []), ring: 6 },
    bulwark: {
      h: [70, 50, 18],
      radial: true,
      heavy: 1.5,
      limbs: radial(70, 50, 7, 32, 50, 0.3, [0.6, 1], [3]),
      ring: 8,
    },
    binder: { h: [70, 50, 13], radial: true, limbs: radial(70, 50, 5, 46, 58, 0.6, [0.5, 1], [2]), web: true },
    spawner: { h: [70, 50, 14], radial: true, limbs: radial(70, 50, 4, 22, 34, 0.5, [], []), buds: true },
    heart: { h: [70, 50, 24], radial: true, heavy: 1.3, limbs: radial(70, 50, 8, 44, 64, 0.45, [0.55, 0.9], [1, 5]) },
  };
  const ALIAS = { decoy: 'stinger' };

  /** The inside of a creature's own <svg>: its body, ghosts for a Time form, and the blow it throws. */
  function body(kind, form) {
    const P = PLANS[kind] || PLANS[ALIAS[kind]] || PLANS.biter;
    const [hx, hy, hr] = P.h;
    const sx = form === 'S' && !P.radial ? SPACE_K : 1;
    const X = (p) => [hx + (p[0] - hx) * sx, p[1]];
    const w = P.heavy || 1;
    const prisms = [];
    const limbs = P.limbs.map((l, li) => {
      const [name, start, c, e, ts, sting] = l;
      const p0 = start ? X(start) : [hx, hy];
      const p1 = X(c),
        p2 = X(e);
      ts.forEach((t) => {
        const [x, y, a] = qpt(p0, p1, p2, t);
        prisms.push({
          li,
          x,
          y,
          a,
          L: 13 * Math.min(1.3, w),
          W: 7 * Math.min(1.3, w),
          danger: form === 'C',
          shield: form === 'M',
        });
      });
      if (sting) {
        const [x, y, a] = qpt(p0, p1, p2, 1);
        const ln = kind === 'stinger' ? 34 : 28;
        const r = (a * Math.PI) / 180;
        prisms.push({
          li,
          x: x + (Math.cos(r) * ln) / 2,
          y: y + (Math.sin(r) * ln) / 2,
          a,
          L: ln,
          W: 4,
          danger: true,
          sting: true,
        });
      }
      return { name, br: braid(p0, p1, p2, form, w) };
    });
    // prisms wither outside-in: the furthest from the heart goes first
    const order = prisms
      .map((p, i) => i)
      .sort((a, b) => Math.hypot(prisms[b].x - hx, prisms[b].y - hy) - Math.hypot(prisms[a].x - hx, prisms[a].y - hy));
    order.forEach((i, k) => (prisms[i].delay = k * 0.12));
    let out = '';
    limbs.forEach((l, li) => {
      const pr = prisms
        .filter((p) => p.li === li)
        .map((p) => {
          const drift = p.y < hy - 6 ? 'pa' : p.y > hy + 6 ? 'pb' : 'pc';
          return `<g class="pr ${drift}${p.sting ? ' st' : ''}" style="animation-delay:${p.delay.toFixed(2)}s">${prism(p.x, p.y, p.a, p.L, p.W, p.danger || p.sting, p.shield)}</g>`;
        })
        .join('');
      out += `<g class="sp sp-${l.name}${P.radial ? ' rad' : ''}" style="transform-origin:${hx}px ${hy}px">${l.br}${pr}</g>`;
    });
    (P.front || []).forEach(([name, c, e]) => {
      const p0 = [hx, hy];
      const [x, y, a] = qpt(p0, c, e, 0.95);
      out += `<g class="jw ${name}" style="transform-origin:${hx}px ${hy}px">${braid(p0, c, e, form, 0.9 * w)}${prism(x, y, a, 10, 6, form === 'C', form === 'M')}</g>`;
    });
    if (P.ring) {
      // a guardian's ring of shield plates round the heart
      let ring = '';
      for (let i = 0; i < P.ring; i++) {
        const a = (i / P.ring) * Math.PI * 2;
        ring += prism(hx + Math.cos(a) * (hr + 9), hy + Math.sin(a) * (hr + 9) * 0.86, deg(a) + 90, 12, 6, false, true);
      }
      out += `<g class="ring">${ring}</g>`;
    }
    if (P.web) {
      const ends = P.limbs.map((l) => l[3]);
      out += `<path class="web" d="${ends.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('')}Z" fill="none" stroke="${LIGHT}" stroke-width="0.9" stroke-dasharray="2 3" opacity=".7"/>`;
    }
    if (P.buds) {
      P.limbs.forEach((l) => {
        out += `<g class="bud">${heart(l[3][0], l[3][1], 6)}</g>`;
      });
    }
    if (form === 'C')
      [
        [hx + 30, hy - 22],
        [hx + 52, hy + 16],
        [hx + 16, hy + 20],
      ].forEach(([x, y], i) => {
        out += `<path class="spk" style="animation-delay:${(i * 0.23).toFixed(2)}s" d="M${f1(x)} ${f1(y)}l4 -5 1 4 5 -6" fill="none" stroke="#FFE38A" stroke-width="1.5" stroke-linecap="round"/>`;
      });
    return { out, hx, hy, hr, radial: !!P.radial, span: P.radial ? 140 : 140 + (140 - hx) * (sx - 1) };
  }

  const cache = {};
  /**
   * A creature as an <svg> of width `w` (in the units of whatever holds it). Its own viewport, so its
   * animations turn about its own heart wherever it is drawn. `x`/`y` place it (centred) inside a board.
   */
  U.creature = function (kind, form, w, o = {}) {
    const key = kind + form;
    const b = (cache[key] = cache[key] || body(kind, form));
    const big = form === 'M' ? 1 / 1.14 : 1;
    const vw = b.span * big,
      vh = 100 * big;
    const vx = (b.span - vw) / 2,
      vy = (100 - vh) / 2;
    const h = (w * vh) / vw;
    const pos = o.x != null ? ` x="${f1(o.x - w / 2)}" y="${f1(o.y - h / 2)}"` : '';
    const ghosts =
      form === 'T'
        ? `<g class="ghost g1" opacity=".22">${b.out}</g><g class="ghost g2" opacity=".12">${b.out}</g>`
        : '';
    const bolt =
      kind === 'biter' || kind === 'brute' || b.radial
        ? ''
        : `<g class="proj" style="transform-origin:${b.hx}px ${b.hy}px"><path d="M${b.hx - 6} ${b.hy}h-26" stroke="${RED}" stroke-width="4" stroke-linecap="round"/><path d="M${b.hx - 6} ${b.hy}h-26" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></g>`;
    const hrt = `<g class="hrt" style="transform-origin:${b.hx}px ${b.hy}px">${heart(b.hx, b.hy, b.hr * (form === 'M' ? 1.12 : 1))}</g>`;
    return (
      `<svg class="cr cr-${kind} el-${form}${b.radial ? ' cr-rad' : ''}${o.cls ? ' ' + o.cls : ''}"${pos} width="${f1(w)}" height="${f1(h)}" viewBox="${f1(vx)} ${f1(vy)} ${f1(vw)} ${f1(vh)}" overflow="visible" aria-hidden="true">` +
      `<g class="bd" style="transform-origin:${b.hx}px ${b.hy}px">${ghosts}<g class="live">${b.out}${hrt}</g>${bolt}</g></svg>`
    );
  };
  U.creatureKinds = Object.keys(PLANS);

  /** A foe's form: only a look, the same for a foe every time it is drawn, varied across a swarm. */
  U.formOf = function (e) {
    const s = String(e.uid != null ? e.uid : '') + (e.type || '');
    let h = 7;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return 'MCST'[h % 4];
  };
  /**
   * A foe of Tumult (2.132): a beast born on the planet, not a creature of the void. Each kind of creature is one
   * triple hybrid (T.ENEMIES[type].clades), painted as a single beast (assets/foe-art/<type>, 2.143) in a ring the
   * colour of danger. Never its three clades side by side (Garrett, 2026-11-24: "that is like showing people the
   * solution and no puzzle"). A rival pilot (e.rival) shows the painted pilot nearest its pair, as a pilot of the
   * squad would; a foe with no painting shows the old wireframe body. The classes .bd and .live keep the blow, the
   * hit and the wither of every other foe. Only a look: no rule reads it.
   */
  const ring = (e) => (e.boss ? '#FFD36B' : e.rival ? '#C58BFF' : e.elite ? '#FFB347' : RED);
  let beastN = 0;
  function painting(e, href, w, o) {
    const h = w * 0.86;
    const pos = o.x != null ? ` x="${f1(o.x - w / 2)}" y="${f1(o.y - h / 2)}"` : '';
    const id = 'fr' + ++beastN;
    return (
      `<svg class="cr cr-beast cr-role${e.boss ? ' boss' : ''}${o.cls ? ' ' + o.cls : ''}"${pos} width="${f1(w)}" height="${f1(h)}" viewBox="0 0 100 86" overflow="visible" aria-hidden="true">` +
      `<g class="bd" style="transform-origin:50px 43px"><g class="live"><clipPath id="${id}"><circle cx="50" cy="43" r="40"/></clipPath>` +
      `<circle cx="50" cy="43" r="43" fill="${DARK}" stroke="${ring(e)}" stroke-width="3.2"/>` +
      `<image href="${href}" x="6" y="-1" width="88" height="88" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/></g></g></svg>`
    );
  }
  /** The painting a foe wears: its kind's beast, or for a rival pilot the pilot of its pair (or nothing). */
  U.foePainting = (e) => {
    if (!T.ART || !e) return '';
    if (e.rival && Array.isArray(e.clades) && U.artForPair) {
      const pilot = U.artForPair(
        e.clades.filter((sp) => sp !== 'human' && T.SPECIES[sp]),
        new Set(),
      );
      const face = pilot && T.ART['pilot/' + pilot.key];
      if (face) return face;
    }
    return T.ART['foe-art/' + e.type] || '';
  };
  U.foeArt = (e, w, o = {}) => {
    const href = U.foePainting(e);
    return href ? painting(e, href, w, o) : U.creature(e.type, U.formOf(e), w, o);
  };
  /** How wide a foe's body is drawn on the board, in board units (a node's cell is 118). */
  U.foeWidth = (e) =>
    e.boss ? 190 : e.elite ? 140 : { brute: 132, warden: 120, spawner: 110, kiter: 124 }[e.type] || 112;
})((window.T = window.T || {}));
