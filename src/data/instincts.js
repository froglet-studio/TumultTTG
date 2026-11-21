/* ============================================================================
   TUMULT — DATA: CLADE INSTINCTS (2.121)
   ----------------------------------------------------------------------------
   An instinct is one always-on rule a clade brings to every pilot of it, one
   line on the pilot sheet (from the borrowed-mechanics shortlist: what makes a
   fighter play like itself). It is not a card. Each bends one keyword a little,
   through the same passive hooks gear uses (T.BOON_HOOKS), so the engine acts
   on the hook and its value, never on the clade. Human is in every pilot and
   has none. The first set covers the pre-made pilots' clades; the rest follow.
   No instinct may be what a mission needs: each is small, and each is a twist
   on something the whole squad can do another way.
   ========================================================================== */
(function (T) {
  T.INSTINCTS = {};
  const I = (clade, name, hook, val, txt) => (T.INSTINCTS[clade] = { clade, name, hook, val, txt });

  I('octopus', 'Suckers', 'noPull', true, 'Nothing can pull you: your suckers hold.');
  I('raven', 'Watcher', 'spot', 2, 'As your turn begins, the nearest foe within 2 of you is Marked.');
  I('otter', 'Pocket Stone', 'missionStart', { bank: 'AP' }, 'You start each mission with 1 AP already banked: the stone you keep.');
  I('eel', 'Live Wire', 'fieldDur', 1, 'Every Field you lay that has rounds lasts 1 round longer.');
  I('hedgehog', 'Spines', 'thornsBonus', 1, 'Every Thorns you gain is 1 more.');
  I('tortoise', 'Shell', 'shieldBonus', 1, 'Every Shield you gain is 1 more.');
  I('mouse', 'Scurry', 'blinkReach', 1, 'Your Blinks reach 1 further.');
  I('owl', 'Night Sight', 'keen', 1, 'Your reveals reach 1 further, and Hidden foes beside you are revealed as your turn begins.');
  I('axolotl', 'Regrowth', 'autoRevive', 3, 'Once a mission, when you would go down, you rise with 3 hp instead.');
  I('koi', 'Lucky Scales', 'missionStart', { bank: 'O' }, 'You start each mission with 1 Omni already banked.');
  I('flamingo', 'Caustic Feet', 'hazardSoft', 1, 'Hazards deal 1 less to you.');
  I('mantis_shrimp', 'Smasher', 'weapon', { reach: 'melee', n: 1 }, 'Your melee strikes deal 1 more.');

  /** The instincts a pilot is born with: one for each of its clades that has one. */
  T.instinctsOf = (h) => [...new Set(h.species || [])].map((sp) => T.INSTINCTS[sp]).filter(Boolean);
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
