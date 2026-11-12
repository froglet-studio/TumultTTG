'use strict';
/**
 * Shared headless harness: build squads, auto-play missions and whole runs,
 * and fire single card faces. Used by tools/sim.js, tools/audit.js and test/.
 */
const loadTumult = require('./load');

const ARCHETYPES = ['swarm', 'vault', 'hidden', 'cascade', 'elite', 'boss'];

function createHarness(T = loadTumult()) {
  /** Two pre-made heroes (indices into T.PREBUILTS), UP auto-spent. */
  function prebuiltSquad(run, i, j) {
    run.heroes = [T.heroFromPrebuilt(run, T.PREBUILTS[i]), T.heroFromPrebuilt(run, T.PREBUILTS[j])];
    run.heroes.forEach((h) => T.autoAllocate(h));
  }

  /** Two heroes drafted at random from packs (random bloodlines, random picks). */
  function draftedSquad(run) {
    run.heroes = [];
    for (let k = 0; k < 2; k++) {
      const species = run.rng.shuffle(T.SPECIES_ORDER.filter((s) => s !== 'human')).slice(0, 2);
      const h = T.newDraftHero(run, 'Drafted' + k, 'the drafted', species);
      for (let p = 0; p < T.RULES.START_CARDS; p++) {
        const pack = T.draftPack(run, h, 4);
        if (!pack.length) break;
        T.addCard(h, pack[run.rng.int(pack.length)]);
      }
      T.autoAllocate(h);
      run.heroes.push(h);
    }
  }

  /** Give a squad the kit it would plausibly have at this tier of a real run. */
  function addProgression(run, tier) {
    run.heroes.forEach((h) => {
      h.upUnspent += (tier - 1) * 6;
      T.autoAllocate(h);
    });
    if (tier >= 2) {
      run.heroes.forEach((h) => {
        h.gear.push({ id: T.GEAR[run.rng.int(T.GEAR.length)].id, cds: [0, 0] });
        if (tier >= 3) {
          h.gear.push({ id: T.GEAR[run.rng.int(T.GEAR.length)].id, cds: [0, 0] });
          const extra = T.cardOffer(run, 1)[0];
          if (extra) T.addCard(h, extra);
          h.boons.push(T.boonOffer(run, 1)[0]);
          T.autoAllocate(h);
        }
      });
    }
    run.crystals = 10 + tier * 5;
  }

  /** Auto-play a mission to its end with the heuristic hero autoplayer. */
  function playMission(m, maxRounds = 40) {
    let guard = 0;
    while (!m.over && guard++ < maxRounds) {
      T.autoHeroPhase(m);
      if (m.over) break;
      T.endHeroPhase(m);
    }
    if (!m.over) {
      m.lost = true;
      m.over = true;
    }
    return m;
  }

  /**
   * Auto-play a whole run (map, missions, havens, events) with simple choices.
   * Returns { won, lastRow, missions, missionWins, endedBy }.
   */
  function playRun(run, { checkSave = true } = {}) {
    T.startMap(run);
    const out = { won: false, lastRow: 0, missions: 0, missionWins: 0, endedBy: null };
    let guard = 0;
    while (!run.over && guard++ < 30) {
      const id = run.rng.pick(run.available);
      const node = run.map.all[id];
      out.lastRow = node.row;
      T.chooseNode(run, id);
      if (run.phase === 'mission') {
        playMission(run.mission);
        out.missions++;
        if (run.mission.won) out.missionWins++;
        T.missionRewards(run, run.mission);
        T.applyMissionResult(run);
        if (run.over) {
          if (!run.won) out.endedBy = node.type + ' t' + node.tier;
          break;
        }
        const rw = run.lastReward;
        if (rw.offer && rw.offer.length) {
          const cid = rw.offer[0];
          const hi = run.heroes.findIndex((h) => T.canAddCard(h, cid).ok);
          if (hi >= 0) T.takeOfferedCard(run, cid, hi);
          else T.skipOfferedCard(run);
        }
        if (rw.boon && rw.boon.length) T.takeBoon(run, rw.boon[0], run.rng.int(2));
        run.heroes.forEach((h) => T.autoAllocate(h));
        T.finishNode(run);
      } else if (run.phase === 'haven') {
        T.havenRest(run, run.crystals >= 6);
        for (const g of run.haven.gear.slice()) {
          const hi = run.heroes.findIndex((h) => h.gear.length < 2);
          if (hi >= 0 && run.crystals >= T.GEAR_BY[g].price) T.buyGear(run, g, hi);
        }
        T.finishNode(run);
      } else if (run.phase === 'event') {
        const r = T.resolveEvent(run, 0, 0);
        if (r.followup && r.followup.kind === 'cardPick') {
          const cid = r.followup.offer[0];
          const hi = run.heroes.findIndex((h) => T.canAddCard(h, cid).ok);
          if (hi >= 0) T.addCard(run.heroes[hi], cid);
        }
        if (r.followup && r.followup.kind === 'tradeCard') {
          const h = run.heroes[r.followup.heroIdx];
          T.tradeCard(run, r.followup.heroIdx, h.cards[0]);
        }
        run.heroes.forEach((h) => T.autoAllocate(h));
        T.finishNode(run);
      }
      if (checkSave) {
        const back = T.deserializeRun(T.serializeRun(run));
        if (back.heroes.length !== run.heroes.length) throw new Error('save round-trip lost heroes');
      }
    }
    out.won = !!run.won;
    return out;
  }

  /**
   * Fire one face of one card in a controlled arena (plenty of dice, a foe
   * adjacent and a foe in lane). Returns { status: 'fired' | 'unplayable', why? }
   * and throws if the engine logs an effect error or an unimplemented verb.
   */
  function fireFace(cardId, faceKey) {
    const card = T.CARD[cardId];
    const run = T.newRun(77);
    const h = T.makeHero({
      id: 'x',
      name: 'Tester',
      species: ['human', card.sp, 'eel'],
      cards: [cardId],
      up: { [cardId]: [2, 2] },
    });
    const ally = T.makeHero({ id: 'y', name: 'Buddy', species: ['human', 'owl', 'gecko'], cards: ['owl_talon'] });
    run.heroes = [h, ally];
    run.crystals = 20;
    T.launchMission(run, 'swarm', 2);
    const m = run.mission;
    h.held = ['AP', 'AP', 'AP', 'AP', 'AP', 'O', 'O', 'O', 'M', 'C', 'S', 'T'];
    h.pool = T.RULES.POOL - h.held.length;
    const adj = T.Board.walkNeighbors(m.board, h.pos).find((n) => !T.occupied(m, n));
    if (adj) m.enemies[0].pos = adj;
    const lane = Object.values(m.board.nodes).find(
      (n) => n.lane === m.board.nodes[h.pos].lane && n.id !== h.pos && !T.occupied(m, n.id),
    );
    if (lane && m.enemies[1]) m.enemies[1].pos = lane.id;
    const chk = T.canPlay(m, h, cardId, faceKey);
    if (!chk.ok) return { status: 'unplayable', why: chk.why };
    const ctx = { choice: 'pull' };
    if (chk.tg.need === 'foe' || chk.tg.need === 'foeOrAlly') ctx.target = chk.tg.options[0];
    if (chk.tg.need === 'node') ctx.node = chk.tg.options[0];
    const r = T.playFace(m, h, cardId, faceKey, ctx);
    if (!r.ok) throw new Error('play failed: ' + r.why);
    const bad = m.log.filter((l) => /Effect error|unimplemented/.test(l.text));
    if (bad.length) throw new Error(bad.map((l) => l.text).join('; '));
    T.endHeroPhase(m);
    return { status: 'fired' };
  }

  return { T, ARCHETYPES, prebuiltSquad, draftedSquad, addProgression, playMission, playRun, fireFace };
}

module.exports = { createHarness, ARCHETYPES };
