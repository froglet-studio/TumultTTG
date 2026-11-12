'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('../tools/harness');

const H = createHarness();
const { T } = H;

test('full runs: map → missions → havens → events complete, with save round-trips', () => {
  let finished = 0;
  for (let i = 0; i < 8; i++) {
    const run = T.newRun(5000 + i * 31);
    if (i % 2) H.draftedSquad(run);
    else H.prebuiltSquad(run, i % 6, (i + 2) % 6);
    const r = H.playRun(run, { checkSave: true });
    assert.ok(run.over, `run ${i} should end (won or lost)`);
    assert.ok(r.missions >= 1);
    finished++;
  }
  assert.equal(finished, 8);
});

test('draft: packs only offer legal cards; the 3-of-9 and 9-card caps hold', () => {
  const run = T.newRun(42);
  const h = T.newDraftHero(run, 'Tess', 'the drafted', ['owl', 'gecko']);
  for (let pick = 0; pick < T.RULES.MAX_CARDS; pick++) {
    const pack = T.draftPack(run, h, 4);
    assert.ok(pack.length > 0, 'a legal pack exists until the kit is full');
    for (const id of pack) assert.equal(T.canAddCard(h, id).ok, true, `${id} offered but illegal`);
    assert.equal(T.addCard(h, pack[0]).ok, true);
  }
  assert.equal(h.cards.length, T.RULES.MAX_CARDS);
  for (const sp of h.species) {
    assert.ok(h.cards.filter((id) => T.CARD[id].sp === sp).length <= T.RULES.MAX_PER_SPECIES, `${sp}: 3-of-9 cap`);
  }
  const extra = T.CARDS.find((c) => h.species.includes(c.sp) && !h.cards.includes(c.id));
  assert.equal(T.canAddCard(h, extra.id).ok, false, 'kit is full');
  const foreign = T.CARDS.find((c) => !h.species.includes(c.sp));
  assert.equal(T.canAddCard(h, foreign.id).ok, false, 'not your bloodline');
});

test('upgrade points: P and E are capped and refundable', () => {
  const run = T.newRun(7);
  const h = T.newDraftHero(run, 'Uma', 'the drafted', ['eel', 'flytrap']);
  T.addCard(h, 'eel_discharge');
  h.upUnspent = 10;
  for (let i = 0; i < T.RULES.E_CAP; i++) assert.equal(T.adjustUp(h, 'eel_discharge', 'E', 1).ok, true);
  assert.equal(T.adjustUp(h, 'eel_discharge', 'E', 1).ok, false, 'E cap');
  assert.equal(T.heroE(h, 'eel_discharge'), T.RULES.E_CAP);
  assert.equal(h.upUnspent, 10 - T.RULES.E_CAP);
  T.respecHero(h);
  assert.equal(h.upUnspent, 10);
  assert.equal(T.heroE(h, 'eel_discharge'), 0);
});

test('the tide map: every node is reachable and the boss is the last row', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const run = T.newRun(seed);
    T.startMap(run);
    const { all } = run.map;
    const rows = run.map.rows.map((row) => row.map((id) => all[id])); // a row is a list of node ids
    assert.equal(rows[rows.length - 1].length, 1);
    assert.equal(rows[rows.length - 1][0].type, 'boss');
    for (let r = 1; r < rows.length; r++) {
      for (const n of rows[r]) {
        assert.ok(
          rows[r - 1].some((p) => p.next.includes(n.id)),
          `seed ${seed}: node ${n.id} (row ${r}) has no way in`,
        );
      }
    }
    for (const n of Object.values(all)) if (n.type !== 'boss') assert.ok(n.next.length >= 1, 'no dead ends');
    assert.deepEqual(H.plainProblems(run), [], 'a run on its map is plain data: every node has one home');
  }
});

test('quick missions: a seed, a squad and a kit name one mission, and the Tide carries on from it', () => {
  const snap = (m) =>
    JSON.stringify({
      nodes: m.board.nodes,
      edges: m.board.edges,
      foes: m.enemies.map((e) => [e.type, e.pos, e.hp]),
      heroes: m.heroes.map((h) => [
        h.name,
        h.pos,
        h.held.join(''),
        h.cards.join(','),
        h.gear.map((g) => g.id).join(','),
      ]),
    });
  const args = { seed: 7, heroes: [3, 1], type: 'elite', tier: 2, kit: 'tier' };
  const a = T.quickMission(args);
  assert.equal(snap(a.mission), snap(T.quickMission(args).mission), 'the same arguments, the same mission');
  assert.notEqual(snap(a.mission), snap(T.quickMission({ ...args, seed: 8 }).mission));

  // the kit: the starting six, or what the squad would carry by that tier
  const start = T.quickMission({ ...args, kit: 'start' });
  assert.ok(start.heroes.every((h) => h.gear.length === 0 && h.cards.length === T.RULES.START_CARDS));
  assert.ok(
    a.heroes.every((h) => h.gear.length === 1),
    'a piece of gear by tier 2',
  );
  const late = T.quickMission({ ...args, type: 'boss', tier: 3 });
  assert.ok(late.heroes.every((h) => h.gear.length === 2 && h.boons.length === 1));

  // the board belongs to the seed, the mission and the tier — not to the squad or its kit
  const board = (m) => JSON.stringify([m.board.nodes, m.board.edges, m.enemies.map((e) => [e.type, e.pos, e.hp])]);
  assert.equal(board(start.mission), board(a.mission));
  assert.equal(board(T.quickMission({ ...args, heroes: [0, 5] }).mission), board(a.mission));

  // the mission is the first node of a whole Tide, which goes on when it is won
  const node = a.map.all[a.nodeId];
  assert.deepEqual([node.row, node.type, node.tier], [0, 'elite', 2]);
  Object.assign(a.mission, { over: true, won: true });
  T.missionRewards(a, a.mission);
  T.applyMissionResult(a);
  T.finishNode(a);
  assert.equal(a.phase, 'map');
  assert.ok(a.available.length && a.available.every((id) => a.map.all[id].row === 1));

  // and a Heart beaten this way ends the run like any other
  Object.assign(late.mission, { over: true, won: true });
  T.missionRewards(late, late.mission);
  T.applyMissionResult(late);
  T.finishNode(late);
  assert.deepEqual([late.phase, late.won, late.over], ['summary', true, true]);
});

test('every hero sets out with a few Ethereal faces awakened (RULES.START_AWAKE)', () => {
  const need = T.RULES.START_AWAKE;
  assert.ok(need >= 2 && T.RULES.ETHEREAL_MIN_E === 1);
  // the pre-made heroes as written
  T.PREBUILTS.forEach((pb) => {
    const h = T.heroFromPrebuilt(T.newRun(1), pb);
    assert.ok(T.awakenedCount(h) >= need, `${pb.name} starts with ${T.awakenedCount(h)} awakened`);
  });
  // drafted heroes, before any choice of the player's: awaken() spends from the starting UP
  for (let i = 0; i < 30; i++) {
    const run = T.newRun(900 + i);
    const h = T.newDraftHero(run, 'Test', 'the drafted', ['owl', 'eel']);
    while (h.cards.length < T.RULES.START_CARDS) {
      const pick = T.draftPack(run, h, 4)[0];
      T.addCard(h, pick);
    }
    T.awaken(h);
    assert.equal(T.awakenedCount(h), need);
    assert.equal(h.upUnspent, T.RULES.START_UP - need, 'paid from the starting UP, nothing free');
    T.autoAllocate(h);
    assert.ok(T.awakenedCount(h) >= need);
  }
  // awaken() never takes back a point the player placed, and does nothing without UP
  const run = T.newRun(77);
  const h = T.heroFromPrebuilt(run, T.PREBUILTS[0]);
  T.respecHero(h);
  h.upUnspent = 1;
  T.awaken(h);
  assert.equal(T.awakenedCount(h), 1, 'one UP awakens one card');
  assert.equal(h.upUnspent, 0);
});
