/* ============================================================================
   TUMULT — PLAYTEST ADD-ON. Only in the playtest build (npm run build:playtest).
   A panel on the title screen for whoever is testing the game: jump into any
   mission, switch a rule that is waiting on a decision, read what to look at
   in this build, and copy a report of what happened.
   It adds no rules. It starts missions through T.quickMission, the same door
   tools/mission-log.js uses, so a seed names the same mission in both.
   ========================================================================== */
(function (T) {
  const U = T.UI;
  const esc = U.esc;
  const KEY = 'tumult_v2_playtest';
  const TYPES = ['swarm', 'vault', 'hidden', 'cascade', 'elite', 'boss'];
  const LOG_MAX = 40;

  /**
   * What a tester should look at in this build. `version` must match package.json
   * (test/playtest.test.js checks), so a release cannot ship with last release's list.
   * `cards` names the trait cards a note is about; the panel says which pre-made hero carries them.
   */
  const NOTES = {
    version: '2.14.0',
    items: [
      {
        text: 'Drawn icons replace the emoji everywhere: foes on the board, the route, dice, gear, boons, events. Can you tell every foe apart at a glance on the board? Which icon did you have to hover to understand?',
      },
      {
        text: 'The route is now a chart with the road you took lit up, and events and havens show a painting. Does the run feel more like a journey somewhere? Is anything harder to read than the old grid?',
      },
      {
        text: 'Play online: one of you types a name and presses “Host a game”, the other types the four-letter code and presses Join, from their own screen. Each drafts and flies one pilot; the host picks the route and the round ends when both press Ready. Does it keep up? Anything that went out of step between the two screens, or that you had to wait for, put in a report.',
      },
      {
        text: 'Two players on one screen: pick “2 players” on the title screen and pass the screen. Does owning one pilot change how you talk through a turn?',
      },
      {
        text: 'New look: Cosmic Shore’s pilots now play the heroes. A hero shows the painting of their own two clades when there is one, else a stand-in that shares a clade (marked “stand-in”). Does seeing a face change how you feel about a hero? Which pairs would you most like painted next?',
      },
      {
        text: 'Read the board and the cards at a glance: do the new type, the panels and the scene under the board help or get in the way? Anything hard to read on a phone?',
      },
      {
        text: 'A crystal is an action: any banked etherion (or Omni) can be spent on its own, with no AP, for a basic action of its colour — Mass strikes for 2 or shoves 1, Charge arcs 1 damage into a foe up to 3 away, Space scrambles 1 node (ledges too), Time braces and slides your track. Are elements now the rolls you hope for? Does a turn with three crystals and no AP still feel like a turn?',
      },
      {
        text: 'To pay for free crystals, the Heart is tougher (72 vitality at tier 3, was 44) and once it cracks the Vault drowns in four rounds, not seven. Does the last fight feel like a race you can plan for, or a wall?',
      },
      {
        text: 'Charge Reach (Interact 2 nodes away) still costs 1 AP. Does Arc give a lone Charge die enough to do when nothing is in reach?',
      },
    ],
  };

  /* ───────────── state (kept on this device) ───────────── */
  const fresh = () => ({
    cfg: { type: 'vault', tier: 1, kit: 'tier', heroes: [0, 1], seed: '' },
    minE: T.RULES.ETHEREAL_MIN_E,
    last: null,
    log: [],
  });
  function load() {
    const st = fresh();
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && typeof saved === 'object') {
        Object.assign(st.cfg, saved.cfg);
        // 'etherealMinE' since 2.4.0: a 'minE' stored before then is the old default, not a choice
        if (saved.etherealMinE === 0 || saved.etherealMinE === 1) st.minE = saved.etherealMinE;
        if (saved.last) st.last = saved.last;
        if (Array.isArray(saved.log)) st.log = saved.log.slice(0, LOG_MAX);
      }
    } catch (e) {}
    // never trust what was stored: a build with other heroes or missions may have written it
    const c = st.cfg;
    if (!TYPES.includes(c.type)) c.type = 'vault';
    c.tier = c.type === 'boss' ? 3 : [1, 2, 3].includes(c.tier) ? c.tier : 1;
    c.kit = c.kit === 'start' ? 'start' : 'tier';
    const ok = (i) => Number.isInteger(i) && i >= 0 && i < T.PREBUILTS.length;
    if (!Array.isArray(c.heroes) || c.heroes.length !== 2 || !c.heroes.every(ok) || c.heroes[0] === c.heroes[1])
      c.heroes = [0, 1];
    c.seed = String(c.seed == null ? '' : c.seed)
      .replace(/\D/g, '')
      .slice(0, 9);
    return st;
  }
  const st = load();
  function save() {
    try {
      const { minE, ...rest } = st;
      localStorage.setItem(KEY, JSON.stringify({ ...rest, etherealMinE: minE }));
    } catch (e) {}
  }
  T.RULES.ETHEREAL_MIN_E = st.minE;

  /* ───────────── what was played (counted per mission) ───────────── */
  let live = { m: null, faces: {}, P: 0, E: 0, E0: 0 };
  const realPlayFace = T.playFace;
  T.playFace = function (m, h, cardId, faceKey) {
    const r = realPlayFace.apply(this, arguments);
    if (r && r.ok && U.run && m === U.run.mission) {
      if (live.m !== m) live = { m, faces: {}, P: 0, E: 0, E0: 0 };
      const k = cardId + ':' + faceKey;
      live.faces[k] = (live.faces[k] || 0) + 1;
      live[faceKey]++;
      if (faceKey === 'E' && T.heroE(h, cardId) === 0) live.E0++;
    }
    return r;
  };
  const played = (m) => (live.m === m ? live : { faces: {}, P: 0, E: 0, E0: 0 });

  /** One line of the session log: a mission that was played to its end. */
  function record(run, m) {
    const p = played(m);
    const rec = {
      at: new Date().toISOString(),
      v: T.BUILD.version,
      minE: T.RULES.ETHEREAL_MIN_E,
      seed: run.seed,
      quick: run.quick || null,
      type: m.archetype,
      tier: m.tier,
      title: m.title,
      squad: m.heroes.map((h) => h.name),
      hp: m.heroes.map((h) => Math.max(0, h.hp) + '/' + h.maxHp),
      won: !!m.won,
      rounds: m.round,
      kills: m.stats.kills,
      bonus: m.bonus.filter((b) => b.achieved).length + '/' + m.bonus.length,
      P: p.P,
      E: p.E,
      E0: p.E0,
      faces: p.faces,
    };
    st.log.unshift(rec);
    st.log.length = Math.min(st.log.length, LOG_MAX);
    save();
    return rec;
  }

  /* ───────────── starting a mission ───────────── */
  function launch() {
    const c = st.cfg;
    const seed = c.seed ? Number(c.seed) : Date.now() & 0x7fffffff;
    const quick = { heroes: c.heroes.slice(), kit: c.kit };
    const run = T.quickMission({ seed, heroes: quick.heroes, type: c.type, tier: c.tier, kit: c.kit });
    run.quick = quick;
    st.last = { type: c.type, tier: c.tier, kit: c.kit, heroes: quick.heroes, seed };
    save();
    U.run = run;
    U.screen = 'mission';
    U.enterMission();
    U.showTutorial('mission');
    T.saveRun(run);
    U.render();
  }
  const command = (q, type, tier, seed) =>
    `node tools/mission-log.js ${type} ${tier} ${seed} ${q.heroes[0]} ${q.heroes[1]} ${q.kit}`;

  /* ───────────── the report ───────────── */
  const ruleText = (minE) =>
    minE >= 1 ? 'Ethereal faces need E 1 (ETHEREAL_MIN_E = 1)' : 'Ethereal faces playable at E 0 (ETHEREAL_MIN_E = 0)';
  function logLine(r) {
    const when = String(r.at).slice(0, 16).replace('T', ' ');
    const kit = r.quick ? `${r.quick.kit} kit` : 'in a Tide';
    return `${when} · ${r.type} t${r.tier} · seed ${r.seed} · ${r.squad.join(' + ')} · ${kit} · ${r.won ? 'WON' : 'LOST'} in ${r.rounds} rounds · hp ${r.hp.join(', ')} · ${r.kills} kills · bonus ${r.bonus} · faces P ${r.P} / E ${r.E} (${r.E0} at E 0) · rule E≥${r.minE} · v${r.v}`;
  }
  function reportText() {
    const out = [`TUMULT playtest report — build ${T.BUILD.version}`, 'Rule: ' + ruleText(T.RULES.ETHEREAL_MIN_E)];
    const run = U.run;
    const m = run && run.mission;
    if (m && (U.screen === 'mission' || !m.over)) {
      const p = played(m);
      out.push(
        '',
        `Now: ${m.title} — ${m.archetype} · tier ${m.tier} · seed ${run.seed} · round ${m.round} · ${m.over ? (m.won ? 'won' : 'lost') : 'in progress'}`,
        'Squad: ' +
          m.heroes.map((h) => `${h.name} ${Math.max(0, h.hp)}/${h.maxHp} hp${h.downed ? ' (down)' : ''}`).join(' · '),
        'Foes: ' +
          (m.enemies
            .filter((e) => e.alive !== false)
            .map((e) => `${e.name} ${Math.max(0, e.hp)}/${e.maxHp}`)
            .join(' · ') || 'none'),
        `Faces played: P ${p.P} / E ${p.E} (${p.E0} at E 0)`,
      );
      if (run.quick) out.push('Same board and opening dice: ' + command(run.quick, m.archetype, m.tier, run.seed));
      out.push('', 'Last lines of the log:', ...m.log.slice(-12).map((l) => `  [r${l.r}] ${l.text}`));
    }
    out.push('', `Missions finished on this device (${st.log.length}, newest first):`);
    out.push(...(st.log.length ? st.log.map((r) => '  ' + logLine(r)) : ['  none yet']));
    return out.join('\n');
  }
  function openReport() {
    U.openModal(
      `<div class="row"><h3>Playtest report</h3><span class="right row"><button class="sm primary" data-act="pt-copy">Copy report</button><button class="sm" data-act="pt-save" ${U.run ? '' : 'disabled'}>Copy save</button><button class="sm" data-act="pt-clear">Clear log</button><button class="sm" data-act="closeModal">Close</button></span></div>
      <p class="dim small">What you are playing now and every mission finished on this device. Nothing leaves the page unless you copy it: paste it wherever you report what you found. <b>Copy save</b> copies the Tide exactly as it stands — a mission in progress included — so that whoever gets it can carry on from this moment (<span class="mono">node tools/mission-log.js --save file</span>).</p>
      <textarea class="pt-report" id="pt-report" readonly spellcheck="false">${esc(reportText())}</textarea>`,
    );
  }
  /** Put text on the clipboard; where the page may not, show it selected so it can be copied by hand. */
  function copy(text, done) {
    const box = document.getElementById('pt-report');
    const byHand = () => {
      if (!box) return;
      box.value = text;
      box.focus();
      box.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {}
      U.toast(ok ? done : 'Selected — copy it with your keyboard or the menu.');
    };
    try {
      navigator.clipboard.writeText(text).then(() => U.toast(done), byHand);
    } catch (e) {
      byHand();
    }
  }

  /* ───────────── the panel ───────────── */
  const seg = (act, arg, label, on, off) =>
    `<button class="sm ${on ? 'on' : ''}" data-act="${act}" data-arg="${arg}" ${off ? 'disabled' : ''}>${label}</button>`;
  function carriers(cards) {
    if (!cards || !cards.length) return '';
    const who = T.PREBUILTS.filter((pb) => cards.some((c) => pb.cards.includes(c))).map((pb) => pb.name);
    const lines = [...new Set(cards.map((c) => T.SPECIES[T.CARD[c].sp].name))];
    return who.length
      ? ` <span class="pt-who">Play ${esc(who.join(' or '))}.</span>`
      : ` <span class="pt-who">No pre-made hero carries it: draft ${esc(lines.join(' or '))} in a New Tide.</span>`;
  }
  U.titleExtra = function () {
    const c = st.cfg;
    const boss = c.type === 'boss';
    const heroRow = (slot) =>
      T.PREBUILTS.map((pb, i) =>
        seg(
          'pt-hero',
          slot + '|' + i,
          `${esc(pb.name)} <span class="pt-sp">${pb.species
            .slice(1)
            .map((s) => U.icClade(s))
            .join('')}</span>`,
          c.heroes[slot] === i,
        ),
      ).join('');
    const last = st.last
      ? `<div class="pt-last">Last: ${esc(U.NODE_NAME[st.last.type])} · tier ${st.last.tier} · seed <b class="mono">${st.last.seed}</b> <button class="sm ghost" data-act="pt-again">Use this seed</button></div>`
      : '';
    return `<div class="pt panel">
      <div class="row"><span class="kick">Playtest build ${esc(T.BUILD.version)}</span><span class="right"><button class="sm" data-act="pt-report">Report · ${st.log.length} played</button></span></div>
      <h3>Jump into a mission</h3>
      <div class="pt-row"><span class="pt-lab">Mission</span>${TYPES.map((t) => seg('pt-type', t, U.NODE_ICON[t] + ' ' + esc(U.NODE_NAME[t]), c.type === t)).join('')}</div>
      <div class="pt-row"><span class="pt-lab">Tier</span>${[1, 2, 3].map((t) => seg('pt-tier', t, t, c.tier === t, boss && t !== 3)).join('')}
        <span class="pt-lab pt-gap">Kit</span>${seg('pt-kit', 'tier', 'For this tier', c.kit === 'tier')}${seg('pt-kit', 'start', 'Starting six', c.kit === 'start')}</div>
      <div class="pt-row"><span class="pt-lab">Hero 1</span>${heroRow(0)}</div>
      <div class="pt-row"><span class="pt-lab">Hero 2</span>${heroRow(1)}</div>
      <div class="pt-row"><span class="pt-lab">Seed</span><input id="pt-seed" class="pt-seed" inputmode="numeric" maxlength="9" placeholder="random" value="${esc(c.seed)}" aria-label="Seed">
        <button class="primary" data-act="pt-go">▶ Play this mission</button></div>
      ${last}
      <p class="dim small">The same seed, squad and kit always give the same board and the same opening dice. After the mission the Tide carries on from that node.</p>
      <h3>Rule: Ethereal faces need E 1</h3>
      <div class="pt-row">${seg('pt-rule', 1, 'Asleep until E 1 — as shipped', st.minE === 1)}${seg('pt-rule', 0, 'Playable at E 0 — the old rule', st.minE === 0)}</div>
      <p class="dim small">Since 2.4.0 an Ethereal face is magic that must be awakened: it cannot be played until its card has E 1. Until 2.3 it could be played at E 0, where it does less. The switch takes effect at once, even mid-mission, and stays set on this device.</p>
      <details><summary>What to look at in this build</summary><ul class="pt-notes">${NOTES.items.map((n) => `<li>${esc(n.text)}${carriers(n.cards)}</li>`).join('')}</ul></details>
    </div>`;
  };
  U.missionTopExtra = (m) =>
    `<button class="ghost sm" data-act="pt-plan" data-tip="What the look-ahead player would do with this turn" ${m.over ? 'disabled' : ''}>Plan</button><button class="ghost sm" data-act="pt-report" data-tip="Playtest report: seed, squad, the log so far">Report</button>`;

  /* ───────────── what the look-ahead player would do ───────────── */
  let plan = [];
  function openPlan() {
    const m = U.run && U.run.mission;
    if (!m || m.over) return;
    plan = T.planHeroPhase(m);
    // each step is described on the mission as it would stand by then
    const copy = T.imagine(m);
    const steps = plan.map((a) => {
      const line = T.describeAction(copy, a);
      T.applyAction(copy, a);
      return line;
    });
    U.openModal(
      `<div class="row"><h3>What the look-ahead player would do</h3><span class="right row">${plan.length ? '<button class="sm primary" data-act="pt-plan-play">Play these</button>' : ''}<button class="sm" data-act="closeModal">Close</button></span></div>
      <p class="dim small">It knows no card by name. It tries every legal action on a copy of the mission, lets the enemies do what they have declared, and keeps the line that leaves the squad best off by one measure shared by every mission. It sees this round and no further, and never the dice to come. The balance tables are this player’s results.</p>
      ${steps.length ? `<ol class="pt-notes">${steps.map((t) => `<li>${esc(t)}</li>`).join('')}</ol><p class="dim small">Then it would end the round.</p>` : '<p>It would end the round here: nothing it can do now leaves the squad better off.</p>'}`,
    );
  }
  function playPlan() {
    const m = U.run && U.run.mission;
    U.closeModal();
    if (!m || m.over) return;
    for (const a of plan) if (!T.applyAction(m, a).ok || m.over) break;
    plan = [];
    U.updateMission();
    T.saveRun(U.run);
  }

  /* ───────────── actions ───────────── */
  U.extraAct = function (act, arg) {
    if (act === 'missionDone') {
      // seen before the game handles it: the mission is over and still whole
      const run = U.run;
      if (run && run.mission && run.mission.over) record(run, run.mission);
      return false;
    }
    if (act.slice(0, 3) !== 'pt-') return false;
    const c = st.cfg;
    switch (act) {
      case 'pt-type':
        if (TYPES.includes(arg)) c.type = arg;
        if (c.type === 'boss') c.tier = 3;
        break;
      case 'pt-tier':
        c.tier = c.type === 'boss' ? 3 : Math.max(1, Math.min(3, parseInt(arg, 10) || 1));
        break;
      case 'pt-kit':
        c.kit = arg === 'start' ? 'start' : 'tier';
        break;
      case 'pt-hero': {
        const [slot, i] = arg.split('|').map(Number);
        if (c.heroes[1 - slot] === i) c.heroes[1 - slot] = c.heroes[slot]; // picking the other slot's hero swaps them
        c.heroes[slot] = i;
        break;
      }
      case 'pt-again':
        if (st.last) Object.assign(c, st.last, { heroes: st.last.heroes.slice(), seed: String(st.last.seed) });
        break;
      case 'pt-rule':
        st.minE = arg === '1' ? 1 : 0;
        T.RULES.ETHEREAL_MIN_E = st.minE;
        break;
      case 'pt-go':
        save();
        launch();
        return true;
      case 'pt-report':
        openReport();
        return true;
      case 'pt-plan':
        openPlan();
        return true;
      case 'pt-plan-play':
        playPlan();
        return true;
      case 'pt-copy':
        copy(reportText(), 'Report copied.');
        return true;
      case 'pt-save':
        if (U.run) copy(T.serializeRun(U.run), 'Save copied.');
        return true;
      case 'pt-clear':
        st.log = [];
        save();
        openReport();
        return true;
      default:
        return true;
    }
    save();
    U.render();
    return true;
  };
  // typing a seed must not redraw the panel under the cursor
  document.addEventListener('input', (e) => {
    if (!e.target || e.target.id !== 'pt-seed') return;
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    if (digits !== e.target.value) e.target.value = digits;
    st.cfg.seed = digits;
    save();
  });

  U.playtest = { NOTES, state: st, reportText, launch };
})(window.T);
