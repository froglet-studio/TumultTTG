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
    const rng = T.runStream(run, 'squad');
    for (let k = 0; k < 2; k++) {
      const species = rng.shuffle(T.SPECIES_ORDER.filter((s) => s !== 'human')).slice(0, 2);
      const h = T.newDraftHero(run, 'Drafted' + k, 'the drafted', species);
      for (let p = 0; p < T.RULES.START_CARDS; p++) {
        const pack = T.draftPack(run, h, 4);
        if (!pack.length) break;
        T.addCard(h, pack[rng.int(pack.length)]);
      }
      T.autoAllocate(h);
      run.heroes.push(h);
    }
  }

  /** Give a squad the kit it would plausibly have at this tier of a real run (T.addProgression). */
  const addProgression = (run, tier) => T.addProgression(run, tier);

  /**
   * Auto-play a mission to its end. player: 'weak' is the heuristic autoplayer (T.autoHeroPhase),
   * 'strong' the look-ahead player (T.smartHeroPhase). A mission still going after maxRounds is
   * called lost: neither side could finish the other.
   */
  function playMission(m, { player = 'weak', maxRounds = 40 } = {}) {
    const phase = player === 'strong' ? T.smartHeroPhase : T.autoHeroPhase;
    let guard = 0;
    while (!m.over && guard++ < maxRounds) {
      phase(m);
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
   * Auto-play a whole run (map, missions, havens, events) with simple choices; a run already on
   * its map is played on from where it is. The simulated player's choices come from a random
   * stream of their own ('player'), so they never move the game's. `player` plays the missions:
   * 'weak' (the heuristic) or 'strong' (look-ahead).
   * Returns { won, lastRow, missions, missionWins, endedBy, run }.
   *
   * viaSaves: after every node — and once in the middle of every mission — the run is written out
   * as a save and the game goes on from what was read back. `run` in the result is that last copy;
   * the run passed in is left wherever it was first saved.
   */
  function playRun(run, { viaSaves = false, player = 'weak' } = {}) {
    if (!run.map) T.startMap(run);
    const out = { won: false, lastRow: 0, missions: 0, missionWins: 0, endedBy: null, run };
    const reload = () => {
      if (viaSaves) run = out.run = T.deserializeRun(T.serializeRun(run));
    };
    let guard = 0;
    while (!run.over && guard++ < 30) {
      const id = T.runStream(run, 'player').pick(run.available);
      const node = run.map.all[id];
      out.lastRow = node.row;
      T.chooseNode(run, id);
      if (run.phase === 'mission') {
        if (viaSaves) {
          // two rounds in, with the squad's half of the third played: save, and resume from the save
          const phase = player === 'strong' ? T.smartHeroPhase : T.autoHeroPhase;
          for (let r = 0; r < 2 && !run.mission.over; r++) {
            phase(run.mission);
            if (!run.mission.over) T.endHeroPhase(run.mission);
          }
          if (!run.mission.over) phase(run.mission);
          reload();
          if (!run.mission.over) T.endHeroPhase(run.mission);
        }
        const m = playMission(run.mission, { player });
        out.missions++;
        if (m.won) out.missionWins++;
        T.missionRewards(run, m);
        T.applyMissionResult(run);
        if (run.over) {
          if (!run.won) out.endedBy = node.type + ' t' + node.tier;
          break;
        }
        const rw = run.lastReward;
        run.heroes.forEach((h, hi) => {
          if (rw.picked[hi]) return;
          if (rw.offers[hi].length) T.takeOfferedCard(run, rw.offers[hi][0], hi);
          else T.skipOfferedCard(run, hi);
        });
        if (rw.boons) run.heroes.forEach((h, hi) => T.takeBoon(run, rw.boons[hi][0], hi));
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
      reload();
    }
    out.won = !!run.won;
    return out;
  }

  /**
   * Everything in a value that is not plain data, as a list of "path :: what" (empty = plain):
   * functions, class instances, undefined, numbers JSON cannot write, and anything reachable by
   * two paths — a copy or a save would quietly split it in two.
   */
  function plainProblems(value) {
    const problems = [];
    const seen = new Map();
    (function walk(v, at) {
      if (v === null) return;
      const t = typeof v;
      if (t === 'function') return problems.push(`${at} :: a function`);
      if (t === 'undefined') return problems.push(`${at} :: undefined`);
      if (t === 'number' && !Number.isFinite(v)) return problems.push(`${at} :: ${v}`);
      if (t !== 'object') return;
      if (seen.has(v)) return problems.push(`${at} :: the same object as ${seen.get(v)}`);
      seen.set(v, at);
      if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${at}[${i}]`));
      const proto = Object.getPrototypeOf(v);
      if (proto !== Object.prototype && proto !== null)
        return problems.push(`${at} :: a ${(proto.constructor && proto.constructor.name) || 'non-plain object'}`);
      for (const k of Object.keys(v)) walk(v[k], `${at}.${k}`);
    })(value, 'state');
    return problems;
  }

  /**
   * A controlled arena for one hero holding the given card(s): plenty of dice, a foe
   * adjacent and a foe that shares the hero's zone. Returns { run, m, h, ally, adj, zone }, where
   * adj and zone are those two foes (either may be undefined on a cramped board). The buddy is
   * moved two steps off and the zone foe out of reach where the page allows, so the tester always
   * has a free node to step to. `page` names the atlas page (otherwise the board's stream picks one).
   */
  function arena(cardIds, { up = [2, 2], archetype = 'swarm', tier = 2, seed = 78, page } = {}) {
    const ids = [].concat(cardIds);
    const run = T.newRun(seed);
    const h = T.makeHero({
      id: 'x',
      name: 'Tester',
      species: ['human', T.CARD[ids[0]].sp, 'eel'],
      cards: ids,
      up: Object.fromEntries(ids.map((id) => [id, up.slice()])),
    });
    const ally = T.makeHero({ id: 'y', name: 'Buddy', species: ['human', 'owl', 'gecko'], cards: ['owl_talon'] });
    run.heroes = [h, ally];
    run.crystals = 20;
    T.launchMission(run, archetype, tier, page);
    const m = run.mission;
    h.held = ['AP', 'AP', 'AP', 'AP', 'AP', 'O', 'O', 'O', 'M', 'C', 'S', 'T'];
    h.pool = T.RULES.POOL - h.held.length;
    // the buddy stands two steps off, so the tester keeps room to step even on a narrow edge of a page
    const B = T.Board;
    if (B.walkNeighbors(m.board, h.pos).includes(ally.pos)) {
      const two = B.walkNeighbors(m.board, h.pos)
        .flatMap((n) => B.walkNeighbors(m.board, n))
        .filter((n) => n !== h.pos && !B.walkNeighbors(m.board, h.pos).includes(n) && !T.occupied(m, n));
      if (two.length) ally.pos = two[0];
    }
    const adjNode = T.Board.walkNeighbors(m.board, h.pos).find((n) => !T.occupied(m, n));
    if (adjNode) m.enemies[0].pos = adjNode;
    // the zone foe stands off, out of reach of a step where the board allows, so the hero is never boxed in
    const near = T.Board.walkNeighbors(m.board, h.pos);
    const zoneNodes = Object.values(m.board.nodes).filter(
      (n) => n.id !== h.pos && T.Board.sharesZone(m.board, n.id, h.pos) && !T.occupied(m, n.id),
    );
    const zoneNode = zoneNodes.find((n) => !near.includes(n.id)) || zoneNodes[0];
    if (zoneNode && m.enemies[1]) m.enemies[1].pos = zoneNode.id;
    return { run, m, h, ally, adj: adjNode ? m.enemies[0] : undefined, zone: zoneNode ? m.enemies[1] : undefined };
  }

  /**
   * Play one face from an arena, choosing the first legal target or node unless `choose`
   * picks another: choose(tg, scene) returns { target } or { node }. Returns T.playFace's
   * result, or { ok: false, why } if the face cannot be played.
   */
  function playIn(scene, cardId, faceKey, choose) {
    const { m, h } = scene;
    const chk = T.canPlay(m, h, cardId, faceKey);
    if (!chk.ok) return chk;
    const ctx = { choice: 'pull' };
    if (chk.tg.need === 'foe' || chk.tg.need === 'foeOrAlly') ctx.target = chk.tg.options[0];
    if (chk.tg.need === 'node') ctx.node = chk.tg.options[0];
    if (choose) Object.assign(ctx, choose(chk.tg, scene));
    return T.playFace(m, h, cardId, faceKey, ctx);
  }

  /**
   * Fire one face of one card in the arena. Returns { status: 'fired' | 'unplayable', why? }
   * and throws if the engine logs an effect error or an unimplemented verb, or if the face leaves
   * anything in the mission that is not plain data. `arrange(scene)` may rearrange the arena
   * first; `choose` is passed to playIn.
   */
  function fireFace(cardId, faceKey, { arrange, choose } = {}) {
    const scene = arena(cardId);
    if (arrange) arrange(scene);
    const r = playIn(scene, cardId, faceKey, choose);
    if (!r.ok) return { status: 'unplayable', why: r.why };
    const bad = scene.m.log.filter((l) => /Effect error|unimplemented/.test(l.text));
    if (bad.length) throw new Error(bad.map((l) => l.text).join('; '));
    assertPlain(scene.m, `after ${cardId} ${faceKey}`);
    T.endHeroPhase(scene.m);
    assertPlain(scene.m, `a round after ${cardId} ${faceKey}`);
    return { status: 'fired' };
  }
  /** Throw unless the mission is plain data (see plainProblems). */
  function assertPlain(m, when) {
    const problems = plainProblems(m);
    if (problems.length) throw new Error(`mission state is not plain data ${when}: ${problems.slice(0, 4).join('; ')}`);
  }

  return {
    T,
    ARCHETYPES,
    prebuiltSquad,
    draftedSquad,
    addProgression,
    playMission,
    playRun,
    plainProblems,
    assertPlain,
    arena,
    playIn,
    fireFace,
  };
}

module.exports = { createHarness, ARCHETYPES };
