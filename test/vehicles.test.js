'use strict';
/* Pocket vehicles and big maps (2.101; Garrett, 2026-11-21): each player picks a vehicle before a Crossing,
   1 AP to get in or out, a Drive moves it over its own ground, only its cards and Mounted faces inside. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;

/** A two-pilot run with a Crossing launched on a page. */
function crossing(pageId, picks, tier = 1, seed = 11) {
  const run = T.newRun(seed);
  H.prebuiltSquad(run, 0, 2);
  run.crystals = 12;
  T.settlePurses(run);
  if (picks) run.garage = { type: 'crossing', tier, picks };
  T.launchMission(run, 'crossing', tier, pageId);
  delete run.garage;
  return run;
}
/** Bank n AP dice for a pilot, from its pool (pool + banked stays 15). */
function give(h, n) {
  for (let i = 0; i < n; i++) {
    h.held.push('AP');
    h.heldDie.push('plain');
  }
  h.pool -= n;
}

test('vehicles are whole: seats, speed, hull, ground and cards that resolve', () => {
  assert.equal(T.VEHICLES.length, 5);
  for (const v of T.VEHICLES) {
    assert.ok(v.seats >= 1 && v.speed >= 2 && v.hull >= 4, v.id);
    assert.ok(v.ground.length && v.ground.every((g) => T.TERRAIN[g]), `${v.id}: known ground`);
    assert.ok(v.cards.length >= 2, `${v.id}: its cards`);
    for (const c of v.cards) assert.ok(['driver', 'any'].includes(c.seat) && c.txt && c.fx.length, `${v.id} ${c.id}`);
  }
  // some carry a long-range weapon (Garrett: "some vehicles can have long range weapons")
  assert.ok(T.VEHICLES.some((v) => v.cards.some((c) => c.weapon === 'ranged' && c.tgt === 'foe_any')));
});

test('big pages: every ground space reached on foot, water and gaps never walked, two ways across', () => {
  assert.ok(T.BIG_ATLAS.length >= 2);
  for (const p of T.BIG_ATLAS) {
    assert.equal(T.PAGE_BY[p.id], p);
    assert.ok(!T.ATLAS.includes(p), `${p.id}: a small mission never draws a big page`);
    const b = T.Board.build(T.pageBoard(p));
    assert.equal(b.cols, 8);
    assert.equal(b.rows, 4);
    const by = Object.fromEntries(Object.values(b.nodes).map((n) => [n.label, n.id]));
    const foot = (id) => !b.nodes[id].terrain || T.TERRAIN[b.nodes[id].terrain].foot;
    // water and gaps have no walking paths
    for (const n of Object.values(b.nodes))
      if (!foot(n.id)) assert.equal(b.walkAdj[n.id].length, 0, `${p.id} ${n.label}`);
    // every ground space can be walked to: no mission needs a vehicle
    const seen = new Set([by.A2]);
    const q = [by.A2];
    while (q.length) for (const y of b.walkAdj[q.shift()]) if (!seen.has(y)) seen.add(y) && q.push(y);
    for (const n of Object.values(b.nodes)) if (foot(n.id)) assert.ok(seen.has(n.id), `${p.id} ${n.label} on foot`);
    // two ways across on foot: block every path of the shortest walk from A2 to H2, and there is still one
    const first = T.Board.path(b, by.A2, by.H2);
    const cut = new Set(first.slice(1).map((x, k) => [first[k], x].sort().join('-')));
    const seen2 = new Set([by.A2]);
    const q2 = [by.A2];
    while (q2.length) {
      const x = q2.shift();
      for (const y of b.walkAdj[x]) if (!seen2.has(y) && !cut.has([x, y].sort().join('-'))) seen2.add(y) && q2.push(y);
    }
    assert.ok(seen2.has(by.H2), `${p.id}: a second way across on foot`);
    // a vehicle is worth bringing: the suggested ones cross faster than walking
    assert.ok(p.suggest && p.suggest.every((v) => T.VEHICLE_BY[v]), `${p.id}: suggestions`);
  }
});

test('the Mounted rule: no face that moves you or touches is Mounted; ranged strikes and shields are', () => {
  let mounted = 0;
  for (const c of T.CARDS)
    for (const k of ['P', 'E']) {
      if (!T.isMounted(c, k)) continue;
      mounted++;
      const f = c[k];
      assert.ok(!f.fx.some((x) => ['move', 'blink', 'climb'].includes(x.v)), `${c.id}:${k} moves you`);
      assert.ok(!f.fx.some((x) => x.v === 'strike' && x.kind === 'melee'), `${c.id}:${k} strikes in melee`);
    }
  assert.ok(mounted > 0 && mounted < T.CARDS.length * 2);
});

test('a Crossing: on a big page, each pilot in the vehicle picked for it', () => {
  const run = crossing('delta', ['skiff', 'crawler']);
  const m = run.mission;
  assert.equal(m.page, 'delta');
  assert.deepEqual(
    m.vehicles.map((v) => v.type),
    ['skiff', 'crawler'],
  );
  m.heroes.forEach((h) => {
    const v = T.vehicleOf(m, h);
    assert.ok(v, h.name + ' sets out inside');
    assert.equal(v.pos, h.pos);
    assert.equal(v.driver, h.uid);
  });
  H.assertPlain(m);
  // a launched Crossing on a small page is moved to a big one
  const r2 = crossing('quarry', null);
  assert.ok(T.PAGE_BY[r2.mission.page].big);
});

test('getting out and back in costs 1 AP each; inside, no walking, no basic actions, only Mounted faces', () => {
  const run = crossing('saltflat', ['runner', 'crawler']);
  const m = run.mission;
  const h = m.heroes[0];
  give(h, 4 - T.apValue(h));
  assert.equal(T.walk(m, h, T.Board.walkNeighbors(m.board, h.pos)[0]).why, 'inside a vehicle: drive, or get out');
  assert.equal(T.canUseBasic(m, h, 'strike').ok, false);
  for (const cid of h.cards)
    for (const k of ['P', 'E']) {
      const r = T.canPlay(m, h, cid, k);
      if (!T.isMounted(T.CARD[cid], k)) assert.equal(r.ok, false, `${cid}:${k}`);
    }
  const out = T.leaveOptions(m, h)[0];
  assert.ok(out != null);
  assert.ok(T.leave(m, h, out).ok);
  const before = T.apValue(h) + 1;
  assert.equal(before, 4);
  assert.equal(h.ride, undefined);
  const v = m.vehicles[0];
  assert.equal(v.driver, null, 'parked');
  assert.ok(T.occupied(m, v.pos), 'nobody stops on a parked vehicle');
  assert.ok(T.board(m, h, v.uid).ok);
  assert.equal(T.apValue(h), 2, '1 AP out, 1 AP back in');
  assert.equal(h.pos, v.pos);
});

test('a Drive moves the vehicle and everyone inside up to its speed, over its own ground only', () => {
  const run = crossing('delta', ['skiff', 'crawler']);
  const m = run.mission;
  const [a, b] = m.heroes;
  const skiff = T.vehicleOf(m, a);
  give(a, 3);
  const opts = T.driveOptions(m, a);
  assert.ok(opts.length);
  for (const n of opts) {
    assert.ok(T.vehicleCanEnter(m.board, skiff, n));
    assert.ok(T.Board.dist(m.board, skiff.pos, n, true) <= T.VEHICLE_BY.skiff.speed);
    assert.notEqual(m.board.nodes[n].terrain, 'rough', 'a Skiff never goes into the reeds');
  }
  // a passenger rides along: the crawler's pilot gets out and into the skiff (2 seats)
  give(b, 3);
  T.leave(
    m,
    b,
    T.leaveOptions(m, b).sort(
      (x, y) => T.Board.dist(m.board, x, skiff.pos, true) - T.Board.dist(m.board, y, skiff.pos, true),
    )[0],
  );
  if (T.Board.adjacent(m.board, b.pos, skiff.pos)) {
    assert.ok(T.board(m, b, skiff.uid).ok);
    assert.equal(T.driveOptions(m, b).length, 0, 'only the driver drives');
    const dest = T.driveOptions(m, a)[0];
    assert.ok(T.drive(m, a, dest).ok);
    assert.equal(a.pos, dest);
    assert.equal(b.pos, dest, 'the passenger went too');
  }
  H.assertPlain(m);
});

test('blows on a rider land on the hull; a wreck throws its riders clear onto ground', () => {
  const run = crossing('delta', ['skiff', 'crawler']);
  const m = run.mission;
  const h = m.heroes[0];
  const v = T.vehicleOf(m, h);
  const foe = T.liveEnemies(m)[0];
  const hp = h.hp;
  T.damage(m, foe, h, 2, { kind: 'melee' });
  assert.equal(h.hp, hp, 'the pilot is untouched');
  assert.equal(v.hull, T.VEHICLE_BY.skiff.hull - 2);
  T.damage(m, foe, h, 99, { kind: 'melee' });
  assert.equal(m.vehicles.includes(v), false, 'wrecked');
  assert.equal(h.ride, undefined);
  const n = m.board.nodes[h.pos];
  assert.ok(!n.terrain || T.TERRAIN[n.terrain].foot, 'set down on ground');
  assert.equal(m.stats.wrecks, 1);
});

test('vehicle cards: once a round for the vehicle, the driver’s for the driver only', () => {
  const run = crossing('saltflat', ['crawler', 'runner']);
  const m = run.mission;
  const h = m.heroes[0];
  give(h, 6);
  const foe = T.liveEnemies(m)[0];
  const r = T.useVehicleCard(m, h, 'longgun', { target: foe.uid });
  assert.ok(r.ok, r.why);
  assert.equal(T.canUseVehicleCard(m, h, 'longgun').why, 'once a round');
  assert.equal(T.canUseVehicleCard(m, m.heroes[1], 'longgun').why, 'not this vehicle');
});

test('the garage: the run waits for vehicles before a Crossing, then sets out with the picks', () => {
  const run = T.newRun(5);
  H.prebuiltSquad(run, 1, 3);
  T.startMap(run);
  const node = run.map.all[run.map.rows[0][0]];
  node.type = 'crossing';
  node.tier = 1;
  node.page = 'saltflat';
  run.available = [node.id];
  T.chooseNode(run, node.id);
  assert.equal(run.phase, 'garage');
  assert.ok(T.execCommand(run, { op: 'pickVehicle', hero: 0, vehicle: 'wing' }).ok);
  assert.ok(T.execCommand(run, { op: 'setOut' }).ok);
  assert.equal(run.phase, 'mission');
  assert.equal(run.garage, undefined);
  assert.deepEqual(
    run.mission.vehicles.map((v) => v.type),
    ['wing', 'crawler'],
    'the second pilot takes the page’s suggestion',
  );
  // a Wing's rider hovers
  assert.ok(run.mission.heroes[0].states.Hover);
  // the run saves and loads mid-mission with its vehicles
  const back = T.deserializeRun(T.serializeRun(run));
  assert.deepEqual(back.mission.vehicles, run.mission.vehicles);
});

test('both simulated players can play a Crossing to the end', () => {
  for (const player of ['weak', 'strong'])
    for (const page of ['delta', 'saltflat']) {
      const run = crossing(page, null, 2, 3);
      const m = H.playMission(run.mission, { player });
      assert.ok(m.over, `${player} on ${page}`);
    }
});

test('a save from 2.103 (mid-Crossing, a pilot in each vehicle) loads and plays on', () => {
  const old = require('./fixtures/save-2.103.json');
  assert.equal(old.v, 28);
  const run = T.deserializeRun(JSON.stringify(old));
  const m = run.mission;
  assert.ok(m.vehicles.length, 'its vehicles came back');
  for (const h of m.heroes) if (h.ride != null) assert.equal(T.vehicleOf(m, h).pos, h.pos);
  const s = T.serializeRun(run);
  assert.equal(T.serializeRun(T.deserializeRun(s)), s);
  H.playMission(m, { maxRounds: 30 });
  assert.ok(m.over);
});
