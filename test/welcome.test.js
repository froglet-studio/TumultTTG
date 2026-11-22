'use strict';
// Welcoming new players (docs/reference/WELCOME.md, src/ui/welcome.js): Play now, the guided first mission,
// keep your squad after the first win, and invites. Played through the real UI in jsdom.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');
const load = () => import(pathToFileURL(path.join(root, 'tools', 'build.mjs')).href);

let hasJsdom = true;
try {
  require.resolve('jsdom');
} catch {
  hasJsdom = false;
}
const skip = hasJsdom ? false : 'jsdom is not installed (run `npm install`)';

/** A stand-in for T.Account and its sign-in box (src/ui/account.js, the sign-in thread): a guest until asked. */
function fakeAccount() {
  const fake = { asked: [], user: { guest: true }, listeners: [] };
  const methods = {
    available: () => true,
    user: () => fake.user,
    onChange: (fn) => fake.listeners.push(fn),
  };
  const ask = (why) => fake.asked.push(why);
  fake.install = (w) => {
    w.T = { Account: Object.assign({}, methods), UI: { askSignIn: ask } };
  };
  // the real sign-in module is in the build and sets its own methods as it loads: put these back over them
  fake.after = (w) => {
    Object.assign(w.T.Account, methods);
    w.T.UI.askSignIn = ask;
    if (w.T.UI.render) w.T.UI.render();
  };
  fake.signIn = () => {
    fake.user = { guest: false, name: 'Tester' };
    fake.listeners.forEach((fn) => fn(fake.user));
  };
  return fake;
}

async function open(html, { url = 'https://tumult.froglet.games/', account = null } = {}) {
  const { JSDOM } = require('jsdom');
  const { until } = require('../tools/ui-drive');
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url,
    beforeParse(w) {
      if (account) account.install(w);
      w.TUMULT_NO_TELEMETRY = true;
      w.console.error = (...a) => errors.push(a.map(String).join(' '));
      w.addEventListener('error', (e) => errors.push((e.error && e.error.stack) || e.message));
    },
  });
  const w = dom.window;
  await until(() => w.T && w.T.UI && w.T.UI.welcome && w.T.UI.welcome.started, 'the welcome to start');
  if (account && account.after) account.after(w);
  await new Promise((r) => setTimeout(r, 5));
  const d = w.document;
  const click = (sel) => {
    const el = typeof sel === 'string' ? d.querySelector(sel) : sel;
    if (!el || el.disabled) return false;
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  };
  return { w, d, T: w.T, U: w.T.UI, click, errors, html: () => d.getElementById('app').innerHTML };
}

test(
  'a first visit plays now, is guided through its first mission, and is asked to keep its squad once',
  { skip, timeout: 60_000 },
  async () => {
    const { build } = await load();
    const account = fakeAccount();
    const p = await open(build().html, { account });
    const { T, U, click } = p;
    try {
      // the title of a first visit: Play now first, the draft a click away, sign-in offered but not pushed
      assert.ok(p.d.querySelector('[data-act="playNow"]'), 'Play now on a first visit');
      assert.ok(p.d.querySelector('[data-act="newRun"]'), 'and a setup to build your own squad');

      assert.ok(click('[data-act="playNow"]'));
      assert.equal(U.screen, 'map', 'Play now goes straight to the route');
      assert.deepEqual(
        U.run.heroes.map((h) => h.name),
        U.welcome.FIRST_SQUAD.slice(0, 1).map((id) => T.PREBUILTS.find((pb) => pb.id === id).name),
        'a lone player flies one pilot',
      );
      for (const h of U.run.heroes)
        assert.ok(h.cards.filter((c) => T.heroE(h, c) >= 1).length >= T.RULES.START_AWAKE, 'awakened as the draft');
      assert.equal(T.loadMeta().runs, 0, 'a run counts when it ends, as before');

      // to the first stop: the guide opens on the mission screen
      click('[data-act="tutClose"]');
      click('[data-act="readPassage"]');
      assert.ok(click('.mnode.avail'), 'a stop to go to');
      assert.equal(U.screen, 'mission');
      assert.equal(U.tut, 'mission');
      const step = () => p.d.querySelector('#guideCoach') && p.d.querySelector('#guideCoach').getAttribute('data-step');
      assert.equal(step(), 'dice');
      const keys = U.welcome.STEPS.map((s) => s.key);
      for (let i = 1; i < keys.length; i++) {
        assert.ok(click('[data-act="guideNext"]'));
        assert.equal(step(), keys[i]);
        // each step's part of the screen is there to light
        assert.ok(
          U.welcome.STEPS[i].at.some((sel) => p.d.querySelector(sel)),
          `step ${keys[i]} finds its part of the screen`,
        );
      }
      assert.ok(click('[data-act="guideBack"]'));
      assert.equal(step(), keys[keys.length - 2]);
      click('[data-act="guideNext"]');
      assert.ok(click('[data-act="guideDone"]'));
      assert.equal(U.tut, null);
      assert.equal(p.d.querySelector('#guideCoach'), null, 'the guide is gone');

      // the guide does not open again on this device
      U.showTutorial('mission');
      assert.equal(U.tut, null);

      // keep your squad: under the first won mission's report, once
      U.MISSION_OVER_DELAY = 0;
      const m = U.run.mission;
      for (let r = 0; r < 40 && !m.over; r++) {
        T.autoHeroPhase(m);
        U.updateMission();
        if (!m.over) {
          click('[data-act="endRound"]');
          if (U.ms.endConfirm) click('[data-act="endRound"]');
        }
      }
      assert.ok(m.over, 'the mission ends');
      await new Promise((r) => setTimeout(r, 10));
      const modal = p.d.querySelector('.modal');
      assert.ok(modal && modal.querySelector('[data-act="missionDone"]'));
      assert.equal(!!modal.querySelector('#keepSquad'), !!m.won, 'offered after a win, not after a loss');
      // asked once: the same report again (or a second win) asks nothing
      const once = U.missionOverExtra({ won: true });
      if (m.won) assert.equal(once, '', 'asked once');
      else {
        assert.match(once, /keepSquad/);
        assert.equal(U.missionOverExtra({ won: true }), '');
        // the seed is the clock's, so the mission may be lost: show the card the next win would bring
        modal.insertAdjacentHTML('beforeend', once);
      }
      assert.equal(U.missionOverExtra({ won: false }), '');

      // signing in goes through the account box (src/ui/account.js)
      assert.ok(p.click('[data-act="signInKeep"]'));
      assert.equal(account.asked.length, 1);
      account.signIn();
      assert.equal(p.d.querySelector('#keepSquad'), null, 'the card goes once signed in');
      assert.equal(U.missionOverExtra({ won: true }), '', 'a signed-in player is never asked');
      assert.deepEqual(p.errors, []);
    } finally {
      p.w.close();
    }
  },
);

test('with no accounts on the page, nobody is asked to sign in', { skip, timeout: 30_000 }, async () => {
  const { build } = await load();
  const p = await open(build().html);
  try {
    assert.equal(p.U.welcome.canAsk(), false);
    assert.equal(p.U.missionOverExtra({ won: true }), '');
    // a returning player sees New Expedition, not Play now
    const meta = p.T.loadMeta();
    meta.runs = 1;
    p.T.saveMeta(meta);
    p.U.render();
    assert.equal(p.d.querySelector('[data-act="playNow"]'), null);
    assert.ok(p.d.querySelector('[data-act="newRun"].primary'));
    assert.deepEqual(p.errors, []);
  } finally {
    p.w.close();
  }
});

test(
  'an invite link opens the title on that game, and is taken off the address',
  { skip, timeout: 30_000 },
  async () => {
    const { build } = await load();
    // the offline file cannot reach online play: the invite says so, and Play now still works
    const p = await open(build().html, { url: 'https://tumult.froglet.games/?join=kxrt&x=1#top' });
    try {
      assert.equal(p.U.welcome.invite, 'KXRT');
      assert.equal(p.w.location.search, '?x=1');
      assert.equal(p.w.location.hash, '#top');
      assert.match(p.html(), /invited to expedition <span class="mono">KXRT/);
      assert.match(p.html(), /isn't open on this page yet/);
      assert.equal(p.d.querySelector('[data-act="playNow"]'), null, 'the invite comes first');
      assert.ok(p.click('[data-act="inviteDrop"][data-arg="play"]'));
      assert.equal(p.U.screen, 'map');
      assert.equal(p.U.welcome.invite, null);
      assert.deepEqual(p.errors, []);
    } finally {
      p.w.close();
    }
    for (const [s, want] of [
      ['?join=AB12', 'AB12'],
      ['#join=zz99', 'ZZ99'],
      ['?join=a', null],
      ['?join=<script>', null],
      ['', null],
    ]) {
      const W = { readInvite: null };
      const q = await open(build().html);
      try {
        W.readInvite = q.U.welcome.readInvite;
        const loc = s.startsWith('#') ? { search: '', hash: s } : { search: s, hash: '' };
        assert.equal(W.readInvite(loc), want, s);
      } finally {
        q.w.close();
      }
    }
  },
);

test(
  'the lobby hands out a link; hosting asks a guest to sign in where there are accounts',
  { skip, timeout: 30_000 },
  async () => {
    const { build } = await load();
    const account = fakeAccount();
    const p = await open(build({ playtest: true }).html, { account });
    const { U } = p;
    try {
      Object.assign(U.net, { role: 'host', code: 'ABCD', names: ['Ana', ''], status: 'Waiting for player 2…' });
      U.screen = 'lobby';
      U.render();
      assert.equal(p.d.getElementById('inviteField').value, 'https://tumult.froglet.games/?join=ABCD');
      assert.match(p.html(), /Open seat/);
      assert.ok(p.d.querySelector('[data-act="netStart"][disabled]'));
      U.net.names[1] = 'Bo';
      U.render();
      assert.ok(p.d.querySelector('[data-act="netStart"]:not([disabled])'));
      Object.assign(U.net, { role: null, code: null, names: ['', ''] });

      assert.deepEqual(p.errors, []);
    } finally {
      p.w.close();
    }
  },
);
