/* ============================================================================
   TUMULT — THE ATLAS (UI)
   The book of places as a book: a contents page by ground (land, sea, air),
   and each place as a spread. The left page is the board; the facing page is
   not a map, and has two parts (Garrett, 2026-11-13): the rules of this place
   (what its special spaces and paths do) and field notes (what it is, its
   ecology, life there, who comes from such places).
   Opened from the title and every header (the Atlas screen), and from a
   mission as a modal showing the page it is played on.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) => U.esc(s);
  const GROUNDS = [
    ['land', 'Land'],
    ['sea', 'Sea'],
    ['air', 'Air'],
  ];

  /** Gravity as a player reads it: "0.3 g (light)". */
  U.gravityText = function (g) {
    const feel = g < 0.7 ? 'light' : g <= 1.5 ? 'Earth-like' : g < 5 ? 'heavy' : 'crushing';
    return `${g} g (${feel})`;
  };

  /**
   * One page's board as a static SVG string: zones as soft regions, paths, ladders, and every space by its
   * name. The same drawing a printed page carries.
   */
  U.atlasMapSVG = function (page) {
    const b = T.pageBoard(page);
    const N = b.nodes;
    const ns = Object.values(N);
    const cell = 100,
      pad = 46;
    const minX = Math.min(...ns.map((n) => n.x)),
      maxX = Math.max(...ns.map((n) => n.x)),
      minY = Math.min(...ns.map((n) => n.y)),
      maxY = Math.max(...ns.map((n) => n.y));
    const W = (maxX - minX) * cell + pad * 2,
      H = (maxY - minY) * cell + pad * 2;
    const px = (n) => (pad + (n.x - minX) * cell).toFixed(1);
    const py = (n) => (pad + (n.y - minY) * cell).toFixed(1);
    const out = [];
    U.zoneRegions(b).forEach(({ zone, ids, links }) => {
      const c = T.ZONES[zone].color;
      out.push(
        `<g class="zone-glow">${ids.map((id) => `<circle cx="${px(N[id])}" cy="${py(N[id])}" r="38" fill="${c}"/>`).join('')}${links
          .map(
            ([a, z]) =>
              `<line x1="${px(N[a])}" y1="${py(N[a])}" x2="${px(N[z])}" y2="${py(N[z])}" stroke="${c}" stroke-width="76" stroke-linecap="round"/>`,
          )
          .join('')}</g>`,
      );
    });
    b.edges.forEach(([a, z]) =>
      out.push(`<line class="edge" x1="${px(N[a])}" y1="${py(N[a])}" x2="${px(N[z])}" y2="${py(N[z])}"/>`),
    );
    b.climb.forEach(([a, z]) =>
      out.push(`<line class="edge climb" x1="${px(N[a])}" y1="${py(N[a])}" x2="${px(N[z])}" y2="${py(N[z])}"/>`),
    );
    ns.forEach((n) => {
      const rings = n.zones
        .map((z, i) => {
          const k = n.zones.length;
          const attrs = `fill="none" stroke="${T.ZONES[z].color}" stroke-opacity="0.7" stroke-width="2.5"`;
          return k === 1
            ? `<circle r="25" ${attrs}/>`
            : `<path d="${U.arcPath(25, (i / k) * 360, ((i + 1) / k) * 360)}" ${attrs}/>`;
        })
        .join('');
      const cls = ['an', n.height ? 'high' : '', n.hazard ? 'hz' : ''].join(' ');
      out.push(
        `<g class="${cls}" transform="translate(${px(n)},${py(n)})"><circle r="20" class="ring"/>${rings}<text y="5" text-anchor="middle">${esc(n.label)}</text></g>`,
      );
    });
    return `<svg class="atlas-map" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="${esc(page.name)} board">${out.join('')}</svg>`;
  };

  /** The legend every page shares: what the marks on a board mean. */
  const LEGEND = [
    'A to E: from where you arrive to the far side. 1 to 3: the side of the board.',
    'Spaces joined by a line are a step apart. Two spaces in range share a zone (the coloured regions).',
    'A dashed ring is high ground: reached by its ladder (dashed line), a teleport or a hover.',
    'A red ring is a hazard: 2 damage to anyone on it at the end of the round.',
  ];

  /** A whole spread: the board on the left page, the rules of the place and its field notes facing it. */
  U.atlasSpreadHTML = function (page) {
    const plate = T.ART && T.ART[page.plate];
    const ground = GROUNDS.find((g) => g[0] === page.ground)[1];
    return `<div class="atlas-spread">
      <div class="atlas-leaf atlas-board">
        ${plate ? `<div class="atlas-plate" style="background-image:url(${plate})"></div>` : ''}
        <div class="atlas-head"><span class="kick">${esc(ground)} · ${esc(U.gravityText(page.gravity))}</span><h3>${esc(page.name)}</h3><div class="small dim">${esc(page.blurb)}</div></div>
        ${U.atlasMapSVG(page)}
      </div>
      <div class="atlas-leaf atlas-facing">
        <section><h4>Rules of this place</h4><ul>${page.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
          <details class="small dim"><summary>Reading a board</summary><ul>${LEGEND.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></details></section>
        <section class="atlas-notes"><h4>Field notes</h4>
          <p class="small"><b>Gravity</b> ${esc(U.gravityText(page.gravity))}. <b>Weather</b> ${esc(page.weather)}</p>
          ${page.notes.map((n) => `<p><b>${esc(n.h)}.</b> ${esc(n.t)}</p>`).join('')}</section>
      </div>
    </div>`;
  };

  /** The Atlas screen: the contents by ground, or one spread with a way back and to the pages either side. */
  U.renderAtlas = function () {
    const id = U.atlasPage;
    const page = id && T.PAGE_BY[id];
    const back = `<button class="sm" data-act="atlasBack">${page ? 'Contents' : 'Back'}</button>`;
    if (page) {
      const i = T.ATLAS.indexOf(page);
      const prev = T.ATLAS[(i - 1 + T.ATLAS.length) % T.ATLAS.length];
      const next = T.ATLAS[(i + 1) % T.ATLAS.length];
      return `<div class="wrap">${U.header('Atlas of Tumult', back)}${U.atlasSpreadHTML(page)}
        <div class="row atlas-turn"><button class="ghost sm" data-act="atlasPage" data-arg="${prev.id}">← ${esc(prev.name)}</button><span class="dim small">Page ${i + 1} of ${T.ATLAS.length}</span><button class="ghost sm right" data-act="atlasPage" data-arg="${next.id}">${esc(next.name)} →</button></div></div>`;
    }
    const groups = GROUNDS.map(([g, name]) => {
      const pages = T.ATLAS.filter((p) => p.ground === g);
      return `<h3>${name}</h3><div class="atlas-index">${pages
        .map((p) => {
          const plate = T.ART && T.ART[p.plate];
          return `<button class="atlas-card" data-act="atlasPage" data-arg="${p.id}">${plate ? `<span class="atlas-thumb" style="background-image:url(${plate})"></span>` : ''}<b>${esc(p.name)}</b><span class="small dim">${esc(U.gravityText(p.gravity))}</span><span class="small">${esc(p.blurb)}</span></button>`;
        })
        .join('')}</div>`;
    }).join('');
    return `<div class="wrap">${U.header('Atlas of Tumult', back)}<p class="dim" style="max-width:640px">Every page is a kind of place on Tumult, not one spot: the quarry you fight across today may be a different quarry next time. A journey runs from page to page.</p>${groups}</div>`;
  };

  /** The atlas's own actions; true when one was taken. */
  U.atlasAct = function (act, arg) {
    switch (act) {
      case 'atlas':
        if (U.screen !== 'atlas') U.atlasFrom = U.screen;
        U.atlasPage = null;
        U.screen = 'atlas';
        U.render();
        return true;
      case 'atlasPage':
        U.atlasPage = arg;
        U.screen = 'atlas';
        U.render();
        return true;
      case 'atlasBack':
        if (U.atlasPage) U.atlasPage = null;
        else U.screen = U.atlasFrom || 'title';
        U.render();
        return true;
      case 'atlasHere': {
        // in a mission: the page it is played on, over the board
        const m = U.run && U.run.mission;
        const page = m && m.page && T.PAGE_BY[m.page];
        if (!page) return true;
        U.openModal(
          `${U.atlasSpreadHTML(page)}<div class="row" style="margin-top:10px"><button class="primary right" data-act="closeModal">Back to the board</button></div>`,
        );
        return true;
      }
    }
    return false;
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
