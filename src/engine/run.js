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
      seed,
      rng: T.makeRng(seed),
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
      won: false,
      over: false,
      lastReward: null,
      haven: null,
      event: null,
    };
  };

  /* ───────────────────────────── DRAFT ───────────────────────────── */
  // A hero = Human + two species. Six picks from packs of four drawn across the three pools.
  T.newDraftHero = function (run, name, title, species) {
    const h = T.makeHero({
      id: name.toLowerCase().replace(/\W+/g, '_') + '_' + run.rng.int(9999),
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
    const sps = run.rng.shuffle(Object.keys(bySp));
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
      const c = arr.splice(run.rng.int(arr.length), 1)[0];
      pack.push(c.id);
      const j = pool.indexOf(c);
      if (j >= 0) pool.splice(j, 1);
    }
    return pack;
  };
  T.heroFromPrebuilt = function (run, pb) {
    const h = T.makeHero({
      id: pb.id + '_' + run.rng.int(9999),
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
  T.autoAllocate = function (h) {
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

  /* ───────────────────────────── MAP ───────────────────────────── */
  T.startMap = function (run) {
    run.map = T.genTideMap(run.rng);
    run.phase = 'map';
    run.available = run.map.rows[0].map((n) => n.id);
    run.nodeId = null;
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
  T.launchMission = function (run, type, tier) {
    const gen = T.MISSIONS[type];
    const spec = gen.gen(run.rng, tier);
    spec.title = run.rng.pick(gen.title);
    spec.blurb = gen.blurb;
    run.mission = T.startMission(run, spec, type, tier, run.rng);
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
  };

  /* ───────────────────────────── REWARDS ───────────────────────────── */
  T.missionRewards = function (run, m) {
    const bonusHit = m.bonus.filter((b) => b.achieved).length;
    const elite = m.archetype === 'elite';
    const boss = m.isBoss;
    let up = 2 + bonusHit + (elite ? 1 : 0);
    let crystals = 4 + m.tier + bonusHit * 2 + (elite ? 4 : 0) + (boss ? 10 : 0);
    run.heroes.forEach((h) => {
      if (T.hasBoon(h, 'studious')) up += 0;
    });
    if (run.heroes.some((h) => T.hasBoon(h, 'deeppockets'))) crystals += 2;
    const studious = run.heroes.some((h) => T.hasBoon(h, 'studious')) ? 1 : 0;
    const offer = T.cardOffer(run, 3);
    const boon = elite ? T.boonOffer(run, 2) : null;
    run.lastReward = {
      up: up + studious,
      crystals,
      offer,
      boon,
      bonus: m.bonus.slice(),
      title: m.title,
      won: m.won,
      picked: false,
      boonPicked: false,
    };
    return run.lastReward;
  };
  T.cardOffer = function (run, n) {
    const cands = T.CARDS.filter((c) => run.heroes.some((h) => T.canAddCard(h, c.id).ok));
    return run.rng
      .shuffle(cands)
      .slice(0, n)
      .map((c) => c.id);
  };
  T.boonOffer = function (run, n) {
    const have = new Set(run.boons.concat(...run.heroes.map((h) => h.boons)));
    const cands = T.BOONS.filter((b) => !have.has(b.id) && b.id !== 'defiant');
    return run.rng
      .shuffle(cands)
      .slice(0, n)
      .map((b) => b.id);
  };
  T.applyMissionResult = function (run) {
    const m = run.mission;
    const rw = run.lastReward;
    run.stats.missions++;
    run.stats.kills += m.stats.kills;
    run.stats.rounds += m.round;
    run.history.push({ title: m.title, archetype: m.archetype, won: m.won, rounds: m.round, kills: m.stats.kills });
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
        rw.offer = [];
        rw.boon = null;
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
  T.takeOfferedCard = function (run, cardId, heroIdx) {
    const h = run.heroes[heroIdx];
    const r = T.addCard(h, cardId);
    if (r.ok) run.lastReward.picked = true;
    return r;
  };
  T.skipOfferedCard = function (run) {
    run.lastReward.picked = true;
    run.crystals += 2;
  };
  T.takeBoon = function (run, boonId, heroIdx) {
    const h = run.heroes[heroIdx];
    h.boons.push(boonId);
    run.lastReward.boonPicked = true;
  };

  /* ───────────────────────────── HAVEN ───────────────────────────── */
  T.havenStock = function (run) {
    const owned = new Set(run.heroes.flatMap((h) => h.gear.map((g) => g.id)));
    const gear = run.rng
      .shuffle(T.GEAR.filter((g) => !owned.has(g.id)))
      .slice(0, 3)
      .map((g) => g.id);
    const cons = run.rng
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
    const ev = run.rng.pick(cands.length ? cands : T.EVENTS);
    run.seenEvents.push(ev.id);
    return ev;
  };
  T.resolveEvent = function (run, optIdx, heroIdx) {
    const ev = run.event.def;
    const opt = ev.options[optIdx];
    const fx = opt.fx || {};
    if (opt.cost && opt.cost.crystals && run.crystals < opt.cost.crystals) return { ok: false, why: 'not enough ◇' };
    if (opt.cost && opt.cost.crystals) run.crystals -= opt.cost.crystals;
    const hero = run.heroes[heroIdx != null ? heroIdx : run.rng.int(run.heroes.length)];
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
      const aff = run.rng.pick(['aff_M', 'aff_C', 'aff_S', 'aff_T', 'omnicore']);
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
    const nc = run.rng.pick(cands);
    if (nc) T.addCard(h, nc.id);
    return nc ? nc.id : null;
  };

  /* ───────────────────────────── SAVE / LOAD ───────────────────────────── */
  T.serializeRun = function (run) {
    const r = Object.assign({}, run);
    delete r.rng;
    delete r.mission;
    r.rngState = run.rng ? run.rng() : 0; // advance & drop (non-critical)
    r.heroes = run.heroes.map((h) =>
      Object.assign({}, h, { states: {}, temp: [], track: [], held: [], pool: R().POOL }),
    );
    return JSON.stringify(r);
  };
  T.deserializeRun = function (json) {
    const r = JSON.parse(json);
    r.rng = T.makeRng((r.seed ^ (r.stats.missions * 7919) ^ Math.floor((r.rngState || 0) * 1e6)) >>> 0);
    r.heroes.forEach((h) => {
      h.kind = 'hero';
      h.states = {};
      h.temp = [];
      h.track = [];
      h.held = [];
      h.pool = R().POOL;
    });
    if (r.phase === 'mission') r.phase = 'map'; // missions are not persisted mid-fight
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
