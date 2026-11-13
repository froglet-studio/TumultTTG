/* ============================================================================
   TUMULT — PILOT ART (browser only)
   Art belongs to a clade pair, not to a hero. A pilot is human plus two clades;
   a painting shows one pair, head clade first. A hero is shown with the painting
   of their own pair when one exists, else the nearest stand-in (one that shares
   their clades, the head clade first), else their clades' marks on a disc.
   Tumult and Cosmic Shore share this art: as either game paints a new pair it
   slots in here, and every pair is meant to be supported in the end
   (Garrett, 2026-11-13). The paintings are inlined from assets/ (assets/README.md).
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});

  // Every painting we have, by the Cosmic Shore callsign it was made for. `clades` is the pair, head first;
  // a clade Tumult also has uses Tumult's id (T.SPECIES), so the two games match on the same word.
  U.PILOT_ART = [
    { key: 'BANDIT', name: 'Rosh Rusthook', clades: ['octopus', 'raven'] },
    { key: 'FLUME', name: 'Ekora Hollowbrook', clades: ['otter', 'eel'] },
    { key: 'VOLT', name: 'Karenth Amberweaver', clades: ['axolotl', 'koi'] },
    { key: 'SUNDIAL', name: 'Delmira Stillwater', clades: ['owl', 'pangolin'] },
    { key: 'ECHO', name: 'Echo', clades: ['mouse', 'owl'] },
    { key: 'REAPER', name: 'Reaper', clades: ['gecko', 'mantis'] },
    { key: 'HORNET', name: 'Zeko Mirethorn', clades: ['mantis', 'newt'] },
    { key: 'CITADEL', name: 'Nedira Shellward', clades: ['hedgehog', 'tortoise'] },
    { key: 'ANVIL', name: 'Brikon Copperwright', clades: ['yak', 'beetle'] },
    { key: 'DOE', name: 'Fenlia Moonbell', clades: ['moose', 'fennec'] },
    { key: 'ENSIGN', name: 'Veliane Crestward', clades: ['crane', 'lemur'] },
    { key: 'GALLEON', name: 'Haradek Anchorkeel', clades: ['walrus', 'bison'] },
    { key: 'IVY', name: 'Mathalo Kelpbloom', clades: ['orangutan', 'sloth'] },
    { key: 'MANGER', name: 'Tamako Deephook', clades: ['ibis', 'platypus'] },
    { key: 'NEEDLE', name: 'Ilia Silvergate', clades: ['narwhal', 'seahorse'] },
    { key: 'OPAL', name: 'Quivera Pearlspark', clades: ['chameleon', 'jellyfish'] },
    { key: 'RAMPART', name: 'Obelo Stormstone', clades: ['badger', 'armadillo'] },
    { key: 'TALON', name: 'Wyvendo Waveline', clades: ['lynx', 'jackal'] },
    { key: 'WINGMAN', name: 'Jorin Gullwing', clades: ['puffin', 'pelican'] },
    { key: 'ZODIAC', name: 'Ivelia Starreach', clades: ['ocelot', 'heron'] },
  ];
  U.ART_BY = {};
  U.PILOT_ART.forEach((a) => (U.ART_BY[a.key] = a));

  const art = (k) => (T.ART && T.ART[k]) || null;
  const cladesOf = (h) => (h.species || []).filter((s) => s !== 'human');
  /** How well a painting fits a pair: both clades beat one, the head clade beats the second; 0 = no fit. */
  U.artFit = function (a, pair) {
    const shared = a.clades.filter((c) => pair.includes(c)).length;
    if (!shared) return 0;
    return shared * 4 + (pair.includes(a.clades[0]) ? 2 : 0) + (a.clades[0] === pair[0] ? 1 : 0);
  };
  /** The best painting for a pair that is not in `taken`, or null. Exact pairs win; ties go to catalog order. */
  U.artForPair = function (pair, taken) {
    let best = null,
      bestFit = 0;
    for (const a of U.PILOT_ART) {
      if (taken && taken.has(a.key)) continue;
      const f = U.artFit(a, pair);
      if (f > bestFit) ((best = a), (bestFit = f));
    }
    return best;
  };
  /**
   * The painting a hero is shown with. Within a squad no two heroes share a face: heroes take theirs in
   * squad order, and a hero not yet in the squad (one being drafted) takes what the squad has left.
   */
  U.pilotOf = function (h) {
    if (!h) return null;
    const squad = (U.run && U.run.heroes) || [];
    const taken = new Set();
    for (const s of squad) {
      const a = U.artForPair(cladesOf(s), taken);
      if (s === h || s.id === h.id) return a;
      if (a) taken.add(a.key);
    }
    return U.artForPair(cladesOf(h), taken);
  };
  /** True when the painting is of exactly this hero's pair, false for a stand-in. */
  U.isExact = (a, h) => !!a && cladesOf(h).every((c) => a.clades.includes(c));
  U.portraitSrc = (a) => (a ? art('pilot/' + a.key) : null);
  U.sceneSrc = (a) => (a ? art('scene/' + a.key) : null);
  /** A round portrait; with no painting, the hero's clade marks on a disc. */
  U.portrait = function (h, cls) {
    const a = U.pilotOf(h);
    const src = U.portraitSrc(a);
    if (src) {
      const tip = U.isExact(a, h) ? '' : ` data-tip="Stand-in portrait: ${a.name}, ${a.clades.join(' and ')}"`;
      return `<span class="pfp ${cls || ''}"${tip}><img src="${src}" alt="" draggable="false"></span>`;
    }
    const marks = cladesOf(h)
      .map((s) => (T.SPECIES[s] ? T.SPECIES[s].icon : ''))
      .join('');
    return `<span class="pfp ${cls || ''} none">${marks || '?'}</span>`;
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
