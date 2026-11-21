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
  /** The rules gravity and weather add on this page: its gravity band, and each weather a visit may bring. */
  U.placeRuleItems = function (page) {
    const gb = T.GRAVITY.find((b) => b.id === T.gravityBand(page.gravity));
    const out = [];
    if (gb.text) out.push(`<li><b>${esc(gb.name)}.</b> ${esc(gb.text)}</li>`);
    const skies = (page.skies || []).filter((w) => T.WEATHER[w].text);
    for (const w of skies)
      out.push(
        `<li><b>${esc(T.WEATHER[w].name)}</b> (some visits${w === 'wind' ? '; it blows toward one edge, shown when you arrive' : ''}). ${esc(T.WEATHER[w].text)}</li>`,
      );
    return out.join('');
  };
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
    'A dashed ring is high ground: reached by its ladder (dashed line), a blink or a hover.',
    'A red ring is a hazard: 2 damage to anyone on it at the end of the round.',
  ];

  /** A "Correct this" mark on a piece of a page (src/ui/canon.js). */
  const mark = (page, shown, where) => (U.canonMark ? U.canonMark('place:' + page.id, shown, 'atlas:' + where) : '');

  /** A whole spread: the board on the left page, the rules of the place and its field notes facing it. */
  U.atlasSpreadHTML = function (page) {
    const plate = T.ART && T.ART[page.plate];
    const ground = GROUNDS.find((g) => g[0] === page.ground)[1];
    return `<div class="atlas-spread">
      <div class="atlas-leaf atlas-board">
        ${plate ? `<div class="atlas-plate" style="background-image:url(${plate})"></div>` : ''}
        <div class="atlas-head"><span class="kick">${esc(ground)} · ${esc(U.gravityText(page.gravity))}</span><h3>${esc(page.name)}</h3><div class="small dim">${esc(page.blurb)} ${mark(page, page.blurb, 'blurb')}</div></div>
        ${U.atlasMapSVG(page)}
      </div>
      <div class="atlas-leaf atlas-facing">
        <section><h4>Rules of this place</h4><ul>${page.rules.map((r, i) => `<li>${esc(r)} ${mark(page, r, 'rules:' + i)}</li>`).join('')}${U.placeRuleItems(page)}</ul>
          <details class="small dim"><summary>Reading a board</summary><ul>${LEGEND.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></details></section>
        <section class="atlas-notes"><h4>Field notes</h4>
          <p class="small"><b>Gravity</b> ${esc(U.gravityText(page.gravity))}. <b>Weather</b> ${esc(page.weather)} ${mark(page, page.weather, 'weather')}</p>
          ${page.notes.map((n, i) => `<p><b>${esc(n.h)}.</b> ${esc(n.t)} ${mark(page, n.h + '. ' + n.t, 'notes:' + i)}</p>`).join('')}</section>
      </div>
    </div>`;
  };

  /* ───────────── the Atlas tab: land, sea, air (Frogma "Atlas 2"), and one place as a diorama ───────────── */
  const GROUND_C = { land: '#f0c35a', sea: '#7fe3f0', air: '#dbe7f5' };
  /** A weather a visit may bring, as a gauge: its name and how often. */
  const skyLine = (page) => {
    const skies = (page.skies || []).filter((w) => w !== 'calm' && T.WEATHER[w]);
    return skies.length ? skies.map((w) => T.WEATHER[w].name).join(', ') : 'Calm';
  };
  /** The place's board tilted like a model on a table, with its plate under the glass. */
  U.dioramaHTML = function (page) {
    const plate = T.ART && T.ART[page.plate];
    return `<div class="diorama" aria-hidden="false"><div class="dio-table">${plate ? `<span class="dio-plate" style="background-image:url(${plate})"></span>` : ''}<span class="dio-glass"></span>${U.atlasMapSVG(page)}</div></div>`;
  };
  function placePage(page) {
    const i = T.ATLAS.indexOf(page);
    const prev = T.ATLAS[(i - 1 + T.ATLAS.length) % T.ATLAS.length];
    const next = T.ATLAS[(i + 1) % T.ATLAS.length];
    const ground = GROUNDS.find((g) => g[0] === page.ground)[1];
    const gb = T.GRAVITY.find((x) => x.id === T.gravityBand(page.gravity));
    const gauges = `<div class="dio-gauges"><span class="gauge"><i aria-hidden="true">◎</i><b>${page.gravity} g</b><small>${esc(U.gravityText(page.gravity).replace(/^[^(]*\(|\)/g, ''))}</small></span><span class="gauge"><i aria-hidden="true">≋</i><b>${esc(skyLine(page))}</b><small>Some visits</small></span><span class="gauge"><i aria-hidden="true">☾</i><b>${esc(page.weather.split(/[;.]/)[0])}</b><small>Weather</small></span></div>`;
    return `<div class="page place" style="--gr:${GROUND_C[page.ground]}"><div class="place-cols"><div class="place-left">${gauges}${U.dioramaHTML(page)}</div>
      <section class="place-text"><span class="eyebrow">${esc(ground)}</span><h1>${esc(page.name)}</h1><p class="dim">${esc(page.blurb)} ${mark(page, page.blurb, 'blurb')}</p>
        <span class="lab">Rules</span><ul class="place-rules">${page.rules.map((r, j) => `<li>${esc(r)} ${mark(page, r, 'rules:' + j)}</li>`).join('')}${U.placeRuleItems(page)}</ul>
        <details class="small dim"><summary>Reading a board</summary><ul>${LEGEND.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></details>
        <span class="lab">Field notes</span><div class="place-notes atlas-notes"><p class="small"><b>Gravity</b> ${esc(U.gravityText(page.gravity))}. <b>Weather</b> ${esc(page.weather)} ${mark(page, page.weather, 'weather')}</p>${page.notes.map((n, j) => `<p><b>${esc(n.h)}.</b> ${esc(n.t)} ${mark(page, n.h + '. ' + n.t, 'notes:' + j)}</p>`).join('')}</div></section></div>
      <nav class="place-turn" aria-label="Other places"><button class="ghost" data-act="atlasPage" data-arg="${prev.id}">‹ ${esc(prev.name)}</button><button class="ghost" data-act="atlasBack">All places</button><button class="ghost" data-act="atlasPage" data-arg="${next.id}">${esc(next.name)} ›</button></nav></div>`;
  }
  U.renderAtlas = function () {
    const page = U.atlasPage && T.PAGE_BY[U.atlasPage];
    if (page) return U.shell ? U.shell('atlas', placePage(page)) : placePage(page);
    const seen = U.seen ? U.seen().pages : [];
    const cols = GROUNDS.map(([g, name]) => {
      const pages = T.ATLAS.filter((p) => p.ground === g);
      return `<section class="ground" style="--gr:${GROUND_C[g]}"><h2><span>${esc(name)}</span></h2>${pages
        .map((p) => {
          const plate = T.ART && T.ART[p.plate];
          const been = seen.includes(p.id);
          return `<button class="place-tile${been ? '' : ' unseen'}" data-act="atlasPage" data-arg="${p.id}">${plate ? `<span class="pt-art" style="background-image:url(${plate})"></span>` : ''}<span class="pt-veil"></span><span class="pt-text"><b>${esc(p.name)}</b><small>${been ? 'visited' : 'not yet visited'}</small></span><span class="pt-g" aria-label="${p.gravity} g"><b>${p.gravity}</b><small>g</small></span></button>`;
        })
        .join('')}</section>`;
    }).join('');
    const visited = T.ATLAS.filter((p) => seen.includes(p.id)).length;
    const inner = `<div class="page atlas"><div class="pg-head"><h1>Atlas of Tumult</h1><span class="dim">Every page is a kind of place, not one spot. ${visited} of ${T.ATLAS.length} visited.</span></div><div class="grounds">${cols}</div></div>`;
    return U.shell ? U.shell('atlas', inner) : inner;
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
        // from a place: back to every place; from every place: back where the atlas was opened
        if (!U.atlasPage && U.screen === 'atlas') {
          U.screen = U.atlasFrom && U.atlasFrom !== 'atlas' ? U.atlasFrom : 'title';
          U.render();
          return true;
        }
        U.atlasPage = null;
        U.screen = 'atlas';
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
