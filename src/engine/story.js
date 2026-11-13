/* ============================================================================
   TUMULT — STORY (engine; pure, no DOM)
   After every stop the run writes a passage: one Terminal log line and a
   short exchange between the two pilots, in the voices of their clades
   (src/data/story.js), about what just happened. Passages are plain data on
   the run (run.story.log, the run's chronicle; the newest is the one to show), drawn from
   a random stream of their own ('story'), so they never move a die, a board
   or an offer, and a saved run resumes on the same words.
   ========================================================================== */
(function (T) {
  T.PATRON_BY = {};
  T.PATRONS.forEach((p) => (T.PATRON_BY[p.id] = p));
  T.THREAT_BY = {};
  T.THREATS.forEach((x) => (T.THREAT_BY[x.id] = x));
  /** The head clade of a hero: the first after human. */
  const headClade = (h) => (h.species || []).find((s) => s !== 'human') || 'human';
  const cladeWord = (sp) => {
    const s = T.SPECIES[sp];
    if (!s) return sp;
    const words = s.name.split(' ');
    return words[words.length - 1].toLowerCase();
  };
  /** Fill the tokens, then capitalise wherever a sentence or a quotation now starts with one. */
  const fill = (text, tok) =>
    text
      .replace(/\{(\w+)\}/g, (all, k) => (tok[k] != null ? tok[k] : all))
      .replace(/(^|"|[.!?] )([a-z])/g, (all, pre, c) => pre + c.toUpperCase());

  T.fillTokens = fill;
  /** What the end of the route is called on this run (an expedition may rename it). */
  T.threatName = (run) => (run.story && run.story.threat) || 'the Heart';
  /** The same, to head a line or a screen: "The Standing Storm". */
  T.threatTitle = (run) => T.threatName(run).replace(/^the /, 'The ');
  /** The name of the leg a map row belongs to. */
  T.legName = (run, row) => (run.map ? run.map.actNames[T.actOf(Math.min(row, 5))].replace(/^The /, 'the ') : '');

  /**
   * Draw this run's expedition (src/data/expeditions.js) from its own stream: who sent it, what waits at
   * the end (T.THREATS: the finale keeps the Heart's rules), and its three legs. The last leg crosses the
   * threat's own ground; the other two come in either order. Plain data: ids and words, nothing else.
   */
  T.newExpedition = function (run) {
    const rng = T.runStream(run, 'expedition');
    const patron = rng.pick(T.PATRONS);
    const threat = rng.pick(T.THREATS);
    const order = rng.shuffle(Object.keys(T.GROUNDS).filter((g) => g !== threat.ground)).concat([threat.ground]);
    return {
      patron: patron.id,
      domain: patron.domain,
      threat: threat.id,
      legs: order.map((g) => ({ ground: g, name: rng.pick(T.GROUNDS[g].names), scene: rng.pick(T.GROUNDS[g].scenes) })),
    };
  };
  /** Set a run out on an expedition: its threat names the finale, its legs name the map's acts. */
  T.beginExpedition = function (run) {
    if (!run.story) run.story = T.newStory();
    const ex = T.newExpedition(run);
    run.story.expedition = ex;
    run.story.threat = T.THREAT_BY[ex.threat].name;
    if (run.map) {
      run.map.actNames = ex.legs.map((l) => l.name);
      T.chartPages(run);
    }
  };
  /**
   * Give every stop that is played on a board its atlas page, from the ground of its leg (src/data/atlas.js),
   * drawn from a stream of its own ('atlas'): not the page of a stop that leads to it, nor of another stop in its
   * row, while the ground has another page to give (the arriving stops come first). Havens and events stay off the board.
   */
  T.chartPages = function (run) {
    const rng = T.runStream(run, 'atlas');
    const all = run.map.all;
    run.map.rows.forEach((row, r) => {
      const ground = T.groundAt(run, r);
      const pages = T.ATLAS.filter((p) => !ground || p.ground === ground).map((p) => p.id);
      const used = [];
      row.forEach((id) => {
        const n = all[id];
        if (n.type === 'haven' || n.type === 'event') return;
        const before = Object.values(all)
          .filter((m) => m.next.includes(id))
          .map((m) => m.page);
        const fresh = pages.filter((p) => !before.includes(p) && !used.includes(p));
        const notBefore = pages.filter((p) => !before.includes(p));
        n.page = rng.pick(fresh.length ? fresh : notBefore.length ? notBefore : pages);
        used.push(n.page);
      });
    });
  };
  /** The run's expedition and its parts, or null for a run saved before expeditions. */
  T.expeditionOf = function (run) {
    const ex = run.story && run.story.expedition;
    if (!ex) return null;
    return { ...ex, patronDef: T.PATRON_BY[ex.patron], threatDef: T.THREAT_BY[ex.threat] };
  };
  /** The ground ('land' | 'sea' | 'air') of the leg a map row belongs to, or null. */
  T.groundAt = function (run, row) {
    const ex = run.story && run.story.expedition;
    return ex && row != null ? ex.legs[T.actOf(Math.min(row, 5))].ground : null;
  };

  /**
   * Which situation the stop just finished leaves the squad in: 'win', 'close' (won, but someone went down
   * or ended below a third), 'loss', 'haven', 'event'; and whether the next stop opens a new leg or the finale.
   */
  T.passageKind = function (run, node) {
    if (node.type === 'haven') return 'haven';
    if (node.type === 'event') return 'event';
    const last = run.history[run.history.length - 1];
    if (!last) return 'win';
    if (!last.won) return 'loss';
    return last.close ? 'close' : 'win';
  };

  /**
   * Write the passage for a situation and keep it on the run. `node` is the stop just finished (null at the
   * start). The passage is the newest entry of run.story.log: { n, kind, title, scene, lines: [{ who: 'terminal' | heroIndex, text }] }.
   */
  T.writePassage = function (run, kind, node) {
    if (!run.story) run.story = T.newStory();
    const rng = T.runStream(run, 'story');
    const heroes = run.heroes;
    const last = node && run.history.length ? run.history[run.history.length - 1] : null;
    // who speaks: after a close call, the one who was hurt worst; otherwise either, by the stream
    let a = heroes.length > 1 ? rng.int(heroes.length) : 0;
    if (kind === 'close' && last && last.hurt != null && heroes[last.hurt]) a = last.hurt;
    const b = heroes.length > 1 ? (a + 1) % heroes.length : a;
    const nextRow = node ? node.row + 1 : 0;
    const nextIsBoss = run.available.some((id) => run.map.all[id].type === 'boss');
    const newLeg = node && run.map && T.actOf(Math.min(nextRow, 5)) !== T.actOf(node.row) && !nextIsBoss;
    const nobody = { name: 'the squad', species: [] };
    const tok = (sp, ot) => ({
      A: (heroes[sp] || nobody).name,
      B: (heroes[ot] || nobody).name,
      Aclade: cladeWord(headClade(heroes[sp] || nobody)),
      Bclade: cladeWord(headClade(heroes[ot] || nobody)),
      FOE: (last && last.foe) || 'the opposition',
      PLACE: T.legName(run, nextRow),
      THREAT: T.threatName(run),
      ROUNDS: last ? last.rounds : 0,
    });
    // a line said in the last few passages is not said again yet
    const recent = new Set(
      run.story.log
        .slice(-3)
        .flatMap((q) => q.lines)
        .map((l) => l.src),
    );
    const pick = (list) => {
      const fresh = list.filter((x) => !recent.has(x));
      return rng.pick(fresh.length ? fresh : list);
    };
    const line = (who, list, t) => {
      const src = pick(list);
      return { who, text: fill(src, t), src };
    };
    const lines = [];
    const logKind = nextIsBoss ? 'finale' : newLeg ? 'leg' : kind;
    lines.push(line('terminal', T.TERMINAL_LOG[kind], tok(a, b)));
    const ex = T.expeditionOf(run);
    if (kind === 'start' && ex)
      lines.push({ who: 'terminal', text: fill(ex.patronDef.brief, tok(a, b)), src: ex.patron });
    if (logKind !== kind) lines.push(line('terminal', T.TERMINAL_LOG[logKind], tok(a, b)));
    const voice = (i) => T.VOICES[headClade(heroes[i] || nobody)] || T.VOICES.human;
    const say = kind === 'haven' || kind === 'event' ? 'quiet' : kind === 'loss' ? 'close' : kind;
    const said = kind === 'start' || logKind !== kind ? voice(a).onward : voice(a)[say];
    if (heroes[a]) lines.push(line(a, said, tok(a, b)));
    if (b !== a && heroes[b]) lines.push(line(b, voice(b).reply, tok(b, a)));
    const sceneKind = logKind;
    const p = {
      n: run.story.log.length + 1,
      kind: logKind,
      title: passageTitle(run, kind, logKind, node, nextRow),
      scene:
        logKind === 'leg' && ex
          ? ex.legs[T.actOf(Math.min(nextRow, 5))].scene
          : rng.pick(T.PASSAGE_SCENES[sceneKind] || T.PASSAGE_SCENES.win),
      lines,
    };
    run.story.log.push(p);
    return p;
  };
  function passageTitle(run, kind, logKind, node, nextRow) {
    if (kind === 'start') return 'Setting out';
    if (logKind === 'finale') return 'The last approach';
    if (logKind === 'leg') return 'Into ' + T.legName(run, nextRow);
    const last = run.history[run.history.length - 1];
    if (kind === 'haven') return 'A night at the haven';
    if (kind === 'event') return 'On the road';
    return (kind === 'loss' ? 'After losing ' : 'After ') + ((last && last.title) || 'the stop');
  }
  /** The passage written after the last stop (the newest in the chronicle), or null. */
  T.currentPassage = (run) => (run.story && run.story.log.length ? run.story.log[run.story.log.length - 1] : null);
  /** A run's story state: the chronicle so far and what the route leads to. */
  T.newStory = () => ({ log: [], threat: null, expedition: null });
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
