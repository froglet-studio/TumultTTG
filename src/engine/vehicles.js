/* ============================================================================
   TUMULT — VEHICLES (rules)
   Pocket vehicles on the big maps (Garrett, 2026-11-21). The data, and the
   Mounted rule, are in src/data/vehicles.js; how a player resolves them by
   hand is docs/reference/VEHICLES.md.

   A mission that carries vehicles holds them in m.vehicles, plain data:
     { uid, type, owner, pos, hull, driver, used }
   owner: the hero index that picked it; driver: the uid of the rider driving, or null when it is parked;
   used: the vehicle's cards played this round. A pilot inside has h.ride = the vehicle's uid, and stands on
   its space; nothing else records who is in it, so nothing is held in two places.
   ========================================================================== */
(function (T) {
  const B = T.Board;
  const R = () => T.RULES;
  const st = (ent) => ent.states;
  const say = (m, text, who) => T.say(m, text, who);
  const ENTER_AP = 1; // getting in, getting out and each Drive (Garrett: "1 ap to get in or out")
  T.VEHICLE_AP = ENTER_AP;

  T.vehicleOf = (m, h) => (h.ride != null && m.vehicles ? m.vehicles.find((v) => v.uid === h.ride) || null : null);
  T.vehicleAt = (m, node) => (m.vehicles ? m.vehicles.find((v) => v.pos === node) || null : null);
  T.ridersOf = (m, v) => m.heroes.filter((h) => h.ride === v.uid);
  T.vehicleDef = (v) => T.VEHICLE_BY[v.type];

  /** Can this vehicle stand on this space? Its ground, or high ground for one that flies there. */
  T.vehicleCanEnter = function (board, v, node) {
    const def = T.vehicleDef(v);
    const n = board.nodes[node];
    if (n.height) return !!def.height;
    return def.ground.includes(n.terrain || 'open');
  };
  const footGround = (board, node) => {
    const n = board.nodes[node];
    return !n.height && (!n.terrain || T.TERRAIN[n.terrain].foot);
  };

  /** A rider's state from the vehicle (Hover for a Wing, HazardImmune in a sealed Crawler), for as long as they ride. */
  function rideOn(h, v) {
    const s = T.vehicleDef(v).ride;
    if (s && !st(h)[s]) st(h)[s] = { t: 99, ride: true };
  }
  function rideOff(h) {
    for (const k of Object.keys(st(h))) if (st(h)[k] && st(h)[k].ride) delete st(h)[k];
    delete h.ride;
  }
  /**
   * Pocket pets ride along (Garrett, 2026-11-21: "a pet on a player will ride with them even in a one seater"):
   * the pets standing on their pilot's node go where the pilot goes, in and out, and take no seat.
   */
  function petsOn(m, h, node) {
    return (T.petsOf ? T.petsOf(m, h) : []).filter((p) => !p.dead && p.pos === node);
  }
  function carryPets(pets, node) {
    for (const p of pets) p.pos = node;
  }
  /** The next rider in squad order takes the controls when the driver gets out (or none: it is parked). */
  function passControls(m, v) {
    const r = T.ridersOf(m, v).find((x) => !x.downed);
    v.driver = r ? r.uid : null;
  }

  /**
   * The vehicles a mission starts with: `picks[i]` is the type hero i brings (or null). Each sets out from its
   * pilot's start with the pilot inside when the ground there suits it; otherwise (a Diver on a beach) it waits on
   * the nearest free space it can stand on, and its pilot boards it there.
   */
  T.setupVehicles = function (m, picks) {
    m.vehicles = [];
    m.heroes.forEach((h, i) => {
      const type = picks[i];
      if (!type || !T.VEHICLE_BY[type]) return;
      const def = T.VEHICLE_BY[type];
      const v = { uid: ++m.uids, type, owner: i, pos: null, hull: def.hull, driver: null, used: [] };
      const bd = m.board;
      if (T.vehicleCanEnter(bd, v, h.pos) && !T.vehicleAt(m, h.pos)) {
        v.pos = h.pos;
        m.vehicles.push(v);
        h.ride = v.uid;
        v.driver = h.uid;
        rideOn(h, v);
        return;
      }
      // the nearest free space it can stand on
      const seen = new Set([h.pos]);
      const q = [h.pos];
      while (q.length) {
        const x = q.shift();
        for (const y of B.allNeighbors(bd, x)) {
          if (seen.has(y)) continue;
          seen.add(y);
          if (T.vehicleCanEnter(bd, v, y) && !T.occupied(m, y)) {
            v.pos = y;
            m.vehicles.push(v);
            return;
          }
          q.push(y);
        }
      }
    });
    if (m.vehicles.length)
      say(
        m,
        'Vehicles: ' +
          m.vehicles
            .map(
              (v) => `${m.heroes[v.owner].name} brings a ${T.vehicleDef(v).name}${v.driver ? '' : ' (parked nearby)'}`,
            )
            .join('; ') +
          '.',
        'sys',
      );
  };

  /* ───────────── getting in and out ───────────── */
  /** The vehicles this pilot could get into now: beside them, with a free seat. */
  T.boardOptions = function (m, h) {
    if (!m.vehicles || h.ride != null || h.downed || h.rested) return [];
    if (T.isAnchored(h) || T.apValue(h) < ENTER_AP) return [];
    return m.vehicles
      .filter((v) => B.adjacent(m.board, h.pos, v.pos) && T.ridersOf(m, v).length < T.vehicleDef(v).seats)
      .map((v) => v.uid);
  };
  T.board = function (m, h, uid) {
    const v = m.vehicles && m.vehicles.find((x) => x.uid === uid);
    if (!v) return { ok: false, why: 'no such vehicle' };
    if (!T.boardOptions(m, h).includes(uid)) {
      if (h.ride != null) return { ok: false, why: 'already inside' };
      if (!B.adjacent(m.board, h.pos, v.pos)) return { ok: false, why: 'stand beside it' };
      if (T.ridersOf(m, v).length >= T.vehicleDef(v).seats) return { ok: false, why: 'no free seat' };
      return { ok: false, why: T.isAnchored(h) ? 'Anchored' : 'need 1 AP' };
    }
    T.pay(h, ENTER_AP);
    const pets = petsOn(m, h, h.pos);
    T.moveEntity(m, h, v.pos, 'board');
    carryPets(pets, h.pos);
    h.ride = v.uid;
    if (v.driver == null) v.driver = h.uid;
    rideOn(h, v);
    say(
      m,
      `${h.name} gets into the ${T.vehicleDef(v).name}${v.driver === h.uid ? ' and takes the controls' : ''}.`,
      'hero',
    );
    T.afterAction(m);
    return { ok: true };
  };
  /** Where a pilot inside could get out: a free space beside the vehicle that can be walked on. */
  T.leaveOptions = function (m, h) {
    const v = T.vehicleOf(m, h);
    if (!v || h.downed || h.rested || T.apValue(h) < ENTER_AP) return [];
    return B.allNeighbors(m.board, v.pos).filter((n) => footGround(m.board, n) && !T.occupied(m, n));
  };
  T.leave = function (m, h, node) {
    const v = T.vehicleOf(m, h);
    if (!v) return { ok: false, why: 'not inside a vehicle' };
    if (!T.leaveOptions(m, h).includes(node))
      return { ok: false, why: T.apValue(h) < ENTER_AP ? 'need 1 AP' : 'nowhere to step' };
    T.pay(h, ENTER_AP);
    const pets = petsOn(m, h, h.pos);
    rideOff(h);
    if (v.driver === h.uid) passControls(m, v);
    T.moveEntity(m, h, node, 'leave');
    carryPets(pets, h.pos);
    T.sightAround(m, h);
    say(m, `${h.name} gets out of the ${T.vehicleDef(v).name}.`, 'hero');
    T.afterAction(m);
    return { ok: true };
  };

  /* ───────────── driving ───────────── */
  /** Is the vehicle held? An Anchored rider holds it where it is. */
  const held = (m, v) => T.ridersOf(m, v).some((r) => st(r).Anchored);
  /**
   * The spaces a Drive could end on: up to the vehicle's speed over its own ground, never through a foe, a decoy or
   * another vehicle (a pilot on foot it passes), ending on a free space. For its driver only, for 1 AP.
   */
  T.driveOptions = function (m, h) {
    const v = T.vehicleOf(m, h);
    if (!v || v.driver !== h.uid || h.downed || h.rested || held(m, v) || T.apValue(h) < ENTER_AP) return [];
    return T.driveReach(m, v);
  };
  T.driveReach = function (m, v) {
    const bd = m.board;
    const speed = T.vehicleDef(v).speed;
    const blocked = new Set(
      T.liveEnemies(m)
        .map((e) => e.pos)
        .concat(m.decoys.map((d) => d.pos))
        .concat(m.vehicles.filter((o) => o !== v).map((o) => o.pos)),
    );
    const out = [];
    const seen = new Set([v.pos]);
    const q = [[v.pos, 0]];
    while (q.length) {
      const [x, d] = q.shift();
      if (d >= speed) continue;
      for (const y of B.allNeighbors(bd, x)) {
        if (seen.has(y) || !T.vehicleCanEnter(bd, v, y) || blocked.has(y)) continue;
        seen.add(y);
        if (!T.occupied(m, y)) out.push(y);
        q.push([y, d + 1]);
      }
    }
    return out;
  };
  /** The way a Drive goes, space by space (shortest, then by space number), so every screen moves it alike. */
  function drivePath(m, v, dest) {
    const bd = m.board;
    const blocked = new Set(
      T.liveEnemies(m)
        .map((e) => e.pos)
        .concat(m.decoys.map((d) => d.pos))
        .concat(m.vehicles.filter((o) => o !== v).map((o) => o.pos)),
    );
    const prev = { [v.pos]: null };
    const q = [v.pos];
    while (q.length) {
      const x = q.shift();
      for (const y of B.allNeighbors(bd, x)
        .slice()
        .sort((a, b) => a - b)) {
        if (y in prev || !T.vehicleCanEnter(bd, v, y) || blocked.has(y)) continue;
        prev[y] = x;
        if (y === dest) {
          const p = [dest];
          let c = dest;
          while (prev[c] !== null) p.unshift((c = prev[c]));
          return p;
        }
        q.push(y);
      }
    }
    return null;
  }
  T.drive = function (m, h, dest) {
    const v = T.vehicleOf(m, h);
    if (!v) return { ok: false, why: 'not inside a vehicle' };
    if (v.driver !== h.uid) return { ok: false, why: 'someone else is driving' };
    if (!T.driveOptions(m, h).includes(dest))
      return { ok: false, why: held(m, v) ? 'Anchored' : T.apValue(h) < ENTER_AP ? 'need 1 AP' : 'out of reach' };
    const path = drivePath(m, v, dest);
    T.pay(h, ENTER_AP);
    const riders = T.ridersOf(m, v);
    for (let i = 1; i < path.length; i++) {
      for (const r of riders) if (r.ride === v.uid) carryPets(petsOn(m, r, v.pos), path[i]);
      v.pos = path[i];
      for (const r of riders) if (r.ride === v.uid) T.moveEntity(m, r, path[i], 'drive');
      if (!m.vehicles.includes(v)) break; // a Field on the way wrecked it
    }
    for (const r of riders) if (!r.downed) T.sightAround(m, r);
    say(
      m,
      `${h.name} drives the ${T.vehicleDef(v).name} ${path.length - 1} space${path.length === 2 ? '' : 's'}.`,
      'hero',
    );
    T.afterAction(m);
    return { ok: true };
  };

  /* ───────────── the vehicle's cards ───────────── */
  /** The vehicle cards this pilot could use now, as { id, card } (whether or not they are affordable). */
  T.vehicleCards = function (m, h) {
    const v = T.vehicleOf(m, h);
    if (!v) return [];
    return T.vehicleDef(v).cards.filter((c) => c.seat === 'any' || v.driver === h.uid);
  };
  T.canUseVehicleCard = function (m, h, id, pick) {
    const v = T.vehicleOf(m, h);
    if (!v) return { ok: false, why: 'not inside a vehicle' };
    const c = T.vehicleDef(v).cards.find((x) => x.id === id);
    if (!c) return { ok: false, why: 'not this vehicle' };
    if (h.downed || h.rested) return { ok: false, why: 'cannot act' };
    if (c.seat === 'driver' && v.driver !== h.uid) return { ok: false, why: 'the driver’s' };
    if (v.used.includes(id)) return { ok: false, why: 'once a round' };
    if (!T.canPay(h, c.ap, c.el, c.el ? 1 : 0)) return { ok: false, why: 'need ' + c.ap + ' AP' };
    const tg = T.targetsFor(m, h, c.tgt, c, 0, 0, pick);
    if (tg.invalid) return { ok: false, why: tg.invalid };
    if (tg.need !== 'none' && (!tg.options || !tg.options.length)) return { ok: false, why: 'no valid target' };
    return { ok: true, tg, card: c };
  };
  T.useVehicleCard = function (m, h, id, ctx) {
    const chk = T.canUseVehicleCard(m, h, id, ctx && ctx.ally);
    if (!chk.ok) return chk;
    const v = T.vehicleOf(m, h);
    const c = chk.card;
    if (chk.tg.need === 'foe' && !(ctx && chk.tg.options.includes(ctx.target)))
      return { ok: false, why: 'choose a target' };
    T.pay(h, c.ap, c.el, c.el ? 1 : 0);
    v.used.push(id);
    say(m, `${h.name}: ${T.vehicleDef(v).name} — ${c.n} (${c.ap} AP).`, 'hero');
    T.fx(m, { t: 'gear', hero: h.uid });
    const rctx = Object.assign({}, ctx || {}, { P: 0, E: 0 });
    T.runEffects(m, h, c.fx, rctx);
    T.afterAction(m);
    return { ok: true, ctx: rctx };
  };

  /* ───────────── the hull ───────────── */
  T.hitHull = function (m, v, dmg) {
    v.hull = Math.max(0, v.hull - dmg);
    T.fx(m, { t: 'hull', vehicle: v.uid, amount: dmg, pos: v.pos });
    if (v.hull <= 0) T.wreck(m, v);
  };
  /** A wrecked vehicle is gone; its riders are set down on its space, or the nearest free ground. */
  T.wreck = function (m, v) {
    const bd = m.board;
    const riders = T.ridersOf(m, v);
    m.vehicles = m.vehicles.filter((x) => x !== v);
    m.stats.wrecks = (m.stats.wrecks || 0) + 1;
    say(m, `The ${T.vehicleDef(v).name} is wrecked!`, 'enemy');
    for (const r of riders) {
      const pets = petsOn(m, r, r.pos);
      rideOff(r);
      let spot = null;
      if (
        footGround(bd, v.pos) &&
        !T.liveEnemies(m).some((e) => e.pos === v.pos) &&
        !m.heroes.some((x) => x !== r && x.pos === v.pos && !x.downed && x.ride == null)
      )
        spot = v.pos;
      if (spot == null) {
        const seen = new Set([v.pos]);
        const q = [v.pos];
        while (q.length && spot == null) {
          const x = q.shift();
          for (const y of B.allNeighbors(bd, x)
            .slice()
            .sort((a, b) => a - b)) {
            if (seen.has(y)) continue;
            seen.add(y);
            if (footGround(bd, y) && !T.occupied(m, y)) {
              spot = y;
              break;
            }
            q.push(y);
          }
        }
      }
      if (spot != null && spot !== r.pos) T.moveEntity(m, r, spot, 'forced');
      carryPets(pets, r.pos);
      say(m, `${r.name} is thrown clear.`, 'enemy');
    }
    T.fx(m, { t: 'wreck', vehicle: v.uid, pos: v.pos });
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
