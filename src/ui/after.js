/* ============================================================================
   TUMULT — AFTER A MISSION AND THE END OF AN EXPEDITION (the Frogma board's
   "Finalised UI" rows 8 and 9, desktop and phone).

   After a mission: the result (victory, or a loss the lifeline carries), the
   rewards each pilot picks, the full-kit exchange, growing a card (upgrade and
   awaken), the haven (rest, the stalls, train, listen) and the events on the
   road. The end of an expedition: the Heart reached or the lifelines spent,
   the logbook and the numbers.

   Rules are untouched: every button here sends the same command the old
   screens did (takeCard, swapDrop, skipCard, takeBoon, upRun, buyGear, rest,
   eventOpt, ...), handled in src/ui/core.js. This file only lays them out, and
   keeps a little state of its own on T.UI: which pilot's reward is open
   (U.am.rwHero), which offered trait is picked (U.am.rwCard), which trait a full
   kit gives up (U.am.drop), the card and face the upgrade view shows (U.am.up),
   and which view of the end screen is open (U.am.end). None of it is saved.
   ========================================================================== */
(function (T) {
  const U = T.UI;
  const esc = U.esc;
  const EL = T.ETHERIONS;
  const am = (U.am = U.am || { rwHero: null, rwCard: {}, drop: null, up: null, end: 'end', flash: null });

  /* ───────────── small pieces ───────────── */
  const art = (key) => (key ? U.artClass(key) : '');
  /** The painting of a stop: its atlas page's plate for a mission, the haven's or the event's scene otherwise. */
  function stopArt(run, nd) {
    if (!nd) return null;
    if (nd.page && T.PAGE_BY && T.PAGE_BY[nd.page] && T.PAGE_BY[nd.page].plate) return T.PAGE_BY[nd.page].plate;
    if (nd.type === 'haven') return U.EVENT_SCENES.haven;
    const ex = T.expeditionOf && T.expeditionOf(run);
    const leg = ex && ex.legs[T.actOf(nd.row)];
    return leg ? leg.scene : U.LEG_SCENES[T.actOf(nd.row)] || null;
  }
  const here = (run) => (run.nodeId != null && run.map ? run.map.all[run.nodeId] : null);
  const stopNo = (run) => (here(run) ? here(run).row + 1 : 0);
  const placeName = (nd) => (nd && nd.page && T.PAGE_BY && T.PAGE_BY[nd.page] ? T.PAGE_BY[nd.page].name : '');
  const elOf = (c) => (c.E && c.E.elt) || c.el;
  /** The squad's names, as a sentence: "Rosh", "Rosh and Ekora", "Rosh, Ekora and Vael". */
  const names = (run) => {
    const n = run.heroes.map((h) => h.name.split(' ')[0]);
    return n.length < 2 ? n.join('') : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
  };

  /**
   * A trait as a small tile: its art, name, clade and level, the element's gem in the corner. `o.act` and
   * `o.arg` make it a button; `o.sel` marks it chosen, `o.out` marks the trait a full kit gives up.
   */
  function tile(cid, o) {
    o = o || {};
    const c = T.CARD[cid];
    const sp = U.cladeIn(c, o.clades);
    const lv =
      o.P != null
        ? c.pet
          ? `P${o.P} · pet`
          : `P${o.P} · E${o.E}`
        : `${c.sig >= 2 ? '★ ' : ''}${esc(EL[elOf(c)].name)}`;
    const inner = `<span class="am-gem" style="--el:${EL[elOf(c)].color}"></span>${U.cardArt(c, false, sp)}<span class="am-tn">${esc(c.name)}</span><span class="am-tc">${U.icClade(sp)} ${esc(c.kin || T.SPECIES[sp].name)}</span><span class="am-tl">${lv}</span>${o.out ? '<span class="am-x" aria-hidden="true">✕</span>' : ''}`;
    const cls = `am-tile${o.sel ? ' sel' : ''}${o.out ? ' out' : ''}${o.dim ? ' dim' : ''}${o.cls ? ' ' + o.cls : ''}`;
    const tip = o.tip
      ? ` data-tip="${esc(o.tip)}"`
      : c.pet
        ? ` data-tip="${esc(T.PET_FACES.map((k) => U.faceTipHTML(c, k, o.P || 0, 0)).join('<hr>'))}"`
        : ` data-tip="${esc(U.faceTipHTML(c, 'P', o.P || 0, o.E || 0) + '<hr>' + U.faceTipHTML(c, 'E', o.P || 0, Math.max(o.E || 0, T.RULES.ETHEREAL_MIN_E)))}"`;
    if (!o.act) return `<div class="${cls}"${tip}>${inner}</div>`;
    return `<button class="${cls}" data-act="${o.act}" data-arg="${esc(o.arg)}"${o.disabled ? ' disabled' : ''}${tip} aria-pressed="${!!o.sel}">${inner}</button>`;
  }
  /** Both faces of a trait in a line each: what a pick would bring. */
  function faces(cid, P, E) {
    const c = T.CARD[cid];
    const f = (fk) => {
      const face = c[fk];
      return `<div class="am-face ${fk}"><b>${esc(face.n)}</b> <span class="mono dim">${face.ap} AP${face.el ? ` + ${face.el}<span class="el-${face.elt || c.el}">◆</span>` : ''}</span><span>${U.kw(esc(face.txt(P || 0, Math.max(E || 0, fk === 'E' ? T.RULES.ETHEREAL_MIN_E : 0))))}</span></div>`;
    };
    return `<div class="am-faces">${T.faceKeys(cid).map(f).join('')}</div>`;
  }
  /** Each pilot's portrait, name and vitality. */
  function squad(run, cls) {
    return `<div class="am-squad ${cls || ''}">${run.heroes
      .map(
        (h) =>
          `<div class="am-sq">${U.portrait(h, 'am-pf')}<div class="am-sqb"><div class="row"><b>${esc(h.name.split(' ')[0])}</b><span class="right mono small">${h.hp}/${h.maxHp}</span></div><div class="am-hp"><i style="width:${Math.round((100 * h.hp) / h.maxHp)}%"></i></div></div></div>`,
      )
      .join('')}</div>`;
  }
  /** The ways out of a run screen that every screen keeps: sound, help, look, title. Slim, top right. */
  function topbar(run, extra) {
    return `<div class="am-top"><span class="kick">Tumult</span><span class="right row">${extra || ''}${run ? U.purseHTML(run) : ''}<button class="ghost sm" data-act="toggleSound" aria-label="Sound">${U.sound ? '🔊' : '🔇'}</button><button class="ghost sm" data-act="help">?</button><button class="ghost sm" data-act="look">Look</button>${U.titleBtn()}</span></div>`;
  }
  /** The painting behind a screen, and the veil that lets words read on it. */
  const backdrop = (key, cls) =>
    key && T.ART && T.ART[key]
      ? `<div class="am-bg ${art(key)} ${cls || ''}" aria-hidden="true"></div><div class="am-veil ${cls || ''}" aria-hidden="true"></div>`
      : `<div class="am-veil plain ${cls || ''}" aria-hidden="true"></div>`;
  const hearts = (run) => {
    const left = run.lifeline || 0;
    const spent = run.stats.lifelineUsed ? 1 : 0;
    const all = Math.max(1, left + spent);
    return `<span class="am-hearts" aria-label="${left} lifeline${left === 1 ? '' : 's'} left">${Array.from({ length: all }, (_, k) => `<i class="${k < left ? 'on' : ''}">♥</i>`).join('')}</span>`;
  };

  /* ───────────── AFTER A MISSION: the result and the rewards ───────────── */
  /** The pilot whose reward is open: kept if still valid, else the first of this screen's pilots with a choice left. */
  function rewardHero(run, rw) {
    const n = run.heroes.length;
    if (am.rwHero != null && am.rwHero < n) return am.rwHero;
    const open = run.heroes.findIndex((h, i) => U.own(i) && (!rw.picked[i] || !rw.boonPicked[i]));
    return open >= 0
      ? open
      : run.heroes.findIndex((h, i) => U.own(i)) >= 0
        ? run.heroes.findIndex((h, i) => U.own(i))
        : 0;
  }
  function pilotTabs(run, rw, cur) {
    if (run.heroes.length < 2) return '';
    return `<div class="am-tabs" role="tablist">${run.heroes
      .map((h, i) => {
        const done = rw.picked[i] && rw.boonPicked[i];
        return `<button role="tab" aria-selected="${i === cur}" class="am-tab${i === cur ? ' on' : ''}${done ? ' done' : ''}" data-act="amRwHero" data-arg="${i}">${U.portrait(h, 'am-pf-xs')}<span>${esc(h.name.split(' ')[0])}</span>${done ? '<span class="check-s">✓</span>' : U.own(i) ? '<span class="dot-s"></span>' : ''}</button>`;
      })
      .join('')}</div>`;
  }
  /** One pilot's pick: a trait of three (or skip), and after an elite a boon of two. */
  function rewardPick(run, rw, i) {
    const h = run.heroes[i];
    if (!U.own(i))
      return `<p class="dim">${rw.picked[i] && rw.boonPicked[i] ? `✓ ${esc(h.name)} has chosen.` : `${esc(T.ownerName(run, i))} is choosing for ${esc(h.name)}…`}</p>`;
    const offer = rw.offers[i];
    let trait;
    if (rw.picked[i]) {
      const took = am.taken && am.taken[i] && h.cards.includes(am.taken[i]) ? am.taken[i] : null;
      trait = `<p class="am-done">✓ ${took ? `<b>${esc(T.CARD[took].name)}</b> joins ${esc(h.name.split(' ')[0])}'s kit` : `${esc(h.name.split(' ')[0])}'s trait is chosen`}.</p>`;
    } else {
      const sel = offer.includes(am.rwCard[i]) ? am.rwCard[i] : offer[0];
      const ex = sel && T.isSwapOffer(run, i, sel);
      const full = h.cards.length >= T.RULES.MAX_CARDS;
      trait = `<div class="am-lab">${full ? `Trait · ${esc(h.name.split(' ')[0])}'s kit is full: an exchange` : 'Trait · pick one'}</div>
        <div class="am-offer">${offer.map((cid) => tile(cid, { act: 'amRwCard', arg: `${i}|${cid}`, sel: cid === sel, clades: h.species, cls: T.isSwapOffer(run, i, cid) ? 'swap' : '' })).join('')}</div>
        ${sel ? faces(sel, 0, 0) : ''}
        <div class="am-acts">${
          sel
            ? ex
              ? `<button class="primary am-cta" data-act="swapPick" data-arg="${sel}|${i}" data-tip="Give up one of ${esc(h.name)}'s nine traits for this one.">Exchange for ${esc(T.CARD[sel].name)} ▶</button>`
              : `<button class="primary am-cta" data-act="takeCard" data-arg="${sel}|${i}">Take ${esc(T.CARD[sel].name)} ▶</button>`
            : ''
        }<button class="ghost am-ghost" data-act="skipCard" data-arg="${i}">Skip · +2 ◇</button></div>`;
    }
    const boon = !rw.boons
      ? ''
      : rw.boonPicked[i]
        ? `<p class="am-done">✓ Boon chosen.</p>`
        : `<div class="am-lab">An elite fell · a boon for ${esc(h.name.split(' ')[0])}</div><div class="am-boons">${rw.boons[
            i
          ]
            .map(
              (b) =>
                `<button class="am-boon" data-act="takeBoon" data-arg="${b}|${i}"><span class="am-bi">${U.icBoon(b)}</span><b>${esc(T.BOON_BY[b].name)}</b><span class="small dim">${esc(T.BOON_BY[b].desc)}</span><span class="am-take">Take</span></button>`,
            )
            .join('')}</div>`;
    return trait + boon;
  }
  /** Growing a card waits for the reward: a pilot with points to spend is offered it here. */
  function growOffer(run) {
    const ready = run.heroes.map((h, i) => ({ h, i })).filter(({ h, i }) => U.own(i) && h.upUnspent > 0);
    if (!ready.length) return '';
    const pts = ready.reduce((n, { h }) => n + h.upUnspent, 0);
    const who = ready.length === 1 ? ready[0].h.name.split(' ')[0] : 'the squad';
    return `<div class="am-grow"><button class="ghost am-ghost sm" data-act="train" data-arg="${ready[0].i}" data-tip="${esc(ready.map(({ h }) => `${h.name}: ${h.upUnspent}`).join(' · '))}">✦ Grow a card · ${pts} point${pts === 1 ? '' : 's'} for ${esc(who)}</button></div>`;
  }
  /** The full kit's exchange: the trait coming in, the nine there now, and the one that goes. */
  function renderSwap(run, rw) {
    const i = U.swapPick.hero;
    const h = run.heroes[i];
    const sw = U.swapPick.card;
    const drops = new Set(T.swapDrops(h, sw));
    const drop = drops.has(am.drop) ? am.drop : null;
    let foot = `<span class="dim">Choose the trait that goes out.</span>`;
    if (drop) {
      const u = h.up[drop] || [0, 0];
      const after = h.cards.filter((c) => c !== drop).concat(sw);
      const slots = T.cladeSlots(h, after) || {};
      const counts = {};
      Object.values(slots).forEach((s) => (counts[s] = (counts[s] || 0) + 1));
      const caps = Object.keys(counts)
        .map((s) => `${T.SPECIES[s].name} ${counts[s]}/${T.RULES.MAX_PER_SPECIES || 3}`)
        .join(' · ');
      foot = `Give up <b>${esc(T.CARD[drop].name)}</b> · <span class="ok">${u[0] + u[1] ? `its ${u[0] + u[1]} point${u[0] + u[1] === 1 ? '' : 's'} come back` : 'no points on it'}</span>${caps ? ` · ${esc(caps)}` : ''}`;
    }
    return `<div class="am am-swap">${backdrop(null)}${topbar(run)}
      <div class="am-head"><span class="am-eye">Reward · ${esc(h.name.split(' ')[0])}'s kit is full (${h.cards.length} of ${T.RULES.MAX_CARDS})</span><h1 class="am-h">${esc(T.CARD[sw].name)} comes in. Which trait goes out?</h1><p class="dim">The points spent on the one you give up come back to spend again${h.bound && Object.keys(h.bound).length ? ' (points a second copy bound to it go with it)' : ''}. No more than ${T.RULES.MAX_PER_SPECIES || 3} from one bloodline.</p></div>
      <div class="am-swaprow"><div class="am-in"><div class="am-lab ok">Coming in</div>${tile(sw, { clades: h.species, cls: 'big glow' })}</div><div class="am-arrow" aria-hidden="true">⇄</div>
      <div class="am-kit">${h.cards
        .map((d) => {
          const u = h.up[d] || [0, 0];
          const can = drops.has(d);
          return tile(d, {
            act: can ? 'amDrop' : null,
            arg: d,
            P: u[0],
            E: u[1],
            clades: h.species,
            out: d === drop,
            dim: !can,
            tip: can ? null : `${T.CARD[d].name} stays: giving it up would break the bloodline rule.`,
          });
        })
        .join('')}</div></div>
      <div class="am-bar panel"><div class="am-bartxt">${foot}</div><button class="ghost am-ghost" data-act="swapPick" data-arg="">Back to the offer</button><button class="primary am-cta" data-act="swapDrop" data-arg="${drop ? `${sw}|${i}|${drop}` : ''}" ${drop ? '' : 'disabled'}>Swap</button></div></div>`;
  }
  U.renderReward = function () {
    const run = U.run;
    const rw = run.lastReward;
    if (U.swapPick && !rw.picked[U.swapPick.hero]) return renderSwap(run, rw);
    const nd = here(run);
    const scene = stopArt(run, nd);
    const place = placeName(nd);
    const ready = T.rewardSettled(rw);
    if (rw.lifeline) {
      const last = run.history[run.history.length - 1] || {};
      const own = (last.notes || []).filter((n) => n.text);
      return `<div class="am am-lost">${backdrop(scene, 'grey')}${topbar(run)}
        <div class="am-hero"><span class="am-eye red">${esc(rw.title)}${place && place !== rw.title ? ' · ' + esc(place) : ''} · round ${rw.rounds}</span><h1 class="am-big red">The tide took it</h1><p class="am-sub">Lost, but the lifeline holds: the squad limps on at half vitality. No rewards from this stop.</p></div>
        <div class="am-one panel am-redline"><div class="am-col"><div class="am-lab red">What happened</div>${rw.bonus.map((b) => `<div class="am-obj">${b.achieved ? '<span class="check">✓</span>' : '<span class="xmark">✕</span>'}<span>${esc(b.text)}</span></div>`).join('')}<div class="small dim">${rw.rounds} rounds · ${rw.kills} foe${rw.kills === 1 ? '' : 's'} destroyed${last.foe ? ` · ${esc(last.foe)} held the field` : ''}</div>${own.length ? `<div class="am-said">“${esc(own[own.length - 1].text)}”</div>` : ''}</div>
        <div class="am-col narrow"><div class="am-lab">Lifelines</div>${hearts(run)}<span class="small dim">${run.lifeline ? `${run.lifeline} left` : 'None left: the next loss ends the expedition.'}</span>${squad(run, 'tight')}</div></div>
        <div class="am-foot"><button class="primary am-cta" data-act="rewardDone" ${ready ? '' : 'disabled'}>Onward ▶</button></div></div>`;
    }
    const cur = rewardHero(run, rw);
    const purses = rw.purse && rw.purse.length > 1 ? ` (${rw.purse.map((n) => '+' + n).join(' / ')})` : '';
    const waiting = run.heroes.map((h, i) => ({ h, i })).filter(({ i }) => !(rw.picked[i] && rw.boonPicked[i]));
    return `<div class="am am-win">${backdrop(scene)}${topbar(run)}
      <div class="am-hero"><span class="am-eye">${esc(rw.title)}${place && place !== rw.title ? ' · ' + esc(place) : ''} · won in round ${rw.rounds}</span><h1 class="am-big gold">Victory</h1></div>
      <div class="am-grid">
        <div class="panel am-col"><div class="am-lab gold">Objective</div>${rw.bonus.map((b) => `<div class="am-obj">${b.achieved ? '<span class="check">✓</span>' : '<span class="xmark">✕</span>'}<span>${esc(b.text)}</span></div>`).join('') || '<div class="am-obj"><span class="check">✓</span><span>Done</span></div>'}<div class="small dim">${rw.kills} foe${rw.kills === 1 ? '' : 's'} destroyed</div>
          <div class="am-lab">Squad</div>${squad(run)}</div>
        <div class="panel am-col am-rewards"><div class="row"><div class="am-lab gold">Rewards</div><span class="right row am-chips"><span class="chip gold">+${rw.crystals} ◇${purses}</span><span class="chip">+${rw.up} point${rw.up === 1 ? '' : 's'} each</span></span></div>
          ${pilotTabs(run, rw, cur)}
          <div class="am-pick">${rewardPick(run, rw, cur)}</div></div>
      </div>
      <div class="am-foot">${growOffer(run)}<button class="primary am-cta" data-act="rewardDone" ${ready ? '' : 'disabled'} ${ready ? '' : `data-tip="${esc('Still to choose: ' + waiting.map(({ h }) => h.name.split(' ')[0]).join(', '))}"`}>${ready ? 'Onward ▶' : `Choosing… ${run.heroes.length - waiting.length}/${run.heroes.length}`}</button></div></div>`;
  };

  /* ───────────── UPGRADE AND AWAKEN: grow one card ───────────── */
  /** The upgrade view replaces the old Train sheet: the kit down the side, one card large, before and after. */
  U.openTrain = function (i) {
    const run = U.run;
    const h = run.heroes[i];
    if (!am.up || am.up.hero !== i || !h.cards.includes(am.up.card)) {
      // start on the first card with room to grow, a sleeping card first
      const asleep = h.cards.find((c) => !T.CARD[c].pet && T.heroE(h, c) < T.RULES.ETHEREAL_MIN_E);
      am.up = { hero: i, card: asleep || h.cards[0], face: asleep ? 'E' : 'E' };
    }
    const cid = am.up.card;
    const c = T.CARD[cid];
    const P = T.heroP(h, cid);
    const E = T.heroE(h, cid);
    const capP = T.RULES.P_CAP;
    const capE = T.RULES.E_CAP;
    const fk = c.pet ? 'P' : am.up.face; // a pet's card grows with P alone
    const lv = fk === 'P' ? P : E;
    const cap = fk === 'P' ? capP : capE;
    const pts = h.upUnspent + T.boundLeft(h, cid);
    const can = lv < cap && pts > 0;
    const asleep = fk === 'E' && E < T.RULES.ETHEREAL_MIN_E;
    const face = c[fk];
    const before = asleep ? 'Asleep: this face cannot be played yet.' : face.txt(P, E);
    const after = lv >= cap ? null : fk === 'P' ? face.txt(P + 1, E) : face.txt(P, E + 1);
    const flash = am.flash && am.flash.card === cid && Date.now() - am.flash.at < 1500 ? ' am-grown' : '';
    const others = run.heroes.map((x, k) => ({ x, k })).filter(({ k }) => U.own(k) && k !== i);
    const faceBtn = (k) => {
      const f = c[k];
      const l = k === 'P' ? P : E;
      const cp = k === 'P' ? capP : capE;
      const label =
        k === 'E' && E < T.RULES.ETHEREAL_MIN_E
          ? `Awaken ${esc(f.n)}`
          : `${esc(f.n)} ${k}${l} → ${l >= cp ? 'max' : k + (l + 1)}`;
      return `<button class="am-fbtn${fk === k ? ' on' : ''}" data-act="amUpFace" data-arg="${k}" aria-pressed="${fk === k}">${label}</button>`;
    };
    U.openModal(`<div class="am-sheet am-up" role="dialog" aria-label="Grow one card">
      <div class="am-uphead"><span class="am-eye">Upgrade · ${esc(h.name.split(' ')[0])} has ${h.upUnspent} point${h.upUnspent === 1 ? '' : 's'}</span><h2 class="am-h">Grow one card</h2>
        <span class="am-uptools">${others.map(({ x, k }) => `<button class="ghost sm" data-act="train" data-arg="${k}">${U.portrait(x, 'am-pf-xs')} ${esc(x.name.split(' ')[0])}</button>`).join('')}<button class="ghost sm" data-act="autoUpRun" data-arg="${i}" data-tip="Spend every point the way the simulated players do">Auto</button><button class="sm" data-act="closeModal">Done</button></span></div>
      <div class="am-upbody">
        <div class="am-upkit" role="listbox" aria-label="${esc(h.name)}'s cards">${h.cards
          .map((k) => {
            const kp = T.heroP(h, k);
            const ke = T.heroE(h, k);
            return tile(k, {
              act: 'amUpCard',
              arg: `${i}|${k}`,
              sel: k === cid,
              P: kp,
              E: ke,
              clades: h.species,
              cls: T.CARD[k].pet
                ? kp >= capP
                  ? 'maxed'
                  : ''
                : ke < T.RULES.ETHEREAL_MIN_E
                  ? 'asleep'
                  : kp + ke >= capP + capE
                    ? 'maxed'
                    : '',
            });
          })
          .join('')}</div>
        <div class="am-upcard${flash}"><div class="am-spark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>${U.cardHTML(cid, { P, E, showUp: true, flavor: false, clades: h.species, bound: T.boundLeft(h, cid) })}</div>
        <div class="panel am-upside">
          <div class="am-fbtns">${c.pet ? faceBtn('P') : faceBtn('P') + faceBtn('E')}</div>
          <div class="am-lab">${esc(face.n)}, ${asleep ? 'now' : 'before'}</div><div class="am-before">${U.kw(esc(before))}</div>
          ${after != null ? `<div class="am-lab gold">${esc(face.n)}, ${asleep ? 'awake' : 'after'}</div><div class="am-after">${U.kw(esc(after))}</div>` : `<div class="am-lab gold">At its height</div><div class="am-after dim">${esc(face.n)} is at ${fk} ${cap}, as far as it grows.</div>`}
          <p class="small dim">${fk === 'P' ? 'Physical costs AP only and grows with P.' : `Ethereal unlocks at E ${T.RULES.ETHEREAL_MIN_E} and grows with E.`} Caps: P ${capP}, E ${capE}.</p>
          <button class="primary am-cta wide" data-act="upRun" data-hero="${i}" data-arg="${cid}|${fk}|1" ${can ? '' : 'disabled'}>${asleep ? 'Awaken it ▶' : 'Grow it ▶'}</button>
          ${lv > 0 ? `<button class="ghost am-ghost sm wide" data-act="upRun" data-hero="${i}" data-arg="${cid}|${fk}|-1">↶ Take a point back</button>` : ''}
        </div>
      </div></div>`);
  };

  /* ───────────── THE HAVEN ───────────── */
  U.renderHaven = function () {
    const run = U.run;
    const hv = run.haven;
    const nd = here(run);
    const own = U.own;
    const anyUp = run.heroes.some((h, i) => own(i) && h.upUnspent > 0);
    const gear = hv.gear
      .map((gid) => {
        const g = T.GEAR_BY[gid];
        return `<div class="am-ware"><div class="row"><span class="am-wi">${U.icGear(g.id)}</span><b>${esc(g.name)}</b><span class="right chip gold">${g.price} ◇</span></div><div class="small dim">${esc(g.desc)}</div>${g.passive ? `<div class="small">◆ <b>Passive</b>: ${esc(g.passive.txt)}</div>` : ''}${g.abilities.map((a) => `<div class="small">• <b>${esc(a.n)}</b> <span class="mono dim">${a.cost} ◇ · cd ${a.cd}</span> ${esc(a.txt())}</div>`).join('')}<div class="am-buy">${run.heroes
          .map((h, i) => {
            if (!own(i)) return '';
            const ok = T.crystalsFor(run, i) >= g.price && h.gear.length < 2;
            return `<button class="sm ${ok ? 'primary' : ''}" data-act="buyGear" data-arg="${gid}|${i}" ${ok ? '' : 'disabled'} ${h.gear.length >= 2 ? 'data-tip="Two pieces of gear at most"' : ''}>For ${esc(h.name.split(' ')[0])}</button>`;
          })
          .join('')}</div></div>`;
      })
      .join('');
    // a stray (src/data/pets.js): adopt it for its card, which counts toward the nine
    const pr = hv.pet;
    const stray = pr
      ? `<div class="am-ware am-pet"><div class="row"><span class="am-wi">🐾</span><b>${esc(pr.name)}</b><span class="small dim">&nbsp;a ${esc(pr.species.map((sp) => T.SPECIES[sp].name).join(', '))} hybrid</span><span class="right chip gold">${T.PET.PRICE} ◇</span></div><div class="small dim">A pet: a small unit of its own on the board (${T.PET.HP} vitality). Its card holds a Physical face from each of its clades and plays from the pet; any one face sends the whole card to the track. It may share your node, where nothing can hurt it. At 0 it dies, and the card goes with it.</div>${U.cardHTML(pr.card, { P: 0, E: 0, flavor: true })}<div class="am-buy">${run.heroes
          .map((h, i) => {
            if (!own(i)) return '';
            const full = h.cards.length >= T.RULES.MAX_CARDS;
            const can = T.crystalsFor(run, i) >= T.PET.PRICE && (h.pets || []).length < T.PET.MAX;
            const drop = full
              ? `<select id="petdrop-${i}" aria-label="Card ${esc(h.name)} gives up">${h.cards.map((c) => `<option value="${esc(c)}">${esc(T.CARD[c].name)}</option>`).join('')}</select>`
              : '';
            const why =
              (h.pets || []).length >= T.PET.MAX
                ? `data-tip="${T.PET.MAX} pets at most"`
                : full
                  ? 'data-tip="The kit is full: give up a card for the pet"'
                  : '';
            return `${drop}<button class="sm ${can ? 'primary' : ''}" data-act="adoptPet" data-arg="${i}" ${can ? '' : 'disabled'} ${why}>${full ? 'Exchange for' : 'Adopt for'} ${esc(h.name.split(' ')[0])}</button>`;
          })
          .join('')}</div></div>`
      : '';
    const story = 'Walls against the wind, a fire, and someone who mends things for crystals. Nothing hunts here.';
    return `<div class="am am-haven">${backdrop(U.EVENT_SCENES.haven, 'side')}${topbar(run)}
      <div class="am-split"><div class="am-art ${art(U.EVENT_SCENES.haven)}" aria-hidden="true"></div>
      <div class="am-main">
        <span class="am-eye">Stop ${stopNo(run)} · the haven</span><h1 class="am-h">${esc(placeName(nd) || 'A haven')}</h1><p class="am-sub">Rest, trade, train, or listen. Nothing hunts here; leave when the squad is ready.</p>
        <div class="am-opts">
          <div class="am-opt${hv.healed ? ' done' : ''}"><div class="row"><span class="am-oi heal">♥</span><b>Rest</b>${hv.healed ? '<span class="right check">✓</span>' : ''}</div><span class="small dim">${hv.healed ? 'The squad has rested.' : 'Recover half of what each pilot is missing, or pay for a full repair.'}</span><div class="am-ob"><button class="sm ${hv.healed ? '' : 'primary'}" data-act="rest" data-arg="half" ${hv.healed ? 'disabled' : ''}>Rest · free</button><button class="sm" data-act="rest" data-arg="full" ${hv.healed || T.totalCrystals(run) < 3 ? 'disabled' : ''} data-tip="The squad's repair: every pilot back to full.${T.playerCount(run) > 1 ? ' Paid from the fuller purse first.' : ''}">Full repair · 3 ◇</button></div></div>
          <div class="am-opt"><div class="row"><span class="am-oi gold">◇</span><b>Trade</b></div><span class="small dim">Gear from the stalls, paid in omnicrystals.</span><div class="am-ob"><button class="sm" data-act="amScroll" data-arg="am-stalls">To the stalls ↓</button><span class="chip gold">${T.totalCrystals(run)} ◇ to spend</span></div></div>
          <div class="am-opt${anyUp ? '' : ' quiet'}"><div class="row"><span class="am-oi up">✦</span><b>Train</b></div><span class="small dim">Grow a card with the points the missions gave.</span><div class="am-ob">${run.heroes.map((h, i) => (own(i) ? `<button class="sm" data-act="train" data-arg="${i}">${esc(h.name.split(' ')[0])} · ${h.upUnspent}</button>` : '')).join('')}</div></div>
          <div class="am-opt"><div class="row"><span class="am-oi canon">✎</span><b>Listen</b></div><span class="small dim am-story">${esc(story)} ${U.canonMark ? U.canonMark('event:haven', story, 'event:text') : ''}</span><div class="am-ob"><button class="sm ghost" data-act="kit" data-arg="0">Look over the kits</button></div></div>
        </div>
        <div class="am-row2">${squad(run)}</div>
        <div id="am-stalls" class="am-stalls"><div class="am-lab gold">The stalls · gear</div><div class="am-wares">${gear || '<span class="dim small">Sold out.</span>'}</div>${stray ? `<div class="am-lab gold">A stray</div><div class="am-wares">${stray}</div>` : ''}</div>
      </div></div>
      <div class="am-foot"><button class="primary am-cta" data-act="leaveHaven">Leave ▶</button></div></div>`;
  };

  /* ───────────── AN EVENT ON THE ROAD ───────────── */
  U.renderEvent = function () {
    const run = U.run;
    const ev = run.event;
    const def = ev.def;
    const scene = U.EVENT_SCENES[def.id];
    let body;
    if (!ev.resolved)
      body = `<div class="am-choices">${def.options
        .map((o, i) => {
          const cost = o.cost && o.cost.crystals;
          const can = !cost || T.totalCrystals(run) >= cost;
          return `<button class="am-choice" data-act="eventOpt" data-arg="${i}" ${can ? '' : 'disabled'}><span>${esc(o.label)}</span>${cost ? `<span class="chip gold">${cost} ◇</span>` : ''}${!can ? '<span class="small dim">not enough ◇</span>' : ''}</button>`;
        })
        .join('')}</div>`;
    else {
      let fu = '';
      const f = ev.followup;
      if (f && f.kind === 'cardPick' && !f.done)
        fu = `<div class="am-lab gold">Choose a trait</div><div class="am-offer">${f.offer
          .map(
            (cid) =>
              `<div class="am-evpick">${tile(cid, {})}<div class="am-buy">${run.heroes
                .map((h, i) => {
                  const ok = T.canAddCard(h, cid);
                  return `<button class="sm ${ok.ok ? 'primary' : ''}" data-act="evTakeCard" data-arg="${cid}|${i}" ${ok.ok ? '' : `disabled data-tip="${esc(ok.why || '')}"`}>→ ${esc(h.name.split(' ')[0])}</button>`;
                })
                .join('')}</div></div>`,
          )
          .join('')}</div><button class="ghost am-ghost sm" data-act="evSkipCard">Take nothing</button>`;
      else if (f && f.kind === 'tradeCard' && !f.done) {
        const h = run.heroes[f.heroIdx];
        fu = `<div class="am-lab gold">${esc(h.name)} sheds a trait</div><p class="small dim">A random trait of the same bloodline grows in its place.</p><div class="am-kit">${h.cards.map((cid) => tile(cid, { act: 'evTrade', arg: cid, P: T.heroP(h, cid), E: T.heroE(h, cid), clades: h.species })).join('')}</div><button class="ghost am-ghost sm" data-act="evSkipCard">Keep everything</button>`;
      } else if (f && f.kind === 'tradeCard' && f.done)
        fu = `<p>${esc(run.heroes[f.heroIdx].name)} sheds <b>${esc(T.CARD[f.dropped].name)}</b> and grows <b>${f.gained ? esc(T.CARD[f.gained].name) : 'nothing: the bloodline is exhausted'}</b>.</p>`;
      else if (f && f.kind === 'boonGiven')
        fu = `<p>${esc(f.hero)} gains <b>${U.icBoon(f.boon)} ${esc(T.BOON_BY[f.boon].name)}</b>: ${esc(T.BOON_BY[f.boon].desc)}</p>`;
      else if (f && f.kind === 'respec')
        fu = `<p>${esc(f.hero)}'s points come back to spend again.</p>${growOffer(run)}`;
      const ready = !f || f.done || !['cardPick', 'tradeCard'].includes(f.kind);
      body = `<div class="am-result">${esc(ev.result)}</div>${fu}<div class="am-foot inline"><button class="primary am-cta" data-act="leaveEvent" ${ready ? '' : 'disabled'}>Onward ▶</button></div>`;
    }
    return `<div class="am am-event">${backdrop(scene, 'side')}${topbar(run)}
      <div class="am-split"><div class="am-art ${art(scene)}" aria-hidden="true"></div>
      <div class="am-main"><span class="am-eye">Stop ${stopNo(run)} · on the road</span><h1 class="am-h"><span class="ev-ic">${U.icEvent(def)}</span> ${esc(def.title)}</h1><p class="am-story-l">${esc(def.text)} ${U.canonMark ? U.canonMark('event:' + def.id, def.text, 'event:text') : ''}</p>${body}<div class="am-row2">${squad(run)}</div></div></div></div>`;
  };

  /* ───────────── THE END OF AN EXPEDITION ───────────── */
  /**
   * The stops the squad played, top to bottom, each with its painting and how it went. A row with one stop
   * done is the one the squad stood on (a row skipped by a shortcut has every stop marked done).
   */
  function pathOf(run) {
    if (!run.map) return [];
    const rows = {};
    Object.values(run.map.all).forEach((n) => {
      if (n.done || n.id === run.nodeId) (rows[n.row] = rows[n.row] || []).push(n);
    });
    const path = Object.keys(rows)
      .map(Number)
      .sort((a, b) => a - b)
      .map((r) => (rows[r].length === 1 ? rows[r][0] : rows[r].find((n) => n.id === run.nodeId)))
      .filter(Boolean);
    let k = 0;
    return path.map((nd) => {
      const kind = nd.type === 'haven' ? 'haven' : nd.type === 'event' ? 'event' : 'mission';
      const h = kind === 'mission' ? run.history[k++] : null;
      return {
        nd,
        kind,
        h,
        title: h ? h.title : kind === 'haven' ? placeName(nd) || 'Haven' : 'On the road',
        art: stopArt(run, nd),
        state: h ? (h.won ? 'won' : 'lost') : kind,
      };
    });
  }
  const notesOf = (run) => run.history.flatMap((x) => (x.notes || []).map((n) => Object.assign({ stop: x.title }, n)));
  function endTabs(view) {
    const t = [
      ['end', 'The end'],
      ['log', 'Logbook'],
      ['stats', 'Numbers'],
    ];
    return `<div class="am-endtabs" role="tablist">${t.map(([k, l]) => `<button role="tab" aria-selected="${view === k}" class="am-tab${view === k ? ' on' : ''}" data-act="amEnd" data-arg="${k}">${l}</button>`).join('')}</div>`;
  }
  function endButtons(won) {
    return `<button class="primary am-cta" data-act="newRun">${won ? 'New expedition' : 'Try again'} ▶</button><button class="ghost am-ghost" data-act="toTitle">Home</button>`;
  }
  function renderHeart(run, path) {
    const rows = run.map ? run.map.rows.length : path.length;
    return `<div class="am am-heart">${backdrop(stopArt(run, here(run)), 'heart')}${topbar(null)}${endTabs('end')}
      <div class="am-hero"><span class="am-eye">${esc(T.threatTitle(run))} · ${path.length} stop${path.length === 1 ? '' : 's'} of ${rows} · ${run.stats.rounds} rounds</span><h1 class="am-big gold">The Heart</h1><p class="am-sub">${esc(names(run))} reached it. ${esc(T.fillTokens(T.FLAVOR.win[0], { THREAT: T.threatName(run) }))}</p></div>
      <div class="am-crew">${run.heroes.map((h) => `<div class="am-crewm">${U.portrait(h, 'am-pf-xl')}<b>${esc(h.name)}</b><span class="small dim">${esc(h.title || '')}</span></div>`).join('')}</div>
      ${routeTiles(path)}${keptLine()}
      <div class="am-foot center"><button class="primary am-cta" data-act="amEnd" data-arg="log">See the logbook ▶</button>${endButtons(true).replace('primary am-cta', 'ghost am-ghost')}</div></div>`;
  }
  function routeTiles(path) {
    return `<div class="am-route">${path.map((p) => `<div class="am-stop ${p.state}"><div class="am-stopart ${art(p.art)}"></div><span class="am-st">${p.state}</span><span class="am-sn">${esc(p.title)}</span></div>`).join('')}</div>`;
  }
  function keptLine() {
    const k = U.keptNow || [];
    if (!k.length) return '';
    return `<p class="am-kept small" data-tip="A pilot you made keeps its traits and the points on them for its next expedition, and the missions grow to meet it. Gear, boons and crystals stay behind.">${k.map((x) => `<b>${esc(x.name)}</b> comes home at level ${x.level}${x.level > x.was ? ` (was ${x.was})` : ''}`).join(' · ')}.</p>`;
  }
  function renderFallen(run, path) {
    const rows = run.map ? run.map.rows.length : 0;
    const reached = stopNo(run);
    const best = am.bestBefore;
    const notes = notesOf(run).filter((n) => n.text);
    const kept = U.keptNow || [];
    const carry = [];
    if (kept.length)
      carry.push([
        '★',
        kept
          .map((x) => `${esc(x.name)} comes home at level ${x.level}${x.level > x.was ? ` (was ${x.was})` : ''}`)
          .join('; '),
      ]);
    if (notes.length)
      carry.push(['✎', `${notes.length} line${notes.length === 1 ? '' : 's'} of story written on the way`]);
    const places = path.filter((p) => p.kind === 'mission').length;
    if (places) carry.push(['◎', `${places} place${places === 1 ? '' : 's'} played, in your Atlas`]);
    if (best != null)
      carry.push([
        '☆',
        reached > best ? `Best run: stop ${reached} (was ${best})` : `Best run so far: stop ${Math.max(best, reached)}`,
      ]);
    return `<div class="am am-fallen">${backdrop(stopArt(run, here(run)), 'grey')}${topbar(null)}${endTabs('end')}
      <div class="am-grid">
        <div class="am-col am-fallmain"><span class="am-eye red">No lifelines left · stop ${reached} of ${rows}</span><h1 class="am-h xl">The expedition ends here</h1><p class="am-sub">${esc(T.fillTokens(T.FLAVOR.lose[0], { THREAT: T.threatName(run) }))}</p><p class="dim">${esc(names(run))} came ${reached} stop${reached === 1 ? '' : 's'} down the route${run.stats.lifelineUsed ? ', with the lifeline spent on the way' : ''}. What you found stays found.</p>
          ${routeTiles(path)}
          <div class="am-foot left">${endButtons(false)}</div></div>
        <div class="panel am-col"><div class="am-lab gold">What carries over</div>${carry.length ? carry.map(([i, t]) => `<div class="am-carry"><span class="am-ci">${i}</span><span>${t}</span></div>`).join('') : '<div class="small dim">This squad came from the pre-made pilots: build your own on the title screen and it keeps what it grows.</div>'}</div>
      </div></div>`;
  }
  function renderLog(run, path) {
    const notes = notesOf(run).filter((n) => n.text);
    const last = notes[notes.length - 1];
    const pilots = run.heroes.map((h) => h.name).join(' and ');
    return `<div class="am am-logv">${topbar(null)}${endTabs('log')}
      <article class="am-paper" id="am-log"><header class="am-ph"><h1>The Logbook</h1><span class="am-pw">${esc(pilots)}</span><span class="am-po ${run.won ? '' : 'lost'}">${run.won ? 'reached the Heart' : `ended at stop ${stopNo(run)}`}</span></header>
        <div class="am-pstops">${path
          .map(
            (p, k) =>
              `<div class="am-pstop"><div class="am-pthumb ${art(p.art)}"></div><div><div class="am-pk">Stop ${k + 1}</div><div class="am-pn">${esc(p.title)}</div><div class="am-pt">${p.h ? `${p.h.won ? 'Won' : 'Lost'} in ${p.h.rounds} round${p.h.rounds === 1 ? '' : 's'}${p.h.kills ? `, ${p.h.kills} foe${p.h.kills === 1 ? '' : 's'} down` : ''}${p.h.foe ? `. ${esc(p.h.foe)} stood against them` : ''}.` : p.kind === 'haven' ? 'A night at the haven.' : 'Something on the road.'}${p.h && p.h.notes && p.h.notes.length ? ` <i>“${esc(p.h.notes[p.h.notes.length - 1].text)}”</i>` : ''}</div></div></div>`,
          )
          .join('')}</div>
        ${run.story && run.story.log.length ? `<div class="am-chron"><div class="am-pk">Between the stops</div>${run.story.log.map((p) => `<div class="am-centry"><h4>${esc(p.title)}</h4>${p.lines.map((l) => U.passageLine(run, l)).join('')}</div>`).join('')}</div>` : ''}
        ${last ? `<div class="am-last">✎ Your last line: <i>“${esc(last.text)}”</i></div>` : ''}
        <div class="am-pacts"><button class="primary am-cta" data-act="amCopyLog">Copy as text</button><button class="ghost am-ghost ink" data-act="amPrint">Print</button></div>
      </article>
      <div class="am-foot center">${endButtons(run.won)}</div></div>`;
  }
  /** The logbook as plain text, for a message or a notebook. */
  U.logbookText = function (run) {
    const path = pathOf(run);
    const lines = [
      `THE LOGBOOK: ${run.heroes.map((h) => h.name).join(' and ')}`,
      run.won ? 'Reached the Heart.' : `Ended at stop ${stopNo(run)}.`,
      '',
    ];
    path.forEach((p, k) =>
      lines.push(
        `Stop ${k + 1}: ${p.title}${p.h ? ` (${p.h.won ? 'won' : 'lost'} in ${p.h.rounds})` : ''}${p.h && p.h.notes && p.h.notes.length ? `: "${p.h.notes[p.h.notes.length - 1].text}"` : ''}`,
      ),
    );
    lines.push('', `${run.stats.rounds} rounds · ${run.stats.kills} foes destroyed`);
    return lines.join('\n');
  };
  function renderStats(run, path) {
    const dealt = run.heroes.reduce((s, h) => s + ((h.stats && h.stats.dmgDealt) || 0), 0);
    const max = Math.max(
      1,
      ...run.heroes.map((h) => Math.max((h.stats && h.stats.dmgDealt) || 0, (h.stats && h.stats.dmgTaken) || 0)),
    );
    const won = run.history.filter((x) => x.won).length;
    const big = [
      [`${path.length}/${run.map ? run.map.rows.length : path.length}`, 'stops', 'ok'],
      [run.stats.rounds, 'rounds', 'cy'],
      [run.stats.kills, 'foes destroyed', 'red'],
      [`${won}/${run.history.length}`, 'missions won', 'gold'],
    ];
    const kept = U.keptNow || [];
    return `<div class="am am-stats">${topbar(null)}${endTabs('stats')}
      <div class="am-head"><span class="am-eye">${esc(T.threatTitle(run))} · the numbers</span><h1 class="am-h">How it went</h1></div>
      <div class="am-grid">
        <div class="am-col"><div class="am-bignums">${big.map(([n, l, c]) => `<div class="panel am-bn"><b class="${c}">${n}</b><span>${l}</span></div>`).join('')}</div>
          <div class="panel am-col"><div class="am-lab">Each pilot · ${dealt} damage dealt in all</div>${run.heroes
            .map((h) => {
              const s = h.stats || { dmgDealt: 0, dmgTaken: 0, kills: 0 };
              return `<div class="am-ps"><div class="row">${U.portrait(h, 'am-pf-xs')}<b>${esc(h.name)}</b><span class="right small dim">${s.kills} foe${s.kills === 1 ? '' : 's'} down</span></div><div class="am-barrow"><span>dealt</span><i class="am-b dealt" style="width:${(100 * s.dmgDealt) / max}%"></i><b>${s.dmgDealt}</b></div><div class="am-barrow"><span>took</span><i class="am-b took" style="width:${(100 * s.dmgTaken) / max}%"></i><b>${s.dmgTaken}</b></div></div>`;
            })
            .join('')}</div></div>
        <div class="panel am-col"><div class="am-lab gold">${kept.length ? 'Came home' : 'Kits at the end'}</div>${kept.length ? `<div class="am-carry"><span class="am-ci">★</span><span>${kept.map((x) => `<b>${esc(x.name)}</b> at level ${x.level}${x.level > x.was ? ` (was ${x.was})` : ''}`).join(' · ')}</span></div>` : ''}${run.heroes
          .map(
            (h) =>
              `<div class="am-kitend"><div class="row">${U.portrait(h, 'am-pf-xs')}<b>${esc(h.name.split(' ')[0])}</b><span class="right small dim">${h.cards.length} traits</span></div><div class="am-minirow">${h.cards
                .slice()
                .sort((a, b) => T.heroP(h, b) + T.heroE(h, b) - (T.heroP(h, a) + T.heroE(h, a)))
                .slice(0, 4)
                .map((cid) => tile(cid, { P: T.heroP(h, cid), E: T.heroE(h, cid), clades: h.species, cls: 'sm' }))
                .join('')}</div></div>`,
          )
          .join('')}</div>
      </div><div class="am-foot">${endButtons(run.won)}</div></div>`;
  }
  U.renderSummary = function () {
    const run = U.run;
    const path = pathOf(run);
    const view = am.end || 'end';
    if (view === 'log') return renderLog(run, path);
    if (view === 'stats') return renderStats(run, path);
    return run.won ? renderHeart(run, path) : renderFallen(run, path);
  };

  /* ───────────── this file's own clicks ───────────── */
  document.addEventListener(
    'click',
    (e) => {
      const t = e.target.closest && e.target.closest('[data-act]');
      if (!t || t.disabled) return;
      const act = t.getAttribute('data-act');
      const arg = t.getAttribute('data-arg') || '';
      switch (act) {
        case 'amRwHero':
          am.rwHero = parseInt(arg, 10);
          U.render();
          return;
        case 'amRwCard': {
          const [i, cid] = arg.split('|');
          am.rwCard[i] = cid;
          U.sfx.click();
          U.render();
          return;
        }
        case 'amDrop':
          am.drop = arg;
          U.sfx.click();
          U.render();
          return;
        case 'amUpCard': {
          const [i, cid] = arg.split('|');
          am.up = { hero: parseInt(i, 10), card: cid, face: am.up && am.up.face ? am.up.face : 'E' };
          U.openTrain(parseInt(i, 10));
          return;
        }
        case 'amUpFace':
          if (am.up) am.up.face = arg;
          U.openTrain(am.up.hero);
          return;
        case 'amEnd':
          am.end = arg;
          U.render();
          if (typeof document !== 'undefined' && document.getElementById('app'))
            document.getElementById('app').scrollTop = 0;
          return;
        case 'amScroll': {
          const el = document.getElementById(arg);
          if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        case 'amPrint':
          if (window.print) window.print();
          return;
        case 'amCopyLog': {
          const txt = U.logbookText(U.run);
          const done = () => U.toast('The logbook is on your clipboard.');
          try {
            if (navigator.clipboard && navigator.clipboard.writeText)
              navigator.clipboard
                .writeText(txt)
                .then(done, () => U.toast('Could not copy here: select the page and copy it instead.'));
            else U.toast('Could not copy here: select the page and copy it instead.');
          } catch (err) {
            U.toast('Could not copy here: select the page and copy it instead.');
          }
          return;
        }
        // the commands core.js carries out: remember what they mean for the views here
        case 'takeCard': {
          const [cid, i] = arg.split('|');
          am.taken = am.taken || {};
          am.taken[i] = cid;
          return;
        }
        case 'swapDrop': {
          const [cid, i] = arg.split('|');
          am.taken = am.taken || {};
          am.taken[i] = cid;
          am.drop = null;
          return;
        }
        case 'swapPick':
          am.drop = null;
          return;
        case 'upRun':
          if (arg.endsWith('|1') && am.up) am.flash = { card: am.up.card, at: Date.now() };
          return;
        case 'rewardDone':
        case 'missionDone':
          am.rwHero = null;
          am.rwCard = {};
          am.taken = null;
          am.drop = null;
          return;
        case 'newRun':
        case 'continueRun':
          am.end = 'end';
          am.up = null;
          return;
      }
    },
    true,
  );
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
