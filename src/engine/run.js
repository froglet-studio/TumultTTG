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
      crystals: 6,
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
  T.missionSeed = function (run, type, tier) {
    const where = run.nodeId != null ? 'n' + run.nodeId : '#' + run.launched;
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
  T.canAddCard = function (h, cardId) {
    const c = T.CARD[cardId];
    if (!c) return { ok: false, why: 'unknown' };
    if (!h.species.includes(c.sp)) return { ok: false, why: 'not your bloodline' };
    if (h.cards.includes(cardId)) return { ok: false, why: 'already held' };
    if (h.cards.length >= R().MAX_CARDS) return { ok: false, why: 'kit is full (9)' };
    const n = h.cards.filter((id) => T.CARD[id].sp === c.sp).length;
    if (n >= R().MAX_PER_SPECIES) return { ok: false, why: `already 3 of 9 from ${T.SPECIES[c.sp].name}` };
    return { ok: true };
  };
  T.addCard = function (h, cardId) {
    const r = T.canAddCard(h, cardId);
    if (!r.ok) return r;
    h.cards.push(cardId);
    h.up[cardId] = [0, 0];
    return { ok: true };
  };
  T.removeCard = function (h, cardId) {
    h.cards = h.cards.filter((c) => c !== cardId);
    const up = h.up[cardId] || [0, 0];
    h.upUnspent += up[0] + up[1];
    delete h.up[cardId];
  };
  T.draftPack = function (run, h, size) {
    size = size || 4;
    // pool: every card of the hero's species they don't hold and could still take; weighted so each species shows up
    const pool = T.CARDS.filter((c) => T.canAddCard(h, c.id).ok);
    const bySp = {};
    pool.forEach((c) => (bySp[c.sp] = bySp[c.sp] || []).push(c));
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
    const spent = Object.values(h.up).reduce((s, v) => s + v[0] + v[1], 0);
    h.upUnspent = Math.max(0, R().START_UP - spent);
    return h;
  };
  // UP allocation
  T.adjustUp = function (h, cardId, which, delta) {
    const i = which === 'E' ? 1 : 0;
    const cap = which === 'E' ? R().E_CAP : R().P_CAP;
    const cur = h.up[cardId] || [0, 0];
    if (delta > 0) {
      if (h.upUnspent < delta) return { ok: false, why: 'no UP' };
      if (cur[i] + delta > cap) return { ok: false, why: 'cap' };
      cur[i] += delta;
      h.upUnspent -= delta;
    } else {
      if (cur[i] + delta < 0) return { ok: false };
      cur[i] += delta;
      h.upUnspent -= delta;
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
      const u = h.up[c];
      h.upUnspent += u[0] + u[1];
      h.up[c] = [0, 0];
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
    run.map = T.genTideMap(T.runStream(run, 'map'));
    run.phase = 'map';
    run.available = run.map.rows[0].slice();
    run.nodeId = null;
    T.beginExpedition(run);
    T.writePassage(run, 'start', null);
  };
  T.actOf = (row) => (row <= 1 ? 0 : row <= 4 ? 1 : 2);
  T.chooseNode = function (run, nodeId) {
    if (!run.available.includes(nodeId)) return { ok: false };
    const node = run.map.all[nodeId];
    run.nodeId = nodeId;
    run.map.current = nodeId;
    let type = node.type;
    if (run.nextElite && ['swarm', 'vault', 'hidden', 'cascade'].includes(type)) {
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
  T.launchMission = function (run, type, tier, pageId) {
    const gen = T.MISSIONS[type];
    const seed = T.missionSeed(run, type, tier);
    run.launched++;
    // The board has a stream to itself: the same seed is the same board, whoever plays it.
    const board = T.makeRng(T.subSeed(seed, 'board'));
    // the atlas page it is played on: the route's choice for this stop, or (a mission launched on its own,
    // as the simulators do) one the board's stream picks, unless the caller names one
    const node = run.map && run.nodeId != null ? run.map.all[run.nodeId] : null;
    const picked = board.pick(T.ATLAS).id; // drawn either way, so naming a page leaves the rest of the board alike
    if (!pageId) pageId = node && node.page ? node.page : picked;
    const spec = gen.gen(board, tier, T.TIDES[run.tide] || T.TIDES.rising, T.PAGE_BY[pageId]);
    spec.page = pageId;
    spec.title = board.pick(gen.title);
    spec.blurb = gen.blurb;
    const threat = T.expeditionOf(run) && T.expeditionOf(run).threatDef;
    if (type === 'boss' && threat) {
      // the finale keeps the Heart's rules; the expedition says what the Heart is this time
      spec.title = T.threatTitle(run);
      spec.blurb = threat.look + ' ' + gen.blurb;
    }
    run.mission = T.startMission(run, spec, type, tier, seed);
    if (type === 'boss' && threat)
      run.mission.enemies.filter((e) => e.type === 'heart').forEach((e) => (e.name = threat.foe));
    run.phase = 'mission';
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
    for (const h of run.heroes)
      for (const v of T.boonVals(h, 'reward')) {
        up += v.up || 0;
        crystals += v.crystals || 0;
      }
    // every pilot gets an upgrade of their own: a trait offer each, and on an elite a boon offer each
    const offers = T.cardOffers(run, 3);
    const boons = elite ? T.boonOffers(run, 2) : null;
    run.lastReward = {
      up,
      crystals,
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
    return run.heroes.map((h) => {
      const cands = T.CARDS.filter((c) => !given.has(c.id) && T.canAddCard(h, c.id).ok);
      const pick = rng
        .shuffle(cands)
        .slice(0, n)
        .map((c) => c.id);
      pick.forEach((id) => given.add(id));
      return pick;
    });
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
    run.crystals = m.crystals;
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
    });
    if (m.won) {
      run.crystals += rw.crystals;
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
  /** A hero takes a card from their own offer. */
  T.takeOfferedCard = function (run, cardId, heroIdx) {
    const rw = run.lastReward;
    if (rw.picked[heroIdx] || !rw.offers[heroIdx].includes(cardId))
      return { ok: false, why: 'that trait is not on offer to this hero' };
    const r = T.addCard(run.heroes[heroIdx], cardId);
    if (r.ok) rw.picked[heroIdx] = true;
    return r;
  };
  /** A hero passes on their trait offer, for 2 ◇ to the squad. */
  T.skipOfferedCard = function (run, heroIdx) {
    const rw = run.lastReward;
    if (rw.picked[heroIdx]) return { ok: false, why: 'already chosen' };
    rw.picked[heroIdx] = true;
    run.crystals += 2;
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
    if (run.crystals < g.price) return { ok: false, why: 'not enough ◇' };
    if (h.gear.length >= R().GEAR_SLOTS) return { ok: false, why: 'gear slots full (2)' };
    run.crystals -= g.price;
    h.gear.push({ id: gearId, cds: [0, 0] });
    run.haven.gear = run.haven.gear.filter((x) => x !== gearId);
    run.haven.bought.push(gearId);
    return { ok: true };
  };
  T.sellGear = function (run, heroIdx, gi) {
    const h = run.heroes[heroIdx];
    const g = h.gear.splice(gi, 1)[0];
    if (g) run.crystals += Math.floor(T.GEAR_BY[g.id].price / 2);
  };
  T.buyConsumable = function (run, cid, heroIdx) {
    const c = T.CONSUMABLE_BY[cid];
    const h = run.heroes[heroIdx];
    if (run.crystals < c.price) return { ok: false, why: 'not enough ◇' };
    if (h.consumables.length >= 3) return { ok: false, why: 'pack full (3)' };
    run.crystals -= c.price;
    h.consumables.push(cid);
    return { ok: true };
  };
  T.havenRest = function (run, full) {
    if (full) {
      if (run.crystals < 3) return { ok: false, why: 'need 3 ◇' };
      run.crystals -= 3;
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
    if (opt.cost && opt.cost.crystals && run.crystals < opt.cost.crystals) return { ok: false, why: 'not enough ◇' };
    if (opt.cost && opt.cost.crystals) run.crystals -= opt.cost.crystals;
    const hero = run.heroes[heroIdx != null ? heroIdx : T.runStream(run, 'event').int(run.heroes.length)];
    let followup = null;
    if (fx.crystals) run.crystals += fx.crystals;
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
      if (run.crystals >= 10) run.crystals = Math.ceil(run.crystals / 2);
      else run.crystals += 4;
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
    const sp = T.CARD[dropId].sp;
    T.removeCard(h, dropId);
    const cands = T.cardsOf(sp).filter((c) => T.canAddCard(h, c.id).ok);
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
  T.SAVE_VERSION = 9;
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
