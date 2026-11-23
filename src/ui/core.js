/* ============================================================================
   TUMULT v2.0 — UI CORE: screens outside the mission, shared widgets.
   ========================================================================== */
(function (T) {
  const U = (T.UI = Object.assign(T.UI || {}, {
    screen: 'title',
    run: null,
    draft: null,
    codex: { tab: 'species', sp: 'human', P: 0, E: 0 },
    sound: true,
    tutorialSeen: false,
    modal: null,
    pendingTrain: false,
  }));
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
      const gain = U.fxGain ? U.fxGain() : 1; // the Effects slider in Settings (src/ui/settings.js)
      if (gain <= 0) return;
      g.gain.value = (vol || 0.04) * gain;
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
  /** Open a modal; `opts.sheet` slides it up from the bottom (a phone's More), `opts.side` in from the right,
   *  `opts.cls` names a look of its own (the window gets that class, its backdrop the class plus "-bg"). */
  U.openModal = function (html, onMount, opts) {
    U.modal = Object.assign({ html, onMount }, opts || {});
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
    const a = U.abilityArt && U.abilityArt(card.id, fk);
    return `${a ? `<span class="tip-art ${a.cls}" style="${a.style}"></span>` : ''}<b>${esc(card.name)} — ${esc(face.n)}</b> <span class="dim">(${!T.isEthFace(fk) ? (card.pet ? 'Physical face, played through the pet' : card.gear ? 'Gear face: ' + T.gearCostText({ omni: face.el }) + ', never trained' : 'Physical') : EL[face.elt || card.el].name + ' face' + (card.pet ? ', played through the pet' : '')}${card.pet || card.gear ? '' : !T.isEthFace(fk) ? ' face' : ''})</span><div style="margin:4px 0" class="mono small">${costStr(card, face, fk)}</div><div>${esc(face.txt(P, E))}</div>${U.kwGloss(face.txt(P, E))}${T.isEthFace(fk) ? `<div class="mute small" style="margin-top:4px">E unlocks and scales this capability; P ${face.txt(1, 0) !== face.txt(0, 0) ? 'also scales a physical sub-part' : 'does not substitute for it'}.</div>` : ''}`;
  };
  /** The clade a pilot with these clades carries card `c` through: its own bloodline first, else a clade that shares it. */
  U.cladeIn = (c, clades) =>
    (clades && (clades.find((x) => x === c.sp) || clades.find((x) => c.clades.includes(x)))) || c.sp;
  U.cardHTML = function (cardId, o) {
    o = o || {};
    const c = T.CARD[cardId];
    const P = o.P || 0,
      E = o.E || 0;
    // A shared trait names the clade that carries it for this pilot (o.clades), not the one it was first written for.
    const shownSp = U.cladeIn(c, o.clades);
    const sp = T.SPECIES[shownSp];
    const face = (fk) => {
      const f = c[fk];
      const need = T.faceNeedE(cardId, fk);
      const eth = T.isEthFace(fk);
      // a pet's Ethereal faces read asleep wherever its card is shown, until its E awakens them
      const asleep = eth && (o.up || o.showUp || c.pet) && E < need;
      return `<div class="face ${eth ? 'E' : 'P'} el-${f.elt || c.el}${asleep ? ' asleep' : ''}"><div class="fh"><span class="fn" style="color:${!eth ? '#dfe7f2' : ''}">${esc(f.n)}</span>${eth ? `<span class="tag bg-${f.elt || c.el} el-${f.elt || c.el}">${EL[f.elt || c.el].name}</span>` : c.gear ? '<span class="tag" style="border:1px solid var(--line2);color:var(--O)">Gear</span>' : '<span class="tag" style="border:1px solid var(--line2);color:var(--AP)">Physical</span>'}${T.isMounted && T.isMounted(c, fk) ? '<span class="tag mounted" data-tip="Mounted: you can play this face from inside a vehicle.">Mounted</span>' : ''}<span class="cost">${costStr(c, f, fk)}</span></div><div class="ft">${U.kw(esc(f.txt(P, asleep ? need : E)))}</div>${asleep ? `<div class="small asleep-note">Asleep — awaken it with ${need} E</div>` : ''}</div>`;
    };
    return `<div class="tcard ${o.pickable ? 'pickable' : ''} ${o.sel ? 'sel' : ''}" data-card="${cardId}" ${o.act ? `data-act="${o.act}" data-arg="${cardId}"` : ''}>
      <div class="head"><span class="name">${esc(c.name)}</span>${c.sig >= 2 ? '<span class="star" title="signature">★</span>' : c.sig === 1 ? '<span class="star" title="minor signature">☆</span>' : ''}<span class="sp"${c.clades.length > 1 ? ` data-tip="Carried by ${esc(c.clades.map((x) => T.SPECIES[x].name).join(', '))}"` : c.gear ? ' data-tip="A gear card: it counts toward the nine, is never trained and goes with its gear"' : ''}>${c.gear ? U.icGear(c.gear) : U.icClade(shownSp)} ${esc(c.kin || sp.name)}</span></div>
      ${U.cardArt(c, false, shownSp)}${T.faceKeys(cardId).map(face).join('')}
      ${o.bound ? `<div class="small double-note">${o.bound} UP bound to this card</div>` : ''}
      ${c.gear ? '' : o.up ? `<div class="upctl">P <button class="sm" data-act="up" data-arg="${cardId}|P|-1">−</button><b>${P}</b><button class="sm" data-act="up" data-arg="${cardId}|P|1">+</button>${c.pet ? '' : ` &nbsp; E <button class="sm" data-act="up" data-arg="${cardId}|E|-1">−</button><b>${E}</b><button class="sm" data-act="up" data-arg="${cardId}|E|1">+</button>`}</div>` : o.showUp ? `<div class="mono small dim" style="margin-top:6px">P${P}${c.pet ? '' : ' · E' + E}</div>` : ''}
      ${o.flavor !== false ? `<div class="flavor">${esc(c.flavor)}</div>` : ''}
    </div>`;
  };
  /**
   * The dice are drawn as dice, each in its own shape (Garrett, 2026-11-15: "dice should look like dice"): the
   * plain die a d20, an element's die a d8, the ethereal die a d12. Outline and facet lines on a 40-unit grid.
   */
  U.DIE_SHAPE = {
    // an icosahedron seen down a corner: a hexagon, the front face in the middle, three faces round it
    d20: {
      out: 'M20 1.5 36 10.8 36 29.2 20 38.5 4 29.2 4 10.8z',
      lines:
        'M20 10.5 29.5 27 10.5 27zM20 10.5 20 1.5M20 10.5 36 10.8M20 10.5 4 10.8M29.5 27 36 29.2M29.5 27 36 10.8M29.5 27 20 38.5M10.5 27 4 29.2M10.5 27 20 38.5M10.5 27 4 10.8',
    },
    // a dodecahedron seen face on: a decagon, the front pentagon and five faces round it
    d12: {
      out: 'M20 1.5 30.9 5 37.6 14.3 37.6 25.7 30.9 35 20 38.5 9.1 35 2.4 25.7 2.4 14.3 9.1 5z',
      lines:
        'M20 11.5 28.6 17.7 25.3 27.8 14.7 27.8 11.4 17.7zM20 11.5 20 1.5M28.6 17.7 37.6 14.3M25.3 27.8 30.9 35M14.7 27.8 9.1 35M11.4 17.7 2.4 14.3',
    },
    // an octahedron turned a little: a diamond with its front corner nearer the eye
    d8: { out: 'M20 1.5 36.5 19 20 38.5 3.5 19z', lines: 'M3.5 19 23 24 36.5 19M20 1.5 23 24 20 38.5' },
  };
  /** The sides of a die of `kind` (a key of T.DICE; anything else is the plain d20). */
  U.dieSides = (kind) => (T.DICE[kind] && T.DICE[kind].sides) || 20;
  /** A die's body as SVG, in its own shape, for its kind. */
  U.dieSVG = (kind) => {
    const sh = U.DIE_SHAPE['d' + U.dieSides(kind)] || U.DIE_SHAPE.d20;
    return `<svg class="dbody" viewBox="0 0 40 40" aria-hidden="true"><path class="o" d="${sh.out}"/><path class="l" d="${sh.lines}"/></svg>`;
  };
  /** What shows on a rolled face: AP its number, an etherion its symbol. */
  U.faceGlyph = (f) => (f === 'AP' ? '<b>1</b>' : f === 'AP2' ? '<b>2</b>' : U.ic('el.' + f, f));
  /**
   * The art at the top of an ability card: what its two faces do, in pictures. The card is cut on a diagonal,
   * the Physical side in steel on the left and the Ethereal side in its etherion's colour on the right, each
   * with its face's verb drawn large, over the silhouette of the clade the trait comes from. `asleep` dims the
   * Ethereal side of a card not yet awakened.
   */
  U.cardArt = (c, asleep, sp) => {
    const elt = (c.E && c.E.elt) || c.el;
    // a painting of each face in action where one exists (src/ui/ability-art.js), each on its own side of the cut
    const pp = U.abilityArt && U.abilityArt(c.id, 'P'),
      pe = U.abilityArt && U.abilityArt(c.id, c.E ? 'E' : 'P2');
    const paint = (a, side) => (a ? `<b class="pa ${side}"><span class="${a.cls}" style="${a.style}"></span></b>` : '');
    return `<div class="hart${asleep ? ' asleep' : ''}${pp || pe ? ' painted' : ''}" style="--c:${EL[elt].color}" aria-hidden="true">${paint(pp, 'pa-p')}${paint(pe, 'pa-e')}<i class="clade">${c.gear ? U.icGear(c.gear) : U.icClade(sp || c.sp)}</i><i class="vp">${U.icFace(c.P, c.el)}</i><i class="ve">${U.icFace(c.E || c.P2, c.el)}</i></div>`;
  };
  /**
   * A die showing face `f`. `kind` is a key of T.DICE (the plain die when left out); `attrs` adds attributes to
   * the element (the mission screen's click target). The tooltip says what the face pays for, the Channel an
   * etherion is on its own, and which die it was rolled on.
   */
  const dieHTML = (f, extra, kind, attrs) => {
    const k = kind && kind !== 'plain' && T.DICE[kind] ? kind : '';
    const what =
      f === 'AP'
        ? 'AP — the common currency. 1 action point.'
        : f === 'AP2'
          ? 'AP2 — a double AP face (worth 2).'
          : f === 'O'
            ? 'Omni — spends as any etherion.'
            : EL[f].name + ' — ' + EL[f].surface;
    const acts = (T.BASIC || []).filter((b) => b.el === f);
    const chan = acts.length
      ? ` Or spend it alone as a Channel: ${acts.map((b) => b.n + (b.ap ? ` (+${b.ap} AP)` : '')).join(', ')}.`
      : '';
    const sides = U.dieSides(k || 'plain');
    const from = ` Rolled on your ${k ? T.DICE[k].n : 'plain die'} (d${sides}).`;
    return `<span class="die ${f} d${sides} ${k ? 'kind k-' + k : ''} ${extra || ''}" ${attrs || ''} data-tip="${esc(what + chan + from)}">${U.dieSVG(k || 'plain')}<i class="face">${U.faceGlyph(f)}</i></span>`;
  };
  /** The key to the die symbols, always beside a pilot's dice. */
  U.diceKey = () =>
    `<div class="dicekey small dim" aria-label="Dice key">${['M', 'C', 'S', 'T', 'O'].map((e) => `<span>${U.ic('el.' + e, e)} ${esc(EL[e].name)}</span>`).join('')}<span>${U.ic('ap', '·')} AP</span><span class="dk-sz">d20 plain · d8 element · d12 ethereal</span></div>`;
  U.dieHTML = dieHTML;

  /* ───────────── header strip ───────────── */
  function header(title, right) {
    return `<div class="row" style="margin-bottom:10px"><span class="kick">Tumult</span><h2 style="margin:0 6px">${title}</h2><span class="right row"><button class="ghost sm" data-act="toggleSound">${U.sound ? '🔊' : '🔇'}</button><button class="ghost sm" data-act="help">? Help</button><button class="ghost sm" data-act="atlas">Atlas</button><button class="ghost sm" data-act="codex">Codex</button><button class="ghost sm" data-act="look" data-tip="The sea behind the game, its accent and how much moves">Look</button>${right || ''}</span></div>`;
  }
  U.header = header;
  /** The way out of a run screen: to the title (the run is saved), or out of an online game. */
  const titleBtn = () =>
    U.net && U.net.online()
      ? `<button class="ghost sm" data-act="netLeave">Leave game</button>`
      : `<button class="ghost sm" data-act="quitToTitle" data-tip="Back to the title screen. The run is saved: Continue picks it up here.">Title</button>`;
  U.titleBtn = titleBtn;

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
    // a different pilot in their world behind the title each expedition, so the people come first
    const who = U.PILOT_ART[meta.runs % U.PILOT_ART.length];
    const scene = U.sceneSrc(who);
    return `${scene ? `<div class="title-scene" style="background-image:url(${scene})"></div><div class="title-veil"></div><div class="title-cap"><b>${esc(who.name)}</b> · ${esc(U.callsignOf(who))} · ${esc(who.clades.join(' · '))} ${U.canonMark ? U.canonMark('pilot:' + who.key, `${who.name}, callsign ${U.callsignOf(who)}: ${who.clades.join(' and ')}`, 'title:caption') : ''}</div>` : ''}<div class="title">
      <div class="kick">An expedition on Tumult</div>
      <h1>TUMULT</h1>
      <div class="sub">Draft a squad of pilots from Tumult's bloodlines and lead them down from the Ark, across Tumult by land, sea and air, to the Heart at the end of the route. Every turn is a puzzle: four dice, a six-column track, and enemies that tell you what they'll do.</div>
      ${U.welcomeTitle ? U.welcomeTitle(meta, hasSave) : ''}
      <div class="btns">${U.isNewPlayer && U.isNewPlayer(meta, hasSave) ? '<button data-act="newRun" data-tip="Draft your own pilots from the bloodlines, card by card.">Build your own squad</button>' : '<button class="primary" data-act="newRun">New Expedition</button>'}${hasSave ? '<button data-act="continueRun">Continue</button>' : ''}<button data-act="atlas">Atlas</button><button data-act="codex">Codex</button><button data-act="help">How to Play</button><button data-act="canonList" data-tip="Answers and corrections you have written while playing">Canon</button><button class="ghost" data-act="toggleSound">${U.sound ? '🔊 Sound on' : '🔇 Sound off'}</button><button class="ghost" data-act="look" data-tip="The sea behind the game, its accent and how much moves">Look</button></div>
      ${tidePicker(meta)}
      ${U.partyPicker ? U.partyPicker(meta) : ''}
      ${U.titleAccount ? U.titleAccount() : ''}
      ${U.titleNet ? U.titleNet() : ''}
      <div class="mute small" style="margin-top:14px">Expeditions: ${meta.runs} · Hearts ended: ${meta.wins} · Furthest stop: ${meta.bestRow}/6</div>
      <div class="mute small" style="max-width:520px;text-align:center;margin-top:16px;font-family:var(--serif);font-style:italic">${esc(T.FLAVOR.terminalIntro[meta.runs % T.FLAVOR.terminalIntro.length])}</div>
      ${U.titleExtra ? U.titleExtra() : ''}
      ${U.privacyLine ? U.privacyLine() : ''}
    </div>`;
  }

  /** What this squad's power asks of its missions (T.scaleFor), as a pill on the route; nothing for two new pilots. */
  U.scalePill = function (run) {
    const sc = T.scaleFor(run);
    if (!sc.over && !sc.under) return '';
    const n = T.squadSize(run);
    const who = `power ${sc.power}` + (n !== 2 ? `, a squad of ${n}` : '');
    const what = [
      `foes have ${sc.hp}% vitality`,
      sc.foes ? `${sc.foes} more foe${sc.foes > 1 ? 's' : ''} where a mission has room` : '',
      sc.fewer ? `${sc.fewer} fewer foe${sc.fewer > 1 ? 's' : ''}` : '',
      sc.need > 0 ? `objectives ask ${sc.need} more` : sc.need < 0 ? `objectives ask ${-sc.need} less` : '',
      sc.swarm > 0 ? `swarms grow ${sc.swarm} larger` : sc.swarm < 0 ? `swarms are ${-sc.swarm} smaller` : '',
      sc.clock ? `clocks run ${sc.clock} round${sc.clock > 1 ? 's' : ''} longer` : '',
    ].filter(Boolean);
    const how = `Each pilot brings power ${T.SCALING.PILOT}, and 1 more for every level past 1; missions are written for two new pilots (${2 * T.SCALING.PILOT}). A pilot that grows faster than the route expects (about 3 points a row) brings 1 more for every 6 points ahead.`;
    return `<span class="pill" data-tip="${esc(`<b>The missions answer ${who}</b><div>${what.join('; ')}. The Heart keeps its rules and grows only in its fight.</div><div class="dim">${how}</div>`)}">⚖ ${esc(who)}</span>`;
  };

  /* ───────────── DRAFT ───────────── */
  /** How many pilots this run's squad drafts: one a player (T.pilotsFor; a run saved before 2.124 keeps its two). */
  const squadOf = (run) => (run && run.party ? run.party.owner.length : 1);
  const NAMES = ['Sable', 'Quill', 'Marrow', 'Tessel', 'Orin', 'Pell', 'Wren', 'Casque', 'Lumen', 'Hale'];
  /** A pre-made hero's banner: their pilot in their world, with the portrait over it. */
  function premadeArt(pb) {
    const h = { id: pb.id, name: pb.name, species: pb.species };
    const p = U.pilotOf(h);
    const sc = U.sceneSrc(p);
    if (!sc) return '';
    const label = U.isExact(p, h) ? p.key : 'stand-in · ' + p.key;
    return `<div class="pc-art" style="background-image:url(${sc})">${U.portrait(h, 'md')}<span class="pc-call">${esc(label)}</span></div>`;
  }
  /** A pre-made hero's card in the draft; a made hero says who made it, and its maker may let it go. */
  function pilotCard(pb, who, mine) {
    const clades = pb.species.slice(1);
    const sig = pb.cards.filter((c) => T.CARD[c].sig >= 2);
    const blurb = pb.blurb || (sig.length ? sig : pb.cards.slice(0, 3)).map((c) => T.CARD[c].name).join(' · ');
    const by = who ? `<div class="small mute">Made by ${esc(who)}</div>` : '';
    // a pilot back from expeditions shows how far it has grown: the missions it meets grow with it
    const probe = { up: pb.up || {}, bound: pb.bound || {}, cards: pb.cards, upUnspent: pb.spare || 0 };
    const lvl = pb.runs ? T.pilotLevel(probe) : 1;
    const vet = pb.runs
      ? `<div class="small" data-tip="Level ${lvl}: the missions of its expedition grow to meet it.">Level ${lvl} · ${pb.runs} expedition${pb.runs > 1 ? 's' : ''} · ${pb.cards.length} traits</div>`
      : '';
    const forget = mine
      ? `<button class="sm ghost made-x" data-act="forgetMade" data-arg="${esc(pb.id)}" data-tip="Take ${esc(pb.name)} off this device's list.">✕</button>`
      : '';
    return `<div class="sp-card pilot-card" data-act="prebuilt" data-arg="${esc(pb.id)}">${premadeArt(pb)}${forget}<div class="ic">${clades
      .map((s) => U.icClade(s))
      .join(
        ' ',
      )}</div><b>${esc(pb.name)} <span class="dim" style="font-weight:400">${esc(pb.title)}</span></b><div class="small dim">${clades
      .map((s) => T.SPECIES[s].name)
      .join(' · ')}</div><div class="small" style="margin-top:4px">${esc(blurb)}</div>${vet}${by}</div>`;
  }
  /**
   * The heroes players have made: this device's first, then those others shared through the test
   * page's store (src/ui/heroes-net.js), each once. [{ rec, who, mine }]
   */
  U.madeHeroes = function () {
    const seen = new Set();
    const out = [];
    T.loadMade().forEach((rec) => {
      seen.add(rec.id);
      out.push({ rec, who: 'you', mine: true });
    });
    (U.heroesFromOthers ? U.heroesFromOthers() : []).forEach((x) => {
      if (seen.has(x.rec.id)) return;
      seen.add(x.rec.id);
      out.push({ rec: x.rec, who: x.who || 'another player', mine: false });
    });
    return out;
  };
  /** A pre-made or made hero by id, and whether it was made on this device. */
  function choiceById(id) {
    const pb = T.PREBUILTS.find((p) => p.id === id);
    if (pb) return { pb, mine: false };
    const x = U.madeHeroes().find((m) => m.rec.id === id);
    return x ? { pb: x.rec, mine: x.mine } : null;
  }
  U.startDraft = function () {
    U.run = T.newRun();
    U.run.tide = chosenTide(T.loadMeta());
    if (U.chosenPlayers) U.run.party = T.newParty(U.chosenPlayers(T.loadMeta()));
    // how rounds go: Home's setup (src/ui/home.js), else the playtest panel's switch
    const rounds = U.homeRounds ? U.homeRounds() : U.roundsPref ? U.roundsPref() : null;
    if (rounds) U.run.party.rounds = rounds;
    if (U.applyTable) U.applyTable(U.run); // the expedition's length, when the engine has lengths
    U.beginDraft(0);
    U.render();
  };
  /** Carry on a saved expedition that is still in its draft: the next pilot to draft, or the route once all are. */
  U.resumeDraft = function (run) {
    U.run = run;
    if ((run.heroes || []).length < squadOf(run)) U.beginDraft(run.heroes.length);
    else {
      T.startMap(run);
      T.saveRun(run);
      U.screen = 'map';
    }
  };
  /** Begin drafting hero i (a guest playing online drafts their own while the host drafts theirs). */
  U.beginDraft = function (i) {
    U.draft = {
      heroIdx: i,
      step: 'mode',
      species: [],
      name: NAMES[T.runStream(U.run, 'squad').int(NAMES.length)],
      hero: null,
      pack: [],
      picks: 0,
    };
    U.screen = 'draft';
  };
  /** The draft's first step leads back: to the title, to the first pilot, or out of an online game. */
  function draftOut(d) {
    if (U.net && U.net.online()) return `<button class="ghost right" data-act="netLeave">Leave game</button>`;
    const prev = d.heroIdx > 0 ? U.run.heroes[d.heroIdx - 1] : null;
    if (prev)
      return `<button class="ghost right" data-act="draftPrev" data-tip="Back to ${esc(prev.name)}, the pilot before, as you left them.">Back to ${esc(prev.name)}</button>`;
    return `<button class="ghost right" data-act="draftQuit">Back to the title</button>`;
  }
  function renderDraft() {
    const d = U.draft;
    const run = U.run;
    const n = d.heroIdx + 1;
    const who = U.seatTag ? U.seatTag(d.heroIdx) : '';
    let body = '';
    if (d.step === 'mode') {
      const free = (pb) => !run.heroes.some((h) => h && h.name === pb.name);
      const made = U.madeHeroes().filter((x) => free(x.rec));
      body = `<div class="panel"><h3>Pilot ${n} ${who}· choose how to build</h3><p class="dim small">Every hero is Human plus two other bloodlines, six trait cards to start, six Upgrade Points to spend. You'll grow to nine cards over the run (never more than 3 of 9 from one bloodline).</p>
        <div class="row" style="margin:10px 0"><button class="primary" data-act="draftMode" data-arg="draft">Draft from packs (recommended)</button><span class="dim small">Pick 1 of 4, six times — a real limited draft across your three pools.</span>${draftOut(d)}</div>
        <h3 style="margin-top:14px">…or Quick Build a pre-made hero</h3>
        <div class="prebuilt-grid">${T.PREBUILTS.filter(free)
          .map((pb) => pilotCard(pb))
          .join('')}</div>
        ${made.length ? `<h3 style="margin-top:14px">…or play a pilot someone made</h3><p class="dim small">Every pilot built in the draft is kept here, ${U.heroesShared && U.heroesShared() ? 'for everyone who plays this page' : 'on this device'}, ready to fly again.</p><div class="prebuilt-grid">${made.map((x) => pilotCard(x.rec, x.who, x.mine)).join('')}</div>` : ''}</div>`;
    } else if (d.step === 'species') {
      body = `<div class="panel"><h3>Pilot ${n} ${who}: choose two bloodlines (Human is always the third)</h3>
        <div class="row" style="margin:8px 0">${U.portrait({ name: d.name, species: ['human'].concat(d.species) }, 'lg')}<span class="small dim">The portrait follows the two bloodlines: a painting of that exact pair when one exists, else the nearest stand-in.</span></div>
        <div class="row" style="margin:8px 0"><label class="small dim">Name</label><input id="heroName" value="${esc(d.name)}" style="background:#0b1222;border:1px solid var(--line2);color:var(--txt);padding:5px 8px;border-radius:6px"></div>
        <div class="species-grid">${T.SPECIES_ORDER.filter((s) => s !== 'human')
          .map((s) => {
            const sp = T.SPECIES[s];
            const sel = d.species.includes(s);
            return `<div class="sp-card ${sel ? 'sel' : ''}" data-act="pickSpecies" data-arg="${s}"><div class="ic">${U.icClade(s)}</div><b>${esc(sp.name)}</b><div class="small dim">leans ${sp.lean}</div><div class="small" style="margin-top:4px">${esc(sp.tagline)}</div><div class="small mute" style="margin-top:4px">${T.cardsOf(
              s,
            )
              .filter((c) => c.sig >= 2)
              .map((c) => '★ ' + c.name)
              .join(' · ')}</div></div>`;
          })
          .join('')}</div>
        <div class="row" style="margin-top:12px"><button class="primary" data-act="openPacks" ${d.species.length === 2 ? '' : 'disabled'}>Open the first pack</button><button class="ghost" data-act="draftBack">Back</button></div></div>`;
    } else if (d.step === 'packs') {
      // the draft (Frogma "Finalised UI", D-Draft-v2): the pack across the middle, the kit filling up along the foot
      const h = d.hero;
      const slots = [];
      for (let k = 0; k < T.RULES.START_CARDS; k++) {
        const cid = h.cards[k];
        slots.push(
          cid
            ? `<span class="kit-slot full" style="--c:${EL[(T.CARD[cid].E && T.CARD[cid].E.elt) || T.CARD[cid].el].color}" data-tip="${esc(T.CARD[cid].name)}">${esc(T.CARD[cid].name)}</span>`
            : `<span class="kit-slot${k === h.cards.length ? ' next' : ''}">${k === h.cards.length ? 'pick ' + (k + 1) : ''}</span>`,
        );
      }
      body = `<div class="panel draft2"><div class="d2-head"><h3>${esc(h.name)} · pick ${d.picks + 1} of ${T.RULES.START_CARDS}</h3><span class="d2-tab on">New pack · ${d.pack.length}</span><span class="right small dim">Kit ${h.cards.length}/${T.RULES.START_CARDS} · ${h.species.map((s) => `${U.icClade(s)}${T.cladeCount(h, s)}/3`).join(' · ')}</span></div>
        <p class="dim small">This pack mixes your three bloodlines: click a card to take it, or pass the pack. ★ marks a bloodline's signature traits. Hover any face for exact numbers at your current P/E.</p>
        <div class="pack">${d.pack.map((cid) => U.cardHTML(cid, { pickable: true, act: 'pickCard', clades: h.species })).join('')}</div>
        <div class="d2-kit"><span class="lab">Kit</span>${slots.join('')}<span class="d2-acts"><button class="ghost" data-act="draftBack" data-arg="species" data-tip="Choose other bloodlines. The cards picked so far are put back.">Back to bloodlines</button><button class="ghost" data-act="rerollPack" title="Costs nothing in this version; use it if a pack has nothing for you">Pass this pack</button></span></div></div>`;
    } else if (d.step === 'wait') {
      const other = run.party.players.find((p, s) => !run.heroes[s]);
      body = U.waitingRoom
        ? U.waitingRoom(run)
        : `<div class="panel"><h3>Your pilot is ready</h3><p class="dim">Waiting for ${esc(other ? other.name : 'the other player')} to finish drafting…</p></div>`;
    } else if (d.step === 'up') {
      const h = d.hero;
      body = `<div class="panel"><div class="row"><h3>${esc(h.name)} — spend Upgrade Points</h3><span class="right pill">UP left: <b style="margin-left:4px">${h.upUnspent}</b></span><button class="sm" data-act="autoUp">Auto</button><button class="sm ghost" data-act="resetUp">Reset</button></div>
        <p class="dim small">P deepens the physical face's numbers (reliable, AP-fed). E awakens the ethereal face — it cannot be played until its card has E 1 — and scales its <i>capability</i>, something P can never buy. Every hero sets out with at least ${T.RULES.START_AWAKE} cards awakened. Caps: P 3, E 3 per card.</p>
        <div class="pack">${h.cards.map((cid) => U.cardHTML(cid, { P: T.heroP(h, cid), E: T.heroE(h, cid), up: true, bound: T.boundLeft(h, cid), clades: h.species })).join('')}</div>
        ${U.pilotQuestion ? U.pilotQuestion(h, d) : ''}
        <div class="row" style="margin-top:12px"><button class="primary" data-act="confirmHero">${d.heroIdx < squadOf(U.run) - 1 && !(U.net && U.net.online()) ? `Confirm — draft pilot ${d.heroIdx + 2}` : 'Confirm — set out'}</button><button class="ghost" data-act="draftBack" data-tip="Build this pilot another way: a different pre-made pilot, or a fresh draft.">Back</button></div></div>`;
    }
    return `<div class="wrap">${header('The Draft')}<div class="row small dim" style="margin-bottom:8px">${run.heroes
      .filter(Boolean)
      .map(
        (h) =>
          `<span class="pill">${U.portrait(h, 'xs')} ${esc(h.name)} — ${h.species
            .slice(1)
            .map((s) => U.icClade(s))
            .join('')}</span>`,
      )
      .join('')}</div>${body}</div>`;
  }
  /** The draft's actions, for the screens that start a draft with a pilot chosen (src/ui/crew.js). */
  U.draftAct = (act, arg) => draftAct(act, arg);
  function draftAct(act, arg) {
    const d = U.draft;
    const run = U.run;
    if (act === 'draftMode') {
      d.step = 'species';
    } else if (act === 'prebuilt') {
      const c = choiceById(arg);
      if (!c) return;
      d.hero = T.heroFromPrebuilt(run, c.pb);
      // a pilot made on this device is kept again with any points moved; another player's stays theirs
      d.premade = !c.mine;
      d.step = 'up';
    } else if (act === 'forgetMade') {
      T.forgetMade(arg);
      if (U.heroesForget) U.heroesForget(arg);
    } else if (act === 'pickSpecies') {
      if (d.species.includes(arg)) d.species = d.species.filter((s) => s !== arg);
      else if (d.species.length < 2) d.species.push(arg);
      const inp = $('#heroName');
      if (inp) d.name = inp.value || d.name;
    } else if (act === 'draftBack') {
      d.step = arg === 'species' ? 'species' : 'mode';
      d.hero = null;
      if (arg !== 'species') d.maker = null; // a pilot from Make a pilot stays theirs only while its clades do
      d.premade = false;
      d.pack = [];
      d.picks = 0;
    } else if (act === 'draftQuit') {
      U.run = null;
      U.draft = null;
      U.screen = 'title';
    } else if (act === 'draftPrev') {
      // the pilot before comes back to its last step, as it was left
      const h = run.heroes.pop();
      const premade = T.PREBUILTS.some((pb) => pb.name === h.name && String(h.id).startsWith(pb.id + '_'));
      U.draft = {
        heroIdx: run.heroes.length,
        step: 'up',
        species: h.species.slice(1),
        name: h.name,
        hero: h,
        pack: [],
        picks: 0,
        premade,
      };
    } else if (act === 'openPacks') {
      const inp = $('#heroName');
      if (inp && inp.value.trim()) d.name = inp.value.trim().slice(0, 24);
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
      d.picks = d.hero.cards.length;
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
      // every pilot a player built is kept, to be chosen again beside the pre-made heroes
      if (!d.premade) {
        const rec = T.madeFrom(d.hero, new Date().toISOString());
        const kept = T.keepMade(U.makerStamp ? U.makerStamp(d, rec) : rec);
        if (U.makerKept) U.makerKept(d, kept);
        if (kept) d.hero.madeId = kept.id; // what it learns on this expedition comes home to this recipe
        if (kept && U.heroesShare) U.heroesShare(kept);
      }
      if (U.savePilotAnswer) U.savePilotAnswer(d);
      if (d.hero.upUnspent > 0) U.toast(`${d.hero.upUnspent} UP carried over — spend it later with Train.`);
      if (U.net && U.net.online()) {
        // online, each player drafts their own pilot; the map opens once both have
        const r = U.exec({ op: 'addHero', hero: d.heroIdx, pilot: d.hero });
        if (!r.ok) U.toast(r.why);
        d.step = 'wait';
        U.net.afterChange();
        U.render();
        return;
      }
      run.heroes.push(d.hero);
      if (run.heroes.length < squadOf(run)) {
        U.draft = {
          heroIdx: run.heroes.length,
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
  const NODE_ICON = {};
  ['swarm', 'vault', 'hidden', 'cascade', 'salvage', 'survey', 'crossing', 'elite', 'haven', 'event', 'boss'].forEach(
    (k) => (NODE_ICON[k] = U.icNode(k)),
  );
  const NODE_NAME = {
    swarm: 'Swarm',
    vault: 'Vault',
    hidden: 'The Sought',
    cascade: 'Cascade',
    salvage: 'Salvage',
    survey: 'Survey',
    crossing: 'Crossing',
    elite: 'Elite',
    haven: 'Haven',
    event: 'Event',
    boss: 'The Heart',
  };
  U.NODE_ICON = NODE_ICON;
  U.NODE_NAME = NODE_NAME;
  /** May this screen act for hero i? Everyone may with one player; with two, each for their own pilot. */
  const own = (i) => !U.run || T.mayActFor(U.run, U.seats, i);
  U.own = own;
  /**
   * The omnicrystals, as pills: one purse for one player; with two players, a purse each, named, this
   * screen's own marked (T.splitCrystals and friends, src/engine/party.js). `x` is the run or the mission.
   */
  U.purseHTML = function (x, compact) {
    const run = U.run;
    const purses = x && x.purses ? x.purses : [T.totalCrystals(x || {})];
    const ic = U.ic('crystal', '◇', 'tiny');
    if (purses.length < 2)
      return `<span class="pill purse" data-tip="Omnicrystals: buy gear at a haven and fuel it in a mission.">${ic} ${purses[0]}</span>`;
    const nameOf = (s) => (run && run.party && run.party.players[s] ? run.party.players[s].name : 'Player ' + (s + 1));
    if (compact)
      return `<span class="pill purse" data-tip="${esc(`<b>Omnicrystals, a purse each</b><div>${purses.map((n, s) => `${esc(nameOf(s))}: ${n} ◇`).join(' · ')}</div><div class='dim small'>Your pilot fuels its gear from your own purse.</div>`)}">${ic} ${purses.map((n, s) => (U.seats && U.seats.includes(s) ? `<b>${n}</b>` : n)).join(' · ')}</span>`;
    return purses
      .map((n, s) => {
        const name = nameOf(s);
        const mine = U.seats && U.seats.includes(s);
        return `<span class="pill purse seat-${s}${mine ? ' mine' : ''}" data-tip="${esc(`<b>${esc(name)}'s omnicrystals</b><div>Each player has their own: your pilot buys, sells and fuels gear from yours. What the squad earns is shared out evenly; what it pays together comes from the fuller purse first.</div>`)}">${ic} ${n} <span class="dim small">${esc(name)}</span></span>`;
      })
      .join('');
  };
  function partyBar(run) {
    return `<div class="partybar">${run.heroes
      .map(
        (
          h,
          i,
        ) => `<div class="panel tight"><div class="row">${U.portrait(h, 'sm')}<b style="font-family:var(--serif)">${esc(h.name)}</b>${U.seatTag ? U.seatTag(i) : ''}<span class="dim small">${esc(h.title)}</span><span class="right mono small">${h.hp}/${h.maxHp}</span></div><div class="hpbar"><i style="width:${(100 * h.hp) / h.maxHp}%"></i></div>
      <div class="row small" style="margin-top:6px"><span class="pill">${h.cards.length} cards${h.reserve && h.reserve.length ? ` · ${h.reserve.length} in reserve` : ''}</span><span class="pill">UP ${h.upUnspent}</span>${h.gear.map((g) => `<span class="pill" data-tip="${esc(T.GEAR_BY[g.id].desc + (T.GEAR_BY[g.id].passive ? ' Passive: ' + T.GEAR_BY[g.id].passive.txt : ''))}">${U.icGear(g.id)} ${esc(T.GEAR_BY[g.id].name)}</span>`).join('')}${T.instinctsOf(
        h,
      )
        .map(
          (x) =>
            `<span class="pill" data-tip="${esc(`Instinct of the ${T.SPECIES[x.clade] ? T.SPECIES[x.clade].name : x.clade}, always on: ${x.txt}`)}">✦ ${esc(x.name)}</span>`,
        )
        .join('')}</div>
      <div class="row" style="margin-top:6px">${own(i) ? `<button class="sm" data-act="train" data-arg="${i}">Train (UP ${h.upUnspent})</button>` : ''}<button class="sm ghost" data-act="kit" data-arg="${i}">Kit${h.reserve && h.reserve.length ? ' · swap' : ''}</button>${T.playerCount(run) > 1 && run.purses ? `<span class="right pill small" data-tip="${esc(T.ownerName(run, i))}'s omnicrystals">${U.ic('crystal', '◇', 'tiny')} ${T.crystalsFor(run, i)}</span>` : ''}</div></div>`,
      )
      .join('')}</div>`;
  }
  // The scene painted behind each leg of the route (a key of T.ART), bottom leg first.
  U.LEG_SCENES = ['scene/FLUME', 'scene/MANGER', 'scene/BANDIT'];
  /**
   * A painting (a key of T.ART) as a class, so a picture shown many times is written into the page once,
   * in a stylesheet of its own, and never repeated in the markup (or in a tooltip).
   */
  const artClasses = {};
  U.artClass = function (key) {
    if (!key || !T.ART || !T.ART[key] || typeof document === 'undefined') return '';
    const cls = 'art-' + key.replace(/[^A-Za-z0-9]/g, '-');
    if (!artClasses[key]) {
      let sheet = document.getElementById('art-classes');
      if (!sheet) {
        sheet = document.createElement('style');
        sheet.id = 'art-classes';
        document.head.appendChild(sheet);
      }
      sheet.appendChild(document.createTextNode(`.${cls}{background-image:url(${T.ART[key]})}`));
      artClasses[key] = cls;
    }
    return cls;
  };
  /** What each ground's guides would tell you before setting out on it (docs/LORE.md: guides, wind, ground that moves). */
  const GROUND_READOUT = {
    land: 'LAND GUIDES · the ground here deforms and is rebuilt; windbreaks are the road',
    sea: 'SEA GUIDES · coasts collapse and come back elsewhere; read the water, not the chart',
    air: 'AIR GUIDES · the wind never stops; downhill is light, uphill is heavy',
  };
  const GROUND_NAME = { land: 'by land', sea: 'by sea', air: 'by air' };
  const ROMAN = ['I', 'II', 'III'];
  /** A place's pull, in a few characters: its g, and whether it lies uphill (heavy) or downhill (light). */
  function pullTag(g) {
    if (g == null) return '';
    const dir = g < 0.7 ? 'down' : g > 1.5 ? 'up' : 'level';
    return `<span class="pull pull-${dir}">${dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•'} ${g} g</span>`;
  }
  /**
   * The route as a map of Tumult (src/ui/overworld.js): what each stop is called, what its tip says and which
   * painting it wears come from here, so the map and the stop cards agree.
   */
  function renderRoute(run) {
    const ex = T.expeditionOf(run);
    const missions = run.history.slice();
    const how = {};
    Object.values(run.map.all)
      .filter((nd) => nd.done)
      .sort((x, y) => x.row - y.row)
      .forEach((nd) => {
        if (nd.type === 'haven') how[nd.id] = 'rested here';
        else if (nd.type === 'event') how[nd.id] = 'a fork in the road';
        else if (T.MISSIONS[nd.type]) {
          const h = missions.shift();
          if (h)
            how[nd.id] =
              `${h.won ? 'won' : 'lost'} · ${h.rounds} round${h.rounds === 1 ? '' : 's'}${h.kills ? ' · ' + h.kills + ' foe' + (h.kills === 1 ? '' : 's') + ' down' : ''}`;
        }
      });
    const stop = (nd) => {
      const type = nd.type;
      const pg = nd.page && T.PAGE_BY[nd.page];
      const plate = type === 'boss' ? (ex ? ex.legs[2].scene : null) : pg ? pg.plate : null;
      const art = U.artClass(plate);
      const done = how[nd.id] ? `<div class="small ok" style="margin-top:4px">✓ ${esc(how[nd.id])}</div>` : '';
      const tip =
        (T.MISSIONS[type]
          ? (pg
              ? `<div class="tip-plate ${art}"></div><b>${esc(pg.name)}</b> <span class="dim">· ${U.gravityText(pg.gravity)}</span><div>${esc(pg.blurb)}</div><div class="small" style="margin-top:4px"><b>${type === 'boss' ? esc(T.threatTitle(run)) : NODE_NAME[type]}</b>${type === 'haven' || type === 'event' ? '' : ' · tier ' + nd.tier}: `
              : `<b>${type === 'boss' ? esc(T.threatTitle(run)) : NODE_NAME[type]}</b> · tier ${nd.tier}<div class="small">`) +
            esc(T.MISSIONS[type].blurb) +
            '</div>' +
            (type === 'boss' && ex && T.THREAT_BY && T.THREAT_BY[ex.threat]
              ? `<div class="small dim">${esc(T.THREAT_BY[ex.threat].look)}</div>`
              : '') +
            (nd.done ? '' : briefTip(U.stopPreview(run, nd.id)))
          : type === 'haven'
            ? '<b>Haven</b><div>A night under a windbreak: rest, trade and buy gear.</div>'
            : '<b>Event</b><div>A fork in the route: something on the road, and a choice about it.</div>') + done;
      const tier =
        type === 'haven' || type === 'event' || type === 'boss'
          ? ''
          : `<span class="tier">${'◆'.repeat(nd.tier)}</span>`;
      const name = type === 'boss' ? T.threatTitle(run) : pg ? pg.name : NODE_NAME[type];
      const sub = type === 'boss' ? 'The Heart’s rules' : pg ? NODE_NAME[type] : '';
      return {
        art,
        tip,
        name,
        icon: NODE_ICON[type],
        sub: sub || tier ? `${sub ? sub + ' ' : ''}${tier}${pg && type !== 'boss' ? pullTag(pg.gravity) : ''}` : '',
      };
    };
    return U.renderOverworld(run, { stop });
  }
  /** One line of a passage: the Terminal's log in its own type, a pilot's words beside their portrait. */
  function passageLine(run, l) {
    if (l.who === 'terminal') return `<div class="pl term">${esc(l.text)}</div>`;
    const h = run.heroes[l.who];
    if (l.own)
      return `<div class="pl say own">${h ? U.portrait(h, 'sm') : ''}<span>“${esc(l.text)}”<span class="own-tag">in ${esc(h ? h.name : 'their')}'s words, at the table</span></span></div>`;
    return `<div class="pl say">${h ? U.portrait(h, 'sm') : ''}<span>${esc(l.text)}</span></div>`;
  }
  U.passageLine = passageLine;
  /** The passage written after the last stop, until this screen has read it on. */
  function renderPassage(run) {
    const p = T.currentPassage(run);
    if (!p || U.passageRead === p.n) return '';
    return U.sceneCard(
      p.scene,
      `<div class="kick">${p.kind === 'start' ? 'The log opens' : 'Between stops'}</div><h2 style="margin:4px 0 10px">${esc(p.title)}</h2><div class="passage">${p.lines.map((l) => passageLine(run, l)).join('')}</div><div class="row" style="margin-top:12px"><button class="primary" data-act="readPassage" data-arg="${p.n}">Onward</button></div>`,
      'passage-card',
    );
  }
  /** Who sent this expedition, in a few words, to head the route. */
  function expeditionLine(run) {
    const ex = T.expeditionOf(run);
    if (!ex) return '';
    return `<b class="dom-${ex.domain}">${esc(ex.patronDef.title)}</b> to ${esc(T.threatName(run))}. `;
  }
  /** What each kind of objective asks, in a word: the first thing a player compares between stops. */
  const GOAL_VERB = {
    hold: 'Hold',
    vault: 'Break in',
    find: 'Find',
    valve: 'Channel',
    kill: 'Defeat',
    salvage: 'Carry',
    survey: 'Tag',
  };
  /** A stop's mission as it will be played (T.previewStop), worked out once for each stop and kept. */
  const previews = {};
  U.stopPreview = function (run, id) {
    const key = [run.seed, run.tide, id, run.map.all[id].type, !!run.nextElite].join('|');
    if (!previews[key]) previews[key] = T.previewStop(run, id);
    return previews[key];
  };
  /** The foes a stop holds, as icons with counts, and the swarm that keeps coming, if one does. */
  function foesLine(p) {
    const foes = p.foes
      .map(
        (f) =>
          `<span class="sc-foe" data-tip="${esc(`<b>${esc(f.name)}</b> · ${f.hp} vitality<div>${esc(T.ENEMIES[f.type].flavor || '')}</div>`)}">${U.icEnemy(f.type, T.ENEMIES[f.type].glyph, 'tiny')}${f.n > 1 ? `<b>${f.n}×</b>` : ''} ${esc(f.name)}</span>`,
      )
      .join('');
    const more = p.spawns
      .map(
        (s) =>
          `<div class="sc-more">+ more every ${s.every === 1 ? 'round' : s.every + ' rounds'} from round ${s.from} (up to ${s.max} at once): ${esc(s.kinds.join(', '))}</div>`,
      )
      .join('');
    return `<div class="sc-foes">${foes}</div>${more}`;
  }
  /** The place's rules today, as pills: gravity and weather, each rule in its tip. */
  function placePills(pl) {
    const gb = T.GRAVITY.find((b) => b.id === pl.gravity);
    const wx = T.WEATHER[pl.weather];
    return (
      (gb && gb.text ? `<span class="pill" data-tip="${esc(gb.text)}">${esc(gb.name)}</span>` : '') +
      (wx && wx.text ? `<span class="pill" data-tip="${esc(wx.text)}">${esc(wx.name)}</span>` : '')
    );
  }
  /**
   * One stop the squad can go to next, as a card: what kind of stop it is, and for a mission what it asks
   * (the objective, in a word and in full), how long it gives, what stands in the way, the place's rules and
   * the bonus goals, so two stops can be compared before choosing. Exact: the numbers are the ones that will
   * be played (T.previewStop).
   */
  function stopCard(run, id) {
    const nd = run.map.all[id];
    const p = U.stopPreview(run, id);
    const pg = p.page && T.PAGE_BY[p.page];
    const plate =
      p.type === 'boss' ? (T.expeditionOf(run) ? T.expeditionOf(run).legs[2].scene : null) : pg ? pg.plate : null;
    const art = U.artClass(plate);
    const go = `<button class="primary sm sc-go" data-act="goNode" data-arg="${id}">${p.type === 'haven' ? 'Make camp' : p.type === 'event' ? 'Take this road' : 'Set out'} ▶</button>`;
    const name = p.type === 'boss' ? esc(T.threatTitle(run)) : pg ? esc(pg.name) : NODE_NAME[p.type];
    const head = `<div class="sc-head"><span class="sc-ic">${NODE_ICON[p.type]}</span><span class="sc-nm"><b>${name}</b><span class="dim small">${NODE_NAME[p.type]}${T.MISSIONS[p.type] ? ` · tier <span class="tier">${'◆'.repeat(p.tier)}</span>` : ''}${pg ? ' · ' + U.gravityText(pg.gravity) : ''}</span></span></div>`;
    if (!T.MISSIONS[p.type]) {
      const what =
        p.type === 'haven'
          ? 'A night under a windbreak. Rest to mend, train with upgrade points, trade, and buy gear.'
          : 'A fork in the road: something on the route, and a choice about it. Not a mission; no board, no foes.';
      return `<div class="stopcard k-${p.type}" data-node="${id}">${art ? `<div class="sc-plate ${art}"></div>` : ''}${head}<div class="sc-body"><div class="sc-what">${what}</div></div>${go}</div>`;
    }
    const verb = GOAL_VERB[p.goal] || 'Win';
    return `<div class="stopcard k-${p.type}${p.elite ? ' elite-owed' : ''}" data-node="${id}">${art ? `<div class="sc-plate ${art}"></div>` : ''}${head}
      <div class="sc-body">
        ${p.elite ? '<div class="sc-flag">The run owes an elite: this stop will be one.</div>' : ''}
        <div class="sc-goal"><span class="sc-verb${p.fight ? ' fight' : ''}" data-tip="${esc(p.fight ? 'A fight: the mission is won when this foe falls.' : 'Not a fight: the mission is won by the objective, whatever is left standing.')}">${verb}</span><span>${esc(p.objective)}</span></div>
        <div class="sc-row">${p.clock ? `<span class="sc-clock" data-tip="${esc(p.clock.label + ': the mission is lost when it runs out.')}">⏳ <b>${p.clock.value}</b> rounds</span>` : '<span class="sc-clock" data-tip="No clock: the mission ends when one side falls.">⏳ <b>no clock</b></span>'}${placePills(p.place)}</div>
        ${foesLine(p)}
        ${p.bonus.length ? `<div class="sc-bonus small dim">Bonus: ${p.bonus.map((b) => '○ ' + esc(b)).join(' &nbsp; ')}</div>` : ''}
      </div>${go}</div>`;
  }
  /** A stop's mission in two lines, for its roundel's tip: the objective, the clock and what stands in the way. */
  function briefTip(p) {
    if (!p || !p.objective) return '';
    const foes = p.foes.map((f) => (f.n > 1 ? f.n + ' ' : '') + esc(f.name)).join(', ');
    return `<div class="small" style="margin-top:4px"><b>${GOAL_VERB[p.goal] || 'Win'}:</b> ${esc(p.objective)}</div><div class="small dim">${p.clock ? '⏳ ' + p.clock.value + ' rounds · ' : ''}${foes}${p.spawns.length ? ' · and more keep coming' : ''}</div>`;
  }
  // a stop card and its roundel on the route light up together
  document.addEventListener('mouseover', (e) => {
    const card = e.target && e.target.closest && e.target.closest('.stopcard[data-node]');
    const id = card ? card.getAttribute('data-node') : null;
    document
      .querySelectorAll('.mnode.hl')
      .forEach((n) => n.getAttribute('data-node') !== id && n.classList.remove('hl'));
    if (id) {
      const n = document.querySelector(`.mnode[data-node="${id}"]`);
      if (n) n.classList.add('hl');
    }
  });
  /**
   * The route screen's body: the map of Tumult the expedition crosses (Garrett, 2026-11-22), a line saying where
   * the squad stands and what its guides say of the ground ahead, and the next stops as cards to compare.
   */
  function renderJourney(run) {
    const map = run.map;
    const ex = T.expeditionOf(run);
    const at = run.nodeId != null ? run.nodeId : null;
    const here = at != null ? map.all[at].row : -1;
    const next = Math.min(here + 1, map.rows.length - 1);
    const act = T.actOf(next, map);
    const boss = map.all[map.rows[next][0]].type === 'boss';
    const leg = ex && ex.legs[act];
    const away = map.rows.length - 1 - here;
    const choosing = run.phase === 'map' && run.available.length && T.squadReady(run);
    const where = boss
      ? `<span class="kick">The end of the route</span><span class="dim small">${esc(T.threatTitle(run))}${choosing ? ' · the last road' : ''}</span>`
      : `<span class="kick">Leg ${ROMAN[act]}${leg ? ' · ' + GROUND_NAME[leg.ground] : ''}</span><span class="dim small">${esc(map.actNames[act])}${choosing ? ' · choose the next stop' : ''}</span>`;
    const far = `<span class="right small j-far"><b>${esc(T.threatTitle(run))}</b> · ${away <= 1 ? 'the next stop' : away + ' stops away'}</span>`;
    const guides = leg && !boss ? `<div class="j-guides">&gt; ${esc(GROUND_READOUT[leg.ground])}</div>` : '';
    return `<div class="journey">${renderRoute(run)}<div class="j-now"><div class="row">${where}${far}</div>${guides}</div>${choosing ? `<div class="stopcards">${run.available.map((id) => stopCard(run, id)).join('')}</div>` : ''}</div>`;
  }
  /**
   * A newcomer joining on the route (2.79): the squad sees them bringing a pilot, and the route waits for them.
   */
  function joinCard(run) {
    if (T.squadReady(run)) return '';
    const name = esc(T.ownerName(run, run.heroes.length));
    const seats = run.heroes
      .filter(Boolean)
      .map(
        (h, i) =>
          `<span class="j-seat">${U.portrait(h, 'sm')}<span class="small">${esc(T.ownerName(run, i))}</span><span class="dim small">ready</span></span>`,
      )
      .join('');
    return `<div class="panel joincard"><span class="kick">A new player joined</span><h3>${name} is bringing a pilot</h3><p class="dim small">They join at this stop, at the squad's level. From the next mission the squad is ${run.heroes.length + 1}, and missions grow to match. The route opens again once the pilot joins.</p><div class="j-seats">${seats}<span class="j-seat waiting"><span class="pfp sm none">?</span><span class="small">${name}</span><span class="small pulse-t">drafting…</span></span></div></div>`;
  }
  function renderMap() {
    const run = U.run;
    const map = run.map;
    return `<div class="wrap route-screen">${header('The Route', `<span style="margin-left:6px"></span>${U.purseHTML(run)}${run.tide !== 'rising' ? `<span class="pill" data-tip="${esc(T.TIDES[run.tide].txt)}">${U.ic('node.cascade', '🌊', 'tiny')} ${esc(T.TIDES[run.tide].n)}</span>` : ''}${run.lifeline ? '<span class="pill" data-tip="Once per run: lose a non-boss mission with someone still standing and limp on with no rewards. If the whole squad goes down, the expedition ends.">🕯️ Lifeline</span>' : ''}${U.scalePill(run)}${titleBtn()}`)}
      ${renderPassage(run)}
      ${joinCard(run)}
      <div class="route3"><div class="r3-squad">${partyBar(run)}</div><div class="r3-main">${run.phase === 'map' && run.available.length ? `<div class="small dim r3-line">${expeditionLine(run)}${esc(T.threatTitle(run))} waits at the end of the route.</div>` : ''}${renderJourney(run)}</div></div></div>`;
  }

  /* ───────────── TRAIN / KIT modals ───────────── */
  // U.openTrain, the upgrade view, lives in src/ui/after.js with the other screens after a mission
  U.openKit = function (i) {
    const h = U.run.heroes[i];
    U.openModal(`<div class="row"><h3>${esc(h.name)} <span class="dim" style="font-weight:400">${esc(h.title)}</span></h3><span class="right small dim">${h.species.map((s) => U.icClade(s) + ' ' + T.SPECIES[s].name).join(' · ')}</span><button class="sm" data-act="closeModal">Close</button></div>
    <div class="row small" style="margin:6px 0">${h.gear.map((g, gi) => `<span class="pill">${U.icGear(g.id)} ${esc(T.GEAR_BY[g.id].name)} ${own(i) ? `<button class="sm ghost" data-act="sellGear" data-arg="${i}|${gi}" title="sell for half, to your own purse">sell</button>` : ''}</span>`).join('')}</div>
    ${kitLoadout(i, h)}`);
  };
  /**
   * The kit that flies and the traits kept in reserve (2.107). Between missions a reserve trait comes in for one
   * of the nine: pick it, then the one that stays behind. In a mission the kit is set, and the reserve only shown.
   */
  U.kitIn = null;
  function kitLoadout(i, h) {
    const res = h.reserve || [];
    const card = (cid, o) =>
      U.cardHTML(
        cid,
        Object.assign({ P: T.heroP(h, cid), E: T.heroE(h, cid), showUp: true, flavor: false, clades: h.species }, o),
      );
    const free = !U.run.mission && U.run.phase !== 'mission' && own(i);
    const pick = free && U.kitIn && U.kitIn.hero === i && res.includes(U.kitIn.card) ? U.kitIn.card : null;
    const outs = pick ? new Set(T.loadOuts(h, pick)) : null;
    const el = T.diceSet(h).filter((k) => k !== 'plain');
    const dice = `${el.length} element ${el.length === 1 ? 'die' : 'dice'} from awakened cards, ${T.RULES.POOL - el.length} plain`;
    const wrap = (cid, html, act, arg, tip) =>
      act
        ? `<div class="kit-pick${cid === pick ? ' on' : ''}" data-act="${act}" data-arg="${esc(arg)}" data-tip="${esc(tip)}" role="button" tabindex="0">${html}</div>`
        : html;
    const kit = h.cards
      .map((cid) => {
        if (!outs) return card(cid);
        return outs.has(cid)
          ? wrap(
              cid,
              card(cid),
              'kitSwap',
              `${i}|${pick}|${cid}`,
              `${T.CARD[pick].name} flies, ${T.CARD[cid].name} stays behind with its points.`,
            )
          : `<div class="kit-pick dim" data-tip="${esc(`${T.CARD[cid].name} flies: leaving it behind would break the bloodline rule.`)}">${card(cid)}</div>`;
      })
      .join('');
    const room = pick && h.cards.length < T.RULES.MAX_CARDS && T.canLoadCard(h, pick, null).ok;
    const reserve = res.length
      ? `<div class="row small" style="margin:10px 0 4px"><b>Reserve · ${res.length}</b><span class="dim">${free ? (pick ? `Now choose the trait ${esc(T.CARD[pick].name)} flies in place of${room ? ', or bring it into the empty place' : ''}.` : 'Kept, points and all. Pick one to bring into the kit for the next mission.') : 'Left behind for this mission.'}</span>${room ? `<button class="sm" data-act="kitSwap" data-arg="${i}|${pick}|">Bring it in</button>` : ''}${pick ? `<button class="sm ghost" data-act="kitPick" data-arg="${i}|">Cancel</button>` : ''}</div>
      <div class="pack reserve">${res.map((cid) => (free ? wrap(cid, card(cid), 'kitPick', `${i}|${cid}`, cid === pick ? 'Chosen: now pick the one it replaces' : `Bring ${T.CARD[cid].name} into the kit`) : `<div class="kit-pick dim">${card(cid)}</div>`)).join('')}</div>`
      : '';
    return `<div class="row small" style="margin:6px 0"><b>Flies this mission · ${h.cards.length} of ${T.RULES.MAX_CARDS}</b><span class="dim">${esc(dice)}</span></div>
    <div class="pack">${kit}</div>${reserve}`;
  }

  /* ───────────── HAVEN ───────────── */
  /**
   * The scene shown beside an event (a key of T.ART): a painting of life on Tumult whose mood fits it. Cosmic
   * Shore's pilot scenes are portraits of people at work in their world, so here they stand for the place.
   */
  U.EVENT_SCENES = {
    beacon: 'scene/TRACE',
    toll: 'scene/BANDIT',
    storm: 'scene/SPARE02',
    bloom: 'scene/IVY',
    guide: 'scene/SPARE03',
    cache: 'scene/FLUME',
    shrine: 'scene/MAESTRO',
    mirror: 'scene/LONGSHIFT',
    envoy: 'scene/SPARE01',
    molt: 'scene/COMET',
    audit: 'scene/SUNDIAL',
    quiet: 'scene/DOE',
    haven: 'scene/GALLEON',
  };
  /** A story panel: the painting on one side (on top on a phone), the words and choices on the other. */
  U.sceneCard = function (key, inner, cls) {
    const img = key && T.ART && T.ART[key];
    return `<div class="panel scene-card ${cls || ''} ${img ? '' : 'no-art'}">${img ? `<div class="scene-art" style="background-image:url(${img})"></div>` : ''}<div class="scene-body">${inner}</div></div>`;
  };
  /* ───────────── CODEX ───────────── */
  function renderCodex() {
    const c = U.codex;
    const tabs = ['species', 'bestiary', 'gear', 'rules'];
    let body = '';
    if (c.tab === 'species') {
      const sp = T.SPECIES[c.sp];
      body = `<div class="codex-nav" style="margin-bottom:10px">${T.SPECIES_ORDER.map((s) => `<button class="sm ${c.sp === s ? 'primary' : ''}" data-act="codexSp" data-arg="${s}">${U.icClade(s)} ${esc(T.SPECIES[s].name)}</button>`).join('')}</div>
        <div class="row"><h3>${U.icClade(c.sp)} ${esc(sp.name)} <span class="dim small" style="font-weight:400">leans ${sp.lean} — ${esc(sp.tagline)}</span></h3><span class="right row small">Preview at P <button class="sm" data-act="codexPE" data-arg="P|-1">−</button><b>${c.P}</b><button class="sm" data-act="codexPE" data-arg="P|1">+</button> E <button class="sm" data-act="codexPE" data-arg="E|-1">−</button><b>${c.E}</b><button class="sm" data-act="codexPE" data-arg="E|1">+</button></span></div>
        <div class="pack" style="margin-top:8px">${T.cardsOf(c.sp)
          .map((cd) => U.cardHTML(cd.id, { P: c.P, E: c.E, clades: [c.sp] }))
          .join('')}</div>`;
    } else if (c.tab === 'bestiary') {
      body = `<div class="shop-grid">${Object.entries(T.ENEMIES)
        .map(
          ([k, e]) =>
            `<div class="panel tight"><b>${U.icEnemy(k, e.glyph)} ${esc(e.name)} <span class="dim small">· ${e.role}${e.elite ? ' · elite' : ''}${e.boss ? ' · boss' : ''}</span></b><div class="small mono dim">hp ${e.hp.join('/')} · speed ${e.speed}${e.shield ? ' · shield ' + e.shield.join('/') : ''}${e.hidden ? ' · starts Hidden' : ''}</div>${Object.values(
              e.abilities,
            )
              .map(
                (a) =>
                  `<div class="small">• <b>${esc(a.n)}</b> ${a.dmg ? '(' + a.dmg.join('/') + ' ' + a.kind + ')' : '(' + a.kind + ')'}${a.push ? ', push ' + a.push : ''}${a.pull ? ', pull ' + a.pull : ''}${a.anchor ? ', roots ' + a.anchor : ''}</div>`,
              )
              .join(
                '',
              )}<div class="flavor">${esc(e.flavor)} ${U.canonMark('foe:' + k, e.flavor, 'codex:flavor')}</div></div>`,
        )
        .join('')}</div>`;
    } else if (c.tab === 'gear') {
      body = `<div class="shop-grid">${T.GEAR.map((g) => `<div class="panel tight"><b>${U.icGear(g.id)} ${esc(g.name)} <span class="dim">· ${g.price} ◇</span></b><div class="small dim" style="margin:4px 0">${esc(g.desc)}</div>${g.passive ? `<div class="small">◆ <b>Passive</b>: ${esc(g.passive.txt)}</div>` : ''}${g.abilities.map((a) => `<div class="small">• <b>${esc(a.n)}</b> (${T.gearUseText(a)}): ${esc(a.txt())}</div>`).join('')}${g.card ? `<div class="small dim">${T.gearCardNote(g)}</div>` : ''}</div>`).join('')}</div>`;
    } else body = U.helpHTML();
    return `<div class="wrap">${header('Codex', `<button class="sm" data-act="codexBack">Back</button>`)}<div class="codex-nav" style="margin-bottom:10px">${tabs.map((t) => `<button class="${c.tab === t ? 'primary' : ''}" data-act="codexTab" data-arg="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>${body}</div>`;
  }

  U.helpHTML = function () {
    return `<div class="help"><h3>How to play</h3>
      <p><b>The turn.</b> Each round your pilots act freely, in any order, interleaved (with several players, each takes a turn with their own). At the start of the round each hero's <b>track</b> slides one column (cards come back), engines fire, and each hero <b>rolls 4 dice</b> drawn from their 15-die pool into their bank. Dice you don't spend stay banked — but the pool shrinks, so hoarding starves next turn's roll. Most dice are plain d20s (mostly AP, each element once); every card you awaken, and every Affinity boon, swaps a plain die for a d8 of its element (no AP, mostly that element), so a pilot who wakes more cards rolls more etherions and fewer AP. A die's size shows in its corner.</p>
      <p><b>Cards have two faces.</b> The <b>Physical</b> face costs AP, has a short cooldown, and scales with <b>P</b>. The <b>Ethereal</b> face costs AP + an etherion, has a longer cooldown, and does something physical cannot — blink, area, chain, control, engines — scaling with <b>E</b>. Playing <i>either</i> face sends the whole card to the track for its cooldown.</p>
      <p><b>Enemies telegraph.</b> Every enemy shows what it will do before you act. Step out of its zone and a zone shot has no line. Move two nodes and a slow brute spends its turn walking. Hide and ranged shots strike afterimages. Push it off the node and its plan collapses. <b>Defense is proactive</b> — there are no reactions; you prepare on your turn.</p>
      <p><b>Zones.</b> Every node sits in one or two coloured zones. Ranged ("zone") strikes hit anything that shares a zone with you, at any distance. Melee needs a shared edge. Height nodes (dashed ring) can only be reached by Space verbs — blink, climb, hover — or by dropping the ramp with the lever.</p>
      <p><b>States, never keys.</b> Hidden is broken by melee, area, being moved, or being Located. Shield is bypassed by Pierce, area or true damage. Anchored can't be moved — and still acts. No ability ever takes a turn away.</p>
      <p><b>Resources.</b> <kbd>M</kbd> Mass · <kbd>C</kbd> Charge · <kbd>S</kbd> Space · <kbd>T</kbd> Time · <kbd>◇</kbd> Omni spends as any. One of each M C S T can be folded into an Omni (the anti-brick valve). A banked Omni, or any two banked etherions, can be spent as 1 AP (◇→AP). <b>Omnicrystals (◇)</b> are the managed economy: buy gear and fuel it.</p>
      <p><b>Basic actions.</b> With or without cards, any hero can <b>Strike</b> an adjacent foe for 2 (2 AP), <b>Brace</b> for Shield 1 until their next turn (1 AP), or <b>Shove</b> an adjacent foe 1 node (2 AP). They are weak on purpose: the floor, not a plan. <b>Channel</b> a banked etherion (or Omni) on its own, with no AP: Mass — Strike an adjacent foe for 2 or Shove it 1 node; Charge — Arc 1 damage into a foe up to 3 away, or Reach an objective 2 nodes away (1 AP); Space — Scramble 1 node, up or down a ledge; Time — Brace and slide your track 1 extra. Elements are never dead weight: every crystal you roll is something to do.</p>
      <p><b>Downed.</b> At 0 vitality a hero is downed, not dead. An adjacent ally can <b>Rally</b> them for 2 AP (back at 8). Both downed = mission lost. Lose a non-boss mission and your one <b>Lifeline</b> lets you limp on.</p>
      <p><b>Winning.</b> Follow the route to its end and destroy the Heart. Its shield is fed by its Spawners.</p></div>`;
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
    // the first mission is guided step by step (src/ui/welcome.js); the tip below is its fallback
    if (U.tut === 'mission' && U.guideHTML) return U.guideHTML();
    if (!U.tut || !TUT[U.tut]) return '';
    return `<div class="tutorial">${TUT[U.tut]}<div class="row" style="margin-top:8px"><button class="sm primary" data-act="tutClose">Got it</button></div></div>`;
  }

  /* ───────────── RENDER ROOT ───────────── */
  let shown = null;
  U.render = function () {
    const root = app();
    if (U.screen !== 'mission' && U.windBed) U.windBed(false); // the wind stays on the board
    let html = '';

    // a screen with a renderer of its own (the app shell's tabs, settings, the codex, how to play)
    if (U.SCREENS && U.SCREENS[U.screen]) html = U.SCREENS[U.screen]();
    else
      switch (U.screen) {
        case 'title':
          html = U.renderHome ? U.renderHome() : renderTitle();
          break;
        case 'host':
          html = U.renderHost ? U.renderHost() : renderTitle();
          break;
        case 'join':
          html = U.renderJoin ? U.renderJoin() : renderTitle();
          break;
        case 'draft':
          html = renderDraft();
          break;
        case 'map':
          html = U.shell ? U.shell('route', renderMap()) : renderMap(); // the route sits in the app's frame
          break;
        case 'mission':
          html = U.renderMission();
          break;
        case 'reward':
          html = U.renderReward();
          break;
        case 'haven':
          html = U.renderHaven();
          break;
        case 'event':
          html = U.renderEvent();
          break;
        case 'summary':
          html = U.renderSummary();
          break;
        case 'codex':
          html = renderCodex();
          break;
        case 'lobby':
          // the table as Home draws it (src/ui/home.js), else net.js's own
          html = U.tableScreen && U.net ? U.tableScreen() : U.renderLobby ? U.renderLobby() : '';
          break;
        case 'atlas':
          html = U.renderAtlas();
          break;
        case 'help':
          html = `<div class="wrap">${header('How to Play', `<button class="sm" data-act="codexBack">Back</button>`)}<div class="panel">${U.helpHTML()}</div></div>`;
          break;
      }
    if (U.modal)
      html += `<div class="modal-bg${U.modal.sheet ? ' sheet' : ''}${U.modal.side ? ' side' : ''}${U.modal.cls ? ' ' + U.modal.cls + '-bg' : ''}" data-act="closeModalBg"><div class="modal${U.modal.cls ? ' ' + U.modal.cls : ''}">${U.modal.html}</div></div>`;
    html += tutorialHTML();
    // the web version lays the loading screen over a mission until its paintings are here (src/ui/shell.js)
    if (U.loadingGate) html += U.loadingGate() || '';
    root.innerHTML = html;
    // #app is the page's scroller: a new screen starts at its top, a re-render stays where it was
    if (shown !== U.screen) root.scrollTop = 0;
    // a new screen slides in (src/ui/feel.css; a fade on Reduced motion, nothing on Off)
    if (shown != null && shown !== U.screen && root.classList) {
      root.classList.remove('screen-in');
      void root.offsetWidth;
      root.classList.add('screen-in');
      clearTimeout(U.render.t);
      U.render.t = setTimeout(() => root.classList.remove('screen-in'), 450);
    }
    shown = U.screen;
    if (U.screen === 'mission') U.afterMissionRender();
    if (U.screen === 'map' && U.overworldMount) U.overworldMount();
    if (U.modal && U.modal.onMount) U.modal.onMount();
    if (U.canonRestore) U.canonRestore();
    if (U.seaApply) U.seaApply();
    if (U.prefsApply) U.prefsApply();
    if (U.noteSeen) U.noteSeen();
    if (U.navNote) U.navNote(); // the browser's Back button (src/ui/nav.js)
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
    // the app shell's screens (shell, pilots, cards, settings, how to play and the codex) answer theirs first
    for (const h of U.ACTS || []) if (h(act, arg, t, e)) return;
    if (U.atlasAct && U.atlasAct(act, arg)) return;
    if (U.canonAct && U.canonAct(act, arg)) return;
    if (U.seaAct && U.seaAct(act, arg)) return;
    // with players on other screens, each acts only for their own pilots (src/ui/party.js)
    if (U.gate && !U.gate(act, arg, t)) return;
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
      case 'pickPlayers': {
        const meta = T.loadMeta();
        meta.players = Math.max(1, Math.min(T.MAX_PLAYERS, parseInt(arg, 10) || 1));
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
        if (r.phase === 'draft') {
          // saved partway through the draft (Back out of it, or a reload): pick up at the next pilot to draft
          U.resumeDraft(r);
        } else if (r.phase === 'mission' && r.mission) {
          // a mission in progress is part of the save: carry on in the middle of the round
          U.screen = 'mission';
          U.enterMission();
        } else U.screen = ['reward', 'haven', 'event', 'garage'].includes(r.phase) ? r.phase : 'map';
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
      case 'readPassage':
        // reading on is this screen's own business: each player reads at their own pace
        U.passageRead = parseInt(arg, 10);
        U.render();
        return;
      case 'train':
        U.openTrain(parseInt(arg, 10));
        return;
      case 'kit':
        U.openKit(parseInt(arg, 10));
        return;
      case 'kitPick': {
        const [i, cid] = arg.split('|');
        U.kitIn = cid ? { hero: parseInt(i, 10), card: cid } : null;
        U.openKit(parseInt(i, 10));
        return;
      }
      case 'kitSwap': {
        const [i, cid, out] = arg.split('|');
        const r = U.exec({ op: 'loadCard', hero: parseInt(i, 10), card: cid, out: out || null });
        if (!r.ok) U.toast(r.why);
        else U.sfx.click();
        U.kitIn = null;
        T.saveRun(U.run);
        U.openKit(parseInt(i, 10));
        return;
      }
      case 'upRun': {
        const i = parseInt(t.getAttribute('data-hero'), 10);
        const [cid, which, delta] = arg.split('|');
        const r = U.exec({ op: 'adjustUp', hero: i, card: cid, which, delta: parseInt(delta, 10) });
        if (!r.ok && r.why) U.toast(r.why === 'cap' ? 'Capped at 3.' : 'No UP left.');
        U.openTrain(i);
        return;
      }
      case 'autoUpRun':
        U.exec({ op: 'autoUp', hero: parseInt(arg, 10) });
        U.openTrain(parseInt(arg, 10));
        return;
      case 'sellGear': {
        const [i, gi] = arg.split('|').map(Number);
        U.exec({ op: 'sellGear', hero: i, gi });
        U.openKit(i);
        return;
      }
      case 'goNode': {
        const r = T.chooseNode(U.run, parseInt(arg, 10));
        if (!r.ok) {
          if (r.why) U.toast(r.why);
          return;
        }
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
        const r = U.exec({ op: 'takeCard', hero: parseInt(i, 10), card: cid });
        if (!r.ok) U.toast(r.why);
        U.sfx.click();
        U.render();
        return;
      }
      case 'swapPick': {
        // a full kit chose a trait to exchange for: next, which trait goes
        const [cid, i] = (arg || '').split('|');
        U.swapPick = cid ? { card: cid, hero: parseInt(i, 10) } : null;
        U.render();
        return;
      }
      case 'swapDrop': {
        const [cid, i, drop] = arg.split('|');
        const r = U.exec({ op: 'takeCard', hero: parseInt(i, 10), card: cid, drop });
        if (!r.ok) U.toast(r.why);
        else U.swapPick = null;
        U.sfx.click();
        U.render();
        return;
      }
      case 'skipCard':
        U.exec({ op: 'skipCard', hero: parseInt(arg, 10) });
        U.render();
        return;
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
        const r = U.exec({ op: 'buyGear', hero: parseInt(i, 10), gear: g });
        if (!r.ok) U.toast(r.why);
        else U.sfx.click();
        U.render();
        return;
      }
      case 'adoptPet': {
        const i = parseInt(arg, 10);
        const sel = document.getElementById('petdrop-' + i);
        const r = U.exec({ op: 'adoptPet', hero: i, drop: sel && sel.value ? sel.value : undefined });
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
        const r = U.exec({ op: 'evTakeCard', hero: parseInt(i, 10), card: cid });
        if (!r.ok) {
          U.toast(r.why);
          return;
        }
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
  /**
   * The expedition is over: every pilot this screen made and flew takes its growth home (T.progressRecord), to
   * set out next time at the level it reached. Once a run; another player's pilot is theirs to keep.
   */
  const keptRuns = new Set();
  U.keepProgress = function (run) {
    const key = run.seed + ':' + run.launched;
    if (keptRuns.has(key)) return U.keptNow || [];
    keptRuns.add(key);
    const mine = T.loadMade();
    U.keptNow = [];
    run.heroes.forEach((h, i) => {
      const prev = h && h.madeId && mine.find((x) => x.id === h.madeId);
      if (!prev || !T.mayActFor(run, U.seats, i)) return;
      const kept = T.keepMade(T.progressRecord(h, prev, new Date().toISOString()));
      if (!kept) return;
      if (U.heroesShare) U.heroesShare(kept);
      U.keptNow.push({ name: h.name, level: T.pilotLevel(h), was: h.level || 1 });
    });
    return U.keptNow;
  };
  function finishRunMeta() {
    U.keepProgress(U.run);
    const meta = T.loadMeta();
    if (U.am) U.am.bestBefore = meta.runs ? meta.bestRow : null; // the end screen compares this run with the best before it
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
