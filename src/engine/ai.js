/* ============================================================================
   TUMULT v2.0 — AI
   • Enemy intents are chosen at round start and SHOWN to the player
     (predictable outcomes; surprises come from timing and combination).
   • Enemy execution adapts minimally: if the target left range, the enemy
     spends its turn closing instead. Repositioning is always rewarded.
   • A heuristic hero autoplayer drives headless simulations for balance.
   ========================================================================== */
(function (T) {
  const B = T.Board;
  const st = (e) => e.states;

  /* ───────────────────────────── TARGET HELPERS ───────────────────────────── */
  function candidates(m) {
    return T.liveHeroes(m).concat(m.decoys);
  }
  function dist(m, a, b) {
    return B.dist(m.board, a, b, true);
  }
  function nearestTarget(m, e, filter) {
    let best = null,
      bd = 99;
    for (const c of candidates(m)) {
      if (filter && !filter(c)) continue;
      const d = dist(m, e.pos, c.pos);
      if (d < bd || (d === bd && c.kind === 'decoy')) {
        bd = d;
        best = c;
      }
    }
    return best;
  }
  function lowestHpHero(m) {
    const hs = T.liveHeroes(m);
    if (!hs.length) return null;
    return hs.slice().sort((a, b) => a.hp - b.hp)[0];
  }
  function zoneTargets(m, e) {
    return candidates(m).filter((c) => B.los(m.board, e.pos, c.pos) && !(c.kind === 'hero' && T.isHidden(c)));
  }
  function adjacentTargets(m, e) {
    return candidates(m).filter((c) => B.adjacent(m.board, e.pos, c.pos));
  }
  function heroesAdjacent(m, e) {
    return T.liveHeroes(m).filter((h) => B.adjacent(m.board, e.pos, h.pos));
  }
  const label = (e, ab, t, extra) => `${ab.n}${t ? ' → ' + t.name : ''}${extra ? ' ' + extra : ''}`;
  const dmgOf = (e, ab) => T.enemyDmg(e, ab);

  /* ───────────────────────────── INTENTS ───────────────────────────── */
  T.chooseIntents = function (m) {
    for (const e of T.liveEnemies(m)) {
      const A = T.ENEMIES[e.type].abilities;
      let intent = null;
      const setI = (key, target, extra, opts) => {
        intent = Object.assign(
          {
            key,
            target: target ? target.uid : null,
            targetName: target ? target.name : null,
            label: label(e, A[key], target, extra),
            dmg: A[key].dmg ? dmgOf(e, A[key]) : 0,
            kind: A[key].kind,
          },
          opts || {},
        );
      };
      switch (T.ENEMIES[e.type].policy) {
        case 'rush': {
          const t = nearestTarget(m, e);
          if (t) setI('bite', t, `(${dmgOf(e, A.bite)})`);
          break;
        }
        case 'shooter': {
          const lt = zoneTargets(m, e);
          const t = lt.length ? lt.sort((a, b) => a.hp - b.hp)[0] : nearestTarget(m, e);
          if (t) setI('sting', t, `(${dmgOf(e, A.sting)} zone)`);
          break;
        }
        case 'brute': {
          const adj = adjacentTargets(m, e);
          const t = adj.length ? adj.sort((a, b) => a.hp - b.hp)[0] : lowestHpHero(m) || nearestTarget(m, e);
          if (t) setI('slam', t, `(${dmgOf(e, A.slam)}, push 1)`);
          break;
        }
        case 'kiter': {
          const adj = heroesAdjacent(m, e);
          const lt = zoneTargets(m, e);
          const t = lt.length ? lt[0] : nearestTarget(m, e);
          if (t)
            setI('shot', t, `(${dmgOf(e, A.shot)} zone${adj.length ? ', after retreating' : ''})`, {
              retreat: adj.length > 0,
            });
          break;
        }
        case 'guardian': {
          const adj = adjacentTargets(m, e);
          if (adj.length) setI('cleave', adj.sort((a, b) => a.hp - b.hp)[0], `(${dmgOf(e, A.cleave)})`);
          else setI('brace', null, '(restores Shield)');
          break;
        }
        case 'lurker': {
          const t = nearestTarget(m, e);
          if (!t) break;
          const d = dist(m, e.pos, t.pos);
          if (d <= e.speed + 1) setI('ambush', t, `(${dmgOf(e, A.ambush)}${T.isHidden(e) ? ', from Hidden' : ''})`);
          else setI('creep', t, T.isHidden(e) ? '(closing, Hidden)' : '(closing)');
          break;
        }
        case 'binder': {
          const lt = zoneTargets(m, e).filter((c) => c.kind === 'hero' && !st(c).Rooted);
          const adj = adjacentTargets(m, e);
          if (lt.length) setI('bind', lt[0], `(${dmgOf(e, A.bind)}, roots 2)`);
          else if (adj.length) setI('drain', adj[0], `(${dmgOf(e, A.drain)}, heals 2)`);
          else {
            const t = nearestTarget(m, e);
            if (t) setI('drain', t, `(${dmgOf(e, A.drain)}, closing)`);
          }
          break;
        }
        case 'spawner':
          setI('spawn', null, `(next in ${Math.max(0, e.spawnEvery - e.spawnCounter)})`);
          break;
        case 'bulwark': {
          const adj = heroesAdjacent(m, e);
          if (adj.length >= 2) setI('quake', null, `(${dmgOf(e, A.quake)} to all adjacent)`);
          else if (e.hp < e.maxHp / 2 && !e.bracedRecently) setI('brace', null, '(restores Shield)');
          else {
            const t = adj.length ? adj.sort((a, b) => a.hp - b.hp)[0] : lowestHpHero(m) || nearestTarget(m, e);
            if (t) setI('crush', t, `(${dmgOf(e, A.crush)})`);
          }
          break;
        }
        case 'harrier': {
          if (T.isHidden(e) || e.readyLance) {
            const hs = T.liveHeroes(m).filter((h) => dist(m, e.pos, h.pos) <= A.lance.reach + 1);
            const t = hs.length ? hs.sort((a, b) => a.hp - b.hp)[0] : lowestHpHero(m);
            if (t)
              setI(
                'lance',
                t,
                `(${canBlink(e) ? 'blinks adjacent' : 'held — only if adjacent'}, ${dmgOf(e, A.lance)})`,
              );
          } else setI('fade', null, st(e).Located ? '(Located — cannot hide; readies its lance)' : '(goes Hidden)');
          break;
        }
        case 'tidecaller': {
          const lt = zoneTargets(m, e).filter((c) => c.kind === 'hero');
          const t = lt.length ? lt[0] : nearestTarget(m, e);
          if (!t) break;
          if (e.lastKey !== 'undertow') setI('undertow', t, `(pulls 2, ${dmgOf(e, A.undertow)})`);
          else setI('surge', t, `(${dmgOf(e, A.surge)} zone, Weakens)`);
          break;
        }
        case 'heart': {
          if (e.phase === 1) {
            const lt = zoneTargets(m, e).filter((c) => c.kind === 'hero');
            const biters = T.liveEnemies(m).filter((x) => x.type === 'biter').length;
            if (lt.length) setI('lance', lt.sort((a, b) => a.hp - b.hp)[0], `(${dmgOf(e, A.lance)} zone)`);
            else if (biters < 2) setI('call', null, '(calls a Biter)');
            else setI('lance', null, '(no line — waits)');
          } else {
            const adj = heroesAdjacent(m, e);
            if (adj.length) setI('crush', adj.sort((a, b) => a.hp - b.hp)[0], `(${dmgOf(e, A.crush)})`);
            else {
              const lt = zoneTargets(m, e).filter((c) => c.kind === 'hero');
              const t = lt.length ? lt[0] : lowestHpHero(m);
              if (t) setI('crush', t, `(drags 2, then ${dmgOf(e, A.crush)})`);
            }
          }
          break;
        }
      }
      e.intent = intent;
    }
  };

  /* ───────────────────────────── EXECUTION ───────────────────────────── */
  function canMove(e) {
    return !(st(e).Anchored || st(e).Held || st(e).Slow || e.anchoredPerm);
  }
  function canBlink(e) {
    return canMove(e) && !st(e).NoTele;
  }
  function approach(m, e, targetNode, steps) {
    if (!canMove(e) || steps <= 0) return 0;
    let moved = 0;
    for (let i = 0; i < steps; i++) {
      if (B.adjacent(m.board, e.pos, targetNode)) break;
      const blocked = new Set(
        T.liveEnemies(m)
          .filter((x) => x !== e)
          .map((x) => x.pos)
          .concat(
            T.liveHeroes(m).map((h) => h.pos),
            m.decoys.map((d) => d.pos),
          ),
      );
      const p = B.path(m.board, e.pos, targetNode, blocked);
      if (!p || p.length < 2) {
        // try moving to reduce distance greedily
        const cands = B.walkNeighbors(m.board, e.pos).filter((n) => !T.occupied(m, n) && !m.board.nodes[n].height);
        if (!cands.length) break;
        const best = cands.sort((a, b) => dist(m, a, targetNode) - dist(m, b, targetNode))[0];
        if (dist(m, best, targetNode) >= dist(m, e.pos, targetNode)) break;
        T.moveEntity(m, e, best, 'walk');
        moved++;
      } else {
        const nxt = p[1];
        if (m.board.nodes[nxt].height || T.occupied(m, nxt)) break;
        T.moveEntity(m, e, nxt, 'walk');
        moved++;
      }
      if (!e.alive || !canMove(e)) break; // trapped / killed by trigger
    }
    return moved;
  }
  function moveToZone(m, e, target, steps) {
    if (!canMove(e) || steps <= 0) return false;
    for (let i = 0; i < steps; i++) {
      if (B.los(m.board, e.pos, target.pos)) return true;
      const cands = B.walkNeighbors(m.board, e.pos).filter((n) => !T.occupied(m, n) && !m.board.nodes[n].height);
      if (!cands.length) return false;
      const zoneNodes = Object.values(m.board.nodes)
        .filter((n) => !n.height && B.sharesZone(m.board, n.id, target.pos))
        .map((n) => n.id);
      const score = (n) => Math.min(...zoneNodes.map((l) => dist(m, n, l)));
      const best = cands.sort((a, b) => score(a) - score(b))[0];
      if (score(best) >= score(e.pos)) return false;
      T.moveEntity(m, e, best, 'walk');
      if (!e.alive || !canMove(e)) return false;
    }
    return B.los(m.board, e.pos, target.pos);
  }
  function retreat(m, e, from) {
    if (!canMove(e)) return;
    const cands = B.walkNeighbors(m.board, e.pos).filter((n) => !T.occupied(m, n) && !m.board.nodes[n].height);
    if (!cands.length) return;
    const best = cands.sort((a, b) => dist(m, b, from.pos) - dist(m, a, from.pos))[0];
    if (dist(m, best, from.pos) > dist(m, e.pos, from.pos)) T.moveEntity(m, e, best, 'walk');
  }
  function findTarget(m, uid) {
    return T.liveHeroes(m).find((h) => h.uid === uid) || m.decoys.find((d) => d.uid === uid) || null;
  }
  function hit(m, e, ab, t, opts) {
    const d = dmgOf(e, ab);
    const o = Object.assign(
      { kind: ab.kind === 'area' ? 'area' : ab.kind === 'los' ? 'los' : 'melee', label: `uses ${ab.n} on` },
      opts || {},
    );
    // redirect: hit an adjacent enemy instead
    if (st(e).Redirect) {
      delete st(e).Redirect;
      const ally = T.liveEnemies(m).find((x) => x !== e && B.adjacent(m.board, e.pos, x.pos));
      if (ally) {
        T.say(m, `${e.name}, overridden, turns on ${ally.name}!`, 'hero');
        ally.hp -= d;
        T.say(m, `${ally.name} takes ${d}.`, 'hero');
        m.fx.push({ t: 'dmg', ent: ally.uid, amount: d, pos: ally.pos });
        if (ally.hp <= 0) {
          ally.alive = false;
          m.stats.kills++;
          T.say(m, `${ally.name} is destroyed.`, 'sys');
          m.fx.push({ t: 'death', ent: ally.uid, pos: ally.pos });
        }
      } else T.say(m, `${e.name}, overridden, flails at nothing.`, 'hero');
      return 0;
    }
    const dealt = T.damage(m, e, t, d, o);
    if (t.kind === 'hero' && !t.downed) {
      if (ab.push) T.pushAway(m, e, t, ab.push);
      if (ab.anchor) {
        if (!st(t).StatusImmune) {
          st(t).Rooted = { t: ab.anchor };
          T.say(m, `${t.name} is rooted for ${ab.anchor}.`, 'enemy');
          m.fx.push({ t: 'state', ent: t.uid, name: 'Rooted' });
        }
      }
      if (ab.weaken) {
        if (!st(t).StatusImmune) {
          const cur = st(t).Weak;
          st(t).Weak = { v: Math.max(ab.weaken, cur ? cur.v : 0), t: 1 };
        }
      }
    }
    if (ab.heal && dealt > 0) {
      e.hp = Math.min(e.maxHp, e.hp + ab.heal);
    }
    return dealt;
  }

  T.enemyPhase = function (m) {
    for (const e of m.enemies.slice()) {
      if (!e.alive || m.over) continue;
      const I = e.intent;
      if (!I) continue;
      const A = T.ENEMIES[e.type].abilities;
      const ab = A[I.key];
      e.lastKey = I.key;
      e.bracedRecently = false;
      let t = I.target != null ? findTarget(m, I.target) : null;
      if (t && t.kind === 'hero' && (t.downed || st(t).Stasis)) t = null;
      switch (ab.kind) {
        case 'melee': {
          if (!t) {
            const nt = nearestTarget(m, e);
            if (nt) {
              approach(m, e, nt.pos, e.speed);
            }
            break;
          }
          if (!B.adjacent(m.board, e.pos, t.pos)) approach(m, e, t.pos, e.speed);
          if (e.alive && B.adjacent(m.board, e.pos, t.pos)) {
            const wasHidden = T.isHidden(e);
            if (ab.ambush && wasHidden) {
              T.say(m, `${e.name} erupts from hiding!`, 'enemy');
            }
            hit(m, e, ab, t, { ambush: !!ab.ambush && wasHidden });
            if (wasHidden) delete st(e).Hidden;
          } else if (e.alive) T.say(m, `${e.name} closes but cannot reach ${t.name}.`, 'enemy');
          break;
        }
        case 'los': {
          if (!t) break;
          if (I.retreat) {
            const adj = heroesAdjacent(m, e)[0];
            if (adj) retreat(m, e, adj);
          }
          if (!B.los(m.board, e.pos, t.pos)) moveToZone(m, e, t, e.speed);
          if (e.alive && B.los(m.board, e.pos, t.pos)) {
            if (ab.pull && t.kind === 'hero') {
              const moved = T.pullToward(m, e, t, ab.pull);
              if (moved) T.say(m, `${t.name} is dragged ${moved} by the undertow.`, 'enemy');
            }
            hit(m, e, ab, t);
          } else if (e.alive) T.say(m, `${e.name} has no line to ${t.name}.`, 'enemy');
          break;
        }
        case 'area': {
          const adj = adjacentTargets(m, e);
          if (!adj.length) {
            const nt = nearestTarget(m, e);
            if (nt) approach(m, e, nt.pos, e.speed);
            break;
          }
          T.say(m, `${e.name} quakes the ground.`, 'enemy');
          adj.forEach((x) => hit(m, e, ab, x, { kind: 'area' }));
          break;
        }
        case 'brace': {
          e.shield = Math.max(e.shield, e.baseShield || 2);
          if (!e.baseShield) st(e).Shield = { v: 2, t: 2, all: true };
          e.bracedRecently = true;
          T.say(m, `${e.name} braces.`, 'enemy');
          m.fx.push({ t: 'state', ent: e.uid, name: 'Shield' });
          break;
        }
        case 'hide': {
          e.readyLance = true;
          // A Located foe cannot hide. It loses the cover, not the turn: its lance is ready all the same.
          if (st(e).Located) {
            T.say(m, `${e.name} tries to fade, but it is Located.`, 'enemy');
            break;
          }
          st(e).Hidden = { t: 99, canMove: true };
          T.say(m, `${e.name} fades from sight.`, 'enemy');
          m.fx.push({ t: 'state', ent: e.uid, name: 'Hidden' });
          break;
        }
        case 'summon': {
          if (e.type === 'spawner') break; // handled at round start
          const spot = B.walkNeighbors(m.board, e.pos).find((n) => !T.occupied(m, n));
          if (spot) {
            const b = T.spawnEnemy(m, 'biter', Math.max(1, m.tier - 1), spot);
            T.say(m, `${e.name} calls the tide: a Biter rises.`, 'enemy');
            m.fx.push({ t: 'spawn', ent: b.uid, pos: spot });
          }
          break;
        }
        case 'teleStrike': {
          if (!t) break;
          // Whatever stops it walking stops it blinking. It is not robbed of its turn:
          // a hero already beside it is still struck.
          if (!canBlink(e)) {
            if (!B.adjacent(m.board, e.pos, t.pos)) T.say(m, `${e.name} cannot phase — it is held.`, 'enemy');
          } else if (dist(m, e.pos, t.pos) <= ab.reach + 1) {
            const spot = B.allNeighbors(m.board, t.pos)
              .filter((n) => !T.occupied(m, n) && !m.board.nodes[n].height)
              .sort((a, b) => dist(m, e.pos, a) - dist(m, e.pos, b))[0];
            if (spot) {
              T.moveEntity(m, e, spot, 'teleport');
              T.say(m, `${e.name} phases in beside ${t.name}.`, 'enemy');
            }
          } else approach(m, e, t.pos, e.speed);
          if (e.alive && B.adjacent(m.board, e.pos, t.pos)) {
            hit(m, e, ab, t);
            if (T.isHidden(e)) delete st(e).Hidden;
            e.readyLance = false;
          }
          break;
        }
        case 'move': {
          if (t) approach(m, e, t.pos, e.speed);
          break;
        }
      }
      // melee attacks also carry a pull (Heart's crush drags first)
      if (
        ab.kind === 'melee' &&
        ab.pull &&
        t &&
        e.alive &&
        t.kind === 'hero' &&
        !t.downed &&
        !B.adjacent(m.board, e.pos, t.pos) &&
        B.los(m.board, e.pos, t.pos)
      ) {
        const moved = T.pullToward(m, e, t, ab.pull);
        if (moved && B.adjacent(m.board, e.pos, t.pos)) hit(m, e, ab, t);
      }
      e.intent = null;
      T.checkEnd(m);
    }
  };

  /* ───────────────────────────── HERO AUTOPLAYER (for simulation) ───────────────────────────── */
  function objectiveNode(m) {
    const ob = m.objective;
    if (!ob) return null;
    if (ob.kind === 'hold') return ob.node;
    if (ob.kind === 'vault') return m.board.ramp ? ob.node : ob.leverNode;
    if (ob.kind === 'valve') return ob.node;
    if (ob.kind === 'salvage') {
      const c = Object.values(m.board.nodes).find((n) => n.objective && n.objective.kind === 'crate');
      return c ? c.id : ob.docks[1];
    }
    if (ob.kind === 'find') {
      if (ob.found) return ob.real;
      const un = ob.candidates.filter((c) => !m.board.nodes[c].objective.searched);
      return un.length ? un[0] : null;
    }
    return null;
  }
  function pickFoe(m, h, uids) {
    const es = uids.map((u) => m.enemies.find((e) => e.uid === u)).filter(Boolean);
    if (!es.length) return null;
    const bossShielded = m.enemies.some((e) => e.boss && e.alive && e.shield > 0);
    const w = (e) =>
      (bossShielded && e.type === 'spawner' ? -50 : 0) + (e.role === 'structure' ? -5 : 0) + e.hp - (e.elite ? 3 : 0);
    return es.sort((a, b) => w(a) - w(b))[0];
  }
  function threatOnMe(m, h) {
    return T.liveEnemies(m).reduce((s, e) => s + (e.intent && e.intent.target === h.uid ? e.intent.dmg || 0 : 0), 0);
  }

  function objectiveGoal(m, h) {
    // returns {node, needOn} or null
    const ob = m.objective;
    if (!ob) return null;
    if (ob.kind === 'hold') return { node: ob.node, needOn: false };
    if (ob.kind === 'valve') return { node: ob.node, needOn: false };
    if (ob.kind === 'salvage') {
      // carrying: to the nearest space on the near edge; otherwise to the nearest crate
      const near = (ns) => ns.sort((a, b) => B.dist(m.board, h.pos, a, true) - B.dist(m.board, h.pos, b, true))[0];
      if (h.carrying) return { node: near(ob.docks.slice()), needOn: true };
      const c = near(
        Object.values(m.board.nodes)
          .filter((n) => n.objective && n.objective.kind === 'crate')
          .map((n) => n.id),
      );
      return c == null ? null : { node: c, needOn: false };
    }
    if (ob.kind === 'vault') {
      const canReach =
        m.board.ramp ||
        h.cards.some(
          (c) =>
            T.CARD[c].E.fx.some((x) => (x.v === 'teleport' && x.height) || x.v === 'climb') ||
            T.CARD[c].P.fx.some((x) => x.v === 'climb'),
        ) ||
        h.gear.some((g) => ['phasebrace', 'climbrig'].includes(g.id));
      return canReach ? { node: ob.node, needOn: true } : { node: ob.leverNode, needOn: false };
    }
    if (ob.kind === 'find') {
      if (ob.found) return { node: ob.real, needOn: false };
      const un = ob.candidates
        .filter((c) => !m.board.nodes[c].objective.searched)
        .sort((a, b) => B.dist(m.board, h.pos, a, true) - B.dist(m.board, h.pos, b, true));
      return un.length ? { node: un[0], needOn: true } : null;
    }
    return null;
  }
  function tryMoveToward(m, h, goal) {
    // 1) movement faces (cheap, long), 2) plain walk. Returns true if progressed.
    const cur = B.dist(m.board, h.pos, goal.node, true);
    if (cur === 0 || (!goal.needOn && cur <= 1)) return false;
    let best = null;
    for (const cid of h.cards)
      for (const fk of ['P', 'E']) {
        const card = T.CARD[cid],
          face = card[fk];
        const mv = face.fx.find((x) => ['move', 'teleport', 'climb'].includes(x.v));
        if (!mv || face.fx.some((x) => x.v === 'rest')) continue;
        const chk = T.canPlay(m, h, cid, fk);
        if (!chk.ok || chk.tg.need !== 'node' || !chk.tg.options.length) continue;
        const node = chk.tg.options
          .slice()
          .sort((a, b) => B.dist(m.board, a, goal.node, true) - B.dist(m.board, b, goal.node, true))[0];
        const gain = cur - B.dist(m.board, node, goal.node, true);
        if (gain <= 0) continue;
        const score = gain * 2 - face.ap - (fk === 'E' ? 1 : 0) + (node === goal.node && goal.needOn ? 5 : 0);
        if (!best || score > best.score) best = { cid, fk, ctx: { node }, score };
      }
    if (best && best.score > 0) {
      const r = T.playFace(m, h, best.cid, best.fk, best.ctx);
      if (r.ok) return true;
    }
    if (T.apValue(h) >= 1 && !st(h).Rooted && !st(h).SlowSelf) {
      const opts = T.reachableWalk(m, h, Math.min(3, T.apValue(h)), false);
      if (!opts.length) return false;
      const nxt = opts.sort((a, b) => B.dist(m.board, a, goal.node, true) - B.dist(m.board, b, goal.node, true))[0];
      if (B.dist(m.board, nxt, goal.node, true) < cur) {
        const r = T.walk(m, h, nxt);
        if (r.ok) return true;
      }
    }
    return false;
  }

  T.autoHeroPhase = function (m) {
    for (const h of m.heroes) {
      if (h.downed || m.over) continue;
      let guard = 0;
      while (!m.over && guard++ < 12 && !h.rested) {
        const ally = T.allyOf(m, h);
        // 1. rally
        if (ally && ally.downed && B.adjacent(m.board, h.pos, ally.pos) && T.apValue(h) >= 2) {
          T.rally(m, h);
          continue;
        }
        // 2. interact
        const ob = m.objective;
        let didInteract = false;
        if (ob && T.apValue(h) >= 2) {
          const nodes = [h.pos].concat(B.walkNeighbors(m.board, h.pos));
          for (const n of nodes) {
            const nd = m.board.nodes[n];
            if (!nd.objective) continue;
            const k = nd.objective.kind;
            if (k === 'beacon' || k === 'dock') continue;
            if (k === 'crate' && h.carrying) continue;
            if (k === 'cache' && nd.objective.searched && !nd.objective.real) continue;
            if (k === 'cache' && !ob.found && n !== h.pos) continue;
            if (k === 'vault' && n !== h.pos) continue;
            if (k === 'lever' && m.board.ramp) continue;
            const r = T.doInteract(m, h, n, false);
            if (r.ok) {
              didInteract = true;
              break;
            }
          }
        }
        if (didInteract) continue;
        // 3. objective-first movement when a clock is running (or searching)
        const goal = objectiveGoal(m, h);
        const adjFoe = T.liveEnemies(m).some((e) => B.adjacent(m.board, h.pos, e.pos) && !e.anchoredPerm);
        // a carrier runs for the near edge even with a foe beside them
        if (goal && (m.clock || (ob && ob.kind === 'find')) && (!adjFoe || h.carrying)) {
          if (tryMoveToward(m, h, goal)) continue;
        }
        // 4. best face
        let best = null;
        for (const cid of h.cards) {
          for (const fk of ['P', 'E']) {
            const chk = T.canPlay(m, h, cid, fk);
            if (!chk.ok) continue;
            const card = T.CARD[cid],
              face = card[fk];
            const P = T.heroP(h, cid),
              E = T.heroE(h, cid);
            let score = 0;
            let ctx = {};
            const strike = face.fx.find((x) => x.v === 'strike');
            const threat = threatOnMe(m, h);
            if (strike) {
              const dmg = (typeof strike.dmg === 'function' ? strike.dmg(P, E) : strike.dmg) || 0;
              if (chk.tg.need === 'foe') {
                const foe = pickFoe(m, h, chk.tg.options);
                if (!foe) continue;
                ctx.target = foe.uid;
                const eff = Math.max(0, dmg - (strike.pierce || strike.trueDmg || strike.stripShield ? 0 : foe.shield));
                if (eff <= 0) continue;
                score =
                  eff * 2 +
                  (eff >= foe.hp ? 6 : 0) +
                  (foe.boss ? 2 : 0) +
                  (foe.elite ? 1 : 0) +
                  (foe.type === 'spawner' ? 4 : 0);
              } else if (strike.kind === 'area' || strike.kind === 'zone_all' || strike.nearest) {
                const n =
                  strike.kind === 'area'
                    ? T.liveEnemies(m).filter((e) => B.adjacent(m.board, h.pos, e.pos)).length
                    : strike.kind === 'zone_all'
                      ? T.liveEnemies(m).filter((e) => B.los(m.board, h.pos, e.pos)).length
                      : T.liveEnemies(m).some((e) => B.los(m.board, h.pos, e.pos))
                        ? 1
                        : 0;
                if (!n) continue;
                score = dmg * n * 2;
              } else continue;
              score -= face.ap;
              if (fk === 'E') score -= 1;
            } else if (
              face.fx.some((x) => x.v === 'shield' || x.v === 'preempt' || x.v === 'counter' || x.v === 'stasis')
            ) {
              if (threat >= 4) score = threat;
              else continue;
            } else if (face.fx.some((x) => x.v === 'heal')) {
              if (h.hp <= h.maxHp * 0.5) score = 5;
              else continue;
            } else if (face.fx.some((x) => x.v === 'reveal')) {
              const hiddenFoes = T.liveEnemies(m).some((e) => T.isHidden(e));
              const findMode = ob && ob.kind === 'find' && !ob.found;
              if (hiddenFoes || findMode) score = 4;
              else continue;
            } else if (face.fx.some((x) => x.v === 'engine')) {
              if (m.round <= 3) score = 3;
              else continue;
            } else if (
              face.fx.some((x) => x.v === 'anchor' && x.who === 'foe') ||
              face.fx.some((x) => x.v === 'weaken')
            ) {
              if (chk.tg.need === 'foe') {
                const foe = pickFoe(m, h, chk.tg.options);
                if (!foe) continue;
                ctx.target = foe.uid;
                score = 2;
              } else continue;
            } else if (face.fx.some((x) => x.v === 'trap')) {
              const foes = T.liveEnemies(m);
              if (!foes.length || chk.tg.need !== 'node') continue;
              const nearest = foes.sort(
                (a, b) => B.dist(m.board, h.pos, a.pos, true) - B.dist(m.board, h.pos, b.pos, true),
              )[0];
              const node = chk.tg.options.sort(
                (a, b) => B.dist(m.board, a, nearest.pos, true) - B.dist(m.board, b, nearest.pos, true),
              )[0];
              ctx.node = node;
              score = 1.5;
            } else if (face.fx.some((x) => x.v === 'teleport' || x.v === 'climb' || x.v === 'move')) {
              const goal =
                objectiveNode(m) ||
                (T.liveEnemies(m)[0]
                  ? T.liveEnemies(m).sort(
                      (a, b) => B.dist(m.board, h.pos, a.pos, true) - B.dist(m.board, h.pos, b.pos, true),
                    )[0].pos
                  : null);
              if (goal == null || chk.tg.need !== 'node' || !chk.tg.options.length) continue;
              const cur = B.dist(m.board, h.pos, goal, true);
              const node = chk.tg.options
                .slice()
                .sort((a, b) => B.dist(m.board, a, goal, true) - B.dist(m.board, b, goal, true))[0];
              const gain = cur - B.dist(m.board, node, goal, true);
              if (gain <= 0) continue;
              ctx.node = node;
              score = gain * 1.5 + (m.board.nodes[node].height && m.board.nodes[goal].height && node === goal ? 10 : 0);
            } else continue;
            if (score > 0 && (!best || score > best.score)) best = { cid, fk, ctx, score };
          }
        }
        if (best) {
          const r = T.playFace(m, h, best.cid, best.fk, best.ctx);
          if (r.ok) continue;
        }
        // 4b. channelled actions cost no AP: a banked Mass hits an adjacent foe, a Charge arcs into one within 3,
        // a Time braces against a telegraphed hit (a spare etherion is otherwise a dead die)
        const chM = T.canUseBasic(m, h, 'strike_M');
        if (chM.ok) {
          const foe = pickFoe(m, h, chM.tg.options);
          if (foe && foe.shield < 2 && T.useBasic(m, h, 'strike_M', { target: foe.uid }).ok) continue;
        }
        const chC = T.canUseBasic(m, h, 'arc_C');
        if (chC.ok) {
          const foe = pickFoe(m, h, chC.tg.options);
          if (foe && foe.shield < 1 && T.useBasic(m, h, 'arc_C', { target: foe.uid }).ok) continue;
        }
        if (threatOnMe(m, h) >= 3 && !st(h).Shield && T.useBasic(m, h, 'brace_T').ok) continue;
        // 4c. basic actions: strike an adjacent foe the blow can hurt; brace against a big telegraphed hit
        const strike = T.canUseBasic(m, h, 'strike');
        if (strike.ok) {
          const foe = pickFoe(m, h, strike.tg.options);
          if (foe && foe.shield < 2 && T.useBasic(m, h, 'strike', { target: foe.uid }).ok) continue;
        }
        if (threatOnMe(m, h) >= 4 && !st(h).Shield && T.useBasic(m, h, 'brace').ok) continue;
        // 5. move toward the objective, else toward the nearest foe
        if (goal && tryMoveToward(m, h, goal)) continue;
        if (T.apValue(h) >= 1 && !st(h).Rooted && !st(h).SlowSelf) {
          const foes = T.liveEnemies(m);
          if (foes.length) {
            const target = foes.sort(
              (a, b) => B.dist(m.board, h.pos, a.pos, true) - B.dist(m.board, h.pos, b.pos, true),
            )[0].pos;
            if (!B.adjacent(m.board, h.pos, target)) {
              const opts = T.reachableWalk(m, h, 1, false);
              if (opts.length) {
                const nxt = opts.sort((a, b) => B.dist(m.board, a, target, true) - B.dist(m.board, b, target, true))[0];
                if (B.dist(m.board, nxt, target, true) < B.dist(m.board, h.pos, target, true)) {
                  const r = T.walk(m, h, nxt);
                  if (r.ok) continue;
                }
              }
            }
          }
        }
        break; // bank the rest
      }
    }
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
