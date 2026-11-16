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
  const TYPES = ['swarm', 'vault', 'hidden', 'cascade', 'salvage', 'survey', 'elite', 'boss'];
  const LOG_MAX = 40;

  /**
   * What a tester should look at in this build. `version` must match package.json
   * (test/playtest.test.js checks), so a release cannot ship with last release's list.
   * `cards` names the trait cards a note is about; the panel says which pre-made hero carries them.
   */
  const NOTES = {
    version: '2.49.0',
    items: [
      {
        text: 'Eight more clades: Fennec Fox, Red Fox, Golden Jackal, Coyote and Spotted Hyena, then Sea Otter, Honey Badger and Red Panda. The dogs and the hyena share Keen Nose, Pack Howl and Long Trot (the hyena also shares the cats’ Killing Bite, since hyenas sit nearer the cats). The otter, badger and red panda share Musk and Dense Fur. Does each feel like itself? Which shared trait did you take twice?',
      },
      {
        text: 'A trait your two clades share can be taken a second time, and that pick is now 1 Upgrade Point for that card alone (it was 2, and often gave nothing at all because of a bug, now fixed). Over whole runs that is about as strong as taking a different card. When you are offered a trait you already hold, which do you take, and does it feel like a real choice?',
      },
      {
        text: 'Five cats join: Eurasian Lynx, Caracal, Ocelot, Tiger and Cheetah. Cats share Pounce, Stalk, Killing Bite and Land on Your Feet (and all but the cheetah share Retractable Claws and Night Eyes). The cheetah alone has Hyperspeed: a run of exactly 4, past foes. Does each cat feel like itself? Is an exact run fun to plan around?',
      },
      {
        text: 'A new mission that is not a fight: Survey. Survey marks lie across the whole board and night is coming. Stand on one and Interact to tag it, for 2 AP or one die of the mark’s colour (Omni counts). The far ones start veiled (a ringed ! on the board): stand within 1 of one, or reach it with a reveal, to sight it first. It sits in the middle of the route, in place of the second Cascade. Did the two of you split up? Did a rolled element ever go to a mark instead of a card, and was that a real choice? Use the panel to start one: Survey, any tier.',
      },
      {
        text: 'When a mission ends on something that happened to one of your pilots (they went down, a partner got them back up, they finished on 3 vitality or less, or they came through without a scratch), the panel now says what happened and asks what it meant to them, with three openings ("After the Quarry, … never again"). One moment per mission, the most dramatic. Did the moment it picked feel like the one that mattered?',
      },
      {
        text: 'The game now asks you to embellish the world. When a mission ends, a panel gives you one detail of the place you just crossed and an open question about it, with three openings to carry on from (or start from nothing); the draft does the same for the pilot you picked. Answers go to Garrett as proposals. Were the questions ones you wanted to answer? Which opening did you take, and which question fell flat?',
      },
      {
        text: 'Three new clades, the first of the animals painted on Cosmic Shore pilots: Orangutan, Ring-Tailed Lemur and Mandrill. Primates share some traits with Humans and with each other (Grooming, Canopy Leap, Troop Call), and each has four of its own. A human-orangutan pilot can take Tool Use twice: the second time it is UP for that card. Do the three feel different from each other, and from a Human?',
      },
      {
        text: 'Dice look like dice again, in their real shapes: the plain die is a d20 (an icosahedron), an element’s die a d8 (an octahedron) and the ethereal die a d12 (a dodecahedron), with the face it shows in the middle. The same shapes tumble in the roll tray. Your abilities are now cards: each has art showing what its two faces do, the Physical side in steel on the left and the Ethereal side in its etherion’s colour on the right, over the clade it comes from, and each face button carries the same picture. Can you tell what a card does from its art? Do the dice read at a glance?',
      },
      {
        text: 'The dice got a new look. Your dice are now held like a hand of cards: each one is a small card with its symbol in the corner, a picture of what it does (Mass shows Strike and Shove, Charge Arc and Reach, Space Scramble, Time Brace, Omni pays for anything, AP shows its number), and its size (d20 plain, d8 element, d12 ethereal). Hover one and it lifts. Omni now uses the omnicrystal symbol from Cosmic Shore. When a new round begins, each pilot’s dice tumble across a tray at the foot of the board in their own shapes, land one after another on what they rolled, and are dealt into your hand. The story line under End Round is now readable (it was dark text on a dark box). Is the tray ever in the way? Can you read what each die does at a glance?',
      },
      {
        text: 'Two players now have a purse each. The 6 ◇ you start with are shared out (3 each), and so is what a mission earns. Your pilot buys, sells and fuels its gear from your own purse, and a skipped trait pays you. The haven’s full repair and event prices come from the fuller purse first. Each screen now shows only your own Buy, Sell and Train buttons; your partner’s upgrade shows "… is choosing" until they are done. Both purses show at the top, named, with yours in gold. Solo play is unchanged: one player, one purse. Did you miss being able to pool crystals? Would a "give ◇" button help?',
      },
      {
        text: 'Moving the objective forward is now celebrated. Breaking a seal, turning the winch or the valve, holding the beacon, checking a cache or lifting a crate brings up a gold card on the board ("A seal breaks", "The valve turns"…) with a bar that fills from where the objective was to where it is now, gold rings where it happened, and a rising chime (with the sound on). The objective pill in the top bar fills with gold as you go. You can also see beforehand what will count: Interact glows gold when it would count, a play that would move the objective gets a gold ◎, and hovering it says "◎ moves the objective forward". Do you now know when you are doing the right thing? Is the card ever in the way?',
      },
      {
        text: 'The mission screen now folds away what you are not using, so the board is much bigger. The pilot you are not playing folds to its vitality and dice, above the one you are; click it to switch, or "Show cards" to see its hand without switching. The log folds to its last lines (▾ opens it), the enemy intents fold to the forecast (click their heading), and a long objective folds to two lines (click it to read it all). Your choices are remembered on this computer. Clicks should also answer faster: panels redraw only when something in them changed, the ✦ hints are worked out just after the screen updates, and online, your own moves show on your screen at once instead of waiting for the host. Does anything feel slow still? Did you ever miss something that was folded away?',
      },
      {
        text: 'The same player now goes first every round (Player 1, then Player 2, then the foes). Nobody takes two turns in a row any more, so you can plan your next turn while your partner takes theirs, knowing nothing new will land on you before you act. Does the wait feel like planning time now?',
      },
      {
        text: 'Combos are now shown. A play the world would add to gets a gold ✦: a shove under heavy gravity (the foe slams down for extra damage), a hit on a foe your partner Marked (the Mark is spent for +2), or anything that breaks a foe’s guard. Hover it and the line above the board says what the world adds, worked out exactly on a copy of the mission. A catch shows as ⚠, for example a foe that holds fast against a shove, or a blow that finds an afterimage. Did a ✦ make you try something you would not have? Did one ever promise something that did not happen?',
      },
      {
        text: 'A mission now has a time of day. A day on Tumult lasts about an hour, so six rounds make one: the board brightens at dawn and noon, goes rose at dusk and blue at night, and the top bar says which. It changes nothing in play. Windy places blow gusts across the board toward the edge the wind pushes to, and fog drifts low. As each round begins the Terminal types a readout (the place, its pull and weather at the start; then the round, the hour and what is left on the clock). Plays, hits, shields, heals and falls now flash on the board, a state you gain floats up by its keyword, and each etherion has its own sound (Mass deep, Charge buzzing, Space airy, Time a bell). Turn the sound on with the speaker button. Is anything too much, or too quiet? Does night ever make the board hard to read?',
      },
      {
        text: 'The route is redrawn as the climb it is. Each leg lies over its painting and says how it is travelled (by land, by sea, by air), with what that ground’s guides would tell you. Each stop is a painted roundel of the place it is played in, with its name, its kind, its tier and its pull: ▲ heavy (uphill) or ▼ light (downhill). Hover a stop to see the place. The road you took is lit gold, the next choices glow, stops you passed by fade, and your two pilots stand where you last stopped. Does the route help you choose where to go? Does it feel like a journey?',
      },
      {
        text: 'A story box now sits under End turn. On your turn, write what it looked like in a line, as the pilot you have selected (for example: "Kess counts the waves between the gusts, and jumps on the ninth"). Press Enter, or just end your turn. It changes nothing in play. Your line shows in the log, then in your pilot’s words in the passage after the stop, and in the record of the run at the end. Online, each player writes their own. Did you write any? What made you want to?',
      },
      {
        text: 'Words of art now explain themselves. Hidden, Anchor, Weak, Shield, Push, Zone and the rest are drawn as small chips with an icon in card text, foe intents and the log; hover one for its rule in a sentence. Tokens on the board wear the same icons as badges, with a number where a state counts down. Hover a card face, a basic action or a gear ability and the board shows what it would do, exactly: rings on whoever it would reach, damage numbers, where things would be shoved or pulled, which states they would gain. While choosing a target, hover each one to compare. Was there a word you still had to look up? Did a preview ever show something that then did not happen?',
      },
      {
        text: 'Moving your partner is now yours to decide, all at once. Leg up, Call, Cue and the Beacon gear ask you where your partner goes when you play them, and they move there immediately. Your partner never gets free steps to spend later, so you can plan your whole turn and account only for what the foes do. Does that make two-player turns easier to plan? Do you ever miss letting your partner choose?',
      },
      {
        text: 'Layout fixes and ways back. Card costs no longer run off the edge of a card, a bloodline name moves to its own line when it is long, every Take button on the reward screen lines up under its card, and a face you cannot play says why on a line of its own. On the board, zone names no longer print over the names of spaces. Every draft step now has a Back button: to the title, to your first pilot, to the bloodlines, or to start a pilot over. The route, missions, rewards, havens and events all have a Title button, and Continue picks up where you left off. Is there still a screen you could not leave, or text that overflows?',
      },
      {
        text: 'New dice, and four a turn. Most of your dice are d20s: mostly AP, with each element and Omni once. Every card you awaken, and every Affinity boon, swaps a plain die for a d8 of its element (no AP, half that element), marked 8 in its corner; Omni Core gives a d12 with two of each symbol. The element symbols are now Cosmic Shore’s (a key sits under your dice). Foes are tougher and objectives a little bigger to match. Did four dice give you more to decide? Did a pilot start to feel like a mage? Was there ever too little AP?',
      },
      {
        text: 'Pilots can now help each other with three basic actions, no card needed. Spot (2 AP): mark a foe up to 3 nodes away, so the next hit on it, by either of you, deals +2. Leg up (1 AP): move an ally beside you up to 2 nodes, to where you choose. Lend (2 AP): give an ally beside you 2 AP for this round; lend it before their turn, or it is lost. Did you ever plan a turn around your partner? Which one did you use, and which never?',
      },
      {
        text: 'A new mission that is not a fight: Salvage. Crates lie on the far side; carry them to the near edge (A) before the water takes the wreck. Interact beside a crate to pick it up, one each at a time; reaching the near edge sets it down, however you get there (even the wind). Did you split up or carry together? Did you fight the scavengers, or go round them? Is it too easy, or too tight? Use the panel to start one: Salvage, any tier.',
      },
      {
        text: 'Places now have rules. Light gravity (hills, meadows, sea cliff): a shove or pull goes 1 space further. Heavy gravity (quarry, high pass): anything shoved or pulled takes 1 damage a space. Some visits bring wind (at the end of each round everyone not braced, anchored or hovering moves 1 space downwind, into hazards too) or fog (ranged strikes reach only 2 steps). The top bar shows today’s rules; hover them for the sentence. Did a place change what you did? Did the wind ever feel unfair, or fun?',
      },
      {
        text: 'Note any turn where you had nothing interesting to do, and say which mission it was: the simulator says about two turns in five are like that, mostly at tier 1.',
      },
      {
        text: 'After every won mission each pilot now gets an upgrade of their own: a trait offer of three cards that fit that pilot (or skip for +2 ◇), and after an elite a boon each. With two players, each picks for their own pilot. Did both of you have a pick you cared about? Was one offer always better than the other?',
      },
      {
        text: 'Two players now take turns. In each round one player flies their pilot and presses End turn, then the other does the same, and the foes act once both are done. The same player goes first every round, so nobody takes two turns in a row. This applies on one screen and online. Does waiting for your partner feel like planning together, or like dead time?',
      },
      {
        text: 'Online play now says why when it cannot connect. A partner who only has view access to the page (a share link) cannot write to the game, so the title tells them to ask for an email invite as Editor. Play online on the separate invite-only Tumult Online page. Did joining work first time?',
      },
      {
        text: 'Canon notes now reach the lore lead: every ✎ correction and draft answer you write on this page is sent to its private inbox (Canon on the title says how many have gone). Only you and the page’s editors can read them, never other testers. Garrett: Canon → Open the inbox to mark each note canon or rejected, edit its wording, and tick public for what may be copied into the repository. Did anything you wrote fail to arrive?',
      },
      {
        text: 'Playing now helps write the world. Look for the small ✎ beside the atlas’s rules and field notes, the pilot on the title screen, foes in the Codex and events: say it is wrong, add a detail, or say you love it. When you draft, the game asks why the pilot you picked guides (optional). Everything you write is a proposal for Garrett to approve; find it all under Canon on the title screen, and copy it to send it on. Were the questions welcome, or in the way? Is there text you wanted to correct and could not?',
      },
      {
        text: 'Every mission is now played on a page of the atlas: a fixed board for a kind of place on Tumult (a quarry, a drowned hamlet, floating meadows), with its own paths, zones and high ground, over its painting. Spaces are named A1 to E3. Click the place’s name in the mission’s top bar, or Atlas on the title, to read its page: the board, the rules of this place and field notes. Do the places feel different to fight across? Is the facing page worth reading? Which page would you redraw?',
      },
      {
        text: 'Lanes are now zones: soft coloured regions on the board, in new muted colours so they never look like an etherion or a domain. A ranged strike hits anything that shares a zone with you. Today every zone is still one column, so play is exactly as before; this is the ground for boards of any shape (the atlas). Can you tell at a glance which foes can shoot you? Does a zone read as one region?',
      },
      {
        text: 'Every run is now a different expedition: who sent you (Jade, Ruby or Gold, and why), what waits at the end (the finale plays by the Heart’s rules under a new name), and the order of land, sea and air, each leg with its own painting. Events lean toward the ground you are crossing. Start three runs: do they feel like three different journeys? Which expedition would you most like to play again?',
      },
      {
        text: 'The words now tell one story: each run is an expedition set down from an Ark, crossing Tumult by land, sea and air to the Heart. The skiff, the HyperSea tide and the Consolidation are gone, and the difficulties are now Steady wind and Gale. Does any screen still feel like it belongs to the old frame? Does the title make you want to set out?',
      },
      {
        text: 'After every stop your pilots now say something about what just happened, in the voice of their clade, and the summary keeps the whole log. Do the two pilots sound like different people? Which line felt most like your pilot, and which felt wrong for them? Do you read them, or skip?',
      },
      {
        text: 'Drawn icons replace the emoji everywhere: foes on the board, the route, dice, gear, boons, events. Can you tell every foe apart at a glance on the board? Which icon did you have to hover to understand?',
      },
      {
        text: 'The route is now a chart with the road you took lit up, and events and havens show a painting. Does the run feel more like a journey somewhere? Is anything harder to read than the old grid?',
      },
      {
        text: 'Play online: one of you types a name and presses “Host a game”, the other types the four-letter code and presses Join, from their own screen. Each drafts and flies one pilot; the host picks the route and you take turns. Does it keep up? Anything that went out of step between the two screens, or that you had to wait for, put in a report.',
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
    const kit = r.quick ? `${r.quick.kit} kit` : 'on an expedition';
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
      : ` <span class="pt-who">No pre-made hero carries it: draft ${esc(lines.join(' or '))} on a New Expedition.</span>`;
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
      <p class="dim small">The same seed, squad and kit always give the same board and the same opening dice. After the mission the expedition carries on from that node.</p>
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
