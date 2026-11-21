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
    // a pet's or a piece of gear's card counts toward the nine, not toward a clade (src/data/pets.js)
    const ids = cards
      .filter((id) => !T.isKinless(id))
      .sort((a, b) => T.CARD[a].clades.length - T.CARD[b].clades.length);
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
    if (T.holds(h, cardId)) return { ok: false, why: 'already held' };
    if (h.cards.length >= R().MAX_CARDS) return { ok: false, why: 'kit is full (9)' };
    if (!T.cladeSlots(h, h.cards.concat(cardId)))
      return { ok: false, why: `already 3 of 9 from ${mine.map((sp) => T.SPECIES[sp].name).join(' and ')}` };
    return { ok: true };
  };
  /**
   * A pilot keeps every trait it earns (Garrett, 2026-11-21: "all old cards are kept, but only 9 cards can be
   * taken into a mission"). h.cards is what flies this mission, at most MAX_CARDS; h.reserve holds the rest,
   * left behind with their points still on them. Between missions any of them can change places (T.loadCard).
   */
  T.reserveOf = (h) => h.reserve || (h.reserve = []);
  /** Every trait a pilot holds: those it flies with and those in reserve. */
  T.collection = (h) => h.cards.concat(h.reserve || []);
  T.holds = (h, cardId) => h.cards.includes(cardId) || (h.reserve || []).includes(cardId);
  /** Can this trait join the pilot at all: its bloodline, not held, and some kit of nine could fly it? */
  T.canCollect = function (h, cardId) {
    const r = T.canAddCard(h, cardId);
    if (r.ok || ['unknown', 'not your bloodline', 'already held'].includes(r.why)) return r;
    return T.swapDrops(h, cardId).length ? { ok: true } : { ok: false, why: 'that would break the 3-of-9 cap' };
  };
  /** A new trait joins the kit when it has room, and the reserve when it is full. */
  T.addCard = function (h, cardId) {
    const r = T.canAddCard(h, cardId);
    if (r.ok) {
      h.cards.push(cardId);
      h.up[cardId] = [0, 0];
      return { ok: true };
    }
    if (!T.canCollect(h, cardId).ok) return r;
    T.reserveOf(h).push(cardId);
    h.up[cardId] = [0, 0];
    return { ok: true, reserve: true };
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
   * A trait leaves the pilot for good: every upgrade point on it comes back to spend again, bound ones too
   * (Garrett, 2026-11-20). Since 2.107 the game itself never takes a trait away (a trait left behind waits in
   * reserve, its points on it), so this is for what truly ends, such as a companion lost.
   */
  T.removeCard = function (h, cardId) {
    // a pet's card goes with its pet, and the pet with its card
    if (h.pets) h.pets = h.pets.filter((p) => p.card !== cardId);
    const b = boundOf(h, cardId);
    h.upUnspent += freeSpent(h, cardId) + (b ? b[0] : 0);
    h.cards = h.cards.filter((c) => c !== cardId);
    if (h.reserve) h.reserve = h.reserve.filter((c) => c !== cardId);
    delete h.up[cardId];
    if (h.bound) delete h.bound[cardId];
  };
  /**
   * A new trait comes into the kit in place of one that stays behind (2.107; before, the one that went was
   * lost and its points refunded). The new card must be of the pilot's bloodline, not held, and fit the
   * 3-of-9 cap once the other has gone to the reserve.
   */
  T.canSwapCard = function (h, cardId, dropId) {
    const c = T.CARD[cardId];
    if (!c || !T.CARD[dropId]) return { ok: false, why: 'unknown' };
    if (!h.cards.includes(dropId)) return { ok: false, why: 'not in the kit' };
    if (T.holds(h, cardId)) return { ok: false, why: 'already held' };
    if (!c.clades.some((sp) => h.species.includes(sp))) return { ok: false, why: 'not your bloodline' };
    if (!T.cladeSlots(h, h.cards.filter((x) => x !== dropId).concat(cardId)))
      return { ok: false, why: 'that would break the 3-of-9 cap' };
    return { ok: true };
  };
  /** The traits in the kit that could stay behind for this one. */
  T.swapDrops = (h, cardId) => h.cards.filter((d) => T.canSwapCard(h, cardId, d).ok);
  /** Exchange: the new trait takes the other's place in the kit, unupgraded; the other waits in reserve, points and all. */
  T.swapCard = function (h, cardId, dropId) {
    const r = T.canSwapCard(h, cardId, dropId);
    if (!r.ok) return r;
    const at = h.cards.indexOf(dropId);
    h.cards.splice(at, 1, cardId);
    T.reserveOf(h).push(dropId);
    h.up[cardId] = [0, 0];
    return { ok: true, swapped: dropId };
  };
  /**
   * Between missions, a trait in reserve comes into the kit: in place of `outId`, which goes to the reserve, or
   * into an empty place when the kit has fewer than nine. The 3-of-9 cap holds for the kit that flies. The dice
   * follow: each awakened card in the kit swaps a plain die for its element's (T.diceSet).
   */
  T.canLoadCard = function (h, inId, outId) {
    if (!(h.reserve || []).includes(inId)) return { ok: false, why: 'not in reserve' };
    if (outId && !h.cards.includes(outId)) return { ok: false, why: 'not in the kit' };
    if (!outId && h.cards.length >= R().MAX_CARDS)
      return { ok: false, why: 'the kit is full: choose one to leave behind' };
    const kit = h.cards.filter((x) => x !== outId).concat(inId);
    if (!T.cladeSlots(h, kit)) return { ok: false, why: `no more than ${R().MAX_PER_SPECIES} from one bloodline` };
    return { ok: true };
  };
  /** The traits in the kit that could stay behind for this reserve trait. */
  T.loadOuts = (h, inId) => h.cards.filter((d) => T.canLoadCard(h, inId, d).ok);
  T.loadCard = function (h, inId, outId) {
    const r = T.canLoadCard(h, inId, outId);
    if (!r.ok) return r;
    const res = T.reserveOf(h);
    res.splice(res.indexOf(inId), 1);
    if (outId) {
      h.cards.splice(h.cards.indexOf(outId), 1, inId);
      res.push(outId);
    } else h.cards.push(inId);
    return { ok: true };
  };
  /** The squad's loadout changes on the route, at havens and events, and at rewards: never in a mission. */
  T.changeLoadout = function (run, heroIdx, inId, outId) {
    if (run.mission || run.phase === 'mission') return { ok: false, why: 'the kit is set for this mission' };
    const h = run.heroes[heroIdx];
    if (!h) return { ok: false, why: 'no such pilot' };
    return T.loadCard(h, inId, outId || null);
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
      reserve: pb.reserve,
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
    // its level is set as it sets out, and the missions of this expedition answer it (T.squadPower)
    const lvl = T.pilotLevel(h);
    if (lvl > 1) h.level = lvl;
    // and the growth it set out with, so what it grows on the road can be told apart (T.pilotPowerFor)
    const grown = T.pilotPower(h);
    if (grown) h.setOut = grown;
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
    // a kit flies nine at most, whatever waits in reserve; a gear card is equipment bought on the expedition, not growth
    const held = Math.min(R().MAX_CARDS, T.collection(h).filter((c) => !(T.CARD[c] && T.CARD[c].gear)).length);
    return Math.max(0, pts + S.CARD_UP * Math.max(0, held - R().START_CARDS));
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
    if (prev) {
      r.id = prev.id;
      ['callsign', 'domain', 'story'].forEach((k) => prev[k] != null && (r[k] = prev[k]));
    }
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
    // pets stay with the expedition they were found on, as gear and its card do (src/data/pets.js)
    const own = (c) => !T.isKinless(c);
    h = Object.assign({}, h, { cards: h.cards.filter(own), reserve: (h.reserve || []).filter(own) });
    T.collection(h).forEach((c) => (up[c] = (h.up[c] || [0, 0]).slice(0, 2)));
    const bound = {};
    Object.keys(h.bound || {}).forEach((c) => (bound[c] = h.bound[c].slice(0, 2)));
    const key = [h.name, h.species.join('+'), h.cards.slice().sort().join('+')].join('|');
    return {
      id: h.madeId || 'made_' + hash(key),
      name: h.name,
      title: h.title || '',
      species: h.species.slice(),
      cards: h.cards.slice(),
      reserve: (h.reserve || []).slice(),
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
    // the traits it keeps in reserve (2.107): of its bloodline, none twice, each one some kit of nine could fly
    const reserve = rec.reserve == null ? [] : rec.reserve;
    if (!Array.isArray(reserve) || reserve.length > T.CARDS.length) return null;
    for (const c of reserve) {
      if (typeof c !== 'string' || !T.CARD[c] || T.holds(probe, c)) return null;
      if (!T.canCollect(probe, c).ok) return null;
      probe.reserve = (probe.reserve || []).concat(c);
    }
    const up = {};
    let spent = 0;
    for (const c of cards.concat(reserve)) {
      const u = (rec.up && rec.up[c]) || [0, 0];
      if (!Array.isArray(u) || !isInt(u[0], 0, R().P_CAP) || !isInt(u[1], 0, R().E_CAP)) return null;
      up[c] = [u[0], u[1]];
      spent += u[0] + u[1];
    }
    const bound = {};
    for (const c of Object.keys(rec.bound || {})) {
      const b = rec.bound[c];
      const shared = T.CARD[c] && T.CARD[c].clades.filter((s) => sp.includes(s)).length >= 2;
      if (!probe.cards.concat(reserve).includes(c) || !shared || !Array.isArray(b) || b[0] !== R().DOUBLE_UP)
        return null;
      if (!isInt(b[1], 0, b[0]) || b[1] > up[c][0] + up[c][1]) return null;
      bound[c] = [b[0], b[1]];
      spent -= b[1];
    }
    // a pilot back from expeditions may hold more than a new one's six points, never more than its kit can carry
    const spare = rec.spare == null ? null : rec.spare;
    if (spare != null && !isInt(spare, 0, (R().P_CAP + R().E_CAP) * (R().MAX_CARDS + reserve.length))) return null;
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
    if (reserve.length) out.reserve = reserve.slice();
    if (runs) out.runs = runs;
    // who a pilot made in Make a pilot is (2.83): a callsign, a domain, and three short answers. Optional.
    const word = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
    const call = word(rec.callsign, 12).toUpperCase();
    if (call && /^[A-Z0-9 -]+$/.test(call)) out.callsign = call;
    if (['jade', 'ruby', 'gold'].includes(rec.domain)) out.domain = rec.domain;
    if (Array.isArray(rec.story) && rec.story.length <= 3 && rec.story.some((a) => word(a, 280)))
      out.story = rec.story.map((a) => word(a, 280));
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
    // a pet's card has no Ethereal face; a gear card is bought as it is, never trained (2.117)
    const c = T.CARD[cardId];
    const cap = c && c.gear ? 0 : which === 'E' ? (c && c.pet ? 0 : R().E_CAP) : R().P_CAP;
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
      if (T.heroE(h, cid) === 0 && !T.isKinless(cid)) T.adjustUp(h, cid, 'E', 1);
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
          c.E &&
          (c.sig >= 2 || c.E.fx.some((x) => ['blink', 'engine', 'strike'].includes(x.v))) &&
          h.up[cid][1] < h.up[cid][0] + 1
            ? 'E'
            : 'P';
        if (!T.adjustUp(h, cid, which, 1).ok) T.adjustUp(h, cid, which === 'E' ? 'P' : 'E', 1);
      }
    }
  };
  T.respecHero = function (h) {
    T.collection(h).forEach((c) => {
      h.upUnspent += freeSpent(h, c);
      h.up[c] = [0, 0];
      if (boundOf(h, c)) boundOf(h, c)[1] = 0;
    });
  };
  /**
   * Give a squad the kit it would plausibly have by this tier of a real run: six UP a tier,
   * a piece of gear from tier 2, and at tier 3 a second piece and a seventh card.
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
        T.equipGear(h, T.GEAR[rng.int(T.GEAR.length)].id);
        if (tier >= 3) {
          T.equipGear(h, T.GEAR[rng.int(T.GEAR.length)].id);
          const extra = T.cardOffer(run, 1)[0];
          if (extra) T.addCard(h, extra);
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
    if (kit === 'tier') {
      T.addProgression(run, tier);
      // the tier's kit is what the squad brings to its first stop, not growth ahead of the road (T.pilotPowerFor)
      run.heroes.forEach((h) => (h.setOut = T.pilotPower(h)));
    } else run.crystals = 12;
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
    if (T.MISSIONS[type] && T.MISSIONS[type].big) {
      // a mission that needs vehicles: each player picks one first (Garrett, 2026-11-21), then it launches
      run.phase = 'garage';
      run.garage = { type, tier: node.tier, picks: run.heroes.map(() => null) };
    } else if (type === 'haven') {
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
    // a mission for a big map (a Crossing) is played on one of the big pages, drawn after
    const bigPick = gen.big ? board.pick(T.BIG_ATLAS).id : null;
    if (gen.big && pageId && !T.PAGE_BY[pageId].big) pageId = null;
    if (!pageId) pageId = node && node.page && (!gen.big || T.PAGE_BY[node.page].big) ? node.page : bigPick || picked;
    // the squad's power asks more of the mission (src/engine/scaling.js); two new pilots ask nothing more
    const sc = T.scaleFor(run, { tier, row: node ? node.row : null });
    const spec = gen.gen(board, tier, T.scaledTide(T.TIDES[run.tide] || T.TIDES.rising, sc), T.PAGE_BY[pageId]);
    T.scaleSpec(spec, sc, T.squadSize(run), T.makeRng(T.subSeed(seed, 'squad')));
    spec.page = pageId;
    // the day's weather has a stream of its own, so the board and its foes are the same whatever the sky
    spec.place = T.placeConditions(T.PAGE_BY[pageId], T.makeRng(T.subSeed(seed, 'place')));
    spec.title = board.pick(gen.title);
    spec.blurb = gen.blurb;
    // the vehicles the players picked for it (T.pickVehicle), or the ones the table would pick by default
    if (gen.big) spec.vehicles = T.vehiclePicks(run, pageId);
    const threat = T.expeditionOf(run) && T.expeditionOf(run).threatDef;
    if (type === 'boss' && threat) {
      // the finale keeps the Heart's rules; the expedition says what the Heart is this time
      spec.title = T.threatTitle(run);
      spec.blurb = threat.look + ' ' + gen.blurb;
    }
    return { spec, seed };
  };
  /* ───────────── vehicles: each player picks one before a mission that needs them ───────────── */
  /**
   * The vehicle each pilot brings to a big-map mission: the one its player picked (run.garage), or the page's
   * suggestion for that seat at the table (`suggest`, in turn), which is what the simulated players bring.
   */
  T.vehiclePicks = function (run, pageId) {
    const page = pageId && T.PAGE_BY[pageId];
    const suggest = (page && page.suggest) || ['crawler', 'skiff', 'wing'];
    return run.heroes.map((h, i) => (run.garage && run.garage.picks[i]) || suggest[i % suggest.length]);
  };
  /** The page a waiting big-map mission will be played on (for the garage to show its ground). */
  T.garagePage = function (run) {
    if (!run.garage) return null;
    return T.missionSpec(run, run.garage.type, run.garage.tier).spec.page;
  };
  /** A player picks the vehicle hero i brings. Once every pilot has one, the mission launches. */
  T.pickVehicle = function (run, i, type) {
    if (run.phase !== 'garage' || !run.garage) return { ok: false, why: 'not now' };
    if (!run.heroes[i] || !T.VEHICLE_BY[type]) return { ok: false, why: 'no such vehicle' };
    run.garage.picks[i] = type;
    return { ok: true };
  };
  /** Set out: every pilot without a pick takes the page's suggestion. */
  T.leaveGarage = function (run) {
    if (run.phase !== 'garage' || !run.garage) return { ok: false, why: 'not now' };
    const g = run.garage;
    const pageId = T.garagePage(run);
    g.picks = T.vehiclePicks(run, pageId);
    T.launchMission(run, g.type, g.tier);
    delete run.garage;
    return { ok: true };
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
    // the mission's crystals are shared out among the purses
    const purse = T.splitCrystals(crystals, run.purses.length);
    // every pilot gets an upgrade of their own: a trait offer each (boons, offered after elites until 2.89, are
    // gear passives now: an elite pays in crystals for gear)
    const offers = T.cardOffers(run, 3);
    const boons = null;
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
    // a pet that died is gone for that mission only: it sets out again, whole, with the next (Garrett, 2026-11-21)
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
      // the whole squad down ends the expedition outright (Garrett, 2026-11-21): the Lifeline carries a mission
      // lost any other way. The pilots are whole again for the next expedition.
      const wiped = m.heroes.every((h) => h.downed);
      if (wiped) run.stats.wiped = true;
      if (!m.isBoss && !wiped && run.lifeline > 0) {
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
  /**
   * A hero takes a card from their own offer. A hero whose kit is full keeps it too: it waits in reserve, or
   * comes in now in place of `dropId`, which stays behind with its points (nothing is lost, nothing refunded).
   */
  T.takeOfferedCard = function (run, cardId, heroIdx, dropId) {
    const rw = run.lastReward;
    if (rw.picked[heroIdx] || !rw.offers[heroIdx].includes(cardId))
      return { ok: false, why: 'that trait is not on offer to this hero' };
    const h = run.heroes[heroIdx];
    if (h.cards.length >= R().MAX_CARDS && !h.cards.includes(cardId)) {
      const s = dropId ? T.swapCard(h, cardId, dropId) : T.addCard(h, cardId);
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
  /* ───────────────────────────── HAVEN ───────────────────────────── */
  T.havenStock = function (run) {
    const owned = new Set(run.heroes.flatMap((h) => h.gear.map((g) => g.id)));
    const rng = T.runStream(run, 'loot');
    const gear = rng
      .shuffle(T.GEAR.filter((g) => !owned.has(g.id)))
      .slice(0, 3)
      .map((g) => g.id);
    // a stray (src/data/pets.js), from a stream of its own so the gear on offer is the same either way
    const pet = run.heroes.some((h) => (h.pets || []).length < T.PET.MAX) ? T.newPet(run) : null;
    return { gear, cons: [], healed: false, bought: [], pet };
  };
  /* ───────────────────────────── PETS ───────────────────────────── */
  /**
   * A pet found on the expedition (src/data/pets.js): three clades, none human, one trait drawn from each, and
   * the card their three Physical faces make. Draws from the run's 'pets' stream only.
   */
  T.newPet = function (run) {
    const rng = T.runStream(run, 'pets');
    const species = rng.shuffle(T.SPECIES_ORDER.filter((sp) => sp !== 'human')).slice(0, 3);
    const traits = [];
    for (const sp of species) {
      const pool = T.cardsOf(sp).filter((c) => !traits.includes(c.id));
      traits.push(pool[rng.int(pool.length)].id);
    }
    run.petSeq = (run.petSeq || 0) + 1;
    const id = 'pet' + run.petSeq;
    const rec = { id, name: rng.pick(T.PET_NAMES), species, traits, card: `pet~${id}~${traits.join('~')}` };
    T.registerPet(rec);
    return rec;
  };
  /**
   * Where a card in a kit comes from: a clade's bloodline, a pet (src/data/pets.js) or a piece of gear (2.117).
   * Everything in h.cards counts toward the nine whatever its source.
   */
  T.cardSource = function (h, cardId) {
    const rec = T.petRecOf(h, cardId);
    if (rec) return { kind: 'pet', id: rec.id };
    const c = T.CARD[cardId];
    if (c && c.gear) return { kind: 'gear', id: c.gear };
    return { kind: 'clade', id: c ? c.clades.find((sp) => h.species.includes(sp)) || c.sp : null };
  };
  /**
   * Can this hero take this pet in? A pet is pocketed like a vehicle (Garrett, 2026-11-21: "Pocket vehicles and
   * pocket pets. It is all inventory"): its card joins the kit when there is room, or in place of dropId, which
   * waits in reserve with its points; with a full kit and no dropId, the card waits in reserve itself (2.107).
   */
  T.canAdopt = function (h, rec, dropId) {
    if (!rec) return { ok: false, why: 'no pet here' };
    if ((h.pets || []).length >= T.PET.MAX) return { ok: false, why: `already ${T.PET.MAX} pets` };
    if (T.holds(h, rec.card)) return { ok: false, why: 'already yours' };
    if (dropId && !h.cards.includes(dropId)) return { ok: false, why: 'not in the kit' };
    return { ok: true };
  };
  /** Give a pet to a hero. Nothing is refunded: a card the pet's displaces goes to the reserve. */
  T.givePet = function (h, rec, dropId) {
    const r = T.canAdopt(h, rec, dropId);
    if (!r.ok) return r;
    T.registerPet(rec);
    h.pets = (h.pets || []).concat({
      id: rec.id,
      name: rec.name,
      species: rec.species.slice(),
      traits: rec.traits.slice(),
      card: rec.card,
    });
    h.up[rec.card] = [0, 0];
    let reserve = false;
    if (h.cards.length < R().MAX_CARDS && !dropId) h.cards.push(rec.card);
    else if (dropId) {
      h.cards.splice(h.cards.indexOf(dropId), 1, rec.card);
      T.reserveOf(h).push(dropId);
    } else {
      T.reserveOf(h).push(rec.card);
      reserve = true;
    }
    return { ok: true, reserve };
  };
  /** Adopt the haven's stray: T.PET.PRICE crystals from the hero's purse. */
  T.adoptPet = function (run, heroIdx, dropId) {
    const h = run.heroes[heroIdx];
    const rec = run.haven && run.haven.pet;
    const r = T.canAdopt(h, rec, dropId);
    if (!r.ok) return r;
    const s = T.purseSeat(run, heroIdx);
    if (run.purses[s] < T.PET.PRICE) return { ok: false, why: 'not enough ◇' };
    run.purses[s] -= T.PET.PRICE;
    T.givePet(h, rec, dropId);
    run.haven.pet = null;
    return { ok: true };
  };
  /**
   * Equip a piece of gear. Gear whose abilities go on cooldown has a card (src/data/world.js, 2.117): it joins
   * the kit when there is room and waits in the reserve when not, as a trait earned with a full kit does.
   */
  T.equipGear = function (h, gearId) {
    h.gear.push({ id: gearId, cds: [0, 0] });
    const cid = T.GEAR_BY[gearId].card;
    if (!cid || T.holds(h, cid)) return { ok: true };
    h.up[cid] = [0, 0];
    if (h.cards.length < R().MAX_CARDS) {
      h.cards.push(cid);
      return { ok: true };
    }
    T.reserveOf(h).push(cid);
    return { ok: true, reserve: true };
  };
  /** Take a piece of gear off: its card goes with it, unless a second of the same gear is still worn. */
  T.unequipGear = function (h, gi) {
    const g = h.gear.splice(gi, 1)[0];
    if (!g) return null;
    const cid = T.GEAR_BY[g.id].card;
    if (cid && !h.gear.some((x) => x.id === g.id)) T.removeCard(h, cid);
    return g;
  };
  T.buyGear = function (run, gearId, heroIdx) {
    const g = T.GEAR_BY[gearId];
    const h = run.heroes[heroIdx];
    const s = T.purseSeat(run, heroIdx);
    if (run.purses[s] < g.price) return { ok: false, why: 'not enough ◇' };
    if (h.gear.length >= R().GEAR_SLOTS) return { ok: false, why: 'gear slots full (2)' };
    run.purses[s] -= g.price;
    const eq = T.equipGear(h, gearId);
    run.haven.gear = run.haven.gear.filter((x) => x !== gearId);
    run.haven.bought.push(gearId);
    return { ok: true, reserve: !!eq.reserve };
  };
  T.sellGear = function (run, heroIdx, gi) {
    const h = run.heroes[heroIdx];
    const g = T.unequipGear(h, gi);
    if (g) run.purses[T.purseSeat(run, heroIdx)] += Math.floor(T.GEAR_BY[g.id].price / 2);
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
  /**
   * A trade or a molt: a new trait of the same bloodline takes this one's place in the kit, and the old one goes
   * to the reserve with its points (2.107: a pilot keeps every trait it has earned).
   */
  T.tradeCard = function (run, heroIdx, dropId) {
    const h = run.heroes[heroIdx];
    if (T.isKinless(dropId)) return null; // a pet's or a gear's card is not traded
    const sp = T.CARD[dropId].clades.find((x) => h.species.includes(x)) || T.CARD[dropId].sp;
    const cands = T.cardsOf(sp).filter((c) => T.canSwapCard(h, c.id, dropId).ok);
    const nc = T.runStream(run, 'event').pick(cands);
    if (nc) T.swapCard(h, nc.id, dropId);
    return nc ? nc.id : null;
  };

  /* ───────────────────────────── SAVE / LOAD ───────────────────────────── */
  /**
   * Saves. A run is plain data — its random streams are numbers, a mission in progress is part of
   * it — so a save is the run written out, and loading one gives back the same run: it carries on
   * exactly where it was, in the middle of a round if need be. Saving draws no random number.
   * T.SAVE_VERSION goes up whenever the saved shape changes; `migrate` brings older saves forward.
   */
  T.SAVE_VERSION = 32;
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
    // 2.82 lets a player choose the dice of a pilot's next roll (`rollPick` on a hero: up to ROLL kinds). Optional:
    // a version-18 pilot has chosen none, and draws at random as before.
    18(r) {
      r.v = 19;
    },
    // 2.86 makes snares, spore zones, triggers and auras one keyword, Field (`mission.fields`). A mission saved
    // mid-round keeps what was laid: each snare, zone, trigger (`AmbushTrap`) and aura (`Auras`) becomes a Field.
    19(r) {
      const m = r.mission;
      if (m) {
        const fields = [];
        const base = (o) =>
          Object.assign({ nodes: null, around: null, radius: 0, ring: false, trips: null, t: null }, o);
        for (const [node, list] of Object.entries(m.traps || {}))
          for (const tr of list || []) {
            const fx = [{ kw: 'strike', n: tr.dmg || 0, t: 1 }];
            if (tr.anchor)
              fx.push(Object.assign({ kw: 'anchor', n: 0, t: tr.anchor }, tr.noTele ? { noTele: true } : {}));
            fields.push(
              base({
                nodes: [+node],
                on: tr.counted ? 'end' : 'enter',
                trips: 1,
                owner: tr.owner,
                side: 'hero',
                label: null,
                fx,
              }),
            );
          }
        for (const z of m.zones || []) {
          const fx = [];
          if (z.dmg) fx.push({ kw: 'strike', n: z.dmg, t: 1 });
          if (z.weaken) fx.push({ kw: 'weaken', n: z.weaken, t: 1 });
          if (z.hideHeroes) fx.push({ kw: 'hidden', n: 0, t: 1 });
          let nodes = [z.node];
          if (m.board && m.board.nodes) {
            T.Board.build(m.board);
            nodes = nodes.concat(T.Board.within(m.board, z.node, z.radius || 1, true));
          }
          fields.push(
            base({ nodes, radius: z.radius || 1, on: 'end', t: z.t, owner: z.owner, side: 'hero', label: null, fx }),
          );
        }
        for (const h of r.heroes || []) {
          const s = (h && h.states) || {};
          if (s.AmbushTrap) {
            const at = s.AmbushTrap;
            const fx = [{ kw: 'strike', n: at.dmg || 0, t: 1 }];
            if (at.weaken) fx.push({ kw: 'weaken', n: at.weaken, t: 1 });
            if (at.anchor) fx.push({ kw: 'anchor', n: 0, t: at.anchor });
            fields.push(
              base({
                around: h.uid,
                radius: 1,
                ring: true,
                on: 'enter',
                trips: 1,
                t: at.t,
                owner: h.uid,
                side: 'hero',
                label: null,
                fx,
              }),
            );
            delete s.AmbushTrap;
          }
          for (const a of s.Auras || []) {
            const fx =
              a.kind === 'reveal'
                ? [{ kw: 'reveal', n: 0, t: 1 }]
                : [{ kw: 'strike', n: a.val || 0, t: 1, pierce: true, if: 'anchored' }];
            fields.push(
              base({
                around: h.uid,
                radius: a.radius || 2,
                on: 'end',
                t: a.t,
                owner: h.uid,
                side: 'hero',
                label: null,
                fx,
              }),
            );
          }
          delete s.Auras;
        }
        m.fields = fields;
        delete m.traps;
        delete m.zones;
      }
      r.v = 20;
    },
    // 2.88 makes damage over time one keyword, Wound: N at round end, then one less each round (`states.Wound`,
    // `{ n, owner, heal, kind }`). A foe's old `Dots` become one Wound dealing about as much in all.
    20(r) {
      const W = (d) => Math.max(1, Math.round((Math.sqrt(8 * d + 1) - 1) / 2));
      for (const e of (r.mission && r.mission.enemies) || []) {
        const dots = e && e.states && e.states.Dots;
        if (!dots) continue;
        delete e.states.Dots;
        const total = dots.reduce((n, d) => n + (d.v || 0) * (d.t || 0), 0);
        if (total > 0)
          e.states.Wound = {
            n: W(total),
            owner: dots[0].owner != null ? dots[0].owner : null,
            heal: Math.max(0, ...dots.map((d) => d.healOwner || 0)),
            kind: dots[0].kind || 'wound',
          };
      }
      r.v = 21;
    },
    // 2.89 folds boons into gear passives and consumables into gear actives. A pilot's boons are refunded at 3 ◇
    // each and its consumables at their price, to its own purse; an elite's boon offer still waiting is passed.
    21(r) {
      const PRICE = { vial: 2, shard: 3, charm: 3, flash: 2, grit: 2 };
      (r.heroes || []).forEach((h, i) => {
        if (!h) return;
        const back = (h.boons || []).length * 3 + (h.consumables || []).reduce((n, c) => n + (PRICE[c] || 2), 0);
        h.boons = [];
        h.consumables = [];
        if (!back) return;
        if (Array.isArray(r.purses) && r.purses.length) r.purses[T.purseSeat(r, i)] += back;
        else r.crystals = (r.crystals || 0) + back;
      });
      if (r.boons) r.boons = [];
      const rw = r.lastReward;
      if (rw && rw.boons) {
        rw.boons = null;
        rw.boonPicked = (r.heroes || []).map(() => true);
      }
      r.v = 22;
    },
    // 2.91 makes anchor, held, rooted, slow and no-teleport one keyword, Anchor: a unit carries `Anchored` alone.
    // Each of the old states becomes Anchored for as long as the longest of them.
    22(r) {
      const OLD = ['Held', 'Rooted', 'Slow', 'SlowSelf', 'NoTele'];
      const units = (r.heroes || []).concat((r.mission && r.mission.enemies) || []);
      for (const u of units) {
        const s = u && u.states;
        if (!s) continue;
        let t = s.Anchored ? s.Anchored.t : 0;
        for (const k of OLD)
          if (s[k]) {
            t = Math.max(t, s[k].t || 1);
            delete s[k];
          }
        if (t > 0) s.Anchored = { t };
      }
      r.v = 23;
    },
    // 2.92 makes Mark one keyword for Marked, Studied and Exposed: `Marked` is `{ next, pierce, each, t }`. A bare
    // Mark is +2 to the next hit; Studied (+n to every hero hit, for good) is +n to every hit for 3 rounds; Exposed
    // (+bonus and ignore Shield, next hit) is a Pierce Mark of that much.
    23(r) {
      for (const e of (r.mission && r.mission.enemies) || []) {
        const s = e && e.states;
        if (!s || !(s.Marked || s.Studied || s.Exposed)) continue;
        const mk = {};
        if (s.Marked) mk.next = 2;
        if (s.Exposed) {
          mk.next = Math.max(mk.next || 0, s.Exposed.bonus || 0);
          mk.pierce = true;
        }
        if (s.Studied) {
          mk.each = s.Studied.n || 1;
          mk.t = 3;
        }
        delete s.Studied;
        delete s.Exposed;
        s.Marked = mk;
      }
      r.v = 24;
    },
    // 2.93 folds Counter into Thorns: `Thorns` is `{ v, next, push, t }`, and a held Counter becomes its `next`.
    24(r) {
      const units = (r.heroes || []).concat((r.mission && r.mission.enemies) || []);
      for (const u of units) {
        const s = u && u.states;
        if (!s || !s.Counter) continue;
        const c = s.Counter;
        const th = s.Thorns || {};
        th.next = Math.max(th.next || 0, c.dmg || 0);
        if (c.push) th.push = c.push;
        th.t = Math.max(th.t || 0, c.t || 1);
        s.Thorns = th;
        delete s.Counter;
      }
      r.v = 25;
    },
    // 2.94 folds pre-empt, guard and absorb into Shield. A held Guard (ambushes halved) becomes Shield 1 for as long;
    // a held Absorb (the next ranged hits negated) a Shield of 3 against the next hit. Pre-empt keeps its state.
    25(r) {
      for (const u of r.heroes || []) {
        const s = u && u.states;
        if (!s) continue;
        if (s.Guard) {
          const cur = s.Shield;
          s.Shield = Object.assign({ all: false }, cur || {}, {
            v: Math.max(1, cur ? cur.v : 0),
            t: Math.max(s.Guard.t || 1, cur ? cur.t : 0),
          });
          delete s.Guard;
        }
        if (s.Absorb) {
          const cur = s.Preempt;
          s.Preempt = {
            v: Math.max(3, cur ? cur.v : 0),
            reflect: cur ? cur.reflect : 0,
            t: Math.max(s.Absorb.t || 1, cur ? cur.t : 0),
            reposition: cur ? cur.reposition : 0,
          };
          delete s.Absorb;
        }
      }
      r.v = 26;
    },
    // 2.100 brings the rework (2.82-2.87) and the keywords (2.88-2.99) together. The rework's save version 19 added
    // `run.length` (`'short'` or `'full'`) and a player's `ai`; every save without a length is a Full expedition, and
    // a player with no `ai` is a person. A rework save numbered 19 has come through the steps above unchanged in
    // shape (it holds none of the states they rename, or renames them as the keywords did).
    26(r) {
      if (r.length !== 'short' && r.length !== 'full') r.length = 'full';
      r.v = 27;
    },
    // 2.104 adds vehicles: a mission may hold `vehicles`, a pilot inside one `ride`, and a run waiting to set out on
    // a Crossing `garage`. A save from before has none of them, and nothing in it changes.
    27(r) {
      r.v = 28;
    },
    // 2.107: a pilot keeps every trait it earns, and flies nine (h.reserve holds the rest). Nothing in a save from
    // before was in reserve: what an exchange gave up then was gone, its points refunded.
    28(r) {
      for (const h of r.heroes || []) if (h && !Array.isArray(h.reserve)) h.reserve = [];
      r.v = 29;
    },
    // 2.109 added pets (src/data/pets.js): a hero's pets, and the pets on the board of a mission in progress.
    29(r) {
      (r.heroes || []).forEach((h) => (h.pets = h.pets || []));
      if (r.mission && !r.mission.pets) r.mission.pets = [];
      if (r.haven && r.haven.pet === undefined) r.haven.pet = null;
      r.v = 30;
    },
    // 2.115 added Dusk faces: a mission keeps the ones placed this round, to land at round end.
    30(r) {
      if (r.mission && !Array.isArray(r.mission.dusk)) r.mission.dusk = [];
      r.v = 31;
    },
    // 2.117 put every gear ability with a cooldown on a card in the nine (src/data/world.js): worn gear gets its
    // card, in the kit when there is room and in the reserve when not. Its old per-ability cooldowns are kept.
    31(r) {
      for (const h of r.heroes || []) {
        if (!h || !Array.isArray(h.gear) || !Array.isArray(h.cards)) continue;
        h.up = h.up || {};
        h.reserve = h.reserve || [];
        for (const g of h.gear) if (T.GEAR_BY[g.id]) migrateGearCard(h, g.id);
      }
      r.v = 32;
    },
  };
  function migrateGearCard(h, gearId) {
    const cid = T.GEAR_BY[gearId].card;
    if (!cid || h.cards.includes(cid) || h.reserve.includes(cid)) return;
    h.up[cid] = [0, 0];
    if (h.cards.length < R().MAX_CARDS) h.cards.push(cid);
    else h.reserve.push(cid);
  }
  T.deserializeRun = function (json) {
    const r = JSON.parse(json);
    if (r.v == null) r.v = 1;
    if (r.v > T.SAVE_VERSION) throw new Error('this save is from a newer version of the game');
    while (r.v < T.SAVE_VERSION) migrate[r.v](r);
    if (r.mission) r.mission.heroes = r.heroes;
    T.registerPets(r.heroes);
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
