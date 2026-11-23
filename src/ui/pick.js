/* ============================================================================
   TUMULT — CHOOSE YOUR PILOT, the Spotlight (browser only)
   The draft's first step (U.draft.step 'mode'), as picked on Frogma - Tumult,
   page "Choose your pilot (Nov 22)", board 2: the pilot in the spotlight fills
   the screen in their own painting, and a strip along the foot picks another:
   Draft your own first, then the ready pilots, then the crew players made.
   Tapping a tile only moves the spotlight (act spotPilot); Fly takes the pilot
   (act prebuilt), Draft your own opens the draft (act draftMode).
   Under 760px it folds to the phone layout: painting on top, the strip as a
   rail, Fly under the thumb.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) => U.esc(s);
  const EL = T.ETHERIONS;

  const RULES =
    'Every pilot is Human plus two bloodlines. They set out with six trait cards and six Upgrade Points, and grow to nine cards over the expedition, never more than three from one bloodline.';
  const svg = (d, s) =>
    `<svg width="${s || 16}" height="${s || 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    chev: '<path d="M9 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.1"/>',
    star: '<path d="M12 3l2.6 5.6 6 .6-4.5 4.1 1.3 6L12 16.3 6.6 19.3l1.3-6L3.4 9.2l6-.6z" fill="currentColor"/>',
  };
  const elOf = (cid) => (T.CARD[cid].E && T.CARD[cid].E.elt) || T.CARD[cid].el;

  /** Every pilot this seat may fly: the ready ones, then the ones players made. [{ pb, who, mine, crew }] */
  function choices(run) {
    const free = (pb) => !run.heroes.some((h) => h && h.name === pb.name);
    const ready = T.PREBUILTS.filter(free).map((pb) => ({ pb, crew: false }));
    const made = (U.madeHeroes ? U.madeHeroes() : [])
      .filter((x) => free(x.rec))
      .map((x) => ({ pb: x.rec, who: x.who, mine: x.mine, crew: true }));
    return ready.concat(made);
  }
  /** A candidate's painting: its pilot, scene and portrait (null where none fits). */
  function artOf(pb) {
    const a = U.pilotOf({ id: pb.id, name: pb.name, species: pb.species });
    return { a, scene: U.sceneSrc(a), face: U.portraitSrc(a) };
  }
  /** What a made pilot is like when it has no role of its own: its signature traits. */
  function lineOf(pb) {
    if (pb.line) return pb.line;
    const sig = pb.cards.filter((c) => T.CARD[c] && T.CARD[c].sig >= 2);
    return (sig.length ? sig : pb.cards.slice(0, 3)).map((c) => T.CARD[c].name).join(' · ');
  }
  function levelOf(pb) {
    if (!pb.runs) return 1;
    return T.pilotLevel({ up: pb.up || {}, bound: pb.bound || {}, cards: pb.cards, upUnspent: pb.spare || 0 });
  }

  function tile(c, on) {
    const { scene } = artOf(c.pb);
    const bg = scene ? ` style="background-image:url(${scene})"` : '';
    return `<button class="pk-tile${on ? ' on' : ''}" data-act="spotPilot" data-arg="${esc(c.pb.id)}" aria-pressed="${on}"><span class="pk-tile-art"${bg}></span><span class="pk-shine"></span><span class="pk-tile-name">${esc(c.pb.name)}</span>${c.crew ? `<span class="pk-sr">Made by ${esc(c.who)}</span>` : ''}</button>`;
  }

  function kit(pb) {
    return `<ul class="pk-kit">${pb.cards
      .map((cid) => {
        const c = T.CARD[cid];
        const e = EL[elOf(cid)];
        const sig =
          c.sig >= 2
            ? `<span class="pk-sig" data-tip="A signature trait of its bloodline">${svg(IC.star, 11)}</span>`
            : '';
        return `<li data-tip="${esc(e.name)}"><i style="--c:${e.color}"></i>${esc(c.name)}${sig}</li>`;
      })
      .join('')}</ul>`;
  }

  /** The draft's first screen. */
  U.renderPick = function (d, run) {
    const all = choices(run);
    const c = all.find((x) => x.pb.id === d.spot) || all[0];
    const n = d.heroIdx + 1;
    const of = U.squadOf ? U.squadOf(run) : 1;
    const seat = U.seatTag ? U.seatTag(d.heroIdx) : '';
    const out = U.draftOut ? U.draftOut(d) : '';
    const sound = `<button class="pk-ni" data-act="toggleSound" aria-label="Sound">${U.sound ? '🔊' : '🔇'}</button>`;
    const bar = `<div class="pk-bar"><span class="pk-logo">TUMULT</span><span class="pk-where">THE DRAFT</span><span class="pk-flow"><i class="on">PILOT</i><i>BLOODLINES</i><i>PACKS</i><i>UPGRADE</i></span><span class="pk-nav">${sound}<button class="pk-ni" data-act="help">Help</button><button class="pk-ni" data-act="atlas">Atlas</button><button class="pk-ni" data-act="codex">Codex</button><button class="pk-ni" data-act="look">Look</button></span><span class="pk-out">${out}</span></div>`;
    const info = `<button class="pk-info" data-tip="${esc(RULES)}">${svg(IC.info, 15)}<span>How pilots work</span></button>`;
    let hero = '';
    let scene = '';
    if (c) {
      const pb = c.pb;
      const art = artOf(pb);
      if (art.scene)
        scene = `<div class="pk-scene" style="background-image:url(${art.scene})" aria-hidden="true"></div>`;
      const face = art.face
        ? `<img class="pk-face" src="${art.face}" alt="" draggable="false">`
        : `<span class="pk-face none">${pb.species
            .slice(1)
            .map((s) => U.icClade(s))
            .join('')}</span>`;
      const tag = c.crew
        ? `<span class="pk-role">Crew</span><span class="pk-by">Made by ${esc(c.who)}${pb.runs ? ` · Level ${levelOf(pb)} · ${pb.runs} expedition${pb.runs > 1 ? 's' : ''}` : ''}</span>`
        : `<span class="pk-role">${esc(pb.role || 'Ready pilot')}</span>`;
      const clades = pb.species
        .slice(1)
        .map((s) => `<span class="pk-clade">${U.icClade(s, 'pk-cl')}${esc(T.SPECIES[s].name)}</span>`)
        .join('');
      const forget = c.mine
        ? `<button class="pk-forget" data-act="forgetMade" data-arg="${esc(pb.id)}" data-tip="Take ${esc(pb.name)} off this device's list.">Remove</button>`
        : '';
      hero = `<section class="pk-hero" aria-live="polite">
        <div class="pk-eyebrow"><span>Pilot ${n} of ${of}</span>${seat ? `<span class="pk-seat">${seat}</span>` : ''}</div>
        <div class="pk-tags">${tag}</div>
        <div class="pk-id">${face}<div><h1 class="pk-name">${esc(pb.name)}</h1>${pb.title ? `<div class="pk-title">${esc(pb.title)}</div>` : ''}</div></div>
        <div class="pk-clades">${clades}</div>
        <p class="pk-line">${esc(lineOf(pb))}</p>
        <div class="pk-kitbox"><span class="pk-lab">Kit · ${pb.cards.length} cards</span>${kit(pb)}</div>
        <div class="pk-acts"><button class="pk-cta" data-act="prebuilt" data-arg="${esc(pb.id)}"><span>Fly ${esc(pb.name)}</span>${svg(IC.chev, 18)}</button>${info}${forget}</div>
      </section>`;
    } else {
      hero = `<section class="pk-hero"><div class="pk-eyebrow"><span>Pilot ${n} of ${of}</span></div><h1 class="pk-name">Draft your own</h1><p class="pk-line">Pick two bloodlines, then one card from each of six packs.</p><div class="pk-acts"><button class="pk-cta" data-act="draftMode" data-arg="draft"><span>Start the draft</span>${svg(IC.chev, 18)}</button>${info}</div></section>`;
    }
    const ready = all.filter((x) => !x.crew);
    const crew = all.filter((x) => x.crew);
    const grp = (lab, list) =>
      list.length
        ? `<div class="pk-grp"><span class="pk-lab">${lab}</span><div class="pk-tiles">${list.map((x) => tile(x, c && x.pb.id === c.pb.id)).join('')}</div></div>`
        : '';
    const strip = `<nav class="pk-strip" aria-label="Pilots">
      <div class="pk-grp"><span class="pk-lab">Build</span><button class="pk-draft" data-act="draftMode" data-arg="draft" data-tip="Recommended. Pick two bloodlines, then one card from each of six packs.">${svg(IC.plus, 24)}<span>Draft your own</span></button></div>
      ${grp('Ready pilots', ready)}${grp(`Crew · ${crew.length}`, crew)}
      <span class="pk-out">${out}</span></nav>`;
    return `<div class="pick${c ? '' : ' no-pilot'}">${scene}<div class="pk-veil" aria-hidden="true"></div><div class="pk-motes" aria-hidden="true">${'<i></i>'.repeat(10)}</div>${bar}${hero}${strip}</div>`;
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
