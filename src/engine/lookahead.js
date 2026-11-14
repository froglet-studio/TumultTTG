/* ============================================================================
   TUMULT — THE LOOK-AHEAD PLAYER (roadmap F2)
   A player that knows no card by name. It lists every legal action, tries each
   on a copy of the mission, lets the round play out there — the enemies have
   already declared what they will do — and scores what is left with one
   evaluation shared by every mission type. It searches a few actions deep with
   a beam, so a step that only sets up the next one is not thrown away.

   It never sees dice that have not been rolled: a copy it imagines on draws
   from streams of its own, so a draw or a reroll it tries is one possible
   outcome, not the one to come.

   The heuristic autoplayer in ai.js stays as the weak player. The gap between
   the two is how much a mission rewards thinking.
   ========================================================================== */
(function (T) {
  const B = T.Board;
  const R = () => T.RULES;
  const ETHERIONS = ['M', 'C', 'S', 'T'];

  /* ───────────────────────────── ACTIONS ─────────────────────────────
     An action is plain data: { t, hero, … }. `hero` is an index into m.heroes.
       face      { card, face: 'P'|'E', target?, node?, choice? }
       walk      { node }
       interact  { node }
       rally     {}
       basic     { basic: 'strike'|'brace'|'shove', target? }   what every hero can do (T.BASIC)
       gear      { gear, ability, target?, node?, choice? }
       item      { item }
       valve     {}                 fold one of each etherion into an Omni
     A list of them, applied in order to the same mission, replays it. */

  /** Every way to resolve one face or gear ability: its targets, and push-or-pull where it asks. */
  function resolutions(tg, recipe) {
    const choices = recipe.fx.some((x) => x.v === 'force' && x.kind === 'choose') ? ['push', 'pull'] : [null];
    const picks =
      tg.need === 'node'
        ? tg.options.map((node) => ({ node }))
        : tg.need === 'none'
          ? [{}]
          : tg.options.map((target) => ({ target }));
    const out = [];
    for (const pick of picks) for (const choice of choices) out.push(choice ? Object.assign({ choice }, pick) : pick);
    return out;
  }

  /** Everything the squad could legally do next, as a list of actions. */
  T.legalActions = function (m) {
    const out = [];
    if (m.over || m.phase !== 'hero') return out;
    m.heroes.forEach((h, hero) => {
      if (h.downed || h.rested) return;
      const ap = T.apValue(h);
      for (const card of h.cards)
        for (const face of ['P', 'E']) {
          const chk = T.canPlay(m, h, card, face);
          if (!chk.ok) continue;
          for (const r of resolutions(chk.tg, T.CARD[card][face]))
            out.push(Object.assign({ t: 'face', hero, card, face }, r));
        }
      const steps = Math.min(3, Math.floor(ap / R().MOVE_AP) + (h.freeMove || 0));
      if (steps > 0 && !h.states.Rooted && !h.states.SlowSelf)
        for (const node of T.reachableWalk(m, h, steps, false)) out.push({ t: 'walk', hero, node });
      if (ap >= R().INTERACT_AP)
        for (const node of [h.pos].concat(B.walkNeighbors(m.board, h.pos))) {
          const nd = m.board.nodes[node];
          if (!nd.objective || (node !== h.pos && nd.height)) continue;
          if (worthInteracting(m, nd.objective, h)) out.push({ t: 'interact', hero, node });
        }
      for (const b of T.BASIC) {
        const chk = T.canUseBasic(m, h, b.id);
        if (chk.ok)
          for (const r of resolutions(chk.tg, b)) out.push(Object.assign({ t: 'basic', hero, basic: b.id }, r));
      }
      const ally = T.allyOf(m, h);
      if (ally && ally.downed && ap >= R().RALLY_AP && B.adjacent(m.board, h.pos, ally.pos))
        out.push({ t: 'rally', hero });
      h.gear.forEach((g, gear) =>
        T.GEAR_BY[g.id].abilities.forEach((ab, ability) => {
          if (g.cds[ability] > 0 || m.crystals < ab.cost) return;
          const tg = T.targetsFor(m, h, ab.tgt, ab, 0, 0);
          if (tg.invalid || (tg.need !== 'none' && !(tg.options && tg.options.length))) return;
          for (const r of resolutions(tg, ab)) out.push(Object.assign({ t: 'gear', hero, gear, ability }, r));
        }),
      );
      h.consumables.forEach((id, item) => {
        if (h.consumables.indexOf(id) === item) out.push({ t: 'item', hero, item }); // two of a kind are one choice
      });
      if (ETHERIONS.every((f) => h.held.includes(f))) out.push({ t: 'valve', hero });
    });
    return out;
  };
  /** Interacting costs AP whatever is there: leave out the ones that can do nothing. */
  function worthInteracting(m, o, h) {
    const ob = m.objective;
    if (o.kind === 'beacon' || o.kind === 'dock') return false;
    if (o.kind === 'crate') return ob.kind === 'salvage' && !h.carrying;
    if (o.kind === 'lever') return ob.kind === 'vault' && !m.board.ramp;
    if (o.kind === 'cache') return ob.kind === 'find' && !(o.searched && !o.real);
    return true;
  }

  /** Do one action. Returns what the engine returns: { ok, why? }. */
  T.applyAction = function (m, a) {
    const h = m.heroes[a.hero];
    if (!h) return { ok: false, why: 'no such hero' };
    const ctx = { target: a.target, node: a.node, choice: a.choice };
    switch (a.t) {
      case 'face': {
        const r = T.playFace(m, h, a.card, a.face, ctx);
        // A face may let its player reroll banked dice. Which ones is a choice of its own; this player
        // always rerolls its plain AP dice, the faces with the most to gain.
        if (r.ok && r.ctx.pendingReroll) {
          const plain = [];
          h.held.forEach((f, i) => {
            if (f === 'AP' && plain.length < r.ctx.pendingReroll) plain.push(i);
          });
          if (plain.length) T.rerollHeld(m, h, plain);
        }
        return r;
      }
      case 'walk':
        return T.walk(m, h, a.node);
      case 'interact':
        return T.doInteract(m, h, a.node, false);
      case 'rally':
        return T.rally(m, h);
      case 'basic':
        return T.useBasic(m, h, a.basic, ctx);
      case 'gear':
        return T.useGear(m, h, a.gear, a.ability, ctx);
      case 'item':
        return T.useConsumable(m, h, a.item);
      case 'valve':
        return { ok: T.valve(m, h) };
      default:
        return { ok: false, why: 'unknown action ' + a.t };
    }
  };
  /** An action in a few words, for logs and tests: "Cavitt: Jet Propulsion — Jet → node 6". */
  T.describeAction = function (m, a) {
    const h = m.heroes[a.hero];
    const at = a.node != null ? ` → node ${a.node}` : '';
    const who = (uid) => {
      const e = m.enemies.concat(m.heroes, m.decoys).find((x) => x.uid === uid);
      return e ? ` → ${e.name}` : '';
    };
    const tail = (a.target != null ? who(a.target) : at) + (a.choice ? ` (${a.choice})` : '');
    if (a.t === 'face') return `${h.name}: ${T.CARD[a.card].name} — ${T.CARD[a.card][a.face].n}${tail}`;
    if (a.t === 'basic') return `${h.name}: ${T.BASIC_BY[a.basic].n}${tail}`;
    if (a.t === 'gear') {
      const def = T.GEAR_BY[h.gear[a.gear].id];
      return `${h.name}: ${def.name} — ${def.abilities[a.ability].n}${tail}`;
    }
    if (a.t === 'item') return `${h.name}: ${T.CONSUMABLE_BY[h.consumables[a.item]].name}`;
    return `${h.name}: ${a.t}${at}`;
  };

  /* ───────────────────────────── EVALUATION ─────────────────────────────
     One measure for every mission, in points of about one hero vitality each. */

  /** How far along the mission's objective is, from 0 to 1. */
  T.objectiveProgress = function (m) {
    const ob = m.objective;
    if (m.won) return 1;
    if (!ob) return 0;
    const part = (done, need) => Math.min(1, (done || 0) / (need || 1));
    if (ob.kind === 'hold') return part(ob.held, ob.need);
    if (ob.kind === 'valve') return part(ob.done, ob.need);
    // the winch only matters until the seals are reached: a squad that climbs skips it
    if (ob.kind === 'vault')
      return (
        Math.max(m.board.ramp ? 0.4 : 0.4 * part(ob.leverDone, ob.leverNeed), ob.done ? 0.4 : 0) +
        0.6 * part(ob.done, ob.need)
      );
    if (ob.kind === 'find') {
      if (ob.found) return 0.5 + 0.5 * part(ob.done, ob.need);
      const searched = ob.candidates.filter((c) => m.board.nodes[c].objective.searched).length;
      return 0.4 * part(searched, ob.candidates.length);
    }
    // a crate on someone's back is most of the way there
    if (ob.kind === 'salvage')
      return part(ob.done + 0.5 * m.heroes.filter((h) => !h.downed && h.carrying).length, ob.need);
    if (ob.kind === 'kill') {
      const foes = m.enemies.filter((e) => e.type === ob.target);
      if (!foes.length) return 0;
      const left = foes.reduce((s, e) => s + (e.alive ? Math.max(0, e.hp) + e.shield : 0), 0);
      const full = foes.reduce((s, e) => s + e.maxHp + e.baseShield, 0);
      return 1 - left / full;
    }
    return 0;
  };
  /** Where the objective next needs someone: [{ node, on }] — on the node itself, or beside it will do. */
  function goals(m, h) {
    const ob = m.objective;
    if (!ob) return [];
    // salvage: a carrier is wanted at the near edge, everyone else beside a crate
    if (ob.kind === 'salvage') {
      if (h && h.carrying) return ob.docks.map((node) => ({ node, on: true }));
      return Object.values(m.board.nodes)
        .filter((n) => n.objective && n.objective.kind === 'crate')
        .map((n) => ({ node: n.id, on: false }));
    }
    if (ob.kind === 'hold' || ob.kind === 'valve') return [{ node: ob.node, on: false }];
    if (ob.kind === 'vault')
      return [{ node: ob.node, on: true }].concat(m.board.ramp ? [] : [{ node: ob.leverNode, on: false }]);
    if (ob.kind === 'find')
      return ob.found
        ? [{ node: ob.real, on: false }]
        : ob.candidates.filter((c) => !m.board.nodes[c].objective.searched).map((node) => ({ node, on: true }));
    if (ob.kind === 'kill')
      return T.liveEnemies(m)
        .filter((e) => e.type === ob.target)
        .map((e) => ({ node: e.pos, on: false }));
    return [];
  }
  /** Steps on foot from a hero to where a goal can be worked (a ledge counts only for those who can stand on it). */
  function stepsTo(m, h, goal) {
    const d = B.dist(m.board, h.pos, goal.node, true);
    if (d == null || !Number.isFinite(d)) return 9;
    return Math.max(0, goal.on ? d : d - 1);
  }

  T.EVAL = {
    win: 1000,
    progress: 70, // the whole objective
    heroHp: 1, // per point of vitality
    heroDown: 18, // on top of the vitality lost
    foeHp: 0.9, // per point of a foe's vitality and shield still standing
    foeAlive: 4, // per foe still standing: it will act again
    clock: 2.5, // per round left on a clock
    approach: 1.6, // per step between a hero and the objective — the nearest in full, the next at half
    dice: 0.5, // per die kept for next round, up to four a hero; a hoard beyond that is worth little
    hoard: 0.1,
    short: 5, // per AP held by a hero who stands where the objective can be worked and cannot yet pay for an Interact
    cooldown: 0.25, // per column a card still has to travel
    crystal: 0.4,
    item: 2,
  };
  /** The worth of a position to the squad: higher is better. Read after the round has played out. */
  T.evaluate = function (m) {
    const W = T.EVAL;
    if (m.over) return m.won ? W.win + liveVitality(m) - m.round : -W.win + W.progress * T.objectiveProgress(m);
    let s = W.progress * T.objectiveProgress(m);
    for (const h of m.heroes) {
      if (h.downed) {
        s -= W.heroDown;
        continue;
      }
      s += W.heroHp * h.hp;
      const kept = T.apValue(h) + ETHERIONS.concat('O').reduce((n, f) => n + T.elCount(h, f), 0);
      s += W.dice * Math.min(kept, 4) + W.hoard * Math.max(0, kept - 4);
      s -= W.cooldown * h.track.reduce((n, t) => n + t.left + (t.phase === 'dur' ? t.cd : 0), 0);
      s += W.item * h.consumables.length;
    }
    for (const e of m.enemies) if (e.alive) s -= W.foeAlive + W.foeHp * (Math.max(0, e.hp) + e.shield);
    if (m.clock) s += W.clock * m.clock.value;
    s += W.crystal * m.crystals;
    const gs = goals(m);
    const perHero = m.objective && m.objective.kind === 'salvage';
    if (gs.length || perHero) {
      const away = T.liveHeroes(m)
        .map((h) => {
          const mine = perHero ? goals(m, h) : gs;
          return mine.length ? Math.min(...mine.map((g) => stepsTo(m, h, g))) : 0;
        })
        .sort((a, b) => a - b);
      away.forEach((steps, i) => (s -= W.approach * steps * (i ? 0.5 : 1)));
      // A hero beside an objective that takes an Interact, and short of the AP for one, should hold
      // what they have: it is next round's progress. Without this they spend it on anything at all.
      if (WORKED.includes(m.objective.kind))
        for (const h of T.liveHeroes(m)) {
          const ap = T.apValue(h);
          if (ap < R().INTERACT_AP && !h.carrying && goals(m, h).some((g) => stepsTo(m, h, g) === 0)) s += W.short * ap;
        }
    }
    return s;
  };
  const WORKED = ['vault', 'valve', 'find', 'salvage']; // objectives advanced by Interact; a beacon is held, a foe is fought
  const liveVitality = (m) => m.heroes.reduce((s, h) => s + (h.downed ? 0 : h.hp), 0);

  /* ───────────────────────────── SEARCH ───────────────────────────── */

  /**
   * A copy to imagine on — what a planner, a preview or a hint must work from, never the mission
   * itself. It is marked `imagined`, carries no history, and holds nothing the squad cannot know:
   *  - its dice and reinforcements come from streams of their own, seeded from what is on the table
   *    and not from the real streams, so a draw or a reroll tried here is one possible outcome and
   *    never the one to come;
   *  - an unfound cache is wherever a searcher would look first — the unsearched one nearest the
   *    squad — whichever the real one is.
   */
  T.imagine = function (m) {
    const c = T.clone(Object.assign({}, m, { log: [], fx: [], imagined: true }));
    const tag = `imagine:${m.round}:${m.heroes.map((h) => h.held.length + h.track.length).join('.')}`;
    c.rngs = { dice: T.subSeed(m.seed, tag + ':dice'), foes: T.subSeed(m.seed, tag + ':foes') };
    const ob = c.objective;
    if (ob && ob.kind === 'find' && !ob.found) {
      const open = ob.candidates.filter((n) => !c.board.nodes[n].objective.searched);
      const reach = (n) => Math.min(...T.liveHeroes(c).map((h) => B.dist(c.board, h.pos, n, true)), 99);
      const guess = open.sort((a, b) => reach(a) - reach(b) || a - b)[0];
      if (guess != null) {
        ob.real = guess;
        for (const n of ob.candidates) c.board.nodes[n].objective.real = n === guess;
      }
    }
    return c;
  };
  /**
   * What ending the round now would do — the answer to "what happens if I stop here?" The enemies
   * do what they have declared, hazards and wearing-down effects tick, the objective and the clock
   * move. None of that is random, so this is not a guess: it is what will happen. It is worked out
   * on an imagined copy and touches nothing. Returns null once the mission is over.
   *   heroes    [{ name, hp, after, downed, to }]   vitality now and after; `to` if they are moved
   *   foes      [{ uid, name, from, to, falls }]    where each ends up, and whether it falls
   *   progress  { before, after }                   the objective, 0 to 1
   *   clock     rounds left afterwards, or null
   *   result    'won' | 'lost' | null               if the round ends the mission
   */
  T.forecast = function (m) {
    if (m.over) return null;
    const c = T.imagine(m);
    T.finishRound(c);
    return {
      heroes: m.heroes.map((h, i) => {
        const a = c.heroes[i];
        return {
          name: h.name,
          hp: Math.max(0, h.hp),
          after: Math.max(0, a.hp),
          downed: !h.downed && a.downed,
          to: a.pos !== h.pos ? a.pos : null,
        };
      }),
      foes: T.liveEnemies(m).map((e) => {
        const a = c.enemies.find((x) => x.uid === e.uid);
        return { uid: e.uid, name: e.name, from: e.pos, to: a.pos, falls: !a.alive };
      }),
      progress: { before: T.objectiveProgress(m), after: T.objectiveProgress(c) },
      clock: c.clock ? c.clock.value : null,
      result: c.over ? (c.won ? 'won' : 'lost') : null,
    };
  };
  const scratch = (m) => T.clone(Object.assign({}, m, { log: [], fx: [] }));
  /** What the position is worth if the squad stops here: the declared enemy turn plays out, then it is scored. */
  function worthIfStopped(m) {
    if (!m.over) T.finishRound(m);
    return T.evaluate(m);
  }

  /**
   * Plan the rest of the squad's phase: the best sequence of actions a beam search finds, as a
   * list (empty = do nothing more). Nothing is changed; the plan is made on copies.
   *   width  how many lines of play are kept at each step
   *   depth  how many actions ahead it looks
   */
  T.planHeroPhase = function (m, { width = 2, depth = 4 } = {}) {
    const root = T.imagine(m);
    let best = { seq: [], score: worthIfStopped(scratch(root)) };
    let beam = [{ m: root, seq: [], score: best.score }];
    for (let d = 0; d < depth && beam.length; d++) {
      const kids = [];
      for (const node of beam)
        for (const a of T.legalActions(node.m)) {
          const c = scratch(node.m);
          if (!T.applyAction(c, a).ok) continue;
          kids.push({ from: node, a, score: worthIfStopped(c) });
        }
      if (!kids.length) break;
      kids.sort((x, y) => y.score - x.score);
      // keep the best few lines, one per outcome: the same position reached in another order scores the same
      const kept = [];
      for (const k of kids) {
        if (kept.length >= width) break;
        if (kept.some((x) => x.score === k.score && x.from === k.from && sameSpot(x.a, k.a))) continue;
        kept.push(k);
      }
      beam = kept.map((k) => {
        const c = scratch(k.from.m);
        T.applyAction(c, k.a);
        return { m: c, seq: k.from.seq.concat([k.a]), score: k.score };
      });
      if (beam[0].score > best.score + 1e-9) best = { seq: beam[0].seq, score: beam[0].score };
    }
    return best.seq;
  };
  /**
   * How much one hero's turn offers, from here: a measure of whether the player has a decision to
   * make, not of what to do. Every action this hero could take first is tried on a copy, followed by
   * their best single next action, and the round is played out and scored as the planner scores it.
   *   pass     the score if this hero does nothing
   *   stake    how much the best line beats doing nothing (in points of about one vitality)
   *   choices  how many different outcomes come close to the best (within `margin`, or a quarter
   *            of the stake if that is more): two moves that end in the same place count once
   * A turn is `idle` when nothing it could do is worth `idle` points, `forced` when only one outcome
   * is close to the best, and `open` otherwise. Nothing is changed.
   */
  T.turnChoices = function (m, hi, { margin = 3, idle = 3 } = {}) {
    const root = T.imagine(m);
    const pass = worthIfStopped(scratch(root));
    const mine = (c) => T.legalActions(c).filter((a) => a.hero === hi);
    const scores = [];
    for (const a of mine(root)) {
      const c = scratch(root);
      if (!T.applyAction(c, a).ok) continue;
      let best = worthIfStopped(scratch(c));
      if (!c.over)
        for (const b of mine(c)) {
          const d = scratch(c);
          if (T.applyAction(d, b).ok) best = Math.max(best, worthIfStopped(d));
        }
      scores.push(best);
    }
    const top = Math.max(pass, ...scores);
    const stake = top - pass;
    const near = scores.filter((x) => x >= top - Math.max(margin, stake / 4));
    const choices = new Set(near.map((x) => Math.round(x))).size;
    const kind = stake < idle ? 'idle' : choices <= 1 ? 'forced' : 'open';
    return { pass, stake, choices, actions: scores.length, kind };
  };
  const sameSpot = (a, b) => a.t === b.t && a.hero === b.hero && a.card === b.card && a.face === b.face;

  /**
   * Play the squad's phase with look-ahead: plan, act, and plan again — until the best plan is to
   * stop. Planning again also covers the dice doing something no plan could have known (a draw, a
   * reroll): what is left of that plan is dropped. Returns the actions taken.
   */
  T.smartHeroPhase = function (m, opts) {
    const o = Object.assign({ width: 2, depth: 4 }, opts);
    const taken = [];
    for (let guard = 0; guard < 12 && !m.over; guard++) {
      const plan = T.planHeroPhase(m, o);
      let cut = plan.length >= o.depth; // the search ran out of depth, not of ideas: look again from there
      for (const a of plan) {
        const dice = m.rngs.dice;
        const r = T.applyAction(m, a);
        if (r.ok) taken.push(a);
        if (!r.ok || m.rngs.dice !== dice) {
          cut = true;
          break;
        }
        if (m.over) break;
      }
      if (!cut) break;
    }
    return taken;
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
