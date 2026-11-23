'use strict';
// Pets (src/data/pets.js; Garrett, 2026-11-21): sidekick units found on the expedition, one three-face card each.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;
const B = T.Board;

/** A two-pilot vault mission whose first pilot has one pet (in place of their last card). */
function withPet(seed = 11, type = 'swarm') {
  const run = T.newRun(seed);
  H.prebuiltSquad(run, 0, 2);
  const h = run.heroes[0];
  const rec = T.newPet(run);
  const r = T.givePet(h, rec, h.cards.length >= T.RULES.MAX_CARDS ? h.cards[0] : undefined);
  assert.ok(r.ok, r.why);
  T.launchMission(run, type, 2);
  return { run, m: run.mission, h, rec, pet: run.mission.pets[0] };
}

test('a found pet is three clades, none human, with one card of their three Physical and three Ethereal faces', () => {
  const run = T.newRun(3);
  for (let k = 0; k < 20; k++) {
    const rec = T.newPet(run);
    assert.equal(rec.species.length, 3);
    assert.equal(new Set(rec.species).size, 3);
    assert.ok(!rec.species.includes('human'), 'no human in a pet');
    rec.traits.forEach((id, i) =>
      assert.ok(T.CARD[id].clades.includes(rec.species[i]), `${id} is a ${rec.species[i]} trait`),
    );
    const c = T.CARD[rec.card];
    assert.deepEqual(T.faceKeys(rec.card), ['P', 'P2', 'P3', 'E', 'E2', 'E3']);
    T.PET_FACES.forEach((k, i) => assert.equal(c[k].n, T.CARD[rec.traits[i]].P.n));
    T.PET_ETH.forEach((k, i) => {
      const tr = T.CARD[rec.traits[i]];
      assert.equal(c[k].n, tr.E.n);
      assert.equal(c[k].elt, tr.E.elt || tr.el, 'each Ethereal face pays its own trait’s etherion');
    });
    assert.ok(!T.CARDS.includes(c), 'not in the clades’ catalog');
  }
});

test('the pet card counts toward the nine, at most two pets, E goes up to the cap, and a full kit sends a card to the reserve', () => {
  const run = T.newRun(4);
  H.prebuiltSquad(run, 1, 3);
  const h = run.heroes[0];
  const n = h.cards.length;
  assert.ok(T.givePet(h, T.newPet(run)).ok);
  assert.equal(h.cards.length, n + 1);
  assert.ok(T.givePet(h, T.newPet(run)).ok);
  assert.equal(T.canAdopt(h, T.newPet(run)).ok, false, 'a third pet is refused');
  const card = h.pets[0].card;
  h.upUnspent = 5;
  assert.ok(T.adjustUp(h, card, 'E', 3).ok);
  assert.equal(T.adjustUp(h, card, 'E', 1).ok, false, 'E stops at its cap');
  assert.ok(T.adjustUp(h, card, 'E', -3).ok);
  assert.ok(T.adjustUp(h, card, 'P', 1).ok);
  // a full kit: the pet's card waits in reserve, or flies in place of a card that does; nothing is refunded
  const g = T.makeHero({ id: 'g', name: 'Full', species: h.species, cards: h.cards.filter((c) => !T.isPetCard(h, c)) });
  while (g.cards.length < T.RULES.MAX_CARDS) {
    const c = T.CARDS.find((x) => T.canAddCard(g, x.id).ok);
    T.addCard(g, c.id);
  }
  const spare = g.upUnspent;
  const kept = T.newPet(run);
  const r1 = T.givePet(g, kept);
  assert.ok(r1.ok && r1.reserve, 'with no card named, the pet card waits in reserve');
  assert.ok(g.reserve.includes(kept.card));
  const rec = T.newPet(run);
  const drop = g.cards[0];
  g.up[drop] = [2, 1];
  assert.ok(T.givePet(g, rec, drop).ok);
  assert.equal(g.cards.length, T.RULES.MAX_CARDS);
  assert.ok(g.cards.includes(rec.card));
  assert.ok(g.reserve.includes(drop), 'the card it displaced waits in reserve');
  assert.deepEqual(g.up[drop], [2, 1], 'its points still on it');
  assert.equal(g.upUnspent, spare, 'nothing is refunded');
});

test('a pet whose card is in reserve stays in the pocket; loaded, it sets out', () => {
  const run = T.newRun(6);
  H.prebuiltSquad(run, 0, 2);
  const h = run.heroes[0];
  while (h.cards.length < T.RULES.MAX_CARDS) {
    const c = T.CARDS.find((x) => T.canAddCard(h, x.id).ok);
    T.addCard(h, c.id);
  }
  const rec = T.newPet(run);
  assert.ok(T.givePet(h, rec).reserve);
  T.launchMission(run, 'swarm', 1);
  assert.equal(run.mission.pets.length, 0, 'no card, no pet on the board');
  run.mission.over = run.mission.won = true;
  T.missionRewards(run, run.mission);
  T.applyMissionResult(run);
  assert.ok(T.changeLoadout(run, 0, rec.card, h.cards[0]).ok);
  T.launchMission(run, 'swarm', 1);
  assert.equal(run.mission.pets.length, 1);
});

test('a pet sets out on its pilot’s node, and there nothing can hurt it', () => {
  const { m, h, pet } = withPet();
  assert.equal(pet.pos, h.pos);
  assert.ok(T.sheltered(m, pet));
  const foe = T.liveEnemies(m)[0];
  assert.equal(T.damage(m, foe, pet, 5, { kind: 'melee' }), 0);
  assert.equal(pet.hp, T.PET.HP);
  assert.ok(!T.foesFor(m, foe).includes(pet), 'foes do not count it as a target');
});

test('Heel walks the pet; off its pilot’s node it can be hit and can die, out for the mission but back for the next', () => {
  const { run, m, h, pet, rec } = withPet(12);
  h.held = ['AP', 'AP', 'AP'];
  h.heldDie = [];
  h.temp = [];
  h.pool = T.RULES.POOL - h.held.length;
  const chk = T.canHeel(m, h, pet.uid);
  assert.ok(chk.ok, chk.why);
  const node = chk.options.find((n) => n !== h.pos);
  assert.ok(T.heel(m, h, pet.uid, node).ok);
  assert.equal(pet.pos, node);
  assert.equal(T.apValue(h), 3 - T.PET.HEEL_AP);
  assert.ok(!T.sheltered(m, pet));
  const foe = T.liveEnemies(m)[0];
  assert.ok(T.foesFor(m, foe).includes(pet));
  T.damage(m, foe, pet, 99, { kind: 'true', trueDmg: true });
  assert.ok(pet.dead);
  assert.equal(T.entityAt(m, node) === pet, false, 'a dead pet leaves the board');
  assert.equal(T.canPlay(m, h, rec.card, 'P').ok, false, 'its card cannot be played without it');
  m.over = m.won = true;
  T.missionRewards(run, m);
  T.applyMissionResult(run);
  assert.ok(h.cards.includes(rec.card), 'the card stays in the kit');
  assert.equal(h.pets.length, 1);
  T.launchMission(run, 'vault', 2);
  const again = run.mission.pets[0];
  assert.ok(again && !again.dead, 'it comes back for the next mission');
  assert.equal(again.hp, T.PET.HP);
});

test('a pet card acts from the pet and sends the whole card to the track', () => {
  const scene = H.arena('hum_tool', { pet: 'owl_talon' });
  const { m, h } = scene;
  const card = 'pet~petX~owl_talon';
  const pet = m.pets[0];
  // move the pet two steps away, beside a foe the pilot cannot reach
  const foe = T.liveEnemies(m)[0];
  const spot = B.walkNeighbors(m.board, foe.pos).find(
    (n) => n !== h.pos && T.freeFor(m, pet, n) && !B.adjacent(m.board, h.pos, foe.pos),
  );
  if (spot != null) pet.pos = spot;
  const chk = T.canPlay(m, h, card, 'P');
  assert.ok(chk.ok, chk.why);
  assert.equal(chk.body, pet);
  const target = chk.tg.options ? chk.tg.options[0] : undefined;
  const r = T.playFace(m, h, card, 'P2', { target });
  assert.ok(r.ok, r.why);
  assert.ok(
    h.track.some((t) => t.card === card),
    'on the pilot’s track',
  );
  for (const k of T.PET_FACES) assert.equal(T.canPlay(m, h, card, k).ok, false, `${k} waits with the card`);
});

test('every trait’s Physical face fires from a pet without an engine error', () => {
  for (const c of T.CARDS) {
    const r = H.fireFace(c.id, 'P', { pet: true });
    assert.equal(r.status, 'fired', `${c.id}.P from a pet: ${r.why}`);
  }
});

test('a pet and its pilot may share a node; nobody else may', () => {
  const { m, h, pet, run } = withPet(13);
  const other = run.heroes[1];
  assert.ok(T.freeFor(m, h, pet.pos));
  assert.ok(T.freeFor(m, pet, h.pos));
  assert.equal(T.freeFor(m, other, pet.pos), false);
  assert.ok(T.occupied(m, pet.pos), 'a foe cannot stop there');
});

test('the look-ahead player plays a mission with pets, and a save mid-mission keeps them', () => {
  const { run, m } = withPet(14, 'vault');
  T.smartHeroPhase(m);
  T.endHeroPhase(m);
  H.assertPlain(m, 'with pets');
  const back = T.deserializeRun(T.serializeRun(run));
  assert.deepEqual(back.mission.pets, m.pets);
  assert.deepEqual(back.heroes[0].pets, run.heroes[0].pets);
  assert.ok(T.CARD[back.heroes[0].pets[0].card]);
  H.playMission(back.mission, { player: 'strong' });
  assert.ok(back.mission.over);
});

test('a haven offers a stray, from a stream of its own', () => {
  const a = T.newRun(21);
  H.prebuiltSquad(a, 0, 1);
  const st = T.havenStock(a);
  assert.ok(st.pet && st.pet.species.length === 3);
  a.haven = st;
  a.purses = [10];
  a.party = T.newParty(1);
  const r = T.adoptPet(a, 0);
  assert.ok(r.ok, r.why);
  assert.equal(a.haven.pet, null);
  assert.equal(a.heroes[0].pets.length, 1);
});

test('an older save gains empty pets', () => {
  const run = T.newRun(5);
  H.prebuiltSquad(run, 0, 1);
  const old = JSON.parse(T.serializeRun(run));
  old.v = 27;
  old.heroes.forEach((h) => delete h.pets);
  const back = T.deserializeRun(JSON.stringify(old));
  assert.equal(back.v, T.SAVE_VERSION);
  back.heroes.forEach((h) => assert.deepEqual(h.pets, []));
});

test('a 2.101 save mid-mission (version 27) loads with no pets and plays on', () => {
  const old = require('./fixtures/save-2.101.json');
  assert.equal(old.v, 27);
  const run = T.deserializeRun(JSON.stringify(old));
  assert.equal(run.v, T.SAVE_VERSION);
  assert.deepEqual(run.mission.pets, []);
  run.heroes.forEach((h) => assert.deepEqual(h.pets, []));
  H.playMission(run.mission, { player: 'weak' });
  assert.ok(run.mission.over);
});

test('a pet on its pilot’s node rides with them, even in a one-seater, and plays only Mounted faces inside', () => {
  const { m, h, pet } = withPet(15);
  const v = { uid: ++m.uids, type: 'wing', owner: 0, pos: null, hull: T.VEHICLE_BY.wing.hull, driver: null, used: [] };
  m.vehicles = m.vehicles || [];
  v.pos = B.walkNeighbors(m.board, h.pos).find((n) => !T.occupied(m, n));
  m.vehicles.push(v);
  h.held = ['AP', 'AP', 'AP'];
  h.heldDie = [];
  h.temp = [];
  h.pool = T.RULES.POOL - h.held.length;
  assert.ok(T.board(m, h, v.uid).ok);
  assert.equal(pet.pos, v.pos, 'the pet got in with its pilot, taking no seat');
  assert.ok(T.sheltered(m, pet));
  assert.equal(T.canHeel(m, h, pet.uid).ok, false, 'no Heel while it rides');
  const card = T.CARD[h.pets[0].card];
  for (const k of T.PET_FACES) {
    const r = T.canPlay(m, h, card.id, k);
    if (!T.isMountedFace(card, k)) assert.equal(r.why, 'not Mounted: get out first');
  }
  const out = T.leaveOptions(m, h)[0];
  assert.ok(T.leave(m, h, out).ok);
  assert.equal(pet.pos, h.pos, 'and got out with them');
});

test('upgrade points awaken a pet’s Ethereal faces one a point, and an awake one plays from the pet at the card’s E', () => {
  const { m, h, rec } = withPet(12);
  const cid = rec.card;
  assert.deepEqual(T.handFaces(h, cid), ['P', 'P2', 'P3'], 'asleep, the Ethereal faces stay out of the hand');
  T.PET_ETH.forEach((fk) => assert.equal(T.faceAwake(h, cid, fk), false));
  const why = T.canPlay(m, h, cid, 'E').why;
  assert.equal(why, 'needs E 1');
  h.upUnspent += 3;
  for (let e = 1; e <= 3; e++) {
    assert.ok(T.adjustUp(h, cid, 'E', 1).ok);
    assert.deepEqual(
      T.PET_ETH.map((fk) => T.faceAwake(h, cid, fk)),
      [0, 1, 2].map((i) => i < e),
      `E ${e} awakens ${e} face${e > 1 ? 's' : ''}`,
    );
    assert.equal(T.handFaces(h, cid).length, 3 + e);
  }
  assert.equal(T.faceNeedE(cid, 'E3'), 3);
  assert.equal(
    T.faceNeedE(
      h.cards.find((c) => !T.isKinless(c)),
      'E',
    ),
    T.RULES.ETHEREAL_MIN_E,
  );
  // awake, a face is held back only by what any face is: dice, targets, the pet being on the board
  T.PET_ETH.forEach((fk) => assert.notEqual(T.canPlay(m, h, cid, fk).why, `needs E ${T.faceNeedE(cid, fk)}`));
  // with dice enough, some awake face plays, through the pet, and the whole card goes on the track
  h.held = ['AP', 'AP', 'AP', 'AP', 'AP', 'O', 'O', 'O', 'M', 'C', 'S', 'T'];
  h.heldDie = h.held.map(() => 'plain');
  h.temp = [];
  h.pool = T.RULES.POOL - h.held.length;
  const fk = T.PET_ETH.find((k) => T.canPlay(m, h, cid, k).ok);
  assert.ok(fk, 'an awake Ethereal face can be played');
  const opts = T.canPlay(m, h, cid, fk).tg;
  const ctx = opts.need === 'foe' ? { target: opts.options[0] } : opts.need === 'node' ? { node: opts.options[0] } : {};
  const r = T.playFace(m, h, cid, fk, ctx);
  assert.ok(r.ok, r.why);
  assert.ok(
    m.log.some((l) => /through/.test(l.text || l)),
    'played through the pet',
  );
  assert.ok(!T.inHand(h, cid), 'the whole card cools');
});
