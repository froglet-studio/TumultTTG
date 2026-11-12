/* ============================================================================
   TUMULT v2.0 — UI CORE: screens outside the mission, shared widgets.
   ========================================================================== */
(function (T) {
  const U = (T.UI = {
    screen: 'title',
    run: null,
    draft: null,
    codex: { tab: 'species', sp: 'human', P: 0, E: 0 },
    sound: true,
    tutorialSeen: false,
    modal: null,
    pendingTrain: false,
  });
  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = () => document.getElementById('app');
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  U.esc = esc;
  const EL = T.ETHERIONS;
  const elName = (k) => (k === 'AP' ? 'AP' : EL[k] ? EL[k].name : k);

  /* ───────────── sound (tiny synth; no assets) ───────────── */
  let actx = null;
  function beep(freq, dur, type, vol) {
    if (!U.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.value = vol || 0.04;
      o.connect(g);
      g.connect(actx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (dur || 0.12));
      o.stop(actx.currentTime + (dur || 0.12));
    } catch (e) {}
  }
  U.sfx = {
    roll: () => {
      beep(520, 0.06, 'square', 0.03);
      setTimeout(() => beep(660, 0.06, 'square', 0.03), 60);
      setTimeout(() => beep(780, 0.08, 'square', 0.03), 120);
    },
    hit: () => beep(140, 0.14, 'sawtooth', 0.05),
    heal: () => {
      beep(660, 0.12, 'sine', 0.04);
      setTimeout(() => beep(880, 0.14, 'sine', 0.04), 90);
    },
    click: () => beep(900, 0.04, 'triangle', 0.02),
    win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'sine', 0.05), i * 120)),
    lose: () => [392, 330, 262].forEach((f, i) => setTimeout(() => beep(f, 0.3, 'sine', 0.05), i * 160)),
    reveal: () => beep(1200, 0.1, 'sine', 0.03),
    trap: () => beep(220, 0.1, 'square', 0.04),
  };

  /* ───────────── toast / modal / tooltip ───────────── */
  U.toast = function (msg, ms) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms || 2200);
  };
  U.openModal = function (html, onMount) {
    U.modal = { html, onMount };
    U.render();
  };
  U.closeModal = function () {
    U.modal = null;
    U.render();
  };
  let tipEl = null;
  function showTip(html, x, y) {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'tip';
      document.body.appendChild(tipEl);
    }
    tipEl.innerHTML = html;
    tipEl.style.display = 'block';
    const w = tipEl.offsetWidth,
      h = tipEl.offsetHeight;
    let L = x + 14,
      Tp = y + 14;
    if (L + w > window.innerWidth - 8) L = x - w - 10;
    if (Tp + h > window.innerHeight - 8) Tp = y - h - 10;
    tipEl.style.left = Math.max(4, L) + 'px';
    tipEl.style.top = Math.max(4, Tp) + 'px';
  }
  function hideTip() {
    if (tipEl) tipEl.style.display = 'none';
  }
  document.addEventListener('mousemove', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t) showTip(t.getAttribute('data-tip'), e.clientX, e.clientY);
    else hideTip();
  });
  document.addEventListener('mouseleave', hideTip);
  // a tip left behind by a tap would otherwise ride along as the page scrolls under it
  document.addEventListener('scroll', hideTip, true);

  /* ───────────── card widgets ───────────── */
  const costStr = (card, face, fk) => {
    const elt = face.elt || card.el;
    return `${face.ap} AP${face.el ? ` + ${face.el}<span class="el-${elt}">◆</span>` : ''}${face.cd ? ` · CD ${face.cd}` : ' · CD 0'}${face.dur ? ` · Dur ${face.dur}` : ''}`;
  };
  U.faceTipHTML = function (card, fk, P, E) {
    const face = card[fk];
    return `<b>${esc(card.name)} — ${esc(face.n)}</b> <span class="dim">(${fk === 'P' ? 'Physical' : EL[face.elt || card.el].name} face)</span><div style="margin:4px 0" class="mono small">${costStr(card, face, fk)}</div><div>${esc(face.txt(P, E))}</div>${fk === 'E' ? `<div class="mute small" style="margin-top:4px">E unlocks and scales this capability; P ${face.txt(1, 0) !== face.txt(0, 0) ? 'also scales a physical sub-part' : 'does not substitute for it'}.</div>` : ''}`;
  };
  U.cardHTML = function (cardId, o) {
    o = o || {};
    const c = T.CARD[cardId];
    const P = o.P || 0,
      E = o.E || 0;
    const sp = T.SPECIES[c.sp];
    const face = (fk) => {
      const f = c[fk];
      const asleep = fk === 'E' && (o.up || o.showUp) && E < T.RULES.ETHEREAL_MIN_E;
      return `<div class="face ${fk} el-${f.elt || c.el}${asleep ? ' asleep' : ''}"><div class="fh"><span class="fn" style="color:${fk === 'P' ? '#dfe7f2' : ''}">${esc(f.n)}</span>${fk === 'E' ? `<span class="tag bg-${f.elt || c.el} el-${f.elt || c.el}">${EL[f.elt || c.el].name}</span>` : '<span class="tag" style="border:1px solid var(--line2);color:var(--AP)">Physical</span>'}<span class="cost">${costStr(c, f, fk)}</span></div><div class="ft">${esc(f.txt(P, asleep ? T.RULES.ETHEREAL_MIN_E : E))}</div>${asleep ? `<div class="small asleep-note">Asleep — awaken it with ${T.RULES.ETHEREAL_MIN_E} E</div>` : ''}</div>`;
    };
    return `<div class="tcard ${o.pickable ? 'pickable' : ''} ${o.sel ? 'sel' : ''}" data-card="${cardId}" ${o.act ? `data-act="${o.act}" data-arg="${cardId}"` : ''}>
      <div class="head"><span class="name">${esc(c.name)}</span>${c.sig >= 2 ? '<span class="star" title="signature">★</span>' : c.sig === 1 ? '<span class="star" title="minor signature">☆</span>' : ''}<span class="sp">${sp.icon} ${esc(sp.name)}</span></div>
      ${face('P')}${face('E')}
      ${o.up ? `<div class="upctl">P <button class="sm" data-act="up" data-arg="${cardId}|P|-1">−</button><b>${P}</b><button class="sm" data-act="up" data-arg="${cardId}|P|1">+</button> &nbsp; E <button class="sm" data-act="up" data-arg="${cardId}|E|-1">−</button><b>${E}</b><button class="sm" data-act="up" data-arg="${cardId}|E|1">+</button></div>` : o.showUp ? `<div class="mono small dim" style="margin-top:6px">P${P} · E${E}</div>` : ''}
      ${o.flavor !== false ? `<div class="flavor">${esc(c.flavor)}</div>` : ''}
    </div>`;
  };
  const dieHTML = (f, extra) =>
    `<span class="die ${f} ${extra || ''}" data-tip="${f === 'AP' ? 'AP — the common currency. 1 action point.' : f === 'AP2' ? 'AP2 — a double AP face (worth 2).' : f === 'O' ? 'Omni — spends as any etherion.' : esc(EL[f].name + ' — ' + EL[f].surface)}">${f === 'AP2' ? '2' : f === 'AP' ? '·' : f}</span>`;
  U.dieHTML = dieHTML;

  /* ───────────── header strip ───────────── */
  function header(title, right) {
    return `<div class="row" style="margin-bottom:10px"><span class="kick">Tumult</span><h2 style="margin:0 6px">${title}</h2><span class="right row"><button class="ghost sm" data-act="toggleSound">${U.sound ? '🔊' : '🔇'}</button><button class="ghost sm" data-act="help">? Help</button><button class="ghost sm" data-act="codex">Codex</button>${right || ''}</span></div>`;
  }

  /* ───────────── TITLE ───────────── */
  /** The difficulty of the next run (T.TIDES); the last choice is remembered on this device. */
  const chosenTide = (meta) => (T.TIDES[meta.tide] ? meta.tide : 'rising');
  function tidePicker(meta) {
    const cur = chosenTide(meta);
    const btns = T.TIDE_ORDER.map(
      (id) =>
        `<button class="${id === cur ? 'primary' : 'ghost'} sm" data-act="pickTide" data-arg="${id}">${esc(T.TIDES[id].n)}</button>`,
    ).join('');
    return `<div class="tide-pick"><span class="dim small">Difficulty</span>${btns}<div class="mute small">${esc(T.TIDES[cur].txt)}</div></div>`;
  }
  function renderTitle() {
    const meta = T.loadMeta();
    const hasSave = !!T.loadRun();
    return `<div class="title">
      <div class="kick">A tide-run through the HyperSea</div>
      <h1>TUMULT</h1>
      <div class="sub">Draft two heroes from eleven bloodlines. Ride the current through a Consolidation's territory. Every turn is a puzzle: three dice, a six-column track, and enemies that tell you what they'll do.</div>
      <div class="btns"><button class="primary" data-act="newRun">New Tide</button>${hasSave ? '<button data-act="continueRun">Continue</button>' : ''}<button data-act="codex">Codex</button><button data-act="help">How to Play</button><button class="ghost" data-act="toggleSound">${U.sound ? '🔊 Sound on' : '🔇 Sound off'}</button></div>
      ${tidePicker(meta)}
      <div class="mute small" style="margin-top:14px">Tides sailed: ${meta.runs} · Consolidations toppled: ${meta.wins} · Deepest row: ${meta.bestRow}/6</div>
      <div class="mute small" style="max-width:520px;text-align:center;margin-top:16px;font-family:var(--serif);font-style:italic">${esc(T.FLAVOR.terminalIntro[meta.runs % T.FLAVOR.terminalIntro.length])}</div>
      ${U.titleExtra ? U.titleExtra() : ''}
    </div>`;
  }

  /* ───────────── DRAFT ───────────── */
  const NAMES = ['Sable', 'Quill', 'Marrow', 'Tessel', 'Orin', 'Pell', 'Wren', 'Casque', 'Lumen', 'Hale'];
  U.startDraft = function () {
    U.run = T.newRun();
    U.run.tide = chosenTide(T.loadMeta());
    U.draft = {
      heroIdx: 0,
      step: 'mode',
      species: [],
      name: NAMES[T.runStream(U.run, 'squad').int(NAMES.length)],
      hero: null,
      pack: [],
      picks: 0,
    };
    U.screen = 'draft';
    U.render();
  };
  function renderDraft() {
    const d = U.draft;
    const run = U.run;
    const n = d.heroIdx + 1;
    let body = '';
    if (d.step === 'mode') {
      body = `<div class="panel"><h3>Hero ${n} of 2 — choose how to build</h3><p class="dim small">Every hero is Human plus two other bloodlines, six trait cards to start, six Upgrade Points to spend. You'll grow to nine cards over the run (never more than 3 of 9 from one bloodline).</p>
        <div class="row" style="margin:10px 0"><button class="primary" data-act="draftMode" data-arg="draft">Draft from packs (recommended)</button><span class="dim small">Pick 1 of 4, six times — a real limited draft across your three pools.</span></div>
        <h3 style="margin-top:14px">…or Quick Build a pre-made hero</h3>
        <div class="prebuilt-grid">${T.PREBUILTS.filter((pb) => !run.heroes.some((h) => h.name === pb.name))
          .map(
            (pb) =>
              `<div class="sp-card" data-act="prebuilt" data-arg="${pb.id}"><div class="ic">${pb.species
                .slice(1)
                .map((s) => T.SPECIES[s].icon)
                .join(
                  ' ',
                )}</div><b>${esc(pb.name)} <span class="dim" style="font-weight:400">${esc(pb.title)}</span></b><div class="small dim">${pb.species
                .slice(1)
                .map((s) => T.SPECIES[s].name)
                .join(' · ')}</div><div class="small" style="margin-top:4px">${esc(pb.blurb)}</div></div>`,
          )
          .join('')}</div></div>`;
    } else if (d.step === 'species') {
      body = `<div class="panel"><h3>Hero ${n}: choose two bloodlines (Human is always the third)</h3>
        <div class="row" style="margin:8px 0"><label class="small dim">Name</label><input id="heroName" value="${esc(d.name)}" style="background:#0b1222;border:1px solid var(--line2);color:var(--txt);padding:5px 8px;border-radius:6px"></div>
        <div class="species-grid">${T.SPECIES_ORDER.filter((s) => s !== 'human')
          .map((s) => {
            const sp = T.SPECIES[s];
            const sel = d.species.includes(s);
            return `<div class="sp-card ${sel ? 'sel' : ''}" data-act="pickSpecies" data-arg="${s}"><div class="ic">${sp.icon}</div><b>${esc(sp.name)}</b><div class="small dim">leans ${sp.lean}</div><div class="small" style="margin-top:4px">${esc(sp.tagline)}</div><div class="small mute" style="margin-top:4px">${T.cardsOf(
              s,
            )
              .filter((c) => c.sig >= 2)
              .map((c) => '★ ' + c.name)
              .join(' · ')}</div></div>`;
          })
          .join('')}</div>
        <div class="row" style="margin-top:12px"><button class="primary" data-act="openPacks" ${d.species.length === 2 ? '' : 'disabled'}>Open the first pack</button><button class="ghost" data-act="draftBack">Back</button></div></div>`;
    } else if (d.step === 'packs') {
      const h = d.hero;
      body = `<div class="panel"><div class="row"><h3>${esc(h.name)} — pick ${d.picks + 1} of ${T.RULES.START_CARDS}</h3><span class="right small dim">Kit: ${h.cards.length}/${T.RULES.START_CARDS} · ${h.species.map((s) => `${T.SPECIES[s].icon}${h.cards.filter((c) => T.CARD[c].sp === s).length}/3`).join(' ')}</span></div>
        <p class="dim small">Each pack mixes your three bloodlines. ★ marks a species' signature traits. Hover any face for exact numbers at your current P/E.</p>
        <div class="pack">${d.pack.map((cid) => U.cardHTML(cid, { pickable: true, act: 'pickCard' })).join('')}</div>
        <div class="row" style="margin-top:12px"><button class="ghost" data-act="rerollPack" title="Costs nothing in this version; use it if a pack has nothing for you">Pass this pack</button></div>
        ${h.cards.length ? `<hr><div class="small dim">Picked so far: ${h.cards.map((c) => esc(T.CARD[c].name)).join(' · ')}</div>` : ''}</div>`;
    } else if (d.step === 'up') {
      const h = d.hero;
      body = `<div class="panel"><div class="row"><h3>${esc(h.name)} — spend Upgrade Points</h3><span class="right pill">UP left: <b style="margin-left:4px">${h.upUnspent}</b></span><button class="sm" data-act="autoUp">Auto</button><button class="sm ghost" data-act="resetUp">Reset</button></div>
        <p class="dim small">P deepens the physical face's numbers (reliable, AP-fed). E awakens the ethereal face — it cannot be played until its card has E 1 — and scales its <i>capability</i>, something P can never buy. Every hero sets out with at least ${T.RULES.START_AWAKE} cards awakened. Caps: P 3, E 3 per card.</p>
        <div class="pack">${h.cards.map((cid) => U.cardHTML(cid, { P: T.heroP(h, cid), E: T.heroE(h, cid), up: true })).join('')}</div>
        <div class="row" style="margin-top:12px"><button class="primary" data-act="confirmHero">${d.heroIdx === 0 ? 'Confirm — draft hero 2' : 'Confirm — set sail'}</button></div></div>`;
    }
    return `<div class="wrap">${header('The Draft')}<div class="row small dim" style="margin-bottom:8px">${run.heroes
      .map(
        (h) =>
          `<span class="pill">✓ ${esc(h.name)} — ${h.species
            .slice(1)
            .map((s) => T.SPECIES[s].icon)
            .join('')}</span>`,
      )
      .join('')}</div>${body}</div>`;
  }
  function draftAct(act, arg) {
    const d = U.draft;
    const run = U.run;
    if (act === 'draftMode') {
      d.step = 'species';
    } else if (act === 'prebuilt') {
      const pb = T.PREBUILTS.find((p) => p.id === arg);
      d.hero = T.heroFromPrebuilt(run, pb);
      d.step = 'up';
    } else if (act === 'pickSpecies') {
      if (d.species.includes(arg)) d.species = d.species.filter((s) => s !== arg);
      else if (d.species.length < 2) d.species.push(arg);
      const inp = $('#heroName');
      if (inp) d.name = inp.value || d.name;
    } else if (act === 'draftBack') {
      d.step = 'mode';
    } else if (act === 'openPacks') {
      const inp = $('#heroName');
      if (inp && inp.value.trim()) d.name = inp.value.trim().slice(0, 16);
      d.hero = T.newDraftHero(run, d.name, 'the drafted', d.species);
      d.picks = 0;
      d.pack = T.draftPack(run, d.hero, 4);
      d.step = 'packs';
    } else if (act === 'pickCard') {
      const r = T.addCard(d.hero, arg);
      if (!r.ok) {
        U.toast(r.why);
        return;
      }
      U.sfx.click();
      d.picks++;
      if (d.picks >= T.RULES.START_CARDS) {
        T.awaken(d.hero);
        d.step = 'up';
      } else d.pack = T.draftPack(run, d.hero, 4);
    } else if (act === 'rerollPack') {
      d.pack = T.draftPack(run, d.hero, 4);
    } else if (act === 'up') {
      const [cid, which, delta] = arg.split('|');
      const r = T.adjustUp(d.hero, cid, which, parseInt(delta, 10));
      if (!r.ok && r.why) U.toast(r.why === 'cap' ? 'That track is capped at 3.' : 'No Upgrade Points left.');
    } else if (act === 'autoUp') {
      T.autoAllocate(d.hero);
    } else if (act === 'resetUp') {
      T.respecHero(d.hero);
    } else if (act === 'confirmHero') {
      T.awaken(d.hero);
      if (d.hero.upUnspent > 0) U.toast(`${d.hero.upUnspent} UP carried over — spend it later with Train.`);
      run.heroes.push(d.hero);
      if (d.heroIdx === 0) {
        U.draft = {
          heroIdx: 1,
          step: 'mode',
          species: [],
          name: NAMES[T.runStream(run, 'squad').int(NAMES.length)],
          hero: null,
          pack: [],
          picks: 0,
        };
      } else {
        T.startMap(run);
        T.saveRun(run);
        U.screen = 'map';
        U.showTutorial('map');
      }
    }
    U.render();
  }

  /* ───────────── MAP ───────────── */
  const NODE_ICON = {
    swarm: '🐜',
    vault: '🏛️',
    hidden: '🔍',
    cascade: '🌊',
    elite: '⚔️',
    haven: '⚓',
    event: '❔',
    boss: '🫀',
  };
  const NODE_NAME = {
    swarm: 'Swarm',
    vault: 'Vault',
    hidden: 'The Sought',
    cascade: 'Cascade',
    elite: 'Elite',
    haven: 'Haven',
    event: 'Event',
    boss: 'The Heart',
  };
  U.NODE_ICON = NODE_ICON;
  U.NODE_NAME = NODE_NAME;
  function partyBar(run) {
    return `<div class="partybar">${run.heroes
      .map(
        (
          h,
          i,
        ) => `<div class="panel tight"><div class="row"><b style="font-family:var(--serif)">${esc(h.name)}</b><span class="dim small">${esc(h.title)}</span><span class="right mono small">${h.hp}/${h.maxHp}</span></div><div class="hpbar"><i style="width:${(100 * h.hp) / h.maxHp}%"></i></div>
      <div class="row small" style="margin-top:6px"><span class="pill">${h.cards.length} cards</span><span class="pill">UP ${h.upUnspent}</span>${h.gear.map((g) => `<span class="pill" data-tip="${esc(T.GEAR_BY[g.id].desc)}">${T.GEAR_BY[g.id].icon} ${esc(T.GEAR_BY[g.id].name)}</span>`).join('')}${h.boons.map((b) => `<span class="pill" data-tip="${esc(T.BOON_BY[b].desc)}">${T.BOON_BY[b].icon} ${esc(T.BOON_BY[b].name)}</span>`).join('')}${h.consumables.map((c) => `<span class="pill">${T.CONSUMABLE_BY[c].icon}</span>`).join('')}</div>
      <div class="row" style="margin-top:6px"><button class="sm" data-act="train" data-arg="${i}">Train (UP ${h.upUnspent})</button><button class="sm ghost" data-act="kit" data-arg="${i}">Kit</button></div></div>`,
      )
      .join('')}</div>`;
  }
  function renderMap() {
    const run = U.run;
    const map = run.map;
    const rows = map.rows
      .map(
        (row, ri) =>
          `<div class="map-row">${ri % 2 === 0 && ri < 6 ? `<span class="actlabel">${esc(map.actNames[T.actOf(ri)])}</span>` : ''}${row
            .map((id) => {
              const nd = map.all[id];
              const avail = run.available.includes(nd.id) && run.phase === 'map';
              const cls = [
                'mnode',
                avail ? 'avail' : '',
                nd.done ? 'done' : '',
                run.nodeId === nd.id ? 'current' : '',
                nd.type === 'boss' ? 'boss' : '',
              ].join(' ');
              const type = nd.type;
              return `<div class="${cls}" ${avail ? `data-act="goNode" data-arg="${nd.id}"` : ''} data-tip="${esc(T.MISSIONS[type] ? T.MISSIONS[type].blurb : type === 'haven' ? 'Rest, buy gear and consumables.' : 'A fork in the current.')}"><div class="ic">${NODE_ICON[type]}</div><div class="t">${NODE_NAME[type]}</div><div class="tier">${type === 'haven' || type === 'event' ? '' : 'tier ' + nd.tier}${nd.done ? ' ✓' : ''}</div></div>`;
            })
            .join('')}</div>`,
      )
      .join('');
    return `<div class="wrap">${header('The Tide Map', `<span class="pill" style="margin-left:6px">◇ ${run.crystals}</span>${run.tide !== 'rising' ? `<span class="pill" data-tip="${esc(T.TIDES[run.tide].txt)}">🌊 ${esc(T.TIDES[run.tide].n)}</span>` : ''}${run.lifeline ? '<span class="pill" data-tip="Once per run: lose a non-boss mission and limp on with no rewards.">🕯️ Lifeline</span>' : ''}<button class="ghost sm" data-act="quitToTitle">Title</button>`)}
      ${partyBar(run)}
      <div class="panel" style="margin-top:12px"><div class="row"><span class="dim small">Pick the next current. Glowing nodes are reachable. The Heart waits at the top.</span><span class="right small dim">Row ${run.nodeId != null ? map.all[run.nodeId].row + 1 : 0}/7</span></div><div class="map-rows">${rows}</div></div></div>`;
  }

  /* ───────────── TRAIN / KIT modals ───────────── */
  U.openTrain = function (i) {
    const h = U.run.heroes[i];
    U.openModal(
      `<div class="row"><h3>${esc(h.name)} — Train</h3><span class="right pill">UP left: <b style="margin-left:4px">${h.upUnspent}</b></span><button class="sm" data-act="autoUpRun" data-arg="${i}">Auto</button><button class="sm" data-act="closeModal">Done</button></div><p class="dim small">Spend UP on P (physical magnitude) or E (awakens the ethereal face at E 1, then scales its capability). Caps 3/3.</p><div class="pack">${h.cards.map((cid) => U.cardHTML(cid, { P: T.heroP(h, cid), E: T.heroE(h, cid), up: true, flavor: false }).replace(/data-act="up"/g, `data-act="upRun" data-hero="${i}"`)).join('')}</div>`,
    );
  };
  U.openKit = function (i) {
    const h = U.run.heroes[i];
    U.openModal(`<div class="row"><h3>${esc(h.name)} <span class="dim" style="font-weight:400">${esc(h.title)}</span></h3><span class="right small dim">${h.species.map((s) => T.SPECIES[s].icon + ' ' + T.SPECIES[s].name).join(' · ')}</span><button class="sm" data-act="closeModal">Close</button></div>
    <div class="row small" style="margin:6px 0">${h.gear.map((g, gi) => `<span class="pill">${T.GEAR_BY[g.id].icon} ${esc(T.GEAR_BY[g.id].name)} <button class="sm ghost" data-act="sellGear" data-arg="${i}|${gi}" title="sell for half">sell</button></span>`).join('')}${h.boons.map((b) => `<span class="pill" data-tip="${esc(T.BOON_BY[b].desc)}">${T.BOON_BY[b].icon} ${esc(T.BOON_BY[b].name)}</span>`).join('')}</div>
    <div class="pack">${h.cards.map((cid) => U.cardHTML(cid, { P: T.heroP(h, cid), E: T.heroE(h, cid), showUp: true, flavor: false })).join('')}</div>`);
  };

  /* ───────────── REWARD ───────────── */
  function renderReward() {
    const run = U.run;
    const rw = run.lastReward;
    const bonus = rw.bonus
      .map((b) => `<div class="bonus ${b.achieved ? 'ok' : 'no'}">${b.achieved ? '✓' : '○'} ${esc(b.text)}</div>`)
      .join('');
    const offer =
      rw.offer && rw.offer.length && !rw.picked
        ? `<hr><h3>Claim a trait</h3><p class="dim small">Pick one and give it to a hero whose bloodline matches (3-of-9 cap per species, 9 cards max). Or skip for +2 ◇.</p><div class="pack">${rw.offer
            .map(
              (cid) =>
                `<div>${U.cardHTML(cid, { flavor: false })}<div class="row" style="margin-top:6px">${run.heroes
                  .map((h, i) => {
                    const ok = T.canAddCard(h, cid);
                    return `<button class="sm ${ok.ok ? 'primary' : ''}" data-act="takeCard" data-arg="${cid}|${i}" ${ok.ok ? '' : 'disabled'} title="${ok.ok ? '' : esc(ok.why)}">→ ${esc(h.name)}</button>`;
                  })
                  .join('')}</div></div>`,
            )
            .join(
              '',
            )}</div><div class="row" style="margin-top:8px"><button class="ghost" data-act="skipCard">Skip (+2 ◇)</button></div>`
        : '';
    const boon =
      rw.boon && rw.boon.length && !rw.boonPicked
        ? `<hr><h3>An elite falls — choose a boon</h3><div class="row">${rw.boon.map((b) => `<div class="panel tight" style="min-width:220px"><b>${T.BOON_BY[b].icon} ${esc(T.BOON_BY[b].name)}</b><div class="small dim">${esc(T.BOON_BY[b].desc)}</div><div class="row" style="margin-top:6px">${run.heroes.map((h, i) => `<button class="sm primary" data-act="takeBoon" data-arg="${b}|${i}">→ ${esc(h.name)}</button>`).join('')}</div></div>`).join('')}</div>`
        : '';
    const ready = (!rw.offer || !rw.offer.length || rw.picked) && (!rw.boon || !rw.boon.length || rw.boonPicked);
    return `<div class="wrap">${header(rw.lifeline ? 'Lifeline' : 'Mission Complete')}<div class="panel">
      ${rw.lifeline ? `<h3>${esc(rw.title)} — lost, but the tide spares you once</h3><p class="dim">No rewards from this current. Both heroes limp on at half vitality. The Lifeline is spent.</p>` : `<h3>${esc(rw.title)} — ${rw.rounds} rounds, ${rw.kills} foes destroyed</h3><div class="row" style="margin:8px 0"><span class="pill">+${rw.up} UP each</span><span class="pill">+${rw.crystals} ◇</span></div>${bonus}`}
      ${offer}${boon}
      <div class="row" style="margin-top:14px"><button class="primary" data-act="rewardDone" ${ready ? '' : 'disabled'}>Continue to the map</button></div></div></div>`;
  }

  /* ───────────── HAVEN ───────────── */
  function renderHaven() {
    const run = U.run;
    const hv = run.haven;
    return `<div class="wrap">${header('Haven', `<span class="pill" style="margin-left:6px">◇ ${run.crystals}</span>`)}
      ${partyBar(run)}
      <div class="panel" style="margin-top:12px"><h3>Rest</h3><div class="row"><button data-act="rest" data-arg="half" ${hv.healed ? 'disabled' : ''}>Rest — recover half of missing vitality (free)</button><button data-act="rest" data-arg="full" ${hv.healed || run.crystals < 3 ? 'disabled' : ''}>Full repair — 3 ◇</button></div></div>
      <div class="panel" style="margin-top:12px"><h3>Gear <span class="dim small" style="font-weight:400">— fueled by ◇ per use; 2 slots per hero. Gear grants general verbs, never keyed counters.</span></h3>
        <div class="shop-grid">${
          hv.gear
            .map((gid) => {
              const g = T.GEAR_BY[gid];
              return `<div class="panel tight"><b>${g.icon} ${esc(g.name)} <span class="dim">· ${g.price} ◇</span></b><div class="small dim" style="margin:4px 0">${esc(g.desc)}</div>${g.abilities.map((a) => `<div class="small">• <b>${esc(a.n)}</b> (${a.cost} ◇, cd ${a.cd}): ${esc(a.txt())}</div>`).join('')}<div class="row" style="margin-top:6px">${run.heroes.map((h, i) => `<button class="sm ${run.crystals >= g.price && h.gear.length < 2 ? 'primary' : ''}" data-act="buyGear" data-arg="${gid}|${i}" ${run.crystals >= g.price && h.gear.length < 2 ? '' : 'disabled'}>→ ${esc(h.name)}</button>`).join('')}</div></div>`;
            })
            .join('') || '<span class="dim small">Sold out.</span>'
        }</div>
        <h3 style="margin-top:12px">Consumables <span class="dim small" style="font-weight:400">— one use, 3 per hero</span></h3>
        <div class="shop-grid">${hv.cons
          .map((cid) => {
            const c = T.CONSUMABLE_BY[cid];
            return `<div class="panel tight"><b>${c.icon} ${esc(c.name)} <span class="dim">· ${c.price} ◇</span></b><div class="small dim">${esc(c.txt)}</div><div class="row" style="margin-top:6px">${run.heroes.map((h, i) => `<button class="sm" data-act="buyCons" data-arg="${cid}|${i}" ${run.crystals >= c.price && h.consumables.length < 3 ? '' : 'disabled'}>→ ${esc(h.name)}</button>`).join('')}</div></div>`;
          })
          .join('')}</div>
      </div>
      <div class="row" style="margin-top:12px"><button class="primary" data-act="leaveHaven">Back to the current</button></div></div>`;
  }

  /* ───────────── EVENT ───────────── */
  function renderEvent() {
    const run = U.run;
    const ev = run.event;
    const def = ev.def;
    let body;
    if (!ev.resolved)
      body = `<div class="col">${def.options
        .map((o, i) => {
          const cost = o.cost && o.cost.crystals;
          const can = !cost || run.crystals >= cost;
          return `<button data-act="eventOpt" data-arg="${i}" ${can ? '' : 'disabled'} style="text-align:left;padding:10px 14px">${esc(o.label)}${!can ? ' <span class="dim small">(not enough ◇)</span>' : ''}</button>`;
        })
        .join('')}</div>`;
    else {
      let fu = '';
      const f = ev.followup;
      if (f && f.kind === 'cardPick' && !f.done)
        fu = `<hr><h3>Choose a trait</h3><div class="pack">${f.offer
          .map(
            (cid) =>
              `<div>${U.cardHTML(cid, { flavor: false })}<div class="row" style="margin-top:6px">${run.heroes
                .map((h, i) => {
                  const ok = T.canAddCard(h, cid);
                  return `<button class="sm ${ok.ok ? 'primary' : ''}" data-act="evTakeCard" data-arg="${cid}|${i}" ${ok.ok ? '' : 'disabled'}>→ ${esc(h.name)}</button>`;
                })
                .join('')}</div></div>`,
          )
          .join('')}</div><button class="ghost sm" data-act="evSkipCard" style="margin-top:6px">Take nothing</button>`;
      else if (f && f.kind === 'tradeCard' && !f.done) {
        const h = run.heroes[f.heroIdx];
        fu = `<hr><h3>${esc(h.name)} — choose a trait to shed</h3><p class="dim small">A random trait of the same bloodline replaces it.</p><div class="pack">${h.cards.map((cid) => U.cardHTML(cid, { pickable: true, act: 'evTrade', flavor: false })).join('')}</div><button class="ghost sm" data-act="evSkipCard" style="margin-top:6px">Keep everything</button>`;
      } else if (f && f.kind === 'tradeCard' && f.done)
        fu = `<p class="small">${esc(run.heroes[f.heroIdx].name)} sheds <b>${esc(T.CARD[f.dropped].name)}</b> and grows <b>${f.gained ? esc(T.CARD[f.gained].name) : 'nothing — the bloodline is exhausted'}</b>.</p>`;
      else if (f && f.kind === 'boonGiven')
        fu = `<p class="small">${esc(f.hero)} gains <b>${T.BOON_BY[f.boon].icon} ${esc(T.BOON_BY[f.boon].name)}</b> — ${esc(T.BOON_BY[f.boon].desc)}</p>`;
      else if (f && f.kind === 'respec')
        fu = `<p class="small">${esc(f.hero)}'s Upgrade Points return to the pool. Use <b>Train</b> on the map to spend them again.</p>`;
      const ready = !f || f.done || !['cardPick', 'tradeCard'].includes(f.kind);
      body = `<p style="font-family:var(--serif);font-size:15px">${esc(ev.result)}</p>${fu}<div class="row" style="margin-top:12px"><button class="primary" data-act="leaveEvent" ${ready ? '' : 'disabled'}>Continue</button></div>`;
    }
    return `<div class="wrap">${header('Event', `<span class="pill" style="margin-left:6px">◇ ${run.crystals}</span>`)}<div class="panel" style="max-width:760px;margin:0 auto"><div class="row"><span style="font-size:30px">${def.icon}</span><h2 style="margin:0">${esc(def.title)}</h2></div><p style="font-family:var(--serif);font-size:15.5px;line-height:1.5">${esc(def.text)}</p>${body}</div></div>`;
  }

  /* ───────────── SUMMARY ───────────── */
  function renderSummary() {
    const run = U.run;
    const won = run.won;
    return `<div class="wrap">${header(won ? 'The Consolidation Falls' : 'The Tide Takes the Skiff')}<div class="panel" style="max-width:760px;margin:0 auto">
      <p style="font-family:var(--serif);font-size:16px;line-height:1.5">${esc(won ? T.FLAVOR.win[0] : T.FLAVOR.lose[0])}</p>
      <div class="kv" style="margin:10px 0"><span class="dim">Missions</span><span>${run.stats.missions} (${run.history.filter((x) => x.won).length} won)</span><span class="dim">Rounds fought</span><span>${run.stats.rounds}</span><span class="dim">Foes destroyed</span><span>${run.stats.kills}</span><span class="dim">Crystals left</span><span>${run.crystals} ◇</span><span class="dim">Lifeline used</span><span>${run.stats.lifelineUsed ? 'yes' : 'no'}</span></div>
      <div class="small">${run.history.map((h) => `<div class="row"><span>${NODE_ICON[h.archetype] || '•'} ${esc(h.title)}</span><span class="dim">${h.rounds} rounds · ${h.kills} kills</span><span class="right ${h.won ? 'el-S' : 'el-M'}">${h.won ? 'won' : 'lost'}</span></div>`).join('')}</div>
      <hr>${run.heroes.map((h) => `<div class="row small"><b>${esc(h.name)}</b><span class="dim">dealt ${h.stats.dmgDealt} · took ${h.stats.dmgTaken} · ${h.stats.kills} kills</span></div>`).join('')}
      <div class="row" style="margin-top:14px"><button class="primary" data-act="newRun">New Tide</button><button class="ghost" data-act="toTitle">Title</button></div></div></div>`;
  }

  /* ───────────── CODEX ───────────── */
  function renderCodex() {
    const c = U.codex;
    const tabs = ['species', 'bestiary', 'gear', 'boons', 'rules'];
    let body = '';
    if (c.tab === 'species') {
      const sp = T.SPECIES[c.sp];
      body = `<div class="codex-nav" style="margin-bottom:10px">${T.SPECIES_ORDER.map((s) => `<button class="sm ${c.sp === s ? 'primary' : ''}" data-act="codexSp" data-arg="${s}">${T.SPECIES[s].icon} ${esc(T.SPECIES[s].name)}</button>`).join('')}</div>
        <div class="row"><h3>${sp.icon} ${esc(sp.name)} <span class="dim small" style="font-weight:400">leans ${sp.lean} — ${esc(sp.tagline)}</span></h3><span class="right row small">Preview at P <button class="sm" data-act="codexPE" data-arg="P|-1">−</button><b>${c.P}</b><button class="sm" data-act="codexPE" data-arg="P|1">+</button> E <button class="sm" data-act="codexPE" data-arg="E|-1">−</button><b>${c.E}</b><button class="sm" data-act="codexPE" data-arg="E|1">+</button></span></div>
        <div class="pack" style="margin-top:8px">${T.cardsOf(c.sp)
          .map((cd) => U.cardHTML(cd.id, { P: c.P, E: c.E }))
          .join('')}</div>`;
    } else if (c.tab === 'bestiary') {
      body = `<div class="shop-grid">${Object.entries(T.ENEMIES)
        .map(
          ([k, e]) =>
            `<div class="panel tight"><b>${e.glyph} ${esc(e.name)} <span class="dim small">· ${e.role}${e.elite ? ' · elite' : ''}${e.boss ? ' · boss' : ''}</span></b><div class="small mono dim">hp ${e.hp.join('/')} · speed ${e.speed}${e.shield ? ' · shield ' + e.shield.join('/') : ''}${e.hidden ? ' · starts Hidden' : ''}</div>${Object.values(
              e.abilities,
            )
              .map(
                (a) =>
                  `<div class="small">• <b>${esc(a.n)}</b> ${a.dmg ? '(' + a.dmg.join('/') + ' ' + a.kind + ')' : '(' + a.kind + ')'}${a.push ? ', push ' + a.push : ''}${a.pull ? ', pull ' + a.pull : ''}${a.anchor ? ', roots ' + a.anchor : ''}</div>`,
              )
              .join('')}<div class="flavor">${esc(e.flavor)}</div></div>`,
        )
        .join('')}</div>`;
    } else if (c.tab === 'gear') {
      body = `<div class="shop-grid">${T.GEAR.map((g) => `<div class="panel tight"><b>${g.icon} ${esc(g.name)} <span class="dim">· ${g.price} ◇</span></b><div class="small dim" style="margin:4px 0">${esc(g.desc)}</div>${g.abilities.map((a) => `<div class="small">• <b>${esc(a.n)}</b> (${a.cost} ◇, cd ${a.cd}): ${esc(a.txt())}</div>`).join('')}</div>`).join('')}</div><h3 style="margin-top:12px">Consumables</h3><div class="row">${T.CONSUMABLES.map((x) => `<span class="pill">${x.icon} ${esc(x.name)} · ${x.price} ◇ — ${esc(x.txt)}</span>`).join('')}</div>`;
    } else if (c.tab === 'boons') {
      body = `<div class="shop-grid">${T.BOONS.map((b) => `<div class="panel tight"><b>${b.icon} ${esc(b.name)}</b><div class="small dim">${esc(b.desc)}</div></div>`).join('')}</div>`;
    } else body = U.helpHTML();
    return `<div class="wrap">${header('Codex', `<button class="sm" data-act="codexBack">Back</button>`)}<div class="codex-nav" style="margin-bottom:10px">${tabs.map((t) => `<button class="${c.tab === t ? 'primary' : ''}" data-act="codexTab" data-arg="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>${body}</div>`;
  }

  U.helpHTML = function () {
    return `<div class="help"><h3>How to play</h3>
      <p><b>The turn.</b> Each round your two heroes act freely, in any order, interleaved. At the start of the round each hero's <b>track</b> slides one column (cards come back), engines fire, and each hero <b>rolls 3 dice</b> from their 15-die pool into their bank. Dice you don't spend stay banked — but the pool shrinks, so hoarding starves next turn's roll. <b>Three AP a turn is normal; etherions are scarce spice.</b></p>
      <p><b>Cards have two faces.</b> The <b>Physical</b> face costs AP, has a short cooldown, and scales with <b>P</b>. The <b>Ethereal</b> face costs AP + an etherion, has a longer cooldown, and does something physical cannot — teleport, area, chain, control, engines — scaling with <b>E</b>. Playing <i>either</i> face sends the whole card to the track for its cooldown.</p>
      <p><b>Enemies telegraph.</b> Every enemy shows what it will do before you act. Step out of its lane and a lane shot has no line. Move two nodes and a slow brute spends its turn walking. Hide and ranged shots strike afterimages. Push it off the node and its plan collapses. <b>Defense is proactive</b> — there are no reactions; you prepare on your turn.</p>
      <p><b>Lanes.</b> Nodes share a color = a lane. Ranged ("lane") strikes hit anything in your lane at any distance. Melee needs a shared edge. Height nodes (dashed ring) can only be reached by Space verbs — teleport, climb, hover — or by dropping the ramp with the lever.</p>
      <p><b>States, never keys.</b> Hidden is broken by melee, area, being moved, or being Located. Shield is bypassed by Pierce, area or true damage. Anchored can't be moved — and still acts. No ability ever takes a turn away.</p>
      <p><b>Resources.</b> <kbd>M</kbd> Mass · <kbd>C</kbd> Charge · <kbd>S</kbd> Space · <kbd>T</kbd> Time · <kbd>◇</kbd> Omni spends as any. One of each M C S T can be folded into an Omni (the anti-brick valve). <b>Omnicrystals (◇)</b> are the managed economy: buy gear and fuel it.</p>
      <p><b>Basic actions.</b> With or without cards, any hero can <b>Strike</b> an adjacent foe for 2 (2 AP), <b>Brace</b> for Shield 1 until their next turn (1 AP), or <b>Shove</b> an adjacent foe 1 node (2 AP). They are weak on purpose: the floor, not a plan. <b>Channel</b> a banked etherion (or Omni) on its own, with no AP: Mass — Strike an adjacent foe for 2 or Shove it 1 node; Charge — Arc 1 damage into a foe up to 3 away, or Reach an objective 2 nodes away (1 AP); Space — Scramble 1 node, up or down a ledge; Time — Brace and slide your track 1 extra. Elements are never dead weight: every crystal you roll is something to do.</p>
      <p><b>Downed.</b> At 0 vitality a hero is downed, not dead. An adjacent ally can <b>Rally</b> them for 2 AP (back at 8). Both downed = mission lost. Lose a non-boss mission and your one <b>Lifeline</b> lets you limp on.</p>
      <p><b>Winning.</b> Reach the top of the Tide Map and destroy the Heart. Its shield is fed by its Spawners.</p></div>`;
  };

  /* ───────────── TUTORIAL ───────────── */
  const TUT = {
    map: 'Pick a glowing node. Missions pay UP and ◇; Havens heal and sell gear; Events are forks. You can <b>Train</b> to spend UP any time on the map.',
    mission:
      "<b>Your first mission.</b> Read the red intents on the board first — they show exactly what each enemy will do. Then click a hero, spend their dice on card faces (hover for numbers), click a node to walk (1 AP per step), and press <b>End Round</b>. Bank dice you don't need.",
  };
  U.showTutorial = function (key) {
    try {
      const seen = JSON.parse(localStorage.getItem('tumult_v2_tut') || '{}');
      if (seen[key]) return;
      seen[key] = 1;
      localStorage.setItem('tumult_v2_tut', JSON.stringify(seen));
    } catch (e) {}
    U.tut = key;
  };
  function tutorialHTML() {
    if (!U.tut || !TUT[U.tut]) return '';
    return `<div class="tutorial">${TUT[U.tut]}<div class="row" style="margin-top:8px"><button class="sm primary" data-act="tutClose">Got it</button></div></div>`;
  }

  /* ───────────── RENDER ROOT ───────────── */
  let shown = null;
  U.render = function () {
    const root = app();
    let html = '';
    switch (U.screen) {
      case 'title':
        html = renderTitle();
        break;
      case 'draft':
        html = renderDraft();
        break;
      case 'map':
        html = renderMap();
        break;
      case 'mission':
        html = U.renderMission();
        break;
      case 'reward':
        html = renderReward();
        break;
      case 'haven':
        html = renderHaven();
        break;
      case 'event':
        html = renderEvent();
        break;
      case 'summary':
        html = renderSummary();
        break;
      case 'codex':
        html = renderCodex();
        break;
      case 'help':
        html = `<div class="wrap">${header('How to Play', `<button class="sm" data-act="codexBack">Back</button>`)}<div class="panel">${U.helpHTML()}</div></div>`;
        break;
    }
    if (U.modal) html += `<div class="modal-bg" data-act="closeModalBg"><div class="modal">${U.modal.html}</div></div>`;
    html += tutorialHTML();
    root.innerHTML = html;
    // #app is the page's scroller: a new screen starts at its top, a re-render stays where it was
    if (shown !== U.screen) root.scrollTop = 0;
    shown = U.screen;
    if (U.screen === 'mission') U.afterMissionRender();
    if (U.modal && U.modal.onMount) U.modal.onMount();
  };

  /* ───────────── ACTION DISPATCH (event delegation) ───────────── */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.disabled) return;
    const act = t.getAttribute('data-act');
    const arg = t.getAttribute('data-arg');
    // an add-on (the playtest panel) sees every action first and may take it
    if (U.extraAct && U.extraAct(act, arg, t, e)) return;
    if (U.handleMissionAct && U.screen === 'mission' && U.handleMissionAct(act, arg, t, e)) return;
    switch (act) {
      case 'pickTide': {
        if (!T.TIDES[arg]) return;
        const meta = T.loadMeta();
        meta.tide = arg;
        T.saveMeta(meta);
        U.render();
        return;
      }
      case 'newRun':
        U.startDraft();
        U.sfx.click();
        return;
      case 'continueRun': {
        const r = T.loadRun();
        if (!r) return;
        U.run = r;
        if (r.phase === 'mission' && r.mission) {
          // a mission in progress is part of the save: carry on in the middle of the round
          U.screen = 'mission';
          U.enterMission();
        } else U.screen = ['reward', 'haven', 'event'].includes(r.phase) ? r.phase : 'map';
        U.render();
        return;
      }
      case 'toTitle':
      case 'quitToTitle':
        if (U.run && !U.run.over) T.saveRun(U.run);
        U.screen = 'title';
        U.render();
        return;
      case 'toggleSound':
        U.sound = !U.sound;
        U.render();
        return;
      case 'help':
        U.prevScreen = U.screen;
        U.screen = 'help';
        U.render();
        return;
      case 'codex':
        U.prevScreen = U.screen;
        U.screen = 'codex';
        U.render();
        return;
      case 'codexBack':
        U.screen = U.prevScreen || 'title';
        U.render();
        return;
      case 'codexTab':
        U.codex.tab = arg;
        U.render();
        return;
      case 'codexSp':
        U.codex.sp = arg;
        U.render();
        return;
      case 'codexPE': {
        const [w, d] = arg.split('|');
        U.codex[w] = Math.max(0, Math.min(3, U.codex[w] + parseInt(d, 10)));
        U.render();
        return;
      }
      case 'tutClose':
        U.tut = null;
        U.render();
        return;
      case 'closeModal':
        U.closeModal();
        return;
      case 'closeModalBg':
        if (e.target.closest('.modal')) return;
        if (U.screen === 'mission' && U.run && U.run.mission && U.run.mission.over) return;
        U.closeModal();
        return;
      case 'train':
        U.openTrain(parseInt(arg, 10));
        return;
      case 'kit':
        U.openKit(parseInt(arg, 10));
        return;
      case 'upRun': {
        const i = parseInt(t.getAttribute('data-hero'), 10);
        const [cid, which, delta] = arg.split('|');
        const r = T.adjustUp(U.run.heroes[i], cid, which, parseInt(delta, 10));
        if (!r.ok && r.why) U.toast(r.why === 'cap' ? 'Capped at 3.' : 'No UP left.');
        U.openTrain(i);
        return;
      }
      case 'autoUpRun':
        T.autoAllocate(U.run.heroes[parseInt(arg, 10)]);
        U.openTrain(parseInt(arg, 10));
        return;
      case 'sellGear': {
        const [i, gi] = arg.split('|').map(Number);
        T.sellGear(U.run, i, gi);
        U.openKit(i);
        return;
      }
      case 'goNode': {
        const r = T.chooseNode(U.run, parseInt(arg, 10));
        if (!r.ok) return;
        U.sfx.click();
        if (U.run.phase === 'mission') {
          U.screen = 'mission';
          U.enterMission();
          U.showTutorial('mission');
        } else {
          U.screen = U.run.phase;
        }
        T.saveRun(U.run);
        U.render();
        return;
      }
      case 'takeCard': {
        const [cid, i] = arg.split('|');
        const r = T.takeOfferedCard(U.run, cid, parseInt(i, 10));
        if (!r.ok) U.toast(r.why);
        U.sfx.click();
        U.render();
        return;
      }
      case 'skipCard':
        T.skipOfferedCard(U.run);
        U.render();
        return;
      case 'takeBoon': {
        const [b, i] = arg.split('|');
        T.takeBoon(U.run, b, parseInt(i, 10));
        U.render();
        return;
      }
      case 'rewardDone':
        T.finishNode(U.run);
        T.saveRun(U.run);
        U.screen = U.run.phase === 'summary' ? 'summary' : 'map';
        if (U.screen === 'summary') finishRunMeta();
        U.render();
        return;
      case 'rest': {
        const r = T.havenRest(U.run, arg === 'full');
        if (!r.ok) U.toast(r.why);
        U.sfx.heal();
        U.render();
        return;
      }
      case 'buyGear': {
        const [g, i] = arg.split('|');
        const r = T.buyGear(U.run, g, parseInt(i, 10));
        if (!r.ok) U.toast(r.why);
        else U.sfx.click();
        U.render();
        return;
      }
      case 'buyCons': {
        const [c, i] = arg.split('|');
        const r = T.buyConsumable(U.run, c, parseInt(i, 10));
        if (!r.ok) U.toast(r.why);
        else U.sfx.click();
        U.render();
        return;
      }
      case 'leaveHaven':
        T.finishNode(U.run);
        T.saveRun(U.run);
        U.screen = 'map';
        U.render();
        return;
      case 'eventOpt': {
        const r = T.resolveEvent(U.run, parseInt(arg, 10), 0);
        if (!r.ok) {
          U.toast(r.why);
          return;
        }
        U.render();
        return;
      }
      case 'evTakeCard': {
        const [cid, i] = arg.split('|');
        const r = T.addCard(U.run.heroes[parseInt(i, 10)], cid);
        if (!r.ok) {
          U.toast(r.why);
          return;
        }
        U.run.event.followup.done = true;
        U.render();
        return;
      }
      case 'evSkipCard':
        U.run.event.followup.done = true;
        U.render();
        return;
      case 'evTrade': {
        const f = U.run.event.followup;
        const gained = T.tradeCard(U.run, f.heroIdx, arg);
        f.done = true;
        f.dropped = arg;
        f.gained = gained;
        U.render();
        return;
      }
      case 'leaveEvent':
        T.finishNode(U.run);
        T.saveRun(U.run);
        U.screen = 'map';
        U.render();
        return;
    }
    if (U.screen === 'draft') draftAct(act, arg);
  });
  function finishRunMeta() {
    const meta = T.loadMeta();
    meta.runs++;
    if (U.run.won) meta.wins++;
    const row = U.run.nodeId != null ? U.run.map.all[U.run.nodeId].row + 1 : 0;
    meta.bestRow = Math.max(meta.bestRow, row);
    meta.bestKills = Math.max(meta.bestKills || 0, U.run.stats.kills);
    T.saveMeta(meta);
    T.clearSave();
  }
  U.finishRunMeta = finishRunMeta;

  // Render once the whole script has run and #app exists, whether or not the page is still loading.
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => U.render());
  else setTimeout(() => U.render(), 0);
})((window.T = window.T || {}));
