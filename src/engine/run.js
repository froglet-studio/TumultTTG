/* ============================================================================
   TUMULT v2.0 — RUN LAYER (pure; no DOM)
   Draft → Tide Map → missions / havens / events → finale → summary.
   Progression: Upgrade Points (P/E tracks), new traits (3-of-9 cap),
   omnicrystals (gear + fuel), boons. Save/load of a run between nodes.
   ========================================================================== */
(function (T) {
  const R = () => T.RULES;

  /* ───────────────────────────── NEW RUN ───────────────────────────── */
  T.newRun = function (seed) {
    seed = seed == null ? Date.now() & 0x7fffffff : seed;
    return {
      v: T.SAVE_VERSION,
      seed,
      rngs: {}, // one number per random stream, made the first time it is asked for (T.runStream)
      launched: 0,
      heroes: [],
      crystals: 6, // the squad's starting crystals; they become the players' purses when the route opens (T.settlePurses)
      boons: [],
      map: null,
      nodeId: null,
      available: [],
      phase: 'draft',
      mission: null,
      history: [],
      bossBonusHp: 0,
      nextElite: false,
      skipNext: false,
      secondWindUsed: false,
      seenEvents: [],
      stats: { missions: 0, kills: 0, rounds: 0, lifelineUsed: false },
      lifeline: 1,
      tide: 'rising', // difficulty: a key of T.TIDES
      length: 'full', // how long the expedition is: a key of T.LENGTHS, set before the route opens
      party: T.newParty(1), // who plays which hero (src/engine/party.js)
      won: false,
      over: false,
      lastReward: null,
      haven: null,
      event: null,
      story: T.newStory(), // the run's chronicle (src/engine/story.js)
    };
  };

  /* ───────────────────────────── DRAFT ───────────────────────────── */
  // A hero = Human + two species. Six picks from packs of four drawn across the three pools.
  /**
   * A run draws from several random streams, each seeded from the run's seed and its own name, so
   * that what one draws never moves another: 'squad' (drafts, hero ids), 'map', 'loot' (card, boon
   * and haven offers), 'event', and for tools 'player' (a simulated player's choices). Each mission
   * has its own seed again (T.missionSeed). The streams are numbers in run.rngs: a run is plain data.
   */
  T.runStream = function (run, name) {
    if (run.rngs[name] == null) run.rngs[name] = T.subSeed(run.seed, name);
    return T.stream(run.rngs, name);
  };
  /**
   * The seed of the mission about to be launched. On the Tide Map it belongs to the node, not to
   * the road taken there or the squad that walks it; off the map, to the order of launching.
   */
  T.missionSeed = function (run, type, tier, nodeId = run.nodeId) {
    const where = nodeId != null ? 'n' + nodeId : '#' + run.launched;
    return T.subSeed(run.seed, `mission:${where}:${type}:${tier}`);
  };
  T.newDraftHero = function (run, name, title, species) {
    const h = T.makeHero({
      id: name.toLowerCase().replace(/\W+/g, '_') + '_' + T.runStream(run, 'squad').int(9999),
      name,
      title,
      species: ['human'].concat(species),
      cards: [],
    });
    h.upUnspent = R().START_UP;
    return h;
  };
  /**
   * Which of a hero's clades each held trait counts toward, so that no clade holds more than
   * MAX_PER_SPECIES: a trait two of the hero's clades carry counts toward either. Null when no way fits.
   */
  T.cladeSlots = function (h, cards) {
    const cap = R().MAX_PER_SPECIES;
    const load = {};
    const slot = {};
    const ids = cards.slice().sort((a, b) => T.CARD[a].clades.length - T.CARD[b].clades.length);
    const place = (i) => {
      if (i === ids.length) return true;
      for (const sp of T.CARD[ids[i]].clades) {
        if (!h.species.includes(sp) || (load[sp] || 0) >= cap) continue;
        load[sp] = (load[sp] || 0) + 1;
        slot[ids[i]] = sp;
        if (place(i + 1)) return true;
        load[sp]--;
      }
      return false;
    };
    return place(0) ? slot : null;
  };
  /** How many of a hero's traits count toward one clade. */
  T.cladeCount = (h, sp) => Object.values(T.cladeSlots(h, h.cards) || {}).filter((s) => s === sp).length;
  /**
   * Can this hero take this trait? A trait it already holds is not offered again (2.77; Garrett, 2026-11-20:
   * "lets no longer have them gain extra points for drawing the card again. they just have a smaller pool").
   * From 2.42 to 2.76 a trait two of a hero's clades shared could be taken twice, the second time as
   * DOUBLE_UP points bound to it; saves and made pilots that hold such points keep them (h.bound).
   */
  T.canAddCard = function (h, cardId) {
    const c = T.CARD[cardId];
    if (!c) return { ok: false, why: 'unknown' };
    const mine = c.clades.filter((sp) => h.species.includes(sp));
    if (!mine.length) return { ok: false, why: 'not your bloodline' };
    if (h.cards.includes(cardId)) return { ok: false, why: 'already held' };
    if (h.cards.length >= R().MAX_CARDS) return { ok: false, why: 'kit is full (9)' };
    if (!T.cladeSlots(h, h.cards.concat(cardId)))
      return { ok: false, why: `already 3 of 9 from ${mine.map((sp) => T.SPECIES[sp].name).join(' and ')}` };
    return { ok: true };
  };
  T.addCard = function (h, cardId) {
    const r = T.canAddCard(h, cardId);
    if (!r.ok) return r;
    h.cards.push(cardId);
    h.up[cardId] = [0, 0];
    return { ok: true };
  };
  /**
   * A trait taken twice carries h.bound[id] = [n, spent]: n points that only it may use, of which `spent`
   * are on it now. The rest of the points on it came from (and go back to) the free pool.
   */
  const boundOf = (h, cardId) => (h.bound && h.bound[cardId]) || null;
  const freeSpent = (h, cardId) => {
    const u = h.up[cardId] || [0, 0];
    const b = boundOf(h, cardId);
    return u[0] + u[1] - (b ? b[1] : 0);
  };
  /** Upgrade points bound to this card and not yet spent on it. */
  T.boundLeft = (h, cardId) => {
    const b = boundOf(h, cardId);
    return b ? b[0] - b[1] : 0;
  };
  /**
   * A trait leaves the kit (an exchange, a molt or a trade): every upgrade point on it comes back to spend
   * again, and so do the points a second copy bound to it, spent or not (Garrett, 2026-11-20: "when players
   * lose a card they should get their points refunded"). With the card gone, they are free points.
   */
  T.removeCard = function (h, cardId) {
    const b = boundOf(h, cardId);
    h.upUnspent += freeSpent(h, cardId) + (b ? b[0] : 0);
    h.cards = h.cards.filter((c) => c !== cardId);
    delete h.up[cardId];
    if (h.bound) delete h.bound[cardId];
  };
  /**
   * A pilot whose kit is full (MAX_CARDS) grows by exchange: a new trait comes in and an old one goes out,
   * so the kit stays at nine (Garrett, 2026-11-20). The new card must be of the pilot's bloodline, not held,
   * and fit the 3-of-9 cap once the old card has gone.
   */
  T.canSwapCard = function (h, cardId, dropId) {
    const c = T.CARD[cardId];
    if (!c || !T.CARD[dropId]) return { ok: false, why: 'unknown' };
    if (h.cards.length < R().MAX_CARDS) return { ok: false, why: 'the kit has room: take the trait instead' };
    if (!h.cards.includes(dropId)) return { ok: false, why: 'not held' };
    if (h.cards.includes(cardId)) return { ok: false, why: 'already held' };
    if (!c.clades.some((sp) => h.species.includes(sp))) return { ok: false, why: 'not your bloodline' };
    if (!T.cladeSlots(h, h.cards.filter((x) => x !== dropId).concat(cardId)))
      return { ok: false, why: 'that would break the 3-of-9 cap' };
    return { ok: true };
  };
  /** The held traits a full kit could give up for this one. */
  T.swapDrops = (h, cardId) => h.cards.filter((d) => T.canSwapCard(h, cardId, d).ok);
  /**
   * Exchange: the old trait leaves and the new one takes its place in the kit, unupgraded. The points
   * on the old one, bound ones included, come back to the free pool (`T.removeCard`).
   */
  T.swapCard = function (h, cardId, dropId) {
    const r = T.canSwapCard(h, cardId, dropId);
    if (!r.ok) return r;
    const at = h.cards.indexOf(dropId);
    T.removeCard(h, dropId);
    h.cards.splice(at, 0, cardId);
    h.up[cardId] = [0, 0];
    return { ok: true, swapped: dropId };
  };
  T.draftPack = function (run, h, size) {
    size = size || 4;
    // pool: every card of the hero's clades they could still take, none they hold; weighted so each
    // clade shows up
    const pool = T.CARDS.filter((c) => T.canAddCard(h, c.id).ok);
    const bySp = {};
    pool.forEach((c) => {
      const sp = c.clades.find((x) => h.species.includes(x));
      (bySp[sp] = bySp[sp] || []).push(c);
    });
    const rng = T.runStream(run, 'squad');
    const sps = rng.shuffle(Object.keys(bySp));
    const pack = [];
    let i = 0;
    while (pack.length < size && pool.length) {
      const sp = sps[i % sps.length];
      i++;
      const arr = bySp[sp];
      if (!arr || !arr.length) {
        if (i > 20) break;
        continue;
      }
      const c = arr.splice(rng.int(arr.length), 1)[0];
      pack.push(c.id);
      const j = pool.indexOf(c);
      if (j >= 0) pool.splice(j, 1);
    }
    return pack;
  };
  T.heroFromPrebuilt = function (run, pb) {
    const h = T.makeHero({
      id: pb.id + '_' + T.runStream(run, 'squad').int(9999),
      name: pb.name,
      title: pb.title,
      species: pb.species,
      cards: pb.cards,
      up: pb.up,
    });
    // a trait taken twice brings its own points: those on it now are not from the free pool
    if (pb.bound) Object.keys(pb.bound).forEach((c) => (h.bound[c] = pb.bound[c].slice()));
    const onBound = Object.values(h.bound).reduce((s, b) => s + b[1], 0);
    const spent = Object.values(h.up).reduce((s, v) => s + v[0] + v[1], 0) - onBound;
    // a pilot back from earlier expeditions keeps the points it had not spent; a new one has what is left of six
    h.upUnspent = typeof pb.spare === 'number' ? pb.spare : Math.max(0, R().START_UP - spent);
    // a pilot players made remembers which recipe it is, so what it learns can be kept (T.progressRecord)
    if (/^made_/.test(pb.id)) h.madeId = pb.id;
    if (pb.runs) h.runs = pb.runs; // the expeditions it has flown
    // its level is set as it sets out, and the missions of this expedition answer it (T.squadLevel)
    const lvl = T.pilotLevel(h);
    if (lvl > 1) h.level = lvl;
    return h;
  };

  /* ───────────────────────────── LEVELS: growth kept between expeditions ───────────────────────────── */
  /**
   * How far a pilot has grown past a new one, in upgrade points: every point it holds (spent, spare, or bound
   * to a card) past the six it started with, and CARD_UP for every trait past its first six.
   */
  T.pilotPower = function (h) {
    const S = T.SCALING;
    const onCards = Object.values(h.up || {}).reduce((s, v) => s + v[0] + v[1], 0);
    const bound = Object.values(h.bound || {}).reduce((s, b) => s + b[0] - b[1], 0); // bound but not yet spent
    const pts = onCards + bound + (h.upUnspent || 0) - R().START_UP;
    return Math.max(0, pts + S.CARD_UP * Math.max(0, h.cards.length - R().START_CARDS));
  };
  /** A pilot's level: 1 for a new pilot, and one more for every LEVEL_UP points of growth (about a tier of a run). */
  T.pilotLevel = (h) => 1 + Math.floor(T.pilotPower(h) / T.SCALING.LEVEL_UP);
  /**
   * What a made pilot takes home when its expedition ends, won or lost: its traits, the points on them and
   * those it had not spent, under the same recipe, one more expedition flown. Gear, boons and crystals stay
   * with the expedition. `prev` is the recipe it set out as.
   */
  T.progressRecord = function (h, prev, at) {
    const r = T.madeFrom(h, at || (prev && prev.at) || '');
    if (prev) r.id = prev.id;
    r.runs = ((prev && prev.runs) || 0) + 1;
    return r;
  };

  /* ───────────────────────────── HEROES PLAYERS MADE ───────────────────────────── */
  // Every pilot a player builds in the draft is kept as a recipe of the same shape as a pre-made
  // hero (T.PREBUILTS), so it can be chosen again from the same list. Kept on this device under
  // `tumult_v2_heroes`; the test page also shares them through its store (src/ui/heroes-net.js).
  const MADE_KEY = 'tumult_v2_heroes';
  T.MADE_MAX = 60;
  const hash = (str) => {
    let x = 5381;
    for (let i = 0; i < str.length; i++) x = ((x * 33) ^ str.charCodeAt(i)) >>> 0;
    return x.toString(36);
  };
  /** The recipe of a hero a player built: its name, clades, cards and the points on them. */
  T.madeFrom = function (h, at) {
    const up = {};
    h.cards.forEach((c) => (up[c] = (h.up[c] || [0, 0]).slice(0, 2)));
    const bound = {};
    Object.keys(h.bound || {}).forEach((c) => (bound[c] = h.bound[c].slice(0, 2)));
    const key = [h.name, h.species.join('+'), h.cards.slice().sort().join('+')].join('|');
    return {
      id: h.madeId || 'made_' + hash(key),
      name: h.name,
      title: h.title || '',
      species: h.species.slice(),
      cards: h.cards.slice(),
      up,
      bound,
      spare: h.upUnspent || 0,
      at: at || '',
      runs: h.runs || 0,
    };
  };
  const isInt = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;
  /**
   * A made hero's recipe as the rules allow it, or null. Recipes shared by other players are
   * untrusted, so each is rebuilt from known parts: real clades and cards, the 3-of-9 cap, the caps on
   * P and E, and no more points than a new hero has.
   */
  T.validMade = function (rec) {
    if (!rec || typeof rec !== 'object') return null;
    const name = typeof rec.name === 'string' ? rec.name.trim().slice(0, 24) : '';
    const id = typeof rec.id === 'string' && /^made_[a-z0-9]{1,12}$/.test(rec.id) ? rec.id : '';
    if (!name || !id) return null;
    const sp = rec.species;
    if (!Array.isArray(sp) || sp.length !== 3 || sp[0] !== 'human') return null;
    if (!sp.every((s) => typeof s === 'string' && T.SPECIES[s]) || new Set(sp).size !== 3) return null;
    const cards = rec.cards;
    if (!Array.isArray(cards) || cards.length < R().START_CARDS || cards.length > R().MAX_CARDS) return null;
    const probe = T.makeHero({ id, name, species: sp, cards: [] });
    for (const c of cards) {
      if (typeof c !== 'string' || !T.CARD[c] || probe.cards.includes(c)) return null;
      if (!T.canAddCard(probe, c).ok) return null;
      probe.cards.push(c);
    }
    const up = {};
    let spent = 0;
    for (const c of cards) {
      const u = (rec.up && rec.up[c]) || [0, 0];
      if (!Array.isArray(u) || !isInt(u[0], 0, R().P_CAP) || !isInt(u[1], 0, R().E_CAP)) return null;
      up[c] = [u[0], u[1]];
      spent += u[0] + u[1];
    }
    const bound = {};
    for (const c of Object.keys(rec.bound || {})) {
      const b = rec.bound[c];
      const shared = T.CARD[c] && T.CARD[c].clades.filter((s) => sp.includes(s)).length >= 2;
      if (!cards.includes(c) || !shared || !Array.isArray(b) || b[0] !== R().DOUBLE_UP) return null;
      if (!isInt(b[1], 0, b[0]) || b[1] > up[c][0] + up[c][1]) return null;
      bound[c] = [b[0], b[1]];
      spent -= b[1];
    }
    // a pilot back from expeditions may hold more than a new one's six points, never more than its kit can carry
    const spare = rec.spare == null ? null : rec.spare;
    if (spare != null && !isInt(spare, 0, (R().P_CAP + R().E_CAP) * R().MAX_CARDS)) return null;
    const runs = rec.runs == null ? 0 : rec.runs;
    if (!isInt(runs, 0, 9999)) return null;
    if (!runs && spent + (spare || 0) > R().START_UP) return null; // a new pilot has six points, no more
    const out = {
      id,
      name,
      title: typeof rec.title === 'string' ? rec.title.slice(0, 40) : '',
      species: sp.slice(),
      cards: cards.slice(),
      up,
      bound,
      at: typeof rec.at === 'string' ? rec.at.slice(0, 30) : '',
    };
    if (spare != null) out.spare = spare;
    if (runs) out.runs = runs;
    return out;
  };
  /** The heroes made on this device, newest first (none when storage is unavailable). */
  T.loadMade = function () {
    try {
      const list = JSON.parse(localStorage.getItem(MADE_KEY) || '[]');
      return Array.isArray(list) ? list.map(T.validMade).filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  };
  const saveMade = (list) => {
    try {
      localStorage.setItem(MADE_KEY, JSON.stringify(list.slice(0, T.MADE_MAX)));
      return true;
    } catch (e) {
      return false;
    }
  };
  /** Keep a made hero (one with the same name, clades and cards is replaced). Returns the kept recipe or null. */
  T.keepMade = function (rec) {
    const r = T.validMade(rec);
    if (!r) return null;
    // kept again from the draft, a pilot keeps the expeditions it has flown
    const prev = T.loadMade().find((x) => x.id === r.id);
    if (prev && (prev.runs || 0) > (r.runs || 0)) r.runs = prev.runs;
    return saveMade([r].concat(T.loadMade().filter((x) => x.id !== r.id))) ? r : null;
  };
  T.forgetMade = function (id) {
    return saveMade(T.loadMade().filter((x) => x.id !== id));
  };
  // UP allocation
  T.adjustUp = function (h, cardId, which, delta) {
    const i = which === 'E' ? 1 : 0;
    const cap = which === 'E' ? R().E_CAP : R().P_CAP;
    const cur = h.up[cardId] || [0, 0];
    // a point bound to this card (a trait taken twice) is spent before a free one, and comes back last
    if (delta > 0) {
      if (cur[i] + delta > cap) return { ok: false, why: 'cap' };
      const fromBound = Math.min(delta, T.boundLeft(h, cardId));
      if (h.upUnspent < delta - fromBound) return { ok: false, why: 'no UP' };
      cur[i] += delta;
      h.upUnspent -= delta - fromBound;
      if (fromBound) boundOf(h, cardId)[1] += fromBound;
    } else {
      if (cur[i] + delta < 0) return { ok: false };
      const toFree = Math.min(-delta, freeSpent(h, cardId));
      cur[i] += delta;
      h.upUnspent += toFree;
      if (-delta > toFree) boundOf(h, cardId)[1] -= -delta - toFree;
    }
    h.up[cardId] = cur;
    return { ok: true };
  };
  /** How many of a hero's cards are awakened: E high enough for their Ethereal face to be played. */
  T.awakenedCount = (h) => h.cards.filter((cid) => T.heroE(h, cid) >= R().ETHEREAL_MIN_E).length;
  /**
   * A new hero begins with a few Ethereal faces awakened: if fewer than START_AWAKE cards have
   * E 1, spend unspent UP on E 1 for the strongest signatures first. Never takes back a point.
   */
  T.awaken = function (h) {
    const order = h.cards
      .map((cid, i) => ({ cid, i }))
      .sort((a, b) => T.CARD[b.cid].sig - T.CARD[a.cid].sig || a.i - b.i)
      .map((x) => x.cid);
    for (const cid of order) {
      if (h.upUnspent <= 0 || T.awakenedCount(h) >= R().START_AWAKE) break;
      if (T.heroE(h, cid) === 0) T.adjustUp(h, cid, 'E', 1);
    }
  };
  T.autoAllocate = function (h) {
    // points bound to a card go on that card: E until it is awake, then P and E in turn
    for (const cid of h.cards) {
      let guard = 0;
      while (T.boundLeft(h, cid) > 0 && guard++ < 6) {
        const u = h.up[cid];
        const which = u[1] < 1 || u[1] < u[0] ? 'E' : 'P';
        if (!T.adjustUp(h, cid, which, 1).ok && !T.adjustUp(h, cid, which === 'E' ? 'P' : 'E', 1).ok) break;
      }
    }
    T.awaken(h);
    // spend on signatures first: E for capability cards, P for cheap strikes
    const order = h.cards.slice().sort((a, b) => T.CARD[b].sig - T.CARD[a].sig);
    let guard = 0;
    while (h.upUnspent > 0 && guard++ < 50) {
      for (const cid of order) {
        if (h.upUnspent <= 0) break;
        const c = T.CARD[cid];
        const which =
          (c.sig >= 2 || c.E.fx.some((x) => ['teleport', 'engine', 'strike'].includes(x.v))) &&
          h.up[cid][1] < h.up[cid][0] + 1
            ? 'E'
            : 'P';
        if (!T.adjustUp(h, cid, which, 1).ok) T.adjustUp(h, cid, which === 'E' ? 'P' : 'E', 1);
      }
    }
  };
  T.respecHero = function (h) {
    h.cards.forEach((c) => {
      h.upUnspent += freeSpent(h, c);
      h.up[c] = [0, 0];
      if (boundOf(h, c)) boundOf(h, c)[1] = 0;
    });
  };
  /**
   * Give a squad the kit it would plausibly have by this tier of a real run: six UP a tier,
   * a piece of gear from tier 2, and at tier 3 a second piece, a seventh card and a boon.
   * The balance tables and the playtest build both start their missions from this.
   */
  T.addProgression = function (run, tier) {
    run.heroes.forEach((h) => {
      h.upUnspent += (tier - 1) * 6;
      T.autoAllocate(h);
    });
    if (tier >= 2) {
      const rng = T.runStream(run, 'squad');
      run.heroes.forEach((h) => {
        h.gear.push({ id: T.GEAR[rng.int(T.GEAR.length)].id, cds: [0, 0] });
        if (tier >= 3) {
          h.gear.push({ id: T.GEAR[rng.int(T.GEAR.length)].id, cds: [0, 0] });
          const extra = T.cardOffer(run, 1)[0];
          if (extra) T.addCard(h, extra);
          h.boons.push(T.boonOffer(run, 1)[0]);
          T.autoAllocate(h);
        }
      });
    }
    run.crystals = 10 + tier * 5;
  };

  /**
   * A run that begins inside one chosen mission: two pre-made heroes (indices into T.PREBUILTS)
   * with their starting kit, or with the kit for the mission's tier. tools/mission-log.js and the
   * playtest build both start here, so a seed names the same mission in either. The board does not
   * depend on the squad or the kit: the same seed, mission and tier are always the same board.
   */
  T.quickMission = function ({ seed, heroes = [0, 1], type = 'vault', tier = 1, kit = 'start' } = {}) {
    const run = T.newRun(seed);
    run.heroes = heroes.map((i) => T.heroFromPrebuilt(run, T.PREBUILTS[i]));
    run.heroes.forEach((h) => T.autoAllocate(h));
    if (kit === 'tier') T.addProgression(run, tier);
    else run.crystals = 12;
    // the mission is the first node of a whole Tide, so the run can go on afterwards
    T.startMap(run);
    const node = run.map.all[run.map.rows[0][0]];
    node.type = type;
    node.tier = tier;
    run.nodeId = run.map.current = node.id;
    T.launchMission(run, type, tier);
    run.available = [];
    return run;
  };

  /* ───────────────────────────── MAP ───────────────────────────── */
  T.startMap = function (run) {
    T.settlePurses(run);
    run.map = T.genTideMap(T.runStream(run, 'map'), run.length);
    run.phase = 'map';
    run.available = run.map.rows[0].slice();
    run.nodeId = null;
    T.beginExpedition(run);
    T.writePassage(run, 'start', null);
  };
  /**
   * The leg (act) a row of the route belongs to: its tier, less one. Without the map, the Full route's rows.
   * A row past the end is the last leg.
   */
  T.actOf = (row, map) => {
    if (!map) return row <= 1 ? 0 : row <= 4 ? 1 : 2;
    const ids = map.rows[Math.max(0, Math.min(row, map.rows.length - 1))];
    return map.all[ids[0]].tier - 1;
  };
  /** Set how long the expedition is ('short' or 'full', T.LENGTHS) before its route opens. */
  T.setLength = function (run, length) {
    if (!T.LENGTHS[length] || run.map) return false;
    run.length = length;
    return true;
  };
  /** The mission types an elite may stand in for when the run owes one (T.chooseNode). */
  const ELITE_STANDS_IN = ['swarm', 'vault', 'hidden', 'cascade', 'salvage', 'survey'];
  T.chooseNode = function (run, nodeId) {
    if (!run.available.includes(nodeId)) return { ok: false };
    if (T.squadReady && !T.squadReady(run)) return { ok: false, why: 'a pilot is still being drafted' };
    const node = run.map.all[nodeId];
    run.nodeId = nodeId;
    run.map.current = nodeId;
    let type = node.type;
    if (run.nextElite && ELITE_STANDS_IN.includes(type)) {
      node.type = type = 'elite';
      run.nextElite = false;
    }
    if (type === 'haven') {
      run.phase = 'haven';
      run.haven = T.havenStock(run);
    } else if (type === 'event') {
      run.phase = 'event';
      run.event = { def: T.pickEvent(run), resolved: false, result: null, followup: null };
    } else {
      T.launchMission(run, type, node.tier);
    }
    return { ok: true, type };
  };
  /**
   * The mission a stop holds, as plain data: board, foes, objective, clock, place and title. Nothing in the
   * run changes, so the route can show a stop exactly as it will be played before anyone chooses it
   * (T.previewStop); T.launchMission plays the same spec. `nodeId` is the stop (the run's own by default).
   */
  T.missionSpec = function (run, type, tier, pageId, nodeId = run.nodeId) {
    const gen = T.MISSIONS[type];
    const seed = T.missionSeed(run, type, tier, nodeId);
    // The board has a stream to itself: the same seed is the same board, whoever plays it.
    const board = T.makeRng(T.subSeed(seed, 'board'));
    // the atlas page it is played on: the route's choice for this stop, or (a mission launched on its own,
    // as the simulators do) one the board's stream picks, unless the caller names one
    const node = run.map && nodeId != null ? run.map.all[nodeId] : null;
    const picked = board.pick(T.ATLAS).id; // drawn either way, so naming a page leaves the rest of the board alike
    if (!pageId) pageId = node && node.page ? node.page : picked;
    // the squad's size and level ask more of the mission (src/engine/scaling.js); two new pilots ask nothing more
    const sc = T.scaleFor(run);
    const spec = gen.gen(board, tier, T.scaledTide(T.TIDES[run.tide] || T.TIDES.rising, sc), T.PAGE_BY[pageId]);
    T.scaleSpec(spec, sc, T.squadSize(run), T.makeRng(T.subSeed(seed, 'squad')));
    spec.page = pageId;
    // the day's weather has a stream of its own, so the board and its foes are the same whatever the sky
    spec.place = T.placeConditions(T.PAGE_BY[pageId], T.makeRng(T.subSeed(seed, 'place')));
    spec.title = board.pick(gen.title);
    spec.blurb = gen.blurb;
    const threat = T.expeditionOf(run) && T.expeditionOf(run).threatDef;
    if (type === 'boss' && threat) {
      // the finale keeps the Heart's rules; the expedition says what the Heart is this time
      spec.title = T.threatTitle(run);
      spec.blurb = threat.look + ' ' + gen.blurb;
    }
    return { spec, seed };
  };
  T.launchMission = function (run, type, tier, pageId) {
    T.settlePurses(run);
    const { spec, seed } = T.missionSpec(run, type, tier, pageId);
    run.launched++;
    run.mission = T.startMission(run, spec, type, tier, seed);
    const threat = T.expeditionOf(run) && T.expeditionOf(run).threatDef;
    if (type === 'boss' && threat)
      run.mission.enemies.filter((e) => e.type === 'heart').forEach((e) => (e.name = threat.foe));
    run.phase = 'mission';
  };
  /**
   * What a stop on the route holds, before anyone chooses it: the mission it will launch, read from the same
   * spec (so the numbers are the ones that will be played), minus anything a player must find out in play.
   * A haven or an event says only what it is. Plain data; the run is not changed.
   */
  T.previewStop = function (run, nodeId) {
    const node = run.map.all[nodeId];
    let type = node.type;
    const elite = run.nextElite && ELITE_STANDS_IN.includes(type);
    if (elite) type = 'elite';
    if (!T.MISSIONS[type]) return { type, tier: node.tier, page: node.page || null };
    const { spec } = T.missionSpec(run, type, node.tier, null, nodeId);
    const tier = node.tier;
    const count = {};
    spec.enemies.forEach((e) => (count[e.type] = (count[e.type] || 0) + 1));
    const foes = Object.keys(count).map((k) => ({
      type: k,
      n: count[k],
      name:
        type === 'boss' && k === 'heart' && T.expeditionOf(run) ? T.expeditionOf(run).threatDef.foe : T.ENEMIES[k].name,
      hp: Math.round((T.foeHp(T.ENEMIES[k].hp[tier - 1]) * (spec.foeHp || 100)) / 100),
    }));
    const spawns = (spec.spawns || []).map((s) => ({
      every: s.every || 1,
      from: s.startRound || 1,
      max: s.max,
      kinds: [...new Set(s.pool)].map((k) => T.ENEMIES[k].name),
    }));
    return {
      type,
      tier,
      page: spec.page,
      elite,
      title: spec.title,
      blurb: spec.blurb,
      goal: spec.objective.kind,
      objective: spec.objective.text,
      fight: spec.objective.kind === 'kill',
      clock: spec.clock ? { value: spec.clock.value, label: spec.clock.label } : null,
      foes,
      spawns,
      bonus: (spec.bonus || []).map((b) => b.text),
      place: spec.place,
    };
  };
  T.finishNode = function (run) {
    const node = run.map.all[run.nodeId];
    node.done = true;
    if (node.type === 'boss' && run.won) {
      run.phase = 'summary';
      run.over = true;
      return;
    }
    let next = node.next.slice();
    if (run.skipNext && next.length) {
      // shortcut: skip the next row, land on a node two rows ahead
      const after = new Set();
      next.forEach((id) => run.map.all[id].next.forEach((x) => after.add(x)));
      if (after.size) {
        next.forEach((id) => (run.map.all[id].done = true));
        next = [...after];
      }
      run.skipNext = false;
    }
    run.available = next;
    run.phase = 'map';
    T.writePassage(run, T.passageKind(run, node), node);
  };

  /* ───────────────────────────── REWARDS ───────────────────────────── */
  T.missionRewards = function (run, m) {
    const bonusHit = m.bonus.filter((b) => b.achieved).length;
    const elite = m.archetype === 'elite';
    const boss = m.isBoss;
    let up = 2 + bonusHit + (elite ? 1 : 0);
    let crystals = 4 + m.tier + bonusHit * 2 + (elite ? 4 : 0) + (boss ? 10 : 0);
    // the mission's crystals are shared out among the purses; a pilot's own boon pays its own player
    const purse = T.splitCrystals(crystals, run.purses.length);
    run.heroes.forEach((h, i) => {
      for (const v of T.boonVals(h, 'reward')) {
        up += v.up || 0;
        crystals += v.crystals || 0;
        purse[T.purseSeat(run, i)] += v.crystals || 0;
      }
    });
    // every pilot gets an upgrade of their own: a trait offer each, and on an elite a boon offer each
    const offers = T.cardOffers(run, 3);
    const boons = elite ? T.boonOffers(run, 2) : null;
    run.lastReward = {
      up,
      crystals,
      purse,
      offers,
      boons,
      bonus: m.bonus.map((b) => Object.assign({}, b)),
      title: m.title,
      won: m.won,
      rounds: m.round,
      kills: m.stats.kills,
      picked: run.heroes.map((h, i) => !offers[i].length),
      boonPicked: run.heroes.map(() => !boons),
    };
    return run.lastReward;
  };
  T.cardOffer = function (run, n) {
    const cands = T.CARDS.filter((c) => run.heroes.some((h) => T.canAddCard(h, c.id).ok));
    return T.runStream(run, 'loot')
      .shuffle(cands)
      .slice(0, n)
      .map((c) => c.id);
  };
  T.boonOffer = function (run, n) {
    const have = new Set(run.boons.concat(...run.heroes.map((h) => h.boons)));
    const cands = T.BOONS.filter((b) => !have.has(b.id) && b.id !== 'defiant');
    return T.runStream(run, 'loot')
      .shuffle(cands)
      .slice(0, n)
      .map((b) => b.id);
  };
  /**
   * One trait offer for each hero: up to n cards that hero could take, drawn from the loot stream,
   * no card offered to two heroes. A hero with no legal card gets an empty offer (and nothing to pick).
   */
  T.cardOffers = function (run, n) {
    const rng = T.runStream(run, 'loot');
    const given = new Set();
    const offers = run.heroes.map((h) => {
      const cands = T.CARDS.filter((c) => !given.has(c.id) && T.canAddCard(h, c.id).ok);
      const pick = rng
        .shuffle(cands)
        .slice(0, n)
        .map((c) => c.id);
      pick.forEach((id) => given.add(id));
      return pick;
    });
    // a full kit is offered exchanges instead: traits it could take by giving one up (T.isSwapOffer). They
    // come from a stream of their own, so the loot a run draws is the same whether anyone's kit is full.
    run.heroes.forEach((h, i) => {
      if (h.cards.length < R().MAX_CARDS || offers[i].length >= n) return;
      const cands = T.CARDS.filter((c) => !given.has(c.id) && T.swapDrops(h, c.id).length);
      const more = T.runStream(run, 'swap')
        .shuffle(cands)
        .slice(0, n - offers[i].length)
        .map((c) => c.id);
      more.forEach((id) => given.add(id));
      offers[i] = offers[i].concat(more);
    });
    return offers;
  };
  /** Is this offered trait an exchange for this hero (their kit is full)? */
  T.isSwapOffer = (run, heroIdx, cardId) => {
    const h = run.heroes[heroIdx];
    return h.cards.length >= R().MAX_CARDS && !h.cards.includes(cardId);
  };
  /** One boon offer for each hero: n boons nobody in the squad has, no boon offered to two heroes. */
  T.boonOffers = function (run, n) {
    const rng = T.runStream(run, 'loot');
    const have = new Set(run.boons.concat(...run.heroes.map((h) => h.boons)));
    return run.heroes.map(() => {
      const cands = T.BOONS.filter((b) => !have.has(b.id) && b.id !== 'defiant');
      const pick = rng
        .shuffle(cands)
        .slice(0, n)
        .map((b) => b.id);
      pick.forEach((id) => have.add(id));
      return pick;
    });
  };
  /** Has every hero made (or passed) the choices this reward offers them? */
  T.rewardSettled = (rw) => rw.picked.every(Boolean) && rw.boonPicked.every(Boolean);
  /**
   * The mission is over: bring home what it carried for the run (crystals spent and salvaged, the
   * once-a-run Second Wind), apply its result, and let it go. After this the run has no mission.
   */
  T.applyMissionResult = function (run) {
    const m = run.mission;
    const rw = run.lastReward;
    run.mission = null;
    run.purses = m.purses.slice();
    run.secondWindUsed = m.secondWindUsed;
    run.stats.missions++;
    run.stats.kills += m.stats.kills;
    run.stats.rounds += m.round;
    // what the story needs to remember: the foe that mattered most, and who came off worst
    const foe = m.enemies.find((e) => e.boss) || m.enemies.find((e) => e.elite) || m.enemies[0];
    let hurt = 0;
    run.heroes.forEach((h, i) => {
      const worst = run.heroes[hurt];
      if ((h.downed ? -1 : h.hp / h.maxHp) < (worst.downed ? -1 : worst.hp / worst.maxHp)) hurt = i;
    });
    const close = run.heroes.some((h) => h.downed || h.hp < h.maxHp / 3);
    run.history.push({
      title: m.title,
      archetype: m.archetype,
      won: m.won,
      rounds: m.round,
      kills: m.stats.kills,
      foe: foe ? foe.name : null,
      close,
      hurt,
      notes: T.notesOf(m), // the players' own lines of story, for the chronicle
    });
    if (m.won) {
      rw.purse.forEach((n, s) => (run.purses[s] += n));
      run.heroes.forEach((h) => (h.upUnspent += rw.up));
    }
    if (m.isBoss && m.won) run.won = true;
    if (!m.won) {
      if (!m.isBoss && run.lifeline > 0) {
        run.lifeline--;
        run.stats.lifelineUsed = true;
        rw.lifeline = true;
        rw.up = 0;
        rw.crystals = 0;
        rw.purse = run.purses.map(() => 0);
        rw.offers = run.heroes.map(() => []);
        rw.boons = null;
        rw.picked = run.heroes.map(() => true);
        rw.boonPicked = run.heroes.map(() => true);
        run.heroes.forEach((h) => {
          h.downed = false;
          h.hp = Math.max(6, Math.floor(h.maxHp * 0.5));
          h.states = {};
          h.temp = [];
        });
        run.phase = 'reward';
        return;
      }
      run.over = true;
      run.phase = 'summary';
      return;
    }
    // heroes exit missions standing: downed heroes get up with a sliver; everyone binds wounds (+25%)
    run.heroes.forEach((h) => {
      if (h.downed) {
        h.downed = false;
        h.hp = Math.max(4, Math.floor(h.maxHp * 0.25));
      }
      h.hp = Math.min(h.maxHp, h.hp + Math.ceil(h.maxHp * 0.25));
      h.states = {};
      h.temp = [];
    });
    run.phase = 'reward';
  };
  /** A hero takes a card from their own offer; a hero whose kit is full names the trait it gives up for it. */
  T.takeOfferedCard = function (run, cardId, heroIdx, dropId) {
    const rw = run.lastReward;
    if (rw.picked[heroIdx] || !rw.offers[heroIdx].includes(cardId))
      return { ok: false, why: 'that trait is not on offer to this hero' };
    const h = run.heroes[heroIdx];
    if (h.cards.length >= R().MAX_CARDS && !h.cards.includes(cardId)) {
      if (!dropId) return { ok: false, why: 'the kit is full (9): choose a trait to give up for it' };
      const s = T.swapCard(h, cardId, dropId);
      if (s.ok) rw.picked[heroIdx] = true;
      return s;
    }
    const r = T.addCard(h, cardId);
    if (r.ok) rw.picked[heroIdx] = true;
    return r;
  };
  /** A hero passes on their trait offer, for 2 ◇ to its player's purse. */
  T.skipOfferedCard = function (run, heroIdx) {
    const rw = run.lastReward;
    if (rw.picked[heroIdx]) return { ok: false, why: 'already chosen' };
    rw.picked[heroIdx] = true;
    run.purses[T.purseSeat(run, heroIdx)] += 2;
    return { ok: true };
  };
  /** A hero takes a boon from their own offer. */
  T.takeBoon = function (run, boonId, heroIdx) {
    const rw = run.lastReward;
    if (!rw.boons || rw.boonPicked[heroIdx] || !rw.boons[heroIdx].includes(boonId))
      return { ok: false, why: 'that boon is not on offer to this hero' };
    run.heroes[heroIdx].boons.push(boonId);
    rw.boonPicked[heroIdx] = true;
    return { ok: true };
  };

  /* ───────────────────────────── HAVEN ───────────────────────────── */
  T.havenStock = function (run) {
    const owned = new Set(run.heroes.flatMap((h) => h.gear.map((g) => g.id)));
    const rng = T.runStream(run, 'loot');
    const gear = rng
      .shuffle(T.GEAR.filter((g) => !owned.has(g.id)))
      .slice(0, 3)
      .map((g) => g.id);
    const cons = rng
      .shuffle(T.CONSUMABLES)
      .slice(0, 3)
      .map((c) => c.id);
    return { gear, cons, healed: false, bought: [] };
  };
  T.buyGear = function (run, gearId, heroIdx) {
    const g = T.GEAR_BY[gearId];
    const h = run.heroes[heroIdx];
    const s = T.purseSeat(run, heroIdx);
    if (run.purses[s] < g.price) return { ok: false, why: 'not enough ◇' };
    if (h.gear.length >= R().GEAR_SLOTS) return { ok: false, why: 'gear slots full (2)' };
    run.purses[s] -= g.price;
    h.gear.push({ id: gearId, cds: [0, 0] });
    run.haven.gear = run.haven.gear.filter((x) => x !== gearId);
    run.haven.bought.push(gearId);
    return { ok: true };
  };
  T.sellGear = function (run, heroIdx, gi) {
    const h = run.heroes[heroIdx];
    const g = h.gear.splice(gi, 1)[0];
    if (g) run.purses[T.purseSeat(run, heroIdx)] += Math.floor(T.GEAR_BY[g.id].price / 2);
  };
  T.buyConsumable = function (run, cid, heroIdx) {
    const c = T.CONSUMABLE_BY[cid];
    const h = run.heroes[heroIdx];
    const s = T.purseSeat(run, heroIdx);
    if (run.purses[s] < c.price) return { ok: false, why: 'not enough ◇' };
    if (h.consumables.length >= 3) return { ok: false, why: 'pack full (3)' };
    run.purses[s] -= c.price;
    h.consumables.push(cid);
    return { ok: true };
  };
  T.havenRest = function (run, full) {
    if (full) {
      // the squad's repair: paid from the fullest purse first
      if (!T.payShared(run, 3)) return { ok: false, why: 'need 3 ◇' };
      run.heroes.forEach((h) => (h.hp = h.maxHp));
    } else run.heroes.forEach((h) => (h.hp = Math.min(h.maxHp, h.hp + Math.ceil((h.maxHp - h.hp) / 2))));
    run.haven.healed = true;
    return { ok: true };
  };

  /* ───────────────────────────── EVENTS ───────────────────────────── */
  T.pickEvent = function (run) {
    const cands = T.EVENTS.filter((e) => !run.seenEvents.includes(e.id));
    // on an expedition, an event that fits the ground of this leg comes first (T.EVENT_GROUNDS)
    const ground = T.groundAt(run, run.nodeId != null && run.map ? run.map.all[run.nodeId].row : null);
    const fits = ground ? cands.filter((e) => !T.EVENT_GROUNDS[e.id] || T.EVENT_GROUNDS[e.id].includes(ground)) : cands;
    const ev = T.runStream(run, 'event').pick(fits.length ? fits : cands.length ? cands : T.EVENTS);
    run.seenEvents.push(ev.id);
    return ev;
  };
  T.resolveEvent = function (run, optIdx, heroIdx) {
    const ev = run.event.def;
    const opt = ev.options[optIdx];
    const fx = opt.fx || {};
    // an event's price is the squad's, paid from the fullest purse first; what it gives is shared out
    if (opt.cost && opt.cost.crystals && T.totalCrystals(run) < opt.cost.crystals)
      return { ok: false, why: 'not enough ◇' };
    if (opt.cost && opt.cost.crystals) T.payShared(run, opt.cost.crystals);
    const hero = run.heroes[heroIdx != null ? heroIdx : T.runStream(run, 'event').int(run.heroes.length)];
    let followup = null;
    if (fx.crystals) T.gainShared(run, fx.crystals);
    if (fx.up) run.heroes.forEach((h) => (h.upUnspent += fx.up));
    if (fx.healAll === 'full') run.heroes.forEach((h) => (h.hp = h.maxHp));
    else if (fx.healAll === 'half')
      run.heroes.forEach((h) => (h.hp = Math.min(h.maxHp, h.hp + Math.ceil((h.maxHp - h.hp) / 2))));
    else if (typeof fx.healAll === 'number') run.heroes.forEach((h) => (h.hp = Math.min(h.maxHp, h.hp + fx.healAll)));
    if (fx.damageOne) hero.hp = Math.max(1, hero.hp - fx.damageOne);
    if (fx.nextElite) run.nextElite = true;
    if (fx.skipNext) run.skipNext = true;
    if (fx.bossBonusHp) run.bossBonusHp += fx.bossBonusHp;
    if (fx.boon) hero.boons.push(fx.boon);
    if (fx.boonRandom) {
      const offer = T.boonOffer(run, 1);
      if (offer.length) hero.boons.push(offer[0]);
      followup = { kind: 'boonGiven', boon: offer[0], hero: hero.name };
    }
    if (fx.affinityRandom) {
      const aff = T.runStream(run, 'event').pick(['aff_M', 'aff_C', 'aff_S', 'aff_T', 'omnicore']);
      hero.boons.push(aff);
      followup = { kind: 'boonGiven', boon: aff, hero: hero.name };
    }
    if (fx.audit) {
      // the audit reads the squad's crystals together, and halves every purse alike
      if (T.totalCrystals(run) >= 10) run.purses = run.purses.map((n) => Math.ceil(n / 2));
      else T.gainShared(run, 4);
    }
    if (fx.respec) {
      T.respecHero(hero);
      followup = { kind: 'respec', hero: hero.name };
    }
    if (fx.cardPick) followup = { kind: 'cardPick', offer: T.cardOffer(run, 3) };
    if (fx.tradeCard) followup = { kind: 'tradeCard', heroIdx: run.heroes.indexOf(hero) };
    run.event.resolved = true;
    run.event.result = opt.result;
    run.event.followup = followup;
    return { ok: true, result: opt.result, followup };
  };
  T.tradeCard = function (run, heroIdx, dropId) {
    const h = run.heroes[heroIdx];
    const sp = T.CARD[dropId].clades.find((x) => h.species.includes(x)) || T.CARD[dropId].sp;
    T.removeCard(h, dropId);
    const cands = T.cardsOf(sp).filter((c) => c.id !== dropId && T.canAddCard(h, c.id).ok);
    const nc = T.runStream(run, 'event').pick(cands);
    if (nc) T.addCard(h, nc.id);
    return nc ? nc.id : null;
  };

  /* ───────────────────────────── SAVE / LOAD ───────────────────────────── */
  /**
   * Saves. A run is plain data — its random streams are numbers, a mission in progress is part of
   * it — so a save is the run written out, and loading one gives back the same run: it carries on
   * exactly where it was, in the middle of a round if need be. Saving draws no random number.
   * T.SAVE_VERSION goes up whenever the saved shape changes; `migrate` brings older saves forward.
   */
  T.SAVE_VERSION = 19;
  T.serializeRun = function (run) {
    const m = run.mission;
    // the mission plays the run's own heroes: write them once, and leave out the animation queue
    return JSON.stringify(
      Object.assign({}, run, { mission: m ? Object.assign({}, m, { heroes: null, fx: [] }) : null }),
    );
  };
  const migrate = {
    // 2.0 saves had no version: one random stream (not kept), no mission, heroes stripped of dice.
    1(r) {
      delete r.rngState;
      r.rngs = {};
      r.launched = r.stats.missions;
      r.mission = null;
      // 2.0 kept each map node twice, and a loaded save updated only the copy in map.all
      if (r.map) r.map.rows = r.map.rows.map((row) => row.map((n) => n.id));
      if (r.phase === 'mission') r.phase = 'map'; // 2.0 never kept a mission: back to the map at that node
      const last = r.history[r.history.length - 1];
      if (r.lastReward && last) Object.assign(r.lastReward, { rounds: last.rounds, kills: last.kills });
      r.v = 2;
    },
    // 2.7 added the tide (difficulty); every earlier run was on the rising tide.
    2(r) {
      r.tide = 'rising';
      r.v = 3;
    },
    // 2.12 added players: every earlier run had one, who played both heroes.
    3(r) {
      r.party = T.newParty(1);
      r.v = 4;
    },
    // 2.15 added the story: a chronicle of passages between stops. An older run starts its chronicle empty.
    4(r) {
      r.story = T.newStory();
      r.v = 5;
    },
    // 2.17 sends each run on an expedition. An older run has none: its route keeps the names it was made with.
    5(r) {
      if (r.story && r.story.expedition === undefined) r.story.expedition = null;
      r.v = 6;
    },
    // 2.18 replaced lanes with zones: a node's one lane becomes a list of the zones it belongs to.
    6(r) {
      const b = r.mission && r.mission.board;
      if (b)
        Object.values(b.nodes).forEach((n) => {
          if (!n.zones) n.zones = [n.lane];
          delete n.lane;
        });
      r.v = 7;
    },
    // 2.19 plays every mission on an atlas page. An older route's stops have none (each draws one when it
    // is played), and a mission in progress keeps its grid.
    7(r) {
      if (r.map) Object.values(r.map.all).forEach((n) => (n.page = n.page || null));
      if (r.mission) r.mission.page = r.mission.page || null;
      r.v = 8;
    },
    // 2.24 gives every hero an upgrade of their own after a mission. A reward still open from an older
    // run offers its one trait (and boon) to each hero.
    8(r) {
      const rw = r.lastReward;
      if (rw && !rw.offers) {
        const n = r.heroes.length;
        rw.offers = Array.from({ length: n }, () => (rw.offer || []).slice());
        rw.boons = rw.boon && rw.boon.length ? Array.from({ length: n }, () => rw.boon.slice()) : null;
        rw.picked = Array.from({ length: n }, (x, i) => !!rw.picked || !rw.offers[i].length);
        rw.boonPicked = Array.from({ length: n }, () => !!rw.boonPicked || !rw.boons);
        delete rw.offer;
        delete rw.boon;
      }
      r.v = 9;
    },
    // 2.26 gives every mission the gravity and weather of its place. A mission already under way keeps
    // the rules it began with: normal gravity, calm air.
    9(r) {
      if (r.mission && !r.mission.place) r.mission.place = { gravity: 'normal', weather: 'calm', wind: 0 };
      r.v = 10;
    },
    // 2.27 lets a hero carry a crate (salvage). Nobody in an older save is carrying one.
    10(r) {
      for (const h of r.heroes || []) if (h && h.carrying === undefined) h.carrying = 0;
      r.v = 11;
    },
    // 2.29 gives dice kinds (a plain d20, an ethereal d12, a d8 for each element). A die banked in an older
    // save was rolled on the one die there was; it counts as plain.
    11(r) {
      for (const h of r.heroes || [])
        if (h && Array.isArray(h.held) && !h.heldDie) h.heldDie = h.held.map(() => 'plain');
      r.v = 12;
    },
    // 2.31 keeps the players' own lines of story with each mission. An older mission has none.
    12(r) {
      for (const x of r.history || []) if (!x.notes) x.notes = [];
      r.v = 13;
    },
    // 2.39 gives each player a purse of their own. An older run's crystals are shared out among its players
    // (one player keeps them all), and so are a mission's and an open reward's. A squad still being drafted
    // keeps its starting crystals until the route opens.
    13(r) {
      const n = r.party && r.party.players ? r.party.players.length : 1;
      if (r.phase !== 'draft' && typeof r.crystals === 'number') {
        r.purses = T.splitCrystals(r.crystals, n);
        delete r.crystals;
      }
      const m = r.mission;
      if (m && typeof m.crystals === 'number') {
        m.purses = T.splitCrystals(m.crystals, n);
        m.owner = (r.heroes || []).map((h, i) => (r.party && r.party.owner ? r.party.owner[i] || 0 : 0));
        delete m.crystals;
      }
      const rw = r.lastReward;
      if (rw && !rw.purse) rw.purse = rw.lifeline ? Array(n).fill(0) : T.splitCrystals(rw.crystals || 0, n);
      r.v = 14;
    },
    // 2.42 lets a trait two of a hero's clades share be taken twice, the second time as upgrade points bound
    // to it. Nobody in an older save has taken one twice.
    14(r) {
      (r.heroes || []).forEach((h) => h && !h.bound && (h.bound = {}));
      r.v = 15;
    },
    // 2.48 keeps how many of a card's bound points are on it ([n, spent]): 2.42 counted every point on the
    // card as bound first, so a trait that already had points gained nothing from being taken twice.
    15(r) {
      (r.heroes || []).forEach((h) => {
        if (!h || !h.bound) return;
        for (const [id, n] of Object.entries(h.bound)) {
          if (Array.isArray(n)) continue;
          const u = (h.up && h.up[id]) || [0, 0];
          h.bound[id] = [n, Math.min(n, u[0] + u[1])];
        }
      });
      r.v = 16;
    },
    // 2.76 lets a hero carry its level (as it set out), the made recipe it is (`madeId`) and the expeditions it
    // has flown (`runs`), and a mission its foes' vitality (`foeHp`, percent). An older save has two new pilots
    // whose missions do not scale: nothing to add.
    16(r) {
      r.v = 17;
    },
    // 2.81 lets players take turns in the order they choose (`party.active`, the seat taking its turn now) and
    // roll the next round's dice as they end their turn (`rolledAhead` on a hero, for that round), or play rounds
    // all at once (`party.rounds`, 'turns' or 'live'). An older save takes turns and is between them: whoever is
    // next may begin, and nothing is rolled ahead.
    17(r) {
      if (r.party) Object.assign(r.party, { active: null, rounds: 'turns' });
      r.v = 18;
    },
    // 2.83 lets an expedition be Short or Full (`length`) and an AI play a seat (`party.players[s].ai`). Every
    // older run was Full, and a person played every seat.
    18(r) {
      r.length = 'full';
      r.v = 19;
    },
  };
  T.deserializeRun = function (json) {
    const r = JSON.parse(json);
    if (r.v == null) r.v = 1;
    if (r.v > T.SAVE_VERSION) throw new Error('this save is from a newer version of the game');
    while (r.v < T.SAVE_VERSION) migrate[r.v](r);
    if (r.mission) r.mission.heroes = r.heroes;
    return r;
  };
  T.saveRun = function (run) {
    try {
      localStorage.setItem('tumult_v2_run', T.serializeRun(run));
      return true;
    } catch (e) {
      return false;
    }
  };
  T.loadRun = function () {
    try {
      const j = localStorage.getItem('tumult_v2_run');
      return j ? T.deserializeRun(j) : null;
    } catch (e) {
      return null;
    }
  };
  T.clearSave = function () {
    try {
      localStorage.removeItem('tumult_v2_run');
    } catch (e) {}
  };
  T.loadMeta = function () {
    try {
      return JSON.parse(localStorage.getItem('tumult_v2_meta') || '{"runs":0,"wins":0,"bestRow":0,"bestKills":0}');
    } catch (e) {
      return { runs: 0, wins: 0, bestRow: 0, bestKills: 0 };
    }
  };
  T.saveMeta = function (meta) {
    try {
      localStorage.setItem('tumult_v2_meta', JSON.stringify(meta));
    } catch (e) {}
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
