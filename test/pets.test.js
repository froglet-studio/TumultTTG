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

test('a found pet is three clades, none human, with one card of their three Physical faces', () => {
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
    assert.deepEqual(T.faceKeys(rec.card), ['P', 'P2', 'P3']);
    T.PET_FACES.forEach((k, i) => assert.equal(c[k].n, T.CARD[rec.traits[i]].P.n));
    assert.equal(c.E, null, 'a pet card has no Ethereal face');
    assert.ok(!T.CARDS.includes(c), 'not in the clades’ catalog');
  }
});

test('the pet card counts toward the nine, at most two pets, and E never goes on it', () => {
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
  assert.equal(T.adjustUp(h, card, 'E', 1).ok, false);
  assert.ok(T.adjustUp(h, card, 'P', 1).ok);
  // a full kit takes a pet only in exchange
  const g = T.makeHero({ id: 'g', name: 'Full', species: h.species, cards: h.cards.filter((c) => !T.isPetCard(h, c)) });
  while (g.cards.length < T.RULES.MAX_CARDS) {
    const c = T.CARDS.find((x) => T.canAddCard(g, x.id).ok);
    T.addCard(g, c.id);
  }
  const rec = T.newPet(run);
  assert.equal(T.canAdopt(g, rec).ok, false);
  const drop = g.cards[0];
  g.up[drop] = [2, 1];
  const spare = g.upUnspent;
  assert.ok(T.givePet(g, rec, drop).ok);
  assert.equal(g.cards.length, T.RULES.MAX_CARDS);
  assert.equal(g.upUnspent, spare + 3, 'the card given up refunds its points');
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
