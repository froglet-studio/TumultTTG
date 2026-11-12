/* ============================================================================
   TUMULT v2.0 — UI MISSION SCREEN
   Board (SVG) with lanes, height, hazards, traps, objectives; tokens with hp;
   enemy intents drawn as arrows; hero panels (dice, track, hand, gear);
   targeting flows; animations from the engine's fx queue.
   ========================================================================== */
(function (T) {
  const U = T.UI;
  const B = T.Board;
  const esc = U.esc;
  const EL = T.ETHERIONS;
  const $ = (s, r) => (r || document).querySelector(s);
  const OBJ_ICON = { vault: '🏛️', lever: '🕹️', beacon: '📡', cache: '❓', valve: '🔧' };
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  U.enterMission = function () {
    U.ms = {
      heroIdx: 0,
      mode: 'idle',
      pending: null,
      rerollLeft: 0,
      rerollPicked: [],
      fxDone: 0,
      built: false,
      overShown: false,
    };
  };
  const M = () => U.run.mission;
  const hero = () => M().heroes[U.ms.heroIdx];

  /* ───────────── geometry ───────────── */
  function geom(m) {
    const ns = Object.values(m.board.nodes);
    const minX = Math.min(...ns.map((n) => n.x)),
      maxX = Math.max(...ns.map((n) => n.x)),
      minY = Math.min(...ns.map((n) => n.y)),
      maxY = Math.max(...ns.map((n) => n.y));
    const cell = 118,
      pad = 54;
    const W = (maxX - minX) * cell + pad * 2,
      H = (maxY - minY) * cell + pad * 2 + 10;
    return {
      cell,
      pad,
      W,
      H,
      px: (n) => pad + (n.x - minX) * cell,
      py: (n) => pad + (n.y - minY) * cell + 6,
      minX,
      maxX,
      minY,
      maxY,
    };
  }

  /* ───────────── skeleton ───────────── */
  U.renderMission = function () {
    return `<div class="mission">
      <div class="top panel tight" id="mtop"></div>
      <div class="boardwrap"><div id="mtarget"></div><div class="board" id="board"><div class="banner" id="banner"></div></div></div>
      <div class="side" id="mside"></div>
      <div class="bottom"><div class="log" id="mlog"></div></div>
    </div>`;
  };
  U.afterMissionRender = function () {
    U.ms.built = false;
    buildBoard();
    U.updateMission();
  };

  /* ───────────── board build ───────────── */
  function buildBoard() {
    const m = M();
    const g = geom(m);
    const host = $('#board');
    const old = host.querySelector('svg');
    if (old) old.remove();
    const svg = svgEl('svg', { viewBox: `0 0 ${g.W} ${g.H}`, preserveAspectRatio: 'xMidYMid meet' });
    host.insertBefore(svg, host.firstChild);
    const defs = svgEl('defs', {}, svg);
    const mk = svgEl(
      'marker',
      {
        id: 'arrow',
        viewBox: '0 0 10 10',
        refX: '9',
        refY: '5',
        markerWidth: '7',
        markerHeight: '7',
        orient: 'auto-start-reverse',
      },
      defs,
    );
    svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#e56a8f' }, mk);
    const lanes = svgEl('g', { id: 'lanes' }, svg);
    const edges = svgEl('g', { id: 'edges' }, svg);
    const nodes = svgEl('g', { id: 'nodes' }, svg);
    svgEl('g', { id: 'markers' }, svg);
    svgEl('g', { id: 'intents' }, svg);
    svgEl('g', { id: 'tokens' }, svg);
    // lane bands (by column x)
    const cols = {};
    Object.values(m.board.nodes).forEach((n) => {
      if (!n.height) cols[n.x] = n.lane;
    });
    Object.entries(cols).forEach(([x, lane]) => {
      const cx = g.pad + (parseFloat(x) - g.minX) * g.cell;
      svgEl(
        'rect',
        { x: cx - 40, y: 0, width: 80, height: g.H, rx: 16, fill: T.LANES[lane].color, class: 'lane-glow' },
        lanes,
      );
      svgEl(
        'text',
        {
          x: cx,
          y: g.H - 8,
          'text-anchor': 'middle',
          fill: T.LANES[lane].color,
          'font-size': 10,
          'font-family': 'var(--mono)',
          opacity: 0.7,
        },
        lanes,
      ).textContent = T.LANES[lane].name + ' lane';
    });
    const N = m.board.nodes;
    m.board.edges.forEach(([a, b]) =>
      svgEl('line', { x1: g.px(N[a]), y1: g.py(N[a]), x2: g.px(N[b]), y2: g.py(N[b]), class: 'edge' }, edges),
    );
    m.board.climb.forEach(([a, b]) =>
      svgEl(
        'line',
        { x1: g.px(N[a]), y1: g.py(N[a]), x2: g.px(N[b]), y2: g.py(N[b]), class: 'edge climb', 'data-climb': '1' },
        edges,
      ),
    );
    Object.values(N).forEach((n) => {
      const gr = svgEl(
        'g',
        { id: 'node-' + n.id, class: 'node', transform: `translate(${g.px(n)},${g.py(n)})`, 'data-node': n.id },
        nodes,
      );
      svgEl('circle', { r: 27, class: 'ring' }, gr);
      svgEl(
        'circle',
        { r: 31, fill: 'none', stroke: T.LANES[n.lane].color, 'stroke-opacity': 0.35, 'stroke-width': 1.5 },
        gr,
      );
      svgEl('text', { y: 40, class: 'lbl', 'text-anchor': 'middle' }, gr).textContent = n.height
        ? 'ledge ' + n.id
        : n.id;
    });
    svg.addEventListener('click', onBoardClick);
    svg.addEventListener('mousemove', (e) => {
      const t = e.target.closest('[data-tipid]');
      const tip = t ? tipFor(t.getAttribute('data-tipid')) : null;
      if (tip) {
        t.setAttribute('data-tip', tip);
      }
    });
    U.ms.built = true;
    U.ms.g = g;
    U.ms.svg = svg;
  }
  function tipFor(id) {
    const m = M();
    if (id.startsWith('e')) {
      const e = m.enemies.find((x) => x.uid === +id.slice(1));
      if (!e) return '';
      const d = T.ENEMIES[e.type];
      const states = Object.keys(e.states)
        .filter((k) => k !== 'Anchored' || !e.anchoredPerm)
        .map((k) => `<span class="state">${k}</span>`)
        .join(' ');
      return `<b>${e.glyph} ${esc(e.name)}</b> <span class="dim">tier ${e.tier}${e.elite ? ' · elite' : ''}</span><div class="mono small">hp ${e.hp}/${e.maxHp}${e.shield ? ' · Shield ' + e.shield : ''} · speed ${e.speed}</div>${e.intent ? `<div style="color:#ffb3c7">Intent: ${esc(e.intent.label)}</div>` : ''}${states ? `<div style="margin-top:4px">${states}</div>` : ''}<div class="flavor">${esc(d.flavor)}</div>`;
    }
    if (id.startsWith('h')) {
      const h = m.heroes.find((x) => x.uid === +id.slice(1));
      if (!h) return '';
      return `<b>${esc(h.name)}</b> <span class="dim">${esc(h.title)}</span><div class="mono small">hp ${h.hp}/${h.maxHp} · pool ${h.pool} · banked ${h.held.length}</div>${Object.keys(
        h.states,
      )
        .map((k) => `<div class="small">• ${esc(T.describeState(k, h.states[k]))}</div>`)
        .join('')}`;
    }
    if (id.startsWith('d'))
      return '<b>Decoy</b><div class="small">Draws enemy attacks that would target the nearer hero.</div>';
    if (id.startsWith('n')) {
      const n = m.board.nodes[+id.slice(1)];
      if (!n) return '';
      const bits = [`<b>Node ${n.id}</b> — ${T.LANES[n.lane].name} lane`];
      if (n.height) bits.push('Height: reachable only by Space verbs (teleport/climb/hover) or the ramp.');
      if (n.hazard) bits.push(`Hazard: ${T.RULES.HAZARD_DMG} true damage at round end to anyone standing here.`);
      if (n.spawn) bits.push('Spawn-node: foes emerge here.');
      if (n.objective) bits.push(objText(m, n));
      if (m.traps[n.id] && m.traps[n.id].length)
        bits.push(`Snare: ${m.traps[n.id].map((t) => (t.counted ? 'counted, ' : '') + t.dmg + ' dmg').join('; ')}`);
      return bits.join('<div style="height:4px"></div>');
    }
    return '';
  }
  function objText(m, n) {
    const o = n.objective;
    const ob = m.objective;
    switch (o.kind) {
      case 'vault':
        return `The vault. Break ${ob.need} seal(s) by Interacting while standing here (${ob.done || 0}/${ob.need}).`;
      case 'lever':
        return `Winch lever. Interact ×${ob.leverNeed} to drop a ramp to the ledge (${ob.leverDone}/${ob.leverNeed}).`;
      case 'beacon':
        return `The beacon. A hero on or adjacent at round end holds it (${ob.held}/${ob.need}).`;
      case 'cache':
        return o.searched
          ? o.real
            ? `The real cache. Dig it out: Interact ×${ob.need} (${ob.done || 0}/${ob.need}).`
            : 'A decoy cache.'
          : 'A cache — search it by stepping on it, or reveal it from range.';
      case 'valve':
        return `The valve. Channel ×${ob.need} (${ob.done}/${ob.need}).`;
    }
    return '';
  }

  /* ───────────── update everything ───────────── */
  /** How long the board stays in view before the mission-over modal opens (ms). Tests set it to 0. */
  U.MISSION_OVER_DELAY = 900;
  U.updateMission = function () {
    const m = M();
    if (!U.ms.built) buildBoard();
    // what ending the round now would do: the enemy turn is declared, so this is exact (T.forecast)
    U.ms.forecast = T.forecast(m);
    renderTop(m);
    renderTargetBar(m);
    renderSide(m);
    renderLog(m);
    updateBoard(m);
    playFx(m);
    if (m.over && !U.ms.overShown) {
      U.ms.overShown = true;
      setTimeout(() => showMissionOver(m), U.MISSION_OVER_DELAY);
    }
  };

  function renderTop(m) {
    const ob = m.objective;
    let prog = '';
    if (ob.kind === 'hold') prog = `${ob.held}/${ob.need} held`;
    else if (ob.kind === 'vault')
      prog = m.board.ramp
        ? `ramp down · seals ${ob.done || 0}/${ob.need}`
        : `lever ${ob.leverDone}/${ob.leverNeed} · seals ${ob.done || 0}/${ob.need}`;
    else if (ob.kind === 'valve') prog = `${ob.done}/${ob.need} channelled`;
    else if (ob.kind === 'find')
      prog = ob.found
        ? `found · dug ${ob.done || 0}/${ob.need}`
        : `${ob.candidates.filter((c) => m.board.nodes[c].objective.searched).length}/${ob.candidates.length} caches checked`;
    else if (ob.kind === 'kill') {
      const t = m.enemies.find((e) => e.type === ob.target);
      prog = t ? `${t.name} ${Math.max(0, t.hp)}/${t.maxHp}` : 'destroyed';
    }
    const clock = m.clock
      ? `<span class="clock ${m.clock.value <= 2 ? 'hot' : ''}" data-tip="${esc(m.clock.label)}">⏳ ${m.clock.value}</span>`
      : '';
    $('#mtop').innerHTML =
      `<div class="topbar"><div><span class="kick">${esc(m.archetype === 'boss' ? 'Finale' : m.archetype === 'elite' ? 'Elite' : 'Mission')} · tier ${m.tier}</span><h3 style="margin:0">${esc(m.title)}</h3></div>
      <div class="obj"><b>Objective:</b> ${esc(ob.text)} <span class="pill">${prog}</span><div class="small dim">${m.bonus.map((b) => '○ ' + esc(b.text)).join(' &nbsp; ')}</div></div>
      ${clock}<span class="pill mono">Round ${m.round}</span><span class="pill">◇ ${m.crystals}</span>
      <button class="primary" data-act="endRound" ${m.over ? 'disabled' : ''}>End Round ▶</button>
      ${U.missionTopExtra ? U.missionTopExtra(m) : ''}<button class="ghost sm" data-act="toggleSound">${U.sound ? '🔊' : '🔇'}</button><button class="ghost sm" data-act="help">?</button></div>`;
  }

  function renderTargetBar(m) {
    const ms = U.ms;
    const el = $('#mtarget');
    if (!el) return;
    if (ms.mode === 'idle') {
      el.innerHTML = `<div class="hint">${hintText(m)}</div>`;
      return;
    }
    let txt = '';
    if (ms.mode === 'target')
      txt = `<b>${esc(ms.pending.label)}</b> — choose a ${ms.pending.tg.need === 'node' ? 'node' : 'target'} (highlighted).`;
    else if (ms.mode === 'choice') txt = `<b>${esc(ms.pending.label)}</b> — push or pull?`;
    else if (ms.mode === 'reroll') txt = `<b>Reroll</b> — click up to ${ms.rerollLeft} banked dice, then confirm.`;
    else if (ms.mode === 'freeMove') txt = `<b>Free step</b> — click a highlighted node (up to ${ms.freeN}).`;
    else if (ms.mode === 'dump') txt = `<b>Return a die</b> — click a banked die to send it back to the pool.`;
    el.innerHTML = `<div class="targeting">${txt}<span class="right row">${ms.mode === 'choice' ? '<button class="sm primary" data-act="choice" data-arg="push">Push</button><button class="sm primary" data-act="choice" data-arg="pull">Pull</button>' : ''}${ms.mode === 'reroll' ? '<button class="sm primary" data-act="rerollConfirm">Confirm</button>' : ''}<button class="sm ghost" data-act="cancelMode">${ms.mode === 'freeMove' || ms.mode === 'reroll' ? 'Skip' : 'Cancel'}</button></span></div>`;
  }
  function hintText(m) {
    const h = hero();
    if (!h || h.downed) return 'Select a hero.';
    const ap = T.apValue(h);
    const parts = [`<b>${esc(h.name)}</b>: ${ap} AP banked`];
    const f = U.ms.forecast && U.ms.forecast.heroes[U.ms.heroIdx];
    if (f && f.after < f.hp)
      parts.push(
        `<span class="fc-bad">ending the round now costs you ${f.hp - f.after}${f.downed ? ' — you go down' : ` (${f.after} left)`}</span>`,
      );
    parts.push('click a card face to play it · click a node to walk (1 AP/step) · End Round when done');
    return parts.join(' · ');
  }

  /* ───────────── side panels ───────────── */
  function renderSide(m) {
    const intents =
      T.liveEnemies(m)
        .filter((e) => e.intent)
        .map(
          (e) =>
            `<div class="intent" data-tipid="e${e.uid}" data-tip=""><span class="g">${e.glyph}</span><span><b>${esc(e.name)}</b> <span class="dim mono small">${Math.max(0, e.hp)}hp${e.shield ? ' 🛡' + e.shield : ''}</span></span><span class="right small">${esc(e.intent.label)}</span></div>`,
        )
        .join('') || '<span class="dim small">No foes standing.</span>';
    $('#mside').innerHTML =
      `<div class="panel tight"><div class="row"><b>Enemy intents</b><span class="dim small right">declared — they adapt only to close distance</span></div><div class="intents" style="margin-top:6px">${intents}</div>${forecastHTML(m)}</div>` +
      m.heroes.map((h, i) => heroPanel(m, h, i)).join('');
    // tooltips on intents are computed lazily
    document
      .querySelectorAll('#mside [data-tipid]')
      .forEach((el) => el.setAttribute('data-tip', tipFor(el.getAttribute('data-tipid'))));
  }
  /** Beside a hero's vitality: where it will stand if the round ends now, when that is somewhere else. */
  function heading(i) {
    const f = U.ms.forecast && U.ms.forecast.heroes[i];
    if (!f || f.after === f.hp) return '';
    return ` <span class="${f.after < f.hp ? 'fc-bad' : 'fc-good'}">→ ${f.downed ? 'down' : f.after}</span>`;
  }
  /** "What happens if I end the round now?" — the telegraphs, hazards and objective added up, a line a hero. */
  function forecastHTML(m) {
    const f = U.ms.forecast;
    if (!f) return '';
    const lines = f.heroes
      .filter((x, i) => !m.heroes[i].downed)
      .map((x) => {
        const d = x.hp - x.after;
        if (x.downed) return `<span class="fc-bad"><b>${esc(x.name)}</b> goes down</span>`;
        if (d > 0) return `<span class="fc-bad"><b>${esc(x.name)}</b> takes ${d} (${x.after} left)</span>`;
        if (d < 0) return `<span class="fc-good"><b>${esc(x.name)}</b> mends ${-d} (${x.after})</span>`;
        return `<span><b>${esc(x.name)}</b> is untouched</span>`;
      });
    const falls = f.foes.filter((x) => x.falls).length;
    if (falls) lines.push(`<span class="fc-good">${falls} foe${falls > 1 ? 's fall' : ' falls'}</span>`);
    const ob = m.objective;
    if (f.result)
      lines.push(`<span class="${f.result === 'won' ? 'fc-good' : 'fc-bad'}"><b>the mission is ${f.result}</b></span>`);
    else if (f.progress.after > f.progress.before) lines.push('<span class="fc-good">the objective advances</span>');
    else if (ob && ob.kind === 'hold')
      lines.push('<span class="fc-bad">no one is by the beacon: the round will not count</span>');
    return `<div class="forecast" data-tip="Worked out from the declared intents, hazards and effects in play. Nothing in an enemy turn is random: this is what will happen if you end the round as things stand."><span class="dim">End the round now:</span> ${lines.join(' · ')}</div>`;
  }
  function heroPanel(m, h, i) {
    const sel = U.ms.heroIdx === i;
    const ally = T.allyOf(m, h);
    const states = Object.keys(h.states)
      .map(
        (k) =>
          `<span class="state ${['Weak', 'Rooted', 'Slow', 'SlowSelf', 'NoTele'].includes(k) ? 'bad' : ''}" data-tip="${esc(T.describeState(k, h.states[k]))}">${k}${h.states[k] && h.states[k].v != null ? ' ' + h.states[k].v : ''}${h.states[k] && typeof h.states[k].t === 'number' && h.states[k].t < 90 ? ' · ' + h.states[k].t : ''}</span>`,
      )
      .join('');
    const canPickDie = U.ms.mode === 'reroll' || U.ms.mode === 'dump';
    const dice =
      h.held
        .map((f, di) =>
          U.dieHTML(
            f,
            (canPickDie && sel ? 'pick' : '') + (U.ms.rerollPicked.includes(di) && sel ? ' rolled' : ''),
          ).replace('<span class="die', `<span data-act="die" data-arg="${i}|${di}" class="die`),
        )
        .join('') + h.temp.map((f) => U.dieHTML(f, 'temp')).join('');
    const trackCols = [];
    for (let c = 1; c <= T.RULES.TRACK; c++) {
      const items = h.track.filter((t) => t.left === c);
      trackCols.push(
        `<div class="tcol"><span class="n">${c}</span>${items.map((t) => `<span class="tpill ${t.phase}" data-tip="${esc(T.CARD[t.card].name)} — ${t.phase === 'dur' ? 'active (duration), then cools ' + t.cd : 'cooling'}; returns to hand in ${t.left + (t.phase === 'dur' ? t.cd : 0)}">${t.phase === 'dur' ? '●' : '○'} ${esc(T.CARD[t.card].name)}</span>`).join('')}</div>`,
      );
    }
    const hand = h.cards
      .map((cid) => {
        const c = T.CARD[cid];
        const P = T.heroP(h, cid),
          E = T.heroE(h, cid);
        const onTrack = h.track.find((t) => t.card === cid);
        if (onTrack)
          return `<div class="hcard cooling"><div class="hn">${esc(c.name)}<span class="pe">P${P} E${E}</span></div><div class="small dim">on track · back in ${onTrack.left + (onTrack.phase === 'dur' ? onTrack.cd : 0)}</div></div>`;
        const fb = (fk) => {
          const f = c[fk];
          const chk = !m.over && !h.downed ? T.canPlay(m, h, cid, fk) : { ok: false, why: '' };
          const elt = f.elt || c.el;
          const cost = `${f.ap}AP${f.el ? ' +' + f.el + '<span style="color:' + EL[elt].color + '">◆</span>' : ''}${f.cd ? ' cd' + f.cd : ''}`;
          return `<button class="fbtn ${fk} ${chk.ok ? 'ok' : ''} el-${fk === 'E' ? elt : 'AP'}" data-act="face" data-arg="${i}|${cid}|${fk}" data-tip="${U.faceTipHTML(c, fk, P, E).replace(/"/g, '&quot;')}" ${chk.ok ? '' : 'disabled'}><span style="color:${fk === 'E' ? EL[elt].color : 'var(--txt)'}">${fk === 'E' ? '◆' : '•'}</span><span>${esc(f.n)}</span><span class="fcost">${cost}${!chk.ok && chk.why && chk.why !== 'cannot pay' ? ' · ' + esc(chk.why) : ''}</span></button>`;
        };
        return `<div class="hcard"><div class="hn">${esc(c.name)}${c.sig >= 2 ? ' <span style="color:var(--gold);font-size:10px">★</span>' : ''}<span class="pe">P${P} E${E}</span></div>${fb('P')}${fb('E')}</div>`;
      })
      .join('');
    const gear = h.gear
      .map((g, gi) => {
        const def = T.GEAR_BY[g.id];
        return def.abilities
          .map((a, ai) => {
            const ok = !m.over && !h.downed && g.cds[ai] <= 0 && m.crystals >= a.cost;
            return `<button class="gbtn ${ok ? 'ok' : ''}" data-act="gear" data-arg="${i}|${gi}|${ai}" data-tip="<b>${esc(def.name)} — ${esc(a.n)}</b><div>${esc(a.txt())}</div><div class='mono small'>${a.cost} ◇ · cd ${a.cd}</div>" ${ok ? '' : 'disabled'}>${def.icon} ${esc(a.n)} <span class="dim">${a.cost}◇${g.cds[ai] > 0 ? ' · ' + g.cds[ai] : ''}</span></button>`;
          })
          .join('');
      })
      .join('');
    const cons = h.consumables
      .map(
        (c, ci) =>
          `<button class="gbtn" data-act="cons" data-arg="${i}|${ci}" data-tip="${esc(T.CONSUMABLE_BY[c].txt)}" ${m.over || h.downed ? 'disabled' : ''}>${T.CONSUMABLE_BY[c].icon} ${esc(T.CONSUMABLE_BY[c].name)}</button>`,
      )
      .join('');
    const canInteract = !h.downed && interactNode(m, h) != null && T.apValue(h) >= 2;
    const canRally = !h.downed && ally && ally.downed && B.adjacent(m.board, h.pos, ally.pos) && T.apValue(h) >= 2;
    const canValve = !h.downed && ['M', 'C', 'S', 'T'].every((f) => h.held.includes(f));
    return `<div class="hero ${sel ? 'active' : ''} ${h.downed ? 'downed' : ''}" data-act="selHero" data-arg="${i}">
      <div class="hh"><span class="nm">${esc(h.name)}</span><span class="tt">${esc(h.title)}</span><span class="hp">${h.downed ? 'DOWNED' : h.hp + '/' + h.maxHp}${heading(i)}</span></div>
      <div class="hpbar" style="margin-top:4px"><i style="width:${(100 * Math.max(0, h.hp)) / h.maxHp}%"></i></div>
      <div class="states">${states}</div>
      <div class="dice">${dice || '<span class="dim small">no dice banked</span>'}<span class="pool" data-tip="Dice still in your pool. You roll 3 per turn; pool + banked = 15 always.">pool ${h.pool} · AP ${T.apValue(h)}</span></div>
      <div class="track">${trackCols.join('')}</div>
      <div class="hand">${hand}</div>
      <div class="actions">
        ${T.BASIC.map((b) => {
          const ok = !m.over && T.canUseBasic(m, h, b.id).ok;
          if (b.el && !ok) return ''; // a channelled action shows only while its etherion is in the bank
          const tip = b.el
            ? `${b.n}, channelled (${b.ap} AP + 1 ${EL[b.el].name} or Omni): ${b.txt}`
            : `${b.n} (${b.ap} AP): ${b.txt} Anyone can do this, any number of times.`;
          const mark = b.el ? ` <span style="color:${EL[b.el].color}">+◆</span>` : '';
          return `<button class="sm" data-act="basic" data-arg="${i}|${b.id}" ${ok ? '' : 'disabled'} data-tip="${esc(tip)}">${b.icon} ${esc(b.n)}${mark} (${b.ap})</button>`;
        }).join('')}
        <button class="sm" data-act="interact" data-arg="${i}" ${canInteract ? '' : 'disabled'} data-tip="Interact with an adjacent objective (2 AP). Height objectives require standing on the node.">⚙ Interact (2)</button>
        <button class="sm" data-act="rally" data-arg="${i}" ${canRally ? '' : 'disabled'} data-tip="Revive a downed adjacent ally (2 AP, back at 8).">✚ Rally (2)</button>
        <button class="sm" data-act="valve" data-arg="${i}" ${canValve ? '' : 'disabled'} data-tip="Anti-brick valve: fold one each of M, C, S, T into one Omni (3 dice return to the pool).">◇ Fold 4→Omni</button>
        <button class="sm ghost" data-act="dumpMode" data-arg="${i}" ${h.downed || !h.held.length ? 'disabled' : ''} data-tip="Return a banked die to the pool (last resort when your bank is clogged).">↩ Return die</button>
      </div>
      ${gear || cons ? `<div class="gearrow">${gear}${cons}</div>` : ''}
    </div>`;
  }
  function interactNode(m, h) {
    const nodes = [h.pos].concat(B.walkNeighbors(m.board, h.pos));
    for (const n of nodes) {
      const nd = m.board.nodes[n];
      if (!nd.objective) continue;
      const k = nd.objective.kind;
      if (k === 'beacon') continue;
      if (nd.height && n !== h.pos) continue;
      if (k === 'cache' && (!m.objective.found || !nd.objective.real) && n !== h.pos) continue;
      if (k === 'cache' && nd.objective.searched && !nd.objective.real) continue;
      if (k === 'lever' && m.board.ramp) continue;
      return n;
    }
    return null;
  }

  function renderLog(m) {
    const el = $('#mlog');
    el.innerHTML = m.log
      .slice(-60)
      .map((l) => `<div class="l ${l.who}">${l.who === 'sys' ? '' : ''}${esc(l.text)}</div>`)
      .join('');
    el.scrollTop = el.scrollHeight;
  }

  /* ───────────── board update ───────────── */
  function validNodes(m) {
    const ms = U.ms;
    const h = hero();
    if (!h || h.downed) return new Set();
    if (ms.mode === 'target' && ms.pending.tg.need === 'node') return new Set(ms.pending.tg.options);
    if (ms.mode === 'freeMove') return new Set(T.reachableWalk(m, h, ms.freeN, false));
    if (ms.mode === 'idle' && !m.over) {
      const ap = T.apValue(h) + (h.freeMove || 0);
      if (ap <= 0 || h.states.Rooted || h.states.SlowSelf) return new Set();
      return new Set(T.reachableWalk(m, h, Math.min(ap, 4), false));
    }
    return new Set();
  }
  function validTargets(m) {
    const ms = U.ms;
    if (ms.mode === 'target' && (ms.pending.tg.need === 'foe' || ms.pending.tg.need === 'foeOrAlly'))
      return new Set(ms.pending.tg.options);
    return new Set();
  }

  function updateBoard(m) {
    const g = U.ms.g;
    const svg = U.ms.svg;
    const N = m.board.nodes;
    const vn = validNodes(m);
    const vt = validTargets(m);
    // nodes
    Object.values(N).forEach((n) => {
      const el = $('#node-' + n.id, svg);
      if (!el) return;
      el.setAttribute(
        'class',
        [
          'node',
          n.height ? 'height' : '',
          n.hazard ? 'hazard' : '',
          n.spawn ? 'spawn' : '',
          vn.has(n.id) ? 'valid' : '',
        ].join(' '),
      );
      el.setAttribute('data-tipid', 'n' + n.id);
      el.setAttribute('data-tip', tipFor('n' + n.id));
    });
    svg
      .querySelectorAll('.edge.climb')
      .forEach((e) => e.setAttribute('class', 'edge climb' + (m.board.ramp ? ' ramp' : '')));
    // markers
    const mk = $('#markers', svg);
    mk.innerHTML = '';
    Object.values(N).forEach((n) => {
      const x = g.px(n),
        y = g.py(n);
      if (n.hazard)
        svgEl('text', { x: x, y: y - 30, class: 'objmark', 'text-anchor': 'middle' }, mk).textContent = '🌊';
      if (n.spawn) svgEl('circle', { cx: x + 22, cy: y - 22, r: 5, fill: '#e56a8f' }, mk);
      if (n.objective) {
        const o = n.objective;
        let ic = OBJ_ICON[o.kind];
        if (o.kind === 'cache') ic = o.searched ? (o.real ? '💎' : '✖') : '❓';
        svgEl('text', { x: x, y: y + 6, class: 'objmark', 'text-anchor': 'middle', 'font-size': 18 }, mk).textContent =
          ic;
      }
      if (m.traps[n.id] && m.traps[n.id].length)
        svgEl('text', { x: x - 22, y: y - 18, class: 'trapmark' }, mk).textContent = '🪤';
    });
    m.zones.forEach((z) => {
      const n = N[z.node];
      svgEl(
        'circle',
        {
          cx: g.px(n),
          cy: g.py(n),
          r: g.cell * z.radius * 0.75,
          fill: '#7fd08a',
          opacity: 0.12,
          stroke: '#7fd08a',
          'stroke-dasharray': '4 4',
        },
        mk,
      );
    });
    // intents
    const it = $('#intents', svg);
    it.innerHTML = '';
    T.liveEnemies(m).forEach((e) => {
      if (!e.intent) return;
      const tgt =
        e.intent.target != null
          ? m.heroes.find((h) => h.uid === e.intent.target) || m.decoys.find((d) => d.uid === e.intent.target)
          : null;
      const a = N[e.pos];
      if (tgt && N[tgt.pos]) {
        const b = N[tgt.pos];
        const dx = g.px(b) - g.px(a),
          dy = g.py(b) - g.py(a);
        const L = Math.hypot(dx, dy) || 1;
        const ux = dx / L,
          uy = dy / L;
        svgEl(
          'line',
          {
            x1: g.px(a) + ux * 24,
            y1: g.py(a) + uy * 24,
            x2: g.px(b) - ux * 30,
            y2: g.py(b) - uy * 30,
            class: 'intent-line',
          },
          it,
        );
      }
      const lbl = svgEl('text', { x: g.px(a), y: g.py(a) - 34, class: 'intent-lbl', 'text-anchor': 'middle' }, it);
      lbl.textContent = e.intent.label.replace(/ → [^(]*/, ' ').slice(0, 34);
    });
    // tokens
    const tk = $('#tokens', svg);
    const seen = new Set();
    const upsert = (id, cls, n, build, upd) => {
      let el = $('#' + id, svg);
      if (!el) {
        el = svgEl('g', { id, class: 'token ' + cls }, tk);
        build(el);
      }
      el.setAttribute('transform', `translate(${g.px(n)},${g.py(n)})`);
      el.setAttribute('class', 'token ' + cls);
      upd(el);
      seen.add(id);
      return el;
    };
    m.heroes.forEach((h, i) => {
      if (!N[h.pos]) return;
      const cls = ['hero', U.ms.heroIdx === i ? 'active' : '', h.downed ? 'downed' : ''].join(' ');
      upsert(
        'tok-' + h.uid,
        cls,
        N[h.pos],
        (el) => {
          el.setAttribute('data-act', 'selHeroTok');
          el.setAttribute('data-arg', String(i));
          el.setAttribute('data-tipid', 'h' + h.uid);
          svgEl('circle', { r: 20, class: 'body' }, el);
          svgEl('text', { y: 5, class: 'initial' }, el).textContent = h.name[0];
          svgEl('rect', { x: -18, y: 24, width: 36, height: 4, rx: 2, class: 'hpb' }, el);
          svgEl('rect', { x: -18, y: 24, width: 36, height: 4, rx: 2, class: 'hpf' }, el);
          svgEl('text', { y: 36, class: 'hp' }, el);
          svgEl('text', { x: 16, y: -12, class: 'hp', id: 'sh-' + h.uid }, el);
        },
        (el) => {
          el.querySelector('.hpf').setAttribute('width', (36 * Math.max(0, h.hp)) / h.maxHp);
          el.querySelector('.hp').textContent = h.downed ? 'down' : h.hp;
          const sh = el.querySelector('#sh-' + h.uid);
          sh.textContent = h.states.Shield ? '🛡' + h.states.Shield.v : h.states.Hidden ? '👁' : '';
          el.setAttribute('data-tip', tipFor('h' + h.uid));
        },
      );
    });
    m.enemies.forEach((e) => {
      if (!e.alive || !N[e.pos]) return;
      const hid = T.isHidden(e) && !e.states.Located;
      const cls = [
        'enemy',
        e.elite ? 'elite' : '',
        e.boss ? 'boss' : '',
        hid ? 'hidden' : '',
        vt.has(e.uid) ? 'targetable' : '',
      ].join(' ');
      upsert(
        'tok-' + e.uid,
        cls,
        N[e.pos],
        (el) => {
          el.setAttribute('data-act', 'tgtEnemy');
          el.setAttribute('data-arg', String(e.uid));
          el.setAttribute('data-tipid', 'e' + e.uid);
          svgEl('circle', { r: e.boss ? 24 : 18, class: 'body' }, el);
          svgEl('text', { y: 6, class: 'glyph' }, el).textContent = e.glyph;
          svgEl('rect', { x: -16, y: 22, width: 32, height: 4, rx: 2, class: 'hpb' }, el);
          svgEl('rect', { x: -16, y: 22, width: 32, height: 4, rx: 2, class: 'hpf enemy' }, el);
          svgEl('text', { y: 34, class: 'hp' }, el);
          svgEl('text', { x: 16, y: -12, class: 'hp', id: 'sh-' + e.uid }, el);
        },
        (el) => {
          el.querySelector('.hpf').setAttribute('width', (32 * Math.max(0, e.hp)) / e.maxHp);
          el.querySelector('.hp').textContent = e.hp;
          const sh = el.querySelector('#sh-' + e.uid);
          sh.textContent =
            (e.shield ? '🛡' + e.shield : '') +
            (e.states.Anchored && !e.anchoredPerm ? '⚓' : '') +
            (e.states.Marked ? '◎' : '') +
            (e.states.Weak ? '↓' : '');
          el.setAttribute('data-tip', tipFor('e' + e.uid));
        },
      );
    });
    m.decoys.forEach((d) => {
      if (!N[d.pos]) return;
      upsert(
        'tok-' + d.uid,
        'decoy' + (vt.has(d.uid) ? ' targetable' : ''),
        N[d.pos],
        (el) => {
          el.setAttribute('data-tipid', 'd' + d.uid);
          el.setAttribute('data-tip', tipFor('d'));
          svgEl('circle', { r: 16, class: 'body' }, el);
          svgEl('text', { y: 5, class: 'initial', 'font-size': 11 }, el).textContent = 'decoy';
        },
        () => {},
      );
    });
    // ally targetable (foeOrAlly)
    tk.querySelectorAll('.token').forEach((el) => {
      if (!seen.has(el.id)) {
        el.style.transition = 'opacity .4s';
        el.style.opacity = 0;
        setTimeout(() => el.remove(), 420);
      }
    });
    if (U.ms.mode === 'target' && U.ms.pending.tg.need === 'foeOrAlly')
      m.heroes.forEach((h) => {
        if (vt.has(h.uid)) {
          const el = $('#tok-' + h.uid, svg);
          if (el) el.setAttribute('class', el.getAttribute('class') + ' targetable');
        }
      });
  }

  /* ───────────── fx / animation ───────────── */
  function floater(node, text, cls, delay) {
    const m = M();
    const g = U.ms.g;
    const n = m.board.nodes[node];
    if (!n) return;
    const host = $('#board');
    const svg = U.ms.svg;
    if (!host || !svg || !svg.viewBox || !svg.viewBox.baseVal) return;
    const r = svg.getBoundingClientRect();
    const hr = host.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const sc = Math.min(r.width / vb.width, r.height / vb.height);
    const ox = (r.width - vb.width * sc) / 2 + (r.left - hr.left),
      oy = (r.height - vb.height * sc) / 2 + (r.top - hr.top);
    const x = ox + g.px(n) * sc,
      y = oy + g.py(n) * sc - 10;
    setTimeout(() => {
      const d = document.createElement('div');
      d.className = 'floater ' + cls;
      d.style.left = x + 'px';
      d.style.top = y + 'px';
      d.textContent = text;
      host.appendChild(d);
      setTimeout(() => d.remove(), 1200);
    }, delay || 0);
  }
  function banner(text) {
    const b = $('#banner');
    if (!b) return;
    b.innerHTML = `<span>${esc(text)}</span>`;
    setTimeout(() => {
      if (b) b.innerHTML = '';
    }, 1700);
  }
  function playFx(m) {
    const q = m.fx.slice(U.ms.fxDone);
    U.ms.fxDone = m.fx.length;
    let delay = 0;
    let hitSound = false;
    for (const f of q) {
      const ent =
        f.ent != null
          ? m.heroes.find((h) => h.uid === f.ent) ||
            m.enemies.find((e) => e.uid === f.ent) ||
            m.decoys.find((d) => d.uid === f.ent)
          : null;
      const node = f.pos != null ? f.pos : ent ? ent.pos : null;
      switch (f.t) {
        case 'dmg':
          if (node != null) floater(node, '−' + f.amount, 'dmg', delay);
          hitSound = true;
          delay += 160;
          break;
        case 'heal':
          if (node != null && f.amount > 0) floater(node, '+' + f.amount, 'heal', delay);
          delay += 120;
          break;
        case 'shielded':
          if (node != null) floater(node, '🛡 ' + f.blocked, 'block', delay);
          break;
        case 'miss':
          if (node != null) floater(node, 'afterimage', 'miss', delay);
          break;
        case 'roll':
          if (U.sound) setTimeout(() => U.sfx.roll(), delay);
          break;
        case 'reveal':
          if (U.sound) setTimeout(() => U.sfx.reveal(), delay);
          break;
        case 'trap':
          if (U.sound) setTimeout(() => U.sfx.trap(), delay);
          if (f.node != null) floater(f.node, 'SNAP', 'dmg', delay);
          break;
        case 'death':
          if (node != null) floater(node, '✕', 'miss', delay);
          break;
        case 'down':
          banner('DOWNED');
          break;
        case 'revive':
          banner('RISES');
          if (U.sound) U.sfx.heal();
          break;
        case 'phase2':
          banner('THE HEART CRACKS');
          break;
        case 'flood':
          break;
        case 'ramp':
          banner('RAMP DOWN');
          break;
        case 'over':
          setTimeout(() => (f.won ? U.sfx.win() : U.sfx.lose()), 200);
          break;
      }
    }
    if (hitSound) U.sfx.hit();
  }

  /* ───────────── mission over ───────────── */
  function showMissionOver(m) {
    const bonus = m.bonus
      .map((b) => `<div class="bonus ${b.achieved ? 'ok' : 'no'}">${b.achieved ? '✓' : '○'} ${esc(b.text)}</div>`)
      .join('');
    U.openModal(
      `<h2>${m.won ? 'Mission complete' : 'Mission failed'}</h2><p class="dim">${esc(m.title)} · ${m.round} rounds · ${m.stats.kills} foes destroyed</p>${m.won ? bonus : `<p>${U.run.lifeline > 0 && !m.isBoss ? 'Your Lifeline will carry you on — no rewards from this current.' : 'The tide takes the skiff.'}</p>`}<div class="row" style="margin-top:12px"><button class="primary" data-act="missionDone">Continue</button></div>`,
    );
  }

  /* ───────────── interaction ───────────── */
  function onBoardClick(e) {
    const tok = e.target.closest('[data-act]');
    if (tok) return; // tokens handled by delegation
    const nd = e.target.closest('[data-node]');
    if (!nd) return;
    const node = +nd.getAttribute('data-node');
    nodeClicked(node);
  }
  function nodeClicked(node) {
    const m = M();
    const ms = U.ms;
    const h = hero();
    if (!h || m.over) return;
    if (ms.mode === 'target' && ms.pending.tg.need === 'node') {
      if (!ms.pending.tg.options.includes(node)) return;
      commitPending({ node });
      return;
    }
    if (ms.mode === 'freeMove') {
      const opts = T.reachableWalk(m, h, ms.freeN, false);
      if (!opts.includes(node)) return;
      h.freeMove = ms.freeN;
      const r = T.walk(m, h, node);
      h.freeMove = 0;
      if (!r.ok) U.toast(r.why);
      ms.mode = 'idle';
      afterAction();
      return;
    }
    if (ms.mode === 'idle') {
      if (h.downed) return;
      const r = T.walk(m, h, node);
      if (!r.ok) {
        if (r.why && r.why !== 'no path') U.toast(r.why);
        return;
      }
      U.sfx.click();
      afterAction();
    }
  }
  function beginPlay(i, cardId, fk) {
    const m = M();
    U.ms.heroIdx = i;
    const h = hero();
    const chk = T.canPlay(m, h, cardId, fk);
    if (!chk.ok) {
      U.toast(chk.why || 'Cannot play');
      return;
    }
    const card = T.CARD[cardId];
    const face = card[fk];
    const pending = {
      kind: 'card',
      cardId,
      fk,
      tg: chk.tg,
      label: `${card.name} — ${face.n}`,
      needsChoice: face.fx.some((x) => x.v === 'force' && x.kind === 'choose'),
    };
    if (chk.tg.need === 'none') {
      U.ms.pending = pending;
      commitPending({});
    } else {
      U.ms.pending = pending;
      U.ms.mode = 'target';
      U.updateMission();
    }
  }
  function beginGear(i, gi, ai) {
    const m = M();
    U.ms.heroIdx = i;
    const h = hero();
    const g = h.gear[gi];
    const def = T.GEAR_BY[g.id];
    const ab = def.abilities[ai];
    if (g.cds[ai] > 0 || m.crystals < ab.cost) return;
    const tg = T.targetsFor(m, h, ab.tgt, ab, 0, 0);
    if (tg.need !== 'none' && (!tg.options || !tg.options.length)) {
      U.toast('No valid target.');
      return;
    }
    const pending = { kind: 'gear', gi, ai, tg, label: `${def.name} — ${ab.n}`, needsChoice: false };
    if (tg.need === 'none') {
      U.ms.pending = pending;
      commitPending({});
    } else {
      U.ms.pending = pending;
      U.ms.mode = 'target';
      U.updateMission();
    }
  }
  function beginBasic(i, id) {
    const m = M();
    U.ms.heroIdx = i;
    const h = hero();
    const chk = T.canUseBasic(m, h, id);
    if (!chk.ok) {
      U.toast(chk.why || 'Cannot do that now.');
      return;
    }
    const b = T.BASIC_BY[id];
    U.ms.pending = { kind: 'basic', id, tg: chk.tg, label: b.n, needsChoice: false };
    if (chk.tg.need === 'none') commitPending({});
    else {
      U.ms.mode = 'target';
      U.updateMission();
    }
  }
  function commitPending(ctx) {
    const m = M();
    const ms = U.ms;
    const p = ms.pending;
    const h = hero();
    if (p.needsChoice && !ctx.choice && p.tg.need !== 'none') {
      ms.choiceCtx = ctx;
      ms.mode = 'choice';
      U.updateMission();
      return;
    }
    let r;
    const fullCtx = Object.assign({}, ctx);
    if (p.kind === 'card') r = T.playFace(m, h, p.cardId, p.fk, fullCtx);
    else if (p.kind === 'basic') r = T.useBasic(m, h, p.id, fullCtx);
    else r = T.useGear(m, h, p.gi, p.ai, fullCtx);
    ms.pending = null;
    ms.mode = 'idle';
    if (!r.ok) {
      U.toast(r.why || 'Could not play.');
      U.updateMission();
      return;
    }
    U.sfx.click();
    if (fullCtx.pendingReroll) {
      ms.mode = 'reroll';
      ms.rerollLeft = fullCtx.pendingReroll;
      ms.rerollPicked = [];
    } else if (fullCtx.pendingFreeMove && !h.downed && !m.over) {
      const opts = T.reachableWalk(m, h, fullCtx.pendingFreeMove, false);
      if (opts.length) {
        ms.mode = 'freeMove';
        ms.freeN = fullCtx.pendingFreeMove;
      }
    }
    afterAction();
  }
  function afterAction() {
    U.updateMission();
    // the mission is part of the save: closing the page now loses nothing
    T.saveRun(U.run);
  }

  U.handleMissionAct = function (act, arg, el, ev) {
    const m = M();
    const ms = U.ms;
    switch (act) {
      case 'selHero':
        if (ms.mode === 'idle') {
          ms.heroIdx = +arg;
          U.updateMission();
        }
        return true;
      case 'selHeroTok': {
        const i = +arg;
        if (
          ms.mode === 'target' &&
          ms.pending.tg.need === 'foeOrAlly' &&
          ms.pending.tg.options.includes(m.heroes[i].uid)
        ) {
          commitPending({ target: m.heroes[i].uid });
          return true;
        }
        if (ms.mode === 'idle') {
          ms.heroIdx = i;
          U.updateMission();
        }
        return true;
      }
      case 'tgtEnemy': {
        const uid = +arg;
        if (ms.mode === 'target' && ms.pending.tg.options.includes(uid)) {
          commitPending({ target: uid });
        }
        return true;
      }
      case 'face': {
        const [i, cid, fk] = arg.split('|');
        if (ms.mode !== 'idle') {
          ms.mode = 'idle';
          ms.pending = null;
        }
        beginPlay(+i, cid, fk);
        return true;
      }
      case 'gear': {
        const [i, gi, ai] = arg.split('|').map(Number);
        if (ms.mode !== 'idle') {
          ms.mode = 'idle';
          ms.pending = null;
        }
        beginGear(i, gi, ai);
        return true;
      }
      case 'cons': {
        const [i, ci] = arg.split('|').map(Number);
        ms.heroIdx = i;
        const r = T.useConsumable(m, m.heroes[i], ci);
        if (!r.ok) U.toast('Cannot use that now.');
        afterAction();
        return true;
      }
      case 'basic': {
        const [i, id] = arg.split('|');
        if (ms.mode !== 'idle') {
          ms.mode = 'idle';
          ms.pending = null;
        }
        beginBasic(+i, id);
        return true;
      }
      case 'interact': {
        const i = +arg;
        ms.heroIdx = i;
        const h = hero();
        const n = interactNode(m, h);
        if (n == null) {
          U.toast('No objective adjacent.');
          return true;
        }
        const r = T.doInteract(m, h, n, false);
        if (!r.ok) U.toast(r.why);
        else U.sfx.click();
        afterAction();
        return true;
      }
      case 'rally': {
        ms.heroIdx = +arg;
        const r = T.rally(m, hero());
        if (!r.ok) U.toast(r.why);
        else U.sfx.heal();
        afterAction();
        return true;
      }
      case 'valve': {
        ms.heroIdx = +arg;
        if (T.valve(m, hero())) U.sfx.click();
        afterAction();
        return true;
      }
      case 'dumpMode': {
        ms.heroIdx = +arg;
        ms.mode = ms.mode === 'dump' ? 'idle' : 'dump';
        U.updateMission();
        return true;
      }
      case 'die': {
        const [i, di] = arg.split('|').map(Number);
        if (i !== ms.heroIdx) return true;
        const h = hero();
        if (ms.mode === 'dump') {
          T.dump(m, h, di);
          ms.mode = 'idle';
          afterAction();
        } else if (ms.mode === 'reroll') {
          if (ms.rerollPicked.includes(di)) ms.rerollPicked = ms.rerollPicked.filter((x) => x !== di);
          else if (ms.rerollPicked.length < ms.rerollLeft) ms.rerollPicked.push(di);
          U.updateMission();
        }
        return true;
      }
      case 'rerollConfirm': {
        const h = hero();
        if (ms.rerollPicked.length) T.rerollHeld(m, h, ms.rerollPicked);
        ms.mode = 'idle';
        ms.rerollPicked = [];
        afterAction();
        return true;
      }
      case 'choice': {
        const ctx = Object.assign({}, ms.choiceCtx || {}, { choice: arg });
        ms.choiceCtx = null;
        commitPending(ctx);
        return true;
      }
      case 'cancelMode':
        ms.mode = 'idle';
        ms.pending = null;
        ms.rerollPicked = [];
        U.updateMission();
        return true;
      case 'endRound': {
        if (m.over) return true;
        ms.mode = 'idle';
        ms.pending = null;
        const unspent = m.heroes.filter((x) => !x.downed && T.apValue(x) >= 4).length;
        if (unspent && !ms.endConfirm) {
          ms.endConfirm = true;
          U.toast('A hero still has 4+ AP banked — banking is fine. Click End Round again to confirm.', 2600);
          setTimeout(() => {
            ms.endConfirm = false;
          }, 4000);
          return true;
        }
        ms.endConfirm = false;
        T.endHeroPhase(m);
        m.heroes.forEach((x) => (x.freeMove = 0));
        U.sfx.click();
        afterAction();
        return true;
      }
      case 'missionDone': {
        U.closeModal();
        T.missionRewards(U.run, m);
        T.applyMissionResult(U.run);
        if (U.run.phase === 'summary') {
          U.screen = 'summary';
          U.finishRunMeta();
        } else {
          U.screen = 'reward';
          T.saveRun(U.run);
        }
        U.render();
        return true;
      }
      case 'toggleSound':
        U.sound = !U.sound;
        U.updateMission();
        return true;
    }
    return false;
  };
  document.addEventListener('keydown', (e) => {
    if (U.screen !== 'mission' || !U.ms) return;
    if (e.key === 'Escape') {
      U.ms.mode = 'idle';
      U.ms.pending = null;
      U.updateMission();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      U.ms.heroIdx = 1 - U.ms.heroIdx;
      U.updateMission();
    }
    if (e.key === 'e' || e.key === 'E') {
      const b = $('[data-act="endRound"]');
      if (b && !b.disabled) b.click();
    }
  });
})((window.T = window.T || {}));
