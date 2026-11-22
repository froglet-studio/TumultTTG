/* ============================================================================
   TUMULT — THE OVERWORLD (Garrett, 2026-11-22: "a tumult map between missions
   instead of a little ladder ... the big boss far away, and branching paths to
   get there across a landscape").

   The route drawn as a map of the ground the expedition crosses: the squad sets
   out on the left, each leg is a stretch of country of its own ground (land,
   sea or air), every stop stands where its roads meet, and what waits at the
   end of the route stands on the far right, big, over its own ground. Pure
   drawing: it reads the run's map (T.genTideMap, unchanged) and the expedition,
   and changes nothing. The country is painted from the run's seed, so the same
   expedition always shows the same land.
   ========================================================================== */
(function (T) {
  'use strict';
  const U = (T.UI = T.UI || {});
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );

  /** The map's own size, in its units. The page keeps this shape, so a stop's place is a share of each side. */
  const W = 1000,
    H = 470;
  const START = { x: 52, y: H / 2 };
  const BOSS = { x: 905, y: H / 2 - 6 };
  const ROMAN = ['I', 'II', 'III'];
  const GROUND_NAME = { land: 'by land', sea: 'by sea', air: 'by air' };

  /** A small seeded stream for the drawing only (the engine's streams are left alone). */
  function rand(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const seedOf = (run, salt) => {
    let h = 2166136261 ^ salt;
    const s = String(run.seed) + '|' + (run.map ? run.map.rows.length : 0);
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  };
  const f1 = (n) => Math.round(n * 10) / 10;

  /** The legs of the route (a run of rows on one tier), the finale apart. */
  function legsOf(map) {
    const legs = [];
    for (let r = 0; r < map.rows.length;) {
      const a = T.actOf(r, map);
      let r2 = r;
      while (r2 + 1 < map.rows.length && T.actOf(r2 + 1, map) === a && map.all[map.rows[r2 + 1][0]].type !== 'boss')
        r2++;
      legs.push({ act: a, from: r, to: r2, boss: map.all[map.rows[r][0]].type === 'boss' });
      r = r2 + 1;
    }
    return legs;
  }

  /**
   * Where every stop stands: the rows run left to right toward the finale, the stops of a row stand apart up
   * and down it, each nudged off the grid so the roads wander like roads.
   */
  function layout(run) {
    const map = run.map;
    const rng = rand(seedOf(run, 1));
    const n = map.rows.length;
    const x0 = 140,
      x1 = 730;
    const colX = (r) => (r === n - 1 ? BOSS.x : n <= 2 ? x0 : x0 + (r * (x1 - x0)) / (n - 2));
    const pos = {};
    map.rows.forEach((row, r) => {
      const k = row.length;
      row.forEach((id, c) => {
        if (map.all[id].type === 'boss') return (pos[id] = { x: BOSS.x, y: BOSS.y });
        const span = k === 1 ? 0 : k === 2 ? 170 : 250;
        const y = H / 2 + 8 + (k === 1 ? 0 : -span / 2 + (c * span) / (k - 1));
        pos[id] = { x: colX(r) + (rng() - 0.5) * 34, y: y + (rng() - 0.5) * 44 };
      });
    });
    return { pos, colX };
  }

  /* ───────────── the country ───────────── */

  /** A wavy line from (x, ya) to (x, yb), for a border between two grounds. */
  function seam(rng, x, wob) {
    let d = `M${f1(x)} -10`;
    for (let y = 30; y <= H + 40; y += 40)
      d += ` Q${f1(x + (rng() - 0.5) * wob)} ${y - 20} ${f1(x + (rng() - 0.5) * wob * 0.6)} ${y}`;
    return d;
  }
  /** One ground's country between x0 and x1: its colour, its shapes and its weather. */
  function country(rng, g, x0, x1, id) {
    const w = x1 - x0;
    const out = [];
    const pick = (a, b) => a + rng() * (b - a);
    if (g === 'land') {
      out.push(`<rect x="${x0}" y="0" width="${w}" height="${H}" fill="url(#ow-land)"/>`);
      // contour lines of rolling ground, the uphill heavier
      for (let i = 0; i < 9; i++) {
        const y = pick(20, H - 20);
        let d = `M${x0} ${f1(y)}`;
        for (let x = x0; x < x1; x += 50) d += ` q25 ${f1(pick(-18, 18))} 50 0`;
        out.push(`<path d="${d}" class="ow-contour"/>`);
      }
      // quarry pits: rings dug into the ground
      for (let i = 0; i < Math.max(1, Math.round(w / 260)); i++) {
        const cx = pick(x0 + 30, x1 - 30),
          cy = pick(40, H - 40),
          r = pick(14, 26);
        out.push(
          `<g class="ow-pit"><ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(r)}" ry="${f1(r * 0.62)}"/><ellipse cx="${f1(cx)}" cy="${f1(cy + 2)}" rx="${f1(r * 0.62)}" ry="${f1(r * 0.36)}"/><ellipse cx="${f1(cx)}" cy="${f1(cy + 3)}" rx="${f1(r * 0.28)}" ry="${f1(r * 0.16)}"/></g>`,
        );
      }
      // windbreaks: the long walls the roads keep to (docs/LORE.md)
      for (let i = 0; i < Math.max(2, Math.round(w / 120)); i++) {
        const x = pick(x0 + 10, x1 - 70),
          y = pick(30, H - 30),
          len = pick(40, 90),
          tilt = pick(-12, 12);
        out.push(`<path d="M${f1(x)} ${f1(y)} l${f1(len)} ${f1(tilt)}" class="ow-break"/>`);
      }
      // rocks
      for (let i = 0; i < Math.round(w / 22); i++) {
        const x = pick(x0 + 6, x1 - 6),
          y = pick(10, H - 10),
          s = pick(2, 5);
        out.push(
          `<path d="M${f1(x - s)} ${f1(y)} l${f1(s)} ${f1(-s * 1.2)} l${f1(s)} ${f1(s * 1.2)}z" class="ow-rock"/>`,
        );
      }
    } else if (g === 'sea') {
      out.push(`<rect x="${x0}" y="0" width="${w}" height="${H}" fill="url(#ow-sea)"/>`);
      // swell: rows of small wave marks
      for (let i = 0; i < Math.round(w / 9); i++) {
        const x = pick(x0 + 8, x1 - 20),
          y = pick(10, H - 10);
        out.push(`<path d="M${f1(x)} ${f1(y)} q4 -4 8 0 q4 -4 8 0" class="ow-wave"/>`);
      }
      // islands: coasts that collapse and come back elsewhere
      for (let i = 0; i < Math.max(2, Math.round(w / 150)); i++) {
        const cx = pick(x0 + 30, x1 - 30),
          cy = pick(36, H - 36),
          r = pick(10, 24);
        let d = '';
        for (let a = 0; a <= 12; a++) {
          const t = (a / 12) * Math.PI * 2,
            rr = r * (0.75 + rng() * 0.45);
          d += `${a ? 'L' : 'M'}${f1(cx + Math.cos(t) * rr * 1.5)} ${f1(cy + Math.sin(t) * rr)}`;
        }
        out.push(`<path d="${d}z" class="ow-isle"/>`);
      }
      // kelp beds
      for (let i = 0; i < Math.round(w / 90); i++) {
        const x = pick(x0 + 10, x1 - 10),
          y = pick(30, H - 10);
        out.push(`<path d="M${f1(x)} ${f1(y)} q-5 -9 0 -18 q5 -9 0 -18" class="ow-kelp"/>`);
      }
    } else {
      out.push(`<rect x="${x0}" y="0" width="${w}" height="${H}" fill="url(#ow-air)"/>`);
      // the high country: peaks, snow on the heavy side
      for (let i = 0; i < Math.max(5, Math.round(w / 26)); i++) {
        const x = pick(x0 + 14, x1 - 14),
          y = pick(40, H - 8),
          s = pick(12, 30);
        out.push(
          `<g class="ow-peak"><path d="M${f1(x - s)} ${f1(y)} L${f1(x)} ${f1(y - s * 1.3)} L${f1(x + s)} ${f1(y)}z"/><path class="cap" d="M${f1(x - s * 0.32)} ${f1(y - s * 0.88)} L${f1(x)} ${f1(y - s * 1.3)} L${f1(x + s * 0.32)} ${f1(y - s * 0.88)} l${f1(-s * 0.16)} ${f1(s * 0.12)}z"/></g>`,
        );
      }
      // cloud shelves
      for (let i = 0; i < Math.max(3, Math.round(w / 80)); i++) {
        const x = pick(x0, x1 - 60),
          y = pick(20, H - 30),
          s = pick(14, 26);
        out.push(
          `<path d="M${f1(x)} ${f1(y)} a${f1(s)} ${f1(s * 0.7)} 0 0 1 ${f1(s * 1.6)} -${f1(s * 0.4)} a${f1(s * 0.9)} ${f1(s * 0.7)} 0 0 1 ${f1(s * 1.8)} ${f1(s * 0.3)} a${f1(s * 0.6)} ${f1(s * 0.5)} 0 0 1 0 ${f1(s * 0.6)}z" class="ow-cloud"/>`,
        );
      }
    }
    // the wind never stops: long streaks across every ground, strongest in the air
    const streaks = g === 'air' ? 7 : 3;
    for (let i = 0; i < streaks; i++) {
      const x = pick(x0, x1 - 80),
        y = pick(16, H - 16),
        len = pick(60, 140);
      out.push(`<path d="M${f1(x)} ${f1(y)} q${f1(len / 2)} ${f1(pick(-14, 14))} ${f1(len)} 0" class="ow-wind"/>`);
    }
    return `<g class="ow-ground g-${g}" clip-path="url(#${id})">${out.join('')}</g>`;
  }

  /** What waits at the end of the route, drawn big over its own ground. Its look comes from its threat. */
  function landmark(threat) {
    const x = BOSS.x,
      y = BOSS.y;
    const glow = `<circle cx="${x}" cy="${y}" r="120" fill="url(#ow-dread)"/>`;
    const shapes = {
      storm: `<g class="lm lm-storm">${[78, 60, 44, 28]
        .map(
          (r, i) =>
            `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${f1(r * 0.55)}" transform="rotate(${-14 + i * 9} ${x} ${y})"/>`,
        )
        .join('')}<circle cx="${x}" cy="${y}" r="11" class="eye"/></g>`,
      knot: `<g class="lm lm-knot">${[0, 120, 240]
        .map((a) => `<path d="M${x} ${y} c30 -10 60 10 70 40 c4 14 -4 28 -18 30" transform="rotate(${a} ${x} ${y})"/>`)
        .join('')}<circle cx="${x}" cy="${y}" r="9" class="eye"/></g>`,
      engine: `<g class="lm lm-engine"><path d="M${x - 70} ${y + 40} q70 -24 140 0" class="water"/><path d="M${x - 46} ${y + 34} l10 -66 h22 l6 -22 h16 l6 22 h22 l10 66z"/><circle cx="${x}" cy="${y - 14}" r="14" class="eye"/><path d="M${x - 70} ${y + 52} q70 -18 140 0" class="water"/></g>`,
      reef: `<g class="lm lm-reef">${[-48, -24, 0, 22, 46]
        .map(
          (dx, i) =>
            `<path d="M${x + dx - 9} ${y + 46} q-6 -${40 + i * 6} ${9 + (i % 2) * 4} -${62 + (i % 3) * 14} q14 ${30 + i * 4} 9 ${62 + (i % 3) * 14}z"/>`,
        )
        .join('')}<circle cx="${x}" cy="${y - 6}" r="9" class="eye"/></g>`,
      hive: `<g class="lm lm-hive"><path d="M${x - 80} ${y + 48} q80 -150 160 0z"/>${[0, 1, 2]
        .map((i) => `<ellipse cx="${x - 30 + i * 30}" cy="${y + 18 - (i % 2) * 22}" rx="7" ry="9" class="eye"/>`)
        .join('')}</g>`,
      beacon: `<g class="lm lm-beacon"><path d="M${x - 22} ${y + 54} l12 -96 h20 l12 96z"/><path d="M${x - 16} ${y - 42} h32 l-6 -16 h-20z"/><circle cx="${x}" cy="${y - 64}" r="10" class="eye"/>${[
        -1, 1,
      ]
        .map((s) => `<path d="M${x} ${y - 64} l${s * 90} -30 v60z" class="beam"/>`)
        .join('')}</g>`,
    };
    return glow + (shapes[threat] || shapes.storm);
  }

  /** A road between two stops: a wandering curve, its bend fixed by the pair, so it is the same road every time. */
  function road(a, b, salt) {
    const mx = (a.x + b.x) / 2,
      my = (a.y + b.y) / 2;
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const bend = ((((salt * 2654435761) >>> 0) % 1000) / 1000 - 0.5) * 0.36 * len;
    return `M${f1(a.x)} ${f1(a.y)} Q${f1(mx - (dy / len) * bend)} ${f1(my + (dx / len) * bend)} ${f1(b.x)} ${f1(b.y)}`;
  }

  /**
   * The route as a map of Tumult. `h` hands in what the route screen already knows how to say about a stop
   * (its name, its tip, its icon), so the map and the stop cards always agree.
   */
  U.renderOverworld = function (run, h) {
    const map = run.map;
    const ex = T.expeditionOf(run);
    const rng = rand(seedOf(run, 2));
    const legs = legsOf(map);
    const { pos, colX } = layout(run);
    const at = run.nodeId != null ? run.nodeId : null;
    const here = at != null ? map.all[at].row : -1;
    const n = map.rows.length;
    const groundOf = (act) => (ex && ex.legs[act] ? ex.legs[act].ground : ['land', 'sea', 'air'][act]);

    // each leg's stretch of country: from halfway after the last leg's stops to halfway past its own
    const edge = (r) => (r <= 0 ? 0 : r >= n ? W : (colX(r - 1) + colX(r)) / 2);
    const spans = legs.map((l) => ({ l, x0: edge(l.from), x1: l.boss ? W : edge(l.to + 1), g: groundOf(l.act) }));
    const seamX = spans.slice(1).map((s) => s.x0);
    const seams = seamX.map((x) => seam(rng, x, 46));
    // clip each ground to its stretch, between its wavy borders
    const clips = spans
      .map((s, i) => {
        const left = i === 0 ? `M-10 -10 L-10 ${H + 40}` : seams[i - 1].replace(/^M/, 'M');
        const right = i === spans.length - 1 ? `M${W + 10} -10 L${W + 10} ${H + 40}` : seams[i];
        // a closed shape: down the left border, back up the right one
        const pts = (d) => d.match(/-?\d+(\.\d+)?/g).map(Number);
        const l = pts(left),
          r = pts(right);
        const lp = [],
          rp = [];
        for (let k = 0; k < l.length; k += 2) lp.push(l[k] + ' ' + l[k + 1]);
        for (let k = 0; k < r.length; k += 2) rp.push(r[k] + ' ' + r[k + 1]);
        return `<clipPath id="owc${i}"><path d="M${lp.join(' L')} L${rp.reverse().join(' L')}z"/></clipPath>`;
      })
      .join('');
    const ground = spans
      .map((s, i) =>
        s.l.boss && i > 0 && spans[i - 1].g === s.g ? '' : country(rng, s.g, s.x0 - 30, s.x1 + 30, 'owc' + i),
      )
      .join('');
    // the finale shares its ground with the last leg: that ground runs on under it, darker
    const lastLeg = spans.length > 1 && spans[spans.length - 1].l.boss ? spans[spans.length - 2] : null;
    const finale = spans[spans.length - 1];
    const runOn =
      lastLeg && lastLeg.g === finale.g
        ? country(rng, finale.g, finale.x0 - 30, W + 10, 'owc' + (spans.length - 1))
        : '';
    const coast = seams.map((d) => `<path d="${d}" class="ow-seam"/>`).join('');

    // the roads: taken, open, behind, and still to come
    const roads = [];
    Object.values(map.all).forEach((nd) =>
      nd.next.forEach((nid) => {
        const m = map.all[nid];
        const taken = nd.done && m.done;
        const open = nd.id === at && run.available.includes(nid) && run.phase === 'map';
        const cls = taken ? 'taken' : open ? 'open' : nd.row < here ? 'gone' : m.row - here > 2 ? 'far' : '';
        const d = road(pos[nd.id], pos[nid], nd.id * 31 + nid);
        roads.push(`<path class="ow-bed ${cls}" d="${d}"/><path class="ow-road ${cls}" d="${d}"/>`);
      }),
    );
    if (at == null)
      map.rows[0].forEach((id) => {
        const d = road(START, pos[id], id + 7);
        roads.push(`<path class="ow-bed open" d="${d}"/><path class="ow-road open" d="${d}"/>`);
      });
    else {
      // the road the squad set out on stays drawn
      const first = map.rows[0].find((id) => map.all[id].done);
      if (first != null) {
        const d = road(START, pos[first], first + 7);
        roads.push(`<path class="ow-bed taken" d="${d}"/><path class="ow-road taken" d="${d}"/>`);
      }
    }

    // the mist over the country more than a leg ahead: known, not yet seen
    const nextLeg = legs.findIndex((l) => here + 1 >= l.from && here + 1 <= l.to);
    const mistFrom = nextLeg >= 0 && spans[nextLeg + 1] && !spans[nextLeg + 1].l.boss ? spans[nextLeg + 1].x0 : null;
    const mist =
      mistFrom != null
        ? `<rect x="${f1(mistFrom)}" y="0" width="${f1(BOSS.x - 120 - mistFrom)}" height="${H}" fill="url(#ow-mist)" class="ow-mist"/>`
        : '';

    const svg = `<svg class="ow-land" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="ow-land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3524"/><stop offset="1" stop-color="#232516"/></linearGradient>
        <linearGradient id="ow-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f3a52"/><stop offset="1" stop-color="#0a2338"/></linearGradient>
        <linearGradient id="ow-air" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b5a74"/><stop offset="1" stop-color="#2a3550"/></linearGradient>
        <radialGradient id="ow-dread"><stop offset="0" stop-color="#ff5a4a" stop-opacity="0.55"/><stop offset="0.55" stop-color="#8a1e3a" stop-opacity="0.28"/><stop offset="1" stop-color="#2a0a1a" stop-opacity="0"/></radialGradient>
        <linearGradient id="ow-mist" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9fb4c8" stop-opacity="0"/><stop offset="0.25" stop-color="#9fb4c8" stop-opacity="0.16"/><stop offset="0.85" stop-color="#9fb4c8" stop-opacity="0.2"/><stop offset="1" stop-color="#9fb4c8" stop-opacity="0.05"/></linearGradient>
        <radialGradient id="ow-vig" cx="0.45" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>
        ${clips}
      </defs>
      ${ground}${runOn}${coast}
      <rect x="${BOSS.x - 140}" y="0" width="${W - BOSS.x + 140}" height="${H}" class="ow-far"/>
      ${landmark(ex ? ex.threat : 'storm')}
      ${mist}
      <g class="ow-roads">${roads.join('')}</g>
      <g class="ow-camp" transform="translate(${START.x} ${START.y})"><path d="M-16 12 L0 -14 L16 12z"/><path d="M-6 12 L0 2 L6 12z" class="door"/><path d="M-26 18 h52" class="ground"/></g>
      <g class="ow-rose" transform="translate(${W - 44} ${H - 40})"><circle r="17"/><path d="M0 -24 L5 0 L0 24 L-5 0z"/><path d="M-24 0 L0 4 L24 0 L0 -4z" class="minor"/><text y="-28" text-anchor="middle">UP</text></g>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ow-vig)" pointer-events="none"/>
    </svg>`;

    // the legs, named over their country
    const pct = (x) => f1((x / W) * 100) + '%';
    const pctY = (y) => f1((y / H) * 100) + '%';
    const labels = spans
      .map((s) => {
        const passed = here > s.l.to;
        if (s.l.boss)
          return `<div class="leg finale" style="left:${pct(BOSS.x - 130)};width:${pct(W - BOSS.x + 126)}"><span class="leg-kick">The end of the route</span></div>`;
        return `<div class="leg g-${s.g}${passed ? ' passed' : ''}" style="left:${pct(s.x0)};width:${pct(s.x1 - s.x0)}"><span class="leg-kick">Leg ${ROMAN[s.l.act]} · ${GROUND_NAME[s.g]}</span><span class="actlabel">${esc(map.actNames[s.l.act])}</span></div>`;
      })
      .join('');

    // the stops
    const nodes = Object.values(map.all)
      .map((nd) => {
        const p = pos[nd.id];
        const avail = run.available.includes(nd.id) && run.phase === 'map';
        const ahead = nd.row - Math.max(here, -1);
        const cls = [
          'mnode',
          'k-' + nd.type,
          avail ? 'avail' : '',
          nd.done ? 'done' : '',
          at === nd.id ? 'current' : '',
          nd.type === 'boss' ? 'boss' : '',
          !nd.done && !avail && ahead > 2 ? 'far' : '',
          !nd.done && nd.row <= here && at !== nd.id ? 'missed' : '',
        ].join(' ');
        const s = h.stop(nd);
        return `<div class="${cls}" data-node="${nd.id}" style="left:${pct(p.x)};top:${pctY(p.y)}" ${avail ? `data-act="goNode" data-arg="${nd.id}"` : ''} data-tip="${esc(s.tip)}"><div class="medal${s.art ? ' painted' : ''}">${s.art ? `<span class="plate ${s.art}"></span>` : ''}<span class="mic">${s.icon || ''}</span>${nd.done ? '<span class="ow-tick">✓</span>' : ''}</div><div class="t"><span class="nm">${esc(s.name)}</span>${s.sub ? `<span class="sub">${s.sub}</span>` : ''}</div></div>`;
      })
      .join('');

    // the squad stands where it last stopped, or at the camp it sets out from
    const sp = at != null ? pos[at] : START;
    const squad = `<div class="squad-mark${at == null ? ' start' : ''}" style="left:${pct(sp.x)};top:${pctY(sp.y)}">${run.heroes
      .filter(Boolean)
      .map((x) => U.portrait(x, 'sm'))
      .join('')}${at == null ? '<span class="sm-label">Setting out</span>' : ''}</div>`;

    return `<div class="ow-scroll"><div class="route overworld">${svg}${labels}${nodes}${squad}</div></div>`;
  };

  /** On a narrow screen the map scrolls sideways: bring the squad into view. */
  U.overworldMount = function () {
    if (typeof document === 'undefined') return;
    const sc = document.querySelector('.ow-scroll');
    const mark = sc && sc.querySelector('.squad-mark');
    if (!sc || !mark || sc.scrollWidth <= sc.clientWidth) return;
    sc.scrollLeft = Math.max(0, mark.offsetLeft - sc.clientWidth * 0.3);
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
